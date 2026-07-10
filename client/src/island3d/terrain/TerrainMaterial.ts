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

  // Heights relative to board land (ocean optional). Blended layers use terrain local Z.
  // Dry board: grass base first — avoid seafloor “fake water” look when ocean is disabled.
  const wl = 0;
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
