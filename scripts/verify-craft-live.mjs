import { writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'follow' });
  const text = await res.text();
  return { status: res.status, len: text.length, text, ct: res.headers.get('content-type') };
}

function analyze(label, text) {
  return {
    label,
    len: text.length,
    v5131: text.includes('5.13.1'),
    check: text.includes('\u2713'),
    sparkle: text.includes('\u2728'),
    swords: text.includes('\u2694'),
    mojibakeA: (text.match(/\u00e2/g) || []).length,
    title: (text.match(/<title>[^<]+/) || [])[0] || null,
    isSpaShell: text.includes('Dark Fantasy RPG') && text.includes('/assets/index-'),
  };
}

const urls = [
  'https://grudgewarlords.com/craft/',
  'https://craft.grudgewarlords.com/',
  'https://craft.grudgewarlords.com/crafting-icons/management.png',
  'https://grudgewarlords.com/craft/crafting-icons/management.png',
];

for (const url of urls) {
  try {
    const r = await fetch(url, { redirect: 'follow' });
    if (url.endsWith('.png')) {
      console.log(analyze(url, ''), { status: r.status, ct: r.headers.get('content-type'), bytes: r.headers.get('content-length') });
      continue;
    }
    const text = await r.text();
    console.log(analyze(url, text), { status: r.status });
  } catch (e) {
    console.error(url, e.message);
  }
}
