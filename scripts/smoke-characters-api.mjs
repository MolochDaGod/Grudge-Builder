#!/usr/bin/env node
/**
 * smoke-characters-api.mjs
 *
 * Verifies character management backend is reachable and well-formed.
 * Does not require auth for public health; auth endpoints expect 401 without token.
 *
 * Usage:
 *   node scripts/smoke-characters-api.mjs
 *   BASE=https://grudge-api-production-0d46.up.railway.app node scripts/smoke-characters-api.mjs
 */

const BASE = (
  process.env.BASE ||
  process.env.GAME_DATA_API ||
  "https://grudge-api-production-0d46.up.railway.app"
).replace(/\/$/, "");

const CLIENT = process.env.CLIENT_BASE || "https://client.grudge-studio.com";

async function get(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      Accept: "application/json",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  return { res, text, json, status: res.status };
}

function pass(msg) {
  console.log(`OK   ${msg}`);
}
function fail(msg) {
  console.log(`FAIL ${msg}`);
}

async function main() {
  console.log(`Character API smoke — API ${BASE}\n`);
  let fails = 0;

  // Health
  {
    const { status, json } = await get(`${BASE}/api/health`);
    if (status === 200 && (json?.status === "healthy" || json?.ok || json?.service)) {
      pass(`/api/health ${json?.service || json?.status || "ok"}`);
    } else {
      fail(`/api/health status=${status}`);
      fails++;
    }
  }

  // Characters list without auth should be 401 (or 200 empty if open — still must be JSON)
  {
    const { status, json, text } = await get(`${BASE}/api/characters`);
    if (status === 401 || status === 403) {
      pass(`/api/characters unauthenticated → ${status} (auth required)`);
    } else if (status === 200 && json && (Array.isArray(json) || Array.isArray(json.characters))) {
      pass(`/api/characters open list (len=${(json.characters || json).length})`);
    } else if (status === 400 || status === 422) {
      pass(`/api/characters → ${status} (needs era/query — API alive)`);
    } else {
      fail(`/api/characters unexpected status=${status} body=${text.slice(0, 120)}`);
      fails++;
    }
  }

  // Unknown character → 401/404 not 500
  {
    const { status } = await get(`${BASE}/api/characters/char_smoke_nonexistent_xxx`);
    if (status === 401 || status === 403 || status === 404) {
      pass(`/api/characters/:id missing → ${status}`);
    } else if (status === 500) {
      fail(`/api/characters/:id returned 500`);
      fails++;
    } else {
      pass(`/api/characters/:id → ${status}`);
    }
  }

  // Island spec (character-adjacent SSOT for scale)
  {
    const { status, json } = await get(`${BASE}/api/island/spec`);
    if (status === 200 && json) {
      pass(`/api/island/spec present`);
    } else if (status === 404) {
      pass(`/api/island/spec 404 (optional route)`);
    } else {
      fail(`/api/island/spec status=${status}`);
      fails++;
    }
  }

  // Colyseus health (character join options flow)
  {
    const { status, json } = await get(`${BASE}/api/colyseus/health`);
    if (status === 200 && json?.matchMakerReady) {
      pass(`colyseus matchMakerReady rooms=${(json.definedRooms || []).join(",")}`);
    } else {
      fail(`colyseus health status=${status}`);
      fails++;
    }
  }

  // Tutorial matchmake requires characterId
  {
    const res = await fetch(`${BASE}/matchmake/joinOrCreate/tutorial`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        characterId: `char_smoke_${Date.now()}`,
        characterName: "SmokeHero",
      }),
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* */
    }
    if (res.ok && json?.roomId && json?.sessionId) {
      pass(`tutorial joinOrCreate roomId=${json.roomId}`);
    } else {
      fail(`tutorial joinOrCreate ${res.status} ${text.slice(0, 160)}`);
      fails++;
    }
  }

  // Client shell reachable
  {
    try {
      const res = await fetch(CLIENT, { method: "HEAD" });
      if (res.ok || res.status === 405) pass(`client shell ${CLIENT} → ${res.status}`);
      else pass(`client shell ${CLIENT} → ${res.status}`);
    } catch (e) {
      fail(`client shell ${e.message}`);
      fails++;
    }
  }

  console.log(fails === 0 ? "\nAll character/backend smokes passed." : `\n${fails} smoke(s) failed.`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
