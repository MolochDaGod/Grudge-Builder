/**
 * Push Treaty DM alerts to linked Telegram users via grudachain-ale.
 */
import { eq } from "drizzle-orm";
import { db } from "../db";
import { accounts, telegramLinks, users } from "@shared/schema";

const NOTIFY_URL =
  process.env.ALE_NOTIFY_URL ||
  process.env.TELEGRAM_NOTIFY_URL ||
  "https://ale.grudge-studio.com/api/telegram/notify";
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

export async function notifyTreatyDm(params: {
  recipientAccountId: string;
  senderAccountId: string;
  threadId: string;
  content: string;
}): Promise<void> {
  if (!ADMIN_KEY) return;

  const [link] = await db
    .select()
    .from(telegramLinks)
    .where(eq(telegramLinks.accountId, params.recipientAccountId))
    .limit(1);
  if (!link?.telegramUserId) return;

  const from = await senderLabel(params.senderAccountId);
  const preview = params.content.length > 400 ? `${params.content.slice(0, 400)}…` : params.content;
  const shortThread = params.threadId.slice(0, 8);

  try {
    await fetch(NOTIFY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ADMIN_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        telegramUserId: link.telegramUserId,
        text:
          `📨 <b>Treaty DM</b> from ${from}\n` +
          `${preview}\n\n` +
          `<code>/treaty read ${shortThread}</code> · <code>/treaty inbox</code>`,
      }),
    });
  } catch (e) {
    console.warn("[Treaty/Telegram] notify failed:", e instanceof Error ? e.message : e);
  }
}