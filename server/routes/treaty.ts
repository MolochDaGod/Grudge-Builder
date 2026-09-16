/**
 * Treaty Chat routes — friends, 1:1 DMs, and groups between Grudge accounts.
 * Account-scoped (Grudge ID social SSOT on Railway Postgres).
 */
import type { Express, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "../storage";
import {
  listTreatySocial,
  sendFriendRequest,
  respondFriendRequest,
  getOrCreateDmThread,
  listDmThreads,
  getThreadMessages,
  sendDmMessage,
  countUnreadTreatyMessages,
  createTreatyGroup,
  listTreatyGroups,
  getTreatyGroupDetail,
  inviteToTreatyGroup,
  leaveTreatyGroup,
  getGroupMessages,
  sendGroupMessage,
  listTreatyServerChannels,
  listServerChannelMessages,
  sendServerChannelMessage,
  ensureTreatyServerChannels,
} from "../services/treatyChat";

/** Prefer SESSION_SECRET (auth.ts) then JWT_SECRET / GRUDGE_JWT_SECRET — use first non-empty candidate only. */
const JWT_SECRET_CANDIDATES = [
  process.env.SESSION_SECRET,
  process.env.JWT_SECRET,
  process.env.GRUDGE_JWT_SECRET,
]
  .map((s) => s?.trim())
  .filter((s): s is string => !!s && s.length > 0);

const JWT_SECRET = JWT_SECRET_CANDIDATES[0] || "";

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.get("Authorization") || req.get("X-Session-Token");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader || null;
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!JWT_SECRET) {
    res.status(500).json({ error: "Authentication not configured (SESSION_SECRET, JWT_SECRET, or GRUDGE_JWT_SECRET required)" });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId?: string; sub?: string };
    const userId = payload.userId || (payload.sub != null ? String(payload.sub) : null);
    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    (req as any).userId = userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid session" });
  }
}

async function requireAccount(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const account = await storage.getAccountByUserId(userId);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return null;
  }
  return account;
}

export function registerTreatyRoutes(app: Express): void {
  /**
   * Chat with Grudge Agent (@grudagamebot) from Treaty UI.
   * Proxies to Railway agent /agent/chat — no parallel chat product.
   */
  app.post("/api/treaty/agent/chat", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const text = String((req.body as { text?: string })?.text || "").trim();
      if (!text) {
        res.status(400).json({ error: "text required" });
        return;
      }
      const agentUrl = (process.env.GRUDGE_AGENT_URL || "https://grudge-agent-bot-production.up.railway.app").replace(
        /\/$/,
        "",
      );
      const secret = process.env.GRUDGE_AGENT_CHAT_SECRET || "";
      if (!secret) {
        res.status(503).json({
          error: "GRUDGE_AGENT_CHAT_SECRET not configured on API",
          hint: "Set matching secret on grudge-agent-bot Railway service",
        });
        return;
      }
      const upstream = await fetch(`${agentUrl}/agent/chat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          accountId: account.id,
          sessionKey: `treaty-account-${account.id}`,
        }),
      });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        res.status(upstream.status).json({ error: (data as any)?.error || "Agent unavailable", data });
        return;
      }
      res.json(data);
    } catch (e: any) {
      console.error("[Treaty/Agent]", e);
      res.status(500).json({ error: e.message || "Agent chat failed" });
    }
  });

  app.get("/api/treaty/social", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const social = await listTreatySocial(account.id);
      res.json(social);
    } catch (e: any) {
      console.error("[Treaty/Social]", e);
      res.status(500).json({ error: e.message || "Failed to load social" });
    }
  });

  app.post("/api/treaty/friends/request", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const { query } = req.body as { query?: string };
      if (!query?.trim()) {
        res.status(400).json({ error: "query required (Grudge ID or display name)" });
        return;
      }
      const result = await sendFriendRequest(account.id, query);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Failed to send request" });
    }
  });

  app.post("/api/treaty/friends/:id/respond", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const { accept } = req.body as { accept?: boolean };
      if (typeof accept !== "boolean") {
        res.status(400).json({ error: "accept (boolean) required" });
        return;
      }
      const updated = await respondFriendRequest(account.id, req.params.id, accept);
      res.json({ request: updated });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Failed to respond" });
    }
  });

  app.get("/api/treaty/dm/threads", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const threads = await listDmThreads(account.id);
      res.json({ threads });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to list threads" });
    }
  });

  app.post("/api/treaty/dm/threads", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const { friendAccountId } = req.body as { friendAccountId?: string };
      if (!friendAccountId) {
        res.status(400).json({ error: "friendAccountId required" });
        return;
      }
      const thread = await getOrCreateDmThread(account.id, friendAccountId);
      res.json({ thread });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Failed to create thread" });
    }
  });

  app.get("/api/treaty/dm/threads/:id/messages", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const messages = await getThreadMessages(account.id, req.params.id);
      res.json({ messages });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Failed to load messages" });
    }
  });

  app.post("/api/treaty/dm/threads/:id/messages", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const { content } = req.body as { content?: string };
      if (!content?.trim()) {
        res.status(400).json({ error: "content required" });
        return;
      }
      const message = await sendDmMessage(account.id, req.params.id, content);
      res.json({ message });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Failed to send message" });
    }
  });

  app.get("/api/treaty/unread", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const unread = await countUnreadTreatyMessages(account.id);
      res.json({ unread });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to count unread" });
    }
  });

  // ── Groups ────────────────────────────────────────────────────────────

  app.get("/api/treaty/groups", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const groups = await listTreatyGroups(account.id);
      res.json({ groups });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to list groups" });
    }
  });

  app.post("/api/treaty/groups", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const { name, description, members } = req.body as {
        name?: string;
        description?: string;
        members?: string[];
      };
      if (!name?.trim()) {
        res.status(400).json({ error: "name required" });
        return;
      }
      const result = await createTreatyGroup(
        account.id,
        name,
        description,
        Array.isArray(members) ? members : [],
      );
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Failed to create group" });
    }
  });

  app.get("/api/treaty/groups/:id", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const detail = await getTreatyGroupDetail(account.id, req.params.id);
      res.json(detail);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Failed to load group" });
    }
  });

  app.post("/api/treaty/groups/:id/invite", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const { query } = req.body as { query?: string };
      if (!query?.trim()) {
        res.status(400).json({ error: "query required (Grudge ID or display name)" });
        return;
      }
      const result = await inviteToTreatyGroup(account.id, req.params.id, query);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Failed to invite" });
    }
  });

  app.post("/api/treaty/groups/:id/leave", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const result = await leaveTreatyGroup(account.id, req.params.id);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Failed to leave group" });
    }
  });

  app.get("/api/treaty/groups/:id/messages", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const messages = await getGroupMessages(account.id, req.params.id);
      res.json({ messages });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Failed to load messages" });
    }
  });

  app.post("/api/treaty/groups/:id/messages", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const { content } = req.body as { content?: string };
      if (!content?.trim()) {
        res.status(400).json({ error: "content required" });
        return;
      }
      const message = await sendGroupMessage(account.id, req.params.id, content);
      res.json({ message });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Failed to send message" });
    }
  });

  // ── Server / fleet chat (every game + studio page) ──────────────────────

  app.get("/api/treaty/servers", requireAuth, async (req, res) => {
    try {
      await requireAccount(req, res);
      const gameId = typeof req.query.game === "string" ? req.query.game : null;
      const channels = await listTreatyServerChannels(gameId);
      res.json({ channels });
    } catch (e: any) {
      console.error("[Treaty/Servers]", e);
      res.status(500).json({ error: e.message || "Failed to list server channels" });
    }
  });

  /** Alias used by embeds */
  app.get("/api/treaty/channels", requireAuth, async (req, res) => {
    try {
      await requireAccount(req, res);
      const gameId = typeof req.query.game === "string" ? req.query.game : null;
      const channels = await listTreatyServerChannels(gameId);
      res.json({ channels });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to list channels" });
    }
  });

  app.get("/api/treaty/servers/:slug/messages", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const limit = req.query.limit ? Number(req.query.limit) : 80;
      const data = await listServerChannelMessages(account.id, req.params.slug, limit);
      res.json(data);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Failed to load channel" });
    }
  });

  app.post("/api/treaty/servers/:slug/messages", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const { content } = req.body as { content?: string };
      if (!content?.trim()) {
        res.status(400).json({ error: "content required" });
        return;
      }
      const result = await sendServerChannelMessage(account.id, req.params.slug, content);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Failed to send" });
    }
  });

  // Bootstrap seed channels once at register (non-blocking)
  void ensureTreatyServerChannels().catch((e) =>
    console.warn("[Treaty] ensure server channels:", (e as Error)?.message || e),
  );

  console.log(
    "[Treaty] Routes: GET /api/treaty/{social,unread,dm/threads,groups,servers}; " +
      "POST /friends/{request,:id/respond}, /dm/threads{,:id/messages}, " +
      "/groups{,:id/invite,:id/leave,:id/messages}, /servers/:slug/messages",
  );
}