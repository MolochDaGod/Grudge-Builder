/**
 * PostProcessing — EffectComposer pipeline with quality presets.
 *
 * Passes: RenderPass → UnrealBloomPass → SMAAPass → ColorGrading ShaderPass
 * Quality: low (none), medium (bloom+SMAA), high (all + stronger bloom)
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
  /** Bloom strength override (default varies by preset) */
  bloomStrength?: number;
  /** Bloom radius override */
  bloomRadius?: number;
  /** Bloom threshold override */
  bloomThreshold?: number;
  /** Color grading: warm/cool tint (-1 cool … +1 warm) */
  colorTint?: number;
  /** Vignette intensity (0 = none, 1 = strong) */
  vignetteIntensity?: number;
  /** Contrast boost (1.0 = none) */
  contrast?: number;
}

// ─── Color Grading Shader ─────────────────────────────────────────────────────

const ColorGradingShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTint: { value: 0.0 },
    uVignette: { value: 0.3 },
    uContrast: { value: 1.05 },
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
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec3 c = color.rgb;

      // Contrast
      c = (c - 0.5) * uContrast + 0.5;

      // Warm/cool tint
      if (uTint > 0.0) {
        c.r += uTint * 0.06;
        c.b -= uTint * 0.03;
      } else {
        c.b -= uTint * 0.06;
        c.r += uTint * 0.03;
      }

      // Vignette
      vec2 center = vUv - 0.5;
      float dist = length(center);
      float vig = smoothstep(0.5, 0.2, dist);
      c *= mix(1.0, vig, uVignette);

      gl_FragColor = vec4(clamp(c, 0.0, 1.0), color.a);
    }
  `,
};

// ─── Preset definitions ───────────────────────────────────────────────────────

const PRESET_BLOOM: Record<QualityPreset, { strength: number; radius: number; threshold: number }> = {
  low:    { strength: 0,    radius: 0,    threshold: 1.0 },
  medium: { strength: 0.3,  radius: 0.4,  threshold: 0.85 },
  high:   { strength: 0.6,  radius: 0.6,  threshold: 0.7 },
};

// ─── PostProcessing class ─────────────────────────────────────────────────────

export class PostProcessing {
  public composer: EffectComposer;
  private renderPass: RenderPass;
  private bloomPass: UnrealBloomPass;
  private smaaPass: SMAAPass;
  private colorGradingPass: ShaderPass;
  private quality: QualityPreset;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    config: Partial<PostProcessingConfig> = {},
  ) {
    this.quality = config.quality || 'medium';

    this.composer = new EffectComposer(renderer);

    // 1. Render pass
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // 2. Bloom
    const bloomPreset = PRESET_BLOOM[this.quality];
    const resolution = new THREE.Vector2(renderer.domElement.width, renderer.domElement.height);
    this.bloomPass = new UnrealBloomPass(
      resolution,
      config.bloomStrength ?? bloomPreset.strength,
      config.bloomRadius ?? bloomPreset.radius,
      config.bloomThreshold ?? bloomPreset.threshold,
    );
    this.bloomPass.enabled = this.quality !== 'low';
    this.composer.addPass(this.bloomPass);

    // 3. SMAA anti-aliasing
    this.smaaPass = new SMAAPass(resolution.x, resolution.y);
    this.smaaPass.enabled = this.quality !== 'low';
    this.composer.addPass(this.smaaPass);

    // 4. Color grading
    this.colorGradingPass = new ShaderPass(ColorGradingShader);
    this.colorGradingPass.uniforms.uTint.value = config.colorTint ?? 0.0;
    this.colorGradingPass.uniforms.uVignette.value = config.vignetteIntensity ?? 0.3;
    this.colorGradingPass.uniforms.uContrast.value = config.contrast ?? 1.05;
    this.composer.addPass(this.colorGradingPass);
  }

  /** Call instead of renderer.render() */
  render(): void {
    this.composer.render();
  }

  /** Resize all passes */
  resize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);
  }

  /** Switch quality preset at runtime */
  setQuality(preset: QualityPreset): void {
    this.quality = preset;
    const bloomPreset = PRESET_BLOOM[preset];
    this.bloomPass.strength = bloomPreset.strength;
    this.bloomPass.radius = bloomPreset.radius;
    this.bloomPass.threshold = bloomPreset.threshold;
    this.bloomPass.enabled = preset !== 'low';
    this.smaaPass.enabled = preset !== 'low';
  }

  /** Adjust color tint (-1 cool … +1 warm) */
  setColorTint(tint: number): void {
    this.colorGradingPass.uniforms.uTint.value = tint;
  }

  /** Adjust vignette intensity */
  setVignette(intensity: number): void {
    this.colorGradingPass.uniforms.uVignette.value = intensity;
  }

  /** Adjust bloom strength */
  setBloomStrength(strength: number): void {
    this.bloomPass.strength = strength;
  }

  dispose(): void {
    this.composer.dispose();
  }
}
