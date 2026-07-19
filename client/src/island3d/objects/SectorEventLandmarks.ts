/**
 * SectorEventLandmarks — load production landmark GLBs for a Warlords sector.
 *
 * Places eventfalls, biome kits, and other authoring meshes from
 * sectorProductionContent.events.landmarks (local path → CDN fallback).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { assetUrl } from '@/lib/assetConfig';
import type { SectorLandmarkAsset } from '@shared/definitions/sectorProductionContent';

export interface SectorEventLandmarksOpts {
  scene: THREE.Scene;
  zoneSizeM: number;
  landmarks: SectorLandmarkAsset[];
  sampleGround?: (x: number, z: number) => number | null;
  /** Skip ids already handled by dedicated systems (e.g. hidden_mountain_city) */
  skipIds?: string[];
}

export interface SectorEventLandmarksRuntime {
  root: THREE.Group;
  loaded: string[];
  failed: string[];
  dispose: () => void;
}

const loader = new GLTFLoader();

async function loadGlb(localPath: string, cdnUrl: string): Promise<THREE.Object3D | null> {
  const paths = [localPath, cdnUrl];
  for (const p of paths) {
    try {
      const url = p.startsWith('http') ? p : assetUrl(p);
      const gltf = await new Promise<any>((res, rej) => loader.load(url, res, undefined, rej));
      return gltf.scene as THREE.Object3D;
    } catch {
      /* try next */
    }
  }
  return null;
}

function fitHeight(obj: THREE.Object3D, targetH: number): void {
  const box = new THREE.Box3().setFromObject(obj);
  const h = Math.max(0.01, box.max.y - box.min.y);
  obj.scale.multiplyScalar(targetH / h);
  const box2 = new THREE.Box3().setFromObject(obj);
  obj.position.y -= box2.min.y;
}

function proceduralFallback(kind: SectorLandmarkAsset['kind']): THREE.Object3D {
  const g = new THREE.Group();
  if (kind === 'event') {
    const falls = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 14, 90, 10),
      new THREE.MeshStandardMaterial({
        color: 0x00e5ff,
        emissive: 0xbf40ff,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.75,
      }),
    );
    falls.position.y = 45;
    g.add(falls);
  } else {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(18, 0),
      new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.9 }),
    );
    rock.position.y = 12;
    g.add(rock);
  }
  return g;
}

export async function createSectorEventLandmarks(
  opts: SectorEventLandmarksOpts,
): Promise<SectorEventLandmarksRuntime | null> {
  const skip = new Set(opts.skipIds ?? []);
  const list = opts.landmarks.filter((l) => !skip.has(l.id));
  if (list.length === 0) return null;

  const root = new THREE.Group();
  root.name = 'sector_event_landmarks';
  const loaded: string[] = [];
  const failed: string[] = [];
  const size = opts.zoneSizeM || 12_000;

  for (const lm of list) {
    const ax = lm.zoneAnchorFrac.ox * size;
    const az = lm.zoneAnchorFrac.oz * size;
    let ay = 0;
    if (opts.sampleGround) {
      const h = opts.sampleGround(ax, az);
      if (h != null) ay = h;
    }

    const group = new THREE.Group();
    group.name = lm.id;
    group.position.set(ax, ay, az);

    let mesh = await loadGlb(lm.localPath, lm.cdnUrl);
    if (!mesh) {
      console.warn(`[SectorEventLandmarks] ${lm.id} GLB failed — procedural fallback`);
      mesh = proceduralFallback(lm.kind);
      failed.push(lm.id);
    } else {
      fitHeight(mesh, lm.targetHeightM);
      mesh.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      loaded.push(lm.id);
    }
    mesh.name = `${lm.id}_mesh`;
    group.add(mesh);
    root.add(group);
    console.info(
      `[SectorEventLandmarks] ${lm.name} @ (${ax.toFixed(0)}, ${az.toFixed(0)}) kind=${lm.kind}`,
    );
  }

  opts.scene.add(root);
  return {
    root,
    loaded,
    failed,
    dispose() {
      opts.scene.remove(root);
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mat) => mat?.dispose?.());
        }
      });
    },
  };
}
