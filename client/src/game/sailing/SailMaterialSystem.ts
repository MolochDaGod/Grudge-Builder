/**
 * SailMaterialSystem — canvas sail materials + wind-driven cloth bridge.
 *
 * Production sails for boats / rafts / sloops / galleons:
 *   - MeshStandardMaterial canvas look (rough, desaturated)
 *   - Optional ClothSimulation grid for gaff/square sails
 *   - Wind from WeatherConfig / sailing types
 *
 * SI: sail dimensions in metres. Never use emissive “plastic” sails in prod.
 */

import * as THREE from 'three';
import { ClothSimulation, type WindForce } from './clothPhysics';
import type { WeatherConfig } from './types';

export type SailRigKind = 'square' | 'gaff' | 'lateen' | 'jib' | 'raft_sheet';

export interface SailMaterialOpts {
  /** Base canvas color */
  color?: number;
  /** Roughness 0–1 (canvas ~0.85–0.95) */
  roughness?: number;
  metalness?: number;
  /** Side double for thin sails */
  doubleSide?: boolean;
  /** Slight translucency for backlit canvas */
  opacity?: number;
  /** Sail color id from catalog (maps to palette) */
  sailColorId?: string;
}

/** Catalog sail colors → hex (matches islandAssetManifest sail flavors). */
export const SAIL_COLOR_HEX: Record<string, number> = {
  white: 0xe8e4d9,
  cream: 0xe6dcc0,
  tan: 0xc4a574,
  red: 0x8b2e2e,
  black: 0x2a2a2e,
  blue: 0x3a4a6b,
  striped: 0xd4c8a8,
  default: 0xd9d0b8,
};

export function createSailMaterial(opts: SailMaterialOpts = {}): THREE.MeshStandardMaterial {
  const color =
    opts.color ??
    SAIL_COLOR_HEX[opts.sailColorId ?? 'default'] ??
    SAIL_COLOR_HEX.default;
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.9,
    metalness: opts.metalness ?? 0.02,
    side: opts.doubleSide === false ? THREE.FrontSide : THREE.DoubleSide,
    transparent: (opts.opacity ?? 1) < 0.99,
    opacity: opts.opacity ?? 1,
    depthWrite: (opts.opacity ?? 1) > 0.95,
  });
  mat.name = 'sail_canvas';
  // Subtle fabric variation via vertex colors optional later
  return mat;
}

/**
 * Apply production sail material to every mesh matching /sail|cloth|canvas/i
 * under a ship/raft root. Skips ropes/flags if name is only "flag".
 */
export function applySailMaterialsToShip(
  root: THREE.Object3D,
  opts: SailMaterialOpts = {},
): number {
  const mat = createSailMaterial(opts);
  let n = 0;
  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const name = obj.name || '';
    if (!/sail|canvas|cloth|sheet|spinnaker|jib|mainsail|topsail/i.test(name)) return;
    if (/flag|pennant|banner/i.test(name) && !/sail/i.test(name)) return;
    const mesh = obj as THREE.Mesh;
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(() => mat.clone());
    } else {
      mesh.material = mat.clone();
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    n++;
  });
  return n;
}

export interface LiveSailCloth {
  sim: ClothSimulation;
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  rig: SailRigKind;
  dispose: () => void;
  update: (dt: number, wind: WindForce) => void;
}

/**
 * Create a live cloth sail (Verlet) for hero ships when mesh sail is too static.
 * Parent under mast attachment point.
 */
export function createLiveClothSail(
  parent: THREE.Object3D,
  opts: {
    width?: number;
    height?: number;
    segsX?: number;
    segsY?: number;
    rig?: SailRigKind;
    material?: THREE.Material;
  } = {},
): LiveSailCloth {
  const w = opts.width ?? 4;
  const h = opts.height ?? 5;
  const sx = opts.segsX ?? 10;
  const sy = opts.segsY ?? 12;
  const rig = opts.rig ?? 'gaff';
  const sim = new ClothSimulation(w, h, sx, sy);
  if (rig === 'gaff' || rig === 'square' || rig === 'raft_sheet') sim.pinForGaffRig();
  else sim.pinForGaffRig();

  // Simple plane geometry updated from particles
  const geo = new THREE.PlaneGeometry(w, h, sx, sy);
  const mat =
    opts.material ??
    createSailMaterial({ doubleSide: true, roughness: 0.92 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = `live_sail_${rig}`;
  mesh.castShadow = true;
  parent.add(mesh);

  const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;

  const update = (dt: number, wind: WindForce) => {
    sim.applyWind(wind);
    sim.update(Math.min(0.033, dt));
    // Map particle grid → plane verts (PlaneGeometry is centered; cloth origin top-left)
    const cols = sx + 1;
    const rows = sy + 1;
    for (let iy = 0; iy < rows; iy++) {
      for (let ix = 0; ix < cols; ix++) {
        const p = sim.getPosition(ix, iy);
        if (!p) continue;
        const vi = iy * cols + ix;
        posAttr.setXYZ(vi, p.x, p.y + h * 0.5, p.z);
      }
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
  };

  return {
    sim,
    mesh,
    geometry: geo,
    rig,
    update,
    dispose: () => {
      parent.remove(mesh);
      geo.dispose();
      if ((mat as THREE.Material).dispose) (mat as THREE.Material).dispose();
    },
  };
}

/** Build wind force from sailing weather config. */
export function windFromWeather(weather: WeatherConfig | null | undefined): WindForce {
  const dir = new THREE.Vector3(1, 0, 0.2).normalize();
  const strength = weather?.windStrength ?? 0.45;
  return {
    direction: dir,
    strength: 2 + strength * 10,
    turbulence: 0.15 + strength * 0.4,
  };
}

export const SAIL_MATERIAL_RULES = [
  'Canvas = MeshStandardMaterial high roughness, low metalness — never shiny plastic',
  'DoubleSide sails so backface shows when wind fills opposite',
  'applySailMaterialsToShip on every loaded ship/raft GLB before play',
  'Live cloth only on hero/player ship if budget allows (one mainsail)',
  'Wind strength from WeatherConfig.windStrength drives both cloth + boat speed',
  'Skip flag-only meshes when applying sail materials',
] as const;
