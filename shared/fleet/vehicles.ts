/**
 * uMMORPG / Toon RTS vehicles — mounts + siege (catapult, bolt-thrower).
 * CDN SSOT: assets.grudge-studio.com/models/ummorpg-vehicles-catalog.json
 * Source pipeline: ObjectStore/scripts/process-ummorpg-vehicles.mjs
 */
import { FLEET_URLS } from './manifest';

export const UMMORPG_VEHICLES_CATALOG_URL =
  `${FLEET_URLS.assets}/models/ummorpg-vehicles-catalog.json` as const;

export type VehicleRaceId =
  | 'human'
  | 'barbarian'
  | 'elf'
  | 'dwarf'
  | 'orc'
  | 'undead';

export type SiegeKind = 'catapult' | 'ballista';

export interface VehicleAnimRef {
  cdnKey: string;
  cdnUrl: string;
}

export interface MountDef {
  kind: 'cavalry';
  cdnKey: string;
  cdnUrl: string;
  riderBone: string;
  riderOffsetY: number;
  anims: Record<string, VehicleAnimRef>;
}

export interface SiegeDef {
  kind: SiegeKind;
  cdnKey: string;
  cdnUrl: string;
  anims: Record<string, VehicleAnimRef>;
}

export interface RaceVehicles {
  raceId: VehicleRaceId;
  mount: MountDef | null;
  siege: SiegeDef | null;
}

const CDN = FLEET_URLS.assets;

function mountUrl(race: string): string {
  return `${CDN}/models/vehicles/mounts/${race}/cavalry.glb`;
}

function catapultUrl(race: string): string {
  return `${CDN}/models/vehicles/siege/${race}/catapult.glb`;
}

function boltThrowerUrl(): string {
  return `${CDN}/models/vehicles/siege/elf/bolt-thrower.glb`;
}

/** Static race vehicle table (mirrors CDN catalog; safe offline). */
export const RACE_VEHICLES: Record<VehicleRaceId, RaceVehicles> = {
  human: {
    raceId: 'human',
    mount: {
      kind: 'cavalry',
      cdnKey: 'models/vehicles/mounts/human/cavalry.glb',
      cdnUrl: mountUrl('human'),
      riderBone: 'Bip001',
      riderOffsetY: 1.2,
      anims: {},
    },
    siege: {
      kind: 'catapult',
      cdnKey: 'models/vehicles/siege/human/catapult.glb',
      cdnUrl: catapultUrl('human'),
      anims: {},
    },
  },
  barbarian: {
    raceId: 'barbarian',
    mount: {
      kind: 'cavalry',
      cdnKey: 'models/vehicles/mounts/barbarian/cavalry.glb',
      cdnUrl: mountUrl('barbarian'),
      riderBone: 'Bip001',
      riderOffsetY: 1.2,
      anims: {},
    },
    siege: null,
  },
  elf: {
    raceId: 'elf',
    mount: {
      kind: 'cavalry',
      cdnKey: 'models/vehicles/mounts/elf/cavalry.glb',
      cdnUrl: mountUrl('elf'),
      riderBone: 'Bip001',
      riderOffsetY: 1.2,
      anims: {},
    },
    siege: {
      kind: 'ballista',
      cdnKey: 'models/vehicles/siege/elf/bolt-thrower.glb',
      cdnUrl: boltThrowerUrl(),
      anims: {},
    },
  },
  dwarf: {
    raceId: 'dwarf',
    mount: {
      kind: 'cavalry',
      cdnKey: 'models/vehicles/mounts/dwarf/cavalry.glb',
      cdnUrl: mountUrl('dwarf'),
      riderBone: 'Bip001',
      riderOffsetY: 1.2,
      anims: {},
    },
    siege: null,
  },
  orc: {
    raceId: 'orc',
    mount: {
      kind: 'cavalry',
      cdnKey: 'models/vehicles/mounts/orc/cavalry.glb',
      cdnUrl: mountUrl('orc'),
      riderBone: 'Bip001',
      riderOffsetY: 1.2,
      anims: {},
    },
    siege: {
      kind: 'catapult',
      cdnKey: 'models/vehicles/siege/orc/catapult.glb',
      cdnUrl: catapultUrl('orc'),
      anims: {},
    },
  },
  undead: {
    raceId: 'undead',
    mount: {
      kind: 'cavalry',
      cdnKey: 'models/vehicles/mounts/undead/cavalry.glb',
      cdnUrl: mountUrl('undead'),
      riderBone: 'Bip001',
      riderOffsetY: 1.2,
      anims: {},
    },
    siege: null,
  },
};

export function resolveVehicleMesh(
  raceId: string,
  kind: 'mount' | 'siege',
): string | null {
  const race = (raceId in RACE_VEHICLES ? raceId : 'human') as VehicleRaceId;
  const entry = RACE_VEHICLES[race];
  if (kind === 'mount') return entry.mount?.cdnUrl ?? null;
  return entry.siege?.cdnUrl ?? null;
}

export function listSiegeDeployables(): Array<{
  id: string;
  raceId: VehicleRaceId;
  kind: SiegeKind;
  name: string;
  modelPath: string;
}> {
  const out: Array<{
    id: string;
    raceId: VehicleRaceId;
    kind: SiegeKind;
    name: string;
    modelPath: string;
  }> = [];
  for (const [raceId, v] of Object.entries(RACE_VEHICLES) as [VehicleRaceId, RaceVehicles][]) {
    if (!v.siege) continue;
    const label = v.siege.kind === 'ballista' ? 'Bolt Thrower' : 'Catapult';
    out.push({
      id: `siege_${raceId}_${v.siege.kind}`,
      raceId,
      kind: v.siege.kind,
      name: `${raceId[0].toUpperCase()}${raceId.slice(1)} ${label}`,
      modelPath: v.siege.cdnUrl,
    });
  }
  return out;
}

export function listMountDeployables(): Array<{
  id: string;
  raceId: VehicleRaceId;
  name: string;
  modelPath: string;
}> {
  return (Object.entries(RACE_VEHICLES) as [VehicleRaceId, RaceVehicles][])
    .filter(([, v]) => !!v.mount)
    .map(([raceId, v]) => ({
      id: `mount_${raceId}_cavalry`,
      raceId,
      name: `${raceId[0].toUpperCase()}${raceId.slice(1)} Cavalry`,
      modelPath: v.mount!.cdnUrl,
    }));
}
