/**
 * Production wipe: delete purged Grudachain / HERO_ROSTER NPC rows.
 * Update leftover player heroes to product race/class + emblem fallback.
 *
 * Never drops accounts, bags, wallets, or islands.
 *
 *   node scripts/purge-production-npc-heroes.mjs           # dry-run
 *   node scripts/purge-production-npc-heroes.mjs --apply   # write
 */
import fs from "fs";
import path from "path";
import pg from "pg";

const APPLY = process.argv.includes("--apply");
const PURGED_NAMES = [
  "aurion solbrand", "sigurd ironcrown", "kael nightwhisper", "theron greyclaw",
  "thrax bloodmaw", "grok stormhowl", "kira redfang", "vox skysplit",
  "gruk blacktusk", "nazgrim voidhand", "vexol quietblade", "morgash ashborn",
  "silesh dreadmire", "bone rattlebone", "whisper pale", "dredge gravewake",
  "aelindor swiftwind", "silvaine moonsong", "lyra threadweaver", "fenwick darkbough",
  "durgin stonefist", "brenna forgehammer", "thordak runebinder", "helga hearthhand",
  "sir aldric valorheart", "gareth moonshadow", "archmage elara brightspire",
  "kael shadowblade", "ulfgar bonecrusher", "hrothgar fangborn", "volka stormborn",
  "syala windrider", "thane ironshield", "bromm earthshaker", "runa forgekeeper",
  "durin tunnelwatcher", "thalion bladedancer", "sylara wildheart", "lyra stormweaver",
  "aelindra swiftbow", "grommash ironjaw", "fenris bloodfang", "zuejin the hexmaster",
  "razak deadeye", "lord malachar", "the ghoulfather", "necromancer vexis",
  "shade whisper", "racalvin", "cpt. john wayne", "captain john wayne",
  "scourge faithbearer", "racalvin tidebreaker",
];
const PURGED_CODEX = [
  "aurion", "sigurd", "kael", "theron", "thrax", "grok", "kira", "vox",
  "gruk", "nazgrim", "vexol", "morgash", "silesh", "bone", "whisper", "dredge",
  "aelindor", "silvaine", "lyra", "fenwick", "durgin", "brenna", "thordak", "helga",
  "racalvin", "john_wayne", "scourge_faithbearer", "john-wayne", "scourge",
];

function productRace(r) {
  const x = String(r || "").toLowerCase().replace(/_/g, "-");
  if (x === "western-kingdoms" || x === "wk" || x === "human") return "human";
  if (x === "high-elves" || x === "high-elf" || x === "elves") return "elf";
  if (x === "orcs") return "orc";
  if (x === "dwarves") return "dwarf";
  if (x === "barbarians" || x === "brb") return "barbarian";
  if (x === "undead" || x === "ud") return "undead";
  if (x === "pirate") return "human";
  return x || "human";
}

function productClass(c) {
  const x = String(c || "").toLowerCase();
  if (x === "knight" || x === "worg" || x === "worges") return "worge";
  if (x === "shaman" || x === "necromancer" || x === "cleric" || x === "wizard" || x === "lich") return "mage";
  if (x === "rogue" || x === "archer" || x === "hunter") return "ranger";
  if (x === "mage" || x === "warrior" || x === "ranger" || x === "worge") return x;
  if (x === "unarmed" || x === "harvest" || x === "worker") return "warrior";
  return x || "warrior";
}

function emblemUrl(race) {
  return `https://character.grudge-studio.com/assets/emblems/${productRace(race)}.webp`;
}

const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Need DATABASE_PUBLIC_URL or DATABASE_URL");
  process.exit(1);
}
if (/postgres\.railway\.internal/i.test(url)) {
  console.error("Got internal Railway URL — use DATABASE_PUBLIC_URL");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  max: 2,
});

async function main() {
  const client = await pool.connect();
  try {
    const totals = await client.query(`
      SELECT count(*)::int AS n,
             count(*) FILTER (WHERE game_era = 'warlords')::int AS warlords
      FROM characters
    `);
    console.log("characters total=", totals.rows[0].n, "warlords=", totals.rows[0].warlords);

    const candidates = await client.query(
      `
      SELECT id, name, race_id, class_id, user_id, account_id, game_era,
             avatar_url, model_3d
      FROM characters
      WHERE
        lower(regexp_replace(coalesce(name,''), '\\s+', ' ', 'g')) = ANY($1::text[])
        OR coalesce(model_3d->>'isProductionNpc','') IN ('true','1')
        OR coalesce(model_3d->>'isCanonical','') IN ('true','1')
        OR coalesce(model_3d->>'deployRole','') IN ('faction_hero_npc','legend_npc')
        OR lower(coalesce(model_3d->>'codexId','')) = ANY($2::text[])
        OR lower(coalesce(model_3d->>'codex_id','')) = ANY($2::text[])
        OR lower(coalesce(name,'')) = 'guest'
      ORDER BY name
      `,
      [PURGED_NAMES, PURGED_CODEX],
    );

    console.log("wipe candidates=", candidates.rows.length);
    for (const r of candidates.rows) {
      const npc = r.model_3d?.isProductionNpc || r.model_3d?.isCanonical || r.model_3d?.deployRole || "";
      console.log(`  ${r.id}  ${r.name}  ${r.race_id}/${r.class_id}  era=${r.game_era}  tag=${npc || "name-match"}`);
    }

    const stale = await client.query(`
      SELECT id, name, race_id, class_id, avatar_url
      FROM characters
      WHERE id <> ALL($1::varchar[])
        AND (
          lower(race_id) IN ('western-kingdoms','wk','high-elves','orcs','dwarves','barbarians')
          OR lower(class_id) IN ('knight','worg','worges','shaman','necromancer','rogue','cleric','wizard','lich','archer','hunter')
          OR avatar_url IS NULL OR avatar_url = ''
        )
      ORDER BY name
    `, [candidates.rows.map((r) => r.id)]);

    console.log("update candidates=", stale.rows.length);
    for (const r of stale.rows.slice(0, 40)) {
      console.log(
        `  ${r.id}  ${r.name}  ${r.race_id}->${productRace(r.race_id)}  ${r.class_id}->${productClass(r.class_id)}  avatar=${r.avatar_url ? "keep" : "emblem"}`,
      );
    }
    if (stale.rows.length > 40) console.log(`  … +${stale.rows.length - 40} more`);

    if (!APPLY) {
      console.log("Dry-run only. Re-run with --apply to write.");
      return;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(process.env.USERPROFILE || ".", "Documents", "_quarantine-grudge-builder-20260815-purge");
    fs.mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `prod-npc-wipe-${stamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify({ deleted: candidates.rows, updatedPreview: stale.rows }, null, 2));
    console.log("backup", backupPath);

    await client.query("BEGIN");
    let deletedNfts = 0;
    let deletedChars = 0;
    for (const r of candidates.rows) {
      try {
        const n = await client.query(`DELETE FROM character_nfts WHERE character_id = $1`, [r.id]);
        deletedNfts += n.rowCount || 0;
      } catch (e) {
        if (!/does not exist|undefined_table/i.test(String(e.message))) throw e;
      }
      const d = await client.query(`DELETE FROM characters WHERE id = $1`, [r.id]);
      deletedChars += d.rowCount || 0;
    }

    let updated = 0;
    for (const r of stale.rows) {
      const race = productRace(r.race_id);
      const cls = productClass(r.class_id);
      const avatar = r.avatar_url && String(r.avatar_url).trim() ? r.avatar_url : emblemUrl(race);
      const u = await client.query(
        `UPDATE characters SET race_id = $2, class_id = $3, avatar_url = $4 WHERE id = $1`,
        [r.id, race, cls, avatar],
      );
      updated += u.rowCount || 0;
    }
    await client.query("COMMIT");

    const after = await client.query(`
      SELECT count(*)::int AS n,
             count(*) FILTER (WHERE game_era = 'warlords')::int AS warlords
      FROM characters
    `);
    console.log(`applied delete chars=${deletedChars} nfts=${deletedNfts} update=${updated}`);
    console.log("characters after=", after.rows[0].n, "warlords=", after.rows[0].warlords);
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch { /* ignore */ }
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
