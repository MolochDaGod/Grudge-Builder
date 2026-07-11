/**
 * Apply baked Grudge6 race atlas textures to race meshes.
 *
 * CDN SSOT (verified magic-byte webp):
 *   https://assets.grudge-studio.com/textures/grudge6/{faction}/{file}.webp
 *
 * Fallbacks try legacy ObjectStore-style paths if CDN key moves.
 */
import * as THREE from "three";
import { normalizeRaceId, raceMeshPrefix } from "@shared/fleet";
import { assetUrl } from "@/lib/assetConfig";
import { resolveAsset } from "@shared/definitions/resolveAsset";

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

/** Ordered candidate URLs for a race atlas (first success wins). */
export function raceTextureCandidateUrls(raceId: string): string[] {
  const id = normalizeRaceId(raceId);
  const entry = RACE_TEXTURE_FILES[id] ?? RACE_TEXTURE_FILES.human;
  const r2Key = `textures/grudge6/${entry.folder}/${entry.file}`;
  const primary = resolveAsset(r2Key).url;
  return [
    primary,
    assetUrl(`/textures/grudge6/${entry.folder}/${entry.file}`),
    // Legacy mistaken path (old grudge6Textures) — keep last
    assetUrl(`/assets/${entry.folder}/textures/${entry.file}`),
  ];
}

function loadUrl(url: string): Promise<THREE.Texture | null> {
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

function loadRaceTexture(raceId: string): Promise<THREE.Texture | null> {
  const urls = raceTextureCandidateUrls(raceId);
  return (async () => {
    for (const url of urls) {
      const tex = await loadUrl(url);
      if (tex) return tex;
    }
    console.warn(`[grudge6Textures] no atlas for race=${raceId}`, urls);
    return null;
  })();
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
      if (
        mat instanceof THREE.MeshStandardMaterial ||
        mat instanceof THREE.MeshPhongMaterial
      ) {
        mat.map = tex;
        mat.needsUpdate = true;
      }
    }
  });
}

/** For smoke / debug */
export function raceTexturePrimaryUrl(raceId: string): string {
  return raceTextureCandidateUrls(raceId)[0];
}
