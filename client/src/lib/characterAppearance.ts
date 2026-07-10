/**
 * Shared character appearance helpers — color tints + texture color space.
 * Used by local player (CharacterController3D) and remote players.
 */
import * as THREE from 'three';

const WHITE = new THREE.Color(0xffffff);

function isNearWhite(hex: string | undefined | null): boolean {
  if (!hex) return true;
  const c = hex.trim().toLowerCase();
  return c === '#ffffff' || c === '#fff' || c === 'white' || c === 'rgb(255,255,255)';
}

/**
 * Apply skin / armor color tints without destroying albedo maps.
 * Light materials → skin multiply; darker → armor multiply.
 */
export function applyCharacterColorTints(
  root: THREE.Object3D,
  skinColor?: string | null,
  armorColor?: string | null,
): void {
  const skinOk = skinColor && !isNearWhite(skinColor);
  const armorOk = armorColor && !isNearWhite(armorColor);
  if (!skinOk && !armorOk) return;

  const skinC = skinOk ? new THREE.Color(skinColor!) : WHITE;
  const armorC = armorOk ? new THREE.Color(armorColor!) : WHITE;

  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    // Skip pure equipment weapon meshes when tagged
    const slot = mesh.userData?.equipSlot as string | undefined;
    if (slot && (slot === 'axe' || slot === 'hammer' || slot === 'sword' || slot === 'bow' ||
      slot === 'staff' || slot === 'spear' || slot === 'pick' || slot === 'shield')) {
      return;
    }

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat || !(mat as THREE.MeshStandardMaterial).color) continue;
      const std = mat as THREE.MeshStandardMaterial;
      // Snapshot original once so refreshAppearance does not stack multiply
      if (!std.userData._grudgeBaseColor) {
        std.userData._grudgeBaseColor = std.color.clone();
      }
      const base = std.userData._grudgeBaseColor as THREE.Color;
      std.color.copy(base);
      const lum = base.r * 0.3 + base.g * 0.59 + base.b * 0.11;
      if (lum > 0.55 && skinOk) {
        std.color.multiply(skinC);
      } else if (lum <= 0.55 && armorOk) {
        std.color.multiply(armorC);
      }
      std.needsUpdate = true;
    }
  });
}

/**
 * Ensure albedo / emissive maps use sRGB (correct color on WebGL).
 * Race GLBs from R2 sometimes ship as MeshStandard/Physical/Toon with maps
 * still tagged linear — that washes equipment to gray/white.
 * Data maps (normal, metalnessRoughness, AO) stay linear (no-op here).
 */
export function ensureCharacterTextureColorSpace(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat) continue;
      // Color maps that must be sRGB across material types
      const colorKeys = [
        'map',
        'emissiveMap',
        'specularMap',
        'sheenColorMap',
        'specularColorMap',
      ] as const;
      const anyMat = mat as THREE.MeshStandardMaterial & Record<string, unknown>;
      for (const key of colorKeys) {
        const tex = anyMat[key] as THREE.Texture | null | undefined;
        if (tex && (tex as THREE.Texture).isTexture) {
          if (tex.colorSpace !== THREE.SRGBColorSpace) {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;
          }
          // GLTF packs usually have flipY=false; force consistent sampling
          if (tex.flipY !== false) {
            tex.flipY = false;
            tex.needsUpdate = true;
          }
        }
      }
      // Avoid over-metal that kills albedo readability on race kits
      if (typeof anyMat.metalness === 'number') {
        anyMat.metalness = Math.min(anyMat.metalness as number, 0.55);
      }
      mat.needsUpdate = true;
    }
  });
}
