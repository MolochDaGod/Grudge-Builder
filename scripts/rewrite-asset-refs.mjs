#!/usr/bin/env node
/**
 * rewrite-asset-refs.mjs
 *
 * Rewrites all static asset path references in client/src/ to use assetUrl()
 * from @/lib/assetConfig, using the migration manifest for path mapping.
 *
 * Usage:
 *   node scripts/rewrite-asset-refs.mjs            # dry-run
 *   node scripts/rewrite-asset-refs.mjs --execute   # apply changes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.resolve(__dirname, '..', 'client', 'src');
const MANIFEST_PATH = path.resolve(__dirname, '..', 'asset-migration-manifest.json');
const EXECUTE = process.argv.includes('--execute');

// Load manifest
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));

// Path prefix mappings (old prefix → new prefix for ObjectStore)
const PREFIX_MAP = [
  { old: '/assets/backgrounds/', new: '/backgrounds/' },
  { old: '/assets/events/',      new: '/images/events/' },
  { old: '/assets/misc/',        new: '/images/misc/' },
  { old: '/assets/pirate/',      new: '/sprites/pirate/' },
  { old: '/assets/portraits/',   new: '/images/portraits/' },
  { old: '/assets/professions/', new: '/images/professions/' },
  { old: '/assets/ui/',          new: '/images/ui/' },
  { old: '/icons/',              new: '/icons/' },
  { old: '/sprites/',            new: '/sprites/' },
  { old: '/lore/',               new: '/images/lore/' },
  { old: '/avatars/',            new: '/images/avatars/' },
  { old: '/terrain/',            new: '/images/terrain/' },
];

function mapPath(oldPath) {
  for (const m of PREFIX_MAP) {
    if (oldPath.startsWith(m.old)) {
      return m.new + oldPath.slice(m.old.length);
    }
  }
  return null;
}

// Walk .ts/.tsx files
function walkTs(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkTs(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

const IMPORT_LINE = `import { assetUrl } from "@/lib/assetConfig";`;

// Patterns to match:
// 1. String literals: "/assets/backgrounds/general.png"  or  '/sprites/gbux-token.png'
// 2. Template literals inside backtick strings: `/icons/weapons/${type}/${name}.png`
// 3. Assignments like: const foo = "/assets/ui/bar.png";

// Regex to find static string asset paths (double or single quoted)
const STATIC_PATH_RE = /(?<quote>["'])(?<path>\/(?:assets\/(?:backgrounds|events|misc|pirate|portraits|professions|ui)|icons|sprites|lore|avatars|terrain)\/[^"']+?)(?:\k<quote>)/g;

// Regex to find template literal asset paths  
const TEMPLATE_PATH_RE = /`(?<path>\/(?:assets\/(?:backgrounds|events|misc|pirate|portraits|professions|ui)|icons|sprites|lore|avatars|terrain)\/[^`]+?)`/g;

let totalFiles = 0;
let modifiedFiles = 0;
let totalReplacements = 0;

const files = walkTs(SRC_DIR);

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const origContent = content;
  let replacements = 0;
  const relPath = path.relative(SRC_DIR, filePath).replace(/\\/g, '/');

  // Skip assetConfig.ts itself
  if (relPath === 'lib/assetConfig.ts') continue;

  totalFiles++;

  // Replace static string paths: "/assets/backgrounds/general.png" → assetUrl("/backgrounds/general.png")
  content = content.replace(STATIC_PATH_RE, (match, quote, oldPath) => {
    const newPath = mapPath(oldPath);
    if (!newPath) return match;
    replacements++;
    return `assetUrl("${newPath}")`;
  });

  // Replace template literal paths: `/icons/weapons/${type}/foo.png` → assetUrl(`/icons/weapons/${type}/foo.png`)
  content = content.replace(TEMPLATE_PATH_RE, (match, oldPath) => {
    // Map the static prefix part
    let mapped = oldPath;
    for (const m of PREFIX_MAP) {
      if (oldPath.startsWith(m.old)) {
        mapped = m.new + oldPath.slice(m.old.length);
        break;
      }
    }
    if (mapped === oldPath) return match;
    replacements++;
    return `assetUrl(\`${mapped}\`)`;
  });

  // If we made replacements, ensure the import exists
  if (replacements > 0 && !content.includes('assetUrl')) {
    // Shouldn't happen, but safety check
  }
  if (replacements > 0 && !content.includes('from "@/lib/assetConfig"') && !content.includes("from '@/lib/assetConfig'")) {
    // Add import after the last existing import
    const importInsertIdx = content.lastIndexOf('\nimport ');
    if (importInsertIdx !== -1) {
      const endOfImportLine = content.indexOf('\n', importInsertIdx + 1);
      content = content.slice(0, endOfImportLine + 1) + IMPORT_LINE + '\n' + content.slice(endOfImportLine + 1);
    } else {
      // No imports found, add at top
      content = IMPORT_LINE + '\n' + content;
    }
  }

  if (content !== origContent) {
    modifiedFiles++;
    totalReplacements += replacements;
    console.log(`  ${EXECUTE ? '✏️' : '📝'} ${relPath}: ${replacements} replacements`);
    if (EXECUTE) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
  }
}

console.log(`\n${EXECUTE ? '✅ Applied' : '🔍 Dry-run'}:`);
console.log(`  Files scanned: ${totalFiles}`);
console.log(`  Files modified: ${modifiedFiles}`);
console.log(`  Total replacements: ${totalReplacements}`);
if (!EXECUTE) console.log(`\n  Use --execute to apply changes.`);
