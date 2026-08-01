#!/usr/bin/env node
/**
 * Download pinned engine reference artifacts for offline / CI best-practice work.
 *
 * Fetches:
 *   - three.js r170+ package tarball metadata (version check)
 *   - Optional: three.js examples/jsm path list (HEAD verify CDN)
 *   - Fleet health endpoints snapshot
 *
 * Does NOT vendor full three.js into git — writes pins + checksums under
 * scripts/best-practices/.cache/
 *
 * Usage:
 *   node scripts/best-practices/download-engine-pins.mjs
 *   node scripts/best-practices/download-engine-pins.mjs --three 0.170.0
 *   node scripts/best-practices/download-engine-pins.mjs --fleet
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";
import http from "node:http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(__dirname, ".cache");
const argv = process.argv.slice(2);

function argVal(name, fallback) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
}

const THREE_VER = argVal("--three", "0.185.1");
const wantFleet = argv.includes("--fleet");

function get(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { headers: { "User-Agent": "grudge-engine-pins/1.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        get(res.headers.location).then(resolve, reject);
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () =>
        resolve({
          status: res.statusCode,
          body: Buffer.concat(chunks),
          headers: res.headers,
        }),
      );
    });
    req.on("error", reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error("timeout"));
    });
  });
}

async function main() {
  fs.mkdirSync(CACHE, { recursive: true });
  const report = { generatedAt: new Date().toISOString(), three: null, fleet: [], cdn: [] };

  // npm registry three version
  console.log(`→ npm registry three@${THREE_VER}`);
  const reg = await get(`https://registry.npmjs.org/three/${THREE_VER}`);
  if (reg.status !== 200) {
    console.error(`  FAIL ${reg.status} three@${THREE_VER}`);
  } else {
    const meta = JSON.parse(reg.body.toString("utf8"));
    report.three = {
      version: meta.version,
      dist: meta.dist,
      engines: meta.engines || null,
    };
    fs.writeFileSync(
      path.join(CACHE, `three-${meta.version}.npm.json`),
      JSON.stringify(meta, null, 2),
    );
    console.log(`  OK ${meta.version} tarball ${meta.dist?.tarball}`);
  }

  // CDN HEAD samples used by Warlords / guide
  const cdnSamples = [
    "https://assets.grudge-studio.com/icons/pack/weapons/Sword_01.png",
    "https://assets.grudge-studio.com/icons/pack/weapons/staff_1.png",
    "https://objectstore.grudge-studio.com/api/v1/master-items.json",
    "https://unpkg.com/three@0.185.1/build/three.module.js",
    "https://unpkg.com/three@0.185.1/build/three.webgpu.min.js",
    "https://assets.grudge-studio.com/js/grudge-render-capabilities.js",
    "https://assets.grudge-studio.com/js/vendor/three/0.185.1/three.webgpu.min.js",
  ];
  console.log("→ CDN / registry samples");
  for (const url of cdnSamples) {
    try {
      const r = await get(url);
      const ok = r.status === 200;
      report.cdn.push({ url, status: r.status, bytes: r.body.length });
      console.log(`  ${ok ? "OK" : "FAIL"} ${r.status} ${r.body.length}b  ${url}`);
    } catch (e) {
      report.cdn.push({ url, error: String(e.message || e) });
      console.log(`  ERR ${url} ${e.message}`);
    }
  }

  if (wantFleet) {
    const fleet = [
      "https://grudge-api-production-0d46.up.railway.app/api/health",
      "https://grudge-api-production-0d46.up.railway.app/api/fleet/manifest",
      "https://id.grudge-studio.com/login",
      "https://grudox.grudge-studio.com/api/health",
      "https://objectstore.grudge-studio.com/api/v1/_meta/fleet-truth.json",
    ];
    console.log("→ Fleet health");
    for (const url of fleet) {
      try {
        const r = await get(url);
        report.fleet.push({ url, status: r.status, bytes: r.body.length });
        console.log(`  ${r.status} ${url}`);
      } catch (e) {
        report.fleet.push({ url, error: String(e.message || e) });
        console.log(`  ERR ${url}`);
      }
    }
  }

  const out = path.join(CACHE, "engine-pins-report.json");
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${out}`);

  // Best-practice pins doc fragment
  const md = path.join(__dirname, "ENGINE_PINS.md");
  fs.writeFileSync(
    md,
    `# Engine pins (generated)

Generated: ${report.generatedAt}

## Recommended fleet versions

| Package | Pin | Notes |
|---------|-----|--------|
| node | >=20 (22 LTS preferred) | Railway + Vercel |
| three | ^${THREE_VER} | Color management, WebGL2 |
| react | ^18.3 | Match react-dom major |
| @react-three/fiber | ^8.18 | React 18 |
| @react-three/drei | ^9.x | Keep with r3f 8 |

## Last download

\`\`\`json
${JSON.stringify(report.three, null, 2)}
\`\`\`

## Commands

\`\`\`bash
# Audit current repo
npm run check:best-practices

# Refresh pins + fleet snapshot
npm run download:engine-pins -- --fleet

# Full stack probe (GrudgeBuilder)
npm run probe:stack
\`\`\`
`,
  );
  console.log(`Wrote ${md}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
