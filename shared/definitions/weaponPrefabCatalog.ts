/**
 * Production weapon prefab catalog — **6 styles × each weapon type**.
 *
 * Source pipeline (author machine, 2026-07-24):
 *   D:\Games\Models\_codex_prod\dist\  → converted GLB + collider + manifest
 *   D:\Games\Models\_codex_prod\mesh-registry.json → R2 CDN keys
 *   Packs: glitch-weapons (4 material styles), voxel-weapons, cold-biome viking
 *
 * Styles (art skins / mesh family — fixed for the item's life):
 *   1 copper   2 silver   3 gold   4 diamond   5 voxel   6 cold/viking (or fallback)
 *
 * HARD RULE: T1–T8 use the **same prefab GLB**. Tier never swaps the asset.
 *   • Looks: weaponTierVisuals shader stack (color, roughness, glow, particles)
 *   • Power: item UUID stats, skill options, passives, procs (upgrade in place)
 *
 * Style picks the mesh once at craft/loot. Tier only upgrades that instance.
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
  'GRIMOIRE',
  'RANGER_LOG',
  'BATTLE_DUAL',
  'CHAIN_KNIFE',
  'PICKAXE',
  'SHOVEL',
  'GUN',
] as const;

export type ProductionWeaponType = (typeof PRODUCTION_WEAPON_TYPES)[number];

/**
 * Class ownership of special weapon types (player request).
 * - WAND → mage
 * - GRIMOIRE → worge
 * - RANGER_LOG → ranger (ammo/log toggle kit)
 * - BATTLE_DUAL → warrior (dual-wield battle system)
 */
export type WeaponClassRole = 'mage' | 'worge' | 'ranger' | 'warrior' | 'any';

export const WEAPON_CLASS_ROLE: Partial<
  Record<ProductionWeaponType, WeaponClassRole>
> = {
  WAND: 'mage',
  STAFF: 'mage',
  GRIMOIRE: 'worge',
  RANGER_LOG: 'ranger',
  BOW: 'ranger',
  GUN: 'ranger',
  BATTLE_DUAL: 'warrior',
  SWORD: 'warrior',
  GREATSWORD: 'warrior',
  AXE: 'warrior',
  SHIELD: 'warrior',
  CHAIN_KNIFE: 'any',
  DAGGER: 'any',
};

export type PrefabStatus = 'ready' | 'fallback' | 'missing';

/**
 * Icon ↔ mesh match guide — skill/UI icons should use these colors & materials
 * so the 2D icon reads as the same weapon style as the 3D GLB.
 */
export interface WeaponStyleIconMatch {
  styleId: WeaponStyleId;
  /** Primary metal / wood color for icon fill */
  primaryHex: string;
  /** Secondary accent (grip, runes, stock) */
  secondaryHex: string;
  /** Emissive / glow for high styles */
  glowHex: string;
  /** Texture keywords for icon art direction */
  textureNotes: string;
  /** Pack icon index hint under /icons/pack/weapons */
  packIconHint: string;
  /** Named sprite from weaponSpriteMap (guns) */
  spriteId?: string;
}

export const STYLE_ICON_MATCH: Record<WeaponStyleId, WeaponStyleIconMatch> = {
  copper: {
    styleId: 'copper',
    primaryHex: '#b87333',
    secondaryHex: '#5c4033',
    glowHex: '#000000',
    textureNotes: 'Dull brass/copper metal, brown leather wrap, no glow',
    packIconHint: 'Crossbow_01.png',
    spriteId: 'blackpowder_blaster',
  },
  silver: {
    styleId: 'silver',
    primaryHex: '#c0c0c0',
    secondaryHex: '#4a5568',
    glowHex: '#a0aec0',
    textureNotes: 'Polished steel/silver, cool grey stock, faint edge shine',
    packIconHint: 'Crossbow_05.png',
    spriteId: 'ironstorm_gun',
  },
  gold: {
    styleId: 'gold',
    primaryHex: '#d4af37',
    secondaryHex: '#8b4513',
    glowHex: '#f6e05e',
    textureNotes: 'Ornate gold inlay, warm wood, pyro/rifle brass fittings',
    packIconHint: 'Crossbow_08.png',
    spriteId: 'emberrifle',
  },
  diamond: {
    styleId: 'diamond',
    primaryHex: '#a5f3fc',
    secondaryHex: '#1e3a5f',
    glowHex: '#67e8f9',
    textureNotes: 'Crystal/ice-blue metal, harpoon-like spear tip, cyan edge',
    packIconHint: 'Crossbow_10.png',
    spriteId: 'wraithbarrel',
  },
  voxel: {
    styleId: 'voxel',
    primaryHex: '#68d391',
    secondaryHex: '#2d3748',
    glowHex: '#9ae6b4',
    textureNotes: 'Blocky low-poly silhouette, chunky pixels, chicken-gun playful proportions',
    packIconHint: 'Crossbow_03.png',
    spriteId: 'duskblaster',
  },
  cold_viking: {
    styleId: 'cold_viking',
    primaryHex: '#e2e8f0',
    secondaryHex: '#2b6cb0',
    glowHex: '#90cdf4',
    textureNotes: 'Frost steel + blue runes — 6th gun style TBD (user will add mesh)',
    packIconHint: 'Crossbow_12.png',
    spriteId: 'bloodcannon',
  },
};

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
  /** Class role when this type is class-locked */
  classRole?: WeaponClassRole;
  /** Icon match palette for this style */
  iconMatch?: WeaponStyleIconMatch;
  /**
   * Preferred UI icon when it is art of **this** mesh (e.g. craftpix shield PNG).
   * Cool unique weapons may leave this null — runtime generates a product shot
   * from the GLB so the inventory icon is the weapon in fact.
   */
  iconUrl?: string | null;
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
    classRole: WEAPON_CLASS_ROLE[weaponType],
    iconMatch: STYLE_ICON_MATCH[styleId],
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
    classRole: WEAPON_CLASS_ROLE[weaponType],
    iconMatch: STYLE_ICON_MATCH[styleId],
    iconUrl: null,
  };
}

/**
 * Catalog plate for equipped/selected equipment when curated art exists.
 * Prefer mesh-true generate (`equipmentIconFromMesh`) for cool unique weapons;
 * this returns only explicit iconUrl (e.g. shield craftpix matching that mesh).
 */
export function getPrefabIconUrl(
  weaponType: string,
  style: WeaponStyleIndex | WeaponStyleId = 1,
): string | null {
  const p = getWeaponPrefab(weaponType, style);
  if (!p) return null;
  return p.iconUrl ?? null;
}

/** All selectable shield options with mesh + icon for UI pickers. */
export function listShieldSelections(): Array<{
  id: string;
  styleId: WeaponStyleId;
  styleIndex: WeaponStyleIndex;
  label: string;
  meshUrl: string | null;
  iconUrl: string;
  productionReady: boolean;
}> {
  return listPrefabsForType('SHIELD').map((p) => ({
    id: p.id,
    styleId: p.styleId,
    styleIndex: p.styleIndex,
    label: p.label,
    meshUrl: p.cdnUrl ?? p.localPath,
    iconUrl:
      p.iconUrl ??
      `/icons/weapons/shields/style_${p.styleId}.png`,
    productionReady: p.productionReady,
  }));
}

function gunLocal(
  styleId: WeaponStyleId,
  file: string,
): {
  r2Key: string;
  cdnUrl: string;
  localPath: string;
  colliderUrl: string | null;
} {
  const r2Key = `models/codex/guns/${file}`;
  return {
    r2Key,
    cdnUrl: `${CDN}/${r2Key}`,
    localPath: `/models/codex/guns/${file}`,
    colliderUrl: null,
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
    classRole: WEAPON_CLASS_ROLE[weaponType],
    iconMatch: STYLE_ICON_MATCH[styleId],
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

  /**
   * SHIELD — best-looking meshes + **selected shield icons** (craftpix 50-pack).
   * UI should show iconUrl for the equipped/selected style, not a generic pack plate.
   */
  SHIELD: (() => {
    /** Best meshes paired with distinct high-quality icons */
    const options: Array<{
      styleId: WeaponStyleId;
      mesh: ReturnType<typeof viking> | {
        r2Key: string;
        cdnUrl: string;
        localPath: string;
        colliderUrl: string | null;
      };
      icon: string;
      label: string;
      pack: string;
    }> = [
      {
        styleId: 'copper',
        mesh: viking('shield'),
        icon: '/icons/weapons/shields/style_copper.png',
        label: 'Viking Round (copper/iron look)',
        pack: 'cold-biome',
      },
      {
        styleId: 'silver',
        mesh: viking('shieldrune'),
        icon: '/icons/weapons/shields/style_silver.png',
        label: 'Viking Rune Shield',
        pack: 'cold-biome',
      },
      {
        styleId: 'gold',
        mesh: {
          r2Key: 'models/equipment/shields/shield_of_fire.glb',
          cdnUrl: `${CDN}/models/equipment/shields/shield_of_fire.glb`,
          localPath: '/models/equipment/shields/shield_of_fire.glb',
          colliderUrl: null,
        },
        icon: '/icons/weapons/shields/fire_shield.png',
        label: 'Shield of Fire',
        pack: 'downloads',
      },
      {
        styleId: 'diamond',
        mesh: {
          r2Key: 'models/equipment/shields/shield_murozondsgaze_v002stylized.glb',
          cdnUrl: `${CDN}/models/equipment/shields/shield_murozondsgaze_v002stylized.glb`,
          localPath: '/models/equipment/shields/shield_murozondsgaze_v002stylized.glb',
          colliderUrl: null,
        },
        icon: '/icons/weapons/shields/murozond.png',
        label: "Murozond's Gaze (stylized)",
        pack: 'downloads',
      },
      {
        styleId: 'voxel',
        mesh: {
          r2Key: 'models/equipment/shields/pro4ik_utcm_shield.glb',
          cdnUrl: `${CDN}/models/equipment/shields/pro4ik_utcm_shield.glb`,
          localPath: '/models/equipment/shields/pro4ik_utcm_shield.glb',
          colliderUrl: null,
        },
        icon: '/icons/weapons/shields/utcm.png',
        label: 'UTCM Low-poly Shield',
        pack: 'downloads',
      },
      {
        styleId: 'cold_viking',
        mesh: {
          r2Key: 'models/equipment/shields/crimson_rose_shield.glb',
          cdnUrl: `${CDN}/models/equipment/shields/crimson_rose_shield.glb`,
          localPath: '/models/equipment/shields/crimson_rose_shield.glb',
          colliderUrl: null,
        },
        icon: '/icons/weapons/shields/crimson_rose.png',
        label: 'Crimson Rose Shield',
        pack: 'downloads',
      },
    ];

    return options.map((opt, i) => {
      const entry = ready(
        'SHIELD',
        (i + 1) as WeaponStyleIndex,
        opt.styleId,
        { ...opt.mesh, colliderUrl: opt.mesh.colliderUrl ?? null },
        opt.pack,
        `${opt.label} — icon from selected shield art`,
      );
      entry.iconUrl = opt.icon;
      entry.label = `SHIELD · ${opt.label}`;
      return entry;
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
  /**
   * T1 race-element staffs (6 races × element for spell VFX tests).
   * Style index maps 1:1 to race order: human, barbarian, elf, dwarf, orc, undead.
   */
  STAFF: (() => {
    const raceStaffs: Array<{
      styleId: WeaponStyleId;
      stem: string;
      note: string;
    }> = [
      { styleId: 'copper', stem: 'human_holy', note: 'Human T1 holy staff' },
      { styleId: 'silver', stem: 'barbarian_fire', note: 'Barbarian T1 fire staff' },
      { styleId: 'gold', stem: 'elf_nature', note: 'Elf T1 nature staff' },
      { styleId: 'diamond', stem: 'dwarf_arcane', note: 'Dwarf T1 arcane staff' },
      { styleId: 'voxel', stem: 'orc_shadow', note: 'Orc T1 shadow staff' },
      { styleId: 'cold_viking', stem: 'undead_frost', note: 'Undead T1 frost staff' },
    ];
    return raceStaffs.map((rs, i) => {
      const r2Key = `models/codex/t1/staffs/${rs.stem}.glb`;
      return ready(
        'STAFF',
        (i + 1) as WeaponStyleIndex,
        rs.styleId,
        {
          r2Key,
          cdnUrl: `${CDN}/${r2Key}`,
          localPath: `/models/codex/t1/staffs/${rs.stem}.glb`,
          colliderUrl: null,
        },
        't1-race-element-staffs',
        rs.note,
      );
    });
  })(),
  /** Style 1 = bone dagger T0 mesh; 2–6 fallback sword until full dagger pack. */
  DAGGER: (() => {
    const bone = {
      r2Key: 'models/codex/t0/bone_dagger.glb',
      cdnUrl: `${CDN}/models/codex/t0/bone_dagger.glb`,
      localPath: '/models/codex/t0/bone_dagger.glb',
      colliderUrl: null as string | null,
    };
    return WEAPON_STYLE_DEFS.map((s, i) => {
      if (i === 0) {
        return ready(
          'DAGGER',
          1,
          s.id,
          bone,
          't0-bone-dagger',
          'T0 bone dagger (2bone_knife.glb) — copper/crude style',
        );
      }
      return fallbackFrom(
        'DAGGER',
        (i + 1) as WeaponStyleIndex,
        s.id,
        rowFromGlitchTool('SWORD', 'sword', 'sword', null)[Math.min(i, 3)]!,
        'Temporary: sword mesh until remaining dagger styles convert',
      );
    });
  })(),
  MACE: WEAPON_STYLE_DEFS.map((s, i) =>
    fallbackFrom(
      'MACE',
      (i + 1) as WeaponStyleIndex,
      s.id,
      rowFromGlitchTool('AXE', 'axe', 'axe', 'axe')[Math.min(i, 5)]!,
      'Temporary: axe mesh until mace pack converts',
    ),
  ),
  /** Spear options from recent downloads / ingest. */
  SPEAR: (() => {
    const spears = [
      {
        file: 'red_spear.glb',
        path: '/models/warlords/ingest/equipment/weapons/red_spear.glb',
        r2: 'models/warlords/ingest/equipment/weapons/red_spear.glb',
      },
      {
        file: 'egyptian_spear.glb',
        path: '/models/warlords/ingest/equipment/weapons/egyptian_spear.glb',
        r2: 'models/warlords/ingest/equipment/weapons/egyptian_spear.glb',
      },
      {
        file: 'fallout_spear_handpainted.glb',
        path: '/models/warlords/ingest/equipment/weapons/fallout_spear_handpainted.glb',
        r2: 'models/warlords/ingest/equipment/weapons/fallout_spear_handpainted.glb',
      },
      {
        file: 'skyrend_javelin.glb',
        path: '/models/warlords/ingest/equipment/weapons/skyrend_javelin.glb',
        r2: 'models/warlords/ingest/equipment/weapons/skyrend_javelin.glb',
      },
    ];
    return WEAPON_STYLE_DEFS.map((s, i) => {
      const sp = spears[i % spears.length]!;
      return ready(
        'SPEAR',
        (i + 1) as WeaponStyleIndex,
        s.id,
        {
          r2Key: sp.r2,
          cdnUrl: `${CDN}/${sp.r2}`,
          localPath: sp.path,
          colliderUrl: null,
        },
        'warlords-ingest',
        `Spear style ${s.id} ← ${sp.file}; icon tint ${STYLE_ICON_MATCH[s.id].primaryHex}`,
      );
    });
  })(),
  HAMMER: WEAPON_STYLE_DEFS.map((s, i) =>
    fallbackFrom(
      'HAMMER',
      (i + 1) as WeaponStyleIndex,
      s.id,
      rowFromGlitchTool('PICKAXE', 'picaxe', 'pickaxe', null)[Math.min(i, 4)]!,
      'Temporary: pickaxe mesh until hammer pack converts',
    ),
  ),
  /** Mage item — light focus, spell channel (not warrior steel). */
  WAND: WEAPON_STYLE_DEFS.map((s, i) =>
    missing(
      'WAND',
      (i + 1) as WeaponStyleIndex,
      s.id,
      'MAGE item. Sources: magical_wand_the_2heart_of_stone, wand_pheonixflare, poisonous_wand, viktors_cane. Convert 6 styles.',
    ),
  ),

  /** Worge item — shapeshift grimoire (not a mage tome). */
  GRIMOIRE: WEAPON_STYLE_DEFS.map((s, i) =>
    missing(
      'GRIMOIRE',
      (i + 1) as WeaponStyleIndex,
      s.id,
      'WORGE item. Shapeshift grimoire — need 6 form-bound cover styles.',
    ),
  ),

  /** Ranger item — ammo/log kit + aspect toggles. */
  RANGER_LOG: WEAPON_STYLE_DEFS.map((s, i) =>
    missing(
      'RANGER_LOG',
      (i + 1) as WeaponStyleIndex,
      s.id,
      'RANGER item. Ranger log / ammo book — pair with bow & gun styles.',
    ),
  ),

  /** Warrior item — dual-wield battle system (not dual knives). */
  BATTLE_DUAL: WEAPON_STYLE_DEFS.map((s, i) => {
    // Prefer twinblade / dual mesh when available via ingest
    const dualPaths = {
      r2Key: 'models/warlords/ingest/equipment/weapons/demonic_twinblades_stylized_weapon_free.glb',
      cdnUrl: `${CDN}/models/warlords/ingest/equipment/weapons/demonic_twinblades_stylized_weapon_free.glb`,
      localPath:
        '/models/warlords/ingest/equipment/weapons/demonic_twinblades_stylized_weapon_free.glb',
      colliderUrl: null as string | null,
    };
    if (i === 0) {
      return ready(
        'BATTLE_DUAL',
        1,
        s.id,
        dualPaths,
        'warlords-ingest',
        'WARRIOR dual-wield battle system — twinblades multipack (style 1); isolate more styles',
      );
    }
    return fallbackFrom(
      'BATTLE_DUAL',
      (i + 1) as WeaponStyleIndex,
      s.id,
      ready('BATTLE_DUAL', 1, 'copper', dualPaths, 'warlords-ingest'),
      'WARRIOR dual — reuse twinblades until 6 dual styles isolated',
    );
  }),

  /**
   * Two-hand knives + chain knives.
   * Chain throw: ranged tether shot → next attack dashes to enemy with chain/dagger
   * returning to the knife user.
   */
  CHAIN_KNIFE: WEAPON_STYLE_DEFS.map((s, i) => {
    const bone = {
      r2Key: 'models/warlords/ingest/equipment/weapons/2bone_knife.glb',
      cdnUrl: `${CDN}/models/warlords/ingest/equipment/weapons/2bone_knife.glb`,
      localPath: '/models/warlords/ingest/equipment/weapons/2bone_knife.glb',
      colliderUrl: null as string | null,
    };
    if (i < 4) {
      return ready(
        'CHAIN_KNIFE',
        (i + 1) as WeaponStyleIndex,
        s.id,
        bone,
        'warlords-ingest',
        `2H knife style ${s.id} — tint mesh; chain throw + yank dash skill set`,
      );
    }
    return fallbackFrom(
      'CHAIN_KNIFE',
      (i + 1) as WeaponStyleIndex,
      s.id,
      ready('CHAIN_KNIFE', 1, 'copper', bone, 'warlords-ingest'),
      'Chain knife — more styles from sekiro_hook_sword / twinblades multipacks',
    );
  }),

  /**
   * GUN — 5 of 6 styles assigned from downloaded pack + individuals.
   * Style 6 (cold_viking / bloodcannon) left open until final mesh arrives.
   *
   * | Style | Mesh |
   * |-------|------|
   * | copper | gun.glb (stock pistol) |
   * | silver | steampunk_revolver_with_animations.glb |
   * | gold | pyroslingers_rifle.glb |
   * | diamond | harpoon_gun.glb |
   * | voxel | chicken_gun_fruzer_bhop_river.glb |
   * | cold_viking | TBD (user) |
   *
   * Multipack also staged: modular_steampunk_guns_pack.glb
   */
  GUN: (() => {
    const files: Array<{
      styleId: WeaponStyleId;
      file: string;
      note: string;
    }> = [
      {
        styleId: 'copper',
        file: 'gun_style_copper.glb',
        note: 'Brass/copper stock pistol — blackpowder_blaster icon',
      },
      {
        styleId: 'silver',
        file: 'gun_style_silver.glb',
        note: 'Steampunk revolver — ironstorm_gun icon, silver steel',
      },
      {
        styleId: 'gold',
        file: 'gun_style_gold.glb',
        note: 'Pyroslinger rifle — emberrifle icon, gold/brass inlay',
      },
      {
        styleId: 'diamond',
        file: 'gun_style_diamond.glb',
        note: 'Harpoon gun — wraithbarrel/cyan crystal tip icon',
      },
      {
        styleId: 'voxel',
        file: 'gun_style_voxel.glb',
        note: 'Chicken gun low-poly — duskblaster blocky icon',
      },
    ];
    const out: WeaponPrefabEntry[] = files.map((f, i) =>
      ready(
        'GUN',
        (i + 1) as WeaponStyleIndex,
        f.styleId,
        gunLocal(f.styleId, f.file),
        'guns-download',
        f.note,
      ),
    );
    out.push(
      missing(
        'GUN',
        6,
        'cold_viking',
        'Style 6 open — add frost/bloodcannon mesh when ready. Icon palette: ice steel #e2e8f0 + blue runes.',
      ),
    );
    return out;
  })(),
};

/** Prefer ready mesh; attach icon match for UI tinting. */
export function getStyleIconMatch(styleId: WeaponStyleId): WeaponStyleIconMatch {
  return STYLE_ICON_MATCH[styleId];
}

export function getClassRoleForWeapon(
  weaponType: string,
): WeaponClassRole {
  const key = weaponType.toUpperCase() as ProductionWeaponType;
  return WEAPON_CLASS_ROLE[key] ?? 'any';
}

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
 * @deprecated Do NOT map tier → style. Style is mesh identity; tier is looks+stats
 * on the same asset. Kept as no-op default (style 1) for old call sites.
 */
export function styleIndexForPowerTier(_tier: number): WeaponStyleIndex {
  return 1;
}
