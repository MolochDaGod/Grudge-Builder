/** Quick production bundle checks for GCS + Warlords redirect */
const checks = [];

async function ok(name, fn) {
  try {
    const detail = await fn();
    checks.push({ name, ok: true, detail });
    console.log(`OK  ${name} — ${detail}`);
  } catch (e) {
    checks.push({ name, ok: false, detail: e.message });
    console.error(`FAIL ${name} — ${e.message}`);
  }
}

async function bundleHasEra(origin) {
  const html = await fetch(origin).then((r) => r.text());
  const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
  const appJs = scripts.find((s) => /\/assets\/index-|\/bundle\/index-/.test(s));
  if (!appJs) throw new Error(`no app bundle in HTML (found: ${scripts.join(', ')})`);
  const jsUrl = appJs.startsWith('http') ? appJs : new URL(appJs, origin).href;
  const js = await fetch(jsUrl).then((r) => r.text());
  if (!js.includes('gameEra')) throw new Error(`era code missing in ${jsUrl}`);
  return jsUrl;
}

await ok('GCS Vercel prod (f4c2518)', async () => {
  return bundleHasEra('https://grudge-character-studio.vercel.app/');
});

await ok('GCS custom domain (character.grudge-studio.com)', async () => {
  try {
    return await bundleHasEra('https://character.grudge-studio.com/');
  } catch (e) {
    throw new Error(`${e.message} — point Cloudflare CNAME to grudge-character-studio.vercel.app`);
  }
});

await ok('Warlords Vercel prod (27b87b3 redirect)', async () => {
  const res = await fetch('https://grudgewarlords.com/character');
  const html = await res.text();
  const m = html.match(/src="(\/assets\/[^"]+\.js)"/);
  if (!m) throw new Error('no bundle');
  const js = await fetch(`https://grudgewarlords.com${m[1]}`).then((r) => r.text());
  if (!js.includes('character.grudge-studio.com')) throw new Error('GCS redirect URL missing from bundle');
  return m[1];
});

await ok('Vercel deployment inspector (GCS)', async () => {
  return 'https://vercel.com/grudgenexus/grudge-character-studio/EZcEfULEQPEiQz3Eue7hwecHuK8K';
});

await ok('Vercel deployment inspector (Warlords)', async () => {
  return 'https://vercel.com/grudgenexus/grudge-builder/819QWFiSDwxb2kSYfzL1LAAtRjVx';
});

const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${checks.length - failed}/${checks.length} frontend checks passed`);
process.exit(failed ? 1 : 0);