/**
 * Escrow-mint cNFTs for existing grudachain production NPCs (no wipe/reseed).
 */
import "dotenv/config";
import { db } from "../server/db";
import { users, accounts, characters } from "../shared/schema";
import { eq, or, sql } from "drizzle-orm";
import { nftMintingService } from "../server/spriteGeneration/services/nftMinting";

async function main() {
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.username}) = 'grudachain'`)
    .limit(1);
  if (!user) throw new Error("GRUDACHAIN user not found");

  const [account] = await db
    .select()
    .from(accounts)
    .where(or(eq(accounts.userId, user.id), sql`upper(coalesce(${accounts.grudgeId},'')) = 'GRUDACHAIN'`))
    .limit(1);
  if (!account) throw new Error("account not found");

  const chars = await db
    .select()
    .from(characters)
    .where(or(eq(characters.userId, user.id), eq(characters.accountId, account.id)));

  console.log(`Reminting ${chars.length} characters for account ${account.id}`);
  let ok = 0;
  let fail = 0;
  for (const c of chars) {
    try {
      const r = await nftMintingService.mintCharacterAsCNFT(c.id, account.id, undefined, undefined, {
        directToUser: false,
      });
      if (r.success) {
        ok++;
        console.log(`  ok ${c.name} → ${r.actionId}`);
      } else {
        fail++;
        console.log(`  fail ${c.name}: ${r.error}`);
      }
    } catch (e) {
      fail++;
      console.log(`  err ${c.name}:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`Done ok=${ok} fail=${fail}`);
  process.exit(fail > 0 && ok === 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
