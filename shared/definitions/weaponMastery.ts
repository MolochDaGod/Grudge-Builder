/**
 * Weapon Mastery — point-allocation talent trees per weapon type.
 *
 * Rules:
 *   - 100 shared mastery points (pool cap)
 *   - 1 point earned per character level
 *   - 9 weapon trees, each fully fills at 25 points
 *   - Nodes have 1, 3, or 5 max ranks
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

export interface MasteryNode {
  id: string;
  name: string;
  description: string;
  /** Max ranks (1, 3, or 5) */
  maxRanks: number;
  /** Stat key modified */
  stat: MasteryStat;
  /** Bonus per rank (percentage) */
  perRank: number;
  /** Points already spent in this tree required to unlock */
  requirement: number;
  /** Is this the signature/capstone node? */
  isSignature: boolean;
  /** Position in the tree visual (percentage) */
  position: { x: number; y: number };
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

// ── Stat bonus reference table ───────────────────────────────────

export const MASTERY_STAT_BONUSES: MasteryStatBonus[] = [
  { stat: 'damage',           label: 'Damage',            statKey: 'damage',           mode: 'multiplicative', perRank: '+3% / rank' },
  { stat: 'criticalChance',   label: 'Critical Chance',   statKey: 'criticalChance',   mode: 'additive',       perRank: '+2% / rank' },
  { stat: 'criticalDamage',   label: 'Critical Damage',   statKey: 'criticalDamage',   mode: 'additive',       perRank: '+5% / rank' },
  { stat: 'attackSpeed',      label: 'Attack Speed',      statKey: 'attackSpeed',       mode: 'additive',       perRank: '+2% / rank' },
  { stat: 'armorPenetration', label: 'Armor Penetration', statKey: 'armorPenetration', mode: 'additive',       perRank: '+3% / rank' },
  { stat: 'drainHealth',      label: 'Lifesteal',         statKey: 'drainHealth',       mode: 'additive',       perRank: '+2% / rank' },
];

// ── Tree builder helper ──────────────────────────────────────────

function tree(
  id: string, name: string, desc: string, color: string,
  nodes: Array<[string, string, number, MasteryStat, number, number, boolean, number, number]>,
): MasteryTree {
  // node tuple: [id, name, maxRanks, stat, perRank, requirement, isSignature, posX%, posY%]
  return {
    id, name, description: desc, color, totalPoints: 25,
    nodes: nodes.map(([nid, nname, maxRanks, stat, perRank, req, sig, px, py]) => ({
      id: nid, name: nname,
      description: `+${perRank}% ${statLabel(stat)} per rank`,
      maxRanks, stat, perRank, requirement: req, isSignature: sig,
      position: { x: px, y: py },
    })),
    edges: [[0,2],[1,2],[2,3],[2,4],[3,5],[4,5],[5,6]],
  };
}

function statLabel(s: MasteryStat): string {
  return { damage:'Damage', criticalChance:'Critical Chance', criticalDamage:'Critical Damage',
    attackSpeed:'Attack Speed', armorPenetration:'Armor Penetration', drainHealth:'Lifesteal' }[s];
}

// ── 9 Weapon Mastery Trees ───────────────────────────────────────

export const MASTERY_TREES: MasteryTree[] = [
  tree('swords', 'Swords', 'One-handed & two-handed blades — the balanced duelist.', '#7dd3fc', [
    ['sw_honed',     'Honed Edge',        5, 'criticalChance',   2, 0,  false, 18, 10],
    ['sw_tempered',  'Tempered Steel',     5, 'damage',           3, 0,  false, 82, 10],
    ['sw_flurry',    'Flurry',             3, 'attackSpeed',      2, 5,  false, 50, 30],
    ['sw_vital',     'Vital Strike',       3, 'criticalDamage',   5, 10, false, 18, 50],
    ['sw_sunder',    'Sundering Cuts',     3, 'armorPenetration', 3, 10, false, 82, 50],
    ['sw_blood',     'Bloodletting',       5, 'drainHealth',      2, 16, false, 50, 70],
    ['sw_master',    'Master Swordsman',   1, 'criticalChance',   8, 22, true,  50, 90],
  ]),

  tree('axes', 'Axes', 'One-handed & two-handed axes — brutal, reckless damage.', '#ef4444', [
    ['ax_savage',    'Savage Swings',      5, 'damage',           3, 0,  false, 18, 10],
    ['ax_brutal',    'Brutal Cleave',      5, 'criticalDamage',   5, 0,  false, 82, 10],
    ['ax_rending',   'Rending Blows',      3, 'armorPenetration', 3, 5,  false, 50, 30],
    ['ax_reckless',  'Reckless Fury',      3, 'criticalChance',   2, 10, false, 18, 50],
    ['ax_gore',      'Gore Drinker',       3, 'drainHealth',      2, 10, false, 82, 50],
    ['ax_frenzy',    'Frenzied Chops',     5, 'attackSpeed',      2, 16, false, 50, 70],
    ['ax_berserker', "Berserker's Edge",   1, 'damage',          12, 22, true,  50, 90],
  ]),

  tree('hammers', 'Hammers', 'One-handed & two-handed hammers — crushing, armor-shattering force.', '#f59e0b', [
    ['hm_crush',     'Crushing Blow',      5, 'criticalDamage',   5, 0,  false, 18, 10],
    ['hm_plate',     'Plate Breaker',      5, 'armorPenetration', 3, 0,  false, 82, 10],
    ['hm_heavy',     'Heavy Impact',       3, 'damage',           3, 5,  false, 50, 30],
    ['hm_concuss',   'Concussive Strike',  3, 'criticalChance',   2, 10, false, 18, 50],
    ['hm_momentum',  'Momentum',           3, 'attackSpeed',      2, 10, false, 82, 50],
    ['hm_life',      'Lifebreaker',        5, 'drainHealth',      2, 16, false, 50, 70],
    ['hm_earth',     'Earthshatter',       1, 'criticalDamage',  20, 22, true,  50, 90],
  ]),

  tree('guns', 'Guns', 'Firearms — armor-piercing precision at range.', '#94a3b8', [
    ['gn_armor',     'Armor Piercer',      5, 'armorPenetration', 3, 0,  false, 18, 10],
    ['gn_steady',    'Steady Aim',         5, 'criticalChance',   2, 0,  false, 82, 10],
    ['gn_rapid',     'Rapid Fire',         3, 'attackSpeed',      2, 5,  false, 50, 30],
    ['gn_heavy',     'Heavy Rounds',       3, 'damage',           3, 10, false, 18, 50],
    ['gn_kill',      'Kill Shot',          3, 'criticalDamage',   5, 10, false, 82, 50],
    ['gn_siphon',    'Siphon Rounds',      5, 'drainHealth',      2, 16, false, 50, 70],
    ['gn_deadeye',   'Deadeye',            1, 'armorPenetration',12, 22, true,  50, 90],
  ]),

  tree('bows', 'Bows', 'Bows — agile, fast-firing marksmanship.', '#22c55e', [
    ['bw_quick',     'Quick Draw',         5, 'attackSpeed',      2, 0,  false, 18, 10],
    ['bw_eagle',     'Eagle Eye',          5, 'criticalChance',   2, 0,  false, 82, 10],
    ['bw_power',     'Power Shot',         3, 'damage',           3, 5,  false, 50, 30],
    ['bw_vital',     'Vital Aim',          3, 'criticalDamage',   5, 10, false, 18, 50],
    ['bw_bodkin',    'Bodkin Tips',         3, 'armorPenetration', 3, 10, false, 82, 50],
    ['bw_leech',     'Leeching Arrows',    5, 'drainHealth',      2, 16, false, 50, 70],
    ['bw_master',    'Master Archer',      1, 'attackSpeed',      8, 22, true,  50, 90],
  ]),

  tree('crossbows', 'Crossbows', 'Crossbows — heavy bolts that punch through armor.', '#b45309', [
    ['cb_bolt',      'Bolt Driver',        5, 'armorPenetration', 3, 0,  false, 18, 10],
    ['cb_punch',     'Punch Through',      5, 'criticalDamage',   5, 0,  false, 82, 10],
    ['cb_marks',     'Marksmanship',       3, 'criticalChance',   2, 5,  false, 50, 30],
    ['cb_heavy',     'Heavy Bolts',        3, 'damage',           3, 10, false, 18, 50],
    ['cb_crank',     'Crank Loader',       3, 'attackSpeed',      2, 10, false, 82, 50],
    ['cb_drain',     'Draining Bolts',     5, 'drainHealth',      2, 16, false, 50, 70],
    ['cb_siege',     'Siege Sniper',       1, 'armorPenetration',12, 22, true,  50, 90],
  ]),

  tree('staves', 'Staves', 'Battle staves — disciplined, sweeping melee force.', '#14b8a6', [
    ['st_focus',     'Focused Force',      5, 'damage',           3, 0,  false, 18, 10],
    ['st_keen',      'Keen Insight',        5, 'criticalChance',   2, 0,  false, 82, 10],
    ['st_empower',   'Empowered Strikes',  3, 'criticalDamage',   5, 5,  false, 50, 30],
    ['st_whirl',     'Whirling Staff',     3, 'attackSpeed',      2, 10, false, 18, 50],
    ['st_spirit',    'Spirit Siphon',      3, 'drainHealth',      2, 10, false, 82, 50],
    ['st_mind',      'Mind Over Armor',    5, 'armorPenetration', 3, 16, false, 50, 70],
    ['st_grand',     'Staff Grandmaster',  1, 'damage',          12, 22, true,  50, 90],
  ]),

  tree('spears', 'Spears', 'Spears & polearms — swift, impaling reach.', '#e879f9', [
    ['sp_swift',     'Swift Thrusts',      5, 'attackSpeed',      2, 0,  false, 18, 10],
    ['sp_impale',    'Impaling Force',     5, 'damage',           3, 0,  false, 82, 10],
    ['sp_precise',   'Precise Lunge',      3, 'criticalChance',   2, 5,  false, 50, 30],
    ['sp_phalanx',   'Phalanx Pierce',     3, 'armorPenetration', 3, 10, false, 18, 50],
    ['sp_skewer',    'Skewer',             3, 'criticalDamage',   5, 10, false, 82, 50],
    ['sp_blood',     'Bloodspear',         5, 'drainHealth',      2, 16, false, 50, 70],
    ['sp_dragoon',   "Dragoon's Reach",    1, 'attackSpeed',      8, 22, true,  50, 90],
  ]),

  tree('staffs', 'Staffs', 'Arcane staffs — bursting spellcraft and soul-draining magic.', '#a855f7', [
    ['sf_arcane',    'Arcane Surge',       5, 'criticalDamage',   5, 0,  false, 18, 10],
    ['sf_mana',      'Mana Burn',          5, 'damage',           3, 0,  false, 82, 10],
    ['sf_spell',     'Spell Crit',         3, 'criticalChance',   2, 5,  false, 50, 30],
    ['sf_soul',      'Soul Tap',           3, 'drainHealth',      2, 10, false, 18, 50],
    ['sf_quick',     'Quickcast',          3, 'attackSpeed',      2, 10, false, 82, 50],
    ['sf_ward',      'Mage Ward Pierce',   5, 'armorPenetration', 3, 16, false, 50, 70],
    ['sf_fury',      "Archmage's Fury",    1, 'criticalDamage',  20, 22, true,  50, 90],
  ]),
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
