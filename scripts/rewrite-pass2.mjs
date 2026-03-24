#!/usr/bin/env node
/**
 * rewrite-pass2.mjs — Second pass to catch template literal asset paths
 * that were skipped because /icons/ and /sprites/ map to the same prefix.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '..', 'client', 'src');
const IMPORT_LINE = 'import { assetUrl } from "@/lib/assetConfig";';

// Match backtick template literals with asset paths NOT already wrapped in assetUrl()
const RE = /(?<!assetUrl\()(`\/(icons|sprites|lore|avatars|terrain)\/[^`]+?`)(?!\s*\))/g;

function walk(dir) {
  const r = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) r.push(...walk(f));
    else if (/\.(tsx?|jsx?)$/.test(e.name) && !f.includes('assetConfig.ts')) r.push(f);
  }
  return r;
}

let total = 0;
for (const fp of walk(SRC)) {
  let c = fs.readFileSync(fp, 'utf-8');
  const orig = c;
  let count = 0;
  c = c.replace(RE, (m, tpl) => { count++; return 'assetUrl(' + tpl + ')'; });
  if (c !== orig) {
    // Add import if needed
    if (!c.includes('from "@/lib/assetConfig"') && !c.includes("from '@/lib/assetConfig'")) {
      const idx = c.lastIndexOf('\nimport ');
      if (idx !== -1) {
        const end = c.indexOf('\n', idx + 1);
        c = c.slice(0, end + 1) + IMPORT_LINE + '\n' + c.slice(end + 1);
      } else {
        c = IMPORT_LINE + '\n' + c;
      }
    }
    fs.writeFileSync(fp, c);
    const rel = path.relative(SRC, fp).replace(/\\/g, '/');
    console.log(`  ${rel}: ${count}`);
    total += count;
  }
}
console.log(`\nTotal second-pass replacements: ${total}`);
