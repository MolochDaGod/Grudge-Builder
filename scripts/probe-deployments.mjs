#!/usr/bin/env node
/**
 * probe-deployments.mjs
 *
 * Sanity-check every Grudge deployment registered in:
 *   - client/src/data/systemMap.ts (domains)
 *   - docs/puter-registry.json     (Puter frontends + worker)
 *   - docs/references/gs-portal.md (/gs reference)
 *
 * Reports HTTP status + page <title> for each. Run before opening a PR
 * that touches systemMap.ts or puter-registry.json.
 *
 *   node scripts/probe-deployments.mjs
 *   node scripts/probe-deployments.mjs --truth   # also run ONE TRUTH fleet probes
 *
 * Exits 0 always (informational); use `npm run probe:truth` as the CI gate.
 */
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TIMEOUT_MS = 8000;
const runTruth = process.argv.includes("--truth");

/** Hosts grouped by category. Edit this list when registering new deployments. */
const TARGETS = [
  { group: "frontend", url: "https://grudgewarlords.com" },
  { group: "frontend", url: "https://www.grudgewarlords.com" },
  { group: "frontend", url: "https://client.grudge-studio.com" },
  { group: "portal",   url: "https://grudge-studio.com" },
  { group: "portal",   url: "https://grudge-studio.com/gs" },
  { group: "web3",     url: "https://grudgeplatform.io" },
  { group: "web3",     url: "https://grudgeplatform.io/play" },
  { group: "web3",     url: "https://grudgeplatform.com" },
  { group: "auth",     url: "https://id.grudge-studio.com" },
  { group: "backend",  url: "https://api.grudge-studio.com/api/health" },
  { group: "backend",  url: "https://api.grudge-studio.com/health" },
  { group: "backend",  url: "https://account.grudge-studio.com/health" },
  { group: "assets",   url: "https://assets.grudge-studio.com" },
  { group: "assets",   url: "https://objectstore.grudge-studio.com/health" },
  { group: "assets",   url: "https://grudge-objectstore.pages.dev/api/v1/master-items.json" },
  { group: "ai",       url: "https://ai.grudge-studio.com" },
  { group: "admin",    url: "https://dash.grudge-studio.com" },
  { group: "admin",    url: "https://grudge-studio-dash.pages.dev" },
  { group: "launcher", url: "https://launcher.grudge-studio.com" },
  { group: "launcher", url: "https://grudgedot-launcher.vercel.app" },
  { group: "launcher", url: "https://grudgedot.pages.dev" },
  { group: "wallet",   url: "https://wallet.grudge-studio.com" },
  { group: "nexus",    url: "https://grudachain.grudgestudio.com" },
  { group: "ide",      url: "https://grudgechain-vibe-ide.pages.dev" },
  { group: "puter",    url: "https://grudge-server.puter.work/api/health" },
  { group: "puter",    url: "https://grudge-crafting.puter.site" },
  { group: "puter",    url: "https://grudgewarlords.puter.site" },
  { group: "puter",    url: "https://grudgestudio.puter.site" },
  { group: "puter",    url: "https://grudge-studio.puter.site" },
  { group: "puter",    url: "https://grudge.puter.site" },
  { group: "status",   url: "https://grudge-studio.com/api/status" },
];

/** Status bar keys the systems-master.html outline expects on /api/status. */
const STATUS_KEYS = ["id", "api", "ws", "launcher", "assets"];

function color(status) {
  if (status >= 200 && status < 300) return "\x1b[32m";   // green
  if (status >= 300 && status < 400) return "\x1b[36m";   // cyan
  if (status >= 400 && status < 500) return "\x1b[33m";   // yellow
  return "\x1b[31m";                                       // red
}

async function probe(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { "user-agent": "grudge-probe/1.0" } });
    const ct = res.headers.get("content-type") || "";
    let title = "";
    let statusKeys = "";
    if (ct.includes("text/html")) {
      const body = await res.text();
      const m = body.match(/<title>([^<]+)<\/title>/i);
      title = m ? m[1].trim() : "";
    } else if (ct.includes("application/json") && url.endsWith("/api/status")) {
      try {
        const json = await res.json();
        const keys = (json.services ?? []).map(s => s.key).filter(Boolean);
        const have = STATUS_KEYS.filter(k => keys.includes(k));
        const missing = STATUS_KEYS.filter(k => !keys.includes(k));
        statusKeys = `keys: have=[${have.join(",")}] missing=[${missing.join(",")}]`;
      } catch { /* not JSON */ }
    }
    return { status: res.status, title, statusKeys };
  } catch (err) {
    return { status: 0, title: "", statusKeys: "", error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const reset = "\x1b[0m";
  const results = [];
  for (const t of TARGETS) {
    /* eslint-disable no-await-in-loop */
    const r = await probe(t.url);
    results.push({ ...t, ...r });
    const c = color(r.status);
    const tag = `[${t.group}]`.padEnd(11);
    const code = String(r.status || "ERR").padStart(3);
    const tail = r.error ? ` (${r.error})` : r.title ? `  \u2014 ${r.title}` : r.statusKeys ? `  \u2014 ${r.statusKeys}` : "";
    process.stdout.write(`${c}${code}${reset} ${tag} ${t.url}${tail}\n`);
  }
  // Summary
  const ok = results.filter(r => r.status >= 200 && r.status < 400).length;
  const broken = results.filter(r => r.status === 0 || r.status >= 400).length;
  process.stdout.write(`\n${ok}/${results.length} OK, ${broken} broken/errored\n`);

  if (runTruth) {
    process.stdout.write("\n--- ONE TRUTH fleet probes (shared/fleet/truthProbes.ts) ---\n");
    try {
      execSync("npx tsx scripts/probe-truth-fleet.ts", {
        cwd: ROOT,
        stdio: "inherit",
      });
    } catch {
      process.stdout.write("ONE TRUTH probes failed (see above). Run: npm run probe:truth\n");
    }
  }
}

main().catch(err => { console.error(err); process.exit(0); });
