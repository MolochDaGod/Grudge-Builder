/**
 * Dash-facing /api/me/* aggregation routes.
 * Maps existing GrudgeBuilder storage (characters, account, wallet) to the
 * shapes expected by artifacts/dash (@workspace/dash).
 */
import type { Express, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "../storage";
import { getWalletOverview, listLinkedWallets } from "../services/walletAccess";
import type { AccountInventoryItem } from "@shared/schema";

const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "grudge-dev-secret";

type DashClassId = "warrior" | "mage" | "ranger" | "worge";

function readSessionToken(req: Request): string | null {
  const authHeader = req.get("Authorization") || req.get("X-Session-Token") || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  if (authHeader) return authHeader;
  const cookie = req.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)grudge_auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function requireSession(req: Request, res: Response, next: NextFunction): void {
  const token = readSessionToken(req);
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId?: string; sub?: string };
    const userId = payload.userId || (payload.sub != null ? String(payload.sub) : null);
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    (req as Request & { userId: string }).userId = userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}

function detectProviders(username: string): string[] {
  const providers: string[] = [];
  if (username.startsWith("puter:")) providers.push("puter");
  else if (username.startsWith("wallet:")) providers.push("solana");
  else if (username.startsWith("discord:")) providers.push("discord");
  else if (username.startsWith("phone:")) providers.push("phone");
  else providers.push("email");
  return providers;
}

function normalizeClassId(classId: string): DashClassId {
  const id = classId.toLowerCase();
  if (id.includes("mage") || id.includes("wizard") || id.includes("scholar")) return "mage";
  if (id.includes("ranger") || id.includes("archer") || id.includes("hunter")) return "ranger";
  if (id.includes("worge") || id.includes("druid") || id.includes("shapeshift")) return "worge";
  return "warrior";
}

function mapQuality(quality: string | null | undefined): "common" | "uncommon" | "rare" | "epic" | "legendary" {
  switch ((quality || "normal").toLowerCase()) {
    case "magic":
    case "uncommon":
      return "uncommon";
    case "rare":
      return "rare";
    case "epic":
      return "epic";
    case "legendary":
      return "legendary";
    default:
      return "common";
  }
}

function inferAssetKind(itemId: string): "weapon" | "armor" | "relic" | "cape" | "mount" | "consumable" {
  const id = itemId.toLowerCase();
  if (id.includes("weapon") || id.includes("sword") || id.includes("bow") || id.includes("staff")) return "weapon";
  if (id.includes("armor") || id.includes("helm") || id.includes("shield")) return "armor";
  if (id.includes("cape") || id.includes("cloak")) return "cape";
  if (id.includes("mount") || id.includes("horse")) return "mount";
  if (id.includes("relic") || id.includes("artifact")) return "relic";
  return "consumable";
}

function mapInventoryItem(item: AccountInventoryItem) {
  return {
    id: item.id,
    name: item.metadata?.customName || item.itemId,
    kind: inferAssetKind(item.itemId),
    tier: item.tier ?? 1,
    rarity: mapQuality(item.quality),
    iconUrl: null as string | null,
    mintAddress: null as string | null,
    amount: item.quantity,
  };
}

export function registerMeRoutes(app: Express): void {
  app.get("/api/me/overview", requireSession, async (req, res) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      const account = await storage.getOrCreateAccountForUser(userId);
      const characters = await storage.getCharacters(userId);
      const inventory = await storage.getAccountInventory(account.id);

      res.json({
        characters: characters.length,
        gouldstones: account.gold ?? 0,
        assets: inventory.length,
        grudgeCoin: account.gbuxBalance ?? 0,
        factionLevel: account.accountXp ?? 0,
        lastSeen: null,
        activity: [],
      });
    } catch (e) {
      console.error("[Me/Overview]", e);
      res.status(500).json({ error: "Failed to load overview" });
    }
  });

  app.get("/api/me/characters", requireSession, async (req, res) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      const characters = await storage.getCharacters(userId);
      res.json(
        characters.map((c) => ({
          id: c.id,
          name: c.name,
          classId: normalizeClassId(c.classId),
          level: c.level,
          zone: c.gameEra || "warlords",
          gear: {
            tier: Math.max(1, Math.floor(c.level / 10) + 1),
            score: c.level * 10 + (c.xp ?? 0),
          },
          portraitUrl: c.avatarUrl ?? null,
          lastPlayedAt: null,
        })),
      );
    } catch (e) {
      console.error("[Me/Characters]", e);
      res.status(500).json({ error: "Failed to load characters" });
    }
  });

  app.get("/api/me/wallet", requireSession, async (req, res) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      const account = await storage.getOrCreateAccountForUser(userId);
      const overview = await getWalletOverview(account.id);

      const gbux = overview?.gbuxBalance ?? account.gbuxBalance ?? 0;
      const rate = overview?.rates?.gbuxUsd ?? 0.01;
      const balances: Array<{ symbol: string; amount: number; usd: number }> = [
        { symbol: "GBUX", amount: gbux, usd: gbux * rate },
      ];

      for (const chain of overview?.onChain ?? []) {
        if (chain.sol != null) {
          balances.push({ symbol: "SOL", amount: chain.sol, usd: 0 });
        }
        if (chain.usdt != null) {
          balances.push({ symbol: "USDT", amount: chain.usdt, usd: chain.usdt });
        }
      }

      res.json({
        address: overview?.primaryWallet ?? account.walletAddress ?? null,
        chain: overview?.primaryWallet || account.walletAddress ? ("solana" as const) : null,
        balances,
        rewards: { pending: 0, claimable: 0 },
        history: [],
      });
    } catch (e) {
      console.error("[Me/Wallet]", e);
      res.status(500).json({ error: "Failed to load wallet" });
    }
  });

  app.get("/api/me/assets", requireSession, async (req, res) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      const account = await storage.getOrCreateAccountForUser(userId);
      const inventory = await storage.getAccountInventory(account.id);
      res.json(inventory.map(mapInventoryItem));
    } catch (e) {
      console.error("[Me/Assets]", e);
      res.status(500).json({ error: "Failed to load assets" });
    }
  });

  app.get("/api/me/notifications", requireSession, async (_req, res) => {
    res.json([]);
  });

  app.get("/api/me/identities", requireSession, async (req, res) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      const user = await storage.getUser(userId);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const linked = new Set(detectProviders(user.username));
      if (user.email) linked.add("email");

      const labels: Record<string, string> = {
        puter: "Puter",
        solana: "Solana Wallet",
        discord: "Discord",
        phone: "Phone",
        email: "Email / password",
        google: "Google",
      };

      const all: Array<"discord" | "google" | "phone" | "solana" | "puter" | "email"> = [
        "discord",
        "google",
        "phone",
        "solana",
        "puter",
        "email",
      ];

      res.json(
        all.map((provider) => ({
          provider,
          label: labels[provider] ?? provider,
          linked: linked.has(provider),
          detail:
            provider === "email" && user.email
              ? user.email
              : provider === "solana" && linked.has("solana")
                ? user.username.replace(/^wallet:/, "")
                : null,
        })),
      );
    } catch (e) {
      console.error("[Me/Identities]", e);
      res.status(500).json({ error: "Failed to load identities" });
    }
  });

  app.get("/api/me/connections", requireSession, async (req, res) => {
    try {
      const userId = (req as Request & { userId: string }).userId;
      const user = await storage.getUser(userId);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const account = await storage.getOrCreateAccountForUser(userId);
      const linked = await listLinkedWallets(account.id);
      const solanaAddress =
        account.walletAddress ||
        linked.find((w) => w.isPrimary)?.walletAddress ||
        linked[0]?.walletAddress ||
        (user.username.startsWith("wallet:") ? user.username.slice("wallet:".length) : null);
      const usernameClaimed = !/^(puter:|wallet:|discord:|phone:|google:|github:|guest_)/i.test(
        user.username,
      );
      res.json({
        email: user.email || null,
        google: false,
        discord: !!user.username.startsWith("discord:"),
        github: false,
        puter: !!user.username.startsWith("puter:"),
        phone: !!user.username.startsWith("phone:"),
        solana: !!solanaAddress,
        solanaAddress,
        username: usernameClaimed ? user.username : null,
        displayName: account.displayName || null,
        grudgeId: user.grudgeId || account.grudgeId || null,
        usernameClaimed,
      });
    } catch (e) {
      console.error("[Me/Connections]", e);
      res.status(500).json({ error: "Failed to load connections" });
    }
  });

  console.log(
    "[Me] Dash routes: GET /api/me/{overview,characters,wallet,assets,notifications,identities,connections}",
  );
}