/**
 * TownNPCController — client-side NPC population and movement for towns.
 *
 * Loads GLTF models for each NPC from MODEL_MANIFEST, then drives:
 *   - Patrol guards: walk along waypoint paths, pause at each point
 *   - Stationary NPCs: idle at spawn, face players when nearby
 *   - Civilians: wander randomly within navmesh bounds
 *
 * Uses A* from TownNavGrid for wander pathfinding.
 * Syncs with TownRoom NPC state (position, lockedBy) via Colyseus.
 */
import * as THREE from 'three';
import { loadCharacterModel, type LoadedModel } from '@/lib/modelLoader';
import {
  MODEL_MANIFEST,
  getAnimationSet,
  resolveModelUrl,
  type WeaponType,
} from '@/lib/modelManifest';
import { AnimationManager, type AnimState } from '../player/AnimationManager';
import type {
  FactionTown,
  TownNPC,
  TownSpawnPoint,
  TownNavMeshConfig,
  TownNPCRole,
} from '@shared/definitions/factionTowns';

// ── Types ────────────────────────────────────────────────────────

type NPCBehavior = 'stationary' | 'patrol' | 'wander';

interface NPCInstance {
  id: string;
  def: TownNPC;
  spawn: TownSpawnPoint;
  group: THREE.Group;
  model: LoadedModel | null;
  animations: AnimationManager | null;
  nameplate: THREE.Sprite;
  behavior: NPCBehavior;
  // Movement state
  currentPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  speed: number;
  moving: boolean;
  // Pathfinding
  currentPath: THREE.Vector3[];
  pathIndex: number;
  // Patrol
  patrolPoints: THREE.Vector3[];
  patrolIndex: number;
  patrolWaitTimer: number;
  patrolDirection: 1 | -1; // 1=forward, -1=backward (ping-pong)
  // Wander
  wanderTimer: number;
  wanderCooldown: number;
  // Face player
  faceTarget: THREE.Vector3 | null;
  // Loading state
  loading: boolean;
}

// ── Constants ────────────────────────────────────────────────────

const NPC_MOVE_SPEED = 3.0;         // units/sec for patrol walking
const NPC_WANDER_SPEED = 1.5;       // units/sec for civilian wander
const PATROL_WAIT_MIN = 2.0;        // seconds to pause at each patrol point
const PATROL_WAIT_MAX = 5.0;
const WANDER_INTERVAL_MIN = 8.0;    // seconds between wander moves
const WANDER_INTERVAL_MAX = 15.0;
const WANDER_RADIUS = 12.0;         // max wander distance from spawn
const FACE_PLAYER_DISTANCE = 8.0;   // NPCs turn to face nearby players
const LERP_SPEED = 5.0;

// Role → behavior mapping
const ROLE_BEHAVIOR: Record<TownNPCRole, NPCBehavior> = {
  hero: 'stationary',
  guard: 'patrol',       // overridden to 'stationary' if no patrolPath
  merchant: 'stationary',
  questGiver: 'stationary',
  factionVendor: 'stationary',
  civilian: 'wander',
  shrineKeeper: 'stationary',
};

// Role → nameplate color
const ROLE_COLORS: Record<TownNPCRole, string> = {
  hero: '#f6c945',
  guard: '#ff6b57',
  merchant: '#6bdc8b',
  questGiver: '#f6c945',
  factionVendor: '#c792ff',
  civilian: '#888888',
  shrineKeeper: '#6aa9ff',
};

// ── TownNavGrid (simplified A* for flat town terrain) ────────────

class TownNavGrid {
  private grid: boolean[][];
  private cellSize: number;
  private minX: number;
  private minZ: number;
  private cols: number;
  private rows: number;

  constructor(config: TownNavMeshConfig) {
    this.cellSize = config.cellSize;
    this.minX = config.bounds[0];
    this.minZ = config.bounds[1];
    const maxX = config.bounds[2];
    const maxZ = config.bounds[3];
    this.cols = Math.ceil((maxX - this.minX) / this.cellSize);
    this.rows = Math.ceil((maxZ - this.minZ) / this.cellSize);

    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        const wx = this.minX + c * this.cellSize + this.cellSize / 2;
        const wz = this.minZ + r * this.cellSize + this.cellSize / 2;
        this.grid[r][c] = !this.inObstacle(wx, wz, config.obstacles);
      }
    }
  }

  private inObstacle(x: number, z: number, obstacles: [number, number, number, number][]): boolean {
    for (const [cx, cz, hw, hd] of obstacles) {
      if (x >= cx - hw && x <= cx + hw && z >= cz - hd && z <= cz + hd) return true;
    }
    return false;
  }

  private worldToGrid(wx: number, wz: number): [number, number] {
    return [
      Math.floor((wx - this.minX) / this.cellSize),
      Math.floor((wz - this.minZ) / this.cellSize),
    ];
  }

  private gridToWorld(c: number, r: number): [number, number] {
    return [
      this.minX + c * this.cellSize + this.cellSize / 2,
      this.minZ + r * this.cellSize + this.cellSize / 2,
    ];
  }

  isWalkable(wx: number, wz: number): boolean {
    const [c, r] = this.worldToGrid(wx, wz);
    return this.grid[r]?.[c] ?? false;
  }

  /** Get a random walkable position within radius of a center point */
  randomWalkableNear(cx: number, cz: number, radius: number): THREE.Vector3 | null {
    for (let attempt = 0; attempt < 20; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      const wx = cx + Math.cos(angle) * dist;
      const wz = cz + Math.sin(angle) * dist;
      if (this.isWalkable(wx, wz)) {
        return new THREE.Vector3(wx, 0, wz);
      }
    }
    return null;
  }

  /** A* pathfinding between two world positions. Returns waypoints or null. */
  findPath(fromX: number, fromZ: number, toX: number, toZ: number): THREE.Vector3[] | null {
    const [sc, sr] = this.worldToGrid(fromX, fromZ);
    const [ec, er] = this.worldToGrid(toX, toZ);

    if (!this.grid[sr]?.[sc] || !this.grid[er]?.[ec]) return null;
    if (sc === ec && sr === er) return [new THREE.Vector3(toX, 0, toZ)];

    // A* with binary heap priority queue
    const key = (c: number, r: number) => r * this.cols + c;
    const heuristic = (c: number, r: number) => Math.abs(c - ec) + Math.abs(r - er);

    const gScore = new Map<number, number>();
    const fScore = new Map<number, number>();
    const cameFrom = new Map<number, number>();
    const openSet = new Set<number>();
    const closedSet = new Set<number>();

    const startKey = key(sc, sr);
    const endKey = key(ec, er);
    gScore.set(startKey, 0);
    fScore.set(startKey, heuristic(sc, sr));
    openSet.add(startKey);

    while (openSet.size > 0) {
      // Find lowest fScore in open set
      let currentKey = -1;
      let bestF = Infinity;
      for (const k of openSet) {
        const f = fScore.get(k) ?? Infinity;
        if (f < bestF) { bestF = f; currentKey = k; }
      }
      if (currentKey === -1) return null;

      if (currentKey === endKey) {
        // Reconstruct path
        const rawPath: [number, number][] = [];
        let ck = currentKey;
        while (ck !== startKey) {
          const c = ck % this.cols;
          const r = Math.floor(ck / this.cols);
          rawPath.unshift([c, r]);
          ck = cameFrom.get(ck)!;
        }
        // Convert grid cells to world positions and smooth
        return this.smoothPath(rawPath, toX, toZ);
      }

      openSet.delete(currentKey);
      closedSet.add(currentKey);

      const cc = currentKey % this.cols;
      const cr = Math.floor(currentKey / this.cols);
      const currentG = gScore.get(currentKey) ?? Infinity;

      // 8-directional neighbors
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dc === 0 && dr === 0) continue;
          const nc = cc + dc;
          const nr = cr + dr;
          if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue;
          if (!this.grid[nr][nc]) continue;

          const nk = key(nc, nr);
          if (closedSet.has(nk)) continue;

          // Diagonal check: prevent cutting corners
          if (dc !== 0 && dr !== 0) {
            if (!this.grid[cr][cc + dc] || !this.grid[cr + dr][cc]) continue;
          }

          const moveCost = (dc !== 0 && dr !== 0) ? 1.414 : 1.0;
          const tentativeG = currentG + moveCost;

          if (tentativeG < (gScore.get(nk) ?? Infinity)) {
            cameFrom.set(nk, currentKey);
            gScore.set(nk, tentativeG);
            fScore.set(nk, tentativeG + heuristic(nc, nr));
            openSet.add(nk);
          }
        }
      }
    }

    return null; // No path found
  }

  /** Smooth a grid path by removing unnecessary waypoints via line-of-sight checks */
  private smoothPath(gridPath: [number, number][], destX: number, destZ: number): THREE.Vector3[] {
    if (gridPath.length === 0) return [new THREE.Vector3(destX, 0, destZ)];

    // Convert to world positions
    const worldPoints: THREE.Vector3[] = gridPath.map(([c, r]) => {
      const [wx, wz] = this.gridToWorld(c, r);
      return new THREE.Vector3(wx, 0, wz);
    });
    // Replace last point with exact destination
    worldPoints[worldPoints.length - 1].set(destX, 0, destZ);

    // Greedy line-of-sight smoothing: skip waypoints we can reach directly
    const smoothed: THREE.Vector3[] = [worldPoints[0]];
    let current = 0;

    while (current < worldPoints.length - 1) {
      let farthestVisible = current + 1;
      for (let i = current + 2; i < worldPoints.length; i++) {
        if (this.hasLineOfSight(worldPoints[current], worldPoints[i])) {
          farthestVisible = i;
        }
      }
      smoothed.push(worldPoints[farthestVisible]);
      current = farthestVisible;
    }

    return smoothed;
  }

  /** Check if a straight line between two points crosses any unwalkable cell */
  private hasLineOfSight(a: THREE.Vector3, b: THREE.Vector3): boolean {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const steps = Math.ceil(dist / (this.cellSize * 0.5));

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const wx = a.x + dx * t;
      const wz = a.z + dz * t;
      if (!this.isWalkable(wx, wz)) return false;
    }
    return true;
  }
}

// ── TownNPCController ────────────────────────────────────────────

export class TownNPCController {
  private scene: THREE.Scene;
  private npcs = new Map<string, NPCInstance>();
  private navGrid: TownNavGrid;
  private townDef: FactionTown;
  private playerPosition: THREE.Vector3 = new THREE.Vector3();
  /** When true, patrol NPCs follow server positions instead of local simulation */
  private useServerSync = false;

  constructor(scene: THREE.Scene, townDef: FactionTown) {
    this.scene = scene;
    this.townDef = townDef;
    this.navGrid = new TownNavGrid(townDef.navmesh);
  }

  /** Initialize all NPCs from town definition */
  async init(): Promise<void> {
    for (const npcDef of this.townDef.npcs) {
      const spawn = this.townDef.spawnPoints.find(sp => sp.id === npcDef.spawnPointId);
      if (!spawn) continue;

      const behavior = npcDef.patrolPath && npcDef.patrolPath.length > 0
        ? 'patrol'
        : ROLE_BEHAVIOR[npcDef.role] || 'stationary';

      const group = new THREE.Group();
      group.position.set(spawn.position[0], spawn.position[1], spawn.position[2]);
      group.rotation.y = spawn.facing;

      // Placeholder capsule
      const roleColor = ROLE_COLORS[npcDef.role] || '#888888';
      const capsule = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.5, 1.6, 8, 12),
        new THREE.MeshLambertMaterial({ color: new THREE.Color(roleColor) }),
      );
      capsule.position.y = 1.3;
      capsule.castShadow = true;
      capsule.name = '__placeholder';
      group.add(capsule);

      // Nameplate
      const nameplate = this.createNameplate(npcDef.name, npcDef.role, roleColor);
      nameplate.position.y = 3.8;
      group.add(nameplate);

      // Role indicator (exclamation for quest givers, coin for merchants)
      if (npcDef.role === 'questGiver' || npcDef.role === 'hero') {
        const indicator = this.createRoleIndicator('!', '#f6c945');
        indicator.position.y = 4.5;
        group.add(indicator);
      } else if (npcDef.role === 'merchant' || npcDef.role === 'factionVendor') {
        const indicator = this.createRoleIndicator('$', '#6bdc8b');
        indicator.position.y = 4.5;
        group.add(indicator);
      }

      this.scene.add(group);

      const patrolPoints = (npcDef.patrolPath || []).map(
        p => new THREE.Vector3(p[0], p[1], p[2])
      );

      const instance: NPCInstance = {
        id: npcDef.id,
        def: npcDef,
        spawn,
        group,
        model: null,
        animations: null,
        nameplate,
        behavior,
        currentPos: new THREE.Vector3(spawn.position[0], spawn.position[1], spawn.position[2]),
        targetPos: new THREE.Vector3(spawn.position[0], spawn.position[1], spawn.position[2]),
        speed: behavior === 'wander' ? NPC_WANDER_SPEED : NPC_MOVE_SPEED,
        moving: false,
        currentPath: [],
        pathIndex: 0,
        patrolPoints,
        patrolIndex: 0,
        patrolWaitTimer: Math.random() * PATROL_WAIT_MAX,
        patrolDirection: 1,
        wanderTimer: Math.random() * WANDER_INTERVAL_MAX,
        wanderCooldown: WANDER_INTERVAL_MIN + Math.random() * (WANDER_INTERVAL_MAX - WANDER_INTERVAL_MIN),
        faceTarget: null,
        loading: false,
      };

      this.npcs.set(npcDef.id, instance);

      // Load model async (don't await — load in parallel)
      this.loadNPCModel(instance);
    }

    console.log(`[TownNPCController] Initialized ${this.npcs.size} NPCs for ${this.townDef.name}`);
  }

  /** Update player position (for NPC face-toward logic) */
  setPlayerPosition(pos: THREE.Vector3): void {
    this.playerPosition.copy(pos);
  }

  /**
   * Sync NPC positions + lock state from TownRoom server state.
   * Call this each frame with the latest useTownRoom().npcs map.
   * Patrol guards interpolate to server positions; locked NPCs freeze.
   */
  syncFromServer(serverNpcs: Map<string, { id: string; x: number; y: number; z: number; lockedBy: string }>): void {
    this.useServerSync = true;

    for (const [id, serverData] of serverNpcs) {
      const npc = this.npcs.get(id);
      if (!npc) continue;

      // If NPC is locked by a player, stop movement and face the locker
      if (serverData.lockedBy) {
        npc.moving = false;
        npc.currentPath = [];
        npc.pathIndex = 0;
        this.setAnimation(npc, 'idle');

        // Face toward the locking player (we don't know their exact pos, but
        // the interaction sphere is already in front of the NPC, so just idle)
        continue;
      }

      // Patrol guards: interpolate to server-authoritative position
      if (npc.behavior === 'patrol') {
        const serverPos = new THREE.Vector3(serverData.x, serverData.y, serverData.z);
        const dist = npc.currentPos.distanceTo(serverPos);

        if (dist > 0.3) {
          // Lerp toward server position
          npc.currentPos.lerp(serverPos, 0.15);
          npc.group.position.copy(npc.currentPos);

          // Face movement direction
          const dx = serverPos.x - npc.currentPos.x;
          const dz = serverPos.z - npc.currentPos.z;
          if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
            npc.group.rotation.y = Math.atan2(dx, dz);
          }
          this.setAnimation(npc, 'walk');
        } else {
          npc.currentPos.copy(serverPos);
          npc.group.position.copy(serverPos);
          this.setAnimation(npc, 'idle');
        }
      }
    }
  }

  /** Main update loop — call from game tick */
  update(dt: number): void {
    for (const [, npc] of this.npcs) {
      switch (npc.behavior) {
        case 'patrol':
          // Skip local patrol sim when server is driving positions
          if (!this.useServerSync) this.updatePatrol(npc, dt);
          break;
        case 'wander':
          this.updateWander(npc, dt);
          break;
        case 'stationary':
          this.updateStationary(npc, dt);
          break;
      }

      // Follow path waypoints
      if (npc.moving) {
        if (npc.currentPath.length > 0 && npc.pathIndex < npc.currentPath.length) {
          // Move toward current path waypoint
          const waypoint = npc.currentPath[npc.pathIndex];
          const dir = new THREE.Vector3().subVectors(waypoint, npc.currentPos);
          const dist = dir.length();

          if (dist < 0.5) {
            // Reached waypoint — advance to next
            npc.pathIndex++;
            if (npc.pathIndex >= npc.currentPath.length) {
              // Path complete
              npc.moving = false;
              npc.currentPath = [];
              npc.pathIndex = 0;
              npc.currentPos.copy(waypoint);
              this.setAnimation(npc, 'idle');
            }
          } else {
            dir.normalize();
            const step = Math.min(npc.speed * dt, dist);
            npc.currentPos.add(dir.multiplyScalar(step));
            npc.group.rotation.y = Math.atan2(dir.x, dir.z);
            this.setAnimation(npc, 'walk');
          }
        } else {
          // Fallback: direct movement (patrol guards use fixed waypoints)
          const dir = new THREE.Vector3().subVectors(npc.targetPos, npc.currentPos);
          const dist = dir.length();

          if (dist < 0.3) {
            npc.moving = false;
            npc.currentPos.copy(npc.targetPos);
            this.setAnimation(npc, 'idle');
          } else {
            dir.normalize();
            const step = Math.min(npc.speed * dt, dist);
            npc.currentPos.add(dir.multiplyScalar(step));
            npc.group.rotation.y = Math.atan2(dir.x, dir.z);
            this.setAnimation(npc, 'walk');
          }
        }

        npc.group.position.copy(npc.currentPos);
      } else {
        // Stationary NPCs face nearby players
        this.faceNearbyPlayer(npc, dt);
      }

      // Update animation mixer
      if (npc.animations) {
        npc.animations.update(dt);
      }
    }
  }

  // ── Patrol behavior ────────────────────────────────────────────

  private updatePatrol(npc: NPCInstance, dt: number): void {
    if (npc.moving) return;
    if (npc.patrolPoints.length === 0) return;

    npc.patrolWaitTimer -= dt;
    if (npc.patrolWaitTimer > 0) return;

    // Move to next patrol point
    npc.patrolIndex += npc.patrolDirection;

    // Ping-pong at ends
    if (npc.patrolIndex >= npc.patrolPoints.length) {
      npc.patrolDirection = -1;
      npc.patrolIndex = npc.patrolPoints.length - 2;
    } else if (npc.patrolIndex < 0) {
      npc.patrolDirection = 1;
      npc.patrolIndex = 1;
    }

    npc.patrolIndex = Math.max(0, Math.min(npc.patrolIndex, npc.patrolPoints.length - 1));
    npc.targetPos.copy(npc.patrolPoints[npc.patrolIndex]);
    npc.moving = true;
    npc.patrolWaitTimer = PATROL_WAIT_MIN + Math.random() * (PATROL_WAIT_MAX - PATROL_WAIT_MIN);
  }

  // ── Wander behavior (with A* pathfinding) ─────────────────────────

  private updateWander(npc: NPCInstance, dt: number): void {
    if (npc.moving) return;

    npc.wanderTimer -= dt;
    if (npc.wanderTimer > 0) return;

    // Pick a random walkable point near spawn
    const spawnPos = new THREE.Vector3(npc.spawn.position[0], 0, npc.spawn.position[2]);
    const target = this.navGrid.randomWalkableNear(spawnPos.x, spawnPos.z, WANDER_RADIUS);

    if (target) {
      // Use A* pathfinding to navigate around obstacles
      const path = this.navGrid.findPath(
        npc.currentPos.x, npc.currentPos.z,
        target.x, target.z,
      );

      if (path && path.length > 0) {
        npc.currentPath = path;
        npc.pathIndex = 0;
        npc.targetPos.copy(target);
        npc.moving = true;
      }
    }

    npc.wanderTimer = npc.wanderCooldown;
    npc.wanderCooldown = WANDER_INTERVAL_MIN + Math.random() * (WANDER_INTERVAL_MAX - WANDER_INTERVAL_MIN);
  }

  // ── Stationary behavior ────────────────────────────────────────

  private updateStationary(_npc: NPCInstance, _dt: number): void {
    // Nothing — just idle. Face-player logic handled in the main update.
  }

  // ── Face nearby player ─────────────────────────────────────────

  private faceNearbyPlayer(npc: NPCInstance, dt: number): void {
    const dx = this.playerPosition.x - npc.currentPos.x;
    const dz = this.playerPosition.z - npc.currentPos.z;
    const distSq = dx * dx + dz * dz;

    if (distSq < FACE_PLAYER_DISTANCE * FACE_PLAYER_DISTANCE && distSq > 1) {
      const targetAngle = Math.atan2(dx, dz);
      // Smooth rotation toward player
      let diff = targetAngle - npc.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      npc.group.rotation.y += diff * LERP_SPEED * dt;
    }
  }

  // ── Animation helpers ──────────────────────────────────────────

  private setAnimation(npc: NPCInstance, state: AnimState): void {
    if (!npc.animations) return;
    npc.animations.play(state);
  }

  // ── Model loading ──────────────────────────────────────────────

  private async loadNPCModel(npc: NPCInstance): Promise<void> {
    if (npc.loading) return;
    npc.loading = true;

    const manifest = MODEL_MANIFEST[npc.def.modelId];
    if (!manifest) {
      console.warn(`[TownNPC] No model manifest for: ${npc.def.modelId}`);
      npc.loading = false;
      return;
    }

    try {
      const loaded = await loadCharacterModel(manifest.modelPath);
      npc.model = loaded;

      loaded.scene.scale.setScalar(manifest.scale);
      loaded.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Remove placeholder
      const placeholder = npc.group.getObjectByName('__placeholder');
      if (placeholder) npc.group.remove(placeholder);

      npc.group.add(loaded.scene);

      // Setup animations
      npc.animations = new AnimationManager(loaded.scene);

      for (const clip of loaded.clips) {
        const name = clip.name.toLowerCase();
        let state: AnimState = 'idle';
        if (name.includes('walk') || name.includes('run')) state = 'walk';
        else if (name.includes('attack')) state = 'attack';
        npc.animations!.addClipFromGLTF(state, clip);
      }

      // Load idle/walk animations from unarmed set
      const animSet = getAnimationSet(manifest.weaponType);
      const animPaths: Partial<Record<AnimState, string>> = {};
      if (animSet.idle) animPaths.idle = resolveModelUrl(animSet.idle.file);
      if (animSet.run) animPaths.walk = resolveModelUrl(animSet.run.file);

      if (Object.keys(animPaths).length > 0) {
        await npc.animations.loadAnimations(animPaths).catch(() => {});
      }

      npc.animations.play('idle');
    } catch (err) {
      console.warn(`[TownNPC] Failed to load model ${npc.def.modelId}:`, err);
    }

    npc.loading = false;
  }

  // ── Nameplate ──────────────────────────────────────────────────

  private createNameplate(name: string, role: TownNPCRole, color: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 48;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.roundRect(4, 4, 248, 40, 6);
    ctx.fill();

    // Role tag
    const roleLabel = role === 'hero' ? 'HERO' :
      role === 'merchant' ? 'MERCHANT' :
      role === 'questGiver' ? 'QUEST' :
      role === 'factionVendor' ? 'VENDOR' :
      role === 'guard' ? 'GUARD' :
      role === 'shrineKeeper' ? 'SHRINE' : '';

    if (roleLabel) {
      ctx.fillStyle = color;
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`[${roleLabel}]`, 10, 18);
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(name.slice(0, 20), 10, 36);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2.5, 0.5, 1);
    return sprite;
  }

  // ── Role indicator (floating ! or $) ───────────────────────────

  private createRoleIndicator(symbol: string, color: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = color;
    ctx.font = 'bold 48px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.8, 0.8, 1);
    return sprite;
  }

  // ── Cleanup ────────────────────────────────────────────────────

  dispose(): void {
    for (const [, npc] of this.npcs) {
      this.scene.remove(npc.group);
      npc.group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach(m => m.dispose());
        }
      });
    }
    this.npcs.clear();
  }

  get count(): number {
    return this.npcs.size;
  }
}
