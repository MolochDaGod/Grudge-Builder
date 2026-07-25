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
import {
  PRODUCTION_HERO_NPC_BY_ID,
  PRODUCTION_HERO_DEPLOY_ACCOUNT,
  assertProductionHeroCoverage,
  productionHeroDeploySummary,
  QUESTS_PER_HERO,
} from "../shared/definitions/factionHeroCampaign";

const LEGEND_IDS = ["racalvin", "john_wayne", "scourge_faithbearer"] as const;
const TARGET_USERNAME = PRODUCTION_HERO_DEPLOY_ACCOUNT;

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
  const coverage = assertProductionHeroCoverage();
  const summary = productionHeroDeploySummary();

  console.log("═══ Canonical hero migrate plan (production NPCs) ═══");
  console.log(`Target account username: ${TARGET_USERNAME} (master admin — deploys world NPCs)`);
  console.log(`HERO_ROSTER count:       ${rosterIds.length}`);
  console.log(`Legends:                 ${legends.map((h) => h.id).join(", ")}`);
  console.log(`Total codex with legends:${codex.length}`);
  console.log(`Campaign missions:       ${summary.campaignMissions} (${QUESTS_PER_HERO}/hero)`);
  console.log(`End-game missions:       ${summary.endGameMissions}`);
  console.log(`Daily templates:         ${summary.dailyTemplates}`);
  console.log("");
  console.log("Roster (faction hero NPCs):");
  for (const h of HERO_ROSTER) {
    const npc = PRODUCTION_HERO_NPC_BY_ID[h.id];
    const q = npc?.campaignMissionIds?.join(", ") ?? "—";
    console.log(`  - ${h.id.padEnd(12)} ${h.name} (${h.raceId}/${h.classId}) L${h.level}`);
    console.log(`      quests: ${q}`);
  }
  console.log("Legends:");
  for (const h of legends) {
    const npc = PRODUCTION_HERO_NPC_BY_ID[h.id];
    console.log(`  - ${h.id.padEnd(22)} ${h.name} [${h.rarity}]`);
    if (npc) console.log(`      quests: ${npc.campaignMissionIds.join(", ")}`);
  }
  console.log("");
  if (!coverage.ok) {
    for (const e of coverage.errors) console.warn(`⚠ ${e}`);
  } else {
    console.log("✓ Production coverage OK (27 NPCs, 81 campaign missions, 3 legends).");
  }
  console.log("After seed: each character is a world quest-giver NPC with prompted AI + 3 campaign quests.");
  console.log("Faction commander unlocks after 24 quests (8 heroes × 3) — see docs/FACTION_HERO_CAMPAIGN.md");
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

  // Prefer exact GRUDACHAIN username (case-insensitive); avoid grabbing other grudgedev emails first
  const userRows = await db
    .select()
    .from(users)
    .where(
      or(
        sql`lower(${users.username}) = ${TARGET_USERNAME}`,
        sql`lower(${users.username}) = 'grudachain'`,
        sql`${users.grudgeId} = 'GRUDGE_MPOUIQCG529CA'`,
        sql`lower(${users.email}) = 'grudgedev@gmail.com'`,
      ) as any,
    )
    .limit(20);

  const user =
    userRows.find((u) => (u.username || "").toLowerCase() === TARGET_USERNAME) ||
    userRows.find((u) => (u.username || "").toUpperCase() === "GRUDACHAIN") ||
    userRows[0];

  if (!user) {
    console.error(`No user found for ${TARGET_USERNAME} — abort.`);
    process.exit(1);
  }

  console.log(`Resolved user=${user.id} username=${user.username} grudgeId=${user.grudgeId}`);

  // Account: by userId, or orphan grudgeId GRUDACHAIN / user grudgeId, or create
  let account =
    (
      await db.select().from(accounts).where(eq(accounts.userId, user.id)).limit(1)
    )[0] || null;

  if (!account) {
    const byGrudge = await db
      .select()
      .from(accounts)
      .where(
        or(
          sql`upper(coalesce(${accounts.grudgeId}, '')) = 'GRUDACHAIN'`,
          user.grudgeId ? eq(accounts.grudgeId, user.grudgeId) : sql`false`,
        ) as any,
      )
      .limit(5);
    account = byGrudge[0] || null;
    if (account && account.userId !== user.id) {
      console.log(`Linking account ${account.id} → user ${user.id} (was userId=${account.userId})`);
      const [linked] = await db
        .update(accounts)
        .set({ userId: user.id, grudgeId: account.grudgeId || user.grudgeId || "GRUDACHAIN", updatedAt: Date.now() } as any)
        .where(eq(accounts.id, account.id))
        .returning();
      account = linked;
    }
  }

  if (!account) {
    console.log(`Creating account for ${user.username}…`);
    const [created] = await db
      .insert(accounts)
      .values({
        userId: user.id,
        grudgeId: user.grudgeId || "GRUDACHAIN",
        displayName: "Grudachain Production",
        gold: 0,
        characterTokens: 99,
      } as any)
      .returning();
    account = created;
  }

  if (!account) {
    console.error("Failed to resolve/create account — abort.");
    process.exit(1);
  }

  console.log(`Resolved account=${account.id} grudgeId=${account.grudgeId}`);

  if (flags.wipe) {
    // Wipe by userId OR accountId so we catch all grudachain vault rows
    const existing = await db
      .select({ id: characters.id, name: characters.name })
      .from(characters)
      .where(
        or(eq(characters.userId, user.id), eq(characters.accountId, account.id)) as any,
      );

    console.log(`Wipe: ${existing.length} character(s) on grudachain`);
    for (const c of existing) {
      try {
        await db.delete(characterNFTs).where(eq(characterNFTs.characterId, c.id));
      } catch (e) {
        console.warn(`  nft cleanup ${c.id}:`, e);
      }
      await db.delete(characters).where(eq(characters.id, c.id));
      console.log(`  deleted ${c.id} (${c.name})`);
    }
  }

  if (flags.seed) {
    let mintOk = 0;
    let mintFail = 0;
    let nftMintingService: any = null;
    if (flags.mint) {
      try {
        ({ nftMintingService } = await import("../server/spriteGeneration/services/nftMinting"));
      } catch (e) {
        console.warn("nftMintingService unavailable — seeding without mint", e);
        flags.mint = false;
      }
    }

    for (const hero of codex) {
      const raceId = hero.raceId === "pirate" ? "human" : hero.raceId;
      const classId = hero.classId || "warrior";
      const deploy = PRODUCTION_HERO_NPC_BY_ID[hero.id];
      const attrs = {
        Strength: 20,
        Vitality: 20,
        Endurance: 20,
        Intellect: 20,
        Wisdom: 20,
        Dexterity: 20,
        Agility: 20,
        Tactics: 20,
      };
      const charId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `char_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      const [row] = await db
        .insert(characters)
        .values({
          id: charId,
          userId: user.id,
          accountId: account.id,
          name: hero.name,
          raceId: String(raceId),
          classId: String(classId),
          level: hero.level || 50,
          xp: 0,
          hp: 100 + (hero.level || 50) * 10,
          energy: 100,
          attributes: attrs,
          inventory: [],
          equipment: {},
          professionLevels: {},
          skillLoadouts: {},
          weaponSkillSelections: {},
          selectedSkills: {},
          avatarUrl: hero.portrait?.startsWith("http")
            ? hero.portrait
            : hero.portrait
              ? `https://grudgewarlords.com${hero.portrait}`
              : null,
          gameEra: "warlords",
          createdAt: Date.now(),
          model3d: {
            baseModelId: String(raceId),
            equippedMeshes: { body: "A", arms: "A", legs: "A", head: "A" },
            weaponSlots: {},
            faceVariant: "A",
            skinColor: "#ffffff",
            armorColor: "#ffffff",
            capeEnabled: false,
            scale: 1,
            gameEra: "warlords",
            grudge6: true,
            renderPipeline: "grudge6",
            codexId: hero.id,
            isCanonical: true,
            isProductionNpc: true,
            deployAccount: TARGET_USERNAME,
            deployRole: deploy?.deployRole ?? "faction_hero_npc",
            campaignMissionIds: deploy?.campaignMissionIds ?? [],
            sectorSpawn: deploy?.sectorSpawn ?? hero.sectorSpawn,
            racePrefixHint: deploy?.racePrefixHint,
            aiSystemPrompt: deploy?.aiSystemPrompt?.slice(0, 500),
          },
        } as any)
        .returning();

      console.log(`  seeded ${row.id} ← ${hero.id} (${hero.name})`);

      if (flags.mint && nftMintingService) {
        try {
          const mint = await nftMintingService.mintCharacterAsCNFT(
            row.id,
            account.id,
            undefined,
            undefined,
            { directToUser: false },
          );
          if (mint.success) {
            mintOk++;
            console.log(`    cNFT escrow: ${mint.actionId}`);
          } else {
            mintFail++;
            console.log(`    cNFT escrow failed: ${mint.error || "failed"}`);
          }
        } catch (e) {
          mintFail++;
          console.log(`    cNFT error:`, e instanceof Error ? e.message : e);
        }
      }
    }
    console.log(`Seed complete: ${codex.length} heroes on ${TARGET_USERNAME}.`);
    if (flags.mint) console.log(`cNFT mint: ok=${mintOk} fail=${mintFail}`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
