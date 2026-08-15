/**
 * Assign unique CraftPix skill icons (Documents/_extracted/icons/skills)
 * to every master-weaponSkills.json skill. Rejects generic reuse / sprite sheets.
 *
 * Writes:
 *   shared/definitions/weaponSkillDisplay.generated.ts
 *   client/public/icons/skills/catalog/{skillId}.png
 *   public/icons/skills/catalog/{skillId}.png
 *
 * Optional R2 upload: --upload
 *
 * Usage:
 *   node scripts/sync-weapon-skill-icons.mjs
 *   node scripts/sync-weapon-skill-icons.mjs --upload
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  "Documents",
  "_extracted",
  "icons",
  "skills",
);
const MASTER_URL = "https://objectstore.grudge-studio.com/api/v1/master-weaponSkills.json";
const MASTER_CACHE = path.join(ROOT, "_staging/master-weaponSkills.json");

const PACKS = {
  warrior: {
    dir: path.join(SRC_ROOT, "craftpix-net-152723-warrior-skills-vector-icon-pack/PNG"),
    files: (n) => `${n}.png`,
    count: 48,
  },
  werewolf: {
    dir: path.join(SRC_ROOT, "craftpix-net-273485-werewolf-skills-rpg-icon-pack/PNG"),
    files: (n) => `${n}.png`,
    count: 48,
  },
  lightning: {
    dir: path.join(SRC_ROOT, "craftpix-net-314083-lightning-mage-skills-icon-pack/PNG"),
    files: (n) => `${n}.png`,
    count: 48,
  },
  buff: {
    dir: path.join(SRC_ROOT, "craftpix-net-337860-buff-skill-rpg-icon-pack/PNG"),
    files: (n) => `${n}.png`,
    count: 48,
  },
  debuff: {
    dir: path.join(SRC_ROOT, "craftpix-net-939861-debuff-skill-icon-pack/PNG"),
    files: (n) => `${n}.png`,
    count: 48,
  },
  archer: {
    dir: path.join(SRC_ROOT, "craftpix-net-975103-archer-skills-icon-pack/PNG"),
    files: (n) => `${n}.png`,
    count: 48,
  },
  priest: {
    dir: path.join(SRC_ROOT, "craftpix-054810-rpg-skill-icons-for-priest/PNG"),
    files: (n) => (n <= 15 ? `active_${n}.png` : `passive_${n - 15}.png`),
    count: 20,
  },
  mage: {
    dir: path.join(SRC_ROOT, "craftpix-178949-rpg-skill-icons-for-mage/PNG"),
    files: (n) => (n <= 15 ? `active${n}.png` : `passive${n - 15}.png`),
    count: 20,
  },
  assassin: {
    dir: path.join(
      SRC_ROOT,
      "craftpix-524587-rpg-skill-icons-for-asassin/RPG-Skill-Icons-for-Asassin/PNG",
    ),
    files: (n) => (n <= 15 ? `active${n}.png` : `passive${n - 15}.png`),
    count: 20,
  },
};

function packForWeapon(weaponId, name, effects) {
  const blob = `${weaponId} ${name} ${(effects || []).join(" ")}`.toLowerCase();
  if (/bleed|curse|fear|poison|slow|silence|wound|rend|debuff/.test(blob)) return "debuff";
  if (/buff|surge|ward|shield|heal|cry|howl|stance|guard|fortif|reflect/.test(blob)) return "buff";
  if (/wolf|bear|form|raptor|grimoire|worge/.test(blob)) return "werewolf";
  if (/fire|frost|ice|lightning|arcane|holy|nature|meteor|blast|orb/.test(blob)) {
    return /holy|heal|ward/.test(blob) ? "priest" : /lightning|bolt/.test(blob) ? "lightning" : "mage";
  }
  switch (String(weaponId || "").toUpperCase()) {
    case "BOW":
    case "CROSSBOW":
    case "GUN":
      return "archer";
    case "DAGGER":
    case "CHAIN_KNIFE":
      return "assassin";
    case "STAFF":
    case "WAND":
    case "TOME":
      return "mage";
    case "GRIMOIRE":
    case "WORGE_GRIMOIRE":
      return "werewolf";
    default:
      return "warrior";
  }
}

function isSpriteSheet(buf) {
  if (buf.length < 24 || buf[0] !== 0x89 || buf[1] !== 0x50) return true;
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  if (w < 32 || h < 32) return true;
  const ratio = w / h;
  // Multi-sprite strips are wide or tall; catalog icons are square-ish
  return ratio > 1.6 || ratio < 0.6 || w > 2048 || h > 2048;
}

function nextIcon(packName, cursor) {
  const pack = PACKS[packName];
  const n = cursor[packName] || 1;
  if (n > pack.count) return null;
  const file = path.join(pack.dir, pack.files(n));
  cursor[packName] = n + 1;
  if (!fs.existsSync(file)) return nextIcon(packName, cursor);
  return file;
}

function collectSkills(catalog) {
  const out = [];
  const seen = new Set();
  for (const wt of catalog.weaponTypes || []) {
    const walk = (slots) => {
      for (const slot of slots || []) {
        for (const sk of slot.skills || []) {
          if (!sk?.id || seen.has(sk.id)) continue;
          seen.add(sk.id);
          out.push({
            id: sk.id,
            name: sk.name,
            description: sk.description || "",
            weaponType: wt.id,
            slotType: slot.type || "primary",
            effects: sk.effects || [],
            catalogIcon: sk.icon || "",
          });
        }
      }
    };
    walk(wt.slots);
    walk(wt.starterSlots);
  }
  return out;
}

async function loadMaster() {
  if (fs.existsSync(MASTER_CACHE)) {
    return JSON.parse(fs.readFileSync(MASTER_CACHE, "utf8"));
  }
  const res = await fetch(MASTER_URL);
  if (!res.ok) throw new Error(`master fetch ${res.status}`);
  const json = await res.json();
  fs.mkdirSync(path.dirname(MASTER_CACHE), { recursive: true });
  fs.writeFileSync(MASTER_CACHE, JSON.stringify(json));
  return json;
}

const doUpload = process.argv.includes("--upload");
const catalog = await loadMaster();
const skills = collectSkills(catalog);
const cursor = {};
const FALLBACK_ORDER = [
  "warrior",
  "werewolf",
  "lightning",
  "buff",
  "debuff",
  "archer",
  "priest",
  "mage",
  "assassin",
];

const rows = [];
const destDirs = [
  path.join(ROOT, "client/public/icons/skills/catalog"),
  path.join(ROOT, "public/icons/skills/catalog"),
];
for (const d of destDirs) fs.mkdirSync(d, { recursive: true });

let skippedSheet = 0;
for (const sk of skills) {
  let pack = packForWeapon(sk.weaponType, sk.name, sk.effects);
  let src = nextIcon(pack, cursor);
  if (!src) {
    for (const p of FALLBACK_ORDER) {
      src = nextIcon(p, cursor);
      if (src) {
        pack = p;
        break;
      }
    }
  }
  if (!src) throw new Error(`No icons left for ${sk.id}`);
  const buf = fs.readFileSync(src);
  if (isSpriteSheet(buf)) {
    skippedSheet++;
    continue;
  }
  const rel = `/icons/skills/catalog/${sk.id}.png`;
  for (const d of destDirs) {
    fs.copyFileSync(src, path.join(d, `${sk.id}.png`));
  }
  rows.push({
    id: sk.id,
    name: sk.name,
    description: sk.description,
    weaponType: sk.weaponType,
    slotType: sk.slotType,
    icon: rel,
    pack,
  });
}

const gen = `/**
 * Generated from info/objectstore master-weaponSkills.json v${catalog.version}
 * + CraftPix packs in Documents/_extracted/icons/skills
 * Do not edit by hand — node scripts/sync-weapon-skill-icons.mjs
 */
export interface WeaponSkillDisplay {
  id: string;
  name: string;
  description: string;
  weaponType: string;
  slotType: string;
  icon: string;
}

export const WEAPON_SKILL_DISPLAY: Record<string, WeaponSkillDisplay> = {
${rows
  .map(
    (r) =>
      `  ${JSON.stringify(r.id)}: ${JSON.stringify({
        id: r.id,
        name: r.name,
        description: r.description,
        weaponType: r.weaponType,
        slotType: r.slotType,
        icon: r.icon,
      })},`,
  )
  .join("\n")}
};

export function getWeaponSkillDisplay(skillId: string | null | undefined): WeaponSkillDisplay | null {
  if (!skillId) return null;
  return WEAPON_SKILL_DISPLAY[skillId] ?? null;
}
`;

const outTs = path.join(ROOT, "shared/definitions/weaponSkillDisplay.generated.ts");
fs.writeFileSync(outTs, gen);
console.log(
  `display map ${rows.length} skills · sheets skipped ${skippedSheet} · catalog v${catalog.version}`,
);

if (doUpload) {
  const { loadEnvFiles, getR2Config, createR2Client, uploadFile } = await import("./lib/r2Upload.mjs");
  loadEnvFiles(ROOT);
  const cfg = getR2Config();
  const client = createR2Client(cfg);
  let up = 0;
  for (const r of rows) {
    const local = path.join(ROOT, "client/public", r.icon.replace(/^\//, ""));
    const key = r.icon.replace(/^\//, "");
    const res = await uploadFile(client, cfg.bucket, local, key, { force: true });
    if (!res?.skipped) up++;
  }
  console.log(`uploaded ${up} → ${cfg.cdn}/icons/skills/catalog/`);
}
