/**
 * Play-race capital cities — Warlords open world (WORLD_SECTORS).
 *
 * Playable races (Toon / Foundry / FACTION_RACE_LABELS):
 *   human, barbarian, elf, dwarf, orc, undead
 * Crusade = Human + Barbarian → both land at Haven Port (haven_shore).
 *
 * Ashen Throne is a **demon NPC tribe** seat on ashen_wastes — not a play race,
 * not a player capital. See NPC_TRIBE_SETTLEMENTS.
 *
 * Three entry: /play?sector=<zoneId>&mode=zone&worldSeed=grudge-world-1
 * Hub: /world-map → land into sector Three instance
 */

import type { RaceId } from './lore';
import { resolveZoneSectorId } from './sectorBridge';

/** Playable race keys that have a capital (barbarian shares Haven Port). */
export type PlayableRaceCityRace =
  | 'human'
  | 'barbarian'
  | 'elf'
  | 'dwarf'
  | 'orc'
  | 'undead';

export type RaceCityId =
  | 'haven_port'
  | 'runeforge_hold'
  | 'starweave_canopy'
  | 'pit_foundry'
  | 'drowned_sepulcher';

export interface RaceCity {
  id: RaceCityId;
  /** Primary play race for this capital (barbarian uses haven_port via getRaceCity). */
  raceId: PlayableRaceCityRace;
  name: string;
  subtitle: string;
  /** Canonical WORLD_SECTORS id */
  sectorId: string;
  /** Optional link to FACTION_TOWNS key for 3D composeTown */
  factionTownKey?: 'crusade' | 'legion' | 'fabled';
  dungeon: {
    id: string;
    name: string;
    entranceModel: 'portal' | 'cave' | 'ruins' | 'gate' | 'tree_hollow';
  };
  harvest: Array<'mining' | 'herbalism' | 'woodcutting' | 'skinning' | 'fishing'>;
  description: string;
  modelPath: string;
  modelScale: number;
}

/** Player-facing race capitals only. One marker per city (Haven Port = Crusade). */
export const RACE_CITIES: RaceCity[] = [
  {
    id: 'haven_port',
    raceId: 'human',
    name: 'Haven Port',
    subtitle: 'Crusade Capital · Human + Barbarian · PVE Trade',
    sectorId: 'haven_shore',
    factionTownKey: undefined,
    dungeon: { id: 'tropical_dungeon_0', name: "Pirate's Crypt", entranceModel: 'cave' },
    harvest: ['fishing', 'woodcutting', 'herbalism'],
    description:
      'Safe tropical PVE trade hub (Fruzer islands foundation). Crusade humans and barbarians land here. ' +
      'Four vendors, mission givers, DB harvest UUIDs, enemy vessels offshore. Map ocean only — no embedded water mesh.',
    modelPath: '/models/warlords/haven_shore/fruzer_islands.glb',
    modelScale: 2.4,
  },
  {
    id: 'runeforge_hold',
    raceId: 'dwarf',
    name: 'Runeforge Hold',
    subtitle: 'Dwarf Capital · Fabled Core',
    sectorId: 'frostbite_expanse',
    factionTownKey: 'fabled',
    dungeon: { id: 'frozen_dungeon_0', name: 'Glacial Depths', entranceModel: 'cave' },
    harvest: ['mining', 'skinning'],
    description:
      'Fabled sector core (fabledzone.glb): multi-island forge village. Cave doorways and building mouths ' +
      'portal into the uMMORPG dwarf main city / castle and hold interiors. Extra procedural islands around the core.',
    modelPath: '/models/warlords/fabled/fabledzone.glb',
    modelScale: 1.15,
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
];

/**
 * NPC monster-tribe seats on the 9 sectors. Not playable, not Foundry races.
 * Ashen Throne = demon tribe on ashen_wastes.
 */
export const NPC_TRIBE_SETTLEMENTS = [
  {
    id: 'ashen_throne',
    tribeId: 'demon',
    playable: false as const,
    name: 'Ashen Throne',
    subtitle: 'Demon tribe · Glass Desert (NPC)',
    sectorId: 'ashen_wastes',
    dungeon: { id: 'desert_dungeon_0', name: 'Sunken Tomb', entranceModel: 'ruins' as const },
    description:
      'Scorched wastes and glass dunes. Demon monster tribe seat — not a player race, not a Foundry option.',
  },
] as const;

const BY_RACE: Record<string, RaceCity | undefined> = Object.fromEntries(
  RACE_CITIES.map((c) => [c.raceId, c]),
);
BY_RACE.barbarian = RACE_CITIES.find((c) => c.id === 'haven_port');

const BY_SECTOR = new Map(RACE_CITIES.map((c) => [c.sectorId, c]));
const BY_ID = Object.fromEntries(RACE_CITIES.map((c) => [c.id, c])) as Record<RaceCityId, RaceCity>;

export function getRaceCity(raceId: string): RaceCity | null {
  const s = String(raceId || '').trim().toLowerCase();
  if (s === 'demon') return null;
  return BY_RACE[s as RaceId] ?? BY_RACE[s] ?? null;
}

export function getRaceCityBySector(sectorId: string): RaceCity | null {
  const zone = resolveZoneSectorId(sectorId);
  return BY_SECTOR.get(zone) ?? null;
}

export function getRaceCityById(id: string): RaceCity | null {
  if (id === 'ashen_throne') return null;
  return BY_ID[id as RaceCityId] ?? null;
}

export function raceCityPlayUrl(
  city: RaceCity,
  worldSeed = 'grudge-world-1',
): string {
  return `/play?sector=${encodeURIComponent(city.sectorId)}&mode=zone&worldSeed=${encodeURIComponent(worldSeed)}&city=${encodeURIComponent(city.id)}`;
}

export function raceCitySectorIds(): string[] {
  return RACE_CITIES.map((c) => c.sectorId);
}
