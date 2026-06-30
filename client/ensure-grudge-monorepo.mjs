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

if (!monorepoRoot && process.env.GRUDGE_SKIP_MONOREPO_CLONE === "1") {
  console.warn(
    "[ensure-grudge-monorepo] GRUDGE_SKIP_MONOREPO_CLONE set — using Vite stubs.",
  );
  process.exit(0);
}

if (!monorepoRoot) {
  const vendorPath = resolve(repoRoot, "vendor/grudge-character-animator");
  const token =
    process.env.GRUDGE_MONOREPO_GIT_TOKEN || process.env.GITHUB_TOKEN || "";
  const repoUrl = token
    ? `https://x-access-token:${token}@github.com/MolochDaGod/grudge-character-animator.git`
    : "https://github.com/MolochDaGod/grudge-character-animator.git";
  console.log("[ensure-grudge-monorepo] Cloning into", vendorPath);
  const gitNoLfs = [
    "-c", "filter.lfs.process=",
    "-c", "filter.lfs.smudge=",
    "-c", "filter.lfs.clean=",
    "-c", "filter.lfs.required=false",
  ];
  try {
    execSync(
      ["git", ...gitNoLfs, "clone", "--depth", "1", repoUrl, vendorPath].join(" "),
      {
        stdio: "inherit",
        env: { ...process.env, GIT_LFS_SKIP_SMUDGE: "1" },
      },
    );
    monorepoRoot = existsSync(marker(vendorPath)) ? vendorPath : null;
  } catch (err) {
    console.warn(
      "[ensure-grudge-monorepo] Clone failed — continuing without native /world:",
      err?.message ?? err,
    );
  }
}

if (!monorepoRoot) {
  console.warn(
    "[ensure-grudge-monorepo] Vendor missing. Vite will use stubs; GCS redirects still deploy.",
  );
  process.exit(0);
}

console.log("[ensure-grudge-monorepo]", monorepoRoot);