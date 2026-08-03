/**
 * Fix Windows-1252 / UTF-8 mojibake in craft HTML (âœ“ → ✓, âš” → ⚔, ðŸ”© → 🔩).
 *
 * Only rewrites short sequences that re-decode to valid non-ASCII UTF-8 symbols.
 * Leaves real Unicode (—, …, already-correct emoji) untouched.
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, '../client/public');
const SRC = join(PUBLIC, 'grudge-crafting.html');
const CRAFT = join(PUBLIC, 'craft', 'index.html');

/** Unicode → CP1252 byte for mojibake recovery */
const SPECIALS = new Map([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

function toCp1252Byte(cp) {
  if (SPECIALS.has(cp)) return SPECIALS.get(cp);
  if (cp <= 0xff) return cp;
  return null;
}

function tryDecodeSeq(codePoints) {
  const bytes = [];
  for (const cp of codePoints) {
    const b = toCp1252Byte(cp);
    if (b === null) return null;
    bytes.push(b);
  }
  if (bytes[0] < 0xc2) return null; // not a multi-byte UTF-8 start
  const decoded = Buffer.from(bytes).toString('utf8');
  if (decoded.includes('\uFFFD')) return null;
  const outPts = [...decoded];
  // Must compress into fewer characters and produce non-ASCII
  if (outPts.length === 0 || outPts.length >= codePoints.length) return null;
  if (!outPts.some((c) => c.codePointAt(0) > 127)) return null;
  // Avoid "decoding" into control junk
  if (outPts.some((c) => {
    const p = c.codePointAt(0);
    return p < 0x20 && p !== 0x09 && p !== 0x0a && p !== 0x0d;
  })) {
    return null;
  }
  return decoded;
}

/**
 * Greedy left-to-right: at each high/suspicious char, try lengths 4..2
 * for a valid mojibake→UTF-8 decode.
 */
function fixMojibakeSequences(s) {
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  const chars = [...s];
  let out = '';
  let i = 0;
  let fixes = 0;

  while (i < chars.length) {
    const cp = chars[i].codePointAt(0);
    // Fast path: plain ASCII
    if (cp < 0x80) {
      out += chars[i];
      i++;
      continue;
    }

    let best = null;
    for (let len = 4; len >= 2; len--) {
      if (i + len > chars.length) continue;
      const slice = chars.slice(i, i + len).map((c) => c.codePointAt(0));
      // First char must map to a UTF-8 lead byte (≥ C2)
      const b0 = toCp1252Byte(slice[0]);
      if (b0 === null || b0 < 0xc2) continue;
      const decoded = tryDecodeSeq(slice);
      if (decoded) {
        best = { decoded, len };
        break; // longest first already — take first success from 4→2
      }
    }

    if (best) {
      out += best.decoded;
      i += best.len;
      fixes++;
    } else {
      out += chars[i];
      i++;
    }
  }

  return { text: out, fixes };
}

function report(label, s) {
  return {
    label,
    len: s.length,
    a: (s.match(/â/g) || []).length,
    eth: (s.match(/ð/g) || []).length,
    check: s.includes('\u2713'),
    swords: s.includes('\u2694'),
    sparkle: s.includes('\u2728'),
    tent: s.includes('\u26fa'),
    nut: s.includes('\u{1f529}'),
    arrow: s.includes('\u2192'),
    checkCtx: (() => {
      const i = s.indexOf('\u2713');
      return i >= 0 ? JSON.stringify(s.slice(i - 12, i + 8)) : null;
    })(),
  };
}

let wroteSrc = false;
for (const path of [SRC, CRAFT]) {
  if (!existsSync(path)) {
    console.warn('[skip]', path);
    continue;
  }
  const raw = readFileSync(path, 'utf8');
  console.log('[before]', report(path.replace(PUBLIC, 'public'), raw));
  const aBefore = (raw.match(/â/g) || []).length;
  if (aBefore < 10 && (raw.match(/ð/g) || []).length < 10) {
    console.log('[ok] already clean');
    continue;
  }

  const { text: fixed, fixes } = fixMojibakeSequences(raw);
  console.log('[after ]', report(path.replace(PUBLIC, 'public'), fixed), { fixes });

  const aAfter = (fixed.match(/â/g) || []).length;
  if (fixes < 20 || aAfter > aBefore * 0.5) {
    console.warn('[abort] insufficient fixes', { fixes, aBefore, aAfter });
    continue;
  }

  writeFileSync(path, fixed, 'utf8');
  console.log('[wrote]', path);
  if (path === SRC) wroteSrc = true;
}

if (wroteSrc) {
  copyFileSync(SRC, CRAFT);
  console.log('[sync] craft/index.html ← grudge-crafting.html');
}
console.log('[done]');
