#!/usr/bin/env node
/**
 * Railway / production entrypoint: migrate schema, then start the API.
 * Used by railway.json, nixpacks.toml, and package.json start:production.
 */
import { spawn } from "node:child_process";

const node = process.execPath;

function run(command, args, label) {
  return new Promise((resolve, reject) => {
    console.log(`[railway-start] ${label}`);
    const child = spawn(command, args, { stdio: "inherit", shell: false, env: process.env });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed (code=${code ?? "null"}, signal=${signal ?? "null"})`));
    });
  });
}

try {
  await run("npm", ["run", "db:push"], "npm run db:push");
} catch (err) {
  console.error("[railway-start] Schema push failed:", err.message);
  process.exit(1);
}

console.log("[railway-start] Starting dist/index.js");
const api = spawn(node, ["dist/index.js"], { stdio: "inherit", env: process.env });
api.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
api.on("error", (err) => {
  console.error("[railway-start] API process error:", err);
  process.exit(1);
});