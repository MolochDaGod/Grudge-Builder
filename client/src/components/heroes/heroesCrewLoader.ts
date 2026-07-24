/**
 * Resolve player character meshes for the airship cinema crew.
 *
 * Pipelines (gameEras SSOT):
 *   warlords → grudge6 race GLB + equipment
 *   voxel    → explorer selection (appearance body ranges + blocky or kit mesh)
 *   nexus    → toon soldier CDN mesh when available, else grudge6 fallback
 *
 * Always SI-fit height via fitCharacterRootToHeightM / explorer appearance.
 */
import * as THREE from "three";
import type { Character } from "@/lib/characterManager";
import {
  loadCharacterModel,
  AnimationController,
  preloadAnimations,
  type LoadedModel,
} from "@/lib/modelLoader";
import {
  RACE_GRUDGE6,
  resolveRaceCdnUrl,
  panelEquipmentToModel3d,
  weaponTypeFromModel3d,
  normalizeRaceId,
  type PanelEquipment,
} from "@shared/fleet";
import { setupGrudge6Equipment } from "@/lib/grudge6Equipment";
import { applyGrudge6RaceTextures } from "@/lib/grudge6Textures";
import { applyCharacterColorTints, ensureCharacterTextureColorSpace } from "@/lib/characterAppearance";
import { fitCharacterRootToHeightM, PLAYER_HEIGHT_M } from "@/island3d/zoneWorldScale";
import { getAnimationSet, type AnimationDef, type WeaponType } from "@/lib/modelManifest";
import { defaultPipelineForEra, normalizeGameEra, type GameEra } from "@shared/definitions/gameEras";
import {
  applyExplorerAppearanceToRoot,
  createBlockyExplorer,
  getAppearance,
  heightMeters,
} from "@/lib/explorerAppearance";

export type CrewPipeline = "grudge6" | "voxel" | "toon" | "armada";

export function pipelineForCharacter(hero: Character): CrewPipeline {
  const era = normalizeGameEra(hero.gameEra || hero.model3d?.gameEra || "warlords");
  const pipe = defaultPipelineForEra(era as GameEra);
  if (pipe === "voxel") return "voxel";
  if (pipe === "toon") return "toon";
  if (pipe === "armada" || pipe === "armada_ship") return "armada";
  return "grudge6";
}

export interface CrewLoaded {
  root: THREE.Object3D;
  controller: AnimationController | null;
  pipeline: CrewPipeline;
  heightM: number;
}

async function loadGrudge6(hero: Character): Promise<CrewLoaded> {
  const raceKey = normalizeRaceId(hero.raceId || "human");
  const race = RACE_GRUDGE6[raceKey] ?? RACE_GRUDGE6.human;
  const loaded = await loadCharacterModel(resolveRaceCdnUrl(raceKey));

  const equipment = (hero.equipment || {}) as PanelEquipment;
  const model3d = panelEquipmentToModel3d(
    raceKey,
    hero.classId || "warrior",
    equipment,
    hero.model3d as any,
  );

  await applyGrudge6RaceTextures(loaded.scene, raceKey);
  setupGrudge6Equipment(race.prefix, loaded.scene, model3d);
  await applyGrudge6RaceTextures(loaded.scene, raceKey);
  ensureCharacterTextureColorSpace(loaded.scene);
  applyCharacterColorTints(loaded.scene, model3d.skinColor, model3d.armorColor);

  const raceMult = model3d.scale ?? race.scale ?? 1;
  fitCharacterRootToHeightM(loaded.scene, raceMult, PLAYER_HEIGHT_M);

  // If this hero also has explorer appearance saved, apply height range on top
  const app = getAppearance(hero.id);
  const hM = applyExplorerAppearanceToRoot(loaded.scene, app, PLAYER_HEIGHT_M * raceMult);

  const controller = new AnimationController(loaded.mixer, loaded.scene);
  const weaponType = weaponTypeFromModel3d(model3d, hero.classId) as WeaponType;
  const animSet = getAnimationSet(weaponType);
  const animMap: Record<string, string> = {};
  for (const [state, def] of Object.entries(animSet)) {
    if (def) animMap[state] = (def as AnimationDef).file;
  }
  await preloadAnimations(controller, animMap);
  for (const [name, action] of loaded.actions) {
    if (!controller.actions.has(name)) controller.actions.set(name, action);
  }
  if (!controller.play("idle", { loop: true, speed: 1 })) {
    const first = controller.loadedStates[0];
    if (first) controller.play(first, { loop: true, speed: 1 });
  }

  return { root: loaded.scene, controller, pipeline: "grudge6", heightM: hM };
}

async function loadVoxelExplorer(hero: Character): Promise<CrewLoaded> {
  // Prefer race kit when raceId maps to grudge6 (Foundry hero used as explorer)
  const raceKey = normalizeRaceId(hero.raceId || "human");
  if (RACE_GRUDGE6[raceKey] || hero.raceId) {
    try {
      const g6 = await loadGrudge6(hero);
      return { ...g6, pipeline: "voxel" };
    } catch (e) {
      console.warn("[heroesCrew] grudge6 fallback for voxel failed", e);
    }
  }

  // Procedural explorer blocky + body ranges
  const app = getAppearance(hero.id);
  const blocky = createBlockyExplorer();
  const hM = applyExplorerAppearanceToRoot(blocky, app, 1.8);
  // No skinned mixer — AI will skip clip play; still walks via root motion positions
  return { root: blocky, controller: null, pipeline: "voxel", heightM: hM };
}

/**
 * Load crew mesh for airship AI. Always returns a grounded root.
 */
export async function loadCrewHero(hero: Character): Promise<CrewLoaded> {
  const pipe = pipelineForCharacter(hero);
  if (pipe === "voxel") {
    return loadVoxelExplorer(hero);
  }
  // toon / armada / warlords — use grudge6 race kits until dedicated loaders land
  try {
    return await loadGrudge6(hero);
  } catch (e) {
    console.warn("[heroesCrew] grudge6 load failed, blocky explorer", e);
    const app = getAppearance(hero.id);
    const blocky = createBlockyExplorer();
    const hM = applyExplorerAppearanceToRoot(blocky, app, 1.8);
    return { root: blocky, controller: null, pipeline: pipe, heightM: hM };
  }
}

/** Merge voxel + warlords rosters (player selections), max 4, prefer open/era selection order. */
export function pickCrewSlots(
  voxel: Character[],
  warlords: Character[],
  max = 4,
): Character[] {
  const byId = new Map<string, Character>();
  // Prefer voxel explorer era first (user request)
  for (const c of voxel) byId.set(String(c.id), c);
  for (const c of warlords) {
    if (!byId.has(String(c.id))) byId.set(String(c.id), c);
  }

  const selectedKeys: string[] = [];
  try {
    const byEra = JSON.parse(localStorage.getItem("grudge.selectedCharacterByEra") || "{}") as Record<
      string,
      string
    >;
    if (byEra.voxel) selectedKeys.push(String(byEra.voxel));
    if (byEra.warlords) selectedKeys.push(String(byEra.warlords));
    const open =
      localStorage.getItem("grudge.open.selectedCharacterId") ||
      localStorage.getItem("voxelrealms.selectedCharacterId");
    if (open) selectedKeys.unshift(String(open));
  } catch {
    /* ignore */
  }

  const out: Character[] = [];
  const seen = new Set<string>();
  for (const id of selectedKeys) {
    const c = byId.get(id);
    if (c && !seen.has(String(c.id))) {
      out.push(c);
      seen.add(String(c.id));
    }
    if (out.length >= max) return out;
  }
  for (const c of byId.values()) {
    if (seen.has(String(c.id))) continue;
    out.push(c);
    seen.add(String(c.id));
    if (out.length >= max) break;
  }
  return out;
}

export { heightMeters, getAppearance };
