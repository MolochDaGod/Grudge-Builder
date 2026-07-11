/**
 * resolveAsset — fleet SSOT for CDN paths + scale metadata.
 *
 * Binary files live on R2 (assets.grudge-studio.com).
 * Registry rows (D1 asset_registry) add targetSizeM / meshNames / layer.
 * This module does NOT invent meshes — it only builds URLs + scale helpers.
 *
 * Usage:
 *   resolveAsset('models/nature/stylized/harvest/ore_nodes.glb', { targetSizeM: 2 })
 *   resolveAsset({ r2Key: '…', meshName: 'Ore_01', targetSizeM: 1.5 })
 *   scaleFactorForTargetHeightM(bboxHeight, meta.targetSizeM)
 */

export const ASSET_CDN_DEFAULT = "https://assets.grudge-studio.com";

export type AssetBinaryKind = "glb" | "fbx" | "gltf" | "webp" | "png" | "jpg" | "unknown";

export interface AssetMeta {
  /** R2 object key (no leading slash), e.g. models/foo.glb */
  r2Key: string;
  /** Optional multi-mesh pack child name */
  meshName?: string;
  /** World height in metres after fit (heroes ~1.8–2.0) */
  targetSizeM?: number;
  /** Game layer tag (nature, harvest, characters, …) */
  layer?: string;
  category?: string;
}

export interface ResolvedAsset extends AssetMeta {
  /** Full HTTPS CDN URL */
  url: string;
  kind: AssetBinaryKind;
}

/** Known production registry seeds (subset — full list via D1 / seed-warlords-d1). */
export const WARLORDS_SEED_KEYS: readonly AssetMeta[] = [
  { r2Key: "models/grudge6/races/WK_Characters.fbx", layer: "characters", targetSizeM: 1.8, category: "character" },
  { r2Key: "models/grudge6/races/BRB_Characters.fbx", layer: "characters", targetSizeM: 2.0, category: "character" },
  { r2Key: "models/grudge6/races/DWF_Characters.fbx", layer: "characters", targetSizeM: 1.55, category: "character" },
  { r2Key: "models/grudge6/races/ELF_Characters.fbx", layer: "characters", targetSizeM: 1.8, category: "character" },
  { r2Key: "models/grudge6/races/ORC_Characters.fbx", layer: "characters", targetSizeM: 2.1, category: "character" },
  { r2Key: "models/grudge6/races/UD_Characters.fbx", layer: "characters", targetSizeM: 1.8, category: "character" },
  { r2Key: "textures/grudge6/western-kingdoms/WK_Standard_Units.webp", layer: "characters", category: "texture" },
  { r2Key: "textures/grudge6/barbarians/BRB_StandardUnits_texture.webp", layer: "characters", category: "texture" },
  { r2Key: "textures/grudge6/dwarves/DWF_Standard_Units.webp", layer: "characters", category: "texture" },
  { r2Key: "textures/grudge6/elves/ELF_HighElves_Texture.webp", layer: "characters", category: "texture" },
  { r2Key: "textures/grudge6/orcs/ORC_StandardUnits.webp", layer: "characters", category: "texture" },
  { r2Key: "textures/grudge6/undead/UD_Standard_Units.webp", layer: "characters", category: "texture" },
  { r2Key: "models/nature/stylized/biome/nature_vegetation.glb", layer: "nature", category: "environment" },
  { r2Key: "models/nature/stylized/biome/tropical_plants.glb", layer: "nature", category: "environment" },
  { r2Key: "models/nature/stylized/biome/realistic_trees.glb", layer: "nature", category: "environment" },
  { r2Key: "models/nature/stylized/rocks/stylised_rocks.glb", layer: "nature", category: "environment" },
  { r2Key: "models/nature/stylized/harvest/ore_nodes.glb", layer: "harvest", category: "environment" },
  { r2Key: "models/nature/stylized/harvest/minerals_pack.glb", layer: "harvest", category: "environment" },
  { r2Key: "models/nature/stylized/harvest/flowers_pack.glb", layer: "harvest", category: "environment" },
  { r2Key: "models/nature/stylized/harvest/foliage_pack.glb", layer: "harvest", category: "environment" },
  { r2Key: "models/nature/stylized/concept/example_home_island.glb", layer: "nature", category: "environment" },
  { r2Key: "models/survival/free_survival_asset_kit.glb", layer: "survival", category: "prop", meshName: "campfire" },
  { r2Key: "models/environment/note-of-arms/note_of_arms_v2.glb", layer: "chain", category: "environment" },
] as const;

export function normalizeR2Key(input: string): string {
  let k = (input || "").trim();
  if (!k) return "";
  // Full URL → path
  k = k.replace(/^https?:\/\/assets\.grudge-studio\.com\/?/i, "");
  k = k.replace(/^https?:\/\/[^/]+\//i, "");
  k = k.replace(/^\/+/, "");
  // Drop query/hash
  k = k.split("?")[0].split("#")[0];
  return k;
}

export function detectAssetKind(r2Key: string): AssetBinaryKind {
  const lower = r2Key.toLowerCase();
  if (lower.endsWith(".glb")) return "glb";
  if (lower.endsWith(".gltf")) return "gltf";
  if (lower.endsWith(".fbx")) return "fbx";
  if (lower.endsWith(".webp")) return "webp";
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpg";
  return "unknown";
}

export function r2KeyToCdnUrl(
  r2Key: string,
  cdnBase: string = ASSET_CDN_DEFAULT,
): string {
  const key = normalizeR2Key(r2Key);
  const base = (cdnBase || ASSET_CDN_DEFAULT).replace(/\/$/, "");
  return `${base}/${key}`;
}

/**
 * Resolve a path or meta object to a CDN URL + scale metadata.
 * Catalog overrides (targetSizeM / meshNames) win over bare strings.
 */
export function resolveAsset(
  input: string | AssetMeta,
  opts?: {
    cdnBase?: string;
    /** Extra registry map: r2Key → partial meta */
    registry?: Record<string, Partial<AssetMeta>>;
  },
): ResolvedAsset {
  const baseMeta: AssetMeta =
    typeof input === "string"
      ? { r2Key: normalizeR2Key(input) }
      : { ...input, r2Key: normalizeR2Key(input.r2Key) };

  const reg = opts?.registry?.[baseMeta.r2Key];
  const merged: AssetMeta = {
    ...baseMeta,
    ...reg,
    r2Key: baseMeta.r2Key,
    meshName: baseMeta.meshName ?? reg?.meshName,
    targetSizeM: baseMeta.targetSizeM ?? reg?.targetSizeM,
    layer: baseMeta.layer ?? reg?.layer,
    category: baseMeta.category ?? reg?.category,
  };

  // Built-in seed catalog fill-in
  const seed = WARLORDS_SEED_KEYS.find((e) => e.r2Key === merged.r2Key);
  if (seed) {
    if (merged.targetSizeM == null) merged.targetSizeM = seed.targetSizeM;
    if (!merged.layer) merged.layer = seed.layer;
    if (!merged.category) merged.category = seed.category;
    if (!merged.meshName && seed.meshName) merged.meshName = seed.meshName;
  }

  return {
    ...merged,
    url: r2KeyToCdnUrl(merged.r2Key, opts?.cdnBase),
    kind: detectAssetKind(merged.r2Key),
  };
}

/**
 * Fit mesh root scale so axis-aligned height ≈ targetHeightM.
 * meshHeightModelUnits = bbox max.y - min.y after load, before scale.
 */
export function scaleFactorForTargetHeightM(
  meshHeightModelUnits: number,
  targetHeightM: number,
): number {
  if (!(meshHeightModelUnits > 1e-6) || !(targetHeightM > 0)) return 1;
  return targetHeightM / meshHeightModelUnits;
}

/** Magic-byte expectations for production verify scripts */
export function expectedMagic(kind: AssetBinaryKind): "glb" | "fbx" | "webp" | "png" | "jpeg" | null {
  switch (kind) {
    case "glb":
      return "glb";
    case "fbx":
      return "fbx";
    case "webp":
      return "webp";
    case "png":
      return "png";
    case "jpg":
      return "jpeg";
    default:
      return null;
  }
}
