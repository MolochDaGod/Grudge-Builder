import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const out = process.env.OUT || 'tmp_cinema_frames';
const base = 'http://127.0.0.1:5173/leviathan-cinema';
const seeks = [
  { t: 1, name: 'show_t01_establish' },
  { t: 8, name: 'show_t08_wards' },
  { t: 16.5, name: 'show_t16_counter' },
  { t: 30, name: 'show_t30_beam' },
  { t: 36, name: 'show_t36_wreck' },
];

await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

for (const { t, name } of seeks) {
  await page.goto(`${base}?seek=${t}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  // Wait until loading overlay is gone (ready)
  try {
    await page.waitForFunction(
      () => {
        const body = document.body?.innerText || '';
        return !body.includes('Loading cinema assets') && !body.includes('LOADING…') && !body.includes('LOADING...');
      },
      { timeout: 90000 },
    );
  } catch {
    console.warn('timeout waiting ready at', t);
  }
  // Let a few frames render after seek
  await page.waitForTimeout(3500);
  const file = path.join(out, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log('shot', t, file);
}

await browser.close();
console.log('done');
