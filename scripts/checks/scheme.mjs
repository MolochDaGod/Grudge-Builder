#!/usr/bin/env node
/**
 * scheme.mjs — AI check for color scheme consistency.
 * Scans app-shell/theme files for stray hardcoded hex colors that bypass Tailwind/theme tokens.
 * Warn-level only (does not fail the run) per task scope.
 *
 * Targets (non-pages):
 * - client/src/index.css (theme tokens)
 * - client/src/lib/* (config, theme helpers)
 * - client/src/components/* (ui shell components)
 * - shared/* (design tokens)
 *
 * Reports any #rrggbb / #rgb / #rrggbbaa outside of the known theme token definitions.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const TARGET_DIRS = [
  resolve(ROOT, 'client/src'),
  resolve(ROOT, 'shared'),
];

const EXCLUDE = new Set(['pages', 'node_modules', 'dist', 'build']);

const HEX_RE = /#([0-9a-fA-F]{3,8})\b/g;

const KNOWN_TOKEN_FILES = new Set([
  'index.css',
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (EXCLUDE.has(name)) continue;
    const p = resolve(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      walk(p, out);
    } else {
      const ext = extname(name);
      if (['.css', '.ts', '.tsx'].includes(ext)) {
        out.push(p);
      }
    }
  }
  return out;
}

function isTokenDefinitionLine(line, file) {
  // In index.css, lines that define --color-* or use hsl() for theme are allowed.
  if (KNOWN_TOKEN_FILES.has(file)) {
    if (/--color-/.test(line) || /@theme|color-scheme|background|foreground|primary|secondary|accent|muted|border|ring|destructive/.test(line)) {
      return true;
    }
  }
  // Allow hsl() usage (our design system) — the task is about stray hex bypassing tokens.
  if (/hsl\s*\(/.test(line)) return true;
  return false;
}

function main() {
  const files = [];
  for (const d of TARGET_DIRS) {
    if (!statSync(d).isDirectory()) continue;
    files.push(...walk(d));
  }

  const findings = [];

  for (const f of files) {
    // Only scan shell/theme-ish files to keep signal high
    const rel = relative(ROOT, f);
    const base = f.split('/').pop();
    const isShell = /index\.css$|scheme|theme|color|Color|tailwind/i.test(rel) || /lib\/(grudgeConfig|assetConfig)/.test(rel);
    if (!isShell) continue;

    const code = readFileSync(f, 'utf8');
    const lines = code.split(/\r?\n/);
    let lineNo = 0;
    for (const line of lines) {
      lineNo++;
      if (isTokenDefinitionLine(line, base)) continue;
      let m;
      HEX_RE.lastIndex = 0;
      while ((m = HEX_RE.exec(line)) !== null) {
        // Skip obvious non-color contexts (data urls, font subsets etc.)
        if (/url\(|data:|@font-face/.test(line)) continue;
        findings.push({ file: rel, line: lineNo, match: m[0], snippet: line.trim().slice(0, 120) });
      }
    }
  }

  if (findings.length === 0) {
    console.log('✅ scheme: no stray hardcoded hex colors bypassing theme tokens (in scanned shell files)');
    return;
  }

  console.warn('⚠ scheme: stray hex colors found (warn-level; review vs Tailwind tokens)');
  for (const f of findings) {
    console.warn(`  ${f.file}:${f.line}  ${f.match}  | ${f.snippet}`);
  }
  // Warn only — do not exit 1
}

main();
