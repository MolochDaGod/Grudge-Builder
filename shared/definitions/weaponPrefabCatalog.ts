/**
 * Production weapon prefab catalog — **6 styles × each weapon type**.
 *
 * Source pipeline (author machine, 2026-07-24):
 *   D:\Games\Models\_codex_prod\dist\  → converted GLB + collider + manifest
 *   D:\Games\Models\_codex_prod\mesh-registry.json → R2 CDN keys
 *   Packs: glitch-weapons (4 material styles), voxel-weapons, cold-biome viking
 *
 * Styles (art skins, not T1–T8 power tiers):
 *   1 copper   2 silver   3 gold   4 diamond   5 voxel   6 cold/viking (or fallback)
 *
 * Power tiers T1–T8 still live in weaponTierVisuals (tint/glow/trail).
 * Prefab styles pick the base mesh; tier visuals dress it for rarity.
 *
 * CDN: https://assets.grudge-studio.com/models/codex/**
 */

export const WEAPON_STYLE_COUNT = 6 as const;

/** Six production style slots (visual skins). */
export const WEAPON_STYLE_DEFS = [
  {
    index: 1,
    id: 'copper',
    label: 'Copper / Crude',
    pack: 'glitch-weapons',
    material: 'copper',
    mapsToTierHint: 1,
  },
  {
    index: 2,
    id: 'silver',
    label: 'Silver / Iron',
    pack: 'glitch-weapons',
    material: 'silver',
    mapsToTierHint: 2,
  },
  {
    index: 3,
    id: 'gold',
    label: 'Gold / Steel',
    pack: 'glitch-weapons',
    material: 'gold',
    mapsToTierHint: 3,
  },
  {
    index: 4,
    id: 'diamond',
    label: 'Diamond / Hardened',
    pack: 'glitch-weapons',
    material: 'diamond',
    mapsToTierHint: 4,
  },
  {
    index: 5,
    id: 'voxel',
    label: 'Voxel Fantasy',
    pack: 'voxel-weapons',
    material: 'voxel',
    mapsToTierHint: 3,
  },
  {
    index: 6,
    id: 'cold_viking',
    label: 'Cold Viking',
    pack: 'cold-biome',
    material: 'viking',
    mapsToTierHint: 5,
  },
] as const;

export type WeaponStyleId = (typeof WEAPON_STYLE_DEFS)[number]['id'];
export type WeaponStyleIndex = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Production combat + tool weapon types that must have 6 style prefabs.
 * Aligns with weaponSkills trees + harvest tools + WEAPON_MODEL_CONFIGS.
 */
export const PRODUCTION_WEAPON_TYPES = [
  'SWORD',
  'AXE',
  'BOW',
  'STAFF',
  'DAGGER',
  'MACE',
  'SCYTHE',
  'SPEAR',
  'HAMMER',
  'SHIELD',
  'GREATSWORD',
  'WAND',
  'PICKAXE',
  'SHOVEL',
  'GUN',
] as const;

export type ProductionWeaponType = (typeof PRODUCTION_WEAPON_TYPES)[number];

export type PrefabStatus = 'ready' | 'fallback' | 'missing';

export interface WeaponPrefabEntry {
  /** Stable prefab id: sword_style_copper */
  id: string;
  weaponType: ProductionWeaponType;
  styleIndex: WeaponStyleIndex;
  styleId: WeaponStyleId;
  label: string;
  /** R2 key under grudge-assets */
  r2Key: string | null;
  /** Full CDN URL when ready */
  cdnUrl: string | null;
  /** Same-origin public path after sync */
  localPath: string | null;
  /** Collider sidecar on CDN when present */
  colliderUrl: string | null;
  status: PrefabStatus;
  /** Which converted pack supplied the mesh */
  sourcePack: string | null;
  /** Notes for pipeline / artists */
  notes?: string;
  productionReady: boolean;
}

const CDN = 'https://assets.grudge-studio.com';

function glitch(
  material: string,
  tool: string,
): { r2Key: string; cdnUrl: string; localPath: string; colliderUrl: string } {
  // glitch uses picaxe / scyth spelling in source pack
  const name = `${material}_${tool}`;
  const r2Key = `models/codex/glitch-weapons/weapons/${name}.glb`;
  return {
    r2Key,
    cdnUrl: `${CDN}/${r2Key}`,
    localPath: `/models/codex/glitch-weapons/weapons/${name}/${name}.glb`,
    colliderUrl: `${CDN}/models/codex/glitch-weapons/weapons/${name}.collider.json`,
  };
}

function voxel(tool: string): {
  r2Key: string;
  cdnUrl: string;
  localPath: string;
  colliderUrl: string;
} {
  const r2Key = `models/codex/voxel-weapons/weapons/${tool}.glb`;
  return {
    r2Key,
    cdnUrl: `${CDN}/${r2Key}`,
    localPath: `/models/codex/voxel-weapons/weapons/${tool}/${tool}.glb`,
    colliderUrl: `${CDN}/models/codex/voxel-weapons/weapons/${tool}.collider.json`,
  };
}

function viking(name: string): {
  r2Key: string;
  cdnUrl: string;
  localPath: string;
  colliderUrl: string | null;
} {
  const r2Key = `models/codex/cold-biome/viking/${name}.glb`;
  return {
    r2Key,
    cdnUrl: `${CDN}/${r2Key}`,
    localPath: `/models/codex/cold-biome/viking/${name}/${name}.glb`,
    colliderUrl: null,
  };
}

function missing(
  weaponType: ProductionWeaponType,
  styleIndex: WeaponStyleIndex,
  styleId: WeaponStyleId,
  note: string,
): WeaponPrefabEntry {
  return {
    id: `${weaponType.toLowerCase()}_style_${styleId}`,
    weaponType,
    styleIndex,
    styleId,
    label: `${weaponType} · ${styleId}`,
    r2Key: null,
    cdnUrl: null,
    localPath: null,
    colliderUrl: null,
    status: 'missing',
    sourcePack: null,
    notes: note,
    productionReady: false,
  };
}

function ready(
  weaponType: ProductionWeaponType,
  styleIndex: WeaponStyleIndex,
  styleId: WeaponStyleId,
  paths: {
    r2Key: string;
    cdnUrl: string;
    localPath: string;
    colliderUrl: string | null;
  },
  sourcePack: string,
  notes?: string,
): WeaponPrefabEntry {
  return {
    id: `${weaponType.toLowerCase()}_style_${styleId}`,
    weaponType,
    styleIndex,
    styleId,
    label: `${weaponType} · ${WEAPON_STYLE_DEFS[styleIndex - 1]!.label}`,
    r2Key: paths.r2Key,
    cdnUrl: paths.cdnUrl,
    localPath: paths.localPath,
    colliderUrl: paths.colliderUrl,
    status: 'ready',
    sourcePack,
    notes,
    productionReady: true,
  };
}

/**
 * Fallback: reuse another type's style mesh when no dedicated art exists.
 * Status = fallback (still playable in production with art debt).
 */
function fallbackFrom(
  weaponType: ProductionWeaponType,
  styleIndex: WeaponStyleIndex,
  styleId: WeaponStyleId,
  donor: WeaponPrefabEntry,
  note: string,
): WeaponPrefabEntry {
  return {
    ...donor,
    id: `${weaponType.toLowerCase()}_style_${styleId}`,
    weaponType,
    styleIndex,
    styleId,
    label: `${weaponType} · ${WEAPON_STYLE_DEFS[styleIndex - 1]!.label} (fallback)`,
    status: 'fallback',
    notes: note,
    productionReady: true, // usable, but not final art
  };
}

/** Build 6-style row for a glitch tool family (+ voxel + viking when available). */
function rowFromGlitchTool(
  weaponType: ProductionWeaponType,
  glitchTool: 'sword' | 'axe' | 'picaxe' | 'scyth' | 'shovel',
  voxelTool: string | null,
  vikingName: string | null,
): WeaponPrefabEntry[] {
  const materials = ['copper', 'silver', 'gold', 'diamond'] as const;
  const styles: WeaponStyleId[] = [
    'copper',
    'silver',
    'gold',
    'diamond',
    'voxel',
    'cold_viking',
  ];
  const out: WeaponPrefabEntry[] = [];

  for (let i = 0; i < 4; i++) {
    const mat = materials[i]!;
    const styleId = styles[i]!;
    out.push(
      ready(
        weaponType,
        (i + 1) as WeaponStyleIndex,
        styleId,
        glitch(mat, glitchTool),
        'glitch-weapons',
      ),
    );
  }

  // style 5 — voxel
  if (voxelTool) {
    out.push(
      ready(weaponType, 5, 'voxel', voxel(voxelTool), 'voxel-weapons'),
    );
  } else {
    out.push(
      fallbackFrom(
        weaponType,
        5,
        'voxel',
        out[3]!,
        `No voxel mesh for ${weaponType}; using diamond glitch until converted`,
      ),
    );
  }

  // style 6 — cold viking
  if (vikingName) {
    out.push(
      ready(
        weaponType,
        6,
        'cold_viking',
        viking(vikingName),
        'cold-biome',
        'Viking cold biome prop used as weapon style',
      ),
    );
  } else {
    out.push(
      fallbackFrom(
        weaponType,
        6,
        'cold_viking',
        out[3]!,
        `No viking mesh for ${weaponType}; using diamond glitch until converted`,
      ),
    );
  }

  return out;
}

/**
 * Full production matrix: every PRODUCTION_WEAPON_TYPES × 6 styles.
 */
export const WEAPON_PREFAB_MATRIX: Record<
  ProductionWeaponType,
  WeaponPrefabEntry[]
> = {
  SWORD: rowFromGlitchTool('SWORD', 'sword', 'sword', null),
  AXE: rowFromGlitchTool('AXE', 'axe', 'axe', 'axe'),
  SCYTHE: rowFromGlitchTool('SCYTHE', 'scyth', 'scythe', null),
  PICKAXE: rowFromGlitchTool('PICKAXE', 'picaxe', 'pickaxe', null),
  SHOVEL: rowFromGlitchTool('SHOVEL', 'shovel', null, null),

  // Combat types without dedicated glitch meshes yet — map closest + mark fallback
  GREATSWORD: rowFromGlitchTool('GREATSWORD', 'sword', 'sword', null).map(
    (e, i) =>
      i < 4
        ? {
            ...e,
            weaponType: 'GREATSWORD' as const,
            id: `greatsword_style_${e.styleId}`,
            label: `GREATSWORD · ${e.styleId} (2H scale)`,
            notes: 'Uses sword mesh; apply GREATSWORD attach scale 1.3',
            status: 'fallback' as const,
          }
        : { ...e, weaponType: 'GREATSWORD' as const, id: `greatsword_style_${e.styleId}` },
  ),

  // Shield from viking cold pack (styles 1–4 reuse shield/shieldrune; 5–6 variants)
  SHIELD: (() => {
    const base = viking('shield');
    const rune = viking('shieldrune');
    return WEAPON_STYLE_DEFS.map((s, i) => {
      const paths = i % 2 === 0 ? base : rune;
      return ready(
        'SHIELD',
        (i + 1) as WeaponStyleIndex,
        s.id,
        { ...paths, colliderUrl: null },
        'cold-biome',
        i % 2 === 0 ? 'viking shield' : 'viking shield rune',
      );
    });
  })(),

  // Types needing new convert — temporary sword/axe fallbacks for production boot
  BOW: WEAPON_STYLE_DEFS.map((s, i) =>
    missing(
      'BOW',
      (i + 1) as WeaponStyleIndex,
      s.id,
      'Need converted bow prefabs (6 styles). Pipeline: place under models/codex/weapons/bow/{style}/',
    ),
  ),
  STAFF: WEAPON_STYLE_DEFS.map((s, i) =>
    missing(
      'STAFF',
      (i + 1) as WeaponStyleIndex,
      s.id,
      'Need converted staff prefabs (6 styles)',
    ),
  ),
  DAGGER: WEAPON_STYLE_DEFS.map((s, i) =>
    fallbackFrom(
      'DAGGER',
      (i + 1) as WeaponStyleIndex,
      s.id,
      rowFromGlitchTool('SWORD', 'sword', 'sword', null)[Math.min(i, 3)]!,
      'Temporary: scale-down sword mesh until dagger pack converts',
    ),
  ),
  MACE: WEAPON_STYLE_DEFS.map((s, i) =>
    fallbackFrom(
      'MACE',
      (i + 1) as WeaponStyleIndex,
      s.id,
      rowFromGlitchTool('AXE', 'axe', 'axe', 'axe')[Math.min(i, 5)]!,
      'Temporary: axe mesh until mace pack converts',
    ),
  ),
  SPEAR: WEAPON_STYLE_DEFS.map((s, i) =>
    missing(
      'SPEAR',
      (i + 1) as WeaponStyleIndex,
      s.id,
      'Need converted spear prefabs (6 styles)',
    ),
  ),
  HAMMER: WEAPON_STYLE_DEFS.map((s, i) =>
    fallbackFrom(
      'HAMMER',
      (i + 1) as WeaponStyleIndex,
      s.id,
      rowFromGlitchTool('PICKAXE', 'picaxe', 'pickaxe', null)[Math.min(i, 4)]!,
      'Temporary: pickaxe mesh until hammer pack converts',
    ),
  ),
  WAND: WEAPON_STYLE_DEFS.map((s, i) =>
    missing(
      'WAND',
      (i + 1) as WeaponStyleIndex,
      s.id,
      'Need converted wand prefabs (6 styles)',
    ),
  ),
  GUN: WEAPON_STYLE_DEFS.map((s, i) =>
    missing(
      'GUN',
      (i + 1) as WeaponStyleIndex,
      s.id,
      'Source available: D:\\Games\\Models\\modular_steampunk_guns_collection (1).glb — convert + split into 6 styles',
    ),
  ),
};

// ── API ──────────────────────────────────────────────────────────────────────

export function getWeaponPrefab(
  weaponType: string,
  style: WeaponStyleIndex | WeaponStyleId = 1,
): WeaponPrefabEntry | null {
  const key = weaponType.toUpperCase() as ProductionWeaponType;
  const row = WEAPON_PREFAB_MATRIX[key];
  if (!row) return null;
  if (typeof style === 'number') {
    return row.find((p) => p.styleIndex === style) ?? row[0] ?? null;
  }
  return row.find((p) => p.styleId === style) ?? row[0] ?? null;
}

/** Prefer ready → fallback → missing; returns best playable URL. */
export function resolveWeaponPrefabUrl(
  weaponType: string,
  style: WeaponStyleIndex | WeaponStyleId = 1,
): string | null {
  const p = getWeaponPrefab(weaponType, style);
  if (!p) return null;
  return p.cdnUrl ?? p.localPath;
}

export function listPrefabsForType(
  weaponType: string,
): WeaponPrefabEntry[] {
  const key = weaponType.toUpperCase() as ProductionWeaponType;
  return WEAPON_PREFAB_MATRIX[key] ?? [];
}

export interface WeaponPrefabCoverageReport {
  generatedAt: string;
  styleCount: number;
  weaponTypes: number;
  totalSlots: number;
  ready: number;
  fallback: number;
  missing: number;
  productionReadySlots: number;
  byType: Record<
    string,
    { ready: number; fallback: number; missing: number; productionReady: boolean }
  >;
  gaps: Array<{ weaponType: string; styleId: string; notes?: string }>;
}

export function buildWeaponPrefabCoverage(): WeaponPrefabCoverageReport {
  let ready = 0;
  let fallback = 0;
  let missing = 0;
  const byType: WeaponPrefabCoverageReport['byType'] = {};
  const gaps: WeaponPrefabCoverageReport['gaps'] = [];

  for (const wt of PRODUCTION_WEAPON_TYPES) {
    const row = WEAPON_PREFAB_MATRIX[wt];
    let r = 0;
    let f = 0;
    let m = 0;
    for (const p of row) {
      if (p.status === 'ready') r++;
      else if (p.status === 'fallback') f++;
      else {
        m++;
        gaps.push({ weaponType: wt, styleId: p.styleId, notes: p.notes });
      }
    }
    ready += r;
    fallback += f;
    missing += m;
    byType[wt] = {
      ready: r,
      fallback: f,
      missing: m,
      productionReady: m === 0 && r + f === WEAPON_STYLE_COUNT,
    };
  }

  const total = PRODUCTION_WEAPON_TYPES.length * WEAPON_STYLE_COUNT;
  return {
    generatedAt: new Date().toISOString(),
    styleCount: WEAPON_STYLE_COUNT,
    weaponTypes: PRODUCTION_WEAPON_TYPES.length,
    totalSlots: total,
    ready,
    fallback,
    missing,
    productionReadySlots: ready + fallback,
    byType,
    gaps,
  };
}

/**
 * Map power tier (1–8) → preferred style index for default equip.
 * T1–T4 → styles 1–4 (copper…diamond); T5+ → style 5–6 cycle.
 */
export function styleIndexForPowerTier(tier: number): WeaponStyleIndex {
  const t = Math.max(1, Math.min(8, tier));
  if (t <= 4) return t as WeaponStyleIndex;
  if (t <= 6) return 5;
  return 6;
}
