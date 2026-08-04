/**
 * PostProcessing — production EffectComposer pipeline (Three.js examples stack).
 *
 * Best practices (cinema + gameplay):
 *  - When SMAA is on, create the WebGLRenderer with antialias:false
 *  - Render only via composer.render() (never double-draw)
 *  - Bloom → SMAA → film grade (grain / chroma / vignette / contrast)
 *  - Drive look from beats via applyFilmLook (smoothed by caller)
 *
 * Passes: RenderPass → UnrealBloomPass → SMAAPass → FilmGrade ShaderPass
 * Quality: low (grade only), medium (bloom+SMAA+grade), high (stronger bloom + grain)
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export type QualityPreset = 'low' | 'medium' | 'high';

export interface PostProcessingConfig {
  quality: QualityPreset;
  bloomStrength?: number;
  bloomRadius?: number;
  bloomThreshold?: number;
  /** Color grading: warm/cool tint (-1 cool … +1 warm) */
  colorTint?: number;
  /** Vignette intensity (0 = none, 1 = strong) */
  vignetteIntensity?: number;
  /** Contrast boost (1.0 = none) */
  contrast?: number;
  /** Saturation (1 = neutral, 0 = mono, >1 punch) */
  saturation?: number;
  /** Film grain 0..1 (cinema ~0.04–0.12) */
  grain?: number;
  /** Chromatic aberration strength in UV (cinema ~0.0006–0.0015) */
  chroma?: number;
}

/** Film grade: contrast · tint · soft vignette · sat · grain · mild chroma */
const FilmGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTint: { value: 0.0 },
    uVignette: { value: 0.35 },
    uContrast: { value: 1.06 },
    uSaturation: { value: 1.0 },
    uGrain: { value: 0.06 },
    uChroma: { value: 0.0008 },
    uTime: { value: 0.0 },
    uLift: { value: 0.02 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTint;
    uniform float uVignette;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uGrain;
    uniform float uChroma;
    uniform float uTime;
    uniform float uLift;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      // Mild radial chromatic aberration (film lens)
      vec2 dir = uv - 0.5;
      float r = length(dir);
      vec2 off = normalize(dir + 1e-5) * uChroma * r * 1.6;
      float cr = texture2D(tDiffuse, uv + off).r;
      float cg = texture2D(tDiffuse, uv).g;
      float cb = texture2D(tDiffuse, uv - off).b;
      vec3 c = vec3(cr, cg, cb);

      // Shadow lift — reduces banding in storm blacks
      c += uLift * (1.0 - c);

      // Contrast around mid-grey
      c = (c - 0.5) * uContrast + 0.5;

      // Saturation
      float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(luma), c, uSaturation);

      // Warm/cool tint
      if (uTint > 0.0) {
        c.r += uTint * 0.055;
        c.b -= uTint * 0.028;
      } else {
        c.b -= uTint * 0.055;
        c.r += uTint * 0.028;
      }

      // Soft cinematic vignette (not hard circle)
      float dist = length(dir);
      float vig = smoothstep(0.95, 0.22, dist);
      c *= mix(1.0, vig, clamp(uVignette, 0.0, 1.0));

      // Temporal film grain (subtle)
      float n = hash(uv * vec2(1920.0, 1080.0) + fract(uTime) * 120.0) - 0.5;
      c += n * uGrain;

      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }
  `,
};

const PRESET_BLOOM: Record<
  QualityPreset,
  { strength: number; radius: number; threshold: number }
> = {
  low: { strength: 0, radius: 0, threshold: 1.0 },
  medium: { strength: 0.22, radius: 0.35, threshold: 0.88 },
  high: { strength: 0.48, radius: 0.52, threshold: 0.74 },
};

export class PostProcessing {
  public composer: EffectComposer;
  private renderPass: RenderPass;
  private bloomPass: UnrealBloomPass;
  private smaaPass: SMAAPass;
  private filmPass: ShaderPass;
  private quality: QualityPreset;
  private time = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    config: Partial<PostProcessingConfig> = {},
  ) {
    this.quality = config.quality || 'medium';

    // Prefer floating point buffer when available (less banding in darks)
    this.composer = new EffectComposer(renderer);

    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    const bloomPreset = PRESET_BLOOM[this.quality];
    const resolution = new THREE.Vector2(
      Math.max(1, renderer.domElement.width),
      Math.max(1, renderer.domElement.height),
    );
    this.bloomPass = new UnrealBloomPass(
      resolution,
      config.bloomStrength ?? bloomPreset.strength,
      config.bloomRadius ?? bloomPreset.radius,
      config.bloomThreshold ?? bloomPreset.threshold,
    );
    this.bloomPass.enabled = this.quality !== 'low';
    this.composer.addPass(this.bloomPass);

    this.smaaPass = new SMAAPass(resolution.x, resolution.y);
    this.smaaPass.enabled = this.quality !== 'low';
    this.composer.addPass(this.smaaPass);

    this.filmPass = new ShaderPass(FilmGradeShader);
    this.filmPass.uniforms.uTint.value = config.colorTint ?? 0.0;
    this.filmPass.uniforms.uVignette.value = config.vignetteIntensity ?? 0.35;
    this.filmPass.uniforms.uContrast.value = config.contrast ?? 1.06;
    this.filmPass.uniforms.uSaturation.value = config.saturation ?? 1.02;
    this.filmPass.uniforms.uGrain.value =
      config.grain ?? (this.quality === 'high' ? 0.055 : 0.03);
    this.filmPass.uniforms.uChroma.value =
      config.chroma ?? (this.quality === 'high' ? 0.0009 : 0.0004);
    this.filmPass.uniforms.uLift.value = 0.018;
    this.composer.addPass(this.filmPass);
  }

  /** Advance film grain clock (call from cinema tick with dt). */
  update(dt: number): void {
    this.time += dt;
    this.filmPass.uniforms.uTime.value = this.time;
  }

  render(): void {
    this.composer.render();
  }

  resize(width: number, height: number): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this.composer.setSize(w, h);
    this.bloomPass.resolution.set(w, h);
  }

  setQuality(preset: QualityPreset): void {
    this.quality = preset;
    const bloomPreset = PRESET_BLOOM[preset];
    this.bloomPass.strength = bloomPreset.strength;
    this.bloomPass.radius = bloomPreset.radius;
    this.bloomPass.threshold = bloomPreset.threshold;
    this.bloomPass.enabled = preset !== 'low';
    this.smaaPass.enabled = preset !== 'low';
    this.filmPass.uniforms.uGrain.value = preset === 'high' ? 0.055 : 0.03;
  }

  setColorTint(tint: number): void {
    this.filmPass.uniforms.uTint.value = tint;
  }

  setVignette(intensity: number): void {
    this.filmPass.uniforms.uVignette.value = intensity;
  }

  setBloomStrength(strength: number): void {
    this.bloomPass.strength = strength;
  }

  setBloomRadius(radius: number): void {
    this.bloomPass.radius = radius;
  }

  setBloomThreshold(threshold: number): void {
    this.bloomPass.threshold = threshold;
  }

  setContrast(contrast: number): void {
    this.filmPass.uniforms.uContrast.value = contrast;
  }

  setSaturation(sat: number): void {
    this.filmPass.uniforms.uSaturation.value = sat;
  }

  setGrain(grain: number): void {
    this.filmPass.uniforms.uGrain.value = grain;
  }

  setChroma(chroma: number): void {
    this.filmPass.uniforms.uChroma.value = chroma;
  }

  getQuality(): QualityPreset {
    return this.quality;
  }

  /** Full film-look snapshot for cinema beats */
  applyFilmLook(opts: {
    bloom?: number;
    bloomRadius?: number;
    bloomThreshold?: number;
    tint?: number;
    vignette?: number;
    contrast?: number;
    saturation?: number;
    grain?: number;
    chroma?: number;
  }): void {
    if (opts.bloom != null) this.setBloomStrength(opts.bloom);
    if (opts.bloomRadius != null) this.setBloomRadius(opts.bloomRadius);
    if (opts.bloomThreshold != null) this.setBloomThreshold(opts.bloomThreshold);
    if (opts.tint != null) this.setColorTint(opts.tint);
    if (opts.vignette != null) this.setVignette(opts.vignette);
    if (opts.contrast != null) this.setContrast(opts.contrast);
    if (opts.saturation != null) this.setSaturation(opts.saturation);
    if (opts.grain != null) this.setGrain(opts.grain);
    if (opts.chroma != null) this.setChroma(opts.chroma);
  }

  dispose(): void {
    this.composer.dispose();
  }
}
