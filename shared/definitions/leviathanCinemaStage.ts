/**
 * Leviathan Ocean Cinema — stage location SSOT.
 *
 * Every cinematic pin is a stable positional UUID + SI metres (Y-up, XZ ground).
 * Runtime markers, spine IK look-targets, camera keys, and battle script all
 * resolve through these ids — never hard-coded free-float XYZ in tick loops.
 *
 * Prefix: cinloc_ (cinema location) · versioned stage id for session rebind.
 */

export const LEVIATHAN_STAGE_ID = 'cin_stage_leviathan_ocean_v17' as const;
export const LEVIATHAN_STAGE_VERSION = '17.0.0';

/**
 * SI SSOT — 1 unit = 1 m.
 * Deck cast (orc mages) ~2.2 m · brig LOA 36 m (2× prior 18 m) · levi scales with ship.
 */
export const CIN_HUMAN_M = 1.8;
/** Cinema deck orc mage height (modular bake; slightly above human) */
export const CIN_ORC_M = 2.2;
/** Pirate ship LOA — 2× prior 18 m brig so deck + orcs read on camera */
export const CIN_SHIP_LOA_M = 36;
/** Leviathan LOA — large threat; ~2.5× ship so silhouette still dominates */
export const CIN_LEVIATHAN_LOA_M = 90;
export const CIN_HERO_THROW_M = 20;
/** Clock-face ward ring diameter (~ chest shield) */
export const CIN_RING_SPAN_M = 1.45;
/** Spell glyph span — small impact spark tiles */
export const CIN_GLYPH_SPAN_M = 0.27;
/** Mage plume projectile long-axis span (was 1.05 — too small at ship-cam) */
export const CIN_PLUME_SPAN_M = 1.85;
/** Megumin pinata blast diameter in metres (Sketchfab ~112 node scale — peak-calibrate to this) */
export const CIN_MEGUMIN_SPAN_M = 8;
/** Water cyclone height */
export const CIN_TWISTER_H_M = 7.2;
/** Ward wall glyph face span */
export const CIN_WARD_GLYPH_M = 0.55;

export type CinVec3 = { x: number; y: number; z: number };

/**
 * Startingfalls map backdrop (Desktop `startingfalls.glb` staged to public/models/cinema).
 * Ship + levi fight stays on open water at origin; map is the land horizon behind them.
 * Raw GLB authoring units are huge (~59k) — fitPropSpanM decade-corrects to SI metres.
 * Cinema OceanShader owns near-field water; map WaterPlane meshes are hidden at plant time.
 */
/** Land mass behind the fight (open water at origin) */
export const CIN_ISLAND_OFFSET: CinVec3 = { x: 25, y: 0, z: -100 };
/** Horizontal footprint metres — XZ fit so cliffs don't crush the map */
export const CIN_ISLAND_SPAN_M = 200;

export type CinLocRole =
  | 'world_anchor'
  | 'ship'
  | 'deck_slot'
  | 'leviathan_path'
  | 'ik_target'
  | 'vfx_pin'
  | 'camera'
  | 'throw_arc'
  | 'water';

export type CinLocationDef = {
  /** Stable fleet UUID — never renumber; append new ids only */
  uuid: string;
  /** Human-readable key for scripts */
  key: string;
  role: CinLocRole;
  name: string;
  /** Local stage space (metres); stones anchor = origin */
  position: CinVec3;
  /** Optional facing yaw (rad) for deck slots / levi path */
  yaw?: number;
  /** Optional FOV when used as camera eye */
  fov?: number;
  tags: string[];
  notes?: string;
};

/** Deterministic UUIDs (fixed constants — do not regenerate). */
export const CIN_UUID = {
  // World
  stones_anchor: 'c1ne0001-0000-4000-8000-000000000001',
  water_plane: 'c1ne0001-0000-4000-8000-000000000002',
  ship_origin: 'c1ne0001-0000-4000-8000-000000000010',
  ship_keel: 'c1ne0001-0000-4000-8000-000000000011',
  ship_bow: 'c1ne0001-0000-4000-8000-000000000012',
  ship_stern: 'c1ne0001-0000-4000-8000-000000000013',
  /** Open-water sail start — ship alone, steaming toward rocks / ship_origin */
  ship_sail_start: 'c1ne0001-0000-4000-8000-000000000014',
  // Deck cast — 4 human mages
  deck_mage_0: 'c1ne0001-0000-4000-8000-000000000020',
  deck_mage_1: 'c1ne0001-0000-4000-8000-000000000021',
  deck_mage_2: 'c1ne0001-0000-4000-8000-000000000022',
  deck_mage_3: 'c1ne0001-0000-4000-8000-000000000023',
  // Default throw hero (human unarmed)
  deck_hero: 'c1ne0001-0000-4000-8000-000000000030',
  throw_apex: 'c1ne0001-0000-4000-8000-000000000031',
  throw_end: 'c1ne0001-0000-4000-8000-000000000032',
  // Leviathan path nodes
  levi_hidden: 'c1ne0001-0000-4000-8000-000000000040',
  levi_swim_a: 'c1ne0001-0000-4000-8000-000000000041',
  levi_swim_b: 'c1ne0001-0000-4000-8000-000000000042',
  levi_surface: 'c1ne0001-0000-4000-8000-000000000043',
  levi_cast: 'c1ne0001-0000-4000-8000-000000000044',
  levi_beam: 'c1ne0001-0000-4000-8000-000000000045',
  levi_dive: 'c1ne0001-0000-4000-8000-000000000046',
  levi_rise: 'c1ne0001-0000-4000-8000-000000000047',
  levi_breach: 'c1ne0001-0000-4000-8000-000000000048',
  levi_watch: 'c1ne0001-0000-4000-8000-000000000049',
  levi_finisher: 'c1ne0001-0000-4000-8000-00000000004a',
  levi_gone: 'c1ne0001-0000-4000-8000-00000000004b',
  // IK look targets (dynamic bones snap world pos into these empties)
  ik_levi_head: 'c1ne0001-0000-4000-8000-000000000050',
  ik_levi_mouth: 'c1ne0001-0000-4000-8000-000000000051',
  ik_ship_deck_center: 'c1ne0001-0000-4000-8000-000000000052',
  ik_hero_chest: 'c1ne0001-0000-4000-8000-000000000053',
  ik_sky_storm: 'c1ne0001-0000-4000-8000-000000000054',
  // VFX pins
  vfx_whirlpool_0: 'c1ne0001-0000-4000-8000-000000000060',
  vfx_whirlpool_1: 'c1ne0001-0000-4000-8000-000000000061',
  vfx_tornado: 'c1ne0001-0000-4000-8000-000000000062',
  vfx_megumin_keel: 'c1ne0001-0000-4000-8000-000000000063',
  // Camera eyes + looks
  cam_establish_eye: 'c1ne0001-0000-4000-8000-000000000070',
  cam_establish_look: 'c1ne0001-0000-4000-8000-000000000071',
  /** Follow cam — ship-local stern-quarter while sailing alone */
  cam_sail_eye: 'c1ne0001-0000-4000-8000-000000000088',
  cam_sail_look: 'c1ne0001-0000-4000-8000-000000000089',
  cam_under_eye: 'c1ne0001-0000-4000-8000-000000000072',
  cam_under_look: 'c1ne0001-0000-4000-8000-000000000073',
  cam_deck_eye: 'c1ne0001-0000-4000-8000-000000000074',
  cam_deck_look: 'c1ne0001-0000-4000-8000-000000000075',
  cam_surface_eye: 'c1ne0001-0000-4000-8000-000000000076',
  cam_surface_look: 'c1ne0001-0000-4000-8000-000000000077',
  cam_cast_eye: 'c1ne0001-0000-4000-8000-000000000078',
  cam_cast_look: 'c1ne0001-0000-4000-8000-000000000079',
  cam_roar_eye: 'c1ne0001-0000-4000-8000-00000000007a',
  cam_roar_look: 'c1ne0001-0000-4000-8000-00000000007b',
  cam_dive_eye: 'c1ne0001-0000-4000-8000-00000000007c',
  cam_dive_look: 'c1ne0001-0000-4000-8000-00000000007d',
  cam_rise_eye: 'c1ne0001-0000-4000-8000-00000000007e',
  cam_rise_look: 'c1ne0001-0000-4000-8000-00000000007f',
  cam_breach_eye: 'c1ne0001-0000-4000-8000-000000000080',
  cam_breach_look: 'c1ne0001-0000-4000-8000-000000000081',
  cam_throw_eye: 'c1ne0001-0000-4000-8000-000000000082',
  cam_throw_look: 'c1ne0001-0000-4000-8000-000000000083',
  cam_finisher_eye: 'c1ne0001-0000-4000-8000-000000000084',
  cam_finisher_look: 'c1ne0001-0000-4000-8000-000000000085',
  cam_blackout_eye: 'c1ne0001-0000-4000-8000-000000000086',
  cam_blackout_look: 'c1ne0001-0000-4000-8000-000000000087',
} as const;

export type CinUuidKey = keyof typeof CIN_UUID;

function L(
  key: CinUuidKey,
  role: CinLocRole,
  name: string,
  position: CinVec3,
  extra?: Partial<Pick<CinLocationDef, 'yaw' | 'fov' | 'tags' | 'notes'>>,
): CinLocationDef {
  return {
    uuid: CIN_UUID[key],
    key,
    role,
    name,
    position,
    yaw: extra?.yaw,
    fov: extra?.fov,
    tags: extra?.tags ?? [],
    notes: extra?.notes,
  };
}

/**
 * Canonical stage graph — stones / ship deck as origin.
 * Positions chosen for multi-cam composition (wide → under → deck → breach → throw).
 */
export const LEVIATHAN_STAGE_LOCATIONS: readonly CinLocationDef[] = [
  L('stones_anchor', 'world_anchor', 'Stones Anchor', { x: 0, y: 0, z: 0 }, {
    tags: ['origin', 'startingfalls'],
  }),
  L('water_plane', 'water', 'Water Line', { x: 0, y: 0, z: 0 }, {
    tags: ['gerstner', 'surface'],
  }),
  L('ship_origin', 'ship', 'Ship Origin · Battle Station', { x: 0, y: 0, z: 0 }, {
    tags: ['ship', 'parent', 'battle'],
    notes: 'Fight station near rock horizon; sail path ends here',
  }),
  /** Far open water — sail-in start (island/rocks at z≈−100, so +Z is open sea) */
  L('ship_sail_start', 'ship', 'Ship Sail Start', { x: 10, y: 0, z: 92 }, {
    yaw: Math.PI, // face −Z toward rocks
    tags: ['ship', 'sail', 'open_water'],
    notes: 'Alone on the swell; camera follows toward ship_origin / rocks',
  }),
  L('ship_keel', 'ship', 'Ship Keel', { x: 0, y: 1.2, z: 0 }, {
    tags: ['impact', 'megumin'],
  }),
  L('ship_bow', 'ship', 'Ship Bow', { x: 0, y: 3.2, z: 9 }, {
    tags: ['forward'],
  }),
  L('ship_stern', 'ship', 'Ship Stern', { x: 0, y: 3.0, z: -9 }, {
    tags: ['aft'],
  }),

  // ── 4 mage deck slots — Y is deck height in ship-local (feet on deck) ─
  // Runtime overwrites Y from measured ship deck top after SI fit.
  L('deck_mage_0', 'deck_slot', 'Deck Mage 0 · Port', { x: -2.4, y: 0, z: 1.6 }, {
    yaw: 0.45,
    tags: ['mage', 'human', 'caster', 'ring', 'feet_on_deck'],
  }),
  L('deck_mage_1', 'deck_slot', 'Deck Mage 1 · Starboard', { x: 2.2, y: 0, z: -0.6 }, {
    yaw: -0.5,
    tags: ['mage', 'human', 'caster', 'ring', 'feet_on_deck'],
  }),
  L('deck_mage_2', 'deck_slot', 'Deck Mage 2 · Forward', { x: 0.5, y: 0, z: 3.4 }, {
    yaw: 0.15,
    tags: ['mage', 'human', 'caster', 'ring', 'feet_on_deck'],
  }),
  L('deck_mage_3', 'deck_slot', 'Deck Mage 3 · Aft', { x: -0.9, y: 0, z: -2.8 }, {
    yaw: 0.65,
    tags: ['mage', 'human', 'caster', 'ring', 'feet_on_deck'],
  }),

  // ── Throw hero (human unarmed default) — feet on deck ────────────────
  L('deck_hero', 'deck_slot', 'Deck Hero · Unarmed', { x: 0.4, y: 0, z: 0.2 }, {
    yaw: 0,
    tags: ['hero', 'human', 'unarmed', 'throw', 'feet_on_deck'],
  }),
  L('throw_apex', 'throw_arc', 'Throw Apex', { x: 10, y: 9.5, z: 6 }, {
    tags: ['air'],
  }),
  L('throw_end', 'throw_arc', 'Throw End · 20 m', { x: 18, y: 0.4, z: 4 }, {
    tags: ['sea', 'handoff'],
    notes: `Exactly ${CIN_HERO_THROW_M} m along throw dir from deck`,
  }),

  // ── Leviathan path (scripted nodes) ──────────────────────────────────
  // Beyond the rock horizon (island z≈−100): deep under water, swim-in then rise
  L('levi_hidden', 'leviathan_path', 'Leviathan Hidden', { x: 18, y: -28, z: -72 }, {
    yaw: -1.2,
    tags: ['off'],
  }),
  L('levi_swim_a', 'leviathan_path', 'Leviathan Swim A', { x: 18, y: -6, z: -12 }, {
    yaw: -1.4,
    tags: ['swim', 'under'],
  }),
  L('levi_swim_b', 'leviathan_path', 'Leviathan Swim B', { x: 10, y: -4.5, z: -8 }, {
    yaw: -1.1,
    tags: ['swim', 'under'],
  }),
  L('levi_surface', 'leviathan_path', 'Leviathan Surface', { x: 14, y: 2.4, z: -9 }, {
    yaw: -1.15,
    tags: ['surface', 'idle'],
  }),
  L('levi_cast', 'leviathan_path', 'Leviathan Cast', { x: 12, y: 3.2, z: -8 }, {
    yaw: -1.0,
    tags: ['cast', 'storm'],
  }),
  L('levi_beam', 'leviathan_path', 'Leviathan Beam', { x: 10, y: 3.6, z: -6 }, {
    yaw: -0.95,
    tags: ['roar', 'beam', 'slowmo'],
  }),
  L('levi_dive', 'leviathan_path', 'Leviathan Dive', { x: 16, y: -3, z: -14 }, {
    yaw: -0.8,
    tags: ['dive'],
  }),
  L('levi_rise', 'leviathan_path', 'Leviathan Rise Attack', { x: 6, y: 1.5, z: -4 }, {
    yaw: -0.6,
    tags: ['attack', 'rise'],
  }),
  L('levi_breach', 'leviathan_path', 'Leviathan Breach', { x: 2, y: 2.2, z: -1 }, {
    yaw: -0.4,
    tags: ['breach', 'pinata'],
  }),
  L('levi_watch', 'leviathan_path', 'Leviathan Idle Watch', { x: 8, y: 3.0, z: -5 }, {
    yaw: -0.5,
    tags: ['idle', 'watch'],
  }),
  L('levi_finisher', 'leviathan_path', 'Leviathan Finisher', { x: 12, y: 2.5, z: -3 }, {
    yaw: -0.3,
    tags: ['attack', 'finisher'],
  }),
  L('levi_gone', 'leviathan_path', 'Leviathan Gone', { x: 28, y: -16, z: -24 }, {
    yaw: 0,
    tags: ['off'],
  }),

  // ── IK targets (empties; runtime follows bones / ship) ───────────────
  L('ik_levi_head', 'ik_target', 'IK · Leviathan Head', { x: 14, y: 6, z: -9 }, {
    tags: ['ik', 'look'],
  }),
  L('ik_levi_mouth', 'ik_target', 'IK · Leviathan Mouth', { x: 12, y: 4.2, z: -7 }, {
    tags: ['ik', 'beam'],
  }),
  L('ik_ship_deck_center', 'ik_target', 'IK · Deck Center', { x: 0, y: 3.4, z: 0 }, {
    tags: ['ik', 'deck'],
  }),
  L('ik_hero_chest', 'ik_target', 'IK · Hero Chest', { x: 0.5, y: 4.1, z: 0.3 }, {
    tags: ['ik', 'hero'],
  }),
  L('ik_sky_storm', 'ik_target', 'IK · Sky Storm', { x: 8, y: 28, z: -10 }, {
    tags: ['ik', 'sky'],
  }),

  // ── VFX ──────────────────────────────────────────────────────────────
  L('vfx_whirlpool_0', 'vfx_pin', 'Whirlpool Port', { x: -12, y: 0.05, z: -6 }, {
    tags: ['whirl', 'lightning'],
  }),
  L('vfx_whirlpool_1', 'vfx_pin', 'Whirlpool Starboard', { x: 14, y: 0.05, z: -10 }, {
    tags: ['whirl', 'lightning'],
  }),
  L('vfx_tornado', 'vfx_pin', 'Tornado', { x: 16, y: 0, z: -4 }, {
    tags: ['tornado'],
  }),
  L('vfx_megumin_keel', 'vfx_pin', 'Megumin Keel Mark', { x: 0, y: 2.0, z: 0 }, {
    tags: ['megumin'],
  }),

  // ── Cameras — leviathan is the subject (side-quarter ship→beast, not water stare) ─
  // Eyes sit ship-side; look aims levi path nodes (~14,3,−9). Runtime also hard-aims levi.
  L('cam_establish_eye', 'camera', 'Cam Establish Eye', { x: 36, y: 14, z: 32 }, {
    fov: 50,
    tags: ['cam', 'cut', 'master'],
  }),
  L('cam_establish_look', 'camera', 'Cam Establish Look', { x: 10, y: 5, z: -6 }, {
    tags: ['cam'],
  }),
  // Ship-local follow while sailing alone (look over bow toward rocks/levi spawn)
  L('cam_sail_eye', 'camera', 'Cam Sail Follow Eye', { x: 18, y: 9, z: -22 }, {
    fov: 48,
    tags: ['cam', 'blend', 'sail', 'ship_linked'],
    notes: 'Stern-quarter; bow toward rocks',
  }),
  L('cam_sail_look', 'camera', 'Cam Sail Follow Look', { x: 0, y: 4, z: 10 }, {
    tags: ['cam', 'sail', 'ship_linked'],
  }),
  // Under/approach: SEE the leviathan under/through swell
  L('cam_under_eye', 'camera', 'Cam Under Eye', { x: 24, y: 7, z: 18 }, {
    fov: 48,
    tags: ['cam', 'blend', 'underwater'],
  }),
  L('cam_under_look', 'camera', 'Cam Under Look', { x: 12, y: 2, z: -8 }, {
    tags: ['cam'],
  }),
  L('cam_deck_eye', 'camera', 'Cam Deck Eye', { x: 16, y: 7, z: 14 }, {
    fov: 48,
    tags: ['cam', 'blend'],
  }),
  L('cam_deck_look', 'camera', 'Cam Deck Look', { x: 10, y: 5, z: -6 }, {
    tags: ['cam'],
  }),
  // Surface breach: wide side-quarter on the beast
  L('cam_surface_eye', 'camera', 'Cam Surface Eye', { x: 30, y: 11, z: 12 }, {
    fov: 50,
    tags: ['cam', 'blend'],
  }),
  L('cam_surface_look', 'camera', 'Cam Surface Look', { x: 12, y: 6, z: -8 }, {
    tags: ['cam'],
  }),
  L('cam_cast_eye', 'camera', 'Cam Cast Eye', { x: 22, y: 9, z: 16 }, {
    fov: 48,
    tags: ['cam', 'blend'],
  }),
  L('cam_cast_look', 'camera', 'Cam Cast Look', { x: 10, y: 5, z: -6 }, {
    tags: ['cam'],
  }),
  // Side-quarter: levi + ship both readable
  L('cam_roar_eye', 'camera', 'Cam Roar Eye', { x: 28, y: 10, z: 14 }, {
    fov: 48,
    tags: ['cam', 'blend', 'beam_blowback'],
  }),
  L('cam_roar_look', 'camera', 'Cam Roar Look', { x: 10, y: 5, z: -5 }, {
    tags: ['cam'],
  }),
  L('cam_dive_eye', 'camera', 'Cam Dive Eye', { x: 24, y: 10, z: 28 }, {
    fov: 48,
    tags: ['cam', 'blend'],
  }),
  L('cam_dive_look', 'camera', 'Cam Dive Look', { x: 8, y: 2, z: -8 }, {
    tags: ['cam'],
  }),
  L('cam_rise_eye', 'camera', 'Cam Rise Eye', { x: -22, y: 9, z: 24 }, {
    fov: 47,
    tags: ['cam', 'blend'],
  }),
  L('cam_rise_look', 'camera', 'Cam Rise Look', { x: 3, y: 3.5, z: 1 }, {
    tags: ['cam'],
  }),
  L('cam_breach_eye', 'camera', 'Cam Breach Eye', { x: -16, y: 9, z: 20 }, {
    fov: 48,
    tags: ['cam', 'blend'],
  }),
  L('cam_breach_look', 'camera', 'Cam Breach Look', { x: 2, y: 3, z: 1 }, {
    tags: ['cam'],
  }),
  L('cam_throw_eye', 'camera', 'Cam Throw Eye', { x: 18, y: 7, z: 16 }, {
    fov: 46,
    tags: ['cam', 'blend'],
  }),
  L('cam_throw_look', 'camera', 'Cam Throw Look', { x: 2, y: 2.5, z: 1 }, {
    tags: ['cam'],
  }),
  L('cam_finisher_eye', 'camera', 'Cam Finisher Eye', { x: 24, y: 6, z: 16 }, {
    fov: 48,
    tags: ['cam', 'blend'],
  }),
  L('cam_finisher_look', 'camera', 'Cam Finisher Look', { x: 10, y: 2.5, z: 0 }, {
    tags: ['cam'],
  }),
  L('cam_blackout_eye', 'camera', 'Cam Blackout Eye', { x: 22, y: 2.5, z: 10 }, {
    fov: 48,
    tags: ['cam', 'blend'],
  }),
  L('cam_blackout_look', 'camera', 'Cam Blackout Look', { x: 16, y: 0.5, z: 2 }, {
    tags: ['cam'],
  }),
];

/** uuid → def */
export const CIN_LOC_BY_UUID: ReadonlyMap<string, CinLocationDef> = new Map(
  LEVIATHAN_STAGE_LOCATIONS.map((l) => [l.uuid, l]),
);

/** key → def */
export const CIN_LOC_BY_KEY: ReadonlyMap<string, CinLocationDef> = new Map(
  LEVIATHAN_STAGE_LOCATIONS.map((l) => [l.key, l]),
);

export function cinLoc(key: CinUuidKey): CinLocationDef {
  const d = CIN_LOC_BY_KEY.get(key);
  if (!d) throw new Error(`[cin] missing location key ${key}`);
  return d;
}

export function cinUuid(key: CinUuidKey): string {
  return CIN_UUID[key];
}

export function cinPos(key: CinUuidKey): [number, number, number] {
  const p = cinLoc(key).position;
  return [p.x, p.y, p.z];
}

/** Actor roster bound to stage UUIDs */
export type CinActorId =
  | 'leviathan'
  | 'hero'
  | 'mage_0'
  | 'mage_1'
  | 'mage_2'
  | 'mage_3'
  | 'ship'
  | 'camera';

export const CIN_ACTOR_HOME: Record<
  Exclude<CinActorId, 'camera' | 'ship'>,
  CinUuidKey
> = {
  leviathan: 'levi_hidden',
  hero: 'deck_hero',
  mage_0: 'deck_mage_0',
  mage_1: 'deck_mage_1',
  mage_2: 'deck_mage_2',
  mage_3: 'deck_mage_3',
};

/**
 * Cinema assets — PURGED: western-kingdoms_mage/warrior hero packs.
 * Humans: only WK_Characters via cinemaGrudge6 (equip + texture + SI fit).
 */
export const CIN_CAST_ASSETS = {
  /**
   * Sladania first — has swim / swim_idle / dive / emerge clips on levi skeleton.
   * Stock leviathan.glb is mesh fallback only.
   */
  leviathan: [
    '/models/cinema/sladania.glb',
    '/models/cinema/Sladania/Sladania.glb',
    '/models/cinema/leviathan.glb',
    'https://assets.grudge-studio.com/models/cinema/leviathan.glb',
  ],
  /** Canonical RTS toon race kit only */
  humanRace: [
    'https://assets.grudge-studio.com/models/grudge6/races/WK_Characters.glb',
    '/models/grudge6/races/WK_Characters.glb',
  ],
  /**
   * PURGED from cinema runtime — huge Time_Arch / yin-yang rings looked awful on camera.
   * Keep paths only for offline tools; LeviathanOceanCinema must NOT load these.
   */
  magicRing: [] as readonly string[],
  /**
   * PURGED — spell-glyph.glb must NEVER load in cinema (user ban).
   * Impacts/rebounds use procedural sparks / plume only.
   */
  spellGlyph: [] as readonly string[],
  /** Mage cast charge VFX (fireball.glb scene, SI-scaled, 1.2s then spline) */
  fireballCast: [
    '/models/cinema/fireball-cast.glb',
    '/models/cinema/fireball.glb',
  ],
  /** Mage spline projectile — purple/orange engine plume (not ball / not glyph) */
  magePlumeProjectile: [
    '/models/cinema/mage-plume-projectile.glb',
  ],
  /**
   * USER SSOT (v17): tz-pirate-ship only.
   * Same-origin first (when packaged), then R2 CDN. Damage/sinking = same mesh + tint.
   */
  ship: [
    '/models/cinema/tz-pirate-ship.glb',
    'https://assets.grudge-studio.com/models/cinema/tz-pirate-ship.glb',
  ],
  shipIntact: [
    '/models/cinema/tz-pirate-ship.glb',
    'https://assets.grudge-studio.com/models/cinema/tz-pirate-ship.glb',
  ],
  shipDamaged: [
    '/models/cinema/tz-pirate-ship.glb',
    'https://assets.grudge-studio.com/models/cinema/tz-pirate-ship.glb',
  ],
  shipSinking: [
    '/models/cinema/tz-pirate-ship.glb',
    'https://assets.grudge-studio.com/models/cinema/tz-pirate-ship.glb',
  ],
  /** pro4ik UTCM barrier — ship-wide ward (first beam hits this, then shatters) */
  wardShield: [
    '/models/cinema/ward-shield.glb',
    'https://assets.grudge-studio.com/models/cinema/ward-shield.glb',
  ],
  /** Legacy single wreck fallback */
  wreck: [
    '/models/cinema/ship-03-sinking.glb',
    'https://assets.grudge-studio.com/models/ships/ship-wreck.glb',
    '/models/ships/ship-wreck.glb',
  ],
  /**
   * Startingfalls map — SSOT source: C:\Users\nugye\Desktop\startingfalls.glb
   * Staged to client/public/models/cinema (local first so intro never waits on CDN).
   */
  foundation: [
    '/models/cinema/startingfalls.glb',
    '/models/cinema/startingfalls.prod.glb',
    'https://assets.grudge-studio.com/models/cinema/startingfalls.glb',
    'https://assets.grudge-studio.com/models/cinema/startingfalls.prod.glb',
  ],
  fluid: [
    '/models/cinema/physics1_fluid.glb',
    'https://assets.grudge-studio.com/models/cinema/physics1_fluid.glb',
  ],
  /** Explosion VFX — authored ~100× SI; runtime decade-fits to CIN_MEGUMIN_SPAN_M */
  megumin: [
    '/models/cinema/megumin-explosion.prod.glb',
    'https://assets.grudge-studio.com/models/cinema/megumin-explosion.prod.glb',
  ],
  /**
   * PURGED from cinema — smoke-rings.glb rendered as static red torus stacks
   * and never played its Animation clip correctly. Use particle burst instead.
   */
  smokeRings: [] as readonly string[],
  tornado: [
    '/models/cinema/tornado.prod.glb',
    'https://assets.grudge-studio.com/models/cinema/tornado.prod.glb',
  ],
  /**
   * Underwater set dressing (local staged from Documents):
   *  - fish-particle.glb — school / particle fish (Documents/the_fish_particle.glb)
   *  - ocean-floor-san-pedro.glb — seafloor (Documents/san_pedro_underwater_archaeological_preserve.glb)
   */
  fishParticle: ['/models/cinema/fish-particle.glb'],
  oceanFloor: ['/models/cinema/ocean-floor-san-pedro.glb'],
} as const;
