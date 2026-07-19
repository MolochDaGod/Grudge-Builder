/**
 * uMMORPG / 30grudge6 deployables for open-world Build (edit) mode.
 *
 * Sources (CDN, already live on assets.grudge-studio.com):
 *   - 30grudge6 race prefabs → models/grudge6/races/*
 *   - Toon soldiers (traveler / infantry / scout / bandit stand-ins)
 *   - uMMORPG vehicles → mounts + catapult / bolt-thrower
 *   - Creatures → models/creatures/* (monsters)
 *
 * Placement goes through BuildingSystem as terrain props (ghost + LMB).
 */
import { FLEET_URLS } from '../fleet/manifest';
import { RACE_GRUDGE6 } from '../fleet/character';
import {
  listMountDeployables,
  listSiegeDeployables,
} from '../fleet/vehicles';
import { TOON_SOLDIERS } from '../fleet/toonSoldiers';

const CDN = FLEET_URLS.assets;

export type DeployableKind =
  | 'traveler'
  | 'captain'
  | 'bandit'
  | 'monster'
  | 'siege'
  | 'mount';

export interface DeployableDef {
  id: string;
  name: string;
  kind: DeployableKind;
  /** Build category id used by ModePlayHUD tabs */
  buildCategory: 'units' | 'siege' | 'monsters';
  modelPath: string;
  color: number;
  size: [number, number, number];
  scale: number;
  description: string;
  /** Optional race for faction tint */
  raceId?: string;
}

/** Captains — race prefabs from 30grudge6 / Grudge6 pipeline */
export function grudge6CaptainDeployables(): DeployableDef[] {
  return Object.entries(RACE_GRUDGE6).map(([raceId, cfg]) => {
    const path = cfg.cdnPath.startsWith('http')
      ? cfg.cdnPath
      : `${CDN}${cfg.cdnPath.startsWith('/') ? cfg.cdnPath : `/${cfg.cdnPath}`}`;
    return {
      id: `unit_captain_${raceId}`,
      name: `${cfg.label} Captain`,
      kind: 'captain' as const,
      buildCategory: 'units' as const,
      modelPath: path,
      color: 0xc4a35a,
      size: [1.2, 2.0, 1.2] as [number, number, number],
      scale: cfg.scale,
      description: `uMMORPG-style ${cfg.label} race captain (30grudge6 / Grudge6 prefab).`,
      raceId,
    };
  });
}

/** Travelers — light infantry / scout toon + grudge6 human traveler */
export function travelerDeployables(): DeployableDef[] {
  const travelers: DeployableDef[] = [
    {
      id: 'unit_traveler_human',
      name: 'Human Traveler',
      kind: 'traveler',
      buildCategory: 'units',
      modelPath: `${CDN}/models/grudge6/races/WK_Characters.glb`,
      color: 0x8b9dc3,
      size: [1.0, 1.85, 1.0],
      scale: 1.0,
      description: 'Wanderer / trader NPC — 30grudge6 human kit.',
      raceId: 'human',
    },
  ];
  // Scout / medic toons double as travelers
  for (const t of TOON_SOLDIERS) {
    if (t.classId !== 'scout' && t.classId !== 'medic' && t.classId !== 'engineer') continue;
    travelers.push({
      id: `unit_traveler_${t.id.replace(/:/g, '_')}`,
      name: `${t.label} Traveler`,
      kind: 'traveler',
      buildCategory: 'units',
      modelPath: t.meshUrl,
      color: 0x6bcb77,
      size: [1.0, 1.8, 1.0],
      scale: 1.0,
      description: `Chicken-gun toon traveler (${t.role}).`,
    });
  }
  return travelers;
}

/** Bandits — hostile line infantry / orc / undead stand-ins */
export function banditDeployables(): DeployableDef[] {
  const bandits: DeployableDef[] = [
    {
      id: 'unit_bandit_orc',
      name: 'Orc Bandit',
      kind: 'bandit',
      buildCategory: 'units',
      modelPath: `${CDN}/models/grudge6/races/ORC_Characters.glb`,
      color: 0x5a7a3a,
      size: [1.3, 2.1, 1.3],
      scale: 1.1,
      description: 'Hostile orc raider (Grudge6 / uMMORPG bandit).',
      raceId: 'orc',
    },
    {
      id: 'unit_bandit_undead',
      name: 'Undead Bandit',
      kind: 'bandit',
      buildCategory: 'units',
      modelPath: `${CDN}/models/grudge6/races/UD_Characters.glb`,
      color: 0x6b6b5a,
      size: [1.1, 1.9, 1.1],
      scale: 1.0,
      description: 'Hostile undead scavenger.',
      raceId: 'undead',
    },
  ];
  for (const t of TOON_SOLDIERS) {
    if (t.classId !== 'infantry' && t.classId !== 'gunner') continue;
    bandits.push({
      id: `unit_bandit_${t.id.replace(/:/g, '_')}`,
      name: `${t.label} Bandit`,
      kind: 'bandit',
      buildCategory: 'units',
      modelPath: t.meshUrl,
      color: 0xa0522d,
      size: [1.0, 1.85, 1.0],
      scale: 1.0,
      description: `Hostile toon bandit (${t.role}).`,
    });
  }
  return bandits;
}

/** Siege — catapult + bolt thrower from uMMORPG vehicles */
export function siegeDeployables(): DeployableDef[] {
  return listSiegeDeployables().map((s) => ({
    id: s.id,
    name: s.name,
    kind: 'siege' as const,
    buildCategory: 'siege' as const,
    modelPath: s.modelPath,
    color: s.kind === 'ballista' ? 0x8b7355 : 0x6b4423,
    size: s.kind === 'ballista' ? [3.5, 2.5, 4] as [number, number, number] : [4, 3, 5] as [number, number, number],
    scale: 1.0,
    description:
      s.kind === 'ballista'
        ? 'Elf bolt-thrower (ballista) — uMMORPG siege engine.'
        : 'Catapult — uMMORPG siege engine.',
    raceId: s.raceId,
  }));
}

/** Mounts — cavalry (deployable props for camps / storyboards) */
export function mountDeployables(): DeployableDef[] {
  return listMountDeployables().map((m) => ({
    id: m.id,
    name: m.name,
    kind: 'mount' as const,
    buildCategory: 'units' as const,
    modelPath: m.modelPath,
    color: 0x8b6914,
    size: [2.2, 2.0, 2.5] as [number, number, number],
    scale: 1.0,
    description: 'Cavalry mount — rideable mesh from uMMORPG Toon RTS.',
    raceId: m.raceId,
  }));
}

/** Monsters — subset of open-world creature GLBs */
export function monsterDeployables(): DeployableDef[] {
  const monsters: Array<{ id: string; name: string; path: string; scale: number; color: number }> = [
    { id: 'wolf', name: 'Grey Wolf', path: '/models/creatures/land/wolf.glb', scale: 1, color: 0x888888 },
    { id: 'boar', name: 'Wild Boar', path: '/models/creatures/land/boar.glb', scale: 1, color: 0x6b4423 },
    { id: 'bear', name: 'Bear', path: '/models/creatures/land/bear.glb', scale: 1.2, color: 0x4a3728 },
    { id: 'deer', name: 'Deer', path: '/models/creatures/land/deer.glb', scale: 1, color: 0xa67c52 },
  ];
  return monsters.map((m) => ({
    id: `monster_${m.id}`,
    name: m.name,
    kind: 'monster' as const,
    buildCategory: 'monsters' as const,
    modelPath: `${CDN}${m.path}`,
    color: m.color,
    size: [1.5, 1.5, 2.0] as [number, number, number],
    scale: m.scale,
    description: `Wildlife / monster deployable (${m.id}).`,
  }));
}

/** Full flat list for registration into BUILD_ASSETS */
export function allUmmorpgDeployables(): DeployableDef[] {
  return [
    ...grudge6CaptainDeployables(),
    ...travelerDeployables(),
    ...banditDeployables(),
    ...mountDeployables(),
    ...siegeDeployables(),
    ...monsterDeployables(),
  ];
}
