/**
 * Airship opener scene polish — weld, SI fit, stylized toon materials.
 *
 * Source: D:\Games\Models\scene (2).glb → /models/airship-zone/opener-scene.glb
 * (gltf-transform optimize: weld + meshopt + webp)
 */
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const OPENER_SCENE_TARGET_SPAN_M = 72;

/** Gradient map for MeshToonMaterial (cel bands). */
let _toonGrad: THREE.DataTexture | null = null;
function toonGradientMap(): THREE.DataTexture {
  if (_toonGrad) return _toonGrad;
  const data = new Uint8Array([
    80, 80, 90, 255, // shadow band
    140, 130, 120, 255, // mid
    220, 210, 190, 255, // light
    255, 250, 235, 255, // highlight
  ]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  _toonGrad = tex;
  return tex;
}

function classifyMesh(name: string, matName: string): 'wood' | 'metal' | 'sail' | 'glass' | 'foliage' | 'rock' | 'emit' | 'default' {
  const s = `${name} ${matName}`.toLowerCase();
  if (/lantern|lamp|light|emiss|glow|flame|torch/.test(s)) return 'emit';
  if (/glass|window|crystal|water|portal/.test(s)) return 'glass';
  if (/sail|cloth|flag|canvas|fabric/.test(s)) return 'sail';
  if (/metal|iron|steel|brass|copper|pipe|engine|gear|bolt/.test(s)) return 'metal';
  if (/wood|plank|deck|hull|mast|rail|beam|post|crate|barrel/.test(s)) return 'wood';
  if (/tree|leaf|grass|plant|moss|vine/.test(s)) return 'foliage';
  if (/rock|stone|cliff|island|dirt|soil/.test(s)) return 'rock';
  return 'default';
}

function toToonMaterial(
  src: THREE.Material,
  kind: ReturnType<typeof classifyMesh>,
): THREE.Material {
  const std = src as THREE.MeshStandardMaterial;
  const map = 'map' in std ? std.map : null;
  const color = 'color' in std && std.color ? std.color.clone() : new THREE.Color(0xcccccc);
  const emissive =
    'emissive' in std && std.emissive ? std.emissive.clone() : new THREE.Color(0x000000);
  let emissiveIntensity =
    'emissiveIntensity' in std && typeof std.emissiveIntensity === 'number'
      ? std.emissiveIntensity
      : 0;

  // Stylized palette shifts
  switch (kind) {
    case 'wood':
      color.lerp(new THREE.Color(0x8b5a2b), 0.25);
      break;
    case 'metal':
      color.lerp(new THREE.Color(0x9aa3ad), 0.2);
      break;
    case 'sail':
      color.lerp(new THREE.Color(0xf5e6c8), 0.15);
      break;
    case 'foliage':
      color.lerp(new THREE.Color(0x3d8b4f), 0.2);
      break;
    case 'rock':
      color.lerp(new THREE.Color(0x6b6a68), 0.15);
      break;
    case 'emit':
      emissive.setHex(0xffaa44);
      emissiveIntensity = Math.max(emissiveIntensity, 1.4);
      break;
    case 'glass':
      // Keep transmission-like look with transparent toon
      break;
    default:
      break;
  }

  if (kind === 'glass') {
    return new THREE.MeshPhysicalMaterial({
      color,
      map: map ?? undefined,
      transparent: true,
      opacity: 0.45,
      transmission: 0.55,
      thickness: 0.4,
      roughness: 0.15,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
  }

  if (kind === 'emit') {
    return new THREE.MeshStandardMaterial({
      color,
      map: map ?? undefined,
      emissive,
      emissiveIntensity,
      emissiveMap: 'emissiveMap' in std ? std.emissiveMap ?? undefined : undefined,
      roughness: 0.45,
      metalness: 0.1,
    });
  }

  // Cel-shaded toon for hull / islands / props
  const toon = new THREE.MeshToonMaterial({
    color,
    map: map ?? undefined,
    gradientMap: toonGradientMap(),
    emissive,
    emissiveIntensity: emissiveIntensity * 0.5,
  });
  // Soft realism: slight env-less rim via emissive for sky bounce
  if (kind === 'wood' || kind === 'default') {
    toon.emissive = new THREE.Color(0x1a1410);
    toon.emissiveIntensity = 0.08;
  }
  return toon;
}

/**
 * Weld indexed geometries (merge coincident verts) + recompute normals.
 * Skips skinned meshes.
 */
export function weldSceneGeometries(root: THREE.Object3D): number {
  let n = 0;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
    try {
      const geo = mesh.geometry as THREE.BufferGeometry;
      if (!geo.getAttribute('position')) return;
      const welded = BufferGeometryUtils.mergeVertices(geo, 1e-4);
      welded.computeVertexNormals();
      if (!welded.getAttribute('normal')) welded.computeVertexNormals();
      mesh.geometry = welded;
      // Dispose old if different
      if (geo !== welded) geo.dispose();
      n += 1;
    } catch (e) {
      console.warn('[airshipScenePolish] weld skip', mesh.name, e);
    }
  });
  return n;
}

/**
 * Uniform scale so longest AABB axis ≈ targetSpanM (SI metres).
 * Returns applied scale.
 */
export function fitOpenerSceneToSpan(root: THREE.Object3D, targetSpanM = OPENER_SCENE_TARGET_SPAN_M): number {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) return 1;
  const size = box.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.y, size.z);
  if (span < 1e-4) return 1;
  const s = targetSpanM / span;
  root.scale.multiplyScalar(s);
  root.updateMatrixWorld(true);
  // Ground min.y = 0
  const box2 = new THREE.Box3().setFromObject(root);
  root.position.y -= box2.min.y;
  root.updateMatrixWorld(true);
  return s;
}

/**
 * Apply stylized toon materials across the opener scene.
 */
export function applyStylizedToonMaterials(root: THREE.Object3D): number {
  let n = 0;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const next: THREE.Material[] = [];
    for (const m of mats) {
      const matName = m?.name ?? '';
      const kind = classifyMesh(mesh.name || obj.name || '', matName);
      const polished = toToonMaterial(m, kind);
      polished.name = `${matName || 'mat'}_toon_${kind}`;
      next.push(polished);
      n += 1;
    }
    mesh.material = next.length === 1 ? next[0]! : next;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
  return n;
}

export type DeckPostKind = 'helm' | 'bow' | 'mid' | 'deck';

/**
 * Probe deck posts from mesh names / height samples for pirate stations.
 */
export function findDeckPosts(root: THREE.Object3D): Record<DeckPostKind, THREE.Vector3> {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const deckY = box.min.y + size.y * 0.38;
  const upperY = box.min.y + size.y * 0.52;
  const halfL = size.z * 0.42;
  const halfW = size.x * 0.32;

  const defaults: Record<DeckPostKind, THREE.Vector3> = {
    helm: new THREE.Vector3(center.x, upperY, center.z - halfL * 0.72),
    bow: new THREE.Vector3(center.x, upperY, center.z + halfL * 0.78),
    mid: new THREE.Vector3(center.x, deckY, center.z + halfL * 0.15),
    deck: new THREE.Vector3(center.x, deckY, center.z),
  };

  // Prefer named empties / meshes
  const named: Partial<Record<DeckPostKind, THREE.Vector3>> = {};
  root.traverse((obj) => {
    const n = (obj.name || '').toLowerCase();
    if (!n) return;
    const wp = new THREE.Vector3();
    obj.getWorldPosition(wp);
    if (/helm|wheel|stern|aft/.test(n)) named.helm = wp.clone();
    if (/bow|prow|front|fore/.test(n)) named.bow = wp.clone();
    if (/post|mast|mid|deck_center|quarter/.test(n) && !named.mid) named.mid = wp.clone();
  });

  return {
    helm: named.helm ?? defaults.helm,
    bow: named.bow ?? defaults.bow,
    mid: named.mid ?? defaults.mid,
    deck: named.deck ?? defaults.deck,
  };
}

/**
 * Full polish pipeline after load.
 */
export function polishOpenerAirshipScene(root: THREE.Object3D): {
  scale: number;
  welded: number;
  materials: number;
  posts: Record<DeckPostKind, THREE.Vector3>;
} {
  root.name = root.name || 'opener_airship_scene';
  const welded = weldSceneGeometries(root);
  const scale = fitOpenerSceneToSpan(root, OPENER_SCENE_TARGET_SPAN_M);
  const materials = applyStylizedToonMaterials(root);
  const posts = findDeckPosts(root);
  return { scale, welded, materials, posts };
}
