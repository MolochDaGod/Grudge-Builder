#!/usr/bin/env node
/**
 * Upsert Crossmint env into local secret files + Railway grudge-api.
 * Never logs secret values — only key names and lengths.
 *
 * Usage: node scripts/upsert-crossmint-secrets.mjs
 * Secrets are read from process.env or from the map in this file's CLI args via stdin JSON.
 *
 * Prefer: CROSSMINT_JSON='{"CROSSMINT_SERVER_API_KEY":"..."}' node scripts/upsert-crossmint-secrets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const secretnow = path.join(process.env.USERPROFILE || "", "Desktop", "secretnow.txt");
const envPath = path.join(root, ".env");

/** Public SSOT IDs (safe to hardcode) + keys that must come from env/stdin */
const PUBLIC = {
  CROSSMINT_PROJECT_ID: "8410e23e-d003-4061-9b65-7c886a6c46ec",
  CROSSMINT_COLLECTION_ID: "5061318d-ff65-4893-ac4b-9b28efb18ace",
  CROSSMINT_CHARACTER_TEMPLATE_ID: "a9bb2c8d-1350-4413-aec7-5ba1f6888511",
  CROSSMINT_ISLAND_COLLECTION_ID: "18d0e641-8713-4d5b-9a1d-ba67c516a3ce",
  VITE_CROSSMINT_PROJECT_ID: "8410e23e-d003-4061-9b65-7c886a6c46ec",
  VITE_CROSSMINT_CHARACTER_COLLECTION: "5061318d-ff65-4893-ac4b-9b28efb18ace",
  VITE_CROSSMINT_ISLAND_COLLECTION: "18d0e641-8713-4d5b-9a1d-ba67c516a3ce",
  VITE_CROSSMINT_ENV: "production",
};

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function upsertEnvFile(filePath, pairs) {
  let text = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  if (text && !text.endsWith("\n")) text += "\n";
  for (const [k, v] of Object.entries(pairs)) {
    if (v == null || v === "") continue;
    const line = `${k}=${v}`;
    const re = new RegExp(`^${k}=.*$`, "m");
    if (re.test(text)) text = text.replace(re, line);
    else text += `${line}\n`;
  }
  fs.writeFileSync(filePath, text, "utf8");
}

// Merge: stdin JSON (optional) + process.env overrides for secrets
let fromStdin = {};
if (process.env.CROSSMINT_JSON) {
  try {
    fromStdin = JSON.parse(process.env.CROSSMINT_JSON);
  } catch {
    console.error("BAD CROSSMINT_JSON");
    process.exit(1);
  }
}

const secrets = {
  CROSSMINT_SERVER_API_KEY:
    fromStdin.CROSSMINT_SERVER_API_KEY || process.env.CROSSMINT_SERVER_API_KEY || "",
  VITE_CROSSMINT_CLIENT_KEY:
    fromStdin.VITE_CROSSMINT_CLIENT_KEY || process.env.VITE_CROSSMINT_CLIENT_KEY || "",
  CROSSMINT_WEBHOOK_SECRET:
    fromStdin.CROSSMINT_WEBHOOK_SECRET ||
    process.env.CROSSMINT_WEBHOOK_SECRET ||
    parseEnvFile(secretnow).CROSSMINT_WEBHOOK_SECRET ||
    parseEnvFile(envPath).CROSSMINT_WEBHOOK_SECRET ||
    "",
  AI_AGENT_WALLET:
    fromStdin.AI_AGENT_WALLET ||
    process.env.AI_AGENT_WALLET ||
    parseEnvFile(secretnow).AI_AGENT_WALLET ||
    parseEnvFile(envPath).AI_AGENT_WALLET ||
    "",
};

const all = { ...PUBLIC, ...secrets };
// Drop empty secrets so we don't wipe existing
for (const k of Object.keys(all)) {
  if (all[k] === "") delete all[k];
}

upsertEnvFile(envPath, all);
if (fs.existsSync(path.dirname(secretnow))) upsertEnvFile(secretnow, all);

console.log("LOCAL upserted keys:");
for (const k of Object.keys(all).sort()) {
  console.log(`  ${k} len=${String(all[k]).length}`);
}

// Railway: server-side only (never VITE_*)
const railwayKeys = [
  "CROSSMINT_SERVER_API_KEY",
  "CROSSMINT_PROJECT_ID",
  "CROSSMINT_COLLECTION_ID",
  "CROSSMINT_CHARACTER_TEMPLATE_ID",
  "CROSSMINT_ISLAND_COLLECTION_ID",
  "CROSSMINT_WEBHOOK_SECRET",
  "AI_AGENT_WALLET",
];

let ok = 0;
let fail = 0;
for (const k of railwayKeys) {
  const v = all[k];
  if (!v) {
    console.log("RAILWAY skip (empty)", k);
    continue;
  }
  try {
    execSync(`railway variable set ${JSON.stringify(`${k}=${v}`)} -s grudge-api --skip-deploys`, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
      cwd: root,
    });
    console.log("RAILWAY SET", k, "len=" + String(v).length);
    ok++;
  } catch (e) {
    console.log("RAILWAY FAIL", k, String(e.stderr || e.message || "").slice(0, 120));
    fail++;
  }
}
try {
  execSync(
    `railway variable set ${JSON.stringify(`CROSSMINT_SSOT_STAMP=${new Date().toISOString()}`)} -s grudge-api`,
    { stdio: ["ignore", "pipe", "pipe"], shell: true, cwd: root },
  );
  console.log("RAILWAY deploy stamp set");
} catch {
  console.log("RAILWAY stamp fail");
}
console.log(JSON.stringify({ ok, fail }));
