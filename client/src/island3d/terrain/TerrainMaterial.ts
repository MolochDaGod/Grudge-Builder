/**
 * TerrainMaterial — multi-layer blended terrain material.
 *
 * Uses Terrain.generateBlendedMaterial() to blend 5 texture layers based on
 * height and slope, giving automatic biome-aware rendering.
 */
import * as THREE from 'three';
// @ts-ignore
import Terrain from '@/lib/three-terrain/ThreeTerrain.mjs';
import { loadTerrainTextures, type TerrainTextures } from './ProceduralTextures';

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

  // The blended material uses vPosition.z for height (in terrain local space)
  // and `slope` (angle from vertical in radians) for cliff detection.
  const material = Terrain.generateBlendedMaterial([
    // Layer 0 (base): seafloor under the ocean plane — NOT a water surface
    { texture: textures.seafloor },
    // Layer 1: sand/beach — appears between -10 and +8 height
    { texture: textures.sand, levels: [-10, -2, 5, 12] },
    // Layer 2: short grass — main island surface
    { texture: textures.grassShort, levels: [8, 15, 40, 55] },
    // Layer 3: tall grass/forest — higher inland areas
    { texture: textures.grassTall, levels: [30, 45, 60, 70] },
    // Layer 4: rock — steep slopes regardless of height
    {
      texture: textures.rock,
      glsl: 'slope > 0.7853981633974483 ? 0.2 : 1.0 - smoothstep(0.47123889803846897, 0.7853981633974483, slope) + 0.2',
    },
  ]);

  return material;
}
