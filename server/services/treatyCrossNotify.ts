/**
 * Treaty DM alerts → Telegram + Discord via grudachain-ale.
 */
import { eq } from "drizzle-orm";
import { db } from "../db";
import { accounts, telegramLinks, users } from "@shared/schema";

const ALE_BASE = (process.env.ALE_NOTIFY_URL || "https://ale.grudge-studio.com/api")
  .replace(/\/api\/telegram\/notify\/?$/, "")
  .replace(/\/$/, "");
const ADMIN_KEY = process.env.TELEGRAM_BOT_ADMIN_KEY || process.env.GAME_API_ADMIN_KEY || "";

async function senderLabel(accountId: string): Promise<string> {
  const [row] = await db
    .select({
      displayName: accounts.displayName,
      grudgeId: users.grudgeId,
    })
    .from(accounts)
    .innerJoin(users, eq(accounts.userId, users.id))
    .where(eq(accounts.id, accountId))
    .limit(1);
  if (!row) return "Warlord";
  const name = row.displayName || "Warlord";
  return row.grudgeId ? `${name} (${row.grudgeId})` : name;
}

async function discordIdForAccount(accountId: string): Promise<string | null> {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (!account) return null;
  const [user] = await db.select().from(users).where(eq(users.id, account.userId)).limit(1);
  if (!user?.username?.startsWith("discord:")) return null;
  return user.username.slice("discord:".length);
}

async function postAle(path: string, body: Record<string, unknown>): Promise<void> {
  if (!ADMIN_KEY) return;
  try {
    await fetch(`${ALE_BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ADMIN_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.warn(`[Treaty/Notify] ${path} failed:`, e instanceof Error ? e.message : e);
  }
}

export async function notifyTreatyDm(params: {
  recipientAccountId: string;
  senderAccountId: string;
  threadId: string;
  content: string;
}): Promise<void> {
  const from = await senderLabel(params.senderAccountId);
  const preview = params.content.length > 400 ? `${params.content.slice(0, 400)}…` : params.content;
  const shortThread = params.threadId.slice(0, 8);

  const [tgLink] = await db
    .select()
    .from(telegramLinks)
    .where(eq(telegramLinks.accountId, params.recipientAccountId))
    .limit(1);

  if (tgLink?.telegramUserId) {
    void postAle("/api/telegram/notify", {
      telegramUserId: tgLink.telegramUserId,
      text:
        `📨 <b>Treaty DM</b> from ${from}\n` +
        `${preview}\n\n` +
        `<code>/treaty read ${shortThread}</code> · <code>/treaty inbox</code>`,
    });
  }

  const discordUserId = await discordIdForAccount(params.recipientAccountId);
  if (discordUserId) {
    void postAle("/api/discord/notify", {
      discordUserId,
      content:
        `📨 **Treaty DM** from ${from}\n${preview}\n\n` +
        `Use \`/treaty-inbox\` or \`/treaty-read thread:${shortThread}\``,
      ephemeral: true,
    });
  }
}