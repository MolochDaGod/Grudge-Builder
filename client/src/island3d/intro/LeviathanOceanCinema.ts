/**
 * LeviathanOceanCinema â€” production /island-3d movie intro (v10 Â· film post + Box3).
 *
 * HARD RULES:
 *  - 1 unit = 1 m · human 1.8 m · Box3 SI audit on every actor
 *  - 4 deck mages: Bip001 idle/cast/defend · ship-linked cam · chase escape · film handheld
 *  - Film post: PostProcessing (bloom + SMAA + grade + vignette) driven by beats
 *  - Ocean: production OceanShader Â· leather levi Â· water splash Â· water cyclones
 *  - Camera sole owner Â· impact FOV Â· letterbox gate Â· skippable handoff
 *  - Yaw-only facing â€” no lookAt tumble on carriers
 */
import * as THREE from 'three';
import { loadGltfCached, cloneGltfScene } from '@/lib/three/SharedGltfPipeline';
import {
  CIN_CAST_ASSETS,
  CIN_HUMAN_M,
  CIN_SHIP_LOA_M,
  CIN_LEVIATHAN_LOA_M,
  CIN_TWISTER_H_M,
  CIN_HERO_THROW_M,
  CIN_PLUME_SPAN_M,
  CIN_MEGUMIN_SPAN_M,
  CIN_ORC_M,
  CIN_ISLAND_OFFSET,
  CIN_ISLAND_SPAN_M,
  LEVIATHAN_STAGE_ID,
  LEVIATHAN_STAGE_VERSION,
  cinPos,
} from '@shared/definitions/leviathanCinemaStage';
import { unitDecadeFactor } from '@/island3d/zoneWorldScale';
import {
  createOceanMaterial,
  createOceanGeometry,
} from '@/game/sailing/OceanShader';
import { PostProcessing } from '@/island3d/render/PostProcessing';
import {
  fitPropSpanM,
  faceYawToward,
  createShipShield,
  tickForceField,
  spawnCinemaHuman,
  lockUniformScale,
  loadCinemaMageBip001Clips,
  pickEmbeddedOrcCinemaClips,
} from './cinemaGrudge6';
import { CinemaStageGraph } from './CinemaStageGraph';
import { CinemaSpineIkRoster } from './CinemaSpineIk';
import { CinemaAnimDirector, MultiCameraDirector } from './CinemaAnimDirector';
import {
  LeviathanAnimController,
  LEVI_CHARGE_T0,
  LEVI_CHARGE_T1,
} from './LeviathanAnimController';
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
  leviathanWaveTilt,
  applyLeviathanChargeLook,
  sampleCinemaWaterY,
  type DragonBeamPhase,
} from './LeviathanDragonBeamVfx';
import {
  applyLeatheryLeviathanLook,
  applyLeviathanWetness,
  applyLeviathanWaterlineSplit,
  updateLeviathanWaterlineUniforms,
  enforceLeviathanSubmerge,
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

// â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** @deprecated use fitPropSpanM */
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

/** Same-origin absolute URL so loads never depend on page path / CDN rewrite. */
function cinemaLocalUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url) || url.startsWith('//') || url.startsWith('blob:')) return url;
  if (typeof window !== 'undefined' && url.startsWith('/')) {
    return new URL(url, window.location.origin).href;
  }
  return url;
}

/**
 * Homework Sketchfab ships have rogue BezierCurve rope meshes tens of km from the hull.
 * Fitting LOA on the full AABB shrinks the real hull to dust → "no boat".
 * Hide outlier meshes, keep the dense hull cluster.
 */
function sanitizeCinemaShipGraph(root: THREE.Object3D): { kept: number; hidden: number } {
  const samples: { mesh: THREE.Object3D; c: THREE.Vector3; r: number }[] = [];
  const _box = new THREE.Box3();
  const _size = new THREE.Vector3();
  const _c = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    // Sketchfab cameras / helpers
    if (/^camera$/i.test(o.name) || /sketchfab/i.test(o.name)) {
      o.visible = false;
      return;
    }
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    _box.setFromObject(m);
    if (_box.isEmpty()) {
      m.visible = false;
      return;
    }
    _box.getCenter(_c);
    _box.getSize(_size);
    const r = Math.max(_size.x, _size.y, _size.z, 1e-3);
    samples.push({ mesh: m, c: _c.clone(), r });
  });
  if (samples.length < 3) return { kept: samples.length, hidden: 0 };

  // Median center (robust to outliers)
  const xs = samples.map((s) => s.c.x).sort((a, b) => a - b);
  const ys = samples.map((s) => s.c.y).sort((a, b) => a - b);
  const zs = samples.map((s) => s.c.z).sort((a, b) => a - b);
  const mid = (arr: number[]) => arr[Math.floor(arr.length / 2)] ?? 0;
  const median = new THREE.Vector3(mid(xs), mid(ys), mid(zs));

  // Median mesh radius → hull scale estimate
  const radii = samples.map((s) => s.r).sort((a, b) => a - b);
  const medR = radii[Math.floor(radii.length / 2)] || 1;
  // Keep meshes whose center is within a generous hull envelope
  const maxDist = Math.max(medR * 40, 8000); // model units before SI fit
  let kept = 0;
  let hidden = 0;
  for (const s of samples) {
    const d = s.c.distanceTo(median);
    // Also drop absurd single-axis outliers (ropes at y=60k)
    const axisOut =
      Math.abs(s.c.x - median.x) > maxDist ||
      Math.abs(s.c.y - median.y) > maxDist ||
      Math.abs(s.c.z - median.z) > maxDist;
    if (d > maxDist || axisOut) {
      s.mesh.visible = false;
      // Pull far meshes out of bbox influence
      s.mesh.scale.setScalar(0);
      hidden++;
    } else {
      kept++;
    }
  }
  root.updateMatrixWorld(true);
  console.info(
    `[cinema] ship sanitize kept=${kept} hidden=${hidden} median=(${median.x.toFixed(0)},${median.y.toFixed(0)},${median.z.toFixed(0)}) maxDist=${maxDist.toFixed(0)}`,
  );
  return { kept, hidden };
}

async function loadFirst(urls: readonly string[]): Promise<THREE.Group | null> {
  for (const raw of urls) {
    if (isForbiddenShipUrl(raw)) {
      console.warn('[cinema] skip forbidden ship url', raw);
      continue;
    }
    const url = cinemaLocalUrl(raw);
    try {
      const gltf = await loadGltfCached(url, 'critical');
      const root = cloneGltfScene(gltf);
      console.info('[cinema] loadFirst ok', url);
      return root;
    } catch (e) {
      console.warn('[cinema] loadFirst fail', url, e instanceof Error ? e.message : e);
    }
  }
  return null;
}

async function loadFirstWithClips(
  urls: readonly string[],
): Promise<{ root: THREE.Group; clips: THREE.AnimationClip[] } | null> {
  for (const raw of urls) {
    const url = cinemaLocalUrl(raw);
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

/**
 * Night-readable ship materials — keep textures, lift emissive so hull is not black.
 * Does NOT replace the mesh with a box / placeholder.
 */
function forceShipReadableMaterials(root: THREE.Object3D): number {
  let n = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    n++;
    m.visible = true;
    m.frustumCulled = false;
    m.castShadow = true;
    m.receiveShadow = true;
    const list = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    const out: THREE.Material[] = [];
    for (const mat of list) {
      let std = mat as THREE.MeshStandardMaterial;
      if (!std?.isMeshStandardMaterial && !(std as THREE.MeshPhysicalMaterial)?.isMeshPhysicalMaterial) {
        const next = new THREE.MeshStandardMaterial({
          color: 0xb8895a,
          roughness: 0.82,
          metalness: 0.05,
          name: mat?.name || 'ship_wood',
        });
        const map = (mat as THREE.MeshBasicMaterial)?.map;
        if (map) next.map = map;
        std = next;
      } else {
        std = mat.clone() as THREE.MeshStandardMaterial;
      }
      std.transparent = false;
      std.opacity = 1;
      std.depthWrite = true;
      std.side = THREE.DoubleSide;
      if (std.color && std.color.r + std.color.g + std.color.b < 0.15 && !std.map) {
        std.color.setHex(0xb8895a);
      }
      if (!std.emissive) std.emissive = new THREE.Color(0x000000);
      std.emissive.setHex(0x3a2814);
      std.emissiveIntensity = Math.max(std.emissiveIntensity ?? 0, 0.45);
      if (std.map) std.map.colorSpace = THREE.SRGBColorSpace;
      std.needsUpdate = true;
      out.push(std);
    }
    m.material = out.length === 1 ? out[0] : out;
  });
  return n;
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

// â”€â”€ main cinema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class LeviathanOceanCinema {
  private host: HTMLElement;
  private cbs: CinemaCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  /** Far plane covers 240 m startingfalls backdrop behind the fight */
  private camera = new THREE.PerspectiveCamera(48, 1, 0.1, 700);
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
  private leviathan: THREE.Object3D | null = null;
  private intactShip: THREE.Object3D | null = null;
  private wreckShip: THREE.Object3D | null = null;
  /**
   * Three SEPARATE ship GLBs (split from homeworks_damage):
   *   ship-01-intact · ship-02-damaged · ship-03-sinking
   * Only ONE parented under shipGroup at a time; each SI-fit to 18 m LOA alone.
   */
  private shipMultiState = false;
  private shipHullState: 'intact' | 'damaged' | 'sinking' = 'intact';
  private shipHulls: {
    intact: THREE.Object3D | null;
    damaged: THREE.Object3D | null;
    sinking: THREE.Object3D | null;
  } = { intact: null, damaged: null, sinking: null };
  /** Soft sink offset after explosion state (m) */
  private shipSinkY = 0;
  private shipBlend: {
    from: THREE.Object3D[];
    to: THREE.Object3D[];
    t: number;
    dur: number;
  } | null = null;

  private leviDirector: CinemaAnimDirector | null = null;
  /** Skeleton swim / charge ping-pong / attack driver (same mixer as leviDirector). */
  private leviAnim: LeviathanAnimController | null = null;

  private waterMat: THREE.ShaderMaterial | null = null;
  /** Seafloor mesh (underwater beats) */
  private oceanFloor: THREE.Object3D | null = null;
  /** Fish school roots (clones of fish-particle GLB) */
  private fishSchools: THREE.Object3D[] = [];
  private fishMixers: THREE.AnimationMixer[] = [];
  /** Storm sky dome + optional moon (film grade needs sky luminance) */
  private skyDome: THREE.Mesh | null = null;
  private skyMat: THREE.ShaderMaterial | null = null;
  private moonMesh: THREE.Mesh | null = null;
  private moonGlow: THREE.Mesh | null = null;
  /** World-space offset from camera for moon (skybox-relative) */
  private readonly moonOffset = new THREE.Vector3(-90, 70, -120);
  /** One ship-wide ward dome (not per-mage bubbles) */
  private shipShield: THREE.Object3D | null = null;
  /** 0..1 flash when fireball hits the ship shield */
  private shieldImpactFlash = 0;
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
  /** Moon-beam structure dragon beam: snap â†’ charge â†’ blast + shield bounce */
  private dragonVfx: LeviathanDragonBeamVfx | null = null;
  private dragonPhase: DragonBeamPhase = 'off';
  private dragonPhaseStart = 0;
  /** Attack-local time when mouth opens / beam may start (seconds into clip) */
  private static readonly MOUTH_OPEN_SEC = 0.1;
  /** Beam must end before attack clip completes (fraction of duration) */
  private static readonly BEAM_END_PROGRESS = 0.72;
  private leviMouthBone: THREE.Object3D | null = null;
  private pinataFired = false;
  /** Hero thrown 20 m from explosion (visible arc until logo) */
  private throwHero: THREE.Object3D | null = null;
  private throwActive = false;
  private throwT = 0;
  private throwDur = 2.8;
  private throwFrom = new THREE.Vector3();
  private throwTo = new THREE.Vector3();
  private tornadoRoot: THREE.Object3D | null = null;
  private cycloneClones: THREE.Object3D[] = [];
  private fluidSplash: THREE.Object3D | null = null;
  private fluidMixer: THREE.AnimationMixer | null = null;
  private waterSplash: LeviathanWaterSplash | null = null;
  private lastLeviSurfaceBias = -99;
  private lastLeviPos = new THREE.Vector3();
  private leviSpeedMps = 0;
  private leviForward = new THREE.Vector3(0, 0, 1);
  private shipSprayCd = 0;
  private supernovaPool: THREE.Object3D[] = [];
  private meguminRoot: THREE.Object3D | null = null;
  private meguminMixer: THREE.AnimationMixer | null = null;
  private meguminClips: THREE.AnimationClip[] = [];
  private meguminHideT = 0;
  /** Locked SI root scale after peak-frame calibrate — re-applied every tick after mixer */
  private meguminLockedScale = 1;
  /** Ship deck height (ship-local) — shield / mage feet / VFX */
  private deckY = 2.2;
  /**
   * 4 grudge6 Bip001 mages parented to shipGroup (ride bob/roll).
   * Feet planted at local y=0 · root.y = deckY. No AnimationMixer yet.
   */
  private deckMages: THREE.Group[] = [];
  private static readonly DECK_MAGE_SLOTS = [
    'deck_mage_0',
    'deck_mage_1',
    'deck_mage_2',
    'deck_mage_3',
  ] as const;
  /** One director per mage (Bip001 rotation-only clips). */
  private mageDirectors: CinemaAnimDirector[] = [];
  private mageClips: THREE.AnimationClip[] = [];
  /** Ship-linked camera: eye/look treated as ship-local offsets (author ship at origin). */
  private camShipLinked = false;
  private camEyeLocal = new THREE.Vector3();
  private camLookLocal = new THREE.Vector3();
  private camLookLevi = false;
  private camFovCur = 60;
  private camLookDebris = false;
  /** Always frame boat + levi head (until pinata / debris) */
  private camTwoShot = false;
  /**
   * Locked master for this beat — eye rides ship, look soft-aims subjects.
   * Prevents continuous side-orbit "spin" when levi/ship move.
   */
  private camMasterSide = new THREE.Vector3(1, 0, 0);
  private camMasterBack = new THREE.Vector3(0, 0, 1);
  private camMasterElev = 12;
  private camMasterDist = 32;
  private camMasterSideDist = 20;
  /**
   * Ship break debris:
   *  - blast → ballistic chunk
   *  - sink  → drops through free surface (most timber)
   *  - float → ~20 flame-aura wreck pieces bobbing near thrown hero (ending plate)
   */
  private pinataPieces: Array<{
    mesh: THREE.Object3D;
    vel: THREE.Vector3;
    ang: THREE.Vector3;
    life: number;
    /** Optional fire-aura shell parented under mesh */
    aura?: THREE.Mesh;
    kind: 'ship' | 'shield' | 'float_debris';
    phase: 'blast' | 'sink' | 'float';
    /** Bob phase for float debris */
    bob: number;
    rWorld: number;
  }> = [];
  /**
   * Non-hero deck mages fleeing off camera-right (not hidden, not thrown).
   * One orc stays as throwHero; these three run / fly out of frame.
   */
  private fleeingMages: Array<{
    root: THREE.Object3D;
    vel: THREE.Vector3;
    life: number;
    dirIdx: number;
  }> = [];
  private explosionBurst: THREE.Points | null = null;
  private launchCamLocked = false;
  private shieldShattered = false;
  /** Beam-direction world push (levi â†’ ship) cached at pinata time */
  private beamPushDir = new THREE.Vector3(0, 0.2, -1);
  /** Film post: bloom + SMAA + grade + vignette */
  private post: PostProcessing | null = null;
  /** Box3 SI audit + shadow fit + optional helpers */
  private boxSys: CinemaBoxSystems | null = null;
  private bloomCur = 0.35;
  private filmTintCur = -0.12;
  private filmVigCur = 0.38;
  private filmContrastCur = 1.08;
  private lastBeatId = '';
  /**
   * Mage projectiles — mage-plume-projectile.glb (CIN_CAST_ASSETS.magePlumeProjectile)
   * with per-mage color tints. Used vs leviathan + vs twisters.
   */
  private magePlumeTemplate: THREE.Object3D | null = null;
  /**
   * Art-forward axis of mage-plume-projectile.glb (measured long axis = +Z).
   * NEVER use Object3D.lookAt for this mesh — lookAt aims local -Z, so the plume
   * flies sideways/backwards relative to its authored trail.
   */
  private readonly magePlumeArtForward = new THREE.Vector3(0, 0, 1);
  private readonly _plumeTan = new THREE.Vector3();
  private readonly _plumeQ = new THREE.Quaternion();
  private readonly _plumeQRoll = new THREE.Quaternion();
  private readonly _plumeMid = new THREE.Vector3();
  private magePlumes: Array<{
    root: THREE.Object3D;
    from: THREE.Vector3;
    to: THREE.Vector3;
    t: number;
    life: number;
    willHit: boolean;
    hitFired: boolean;
    onHit?: (at: THREE.Vector3) => void;
    /** Optional cyclone root to push/kill on arrival */
    target: THREE.Object3D | null;
    spin: number;
  }> = [];
  /** Remaining leviathan plume hits this cut (1–2) */
  private iceSnakeHitsLeft = 2;
  private iceSnakeCd = 0;
  /** Per-mage projectile colors (additive tint on plume mats) */
  private static readonly MAGE_PLUME_COLORS = [
    0x44eeff, // ice cyan
    0xbb55ff, // violet
    0xff7722, // orange
    0x55ff88, // emerald
  ] as const;
  /** Blizzard VFX purged — slot kept only for safe dispose of any stale instance */
  private blizzard: { dispose: () => void; finished?: boolean } | null = null;
  private twisterDead = false;
  private leviChannelLockPos: THREE.Vector3 | null = null;
  private blowbackT = 0;
  private twisterOrbitT = 0;
  /** Soft levi path target (stage place sets this; tick lerps — rise opener) */
  private leviTargetPos = new THREE.Vector3();
  private leviHasTarget = false;
  /**
   * Procedural rise (no swim clip): 0 = fully flat under water, 1 = surface idle pose.
   * Driven by stage keys (hidden/swim → rise → surface).
   */
  private leviRiseU = 0;
  private leviRisePitch = 0.55; // flat under water
  /** End-state ragdoll: face-up float on water with wave force */
  private ragdollActive = false;
  private ragdollT = 0;
  private ragdollBones: THREE.Object3D[] = [];
  private ragdollVel = new THREE.Vector3();
  private leviPathSmooth = 1.8;
  /**
   * Cyclone lifecycle: spawn tiny in water → grow → advance on ship → wind-burst kill.
   */
  private cycloneActors: Array<{
    root: THREE.Object3D;
    baseScale: number;
    grow: number;
    age: number;
    phase: 'idle' | 'spawn' | 'grow' | 'advance' | 'kill' | 'dead';
    spawn: THREE.Vector3;
    ang: number;
    radius: number;
    spin: number;
  }> = [];
  private windBursts: Array<{
    pts: THREE.Points;
    vel: Float32Array;
    life: number;
    maxLife: number;
  }> = [];
  /** Open-water escape: ship flees +Z, leviathan trails (after fight starts) */
  private shipEscapeT = 0;
  private chaseOrigin = new THREE.Vector3(0, 0, 0);
  /** Sail-in: alone on open water → rocks / battle station */
  private readonly shipSailFrom = new THREE.Vector3();
  private readonly shipSailTo = new THREE.Vector3();
  /** Seconds of solo sail before leviathan path begins */
  private readonly shipSailUntilSec = 9.2;
  private shipSailActive = true;

  constructor(host: HTMLElement, cbs: CinemaCallbacks = {}) {
    this.host = host;
    this.cbs = cbs;
    this.stage = new CinemaStageGraph(false);

    // Post owns AA (SMAA) — disable MSAA for clean EffectComposer input
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // ACES on renderer; film grade (grain/chroma/vignette) sits after bloom+SMAA
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';

    // Background is fallback only — sky dome paints the night. Keep near dome horizon.
    this.scene.background = new THREE.Color(0x060a18);
    this.scene.fog = new THREE.FogExp2(0x0a1428, 0.0065);
    this.scene.add(this.stage.root);

    // Night but readable — brig + crew must not fall to black silhouettes
    this.hemi = new THREE.HemisphereLight(0x7a9ad0, 0x12161f, 0.95);
    this.dirLight = new THREE.DirectionalLight(0xd8e4f8, 1.35);
    this.dirLight.position.set(18, 36, 14);
    // Soft fill so far side of hull/mages still read
    const fill = new THREE.DirectionalLight(0x8866aa, 0.35);
    fill.position.set(-22, 18, -12);
    this.scene.add(fill);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 140;
    this.scene.add(this.hemi, this.dirLight, this.dirLight.target);

    this.buildStormSky();
    this.buildWater();
    this.scene.add(this.shipGroup, this.leviathanRoot);

    // Box3 systems (SI + shadow domain) â€” helpers off in production
    const debugBoxes =
      typeof window !== 'undefined' &&
      (new URLSearchParams(window.location.search).get('box3') === '1' ||
        new URLSearchParams(window.location.search).get('debug') === '1');
    this.boxSys = new CinemaBoxSystems(this.scene, debugBoxes);

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(host);
    this.resize();

    // Film post AFTER first resize so composer has real dimensions
    // high: bloom + SMAA + film grade (grain / chroma / soft vignette)
    this.post = new PostProcessing(this.renderer, this.scene, this.camera, {
      quality: 'high',
      bloomStrength: 0.38,
      bloomRadius: 0.5,
      bloomThreshold: 0.78,
      colorTint: -0.14,
      vignetteIntensity: 0.38,
      contrast: 1.07,
      saturation: 1.04,
      grain: 0.05,
      chroma: 0.00085,
    });
    this.post.resize(this.host.clientWidth || 1, this.host.clientHeight || 1);

    void this.bootstrap();
  }

  /**
   * Night skybox: deep starfield + cosmic energy nebulae + storm cloud sheets.
   * Film grade / bloom seed — not a flat black void.
   */
  private buildStormSky(): void {
    // Large inward dome — BackSide only (no geo flip; flip can cull under some composers)
    const geo = new THREE.SphereGeometry(520, 64, 40);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      fog: false,
      // Keep star peaks out of ACES crush so night sky reads on film grade
      toneMapped: false,
      uniforms: {
        uTime: { value: 0 },
        uStorm: { value: 0.45 },
        uFlash: { value: 0 },
        uBlackout: { value: 0 },
        // Deep night zenith → indigo storm horizon
        uZenith: { value: new THREE.Color(0x030612) },
        uHorizon: { value: new THREE.Color(0x101e38) },
        uCloud: { value: new THREE.Color(0x0c1628) },
        // Cosmic energy palette (read bright through bloom)
        uNebulaA: { value: new THREE.Color(0x6a38b8) },
        uNebulaB: { value: new THREE.Color(0x2480b8) },
        uEnergy: { value: new THREE.Color(0x70f0ff) },
        uEnergyHot: { value: new THREE.Color(0xe898ff) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uStorm;
        uniform float uFlash;
        uniform float uBlackout;
        uniform vec3 uZenith;
        uniform vec3 uHorizon;
        uniform vec3 uCloud;
        uniform vec3 uNebulaA;
        uniform vec3 uNebulaB;
        uniform vec3 uEnergy;
        uniform vec3 uEnergyHot;
        varying vec3 vDir;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p *= 2.07;
            a *= 0.5;
          }
          return v;
        }
        // Reliable 2D star layer on spherical UV (grid cells + soft disc + twinkle)
        float stars2d(vec2 uv, float density, float threshold, float soft) {
          vec2 sp = uv * density;
          vec2 id = floor(sp);
          vec2 f = fract(sp) - 0.5;
          float n = hash(id);
          float on = step(threshold, n);
          float d2 = dot(f, f);
          float disc = exp(-d2 * soft);
          float tw = 0.55 + 0.45 * sin(uTime * (2.0 + n * 5.0) + n * 50.0);
          float mag = pow(n, 4.0);
          return on * disc * mag * tw;
        }

        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          float elev = clamp(h * 0.5 + 0.5, 0.0, 1.0);
          // Stars / nebula above water seam
          float skyMask = smoothstep(-0.05, 0.22, h);

          // Spherical UV (stable for stars + nebula)
          float lon = atan(d.z, d.x);
          float lat = asin(clamp(d.y, -1.0, 1.0));
          vec2 uv = vec2(lon * 0.1591549 + 0.5, lat * 0.3183099 + 0.5);

          // Base night gradient
          float horizonBand = exp(-abs(h) * 5.2) * (0.55 + uStorm * 0.4);
          vec3 col = mix(uHorizon, uZenith, pow(elev, 0.5));
          col += uHorizon * horizonBand * 0.5;

          // --- Cosmic nebula (broad, readable color washes) ---
          vec2 nuv = uv * vec2(2.8, 2.0) + vec2(uTime * 0.01, uTime * 0.006);
          float n1 = fbm(nuv);
          float n2 = fbm(nuv * 1.65 + vec2(3.7, -2.1) + uTime * 0.005);
          float neb = smoothstep(0.28, 0.78, n1 * 0.55 + n2 * 0.55);
          // Tilted galactic ribbon
          float band = abs(d.y * 0.48 + d.x * 0.42 + d.z * 0.12);
          float milky = exp(-band * band * 7.0) * (0.4 + 0.55 * n1);
          vec3 nebCol = mix(uNebulaA, uNebulaB, n2);
          col += nebCol * neb * skyMask * (0.55 + uStorm * 0.2);
          col += mix(uNebulaB, uEnergy, 0.45) * milky * skyMask * 0.55;

          // --- Cosmic energy veins (plasma) ---
          float pulse = 0.5 + 0.5 * sin(uTime * 0.75);
          float veinA = abs(fbm(nuv * 3.2 + vec2(uTime * 0.035, -uTime * 0.022)) - 0.5);
          float veinB = abs(fbm(nuv * 4.6 + vec2(-uTime * 0.028, uTime * 0.02) + 2.4) - 0.5);
          veinA = 1.0 - smoothstep(0.0, 0.09 + uStorm * 0.03, veinA);
          veinB = 1.0 - smoothstep(0.0, 0.07, veinB);
          float veins = max(veinA, veinB * 0.7) * skyMask * (0.4 + uStorm * 0.5);
          col += mix(uEnergy, uEnergyHot, veinB) * veins * pulse * 1.1;
          col += uEnergy * veins * 0.25;

          // --- Starfield (dense far + mid + bright gems) ---
          float sFar = stars2d(uv, 220.0, 0.965, 90.0);
          float sMid = stars2d(uv + 0.17, 110.0, 0.978, 70.0);
          float sBright = stars2d(uv + 0.41, 48.0, 0.988, 40.0);
          // Second offset layer for less grid feel
          sFar += stars2d(uv.yx * vec2(1.1, 0.9) + 0.33, 180.0, 0.97, 100.0) * 0.7;
          vec3 starCol =
            vec3(0.85, 0.9, 1.0) * sFar * 1.4 +
            vec3(0.78, 0.88, 1.0) * sMid * 2.2 +
            mix(vec3(1.0, 0.96, 0.9), uEnergy, 0.35) * sBright * 3.5;
          starCol += uEnergyHot * sBright * sBright * 0.8;
          col += starCol * skyMask;

          // Storm cloud sheets (partial cover — stars punch through gaps)
          vec2 cuv = d.xz / max(0.15, abs(d.y) + 0.35);
          float clouds = fbm(cuv * 2.0 + vec2(uTime * 0.012, uTime * 0.008));
          clouds = smoothstep(0.4, 0.9, clouds) * (0.18 + uStorm * 0.42);
          col = mix(col, uCloud, clouds * 0.65);
          float rim = smoothstep(0.35, 0.52, clouds) * (1.0 - smoothstep(0.52, 0.88, clouds));
          col += uEnergy * rim * skyMask * 0.12 * (0.5 + uStorm);

          // Lightning
          col += vec3(0.55, 0.62, 0.8) * uFlash * 0.95;
          col += uEnergy * uFlash * 0.2;

          col *= 1.0 - uBlackout * 0.92;
          // Floor so film grade still has sky luminance
          col = max(col, vec3(0.015, 0.02, 0.04) * skyMask);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.skyDome = new THREE.Mesh(geo, this.skyMat);
    this.skyDome.name = 'cinema_cosmic_night_sky';
    this.skyDome.frustumCulled = false;
    this.skyDome.renderOrder = -10;
    // Don't cast/receive — pure backdrop
    this.skyDome.castShadow = false;
    this.skyDome.receiveShadow = false;
    this.scene.add(this.skyDome);
    console.info('[cinema] cosmic night sky dome planted (stars + nebula + energy)');

    // Soft moon disc (key fill + bloom seed) — cool cosmic moonlight
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(4.8, 28, 20),
      new THREE.MeshBasicMaterial({
        color: 0xe8f0ff,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      }),
    );
    moon.name = 'cinema_storm_moon';
    moon.position.copy(this.moonOffset);
    moon.frustumCulled = false;
    moon.renderOrder = 1;
    this.moonMesh = moon;
    this.scene.add(moon);

    // Soft corona / cosmic energy halo (bloom bait — cyan/violet night)
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(14, 20, 14),
      new THREE.MeshBasicMaterial({
        color: 0x9ad4ff,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        fog: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    glow.name = 'cinema_moon_corona';
    glow.position.copy(this.moonOffset);
    glow.frustumCulled = false;
    glow.renderOrder = 0;
    this.moonGlow = glow;
    this.scene.add(glow);

    // Aim key light roughly from moon
    this.dirLight.position.copy(this.moonOffset).normalize().multiplyScalar(40);
    this.dirLight.color.setRGB(0.82, 0.88, 1.0);
    this.hemi.color.setRGB(0.35, 0.42, 0.7);
    this.hemi.groundColor.setRGB(0.04, 0.08, 0.12);
  }

  private updateStormSky(dt: number, beat: CinBattleBeat): void {
    if (!this.skyMat) return;
    this.skyMat.uniforms.uTime.value = this.elapsed;
    this.skyMat.uniforms.uStorm.value = this.stormCur;
    this.skyMat.uniforms.uFlash.value = this.flash;
    this.skyMat.uniforms.uBlackout.value = this.blackoutCur;
    // Follow camera so dome never edges
    if (this.skyDome) this.skyDome.position.copy(this.camera.position);
    const logoDim =
      beat.logo || (beat.blackout ?? 0) > 0.7
        ? 0.08
        : (0.55 + this.stormCur * 0.12) * (1 - this.blackoutCur * 0.85);
    if (this.moonMesh) {
      this.moonMesh.position.copy(this.camera.position).add(this.moonOffset);
      const m = this.moonMesh.material as THREE.MeshBasicMaterial;
      m.opacity = THREE.MathUtils.lerp(m.opacity, logoDim * 1.15, Math.min(1, dt * 2));
    }
    if (this.moonGlow) {
      this.moonGlow.position.copy(this.camera.position).add(this.moonOffset);
      // Gentle corona pulse with cosmic energy
      const pulse = 0.1 + 0.05 * Math.sin(this.elapsed * 0.9) + this.flash * 0.08;
      const g = this.moonGlow.material as THREE.MeshBasicMaterial;
      g.opacity = THREE.MathUtils.lerp(
        g.opacity,
        pulse * logoDim * (1.1 + this.stormCur * 0.2),
        Math.min(1, dt * 2),
      );
    }
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
      // Still mark ready so the canvas is not stuck on "Loadingâ€¦"
      this.ready = true;
      this.cbs.onReady?.();
      this.cbs.onCaption?.('BOOT ERROR', err instanceof Error ? err.message : String(err));
      if (!this.disposed) this.tick();
    }
  }

  private async bootstrapInner(): Promise<void> {
    // CRITICAL: tz-pirate-ship only (user SSOT v17) + levi + map
    const [shipTz, leviPack, foundation] = await Promise.all([
      loadFirst(CIN_CAST_ASSETS.shipIntact ?? CIN_CAST_ASSETS.ship),
      loadFirstWithClips(CIN_CAST_ASSETS.leviathan),
      loadFirst(CIN_CAST_ASSETS.foundation),
    ]);
    if (this.disposed) return;

    if (foundation) {
      try {
        foundation.name = 'startingfalls_map';
        this.plantStartingFalls(foundation);
        this.scene.add(foundation);
        console.info(
          `[cinema] startingfalls map backdrop span≈${CIN_ISLAND_SPAN_M}m offset=(${CIN_ISLAND_OFFSET.x},${CIN_ISLAND_OFFSET.y},${CIN_ISLAND_OFFSET.z})`,
        );
      } catch (e) {
        console.warn('[cinema] startingfalls plant soft-fail — open-water only', e);
      }
    } else {
      console.warn('[cinema] startingfalls map missing — open-water only');
    }

    await this.mountSplitShipHulls(shipTz, null, null);

    // Boat at FIGHT STATION from frame 0 (sail path was z=92 — off-camera "no boat")
    {
      const [tx, ty, tz] = cinPos('ship_origin');
      const [fx, fy, fz] = cinPos('ship_sail_start');
      this.shipSailFrom.set(fx, fy, fz);
      this.shipSailTo.set(tx, ty, tz);
      // Start ON station so boat is always in the two-shot with levi/rocks
      this.shipGroup.position.set(tx, 0, tz);
      this.shipGroup.rotation.set(0, 0, 0);
      this.shipGroup.visible = true;
      this.shipSailActive = false; // no long empty sail-in; boat present immediately
      this.ensureBoatVisible();
      console.info(
        `[cinema] boat on station (${tx.toFixed(0)},${tz.toFixed(0)}) · children=${this.shipGroup.children.length}`,
      );
    }

    this.deckY = this.measureDeckY(this.intactShip ?? this.shipGroup);
    {
      const active = this.intactShip;
      if (active) {
        const sb = new THREE.Box3().setFromObject(active);
        const ss = sb.getSize(new THREE.Vector3());
        console.info(
          `[cinema] ship SI after LOA-xz fit ≈ ${ss.x.toFixed(1)}×${ss.y.toFixed(1)}×${ss.z.toFixed(1)}m (LOA target ${CIN_SHIP_LOA_M}m) deckY=${this.deckY.toFixed(2)}`,
        );
      }
    }

    // Leviathan â€” LOA 28 m, wet leathery sea-serpent look, yaw-only face boat
    this.leviathan = leviPack?.root ?? makeProceduralLeviathan();
    fitPropSpanM(this.leviathan, CIN_LEVIATHAN_LOA_M, 'max');
    this.prepareLeviathanMaterials(this.leviathan);
    applyLeatheryLeviathanLook(this.leviathan);
    applyLeviathanWaterlineSplit(this.leviathan);
    this.leviathanRoot.add(this.leviathan);
    this.waterSplash = new LeviathanWaterSplash(this.scene, 720);
    this.lastLeviPos.copy(this.leviathanRoot.position);
    this.stage.place(this.leviathanRoot, 'levi_hidden');
    // Deep + flat; Sladania swim clip at 0.5× while rising
    this.leviRiseU = 0;
    this.leviathanRoot.position.y -= 22;
    this.leviathanRoot.rotation.x = this.leviRisePitch;
    this.leviathanRoot.visible = true;
    if (leviPack?.clips?.length) {
      this.leviDirector = new CinemaAnimDirector(this.leviathan, leviPack.clips);
      this.leviAnim = new LeviathanAnimController(this.leviathan, this.leviDirector);
      this.leviMouthBone = this.leviAnim.mouthBone ?? this.findLeviMouthBone(this.leviathan);
      // Brief swim only at start (deep beyond rocks); surface → idle
      this.leviAnim.setMode('swim', { timeScale: 0.5 });
      console.info(
        '[cinema] levi = Sladania · start SWIM (deep) then IDLE · clips:',
        this.leviDirector.listClipNames().slice(0, 16).join(', '),
        '· mouth:',
        this.leviMouthBone?.name ?? 'bounds-fallback',
      );
    } else {
      this.leviMouthBone = this.findLeviMouthBone(this.leviathan);
      console.warn('[cinema] levi pack had no clips — procedural joints only');
    }
    this.spineIk.bind('leviathan', this.leviathan);

    // Ship ward barrier — pro4ik UTCM shield GLB (fallback procedural dome)
    this.shipShield = createShipShield(11);
    this.shipShield.visible = false;
    this.shipGroup.add(this.shipShield);
    void this.loadPro4ikWardShield().catch((e) =>
      console.warn('[cinema] pro4ik ward shield load failed — procedural dome stays', e),
    );

    // 4 deck mages + hero (await so deck is populated before first frames)
    try {
      await this.plantDeckMages();
    } catch (e) {
      console.warn('[cinema] deck mages plant failed', e);
    }

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

    // Dragon beam pack: flame aura, hot hands, fireballs, moonâ†’dragon blast, shield bounce
    this.dragonVfx = new LeviathanDragonBeamVfx(this.scene);

    // Logo overlay
    this.logoEl = document.createElement('img');
    this.logoEl.src = CINEMA_LOGO_URL;
    this.logoEl.alt = 'Grudge';
    this.logoEl.onerror = () => {
      // Fallback: root brand mark (not the large cinema stinger)
      if (this.logoEl) this.logoEl.src = '/grudge-logo.png';
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
    ]);

    console.info(
      `[cinema v20] ready · TZ-PIRATE only LOA${CIN_SHIP_LOA_M}m · orc embedded Bip001 anim · no placeholders · stage=${LEVIATHAN_STAGE_VERSION}`,
    );

    this.ready = true;
    // Beat 0 first, then onReady, then URL seek (SSOT for SPA + standalone HTML)
    this.applyBeat(0, true);
    this.cbs.onReady?.();
    try {
      if (typeof window !== 'undefined') {
        const q = new URLSearchParams(window.location.search);
        const seekRaw = q.get('seek') ?? q.get('t');
        if (seekRaw != null) {
          const sec = Number(seekRaw);
          if (Number.isFinite(sec) && sec > 0) this.seekTo(sec);
        }
      }
    } catch {
      /* ignore */
    }
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
    for (let i = 0; i < this.deckMages.length; i++) {
      this.boxSys.register(
        `mage_${i}`,
        this.deckMages[i],
        CinemaBoxSystems.expectHuman(),
        0x88ffaa,
      );
    }
  }

  /** Optional VFX — failures are non-fatal */
  private async loadVfxBackground(): Promise<void> {
    try {
      // NO smoke-rings.glb — static red torus stacks looked awful and never animated in pinata
      const [fluidPack, tornado, meguminPack, fishPack, floorRoot, plumeRoot] = await Promise.all([
        loadFirstWithClips(CIN_CAST_ASSETS.fluid),
        loadFirst(CIN_CAST_ASSETS.tornado),
        loadFirstWithClips(CIN_CAST_ASSETS.megumin),
        loadFirstWithClips(CIN_CAST_ASSETS.fishParticle),
        loadFirst(CIN_CAST_ASSETS.oceanFloor),
        loadFirst(CIN_CAST_ASSETS.magePlumeProjectile),
      ]);
      if (this.disposed) return;

      // Mage attack projectile SSOT — plume GLB (not IceSnake / not glyph / not sphere orbs)
      if (plumeRoot) {
        // Identity rest orientation — aim is applied every frame in tickMagePlumes
        plumeRoot.rotation.set(0, 0, 0);
        plumeRoot.quaternion.identity();
        // Fit long axis to cinema-readable span (not 1 m ant-bolts at ship cam)
        fitPropSpanM(plumeRoot, CIN_PLUME_SPAN_M, 'max');
        // Detect long axis = flight axis. Plume GLB ~0.67×0.67×3.11 → Z.
        // Tip is typically the smaller end; trail streams opposite flight.
        // We aim LONG AXIS along velocity (not lookAt -Z which skews authored mesh).
        {
          const box = new THREE.Box3().setFromObject(plumeRoot);
          const sz = box.getSize(new THREE.Vector3());
          if (sz.x >= sz.y && sz.x >= sz.z) this.magePlumeArtForward.set(1, 0, 0);
          else if (sz.y >= sz.x && sz.y >= sz.z) this.magePlumeArtForward.set(0, 1, 0);
          else this.magePlumeArtForward.set(0, 0, 1);
        }
        plumeRoot.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          m.castShadow = false;
          m.receiveShadow = false;
          m.frustumCulled = false;
          const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
          for (const mat of mats) {
            const sm = mat as THREE.MeshStandardMaterial;
            if (sm) {
              sm.transparent = true;
              sm.depthWrite = false;
              sm.side = THREE.DoubleSide;
              if ('emissive' in sm && sm.emissive) sm.emissiveIntensity = Math.max(sm.emissiveIntensity ?? 0, 0.85);
            }
          }
        });
        this.magePlumeTemplate = plumeRoot;
        console.info(
          '[cinema] mage plume projectile ready',
          CIN_CAST_ASSETS.magePlumeProjectile[0],
          'artForward=',
          this.magePlumeArtForward.toArray(),
        );
      } else {
        console.warn('[cinema] mage-plume-projectile.glb missing — mage shots will use colored fallback orbs');
      }

      // Underwater set — seafloor + fish schools (improve under-water beats)
      if (floorRoot) {
        this.plantOceanFloor(floorRoot);
      }
      if (fishPack?.root) {
        this.plantFishSchools(fishPack.root, fishPack.clips);
      }

      if (tornado) {
        this.tornadoRoot = tornado;
        fitPropSpanM(tornado, CIN_TWISTER_H_M, 'y');
        applyWaterCycloneLook(tornado, 0.55);
        tornado.visible = false;
        this.scene.add(tornado);
        const bases = [1, 0.88, 0.78];
        this.cycloneActors = [];
        this.cycloneClones = [];
        for (let i = 0; i < 3; i++) {
          const c = i === 0 ? tornado : tornado.clone(true);
          if (i > 0) {
            applyWaterCycloneLook(c, 0.5);
            fitPropSpanM(c, CIN_TWISTER_H_M * bases[i], 'y');
            this.scene.add(c);
            this.cycloneClones.push(c);
          }
          c.visible = false;
          c.userData.__cycloneBaseScale =
            (Math.abs(c.scale.x) + Math.abs(c.scale.y) + Math.abs(c.scale.z)) / 3 || 1;
          this.cycloneActors.push({
            root: c,
            baseScale: c.userData.__cycloneBaseScale as number,
            grow: 0,
            age: 0,
            phase: 'idle',
            spawn: new THREE.Vector3(),
            ang: i * 2.1,
            radius: 18 + i * 4,
            spin: 2.2 + i * 0.35,
          });
        }
      }
      if (fluidPack?.root) {
        this.fluidSplash = fluidPack.root;
        fitPropSpanM(this.fluidSplash, 12, 'max');
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
        // Do NOT auto-play fluid clips at load â€” only when shown (avoids stuck static freeze frame)
        if (fluidPack.clips.length) {
          this.fluidMixer = new THREE.AnimationMixer(this.fluidSplash);
          this.fluidSplash.userData.clips = fluidPack.clips;
        }
      }
      if (meguminPack?.root) {
        this.meguminRoot = meguminPack.root;
        this.meguminRoot.name = 'cinema_megumin_explosion';
        // Flatten Sketchfab unit traps BEFORE any measure (node scale ~112 is classic 100×)
        this.flattenMeguminAuthoringScales(this.meguminRoot);
        this.meguminRoot.visible = false;
        this.meguminRoot.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh || !m.material) return;
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) {
            const std = mat as THREE.MeshStandardMaterial;
            if ('transparent' in std) {
              std.transparent = true;
              std.depthWrite = false;
            }
            if ('emissive' in std && std.emissive) {
              std.emissiveIntensity = Math.max(std.emissiveIntensity ?? 0, 1.2);
            }
          }
        });
        this.scene.add(this.meguminRoot);
        // Sanitize clips: strip root scale tracks that re-inflate 100× after SI fit
        this.meguminClips = this.sanitizeMeguminClips(meguminPack.clips?.slice() ?? []);
        if (this.meguminClips.length) {
          this.meguminMixer = new THREE.AnimationMixer(this.meguminRoot);
          console.info(
            '[cinema] megumin clips:',
            this.meguminClips.map((c) => `${c.name}(${c.duration.toFixed(2)}s tracks=${c.tracks.length})`).join(', '),
          );
        } else {
          console.warn('[cinema] megumin has no clips — pinata will use particle burst only');
        }
        // Peak-frame SI calibrate once (uses mixer if available)
        this.calibrateMeguminSi(CIN_MEGUMIN_SPAN_M);
      }
    } catch (e) {
      console.warn('[LeviathanOceanCinema] optional VFX load failed', e);
    }
  }

  /**
   * Sketchfab megumin hierarchy: Sketchfab_model.scale ≈ 112 + fbx 0.01.
   * Animation "Scene" can re-apply huge scales. Flatten authoring traps once.
   */
  private flattenMeguminAuthoringScales(root: THREE.Object3D): void {
    root.traverse((o) => {
      const sx = Math.abs(o.scale.x);
      // Classic Sketchfab / cm-as-m node scales
      if (sx > 20 && sx < 400) {
        o.scale.multiplyScalar(0.01);
        console.info(`[cinema] megumin flatten node "${o.name}" scale×0.01 (was ${sx.toFixed(1)})`);
      } else if (sx > 400 && sx < 4000) {
        o.scale.multiplyScalar(0.001);
        console.info(`[cinema] megumin flatten node "${o.name}" scale×0.001 (was ${sx.toFixed(1)})`);
      }
    });
    root.updateMatrixWorld(true);
  }

  /**
   * Keep explosion morph/reveal, but drop tracks that set absolute scale on
   * Sketchfab / Root nodes (those re-introduce 100× after SI fit).
   */
  private sanitizeMeguminClips(clips: THREE.AnimationClip[]): THREE.AnimationClip[] {
    if (!clips.length) return clips;
    return clips.map((clip) => {
      const kept = clip.tracks.filter((tr) => {
        const n = tr.name;
        // Drop scale tracks on high-level containers (re-inflate 100×)
        if (/\.scale$/.test(n) && /sketchfab|rootnode|root|scene/i.test(n)) {
          return false;
        }
        // Drop scale tracks whose keyframes peak above 20 (unit error)
        if (/\.scale$/.test(n) && 'values' in tr && Array.isArray((tr as THREE.KeyframeTrack).values)) {
          const vals = (tr as THREE.KeyframeTrack).values as number[];
          let peak = 0;
          for (let i = 0; i < vals.length; i++) peak = Math.max(peak, Math.abs(vals[i]!));
          if (peak > 20) return false;
        }
        return true;
      });
      if (kept.length === clip.tracks.length) return clip;
      console.info(
        `[cinema] megumin clip "${clip.name}" stripped ${clip.tracks.length - kept.length} scale tracks`,
      );
      return new THREE.AnimationClip(clip.name, clip.duration, kept);
    });
  }

  /**
   * Force megumin into SI metres by measuring PEAK animated span (not rest pose).
   * Rest pose can be near-zero (explosion grow-in); rest-only fit → planet on play.
   */
  private calibrateMeguminSi(spanM: number): void {
    const root = this.meguminRoot;
    if (!root) return;
    root.scale.setScalar(1);
    root.updateMatrixWorld(true);

    let peak = 0;
    if (this.meguminMixer && this.meguminClips.length) {
      this.meguminMixer.stopAllAction();
      for (const clip of this.meguminClips) {
        const action = this.meguminMixer.clipAction(clip);
        action.reset();
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.enabled = true;
        action.play();
        const steps = 10;
        for (let i = 0; i <= steps; i++) {
          action.time = (clip.duration * i) / steps;
          this.meguminMixer.update(0);
          root.updateMatrixWorld(true);
          const sz = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
          peak = Math.max(peak, sz.x, sz.y, sz.z);
        }
        action.stop();
      }
      this.meguminMixer.stopAllAction();
    }
    if (!(peak > 1e-4)) {
      const sz = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
      peak = Math.max(sz.x, sz.y, sz.z, 1e-3);
    }

    let decade = unitDecadeFactor(peak, spanM);
    if (peak / spanM > 40) decade = 0.01;
    if (peak / spanM > 400) decade = 0.001;
    const afterDecade = peak * decade;
    const residual = spanM / Math.max(afterDecade, 1e-6);
    const locked = decade * residual;
    root.scale.setScalar(locked);
    lockUniformScale(root);
    this.meguminLockedScale = root.scale.x;
    root.updateMatrixWorld(true);
    const final = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
    console.info(
      `[cinema] megumin SI peak≈${peak.toFixed(2)} → span≈${Math.max(final.x, final.y, final.z).toFixed(2)}m ` +
        `(target ${spanM}m decade=${decade} lockedScale=${this.meguminLockedScale.toFixed(5)})`,
    );
  }

  /** Re-apply SI lock (anim tracks must not change root uniform scale). */
  private applyMeguminLockedScale(): void {
    if (!this.meguminRoot) return;
    const s = this.meguminLockedScale || 1;
    this.meguminRoot.scale.setScalar(s);
  }

  /**
   * Play megumin explosion CLIP once, fast, then hide.
   * Uses calibrated SI lock — never leave a 100× planet on screen.
   */
  private playMeguminExplosion(at: THREE.Vector3, spanM = CIN_MEGUMIN_SPAN_M, timeScale = 2.8): void {
    if (!this.meguminRoot) {
      this.spawnExplosionBurst(at);
      return;
    }
    this.meguminRoot.position.copy(at);
    // Re-calibrate if span override differs from last lock target
    if (Math.abs(spanM - CIN_MEGUMIN_SPAN_M) > 0.5 || !(this.meguminLockedScale > 0)) {
      this.calibrateMeguminSi(spanM);
    } else {
      this.applyMeguminLockedScale();
    }

    if (!this.meguminMixer || !this.meguminClips.length) {
      this.meguminRoot.visible = false;
      this.spawnExplosionBurst(at);
      return;
    }

    this.meguminRoot.visible = true;
    this.meguminMixer.stopAllAction();
    // Prefer the main "Scene" / explosion clip — not every sub-clip at once
    const preferred =
      this.meguminClips.find((c) => /scene|explod|blast|megumin|action/i.test(c.name)) ??
      this.meguminClips[0]!;
    const playList = preferred ? [preferred] : this.meguminClips;
    let maxDur = 0.4;
    for (const clip of playList) {
      const action = this.meguminMixer.clipAction(clip);
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.enabled = true;
      action.setEffectiveWeight(1);
      action.timeScale = timeScale;
      action.play();
      maxDur = Math.max(maxDur, clip.duration / Math.max(0.1, timeScale));
    }
    this.applyMeguminLockedScale();
    this.meguminHideT = maxDur + 0.12;
    // Always pair with particle burst for energy
    this.spawnExplosionBurst(at);
  }

  private tickMegumin(dt: number): void {
    if (this.meguminMixer && this.meguminRoot?.visible) {
      this.meguminMixer.update(dt);
      // Mixer may write node scales — root SI lock stays fixed every frame
      this.applyMeguminLockedScale();
    }
    if (this.meguminHideT > 0) {
      this.meguminHideT -= dt;
      if (this.meguminHideT <= 0 && this.meguminRoot) {
        this.meguminRoot.visible = false;
        this.meguminMixer?.stopAllAction();
      }
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

    // Camera — ship-linked offsets + film blend
    this.bindBeatCamera(beat);

    // Movie film look targets (smoothed in tick)
    this.bloomCur = beat.bloom ?? 0.35;
    this.filmTintCur = beat.blackout && beat.blackout > 0.4 ? -0.25 : beat.storm && beat.storm > 0.7 ? -0.18 : -0.08;
    this.filmVigCur = 0.32 + (beat.blackout ?? 0) * 0.35 + (beat.storm ?? 0.5) * 0.08;
    this.filmContrastCur = 1.04 + (beat.bloom ?? 0.3) * 0.12;

    // Sparse film impacts — only pinata / true shield shatter (not every beam frame)
    if (prev !== idx) {
      if (beat.shipPinata) this.multiCam.impact(2.0, 0.14);
      else if (beat.shieldShatter) this.multiCam.impact(1.4, 0.1);
      this.lastBeatId = beat.id;
    }

    // Actors â†’ locations + anim + spine IK targets
    const assign = beat.actors;
    if (assign.leviathan && this.leviathanRoot) {
      const a = assign.leviathan;
      // Soft path: set target from stage; tick lerps (rise out of water reads continuous)
      const marker = this.stage.get(a.at);
      if (marker) {
        const wp = new THREE.Vector3();
        marker.getWorldPosition(wp);
        this.leviTargetPos.copy(wp);
        this.leviHasTarget = true;
        // First assign / seek / combat surface: snap so camera has a real target (no deep-water stare)
        const snap =
          prev < 0 ||
          force ||
          a.at.includes('rise') ||
          a.at.includes('surface') ||
          a.at.includes('cast') ||
          a.at.includes('breach');
        if (snap) {
          this.leviathanRoot.position.copy(wp);
        }
        // Deeper under when path key is swim/hidden — ease path rate
        // Faster path so levi is on-screen when camera aims at it (was stuck deep mid-lerp)
        this.leviPathSmooth =
          a.at.includes('hidden') || a.at.includes('swim')
            ? 1.6
            : a.at.includes('rise') || a.at.includes('surface')
              ? 2.4
              : 2.8;
      } else {
        this.stage.place(this.leviathanRoot, a.at, { copyYaw: true });
      }
      this.leviathanRoot.visible = a.visible !== false;
      // Yaw-only face boat â€” NEVER lookAt (that tumbles carriers)
      if (a.visible !== false) {
        faceYawToward(this.leviathanRoot, this.shipGroup.position);
      }
      if (this.leviAnim) {
        // Swim only while deep beyond rocks (leviRiseU low); surface/fight → idle
        const mode = this.leviAnim.resolveMode({
          anim: a.anim,
          dragonPhase: beat.dragonPhase ?? this.dragonPhase,
          at: a.at,
          underwater: Math.max(beat.underwater ?? 0, 1 - this.leviRiseU),
          visible: a.visible !== false,
        });
        let restart = false;
        if (a.animRestart === true) restart = true;
        else if (a.animRestart === false) restart = false;
        else if (prev !== idx || mode !== this.leviAnim.getMode()) {
          if (mode === 'attack' || mode === 'roar') restart = true;
          else if (mode === 'charge' && this.leviAnim.getMode() !== 'charge') restart = true;
          else if (mode === 'swim' && this.leviAnim.getMode() !== 'swim') restart = true;
          else if (mode === 'idle' && this.leviAnim.getMode() === 'swim') restart = true; // swim→idle once
        }
        const ts = a.timeScale != null ? Math.min(a.timeScale, 0.5) : 0.5;
        this.leviAnim.setMode(mode, { timeScale: ts, restart });
      } else if (this.leviDirector && a.anim) {
        const restart =
          a.animRestart === true
            ? true
            : a.animRestart === false
              ? false
              : prev !== idx && (a.anim.includes('attack') || a.anim.includes('roar'));
        this.leviDirector.play(animHintsFor(a.anim), {
          fade: restart ? 0.22 : 0.08,
          timeScale: a.timeScale != null ? Math.min(a.timeScale, 0.5) : 0.5,
          restart,
          loop: a.animOnce ? THREE.LoopOnce : THREE.LoopRepeat,
          clamp: !!a.animOnce,
        });
      } else if (this.leviDirector && a.timeScale != null) {
        this.leviDirector.setTimeScale(Math.min(a.timeScale, 0.5));
      }
      // Spine / head aim at deck (boat) — mouth attacks drive from this
      const lookKey = a.lookAt ?? 'ik_ship_deck_center';
      this.spineIk.aimAtObject('leviathan', this.stage.get(lookKey), a.ikWeight ?? 0.75, 0);
    }

    // Deck mages: anim + visibility from beat actors
    this.applyMageBeat(beat, prev !== idx);

    // Ship-wide shield while blocking â€” force visible on shatter beat so pinata reads
    const blockingFire =
      !this.pinataFired &&
      !this.shieldShattered &&
      (!!beat.fireballs ||
        !!beat.shieldImpact ||
        !!beat.shieldBounce ||
        !!beat.shieldShatter ||
        beat.dragonPhase === 'blast' ||
        beat.dragonPhase === 'charge' ||
        beat.dragonPhase === 'snap');
    if (this.shipShield) {
      this.shipShield.visible = blockingFire && !this.shieldShattered;
      if (this.shipShield.visible) this.updateShipShieldPose();
    }
    if (beat.shieldImpact) this.shieldImpactFlash = 1;

    // LOSE FIGHT: ward pinata first, then beam shove, then hull mesh pinata
    if (prev !== idx && beat.shieldShatter && !this.shieldShattered) {
      this.shatterShipShield();
    }
    if (prev !== idx && beat.id === 'beam_hull_push' && !this.pinataFired) {
      this.beamShoveShip(1.35);
    }
    // Boat must stay visible until pinata (single tz hull — no exclusive swap hide)
    this.ensureBoatVisible();
    if (this.intactShip && !this.pinataFired) {
      this.intactShip.visible = true;
      if (beat.shipPinata) this.fireShipPinata();
    } else if (beat.shipPinata && !this.pinataFired) {
      this.fireShipPinata();
    }

    // Dragon beam phase machine (snap 0.1s â†’ charge pause â†’ blast)
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

    // Cyclones ONLY on tornado flag — never whirlpools alone (that pre-spawned them
    // before levi attack and killed the "cast then cyclones" read).
    const wantCyclones = !this.twisterDead && !!beat.tornado;
    if (prev !== idx && wantCyclones && this.cycloneActors.every((c) => c.phase === 'idle' || c.phase === 'dead')) {
      this.spawnCycloneLifecycle();
    }
    if (prev !== idx && !wantCyclones && !beat.mageSplineKill) {
      // Hide idle cyclones when beat does not call for them
      for (const c of this.cycloneActors) {
        if (c.phase === 'idle' || c.phase === 'dead') c.root.visible = false;
      }
    }

    // Mage bolts → wind-burst kill
    if (prev !== idx && beat.mageSplineKill) {
      this.fireMageSplinesAtTwisters();
    }
    // Opening volley of ice snakes when beat enables cast (then continuous in tick)
    if (prev !== idx && beat.iceSnakeCast && this.leviathanRoot.visible) {
      this.iceSnakeCd = 0.15;
      this.fireIceSnakesFromMages(2);
    }
    // Blizzard VFX removed (heavy particle load)

    // 0â€“0.1s static channel lock on leviathan station
    if (beat.leviChannelLock) {
      this.leviChannelLockPos = this.leviathanRoot.position.clone();
    } else if (prev !== idx && this.lastBeatId === 'dragon_channel_lock') {
      this.leviChannelLockPos = null;
    }

    // Blowback intensity for ship rock
    if (beat.blowback) this.blowbackT = Math.max(this.blowbackT, 1.2);
    if (prev !== idx && beat.blowback) {
      this.multiCam.impact(1.0, 0.06);
    }
    if (this.fluidSplash) {
      // Fluid volume near leviathan waterline â€” play clips only when shown
      const leviAt = beat.actors.leviathan?.at ?? '';
      const splash =
        leviAt.includes('surface') ||
        leviAt.includes('breach') ||
        leviAt.includes('rise') ||
        leviAt.includes('dive') ||
        leviAt.includes('swim') ||
        !!beat.whirlpools;
      const wasVis = this.fluidSplash.visible;
      this.fluidSplash.visible = splash;
      if (splash && this.leviathanRoot) {
        const p = this.leviathanRoot.position.clone();
        p.y = 0.2;
        this.fluidSplash.position.copy(p);
      }
      if (splash && !wasVis && this.fluidMixer) {
        const clips = (this.fluidSplash.userData.clips as THREE.AnimationClip[]) ?? [];
        this.fluidMixer.stopAllAction();
        for (const c of clips) {
          const a = this.fluidMixer.clipAction(c);
          a.reset();
          a.setLoop(THREE.LoopRepeat, Infinity);
          a.timeScale = 1.4;
          a.play();
        }
      }
      if (!splash && wasVis) this.fluidMixer?.stopAllAction();
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

    // Shield impacts → spell-glyph flash (GRDG-3DFX-789B55B0) + optional supernova pool
    if (beat.shieldImpact && prev !== idx) {
      this.shieldImpactFlash = 1;
      if (this.shipShield && this.dragonVfx) {
        const wp = new THREE.Vector3();
        this.shipShield.getWorldPosition(wp);
        wp.y += this.deckY * 0.35 + 1.2;
        // SI ward-face glyph, slightly boosted for beat hit
        this.dragonVfx.spawnShieldGlyphImpact(wp, 0.72);
        // Secondary hits around dome for blocked-beam read
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 + this.elapsed;
          this.dragonVfx.spawnShieldGlyphImpact(
            wp.clone().add(new THREE.Vector3(Math.cos(a) * 3.2, 0.4, Math.sin(a) * 3.2)),
            0.42,
          );
        }
      }
      const sn = this.supernovaPool[0];
      if (sn && this.shipShield) {
        const wp = new THREE.Vector3();
        this.shipShield.getWorldPosition(wp);
        sn.position.copy(wp);
        sn.position.y += 2;
        sn.visible = true;
        sn.scale.setScalar(1.2);
        this.scheduleVfxHide(sn, 1.0);
      }
    }
    // shieldDefeat alone = flash; shieldShatter / ward_shatter = full pinata
    if (prev !== idx && beat.shieldDefeat && !beat.shieldShatter && !this.shieldShattered) {
      this.shieldImpactFlash = 1;
    }
    // meguminMark: play CLIP once (fast) — never park static GLB / 100× planet
    if (beat.meguminMark && prev !== idx) {
      const at = this.stage.worldPos('vfx_megumin_keel');
      // Full pinata uses CIN_MEGUMIN_SPAN_M; early marks use a smaller SI flash
      if (this.pinataFired || beat.shipPinata) {
        this.playMeguminExplosion(at, CIN_MEGUMIN_SPAN_M, 3.0);
      } else {
        this.playMeguminExplosion(at, Math.max(4, CIN_MEGUMIN_SPAN_M * 0.55), 3.5);
      }
    }

    // Logo / blackout
    if (this.logoEl) {
      this.logoEl.style.opacity = beat.logo ? '1' : '0';
    }
  }

  /**
   * San Pedro seafloor under the fight — SI span ~180 m, buried just below waterline.
   * Visible mainly on underwater / swim beats (fog + depth fade).
   */
  private plantOceanFloor(root: THREE.Object3D): void {
    root.name = 'cinema_ocean_floor';
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    root.scale.set(1, 1, 1);
    // Wide seafloor under ship/levi (1 unit = 1 m)
    fitPropSpanM(root, 180, 'xz');
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    // Top of seafloor ~4–8 m below waterline
    const topY = box.max.y;
    root.position.y -= topY + 5.5;
    root.position.x += 8;
    root.position.z -= 12;
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = false;
      m.receiveShadow = true;
      m.frustumCulled = true;
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mat of mats) {
        const std = mat as THREE.MeshStandardMaterial;
        if (std.color) {
          // Cool deep-water tint (preserves albedo detail)
          std.color.lerp(new THREE.Color(0x1a4058), 0.35);
        }
        if ('roughness' in std) std.roughness = Math.min(0.95, (std.roughness ?? 0.7) + 0.15);
        if ('metalness' in std) std.metalness = Math.min(0.15, std.metalness ?? 0);
        std.needsUpdate = true;
      }
    });
    this.oceanFloor = root;
    this.oceanFloor.visible = false;
    this.scene.add(this.oceanFloor);
    console.info('[cinema] ocean floor (san pedro) planted · span≈180m · y under waterline');
  }

  /**
   * Fish particle schools — clone around ship/levi for underwater life.
   * Soft SI scale; optional embedded clips; otherwise orbit swim motion.
   */
  private plantFishSchools(template: THREE.Object3D, clips: THREE.AnimationClip[]): void {
    // School-sized — not giant fish (SI)
    fitPropSpanM(template, 4.5, 'max');
    template.updateMatrixWorld(true);
    template.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = false;
      m.receiveShadow = false;
      m.frustumCulled = true;
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mat of mats) {
        const std = mat as THREE.MeshStandardMaterial;
        if ('transparent' in std) {
          std.transparent = true;
          std.opacity = Math.min(0.92, std.opacity ?? 0.9);
          std.depthWrite = false;
        }
        if (std.emissive) {
          std.emissive.set(0x102838);
          std.emissiveIntensity = 0.15;
        }
      }
    });

    const slots: Array<{ x: number; y: number; z: number; s: number }> = [
      { x: 12, y: -3.5, z: 8, s: 1 },
      { x: -10, y: -4.2, z: -6, s: 0.85 },
      { x: 6, y: -2.8, z: -14, s: 1.15 },
      { x: -14, y: -5.0, z: 10, s: 0.75 },
      { x: 18, y: -3.2, z: -4, s: 0.95 },
    ];
    for (let i = 0; i < slots.length; i++) {
      const root = i === 0 ? template : template.clone(true);
      root.name = `cinema_fish_school_${i}`;
      const sl = slots[i];
      root.scale.multiplyScalar(sl.s);
      root.position.set(sl.x, sl.y, sl.z);
      root.rotation.y = (i * 1.1) % (Math.PI * 2);
      root.visible = false;
      this.scene.add(root);
      this.fishSchools.push(root);
      if (clips.length) {
        const mixer = new THREE.AnimationMixer(root);
        const clip = clips[i % clips.length];
        const action = mixer.clipAction(clip);
        action.setEffectiveTimeScale(0.7 + i * 0.08);
        action.play();
        this.fishMixers.push(mixer);
      }
    }
    console.info(
      `[cinema] fish schools x${this.fishSchools.length} · clips=${clips.length} · SI ~4.5m school`,
    );
  }

  /** Show/hide + gentle orbit when underwater depth is high */
  private updateUnderwaterSet(dt: number, beat: CinBattleBeat): void {
    const uw =
      beat.underwater ??
      (this.leviathanRoot.visible && this.leviathanRoot.position.y < 1.2 ? 0.45 : 0);
    const show = uw > 0.25 || beat.id === 'shadow' || beat.id.includes('under');
    if (this.oceanFloor) {
      this.oceanFloor.visible = show;
      if (show) {
        this.oceanFloor.rotation.y += dt * 0.008;
        // Keep floor under live ship chase
        this.oceanFloor.position.x = THREE.MathUtils.lerp(
          this.oceanFloor.position.x,
          this.shipGroup.position.x + 8,
          Math.min(1, dt * 0.4),
        );
        this.oceanFloor.position.z = THREE.MathUtils.lerp(
          this.oceanFloor.position.z,
          this.shipGroup.position.z - 12,
          Math.min(1, dt * 0.4),
        );
      }
    }
    // Deeper blue fog while “under”
    if (show && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = Math.max(this.scene.fog.density, 0.014 + uw * 0.01);
      this.scene.fog.color.lerp(new THREE.Color(0x0a2838), 0.08);
    }
    const ship = this.shipGroup.position;
    for (let i = 0; i < this.fishSchools.length; i++) {
      const f = this.fishSchools[i];
      f.visible = show;
      if (!show) continue;
      const ang = this.elapsed * (0.18 + i * 0.04) + i * 1.7;
      const r = 10 + i * 2.4;
      f.position.x = ship.x + Math.cos(ang) * r + (i % 2 === 0 ? 4 : -3);
      f.position.z = ship.z + Math.sin(ang) * r * 0.85;
      f.position.y = -2.5 - (i % 3) * 0.9 + Math.sin(this.elapsed * 0.7 + i) * 0.35;
      f.rotation.y = ang + Math.PI / 2;
    }
    for (const m of this.fishMixers) m.update(dt);
  }

  /**
   * Plant Desktop startingfalls.glb as real land backdrop (not floating prop rocks).
   * Fit HORIZONTAL footprint only (xz) so cliff height doesn't shrink land mass wrong;
   * plant lowest land on waterline y=0; hide map water planes.
   */
  private plantStartingFalls(root: THREE.Object3D): void {
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    root.scale.set(1, 1, 1);
    root.updateMatrixWorld(true);

    root.traverse((o) => {
      const n = (o.name || '').toLowerCase();
      const matName =
        (o as THREE.Mesh).isMesh && (o as THREE.Mesh).material
          ? (
              Array.isArray((o as THREE.Mesh).material)
                ? ((o as THREE.Mesh).material as THREE.Material[])[0]
                : ((o as THREE.Mesh).material as THREE.Material)
            )?.name?.toLowerCase?.() ?? ''
          : '';

      const isMapOceanPlane =
        n.includes('waterplane') ||
        n.includes('b_water') ||
        (matName === 'watersurface' && (n.includes('plane') || n.includes('b_water'))) ||
        (n.includes('water') &&
          !n.includes('waterfall') &&
          !n.includes('stream') &&
          !n.includes('falls'));

      if (isMapOceanPlane) {
        o.visible = false;
        return;
      }

      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        const mesh = o as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        for (const mat of mats) {
          const std = mat as THREE.MeshStandardMaterial;
          if ('opacity' in std && std.opacity < 1 && !n.includes('waterfall') && !n.includes('stream')) {
            std.transparent = false;
            std.opacity = 1;
          }
        }
      }
    });

    // Horizontal footprint SI (xz) â€” prevents cliff Y from dominating decade fit
    fitPropSpanM(root, CIN_ISLAND_SPAN_M, 'xz');
    root.updateMatrixWorld(true);

    let box = new THREE.Box3().setFromObject(root);
    const cx = (box.min.x + box.max.x) * 0.5;
    const cz = (box.min.z + box.max.z) * 0.5;
    // Plant lowest land on waterline, then sink so beach/rocks contact water (no hover)
    root.position.set(
      CIN_ISLAND_OFFSET.x - cx,
      CIN_ISLAND_OFFSET.y - box.min.y - 2.4,
      CIN_ISLAND_OFFSET.z - cz,
    );
    root.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(root);
    // Force any still-floating land below waterline contact
    if (box.min.y > -0.4) {
      root.position.y -= box.min.y + 0.8;
      root.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(root);
    }
    const size = box.getSize(new THREE.Vector3());
    console.info(
      `[cinema] startingfalls XZ-plant sizeâ‰ˆ${size.x.toFixed(0)}Ã—${size.y.toFixed(0)}Ã—${size.z.toFixed(0)}m ` +
        `y[${box.min.y.toFixed(1)}â€¦${box.max.y.toFixed(1)}] offset=(${CIN_ISLAND_OFFSET.x},${CIN_ISLAND_OFFSET.z})`,
    );
  }

  /**
   * Spawn 4 modular orc mages (Bip001) on deck.
   * - Parented to shipGroup → ride bob/roll as one connected asset
   * - Feet planted: mesh min.y → root local y=0, root.y = deckY (per-slot raycast)
   * - No AnimationMixer / clips — bind pose ready for later anim wiring
   * - grudge6 art-forward +Z (π/2 on mesh) + stage slot yaw on root
   */

  /** Map beat camera keys → ship-local offsets (authored with ship at origin). */
  private isShipLinkedCamKey(key: string): boolean {
    return /cam_(sail|deck|cast|breach|roar|rise|surface|dive|finisher)/i.test(key);
  }

  private bindBeatCamera(beat: CinBattleBeat): void {
    const eyeKey = beat.camEye;
    const lookKey = beat.camLook;
    const [ex, ey, ez] = cinPos(eyeKey as Parameters<typeof cinPos>[0]);
    const [lx, ly, lz] = cinPos(lookKey as Parameters<typeof cinPos>[0]);
    this.camEyeLocal.set(ex, ey, ez);
    this.camLookLocal.set(lx, ly, lz);
    this.camShipLinked = this.isShipLinkedCamKey(eyeKey);

    // Debris only after hull break — otherwise always two-shot boat + head
    this.camLookDebris =
      this.pinataFired ||
      beat.shipPinata ||
      beat.id === 'twenty_meters' ||
      beat.id === 'finisher' ||
      (beat.shipIntact === false && beat.id === 'breach');

    const leviWanted =
      beat.actors.leviathan?.visible !== false &&
      !beat.logo &&
      (beat.blackout ?? 0) < 0.55 &&
      !this.camLookDebris;

    // From approach onward (levi in story), always keep head + boat in frame
    this.camTwoShot =
      leviWanted &&
      (this.leviathanRoot.visible ||
        /approach|shadow|wards|surface|twister|mage|dragon|beam|dive|rise|ward|breach|cast|roar|finisher|hull/i.test(
          beat.id,
        ) ||
        !!beat.dragonPhase ||
        !!beat.fireBeam ||
        beat.shipHit != null ||
        (beat.underwater ?? 0) > 0.2);

    this.camLookLevi = this.camTwoShot;

    // Wide FOV — 36 m LOA boat + levi need room (old clamp max 52 was crushing the frame)
    const def = this.stage.def(eyeKey);
    const rawFov = (def as { fov?: number } | undefined)?.fov ?? 60;
    this.camFovCur = THREE.MathUtils.clamp(
      this.camTwoShot ? Math.max(rawFov, 60) : Math.max(rawFov, 56),
      52,
      72,
    );

    // Lock side/back ONCE per beat from ship → levi
    const shipDeck = this.shipGroup.localToWorld(new THREE.Vector3(0, this.deckY + 1.5, 0));
    const leviAt =
      this.leviHasTarget && this.leviathanRoot.visible
        ? this.leviathanRoot.position.clone().lerp(this.leviTargetPos, 0.25)
        : this.leviathanRoot.position.clone();
    const toLevi = new THREE.Vector3(leviAt.x - shipDeck.x, 0, leviAt.z - shipDeck.z);
    if (toLevi.lengthSq() < 1e-4) toLevi.set(0.25, 0, -1);
    else toLevi.normalize();
    this.camMasterBack.copy(toLevi);
    this.camMasterSide.set(-toLevi.z, 0, toLevi.x);

    // Side-quarter: pull back further for 36 m LOA so hull + beast fit
    const sep = Math.hypot(leviAt.x - shipDeck.x, leviAt.z - shipDeck.z);
    this.camMasterElev = this.camTwoShot ? 10 : 8;
    this.camMasterDist = this.camTwoShot ? Math.max(34, sep * 0.5 + 20) : 26;
    this.camMasterSideDist = this.camTwoShot ? Math.max(28, sep * 0.45 + 20) : 18;

    const hardCut = beat.camMode === 'cut' && /sail_alone|establish/i.test(beat.id);
    this.multiCam.setBlendSpeed(
      hardCut ? 2.0 : beat.shipPinata || beat.id === 'breach' ? 0.55 : 0.38,
    );
    const { eye, look } = this.computeCamEyeLook();
    this.multiCam.setTarget(
      [eye.x, eye.y, eye.z],
      [look.x, look.y, look.z],
      this.camFovCur,
      hardCut ? 'cut' : 'blend',
    );
  }

  /**
   * HARD RULE until ship explodes: leviathan HEAD + BOAT both readable in frame.
   * Eye on a locked side-quarter of the fight; look = midpoint deck ↔ maw.
   * After pinata: debris mode allowed.
   */
  private computeCamEyeLook(): { eye: THREE.Vector3; look: THREE.Vector3 } {
    const shipDeck = this.shipGroup.localToWorld(new THREE.Vector3(0, this.deckY + 1.55, 0));
    const shipBow = this.shipGroup.localToWorld(new THREE.Vector3(0, this.deckY + 2.0, 6));
    const mouth = this.getLeviMouthWorld();
    // Prefer head/mouth height; clamp so underwater doesn't bury the look
    const head = mouth.clone();
    if (this.leviathanRoot.visible) {
      head.y = Math.max(head.y, this.leviathanRoot.position.y + 4, 3);
    }

    // Live gate: as soon as levi is on-screen and ship not exploded → two-shot
    if (!this.pinataFired && this.leviathanRoot.visible) {
      this.camTwoShot = true;
      this.camLookLevi = true;
    }
    if (this.pinataFired) {
      this.camLookDebris = true;
      this.camTwoShot = false;
    }

    let eye: THREE.Vector3;
    let look: THREE.Vector3;

    // Post-explosion: follow thrown hero + floating flame wreckage ring
    if (this.camLookDebris || this.pinataFired) {
      const heroPos = this.throwHero
        ? this.throwHero.getWorldPosition(new THREE.Vector3())
        : null;
      // Bias look toward float debris so boat wreck stays in frame
      const floatC = new THREE.Vector3();
      let floatN = 0;
      for (const p of this.pinataPieces) {
        if (p.kind === 'float_debris' || p.phase === 'float') {
          floatC.add(p.mesh.position);
          floatN++;
        }
      }
      if (floatN > 0) floatC.multiplyScalar(1 / floatN);
      look = heroPos
        ? heroPos.clone().lerp(floatN ? floatC : shipDeck, floatN ? 0.4 : 0.25)
        : floatN
          ? floatC.clone()
          : shipDeck.clone();
      if (heroPos) look.y = Math.max(look.y, heroPos.y * 0.5 + 0.8, 1.2);
      // Side pull — show hero + flaming planks on the water
      eye = new THREE.Vector3(
        look.x + this.camMasterSide.x * 16 - this.camMasterBack.x * 12,
        Math.max(6.5, look.y + 5.5),
        look.z + this.camMasterSide.z * 16 - this.camMasterBack.z * 12,
      );
      if (this.pinataPieces.length) {
        const c = new THREE.Vector3();
        let n = 0;
        for (const p of this.pinataPieces) {
          if (p.life < 0.35) continue;
          c.add(p.mesh.position);
          n++;
        }
        if (n > 0) {
          c.multiplyScalar(1 / n);
          look.lerp(c, 0.2);
        }
      }
      return { eye, look };
    }

    // Solo sail: ship only (levi not in scene yet)
    if (!this.camTwoShot && !this.leviathanRoot.visible) {
      eye = this.shipGroup.localToWorld(this.camEyeLocal.clone());
      look = this.shipGroup.localToWorld(this.camLookLocal.clone());
      look.lerp(shipDeck, 0.2);
      if (eye.y < 5) eye.y = 5;
      return { eye, look };
    }

    // ── TWO-SHOT: boat + leviathan head (always until explode) ──────────
    // Soft-update back axis toward current ship→head so framing stays valid without orbit thrash
    {
      const want = new THREE.Vector3(head.x - shipDeck.x, 0, head.z - shipDeck.z);
      if (want.lengthSq() > 1e-4) {
        want.normalize();
        this.camMasterBack.lerp(want, 0.04);
        this.camMasterBack.y = 0;
        if (this.camMasterBack.lengthSq() > 1e-6) this.camMasterBack.normalize();
        this.camMasterSide.set(-this.camMasterBack.z, 0, this.camMasterBack.x);
      }
      const sep = Math.hypot(head.x - shipDeck.x, head.z - shipDeck.z);
      this.camMasterDist = THREE.MathUtils.lerp(
        this.camMasterDist,
        Math.max(30, sep * 0.55 + 18),
        0.05,
      );
      this.camMasterSideDist = THREE.MathUtils.lerp(
        this.camMasterSideDist,
        Math.max(18, sep * 0.35 + 14),
        0.05,
      );
    }

    // Look: midpoint deck/bow ↔ head so BOTH read
    look = new THREE.Vector3(
      shipDeck.x * 0.42 + shipBow.x * 0.1 + head.x * 0.48,
      Math.max(shipDeck.y + 1.2, (shipDeck.y + head.y) * 0.5),
      shipDeck.z * 0.42 + shipBow.z * 0.1 + head.z * 0.48,
    );

    // Eye: side-quarter of the fight — distance holds LOA + head in FOV
    const back = this.camMasterBack;
    const side = this.camMasterSide;
    eye = new THREE.Vector3(
      look.x - back.x * this.camMasterDist + side.x * this.camMasterSideDist,
      Math.max(shipDeck.y + this.camMasterElev, look.y + 3.5),
      look.z - back.z * this.camMasterDist + side.z * this.camMasterSideDist,
    );

    // Kill top-down: if eye is nearly above look, shove lateral
    {
      const flat = new THREE.Vector3(eye.x - look.x, 0, eye.z - look.z);
      if (flat.length() < 14) {
        eye.x = look.x + side.x * 24 - back.x * 18;
        eye.z = look.z + side.z * 24 - back.z * 18;
        eye.y = shipDeck.y + 8;
      }
    }

    const toLook = look.clone().sub(eye);
    const dist = toLook.length();
    const minDist = 26;
    if (dist > 1e-4 && dist < minDist) {
      eye.copy(look).addScaledVector(toLook.normalize(), -minDist);
    }
    // Cap height so we stay cinematic side-quarter, not bird's eye
    const maxY = look.y + 14;
    if (eye.y > maxY) eye.y = maxY;
    if (eye.y < look.y + 2.5) eye.y = look.y + 2.5;
    if (eye.y < 5) eye.y = 5;

    return { eye, look };
  }


  /**
   * Solo sail-in: ship alone steams from open water toward rock / battle station.
   * Camera is ship-linked (cam_sail_*) so it follows the hull the whole way.
   */
  private updateShipSailIn(dt: number, beat: CinBattleBeat): void {
    if (!this.shipSailActive) return;
    // Keep sailing through sail beats; stop once leviathan path starts
    const t = this.elapsed;
    if (t >= this.shipSailUntilSec || beat.id === 'approach' || beat.id === 'shadow') {
      // Ease into battle station and lock sail phase
      const k = Math.min(1, dt * 1.8);
      this.shipGroup.position.x = THREE.MathUtils.lerp(
        this.shipGroup.position.x,
        this.shipSailTo.x,
        k,
      );
      this.shipGroup.position.z = THREE.MathUtils.lerp(
        this.shipGroup.position.z,
        this.shipSailTo.z,
        k,
      );
      if (
        t >= this.shipSailUntilSec + 0.6 ||
        Math.hypot(
          this.shipGroup.position.x - this.shipSailTo.x,
          this.shipGroup.position.z - this.shipSailTo.z,
        ) < 1.2
      ) {
        this.shipGroup.position.x = this.shipSailTo.x;
        this.shipGroup.position.z = this.shipSailTo.z;
        this.shipSailActive = false;
      }
      return;
    }
    // Smoothstep 0→1 over sail window
    const u = THREE.MathUtils.clamp(t / this.shipSailUntilSec, 0, 1);
    const e = u * u * (3 - 2 * u); // smoothstep
    // Slight ease-out so arrival near rocks reads deliberate
    const e2 = 1 - Math.pow(1 - e, 1.35);
    this.shipGroup.position.x = THREE.MathUtils.lerp(
      this.shipSailFrom.x,
      this.shipSailTo.x,
      e2,
    );
    this.shipGroup.position.z = THREE.MathUtils.lerp(
      this.shipSailFrom.z,
      this.shipSailTo.z,
      e2,
    );
    // Yaw face travel (toward rocks)
    const dx = this.shipSailTo.x - this.shipSailFrom.x;
    const dz = this.shipSailTo.z - this.shipSailFrom.z;
    const wantYaw = Math.atan2(dx, dz);
    let dy = wantYaw - this.shipGroup.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.shipGroup.rotation.y += dy * Math.min(1, dt * 1.5);
  }

  /**
   * Open-water chase: after surface fight starts, ship slowly flees +Z; levi trails.
   * Disabled during sail-in so we don't fight the approach path.
   */
  private updateChaseEscape(dt: number, beat: CinBattleBeat): void {
    if (this.pinataFired || this.shipSailActive) return;
    const t = this.elapsed;
    // Ramp escape only once combat is underway (after surface ~18s)
    if (t < 20) return;
    this.shipEscapeT += dt;
    const flee = Math.min(1, (t - 20) / 18);
    // Ship drifts +Z / slight -X away from falls backdrop
    const speed = 1.15 * flee * (beat.storm && beat.storm > 0.7 ? 1.25 : 1);
    this.shipGroup.position.z += speed * dt * 2.4;
    this.shipGroup.position.x -= speed * dt * 0.35;
    // Soft levi trail: keep distance if not channel-locked
    if (
      this.leviathanRoot.visible &&
      !beat.leviChannelLock &&
      this.dragonPhase !== 'snap' &&
      this.dragonPhase !== 'charge'
    ) {
      const ship = this.shipGroup.position;
      const lp = this.leviathanRoot.position;
      const dx = ship.x - lp.x;
      const dz = ship.z - lp.z;
      const dist = Math.hypot(dx, dz);
      const ideal = 22 + flee * 6;
      if (dist > 1e-3) {
        const pull = (dist - ideal) * dt * 0.35;
        this.leviathanRoot.position.x += (dx / dist) * pull;
        this.leviathanRoot.position.z += (dz / dist) * pull;
      }
    }
  }

  /**
   * Yaw-only mage stance toward leviathan.
   * Mesh already has art-forward π/2 — root yaw = atan2(dx,dz) − shipYaw (no extra +π).
   */
  private faceMagesTowardLevi(dt: number): void {
    if (this.pinataFired || this.ragdollActive || !this.leviathanRoot.visible) return;
    const target = this.leviathanRoot.position;
    const k = Math.min(1, dt * 3.2);
    for (const root of this.deckMages) {
      if (!root.visible || root === this.throwHero) continue;
      const wp = new THREE.Vector3();
      root.getWorldPosition(wp);
      const dx = target.x - wp.x;
      const dz = target.z - wp.z;
      if (dx * dx + dz * dz < 0.25) continue;
      // Mesh π/2 maps art +Z → local +X; aim root so chest faces levi
      const worldYaw = Math.atan2(dx, dz) - Math.PI / 2;
      const shipYaw = this.shipGroup.rotation.y;
      const localYaw = worldYaw - shipYaw;
      let dy = localYaw - root.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      dy = THREE.MathUtils.clamp(dy, -0.9, 0.9);
      root.rotation.y += dy * k;
    }
  }

  private refreshShipLinkedCamera(): void {
    // Keep two-shot / ship ride / debris live every frame
    if (!this.camShipLinked && !this.camLookLevi && !this.camTwoShot && !this.camLookDebris) {
      return;
    }
    const { eye, look } = this.computeCamEyeLook();
    this.multiCam.followTo([eye.x, eye.y, eye.z], [look.x, look.y, look.z], this.camFovCur);
  }

  /** Drive mage idle/cast/defend from beat actor rows (visible + anim). */
  private applyMageBeat(beat: CinBattleBeat, isNewBeat: boolean): void {
    const keys = ['mage_0', 'mage_1', 'mage_2', 'mage_3'] as const;
    const fleeing = new Set(this.fleeingMages.map((f) => f.root));
    for (let i = 0; i < this.deckMages.length; i++) {
      const root = this.deckMages[i];
      // Thrown hero + screen-right flee keep world visibility after pinata
      if (root === this.throwHero || fleeing.has(root)) {
        root.visible = true;
        continue;
      }
      const a = beat.actors[keys[i]];
      const show = !this.pinataFired && (!a || a.visible !== false);
      root.visible = show;
      if (!show || !isNewBeat) continue;
      const dir = this.mageDirectors[i];
      if (!dir) continue;
      // Prefer cast when beat says cast/attack; else walk/idle so skeleton stays alive
      const anim = a?.anim ?? 'walk';
      const hints = animHintsFor(anim);
      const pack =
        /cast|attack|magic|spell/i.test(anim)
          ? ['cast', '2h_cast', 'attack', 'cast2', 'cast3', ...hints]
          : /walk|run|move/i.test(anim)
            ? ['walk', 'walk2', 'run', 'idle', ...hints]
            : hints.length
              ? hints
              : [anim, 'walk', 'idle', 'stand'];
      dir.play(pack, {
        fade: 0.28,
        loop: THREE.LoopRepeat,
      });
    }
  }


  private async plantDeckMages(): Promise<void> {
    const slots = LeviathanOceanCinema.DECK_MAGE_SLOTS;
    // Shared Bip001 clip pack (rotation-only after strip in director)
    if (!this.mageClips.length) {
      try {
        this.mageClips = await loadCinemaMageBip001Clips();
        console.info('[cinema] mage Bip001 clips', this.mageClips.map((c) => c.name).join(', ') || '(none)');
      } catch (e) {
        console.warn('[cinema] mage clips load soft-fail', e);
        this.mageClips = [];
      }
    }
    // Intro cast: all 4 deck mages = modular orc bake (local /models/grudge6/baked/).
    // D: grudge6_incoming baked tree is never modified.
    let packs: Awaited<ReturnType<typeof spawnCinemaHuman>>[];
    try {
      packs = await Promise.all(slots.map(() => spawnCinemaHuman('orc')));
    } catch (e) {
      console.warn('[cinema] deck mages load failed', e);
      return;
    }
    if (this.disposed) return;

    this.shipGroup.updateMatrixWorld(true);

    for (let i = 0; i < packs.length; i++) {
      const pack = packs[i];
      const key = slots[i];
      const def = this.stage.def(key);
      const [sx, , sz] = cinPos(key);
      const slotDeckY = this.measureDeckYAtShipLocal(sx, sz);

      const root = pack.root;
      root.name = 'cinema_orc_mage_' + i;
      root.userData.cinemaRace = 'orc';

      // SI already done in spawnCinemaHuman — only parent + plant feet
      lockUniformScale(root);
      lockUniformScale(pack.mesh);
      root.visible = true;
      pack.mesh.visible = true;

      // Parent under ship — rides bob/roll. NO +π (mesh already has art-forward π/2).
      this.shipGroup.add(root);
      root.position.set(sx, slotDeckY, sz);
      root.rotation.set(0, def?.yaw ?? 0, 0);
      root.updateMatrixWorld(true);

      // Feet on measured deck — Y only
      root.position.y = slotDeckY;
      root.updateMatrixWorld(true);
      {
        const box = new THREE.Box3().setFromObject(root);
        if (Number.isFinite(box.min.y)) {
          const deckWorld = this.shipGroup.localToWorld(
            new THREE.Vector3(root.position.x, slotDeckY, root.position.z),
          );
          const dy = box.min.y - deckWorld.y;
          if (Math.abs(dy) > 0.001) pack.mesh.position.y -= dy;
        }
      }

      root.updateMatrixWorld(true);
      const hBox = new THREE.Box3().setFromObject(root);
      const h = hBox.max.y - hBox.min.y;
      console.info(
        `[cinema] orc_mage_${i} ship-local (${sx.toFixed(2)}, ${slotDeckY.toFixed(2)}, ${sz.toFixed(2)}) ` +
          `h≈${h.toFixed(2)}m yaw=${(def?.yaw ?? 0).toFixed(2)}`,
      );

      // Bip001 magic pack is SSOT for ORC_Characters (same skeleton as WK)
      const clips = this.mageClips.length
        ? this.mageClips
        : pickEmbeddedOrcCinemaClips(pack.clips || []);
      if (clips.length) {
        const dir = new CinemaAnimDirector(pack.mesh, clips);
        const played = dir.play(['idle', 'stand', 'fight_idle', 'walk', 'cast'], {
          fade: 0.2,
          loop: THREE.LoopRepeat,
          restart: true,
        });
        if (!played) {
          console.warn(
            `[cinema] orc_${i} director play failed · clips=${clips.map((c) => c.name).join(',')}`,
          );
        } else {
          console.info(`[cinema] orc_${i} anim=${played.getClip().name} (bip001 magic pack)`);
        }
        this.mageDirectors.push(dir);
      } else {
        console.warn(
          `[cinema] orc_${i} T-POSE risk — no clips (external=${this.mageClips.length} kit=${pack.clips?.length ?? 0})`,
        );
      }
      this.deckMages.push(root);
    }

    console.info(
      `[cinema] deck cast ready x${this.deckMages.length} · orc SI+equip · bip001 · dirs=${this.mageDirectors.length}`,
    );
  }

  /** Keep feet on deck plane: root.y = deckY, mesh feet min → root local 0. */
  private relockMageFeetOnDeck(root: THREE.Object3D, deckY: number): void {
    root.position.y = deckY;
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    if (!Number.isFinite(box.min.y)) return;
    const footWorld = box.min.y;
    const rootWp = new THREE.Vector3();
    root.getWorldPosition(rootWp);
    // Ship may be bobbed — compare foot world to where deck should be
    const deckWorld = this.shipGroup.localToWorld(new THREE.Vector3(root.position.x, deckY, root.position.z));
    const dy = footWorld - deckWorld.y;
    if (Math.abs(dy) > 0.001) {
      // Nudge mesh (first child) so feet sit on deck without moving root XZ
      const mesh = root.children[0];
      if (mesh) mesh.position.y -= dy;
    }
    lockUniformScale(root);
  }

  /**
   * Raycast deck top under a ship-local XZ (same meshes as measureDeckY).
   * Returns shipGroup-local Y for mage feet.
   */
  private measureDeckYAtShipLocal(lx: number, lz: number): number {
    if (!this.intactShip) return this.deckY;
    this.shipGroup.updateMatrixWorld(true);
    const meshes: THREE.Mesh[] = [];
    this.intactShip.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.geometry) meshes.push(m);
    });
    if (!meshes.length) return this.deckY;

    const origin = this.shipGroup.localToWorld(new THREE.Vector3(lx, 40, lz));
    const ray = new THREE.Raycaster(origin, new THREE.Vector3(0, -1, 0));
    const hits = ray.intersectObjects(meshes, false);
    const worldBox = new THREE.Box3().setFromObject(this.intactShip);
    const hullH = Math.max(0.5, worldBox.max.y - worldBox.min.y);
    const yTopCap = worldBox.min.y + hullH * 0.55;

    for (const h of hits) {
      if (h.point.y <= yTopCap && h.point.y >= worldBox.min.y + 0.4) {
        const local = this.shipGroup.worldToLocal(h.point.clone());
        return THREE.MathUtils.clamp(local.y, 0.9, 5.5);
      }
    }
    return this.deckY;
  }

  /**
   * Raycast deck top in ship-local Y (homework / cinema hull).
   * Samples mid-hull XZ grid; median hit Y in lower 55% of hull (not mast).
   */
  private measureDeckY(ship: THREE.Object3D): number {
    ship.updateMatrixWorld(true);
    const worldBox = new THREE.Box3().setFromObject(ship);
    const size = worldBox.getSize(new THREE.Vector3());
    const cx = (worldBox.min.x + worldBox.max.x) * 0.5;
    const cz = (worldBox.min.z + worldBox.max.z) * 0.5;
    const hullH = Math.max(0.5, size.y);
    const yTopCap = worldBox.min.y + hullH * 0.55; // ignore mast/sail hits above this

    const meshes: THREE.Mesh[] = [];
    ship.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.geometry) meshes.push(m);
    });

    const ray = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    const offsets: [number, number][] = [
      [0, 0],
      [0.8, 0],
      [-0.8, 0],
      [0, 1.5],
      [0, -1.5],
      [1.2, 1.0],
      [-1.2, 1.0],
      [1.2, -1.0],
      [-1.2, -1.0],
      [0, 3.0],
      [0, -3.0],
      [2.0, 0],
      [-2.0, 0],
    ];
    const hitsY: number[] = [];
    const origin = new THREE.Vector3();
    for (const [dx, dz] of offsets) {
      origin.set(cx + dx, worldBox.max.y + 8, cz + dz);
      ray.set(origin, down);
      const hits = ray.intersectObjects(meshes, false);
      for (const h of hits) {
        if (h.point.y <= yTopCap && h.point.y >= worldBox.min.y + 0.4) {
          hitsY.push(h.point.y);
          break; // first hit from top = walkable surface at that column
        }
      }
    }

    let deckWorldY: number;
    if (hitsY.length >= 3) {
      hitsY.sort((a, b) => a - b);
      deckWorldY = hitsY[Math.floor(hitsY.length * 0.6)]; // upper-mid of deck hits
      console.info(
        `[cinema] deckY raycast n=${hitsY.length} worldYâ‰ˆ${deckWorldY.toFixed(2)}m (median-ish)`,
      );
    } else {
      // Fallback: 30% of hull height above keel
      deckWorldY = worldBox.min.y + hullH * 0.3;
      console.info(`[cinema] deckY hull-fallback worldYâ‰ˆ${deckWorldY.toFixed(2)}m`);
    }

    // Convert to shipGroup-local Y (at measure time shipGroup â‰ˆ identity)
    const local = this.shipGroup.worldToLocal(new THREE.Vector3(cx, deckWorldY, cz));
    return THREE.MathUtils.clamp(local.y, 0.9, 5.5);
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

  /** Beam push direction: leviathan mouth â†’ ship deck (world). */
  private cacheBeamPushDir(): THREE.Vector3 {
    const mouth = this.getLeviMouthWorld();
    const deck = this.stage.worldPos('ik_ship_deck_center');
    this.beamPushDir.copy(deck).sub(mouth);
    if (this.beamPushDir.lengthSq() < 1e-4) {
      this.beamPushDir.set(
        this.shipGroup.position.x - this.leviathanRoot.position.x,
        0.25,
        this.shipGroup.position.z - this.leviathanRoot.position.z,
      );
    }
    this.beamPushDir.normalize();
    // Bias slightly up so pieces lift off water
    this.beamPushDir.y = Math.max(0.15, this.beamPushDir.y + 0.22);
    this.beamPushDir.normalize();
    return this.beamPushDir;
  }

  /**
   * Ship-ward pinata: dome explodes into cyan shards blown along beam + outward.
   * Call when the fight is lost â€” before hull mesh pinata.
   */
  private shatterShipShield(): void {
    if (this.shieldShattered) return;
    this.shieldShattered = true;
    this.shieldImpactFlash = 1;
    this.multiCam.impact(1.2, 0.08);

    const push = this.cacheBeamPushDir();
    const center = new THREE.Vector3();
    if (this.shipShield) {
      this.shipShield.updateMatrixWorld(true);
      this.shipShield.getWorldPosition(center);
      this.shipShield.visible = false;
    } else {
      this.shipGroup.getWorldPosition(center);
      center.y += this.deckY + 1.5;
    }

    // Cyan shield shards (icosa pieces) + band fragments
    const baseR = 11 * 0.95;
    const shardN = 36;
    for (let i = 0; i < shardN; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const onSphere = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi) * 0.75,
        Math.sin(phi) * Math.sin(theta),
      );
      // Ellipsoid match ship shield
      onSphere.x *= 1.15;
      onSphere.z *= 1.35;
      const pos = center.clone().addScaledVector(onSphere, baseR * (0.85 + Math.random() * 0.2));

      const geo =
        i % 3 === 0
          ? new THREE.TetrahedronGeometry(0.35 + Math.random() * 0.45, 0)
          : i % 3 === 1
            ? new THREE.BoxGeometry(0.5, 0.08, 0.7)
            : new THREE.SphereGeometry(0.28 + Math.random() * 0.2, 6, 5);
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x66eeff : 0xaaffff,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.lookAt(center);
      this.scene.add(mesh);

      // Outward + beam blow-away
      const out = pos.clone().sub(center).normalize();
      const vel = out
        .multiplyScalar(14 + Math.random() * 18)
        .addScaledVector(push, 10 + Math.random() * 12);
      vel.y += 4 + Math.random() * 8;

      this.pinataPieces.push({
        mesh,
        vel,
        ang: new THREE.Vector3(
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14,
        ),
        life: 1.4 + Math.random() * 1.1,
        kind: 'shield',
        phase: 'blast',
        bob: Math.random() * Math.PI * 2,
        rWorld: 0.2,
      });
    }
    // Flash burst at shield center
    this.spawnExplosionBurst(center);
    // Tint burst cyan-ish by recreating with blue-white â€” already orange; add second small cyan
    console.info('[cinema] ship shield SHATTERED â€” shards:', shardN);
  }

  /** Fire-aura shell for burning timber debris (procedural, not glyph GLB). */
  private attachFireAura(parent: THREE.Object3D, radius = 0.55): THREE.Mesh {
    const aura = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 10, 8),
      new THREE.MeshBasicMaterial({
        color: 0xff5511,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      }),
    );
    aura.name = 'debris_fire_aura';
    parent.add(aura);
    return aura;
  }

  private applyBurnMaterial(mat: THREE.Material): THREE.Material {
    const std = mat as THREE.MeshStandardMaterial;
    if (std.isMeshStandardMaterial || (std as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) {
      const c = std.clone();
      c.emissive = new THREE.Color(0xff4400);
      c.emissiveIntensity = 0.85 + Math.random() * 0.6;
      if (c.color) c.color.lerp(new THREE.Color(0x221100), 0.35);
      c.needsUpdate = true;
      return c;
    }
    if ((mat as THREE.MeshBasicMaterial).isMeshBasicMaterial) {
      const b = (mat as THREE.MeshBasicMaterial).clone();
      b.color = new THREE.Color(0xff6622);
      return b;
    }
    return mat;
  }

  /** Instant world shove on shipGroup along beam (pre-pinata physical hit). */
  private beamShoveShip(strength = 1): void {
    const push = this.cacheBeamPushDir();
    this.shipGroup.position.addScaledVector(push, 1.8 * strength);
    this.shipGroup.position.y += 0.6 * strength;
    this.blowbackT = Math.max(this.blowbackT, 1.8 * strength);
    this.shipGroup.rotation.z += (Math.random() - 0.5) * 0.25 * strength;
    this.shipGroup.rotation.x += 0.12 * strength;
    this.multiCam.impact(Math.min(1.5, 0.9 * strength), 0.07);
  }

  /**
   * Force homework ship materials to READ at night — Sketchfab exports often
   * arrive as near-black / transparent glass and vanish on dark ocean.
   */
  private hardenShipMaterials(root: THREE.Object3D): void {
    let meshes = 0;
    let fixed = 0;
    root.traverse((o) => {
      if (/^camera$/i.test(o.name) || /sketchfab/i.test(o.name)) {
        o.visible = false;
        return;
      }
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.material) return;
      meshes++;
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      m.visible = true;

      const list = Array.isArray(m.material) ? m.material : [m.material];
      const out: THREE.Material[] = [];
      for (const mat of list) {
        const name = (mat.name || m.name || '').toLowerCase();
        // Hide pure water fill until sinking state (on split sinking hull only we keep)
        const isWater = /water[123]/.test(name);
        const isGlass = /glass|window/.test(name);

        let std = mat as THREE.MeshStandardMaterial;
        // Promote basic/unlit black mats to standard so lights hit them
        if (!(std as THREE.MeshStandardMaterial).isMeshStandardMaterial && !(std as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) {
          const next = new THREE.MeshStandardMaterial({
            color: 0x6b4a2e,
            roughness: 0.82,
            metalness: 0.05,
            name: mat.name || 'ship_wood',
          });
          if ((mat as THREE.MeshBasicMaterial).map) next.map = (mat as THREE.MeshBasicMaterial).map;
          std = next;
          fixed++;
        } else {
          std = mat as THREE.MeshStandardMaterial;
        }

        if (isWater) {
          // Keep water but only faintly — full sink hull shows it
          std.transparent = true;
          std.opacity = Math.min(0.55, std.opacity ?? 0.45);
          std.depthWrite = false;
          if (std.color) std.color.setHex(0x1a4a6a);
        } else {
          std.transparent = false;
          std.opacity = 1;
          std.depthWrite = true;
          std.side = THREE.DoubleSide;
          // Lift pure black albedo so brig reads under night sky
          if (std.color) {
            const c = std.color;
            if (c.r + c.g + c.b < 0.12) {
              if (/sail|cloth/.test(name)) c.setHex(0xc8b89a);
              else if (/metal|bolt|gun|grey/.test(name)) c.setHex(0x6a7080);
              else c.setHex(0x5c3d24); // wood
              fixed++;
            }
          }
          if (!std.emissive) std.emissive = new THREE.Color(0x000000);
          std.emissive.setHex(0x1a120c);
          std.emissiveIntensity = Math.max(std.emissiveIntensity ?? 0, 0.22);
          if (std.roughness != null) std.roughness = Math.min(0.92, Math.max(0.45, std.roughness));
          if (isGlass) {
            std.transparent = true;
            std.opacity = 0.35;
          }
        }
        std.needsUpdate = true;
        out.push(std);
      }
      m.material = out.length === 1 ? out[0] : out;
    });
    console.info(`[cinema] ship materials hardened · meshes=${meshes} lifted=${fixed}`);
  }

  /** Tint a hull clone for damaged / sinking read when unique GLB missing. */
  private styleHullVariant(root: THREE.Object3D, kind: 'damaged' | 'sinking'): void {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.material) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) {
        const std = mat as THREE.MeshStandardMaterial;
        if (!('color' in std) || !std.color) continue;
        if (kind === 'damaged') {
          std.color.offsetHSL(0, -0.15, -0.12);
          if (std.emissive) {
            std.emissive.setHex(0x331100);
            std.emissiveIntensity = 0.35;
          }
        } else {
          std.color.offsetHSL(0.02, -0.2, -0.2);
          if (std.emissive) {
            std.emissive.setHex(0x001122);
            std.emissiveIntensity = 0.2;
          }
        }
        std.needsUpdate = true;
      }
    });
  }

  /**
   * REAL ship only: tz-pirate-ship.glb at CIN_SHIP_LOA_M (18 m).
   * No procedural box, no yellow bar, no silhouette brick.
   */
  private async mountSplitShipHulls(
    a: THREE.Object3D | null,
    _b: THREE.Object3D | null,
    _c: THREE.Object3D | null,
  ): Promise<void> {
    let hull =
      a ||
      (await loadFirst([
        '/models/cinema/tz-pirate-ship.glb',
        'https://assets.grudge-studio.com/models/cinema/tz-pirate-ship.glb',
        ...CIN_CAST_ASSETS.shipIntact,
        ...CIN_CAST_ASSETS.ship,
      ]));

    if (!hull) {
      console.error('[cinema] FATAL: tz-pirate-ship.glb failed to load');
      this.intactShip = null;
      this.shipHulls = { intact: null, damaged: null, sinking: null };
      return;
    }

    hull.name = 'tz_pirate_ship';
    hull.visible = true;
    hull.scale.set(1, 1, 1);
    hull.position.set(0, 0, 0);
    hull.rotation.set(0, 0, 0);
    // NEVER hide "Sketchfab_model" / sketchfab containers — that is the entire tz hull.
    // Only suppress embedded camera helpers.
    hull.traverse((o) => {
      if (/^camera$/i.test(o.name) || /cameranode|cam_target/i.test(o.name)) {
        o.visible = false;
        return;
      }
      o.visible = true;
    });

    const meshN = forceShipReadableMaterials(hull);
    // LOA = longest horizontal (xz), NOT height — ship is taller than long in bind pose
    hull.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(hull);
    let size = box.getSize(new THREE.Vector3());
    const loaRaw = Math.max(size.x, size.z, 1e-3);
    const s = CIN_SHIP_LOA_M / loaRaw;
    hull.scale.setScalar(s);
    lockUniformScale(hull);
    hull.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(hull);
    hull.position.x -= (box.min.x + box.max.x) * 0.5;
    hull.position.z -= (box.min.z + box.max.z) * 0.5;
    hull.position.y -= box.min.y;
    hull.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(hull);
    hull.position.y -= box.min.y;
    hull.updateMatrixWorld(true);

    const final = new THREE.Box3().setFromObject(hull).getSize(new THREE.Vector3());
    const loa = Math.max(final.x, final.z);

    this.shipHulls = { intact: hull, damaged: null, sinking: null };
    this.shipMultiState = false;
    this.shipHullState = 'intact';
    this.intactShip = hull;
    this.wreckShip = null;

    this.shipGroup.visible = true;
    this.shipGroup.scale.set(1, 1, 1);
    this.shipGroup.position.set(0, 0, 0);
    this.shipGroup.rotation.set(0, 0, 0);
    while (this.shipGroup.children.length) {
      this.shipGroup.remove(this.shipGroup.children[0]);
    }
    // Strip any leftover trash from prior builds
    for (const trash of ['boat_debug_loa', 'boat_silhouette_brig', 'keel_failsafe', 'boat_procedural_brig', 'emergency_procedural_boat']) {
      const t = this.shipGroup.getObjectByName(trash);
      if (t) this.shipGroup.remove(t);
    }

    this.shipGroup.add(hull);
    hull.visible = true;
    if (!this.shipGroup.parent) this.scene.add(this.shipGroup);

    const fill = new THREE.PointLight(0xffe0b0, 3.5, 55, 2);
    fill.position.set(0, 6.5, 1);
    this.shipGroup.add(fill);

    console.info(
      `[cinema] TZ-PIRATE ONLY · meshes=${meshN} LOA=${loa.toFixed(1)}m (target ${CIN_SHIP_LOA_M}) · ` +
        `${final.x.toFixed(1)}×${final.y.toFixed(1)}×${final.z.toFixed(1)}m · no placeholders`,
    );
  }

  /** Keep real ship visible — never inject a box; never hide Sketchfab root. */
  private ensureBoatVisible(): void {
    if (this.pinataFired) return;
    if (!this.shipGroup.parent) this.scene.add(this.shipGroup);
    this.shipGroup.visible = true;
    this.shipGroup.scale.set(1, 1, 1);
    for (const trash of ['boat_debug_loa', 'boat_silhouette_brig', 'keel_failsafe', 'boat_procedural_brig', 'emergency_procedural_boat']) {
      const t = this.shipGroup.getObjectByName(trash);
      if (t) this.shipGroup.remove(t);
    }
    if (this.intactShip) {
      this.intactShip.visible = true;
      if (this.intactShip.parent !== this.shipGroup) this.shipGroup.add(this.intactShip);
      this.intactShip.traverse((o) => {
        // Only cameras stay off — Sketchfab_model must stay ON
        if (/^camera$/i.test(o.name) || /cameranode|cam_target/i.test(o.name)) {
          o.visible = false;
          return;
        }
        o.visible = true;
        const m = o as THREE.Mesh;
        if (m.isMesh) m.frustumCulled = false;
      });
      // If LOA collapsed to dust, re-fit once
      this.intactShip.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(this.intactShip);
      const size = box.getSize(new THREE.Vector3());
      const loa = Math.max(size.x, size.z, 1e-6);
      if (loa < 4 || loa > 80) {
        const s = CIN_SHIP_LOA_M / loa;
        this.intactShip.scale.multiplyScalar(s);
        lockUniformScale(this.intactShip);
        console.warn(`[cinema] boat LOA rescue ×${s.toFixed(3)} (was ${loa.toFixed(2)}m)`);
      }
    } else {
      console.warn('[cinema] ensureBoatVisible: no intactShip — boat missing');
    }
  }

  private hullFor(state: 'intact' | 'damaged' | 'sinking'): THREE.Object3D | null {
    if (state === 'intact') return this.shipHulls.intact;
    if (state === 'damaged') return this.shipHulls.damaged;
    return this.shipHulls.sinking;
  }

  private snapShipHullState(state: 'intact' | 'damaged' | 'sinking'): void {
    this.shipBlend = null;
    this.setShipHullState(state, false);
  }

  /** Swap exclusive hull GLB (one of three). */
  private setShipHullState(state: 'intact' | 'damaged' | 'sinking', _blend = true): void {
    if (state === this.shipHullState && this.intactShip === this.hullFor(state)) return;
    const next = this.hullFor(state);
    if (!next) return;
    const prev = this.intactShip;
    const from = this.shipHullState;
    this.shipHullState = state;

    // Detach previous
    if (prev && prev !== next) {
      prev.visible = false;
      if (prev.parent === this.shipGroup) this.shipGroup.remove(prev);
    }
    // Attach next only
    if (next.parent !== this.shipGroup) this.shipGroup.add(next);
    next.visible = true;
    this.intactShip = next;

    this.shipSinkY =
      state === 'sinking' ? Math.max(this.shipSinkY, 1.8) : state === 'damaged' ? 0.4 : 0;
    console.info(`[cinema] ship exclusive ${from} → ${state} (${next.name})`);
  }

  private updateShipBlend(_dt: number): void {
    this.shipBlend = null;
  }

  /** pro4ik UTCM shield — ship-wide ward barrier (beam hits this, not hull, until shatter). */
  private async loadPro4ikWardShield(): Promise<void> {
    const urls = CIN_CAST_ASSETS.wardShield ?? [
      '/models/cinema/ward-shield.glb',
    ];
    let root: THREE.Object3D | null = null;
    for (const url of urls) {
      try {
        const gltf = await loadGltfCached(url);
        root = cloneGltfScene(gltf);
        if (root) break;
      } catch {
        /* try next */
      }
    }
    if (!root || this.disposed) return;

    // Compact barrier — ~3–4 m face, parked 5 m off the deck toward leviathan
    fitPropSpanM(root, 4.2, 'max');
    root.name = 'cinema_pro4ik_ward_shield';
    // Default: 5 m forward of deck center (updated live in updateShipShieldPose)
    root.position.set(0, Math.max(2.4, this.deckY + 1.0), 5);
    root.userData.standoffM = 5;
    root.userData.radiusM = 2.2;
    root.traverse((c) => {
      const m = c as THREE.Mesh;
      if (!m.isMesh || !m.material) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) {
        const std = mat as THREE.MeshStandardMaterial;
        if ('transparent' in std) {
          std.transparent = true;
          std.opacity = Math.min(0.78, std.opacity ?? 0.7);
          std.depthWrite = false;
          if (std.emissive) std.emissive.setHex(0x33aacc);
          if ('emissiveIntensity' in std) std.emissiveIntensity = 0.85;
          std.needsUpdate = true;
        }
      }
      m.castShadow = false;
      m.receiveShadow = false;
      m.frustumCulled = false;
    });
    root.visible = this.shipShield?.visible ?? false;

    if (this.shipShield) {
      this.shipGroup.remove(this.shipShield);
    }
    this.shipShield = root;
    this.shipGroup.add(root);
    this.updateShipShieldPose();
    console.info('[cinema] pro4ik ward shield mounted · 5 m off deck (beam stops here)');
  }

  /**
   * Keep pro4ik shield 5 m from deck center toward leviathan mouth.
   * Beam aims here until shatter.
   */
  private updateShipShieldPose(): void {
    if (!this.shipShield || this.shieldShattered) return;
    const standoff = (this.shipShield.userData.standoffM as number) || 5;
    const deckLocal = new THREE.Vector3(0, Math.max(2.2, this.deckY + 1.0), 0);
    const deckWorld = this.shipGroup.localToWorld(deckLocal.clone());
    const mouth = this.getLeviMouthWorld();
    const dir = mouth.clone().sub(deckWorld);
    dir.y *= 0.35;
    if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1);
    else dir.normalize();
    // World point 5 m from deck toward maw, then back into ship-local
    const worldHit = deckWorld.clone().addScaledVector(dir, standoff);
    const local = this.shipGroup.worldToLocal(worldHit.clone());
    this.shipShield.position.copy(local);
    // Face the beam (look at mouth in ship space)
    const mouthLocal = this.shipGroup.worldToLocal(mouth.clone());
    const dx = mouthLocal.x - local.x;
    const dz = mouthLocal.z - local.z;
    this.shipShield.rotation.set(0, Math.atan2(dx, dz), 0);
  }

  /** World hit point on ward (or deck if shield down). */
  private getBeamTargetWorld(out = new THREE.Vector3()): THREE.Vector3 {
    if (this.shipShield?.visible && !this.shieldShattered) {
      this.shipShield.getWorldPosition(out);
      return out;
    }
    return this.stage.worldPos('ik_ship_deck_center', out);
  }

  /** Blizzard VFX purged (perf) — no-ops only. */
  private spawnDeckBlizzard(): void {
    if (this.blizzard) {
      this.blizzard.dispose();
      this.blizzard = null;
    }
  }

  private updateBlizzard(_dt: number, _beat: CinBattleBeat): void {
    if (this.blizzard) {
      this.blizzard.dispose();
      this.blizzard = null;
    }
  }

  /**
   * End beat: throw orc (no weapons) → face-up ragdoll float on water with wave force.
   */
  private beginHeroThrow(): void {
    if (this.throwActive || this.ragdollActive) return;
    let hero: THREE.Object3D | null = null;
    for (let i = this.deckMages.length - 1; i >= 0; i--) {
      if (this.deckMages[i]) {
        hero = this.deckMages[i];
        break;
      }
    }
    if (!hero) return;

    // Stop cast/walk — skeleton goes limp next
    const hi = this.deckMages.indexOf(hero);
    if (hi >= 0) {
      try {
        (this.mageDirectors[hi] as { mixer?: THREE.AnimationMixer }).mixer?.stopAllAction();
      } catch {
        /* ignore */
      }
    }

    // Nothing in hand — hide weapons/staff on this body
    hero.traverse((o) => {
      const n = (o.name || '').toLowerCase();
      if (/weapon|staff|shield|bow|sword|axe|hammer|spear|dagger|mace|quiver/.test(n)) {
        o.visible = false;
      }
    });

    hero.updateMatrixWorld(true);
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    hero.getWorldPosition(worldPos);
    hero.getWorldQuaternion(worldQuat);
    this.shipGroup.remove(hero);
    this.scene.add(hero);
    hero.position.copy(worldPos);
    hero.quaternion.copy(worldQuat);
    hero.visible = true;
    // Keep SI scale from spawn — never reset to 1 (that undoes fit and looks stretched/wrong)
    lockUniformScale(hero);
    {
      const b = new THREE.Box3().setFromObject(hero);
      const h = b.max.y - b.min.y;
      if (h > 0.2 && (h < 1.4 || h > 2.8)) {
        hero.scale.multiplyScalar(CIN_ORC_M / h);
        lockUniformScale(hero);
      }
    }

    this.throwFrom.copy(worldPos);
    const [tx, ty, tz] = cinPos('throw_end');
    this.throwTo.set(
      this.shipGroup.position.x + tx,
      Math.max(0.35, ty),
      this.shipGroup.position.z + tz,
    );
    const flat = new THREE.Vector3(this.throwTo.x - this.throwFrom.x, 0, this.throwTo.z - this.throwFrom.z);
    if (flat.length() < CIN_HERO_THROW_M * 0.7) {
      flat.set(1, 0, 0.25).normalize().multiplyScalar(CIN_HERO_THROW_M);
      this.throwTo.set(this.throwFrom.x + flat.x, 0.4, this.throwFrom.z + flat.z);
    }

    this.throwHero = hero;
    this.throwActive = true;
    this.throwT = 0;
    this.throwDur = 2.4;
    this.ragdollBones = [];
    hero.traverse((o) => {
      if ((o as THREE.Bone).isBone || /bip001|spine|arm|leg|hand|foot|head/i.test(o.name)) {
        this.ragdollBones.push(o);
      }
    });
    console.info('[cinema] HERO THROW → face-up water ragdoll');
  }

  private updateHeroThrow(dt: number): void {
    if (!this.throwActive || !this.throwHero) return;
    this.throwT += dt;
    const u = Math.min(1, this.throwT / this.throwDur);
    const e = u * u * (3 - 2 * u);
    const x = THREE.MathUtils.lerp(this.throwFrom.x, this.throwTo.x, e);
    const z = THREE.MathUtils.lerp(this.throwFrom.z, this.throwTo.z, e);
    const baseY = THREE.MathUtils.lerp(this.throwFrom.y, this.throwTo.y, e);
    const peak = 7 + CIN_HERO_THROW_M * 0.12;
    const y = baseY + Math.sin(u * Math.PI) * peak;
    this.throwHero.position.set(x, y, z);
    // Arc tumble into face-up (supine): end rot.x ≈ -π/2
    this.throwHero.rotation.x = THREE.MathUtils.lerp(0.2, -Math.PI / 2, e);
    this.throwHero.rotation.z = Math.sin(u * Math.PI * 2) * 0.35 * (1 - e);
    this.throwHero.rotation.y += dt * 0.8;
    this.throwHero.visible = true;

    if (u >= 1) {
      this.throwActive = false;
      this.beginWaterRagdoll();
    }
  }

  /** Face-up on water — wave height + soft limb sway (no weapons). */
  private beginWaterRagdoll(): void {
    if (!this.throwHero) return;
    this.ragdollActive = true;
    this.ragdollT = 0;
    this.ragdollVel.set((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.35);
    // Face up: back in water
    this.throwHero.rotation.set(-Math.PI / 2, this.throwHero.rotation.y, 0);
    const wy = sampleCinemaWaterY(
      this.throwHero.position.x,
      this.throwHero.position.z,
      this.elapsed,
      this.stormCur ?? 0.5,
    );
    this.throwHero.position.y = wy + 0.15;
    console.info('[cinema] water ragdoll face-up active');
  }

  private updateRagdollInWater(dt: number): void {
    if (!this.ragdollActive || !this.throwHero) return;
    this.ragdollT += dt;
    const p = this.throwHero.position;
    // Water height field + storm bob
    const wy = sampleCinemaWaterY(p.x, p.z, this.elapsed, this.stormCur ?? 0.5);
    const wave = Math.sin(this.elapsed * 1.7 + p.x * 0.2) * 0.12 + Math.sin(this.elapsed * 1.1 + p.z * 0.15) * 0.08;
    p.y = THREE.MathUtils.lerp(p.y, wy + 0.12 + wave, Math.min(1, dt * 4));
    // Drift + water push from ship bob / swell
    p.x += this.ragdollVel.x * dt + Math.sin(this.elapsed * 0.9) * dt * 0.15;
    p.z += this.ragdollVel.z * dt + Math.cos(this.elapsed * 0.7) * dt * 0.12;
    this.ragdollVel.multiplyScalar(0.99);
    // Stay face-up; gentle roll with swell
    this.throwHero.rotation.x = THREE.MathUtils.lerp(
      this.throwHero.rotation.x,
      -Math.PI / 2 + wave * 0.4,
      dt * 2,
    );
    this.throwHero.rotation.z = Math.sin(this.elapsed * 1.3) * 0.18;
    // Soft limb limp (bones only — no mixer)
    for (let i = 0; i < this.ragdollBones.length; i++) {
      const b = this.ragdollBones[i];
      if (!b || /root|hips|bip001$/i.test(b.name)) continue;
      const f = this.elapsed * 2.1 + i * 0.7;
      b.rotation.x += Math.sin(f) * dt * 0.35;
      b.rotation.z += Math.cos(f * 0.8) * dt * 0.25;
    }
    this.throwHero.visible = true;
  }

  /**
   * Screen-right flee for the three non-hero orcs.
   * Hero is thrown into water; these leave frame right of camera.
   */
  private sendMagesScreenRight(keep: THREE.Object3D | null): void {
    // Camera right in world (column 0 of matrixWorld)
    const camRight = new THREE.Vector3();
    this.camera.updateMatrixWorld(true);
    camRight.setFromMatrixColumn(this.camera.matrixWorld, 0).normalize();
    // Slight forward so they don't clip the lens
    const camFwd = new THREE.Vector3();
    this.camera.getWorldDirection(camFwd);
    camFwd.y = 0;
    if (camFwd.lengthSq() > 1e-6) camFwd.normalize();
    else camFwd.set(0, 0, -1);

    let fleeIdx = 0;
    for (let i = 0; i < this.deckMages.length; i++) {
      const m = this.deckMages[i];
      if (!m || m === keep || m === this.throwHero) continue;
      if (fleeIdx >= 3) break;

      m.updateMatrixWorld(true);
      const wp = new THREE.Vector3();
      const wq = new THREE.Quaternion();
      m.getWorldPosition(wp);
      m.getWorldQuaternion(wq);
      if (m.parent) m.parent.remove(m);
      this.scene.add(m);
      m.position.copy(wp);
      m.quaternion.copy(wq);
      m.visible = true;

      // Face flee direction + run
      const faceYaw = Math.atan2(camRight.x, camRight.z);
      m.rotation.set(0, faceYaw, 0);
      const dir = this.mageDirectors[i];
      dir?.play(['run', 'walk', 'walk2', 'idle'], {
        fade: 0.12,
        loop: THREE.LoopRepeat,
        restart: true,
      });

      // Staggered exit speeds so they don't stack
      const speed = 14 + fleeIdx * 3.5 + Math.random() * 4;
      const vel = camRight
        .clone()
        .multiplyScalar(speed)
        .addScaledVector(camFwd, 2 + fleeIdx)
        .add(new THREE.Vector3(0, 1.2 + Math.random() * 1.5, 0));

      this.fleeingMages.push({
        root: m,
        vel,
        life: 3.8 + fleeIdx * 0.35,
        dirIdx: i,
      });
      fleeIdx++;
    }
    console.info(`[cinema] mages flee screen-right ×${this.fleeingMages.length} (hero stays for throw)`);
  }

  private updateFleeingMages(dt: number): void {
    for (let i = this.fleeingMages.length - 1; i >= 0; i--) {
      const f = this.fleeingMages[i]!;
      f.life -= dt;
      // Gravity light + drag
      f.vel.y -= 4.5 * dt;
      f.vel.multiplyScalar(0.995);
      f.root.position.addScaledVector(f.vel, dt);
      // Face velocity on XZ
      const vx = f.vel.x;
      const vz = f.vel.z;
      if (vx * vx + vz * vz > 0.04) {
        f.root.rotation.y = Math.atan2(vx, vz);
      }
      // Bob slightly while "running"
      f.root.position.y = Math.max(
        0.15,
        f.root.position.y + Math.sin(this.elapsed * 14 + i) * dt * 0.4,
      );
      this.mageDirectors[f.dirIdx]?.mixer.update(dt);

      if (f.life <= 0) {
        f.root.visible = false;
        this.fleeingMages.splice(i, 1);
      }
    }
  }

  /**
   * Hull break / explosion beat.
   * - 1 orc thrown (water ragdoll)
   * - other 3 flee screen-right
   * - tz_pirate: DETACH every mesh and explode outward (no clone ghost hull)
   */
  private fireShipPinata(): void {
    if (this.pinataFired) return;
    this.pinataFired = true;

    // Throw ONE orc; send the other three off camera-right (not hide)
    this.beginHeroThrow();
    this.sendMagesScreenRight(this.throwHero);

    if (!this.shieldShattered) this.shatterShipShield();
    if (this.blizzard) {
      this.blizzard.dispose();
      this.blizzard = null;
    }

    const origin = new THREE.Vector3();
    this.shipGroup.getWorldPosition(origin);
    origin.y += this.deckY;

    const push = this.cacheBeamPushDir();
    this.blowbackT = Math.max(this.blowbackT, 2.4);
    this.multiCam.impact(1.8, 0.12);
    this.playMeguminExplosion(origin, CIN_MEGUMIN_SPAN_M, 3.4);
    this.spawnExplosionBurst(origin);

    // Chunk the live tz_pirate hull: blast → sink OR float as flaming wreckage.
    // Boat never "vanishes" — debris IS the boat for the ending plate.
    const source = this.intactShip;
    if (source) {
      source.updateMatrixWorld(true);
      const pieces: THREE.Mesh[] = [];
      source.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !m.geometry) return;
        if (/^camera$/i.test(m.name) || /cameranode|cam_target/i.test(m.name)) return;
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        const names = mats.map((mat) => (mat.name || '').toLowerCase()).join(' ');
        if (/water[123]/.test(names)) return;
        m.geometry.computeBoundingSphere();
        const r =
          (m.geometry.boundingSphere?.radius ?? 0) *
          Math.max(Math.abs(m.scale.x), Math.abs(m.scale.y), Math.abs(m.scale.z), 1e-6);
        if (r < 0.008) return;
        pieces.push(m);
      });

      // Score by world-ish radius; prefer massy timber for the 20 float keepers
      const scored = pieces.map((m) => {
        const r =
          (m.geometry.boundingSphere?.radius ?? 0.1) *
          Math.max(Math.abs(m.scale.x), Math.abs(m.scale.y), Math.abs(m.scale.z), 0.01);
        return { m, r };
      });
      scored.sort((a, b) => b.r - a.r);

      const MAX_CHUNKS = 900;
      const deploy = scored.slice(0, MAX_CHUNKS);
      // Top 20 substantial pieces become floating flame debris around the hero
      const FLOAT_N = 20;
      const floatSet = new Set<THREE.Mesh>();
      for (let i = 0; i < deploy.length && floatSet.size < FLOAT_N; i++) {
        const s = deploy[i]!;
        // Skip dust/sails-only tiny after scale
        if (s.r < 0.06) continue;
        floatSet.add(s.m);
      }
      // If still short, fill with next largest
      for (let i = 0; i < deploy.length && floatSet.size < FLOAT_N; i++) {
        floatSet.add(deploy[i]!.m);
      }

      console.info(
        `[cinema] ship pinata DETACH — ${deploy.length}/${pieces.length} chunks · ` +
          `${floatSet.size} float flame debris (boat stays as wreckage)`,
      );

      for (let i = 0; i < deploy.length; i++) {
        const { m: src, r: rAuthor } = deploy[i]!;
        src.updateMatrixWorld(true);
        this.scene.attach(src);
        src.visible = true;
        src.castShadow = false;
        src.receiveShadow = false;
        src.frustumCulled = false;
        src.name = `pinata_${src.name || i}`;

        if (Array.isArray(src.material)) {
          src.material = src.material.map((mat) => this.applyBurnMaterial(mat));
        } else if (src.material) {
          src.material = this.applyBurnMaterial(src.material as THREE.Material);
        }

        const rWorld = Math.max(
          rAuthor,
          (src.geometry.boundingSphere?.radius ?? 0.2) *
            Math.max(Math.abs(src.scale.x), Math.abs(src.scale.y), Math.abs(src.scale.z), 0.01),
        );
        const keepFloat = floatSet.has(src);
        // Flame aura on all float keepers + larger sinkers
        let aura: THREE.Mesh | undefined;
        if (keepFloat || rWorld > 0.16) {
          aura = this.attachFireAura(src, 0.2 + Math.min(1.6, rWorld * 0.12));
        }

        const fromCenter = src.position.clone().sub(origin);
        fromCenter.y *= 0.65;
        if (fromCenter.lengthSq() < 0.04) {
          const a = (i / Math.max(1, deploy.length)) * Math.PI * 2 + Math.random() * 0.4;
          fromCenter.set(Math.cos(a), 0.35 + Math.random() * 0.4, Math.sin(a));
        }
        fromCenter.normalize();

        // Float keepers: milder blast so they land near the wreck / hero, not off-camera
        const radial = keepFloat ? 4 + Math.random() * 7 : 10 + Math.random() * 15;
        const beamSpeed = keepFloat ? 3 + Math.random() * 5 : 9 + Math.random() * 14;
        const lift = keepFloat ? 3 + Math.random() * 4 : 5 + Math.random() * 9;
        const vel = fromCenter
          .multiplyScalar(radial)
          .addScaledVector(push, beamSpeed)
          .add(new THREE.Vector3(0, lift, 0));
        if (rWorld > 2.2) vel.multiplyScalar(0.7);
        else if (rWorld < 0.12) vel.multiplyScalar(1.3);

        this.pinataPieces.push({
          mesh: src,
          vel,
          ang: new THREE.Vector3(
            (Math.random() - 0.5) * (keepFloat ? 4 : 12),
            (Math.random() - 0.5) * (keepFloat ? 5 : 14),
            (Math.random() - 0.5) * (keepFloat ? 4 : 12),
          ),
          // Float debris lives for the whole ending plate; sinkers linger then go under
          life: keepFloat ? 999 : 7 + Math.random() * 5,
          aura,
          kind: keepFloat ? 'float_debris' : 'ship',
          phase: 'blast',
          bob: Math.random() * Math.PI * 2,
          rWorld,
        });
      }

      // Hull empties — debris is the boat now (do not leave a full invisible hull)
      source.visible = false;
      // Keep shipGroup in scene for any residual lights/parent math, but empty of hull
      this.shipGroup.visible = true;
    }

    if (this.wreckShip) this.wreckShip.visible = false;
    if (this.shipShield) this.shipShield.visible = false;
    this.intactShip = null;
    this.launchCamLocked = true;
  }

  private spawnExplosionBurst(at: THREE.Vector3): void {
    // Clear any prior stuck burst
    if (this.explosionBurst) {
      this.scene.remove(this.explosionBurst);
      this.explosionBurst.geometry.dispose();
      (this.explosionBurst.material as THREE.Material).dispose();
      this.explosionBurst = null;
    }
    const n = 280;
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = at.x;
      pos[i * 3 + 1] = at.y;
      pos[i * 3 + 2] = at.z;
      const d = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() * 0.9 + 0.25,
        Math.random() - 0.5,
      ).normalize().multiplyScalar(10 + Math.random() * 22);
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
        size: 0.42,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.scene.add(this.explosionBurst);
  }

  private updatePinata(dt: number): void {
    const g = 11;
    // Free surface Y (cinema ocean at 0)
    const waterY = 0.08;
    // Hero anchor for floating wreckage ring
    const heroPos = this.throwHero
      ? this.throwHero.getWorldPosition(new THREE.Vector3())
      : this.shipGroup.getWorldPosition(new THREE.Vector3());

    for (let i = this.pinataPieces.length - 1; i >= 0; i--) {
      const p = this.pinataPieces[i]!;
      if (p.kind !== 'float_debris') p.life -= dt;

      // ── FLOAT DEBRIS: flaming planks bobbing on water around the thrown orc ──
      if (p.phase === 'float' || (p.kind === 'float_debris' && p.phase !== 'blast')) {
        p.phase = 'float';
        p.bob += dt * (1.1 + (i % 5) * 0.08);
        // Soft drift toward a ring around the hero (beautiful ending plate)
        const ang = p.bob * 0.35 + i * 0.31;
        const ringR = 3.5 + (i % 7) * 0.85 + Math.sin(p.bob * 0.5) * 0.4;
        const tx = heroPos.x + Math.cos(ang) * ringR;
        const tz = heroPos.z + Math.sin(ang) * ringR;
        p.mesh.position.x = THREE.MathUtils.lerp(p.mesh.position.x, tx, 1 - Math.exp(-dt * 0.55));
        p.mesh.position.z = THREE.MathUtils.lerp(p.mesh.position.z, tz, 1 - Math.exp(-dt * 0.55));
        p.mesh.position.y =
          waterY + 0.12 + Math.sin(p.bob) * 0.18 + Math.sin(p.bob * 1.7 + i) * 0.06;
        // Gentle rock
        p.mesh.rotation.x = Math.sin(p.bob * 0.9) * 0.25;
        p.mesh.rotation.z = Math.cos(p.bob * 0.7) * 0.2;
        p.mesh.rotation.y += dt * p.ang.y * 0.08;
        p.vel.set(0, 0, 0);
        p.mesh.visible = true;

        if (p.aura?.material) {
          const am = p.aura.material as THREE.MeshBasicMaterial;
          am.opacity =
            0.45 * (0.75 + 0.25 * Math.sin(this.elapsed * 14 + i));
          p.aura.scale.setScalar(1 + Math.sin(this.elapsed * 11 + i) * 0.15);
        }
        continue;
      }

      // ── BLAST / SINK ──
      const grav = p.kind === 'shield' ? 6 : p.phase === 'sink' ? 4.5 : g;
      p.vel.y -= grav * dt;
      p.vel.multiplyScalar(p.kind === 'shield' ? 0.985 : p.phase === 'sink' ? 0.97 : 0.992);
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.ang.x * dt;
      p.mesh.rotation.y += p.ang.y * dt;
      p.mesh.rotation.z += p.ang.z * dt;

      // Hit free surface
      if (p.phase === 'blast' && p.mesh.position.y <= waterY + 0.35 && p.vel.y < 0) {
        if (p.kind === 'float_debris') {
          // Splash settle → permanent float with flame
          p.phase = 'float';
          p.vel.set(
            (Math.random() - 0.5) * 0.6,
            0,
            (Math.random() - 0.5) * 0.6,
          );
          p.ang.multiplyScalar(0.15);
          p.mesh.position.y = waterY + 0.15;
          if (!p.aura) {
            p.aura = this.attachFireAura(p.mesh, 0.28 + Math.min(1.2, p.rWorld * 0.1));
          }
        } else if (p.kind === 'ship') {
          // Timber sinks through the surface
          p.phase = 'sink';
          p.vel.x *= 0.35;
          p.vel.z *= 0.35;
          p.vel.y = Math.min(p.vel.y, -0.8);
          p.ang.multiplyScalar(0.4);
        } else {
          // Shield shards bounce then die
          p.vel.y *= -0.25;
          p.mesh.position.y = waterY + 0.1;
        }
      }

      // Sink deeper after surface
      if (p.phase === 'sink') {
        p.vel.y = Math.min(p.vel.y, -0.6);
        // Slow spin underwater
        p.ang.multiplyScalar(0.99);
      }

      // Fire aura while airborne / sinking (float handled above)
      if (p.aura?.material && p.phase !== 'float') {
        const am = p.aura.material as THREE.MeshBasicMaterial;
        const u = p.kind === 'float_debris' ? 1 : Math.max(0, Math.min(1, p.life / 6));
        am.opacity =
          (p.kind === 'shield' ? 0.55 : 0.42) *
          u *
          (0.75 + 0.25 * Math.sin(this.elapsed * 18 + i));
        p.aura.scale.setScalar(1 + Math.sin(this.elapsed * 14 + i) * 0.12);
      }
      if (p.kind === 'shield') {
        const m = p.mesh as THREE.Mesh;
        const mat = m.material as THREE.MeshBasicMaterial;
        if (mat && 'opacity' in mat) {
          mat.opacity = Math.max(0, (p.life / 2.2) * 0.9);
        }
      }

      // Remove only sinkers/shields that finished — never kill float debris
      const sunkAway = p.phase === 'sink' && p.mesh.position.y < -6;
      const expired = p.kind !== 'float_debris' && p.life <= 0;
      if (sunkAway || expired) {
        // Soft fade sinkers: leave float_debris forever for ending
        this.scene.remove(p.mesh);
        // Don't dispose float geometries; for sinkers, drop refs only (avoid double-free shared mats)
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
      mat.opacity *= Math.exp(-dt * 3.2);
      mat.size *= Math.exp(-dt * 0.8);
      if (mat.opacity < 0.04) {
        this.scene.remove(this.explosionBurst);
        this.explosionBurst.geometry.dispose();
        mat.dispose();
        this.explosionBurst = null;
      }
    }
  }

  /**
   * Mage cast hand world position (Bip001 R Hand if present, else chest-forward).
   */
  private getMageHandWorld(mageRoot: THREE.Object3D, out = new THREE.Vector3()): THREE.Vector3 {
    let hand: THREE.Object3D | null = null;
    mageRoot.traverse((o) => {
      if (hand) return;
      const n = (o.name || '').toLowerCase().replace(/[:\s.]+/g, '');
      if (
        n.includes('rhand') ||
        n.includes('righthand') ||
        n === 'bip001rhand' ||
        n.endsWith('r_hand') ||
        n.includes('r_hand_container')
      ) {
        hand = o;
      }
    });
    if (hand) {
      hand.getWorldPosition(out);
      return out;
    }
    mageRoot.getWorldPosition(out);
    out.y += 1.45;
    // Slight forward (ship +Z art-forward kits sit under root)
    const f = new THREE.Vector3(0, 0, 0.45).applyQuaternion(mageRoot.getWorldQuaternion(new THREE.Quaternion()));
    out.add(f);
    return out;
  }

  /** Clone plume template + tint materials with mage color (emissive + color multiply). */
  private cloneMagePlume(colorHex: number): THREE.Object3D {
    const tint = new THREE.Color(colorHex);
    if (this.magePlumeTemplate) {
      const root = this.magePlumeTemplate.clone(true);
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh || !mesh.material) return;
        const srcMats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const cloned = srcMats.map((mat) => {
          const m = mat.clone() as THREE.MeshStandardMaterial & {
            color?: THREE.Color;
            emissive?: THREE.Color;
            opacity?: number;
            transparent?: boolean;
            blending?: THREE.Blending;
            depthWrite?: boolean;
          };
          if (m.color) m.color.lerp(tint, 0.55);
          if (m.emissive) {
            m.emissive.copy(tint);
            m.emissiveIntensity = Math.max(m.emissiveIntensity ?? 0.5, 1.2);
          }
          m.transparent = true;
          m.depthWrite = false;
          m.blending = THREE.AdditiveBlending;
          if (typeof m.opacity === 'number') m.opacity = Math.min(1, (m.opacity ?? 0.9) * 1.05);
          return m;
        });
        mesh.material = cloned.length === 1 ? cloned[0] : cloned;
      });
      return root;
    }
    // Fallback if GLB failed — still colored, not the old ice snake
    const g = new THREE.Group();
    g.name = 'mage_plume_fallback';
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 10),
      new THREE.MeshBasicMaterial({
        color: tint,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const shell = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.9, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: tint,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    shell.rotation.x = Math.PI / 2;
    shell.position.z = -0.35;
    g.add(core, shell);
    return g;
  }

  private disposeMagePlumeRoot(root: THREE.Object3D): void {
    this.scene.remove(root);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      // Don't dispose shared template geometry if we ever share it — clones own mats
      if (m.geometry && m.geometry !== (this.magePlumeTemplate as THREE.Mesh | null)?.geometry) {
        // Cloned scenes share geometry from SkeletonUtils/clone — safe to skip geo dispose on template-shared
      }
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mat of mats) mat.dispose?.();
    });
  }

  /**
   * Mage attacks → mage-plume-projectile.glb with color tints (hand → leviathan).
   * Mostly miss; at most 2 hits total.
   */
  private fireIceSnakesFromMages(count = 2): void {
    if (!this.leviathanRoot.visible || this.pinataFired) return;
    const casters = this.deckMages.filter((m) => m.visible);
    if (!casters.length) return;

    const leviAim = this.getLeviMouthWorld();
    const head = this.stage.worldPos('ik_levi_head');
    if (head.distanceTo(leviAim) < 40) leviAim.lerp(head, 0.35);

    const n = Math.min(count, casters.length);
    for (let i = 0; i < n; i++) {
      const mage = casters[i % casters.length];
      const mi = this.deckMages.indexOf(mage);
      const color =
        LeviathanOceanCinema.MAGE_PLUME_COLORS[
          (mi >= 0 ? mi : i) % LeviathanOceanCinema.MAGE_PLUME_COLORS.length
        ];
      const hand = this.getMageHandWorld(mage);
      const willHit = this.iceSnakeHitsLeft > 0 && Math.random() < 0.28;
      let to: THREE.Vector3;
      if (willHit) {
        this.iceSnakeHitsLeft -= 1;
        to = leviAim
          .clone()
          .add(
            new THREE.Vector3(
              (Math.random() - 0.5) * 1.2,
              (Math.random() - 0.3) * 1.5,
              (Math.random() - 0.5) * 1.2,
            ),
          );
      } else {
        const missSide = Math.random() > 0.5 ? 1 : -1;
        to = leviAim
          .clone()
          .add(
            new THREE.Vector3(
              missSide * (6 + Math.random() * 10),
              2 + Math.random() * 5,
              (Math.random() - 0.5) * 8,
            ),
          );
      }
      // Spawn closer to aim (25% of the way hand→target) so bolts read on-camera sooner
      const from = hand.clone().lerp(to, 0.25);

      const root = this.cloneMagePlume(color);
      root.position.copy(from);
      // Aim immediately at launch (no one-frame sideways rest pose)
      this.aimMagePlumeAlong(root, to.clone().sub(from), 0);
      this.scene.add(root);
      this.magePlumes.push({
        root,
        from: from.clone(),
        to: to.clone(),
        t: 0,
        life: willHit ? 1.35 + Math.random() * 0.25 : 1.05 + Math.random() * 0.35,
        willHit,
        hitFired: false,
        target: null,
        spin: 2.5 + Math.random() * 2,
        onHit: (at) => {
          this.dragonVfx?.spawnShieldGlyphImpact(at, 0.45 + Math.random() * 0.2);
          console.info(
            '[cinema] mage-plume HIT leviathan @',
            at.x.toFixed(1),
            at.y.toFixed(1),
            at.z.toFixed(1),
          );
        },
      });

      if (mi >= 0) {
        this.mageDirectors[mi]?.play(['cast', '2h_cast', 'attack', 'cast2'], {
          fade: 0.12,
          loop: THREE.LoopRepeat,
          restart: true,
        });
      }
    }
  }

  private updateIceSnakes(dt: number, beat: CinBattleBeat): void {
    const casting =
      !!beat.iceSnakeCast &&
      this.leviathanRoot.visible &&
      !this.pinataFired &&
      !beat.logo &&
      (beat.blackout ?? 0) < 0.5;
    this.iceSnakeCd = Math.max(0, this.iceSnakeCd - dt);
    if (casting && this.iceSnakeCd <= 0 && this.magePlumes.length < 6) {
      this.iceSnakeCd = 0.75 + Math.random() * 0.5;
      this.fireIceSnakesFromMages(1 + (Math.random() < 0.35 ? 1 : 0));
    }
    this.tickMagePlumes(dt);
  }

  /** Two deck mages fire colored plume bolts that push and destroy water twisters. */
  private fireMageSplinesAtTwisters(): void {
    const targets = this.cycloneActors
      .filter((a) => a.root.visible && a.phase !== 'dead' && a.phase !== 'idle')
      .map((a) => a.root);
    const casters = this.deckMages.filter((m) => m.visible).slice(0, 2);
    if (!casters.length) {
      this.killCyclonesWithWind();
      return;
    }
    for (let i = 0; i < casters.length; i++) {
      const mage = casters[i];
      const mi = this.deckMages.indexOf(mage);
      const color =
        LeviathanOceanCinema.MAGE_PLUME_COLORS[
          (mi >= 0 ? mi : i) % LeviathanOceanCinema.MAGE_PLUME_COLORS.length
        ];
      const hand = this.getMageHandWorld(mage);
      const target = targets[i % Math.max(1, targets.length)] ?? null;
      const to = target
        ? target.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 2, 0))
        : this.leviathanRoot.position.clone().add(new THREE.Vector3(0, 3, 0));
      const from = hand.clone().lerp(to, 0.22);

      const root = this.cloneMagePlume(color);
      root.position.copy(from);
      this.aimMagePlumeAlong(root, to.clone().sub(from), 0);
      this.scene.add(root);
      this.magePlumes.push({
        root,
        from: from.clone(),
        to: to.clone(),
        t: 0,
        life: 0.95 + i * 0.12,
        willHit: !!target,
        hitFired: false,
        target,
        spin: 3.2,
        onHit: () => {
          /* twister kill handled in tick via target */
        },
      });

      this.mageDirectors[mi >= 0 ? mi : i]?.play(['cast', '2h_cast', 'attack', 'cast2'], {
        fade: 0.15,
        loop: THREE.LoopRepeat,
        restart: true,
      });
    }
  }

  private updateSpellSplines(dt: number): void {
    // Plume shots carry both leviathan + twister fire now
    this.tickMagePlumes(dt);
    // When spline-kill beat finished and no plumes left, ensure cyclones die
    if (
      this.magePlumes.length === 0 &&
      this.lastBeatId === 'mage_spline_kill' &&
      !this.twisterDead
    ) {
      this.killCyclonesWithWind();
    }
  }

  /**
   * Aim plume art-forward (+Z long axis) along flight tangent.
   * Do NOT use lookAt — it aims local -Z and throws the authored trail sideways/back.
   */
  private aimMagePlumeAlong(root: THREE.Object3D, dir: THREE.Vector3, rollRad: number): void {
    if (dir.lengthSq() < 1e-10) return;
    this._plumeTan.copy(dir).normalize();
    // setFromUnitVectors fails if parallel opposite — handle
    const art = this.magePlumeArtForward;
    if (Math.abs(art.dot(this._plumeTan) + 1) < 1e-6) {
      // 180° flip
      this._plumeQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    } else {
      this._plumeQ.setFromUnitVectors(art, this._plumeTan);
    }
    // Roll around art-forward (local Z after aim) for energy spin — not rotateZ on wrong axis
    this._plumeQRoll.setFromAxisAngle(art, rollRad);
    root.quaternion.copy(this._plumeQ).multiply(this._plumeQRoll);
  }

  private tickMagePlumes(dt: number): void {
    const midLift = 2.6;
    for (let i = this.magePlumes.length - 1; i >= 0; i--) {
      const s = this.magePlumes[i];
      s.t += dt;
      const u = Math.min(1, s.t / Math.max(0.05, s.life));
      this._plumeMid.lerpVectors(s.from, s.to, 0.5);
      this._plumeMid.y += midLift;
      const omu = 1 - u;
      // Quadratic Bezier position
      const x = omu * omu * s.from.x + 2 * omu * u * this._plumeMid.x + u * u * s.to.x;
      const y = omu * omu * s.from.y + 2 * omu * u * this._plumeMid.y + u * u * s.to.y;
      const z = omu * omu * s.from.z + 2 * omu * u * this._plumeMid.z + u * u * s.to.z;
      s.root.position.set(x, y, z);

      // Bezier derivative = flight tangent (stable on frame 0 — no prev-pos lag)
      // B'(u) = 2(1-u)(mid-from) + 2u(to-mid)
      this._plumeTan.set(
        2 * omu * (this._plumeMid.x - s.from.x) + 2 * u * (s.to.x - this._plumeMid.x),
        2 * omu * (this._plumeMid.y - s.from.y) + 2 * u * (s.to.y - this._plumeMid.y),
        2 * omu * (this._plumeMid.z - s.from.z) + 2 * u * (s.to.z - this._plumeMid.z),
      );
      if (this._plumeTan.lengthSq() < 1e-10) {
        this._plumeTan.subVectors(s.to, s.from);
      }
      this.aimMagePlumeAlong(s.root, this._plumeTan, s.spin * s.t);

      // Mild pulse — do not crush long-axis read (was 0.85–1.3 and looked soft)
      const pulse = 0.95 + Math.sin(u * Math.PI) * 0.22;
      s.root.scale.setScalar(pulse);

      // Twister push while approaching
      if (u >= 0.45 && s.target) {
        const away = s.target.position.clone().sub(this.shipGroup.position);
        away.y = 0;
        if (away.lengthSq() > 1e-6) away.normalize();
        else away.set(1, 0, 0);
        s.target.position.addScaledVector(away, dt * 7.5);
        s.target.scale.multiplyScalar(Math.max(0.02, 1 - dt * 2.1));
      }

      if (u >= 0.92 && s.willHit && !s.hitFired) {
        s.hitFired = true;
        s.onHit?.(s.root.position.clone());
        if (s.target) s.target.visible = false;
      }

      if (u >= 1) {
        this.disposeMagePlumeRoot(s.root);
        this.magePlumes.splice(i, 1);
      }
    }
  }

  /** Begin cyclone lifecycle: tiny on water, far from hull, then grow + drive in. */
  private spawnCycloneLifecycle(): void {
    this.twisterDead = false;
    const ship = this.shipGroup.position;
    for (let i = 0; i < this.cycloneActors.length; i++) {
      const a = this.cycloneActors[i];
      const ang = Math.PI * 0.35 + i * 2.15 + Math.random() * 0.4;
      const dist = 22 + i * 5 + Math.random() * 3;
      a.spawn.set(ship.x + Math.cos(ang) * dist, 0.02, ship.z + Math.sin(ang) * dist);
      a.ang = ang;
      a.radius = dist;
      a.grow = 0.04;
      a.age = -i * 0.55;
      a.phase = 'spawn';
      a.root.position.copy(a.spawn);
      a.root.scale.setScalar(a.baseScale * 0.04);
      a.root.visible = false;
      a.root.rotation.set(0, ang, 0);
    }
    console.info('[cinema] cyclones spawn lifecycle x' + this.cycloneActors.length);
  }

  /** Spawn → grow → advance on boat; materials spin via tickWaterCyclone. */
  private updateTwisterMotion(dt: number): void {
    if (
      this.twisterDead &&
      this.cycloneActors.every((c) => c.phase === 'dead' || c.phase === 'idle')
    ) {
      this.updateWindBursts(dt);
      return;
    }
    this.twisterOrbitT += dt;
    const ship = this.shipGroup.position;
    for (const a of this.cycloneActors) {
      if (a.phase === 'idle' || a.phase === 'dead') {
        if (a.phase === 'dead') a.root.visible = false;
        continue;
      }
      a.age += dt;
      if (a.age < 0) continue;
      a.root.visible = true;

      if (a.phase === 'spawn' || a.phase === 'grow') {
        a.grow = Math.min(1, a.grow + dt * 0.36);
        if (a.grow >= 0.55) a.phase = 'grow';
        if (a.grow >= 0.98) a.phase = 'advance';
      }

      const pull = a.phase === 'advance' ? 0.22 : 0.06;
      a.radius = Math.max(3.5, a.radius - dt * (2.8 + pull * 8));
      a.ang += dt * (0.45 + (1 - a.grow) * 0.2);
      a.root.position.x = THREE.MathUtils.lerp(
        a.root.position.x,
        ship.x + Math.cos(a.ang) * a.radius,
        Math.min(1, dt * 2.2),
      );
      a.root.position.z = THREE.MathUtils.lerp(
        a.root.position.z,
        ship.z + Math.sin(a.ang) * a.radius,
        Math.min(1, dt * 2.2),
      );
      a.root.position.y = 0.04 + a.grow * 0.15;
      const s = a.baseScale * (0.05 + a.grow * 0.95);
      a.root.scale.setScalar(s);
      a.root.rotation.y += dt * a.spin * (0.6 + a.grow);

      if (a.phase === 'kill') {
        a.grow = Math.max(0, a.grow - dt * 2.8);
        a.root.scale.setScalar(a.baseScale * Math.max(0.02, a.grow));
        a.root.position.y += dt * 2.5;
        if (a.grow <= 0.05) {
          a.phase = 'dead';
          a.root.visible = false;
        }
      }
    }
    this.updateWindBursts(dt);
  }

  /** Wind / spray explosion when a cyclone is destroyed. */
  private spawnWindBurst(at: THREE.Vector3): void {
    const n = 140;
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = at.x;
      pos[i * 3 + 1] = at.y + 0.4;
      pos[i * 3 + 2] = at.z;
      const th = Math.random() * Math.PI * 2;
      const sp = 4 + Math.random() * 12;
      vel[i * 3] = Math.cos(th) * sp;
      vel[i * 3 + 1] = 3 + Math.random() * 10;
      vel[i * 3 + 2] = Math.sin(th) * sp;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xb8e8ff,
      size: 0.35,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.name = 'cinema_wind_burst';
    this.scene.add(pts);
    this.windBursts.push({ pts, vel, life: 0.9, maxLife: 0.9 });
    /* wind burst — visual only, keep camera locked */
  }

  private updateWindBursts(dt: number): void {
    for (let i = this.windBursts.length - 1; i >= 0; i--) {
      const b = this.windBursts[i];
      b.life -= dt;
      const posAttr = b.pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let k = 0; k < arr.length / 3; k++) {
        b.vel[k * 3 + 1] -= 9 * dt;
        arr[k * 3] += b.vel[k * 3] * dt;
        arr[k * 3 + 1] += b.vel[k * 3 + 1] * dt;
        arr[k * 3 + 2] += b.vel[k * 3 + 2] * dt;
        b.vel[k * 3] *= 1 - dt * 0.8;
        b.vel[k * 3 + 2] *= 1 - dt * 0.8;
      }
      posAttr.needsUpdate = true;
      const mat = b.pts.material as THREE.PointsMaterial;
      mat.opacity = Math.max(0, b.life / b.maxLife);
      mat.size = 0.2 + (b.life / b.maxLife) * 0.35;
      if (b.life <= 0) {
        this.scene.remove(b.pts);
        b.pts.geometry.dispose();
        mat.dispose();
        this.windBursts.splice(i, 1);
      }
    }
  }

  /** Kill all active cyclones with wind explosions (mage counter). */
  private killCyclonesWithWind(): void {
    for (const a of this.cycloneActors) {
      if (a.phase === 'idle' || a.phase === 'dead') continue;
      a.phase = 'kill';
      this.spawnWindBurst(a.root.position.clone().add(new THREE.Vector3(0, 1.2 * a.grow, 0)));
    }
    this.twisterDead = true;
  }

  private updateIkMarkers(): void {
    // Leviathan head / mouth â€” bone first, then bounds (mouth toward ship)
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
    // Deck center tracks live ship deck (shield / beam aim)
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

  /** Prefer kuchi (JP mouth) / jaw / head for dragon beam origin. */
  private findLeviMouthBone(root: THREE.Object3D): THREE.Object3D | null {
    const prefer = [
      /kuchi/i, // this GLB: kuchi_012
      /mouth/i,
      /jaw/i,
      /maw/i,
      /atama/i, // head
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

  /**
   * Sample impact points on the ship-wide shield surface facing the leviathan.
   * Fireballs / beam bounce aim here â€” not per-mage bubbles.
   */
  private sampleShipShieldHitPoints(
    mouth: THREE.Vector3,
    deck: THREE.Vector3,
  ): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    if (!this.shipShield || !this.shipShield.visible || this.shieldShattered) {
      pts.push(deck.clone());
      return pts;
    }
    // Beam STOPS on pro4ik shield face (5 m off deck) — primary + ring of bounce points
    const center = new THREE.Vector3();
    this.shipShield.getWorldPosition(center);
    const baseR = (this.shipShield.userData.radiusM as number) || 2.2;
    const toward = mouth.clone().sub(center);
    if (toward.lengthSq() < 1e-6) toward.set(0, 0, 1);
    else toward.normalize();
    // Front face toward maw (impact plate)
    pts.push(center.clone().addScaledVector(toward, baseR * 0.35));
    const side = new THREE.Vector3(-toward.z, 0, toward.x).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    pts.push(center.clone().addScaledVector(side, baseR * 0.7).addScaledVector(up, 0.4));
    pts.push(center.clone().addScaledVector(side, -baseR * 0.7).addScaledVector(up, 0.4));
    pts.push(center.clone().addScaledVector(up, baseR * 0.85));
    pts.push(center.clone().addScaledVector(up, -baseR * 0.35));
    return pts;
  }

  /** Live mouth world position — kuchi bone preferred, then stage IK empty. */
  private getLeviMouthWorld(out = new THREE.Vector3()): THREE.Vector3 {
    const bone = this.leviAnim?.mouthBone ?? this.leviMouthBone;
    if (bone) {
      bone.updateWorldMatrix(true, false);
      bone.getWorldPosition(out);
      // Nudge from maw toward boat so beam leaves the open jaw (kuchi)
      const boat = this.shipGroup.position;
      const dir = boat.clone().sub(out);
      if (dir.lengthSq() > 1e-6) {
        dir.normalize();
        out.addScaledVector(dir, 0.85);
      }
      return out;
    }
    return this.stage.worldPos('ik_levi_mouth', out);
  }

  /**
   * Dragon phase vs levi performance:
   *   charge mode — ping-pong attack/roar at 1.0↔1.45 (charged maw) + shake
   *   snap        — brief open into charge window
   *   blast       — beam from kuchi while charge loop holds
   *   aftermath   — full attack clip to release
   */
  private resolveAnimDrivenDragonPhase(scriptPhase: DragonBeamPhase): {
    phase: DragonBeamPhase;
    chargeU: number;
    blastU: number;
  } {
    if (scriptPhase === 'off') return { phase: 'off', chargeU: 0, blastU: 0 };

    // Charge ping-pong: beam origin locked to open maw (kuchi) while scrubbing 1.0–1.45
    if (this.leviAnim?.isChargeWindow()) {
      const maw = this.leviAnim.getMawOpenU();
      const age = Math.max(0, this.elapsed - this.dragonPhaseStart);
      if (scriptPhase === 'snap' || age < LeviathanOceanCinema.MOUTH_OPEN_SEC) {
        return {
          phase: 'snap',
          chargeU: 0.25 + maw * 0.55,
          blastU: 0,
        };
      }
      if (scriptPhase === 'charge') {
        return {
          phase: 'charge',
          chargeU: 0.55 + maw * 0.45,
          blastU: 0.05 + maw * 0.12,
        };
      }
      // blast / default while still in charge window
      return {
        phase: 'blast',
        chargeU: 1,
        blastU: 0.65 + maw * 0.35,
      };
    }

    const dir = this.leviDirector;
    if (!dir || !dir.isPlayingAttack()) {
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
    const mouthOpen = Math.min(LEVI_CHARGE_T0, LeviathanOceanCinema.MOUTH_OPEN_SEC);
    const beamEnd = LeviathanOceanCinema.BEAM_END_PROGRESS;

    if (t < mouthOpen) {
      return {
        phase: 'snap',
        chargeU: 0.2 + (t / Math.max(1e-3, mouthOpen)) * 0.5,
        blastU: 0,
      };
    }
    if (progress < beamEnd) {
      const beamSpan = Math.max(1e-3, beamEnd * dur - mouthOpen);
      const beamU = THREE.MathUtils.clamp((t - mouthOpen) / beamSpan, 0, 1);
      return {
        phase: 'blast',
        chargeU: 1,
        blastU: 0.55 + beamU * 0.45,
      };
    }
    const tail = THREE.MathUtils.clamp((progress - beamEnd) / (1 - beamEnd), 0, 1);
    return {
      phase: 'aftermath',
      chargeU: Math.max(0, 0.35 * (1 - tail)),
      blastU: Math.max(0, 0.2 * (1 - tail * 2)),
    };
  }

  /** Legacy thin beam fallback — also stops on shield when ward is up. */
  private updateBeam(): void {
    if (!this.fireBeam?.visible) return;
    const mouth = this.getLeviMouthWorld();
    const target = this.getBeamTargetWorld();
    const mid = mouth.clone().lerp(target, 0.5);
    const dist = Math.max(0.5, mouth.distanceTo(target));
    this.fireBeam.position.copy(mid);
    this.fireBeam.scale.set(1, dist, 1);
    this.fireBeam.lookAt(target);
    this.fireBeam.rotateX(Math.PI / 2);
  }

  /**
   * Dragon beam mouth → pro4ik shield (5 m off deck) until shatter, then deck.
   * Charge anim is idle+attack/roar 1.0↔1.45 for both first and second beams.
   */
  private updateDragonVfx(dt: number, beat: CinBattleBeat): void {
    if (!this.dragonVfx) return;

    // Sync IK mouth empty from live bone so beam + casters aim correctly
    this.syncLeviMouthIk();
    // Keep ward 5 m off deck facing maw
    if (this.shipShield?.visible && !this.shieldShattered) {
      this.updateShipShieldPose();
    }

    const scriptPhase = this.dragonPhase;
    if (scriptPhase === 'off' && !beat.dragonPhase && !beat.fireBeam) {
      this.dragonVfx.update({
        mouth: this.getLeviMouthWorld(),
        target: this.getBeamTargetWorld(),
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
    // Beam STOPS on pro4ik shield (5 m off deck) while ward is up
    const beamTarget = this.getBeamTargetWorld();

    // Bounce points on the shield face (or deck once shattered)
    const shieldPoints = this.sampleShipShieldHitPoints(mouth, deck);

    this.dragonVfx.update({
      mouth,
      target: beamTarget,
      shieldPoints,
      leviathanRoot: this.leviathanRoot,
      phase: driven.phase,
      chargeU: driven.chargeU,
      blastU: driven.blastU,
      dt,
      elapsed: this.elapsed,
      storm: this.stormCur,
      beamStopsAtShield: !!(this.shipShield?.visible && !this.shieldShattered),
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
   * Couple leviathan Y + pitch/roll to ocean swell; track speed for spray.
   * Stage location Y is SSOT base; swell/tilt make the body feel heavy in water.
   */
  private updateLeviathanWaterCoupling(beat: CinBattleBeat): number {
    if (!this.leviathanRoot.visible) return -12;
    const leviAt = beat.actors.leviathan?.at ?? '';
    const def = leviAt ? this.stage.def(leviAt) : null;
    const baseY = def?.position.y ?? this.leviathanRoot.position.y;
    const x = this.leviathanRoot.position.x;
    const z = this.leviathanRoot.position.z;

    const surfaceBias = surfaceBiasFromLeviAt(leviAt);

    // Lateral heave while swimming â€” side-to-side power strokes
    if (surfaceBias < 0 && !beat.leviChannelLock) {
      const heave = Math.sin(this.elapsed * 0.85) * (1.1 + this.stormCur * 0.6);
      const surge = Math.sin(this.elapsed * 0.55 + 1.2) * 0.55;
      if (def) {
        this.leviathanRoot.position.x = THREE.MathUtils.lerp(
          this.leviathanRoot.position.x,
          def.position.x + heave,
          0.08,
        );
        this.leviathanRoot.position.z = THREE.MathUtils.lerp(
          this.leviathanRoot.position.z,
          def.position.z + surge,
          0.08,
        );
      }
    }

    // Scripted path Y (soft) then HARD constraint: bottom â‰¥20% always under waterline
    const pathY = leviathanWaterY(baseY, x, z, this.elapsed, this.stormCur, surfaceBias);
    const lerpK = surfaceBias > 3 ? 0.28 : surfaceBias < -2 ? 0.12 : 0.2;
    this.leviathanRoot.position.y = THREE.MathUtils.lerp(
      this.leviathanRoot.position.y,
      pathY,
      lerpK,
    );

    // Wave-slope pitch/roll (yaw still faceYawToward boat) â€” before submerge snap
    const tilt = leviathanWaveTilt(x, z, this.elapsed, this.stormCur, surfaceBias);
    this.leviathanRoot.rotation.x = THREE.MathUtils.lerp(
      this.leviathanRoot.rotation.x,
      tilt.pitch,
      0.12,
    );
    this.leviathanRoot.rotation.z = THREE.MathUtils.lerp(
      this.leviathanRoot.rotation.z,
      tilt.roll,
      0.12,
    );

    const oceanY = sampleCinemaWaterY(x, z, this.elapsed, this.stormCur, 1.55);
    // Final law: bottom â‰¥ LEVI_MIN_SUBMERGE_FRAC (20%) always in water when visible
    enforceLeviathanSubmerge(this.leviathanRoot, this.leviathan, oceanY, surfaceBias);

    // Speed + forward for spray bias
    const dx = this.leviathanRoot.position.x - this.lastLeviPos.x;
    const dz = this.leviathanRoot.position.z - this.lastLeviPos.z;
    const dy = this.leviathanRoot.position.y - this.lastLeviPos.y;
    const dist = Math.hypot(dx, dy, dz);
    this.leviSpeedMps = THREE.MathUtils.lerp(this.leviSpeedMps, dist * 30, 0.15);
    this.leviForward.set(dx, 0, dz);
    if (this.leviForward.lengthSq() < 1e-6) {
      this.leviForward
        .set(
          this.shipGroup.position.x - this.leviathanRoot.position.x,
          0,
          this.shipGroup.position.z - this.leviathanRoot.position.z,
        )
        .normalize();
    } else {
      this.leviForward.normalize();
    }
    this.lastLeviPos.copy(this.leviathanRoot.position);

    // Material split + wetness driven by live waterline
    updateLeviathanWaterlineUniforms(this.leviathan, oceanY, this.stormCur);
    const wet =
      surfaceBias < 0
        ? 0.95
        : surfaceBias < 2
          ? 0.85
          : THREE.MathUtils.clamp(0.55 + (1 - Math.min(1, surfaceBias / 6)) * 0.35, 0.5, 0.9);
    applyLeviathanWetness(this.leviathan, wet);
    this.lastLeviSurfaceBias = surfaceBias;
    return surfaceBias;
  }

  /**
   * Always re-apply bottom-20% submerge + waterline shader after any Y write
   * (channel lock, stage place, path lerp).
   */
  private finalizeLeviathanInWater(surfaceBias: number): void {
    if (!this.leviathanRoot.visible) return;
    const x = this.leviathanRoot.position.x;
    const z = this.leviathanRoot.position.z;
    const oceanY = sampleCinemaWaterY(x, z, this.elapsed, this.stormCur, 1.55);
    enforceLeviathanSubmerge(this.leviathanRoot, this.leviathan, oceanY, surfaceBias);
    updateLeviathanWaterlineUniforms(this.leviathan, oceanY, this.stormCur);
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

    // Storm â€” OceanShader uniforms (uStormIntensity, not toy uStorm)
    this.stormCur += ((beat.storm ?? 0.5) - this.stormCur) * Math.min(1, dt * 1.5);
    if (this.waterMat) {
      this.waterMat.uniforms.uTime.value = this.elapsed;
      if (this.waterMat.uniforms.uStormIntensity) {
        this.waterMat.uniforms.uStormIntensity.value = this.stormCur;
      }
      if (this.waterMat.uniforms.uWaveHeight) {
        // Base Gerstner height; +50% while water twisters are active
        const baseH = 1.1 + this.stormCur * 0.9;
        const twistersUp =
          !this.twisterDead && (!!beat.tornado || !!beat.whirlpools);
        this.waterMat.uniforms.uWaveHeight.value = baseH * (twistersUp ? 1.5 : 1);
      }
    }
    this.flash *= Math.exp(-dt * 5);
    if (this.stormCur > 0.55 && Math.random() < dt * 0.3 * this.stormCur) {
      this.flash = 0.5;
    }
    this.dirLight.intensity = 0.72 + this.flash * 2.4 + this.stormCur * 0.08;
    // Storm key: slightly cyan-cool moonlight vs warm noon
    this.dirLight.color.setRGB(
      0.95 - this.stormCur * 0.12,
      0.92 - this.stormCur * 0.05,
      0.88 + this.stormCur * 0.1,
    );

    // Ship bob + roll + beam blowback (casters parented â†’ ride deck)
    this.blowbackT = Math.max(0, this.blowbackT - dt);
    const blow = this.blowbackT > 0 ? Math.sin(this.elapsed * 22) * this.blowbackT * 0.12 : 0;
    const bob = Math.sin(this.elapsed * 1.5) * (0.22 + this.stormCur * 0.45);
    const roll =
      Math.sin(this.elapsed * 0.9) * (beat.shipRoll ?? 0.1) + blow * 1.4;
    const pitch =
      Math.sin(this.elapsed * 1.1) * (beat.shipPitch ?? 0.05) + blow * 0.6;
    // Soft sink when multi-state hull is damaged/sinking
    if (this.shipMultiState) {
      const sinkTarget =
        this.shipHullState === 'sinking' ? 2.4 : this.shipHullState === 'damaged' ? 0.45 : 0;
      this.shipSinkY = THREE.MathUtils.lerp(this.shipSinkY, sinkTarget, Math.min(1, dt * 0.55));
    }
    this.shipGroup.position.y = bob - this.shipSinkY;
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
    // Merge crossfade: first → middle (damage) → last (sinking on explosion)
    this.updateShipBlend(dt);
    this.updateShipSailIn(dt, beat);
    this.faceMagesTowardLevi(dt);
    this.updateChaseEscape(dt, beat);

    // Ship-wide shield pulse (only while visible / blocking)
    this.shieldImpactFlash = Math.max(0, this.shieldImpactFlash - dt * 2.2);
    tickForceField(
      this.shipShield,
      this.elapsed,
      !!this.shipShield?.visible && !this.pinataFired,
      this.shieldImpactFlash,
    );
    this.updateVfxTimers(dt);

    // Megumin mixer (must run every frame while visible)
    this.tickMegumin(dt);

    // Screen-right mage exit + shield/ship debris
    if (this.fleeingMages.length) this.updateFleeingMages(dt);
    if (this.pinataPieces.length || this.explosionBurst) this.updatePinata(dt);

    // Leviathan: yaw boat, path + ALWAYS bottom 20% under waterline + waterline shader
    let surfaceBias = this.lastLeviSurfaceBias;
    if (this.leviathanRoot.visible) {
      faceYawToward(this.leviathanRoot, this.shipGroup.position);
      // Continuous rise / path toward stage target (opener out of water)
      if (this.leviHasTarget && !beat.leviChannelLock && this.dragonPhase !== 'snap') {
        const k = Math.min(1, dt * this.leviPathSmooth);
        this.leviathanRoot.position.x = THREE.MathUtils.lerp(
          this.leviathanRoot.position.x,
          this.leviTargetPos.x,
          k,
        );
        this.leviathanRoot.position.z = THREE.MathUtils.lerp(
          this.leviathanRoot.position.z,
          this.leviTargetPos.z,
          k,
        );
        // Beyond rocks under water → surface. Swim clip only while still deep.
        const at = beat.actors.leviathan?.at ?? '';
        if (/hidden|swim/i.test(at)) {
          this.leviRiseU = Math.min(0.15, this.leviRiseU + dt * 0.08); // stay deep, creep in
        } else if (/rise|approach/i.test(at)) {
          this.leviRiseU = Math.min(1, this.leviRiseU + dt * 0.28);
        } else if (/surface|cast|beam|breach|twister|ward|dive/i.test(at)) {
          this.leviRiseU = Math.min(1, this.leviRiseU + dt * 0.4);
        }
        // Stage already places Y; blend from deep under toward marker Y
        const deepY = Math.min(this.leviTargetPos.y, -18);
        const surfaceY = this.leviTargetPos.y;
        const riseY = THREE.MathUtils.lerp(
          deepY,
          surfaceY,
          this.leviRiseU * this.leviRiseU * (3 - 2 * this.leviRiseU),
        );
        this.leviathanRoot.position.y = THREE.MathUtils.lerp(
          this.leviathanRoot.position.y,
          riseY,
          k * 0.9,
        );
        const wantPitch = THREE.MathUtils.lerp(this.leviRisePitch, 0, this.leviRiseU);
        this.leviathanRoot.rotation.x = THREE.MathUtils.lerp(
          this.leviathanRoot.rotation.x,
          wantPitch,
          k * 0.65,
        );
      }
      if (beat.leviChannelLock || this.dragonPhase === 'snap') {
        if (!this.leviChannelLockPos) {
          this.leviChannelLockPos = this.leviathanRoot.position.clone();
        }
        this.leviathanRoot.position.x = this.leviChannelLockPos.x;
        this.leviathanRoot.position.z = this.leviChannelLockPos.z;
        // Soft hold then waterline re-snap (belly stays wet)
        this.leviathanRoot.position.y = THREE.MathUtils.lerp(
          this.leviathanRoot.position.y,
          this.leviChannelLockPos.y,
          0.2,
        );
        surfaceBias = surfaceBiasFromLeviAt(beat.actors.leviathan?.at ?? 'levi_beam');
        this.lastLeviSurfaceBias = surfaceBias;
        this.finalizeLeviathanInWater(surfaceBias);
      } else {
        if (this.dragonPhase === 'blast' || this.dragonPhase === 'aftermath') {
          this.leviChannelLockPos = null;
        }
        surfaceBias = this.updateLeviathanWaterCoupling(beat);
      }
      // Safety: every visible frame re-enforce min submerge (stage place can't pull dry)
      this.finalizeLeviathanInWater(surfaceBias);
      this.spineIk.aimAtObject('leviathan', this.stage.get('ik_ship_deck_center'), 0.8, 0);
    }

    this.updateTwisterMotion(dt);
    this.updateSpellSplines(dt);
    this.updateIceSnakes(dt, beat);
    this.ensureBoatVisible();
    this.updateHeroThrow(dt);
    this.updateRagdollInWater(dt);
    // blizzard VFX off (perf)
    this.waterSplash?.update(
      dt,
      this.leviathanRoot.position,
      surfaceBias,
      this.stormCur,
      this.leviathanRoot.visible,
      this.leviForward,
      this.leviSpeedMps,
    );
    // Water cyclones — foam UV spin (per active actor)
    for (const a of this.cycloneActors) {
      if (a.root.visible) tickWaterCyclone(a.root, dt, this.elapsed);
    }

    // 1) Mixers FIRST (Bip001 cast/idle — rotation-only, feet stay planted)
    this.leviDirector?.update(dt);
    // Charge scrub + eel S-wave + maw shake AFTER mixer writes bones
    this.leviAnim?.update(dt);
    for (const d of this.mageDirectors) d.update(dt);
    this.fluidMixer?.update(dt);

    // 2) IK empties + soft upper-body aim toward levi (quat multiply, no euler +=)
    this.updateIkMarkers();
    // Keep levi mouth (kuchi) empty live for beam + mage look-at
    this.syncLeviMouthIk();
    this.spineIk.updateAll({ smooth: 0.14, maxYawDeg: 40, maxPitchDeg: 22 });

    // 3) Dragon beam
    this.updateDragonVfx(dt, beat);
    this.updateBeam();

    // Movie camera (sole owner) — locked masters, soft ship ride, almost no handheld
    this.refreshShipLinkedCamera();
    this.multiCam.update(dt);
    // Handheld only on true wreck moments — never constant storm shake/spin
    const handheld =
      beat.shipPinata || beat.id === 'breach' ? 0.035 : beat.shieldShatter ? 0.02 : 0;
    const cam = this.multiCam.evaluate(handheld, this.elapsed);
    this.camera.position.copy(cam.pos);
    this.camera.lookAt(cam.look);
    this.camera.fov = cam.fov;
    this.camera.updateProjectionMatrix();
    this.updateStormSky(dt, beat);
    this.updateUnderwaterSet(dt, beat);

    // Film grade (exposure + post bloom/tint/vignette)
    const blackT = beat.blackout ?? 0;
    this.blackoutCur += (blackT - this.blackoutCur) * 0.08;
    this.renderer.toneMappingExposure =
      (beat.exposure ?? 0.95) * (1 - this.blackoutCur * 0.85);
    if (this.scene.fog instanceof THREE.FogExp2) {
      // Horizon-matched fog (cosmic night uHorizon-ish) so water→sky seam softens
      this.scene.fog.density =
        (beat.fogDensity ?? 0.008) + this.stormCur * 0.0025 + this.blackoutCur * 0.012;
      const fogMix = 0.3 + this.stormCur * 0.22;
      // Cool indigo-night fog (matches nebula horizon)
      this.scene.fog.color.setRGB(
        0.04 + fogMix * 0.05 + this.blackoutCur * 0.02,
        0.07 + fogMix * 0.08,
        0.12 + fogMix * 0.14,
      );
      this.scene.background = this.scene.fog.color.clone().multiplyScalar(0.55);
    }

    // Smooth post toward beat targets (film, not snap)
    if (this.post) {
      this.post.update(dt);
      const actionHot =
        !!beat.fireBeam ||
        beat.dragonPhase === 'blast' ||
        !!beat.shipPinata ||
        !!beat.shieldShatter;
      const quiet = beat.id === 'establish' || beat.id === 'shadow' || beat.id === 'logo' || beat.id === 'black';
      const targetBloom = THREE.MathUtils.clamp(
        (this.bloomCur || 0.35) * (quiet ? 0.32 : 0.48) +
          (actionHot ? 0.28 : 0) +
          this.flash * 0.35,
        0.1,
        0.95,
      );
      this._bloomSmoothed = THREE.MathUtils.lerp(this._bloomSmoothed, targetBloom, Math.min(1, dt * 2.2));
      // Grain/chroma rise slightly on impact; calm on masters
      const grain = quiet ? 0.035 : actionHot ? 0.07 : 0.05;
      const chroma = quiet ? 0.0005 : actionHot ? 0.00135 : 0.00085;
      const sat = quiet ? 0.98 : actionHot ? 1.08 : 1.03;
      this.post.applyFilmLook({
        bloom: this._bloomSmoothed,
        bloomRadius: 0.42 + (beat.bloom ?? 0.3) * 0.2,
        bloomThreshold: actionHot ? 0.58 : 0.78,
        tint: this.filmTintCur,
        vignette: THREE.MathUtils.clamp(this.filmVigCur + this.blackoutCur * 0.28, 0.25, 0.72),
        contrast: this.filmContrastCur,
        saturation: sat,
        grain,
        chroma,
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

  /**
   * QA jump: `?seek=29` / `?t=29` to jump near defeat sequence without waiting full open.
   * Applies nearest battle beat immediately so ward shatter / pinata can be reviewed.
   */
  seekTo(seconds: number): void {
    const t = Math.max(0, Math.min(LEVIATHAN_BATTLE_DURATION_SEC - 0.05, seconds));
    this.elapsed = t;
    // Reset one-shot flags so seek into defeat re-fires pinata/shield
    if (t < 36.0) {
      this.shieldShattered = false;
      this.pinataFired = false;
      this.launchCamLocked = false;
    }
    // Hull material state at seek
    if (this.shipMultiState) {
      let want: 'intact' | 'damaged' | 'sinking' = 'intact';
      if (t >= 38.4 || this.pinataFired) want = 'sinking';
      else if (t >= 30.8) want = 'damaged'; // post-shield ram / second act
      this.snapShipHullState(want);
      // First beam ends ~29.4s with shield shatter
      if (t >= 29.4) this.shieldShattered = true;
      else this.shieldShattered = false;
      if (this.intactShip) this.intactShip.visible = true;
    }
    // Refresh mage-plume hit budget when rewinding before combat climax
    if (t < 30) this.iceSnakeHitsLeft = 2;
    for (const s of this.magePlumes) this.disposeMagePlumeRoot(s.root);
    this.magePlumes = [];
    this.iceSnakeCd = 0;
    // Snap sail path so mid-fight seeks don't leave the ship mid-ocean
    if (this.shipSailFrom.lengthSq() > 0 || this.shipSailTo.lengthSq() > 0) {
      if (t < this.shipSailUntilSec) {
        const u = THREE.MathUtils.clamp(t / this.shipSailUntilSec, 0, 1);
        const e = u * u * (3 - 2 * u);
        const e2 = 1 - Math.pow(1 - e, 1.35);
        this.shipGroup.position.x = THREE.MathUtils.lerp(
          this.shipSailFrom.x,
          this.shipSailTo.x,
          e2,
        );
        this.shipGroup.position.z = THREE.MathUtils.lerp(
          this.shipSailFrom.z,
          this.shipSailTo.z,
          e2,
        );
        this.shipSailActive = true;
      } else {
        this.shipGroup.position.x = this.shipSailTo.x;
        this.shipGroup.position.z = this.shipSailTo.z;
        this.shipSailActive = false;
      }
    }
    const { idx } = battleBeatAt(this.elapsed);
    this.beatIdx = -1;
    this.applyBeat(idx, true);
    this.cbs.onProgress?.(
      Math.min(1, this.elapsed / LEVIATHAN_BATTLE_DURATION_SEC),
      this.elapsed,
    );
    console.info(`[cinema] seekTo ${t.toFixed(1)}s → beat ${idx}`);
  }

  isReady(): boolean {
    return this.ready;
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs?.disconnect();
    this.shipBlend = null;
    this.shipHulls = { intact: null, damaged: null, sinking: null };
    this.shipHullState = 'intact';
    this.shipSinkY = 0;
    this.leviAnim?.dispose();
    this.leviAnim = null;
    this.leviDirector?.dispose();
    for (const d of this.mageDirectors) d.dispose();
    this.mageDirectors = [];
    this.mageClips = [];
    this.fleeingMages = [];
    for (const m of this.deckMages) {
      m.removeFromParent();
    }
    this.deckMages = [];
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
    this.shipShield = null;
    if (this.meguminRoot) this.meguminRoot.visible = false;
    this.meguminMixer?.stopAllAction();
    this.meguminMixer = null;
    this.meguminClips = [];
    this.meguminRoot = null;
    this.meguminHideT = 0;
    this.meguminLockedScale = 1;
    this.fluidMixer?.stopAllAction();
    this.fluidMixer = null;
    this.dragonVfx?.dispose();
    this.dragonVfx = null;
    this.waterSplash?.dispose();
    this.waterSplash = null;
    if (this.skyDome) {
      this.scene.remove(this.skyDome);
      this.skyDome.geometry.dispose();
      this.skyMat?.dispose();
      this.skyDome = null;
      this.skyMat = null;
    }
    if (this.moonMesh) {
      this.scene.remove(this.moonMesh);
      this.moonMesh.geometry.dispose();
      (this.moonMesh.material as THREE.Material).dispose();
      this.moonMesh = null;
    }
    if (this.moonGlow) {
      this.scene.remove(this.moonGlow);
      this.moonGlow.geometry.dispose();
      (this.moonGlow.material as THREE.Material).dispose();
      this.moonGlow = null;
    }
    if (this.oceanFloor) {
      this.scene.remove(this.oceanFloor);
      this.oceanFloor = null;
    }
    for (const f of this.fishSchools) this.scene.remove(f);
    this.fishSchools = [];
    for (const m of this.fishMixers) m.stopAllAction();
    this.fishMixers = [];
    for (const c of this.cycloneClones) this.scene.remove(c);
    this.cycloneClones = [];
    this.cycloneActors = [];
    for (const b of this.windBursts) {
      this.scene.remove(b.pts);
      b.pts.geometry.dispose();
      (b.pts.material as THREE.Material).dispose();
    }
    this.windBursts = [];
    for (const s of this.magePlumes) this.disposeMagePlumeRoot(s.root);
    this.magePlumes = [];
    this.blizzard?.dispose();
    this.blizzard = null;
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