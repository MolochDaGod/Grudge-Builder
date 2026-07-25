/**
 * migrate-canonical-heroes-to-grudachain.ts
 *
 * Seeds the 27 canonical Warlords heroes (24 HERO_ROSTER + Racalvin, John Wayne,
 * Scourge Faithbearer) onto the master admin account `grudachain`.
 *
 * SAFETY:
 *   - Default mode is **dry-run** (prints plan only).
 *   - Wipe requires: --confirm-wipe-grudachain
 *   - Seed requires: --confirm-seed
 *   - Never touches other accounts.
 *
 * Usage (from repo root, with DATABASE_URL / Railway env loaded):
 *   npx tsx scripts/migrate-canonical-heroes-to-grudachain.ts
 *   npx tsx scripts/migrate-canonical-heroes-to-grudachain.ts --confirm-wipe-grudachain --confirm-seed
 *
 * See docs/PRODUCTION_HERO_WIPE_AND_MIGRATE.md
 */

import { HERO_ROSTER } from "../shared/definitions/lore";
import { HERO_CODEX_WITH_LEGENDS } from "../shared/definitions/heroCodex";

const LEGEND_IDS = ["racalvin", "john_wayne", "scourge_faithbearer"] as const;
const TARGET_USERNAME = "grudachain";

function parseArgs(argv: string[]) {
  return {
    wipe: argv.includes("--confirm-wipe-grudachain"),
    seed: argv.includes("--confirm-seed"),
    mint: !argv.includes("--no-mint"),
  };
}

function plan() {
  const rosterIds = HERO_ROSTER.map((h) => h.id);
  const codex = HERO_CODEX_WITH_LEGENDS;
  const legends = codex.filter((h) => (LEGEND_IDS as readonly string[]).includes(h.id));

  console.log("═══ Canonical hero migrate plan ═══");
  console.log(`Target account username: ${TARGET_USERNAME} (master admin)`);
  console.log(`HERO_ROSTER count:       ${rosterIds.length}`);
  console.log(`Legends:                 ${legends.map((h) => h.id).join(", ")}`);
  console.log(`Total codex with legends:${codex.length}`);
  console.log("");
  console.log("Roster:");
  for (const h of HERO_ROSTER) {
    console.log(`  - ${h.id.padEnd(12)} ${h.name} (${h.raceId}/${h.classId}) L${h.level}`);
  }
  console.log("Legends:");
  for (const h of legends) {
    console.log(`  - ${h.id.padEnd(22)} ${h.name} [${h.rarity}]`);
  }
  console.log("");
  if (codex.length !== 27) {
    console.warn(`⚠ Expected 27 heroes, codex has ${codex.length} — update plan before production seed.`);
  } else {
    console.log("✓ Count is 27 (24 roster + 3 legends).");
  }
  return codex;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const codex = plan();

  if (!flags.wipe && !flags.seed) {
    console.log("Dry-run only. No DB writes.");
    console.log("  Wipe:  --confirm-wipe-grudachain");
    console.log("  Seed:  --confirm-seed");
    console.log("  Skip mint: --no-mint");
    console.log("Load DATABASE_URL / Railway before destructive flags.");
    process.exit(0);
  }

  // Lazy-load DB only when mutating — avoids import failures in dry-run CI
  const { db } = await import("../server/db");
  const { accounts, characters, characterNFTs, users } = await import("../shared/schema");
  const { eq, or, sql } = await import("drizzle-orm");

  // Resolve grudachain account
  const [user] = await db
    .select()
    .from(users)
    .where(
      or(
        eq(users.username, TARGET_USERNAME),
        sql`lower(${users.username}) = ${TARGET_USERNAME}`,
        sql`lower(${users.email}) = 'grudgedev@gmail.com'`,
      ) as any,
    )
    .limit(1);

  if (!user) {
    console.error(`No user found for ${TARGET_USERNAME} / grudgedev@gmail.com — abort.`);
    process.exit(1);
  }

  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, user.id))
    .limit(1);

  if (!account) {
    console.error(`No account for user ${user.id} — abort.`);
    process.exit(1);
  }

  console.log(`Resolved user=${user.id} username=${(user as any).username} account=${account.id}`);

  if (flags.wipe) {
    const existing = await db
      .select({ id: characters.id, name: characters.name })
      .from(characters)
      .where(eq(characters.userId, user.id));

    console.log(`Wipe: ${existing.length} character(s) on grudachain`);
    for (const c of existing) {
      await db.delete(characterNFTs).where(eq(characterNFTs.characterId, c.id));
      await db.delete(characters).where(eq(characters.id, c.id));
      console.log(`  deleted ${c.id} (${c.name})`);
    }
  }

  if (flags.seed) {
    const { nftMintingService } = await import("../server/spriteGeneration/services/nftMinting");

    for (const hero of codex) {
      const raceId = hero.raceId === "pirate" ? "human" : hero.raceId;
      const classId = hero.classId || "warrior";
      const [row] = await db
        .insert(characters)
        .values({
          userId: user.id,
          name: hero.name,
          raceId: String(raceId),
          classId: String(classId),
          level: hero.level || 50,
          xp: 0,
          // attributes filled by DB defaults / triggers if any — keep minimal
          attributes: {
            Strength: 20,
            Vitality: 20,
            Endurance: 20,
            Intellect: 20,
            Wisdom: 20,
            Dexterity: 20,
            Agility: 20,
            Tactics: 20,
          },
          inventory: [],
          equipment: {},
          avatarUrl: hero.portrait?.startsWith("http")
            ? hero.portrait
            : hero.portrait
              ? `https://grudgewarlords.com${hero.portrait}`
              : null,
          gameEra: "warlords",
          model3d: {
            gameEra: "warlords",
            codexId: hero.id,
            isCanonical: true,
            baseModelId: String(raceId),
          },
        } as any)
        .returning();

      console.log(`  seeded ${row.id} ← ${hero.id} (${hero.name})`);

      if (flags.mint) {
        const mint = await nftMintingService.mintCharacterAsCNFT(
          row.id,
          account.id,
          undefined,
          undefined,
          { directToUser: false },
        );
        console.log(
          `    cNFT escrow: ${mint.success ? mint.actionId : mint.error || "failed"}`,
        );
      }
    }
    console.log(`Seed complete: ${codex.length} heroes on ${TARGET_USERNAME}.`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
