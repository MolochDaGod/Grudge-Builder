/**
 * Generate public/weaponmastery.html from shared/definitions/weaponMastery.ts
 * Usage: npx tsx scripts/gen-weapon-mastery-html.mjs [output-path]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const { MASTERY_TREES, MASTERY_POOL_CAP, MASTERY_TREE_COUNT, MASTERY_STAT_BONUSES, MASTERY_TREE_FILL_POINTS, MASTERY_MICRO_COUNT } =
  await import('../shared/definitions/weaponMastery.ts');

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderNode(node, color) {
  const isMicro = node.kind === 'micro';
  const isSig = node.kind === 'signature';
  const size = isSig ? 64 : isMicro ? 36 : 52;
  const width = isMicro ? 72 : size;
  const meta = node.requirement === 0 ? 'no requirement' : `req ${node.requirement} pts`;
  const sig = isSig ? `<span class="sig" style="color:${color}">Signature</span>` : '';
  const micro = isMicro ? `<span class="micro-tag">Micro</span>` : '';
  const orbClass = isSig ? 'orb orb-sig' : isMicro ? 'orb orb-micro' : 'orb';
  const border = isMicro ? `${color}99` : color;
  return `
    <div class="node ${isMicro ? 'node-micro' : ''}" style="left:${node.position.x}%;top:${node.position.y}%;width:${width}px">
      <div class="${orbClass}" style="width:${size}px;height:${size}px;border-color:${border};box-shadow:0 0 ${isMicro ? 6 : 10}px ${color}${isMicro ? '33' : '55'}">
        <span class="ranks" style="color:${color};font-size:${isMicro ? 10 : 13}px">${node.maxRanks}</span>
      </div>
      <div class="nlabel" style="font-size:${isMicro ? 9 : 11}px">${esc(node.name)}</div>
      <div class="ndesc" style="font-size:${isMicro ? 8 : 10}px">${esc(node.description)}</div>
      ${!isMicro ? `<div class="nmeta">${meta}</div>` : ''}
      ${sig}${micro}
    </div>`;
}

function renderTree(tree) {
  const edges = tree.edges.map(([a, b]) => {
    const from = tree.nodes[a];
    const to = tree.nodes[b];
    if (!from || !to) return '';
    const dash = tree.nodes[b]?.kind === 'micro' ? '2 3' : '4 4';
    return `<line x1="${from.position.x}%" y1="${from.position.y}%" x2="${to.position.x}%" y2="${to.position.y}%" stroke="${tree.color}55" stroke-width="1.5" stroke-dasharray="${dash}"/>`;
  }).join('');

  const nodes = tree.nodes.map(n => renderNode(n, tree.color)).join('');

  return `
  <section class="tree" id="tree-${tree.id}">
    <header class="tree-head" style="border-color:${tree.color}">
      <h2 style="color:${tree.color}">${esc(tree.name)}</h2>
      <p>${esc(tree.description)}</p>
      <div class="tree-cap">Fully fills at <strong>${tree.totalPoints}</strong> points (7 core + ${MASTERY_MICRO_COUNT} micro + signature)</div>
    </header>
    <div class="chart" style="height:480px;background:radial-gradient(circle at 50% 38%, ${tree.color}14, transparent 70%)">
      <svg class="edges" width="100%" height="100%">${edges}</svg>
      ${nodes}
    </div>
  </section>`;
}

const bonusRows = MASTERY_STAT_BONUSES.map(b => `
      <tr>
        <td>${esc(b.label)}</td>
        <td><code>${esc(b.statKey)}</code></td>
        <td>${esc(b.mode)}</td>
        <td>${esc(b.perRank)}</td>
      </tr>`).join('');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>GRUDGE — Weapons Mastery</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#0a0705;--panel:#140d08;--card:#1e1510;--border:#3a2a1a;--border2:#7a5c1e;
  --gold:#d4a400;--muted:#9b7d52;--dim:#6b5535;--text:#e7d8be;
  --font:'Cinzel',Georgia,serif;--font-body:system-ui,-apple-system,sans-serif;
  --font-mono:'JetBrains Mono',ui-monospace,monospace;
}
body{font-family:var(--font-body);background:var(--bg);color:var(--text);line-height:1.55;padding:32px 20px 64px;max-width:1180px;margin:0 auto}
h1{font-family:var(--font);font-size:34px;color:var(--gold);letter-spacing:1px}
h2{font-family:var(--font);letter-spacing:.5px}
.lede{color:var(--muted);font-size:14px;margin:6px 0 24px;max-width:760px}
.rules{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:32px}
.rule{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:12px 16px;min-width:150px}
.rule strong{display:block;font-family:var(--font);font-size:22px;color:var(--gold)}
.rule span{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px}
.trees{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px}
.tree{background:var(--panel);border:1px solid var(--border);border-radius:12px;overflow:hidden}
.tree-head{padding:14px 16px;border-bottom:2px solid var(--border)}
.tree-head h2{font-size:19px}
.tree-head p{font-size:12px;color:var(--muted);margin-top:2px}
.tree-cap{font-size:11px;color:var(--dim);margin-top:6px;font-family:var(--font-mono)}
.chart{position:relative;margin:8px}
.edges{position:absolute;inset:0;pointer-events:none}
.node{position:absolute;transform:translate(-50%,-50%);text-align:center;z-index:2}
.node-micro{z-index:1}
.orb{border:2px solid var(--border2);border-radius:12px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1e1510,#120c07);margin:0 auto;position:relative}
.orb-micro{border-radius:8px;background:linear-gradient(135deg,#120c07,#0a0705);opacity:.92}
.orb-sig{border-radius:50%}
.orb .ranks{font-family:var(--font-mono);font-weight:700}
.nlabel{font-family:var(--font);margin-top:8px;color:var(--text);line-height:1.2}
.ndesc{color:var(--gold);margin-top:2px}
.nmeta{font-size:9px;color:var(--dim);font-family:var(--font-mono)}
.sig,.micro-tag{font-size:8px;text-transform:uppercase;letter-spacing:1px;font-weight:700;display:block;margin-top:2px}
.micro-tag{color:var(--dim)}
.legend{margin-top:40px;background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px}
.legend p{color:var(--muted);font-size:13px;margin:6px 0 14px;max-width:720px}
.legend table{width:100%;border-collapse:collapse;font-size:13px}
.legend th{text-align:left;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:1px;padding:6px 10px;border-bottom:1px solid var(--border)}
.legend td{padding:8px 10px;border-bottom:1px solid var(--border)}
.legend code{font-family:var(--font-mono);color:var(--gold);font-size:12px}
footer{margin-top:36px;color:var(--dim);font-size:11px;text-align:center}
</style>
</head>
<body>
  <h1>Weapons Mastery</h1>
  <p class="lede">A point-allocation talent tree per weapon type. Spend a shared mastery pool — one point per character level — across any of the ${MASTERY_TREE_COUNT} trees. Each tree has 7 core nodes, ${MASTERY_MICRO_COUNT} micro nodes for small passives/crits/procs, and a signature capstone (${MASTERY_TREE_FILL_POINTS} points to fully fill). This page is generated from the same shipped defs as the in-game tree.</p>
  <div class="rules">
    <div class="rule"><strong>${MASTERY_POOL_CAP}</strong><span>Shared pool cap</span></div>
    <div class="rule"><strong>1 / level</strong><span>Points earned</span></div>
    <div class="rule"><strong>${MASTERY_TREE_COUNT}</strong><span>Weapon trees</span></div>
    <div class="rule"><strong>${MASTERY_TREE_FILL_POINTS}</strong><span>Pts per tree</span></div>
    <div class="rule"><strong>1 / 3 / 5</strong><span>Core ranks</span></div>
  </div>
  <div class="trees">
${MASTERY_TREES.map(renderTree).join('')}
  </div>
  <section class="legend">
    <h2>Combat Bonuses</h2>
    <p>Every talent grants a generic passive that folds straight into the character stat engine. Bonuses sum across all weapon trees.</p>
    <table>
      <thead><tr><th>Bonus</th><th>Stat key</th><th>Mode</th><th>Per rank</th></tr></thead>
      <tbody>${bonusRows}</tbody>
    </table>
  </section>
  <footer>Generated from shared/definitions/weaponMastery.ts · run <code>npx tsx scripts/gen-weapon-mastery-html.mjs</code></footer>
</body>
</html>`;

const outArg = process.argv[2];
const defaultOut = path.join(root, 'public', 'weaponmastery.html');
const outPath = outArg ? path.resolve(outArg) : defaultOut;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath} (${MASTERY_TREES.length} trees, ${MASTERY_TREES[0].nodes.length} nodes each)`);