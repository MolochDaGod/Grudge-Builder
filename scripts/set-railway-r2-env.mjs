#!/usr/bin/env node
/**
 * Push R2/S3 object storage env vars to linked Railway service (from local .env).
 * Does not print secret values.
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
if (!fs.existsSync(envPath)) {
  console.error("Missing .env");
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const map = {
  R2_S3_ENDPOINT: env.R2_S3_ENDPOINT,
  R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID || env.OBJECT_STORAGE_KEY,
  R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY || env.OBJECT_STORAGE_SECRET,
  OBJECT_STORAGE_BUCKET: env.OBJECT_STORAGE_BUCKET || env.R2_BUCKET_ASSETS || "grudge-assets",
  OBJECT_STORAGE_PUBLIC_URL: env.OBJECT_STORAGE_PUBLIC_URL || "https://assets.grudge-studio.com",
  OBJECT_STORAGE_REGION: env.OBJECT_STORAGE_REGION || "auto",
  R2_BUCKET_ASSETS: env.R2_BUCKET_ASSETS || env.OBJECT_STORAGE_BUCKET || "grudge-assets",
  // Optional GCS-style dir used by /api/objectstore/list
  PRIVATE_OBJECT_DIR: env.PRIVATE_OBJECT_DIR || `/${env.OBJECT_STORAGE_BUCKET || "grudge-assets"}`,
};

let ok = 0;
for (const [k, v] of Object.entries(map)) {
  if (!v) {
    console.log("SKIP", k, "(empty)");
    continue;
  }
  try {
    // railway variables --set KEY=VALUE
    execSync(`railway variables --set "${k}=${v.replace(/"/g, '\\"')}"`, {
      cwd: root,
      stdio: "pipe",
      encoding: "utf8",
    });
    console.log("SET", k, `(${String(v).length} chars)`);
    ok++;
  } catch (e) {
    const msg = e?.stderr || e?.message || String(e);
    console.log("FAIL", k, String(msg).slice(0, 200));
  }
}
console.log(`Done: ${ok}/${Object.keys(map).length}`);
