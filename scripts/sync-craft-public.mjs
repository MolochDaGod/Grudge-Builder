/**
 * Sync WCS craft suite into client/public/craft/ for grudgewarlords.com/craft/
 *
 * Source of truth: client/public/grudge-crafting.html + grudge-fleet.js + crafting-icons/
 * Run before deploy: node scripts/sync-craft-public.mjs
 * Also run from deploy:puter:crafting so Puter + Warlords stay aligned.
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, '../client/public');
const CRAFT = join(PUBLIC, 'craft');
const ICONS = join(PUBLIC, 'crafting-icons');
const SRC_HTML = join(PUBLIC, 'grudge-crafting.html');
const SRC_FLEET = join(PUBLIC, 'grudge-fleet.js');

mkdirSync(join(CRAFT, 'crafting-icons'), { recursive: true });
if (!existsSync(SRC_HTML)) {
  console.error('Missing', SRC_HTML);
  process.exit(1);
}
// Ensure UTF-8 is clean (no CP1252 mojibake like âœ“) before publishing
const html = readFileSync(SRC_HTML, 'utf8');
if ((html.match(/â|ðŸ/g) || []).length >= 20) {
  console.warn('[sync-craft-public] WARNING: mojibake markers in source — run: node scripts/fix-craft-mojibake.mjs');
}
copyFileSync(SRC_HTML, join(CRAFT, 'index.html'));
if (existsSync(SRC_FLEET)) copyFileSync(SRC_FLEET, join(CRAFT, 'grudge-fleet.js'));
if (existsSync(ICONS)) {
  cpSync(ICONS, join(CRAFT, 'crafting-icons'), { recursive: true });
}

// Puter legacy redirect shell (optional deploy to puter.site)
const puterRedirect = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0;url=https://grudgewarlords.com/craft/" />
  <link rel="canonical" href="https://grudgewarlords.com/craft/" />
  <title>Redirecting to Warlords Craft…</title>
  <script>
    location.replace('https://grudgewarlords.com/craft/' + (location.search || '') + (location.hash || ''));
  </script>
</head>
<body style="font-family:system-ui;background:#0a0a10;color:#e8ecf4;padding:2rem;text-align:center">
  <p>Warlords Crafting has moved to the product domain.</p>
  <p><a href="https://grudgewarlords.com/craft/" style="color:#f6c945">Continue to grudgewarlords.com/craft</a></p>
</body>
</html>
`;
writeFileSync(join(PUBLIC, 'grudge-crafting-redirect.html'), puterRedirect);

console.log('[sync-craft-public] → client/public/craft/index.html + icons');
console.log('[sync-craft-public] canonical: https://grudgewarlords.com/craft/');
