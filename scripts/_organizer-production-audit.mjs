/**
 * Organizer-driven production audit — status inventory + live HTTP probes.
 * Run: node scripts/_organizer-production-audit.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mapSrc = fs.readFileSync(
  path.join(ROOT, "client/src/data/systemMap.ts"),
  "utf8",
);

// Extract domain-ish nodes: { id, label, status, url? }
const nodeRe =
  /\{\s*id:\s*"([^"]+)"\s*,\s*label:\s*"([^"]+)"\s*,\s*kind:\s*"([^"]+)"\s*,\s*status:\s*"([^"]+)"[^}]*?(?:url:\s*`?([^`",}]+)`?)?/g;

const nodes = [];
let m;
while ((m = nodeRe.exec(mapSrc)) !== null) {
  nodes.push({
    id: m[1],
    label: m[2],
    kind: m[3],
    status: m[4],
    url: m[5]?.replace(/^\$\{[^}]+\}/, "") || null,
  });
}

// Better: pull readiness block
const readiness = [];
const readyRe =
  /serviceId:\s*"([^"]+)"[\s\S]*?https:\s*"([^"]+)"[\s\S]*?cors:\s*"([^"]+)"[\s\S]*?authRequired:\s*"([^"]+)"[\s\S]*?rateLimit:\s*"([^"]+)"[\s\S]*?observability:\s*"([^"]+)"[\s\S]*?backup:\s*"([^"]+)"/g;
while ((m = readyRe.exec(mapSrc)) !== null) {
  readiness.push({
    serviceId: m[1],
    https: m[2],
    cors: m[3],
    authRequired: m[4],
    rateLimit: m[5],
    observability: m[6],
    backup: m[7],
  });
}

const byStatus = {};
for (const n of nodes) {
  byStatus[n.status] = (byStatus[n.status] || 0) + 1;
}

console.log("=== SYSTEM MAP NODE COUNTS ===");
console.log(byStatus);
console.log("nodes parsed", nodes.length);

const broken = nodes.filter((n) => n.status === "broken");
const planned = nodes.filter((n) => n.status === "planned");
const deprecated = nodes.filter((n) => n.status === "deprecated");

console.log("\n=== BROKEN (manifest) ===");
for (const n of broken) console.log(`- [${n.kind}] ${n.label} (${n.id}) ${n.url || ""}`);

console.log("\n=== DEPRECATED (manifest) ===");
for (const n of deprecated.slice(0, 30))
  console.log(`- [${n.kind}] ${n.label} ${n.url || ""}`);

console.log("\n=== READINESS HOLES (missing) ===");
const high = [];
for (const r of readiness) {
  const holes = ["https", "cors", "authRequired", "rateLimit", "observability", "backup"].filter(
    (k) => r[k] === "missing",
  );
  if (holes.length) {
    const sev =
      holes.includes("https") || holes.includes("authRequired") ? "HIGH" : "MED";
    console.log(`${sev} ${r.serviceId}: missing ${holes.join(", ")}`);
    if (sev === "HIGH") high.push(r.serviceId);
  }
}

// Live probes of critical + flagged URLs
const PROBES = [
  { id: "warlords", url: "https://grudgewarlords.com/" },
  { id: "client", url: "https://client.grudge-studio.com/" },
  { id: "id-health", url: "https://id.grudge-studio.com/api/health" },
  { id: "id-login", url: "https://id.grudge-studio.com/login" },
  { id: "railway-health", url: "https://grudge-api-production-0d46.up.railway.app/api/health" },
  { id: "same-origin-auth-me", url: "https://grudgewarlords.com/api/auth/me" },
  { id: "same-origin-characters", url: "https://grudgewarlords.com/api/characters" },
  { id: "same-origin-account", url: "https://grudgewarlords.com/api/account" },
  { id: "legacy-api-health", url: "https://api.grudge-studio.com/api/health" },
  { id: "legacy-api-me", url: "https://api.grudge-studio.com/api/auth/me" },
  { id: "objectstore", url: "https://objectstore.grudge-studio.com/health" },
  { id: "assets", url: "https://assets.grudge-studio.com/icons/weapons/bloodfeud-blade.png" },
  { id: "ai", url: "https://ai.grudge-studio.com/" },
  { id: "ai-health", url: "https://ai.grudge-studio.com/health" },
  { id: "dash", url: "https://dash.grudge-studio.com/" },
  { id: "character", url: "https://character.grudge-studio.com/" },
  { id: "info", url: "https://info.grudge-studio.com/" },
  { id: "account-root", url: "https://account.grudge-studio.com/" },
  { id: "account-api-health", url: "https://account.grudge-studio.com/api/health" },
  { id: "genesis", url: "https://warlord-genesis.vercel.app/" },
  { id: "grudge6", url: "https://grudge6.grudge-studio.com/game/" },
  { id: "engine", url: "https://engine.grudge-studio.com/" },
  { id: "ws", url: "https://ws.grudge-studio.com/" },
  { id: "launcher", url: "https://launcher.grudge-studio.com/" },
  { id: "organizer", url: "https://grudgewarlords.com/organizer" },
  { id: "icon-pack-cdn", url: "https://assets.grudge-studio.com/icons/pack/weapons/Sword_01.png" },
];

console.log("\n=== LIVE PROBES ===");
const results = [];
for (const p of PROBES) {
  try {
    const res = await fetch(p.url, {
      method: p.url.includes("auth/me") || p.url.includes("characters") || p.url.includes("account")
        ? "GET"
        : "GET",
      headers: { Accept: "*/*" },
      redirect: "manual",
    });
    const ct = res.headers.get("content-type") || "";
    const row = {
      id: p.id,
      status: res.status,
      ok: res.ok || res.status === 401 || res.status === 302 || res.status === 301,
      ct: ct.split(";")[0],
      url: p.url,
    };
    // 401 on auth routes = healthy gate
    if (
      (p.id.includes("auth") || p.id.includes("characters") || p.id.includes("account")) &&
      res.status === 401 &&
      ct.includes("json")
    ) {
      row.ok = true;
      row.note = "auth-gated (expected)";
    }
    results.push(row);
    console.log(
      `${row.ok ? "OK " : "BAD"} ${String(res.status).padStart(3)} ${p.id.padEnd(22)} ${ct.split(";")[0] || "-"} ${p.url}`,
    );
  } catch (e) {
    results.push({ id: p.id, ok: false, status: 0, error: String(e.message || e), url: p.url });
    console.log(`FAIL   ${p.id.padEnd(22)} ${e.message || e}`);
  }
}

const bad = results.filter((r) => !r.ok);
console.log("\n=== ACTION QUEUE (failed probes) ===");
for (const b of bad) {
  console.log(`- ${b.id}: ${b.status || b.error} ${b.url}`);
}

// Write markdown report
const md = `# Organizer production audit

**Generated:** ${new Date().toISOString()}  
**Source:** \`client/src/data/systemMap.ts\` + live HTTP probes

## Manifest counts

${Object.entries(byStatus)
  .map(([k, v]) => `- **${k}**: ${v}`)
  .join("\n")}

## Failed / weak live probes

${
  bad.length
    ? bad.map((b) => `- **${b.id}** — \`${b.status || b.error}\` — ${b.url}`).join("\n")
    : "_None_"
}

## Auth-gated OK (401 JSON expected for guests)

${results
  .filter((r) => r.note)
  .map((r) => `- ${r.id}: ${r.status}`)
  .join("\n") || "_None_"}

## Recommended corrections (priority)

1. **ai.grudge-studio.com** — if probe fails 401 on root HTML: redeploy Legion domain worker (\`docs/DEPLOY_OWNERSHIP.md\`).
2. **api.grudge-studio.com** — keep **deprecated** in map; ensure no browser client hardcodes it (portal hydrate must be same-origin).
3. **account.grudge-studio.com** — mark secondary; health path is \`/api/health\` not \`/health\`.
4. **planned domains** (ws, launcher, status, engine) — do not link from player UI until live.
5. **Organizer graph** — use canvas 2D force-graph only (no 3d-force-graph / Collada).
6. **Readiness holes** — fill CORS/auth/rate-limit docs for high-severity services.

## All probe rows

| id | status | ok | content-type |
|----|--------|----|--------------|
${results
  .map(
    (r) =>
      `| ${r.id} | ${r.status || r.error} | ${r.ok ? "yes" : "NO"} | ${r.ct || r.note || ""} |`,
  )
  .join("\n")}
`;

const out = path.join(ROOT, "docs/ORGANIZER_PRODUCTION_AUDIT.md");
fs.writeFileSync(out, md);
console.log("\nWrote", out);
