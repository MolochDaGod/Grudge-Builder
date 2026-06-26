/**
 * RTS ↔ Warlords terrain heightmap bridge.
 * RTS IslandGenerator (200m, 128²) exports a compact heightmap;
 * Railway derives canonical 6-zone terrainZones + stores rtsHeightmap for parity.
 */

import {
  HOME_ISLAND_RTS_SIZE_M,
  HOME_ISLAND_ZONE_TYPES,
  type HomeIslandZoneType,
} from "./homeIslandSeed";

export const RTS_TERRAIN_RESOLUTION = 128;

export interface RtsHeightmapPayload {
  resolution: number;
  worldSizeM: number;
  maxHeightM: number;
  biome: string;
  /** Base64 little-endian Uint16Array (height / maxHeightM × 65535) */
  heightsBase64: string;
}

export interface TerrainZoneBounds {
  type: HomeIslandZoneType;
  bounds: { x: number; y: number; width: number; height: number };
}

/** Browser-safe base64 encode of quantized heights. */
export function encodeRtsHeightmap(
  heights: Float32Array,
  maxHeightM: number,
): string {
  const u16 = new Uint16Array(heights.length);
  const denom = Math.max(maxHeightM, 0.001);
  for (let i = 0; i < heights.length; i++) {
    u16[i] = Math.min(65535, Math.round((Math.max(0, heights[i]) / denom) * 65535));
  }
  const bytes = new Uint8Array(u16.buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  if (typeof btoa !== "undefined") return btoa(binary);
  return Buffer.from(bytes).toString("base64");
}

/** Decode quantized heights (Node or browser). */
export function decodeRtsHeightmap(payload: RtsHeightmapPayload): Float32Array {
  const count = (payload.resolution + 1) ** 2;
  let bytes: Uint8Array;
  if (typeof Buffer !== "undefined") {
    bytes = new Uint8Array(Buffer.from(payload.heightsBase64, "base64"));
  } else {
    const binary = atob(payload.heightsBase64);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  }
  const u16 = new Uint16Array(bytes.buffer, bytes.byteOffset, Math.min(count, bytes.byteLength / 2));
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = (u16[i] / 65535) * payload.maxHeightM;
  }
  return out;
}

function worldToPercent(wx: number, wz: number, worldSizeM: number): { x: number; y: number } {
  return {
    x: (wx / worldSizeM + 0.5) * 100,
    y: (wz / worldSizeM + 0.5) * 100,
  };
}

function classifyCell(
  height: number,
  pctX: number,
  pctY: number,
  maxHeightM: number,
): HomeIslandZoneType {
  const dist = Math.hypot(pctX - 50, pctY - 50);
  const elevNorm = height / Math.max(maxHeightM, 0.001);

  if (height < 0.4 || dist > 46) return "water";
  if (height < 1.2 || dist > 40) return "shore";
  if (elevNorm > 0.55 && pctY < 42) return "mountain";
  if (dist < 14 && elevNorm > 0.12 && elevNorm < 0.35) return "clearing";
  if (elevNorm > 0.38 && pctY < 55) return "forest";
  return "field";
}

/**
 * Derive canonical 6-zone bounds from RTS height samples on a 0–100 logical map.
 */
export function deriveTerrainZonesFromRtsHeightmap(
  payload: RtsHeightmapPayload,
): TerrainZoneBounds[] {
  const heights = decodeRtsHeightmap(payload);
  const res = payload.resolution;
  const worldSize = payload.worldSizeM;
  const half = worldSize / 2;

  const acc: Record<HomeIslandZoneType, { minX: number; minY: number; maxX: number; maxY: number; n: number }> =
    Object.fromEntries(
      HOME_ISLAND_ZONE_TYPES.map((t) => [t, { minX: 100, minY: 100, maxX: 0, maxY: 0, n: 0 }]),
    ) as Record<HomeIslandZoneType, { minX: number; minY: number; maxX: number; maxY: number; n: number }>;

  for (let iz = 0; iz <= res; iz++) {
    for (let ix = 0; ix <= res; ix++) {
      const wx = (ix / res) * worldSize - half;
      const wz = (iz / res) * worldSize - half;
      const { x: pctX, y: pctY } = worldToPercent(wx, wz, worldSize);
      const h = heights[iz * (res + 1) + ix];
      const zone = classifyCell(h, pctX, pctY, payload.maxHeightM);
      const bucket = acc[zone];
      bucket.minX = Math.min(bucket.minX, pctX);
      bucket.minY = Math.min(bucket.minY, pctY);
      bucket.maxX = Math.max(bucket.maxX, pctX);
      bucket.maxY = Math.max(bucket.maxY, pctY);
      bucket.n++;
    }
  }

  const zones: TerrainZoneBounds[] = [];
  for (const type of HOME_ISLAND_ZONE_TYPES) {
    const b = acc[type];
    if (b.n < 4) {
      zones.push({ type, bounds: fallbackBounds(type) });
      continue;
    }
    const pad = 2;
    zones.push({
      type,
      bounds: {
        x: Math.max(0, b.minX - pad),
        y: Math.max(0, b.minY - pad),
        width: Math.min(100, b.maxX - b.minX + pad * 2),
        height: Math.min(100, b.maxY - b.minY + pad * 2),
      },
    });
  }
  return zones;
}

function fallbackBounds(type: HomeIslandZoneType): { x: number; y: number; width: number; height: number } {
  const map: Record<HomeIslandZoneType, { x: number; y: number; width: number; height: number }> = {
    mountain: { x: 5, y: 5, width: 30, height: 28 },
    forest: { x: 35, y: 30, width: 35, height: 35 },
    field: { x: 15, y: 35, width: 40, height: 35 },
    shore: { x: 0, y: 75, width: 100, height: 18 },
    water: { x: 70, y: 5, width: 25, height: 22 },
    clearing: { x: 42, y: 42, width: 14, height: 14 },
  };
  return map[type];
}

/** Camp at clearing centroid, else island center. */
export function deriveCampPositionFromZones(
  zones: TerrainZoneBounds[],
): { x: number; y: number } {
  const clearing = zones.find((z) => z.type === "clearing");
  if (clearing) {
    return {
      x: clearing.bounds.x + clearing.bounds.width / 2,
      y: clearing.bounds.y + clearing.bounds.height / 2,
    };
  }
  return { x: 50, y: 50 };
}

export function buildRtsHeightmapPayload(
  heights: Float32Array,
  resolution: number,
  worldSizeM: number,
  maxHeightM: number,
  biome: string,
): RtsHeightmapPayload {
  return {
    resolution,
    worldSizeM,
    maxHeightM,
    biome,
    heightsBase64: encodeRtsHeightmap(heights, maxHeightM),
  };
}

/** Default RTS island footprint when regenerating server-side without client payload. */
export const RTS_DEFAULT_WORLD_SIZE_M = HOME_ISLAND_RTS_SIZE_M;