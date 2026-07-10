#!/usr/bin/env node
/**
 * Upload stylized nature packs → R2 models/nature/stylized/*
 * Source: client/public/models/nature/stylized (copied from D:\Games\Models)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadEnvFiles,
  getR2Config,
  createR2Client,
  uploadFile,
} from './lib/r2Upload.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'client', 'public', 'models', 'nature', 'stylized');
const FORCE = process.argv.includes('--force');
const DRY = process.argv.includes('--dry-run');

function walk(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, base, out);
    else if (ent.name.endsWith('.glb')) out.push(full);
  }
  return out;
}

async function main() {
  loadEnvFiles(ROOT);
  const cfg = getR2Config();
  const client = createR2Client(cfg);
  const files = walk(SRC);
  console.log(`[stylized-nature] ${files.length} GLBs under ${SRC}`);
  let ok = 0;
  for (const local of files) {
    const rel = path.relative(path.join(ROOT, 'client', 'public'), local).replace(/\\/g, '/');
    const r2Key = rel; // models/nature/stylized/...
    if (DRY) {
      console.log('  dry', r2Key);
      continue;
    }
    const res = await uploadFile(client, cfg.bucket, local, r2Key, { force: FORCE });
    console.log(res.skipped ? `  skip ${r2Key}` : `  ok   ${r2Key} (${res.bytes})`);
    if (!res.skipped) ok++;
  }
  console.log(`[stylized-nature] uploaded ${ok} (cdn ${cfg.cdn})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
