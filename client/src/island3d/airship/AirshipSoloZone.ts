/**
 * AirshipSoloZone — 4-character Warlords airship.
 * Walk hull Object_163_1 · wheels Object_16 / Object_111.
 * Account heroes plant on project (6) capsules then wander 163_1.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { assetUrl } from '@/lib/assetConfig';
import { fitCharacterRootToHeightM } from '@/island3d/zoneWorldScale';
import {
  AIRSHIP_ZONE_PATHS,
  AIRSHIP_NPCS,
  AIRSHIP_HERO_HEIGHT_M,
  AIRSHIP_CABIN_DOOR_LOCAL,
  AIRSHIP_DECK_SPAWN_LOCAL,
  AIRSHIP_CABIN_SPAWN_LOCAL,
  airshipHasSavedCharacter,
  markAirshipCharacterCreated,
  loadAirshipCharacter,
  type AirshipNpcDef,
  type AirshipNpcId,
} from '@shared/definitions/airshipSoloZone';
import {
  deploySafeCharacter,
  formatSafeReport,
} from '@/lib/safeCharacter';
import {
  AIRSHIP_DECK_JUMP,
  createJumpState,
  stepPlatformerJump,
  type PlatformerJumpState,
} from '@/island3d/physics/PlatformerJump';
import {
  polishOpenerAirshipScene,
  findDeckPosts,
  type DeckPostKind,
} from '@/island3d/airship/airshipScenePolish';
import {
  bindDeck163,
  sampleHullHeight,
  wanderPointsForBand,
  type Deck163Bind,
  type Deck163SlotPin,
  type DeckBand,
} from '@/island3d/airship/airshipDeck163';
import { MeshSceneNavMesh } from '@/island3d/navigation/MeshSceneNavMesh';
import type { Character } from '@/lib/characterManager';
import { loadCrewHero } from '@/components/heroes/heroesCrewLoader';
import {
  ensureSharedGltfReady,
  loadGltfCached,
} from '@/lib/three/SharedGltfPipeline';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type AirshipZonePhase = 'loading' | 'cabin_create' | 'deck' | 'chat';

export interface AirshipZoneEvents {
  onPhase?: (p: AirshipZonePhase) => void;
  onPrompt?: (msg: string | null) => void;
  onChat?: (npc: AirshipNpcDef, line: string) => void;
  onReady?: () => void;
  onError?: (err: string) => void;
}

interface NpcRuntime {
  def: AirshipNpcDef;
  root: THREE.Group;
  waypointIndex: number;
  idle: number;
  inCabin: boolean;
  band: DeckBand;
  path: THREE.Vector3[];
  pathIdx: number;
}

export class AirshipSoloZone {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;

  private mount: HTMLElement;
  private events: AirshipZoneEvents;
  private airshipRoot: THREE.Group | null = null;
  private cabinRoot: THREE.Group | null = null;
  private doorMarker: THREE.Mesh | null = null;
  private npcs = new Map<AirshipNpcId, NpcRuntime>();
  private playerRoot: THREE.Group | null = null;
  private keys = new Set<string>();
  private phase: AirshipZonePhase = 'loading';
  private raf = 0;
  private clock = new THREE.Clock();
  private _disposed = false;
  private playerLocal = new THREE.Vector3(
    AIRSHIP_CABIN_SPAWN_LOCAL.x,
    AIRSHIP_CABIN_SPAWN_LOCAL.y,
    AIRSHIP_CABIN_SPAWN_LOCAL.z,
  );
  private playerYaw = 0;
  private inCabin = true;
  private eLatch = false;
  private chatCooldown = 0;
  private doorLocal = { ...AIRSHIP_CABIN_DOOR_LOCAL };
  private deckSpawn = { ...AIRSHIP_DECK_SPAWN_LOCAL };
  /** random-boxes FLY_JUMP (hold Space) on deck / cabin floor */
  private jumpState: PlatformerJumpState = createJumpState();
  private spaceWasDown = false;

  constructor(mount: HTMLElement, events: AirshipZoneEvents = {}) {
    this.mount = mount;
    this.events = events;

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    mount.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.48;

    // Stylized sky — warm dusk/ether for opener
    this.scene.background = new THREE.Color(0x9ec8e8);
    this.scene.fog = new THREE.FogExp2(0xc9b48a, 0.0065);
    this.renderer.toneMappingExposure = 1.12;

    const hemi = new THREE.HemisphereLight(0xffe8d0, 0x3a4a5a, 0.95);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffe0b8, 1.35);
    sun.position.set(40, 80, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    this.scene.add(sun);
    // Fill rim (toon read)
    const fill = new THREE.DirectionalLight(0x88aadd, 0.35);
    fill.position.set(-30, 20, -40);
    this.scene.add(fill);

    // Soft sky pad — hidden when Object_163_1 is the walk mesh
    const deckPad = new THREE.Mesh(
      new THREE.CircleGeometry(90, 48),
      new THREE.MeshToonMaterial({ color: 0x3d5c4a }),
    );
    deckPad.name = 'legacy_deck_pad';
    deckPad.rotation.x = -Math.PI / 2;
    deckPad.position.y = -0.5;
    deckPad.receiveShadow = true;
    this.scene.add(deckPad);
    this.legacyDeckPad = deckPad;

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.onResize();
  }

  async start(): Promise<void> {
    try {
      await this.applyCameraFromProject();
      await this.loadAirship();
      try {
        await this.loadCabin();
      } catch (e) {
        console.warn('[AirshipZone] cabin skip — deck still playable', e);
      }
      try {
        await this.spawnNpcs();
      } catch (e) {
        console.warn('[AirshipZone] npc skip', e);
      }
      await this.setupPlayer();
      this.setPhase(airshipHasSavedCharacter() ? 'deck' : 'cabin_create');
      if (this.phase === 'deck') {
        this.exitCabinToDeck(false);
      } else {
        this.enterCabin(true);
      }
      this.events.onReady?.();
      this.loop();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.events.onError?.(msg);
      console.error('[AirshipZone]', e);
    }
  }

  private setPhase(p: AirshipZonePhase) {
    this.phase = p;
    this.events.onPhase?.(p);
  }

  private async applyCameraFromProject(): Promise<void> {
    try {
      const res = await fetch(assetUrl(AIRSHIP_ZONE_PATHS.camera));
      if (!res.ok) throw new Error(`camera ${res.status}`);
      const data = await res.json();
      const mat = data?.camera?.object?.matrix as number[] | undefined;
      if (mat && mat.length >= 16) {
        const m = new THREE.Matrix4().fromArray(mat);
        m.decompose(this.camera.position, this.camera.quaternion, new THREE.Vector3());
      } else {
        this.camera.position.set(12, 10, 18);
      }
      const center = data?.controls?.center as number[] | undefined;
      if (center?.length === 3) {
        this.controls.target.set(center[0], center[1], center[2]);
      } else {
        this.controls.target.set(0, 3, 0);
      }
      if (data?.camera?.object?.fov) this.camera.fov = data.camera.object.fov;
      const pins = data?.deck163?.slots as Deck163SlotPin[] | undefined;
      if (Array.isArray(pins) && pins.length) {
        this.bakedSlots = pins.filter((s) => Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.z));
      }
      this.camera.updateProjectionMatrix();
      this.controls.update();
    } catch {
      this.camera.position.set(14, 12, 20);
      this.controls.target.set(0, 3, 0);
      this.controls.update();
    }
  }

  private deckPosts: Record<DeckPostKind, THREE.Vector3> | null = null;
  private deck163: Deck163Bind | null = null;
  private bakedSlots: Deck163SlotPin[] | null = null;
  private legacyDeckPad: THREE.Mesh | null = null;
  private deckNav: Partial<Record<DeckBand, MeshSceneNavMesh>> = {};
  private accountCrew: Array<{
    heroId: string;
    root: THREE.Group;
    wp: THREE.Vector3[];
    idx: number;
    idle: number;
    band: DeckBand;
    path: THREE.Vector3[];
    pathIdx: number;
  }> = [];

  private async loadGltfChain(urls: string[]): Promise<GLTF> {
    await ensureSharedGltfReady();
    let last: unknown;
    for (const u of urls) {
      try {
        return await loadGltfCached(assetUrl(u), 'critical');
      } catch (e) {
        last = e;
        console.warn('[AirshipZone] load miss', u, e);
      }
    }
    throw last instanceof Error ? last : new Error('[AirshipZone] all GLB candidates failed');
  }

  private async loadAirship(): Promise<void> {
    // CDN R2 first (assetUrl → /api/assets); no local FBX/GLB in git
    const gltf = await this.loadGltfChain([
      AIRSHIP_ZONE_PATHS.airship,
      AIRSHIP_ZONE_PATHS.airshipLegacy,
    ]);
    this.airshipRoot = gltf.scene as THREE.Group;
    this.airshipRoot.name = 'airship_opener_scene';

    let polish: ReturnType<typeof polishOpenerAirshipScene>;
    try {
      polish = polishOpenerAirshipScene(this.airshipRoot);
    } catch (e) {
      console.warn('[AirshipZone] polish skip', e);
      polish = { scale: 1, welded: 0, materials: 0, posts: findDeckPosts(this.airshipRoot) };
    }
    this.deckPosts = polish.posts;
    console.info(
      `[AirshipZone] opener polish scale=${polish.scale.toFixed(4)} welded=${polish.welded} mats=${polish.materials}`,
    );

    this.scene.add(this.airshipRoot);
    this.deck163 = bindDeck163(this.airshipRoot, this.bakedSlots);
    if (this.deck163) {
      if (this.legacyDeckPad) this.legacyDeckPad.visible = false;
      // Pathfinding bake deferred — production minify was throwing Ve/Je from
      // three-pathfinding mergeVertices / createZone on this hull. Waypoint + hull ray is enough.
      this.frameCameraOnHull(this.deck163);
      console.info(
        `[AirshipZone] deck163 hull=${this.deck163.hull.name} wheels=${this.deck163.wheels.map((w) => w.name).join(',')} slots=${this.deck163.slots.length}`,
      );
    }
    this.retargetNpcWaypointsToShip();
  }

  private bakeDeck163Nav(bind: Deck163Bind): void {
    for (const nav of Object.values(this.deckNav)) nav?.dispose();
    this.deckNav = {};
    const bands: DeckBand[] = ['top', 'mid', 'low'];
    for (const band of bands) {
      const y = bind.bandY[band];
      try {
        this.deckNav[band] = new MeshSceneNavMesh(bind.hull, {
          zoneId: `deck163_${band}`,
          cellSizeM: 0.55,
          floorNormalYMin: 0.35,
          maxSampleHeight: 24,
          yMin: y.min,
          yMax: y.max,
        });
      } catch (e) {
        console.warn('[AirshipZone] deck nav bake skip', band, e);
      }
    }
  }

  private frameCameraOnHull(bind: Deck163Bind): void {
    const home = bind.johnHome;
    const camY = this.camera.position.y;
    if (Math.abs(camY - home.y) < 24) return;
    this.camera.position.set(home.x + 10, home.y + 6, home.z + 14);
    this.controls.target.set(home.x, home.y + 1.6, home.z);
    this.controls.update();
  }

  private retargetNpcWaypointsToShip(): void {
    if (!this.airshipRoot) return;
    const d163 = this.deck163;
    if (d163) {
      const john = wanderPointsForBand(d163, 'top', 4);
      john.unshift(d163.johnHome);
      const scourge = wanderPointsForBand(d163, 'mid', 4);
      scourge.unshift(d163.scourgeHome);
      const rac = wanderPointsForBand(d163, 'low', 4);
      rac.unshift(d163.racalvinHome);
      for (const def of AIRSHIP_NPCS) {
        const pts =
          def.role === 'helm' ? john : def.role === 'bow_patrol' ? scourge : rac;
        def.waypoints = pts.map((p) => ({ x: p.x, y: p.y, z: p.z }));
        const h = pts[0]!;
        def.cameraFocusLocal = { x: h.x, y: h.y + 2.2, z: h.z - 2 };
      }
      this.doorLocal = {
        x: d163.racalvinHome.x,
        y: d163.racalvinHome.y + 0.05,
        z: d163.racalvinHome.z,
      };
      this.deckSpawn = {
        x: d163.slots[0]?.x ?? d163.johnHome.x,
        y: d163.slots[0]?.y ?? d163.johnHome.y,
        z: d163.slots[0]?.z ?? d163.johnHome.z,
      };
      return;
    }
    const posts = this.deckPosts;
    const box = new THREE.Box3().setFromObject(this.airshipRoot);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const halfL = size.z * 0.45;
    const halfW = size.x * 0.35;
    const deckY = box.min.y + size.y * 0.35;
    const upperY = box.min.y + size.y * 0.55;

    const helm = posts?.helm ?? new THREE.Vector3(center.x, upperY, center.z - halfL * 0.75);
    const bow = posts?.bow ?? new THREE.Vector3(center.x, upperY, center.z + halfL * 0.78);
    const mid = posts?.mid ?? new THREE.Vector3(center.x, deckY, center.z + halfL * 0.15);

    for (const def of AIRSHIP_NPCS) {
      if (def.role === 'helm') {
        // Captain John Wayne — fixed post at helm/wheel
        def.waypoints = [{ x: helm.x, y: helm.y, z: helm.z }];
        def.cameraFocusLocal = { x: helm.x, y: helm.y + 2.2, z: helm.z - 2 };
      } else if (def.role === 'bow_patrol') {
        // Scourge — front post + short bow patrol
        def.waypoints = [
          { x: bow.x - halfW * 0.15, y: bow.y, z: bow.z },
          { x: bow.x + halfW * 0.15, y: bow.y, z: bow.z + halfL * 0.05 },
          { x: bow.x, y: bow.y, z: bow.z + halfL * 0.08 },
          { x: bow.x - halfW * 0.1, y: bow.y, z: bow.z },
        ];
        def.cameraFocusLocal = { x: bow.x, y: bow.y + 2.2, z: bow.z + 2 };
      } else {
        // Racalvin — mid deck post + wander (mentor)
        def.waypoints = [
          { x: mid.x, y: mid.y, z: mid.z },
          { x: mid.x + halfW * 0.35, y: mid.y, z: mid.z - halfL * 0.12 },
          { x: mid.x - halfW * 0.35, y: mid.y, z: mid.z + halfL * 0.12 },
          { x: mid.x, y: mid.y, z: mid.z + halfL * 0.2 },
        ];
        def.cameraFocusLocal = { x: mid.x, y: mid.y + 2, z: mid.z + 2 };
      }
    }

    this.doorLocal = {
      x: mid.x,
      y: mid.y + 0.05,
      z: mid.z + halfL * 0.05,
    };
    this.deckSpawn = {
      x: mid.x,
      y: mid.y + 0.12,
      z: mid.z + halfL * 0.12,
    };
  }

  private async loadCabin(): Promise<void> {
    const gltf = await this.loadGltfChain([
      AIRSHIP_ZONE_PATHS.interior,
      AIRSHIP_ZONE_PATHS.interiorFallback,
    ]);
    this.cabinRoot = gltf.scene as THREE.Group;
    this.cabinRoot.name = 'airship_cabin';
    // Boat-inside voxel: weld + toon polish (same pipeline, smaller span)
    try {
      const { weldSceneGeometries, applyStylizedToonMaterials, fitOpenerSceneToSpan } =
        await import('@/island3d/airship/airshipScenePolish');
      weldSceneGeometries(this.cabinRoot);
      fitOpenerSceneToSpan(this.cabinRoot, 14);
      applyStylizedToonMaterials(this.cabinRoot);
    } catch {
      this.cabinRoot.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
    }
    // Position cabin under / inside ship mid-deck hatch
    if (this.airshipRoot) {
      const box = new THREE.Box3().setFromObject(this.airshipRoot);
      const c = box.getCenter(new THREE.Vector3());
      const deckY = this.deckSpawn.y > 0 ? this.deckSpawn.y - 0.4 : box.min.y + 0.8;
      this.cabinRoot.position.set(
        this.doorLocal.x || c.x,
        deckY - 2.2,
        this.doorLocal.z || c.z,
      );
    }
    // Floor plate
    const box = new THREE.Box3().setFromObject(this.cabinRoot);
    const floorY = box.isEmpty() ? 0 : box.min.y + 0.05;
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.15, 12),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    floor.position.set(0, floorY, 0);
    floor.name = 'cabin_floor';
    this.cabinRoot.add(floor);
    this.scene.add(this.cabinRoot);

    // Hatch marker on deck
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.55, 24),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(this.doorLocal.x, this.doorLocal.y, this.doorLocal.z);
    ring.name = 'cabin_hatch_marker';
    this.doorMarker = ring;
    this.scene.add(ring);
  }

  /**
   * Load NPC mesh: production GLB on R2 only (no FBX in runtime).
   * Fallback: fleet grudge6 WK race kit (mesh+texture equip system).
   */
  private async loadNpcModel(path: string): Promise<THREE.Group> {
    const candidates = [path, AIRSHIP_ZONE_PATHS.grudge6HumanFallback];
    let last: unknown;
    for (const p of candidates) {
      try {
        // Never load .fbx in production path — convert to .prod.glb on R2
        if (p.toLowerCase().endsWith('.fbx')) {
          console.warn('[AirshipZone] skipping FBX (not in CDN pipeline)', p);
          continue;
        }
        const gltf = await loadGltfCached(assetUrl(p), 'high');
        return gltf.scene as THREE.Group;
      } catch (e) {
        last = e;
      }
    }
    throw last instanceof Error ? last : new Error(`NPC model failed ${path}`);
  }

  private async spawnNpcs(): Promise<void> {
    for (const def of AIRSHIP_NPCS) {
      try {
        const model = await this.loadNpcModel(def.modelPath);
        const root = new THREE.Group();
        root.name = `npc_${def.id}`;
        root.add(model);
        fitCharacterRootToHeightM(model, 1, def.heightM);
        // Production GLB / grudge6 — art-forward auto
        deploySafeCharacter(model, {
          targetHeightM: def.heightM,
          facePlusZ: 'auto',
          importPipeline: 'glb-baked',
        });
        model.userData.npcId = def.id;
        model.userData.interactable = true;
        model.userData.safeNpc = true;
        model.userData.postRole = def.role;

        const wp0 = def.waypoints[0]!;
        // Racalvin starts in boatvoxelinside cabin until grudge6 create
        const startInCabin = def.id === 'racalvin_king' && !airshipHasSavedCharacter();
        if (startInCabin && this.cabinRoot) {
          root.position.set(
            this.cabinRoot.position.x,
            this.cabinRoot.position.y + 0.2,
            this.cabinRoot.position.z + 1.5,
          );
        } else {
          // Plant feet on post Y (wp is already deck height)
          root.position.set(wp0.x, wp0.y, wp0.z);
        }
        // Small post marker under feet (gold = station)
        if (!startInCabin) {
          const postMark = new THREE.Mesh(
            new THREE.CylinderGeometry(0.22, 0.28, 0.08, 10),
            new THREE.MeshToonMaterial({ color: 0xd4a017 }),
          );
          postMark.position.set(0, 0.02, 0);
          postMark.name = `post_${def.id}`;
          root.add(postMark);
        }
        this.scene.add(root);
        this.npcs.set(def.id, {
          def,
          root,
          waypointIndex: 0,
          idle: 0,
          inCabin: startInCabin,
          band: def.role === 'helm' ? 'top' : def.role === 'bow_patrol' ? 'mid' : 'low',
          path: [],
          pathIdx: 0,
        });
      } catch (e) {
        console.warn('[AirshipZone] NPC load failed', def.id, e);
        // Placeholder capsule so scene still works
        const root = new THREE.Group();
        root.name = `npc_${def.id}_placeholder`;
        const body = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.35, 1.2, 4, 8),
          new THREE.MeshToonMaterial({ color: 0x884422 }),
        );
        body.position.y = 1;
        root.add(body);
        const wp0 = def.waypoints[0]!;
        root.position.set(wp0.x, wp0.y, wp0.z);
        this.scene.add(root);
        this.npcs.set(def.id, {
          def,
          root,
          waypointIndex: 0,
          idle: 0,
          inCabin: def.id === 'racalvin_king' && !airshipHasSavedCharacter(),
          band: def.role === 'helm' ? 'top' : def.role === 'bow_patrol' ? 'mid' : 'low',
          path: [],
          pathIdx: 0,
        });
      }
    }
  }

  private async setupPlayer(): Promise<void> {
    this.playerRoot = new THREE.Group();
    this.playerRoot.name = 'airship_player';
    // Temporary capsule until grudge6 race loaded after create
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 1.3, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a7ab5 }),
    );
    body.position.y = 1.0;
    body.name = 'player_placeholder';
    this.playerRoot.add(body);
    this.playerRoot.userData.isPlayer = true;
    this.scene.add(this.playerRoot);

    const saved = loadAirshipCharacter();
    if (saved?.raceId) {
      await this.applyGrudge6RaceToPlayer(saved.raceId).catch((e) =>
        console.warn('[AirshipZone] race apply', e),
      );
    }
  }

  /** Swap placeholder for grudge6 race kit (production CDN). */
  async applyGrudge6RaceToPlayer(raceId: string): Promise<void> {
    if (!this.playerRoot) return;
    const { normalizeRaceId, raceMeshPrefix } = await import('@shared/fleet');
    const id = normalizeRaceId(raceId);
    const prefix = raceMeshPrefix(id);
    const path = `/models/grudge6/races/${prefix}_Characters.glb`;
    try {
      const gltf = await loadGltfCached(assetUrl(path), 'critical');
      // Clear placeholder
      while (this.playerRoot.children.length) {
        this.playerRoot.remove(this.playerRoot.children[0]!);
      }
      const model = gltf.scene as THREE.Group;
      this.playerRoot.add(model);
      const { applyGrudge6RaceTextures } = await import('@/lib/grudge6Textures');
      await applyGrudge6RaceTextures(model, id);
      const dep = deploySafeCharacter(model, {
        targetHeightM: AIRSHIP_HERO_HEIGHT_M,
        importPipeline: 'glb-baked',
        raceId: id,
        facePlusZ: 'auto',
      });
      if (!dep.report.ok) {
        console.warn(formatSafeReport(dep.report));
        fitCharacterRootToHeightM(model, 1, AIRSHIP_HERO_HEIGHT_M);
      }
    } catch (e) {
      console.warn('[AirshipZone] grudge6 race load failed, keep capsule', path, e);
      fitCharacterRootToHeightM(this.playerRoot, 1, AIRSHIP_HERO_HEIGHT_M);
    }
  }

  /** Called from UI after player accepts grudge6 create. */
  async completeCharacterCreate(opts: {
    name: string;
    raceId: string;
    classId: string;
  }): Promise<void> {
    const id = `airship_${Date.now().toString(36)}`;
    markAirshipCharacterCreated({
      id,
      name: opts.name,
      raceId: opts.raceId,
      classId: opts.classId,
    });
    await this.applyGrudge6RaceToPlayer(opts.raceId);
    // Racalvin leaves cabin to deck
    const rac = this.npcs.get('racalvin_king');
    if (rac) {
      rac.inCabin = false;
      const wp = rac.def.waypoints[0]!;
      rac.root.position.set(wp.x, wp.y, wp.z);
    }
    this.exitCabinToDeck(true);
    this.setPhase('deck');
    this.events.onPrompt?.('Welcome aboard. Meet the crew — E to talk.');
  }

  private enterCabin(firstTime: boolean) {
    this.inCabin = true;
    if (this.cabinRoot) this.cabinRoot.visible = true;
    if (this.doorMarker) this.doorMarker.visible = !firstTime;
    this.playerLocal.set(
      AIRSHIP_CABIN_SPAWN_LOCAL.x,
      AIRSHIP_CABIN_SPAWN_LOCAL.y,
      AIRSHIP_CABIN_SPAWN_LOCAL.z,
    );
    if (this.cabinRoot && this.playerRoot) {
      this.playerRoot.position.set(
        this.cabinRoot.position.x + this.playerLocal.x,
        this.cabinRoot.position.y + this.playerLocal.y + 0.1,
        this.cabinRoot.position.z + this.playerLocal.z,
      );
    }
    // Camera into cabin
    if (this.cabinRoot) {
      const p = this.cabinRoot.position;
      this.camera.position.set(p.x + 4, p.y + 3, p.z + 5);
      this.controls.target.set(p.x, p.y + 1.2, p.z);
      this.controls.update();
    }
    this.events.onPrompt?.(
      firstTime
        ? 'Racalvin: forge your grudge6 captain. Accept to walk onto the deck.'
        : 'Cabin safe zone · E at hatch to return to deck',
    );
  }

  private exitCabinToDeck(animateCam: boolean) {
    this.inCabin = false;
    if (this.cabinRoot) this.cabinRoot.visible = true; // keep loaded
    if (this.doorMarker) this.doorMarker.visible = true;
    if (this.playerRoot) {
      this.playerRoot.position.set(this.deckSpawn.x, this.deckSpawn.y, this.deckSpawn.z);
    }
    this.playerLocal.set(this.deckSpawn.x, this.deckSpawn.y, this.deckSpawn.z);
    if (animateCam) {
      this.camera.position.set(
        this.deckSpawn.x + 10,
        this.deckSpawn.y + 8,
        this.deckSpawn.z + 12,
      );
      this.controls.target.set(this.deckSpawn.x, this.deckSpawn.y + 1.5, this.deckSpawn.z);
      this.controls.update();
    }
  }

  /** Top-bar: focus camera on NPC and optionally open create at door. */
  focusNpc(id: AirshipNpcId): void {
    const npc = this.npcs.get(id);
    if (!npc) return;
    const f = npc.def.cameraFocusLocal;
    const p = npc.root.position;
    this.camera.position.set(p.x + 6, f.y + 2, p.z + 8);
    this.controls.target.copy(p).add(new THREE.Vector3(0, 1.4, 0));
    this.controls.update();
    this.events.onPrompt?.(`${npc.def.displayName} — ${npc.def.title}`);
  }

  /** Camera to cabin door then signal create UI. */
  openCreateAtDoor(): void {
    const d = this.doorLocal;
    this.camera.position.set(d.x + 5, d.y + 4, d.z + 7);
    this.controls.target.set(d.x, d.y + 1, d.z);
    this.controls.update();
    this.enterCabin(false);
    this.setPhase('cabin_create');
    this.events.onPrompt?.('Character creation — choose grudge6 race, then Accept.');
  }

  private nearestNpc(radius = 2.8): NpcRuntime | null {
    if (!this.playerRoot) return null;
    let best: NpcRuntime | null = null;
    let bestD = radius;
    const pp = this.playerRoot.position;
    for (const npc of this.npcs.values()) {
      // Racalvin only interactable in cabin while first-time
      if (npc.def.id === 'racalvin_king' && this.inCabin && npc.inCabin) {
        const d = pp.distanceTo(npc.root.position);
        if (d < bestD) {
          bestD = d;
          best = npc;
        }
        continue;
      }
      if (this.inCabin && npc.def.realm === 'deck') continue;
      if (!this.inCabin && npc.def.realm === 'cabin') continue;
      if (npc.inCabin && !this.inCabin) continue;
      const d = pp.distanceTo(npc.root.position);
      if (d < bestD) {
        bestD = d;
        best = npc;
      }
    }
    return best;
  }

  private tryInteract(): void {
    if (this.chatCooldown > 0) return;

    // Hatch E
    if (!this.inCabin && this.playerRoot) {
      const d = this.playerRoot.position.distanceTo(
        new THREE.Vector3(this.doorLocal.x, this.doorLocal.y, this.doorLocal.z),
      );
      if (d < 2.5) {
        this.enterCabin(false);
        this.setPhase(airshipHasSavedCharacter() ? 'deck' : 'cabin_create');
        return;
      }
    }
    if (this.inCabin && this.playerRoot && airshipHasSavedCharacter()) {
      const exit = this.cabinRoot
        ? this.cabinRoot.position.clone().add(new THREE.Vector3(0, 0.2, 3))
        : new THREE.Vector3(this.doorLocal.x, this.doorLocal.y, this.doorLocal.z);
      if (this.playerRoot.position.distanceTo(exit) < 3.5) {
        this.exitCabinToDeck(true);
        this.setPhase('deck');
        return;
      }
    }

    const npc = this.nearestNpc();
    if (npc) {
      const lines = npc.def.dialogue;
      const line = lines[Math.floor(Math.random() * lines.length)]!;
      this.events.onChat?.(npc.def, line);
      this.events.onPrompt?.(`${npc.def.displayName}: "${line}"`);
      this.setPhase('chat');
      this.chatCooldown = 0.4;
    }
  }

  private plantOnHull(pos: THREE.Vector3, band?: DeckBand): void {
    if (!this.deck163) return;
    const nav = band ? this.deckNav[band] : undefined;
    const hy = nav?.getHeightAt(pos.x, pos.z);
    if (hy != null) {
      pos.y = hy;
      return;
    }
    pos.y = sampleHullHeight(this.deck163.hull, pos.x, pos.z, pos.y);
  }

  private planPath(from: THREE.Vector3, to: THREE.Vector3, band: DeckBand): THREE.Vector3[] {
    const nav = this.deckNav[band];
    if (nav) {
      const path = nav.findPath(from, to);
      if (path?.points.length) return path.points;
    }
    return [to.clone()];
  }

  private walkToward(
    pos: THREE.Vector3,
    target: THREE.Vector3,
    speed: number,
    dt: number,
    rot: THREE.Object3D,
    band?: DeckBand,
    route?: { path: THREE.Vector3[]; pathIdx: number },
  ): boolean {
    if (route && (!route.path.length || route.pathIdx >= route.path.length)) {
      route.path = this.planPath(pos, target, band ?? 'top');
      route.pathIdx = 0;
    }
    const dest = (route?.path[route.pathIdx] ?? target).clone();
    this.plantOnHull(dest, band);
    const dir = dest.clone().sub(pos);
    dir.y = 0;
    const dist = dir.length();
    if (dist < 0.35) {
      this.plantOnHull(pos, band);
      if (route) {
        route.pathIdx += 1;
        if (route.pathIdx >= route.path.length) {
          route.path = [];
          route.pathIdx = 0;
          return true;
        }
        return false;
      }
      return true;
    }
    dir.normalize();
    pos.addScaledVector(dir, speed * dt);
    this.plantOnHull(pos, band);
    rot.rotation.y = Math.atan2(dir.x, dir.z);
    return false;
  }

  private updateNpcs(dt: number): void {
    for (const npc of this.npcs.values()) {
      if (npc.inCabin) continue;
      npc.idle -= dt;
      if (npc.idle > 0) {
        this.plantOnHull(npc.root.position, npc.band);
        continue;
      }
      const wps = npc.def.waypoints;
      if (!wps.length) continue;
      const target = wps[npc.waypointIndex % wps.length]!;
      const arrived = this.walkToward(
        npc.root.position,
        new THREE.Vector3(target.x, target.y, target.z),
        npc.def.role === 'helm' ? 1.15 : npc.def.role === 'bow_patrol' ? 1.4 : 1.8,
        dt,
        npc.root,
        npc.band,
        npc,
      );
      if (arrived) {
        npc.waypointIndex++;
        npc.idle = npc.def.role === 'helm' ? 2.2 + Math.random() * 2 : 1.2 + Math.random() * 2;
      }
    }
    for (const crew of this.accountCrew) {
      crew.idle -= dt;
      if (crew.idle > 0) {
        this.plantOnHull(crew.root.position, crew.band);
        continue;
      }
      const target = crew.wp[crew.idx % crew.wp.length];
      if (!target) continue;
      const arrived = this.walkToward(
        crew.root.position,
        target,
        1.2,
        dt,
        crew.root,
        crew.band,
        crew,
      );
      if (arrived) {
        crew.idx++;
        crew.idle = 1.5 + Math.random() * 2.5;
      }
    }
  }

  /** Place up to 4 Railway Warlords heroes on the author capsules; they wander Object_163_1. */
  async spawnAccountCrew(heroes: Character[]): Promise<void> {
    for (const c of this.accountCrew) {
      this.scene.remove(c.root);
    }
    this.accountCrew = [];
    const slots = this.deck163?.slots ?? [];
    const filled = heroes.filter(Boolean).slice(0, 4);
    for (let i = 0; i < filled.length; i++) {
      const hero = filled[i]!;
      try {
        const loaded = await loadCrewHero(hero);
        const root = new THREE.Group();
        root.name = `account_crew_${hero.id}`;
        root.add(loaded.root);
        const spawn = slots[i] ?? this.deck163?.johnHome ?? new THREE.Vector3();
        const band: DeckBand = i === 0 ? 'top' : i === 1 ? 'mid' : i === 2 ? 'low' : 'top';
        root.position.copy(spawn);
        this.plantOnHull(root.position, band);
        this.scene.add(root);
        const bandPts = this.deck163
          ? wanderPointsForBand(this.deck163, band, 4)
          : [spawn.clone()];
        this.accountCrew.push({
          heroId: hero.id,
          root,
          wp: [spawn.clone(), ...bandPts],
          idx: 0,
          idle: 0.4 + i * 0.3,
          band,
          path: [],
          pathIdx: 0,
        });
      } catch (e) {
        console.warn('[AirshipZone] account crew skip', hero.id, e);
      }
    }
    if (this.accountCrew.length) {
      this.exitCabinToDeck(false);
      this.setPhase('deck');
      this.events.onPrompt?.('Account crew on Object_163_1 — John at the wheels, decks wandering.');
    }
  }

  private updatePlayer(dt: number): void {
    if (!this.playerRoot || this.phase === 'loading') return;
    // Block free walk during create until accepted — still allow look + jump feel off
    if (this.phase === 'cabin_create' && !airshipHasSavedCharacter()) {
      return;
    }

    const speed = (this.keys.has('shift') ? 1.7 : 1) * 4.2;
    const fwd =
      (this.keys.has('w') || this.keys.has('W') ? 1 : 0) +
      (this.keys.has('s') || this.keys.has('S') ? -1 : 0);
    const side =
      (this.keys.has('a') || this.keys.has('A') || this.keys.has('q') || this.keys.has('Q')
        ? -1
        : 0) + (this.keys.has('d') || this.keys.has('D') ? 1 : 0);
    // E is interact — not strafe in this zone

    const yaw =
      typeof (this.controls as any).getAzimuthalAngle === 'function'
        ? (this.controls as any).getAzimuthalAngle()
        : this.playerYaw;

    if (fwd !== 0 || side !== 0) {
      const angle = Math.atan2(side, fwd || 0.001) + yaw;
      const dx = Math.sin(angle) * speed * dt;
      const dz = -Math.cos(angle) * speed * dt;
      this.playerRoot.position.x += dx;
      this.playerRoot.position.z += dz;
      this.playerRoot.rotation.y = angle;
    }

    // Ground Y: cabin floor or Object_163_1
    let groundY =
      this.inCabin && this.cabinRoot
        ? this.cabinRoot.position.y + 0.25
        : this.deckSpawn.y;
    if (!this.inCabin && this.deck163) {
      groundY =
        this.deckNav.top?.getHeightAt(this.playerRoot.position.x, this.playerRoot.position.z) ??
        sampleHullHeight(
          this.deck163.hull,
          this.playerRoot.position.x,
          this.playerRoot.position.z,
          groundY,
        );
    }

    // threejs-games random-boxes hold-to-jump (Space)
    const spaceHeld = this.keys.has(' ') || this.keys.has('Space');
    const jumpPressed = spaceHeld && !this.spaceWasDown;
    this.spaceWasDown = spaceHeld;

    const step = stepPlatformerJump({
      dt,
      y: this.playerRoot.position.y,
      groundY,
      jumpHeld: spaceHeld,
      jumpPressed,
      config: AIRSHIP_DECK_JUMP,
      state: this.jumpState,
    });
    this.jumpState = step.state;
    this.playerRoot.position.y = step.y;
  }

  private loop = () => {
    if (this._disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.chatCooldown = Math.max(0, this.chatCooldown - dt);

    const eDown = this.keys.has('e') || this.keys.has('E');
    if (eDown && !this.eLatch) this.tryInteract();
    this.eLatch = eDown;

    this.updatePlayer(dt);
    this.updateNpcs(dt);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private onResize = () => {
    const w = this.mount.clientWidth || window.innerWidth;
    const h = this.mount.clientHeight || window.innerHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    this.keys.add(e.key);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    this.keys.delete(e.key);
  };

  dispose(): void {
    this._disposed = true;
    for (const nav of Object.values(this.deckNav)) nav?.dispose();
    this.deckNav = {};
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
