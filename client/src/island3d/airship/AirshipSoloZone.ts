/**
 * AirshipSoloZone — solo game zone: cabin create → deck with 3 captains.
 *
 * Scene: airship.glb + boatvoxelinside + camera from PerspectiveCamera / project extract.
 * Heroes: 2.0 m, Mixamo/custom skinned NPCs with simple patrol + E chat.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
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
  type DeckPostKind,
} from '@/island3d/airship/airshipScenePolish';

const gltfLoader = new GLTFLoader();

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

    // Soft sky deck plane under ship (terrain/wood feel)
    const deckPad = new THREE.Mesh(
      new THREE.CircleGeometry(90, 48),
      new THREE.MeshToonMaterial({ color: 0x3d5c4a }),
    );
    deckPad.rotation.x = -Math.PI / 2;
    deckPad.position.y = -0.5;
    deckPad.receiveShadow = true;
    this.scene.add(deckPad);

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.onResize();
  }

  async start(): Promise<void> {
    try {
      await this.applyCameraFromProject();
      await this.loadAirship();
      await this.loadCabin();
      await this.spawnNpcs();
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
      this.camera.updateProjectionMatrix();
      this.controls.update();
    } catch {
      this.camera.position.set(14, 12, 20);
      this.controls.target.set(0, 3, 0);
      this.controls.update();
    }
  }

  private deckPosts: Record<DeckPostKind, THREE.Vector3> | null = null;

  private async loadGltfChain(urls: string[]): Promise<Awaited<ReturnType<typeof gltfLoader.loadAsync>>> {
    let last: unknown;
    for (const u of urls) {
      try {
        return await gltfLoader.loadAsync(assetUrl(u));
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

    // Weld + SI fit + stylized toon materials (realism-stylized)
    const polish = polishOpenerAirshipScene(this.airshipRoot);
    this.deckPosts = polish.posts;
    console.info(
      `[AirshipZone] opener polish scale=${polish.scale.toFixed(4)} welded=${polish.welded} mats=${polish.materials}`,
    );

    this.scene.add(this.airshipRoot);
    this.retargetNpcWaypointsToShip();
  }

  private retargetNpcWaypointsToShip(): void {
    if (!this.airshipRoot) return;
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
        const gltf = await gltfLoader.loadAsync(assetUrl(p));
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
      const gltf = await gltfLoader.loadAsync(assetUrl(path));
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

  private updateNpcs(dt: number): void {
    for (const npc of this.npcs.values()) {
      if (npc.def.role === 'helm') {
        // Stay at wheel
        const wp = npc.def.waypoints[0]!;
        npc.root.position.lerp(new THREE.Vector3(wp.x, wp.y, wp.z), 0.05);
        continue;
      }
      if (npc.inCabin) continue; // mentor waits in cabin
      if (npc.def.role === 'bow_patrol' || npc.def.role === 'mentor_wander') {
        npc.idle -= dt;
        if (npc.idle > 0) continue;
        const wps = npc.def.waypoints;
        const target = wps[npc.waypointIndex % wps.length]!;
        const pos = npc.root.position;
        const dest = new THREE.Vector3(target.x, target.y, target.z);
        const dir = dest.clone().sub(pos);
        dir.y = 0;
        const dist = dir.length();
        if (dist < 0.35) {
          npc.waypointIndex++;
          npc.idle = 1.2 + Math.random() * 2;
        } else {
          dir.normalize();
          const speed = npc.def.role === 'bow_patrol' ? 1.4 : 1.8;
          pos.addScaledVector(dir, speed * dt);
          npc.root.rotation.y = Math.atan2(dir.x, dir.z);
        }
      }
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

    // Ground Y: cabin floor or deck
    const groundY =
      this.inCabin && this.cabinRoot
        ? this.cabinRoot.position.y + 0.25
        : this.deckSpawn.y;

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
