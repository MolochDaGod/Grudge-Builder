/**
 * WeaponTierShaderSystem — Three.js tier / enhancement / infusion materials.
 *
 * Ladder (best-practice progressive quality):
 *   T1–T2  MeshStandardMaterial — high roughness, low metal, forge noise (rough look)
 *   T3–T4  MeshPhysicalMaterial — clearcoat begins, edge rim, spark trails
 *   T5–T8  Physical + custom onBeforeCompile rim/sheen/infusion pulse + aura particles
 *
 * Does not replace the mesh; upgrades materials on an existing weapon Object3D.
 *
 * Usage:
 *   const sys = new WeaponTierShaderSystem(scene, worldFx);
 *   sys.applyToWeapon(weaponRoot, { tier: 5, enhancement: 'sharpened', infusion: 'fire' });
 *   sys.update(dt); // glow pulse + particles
 */
import * as THREE from 'three';
import {
  buildWeaponShaderStack,
  type WeaponEnhancementId,
  type WeaponInfusionId,
  type WeaponShaderStack,
} from '@shared/definitions/weaponTierVisuals';
import type { WorldFxBus } from './WorldFxBus';

export interface ApplyWeaponVisualOpts {
  tier: number;
  enhancement?: WeaponEnhancementId;
  infusion?: WeaponInfusionId;
  /** Preserve existing map/normal/roughness maps when present */
  keepMaps?: boolean;
}

interface TrackedWeapon {
  root: THREE.Object3D;
  stack: WeaponShaderStack;
  mats: THREE.Material[];
  uniforms: Array<{ time: { value: number }; pulse: { value: number } }>;
  trailToken: string | null;
}

const NOISE_CHUNK = /* glsl */ `
float wtHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float wtNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = wtHash(i);
  float b = wtHash(i + vec2(1.0, 0.0));
  float c = wtHash(i + vec2(0.0, 1.0));
  float d = wtHash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
`;

export class WeaponTierShaderSystem {
  private scene: THREE.Scene;
  private worldFx: WorldFxBus | null;
  private tracked = new Map<string, TrackedWeapon>();
  private idSeq = 0;
  private clock = 0;

  constructor(scene: THREE.Scene, worldFx?: WorldFxBus | null) {
    this.scene = scene;
    this.worldFx = worldFx ?? null;
  }

  /**
   * Apply tier/enhancement/infusion materials to every Mesh under `weaponRoot`.
   * Returns a handle id for update/dispose.
   */
  applyToWeapon(
    weaponRoot: THREE.Object3D,
    opts: ApplyWeaponVisualOpts,
  ): string {
    const stack = buildWeaponShaderStack(
      opts.tier,
      opts.enhancement ?? 'none',
      opts.infusion ?? 'none',
    );
    const keepMaps = opts.keepMaps !== false;
    const mats: THREE.Material[] = [];
    const uniforms: TrackedWeapon['uniforms'] = [];

    weaponRoot.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const prev = o.material;
      const baseMaps = this.extractMaps(prev);

      let mat: THREE.Material;
      if (stack.physical || stack.tier >= 3) {
        mat = this.makePhysical(stack, baseMaps, keepMaps, uniforms);
      } else {
        mat = this.makeStandard(stack, baseMaps, keepMaps);
      }

      // Dispose previous only if we created a clone earlier (userData flag)
      if (o.userData._wtShaderOwned && prev) {
        const list = Array.isArray(prev) ? prev : [prev];
        list.forEach((m) => m.dispose());
      }
      o.material = mat;
      o.userData._wtShaderOwned = true;
      o.userData._wtTier = stack.tier;
      mats.push(mat);
      o.castShadow = true;
      o.receiveShadow = true;
    });

    const id = `wt_${++this.idSeq}`;
    weaponRoot.userData.weaponTierShaderId = id;

    // Trail / spark particles for T4+ via WorldFxBus
    let trailToken: string | null = null;
    if (stack.trail && this.worldFx && stack.tier >= 4) {
      try {
        const origin = new THREE.Vector3();
        weaponRoot.getWorldPosition(origin);
        trailToken = `trail_${id}`;
        // Burst sparks at tip — continuous trails attach via attachTo on swing VFX
        this.worldFx.spawn('attack_burst', {
          position: origin,
          burst: true,
          burstCount: 6 + stack.tier * 2,
        });
        // Soft continuous emitter parented to weapon for high tiers
        if (stack.tier >= 6) {
          this.worldFx.spawn('attack_burst', {
            attachTo: weaponRoot,
            localOffset: new THREE.Vector3(0, 0.4, 0),
            burst: true,
            burstCount: 4,
          });
        }
      } catch {
        /* optional */
      }
    }

    this.tracked.set(id, { root: weaponRoot, stack, mats, uniforms, trailToken });
    return id;
  }

  /** Per-frame pulse + keep trail origin on weapon. */
  update(dt: number) {
    this.clock += dt;
    for (const tw of this.tracked.values()) {
      const pulse =
        1 + Math.sin(this.clock * (2.5 + tw.stack.glowPulse * 4)) * tw.stack.glowPulse;
      for (const u of tw.uniforms) {
        u.time.value = this.clock;
        u.pulse.value = pulse;
      }
      // Emissive intensity pulse on materials
      if (tw.stack.glowPulse > 0) {
        for (const m of tw.mats) {
          if ('emissiveIntensity' in m) {
            const base = tw.stack.emissiveIntensity;
            (m as THREE.MeshStandardMaterial).emissiveIntensity =
              base * (0.75 + 0.25 * pulse);
          }
        }
      }
    }
  }

  release(id: string) {
    const tw = this.tracked.get(id);
    if (!tw) return;
    this.tracked.delete(id);
    // materials stay on mesh until next apply or mesh dispose
  }

  disposeAll() {
    this.tracked.clear();
  }

  // ── Material builders ────────────────────────────────────────────────────

  private extractMaps(prev: THREE.Material | THREE.Material[]): {
    map?: THREE.Texture | null;
    normalMap?: THREE.Texture | null;
    roughnessMap?: THREE.Texture | null;
    metalnessMap?: THREE.Texture | null;
    emissiveMap?: THREE.Texture | null;
  } {
    const m = Array.isArray(prev) ? prev[0] : prev;
    if (!m || !(m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
      return {};
    }
    const s = m as THREE.MeshStandardMaterial;
    return {
      map: s.map,
      normalMap: s.normalMap,
      roughnessMap: s.roughnessMap,
      metalnessMap: s.metalnessMap,
      emissiveMap: s.emissiveMap,
    };
  }

  private makeStandard(
    stack: WeaponShaderStack,
    maps: ReturnType<WeaponTierShaderSystem['extractMaps']>,
    keepMaps: boolean,
  ): THREE.MeshStandardMaterial {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(stack.tint),
      roughness: stack.roughness,
      metalness: stack.metalness,
      emissive: new THREE.Color(stack.emissive),
      emissiveIntensity: stack.emissiveIntensity,
      // T1 crude: flatter, dirtier
      flatShading: stack.tier <= 1,
    });
    if (keepMaps) {
      if (maps.map) mat.map = maps.map;
      if (maps.normalMap) mat.normalMap = maps.normalMap;
      if (maps.roughnessMap) mat.roughnessMap = maps.roughnessMap;
      if (maps.metalnessMap) mat.metalnessMap = maps.metalnessMap;
    }
    // Procedural roughness boost via onBeforeCompile for surface noise
    if (stack.surfaceNoise > 0.2) {
      this.injectSurfaceNoise(mat, stack);
    }
    return mat;
  }

  private makePhysical(
    stack: WeaponShaderStack,
    maps: ReturnType<WeaponTierShaderSystem['extractMaps']>,
    keepMaps: boolean,
    uniformsOut: TrackedWeapon['uniforms'],
  ): THREE.MeshPhysicalMaterial {
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(stack.tint),
      roughness: stack.roughness,
      metalness: stack.metalness,
      clearcoat: stack.clearcoat,
      clearcoatRoughness: stack.clearcoatRoughness,
      emissive: new THREE.Color(stack.emissive),
      emissiveIntensity: stack.emissiveIntensity,
      reflectivity: 0.5 + stack.bladeSheen * 0.4,
      envMapIntensity: 0.6 + stack.tier * 0.08,
    });
    if (keepMaps) {
      if (maps.map) mat.map = maps.map;
      if (maps.normalMap) mat.normalMap = maps.normalMap;
      if (maps.roughnessMap) mat.roughnessMap = maps.roughnessMap;
      if (maps.metalnessMap) mat.metalnessMap = maps.metalnessMap;
      if (maps.emissiveMap) mat.emissiveMap = maps.emissiveMap;
    }

    // Custom rim + sheen + infusion pulse (onBeforeCompile — best practice for
    // layered blade look without full rewrite of PBR lighting)
    if (stack.edgeRim > 0.15 || stack.bladeSheen > 0.2 || stack.glowPulse > 0) {
      const u = {
        time: { value: 0 },
        pulse: { value: 1 },
        rimStrength: { value: stack.edgeRim },
        rimColor: { value: new THREE.Color(stack.edgeRimColor) },
        sheenAmt: { value: stack.bladeSheen },
        noiseAmt: { value: stack.surfaceNoise },
      };
      uniformsOut.push(u);

      mat.onBeforeCompile = (shader) => {
        shader.uniforms.wtTime = u.time;
        shader.uniforms.wtPulse = u.pulse;
        shader.uniforms.wtRim = u.rimStrength;
        shader.uniforms.wtRimColor = u.rimColor;
        shader.uniforms.wtSheen = u.sheenAmt;
        shader.uniforms.wtNoise = u.noiseAmt;

        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            `#include <common>
uniform float wtTime;
uniform float wtPulse;
uniform float wtRim;
uniform vec3 wtRimColor;
uniform float wtSheen;
uniform float wtNoise;
${NOISE_CHUNK}
`,
          )
          .replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
// Tier surface noise (forge scars) — more on low tiers
float sc = wtNoise(vUv * 40.0) * wtNoise;
totalEmissiveRadiance *= (1.0 - sc * 0.35);
// Infusion / tier pulse
totalEmissiveRadiance *= wtPulse;
`,
          )
          .replace(
            '#include <output_fragment>',
            `#include <output_fragment>
// Blade edge fresnel rim
float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.2);
vec3 rim = wtRimColor * fres * wtRim * wtPulse;
gl_FragColor.rgb += rim;
// Specular sheen streak along blade
float sheen = pow(fres, 4.0) * wtSheen;
gl_FragColor.rgb += sheen * mix(vec3(1.0), wtRimColor, 0.5);
`,
          );
      };
      mat.customProgramCacheKey = () =>
        `wt_t${stack.tier}_r${stack.edgeRim}_s${stack.bladeSheen}_i${stack.infusion}`;
    } else if (stack.surfaceNoise > 0.2) {
      this.injectSurfaceNoise(mat, stack);
    }

    return mat;
  }

  private injectSurfaceNoise(
    mat: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
    stack: WeaponShaderStack,
  ) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.wtNoise = { value: stack.surfaceNoise };
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
uniform float wtNoise;
${NOISE_CHUNK}
`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + wtNoise(vUv * 32.0) * wtNoise * 0.5, 0.05, 1.0);
`,
        );
    };
    mat.customProgramCacheKey = () => `wt_noise_${stack.surfaceNoise}`;
  }
}

/**
 * Convenience: load is separate; call after GLB is in scene graph.
 */
export function applyWeaponTierVisuals(
  weaponRoot: THREE.Object3D,
  tier: number,
  opts?: {
    enhancement?: WeaponEnhancementId;
    infusion?: WeaponInfusionId;
    system?: WeaponTierShaderSystem;
    scene?: THREE.Scene;
  },
): WeaponTierShaderSystem {
  const sys =
    opts?.system ??
    new WeaponTierShaderSystem(opts?.scene ?? (weaponRoot.parent as THREE.Scene) ?? new THREE.Scene());
  sys.applyToWeapon(weaponRoot, {
    tier,
    enhancement: opts?.enhancement ?? 'none',
    infusion: opts?.infusion ?? 'none',
  });
  return sys;
}
