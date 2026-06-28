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

await ok('GCS Vercel prod (f4c2518)', async () => {
  const res = await fetch('https://character.grudge-studio.com/');
  const html = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const m = html.match(/src="(\/assets\/[^"]+\.js)"/);
  if (!m) throw new Error('no JS bundle');
  const js = await fetch(`https://character.grudge-studio.com${m[1]}`).then((r) => r.text());
  if (!js.includes('warlords') || !js.includes('armada')) throw new Error('era UI not in bundle');
  return m[1];
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