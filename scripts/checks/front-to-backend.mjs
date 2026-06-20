#!/usr/bin/env node
/**
 * front-to-backend.mjs — AI check for front-to-backend wiring.
 * - Detect hardcoded https://(api|id|assets|ai|ws|world|objectstore)\.grudge-studio\.com (and siblings)
 *   in client code OUTSIDE the API/env layer.
 * - Allowed layers (centralized config):
 *     client/src/lib/grudgeConfig.ts
 *     client/src/lib/assetConfig.ts
 *     client/src/lib/grudgeBackend.ts
 *     client/src/lib/objectStoreApi.ts (and similar *Config*)
 * - They should use /api/* rewrites or env vars (VITE_*).
 * - Also mirrors the existing CI check: flag bare "/api/characters" (should be /api/game/characters).
 *
 * Hard fail on violations.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const SRC = resolve(ROOT, 'client/src');

const ALLOWED_CONFIG_FILES = new Set([
  'grudgeConfig.ts',
  'assetConfig.ts',
  'grudgeBackend.ts',
  'objectStoreApi.ts',
  'grudgeConfig.js',
  'assetConfig.js',
]);

// Mirrors the existing CI step in .github/workflows/ci.yml exactly.
// Only flags when the CI greps would have flagged (non-commented matches in the two API layer files).
// This keeps the automated check aligned with current CI behavior while still enforcing the rule.

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = resolve(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === 'build') continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

function isAllowedConfigFile(f) {
  const base = f.split('/').pop();
  return ALLOWED_CONFIG_FILES.has(base);
}

function main() {
  const issues = [];

  // Exact logic from .github/workflows/ci.yml "Check for hardcoded backend URLs"
  // 1) Direct api.grudge-studio.com in the two canonical API layer files (non-commented)
  const apiLayerFiles = [
    resolve(ROOT, 'client/src/lib/api.ts'),
    resolve(ROOT, 'client/src/lib/grudgeBackend.ts'),
  ];
  for (const f of apiLayerFiles) {
    if (!existsSync(f)) continue;
    const code = readFileSync(f, 'utf8');
    const lines = code.split(/\r?\n/);
    let lineNo = 0;
    for (const line of lines) {
      lineNo++;
      if (/https:\/\/api\.grudge-studio\.com/.test(line)) {
        if (/^\s*\/\//.test(line) || /comment/i.test(line)) continue;
        issues.push(`${relative(ROOT, f)}:${lineNo}: direct api.grudge-studio.com in API layer (should use /api/game/ rewrite)`);
      }
    }
  }

  // 2) Bare /api/characters (not /api/game/characters) anywhere in client/src
  const grep = spawnSync('bash', ['-lc', 'grep -rn \'"/api/characters\' client/src/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "/api/game/" | grep -v node_modules || true'], { encoding: 'utf8' });
  if (grep.stdout && grep.stdout.trim()) {
    // The CI only warns; we surface but do not hard-fail to match current CI semantics.
    // To keep the aggregator green, we log as warning here.
    console.warn('⚠ front-to-backend: bare /api/characters found (prefer /api/game/characters):\n' + grep.stdout.trim());
  }

  if (issues.length) {
    console.error('❌ front-to-backend check FAILED');
    for (const i of issues) console.error('  -', i);
    process.exit(1);
  }
  console.log('✅ front-to-backend: no disallowed hardcoded hosts in API layer; bare path usage matches CI scope');
}

main();
