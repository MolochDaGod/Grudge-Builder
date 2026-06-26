/**
 * PolyHavenTextures — lobby PBR layers sourced from https://polyhaven.com/textures
 *
 * Pirate lobby uses the Smugglers Cove coastal collection where possible:
 * beaches, damp sand, cliff rock, forest floor, ore gravel, dock wood, coral shore.
 */
import * as THREE from 'three';
import {
  polyHavenTextureUrl,
  resolvePolyHavenPBR,
  type PolyHavenPBRMaps,
  type PolyHavenResolution,
} from '@/lib/polyHavenApi';
import {
  createSandTexture,
  createGrassShortTexture,
  createGrassTallTexture,
  createRockTexture,
  createSeafloorTexture,
} from './ProceduralTextures';

export type LobbyTextureLayer =
  | 'beach'
  | 'grass'
  | 'forest'
  | 'rock'
  | 'ore'
  | 'path'
  | 'building'
  | 'seafloor';

/** Curated CC0 sets — swap ids anytime; browse at polyhaven.com/textures */
export const LOBBY_POLYHAVEN_ASSETS: Record<LobbyTextureLayer, string> = {
  beach: 'coast_sand_01',           // Smugglers Cove — damp coastal sand + pebbles
  grass: 'forest_ground_04',        // Verdant Trail — dry forest floor
  forest: 'brown_mud_leaves_01',    // leaves, moss, forest floor plants
  rock: 'coast_sand_rocks_02',      // Smugglers Cove — cliff + moss + coastal rock
  ore: 'brown_mud_rocks_01',        // gravel, stones, mining/riverbank
  path: 'dirt_floor',               // woodland paths + debris
  building: 'defense_wall',         // aged fort stone (docks / battlements)
  seafloor: 'coral_ground_02',      // submerged coral + porous limestone
};

/** Human-readable catalog entries for HUD / debug */
export const LOBBY_POLYHAVEN_CATALOG: Record<LobbyTextureLayer, { name: string; url: string; collection?: string }> = {
  beach: { name: 'Coast Sand 01', url: polyHavenTextureUrl('coast_sand_01'), collection: 'smugglers_cove' },
  grass: { name: 'Forest Ground 04', url: polyHavenTextureUrl('forest_ground_04'), collection: 'verdant_trail' },
  forest: { name: 'Brown Mud Leaves 01', url: polyHavenTextureUrl('brown_mud_leaves_01') },
  rock: { name: 'Coast Sand Rocks 02', url: polyHavenTextureUrl('coast_sand_rocks_02'), collection: 'smugglers_cove' },
  ore: { name: 'Brown Mud Rocks 01', url: polyHavenTextureUrl('brown_mud_rocks_01') },
  path: { name: 'Dirt Floor', url: polyHavenTextureUrl('dirt_floor'), collection: 'verdant_trail' },
  building: { name: 'Defense Wall', url: polyHavenTextureUrl('defense_wall') },
  seafloor: { name: 'Coral Ground 02', url: polyHavenTextureUrl('coral_ground_02') },
};

export interface LobbyMaterialSet {
  beach: THREE.MeshStandardMaterial;
  grass: THREE.MeshStandardMaterial;
  forest: THREE.MeshStandardMaterial;
  rock: THREE.MeshStandardMaterial;
  ore: THREE.MeshStandardMaterial;
  path: THREE.MeshStandardMaterial;
  building: THREE.MeshStandardMaterial;
  seafloor: THREE.MeshStandardMaterial;
}

const loader = new THREE.TextureLoader();
const materialCache = new Map<string, THREE.MeshStandardMaterial>();

function loadTex(url: string, repeat = 8): THREE.Texture {
  const tex = loader.load(url);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function loadDataTex(url: string, repeat = 8): THREE.Texture {
  const tex = loader.load(url);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  return tex;
}

async function buildMaterialFromMaps(
  maps: PolyHavenPBRMaps,
  repeat: number,
  fallbackColor: number,
  metalness = 0,
): Promise<THREE.MeshStandardMaterial> {
  const mat = new THREE.MeshStandardMaterial({ color: fallbackColor, roughness: 0.85, metalness });
  if (maps.map) mat.map = loadTex(maps.map, repeat);
  if (maps.normalMap) {
    mat.normalMap = loadDataTex(maps.normalMap, repeat);
    mat.normalScale.set(0.65, 0.65);
  }
  if (maps.roughnessMap) mat.roughnessMap = loadDataTex(maps.roughnessMap, repeat);
  if (maps.aoMap) mat.aoMap = loadDataTex(maps.aoMap, repeat);
  mat.needsUpdate = true;
  return mat;
}

function proceduralFallback(layer: LobbyTextureLayer): THREE.MeshStandardMaterial {
  const key = `proc:${layer}`;
  const cached = materialCache.get(key);
  if (cached) return cached;

  const texMap: Record<LobbyTextureLayer, THREE.Texture> = {
    beach: createSandTexture(),
    grass: createGrassShortTexture(),
    forest: createGrassTallTexture(),
    rock: createRockTexture(),
    ore: createRockTexture(),
    path: createSandTexture(),
    building: createSeafloorTexture(),
    seafloor: createSeafloorTexture(),
  };

  const mat = new THREE.MeshStandardMaterial({
    map: texMap[layer],
    roughness: 0.9,
    metalness: layer === 'ore' ? 0.2 : 0,
  });
  materialCache.set(key, mat);
  return mat;
}

export async function loadLobbyPolyHavenMaterials(
  resolution: PolyHavenResolution = '2k',
): Promise<LobbyMaterialSet> {
  const layers = Object.keys(LOBBY_POLYHAVEN_ASSETS) as LobbyTextureLayer[];
  const repeatByLayer: Record<LobbyTextureLayer, number> = {
    beach: 14,
    grass: 10,
    forest: 8,
    rock: 5,
    ore: 6,
    path: 10,
    building: 3,
    seafloor: 12,
  };
  const colorByLayer: Record<LobbyTextureLayer, number> = {
    beach: 0xc4a882,
    grass: 0x4a7c3f,
    forest: 0x3d5a30,
    rock: 0x6b6358,
    ore: 0x7a6e58,
    path: 0x5c4a38,
    building: 0x4a4038,
    seafloor: 0x3a4a52,
  };
  const metalByLayer: Record<LobbyTextureLayer, number> = {
    beach: 0, grass: 0, forest: 0, rock: 0, ore: 0.15, path: 0, building: 0, seafloor: 0,
  };

  const entries = await Promise.all(
    layers.map(async (layer) => {
      const assetId = LOBBY_POLYHAVEN_ASSETS[layer];
      try {
        const maps = await resolvePolyHavenPBR(assetId, resolution, layer);
        const mat = await buildMaterialFromMaps(
          maps,
          repeatByLayer[layer],
          colorByLayer[layer],
          metalByLayer[layer],
        );
        return [layer, mat] as const;
      } catch (err) {
        console.warn(`[PolyHaven] ${assetId} failed, using procedural:`, err);
        return [layer, proceduralFallback(layer)] as const;
      }
    }),
  );

  console.info('[PolyHaven] Lobby layers loaded from', 'https://polyhaven.com/textures');
  return Object.fromEntries(entries) as LobbyMaterialSet;
}