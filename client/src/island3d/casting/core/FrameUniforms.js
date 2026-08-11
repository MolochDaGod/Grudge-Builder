import { Vector2 } from 'three';

/**
 * Uniform objects shared by *every* custom material, by identity.
 *
 * Because three.js stores uniforms as `{ value }` boxes, handing the same box to
 * many materials means one write per frame updates all of them. That keeps the
 * per-frame CPU work for dozens of VFX materials down to a handful of
 * assignments instead of a traversal.
 */
export const frame = {
  uTime: { value: 0 },
  uDelta: { value: 0 },
  uResolution: { value: new Vector2(1, 1) },
  /** Packed-RGBA depth of the opaque scene — drives soft particles. */
  uSceneDepth: { value: null },
  uCameraNear: { value: 0.1 },
  uCameraFar: { value: 400 },
  /** Equirectangular HDR used for cheap reflections in custom shaders. */
  uEnvMap: { value: null },
  /** Global multipliers mirrored from settings so shaders can read them. */
  uShaderIntensity: { value: 1 },
  uGlobalGlow: { value: 1 }
};

/** Convenience: the uniform block every VFX material wants. */
export function sharedUniforms(extra = {}) {
  return {
    uTime: frame.uTime,
    uResolution: frame.uResolution,
    uSceneDepth: frame.uSceneDepth,
    uCameraNear: frame.uCameraNear,
    uCameraFar: frame.uCameraFar,
    uShaderIntensity: frame.uShaderIntensity,
    uGlobalGlow: frame.uGlobalGlow,
    ...extra
  };
}
