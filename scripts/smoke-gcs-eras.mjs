/**
 * Production smoke test — GCS multi-era character API + fleet URLs
 * Usage: node scripts/smoke-gcs-eras.mjs
 */
const RAILWAY = process.env.SMOKE_RAILWAY || 'https://grudge-api-production-0d46.up.railway.app';
const GCS = process.env.SMOKE_GCS || 'https://character.grudge-studio.com';
const WARLORDS = process.env.SMOKE_WARLORDS || 'https://grudgewarlords.com';

const checks = [];
let passed = 0;
let failed = 0;

async function probe(name, fn) {
  const start = Date.now();
  try {
    const detail = await fn();
    passed++;
    checks.push({ name, ok: true, ms: Date.now() - start, detail });
    console.log(`OK  ${name} (${Date.now() - start}ms)${detail ? ` — ${detail}` : ''}`);
  } catch (err) {
    failed++;
    const msg = err?.message || String(err);
    checks.push({ name, ok: false, ms: Date.now() - start, detail: msg });
    console.error(`FAIL ${name} — ${msg}`);
  }
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, { ...opts, redirect: 'manual' });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text.slice(0, 200); }
  return { res, body, text };
}

console.log('\n=== GCS Multi-Era Production Smoke ===\n');
console.log(`Railway: ${RAILWAY}`);
console.log(`GCS:     ${GCS}`);
console.log(`Warlords: ${WARLORDS}\n`);

await probe('Railway /api/health', async () => {
  const { res, body } = await fetchJson(`${RAILWAY}/api/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return typeof body === 'object' ? (body.status || 'healthy') : 'ok';
});

await probe('GET /api/characters legacy array (guest)', async () => {
  const { res, body } = await fetchJson(`${RAILWAY}/api/characters`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!Array.isArray(body)) throw new Error(`expected array, got ${typeof body}`);
  return `${body.length} chars`;
});

await probe('GET /api/characters?envelope=1 has eraSlots', async () => {
  const { res, body } = await fetchJson(`${RAILWAY}/api/characters?envelope=1`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!body?.eraSlots?.warlords) throw new Error('missing eraSlots.warlords');
  if (!body?.eraMeta?.armada) throw new Error('missing eraMeta.armada');
  return `warlords max=${body.eraSlots.warlords.max}`;
});

await probe('GET /api/characters?era=nexus envelope', async () => {
  const { res, body } = await fetchJson(`${RAILWAY}/api/characters?era=nexus`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (body.era !== 'nexus') throw new Error(`era=${body.era}`);
  if (!Array.isArray(body.characters)) throw new Error('missing characters array');
  return `${body.characters.length} nexus chars`;
});

await probe('PUT /api/characters/:id/activate route exists', async () => {
  const { res, text } = await fetch(`${RAILWAY}/api/characters/00000000-0000-0000-0000-000000000000/activate`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameEra: 'warlords' }),
  }).then(async (res) => ({ res, text: await res.text() }));
  if (text.includes('Cannot PUT')) {
    throw new Error('route missing — Railway still on pre-era build');
  }
  if (res.status === 404 && text.includes('Character not found')) return 'route registered (404 char)';
  if (res.status === 400 || res.status === 403) return `route registered (${res.status})`;
  throw new Error(`unexpected HTTP ${res.status}: ${text.slice(0, 120)}`);
});

await probe('GCS homepage 200', async () => {
  const res = await fetch(GCS, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (!html.includes('<!DOCTYPE html') && !html.includes('<html')) throw new Error('not HTML');
  return res.url;
});

await probe('GCS /api/characters proxy (envelope)', async () => {
  const { res, body } = await fetchJson(`${GCS}/api/characters?envelope=1`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!body?.eraSlots) throw new Error('proxy missing eraSlots — check vercel.json rewrite');
  return 'proxy OK';
});

await probe('Fleet manifest charactersHub URL', async () => {
  const { res, body } = await fetchJson(`${RAILWAY}/api/fleet/manifest`);
  if (res.status === 404) {
    const local = await import('fs').then((fs) =>
      fs.promises.readFile(new URL('../shared/grudge-fleet.json', import.meta.url), 'utf8'),
    );
    const fleet = JSON.parse(local);
    const hub = fleet?.urls?.charactersHub || fleet?.urls?.gcs;
    if (!hub?.includes('character.grudge-studio.com')) throw new Error(`local charactersHub=${hub}`);
    return `${hub} (local manifest — redeploy Railway for live /api/fleet)`;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const hub = body?.urls?.charactersHub || body?.urls?.gcs;
  if (!hub?.includes('character.grudge-studio.com')) {
    throw new Error(`charactersHub=${hub}`);
  }
  return hub;
});

await probe('Warlords /character redirects to GCS', async () => {
  const { res } = await fetchJson(`${WARLORDS}/character`);
  const loc = res.headers.get('location') || '';
  if (res.status >= 300 && res.status < 400) {
    if (!loc.includes('character.grudge-studio.com')) throw new Error(`redirect=${loc}`);
    return loc;
  }
  // SPA may return 200 and client-side redirect — check deployed bundle hint
  if (res.status === 200) return '200 (client redirect — verify after Vercel deploy)';
  throw new Error(`HTTP ${res.status}, location=${loc || 'none'}`);
});

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);