/**
 * LeviathanOceanCinema — production /island-3d opener (v7).
 *
 * Foundation: startingfalls.glb (waterfall island) framed on stones_v2 / Stone_1_Low*.
 * No pirate-island prop — distant islands from map Object_* meshes.
 * Best shade (key/fill/rim + 2k shadows) + high post (ACES, bloom, cool grade, vignette).
 * Combat FX: wards, leviathan beam, megumin, explosions, hull fire, tornado, pinata, 20 m throw.
 *
 * SI: 1 unit = 1 m · human 1.8 m · ship ~22 m · leviathan ~42 m LOA.
 * Assets: public/models/cinema/* + CDN grudge6/ship fallbacks.
 */
import * as THREE from 'three';
import { ASSETS_CDN } from '@/lib/grudgeConfig';
import { loadGltfCached, cloneGltfScene } from '@/lib/three/SharedGltfPipeline';
import { PostProcessing } from '../render/PostProcessing';
import {
  ShipImpulseBody,
  applyOceanTintMaterials,
  applyShieldDefeatSmokeMaterials,
  applyEtherealFireMaterials,
  applyWaterParticleMaterials,
  fitObjectSpan,
} from './cinemaVfxUtils';
import {
  createParticleEmitter,
  type ParticleEmitter,
} from '../vfx/FireSmokeParticles';
import { CinemaAnimDirector, MultiCameraDirector } from './CinemaAnimDirector';

export const HUMAN_HEIGHT_M = 1.8;
export const SHIP_LENGTH_M = 22;
export const LEVIATHAN_LENGTH_M = 42;
/** Throw distance from ship fight (meters) */
export const HERO_THROW_M = 20;

export const CINEMA_ASSETS = {
  ship: [
    `${ASSETS_CDN}/models/cinema/stylized-pirate-ship.prod.glb`,
    `${ASSETS_CDN}/models/ships/ship-pirate-medium.glb`,
    '/models/ships/ship-pirate-medium.glb',
  ],
  wreck: [
    `${ASSETS_CDN}/models/ships/ship-wreck.glb`,
    '/models/ships/ship-wreck.glb',
  ],
  leviathan: [
    '/models/cinema/leviathan.glb',
    `${ASSETS_CDN}/models/cinema/leviathan.glb`,
  ],
  magicRing: [
    '/models/cinema/magic-ring-yinyang-blue.glb',
    `${ASSETS_CDN}/models/cinema/magic-ring-yinyang-blue.glb`,
  ],
  supernova: [
    '/models/cinema/supernova-impact.prod.glb',
    `${ASSETS_CDN}/models/cinema/supernova-impact.prod.glb`,
  ],
  /** Lorenz attractor — water splash particles at leviathan entry/exit */
  waterAttractor: ['/models/cinema/water-attractor.glb'],
  /** Shield-defeat burst (recolored) */
  smokeRings: ['/models/cinema/smoke-rings.glb'],
  /** Beam / attack enhancer diodes */
  etherealDiodes: ['/models/cinema/ethereal-diodes.glb'],
  /** Sky lightning flashes around ship */
  lightningFlash: [
    '/models/cinema/lightning-flash.prod.glb',
    '/models/cinema/lightning-flash.glb',
  ],
  /** Ocean-tinted see-through whirlpools (×2, spin + shoot lightning) */
  whirlpool: ['/models/cinema/spinjitzu-whirl.glb'],
  /** Lightning bolts shot from whirlpools */
  negativeLeader: ['/models/cinema/negative-leader.glb'],
  /** Stylized explosion (optimized) — hull / shield blasts */
  stylizedExplosion: ['/models/cinema/stylized-explosion.prod.glb'],
  /** Megumin mark → animate → blast (oxterium) before ship explosion */
  meguminExplosion: [
    '/models/cinema/megumin-explosion.prod.glb',
    '/models/cinema/megumin-explosion.glb',
  ],
  /** Cinema tornado (with whirlpools / leviathan approach) */
  tornado: ['/models/cinema/tornado.prod.glb', '/models/cinema/tornado.glb'],
  hero: [
    `${ASSETS_CDN}/models/heroes/grudge6/western-kingdoms_warrior.glb`,
    `${ASSETS_CDN}/models/heroes/grudge6/orcs_warrior.glb`,
    `${ASSETS_CDN}/models/heroes/grudge6/elves_warrior.glb`,
  ],
  caster: [
    `${ASSETS_CDN}/models/heroes/grudge6/western-kingdoms_mage.glb`,
    `${ASSETS_CDN}/models/heroes/grudge6/elves_mage.glb`,
    `${ASSETS_CDN}/models/heroes/grudge6/western-kingdoms_warrior.glb`,
  ],
  /**
   * Waterfall island foundation map (startingfalls.glb).
   * Cinema shot framed around stones_v2 / Stone_1_Low* (stones_moss area).
   * NO separate pirate-island prop — distant islands come from this map.
   */
  foundation: [
    '/models/cinema/startingfalls.prod.glb',
    '/models/cinema/startingfalls.glb',
  ],
} as const;

export type HeroMode =
  | 'hidden'
  | 'deck'
  | 'brace'
  | 'throw'
  | 'air'
  | 'sea'
  | 'sink';

/** Leviathan locomotion / performance phase (drives path + clip) */
export type LeviPhase =
  | 'hidden'
  | 'swim'       // under water, swim idle through waves + shadow
  | 'surface_idle' // idle over ship
  | 'cast'       // twisters + lightning
  | 'roar_beam'  // attack and roar, slow-mo long beam
  | 'dive'
  | 'rise_attack' // up with attack
  | 'breach'     // pinata strike
  | 'idle_watch' // idle after throw
  | 'finisher'   // attack once hero blown away
  | 'gone';

export type CinemaBeat = {
  t: number;
  caption: string;
  sub: string;
  cam: { pos: [number, number, number]; look: [number, number, number]; fov?: number };
  /** blend = cinematic ease; cut = hard multi-cam switch */
  camMode?: 'blend' | 'cut';
  storm?: number;
  shipRoll?: number;
  shipPitch?: number;
  shipIntact?: boolean;
  shipPinata?: boolean;
  heroMode?: HeroMode;
  leviathan?: LeviPhase;
  /** Leviathan AnimationMixer clip hints */
  leviAnim?: 'idle' | 'attack' | 'attack and roar' | 'swim';
  /** Global anim timeScale (roar slow-mo ~0.35–0.55) */
  leviTimeScale?: number;
  /** Caster grudge6 clip hints */
  casterAnim?: 'cast' | 'defend' | 'idle' | 'attack';
  rings?: boolean;
  fireBeam?: boolean;
  fireAura?: boolean;
  shieldImpact?: boolean;
  shieldDefeat?: boolean;
  shipHit?: 'beam' | 'breach' | 'ram' | null;
  whirlpools?: boolean;
  skyLightning?: boolean;
  meguminMark?: boolean;
  stylizedBoom?: boolean;
  tornado?: boolean;
  hullFire?: boolean;
  exposure?: number;
  bloom?: number;
  fogDensity?: number;
  blackout?: number;
  logo?: boolean;
  /** Underwater grade when levi/cam submerged */
  underwater?: number;
};

/**
 * Production open (~56s) — multi-cam, anim blend, water swim → roar slow-mo beam →
 * dive → rise attack → breach pinata → throw 20m → finisher → logo → tutorial.
 *
 * Leviathan clips (from leviathan.glb): idle · attack · attack and roar
 * Casters: grudge6 mage/warrior fuzzy cast/defend/idle
 */
export const LEVIATHAN_CINEMA_BEATS: CinemaBeat[] = [
  {
    t: 0,
    caption: 'WATERFALL ISLAND',
    sub: 'Stones of the falls. Grudge6 casters hold the deck. Something swims below.',
    cam: { pos: [42, 14, 48], look: [0, 2, 0], fov: 46 },
    camMode: 'cut',
    storm: 0.4,
    shipRoll: 0.08,
    shipPitch: 0.05,
    shipIntact: true,
    heroMode: 'deck',
    leviathan: 'swim',
    leviAnim: 'idle',
    leviTimeScale: 1,
    casterAnim: 'idle',
    rings: false,
    underwater: 0.35,
    exposure: 0.88,
    bloom: 0.28,
    fogDensity: 0.01,
  },
  {
    t: 3.5,
    caption: 'SHADOW IN THE SWELL',
    sub: 'Through the water — a living shadow. Waves break over its back.',
    cam: { pos: [20, 3, 22], look: [18, -2, -8], fov: 40 },
    camMode: 'blend',
    storm: 0.5,
    shipRoll: 0.1,
    shipIntact: true,
    heroMode: 'deck',
    leviathan: 'swim',
    leviAnim: 'idle',
    casterAnim: 'idle',
    underwater: 0.55,
    exposure: 0.82,
    bloom: 0.32,
    fogDensity: 0.014,
  },
  {
    t: 7,
    caption: 'RAISE WARDS',
    sub: 'Grudge6 casters plant yin-yang rings — defensive seals to the deep.',
    cam: { pos: [8, 5.5, 12], look: [0, 3.2, 0], fov: 36 },
    camMode: 'cut',
    storm: 0.55,
    shipRoll: 0.12,
    shipIntact: true,
    heroMode: 'brace',
    leviathan: 'swim',
    leviAnim: 'idle',
    casterAnim: 'cast',
    rings: true,
    underwater: 0.15,
    exposure: 0.95,
    bloom: 0.42,
    fogDensity: 0.01,
  },
  {
    t: 11,
    caption: 'SURFACE',
    sub: 'It rises idle over the hull. Twisters spiral. The air charges.',
    cam: { pos: [-24, 10, 26], look: [6, 5, -4], fov: 42 },
    camMode: 'blend',
    storm: 0.7,
    shipRoll: 0.18,
    shipIntact: true,
    heroMode: 'brace',
    leviathan: 'surface_idle',
    leviAnim: 'idle',
    casterAnim: 'defend',
    rings: true,
    fireAura: true,
    whirlpools: true,
    tornado: true,
    skyLightning: true,
    exposure: 1.0,
    bloom: 0.48,
    fogDensity: 0.011,
  },
  {
    t: 15,
    caption: 'CAST THE STORM',
    sub: 'Lightning. Twisters. The leviathan gathers fire for the beam.',
    cam: { pos: [12, 8, 18], look: [10, 4, -6], fov: 38 },
    camMode: 'cut',
    storm: 0.8,
    shipRoll: 0.22,
    shipIntact: true,
    heroMode: 'brace',
    leviathan: 'cast',
    leviAnim: 'attack',
    casterAnim: 'defend',
    rings: true,
    fireAura: true,
    whirlpools: true,
    tornado: true,
    skyLightning: true,
    exposure: 1.05,
    bloom: 0.58,
    fogDensity: 0.012,
  },
  {
    t: 18.5,
    caption: 'ROAR',
    sub: 'Time stretches. Attack and roar — a long beam burns the wards.',
    cam: { pos: [4, 4, 14], look: [8, 3.5, -4], fov: 32 },
    camMode: 'blend',
    storm: 0.9,
    shipRoll: 0.3,
    shipIntact: true,
    heroMode: 'brace',
    leviathan: 'roar_beam',
    leviAnim: 'attack and roar',
    leviTimeScale: 0.42,
    casterAnim: 'defend',
    rings: true,
    fireBeam: true,
    fireAura: true,
    shieldImpact: true,
    meguminMark: true,
    shipHit: 'beam',
    hullFire: true,
    whirlpools: true,
    tornado: true,
    skyLightning: true,
    exposure: 1.2,
    bloom: 0.82,
    fogDensity: 0.013,
  },
  {
    t: 24,
    caption: 'DIVE',
    sub: 'Wards fail. Smoke rings bloom. The beast slides under again.',
    cam: { pos: [16, 7, 20], look: [8, 1, -10], fov: 44 },
    camMode: 'cut',
    storm: 0.75,
    shipRoll: 0.2,
    shipIntact: true,
    heroMode: 'brace',
    leviathan: 'dive',
    leviAnim: 'idle',
    leviTimeScale: 1,
    casterAnim: 'cast',
    rings: false,
    shieldDefeat: true,
    stylizedBoom: true,
    hullFire: true,
    whirlpools: true,
    tornado: true,
    skyLightning: true,
    shipHit: 'ram',
    underwater: 0.25,
    exposure: 0.92,
    bloom: 0.5,
    fogDensity: 0.012,
  },
  {
    t: 27.5,
    caption: 'RISE — ATTACK',
    sub: 'Out of the water — attack animation. The keel is marked.',
    cam: { pos: [-14, 5, 16], look: [2, 3, 0], fov: 36 },
    camMode: 'blend',
    storm: 0.88,
    shipRoll: 0.4,
    shipIntact: true,
    heroMode: 'brace',
    leviathan: 'rise_attack',
    leviAnim: 'attack',
    leviTimeScale: 0.85,
    casterAnim: 'defend',
    meguminMark: true,
    stylizedBoom: true,
    hullFire: true,
    tornado: true,
    skyLightning: true,
    shipHit: 'ram',
    exposure: 1.1,
    bloom: 0.7,
    fogDensity: 0.014,
  },
  {
    t: 31,
    caption: 'BREACH',
    sub: 'Roar into the pinata. Timber becomes confetti. You leave the deck.',
    cam: { pos: [-8, 4, 11], look: [0, 2, 0], fov: 34 },
    camMode: 'cut',
    storm: 0.95,
    shipRoll: 0.9,
    shipPitch: 0.5,
    shipIntact: false,
    shipPinata: true,
    heroMode: 'throw',
    leviathan: 'breach',
    leviAnim: 'attack and roar',
    leviTimeScale: 0.7,
    stylizedBoom: true,
    meguminMark: true,
    hullFire: true,
    fireAura: true,
    shipHit: 'breach',
    whirlpools: true,
    tornado: true,
    skyLightning: true,
    exposure: 1.22,
    bloom: 0.9,
    fogDensity: 0.015,
  },
  {
    t: 35.5,
    caption: 'TWENTY METERS',
    sub: 'Thrown clear. Camera holds you in the foreground. It idles over the wreck.',
    cam: { pos: [10, 3, 9], look: [0, 1, 0], fov: 38 },
    camMode: 'blend',
    storm: 0.75,
    shipIntact: false,
    heroMode: 'air',
    leviathan: 'idle_watch',
    leviAnim: 'idle',
    leviTimeScale: 1,
    fireAura: true,
    hullFire: true,
    tornado: true,
    exposure: 1.0,
    bloom: 0.52,
    fogDensity: 0.012,
  },
  {
    t: 40,
    caption: 'FINISHER',
    sub: 'Once more — attack as you sink. The sea closes.',
    cam: { pos: [16, 2, 8], look: [14, 0.5, 0], fov: 40 },
    camMode: 'cut',
    storm: 0.6,
    shipIntact: false,
    heroMode: 'sink',
    leviathan: 'finisher',
    leviAnim: 'attack',
    leviTimeScale: 0.9,
    stylizedBoom: true,
    fireAura: true,
    exposure: 0.85,
    bloom: 0.45,
    fogDensity: 0.016,
    blackout: 0.2,
  },
  {
    t: 44,
    caption: 'INTO THE BLACK',
    sub: 'Cold water. The convoy is gone.',
    cam: { pos: [18, 0.8, 5], look: [18, -0.5, 0], fov: 42 },
    camMode: 'blend',
    storm: 0.45,
    heroMode: 'sink',
    leviathan: 'gone',
    leviAnim: 'idle',
    exposure: 0.55,
    bloom: 0.28,
    fogDensity: 0.02,
    blackout: 0.75,
  },
  {
    t: 48,
    caption: '',
    sub: '',
    cam: { pos: [18, 0.5, 4], look: [18, -1, 0], fov: 42 },
    camMode: 'cut',
    heroMode: 'hidden',
    leviathan: 'gone',
    blackout: 1,
    logo: true,
    exposure: 0.35,
    bloom: 0.15,
  },
  {
    t: 52,
    caption: 'GRUDGE WARLORDS',
    sub: 'Wash up on the tutorial shore · chicken-gun pirate map awaits',
    cam: { pos: [18, 0.5, 4], look: [18, -1, 0], fov: 42 },
    heroMode: 'hidden',
    leviathan: 'gone',
    blackout: 1,
    logo: true,
    exposure: 0.35,
    bloom: 0.12,
  },
];

export const LEVIATHAN_CINEMA_DURATION_SEC = 56;
export const LEVIATHAN_CINEMA_SKIPPABLE_AFTER_SEC = 2.0;
/** Logo path (same-origin public) */
export const CINEMA_LOGO_URL = '/cinema/grudge-logo.jpeg';

// aliases for gate imports
export const SHIPWRECK_CINEMA_BEATS = LEVIATHAN_CINEMA_BEATS;
export const SHIPWRECK_CINEMA_DURATION_SEC = LEVIATHAN_CINEMA_DURATION_SEC;
export const SHIPWRECK_CINEMA_SKIPPABLE_AFTER_SEC = LEVIATHAN_CINEMA_SKIPPABLE_AFTER_SEC;

// ── math ─────────────────────────────────────────────────────────────────

function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / Math.max(1e-6, e1 - e0)));
  return t * t * (3 - 2 * t);
}
function plantHeight(obj: THREE.Object3D, heightM: number): void {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  obj.scale.multiplyScalar(heightM / Math.max(size.y, 0.001));
  obj.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(obj);
  obj.position.y -= b2.min.y;
}
function fitLength(obj: THREE.Object3D, targetLength: number, seatY = 0): void {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.z, size.y * 0.5, 0.001);
  obj.scale.multiplyScalar(targetLength / span);
  obj.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(obj);
  obj.position.y -= b2.min.y;
  obj.position.y += seatY;
}
function grade(root: THREE.Object3D, wet = true): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    m.receiveShadow = true;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) {
      const std = mat as THREE.MeshStandardMaterial;
      if (std && 'roughness' in std) {
        if (wet) {
          std.roughness = Math.min(0.9, (std.roughness ?? 0.7) * 0.7 + 0.12);
          std.metalness = Math.min(0.3, (std.metalness ?? 0) + 0.05);
        }
        std.needsUpdate = true;
      }
    }
  });
}

async function loadFirst(urls: readonly string[]): Promise<THREE.Group | null> {
  for (const url of urls) {
    try {
      const gltf = await loadGltfCached(url, 'critical');
      const root = cloneGltfScene(gltf);
      grade(root, true);
      return root;
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
      grade(root, true);
      return { root, clips: gltf.animations?.slice() ?? [] };
    } catch {
      /* next */
    }
  }
  return null;
}

// ── water ────────────────────────────────────────────────────────────────

const WATER_VERT = /* glsl */ `
  uniform float uTime; uniform float uStorm;
  varying vec3 vWorld; varying float vWave; varying vec3 vN;
  vec3 g(vec2 p,float t,float a,float wl,float sp,vec2 d){
    float k=6.28318/wl; float c=sqrt(9.8/k)*sp; float f=k*(dot(d,p)-c*t);
    float amp=a*(.45+.55*uStorm); return vec3(d.x*amp*cos(f), amp*sin(f), d.y*amp*cos(f));
  }
  void main(){
    vec3 pos=position; vec2 p=pos.xz; float t=uTime; vec3 d=vec3(0.);
    d+=g(p,t,.72,16.,1.05,normalize(vec2(1.,.32)));
    d+=g(p,t,.42,8.2,1.3,normalize(vec2(-.45,1.)));
    d+=g(p,t,.22,4.1,1.7,normalize(vec2(.75,-.55)));
    d+=g(p,t,.12*uStorm,2.,2.3,normalize(vec2(-.95,.15)));
    pos+=d; vWave=d.y;
    float e=.4;
    vec3 dx=g(p+vec2(e,0.),t,.72,16.,1.05,normalize(vec2(1.,.32)))-g(p-vec2(e,0.),t,.72,16.,1.05,normalize(vec2(1.,.32)));
    vN=normalize(mat3(modelMatrix)*normalize(vec3(-dx.y,e*2.,0.)));
    vec4 w=modelMatrix*vec4(pos,1.); vWorld=w.xyz;
    gl_Position=projectionMatrix*viewMatrix*w;
  }
`;
const WATER_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime,uStorm; uniform vec3 uDeep,uShallow,uFoam,uSun;
  varying vec3 vWorld; varying float vWave; varying vec3 vN;
  void main(){
    vec3 N=normalize(vN); vec3 V=normalize(cameraPosition-vWorld); vec3 L=normalize(uSun);
    float fres=pow(1.-max(dot(N,V),0.),3.4);
    float dm=clamp(.32+vWave*.55,0.,1.);
    vec3 col=mix(uDeep,uShallow,dm);
    col=mix(col,vec3(.04,.07,.1),uStorm*.62);
    vec3 H=normalize(L+V);
    float spec=pow(max(dot(N,H),0.),80.)*(.22+.5*(1.-uStorm));
    float foam=smoothstep(.22,.58,vWave)*(.35+.65*uStorm);
    col=mix(col,uFoam,foam*.62); col+=spec*vec3(.7,.82,1.);
    col+=fres*mix(vec3(.12,.22,.32),vec3(.06,.08,.1),uStorm);
    gl_FragColor=vec4(col,.96);
  }
`;

function makeProceduralShip(): THREE.Group {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3224, roughness: 0.85 });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(20, 3.4, 6), wood);
  hull.position.y = 1.3;
  g.add(hull);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 13, 8), wood);
  mast.position.set(-1, 9, 0);
  g.add(mast);
  return g;
}
function makeProceduralLeviathan(): THREE.Group {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x1a3a3a, roughness: 0.55, metalness: 0.15, emissive: 0x331100, emissiveIntensity: 0.2 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(2.2, 18, 8, 16), skin);
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 0, 0);
  g.add(body);
  const head = new THREE.Mesh(new THREE.ConeGeometry(2.4, 5, 10), skin);
  head.rotation.z = -Math.PI / 2;
  head.position.set(12, 0.5, 0);
  g.add(head);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 2), new THREE.MeshStandardMaterial({ color: 0x111111 }));
  jaw.position.set(13, -0.8, 0);
  g.add(jaw);
  return g;
}
function makeProceduralRing(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x44aaff,
    emissive: 0x2266ff,
    emissiveIntensity: 1.2,
    roughness: 0.3,
    metalness: 0.4,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });
  const torus = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.12, 12, 48), mat);
  g.add(torus);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 8, 32), mat);
  g.add(inner);
  return g;
}
function makeProceduralHero(): THREE.Group {
  const g = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: 0x3d5a4c, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.95, 6, 10), cloth);
  body.position.y = 0.95;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), new THREE.MeshStandardMaterial({ color: 0xc4a484 }));
  head.position.y = 1.68;
  g.add(head);
  return g;
}

// ── main ─────────────────────────────────────────────────────────────────

export type LeviathanCinemaCallbacks = {
  onCaption?: (caption: string, sub: string) => void;
  onProgress?: (t01: number, elapsedSec: number) => void;
  onComplete?: () => void;
  onReady?: () => void;
  onBeat?: (index: number, beat: CinemaBeat) => void;
  /** blackout 0–1 and logo visibility for gate overlay */
  onPresentation?: (opts: { blackout: number; logo: boolean }) => void;
};

export class LeviathanOceanCinema {
  private host: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private post: PostProcessing | null = null;
  private clock = new THREE.Clock();
  private raf = 0;
  private disposed = false;
  private elapsed = 0;
  private completed = false;
  private ready = false;
  private cbs: LeviathanCinemaCallbacks;

  private waterMat: THREE.ShaderMaterial | null = null;
  private skyMat: THREE.ShaderMaterial | null = null;
  private rain: THREE.Points | null = null;
  private rainVel: Float32Array | null = null;

  private dirLight: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private fillLight: THREE.DirectionalLight | null = null;
  private ambient: THREE.AmbientLight | null = null;
  private flash = 0;
  private flashCool = 0;

  /** Waterfall island foundation (startingfalls) — stones_v2 cinema stage */
  private foundationRoot: THREE.Group | null = null;
  private stonesAnchor = new THREE.Vector3(0, 0, 0);
  private foundationWaterMeshes: THREE.Object3D[] = [];

  private shipGroup = new THREE.Group();
  private intactShip: THREE.Object3D | null = null;
  private wreckShip: THREE.Object3D | null = null;
  private leviathanRoot = new THREE.Group();
  private leviathan: THREE.Object3D | null = null;
  private leviDirector: CinemaAnimDirector | null = null;
  private casterDirectors: CinemaAnimDirector[] = [];
  private multiCam = new MultiCameraDirector();
  private waterShadow: THREE.Mesh | null = null;
  private lastCamBeat = -1;
  private underwaterCur = 0;
  private heroRoot = new THREE.Group();
  private hero: THREE.Object3D | null = null;
  private casters: THREE.Group[] = [];
  private rings: THREE.Object3D[] = [];
  private supernovaPool: THREE.Object3D[] = [];
  private pinata = new THREE.Group();
  private pinataVel: THREE.Vector3[] = [];
  private pinataActive = false;
  private pinataFired = false;

  private fireBeam: THREE.Mesh | null = null;
  private fireAura: THREE.Points | null = null;
  private impactBursts: { mesh: THREE.Object3D; life: number }[] = [];

  /** VFX kits (v5) */
  private waterSplashes: THREE.Object3D[] = [];
  private smokeRingPool: THREE.Object3D[] = [];
  private etherealDiodes: THREE.Object3D | null = null;
  private skyLightning: THREE.Object3D[] = [];
  private whirlpools: THREE.Group[] = [];
  private whirlLightning: THREE.Object3D[] = [];
  private shipBody = new ShipImpulseBody();
  private lastLeviY = -20;
  private splashCool = 0;
  private skyLightningCool = 0;
  private shieldDefeatFired = false;
  private whirlActive = false;

  /** Explosion / megumin / tornado / hull fire (v6) */
  private stylizedBoomPool: THREE.Object3D[] = [];
  private meguminMarks: {
    root: THREE.Object3D;
    mixer: THREE.AnimationMixer | null;
    life: number;
    phase: 'mark' | 'play' | 'boom';
  }[] = [];
  private meguminTemplate: THREE.Object3D | null = null;
  private meguminClips: THREE.AnimationClip[] = [];
  private tornadoRoot: THREE.Object3D | null = null;
  private hullFireEmitters: ParticleEmitter[] = [];
  private hullFirePoints: THREE.Vector3[] = [];
  private activeMixers: THREE.AnimationMixer[] = [];

  private beatIdx = -1;
  private stormCur = 0.4;
  private stormT = 0.4;
  private rollCur = 0.08;
  private rollT = 0.08;
  private pitchCur = 0.05;
  private pitchT = 0.05;
  private exposureCur = 0.9;
  private bloomCur = 0.3;
  private blackoutCur = 0;
  private heroMode: HeroMode = 'hidden';
  private leviMode: LeviPhase = 'hidden';
  private throwOrigin = new THREE.Vector3();
  private throwDir = new THREE.Vector3(1, 0.35, 0.2).normalize();

  private _tmpA = new THREE.Vector3();
  private _tmpB = new THREE.Vector3();
  private resizeObs: ResizeObserver | null = null;

  constructor(host: HTMLElement, cbs: LeviathanCinemaCallbacks = {}) {
    this.host = host;
    this.cbs = cbs;

    const w = Math.max(2, host.clientWidth || window.innerWidth);
    const h = Math.max(2, host.clientHeight || window.innerHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(this.renderer.domElement);
    Object.assign(this.renderer.domElement.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      display: 'block',
    });

    this.camera = new THREE.PerspectiveCamera(48, w / h, 0.15, 900);
    const b0 = LEVIATHAN_CINEMA_BEATS[0];
    this.camera.position.set(...b0.cam.pos);
    this.camera.lookAt(...b0.cam.look);

    // Waterfall island grade — cool mist + deep water fog
    this.scene.background = new THREE.Color(0x0a1520);
    // Longer draw for distant waterfall islands; mist density tuned for startingfalls scale
    this.scene.fog = new THREE.FogExp2(0x0c1a28, 0.0055);

    // Physically-ish key/fill/rim for best shade on stones + wet ship
    this.ambient = new THREE.AmbientLight(0x1a2838, 0.22);
    this.scene.add(this.ambient);
    this.hemi = new THREE.HemisphereLight(0x8eb4d4, 0x1a140c, 0.55);
    this.scene.add(this.hemi);
    this.dirLight = new THREE.DirectionalLight(0xe8f0ff, 1.15);
    this.dirLight.position.set(40, 70, 25);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    this.dirLight.shadow.bias = -0.0002;
    this.dirLight.shadow.normalBias = 0.02;
    this.dirLight.shadow.camera.near = 2;
    this.dirLight.shadow.camera.far = 220;
    this.dirLight.shadow.camera.left = -80;
    this.dirLight.shadow.camera.right = 80;
    this.dirLight.shadow.camera.top = 80;
    this.dirLight.shadow.camera.bottom = -80;
    this.scene.add(this.dirLight);
    this.fillLight = new THREE.DirectionalLight(0x4a7aaa, 0.35);
    this.fillLight.position.set(-35, 20, -25);
    this.scene.add(this.fillLight);
    // Cool rim for leviathan silhouette
    const rim = new THREE.DirectionalLight(0x66aadd, 0.28);
    rim.position.set(-10, 12, 40);
    this.scene.add(rim);

    try {
      this.post = new PostProcessing(this.renderer, this.scene, this.camera, {
        quality: 'high',
        bloomStrength: 0.42,
        bloomRadius: 0.55,
        bloomThreshold: 0.58,
        colorTint: -0.22,
        vignetteIntensity: 0.48,
        contrast: 1.12,
      });
    } catch {
      this.post = null;
    }

    this.buildWater();
    this.buildSky();
    this.buildRain();
    this.buildFireBeam();
    this.buildFireAura();
    this.scene.add(this.shipGroup, this.leviathanRoot, this.heroRoot, this.pinata);

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(host);
    void this.bootstrap();
  }

  private buildWater(): void {
    // Near-field Gerstner around stones stage (foundation map water is hidden)
    this.waterMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uStorm: { value: 0.4 },
        uDeep: { value: new THREE.Color(0x041820) },
        uShallow: { value: new THREE.Color(0x1a5a6e) },
        uFoam: { value: new THREE.Color(0xd0e8f4) },
        uSun: { value: new THREE.Vector3(0.35, 0.88, 0.28).normalize() },
      },
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(420, 420, 160, 160), this.waterMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0;
    mesh.receiveShadow = true;
    mesh.renderOrder = -1;
    this.scene.add(mesh);
  }

  private buildSky(): void {
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uStorm: { value: 0.4 },
        uFlash: { value: 0 },
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `
        varying vec3 vDir; uniform float uTime,uStorm,uFlash;
        float n(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
        void main(){
          float h=vDir.y*.5+.5;
          vec3 low=mix(vec3(.1,.14,.2),vec3(.03,.04,.06),uStorm);
          vec3 mid=mix(vec3(.18,.24,.32),vec3(.06,.08,.1),uStorm);
          vec3 high=mix(vec3(.26,.32,.4),vec3(.09,.1,.14),uStorm);
          vec3 col=mix(low,mid,smoothstep(0.,.4,h));
          col=mix(col,high,smoothstep(.35,1.,h));
          col*=.72+.28*n(vDir.xz*2.5+uTime*.02);
          col+=vec3(.55,.35,.15)*uFlash;
          gl_FragColor=vec4(col,1.);
        }`,
    });
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(220, 32, 20), this.skyMat));
  }

  private buildRain(): void {
    const n = 4000;
    const pos = new Float32Array(n * 3);
    this.rainVel = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 90;
      pos[i * 3 + 1] = Math.random() * 40 + 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 90;
      this.rainVel[i] = 14 + Math.random() * 20;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xb8d0e4,
        size: 0.07,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.scene.add(this.rain);
  }

  private buildFireBeam(): void {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff6622,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.fireBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.9, 1, 12, 1, true), mat);
    this.fireBeam.visible = false;
    this.scene.add(this.fireBeam);
  }

  private buildFireAura(): void {
    const n = 600;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 2 + Math.random() * 8;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.random() * Math.PI;
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph) * 0.5;
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.fireAura = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xff4400,
        size: 0.35,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.fireAura.visible = false;
    this.leviathanRoot.add(this.fireAura);
  }

  private async bootstrap(): Promise<void> {
    const [
      ship, wreck, leviPack, ring, snova, hero, c0p, c1p, c2p,
      attractor, smoke, diodes, lightning, whirl, leader,
      stylized, meguminPack, tornado, foundation,
    ] = await Promise.all([
      loadFirst(CINEMA_ASSETS.ship),
      loadFirst(CINEMA_ASSETS.wreck),
      loadFirstWithClips(CINEMA_ASSETS.leviathan),
      loadFirst(CINEMA_ASSETS.magicRing),
      loadFirst(CINEMA_ASSETS.supernova),
      loadFirst(CINEMA_ASSETS.hero),
      loadFirstWithClips(CINEMA_ASSETS.caster),
      loadFirstWithClips(CINEMA_ASSETS.caster),
      loadFirstWithClips(CINEMA_ASSETS.hero),
      loadFirst(CINEMA_ASSETS.waterAttractor),
      loadFirst(CINEMA_ASSETS.smokeRings),
      loadFirst(CINEMA_ASSETS.etherealDiodes),
      loadFirst(CINEMA_ASSETS.lightningFlash),
      loadFirst(CINEMA_ASSETS.whirlpool),
      loadFirst(CINEMA_ASSETS.negativeLeader),
      loadFirst(CINEMA_ASSETS.stylizedExplosion),
      loadFirstWithClips(CINEMA_ASSETS.meguminExplosion),
      loadFirst(CINEMA_ASSETS.tornado),
      loadFirst(CINEMA_ASSETS.foundation),
    ]);
    if (this.disposed) return;
    const levi = leviPack?.root ?? null;

    // ── Foundation: startingfalls waterfall island (NO pirate-island prop) ──
    // Frame cinema around Stone_1_Low* (stones_v2 / stones_moss area).
    // Distant Object_* meshes remain as islands in the distance.
    if (foundation) {
      this.foundationRoot = foundation;
      this.plantStartingFallsFoundation(foundation);
      this.scene.add(foundation);
    }

    this.intactShip = ship ?? makeProceduralShip();
    fitLength(this.intactShip, SHIP_LENGTH_M, -0.5);
    this.shipGroup.add(this.intactShip);
    // Ship stages near stones on open water (relative to stones anchor = origin)
    this.shipGroup.position.set(0, 0, 0);

    this.wreckShip = wreck ?? makeProceduralShip();
    fitLength(this.wreckShip, 16, -0.2);
    this.wreckShip.visible = false;
    this.shipGroup.add(this.wreckShip);

    this.leviathan = levi ?? makeProceduralLeviathan();
    fitLength(this.leviathan, LEVIATHAN_LENGTH_M, 0);
    // emissive boost for “best VFX” presence
    this.leviathan.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) {
        const std = mat as THREE.MeshStandardMaterial;
        if (std && 'emissive' in std) {
          std.emissive = new THREE.Color(0x441100);
          std.emissiveIntensity = 0.35;
        }
      }
    });
    this.leviathanRoot.add(this.leviathan);
    this.leviathanRoot.position.set(18, -8, -12);
    this.leviathanRoot.visible = false;

    // Skinned clips: idle · attack · attack and roar
    if (leviPack?.clips?.length) {
      this.leviDirector = new CinemaAnimDirector(this.leviathan, leviPack.clips);
      this.leviDirector.play('idle', { fade: 0.2, loop: THREE.LoopRepeat });
    }

    // Water-plane contact shadow under leviathan (reads as volume through water)
    {
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x020810,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        blending: THREE.MultiplyBlending,
      });
      this.waterShadow = new THREE.Mesh(new THREE.CircleGeometry(10, 32), shadowMat);
      this.waterShadow.rotation.x = -Math.PI / 2;
      this.waterShadow.position.y = 0.08;
      this.waterShadow.visible = false;
      this.scene.add(this.waterShadow);
    }

    // Grudge6 casters + yin-yang rings (spell / defensive anims when clips exist)
    const casterPacks = [c0p, c1p, c2p];
    const deckSlots = [
      { x: -2, z: 1.2 },
      { x: 1.5, z: -1.0 },
      { x: 3.5, z: 0.8 },
    ];
    const ringTemplate = ring;
    for (let i = 0; i < 3; i++) {
      const cg = new THREE.Group();
      const pack = casterPacks[i];
      const mesh = pack?.root ? pack.root.clone(true) : makeProceduralHero();
      plantHeight(mesh, HUMAN_HEIGHT_M);
      cg.add(mesh);

      if (pack?.clips?.length) {
        const dir = new CinemaAnimDirector(mesh, pack.clips);
        dir.play(['idle', 'stand', 'breath'], { fade: 0.2, loop: THREE.LoopRepeat });
        this.casterDirectors.push(dir);
      }

      const ringObj: THREE.Object3D = ringTemplate
        ? ringTemplate.clone(true)
        : makeProceduralRing();
      ringObj.scale.set(1, 1, 1);
      ringObj.updateMatrixWorld(true);
      const rb = new THREE.Box3().setFromObject(ringObj);
      const rs = rb.getSize(new THREE.Vector3());
      const rspan = Math.max(rs.x, rs.y, rs.z, 0.001);
      ringObj.scale.setScalar(2.4 / rspan);
      ringObj.position.set(0, 2.15, 0.45);
      ringObj.visible = false;
      cg.add(ringObj);

      cg.position.set(deckSlots[i].x, 3.15, deckSlots[i].z);
      this.shipGroup.add(cg);
      this.casters.push(cg);
      this.rings.push(ringObj);
    }

    // Supernova pool for shield impacts (small SI instances)
    for (let i = 0; i < 4; i++) {
      let sn: THREE.Object3D;
      if (snova) {
        sn = snova.clone(true);
        sn.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(sn);
        const size = box.getSize(new THREE.Vector3());
        const span = Math.max(size.x, size.y, size.z, 0.001);
        sn.scale.setScalar((1.8 + i * 0.6) / span);
      } else {
        sn = new THREE.Mesh(
          new THREE.SphereGeometry(1, 16, 12),
          new THREE.MeshBasicMaterial({
            color: 0xffaa44,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
      }
      sn.visible = false;
      this.scene.add(sn);
      this.supernovaPool.push(sn);
    }

    this.hero = hero ?? makeProceduralHero();
    plantHeight(this.hero, HUMAN_HEIGHT_M);
    this.heroRoot.add(this.hero);
    this.heroRoot.position.set(0.5, 3.15, 0.3);

    // ── VFX kits ─────────────────────────────────────────────────────
    // Water attractor particles for leviathan entry/exit
    if (attractor) {
      for (let i = 0; i < 3; i++) {
        const a = attractor.clone(true);
        applyWaterParticleMaterials(a);
        fitObjectSpan(a, 4 + i * 1.5);
        a.visible = false;
        this.scene.add(a);
        this.waterSplashes.push(a);
      }
    }

    // Smoke rings pool — shield defeat (recolored magenta→cyan)
    if (smoke) {
      for (let i = 0; i < 3; i++) {
        const s = smoke.clone(true);
        applyShieldDefeatSmokeMaterials(s, i * 0.2);
        fitObjectSpan(s, 3.5 + i * 0.8);
        s.visible = false;
        this.scene.add(s);
        this.smokeRingPool.push(s);
      }
    }

    // Ethereal diodes enhance fire beam / attacks
    if (diodes) {
      this.etherealDiodes = diodes;
      applyEtherealFireMaterials(this.etherealDiodes);
      fitObjectSpan(this.etherealDiodes, 3.2);
      this.etherealDiodes.visible = false;
      this.scene.add(this.etherealDiodes);
    }

    // Sky lightning flashes around ship
    if (lightning) {
      for (let i = 0; i < 2; i++) {
        const L = lightning.clone(true);
        fitObjectSpan(L, 28 + i * 8);
        L.visible = false;
        this.scene.add(L);
        this.skyLightning.push(L);
      }
    }

    // Twin ocean whirlpools (spinjitzu, see-through ocean tint) + negative leader bolts
    const whirlSlots = [
      { x: 12, z: -14 },
      { x: -8, z: -18 },
    ];
    for (let i = 0; i < 2; i++) {
      const g = new THREE.Group();
      g.position.set(whirlSlots[i].x, 0.05, whirlSlots[i].z);
      if (whirl) {
        const w = whirl.clone(true);
        applyOceanTintMaterials(w, { opacity: 0.48, emissive: 0x0a4060 });
        fitObjectSpan(w, 9);
        w.rotation.x = -Math.PI / 2 * 0.15;
        g.add(w);
      } else {
        const disc = new THREE.Mesh(
          new THREE.TorusGeometry(3.5, 0.9, 12, 48),
          new THREE.MeshStandardMaterial({
            color: 0x1a4d62,
            emissive: 0x0a3048,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        disc.rotation.x = Math.PI / 2;
        g.add(disc);
      }
      if (leader) {
        const bolt = leader.clone(true);
        applyEtherealFireMaterials(bolt);
        // cooler cyan lightning for whirl shoot
        bolt.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) {
            const std = mat as THREE.MeshStandardMaterial;
            if (std && 'emissive' in std) {
              std.color = new THREE.Color(0xaaddff);
              std.emissive = new THREE.Color(0x44aaff);
              std.emissiveIntensity = 2.5;
            }
          }
        });
        fitObjectSpan(bolt, 12);
        bolt.position.set(0, 4, 0);
        bolt.visible = false;
        g.add(bolt);
        this.whirlLightning.push(bolt);
      }
      g.visible = false;
      this.scene.add(g);
      this.whirlpools.push(g);
    }

    // Stylized explosion pool
    if (stylized) {
      for (let i = 0; i < 4; i++) {
        const e = stylized.clone(true);
        applyEtherealFireMaterials(e);
        e.scale.set(1, 1, 1);
        fitObjectSpan(e, 5 + i * 1.5);
        e.userData.baseScale = e.scale.x;
        e.visible = false;
        this.scene.add(e);
        this.stylizedBoomPool.push(e);
      }
    }

    // Megumin mark template (mark location → play clips → boom)
    if (meguminPack) {
      this.meguminTemplate = meguminPack.root;
      this.meguminClips = meguminPack.clips;
      fitObjectSpan(this.meguminTemplate, 6);
      this.meguminTemplate.visible = false;
      this.scene.add(this.meguminTemplate);
    }

    // Tornado (SI ~14 m tall, near leviathan approach lane)
    if (tornado) {
      this.tornadoRoot = tornado;
      applyOceanTintMaterials(this.tornadoRoot, { opacity: 0.65, emissive: 0x224466 });
      fitObjectSpan(this.tornadoRoot, 16);
      this.tornadoRoot.position.set(20, 0, -22);
      this.tornadoRoot.visible = false;
      this.scene.add(this.tornadoRoot);
    }

    // Hull fire aura points (FireSmokeParticles boat_fire / attack_burst)
    const fireSlots = [
      new THREE.Vector3(2, 2.2, 1.5),
      new THREE.Vector3(-3, 2.0, -1.2),
      new THREE.Vector3(0, 1.8, 0),
      new THREE.Vector3(4, 2.4, -0.5),
    ];
    for (const local of fireSlots) {
      const em = createParticleEmitter({
        scene: this.scene,
        preset: 'boat_fire',
        position: local.clone(),
      });
      em.stop();
      em.root.visible = false;
      this.hullFireEmitters.push(em);
      this.hullFirePoints.push(local);
    }

    this.ready = true;
    this.cbs.onReady?.();
    // Seed multi-cam + first beat (assets, anims, foundation all ready)
    const b0 = LEVIATHAN_CINEMA_BEATS[0];
    this.multiCam.setTarget(b0.cam.pos, b0.cam.look, b0.cam.fov ?? 42, 'cut');
    this.applyBeat(0, true);
    this.clock.start();
    this.tick();
  }

  /** Place megumin mark at world pos, play anims, then stylized boom */
  private markMeguminBlast(worldPos: THREE.Vector3, sizeM = 5): void {
    if (!this.meguminTemplate) {
      this.spawnStylizedBoom(worldPos, sizeM * 0.8);
      return;
    }
    const root = this.meguminTemplate.clone(true);
    root.position.copy(worldPos);
    root.visible = true;
    root.scale.set(1, 1, 1);
    fitObjectSpan(root, sizeM);
    applyEtherealFireMaterials(root);
    this.scene.add(root);
    let mixer: THREE.AnimationMixer | null = null;
    if (this.meguminClips.length) {
      mixer = new THREE.AnimationMixer(root);
      for (const clip of this.meguminClips) {
        const act = mixer.clipAction(clip);
        act.reset();
        act.setLoop(THREE.LoopOnce, 1);
        act.clampWhenFinished = true;
        act.play();
      }
      this.activeMixers.push(mixer);
    }
    this.meguminMarks.push({ root, mixer, life: 2.4, phase: 'mark' });
    // Immediate fire aura burst at mark
    this.spawnHullFireAt(worldPos, true);
    this.flash = Math.max(this.flash, 0.6);
  }

  private spawnStylizedBoom(worldPos: THREE.Vector3, scale = 1): void {
    const e = this.stylizedBoomPool.find((s) => !s.visible) ?? this.stylizedBoomPool[0];
    if (!e) return;
    e.position.copy(worldPos);
    e.visible = true;
    // Pool instances were SI-fit at bootstrap — only apply relative pulse scale
    const base = e.userData.baseScale as number | undefined;
    if (base == null) {
      e.userData.baseScale = e.scale.x;
    }
    const b = (e.userData.baseScale as number) || 1;
    e.scale.setScalar(b * scale);
    this.impactBursts.push({ mesh: e, life: 1.5 });
    this.flash = Math.max(this.flash, 0.95);
  }

  /** Fire aura on hull strike point (world or local ship) */
  private spawnHullFireAt(worldOrLocal: THREE.Vector3, isWorld = false): void {
    // Map to nearest hull fire emitter and burst
    let best = 0;
    let bestD = Infinity;
    const shipPos = this.shipGroup.position;
    for (let i = 0; i < this.hullFirePoints.length; i++) {
      const wp = this.hullFirePoints[i].clone();
      if (!isWorld) {
        // local deck offset
        wp.add(shipPos);
      }
      const target = isWorld ? worldOrLocal : worldOrLocal.clone().add(shipPos);
      const d = wp.distanceTo(isWorld ? worldOrLocal : target);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    const em = this.hullFireEmitters[best];
    if (!em) return;
    const pos = isWorld
      ? worldOrLocal.clone()
      : this.hullFirePoints[best].clone().add(shipPos);
    // also offset with ship body
    pos.x = this.shipGroup.position.x + this.hullFirePoints[best].x;
    pos.y = this.shipGroup.position.y + this.hullFirePoints[best].y;
    pos.z = this.shipGroup.position.z + this.hullFirePoints[best].z;
    if (isWorld) pos.copy(worldOrLocal);
    em.setPosition(pos);
    em.root.visible = true;
    em.start();
    em.burst(36);
    // attack_burst one-shot companion
    const burst = createParticleEmitter({
      scene: this.scene,
      preset: 'attack_burst',
      position: pos,
      autoRemove: true,
    });
    burst.burst(24);
    this.hullFireEmitters.push(burst);
  }

  private setHullFireActive(on: boolean): void {
    for (let i = 0; i < this.hullFirePoints.length; i++) {
      const em = this.hullFireEmitters[i];
      if (!em) continue;
      if (on) {
        const p = this.hullFirePoints[i].clone();
        p.x += this.shipGroup.position.x;
        p.y += this.shipGroup.position.y;
        p.z += this.shipGroup.position.z;
        em.setPosition(p);
        em.root.visible = true;
        em.start();
      } else {
        em.stop();
        em.root.visible = false;
      }
    }
  }

  private updateMeguminMarks(dt: number): void {
    for (let i = this.meguminMarks.length - 1; i >= 0; i--) {
      const m = this.meguminMarks[i];
      m.life -= dt;
      m.mixer?.update(dt);
      m.root.rotation.y += dt * 1.5;
      if (m.phase === 'mark' && m.life < 1.8) {
        m.phase = 'play';
      }
      if (m.phase === 'play' && m.life < 1.0) {
        m.phase = 'boom';
        this.spawnStylizedBoom(m.root.position.clone(), 1.3);
        this.spawnHullFireAt(m.root.position.clone(), true);
      }
      if (m.life <= 0) {
        m.root.visible = false;
        this.scene.remove(m.root);
        if (m.mixer) {
          const ix = this.activeMixers.indexOf(m.mixer);
          if (ix >= 0) this.activeMixers.splice(ix, 1);
        }
        this.meguminMarks.splice(i, 1);
      }
    }
  }

  /**
   * Place startingfalls map so stones_v2 / Stone_1_Low* is the cinema stage at origin.
   * Distant Object_* stay far as islands. Hide map water plane (we use Gerstner).
   * SI: fit stone cluster ~90 m span so 22 m ship reads correctly.
   */
  private plantStartingFallsFoundation(root: THREE.Object3D): void {
    root.name = 'startingfalls_foundation';
    root.updateMatrixWorld(true);

    // Collect stone meshes (stones_v2 / stones_moss area)
    const stoneCenters: THREE.Vector3[] = [];
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      // Promote materials for better shade
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) {
        const std = mat as THREE.MeshStandardMaterial;
        if (std && 'roughness' in std) {
          std.roughness = Math.min(0.95, (std.roughness ?? 0.8) * 0.95 + 0.05);
          std.envMapIntensity = 0.55;
          std.needsUpdate = true;
        }
      }
      const n = (m.name || m.parent?.name || '').toLowerCase();
      if (n.includes('water')) {
        // Keep geometry for distance read, but fade — Gerstner is primary near ship
        m.visible = false;
        this.foundationWaterMeshes.push(m);
      }
      if (n.includes('stone')) {
        const box = new THREE.Box3().setFromObject(m);
        const c = box.getCenter(new THREE.Vector3());
        stoneCenters.push(c);
      }
    });

    // World-space box before fit
    root.updateMatrixWorld(true);
    let stonesCenter = new THREE.Vector3(0, 0, 0);
    if (stoneCenters.length) {
      for (const c of stoneCenters) stonesCenter.add(c);
      stonesCenter.multiplyScalar(1 / stoneCenters.length);
    } else {
      const full = new THREE.Box3().setFromObject(root);
      stonesCenter = full.getCenter(new THREE.Vector3());
    }

    // Center stones at origin
    root.position.sub(stonesCenter);

    // Fit so stone cluster spans ~90 m (cinema scale)
    root.updateMatrixWorld(true);
    let stoneBox = new THREE.Box3();
    let hasStone = false;
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const n = (m.name || m.parent?.name || '').toLowerCase();
      if (!n.includes('stone')) return;
      stoneBox.expandByObject(m);
      hasStone = true;
    });
    if (!hasStone) stoneBox = new THREE.Box3().setFromObject(root);
    const size = stoneBox.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.z, 1);
    const targetStoneSpan = 90;
    const s = targetStoneSpan / span;
    root.scale.multiplyScalar(s);
    root.updateMatrixWorld(true);

    // Ground water line near y=0 using stone min y
    const after = new THREE.Box3();
    let any = false;
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const n = (m.name || '').toLowerCase();
      if (n.includes('stone') || n.includes('beach')) {
        after.expandByObject(m);
        any = true;
      }
    });
    if (any) {
      // Water sits slightly below stone beach contact
      root.position.y -= after.min.y;
      // small settle so beach isn't floating
      root.position.y -= 0.4;
    }

    this.stonesAnchor.set(0, 0, 0);
    root.updateMatrixWorld(true);

    // Soft grade distant island meshes (Object_*) for atmospheric depth
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const n = (m.name || '').toLowerCase();
      if (n.includes('object_') || n.includes('uncover')) {
        m.receiveShadow = true;
        m.castShadow = true;
      }
    });
  }

  /** Impulse ship when leviathan hits (physics-feel, cinema canvas) */
  private applyShipHit(kind: NonNullable<CinemaBeat['shipHit']>): void {
    if (!kind) return;
    if (kind === 'beam') {
      // lateral shove from beam
      this.shipBody.applyImpulse(new THREE.Vector3(-1800, 400, 600), new THREE.Vector3(4, 2, 0));
      this.flash = Math.max(this.flash, 0.55);
    } else if (kind === 'ram') {
      this.shipBody.applyImpulse(new THREE.Vector3(-900, 200, -400), new THREE.Vector3(0, 1, 2));
    } else if (kind === 'breach') {
      // massive upward + list
      this.shipBody.applyImpulse(new THREE.Vector3(2500, 12000, -1800), new THREE.Vector3(0, 0, 0));
      this.shipBody.angVel.add(new THREE.Vector3(0.8, 0.3, 1.4));
      this.flash = 1;
    }
  }

  private spawnWaterSplash(at: THREE.Vector3, scale = 1): void {
    const a = this.waterSplashes.find((s) => !s.visible) ?? this.waterSplashes[0];
    if (!a) return;
    a.position.copy(at);
    a.position.y = 0.2;
    a.visible = true;
    a.scale.setScalar(scale);
    a.rotation.y = Math.random() * Math.PI * 2;
    // auto-hide via impactBursts timer reuse
    this.impactBursts.push({ mesh: a, life: 1.4 });
  }

  private fireShieldDefeat(): void {
    if (this.shieldDefeatFired) return;
    this.shieldDefeatFired = true;
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      const wp = new THREE.Vector3();
      r.getWorldPosition(wp);
      r.visible = false;
      const smoke = this.smokeRingPool[i] ?? this.smokeRingPool[0];
      if (!smoke) continue;
      applyShieldDefeatSmokeMaterials(smoke, i * 0.25);
      smoke.position.copy(wp);
      smoke.visible = true;
      smoke.scale.setScalar(1);
      this.impactBursts.push({ mesh: smoke, life: 1.6 });
    }
    this.flash = Math.max(this.flash, 0.85);
  }

  private triggerSkyLightning(): void {
    if (!this.skyLightning.length) return;
    const L = this.skyLightning[Math.floor(Math.random() * this.skyLightning.length)];
    L.position.set(
      this.shipGroup.position.x + (Math.random() - 0.5) * 40,
      18 + Math.random() * 14,
      this.shipGroup.position.z + (Math.random() - 0.5) * 30,
    );
    L.rotation.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.4);
    L.visible = true;
    this.impactBursts.push({ mesh: L, life: 0.12 + Math.random() * 0.1 });
    this.flash = Math.max(this.flash, 0.9);
  }

  private spawnPinata(): void {
    if (this.pinataFired) return;
    this.pinataFired = true;
    this.pinataActive = true;
    const wood = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const sail = new THREE.MeshStandardMaterial({ color: 0xc4b49a, roughness: 0.95, side: THREE.DoubleSide });
    for (let i = 0; i < 55; i++) {
      const isSail = i % 7 === 0;
      const mesh = isSail
        ? new THREE.Mesh(new THREE.PlaneGeometry(0.8 + Math.random(), 0.6 + Math.random() * 0.5), sail)
        : new THREE.Mesh(
            new THREE.BoxGeometry(0.4 + Math.random() * 1.2, 0.08 + Math.random() * 0.15, 0.15 + Math.random() * 0.4),
            wood,
          );
      mesh.position.set(
        (Math.random() - 0.5) * 10,
        2 + Math.random() * 4,
        (Math.random() - 0.5) * 5,
      );
      mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      mesh.castShadow = true;
      this.pinata.add(mesh);
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 14,
        4 + Math.random() * 10,
        (Math.random() - 0.5) * 14,
      );
      this.pinataVel.push(v);
    }
    this.pinata.position.copy(this.shipGroup.position);
    this.flash = 1;
  }

  private spawnShieldImpact(worldPos: THREE.Vector3, scale = 1): void {
    const sn = this.supernovaPool.find((s) => !s.visible) ?? this.supernovaPool[0];
    if (!sn) return;
    sn.position.copy(worldPos);
    sn.scale.set(1, 1, 1);
    sn.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(sn);
    const size = box.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.y, size.z, 0.001);
    // SI contact flare ~1.5–3.5 m (small supernova instances at ward contact)
    sn.scale.setScalar((2.4 * scale) / span);
    sn.visible = true;
    this.impactBursts.push({ mesh: sn, life: 0.9 });
    this.flash = Math.max(this.flash, 0.7);
  }

  private applyBeat(idx: number, force = false): void {
    const beat = LEVIATHAN_CINEMA_BEATS[idx];
    if (!beat) return;
    if (!force && idx === this.beatIdx) return;
    const prev = this.beatIdx;
    this.beatIdx = idx;
    this.cbs.onCaption?.(beat.caption, beat.sub);
    this.cbs.onBeat?.(idx, beat);

    this.stormT = beat.storm ?? 0.5;
    this.rollT = beat.shipRoll ?? 0.1;
    this.pitchT = beat.shipPitch ?? 0.05;
    this.heroMode = beat.heroMode ?? 'hidden';
    this.leviMode = beat.leviathan ?? 'hidden';

    // Multi-cam: cut or blend to beat keys
    if (prev !== idx || force) {
      this.multiCam.setTarget(
        beat.cam.pos,
        beat.cam.look,
        beat.cam.fov ?? 42,
        beat.camMode ?? 'blend',
      );
      this.lastCamBeat = idx;
    }

    // Leviathan clip blend + slow-mo
    if (this.leviDirector && beat.leviAnim) {
      const loop =
        beat.leviAnim === 'idle' || beat.leviAnim === 'swim'
          ? THREE.LoopRepeat
          : THREE.LoopRepeat;
      const hints =
        beat.leviAnim === 'swim'
          ? ['idle', 'swim', 'walk']
          : beat.leviAnim === 'attack and roar'
            ? ['attack and roar', 'roar', 'attack']
            : [beat.leviAnim, 'attack', 'idle'];
      this.leviDirector.play(hints, {
        fade: 0.3,
        loop,
        timeScale: beat.leviTimeScale ?? 1,
        restart: prev !== idx && (beat.leviAnim.includes('attack') || beat.leviAnim.includes('roar')),
      });
    } else if (this.leviDirector && beat.leviTimeScale != null) {
      this.leviDirector.setTimeScale(beat.leviTimeScale);
    }

    // Grudge6 casters: cast / defend / idle
    if (beat.casterAnim && this.casterDirectors.length) {
      const hints =
        beat.casterAnim === 'cast'
          ? ['cast', 'spell', 'magic', 'attack', 'skill']
          : beat.casterAnim === 'defend'
            ? ['defend', 'block', 'guard', 'idle', 'cast']
            : beat.casterAnim === 'attack'
              ? ['attack', 'combat', 'idle']
              : ['idle', 'stand', 'breath'];
      for (const d of this.casterDirectors) {
        d.play(hints, { fade: 0.28, loop: THREE.LoopRepeat, timeScale: 1 });
      }
    }

    if (this.intactShip) this.intactShip.visible = beat.shipIntact !== false && !this.pinataFired;
    if (this.wreckShip) this.wreckShip.visible = beat.shipIntact === false || this.pinataFired;

    for (const r of this.rings) r.visible = !!beat.rings;
    for (const c of this.casters) c.visible = true;

    if (this.fireBeam) {
      this.fireBeam.visible = !!beat.fireBeam;
      (this.fireBeam.material as THREE.MeshBasicMaterial).opacity = beat.fireBeam ? 0.85 : 0;
    }
    if (this.etherealDiodes) this.etherealDiodes.visible = !!beat.fireBeam;
    if (this.fireAura) {
      this.fireAura.visible = !!beat.fireAura;
      (this.fireAura.material as THREE.PointsMaterial).opacity = beat.fireAura ? 0.75 : 0;
    }

    if (beat.shipPinata && !this.pinataFired) {
      this.spawnPinata();
      if (this.intactShip) this.intactShip.visible = false;
      if (this.wreckShip) this.wreckShip.visible = true;
    }

    if (beat.shieldImpact && prev !== idx) {
      for (const r of this.rings) {
        const wp = new THREE.Vector3();
        r.getWorldPosition(wp);
        this.spawnShieldImpact(wp, 0.9 + Math.random() * 0.5);
        if (beat.meguminMark) this.markMeguminBlast(wp, 3.5);
        if (beat.stylizedBoom) this.spawnStylizedBoom(wp, 0.85);
      }
    }

    if (beat.shieldDefeat && prev !== idx) {
      this.fireShieldDefeat();
      if (beat.stylizedBoom) {
        for (const r of this.rings) {
          const wp = new THREE.Vector3();
          r.getWorldPosition(wp);
          this.spawnStylizedBoom(wp, 1.1);
        }
      }
    }

    if (beat.meguminMark && prev !== idx && !beat.shieldImpact) {
      // Mark kill circle on hull / keel before big blast
      const keel = this.shipGroup.position.clone().add(new THREE.Vector3(0, 2, 0));
      this.markMeguminBlast(keel, 7);
      // secondary marks on port/starboard
      this.markMeguminBlast(keel.clone().add(new THREE.Vector3(3, 0.5, 1.5)), 4);
      this.markMeguminBlast(keel.clone().add(new THREE.Vector3(-2.5, 0.5, -1.2)), 4);
    }

    if (beat.stylizedBoom && prev !== idx && beat.shipPinata) {
      this.spawnStylizedBoom(this.shipGroup.position.clone().add(new THREE.Vector3(0, 3, 0)), 2.2);
    }

    if (beat.shipHit && prev !== idx) {
      this.applyShipHit(beat.shipHit);
      if (beat.hullFire) {
        this.spawnHullFireAt(new THREE.Vector3(0, 0, 0), false);
      }
    }

    this.setHullFireActive(!!beat.hullFire);

    if (this.tornadoRoot) {
      this.tornadoRoot.visible = !!beat.tornado;
    }

    this.whirlActive = !!beat.whirlpools;
    for (const w of this.whirlpools) w.visible = this.whirlActive;

    if (this.heroMode === 'throw' && prev !== idx) {
      this.throwOrigin.set(0.5, 4, 0.3);
      this.heroRoot.position.copy(this.throwOrigin);
    }

    this.cbs.onPresentation?.({
      blackout: beat.blackout ?? 0,
      logo: !!beat.logo,
    });
  }

  private updateLeviathan(dt: number): void {
    const L = this.leviathanRoot;
    const t = this.elapsed;
    const prevY = this.lastLeviY;
    const waveY = Math.sin(t * 0.9) * 1.2 + Math.sin(t * 1.7) * 0.4;
    switch (this.leviMode) {
      case 'hidden':
        L.visible = false;
        break;
      case 'swim':
        // Swim under surface through waves (stones stage open water)
        L.visible = true;
        {
          const ang = t * 0.35;
          const r = 24;
          L.position.set(
            Math.cos(ang) * r + 2,
            -5.5 + waveY * 0.85,
            Math.sin(ang) * r - 6,
          );
          L.rotation.set(0.12 + waveY * 0.04, -ang - Math.PI / 2, Math.sin(t) * 0.08);
        }
        break;
      case 'surface_idle':
      case 'cast':
      case 'idle_watch':
        L.visible = true;
        L.position.lerp(
          new THREE.Vector3(14, 2.4 + Math.sin(t * 1.1) * 0.45, -9),
          Math.min(1, dt * 1.5),
        );
        L.rotation.set(0.05, -1.15, Math.sin(t * 0.6) * 0.04);
        break;
      case 'roar_beam':
        L.visible = true;
        L.position.lerp(new THREE.Vector3(12, 3.1, -7), Math.min(1, dt * 2));
        L.rotation.set(0.02, -1.25, 0);
        break;
      case 'dive':
        L.visible = true;
        L.position.y = THREE.MathUtils.lerp(L.position.y, -11 + waveY * 0.3, dt * 1.3);
        L.position.x = THREE.MathUtils.lerp(L.position.x, 20, dt);
        L.rotation.x = THREE.MathUtils.lerp(L.rotation.x, 0.75, dt);
        break;
      case 'rise_attack':
        L.visible = true;
        {
          const u = smoothstep(27.5, 30.5, t);
          L.position.set(6 + u * 2, -10 + u * 14, -4);
          L.rotation.set(-0.5 + u * 0.7, -0.5, 0.15);
        }
        break;
      case 'breach':
        L.visible = true;
        {
          const u = smoothstep(30.5, 33.5, t);
          L.position.set(2 + u * 3, -4 + u * 10, -1);
          L.rotation.set(-0.2 + u * 0.6, -0.25, 0.25);
        }
        break;
      case 'finisher':
        L.visible = true;
        L.position.lerp(new THREE.Vector3(16, 2.5, -6), Math.min(1, dt * 1.5));
        L.rotation.set(0.1, -0.9, 0);
        break;
      case 'gone':
        L.visible = L.position.y > -22;
        L.position.y -= dt * 9;
        break;
      default:
        L.visible = true;
        break;
    }

    // Contact shadow on water (through-water read)
    if (this.waterShadow) {
      const show = L.visible && L.position.y < 10;
      this.waterShadow.visible = show;
      if (show) {
        this.waterShadow.position.x = L.position.x;
        this.waterShadow.position.z = L.position.z;
        const depth = Math.max(0, -L.position.y);
        (this.waterShadow.material as THREE.MeshBasicMaterial).opacity =
          THREE.MathUtils.clamp(0.55 - depth * 0.04, 0.12, 0.55);
        this.waterShadow.scale.setScalar(THREE.MathUtils.clamp(0.8 + depth * 0.08, 0.6, 1.8));
      }
    }

    // Water attractor splash on water-line crossing (entry / exit)
    this.splashCool -= dt;
    const y = L.position.y;
    if (L.visible && this.splashCool <= 0) {
      const crossedUp = prevY < 0.5 && y >= 0.5;
      const crossedDown = prevY > -0.5 && y <= -0.5;
      if (crossedUp || crossedDown) {
        this.spawnWaterSplash(
          new THREE.Vector3(L.position.x, 0.15, L.position.z),
          crossedUp ? 1.4 : 1.1,
        );
        this.splashCool = 0.35;
      }
    }
    this.lastLeviY = y;

    // Fire beam from leviathan mouth toward ship deck + ethereal diodes
    if (this.fireBeam && this.fireBeam.visible) {
      const from = new THREE.Vector3();
      from.copy(L.position);
      from.x -= 10;
      from.y += 2;
      const to = this.shipGroup.position.clone().add(new THREE.Vector3(0, 3, 0));
      const mid = from.clone().add(to).multiplyScalar(0.5);
      const dist = from.distanceTo(to);
      this.fireBeam.position.copy(mid);
      this.fireBeam.scale.set(1, dist, 1);
      this.fireBeam.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        to.clone().sub(from).normalize(),
      );
      (this.fireBeam.material as THREE.MeshBasicMaterial).opacity =
        0.55 + Math.sin(t * 24) * 0.25;

      if (this.etherealDiodes) {
        this.etherealDiodes.visible = true;
        this.etherealDiodes.position.copy(mid);
        this.etherealDiodes.quaternion.copy(this.fireBeam.quaternion);
        this.etherealDiodes.rotation.z += dt * 4;
        // pulse scale along beam
        const pulse = 0.9 + Math.sin(t * 18) * 0.15;
        this.etherealDiodes.scale.setScalar(pulse);
      }
    } else if (this.etherealDiodes) {
      this.etherealDiodes.visible = false;
    }
  }

  private updateWhirlpools(dt: number): void {
    if (!this.whirlActive) {
      for (const w of this.whirlpools) w.visible = false;
      return;
    }
    const t = this.elapsed;
    this.whirlpools.forEach((g, i) => {
      g.visible = true;
      g.rotation.y += dt * (1.8 + i * 0.6) * (i % 2 === 0 ? 1 : -1);
      // slight bob
      g.position.y = 0.05 + Math.sin(t * 2 + i) * 0.08;
      // shoot lightning bolts from whirlpool upward / toward ship
      const bolt = this.whirlLightning[i];
      if (bolt) {
        const shoot = Math.sin(t * 3 + i * 2) > 0.55;
        bolt.visible = shoot;
        if (shoot) {
          bolt.position.set(0, 2 + Math.sin(t * 8) * 0.5, 0);
          // aim roughly toward leviathan or sky
          const target = this.leviathanRoot.position.clone();
          target.y = Math.max(target.y, 4);
          const dir = target.sub(g.position).normalize();
          bolt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          bolt.scale.setScalar(0.9 + Math.sin(t * 20) * 0.15);
        }
      }
    });
  }

  private updateSkyLightning(dt: number, want: boolean): void {
    this.skyLightningCool -= dt;
    if (!want) return;
    if (this.skyLightningCool <= 0 && Math.random() < dt * 1.2) {
      this.triggerSkyLightning();
      this.skyLightningCool = 0.45 + Math.random() * 1.2;
    }
  }

  private updateHero(dt: number): void {
    const t = this.elapsed;
    const bob = Math.sin(t * 1.5) * (0.2 + this.stormCur * 0.4);
    this.heroRoot.visible = this.heroMode !== 'hidden';

    switch (this.heroMode) {
      case 'deck':
      case 'brace':
        this.heroRoot.position.set(0.5, 3.15 + bob, 0.3);
        this.heroRoot.rotation.set(
          this.heroMode === 'brace' ? 0.2 : 0,
          Math.PI * 0.15,
          Math.sin(t * 0.9) * this.rollCur * 0.5,
        );
        break;
      case 'throw':
      case 'air': {
        // Ballistic from ship over HERO_THROW_M (breach ~31s)
        const u = smoothstep(31, 40, t);
        const dist = HERO_THROW_M * u;
        const height = Math.sin(u * Math.PI) * 6.5;
        this.heroRoot.position.set(
          this.throwDir.x * dist,
          3.5 + height - u * u * 4,
          this.throwDir.z * dist,
        );
        this.heroRoot.rotation.set(u * 2.2, u * 3.5, u * 1.4);
        break;
      }
      case 'sea':
      case 'sink': {
        const u = smoothstep(40, 46, t);
        const base = this.throwDir.clone().multiplyScalar(HERO_THROW_M);
        this.heroRoot.position.set(base.x, 0.2 - u * 3.5, base.z);
        this.heroRoot.rotation.set(1.2 + u * 0.4, 0.5, 0.3);
        break;
      }
      default:
        break;
    }
  }

  private updateRings(_dt: number): void {
    if (!this.rings.length) return;
    const lev = this.leviathanRoot.position;
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (!r.visible) continue;
      // Aim ring normal toward leviathan
      const wp = new THREE.Vector3();
      r.getWorldPosition(wp);
      const dir = lev.clone().sub(wp).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      r.quaternion.slerp(q, 0.15);
      r.rotation.z += 0.04 + i * 0.01;
      // pulse scale
      const pulse = 1 + Math.sin(this.elapsed * 6 + i) * 0.06;
      r.scale.setScalar(pulse);
    }
  }

  private updatePinata(dt: number): void {
    if (!this.pinataActive) return;
    this.pinata.children.forEach((c, i) => {
      const v = this.pinataVel[i];
      if (!v) return;
      v.y -= 14 * dt;
      c.position.addScaledVector(v, dt);
      c.rotation.x += dt * 2;
      c.rotation.y += dt * 3;
      if (c.position.y < -2) {
        c.position.y = -2;
        v.set(0, 0, 0);
      }
    });
  }

  private updateImpacts(dt: number): void {
    for (let i = this.impactBursts.length - 1; i >= 0; i--) {
      const b = this.impactBursts[i];
      b.life -= dt;
      const isSmoke = this.smokeRingPool.includes(b.mesh);
      const isSplash = this.waterSplashes.includes(b.mesh);
      if (isSmoke && b.life > 0.4) {
        b.mesh.scale.multiplyScalar(1 + dt * 1.4);
        b.mesh.rotation.y += dt * 1.8;
        applyShieldDefeatSmokeMaterials(b.mesh, 1 - b.life / 1.6);
      } else if (isSplash) {
        b.mesh.rotation.y += dt * 2.5;
        b.mesh.scale.multiplyScalar(1 + dt * 0.8);
      } else {
        // supernova / sky lightning
        if (b.life > 0.5) b.mesh.scale.multiplyScalar(1 + dt * 2.0);
        b.mesh.rotation.y += dt * 1.2;
      }
      if (b.life <= 0) {
        b.mesh.visible = false;
        this.impactBursts.splice(i, 1);
      }
    }
  }

  private updateCamera(dt = 1 / 60): void {
    const beats = LEVIATHAN_CINEMA_BEATS;
    let i = 0;
    while (i < beats.length - 1 && this.elapsed >= beats[i + 1].t) i++;
    this.applyBeat(i);

    const a = beats[i];
    const b = beats[Math.min(i + 1, beats.length - 1)];
    const u = easeInOutCubic((this.elapsed - a.t) / Math.max(0.001, b.t - a.t));

    // Multi-cam director owns lens (blend/cut between beat keys)
    this.multiCam.update(dt);
    const shake = 0.025 + this.stormCur * 0.06 + (this.pinataActive ? 0.07 : 0);

    if (this.heroMode === 'air' || this.heroMode === 'throw' || this.heroMode === 'sink') {
      const hp = this.heroRoot.position;
      const camPos = hp.clone().add(new THREE.Vector3(4.5, 2.2, 5.5));
      const look = hp.clone().add(new THREE.Vector3(-3, 0.2, -2));
      const follow = smoothstep(35, 37, this.elapsed);
      const evalCam = this.multiCam.evaluate(shake * (1 - follow));
      this.camera.position.lerpVectors(evalCam.pos, camPos, follow);
      const lookBlend = evalCam.look.clone().lerp(look, follow);
      this.camera.lookAt(lookBlend);
      this.camera.fov = THREE.MathUtils.lerp(evalCam.fov, 36, follow);
    } else {
      const evalCam = this.multiCam.evaluate(shake);
      this.camera.position.copy(evalCam.pos);
      this.camera.lookAt(evalCam.look);
      this.camera.fov = evalCam.fov;
    }

    // Impact FOV punches (roar beam + breach)
    {
      const hit =
        smoothstep(18.5, 20, this.elapsed) * (1 - smoothstep(22, 24, this.elapsed)) +
        smoothstep(30.5, 32, this.elapsed) * (1 - smoothstep(33.5, 35, this.elapsed));
      this.camera.fov += hit * 7;
      this.camera.position.y += hit * 1.0;
    }
    this.camera.updateProjectionMatrix();

    const expT = THREE.MathUtils.lerp(a.exposure ?? 0.9, b.exposure ?? 0.9, u);
    const bloomT = THREE.MathUtils.lerp(a.bloom ?? 0.3, b.bloom ?? 0.3, u);
    const fogT = THREE.MathUtils.lerp(a.fogDensity ?? 0.01, b.fogDensity ?? 0.01, u);
    const blackT = THREE.MathUtils.lerp(a.blackout ?? 0, b.blackout ?? 0, u);
    const underT = THREE.MathUtils.lerp(a.underwater ?? 0, b.underwater ?? 0, u);
    this.exposureCur += (expT - this.exposureCur) * 0.1;
    this.bloomCur += (bloomT - this.bloomCur) * 0.1;
    this.blackoutCur += (blackT - this.blackoutCur) * 0.12;
    this.underwaterCur += (underT - this.underwaterCur) * 0.12;

    // Post: ACES exposure + bloom; underwater cools tint
    this.renderer.toneMappingExposure =
      this.exposureCur * (1 - this.blackoutCur * 0.85) * (1 - this.underwaterCur * 0.25) +
      this.flash * 0.3;
    this.post?.setBloomStrength(this.bloomCur + this.flash * 0.55 + this.underwaterCur * 0.08);
    this.post?.setColorTint(-0.22 - this.underwaterCur * 0.35);
    this.post?.setVignette(0.48 + this.underwaterCur * 0.12);
    if (this.scene.fog && (this.scene.fog as THREE.FogExp2).isFogExp2) {
      (this.scene.fog as THREE.FogExp2).density = fogT + this.underwaterCur * 0.008;
    }
    this.cbs.onPresentation?.({
      blackout: this.blackoutCur,
      logo: !!(a.logo || b.logo),
    });
  }

  private updateStorm(dt: number): void {
    this.stormCur += (this.stormT - this.stormCur) * Math.min(1, dt * 1.5);
    this.rollCur += (this.rollT - this.rollCur) * Math.min(1, dt * 2);
    this.pitchCur += (this.pitchT - this.pitchCur) * Math.min(1, dt * 2);

    if (this.waterMat) {
      this.waterMat.uniforms.uTime.value = this.elapsed;
      this.waterMat.uniforms.uStorm.value = this.stormCur;
    }
    if (this.skyMat) {
      this.skyMat.uniforms.uTime.value = this.elapsed;
      this.skyMat.uniforms.uStorm.value = this.stormCur;
      this.skyMat.uniforms.uFlash.value = this.flash;
    }

    this.flashCool -= dt;
    if (this.stormCur > 0.55 && this.flashCool <= 0 && Math.random() < dt * 0.35 * this.stormCur) {
      this.flash = 0.45 + Math.random() * 0.5;
      this.flashCool = 0.9 + Math.random() * 2;
    }
    this.flash *= Math.exp(-dt * 5);
    this.dirLight.intensity = 0.7 + this.flash * 3;
    this.hemi.intensity = 0.45 + this.flash * 0.8;

    // Wave base + physics impulse body (realistic list/heave when hit)
    const bob = Math.sin(this.elapsed * 1.5) * (0.22 + this.stormCur * 0.5);
    const baseRoll = Math.sin(this.elapsed * 0.9) * this.rollCur;
    const basePitch = Math.sin(this.elapsed * 1.1) * this.pitchCur;
    this.shipBody.update(dt, bob, baseRoll, basePitch);
    this.shipBody.applyTo(this.shipGroup);

    if (this.rain && this.rainVel) {
      const pos = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < this.rainVel.length; i++) {
        arr[i * 3 + 1] -= this.rainVel[i] * dt * (0.5 + this.stormCur);
        arr[i * 3] -= 5 * this.stormCur * dt;
        if (arr[i * 3 + 1] < 0) {
          arr[i * 3 + 1] = 30;
          arr[i * 3] = this.camera.position.x + (Math.random() - 0.5) * 70;
          arr[i * 3 + 2] = this.camera.position.z + (Math.random() - 0.5) * 70;
        }
      }
      pos.needsUpdate = true;
      (this.rain.material as THREE.PointsMaterial).opacity = 0.2 + this.stormCur * 0.5;
    }
  }

  private tick = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    if (!this.ready) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    const dt = Math.min(0.05, this.clock.getDelta());
    this.elapsed += dt;
    this.updateCamera(dt);
    this.updateStorm(dt);
    this.updateLeviathan(dt);
    this.updateHero(dt);
    this.updateRings(dt);
    this.updatePinata(dt);
    this.updateImpacts(dt);
    this.updateWhirlpools(dt);
    this.updateMeguminMarks(dt);
    // Animation directors (leviathan + grudge6 casters) — crossfade blend each frame
    this.leviDirector?.update(dt);
    for (const d of this.casterDirectors) d.update(dt);
    for (const m of this.activeMixers) m.update(dt);
    for (const em of this.hullFireEmitters) em.update(dt);
    if (this.tornadoRoot?.visible) {
      this.tornadoRoot.rotation.y += dt * 2.4;
      this.tornadoRoot.position.y = Math.sin(this.elapsed * 1.5) * 0.4;
      // drift slightly toward ship under leviathan pressure
      this.tornadoRoot.position.x = THREE.MathUtils.lerp(
        this.tornadoRoot.position.x,
        this.shipGroup.position.x + 14,
        dt * 0.15,
      );
    }
    // Keep hull fire world positions locked to ship
    if (LEVIATHAN_CINEMA_BEATS[this.beatIdx]?.hullFire) {
      for (let i = 0; i < this.hullFirePoints.length; i++) {
        const em = this.hullFireEmitters[i];
        if (!em) continue;
        const p = this.hullFirePoints[i].clone().add(this.shipGroup.position);
        em.setPosition(p);
      }
    }
    const beat = LEVIATHAN_CINEMA_BEATS[this.beatIdx];
    this.updateSkyLightning(dt, !!beat?.skyLightning);

    // Blackout: render then overlay handled by gate; still dim scene fog color
    if (this.blackoutCur > 0.01 && this.scene.background) {
      (this.scene.background as THREE.Color).setRGB(
        0.03 * (1 - this.blackoutCur),
        0.05 * (1 - this.blackoutCur),
        0.08 * (1 - this.blackoutCur),
      );
    }

    this.cbs.onProgress?.(Math.min(1, this.elapsed / LEVIATHAN_CINEMA_DURATION_SEC), this.elapsed);
    if (this.post) this.post.render();
    else this.renderer.render(this.scene, this.camera);

    if (!this.completed && this.elapsed >= LEVIATHAN_CINEMA_DURATION_SEC) {
      this.completed = true;
      this.cbs.onComplete?.();
    }
  };

  skip(): void {
    if (this.completed) return;
    this.completed = true;
    this.cbs.onPresentation?.({ blackout: 1, logo: true });
    this.cbs.onComplete?.();
  }

  setMuted(_m: boolean): void {}

  getElapsedSec(): number {
    return this.elapsed;
  }

  isSkippable(): boolean {
    return this.elapsed >= LEVIATHAN_CINEMA_SKIPPABLE_AFTER_SEC;
  }

  private resize(): void {
    if (this.disposed) return;
    const w = Math.max(2, this.host.clientWidth || 2);
    const h = Math.max(2, this.host.clientHeight || 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.post?.resize(w, h);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs?.disconnect();
    for (const em of this.hullFireEmitters) {
      try { em.dispose(); } catch { /* */ }
    }
    this.hullFireEmitters = [];
    this.activeMixers = [];
    this.post?.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose?.());
      else mat?.dispose?.();
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.host) {
      this.host.removeChild(this.renderer.domElement);
    }
  }
}

/** Back-compat export name used by StormShipIntroGate */
export { LeviathanOceanCinema as ShipwreckTutorialCinema };
