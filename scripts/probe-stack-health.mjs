#!/usr/bin/env node
/**
 * Unified stack health: fleet truth + best-practice audit + optional auth.
 *
 *   node scripts/probe-stack-health.mjs
 *   node scripts/probe-stack-health.mjs --auth
 *   node scripts/probe-stack-health.mjs --json
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const withAuth = argv.includes("--auth");
const asJson = argv.includes("--json");

function run(cmd, args, label) {
  console.log(`\n══ ${label} ══`);
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit", shell: true });
  return r.status ?? 1;
}

let code = 0;

code |= run("node", ["scripts/verify-fleet-truth.mjs", "--mode", "cli"], "Fleet truth (ONE TRUTH)");
code |= run(
  "node",
  ["scripts/best-practices/check-node-three-react.mjs", ...(asJson ? ["--json"] : [])],
  "Node / Three / React best practices",
);
code |= run(
  "node",
  ["scripts/best-practices/download-engine-pins.mjs", "--fleet"],
  "Engine pins + CDN + fleet snapshot",
);

if (withAuth) {
  code |= run("npx", ["tsx", "scripts/probe-fleet-auth.ts"], "Fleet auth probe");
}

console.log(code === 0 ? "\n✓ stack probe OK\n" : `\n✗ stack probe exited ${code}\n`);
process.exit(code === 0 ? 0 : 1);
