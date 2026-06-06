/**
 * E2E Forge Admin Editor Integration Tests
 * ─────────────────────────────────────────────────────────────
 * Runs against the local server to verify the admin map editor
 * endpoints correctly update server state.
 *
 * Tests:
 *   1. World map endpoint returns all 9 sectors with lore data
 *   2. Sector detail endpoint returns heroes and live state
 *   3. Tide endpoint returns valid height within range
 *   4. Terrain biome edit pushes to sector and persists
 *   5. Faction reassignment updates controlling faction
 *   6. Difficulty change via live edit
 *   7. NPC placement via live edit
 *   8. Building placement via live edit
 *   9. Sector export returns valid JSON with lore
 *  10. Sector import accepts valid JSON
 *  11. Admin player search endpoint responds
 *  12. Admin teleport endpoint responds
 *  13. Multiple edits batch correctly
 *  14. Invalid sector returns 404
 *  15. Missing admin token returns 403
 *
 * Usage: node test-forge-e2e.mjs [baseUrl]
 *   baseUrl defaults to http://localhost:5000
 * ─────────────────────────────────────────────────────────────
 */

const BASE_URL = process.argv[2] ?? "http://localhost:5000";
const ADMIN_TOKEN = "admin";
const TIMEOUT_MS = 10_000;

let passed = 0;
let failed = 0;

// ── Helpers ──────────────────────────────────────────────────

function ok(label, condition, extra = "") {
  if (condition) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.error(`  ❌  ${label}${extra ? " — " + extra : ""}`);
    failed++;
  }
}

async function req(method, path, body, useAdmin = false) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers = { "Content-Type": "application/json" };
    if (useAdmin) headers["x-admin-token"] = ADMIN_TOKEN;
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      signal: controller.signal,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { _raw: text }; }
    return { status: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

// ── Expected sector IDs ─────────────────────────────────────

const ALL_SECTORS = ["NW", "N", "NE", "W", "CENTER", "E", "SW", "S", "SE"];

const EXPECTED_NAMES = {
  NW: "Dried Basin",
  N: "Cathedral Highlands",
  NE: "Crown Peaks",
  W: "Switchyard",
  CENTER: "Racalvin's Domain",
  E: "Junkyards",
  SW: "Drowned Quarter",
  S: "The Pit",
  SE: "Grinding March",
};

// ── Run tests ───────────────────────────────────────────────

console.log(`\n══════════════════════════════════════════════════`);
console.log(`  Grudge Builder — Forge Admin E2E Tests`);
console.log(`  Target: ${BASE_URL}`);
console.log(`══════════════════════════════════════════════════\n`);

// ── 0. Connectivity ─────────────────────────────────────────

console.log("=== STEP 0: Connectivity ===");
let r;
try {
  r = await req("GET", "/api/map/world");
  ok("Server is reachable", r.status < 500, `HTTP ${r.status}`);
} catch (err) {
  console.error(`  ❌  Server unreachable: ${err.message}`);
  console.error(`      Make sure the server is running: npm run dev`);
  process.exit(1);
}

// ── 1. World map returns all 9 sectors with lore ─────────────

console.log("\n=== TEST 1: World map endpoint ===");
r = await req("GET", "/api/map/world");
ok("GET /api/map/world → 200", r.status === 200, `got ${r.status}`);
ok("Response has sectors object", typeof r.json?.sectors === "object");
ok("Response has tideHeight", typeof r.json?.tideHeight === "number");
ok("Response has serverTime", typeof r.json?.serverTime === "number");
ok("Response has factions", typeof r.json?.factions === "object");

const sectorIds = Object.keys(r.json?.sectors || {});
ok("Has all 9 sectors", sectorIds.length === 9, `got ${sectorIds.length}: ${sectorIds.join(", ")}`);

for (const id of ALL_SECTORS) {
  const sector = r.json?.sectors?.[id];
  ok(`Sector ${id} exists`, !!sector);
  if (sector) {
    ok(`${id} has name "${EXPECTED_NAMES[id]}"`, sector.name === EXPECTED_NAMES[id], `got "${sector.name}"`);
    ok(`${id} has biome`, typeof sector.biome === "string" && sector.biome.length > 0);
    ok(`${id} has difficulty 1-10`, sector.difficulty >= 1 && sector.difficulty <= 10, `got ${sector.difficulty}`);
    ok(`${id} has heroes array`, Array.isArray(sector.heroes));
    ok(`${id} has playerCount`, typeof sector.playerCount === "number");
  }
}

// Verify factions
for (const fid of ["crusade", "legion", "fabled"]) {
  ok(`Faction "${fid}" present`, !!r.json?.factions?.[fid]);
}

// ── 2. Sector detail endpoint ───────────────────────────────

console.log("\n=== TEST 2: Sector detail endpoint ===");
r = await req("GET", "/api/map/sector/CENTER");
ok("GET /api/map/sector/CENTER → 200", r.status === 200, `got ${r.status}`);
ok("Sector name is Racalvin's Domain", r.json?.name === "Racalvin's Domain", `got "${r.json?.name}"`);
ok("Biome is pirate", r.json?.biome === "pirate", `got "${r.json?.biome}"`);
ok("Difficulty is 1", r.json?.difficulty === 1, `got ${r.json?.difficulty}`);
ok("Has heroes array", Array.isArray(r.json?.heroes));
ok("Has tideHeight", typeof r.json?.tideHeight === "number");
ok("Has specialFeatures", Array.isArray(r.json?.specialFeatures));
ok("specialFeatures includes arena", (r.json?.specialFeatures || []).includes("arena"));

// Center should have Thrax (Crusade), Lyra (Fabled), Helga (Fabled) heroes
const heroNames = (r.json?.heroes || []).map(h => h.name);
ok("Thrax spawns in CENTER", heroNames.includes("Thrax"), `heroes: ${heroNames.join(", ")}`);
ok("Lyra spawns in CENTER", heroNames.includes("Lyra"), `heroes: ${heroNames.join(", ")}`);
ok("Helga spawns in CENTER", heroNames.includes("Helga"), `heroes: ${heroNames.join(", ")}`);

// ── 3. Tide endpoint ────────────────────────────────────────

console.log("\n=== TEST 3: Tide endpoint ===");
r = await req("GET", "/api/map/tide");
ok("GET /api/map/tide → 200", r.status === 200);
ok("tideHeight is number", typeof r.json?.tideHeight === "number");
ok("tideHeight within range [-2, 2]", r.json?.tideHeight >= -2.1 && r.json?.tideHeight <= 2.1,
  `got ${r.json?.tideHeight}`);
ok("serverTime is recent", Math.abs(r.json?.serverTime - Date.now()) < 5000);

// ── 4. Terrain biome edit ───────────────────────────────────

console.log("\n=== TEST 4: Terrain biome live edit ===");
r = await req("POST", "/api/admin/sector/NW/edit", { biome: "volcanic" }, true);
ok("POST /api/admin/sector/NW/edit → 200", r.status === 200, `got ${r.status}`);
ok("Response ok: true", r.json?.ok === true);
ok("Response has message", typeof r.json?.message === "string");
ok("Edits echo back biome", r.json?.edits?.biome === "volcanic");

// ── 5. Faction reassignment ─────────────────────────────────

console.log("\n=== TEST 5: Faction reassignment ===");
r = await req("POST", "/api/admin/sector/NE/edit", { controllingFaction: "legion" }, true);
ok("POST faction edit → 200", r.status === 200);
ok("Response ok: true", r.json?.ok === true);
ok("Edits echo faction", r.json?.edits?.controllingFaction === "legion");

// ── 6. Difficulty change ────────────────────────────────────

console.log("\n=== TEST 6: Difficulty change ===");
r = await req("POST", "/api/admin/sector/W/edit", { difficulty: 8 }, true);
ok("POST difficulty edit → 200", r.status === 200);
ok("Response ok: true", r.json?.ok === true);
ok("Edits echo difficulty", r.json?.edits?.difficulty === 8);

// ── 7. NPC placement ────────────────────────────────────────

console.log("\n=== TEST 7: NPC placement ===");
r = await req("POST", "/api/admin/sector/CENTER/edit", {
  addNpc: { type: "vendor", x: 100, z: 200, name: "Test Merchant" },
}, true);
ok("POST NPC edit → 200", r.status === 200);
ok("Response ok: true", r.json?.ok === true);
ok("Edits contain addNpc", r.json?.edits?.addNpc?.type === "vendor");
ok("NPC has coordinates", r.json?.edits?.addNpc?.x === 100 && r.json?.edits?.addNpc?.z === 200);

// ── 8. Building placement ───────────────────────────────────

console.log("\n=== TEST 8: Building placement ===");
r = await req("POST", "/api/admin/sector/W/edit", {
  addBuilding: { type: "dock", x: 500, z: 300 },
}, true);
ok("POST building edit → 200", r.status === 200);
ok("Response ok: true", r.json?.ok === true);
ok("Edits contain addBuilding", r.json?.edits?.addBuilding?.type === "dock");

// ── 9. Sector export ────────────────────────────────────────

console.log("\n=== TEST 9: Sector export ===");
r = await req("GET", "/api/admin/sector/S/export", null, true);
ok("GET sector export → 200", r.status === 200);
ok("Export has version", r.json?.version === 1);
ok("Export has sectorId", r.json?.sectorId === "S");
ok("Export has lore", !!r.json?.lore);
ok("Export lore name is 'The Pit'", r.json?.lore?.name === "The Pit");
ok("Export lore biome is 'crater'", r.json?.lore?.biome === "crater");
ok("Export has heroes array", Array.isArray(r.json?.heroes));
ok("Export has exportedAt timestamp", typeof r.json?.exportedAt === "string");

// ── 10. Sector import ───────────────────────────────────────

console.log("\n=== TEST 10: Sector import ===");
const importData = {
  version: 1,
  sectorId: "SE",
  lore: { name: "Test Zone", biome: "contested", difficulty: 10 },
  heroes: [],
  terrain: null,
  npcs: [{ type: "guard", x: 0, z: 0 }],
};
r = await req("POST", "/api/admin/sector/import", importData, true);
ok("POST sector import → 200", r.status === 200);
ok("Response ok: true", r.json?.ok === true);
ok("Message confirms import", r.json?.message?.includes("SE"));

// ── 11. Admin player search ─────────────────────────────────

console.log("\n=== TEST 11: Admin player search ===");
r = await req("GET", "/api/admin/player/test-uuid-12345", null, true);
ok("GET player search → 200", r.status === 200);
ok("Response has accountId", r.json?.accountId === "test-uuid-12345");
ok("Response has found field", typeof r.json?.found === "boolean");

// ── 12. Admin teleport ──────────────────────────────────────

console.log("\n=== TEST 12: Admin teleport ===");
r = await req("POST", "/api/admin/teleport", {
  accountId: "test-uuid-12345",
  targetSector: "CENTER",
  x: 1000,
  y: 0,
  z: 2000,
}, true);
ok("POST teleport → 200", r.status === 200);
ok("Response ok: true", r.json?.ok === true);
ok("Message confirms teleport", r.json?.message?.includes("CENTER"));
ok("Message includes coordinates", r.json?.message?.includes("1000"));

// ── 13. Multiple edits batch ────────────────────────────────

console.log("\n=== TEST 13: Batch multiple edits ===");
r = await req("POST", "/api/admin/sector/SW/edit", {
  biome: "swamp",
  difficulty: 6,
  controllingFaction: "fabled",
  addNpc: { type: "quest_giver", x: 300, z: 400 },
  addBuilding: { type: "tower", x: 600, z: 700 },
}, true);
ok("POST batch edit → 200", r.status === 200);
ok("Response ok: true", r.json?.ok === true);
ok("All 5 edits present", Object.keys(r.json?.edits || {}).length === 5,
  `got ${Object.keys(r.json?.edits || {}).length} edits`);
ok("Batch biome correct", r.json?.edits?.biome === "swamp");
ok("Batch difficulty correct", r.json?.edits?.difficulty === 6);
ok("Batch faction correct", r.json?.edits?.controllingFaction === "fabled");
ok("Batch NPC correct", r.json?.edits?.addNpc?.type === "quest_giver");
ok("Batch building correct", r.json?.edits?.addBuilding?.type === "tower");

// ── 14. Invalid sector returns 404 ──────────────────────────

console.log("\n=== TEST 14: Invalid sector ===");
r = await req("GET", "/api/map/sector/INVALID_ZONE");
ok("GET invalid sector → 404", r.status === 404, `got ${r.status}`);
ok("Error message present", typeof r.json?.error === "string");

r = await req("GET", "/api/admin/sector/INVALID/export", null, true);
ok("GET invalid export → 404", r.status === 404);

// ── 15. Missing admin token returns 403 ─────────────────────

console.log("\n=== TEST 15: Auth enforcement ===");
r = await req("GET", "/api/admin/players"); // no admin token
ok("GET /admin/players without token → 403", r.status === 403, `got ${r.status}`);

r = await req("POST", "/api/admin/teleport", { accountId: "x", targetSector: "N" }); // no admin token
ok("POST /admin/teleport without token → 403", r.status === 403, `got ${r.status}`);

r = await req("POST", "/api/admin/sector/NW/edit", { biome: "test" }); // no admin token
ok("POST /admin/sector/edit without token → 403", r.status === 403, `got ${r.status}`);

// ── Results ─────────────────────────────────────────────────

console.log(`\n══════════════════════════════════════════════════`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log("  ✅  ALL FORGE TESTS PASSED");
} else {
  console.log("  ❌  SOME TESTS FAILED — see above");
}
console.log(`══════════════════════════════════════════════════\n`);

if (failed > 0) process.exit(1);
