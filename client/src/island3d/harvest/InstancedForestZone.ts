/**
 * InstancedForestZone — scoped procedural forest for harvest zones.
 *
 * Ported from forestoutline.html (Three.js discourse instanced-forest):
 * shader bark/leaves, vertex LOD, leaf sway, roots — bounded to a circle.
 */
import * as THREE from 'three';

export interface ForestZoneConfig {
  treeCount?: number;
  forestRadius?: number;
  clearRadius?: number;
}

const LOD = {
  FADE_START: 45,
  MAX_DISTANCE: 80,
  SWAY_DISTANCE: 25,
  SWAY_FADE_START: 15,
};

const FOREST_DEFAULTS: Required<ForestZoneConfig> = {
  // Ambient canopy only — harvestable trees are separate interactive meshes
  // (forestoutline.html look + harvest hitboxes). Keep density moderate.
  treeCount: 28,
  forestRadius: 48,
  clearRadius: 9,
};

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createLeafTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const leafPath = () => {
    ctx.beginPath();
    ctx.moveTo(size * 0.5, size * 0.03);
    ctx.bezierCurveTo(size * 0.78, size * 0.18, size * 0.82, size * 0.65, size * 0.5, size * 0.97);
    ctx.bezierCurveTo(size * 0.18, size * 0.65, size * 0.22, size * 0.18, size * 0.5, size * 0.03);
  };

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#6ab560');
  grad.addColorStop(0.3, '#5aa052');
  grad.addColorStop(0.7, '#4a9045');
  grad.addColorStop(1, '#3d8038');
  leafPath();
  ctx.fillStyle = grad;
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

function createBarkTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#4a3520';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 40; i++) {
    const x = Math.random() * size;
    const w = 1 + Math.random() * 4;
    const lightness = Math.random() > 0.5 ? 25 : -25;
    ctx.fillStyle = `rgba(${100 + lightness}, ${60 + lightness}, ${30 + lightness}, 0.4)`;
    ctx.fillRect(x, 0, w, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

interface TreeType {
  levels: number;
  branchAngle: number;
  lengthFalloff: number;
  radiusFalloff: number;
  branches: number;
}

const TREE_TYPES: TreeType[] = [
  { levels: 4, branchAngle: 0.5, lengthFalloff: 0.7, radiusFalloff: 0.55, branches: 3 },
  { levels: 5, branchAngle: 0.4, lengthFalloff: 0.65, radiusFalloff: 0.5, branches: 2 },
  { levels: 4, branchAngle: 0.65, lengthFalloff: 0.72, radiusFalloff: 0.6, branches: 4 },
  { levels: 3, branchAngle: 0.55, lengthFalloff: 0.75, radiusFalloff: 0.58, branches: 3 },
];

export class InstancedForestZone {
  readonly group = new THREE.Group();
  private barkMesh: THREE.InstancedMesh | null = null;
  private leafMesh: THREE.InstancedMesh | null = null;
  private leafMat: THREE.ShaderMaterial | null = null;
  private leafTexture: THREE.CanvasTexture;
  private barkTexture: THREE.CanvasTexture;
  private time = 0;

  private readonly _matrix = new THREE.Matrix4();
  private readonly _quaternion = new THREE.Quaternion();
  private readonly _scale = new THREE.Vector3();
  private readonly _up = new THREE.Vector3(0, 1, 0);
  private readonly _color = new THREE.Color();
  private readonly _leafGeo: THREE.PlaneGeometry;
  private readonly _leafBottomY: number;

  constructor() {
    this.leafTexture = createLeafTexture();
    this.barkTexture = createBarkTexture();
    this._leafGeo = new THREE.PlaneGeometry(1, 1);
    this._leafGeo.computeBoundingBox();
    this._leafBottomY = this._leafGeo.boundingBox!.min.y;
    this.group.name = 'instanced_forest_zone';
  }

  /**
   * Generate trees in a ring around zone center (world XZ).
   * Returns world positions of tree bases for harvest hitboxes.
   */
  generate(
    seed: string,
    centerX: number,
    centerZ: number,
    groundY: number,
    options: ForestZoneConfig = {},
  ): { treePositions: THREE.Vector3[]; stats: { trees: number; branches: number; leaves: number } } {
    this.disposeMeshes();

    const cfg = { ...FOREST_DEFAULTS, ...options };
    const seedNum = seed.split('').reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

    const branchMatrices: THREE.Matrix4[] = [];
    const leafMatrices: THREE.Matrix4[] = [];
    const leafColors: number[] = [];
    const leafRandoms: number[] = [];
    const leafWobbleX: number[] = [];
    const leafWobbleY: number[] = [];
    const leafSwayPhase: number[] = [];
    const treePositions: THREE.Vector3[] = [];

    for (let i = 0; i < cfg.treeCount; i++) {
      const rand = mulberry32(seedNum + i * 54321);
      const r = cfg.clearRadius + Math.sqrt(rand()) * cfg.forestRadius;
      const theta = rand() * Math.PI * 2;
      const treeX = centerX + Math.cos(theta) * r;
      const treeZ = centerZ + Math.sin(theta) * r;
      const treeRotation = rand() * Math.PI * 2;
      treePositions.push(new THREE.Vector3(treeX, groundY, treeZ));

      const typeIndex = Math.floor(rand() * TREE_TYPES.length);
      const treeType = TREE_TYPES[typeIndex];
      const treeScale = 0.6 + rand() * 0.8;
      const leafHue = 0.25 + rand() * 0.1;
      const leafLightness = 0.35 + rand() * 0.15;
      const trunkLength = (4 + rand() * 3) * treeScale;
      const trunkRadius = (0.18 + rand() * 0.17) * treeScale;

      this.generateTree(
        treeX, treeZ, groundY, treeRotation, treeScale,
        leafHue, leafLightness, trunkLength, trunkRadius, treeType, rand,
        branchMatrices, leafMatrices, leafColors, leafRandoms, leafWobbleX, leafWobbleY, leafSwayPhase,
      );
    }

    if (branchMatrices.length === 0) {
      return { treePositions, stats: { trees: 0, branches: 0, leaves: 0 } };
    }

    this.buildMeshes(branchMatrices, leafMatrices, leafColors, leafRandoms, leafWobbleX, leafWobbleY, leafSwayPhase);

    return {
      treePositions,
      stats: {
        trees: cfg.treeCount,
        branches: branchMatrices.length,
        leaves: leafMatrices.length,
      },
    };
  }

  update(dt: number, _cameraPos: THREE.Vector3): void {
    this.time += dt;
    if (this.leafMat) {
      this.leafMat.uniforms.time.value = this.time;
    }
  }

  dispose(): void {
    this.disposeMeshes();
    this.leafTexture.dispose();
    this.barkTexture.dispose();
    this._leafGeo.dispose();
    this.group.parent?.remove(this.group);
  }

  private generateTree(
    x: number, z: number, groundY: number,
    rotation: number, scale: number,
    leafHue: number, leafLightness: number,
    trunkLength: number, trunkRadius: number,
    treeType: TreeType, rand: () => number,
    branchMatrices: THREE.Matrix4[],
    leafMatrices: THREE.Matrix4[],
    leafColors: number[],
    leafRandoms: number[],
    leafWobbleX: number[],
    leafWobbleY: number[],
    leafSwayPhase: number[],
  ): void {
    const origin = new THREE.Vector3(x, groundY, z);
    const direction = new THREE.Vector3(0, 1, 0);
    direction.x += (rand() - 0.5) * 0.12;
    direction.z += (rand() - 0.5) * 0.12;
    direction.normalize();

    this.branch(
      origin, direction, trunkLength, trunkRadius, 0,
      rotation, scale, leafHue, leafLightness, treeType, rand,
      branchMatrices, leafMatrices, leafColors, leafRandoms, leafWobbleX, leafWobbleY, leafSwayPhase,
    );
  }

  private branch(
    start: THREE.Vector3, direction: THREE.Vector3,
    length: number, radius: number, level: number,
    treeRotation: number, treeScale: number,
    leafHue: number, leafLightness: number,
    treeType: TreeType, rand: () => number,
    branchMatrices: THREE.Matrix4[],
    leafMatrices: THREE.Matrix4[],
    leafColors: number[],
    leafRandoms: number[],
    leafWobbleX: number[],
    leafWobbleY: number[],
    leafSwayPhase: number[],
  ): void {
    if (level > treeType.levels || radius < 0.012) return;

    const end = start.clone().addScaledVector(direction, length);
    const mid = start.clone().lerp(end, 0.5);

    this._quaternion.setFromUnitVectors(this._up, direction.clone().normalize());
    const topRadius = radius * treeType.radiusFalloff;
    const avgRadius = (radius + topRadius) * 0.5;
    this._scale.set(avgRadius, length, avgRadius);
    this._matrix.compose(mid, this._quaternion, this._scale);
    branchMatrices.push(this._matrix.clone());

    if (level >= treeType.levels - 1) {
      this.addLeaves(
        end, direction, treeScale, leafHue, leafLightness, rand, topRadius, level, treeType.levels,
        leafMatrices, leafColors, leafRandoms, leafWobbleX, leafWobbleY, leafSwayPhase,
      );
    }

    if (level < treeType.levels) {
      const numChildren = level === 0
        ? treeType.branches + Math.floor(rand() * 2)
        : Math.max(1, treeType.branches - Math.floor(level * 0.3));

      for (let i = 0; i < numChildren; i++) {
        const twistAngle = (i / numChildren) * Math.PI * 2 + rand() * 0.5 + treeRotation;
        const bendAngle = treeType.branchAngle + (rand() - 0.5) * 0.5;

        const perp = new THREE.Vector3(1, 0, 0);
        if (Math.abs(direction.y) < 0.9) {
          perp.crossVectors(this._up, direction).normalize();
        } else {
          perp.crossVectors(new THREE.Vector3(0, 0, 1), direction).normalize();
        }

        const childDir = direction.clone();
        childDir.applyAxisAngle(perp, bendAngle);
        childDir.applyAxisAngle(direction, twistAngle);
        childDir.normalize();

        const startT = 0.4 + rand() * 0.5;
        const childStart = start.clone().lerp(end, startT);
        const childLength = length * treeType.lengthFalloff * (0.8 + rand() * 0.4);
        const childRadius = radius * treeType.radiusFalloff;

        this.branch(
          childStart, childDir, childLength, childRadius, level + 1,
          treeRotation, treeScale, leafHue, leafLightness, treeType, rand,
          branchMatrices, leafMatrices, leafColors, leafRandoms, leafWobbleX, leafWobbleY, leafSwayPhase,
        );
      }
    }
  }

  private addLeaves(
    branchEnd: THREE.Vector3, branchDir: THREE.Vector3,
    treeScale: number, leafHue: number, leafLightness: number,
    rand: () => number, topRadius: number, level: number, maxLevel: number,
    leafMatrices: THREE.Matrix4[],
    leafColors: number[],
    leafRandoms: number[],
    leafWobbleX: number[],
    leafWobbleY: number[],
    leafSwayPhase: number[],
  ): void {
    const count = 4 + Math.floor(rand() * 3);
    const size = 0.8 * treeScale;
    const spread = 0.8 * treeScale;

    const perp1 = new THREE.Vector3(1, 0, 0);
    if (Math.abs(branchDir.y) > 0.9) perp1.set(0, 0, 1);
    perp1.crossVectors(branchDir, perp1).normalize();
    const perp2 = new THREE.Vector3().crossVectors(branchDir, perp1).normalize();

    for (let i = 0; i < count; i++) {
      const aroundAngle = rand() * Math.PI * 2;
      const outward = new THREE.Vector3()
        .addScaledVector(perp1, Math.cos(aroundAngle))
        .addScaledVector(perp2, Math.sin(aroundAngle))
        .normalize();

      const attachPoint = branchEnd.clone().addScaledVector(outward, topRadius);
      const stemDir = new THREE.Vector3()
        .addScaledVector(outward, 0.5 + rand() * 0.3)
        .addScaledVector(branchDir, 0.3 + rand() * 0.4)
        .add(new THREE.Vector3(0, 0.2 + rand() * 0.3, 0))
        .normalize();

      const leafUp = stemDir.clone();
      let leafNormal = new THREE.Vector3(0, 1, 0).addScaledVector(outward, (rand() - 0.5) * 0.5);
      leafNormal.sub(leafUp.clone().multiplyScalar(leafNormal.dot(leafUp))).normalize();
      if (leafNormal.lengthSq() < 0.1) {
        leafNormal.copy(outward);
        leafNormal.sub(leafUp.clone().multiplyScalar(leafNormal.dot(leafUp))).normalize();
      }

      const leafRight = new THREE.Vector3().crossVectors(leafUp, leafNormal).normalize();
      leafNormal.crossVectors(leafRight, leafUp).normalize();

      const rotMatrix = new THREE.Matrix4();
      rotMatrix.makeBasis(leafRight, leafUp, leafNormal);

      const jitterQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler((rand() - 0.5) * 0.3, (rand() - 0.5) * 0.3, (rand() - 0.5) * 0.2),
      );
      const leafQuat = new THREE.Quaternion().setFromRotationMatrix(rotMatrix);
      leafQuat.multiply(jitterQuat);

      const localBottom = new THREE.Vector3(0, this._leafBottomY, 0);
      const rotatedBottom = localBottom.clone().applyQuaternion(leafQuat);
      const taperFactor = 0.8 + 0.2 * (1 - level / maxLevel);
      const leafScale = size * (0.5 + rand() * 0.5) * taperFactor;
      const leafPos = attachPoint.clone().sub(rotatedBottom.clone().multiplyScalar(leafScale));

      this._scale.set(leafScale, leafScale, leafScale);
      this._matrix.compose(leafPos, leafQuat, this._scale);
      leafMatrices.push(this._matrix.clone());

      let h = leafHue + (rand() - 0.5) * 0.05;
      const s = 0.55 + rand() * 0.15;
      let l = leafLightness + (rand() - 0.5) * 0.08;
      if (rand() < 0.15) {
        if (rand() < 0.5) {
          h += 0.03;
          l = Math.min(1, l + 0.09);
        } else {
          l = Math.max(0, l - 0.09);
        }
      }
      this._color.setHSL(h, s, l);
      leafColors.push(this._color.r, this._color.g, this._color.b);
      leafRandoms.push(rand());
      leafWobbleX.push((rand() - 0.5) * 0.12);
      leafWobbleY.push((rand() - 0.5) * 0.12);
      leafSwayPhase.push(rand() * Math.PI * 2);
    }
  }

  private buildMeshes(
    branchMatrices: THREE.Matrix4[],
    leafMatrices: THREE.Matrix4[],
    leafColors: number[],
    leafRandoms: number[],
    leafWobbleX: number[],
    leafWobbleY: number[],
    leafSwayPhase: number[],
  ): void {
    const barkGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1);
    const barkMat = new THREE.ShaderMaterial({
      uniforms: {
        barkTexture: { value: this.barkTexture },
        barkColor: { value: new THREE.Color(0.24, 0.16, 0.09) },
        leafTintColor: { value: new THREE.Color(0.29, 0.52, 0.27) },
        leafFadeStart: { value: LOD.FADE_START },
        maxLeafDistance: { value: LOD.MAX_DISTANCE },
        rootSpreadMin: { value: 0.2 },
        rootSpreadMax: { value: 0.6 },
        rootHeightMin: { value: 0.3 },
        rootHeightMax: { value: 0.6 },
        rootBumpsMin: { value: 2 },
        rootBumpsMax: { value: 5 },
      },
      vertexShader: `
        uniform float leafFadeStart;
        uniform float maxLeafDistance;
        uniform float rootSpreadMin, rootSpreadMax, rootHeightMin, rootHeightMax, rootBumpsMin, rootBumpsMax;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying float vLeafTint;
        varying vec2 vUv;
        varying float vTreeRand;
        void main() {
          vec4 worldPos = instanceMatrix * vec4(position, 1.0);
          vec4 instanceCenter = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float treeRand1 = fract(sin(instanceCenter.x * 12.9898 + instanceCenter.z * 78.233) * 43758.5453);
          float treeRand2 = fract(sin(instanceCenter.x * 63.7264 + instanceCenter.z * 10.873) * 43758.5453);
          float treeRand3 = fract(sin(instanceCenter.x * 36.1734 + instanceCenter.z * 91.147) * 43758.5453);
          float rootSpread = mix(rootSpreadMin, rootSpreadMax, treeRand1);
          float rootHeight = mix(rootHeightMin, rootHeightMax, treeRand2);
          float rootBumps = floor(mix(rootBumpsMin, rootBumpsMax + 1.0, treeRand3));
          if (worldPos.y < rootHeight) {
            float rootFactor = 1.0 - (worldPos.y / rootHeight);
            rootFactor = rootFactor * rootFactor;
            vec2 outwardDir = worldPos.xz - instanceCenter.xz;
            float outwardLen = length(outwardDir);
            if (outwardLen > 0.001) outwardDir /= outwardLen; else outwardDir = vec2(1.0, 0.0);
            float angle = atan(worldPos.z - instanceCenter.z, worldPos.x - instanceCenter.x);
            float treeSeed = fract(instanceCenter.x * 12.9898 + instanceCenter.z * 78.233) * 6.28;
            float bumpiness = 1.0 + 0.7 * sin(angle * rootBumps + treeSeed);
            float spreadAmount = rootFactor * rootSpread * bumpiness * outwardLen * 3.0;
            worldPos.xz += outwardDir * spreadAmount;
            worldPos.y -= rootFactor * 0.15;
          }
          vWorldPosition = worldPos.xyz;
          vec3 toVertex = worldPos.xyz - instanceCenter.xyz;
          vec3 approxNormal = normalize(vec3(toVertex.x, 0.0, toVertex.z));
          if (abs(normal.y) > 0.9) approxNormal = vec3(0.0, sign(normal.y), 0.0);
          vNormal = approxNormal;
          float dist = length(cameraPosition - vWorldPosition);
          float safeFadeStart = min(leafFadeStart, maxLeafDistance - 1.0);
          vLeafTint = smoothstep(safeFadeStart, maxLeafDistance, dist);
          float uvAngle = atan(worldPos.z - instanceCenter.z, worldPos.x - instanceCenter.x);
          vUv = vec2(uvAngle * 1.5, worldPos.y * 0.5);
          vTreeRand = treeRand1;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform sampler2D barkTexture;
        uniform vec3 barkColor;
        uniform vec3 leafTintColor;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying float vLeafTint;
        varying vec2 vUv;
        varying float vTreeRand;
        void main() {
          vec3 N = normalize(vNormal);
          vec3 L = normalize(vec3(0.5, 1.0, 0.3));
          float NdotL = max(dot(N, L), 0.0);
          vec2 wrappedUV = fract(vUv);
          vec3 texColor = texture2D(barkTexture, wrappedUV).rgb;
          float brightness = 0.85 + vTreeRand * 0.3;
          vec3 baseColor = mix(barkColor, texColor, 0.7) * 1.8 * brightness;
          baseColor = mix(baseColor, leafTintColor, vLeafTint * 0.7);
          gl_FragColor = vec4(baseColor * (0.3 + NdotL * 0.7), 1.0);
        }
      `,
    });

    this.barkMesh = new THREE.InstancedMesh(barkGeo, barkMat, branchMatrices.length);
    this.barkMesh.castShadow = true;
    this.barkMesh.receiveShadow = true;
    branchMatrices.forEach((m, i) => this.barkMesh!.setMatrixAt(i, m));
    this.barkMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.barkMesh);

    const swayDist = LOD.SWAY_DISTANCE;
    const swayFade = LOD.SWAY_FADE_START;
    const swayRange = swayDist - swayFade;

    this.leafMat = new THREE.ShaderMaterial({
      uniforms: {
        leafTexture: { value: this.leafTexture },
        sunDirection: { value: new THREE.Vector3(0.5, 1.0, 0.3).normalize() },
        sunColor: { value: new THREE.Color(1.0, 0.98, 0.9) },
        ambientLight: { value: new THREE.Color(0.65, 0.7, 0.6) },
        time: { value: 0 },
        maxLeafDistance: { value: LOD.MAX_DISTANCE },
        leafFadeStart: { value: LOD.FADE_START },
      },
      vertexShader: `
        attribute vec3 instanceColorAttr;
        attribute float instanceRandom;
        attribute float instanceWobbleX;
        attribute float instanceWobbleY;
        attribute float instanceSwayPhase;
        uniform float time;
        uniform float maxLeafDistance;
        uniform float leafFadeStart;
        varying vec2 vUv;
        varying vec3 vColor;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying float vRandom;
        void main() {
          vec3 instancePos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          float dist = length(cameraPosition - instancePos);
          if (dist > maxLeafDistance) {
            gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
            return;
          }
          float safeFadeStart = min(leafFadeStart, maxLeafDistance - 1.0);
          float lodScale = 1.0 - smoothstep(safeFadeStart, maxLeafDistance, dist) * 0.5;
          vUv = uv;
          vColor = instanceColorAttr;
          vRandom = instanceRandom;
          vec3 pos = position * lodScale;
          float edgeDist = max(abs(pos.x), abs(pos.y)) * 2.0;
          pos.x += instanceWobbleX * edgeDist;
          pos.y += instanceWobbleY * edgeDist;
          pos *= 0.94 + instanceRandom * 0.12;
          if (dist < ${swayDist.toFixed(1)}) {
            float swayFactor = clamp(1.0 - (dist - ${swayFade.toFixed(1)}) / ${swayRange.toFixed(1)}, 0.0, 1.0);
            float s = sin(time * 1.2 + instanceSwayPhase);
            pos.x += s * 0.08 * swayFactor;
            pos.z += s * 0.05 * swayFactor;
          }
          vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
          vWorldPosition = worldPos.xyz;
          vNormal = normalize((instanceMatrix * vec4(normal, 0.0)).xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform sampler2D leafTexture;
        uniform vec3 sunDirection;
        uniform vec3 sunColor;
        uniform vec3 ambientLight;
        varying vec2 vUv;
        varying vec3 vColor;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying float vRandom;
        void main() {
          vec4 texColor = texture2D(leafTexture, vUv);
          if (texColor.a < 0.5) discard;
          vec3 N = normalize(vNormal);
          vec3 L = normalize(sunDirection);
          vec3 V = normalize(cameraPosition - vWorldPosition);
          if (!gl_FrontFacing) N = -N;
          float NdotL = max(dot(N, L), 0.0);
          float diffuse = NdotL * 0.8;
          float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.1;
          vec3 baseColor = vColor * texColor.rgb;
          baseColor *= 0.92 + vRandom * 0.16;
          vec3 litColor = baseColor * (ambientLight + sunColor * diffuse) + fresnel * vec3(0.7, 0.8, 0.6);
          gl_FragColor = vec4(litColor, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });

    this.leafMesh = new THREE.InstancedMesh(this._leafGeo, this.leafMat, leafMatrices.length);
    leafMatrices.forEach((m, i) => this.leafMesh!.setMatrixAt(i, m));

    const colorAttr = new Float32Array(leafColors);
    this.leafMesh.geometry.setAttribute('instanceColorAttr', new THREE.InstancedBufferAttribute(colorAttr, 3));
    this.leafMesh.geometry.setAttribute('instanceRandom', new THREE.InstancedBufferAttribute(new Float32Array(leafRandoms), 1));
    this.leafMesh.geometry.setAttribute('instanceWobbleX', new THREE.InstancedBufferAttribute(new Float32Array(leafWobbleX), 1));
    this.leafMesh.geometry.setAttribute('instanceWobbleY', new THREE.InstancedBufferAttribute(new Float32Array(leafWobbleY), 1));
    this.leafMesh.geometry.setAttribute('instanceSwayPhase', new THREE.InstancedBufferAttribute(new Float32Array(leafSwayPhase), 1));

    this.leafMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.leafMesh);
  }

  private disposeMeshes(): void {
    for (const child of [...this.group.children]) {
      if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
        child.geometry?.dispose();
        const mat = child.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      }
      this.group.remove(child);
    }
    this.barkMesh = null;
    this.leafMesh = null;
    this.leafMat = null;
  }
}