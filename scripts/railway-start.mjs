#!/usr/bin/env node
/**
 * Railway / production entrypoint: migrate schema, then start the API.
 * Used by railway.json, nixpacks.toml, and package.json start:production.
 */
import { spawn } from "node:child_process";

const node = process.execPath;
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, label, { shell = false } = {}) {
  return new Promise((resolve, reject) => {
    console.log(`[railway-start] ${label}`);
    const child = spawn(command, args, { stdio: "inherit", shell, env: process.env, windowsHide: true });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed (code=${code ?? "null"}, signal=${signal ?? "null"})`));
    });
  });
}

try {
  await run(npmCmd, ["run", "db:push"], "npm run db:push", { shell: process.platform === "win32" });
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