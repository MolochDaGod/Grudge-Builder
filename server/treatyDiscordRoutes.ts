/**
 * Treaty Chat — Discord bot proxy (Grudge game bot via grudachain-ale).
 */
import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { accounts, users } from "@shared/schema";
import {
  listTreatySocial,
  sendFriendRequest,
  respondFriendRequest,
  getOrCreateDmThread,
  listDmThreads,
  getThreadMessages,
  sendDmMessage,
  countUnreadTreatyMessages,
  resolveAccountByGrudgeIdOrName,
} from "./services/treatyChat";

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

async function accountIdFromDiscord(discordUserId: string): Promise<string | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, `discord:${discordUserId}`))
    .limit(1);
  if (!user) return null;
  const [account] = await db.select().from(accounts).where(eq(accounts.userId, user.id)).limit(1);
  return account?.id ?? null;
}

function matchByPrefix<T extends { id: string }>(items: T[], partial: string): T | null {
  const p = partial.trim().toLowerCase();
  if (!p) return null;
  return (
    items.find((i) => i.id.toLowerCase() === p) ||
    items.find((i) => i.id.toLowerCase().startsWith(p)) ||
    null
  );
}

export function registerTreatyDiscordRoutes(app: Express): void {
  app.get("/api/discord/treaty/social/:discordUserId", async (req: Request, res: Response) => {
    if (!assertBotAdmin(req, res)) return;
    const discordUserId = String(req.params.discordUserId || "").trim();
    const accountId = await accountIdFromDiscord(discordUserId);
    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: "Discord not linked. Sign in at grudge6.grudge-studio.com/game with Continue with Discord.",
      });
    }
    try {
      const social = await listTreatySocial(accountId);
      const unread = await countUnreadTreatyMessages(accountId);
      return res.json({ success: true, social, unread, accountId });
    } catch (e: unknown) {
      return res.status(500).json({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post("/api/discord/treaty/friends/request", async (req: Request, res: Response) => {
    if (!assertBotAdmin(req, res)) return;
    const discordUserId = String(req.body?.discordUserId || "").trim();
    const query = String(req.body?.query || "").trim();
    if (!discordUserId || !query) {
      return res.status(400).json({ success: false, error: "discordUserId and query required" });
    }
    const accountId = await accountIdFromDiscord(discordUserId);
    if (!accountId) {
      return res.status(400).json({ success: false, error: "Discord not linked" });
    }
    try {
      const result = await sendFriendRequest(accountId, query);
      return res.json({ success: true, ...result });
    } catch (e: unknown) {
      return res.status(400).json({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post("/api/discord/treaty/friends/respond", async (req: Request, res: Response) => {
    if (!assertBotAdmin(req, res)) return;
    const discordUserId = String(req.body?.discordUserId || "").trim();
    const requestId = String(req.body?.requestId || "").trim();
    const accept = req.body?.accept === true;
    if (!discordUserId || !requestId) {
      return res.status(400).json({ success: false, error: "discordUserId and requestId required" });
    }
    const accountId = await accountIdFromDiscord(discordUserId);
    if (!accountId) {
      return res.status(400).json({ success: false, error: "Discord not linked" });
    }
    try {
      const social = await listTreatySocial(accountId);
      const pending = [...social.pendingIncoming, ...social.pendingOutgoing];
      const resolved = matchByPrefix(
        pending.map((f) => ({ id: f.id, ...f })),
        requestId,
      );
      if (!resolved) {
        return res.status(404).json({ success: false, error: "Friend request not found" });
      }
      const updated = await respondFriendRequest(accountId, resolved.id, accept);
      return res.json({ success: true, request: updated });
    } catch (e: unknown) {
      return res.status(400).json({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.get("/api/discord/treaty/dm/threads/:discordUserId", async (req: Request, res: Response) => {
    if (!assertBotAdmin(req, res)) return;
    const discordUserId = String(req.params.discordUserId || "").trim();
    const accountId = await accountIdFromDiscord(discordUserId);
    if (!accountId) {
      return res.status(400).json({ success: false, error: "Discord not linked" });
    }
    try {
      const threads = await listDmThreads(accountId);
      return res.json({ success: true, threads });
    } catch (e: unknown) {
      return res.status(500).json({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.get(
    "/api/discord/treaty/dm/threads/:threadId/messages/:discordUserId",
    async (req: Request, res: Response) => {
      if (!assertBotAdmin(req, res)) return;
      const discordUserId = String(req.params.discordUserId || "").trim();
      const threadPartial = String(req.params.threadId || "").trim();
      const accountId = await accountIdFromDiscord(discordUserId);
      if (!accountId) {
        return res.status(400).json({ success: false, error: "Discord not linked" });
      }
      try {
        const threads = await listDmThreads(accountId);
        const thread = matchByPrefix(
          threads.map((t) => ({ id: t.threadId, ...t })),
          threadPartial,
        );
        if (!thread) {
          return res.status(404).json({ success: false, error: "Thread not found" });
        }
        const messages = await getThreadMessages(accountId, thread.id);
        return res.json({ success: true, threadId: thread.id, messages });
      } catch (e: unknown) {
        return res.status(400).json({ success: false, error: e instanceof Error ? e.message : String(e) });
      }
    },
  );

  app.post("/api/discord/treaty/dm/send", async (req: Request, res: Response) => {
    if (!assertBotAdmin(req, res)) return;
    const discordUserId = String(req.body?.discordUserId || "").trim();
    const content = String(req.body?.content || "").trim();
    const friendQuery = String(req.body?.friendQuery || req.body?.query || "").trim();
    const friendAccountId = String(req.body?.friendAccountId || "").trim();

    if (!discordUserId || !content) {
      return res.status(400).json({ success: false, error: "discordUserId and content required" });
    }
    if (!friendQuery && !friendAccountId) {
      return res.status(400).json({ success: false, error: "friendQuery or friendAccountId required" });
    }

    const accountId = await accountIdFromDiscord(discordUserId);
    if (!accountId) {
      return res.status(400).json({ success: false, error: "Discord not linked" });
    }

    try {
      let targetAccountId = friendAccountId;
      if (!targetAccountId && friendQuery) {
        const target = await resolveAccountByGrudgeIdOrName(friendQuery);
        if (!target) {
          return res.status(404).json({ success: false, error: "Player not found" });
        }
        targetAccountId = target.accountId;
      }
      const thread = await getOrCreateDmThread(accountId, targetAccountId);
      const message = await sendDmMessage(accountId, thread.id, content);
      return res.json({ success: true, threadId: thread.id, message });
    } catch (e: unknown) {
      return res.status(400).json({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
  });

  console.log(
    "[Treaty/Discord] Routes: GET /api/discord/treaty/{social,dm/threads}; POST /friends/{request,respond}, /dm/send",
  );
}