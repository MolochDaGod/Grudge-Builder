/**
 * Copy static public assets into client/dist after Vite bundle.
 * Decoupled from Vite prepare-out-dir to avoid Windows EBUSY during copyPublicDir.
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

const sources = [
  path.join(repoRoot, "client", "public"),
  path.join(repoRoot, "public"),
].filter((p) => existsSync(p));

if (!existsSync(distDir)) {
  console.error("copy-public-to-dist: client/dist missing — run Vite build first");
  process.exit(1);
}

for (const src of sources) {
  console.log(`copying ${path.relative(repoRoot, src)} → client/dist ...`);
  await copyDirSafe(src, distDir);
}

console.log("public assets copied to client/dist");