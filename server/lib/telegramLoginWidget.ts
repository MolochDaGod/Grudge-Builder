/**
 * Telegram Login Widget verification for @grudagamebot.
 * Docs: https://core.telegram.org/widgets/login
 *
 * BotFather → Bot Settings → Domain / Login Widget Allowed URLs:
 *   id.grudge-studio.com
 * Use /empty to clear a bad domain.
 */
import crypto from "node:crypto";

export type TelegramLoginPayload = {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
};

export function telegramBotToken(): string {
  return (
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.GRUDGE_AGENT_BOT_TOKEN ||
    process.env.BOT_TOKEN ||
    ""
  ).trim();
}

export function telegramBotUsername(): string {
  return (
    process.env.TELEGRAM_BOT_USERNAME ||
    process.env.GRUDGE_AGENT_BOT_USERNAME ||
    "grudagamebot"
  )
    .trim()
    .replace(/^@/, "");
}

/**
 * Verify Telegram Login Widget `hash` (HMAC-SHA256 of sorted fields with SHA256(bot_token) as key).
 */
export function verifyTelegramLoginWidget(
  data: Record<string, unknown>,
  opts?: { maxAgeSec?: number; botToken?: string },
): { ok: true; payload: TelegramLoginPayload } | { ok: false; error: string } {
  const botToken = (opts?.botToken || telegramBotToken()).trim();
  if (!botToken) return { ok: false, error: "Telegram bot token not configured" };

  const hash = String(data.hash || "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(hash)) return { ok: false, error: "Invalid Telegram hash" };

  const id = data.id;
  if (id == null || String(id).trim() === "") return { ok: false, error: "Missing Telegram id" };

  const authDate = Number(data.auth_date);
  if (!Number.isFinite(authDate) || authDate <= 0) {
    return { ok: false, error: "Invalid auth_date" };
  }
  const maxAge = opts?.maxAgeSec ?? 86400;
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age > maxAge) return { ok: false, error: "Telegram login expired — try again" };
  if (age < -120) return { ok: false, error: "Telegram auth_date is in the future" };

  const checkPairs: string[] = [];
  for (const key of Object.keys(data).sort()) {
    if (key === "hash") continue;
    const val = data[key];
    if (val === undefined || val === null) continue;
    checkPairs.push(`${key}=${val}`);
  }
  const dataCheckString = checkPairs.join("\n");
  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const computed = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: "Telegram signature mismatch" };
  }

  return {
    ok: true,
    payload: {
      id: String(id),
      first_name: data.first_name != null ? String(data.first_name) : undefined,
      last_name: data.last_name != null ? String(data.last_name) : undefined,
      username: data.username != null ? String(data.username).replace(/^@/, "") : undefined,
      photo_url: data.photo_url != null ? String(data.photo_url) : undefined,
      auth_date: authDate,
      hash,
    },
  };
}
