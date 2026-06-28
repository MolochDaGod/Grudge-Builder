#!/usr/bin/env node
/**
 * Smoke-test grudge_token → grudge-bridge → /api/characters for fleet Puter apps.
 * Usage: node scripts/smoke-grudge-bridge.mjs [launchToken]
 */
const GAME = process.env.GAME_API ?? "https://grudge-api-production-0d46.up.railway.app";
const token = process.argv[2] || process.env.GRUDGE_LAUNCH_TOKEN;

if (!token) {
  console.error("Usage: node scripts/smoke-grudge-bridge.mjs <grudge_token>");
  process.exit(1);
}

const bridge = await fetch(`${GAME}/api/auth/grudge-bridge`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token, audience: "https://grudge-crafting.puter.site" }),
});

if (!bridge.ok) {
  console.error(`grudge-bridge FAIL ${bridge.status}:`, await bridge.text());
  process.exit(1);
}

const session = await bridge.json();
const jwt = session.sessionToken || session.token;
console.log("grudge-bridge OK", session.grudgeId, session.username);

const chars = await fetch(`${GAME}/api/characters?era=warlords`, {
  headers: { Authorization: `Bearer ${jwt}`, "X-Session-Token": jwt },
});
const raw = await chars.json();
const list = Array.isArray(raw) ? raw : raw.characters ?? [];

if (!chars.ok) {
  console.error(`characters FAIL ${chars.status}:`, raw);
  process.exit(1);
}

console.log(`characters OK: ${list.length} warlords heroes`);
for (const c of list.slice(0, 5)) {
  console.log(`  - ${c.name} (${c.raceId}/${c.classId}) userId=${c.userId}`);
}
process.exit(list.length > 0 ? 0 : 1);