/**
 * LeviathanOceanCinema — production /island-3d opener (v8 · scripted battle).
 *
 * Architecture (cinema best practices):
 *  1. Stage graph — every pin is a stable positional UUID (leviathanCinemaStage SSOT)
 *  2. Battle script — beats assign actors → UUID + spine IK look targets
 *  3. Spine IK — Bip001 torso aim after mixer update
 *  4. Multi-cam — eye/look UUIDs only (camera sole owner)
 *  5. Cast — 4 human mages on deck + 1 human unarmed throw hero + leviathan
 *
 * SI: 1 unit = 1 m · human 1.8 m · ship 22 m · leviathan 42 m · throw 20 m
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
  CIN_HERO_THROW_M,
  CIN_ISLAND_OFFSET,
  CIN_ISLAND_SPAN_M,
  LEVIATHAN_STAGE_ID,
  cinPos,
} from '@shared/definitions/leviathanCinemaStage';
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

/** Scale human to SI height and plant feet at local Y=0 (deck contact). */
function plantFeet(obj: THREE.Object3D, heightM: number): void {
  obj.position.set(0, 0, 0);
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const h = Math.max(size.y, 0.001);
  obj.scale.multiplyScalar(heightM / h);
  obj.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(obj);
  // Feet on y=0 of parent (deck)
  obj.position.y -= b2.min.y;
}

function plantHeight(obj: THREE.Object3D, heightM: number): void {
  plantFeet(obj, heightM);
}

function fitLength(obj: THREE.Object3D, targetLength: number): void {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.z, size.y * 0.5, 0.001);
  obj.scale.multiplyScalar(targetLength / span);
}

async function loadFirst(urls: readonly string[]): Promise<THREE.Group | null> {
  for (const url of urls) {
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

function makeProceduralShip(): THREE.Group {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(4, 2.2, 18),
    new THREE.MeshStandardMaterial({ color: 0x4a3020 }),
  );
  hull.position.y = 1.2;
  g.add(hull);
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

// ── water (near-field Gerstner) ─────────────────────────────────────────

const WATER_VERT = /* glsl */ `
  uniform float uTime; uniform float uStorm;
  varying vec3 vWorld; varying float vWave;
  vec3 g(vec2 p,float t,float a,float wl,float sp,vec2 d){
    float k=6.28318/wl; float c=sqrt(9.8/k)*sp; float f=k*(dot(d,p)-c*t);
    float amp=a*(.45+.55*uStorm); return vec3(d.x*amp*cos(f), amp*sin(f), d.y*amp*cos(f));
  }
  void main(){
    vec3 pos=position; vec2 p=pos.xz; float t=uTime; vec3 d=vec3(0.);
    d+=g(p,t,.72,16.,1.05,normalize(vec2(1.,.32)));
    d+=g(p,t,.42,8.2,1.3,normalize(vec2(-.45,1.)));
    d+=g(p,t,.22,4.1,1.7,normalize(vec2(.75,-.55)));
    pos+=d; vWave=d.y; vWorld=(modelMatrix*vec4(pos,1.)).xyz;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);
  }`;

const WATER_FRAG = /* glsl */ `
  uniform float uTime,uStorm; uniform vec3 uDeep,uShallow,uFoam;
  varying vec3 vWorld; varying float vWave;
  void main(){
    float f=smoothstep(0.,.45,vWave);
    vec3 col=mix(uDeep,uShallow,clamp(vWave*1.4+.35,0.,1.));
    col=mix(col,uFoam,f*uStorm*.55);
    gl_FragColor=vec4(col,.92);
  }`;

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
  private hemi!: THREE.HemisphereLight;
  private dirLight!: THREE.DirectionalLight;
  private flash = 0;
  private stormCur = 0.4;
  private blackoutCur = 0;
  private logoEl: HTMLImageElement | null = null;
  private resizeObs: ResizeObserver | null = null;

  private fireBeam: THREE.Mesh | null = null;
  private pinataFired = false;
  private tornadoRoot: THREE.Object3D | null = null;
  private fluidSplash: THREE.Object3D | null = null;
  private fluidMixer: THREE.AnimationMixer | null = null;
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

  constructor(host: HTMLElement, cbs: CinemaCallbacks = {}) {
    this.host = host;
    this.cbs = cbs;
    this.stage = new CinemaStageGraph(false);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
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
    this.dirLight = new THREE.DirectionalLight(0xffe0c0, 0.9);
    this.dirLight.position.set(20, 40, 12);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    this.scene.add(this.hemi, this.dirLight);

    this.buildWater();
    this.scene.add(this.shipGroup, this.leviathanRoot, this.heroRoot);

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(host);
    this.resize();
    void this.bootstrap();
  }

  private buildWater(): void {
    this.waterMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uStorm: { value: 0.4 },
        uDeep: { value: new THREE.Color(0x041820) },
        uShallow: { value: new THREE.Color(0x1a5a6e) },
        uFoam: { value: new THREE.Color(0xd0e8f4) },
      },
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(420, 420, 120, 120), this.waterMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(new THREE.Vector3(...cinPos('water_plane')));
    mesh.receiveShadow = true;
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
    const mageUrls = CIN_CAST_ASSETS.humanMage.map((u) =>
      u.startsWith('http') ? u : `${ASSETS_CDN}${u}`,
    );
    const heroUrls = CIN_CAST_ASSETS.humanUnarmed.map((u) =>
      u.startsWith('http') ? u : `${ASSETS_CDN}${u}`,
    );

    // CRITICAL path only — never block on 100MB+ VFX
    const [ship, wreck, leviPack, ring, heroPack, m0, m1, m2, m3, foundation] =
      await Promise.all([
        loadFirst(CIN_CAST_ASSETS.ship),
        loadFirst(CIN_CAST_ASSETS.wreck),
        loadFirstWithClips(CIN_CAST_ASSETS.leviathan),
        loadFirst(CIN_CAST_ASSETS.magicRing),
        loadFirstWithClips(heroUrls),
        loadFirstWithClips(mageUrls),
        loadFirstWithClips(mageUrls),
        loadFirstWithClips(mageUrls),
        loadFirstWithClips(mageUrls),
        loadFirst(CIN_CAST_ASSETS.foundation),
      ]);
    if (this.disposed) return;

    // Foundation: startingfalls waterfall island (user map) — stones stage
    if (foundation) {
      foundation.name = 'startingfalls_foundation';
      this.plantStartingFalls(foundation);
      this.scene.add(foundation);
    }

    // Ship at ship_origin UUID — SI LOA, then measure deck for feet plant
    this.intactShip = ship ?? makeProceduralShip();
    fitLength(this.intactShip, CIN_SHIP_LOA_M);
    this.shipGroup.add(this.intactShip);
    this.stage.place(this.shipGroup, 'ship_origin');
    this.deckY = this.measureDeckY(this.intactShip);

    this.wreckShip = wreck ?? makeProceduralShip();
    fitLength(this.wreckShip, 16);
    this.wreckShip.visible = false;
    this.shipGroup.add(this.wreckShip);

    // Leviathan — mouth/spine attacks aim at boat via IK
    this.leviathan = leviPack?.root ?? makeProceduralLeviathan();
    fitLength(this.leviathan, CIN_LEVIATHAN_LOA_M);
    this.leviathanRoot.add(this.leviathan);
    this.stage.place(this.leviathanRoot, 'levi_hidden');
    if (leviPack?.clips?.length) {
      this.leviDirector = new CinemaAnimDirector(this.leviathan, leviPack.clips);
      this.leviDirector.play('idle', { fade: 0.2 });
    }
    this.spineIk.bind('leviathan', this.leviathan);

    // 4 human mages — SI 1.8 m, feet on deck, face leviathan, cast rings
    const magePacks = [m0, m1, m2, m3];
    const mageKeys = ['deck_mage_0', 'deck_mage_1', 'deck_mage_2', 'deck_mage_3'] as const;
    const actorIds = ['mage_0', 'mage_1', 'mage_2', 'mage_3'] as const;
    for (let i = 0; i < 4; i++) {
      const pack = magePacks[i];
      const root = new THREE.Group();
      root.name = actorIds[i];
      const mesh = pack?.root ? pack.root.clone(true) : makeCapsuleHero();
      plantFeet(mesh, CIN_HUMAN_M);
      root.add(mesh);
      this.mages.push(mesh);
      this.mageRoots.push(root);

      if (pack?.clips?.length) {
        const dir = new CinemaAnimDirector(mesh, pack.clips);
        // Default: 2H cast loop (will re-assert on cast beats)
        dir.play(animHintsFor('cast'), { fade: 0.2, loop: THREE.LoopRepeat });
        this.mageDirectors.push(dir);
      }

      // Yin-yang magic ring (user asset) — held in cast pose in front of caster
      if (ring) {
        const r = ring.clone(true);
        const box = new THREE.Box3().setFromObject(r);
        const span = Math.max(...box.getSize(new THREE.Vector3()).toArray(), 0.001);
        r.scale.setScalar(CIN_RING_SPAN_M / span);
        // Hand/chest cast height for 1.8 m human
        r.position.set(0, 1.15, 0.55);
        r.rotation.x = -0.35;
        r.visible = false;
        root.add(r);
        this.rings.push(r);
      }

      // Parent to ship — feet on deck (XZ from stage, Y = deckY)
      this.shipGroup.add(root);
      this.placeOnDeck(root, mageKeys[i]);
      this.spineIk.bind(actorIds[i], mesh);
    }

    // Hero — SI unarmed, feet on deck, parented to ship until throw
    {
      const mesh = heroPack?.root ?? makeCapsuleHero();
      plantFeet(mesh, CIN_HUMAN_M);
      this.hero = mesh;
      this.heroRoot.add(mesh);
      this.heroRoot.name = 'hero_throw';
      this.shipGroup.add(this.heroRoot);
      this.placeOnDeck(this.heroRoot, 'deck_hero');
      if (heroPack?.clips?.length) {
        this.heroDirector = new CinemaAnimDirector(mesh, heroPack.clips);
        this.heroDirector.play(['idle', 'stand'], { fade: 0.2 });
      }
      this.spineIk.bind('hero', mesh);
    }

    // Spell glyph template (thrown at leviathan during cast/attack)
    void loadFirst(CIN_CAST_ASSETS.spellGlyph).then((g) => {
      if (this.disposed || !g) return;
      this.glyphTemplate = g;
      this.fitObjectSpanLocal(g, CIN_GLYPH_SPAN_M);
      g.visible = false;
    });

    // Load 2H magic attack clips for casters (CDN pack when present; flat attack.glb fallback)
    void this.loadMage2hAttackClips();

    // Fire beam mesh
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

    // Scene is playable now — VFX loads in background (never block ready)
    this.ready = true;
    this.cbs.onReady?.();
    this.applyBeat(0, true);
    this.tick();

    void this.loadVfxBackground();
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
        fitLength(tornado, 14);
        this.stage.place(tornado, 'vfx_tornado');
        tornado.visible = false;
        this.scene.add(tornado);
      }
      if (fluidPack?.root) {
        this.fluidSplash = fluidPack.root;
        fitLength(this.fluidSplash, 12);
        this.fluidSplash.visible = false;
        this.scene.add(this.fluidSplash);
        if (fluidPack.clips.length) {
          this.fluidMixer = new THREE.AnimationMixer(this.fluidSplash);
          for (const c of fluidPack.clips) {
            const a = this.fluidMixer.clipAction(c);
            a.setLoop(THREE.LoopRepeat, Infinity);
            a.play();
          }
        }
      }
      if (smoke) {
        for (let i = 0; i < 3; i++) {
          const s = smoke.clone(true);
          fitLength(s, 4 + i);
          s.visible = false;
          this.scene.add(s);
          this.smokeRingPool.push(s);
        }
      }
      if (meguminPack?.root) {
        this.meguminRoot = meguminPack.root;
        fitLength(this.meguminRoot, 6);
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

    // Camera from stage UUID pair
    const cam = this.stage.camPair(beat.camEye, beat.camLook);
    this.multiCam.setTarget(cam.pos, cam.look, cam.fov, beat.camMode ?? 'blend');

    // Actors → locations + anim + spine IK targets
    const assign = beat.actors;
    if (assign.leviathan && this.leviathanRoot) {
      const a = assign.leviathan;
      this.stage.place(this.leviathanRoot, a.at, { copyYaw: true });
      this.leviathanRoot.visible = a.visible !== false;
      // Always face boat when on surface
      if (a.visible !== false) {
        const boat = this.shipGroup.position.clone();
        boat.y = this.leviathanRoot.position.y;
        this.leviathanRoot.lookAt(boat);
      }
      if (this.leviDirector && a.anim) {
        this.leviDirector.play(animHintsFor(a.anim), {
          fade: 0.3,
          timeScale: a.timeScale ?? 1,
          restart: prev !== idx && (a.anim.includes('attack') || a.anim.includes('roar')),
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

    // Magic rings visible while casting wards
    for (const r of this.rings) r.visible = !!beat.rings || this.castingActive;

    // On cast/attack beats: throw spell glyphs at leviathan
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

    // Fire beam
    if (this.fireBeam) {
      this.fireBeam.visible = !!beat.fireBeam;
      (this.fireBeam.material as THREE.MeshBasicMaterial).opacity = beat.fireBeam ? 0.85 : 0;
    }

    // Tornado / fluid splash at VFX UUID pins
    if (this.tornadoRoot) {
      this.tornadoRoot.visible = !!beat.tornado;
      if (beat.tornado) this.stage.place(this.tornadoRoot, 'vfx_tornado');
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

    // Shield impacts → supernova at ring world positions
    if (beat.shieldImpact && prev !== idx) {
      for (let i = 0; i < this.rings.length; i++) {
        const sn = this.supernovaPool[i % this.supernovaPool.length];
        if (!sn) continue;
        const wp = new THREE.Vector3();
        this.rings[i].getWorldPosition(wp);
        sn.position.copy(wp);
        sn.visible = true;
        sn.scale.setScalar(1);
      }
    }
    if (beat.shieldDefeat && prev !== idx) {
      for (let i = 0; i < this.smokeRingPool.length; i++) {
        const s = this.smokeRingPool[i];
        const wp = this.stage.worldPos('ik_ship_deck_center');
        s.position.copy(wp);
        s.position.y += 2 + i * 0.5;
        s.visible = true;
      }
    }
    if (beat.meguminMark && prev !== idx && this.meguminRoot) {
      this.stage.place(this.meguminRoot, 'vfx_megumin_keel');
      this.meguminRoot.visible = true;
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
      // Keep map water subtle — cinema Gerstner is near-field primary
      if (n.includes('water')) {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.material) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) {
            const std = mat as THREE.MeshStandardMaterial;
            if ('opacity' in std) {
              std.transparent = true;
              std.opacity = 0.25;
            }
          }
        }
      }
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    fitLength(root, CIN_ISLAND_SPAN_M);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    // Ground and push island into the distance (behind/beside the fight)
    root.position.set(
      CIN_ISLAND_OFFSET.x - (box.min.x + box.max.x) * 0.5,
      CIN_ISLAND_OFFSET.y - box.min.y,
      CIN_ISLAND_OFFSET.z - (box.min.z + box.max.z) * 0.5,
    );
  }

  /** Ship-local deck Y from mesh bounds (SI after fitLength). */
  private measureDeckY(ship: THREE.Object3D): number {
    ship.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(ship);
    // Deck ~ 55–65% up hull for stylized pirate hulls
    const y = THREE.MathUtils.lerp(box.min.y, box.max.y, 0.58);
    return Math.max(1.2, Math.min(y, box.max.y - 0.3));
  }

  /** Place character root on deck: feet at deckY, XZ/yaw from stage slot. */
  private placeOnDeck(root: THREE.Object3D, slotKey: 'deck_mage_0' | 'deck_mage_1' | 'deck_mage_2' | 'deck_mage_3' | 'deck_hero'): void {
    const def = this.stage.def(slotKey);
    const p = def?.position ?? { x: 0, y: 0, z: 0 };
    root.position.set(p.x, this.deckY, p.z);
    if (def?.yaw != null) root.rotation.y = def.yaw;
    // Face leviathan (roughly -Z / toward path)
    root.lookAt(
      root.position.x + Math.sin(def?.yaw ?? 0) * 4,
      root.position.y + 1.2,
      root.position.z + Math.cos(def?.yaw ?? 0) * 4,
    );
    // Keep upright (lookAt can tilt)
    root.rotation.x = 0;
    root.rotation.z = 0;
    if (def?.yaw != null) root.rotation.y = def.yaw;
  }

  private fitObjectSpanLocal(obj: THREE.Object3D, spanM: number): void {
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const s = Math.max(size.x, size.y, size.z, 0.001);
    obj.scale.multiplyScalar(spanM / s);
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

    // Hide casters (lost with ship)
    for (const r of this.mageRoots) r.visible = false;
    for (const r of this.rings) r.visible = false;

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

  /** Throw spell glyph from caster toward leviathan mouth (attack beats). */
  private throwGlyph(fromRoot: THREE.Object3D): void {
    if (!this.glyphTemplate) return;
    const mesh = this.glyphTemplate.clone(true);
    // Reset scale then fit once
    mesh.scale.set(1, 1, 1);
    this.fitObjectSpanLocal(mesh, CIN_GLYPH_SPAN_M);
    mesh.visible = true;
    const from = new THREE.Vector3();
    fromRoot.getWorldPosition(from);
    from.y += 1.25;
    // Aim at live leviathan mouth IK
    const to = this.stage.worldPos('ik_levi_mouth');
    mesh.position.copy(from);
    this.scene.add(mesh);
    this.glyphs.push({
      mesh,
      t: 0,
      life: 1.4,
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
    // Leviathan head / mouth from bounds (mouth toward ship for attack beam)
    if (this.leviathan) {
      this.leviathan.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(this.leviathan);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      // Head: forward-upper toward ship
      const head = center.clone();
      head.y = box.min.y + size.y * 0.72;
      // Mouth slightly lower / ahead of head along boat direction
      const boat = new THREE.Vector3();
      this.shipGroup.getWorldPosition(boat);
      const toBoat = boat.clone().sub(center).normalize();
      const mouth = head.clone().addScaledVector(toBoat, size.z * 0.22);
      mouth.y -= size.y * 0.08;

      const inv = new THREE.Matrix4().copy(this.stage.root.matrixWorld).invert();
      this.stage.must('ik_levi_head').position.copy(head.clone().applyMatrix4(inv));
      this.stage.must('ik_levi_mouth').position.copy(mouth.clone().applyMatrix4(inv));
    }
    if (this.heroRoot.visible) {
      this.stage.follow('ik_hero_chest', this.heroRoot, new THREE.Vector3(0, 1.1, 0));
    }
    // Deck center tracks live ship deck (feet height + 1.2 for aim)
    this.stage.follow('ik_ship_deck_center', this.shipGroup, new THREE.Vector3(0, this.deckY + 1.2, 0));
  }

  /** Fire beam: leviathan mouth → boat deck (spine IK target). */
  private updateBeam(): void {
    if (!this.fireBeam?.visible) return;
    const mouth = this.stage.worldPos('ik_levi_mouth');
    const deck = this.stage.worldPos('ik_ship_deck_center');
    const mid = mouth.clone().lerp(deck, 0.5);
    const dist = Math.max(0.5, mouth.distanceTo(deck));
    this.fireBeam.position.copy(mid);
    this.fireBeam.scale.set(1, dist, 1);
    this.fireBeam.lookAt(deck);
    this.fireBeam.rotateX(Math.PI / 2);
  }

  private tick = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(0.05, this.clock.getDelta());
    if (!this.ready) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.elapsed += dt;

    const { idx, beat } = battleBeatAt(this.elapsed);
    if (idx !== this.beatIdx) this.applyBeat(idx);

    // Storm
    this.stormCur += ((beat.storm ?? 0.5) - this.stormCur) * Math.min(1, dt * 1.5);
    if (this.waterMat) {
      this.waterMat.uniforms.uTime.value = this.elapsed;
      this.waterMat.uniforms.uStorm.value = this.stormCur;
    }
    this.flash *= Math.exp(-dt * 5);
    if (this.stormCur > 0.55 && Math.random() < dt * 0.3 * this.stormCur) {
      this.flash = 0.5;
    }
    this.dirLight.intensity = 0.75 + this.flash * 2.5;

    // Ship bob + roll from script (casters parented → ride deck)
    const bob = Math.sin(this.elapsed * 1.5) * (0.22 + this.stormCur * 0.45);
    const roll = Math.sin(this.elapsed * 0.9) * (beat.shipRoll ?? 0.1);
    const pitch = Math.sin(this.elapsed * 1.1) * (beat.shipPitch ?? 0.05);
    this.shipGroup.position.y = bob;
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

    // Spin cast rings; throw glyphs while 2H magic attacks fire (until pinata)
    for (const r of this.rings) {
      if (r.visible) r.rotation.z += dt * 2.8;
    }
    this.glyphCd -= dt;
    if (this.castingActive && !this.pinataFired && this.glyphCd <= 0) {
      this.glyphCd = 0.75;
      for (const root of this.mageRoots) {
        if (root.visible) this.throwGlyph(root);
      }
    }
    this.updateGlyphs(dt);

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

    // Soft leviathan sway; keep facing boat + spine aim
    if (this.leviathanRoot.visible) {
      this.leviathanRoot.position.y += Math.sin(this.elapsed * 0.9) * 0.008;
      const boat = this.shipGroup.position.clone();
      boat.y = this.leviathanRoot.position.y;
      this.leviathanRoot.lookAt(boat);
      // Leviathan spine always aims mouth-path at deck
      this.spineIk.aimAtObject('leviathan', this.stage.get('ik_ship_deck_center'), 0.8, 0);
    }

    // Anim mixers FIRST
    this.leviDirector?.update(dt);
    for (const d of this.mageDirectors) d.update(dt);
    this.heroDirector?.update(dt);
    this.fluidMixer?.update(dt);
    if (this.tornadoRoot?.visible) {
      this.tornadoRoot.rotation.y += dt * 2.2;
    }

    // Then spine IK (post-mixer)
    this.updateIkMarkers();
    this.spineIk.updateAll({ smooth: 0.2, maxYawDeg: 55, maxPitchDeg: 32 });

    this.updateBeam();

    // Camera
    this.multiCam.update(dt);
    const cam = this.multiCam.evaluate(0.04 + this.stormCur * 0.06);
    this.camera.position.copy(cam.pos);
    this.camera.lookAt(cam.look);
    this.camera.fov = cam.fov;
    this.camera.updateProjectionMatrix();

    // Blackout grade via exposure
    const blackT = beat.blackout ?? 0;
    this.blackoutCur += (blackT - this.blackoutCur) * 0.08;
    this.renderer.toneMappingExposure =
      (beat.exposure ?? 0.95) * (1 - this.blackoutCur * 0.85);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = (beat.fogDensity ?? 0.012) + this.blackoutCur * 0.01;
    }

    this.cbs.onProgress?.(
      Math.min(1, this.elapsed / LEVIATHAN_BATTLE_DURATION_SEC),
      this.elapsed,
    );

    if (this.elapsed >= LEVIATHAN_BATTLE_DURATION_SEC) {
      this.cbs.onComplete?.();
      return;
    }

    this.renderer.render(this.scene, this.camera);
  };

  private resize(): void {
    const w = this.host.clientWidth || 1;
    const h = this.host.clientHeight || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
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
    this.logoEl?.remove();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

/** Barrel alias for gates / docs */
export { LeviathanOceanCinema as ShipwreckTutorialCinema };
export const STAGE_ID = LEVIATHAN_STAGE_ID;
