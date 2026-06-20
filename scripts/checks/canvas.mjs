#!/usr/bin/env node
/**
 * canvas.mjs — AI check for consistent canvas + WebGL/engine init pattern.
 *
 * Goals:
 * - Identify canvas-bearing modules (engines, renderers, scenes) that create WebGL contexts.
 * - Detect duplicate or conflicting canvas initializations in non-page modules.
 * - Flag if multiple distinct Three/WebGL renderer creation sites exist outside a single canonical engine.
 *
 * Strategy (static, Node-only):
 * - Scan client/src for .ts/.tsx (excluding pages/ to avoid sibling ownership).
 * - Look for:
 *     - new HTMLCanvasElement usage or <canvas in JSX/TSX
 *     - new THREE.WebGLRenderer({ canvas })
 *     - canvas.getContext('webgl'|'webgl2'|'experimental-webgl')
 *     - Babylon engine init (Engine, createEngine)
 * - Group by file; report if >1 distinct "primary canvas init" patterns exist among engine/renderer files.
 * - Hard fail only on obvious conflicts (e.g., two different engines both claiming to own the main game canvas).
 *
 * This is intentionally conservative and focused on non-pages engine code.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const SRC = resolve(ROOT, 'client/src');

const EXCLUDE_DIRS = new Set(['pages', 'test', '__tests__']);

const CANVAS_PATTERNS = [
  /getContext\s*\(\s*['"](?:webgl|webgl2|experimental-webgl)/i,
  /new\s+THREE\.WebGLRenderer\s*\(/,
  /WebGLRenderer\s*\(/,
  /createEngine\s*\(/,
  /new\s+Engine\s*\(/,
  /<canvas\b[^>]*>/i,
  /document\.createElement\s*\(\s*['"]canvas['"]\s*\)/i,
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = resolve(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (EXCLUDE_DIRS.has(name)) continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

function hasCanvasInit(code) {
  return CANVAS_PATTERNS.some((re) => re.test(code));
}

function main() {
  const files = walk(SRC);
  const hits = [];

  for (const f of files) {
    const code = readFileSync(f, 'utf8');
    if (hasCanvasInit(code)) {
      hits.push(relative(ROOT, f));
    }
  }

  // Heuristic: look for "engine" or "renderer" files that do the init — these are the canonical places.
  const engineHits = hits.filter((p) =>
    /engine|renderer|scene/i.test(p) && !/node_modules/.test(p)
  );

  const issues = [];
  const warnings = [];

  if (hits.length === 0) {
    warnings.push('No canvas/WebGL initialization sites found in client/src (excluding pages).');
  }

  // If we see multiple distinct engine/renderer files doing canvas init, warn about potential duplication.
  if (engineHits.length > 1) {
    warnings.push(
      `Multiple engine/renderer files appear to initialize canvas/WebGL:\n  - ${engineHits.join('\n  - ')}\n` +
        'Ensure a single consistent <canvas> + engine init pattern is used for world/game.'
    );
  }

  // Look for obvious conflicting patterns in same file (rare but possible).
  for (const f of files) {
    const code = readFileSync(f, 'utf8');
    const threeInits = (code.match(/new\s+THREE\.WebGLRenderer/g) || []).length;
    const babylonInits = (code.match(/new\s+Engine|createEngine/g) || []).length;
    if (threeInits > 1 || babylonInits > 1) {
      issues.push(`${relative(ROOT, f)}: multiple renderer/engine inits in one file`);
    }
    if (threeInits > 0 && babylonInits > 0) {
      issues.push(`${relative(ROOT, f)}: mixes Three.js and Babylon canvas init`);
    }
  }

  if (warnings.length) {
    for (const w of warnings) console.warn(`⚠ ${w}`);
  }
  if (issues.length) {
    console.error('❌ canvas check FAILED');
    for (const i of issues) console.error('  -', i);
    process.exit(1);
  }
  console.log(`✅ canvas: ${hits.length} init site(s) found; no conflicting patterns detected`);
}

main();
