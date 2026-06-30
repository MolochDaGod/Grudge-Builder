/**
 * Ensures grudge-character-animator is available for native /world compilation.
 * Local dev: uses ../../repos/grudge-character-animator or GRUDGE_MONOREPO_ROOT.
 * Vercel CI: fetches tarball or shallow-clones into vendor/grudge-character-animator.
 *
 * Lives under client/ (not scripts/) so Vercel uploads it — scripts/ is vercelignored.
 */
import {
  existsSync,
  rmSync,
  readdirSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_REPO =
  "https://github.com/MolochDaGod/grudge-character-animator.git";
const TARBALL_API =
  "https://api.github.com/repos/MolochDaGod/grudge-character-animator/tarball/main";
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

/** Tokens that can read the private monorepo (never use bare git + Vercel GITHUB_TOKEN). */
function authTokens() {
  const tokens = [
    process.env.GRUDGE_MONOREPO_GIT_TOKEN?.trim(),
    process.env.GITHUB_TOKEN?.trim(),
  ].filter(Boolean);
  return [...new Set(tokens)];
}

/** Git env without GITHUB_TOKEN so `git clone https://github.com/...` stays anonymous. */
function gitEnv() {
  const { GITHUB_TOKEN: _drop, ...rest } = process.env;
  return { ...rest, GIT_LFS_SKIP_SMUDGE: "1" };
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
    "[ensure-grudge-monorepo] git clone",
    repoUrl.replace(/x-access-token:[^@]+@/, "x-access-token:***@"),
  );
  const result = spawnSync(
    "git",
    [...gitNoLfs, "clone", "--depth", "1", repoUrl, vendorPath],
    { stdio: "inherit", env: gitEnv() },
  );
  return result.status === 0;
}

async function fetchTarball(token, vendorPath) {
  if (existsSync(vendorPath)) {
    rmSync(vendorPath, { recursive: true, force: true });
  }
  console.log("[ensure-grudge-monorepo] fetching GitHub tarball");
  const res = await fetch(TARBALL_API, {
    headers: {
      "User-Agent": "grudge-builder-ensure-monorepo",
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    redirect: "follow",
  });
  if (!res.ok) {
    console.warn(`[ensure-grudge-monorepo] tarball HTTP ${res.status}`);
    return false;
  }

  const tmp = mkdtempSync(join(tmpdir(), "grudge-vendor-"));
  const tarPath = join(tmp, "repo.tar.gz");
  writeFileSync(tarPath, Buffer.from(await res.arrayBuffer()));

  const extract = spawnSync("tar", ["-xzf", tarPath, "-C", tmp], {
    stdio: "inherit",
  });
  if (extract.status !== 0) return false;

  const extracted = readdirSync(tmp).find((d) =>
    d.startsWith("MolochDaGod-grudge-character-animator"),
  );
  if (!extracted) return false;

  renameSync(join(tmp, extracted), vendorPath);
  rmSync(tmp, { recursive: true, force: true });
  return existsSync(marker(vendorPath));
}

async function vendorMonorepo() {
  const vendorPath = resolve(repoRoot, "vendor/grudge-character-animator");
  const tokens = authTokens();

  for (const token of tokens) {
    if (await fetchTarball(token, vendorPath)) return vendorPath;
  }

  const cloneUrls = [
    ...tokens.map(
      (t) =>
        `https://x-access-token:${t}@github.com/MolochDaGod/grudge-character-animator.git`,
    ),
    PUBLIC_REPO,
  ];

  for (const repoUrl of cloneUrls) {
    if (!gitClone(repoUrl, vendorPath)) continue;
    if (existsSync(marker(vendorPath))) return vendorPath;
    rmSync(vendorPath, { recursive: true, force: true });
  }

  return null;
}

if (!monorepoRoot) {
  monorepoRoot = await vendorMonorepo();
}

if (!monorepoRoot) {
  const msg =
    "[ensure-grudge-monorepo] Vendor missing — native /world and /cloudfix need grudge-character-animator.";
  if (process.env.GRUDGE_REQUIRE_MONOREPO === "1") {
    console.error(msg);
    console.error(
      "Add GRUDGE_MONOREPO_GIT_TOKEN (GitHub PAT with repo read) to Vercel Production env, or make the monorepo public.",
    );
    process.exit(1);
  }
  console.warn(`${msg} Vite will use stubs.`);
  process.exit(0);
}

console.log("[ensure-grudge-monorepo]", monorepoRoot);