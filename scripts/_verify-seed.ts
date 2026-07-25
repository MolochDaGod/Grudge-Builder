import "dotenv/config";
import { db } from "../server/db";
import { users, accounts, characters, characterNFTs } from "../shared/schema";
import { eq, or, sql } from "drizzle-orm";

async function main() {
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.username}) = 'grudachain'`)
    .limit(1);
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, user!.id))
    .limit(1);
  const chars = await db
    .select({
      id: characters.id,
      name: characters.name,
      raceId: characters.raceId,
      classId: characters.classId,
      model3d: characters.model3d,
    })
    .from(characters)
    .where(or(eq(characters.userId, user!.id), eq(characters.accountId, account!.id)));
  const nfts = await db.select().from(characterNFTs).where(eq(characterNFTs.accountId, account!.id));

  console.log(
    JSON.stringify(
      {
        user: { id: user!.id, username: user!.username, grudgeId: user!.grudgeId },
        account: { id: account!.id, grudgeId: account!.grudgeId },
        characterCount: chars.length,
        nftCount: nfts.length,
        nftStatuses: nfts.reduce((m, n) => {
          m[n.status] = (m[n.status] || 0) + 1;
          return m;
        }, {} as Record<string, number>),
        heroes: chars.map((c) => ({
          id: c.id,
          name: c.name,
          race: c.raceId,
          class: c.classId,
          codexId: (c.model3d as any)?.codexId,
          isProductionNpc: (c.model3d as any)?.isProductionNpc,
        })),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
