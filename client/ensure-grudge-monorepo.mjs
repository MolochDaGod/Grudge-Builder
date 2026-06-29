/**
 * Ensures grudge-character-animator is available for native /world compilation.
 * Local dev: uses ../../repos/grudge-character-animator or GRUDGE_MONOREPO_ROOT.
 * Vercel CI: shallow-clones into vendor/grudge-character-animator when missing.
 *
 * Lives under client/ (not scripts/) so Vercel uploads it — scripts/ is vercelignored.
 */
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const marker = (root) =>
  resolve(root, "artifacts/grudge-game/src/pages/world/WorldPage.tsx");

const candidates = [
  process.env.GRUDGE_MONOREPO_ROOT,
  resolve(repoRoot, "../../repos/grudge-character-animator"),
  resolve(repoRoot, "vendor/grudge-character-animator"),
].filter(Boolean);

let monorepoRoot = candidates.find((p) => existsSync(marker(p)));

if (!monorepoRoot) {
  const vendorPath = resolve(repoRoot, "vendor/grudge-character-animator");
  const token =
    process.env.GRUDGE_MONOREPO_GIT_TOKEN || process.env.GITHUB_TOKEN || "";
  const repoUrl = token
    ? `https://x-access-token:${token}@github.com/MolochDaGod/grudge-character-animator.git`
    : "https://github.com/MolochDaGod/grudge-character-animator.git";
  console.log("[ensure-grudge-monorepo] Cloning into", vendorPath);
  execSync(`git clone --depth 1 "${repoUrl}" "${vendorPath}"`, {
    stdio: "inherit",
  });
  monorepoRoot = existsSync(marker(vendorPath)) ? vendorPath : null;
}

if (!monorepoRoot) {
  console.error(
    "[ensure-grudge-monorepo] grudge-character-animator not found. Set GRUDGE_MONOREPO_ROOT.",
  );
  process.exit(1);
}

console.log("[ensure-grudge-monorepo]", monorepoRoot);