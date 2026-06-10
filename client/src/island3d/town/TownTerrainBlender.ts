/**
 * TownTerrainBlender — seamless terrain-to-town ground blending.
 *
 * Creates a radial blend ring around the town that:
 *   1. Matches the procedural terrain height at the outer edge
 *   2. Matches the town ground height at the inner edge
 *   3. Blends terrain texture → town ground color via custom shader
 *   4. Adds scattered edge props (rocks, grass tufts) to break the seam
 *
 * Usage:
 *   const blender = new TownTerrainBlender(scene, terrainMesh, townRoot, townBounds);
 *   blender.build();   // creates the blend ring + edge scatter
 *   blender.dispose();
 */
import * as THREE from 'three';
import { getTerrainHeightAt } from '../terrain/IslandTerrainGenerator';

export interface TownBlendConfig {
  /** Town center world position */
  center: THREE.Vector3;
  /** Inner radius — where the town ground starts (hard town surface) */
  innerRadius: number;
  /** Outer radius — where the blend fully becomes terrain */
  outerRadius: number;
  /** Town ground Y height */
  townGroundY: number;
  /** Town ground color (hex) */
  townColor: number;
  /** Terrain color at the edges */
  terrainColor: number;
  /** Number of radial segments for the blend ring mesh */
  radialSegments?: number;
  /** Number of concentric rings */
  ringSegments?: number;
  /** Place edge scatter objects (rocks, grass) along the transition */
  enableScatter?: boolean;
}

export class TownTerrainBlender {
  private scene: THREE.Scene;
  private terrainMesh: THREE.Mesh;
  private group: THREE.Group;

  constructor(scene: THREE.Scene, terrainMesh: THREE.Mesh) {
    this.scene = scene;
    this.terrainMesh = terrainMesh;
    this.group = new THREE.Group();
    this.group.name = 'town_terrain_blend';
  }

  build(config: TownBlendConfig): THREE.Group {
    const {
      center,
      innerRadius,
      outerRadius,
      townGroundY,
      townColor,
      terrainColor,
      radialSegments = 48,
      ringSegments = 12,
      enableScatter = true,
    } = config;

    // ── 1. Create the blend ring geometry ────────────────────────
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const blendFactors: number[] = []; // 0 = terrain, 1 = town
    const indices: number[] = [];

    for (let ring = 0; ring <= ringSegments; ring++) {
      const t = ring / ringSegments; // 0 = outer edge, 1 = inner edge
      const radius = outerRadius + t * (innerRadius - outerRadius);

      // Smoothstep blend factor: 0 at outer edge → 1 at inner edge
      const blend = smoothstep(t);

      for (let seg = 0; seg <= radialSegments; seg++) {
        const angle = (seg / radialSegments) * Math.PI * 2;
        const x = center.x + Math.cos(angle) * radius;
        const z = center.z + Math.sin(angle) * radius;

        // Height: blend between terrain height and town ground Y
        const terrainY = getTerrainHeightAt(this.terrainMesh, x, z) ?? center.y;
        const y = terrainY * (1 - blend) + townGroundY * blend;

        positions.push(x, y + 0.02, z); // slight offset to avoid z-fighting
        normals.push(0, 1, 0);
        uvs.push(seg / radialSegments, t);
        blendFactors.push(blend);
      }
    }

    // Build indices (triangle strip between rings)
    for (let ring = 0; ring < ringSegments; ring++) {
      for (let seg = 0; seg < radialSegments; seg++) {
        const a = ring * (radialSegments + 1) + seg;
        const b = a + radialSegments + 1;
        indices.push(a, b, a + 1);
        indices.push(a + 1, b, b + 1);
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('aBlend', new THREE.Float32BufferAttribute(blendFactors, 1));
    geo.setIndex(indices);

    // ── 2. Blend shader material ────────────────────────────────
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTerrainColor: { value: new THREE.Color(terrainColor) },
        uTownColor: { value: new THREE.Color(townColor) },
        uSunDir: { value: new THREE.Vector3(0.5, 1, 0.3).normalize() },
      },
      vertexShader: /* glsl */ `
        attribute float aBlend;
        varying float vBlend;
        varying vec3 vWorldPos;
        varying vec3 vNormal;

        void main() {
          vBlend = aBlend;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTerrainColor;
        uniform vec3 uTownColor;
        uniform vec3 uSunDir;
        varying float vBlend;
        varying vec3 vWorldPos;
        varying vec3 vNormal;

        // Procedural noise for texture variation
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
          // Add subtle texture variation
          float n = noise(vWorldPos.xz * 0.3) * 0.15;

          // Mix terrain → town color based on blend factor
          vec3 baseColor = mix(uTerrainColor, uTownColor, vBlend);
          baseColor += vec3(n * 0.5, n * 0.3, n * 0.1);

          // Simple lighting
          float NdotL = max(dot(vNormal, uSunDir), 0.0);
          vec3 lit = baseColor * (0.4 + NdotL * 0.6);

          // Fade alpha at very outer edge to blend with terrain below
          float edgeAlpha = smoothstep(0.0, 0.15, vBlend);

          gl_FragColor = vec4(lit, edgeAlpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const blendMesh = new THREE.Mesh(geo, mat);
    blendMesh.receiveShadow = true;
    blendMesh.name = 'blend_ring';
    this.group.add(blendMesh);

    // ── 3. Edge scatter (rocks, grass along transition) ──────────
    if (enableScatter) {
      this.addEdgeScatter(center, innerRadius, outerRadius, townGroundY);
    }

    this.scene.add(this.group);
    return this.group;
  }

  private addEdgeScatter(
    center: THREE.Vector3,
    innerRadius: number,
    outerRadius: number,
    townY: number,
  ): void {
    const scatterCount = 60;

    // Rock geometry (shared)
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.9 });

    // Grass tuft geometry (shared)
    const grassGeo = new THREE.ConeGeometry(0.3, 1.2, 4);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x5a8040, roughness: 0.85 });

    for (let i = 0; i < scatterCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      // Place in the transition zone (60-90% of blend range)
      const t = 0.6 + Math.random() * 0.3;
      const radius = outerRadius + t * (innerRadius - outerRadius);
      const x = center.x + Math.cos(angle) * radius;
      const z = center.z + Math.sin(angle) * radius;

      const terrainY = getTerrainHeightAt(this.terrainMesh, x, z);
      if (terrainY === null) continue;
      const y = terrainY * (1 - t) + townY * t;

      const isRock = Math.random() > 0.6;
      const mesh = new THREE.Mesh(
        isRock ? rockGeo : grassGeo,
        isRock ? rockMat : grassMat,
      );

      mesh.position.set(x, y + (isRock ? 0.3 : 0.5), z);
      mesh.rotation.set(
        Math.random() * 0.3,
        Math.random() * Math.PI * 2,
        Math.random() * 0.3,
      );
      mesh.scale.setScalar(0.3 + Math.random() * (isRock ? 0.8 : 0.4));
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      this.group.add(mesh);
    }
  }

  dispose(): void {
    this.scene.remove(this.group);
    this.group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
        else (mesh.material as THREE.Material)?.dispose();
      }
    });
  }
}

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}
