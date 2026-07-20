/**
 * Zone / home-island scale calibration.
 * Character reference = 2.0m (CHARACTER_REFERENCE_HEIGHT_M in homeIslandSpec).
 * Trees/rocks need upscale on large sectors; wildlife GLBs are often oversized.
 *
 * Grudge6 / Synty D1 kits frequently ship with:
 *  - Bip001 scale ~0.0254 (inches→m), OR
 *  - raw cm vertices (~30–100 units tall) with root scale lost
 * Always fit visible body to PLAYER_HEIGHT_M so heroes are never 100× giants.
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

/** Above this measured height we treat the mesh as unbaked (cm-as-m). */
const OVERSIZED_MESH_M = 3.5;

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

function isBodyMeasureMesh(node: THREE.Object3D): boolean {
  const mesh = node as THREE.Mesh & { isSkinnedMesh?: boolean };
  if (!mesh.isMesh && !mesh.isSkinnedMesh) return false;
  if (mesh.visible === false) return false;
  const n = (mesh.name || '').toLowerCase();
  // Ignore weapon / accessory soup when measuring humanoid height
  if (/weapon_|_shield_|xtra_|quiver|pick_|wood_|bag/.test(n)) return false;
  return true;
}

/**
 * World-space height from visible body skinned-mesh vertices (on-screen truth).
 * Skinned bind geometry can be 30–100× target when root/Bip001 scale is lost.
 */
export function measureCharacterWorldHeight(root: THREE.Object3D): number {
  root.updateMatrixWorld(true);
  let minY = Infinity;
  let maxY = -Infinity;
  let samples = 0;

  root.traverse((node) => {
    if (!isBodyMeasureMesh(node)) return;
    const mesh = node as THREE.Mesh;
    const pos = mesh.geometry?.attributes?.position as THREE.BufferAttribute | undefined;
    if (!pos) return;
    const m = mesh.matrixWorld.elements;
    const step = Math.max(1, Math.floor(pos.count / 500));
    for (let i = 0; i < pos.count; i += step) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const wy = m[1] * x + m[5] * y + m[9] * z + m[13];
      minY = Math.min(minY, wy);
      maxY = Math.max(maxY, wy);
      samples++;
    }
  });

  if (!samples || !Number.isFinite(minY)) {
    // Fallback: full object box (includes all children)
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) return 0;
    return Math.max(box.max.y - box.min.y, 0);
  }
  return maxY - minY;
}

/**
 * Fit a character GLB root to ~2m (× race mult) and plant feet at y=0 of the root.
 * Returns the uniform scale applied.
 *
 * Handles:
 *  - Correct grudge6 kits (Bip001 ×0.0254 → ~1.8m)
 *  - Unbaked arena kits (raw verts ~30–70 units → 100× giants without this)
 */
export function fitCharacterRootToHeightM(
  root: THREE.Object3D,
  raceScaleMult = 1,
  targetBaseHeightM = PLAYER_HEIGHT_M,
): number {
  // Reset only the outer scale we control; leave internal Bip001/export scales alone.
  root.scale.setScalar(1);
  root.position.set(0, 0, 0);
  root.updateMatrixWorld(true);

  let meshH = measureCharacterWorldHeight(root);

  // Box fallback when vertex sample failed
  if (meshH < 1e-4) {
    const box = new THREE.Box3().setFromObject(root);
    meshH = Math.max(box.max.y - box.min.y, 1e-3);
  }

  const targetH = Math.max(0.5, targetBaseHeightM * (raceScaleMult > 0 ? raceScaleMult : 1));
  let s = fitMeshHeightToMeters(meshH, targetH);

  // Safety: if still absurd after first pass, force another correction
  root.scale.setScalar(s);
  root.updateMatrixWorld(true);
  let afterH = measureCharacterWorldHeight(root);
  if (afterH > OVERSIZED_MESH_M || afterH > targetH * 1.4) {
    const fix = targetH / Math.max(afterH, 1e-3);
    s *= fix;
    root.scale.setScalar(s);
    root.updateMatrixWorld(true);
    afterH = measureCharacterWorldHeight(root);
  }

  // Clamp pathologically tiny/huge scales (broken measurement)
  if (!Number.isFinite(s) || s < 0.004 || s > 8) {
    // Last resort: Synty cm→m (~0.01) × race
    s = 0.01 * (raceScaleMult > 0 ? raceScaleMult : 1) * (targetBaseHeightM / 1.75);
    root.scale.setScalar(s);
    root.updateMatrixWorld(true);
  }

  const box2 = new THREE.Box3().setFromObject(root);
  // Feet on parent origin (board square / terrain contact)
  if (Number.isFinite(box2.min.y)) {
    root.position.y -= box2.min.y;
  }
  // Center XZ on tile/square
  if (Number.isFinite(box2.min.x) && Number.isFinite(box2.max.x)) {
    const cx = (box2.min.x + box2.max.x) / 2;
    const cz = (box2.min.z + box2.max.z) / 2;
    root.position.x -= cx;
    root.position.z -= cz;
  }

  root.userData.characterScale = {
    targetHeight: targetH,
    measuredBefore: meshH,
    measuredAfter: afterH,
    appliedScale: s,
    raceScaleMult,
  };

  return s;
}
