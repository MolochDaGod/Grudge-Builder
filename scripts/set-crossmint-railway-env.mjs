#!/usr/bin/env node
/**
 * Push Crossmint Warlords cNFT SSOT env vars to Railway grudge-api.
 * Reads secrets from local .env / Desktop secretnow.txt — never prints secret values.
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseEnv(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
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

const env = {
  ...parseEnv(path.join(process.env.USERPROFILE || "", "Desktop", "secretnow.txt")),
  ...parseEnv(path.join(root, ".env")),
};

const sets = {
  CROSSMINT_COLLECTION_ID: "5061318d-ff65-4893-ac4b-9b28efb18ace",
  CROSSMINT_CHARACTER_TEMPLATE_ID: "a9bb2c8d-1350-4413-aec7-5ba1f6888511",
  CROSSMINT_PROJECT_ID:
    env.CROSSMINT_PROJECT_ID || "8410e23e-d003-4061-9b65-7c886a6c46ec",
};

for (const k of [
  "CROSSMINT_SERVER_API_KEY",
  "CROSSMINT_WEBHOOK_SECRET",
  "AI_AGENT_WALLET",
  "OPENAI_API_KEY",
]) {
  if (env[k]) sets[k] = env[k];
  else console.log("LOCAL_MISS", k);
}

let ok = 0;
let fail = 0;
for (const [k, v] of Object.entries(sets)) {
  if (!v) {
    console.log("SKIP empty", k);
    continue;
  }
  try {
    execSync(`railway variable set ${JSON.stringify(`${k}=${v}`)} -s grudge-api --skip-deploys`, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
      cwd: root,
    });
    console.log("SET", k, "len=" + String(v).length);
    ok++;
  } catch (e) {
    const err = (e.stderr || e.stdout || e.message || "").toString().slice(0, 240);
    console.log("FAIL", k, err);
    fail++;
  }
}

// Trigger one deploy by setting a harmless stamp without skip
try {
  execSync(
    `railway variable set ${JSON.stringify(`CROSSMINT_SSOT_STAMP=${new Date().toISOString().slice(0, 10)}`)} -s grudge-api`,
    { stdio: ["ignore", "pipe", "pipe"], shell: true, cwd: root },
  );
  console.log("DEPLOY_TRIGGER stamp set");
} catch (e) {
  console.log("DEPLOY_TRIGGER fail", (e.message || "").slice(0, 120));
}

console.log(JSON.stringify({ ok, fail }));
