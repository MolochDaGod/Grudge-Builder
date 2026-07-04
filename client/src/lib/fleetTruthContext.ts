/**
 * Live fleet context for Legion / AI chat — browser-safe.
 */
import { FLEET_URLS } from "@shared/fleet/manifest";
import { runTruthAudit } from "@/lib/grudgeTruth";

const FLEET_TRUTH_URL =
  "https://objectstore.grudge-studio.com/api/v1/_meta/fleet-truth.json";

export async function buildFleetTruthContext(): Promise<string> {
  const [audit, fleetTruth] = await Promise.all([
    runTruthAudit("browser").catch(() => null),
    fetch(FLEET_TRUTH_URL, { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ]);

  const rules: string[] = fleetTruth?.legionRules ?? [
    "Never invent Cloudflare workers or uptime metrics.",
    "Characters SSOT: Railway Postgres via /api/characters.",
  ];

  const failed =
    audit?.probes.filter((p) => !p.ok).map((p) => `${p.label}: ${p.detail ?? p.status}`) ?? [];

  return [
    "=== GRUDGE FLEET ONE TRUTH ===",
    "Rules:",
    ...rules.map((r) => `- ${r}`),
    audit ? `Probe score: ${audit.score}%` : "Probes: unavailable",
    failed.length ? `Failures: ${failed.join("; ")}` : "",
    fleetTruth
      ? `Published truth v${fleetTruth.version} — services: ${(fleetTruth.services as unknown[])?.length ?? 0}`
      : "",
    `Manifest: ${FLEET_URLS.gameData}/api/fleet/manifest`,
    "=== END ===",
  ]
    .filter(Boolean)
    .join("\n");
}