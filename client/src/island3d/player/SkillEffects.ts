/**
 * SkillEffects — shader-based visual effects for character abilities.
 *
 * Provides ready-to-use materials and particle helpers for:
 *  - Dissolve (death/teleport/stealth)
 *  - Rim glow (power-up, shield, healing)
 *  - Hit flash (damage taken)
 *  - Frost overlay (debuff)
 *
 * Based on threejs-skills shader patterns.
 */
import * as THREE from 'three';

// ─── Dissolve Effect ─────────────────────────────────────────────────────────

/**
 * Create a dissolve material that replaces a mesh's existing material.
 * Animate `progress` uniform from 0 → 1 to dissolve the mesh.
 */
export function createDissolveMaterial(
  baseMaterial: THREE.MeshStandardMaterial,
  edgeColor = new THREE.Color(0xff6600),
): THREE.ShaderMaterial {
  const baseMap = baseMaterial.map;
  const baseColor = baseMaterial.color.clone();

  return new THREE.ShaderMaterial({
    uniforms: {
      progress: { value: 0 },
      baseColor: { value: baseColor },
      edgeColor: { value: edgeColor },
      edgeWidth: { value: 0.08 },
      baseMap: { value: baseMap },
      hasMap: { value: baseMap ? 1 : 0 },
      time: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      varying vec3 vNormal;

      void main() {
        vUv = uv;
        vPosition = position;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float progress;
      uniform vec3 baseColor;
      uniform vec3 edgeColor;
      uniform float edgeWidth;
      uniform sampler2D baseMap;
      uniform float hasMap;
      uniform float time;

      varying vec2 vUv;
      varying vec3 vPosition;
      varying vec3 vNormal;

      // Simple noise
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      void main() {
        float n = noise(vPosition.xz * 3.0 + time * 0.5);

        if (n < progress) discard;

        float edge = smoothstep(progress, progress + edgeWidth, n);

        vec3 color = hasMap > 0.5 ? texture2D(baseMap, vUv).rgb : baseColor;
        color = mix(edgeColor, color, edge);

        // Add glow at dissolve edge
        float glow = 1.0 - edge;
        color += edgeColor * glow * 2.0;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });
}

// ─── Rim Glow Effect ─────────────────────────────────────────────────────────

/**
 * Create a rim glow overlay material (additive, transparent).
 * Use on a slightly-scaled-up clone of the character mesh.
 */
export function createRimGlowMaterial(
  color = new THREE.Color(0x44aaff),
  power = 3.0,
  intensity = 1.5,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      rimColor: { value: color },
      rimPower: { value: power },
      rimIntensity: { value: intensity },
      time: { value: 0 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 rimColor;
      uniform float rimPower;
      uniform float rimIntensity;
      uniform float time;

      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
        rim = pow(rim, rimPower);

        // Pulse
        float pulse = 0.8 + 0.2 * sin(time * 3.0);

        vec3 color = rimColor * rim * rimIntensity * pulse;
        float alpha = rim * 0.8;

        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
}

// ─── Hit Flash Effect ────────────────────────────────────────────────────────

/**
 * Apply a white flash to a mesh for `duration` seconds (damage taken feedback).
 * Stores and restores original materials automatically.
 */
export function applyHitFlash(
  object: THREE.Object3D,
  flashColor = 0xffffff,
  duration = 0.15,
): void {
  const origMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const flashMat = new THREE.MeshBasicMaterial({ color: flashColor });

  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      origMaterials.set(child, child.material);
      child.material = flashMat;
    }
  });

  setTimeout(() => {
    for (const [mesh, mat] of origMaterials) {
      mesh.material = mat;
    }
    flashMat.dispose();
  }, duration * 1000);
}

// ─── Frost/Debuff Overlay ────────────────────────────────────────────────────

/**
 * Create a frost overlay material for debuff visualization.
 */
export function createFrostMaterial(
  intensity = 0.5,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      intensity: { value: intensity },
      time: { value: 0 },
      frostColor: { value: new THREE.Color(0x88ccff) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float intensity;
      uniform float time;
      uniform vec3 frostColor;

      varying vec2 vUv;
      varying vec3 vNormal;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
        float frost = hash(vUv * 20.0 + time * 0.1);
        frost = smoothstep(0.3, 0.7, frost) * intensity;

        // Stronger at edges (rim)
        float rim = 1.0 - max(0.0, dot(normalize(vec3(0.0, 0.0, 1.0)), vNormal));
        frost += rim * 0.3 * intensity;

        gl_FragColor = vec4(frostColor, frost * 0.6);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

// ─── Effect Controller (manages active effects per character) ────────────────

export interface ActiveEffect {
  type: 'dissolve' | 'rimGlow' | 'frost';
  material: THREE.ShaderMaterial;
  overlay?: THREE.Mesh;
  startTime: number;
  duration: number; // 0 = infinite
}

export class SkillEffectController {
  private effects = new Map<string, ActiveEffect>();
  private target: THREE.Object3D;

  constructor(target: THREE.Object3D) {
    this.target = target;
  }

  /** Start a dissolve effect on the target */
  startDissolve(duration = 2, edgeColor?: THREE.Color): string {
    const id = `dissolve_${Date.now()}`;
    // Find a mesh material to base dissolve on
    let baseMat: THREE.MeshStandardMaterial | null = null;
    this.target.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial && !baseMat) {
        baseMat = child.material;
      }
    });

    if (!baseMat) return '';

    const dissolveMat = createDissolveMaterial(baseMat, edgeColor);
    // Apply to all meshes
    this.target.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        (child as any).__originalMaterial = child.material;
        child.material = dissolveMat;
      }
    });

    this.effects.set(id, {
      type: 'dissolve',
      material: dissolveMat,
      startTime: performance.now(),
      duration: duration * 1000,
    });

    return id;
  }

  /** Start a rim glow effect */
  startRimGlow(color?: THREE.Color, duration = 0): string {
    const id = `rimGlow_${Date.now()}`;
    const mat = createRimGlowMaterial(color);

    // Create a slightly scaled overlay mesh from the first mesh found
    let overlayMesh: THREE.Mesh | null = null;
    this.target.traverse((child) => {
      if (child instanceof THREE.Mesh && !overlayMesh) {
        overlayMesh = new THREE.Mesh(child.geometry.clone(), mat);
        overlayMesh.scale.setScalar(1.03);
        child.parent?.add(overlayMesh);
        overlayMesh.position.copy(child.position);
      }
    });

    this.effects.set(id, {
      type: 'rimGlow',
      material: mat,
      overlay: overlayMesh || undefined,
      startTime: performance.now(),
      duration: duration * 1000,
    });

    return id;
  }

  /** Stop an effect by ID */
  stopEffect(id: string): void {
    const effect = this.effects.get(id);
    if (!effect) return;

    if (effect.type === 'dissolve') {
      // Restore original materials
      this.target.traverse((child) => {
        if (child instanceof THREE.Mesh && (child as any).__originalMaterial) {
          child.material = (child as any).__originalMaterial;
          delete (child as any).__originalMaterial;
        }
      });
    }

    if (effect.overlay) {
      effect.overlay.parent?.remove(effect.overlay);
      effect.overlay.geometry.dispose();
    }

    effect.material.dispose();
    this.effects.delete(id);
  }

  /** Update all active effects (call each frame) */
  update(): void {
    const now = performance.now();

    for (const [id, effect] of this.effects) {
      const elapsed = now - effect.startTime;
      const time = elapsed * 0.001;

      effect.material.uniforms.time.value = time;

      if (effect.type === 'dissolve' && effect.duration > 0) {
        const progress = Math.min(elapsed / effect.duration, 1);
        effect.material.uniforms.progress.value = progress;
        if (progress >= 1) this.stopEffect(id);
      }

      // Auto-expire timed effects
      if (effect.duration > 0 && elapsed >= effect.duration) {
        this.stopEffect(id);
      }
    }
  }

  /** Stop all effects */
  clear(): void {
    for (const [id] of this.effects) this.stopEffect(id);
  }

  dispose(): void {
    this.clear();
  }
}
