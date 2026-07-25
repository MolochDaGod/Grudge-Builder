/**
 * Zone / home-island SI scale SSOT (grudge-world-scale + character-correctness).
 *
 * HARD RULES:
 *  - 1 Three.js unit = 1 metre
 *  - HUMAN_HEIGHT_M = 1.8 is the yardstick (adult human)
 *  - Unit decade (10× / 100× / 1000×) is UNCLAMPED — never block 0.01 fix
 *  - Never fit weapons / buildings / boats to 1.8 m
 *  - Heroes only: fit visible body skinned meshes to ~1.8 m × race mult
 *
 * Classic 100× giant = cm authored as m (measured ~180 when target is 1.8).
 */
import * as THREE from 'three';
import { CHARACTER_REFERENCE_HEIGHT_M } from '@shared/definitions/homeIslandSpec';

export { CHARACTER_REFERENCE_HEIGHT_M };

/** SSOT adult human height (metres). Capsule / camera may use 2.0 for padding. */
export const HUMAN_HEIGHT_M = 1.8;

/**
 * Target height for hero fit. Prefer HUMAN_HEIGHT_M; home-island board still
 * documents 2.0 as visual “cell” reference — we fit to 1.8 then race mult.
 */
export const PLAYER_HEIGHT_M = HUMAN_HEIGHT_M;

/** Race mult must stay near 1 — DB/model3d scale:100 is a known 100× poison. */
export const RACE_SCALE_MULT_MIN = 0.7;
export const RACE_SCALE_MULT_MAX = 1.35;

export const TREE_TERRAIN_SCALE = 3;
export const ROCK_TERRAIN_SCALE = 3;
export const WILDLIFE_SIZE_FACTOR = 0.65;

/** Props/buildings: never use hero fit. Bands in metres (× human). */
export const WORLD_PROP_HEIGHT_BANDS = {
  rock: { min: 0.4, max: 4.5, default: 1.8 },
  tree: { min: 3, max: 14, default: 7 },
  tower: { min: 12, max: 80, default: 28 },
  fortress: { min: 20, max: 120, default: 45 },
  building: { min: 3, max: 20, default: 6 },
  prop: { min: 0.2, max: 3, default: 1 },
} as const;

export type WorldPropKind = keyof typeof WORLD_PROP_HEIGHT_BANDS;

export function calibrateHarvestScale(profession: string, tier: number): number {
  const base = 0.75 + tier * 0.08;
  if (profession === 'woodcutting') return base * TREE_TERRAIN_SCALE;
  if (profession === 'mining') return base * ROCK_TERRAIN_SCALE;
  return base;
}

export function fitMeshHeightToMeters(
  meshHeightModelUnits: number,
  targetHeightM: number,
): number {
  if (meshHeightModelUnits <= 1e-6) return 1;
  return targetHeightM / meshHeightModelUnits;
}

/**
 * Detect classic unit-decade errors. Returns scale factor to apply (UNCLAMPED).
 * measured / target ≈ 100 → cm-as-m → ×0.01
 */
export function unitDecadeFactor(measuredM: number, targetM: number): number {
  if (!(measuredM > 1e-8) || !(targetM > 1e-8)) return 1;
  const r = measuredM / targetM;
  // 1000× (mm as m)
  if (r > 400 && r < 4000) return 0.001;
  // 100× large (cm as m) — THE classic bug
  if (r > 35 && r < 400) return 0.01;
  // 10× large
  if (r > 6 && r < 25) return 0.1;
  // 100× small
  if (r > 0.0015 && r < 0.045) return 100;
  // 10× small
  if (r > 0.04 && r < 0.25) return 10;
  return 1;
}

/** Clamp race height multiplier — rejects stored scale:100 poison. */
export function sanitizeRaceScaleMult(raw: number | undefined | null): number {
  const n = typeof raw === 'number' && Number.isFinite(raw) ? raw : 1;
  if (n > 5 || n < 0.2) {
    // Almost certainly unit error or corrupt DB field
    console.warn(
      `[zoneWorldScale] raceScaleMult=${n} rejected (expected ~0.7–1.35) — using 1.0`,
    );
    return 1;
  }
  return Math.min(RACE_SCALE_MULT_MAX, Math.max(RACE_SCALE_MULT_MIN, n));
}

function isBodyMeasureMesh(node: THREE.Object3D): boolean {
  const mesh = node as THREE.Mesh & { isSkinnedMesh?: boolean };
  if (!mesh.isMesh && !mesh.isSkinnedMesh) return false;
  if (mesh.visible === false) return false;
  const n = (mesh.name || '').toLowerCase();
  if (/weapon_|_shield_|xtra_|quiver|pick_|wood_|bag|fx_|vfx_|particle/.test(n)) {
    return false;
  }
  return true;
}

/**
 * World-space height from visible body meshes (on-screen truth).
 * Prefer skinned body verts; ignore weapons.
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
    const step = Math.max(1, Math.floor(pos.count / 600));
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
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) return 0;
    return Math.max(box.max.y - box.min.y, 0);
  }
  return maxY - minY;
}

export function measureObjectWorldHeight(root: THREE.Object3D): number {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) return 0;
  return Math.max(box.max.y - box.min.y, 0);
}

export interface CharacterScaleReport {
  targetHeight: number;
  measuredBefore: number;
  measuredAfter: number;
  unitDecade: number;
  residualFit: number;
  appliedScale: number;
  raceScaleMult: number;
  ok: boolean;
  diagnosis: 'ok' | 'x100_fixed' | 'x10_fixed' | 'forced' | 'fail';
}

/**
 * Fit a character GLB root to ~1.8 m × race mult and plant feet at local y=0.
 *
 * Order (mandatory):
 *  1. root.scale = 1
 *  2. measure
 *  3. unit decade UNCLAMPED (0.01 for classic 100×)
 *  4. residual aesthetic fit (only residual clamped 1/12…12)
 *  5. ground feet + center XZ
 */
export function fitCharacterRootToHeightM(
  root: THREE.Object3D,
  raceScaleMult = 1,
  targetBaseHeightM = PLAYER_HEIGHT_M,
): number {
  const raceMult = sanitizeRaceScaleMult(raceScaleMult);
  const targetH = Math.max(1.2, targetBaseHeightM * raceMult);

  root.scale.setScalar(1);
  root.position.set(0, 0, 0);
  root.updateMatrixWorld(true);

  let meshH = measureCharacterWorldHeight(root);
  if (meshH < 1e-4) {
    meshH = Math.max(measureObjectWorldHeight(root), 1e-3);
  }

  const decade = unitDecadeFactor(meshH, targetH);
  let s = decade;
  root.scale.setScalar(s);
  root.updateMatrixWorld(true);

  let afterDecade = measureCharacterWorldHeight(root);
  if (afterDecade < 1e-4) afterDecade = Math.max(measureObjectWorldHeight(root), 1e-3);

  // Residual fit only — clamp residual, NEVER the unit decade
  let residual = targetH / Math.max(afterDecade, 1e-6);
  const RES_MIN = 1 / 12;
  const RES_MAX = 12;
  if (residual < RES_MIN || residual > RES_MAX) {
    // Measurement still broken — force pure decade toward target once more
    console.warn(
      `[zoneWorldScale] residual fit ${residual.toFixed(3)} outside [${RES_MIN},${RES_MAX}] — re-measure`,
      { meshH, afterDecade, targetH, decade },
    );
    residual = Math.min(RES_MAX, Math.max(RES_MIN, residual));
  }
  s *= residual;
  root.scale.setScalar(s);
  root.updateMatrixWorld(true);

  let afterH = measureCharacterWorldHeight(root);
  if (afterH < 1e-4) afterH = measureObjectWorldHeight(root);

  // Final gate: hero must land in [1.35, 2.35] m (± race)
  const lo = targetH * 0.72;
  const hi = targetH * 1.28;
  if (afterH > hi || afterH < lo) {
    const force = targetH / Math.max(afterH, 1e-6);
    s *= force;
    root.scale.setScalar(s);
    root.updateMatrixWorld(true);
    afterH = measureCharacterWorldHeight(root) || measureObjectWorldHeight(root);
    console.warn(
      `[zoneWorldScale] forced re-fit scale*=${force.toFixed(4)} → h=${afterH.toFixed(3)}m`,
    );
  }

  if (!Number.isFinite(s) || s <= 0) {
    // Absolute last resort: classic Synty cm→m
    s = 0.01 * raceMult * (targetBaseHeightM / HUMAN_HEIGHT_M);
    root.scale.setScalar(s);
    root.updateMatrixWorld(true);
    afterH = measureCharacterWorldHeight(root) || measureObjectWorldHeight(root);
  }

  groundAndCenterRoot(root);

  const ok = afterH >= lo * 0.9 && afterH <= hi * 1.15;
  const diagnosis: CharacterScaleReport['diagnosis'] =
    !ok ? 'fail'
      : decade === 0.01 || decade === 0.001 ? 'x100_fixed'
        : decade === 0.1 || decade === 10 ? 'x10_fixed'
          : decade !== 1 ? 'forced'
            : 'ok';

  const report: CharacterScaleReport = {
    targetHeight: targetH,
    measuredBefore: meshH,
    measuredAfter: afterH,
    unitDecade: decade,
    residualFit: residual,
    appliedScale: s,
    raceScaleMult: raceMult,
    ok,
    diagnosis,
  };
  root.userData.characterScale = report;

  if (!ok) {
    console.error('[zoneWorldScale] CHARACTER SCALE STILL WRONG', report);
  } else if (diagnosis !== 'ok') {
    console.info('[zoneWorldScale] character scale corrected', report);
  }

  return s;
}

/** Re-run fit after first AnimationMixer sample (pose can change bbox). */
export function reFitCharacterAfterAnimSample(
  root: THREE.Object3D,
  raceScaleMult = 1,
  targetBaseHeightM = PLAYER_HEIGHT_M,
): number {
  return fitCharacterRootToHeightM(root, raceScaleMult, targetBaseHeightM);
}

function groundAndCenterRoot(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (Number.isFinite(box.min.y)) {
    root.position.y -= box.min.y;
  }
  if (Number.isFinite(box.min.x) && Number.isFinite(box.max.x)) {
    const cx = (box.min.x + box.max.x) / 2;
    const cz = (box.min.z + box.max.z) / 2;
    root.position.x -= cx;
    root.position.z -= cz;
  }
  root.updateMatrixWorld(true);
}

/**
 * Fit world props (tower / rock / tree / fortress) to a target height band.
 * Does NOT use hero 1.8 as default for towers.
 */
export function fitWorldPropToHeightM(
  root: THREE.Object3D,
  kind: WorldPropKind,
  targetHeightM?: number,
): number {
  const band = WORLD_PROP_HEIGHT_BANDS[kind] ?? WORLD_PROP_HEIGHT_BANDS.prop;
  const target = targetHeightM ?? band.default;

  root.scale.setScalar(1);
  root.position.set(0, 0, 0);
  root.updateMatrixWorld(true);

  let h = measureObjectWorldHeight(root);
  if (h < 1e-4) return 1;

  const decade = unitDecadeFactor(h, target);
  root.scale.setScalar(decade);
  root.updateMatrixWorld(true);
  h = measureObjectWorldHeight(root);

  let s = decade * (target / Math.max(h, 1e-6));
  // Soft clamp only residual total into band-ish
  root.scale.setScalar(s);
  root.updateMatrixWorld(true);
  h = measureObjectWorldHeight(root);
  if (h > band.max) {
    s *= band.max / h;
    root.scale.setScalar(s);
  } else if (h < band.min * 0.5) {
    s *= (band.min * 0.5) / Math.max(h, 1e-6);
    root.scale.setScalar(s);
  }

  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (Number.isFinite(box.min.y)) root.position.y -= box.min.y;

  root.userData.worldPropScale = {
    kind,
    target,
    appliedScale: s,
    heightAfter: measureObjectWorldHeight(root),
  };
  return s;
}

/** Axis-aligned collider from object (world space). */
export function boxColliderFromObject(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(root);
}
