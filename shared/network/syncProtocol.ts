/**
 * Multiplayer sync protocol SSOT — client NetworkManager + Colyseus rooms.
 *
 * Design for lag-free co-play:
 *   • High-frequency: position (15 Hz) with client-side interpolation
 *   • Medium: anim state (on change + 2 Hz heartbeat)
 *   • Reliable messages: chat, buildings, one-shot VFX, combat
 *   • Schema fields for late joiners (buildings map, player anim)
 */

export const SYNC_PROTOCOL_VERSION = 1 as const;

/** Client → server Colyseus messages */
export const CLIENT_MSG = {
  move: 'move',
  anim: 'anim',
  fx: 'fx',
  chat: 'chat',
  place_building: 'place_building',
  remove_building: 'remove_building',
  harvest: 'harvest',
  pve_attack: 'pve_attack',
  pvp_attack: 'pvp_attack',
  ready: 'ready',
} as const;

/** Server → client broadcasts / unicast */
export const SERVER_MSG = {
  chat: 'chat',
  fx: 'fx',
  anim: 'anim',
  building_placed: 'building_placed',
  building_removed: 'building_removed',
  harvest_complete: 'harvest_complete',
  enemy_killed: 'enemy_killed',
  pvp_kill: 'pvp_kill',
  island_full: 'island_full',
  room_snapshot: 'room_snapshot',
} as const;

export type ClientMsg = (typeof CLIENT_MSG)[keyof typeof CLIENT_MSG];
export type ServerMsg = (typeof SERVER_MSG)[keyof typeof SERVER_MSG];

/** Shared anim states for remote playback */
export type SyncAnimState =
  | 'idle'
  | 'moving'
  | 'walk'
  | 'run'
  | 'attacking'
  | 'attack'
  | 'harvesting'
  | 'block'
  | 'dodge'
  | 'cast'
  | 'dead'
  | 'death';

export interface MovePayload {
  x: number;
  y: number;
  z: number;
  facing: number;
  state: string;
}

export interface AnimPayload {
  state: SyncAnimState | string;
  clip?: string;
  /** optional one-shot flag */
  oneshot?: boolean;
}

export interface FxPayload {
  kind: 'attack_burst' | 'teleport_smoke' | 'dash_foot' | 'fire' | 'smoke' | 'custom';
  x: number;
  y: number;
  z: number;
  id?: string;
  meta?: string;
}

export interface ChatPayload {
  text: string;
}

export interface PlaceBuildingPayload {
  id: string;
  assetId: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
}

export interface ServerChatEvent {
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  room?: string;
}

export interface ServerFxEvent extends FxPayload {
  senderId: string;
  timestamp: number;
}

/** REST session shape */
export interface MultiplayerSessionInfo {
  protocolVersion: number;
  colyseusUrl: string;
  rooms: string[];
  matchMakerReady: boolean;
  recommendedSendHz: number;
  assetCdn: string;
  sectorPreload?: string[];
}

/** Tick rates — best practice for smooth remote play */
export const NETWORK_RATES = {
  /** Position send Hz */
  moveHz: 15,
  /** Anim heartbeat Hz when moving */
  animHeartbeatHz: 2,
  /** Remote position lerp speed */
  remoteLerp: 10,
  /** Snapshot interest radius (m) for future AOI */
  interestRadiusM: 180,
  /** Max concurrent GLB loads */
  maxConcurrentAssetLoads: 4,
  /** Chat text max chars */
  chatMaxLen: 200,
} as const;

export function normalizeAnimState(state: string): SyncAnimState {
  const s = (state || 'idle').toLowerCase();
  if (s === 'moving' || s === 'walk' || s === 'run') return s === 'run' ? 'run' : 'walk';
  if (s === 'attacking' || s === 'attack') return 'attack';
  if (s === 'dead' || s === 'death') return 'death';
  if (s === 'harvesting') return 'harvesting';
  if (s === 'block' || s === 'dodge' || s === 'cast') return s as SyncAnimState;
  return 'idle';
}
