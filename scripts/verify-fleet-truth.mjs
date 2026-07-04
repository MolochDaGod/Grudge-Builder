#!/usr/bin/env node
/**
 * ONE TRUTH verify — alias for probe-truth-fleet.ts (referenced by fleet-truth.json).
 *
 *   node scripts/verify-fleet-truth.mjs --mode cli
 *   node scripts/verify-fleet-truth.mjs --mode browser
 *   node scripts/verify-fleet-truth.mjs --mode cli --json
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const probeScript = path.join(ROOT, "probe-truth-fleet.ts");

const args = process.argv.slice(2);
const modeIdx = args.indexOf("--mode");
const mode = modeIdx >= 0 ? args[modeIdx + 1] : "cli";
const passthrough = args.filter((a, i) => {
  if (a === "--mode") return false;
  if (modeIdx >= 0 && i === modeIdx + 1) return false;
  return true;
});

const probeArgs = ["scripts/probe-truth-fleet.ts", ...passthrough];
if (mode === "browser") {
  probeArgs.push("--base", "https://client.grudge-studio.com");
}

const r = spawnSync("npx", ["tsx", ...probeArgs], {
  cwd: path.join(ROOT, ".."),
  stdio: "inherit",
  shell: true,
});

process.exit(r.status ?? 1);