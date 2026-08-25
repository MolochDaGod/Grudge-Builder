#!/usr/bin/env node
/**
 * Refuse `vercel --prod` from a dirty worktree.
 * Dirty CLI deploys have shipped WIP onto live aliases (gitDirty: 1).
 *
 *   node scripts/vercel-prod-guard.mjs
 *   node scripts/vercel-prod-guard.mjs --allow-dirty   # explicit override
 */
import { execSync } from "node:child_process";

const allowDirty = process.argv.includes("--allow-dirty");

function git(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

const branch = git("git rev-parse --abbrev-ref HEAD");
const dirty = git("git status --porcelain");

if (branch !== "main" && !allowDirty) {
  console.error(`[vercel-prod-guard] HEAD is ${branch}, not main. Use --allow-dirty only if you mean it.`);
  process.exit(1);
}

if (dirty && !allowDirty) {
  console.error("[vercel-prod-guard] Worktree is dirty. Commit or stash before production.");
  console.error(dirty.split("\n").slice(0, 20).join("\n"));
  process.exit(1);
}

console.log(`[vercel-prod-guard] ok branch=${branch} dirty=${dirty ? "yes" : "no"}`);
