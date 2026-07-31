/**
 * safeCharacter — thin SI deploy helper for cinema / airship zones.
 *
 * Wraps fitCharacterRootToHeightM + optional face yaw. Full grudge6 equip/atlas
 * lives in cinemaGrudge6 / characterDeploy; this keeps airship opener building.
 */
import * as THREE from 'three';
import { fitCharacterRootToHeightM } from '@/island3d/zoneWorldScale';

export type SafeDeployOpts = {
  targetHeightM?: number;
  facePlusZ?: boolean | 'auto';
  importPipeline?: string;
  raceId?: string;
};

export type SafeDeployReport = {
  ok: boolean;
  heightM: number;
  scale: number;
  notes: string[];
};

export type SafeDeployResult = {
  root: THREE.Object3D;
  report: SafeDeployReport;
};

/**
 * Fit root to target height (SI metres) and optional art-forward yaw.
 */
export function deploySafeCharacter(
  root: THREE.Object3D,
  opts: SafeDeployOpts = {},
): SafeDeployResult {
  const target = opts.targetHeightM ?? 1.8;
  const notes: string[] = [];
  let scale = 1;
  try {
    scale = fitCharacterRootToHeightM(root, 1.0, target) || 1;
    notes.push(`fit→${target}m scale≈${Number(scale).toFixed?.(4) ?? scale}`);
  } catch (e) {
    notes.push(`fit failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Grudge6 / Toon often face +X; art-forward π/2 so +Z is walk forward
  if (opts.facePlusZ === true || opts.facePlusZ === 'auto') {
    root.rotation.y = Math.PI / 2;
    notes.push('facePlusZ +π/2');
  } else if (opts.facePlusZ === false) {
    notes.push('facePlusZ skipped (mixamo)');
  }

  if (opts.raceId) notes.push(`race=${opts.raceId}`);
  if (opts.importPipeline) notes.push(`pipeline=${opts.importPipeline}`);

  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const heightM = box.getSize(new THREE.Vector3()).y;
  const ok = heightM > target * 0.55 && heightM < target * 1.55;

  return {
    root,
    report: { ok, heightM, scale: typeof scale === 'number' ? scale : 1, notes },
  };
}

export function formatSafeReport(report: SafeDeployReport): string {
  const flag = report.ok ? 'ok' : 'WARN';
  return `[safeCharacter] ${flag} h=${report.heightM.toFixed(2)}m scale=${report.scale.toFixed(4)} · ${report.notes.join(' · ')}`;
}
