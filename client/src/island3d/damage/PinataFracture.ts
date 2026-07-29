/**
 * PinataFracture — optional three-pinata adapter for full section shatter.
 *
 * Progressive gameplay damage uses **hide chunk** (SectionalDamageSystem).
 * This module is only for full-destroy FX: Voronoi fracture + optional Rapier
 * dynamic fragments via PhysicsWorld.addDynamicFragment.
 *
 * Package: @dgreenheck/three-pinata (optional peer — dynamic import).
 * Ref: https://github.com/dgreenheck/three-pinata
 */

import * as THREE from "three";
import type { DamageSection } from "./SectionalDamageSystem";

export interface PinataFractureOpts {
  fragmentCount?: number;
  /** Local impact point for denser cracks near hit */
  impactPoint?: THREE.Vector3;
  impactRadius?: number;
  /** Parent scene for fragment meshes */
  scene?: THREE.Scene;
  /** If set, add each fragment as a Rapier dynamic body */
  addDynamicFragment?: (
    mesh: THREE.Object3D,
    opts: {
      linearVelocity?: THREE.Vector3;
      angularVelocity?: THREE.Vector3;
    },
  ) => void;
  /** Impulse scale for outward burst (m/s) */
  burstSpeed?: number;
  /** Despawn fragments after seconds (0 = keep) */
  despawnSec?: number;
}

export interface PinataFractureResult {
  ok: boolean;
  fragmentCount: number;
  reason?: string;
}

let pinataModule: {
  DestructibleMesh: new (
    geometry?: THREE.BufferGeometry,
    outerMaterial?: THREE.Material,
    innerMaterial?: THREE.Material,
  ) => THREE.Mesh & {
    fracture: (
      options: unknown,
      onFragment?: (fragment: THREE.Mesh, index: number) => void,
    ) => THREE.Mesh[];
  };
  FractureOptions: new (opts: Record<string, unknown>) => unknown;
} | null = null;

let pinataLoadAttempted = false;

/**
 * Try to load @dgreenheck/three-pinata once. Returns false if not installed.
 */
export async function ensurePinataLoaded(): Promise<boolean> {
  if (pinataModule) return true;
  if (pinataLoadAttempted) return false;
  pinataLoadAttempted = true;
  try {
    // Optional peer — build string at runtime so Vite/Rollup never hard-resolves it.
    const pkg = ["@dgreenheck", "three-pinata"].join("/");
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const dynamicImport = new Function("s", "return import(s)") as (
      s: string,
    ) => Promise<NonNullable<typeof pinataModule>>;
    const mod = await dynamicImport(pkg);
    pinataModule = mod;
    return true;
  } catch {
    console.info(
      "[PinataFracture] @dgreenheck/three-pinata not available — hide-chunk only.",
    );
    return false;
  }
}

/**
 * Fracture a destroyed section mesh (three-pinata style).
 * Hides original (already hidden by SectionalDamageSystem) and spawns fragments.
 */
export async function fractureSection(
  section: DamageSection,
  opts: PinataFractureOpts = {},
): Promise<PinataFractureResult> {
  const mesh = section.mesh;
  if (!(mesh as THREE.Mesh).isMesh) {
    return { ok: false, fragmentCount: 0, reason: "not_mesh" };
  }

  const src = mesh as THREE.Mesh;
  const geo = src.geometry;
  if (!geo) {
    return { ok: false, fragmentCount: 0, reason: "no_geometry" };
  }

  const loaded = await ensurePinataLoaded();
  if (!loaded || !pinataModule) {
    return { ok: false, fragmentCount: 0, reason: "pinata_unavailable" };
  }

  const outerMat = Array.isArray(src.material)
    ? src.material[0]
    : (src.material as THREE.Material);
  const innerMat =
    outerMat?.clone?.() ??
    new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.9 });
  if ("color" in innerMat && (innerMat as THREE.MeshStandardMaterial).color) {
    (innerMat as THREE.MeshStandardMaterial).color.offsetHSL(0, -0.05, -0.1);
  }

  src.updateMatrixWorld(true);
  const worldPos = new THREE.Vector3();
  const worldQuat = new THREE.Quaternion();
  const worldScale = new THREE.Vector3();
  src.matrixWorld.decompose(worldPos, worldQuat, worldScale);

  // Work in a temporary DestructibleMesh with world transform
  const dMesh = new pinataModule.DestructibleMesh(
    geo.clone(),
    outerMat,
    innerMat,
  );
  dMesh.position.copy(worldPos);
  dMesh.quaternion.copy(worldQuat);
  dMesh.scale.copy(worldScale);
  dMesh.updateMatrixWorld(true);

  const fragmentCount = opts.fragmentCount ?? 12;
  const fractureOpts = new pinataModule.FractureOptions({
    fractureMethod: "voronoi",
    fragmentCount,
    voronoiOptions: {
      mode: "2.5D",
      impactPoint: opts.impactPoint,
      impactRadius: opts.impactRadius ?? 0.6,
      useApproximation: fragmentCount > 20,
    },
  });

  const scene = opts.scene ?? findScene(src);
  const burst = opts.burstSpeed ?? 3.5;
  const fragments: THREE.Object3D[] = [];

  try {
    const result = dMesh.fracture(fractureOpts, (fragment, index) => {
      fragment.position.copy(worldPos);
      fragment.quaternion.copy(worldQuat);
      // Slight outward offset per index
      const dir = new THREE.Vector3(
        Math.sin(index * 2.4),
        0.4 + (index % 3) * 0.15,
        Math.cos(index * 2.4),
      ).normalize();
      fragment.position.addScaledVector(dir, 0.05);

      scene?.add(fragment);
      fragments.push(fragment);

      const linVel = dir.multiplyScalar(burst * (0.7 + Math.random() * 0.6));
      const angVel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
      );

      opts.addDynamicFragment?.(fragment, {
        linearVelocity: linVel,
        angularVelocity: angVel,
      });
    });

    // Ensure original stays hidden
    src.visible = false;

    const despawn = opts.despawnSec ?? 8;
    if (despawn > 0 && typeof window !== "undefined") {
      window.setTimeout(() => {
        for (const f of fragments) {
          f.parent?.remove(f);
          const m = f as THREE.Mesh;
          m.geometry?.dispose?.();
          if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose?.());
          else (m.material as THREE.Material | undefined)?.dispose?.();
        }
      }, despawn * 1000);
    }

    dMesh.geometry?.dispose?.();

    return {
      ok: true,
      fragmentCount: result?.length ?? fragments.length,
    };
  } catch (err) {
    console.warn("[PinataFracture] fracture failed:", err);
    return { ok: false, fragmentCount: 0, reason: "fracture_error" };
  }
}

function findScene(obj: THREE.Object3D): THREE.Scene | null {
  let o: THREE.Object3D | null = obj;
  while (o) {
    if ((o as THREE.Scene).isScene) return o as THREE.Scene;
    o = o.parent;
  }
  return null;
}

/**
 * Host callback factory for SectionalDamageSystem.onSectionDestroy.
 */
export function createPinataDestroyHandler(opts: PinataFractureOpts) {
  return (section: DamageSection, point: THREE.Vector3 | null) => {
    void fractureSection(section, {
      ...opts,
      impactPoint: point
        ? section.mesh.worldToLocal(point.clone())
        : undefined,
    });
  };
}
