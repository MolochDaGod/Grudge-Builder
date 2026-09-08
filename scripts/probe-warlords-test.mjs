/** Read-only HTTP readiness gate. Does not claim gameplay or load-test coverage. */
const origin = new URL(process.argv[2] || 'https://test.grudge-studio.com');
const allowedCanonicalHosts = new Set([
  'test.grudge-studio.com',
  'grudgewarlords.com',
  'client.grudge-studio.com',
]);
if (origin.protocol !== 'https:' || origin.username || origin.password ||
    !(allowedCanonicalHosts.has(origin.hostname) || origin.hostname.endsWith('.vercel.app'))) {
  throw new Error('Expected a canonical Grudge origin or an HTTPS Vercel preview URL.');
}
const headers = { 'Cache-Control': 'no-cache' };
if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
  headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
}
const checks = [
  ['/intro', 'html'],
  ['/lobby', 'html'],
  ['/lobby/maps', 'html'],
  ['/account', 'html'],
  ['/deployments', 'html'],
  ['/release.json', 'release'],
  ['/tutorial', 'html'],
  ['/home-island', 'html'],
  ['/world-map', 'html'],
  ['/play?sector=haven_shore&mode=zone&city=haven_port', 'html'],
  ['/lore', 'lore'],
  ['/api/health', 'json'],
  ['/api/colyseus/health', 'json'],
];
const results = await Promise.allSettled(checks.map(async ([path, kind]) => {
  const response = await fetch(new URL(path, origin.origin), {
    headers, redirect: 'manual', signal: AbortSignal.timeout(20000),
  });
  if (response.status !== 200) throw new Error(`${path}: HTTP ${response.status}`);
  const mime = response.headers.get('content-type') || '';
  if (!mime.includes(['json', 'release'].includes(kind) ? 'application/json' : 'text/html')) {
    throw new Error(`${path}: unexpected content type (possible SPA fallback)`);
  }
  if (kind === 'json' || kind === 'release') {
    const data = await response.json();
    if (kind === 'release' && process.env.PROBE_EXPECT_RELEASE !== 'false' && process.env.GITHUB_SHA && data.commit !== process.env.GITHUB_SHA) {
      throw new Error(`${path}: deployment commit does not match this build`);
    }
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
        data.error || data.ok === false || data.success === false ||
        ['error', 'unhealthy', 'degraded', 'down'].includes(data.status)) {
      throw new Error(`${path}: service reports unhealthy response`);
    }
  } else {
    const html = await response.text();
    if (kind === 'lore') {
      if (!html.includes('Lore Library | Grudge Studio') ||
          !html.includes('/lore/tome-of-seasons-and-gods.html')) {
        throw new Error(`${path}: expected canonical lore library and Black Tome link`);
      }
    } else if (!html.includes('<script') || !/id=["']root["']/.test(html)) {
      throw new Error(`${path}: expected React game shell`);
    }
  }
  console.log(`PASS ${path}`);
}));
const failures = results.filter(r => r.status === 'rejected');
for (const failure of failures) console.error(failure.reason.message);
if (failures.length) process.exitCode = 1;
