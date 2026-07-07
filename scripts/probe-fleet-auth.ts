#!/usr/bin/env npx tsx
/**
 * probe-fleet-auth.ts — Auth connectivity audit (split-brain detector).
 *
 *   npx tsx scripts/probe-fleet-auth.ts
 *   npx tsx scripts/probe-fleet-auth.ts --json
 *
 * Exits 1 when id.sso-check or id.login is broken (score < 100 on critical probes).
 */
import {
  runAuthConnectAudit,
  FLEET_AUTH_WIRING_GUIDE,
  FLEET_AUTH_SYMPTOM_FIXES,
  matchAuthSymptoms,
  type AuthConnectProbeResult,
} from "../shared/fleet/authConnect.ts";

const jsonOut = process.argv.includes("--json");

function color(ok: boolean) {
  return ok ? "\x1b[32m" : "\x1b[31m";
}

async function main() {
  const { probes, score, corrections } = await runAuthConnectAudit();

  if (jsonOut) {
    console.log(
      JSON.stringify(
        {
          score,
          corrections,
          probes,
          guide: FLEET_AUTH_WIRING_GUIDE,
          symptomFixes: FLEET_AUTH_SYMPTOM_FIXES,
        },
        null,
        2,
      ),
    );
  } else {
    console.log("\nGrudge Fleet — Auth connectivity\n");
    for (const p of probes) {
      const c = color(p.ok);
      const code = String(p.status ?? "ERR").padStart(3);
      console.log(`${c}${code}\x1b[0m  ${p.label}`);
      console.log(`      ${p.url}`);
      if (p.detail) console.log(`      → ${p.detail}`);
      if (!p.ok && p.fix) console.log(`      \x1b[33mfix:\x1b[0m ${p.fix}`);
    }
    console.log(`\nScore: ${score}%`);
    if (corrections.length) {
      console.log("\nCorrections required:");
      corrections.forEach((c) => console.log(`  • ${c}`));
    }
    const failed = probes.filter((p) => !p.ok);
    if (failed.length) {
      console.log("\nSymptom fixes (for broken apps):");
      const seen = new Set<string>();
      for (const p of failed) {
        const fixes = matchAuthSymptoms(`${p.detail ?? ""} ${p.url}`, p.id);
        for (const f of fixes) {
          if (seen.has(f.id)) continue;
          seen.add(f.id);
          console.log(`  [${f.id}] ${f.symptom}`);
          console.log(`      → ${f.fix}`);
        }
      }
    }
    console.log("\nCanonical wiring:");
    FLEET_AUTH_WIRING_GUIDE.browserApps.forEach((line) => console.log(`  ${line}`));
  }

  const critical = probes.filter(
    (p: AuthConnectProbeResult) =>
      (p.id === "id-login" || p.id === "id-sso-check" || p.id === "railway-sso-check") && !p.ok,
  );
  if (critical.length > 0 && !process.argv.includes("--lenient")) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});