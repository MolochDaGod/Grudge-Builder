/**
 * Patch grudge-crafting.html icon SSOT:
 * - Grudge Islands single-frame profession / management / eagle-shield icons
 * - Ban pack/* and skills/class/* multi-sprite sheets as UI icons
 * - Item/material icons via assets category paths + ObjectStore singles
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = resolve(__dirname, '../client/public/grudge-crafting.html');
let html = readFileSync(file, 'utf8');

html = html.replace(/VERSION: '5\.10\.1'/, "VERSION: '5.11.0'");
html = html.replace(/v5\.10\.1/g, 'v5.11.0');

const ssot = `
/** Grudge Islands single-frame icons (NOT pack/skill spritesheets).
 *  Source: grudge-islands dist assets — profession + management + eagle-shield + factions.
 *  Served as ./crafting-icons/* next to this page on Puter.
 *  HARD RULE: never use multi-image sprite sheets (pack/weapons, pack/misc/Effect,
 *  skills/class/* crop sheets) as UI icons for nav, stations, or professions.
 */
const CRAFTING_ICON_BASE = (function () {
  try {
    return new URL('./crafting-icons/', window.location.href).href;
  } catch (e) {
    return './crafting-icons/';
  }
})();
const CRAFTING_UI_ICONS = {
  Miner: CRAFTING_ICON_BASE + 'miner.png',
  Forester: CRAFTING_ICON_BASE + 'forester.png',
  Mystic: CRAFTING_ICON_BASE + 'mystic.png',
  Chef: CRAFTING_ICON_BASE + 'chef.png',
  Engineer: CRAFTING_ICON_BASE + 'engineer.png',
  recipes: CRAFTING_ICON_BASE + 'management.png',
  management: CRAFTING_ICON_BASE + 'management.png',
  camps: CRAFTING_ICON_BASE + 'eagle-shield.png',
  camp: CRAFTING_ICON_BASE + 'eagle-shield.png',
  benches: CRAFTING_ICON_BASE + 'eagle-shield.png',
  dashboard: CRAFTING_ICON_BASE + 'management.png',
  inventory: CRAFTING_ICON_BASE + 'management.png',
  arsenal: CRAFTING_ICON_BASE + 'management.png',
  materials: CRAFTING_ICON_BASE + 'miner.png',
  account: CRAFTING_ICON_BASE + 'management.png',
  factions: {
    crusade: CRAFTING_ICON_BASE + 'faction-crusade.png',
    fabled: CRAFTING_ICON_BASE + 'faction-fabled.png',
    legion: CRAFTING_ICON_BASE + 'faction-legion.png',
  },
};
function isForbiddenSpriteIconUrl(url) {
  const u = String(url || '');
  if (/\\/icons\\/pack\\//i.test(u)) return true;
  if (/\\/icons\\/skills\\/class\\//i.test(u)) return true;
  if (/Effect\\.png/i.test(u)) return true;
  return false;
}
`;

if (!html.includes('CRAFTING_UI_ICONS')) {
  html = html.replace(
    /const GRUDGE_API = window\.GRUDGE_CONFIG\.GAME_DATA;\r?\nconst GRUDGE_AUTH = window\.GRUDGE_CONFIG\.AUTH_GATEWAY;/,
    `const GRUDGE_API = window.GRUDGE_CONFIG.GAME_DATA;\nconst GRUDGE_AUTH = window.GRUDGE_CONFIG.AUTH_GATEWAY;\n${ssot}`,
  );
}

html = html.replace(
  /const PROF_ICON_URLS = \{[\s\S]*?\};/,
  `const PROF_ICON_URLS = {
  Miner: CRAFTING_UI_ICONS.Miner,
  Forester: CRAFTING_UI_ICONS.Forester,
  Mystic: CRAFTING_UI_ICONS.Mystic,
  Chef: CRAFTING_UI_ICONS.Chef,
  Engineer: CRAFTING_UI_ICONS.Engineer,
};`,
);

html = html.replace(
  /const WCS_STATIONS = \[[\s\S]*?\];\r?\n\r?\nconst WCS_TIER_NAMES/,
  `const WCS_STATIONS = [
  { id: 'camp',     name: 'Camp Bench',     icon: '⛺', prof: 'All',      color: '#d4a843', always: true,
    iconUrl: CRAFTING_UI_ICONS.camp,
    bgUrl: CRAFTING_UI_ICONS.camps,
    unlockKeys: ['camp', 'campfire', 'tent', 'tent_stage', 'tenthalf', 'tentclosed', 'workbench', 'crafting bench', 'starter'],
    desc: 'T0 universal recipes — always at owned starter camp (tent + fire + workbench).' },
  { id: 'smithing', name: 'Smithing Table', icon: '⚒️', prof: 'Miner',     color: '#ef4444', always: false,
    iconUrl: CRAFTING_UI_ICONS.Miner,
    bgUrl: CRAFTING_UI_ICONS.Miner,
    unlockKeys: ['smithing', 'forge', 'anvil', 'workbenchanvil', 'grind_wheel', 'workbenchgrind', 'smithy', 'smelter', 'sharpen'],
    desc: 'Miner station — anvil / forge / grind wheel.' },
  { id: 'lumber',   name: 'Lumber Table',   icon: '🌲', prof: 'Forester',  color: '#22c55e', always: false,
    iconUrl: CRAFTING_UI_ICONS.Forester,
    bgUrl: CRAFTING_UI_ICONS.Forester,
    unlockKeys: ['lumber', 'sawmill', 'lumbermill', 'woodwork', 'carpentry', 'tanner', 'toolaxe'],
    desc: 'Forester station — bows, leather, planks.' },
  { id: 'loom',     name: 'Loom Table',     icon: '🧵', prof: 'Mystic',    color: '#a78bfa', always: false,
    iconUrl: CRAFTING_UI_ICONS.Mystic,
    bgUrl: CRAFTING_UI_ICONS.Mystic,
    unlockKeys: ['loom', 'spell_table', 'spelltable', 'enchanter', 'arcane table', 'tailor', 'structurecloth'],
    desc: 'Mystic station — cloth, staves, essence.' },
  { id: 'cooking',  name: 'Cooking Table',  icon: '🍳', prof: 'Chef',      color: '#f59e0b', always: false,
    iconUrl: CRAFTING_UI_ICONS.Chef,
    bgUrl: CRAFTING_UI_ICONS.Chef,
    unlockKeys: ['cooking', 'kitchen', 'campfire', 'cookfire', 'cooking_bench', 'cooking table', 'stove', 'hearth', 'fishingstand'],
    desc: 'Chef station — campfire or cooking bench.' },
  { id: 'tinker',   name: 'Tinker Table',   icon: '🔧', prof: 'Engineer',  color: '#60a5fa', always: false,
    iconUrl: CRAFTING_UI_ICONS.Engineer,
    bgUrl: CRAFTING_UI_ICONS.Engineer,
    unlockKeys: ['tinker', 'tinker table', 'workshop', 'engineer', 'workbench', 'gunsmith', 'anvil', 'workbenchanvil'],
    desc: 'Engineer station — workbench or anvil.' },
];

const WCS_TIER_NAMES`,
);

// Favicon + nav bulk replacements (forbidden pack/skill → single-frame)
const navPairs = [
  ['https://assets.grudge-studio.com/icons/pack/weapons/Sword_01.png', './crafting-icons/management.png'],
  ['https://assets.grudge-studio.com/icons/pack/weapons/Hammer_01.png', './crafting-icons/miner.png'],
  ['https://assets.grudge-studio.com/icons/pack/armor/Chest_01.png', './crafting-icons/management.png'],
  ['https://assets.grudge-studio.com/icons/pack/misc/Effect.png', './crafting-icons/eagle-shield.png'],
  ['https://assets.grudge-studio.com/icons/pack/weapons/Crossbow_01.png', './crafting-icons/engineer.png'],
  ['https://assets.grudge-studio.com/icons/pack/weapons/Axe_01.png', './crafting-icons/forester.png'],
  ['https://assets.grudge-studio.com/icons/pack/weapons/Bow_01.png', './crafting-icons/management.png'],
  ['https://info.grudge-studio.com/icons/skills/class/engineer/engineer_01.png', './crafting-icons/miner.png'],
  ['https://info.grudge-studio.com/icons/skills/class/hunter/hunter_01.png', './crafting-icons/forester.png'],
  ['https://info.grudge-studio.com/icons/skills/class/bloodmage/bloodmage_01.png', './crafting-icons/mystic.png'],
  ['https://info.grudge-studio.com/icons/skills/class/firemage/firemage_01.png', './crafting-icons/chef.png'],
  ['https://info.grudge-studio.com/icons/skills/class/paladin/paladin_01.png', './crafting-icons/management.png'],
];
for (const [from, to] of navPairs) {
  html = html.split(from).join(to);
}

html = html.replace(
  "t.src = 'https://assets.grudge-studio.com/icons/pack/misc/Effect.png';",
  "t.src = './crafting-icons/management.png';",
);

// Force profession loader
html = html.replace(
  /async function loadProfessionIconsFromInfo\(\) \{[\s\S]*?console\.log\('\[info\] Profession icons applied from professions\.json'\);/,
  `async function loadProfessionIconsFromInfo() {
  try {
    for (const name of ['Miner', 'Forester', 'Mystic', 'Chef', 'Engineer']) {
      PROF_ICON_URLS[name] = CRAFTING_UI_ICONS[name];
      if (STATE.professions[name]) STATE.professions[name].iconUrl = CRAFTING_UI_ICONS[name];
    }
    document.querySelectorAll('img[data-prof-icon]').forEach((img) => {
      const n = img.getAttribute('data-prof-icon');
      const u = CRAFTING_UI_ICONS[n] || PROF_ICON_URLS[n];
      if (u) { img.src = u; img.dataset.iconKind = 'single'; }
    });
    for (const st of WCS_STATIONS) {
      if (st.prof && CRAFTING_UI_ICONS[st.prof]) st.iconUrl = CRAFTING_UI_ICONS[st.prof];
      if (st.prof === 'All' || st.id === 'camp') st.iconUrl = CRAFTING_UI_ICONS.camp;
    }
    console.log('[icons] Profession icons forced from crafting-icons (islands SSOT)');`,
);

html = html.replace(
  /if \(st\.prof === 'All'\) st\.iconUrl = INFO_CDN \+ '\/icons\/pack\/misc\/Effect\.png';/g,
  "if (st.prof === 'All' || st.id === 'camp') st.iconUrl = CRAFTING_UI_ICONS.camp;",
);

// Remove engineer crossbow override if still present
html = html.replace(
  /\/\/ Engineer shares engineer skill pack with Miner[\s\S]*?Crossbow_01\.png';\s*;\s*\}/,
  '',
);

const newResolve = `
/** ObjectStore single-frame icons — never multi-sprite pack atlases. */
const OBJECTSTORE_ICON_GH = 'https://molochdagod.github.io/ObjectStore/icons';
const OBJECTSTORE_ICON_RAW = 'https://raw.githubusercontent.com/MolochDaGod/ObjectStore/main/icons';

const CATEGORY_SINGLE_FALLBACK = {
  swords: OBJECTSTORE_ICON_GH + '/496_rpg_icons/S_Sword01.png',
  sword: OBJECTSTORE_ICON_GH + '/496_rpg_icons/S_Sword01.png',
  greatswords: OBJECTSTORE_ICON_GH + '/496_rpg_icons/S_Sword15.png',
  axes1h: OBJECTSTORE_ICON_GH + '/496_rpg_icons/S_Axe01.png',
  axe: OBJECTSTORE_ICON_GH + '/496_rpg_icons/S_Axe01.png',
  greataxes: OBJECTSTORE_ICON_GH + '/496_rpg_icons/S_Axe05.png',
  daggers: OBJECTSTORE_ICON_GH + '/496_rpg_icons/S_Sword03.png',
  hammers1h: OBJECTSTORE_ICON_GH + '/496_rpg_icons/I_Rock01.png',
  hammers2h: OBJECTSTORE_ICON_GH + '/496_rpg_icons/I_Rock02.png',
  spears: OBJECTSTORE_ICON_GH + '/496_rpg_icons/S_Axe03.png',
  bows: OBJECTSTORE_ICON_GH + '/496_rpg_icons/S_Sword07.png',
  crossbows: OBJECTSTORE_ICON_GH + '/496_rpg_icons/S_Sword08.png',
  guns: OBJECTSTORE_ICON_GH + '/496_rpg_icons/S_Sword09.png',
  shields: OBJECTSTORE_ICON_GH + '/496_rpg_icons/E_Gold01.png',
  armor: OBJECTSTORE_ICON_GH + '/496_rpg_icons/A_Clothing01.png',
  greenFoods: OBJECTSTORE_ICON_GH + '/496_rpg_icons/I_C_Meat.png',
  blueFoods: OBJECTSTORE_ICON_GH + '/496_rpg_icons/I_C_Meat.png',
  redFoods: OBJECTSTORE_ICON_GH + '/496_rpg_icons/I_C_RawMeat.png',
  mysticPotions: OBJECTSTORE_ICON_GH + '/496_rpg_icons/E_Gold02.png',
  engineerConsumables: OBJECTSTORE_ICON_GH + '/496_rpg_icons/I_Rock03.png',
  tools: OBJECTSTORE_ICON_GH + '/496_rpg_icons/S_Axe02.png',
  default: (typeof CRAFTING_UI_ICONS !== 'undefined' ? CRAFTING_UI_ICONS.management : './crafting-icons/management.png'),
};

const MAT_ICON_URLS = {
  'Wood Scraps': OBJECTSTORE_ICON_GH + '/materials/oak-log.png',
  'Stone Fragments': OBJECTSTORE_ICON_GH + '/496_rpg_icons/I_Rock01.png',
  'Plant Fiber': OBJECTSTORE_ICON_GH + '/materials/oak-log.png',
  'Animal Hide': OBJECTSTORE_ICON_GH + '/materials/rawhide.png',
  'Animal Bone': OBJECTSTORE_ICON_GH + '/496_rpg_icons/I_Rock02.png',
  'Raw Meat': OBJECTSTORE_ICON_GH + '/496_rpg_icons/I_C_RawMeat.png',
  'Wild Herbs': OBJECTSTORE_ICON_RAW + '/items/herbs/herbs_01.png',
  'Water': OBJECTSTORE_ICON_GH + '/496_rpg_icons/E_Gold02.png',
  'Junk Ore': OBJECTSTORE_ICON_GH + '/materials/iron-ore.png',
  'Scrap Metal': OBJECTSTORE_ICON_GH + '/materials/iron-ore.png',
  'Torn Rag': OBJECTSTORE_ICON_GH + '/496_rpg_icons/A_Clothing01.png',
  'Leather Scraps': OBJECTSTORE_ICON_GH + '/materials/rawhide.png',
  'Charcoal': OBJECTSTORE_ICON_GH + '/496_rpg_icons/I_Rock05.png',
  'Rotted Wood': OBJECTSTORE_ICON_GH + '/materials/oak-log.png',
  'Copper Ore': OBJECTSTORE_ICON_GH + '/materials/iron-ore.png',
  'Iron Ore': OBJECTSTORE_ICON_GH + '/materials/iron-ore.png',
  'Pine Log': OBJECTSTORE_ICON_GH + '/materials/oak-log.png',
  'Oak Log': OBJECTSTORE_ICON_GH + '/materials/oak-log.png',
  'Herb': OBJECTSTORE_ICON_RAW + '/items/herbs/herbs_01.png',
  'Linen Cloth': OBJECTSTORE_ICON_GH + '/496_rpg_icons/A_Clothing02.png',
  'Copper Ingot': OBJECTSTORE_ICON_GH + '/496_rpg_icons/I_GoldBar.png',
  'Iron Ingot': OBJECTSTORE_ICON_GH + '/496_rpg_icons/I_GoldBar.png',
  'Hardened Leather': OBJECTSTORE_ICON_GH + '/materials/rawhide.png',
  'Pine Plank': OBJECTSTORE_ICON_GH + '/496_rpg_icons/E_Wood01.png',
  'Oak Plank': OBJECTSTORE_ICON_GH + '/496_rpg_icons/E_Wood02.png',
  'Rough Plank': OBJECTSTORE_ICON_GH + '/496_rpg_icons/E_Wood01.png',
};

function resolveCanonicalIcon(urlOrPath, category, name) {
  const cat = (category || '').toString();
  const nm = (name || '').toString();
  if (MAT_ICON_URLS[nm]) return MAT_ICON_URLS[nm];
  const matHit = Object.keys(MAT_ICON_URLS).find((k) => k.toLowerCase() === nm.toLowerCase());
  if (matHit) return MAT_ICON_URLS[matHit];

  let raw = (urlOrPath || '').trim();
  let path = rewriteIconHost(raw);

  if (raw.startsWith('http') && path.startsWith('http')) {
    try { path = new URL(raw).pathname; } catch { /* keep */ }
  }
  if (path && path.startsWith('http')) {
    try { path = new URL(path).pathname; } catch { /* keep */ }
  }
  if (path && !path.startsWith('/') && !path.startsWith('http')) path = '/' + path;
  path = (path || '').replace(/^\\/api\\/v1/, '');

  if (isForbiddenSpriteIconUrl(path) || isForbiddenSpriteIconUrl(raw)) {
    return CATEGORY_SINGLE_FALLBACK[cat]
      || CATEGORY_SINGLE_FALLBACK[cat.toLowerCase()]
      || CATEGORY_SINGLE_FALLBACK.default;
  }

  // Category item paths on assets CDN (real single PNGs when present)
  if (/\\/icons\\/(swords|axes1h|greataxes|daggers|hammers1h|hammers2h|greatswords|spears|bows|crossbows|guns|shields|armor|armor_full|food|consumables)\\//i.test(path)) {
    return ASSET_CDN + path;
  }

  if (/molochdagod\\.github\\.io\\/ObjectStore/i.test(raw) || /raw\\.githubusercontent\\.com\\/MolochDaGod\\/ObjectStore/i.test(raw)) {
    return raw;
  }

  if (CATEGORY_SINGLE_FALLBACK[cat] || CATEGORY_SINGLE_FALLBACK[cat.toLowerCase()]) {
    return CATEGORY_SINGLE_FALLBACK[cat] || CATEGORY_SINGLE_FALLBACK[cat.toLowerCase()];
  }
  if (/armor|helm|chest|boot|bracer|shoulder|ring|necklace/i.test(nm)) return CATEGORY_SINGLE_FALLBACK.armor;
  if (/sword|axe|bow|staff|dagger|hammer|gun|crossbow|spear|weapon|mace/i.test(nm)) return CATEGORY_SINGLE_FALLBACK.swords;
  if (/ore|ingot|metal|scrap/i.test(nm)) return OBJECTSTORE_ICON_GH + '/materials/iron-ore.png';
  if (/log|plank|wood/i.test(nm)) return OBJECTSTORE_ICON_GH + '/materials/oak-log.png';
  if (/leather|hide|rawhide/i.test(nm)) return OBJECTSTORE_ICON_GH + '/materials/rawhide.png';
  if (/herb|plant|fiber/i.test(nm)) return OBJECTSTORE_ICON_RAW + '/items/herbs/herbs_01.png';
  if (/meat|food|stew|soup/i.test(nm)) return OBJECTSTORE_ICON_GH + '/496_rpg_icons/I_C_Meat.png';

  if (path && path.startsWith('/icons/') && !isForbiddenSpriteIconUrl(path)) return ASSET_CDN + path;
  if (raw.startsWith('https://') && !isForbiddenSpriteIconUrl(raw)) return raw;

  return CATEGORY_SINGLE_FALLBACK.default;
}
`;

if (!html.includes('MAT_ICON_URLS')) {
  html = html.replace(
    /function resolveCanonicalIcon\(urlOrPath, category, name\) \{[\s\S]*?\n\}\r?\n\r?\nfunction iconImgTag/,
    newResolve + '\n\nfunction iconImgTag',
  );
}

html = html.replace(
  /const fallbackInfo = INFO_CDN \+ ICON_PACK_FALLBACK\.default;\r?\n  const fallbackAsset = ASSET_CDN \+ ICON_PACK_FALLBACK\.default;/,
  'const fallbackInfo = CRAFTING_UI_ICONS.management;\n  const fallbackAsset = CRAFTING_UI_ICONS.management;',
);

html = html.replace(
  /const kind = \/\\\/skills\\\/\/i\.test\(safe\) \? "skill" : "pack";/,
  'const kind = /crafting-icons\\//i.test(safe) || /ObjectStore\\/icons/i.test(safe) ? "single" : "item";',
);

html = html.replace(
  /this\.src='https:\/\/assets\.grudge-studio\.com\/icons\/pack\/misc\/Effect\.png'/g,
  "this.src='./crafting-icons/eagle-shield.png'",
);

// itemIcon rewrite
html = html.replace(
  /function itemIcon\(name, emoji, cssClass, size\) \{[\s\S]*?\n\}/,
  `function itemIcon(name, emoji, cssClass, size) {
  const cls = cssClass || 'item-img';
  const key = (name || '').toLowerCase();
  let url = ITEM_ICON_MAP[key] || (typeof MAT_ICON_URLS !== 'undefined' ? MAT_ICON_URLS[name] : null) || null;
  if (!url && typeof MAT_ICON_URLS !== 'undefined') {
    const matHit = Object.keys(MAT_ICON_URLS).find((k) => k.toLowerCase() === key);
    if (matHit) url = MAT_ICON_URLS[matHit];
  }
  if (!url) url = resolveCanonicalIcon(null, null, name);
  if (typeof isForbiddenSpriteIconUrl === 'function' && isForbiddenSpriteIconUrl(url)) {
    url = CRAFTING_UI_ICONS.management;
  }
  if (url) return iconImgTag(url, name, cls, size);
  return emoji || '📦';
}`,
);

// object-fit contain for single icons (reduce skill crop CSS impact)
html = html.replace(
  /img\.nav-icon\[data-icon-kind="skill"\]\s*\{[^}]+\}/g,
  'img.nav-icon[data-icon-kind="skill"], img.nav-icon[data-icon-kind="single"] { object-fit: contain !important; object-position: center !important; }',
);

writeFileSync(file, html);
console.log('OK patched', file);
console.log('CRAFTING_UI', html.includes('CRAFTING_UI_ICONS'));
console.log('pack Sword left', /pack\/weapons\/Sword_01/.test(html));
console.log('Effect.png left', /pack\/misc\/Effect/.test(html));
console.log('eagle-shield', html.includes('eagle-shield.png'));
console.log('MAT_ICON_URLS', html.includes('MAT_ICON_URLS'));
console.log('len', html.length);
