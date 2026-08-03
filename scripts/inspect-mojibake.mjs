import fs from 'fs';

const buf = fs.readFileSync('client/public/grudge-crafting.html');
const s = buf.toString('utf8');

const i2 = s.indexOf('title="Unlocked">');
console.log('unlocked idx', i2);
console.log('slice', JSON.stringify(s.slice(i2, i2 + 40)));
const after = s.slice(i2 + 17, i2 + 30);
console.log(
  'codepoints',
  [...after].map((c) => 'U+' + c.codePointAt(0).toString(16) + ' ' + JSON.stringify(c)),
);

// Find first â (U+00E2)
const ia = s.indexOf('\u00e2');
console.log('first â idx', ia, JSON.stringify(s.slice(ia, ia + 8)));
console.log(
  'cps',
  [...s.slice(ia, ia + 6)].map((c) => 'U+' + c.codePointAt(0).toString(16)),
);

// Bytes around first â in file
const needle = Buffer.from([0xc3, 0xa2]);
const bidx = buf.indexOf(needle);
console.log('byte idx of â utf8', bidx);
console.log(
  'raw bytes',
  [...buf.subarray(bidx, bidx + 10)].map((b) => b.toString(16).padStart(2, '0')).join(' '),
);

// What does classic ftfy expect for checkmark mojibake?
// ✓ UTF-8 = e2 9c 93
// as cp1252: e2=â, 9c=œ, 93="
const checkMoj = 'âœ“';
console.log(
  'hardcoded âœ“ cps',
  [...checkMoj].map((c) => 'U+' + c.codePointAt(0).toString(16)),
);
console.log('file has hardcoded?', s.includes(checkMoj));
console.log('file has âœ?', s.includes('âœ'));

// Count sequences starting with â
let n = 0;
const samples = [];
for (let i = 0; i < s.length; i++) {
  if (s[i] === '\u00e2') {
    n++;
    if (samples.length < 15) {
      samples.push({
        i,
        json: JSON.stringify(s.slice(i, i + 4)),
        cps: [...s.slice(i, i + 4)].map((c) => c.codePointAt(0).toString(16)),
      });
    }
  }
}
console.log('â count', n);
console.log('samples', samples);

// Try mapping one sample with cp1252
function toBytes(str) {
  const specials = {
    0x20ac: 0x80,
    0x201a: 0x82,
    0x0192: 0x83,
    0x201e: 0x84,
    0x2026: 0x85,
    0x2020: 0x86,
    0x2021: 0x87,
    0x02c6: 0x88,
    0x2030: 0x89,
    0x0160: 0x8a,
    0x2039: 0x8b,
    0x0152: 0x8c,
    0x017d: 0x8e,
    0x2018: 0x91,
    0x2019: 0x92,
    0x201c: 0x93,
    0x201d: 0x94,
    0x2022: 0x95,
    0x2013: 0x96,
    0x2014: 0x97,
    0x02dc: 0x98,
    0x2122: 0x99,
    0x0161: 0x9a,
    0x203a: 0x9b,
    0x0153: 0x9c,
    0x017e: 0x9e,
    0x0178: 0x9f,
  };
  const out = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (specials[cp] != null) out.push(specials[cp]);
    else if (cp <= 0xff) out.push(cp);
    else out.push(null);
  }
  return out;
}

for (const sample of samples.slice(0, 5)) {
  const chunk = s.slice(sample.i, sample.i + 4);
  const bytes = toBytes(chunk);
  console.log('try', sample.json, 'bytes', bytes, 'utf8', bytes.every((b) => b != null) ? Buffer.from(bytes).toString('utf8') : 'HAS_NULL');
}
