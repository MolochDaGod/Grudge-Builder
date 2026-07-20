/**
 * Crop pack loader — soil + crop stage meshes from crops_low_poly.glb (CDN).
 * Safe stubs until the pack is present; FarmPlotSystem still works with primitives.
 */
import * as THREE from "three";
import type { CropStage } from "@shared/definitions/farming";

let ready = false;
let soilTemplate: THREE.Object3D | null = null;
const stageTemplates = new Map<string, THREE.Object3D>();

export function isCropPackReady(): boolean {
  return ready;
}

export async function preloadCropPack(): Promise<boolean> {
  return loadCropPack();
}

export async function loadCropPack(): Promise<boolean> {
  if (ready) return true;
  // Primitive soil tile fallback
  const soil = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.08, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 1.1 }),
  );
  soil.name = "soil_tile_fallback";
  soilTemplate = soil;

  for (const stage of ["F1", "F2", "F3"] as CropStage[]) {
    const h = stage === "F1" ? 0.25 : stage === "F2" ? 0.45 : 0.7;
    const plant = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, h, 6),
      new THREE.MeshStandardMaterial({ color: stage === "F3" ? 0x4ade80 : 0x65a30d }),
    );
    plant.name = `crop_${stage}_fallback`;
    stageTemplates.set(stage, plant);
  }
  ready = true;
  return true;
}

export function cloneSoilTile(): THREE.Object3D {
  if (!soilTemplate) {
    void loadCropPack();
  }
  return (soilTemplate ?? new THREE.Object3D()).clone(true);
}

export function cloneCropStage(stage: CropStage, _seedId?: string): THREE.Object3D {
  if (!ready) void loadCropPack();
  const tpl = stageTemplates.get(stage) ?? stageTemplates.get("F1");
  return (tpl ?? new THREE.Object3D()).clone(true);
}
