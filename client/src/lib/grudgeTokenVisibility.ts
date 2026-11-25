/**
 * Routes where the floating Grudge token wallet FAB is hidden (auth / fullscreen).
 * Intentionally NOT hidden on /war-scene — siege is a first-class Grudge Studio game
 * surface and must show wallet (GBUX / cNFT / Treaty).
 */
const HIDDEN_EXACT = new Set([
  "/",
  "/intro",
  "/auth/callback",
  "/world",
  "/cloudfix",
  "/warlords",
]);

const HIDDEN_PREFIXES = [
  "/play",
  "/game/world",
  "/rts-grudge",
  "/sailing",
  "/island-3d",
  "/lava-caesar-lab",
  "/dock-raft-lab",
  "/editor",
  "/forge",
  "/scene",
  // Catalog / docs surfaces — no need for 3D wallet FAB noise
  "/asset-showcase",
  "/assets",
  "/showcase",
  "/systems",
];

/** Explicit show-list for game surfaces that need wallet (overrides future hide mistakes). */
const FORCE_SHOW = new Set(["/war-scene", "/medieval-battle", "/treaty"]);

export function shouldShowGrudgeToken(pathname: string): boolean {
  const path = pathname.split("?")[0] || pathname;
  if (FORCE_SHOW.has(path)) return true;
  if (HIDDEN_EXACT.has(path)) return false;
  return !HIDDEN_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}