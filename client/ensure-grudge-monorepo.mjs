/**
 * Ensures grudge-character-animator is available for native /world compilation.
 * Local dev: uses ../../repos/grudge-character-animator or GRUDGE_MONOREPO_ROOT.
 * Vercel CI: shallow-clones into vendor/grudge-character-animator when missing.
 *
 * Lives under client/ (not scripts/) so Vercel uploads it — scripts/ is vercelignored.
 *
 * NOTE: Do not use process.env.GITHUB_TOKEN for cross-repo clones. Vercel Git
 * deployments inject a limited integration token that fails on other repos and
 * blocks the public HTTPS clone. Use GRUDGE_MONOREPO_GIT_TOKEN only when the
 * monorepo is private.
 */
import { existsSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_REPO =
  "https://github.com/MolochDaGod/grudge-character-animator.git";
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

function gitClone(repoUrl, vendorPath) {
  if (existsSync(vendorPath)) {
    rmSync(vendorPath, { recursive: true, force: true });
  }
  const gitNoLfs = [
    "-c",
    "filter.lfs.process=",
    "-c",
    "filter.lfs.smudge=",
    "-c",
    "filter.lfs.clean=",
    "-c",
    "filter.lfs.required=false",
  ];
  console.log(
    "[ensure-grudge-monorepo] Cloning",
    repoUrl.replace(/x-access-token:[^@]+@/, "x-access-token:***@"),
  );
  const result = spawnSync(
    "git",
    [...gitNoLfs, "clone", "--depth", "1", repoUrl, vendorPath],
    {
      stdio: "inherit",
      env: { ...process.env, GIT_LFS_SKIP_SMUDGE: "1" },
    },
  );
  return result.status === 0;
}

if (!monorepoRoot) {
  const vendorPath = resolve(repoRoot, "vendor/grudge-character-animator");
  const cloneUrls = [PUBLIC_REPO];
  const privateToken = process.env.GRUDGE_MONOREPO_GIT_TOKEN?.trim();
  if (privateToken) {
    cloneUrls.push(
      `https://x-access-token:${privateToken}@github.com/MolochDaGod/grudge-character-animator.git`,
    );
  }

  for (const repoUrl of cloneUrls) {
    if (!gitClone(repoUrl, vendorPath)) continue;
    if (existsSync(marker(vendorPath))) {
      monorepoRoot = vendorPath;
      break;
    }
    rmSync(vendorPath, { recursive: true, force: true });
  }
}

if (!monorepoRoot) {
  const msg =
    "[ensure-grudge-monorepo] Vendor missing — native /world and /cloudfix need grudge-character-animator.";
  if (process.env.GRUDGE_REQUIRE_MONOREPO === "1") {
    console.error(msg);
    process.exit(1);
  }
  console.warn(
    `${msg} Vite will use stubs; set GRUDGE_MONOREPO_GIT_TOKEN if the repo is private.`,
  );
  process.exit(0);
}

console.log("[ensure-grudge-monorepo]", monorepoRoot);