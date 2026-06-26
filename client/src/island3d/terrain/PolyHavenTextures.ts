/**
 * PolyHavenTextures — curated Poly Haven PBR sets for lobby surface layers.
 */
import * as THREE from 'three';
import {
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
  | 'building';

/** Curated CC0 assets — beaches, greens, rocks, ore veins */
export const LOBBY_POLYHAVEN_ASSETS: Record<LobbyTextureLayer, string> = {
  beach: 'aerial_beach_01',
  grass: 'forest_ground_04',
  forest: 'forest_leaves_02',
  rock: 'cliff_side',
  ore: 'metal_plate_02',
  path: 'brown_mud_leaves_01',
  building: 'wood_planks_dirt',
};

export interface LobbyMaterialSet {
  beach: THREE.MeshStandardMaterial;
  grass: THREE.MeshStandardMaterial;
  forest: THREE.MeshStandardMaterial;
  rock: THREE.MeshStandardMaterial;
  ore: THREE.MeshStandardMaterial;
  path: THREE.MeshStandardMaterial;
  building: THREE.MeshStandardMaterial;
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
): Promise<THREE.MeshStandardMaterial> {
  const mat = new THREE.MeshStandardMaterial({ color: fallbackColor, roughness: 0.85, metalness: 0 });
  if (maps.map) mat.map = loadTex(maps.map, repeat);
  if (maps.normalMap) {
    mat.normalMap = loadDataTex(maps.normalMap, repeat);
    mat.normalScale.set(0.6, 0.6);
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
  };

  const mat = new THREE.MeshStandardMaterial({
    map: texMap[layer],
    roughness: 0.9,
    metalness: layer === 'ore' ? 0.35 : 0,
  });
  materialCache.set(key, mat);
  return mat;
}

export async function loadLobbyPolyHavenMaterials(
  resolution: PolyHavenResolution = '2k',
): Promise<LobbyMaterialSet> {
  const layers = Object.keys(LOBBY_POLYHAVEN_ASSETS) as LobbyTextureLayer[];
  const repeatByLayer: Record<LobbyTextureLayer, number> = {
    beach: 12,
    grass: 10,
    forest: 8,
    rock: 6,
    ore: 5,
    path: 10,
    building: 4,
  };
  const colorByLayer: Record<LobbyTextureLayer, number> = {
    beach: 0xd4c4a0,
    grass: 0x4a7c3f,
    forest: 0x2d5a28,
    rock: 0x7a7568,
    ore: 0x8a7a60,
    path: 0x6b5a48,
    building: 0x5c4030,
  };

  const entries = await Promise.all(
    layers.map(async (layer) => {
      const assetId = LOBBY_POLYHAVEN_ASSETS[layer];
      try {
        const maps = await resolvePolyHavenPBR(assetId, resolution);
        const mat = await buildMaterialFromMaps(maps, repeatByLayer[layer], colorByLayer[layer]);
        return [layer, mat] as const;
      } catch (err) {
        console.warn(`[PolyHaven] ${assetId} failed, using procedural:`, err);
        return [layer, proceduralFallback(layer)] as const;
      }
    }),
  );

  return Object.fromEntries(entries) as LobbyMaterialSet;
}