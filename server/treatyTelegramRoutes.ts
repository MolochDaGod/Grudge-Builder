/**
 * Treaty Chat — Telegram bot proxy (@grudachainbot via grudachain-ale).
 * Uses TELEGRAM_BOT_ADMIN_KEY; resolves telegram_user_id → account via telegram_links.
 */
import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { telegramLinks } from "@shared/schema";
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

async function accountIdFromTelegram(telegramUserId: string): Promise<string | null> {
  const [link] = await db
    .select()
    .from(telegramLinks)
    .where(eq(telegramLinks.telegramUserId, telegramUserId))
    .limit(1);
  return link?.accountId ?? null;
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

export function registerTreatyTelegramRoutes(app: Express): void {
  app.get("/api/telegram/treaty/social/:telegramUserId", async (req: Request, res: Response) => {
    if (!assertBotAdmin(req, res)) return;
    const telegramUserId = String(req.params.telegramUserId || "").trim();
    const accountId = await accountIdFromTelegram(telegramUserId);
    if (!accountId) {
      return res.status(400).json({ success: false, error: "Telegram not linked. Use /login or /link first." });
    }
    try {
      const social = await listTreatySocial(accountId);
      const unread = await countUnreadTreatyMessages(accountId);
      return res.json({ success: true, social, unread });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ success: false, error: message });
    }
  });

  app.post("/api/telegram/treaty/friends/request", async (req: Request, res: Response) => {
    if (!assertBotAdmin(req, res)) return;
    const telegramUserId = String(req.body?.telegramUserId || "").trim();
    const query = String(req.body?.query || "").trim();
    if (!telegramUserId || !query) {
      return res.status(400).json({ success: false, error: "telegramUserId and query required" });
    }
    const accountId = await accountIdFromTelegram(telegramUserId);
    if (!accountId) {
      return res.status(400).json({ success: false, error: "Telegram not linked" });
    }
    try {
      const result = await sendFriendRequest(accountId, query);
      return res.json({ success: true, ...result });
    } catch (e: unknown) {
      return res.status(400).json({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post("/api/telegram/treaty/friends/respond", async (req: Request, res: Response) => {
    if (!assertBotAdmin(req, res)) return;
    const telegramUserId = String(req.body?.telegramUserId || "").trim();
    const requestId = String(req.body?.requestId || "").trim();
    const accept = req.body?.accept === true;
    if (!telegramUserId || !requestId) {
      return res.status(400).json({ success: false, error: "telegramUserId and requestId required" });
    }
    const accountId = await accountIdFromTelegram(telegramUserId);
    if (!accountId) {
      return res.status(400).json({ success: false, error: "Telegram not linked" });
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

  app.get("/api/telegram/treaty/dm/threads/:telegramUserId", async (req: Request, res: Response) => {
    if (!assertBotAdmin(req, res)) return;
    const telegramUserId = String(req.params.telegramUserId || "").trim();
    const accountId = await accountIdFromTelegram(telegramUserId);
    if (!accountId) {
      return res.status(400).json({ success: false, error: "Telegram not linked" });
    }
    try {
      const threads = await listDmThreads(accountId);
      return res.json({ success: true, threads });
    } catch (e: unknown) {
      return res.status(500).json({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.get(
    "/api/telegram/treaty/dm/threads/:threadId/messages/:telegramUserId",
    async (req: Request, res: Response) => {
      if (!assertBotAdmin(req, res)) return;
      const telegramUserId = String(req.params.telegramUserId || "").trim();
      const threadPartial = String(req.params.threadId || "").trim();
      const accountId = await accountIdFromTelegram(telegramUserId);
      if (!accountId) {
        return res.status(400).json({ success: false, error: "Telegram not linked" });
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

  app.post("/api/telegram/treaty/dm/send", async (req: Request, res: Response) => {
    if (!assertBotAdmin(req, res)) return;
    const telegramUserId = String(req.body?.telegramUserId || "").trim();
    const content = String(req.body?.content || "").trim();
    const friendQuery = String(req.body?.friendQuery || req.body?.query || "").trim();
    const friendAccountId = String(req.body?.friendAccountId || "").trim();

    if (!telegramUserId || !content) {
      return res.status(400).json({ success: false, error: "telegramUserId and content required" });
    }
    if (!friendQuery && !friendAccountId) {
      return res.status(400).json({ success: false, error: "friendQuery or friendAccountId required" });
    }

    const accountId = await accountIdFromTelegram(telegramUserId);
    if (!accountId) {
      return res.status(400).json({ success: false, error: "Telegram not linked" });
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
    "[Treaty/Telegram] Routes: GET /api/telegram/treaty/{social,dm/threads}; POST /friends/{request,respond}, /dm/send",
  );
}