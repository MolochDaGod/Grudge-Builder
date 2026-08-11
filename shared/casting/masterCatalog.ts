/**
 * Master casting catalog — merged LinearAbilityCasting + CastingAbilities.
 *
 * Linear skillshots (line/zone MOBA aim): ice · thunder · meteor · beam · snare · glacier
 * Path cast elements: fire · water · earth · wind
 * Product elements for weapon skills: ice · storm · fire · holy · arcane · nature
 *
 * SSOT for island3d CastingMaster, info.grudge-studio.com, weapon-skills DO.
 */

export const CASTING_MASTER_VERSION = "1.2.0";

/** Linear skillshot ids from LinearAbilityCastingThreeJS */
export const LINEAR_SKILLSHOTS = [
  "ice",
  "thunder",
  "meteor",
  "beam",
  "snare",
  "glacier",
] as const;
export type LinearSkillshotId = (typeof LINEAR_SKILLSHOTS)[number];

/** Path-cast ability pools from CastingAbilitiesThreeJS */
export const PATH_ELEMENTS = ["fire", "water", "earth", "wind"] as const;
export type PathElement = (typeof PATH_ELEMENTS)[number];

/** Product / catalog weapon-skill elements */
export const PRODUCT_ELEMENTS = [
  "ice",
  "storm",
  "fire",
  "holy",
  "arcane",
  "nature",
  "physical",
  "poison",
  "light",
] as const;
export type ProductElement = (typeof PRODUCT_ELEMENTS)[number];

/** Product element → linear skillshot (Linear learning map) */
export const PRODUCT_TO_LINEAR: Record<string, LinearSkillshotId | null> = {
  ice: "ice",
  storm: "thunder",
  fire: "meteor",
  holy: "beam",
  arcane: "snare",
  nature: "glacier",
  physical: null,
  poison: null,
  light: "beam",
  // aliases
  ice_shot: "ice",
  thunder: "thunder",
  meteor: "meteor",
  beam: "beam",
  snare: "snare",
  glacier: "glacier",
  lightning: "thunder",
  frost: "ice",
};

export type CastShape = "line" | "zone";

export const LINEAR_CAST_SHAPE: Record<LinearSkillshotId, CastShape> = {
  ice: "line",
  thunder: "line",
  meteor: "line",
  beam: "line",
  snare: "zone",
  glacier: "zone",
};

/** Sandbox hotkeys (Linear README Q/E/R/F/V + G glacier) */
export const LINEAR_HOTKEYS: Record<string, LinearSkillshotId> = {
  KeyQ: "ice",
  KeyE: "thunder",
  KeyR: "meteor",
  KeyF: "beam",
  KeyV: "snare",
  KeyG: "glacier",
};

export interface LinearShotMeta {
  id: LinearSkillshotId;
  name: string;
  shape: CastShape;
  productElements: string[];
  color: number;
  description: string;
  /** Phase style for GLSL materials */
  style: "frost" | "storm" | "meteor" | "beam" | "snare" | "glacier";
}

export const LINEAR_SHOT_META: Record<LinearSkillshotId, LinearShotMeta> = {
  ice: {
    id: "ice",
    name: "Frost Lance",
    shape: "line",
    productElements: ["ice", "frost"],
    color: 0x9fdcff,
    description:
      "Fracture front + ice crystal field (Linear Q). Procedural crystals, world-space fracture noise.",
    style: "frost",
  },
  thunder: {
    id: "thunder",
    name: "Storm Lance",
    shape: "line",
    productElements: ["storm", "lightning"],
    color: 0xa8d8ff,
    description:
      "Bolt + lightning filament ribbon, scorch decals (Linear E).",
    style: "storm",
  },
  meteor: {
    id: "meteor",
    name: "Cinder Fall",
    shape: "line",
    productElements: ["fire"],
    color: 0xff6a1e,
    description:
      "Lobbed meteor with lava seams + molten fissures on impact (Linear R).",
    style: "meteor",
  },
  beam: {
    id: "beam",
    name: "Nova Beam",
    shape: "line",
    productElements: ["holy", "light"],
    color: 0xfff2c0,
    description:
      "Sustained column — white core, cyan sheath, gold ribbons (Linear F).",
    style: "beam",
  },
  snare: {
    id: "snare",
    name: "Voltaic Snare",
    shape: "zone",
    productElements: ["arcane"],
    color: 0xb070ff,
    description:
      "Far-cast zone — violet column + rim arcs (Linear V).",
    style: "snare",
  },
  glacier: {
    id: "glacier",
    name: "Glacier Wall",
    shape: "zone",
    productElements: ["nature", "ice"],
    color: 0xb8e8ff,
    description: "Zone ice barrier / glacier field (Linear G).",
    style: "glacier",
  },
};

/** VFX catalog ids (vfxgrudge / Casting VfxDirector) */
export const MASTER_VFX_EFFECTS = [
  "ice_lightning_burst",
  "moon_beam",
  "frost_wave",
  "fire_aura",
  "earth_surge",
  "fireball",
  "inferno",
  "arcane_swirl",
  "getsuga_slash",
  "fire_hand",
  "staff_orb_stream",
  "freeze_nova",
  "water_bubble",
  "earth_rocks",
  "arrow_path",
  "arrow_loft",
] as const;

export type CastLayer =
  | "linear_line"
  | "linear_zone"
  | "path_ability"
  | "mesh_projectile"
  | "freeze_nova"
  | "earth_rocks"
  | "water_bubbles"
  | "arrow_path"
  | "arrow_loft"
  | "buff"
  | "spell_fx"
  | "supernova_impact";

export interface ElementalCastPlan {
  element: string;
  linearId: LinearSkillshotId | null;
  linearShape: CastShape | null;
  layers: CastLayer[];
  useLinear: boolean;
  usePathAbility: boolean;
  useMeshDelivery: boolean;
  useSpellFx: boolean;
  intensity: number;
  learn: string;
  vfxEffectId?: string;
}

export function normalizeElement(raw: string | undefined | null): string {
  const e = String(raw || "arcane").toLowerCase().trim();
  if (e === "lightning" || e === "electric") return "storm";
  if (e === "frost" || e === "cold") return "ice";
  if (e === "flame" || e === "lava") return "fire";
  if (e === "holy" || e === "light" || e === "radiant") return "holy";
  if (e === "nature" || e === "poison" || e === "earth") return e === "earth" ? "nature" : e;
  return e;
}

/**
 * Plan cast layers for a weapon skill / free cast.
 * Mastered rules from elementalLinearCast + Linear skillshots + island SpellFx.
 */
export function planMasterCast(
  skill: {
    id?: string;
    label?: string;
    element?: string;
    abilityElement?: string;
    pathMode?: string;
    skillKind?: string;
    isFocus?: boolean;
    isWard?: boolean;
    vfxEffectId?: string;
  },
  ctx: { focusCombat?: boolean; pathDrawn?: boolean; intensity?: number } = {},
): ElementalCastPlan {
  const element = normalizeElement(skill.element || skill.abilityElement);
  const linearId = (PRODUCT_TO_LINEAR[element] ?? null) as LinearSkillshotId | null;
  const linearShape = linearId ? LINEAR_CAST_SHAPE[linearId] : null;
  const intensity = Math.max(0.25, Math.min(2, ctx.intensity ?? 1));
  const blob = `${skill.id || ""} ${skill.label || ""}`.toLowerCase();
  const layers: CastLayer[] = [];

  if (skill.isFocus || skill.isWard || skill.skillKind === "buff") {
    return {
      element,
      linearId: null,
      linearShape: null,
      layers: ["buff", "spell_fx"],
      useLinear: false,
      usePathAbility: false,
      useMeshDelivery: false,
      useSpellFx: true,
      intensity,
      learn: "Buff/ward — cast tell + aura only",
      vfxEffectId: skill.vfxEffectId || "arcane_swirl",
    };
  }

  if (/freeze|nova|shatter/.test(blob)) {
    layers.push("freeze_nova", "spell_fx", "supernova_impact");
    return pack(element, linearId, linearShape, layers, {
      useLinear: false,
      usePathAbility: false,
      useMeshDelivery: true,
      useSpellFx: true,
      intensity,
      learn: "Freeze nova mesh + impact",
      vfxEffectId: skill.vfxEffectId || "frost_wave",
    });
  }

  if (/rock|boulder|earth surge/.test(blob)) {
    layers.push("earth_rocks", "spell_fx");
    return pack(element, linearId, linearShape, layers, {
      useLinear: false,
      usePathAbility: true,
      useMeshDelivery: true,
      useSpellFx: true,
      intensity,
      learn: "Earth rocks + path ability",
      vfxEffectId: skill.vfxEffectId || "earth_surge",
    });
  }

  if (ctx.pathDrawn || skill.pathMode === "stroke" || skill.pathMode === "wall") {
    layers.push("path_ability", "spell_fx");
    return pack(element, linearId, linearShape, layers, {
      useLinear: false,
      usePathAbility: true,
      useMeshDelivery: false,
      useSpellFx: true,
      intensity,
      learn: "Path-cast stroke (Fire/Water/Earth/Wind pool)",
      vfxEffectId: skill.vfxEffectId || "fire_aura",
    });
  }

  // Default combat: linear skillshot + mesh + spell fx + impact
  if (linearId) {
    layers.push(linearShape === "zone" ? "linear_zone" : "linear_line");
  }
  layers.push("mesh_projectile", "spell_fx", "supernova_impact");

  return pack(element, linearId, linearShape, layers, {
    useLinear: !!linearId,
    usePathAbility: false,
    useMeshDelivery: true,
    useSpellFx: true,
    intensity,
    learn: linearId
      ? `Linear ${linearId} (${linearShape}) + mesh delivery + impact`
      : "Mesh + spell FX only",
    vfxEffectId:
      skill.vfxEffectId ||
      (element === "fire"
        ? "fireball"
        : element === "ice"
          ? "frost_wave"
          : element === "storm"
            ? "ice_lightning_burst"
            : element === "holy"
              ? "moon_beam"
              : "arcane_swirl"),
  });
}

function pack(
  element: string,
  linearId: LinearSkillshotId | null,
  linearShape: CastShape | null,
  layers: CastLayer[],
  rest: Omit<
    ElementalCastPlan,
    "element" | "linearId" | "linearShape" | "layers"
  >,
): ElementalCastPlan {
  return { element, linearId, linearShape, layers, ...rest };
}

/** Three-layer (+ vegetation) terrain contract — Simon islands / Casting SSOT */
export const TERRAIN_LAYERS = {
  L0_HEIGHT: "L0_height",
  L1_SURFACE: "L1_surface",
  L2_VEGETATION: "L2_vegetation",
  L3_DETAIL: "L3_detail",
  WATER: "water",
} as const;

export const TERRAIN_RULES = [
  "One height function only — feet, mesh, grass, aim all sample L0",
  "L1 is visual surface on L0; water is sibling not L1",
  "L2 vegetation (grass/forest) samples L0 via heightSample callback",
  "SI: 1 unit = 1 m; human ~1.8 m",
  "Reference: simonstorlschulke threejs-examples scene=0 infinite terrain patterns",
] as const;

export function getMasterContract() {
  return {
    id: "grudge-casting-master",
    version: CASTING_MASTER_VERSION,
    sources: [
      "https://github.com/MolochDaGod/LinearAbiltyCastingThreeJS",
      "https://github.com/MolochDaGod/CastingAbilitiesThreeJS",
    ],
    terrainRef: "https://simonstorlschulke.github.io/threejs-examples/?scene=0",
    linear: LINEAR_SHOT_META,
    pathElements: PATH_ELEMENTS,
    productToLinear: PRODUCT_TO_LINEAR,
    vfxEffects: MASTER_VFX_EFFECTS,
    terrainLayers: TERRAIN_LAYERS,
    terrainRules: TERRAIN_RULES,
    glsl: {
      common: "island3d/casting/shaders/lib/common.glsl.js",
      noise: "island3d/casting/shaders/lib/noise.glsl.js",
    },
    hosts: {
      castingLab: "https://casting.grudge.studio",
      info: "https://info.grudge-studio.com",
      builder: "https://client.grudge-studio.com",
      animAi: "https://anim-ai-worker.grudge.workers.dev",
    },
  };
}
