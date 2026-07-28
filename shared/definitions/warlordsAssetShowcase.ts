/**
 * Warlords Asset Showcase SSOT — mounts, buildings, benches, towers, boats,
 * camp upgrades, siege, and related recipes / costs / HP / abilities.
 *
 * Sources (do not invent silent duplicates):
 *   - survivalKitBuildCatalog (benches, towers, camp stages, modular, docks)
 *   - shipCatalog + sailing class stats (boats)
 *   - fleet/vehicles (race cavalry mounts + siege)
 *   - campUnits (bench professions, tower unit buffs, T0 loadout)
 *   - waveboard (back-slot watercraft)
 *   - ummorpgDeployables (mount deployables)
 *
 * Runtime placeables also merge client BuildAssetManifest (see page).
 *
 * Page: /asset-showcase · docs/WARLORDS_ASSET_SHOWCASE.md
 */

import {
  ALL_SURVIVAL_BUILD_PIECES,
  BENCH_PIECES,
  TOWER_PIECES,
  CAMP_STAGE_PIECES,
  DOCK_PIECES,
  MODULAR_T1_PIECES,
  RACE_HOME_PIECES,
  RTS_BUILDING_PIECES,
} from './survivalKitBuildCatalog';
import type { BuildPieceDef } from './buildSystem';
import { SHIP_CATALOG, DOCK_GLB, type ShipCatalogEntry } from './shipCatalog';
import {
  RACE_VEHICLES,
  listMountDeployables,
  listSiegeDeployables,
  type VehicleRaceId,
} from '../fleet/vehicles';
import {
  CAMP_BUILDING_UNIT_BUFFS,
  CAMP_BENCH_PROFESSIONS,
  CAMP_UNIT_T0_LOADOUT,
  CAMP_UNIT_BASE_STATS,
  CAMP_UNIT_ORDERS,
  CLAIM_FLAG_SPAWN,
} from './campUnits';
import { WAVEBOARD_ITEM, WAVEBOARD_RECIPE, WAVEBOARD_GLB } from './waveboard';

// Re-export list helpers for consumers
export { listMountDeployables, listSiegeDeployables };

// ── Unified showcase card ────────────────────────────────────────────────────

export type ShowcaseFamily =
  | 'mount'
  | 'boat'
  | 'bench'
  | 'tower'
  | 'building'
  | 'camp'
  | 'dock'
  | 'siege'
  | 'modular'
  | 'addon'
  | 'unit';

export interface ShowcaseCost {
  itemId: string;
  quantity: number;
  /** Human label when known */
  label?: string;
}

export interface ShowcaseStatBlock {
  maxHp?: number;
  armor?: number;
  defense?: number;
  speed?: number;
  crewCap?: number;
  cargoCap?: number;
  cannonSlots?: number;
  storageSlots?: number;
  craftTier?: number;
  /** Move speed m/s for mounts / boats */
  moveSpeedMps?: number;
}

export interface ShowcaseAbility {
  id: string;
  name: string;
  description: string;
}

export interface ShowcaseAttachment {
  kind: 'weapon' | 'armor' | 'tool' | 'node' | 'addon' | 'skill' | 'profession';
  id: string;
  label: string;
  notes?: string;
}

export interface WarlordsShowcaseAsset {
  id: string;
  name: string;
  family: ShowcaseFamily;
  /** Sub-group for filters (e.g. race, profession, ship class) */
  tags: string[];
  description: string;
  /** CDN or public GLB path */
  modelPath: string | null;
  nodeName?: string;
  /** Extra multipack nodes composed on place */
  extraNodes?: string[];
  scale?: number;
  sizeM?: [number, number, number];
  /** Build / craft recipe */
  cost: ShowcaseCost[];
  goldCost?: number;
  recipeId?: string;
  craftStation?: string;
  craftTimeSec?: number;
  stats: ShowcaseStatBlock;
  abilities: ShowcaseAbility[];
  attachments: ShowcaseAttachment[];
  /** What placing unlocks / add-ons enable */
  unlocks?: string[];
  addOns?: string[];
  status: 'live' | 'partial' | 'planned';
  ssot: string[];
}

export interface WarlordsAssetShowcaseCatalog {
  version: string;
  updated: string;
  title: string;
  summary: string;
  counts: Record<ShowcaseFamily | 'total', number>;
  families: ShowcaseFamily[];
  assets: WarlordsShowcaseAsset[];
  campUnitRules: {
    baseStats: typeof CAMP_UNIT_BASE_STATS;
    t0Loadout: typeof CAMP_UNIT_T0_LOADOUT;
    claimFlag: typeof CLAIM_FLAG_SPAWN;
    orders: typeof CAMP_UNIT_ORDERS;
    buildingBuffs: typeof CAMP_BUILDING_UNIT_BUFFS;
    benchProfessions: typeof CAMP_BENCH_PROFESSIONS;
  };
  ssotIndex: Record<string, string>;
}

// ── Item labels (common) ─────────────────────────────────────────────────────

const ITEM_LABELS: Record<string, string> = {
  wood: 'Wood',
  stone: 'Stone',
  iron: 'Iron',
  cloth: 'Cloth',
  rope: 'Rope',
  fiber: 'Fiber',
  glass: 'Glass',
  sapling: 'Sapling',
  herb: 'Herb',
  arcane_dust: 'Arcane Dust',
  ember_core: 'Ember Core',
  t0_wood_scrap: 'Wood Scraps',
  t0_scrap_cloth: 'Scrap Cloth',
  gold: 'Gold',
};

function costOf(
  items: Array<{ itemId: string; quantity: number }>,
): ShowcaseCost[] {
  return items.map((c) => ({
    itemId: c.itemId,
    quantity: c.quantity,
    label: ITEM_LABELS[c.itemId] ?? c.itemId,
  }));
}

function pieceToAsset(
  p: BuildPieceDef,
  family: ShowcaseFamily,
  extra?: Partial<WarlordsShowcaseAsset>,
): WarlordsShowcaseAsset {
  const tags = [p.layer, p.category, p.profession].filter(Boolean) as string[];
  const attachments: ShowcaseAttachment[] = [];
  if (p.extraNodes?.length) {
    for (const n of p.extraNodes) {
      attachments.push({ kind: 'node', id: n, label: n, notes: 'Composed multipack node' });
    }
  }
  if (p.profession) {
    attachments.push({
      kind: 'profession',
      id: p.profession,
      label: p.profession,
      notes: p.craftUnlockLevel != null ? `Unlock level ${p.craftUnlockLevel}` : undefined,
    });
  }
  const defense = p.effect?.type === 'defense' ? p.effect.value : undefined;
  const storage =
    p.effect?.type === 'storage' ? p.effect.value : undefined;
  const abilities: ShowcaseAbility[] = [];
  if (p.effect) {
    abilities.push({
      id: `${p.id}_effect`,
      name: p.effect.type,
      description: p.effect.description,
    });
  }
  // Derive HP from defense / size for showcase (structural pieces use size volume heuristic)
  const maxHp =
    family === 'tower'
      ? 400 + (defense ?? 50) * 4
      : family === 'bench'
        ? 120
        : family === 'dock'
          ? 200
          : family === 'camp'
            ? 150 + (p.campStage ?? 0) * 40
            : p.effect?.type === 'defense'
              ? 80 + p.effect.value * 3
              : 100;

  return {
    id: p.id,
    name: p.name,
    family,
    tags,
    description: p.effect?.description ?? p.notes ?? p.name,
    modelPath: p.sourceGlb,
    nodeName: p.nodeName,
    extraNodes: p.extraNodes,
    scale: p.scale,
    sizeM: p.size as [number, number, number] | undefined,
    cost: costOf(p.cost ?? []),
    craftStation: p.profession ? `${p.profession} bench` : p.layer,
    stats: {
      maxHp,
      defense,
      storageSlots: storage,
      craftTier: p.tier,
    },
    abilities,
    attachments,
    status: 'live',
    ssot: ['shared/definitions/survivalKitBuildCatalog.ts'],
    ...extra,
  };
}

// ── Mounts ───────────────────────────────────────────────────────────────────

/** Per-race cavalry combat flavor for showcase (mount locomotion is shared). */
const MOUNT_SHOWCASE_STATS: Record<
  VehicleRaceId,
  { maxHp: number; armor: number; moveSpeedMps: number; ability: string }
> = {
  human: {
    maxHp: 180,
    armor: 6,
    moveSpeedMps: 9.5,
    ability: 'Steady charge — balanced cavalry for open fields.',
  },
  barbarian: {
    maxHp: 200,
    armor: 4,
    moveSpeedMps: 10.2,
    ability: 'War-steed fury — higher top speed, lighter barding.',
  },
  elf: {
    maxHp: 160,
    armor: 5,
    moveSpeedMps: 10.5,
    ability: 'Silvan gallop — fastest race mount, lighter frame.',
  },
  dwarf: {
    maxHp: 220,
    armor: 10,
    moveSpeedMps: 8.2,
    ability: 'Ironhoof — heavy barding, slower but tanky.',
  },
  orc: {
    maxHp: 210,
    armor: 8,
    moveSpeedMps: 9.0,
    ability: 'Warg charge — high HP, strong impact on collision.',
  },
  undead: {
    maxHp: 170,
    armor: 7,
    moveSpeedMps: 8.8,
    ability: 'Deathless trot — does not tire; spectral trail VFX.',
  },
};

export function buildMountAssets(): WarlordsShowcaseAsset[] {
  return listMountDeployables().map((m) => {
    const def = RACE_VEHICLES[m.raceId].mount!;
    const st = MOUNT_SHOWCASE_STATS[m.raceId];
    return {
      id: m.id,
      name: m.name,
      family: 'mount' as const,
      tags: ['cavalry', m.raceId, 'ummorpg'],
      description: `Race cavalry mount for ${m.raceId}. Rider bone ${def.riderBone}; offset Y ${def.riderOffsetY} m.`,
      modelPath: m.modelPath,
      scale: 1,
      sizeM: [2.2, 2.4, 3.2],
      cost: costOf([
        { itemId: 'wood', quantity: 0 },
        { itemId: 'cloth', quantity: 12 },
        { itemId: 'iron', quantity: 8 },
      ]),
      goldCost: 750,
      craftStation: 'stable / faction city',
      craftTimeSec: 60,
      stats: {
        maxHp: st.maxHp,
        armor: st.armor,
        moveSpeedMps: st.moveSpeedMps,
        speed: st.moveSpeedMps,
      },
      abilities: [
        {
          id: `${m.id}_gallop`,
          name: 'Gallop',
          description: st.ability,
        },
        {
          id: `${m.id}_dismount`,
          name: 'Mount / Dismount',
          description: 'Load via MountSystem; attach rider to saddle bone.',
        },
      ],
      attachments: [
        {
          kind: 'addon',
          id: def.riderBone,
          label: `Rider bone: ${def.riderBone}`,
        },
        {
          kind: 'addon',
          id: 'saddle',
          label: 'Saddle / rider offset',
          notes: `+${def.riderOffsetY} m Y`,
        },
      ],
      unlocks: ['Open-world travel speed', 'Faction hero campaign commander path'],
      addOns: ['Optional barding armor (planned)', 'Race-specific anim packs on CDN'],
      status: 'partial',
      ssot: [
        'shared/fleet/vehicles.ts',
        'client/src/island3d/systems/MountSystem.ts',
        'shared/definitions/warlordsSystemsCatalog.ts',
      ],
    };
  });
}

// ── Boats ────────────────────────────────────────────────────────────────────

/** Ship class combat stats (from sailing SHIP_TYPES — mirrored for shared). */
export const SHIP_CLASS_STATS = {
  sloop: { health: 500, maxSpeed: 12, turnRate: 0.8, cannonSlots: 4, crew: 4, cargo: 20 },
  brigantine: { health: 800, maxSpeed: 10, turnRate: 0.6, cannonSlots: 8, crew: 8, cargo: 40 },
  galleon: { health: 1500, maxSpeed: 8, turnRate: 0.4, cannonSlots: 16, crew: 16, cargo: 80 },
  warship: { health: 2500, maxSpeed: 7, turnRate: 0.3, cannonSlots: 24, crew: 24, cargo: 60 },
  frigate: { health: 1200, maxSpeed: 11, turnRate: 0.5, cannonSlots: 12, crew: 12, cargo: 50 },
  manOWar: { health: 4000, maxSpeed: 6, turnRate: 0.25, cannonSlots: 32, crew: 32, cargo: 100 },
} as const;

function shipEntryToAsset(e: ShipCatalogEntry): WarlordsShowcaseAsset {
  const cls = SHIP_CLASS_STATS[e.shipClass] ?? SHIP_CLASS_STATS.sloop;
  return {
    id: `boat_${e.size}`,
    name: e.label,
    family: 'boat',
    tags: [e.size, e.shipClass, e.prefabKey, e.starterFree ? 'starter' : 'craft'],
    description: `${e.label} (${e.shipClass}). Prefab ${e.prefabKey}. ${
      e.starterFree ? 'Starter free at dock.' : 'Craft / purchase at harbor.'
    }`,
    modelPath: e.glbModel,
    sizeM: [8, 4, 18],
    cost: costOf([
      { itemId: 'wood', quantity: e.craftWood },
      { itemId: 'iron', quantity: e.craftIron },
      { itemId: 'cloth', quantity: e.craftCloth },
    ]),
    goldCost: e.craftGold,
    craftStation: 'dock / shipyard',
    craftTimeSec: e.starterFree ? 0 : 30 + e.craftWood / 10,
    stats: {
      maxHp: e.maxHp > 0 ? Math.max(e.maxHp, cls.health / 10) : cls.health,
      moveSpeedMps: e.oceanSpeed,
      speed: e.oceanSpeed,
      crewCap: e.crewCap || cls.crew,
      cargoCap: cls.cargo,
      cannonSlots: e.cannonSlots || cls.cannonSlots,
    },
    abilities: [
      {
        id: `${e.size}_sail`,
        name: 'Sail (T)',
        description: 'Open-water sail drive — exclusive with oars (XOR).',
      },
      {
        id: `${e.size}_oar`,
        name: 'Oars (R)',
        description: 'Row mode for small craft / calm waters.',
      },
      {
        id: `${e.size}_board`,
        name: 'Board / Deck walk',
        description: 'ShipBoardingController + deck physics.',
      },
      ...(e.cannonSlots > 0
        ? [
            {
              id: `${e.size}_cannon`,
              name: 'Broadside cannons',
              description: `${e.cannonSlots} cannon slots — fire from deck / boarding controller.`,
            },
          ]
        : []),
    ],
    attachments: [
      { kind: 'addon', id: 'hull', label: 'Hull sections (sectional damage)' },
      { kind: 'addon', id: 'deck', label: 'Deck walkable' },
      ...(e.cannonSlots > 0
        ? [{ kind: 'weapon' as const, id: 'cannon', label: `Cannons ×${e.cannonSlots}` }]
        : []),
      { kind: 'addon', id: 'sails', label: 'Sail cloth materials' },
    ],
    unlocks: e.starterFree
      ? ['Lobby south dock free ship']
      : ['Ocean deploy', 'Cargo hold for repair wood'],
    addOns: [
      'Sectional hide-chunk damage + hammer repair (−1 wood)',
      'Waveboard back-slot alternate watercraft',
    ],
    status: 'live',
    ssot: [
      'shared/definitions/shipCatalog.ts',
      'client/src/game/sailing/*',
      'client/src/island3d/damage/*',
    ],
  };
}

export function buildBoatAssets(): WarlordsShowcaseAsset[] {
  const catalogShips = SHIP_CATALOG.map(shipEntryToAsset);

  // Extra class roster not yet in craft catalog (planned upgrades)
  const classOnly: WarlordsShowcaseAsset[] = (
    Object.entries(SHIP_CLASS_STATS) as Array<
      [keyof typeof SHIP_CLASS_STATS, (typeof SHIP_CLASS_STATS)[keyof typeof SHIP_CLASS_STATS]]
    >
  )
    .filter(([id]) => !SHIP_CATALOG.some((s) => s.shipClass === id && s.size === id))
    .filter(([id]) => !['sloop', 'galleon'].includes(id)) // already covered by catalog sizes
    .map(([id, st]) => ({
      id: `boat_class_${id}`,
      name: id === 'manOWar' ? "Man O' War" : id[0].toUpperCase() + id.slice(1),
      family: 'boat' as const,
      tags: [id, 'class-stats', 'planned-craft'],
      description: `Combat class stats for ${id}. Prefer SHIP_CATALOG craft rows when purchasing.`,
      modelPath:
        id === 'warship' || id === 'manOWar'
          ? '/models/ships/ship-large.glb'
          : '/models/ships/ship-medium.glb',
      cost: costOf([
        { itemId: 'wood', quantity: st.cargo * 10 },
        { itemId: 'iron', quantity: st.cannonSlots * 4 },
        { itemId: 'cloth', quantity: st.crew * 3 },
      ]),
      goldCost: st.health * 2,
      craftStation: 'shipyard',
      stats: {
        maxHp: st.health,
        moveSpeedMps: st.maxSpeed,
        crewCap: st.crew,
        cargoCap: st.cargo,
        cannonSlots: st.cannonSlots,
      },
      abilities: [
        {
          id: `${id}_broadside`,
          name: 'Broadside',
          description: `${st.cannonSlots} guns · turn ${st.turnRate} rad/s`,
        },
      ],
      attachments: [
        { kind: 'weapon', id: 'cannon', label: `Cannons ×${st.cannonSlots}` },
      ],
      status: 'partial' as const,
      ssot: ['client/src/game/sailing/types.ts SHIP_TYPES'],
    }));

  const waveboard: WarlordsShowcaseAsset = {
    id: WAVEBOARD_ITEM.id,
    name: WAVEBOARD_ITEM.name,
    family: 'boat',
    tags: ['waveboard', 'back-slot', 'dock-craft', 'open-water'],
    description: WAVEBOARD_ITEM.description,
    modelPath: WAVEBOARD_GLB,
    sizeM: [0.8, 0.25, 2.2],
    cost: WAVEBOARD_RECIPE.ingredients.map((i) => ({
      itemId: i.itemId,
      quantity: i.quantity,
      label: i.name,
    })),
    recipeId: WAVEBOARD_RECIPE.id,
    craftStation: WAVEBOARD_RECIPE.station,
    craftTimeSec: WAVEBOARD_RECIPE.craftTime,
    stats: {
      maxHp: 40,
      moveSpeedMps: 11,
      armor: 0,
      crewCap: 1,
    },
    abilities: [
      {
        id: 'wb_ride',
        name: 'Wave ride',
        description: 'tslda-inspired wind + wave thrust on open water.',
      },
      {
        id: 'wb_jump',
        name: 'Jump',
        description: 'Launch off wave crests.',
      },
      {
        id: 'wb_splash',
        name: 'Splash bolt',
        description: 'Shoot water projectile while boarding.',
      },
    ],
    attachments: [
      { kind: 'addon', id: 'back', label: 'Back equipment slot' },
      { kind: 'addon', id: 'sail', label: 'Canvas sail' },
      { kind: 'tool', id: 'handles', label: 'Yellow grips (material SSOT)' },
    ],
    unlocks: ['Deploy hotkey B when equipped'],
    addOns: ['Sectional damage on board mesh (optional)'],
    status: 'live',
    ssot: [
      'shared/definitions/waveboard.ts',
      'client/src/game/sailing/waveboard/*',
    ],
  };

  const enemyStates: WarlordsShowcaseAsset = {
    id: 'boat_enemy_damage_set',
    name: 'Enemy Ship Damage States',
    family: 'boat',
    tags: ['enemy', 'damage-states', 'combat'],
    description:
      'Hostile mid-channel craft use healthy / damaged / sunk GLBs (dangerroom states 0–2).',
    modelPath: '/models/ships/enemy/healthy.glb',
    cost: [],
    stats: { maxHp: 200 },
    abilities: [
      {
        id: 'enemy_state_swap',
        name: 'Damage state swap',
        description: 'HP ratio → healthy (>45%) / damaged / sunk (0).',
      },
    ],
    attachments: [
      { kind: 'addon', id: 'state_0', label: 'healthy.glb' },
      { kind: 'addon', id: 'state_1', label: 'damaged.glb' },
      { kind: 'addon', id: 'state_2', label: 'sunk.glb' },
    ],
    status: 'live',
    ssot: ['client/src/game/sailing/EnemyShipModels.ts'],
  };

  return [...catalogShips, waveboard, enemyStates, ...classOnly];
}

// ── Benches / towers / buildings from survival kit ───────────────────────────

export function buildBenchAssets(): WarlordsShowcaseAsset[] {
  return BENCH_PIECES.map((p) => {
    const profLink = CAMP_BENCH_PROFESSIONS.find((b) =>
      b.stationBuildIds.includes(p.id),
    );
    const a = pieceToAsset(p, 'bench');
    if (profLink) {
      a.abilities.push({
        id: `${p.id}_prof`,
        name: profLink.label,
        description: `${profLink.description} (+${profLink.xpPerCraft} XP/craft, cap L${profLink.maxProfessionLevel})`,
      });
      a.unlocks = [
        ...(a.unlocks ?? []),
        `Profession: ${profLink.profession}`,
      ];
    }
    if (p.id === 'bench_workbench') {
      a.attachments.push(
        { kind: 'tool', id: 'hammer', label: 'Build hammer node' },
        { kind: 'addon', id: 'paper', label: 'Note / blueprint paper' },
      );
      a.addOns = ['T0 camp crafts', 'Camp profession XP'];
    }
    if (p.id === 'bench_anvil_engineer') {
      a.attachments.push({
        kind: 'weapon',
        id: 't0_tools',
        label: 'Unlocks T0 metal tools / weapons crafts',
      });
    }
    return a;
  });
}

export function buildTowerAssets(): WarlordsShowcaseAsset[] {
  const survival = TOWER_PIECES.map((p) => {
    const a = pieceToAsset(p, 'tower');
    // Tower trains units — attach camp buff mirror
    const buff = CAMP_BUILDING_UNIT_BUFFS.tower;
    a.abilities.push({
      id: `${p.id}_train`,
      name: 'Train garrison',
      description: buff.description,
    });
    a.stats.armor = buff.armorBonus;
    a.attachments.push(
      {
        kind: 'weapon',
        id: CAMP_UNIT_T0_LOADOUT.mainHand,
        label: `Units equip ${CAMP_UNIT_T0_LOADOUT.mainHand}`,
      },
      {
        kind: 'armor',
        id: CAMP_UNIT_T0_LOADOUT.armor,
        label: CAMP_UNIT_T0_LOADOUT.armor,
      },
      ...CAMP_UNIT_T0_LOADOUT.weaponSkills.map((sk) => ({
        kind: 'skill' as const,
        id: sk,
        label: sk,
      })),
    );
    a.addOns = [
      `AI mult ×${buff.aiAbilityMult}`,
      `+${buff.maxHpBonus} unit HP`,
      `+${buff.armorBonus} unit armor`,
      'Weapon skill bar for units',
    ];
    a.ssot = [
      ...a.ssot,
      'shared/definitions/campUnits.ts',
    ];
    return a;
  });

  // Camp watchtower upgrade (manifest id)
  const campTower: WarlordsShowcaseAsset = {
    id: 'camp_tower_upgrade',
    name: 'Camp Watchtower',
    family: 'tower',
    tags: ['camp', 'upgrade', 'defense'],
    description: CAMP_BUILDING_UNIT_BUFFS.tower.description,
    modelPath: null,
    sizeM: [3, 8, 3],
    cost: costOf([
      { itemId: 'wood', quantity: 20 },
      { itemId: 'stone', quantity: 10 },
    ]),
    stats: {
      maxHp: 350,
      defense: 50,
      armor: CAMP_BUILDING_UNIT_BUFFS.tower.armorBonus,
    },
    abilities: [
      {
        id: 'camp_tower_spot',
        name: 'Spot enemies',
        description: 'Camp defense / minimap reveal + train units with T0 gear.',
      },
    ],
    attachments: [
      {
        kind: 'weapon',
        id: CAMP_UNIT_T0_LOADOUT.mainHand,
        label: CAMP_UNIT_T0_LOADOUT.mainHand,
      },
      {
        kind: 'armor',
        id: CAMP_UNIT_T0_LOADOUT.armor,
        label: CAMP_UNIT_T0_LOADOUT.armor,
      },
    ],
    unlocks: ['equipT0Weapons', 'weaponSkillUsage'],
    addOns: ['Stacks with storage / fire / barricade buffs'],
    status: 'live',
    ssot: [
      'client/src/island3d/building/BuildAssetManifest.ts',
      'shared/definitions/campUnits.ts',
    ],
  };

  const woodWatch: WarlordsShowcaseAsset = {
    id: 'watchtower',
    name: 'Wooden Watchtower',
    family: 'tower',
    tags: ['defense', 'village'],
    description: 'Reveals nearby enemies on minimap',
    modelPath: '/models/buildings/village/SM_PROP_watchtower_wood_01.glb',
    sizeM: [3, 8, 3],
    cost: costOf([
      { itemId: 'wood', quantity: 20 },
      { itemId: 'stone', quantity: 10 },
    ]),
    stats: { maxHp: 300, defense: 50 },
    abilities: [
      {
        id: 'watch_reveal',
        name: 'Minimap reveal',
        description: 'Reveals nearby enemies on minimap',
      },
    ],
    attachments: [],
    status: 'live',
    ssot: ['client/src/island3d/building/BuildAssetManifest.ts'],
  };

  return [...survival, campTower, woodWatch];
}

export function buildCampAssets(): WarlordsShowcaseAsset[] {
  const stages = CAMP_STAGE_PIECES.map((p) => pieceToAsset(p, 'camp'));
  const docks = DOCK_PIECES.map((p) => pieceToAsset(p, 'dock'));
  const homes = RACE_HOME_PIECES.map((p) =>
    pieceToAsset(p, 'building', {
      tags: ['race_home', p.raceId ?? 'race'],
      status: 'partial',
    }),
  );
  const rts = RTS_BUILDING_PIECES.map((p) =>
    pieceToAsset(p, 'building', {
      tags: ['rts', 'train_unit'],
      attachments: [
        {
          kind: 'weapon',
          id: 't0_kit',
          label: 'Trains AI units with T0 gear path',
        },
      ],
    }),
  );

  const flag: WarlordsShowcaseAsset = {
    id: 'camp_flag',
    name: 'Claim Flag',
    family: 'camp',
    tags: ['flag', 'garrison'],
    description: CAMP_BUILDING_UNIT_BUFFS.flag.description,
    modelPath: null,
    cost: costOf([
      { itemId: 'wood', quantity: 6 },
      { itemId: 'cloth', quantity: 4 },
    ]),
    stats: { maxHp: 80 },
    abilities: [
      {
        id: 'claim_spawn',
        name: 'Spawn garrison',
        description: `Spawns ${CLAIM_FLAG_SPAWN.garrisonSize} unarmed race recruits (${CLAIM_FLAG_SPAWN.namePattern}).`,
      },
    ],
    attachments: [],
    unlocks: ['Own camp', 'F1–F5 unit orders'],
    addOns: CAMP_UNIT_ORDERS.map((o) => `${o.hotkey}: ${o.label}`),
    status: 'live',
    ssot: ['shared/definitions/campUnits.ts', 'shared/definitions/npcCamps.ts'],
  };

  const outpost: WarlordsShowcaseAsset = {
    id: 'npc_camp_base',
    name: 'Outpost Camp',
    family: 'camp',
    tags: ['outpost', 'faction'],
    description:
      'Found a faction camp. Same faction = ally; others are enemies. Add benches, storage, towers.',
    modelPath: '/models/camps/stylized_enemy_camp_scene.glb',
    sizeM: [20, 6, 20],
    cost: costOf([
      { itemId: 'wood', quantity: 40 },
      { itemId: 'stone', quantity: 20 },
      { itemId: 'cloth', quantity: 8 },
    ]),
    stats: { maxHp: 500, defense: 25 },
    abilities: [
      {
        id: 'camp_ally',
        name: 'Faction ally/enemy',
        description: 'Same faction ally; other playable/pirate enemy.',
      },
    ],
    attachments: [],
    unlocks: ['camp_bench', 'camp_storage', 'camp_tower', 'camp_flag'],
    addOns: ['Bench professions', 'Storage haul buffs', 'Tower T0 training'],
    status: 'live',
    ssot: [
      'client/src/island3d/building/BuildAssetManifest.ts',
      'shared/definitions/npcCamps.ts',
    ],
  };

  const storage: WarlordsShowcaseAsset = {
    id: 'camp_storage_upgrade',
    name: 'Camp Storage',
    family: 'addon',
    tags: ['camp', 'storage'],
    description: CAMP_BUILDING_UNIT_BUFFS.storage.description,
    modelPath: null,
    cost: costOf([
      { itemId: 'wood', quantity: 6 },
      { itemId: 'iron', quantity: 2 },
    ]),
    stats: {
      maxHp: 120,
      storageSlots: 20,
      armor: CAMP_BUILDING_UNIT_BUFFS.storage.armorBonus,
    },
    abilities: [
      {
        id: 'haul',
        name: 'Haul buff',
        description: `Harvest yield ×${CAMP_BUILDING_UNIT_BUFFS.storage.harvestYieldMult}`,
      },
    ],
    attachments: [],
    status: 'live',
    ssot: ['shared/definitions/campUnits.ts'],
  };

  const benchUp: WarlordsShowcaseAsset = {
    id: 'camp_bench_upgrade',
    name: 'Camp Bench (upgrade ghost)',
    family: 'bench',
    tags: ['camp', 'upgrade'],
    description: CAMP_BUILDING_UNIT_BUFFS.bench.description,
    modelPath: null,
    cost: costOf([{ itemId: 'wood', quantity: 4 }]),
    stats: { maxHp: 100 },
    abilities: CAMP_BENCH_PROFESSIONS.filter((b) => b.upgradeId === 'camp_bench').map(
      (b) => ({
        id: b.profession,
        name: b.label,
        description: b.description,
      }),
    ),
    attachments: [],
    unlocks: CAMP_BENCH_PROFESSIONS.map((b) => b.profession),
    status: 'live',
    ssot: ['shared/definitions/campUnits.ts'],
  };

  return [
    outpost,
    flag,
    benchUp,
    storage,
    ...stages,
    ...docks,
    ...homes,
    ...rts,
  ];
}

export function buildModularAssets(): WarlordsShowcaseAsset[] {
  return MODULAR_T1_PIECES.map((p) => pieceToAsset(p, 'modular'));
}

export function buildSiegeAssets(): WarlordsShowcaseAsset[] {
  return listSiegeDeployables().map((s) => ({
    id: s.id,
    name: s.name,
    family: 'siege' as const,
    tags: [s.kind, s.raceId, 'ummorpg'],
    description: `${s.kind} siege engine for ${s.raceId} faction kit.`,
    modelPath: s.modelPath,
    sizeM: s.kind === 'ballista' ? [3, 2.2, 4] : [4, 3, 5],
    cost: costOf([
      { itemId: 'wood', quantity: 40 },
      { itemId: 'iron', quantity: 24 },
      { itemId: 'rope', quantity: 8 },
    ]),
    goldCost: 1200,
    craftStation: 'engineer / siege yard',
    stats: {
      maxHp: s.kind === 'ballista' ? 280 : 350,
      armor: 12,
      defense: 40,
    },
    abilities: [
      {
        id: `${s.id}_fire`,
        name: s.kind === 'ballista' ? 'Bolt volley' : 'Stone lob',
        description:
          s.kind === 'ballista'
            ? 'Direct-fire bolts; high accuracy vs units.'
            : 'Arc projectile; damages walls / clusters.',
      },
    ],
    attachments: [
      {
        kind: 'weapon',
        id: s.kind,
        label: s.kind === 'ballista' ? 'Bolt thrower arm' : 'Catapult arm',
      },
    ],
    status: 'partial',
    ssot: ['shared/fleet/vehicles.ts', 'shared/definitions/ummorpgDeployables.ts'],
  }));
}

// ── Full catalog ─────────────────────────────────────────────────────────────

export function buildWarlordsAssetShowcase(): WarlordsAssetShowcaseCatalog {
  const assets: WarlordsShowcaseAsset[] = [
    ...buildMountAssets(),
    ...buildBoatAssets(),
    ...buildBenchAssets(),
    ...buildTowerAssets(),
    ...buildCampAssets(),
    ...buildModularAssets(),
    ...buildSiegeAssets(),
  ];

  // Deduplicate by id (tower/camp may overlap names)
  const byId = new Map<string, WarlordsShowcaseAsset>();
  for (const a of assets) {
    if (!byId.has(a.id)) byId.set(a.id, a);
  }
  const unique = Array.from(byId.values()).sort((a, b) =>
    a.family === b.family ? a.name.localeCompare(b.name) : a.family.localeCompare(b.family),
  );

  const counts = {
    mount: 0,
    boat: 0,
    bench: 0,
    tower: 0,
    building: 0,
    camp: 0,
    dock: 0,
    siege: 0,
    modular: 0,
    addon: 0,
    unit: 0,
    total: unique.length,
  } as WarlordsAssetShowcaseCatalog['counts'];
  for (const a of unique) counts[a.family]++;

  return {
    version: '1.0.0',
    updated: '2026-07-28',
    title: 'Grudge Warlords — In-Game Asset Showcase',
    summary:
      'All mounts, buildings, benches, towers, boats, camp upgrades, modular pieces, and siege engines with craft costs, HP, abilities, armor/weapons, and add-ons for production play.',
    counts,
    families: [
      'mount',
      'boat',
      'bench',
      'tower',
      'building',
      'camp',
      'dock',
      'siege',
      'modular',
      'addon',
    ],
    assets: unique,
    campUnitRules: {
      baseStats: CAMP_UNIT_BASE_STATS,
      t0Loadout: CAMP_UNIT_T0_LOADOUT,
      claimFlag: CLAIM_FLAG_SPAWN,
      orders: CAMP_UNIT_ORDERS,
      buildingBuffs: CAMP_BUILDING_UNIT_BUFFS,
      benchProfessions: CAMP_BENCH_PROFESSIONS,
    },
    ssotIndex: {
      mounts: 'shared/fleet/vehicles.ts + MountSystem',
      boats: 'shared/definitions/shipCatalog.ts + game/sailing',
      benches: 'shared/definitions/survivalKitBuildCatalog.ts BENCH_PIECES',
      towers: 'survivalKitBuildCatalog TOWER_PIECES + campUnits tower buff',
      buildings: 'BuildAssetManifest + survival kit + fantasy village',
      camps: 'npcCamps + campUnits + BuildAssetManifest camp_*',
      waveboard: 'shared/definitions/waveboard.ts',
      repair: 'island3d/damage (hammer + 1 wood)',
      dockGlb: DOCK_GLB,
      survivalPieces: String(ALL_SURVIVAL_BUILD_PIECES.length),
    },
  };
}

/** Cached singleton for page / API */
let _cache: WarlordsAssetShowcaseCatalog | null = null;
export function getWarlordsAssetShowcase(): WarlordsAssetShowcaseCatalog {
  if (!_cache) _cache = buildWarlordsAssetShowcase();
  return _cache;
}

export function filterShowcase(
  catalog: WarlordsAssetShowcaseCatalog,
  opts: { family?: ShowcaseFamily | 'all'; query?: string } = {},
): WarlordsShowcaseAsset[] {
  const q = (opts.query ?? '').trim().toLowerCase();
  return catalog.assets.filter((a) => {
    if (opts.family && opts.family !== 'all' && a.family !== opts.family) return false;
    if (!q) return true;
    const blob = [
      a.id,
      a.name,
      a.description,
      a.tags.join(' '),
      a.cost.map((c) => c.itemId).join(' '),
      a.abilities.map((x) => x.name).join(' '),
    ]
      .join(' ')
      .toLowerCase();
    return blob.includes(q);
  });
}
