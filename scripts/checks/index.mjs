#!/usr/bin/env node
/**
 * index.mjs — AI checks aggregator.
 * Runs all checks in scripts/checks/ and summarizes.
 * Exits non-zero if any check fails.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHECKS_DIR = __dirname;

const CHECKS = readdirSync(CHECKS_DIR)
  .filter((f) => f.endsWith('.mjs') && f !== 'index.mjs')
  .sort();

let passed = 0;
let failed = 0;
const results = [];

for (const c of CHECKS) {
  const p = resolve(CHECKS_DIR, c);
  process.stdout.write(`\n▶ ${c}\n`);
  const r = spawnSync(process.execPath, [p], { stdio: 'inherit' });
  const ok = r.status === 0;
  if (ok) {
    passed++;
    results.push({ name: c, ok: true });
  } else {
    failed++;
    results.push({ name: c, ok: false });
  }
}

console.log('\n' + '='.repeat(50));
console.log(`AI CHECKS SUMMARY: ${passed} passed, ${failed} failed`);
for (const r of results) {
  console.log(`  ${r.ok ? '✅' : '❌'} ${r.name}`);
}
console.log('='.repeat(50) + '\n');

if (failed > 0) {
  process.exit(1);
}
