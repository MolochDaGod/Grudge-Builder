/**
 * Copy static public assets into client/dist after Vite bundle.
 *
 * SSOT order (client wins):
 *   1. repo-root `public/`  — skill-tree, icons-src, legacy shells
 *   2. `client/public/`     — SPA SSOT (auth scripts, cinema, audio, favicons)
 *
 * Binary GLB/FBX for games live on Cloudflare R2 (assets.grudge-studio.com),
 * not in these trees (see .gitignore / .vercelignore).
 */
import { cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dir, "..");
const distDir = path.join(repoRoot, "client", "dist");

const TRANSIENT = new Set(["EBUSY", "ENOENT", "EPERM", "EACCES", "ENOTEMPTY"]);

async function copyDirSafe(src, dest, retries = 6) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await cp(src, dest, { recursive: true, dereference: true, force: true });
      return;
    } catch (e) {
      if (!TRANSIENT.has(e?.code) || attempt === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
}

// Root first, then client/public overwrites so SPA SSOT always wins
const sources = [
  path.join(repoRoot, "public"),
  path.join(repoRoot, "client", "public"),
].filter((p) => existsSync(p));

if (!existsSync(distDir)) {
  console.error("copy-public-to-dist: client/dist missing — run Vite build first");
  process.exit(1);
}

for (const src of sources) {
  console.log(`copying ${path.relative(repoRoot, src)} → client/dist ...`);
  await copyDirSafe(src, distDir);
}

console.log("public assets copied to client/dist (client/public SSOT last)");