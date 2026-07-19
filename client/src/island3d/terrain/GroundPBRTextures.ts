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

/** Scale repeats for 1024m home islands — keeps 4K PBR sharp (~8m/tile). */
const HOME_ISLAND_REPEAT_SCALE = 2.4;

export const GROUND_PBR_MATERIALS: Record<GroundMaterialId, GroundPBRDef> = {
  ground_1: { id: 'ground_1', name: 'Tropical Shore', repeat: Math.round(12 * HOME_ISLAND_REPEAT_SCALE), roughness: 0.88, metalness: 0, maps: mapsFor(1) },
  ground_2: { id: 'ground_2', name: 'Verdant Meadow', repeat: Math.round(10 * HOME_ISLAND_REPEAT_SCALE), roughness: 0.9, metalness: 0, maps: mapsFor(2) },
  ground_3: { id: 'ground_3', name: 'Sun-Baked Dunes', repeat: Math.round(8 * HOME_ISLAND_REPEAT_SCALE), roughness: 0.85, metalness: 0.05, maps: mapsFor(3) },
  ground_4: { id: 'ground_4', name: 'Storm Reef Gravel', repeat: Math.round(6 * HOME_ISLAND_REPEAT_SCALE), roughness: 0.82, metalness: 0.1, maps: mapsFor(4) },
  ground_5: { id: 'ground_5', name: 'Volcanic Ash', repeat: Math.round(7 * HOME_ISLAND_REPEAT_SCALE), roughness: 0.78, metalness: 0.15, maps: mapsFor(5) },
  ground_6: { id: 'ground_6', name: 'Thornwood Floor', repeat: Math.round(9 * HOME_ISLAND_REPEAT_SCALE), roughness: 0.92, metalness: 0, maps: mapsFor(6) },
  ground_7: { id: 'ground_7', name: 'Frostbite Tundra', repeat: Math.round(10 * HOME_ISLAND_REPEAT_SCALE), roughness: 0.75, metalness: 0.05, maps: mapsFor(7) },
  ground_8: { id: 'ground_8', name: 'Ethereal Moss', repeat: Math.round(8 * HOME_ISLAND_REPEAT_SCALE), roughness: 0.88, metalness: 0.08, maps: mapsFor(8) },
  ground_9: { id: 'ground_9', name: 'Abyssal Silt', repeat: Math.round(11 * HOME_ISLAND_REPEAT_SCALE), roughness: 0.7, metalness: 0.12, maps: mapsFor(9) },
  ground_10: { id: 'ground_10', name: 'Nexus Fracture', repeat: Math.round(5 * HOME_ISLAND_REPEAT_SCALE), roughness: 0.65, metalness: 0.25, maps: mapsFor(10) },
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

/**
 * Valheim-style multi-layer stack per sector (base → low → mid → high → cliff rock).
 * Each entry is a GroundPBR material id loaded as a diffuse map for Terrain.generateBlendedMaterial.
 */
export interface SectorTerrainLayerStack {
  base: GroundMaterialId;
  low: GroundMaterialId;
  mid: GroundMaterialId;
  high: GroundMaterialId;
  rock: GroundMaterialId;
}

/** Biome-aware layer stacks — primary sector ground + supporting soils / cliffs */
export const SECTOR_LAYER_STACKS: Record<string, SectorTerrainLayerStack> = {
  frostbite_expanse: { base: 'ground_7', low: 'ground_4', mid: 'ground_7', high: 'ground_7', rock: 'ground_4' },
  stormbreak_reef: { base: 'ground_4', low: 'ground_1', mid: 'ground_4', high: 'ground_5', rock: 'ground_4' },
  thornwood_wilds: { base: 'ground_6', low: 'ground_2', mid: 'ground_6', high: 'ground_6', rock: 'ground_4' },
  ashen_wastes: { base: 'ground_3', low: 'ground_3', mid: 'ground_5', high: 'ground_5', rock: 'ground_4' },
  convergence_nexus: { base: 'ground_10', low: 'ground_2', mid: 'ground_10', high: 'ground_8', rock: 'ground_4' },
  ethereal_falls: { base: 'ground_8', low: 'ground_9', mid: 'ground_8', high: 'ground_8', rock: 'ground_4' },
  abyssal_trench: { base: 'ground_9', low: 'ground_9', mid: 'ground_4', high: 'ground_5', rock: 'ground_4' },
  ember_depths: { base: 'ground_5', low: 'ground_3', mid: 'ground_5', high: 'ground_5', rock: 'ground_4' },
  haven_shore: { base: 'ground_2', low: 'ground_1', mid: 'ground_2', high: 'ground_6', rock: 'ground_4' },
};

export function getSectorLayerStack(sector: WorldSector): SectorTerrainLayerStack {
  return SECTOR_LAYER_STACKS[sector.id] ?? {
    base: getSectorGroundMaterialId(sector),
    low: 'ground_1',
    mid: getSectorGroundMaterialId(sector),
    high: 'ground_6',
    rock: 'ground_4',
  };
}

function loadGroundDiffuse(id: GroundMaterialId, repeatScale = 1): THREE.Texture {
  const def = GROUND_PBR_MATERIALS[id];
  const repeat = Math.max(4, Math.round(def.repeat * repeatScale));
  return loadTex(def.maps.baseColor, repeat, true);
}

/** Multi-layer diffuse maps for sector terrain blending (ThreeTerrain height+slope mix). */
export function getSectorLayerMaterials(sector: WorldSector): {
  base: THREE.Texture;
  low: THREE.Texture;
  mid: THREE.Texture;
  high: THREE.Texture;
  rock: THREE.Texture;
} {
  const stack = getSectorLayerStack(sector);
  // Sector zones are larger than home islands — slightly tighter tiling for readability
  const scale = 0.55;
  return {
    base: loadGroundDiffuse(stack.base, scale),
    low: loadGroundDiffuse(stack.low, scale),
    mid: loadGroundDiffuse(stack.mid, scale),
    high: loadGroundDiffuse(stack.high, scale),
    rock: loadGroundDiffuse(stack.rock, scale * 0.85),
  };
}

export function getHomeIslandLayerMaterials(): {
  seafloor: THREE.Texture;
  sand: THREE.Texture;
  grassShort: THREE.Texture;
  grassTall: THREE.Texture;
  rock: THREE.Texture;
} {
  const seafloor = loadTex(GROUND_PBR_MATERIALS.ground_9.maps.baseColor, GROUND_PBR_MATERIALS.ground_9.repeat, true);
  const sand = loadTex(GROUND_PBR_MATERIALS.ground_1.maps.baseColor, GROUND_PBR_MATERIALS.ground_1.repeat, true);
  const grassShort = loadTex(GROUND_PBR_MATERIALS.ground_2.maps.baseColor, GROUND_PBR_MATERIALS.ground_2.repeat, true);
  const grassTall = loadTex(GROUND_PBR_MATERIALS.ground_6.maps.baseColor, GROUND_PBR_MATERIALS.ground_6.repeat, true);
  const rock = loadTex(GROUND_PBR_MATERIALS.ground_4.maps.baseColor, GROUND_PBR_MATERIALS.ground_4.repeat, true);
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