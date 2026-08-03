/**
 * Skydome loader helpers for sectors, Forge, Grok Builder.
 * SSOT: shared/definitions/skydomeCatalog.ts
 */
import * as THREE from 'three';
import { loadGltfCached, cloneGltfScene } from '@/lib/three/SharedGltfPipeline';
import {
  ULTIMATE_SKYDOME_PACK,
  SKYDOME_VARIANTS,
  getSkydomeVariant,
  type SkydomeVariantDef,
} from '@shared/definitions/skydomeCatalog';

export type LoadedSkydomePack = {
  root: THREE.Object3D;
  activate: (variantId: string) => boolean;
  dispose: () => void;
};

/**
 * Load ultimate skydome pack once. Call activate(id) to show a single variant.
 * Designed for sector environments + Forge scene chrome + Grok Builder previews.
 */
export async function loadUltimateSkydomePack(
  priority: 'low' | 'medium' | 'high' = 'medium',
): Promise<LoadedSkydomePack> {
  let lastErr: unknown;
  for (const url of ULTIMATE_SKYDOME_PACK.glbUrls) {
    try {
      const gltf = await loadGltfCached(url, priority);
      const root = cloneGltfScene(gltf);
      root.name = 'ultimate_skydome_pack';

      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !m.material) return;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) {
          const anyMat = mat as THREE.MeshBasicMaterial;
          anyMat.side = THREE.BackSide;
          anyMat.depthWrite = false;
          if ('map' in anyMat && anyMat.map) {
            anyMat.map.colorSpace = THREE.SRGBColorSpace;
          }
        }
        m.frustumCulled = false;
        m.castShadow = false;
        m.receiveShadow = false;
      });

      const activate = (variantId: string): boolean => {
        const variant = getSkydomeVariant(variantId);
        if (!variant) return false;
        let matched = false;
        root.traverse((o) => {
          if (!/doom_2016_skydome_ARM/i.test(o.name || '')) return;
          const ok =
            typeof variant.nodeMatch === 'string'
              ? o.name.includes(variant.nodeMatch)
              : variant.nodeMatch.test(o.name);
          o.visible = ok;
          if (ok) matched = true;
        });
        // Fit radius
        const r = variant.defaultRadiusM;
        root.scale.setScalar(r / 50);
        return matched;
      };

      // Default: neutral plate
      activate('sky_doom_08');

      return {
        root,
        activate,
        dispose: () => {
          root.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.isMesh) {
              m.geometry?.dispose();
              const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
              for (const mat of mats) mat.dispose();
            }
          });
        },
      };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('Failed to load ultimate_skydome_pack');
}

export function listSkydomePicker(): SkydomeVariantDef[] {
  return [...SKYDOME_VARIANTS];
}

export { ULTIMATE_SKYDOME_PACK, SKYDOME_VARIANTS, getSkydomeVariant };
