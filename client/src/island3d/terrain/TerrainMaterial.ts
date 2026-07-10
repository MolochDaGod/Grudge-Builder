/**
 * TerrainMaterial — multi-layer blended terrain material.
 *
 * Uses Terrain.generateBlendedMaterial() to blend 5 texture layers based on
 * height and slope, giving automatic biome-aware rendering.
 */
import * as THREE from 'three';
// @ts-ignore
import Terrain from '@/lib/three-terrain/ThreeTerrain.mjs';
import { loadTerrainTextures, loadTerrainTexturesAsync, type TerrainTextures } from './ProceduralTextures';
import { createPBRGroundMaterial, getSectorGroundMaterialId } from './GroundPBRTextures';
import type { WorldSector } from '@shared/definitions/worldMapSectors';

export interface TerrainMaterialConfig {
  minHeight?: number;
  maxHeight?: number;
  textures?: TerrainTextures;
}

/**
 * Create the height+slope blended terrain material.
 * Heights are in the terrain's local Z axis (THREE.Terrain rotates the plane -90° on X).
 */
export function createTerrainMaterial(config: TerrainMaterialConfig = {}): THREE.Material {
  const {
    minHeight = -30,
    maxHeight = 80,
    textures = loadTerrainTextures(),
  } = config;

  // Heights relative to waterline ≈ 0 (flattenTerrainBelowWater removes submerged verts).
  // The blended material uses vPosition.z for height (terrain local space)
  // and `slope` for cliff detection.
  const wl = 0; // canonical water level for layer bands
  const material = Terrain.generateBlendedMaterial([
    // Layer 0 (base): deep seafloor only — never a second water surface
    { texture: textures.seafloor },
    // Layer 1: sand/beach tight to the single waterline
    { texture: textures.sand, levels: [wl - 4, wl - 0.5, wl + 4, wl + 10] },
    // Layer 2: short grass — main island surface
    { texture: textures.grassShort, levels: [wl + 6, wl + 12, 38, 52] },
    // Layer 3: tall grass/forest — higher inland areas
    { texture: textures.grassTall, levels: [28, 42, 58, 70] },
    // Layer 4: rock — steep slopes regardless of height
    {
      texture: textures.rock,
      glsl: 'slope > 0.7853981633974483 ? 0.2 : 1.0 - smoothstep(0.47123889803846897, 0.7853981633974483, slope) + 0.2',
    },
  ]);

  return material;
}

/** Sector zone terrain — single PBR ground material per world sector */
export function createSectorTerrainMaterial(sector: WorldSector): THREE.Material {
  const materialId = getSectorGroundMaterialId(sector);
  return createPBRGroundMaterial(materialId);
}

/** Home island — async PBR blended layers when textures are deployed */
export async function createTerrainMaterialAsync(
  config: TerrainMaterialConfig = {},
): Promise<THREE.Material> {
  const textures = config.textures ?? await loadTerrainTexturesAsync();
  return createTerrainMaterial({ ...config, textures });
}
