/**
 * TownSceneLoader — loads a faction town GLB and applies biome theming.
 *
 * 1. Loads the town's GLB via the shared GLTF pipeline (DRACO-enabled)
 * 2. Walks the scene graph for named nodes:
 *      SpawnPoint_*  → extracted as runtime spawn positions
 *      NavMesh       → passed to TownNavMesh for pathfinding
 *      Collider_*    → converted to invisible bounding boxes for physics
 * 3. Applies faction-specific post-processing:
 *      - Accent point light tinted to faction color
 *      - Hemisphere light matching biome
 *      - Directional sun with shadow maps
 *      - FogExp2 from ambience config
 * 4. Builds placeholder geometry for towns without GLBs (Legion, Fabled)
 */

import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import type { FactionTown, TownSpawnPoint } from '@shared/definitions/factionTowns';
import { resolveModelUrl } from '@/lib/modelManifest';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TownSceneResult {
  /** Root group — add to your Three.js scene */
  root: THREE.Group;
  /** Town ground mesh (receives shadows) */
  ground: THREE.Mesh | null;
  /** Spawn points extracted from the GLB scene graph (merged with definition) */
  runtimeSpawns: Map<string, THREE.Vector3>;
  /** NavMesh mesh extracted from GLB (if present) */
  navMeshGeometry: THREE.BufferGeometry | null;
  /** Collider bounding boxes extracted from GLB */
  colliders: THREE.Box3[];
  /** Directional sun light */
  sunLight: THREE.DirectionalLight;
  /** Accent point light */
  accentLight: THREE.PointLight;
  /** Call every frame for animated elements (shrine particles, etc.) */
  update: (dt: number, elapsed: number) => void;
  /** Dispose all GPU resources */
  dispose: () => void;
}

// ── Shared loader (reuse DRACO decoder across calls) ─────────────────────────

const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
gltfLoader.setDRACOLoader(dracoLoader);

const glbCache = new Map<string, GLTF>();

async function loadGLB(url: string): Promise<GLTF> {
  const cached = glbCache.get(url);
  if (cached) return cached;
  const gltf = await new Promise<GLTF>((resolve, reject) => {
    gltfLoader.load(url, resolve, undefined, reject);
  });
  glbCache.set(url, gltf);
  return gltf;
}

// ── Main Builder ─────────────────────────────────────────────────────────────

export async function loadTownScene(town: FactionTown): Promise<TownSceneResult> {
  const root = new THREE.Group();
  root.name = `town_${town.id}`;

  const runtimeSpawns = new Map<string, THREE.Vector3>();
  let navMeshGeometry: THREE.BufferGeometry | null = null;
  const colliders: THREE.Box3[] = [];
  let ground: THREE.Mesh | null = null;

  // ── 1. Load or generate town geometry ──────────────────────
  let townMesh: THREE.Group;
  try {
    const url = resolveModelUrl(town.modelPath);
    const gltf = await loadGLB(url);
    townMesh = gltf.scene.clone(true);
  } catch (err) {
    console.warn(`[TownSceneLoader] GLB not available for ${town.name}, using placeholder`, err);
    townMesh = buildPlaceholderTown(town);
  }

  townMesh.scale.setScalar(town.modelScale);
  townMesh.position.set(...town.modelOffset);
  townMesh.name = 'town_model';

  // Enable shadows on all meshes
  townMesh.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }

    // Extract named nodes
    if (child.name.startsWith('SpawnPoint_')) {
      const spawnId = child.name.replace('SpawnPoint_', '');
      runtimeSpawns.set(spawnId, child.getWorldPosition(new THREE.Vector3()));
    }
    if (child.name === 'NavMesh' && (child as THREE.Mesh).isMesh) {
      navMeshGeometry = ((child as THREE.Mesh).geometry as THREE.BufferGeometry).clone();
      child.visible = false; // hide navmesh visualization
    }
    if (child.name.startsWith('Collider_') && (child as THREE.Mesh).isMesh) {
      const box = new THREE.Box3().setFromObject(child);
      colliders.push(box);
      child.visible = false;
    }
  });

  root.add(townMesh);

  // ── 2. Ground plane (fallback if no ground in GLB) ─────────
  if (!ground) {
    const geoSize = Math.max(
      town.navmesh.bounds[2] - town.navmesh.bounds[0],
      town.navmesh.bounds[3] - town.navmesh.bounds[1],
    ) * 1.5;
    const groundGeo = new THREE.PlaneGeometry(geoSize, geoSize);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: getGroundColor(town.factionId),
      roughness: 0.9,
      metalness: 0.0,
    });
    ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    ground.position.y = -0.05; // slight offset to avoid z-fighting
    ground.name = 'town_ground';
    root.add(ground);
  }

  // ── 3. Lighting ────────────────────────────────────────────
  const amb = town.ambience;

  const hemiLight = new THREE.HemisphereLight(amb.skyColor, getGroundColor(town.factionId), 0.5);
  root.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.0);
  sunLight.position.set(200, 400, 200);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -80;
  sunLight.shadow.camera.right = 80;
  sunLight.shadow.camera.top = 80;
  sunLight.shadow.camera.bottom = -80;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 800;
  sunLight.shadow.bias = -0.0005;
  root.add(sunLight);

  const accentLight = new THREE.PointLight(amb.accentLightColor, amb.accentLightIntensity, 120);
  accentLight.position.set(0, 15, 0);
  root.add(accentLight);

  // ── 4. Shrine particle marker ──────────────────────────────
  const shrineSpawn = town.spawnPoints.find(sp => sp.category === 'shrine');
  const shrineMarkers: THREE.Object3D[] = [];
  if (shrineSpawn) {
    const shrineGlow = createShrineMarker(amb.accentLightColor);
    shrineGlow.position.set(...shrineSpawn.position);
    shrineGlow.position.y += 4;
    root.add(shrineGlow);
    shrineMarkers.push(shrineGlow);

    // Shrine point light
    const shrineLight = new THREE.PointLight(amb.accentLightColor, 0.8, 30);
    shrineLight.position.copy(shrineGlow.position);
    root.add(shrineLight);
  }

  // ── 5. Populate definition spawn points into runtimeSpawns ─
  for (const sp of town.spawnPoints) {
    if (!runtimeSpawns.has(sp.id)) {
      runtimeSpawns.set(sp.id, new THREE.Vector3(...sp.position));
    }
  }

  // ── 6. Update + Dispose ────────────────────────────────────

  function update(dt: number, elapsed: number): void {
    // Pulse shrine markers
    for (const marker of shrineMarkers) {
      const scale = 1 + Math.sin(elapsed * 2) * 0.15;
      marker.scale.setScalar(scale);
    }
    // Slowly rotate accent light for subtle color shift
    accentLight.position.x = Math.sin(elapsed * 0.3) * 5;
    accentLight.position.z = Math.cos(elapsed * 0.3) * 5;
  }

  function dispose(): void {
    root.traverse(child => {
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
      if ((child as THREE.Mesh).material) {
        const mats = Array.isArray((child as THREE.Mesh).material)
          ? (child as THREE.Mesh).material as THREE.Material[]
          : [(child as THREE.Mesh).material as THREE.Material];
        mats.forEach(m => m.dispose());
      }
    });
  }

  return {
    root,
    ground,
    runtimeSpawns,
    navMeshGeometry,
    colliders,
    sunLight,
    accentLight,
    update,
    dispose,
  };
}

// ── Placeholder Town Geometry ────────────────────────────────────────────────

function buildPlaceholderTown(town: FactionTown): THREE.Group {
  const group = new THREE.Group();
  group.name = `placeholder_${town.id}`;

  const matColor = town.ambience.accentLightColor;

  // Central building (hall / forge / library)
  const hallGeo = new THREE.BoxGeometry(12, 8, 10);
  const hallMat = new THREE.MeshStandardMaterial({
    color: darken(matColor, 0.4),
    roughness: 0.8,
  });
  const hall = new THREE.Mesh(hallGeo, hallMat);
  hall.position.set(0, 4, -20);
  hall.name = 'Collider_hall';
  group.add(hall);

  // Side buildings
  for (const side of [-1, 1]) {
    const buildGeo = new THREE.BoxGeometry(8, 6, 8);
    const buildMat = new THREE.MeshStandardMaterial({
      color: darken(matColor, 0.5),
      roughness: 0.85,
    });
    const building = new THREE.Mesh(buildGeo, buildMat);
    building.position.set(side * 20, 3, -10);
    building.name = `Collider_building_${side > 0 ? 'r' : 'l'}`;
    group.add(building);
  }

  // Gate pillars
  for (const side of [-1, 1]) {
    const pillarGeo = new THREE.CylinderGeometry(1, 1.2, 8, 6);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: darken(matColor, 0.3),
      roughness: 0.7,
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(side * 8, 4, 35);
    group.add(pillar);
  }

  // Shrine platform
  const shrineGeo = new THREE.CylinderGeometry(3, 3.5, 1.5, 8);
  const shrineMat = new THREE.MeshStandardMaterial({
    color: matColor,
    emissive: matColor,
    emissiveIntensity: 0.3,
    roughness: 0.4,
  });
  const shrine = new THREE.Mesh(shrineGeo, shrineMat);
  shrine.position.set(0, 0.75, -30);
  shrine.name = 'Collider_shrine';
  group.add(shrine);

  // Market stalls
  for (const sp of town.spawnPoints.filter(s => s.category === 'merchant')) {
    const stallGeo = new THREE.BoxGeometry(4, 3, 3);
    const stallMat = new THREE.MeshStandardMaterial({
      color: 0x8b6914,
      roughness: 0.9,
    });
    const stall = new THREE.Mesh(stallGeo, stallMat);
    stall.position.set(sp.position[0], 1.5, sp.position[2]);
    stall.rotation.y = sp.facing;
    group.add(stall);
  }

  // Faction-specific decoration
  if (town.factionId === 'legion') {
    // Lava channel emissive strips
    for (const z of [-5, 5, 15]) {
      const lavaGeo = new THREE.PlaneGeometry(50, 2);
      lavaGeo.rotateX(-Math.PI / 2);
      const lavaMat = new THREE.MeshStandardMaterial({
        color: 0xff4400,
        emissive: 0xff4400,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const lava = new THREE.Mesh(lavaGeo, lavaMat);
      lava.position.set(0, 0.05, z);
      group.add(lava);
    }
  }

  if (town.factionId === 'fabled') {
    // Crystal spires
    for (const pos of [[-12, 15], [12, 15], [0, -25]] as [number, number][]) {
      const spireGeo = new THREE.ConeGeometry(1.5, 10, 6);
      const spireMat = new THREE.MeshStandardMaterial({
        color: 0x88ddff,
        emissive: 0x22c55e,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.8,
        roughness: 0.2,
      });
      const spire = new THREE.Mesh(spireGeo, spireMat);
      spire.position.set(pos[0], 5, pos[1]);
      group.add(spire);
    }
  }

  return group;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function createShrineMarker(color: number): THREE.Mesh {
  const geo = new THREE.SphereGeometry(2, 12, 12);
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.7,
    roughness: 0.3,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = false;
  mesh.name = 'shrine_marker';
  return mesh;
}

function getGroundColor(factionId: string): number {
  switch (factionId) {
    case 'crusade': return 0xc4956a; // sandy arid
    case 'legion':  return 0x2a1a10; // volcanic dark
    case 'fabled':  return 0x6b8e6b; // highland green
    default:        return 0x888888;
  }
}

function darken(hex: number, factor: number): number {
  const c = new THREE.Color(hex);
  c.multiplyScalar(1 - factor);
  return c.getHex();
}
