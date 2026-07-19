#!/usr/bin/env node
/**
 * Publish production world SSOT → published JSON + ObjectStore api/v1 + D1 seed SQL.
 *
 * Covers: 9 sectors, race capitals, foundations (Haven/Fabled), dungeons, instances,
 * towns, NPCs, island events, bosses, CDN asset keys.
 *
 * Usage:
 *   node scripts/publish-production-world.mjs
 *   node scripts/publish-production-world.mjs --seed-d1
 *   node scripts/publish-production-world.mjs --seed-d1 --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLISHED = path.join(ROOT, 'shared', 'definitions', 'published');
const OS_CANDIDATES = [
  path.resolve(ROOT, '..', 'ObjectStore', 'api', 'v1'),
  path.join('C:', 'Users', 'david', 'Desktop', 'ObjectStore', 'api', 'v1'),
].filter(Boolean);
const SEED_D1 = process.argv.includes('--seed-d1');
const DRY = process.argv.includes('--dry-run');
const CDN = 'https://assets.grudge-studio.com';
const PLAY = 'https://client.grudge-studio.com';
const VERSION = '2.0.0';
const UPDATED = new Date().toISOString().slice(0, 10);

function esc(s) {
  if (s == null) return 'NULL';
  return `'${String(s).replace(/'/g, "''")}'`;
}

/** Production onset pattern — single player journey SSOT for deploy + D1. */
const ONSET_PATTERN = {
  version: VERSION,
  updated: UPDATED,
  worldSeedDefault: 'grudge-world-1',
  journey: [
    { step: 1, id: 'intro', path: '/intro', label: 'Opening scene' },
    { step: 2, id: 'create', path: '/create-character', label: 'GCS character (account)' },
    { step: 3, id: 'tutorial', path: '/tutorial', label: 'Shipwreck tutorial' },
    {
      step: 4,
      id: 'open_world',
      path: '/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1&city=haven_port',
      label: 'Open world · Haven Port (starter)',
    },
    { step: 5, id: 'world_map', path: '/world-map', label: '9 sectors · 6 race capitals' },
    {
      step: 6,
      id: 'fabled_core',
      path: '/play?sector=frostbite_expanse&mode=zone&worldSeed=grudge-world-1&city=runeforge_hold',
      label: 'Fabled core · Runeforge Hold · cave portals → dwarf city',
    },
    { step: 7, id: 'home_island', path: '/home-island', label: 'Home island (level 20+)' },
  ],
  sources: {
    assetsCdn: CDN,
    objectStore: 'https://objectstore.grudge-studio.com',
    accounts: 'https://id.grudge-studio.com',
    characters: 'https://character.grudge-studio.com',
    gameData: 'https://client.grudge-studio.com',
    vfx: `${CDN}/effects/`,
    raceGlbs: `${CDN}/models/characters/races/`,
  },
};

const SECTORS = [
  {
    id: 'ethereal_falls',
    legacyId: 'NW',
    name: 'Ethereal Falls',
    biome: 'magic',
    difficultyMin: 3,
    difficultyMax: 6,
    isSafeZone: false,
    isContested: false,
    sizeMeters: 10000,
    grid: { col: 0, row: 0 },
    capitalCityId: null,
    foundation: 'fabled_satellite',
    systems: {
      terrain3d: true,
      zonePopulation: true,
      harvestNodes: true,
      wildlife: true,
      fish: true,
      npcCamps: true,
      docks: true,
      colyseusSector: true,
      factionTown: false,
      fabledCore: true,
      islandEvents: true,
    },
    resources: ['arcane_dust', 'herbs', 'crystals'],
    description: 'Remote magical falls — satellite Fabled wilds (scaled core).',
  },
  {
    id: 'frostbite_expanse',
    legacyId: 'N',
    name: 'Frostbite Expanse',
    biome: 'frozen',
    difficultyMin: 4,
    difficultyMax: 7,
    isSafeZone: false,
    isContested: false,
    sizeMeters: 10000,
    grid: { col: 1, row: 0 },
    capitalCityId: 'runeforge_hold',
    foundation: 'fabledzone',
    systems: {
      terrain3d: true,
      zonePopulation: true,
      harvestNodes: true,
      wildlife: true,
      fish: true,
      npcCamps: true,
      docks: true,
      colyseusSector: true,
      factionTown: true,
      fabledCore: true,
      cavePortals: true,
      dwarfCastleInterior: true,
      islandEvents: true,
      bosses: true,
    },
    resources: ['frost_herbs', 'ice', 'crystals', 'whale_bone', 'arctic_fish', 'ore'],
    description:
      'Fabled sector core (fabledzone.glb): multi-island forge village. Cave doorways portal into dwarf main city / castle. Extra procedural islands allowed.',
  },
  {
    id: 'thornwood_wilds',
    legacyId: 'NE',
    name: 'Thornwood Wilds',
    biome: 'forest',
    difficultyMin: 3,
    difficultyMax: 7,
    isSafeZone: false,
    isContested: false,
    sizeMeters: 10000,
    grid: { col: 2, row: 0 },
    capitalCityId: 'starweave_canopy',
    foundation: null,
    systems: {
      terrain3d: true,
      zonePopulation: true,
      harvestNodes: true,
      wildlife: true,
      fish: true,
      npcCamps: true,
      docks: true,
      colyseusSector: true,
      factionTown: false,
      islandEvents: true,
    },
    resources: ['hardwood', 'herbs', 'berries', 'rare_mushrooms', 'beast_hides'],
    description: 'Ancient forest canopy — Elf capital Starweave Canopy.',
  },
  {
    id: 'stormbreak_reef',
    legacyId: 'W',
    name: 'Stormbreak Reef',
    biome: 'storm',
    difficultyMin: 3,
    difficultyMax: 6,
    isSafeZone: false,
    isContested: false,
    sizeMeters: 10000,
    grid: { col: 0, row: 1 },
    capitalCityId: null,
    foundation: null,
    systems: {
      terrain3d: true,
      zonePopulation: true,
      harvestNodes: true,
      wildlife: true,
      fish: true,
      npcCamps: true,
      docks: true,
      colyseusSector: true,
      factionTown: false,
      islandEvents: true,
    },
    resources: ['shells', 'coral', 'rare_ore', 'storm_crystals'],
    description: 'Perpetual storms over razor coral reefs.',
  },
  {
    id: 'convergence_nexus',
    legacyId: 'CENTER',
    name: 'Convergence Nexus',
    biome: 'contested',
    difficultyMin: 5,
    difficultyMax: 9,
    isSafeZone: false,
    isContested: true,
    sizeMeters: 12000,
    grid: { col: 1, row: 1 },
    capitalCityId: null,
    foundation: null,
    systems: {
      terrain3d: true,
      zonePopulation: true,
      harvestNodes: true,
      wildlife: true,
      fish: true,
      npcCamps: true,
      docks: true,
      colyseusSector: true,
      factionTown: false,
      embassies: true,
      islandEvents: true,
      bosses: true,
    },
    resources: ['scrap', 'ore', 'relics'],
    description: 'Central clash zone — faction embassies and world events.',
  },
  {
    id: 'ashen_wastes',
    legacyId: 'E',
    name: 'Ashen Wastes',
    biome: 'desert',
    difficultyMin: 5,
    difficultyMax: 8,
    isSafeZone: false,
    isContested: false,
    sizeMeters: 14000,
    grid: { col: 2, row: 1 },
    capitalCityId: 'ashen_throne',
    foundation: null,
    systems: {
      terrain3d: true,
      zonePopulation: true,
      harvestNodes: true,
      wildlife: true,
      fish: true,
      npcCamps: true,
      docks: true,
      colyseusSector: true,
      factionTown: true,
      islandEvents: true,
      bosses: true,
    },
    resources: ['glass_sand', 'ore', 'herbs', 'bones'],
    description: 'Glass desert — Demon capital Ashen Throne.',
  },
  {
    id: 'abyssal_trench',
    legacyId: 'SW',
    name: 'Abyssal Trench',
    biome: 'abyss',
    difficultyMin: 6,
    difficultyMax: 10,
    isSafeZone: false,
    isContested: false,
    sizeMeters: 10000,
    grid: { col: 0, row: 2 },
    capitalCityId: 'drowned_sepulcher',
    foundation: null,
    systems: {
      terrain3d: true,
      zonePopulation: true,
      harvestNodes: true,
      wildlife: true,
      fish: true,
      npcCamps: true,
      docks: true,
      colyseusSector: true,
      factionTown: true,
      islandEvents: true,
      bosses: true,
    },
    resources: ['salvage', 'fish', 'ore', 'abyss_pearls'],
    description: 'Deep trench — Undead capital Drowned Sepulcher.',
  },
  {
    id: 'haven_shore',
    legacyId: 'S',
    name: 'Haven Shore',
    biome: 'tropical',
    difficultyMin: 1,
    difficultyMax: 3,
    isSafeZone: true,
    isContested: false,
    sizeMeters: 10000,
    grid: { col: 1, row: 2 },
    capitalCityId: 'haven_port',
    foundation: 'fruzer_islands',
    systems: {
      terrain3d: true,
      zonePopulation: true,
      harvestNodes: true,
      wildlife: true,
      fish: true,
      npcCamps: true,
      docks: true,
      colyseusSector: true,
      factionTown: false,
      havenShoreFoundation: true,
      vendors: true,
      missions: true,
      islandEvents: true,
    },
    resources: ['coconut', 'palm_frond', 'fish', 'shells', 'hardwood', 'herbs'],
    description: 'Safe tropical starter — Fruzer islands foundation + Haven Port vendors.',
  },
  {
    id: 'ember_depths',
    legacyId: 'SE',
    name: 'Ember Depths',
    biome: 'volcanic',
    difficultyMin: 5,
    difficultyMax: 9,
    isSafeZone: false,
    isContested: false,
    sizeMeters: 10000,
    grid: { col: 2, row: 2 },
    capitalCityId: 'pit_foundry',
    foundation: null,
    systems: {
      terrain3d: true,
      zonePopulation: true,
      harvestNodes: true,
      wildlife: true,
      fish: true,
      npcCamps: true,
      docks: true,
      colyseusSector: true,
      factionTown: true,
      islandEvents: true,
      bosses: true,
    },
    resources: ['obsidian', 'sulfur', 'fire_crystals', 'rare_ore', 'gems'],
    description: 'Volcanic Legion caldera — Orc capital Pit Foundry.',
  },
].map((s) => ({
  ...s,
  entryReady: true,
  playUrl: `${PLAY}/play?sector=${s.id}&mode=zone&worldSeed=grudge-world-1${
    s.capitalCityId ? `&city=${s.capitalCityId}` : ''
  }`,
}));

const TOWNS = [
  {
    id: 'haven_port',
    sectorId: 'haven_shore',
    raceId: 'human',
    faction: null,
    name: 'Haven Port',
    subtitle: 'Human Capital · PVE Trade Village',
    modelGlb: 'models/warlords/haven_shore/fruzer_islands.glb',
    modelScale: 2.4,
  },
  {
    id: 'runeforge_hold',
    sectorId: 'frostbite_expanse',
    raceId: 'dwarf',
    faction: 'fabled',
    name: 'Runeforge Hold',
    subtitle: 'Dwarf Capital · Fabled Core',
    modelGlb: 'models/warlords/fabled/fabledzone.glb',
    modelScale: 1.15,
    interiors: {
      dwarfMainCity: 'models/warlords/fabled/dwarf_main_city.glb',
      portalMode: 'cave_doorway',
    },
  },
  {
    id: 'starweave_canopy',
    sectorId: 'thornwood_wilds',
    raceId: 'elf',
    faction: 'fabled',
    name: 'Starweave Canopy',
    subtitle: 'Elf Capital · Ancient Forest',
    modelGlb: 'models/towns/cathedral_sanctum.glb',
    modelScale: 0.9,
  },
  {
    id: 'pit_foundry',
    sectorId: 'ember_depths',
    raceId: 'orc',
    faction: 'legion',
    name: 'The Pit Foundry',
    subtitle: 'Orc Capital · Volcanic Creations',
    modelGlb: 'models/towns/pit_foundry.glb',
    modelScale: 1.0,
  },
  {
    id: 'drowned_sepulcher',
    sectorId: 'abyssal_trench',
    raceId: 'undead',
    faction: 'legion',
    name: 'Drowned Sepulcher',
    subtitle: 'Undead Capital · Flooded Ruins',
    modelGlb: 'models/towns/pit_foundry.glb',
    modelScale: 0.85,
  },
  {
    id: 'ashen_throne',
    sectorId: 'ashen_wastes',
    raceId: 'demon',
    faction: 'crusade',
    name: 'Ashen Throne',
    subtitle: 'Demon Capital · Glass Desert',
    modelGlb: 'models/towns/crusade/exterior.glb',
    modelScale: 1.2,
  },
].map((t) => ({
  ...t,
  playUrl: `${PLAY}/play?sector=${t.sectorId}&mode=zone&worldSeed=grudge-world-1&city=${t.id}`,
}));

const ISLANDS = [
  {
    id: 'fabled_core_islands',
    sectorId: 'frostbite_expanse',
    name: 'Fabled Zone Core',
    kind: 'foundation_core',
    glbKey: 'models/warlords/fabled/fabledzone.glb',
    scale: 1.15,
    tags: ['fabled', 'multi_island', 'capital'],
  },
  {
    id: 'haven_fruzer_islands',
    sectorId: 'haven_shore',
    name: 'Fruzer Trade Isles',
    kind: 'foundation_core',
    glbKey: 'models/warlords/haven_shore/fruzer_islands.glb',
    scale: 2.4,
    tags: ['haven', 'pve', 'trade'],
  },
  {
    id: 'pirate_lobby_islands',
    sectorId: 'haven_shore',
    name: 'Pirate Lobby Islands',
    kind: 'lobby',
    glbKey: 'models/lobby/pirate-islands/scene.glb',
    scale: 1.0,
    tags: ['lobby', 'open_world'],
  },
  // Procedural placeholders per sector (runtime can spawn many more)
  ...SECTORS.map((s) => ({
    id: `${s.id}_proc_cluster`,
    sectorId: s.id,
    name: `${s.name} Procedural Cluster`,
    kind: 'procedural',
    glbKey: null,
    scale: 1.0,
    tags: ['procedural', 'satellite'],
  })),
];

const INSTANCES = SECTORS.map((s) => ({
  id: `inst_${s.id}_primary`,
  sectorId: s.id,
  kind: 'open_world_zone',
  name: `${s.name} Primary`,
  maxPlayers: s.isContested ? 60 : 40,
  entryUrl: s.playUrl,
}));

const DUNGEONS = [
  {
    id: 'tropical_dungeon_0',
    sectorId: 'haven_shore',
    name: "Pirate's Crypt",
    entranceModel: 'cave',
    minLevel: 1,
    bossId: 'boss_pirate_captain',
    portalMode: 'cave_door',
  },
  {
    id: 'frozen_dungeon_0',
    sectorId: 'frostbite_expanse',
    name: 'Glacial Depths',
    entranceModel: 'cave',
    minLevel: 4,
    bossId: 'boss_frost_warden',
    interiorGlb: 'models/warlords/fabled/dwarf_main_city.glb',
    portalMode: 'cave_door',
  },
  {
    id: 'fab_portal_main_city',
    sectorId: 'frostbite_expanse',
    name: 'Runeforge Hold · Dwarf Main City',
    entranceModel: 'cave',
    minLevel: 4,
    bossId: null,
    interiorGlb: 'models/warlords/fabled/dwarf_main_city.glb',
    portalMode: 'cave_door',
  },
  {
    id: 'forest_dungeon_0',
    sectorId: 'thornwood_wilds',
    name: 'Thornwood Labyrinth',
    entranceModel: 'tree_hollow',
    minLevel: 3,
    bossId: 'boss_thorn_worge',
    portalMode: 'tree_hollow',
  },
  {
    id: 'volcanic_dungeon_0',
    sectorId: 'ember_depths',
    name: 'Magma Core',
    entranceModel: 'gate',
    minLevel: 5,
    bossId: 'boss_gharthok',
    portalMode: 'gate',
  },
  {
    id: 'abyssal_dungeon_0',
    sectorId: 'abyssal_trench',
    name: 'Drowned Cathedral',
    entranceModel: 'ruins',
    minLevel: 6,
    bossId: 'boss_drowned_priest',
    portalMode: 'ruins',
  },
  {
    id: 'desert_dungeon_0',
    sectorId: 'ashen_wastes',
    name: 'Sunken Tomb',
    entranceModel: 'ruins',
    minLevel: 5,
    bossId: 'boss_ashen_aspect',
    portalMode: 'ruins',
  },
  {
    id: 'nexus_dungeon_0',
    sectorId: 'convergence_nexus',
    name: "Racalvin's Vault",
    entranceModel: 'portal',
    minLevel: 7,
    bossId: 'boss_herald_first_grudge',
    portalMode: 'portal',
  },
];

const NPCS = [
  { id: 'npc_haven_vendor_general', townId: 'haven_port', sectorId: 'haven_shore', name: 'Harbor Outfitter', role: 'merchant' },
  { id: 'npc_haven_vendor_weapons', townId: 'haven_port', sectorId: 'haven_shore', name: 'Reef Arms', role: 'merchant' },
  { id: 'npc_haven_mission', townId: 'haven_port', sectorId: 'haven_shore', name: 'Harbor Master', role: 'questGiver' },
  { id: 'npc_haven_fish', townId: 'haven_port', sectorId: 'haven_shore', name: 'Dock Fisher', role: 'merchant' },
  { id: 'npc_runeforge_smith', townId: 'runeforge_hold', sectorId: 'frostbite_expanse', name: 'Runesmith Borin', role: 'merchant' },
  { id: 'npc_runeforge_guard', townId: 'runeforge_hold', sectorId: 'frostbite_expanse', name: 'Hold Guard', role: 'guard' },
  { id: 'npc_runeforge_portal', townId: 'runeforge_hold', sectorId: 'frostbite_expanse', name: 'Cave Warden', role: 'questGiver' },
  { id: 'npc_starweave_herbalist', townId: 'starweave_canopy', sectorId: 'thornwood_wilds', name: 'Canopy Herbalist', role: 'merchant' },
  { id: 'npc_pit_forgemaster', townId: 'pit_foundry', sectorId: 'ember_depths', name: 'Forgemaster Kraag', role: 'factionVendor' },
  { id: 'npc_sepulcher_rite', townId: 'drowned_sepulcher', sectorId: 'abyssal_trench', name: 'Rite Keeper', role: 'questGiver' },
  { id: 'npc_ashen_captain', townId: 'ashen_throne', sectorId: 'ashen_wastes', name: 'Glass Captain', role: 'questGiver' },
];

const EVENTS = [
  { id: 'evt_haven_trade_day', sectorId: 'haven_shore', name: 'Trade Day', eventType: 'island_event', schedule: 'daily' },
  { id: 'evt_frost_blizzard', sectorId: 'frostbite_expanse', name: 'Howling Blizzard', eventType: 'weather_hazard', schedule: 'hourly_chance' },
  { id: 'evt_fabled_forge_surge', sectorId: 'frostbite_expanse', name: 'Forge Surge', eventType: 'island_event', schedule: 'weekend' },
  { id: 'evt_thorn_hunt', sectorId: 'thornwood_wilds', name: 'Worge Hunt', eventType: 'island_event', schedule: 'daily' },
  { id: 'evt_nexus_clash', sectorId: 'convergence_nexus', name: 'Faction Clash', eventType: 'pvp_event', schedule: 'weekend' },
  { id: 'evt_ember_eruption', sectorId: 'ember_depths', name: 'Caldera Eruption', eventType: 'hazard', schedule: 'hourly_chance' },
  { id: 'evt_abyss_tide', sectorId: 'abyssal_trench', name: 'Black Tide', eventType: 'hazard', schedule: 'tide_cycle' },
  { id: 'evt_ashen_storm', sectorId: 'ashen_wastes', name: 'Glass Storm', eventType: 'weather_hazard', schedule: 'daily' },
];

const BOSSES = [
  { id: 'boss_pirate_captain', sectorId: 'haven_shore', dungeonId: 'tropical_dungeon_0', name: 'Pirate Captain', phases: 1, minLevel: 2 },
  { id: 'boss_frost_warden', sectorId: 'frostbite_expanse', dungeonId: 'frozen_dungeon_0', name: 'Frost Warden', phases: 2, minLevel: 5 },
  { id: 'boss_thorn_worge', sectorId: 'thornwood_wilds', dungeonId: 'forest_dungeon_0', name: 'Thorn Worge Alpha', phases: 2, minLevel: 4 },
  { id: 'boss_gharthok', sectorId: 'ember_depths', dungeonId: 'volcanic_dungeon_0', name: "Ghar'Thok the Unbroken", phases: 3, minLevel: 6, modelKey: 'models/bosses/orc_warrior' },
  { id: 'boss_drowned_priest', sectorId: 'abyssal_trench', dungeonId: 'abyssal_dungeon_0', name: 'Drowned Priest', phases: 2, minLevel: 7 },
  { id: 'boss_ashen_aspect', sectorId: 'ashen_wastes', dungeonId: 'desert_dungeon_0', name: 'Ashen Aspect', phases: 2, minLevel: 6 },
  { id: 'boss_herald_first_grudge', sectorId: 'convergence_nexus', dungeonId: 'nexus_dungeon_0', name: 'Herald of First Grudge', phases: 3, minLevel: 8 },
];

const CDN_ASSETS = [
  { key: 'models/warlords/fabled/fabledzone.glb', category: 'zone_core', tags: ['fabled', 'frostbite'] },
  { key: 'models/warlords/fabled/dwarf_main_city.glb', category: 'interior', tags: ['dwarf', 'castle'] },
  { key: 'models/warlords/haven_shore/fruzer_islands.glb', category: 'zone_core', tags: ['haven'] },
  { key: 'models/characters/races/human.glb', category: 'character', tags: ['race'] },
  { key: 'models/characters/races/dwarf.glb', category: 'character', tags: ['race'] },
  { key: 'models/characters/races/elf.glb', category: 'character', tags: ['race'] },
  { key: 'models/characters/races/orc.glb', category: 'character', tags: ['race'] },
  { key: 'models/characters/races/undead.glb', category: 'character', tags: ['race'] },
  { key: 'models/characters/races/barbarian.glb', category: 'character', tags: ['race'] },
  { key: 'models/ummorpg-vehicles-catalog.json', category: 'catalog', tags: ['vehicles'] },
  { key: 'models/toon-soldiers/catalog.json', category: 'catalog', tags: ['toon'] },
  { key: 'catalogs/warlords/production-world.json', category: 'catalog', tags: ['world'] },
  { key: 'catalogs/warlords/onset-pattern.json', category: 'catalog', tags: ['onset'] },
];

function buildCatalog() {
  return {
    version: VERSION,
    updated: UPDATED,
    canonicalSource: 'grudge-builder/scripts/publish-production-world.mjs',
    worldSeedDefault: 'grudge-world-1',
    playBaseUrl: `${PLAY}/play`,
    onsetPattern: ONSET_PATTERN,
    grid: {
      layout: '3x3',
      rows: [
        ['ethereal_falls', 'frostbite_expanse', 'thornwood_wilds'],
        ['stormbreak_reef', 'convergence_nexus', 'ashen_wastes'],
        ['abyssal_trench', 'haven_shore', 'ember_depths'],
      ],
    },
    legacyBridge: {
      NW: 'ethereal_falls',
      N: 'frostbite_expanse',
      NE: 'thornwood_wilds',
      W: 'stormbreak_reef',
      CENTER: 'convergence_nexus',
      E: 'ashen_wastes',
      SW: 'abyssal_trench',
      S: 'haven_shore',
      SE: 'ember_depths',
    },
    zones: SECTORS,
    towns: TOWNS,
    islands: ISLANDS,
    instances: INSTANCES,
    dungeons: DUNGEONS,
    npcs: NPCS,
    events: EVENTS,
    bosses: BOSSES,
    cdnAssets: CDN_ASSETS.map((a) => ({ ...a, url: `${CDN}/${a.key}` })),
    notes: [
      'Fabled sector may host many islands; core is fabledzone.glb with cave-door portals into dwarf castle/buildings.',
      'Haven Shore uses Fruzer foundation; starter path city=haven_port.',
      'Account characters via id.grudge-studio.com + character.grudge-studio.com; binaries on assets.grudge-studio.com.',
      'D1 tables world_* live in grudge-objectstore; query via ObjectStore worker / admin.',
    ],
  };
}

function buildSql(catalog) {
  const lines = [
    '-- AUTO-GENERATED by publish-production-world.mjs — do not hand-edit',
    `-- version ${VERSION} ${UPDATED}`,
    'DELETE FROM world_bosses;',
    'DELETE FROM world_events;',
    'DELETE FROM world_npcs;',
    'DELETE FROM world_dungeons;',
    'DELETE FROM world_instances;',
    'DELETE FROM world_islands;',
    'DELETE FROM world_towns;',
    'DELETE FROM world_sectors;',
    "DELETE FROM production_catalog WHERE key IN ('production-world','onset-pattern');",
  ];

  for (const s of catalog.zones) {
    lines.push(
      `INSERT INTO world_sectors (id, legacy_id, name, biome, difficulty_min, difficulty_max, is_safe_zone, is_contested, size_meters, grid_col, grid_row, play_url, capital_city_id, foundation, systems_json, resources_json, description) VALUES (${esc(s.id)}, ${esc(s.legacyId)}, ${esc(s.name)}, ${esc(s.biome)}, ${s.difficultyMin}, ${s.difficultyMax}, ${s.isSafeZone ? 1 : 0}, ${s.isContested ? 1 : 0}, ${s.sizeMeters}, ${s.grid.col}, ${s.grid.row}, ${esc(s.playUrl)}, ${esc(s.capitalCityId)}, ${esc(s.foundation)}, ${esc(JSON.stringify(s.systems))}, ${esc(JSON.stringify(s.resources))}, ${esc(s.description)});`,
    );
  }
  for (const t of catalog.towns) {
    lines.push(
      `INSERT INTO world_towns (id, sector_id, race_id, faction, name, subtitle, model_glb, model_scale, play_url, meta_json) VALUES (${esc(t.id)}, ${esc(t.sectorId)}, ${esc(t.raceId)}, ${esc(t.faction)}, ${esc(t.name)}, ${esc(t.subtitle)}, ${esc(t.modelGlb)}, ${t.modelScale}, ${esc(t.playUrl)}, ${esc(JSON.stringify(t.interiors || {}))});`,
    );
  }
  for (const i of catalog.islands) {
    lines.push(
      `INSERT INTO world_islands (id, sector_id, name, kind, glb_key, scale, tags_json) VALUES (${esc(i.id)}, ${esc(i.sectorId)}, ${esc(i.name)}, ${esc(i.kind)}, ${esc(i.glbKey)}, ${i.scale}, ${esc(JSON.stringify(i.tags || []))});`,
    );
  }
  for (const inst of catalog.instances) {
    lines.push(
      `INSERT INTO world_instances (id, sector_id, kind, name, max_players, entry_url) VALUES (${esc(inst.id)}, ${esc(inst.sectorId)}, ${esc(inst.kind)}, ${esc(inst.name)}, ${inst.maxPlayers}, ${esc(inst.entryUrl)});`,
    );
  }
  for (const d of catalog.dungeons) {
    lines.push(
      `INSERT INTO world_dungeons (id, sector_id, name, entrance_model, min_level, boss_id, interior_glb, portal_mode) VALUES (${esc(d.id)}, ${esc(d.sectorId)}, ${esc(d.name)}, ${esc(d.entranceModel)}, ${d.minLevel}, ${esc(d.bossId)}, ${esc(d.interiorGlb || null)}, ${esc(d.portalMode)});`,
    );
  }
  for (const n of catalog.npcs) {
    lines.push(
      `INSERT INTO world_npcs (id, town_id, sector_id, name, role) VALUES (${esc(n.id)}, ${esc(n.townId)}, ${esc(n.sectorId)}, ${esc(n.name)}, ${esc(n.role)});`,
    );
  }
  for (const e of catalog.events) {
    lines.push(
      `INSERT INTO world_events (id, sector_id, name, event_type, schedule) VALUES (${esc(e.id)}, ${esc(e.sectorId)}, ${esc(e.name)}, ${esc(e.eventType)}, ${esc(e.schedule)});`,
    );
  }
  for (const b of catalog.bosses) {
    lines.push(
      `INSERT INTO world_bosses (id, sector_id, dungeon_id, name, model_key, phases, min_level) VALUES (${esc(b.id)}, ${esc(b.sectorId)}, ${esc(b.dungeonId)}, ${esc(b.name)}, ${esc(b.modelKey || null)}, ${b.phases}, ${b.minLevel});`,
    );
  }

  lines.push(
    `INSERT INTO production_catalog (key, version, payload_json) VALUES ('production-world', ${esc(VERSION)}, ${esc(JSON.stringify(catalog))});`,
  );
  lines.push(
    `INSERT INTO production_catalog (key, version, payload_json) VALUES ('onset-pattern', ${esc(VERSION)}, ${esc(JSON.stringify(catalog.onsetPattern))});`,
  );

  // Register key CDN assets into assets table (compatible with key column)
  for (const a of catalog.cdnAssets) {
    const id = `prod_${a.key.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 80)}`;
    const filename = a.key.split('/').pop();
    lines.push(
      `INSERT OR REPLACE INTO assets (id, key, filename, mime, size, tags, category, visibility, metadata, owner) VALUES (${esc(id)}, ${esc(a.key)}, ${esc(filename)}, ${esc(a.key.endsWith('.json') ? 'application/json' : 'model/gltf-binary')}, 0, ${esc(JSON.stringify(a.tags || []))}, ${esc(a.category)}, 'public', ${esc(JSON.stringify({ cdn: a.url, production: true }))}, 'production-refresh');`,
    );
  }

  return lines.join('\n') + '\n';
}

function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  console.log('wrote', file);
}

function resolveOs() {
  for (const c of OS_CANDIDATES) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function run(cmd, args, cwd) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  if (DRY) return { status: 0 };
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true, env: process.env });
  return r;
}

function main() {
  const catalog = buildCatalog();
  fs.mkdirSync(PUBLISHED, { recursive: true });

  writeJson(path.join(PUBLISHED, 'production-world.json'), catalog);
  writeJson(path.join(PUBLISHED, 'onset-pattern.json'), catalog.onsetPattern);

  // Refresh warlords-zones.json from production catalog (keep consumers working)
  const zonesDoc = {
    version: VERSION,
    updated: UPDATED,
    canonicalSource: 'grudge-builder/scripts/publish-production-world.mjs',
    worldSeedDefault: 'grudge-world-1',
    playBaseUrl: `${PLAY}/play`,
    oceanBaseUrl: `${PLAY}/ocean`,
    homeIslandUrl: `${PLAY}/home-island`,
    infoHub: 'https://info.grudge-studio.com',
    gameIdentity: {
      genre: 'freeform-arpg',
      classSystem: 'flavor-only',
      equipRule: 'any-race-any-weapon-any-armor',
    },
    notes: catalog.notes,
    grid: catalog.grid,
    legacyBridge: catalog.legacyBridge,
    zones: catalog.zones.map((z) => ({
      id: z.id,
      legacyId: z.legacyId,
      name: z.name,
      biome: z.biome,
      difficultyMin: z.difficultyMin,
      difficultyMax: z.difficultyMax,
      isSafeZone: z.isSafeZone,
      isContested: z.isContested,
      sizeMeters: z.sizeMeters,
      grid: z.grid,
      entryReady: true,
      capitalCityId: z.capitalCityId,
      foundation: z.foundation,
      playUrl: z.playUrl,
      systems: z.systems,
      resources: z.resources,
      description: z.description,
    })),
    towns: catalog.towns,
    dungeons: catalog.dungeons,
    bosses: catalog.bosses,
    events: catalog.events,
    recommendedFirstEntry: 'haven_shore',
  };
  writeJson(path.join(PUBLISHED, 'warlords-zones.json'), zonesDoc);

  const osDir = resolveOs();
  if (osDir) {
    for (const f of ['production-world.json', 'onset-pattern.json', 'warlords-zones.json']) {
      const src = path.join(PUBLISHED, f);
      const dest = path.join(osDir, f);
      fs.copyFileSync(src, dest);
      console.log('ObjectStore ←', f);
    }
  } else {
    console.warn('ObjectStore api/v1 not found — skipped copy');
  }

  const osRoot = osDir ? path.resolve(osDir, '..', '..') : path.resolve(ROOT, '..', 'ObjectStore');
  const seedPath = path.join(osRoot, 'workers', 'seed', 'production-world-data.sql');
  fs.mkdirSync(path.dirname(seedPath), { recursive: true });
  const sql = buildSql(catalog);
  fs.writeFileSync(seedPath, sql, 'utf8');
  console.log('seed SQL', seedPath, `(${sql.length} chars)`);

  // Also mirror under builder for reference
  const localSeed = path.join(ROOT, 'workers', 'seed', 'production-world-data.sql');
  fs.mkdirSync(path.dirname(localSeed), { recursive: true });
  fs.writeFileSync(localSeed, sql, 'utf8');

  if (SEED_D1) {
    const schema = path.join(osRoot, 'workers', 'schema-production-world.sql');
    if (!fs.existsSync(schema)) {
      console.error('Missing schema', schema);
      process.exit(1);
    }
    console.log('\n── D1 schema ──');
    let r = run('npx', ['wrangler', 'd1', 'execute', 'grudge-objectstore', '--remote', `--file=${schema}`], osRoot);
    if (r.status !== 0) process.exit(r.status ?? 1);
    console.log('\n── D1 seed ──');
    r = run('npx', ['wrangler', 'd1', 'execute', 'grudge-objectstore', '--remote', `--file=${seedPath}`], osRoot);
    if (r.status !== 0) process.exit(r.status ?? 1);
  }

  console.log('\n✅ Production world published v' + VERSION);
  console.log('   Sectors:', catalog.zones.length);
  console.log('   Towns:', catalog.towns.length);
  console.log('   Islands:', catalog.islands.length);
  console.log('   Dungeons:', catalog.dungeons.length);
  console.log('   NPCs:', catalog.npcs.length);
  console.log('   Events:', catalog.events.length);
  console.log('   Bosses:', catalog.bosses.length);
}

main();
