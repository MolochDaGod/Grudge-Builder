/**
 * VolcanicClimbIslandSystem — infinite floating-platform climb jumper.
 *
 * Pattern: https://threejs-games.github.io/examples/80-scenes/random-boxes/
 * SSOT: @shared/definitions/volcanicClimb
 *
 * - Deterministic floor layout + sector origin offset (ashen vs event islands)
 * - Sliding live window; summit chest loot; event pads
 * - makeGroundSampler() for CharacterController (single ground path)
 */
import * as THREE from 'three';
import {
  VOLCANIC_CLIMB,
  VOLCANIC_CLIMB_LOAD_ORDER,
  layoutVolcanicClimbFloor,
  volcanicClimbOrigin,
  volcanicClimbFloorBaseY,
  rollSummitChestLoot,
  type ClimbLootGrant,
  type VolcanicClimbConfig,
  type VolcanicClimbPlatformKind,
} from '@shared/definitions/volcanicClimb';
import {
  applyVariantMaterials,
  fitObjectExtent,
  loadGlbFirst,
  stripSkyboxFromObject,
} from './gltfSceneUtils';

export interface VolcanicClimbCallbacks {
  onReady?: (platformCount: number) => void;
  onSummitReached?: (floor: number, chestPos: THREE.Vector3) => void;
  onChestOpened?: (floor: number, grants: ClimbLootGrant[]) => void;
  onEventPad?: (floor: number, worldPos: THREE.Vector3) => void;
  onPrompt?: (msg: string | null) => void;
}

export interface VolcanicClimbOpts {
  scene: THREE.Scene;
  sectorId: string;
  zoneSizeM: number;
  waterLevel: number;
  config?: VolcanicClimbConfig;
  cb?: VolcanicClimbCallbacks;
  /** Optional terrain meshes for composite ground sampler */
  fallbackMeshes?: Iterable<THREE.Object3D>;
}

interface LivePlatform {
  floor: number;
  root: THREE.Group;
  baseY: number;
  kind: VolcanicClimbPlatformKind;
  isSummit: boolean;
  isEvent: boolean;
  chest?: THREE.Object3D;
  opened: boolean;
  phase: number;
}

const VOLCANIC_TINT = {
  color: 0xc45c26,
  emissive: 0xff4500,
  emissiveIntensity: 0.28,
  metalness: 0.15,
  roughness: 0.78,
};

export class VolcanicClimbIslandSystem {
  readonly root = new THREE.Group();
  private scene: THREE.Scene;
  private waterLevel: number;
  private sectorId: string;
  private cfg: VolcanicClimbConfig;
  private cb: VolcanicClimbCallbacks;
  private origin: { x: number; z: number };
  private platforms = new Map<number, LivePlatform>();
  private templates: Partial<
    Record<VolcanicClimbPlatformKind | 'rock' | 'nature' | 'island', THREE.Object3D>
  > = {};
  private fallbackMeshes: THREE.Object3D[] = [];
  private playerFloor = 0;
  private t = 0;
  private disposed = false;
  private highestFloorSeen = 0;
  private chestPromptFloor: number | null = null;
  private lastEventFloor: number | null = null;

  constructor(opts: VolcanicClimbOpts) {
    this.scene = opts.scene;
    this.waterLevel = opts.waterLevel;
    this.sectorId = opts.sectorId;
    this.cfg = opts.config ?? VOLCANIC_CLIMB;
    this.cb = opts.cb ?? {};
    this.origin = volcanicClimbOrigin(opts.sectorId, this.cfg);
    if (opts.fallbackMeshes) {
      this.fallbackMeshes = [...opts.fallbackMeshes];
    }
    this.root.name = 'VolcanicClimb_EmberSpire';
    this.root.userData.volcanicClimb = true;
    this.root.userData.sectorId = opts.sectorId;
    this.root.position.set(this.origin.x, 0, this.origin.z);
    this.scene.add(this.root);
    void this.boot();
  }

  private async boot() {
    const [rocks, nature, lyoko, spiral] = await Promise.all([
      loadGlbFirst(VOLCANIC_CLIMB_LOAD_ORDER.volcanicRocks),
      loadGlbFirst(VOLCANIC_CLIMB_LOAD_ORDER.volcanicNature),
      loadGlbFirst(VOLCANIC_CLIMB_LOAD_ORDER.lyoko),
      loadGlbFirst(VOLCANIC_CLIMB_LOAD_ORDER.spiralMountain),
    ]);

    if (this.disposed) return;

    if (rocks) {
      stripSkyboxFromObject(rocks);
      fitObjectExtent(rocks, this.cfg.platformExtentM);
      applyVariantMaterials(rocks, VOLCANIC_TINT);
      this.templates.rock = rocks;
      this.templates.large_rock = rocks;
    }
    if (nature) {
      stripSkyboxFromObject(nature);
      fitObjectExtent(nature, this.cfg.platformExtentM * 0.9);
      applyVariantMaterials(nature, {
        ...VOLCANIC_TINT,
        emissiveIntensity: 0.4,
        color: 0x8b3a1a,
      });
      this.templates.nature = nature;
      this.templates.rock_shelf = nature;
    }
    if (lyoko) {
      stripSkyboxFromObject(lyoko);
      fitObjectExtent(lyoko, this.cfg.platformExtentM * 1.1);
      applyVariantMaterials(lyoko, {
        color: 0xb45309,
        emissive: 0xea580c,
        emissiveIntensity: 0.22,
        metalness: 0.2,
        roughness: 0.7,
      });
      this.templates.island = lyoko;
      this.templates.island_shelf = lyoko;
    }
    if (spiral) {
      stripSkyboxFromObject(spiral);
      fitObjectExtent(spiral, this.cfg.largeRockExtentM);
      applyVariantMaterials(spiral, VOLCANIC_TINT);
      this.templates.summit_plate = spiral;
      this.templates.event_pad = spiral;
    }

    if (!this.templates.rock_shelf) this.templates.rock_shelf = this.procShelf(0x5c4033, 8);
    if (!this.templates.large_rock) this.templates.large_rock = this.procShelf(0x3d2b1f, 12);
    if (!this.templates.island_shelf) this.templates.island_shelf = this.procShelf(0x6b4423, 10);
    if (!this.templates.summit_plate) this.templates.summit_plate = this.procShelf(0x7c2d12, 16);
    if (!this.templates.event_pad) this.templates.event_pad = this.procShelf(0x9a3412, 11);

    this.ensureWindow(0);
    this.cb.onReady?.(this.platforms.size);
    this.cb.onPrompt?.(
      `${this.cfg.name}: hold Space · summit chest every ${this.cfg.summitEveryFloors} floors · E to open`,
    );
    console.log(
      `[VolcanicClimb] ready sector=${this.sectorId} platforms=${this.platforms.size} origin=(${this.origin.x},${this.origin.z}) rocks=${!!rocks} nature=${!!nature} lyoko=${!!lyoko} spiral=${!!spiral}`,
    );
  }

  private procShelf(color: number, size: number): THREE.Group {
    const g = new THREE.Group();
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(size * 0.45, size * 0.55, 1.2, 8),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.9,
        emissive: 0xff4500,
        emissiveIntensity: 0.15,
      }),
    );
    top.position.y = 0.6;
    top.castShadow = true;
    top.receiveShadow = true;
    g.add(top);
    const base = new THREE.Mesh(
      new THREE.DodecahedronGeometry(size * 0.4, 0),
      new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 1 }),
    );
    base.scale.set(1.2, 0.55, 1.2);
    base.position.y = -0.4;
    g.add(base);
    return g;
  }

  private makeChest(): THREE.Group {
    const g = new THREE.Group();
    g.name = 'SummitChest';
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.85, 0.95),
      new THREE.MeshStandardMaterial({
        color: 0xb45309,
        metalness: 0.55,
        roughness: 0.35,
        emissive: 0xfbbf24,
        emissiveIntensity: 0.45,
      }),
    );
    body.position.y = 0.45;
    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.22, 0.98),
      new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.6,
        roughness: 0.3,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.35,
      }),
    );
    lid.position.set(0, 0.95, 0);
    const lock = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.28, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        metalness: 0.85,
        roughness: 0.2,
        emissive: 0xfbbf24,
        emissiveIntensity: 0.8,
      }),
    );
    lock.position.set(0, 0.55, 0.5);
    const glow = new THREE.PointLight(0xfbbf24, 1.2, 12);
    glow.position.set(0, 1.2, 0);
    g.add(body, lid, lock, glow);
    g.userData.summitChest = true;
    g.userData.interact = 'summit_chest';
    return g;
  }

  private makeEventMarker(): THREE.Mesh {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(1.8, 0.18, 8, 20),
      new THREE.MeshStandardMaterial({
        color: 0xfb923c,
        emissive: 0xea580c,
        emissiveIntensity: 0.85,
      }),
    );
    m.rotation.x = Math.PI / 2;
    m.position.y = 1.2;
    m.name = 'ClimbEventPad';
    m.userData.eventPad = true;
    return m;
  }

  private spawnFloor(floor: number) {
    if (this.platforms.has(floor)) return;
    const layout = layoutVolcanicClimbFloor(floor, this.cfg);
    const src =
      this.templates[layout.kind] ??
      this.templates.rock_shelf ??
      this.procShelf(0x5c4033, 8);

    const mesh = src.clone(true);
    mesh.scale.multiplyScalar(layout.scale);
    const g = new THREE.Group();
    g.name = `ClimbFloor_${floor}_${layout.kind}`;
    g.userData.climbFloor = floor;
    g.userData.climbPlatform = true;
    g.userData.kind = layout.kind;
    g.add(mesh);

    const walkR =
      layout.kind === 'summit_plate' || layout.kind === 'large_rock' ? 5.5 : 3.8;
    const walk = new THREE.Mesh(
      new THREE.CylinderGeometry(walkR, walkR * 1.05, 0.55, 12),
      new THREE.MeshStandardMaterial({
        color: 0x3f2a1d,
        roughness: 0.95,
        transparent: true,
        opacity: 0.92,
      }),
    );
    walk.position.y = 0.2;
    walk.receiveShadow = true;
    walk.userData.walkSurface = true;
    // Explicit collider proxy (Rapier/static body can bind later via userData)
    walk.userData.collider = {
      type: 'cylinder' as const,
      radius: walkR,
      height: 0.55,
      layer: 'Terrain',
    };
    g.add(walk);

    const baseY = volcanicClimbFloorBaseY(floor, this.waterLevel, this.cfg);
    // layout x/z are local to tower origin (root already offset)
    g.position.set(layout.x, baseY, layout.z);
    g.rotation.y = layout.yaw;

    let chest: THREE.Object3D | undefined;
    if (layout.isSummit) {
      chest = this.makeChest();
      chest.position.set(0, 1.1, 0);
      g.add(chest);
    } else if (layout.isEvent) {
      g.add(this.makeEventMarker());
    }

    this.root.add(g);
    this.platforms.set(floor, {
      floor,
      root: g,
      baseY,
      kind: layout.kind,
      isSummit: layout.isSummit,
      isEvent: layout.isEvent,
      chest,
      opened: false,
      phase: floor * 0.37,
    });
  }

  private despawnFloor(floor: number) {
    const p = this.platforms.get(floor);
    if (!p) return;
    this.root.remove(p.root);
    p.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry?.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else (m as THREE.Material)?.dispose?.();
      }
    });
    this.platforms.delete(floor);
  }

  private ensureWindow(playerFloor: number) {
    const half = Math.floor(this.cfg.liveWindowFloors / 2);
    const lo = Math.max(0, playerFloor - Math.min(8, half));
    const hi = playerFloor + half;

    for (let f = lo; f <= hi; f++) this.spawnFloor(f);
    for (const f of [...this.platforms.keys()]) {
      if (f < lo - 2 || f > hi + 2) this.despawnFloor(f);
    }
  }

  samplePlatformHeight(x: number, z: number, maxY?: number): number | null {
    const top = maxY ?? this.cfg.groundSampleMaxY;
    const origin = new THREE.Vector3(x, top, z);
    const dir = new THREE.Vector3(0, -1, 0);
    const ray = new THREE.Raycaster(origin, dir, 0, top + 50);
    const hits = ray.intersectObject(this.root, true);
    if (!hits.length) return null;
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o) {
        if (
          o.userData?.climbPlatform ||
          o.userData?.walkSurface ||
          o.userData?.summitChest
        ) {
          return h.point.y;
        }
        o = o.parent;
      }
    }
    return hits[0]!.point.y;
  }

  /**
   * Climb-first ground sampler for CharacterController3D.
   * Prefer this over inlining raycasts in Island3DEngine.
   */
  makeGroundSampler(
    fallbackMeshes?: Iterable<THREE.Object3D>,
  ): (x: number, z: number) => number | null {
    const meshes = fallbackMeshes
      ? [...fallbackMeshes]
      : this.fallbackMeshes;
    const maxY = this.cfg.groundSampleMaxY;
    return (x: number, z: number) => {
      const ph = this.samplePlatformHeight(x, z, maxY);
      if (ph != null) return ph;
      if (!meshes.length) return null;
      const ray = new THREE.Raycaster(
        new THREE.Vector3(x, maxY, z),
        new THREE.Vector3(0, -1, 0),
      );
      for (const mesh of meshes) {
        const hits = ray.intersectObject(mesh, true);
        if (hits.length > 0) return hits[0]!.point.y;
      }
      return null;
    };
  }

  nearestChest(
    player: THREE.Vector3,
    range = 3.5,
  ): { floor: number; pos: THREE.Vector3 } | null {
    let best: { floor: number; pos: THREE.Vector3 } | null = null;
    let bestD = range;
    for (const p of this.platforms.values()) {
      if (!p.isSummit || p.opened || !p.chest) continue;
      const pos = new THREE.Vector3();
      p.chest.getWorldPosition(pos);
      const d = player.distanceTo(pos);
      if (d < bestD) {
        bestD = d;
        best = { floor: p.floor, pos };
      }
    }
    return best;
  }

  openChest(floor: number): ClimbLootGrant[] | null {
    const p = this.platforms.get(floor);
    if (!p?.chest || p.opened) return null;
    p.opened = true;
    const lid = p.chest.children.find(
      (c) => c instanceof THREE.Mesh && c.position.y > 0.8,
    );
    if (lid) {
      lid.rotation.x = -1.1;
      lid.position.z -= 0.15;
    }
    const grants = rollSummitChestLoot(floor, this.cfg);
    this.cb.onChestOpened?.(floor, grants);
    const summary = grants.map((g) => `${g.qty}× ${g.name}`).join(', ');
    this.cb.onPrompt?.(`Summit floor ${floor}: ${summary}`);
    return grants;
  }

  update(dt: number, playerPos?: THREE.Vector3) {
    this.t += dt;

    if (playerPos) {
      const floor = Math.max(
        0,
        Math.floor(
          (playerPos.y - this.waterLevel - this.cfg.baseHeightAboveWaterM + 2) /
            this.cfg.floorStepM,
        ),
      );
      this.playerFloor = floor;
      if (floor > this.highestFloorSeen) {
        this.highestFloorSeen = floor;
      }
      if (playerPos.y < this.cfg.maxWorldY) {
        this.ensureWindow(floor);
      }

      for (const p of this.platforms.values()) {
        if (!p.isSummit || p.opened) continue;
        if (Math.abs(playerPos.y - p.baseY) < 3.5) {
          const world = new THREE.Vector3();
          p.root.getWorldPosition(world);
          const dx = playerPos.x - world.x;
          const dz = playerPos.z - world.z;
          if (dx * dx + dz * dz < 36) {
            const chestPos = new THREE.Vector3();
            p.chest?.getWorldPosition(chestPos);
            this.cb.onSummitReached?.(p.floor, chestPos);
            if (this.chestPromptFloor !== p.floor) {
              this.chestPromptFloor = p.floor;
              this.cb.onPrompt?.(
                `Summit floor ${p.floor} — approach chest and press E`,
              );
            }
          }
        }
      }

      for (const p of this.platforms.values()) {
        if (!p.isEvent) continue;
        const world = new THREE.Vector3();
        p.root.getWorldPosition(world);
        const dx = playerPos.x - world.x;
        const dz = playerPos.z - world.z;
        if (
          dx * dx + dz * dz < 25 &&
          Math.abs(playerPos.y - p.baseY) < 4 &&
          this.lastEventFloor !== p.floor
        ) {
          this.lastEventFloor = p.floor;
          this.cb.onEventPad?.(p.floor, world.clone());
        }
      }
    }

    const { bobAmp, bobHz } = this.cfg;
    for (const p of this.platforms.values()) {
      const bob = Math.sin(this.t * Math.PI * 2 * bobHz + p.phase) * bobAmp;
      p.root.position.y = p.baseY + bob;
      if (p.isEvent) p.root.rotation.y += dt * 0.15;
    }
  }

  get liveCount() {
    return this.platforms.size;
  }

  get highestFloor() {
    return this.highestFloorSeen;
  }

  get towerOrigin() {
    return { ...this.origin };
  }

  dispose() {
    this.disposed = true;
    this.scene.remove(this.root);
    for (const f of [...this.platforms.keys()]) this.despawnFloor(f);
    this.platforms.clear();
  }
}
