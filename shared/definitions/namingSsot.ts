/**
 * Naming SSOT — one term per concept (plurals / capitals / near-synonyms).
 *
 * Agents and game code MUST use the **Canonical** column. Legacy aliases exist
 * only for migration; do not invent new synonyms (ocean vs sea vs openWater).
 *
 * Full glossary: docs/NAMING_SSOT.md
 */

// ═══════════════════════════════════════════════════════════════════════════
// OCEAN SURFACE — one free-surface body of water in a scene
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Synonyms that all mean the **same** horizontal free surface:
 *   ocean · open water · sea · water plane · Gerstner ocean · pirate lobby ocean
 *
 * Use these names:
 *   - mesh / system: **ocean** (e.g. mesh.name = 'ocean', createOceanMesh)
 *   - world Y of free surface: **waterLevel** (legacy, universal in physics)
 *     preferred long form: **oceanSurfaceY**
 *
 * Do NOT confuse with:
 *   - farm tool `water` / bucket (harvest GroundToolId)
 *   - placement domain `'water'` (fish spawn column under surface)
 *   - WorldSurfaceLayer `'water'` (content layer tag)
 *   - cave interiors (suppress ocean swim — not a second ocean)
 */
export const OCEAN = {
  /** Default free-surface Y for lobby / most zones (SI metres) */
  surfaceY: 0,
  /** Procedural home-island legacy surface (below origin terrain) */
  proceduralSurfaceY: -2,
  /** Pirate / warlords lobby free surface */
  lobbySurfaceY: 0,
  /** Canonical mesh.name for the single ocean plane */
  meshName: 'ocean' as const,
  /** userData flag: keep this mesh when stripping duplicate water */
  keepFlag: 'grudgeKeepOcean' as const,
  /** userData flag: TI pirate lobby Gerstner variant */
  pirateLobbyFlag: 'isPirateLobbyOcean' as const,
} as const;

/** Preferred: free-surface world Y */
export const OCEAN_SURFACE_Y = OCEAN.surfaceY;

/**
 * Legacy / colloquial aliases — same value as OCEAN_SURFACE_Y.
 * Prefer OCEAN_SURFACE_Y or waterLevel in new code.
 */
export const SEA_SURFACE_Y = OCEAN.surfaceY;
export const OPEN_WATER_SURFACE_Y = OCEAN.surfaceY;
/** @deprecated use OCEAN_SURFACE_Y or waterLevel */
export const WATER_LEVEL_DEFAULT = OCEAN.surfaceY;

/** Normalize any caller synonym → free-surface Y number */
export function resolveOceanSurfaceY(
  opts?: {
    waterLevel?: number;
    oceanSurfaceY?: number;
    seaLevel?: number;
    openWaterY?: number;
    oceanY?: number;
  } | null,
  fallback = OCEAN.surfaceY,
): number {
  if (!opts) return fallback;
  const v =
    opts.oceanSurfaceY ??
    opts.waterLevel ??
    opts.seaLevel ??
    opts.openWaterY ??
    opts.oceanY;
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** True if mesh is the fleet ocean (any naming variant). */
export function isOceanMesh(obj: {
  name?: string;
  userData?: Record<string, unknown>;
} | null | undefined): boolean {
  if (!obj) return false;
  if (obj.userData?.[OCEAN.keepFlag]) return true;
  if (obj.userData?.[OCEAN.pirateLobbyFlag]) return true;
  if (obj.userData?.grudgeChunk && (obj.userData.grudgeChunk as { kind?: string }).kind === 'ocean') {
    return true;
  }
  const n = (obj.name || '').toLowerCase();
  return (
    n === 'ocean' ||
    n === 'pirate-lobby-ocean' ||
    n === 'water' ||
    n === 'open-water' ||
    n === 'seawater' ||
    n.includes('ocean')
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAY CONTROL MODES — combat / harvest (build is harvest sub-state)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CharacterController3D.mode values:
 *   combat | harvest | build
 *
 * HUD dual mode (ModePlayHUD):
 *   combat | harvest   ← build is NOT a top-level HUD tab
 *
 * PlayModeStateManager.PlayHudMode:
 *   combat | harvest
 *
 * Canonical HUD term: **playMode** (combat | harvest)
 * Canonical controller term: **controlMode** (includes build)
 * Build = harvest + toolkit (hammer) — never call it a third “ocean mode”
 */
export type PlayModeName = 'combat' | 'harvest';
export type ControlModeName = 'combat' | 'harvest' | 'build';

export function playModeFromControlMode(mode: ControlModeName | string): PlayModeName {
  return mode === 'combat' ? 'combat' : 'harvest';
}

// ═══════════════════════════════════════════════════════════════════════════
// WEAPONS / HANDS — MainHand vs OffHand vs SecondaryWeapon
// ═══════════════════════════════════════════════════════════════════════════

/**
 * MainHand          — active combat / tool hand (paperdoll + combat)
 * OffHand           — shield / dual off-hand (paperdoll) — NOT the Q-swap weapon
 * SecondaryWeapon   — non-drop reserve for tap-Q weapon swap (not paperdoll drop)
 *
 * Do not name SecondaryWeapon "offhand" or "second hand" in UI copy.
 */
export const WEAPON_SLOTS = {
  mainHand: 'MainHand',
  offHand: 'OffHand',
  /** Non-drop Q-swap reserve */
  secondaryWeapon: 'SecondaryWeapon',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// UI SURFACES — avoid panel / main / hud / shell confusion
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Canonical UI surface names:
 *
 * | Term            | Meaning                                      | Host |
 * |-----------------|----------------------------------------------|------|
 * | playHud         | In-world combat/harvest chrome (ModePlayHUD) | client |
 * | mainPanel       | Equipment / bag / skills modal               | ui.grudge-studio.com/main-panel |
 * | spellbook       | Ability book modal                           | ui.grudge-studio.com/spellbook |
 * | settings        | Graphics / ocean quality                     | ModePlayHUD gear |
 * | uiKit / craftpix| Shared chrome textures                       | ui.grudge-studio.com/assets/craftpix |
 * | gameUiPack      | Decorative layout pack (warlords, grudge6)   | game-ui-packs/*.json |
 *
 * Avoid: "panel" alone, "main" alone, "HUD" for main-panel, "shell" for spellbook.
 */
export const UI_SURFACE = {
  playHud: 'playHud',
  mainPanel: 'mainPanel',
  spellbook: 'spellbook',
  settings: 'settings',
  uiKit: 'uiKit',
  gameUiPack: 'gameUiPack',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// FARM / TOOL "water" vs OCEAN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GroundToolId includes 'bucket' for watering crops — never call this "ocean".
 * PlacementDomain 'water' = spawn domain under ocean surface — not the mesh.
 */
export type WaterWordDisambiguation =
  | 'ocean_surface' // free surface mesh + waterLevel Y
  | 'farm_bucket' // harvest tool water bucket
  | 'placement_column' // fish/boat spawn under surface
  | 'surface_layer_tag'; // WorldSurfaceLayer 'water'
