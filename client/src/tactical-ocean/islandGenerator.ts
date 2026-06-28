import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface IslandConfig {
  seed: number;
  radius: number;
  biome: string;
  position: THREE.Vector3;
}

export interface GeneratedIsland {
  terrainMesh: THREE.Mesh;
  propMeshes: THREE.Group;
  collisionRadius: number;
}

const BIOME_COLORS: Record<string, { grass: number; sand: number; rock: number; accent: number }> = {
  tropical: { grass: 0x4a7c23, sand: 0xe8d4a8, rock: 0x8b7355, accent: 0x2d5016 },
  volcanic: { grass: 0x3d3d3d, sand: 0x2a2a2a, rock: 0x1a1a1a, accent: 0xff4500 },
  arctic: { grass: 0xf0f8ff, sand: 0xe6f3ff, rock: 0xd4e5f7, accent: 0x87ceeb },
  desert: { grass: 0xdeb887, sand: 0xf4d03f, rock: 0xcd853f, accent: 0xffa500 },
  haunted: { grass: 0x4a4a6a, sand: 0x3d3d5c, rock: 0x2d2d4d, accent: 0x800080 }
};

class SimplexNoise {
  private perm: number[];
  private grad3: number[][];

  constructor(seed: number) {
    this.grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];
    
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = Math.floor(this.seededRandom(seed + i) * 256);
    }
    
    this.perm = new Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  private dot(g: number[], x: number, y: number): number {
    return g[0] * x + g[1] * y;
  }

  noise2D(xin: number, yin: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    
    let n0 = 0, n1 = 0, n2 = 0;
    
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    
    let i1 = 0, j1 = 0;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }
    
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.perm[ii + this.perm[jj]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
    
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
    }
    
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
    }
    
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
    }
    
    return 70 * (n0 + n1 + n2);
  }
}

export class IslandGenerator {
  private modelCache: Map<string, THREE.Group> = new Map();
  private textureCache: Map<string, THREE.Texture> = new Map();
  private loader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;

  constructor() {
    this.loader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
    this.preloadModels();
  }

  private async preloadModels() {
    const models = ['bush', 'palmer', 'rock', 'tree'];
    for (const model of models) {
      try {
        const gltf = await this.loader.loadAsync(`/models/islands/${model}.glb`);
        this.modelCache.set(model, gltf.scene.clone());
      } catch (e) {
        console.warn(`Failed to load model: ${model}`);
      }
    }
  }

  private getModel(name: string): THREE.Group | null {
    const cached = this.modelCache.get(name);
    return cached ? cached.clone() : null;
  }

  generateIsland(config: IslandConfig): GeneratedIsland {
    const noise = new SimplexNoise(config.seed);
    const colors = BIOME_COLORS[config.biome] || BIOME_COLORS.tropical;
    
    const segments = Math.max(16, Math.floor(config.radius / 2));
    const geometry = new THREE.BufferGeometry();
    
    const vertices: number[] = [];
    const colors_arr: number[] = [];
    const indices: number[] = [];
    
    const colorGrass = new THREE.Color(colors.grass);
    const colorSand = new THREE.Color(colors.sand);
    const colorRock = new THREE.Color(colors.rock);
    
    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j <= segments; j++) {
        const u = i / segments;
        const v = j / segments;
        
        const x = (u - 0.5) * config.radius * 2;
        const z = (v - 0.5) * config.radius * 2;
        
        const distFromCenter = Math.sqrt(x * x + z * z);
        const normalizedDist = distFromCenter / config.radius;
        
        let height = 0;
        if (normalizedDist < 1) {
          const edgeFalloff = Math.pow(1 - normalizedDist, 2);
          
          const noiseScale = 0.05;
          const noiseVal = noise.noise2D(x * noiseScale, z * noiseScale);
          const detailNoise = noise.noise2D(x * 0.1, z * 0.1) * 0.3;
          
          height = (noiseVal + detailNoise + 1) * 0.5 * config.radius * 0.3 * edgeFalloff;
          
          if (normalizedDist > 0.7) {
            height *= Math.pow((1 - normalizedDist) / 0.3, 0.5);
          }
        }
        
        vertices.push(x, height, z);
        
        let vertexColor: THREE.Color;
        if (normalizedDist > 0.85) {
          vertexColor = colorSand;
        } else if (height > config.radius * 0.15) {
          vertexColor = colorRock;
        } else {
          vertexColor = colorGrass;
        }
        
        colors_arr.push(vertexColor.r, vertexColor.g, vertexColor.b);
      }
    }
    
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < segments; j++) {
        const a = i * (segments + 1) + j;
        const b = a + 1;
        const c = a + (segments + 1);
        const d = c + 1;
        
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors_arr, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide
    });
    
    const terrainMesh = new THREE.Mesh(geometry, material);
    terrainMesh.position.copy(config.position);
    terrainMesh.receiveShadow = true;
    
    const propMeshes = this.generateProps(config, noise, vertices, segments);
    propMeshes.position.copy(config.position);
    
    return {
      terrainMesh,
      propMeshes,
      collisionRadius: config.radius
    };
  }

  private generateProps(
    config: IslandConfig, 
    noise: SimplexNoise, 
    vertices: number[], 
    segments: number
  ): THREE.Group {
    const group = new THREE.Group();
    const propCount = Math.floor(config.radius * 0.5);
    const colors = BIOME_COLORS[config.biome] || BIOME_COLORS.tropical;
    
    for (let i = 0; i < propCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * config.radius * 0.7;
      
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      
      const gridX = Math.floor((x / (config.radius * 2) + 0.5) * segments);
      const gridZ = Math.floor((z / (config.radius * 2) + 0.5) * segments);
      
      const idx = (gridX * (segments + 1) + gridZ) * 3;
      const y = vertices[idx + 1] || 0;
      
      if (y < 0.5) continue;
      
      let propMesh: THREE.Object3D | null = null;
      const propType = Math.random();
      
      if (config.biome === 'tropical' || config.biome === 'haunted') {
        if (propType < 0.3) {
          propMesh = this.getModel('palmer');
          if (propMesh) {
            propMesh.scale.setScalar(3 + Math.random() * 2);
          }
        } else if (propType < 0.6) {
          propMesh = this.getModel('tree');
          if (propMesh) {
            propMesh.scale.setScalar(2 + Math.random() * 1.5);
          }
        } else if (propType < 0.8) {
          propMesh = this.getModel('bush');
          if (propMesh) {
            propMesh.scale.setScalar(1.5 + Math.random());
          }
        } else {
          propMesh = this.getModel('rock');
          if (propMesh) {
            propMesh.scale.setScalar(1 + Math.random() * 0.5);
          }
        }
      } else if (config.biome === 'volcanic') {
        propMesh = this.getModel('rock');
        if (propMesh) {
          propMesh.scale.setScalar(1 + Math.random() * 2);
        }
      } else if (config.biome === 'arctic') {
        if (propType < 0.7) {
          propMesh = this.getModel('rock');
          if (propMesh) {
            propMesh.scale.setScalar(0.5 + Math.random());
          }
        }
      } else if (config.biome === 'desert') {
        if (propType < 0.3) {
          propMesh = this.getModel('rock');
          if (propMesh) {
            propMesh.scale.setScalar(0.5 + Math.random() * 1.5);
          }
        } else if (propType < 0.5) {
          propMesh = this.getModel('palmer');
          if (propMesh) {
            propMesh.scale.setScalar(2 + Math.random());
          }
        }
      }
      
      if (!propMesh) {
        const propGeo = new THREE.ConeGeometry(0.5 + Math.random() * 0.5, 2 + Math.random() * 3, 6);
        const propMat = new THREE.MeshLambertMaterial({ color: colors.accent });
        propMesh = new THREE.Mesh(propGeo, propMat);
      }
      
      propMesh.position.set(x, y, z);
      propMesh.rotation.y = Math.random() * Math.PI * 2;
      group.add(propMesh);
    }
    
    return group;
  }
}
