/**
 * CinemaMaterialBlend — Three.js custom blending recipes for cinema VFX.
 *
 * Reference: https://threejs.org/examples/webgl_materials_blending_custom.html
 * (CustomBlending + blendSrc/Dst/Equation factors).
 *
 * Goals for LeviathanOceanCinema:
 *  - Soft additive fire / beam (no harsh sphere edges)
 *  - Premultiplied alpha for ring/flame particles (smooth video-grade edges)
 *  - Water / cyclone shells that composite cleanly under post (bloom + ACES)
 *  - Stable renderOrder layers so transparent sort doesn't flicker mid-transition
 *
 * Apply once at material create, or via {@link applyCinemaVfxMaterial} on trees.
 */
import * as THREE from 'three';

/** Named recipes used across intro VFX. */
export type CinemaBlendRecipe =
  | 'opaque'
  | 'alpha' // standard alpha blend (water shells, shields)
  | 'softAlpha' // premultiplied soft edges
  | 'additive' // classic AdditiveBlending (fire, beams)
  | 'softAdditive' // custom SrcAlpha→One with premult (smoother glow)
  | 'screen' // lighten: OneMinusDstColor + One
  | 'multiply'; // darken smoke / wet

/** Consistent transparent layers (higher draws later). */
export const CINEMA_RENDER_ORDER = {
  ocean: 0,
  ship: 1,
  cast: 2,
  rain: 3,
  shield: 4,
  waterFx: 5,
  tornado: 12,
  fireAura: 14,
  beam: 16,
  sparks: 18,
  lightning: 20,
  logo: 30,
} as const;

export type CinemaBlendOpts = {
  recipe: CinemaBlendRecipe;
  /** Optional opacity; leaves existing if omitted */
  opacity?: number;
  /** toneMapped false keeps pure VFX colors under ACES post */
  toneMapped?: boolean;
  /** depthWrite — usually false for VFX */
  depthWrite?: boolean;
  side?: THREE.Side;
  renderOrder?: number;
  fog?: boolean;
};

/**
 * Apply a custom-blend recipe to any Three material (mutates).
 * Safe on MeshBasic / Standard / Points / ShaderMaterial.
 */
export function applyCinemaBlend(
  mat: THREE.Material,
  opts: CinemaBlendOpts,
): THREE.Material {
  const m = mat as THREE.Material & {
    transparent?: boolean;
    opacity?: number;
    blending?: THREE.Blending;
    blendSrc?: THREE.BlendingSrcFactor;
    blendDst?: THREE.BlendingDstFactor;
    blendEquation?: THREE.BlendingEquation;
    blendSrcAlpha?: THREE.BlendingSrcFactor | null;
    blendDstAlpha?: THREE.BlendingDstFactor | null;
    blendEquationAlpha?: THREE.BlendingEquation | null;
    premultipliedAlpha?: boolean;
    depthWrite?: boolean;
    depthTest?: boolean;
    side?: THREE.Side;
    toneMapped?: boolean;
    fog?: boolean;
  };

  m.transparent = opts.recipe !== 'opaque';
  if (opts.opacity != null && typeof m.opacity === 'number') {
    m.opacity = opts.opacity;
  }
  m.depthWrite = opts.depthWrite ?? opts.recipe === 'opaque';
  m.depthTest = true;
  if (opts.side != null) m.side = opts.side;
  if (opts.toneMapped != null && 'toneMapped' in m) m.toneMapped = opts.toneMapped;
  if (opts.fog != null && 'fog' in m) m.fog = opts.fog;

  switch (opts.recipe) {
    case 'opaque':
      m.blending = THREE.NormalBlending;
      m.transparent = false;
      m.premultipliedAlpha = false;
      break;
    case 'alpha':
      // SrcAlpha, OneMinusSrcAlpha — classic water / glass
      m.blending = THREE.CustomBlending;
      m.blendEquation = THREE.AddEquation;
      m.blendSrc = THREE.SrcAlphaFactor;
      m.blendDst = THREE.OneMinusSrcAlphaFactor;
      m.blendSrcAlpha = THREE.OneFactor;
      m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
      m.premultipliedAlpha = false;
      break;
    case 'softAlpha':
      // Premultiplied — smoother particle/ring edges under post
      m.blending = THREE.CustomBlending;
      m.blendEquation = THREE.AddEquation;
      m.blendSrc = THREE.OneFactor;
      m.blendDst = THREE.OneMinusSrcAlphaFactor;
      m.blendSrcAlpha = THREE.OneFactor;
      m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
      m.premultipliedAlpha = true;
      break;
    case 'additive':
      m.blending = THREE.AdditiveBlending;
      m.premultipliedAlpha = false;
      break;
    case 'softAdditive':
      // Custom additive with SrcAlpha source (example: glow without hard fringes)
      m.blending = THREE.CustomBlending;
      m.blendEquation = THREE.AddEquation;
      m.blendSrc = THREE.SrcAlphaFactor;
      m.blendDst = THREE.OneFactor;
      m.blendSrcAlpha = THREE.SrcAlphaFactor;
      m.blendDstAlpha = THREE.OneFactor;
      m.premultipliedAlpha = false;
      break;
    case 'screen':
      // Lighten composite (spark sheets over bright water)
      m.blending = THREE.CustomBlending;
      m.blendEquation = THREE.AddEquation;
      m.blendSrc = THREE.OneMinusDstColorFactor;
      m.blendDst = THREE.OneFactor;
      m.premultipliedAlpha = false;
      break;
    case 'multiply':
      m.blending = THREE.MultiplyBlending;
      m.premultipliedAlpha = false;
      break;
  }

  m.needsUpdate = true;
  return mat;
}

/** Traverse object tree and apply blend recipe to all materials. */
export function applyCinemaVfxMaterial(
  root: THREE.Object3D,
  opts: CinemaBlendOpts,
): void {
  root.traverse((o) => {
    if (opts.renderOrder != null) o.renderOrder = opts.renderOrder;
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh && !(o as THREE.Points).isPoints && !(o as THREE.Line).isLine) {
      return;
    }
    const mats = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];
    for (const mat of mats) {
      if (mat) applyCinemaBlend(mat, opts);
    }
  });
}

/**
 * Smooth opacity toward a target (call each frame).
 * Prevents hard pop when beats toggle VFX visibility.
 */
export function smoothMaterialOpacity(
  mat: THREE.Material | THREE.Material[] | null | undefined,
  target: number,
  dt: number,
  rate = 6,
): void {
  if (!mat) return;
  const list = Array.isArray(mat) ? mat : [mat];
  const k = 1 - Math.exp(-dt * rate);
  for (const m of list) {
    const any = m as THREE.Material & { opacity?: number; transparent?: boolean };
    if (typeof any.opacity !== 'number') continue;
    any.transparent = true;
    any.opacity += (target - any.opacity) * k;
    if (any.opacity < 0.004 && target <= 0) any.opacity = 0;
  }
}

/**
 * Smooth Object3D scale toward uniform target (VFX grow/kill without snap).
 */
export function smoothUniformScale(
  obj: THREE.Object3D,
  target: number,
  dt: number,
  rate = 5,
): void {
  const k = 1 - Math.exp(-dt * rate);
  const s = obj.scale.x + (target - obj.scale.x) * k;
  obj.scale.setScalar(Math.max(1e-4, s));
}

/**
 * Smooth world-position track (stage markers → actors).
 * Avoids awkward teleport when beat locations change.
 */
const _lerpTmp = new THREE.Vector3();
export function smoothWorldPosition(
  obj: THREE.Object3D,
  worldTarget: THREE.Vector3,
  dt: number,
  rate = 3.2,
): void {
  const k = Math.min(1, 1 - Math.exp(-dt * rate));
  obj.getWorldPosition(_lerpTmp);
  // If parented, convert target into parent space
  if (obj.parent) {
    const inv = new THREE.Matrix4().copy(obj.parent.matrixWorld).invert();
    const local = worldTarget.clone().applyMatrix4(inv);
    obj.position.lerp(local, k);
  } else {
    obj.position.lerp(worldTarget, k);
  }
}

/** Renderer setup for clean transparent + post pipeline. */
export function configureCinemaRendererBlending(renderer: THREE.WebGLRenderer): void {
  // Post owns AA; keep buffer ready for soft alpha
  renderer.sortObjects = true;
  // Do not auto-clear alpha oddly with composer
  renderer.autoClear = true;
}
