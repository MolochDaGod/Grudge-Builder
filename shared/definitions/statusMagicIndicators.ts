/**
 * Status → magic orb indicator mapping (status-magic pack).
 * Thumbs baked client-side in magicIndicatorThumbs when GLBs are available.
 */

export type MagicIndicatorId =
  | "arcane"
  | "command"
  | "magnetic"
  | "kinetic"
  | "chemical"
  | "dark"
  | "blood"
  | "binding"
  | "atomic"
  | "primordial";

export interface MagicIndicatorDef {
  id: MagicIndicatorId;
  label: string;
  color: string;
  emoji: string;
  polarity: "buff" | "debuff" | "neutral";
  /** Optional CDN GLB path under assets/ */
  glbPath?: string;
}

export const MAGIC_INDICATORS: Record<MagicIndicatorId, MagicIndicatorDef> = {
  arcane: { id: "arcane", label: "Arcane", color: "#818cf8", emoji: "✨", polarity: "buff" },
  command: { id: "command", label: "Command", color: "#fbbf24", emoji: "👑", polarity: "buff" },
  magnetic: { id: "magnetic", label: "Magnetic", color: "#22d3ee", emoji: "🧲", polarity: "neutral" },
  kinetic: { id: "kinetic", label: "Kinetic", color: "#fb923c", emoji: "💨", polarity: "buff" },
  chemical: { id: "chemical", label: "Chemical", color: "#a3e635", emoji: "🧪", polarity: "debuff" },
  dark: { id: "dark", label: "Dark", color: "#a855f7", emoji: "🌑", polarity: "debuff" },
  blood: { id: "blood", label: "Blood", color: "#ef4444", emoji: "🩸", polarity: "debuff" },
  binding: { id: "binding", label: "Binding", color: "#94a3b8", emoji: "⛓", polarity: "debuff" },
  atomic: { id: "atomic", label: "Atomic", color: "#facc15", emoji: "⚛", polarity: "neutral" },
  primordial: { id: "primordial", label: "Primordial", color: "#34d399", emoji: "🌿", polarity: "buff" },
};

const STATUS_TO_INDICATOR: Record<string, MagicIndicatorId> = {
  burn: "chemical",
  poison: "chemical",
  bleed: "blood",
  stun: "binding",
  root: "binding",
  slow: "magnetic",
  freeze: "magnetic",
  haste: "kinetic",
  rage: "blood",
  shield: "command",
  regen: "primordial",
  heal_over_time: "primordial",
  mana_regen: "arcane",
  stealth: "dark",
  fear: "dark",
  silence: "binding",
  empowered: "atomic",
  weak: "chemical",
};

export function resolveMagicIndicator(
  statusId: string,
  hints?: { polarity?: "buff" | "debuff" | "neutral"; category?: string },
): MagicIndicatorDef | null {
  const key = (statusId || "").toLowerCase();
  const mapped = STATUS_TO_INDICATOR[key];
  if (mapped) return MAGIC_INDICATORS[mapped];

  // Fuzzy
  if (/burn|poison|acid|toxic/.test(key)) return MAGIC_INDICATORS.chemical;
  if (/bleed|blood|hemorr/.test(key)) return MAGIC_INDICATORS.blood;
  if (/stun|root|bind|silence|immobil/.test(key)) return MAGIC_INDICATORS.binding;
  if (/haste|speed|kinetic|dash/.test(key)) return MAGIC_INDICATORS.kinetic;
  if (/shield|armor|command|leader/.test(key)) return MAGIC_INDICATORS.command;
  if (/heal|regen|nature|hot/.test(key)) return MAGIC_INDICATORS.primordial;
  if (/arcane|mana|magic/.test(key)) return MAGIC_INDICATORS.arcane;
  if (/dark|shadow|fear|void/.test(key)) return MAGIC_INDICATORS.dark;
  if (/slow|freeze|ice|frost|pull/.test(key)) return MAGIC_INDICATORS.magnetic;

  if (hints?.polarity === "debuff") return MAGIC_INDICATORS.dark;
  if (hints?.polarity === "buff") return MAGIC_INDICATORS.arcane;
  return MAGIC_INDICATORS.atomic;
}
