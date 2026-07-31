/**
 * LeviathanBattleScript — fully scripted battle timeline.
 *
 * Each beat assigns actors to stage UUIDs + spine IK look targets + anim hints.
 * Camera uses cam eye/look UUIDs. VFX flags are declarative (director executes).
 *
 * Cinema best practice: data owns the fight; tick only lerps / plays.
 */
import type { CinUuidKey, CinActorId } from '@shared/definitions/leviathanCinemaStage';

export type CinAnimHint =
  | 'idle'
  | 'attack'
  | 'attack and roar'
  | 'swim'
  | 'cast'
  | 'defend'
  | 'brace';

export type CinActorAssignment = {
  /** Stage location UUID key to occupy */
  at: CinUuidKey;
  /** Spine IK look-at location key (optional) */
  lookAt?: CinUuidKey;
  /** IK weight 0..1 */
  ikWeight?: number;
  /** Animation fuzzy hint */
  anim?: CinAnimHint;
  /** Mixer timeScale (roar slow-mo 0.42) */
  timeScale?: number;
  /**
   * When false, keep the current clip running (no reset) — only adjust timeScale.
   * Critical for dragon beam: one attack plays through mouth-open → beam → end,
   * BEFORE relocating to station 2 (finisher).
   */
  animRestart?: boolean;
  /** LoopOnce + clamp so attack completes once (beam sequence) */
  animOnce?: boolean;
  /** Visibility */
  visible?: boolean;
};

export type CinBattleBeat = {
  t: number;
  id: string;
  caption: string;
  sub: string;
  camEye: CinUuidKey;
  camLook: CinUuidKey;
  camMode?: 'blend' | 'cut';
  /** Scripted cast */
  actors: Partial<Record<Exclude<CinActorId, 'camera' | 'ship'>, CinActorAssignment>>;
  /** Atmosphere / VFX flags */
  storm?: number;
  shipRoll?: number;
  shipPitch?: number;
  shipIntact?: boolean;
  shipPinata?: boolean;
  rings?: boolean;
  fireBeam?: boolean;
  fireAura?: boolean;
  /**
   * Dragon beam attack cadence (moon-beam structure, fire palette):
   *   snap     — ~0.1s attack start + hot-hands flash
   *   charge   — pause; flame aura + fireballs gather at maw
   *   blast    — multi-layer dragon beam + shield bounce
   *   aftermath — residual heat / sparks
   */
  dragonPhase?: 'off' | 'snap' | 'charge' | 'blast' | 'aftermath';
  /** Hot hands at jaw (charge/blast) */
  hotHands?: boolean;
  /** Fireball orbs gather / launch */
  fireballs?: boolean;
  /** Flame aura ricochets off mage wards between boat and leviathan */
  shieldBounce?: boolean;
  shieldImpact?: boolean;
  shieldDefeat?: boolean;
  shipHit?: 'beam' | 'breach' | 'ram' | null;
  whirlpools?: boolean;
  skyLightning?: boolean;
  meguminMark?: boolean;
  stylizedBoom?: boolean;
  tornado?: boolean;
  /** Two mages fire spell splines that push/destroy water twisters */
  mageSplineKill?: boolean;
  /** Vertical glyph ward wall between boat and leviathan */
  wardWall?: boolean;
  /** Ship/deck blowback from beam hit */
  blowback?: boolean;
  /** Freeze leviathan root XZ for attack channel (0–0.1s static) */
  leviChannelLock?: boolean;
  hullFire?: boolean;
  exposure?: number;
  bloom?: number;
  fogDensity?: number;
  blackout?: number;
  logo?: boolean;
  underwater?: number;
  /** Hero locomotion mode for throw arc */
  heroMode?: 'deck' | 'brace' | 'throw' | 'air' | 'sink' | 'hidden';
};

/**
 * Production scripted battle (~56s).
 * Leviathan path + 4 mages + unarmed hero + multi-cam + spine IK look-ats.
 */
export const LEVIATHAN_BATTLE_SCRIPT: readonly CinBattleBeat[] = [
  {
    t: 0,
    id: 'establish',
    caption: 'WATERFALL ISLAND',
    sub: 'Four human mages hold the deck. The unarmed captain watches the deep.',
    camEye: 'cam_establish_eye',
    camLook: 'cam_establish_look',
    camMode: 'cut',
    storm: 0.4,
    shipRoll: 0.08,
    shipPitch: 0.05,
    shipIntact: true,
    heroMode: 'deck',
    underwater: 0.35,
    exposure: 0.88,
    bloom: 0.28,
    fogDensity: 0.01,
    actors: {
      leviathan: {
        at: 'levi_swim_a',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.2,
        anim: 'idle',
        timeScale: 1,
        visible: true,
      },
      mage_0: { at: 'deck_mage_0', lookAt: 'ik_levi_head', ikWeight: 0.35, anim: 'idle' },
      mage_1: { at: 'deck_mage_1', lookAt: 'ik_levi_head', ikWeight: 0.35, anim: 'idle' },
      mage_2: { at: 'deck_mage_2', lookAt: 'ik_levi_head', ikWeight: 0.35, anim: 'idle' },
      mage_3: { at: 'deck_mage_3', lookAt: 'ik_levi_head', ikWeight: 0.35, anim: 'idle' },
      hero: { at: 'deck_hero', lookAt: 'ik_levi_head', ikWeight: 0.4, anim: 'idle' },
    },
  },
  {
    t: 3.5,
    id: 'shadow',
    caption: 'SHADOW IN THE SWELL',
    sub: 'Through the water — a living shadow. Waves break over its back.',
    camEye: 'cam_under_eye',
    camLook: 'cam_under_look',
    camMode: 'blend',
    storm: 0.5,
    shipRoll: 0.1,
    shipIntact: true,
    heroMode: 'deck',
    underwater: 0.55,
    exposure: 0.82,
    bloom: 0.32,
    fogDensity: 0.014,
    actors: {
      leviathan: {
        at: 'levi_swim_b',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.3,
        anim: 'idle',
        visible: true,
      },
      mage_0: { at: 'deck_mage_0', lookAt: 'ik_levi_head', ikWeight: 0.5, anim: 'idle' },
      mage_1: { at: 'deck_mage_1', lookAt: 'ik_levi_head', ikWeight: 0.5, anim: 'idle' },
      mage_2: { at: 'deck_mage_2', lookAt: 'ik_levi_head', ikWeight: 0.5, anim: 'idle' },
      mage_3: { at: 'deck_mage_3', lookAt: 'ik_levi_head', ikWeight: 0.5, anim: 'idle' },
      hero: { at: 'deck_hero', lookAt: 'ik_levi_head', ikWeight: 0.55, anim: 'idle' },
    },
  },
  {
    t: 7,
    id: 'wards',
    caption: 'RAISE WARDS',
    sub: 'Four grudge6 human mages plant yin-yang rings — seals to the deep.',
    camEye: 'cam_deck_eye',
    camLook: 'cam_deck_look',
    camMode: 'cut',
    storm: 0.55,
    shipRoll: 0.12,
    shipIntact: true,
    heroMode: 'brace',
    rings: true,
    underwater: 0.15,
    exposure: 0.95,
    bloom: 0.42,
    fogDensity: 0.01,
    actors: {
      leviathan: {
        at: 'levi_swim_b',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.4,
        anim: 'idle',
        visible: true,
      },
      mage_0: { at: 'deck_mage_0', lookAt: 'ik_levi_head', ikWeight: 0.85, anim: 'cast' },
      mage_1: { at: 'deck_mage_1', lookAt: 'ik_levi_head', ikWeight: 0.85, anim: 'cast' },
      mage_2: { at: 'deck_mage_2', lookAt: 'ik_levi_head', ikWeight: 0.85, anim: 'cast' },
      mage_3: { at: 'deck_mage_3', lookAt: 'ik_levi_head', ikWeight: 0.85, anim: 'cast' },
      hero: { at: 'deck_hero', lookAt: 'ik_levi_head', ikWeight: 0.7, anim: 'brace' },
    },
  },
  {
    t: 11,
    id: 'surface',
    caption: 'SURFACE',
    sub: 'It rises idle over the hull. Twisters spiral. The air charges.',
    camEye: 'cam_surface_eye',
    camLook: 'cam_surface_look',
    camMode: 'blend',
    storm: 0.7,
    shipRoll: 0.18,
    shipIntact: true,
    heroMode: 'brace',
    rings: true,
    fireAura: true,
    wardWall: true,
    whirlpools: true,
    skyLightning: true,
    exposure: 1.0,
    bloom: 0.48,
    fogDensity: 0.011,
    actors: {
      leviathan: {
        at: 'levi_surface',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.55,
        anim: 'idle',
        visible: true,
      },
      mage_0: { at: 'deck_mage_0', lookAt: 'ik_levi_mouth', ikWeight: 0.9, anim: 'defend' },
      mage_1: { at: 'deck_mage_1', lookAt: 'ik_levi_mouth', ikWeight: 0.9, anim: 'defend' },
      mage_2: { at: 'deck_mage_2', lookAt: 'ik_levi_mouth', ikWeight: 0.9, anim: 'defend' },
      mage_3: { at: 'deck_mage_3', lookAt: 'ik_levi_mouth', ikWeight: 0.9, anim: 'defend' },
      hero: { at: 'deck_hero', lookAt: 'ik_levi_head', ikWeight: 0.8, anim: 'brace' },
    },
  },
  {
    t: 14.5,
    id: 'twisters_rise',
    caption: 'WATER TWISTERS',
    sub: 'Ocean cyclones spin toward the hull. The ward wall must hold.',
    camEye: 'cam_surface_eye',
    camLook: 'cam_surface_look',
    camMode: 'blend',
    storm: 0.78,
    shipRoll: 0.2,
    shipIntact: true,
    heroMode: 'brace',
    rings: true,
    wardWall: true,
    tornado: true,
    whirlpools: true,
    skyLightning: true,
    exposure: 1.0,
    bloom: 0.5,
    fogDensity: 0.012,
    actors: {
      leviathan: {
        at: 'levi_cast',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.55,
        anim: 'idle',
        timeScale: 1,
        visible: true,
      },
      mage_0: { at: 'deck_mage_0', lookAt: 'ik_levi_mouth', ikWeight: 0.9, anim: 'defend' },
      mage_1: { at: 'deck_mage_1', lookAt: 'ik_levi_mouth', ikWeight: 0.9, anim: 'defend' },
      mage_2: { at: 'deck_mage_2', lookAt: 'ik_levi_mouth', ikWeight: 0.9, anim: 'defend' },
      mage_3: { at: 'deck_mage_3', lookAt: 'ik_levi_mouth', ikWeight: 0.9, anim: 'defend' },
      hero: { at: 'deck_hero', lookAt: 'ik_levi_head', ikWeight: 0.8, anim: 'brace' },
    },
  },
  {
    t: 16.2,
    id: 'mage_spline_kill',
    caption: 'COUNTER-SPELL',
    sub: 'Two mages cast spell-splines — push the twisters apart and break them.',
    camEye: 'cam_cast_eye',
    camLook: 'cam_cast_look',
    camMode: 'cut',
    storm: 0.82,
    shipRoll: 0.22,
    shipIntact: true,
    heroMode: 'brace',
    rings: true,
    wardWall: true,
    tornado: true,
    mageSplineKill: true,
    skyLightning: true,
    exposure: 1.08,
    bloom: 0.62,
    fogDensity: 0.012,
    actors: {
      leviathan: {
        at: 'levi_cast',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.5,
        anim: 'idle',
        timeScale: 1,
        visible: true,
      },
      // Spline casters — attack toward twisters
      mage_0: { at: 'deck_mage_0', lookAt: 'vfx_tornado', ikWeight: 1, anim: 'cast' },
      mage_1: { at: 'deck_mage_1', lookAt: 'vfx_whirlpool_0', ikWeight: 1, anim: 'cast' },
      // Wall holders
      mage_2: { at: 'deck_mage_2', lookAt: 'ik_levi_mouth', ikWeight: 0.95, anim: 'defend' },
      mage_3: { at: 'deck_mage_3', lookAt: 'ik_levi_mouth', ikWeight: 0.95, anim: 'defend' },
      hero: { at: 'deck_hero', lookAt: 'ik_levi_mouth', ikWeight: 0.85, anim: 'brace' },
    },
  },
  /**
   * Dragon beam station 1 — 0–0.1s STATIC channel lock, then blast + blowback.
   */
  {
    t: 18.0,
    id: 'dragon_channel_lock',
    caption: 'CHANNEL',
    sub: '0.1s static — jaws locked on the boat. Attack channel. Then the beam.',
    camEye: 'cam_roar_eye',
    camLook: 'cam_roar_look',
    camMode: 'cut',
    storm: 0.9,
    shipRoll: 0.28,
    shipIntact: true,
    heroMode: 'brace',
    rings: true,
    wardWall: true,
    dragonPhase: 'snap',
    leviChannelLock: true,
    hotHands: true,
    fireAura: true,
    fireballs: true,
    exposure: 1.14,
    bloom: 0.75,
    fogDensity: 0.012,
    actors: {
      leviathan: {
        at: 'levi_beam',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.9,
        anim: 'attack',
        // Near-freeze after first frames — static channel pose
        timeScale: 0.02,
        animRestart: true,
        animOnce: true,
        visible: true,
      },
      mage_0: { at: 'deck_mage_0', lookAt: 'ik_levi_mouth', ikWeight: 1, anim: 'defend' },
      mage_1: { at: 'deck_mage_1', lookAt: 'ik_levi_mouth', ikWeight: 1, anim: 'defend' },
      mage_2: { at: 'deck_mage_2', lookAt: 'ik_levi_mouth', ikWeight: 1, anim: 'defend' },
      mage_3: { at: 'deck_mage_3', lookAt: 'ik_levi_mouth', ikWeight: 1, anim: 'defend' },
      hero: { at: 'deck_hero', lookAt: 'ik_levi_mouth', ikWeight: 0.95, anim: 'brace' },
    },
  },
  {
    t: 18.1,
    id: 'dragon_beam_blowback',
    caption: 'DRAGON BEAM',
    sub: 'Beam hits the ward wall — blowback rocks the deck. Hold the line.',
    // Side-quarter angle: levi maw FG-left, ward wall mid, boat right
    camEye: 'cam_roar_eye',
    camLook: 'cam_roar_look',
    camMode: 'cut',
    storm: 0.96,
    shipRoll: 0.55,
    shipPitch: 0.18,
    shipIntact: true,
    heroMode: 'brace',
    rings: true,
    wardWall: true,
    dragonPhase: 'blast',
    fireBeam: true,
    hotHands: true,
    fireAura: true,
    fireballs: true,
    shieldBounce: true,
    shieldImpact: true,
    blowback: true,
    meguminMark: true,
    shipHit: 'beam',
    hullFire: true,
    skyLightning: true,
    // Twisters already broken — keep off during beam read
    tornado: false,
    exposure: 1.32,
    bloom: 0.95,
    fogDensity: 0.014,
    actors: {
      leviathan: {
        at: 'levi_beam',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.95,
        anim: 'attack',
        timeScale: 0.75,
        animRestart: false,
        animOnce: true,
        visible: true,
      },
      mage_0: { at: 'deck_mage_0', lookAt: 'ik_levi_mouth', ikWeight: 1, anim: 'defend' },
      mage_1: { at: 'deck_mage_1', lookAt: 'ik_levi_mouth', ikWeight: 1, anim: 'defend' },
      mage_2: { at: 'deck_mage_2', lookAt: 'ik_levi_mouth', ikWeight: 1, anim: 'defend' },
      mage_3: { at: 'deck_mage_3', lookAt: 'ik_levi_mouth', ikWeight: 1, anim: 'defend' },
      hero: { at: 'deck_hero', lookAt: 'ik_levi_mouth', ikWeight: 0.95, anim: 'brace' },
    },
  },
  {
    t: 20.8,
    id: 'dragon_beam_tail',
    caption: 'WARDS STRAIN',
    sub: 'Beam still burning the wall. Blowback fades. Station 1 holds.',
    camEye: 'cam_deck_eye',
    camLook: 'cam_deck_look',
    camMode: 'blend',
    storm: 0.92,
    shipRoll: 0.38,
    shipPitch: 0.1,
    shipIntact: true,
    heroMode: 'brace',
    rings: true,
    wardWall: true,
    dragonPhase: 'blast',
    fireBeam: true,
    hotHands: true,
    fireAura: true,
    shieldBounce: true,
    blowback: true,
    hullFire: true,
    exposure: 1.18,
    bloom: 0.82,
    fogDensity: 0.013,
    actors: {
      leviathan: {
        at: 'levi_beam',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.9,
        anim: 'attack',
        timeScale: 0.85,
        animRestart: false,
        animOnce: true,
        visible: true,
      },
      mage_0: { at: 'deck_mage_0', lookAt: 'ik_levi_mouth', ikWeight: 1, anim: 'defend' },
      mage_1: { at: 'deck_mage_1', lookAt: 'ik_levi_mouth', ikWeight: 1, anim: 'defend' },
      mage_2: { at: 'deck_mage_2', lookAt: 'ik_levi_mouth', ikWeight: 1, anim: 'defend' },
      mage_3: { at: 'deck_mage_3', lookAt: 'ik_levi_mouth', ikWeight: 1, anim: 'defend' },
      hero: { at: 'deck_hero', lookAt: 'ik_levi_mouth', ikWeight: 0.9, anim: 'brace' },
    },
  },
  {
    t: 22.4,
    id: 'dragon_attack_finish',
    caption: 'ATTACK COMPLETES',
    sub: 'Beam dies. Attack finishes on station 1 — then it dives for the kill.',
    camEye: 'cam_cast_eye',
    camLook: 'cam_cast_look',
    camMode: 'blend',
    storm: 0.86,
    shipRoll: 0.24,
    shipIntact: true,
    heroMode: 'brace',
    rings: true,
    wardWall: true,
    dragonPhase: 'aftermath',
    fireAura: true,
    hullFire: true,
    shieldImpact: true,
    exposure: 1.02,
    bloom: 0.52,
    fogDensity: 0.012,
    actors: {
      leviathan: {
        at: 'levi_beam',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.6,
        anim: 'attack',
        timeScale: 1.0,
        animRestart: false,
        animOnce: true,
        visible: true,
      },
      mage_0: { at: 'deck_mage_0', lookAt: 'ik_levi_mouth', ikWeight: 0.9, anim: 'defend' },
      mage_1: { at: 'deck_mage_1', lookAt: 'ik_levi_mouth', ikWeight: 0.9, anim: 'defend' },
      mage_2: { at: 'deck_mage_2', lookAt: 'ik_levi_mouth', ikWeight: 0.9, anim: 'defend' },
      mage_3: { at: 'deck_mage_3', lookAt: 'ik_levi_mouth', ikWeight: 0.9, anim: 'defend' },
      hero: { at: 'deck_hero', lookAt: 'ik_levi_head', ikWeight: 0.85, anim: 'brace' },
    },
  },
  {
    t: 23.8,
    id: 'dive',
    caption: 'DIVE',
    sub: 'Station 1 clear. Dive — station 2 for the finishing breach.',
    camEye: 'cam_dive_eye',
    camLook: 'cam_dive_look',
    camMode: 'cut',
    storm: 0.75,
    shipRoll: 0.2,
    shipIntact: true,
    heroMode: 'brace',
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
    actors: {
      leviathan: {
        at: 'levi_dive',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.4,
        anim: 'idle',
        timeScale: 1,
        visible: true,
      },
      mage_0: { at: 'deck_mage_0', lookAt: 'ik_levi_head', ikWeight: 0.7, anim: 'cast' },
      mage_1: { at: 'deck_mage_1', lookAt: 'ik_levi_head', ikWeight: 0.7, anim: 'cast' },
      mage_2: { at: 'deck_mage_2', lookAt: 'ik_levi_head', ikWeight: 0.7, anim: 'cast' },
      mage_3: { at: 'deck_mage_3', lookAt: 'ik_levi_head', ikWeight: 0.7, anim: 'cast' },
      hero: { at: 'deck_hero', lookAt: 'ik_levi_head', ikWeight: 0.7, anim: 'brace' },
    },
  },
  {
    t: 27.5,
    id: 'rise',
    caption: 'RISE — ATTACK',
    sub: 'Out of the water — attack animation. The keel is marked.',
    camEye: 'cam_rise_eye',
    camLook: 'cam_rise_look',
    camMode: 'blend',
    storm: 0.88,
    shipRoll: 0.4,
    shipIntact: true,
    heroMode: 'brace',
    meguminMark: true,
    stylizedBoom: true,
    hullFire: true,
    tornado: true,
    skyLightning: true,
    shipHit: 'ram',
    exposure: 1.1,
    bloom: 0.7,
    fogDensity: 0.014,
    actors: {
      leviathan: {
        at: 'levi_rise',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.7,
        anim: 'attack',
        timeScale: 0.85,
        visible: true,
      },
      mage_0: { at: 'deck_mage_0', lookAt: 'ik_levi_mouth', ikWeight: 0.95, anim: 'defend' },
      mage_1: { at: 'deck_mage_1', lookAt: 'ik_levi_mouth', ikWeight: 0.95, anim: 'defend' },
      mage_2: { at: 'deck_mage_2', lookAt: 'ik_levi_mouth', ikWeight: 0.95, anim: 'defend' },
      mage_3: { at: 'deck_mage_3', lookAt: 'ik_levi_mouth', ikWeight: 0.95, anim: 'defend' },
      hero: { at: 'deck_hero', lookAt: 'ik_levi_mouth', ikWeight: 0.9, anim: 'brace' },
    },
  },
  {
    t: 31,
    id: 'breach',
    caption: 'BREACH',
    sub: 'Roar into the pinata. Timber becomes confetti. You leave the deck.',
    camEye: 'cam_breach_eye',
    camLook: 'cam_breach_look',
    camMode: 'cut',
    storm: 0.95,
    shipRoll: 0.9,
    shipPitch: 0.5,
    shipIntact: false,
    shipPinata: true,
    heroMode: 'throw',
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
    actors: {
      leviathan: {
        at: 'levi_breach',
        lookAt: 'ik_hero_chest',
        ikWeight: 0.8,
        anim: 'attack and roar',
        timeScale: 0.7,
        visible: true,
      },
      mage_0: { at: 'deck_mage_0', lookAt: 'ik_levi_head', ikWeight: 0.5, anim: 'idle', visible: true },
      mage_1: { at: 'deck_mage_1', lookAt: 'ik_levi_head', ikWeight: 0.5, anim: 'idle', visible: true },
      mage_2: { at: 'deck_mage_2', lookAt: 'ik_levi_head', ikWeight: 0.5, anim: 'idle', visible: true },
      mage_3: { at: 'deck_mage_3', lookAt: 'ik_levi_head', ikWeight: 0.5, anim: 'idle', visible: true },
      hero: {
        at: 'throw_apex',
        lookAt: 'ik_levi_head',
        ikWeight: 0.6,
        anim: 'idle',
        visible: true,
      },
    },
  },
  {
    t: 35.5,
    id: 'twenty_meters',
    caption: 'TWENTY METERS',
    sub: 'Thrown clear. Camera holds you in the foreground. It idles over the wreck.',
    camEye: 'cam_throw_eye',
    camLook: 'cam_throw_look',
    camMode: 'blend',
    storm: 0.75,
    shipIntact: false,
    heroMode: 'air',
    fireAura: true,
    hullFire: true,
    tornado: true,
    exposure: 1.0,
    bloom: 0.52,
    fogDensity: 0.012,
    actors: {
      leviathan: {
        at: 'levi_watch',
        lookAt: 'ik_hero_chest',
        ikWeight: 0.7,
        anim: 'idle',
        timeScale: 1,
        visible: true,
      },
      mage_0: { at: 'deck_mage_0', visible: false },
      mage_1: { at: 'deck_mage_1', visible: false },
      mage_2: { at: 'deck_mage_2', visible: false },
      mage_3: { at: 'deck_mage_3', visible: false },
      hero: {
        at: 'throw_end',
        lookAt: 'ik_levi_head',
        ikWeight: 0.75,
        anim: 'idle',
        visible: true,
      },
    },
  },
  {
    t: 40,
    id: 'finisher',
    caption: 'FINISHER',
    sub: 'Once more — attack as you sink. The sea closes.',
    camEye: 'cam_finisher_eye',
    camLook: 'cam_finisher_look',
    camMode: 'cut',
    storm: 0.6,
    shipIntact: false,
    heroMode: 'sink',
    stylizedBoom: true,
    fireAura: true,
    exposure: 0.85,
    bloom: 0.45,
    fogDensity: 0.016,
    blackout: 0.2,
    actors: {
      leviathan: {
        at: 'levi_finisher',
        lookAt: 'ik_hero_chest',
        ikWeight: 0.65,
        anim: 'attack',
        timeScale: 0.9,
        visible: true,
      },
      hero: {
        at: 'throw_end',
        lookAt: 'ik_levi_mouth',
        ikWeight: 0.5,
        anim: 'idle',
        visible: true,
      },
      mage_0: { at: 'deck_mage_0', visible: false },
      mage_1: { at: 'deck_mage_1', visible: false },
      mage_2: { at: 'deck_mage_2', visible: false },
      mage_3: { at: 'deck_mage_3', visible: false },
    },
  },
  {
    t: 44,
    id: 'black',
    caption: 'INTO THE BLACK',
    sub: 'Cold water. The convoy is gone.',
    camEye: 'cam_blackout_eye',
    camLook: 'cam_blackout_look',
    camMode: 'blend',
    storm: 0.45,
    heroMode: 'sink',
    exposure: 0.55,
    bloom: 0.28,
    fogDensity: 0.02,
    blackout: 0.75,
    actors: {
      leviathan: { at: 'levi_gone', anim: 'idle', visible: false },
      hero: { at: 'throw_end', visible: true, ikWeight: 0 },
      mage_0: { at: 'deck_mage_0', visible: false },
      mage_1: { at: 'deck_mage_1', visible: false },
      mage_2: { at: 'deck_mage_2', visible: false },
      mage_3: { at: 'deck_mage_3', visible: false },
    },
  },
  {
    t: 48,
    id: 'logo',
    caption: '',
    sub: '',
    camEye: 'cam_blackout_eye',
    camLook: 'cam_blackout_look',
    camMode: 'cut',
    heroMode: 'hidden',
    blackout: 1,
    logo: true,
    exposure: 0.35,
    bloom: 0.15,
    actors: {
      leviathan: { at: 'levi_gone', visible: false },
      hero: { at: 'throw_end', visible: false },
      mage_0: { at: 'deck_mage_0', visible: false },
      mage_1: { at: 'deck_mage_1', visible: false },
      mage_2: { at: 'deck_mage_2', visible: false },
      mage_3: { at: 'deck_mage_3', visible: false },
    },
  },
  {
    t: 52,
    id: 'handoff',
    caption: 'GRUDGE WARLORDS',
    sub: 'Wash up on the tutorial shore · chicken-gun pirate map awaits',
    camEye: 'cam_blackout_eye',
    camLook: 'cam_blackout_look',
    heroMode: 'hidden',
    blackout: 1,
    logo: true,
    exposure: 0.35,
    bloom: 0.12,
    actors: {
      leviathan: { at: 'levi_gone', visible: false },
      hero: { at: 'throw_end', visible: false },
      mage_0: { at: 'deck_mage_0', visible: false },
      mage_1: { at: 'deck_mage_1', visible: false },
      mage_2: { at: 'deck_mage_2', visible: false },
      mage_3: { at: 'deck_mage_3', visible: false },
    },
  },
];

export const LEVIATHAN_BATTLE_DURATION_SEC = 56;
export const LEVIATHAN_BATTLE_SKIPPABLE_AFTER_SEC = 2.0;

export function battleBeatAt(timeSec: number): { idx: number; beat: CinBattleBeat } {
  let idx = 0;
  for (let i = 0; i < LEVIATHAN_BATTLE_SCRIPT.length; i++) {
    if (timeSec >= LEVIATHAN_BATTLE_SCRIPT[i].t) idx = i;
    else break;
  }
  return { idx, beat: LEVIATHAN_BATTLE_SCRIPT[idx] };
}

/** Resolve anim fuzzy hints for CinemaAnimDirector */
export function animHintsFor(hint: CinAnimHint | undefined): string[] {
  switch (hint) {
    case 'attack and roar':
      return ['attack and roar', 'roar', 'attack'];
    case 'attack':
      return ['attack', 'combat', 'skill'];
    case 'cast':
      // "Loop" = keep firing 2H magic attack clips until boat pinata (not a separate cast-loop file)
      return [
        '2h magic attack',
        '2h_magic_attack',
        'standing 2h magic attack',
        'Standing 2H Magic Attack',
        'magic attack',
        '2h magic',
        'attack2',
        'attack',
        'combat',
        'skill',
        'cast',
        'magic',
        'idle',
      ];
    case 'defend':
      return ['defend', 'block', 'guard', '2h_cast', 'cast', 'idle'];
    case 'brace':
      return ['idle', 'stand', 'breath', 'defend'];
    case 'swim':
      return ['idle', 'swim', 'walk'];
    case 'idle':
    default:
      return ['idle', 'stand', 'breath'];
  }
}
