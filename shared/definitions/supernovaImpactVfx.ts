/**
 * Supernova impact VFX catalog — color variants for spell/weapon hits.
 * Full mesh packs load from R2 when present; runtime falls back to pulse.
 */

export type SupernovaImpactVariant = "original" | "blue" | "purple" | "yellow";

export interface SupernovaVariantDef {
  id: SupernovaImpactVariant;
  label: string;
  hex: number;
  schools?: string[];
  damageTypes?: string[];
}

export const SUPERNOVA_VARIANTS: Record<SupernovaImpactVariant, SupernovaVariantDef> = {
  original: {
    id: "original",
    label: "Solar",
    hex: 0xff8833,
    schools: ["fire", "physical"],
    damageTypes: ["fire", "physical", "slash", "blunt"],
  },
  blue: {
    id: "blue",
    label: "Frost Arcane",
    hex: 0x38bdf8,
    schools: ["frost", "ice", "arcane", "water"],
    damageTypes: ["frost", "ice", "cold", "arcane"],
  },
  purple: {
    id: "purple",
    label: "Shadow Void",
    hex: 0xa855f7,
    schools: ["shadow", "void", "dark", "necrotic"],
    damageTypes: ["shadow", "void", "dark", "necrotic", "poison"],
  },
  yellow: {
    id: "yellow",
    label: "Holy Lightning",
    hex: 0xfacc15,
    schools: ["holy", "light", "lightning", "nature"],
    damageTypes: ["holy", "lightning", "electric", "nature"],
  },
};

export function resolveSupernovaVariant(opts?: {
  variant?: SupernovaImpactVariant;
  school?: string;
  damageType?: string;
  vfxKey?: string;
}): SupernovaImpactVariant {
  if (opts?.variant && SUPERNOVA_VARIANTS[opts.variant]) return opts.variant;

  const school = (opts?.school ?? "").toLowerCase();
  const dmg = (opts?.damageType ?? "").toLowerCase();
  const key = (opts?.vfxKey ?? "").toLowerCase();
  const hay = `${school} ${dmg} ${key}`;

  for (const [id, def] of Object.entries(SUPERNOVA_VARIANTS) as [
    SupernovaImpactVariant,
    SupernovaVariantDef,
  ][]) {
    if (id === "original") continue;
    const hits = [
      ...(def.schools ?? []),
      ...(def.damageTypes ?? []),
    ].some((t) => hay.includes(t));
    if (hits) return id;
  }
  return "original";
}
