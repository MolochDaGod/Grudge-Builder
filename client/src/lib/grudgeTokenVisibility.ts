/** Routes where the floating Grudge token wallet FAB is hidden (auth / fullscreen). */
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
  "/editor",
  "/forge",
  "/scene",
];

export function shouldShowGrudgeToken(pathname: string): boolean {
  if (HIDDEN_EXACT.has(pathname)) return false;
  return !HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}