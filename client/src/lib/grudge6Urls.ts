/**
 * Canonical Grudge6 playground URLs (grudge6.grudge-studio.com).
 */
import { GRUDGE6_GAME_URL } from "@/lib/grudgeConfig";

export type Grudge6RouteKey =
  | "home"
  | "panel"
  | "spellbook"
  | "hud"
  | "inventory"
  | "foundry"
  | "world";

const ROUTE_SUFFIX: Record<Grudge6RouteKey, string> = {
  home: "",
  panel: "/panel",
  spellbook: "/spellbook",
  hud: "/hud",
  inventory: "/inventory",
  foundry: "/foundry",
  world: "/world",
};

export function grudge6Url(route: Grudge6RouteKey = "home"): string {
  const base = GRUDGE6_GAME_URL.replace(/\/$/, "");
  const suffix = ROUTE_SUFFIX[route] ?? "";
  return `${base}${suffix}`;
}