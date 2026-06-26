#!/usr/bin/env npx tsx
/**
 * probe-truth-fleet.ts — ONE TRUTH fleet probe CLI (shared manifest).
 *
 *   npx tsx scripts/probe-truth-fleet.ts
 *   npx tsx scripts/probe-truth-fleet.ts --json
 *   npx tsx scripts/probe-truth-fleet.ts --base https://client.grudge-studio.com
 *
 * Exits 1 when score &lt; 85 or split-brain issues are detected (--strict, default).
 */
import {
  buildTruthProbes,
  probeTruthEndpoint,
  detectSplitBrain,
  scoreTruthProbes,
  type TruthProbe,
} from "../shared/fleet/truthProbes.ts";

const TIMEOUT_MS = 12_000;
const args = process.argv.slice(2);
const jsonOut = args.includes("--json");
const lenient = args.includes("--lenient");
const baseIdx = args.indexOf("--base");
const base = (() => {
  if (baseIdx >= 0 && args[baseIdx + 1]) {
    return args[baseIdx + 1].replace(/\/$/, "");
  }
  if (process.env.TRUTH_PROBE_BASE) {
    return process.env.TRUTH_PROBE_BASE.replace(/\/$/, "");
  }
  return null;
})();

function color(ok: boolean | undefined) {
  return ok ? "\x1b[32m" : "\x1b[31m";
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function toBrowserUrl(probe: TruthProbe): TruthProbe {
  if (!base || !probe.browserPath) return probe;
  return { ...probe, url: `${base}${probe.browserPath}` };
}

async function main() {
  const mode = base ? "browser" : "cli";
  let probes = buildTruthProbes(mode);
  if (base) probes = probes.map(toBrowserUrl);

  const results = await Promise.all(
    probes.map((p) =>
      probeTruthEndpoint(p, (url, init) => fetchWithTimeout(String(url), init ?? {})),
    ),
  );

  const score = scoreTruthProbes(results);
  const splitBrain = detectSplitBrain(results);

  if (jsonOut) {
    console.log(
      JSON.stringify({ score, splitBrain, probes: results }, null, 2),
    );
  } else {
    const reset = "\x1b[0m";
    const label = base ? `ONE TRUTH via ${base}` : "ONE TRUTH (production URLs)";
    console.log(`\n${label}\n`);
    for (const p of results) {
      const c = color(p.ok);
      const code = String(p.status ?? "ERR").padStart(3);
      const tail = p.ok ? p.detail ?? "" : p.detail ?? "";
      process.stdout.write(
        `${c}${code}${reset}  ${p.label.padEnd(22)} ${p.url}\n`,
      );
      if (tail && !p.ok) process.stdout.write(`      → ${tail}\n`);
    }
    console.log(`\nScore: ${score}%`);
    if (splitBrain.length) {
      console.log("\nSplit-brain:");
      splitBrain.forEach((s) => console.log(`  • ${s}`));
    }
  }

  const fail =
    !lenient && (score < 85 || splitBrain.length > 0);
  if (fail) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});