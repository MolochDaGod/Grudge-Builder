/**
 * TerrainMaterial — multi-layer blended terrain material.
 *
 * Uses Terrain.generateBlendedMaterial() to blend texture layers based on
 * height and slope (Valheim-like automatic biome surfaces). Home islands and
 * world sectors both use multi-layer stacks; sectors pull GroundPBR per biome.
 */
import * as THREE from 'three';
// @ts-ignore
import Terrain from '@/lib/three-terrain/ThreeTerrain.mjs';
import { loadTerrainTextures, loadTerrainTexturesAsync, type TerrainTextures } from './ProceduralTextures';
import {
  createPBRGroundMaterial,
  getSectorGroundMaterialId,
  getSectorLayerMaterials,
} from './GroundPBRTextures';
import type { WorldSector } from '@shared/definitions/worldMapSectors';

export interface TerrainMaterialConfig {
  minHeight?: number;
  maxHeight?: number;
  /** Water / shoreline reference height (terrain local Z). Default 0. */
  waterLevel?: number;
  textures?: TerrainTextures;
}

/**
 * Create the height+slope blended terrain material.
 * Heights are in the terrain's local Z axis (THREE.Terrain rotates the plane -90° on X).
 */
export function createTerrainMaterial(config: TerrainMaterialConfig = {}): THREE.Material {
  const {
    waterLevel = 0,
    textures = loadTerrainTextures(),
  } = config;

  // Heights relative to board land (ocean optional). Blended layers use terrain local Z.
  // Dry board: grass base first — avoid seafloor “fake water” look when ocean is disabled.
  const wl = waterLevel;
  const material = Terrain.generateBlendedMaterial([
    // Layer 0 (base): dirt / lowland grass (board play surface)
    { texture: textures.grassShort },
    // Layer 1: sand / trail — low elevations
    { texture: textures.sand, levels: [wl - 2, wl + 1, wl + 6, wl + 14] },
    // Layer 2: short grass — main board
    { texture: textures.grassShort, levels: [wl + 4, wl + 10, 36, 50] },
    // Layer 3: tall grass / forest floor
    { texture: textures.grassTall, levels: [26, 40, 56, 72] },
    // Layer 4: rock cliffs / mountain triad
    {
      texture: textures.rock,
      glsl: 'slope > 0.7853981633974483 ? 0.2 : 1.0 - smoothstep(0.47123889803846897, 0.7853981633974483, slope) + 0.2',
    },
  ]);

  return material;
}

/**
 * Sector / zone multi-layer terrain — height + slope blend of biome GroundPBR maps.
 * Falls back to single PBR only if layer maps cannot be built.
 */
export function createSectorTerrainMaterial(
  sector: WorldSector,
  options: { waterLevel?: number; minHeight?: number; maxHeight?: number } = {},
): THREE.Material {
  const cfg = sector.terrain3d;
  const wl = options.waterLevel ?? cfg.waterLevel ?? 0;
  const maxH = options.maxHeight ?? cfg.maxHeight ?? 120;
  const minH = options.minHeight ?? cfg.minHeight ?? -40;
  const span = Math.max(20, maxH - minH);

  try {
    const layers = getSectorLayerMaterials(sector);
    // Relative height bands scale with sector vertical range (Valheim-like shore→cliff)
    const lowA = wl - 3;
    const lowB = wl + 1;
    const lowC = wl + Math.max(6, span * 0.08);
    const lowD = wl + Math.max(14, span * 0.14);

    const midA = wl + Math.max(4, span * 0.06);
    const midB = wl + Math.max(12, span * 0.12);
    const midC = wl + Math.max(span * 0.45, 40);
    const midD = wl + Math.max(span * 0.55, 55);

    const highA = wl + Math.max(span * 0.35, 30);
    const highB = wl + Math.max(span * 0.48, 45);
    const highC = wl + Math.max(span * 0.72, 70);
    const highD = wl + Math.max(span * 0.88, 90);

    return Terrain.generateBlendedMaterial([
      { texture: layers.base },
      { texture: layers.low, levels: [lowA, lowB, lowC, lowD] },
      { texture: layers.mid, levels: [midA, midB, midC, midD] },
      { texture: layers.high, levels: [highA, highB, highC, highD] },
      {
        texture: layers.rock,
        // Cliff / steep slope — same thresholds as home blended material (~27°–45°)
        glsl: 'slope > 0.7853981633974483 ? 0.15 : 1.0 - smoothstep(0.47123889803846897, 0.7853981633974483, slope) + 0.15',
      },
    ]);
  } catch (err) {
    console.warn('[Terrain] Multi-layer sector material failed — single PBR fallback', err);
    const materialId = getSectorGroundMaterialId(sector);
    return createPBRGroundMaterial(materialId);
  }
}

/** Home island — async PBR blended layers when textures are deployed */
export async function createTerrainMaterialAsync(
  config: TerrainMaterialConfig = {},
): Promise<THREE.Material> {
  const textures = config.textures ?? await loadTerrainTexturesAsync();
  return createTerrainMaterial({ ...config, textures });
}

/** Sector material that prefers CDN PBR layers when manifest is available */
export async function createSectorTerrainMaterialAsync(
  sector: WorldSector,
  options: { waterLevel?: number; minHeight?: number; maxHeight?: number } = {},
): Promise<THREE.Material> {
  return createSectorTerrainMaterial(sector, options);
}
