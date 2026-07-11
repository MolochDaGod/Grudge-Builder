/**
 * TerrainPackage — shared bake contract for Forge + Island3DEngine + Unity export.
 *
 * Not a giant FBX blob. Layers:
 *   heightfield + biome paint + water level + entity scatter (CDN refs)
 *
 * schema 1 — keep migrations additive.
 */

import type { AssetMeta } from "./resolveAsset";

export const TERRAIN_PACKAGE_SCHEMA = 1 as const;

export type TerrainEntityKind =
  | "tree"
  | "rock"
  | "bush"
  | "flower"
  | "resource_node"
  | "creature"
  | "building"
  | "prop"
  | "dock"
  | "spawn_point"
  | "marker";

export interface TerrainHeightfield {
  /** Power-of-two-ish grid resolution per side (e.g. 128, 257) */
  resolution: number;
  /** World size on XZ in metres (square) */
  sizeM: number;
  /**
   * Row-major heights (z major, then x), length = resolution².
   * Metres above local origin Y.
   */
  heights: number[];
  /** Optional biome id per vertex (0=grass 1=sand 2=rock 3=snow …) */
  biome?: number[];
  /** World-space origin of heightfield corner (Unity/Three) */
  worldPosition?: [number, number, number];
}

export interface TerrainEntity {
  id: string;
  kind: TerrainEntityKind;
  name: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  /** CDN asset reference */
  asset?: AssetMeta & { r2Key: string };
  data?: Record<string, unknown>;
}

export interface TerrainPackage {
  schema: typeof TERRAIN_PACKAGE_SCHEMA;
  mapId: string;
  name?: string;
  /** unity | forge | procedural | unity-export */
  source?: string;
  exportedAt?: string;
  heightfield: TerrainHeightfield;
  entities: TerrainEntity[];
  water?: {
    levelY: number;
    /** optional shader profile id */
    profile?: string;
  };
  /** Gameplay markers (towns, harbors, portals) — not always meshed */
  markers?: Array<{
    name: string;
    kind: string;
    position: [number, number, number];
  }>;
  /** Character reference height for scale audits */
  characterHeightM?: number;
}

export interface TerrainPackageValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function createEmptyTerrainPackage(
  mapId: string,
  opts?: { resolution?: number; sizeM?: number; name?: string },
): TerrainPackage {
  const resolution = opts?.resolution ?? 128;
  const sizeM = opts?.sizeM ?? 256;
  const cells = resolution * resolution;
  return {
    schema: TERRAIN_PACKAGE_SCHEMA,
    mapId,
    name: opts?.name ?? mapId,
    source: "procedural",
    exportedAt: new Date().toISOString(),
    heightfield: {
      resolution,
      sizeM,
      heights: new Array(cells).fill(0),
      biome: new Array(cells).fill(0),
      worldPosition: [0, 0, 0],
    },
    entities: [],
    water: { levelY: 0 },
    markers: [],
    characterHeightM: 2.0,
  };
}

export function validateTerrainPackage(pkg: unknown): TerrainPackageValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!pkg || typeof pkg !== "object") {
    return { ok: false, errors: ["package is not an object"], warnings };
  }
  const p = pkg as Partial<TerrainPackage>;

  if (p.schema !== TERRAIN_PACKAGE_SCHEMA) {
    errors.push(`schema must be ${TERRAIN_PACKAGE_SCHEMA}`);
  }
  if (!p.mapId || typeof p.mapId !== "string") {
    errors.push("mapId required");
  }
  if (!p.heightfield || typeof p.heightfield !== "object") {
    errors.push("heightfield required");
  } else {
    const h = p.heightfield;
    if (!(h.resolution! > 1)) errors.push("heightfield.resolution must be > 1");
    if (!(h.sizeM! > 0)) errors.push("heightfield.sizeM must be > 0");
    const need = (h.resolution || 0) * (h.resolution || 0);
    if (!Array.isArray(h.heights) || h.heights.length !== need) {
      errors.push(`heightfield.heights length must be resolution² (${need})`);
    }
    if (h.biome && h.biome.length !== need) {
      warnings.push("heightfield.biome length mismatch — will ignore or pad");
    }
  }
  if (!Array.isArray(p.entities)) {
    errors.push("entities must be an array");
  } else {
    p.entities.forEach((e, i) => {
      if (!e?.id) errors.push(`entities[${i}].id required`);
      if (!e?.kind) errors.push(`entities[${i}].kind required`);
      if (!Array.isArray(e?.position) || e.position.length < 3) {
        errors.push(`entities[${i}].position [x,y,z] required`);
      }
      if (e?.asset && !e.asset.r2Key) {
        warnings.push(`entities[${i}].asset missing r2Key`);
      }
    });
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Convert package heightfield → Forge/Island MapProject terrain shape
 * (resolution, size, heights, biome).
 */
export function terrainPackageToTerrainData(pkg: TerrainPackage): {
  resolution: number;
  size: number;
  heights: number[];
  biome: number[];
} {
  const h = pkg.heightfield;
  const need = h.resolution * h.resolution;
  const heights = h.heights.slice(0, need);
  while (heights.length < need) heights.push(0);
  const biome = (h.biome ?? []).slice(0, need);
  while (biome.length < need) biome.push(0);
  return {
    resolution: h.resolution,
    size: h.sizeM,
    heights,
    biome,
  };
}

/**
 * Build entities for Forge MapProject / Island3D from package scatter.
 * asset.r2Key → client resolves via resolveAsset().
 */
export function terrainPackageToPlacedEntities(
  pkg: TerrainPackage,
): Array<{
  id: string;
  kind: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  asset?: string;
  data: Record<string, unknown>;
}> {
  return pkg.entities.map((e) => {
    const data: Record<string, unknown> = { ...(e.data ?? {}) };
    if (e.asset?.r2Key) {
      data.r2Key = e.asset.r2Key;
      if (e.asset.meshName) data.meshName = e.asset.meshName;
      if (e.asset.targetSizeM != null) data.targetSizeM = e.asset.targetSizeM;
    }
    return {
      id: e.id,
      kind: e.kind,
      name: e.name,
      position: e.position,
      rotation: e.rotation ?? [0, 0, 0],
      scale: e.scale ?? [1, 1, 1],
      asset: e.asset?.r2Key
        ? `https://assets.grudge-studio.com/${e.asset.r2Key.replace(/^\//, "")}`
        : undefined,
      data,
    };
  });
}
