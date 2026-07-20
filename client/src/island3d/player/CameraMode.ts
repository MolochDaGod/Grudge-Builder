/**
 * CameraMode — WebGL Insights Ch.23 + Grudge play law.
 * Exactly one mode owns camera.position / lookAt per frame.
 */
export type CameraMode =
  | 'play_tps'
  | 'orbit_edit'
  | 'cinematic'
  | 'map';

export function orbitEnabledForMode(mode: CameraMode): boolean {
  return mode === 'orbit_edit' || mode === 'map';
}

export function playCameraActive(mode: CameraMode): boolean {
  return mode === 'play_tps';
}
