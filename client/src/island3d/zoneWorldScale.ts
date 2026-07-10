/**
 * Zone / home-island scale calibration.
 * Character reference = 2.0m (CHARACTER_REFERENCE_HEIGHT_M in homeIslandSpec).
 * Trees/rocks need upscale on large sectors; wildlife GLBs are often oversized.
 */
import * as THREE from 'three';
import { CHARACTER_REFERENCE_HEIGHT_M } from '@shared/definitions/homeIslandSpec';

export { CHARACTER_REFERENCE_HEIGHT_M };

/** Human-scale player capsule / race GLB target height (meters). */
export const PLAYER_HEIGHT_M = CHARACTER_REFERENCE_HEIGHT_M;

export const TREE_TERRAIN_SCALE = 3;
export const ROCK_TERRAIN_SCALE = 3;
/**
 * Multiply CreatureManifest.scale by this so animals sit correctly vs 2m heroes.
 * Tune only after measuring CDN GLB bound heights.
 */
export const WILDLIFE_SIZE_FACTOR = 0.65;

export function calibrateHarvestScale(profession: string, tier: number): number {
  const base = 0.75 + tier * 0.08;
  if (profession === 'woodcutting') return base * TREE_TERRAIN_SCALE;
  if (profession === 'mining') return base * ROCK_TERRAIN_SCALE;
  return base;
}

/** Scale a prop so its vertical extent matches targetHeightM (post-load bbox). */
export function fitMeshHeightToMeters(
  meshHeightModelUnits: number,
  targetHeightM: number,
): number {
  if (meshHeightModelUnits <= 1e-6) return 1;
  return targetHeightM / meshHeightModelUnits;
}

/**
 * Fit a character GLB root to ~2m (× race mult) and plant feet at y=0 of the root.
 * Returns the uniform scale applied.
 *
 * Race GLBs often use wrong authoring units; applying only modelManifest.scale
 * leaves heroes giant, off their board tile, and looking T-pose-tall.
 */
export function fitCharacterRootToHeightM(
  root: THREE.Object3D,
  raceScaleMult = 1,
  targetBaseHeightM = PLAYER_HEIGHT_M,
): number {
  root.scale.setScalar(1);
  root.position.set(0, 0, 0);
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const meshH = Math.max(box.max.y - box.min.y, 1e-3);
  const targetH = Math.max(0.5, targetBaseHeightM * (raceScaleMult > 0 ? raceScaleMult : 1));
  const s = fitMeshHeightToMeters(meshH, targetH);
  root.scale.setScalar(s);
  root.updateMatrixWorld(true);

  const box2 = new THREE.Box3().setFromObject(root);
  // Feet on parent origin (board square / terrain contact)
  root.position.y -= box2.min.y;
  // Center XZ on tile/square
  const cx = (box2.min.x + box2.max.x) / 2;
  const cz = (box2.min.z + box2.max.z) / 2;
  root.position.x -= cx;
  root.position.z -= cz;

  return s;
}