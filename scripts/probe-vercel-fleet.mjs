#!/usr/bin/env node
/**
 * Probe grudgenexus Vercel fleet — root + favicon.ico for every project.
 * Run: node scripts/probe-vercel-fleet.mjs
 */
const TIMEOUT_MS = 10000;

const TARGETS = [
  { project: "GrudgeBuilder", url: "https://grudgewarlords.com" },
  { project: "GrudgeBuilder", url: "https://client.grudge-studio.com" },
  { project: "grudge-platform", url: "https://grudgeplatform.io" },
  { project: "grudge-platform", url: "https://grudge-platform.vercel.app" },
  { project: "grudge-studio-dash", url: "https://dash.grudge-studio.com" },
  { project: "grudge-studio-dash", url: "https://grudge-studio-dash.vercel.app" },
  { project: "grudge-studio-editor", url: "https://studio.grudge-studio.com" },
  { project: "hero-commander-rts", url: "https://play.grudge-studio.com" },
  { project: "hero-rts", url: "https://hero-rts-grudgenexus.vercel.app" },
  { project: "rts-grudge", url: "https://rts-grudge.vercel.app" },
  { project: "rts-grudge-forge", url: "https://rts-grudge.vercel.app/forge/" },
  { project: "studio-forge", url: "https://forge.grudge-studio.com" },
  { project: "grudge-arena", url: "https://grudge-arena.vercel.app" },
  { project: "grim-armada-web", url: "https://grim-armada-web.vercel.app" },
  { project: "dungeon-crawler-quest", url: "https://dcq.grudge-studio.com" },
  { project: "grudge-space-rts", url: "https://grudge-space-rts.vercel.app" },
  { project: "mech-playground", url: "https://mech-playground.vercel.app" },
  { project: "grudge-character-creator", url: "https://grudge6.grudge-studio.com" },
  { project: "grudge-drive", url: "https://drive.grudge-studio.com" },
  { project: "grudges-survival", url: "https://grudges.grudge-studio.com" },
  { project: "objectstore-grudge", url: "https://info.grudge-studio.com" },
  { project: "objectstore-grudge", url: "https://info.grudge-studio.com/docs" },
  { project: "grudge-game-data-hub", url: "https://grudge-game-data-hub.vercel.app" },
  { project: "grudgedot-launcher", url: "https://grudgedot-launcher.vercel.app" },
  { project: "grudge-id", url: "https://id.grudge-studio.com" },
  { project: "voxel-builder", url: "https://voxel-builder-grudgenexus.vercel.app" },
  { project: "grudge-studio-game", url: "https://grudge-studio-game-grudgenexus.vercel.app" },
  { project: "grand-battle-arena", url: "https://grand-battle-arena-grudgenexus.vercel.app" },
  { project: "grudge-ui-editor", url: "https://ui.grudge-studio.com" },
  { project: "grudge-game-core", url: "https://libs.grudge-studio.com" },
  { project: "grudge-wcs", url: "https://wcs.grudge-studio.com" },
  { project: "the-engine", url: "https://grudge-studio.com" },
];

function color(status) {
  if (status >= 200 && status < 300) return "\x1b[32m";
  if (status >= 300 && status < 400) return "\x1b[36m";
  if (status >= 400 && status < 500) return "\x1b[33m";
  return "\x1b[31m";
}

async function head(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: "HEAD", signal: ctrl.signal, redirect: "follow" });
    return res.status;
  } catch {
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const reset = "\x1b[0m";
  let broken = 0;
  for (const t of TARGETS) {
    const root = await head(t.url);
    const icon = await head(`${t.url.replace(/\/$/, "")}/favicon.ico`);
    const bad = root >= 400 || root === 0 || icon === 404 || icon === 0;
    if (bad) broken++;
    const tag = `[${t.project}]`.padEnd(22);
    process.stdout.write(
      `${color(root)}${String(root || "ERR").padStart(3)}${reset} / ` +
      `${color(icon)}${String(icon || "ERR").padStart(3)}${reset} ico  ${tag} ${t.url}\n`,
    );
  }
  process.stdout.write(`\n${broken}/${TARGETS.length} hosts with root or favicon issues\n`);
}

main().catch(console.error);