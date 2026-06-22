/**
 * Scoped profile — only fields safe to show in Discord / public account cards.
 * Never includes passwords, raw tokens, or other users' data.
 */
import { db } from "../db";
import { users, accounts, characters, telegramLinks, type Character } from "@shared/schema";
import { eq } from "drizzle-orm";

export type ScopedProfile = {
  grudgeId: string;
  username: string;
  displayName: string;
  email: string | null;
  puterId: string | null;
  discordId: string | null;
  providers: string[];
  walletAddress: string | null;
  serverWalletAddress: string | null;
  walletType: string | null;
  gbuxBalance: number;
  gold: number;
  premiumCurrency: number;
  accountXp: number;
  characters: { count: number; names: string[]; cnftCount: number };
  gameOrigin: string;
};

function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const head = local.slice(0, 2);
  return `${head}***@${domain}`;
}

function maskId(id: string | null): string | null {
  if (!id) return null;
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

function truncateWallet(addr: string | null): string | null {
  if (!addr) return null;
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function parseProviderIds(username: string): {
  puterId: string | null;
  discordId: string | null;
  providers: string[];
} {
  const providers: string[] = [];
  let puterId: string | null = null;
  let discordId: string | null = null;

  if (username.startsWith("puter:")) {
    providers.push("puter");
    puterId = username.slice("puter:".length);
  } else if (username.startsWith("discord:")) {
    providers.push("discord");
    discordId = username.slice("discord:".length);
  } else if (username.startsWith("wallet:")) {
    providers.push("phantom");
  } else if (username.startsWith("phone:")) {
    providers.push("phone");
  } else if (username.startsWith("grudge_")) {
    providers.push("grudge");
  } else {
    providers.push("grudge");
  }

  return { puterId, discordId, providers };
}

export async function buildScopedProfile(
  userId: string,
  opts: { mask?: boolean } = { mask: true },
): Promise<ScopedProfile | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const [account] = await db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1);
  const chars = await db.select().from(characters).where(eq(characters.userId, userId));

  const { puterId, discordId, providers } = parseProviderIds(user.username);
  const displayName =
    account?.displayName ||
    (user.username.includes(":") ? user.username.split(":").slice(1).join(":") : user.username);

  const cnftCount = chars.filter((c: Character) => c.cnftAddress || c.cnftId).length;
  const mask = opts.mask !== false;

  return {
    grudgeId: user.grudgeId || account?.grudgeId || "",
    username: displayName,
    displayName,
    email: mask ? maskEmail(user.email) : user.email,
    puterId: mask ? maskId(puterId) : puterId,
    discordId: mask ? maskId(discordId) : discordId,
    providers,
    walletAddress: mask ? truncateWallet(account?.walletAddress || null) : account?.walletAddress || null,
    serverWalletAddress:
      account?.walletType === "crossmint"
        ? mask
          ? truncateWallet(account.walletAddress)
          : account.walletAddress
        : null,
    walletType: account?.walletType || null,
    gbuxBalance: account?.gbuxBalance || 0,
    gold: account?.gold || 0,
    premiumCurrency: account?.premiumCurrency || 0,
    accountXp: account?.accountXp || 0,
    characters: {
      count: chars.length,
      names: chars.slice(0, 5).map((c: Character) => c.name),
      cnftCount,
    },
    gameOrigin: "grudge-fleet",
  };
}

export async function buildScopedProfileByDiscordId(
  discordId: string,
  opts?: { mask?: boolean },
): Promise<ScopedProfile | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, `discord:${discordId}`))
    .limit(1);
  if (!user) return null;
  return buildScopedProfile(user.id, opts);
}

export async function buildScopedProfileByTelegramId(
  telegramUserId: string,
  opts?: { mask?: boolean },
): Promise<ScopedProfile | null> {
  const [link] = await db
    .select()
    .from(telegramLinks)
    .where(eq(telegramLinks.telegramUserId, telegramUserId))
    .limit(1);
  if (!link) return null;

  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, link.accountId))
    .limit(1);
  if (!account) return null;

  return buildScopedProfile(account.userId, opts);
}