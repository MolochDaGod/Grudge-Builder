/**
 * PackModelLoader — load multipack GLB (or single-mesh FBX) and clone named nodes.
 * free_survival_asset_kit, medieval towers, Ultimate Fantasy RTS buildings.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { assetUrl } from '@/lib/assetConfig';
import type { BuildAssetDef } from './BuildAssetManifest';

const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();
const packCache = new Map<string, THREE.Group>();

async function loadPack(path: string): Promise<THREE.Group> {
  const url = assetUrl(path);
  const hit = packCache.get(url);
  if (hit) return hit;

  let root: THREE.Group;
  if (path.toLowerCase().endsWith('.fbx')) {
    root = (await fbxLoader.loadAsync(url)) as THREE.Group;
  } else {
    const gltf = await gltfLoader.loadAsync(url);
    root = gltf.scene as THREE.Group;
  }
  root.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  packCache.set(url, root);
  return root;
}

function cloneNode(pack: THREE.Group, nodeName: string): THREE.Object3D | null {
  const node = pack.getObjectByName(nodeName);
  if (!node) {
    console.warn(`[PackModel] node not found: ${nodeName}`);
    return null;
  }
  return node.clone(true);
}

/**
 * Resolve a BuildAssetDef into a scene graph (placeholder box if load fails).
 */
export async function loadBuildAssetModel(def: BuildAssetDef): Promise<THREE.Object3D> {
  if (!def.modelPath) {
    return makePlaceholder(def);
  }

  try {
    if (def.nodeName) {
      const pack = await loadPack(def.modelPath);
      const group = new THREE.Group();
      group.name = `build_${def.id}`;
      const primary = cloneNode(pack, def.nodeName);
      if (primary) group.add(primary);
      for (const extra of def.extraNodes ?? []) {
        const n = cloneNode(pack, extra);
        if (n) {
          // Offset tools slightly on workbench
          n.position.x += 0.15 * (Math.random() - 0.5);
          group.add(n);
        }
      }
      if (group.children.length === 0) return makePlaceholder(def);
      group.scale.setScalar(def.scale);
      return group;
    }

    const pack = await loadPack(def.modelPath);
    const clone = pack.clone(true);
    clone.scale.setScalar(def.scale);
    clone.name = `build_${def.id}`;
    return clone;
  } catch (err) {
    console.warn(`[PackModel] load failed ${def.id}:`, err);
    return makePlaceholder(def);
  }
}

function makePlaceholder(def: BuildAssetDef): THREE.Object3D {
  const [w, h, d] = def.size;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.85,
      transparent: true,
      opacity: 0.85,
    }),
  );
  mesh.position.y = h / 2;
  mesh.name = `placeholder_${def.id}`;
  mesh.castShadow = true;
  return mesh;
}

/** World Y for placement: groundY + placeYOffset (docks use +0.2) */
export function buildPlaceY(groundY: number, def: BuildAssetDef, waterLevel?: number): number {
  const off = def.placeYOffset ?? 0;
  if (def.floating && waterLevel != null) {
    return Math.max(groundY, waterLevel) + off;
  }
  return groundY + off;
}
