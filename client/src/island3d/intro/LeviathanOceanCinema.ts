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
  CIN_HERO_THROW_M,
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

function plantHeight(obj: THREE.Object3D, heightM: number): void {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  obj.scale.multiplyScalar(heightM / Math.max(size.y, 0.001));
  obj.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(obj);
  obj.position.y -= b2.min.y;
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

    // Ship at ship_origin UUID
    this.intactShip = ship ?? makeProceduralShip();
    fitLength(this.intactShip, CIN_SHIP_LOA_M);
    this.shipGroup.add(this.intactShip);
    this.stage.place(this.shipGroup, 'ship_origin');

    this.wreckShip = wreck ?? makeProceduralShip();
    fitLength(this.wreckShip, 16);
    this.wreckShip.visible = false;
    this.shipGroup.add(this.wreckShip);

    // Leviathan
    this.leviathan = leviPack?.root ?? makeProceduralLeviathan();
    fitLength(this.leviathan, CIN_LEVIATHAN_LOA_M);
    this.leviathanRoot.add(this.leviathan);
    this.stage.place(this.leviathanRoot, 'levi_hidden');
    if (leviPack?.clips?.length) {
      this.leviDirector = new CinemaAnimDirector(this.leviathan, leviPack.clips);
      this.leviDirector.play('idle', { fade: 0.2 });
    }
    this.spineIk.bind('leviathan', this.leviathan);

    // 4 human mages → deck UUID slots
    const magePacks = [m0, m1, m2, m3];
    const mageKeys = ['deck_mage_0', 'deck_mage_1', 'deck_mage_2', 'deck_mage_3'] as const;
    const actorIds = ['mage_0', 'mage_1', 'mage_2', 'mage_3'] as const;
    for (let i = 0; i < 4; i++) {
      const pack = magePacks[i];
      const root = new THREE.Group();
      root.name = actorIds[i];
      const mesh = pack?.root ? pack.root.clone(true) : makeCapsuleHero();
      plantHeight(mesh, CIN_HUMAN_M);
      root.add(mesh);
      this.mages.push(mesh);
      this.mageRoots.push(root);

      if (pack?.clips?.length) {
        const dir = new CinemaAnimDirector(mesh, pack.clips);
        dir.play(['idle', 'stand'], { fade: 0.2 });
        this.mageDirectors.push(dir);
      }

      // Ring
      if (ring) {
        const r = ring.clone(true);
        const box = new THREE.Box3().setFromObject(r);
        const span = Math.max(...box.getSize(new THREE.Vector3()).toArray(), 0.001);
        r.scale.setScalar(CIN_RING_SPAN_M / span);
        r.position.set(0, 2.15, 0.45);
        r.visible = false;
        root.add(r);
        this.rings.push(r);
      }

      // Parent to ship so deck slots ride hull; place in ship-local
      this.shipGroup.add(root);
      this.stage.place(root, mageKeys[i], { copyYaw: true, localToParent: this.shipGroup });
      this.spineIk.bind(actorIds[i], mesh);
    }

    // Hero — human unarmed default (throw watch)
    {
      const mesh = heroPack?.root ?? makeCapsuleHero();
      plantHeight(mesh, CIN_HUMAN_M);
      this.hero = mesh;
      this.heroRoot.add(mesh);
      this.heroRoot.name = 'hero_throw';
      this.stage.place(this.heroRoot, 'deck_hero');
      if (heroPack?.clips?.length) {
        this.heroDirector = new CinemaAnimDirector(mesh, heroPack.clips);
        this.heroDirector.play(['idle', 'stand'], { fade: 0.2 });
      }
      this.spineIk.bind('hero', mesh);
    }

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
      if (this.leviDirector && a.anim) {
        this.leviDirector.play(animHintsFor(a.anim), {
          fade: 0.3,
          timeScale: a.timeScale ?? 1,
          restart: prev !== idx && (a.anim.includes('attack') || a.anim.includes('roar')),
        });
      } else if (this.leviDirector && a.timeScale != null) {
        this.leviDirector.setTimeScale(a.timeScale);
      }
      if (a.lookAt) {
        const t = this.stage.get(a.lookAt);
        this.spineIk.aimAtObject('leviathan', t, a.ikWeight ?? 0.6);
      }
    }

    const mageActors = ['mage_0', 'mage_1', 'mage_2', 'mage_3'] as const;
    for (let i = 0; i < 4; i++) {
      const a = assign[mageActors[i]];
      const root = this.mageRoots[i];
      if (!a || !root) continue;
      this.stage.place(root, a.at, { copyYaw: true, localToParent: this.shipGroup });
      root.visible = a.visible !== false;
      if (this.mageDirectors[i] && a.anim) {
        this.mageDirectors[i].play(animHintsFor(a.anim), { fade: 0.28 });
      }
      if (a.lookAt) {
        this.spineIk.aimAtObject(mageActors[i], this.stage.get(a.lookAt), a.ikWeight ?? 0.7, 0.5);
      } else {
        this.spineIk.aim(mageActors[i], null, 0);
      }
    }

    if (assign.hero) {
      const a = assign.hero;
      // Throw arc: world positions; deck: ship-local
      if (beat.heroMode === 'throw' || beat.heroMode === 'air' || beat.heroMode === 'sink') {
        this.stage.place(this.heroRoot, a.at, { copyYaw: false });
      } else if (beat.heroMode === 'hidden') {
        this.heroRoot.visible = false;
      } else {
        // deck / brace — keep near ship, world place from deck_hero then offset with ship
        const p = this.stage.worldPos(a.at);
        this.heroRoot.position.copy(p);
        // ride ship bob
        this.heroRoot.position.y = p.y + Math.sin(this.elapsed * 1.5) * 0.15;
      }
      this.heroRoot.visible = a.visible !== false && beat.heroMode !== 'hidden';
      if (this.heroDirector && a.anim) {
        this.heroDirector.play(animHintsFor(a.anim), { fade: 0.25 });
      }
      if (a.lookAt) {
        this.spineIk.aimAtObject('hero', this.stage.get(a.lookAt), a.ikWeight ?? 0.7, 0.4);
      }
    }

    // Rings
    for (const r of this.rings) r.visible = !!beat.rings;

    // Ship intact / pinata
    if (this.intactShip) this.intactShip.visible = beat.shipIntact !== false && !this.pinataFired;
    if (this.wreckShip) this.wreckShip.visible = beat.shipIntact === false || this.pinataFired;
    if (beat.shipPinata && !this.pinataFired) {
      this.pinataFired = true;
      if (this.intactShip) this.intactShip.visible = false;
      if (this.wreckShip) this.wreckShip.visible = true;
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

  /** Fit startingfalls: stones near origin, hide baked water (Gerstner owns near field). */
  private plantStartingFalls(root: THREE.Object3D): void {
    root.updateMatrixWorld(true);
    // Soft-hide map water planes — cinema Gerstner is primary
    root.traverse((o) => {
      const n = (o.name || '').toLowerCase();
      if (n.includes('water')) {
        o.visible = false;
      }
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    // Prefer stones as stage scale reference
    let stone: THREE.Object3D | null = null;
    root.traverse((o) => {
      const n = (o.name || '').toLowerCase();
      if (!stone && (n.includes('stone_1') || n.includes('stones'))) stone = o;
    });
    fitLength(root, 90);
    root.updateMatrixWorld(true);
    if (stone) {
      const box = new THREE.Box3().setFromObject(stone);
      const c = box.getCenter(new THREE.Vector3());
      root.position.x -= c.x;
      root.position.z -= c.z;
      root.position.y -= box.min.y;
    } else {
      const box = new THREE.Box3().setFromObject(root);
      root.position.y -= box.min.y;
    }
  }

  private updateIkMarkers(): void {
    // Keep IK empties following live leviathan head / mouth / hero chest / deck
    if (this.leviathan) {
      // Approximate head: top of leviathan bounds
      this.leviathan.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(this.leviathan);
      const head = new THREE.Vector3(
        (box.min.x + box.max.x) * 0.5,
        box.max.y * 0.85 + box.min.y * 0.15,
        (box.min.z + box.max.z) * 0.5,
      );
      const mouth = head.clone();
      mouth.y -= 1.2;
      mouth.z += 2;
      const inv = new THREE.Matrix4().copy(this.stage.root.matrixWorld).invert();
      const headLocal = head.clone().applyMatrix4(inv);
      const mouthLocal = mouth.clone().applyMatrix4(inv);
      this.stage.must('ik_levi_head').position.copy(headLocal);
      this.stage.must('ik_levi_mouth').position.copy(mouthLocal);
    }
    if (this.heroRoot.visible) {
      this.stage.follow('ik_hero_chest', this.heroRoot, new THREE.Vector3(0, 1.1, 0));
    }
    this.stage.follow('ik_ship_deck_center', this.shipGroup, new THREE.Vector3(0, 3.4, 0));
  }

  private updateBeam(): void {
    if (!this.fireBeam?.visible || !this.leviathan) return;
    const mouth = this.stage.worldPos('ik_levi_mouth');
    const deck = this.stage.worldPos('ik_ship_deck_center');
    const mid = mouth.clone().lerp(deck, 0.5);
    const dist = mouth.distanceTo(deck);
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

    // Ship bob + roll from script
    const bob = Math.sin(this.elapsed * 1.5) * (0.22 + this.stormCur * 0.45);
    const roll = Math.sin(this.elapsed * 0.9) * (beat.shipRoll ?? 0.1);
    const pitch = Math.sin(this.elapsed * 1.1) * (beat.shipPitch ?? 0.05);
    this.shipGroup.position.y = bob;
    this.shipGroup.rotation.z = roll;
    this.shipGroup.rotation.x = pitch;

    // Hero deck ride
    if (beat.heroMode === 'deck' || beat.heroMode === 'brace') {
      const p = this.stage.worldPos('deck_hero');
      this.heroRoot.position.set(p.x, p.y + bob, p.z);
      this.heroRoot.rotation.z = roll * 0.5;
      this.heroRoot.visible = true;
    } else if (beat.heroMode === 'throw' || beat.heroMode === 'air') {
      // lerp throw_apex → throw_end across breach→twenty window
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
      const b = this.stage.worldPos('throw_end');
      const u = THREE.MathUtils.clamp((this.elapsed - 40) / 6, 0, 1);
      this.heroRoot.position.set(b.x, b.y - u * 3.5, b.z);
      this.heroRoot.visible = true;
    }

    // Soft leviathan sway at current path node
    if (this.leviathanRoot.visible) {
      this.leviathanRoot.position.y += Math.sin(this.elapsed * 0.9) * 0.01;
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
    this.logoEl?.remove();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

/** Barrel alias for gates / docs */
export { LeviathanOceanCinema as ShipwreckTutorialCinema };
export const STAGE_ID = LEVIATHAN_STAGE_ID;
