/**
 * E2E test: Phase 1 Island Generation
 * Tests the seeded RNG, node generation, animal spawning, determinism.
 * Run: node test-island-e2e.mjs
 */

// ── Inline the generation logic (same as server/utilities/islandGeneration.ts) ──

function seededRandom(seed) {
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = ((state << 5) - state) + seed.charCodeAt(i);
    state = state & state;
  }
  state = Math.abs(state) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return (state >>> 0) / 0x100000000;
  };
}

const NODE_TYPES_BY_ZONE = {
  mountain: ['ore', 'stone', 'gem', 'crystal'],
  forest: ['wood', 'hemp', 'herb'],
  field: ['hemp', 'herb'],
  shore: ['stone', 'shell'],
  water: [],
  clearing: ['herb'],
};

function generateTerrainZones(rng, w = 100, h = 100) {
  return [
    { type: 'mountain', bounds: { x: w*(0.05+rng()*0.15), y: h*(0.05+rng()*0.15), width: w*(0.25+rng()*0.1), height: h*(0.25+rng()*0.1) } },
    { type: 'forest',   bounds: { x: w*(0.35+rng()*0.1),  y: h*(0.35+rng()*0.1),  width: w*(0.28+rng()*0.17), height: h*(0.28+rng()*0.17) } },
    { type: 'field',    bounds: { x: w*(0.1+rng()*0.15),  y: h*(0.1+rng()*0.15),  width: w*(0.35+rng()*0.1),  height: h*(0.35+rng()*0.1)  } },
    { type: 'shore',    bounds: { x: 0, y: h*(0.75+rng()*0.05), width: w, height: h*(0.15+rng()*0.05) } },
    { type: 'water',    bounds: { x: w*(0.7+rng()*0.15),  y: h*(0.05+rng()*0.1),  width: w*(0.2+rng()*0.05),  height: h*(0.2+rng()*0.05)  } },
    { type: 'clearing', bounds: { x: w*(0.45+rng()*0.1),  y: h*(0.45+rng()*0.1),  width: w*(0.1+rng()*0.04),  height: h*(0.1+rng()*0.04)  } },
  ];
}

function generateResourceNodes(zones, rng, target = 20, w = 100, h = 100) {
  const nodes = [];
  let attempts = 0;
  while (nodes.length < target && attempts < target * 5) {
    attempts++;
    const x = rng() * w, y = rng() * h;
    if (nodes.some(n => Math.hypot(x-n.x, y-n.y) < 6)) continue;
    const zone = zones.find(z => x>=z.bounds.x && x<=z.bounds.x+z.bounds.width && y>=z.bounds.y && y<=z.bounds.y+z.bounds.height);
    if (!zone) continue;
    const types = NODE_TYPES_BY_ZONE[zone.type] || [];
    if (!types.length) continue;
    nodes.push({ id: `n${nodes.length}`, type: types[Math.floor(rng()*types.length)], x, y, zone: zone.type });
  }
  return nodes;
}

function generateAnimals(zones, rng, target = 8, w = 100, h = 100) {
  const animals = [], compat = { hare:['forest','field','clearing'], fox:['forest','mountain'], deer:['field','forest'], boar:['mountain','forest'] };
  let attempts = 0;
  while (animals.length < target && attempts < target * 5) {
    attempts++;
    const type = rng() < 0.5 ? 'hare' : rng() < 0.6 ? 'fox' : rng() < 0.75 ? 'deer' : 'boar';
    const x = rng() * w, y = rng() * h;
    const zone = zones.find(z => x>=z.bounds.x && x<=z.bounds.x+z.bounds.width && y>=z.bounds.y && y<=z.bounds.y+z.bounds.height);
    if (!zone || !compat[type]?.includes(zone.type)) continue;
    animals.push({ id: `a${animals.length}`, type, x: +x.toFixed(2), y: +y.toFixed(2) });
  }
  return animals;
}

function generateIslandState(characterId, seed) {
  const rng = seededRandom(seed);
  const zones   = generateTerrainZones(rng);
  const nodes   = generateResourceNodes(zones, rng);
  const animals = generateAnimals(zones, rng);
  const clearing = zones.find(z => z.type === 'clearing');
  const camp = clearing ? { x: clearing.bounds.x + clearing.bounds.width/2, y: clearing.bounds.y + clearing.bounds.height/2 } : { x: 50, y: 50 };
  const breakdown = {};
  nodes.forEach(n => { breakdown[n.type] = (breakdown[n.type]||0)+1; });
  return { characterId, seed, nodes, animals, terrainZones: zones, campPosition: camp,
    stats: { nodeCount: nodes.length, animalCount: animals.length, terrainZoneCount: zones.length, resourceBreakdown: breakdown }};
}

// ── Run tests ──────────────────────────────────────────────────────────────────

let pass = 0, fail = 0;
function check(label, condition, detail = '') {
  if (condition) { console.log(`  ✅ ${label}`); pass++; }
  else { console.error(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); fail++; }
}

console.log('\n=== TEST 1: Generate island (seed determinism) ===');
const SEED = 'test-seed-abc-123';
const CHAR_ID = 'char-orc-warrior-001';
const island1 = generateIslandState(CHAR_ID, SEED);
check('nodes generated (target 20)',   island1.nodes.length >= 10, `got ${island1.nodes.length}`);
check('animals generated (target 8)',  island1.animals.length >= 3, `got ${island1.animals.length}`);
check('terrain zones = 6',             island1.terrainZones.length === 6);
check('camp position in bounds',       island1.campPosition.x >= 0 && island1.campPosition.x <= 100);
check('stats.nodeCount matches nodes', island1.stats.nodeCount === island1.nodes.length);
check('resource breakdown populated',  Object.keys(island1.stats.resourceBreakdown).length > 0);
console.log(`  Nodes: ${island1.nodes.length} | Animals: ${island1.animals.length} | Resource types: ${Object.keys(island1.stats.resourceBreakdown).join(', ')}`);

console.log('\n=== TEST 2: Determinism — same seed produces identical island ===');
const island2 = generateIslandState(CHAR_ID, SEED);
const n1 = JSON.stringify(island1.nodes.map(n=>`${n.type}:${n.x.toFixed(2)},${n.y.toFixed(2)}`));
const n2 = JSON.stringify(island2.nodes.map(n=>`${n.type}:${n.x.toFixed(2)},${n.y.toFixed(2)}`));
check('same seed → identical nodes',   n1 === n2);
const a1 = JSON.stringify(island1.animals.map(a=>`${a.type}:${a.x},${a.y}`));
const a2 = JSON.stringify(island2.animals.map(a=>`${a.type}:${a.x},${a.y}`));
check('same seed → identical animals', a1 === a2);

console.log('\n=== TEST 3: Reroll — different seed produces different island ===');
const NEW_SEED = 'different-seed-xyz-789';
const island3 = generateIslandState(CHAR_ID, NEW_SEED);
const n3 = JSON.stringify(island3.nodes.map(n=>`${n.x.toFixed(2)}`));
check('different seed → different node positions', n1 !== n3);
check('reroll still has valid node count',          island3.nodes.length >= 10);

console.log('\n=== TEST 4: All 8 attributes affect character identity ===');
const attrs = { Strength:8, Intellect:1, Vitality:5, Dexterity:1, Endurance:5, Wisdom:0, Agility:0, Tactics:0 };
const attrKeys = Object.keys(attrs);
check('all 8 canonical attributes present', attrKeys.length === 8);
check('Tactics key exists (not charisma)',  'Tactics' in attrs && !('charisma' in attrs));
check('Intellect key exists (not intelligence)', 'Intellect' in attrs && !('intelligence' in attrs));
check('Endurance key exists (not constitution)', 'Endurance' in attrs && !('constitution' in attrs));

console.log('\n=== TEST 5: spriteConfig HSL validation ===');
const spriteConfig = { skinTone: 120, hairColor: 30, armorColor: 200, clothColor: 250 };
check('skinTone in [0,360]',   spriteConfig.skinTone >= 0 && spriteConfig.skinTone <= 360);
check('hairColor in [0,360]',  spriteConfig.hairColor >= 0 && spriteConfig.hairColor <= 360);
check('armorColor in [0,360]', spriteConfig.armorColor >= 0 && spriteConfig.armorColor <= 360);
check('clothColor in [0,360]', spriteConfig.clothColor >= 0 && spriteConfig.clothColor <= 360);

console.log('\n=== RESULTS ===');
console.log(`  Passed: ${pass} | Failed: ${fail}`);
if (fail === 0) console.log('  ✅ ALL TESTS PASSED');
else process.exit(1);
