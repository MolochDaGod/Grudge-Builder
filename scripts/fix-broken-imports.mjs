#!/usr/bin/env node
/**
 * Fix broken multi-line imports where assetUrl import was inserted
 * inside another import block.
 *
 * Pattern: "import {\nimport { assetUrl } from ...\n  foo,"
 * Fix: Move the assetUrl import after the broken import block.
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

const BROKEN_RE = /import\s*\{\s*\nimport \{ assetUrl \} from "@\/lib\/assetConfig";\n/g;

let total = 0;
for (const fp of walk(SRC)) {
  let c = fs.readFileSync(fp, 'utf-8');
  const orig = c;

  if (BROKEN_RE.test(c)) {
    // Remove the misplaced import line, restore the "import {"
    c = c.replace(BROKEN_RE, 'import {\n');

    // Check if there's already a correct import elsewhere
    if (!c.includes('from "@/lib/assetConfig"') && !c.includes("from '@/lib/assetConfig'")) {
      // Find the end of the last import statement and add it there
      const lastImportEnd = c.lastIndexOf('\nimport ');
      if (lastImportEnd !== -1) {
        // Find the end of that import line (could be multi-line, find the "from" + ";" end)
        let searchFrom = lastImportEnd + 1;
        // Find the next line that ends with a semicolon after "from"
        const fromIdx = c.indexOf(' from ', searchFrom);
        if (fromIdx !== -1) {
          const semiIdx = c.indexOf(';', fromIdx);
          if (semiIdx !== -1) {
            c = c.slice(0, semiIdx + 1) + '\nimport { assetUrl } from "@/lib/assetConfig";' + c.slice(semiIdx + 1);
          }
        }
      }
    }

    if (c !== orig) {
      fs.writeFileSync(fp, c);
      const rel = path.relative(SRC, fp).replace(/\\/g, '/');
      console.log(`  Fixed: ${rel}`);
      total++;
    }
  }
}
console.log(`\nFixed ${total} files`);
