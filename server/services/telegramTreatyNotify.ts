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
/** Optional second notify path — @grudagamebot Railway agent */
const AGENT_NOTIFY_URL =
  process.env.AGENT_TELEGRAM_NOTIFY_URL ||
  process.env.GRUDGE_AGENT_NOTIFY_URL ||
  "";
const ADMIN_KEY = process.env.TELEGRAM_BOT_ADMIN_KEY || process.env.GAME_API_ADMIN_KEY || "";
const AGENT_BOT_TOKEN = process.env.GRUDGE_AGENT_BOT_TOKEN || "";

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

  const text =
    `📨 <b>Treaty DM</b> from ${from}\n` +
    `${preview}\n\n` +
    `<code>/treaty read ${shortThread}</code> · <code>/treaty inbox</code>`;

  const payload = { telegramUserId: link.telegramUserId, text };

  // Primary: Ale / existing notify worker (@grudachainbot)
  try {
    await fetch(NOTIFY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ADMIN_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn("[Treaty/Telegram] ale notify failed:", e instanceof Error ? e.message : e);
  }

  // Secondary: Grudge Agent HTTP notify (@grudagamebot)
  if (AGENT_NOTIFY_URL && ADMIN_KEY) {
    try {
      await fetch(AGENT_NOTIFY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ADMIN_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.warn("[Treaty/Telegram] agent notify failed:", e instanceof Error ? e.message : e);
    }
  }

  // Tertiary: direct Bot API if token present (same @grudagamebot)
  if (AGENT_BOT_TOKEN) {
    try {
      await fetch(`https://api.telegram.org/bot${AGENT_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: link.telegramUserId,
          text,
          parse_mode: "HTML",
        }),
      });
    } catch (e) {
      console.warn("[Treaty/Telegram] direct bot notify failed:", e instanceof Error ? e.message : e);
    }
  }
}