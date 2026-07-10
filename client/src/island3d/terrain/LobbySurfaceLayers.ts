/**
 * LobbySurfaceLayers — classify pirate-map meshes and apply Poly Haven PBR by layer.
 */
import * as THREE from 'three';
import type { LobbyLoadResult } from '../engine/LobbyIslandLoader';
import { LOBBY_WATER_LEVEL } from '../engine/LobbyGameplay';
import {
  loadLobbyPolyHavenMaterials,
  type LobbyMaterialSet,
  type LobbyTextureLayer,
} from './PolyHavenTextures';

export type GrudgeSurfaceLayer =
  | LobbyTextureLayer
  | 'water'
  | 'seafloor'
  | 'prop'
  | 'walkable'
  | 'ignore';

const WALKABLE_LAYERS: Set<GrudgeSurfaceLayer> = new Set([
  'beach', 'grass', 'forest', 'rock', 'ore', 'path', 'building', 'walkable',
]);

export interface LobbySurfaceResult {
  materials: LobbyMaterialSet;
  walkableMeshes: THREE.Mesh[];
  layerCounts: Record<string, number>;
}

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _worldPos = new THREE.Vector3();

function meshLabel(mesh: THREE.Mesh): string {
  const mat = mesh.material;
  const matName = Array.isArray(mat)
    ? mat.map((m) => m.name).join(' ')
    : (mat as THREE.Material)?.name ?? '';
  return `${mesh.name} ${matName}`.toLowerCase();
}

export function classifyLobbyMesh(mesh: THREE.Mesh): GrudgeSurfaceLayer {
  const label = meshLabel(mesh);
  if (/water|ocean|sea|foam|wave|coral|reef|seabed/.test(label)) return 'water';
  if (/seafloor|underwater|submerged/.test(label)) return 'seafloor';
  if (/sand|beach|shore|coast|dune/.test(label)) return 'beach';
  if (/ore|mine|metal|iron|copper|gold|gem|crystal|vein/.test(label)) return 'ore';
  if (/rock|stone|cliff|mountain|granite|boulder|pebble/.test(label)) return 'rock';
  if (/tree|forest|leaf|bush|plant|moss|fern|palm|jungle|green/.test(label)) return 'forest';
  if (/grass|meadow|field|turf|lawn/.test(label)) return 'grass';
  if (/path|trail|road|dirt|mud|ground/.test(label)) return 'path';
  if (/wood|plank|dock|deck|building|house|wall|roof|brick|timber/.test(label)) return 'building';

  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  _box.copy(mesh.geometry.boundingBox!);
  _size.set(0, 0, 0);
  _box.getSize(_size);

  mesh.getWorldPosition(_worldPos);
  const flat = _size.y < Math.max(_size.x, _size.z) * 0.22;
  const tall = _size.y > Math.max(_size.x, _size.z) * 0.65;

  if (flat) {
    if (_worldPos.y < LOBBY_WATER_LEVEL - 0.5) return 'seafloor';
    if (_worldPos.y < LOBBY_WATER_LEVEL + 1.5) return 'beach';
    if (_worldPos.y > 25) return 'rock';
    return 'grass';
  }
  if (tall) return 'prop';
  return 'rock';
}

function layerMaterial(layer: GrudgeSurfaceLayer, mats: LobbyMaterialSet): THREE.Material | null {
  if (layer === 'water' || layer === 'prop' || layer === 'ignore') return null;
  if (layer === 'seafloor') return mats.seafloor;
  if (layer === 'walkable') return mats.grass;
  if (layer in mats) return mats[layer as LobbyTextureLayer];
  return mats.grass;
}

export async function applyLobbySurfaceLayers(
  lobby: LobbyLoadResult,
  onProgress?: (pct: number) => void,
): Promise<LobbySurfaceResult> {
  onProgress?.(5);
  const materials = await loadLobbyPolyHavenMaterials('2k');
  onProgress?.(40);

  const walkableMeshes: THREE.Mesh[] = [];
  const layerCounts: Record<string, number> = {};

  const waterMeshes: THREE.Mesh[] = [];

  lobby.scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const layer = classifyLobbyMesh(obj);
    obj.userData.grudgeLayer = layer;
    layerCounts[layer] = (layerCounts[layer] ?? 0) + 1;

    // Pirate GLTF often embeds its own water planes — hide them so only our
    // single Gerstner ocean is visible (fixes multi water-level look).
    if (layer === 'water') {
      waterMeshes.push(obj);
      obj.visible = false;
      obj.userData.grudgeWalkable = false;
      return;
    }

    // Seafloor: push deep under the ocean plane so it doesn't read as a second sea
    if (layer === 'seafloor') {
      obj.visible = false;
      return;
    }

    if (WALKABLE_LAYERS.has(layer)) {
      walkableMeshes.push(obj);
      obj.userData.grudgeWalkable = true;
    }

    const mat = layerMaterial(layer, materials);
    if (!mat) return;

    // Only retexture reasonably flat walk surfaces — keep vertical props readable
    if (layer === 'prop' || layer === 'ignore') return;
    if (layer === 'rock' || layer === 'building') {
      if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
      _box.copy(obj.geometry.boundingBox!);
      _box.getSize(_size);
      const flatEnough = _size.y < Math.max(_size.x, _size.z) * 0.35;
      if (!flatEnough && layer === 'rock') return;
    }

    obj.material = mat.clone();
    const m = obj.material as THREE.MeshStandardMaterial;
    m.side = THREE.DoubleSide;
  });

  // Align map so typical beach / low land meets LOBBY_WATER_LEVEL
  // (avoids land floating above or sinking below our ocean plane)
  let beachYSum = 0;
  let beachN = 0;
  for (const mesh of walkableMeshes) {
    if (mesh.userData.grudgeLayer !== 'beach' && mesh.userData.grudgeLayer !== 'path') continue;
    mesh.getWorldPosition(_worldPos);
    beachYSum += _worldPos.y;
    beachN++;
  }
  if (beachN > 0) {
    const avgBeachY = beachYSum / beachN;
    // Beach should sit slightly above water
    const dy = (LOBBY_WATER_LEVEL + 0.35) - avgBeachY;
    if (Math.abs(dy) > 0.15 && Math.abs(dy) < 40) {
      lobby.scene.position.y += dy;
      lobby.boundingBox.translate(new THREE.Vector3(0, dy, 0));
      lobby.center.y += dy;
    }
  }

  layerCounts.water_hidden = waterMeshes.length;

  onProgress?.(85);
  console.log('[LobbySurfaceLayers]', layerCounts);
  return { materials, walkableMeshes, layerCounts };
}

export function isWalkableLayer(layer: string | undefined): boolean {
  return !!layer && WALKABLE_LAYERS.has(layer as GrudgeSurfaceLayer);
}