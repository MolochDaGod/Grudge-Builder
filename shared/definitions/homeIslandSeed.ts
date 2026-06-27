/**
 * Home Island Seed Contract — shared between Railway (SSOT), Warlords 3D,
 * and RTS-Grudge export. Deterministic from UUID/text seed.
 */

import type { DungeonDefinition } from "./lore";
import { DUNGEON_DEFINITIONS } from "./lore";

/** Canonical 3D home island diameter in world meters (Island3DEngine). */
export const HOME_ISLAND_WORLD_SIZE_M = 1024;

/** RTS procedural island diameter (useIslandWorld / IslandGenerator). */
export const HOME_ISLAND_RTS_SIZE_M = 200;

/** Evil mountain triad occupies 10% of island world size. */
export const MOUNTAIN_TRIAD_ISLAND_FRACTION = 0.1;

/** Walkable dungeon mouth target height in meters. */
export const DUNGEON_ENTRANCE_HEIGHT_M = 4;

/** Sketchfab: 3 Evil Rock Mountains with Cave (Stylized) — CC-BY Jungle Jim */
export const SKETCHFAB_EVIL_MOUNTAIN_TRIAD = {
  uid: "c41cba36d5dd48b1a07241c353689709",
  shortUrl: "https://skfb.ly/pK9V9",
  viewerUrl:
    "https://sketchfab.com/3d-models/3-evil-rock-mountains-with-cave-stylized-c41cba36d5dd48b1a07241c353689709",
  name: "3 Evil Rock Mountains with Cave (Stylized)",
  author: "Jungle Jim",
  license: "CC-BY-4.0",
  peakCount: 3,
  /** CDN + local fallback path (combined triad) */
  modelPath: "/models/evil_rock_mountains_triad.glb",
  legacyModelPath: "/models/evil_rock_mountains_cave.glb",
} as const;

/** Per-peak GLBs split from triad (Mountain2, Mountain1, Mountain3+ladder). */
export const MOUNTAIN_TRIAD_PEAK_MODEL_PATHS = [
  "/models/evil_rock_mountain_peak_0.glb",
  "/models/evil_rock_mountain_peak_1.glb",
  "/models/evil_rock_mountain_peak_2.glb",
] as const;

export const HOME_ISLAND_ZONE_TYPES = [
  "mountain",
  "forest",
  "field",
  "shore",
  "water",
  "clearing",
] as const;

export type HomeIslandZoneType = (typeof HOME_ISLAND_ZONE_TYPES)[number];

export interface HomeIslandTerrainZoneSeed {
  type: HomeIslandZoneType;
  bounds: { x: number; y: number; width: number; height: number };
}

/** Local offsets (meters) from triad anchor to each peak's cave mouth — model layout. */
export const MOUNTAIN_TRIAD_PEAK_OFFSETS_M: ReadonlyArray<{ x: number; z: number }> = [
  { x: -55, z: 0 },
  { x: 0, z: 0 },
  { x: 55, z: 0 },
];

export interface MountainTriadSeed {
  secretPeakIndex: 0 | 1 | 2;
  /** Percent coords on 100×100 logical map (north = low y). */
  anchorPercent: { x: number; y: number };
  /** World-space triad footprint = islandSize × 0.10 */
  mountainScaleM: number;
  entranceHeightM: number;
  islandWorldSizeM: number;
  dungeonId: string;
  modelUid: string;
  modelPath: string;
  /** Per-peak CDN paths (preferred over combined triad GLB). */
  peakModelPaths: string[];
  peakOffsetsM: Array<{ x: number; z: number }>;
}

export function hashSeedString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  }
  return h;
}

export function seededRandomFromString(seed: string): () => number {
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = ((state << 5) - state) + seed.charCodeAt(i);
    state &= state;
  }
  state = Math.abs(state) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return (state >>> 0) / 0x100000000;
  };
}

export function pickHomeIslandDungeonFromSeed(seed: string): DungeonDefinition {
  const eligible = DUNGEON_DEFINITIONS.filter((d) => d.type === "cave" || d.type === "ruins");
  const idx = hashSeedString(`${seed}_home_dungeon`) % eligible.length;
  return eligible[idx] ?? DUNGEON_DEFINITIONS[0];
}

export function computeMountainTriadScaleM(islandWorldSizeM: number): number {
  return islandWorldSizeM * MOUNTAIN_TRIAD_ISLAND_FRACTION;
}

/**
 * Deterministic mountain triad placement for a home island seed.
 * One of three Sketchfab peaks hides the active dungeon portal.
 */
export function generateMountainTriadSeed(
  seed: string,
  islandWorldSizeM: number = HOME_ISLAND_WORLD_SIZE_M,
): MountainTriadSeed {
  const rng = seededRandomFromString(`${seed}_mountain_triad`);
  const secretPeakIndex = (hashSeedString(`${seed}_secret_peak`) % 3) as 0 | 1 | 2;
  const dungeon = pickHomeIslandDungeonFromSeed(seed);
  const mountainScaleM = computeMountainTriadScaleM(islandWorldSizeM);

  // Northern mountain belt on 100×100 logical map
  const anchorPercent = {
    x: 48 + rng() * 8,
    y: 8 + rng() * 10,
  };

  const peakScale = mountainScaleM / computeMountainTriadScaleM(HOME_ISLAND_WORLD_SIZE_M);
  const peakOffsetsM = MOUNTAIN_TRIAD_PEAK_OFFSETS_M.map((o) => ({
    x: o.x * peakScale,
    z: o.z * peakScale,
  }));

  return {
    secretPeakIndex,
    anchorPercent,
    mountainScaleM,
    entranceHeightM: DUNGEON_ENTRANCE_HEIGHT_M,
    islandWorldSizeM,
    dungeonId: dungeon.id,
    modelUid: SKETCHFAB_EVIL_MOUNTAIN_TRIAD.uid,
    modelPath: SKETCHFAB_EVIL_MOUNTAIN_TRIAD.modelPath,
    peakModelPaths: [...MOUNTAIN_TRIAD_PEAK_MODEL_PATHS],
    peakOffsetsM,
  };
}

/** Convert percent anchor to world XZ on a square island terrain. */
export function anchorPercentToWorld(
  anchorPercent: { x: number; y: number },
  terrainSizeM: number,
): { x: number; z: number } {
  const x = (anchorPercent.x / 100 - 0.5) * terrainSizeM;
  const z = (anchorPercent.y / 100 - 0.5) * terrainSizeM;
  return { x, z };
}

/**
 * Scale a loaded GLB so the triad spans `mountainScaleM` on its largest horizontal axis,
 * then optionally boost so cave mouth height ≈ `entranceHeightM`.
 */
export function computeGlbTriadScale(
  modelHeightM: number,
  modelWidthM: number,
  mountainScaleM: number,
  entranceHeightM: number = DUNGEON_ENTRANCE_HEIGHT_M,
): number {
  const span = Math.max(modelWidthM, modelHeightM, 0.001);
  const baseScale = mountainScaleM / span;
  const entranceBoost = entranceHeightM / Math.max(modelHeightM * 0.22, 0.5);
  return baseScale * Math.min(Math.max(entranceBoost / baseScale, 0.85), 1.15);
}