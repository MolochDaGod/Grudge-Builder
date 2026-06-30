/**
 * Discord account lookup for grudachain-ale bridge.
 */
import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { accounts, telegramLinks, users } from "@shared/schema";
import { buildScopedProfile } from "./lib/scopedProfile";
import { GBUX_MINT_ADDRESS } from "./services/gbuxSolana";

const ADMIN_KEY = process.env.TELEGRAM_BOT_ADMIN_KEY || process.env.GAME_API_ADMIN_KEY || "";

function assertBotAdmin(req: Request, res: Response): boolean {
  const auth = req.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : req.get("x-telegram-admin-key") || "";
  if (!ADMIN_KEY || token !== ADMIN_KEY) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return false;
  }
  return true;
}

export function registerDiscordAccountRoutes(app: Express): void {
  app.get("/api/discord/account/:discordUserId", async (req: Request, res: Response) => {
    if (!assertBotAdmin(req, res)) return;

    const discordUserId = String(req.params.discordUserId || "").trim();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, `discord:${discordUserId}`))
      .limit(1);

    if (!user) {
      return res.status(404).json({ success: false, linked: false });
    }

    const [account] = await db.select().from(accounts).where(eq(accounts.userId, user.id)).limit(1);
    if (!account) {
      return res.status(404).json({ success: false, linked: false });
    }

    const profile = await buildScopedProfile(user.id, { mask: false });
    const [tgLink] = await db
      .select()
      .from(telegramLinks)
      .where(eq(telegramLinks.accountId, account.id))
      .limit(1);

    return res.json({
      success: true,
      linked: true,
      accountId: account.id,
      profile,
      gbuxMint: GBUX_MINT_ADDRESS,
      telegram: tgLink
        ? {
            linked: true,
            telegramUserId: tgLink.telegramUserId,
            telegramUsername: tgLink.telegramUsername,
            url: "https://t.me/grudachainbot",
          }
        : { linked: false, url: "https://t.me/grudachainbot" },
    });
  });

  console.log("[Discord] Route: GET /api/discord/account/:discordUserId");
}