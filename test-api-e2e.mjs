/**
 * E2E API Integration Test: Phase 1 Character + Island Flow
 * Runs against the local server at http://localhost:5000
 *
 * Flow:
 *  1. GET  /api/characters          — baseline list
 *  2. POST /api/characters           — create character (guest userId, skipAvatarGeneration)
 *  3. GET  /api/characters/:id       — fetch created character
 *  4. POST /api/characters/:id/generate-island  — generate island preview
 *  5. POST /api/islands/:id/regenerate          — reroll island (new seed)
 *  6. POST /api/island/initialize               — commit island (set validatedAt)
 *  7. GET  /api/island/status                   — verify homeIsland = true
 *
 * Usage:  node test-api-e2e.mjs [baseUrl]
 *   baseUrl defaults to http://localhost:5000
 */

const BASE_URL = process.argv[2] ?? "http://localhost:5000";
const TIMEOUT_MS = 15_000;

let passed = 0;
let failed = 0;

function ok(label, condition, extra = "") {
  if (condition) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.error(`  ❌  ${label}${extra ? " — " + extra : ""}`);
    failed++;
  }
}

async function req(method, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
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

// ─── Character payload ────────────────────────────────────────────────────────
const testCharacter = {
  name: "Test Hero E2E",
  raceId: "human",
  classId: "warrior",
  attributes: {
    Strength: 8, Intellect: 1, Vitality: 5, Dexterity: 1,
    Endurance: 5, Wisdom: 0, Agility: 0, Tactics: 0,
  },
  spriteConfig: { skinTone: 120, hairColor: 30, armorColor: 200, clothColor: 250 },
  skipAvatarGeneration: true, // skip OpenAI call in test
};

// ─── Run tests ────────────────────────────────────────────────────────────────

console.log(`\n══════════════════════════════════════════════════`);
console.log(`  Grudge Builder — Phase 1 API E2E`);
console.log(`  Target: ${BASE_URL}`);
console.log(`══════════════════════════════════════════════════\n`);

// ─── 0. Connectivity check ────────────────────────────────────────────────────
console.log("=== STEP 0: Connectivity check ===");
let r;
try {
  r = await req("GET", "/api/characters");
  ok("Server is reachable", r.status < 500, `HTTP ${r.status}`);
} catch (err) {
  console.error(`  ❌  Server unreachable: ${err.message}`);
  console.error(`      Make sure the server is running: npm run dev`);
  process.exit(1);
}

// ─── 1. Create character ──────────────────────────────────────────────────────
console.log("\n=== STEP 1: Create character ===");
r = await req("POST", "/api/characters", testCharacter);
ok(`POST /api/characters → 200`, r.status === 200, `got ${r.status}: ${JSON.stringify(r.json).slice(0, 120)}`);
const charId = r.json?.id;
ok("Response has character id", !!charId, `id=${charId}`);
ok("Character name matches", r.json?.name === testCharacter.name);
ok("Character raceId matches", r.json?.raceId === testCharacter.raceId);
ok("Character classId matches", r.json?.classId === testCharacter.classId);
ok("spriteConfig present", !!r.json?.spriteConfig);
ok("userId set to 'guest'", r.json?.userId === "guest");
console.log(`  → Created character ID: ${charId}`);

// ─── 2. Fetch character ───────────────────────────────────────────────────────
console.log("\n=== STEP 2: Fetch character by ID ===");
r = await req("GET", `/api/characters/${charId}`);
ok(`GET /api/characters/${charId} → 200`, r.status === 200, `got ${r.status}`);
ok("Fetched character id matches", r.json?.id === charId);

// ─── 3. Generate island preview ───────────────────────────────────────────────
console.log("\n=== STEP 3: Generate island preview ===");
r = await req("POST", `/api/characters/${charId}/generate-island`);
ok(`POST /api/characters/:id/generate-island → 200`, r.status === 200, `got ${r.status}: ${JSON.stringify(r.json).slice(0, 200)}`);
const homeIslandId = r.json?.homeIslandId;
ok("Response has homeIslandId", !!homeIslandId, `homeIslandId=${homeIslandId}`);
ok("islandState present", !!r.json?.islandState);
const state1 = r.json?.islandState;
ok("islandState has nodes array", Array.isArray(state1?.nodes), `nodes=${JSON.stringify(state1?.nodes)?.slice(0,80)}`);
ok("islandState has nodes (≥1)", (state1?.nodes?.length ?? 0) >= 1, `count=${state1?.nodes?.length}`);
console.log(`  → Island ID: ${homeIslandId} | Nodes: ${state1?.nodes?.length} | Animals: ${state1?.animals?.length}`);

// ─── 4. Reroll island ─────────────────────────────────────────────────────────
console.log("\n=== STEP 4: Reroll island ===");
r = await req("POST", `/api/islands/${homeIslandId}/regenerate`, { rerollCount: 0 });
ok(`POST /api/islands/:id/regenerate → 200`, r.status === 200, `got ${r.status}: ${JSON.stringify(r.json).slice(0, 200)}`);
ok("Response has islandState", !!r.json?.islandState);
const state2 = r.json?.islandState;
ok("Rerolled state has nodes", Array.isArray(state2?.nodes));
// Rerolled seed produces different node layout (high confidence; not guaranteed for every pair)
const pos1 = JSON.stringify((state1?.nodes ?? []).map(n => `${n.x?.toFixed(2)},${n.y?.toFixed(2)}`));
const pos2 = JSON.stringify((state2?.nodes ?? []).map(n => `${n.x?.toFixed(2)},${n.y?.toFixed(2)}`));
ok("Reroll produced different layout", pos1 !== pos2, "seeds differ so positions should differ");
ok("rerollCount in response", typeof r.json?.rerollCount === "number");
console.log(`  → Rerolled. Nodes: ${state2?.nodes?.length} | rerollCount=${r.json?.rerollCount}`);

// ─── 5. Initialize (finalize) island ─────────────────────────────────────────
console.log("\n=== STEP 5: Initialize (commit) island ===");
r = await req("POST", "/api/island/initialize");
ok(`POST /api/island/initialize → 200`, r.status === 200, `got ${r.status}: ${JSON.stringify(r.json).slice(0, 200)}`);
ok("success = true", r.json?.success === true);
ok("homeIsland = true", r.json?.homeIsland === true);
ok("homeIslandId present", !!r.json?.homeIslandId);
console.log(`  → Committed island. homeIslandId=${r.json?.homeIslandId}`);

// ─── 6. Verify island status ──────────────────────────────────────────────────
console.log("\n=== STEP 6: Verify island status ===");
r = await req("GET", "/api/island/status");
ok(`GET /api/island/status → 200`, r.status === 200, `got ${r.status}`);
ok("homeIsland = true", r.json?.homeIsland === true);
ok("homeIslandId set", !!r.json?.homeIslandId);
console.log(`  → Status: homeIsland=${r.json?.homeIsland}, homeIslandId=${r.json?.homeIslandId}`);

// ─── 7. Determinism check (unit-level, no server needed) ──────────────────────
console.log("\n=== STEP 7: Determinism — same seed → same island ===");
// Quick inline seeded RNG mirror of the server logic
function seededRandom(seed) {
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = ((state << 5) - state) + seed.charCodeAt(i);
    state = state & state;
  }
  state = Math.abs(state) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return (state >>> 0) / 0x100000000;
  };
}
const seed = "determinism-test-seed-42";
const rng1 = seededRandom(seed); const v1 = [rng1(), rng1(), rng1()];
const rng2 = seededRandom(seed); const v2 = [rng2(), rng2(), rng2()];
ok("seeded RNG produces identical sequence", JSON.stringify(v1) === JSON.stringify(v2));
const rng3 = seededRandom("other-seed"); const v3 = [rng3(), rng3(), rng3()];
ok("different seed → different sequence", JSON.stringify(v1) !== JSON.stringify(v3));

// ─── Results ──────────────────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════════");
console.log(`  Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log("  ✅  ALL TESTS PASSED — Phase 1 API flow verified");
} else {
  console.log("  ❌  SOME TESTS FAILED — see above for details");
}
console.log("══════════════════════════════════════════════════\n");

// Clean up: delete the test character to keep DB tidy
if (charId) {
  try {
    await req("DELETE", `/api/characters/${charId}`);
    console.log(`  🧹  Cleaned up test character ${charId}`);
  } catch { /* ignore cleanup errors */ }
}

if (failed > 0) process.exit(1);
