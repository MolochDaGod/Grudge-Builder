#!/usr/bin/env node
/**
 * probe-fleet-wiring.mjs
 *
 * Production wiring matrix for Warlords browser MMO (grudge-builder deploy path).
 * Uses **expected status sets** so auth-required endpoints (401) and catalog
 * probes are not false-failed (unlike /api/v1/health 404s that never existed).
 *
 *   node scripts/probe-fleet-wiring.mjs
 *   npm run probe:fleet-wiring
 *
 * Exit: 0 if all critical pass; 1 if any critical fails.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TIMEOUT_MS = 12_000;
const OUT = join(ROOT, "scripts", "probe-fleet-wiring-results.json");

/**
 * @typedef {{ id: string, group: string, url: string, accept: number[], critical?: boolean, note?: string }} Probe
 */

/** @type {Probe[]} */
const PROBES = [
  // ── Play client (grudge-builder) ─────────────────────────────────
  { id: "client.spa", group: "play", url: "https://client.grudge-studio.com/", accept: [200], critical: true },
  { id: "client.health", group: "play", url: "https://client.grudge-studio.com/api/health", accept: [200], critical: true },
  { id: "client.manifest", group: "play", url: "https://client.grudge-studio.com/api/fleet/manifest", accept: [200], critical: true },
  // 401 without JWT = correct wiring (Railway behind rewrite)
  { id: "client.characters.auth", group: "play", url: "https://client.grudge-studio.com/api/characters", accept: [401, 403], critical: true, note: "unauth must be 401/403 not 200 empty" },
  { id: "warlords.spa", group: "play", url: "https://grudgewarlords.com/", accept: [200], critical: true },
  { id: "warlords.health", group: "play", url: "https://grudgewarlords.com/api/health", accept: [200], critical: true },
  { id: "client.leviathan", group: "play", url: "https://client.grudge-studio.com/leviathan-cinema", accept: [200], critical: true },
  { id: "client.shipwreck-legacy", group: "play", url: "https://client.grudge-studio.com/shipwreck-cinema", accept: [200, 301, 302], critical: false },
  { id: "client.tutorial", group: "play", url: "https://client.grudge-studio.com/tutorial", accept: [200], critical: true },
  { id: "client.heroes", group: "play", url: "https://client.grudge-studio.com/heroes", accept: [200], critical: true },
  { id: "client.home", group: "play", url: "https://client.grudge-studio.com/home", accept: [200], critical: true },

  // ── Identity + player API ────────────────────────────────────────
  { id: "id.spa", group: "auth", url: "https://id.grudge-studio.com/", accept: [200, 302, 301], critical: true },
  { id: "id.health", group: "auth", url: "https://id.grudge-studio.com/api/health", accept: [200], critical: true },
  { id: "railway.health", group: "auth", url: "https://grudge-api-production-0d46.up.railway.app/api/health", accept: [200], critical: true },

  // ── Defs (info preferred; objectstore mirror) ─────────────────────
  // Do NOT probe /api/v1/health — those routes do not exist (false fail).
  { id: "info.master-items", group: "defs", url: "https://info.grudge-studio.com/api/v1/master-items.json", accept: [200], critical: true },
  { id: "info.play-contract", group: "defs", url: "https://info.grudge-studio.com/api/v1/grudge6-warlords-play-contract.json", accept: [200], critical: true },
  { id: "os.master-items", group: "defs", url: "https://objectstore.grudge-studio.com/api/v1/master-items.json", accept: [200], critical: true },
  { id: "os.catalog", group: "defs", url: "https://objectstore.grudge-studio.com/api/v1/catalog", accept: [200, 404], critical: false, note: "catalog shape may vary" },

  // ── UI packs ─────────────────────────────────────────────────────
  { id: "ui.home", group: "ui", url: "https://ui.grudge-studio.com/", accept: [200], critical: true },
  { id: "ui.packs", group: "ui", url: "https://ui.grudge-studio.com/game-ui-packs/index.json", accept: [200], critical: true },
  { id: "ui.warlords-pack", group: "ui", url: "https://ui.grudge-studio.com/game-ui-packs/warlords.json", accept: [200], critical: true },
  { id: "ui.water-pack", group: "ui", url: "https://ui.grudge-studio.com/game-ui-packs/water-island.json", accept: [200], critical: false },
  { id: "ui.runtime", group: "ui", url: "https://ui.grudge-studio.com/game-ui-runtime.js", accept: [200], critical: false },

  // ── CDN assets ───────────────────────────────────────────────────
  { id: "cdn.root", group: "cdn", url: "https://assets.grudge-studio.com/", accept: [200, 403, 404], critical: false },
  { id: "cdn.wk", group: "cdn", url: "https://assets.grudge-studio.com/models/grudge6/races/WK_Characters.glb", accept: [200], critical: true },
  { id: "cdn.pirate", group: "cdn", url: "https://assets.grudge-studio.com/models/lobby/pirate-islands/scene.glb", accept: [200], critical: true },
  { id: "cdn.kame", group: "cdn", url: "https://assets.grudge-studio.com/models/cinema/kamehameha_charging.glb", accept: [200], critical: false },

  // ── Editors / labs ───────────────────────────────────────────────
  { id: "forge", group: "editor", url: "https://forge.grudge-studio.com/", accept: [200], critical: true },
  { id: "forge.health", group: "editor", url: "https://forge.grudge-studio.com/api/health", accept: [200], critical: false },
  { id: "water", group: "water", url: "https://water.grudge-studio.com/", accept: [200], critical: true },
  { id: "water.health", group: "water", url: "https://water.grudge-studio.com/api/health", accept: [200], critical: true },
  { id: "water.island", group: "water", url: "https://water.grudge-studio.com/island", accept: [200], critical: false },
  { id: "foundry", group: "create", url: "https://character.grudge-studio.com/", accept: [200], critical: true },
  { id: "open", group: "launcher", url: "https://open.grudge-studio.com/", accept: [200], critical: true },
  { id: "casting.vercel", group: "lab", url: "https://casting-abilities-threejs.vercel.app/", accept: [200], critical: true },
  { id: "casting.vercel.health", group: "lab", url: "https://casting-abilities-threejs.vercel.app/api/health", accept: [200], critical: false },
  // Custom DNS may be NXDOMAIN — non-critical until Domain Connect
  { id: "casting.dns", group: "lab", url: "https://casting.grudge-studio.com/", accept: [200, 301, 302], critical: false, note: "optional; NXDOMAIN = DNS gap" },
];

function color(ok, status) {
  if (ok) return "\x1b[32m";
  if (status === 0) return "\x1b[31m";
  return "\x1b[33m";
}

async function probeOne(p) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(p.url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": "grudge-fleet-wiring-probe/1.0" },
    });
    const ms = Date.now() - started;
    const ok = p.accept.includes(res.status);
    return {
      ...p,
      status: res.status,
      ms,
      ok,
      size: Number(res.headers.get("content-length") || 0) || undefined,
    };
  } catch (err) {
    return {
      ...p,
      status: 0,
      ms: Date.now() - started,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const reset = "\x1b[0m";
  process.stdout.write("\n=== Grudge fleet wiring probe ===\n\n");
  const results = [];
  for (const p of PROBES) {
    const r = await probeOne(p);
    results.push(r);
    const c = color(r.ok, r.status);
    const code = String(r.status || "ERR").padStart(3);
    const crit = r.critical ? "CRIT" : "opt ";
    const note = r.note ? `  (${r.note})` : r.error ? `  ${r.error}` : "";
    process.stdout.write(
      `${c}${code}${reset} ${crit} [${r.group.padEnd(8)}] ${r.id.padEnd(22)} ${r.url}${note}\n`,
    );
  }

  const critical = results.filter((r) => r.critical);
  const critOk = critical.filter((r) => r.ok).length;
  const critFail = critical.filter((r) => !r.ok);
  const optFail = results.filter((r) => !r.critical && !r.ok);

  process.stdout.write(
    `\nCritical: ${critOk}/${critical.length} OK` +
      (critFail.length ? ` · FAIL: ${critFail.map((r) => r.id).join(", ")}` : "") +
      `\nOptional fails: ${optFail.map((r) => r.id).join(", ") || "none"}\n`,
  );

  const payload = {
    at: new Date().toISOString(),
    criticalOk: critOk,
    criticalTotal: critical.length,
    criticalFails: critFail.map((r) => ({ id: r.id, status: r.status, url: r.url })),
    optionalFails: optFail.map((r) => ({ id: r.id, status: r.status, url: r.url })),
    results,
  };
  try {
    writeFileSync(OUT, JSON.stringify(payload, null, 2));
    process.stdout.write(`Wrote ${OUT}\n`);
  } catch {
    /* ignore */
  }

  if (critFail.length) {
    process.stdout.write("\nExit 1 — fix critical wiring before prod release.\n");
    process.exit(1);
  }
  process.stdout.write("\nExit 0 — critical wiring green.\n");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
