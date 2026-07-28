/**
 * WaveboardRig — load custom windsurf silhouette + production materials.
 *
 * Asset: /models/watercraft/waveboard_rig.glb
 *   Dark wood base · yellow handles · canvas sail (wind-animated)
 *
 * Mesh assignment by name heuristics (silhouette packs often lack PBR names).
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  WAVEBOARD_GLB,
  WAVEBOARD_MATERIALS,
} from "@shared/definitions/waveboard";
import { createSailMaterial } from "../SailMaterialSystem";

const WOOD_RE = /wood|board|base|deck|hull|plank|body|platform|float/i;
const HANDLE_RE = /handle|grip|boom|wishbone|bar|yellow|lever/i;
const SAIL_RE = /sail|canvas|cloth|sheet|wing|fabric/i;
const SPAR_RE = /mast|spar|pole|rod|stick|rig/i;

export interface WaveboardRigHandle {
  root: THREE.Group;
  sailMeshes: THREE.Mesh[];
  dispose: () => void;
  /** 0–1 billow from wind / speed */
  setSailBillow: (amount: number) => void;
}

function matWood(): THREE.MeshStandardMaterial {
  const m = WAVEBOARD_MATERIALS.wood;
  return new THREE.MeshStandardMaterial({
    color: m.color,
    roughness: m.roughness,
    metalness: m.metalness,
  });
}

function matHandle(): THREE.MeshStandardMaterial {
  const m = WAVEBOARD_MATERIALS.handle;
  return new THREE.MeshStandardMaterial({
    color: m.color,
    roughness: m.roughness,
    metalness: m.metalness,
  });
}

function matSpar(): THREE.MeshStandardMaterial {
  const m = WAVEBOARD_MATERIALS.spar;
  return new THREE.MeshStandardMaterial({
    color: m.color,
    roughness: m.roughness,
    metalness: m.metalness,
  });
}

function matSail(): THREE.MeshStandardMaterial {
  return createSailMaterial({
    color: WAVEBOARD_MATERIALS.sail.color,
    roughness: WAVEBOARD_MATERIALS.sail.roughness,
    metalness: WAVEBOARD_MATERIALS.sail.metalness,
    doubleSide: true,
  });
}

function classifyAndPaint(root: THREE.Object3D): THREE.Mesh[] {
  const sailMeshes: THREE.Mesh[] = [];
  const wood = matWood();
  const handle = matHandle();
  const spar = matSpar();
  const sail = matSail();

  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    const name = mesh.name || "";
    let mat: THREE.Material = wood;

    if (SAIL_RE.test(name)) {
      mat = sail.clone();
      sailMeshes.push(mesh);
    } else if (HANDLE_RE.test(name)) {
      mat = handle.clone();
    } else if (SPAR_RE.test(name) && !WOOD_RE.test(name)) {
      mat = spar.clone();
    } else if (WOOD_RE.test(name)) {
      mat = wood.clone();
    } else {
      // Silhouette fallback: largest flat meshes as sail, thin as handles
      const box = new THREE.Box3().setFromObject(mesh);
      const size = box.getSize(new THREE.Vector3());
      const vol = size.x * size.y * size.z;
      const flat = Math.min(size.x, size.y, size.z) / (Math.max(size.x, size.y, size.z) + 1e-3);
      if (flat < 0.08 && vol > 0.01) {
        mat = sail.clone();
        sailMeshes.push(mesh);
      } else if (size.x < 0.15 && size.z < 0.15) {
        mat = handle.clone();
      } else {
        mat = wood.clone();
      }
    }

    mesh.material = mat;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });

  // If no sail found, create procedural canvas sail
  if (sailMeshes.length === 0) {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 1.8, 6, 8),
      sail,
    );
    plane.name = "waveboard_sail_procedural";
    plane.position.set(0, 1.4, 0);
    plane.castShadow = true;
    root.add(plane);
    sailMeshes.push(plane);
  }

  return sailMeshes;
}

/** Normalize rig to SI human scale (~board ~2m long). */
function normalizeScale(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z, 0.01);
  // Target board length ~2.1 m
  const s = 2.1 / longest;
  if (s > 0.01 && s < 100) root.scale.multiplyScalar(s);
  // Feet on Y=0
  root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root);
  root.position.y -= box2.min.y;
}

export async function loadWaveboardRig(
  url: string = WAVEBOARD_GLB,
): Promise<WaveboardRigHandle> {
  const loader = new GLTFLoader();
  const gltf = await new Promise<import("three/addons/loaders/GLTFLoader.js").GLTF>(
    (res, rej) => loader.load(url, res, undefined, rej),
  );
  const root = new THREE.Group();
  root.name = "WaveboardRig";
  const scene = gltf.scene;
  root.add(scene);
  normalizeScale(root);
  const sailMeshes = classifyAndPaint(root);

  // Store base sail scales for billow
  const baseScales = sailMeshes.map((m) => m.scale.clone());

  return {
    root,
    sailMeshes,
    setSailBillow: (amount: number) => {
      const a = THREE.MathUtils.clamp(amount, 0, 1);
      sailMeshes.forEach((m, i) => {
        const b = baseScales[i] ?? new THREE.Vector3(1, 1, 1);
        // Wind fill: scale Z slightly + slight lean
        m.scale.set(b.x * (1 + a * 0.08), b.y * (0.2 + a * 0.8), b.z * (1 + a * 0.15));
        m.rotation.y = Math.sin(performance.now() * 0.003 + i) * 0.06 * a;
        m.visible = a > 0.05;
      });
    },
    dispose: () => {
      root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          const mesh = o as THREE.Mesh;
          mesh.geometry?.dispose();
          const mat = mesh.material;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else (mat as THREE.Material)?.dispose?.();
        }
      });
    },
  };
}
