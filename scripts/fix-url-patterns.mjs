#!/usr/bin/env node
/**
 * Fix broken CSS url() and JSX src= patterns after asset rewrite.
 * - "url(assetUrl("/path"))" → `url(${assetUrl("/path")})`
 * - src=assetUrl("/path") → src={assetUrl("/path")}
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '..', 'client', 'src');

function walk(dir) {
  const r = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) r.push(...walk(f));
    else if (/\.(tsx?|jsx?)$/.test(e.name)) r.push(f);
  }
  return r;
}

let total = 0;
for (const fp of walk(SRC)) {
  let c = fs.readFileSync(fp, 'utf-8');
  const orig = c;
  let count = 0;

  // Fix: "url(assetUrl("/path"))" → `url(${assetUrl("/path")})`
  c = c.replace(/"url\(assetUrl\(("[^"]*")\)\)"/g, (m, inner) => {
    count++;
    return '`url(${assetUrl(' + inner + ')})`';
  });

  // Fix: src=assetUrl("/path") → src={assetUrl("/path")}
  c = c.replace(/src=assetUrl\(("[^"]*")\)/g, (m, inner) => {
    count++;
    return 'src={assetUrl(' + inner + ')}';
  });

  if (c !== orig) {
    fs.writeFileSync(fp, c);
    const rel = path.relative(SRC, fp).replace(/\\/g, '/');
    console.log(`  ${rel}: ${count} fixes`);
    total += count;
  }
}
console.log(`\nTotal fixes: ${total}`);
