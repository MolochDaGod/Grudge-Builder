/**
 * GroundPBRTextures — 4K PBR ground materials for home-islands + 9 world sectors.
 * Catalog synced with grudge-studio-publish assets/GroundPBRCatalog.js
 */
import * as THREE from 'three';
import type { WorldSector } from '@shared/definitions/worldMapSectors';
import { assetUrl, ASSET_CDN_BASE } from '@/lib/assetConfig';

/** R2 CDN — never load from local public/ at runtime */
export const GROUND_PBR_CDN_MANIFEST = assetUrl('/textures/pbr/ground/manifest.json');
export const GROUND_PBR_BASE = `${ASSET_CDN_BASE}/textures/pbr/ground`;

export type GroundMaterialId =
  | 'ground_1' | 'ground_2' | 'ground_3' | 'ground_4' | 'ground_5'
  | 'ground_6' | 'ground_7' | 'ground_8' | 'ground_9' | 'ground_10';

export interface GroundPBRDef {
  id: GroundMaterialId;
  name: string;
  repeat: number;
  roughness: number;
  metalness: number;
  maps: {
    baseColor: string;
    normal: string;
    roughness: string;
    ao: string;
    height: string;
    metallic: string;
  };
}

function mapsFor(n: number): GroundPBRDef['maps'] {
  const base = `/textures/pbr/ground/Ground_${n}`;
  return {
    baseColor: assetUrl(`${base}_BaseColor.png`),
    normal: assetUrl(`${base}_Normal.png`),
    roughness: assetUrl(`${base}_Roughness.png`),
    ao: assetUrl(`${base}_AmbientOcclusion.png`),
    height: assetUrl(`${base}_Height.png`),
    metallic: assetUrl(`${base}_Metallic.png`),
  };
}

export const GROUND_PBR_MATERIALS: Record<GroundMaterialId, GroundPBRDef> = {
  ground_1: { id: 'ground_1', name: 'Tropical Shore', repeat: 12, roughness: 0.88, metalness: 0, maps: mapsFor(1) },
  ground_2: { id: 'ground_2', name: 'Verdant Meadow', repeat: 10, roughness: 0.9, metalness: 0, maps: mapsFor(2) },
  ground_3: { id: 'ground_3', name: 'Sun-Baked Dunes', repeat: 8, roughness: 0.85, metalness: 0.05, maps: mapsFor(3) },
  ground_4: { id: 'ground_4', name: 'Storm Reef Gravel', repeat: 6, roughness: 0.82, metalness: 0.1, maps: mapsFor(4) },
  ground_5: { id: 'ground_5', name: 'Volcanic Ash', repeat: 7, roughness: 0.78, metalness: 0.15, maps: mapsFor(5) },
  ground_6: { id: 'ground_6', name: 'Thornwood Floor', repeat: 9, roughness: 0.92, metalness: 0, maps: mapsFor(6) },
  ground_7: { id: 'ground_7', name: 'Frostbite Tundra', repeat: 10, roughness: 0.75, metalness: 0.05, maps: mapsFor(7) },
  ground_8: { id: 'ground_8', name: 'Ethereal Moss', repeat: 8, roughness: 0.88, metalness: 0.08, maps: mapsFor(8) },
  ground_9: { id: 'ground_9', name: 'Abyssal Silt', repeat: 11, roughness: 0.7, metalness: 0.12, maps: mapsFor(9) },
  ground_10: { id: 'ground_10', name: 'Nexus Fracture', repeat: 5, roughness: 0.65, metalness: 0.25, maps: mapsFor(10) },
};

/** Primary ground per 9-sector world map */
export const SECTOR_GROUND_MATERIALS: Record<string, GroundMaterialId> = {
  frostbite_expanse: 'ground_7',
  stormbreak_reef: 'ground_4',
  thornwood_wilds: 'ground_6',
  ashen_wastes: 'ground_3',
  convergence_nexus: 'ground_10',
  ethereal_falls: 'ground_8',
  abyssal_trench: 'ground_9',
  ember_depths: 'ground_5',
  haven_shore: 'ground_1',
};

const loader = new THREE.TextureLoader();
const texCache = new Map<string, THREE.Texture>();

function loadTex(url: string, repeat: number, srgb = false): THREE.Texture {
  const key = `${url}:${repeat}:${srgb}`;
  const cached = texCache.get(key);
  if (cached) return cached;
  const tex = loader.load(url);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, tex);
  return tex;
}

export function createPBRGroundMaterial(
  materialId: GroundMaterialId,
  options: { repeat?: number; color?: number } = {},
): THREE.MeshStandardMaterial {
  const def = GROUND_PBR_MATERIALS[materialId];
  const repeat = options.repeat ?? def.repeat;
  const mat = new THREE.MeshStandardMaterial({
    color: options.color ?? 0xffffff,
    roughness: def.roughness,
    metalness: def.metalness,
  });
  mat.map = loadTex(def.maps.baseColor, repeat, true);
  mat.normalMap = loadTex(def.maps.normal, repeat, false);
  mat.normalScale.set(0.65, 0.65);
  mat.roughnessMap = loadTex(def.maps.roughness, repeat, false);
  mat.aoMap = loadTex(def.maps.ao, repeat, false);
  mat.metalnessMap = loadTex(def.maps.metallic, repeat, false);
  mat.needsUpdate = true;
  return mat;
}

export function getSectorGroundMaterialId(sector: WorldSector): GroundMaterialId {
  return SECTOR_GROUND_MATERIALS[sector.id] ?? 'ground_2';
}

export function getHomeIslandLayerMaterials(): {
  seafloor: THREE.Texture;
  sand: THREE.Texture;
  grassShort: THREE.Texture;
  grassTall: THREE.Texture;
  rock: THREE.Texture;
} {
  const seafloor = loadTex(GROUND_PBR_MATERIALS.ground_9.maps.baseColor, 11, true);
  const sand = loadTex(GROUND_PBR_MATERIALS.ground_1.maps.baseColor, 12, true);
  const grassShort = loadTex(GROUND_PBR_MATERIALS.ground_2.maps.baseColor, 10, true);
  const grassTall = loadTex(GROUND_PBR_MATERIALS.ground_6.maps.baseColor, 9, true);
  const rock = loadTex(GROUND_PBR_MATERIALS.ground_4.maps.baseColor, 6, true);
  return { seafloor, sand, grassShort, grassTall, rock };
}

let pbrAvailable: boolean | null = null;

/** Probe R2 CDN for deployed PBR ground manifest */
export async function checkPBRTexturesAvailable(): Promise<boolean> {
  if (pbrAvailable !== null) return pbrAvailable;
  try {
    const res = await fetch(GROUND_PBR_CDN_MANIFEST, { method: 'HEAD' });
    pbrAvailable = res.ok;
  } catch {
    pbrAvailable = false;
  }
  return pbrAvailable;
}