/**
 * RegenerativeHarvest — shared growth / respawn / dry-land rules for all
 * harvestables (trees, rocks, crystals, flowers, hemp, scrap) and fish.
 *
 * Visual contract:
 *   depleted → stump/hidden
 *   growing  → scale 0.15 → 1.0 over growthDurationMs (shows "regrowing")
 *   mature   → full scale, harvestable
 *
 * Placement contract:
 *   trees/rocks/crystals/flowers/scrap/animals → dry land only (y > water + margin)
 *   fish nodes                                 → water only (y <= water + margin)
 */
import * as THREE from 'three';

// ── Timing (ms) ──────────────────────────────────────────────────────────────

/** Full cycle after deplete until mature again — 1.5–4 min by type. */
export const HARVEST_RESPAWN_MS = {
  tree: 180_000,
  rock: 150_000,
  crystal: 210_000,
  flower: 90_000,
  hemp: 100_000,
  scrap: 120_000,
  fish: 75_000,
} as const;

export type HarvestKind = keyof typeof HARVEST_RESPAWN_MS;

/** Portion of respawn spent as visible "growing" scale animation. */
export const GROWTH_FRACTION = 0.55;

export function respawnMsFor(kind: HarvestKind, jitter = 0.25): number {
  const base = HARVEST_RESPAWN_MS[kind];
  const j = 1 + (Math.random() * 2 - 1) * jitter;
  return Math.round(base * j);
}

export function growthDurationMs(kind: HarvestKind): number {
  return Math.round(HARVEST_RESPAWN_MS[kind] * GROWTH_FRACTION);
}

// ── Growth state ─────────────────────────────────────────────────────────────

export type GrowthPhase = 'mature' | 'depleted' | 'growing';

export interface RegeneratingNode {
  group: THREE.Group;
  baseScale: number;
  health: number;
  maxHealth: number;
  respawnAt: number;
  /** Optional growth fields (added by ensureGrowthFields). */
  growthPhase?: GrowthPhase;
  growthStartedAt?: number;
  growthDurationMs?: number;
  harvestKind?: HarvestKind;
}

export function ensureGrowthFields(
  node: RegeneratingNode,
  kind: HarvestKind,
): void {
  if (!node.growthPhase) node.growthPhase = 'mature';
  if (!node.growthDurationMs) node.growthDurationMs = growthDurationMs(kind);
  node.harvestKind = kind;
}

/** Mark depleted and schedule regrow. Returns respawn timestamp. */
export function markDepleted(
  node: RegeneratingNode,
  kind: HarvestKind,
  hide = true,
): number {
  ensureGrowthFields(node, kind);
  const ms = respawnMsFor(kind);
  node.respawnAt = Date.now() + ms;
  node.growthPhase = 'depleted';
  node.health = 0;
  if (hide) {
    node.group.visible = false;
    node.group.scale.setScalar(0.01);
  }
  return node.respawnAt;
}

/**
 * Start visible growth after depleted period.
 * Call when `now >= respawnAt - growthDuration` or after stump phase for trees.
 */
export function beginGrowth(node: RegeneratingNode, kind: HarvestKind): void {
  ensureGrowthFields(node, kind);
  const duration = growthDurationMs(kind);
  node.growthPhase = 'growing';
  node.growthStartedAt = Date.now();
  node.growthDurationMs = duration;
  node.respawnAt = Date.now() + duration;
  node.group.visible = true;
  node.group.scale.setScalar(node.baseScale * 0.15);
  node.health = 0; // not harvestable until mature
}

/** Apply growth scale each frame; returns true when just became mature. */
export function tickGrowth(node: RegeneratingNode, now = Date.now()): boolean {
  if (node.growthPhase !== 'growing' || !node.growthStartedAt || !node.growthDurationMs) {
    return false;
  }
  const t = Math.min(1, (now - node.growthStartedAt) / node.growthDurationMs);
  // Ease-out cubic — fast early sprout, slow finish
  const ease = 1 - Math.pow(1 - t, 3);
  const minS = 0.15;
  const s = minS + (1 - minS) * ease;
  node.group.scale.setScalar(node.baseScale * s);
  node.group.visible = true;

  if (t >= 1) {
    node.growthPhase = 'mature';
    node.respawnAt = 0;
    node.health = node.maxHealth;
    node.group.scale.setScalar(node.baseScale);
    return true;
  }
  return false;
}

/** True when node can take harvest damage. */
export function isHarvestable(node: RegeneratingNode): boolean {
  const phase = node.growthPhase ?? 'mature';
  return phase === 'mature' && node.health > 0 && node.group.visible;
}

// ── Land / water placement ───────────────────────────────────────────────────

export const LAND_MARGIN_M = 1.25;
export const FISH_MAX_ABOVE_WATER_M = 0.5;

export function isDryLand(
  heightY: number,
  waterLevel: number,
  margin = LAND_MARGIN_M,
): boolean {
  return heightY > waterLevel + margin;
}

export function isWaterPlacement(
  heightY: number,
  waterLevel: number,
  maxAbove = FISH_MAX_ABOVE_WATER_M,
): boolean {
  return heightY <= waterLevel + maxAbove;
}

/**
 * Reject land harvestables in water and fish on land.
 * Returns corrected Y or null if placement is illegal.
 */
export function validateHarvestPlacement(
  kind: HarvestKind | 'animal' | 'fish_node',
  sampleY: number | null,
  waterLevel: number,
): number | null {
  if (sampleY === null || !Number.isFinite(sampleY)) return null;

  if (kind === 'fish' || kind === 'fish_node') {
    return isWaterPlacement(sampleY, waterLevel) ? Math.min(sampleY, waterLevel - 0.4) : null;
  }

  // All land harvestables + animals
  if (!isDryLand(sampleY, waterLevel)) return null;
  return sampleY;
}

/** Try nearby offsets to find dry land / water for a failed sample. */
export function findValidPlacement(
  kind: HarvestKind | 'animal' | 'fish_node',
  x: number,
  z: number,
  waterLevel: number,
  sampleHeight: (x: number, z: number) => number | null,
  attempts = 8,
  radius = 12,
): { x: number; y: number; z: number } | null {
  const first = validateHarvestPlacement(kind, sampleHeight(x, z), waterLevel);
  if (first !== null) return { x, y: first, z };

  for (let i = 0; i < attempts; i++) {
    const a = (i / attempts) * Math.PI * 2 + Math.random();
    const d = 2 + Math.random() * radius;
    const nx = x + Math.cos(a) * d;
    const nz = z + Math.sin(a) * d;
    const y = validateHarvestPlacement(kind, sampleHeight(nx, nz), waterLevel);
    if (y !== null) return { x: nx, y, z: nz };
  }
  return null;
}
