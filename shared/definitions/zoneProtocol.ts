/**
 * zoneProtocol — Canonical multiplayer types for Grudge Warlords production.
 *
 * GrudgeBuilder uses Colyseus (SectorRoom, TownRoom, HomeIslandRoom) on Railway.
 * RTS-Grudge's Socket.IO zone:* events are deprecated — types here align with
 * worldMapSectors zone IDs and sectorBridge legacy grid keys.
 */

import type { LegacySectorId } from './sectorBridge';
import { LEGACY_SECTOR_IDS, resolveZoneSectorId } from './sectorBridge';
import { getAllSectorIds } from './worldMapSectors';

/** Canonical zone id — named sector from worldMapSectors (e.g. haven_shore). */
export type ZoneId = string;

export const ZONE_IDS: ZoneId[] = getAllSectorIds();
export const LEGACY_ZONE_IDS = LEGACY_SECTOR_IDS;

export function normalizeZoneId(id: string): ZoneId {
  return resolveZoneSectorId(id) as ZoneId;
}

// ── Remote player (client + server shared shape) ─────────────────────────────

export interface RemotePlayer {
  playerId: string;
  characterName: string;
  heroClass: string;
  modelPath: string;
  level: number;
  position: [number, number, number];
  rotation: number;
  animation: string;
  health: number;
  maxHealth: number;
  faction: string;
}

// ── Zone snapshot (Colyseus join / legacy Socket.IO compat) ───────────────────

export interface ZoneSnapshot {
  channelId: string;
  zoneId: ZoneId;
  players: RemotePlayer[];
  enemies: ZoneEnemy[];
  resources: ZoneResource[];
}

export interface ZoneEnemy {
  id: string;
  type: string;
  position: [number, number, number];
  health: number;
  maxHealth: number;
  targetId: string | null;
}

export interface ZoneResource {
  id: string;
  type: string;
  position: [number, number, number];
  available: boolean;
  respawnIn: number;
}

// ── Colyseus room join results ───────────────────────────────────────────────

export interface ZoneJoinResult {
  success: boolean;
  channelId: string;
  snapshot: ZoneSnapshot;
  error?: string;
}

export interface IslandJoinResult {
  success: boolean;
  sessionCode: string;
  hostPlayerId: string;
  players: RemotePlayer[];
  error?: string;
}

export interface IslandCreateResult {
  success: boolean;
  sessionCode: string;
  error?: string;
}

// ── Channel / interest management ────────────────────────────────────────────

export interface ZoneChannelInfo {
  channelId: string;
  zoneId: ZoneId;
  playerCount: number;
  createdAt: number;
}

export const ZONE_CHANNEL_SOFT_CAP = 50;
export const INTEREST_RADIUS = 50;
export const UNSUBSCRIBE_RADIUS = 100;
export const POSITION_UPDATE_HZ = 10;
export const HOME_ISLAND_MAX_PLAYERS = 4;
export const CHANNEL_GC_DELAY_MS = 60_000;

/** Map legacy grid key (NW) to canonical zone id for room filters. */
export function zoneIdFromLegacy(legacy: LegacySectorId): ZoneId {
  return normalizeZoneId(legacy);
}