/**
 * Wallet routes — third-party wallet linking + SOL/USDT purchases.
 */
import type { Express, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "../storage";
import {
  createLinkChallenge,
  confirmLinkedWallet,
  listLinkedWallets,
  getWalletOverview,
  quoteWalletPurchase,
  createPurchaseIntent,
  confirmPurchase,
} from "../services/walletAccess";
import type { LinkedWalletProvider, WalletPurchaseCurrency } from "@shared/schema";
import { WALLET_PURCHASE_CURRENCIES } from "@shared/schema";

const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "grudge-dev-secret";

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.get("Authorization") || req.get("X-Session-Token");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader || null;
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
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

export function registerWalletRoutes(app: Express): void {
  app.get("/api/wallet/overview", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const overview = await getWalletOverview(account.id);
      res.json(overview);
    } catch (e: any) {
      console.error("[Wallet/Overview]", e);
      res.status(500).json({ error: e.message || "Failed to load wallet overview" });
    }
  });

  app.get("/api/wallet/linked", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const linked = await listLinkedWallets(account.id);
      res.json({ linkedWallets: linked });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/wallet/link/challenge", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const { walletAddress } = req.body as { walletAddress?: string };
      if (!walletAddress) {
        return res.status(400).json({ error: "walletAddress required" });
      }
      const message = createLinkChallenge(account.id, walletAddress);
      res.json({ message, walletAddress });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/wallet/link/confirm", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const { walletAddress, message, signature, provider, label } = req.body as {
        walletAddress?: string;
        message?: string;
        signature?: string;
        provider?: LinkedWalletProvider;
        label?: string;
      };
      if (!walletAddress || !message || !signature) {
        return res.status(400).json({ error: "walletAddress, message, and signature required" });
      }
      const result = await confirmLinkedWallet(
        account.id,
        walletAddress,
        message,
        signature,
        provider || "other",
        label,
      );
      res.json({
        success: true,
        linkedWallet: result.linked,
        setPrimary: result.setPrimary,
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/wallet/purchase/quote", requireAuth, async (req, res) => {
    try {
      const { currency, amount } = req.body as {
        currency?: WalletPurchaseCurrency;
        amount?: number;
      };
      if (!currency || !WALLET_PURCHASE_CURRENCIES.includes(currency)) {
        return res.status(400).json({ error: "currency must be SOL or USDT" });
      }
      if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }
      const quote = await quoteWalletPurchase(currency, amount);
      res.json(quote);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/wallet/purchase/intent", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const { currency, amount, linkedWalletAddress } = req.body as {
        currency?: WalletPurchaseCurrency;
        amount?: number;
        linkedWalletAddress?: string;
      };
      if (!currency || !WALLET_PURCHASE_CURRENCIES.includes(currency)) {
        return res.status(400).json({ error: "currency must be SOL or USDT" });
      }
      if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }
      const { intent, quote, treasury } = await createPurchaseIntent(
        account.id,
        currency,
        amount,
        linkedWalletAddress,
      );
      res.json({
        purchaseId: intent.id,
        treasuryAddress: treasury,
        currency: intent.currency,
        amountIn: intent.amountIn,
        gbuxOut: intent.gbuxOut,
        expiresAt: intent.expiresAt,
        quote,
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/wallet/purchase/confirm", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const { purchaseId, txSignature } = req.body as {
        purchaseId?: string;
        txSignature?: string;
      };
      if (!purchaseId || !txSignature) {
        return res.status(400).json({ error: "purchaseId and txSignature required" });
      }
      const result = await confirmPurchase(account.id, purchaseId, txSignature);
      res.json({
        success: true,
        credited: result.credited,
        gbuxBalance: (await storage.getAccount(account.id))?.gbuxBalance,
        purchase: result.purchase,
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  console.log(
    "[Wallet] Routes: GET /api/wallet/overview, /linked; POST /link/challenge, /link/confirm, /purchase/{quote,intent,confirm}",
  );
}