/**
 * Place iceland_scene_for_canimatic in frozen + near-frozen zones.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { assetUrl } from '@/lib/assetConfig';
import {
  ICELAND_SCENE_PLACEMENT,
  isIcelandSector,
} from '@shared/definitions/floatingIslandBossAssets';
import { fitObjectExtent, stripSkyboxFromObject } from './gltfSceneUtils';

export interface IcelandPlaceOpts {
  scene: THREE.Scene;
  sectorId: string;
  zoneSizeM: number;
  waterLevel: number;
  sampleGround?: (x: number, z: number) => number | null;
}

export interface IcelandPlaceResult {
  root: THREE.Group;
  dispose: () => void;
}

export async function placeIcelandScene(
  opts: IcelandPlaceOpts,
): Promise<IcelandPlaceResult | null> {
  if (!isIcelandSector(opts.sectorId)) return null;

  const loader = new GLTFLoader();
  const root = new THREE.Group();
  root.name = 'IcelandCinematicScene';

  try {
    const gltf = await loader.loadAsync(assetUrl(ICELAND_SCENE_PLACEMENT.glbPath));
    const mesh = gltf.scene;
    if (ICELAND_SCENE_PLACEMENT.stripSkybox) stripSkyboxFromObject(mesh);
    fitObjectExtent(mesh, ICELAND_SCENE_PLACEMENT.targetExtentM);

    const half = opts.zoneSizeM * 0.28;
    // Frostbite: center-north shelf; near-frozen: west-biased cold rim
    const frozen = (
      ICELAND_SCENE_PLACEMENT.frozenSectors as readonly string[]
    ).includes(opts.sectorId);
    const x = frozen ? -half * 0.2 : -half * 0.55;
    const z = frozen ? -half * 0.35 : half * 0.15;
    let y = opts.waterLevel + 2;
    if (opts.sampleGround) {
      const h = opts.sampleGround(x, z);
      if (h != null) y = h;
    }
    root.position.set(x, y, z);
    root.add(mesh);
    mesh.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    opts.scene.add(root);
    console.log(`[Iceland] placed in ${opts.sectorId} at`, x.toFixed(0), z.toFixed(0));
  } catch (e) {
    console.warn('[Iceland] scene load failed', e);
    return null;
  }

  return {
    root,
    dispose: () => {
      opts.scene.remove(root);
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry?.dispose();
          const m = o.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else (m as THREE.Material)?.dispose?.();
        }
      });
    },
  };
}
