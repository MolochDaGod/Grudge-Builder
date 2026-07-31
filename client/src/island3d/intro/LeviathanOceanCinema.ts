/**
 * LeviathanOceanCinema — production /island-3d movie intro (v10 · film post + Box3).
 *
 * HARD RULES:
 *  - 1 unit = 1 m · human 1.8 m · Box3 SI audit on every actor
 *  - Characters: WK Grudge6 RTS toon + equip + textures ONLY
 *  - Film post: PostProcessing (bloom + SMAA + grade + vignette) driven by beats
 *  - Ocean: production OceanShader · leather levi · water splash · water cyclones
 *  - Camera sole owner · impact FOV · letterbox gate · skippable handoff
 *  - Yaw-only facing — no lookAt tumble on carriers
 */
import * as THREE from 'three';
import { ASSETS_CDN } from '@/lib/grudgeConfig';
import { loadGltfCached, cloneGltfScene } from '@/lib/three/SharedGltfPipeline';
import {
  CIN_CAST_ASSETS,
  CIN_HUMAN_M,
  CIN_SHIP_LOA_M,
  CIN_LEVIATHAN_LOA_M,
  CIN_RING_SPAN_M,
  CIN_GLYPH_SPAN_M,
  CIN_WARD_GLYPH_M,
  CIN_TWISTER_H_M,
  CIN_HERO_THROW_M,
  CIN_ISLAND_OFFSET,
  CIN_ISLAND_SPAN_M,
  LEVIATHAN_STAGE_ID,
  cinPos,
} from '@shared/definitions/leviathanCinemaStage';
import {
  createOceanMaterial,
  createOceanGeometry,
} from '@/game/sailing/OceanShader';
import { PostProcessing } from '@/island3d/render/PostProcessing';
import {
  spawnCinemaHuman,
  loadCinema2hAttackClips,
  fitPropSpanM,
  faceYawToward,
  createForceField,
  mountClockRing,
  tickClockRing,
  tickForceField,
} from './cinemaGrudge6';
import { CinemaStageGraph } from './CinemaStageGraph';
import { CinemaSpineIkRoster } from './CinemaSpineIk';
import { CinemaAnimDirector, MultiCameraDirector } from './CinemaAnimDirector';
import {
  LEVIATHAN_BATTLE_SCRIPT,
  LEVIATHAN_BATTLE_DURATION_SEC,
  LEVIATHAN_BATTLE_SKIPPABLE_AFTER_SEC,
  battleBeatAt,
  animHintsFor,
  type CinBattleBeat,
} from './LeviathanBattleScript';
import {
  LeviathanDragonBeamVfx,
  leviathanWaterY,
  applyLeviathanChargeLook,
  type DragonBeamPhase,
} from './LeviathanDragonBeamVfx';
import {
  applyLeatheryLeviathanLook,
  applyLeviathanWetness,
  LeviathanWaterSplash,
  applyWaterCycloneLook,
  tickWaterCyclone,
  surfaceBiasFromLeviAt,
} from './LeviathanLookAndWater';
import { CinemaBoxSystems } from './CinemaBoxSystems';

export {
  LEVIATHAN_BATTLE_DURATION_SEC as LEVIATHAN_CINEMA_DURATION_SEC,
  LEVIATHAN_BATTLE_SKIPPABLE_AFTER_SEC as LEVIATHAN_CINEMA_SKIPPABLE_AFTER_SEC,
  LEVIATHAN_BATTLE_SCRIPT as LEVIATHAN_CINEMA_BEATS,
};
export const SHIPWRECK_CINEMA_DURATION_SEC = LEVIATHAN_BATTLE_DURATION_SEC;
export const SHIPWRECK_CINEMA_SKIPPABLE_AFTER_SEC = LEVIATHAN_BATTLE_SKIPPABLE_AFTER_SEC;
export const CINEMA_LOGO_URL = '/cinema/grudge-logo.png';
export const HUMAN_HEIGHT_M = CIN_HUMAN_M;
export const HERO_THROW_M = CIN_HERO_THROW_M;

export type CinemaCallbacks = {
  onCaption?: (caption: string, sub: string) => void;
  onProgress?: (u: number, t: number) => void;
  onBeat?: (idx: number, beat: CinBattleBeat) => void;
  onReady?: () => void;
  onComplete?: () => void;
};

// ── helpers ────────────────────────────────────────────────────────────

/** @deprecated use fitPropSpanM / spawnCinemaHuman — kept only for procedural fallbacks */
function fitLength(obj: THREE.Object3D, targetLength: number): void {
  fitPropSpanM(obj, targetLength, 'max');
}

/** Reject voxel / prototype / kenney boat kits that look wrong in this cut. */
function isForbiddenShipUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes('voxel') ||
    u.includes('kenney') ||
    u.includes('prototype') ||
    u.includes('blocky') ||
    u.includes('lowpoly_cube') ||
    u.includes('enemy/ship')
  );
}

async function loadFirst(urls: readonly string[]): Promise<THREE.Group | null> {
  for (const url of urls) {
    if (isForbiddenShipUrl(url)) {
      console.warn('[cinema] skip forbidden ship url', url);
      continue;
    }
    try {
      const gltf = await loadGltfCached(url, 'critical');
      return cloneGltfScene(gltf);
    } catch {
      /* next */
    }
  }
  return null;
}

async function loadFirstWithClips(
  urls: readonly string[],
): Promise<{ root: THREE.Group; clips: THREE.AnimationClip[] } | null> {
  for (const url of urls) {
    try {
      const gltf = await loadGltfCached(url, 'critical');
      const root = cloneGltfScene(gltf);
      return { root, clips: gltf.animations?.slice() ?? [] };
    } catch {
      /* next */
    }
  }
  return null;
}

function makeCapsuleHero(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 1.1, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b8cae }),
  );
  body.position.y = 0.9;
  g.add(body);
  return g;
}

/** Fallback brig-style hull — wood boards, NOT voxel cubes */
function makeProceduralShip(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'procedural_pirate_brig';
  const wood = new THREE.MeshStandardMaterial({ color: 0x5c3a22, roughness: 0.85, metalness: 0.05 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.9 });
  const sail = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.95, side: THREE.DoubleSide });
  // Hull — tapered box along Z (LOA)
  const hull = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.4, 17), wood);
  hull.position.y = 1.35;
  // Bow rake
  const bow = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.8, 3.5), wood);
  bow.position.set(0, 1.5, 8.2);
  bow.rotation.x = -0.12;
  // Deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.18, 15), dark);
  deck.position.y = 2.55;
  // Mast + sail (simple, readable silhouette)
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 9, 8), dark);
  mast.position.set(0, 6.5, 1);
  const mainSail = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 5.5), sail);
  mainSail.position.set(0, 5.8, 1.1);
  g.add(hull, bow, deck, mast, mainSail);
  return g;
}

function makeProceduralLeviathan(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(2.5, 18, 8),
    new THREE.MeshStandardMaterial({ color: 0x1a3040, emissive: 0x441100, emissiveIntensity: 0.3 }),
  );
  body.rotation.z = Math.PI / 2;
  g.add(body);
  return g;
}

// ── main cinema ────────────────────────────────────────────────────────

export class LeviathanOceanCinema {
  private host: HTMLElement;
  private cbs: CinemaCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
  private clock = new THREE.Clock();
  private raf = 0;
  private disposed = false;
  private ready = false;
  private elapsed = 0;
  private beatIdx = -1;

  private stage: CinemaStageGraph;
  private spineIk = new CinemaSpineIkRoster();
  private multiCam = new MultiCameraDirector();

  private shipGroup = new THREE.Group();
  private leviathanRoot = new THREE.Group();
  private heroRoot = new THREE.Group();
  private leviathan: THREE.Object3D | null = null;
  private hero: THREE.Object3D | null = null;
  private mages: THREE.Object3D[] = [];
  private mageRoots: THREE.Group[] = [];
  private rings: THREE.Object3D[] = [];
  private intactShip: THREE.Object3D | null = null;
  private wreckShip: THREE.Object3D | null = null;

  private leviDirector: CinemaAnimDirector | null = null;
  private mageDirectors: CinemaAnimDirector[] = [];
  private heroDirector: CinemaAnimDirector | null = null;

  private waterMat: THREE.ShaderMaterial | null = null;
  private forceFields: THREE.Object3D[] = [];
  private clockRingHolders: THREE.Group[] = [];
  private hemi!: THREE.HemisphereLight;
  private dirLight!: THREE.DirectionalLight;
  private flash = 0;
  private stormCur = 0.4;
  private blackoutCur = 0;
  private logoEl: HTMLImageElement | null = null;
  private resizeObs: ResizeObserver | null = null;
  /** One-shot VFX: hide/remove after play (seconds remaining) */
  private vfxTimers: Array<{ obj: THREE.Object3D; life: number; remove?: boolean }> = [];

  private fireBeam: THREE.Mesh | null = null;
  /** Moon-beam structure dragon beam: snap → charge → blast + shield bounce */
  private dragonVfx: LeviathanDragonBeamVfx | null = null;
  private dragonPhase: DragonBeamPhase = 'off';
  private dragonPhaseStart = 0;
  /** Attack-local time when mouth opens / beam may start (seconds into clip) */
  private static readonly MOUTH_OPEN_SEC = 0.1;
  /** Beam must end before attack clip completes (fraction of duration) */
  private static readonly BEAM_END_PROGRESS = 0.72;
  private leviMouthBone: THREE.Object3D | null = null;
  private pinataFired = false;
  private tornadoRoot: THREE.Object3D | null = null;
  private cycloneClones: THREE.Object3D[] = [];
  private fluidSplash: THREE.Object3D | null = null;
  private fluidMixer: THREE.AnimationMixer | null = null;
  private waterSplash: LeviathanWaterSplash | null = null;
  private lastLeviSurfaceBias = -99;
  private smokeRingPool: THREE.Object3D[] = [];
  private supernovaPool: THREE.Object3D[] = [];
  private meguminRoot: THREE.Object3D | null = null;
  /** Measured ship-local deck Y after SI fit (feet plant) */
  private deckY = 3.0;
  private glyphTemplate: THREE.Object3D | null = null;
  private glyphs: Array<{
    mesh: THREE.Object3D;
    t: number;
    life: number;
    from: THREE.Vector3;
    to: THREE.Vector3;
  }> = [];
  private glyphCd = 0;
  private castingActive = false;
  /** Cycle 2H magic attack clips until pinata */
  private mage2hIndex = 0;
  private mage2hCd = 0;
  private pinataPieces: Array<{
    mesh: THREE.Object3D;
    vel: THREE.Vector3;
    ang: THREE.Vector3;
    life: number;
  }> = [];
  private explosionBurst: THREE.Points | null = null;
  private launchCamLocked = false;
  /** Film post: bloom + SMAA + grade + vignette */
  private post: PostProcessing | null = null;
  /** Box3 SI audit + shadow fit + optional helpers */
  private boxSys: CinemaBoxSystems | null = null;
  private bloomCur = 0.35;
  private filmTintCur = -0.12;
  private filmVigCur = 0.38;
  private filmContrastCur = 1.08;
  private lastBeatId = '';
  /** Vertical glyph ward wall (faces leviathan — blocks attacks) */
  private wardWallRoot: THREE.Group | null = null;
  /** Spell splines from 2 mages → destroy twisters */
  private spellSplines: Array<{
    line: THREE.Line;
    from: THREE.Vector3;
    to: THREE.Vector3;
    t: number;
    life: number;
    target: THREE.Object3D | null;
  }> = [];
  private twisterDead = false;
  private leviChannelLockPos: THREE.Vector3 | null = null;
  private blowbackT = 0;
  private twisterOrbitT = 0;

  constructor(host: HTMLElement, cbs: CinemaCallbacks = {}) {
    this.host = host;
    this.cbs = cbs;
    this.stage = new CinemaStageGraph(false);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // ACES on renderer — composer color grading sits on top (same pattern as Island3DEngine)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';

    this.scene.background = new THREE.Color(0x060a10);
    this.scene.fog = new THREE.FogExp2(0x060a10, 0.012);
    this.scene.add(this.stage.root);

    this.hemi = new THREE.HemisphereLight(0x88aacc, 0x1a1010, 0.55);
    this.dirLight = new THREE.DirectionalLight(0xffe0c0, 1.05);
    this.dirLight.position.set(20, 40, 12);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 120;
    this.scene.add(this.hemi, this.dirLight, this.dirLight.target);

    this.buildWater();
    this.scene.add(this.shipGroup, this.leviathanRoot, this.heroRoot);

    // Box3 systems (SI + shadow domain) — helpers off in production
    const debugBoxes =
      typeof window !== 'undefined' &&
      (new URLSearchParams(window.location.search).get('box3') === '1' ||
        new URLSearchParams(window.location.search).get('debug') === '1');
    this.boxSys = new CinemaBoxSystems(this.scene, debugBoxes);

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(host);
    this.resize();

    // Film post AFTER first resize so composer has real dimensions
    this.post = new PostProcessing(this.renderer, this.scene, this.camera, {
      quality: 'high',
      bloomStrength: 0.42,
      bloomRadius: 0.48,
      bloomThreshold: 0.72,
      colorTint: -0.12,
      vignetteIntensity: 0.4,
      contrast: 1.08,
    });
    this.post.resize(this.host.clientWidth || 1, this.host.clientHeight || 1);

    void this.bootstrap();
  }

  private buildWater(): void {
    // Production sailing ocean (Gerstner + flow foam + Beer-Lambert) — not the toy shader
    this.waterMat = createOceanMaterial({
      uTime: { value: 0 },
      uWaveHeight: { value: 1.35 },
      uStormIntensity: { value: 0.45 },
      uWindDirection: { value: new THREE.Vector3(1, 0, 0.35).normalize() },
      uWindStrength: { value: 10 },
      uDeepColor: { value: new THREE.Color(0x041a28) },
      uShallowColor: { value: new THREE.Color(0x1a7a9a) },
      uFoamColor: { value: new THREE.Color(0xe8f4ff) },
      uSunDirection: { value: new THREE.Vector3(0.35, 0.9, 0.25).normalize() },
      uSunColor: { value: new THREE.Color(0xfff0d0) },
      uVisibility: { value: 0.85 },
    });
    const geo = createOceanGeometry(320, 320, 192);
    const mesh = new THREE.Mesh(geo, this.waterMat);
    mesh.position.copy(new THREE.Vector3(...cinPos('water_plane')));
    mesh.receiveShadow = true;
    mesh.name = 'cinema_ocean';
    this.scene.add(mesh);
  }

  private async bootstrap(): Promise<void> {
    try {
      await this.bootstrapInner();
    } catch (err) {
      console.error('[LeviathanOceanCinema] bootstrap failed', err);
      // Still mark ready so the canvas is not stuck on "Loading…"
      this.ready = true;
      this.cbs.onReady?.();
      this.cbs.onCaption?.('BOOT ERROR', err instanceof Error ? err.message : String(err));
      if (!this.disposed) this.tick();
    }
  }

  private async bootstrapInner(): Promise<void> {
    // CRITICAL path only — never block on 100MB+ VFX
    // Characters: Grudge6 RTS toon ONLY (spawnCinemaHuman) — purged western-kingdoms packs
    const [ship, wreck, leviPack, ring, foundation, mage0, mage1, mage2, mage3, heroPack] =
      await Promise.all([
        loadFirst(CIN_CAST_ASSETS.ship),
        loadFirst(CIN_CAST_ASSETS.wreck),
        loadFirstWithClips(CIN_CAST_ASSETS.leviathan),
        loadFirst(CIN_CAST_ASSETS.magicRing),
        loadFirst(CIN_CAST_ASSETS.foundation),
        spawnCinemaHuman('mage').catch((e) => {
          console.warn('[cinema] mage0 spawn failed', e);
          return null;
        }),
        spawnCinemaHuman('mage').catch((e) => {
          console.warn('[cinema] mage1 spawn failed', e);
          return null;
        }),
        spawnCinemaHuman('mage').catch((e) => {
          console.warn('[cinema] mage2 spawn failed', e);
          return null;
        }),
        spawnCinemaHuman('mage').catch((e) => {
          console.warn('[cinema] mage3 spawn failed', e);
          return null;
        }),
        spawnCinemaHuman('hero').catch((e) => {
          console.warn('[cinema] hero spawn failed', e);
          return null;
        }),
      ]);
    if (this.disposed) return;

    // Distant island silhouette — SI span (raw GLB often ~59k units → decade+fit)
    if (foundation) {
      foundation.name = 'startingfalls_foundation';
      this.plantStartingFalls(foundation);
      this.scene.add(foundation);
    }

    // Ship — stylized pirate LOA 18 m (never voxel / never hero-height fit)
    this.intactShip = ship ?? makeProceduralShip();
    if (!ship) console.info('[cinema] using procedural pirate brig (CDN ship unavailable)');
    else console.info('[cinema] ship loaded (stylized pirate path preferred)');
    fitPropSpanM(this.intactShip, CIN_SHIP_LOA_M, 'max');
    this.shipGroup.add(this.intactShip);
    this.stage.place(this.shipGroup, 'ship_origin');
    this.deckY = this.measureDeckY(this.intactShip);

    this.wreckShip = wreck ?? makeProceduralShip();
    fitPropSpanM(this.wreckShip, Math.min(16, CIN_SHIP_LOA_M * 0.9), 'max');
    this.wreckShip.visible = false;
    this.shipGroup.add(this.wreckShip);

    // Leviathan — LOA 28 m, wet leathery sea-serpent look, yaw-only face boat
    this.leviathan = leviPack?.root ?? makeProceduralLeviathan();
    fitPropSpanM(this.leviathan, CIN_LEVIATHAN_LOA_M, 'max');
    this.prepareLeviathanMaterials(this.leviathan);
    applyLeatheryLeviathanLook(this.leviathan);
    this.leviMouthBone = this.findLeviMouthBone(this.leviathan);
    this.leviathanRoot.add(this.leviathan);
    // Ocean / rise water splash particles
    this.waterSplash = new LeviathanWaterSplash(this.scene, 480);
    this.stage.place(this.leviathanRoot, 'levi_hidden');
    if (leviPack?.clips?.length) {
      this.leviDirector = new CinemaAnimDirector(this.leviathan, leviPack.clips);
      this.leviDirector.play('idle', { fade: 0.2 });
      console.info(
        '[cinema] levi clips:',
        this.leviDirector.listClipNames().slice(0, 12).join(', '),
        '· mouth bone:',
        this.leviMouthBone?.name ?? 'bounds-fallback',
      );
    }
    this.spineIk.bind('leviathan', this.leviathan);

    // 4 deck mages — 1.8 m Grudge6, feet on deck, clock rings + force fields
    const magePacks = [mage0, mage1, mage2, mage3];
    const mageKeys = ['deck_mage_0', 'deck_mage_1', 'deck_mage_2', 'deck_mage_3'] as const;
    const actorIds = ['mage_0', 'mage_1', 'mage_2', 'mage_3'] as const;
    for (let i = 0; i < 4; i++) {
      const pack = magePacks[i];
      const root = pack?.root ?? (() => {
        const g = new THREE.Group();
        g.add(makeCapsuleHero());
        return g;
      })();
      root.name = actorIds[i];
      const mesh = pack?.mesh ?? root.children[0] ?? root;
      this.mages.push(mesh);
      this.mageRoots.push(root);

      const clips = pack?.clips ?? [];
      if (clips.length) {
        const dir = new CinemaAnimDirector(mesh, clips);
        dir.play(animHintsFor('cast'), { fade: 0.2, loop: THREE.LoopRepeat });
        this.mageDirectors.push(dir);
      }

      // Clock-face ward ring (flat, spins like clock hands on local Z)
      if (ring) {
        const holder = mountClockRing(ring, CIN_RING_SPAN_M);
        root.add(holder);
        this.clockRingHolders.push(holder);
        this.rings.push(holder);
      }

      // Danger-room force-field bubble around caster
      const ff = createForceField(1.2);
      ff.visible = false;
      root.add(ff);
      this.forceFields.push(ff);

      this.shipGroup.add(root);
      this.placeOnDeck(root, mageKeys[i]);
      this.spineIk.bind(actorIds[i], mesh);
    }

    // Hero — unarmed Grudge6, feet on deck until throw
    {
      const pack = heroPack;
      if (pack) {
        this.hero = pack.mesh;
        // Re-parent pack.root children into heroRoot for stage placement
        while (pack.root.children.length) {
          this.heroRoot.add(pack.root.children[0]);
        }
      } else {
        const mesh = makeCapsuleHero();
        this.hero = mesh;
        this.heroRoot.add(mesh);
      }
      this.heroRoot.name = 'hero_throw';
      this.shipGroup.add(this.heroRoot);
      this.placeOnDeck(this.heroRoot, 'deck_hero');
      if (pack?.clips?.length && this.hero) {
        this.heroDirector = new CinemaAnimDirector(this.hero, pack.clips);
        this.heroDirector.play(['idle', 'stand'], { fade: 0.2 });
      }
      if (this.hero) this.spineIk.bind('hero', this.hero);
    }

    // Spell glyph template — 70% smaller; also used for vertical ward wall tiles
    void loadFirst(CIN_CAST_ASSETS.spellGlyph).then((g) => {
      if (this.disposed || !g) return;
      this.glyphTemplate = g;
      fitPropSpanM(g, CIN_GLYPH_SPAN_M, 'max');
      g.visible = false;
      this.buildWardWall();
    });

    void this.loadMage2hAttackClips();

    // Legacy thin beam (fallback) — primary is LeviathanDragonBeamVfx
    this.fireBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.85, 1, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xff6622,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.fireBeam.visible = false;
    this.scene.add(this.fireBeam);

    // Dragon beam pack: flame aura, hot hands, fireballs, moon→dragon blast, shield bounce
    this.dragonVfx = new LeviathanDragonBeamVfx(this.scene);

    // Logo overlay
    this.logoEl = document.createElement('img');
    this.logoEl.src = CINEMA_LOGO_URL;
    this.logoEl.alt = 'Grudge';
    this.logoEl.onerror = () => {
      if (this.logoEl) this.logoEl.src = '/cinema/grudge-logo.jpeg';
    };
    this.logoEl.style.cssText =
      'position:absolute;inset:0;margin:auto;max-width:42vw;max-height:28vh;opacity:0;pointer-events:none;transition:opacity .8s;z-index:5;filter:drop-shadow(0 0 24px rgba(0,0,0,.8))';
    this.host.style.position = this.host.style.position || 'relative';
    this.host.appendChild(this.logoEl);

    // Box3 SI audit + shadow camera fit (film readability)
    this.runBox3SiAudit();
    this.boxSys?.fitShadowCamera(this.dirLight, [
      this.shipGroup,
      this.leviathanRoot,
      this.heroRoot,
    ]);

    console.info(
      `[cinema v10 film] ready · post=high bloom/SMAA/grade · Box3 SI · ship≈${CIN_SHIP_LOA_M}m · levi≈${CIN_LEVIATHAN_LOA_M}m · human=${CIN_HUMAN_M}m · grudge6 · OceanShader`,
    );

    this.ready = true;
    this.cbs.onReady?.();
    this.applyBeat(0, true);
    this.tick();

    void this.loadVfxBackground();
  }

  /** THREE.Box3 SI reports for ship / levi / cast (console + optional helpers). */
  private runBox3SiAudit(): void {
    if (!this.boxSys) return;
    if (this.intactShip) {
      this.boxSys.register('ship', this.intactShip, CinemaBoxSystems.expectShip(), 0x88aaff);
    }
    if (this.leviathan) {
      this.boxSys.register('leviathan', this.leviathan, CinemaBoxSystems.expectLevi(), 0xff6644);
    }
    for (let i = 0; i < this.mages.length; i++) {
      this.boxSys.register(`mage_${i}`, this.mages[i], CinemaBoxSystems.expectHuman(), 0x44ffaa);
    }
    if (this.hero) {
      this.boxSys.register('hero', this.hero, CinemaBoxSystems.expectHuman(), 0xffee88);
    }
  }

  /**
   * Inject 2H magic attack AnimationClips into each mage director.
   * "Loop" in cinema = cycle these attacks until leviathan pinatas the boat.
   * Preferred: magic pack 2H attack GLBs. Fallback: flat models/animations/attack.glb
   */
  private async loadMage2hAttackClips(): Promise<void> {
    const candidates = [
      `${ASSETS_CDN}/models/animations/magic/Standing 2H Magic Attack 01.glb`,
      `${ASSETS_CDN}/models/animations/magic/Standing 2H Magic Attack 02.glb`,
      `${ASSETS_CDN}/models/animations/magic/Standing 2H Magic Area Attack 01.glb`,
      `${ASSETS_CDN}/models/animations/magic/Standing 1H Magic Attack 01.glb`,
      `${ASSETS_CDN}/models/animations/attack.glb`,
    ];
    const loaded: THREE.AnimationClip[] = [];
    for (let i = 0; i < candidates.length; i++) {
      try {
        const gltf = await loadGltfCached(candidates[i], 'high');
        const clips = gltf.animations?.slice() ?? [];
        for (const c of clips) {
          // Alias so fuzzy find hits "2h magic attack"
          const renamed = c.clone();
          renamed.name = i < 3
            ? `2h_magic_attack_${i + 1}`
            : i === 3
              ? `1h_magic_attack`
              : `2h_magic_attack_fallback`;
          loaded.push(renamed);
        }
      } catch {
        /* next candidate */
      }
    }
    if (!loaded.length) {
      console.warn('[cinema] no 2H magic attack clips on CDN — mages use embedded only');
      return;
    }
    for (const d of this.mageDirectors) {
      d.addClips(loaded);
      // Start cycling 2H attacks immediately while wards are up
      d.play(['2h_magic_attack', '2h magic attack', 'attack', 'combat'], {
        fade: 0.2,
        loop: THREE.LoopRepeat,
        restart: true,
      });
    }
    console.info('[cinema] mage 2H attack clips ready:', loaded.map((c) => c.name).join(', '));
  }

  /** Optional VFX — failures are non-fatal */
  private async loadVfxBackground(): Promise<void> {
    try {
      const [fluidPack, tornado, smoke, meguminPack] = await Promise.all([
        loadFirstWithClips(CIN_CAST_ASSETS.fluid),
        loadFirst(CIN_CAST_ASSETS.tornado),
        loadFirst(CIN_CAST_ASSETS.smokeRings),
        loadFirstWithClips(CIN_CAST_ASSETS.megumin),
        // deliberately skip supernova (~122MB) in cinema bootstrap
      ]);
      if (this.disposed) return;

      if (tornado) {
        this.tornadoRoot = tornado;
        // 40% smaller than original 14 m → CIN_TWISTER_H_M
        fitPropSpanM(tornado, CIN_TWISTER_H_M, 'y');
        applyWaterCycloneLook(tornado, 0.5);
        this.stage.place(tornado, 'vfx_tornado');
        tornado.visible = false;
        this.scene.add(tornado);
        for (let i = 0; i < 2; i++) {
          const c = tornado.clone(true);
          applyWaterCycloneLook(c, 0.5);
          fitPropSpanM(c, CIN_TWISTER_H_M * (0.85 + i * 0.1), 'y');
          c.visible = false;
          this.scene.add(c);
          this.cycloneClones.push(c);
        }
      }
      if (fluidPack?.root) {
        this.fluidSplash = fluidPack.root;
        fitPropSpanM(this.fluidSplash, 12, 'max');
        // Tint fluid volume toward ocean foam
        this.fluidSplash.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh || !m.material) return;
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) {
            const std = mat as THREE.MeshStandardMaterial;
            if (std.color) std.color.set(0x4aaad0);
            if ('opacity' in std) {
              std.transparent = true;
              std.opacity = Math.min(std.opacity ?? 0.7, 0.65);
            }
            if (std.emissive) {
              std.emissive.set(0x0a3048);
              std.emissiveIntensity = 0.2;
            }
          }
        });
        this.fluidSplash.visible = false;
        this.scene.add(this.fluidSplash);
        if (fluidPack.clips.length) {
          this.fluidMixer = new THREE.AnimationMixer(this.fluidSplash);
          for (const c of fluidPack.clips) {
            const a = this.fluidMixer.clipAction(c);
            // One-shot when shown; mixer only runs while visible
            a.setLoop(THREE.LoopOnce, 1);
            a.clampWhenFinished = true;
            a.play();
          }
        }
      }
      if (smoke) {
        for (let i = 0; i < 3; i++) {
          const s = smoke.clone(true);
          fitPropSpanM(s, 4 + i, 'max');
          s.visible = false;
          this.scene.add(s);
          this.smokeRingPool.push(s);
        }
      }
      if (meguminPack?.root) {
        this.meguminRoot = meguminPack.root;
        fitPropSpanM(this.meguminRoot, 8, 'max');
        this.meguminRoot.visible = false;
        this.scene.add(this.meguminRoot);
      }
    } catch (e) {
      console.warn('[LeviathanOceanCinema] optional VFX load failed', e);
    }
  }

  private applyBeat(idx: number, force = false): void {
    const beat = LEVIATHAN_BATTLE_SCRIPT[idx];
    if (!beat) return;
    if (!force && idx === this.beatIdx) return;
    const prev = this.beatIdx;
    this.beatIdx = idx;
    this.cbs.onCaption?.(beat.caption, beat.sub);
    this.cbs.onBeat?.(idx, beat);

    // Camera from stage UUID pair — film blend speed by mode
    const cam = this.stage.camPair(beat.camEye, beat.camLook);
    this.multiCam.setBlendSpeed(beat.camMode === 'cut' ? 2.4 : beat.id.includes('dragon') || beat.id.includes('breach') ? 1.6 : 0.95);
    this.multiCam.setTarget(cam.pos, cam.look, cam.fov, beat.camMode ?? 'blend');

    // Movie film look targets (smoothed in tick)
    this.bloomCur = beat.bloom ?? 0.35;
    this.filmTintCur = beat.blackout && beat.blackout > 0.4 ? -0.25 : beat.storm && beat.storm > 0.7 ? -0.18 : -0.08;
    this.filmVigCur = 0.32 + (beat.blackout ?? 0) * 0.35 + (beat.storm ?? 0.5) * 0.08;
    this.filmContrastCur = 1.04 + (beat.bloom ?? 0.3) * 0.12;

    // Impact punches on hard action beats
    if (prev !== idx) {
      if (beat.dragonPhase === 'blast' || beat.fireBeam || beat.shipPinata || beat.shipHit === 'breach') {
        this.multiCam.impact(beat.shipPinata ? 7 : 4.5, beat.shipPinata ? 0.65 : 0.35);
      } else if (beat.dragonPhase === 'snap') {
        this.multiCam.impact(2.5, 0.2);
      } else if (beat.shieldImpact) {
        this.multiCam.impact(3, 0.25);
      }
      this.lastBeatId = beat.id;
    }

    // Actors → locations + anim + spine IK targets
    const assign = beat.actors;
    if (assign.leviathan && this.leviathanRoot) {
      const a = assign.leviathan;
      this.stage.place(this.leviathanRoot, a.at, { copyYaw: true });
      this.leviathanRoot.visible = a.visible !== false;
      // Yaw-only face boat — NEVER lookAt (that tumbles carriers)
      if (a.visible !== false) {
        faceYawToward(this.leviathanRoot, this.shipGroup.position);
      }
      if (this.leviDirector && a.anim) {
        // Dragon beam: one attack clip plays through mouth→beam→end (animRestart:false)
        // Default: restart attack/roar on new beat unless explicitly held
        const restart =
          a.animRestart === true
            ? true
            : a.animRestart === false
              ? false
              : prev !== idx && (a.anim.includes('attack') || a.anim.includes('roar'));
        this.leviDirector.play(animHintsFor(a.anim), {
          fade: restart ? 0.22 : 0.08,
          timeScale: a.timeScale ?? 1,
          restart,
          loop: a.animOnce ? THREE.LoopOnce : THREE.LoopRepeat,
          clamp: !!a.animOnce,
        });
      } else if (this.leviDirector && a.timeScale != null) {
        this.leviDirector.setTimeScale(a.timeScale);
      }
      // Spine / head aim at deck (boat) — mouth attacks drive from this
      const lookKey = a.lookAt ?? 'ik_ship_deck_center';
      this.spineIk.aimAtObject('leviathan', this.stage.get(lookKey), a.ikWeight ?? 0.75, 0);
    }

    const mageActors = ['mage_0', 'mage_1', 'mage_2', 'mage_3'] as const;
    const mageKeys = ['deck_mage_0', 'deck_mage_1', 'deck_mage_2', 'deck_mage_3'] as const;
    this.castingActive = !!beat.rings || assign.mage_0?.anim === 'cast' || assign.mage_0?.anim === 'defend';
    for (let i = 0; i < 4; i++) {
      const a = assign[mageActors[i]];
      const root = this.mageRoots[i];
      if (!a || !root) continue;
      // Feet stay on deck (ship-local); do not free-float
      this.placeOnDeck(root, mageKeys[i]);
      root.visible = a.visible !== false;
      // Until pinata: cycle 2H magic attacks (play repeatedly). After: idle/hidden.
      const keep2h =
        !this.pinataFired &&
        (a.anim === 'cast' || a.anim === 'defend' || !!beat.rings || a.anim === 'attack');
      if (this.mageDirectors[i]) {
        if (keep2h) {
          this.mageDirectors[i].play(
            animHintsFor('cast'),
            { fade: 0.25, loop: THREE.LoopRepeat, restart: prev !== idx },
          );
        } else {
          this.mageDirectors[i].play(animHintsFor(a.anim ?? 'idle'), {
            fade: 0.28,
            loop: THREE.LoopRepeat,
          });
        }
      }
      // Spine IK look at leviathan mouth (casters aim wards at the beast)
      const look = a.lookAt ? this.stage.get(a.lookAt) : this.stage.get('ik_levi_mouth');
      this.spineIk.aimAtObject(mageActors[i], look, a.ikWeight ?? 0.85, 0.4);
    }

    if (assign.hero) {
      const a = assign.hero;
      if (beat.heroMode === 'throw' || beat.heroMode === 'air' || beat.heroMode === 'sink') {
        // Detach to world for throw arc
        if (this.heroRoot.parent === this.shipGroup) {
          this.scene.attach(this.heroRoot);
        }
        this.stage.place(this.heroRoot, a.at, { copyYaw: false });
      } else if (beat.heroMode === 'hidden') {
        this.heroRoot.visible = false;
      } else {
        if (this.heroRoot.parent !== this.shipGroup) {
          this.shipGroup.attach(this.heroRoot);
        }
        this.placeOnDeck(this.heroRoot, 'deck_hero');
        this.heroRoot.visible = true;
      }
      this.heroRoot.visible = a.visible !== false && beat.heroMode !== 'hidden';
      if (this.heroDirector && a.anim) {
        this.heroDirector.play(animHintsFor(a.anim), { fade: 0.25 });
      }
      if (a.lookAt) {
        this.spineIk.aimAtObject('hero', this.stage.get(a.lookAt), a.ikWeight ?? 0.7, 0.4);
      }
    }

    // Clock rings + force fields visible while casting wards
    const wardsUp = !!beat.rings || this.castingActive;
    for (const r of this.rings) r.visible = wardsUp && !this.pinataFired;
    for (const ff of this.forceFields) ff.visible = wardsUp && !this.pinataFired;

    // On cast/attack beats: throw spell glyphs at leviathan (removed when flight ends)
    if (prev !== idx && (beat.rings || beat.fireBeam || beat.shieldImpact || assign.mage_0?.anim === 'cast')) {
      for (const root of this.mageRoots) {
        if (root.visible) this.throwGlyph(root);
      }
    }

    // Ship intact / pinata shatter + explosion + hero launch frame
    if (this.intactShip) this.intactShip.visible = beat.shipIntact !== false && !this.pinataFired;
    if (this.wreckShip) this.wreckShip.visible = beat.shipIntact === false || this.pinataFired;
    if (beat.shipPinata && !this.pinataFired) {
      this.fireShipPinata();
    }
    // After pinata: hard camera frame on launched hero (wreck in BG)
    if (this.pinataFired && (beat.heroMode === 'throw' || beat.heroMode === 'air') && !this.launchCamLocked) {
      this.launchCamLocked = true;
      this.frameHeroLaunchCam();
    }

    // Dragon beam phase machine (snap 0.1s → charge pause → blast)
    const nextPhase = (beat.dragonPhase ?? (beat.fireBeam ? 'blast' : 'off')) as DragonBeamPhase;
    if (nextPhase !== this.dragonPhase || prev !== idx) {
      this.dragonPhase = nextPhase;
      this.dragonPhaseStart = this.elapsed;
      this.dragonVfx?.setPhase(nextPhase);
    }
    // Legacy cylinder only if dragon VFX missing and fireBeam flag
    if (this.fireBeam) {
      const useLegacy = !!beat.fireBeam && !this.dragonVfx;
      this.fireBeam.visible = useLegacy;
      (this.fireBeam.material as THREE.MeshBasicMaterial).opacity = useLegacy ? 0.85 : 0;
    }

    // Tornado / fluid splash at VFX UUID pins
    // Water twisters — hide permanently after spline kill
    const showTwisters = !this.twisterDead && (!!beat.tornado || !!beat.whirlpools);
    if (this.tornadoRoot) {
      this.tornadoRoot.visible = showTwisters;
      if (showTwisters) this.stage.place(this.tornadoRoot, 'vfx_tornado');
    }
    if (this.cycloneClones.length) {
      const pins = ['vfx_whirlpool_0', 'vfx_whirlpool_1'] as const;
      for (let i = 0; i < this.cycloneClones.length; i++) {
        const c = this.cycloneClones[i];
        c.visible = showTwisters;
        if (showTwisters) this.stage.place(c, pins[i] ?? 'vfx_tornado');
      }
    }

    // Vertical ward wall — faces leviathan, blocks beam path
    if (this.wardWallRoot) {
      this.wardWallRoot.visible = !!beat.wardWall && !this.pinataFired;
    }

    // Mage spell-splines kill twisters
    if (prev !== idx && beat.mageSplineKill) {
      this.fireMageSplinesAtTwisters();
    }

    // 0–0.1s static channel lock on leviathan station
    if (beat.leviChannelLock) {
      this.leviChannelLockPos = this.leviathanRoot.position.clone();
    } else if (prev !== idx && this.lastBeatId === 'dragon_channel_lock') {
      this.leviChannelLockPos = null;
    }

    // Blowback intensity for ship rock
    if (beat.blowback) this.blowbackT = Math.max(this.blowbackT, 1.2);
    if (prev !== idx && beat.blowback) {
      this.multiCam.impact(6, 0.55);
    }
    if (this.fluidSplash) {
      // Fluid volume near leviathan waterline on surface/breach/whirlpool beats
      const leviAt = beat.actors.leviathan?.at ?? '';
      const splash =
        leviAt.includes('surface') ||
        leviAt.includes('breach') ||
        leviAt.includes('rise') ||
        leviAt.includes('dive') ||
        leviAt.includes('swim') ||
        !!beat.whirlpools;
      this.fluidSplash.visible = splash;
      if (splash && this.leviathanRoot) {
        const p = this.leviathanRoot.position.clone();
        p.y = 0.2;
        this.fluidSplash.position.copy(p);
      }
    }

    // Hard rise/breach splash when beat changes into surface exit
    if (prev !== idx && this.waterSplash) {
      const leviAt = beat.actors.leviathan?.at ?? '';
      const bias = surfaceBiasFromLeviAt(leviAt);
      if (bias >= 3 && this.lastLeviSurfaceBias < 2) {
        const at = this.leviathanRoot.position.clone();
        at.y = 0.15;
        this.waterSplash.burstRise(at, 1.4 + (beat.storm ?? 0.5) * 0.5);
      }
    }

    // Shield impacts → short one-shot burst at ring world positions (hide when done)
    if (beat.shieldImpact && prev !== idx) {
      for (let i = 0; i < this.rings.length; i++) {
        const sn = this.supernovaPool[i % this.supernovaPool.length];
        if (!sn) continue;
        const wp = new THREE.Vector3();
        this.rings[i].getWorldPosition(wp);
        sn.position.copy(wp);
        sn.visible = true;
        sn.scale.setScalar(1);
        this.scheduleVfxHide(sn, 1.4);
      }
    }
    if (beat.shieldDefeat && prev !== idx) {
      for (let i = 0; i < this.smokeRingPool.length; i++) {
        const s = this.smokeRingPool[i];
        const wp = this.stage.worldPos('ik_ship_deck_center');
        s.position.copy(wp);
        s.position.y += 2 + i * 0.5;
        s.visible = true;
        this.scheduleVfxHide(s, 2.5);
      }
    }
    if (beat.meguminMark && prev !== idx && this.meguminRoot) {
      this.stage.place(this.meguminRoot, 'vfx_megumin_keel');
      this.meguminRoot.visible = true;
      this.scheduleVfxHide(this.meguminRoot, 3.0);
    }

    // Logo / blackout
    if (this.logoEl) {
      this.logoEl.style.opacity = beat.logo ? '1' : '0';
    }
  }

  /**
   * Fit startingfalls as DISTANT island land mass — ship fights on open water at origin.
   * Map geometry stays intact; only translated/scaled into the background.
   */
  private plantStartingFalls(root: THREE.Object3D): void {
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      const n = (o.name || '').toLowerCase();
      // Keep map water subtle — cinema OceanShader is near-field primary
      if (n.includes('water')) {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.material) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) {
            const std = mat as THREE.MeshStandardMaterial;
            if ('opacity' in std) {
              std.transparent = true;
              std.opacity = 0.22;
            }
          }
        }
      }
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    // Decade-fix 100× then fit island silhouette (never hero-height)
    fitPropSpanM(root, CIN_ISLAND_SPAN_M, 'max');
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const cx = (box.min.x + box.max.x) * 0.5;
    const cz = (box.min.z + box.max.z) * 0.5;
    root.position.set(
      CIN_ISLAND_OFFSET.x - cx + root.position.x,
      CIN_ISLAND_OFFSET.y - box.min.y + root.position.y,
      CIN_ISLAND_OFFSET.z - cz + root.position.z,
    );
  }

  /** Ship-local deck Y from mesh bounds (SI after fitPropSpanM). */
  private measureDeckY(ship: THREE.Object3D): number {
    ship.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(ship);
    // Deck ~ 55–65% up hull for stylized pirate hulls
    const y = THREE.MathUtils.lerp(box.min.y, box.max.y, 0.58);
    return Math.max(1.2, Math.min(y, box.max.y - 0.3));
  }

  /**
   * Place character root on deck: feet at deckY, XZ from stage slot.
   * Yaw-only facing toward leviathan path — no lookAt pitch tumble.
   */
  private placeOnDeck(
    root: THREE.Object3D,
    slotKey: 'deck_mage_0' | 'deck_mage_1' | 'deck_mage_2' | 'deck_mage_3' | 'deck_hero',
  ): void {
    const def = this.stage.def(slotKey);
    const p = def?.position ?? { x: 0, y: 0, z: 0 };
    root.position.set(p.x, this.deckY, p.z);
    // Prefer live leviathan world XZ; fall back to stage yaw
    const levi = this.leviathanRoot.position;
    if (this.leviathanRoot.visible && (levi.x !== 0 || levi.z !== 0)) {
      // levi is world-space parent; mages are ship-local — face toward levi in ship frame
      const leviLocal = this.shipGroup.worldToLocal(levi.clone());
      faceYawToward(root, leviLocal);
      // re-apply feet Y (faceYawToward only sets rotation)
      root.position.y = this.deckY;
    } else if (def?.yaw != null) {
      root.rotation.set(0, def.yaw, 0);
    } else {
      root.rotation.set(0, 0, 0);
    }
  }

  private fitObjectSpanLocal(obj: THREE.Object3D, spanM: number): void {
    fitPropSpanM(obj, spanM, 'max');
  }

  /** Play VFX then hide (or remove) after life seconds. */
  private scheduleVfxHide(obj: THREE.Object3D, life: number, remove = false): void {
    // Reset existing timer for same object
    this.vfxTimers = this.vfxTimers.filter((v) => v.obj !== obj);
    this.vfxTimers.push({ obj, life, remove });
  }

  private updateVfxTimers(dt: number): void {
    for (let i = this.vfxTimers.length - 1; i >= 0; i--) {
      const v = this.vfxTimers[i];
      v.life -= dt;
      if (v.life <= 0) {
        v.obj.visible = false;
        if (v.remove) this.scene.remove(v.obj);
        this.vfxTimers.splice(i, 1);
      }
    }
  }

  /**
   * Pinata the intact ship (three.js mesh shatter — no Rapier required).
   * Hides hull, spawns debris with impulse, plays explosion, launches hero from wreck.
   */
  private fireShipPinata(): void {
    this.pinataFired = true;
    this.castingActive = false;

    const origin = new THREE.Vector3();
    this.shipGroup.getWorldPosition(origin);
    origin.y += this.deckY;

    // Explosion burst at keel
    this.spawnExplosionBurst(origin);

    if (this.meguminRoot) {
      this.meguminRoot.visible = true;
      this.meguminRoot.position.copy(origin);
      this.fitObjectSpanLocal(this.meguminRoot, 10);
    }
    for (const s of this.smokeRingPool) {
      s.visible = true;
      s.position.copy(origin);
      s.position.y += 1 + Math.random() * 2;
    }

    // Shatter: clone ship child meshes as flying debris
    const source = this.intactShip;
    if (source) {
      const pieces: THREE.Object3D[] = [];
      source.updateMatrixWorld(true);
      source.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !m.geometry) return;
        pieces.push(m);
      });
      // Cap debris count
      const max = Math.min(pieces.length, 48);
      for (let i = 0; i < max; i++) {
        const src = pieces[i] as THREE.Mesh;
        const geo = src.geometry.clone();
        const mat = Array.isArray(src.material)
          ? (src.material[0] as THREE.Material).clone()
          : (src.material as THREE.Material).clone();
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        // World pose of source
        src.getWorldPosition(mesh.position);
        src.getWorldQuaternion(mesh.quaternion);
        src.getWorldScale(mesh.scale);
        // Shrink large pieces
        mesh.scale.multiplyScalar(0.85 + Math.random() * 0.3);
        this.scene.add(mesh);
        const dir = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          0.6 + Math.random() * 1.4,
          (Math.random() - 0.5) * 2,
        ).normalize();
        this.pinataPieces.push({
          mesh,
          vel: dir.multiplyScalar(8 + Math.random() * 14),
          ang: new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
          ),
          life: 3.5 + Math.random() * 2,
        });
      }
      source.visible = false;
    }
    if (this.wreckShip) this.wreckShip.visible = true;

    // Hide casters + wards (lost with ship)
    for (const r of this.mageRoots) r.visible = false;
    for (const r of this.rings) r.visible = false;
    for (const ff of this.forceFields) ff.visible = false;

    // Launch hero from wreckage
    if (this.heroRoot.parent === this.shipGroup) {
      this.scene.attach(this.heroRoot);
    }
    this.heroRoot.visible = true;
    this.heroRoot.position.copy(origin);
    this.heroRoot.position.y += 1.5;
    // Frame launch immediately
    this.frameHeroLaunchCam();
    this.launchCamLocked = true;
  }

  private spawnExplosionBurst(at: THREE.Vector3): void {
    const n = 400;
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = at.x;
      pos[i * 3 + 1] = at.y;
      pos[i * 3 + 2] = at.z;
      const d = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() * 0.8 + 0.2,
        Math.random() - 0.5,
      ).normalize().multiplyScalar(6 + Math.random() * 16);
      vel[i * 3] = d.x;
      vel[i * 3 + 1] = d.y;
      vel[i * 3 + 2] = d.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(vel, 3));
    this.explosionBurst = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xff6622,
        size: 0.35,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.scene.add(this.explosionBurst);
  }

  private updatePinata(dt: number): void {
    const g = 12;
    for (let i = this.pinataPieces.length - 1; i >= 0; i--) {
      const p = this.pinataPieces[i];
      p.life -= dt;
      p.vel.y -= g * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.ang.x * dt;
      p.mesh.rotation.y += p.ang.y * dt;
      p.mesh.rotation.z += p.ang.z * dt;
      if (p.life <= 0 || p.mesh.position.y < -4) {
        this.scene.remove(p.mesh);
        const m = p.mesh as THREE.Mesh;
        m.geometry?.dispose?.();
        if (m.material) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) mat.dispose?.();
        }
        this.pinataPieces.splice(i, 1);
      }
    }
    if (this.explosionBurst) {
      const pos = this.explosionBurst.geometry.getAttribute('position') as THREE.BufferAttribute;
      const vel = this.explosionBurst.geometry.getAttribute('velocity') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const varr = vel.array as Float32Array;
      for (let i = 0; i < arr.length / 3; i++) {
        varr[i * 3 + 1] -= g * dt * 0.6;
        arr[i * 3] += varr[i * 3] * dt;
        arr[i * 3 + 1] += varr[i * 3 + 1] * dt;
        arr[i * 3 + 2] += varr[i * 3 + 2] * dt;
      }
      pos.needsUpdate = true;
      const mat = this.explosionBurst.material as THREE.PointsMaterial;
      mat.opacity *= Math.exp(-dt * 1.2);
      if (mat.opacity < 0.05) {
        this.scene.remove(this.explosionBurst);
        this.explosionBurst.geometry.dispose();
        mat.dispose();
        this.explosionBurst = null;
      }
    }
  }

  /**
   * Vertical ward wall of small glyphs between boat and leviathan.
   * Faces the monster — idea is a magic barrier that intercepts attacks.
   */
  private buildWardWall(): void {
    if (!this.glyphTemplate || this.wardWallRoot) return;
    const wall = new THREE.Group();
    wall.name = 'cinema_ward_wall';
    // Grid of glyph tiles (small) forming a vertical shield face
    const cols = 5;
    const rows = 3;
    const gapX = CIN_WARD_GLYPH_M * 1.35;
    const gapY = CIN_WARD_GLYPH_M * 1.4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = this.glyphTemplate.clone(true);
        tile.visible = true;
        fitPropSpanM(tile, CIN_WARD_GLYPH_M, 'max');
        // Face +Z initially; wall yaw set each frame toward levi
        tile.rotation.set(0, 0, 0);
        tile.position.set(
          (c - (cols - 1) * 0.5) * gapX,
          1.1 + r * gapY,
          0,
        );
        wall.add(tile);
      }
    }
    // Soft energy pane behind tiles
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(cols * gapX * 1.15, rows * gapY * 1.25),
      new THREE.MeshBasicMaterial({
        color: 0x44ddff,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    pane.position.y = 1.1 + (rows - 1) * gapY * 0.5;
    pane.name = 'ward_pane';
    wall.add(pane);
    wall.visible = false;
    this.shipGroup.add(wall);
    // Mid-deck, slightly forward toward bow / levi path (−Z often levi)
    wall.position.set(0, this.deckY, 2.2);
    this.wardWallRoot = wall;
  }

  /** Orient ward wall to face leviathan (yaw-only) so it reads as a barrier. */
  private updateWardWall(): void {
    const wall = this.wardWallRoot;
    if (!wall || !wall.visible) return;
    const leviLocal = this.shipGroup.worldToLocal(this.leviathanRoot.position.clone());
    faceYawToward(wall, leviLocal);
    // Keep planted on deck
    wall.position.y = this.deckY;
    // Pulse pane when beam active
    const pane = wall.getObjectByName('ward_pane') as THREE.Mesh | undefined;
    if (pane?.material) {
      const mat = pane.material as THREE.MeshBasicMaterial;
      mat.opacity =
        this.dragonPhase === 'blast'
          ? 0.22 + Math.sin(this.elapsed * 14) * 0.08
          : 0.12 + Math.sin(this.elapsed * 3) * 0.03;
    }
  }

  /** Two mages fire curved spell-splines that push and destroy water twisters. */
  private fireMageSplinesAtTwisters(): void {
    const casters = [this.mageRoots[0], this.mageRoots[1]].filter(Boolean);
    const targets: THREE.Object3D[] = [];
    if (this.tornadoRoot?.visible) targets.push(this.tornadoRoot);
    for (const c of this.cycloneClones) if (c.visible) targets.push(c);
    if (!targets.length || !casters.length) return;

    for (let i = 0; i < casters.length; i++) {
      const caster = casters[i];
      const target = targets[i % targets.length];
      const from = new THREE.Vector3();
      caster.getWorldPosition(from);
      from.y += 1.35;
      const to = new THREE.Vector3();
      target.getWorldPosition(to);
      to.y = Math.max(1.5, to.y + 2);

      // Catmull-Rom spline polyline as Line
      const mid = from.clone().lerp(to, 0.5);
      mid.y += 3.5 + Math.random() * 1.5;
      mid.x += (Math.random() - 0.5) * 2;
      const curve = new THREE.CatmullRomCurve3([from, mid, to]);
      const pts = curve.getPoints(28);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: i === 0 ? 0x66eeff : 0xaaddff,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      line.name = 'mage_spell_spline';
      this.scene.add(line);
      this.spellSplines.push({
        line,
        from: from.clone(),
        to: to.clone(),
        t: 0,
        life: 1.15,
        target,
      });

      // Small glyph projectile along spline
      if (this.glyphTemplate) {
        const g = this.glyphTemplate.clone(true);
        g.visible = true;
        fitPropSpanM(g, CIN_GLYPH_SPAN_M, 'max');
        g.position.copy(from);
        this.scene.add(g);
        this.glyphs.push({
          mesh: g,
          t: 0,
          life: 1.1,
          from: from.clone(),
          to: to.clone(),
        });
      }
    }
    // Mark kill sequence — updateSpellSplines finishes hide
    this.lastBeatId = 'mage_spline_kill';
  }

  private updateSpellSplines(dt: number): void {
    for (let i = this.spellSplines.length - 1; i >= 0; i--) {
      const s = this.spellSplines[i];
      s.t += dt;
      const u = Math.min(1, s.t / s.life);
      const mat = s.line.material as THREE.LineBasicMaterial;
      mat.opacity = 1 - u * 0.85;
      // Stretch fade
      s.line.scale.setScalar(1 + u * 0.15);
      if (u >= 0.55 && s.target) {
        // Push twister away then hide
        const away = s.target.position.clone().sub(this.shipGroup.position).normalize();
        s.target.position.addScaledVector(away, dt * 6);
        s.target.scale.multiplyScalar(Math.max(0.02, 1 - dt * 1.8));
      }
      if (u >= 1) {
        this.scene.remove(s.line);
        s.line.geometry.dispose();
        mat.dispose();
        if (s.target) s.target.visible = false;
        this.spellSplines.splice(i, 1);
      }
    }
    if (this.spellSplines.length === 0 && this.lastBeatId === 'mage_spline_kill') {
      this.twisterDead = true;
      if (this.tornadoRoot) this.tornadoRoot.visible = false;
      for (const c of this.cycloneClones) c.visible = false;
    }
  }

  /** Orbit / advance water twisters toward ship while active. */
  private updateTwisterMotion(dt: number): void {
    if (this.twisterDead) return;
    this.twisterOrbitT += dt;
    const ship = this.shipGroup.position;
    const movers = [this.tornadoRoot, ...this.cycloneClones].filter(
      (o): o is THREE.Object3D => !!o && o.visible,
    );
    for (let i = 0; i < movers.length; i++) {
      const m = movers[i];
      const base = this.stage.worldPos(
        i === 0 ? 'vfx_tornado' : i === 1 ? 'vfx_whirlpool_0' : 'vfx_whirlpool_1',
      );
      const ang = this.twisterOrbitT * (0.35 + i * 0.12) + i * 2.1;
      const radius = 2.2 + Math.sin(this.twisterOrbitT * 0.8 + i) * 0.8;
      m.position.x = base.x + Math.cos(ang) * radius;
      m.position.z = base.z + Math.sin(ang) * radius;
      m.position.y = 0.05;
      // Drift slightly toward ship
      m.position.x += (ship.x - m.position.x) * dt * 0.08;
      m.position.z += (ship.z - m.position.z) * dt * 0.08;
    }
  }

  /** Hard multi-cam: hero in FG, wreck/pinata in BG */
  private frameHeroLaunchCam(): void {
    const hp = this.heroRoot.position.clone();
    // Camera slightly behind/side of hero looking past them at wreck
    const eye: [number, number, number] = [
      hp.x + 4.5,
      hp.y + 2.2,
      hp.z + 6.5,
    ];
    const look: [number, number, number] = [hp.x, hp.y + 1.0, hp.z - 2];
    this.multiCam.setTarget(eye, look, 34, 'cut');
  }

  /** Throw small spell glyph from caster toward leviathan mouth (70% smaller). */
  private throwGlyph(fromRoot: THREE.Object3D): void {
    if (!this.glyphTemplate) return;
    const mesh = this.glyphTemplate.clone(true);
    mesh.scale.set(1, 1, 1);
    this.fitObjectSpanLocal(mesh, CIN_GLYPH_SPAN_M);
    mesh.visible = true;
    const from = new THREE.Vector3();
    fromRoot.getWorldPosition(from);
    from.y += 1.25;
    // Prefer impact on ward wall mid, else mouth
    const to = this.wardWallRoot?.visible
      ? (() => {
          const w = new THREE.Vector3();
          this.wardWallRoot!.getWorldPosition(w);
          w.y += 2;
          return w;
        })()
      : this.stage.worldPos('ik_levi_mouth');
    mesh.position.copy(from);
    this.scene.add(mesh);
    this.glyphs.push({
      mesh,
      t: 0,
      life: 1.1,
      from: from.clone(),
      to: to.clone(),
    });
  }

  private updateGlyphs(dt: number): void {
    for (let i = this.glyphs.length - 1; i >= 0; i--) {
      const g = this.glyphs[i];
      g.t += dt;
      const u = Math.min(1, g.t / g.life);
      // Arc toward leviathan mouth
      g.mesh.position.lerpVectors(g.from, g.to, u);
      g.mesh.position.y += Math.sin(u * Math.PI) * 3.2;
      g.mesh.rotation.y += dt * 6;
      g.mesh.rotation.x += dt * 3;
      const fade = THREE.MathUtils.lerp(1, 0.4, u);
      g.mesh.scale.setScalar(fade);
      if (u >= 1) {
        this.scene.remove(g.mesh);
        this.glyphs.splice(i, 1);
      }
    }
  }

  private updateIkMarkers(): void {
    // Leviathan head / mouth — bone first, then bounds (mouth toward ship)
    if (this.leviathan) {
      this.leviathan.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(this.stage.root.matrixWorld).invert();
      const boat = new THREE.Vector3();
      this.shipGroup.getWorldPosition(boat);

      if (this.leviMouthBone) {
        const mouth = new THREE.Vector3();
        this.leviMouthBone.getWorldPosition(mouth);
        const head = mouth.clone();
        head.y += 0.6;
        this.stage.must('ik_levi_head').position.copy(head.applyMatrix4(inv));
        this.stage.must('ik_levi_mouth').position.copy(mouth.clone().applyMatrix4(inv));
      } else {
        const box = new THREE.Box3().setFromObject(this.leviathan);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const head = center.clone();
        head.y = box.min.y + size.y * 0.72;
        const toBoat = boat.clone().sub(center).normalize();
        const mouth = head.clone().addScaledVector(toBoat, size.z * 0.22);
        mouth.y -= size.y * 0.08;
        this.stage.must('ik_levi_head').position.copy(head.clone().applyMatrix4(inv));
        this.stage.must('ik_levi_mouth').position.copy(mouth.clone().applyMatrix4(inv));
      }
    }
    if (this.heroRoot.visible) {
      this.stage.follow('ik_hero_chest', this.heroRoot, new THREE.Vector3(0, 1.1, 0));
    }
    // Deck center tracks live ship deck (feet height + 1.2 for aim)
    this.stage.follow('ik_ship_deck_center', this.shipGroup, new THREE.Vector3(0, this.deckY + 1.2, 0));
  }

  /** Texture / lighting hygiene for leviathan GLB (cinema-readable). */
  private prepareLeviathanMaterials(root: THREE.Object3D): void {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mat of mats) {
        const std = mat as THREE.MeshStandardMaterial;
        if (std.map) {
          std.map.colorSpace = THREE.SRGBColorSpace;
          std.map.anisotropy = 4;
        }
        if (std.normalMap) std.normalMap.anisotropy = 4;
        if (std.isMeshStandardMaterial) {
          std.envMapIntensity = std.envMapIntensity ?? 0.85;
          // Slight wet sheen for ocean context
          if (std.roughness != null) std.roughness = Math.min(std.roughness, 0.72);
          std.needsUpdate = true;
        }
      }
    });
  }

  /** Prefer jaw/mouth/head bone for dragon beam origin. */
  private findLeviMouthBone(root: THREE.Object3D): THREE.Object3D | null {
    const prefer = [
      /mouth/i,
      /jaw/i,
      /maw/i,
      /head/i,
      /skull/i,
      /neck/i,
      /Bip001 Head/i,
      /Head/i,
    ];
    let best: THREE.Object3D | null = null;
    let bestScore = -1;
    root.traverse((o) => {
      const n = o.name || '';
      if (!n) return;
      for (let i = 0; i < prefer.length; i++) {
        if (prefer[i].test(n)) {
          const score = prefer.length - i;
          if (score > bestScore) {
            bestScore = score;
            best = o;
          }
          break;
        }
      }
    });
    return best;
  }

  /** Live mouth world position — bone preferred, then stage IK empty. */
  private getLeviMouthWorld(out = new THREE.Vector3()): THREE.Vector3 {
    if (this.leviMouthBone) {
      this.leviMouthBone.updateWorldMatrix(true, false);
      this.leviMouthBone.getWorldPosition(out);
      // Nudge slightly forward toward boat so beam leaves the maw
      const boat = this.shipGroup.position;
      const dir = boat.clone().sub(out).normalize();
      out.addScaledVector(dir, 0.6);
      return out;
    }
    return this.stage.worldPos('ik_levi_mouth', out);
  }

  /**
   * Anim-driven dragon phase while attack plays on station 1:
   *   t_clip < 0.1s  → snap (mouth opening, charge glow)
   *   0.1s .. 72%    → blast (beam from open mouth through anim)
   *   72% .. 100%    → aftermath (beam off BEFORE anim completes)
   * Relocation to station 2 only after this sequence ends (script dive/rise).
   */
  private resolveAnimDrivenDragonPhase(scriptPhase: DragonBeamPhase): {
    phase: DragonBeamPhase;
    chargeU: number;
    blastU: number;
  } {
    const dir = this.leviDirector;
    if (!dir || !dir.isPlayingAttack() || scriptPhase === 'off') {
      if (scriptPhase === 'off') return { phase: 'off', chargeU: 0, blastU: 0 };
      // Fallback to script clock if no clip yet
      const age = Math.max(0, this.elapsed - this.dragonPhaseStart);
      if (scriptPhase === 'snap' || age < LeviathanOceanCinema.MOUTH_OPEN_SEC) {
        return {
          phase: 'snap',
          chargeU: Math.min(1, age / LeviathanOceanCinema.MOUTH_OPEN_SEC) * 0.4,
          blastU: 0,
        };
      }
      if (scriptPhase === 'blast' || scriptPhase === 'charge') {
        return { phase: 'blast', chargeU: 1, blastU: 0.85 };
      }
      return { phase: scriptPhase, chargeU: 0.2, blastU: 0 };
    }

    const t = dir.getActionTime();
    const dur = Math.max(dir.getClipDuration(), 1.2);
    const progress = t / dur;
    const mouthOpen = LeviathanOceanCinema.MOUTH_OPEN_SEC;
    const beamEnd = LeviathanOceanCinema.BEAM_END_PROGRESS;

    if (t < mouthOpen) {
      // Mouth still opening — hot hands / charge only
      return {
        phase: 'snap',
        chargeU: 0.2 + (t / mouthOpen) * 0.5,
        blastU: 0,
      };
    }
    if (progress < beamEnd) {
      // Beam ON through attack — ends before clip finishes
      const beamSpan = Math.max(1e-3, beamEnd * dur - mouthOpen);
      const beamU = THREE.MathUtils.clamp((t - mouthOpen) / beamSpan, 0, 1);
      return {
        phase: 'blast',
        chargeU: 1,
        blastU: 0.55 + beamU * 0.45,
      };
    }
    // Beam off; remaining frames finish the attack on station 1
    const tail = THREE.MathUtils.clamp((progress - beamEnd) / (1 - beamEnd), 0, 1);
    return {
      phase: 'aftermath',
      chargeU: Math.max(0, 0.35 * (1 - tail)),
      blastU: Math.max(0, 0.2 * (1 - tail * 2)),
    };
  }

  /** Legacy thin beam fallback. */
  private updateBeam(): void {
    if (!this.fireBeam?.visible) return;
    const mouth = this.getLeviMouthWorld();
    const deck = this.stage.worldPos('ik_ship_deck_center');
    const mid = mouth.clone().lerp(deck, 0.5);
    const dist = Math.max(0.5, mouth.distanceTo(deck));
    this.fireBeam.position.copy(mid);
    this.fireBeam.scale.set(1, dist, 1);
    this.fireBeam.lookAt(deck);
    this.fireBeam.rotateX(Math.PI / 2);
  }

  /**
   * Dragon beam from open mouth through attack anim.
   * Beam ends before attack completes; levi stays on station 1 until script dive.
   */
  private updateDragonVfx(dt: number, beat: CinBattleBeat): void {
    if (!this.dragonVfx) return;

    // Sync IK mouth empty from live bone so beam + casters aim correctly
    this.syncLeviMouthIk();

    const scriptPhase = this.dragonPhase;
    if (scriptPhase === 'off' && !beat.dragonPhase && !beat.fireBeam) {
      this.dragonVfx.update({
        mouth: this.getLeviMouthWorld(),
        target: this.stage.worldPos('ik_ship_deck_center'),
        shieldPoints: [],
        phase: 'off',
        chargeU: 0,
        blastU: 0,
        dt,
        elapsed: this.elapsed,
        storm: this.stormCur,
      });
      applyLeviathanChargeLook(this.leviathan, 0, 0, beat.underwater ?? 0);
      return;
    }

    const driven = this.resolveAnimDrivenDragonPhase(
      (beat.dragonPhase ?? scriptPhase ?? 'off') as DragonBeamPhase,
    );
    // Keep internal phase in sync for captions / logs
    if (driven.phase !== this.dragonPhase && driven.phase !== 'off') {
      this.dragonPhase = driven.phase;
    }

    const mouth = this.getLeviMouthWorld();
    const deck = this.stage.worldPos('ik_ship_deck_center');

    const shieldPoints: THREE.Vector3[] = [];
    for (const ff of this.forceFields) {
      if (!ff.visible) continue;
      const wp = new THREE.Vector3();
      ff.getWorldPosition(wp);
      shieldPoints.push(wp);
    }
    for (const r of this.clockRingHolders) {
      if (!r.visible) continue;
      const wp = new THREE.Vector3();
      r.getWorldPosition(wp);
      shieldPoints.push(wp);
    }
    if (!shieldPoints.length) shieldPoints.push(deck.clone());

    this.dragonVfx.update({
      mouth,
      target: deck,
      shieldPoints,
      leviathanRoot: this.leviathanRoot,
      phase: driven.phase,
      chargeU: driven.chargeU,
      blastU: driven.blastU,
      dt,
      elapsed: this.elapsed,
      storm: this.stormCur,
    });

    applyLeviathanChargeLook(
      this.leviathan,
      driven.chargeU,
      driven.blastU,
      beat.underwater ?? (this.leviathanRoot.position.y < 0.5 ? 0.6 : 0.1),
    );
  }

  /** Push live mouth bone into stage IK empty (beam + mage look-ats). */
  private syncLeviMouthIk(): void {
    if (!this.leviMouthBone) return;
    const wp = new THREE.Vector3();
    this.leviMouthBone.getWorldPosition(wp);
    const inv = new THREE.Matrix4().copy(this.stage.root.matrixWorld).invert();
    this.stage.must('ik_levi_mouth').position.copy(wp.clone().applyMatrix4(inv));
  }

  /**
   * Couple leviathan Y to ocean swell + script base height.
   * Stage location Y is the SSOT base; swell is a small additive offset.
   */
  private updateLeviathanWaterCoupling(beat: CinBattleBeat): number {
    if (!this.leviathanRoot.visible) return -12;
    const leviAt = beat.actors.leviathan?.at ?? '';
    const def = leviAt ? this.stage.def(leviAt) : null;
    const baseY = def?.position.y ?? this.leviathanRoot.position.y;
    const x = this.leviathanRoot.position.x;
    const z = this.leviathanRoot.position.z;

    const surfaceBias = surfaceBiasFromLeviAt(leviAt);

    const waterY = leviathanWaterY(baseY, x, z, this.elapsed, this.stormCur, surfaceBias);
    this.leviathanRoot.position.y = THREE.MathUtils.lerp(
      this.leviathanRoot.position.y,
      waterY,
      0.2,
    );

    // Wet leather sheen when near/under waterline; dries slightly when fully above
    const wet =
      surfaceBias < 0
        ? 0.9
        : surfaceBias < 2
          ? 0.75
          : THREE.MathUtils.clamp(1.1 - surfaceBias * 0.12, 0.25, 0.7);
    applyLeviathanWetness(this.leviathan, wet);
    this.lastLeviSurfaceBias = surfaceBias;
    return surfaceBias;
  }

  private tick = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(0.05, this.clock.getDelta());
    if (!this.ready) {
      if (this.post) this.post.render();
      else this.renderer.render(this.scene, this.camera);
      return;
    }
    this.elapsed += dt;

    const { idx, beat } = battleBeatAt(this.elapsed);
    if (idx !== this.beatIdx) this.applyBeat(idx);

    // Storm — OceanShader uniforms (uStormIntensity, not toy uStorm)
    this.stormCur += ((beat.storm ?? 0.5) - this.stormCur) * Math.min(1, dt * 1.5);
    if (this.waterMat) {
      this.waterMat.uniforms.uTime.value = this.elapsed;
      if (this.waterMat.uniforms.uStormIntensity) {
        this.waterMat.uniforms.uStormIntensity.value = this.stormCur;
      }
      if (this.waterMat.uniforms.uWaveHeight) {
        this.waterMat.uniforms.uWaveHeight.value = 1.1 + this.stormCur * 0.9;
      }
    }
    this.flash *= Math.exp(-dt * 5);
    if (this.stormCur > 0.55 && Math.random() < dt * 0.3 * this.stormCur) {
      this.flash = 0.5;
    }
    this.dirLight.intensity = 0.75 + this.flash * 2.5;

    // Ship bob + roll + beam blowback (casters parented → ride deck)
    this.blowbackT = Math.max(0, this.blowbackT - dt);
    const blow = this.blowbackT > 0 ? Math.sin(this.elapsed * 22) * this.blowbackT * 0.12 : 0;
    const bob = Math.sin(this.elapsed * 1.5) * (0.22 + this.stormCur * 0.45);
    const roll =
      Math.sin(this.elapsed * 0.9) * (beat.shipRoll ?? 0.1) + blow * 1.4;
    const pitch =
      Math.sin(this.elapsed * 1.1) * (beat.shipPitch ?? 0.05) + blow * 0.6;
    this.shipGroup.position.y = bob;
    // Blowback shove away from leviathan
    if (this.blowbackT > 0) {
      const away = this.shipGroup.position.clone().sub(this.leviathanRoot.position);
      away.y = 0;
      if (away.lengthSq() > 1e-4) {
        away.normalize();
        this.shipGroup.position.x += away.x * dt * this.blowbackT * 2.2;
        this.shipGroup.position.z += away.z * dt * this.blowbackT * 2.2;
      }
    }
    this.shipGroup.rotation.z = roll;
    this.shipGroup.rotation.x = pitch;

    // Keep mage feet locked to deck slots while ship rolls
    const mageKeysTick = ['deck_mage_0', 'deck_mage_1', 'deck_mage_2', 'deck_mage_3'] as const;
    for (let i = 0; i < this.mageRoots.length; i++) {
      const root = this.mageRoots[i];
      if (!root.visible) continue;
      const def = this.stage.def(mageKeysTick[i]);
      if (!def) continue;
      root.position.x = def.position.x;
      root.position.z = def.position.z;
      root.position.y = this.deckY; // feet on deck — IK is upper-body only
    }
    if (
      this.heroRoot.parent === this.shipGroup &&
      (beat.heroMode === 'deck' || beat.heroMode === 'brace')
    ) {
      const hd = this.stage.def('deck_hero');
      if (hd) {
        this.heroRoot.position.set(hd.position.x, this.deckY, hd.position.z);
      }
    }

    // Clock-hand ring spin (local Z only) + force-field pulse
    for (const holder of this.clockRingHolders) {
      tickClockRing(holder, dt, 22);
    }
    for (const ff of this.forceFields) {
      tickForceField(ff, this.elapsed, ff.visible && !this.pinataFired);
    }
    // Glyphs: fire while casting, remove mesh when flight ends
    this.glyphCd -= dt;
    if (this.castingActive && !this.pinataFired && this.glyphCd <= 0) {
      this.glyphCd = 0.75;
      for (const root of this.mageRoots) {
        if (root.visible) this.throwGlyph(root);
      }
    }
    this.updateGlyphs(dt);
    this.updateVfxTimers(dt);

    // Cycle 2H magic attack clips across mages until boat is blasted apart
    this.mage2hCd -= dt;
    if (!this.pinataFired && this.castingActive && this.mage2hCd <= 0) {
      this.mage2hCd = 1.15;
      this.mage2hIndex = (this.mage2hIndex + 1) % 3;
      const hints =
        this.mage2hIndex === 0
          ? ['2h_magic_attack_1', '2h_magic_attack', 'attack']
          : this.mage2hIndex === 1
            ? ['2h_magic_attack_2', '2h_magic_attack', 'attack']
            : ['2h_magic_attack_3', '2h_magic_attack_fallback', 'attack', 'combat'];
      for (const d of this.mageDirectors) {
        d.play(hints, { fade: 0.18, loop: THREE.LoopRepeat, restart: true });
      }
    }

    // Pinata debris + explosion sim
    if (this.pinataFired) this.updatePinata(dt);

    // While hero is in air after launch, keep camera framed on them
    if (
      this.pinataFired &&
      (beat.heroMode === 'throw' || beat.heroMode === 'air') &&
      this.heroRoot.visible
    ) {
      const hp = this.heroRoot.position;
      this.multiCam.setTarget(
        [hp.x + 5, hp.y + 2.5, hp.z + 7],
        [hp.x, hp.y + 0.8, hp.z - 1],
        36,
        'blend',
      );
    }

    // Hero throw arc (world space after detach)
    if (beat.heroMode === 'throw' || beat.heroMode === 'air') {
      if (this.heroRoot.parent === this.shipGroup) this.scene.attach(this.heroRoot);
      const t0 = 31;
      const t1 = 35.5;
      const u = THREE.MathUtils.clamp((this.elapsed - t0) / (t1 - t0), 0, 1);
      const a = this.stage.worldPos('throw_apex');
      const b = this.stage.worldPos('throw_end');
      this.heroRoot.position.lerpVectors(a, b, u);
      this.heroRoot.position.y += Math.sin(u * Math.PI) * 2.5 * (1 - u);
      this.heroRoot.rotation.set(u * 2, u * 3, u * 1.2);
      this.heroRoot.visible = true;
    } else if (beat.heroMode === 'sink') {
      if (this.heroRoot.parent === this.shipGroup) this.scene.attach(this.heroRoot);
      const b = this.stage.worldPos('throw_end');
      const u = THREE.MathUtils.clamp((this.elapsed - 40) / 6, 0, 1);
      this.heroRoot.position.set(b.x, b.y - u * 3.5, b.z);
      this.heroRoot.visible = true;
    }

    // Leviathan: yaw-only face boat, water Y, wet hide, splash
    // 0–0.1s channel lock: freeze XZ (static attack channel pose)
    let surfaceBias = this.lastLeviSurfaceBias;
    if (this.leviathanRoot.visible) {
      faceYawToward(this.leviathanRoot, this.shipGroup.position);
      if (beat.leviChannelLock || this.dragonPhase === 'snap') {
        if (!this.leviChannelLockPos) {
          this.leviChannelLockPos = this.leviathanRoot.position.clone();
        }
        this.leviathanRoot.position.x = this.leviChannelLockPos.x;
        this.leviathanRoot.position.z = this.leviChannelLockPos.z;
        // Hold Y mostly static during channel (tiny swell only)
        this.leviathanRoot.position.y = THREE.MathUtils.lerp(
          this.leviathanRoot.position.y,
          this.leviChannelLockPos.y,
          0.35,
        );
        surfaceBias = surfaceBiasFromLeviAt(beat.actors.leviathan?.at ?? 'levi_beam');
        this.lastLeviSurfaceBias = surfaceBias;
      } else {
        if (this.dragonPhase === 'blast' || this.dragonPhase === 'aftermath') {
          this.leviChannelLockPos = null;
        }
        surfaceBias = this.updateLeviathanWaterCoupling(beat);
      }
      this.spineIk.aimAtObject('leviathan', this.stage.get('ik_ship_deck_center'), 0.8, 0);
    }

    this.updateWardWall();
    this.updateTwisterMotion(dt);
    this.updateSpellSplines(dt);
    this.waterSplash?.update(
      dt,
      this.leviathanRoot.position,
      surfaceBias,
      this.stormCur,
      this.leviathanRoot.visible,
    );
    // Water-textured cyclones (spin foam UV)
    tickWaterCyclone(this.tornadoRoot, dt, this.elapsed);
    for (const c of this.cycloneClones) tickWaterCyclone(c, dt, this.elapsed);

    // Keep mages yaw-facing leviathan while on deck
    if (!this.pinataFired) {
      for (let i = 0; i < this.mageRoots.length; i++) {
        const root = this.mageRoots[i];
        if (!root.visible) continue;
        const leviLocal = this.shipGroup.worldToLocal(this.leviathanRoot.position.clone());
        faceYawToward(root, leviLocal);
        root.position.y = this.deckY;
      }
    }

    // 1) Mixers FIRST — mouth open at 0.1s is measured from clip time
    this.leviDirector?.update(dt);
    for (const d of this.mageDirectors) d.update(dt);
    this.heroDirector?.update(dt);
    this.fluidMixer?.update(dt);

    // 2) IK empties from live bones (mouth follows jaw through attack)
    this.updateIkMarkers();
    this.spineIk.updateAll({ smooth: 0.2, maxYawDeg: 55, maxPitchDeg: 32 });

    // 3) Dragon beam from open mouth — driven by attack clip time, ends before anim done
    this.updateDragonVfx(dt, beat);
    this.updateBeam();

    // ── Movie camera (sole owner) ────────────────────────────────────
    this.multiCam.update(dt);
    const handheld = 0.035 + this.stormCur * 0.07 + (beat.shipPinata || beat.fireBeam ? 0.04 : 0);
    const cam = this.multiCam.evaluate(handheld);
    this.camera.position.copy(cam.pos);
    this.camera.lookAt(cam.look);
    this.camera.fov = cam.fov;
    this.camera.updateProjectionMatrix();

    // ── Film grade (exposure + post bloom/tint/vignette) ──────────────
    const blackT = beat.blackout ?? 0;
    this.blackoutCur += (blackT - this.blackoutCur) * 0.08;
    this.renderer.toneMappingExposure =
      (beat.exposure ?? 0.95) * (1 - this.blackoutCur * 0.85);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = (beat.fogDensity ?? 0.012) + this.blackoutCur * 0.01;
      // Cool storm fog color
      this.scene.fog.color.setRGB(
        0.04 + this.blackoutCur * 0.02,
        0.06 + this.stormCur * 0.02,
        0.09,
      );
    }

    // Smooth post toward beat targets (film, not snap)
    if (this.post) {
      const targetBloom = THREE.MathUtils.clamp(
        (this.bloomCur || 0.35) * 0.55 +
          (beat.fireBeam || beat.dragonPhase === 'blast' ? 0.35 : 0) +
          (beat.shipPinata ? 0.4 : 0) +
          this.flash * 0.5,
        0.15,
        1.15,
      );
      this._bloomSmoothed = THREE.MathUtils.lerp(this._bloomSmoothed, targetBloom, Math.min(1, dt * 2.5));
      this.post.applyFilmLook({
        bloom: this._bloomSmoothed,
        bloomRadius: 0.4 + (beat.bloom ?? 0.3) * 0.25,
        bloomThreshold: beat.fireBeam || beat.dragonPhase === 'blast' ? 0.55 : 0.72,
        tint: this.filmTintCur,
        vignette: this.filmVigCur + this.blackoutCur * 0.25,
        contrast: this.filmContrastCur,
      });
    }

    // Lightning flash boosts hemi briefly
    this.hemi.intensity = 0.5 + this.flash * 1.2 + this.stormCur * 0.12;

    this.cbs.onProgress?.(
      Math.min(1, this.elapsed / LEVIATHAN_BATTLE_DURATION_SEC),
      this.elapsed,
    );

    if (this.elapsed >= LEVIATHAN_BATTLE_DURATION_SEC) {
      this.cbs.onComplete?.();
      return;
    }

    // Film pipeline render (never raw renderer alone when post is up)
    if (this.post) this.post.render();
    else this.renderer.render(this.scene, this.camera);
  }

  private _bloomSmoothed = 0.4;

  private resize(): void {
    const w = this.host.clientWidth || 1;
    const h = this.host.clientHeight || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.post?.resize(w, h);
  }

  skip(): void {
    this.elapsed = LEVIATHAN_BATTLE_DURATION_SEC;
    this.cbs.onComplete?.();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs?.disconnect();
    this.leviDirector?.dispose();
    for (const d of this.mageDirectors) d.dispose();
    this.heroDirector?.dispose();
    this.spineIk.dispose();
    this.stage.dispose();
    for (const p of this.pinataPieces) {
      this.scene.remove(p.mesh);
    }
    this.pinataPieces = [];
    if (this.explosionBurst) {
      this.scene.remove(this.explosionBurst);
      this.explosionBurst = null;
    }
    for (const g of this.glyphs) this.scene.remove(g.mesh);
    this.glyphs = [];
    this.dragonVfx?.dispose();
    this.dragonVfx = null;
    this.waterSplash?.dispose();
    this.waterSplash = null;
    for (const c of this.cycloneClones) this.scene.remove(c);
    this.cycloneClones = [];
    for (const s of this.spellSplines) {
      this.scene.remove(s.line);
      s.line.geometry.dispose();
      (s.line.material as THREE.Material).dispose();
    }
    this.spellSplines = [];
    this.wardWallRoot = null;
    this.boxSys?.dispose();
    this.boxSys = null;
    this.post?.dispose();
    this.post = null;
    this.logoEl?.remove();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

/** Barrel alias for gates / docs */
export { LeviathanOceanCinema as ShipwreckTutorialCinema };
export const STAGE_ID = LEVIATHAN_STAGE_ID;
