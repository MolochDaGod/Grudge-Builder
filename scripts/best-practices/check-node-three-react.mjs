#!/usr/bin/env node
/**
 * Grudge fleet — Node / Three.js / React best-practice audit (static).
 *
 * Scans package.json + common client sources for:
 *   - Node engines pin (recommend >=20)
 *   - three + @types/three alignment
 *   - react / react-dom peer match
 *   - R3F + drei + three version bands
 *   - Missing production scripts (build/start/check)
 *   - Dead API host api.grudge-studio.com in vercel/config
 *   - dispose/cleanup smell (heuristic only)
 *
 * Usage:
 *   node scripts/best-practices/check-node-three-react.mjs
 *   node scripts/best-practices/check-node-three-react.mjs --root ../RTS-Grudge
 *   node scripts/best-practices/check-node-three-react.mjs --json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const jsonOut = argv.includes("--json");
const rootIdx = argv.indexOf("--root");
const ROOT = path.resolve(
  rootIdx >= 0 ? argv[rootIdx + 1] : path.join(__dirname, "../.."),
);

const findings = [];
function add(level, code, msg, fix = "") {
  findings.push({ level, code, msg, fix });
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function walk(dir, pred, out = [], depth = 0) {
  if (depth > 6 || !fs.existsSync(dir)) return out;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === "dist" || e.name === ".git") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, pred, out, depth + 1);
    else if (pred(full)) out.push(full);
  }
  return out;
}

const pkgPath = path.join(ROOT, "package.json");
const pkg = readJson(pkgPath);
if (!pkg) {
  console.error(`No package.json at ${ROOT}`);
  process.exit(2);
}

const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const scripts = pkg.scripts || {};
const engines = pkg.engines || {};

// —— Node ——
const nodeEng = engines.node || "";
if (!nodeEng) {
  add(
    "warn",
    "node.engines",
    "package.json missing engines.node",
    'Add "engines": { "node": ">=20" }',
  );
} else if (!/20|22|24/.test(nodeEng)) {
  add(
    "warn",
    "node.engines.old",
    `engines.node is "${nodeEng}" — fleet standard is >=20 (prefer 22 LTS)`,
    'Set "engines": { "node": ">=20" }',
  );
} else {
  add("ok", "node.engines", `engines.node=${nodeEng}`);
}

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < 20) {
  add("error", "node.runtime", `Running Node ${process.version}; need >=20`);
} else {
  add("ok", "node.runtime", `runtime ${process.version}`);
}

for (const s of ["build", "start", "check"]) {
  if (!scripts[s] && !scripts[`build:client`]) {
    if (s === "build" && scripts["build:client"]) continue;
    add("warn", `scripts.${s}`, `Missing npm script "${s}"`);
  }
}

// —— React ——
const react = deps.react;
const reactDom = deps["react-dom"];
if (react || reactDom) {
  if (react && reactDom) {
    const ra = String(react).replace(/[\^~>=< ]/g, "");
    const rd = String(reactDom).replace(/[\^~>=< ]/g, "");
    if (ra.split(".")[0] !== rd.split(".")[0]) {
      add(
        "error",
        "react.mismatch",
        `react ${react} vs react-dom ${reactDom} major mismatch`,
        "Keep react and react-dom on the same major",
      );
    } else {
      add("ok", "react.pair", `react ${react} / react-dom ${reactDom}`);
    }
  } else {
    add("warn", "react.incomplete", "Only one of react / react-dom is declared");
  }
  if (deps["@types/react"] && String(react).includes("18") && String(deps["@types/react"]).includes("19")) {
    add("warn", "react.types", "@types/react looks like v19 while react is 18");
  }
}

// —— Three / R3F ——
const three = deps.three;
const r3f = deps["@react-three/fiber"];
const drei = deps["@react-three/drei"];
const typesThree = deps["@types/three"];

if (three) {
  add("ok", "three.dep", `three ${three}`);
  const major = Number(String(three).replace(/[^\d.].*/, "").split(".")[0]);
  if (major && major < 160) {
    add(
      "warn",
      "three.old",
      `three ${three} is quite old; fleet targets r170+ for color management / WebGPU path`,
      "Upgrade three to ^0.170 or later and re-test materials",
    );
  }
  if (!typesThree && pkg.type !== "module") {
    add("info", "three.types", "No @types/three (fine if using three's bundled types)");
  }
} else {
  add("info", "three.none", "No three dependency in this package.json");
}

if (r3f) {
  add("ok", "r3f", `@react-three/fiber ${r3f}`);
  if (!drei) {
    add("warn", "drei.missing", "R3F without @react-three/drei — often intentional");
  }
  if (!three) {
    add("error", "r3f.no-three", "R3F present but three is missing");
  }
}

// —— Dead fleet hosts (active rewrites only; skip docs / deprecation lists / vendor) ——
const configFiles = walk(
  ROOT,
  (f) => {
    const rel = path.relative(ROOT, f).replace(/\\/g, "/");
    if (rel.startsWith("vendor/") || rel.startsWith("docs/") || rel.startsWith("node_modules/")) {
      return false;
    }
    return /vercel\.json$|wrangler\.toml$|manifest\.ts$|grudgeConfig\.ts$/i.test(f) ||
      /authConnect\.ts$/i.test(f);
  },
);
for (const f of configFiles) {
  let text = "";
  try {
    text = fs.readFileSync(f, "utf8");
  } catch {
    continue;
  }
  if (!text.includes("api.grudge-studio.com")) continue;
  // Active use: rewrite dest or bare https base (not "deprecated"/"never" comments)
  const lines = text.split(/\r?\n/);
  const active = lines.filter((line) => {
    if (!line.includes("api.grudge-studio.com")) return false;
    if (/deprecated|never call|do not use|split-brain|LEGACY|must not/i.test(line)) return false;
    if (/^\s*(\/\/|\*|\#)/.test(line)) return false;
    return /https:\/\/api\.grudge-studio\.com|dest["']\s*:\s*["']https:\/\/api\.grudge-studio/i.test(
      line,
    );
  });
  if (active.length) {
    add(
      "error",
      "fleet.dead-api",
      `Active dead host api.grudge-studio.com in ${path.relative(ROOT, f)} (${active.length} line(s))`,
      "Use Railway grudge-api-production-0d46 or same-origin /api/* rewrites",
    );
  } else {
    add(
      "ok",
      "fleet.dead-api.docs",
      `${path.relative(ROOT, f)} mentions api.grudge-studio.com only as deprecated/doc`,
    );
  }
}

// —— Dispose heuristics (sample client sources) ——
const clientRoots = ["client/src", "src", "studio/src"]
  .map((p) => path.join(ROOT, p))
  .filter((p) => fs.existsSync(p));
let geometryNews = 0;
let disposeHits = 0;
let useFrameHits = 0;
for (const cr of clientRoots) {
  const files = walk(cr, (f) => /\.(tsx?|jsx?)$/.test(f)).slice(0, 400);
  for (const f of files) {
    let t = "";
    try {
      t = fs.readFileSync(f, "utf8");
    } catch {
      continue;
    }
    if (/new THREE\.(BufferGeometry|BoxGeometry|SphereGeometry)/.test(t)) geometryNews++;
    if (/\.dispose\s*\(/.test(t)) disposeHits++;
    if (/useFrame\s*\(/.test(t)) useFrameHits++;
  }
}
if (geometryNews > 20 && disposeHits < geometryNews / 4) {
  add(
    "warn",
    "three.dispose",
    `Many Geometry constructors (~${geometryNews}) vs few dispose() (~${disposeHits})`,
    "Reuse geometries/materials; dispose on unmount (R3F: use <primitive> + cleanup)",
  );
} else if (geometryNews || disposeHits) {
  add(
    "ok",
    "three.dispose.sample",
    `geometry news~${geometryNews} dispose~${disposeHits} useFrame~${useFrameHits}`,
  );
}

// —— Report ——
const errors = findings.filter((f) => f.level === "error");
const warns = findings.filter((f) => f.level === "warn");
const oks = findings.filter((f) => f.level === "ok");

if (jsonOut) {
  console.log(
    JSON.stringify(
      { root: ROOT, errors: errors.length, warns: warns.length, findings },
      null,
      2,
    ),
  );
} else {
  console.log(`\nNode / Three / React best-practice audit\nRoot: ${ROOT}\n`);
  for (const f of findings) {
    const tag = f.level.toUpperCase().padEnd(5);
    console.log(`[${tag}] ${f.code}: ${f.msg}`);
    if (f.fix) console.log(`       fix → ${f.fix}`);
  }
  console.log(
    `\nSummary: ${oks.length} ok · ${warns.length} warn · ${errors.length} error\n`,
  );
}

process.exit(errors.length ? 1 : 0);
