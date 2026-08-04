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
  /**
   * Lose-fight: ship-wide ward pinata-shatters (shards blow outward) before hull break.
   * Prefer sequencing shieldShatter → beam → shipPinata across nearby beats.
   */
  shieldShatter?: boolean;
  shipHit?: 'beam' | 'breach' | 'ram' | null;
  whirlpools?: boolean;
  skyLightning?: boolean;
  meguminMark?: boolean;
  stylizedBoom?: boolean;
  tornado?: boolean;
  /** Two mages fire spell splines that push/destroy water twisters */
  mageSplineKill?: boolean;
  /**
   * GRDG-3DFX-SKILL-ICESNAKE — deck mages fire ice serpents at leviathan
   * (mostly miss; 1–2 scripted hits use spell-glyph impact on contact).
   */
  iceSnakeCast?: boolean;
  /**
   * GRDG-3DFX-SKILL-BLIZZARD — ice storm over the brig after ward breaks,
   * before / during the final beam that pinatas the hull.
   */
  blizzard?: boolean;
  /** @deprecated glyphs removed - ship shield only */
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
 * Production scripted battle (~64s).
 * Open: ship alone sails toward rocks (follow cam) → leviathan rises → fight.
 * Leviathan path + ship + 4 deck mages (Bip001) + ship-linked multi-cam + levi IK.
 */
export const LEVIATHAN_BATTLE_SCRIPT: readonly CinBattleBeat[] = [
  // ── Act 0: alone on the water, steaming toward the rock horizon ─────────
  {
    t: 0,
    id: 'sail_alone',
    caption: 'OPEN WATER',
    sub: 'The brig runs alone under a star-lit sky. No escort. No sign.',
    camEye: 'cam_sail_eye',
    camLook: 'cam_sail_look',
    camMode: 'cut',
    storm: 0.28,
    shipRoll: 0.07,
    shipPitch: 0.04,
    shipIntact: true,
    heroMode: 'deck',
    underwater: 0,
    exposure: 0.9,
    bloom: 0.28,
    fogDensity: 0.008,
    actors: {
      // Fully off-stage — not in frame, not under the hull yet
      leviathan: {
        at: 'levi_gone',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0,
        anim: 'idle',
        timeScale: 0.7,
        visible: false,
      },
      mage_0: { at: 'deck_mage_0', lookAt: 'ship_bow', ikWeight: 0.1, anim: 'idle' },
      mage_1: { at: 'deck_mage_1', lookAt: 'ship_bow', ikWeight: 0.1, anim: 'idle' },
      mage_2: { at: 'deck_mage_2', lookAt: 'ship_bow', ikWeight: 0.1, anim: 'idle' },
      mage_3: { at: 'deck_mage_3', lookAt: 'ship_bow', ikWeight: 0.1, anim: 'idle' },
      hero: { at: 'deck_hero', lookAt: 'ship_bow', ikWeight: 0.1, anim: 'idle' },
    },
  },
  {
    t: 3.8,
    id: 'sail_rocks',
    caption: 'ROCK HORIZON',
    sub: 'Stone rises on the line. The course holds toward the falls.',
    camEye: 'cam_sail_eye',
    camLook: 'cam_sail_look',
    camMode: 'blend',
    storm: 0.34,
    shipRoll: 0.09,
    shipPitch: 0.05,
    shipIntact: true,
    heroMode: 'deck',
    underwater: 0,
    exposure: 0.9,
    bloom: 0.3,
    fogDensity: 0.0085,
    actors: {
      leviathan: {
        at: 'levi_gone',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0,
        anim: 'idle',
        visible: false,
      },
      mage_0: { at: 'deck_mage_0', lookAt: 'ship_bow', ikWeight: 0.15, anim: 'idle' },
      mage_1: { at: 'deck_mage_1', lookAt: 'ship_bow', ikWeight: 0.15, anim: 'idle' },
      mage_2: { at: 'deck_mage_2', lookAt: 'ship_bow', ikWeight: 0.15, anim: 'idle' },
      mage_3: { at: 'deck_mage_3', lookAt: 'ship_bow', ikWeight: 0.15, anim: 'idle' },
      hero: { at: 'deck_hero', lookAt: 'ship_bow', ikWeight: 0.15, anim: 'idle' },
    },
  },
  {
    t: 7.2,
    id: 'establish',
    caption: 'TOO QUIET',
    sub: 'Near the rocks the swell goes flat. Something waits under the black.',
    camEye: 'cam_establish_eye',
    camLook: 'cam_establish_look',
    camMode: 'blend',
    storm: 0.4,
    shipRoll: 0.1,
    shipPitch: 0.05,
    shipIntact: true,
    heroMode: 'deck',
    underwater: 0.15,
    exposure: 0.88,
    bloom: 0.3,
    fogDensity: 0.01,
    actors: {
      leviathan: {
        at: 'levi_hidden',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.12,
        anim: 'idle',
        timeScale: 0.85,
        visible: false,
      },
      mage_0: { at: 'deck_mage_0', lookAt: 'ik_sky_storm', ikWeight: 0.2, anim: 'idle' },
      mage_1: { at: 'deck_mage_1', lookAt: 'ik_sky_storm', ikWeight: 0.2, anim: 'idle' },
      mage_2: { at: 'deck_mage_2', lookAt: 'ik_sky_storm', ikWeight: 0.2, anim: 'idle' },
      mage_3: { at: 'deck_mage_3', lookAt: 'ik_sky_storm', ikWeight: 0.2, anim: 'idle' },
      hero: { at: 'deck_hero', lookAt: 'ship_bow', ikWeight: 0.2, anim: 'idle' },
    },
  },
  // ── Act 1: leviathan comes from under the water ─────────────────────────
  {
    t: 9.5,
    id: 'approach',
    caption: 'SOMETHING COMES',
    sub: 'A bulk moves under the swell — rising toward the hull.',
    camEye: 'cam_under_eye',
    camLook: 'cam_under_look',
    camMode: 'blend',
    storm: 0.48,
    shipRoll: 0.11,
    shipIntact: true,
    heroMode: 'deck',
    underwater: 0.72,
    exposure: 0.84,
    bloom: 0.32,
    fogDensity: 0.013,
    actors: {
      leviathan: {
        at: 'levi_swim_a',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.35,
        // Procedural eel S-swim on skeleton (flat lateral wave)
        anim: 'swim',
        timeScale: 0.55,
        visible: true,
      },
      mage_0: { at: 'deck_mage_0', lookAt: 'ik_levi_head', ikWeight: 0.45, anim: 'idle' },
      mage_1: { at: 'deck_mage_1', lookAt: 'ik_levi_head', ikWeight: 0.45, anim: 'idle' },
      mage_2: { at: 'deck_mage_2', lookAt: 'ik_levi_head', ikWeight: 0.45, anim: 'idle' },
      mage_3: { at: 'deck_mage_3', lookAt: 'ik_levi_head', ikWeight: 0.45, anim: 'idle' },
      hero: { at: 'deck_hero', lookAt: 'ik_levi_head', ikWeight: 0.5, anim: 'idle' },
    },
  },
  {
    t: 12.0,
    id: 'shadow',
    caption: 'SHADOW IN THE SWELL',
    sub: 'Through the water — seafloor and schools scatter. It climbs.',
    camEye: 'cam_under_eye',
    camLook: 'cam_under_look',
    camMode: 'blend',
    storm: 0.55,
    shipRoll: 0.13,
    shipIntact: true,
    heroMode: 'deck',
    underwater: 0.65,
    exposure: 0.84,
    bloom: 0.36,
    fogDensity: 0.013,
    actors: {
      leviathan: {
        at: 'levi_swim_b',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.45,
        anim: 'swim',
        timeScale: 0.6,
        visible: true,
      },
      mage_0: { at: 'deck_mage_0', lookAt: 'ik_levi_head', ikWeight: 0.55, anim: 'idle' },
      mage_1: { at: 'deck_mage_1', lookAt: 'ik_levi_head', ikWeight: 0.55, anim: 'idle' },
      mage_2: { at: 'deck_mage_2', lookAt: 'ik_levi_head', ikWeight: 0.55, anim: 'idle' },
      mage_3: { at: 'deck_mage_3', lookAt: 'ik_levi_head', ikWeight: 0.55, anim: 'idle' },
      hero: { at: 'deck_hero', lookAt: 'ik_levi_head', ikWeight: 0.55, anim: 'idle' },
    },
  },
  {
    t: 14.8,
    id: 'wards',
    caption: 'RAISE WARDS',
    sub: 'Pro4ik barrier goes up. The brig braces. Eyes on the deep.',
    camEye: 'cam_deck_eye',
    camLook: 'cam_deck_look',
    camMode: 'blend',
    storm: 0.6,
    shipRoll: 0.15,
    shipIntact: true,
    heroMode: 'brace',
    underwater: 0.18,
    iceSnakeCast: true,
    // Raise ship-wide ward barrier early so first beam has a target
    shieldBounce: true,
    shieldImpact: true,
    fireAura: true,
    exposure: 0.95,
    bloom: 0.42,
    fogDensity: 0.01,
    actors: {
      leviathan: {
        at: 'levi_rise',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.5,
        // Rise: still swim undulation, easing toward idle at surface
        anim: 'swim',
        timeScale: 0.7,
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
    t: 18.2,
    id: 'surface',
    caption: 'SURFACE',
    sub: 'It breaches — water sheets off the spine. The air charges.',
    camEye: 'cam_surface_eye',
    camLook: 'cam_surface_look',
    camMode: 'blend',
    storm: 0.72,
    shipRoll: 0.2,
    shipIntact: true,
    heroMode: 'brace',
    fireAura: true,
    whirlpools: true,
    skyLightning: true,
    iceSnakeCast: true,
    exposure: 1.02,
    bloom: 0.5,
    fogDensity: 0.011,
    actors: {
      leviathan: {
        at: 'levi_surface',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.6,
        anim: 'idle',
        timeScale: 1.1,
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
    t: 21.5,
    id: 'twisters_rise',
    caption: 'WATER TWISTERS',
    sub: 'Cyclones spawn thin in the water, grow, and drive on the hull.',
    camEye: 'cam_surface_eye',
    camLook: 'cam_surface_look',
    camMode: 'blend',
    storm: 0.8,
    shipRoll: 0.22,
    shipIntact: true,
    heroMode: 'brace',
    tornado: true,
    whirlpools: true,
    skyLightning: true,
    exposure: 1.0,
    bloom: 0.52,
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
    t: 23.2,
    id: 'mage_spline_kill',
    caption: 'COUNTER-SPELL',
    sub: 'Ice serpents and water-breakers — the deck fights back.',
    camEye: 'cam_cast_eye',
    camLook: 'cam_cast_look',
    camMode: 'blend',
    storm: 0.82,
    shipRoll: 0.22,
    shipIntact: true,
    heroMode: 'brace',
    tornado: true,
    mageSplineKill: true,
    iceSnakeCast: true,
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
   * Dragon beam station 1 — snap into charged maw (attack/roar 1.0↔1.45 ping-pong + shake).
   */
  {
    t: 25.0,
    id: 'dragon_channel_lock',
    caption: 'CHANNEL',
    sub: 'Maw charges — attack/roar held at 1.0–1.45s, shaking. Then the beam.',
    camEye: 'cam_roar_eye',
    camLook: 'cam_roar_look',
    camMode: 'blend',
    storm: 0.9,
    shipRoll: 0.28,
    shipIntact: true,
    heroMode: 'brace',
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
        // Controller maps snap/charge/blast → charge ping-pong (not full clip play)
        anim: 'attack and roar',
        animRestart: true,
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
    t: 25.1,
    id: 'dragon_beam_blowback',
    caption: 'DRAGON BEAM',
    sub: 'Beam slams the pro4ik ward barrier — not the hull. Deck holds.',
    // Side-quarter: levi maw FG-left, ship ward mid, boat right
    camEye: 'cam_roar_eye',
    camLook: 'cam_roar_look',
    camMode: 'blend',
    storm: 0.96,
    shipRoll: 0.55,
    shipPitch: 0.18,
    shipIntact: true,
    heroMode: 'brace',
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
        // Charge hold: idle + attack/roar scrub 1.0↔1.45 (controller charge mode)
        anim: 'attack and roar',
        animRestart: false,
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
    t: 27.8,
    id: 'dragon_beam_tail',
    caption: 'WARDS STRAIN',
    sub: 'Beam locked on pro4ik shield 5 m off the deck — flame bounce.',
    camEye: 'cam_deck_eye',
    camLook: 'cam_deck_look',
    camMode: 'blend',
    storm: 0.92,
    shipRoll: 0.38,
    shipPitch: 0.1,
    shipIntact: true,
    heroMode: 'brace',
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
        anim: 'attack and roar',
        animRestart: false,
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
    t: 29.4,
    id: 'dragon_attack_finish',
    caption: 'WARD SHATTERS',
    sub: 'First beam ends — pro4ik ward pinatas. Hull still intact. Then it dives.',
    camEye: 'cam_cast_eye',
    camLook: 'cam_cast_look',
    camMode: 'blend',
    storm: 0.86,
    shipRoll: 0.24,
    shipIntact: true,
    heroMode: 'brace',
    dragonPhase: 'aftermath',
    // End of first beam: barrier dies (beam hit shield, not hull)
    shieldShatter: true,
    shieldDefeat: true,
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
        // Release charge into full attack between beams
        anim: 'attack',
        timeScale: 1.05,
        animRestart: true,
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
    t: 30.8,
    id: 'dive',
    caption: 'DIVE',
    sub: 'Station 1 clear. Dive — station 2 for the finishing breach.',
    camEye: 'cam_dive_eye',
    camLook: 'cam_dive_look',
    camMode: 'blend',
    storm: 0.75,
    shipRoll: 0.2,
    shipIntact: true,
    heroMode: 'brace',
    rings: false,
    // Ward still up until ward_shatter — no early shieldDefeat pinata
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
        anim: 'swim',
        timeScale: 0.65,
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
    t: 34.5,
    id: 'rise',
    caption: 'RISE — ATTACK',
    sub: 'Out of the water — jaws open on the ward. The keel is marked.',
    camEye: 'cam_rise_eye',
    camLook: 'cam_rise_look',
    camMode: 'blend',
    storm: 0.88,
    shipRoll: 0.4,
    shipIntact: true,
    heroMode: 'brace',
    dragonPhase: 'charge',
    fireballs: true,
    fireAura: true,
    hotHands: true,
    shieldBounce: true,
    hullFire: true,
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
        // Second beam charge: same 1.0↔1.45 attack/roar hold
        anim: 'attack and roar',
        animRestart: true,
        visible: true,
      },
      mage_0: { at: 'deck_mage_0', lookAt: 'ik_levi_mouth', ikWeight: 0.95, anim: 'defend' },
      mage_1: { at: 'deck_mage_1', lookAt: 'ik_levi_mouth', ikWeight: 0.95, anim: 'defend' },
      mage_2: { at: 'deck_mage_2', lookAt: 'ik_levi_mouth', ikWeight: 0.95, anim: 'defend' },
      mage_3: { at: 'deck_mage_3', lookAt: 'ik_levi_mouth', ikWeight: 0.95, anim: 'defend' },
      hero: { at: 'deck_hero', lookAt: 'ik_levi_mouth', ikWeight: 0.9, anim: 'brace' },
    },
  },
  /**
   * LOSE FIGHT sequence:
   *  1) shieldShatter — ward pinata + MERGE first→middle damaged hull
   *  2) (blizzard VFX purged for perf)
   *  3) final beam — physical shove (still middle/damaged)
   *  4) shipPinata / breach — MERGE middle→last sinking hull (+ FX; multi-state keeps wreck mesh)
   */
  {
    t: 36.6,
    id: 'ward_shatter',
    caption: 'NO WARD',
    sub: 'Barrier already down from first beam. Final beam crushes the hull.',
    camEye: 'cam_breach_eye',
    camLook: 'cam_breach_look',
    camMode: 'blend',
    storm: 0.94,
    shipRoll: 0.55,
    shipPitch: 0.2,
    shipIntact: true,
    heroMode: 'brace',
    // Shield already shattered at end of first beam — do not re-pinata
    shieldShatter: false,
    shieldDefeat: true,
    // Blizzard VFX purged (perf)
    dragonPhase: 'blast',
    fireBeam: true,
    fireballs: true,
    fireAura: true,
    hotHands: true,
    blowback: true,
    hullFire: true,
    skyLightning: true,
    exposure: 1.2,
    bloom: 0.88,
    fogDensity: 0.014,
    actors: {
      leviathan: {
        at: 'levi_breach',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.95,
        anim: 'attack and roar',
        animRestart: false,
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
    t: 37.5,
    id: 'beam_hull_push',
    caption: 'BEAM HIT',
    sub: 'No ward. Beam crushes the deck — timber screams.',
    camEye: 'cam_finisher_eye',
    camLook: 'cam_finisher_look',
    camMode: 'blend',
    storm: 0.96,
    shipRoll: 0.75,
    shipPitch: 0.35,
    shipIntact: true,
    heroMode: 'brace',
    // blizzard purged (perf)
    dragonPhase: 'blast',
    fireBeam: true,
    fireAura: true,
    hotHands: true,
    blowback: true,
    hullFire: true,
    shipHit: 'beam',
    meguminMark: true,
    stylizedBoom: true,
    exposure: 1.28,
    bloom: 0.95,
    fogDensity: 0.015,
    actors: {
      leviathan: {
        at: 'levi_breach',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 1,
        // Second beam: hold charged maw 1.0↔1.45 (same as first)
        anim: 'attack and roar',
        animRestart: false,
        visible: true,
      },
      mage_0: { at: 'deck_mage_0', lookAt: 'ik_levi_mouth', ikWeight: 0.8, anim: 'brace' },
      mage_1: { at: 'deck_mage_1', lookAt: 'ik_levi_mouth', ikWeight: 0.8, anim: 'brace' },
      mage_2: { at: 'deck_mage_2', lookAt: 'ik_levi_mouth', ikWeight: 0.8, anim: 'brace' },
      mage_3: { at: 'deck_mage_3', lookAt: 'ik_levi_mouth', ikWeight: 0.8, anim: 'brace' },
      hero: { at: 'deck_hero', lookAt: 'ik_levi_mouth', ikWeight: 0.85, anim: 'brace' },
    },
  },
  {
    t: 38.4,
    id: 'breach',
    caption: 'SHIP DESTROYED',
    sub: 'Explosion — hull merges to the sinking wreck and goes under.',
    camEye: 'cam_breach_eye',
    camLook: 'cam_breach_look',
    camMode: 'blend',
    storm: 0.98,
    shipRoll: 0.95,
    shipPitch: 0.55,
    shipIntact: false,
    shipPinata: true,
    heroMode: 'throw',
    stylizedBoom: true,
    meguminMark: true,
    hullFire: true,
    fireAura: true,
    fireBeam: true,
    dragonPhase: 'blast',
    shipHit: 'breach',
    skyLightning: true,
    exposure: 1.32,
    bloom: 1.0,
    fogDensity: 0.015,
    actors: {
      leviathan: {
        at: 'levi_breach',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.8,
        anim: 'attack and roar',
        timeScale: 0.7,
        visible: true,
      },
      mage_0: { at: 'deck_mage_0', visible: false },
      mage_1: { at: 'deck_mage_1', visible: false },
      mage_2: { at: 'deck_mage_2', visible: false },
      mage_3: { at: 'deck_mage_3', visible: false },
      hero: { at: 'deck_hero', visible: true, anim: 'brace' },
    },
  },
  {
    t: 42.5,
    id: 'twenty_meters',
    caption: '20 METERS',
    sub: 'A body flies clear of the wreck — 20 m across the swell.',
    camEye: 'cam_breach_eye',
    camLook: 'cam_breach_look',
    camMode: 'blend',
    storm: 0.75,
    shipIntact: false,
    heroMode: 'air',
    fireAura: true,
    hullFire: true,
    exposure: 1.0,
    bloom: 0.52,
    fogDensity: 0.012,
    actors: {
      leviathan: {
        at: 'levi_watch',
        lookAt: 'throw_end',
        ikWeight: 0.7,
        anim: 'idle',
        timeScale: 1,
        visible: true,
      },
      mage_0: { at: 'deck_mage_0', visible: false },
      mage_1: { at: 'deck_mage_1', visible: false },
      mage_2: { at: 'deck_mage_2', visible: false },
      mage_3: { at: 'deck_mage_3', visible: false },
      hero: { at: 'throw_end', visible: true },
    },
  },
  {
    t: 47,
    id: 'finisher',
    caption: 'LAST ROAR',
    sub: 'One more strike into the black water. The sea closes over the fight.',
    camEye: 'cam_finisher_eye',
    camLook: 'cam_finisher_look',
    camMode: 'blend',
    storm: 0.6,
    shipIntact: false,
    heroMode: 'hidden',
    stylizedBoom: true,
    fireAura: true,
    exposure: 0.85,
    bloom: 0.45,
    fogDensity: 0.016,
    blackout: 0.2,
    actors: {
      leviathan: {
        at: 'levi_finisher',
        lookAt: 'ik_ship_deck_center',
        ikWeight: 0.65,
        anim: 'attack',
        timeScale: 0.9,
        visible: true,
      },
      hero: { at: 'deck_hero', visible: false },
      mage_0: { at: 'deck_mage_0', visible: false },
      mage_1: { at: 'deck_mage_1', visible: false },
      mage_2: { at: 'deck_mage_2', visible: false },
      mage_3: { at: 'deck_mage_3', visible: false },
    },
  },
  {
    t: 51,
    id: 'black',
    caption: 'INTO THE BLACK',
    sub: 'Cold water. The convoy is gone.',
    camEye: 'cam_blackout_eye',
    camLook: 'cam_blackout_look',
    camMode: 'blend',
    storm: 0.45,
    heroMode: 'hidden',
    exposure: 0.55,
    bloom: 0.28,
    fogDensity: 0.02,
    blackout: 0.75,
    actors: {
      leviathan: { at: 'levi_gone', anim: 'idle', visible: false },
      hero: { at: 'deck_hero', visible: false },
      mage_0: { at: 'deck_mage_0', visible: false },
      mage_1: { at: 'deck_mage_1', visible: false },
      mage_2: { at: 'deck_mage_2', visible: false },
      mage_3: { at: 'deck_mage_3', visible: false },
    },
  },
  {
    t: 55,
    id: 'logo',
    caption: '',
    sub: '',
    camEye: 'cam_blackout_eye',
    camLook: 'cam_blackout_look',
    camMode: 'blend',
    heroMode: 'hidden',
    blackout: 1,
    logo: true,
    exposure: 0.35,
    bloom: 0.15,
    actors: {
      leviathan: { at: 'levi_gone', visible: false },
      hero: { at: 'deck_hero', visible: false },
      mage_0: { at: 'deck_mage_0', visible: false },
      mage_1: { at: 'deck_mage_1', visible: false },
      mage_2: { at: 'deck_mage_2', visible: false },
      mage_3: { at: 'deck_mage_3', visible: false },
    },
  },
  {
    t: 59,
    id: 'handoff',
    caption: 'SHIPWRECK COVE',
    sub: 'Leviathan shattered the hull · you wash up on pirate-islands (chicken-gun map) · tutorial shore',
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

export const LEVIATHAN_BATTLE_DURATION_SEC = 64;
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
      // Prefer Bip001 cinema aliases first (loaded via loadCinemaMageBip001Clips)
      return [
        'cast',
        '2h_cast',
        'attack',
        'cast2',
        '2h magic attack',
        '2h_magic_attack',
        'magic attack',
        'attack2',
        'idle',
      ];
    case 'defend':
      return ['defend', 'block', 'fight_idle', 'guard', 'cast', 'idle'];
    case 'brace':
      return ['brace', 'idle', 'stand', 'fight_idle', 'defend'];
    case 'swim':
      return ['idle', 'swim', 'walk'];
    case 'idle':
    default:
      return ['idle', 'stand', 'fight_idle', 'breath'];
  }
}
