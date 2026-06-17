/**
 * Weapon Mastery — point-allocation talent trees per weapon type.
 *
 * Rules:
 *   - 100 shared mastery points (pool cap)
 *   - 1 point earned per character level
 *   - 9 weapon trees, each fully fills at 35 points (7 core + 10 micro + signature)
 *   - Core nodes: 1, 3, or 5 max ranks
 *   - Micro nodes: 1 rank — small passives, crit bonuses, on-hit procs
 *   - Signature node (capstone) requires 22 points in tree, 1 rank
 *   - All bonuses are generic passives that fold into the stat engine
 *
 * This file is the ONE TRUTH for mastery data — the React page,
 * the in-game talent UI, and the server validation all read from here.
 */

// ── Types ────────────────────────────────────────────────────────

export type MasteryStat =
  | 'damage'
  | 'criticalChance'
  | 'criticalDamage'
  | 'attackSpeed'
  | 'armorPenetration'
  | 'drainHealth';

export type MasteryNodeKind = 'core' | 'micro' | 'signature';

export interface MasteryNode {
  id: string;
  name: string;
  description: string;
  /** Max ranks (1, 3, or 5 for core; micro is always 1) */
  maxRanks: number;
  /** Stat key modified */
  stat: MasteryStat;
  /** Bonus per rank (percentage) */
  perRank: number;
  /** Points already spent in this tree required to unlock */
  requirement: number;
  /** Core / micro satellite / signature capstone */
  kind: MasteryNodeKind;
  /** Position in the tree visual (percentage) */
  position: { x: number; y: number };
  /** Optional proc flavor shown in UI (micro nodes) */
  procLabel?: string;
}

export interface MasteryTree {
  id: string;
  name: string;
  description: string;
  color: string;
  /** Total points to fully fill this tree */
  totalPoints: number;
  nodes: MasteryNode[];
  /** SVG edge connections [fromNodeIndex, toNodeIndex][] */
  edges: [number, number][];
}

export interface MasteryStatBonus {
  stat: MasteryStat;
  label: string;
  statKey: string;
  mode: 'multiplicative' | 'additive';
  perRank: string;
}

// ── Constants ────────────────────────────────────────────────────

export const MASTERY_POOL_CAP = 100;
export const MASTERY_POINTS_PER_LEVEL = 1;
export const MASTERY_TREE_COUNT = 9;
export const MASTERY_CORE_POINTS = 25;
export const MASTERY_MICRO_COUNT = 10;
export const MASTERY_TREE_FILL_POINTS = MASTERY_CORE_POINTS + MASTERY_MICRO_COUNT; // 35

// ── Stat bonus reference table ───────────────────────────────────

export const MASTERY_STAT_BONUSES: MasteryStatBonus[] = [
  { stat: 'damage',           label: 'Damage',            statKey: 'damage',           mode: 'multiplicative', perRank: '+3% / rank' },
  { stat: 'criticalChance',   label: 'Critical Chance',   statKey: 'criticalChance',   mode: 'additive',       perRank: '+2% / rank' },
  { stat: 'criticalDamage',   label: 'Critical Damage',   statKey: 'criticalDamage',   mode: 'additive',       perRank: '+5% / rank' },
  { stat: 'attackSpeed',      label: 'Attack Speed',      statKey: 'attackSpeed',       mode: 'additive',       perRank: '+2% / rank' },
  { stat: 'armorPenetration', label: 'Armor Penetration', statKey: 'armorPenetration', mode: 'additive',       perRank: '+3% / rank' },
  { stat: 'drainHealth',      label: 'Lifesteal',         statKey: 'drainHealth',       mode: 'additive',       perRank: '+2% / rank' },
];

// ── Tree builder helpers ─────────────────────────────────────────

function statLabel(s: MasteryStat): string {
  return { damage:'Damage', criticalChance:'Critical Chance', criticalDamage:'Critical Damage',
    attackSpeed:'Attack Speed', armorPenetration:'Armor Penetration', drainHealth:'Lifesteal' }[s];
}

function coreDesc(stat: MasteryStat, perRank: number): string {
  return `+${perRank}% ${statLabel(stat)} per rank`;
}

function microDesc(stat: MasteryStat, perRank: number, procLabel?: string): string {
  const base = `+${perRank}% ${statLabel(stat)}`;
  return procLabel ? `${base} — ${procLabel}` : base;
}

type CoreTuple = [string, string, number, MasteryStat, number, number, boolean, number, number];
type MicroTuple = [string, string, MasteryStat, number, number, number, number, string?];

const CORE_EDGES: [number, number][] = [[0,2],[1,2],[2,3],[2,4],[3,5],[4,5],[5,6]];

const MICRO_POSITIONS: { x: number; y: number }[] = [
  { x: 6, y: 14 }, { x: 6, y: 22 }, { x: 6, y: 30 }, { x: 6, y: 38 }, { x: 6, y: 46 },
  { x: 94, y: 14 }, { x: 94, y: 22 }, { x: 94, y: 30 }, { x: 94, y: 38 }, { x: 94, y: 46 },
];

const MICRO_REQUIREMENTS = [0, 0, 2, 4, 6, 8, 10, 12, 14, 16];

/** Which core node index each micro node hangs off */
const MICRO_PARENT_CORE = [0, 0, 2, 2, 3, 4, 4, 5, 5, 6];

function tree(
  id: string, name: string, desc: string, color: string,
  coreNodes: CoreTuple[],
  microNodes: MicroTuple[],
): MasteryTree {
  const nodes: MasteryNode[] = coreNodes.map(([nid, nname, maxRanks, stat, perRank, req, sig, px, py]) => ({
    id: nid,
    name: nname,
    description: sig
      ? `+${perRank}% ${statLabel(stat)}`
      : coreDesc(stat, perRank),
    maxRanks,
    stat,
    perRank,
    requirement: req,
    kind: sig ? 'signature' : 'core',
    position: { x: px, y: py },
  }));

  const coreCount = nodes.length;

  microNodes.forEach(([nid, nname, stat, perRank, px, py, req, proc], i) => {
    nodes.push({
      id: nid,
      name: nname,
      description: microDesc(stat, perRank, proc),
      maxRanks: 1,
      stat,
      perRank,
      requirement: req ?? MICRO_REQUIREMENTS[i],
      kind: 'micro',
      position: { x: px, y: py },
      procLabel: proc,
    });
  });

  const edges: [number, number][] = [...CORE_EDGES];
  for (let i = 0; i < MASTERY_MICRO_COUNT; i++) {
    const microIdx = coreCount + i;
    const parentIdx = MICRO_PARENT_CORE[i] ?? 2;
    edges.push([parentIdx, microIdx]);
  }

  return {
    id,
    name,
    description: desc,
    color,
    totalPoints: MASTERY_TREE_FILL_POINTS,
    nodes,
    edges,
  };
}

function micro(
  prefix: string,
  defs: Array<[string, MasteryStat, number, string?]>,
): MicroTuple[] {
  return defs.map(([name, stat, perRank, proc], i) => {
    const pos = MICRO_POSITIONS[i];
    return [`${prefix}_m${i + 1}`, name, stat, perRank, pos.x, pos.y, MICRO_REQUIREMENTS[i], proc];
  });
}

// ── 9 Weapon Mastery Trees (7 core + 10 micro + signature = 17 nodes) ──

export const MASTERY_TREES: MasteryTree[] = [
  tree('swords', 'Swords', 'One-handed & two-handed blades — the balanced duelist.', '#7dd3fc', [
    ['sw_honed',     'Honed Edge',        5, 'criticalChance',   2, 0,  false, 18, 10],
    ['sw_tempered',  'Tempered Steel',     5, 'damage',           3, 0,  false, 82, 10],
    ['sw_flurry',    'Flurry',             3, 'attackSpeed',      2, 5,  false, 50, 30],
    ['sw_vital',     'Vital Strike',       3, 'criticalDamage',   5, 10, false, 18, 50],
    ['sw_sunder',    'Sundering Cuts',     3, 'armorPenetration', 3, 10, false, 82, 50],
    ['sw_blood',     'Bloodletting',       5, 'drainHealth',      2, 16, false, 50, 70],
    ['sw_master',    'Master Swordsman',   1, 'criticalChance',   8, 22, true,  50, 90],
  ], micro('sw', [
    ['Riposte',        'criticalChance',   1, 'on successful block'],
    ['Edge Flow',      'attackSpeed',      1, 'after landing a crit'],
    ['Hemorrhage',     'drainHealth',      1, 'bleed on crit'],
    ['Expose Seam',    'armorPenetration', 1, 'vs armored targets'],
    ['Duelist Poise',  'damage',           1, 'while above 75% HP'],
    ['Counter Cut',    'criticalChance',   1, 'within 2s of parry'],
    ['Steel Grace',    'attackSpeed',      1, 'on kill'],
    ['Lethal Finesse', 'criticalDamage',   1, 'vs bleeding foes'],
    ['Blade Echo',     'damage',           1, 'second hit bonus'],
    ['Finishing Thrust','criticalDamage',  1, 'vs targets under 25% HP'],
  ])),

  tree('axes', 'Axes', 'One-handed & two-handed axes — brutal, reckless damage.', '#ef4444', [
    ['ax_savage',    'Savage Swings',      5, 'damage',           3, 0,  false, 18, 10],
    ['ax_brutal',    'Brutal Cleave',      5, 'criticalDamage',   5, 0,  false, 82, 10],
    ['ax_rending',   'Rending Blows',      3, 'armorPenetration', 3, 5,  false, 50, 30],
    ['ax_reckless',  'Reckless Fury',      3, 'criticalChance',   2, 10, false, 18, 50],
    ['ax_gore',      'Gore Drinker',       3, 'drainHealth',      2, 10, false, 82, 50],
    ['ax_frenzy',    'Frenzied Chops',     5, 'attackSpeed',      2, 16, false, 50, 70],
    ['ax_berserker', "Berserker's Edge",   1, 'damage',          12, 22, true,  50, 90],
  ], micro('ax', [
    ['Deep Wound',     'criticalDamage',   1, 'chance to cause bleed'],
    ['Cleave Aftershock','damage',         1, 'splash on crit'],
    ['Blood Scent',    'criticalChance',   1, 'vs bleeding targets'],
    ['Skull Splitter', 'armorPenetration', 1, 'vs stunned foes'],
    ['Rage Pulse',     'attackSpeed',      1, 'on taking damage'],
    ['Gore Fountain',  'drainHealth',      1, 'on multi-hit'],
    ['Wild Chop',      'damage',           1, 'first swing bonus'],
    ['Executioner',    'criticalDamage',   1, 'vs low HP targets'],
    ['Fury Chain',     'attackSpeed',      1, 'stacking on kill'],
    ['Carnage Mark',   'damage',           1, 'marked target proc'],
  ])),

  tree('hammers', 'Hammers', 'One-handed & two-handed hammers — crushing, armor-shattering force.', '#f59e0b', [
    ['hm_crush',     'Crushing Blow',      5, 'criticalDamage',   5, 0,  false, 18, 10],
    ['hm_plate',     'Plate Breaker',      5, 'armorPenetration', 3, 0,  false, 82, 10],
    ['hm_heavy',     'Heavy Impact',       3, 'damage',           3, 5,  false, 50, 30],
    ['hm_concuss',   'Concussive Strike',  3, 'criticalChance',   2, 10, false, 18, 50],
    ['hm_momentum',  'Momentum',           3, 'attackSpeed',      2, 10, false, 82, 50],
    ['hm_life',      'Lifebreaker',        5, 'drainHealth',      2, 16, false, 50, 70],
    ['hm_earth',     'Earthshatter',       1, 'criticalDamage',  20, 22, true,  50, 90],
  ], micro('hm', [
    ['Staggering Blow','armorPenetration', 1, 'chance to stagger'],
    ['Shockwave',      'damage',           1, 'AoE on heavy hit'],
    ['Bone Crunch',    'criticalDamage',   1, 'vs armored foes'],
    ['Hammerfall',     'damage',           1, 'overhead slam bonus'],
    ['Iron Temper',    'criticalChance',   1, 'after blocking'],
    ['Crushing Rhythm','attackSpeed',      1, 'every 3rd swing'],
    ['Sunder Armor',   'armorPenetration', 1, 'stacking debuff'],
    ['Concussive Echo','criticalChance',   1, 'on stagger proc'],
    ['Maul Momentum',  'attackSpeed',      1, 'while charging'],
    ['Seismic Finish', 'criticalDamage',   1, 'finisher proc'],
  ])),

  tree('guns', 'Guns', 'Firearms — armor-piercing precision at range.', '#94a3b8', [
    ['gn_armor',     'Armor Piercer',      5, 'armorPenetration', 3, 0,  false, 18, 10],
    ['gn_steady',    'Steady Aim',         5, 'criticalChance',   2, 0,  false, 82, 10],
    ['gn_rapid',     'Rapid Fire',         3, 'attackSpeed',      2, 5,  false, 50, 30],
    ['gn_heavy',     'Heavy Rounds',       3, 'damage',           3, 10, false, 18, 50],
    ['gn_kill',      'Kill Shot',          3, 'criticalDamage',   5, 10, false, 82, 50],
    ['gn_siphon',    'Siphon Rounds',      5, 'drainHealth',      2, 16, false, 50, 70],
    ['gn_deadeye',   'Deadeye',            1, 'armorPenetration',12, 22, true,  50, 90],
  ], micro('gn', [
    ['Tracer Round',   'criticalChance',   1, 'marks target'],
    ['Suppressed Shot','damage',           1, 'from stealth'],
    ['Ricochet',       'damage',           1, 'bounce proc'],
    ['Hot Brass',      'attackSpeed',      1, 'on reload cancel'],
    ['Armor Crack',    'armorPenetration', 1, 'stacking shred'],
    ['Headhunter',     'criticalDamage',   1, 'headshot bonus'],
    ['Blood Ammo',     'drainHealth',      1, 'on crit'],
    ['Burst Fire',     'attackSpeed',      1, '3-round burst'],
    ['Long Range',     'damage',           1, 'beyond 15m'],
    ['Coup de Grace',  'criticalDamage',   1, 'vs marked target'],
  ])),

  tree('bows', 'Bows', 'Bows — agile, fast-firing marksmanship.', '#22c55e', [
    ['bw_quick',     'Quick Draw',         5, 'attackSpeed',      2, 0,  false, 18, 10],
    ['bw_eagle',     'Eagle Eye',          5, 'criticalChance',   2, 0,  false, 82, 10],
    ['bw_power',     'Power Shot',         3, 'damage',           3, 5,  false, 50, 30],
    ['bw_vital',     'Vital Aim',          3, 'criticalDamage',   5, 10, false, 18, 50],
    ['bw_bodkin',    'Bodkin Tips',         3, 'armorPenetration', 3, 10, false, 82, 50],
    ['bw_leech',     'Leeching Arrows',    5, 'drainHealth',      2, 16, false, 50, 70],
    ['bw_master',    'Master Archer',      1, 'attackSpeed',      8, 22, true,  50, 90],
  ], micro('bw', [
    ['Pinning Shot',   'criticalChance',   1, 'root on crit'],
    ['Volley Spark',   'attackSpeed',      1, 'after multishot'],
    ['Barbed Tip',     'drainHealth',      1, 'DoT on hit'],
    ['Wind Read',      'damage',           1, 'standing still'],
    ['Snap Draw',      'attackSpeed',      1, 'opening shot'],
    ['Heartseeker',    'criticalDamage',   1, 'max range bonus'],
    ['Broadhead',      'armorPenetration', 1, 'vs shields'],
    ['Hunter Mark',    'damage',           1, 'marked prey'],
    ['Rapid Nock',     'attackSpeed',      1, 'on dodge'],
    ['Rain of Arrows', 'criticalChance',   1, 'AoE proc chance'],
  ])),

  tree('crossbows', 'Crossbows', 'Crossbows — heavy bolts that punch through armor.', '#b45309', [
    ['cb_bolt',      'Bolt Driver',        5, 'armorPenetration', 3, 0,  false, 18, 10],
    ['cb_punch',     'Punch Through',      5, 'criticalDamage',   5, 0,  false, 82, 10],
    ['cb_marks',     'Marksmanship',       3, 'criticalChance',   2, 5,  false, 50, 30],
    ['cb_heavy',     'Heavy Bolts',        3, 'damage',           3, 10, false, 18, 50],
    ['cb_crank',     'Crank Loader',       3, 'attackSpeed',      2, 10, false, 82, 50],
    ['cb_drain',     'Draining Bolts',     5, 'drainHealth',      2, 16, false, 50, 70],
    ['cb_siege',     'Siege Sniper',       1, 'armorPenetration',12, 22, true,  50, 90],
  ], micro('cb', [
    ['Bolt Splinter',  'armorPenetration', 1, 'shred on hit'],
    ['Crank Mastery',  'attackSpeed',      1, 'faster reload'],
    ['Breaching Bolt', 'damage',           1, 'vs cover'],
    ['Scope Glint',    'criticalChance',   1, 'aimed shot'],
    ['Barbed Bolt',    'drainHealth',      1, 'bleed proc'],
    ['Siege Load',     'criticalDamage',   1, 'charged shot'],
    ['Repeater',       'attackSpeed',      1, 'combo reload'],
    ['Weak Point',     'criticalChance',   1, 'vs stunned'],
    ['Pierce Line',    'armorPenetration', 1, 'line shot'],
    ['Execution Bolt', 'criticalDamage',   1, 'vs pinned foe'],
  ])),

  tree('staves', 'Staves', 'Battle staves — disciplined, sweeping melee force.', '#14b8a6', [
    ['st_focus',     'Focused Force',      5, 'damage',           3, 0,  false, 18, 10],
    ['st_keen',      'Keen Insight',        5, 'criticalChance',   2, 0,  false, 82, 10],
    ['st_empower',   'Empowered Strikes',  3, 'criticalDamage',   5, 5,  false, 50, 30],
    ['st_whirl',     'Whirling Staff',     3, 'attackSpeed',      2, 10, false, 18, 50],
    ['st_spirit',    'Spirit Siphon',      3, 'drainHealth',      2, 10, false, 82, 50],
    ['st_mind',      'Mind Over Armor',    5, 'armorPenetration', 3, 16, false, 50, 70],
    ['st_grand',     'Staff Grandmaster',  1, 'damage',          12, 22, true,  50, 90],
  ], micro('st', [
    ['Sweep Arc',      'attackSpeed',      1, 'wide swing bonus'],
    ['Chi Focus',      'criticalChance',   1, 'after meditation'],
    ['Pressure Point', 'armorPenetration', 1, 'debuff proc'],
    ['Flow State',     'damage',           1, 'combo chain'],
    ['Spirit Tap',     'drainHealth',      1, 'on whirlwind'],
    ['Iron Body',      'damage',           1, 'while blocking'],
    ['Stunning Jab',   'criticalChance',   1, 'stun proc'],
    ['Vault Strike',   'criticalDamage',   1, 'leap attack'],
    ['Deflect',        'attackSpeed',      1, 'after parry'],
    ['Monk Finish',    'criticalDamage',   1, 'finisher combo'],
  ])),

  tree('spears', 'Spears', 'Spears & polearms — swift, impaling reach.', '#e879f9', [
    ['sp_swift',     'Swift Thrusts',      5, 'attackSpeed',      2, 0,  false, 18, 10],
    ['sp_impale',    'Impaling Force',     5, 'damage',           3, 0,  false, 82, 10],
    ['sp_precise',   'Precise Lunge',      3, 'criticalChance',   2, 5,  false, 50, 30],
    ['sp_phalanx',   'Phalanx Pierce',     3, 'armorPenetration', 3, 10, false, 18, 50],
    ['sp_skewer',    'Skewer',             3, 'criticalDamage',   5, 10, false, 82, 50],
    ['sp_blood',     'Bloodspear',         5, 'drainHealth',      2, 16, false, 50, 70],
    ['sp_dragoon',   "Dragoon's Reach",    1, 'attackSpeed',      8, 22, true,  50, 90],
  ], micro('sp', [
    ['Reach Advantage', 'damage',           1, 'max range bonus'],
    ['Impale',          'criticalDamage',   1, 'on lunge'],
    ['Phalanx Wall',    'armorPenetration', 1, 'vs groups'],
    ['Skewering Run',   'attackSpeed',      1, 'while sprinting'],
    ['Bleeding Thrust', 'drainHealth',      1, 'pierce bleed'],
    ['Brace',           'damage',           1, 'counter-thrust'],
    ['Dragonfly',       'criticalChance',   1, 'evade then strike'],
    ['Line Breaker',    'armorPenetration', 1, 'shield bypass'],
    ['Pole Vault',      'attackSpeed',      1, 'gap closer'],
    ['Heart Lance',     'criticalDamage',   1, 'rear attack'],
  ])),

  tree('staffs', 'Staffs', 'Arcane staffs — bursting spellcraft and soul-draining magic.', '#a855f7', [
    ['sf_arcane',    'Arcane Surge',       5, 'criticalDamage',   5, 0,  false, 18, 10],
    ['sf_mana',      'Mana Burn',          5, 'damage',           3, 0,  false, 82, 10],
    ['sf_spell',     'Spell Crit',         3, 'criticalChance',   2, 5,  false, 50, 30],
    ['sf_soul',      'Soul Tap',           3, 'drainHealth',      2, 10, false, 18, 50],
    ['sf_quick',     'Quickcast',          3, 'attackSpeed',      2, 10, false, 82, 50],
    ['sf_ward',      'Mage Ward Pierce',   5, 'armorPenetration', 3, 16, false, 50, 70],
    ['sf_fury',      "Archmage's Fury",    1, 'criticalDamage',  20, 22, true,  50, 90],
  ], micro('sf', [
    ['Arcane Spark',   'criticalChance',   1, 'spell hit proc'],
    ['Mana Siphon',    'drainHealth',      1, 'on spell crit'],
    ['Void Pierce',    'armorPenetration', 1, 'vs magic resist'],
    ['Overload',       'criticalDamage',   1, 'chance on cast'],
    ['Quick Sigil',    'attackSpeed',      1, 'instant cast'],
    ['Soul Brand',     'damage',           1, 'marked by spell'],
    ['Frost Echo',     'criticalChance',   1, 'slow then crit'],
    ['Chaos Flux',     'damage',           1, 'random element'],
    ['Ward Breaker',   'armorPenetration', 1, 'strip ward'],
    ['Meteor Shard',   'criticalDamage',   1, 'AoE crit proc'],
  ])),
];

// ── Helpers ──────────────────────────────────────────────────────

export function getMasteryTree(id: string): MasteryTree | undefined {
  return MASTERY_TREES.find(t => t.id === id);
}

/** Calculate total bonus from allocated ranks across all trees */
export function calculateMasteryBonuses(
  allocations: Record<string, Record<string, number>>, // treeId -> nodeId -> ranks
): Record<MasteryStat, number> {
  const bonuses: Record<MasteryStat, number> = {
    damage: 0, criticalChance: 0, criticalDamage: 0,
    attackSpeed: 0, armorPenetration: 0, drainHealth: 0,
  };

  for (const tree of MASTERY_TREES) {
    const treeAlloc = allocations[tree.id];
    if (!treeAlloc) continue;
    for (const node of tree.nodes) {
      const ranks = treeAlloc[node.id] || 0;
      if (ranks > 0) {
        bonuses[node.stat] += node.perRank * ranks;
      }
    }
  }

  return bonuses;
}

/** Validate that allocations respect requirements and rank limits */
export function validateAllocations(
  allocations: Record<string, Record<string, number>>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  let totalSpent = 0;

  for (const tree of MASTERY_TREES) {
    const treeAlloc = allocations[tree.id];
    if (!treeAlloc) continue;

    let treeSpent = 0;
    for (const node of tree.nodes) {
      const ranks = treeAlloc[node.id] || 0;
      if (ranks < 0 || ranks > node.maxRanks) {
        errors.push(`${tree.name}/${node.name}: ${ranks} ranks exceeds max ${node.maxRanks}`);
      }
      if (ranks > 0 && treeSpent < node.requirement) {
        errors.push(`${tree.name}/${node.name}: requires ${node.requirement} points, only ${treeSpent} spent`);
      }
      treeSpent += ranks;
    }
    totalSpent += treeSpent;
  }

  if (totalSpent > MASTERY_POOL_CAP) {
    errors.push(`Total ${totalSpent} exceeds pool cap ${MASTERY_POOL_CAP}`);
  }

  return { valid: errors.length === 0, errors };
}