/**
 * Apply baked Grudge6 race atlas textures to GLB child meshes.
 */
import * as THREE from "three";
import { normalizeRaceId, raceMeshPrefix } from "@shared/fleet";
import { assetUrl } from "@/lib/assetConfig";

const RACE_TEXTURE_FILES: Record<string, { folder: string; file: string }> = {
  human: { folder: "western-kingdoms", file: "WK_Standard_Units.webp" },
  barbarian: { folder: "barbarians", file: "BRB_StandardUnits_texture.webp" },
  dwarf: { folder: "dwarves", file: "DWF_Standard_Units.webp" },
  elf: { folder: "elves", file: "ELF_HighElves_Texture.webp" },
  orc: { folder: "orcs", file: "ORC_StandardUnits.webp" },
  undead: { folder: "undead", file: "UD_Standard_Units.webp" },
};

const _texLoader = new THREE.TextureLoader();
const _cache = new Map<string, THREE.Texture>();

function raceTextureUrl(raceId: string): string {
  const id = normalizeRaceId(raceId);
  const entry = RACE_TEXTURE_FILES[id] ?? RACE_TEXTURE_FILES.human;
  return assetUrl(`/assets/${entry.folder}/textures/${entry.file}`);
}

function loadRaceTexture(raceId: string): Promise<THREE.Texture | null> {
  const url = raceTextureUrl(raceId);
  const cached = _cache.get(url);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    _texLoader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.flipY = false;
        _cache.set(url, tex);
        resolve(tex);
      },
      undefined,
      () => resolve(null),
    );
  });
}

export async function applyGrudge6RaceTextures(
  root: THREE.Object3D,
  raceId: string,
): Promise<void> {
  const tex = await loadRaceTexture(raceId);
  if (!tex) return;

  const prefix = raceMeshPrefix(raceId);
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh && !(mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
    mesh.userData.racePrefix = prefix;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial) {
        mat.map = tex;
        mat.needsUpdate = true;
      }
    }
  });
}