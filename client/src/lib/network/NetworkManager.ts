import { createGameClient } from '@/lib/gameClient';
import { getStateCallbacks } from '@colyseus/sdk';
/**
 * NetworkManager — single multiplayer facade for Warlords zones / home / lobby.
 *
 * Responsibilities:
 *   • REST: session bootstrap + health + sector asset manifest
 *   • Colyseus: connect, join sector/home, leave
 *   • Send: move (15 Hz), anim, fx, chat, buildings
 *   • Receive: remote players, chat, fx, buildings → callbacks
 *   • Coordinates AssetLoadQueue preloads for lag-free remote meshes
 *
 * Does not replace Colyseus rooms — wraps them with best practices.
 */
import { Client, Room } from '@colyseus/sdk';
import { getColyseusEndpoint } from '@/lib/colyseusEndpoint';
import { resolveZoneSectorId } from '@shared/definitions/sectorBridge';
import {
  CLIENT_MSG,
  NETWORK_RATES,
  SYNC_PROTOCOL_VERSION,
  normalizeAnimState,
  type AnimPayload,
  type FxPayload,
  type MultiplayerSessionInfo,
  type PlaceBuildingPayload,
  type ServerChatEvent,
  type ServerFxEvent,
} from '@shared/network/syncProtocol';
import { AssetLoadQueue } from './AssetLoadQueue';
import { GAME_DATA_API } from '@/lib/grudgeConfig';
import { FLEET_URLS } from '@shared/fleet';

export interface NetworkPlayerJoin {
  characterName: string;
  heroClass: string;
  heroRace: string;
  faction?: string;
  level?: number;
  accountId?: string;
  characterId?: string;
  baseModelId?: string;
  equippedMeshes?: Record<string, string>;
  weaponSlots?: Record<string, string>;
  skinColor?: string;
  armorColor?: string;
  equippedWeaponType?: string;
}

export type NetworkEventMap = {
  connected: { sessionId: string };
  disconnected: void;
  error: string;
  chat: ServerChatEvent;
  fx: ServerFxEvent;
  playerAdd: { sessionId: string; player: any };
  playerRemove: { sessionId: string };
  playerChange: { sessionId: string; player: any };
  buildingAdd: { id: string; building: any };
  buildingRemove: { id: string };
  harvest: { nodeId: string; depleted: boolean };
  session: MultiplayerSessionInfo;
};

type Handler<K extends keyof NetworkEventMap> = (payload: NetworkEventMap[K]) => void;

export class NetworkManager {
  private client: Client | null = null;
  private worldRoom: Room | null = null;
  private sectorRoom: Room | null = null;
  private sessionId: string | null = null;
  private listeners = new Map<string, Set<Function>>();
  private lastAnimSent = '';
  private lastAnimAt = 0;
  private session: MultiplayerSessionInfo | null = null;

  // ── REST bootstrap ───────────────────────────────────────────────────────

  async fetchSession(sectorId?: string): Promise<MultiplayerSessionInfo> {
    const base = '';
    const q = sectorId ? `?sector=${encodeURIComponent(sectorId)}` : '';
    try {
      const res = await fetch(`${base}/api/multiplayer/session${q}`, {
        credentials: 'include',
      });
      if (res.ok) {
        this.session = (await res.json()) as MultiplayerSessionInfo;
        this.emit('session', this.session);
        if (this.session.sectorPreload?.length) {
          AssetLoadQueue.preloadSectorRaces(
            this.session.sectorPreload.filter((p) => !p.includes('/')),
          );
        } else {
          AssetLoadQueue.preloadSectorRaces();
        }
        return this.session;
      }
    } catch (e) {
      console.warn('[NetworkManager] REST session failed — using defaults', e);
    }
    // Offline / REST down fallback
    this.session = {
      protocolVersion: SYNC_PROTOCOL_VERSION,
      colyseusUrl: getColyseusEndpoint(),
      rooms: ['sector', 'home_island', 'lobby', 'world', 'town', 'dungeon', 'tutorial'],
      matchMakerReady: false,
      recommendedSendHz: NETWORK_RATES.moveHz,
      assetCdn: FLEET_URLS.assets || 'https://assets.grudge-studio.com',
      sectorPreload: ['human', 'elf', 'orc', 'dwarf', 'barbarian', 'undead'],
    };
    AssetLoadQueue.preloadSectorRaces();
    this.emit('session', this.session);
    return this.session;
  }

  async fetchHealth(): Promise<{ ok: boolean; raw?: unknown }> {
    const base = (FLEET_URLS.gameData || GAME_DATA_API || '').replace(/\/$/, '');
    try {
      const res = await fetch(`${base}/api/multiplayer/status`);
      if (!res.ok) return { ok: false };
      const raw = await res.json();
      return { ok: !!raw.ok || !!raw.matchMakerReady, raw };
    } catch {
      return { ok: false };
    }
  }

  // ── Events ───────────────────────────────────────────────────────────────

  on<K extends keyof NetworkEventMap>(event: K, fn: Handler<K>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }

  private emit<K extends keyof NetworkEventMap>(event: K, payload: NetworkEventMap[K]): void {
    this.listeners.get(event)?.forEach((fn) => {
      try {
        (fn as Handler<K>)(payload);
      } catch (e) {
        console.warn('[NetworkManager] listener error', event, e);
      }
    });
  }

  // ── Connect ──────────────────────────────────────────────────────────────

  get localSessionId(): string | null {
    return this.sessionId;
  }

  get room(): Room | null {
    return this.sectorRoom;
  }

  get connected(): boolean {
    return !!this.sectorRoom || !!this.worldRoom;
  }

  async connectWorld(player: NetworkPlayerJoin): Promise<void> {
    await this.fetchSession();
    const endpoint = this.session?.colyseusUrl || getColyseusEndpoint();
    this.client = createGameClient(endpoint);
    this.worldRoom = await this.client.joinOrCreate('world', {
      characterName: player.characterName,
      heroClass: player.heroClass,
      heroRace: player.heroRace,
      faction: player.faction,
      level: player.level,
      accountId: player.accountId,
      characterId: player.characterId,
      sourceGame: 'warlords',
    });
    this.sessionId = this.worldRoom.sessionId;
    this.emit('connected', { sessionId: this.sessionId });
    this.worldRoom.onLeave((code) => {
      void this.tryReconnect(this.worldRoom, code, (room) => {
        this.worldRoom = room;
        this.sessionId = room.sessionId;
        this.emit('connected', { sessionId: this.sessionId });
      }).then((ok) => {
        if (!ok) {
          this.worldRoom = null;
          this.emit('disconnected', undefined as void);
        }
      });
    });
    this.worldRoom.onError((_c, msg) => this.emit('error', String(msg)));
  }

  async joinSector(
    sectorId: string,
    player: NetworkPlayerJoin,
    worldSeed = 'grudge-world-1',
  ): Promise<Room> {
    if (!this.client) {
      await this.connectWorld(player);
    }
    const zoneId = resolveZoneSectorId(sectorId);
    await this.fetchSession(zoneId);

    if (this.sectorRoom) {
      try {
        await this.sectorRoom.leave();
      } catch {
        /* ignore */
      }
      this.sectorRoom = null;
    }

    // Preload local race at highest priority
    void AssetLoadQueue.loadRaceModel(player.heroRace || 'human', 0);

    const room = await this.client!.joinOrCreate('sector', {
      sectorId: zoneId,
      worldSeed,
      characterName: player.characterName,
      heroClass: player.heroClass,
      heroRace: player.heroRace,
      faction: player.faction,
      level: player.level ?? 1,
      accountId: player.accountId,
      characterId: player.characterId,
      sourceGame: 'warlords',
      baseModelId: player.baseModelId || player.heroRace || 'human',
      equippedMeshes: player.equippedMeshes || {},
      weaponSlots: player.weaponSlots || {},
      skinColor: player.skinColor || '#ffffff',
      armorColor: player.armorColor || '#ffffff',
      equippedWeaponType: player.equippedWeaponType || 'sword-shield',
    });

    this.sectorRoom = room;
    this.sessionId = room.sessionId;
    this.wireSectorRoom(room);
    room.send(CLIENT_MSG.ready, { protocolVersion: SYNC_PROTOCOL_VERSION });
    return room;
  }

  /**
   * Home island hosting: filterBy owner accountId.
   * Owner: joinOrCreate. Guest: join only (owner must be online) — max 5 guests.
   * Harvest/build enforced owner-only on the server.
   */
  async joinHomeIsland(
    player: NetworkPlayerJoin & {
      islandUUID?: string;
      islandSeed?: number;
      isVisitor?: boolean;
      ownerAccountId?: string;
    },
  ): Promise<Room> {
    if (!this.client) await this.connectWorld(player);
    void AssetLoadQueue.loadRaceModel(player.heroRace || 'human', 0);
    const isVisitor = !!player.isVisitor;
    const ownerAccountId = isVisitor
      ? player.ownerAccountId || player.accountId
      : player.accountId;
    if (!ownerAccountId) {
      throw new Error('HOME_ISLAND_ACCOUNT_REQUIRED');
    }
    const opts = {
      accountId: ownerAccountId,
      visitorAccountId: isVisitor ? player.accountId : undefined,
      islandUUID: player.islandUUID,
      islandSeed: player.islandSeed,
      isVisitor,
      characterName: player.characterName,
      heroRace: player.heroRace,
      heroClass: player.heroClass,
      level: player.level,
      baseModelId: player.baseModelId || player.heroRace,
      equippedWeaponType: player.equippedWeaponType,
    };
    const room = isVisitor
      ? await this.client!.join('home_island', opts)
      : await this.client!.joinOrCreate('home_island', opts);
    this.sectorRoom = room;
    this.sessionId = room.sessionId;
    this.wireSectorRoom(room);
    return room;
  }

  private wireSectorRoom(room: Room): void {
    getStateCallbacks(room)(room.state).players.onAdd?.((player: any, sessionId: string) => {
      this.emit('playerAdd', { sessionId, player });
      // Preload remote race mesh at priority 1
      if (sessionId !== this.sessionId && player.heroRace) {
        void AssetLoadQueue.loadRaceModel(player.heroRace, 1);
      }
      getStateCallbacks(room)(player).onChange(() => {
        this.emit('playerChange', { sessionId, player });
      });
    });
    getStateCallbacks(room)(room.state).players.onRemove?.((_p: any, sessionId: string) => {
      this.emit('playerRemove', { sessionId });
    });

    getStateCallbacks(room)(room.state).buildings.onAdd?.((building: any, id: string) => {
      this.emit('buildingAdd', { id, building });
    });
    getStateCallbacks(room)(room.state).buildings.onRemove?.((_b: any, id: string) => {
      this.emit('buildingRemove', { id });
    });
    room.state.buildings?.forEach?.((building: any, id: string) => {
      this.emit('buildingAdd', { id, building });
    });

    getStateCallbacks(room)(room.state).harvestNodes.onAdd?.((node: any, id: string) => {
      this.emit('harvest', { nodeId: id, depleted: !!node.depleted });
      getStateCallbacks(room)(node).onChange(() => {
        this.emit('harvest', { nodeId: id, depleted: !!node.depleted });
      });
    });

    room.onMessage(CLIENT_MSG.chat, (msg: ServerChatEvent) => this.emit('chat', msg));
    room.onMessage('chat', (msg: ServerChatEvent) => this.emit('chat', msg));
    room.onMessage(CLIENT_MSG.fx, (msg: ServerFxEvent) => this.emit('fx', msg));
    room.onMessage('fx', (msg: ServerFxEvent) => this.emit('fx', msg));

    room.onLeave((code) => {
      void this.tryReconnect(room, code, (rejoined) => {
        this.sectorRoom = rejoined;
        this.sessionId = rejoined.sessionId;
        this.wireSectorRoom(rejoined);
        this.emit('connected', { sessionId: this.sessionId });
      }).then((ok) => {
        if (!ok && this.sectorRoom === room) {
          this.sectorRoom = null;
          this.emit('disconnected', undefined as void);
        }
      });
    });
    room.onError((_c, m) => this.emit('error', String(m)));
  }

  /**
   * Attempt Colyseus reconnection after a network drop (non-1000 leave codes).
   * Server must call allowReconnection (see server/colyseus/reconnect.ts).
   */
  private async tryReconnect(
    room: Room | null,
    code: number,
    onOk: (room: Room) => void,
  ): Promise<boolean> {
    // 1000 = normal / consented close — do not reconnect
    if (code === 1000 || !room || !this.client) return false;
    const token =
      (room as { rejoinToken?: string; reconnectionToken?: string }).reconnectionToken ||
      (room as { rejoinToken?: string }).rejoinToken;
    if (!token) return false;
    this.emit('error', 'Connection lost — reconnecting…');
    try {
      const rejoined = await this.client.reconnect(token);
      onOk(rejoined);
      return true;
    } catch (e) {
      this.emit('error', `Could not rejoin: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }

  // ── Outbound ─────────────────────────────────────────────────────────────

  sendMove(x: number, y: number, z: number, facing: number, state: string): void {
    this.sectorRoom?.send(CLIENT_MSG.move, { x, y, z, facing, state });
  }

  /**
   * Send anim only on change or heartbeat — reduces bandwidth while remotes stay in sync.
   */
  sendAnim(state: string, clip?: string, force = false): void {
    const norm = normalizeAnimState(state);
    const key = `${norm}:${clip || ''}`;
    const now = performance.now();
    const heartbeat = 1000 / NETWORK_RATES.animHeartbeatHz;
    if (!force && key === this.lastAnimSent && now - this.lastAnimAt < heartbeat) return;
    this.lastAnimSent = key;
    this.lastAnimAt = now;
    const payload: AnimPayload = { state: norm, clip, oneshot: norm === 'attack' };
    this.sectorRoom?.send(CLIENT_MSG.anim, payload);
  }

  sendFx(fx: FxPayload): void {
    this.sectorRoom?.send(CLIENT_MSG.fx, fx);
  }

  sendChat(text: string): void {
    const t = String(text || '').trim().slice(0, NETWORK_RATES.chatMaxLen);
    if (!t) return;
    this.sectorRoom?.send(CLIENT_MSG.chat, { text: t });
  }

  sendPlaceBuilding(b: PlaceBuildingPayload): void {
    this.sectorRoom?.send(CLIENT_MSG.place_building, b);
  }

  sendRemoveBuilding(id: string): void {
    this.sectorRoom?.send(CLIENT_MSG.remove_building, { id });
  }

  sendHarvest(nodeId: string, professionId: string): void {
    this.sectorRoom?.send(CLIENT_MSG.harvest, { nodeId, professionId });
  }

  /** PvE — SectorRoom.handlePveAttack (was hanging on NetworkManager path) */
  sendPveAttack(enemyId: string, damage: number): void {
    this.sectorRoom?.send(CLIENT_MSG.pve_attack, { enemyId, damage });
  }

  /** PvP — SectorRoom.handlePvpAttack */
  sendPvpAttack(targetId: string, damage: number): void {
    this.sectorRoom?.send(CLIENT_MSG.pvp_attack, { targetId, damage });
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  async dispose(): Promise<void> {
    try {
      await this.sectorRoom?.leave();
    } catch {
      /* */
    }
    try {
      await this.worldRoom?.leave();
    } catch {
      /* */
    }
    this.sectorRoom = null;
    this.worldRoom = null;
    this.client = null;
    this.sessionId = null;
    this.listeners.clear();
    AssetLoadQueue.clearQueue();
  }
}

/** Shared singleton for engine / UI */
let _nm: NetworkManager | null = null;

export function getNetworkManager(): NetworkManager {
  if (!_nm) _nm = new NetworkManager();
  return _nm;
}

export function resetNetworkManager(): void {
  void _nm?.dispose();
  _nm = null;
}
