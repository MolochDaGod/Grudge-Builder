/**
 * MultiplayerSync — Socket.IO client for island multiplayer.
 *
 * Connects to the grudge-openworld-server, sends local player position at 15Hz,
 * receives remote player positions and interpolates them, and relays PvE/PvP/harvest
 * events between the server and the 3D engine.
 */
import { io, type Socket } from 'socket.io-client';
import * as THREE from 'three';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RemotePlayer {
  id: string;
  name: string;
  heroId?: string;
  heroClass?: string;
  heroRace?: string;
  // Authoritative state from server
  x: number;
  y: number;
  z: number;
  facing: number;
  state: string;
  hp: number;
  maxHp: number;
  // Interpolation targets
  targetX: number;
  targetY: number;
  targetZ: number;
  targetFacing: number;
  // 3D representation
  mesh: THREE.Group;
  nameplate: THREE.Sprite;
  healthBar: THREE.Group;
}

export interface PveEnemy {
  id: string;
  type: string;
  x: number;
  y: number;
  z: number;
  hp: number;
  maxHp: number;
  level: number;
  mesh: THREE.Group;
}

export interface MultiplayerConfig {
  serverUrl: string;        // e.g. "wss://api.grudge-studio.com"
  islandId: string;
  /** Lobby map bake id (e.g. pirate-islands) — seeds server harvest nodes */
  mapId?: string;
  playerName: string;
  heroId?: string;
  heroClass?: string;
  heroRace?: string;
  accountId?: string;
}

export type MultiplayerEventMap = {
  'connected': (playerId: string) => void;
  'disconnected': () => void;
  'player:joined': (player: { id: string; name: string }) => void;
  'player:left': (player: { id: string; name: string }) => void;
  'harvest:complete': (data: { nodeId: string; playerId: string; respawnAt: number }) => void;
  'pve:spawn': (enemy: PveEnemy) => void;
  'pve:damage': (data: { enemyId: string; damage: number; hp: number; attackerId: string }) => void;
  'pve:kill': (data: { enemyId: string; killerId: string; xp: number; gold: number; type: string }) => void;
  'pvp:damage': (data: { attackerId: string; targetId: string; damage: number; targetHp: number }) => void;
  'pvp:kill': (data: { killerId: string; killerName: string; victimId: string; victimName: string }) => void;
  'chat': (data: { id: string; name: string; text: string }) => void;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const PROD_WORLD_SERVER = 'wss://world.grudge-studio.com';
const DEV_WORLD_SERVER = 'http://localhost:4321';

/** Resolved world server URL — production never falls back to localhost */
export const WORLD_SERVER_URL: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_PVP_SERVER_URL) ||
  (typeof window !== 'undefined' && (window as any).__GRUDGE_WORLD_URL__) ||
  ((typeof import.meta !== 'undefined' && (import.meta as any).env?.PROD)
    ? PROD_WORLD_SERVER
    : DEV_WORLD_SERVER);

/** @deprecated Use WORLD_SERVER_URL instead */
export const PVP_SERVER_URL = WORLD_SERVER_URL;

const SEND_RATE_MS = 1000 / 15; // 15 Hz
const LERP_SPEED = 8;           // interpolation speed

// ─── Module ──────────────────────────────────────────────────────────────────

export class MultiplayerSync {
  private socket: Socket | null = null;
  private config: MultiplayerConfig;
  private scene: THREE.Scene;

  // State
  public localPlayerId: string | null = null;
  public remotePlayers = new Map<string, RemotePlayer>();
  public enemies = new Map<string, PveEnemy>();
  public connected = false;

  // Send throttle
  private lastSendTime = 0;
  private lastSentPos = { x: 0, y: 0, z: 0, facing: 0, state: 'idle' };

  // Event listeners
  private listeners = new Map<string, Set<Function>>();

  constructor(config: MultiplayerConfig, scene: THREE.Scene) {
    this.config = config;
    this.scene = scene;
  }

  // ─── Connection ──────────────────────────────────────────────────────────

  connect(): void {
    if (this.socket) return;

    this.socket = io(this.config.serverUrl, {
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log('[MultiplayerSync] Connected to server');
      this.joinIsland();
    });

    this.socket.on('disconnect', () => {
      console.log('[MultiplayerSync] Disconnected');
      this.connected = false;
      this.emit('disconnected');
    });

    this.setupListeners();
  }

  private joinIsland(): void {
    if (!this.socket) return;

    this.socket.emit('island:join', {
      islandId: this.config.islandId,
      mapId: this.config.mapId,
      playerName: this.config.playerName,
      heroId: this.config.heroId,
      heroClass: this.config.heroClass,
      heroRace: this.config.heroRace,
      accountId: this.config.accountId,
    }, (response: any) => {
      if (response?.error) {
        console.error('[MultiplayerSync] Join failed:', response.error);
        return;
      }

      this.localPlayerId = response.playerId;
      this.connected = true;
      console.log(`[MultiplayerSync] Joined island ${this.config.islandId} as ${this.localPlayerId}`);

      // Add existing players
      if (response.players) {
        for (const p of response.players) {
          if (p.id === this.localPlayerId) continue;
          this.addRemotePlayer(p);
        }
      }

      // Add existing enemies
      if (response.enemies) {
        for (const e of response.enemies) {
          this.addEnemy(e);
        }
      }

      this.emit('connected', this.localPlayerId);
    });
  }

  disconnect(): void {
    if (!this.socket) return;
    this.socket.emit('island:leave');
    this.socket.disconnect();
    this.socket = null;
    this.connected = false;

    // Clean up 3D objects
    for (const [, rp] of this.remotePlayers) {
      this.scene.remove(rp.mesh);
    }
    this.remotePlayers.clear();

    for (const [, e] of this.enemies) {
      this.scene.remove(e.mesh);
    }
    this.enemies.clear();
  }

  // ─── Server event listeners ──────────────────────────────────────────────

  private setupListeners(): void {
    if (!this.socket) return;

    // Remote player joined
    this.socket.on('island:player_joined', (data: any) => {
      if (data.id === this.localPlayerId) return;
      this.addRemotePlayer(data);
      this.emit('player:joined', { id: data.id, name: data.name });
    });

    // Remote player left
    this.socket.on('island:player_left', (data: any) => {
      this.removeRemotePlayer(data.id);
      this.emit('player:left', { id: data.id, name: data.name });
    });

    // Remote player moved
    this.socket.on('island:player_moved', (data: any) => {
      const rp = this.remotePlayers.get(data.id);
      if (!rp) return;
      rp.targetX = data.x;
      rp.targetY = data.y;
      rp.targetZ = data.z;
      rp.targetFacing = data.facing;
      rp.state = data.state;
      rp.hp = data.hp;
    });

    // Harvest
    this.socket.on('harvest:complete', (data: any) => {
      this.emit('harvest:complete', data);
    });

    // PvE
    this.socket.on('pve:spawn', (data: any) => {
      this.addEnemy(data);
      this.emit('pve:spawn', data);
    });

    this.socket.on('pve:damage', (data: any) => {
      const enemy = this.enemies.get(data.enemyId);
      if (enemy) {
        enemy.hp = data.hp;
        this.updateEnemyHealthBar(enemy);
      }
      this.emit('pve:damage', data);
    });

    this.socket.on('pve:kill', (data: any) => {
      const enemy = this.enemies.get(data.enemyId);
      if (enemy) {
        this.scene.remove(enemy.mesh);
        this.enemies.delete(data.enemyId);
      }
      this.emit('pve:kill', data);
    });

    // PvP
    this.socket.on('pvp:damage', (data: any) => {
      const rp = this.remotePlayers.get(data.targetId);
      if (rp) {
        rp.hp = data.targetHp;
        this.updatePlayerHealthBar(rp);
      }
      this.emit('pvp:damage', data);
    });

    this.socket.on('pvp:kill', (data: any) => {
      this.emit('pvp:kill', data);
    });

    // Chat
    this.socket.on('island:chat', (data: any) => {
      this.emit('chat', data);
    });
  }

  // ─── Outbound actions ────────────────────────────────────────────────────

  /** Send local player position (throttled to 15Hz) */
  sendPosition(x: number, y: number, z: number, facing: number, state: string): void {
    if (!this.socket || !this.connected) return;

    const now = performance.now();
    if (now - this.lastSendTime < SEND_RATE_MS) return;

    // Only send if something changed
    const changed =
      Math.abs(x - this.lastSentPos.x) > 0.01 ||
      Math.abs(y - this.lastSentPos.y) > 0.01 ||
      Math.abs(z - this.lastSentPos.z) > 0.01 ||
      Math.abs(facing - this.lastSentPos.facing) > 0.01 ||
      state !== this.lastSentPos.state;

    if (!changed) return;

    this.socket.volatile.emit('island:update', { x, y, z, facing, state });
    this.lastSendTime = now;
    this.lastSentPos = { x, y, z, facing, state };
  }

  /** Request to harvest a node */
  harvestNode(nodeId: string, professionId: string): Promise<{ success?: boolean; error?: string; respawnAt?: number }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.connected) return resolve({ error: 'Not connected' });
      this.socket.emit('harvest:start', { nodeId, professionId }, (response: any) => {
        resolve(response || { error: 'No response' });
      });
    });
  }

  /** Attack a PvE enemy */
  attackEnemy(enemyId: string, damage: number): Promise<{ killed?: boolean; hp?: number; xp?: number; gold?: number; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.connected) return resolve({ error: 'Not connected' });
      this.socket.emit('pve:attack', { enemyId, damage }, (response: any) => {
        resolve(response || { error: 'No response' });
      });
    });
  }

  /** Attack another player (PvP) */
  attackPlayer(targetPlayerId: string, damage: number): void {
    if (!this.socket || !this.connected) return;
    this.socket.emit('pvp:attack', { targetPlayerId, damage });
  }

  /** Send island chat message */
  sendChat(text: string): void {
    if (!this.socket || !this.connected) return;
    this.socket.emit('island:chat', { text });
  }

  // ─── Frame update (called by engine each frame) ──────────────────────────

  update(dt: number): void {
    const lerpFactor = 1 - Math.exp(-LERP_SPEED * dt);

    // Interpolate remote player positions
    for (const [, rp] of this.remotePlayers) {
      rp.x += (rp.targetX - rp.x) * lerpFactor;
      rp.y += (rp.targetY - rp.y) * lerpFactor;
      rp.z += (rp.targetZ - rp.z) * lerpFactor;

      // Wrap-safe facing lerp
      let facingDiff = rp.targetFacing - rp.facing;
      if (facingDiff > Math.PI) facingDiff -= Math.PI * 2;
      if (facingDiff < -Math.PI) facingDiff += Math.PI * 2;
      rp.facing += facingDiff * lerpFactor;

      rp.mesh.position.set(rp.x, rp.y, rp.z);
      rp.mesh.rotation.y = rp.facing;
    }
  }

  // ─── 3D object management ────────────────────────────────────────────────

  private addRemotePlayer(data: any): void {
    if (this.remotePlayers.has(data.id)) return;

    const group = new THREE.Group();

    // Empty root until race mesh streams in — no capsule placeholders
    group.name = `mp_remote_${data.id}`;

    group.position.set(data.x ?? 0, data.y ?? 0, data.z ?? 0);
    this.scene.add(group);

    // Nameplate sprite
    const nameplate = this.createNameplate(data.name || 'Player');
    nameplate.position.set(0, 4.5, 0);
    group.add(nameplate);

    // Health bar
    const healthBar = this.createHealthBar();
    healthBar.position.set(0, 4, 0);
    group.add(healthBar);

    const rp: RemotePlayer = {
      id: data.id,
      name: data.name || 'Player',
      heroId: data.heroId,
      heroClass: data.heroClass,
      heroRace: data.heroRace,
      x: data.x ?? 0,
      y: data.y ?? 0,
      z: data.z ?? 0,
      facing: data.facing ?? 0,
      state: data.state ?? 'idle',
      hp: data.hp ?? 200,
      maxHp: data.maxHp ?? 200,
      targetX: data.x ?? 0,
      targetY: data.y ?? 0,
      targetZ: data.z ?? 0,
      targetFacing: data.facing ?? 0,
      mesh: group,
      nameplate,
      healthBar,
    };

    this.remotePlayers.set(data.id, rp);
  }

  private removeRemotePlayer(playerId: string): void {
    const rp = this.remotePlayers.get(playerId);
    if (!rp) return;
    this.scene.remove(rp.mesh);
    this.remotePlayers.delete(playerId);
  }

  private addEnemy(data: any): void {
    if (this.enemies.has(data.id)) return;

    const group = new THREE.Group();

    // Marker only until creature GLB loads (no capsule heroes)
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xcc2222 }),
    );
    marker.position.y = 1.0;
    marker.castShadow = true;
    marker.name = '__placeholder';
    group.add(marker);

    // Health bar
    const hb = this.createHealthBar(0xff3333);
    hb.position.set(0, 3, 0);
    group.add(hb);

    group.position.set(data.x ?? 0, data.y ?? 0, data.z ?? 0);
    this.scene.add(group);

    const enemy: PveEnemy = {
      id: data.id,
      type: data.type ?? 'goblin',
      x: data.x ?? 0,
      y: data.y ?? 0,
      z: data.z ?? 0,
      hp: data.hp ?? 100,
      maxHp: data.maxHp ?? 100,
      level: data.level ?? 1,
      mesh: group,
    };

    this.enemies.set(data.id, enemy);
  }

  // ─── UI helpers (nameplates, health bars) ─────────────────────────────────

  private createNameplate(name: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.fill();

    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.slice(0, 16), 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(4, 1, 1);
    return sprite;
  }

  private createHealthBar(color = 0x44ff44): THREE.Group {
    const group = new THREE.Group();

    // Background
    const bgGeo = new THREE.PlaneGeometry(3, 0.3);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    bg.name = 'hb_bg';
    group.add(bg);

    // Fill
    const fillGeo = new THREE.PlaneGeometry(3, 0.3);
    const fillMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    const fill = new THREE.Mesh(fillGeo, fillMat);
    fill.name = 'hb_fill';
    fill.position.z = 0.01; // slightly in front
    group.add(fill);

    return group;
  }

  private updatePlayerHealthBar(rp: RemotePlayer): void {
    const fill = rp.healthBar.getObjectByName('hb_fill') as THREE.Mesh | undefined;
    if (!fill) return;
    const pct = Math.max(0, rp.hp / rp.maxHp);
    fill.scale.x = pct;
    fill.position.x = -(1 - pct) * 1.5; // keep left-aligned
  }

  private updateEnemyHealthBar(enemy: PveEnemy): void {
    const fill = enemy.mesh.getObjectByName('hb_fill') as THREE.Mesh | undefined;
    if (!fill) return;
    const pct = Math.max(0, enemy.hp / enemy.maxHp);
    fill.scale.x = pct;
    fill.position.x = -(1 - pct) * 1.5;
  }

  // ─── Event emitter ───────────────────────────────────────────────────────

  on<K extends keyof MultiplayerEventMap>(event: K, fn: MultiplayerEventMap[K]): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
  }

  off<K extends keyof MultiplayerEventMap>(event: K, fn: MultiplayerEventMap[K]): void {
    this.listeners.get(event)?.delete(fn);
  }

  private emit(event: string, ...args: any[]): void {
    const fns = this.listeners.get(event);
    if (!fns) return;
    for (const fn of fns) fn(...args);
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  destroy(): void {
    this.disconnect();
    this.listeners.clear();
  }
}
