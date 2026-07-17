/**
 * Race capital cities — Unity-era world map content for Three.js open world.
 *
 * 6 playable races each get a capital in a Warlords zone (WORLD_SECTORS).
 * Faction towns (Crusade / Legion / Fabled) still live in factionTowns.ts;
 * race cities are the player-facing “go to my race city” layer + dungeon/harvest tags.
 *
 * Three entry: /play?sector=<zoneId>&mode=zone&worldSeed=grudge-world-1
 * Hub: /world-map → land into sector Three instance
 */

import type { RaceId } from './lore';
import { resolveZoneSectorId } from './sectorBridge';

export type RaceCityId =
  | 'haven_port'
  | 'runeforge_hold'
  | 'starweave_canopy'
  | 'pit_foundry'
  | 'drowned_sepulcher'
  | 'ashen_throne';

export interface RaceCity {
  id: RaceCityId;
  /** Primary race for this capital */
  raceId: RaceId;
  name: string;
  subtitle: string;
  /** Canonical WORLD_SECTORS id */
  sectorId: string;
  /** Optional link to FACTION_TOWNS key for 3D composeTown */
  factionTownKey?: 'crusade' | 'legion' | 'fabled';
  /** Dungeon showcase for this capital’s sector */
  dungeon: {
    id: string;
    name: string;
    entranceModel: 'portal' | 'cave' | 'ruins' | 'gate' | 'tree_hollow';
  };
  /** Harvest professions emphasized near the city */
  harvest: Array<'mining' | 'herbalism' | 'woodcutting' | 'skinning' | 'fishing'>;
  /** Short blurb for world map UI */
  description: string;
  /** Town GLB path when no faction town composition exists */
  modelPath: string;
  modelScale: number;
}

/** Six race capitals — mirrors Unity world fantasy layout */
export const RACE_CITIES: RaceCity[] = [
  {
    id: 'haven_port',
    raceId: 'human',
    name: 'Haven Port',
    subtitle: 'Human Capital · PVE Trade Village',
    sectorId: 'haven_shore',
    factionTownKey: undefined,
    dungeon: { id: 'tropical_dungeon_0', name: "Pirate's Crypt", entranceModel: 'cave' },
    harvest: ['fishing', 'woodcutting', 'herbalism'],
    description:
      'Safe tropical PVE trade hub (Fruzer islands foundation). Four vendors, mission givers, ' +
      'DB harvest UUIDs, enemy vessels offshore. Map ocean only — no embedded water mesh.',
    // Fruzer chicken_gun islands — loaded via HavenShoreFoundationLoader in zone mode
    modelPath: '/models/warlords/haven_shore/fruzer_islands.glb',
    modelScale: 2.4,
  },
  {
    id: 'runeforge_hold',
    raceId: 'dwarf',
    name: 'Runeforge Hold',
    subtitle: 'Dwarf Capital · Frost Peaks',
    sectorId: 'frostbite_expanse',
    factionTownKey: 'fabled',
    dungeon: { id: 'frozen_dungeon_0', name: 'Glacial Depths', entranceModel: 'cave' },
    harvest: ['mining', 'skinning'],
    description: 'Frozen highland forges and sealed dwarven gates. Ore veins and glacial dungeons.',
    modelPath: '/models/towns/cathedral_sanctum.glb',
    modelScale: 1.0,
  },
  {
    id: 'starweave_canopy',
    raceId: 'elf',
    name: 'Starweave Canopy',
    subtitle: 'Elf Capital · Ancient Forest',
    sectorId: 'thornwood_wilds',
    factionTownKey: undefined,
    dungeon: { id: 'forest_dungeon_0', name: 'Thornwood Labyrinth', entranceModel: 'tree_hollow' },
    harvest: ['woodcutting', 'herbalism', 'skinning'],
    description: 'Living canopy city of the Fabled kin. Timber, herbs, and the thorn labyrinth.',
    modelPath: '/models/towns/cathedral_sanctum.glb',
    modelScale: 0.9,
  },
  {
    id: 'pit_foundry',
    raceId: 'orc',
    name: 'The Pit Foundry',
    subtitle: 'Orc Capital · Volcanic Creations',
    sectorId: 'ember_depths',
    factionTownKey: 'legion',
    dungeon: { id: 'volcanic_dungeon_0', name: 'Magma Core', entranceModel: 'gate' },
    harvest: ['mining', 'skinning'],
    description: 'Volcanic caldera of the Legion. Magma forges, ore, and fire dungeons.',
    modelPath: '/models/towns/pit_foundry.glb',
    modelScale: 1.0,
  },
  {
    id: 'drowned_sepulcher',
    raceId: 'undead',
    name: 'Drowned Sepulcher',
    subtitle: 'Undead Capital · Flooded Ruins',
    sectorId: 'abyssal_trench',
    factionTownKey: 'legion',
    dungeon: { id: 'abyssal_dungeon_0', name: 'Drowned Cathedral', entranceModel: 'ruins' },
    harvest: ['fishing', 'mining'],
    description: 'Half-sunken city of rites and tide gates. Fishing, salvage, drowned dungeons.',
    modelPath: '/models/towns/pit_foundry.glb',
    modelScale: 0.85,
  },
  {
    id: 'ashen_throne',
    raceId: 'demon',
    name: 'Ashen Throne',
    subtitle: 'Demon Capital · Glass Desert',
    sectorId: 'ashen_wastes',
    factionTownKey: 'crusade',
    dungeon: { id: 'desert_dungeon_0', name: 'Sunken Tomb', entranceModel: 'ruins' },
    harvest: ['mining', 'herbalism'],
    description: 'Scorched wastes and glass dunes. Hostile harvest routes and tomb dungeons.',
    modelPath: '/models/towns/crusade/exterior.glb',
    modelScale: 1.2,
  },
];

const BY_RACE = Object.fromEntries(RACE_CITIES.map((c) => [c.raceId, c])) as Record<
  RaceId,
  RaceCity | undefined
>;
const BY_SECTOR = new Map(RACE_CITIES.map((c) => [c.sectorId, c]));
const BY_ID = Object.fromEntries(RACE_CITIES.map((c) => [c.id, c])) as Record<RaceCityId, RaceCity>;

export function getRaceCity(raceId: string): RaceCity | null {
  return BY_RACE[raceId as RaceId] ?? null;
}

export function getRaceCityBySector(sectorId: string): RaceCity | null {
  const zone = resolveZoneSectorId(sectorId);
  return BY_SECTOR.get(zone) ?? null;
}

export function getRaceCityById(id: string): RaceCity | null {
  return BY_ID[id as RaceCityId] ?? null;
}

/** Three.js open-world URL for a race capital */
export function raceCityPlayUrl(
  city: RaceCity,
  worldSeed = 'grudge-world-1',
): string {
  return `/play?sector=${encodeURIComponent(city.sectorId)}&mode=zone&worldSeed=${encodeURIComponent(worldSeed)}&city=${encodeURIComponent(city.id)}`;
}

/** All sectors that host a race capital */
export function raceCitySectorIds(): string[] {
  return RACE_CITIES.map((c) => c.sectorId);
}
