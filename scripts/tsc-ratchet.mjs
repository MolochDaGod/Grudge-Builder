#!/usr/bin/env node
/**
 * tsc-ratchet.mjs
 *
 * Compare `tsc --noEmit` output to the checked-in baseline (.tsc-baseline.json).
 *
 * Keys are file + TS error code + normalized message. Line and column numbers
 * are never part of a key, so moving a line does not hide or invent an error.
 * Each key stores a count.
 *
 * Default (CI):
 *   node scripts/tsc-ratchet.mjs
 * Fails if:
 *   - a key's count is higher than the baseline, or a key is not in the baseline
 *   - the baseline is stale: a key's current count is lower than the baseline
 *     (including keys that disappeared). That forces the shrink to be committed.
 * This mode never writes the baseline.
 *
 * Regenerate the baseline (local only; CI must not run this):
 *   npm run tsc:baseline
 *   node scripts/tsc-ratchet.mjs --write
 *
 * Regeneration is downward only. The write command refuses to add keys or
 * raise a key's count. After you fix errors, rerun it and commit the smaller
 * file. Use --force only if a compiler upgrade rewords messages; never use it
 * to accept new errors.
 *
 * --from-file <path> reads a saved `tsc --pretty false` log instead of running
 * the compiler. CI does not use this; it is for local debugging only.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = path.join(repoRoot, ".tsc-baseline.json");
const tsconfigPath = path.join(repoRoot, "tsconfig.json");

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const writeMode = args.has("--write");
const forceWrite = args.has("--force");
let fromFile = null;
for (let i = 0; i < rawArgs.length; i += 1) {
  if (rawArgs[i] === "--from-file") {
    fromFile = rawArgs[i + 1] || null;
    i += 1;
  } else if (rawArgs[i].startsWith("--from-file=")) {
    fromFile = rawArgs[i].slice("--from-file=".length);
  }
}

function normalizeFile(file) {
  return String(file || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .trim();
}

/**
 * Strip machine-local roots so the same error keys on CI and on a laptop.
 * node_modules may be a symlink to another install; use its realpath too.
 */
function pathAliases() {
  const aliases = [];
  const add = (from, to) => {
    if (!from) return;
    const norm = path.resolve(from).replace(/\\/g, "/");
    aliases.push([norm, to]);
    aliases.push([norm.replace(/\//g, "\\"), to]);
  };
  const resolvedRoot = path.resolve(repoRoot);
  add(resolvedRoot, ".");
  add(path.join(resolvedRoot, "node_modules"), "node_modules");
  try {
    add(fs.realpathSync(resolvedRoot), ".");
  } catch {
    /* not required */
  }
  try {
    const realNm = fs.realpathSync(path.join(resolvedRoot, "node_modules"));
    add(realNm, "node_modules");
  } catch {
    /* no node_modules yet */
  }
  aliases.sort((a, b) => b[0].length - a[0].length);
  return aliases;
}

const PATH_ALIASES = pathAliases();

function stripLocalPaths(text) {
  let out = String(text || "");
  for (const [from, to] of PATH_ALIASES) {
    if (from && out.includes(from)) out = out.split(from).join(to);
  }
  return out;
}

function normalizeMessage(message) {
  return stripLocalPaths(message)
    .replace(/\s+/g, " ")
    .trim();
}

function errorKey(file, code, message) {
  return `${normalizeFile(file)}\u0000${code}\u0000${normalizeMessage(message)}`;
}

function parseKey(key) {
  const [file, code, message] = key.split("\u0000");
  return { file, code, message };
}

/**
 * Parse `tsc --pretty false` output into a map of key -> count.
 * Continuation lines (indented) are folded into the message so two errors
 * that share a first line but differ in the details stay distinct.
 */
function parseTscOutput(text) {
  const header =
    /^(.*)\((\d+),(\d+)\): error (TS\d+): (.*)$/;
  const counts = new Map();
  let current = null;

  const flush = () => {
    if (!current) return;
    const key = errorKey(current.file, current.code, current.message);
    counts.set(key, (counts.get(key) || 0) + 1);
    current = null;
  };

  for (const raw of String(text || "").split(/\r?\n/)) {
    const match = raw.match(header);
    if (match) {
      flush();
      current = {
        file: match[1],
        code: match[4],
        message: match[5],
      };
      continue;
    }
    if (current && /^\s+/.test(raw) && raw.trim()) {
      current.message += ` ${raw.trim()}`;
      continue;
    }
    // Ignore banners, blank lines, and unrelated stderr.
  }
  flush();
  return counts;
}

function runTsc() {
  if (fromFile) {
    const resolved = path.resolve(fromFile);
    if (!fs.existsSync(resolved)) {
      console.error(`tsc-ratchet: --from-file not found: ${fromFile}`);
      process.exit(2);
    }
    return parseTscOutput(fs.readFileSync(resolved, "utf8"));
  }
  const tscJs = path.join(repoRoot, "node_modules", "typescript", "lib", "tsc.js");
  if (!fs.existsSync(tscJs)) {
    console.error("tsc-ratchet: typescript is not installed (node_modules/typescript/lib/tsc.js missing)");
    process.exit(2);
  }
  if (!fs.existsSync(tsconfigPath)) {
    console.error("tsc-ratchet: tsconfig.json not found");
    process.exit(2);
  }

  const result = spawnSync(
    process.execPath,
    [tscJs, "--noEmit", "--project", "tsconfig.json", "--pretty", "false", "--incremental", "false"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: process.env,
      maxBuffer: 32 * 1024 * 1024,
    },
  );

  if (result.error) {
    console.error("tsc-ratchet: failed to launch tsc:", result.error.message);
    process.exit(2);
  }
  if (result.status === null) {
    console.error(
      `tsc-ratchet: tsc was killed (${result.signal || "no signal"}) before it finished`,
    );
    process.exit(2);
  }

  // tsc uses 1 or 2 when diagnostics are present (--noEmit often exits 1;
  // other modes may exit 2). A crash / bad flags also uses a non-zero status
  // but usually prints no parseable errors — fail closed in that case.
  const out = `${result.stdout || ""}${result.stderr || ""}`;
  const counts = parseTscOutput(out);
  const status = result.status;
  if (status === 0) return counts;
  if ((status === 1 || status === 2) && (counts.size > 0 || !out.trim())) {
    // size 0 and empty output with exit 1/2 is unexpected; treat empty as fail below.
    if (counts.size > 0) return counts;
  }
  if ((status === 1 || status === 2) && counts.size === 0) {
    console.error(`tsc-ratchet: tsc exited ${status} but no errors were parsed`);
    if (out.trim()) console.error(out.trimEnd());
    process.exit(2);
  }
  console.error(`tsc-ratchet: tsc exited ${status}`);
  if (out.trim()) console.error(out.trimEnd());
  process.exit(2);
}

function loadBaseline() {
  if (!fs.existsSync(baselinePath)) return null;
  const raw = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  const counts = new Map();
  for (const entry of raw.errors || []) {
    const key = errorKey(entry.file, entry.code, entry.message);
    counts.set(key, Number(entry.count) || 0);
  }
  return { raw, counts };
}

function totalOf(counts) {
  let n = 0;
  for (const c of counts.values()) n += c;
  return n;
}

function serializeBaseline(counts) {
  const errors = [...counts.entries()]
    .map(([key, count]) => {
      const { file, code, message } = parseKey(key);
      return { file, code, message, count };
    })
    .sort((a, b) => {
      return (
        a.file.localeCompare(b.file) ||
        a.code.localeCompare(b.code) ||
        a.message.localeCompare(b.message)
      );
    });
  return {
    version: 1,
    // Human-readable total only. CI compares per-key counts, not this field.
    total: totalOf(counts),
    notes:
      "Regenerate only downward with `npm run tsc:baseline` and commit the smaller file. CI never writes this file. Keys are file + code + normalized message (no line/column).",
    errors,
  };
}

function compare(current, baseline) {
  const newOrHigher = [];
  const stale = [];
  const keys = new Set([...current.keys(), ...baseline.keys()]);
  for (const key of keys) {
    const now = current.get(key) || 0;
    const was = baseline.get(key) || 0;
    const { file, code, message } = parseKey(key);
    const row = { file, code, message, current: now, baseline: was };
    if (now > was) newOrHigher.push(row);
    else if (now < was) stale.push(row);
  }
  newOrHigher.sort((a, b) => a.file.localeCompare(b.file) || a.code.localeCompare(b.code) || a.message.localeCompare(b.message));
  stale.sort((a, b) => a.file.localeCompare(b.file) || a.code.localeCompare(b.code) || a.message.localeCompare(b.message));
  return { newOrHigher, stale };
}

function printRows(title, rows) {
  if (!rows.length) return;
  console.error(`${title} (${rows.length}):`);
  for (const row of rows) {
    const preview = row.message.length > 160 ? `${row.message.slice(0, 157)}...` : row.message;
    console.error(
      `  ${row.file} ${row.code} count ${row.current} (baseline ${row.baseline}): ${preview}`,
    );
  }
}

const current = runTsc();
const currentTotal = totalOf(current);
const currentKeys = current.size;

if (writeMode) {
  const existing = loadBaseline();
  if (existing && !forceWrite) {
    const { newOrHigher } = compare(current, existing.counts);
    if (newOrHigher.length) {
      console.error(
        "tsc-ratchet: refusing to write a baseline that adds keys or raises a count.",
      );
      console.error(
        "Regenerate only downward after fixing errors. Pass --force only if a compiler upgrade reworded messages, never to accept new errors.",
      );
      printRows("New or increased errors", newOrHigher);
      process.exit(1);
    }
  }
  const body = `${JSON.stringify(serializeBaseline(current), null, 2)}\n`;
  fs.writeFileSync(baselinePath, body);
  const rel = path.relative(repoRoot, baselinePath) || ".tsc-baseline.json";
  console.log(
    `tsc-ratchet: wrote ${rel} (${currentTotal} errors, ${currentKeys} keys)${forceWrite ? " (--force)" : ""}`,
  );
  process.exit(0);
}

// CI / compare mode: never write.
const existing = loadBaseline();
if (!existing) {
  console.error(
    `tsc-ratchet: missing ${path.relative(repoRoot, baselinePath) || ".tsc-baseline.json"}.`,
  );
  console.error("Generate it locally with `npm run tsc:baseline` and commit the file.");
  process.exit(1);
}

const { newOrHigher, stale } = compare(current, existing.counts);
const baselineTotal = totalOf(existing.counts);
console.log(
  `tsc-ratchet: current ${currentTotal} errors (${currentKeys} keys); baseline ${baselineTotal} errors (${existing.counts.size} keys)`,
);

if (newOrHigher.length === 0 && stale.length === 0) {
  console.log("tsc-ratchet: ok — matches baseline");
  process.exit(0);
}

if (newOrHigher.length) {
  printRows("New or increased errors", newOrHigher);
}
if (stale.length) {
  printRows(
    "Stale baseline (counts dropped; run `npm run tsc:baseline` and commit the shrink)",
    stale,
  );
}
process.exit(1);
