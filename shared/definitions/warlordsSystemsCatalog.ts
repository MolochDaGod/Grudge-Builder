/**
 * warlordsSystemsCatalog.ts
 * ─────────────────────────────────────────────────────────────
 * Warlords-era systems + CDN map (Unity / uMMORPG → Three.js).
 *
 * Binary assets → assets.grudge-studio.com (R2 grudge-assets)
 * JSON catalogs → ObjectStore / info hub OR this package (bundled)
 * Runtime     → grudge-builder island3d + game/sailing
 *
 * Status keys:
 *   live     — used in production play path today
 *   partial  — code + some CDN assets, not fully wired
 *   planned  — catalog + path reserved; needs extract/upload/runtime
 * ─────────────────────────────────────────────────────────────
 */
import { FLEET_URLS } from '../fleet/manifest';
import { R2_CDN_BASE, r2CdnUrl } from '../fleet/r2Layout';
import { UMMORPG_VEHICLES_CATALOG_URL } from '../fleet/vehicles';
import { SHIP_CATALOG, DOCK_GLB } from './shipCatalog';
import { DUNGEON_DEFINITIONS } from './lore';

const CDN = FLEET_URLS.assets;

export type SystemStatus = 'live' | 'partial' | 'planned';

export type WarlordsSystemId =
  | 'quick_craft'
  | 'benches'
  | 'camp_stages'
  | 'modular_build'
  | 'rts_build'
  | 'dungeon_instances'
  | 'weapon_skills'
  | 'scriptable_skills'
  | 'mesh_equipment'
  | 'vfx_skills'
  | 'animations_combat'
  | 'mounts'
  | 'flight'
  | 'boats'
  | 'siege'
  | 'enemy_npcs'
  | 'neutral_npcs'
  | 'world_bosses'
  | 'wildlife'
  | 'heroes_codex';

export interface CdnPathSpec {
  /** R2 object key prefix (no leading slash) */
  prefix: string;
  /** Example full CDN URL */
  exampleUrl: string;
  /** JSON catalog key if any */
  catalogUrl?: string;
  notes?: string;
}

export interface WarlordsSystemDef {
  id: WarlordsSystemId;
  name: string;
  status: SystemStatus;
  /** Unity / uMMORPG source concept */
  unitySource: string;
  /** Code SSOT paths (repo-relative from grudge-builder) */
  codeSsot: string[];
  /** Runtime entry modules */
  runtime: string[];
  /** CDN binary layout */
  cdn: CdnPathSpec[];
  /** What “done” looks like for production */
  acceptance: string[];
}

// ── CDN taxonomy (Unity export targets) ──────────────────────────────────────

/**
 * Canonical R2 prefixes for Warlords / uMMORPG content.
 * Upload pipeline should write only under these keys.
 */
export const WARLORDS_CDN_TAXONOMY = {
  version: 1,
  cdnBase: CDN,
  /** Multipack buildings, benches, camp (node-instance extract) */
  buildings: {
    survivalKit: 'models/buildings/survival/free_survival_asset_kit.glb',
    benches: 'models/buildings/benches/',
    towers: 'models/buildings/towers/',
    warlordsFaction: 'models/warlords/faction/{crusade|legion|fabled}/',
    warlordsMines: 'models/warlords/mines/',
    warlordsRts: 'models/warlords/rts/',
    dock: 'models/buildings/village/dock.glb',
  },
  /** Characters + mesh equipment */
  characters: {
    races: 'models/characters/races/{race}.glb',
    grudge6: 'models/grudge6/races/{PREFIX}_Characters.glb',
    equipment: 'models/equipment/{slot}/{id}.glb',
    attachments: 'models/equipment/attachments/',
  },
  /** Combat anim packs (uMMORPG / Mixamo / baked) */
  animations: {
    locomotion: 'models/animations/locomotion/',
    weapons: 'models/animations/{sword|bow|staff|unarmed|dual|magic}/',
    mounts: 'models/vehicles/anims/{race}/cavalry/',
    siege: 'models/vehicles/anims/{race}/{catapult|bolt-thrower}/',
    injured: 'models/animations/injured/',
  },
  /** Skill VFX (particles, flipbooks, mesh FX) */
  vfx: {
    skills: 'vfx/skills/{skillId}/',
    weapons: 'vfx/weapons/{weaponType}/',
    hits: 'vfx/hits/',
    auras: 'vfx/auras/',
    projectiles: 'models/projectiles/',
    catalog: 'vfx/warlords-vfx-catalog.json',
  },
  /** Mounts / flight / siege */
  vehicles: {
    mounts: 'models/vehicles/mounts/{race}/cavalry.glb',
    flight: 'models/vehicles/flight/{griffin|wyvern|glider}/',
    siege: 'models/vehicles/siege/{race}/',
    catalog: 'models/ummorpg-vehicles-catalog.json',
  },
  /** Boats / ships */
  ships: {
    hulls: 'models/ships/',
    textures: 'textures/ships/',
    enemy: 'models/ships/enemy/',
    catalog: 'models/ships/warlords-ship-catalog.json',
  },
  /** Creatures / NPCs / bosses */
  creatures: {
    land: 'models/creatures/land/',
    fish: 'models/creatures/fish/',
    monsters: 'models/creatures/monsters/',
    bosses: 'models/creatures/bosses/',
    npcs: 'models/npcs/{faction|neutral|hostile}/',
  },
  /** Dungeon kit (instanced pieces, not full baked scenes only) */
  dungeons: {
    pieces: 'models/dungeons/pieces/',
    entrances: 'models/dungeons/entrances/',
    props: 'models/dungeons/props/',
    catalog: 'models/dungeons/warlords-dungeon-kit.json',
  },
} as const;

// ── System definitions ───────────────────────────────────────────────────────

export const WARLORDS_SYSTEMS: Record<WarlordsSystemId, WarlordsSystemDef> = {
  quick_craft: {
    id: 'quick_craft',
    name: 'Quick Craft (no station)',
    status: 'live',
    unitySource: 'uMMORPG player craft without CraftingStation',
    codeSsot: [
      'shared/definitions/buildSystem.ts (layer: quick)',
      'shared/definitions/tier0Items.ts',
      'shared/definitions/tieredCrafting.ts',
      'shared/definitions/recipes.ts',
    ],
    runtime: ['client/src/island3d/building/BuildingSystem.ts (UI craft)', 'WCS puter crafting'],
    cdn: [
      {
        prefix: 'icons/',
        exampleUrl: r2CdnUrl('icons/tomes/fire.png'),
        notes: 'Item/skill icons; recipes are JSON not GLB',
      },
    ],
    acceptance: [
      'T0 recipes craft from bag without world prop',
      'Profession XP hooks optional',
    ],
  },

  benches: {
    id: 'benches',
    name: 'Crafting Benches / Stations',
    status: 'partial',
    unitySource: 'CraftingStation interact → profession UI',
    codeSsot: [
      'shared/definitions/buildSystem.ts (layer: bench)',
      'shared/definitions/survivalKitBuildCatalog.ts',
      'shared/definitions/npcCamps.ts (camp_bench upgrades)',
      'shared/definitions/campUnits.ts (bench professions)',
    ],
    runtime: [
      'client/src/island3d/building/BuildAssetManifest.ts',
      'client/src/island3d/building/PackModelLoader.ts',
      'client/src/island3d/camps/NpcCampSystem.ts',
    ],
    cdn: [
      {
        prefix: 'models/buildings/survival/',
        exampleUrl: r2CdnUrl('models/buildings/survival/free_survival_asset_kit.glb'),
        notes: 'Node extract: workbench, workbenchAnvil, workbenchGrind, campfire…',
      },
      {
        prefix: 'models/buildings/benches/',
        exampleUrl: r2CdnUrl('models/buildings/benches/spell_table.glb'),
        notes: 'Standalone profession stations when split from multipack',
      },
    ],
    acceptance: [
      'Place bench → open profession craft UI',
      'Camp flag + bench upgrades unlock professions',
      'CDN multipack load via PackModelLoader (node instance)',
    ],
  },

  camp_stages: {
    id: 'camp_stages',
    name: 'Camp Stages (tent → fire → bedroll)',
    status: 'partial',
    unitySource: 'Player housing / camp progression',
    codeSsot: ['shared/definitions/buildSystem.ts', 'shared/definitions/npcCamps.ts'],
    runtime: ['client/src/island3d/camps/NpcCampSystem.ts', 'CampUnitSystem.ts'],
    cdn: [
      {
        prefix: 'models/buildings/survival/',
        exampleUrl: r2CdnUrl('models/buildings/survival/free_survival_asset_kit.glb'),
        notes: 'tentHalf, tent, tentClosed, campfire, bedroll nodes',
      },
    ],
    acceptance: ['Stage unlocks, respawn on bedroll, camp unit orders F1–F5'],
  },

  modular_build: {
    id: 'modular_build',
    name: 'Modular T1 Snap Build',
    status: 'partial',
    unitySource: 'uMMORPG housing modular pieces',
    codeSsot: ['shared/definitions/buildSystem.ts (layer: modular)', 'survivalKitBuildCatalog.ts'],
    runtime: ['BuildingSystem.ts', 'PackModelLoader.ts'],
    cdn: [
      {
        prefix: 'models/buildings/survival/',
        exampleUrl: r2CdnUrl('models/buildings/survival/free_survival_asset_kit.glb'),
        notes: 'floor, structure, structureBase nodes',
      },
    ],
    acceptance: ['Snap floors/walls, dock floating foundation Y=water+0.2'],
  },

  rts_build: {
    id: 'rts_build',
    name: 'RTS Buildings (train units)',
    status: 'partial',
    unitySource: 'Keep/barracks train minions → promote to hero',
    codeSsot: [
      'shared/definitions/ultimateFantasyRtsCatalog.ts',
      'shared/definitions/buildSystem.ts (layer: rts)',
      'shared/definitions/campUnits.ts',
    ],
    runtime: ['BuildAssetManifest.ts', 'CampUnitSystem.ts'],
    cdn: [
      {
        prefix: 'models/warlords/rts/',
        exampleUrl: r2CdnUrl('models/warlords/rts/'),
        notes: 'UFRTS FBX→GLB priority set (Mine, barracks, towers…)',
      },
    ],
    acceptance: ['Train AI unit, T0 gear level, promote → Railway character'],
  },

  dungeon_instances: {
    id: 'dungeon_instances',
    name: 'Dungeons as Three.js Node Instances',
    status: 'partial',
    unitySource: 'Instanced dungeon rooms / cave pieces (not only baked FBX scenes)',
    codeSsot: [
      'shared/definitions/lore.ts (DUNGEON_DEFINITIONS)',
      'shared/definitions/dungeons.ts',
      'shared/definitions/zoneServerNodes.ts',
    ],
    runtime: [
      'client/src/island3d/objects/CavePortal3D.ts',
      'client/src/island3d/objects/EvilMountainTriad.ts',
      'client/src/island3d/objects/MineEntranceSystem.ts',
      'server Colyseus Dungeon room',
    ],
    cdn: [
      {
        prefix: 'models/dungeons/pieces/',
        exampleUrl: r2CdnUrl('models/dungeons/pieces/'),
        catalogUrl: r2CdnUrl('models/dungeons/warlords-dungeon-kit.json'),
        notes: 'Modular walls/floors/props instanced per floor seed',
      },
      {
        prefix: 'models/dungeons/entrances/',
        exampleUrl: r2CdnUrl('models/warlords/mountains/rock_mountain_cave_entrance.glb'),
        notes: 'Portal meshes; lore.entranceModel today uses evil_rock_mountains_triad',
      },
    ],
    acceptance: [
      'Portal E-interact → Colyseus dungeon room',
      'Floors built from instanced kit pieces + seed',
      'Boss spawn from DUNGEON_DEFINITIONS.bossId',
    ],
  },

  weapon_skills: {
    id: 'weapon_skills',
    name: 'Weapon Skill System',
    status: 'live',
    unitySource: 'Weapon skill trees / hotbar slots (primary, secondary, ability, ultimate)',
    codeSsot: [
      'shared/definitions/weaponSkillsNew.ts',
      'shared/definitions/weaponDatabase.ts',
      'shared/definitions/weaponMastery.ts',
      'shared/definitions/weaponSkills.ts',
      'shared/characterProgress.ts (weaponSkillSelections)',
    ],
    runtime: [
      'client skill tree UI',
      'client/src/island3d/player/combatHudState.ts',
      'client/src/island3d/player/SkillEffects.ts',
    ],
    cdn: [
      {
        prefix: 'icons/',
        exampleUrl: r2CdnUrl('icons/weapons/'),
        notes: 'Skill icons; combat anims under models/animations/{weapon}/',
      },
      {
        prefix: 'models/animations/',
        exampleUrl: r2CdnUrl('models/animations/'),
        notes: 'Per-weapon attack clips for freeform equip',
      },
    ],
    acceptance: [
      'Hotbar from equipped weapon type',
      'Selections persist on character progress',
      'Anim set follows weaponTypeFromModel3d',
    ],
  },

  scriptable_skills: {
    id: 'scriptable_skills',
    name: 'Scriptable Skills (data-driven)',
    status: 'live',
    unitySource: 'ScriptableObject Skill definitions (damage, VFX, cast time, targeting)',
    codeSsot: [
      'shared/definitions/weaponSkillsNew.ts',
      'shared/definitions/weaponSkillCombatCatalog.ts',
      'shared/definitions/weaponPrefabCatalog.ts',
      'shared/definitions/productionWeaponCombat.ts',
    ],
    runtime: [
      'client/src/island3d/systems/ScriptableSkillRuntime.ts',
      'client/src/island3d/combat/ProductionSkillCombatRuntime.ts',
    ],
    cdn: [
      {
        prefix: 'vfx/skills/',
        exampleUrl: r2CdnUrl('vfx/skills/'),
        catalogUrl: r2CdnUrl('vfx/warlords-vfx-catalog.json'),
        notes: 'Per-skill FX prefab/atlas + cast/impact timelines',
      },
    ],
    acceptance: [
      'Every weaponSkillsNew option has a ProductionSkillCombatDef + ScriptableSkillDef',
      'castTimeSec = windup; cooldownSec = catalog cooldown',
      'storagePrefabId / meshUrl from weaponPrefabCatalog (6 styles, T1–T8 same GLB)',
      'Hits stay on ProductionSkillCombatRuntime — one clock, not two CDs',
    ],
  },

  mesh_equipment: {
    id: 'mesh_equipment',
    name: 'Mesh Equipment System',
    status: 'live',
    unitySource: 'Skinned mesh / child mesh toggles per equip slot',
    codeSsot: [
      'client/src/lib/grudge6Equipment.ts',
      'client/src/lib/grudge6Character.ts',
      'shared/definitions/equipmentData.ts',
      'shared/inventory/equipment.ts',
    ],
    runtime: [
      'grudge6Equipment setupGrudge6Equipment',
      'CharacterAssetManager.ts',
      'AnimationManager weaponTypeFromModel3d',
    ],
    cdn: [
      {
        prefix: 'models/grudge6/races/',
        exampleUrl: r2CdnUrl('models/grudge6/races/WK_Characters.glb'),
        notes: 'Race multipacks with Units_* equip mesh slots',
      },
      {
        prefix: 'models/characters/races/',
        exampleUrl: r2CdnUrl('models/characters/races/human.glb'),
        notes: 'Freeform ARPG body meshes',
      },
      {
        prefix: 'models/equipment/',
        exampleUrl: r2CdnUrl('models/equipment/'),
        notes: 'Standalone attachable weapons/armor when not in race multipack',
      },
    ],
    acceptance: [
      'Any race + any weapon mesh swap',
      'Colors skinColor/armorColor',
      'Anim category from equipped weapon',
    ],
  },

  vfx_skills: {
    id: 'vfx_skills',
    name: 'Skill / Weapon VFX (uMMORPG)',
    status: 'partial',
    unitySource: 'uMMORPG skill effect prefabs / particle systems',
    codeSsot: [
      'shared/definitions/spellAnimations.ts',
      'client/src/island3d/player/SkillEffects.ts',
    ],
    runtime: ['SkillEffects.ts (shader FX live)', 'future VfxCatalogLoader'],
    cdn: [
      {
        prefix: 'vfx/',
        exampleUrl: r2CdnUrl('vfx/warlords-vfx-catalog.json'),
        catalogUrl: r2CdnUrl('vfx/warlords-vfx-catalog.json'),
        notes: 'Upload Unity-exported GLB/atlas packs here',
      },
      {
        prefix: 'models/projectiles/',
        exampleUrl: r2CdnUrl('models/projectiles/'),
      },
    ],
    acceptance: [
      'Catalog maps skillId → cast/impact/loop assets',
      'Pool/reuse GPU particles; no per-cast material leak',
    ],
  },

  animations_combat: {
    id: 'animations_combat',
    name: 'Combat / Locomotion Animations',
    status: 'partial',
    unitySource: 'uMMORPG animator controllers → GLB clips',
    codeSsot: [
      'shared/definitions/characterAnimations.ts',
      'shared/definitions/animations.ts',
      'shared/animation/*',
    ],
    runtime: [
      'AnimationManager.ts',
      'AnimationBlendManager.ts',
      'injuredAnimPack.ts',
    ],
    cdn: [
      {
        prefix: 'models/animations/',
        exampleUrl: r2CdnUrl('models/animations/'),
        notes: 'Also genesis/warlord baked JSON anims for MOBA satellite',
      },
      {
        prefix: 'models/vehicles/anims/',
        exampleUrl: r2CdnUrl('models/vehicles/anims/human/cavalry/01_idle.glb'),
        notes: 'Mount/siege clips already on CDN for several races',
      },
    ],
    acceptance: ['Locomotion + weapon sets blend; mount rider sync to mount anim'],
  },

  mounts: {
    id: 'mounts',
    name: 'Mount System',
    status: 'partial',
    unitySource: 'uMMORPG mount prefabs + rider bone attach',
    codeSsot: [
      'shared/fleet/vehicles.ts',
      'shared/definitions/ummorpgDeployables.ts',
      'models/ummorpg-vehicles-catalog.json (CDN)',
    ],
    runtime: [
      'client/src/island3d/systems/MountSystem.ts',
      'ummorpgDeployables mountDeployables (build mode place)',
    ],
    cdn: [
      {
        prefix: 'models/vehicles/mounts/',
        exampleUrl: r2CdnUrl('models/vehicles/mounts/human/cavalry.glb'),
        catalogUrl: UMMORPG_VEHICLES_CATALOG_URL,
        notes: 'Live: human/barbarian/elf/dwarf/orc/undead cavalry',
      },
    ],
    acceptance: [
      'Summon/dismiss mount',
      'Parent player to rider bone + offset',
      'Mount locomotion anims from catalog.anims',
      'Dismount on water / combat rules',
    ],
  },

  flight: {
    id: 'flight',
    name: 'Flight System',
    status: 'planned',
    unitySource: 'Flying mounts / gliders / griffin couriers (lore floating islands)',
    codeSsot: ['shared/definitions/warlordsSystemsCatalog.ts'],
    runtime: ['client/src/island3d/systems/FlightSystem.ts'],
    cdn: [
      {
        prefix: 'models/vehicles/flight/',
        exampleUrl: r2CdnUrl('models/vehicles/flight/'),
        notes: 'Upload griffin/wyvern/glider packs; separate from ground cavalry',
      },
    ],
    acceptance: [
      'Altitude clamp + stamina',
      'No-fly zones (towns optional)',
      'Land → mount or walk transition',
    ],
  },

  boats: {
    id: 'boats',
    name: 'Boat / Ship Systems',
    status: 'live',
    unitySource: 'Ship prefabs, boarding, ocean physics',
    codeSsot: [
      'shared/definitions/shipCatalog.ts',
      'client/src/game/sailing/*',
    ],
    runtime: [
      'ShipPrefabs.ts',
      'ShipPhysics.ts',
      'BoatBoardingSystem.ts',
      'ShipDeckPhysics.ts',
      'EnemyShipModels.ts',
      'ocean / tactical sail pages',
    ],
    cdn: [
      {
        prefix: 'models/ships/',
        exampleUrl: r2CdnUrl('models/ships/ship-small.glb'),
        notes: 'rowboat/sloop/galleon GLBs live',
      },
      {
        prefix: 'textures/ships/',
        exampleUrl: r2CdnUrl('textures/ships/weathered_oak_hull.png'),
      },
      {
        prefix: 'models/buildings/village/',
        exampleUrl: r2CdnUrl(DOCK_GLB.replace(/^\//, '')),
        notes: 'Dock mesh',
      },
    ],
    acceptance: [
      'Board/disembark',
      'Ocean sail across 9 sectors',
      'Craft ships from SHIP_CATALOG costs',
      'Enemy ships spawn from published enemy-ships.json',
    ],
  },

  siege: {
    id: 'siege',
    name: 'Siege Vehicles',
    status: 'partial',
    unitySource: 'uMMORPG catapult / ballista',
    codeSsot: ['shared/fleet/vehicles.ts', 'ummorpgDeployables.ts'],
    runtime: ['Build placeables', 'future SiegeController'],
    cdn: [
      {
        prefix: 'models/vehicles/siege/',
        exampleUrl: r2CdnUrl('models/vehicles/siege/human/catapult.glb'),
        catalogUrl: UMMORPG_VEHICLES_CATALOG_URL,
      },
    ],
    acceptance: ['Place, crew, aim, projectile, anim attack clip'],
  },

  enemy_npcs: {
    id: 'enemy_npcs',
    name: 'Enemy NPCs',
    status: 'partial',
    unitySource: 'Hostile AI agents / bandits / faction enemies',
    codeSsot: [
      'shared/definitions/monsters.ts',
      'shared/definitions/npcCamps.ts',
      'shared/definitions/zoneServerNodes.ts',
      'shared/definitions/ummorpgDeployables.ts (bandits)',
    ],
    runtime: [
      'CreatureManager.ts',
      'CreatureBrain.ts',
      'NpcCampSystem.ts',
      'CampUnitSystem.ts',
    ],
    cdn: [
      {
        prefix: 'models/npcs/hostile/',
        exampleUrl: r2CdnUrl('models/npcs/hostile/'),
      },
      {
        prefix: 'models/grudge6/races/',
        exampleUrl: r2CdnUrl('models/grudge6/races/ORC_Characters.glb'),
        notes: 'Bandit stand-ins from race multipacks',
      },
      {
        prefix: 'models/creatures/',
        exampleUrl: r2CdnUrl('models/creatures/land/wolf.glb'),
      },
    ],
    acceptance: [
      'Faction aggro from lore AGGRO_CONFIG',
      'Camp garrison combat',
      'Loot tables from monsters.ts',
    ],
  },

  neutral_npcs: {
    id: 'neutral_npcs',
    name: 'Neutral NPCs (vendors, travelers, pirates)',
    status: 'partial',
    unitySource: 'NPC interact, dialogue, vendors',
    codeSsot: [
      'shared/definitions/factionTowns.ts',
      'shared/definitions/factionLobbyIslands.ts',
      'shared/definitions/heroCodex.ts',
      'shared/definitions/lore.ts (NPC_FACTIONS)',
    ],
    runtime: ['town systems', 'dialogue set IDs on maps'],
    cdn: [
      {
        prefix: 'models/npcs/neutral/',
        exampleUrl: r2CdnUrl('models/npcs/neutral/'),
      },
      {
        prefix: 'models/toon-soldiers/',
        exampleUrl: r2CdnUrl('models/toon-soldiers/'),
        notes: 'Traveler/scout stand-ins',
      },
    ],
    acceptance: [
      'Dialogue packs from heroCodex / dialogueSets',
      'Vendor inventory',
      'Pirate hostility when Nexus claim held',
    ],
  },

  world_bosses: {
    id: 'world_bosses',
    name: 'World Bosses',
    status: 'partial',
    unitySource: 'World boss encounters / multi-phase AI',
    codeSsot: [
      'shared/definitions/orcWarriorBoss.ts (Ghar\'Thok)',
      'shared/definitions/published/warlords-catalog.json bosses',
      'info hub /api/v1/bosses.json (design catalog)',
    ],
    runtime: ['orc warrior boss AI', 'zone population hooks'],
    cdn: [
      {
        prefix: 'models/creatures/bosses/',
        exampleUrl: r2CdnUrl('models/creatures/bosses/'),
        notes: 'Upload boss meshes; runtime boss currently orc warrior kit',
      },
    ],
    acceptance: [
      'Phase AI + telegraphs (AttackWarningSystem)',
      'Zone schedule / claim war spawns (SE Grinding March)',
      'Loot + lockout',
    ],
  },

  wildlife: {
    id: 'wildlife',
    name: 'Wildlife / Huntables',
    status: 'live',
    unitySource: 'Ambient animals + fish',
    codeSsot: [
      'client/src/island3d/creatures/CreatureManifest.ts',
      'warlords-catalog wildlife',
    ],
    runtime: ['CreatureManager.ts', 'FishManager.ts'],
    cdn: [
      {
        prefix: 'models/creatures/land/',
        exampleUrl: r2CdnUrl('models/creatures/land/crab.glb'),
      },
      {
        prefix: 'models/creatures/',
        exampleUrl: r2CdnUrl('models/creatures/bear.glb'),
      },
      {
        prefix: 'fish/',
        exampleUrl: r2CdnUrl('fish/Clownfish.glb'),
        notes: 'Legacy fish path; migrate to models/creatures/fish/',
      },
    ],
    acceptance: ['Biome placement rules, respawn, hunt loot'],
  },

  heroes_codex: {
    id: 'heroes_codex',
    name: 'Hero Codex (canonical roster)',
    status: 'live',
    unitySource: 'Named hero NPCs / quest givers',
    codeSsot: [
      'shared/definitions/lore.ts HERO_ROSTER',
      'shared/definitions/heroCodex.ts',
      'client/public/hero-codex/',
    ],
    runtime: ['/hero-codex', 'factionTowns hero NPCs'],
    cdn: [
      {
        prefix: 'hero-codex served from SPA',
        exampleUrl: 'https://grudgewarlords.com/hero-codex/',
        notes: 'Portraits under client public; optional CDN mirror later',
      },
    ],
    acceptance: ['24 roster + Racalvin; dialogue/quests seeded'],
  },
};

// ── Upload priority (Unity → R2 batches) ─────────────────────────────────────

export const UNITY_CDN_UPLOAD_BATCHES: Array<{
  id: string;
  priority: number;
  title: string;
  localHints: string[];
  r2Prefix: string;
  systems: WarlordsSystemId[];
}> = [
  {
    id: 'batch_benches_survival',
    priority: 1,
    title: 'Survival kit + benches multipack',
    localHints: [
      'D:/Games/.../free_survival_asset_kit.glb',
      'spell_table / lumbermill standalone',
    ],
    r2Prefix: 'models/buildings/',
    systems: ['quick_craft', 'benches', 'camp_stages', 'modular_build'],
  },
  {
    id: 'batch_mounts_siege',
    priority: 2,
    title: 'uMMORPG mounts + siege + anims',
    localHints: ['ObjectStore/public/vehicles/ummorpg/'],
    r2Prefix: 'models/vehicles/',
    systems: ['mounts', 'siege', 'animations_combat'],
  },
  {
    id: 'batch_ships',
    priority: 3,
    title: 'Ships + dock + hull textures',
    localHints: ['models/ships', 'textures/ships'],
    r2Prefix: 'models/ships/',
    systems: ['boats'],
  },
  {
    id: 'batch_equipment_anims',
    priority: 4,
    title: 'Weapon anim packs + equipment meshes',
    localHints: ['Unity Animator exports / Mixamo / warlord-genesis anims'],
    r2Prefix: 'models/animations/',
    systems: ['mesh_equipment', 'weapon_skills', 'animations_combat'],
  },
  {
    id: 'batch_vfx_skills',
    priority: 5,
    title: 'Skill VFX catalog from uMMORPG',
    localHints: ['Unity particle/mesh VFX prefabs → GLB/atlas'],
    r2Prefix: 'vfx/',
    systems: ['vfx_skills', 'scriptable_skills'],
  },
  {
    id: 'batch_dungeon_kit',
    priority: 6,
    title: 'Dungeon modular pieces + entrances',
    localHints: ['Unity dungeon tilesets', 'warlords mountain caves'],
    r2Prefix: 'models/dungeons/',
    systems: ['dungeon_instances'],
  },
  {
    id: 'batch_npc_boss',
    priority: 7,
    title: 'Enemy/neutral NPCs + world bosses',
    localHints: ['uMMORPG monsters', 'dark elf camps', 'boss kits'],
    r2Prefix: 'models/npcs/ + models/creatures/bosses/',
    systems: ['enemy_npcs', 'neutral_npcs', 'world_bosses', 'wildlife'],
  },
  {
    id: 'batch_flight',
    priority: 8,
    title: 'Flight mounts (griffin / glider)',
    localHints: ['Unity flying mounts'],
    r2Prefix: 'models/vehicles/flight/',
    systems: ['flight'],
  },
];

// ── Ship catalog CDN snapshot ────────────────────────────────────────────────

export function shipsCdnSnapshot() {
  return SHIP_CATALOG.map((s) => ({
    size: s.size,
    label: s.label,
    glb: s.glbModel.startsWith('http') ? s.glbModel : `${CDN}${s.glbModel.startsWith('/') ? '' : '/'}${s.glbModel}`,
    starterFree: s.starterFree,
  }));
}

export function dungeonsCatalogSnapshot() {
  return DUNGEON_DEFINITIONS.map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    floors: d.floors,
    bossId: d.bossId,
    bossName: d.bossName,
    entranceModel: d.entranceModel,
    minLevel: d.minLevel,
  }));
}

/** Machine JSON for ObjectStore / info hub / Studio tools */
export function exportWarlordsSystemsCatalogJson() {
  return {
    version: '1.0.0',
    updated: '2026-07-17',
    cdnBase: R2_CDN_BASE,
    vehiclesCatalog: UMMORPG_VEHICLES_CATALOG_URL,
    taxonomy: WARLORDS_CDN_TAXONOMY,
    systems: Object.values(WARLORDS_SYSTEMS),
    uploadBatches: UNITY_CDN_UPLOAD_BATCHES,
    ships: shipsCdnSnapshot(),
    dungeons: dungeonsCatalogSnapshot(),
    notes: [
      'Unity/uMMORPG binaries → R2 under taxonomy prefixes only',
      'JSON catalogs prefer ObjectStore; mirror hot catalogs to R2 when needed for offline CDN',
      'Three.js: multipacks loaded via PackModelLoader node instances; dungeons should follow same pattern',
      'Do not put GRUDGES/Nexus voxel assets in Warlords play client CDN requirements',
    ],
  };
}

export function getSystem(id: WarlordsSystemId): WarlordsSystemDef {
  return WARLORDS_SYSTEMS[id];
}

export function systemsByStatus(status: SystemStatus): WarlordsSystemDef[] {
  return Object.values(WARLORDS_SYSTEMS).filter((s) => s.status === status);
}
