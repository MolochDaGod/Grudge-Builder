/**
 * DragonKoiCastAura — multipack dragon_koi.glb as surrounding cast FX.
 *
 * - One GLB template (cached), many color / opacity / shader skins
 * - Spawns around caster for cast duration; ends on cast finished / cancel
 * - Plays embedded Animation loop while active; fades out on finish
 */

import * as THREE from 'three';
import {
  DRAGON_KOI_CDN_URL,
  DRAGON_KOI_LOCAL_PATH,
  DRAGON_KOI_VARIANTS,
  dragonKoiCastDurationSec,
  resolveDragonKoiVariant,
  type DragonKoiShaderMode,
  type DragonKoiVariantDef,
  type DragonKoiVariantId,
} from '@shared/definitions/dragonKoiCastVfx';
import { loadGltfCached, cloneGltfScene } from '@/lib/three/SharedGltfPipeline';
import { ASSET_CDN_BASE } from '@/lib/assetConfig';

export interface DragonKoiCastOpts {
  /** World anchor (usually player root / feet). Updated each frame if Object3D. */
  attachTo?: THREE.Object3D;
  position?: THREE.Vector3;
  variant?: DragonKoiVariantId | string;
  school?: string;
  damageType?: string;
  skillId?: string;
  vfxKey?: string;
  animKey?: string;
  /** Override duration seconds; default windup+active+recovery */
  durationSec?: number;
  windup?: number;
  active?: number;
  recovery?: number;
  castTimeSec?: number;
  scale?: number;
  /** Token so newer casts cancel older ones */
  castToken?: number;
}

type MatBag = {
  mat: THREE.Material;
  baseOpacity: number;
  isStandard: boolean;
};

type ActiveAura = {
  root: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  mats: MatBag[];
  def: DragonKoiVariantDef;
  age: number;
  duration: number;
  angle: number;
  attachTo: THREE.Object3D | null;
  holdPos: THREE.Vector3;
  castToken: number;
  fading: boolean;
  fadeT: number;
};

const FADE_OUT = 0.28;
const _tmp = new THREE.Vector3();

function hexToColor(hex: number): THREE.Color {
  return new THREE.Color(hex);
}

/**
 * Apply cast-skin materials: different opaque, tint, emissive, blend mode.
 * Clones materials so skins don't fight each other.
 */
export function applyDragonKoiSkin(
  root: THREE.Object3D,
  def: DragonKoiVariantDef,
): MatBag[] {
  const color = hexToColor(def.color);
  const emissive = hexToColor(def.emissive);
  const mats: MatBag[] = [];

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;

    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const next: THREE.Material[] = [];

    for (const src of list) {
      const mat = src.clone();
      mat.transparent = true;
      mat.depthWrite = def.shader !== 'additive_glow';
      mat.side = THREE.DoubleSide;

      const baseOpacity = def.opacity;
      applyShaderMode(mat, def.shader, color, emissive, def.emissiveIntensity, baseOpacity);
      mat.needsUpdate = true;
      next.push(mat);
      mats.push({
        mat,
        baseOpacity,
        isStandard:
          (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial === true
          || (mat as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial === true,
      });
    }
    mesh.material = next.length === 1 ? next[0]! : next;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
  });

  return mats;
}

function applyShaderMode(
  mat: THREE.Material,
  mode: DragonKoiShaderMode,
  color: THREE.Color,
  emissive: THREE.Color,
  emissiveIntensity: number,
  opacity: number,
): void {
  const any = mat as THREE.MeshStandardMaterial & {
    color?: THREE.Color;
    emissive?: THREE.Color;
    emissiveIntensity?: number;
    opacity?: number;
    blending?: THREE.Blending;
    alphaTest?: number;
    map?: THREE.Texture | null;
    emissiveMap?: THREE.Texture | null;
  };

  if (any.color) any.color.copy(color);
  if (any.emissive) any.emissive.copy(emissive);
  if (typeof any.emissiveIntensity === 'number') {
    any.emissiveIntensity = emissiveIntensity;
  }
  any.opacity = opacity;

  // Keep texture maps when present — tint multiplies; this is how one GLB
  // becomes many cast looks without rebaking atlases.
  switch (mode) {
    case 'additive_glow':
      any.blending = THREE.AdditiveBlending;
      any.depthWrite = false;
      any.opacity = Math.min(1, opacity * 1.05);
      if (typeof any.emissiveIntensity === 'number') {
        any.emissiveIntensity = emissiveIntensity * 1.25;
      }
      break;
    case 'soft_blend':
      any.blending = THREE.NormalBlending;
      any.depthWrite = false;
      any.opacity = opacity * 0.9;
      if (typeof any.emissiveIntensity === 'number') {
        any.emissiveIntensity = emissiveIntensity * 0.85;
      }
      break;
    case 'emissive_toon':
      any.blending = THREE.NormalBlending;
      any.depthWrite = true;
      any.opacity = Math.min(0.92, opacity + 0.15);
      if (typeof any.emissiveIntensity === 'number') {
        any.emissiveIntensity = emissiveIntensity * 1.5;
      }
      break;
    case 'ghost_mask':
      any.blending = THREE.NormalBlending;
      any.depthWrite = false;
      any.opacity = opacity * 0.75;
      if (typeof any.alphaTest === 'number') any.alphaTest = 0.08;
      if (typeof any.emissiveIntensity === 'number') {
        any.emissiveIntensity = emissiveIntensity * 0.9;
      }
      // Dark body, bright rim via emissive
      if (any.color) any.color.multiplyScalar(0.35);
      break;
  }
}

async function loadTemplate(): Promise<THREE.Group> {
  const candidates = [
    DRAGON_KOI_LOCAL_PATH,
    `${ASSET_CDN_BASE}${DRAGON_KOI_LOCAL_PATH}`,
    DRAGON_KOI_CDN_URL,
  ];
  let lastErr: unknown;
  for (const url of candidates) {
    try {
      const gltf = await loadGltfCached(url);
      return cloneGltfScene(gltf);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('dragon_koi.glb failed to load');
}

export class DragonKoiCastAuraSystem {
  private scene: THREE.Scene;
  private root = new THREE.Group();
  private active: ActiveAura[] = [];
  private templatePromise: Promise<void> | null = null;
  private templateReady = false;
  private animClips: THREE.AnimationClip[] = [];
  private castSeq = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.root.name = 'dragon_koi_cast_aura';
    scene.add(this.root);
  }

  /** Background preload (Island3DEngine / WorldFxBus). */
  preload(): Promise<void> {
    if (this.templateReady) return Promise.resolve();
    if (this.templatePromise) return this.templatePromise;
    this.templatePromise = (async () => {
      try {
        const candidates = [
          DRAGON_KOI_LOCAL_PATH,
          `${ASSET_CDN_BASE}${DRAGON_KOI_LOCAL_PATH}`,
          DRAGON_KOI_CDN_URL,
        ];
        for (const url of candidates) {
          try {
            const gltf = await loadGltfCached(url);
            this.animClips = gltf.animations?.slice() ?? [];
            this.templateReady = true;
            return;
          } catch {
            /* try next */
          }
        }
        console.warn('[DragonKoiCast] preload failed — cast aura will retry on spawn');
      } finally {
        this.templatePromise = null;
      }
    })();
    return this.templatePromise;
  }

  /**
   * Begin cast aura around user. Returns cast token (pass to endCast).
   * Auto-ends after duration; call endCast early on cancel / cast finished.
   */
  beginCast(opts: DragonKoiCastOpts): number {
    const token = ++this.castSeq;
    // Cancel previous auras on same attach (one channel at a time per actor)
    if (opts.attachTo) {
      this.endCastsFor(opts.attachTo, 0.12);
    }

    void this.spawnAsync(opts, token);
    return token;
  }

  /** End a specific cast (token) or all if token omitted. */
  endCast(token?: number, fadeSec = FADE_OUT): void {
    for (const a of this.active) {
      if (token != null && a.castToken !== token) continue;
      a.fading = true;
      a.fadeT = Math.min(a.fadeT || fadeSec, fadeSec);
      // force remaining life into fade window
      a.duration = Math.min(a.duration, a.age + fadeSec);
    }
  }

  endCastsFor(attachTo: THREE.Object3D, fadeSec = FADE_OUT): void {
    for (const a of this.active) {
      if (a.attachTo === attachTo) {
        a.fading = true;
        a.fadeT = fadeSec;
        a.duration = Math.min(a.duration, a.age + fadeSec);
      }
    }
  }

  update(dt: number): void {
    const still: ActiveAura[] = [];
    for (const a of this.active) {
      a.age += dt;
      a.mixer?.update(dt);

      // Follow caster
      if (a.attachTo) {
        a.attachTo.getWorldPosition(_tmp);
        a.holdPos.copy(_tmp);
      }

      a.angle += a.def.orbitSpeed * dt;
      const r = a.def.orbitRadius;
      a.root.position.set(
        a.holdPos.x + Math.cos(a.angle) * r,
        a.holdPos.y + a.def.height,
        a.holdPos.z + Math.sin(a.angle) * r,
      );
      // Face along orbit tangent (looks like swimming around caster)
      a.root.rotation.y = -a.angle + Math.PI / 2;
      // Subtle bob
      a.root.position.y += Math.sin(a.age * 3.2) * 0.06;

      const lifeLeft = a.duration - a.age;
      const fadeIn = Math.min(1, a.age / 0.2);
      let fadeOut = 1;
      if (lifeLeft < FADE_OUT || a.fading) {
        fadeOut = Math.max(0, lifeLeft / FADE_OUT);
      }
      const opMul = fadeIn * fadeOut;
      for (const m of a.mats) {
        const mat = m.mat as THREE.Material & { opacity?: number };
        if (typeof mat.opacity === 'number') {
          mat.opacity = m.baseOpacity * opMul;
        }
      }

      if (a.age >= a.duration || opMul <= 0.01) {
        this.disposeAura(a);
        continue;
      }
      still.push(a);
    }
    this.active = still;
  }

  dispose(): void {
    for (const a of this.active) this.disposeAura(a);
    this.active = [];
    this.scene.remove(this.root);
  }

  private async spawnAsync(opts: DragonKoiCastOpts, token: number): Promise<void> {
    const variantId = resolveDragonKoiVariant(opts);
    const def = { ...DRAGON_KOI_VARIANTS[variantId] };
    if (opts.scale != null) def.scale = opts.scale;

    const duration =
      opts.durationSec
      ?? dragonKoiCastDurationSec({
        windup: opts.windup,
        active: opts.active,
        recovery: opts.recovery,
        castTimeSec: opts.castTimeSec,
      });

    let sceneRoot: THREE.Group;
    try {
      await this.preload();
      sceneRoot = await loadTemplate();
    } catch (e) {
      console.warn('[DragonKoiCast] spawn failed', e);
      return;
    }

    // Dropped if a newer cast superseded this token on same attach
    if (token !== this.castSeq && opts.attachTo) {
      // still allow concurrent different attachTo; only skip if token cancelled
    }
    // If endCast already asked to kill this token before load finished
    if (token < this.castSeq && !opts.attachTo) {
      return;
    }

    sceneRoot.name = `dragon_koi_cast_${def.id}_${token}`;
    sceneRoot.scale.setScalar(def.scale);
    const mats = applyDragonKoiSkin(sceneRoot, def);

    let mixer: THREE.AnimationMixer | null = null;
    if (this.animClips.length > 0) {
      mixer = new THREE.AnimationMixer(sceneRoot);
      for (const clip of this.animClips) {
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.clampWhenFinished = false;
        action.play();
      }
    }

    const hold = opts.position?.clone() ?? new THREE.Vector3();
    if (opts.attachTo) opts.attachTo.getWorldPosition(hold);

    this.root.add(sceneRoot);
    this.active.push({
      root: sceneRoot,
      mixer,
      mats,
      def,
      age: 0,
      duration,
      angle: Math.random() * Math.PI * 2,
      attachTo: opts.attachTo ?? null,
      holdPos: hold,
      castToken: token,
      fading: false,
      fadeT: FADE_OUT,
    });
  }

  private disposeAura(a: ActiveAura): void {
    a.mixer?.stopAllAction();
    a.root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of list) m?.dispose?.();
    });
    this.root.remove(a.root);
  }
}
