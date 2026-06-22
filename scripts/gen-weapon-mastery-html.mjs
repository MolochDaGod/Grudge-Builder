/**
 * Generate interactive public/weaponmastery.html from shared/definitions/weaponMastery.ts
 * Usage: npx tsx scripts/gen-weapon-mastery-html.mjs [output-path]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const {
  MASTERY_TREES,
  MASTERY_POOL_CAP,
  MASTERY_TREE_COUNT,
  MASTERY_STAT_BONUSES,
  MASTERY_TREE_FILL_POINTS,
  MASTERY_MICRO_COUNT,
  MASTERY_CHARMS,
} = await import('../shared/definitions/weaponMastery.ts');

const dataJson = JSON.stringify({
  poolCap: MASTERY_POOL_CAP,
  treeCount: MASTERY_TREE_COUNT,
  fillPoints: MASTERY_TREE_FILL_POINTS,
  microCount: MASTERY_MICRO_COUNT,
  statBonuses: MASTERY_STAT_BONUSES,
  trees: MASTERY_TREES,
  charms: MASTERY_CHARMS,
});

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
  --ok:#22c55e;--warn:#f59e0b;--err:#ef4444;
}
body{font-family:var(--font-body);background:var(--bg);color:var(--text);line-height:1.5;min-height:100vh}
.app{max-width:1440px;margin:0 auto;padding:24px 20px 48px}
header{margin-bottom:20px}
h1{font-family:var(--font);font-size:32px;color:var(--gold);letter-spacing:1px}
.lede{color:var(--muted);font-size:14px;margin-top:6px;max-width:820px}
.rules{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}
.rule{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:10px 14px;min-width:130px}
.rule strong{display:block;font-family:var(--font);font-size:20px;color:var(--gold)}
.rule span{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px}
.pool-bar{height:8px;background:#1a1208;border-radius:4px;overflow:hidden;margin-top:8px}
.pool-fill{height:100%;background:linear-gradient(90deg,var(--gold),#f5d76e);transition:width .2s}
.tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
.tab{font-family:var(--font);font-size:12px;padding:10px 16px;border:1px solid var(--border);border-radius:8px;background:var(--panel);color:var(--muted);cursor:pointer;transition:.15s}
.tab:hover{border-color:var(--border2);color:var(--text)}
.tab.active{color:var(--text);border-color:var(--border2);box-shadow:inset 0 0 0 1px var(--border2)}
.tab .pts{font-family:var(--font-mono);font-size:10px;opacity:.8;margin-left:6px}
.layout{display:grid;grid-template-columns:300px 1fr;gap:16px;align-items:start}
@media(max-width:960px){.layout{grid-template-columns:1fr}}
.sidebar{display:flex;flex-direction:column;gap:12px}
.panel{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:14px 16px}
.panel h3{font-family:var(--font);font-size:14px;color:var(--gold);margin-bottom:8px}
.pool-num{font-family:var(--font-mono);font-size:28px;color:var(--gold)}
.pool-num span{font-size:14px;color:var(--muted)}
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px}
.stat-grid div{background:var(--card);border:1px solid var(--border);border-radius:6px;padding:6px 8px}
.stat-grid strong{display:block;font-family:var(--font-mono);color:var(--gold);font-size:13px}
.node-detail{font-size:12px;color:var(--muted)}
.node-detail .name{font-family:var(--font);font-size:16px;color:var(--text);margin-bottom:4px}
.node-detail .desc{color:var(--gold);margin:6px 0}
.rank-row{display:flex;align-items:center;gap:8px;margin-top:10px}
.rank-btn{width:32px;height:32px;border:1px solid var(--border2);border-radius:8px;background:var(--card);color:var(--gold);font-size:18px;cursor:pointer}
.rank-btn:disabled{opacity:.35;cursor:not-allowed}
.rank-display{font-family:var(--font-mono);font-size:18px;min-width:72px;text-align:center}
.rank-display .bonus{color:var(--ok)}
.hint{font-size:10px;color:var(--dim);margin-top:8px}
.charm-list{display:flex;flex-direction:column;gap:6px;max-height:220px;overflow:auto}
.charm{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 10px;cursor:pointer;font-size:11px}
.charm:hover{border-color:var(--border2)}
.charm.socketed{opacity:.55;cursor:default}
.charm .rarity{font-size:9px;text-transform:uppercase;letter-spacing:1px;font-weight:700}
.charm.common .rarity{color:#9ca3af}
.charm.magic .rarity{color:#60a5fa}
.charm.rare .rarity{color:#fbbf24}
.charm.unique .rarity{color:#f97316}
.charm .flavor{color:var(--dim);margin-top:2px;font-size:10px}
.tree-wrap{background:var(--panel);border:1px solid var(--border);border-radius:12px;overflow:hidden}
.tree-head{padding:16px 20px;border-bottom:2px solid var(--border)}
.tree-head h2{font-family:var(--font);font-size:22px}
.tree-head p{font-size:13px;color:var(--muted);margin-top:4px}
.tree-meta{font-size:11px;color:var(--dim);font-family:var(--font-mono);margin-top:8px}
.chart{position:relative;height:min(72vh,760px);min-height:520px;margin:12px}
.edges{position:absolute;inset:0;pointer-events:none;width:100%;height:100%}
.node{position:absolute;transform:translate(-50%,-50%);text-align:center;z-index:2;cursor:pointer;transition:filter .15s}
.node-micro{z-index:1}
.node:hover{filter:brightness(1.15)}
.node.selected .orb{box-shadow:0 0 18px currentColor!important}
.node.locked{opacity:.45;cursor:not-allowed}
.node.maxed .orb{border-style:solid}
.orb{border:2px solid var(--border2);border-radius:12px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1e1510,#120c07);margin:0 auto;position:relative;transition:.15s}
.orb-micro{border-radius:8px;background:linear-gradient(135deg,#120c07,#0a0705)}
.orb-sig{border-radius:50%}
.orb .ranks{font-family:var(--font-mono);font-weight:700;line-height:1}
.orb .charm-dot{position:absolute;top:-4px;right:-4px;width:10px;height:10px;border-radius:50%;background:var(--ok);border:2px solid var(--bg)}
.nlabel{font-family:var(--font);margin-top:10px;color:var(--text);line-height:1.2;max-width:110px;margin-left:auto;margin-right:auto}
.ndesc{color:var(--gold);margin-top:3px;font-size:10px}
.nmeta{font-size:9px;color:var(--dim);font-family:var(--font-mono);margin-top:2px}
.sig,.micro-tag{font-size:8px;text-transform:uppercase;letter-spacing:1px;font-weight:700;display:block;margin-top:2px}
.micro-tag{color:var(--dim)}
.toolbar{display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--border);flex-wrap:wrap}
.toolbar button{font-size:11px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--card);color:var(--muted);cursor:pointer}
.toolbar button:hover{border-color:var(--border2);color:var(--text)}
.legend{margin-top:24px;background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px}
.legend h2{font-family:var(--font);font-size:18px;margin-bottom:6px}
.legend p{color:var(--muted);font-size:13px;margin-bottom:12px}
.legend table{width:100%;border-collapse:collapse;font-size:13px}
.legend th{text-align:left;color:var(--muted);font-size:11px;text-transform:uppercase;padding:6px 10px;border-bottom:1px solid var(--border)}
.legend td{padding:8px 10px;border-bottom:1px solid var(--border)}
.legend code{font-family:var(--font-mono);color:var(--gold);font-size:12px}
footer{margin-top:28px;color:var(--dim);font-size:11px;text-align:center}
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#2a1a0a;border:1px solid var(--border2);color:var(--text);padding:10px 16px;border-radius:8px;font-size:12px;opacity:0;transition:opacity .2s;pointer-events:none;z-index:99}
.toast.show{opacity:1}
</style>
</head>
<body>
<div class="app">
  <header>
    <h1>Weapons Mastery</h1>
    <p class="lede">Allocate a shared ${MASTERY_POOL_CAP}-point pool across ${MASTERY_TREE_COUNT} weapon trees. Socket mastery charms (Diablo-style) for bonus ranks beyond the pool cap.</p>
    <div class="rules" id="rules"></div>
  </header>
  <nav class="tabs" id="tabs"></nav>
  <div class="layout">
    <aside class="sidebar">
      <div class="panel">
        <h3>Mastery Pool</h3>
        <div class="pool-num"><span id="pool-spent">0</span> / ${MASTERY_POOL_CAP}</div>
        <div class="pool-bar"><div class="pool-fill" id="pool-fill" style="width:0%"></div></div>
        <p class="hint" id="pool-hint">1 point per character level · charms do not spend pool</p>
      </div>
      <div class="panel">
        <h3>Combat Bonuses</h3>
        <div class="stat-grid" id="stat-grid"></div>
      </div>
      <div class="panel" id="node-panel">
        <h3>Selected Node</h3>
        <div class="node-detail" id="node-detail"><p class="hint">Click a node in the tree</p></div>
      </div>
      <div class="panel">
        <h3>Mastery Charms</h3>
        <p class="hint" style="margin-bottom:8px">Click to socket on matching node (selected). Click again to unsocket.</p>
        <div class="charm-list" id="charm-list"></div>
      </div>
    </aside>
    <div class="tree-wrap">
      <div class="tree-head" id="tree-head"></div>
      <div class="chart" id="chart">
        <svg class="edges" id="edges"></svg>
        <div id="nodes"></div>
      </div>
      <div class="toolbar">
        <button type="button" id="btn-reset-tree">Reset current tree</button>
        <button type="button" id="btn-reset-all">Reset all trees</button>
        <button type="button" id="btn-export">Copy build JSON</button>
      </div>
    </div>
  </div>
  <section class="legend">
    <h2>Combat Bonuses</h2>
    <p>Every talent grants a generic passive that folds into the character stat engine. Bonuses sum across all weapon trees; charm multipliers apply to that node's total value.</p>
    <table>
      <thead><tr><th>Bonus</th><th>Stat key</th><th>Mode</th><th>Per rank</th></tr></thead>
      <tbody id="bonus-rows"></tbody>
    </table>
  </section>
  <footer>Generated from shared/definitions/weaponMastery.ts</footer>
</div>
<div class="toast" id="toast"></div>
<script type="application/json" id="mastery-data">${dataJson}</script>
<script>
(function(){
  const DATA = JSON.parse(document.getElementById('mastery-data').textContent);
  const STORAGE_KEY = 'grudge-weapon-mastery-v2';
  const STAT_LABELS = { damage:'Damage', criticalChance:'Crit Chance', criticalDamage:'Crit Damage', attackSpeed:'Atk Speed', armorPenetration:'Armor Pen', drainHealth:'Lifesteal' };

  let activeTree = DATA.trees[0].id;
  let selectedKey = null;
  let state = loadState();

  function loadState(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { allocations: {}, sockets: {} };
  }
  function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  function treeAlloc(treeId){ return state.allocations[treeId] || (state.allocations[treeId] = {}); }
  function getAllocated(treeId, nodeId){ return treeAlloc(treeId)[nodeId] || 0; }
  function socketKey(treeId, nodeId){ return treeId + ':' + nodeId; }
  function getSocket(treeId, nodeId){ return state.sockets[socketKey(treeId, nodeId)] || null; }
  function getCharm(charmId){ return DATA.charms.find(c => c.id === charmId); }
  function charmBonus(treeId, nodeId){
    const cid = getSocket(treeId, nodeId);
    if (!cid) return { ranks: 0, mult: 1 };
    const ch = getCharm(cid);
    if (!ch || ch.treeId !== treeId || ch.nodeId !== nodeId) return { ranks: 0, mult: 1 };
    return { ranks: ch.bonusRanks || 0, mult: ch.effectMultiplier || 1 };
  }
  function effectiveRank(treeId, nodeId, maxRanks){
    const alloc = getAllocated(treeId, nodeId);
    const { ranks } = charmBonus(treeId, nodeId);
    return Math.min(alloc + ranks, maxRanks + ranks);
  }

  function treeSpent(treeId){
    const a = treeAlloc(treeId);
    return Object.values(a).reduce((s, n) => s + n, 0);
  }
  function totalSpent(){
    return DATA.trees.reduce((s, t) => s + treeSpent(t.id), 0);
  }

  function canAdd(tree, node){
    const alloc = getAllocated(tree.id, node.id);
    if (alloc >= node.maxRanks) return false;
    if (totalSpent() >= DATA.poolCap) return false;
    if (treeSpent(tree.id) < node.requirement) return false;
    return true;
  }
  function canRemove(treeId, nodeId){
    return getAllocated(treeId, nodeId) > 0;
  }

  function addRank(tree, node){
    if (!canAdd(tree, node)) { toast('Cannot allocate — check pool, max ranks, or requirements'); return; }
    treeAlloc(tree.id)[node.id] = getAllocated(tree.id, node.id) + 1;
    saveState(); renderAll();
  }
  function removeRank(treeId, nodeId){
    const n = getAllocated(treeId, nodeId);
    if (n <= 0) return;
    treeAlloc(treeId)[nodeId] = n - 1;
    if (treeAlloc(treeId)[nodeId] === 0) delete treeAlloc(treeId)[nodeId];
    saveState(); renderAll();
  }

  function toggleCharm(charm){
    const key = socketKey(charm.treeId, charm.nodeId);
    const cur = state.sockets[key];
    if (cur === charm.id) {
      delete state.sockets[key];
      saveState(); renderAll(); return;
    }
    if (cur) { toast('Node already has a charm — remove it first'); return; }
    if (selectedKey !== key) {
      activeTree = charm.treeId;
      selectedKey = key;
      renderAll();
    }
    const tree = DATA.trees.find(t => t.id === charm.treeId);
    const node = tree.nodes.find(n => n.id === charm.nodeId);
    state.sockets[key] = charm.id;
    saveState(); renderAll();
    toast('Socketed ' + charm.name + ' on ' + node.name);
  }

  function calcBonuses(){
    const b = { damage:0, criticalChance:0, criticalDamage:0, attackSpeed:0, armorPenetration:0, drainHealth:0 };
    for (const tree of DATA.trees) {
      for (const node of tree.nodes) {
        const alloc = getAllocated(tree.id, node.id);
        const { ranks, mult } = charmBonus(tree.id, node.id);
        const eff = alloc + ranks;
        if (eff > 0) b[node.stat] += node.perRank * eff * mult;
      }
    }
    return b;
  }

  function toast(msg){
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function renderRules(){
    document.getElementById('rules').innerHTML = [
      ['' + DATA.poolCap, 'Shared pool'],
      ['1 / level', 'Points earned'],
      ['' + DATA.treeCount, 'Weapon trees'],
      ['' + DATA.fillPoints, 'Pts per tree'],
      ['+ charms', 'Beyond cap'],
    ].map(([v,l]) => '<div class="rule"><strong>' + v + '</strong><span>' + l + '</span></div>').join('');
  }

  function renderTabs(){
    document.getElementById('tabs').innerHTML = DATA.trees.map(t => {
      const spent = treeSpent(t.id);
      const cls = t.id === activeTree ? 'tab active' : 'tab';
      return '<button type="button" class="' + cls + '" data-tree="' + t.id + '" style="border-color:' + (t.id === activeTree ? t.color : '') + '">' +
        t.name + '<span class="pts">' + spent + '/' + t.totalPoints + '</span></button>';
    }).join('');
    document.querySelectorAll('.tab').forEach(btn => {
      btn.onclick = () => { activeTree = btn.dataset.tree; selectedKey = null; renderAll(); };
    });
  }

  function renderPool(){
    const spent = totalSpent();
    document.getElementById('pool-spent').textContent = spent;
    document.getElementById('pool-fill').style.width = Math.min(100, (spent / DATA.poolCap) * 100) + '%';
    document.getElementById('pool-hint').textContent = (DATA.poolCap - spent) + ' points remaining · charms free';
  }

  function renderStats(){
    const b = calcBonuses();
    document.getElementById('stat-grid').innerHTML = Object.entries(STAT_LABELS).map(([k, label]) =>
      '<div><span>' + label + '</span><strong>+' + (b[k] || 0).toFixed(1) + '%</strong></div>'
    ).join('');
  }

  function renderCharms(){
    document.getElementById('charm-list').innerHTML = DATA.charms.map(ch => {
      const key = socketKey(ch.treeId, ch.nodeId);
      const socketed = state.sockets[key] === ch.id;
      return '<div class="charm ' + ch.rarity + (socketed ? ' socketed' : '') + '" data-charm="' + ch.id + '">' +
        '<div class="rarity">' + ch.rarity + '</div><strong>' + ch.name + '</strong>' +
        '<div class="flavor">' + ch.flavor + '</div></div>';
    }).join('');
    document.querySelectorAll('.charm').forEach(el => {
      el.onclick = () => toggleCharm(getCharm(el.dataset.charm));
    });
  }

  function renderNodeDetail(){
    const panel = document.getElementById('node-detail');
    if (!selectedKey) {
      panel.innerHTML = '<p class="hint">Click a node in the tree</p>';
      return;
    }
    const [treeId, nodeId] = selectedKey.split(':');
    const tree = DATA.trees.find(t => t.id === treeId);
    const node = tree.nodes.find(n => n.id === nodeId);
    const alloc = getAllocated(treeId, nodeId);
    const { ranks: chRanks, mult } = charmBonus(treeId, nodeId);
    const eff = alloc + chRanks;
    const sock = getSocket(treeId, nodeId);
    const ch = sock ? getCharm(sock) : null;
    const spent = treeSpent(treeId);
    const locked = spent < node.requirement && alloc === 0;

    panel.innerHTML =
      '<div class="name" style="color:' + tree.color + '">' + node.name + '</div>' +
      '<div>' + node.kind + (node.kind === 'signature' ? ' capstone' : '') + ' · req ' + node.requirement + ' tree pts</div>' +
      '<div class="desc">' + node.description + '</div>' +
      '<div>+' + node.perRank + '% ' + STAT_LABELS[node.stat] + ' per rank' + (mult > 1 ? ' (×' + mult + ' charm)' : '') + '</div>' +
      (ch ? '<div style="color:var(--ok);margin-top:6px">Charm: ' + ch.name + '</div>' : '') +
      (locked ? '<div style="color:var(--warn);margin-top:6px">Need ' + (node.requirement - spent) + ' more pts in this tree</div>' : '') +
      '<div class="rank-row">' +
        '<button type="button" class="rank-btn" id="rank-minus" ' + (canRemove(treeId, nodeId) ? '' : 'disabled') + '>−</button>' +
        '<div class="rank-display">' + alloc + '/' + node.maxRanks + (chRanks ? ' <span class="bonus">+' + chRanks + '</span>' : '') + '</div>' +
        '<button type="button" class="rank-btn" id="rank-plus" ' + (canAdd(tree, node) ? '' : 'disabled') + '>+</button>' +
      '</div>' +
      '<p class="hint">Effective: ' + eff + ' ranks → +' + (node.perRank * eff * mult).toFixed(1) + '%</p>';

    document.getElementById('rank-plus').onclick = () => addRank(tree, node);
    document.getElementById('rank-minus').onclick = () => removeRank(treeId, nodeId);
  }

  /** Remap compact grid coords to a roomier single-tree layout */
  function layoutPos(node){
    const p = { x: node.position.x, y: node.position.y };
    if (node.kind === 'micro') {
      p.x = p.x < 50 ? 7 : 93;
      const row = Math.round((p.y - 14) / 8);
      p.y = 14 + row * 9;
      return p;
    }
    if (node.kind === 'signature') return { x: 50, y: 90 };
    const coreY = { 10: 14, 30: 38, 50: 58, 70: 74 };
    p.y = coreY[p.y] ?? (12 + p.y * 0.78);
    p.x = p.x < 40 ? 28 : p.x > 60 ? 72 : 50;
    return p;
  }

  function renderTree(){
    const tree = DATA.trees.find(t => t.id === activeTree);
    const head = document.getElementById('tree-head');
    head.innerHTML = '<h2 style="color:' + tree.color + '">' + tree.name + '</h2>' +
      '<p>' + tree.description + '</p>' +
      '<div class="tree-meta">' + treeSpent(tree.id) + ' / ' + tree.totalPoints + ' points in tree · ' +
      DATA.fillPoints + ' to fully fill (pool + charms for overcap)</div>';

    const chart = document.getElementById('chart');
    const w = chart.clientWidth;
    const h = chart.clientHeight;

    const nodeById = Object.fromEntries(tree.nodes.map((n, i) => [n.id, { ...n, idx: i }]));
    const edges = tree.edges.map(([a, b]) => {
      const from = layoutPos(tree.nodes[a]);
      const to = layoutPos(tree.nodes[b]);
      const dash = tree.nodes[b].kind === 'micro' ? '3 4' : '5 5';
      return '<line x1="' + (from.x / 100 * w) + '" y1="' + (from.y / 100 * h) + '" ' +
        'x2="' + (to.x / 100 * w) + '" y2="' + (to.y / 100 * h) + '" ' +
        'stroke="' + tree.color + '66" stroke-width="2" stroke-dasharray="' + dash + '"/>';
    }).join('');
    document.getElementById('edges').setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    document.getElementById('edges').innerHTML = edges;

    document.getElementById('nodes').innerHTML = tree.nodes.map(node => {
      const pos = layoutPos(node);
      const isMicro = node.kind === 'micro';
      const isSig = node.kind === 'signature';
      const size = isSig ? 72 : isMicro ? 44 : 58;
      const width = isMicro ? 88 : size + 8;
      const alloc = getAllocated(tree.id, node.id);
      const { ranks: chRanks } = charmBonus(tree.id, node.id);
      const eff = alloc + chRanks;
      const key = socketKey(tree.id, node.id);
      const spent = treeSpent(tree.id);
      const locked = alloc === 0 && spent < node.requirement;
      const maxed = alloc >= node.maxRanks;
      let cls = 'node' + (isMicro ? ' node-micro' : '') + (selectedKey === key ? ' selected' : '') + (locked ? ' locked' : '') + (maxed ? ' maxed' : '');
      const rankText = eff > 0 ? (alloc + (chRanks ? '<small style="color:#22c55e">+' + chRanks + '</small>' : '')) : node.maxRanks;
      const showAlloc = alloc > 0 || chRanks > 0;
      const displayRank = showAlloc ? alloc + (chRanks ? '+' + chRanks : '') : '·';
      const orbCls = isSig ? 'orb orb-sig' : isMicro ? 'orb orb-micro' : 'orb';
      const hasCharm = !!getSocket(tree.id, node.id);

      return '<div class="' + cls + '" data-key="' + key + '" style="left:' + pos.x + '%;top:' + pos.y + '%;width:' + width + 'px;color:' + tree.color + '">' +
        '<div class="' + orbCls + '" style="width:' + size + 'px;height:' + size + 'px;border-color:' + tree.color + (alloc > 0 ? '' : '99') + ';box-shadow:0 0 ' + (isMicro ? 8 : 14) + 'px ' + tree.color + (alloc > 0 ? '88' : '33') + '">' +
          '<span class="ranks" style="font-size:' + (isMicro ? 11 : 14) + 'px">' + displayRank + '</span>' +
          (hasCharm ? '<span class="charm-dot"></span>' : '') +
        '</div>' +
        '<div class="nlabel" style="font-size:' + (isMicro ? 10 : 12) + 'px">' + node.name + '</div>' +
        '<div class="ndesc">' + (isMicro && node.procLabel ? node.procLabel : '+' + node.perRank + '%') + '</div>' +
        (!isMicro ? '<div class="nmeta">' + (node.requirement ? 'req ' + node.requirement : 'starter') + ' · max ' + node.maxRanks + '</div>' : '') +
        (isSig ? '<span class="sig" style="color:' + tree.color + '">Signature</span>' : '') +
        (isMicro ? '<span class="micro-tag">Micro</span>' : '') +
      '</div>';
    }).join('');

    document.querySelectorAll('.node').forEach(el => {
      el.onclick = () => {
        selectedKey = el.dataset.key;
        renderNodeDetail();
        document.querySelectorAll('.node').forEach(n => n.classList.toggle('selected', n.dataset.key === selectedKey));
      };
      el.ondblclick = (e) => {
        e.preventDefault();
        const [tid, nid] = el.dataset.key.split(':');
        const t = DATA.trees.find(x => x.id === tid);
        const n = t.nodes.find(x => x.id === nid);
        addRank(t, n);
      };
    });
  }

  function renderBonusTable(){
    document.getElementById('bonus-rows').innerHTML = DATA.statBonuses.map(b =>
      '<tr><td>' + b.label + '</td><td><code>' + b.statKey + '</code></td><td>' + b.mode + '</td><td>' + b.perRank + '</td></tr>'
    ).join('');
  }

  function renderAll(){
    renderTabs();
    renderPool();
    renderStats();
    renderCharms();
    renderNodeDetail();
    renderTree();
  }

  document.getElementById('btn-reset-tree').onclick = () => {
    if (!confirm('Reset all points in ' + activeTree + '?')) return;
    delete state.allocations[activeTree];
    for (const k of Object.keys(state.sockets)) if (k.startsWith(activeTree + ':')) delete state.sockets[k];
    selectedKey = null;
    saveState(); renderAll();
  };
  document.getElementById('btn-reset-all').onclick = () => {
    if (!confirm('Reset entire mastery build?')) return;
    state = { allocations: {}, sockets: {} };
    selectedKey = null;
    saveState(); renderAll();
  };
  document.getElementById('btn-export').onclick = () => {
    const payload = JSON.stringify({ allocations: state.allocations, sockets: state.sockets, bonuses: calcBonuses() }, null, 2);
    navigator.clipboard.writeText(payload).then(() => toast('Build copied to clipboard'));
  };

  window.addEventListener('resize', () => renderTree());
  renderRules();
  renderBonusTable();
  renderAll();
})();
</script>
</body>
</html>`;

const outArg = process.argv[2];
const defaultOut = path.join(root, 'public', 'weaponmastery.html');
const outPath = outArg ? path.resolve(outArg) : defaultOut;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath} (${MASTERY_TREES.length} trees, interactive tabs)`);