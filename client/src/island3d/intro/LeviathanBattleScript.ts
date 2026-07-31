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
    whirlpools: true,
    tornado: true,
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
    t: 15,
    id: 'cast_storm',
    caption: 'CAST THE STORM',
    sub: 'Lightning. Twisters. The leviathan gathers fire for the beam.',
    camEye: 'cam_cast_eye',
    camLook: 'cam_cast_look',
    camMode: 'cut',
    storm: 0.8,
    shipRoll: 0.22,
    shipIntact: true,
    heroMode: 'brace',
    rings: true,
    fireAura: true,
    whirlpools: true,
    tornado: true,
    skyLightning: true,
    exposure: 1.05,
    bloom: 0.58,
    fogDensity: 0.012,
    actors: {
      leviathan: {
        at: 'levi_cast',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.65,
        anim: 'attack',
        timeScale: 1,
        visible: true,
      },
      mage_0: { at: 'deck_mage_0', lookAt: 'ik_levi_mouth', ikWeight: 0.95, anim: 'defend' },
      mage_1: { at: 'deck_mage_1', lookAt: 'ik_levi_mouth', ikWeight: 0.95, anim: 'defend' },
      mage_2: { at: 'deck_mage_2', lookAt: 'ik_levi_mouth', ikWeight: 0.95, anim: 'defend' },
      mage_3: { at: 'deck_mage_3', lookAt: 'ik_levi_mouth', ikWeight: 0.95, anim: 'defend' },
      hero: { at: 'deck_hero', lookAt: 'ik_levi_mouth', ikWeight: 0.85, anim: 'brace' },
    },
  },
  {
    t: 18.5,
    id: 'roar_beam',
    caption: 'ROAR',
    sub: 'Time stretches. Attack and roar — a long beam burns the wards.',
    camEye: 'cam_roar_eye',
    camLook: 'cam_roar_look',
    camMode: 'blend',
    storm: 0.9,
    shipRoll: 0.3,
    shipIntact: true,
    heroMode: 'brace',
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
    actors: {
      leviathan: {
        at: 'levi_beam',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.75,
        anim: 'attack and roar',
        timeScale: 0.42,
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
    t: 24,
    id: 'dive',
    caption: 'DIVE',
    sub: 'Wards fail. Smoke rings bloom. The beast slides under again.',
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
      return ['cast', 'spell', 'magic', 'attack', 'skill'];
    case 'defend':
      return ['defend', 'block', 'guard', 'idle', 'cast'];
    case 'brace':
      return ['idle', 'stand', 'breath', 'defend'];
    case 'swim':
      return ['idle', 'swim', 'walk'];
    case 'idle':
    default:
      return ['idle', 'stand', 'breath'];
  }
}
