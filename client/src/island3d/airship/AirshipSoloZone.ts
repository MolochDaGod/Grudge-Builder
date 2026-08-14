/**
 * AirshipSoloZone — Warlords pre-game deck.
 * Walk hull Object_163_1 · wheels Object_16 / Object_111.
 * Player + pirate crew = original-30 Toon looks at 1.8 m, deck nav + Foot IK.
 * No cabin. No voxel interior.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { assetUrl } from '@/lib/assetConfig';
import {
  AIRSHIP_ZONE_PATHS,
  AIRSHIP_NPCS,
  AIRSHIP_CABIN_DOOR_LOCAL,
  AIRSHIP_DECK_SPAWN_LOCAL,
  airshipHasSavedCharacter,
  markAirshipCharacterCreated,
  loadAirshipCharacter,
  type AirshipNpcDef,
  type AirshipNpcId,
} from '@shared/definitions/airshipSoloZone';
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
import { loadGltfCached } from '@/lib/three/SharedGltfPipeline';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  createDeckActor,
  tickDeckActor,
  playDeckTalk,
  revealPirateDeckMeshes,
  originalThirtyRoleFromClass,
  groundSkinnedFeetLocal,
  type DeckActor,
} from '@/island3d/airship/airshipDeckActor';

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
  actor: DeckActor | null;
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
  private playerActor: DeckActor | null = null;
  private keys = new Set<string>();
  private phase: AirshipZonePhase = 'loading';
  private raf = 0;
  private clock = new THREE.Clock();
  private _disposed = false;
  private playerLocal = new THREE.Vector3(
    AIRSHIP_DECK_SPAWN_LOCAL.x,
    AIRSHIP_DECK_SPAWN_LOCAL.y,
    AIRSHIP_DECK_SPAWN_LOCAL.z,
  );
  private playerYaw = 0;
  /** Cabin / voxel quarters purged from Warlords pre-game — always deck. */
  private inCabin = false;
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
      await this.spawnNpcs();
      await this.setupPlayer();
      this.exitCabinToDeck(false);
      this.setPhase(airshipHasSavedCharacter() ? 'deck' : 'cabin_create');
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
    actor: DeckActor | null;
    wp: THREE.Vector3[];
    idx: number;
    idle: number;
    band: DeckBand;
    path: THREE.Vector3[];
    pathIdx: number;
  }> = [];

  private deckIkMeshes(): THREE.Object3D[] {
    const hull = this.deck163?.hull;
    return hull ? [hull] : [];
  }

  private async loadGltfChain(urls: string[]): Promise<GLTF> {
    // Do not call ensureSharedGltfReady() here — the three-app production chunk
    // currently exports that binding as undefined (Ve/Je is not a function).
    // loadGltfCached → ensureLoader already attaches DRACO + meshopt.
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
    const pirateMeshes = revealPirateDeckMeshes(this.airshipRoot);
    console.info(`[AirshipZone] pirate deck meshes visible=${pirateMeshes}`);
    this.deck163 = bindDeck163(this.airshipRoot, this.bakedSlots);
    if (this.deck163) {
      if (this.legacyDeckPad) this.legacyDeckPad.visible = false;
      try {
        this.bakeDeck163Nav(this.deck163);
      } catch (e) {
        console.warn('[AirshipZone] deck nav bake failed — waypoint walk only', e);
      }
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

  /** Helm = knight · bow = spearman · Racalvin = mage — original 30 looks. */
  private npcOriginalRole(def: AirshipNpcDef): 'knight' | 'spearman' | 'mage' {
    if (def.role === 'helm') return 'knight';
    if (def.role === 'bow_patrol') return 'spearman';
    return 'mage';
  }

  private async spawnNpcs(): Promise<void> {
    for (const def of AIRSHIP_NPCS) {
      try {
        const actor = await createDeckActor({
          raceId: def.raceId,
          role: this.npcOriginalRole(def),
          name: `npc_${def.id}`,
        });
        actor.model.userData.npcId = def.id;
        actor.model.userData.interactable = true;
        actor.model.userData.safeNpc = true;
        actor.model.userData.postRole = def.role;
        actor.model.userData.factionRace = def.raceId;

        const wp0 = def.waypoints[0]!;
        actor.root.position.set(wp0.x, wp0.y, wp0.z);
        this.plantActorOnDeck(
          actor,
          def.role === 'helm' ? 'top' : def.role === 'bow_patrol' ? 'mid' : 'low',
        );
        this.scene.add(actor.root);
        this.npcs.set(def.id, {
          def,
          root: actor.root,
          actor,
          waypointIndex: 0,
          idle: 0,
          inCabin: false,
          band: def.role === 'helm' ? 'top' : def.role === 'bow_patrol' ? 'mid' : 'low',
          path: [],
          pathIdx: 0,
        });
      } catch (e) {
        console.warn('[AirshipZone] Toon faction NPC failed — skip (no capsule)', def.id, e);
      }
    }
  }

  private async setupPlayer(): Promise<void> {
    const saved = loadAirshipCharacter();
    const raceId = saved?.raceId || 'human';
    const classId = saved?.classId || 'warrior';
    await this.applyGrudge6RaceToPlayer(raceId, classId).catch((e) =>
      console.warn('[AirshipZone] Toon player failed', e),
    );
  }

  /** Swap player for Toon RTS race kit. Fail closed — no bake, no capsule. */
  async applyGrudge6RaceToPlayer(raceId: string, classId = 'warrior'): Promise<void> {
    try {
      const actor = await createDeckActor({
        raceId,
        role: originalThirtyRoleFromClass(classId),
        classId,
        name: 'airship_player',
      });
      actor.root.userData.isPlayer = true;
      if (this.playerRoot) this.scene.remove(this.playerRoot);
      this.playerActor = actor;
      this.playerRoot = actor.root;
      actor.root.position.set(this.deckSpawn.x, this.deckSpawn.y, this.deckSpawn.z);
      this.plantActorOnDeck(actor, 'top');
      this.scene.add(actor.root);
    } catch (e) {
      console.warn('[AirshipZone] Toon RTS player load failed — no fallback body', raceId, e);
    }
  }

  /** Called from UI after player accepts Toon RTS create. */
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
    await this.applyGrudge6RaceToPlayer(opts.raceId, opts.classId);
    this.exitCabinToDeck(true);
    this.setPhase('deck');
    this.events.onPrompt?.('Welcome aboard. Meet the crew — E to talk.');
  }

  private exitCabinToDeck(animateCam: boolean) {
    this.inCabin = false;
    if (this.cabinRoot) {
      this.scene.remove(this.cabinRoot);
      this.cabinRoot = null;
    }
    if (this.doorMarker) {
      this.scene.remove(this.doorMarker);
      this.doorMarker = null;
    }
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

  /** Open create UI on deck — no cabin. */
  openCreateAtDoor(): void {
    this.exitCabinToDeck(true);
    this.setPhase('cabin_create');
    this.events.onPrompt?.('Choose a Toon RTS race, then Accept.');
  }

  private nearestNpc(radius = 2.8): NpcRuntime | null {
    if (!this.playerRoot) return null;
    let best: NpcRuntime | null = null;
    let bestD = radius;
    const pp = this.playerRoot.position;
    for (const npc of this.npcs.values()) {
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
    const npc = this.nearestNpc();
    if (npc) {
      const lines = npc.def.dialogue;
      const line = lines[Math.floor(Math.random() * lines.length)]!;
      if (npc.actor) playDeckTalk(npc.actor);
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

  /** Hull Y on the group, then Box3 feet (not pelvis) sit on that deck sample. */
  private plantActorOnDeck(actor: DeckActor, band?: DeckBand): void {
    this.plantOnHull(actor.root.position, band);
    groundSkinnedFeetLocal(actor.model, 0);
    actor.root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    let any = false;
    actor.root.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isSkinnedMesh || m.visible === false) return;
      if (!any) {
        box.setFromObject(m, true);
        any = true;
      } else box.expandByObject(m);
    });
    if (!any) box.setFromObject(actor.root, true);
    if (!Number.isFinite(box.min.y)) return;
    const hullY = actor.root.position.y;
    actor.root.position.y += hullY - box.min.y;
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
        if (npc.actor) tickDeckActor(npc.actor, dt, this.deckIkMeshes(), false);
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
      if (npc.actor) tickDeckActor(npc.actor, dt, this.deckIkMeshes(), !arrived);
      if (arrived) {
        npc.waypointIndex++;
        npc.idle = npc.def.role === 'helm' ? 2.2 + Math.random() * 2 : 1.2 + Math.random() * 2;
      }
    }
    for (const crew of this.accountCrew) {
      crew.idle -= dt;
      if (crew.idle > 0) {
        this.plantOnHull(crew.root.position, crew.band);
        if (crew.actor) tickDeckActor(crew.actor, dt, this.deckIkMeshes(), false);
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
      if (crew.actor) tickDeckActor(crew.actor, dt, this.deckIkMeshes(), !arrived);
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
        const actor = await createDeckActor({
          raceId: hero.raceId || 'human',
          classId: hero.classId || 'warrior',
          name: `account_crew_${hero.id}`,
        });
        const spawn = slots[i] ?? this.deck163?.johnHome ?? new THREE.Vector3();
        const band: DeckBand = i === 0 ? 'top' : i === 1 ? 'mid' : i === 2 ? 'low' : 'top';
        actor.root.position.copy(spawn);
        this.plantActorOnDeck(actor, band);
        this.scene.add(actor.root);
        const bandPts = this.deck163
          ? wanderPointsForBand(this.deck163, band, 4)
          : [spawn.clone()];
        this.accountCrew.push({
          heroId: hero.id,
          root: actor.root,
          actor,
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
      if (this.playerActor) tickDeckActor(this.playerActor, dt, this.deckIkMeshes(), false);
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

    let moving = false;
    if (fwd !== 0 || side !== 0) {
      const angle = Math.atan2(side, fwd || 0.001) + yaw;
      const dx = Math.sin(angle) * speed * dt;
      const dz = -Math.cos(angle) * speed * dt;
      this.playerRoot.position.x += dx;
      this.playerRoot.position.z += dz;
      this.playerRoot.rotation.y = angle;
      moving = true;
    }

    // Ground Y: Object_163_1 hull only
    let groundY = this.deckSpawn.y;
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
    if (this.playerActor) {
      tickDeckActor(this.playerActor, dt, this.deckIkMeshes(), moving);
    }
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
