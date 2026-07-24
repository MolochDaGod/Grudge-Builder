/**
 * Explorer / voxel body appearance SSOT (shared with GRUDOX lean explorer).
 * Storage: grudge.avatar.appearance.v1 keyed by characterId.
 * Height: 1.55–2.05 m SI (mid ≈ 1.8 m).
 */
import * as THREE from "three";

export const APPEARANCE_STORAGE_KEY = "grudge.avatar.appearance.v1";
export const SELECTED_BY_ERA_KEY = "grudge.selectedCharacterByEra";
export const OPEN_SELECTED_KEY = "grudge.open.selectedCharacterId";

export interface ExplorerAppearance {
  height: number; // 0..1 → 1.55–2.05 m
  weight: number;
  thin: number;
  build: number;
  leg: number;
}

const DEFAULTS: ExplorerAppearance = {
  height: 0.5,
  weight: 0.5,
  thin: 0.5,
  build: 0.5,
  leg: 0.5,
};

export const HEIGHT_M = { min: 1.55, max: 2.05 } as const;

function clamp01(v: number): number {
  if (!(v >= 0)) return 0;
  if (v > 1) return 1;
  return v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function normalizeAppearance(raw: unknown): ExplorerAppearance {
  const out = { ...DEFAULTS };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  for (const k of Object.keys(DEFAULTS) as (keyof ExplorerAppearance)[]) {
    if (r[k] != null) out[k] = clamp01(Number(r[k]));
  }
  return out;
}

export function getAppearance(characterId: string | null | undefined): ExplorerAppearance {
  if (typeof localStorage === "undefined") return { ...DEFAULTS };
  try {
    const map = JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY) || "{}") as Record<
      string,
      unknown
    >;
    const id = characterId || "guest";
    return normalizeAppearance(map[id] || map.guest || null);
  } catch {
    return { ...DEFAULTS };
  }
}

export function heightMeters(app: ExplorerAppearance): number {
  const a = normalizeAppearance(app);
  return lerp(HEIGHT_M.min, HEIGHT_M.max, a.height);
}

/** Selected character ids per era from Explorer / campfire. */
export function readSelectedByEra(): Partial<Record<string, string>> {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SELECTED_BY_ERA_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

export function readOpenSelectedCharacterId(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return (
      localStorage.getItem(OPEN_SELECTED_KEY) ||
      localStorage.getItem("voxelrealms.selectedCharacterId") ||
      localStorage.getItem("grudge_active_character") ||
      null
    );
  } catch {
    return null;
  }
}

/**
 * Apply explorer body ranges after mesh is fit to ~1.8 m.
 * Uses root uniform scale for height; light XZ bulk from weight.
 */
export function applyExplorerAppearanceToRoot(
  root: THREE.Object3D,
  app: ExplorerAppearance,
  baseHeightM = 1.8,
): number {
  const a = normalizeAppearance(app);
  const hM = heightMeters(a);
  const uniform = hM / Math.max(0.5, baseHeightM);
  const bulk = lerp(0.9, 1.12, a.weight);
  root.scale.set(uniform * bulk, uniform, uniform * bulk);
  root.updateMatrixWorld(true);
  try {
    const box = new THREE.Box3().setFromObject(root);
    if (Number.isFinite(box.min.y)) {
      root.position.y -= box.min.y;
    }
  } catch {
    /* ignore */
  }
  root.userData.avatarAppearance = a;
  root.userData.avatarHeightM = hM;
  return hM;
}

/** Procedural blocky explorer for voxel era when no GLB kit. */
export function createBlockyExplorer(options?: {
  skinColor?: number;
  shirtColor?: number;
  pantsColor?: number;
}): THREE.Group {
  const skin = options?.skinColor ?? 0xc68642;
  const shirt = options?.shirtColor ?? 0x3b6ea5;
  const pants = options?.pantsColor ?? 0x2d3a4a;
  const group = new THREE.Group();
  group.name = "explorer-avatar";

  const mat = (c: number) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.05 });

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), mat(skin));
  head.name = "head";
  head.userData.avatarPart = "head";
  head.position.y = 1.55;
  group.add(head);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.22), mat(shirt));
  torso.name = "torso";
  torso.userData.avatarPart = "torso";
  torso.position.y = 1.15;
  group.add(torso);

  const makeLimb = (name: string, part: string, c: number, w: number, h: number, d: number, x: number, y: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    m.name = name;
    m.userData.avatarPart = part;
    m.position.set(x, y, 0);
    group.add(m);
  };
  makeLimb("arm_L", "arm", shirt, 0.12, 0.45, 0.12, -0.3, 1.12);
  makeLimb("arm_R", "arm", shirt, 0.12, 0.45, 0.12, 0.3, 1.12);
  makeLimb("leg_L", "leg", pants, 0.14, 0.55, 0.14, -0.12, 0.35);
  makeLimb("leg_R", "leg", pants, 0.14, 0.55, 0.14, 0.12, 0.35);

  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return group;
}
