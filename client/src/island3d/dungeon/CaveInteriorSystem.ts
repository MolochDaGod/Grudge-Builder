/**
 * CaveInteriorSystem — load cave GLB interiors with:
 *  - Access points (enter/exit)
 *  - Floor sampling navmesh (walk grid)
 *  - Layer rules: water layer never applies inside (even Y < 0)
 *  - Island + respawnable dungeon use
 *
 * GLBs: public/models/caves/2cave.glb, old_cave_lethal_ape_redux.glb
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  CAVE_LAYERS,
  CAVE_PREFABS,
  type CavePrefabDef,
  type CavePrefabId,
  type CaveAccessPoint,
  caveInteriorSuppressesWater,
} from '@shared/definitions/caveDungeonContract';
import { assetUrl } from '@/lib/assetConfig';
import type { CharacterController3D } from '../player/CharacterController3D';

const loader = new GLTFLoader();
const templateCache = new Map<string, THREE.Group>();

export interface CaveNavCell {
  x: number;
  z: number;
  y: number;
  walkable: boolean;
}

export interface CaveInteriorSession {
  prefabId: CavePrefabId;
  def: CavePrefabDef;
  root: THREE.Group;
  accessPoints: Array<CaveAccessPoint & { worldPos: THREE.Vector3 }>;
  navCells: CaveNavCell[];
  spawn: THREE.Vector3;
  exitWorld: THREE.Vector3;
  /** Saved outdoor water level to restore on exit */
  savedWaterLevel: number;
}

export interface PlaceCaveOpts {
  prefabId: CavePrefabId;
  position: THREE.Vector3;
  yaw?: number;
  islandId?: string;
  /** If true, register as respawnable dungeon instance */
  respawnable?: boolean;
  seed?: string;
}

async function loadPrefabRoot(def: CavePrefabDef): Promise<THREE.Group> {
  const key = def.glbPath;
  const hit = templateCache.get(key);
  if (hit) return hit.clone(true) as THREE.Group;

  const urls = [def.glbPath, assetUrl(def.cdnKey), assetUrl(def.glbPath.replace(/^\//, ''))];
  let lastErr: unknown;
  for (const url of urls) {
    try {
      const gltf = await loader.loadAsync(url);
      const g = gltf.scene as THREE.Group;
      g.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const m = c as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;
          m.layers.enable(CAVE_LAYERS.caveInterior);
          m.layers.disable(CAVE_LAYERS.water);
          m.userData.caveInterior = true;
          m.userData.suppressWater = true;
        }
      });
      templateCache.set(key, g);
      return g.clone(true) as THREE.Group;
    } catch (e) {
      lastErr = e;
    }
  }
  console.warn('[CaveInterior] load failed', def.id, lastErr);
  // Procedural placeholder shell
  const fallback = new THREE.Group();
  fallback.name = `cave_fallback_${def.id}`;
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(12, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: 0x3a3530, side: THREE.DoubleSide, roughness: 0.95 }),
  );
  shell.position.y = 6;
  shell.layers.set(CAVE_LAYERS.caveInterior);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(11, 24),
    new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.layers.set(CAVE_LAYERS.caveInterior);
  floor.userData.caveFloor = true;
  fallback.add(shell, floor);
  return fallback;
}

function matchesAny(name: string, patterns: string[]): boolean {
  const n = name.toLowerCase();
  return patterns.some((p) => n.includes(p.toLowerCase()));
}

/** Sample walkable cells on floor-ish meshes (simple nav for AI + approach). */
export function bakeCaveNavmesh(
  root: THREE.Object3D,
  def: CavePrefabDef,
  cellSize = 1.5,
  halfExtent = 18,
): CaveNavCell[] {
  const floors: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) return;
    if (o.userData.caveFloor || matchesAny(o.name || '', def.floorNamePatterns)) {
      floors.push(o);
    }
  });
  if (floors.length === 0) {
    // Use entire root as fallthrough
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) floors.push(o);
    });
  }

  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const cells: CaveNavCell[] = [];
  const origin = new THREE.Vector3();

  for (let ix = -halfExtent; ix <= halfExtent; ix += cellSize) {
    for (let iz = -halfExtent; iz <= halfExtent; iz += cellSize) {
      origin.set(ix, 40, iz);
      root.localToWorld(origin);
      ray.set(origin, down);
      ray.far = 80;
      const hits = ray.intersectObjects(floors, true);
      if (hits.length === 0) {
        cells.push({ x: ix, z: iz, y: 0, walkable: false });
        continue;
      }
      const local = hits[0].point.clone();
      root.worldToLocal(local);
      // Reject near-vertical
      const n = hits[0].face?.normal;
      const walkable = !n || n.y > 0.35;
      cells.push({ x: ix, z: iz, y: local.y, walkable });
    }
  }
  return cells;
}

export class CaveInteriorSystem {
  private scene: THREE.Scene;
  private character: CharacterController3D | null = null;
  private outdoorGroup: THREE.Group;
  private session: CaveInteriorSession | null = null;
  private placedShells: THREE.Group[] = [];
  private portalHooks: Array<{
    worldPos: THREE.Vector3;
    radius: number;
    prefabId: CavePrefabId;
    exitWorld: THREE.Vector3;
  }> = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.outdoorGroup = new THREE.Group();
    this.outdoorGroup.name = 'CaveOutdoorShells';
    scene.add(this.outdoorGroup);
  }

  setCharacter(c: CharacterController3D | null): void {
    this.character = c;
  }

  get activeSession(): CaveInteriorSession | null {
    return this.session;
  }

  get isInside(): boolean {
    return this.session != null;
  }

  /**
   * Place a cave shell on the island (world). Access points become enter triggers.
   */
  async placeCaveOnIsland(opts: PlaceCaveOpts): Promise<THREE.Group | null> {
    const def = CAVE_PREFABS[opts.prefabId];
    if (!def) return null;
    const root = await loadPrefabRoot(def);
    root.scale.setScalar(def.scale);
    root.position.copy(opts.position);
    if (opts.yaw != null) root.rotation.y = opts.yaw;
    root.name = `cave_shell_${opts.prefabId}_${opts.islandId ?? 'isle'}`;
    root.userData.cavePrefabId = opts.prefabId;
    root.userData.respawnable = opts.respawnable ?? def.dungeonKind === 'respawn_dungeon';
    root.userData.seed = opts.seed ?? `${opts.prefabId}-${Date.now()}`;

    // Tag layers: shell visible in world; interior content still cave layer
    root.traverse((o) => {
      o.layers.enable(CAVE_LAYERS.world);
      o.layers.enable(CAVE_LAYERS.caveInterior);
      o.layers.disable(CAVE_LAYERS.water);
      o.userData.suppressWater = true;
    });

    this.outdoorGroup.add(root);
    this.placedShells.push(root);

    for (const ap of def.accessPoints) {
      const local = new THREE.Vector3(...ap.localPos);
      local.applyMatrix4(root.matrixWorld);
      // If matrix not updated:
      root.updateWorldMatrix(true, true);
      const wp = new THREE.Vector3(...ap.localPos);
      root.localToWorld(wp);
      this.portalHooks.push({
        worldPos: wp,
        radius: ap.radius,
        prefabId: opts.prefabId,
        exitWorld: opts.position.clone().add(new THREE.Vector3(0, 0, 6)),
      });
    }

    console.info(
      `[CaveInterior] placed ${def.name} @ (${opts.position.x.toFixed(1)}, ${opts.position.z.toFixed(1)})` +
        ` access=${def.accessPoints.length} respawn=${root.userData.respawnable}`,
    );
    return root;
  }

  /** Enter interior: teleport to spawn, suppress water, switch camera layers. */
  async enter(prefabId: CavePrefabId, exitWorld: THREE.Vector3): Promise<boolean> {
    if (this.session) this.exit();
    const def = CAVE_PREFABS[prefabId];
    if (!def || !this.character) return false;

    const root = await loadPrefabRoot(def);
    root.scale.setScalar(def.scale);
    root.position.set(0, 0, 0);
    root.name = `cave_interior_${prefabId}`;
    root.traverse((o) => {
      o.layers.set(CAVE_LAYERS.caveInterior);
      o.userData.suppressWater = true;
      o.userData.caveInterior = true;
    });
    this.scene.add(root);

    const navCells = bakeCaveNavmesh(root, def);
    const walk = navCells.filter((c) => c.walkable);
    const spawnLocal = walk.length
      ? new THREE.Vector3(walk[0].x, walk[0].y + 0.1, walk[0].z)
      : new THREE.Vector3(0, 0.5, 0);
    const spawn = spawnLocal.clone();
    root.localToWorld(spawn);

    const accessPoints = def.accessPoints.map((ap) => {
      const worldPos = new THREE.Vector3(...ap.localPos);
      root.localToWorld(worldPos);
      return { ...ap, worldPos };
    });

    const savedWaterLevel = this.character.physics?.waterLevel ?? -2;
    // Suppress ocean swim entirely while inside
    if (this.character.physics) {
      this.character.physics.waterLevel = -1e6;
    }
    this.character.model.userData.inCaveInterior = true;
    // Mark on controller for update loop
    (this.character as CharacterController3D & { caveInteriorActive?: boolean }).caveInteriorActive =
      true;

    this.character.teleportTo?.(spawn);

    this.session = {
      prefabId,
      def,
      root,
      accessPoints,
      navCells,
      spawn,
      exitWorld: exitWorld.clone(),
      savedWaterLevel,
    };

    console.info(
      `[CaveInterior] entered ${def.name} navCells=${navCells.filter((c) => c.walkable).length}` +
        ` waterSuppressed=${caveInteriorSuppressesWater(spawn.y)}`,
    );
    return true;
  }

  exit(): void {
    if (!this.session) return;
    const { root, exitWorld, savedWaterLevel } = this.session;
    this.scene.remove(root);
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose?.());
        else (mat as THREE.Material)?.dispose?.();
      }
    });

    if (this.character) {
      if (this.character.physics) {
        this.character.physics.waterLevel = savedWaterLevel;
      }
      (this.character as CharacterController3D & { caveInteriorActive?: boolean }).caveInteriorActive =
        false;
      this.character.teleportTo?.(exitWorld);
    }
    this.session = null;
    console.info('[CaveInterior] exited → outdoor water restored');
  }

  /**
   * Per-frame: access proximity (outdoor) + interior exit mouths + force no-swim.
   */
  update(_dt: number, playerPos: THREE.Vector3): { nearAccess: boolean; hint: string | null } {
    // Force water suppress while inside (even Y < 0)
    if (this.session && this.character?.physics) {
      this.character.physics.waterLevel = -1e6;
      (this.character as CharacterController3D & { caveInteriorActive?: boolean }).caveInteriorActive =
        true;
    }

    if (this.session) {
      // Exit if near any access point from inside
      for (const ap of this.session.accessPoints) {
        if (playerPos.distanceTo(ap.worldPos) < ap.radius) {
          return { nearAccess: true, hint: `Exit · ${ap.label} [E]` };
        }
      }
      return { nearAccess: false, hint: null };
    }

    for (const h of this.portalHooks) {
      if (playerPos.distanceTo(h.worldPos) < h.radius) {
        const def = CAVE_PREFABS[h.prefabId];
        return { nearAccess: true, hint: `Enter · ${def.name} [E]` };
      }
    }
    return { nearAccess: false, hint: null };
  }

  tryInteract(playerPos: THREE.Vector3): boolean {
    if (this.session) {
      for (const ap of this.session.accessPoints) {
        if (playerPos.distanceTo(ap.worldPos) < ap.radius) {
          this.exit();
          return true;
        }
      }
      return false;
    }
    for (const h of this.portalHooks) {
      if (playerPos.distanceTo(h.worldPos) < h.radius) {
        void this.enter(h.prefabId, h.exitWorld);
        return true;
      }
    }
    return false;
  }

  /** Nearest walkable nav cell (local) for AI inside cave. */
  sampleNav(localX: number, localZ: number): CaveNavCell | null {
    if (!this.session) return null;
    let best: CaveNavCell | null = null;
    let bestD = Infinity;
    for (const c of this.session.navCells) {
      if (!c.walkable) continue;
      const d = (c.x - localX) ** 2 + (c.z - localZ) ** 2;
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  dispose(): void {
    this.exit();
    for (const s of this.placedShells) {
      this.outdoorGroup.remove(s);
    }
    this.placedShells = [];
    this.portalHooks = [];
    this.scene.remove(this.outdoorGroup);
  }
}
