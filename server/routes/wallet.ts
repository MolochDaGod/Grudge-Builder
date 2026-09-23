/**
 * Wallet routes — third-party wallet linking + SOL/USDT purchases.
 */
import type { Express, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "../storage";
import {
  createLinkChallenge,
  originFromRequest,
  confirmLinkedWallet,
  listLinkedWallets,
  setPrimaryLinkedWallet,
  unlinkLinkedWallet,
  getWalletOverview,
  composeWalletBook,
  persistTraderVault,
  accountLocationPayload,
  quoteWalletPurchase,
  createPurchaseIntent,
  confirmPurchase,
} from "../services/walletAccess";
import type { LinkedWalletProvider, WalletPurchaseCurrency } from "@shared/schema";
import { WALLET_PURCHASE_CURRENCIES } from "@shared/schema";
import { registerWalletInventoryRoutes } from "./walletInventoryRoutes";
import { swapPlayWallet, jupiterOrder } from "../services/walletSwap";
import { parseSwap, isSolAddress } from "../services/swapValidate";
import { getGbuxSupply } from "../services/gbuxSolana";

/** Prefer SESSION_SECRET (auth.ts) then JWT_SECRET / GRUDGE_JWT_SECRET — use first non-empty candidate only. */
const JWT_SECRET_CANDIDATES = [
  process.env.SESSION_SECRET,
  process.env.JWT_SECRET,
  process.env.GRUDGE_JWT_SECRET,
]
  .map((s) => s?.trim())
  .filter((s): s is string => !!s && s.length > 0);

const JWT_SECRET = JWT_SECRET_CANDIDATES[0] || "";

function readWalletSessionToken(req: Request): string | null {
  const authHeader = req.get("Authorization") || req.get("X-Session-Token") || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  if (authHeader) return authHeader;
  const cookie = req.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)grudge_auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = readWalletSessionToken(req);
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

export function registerWalletRoutes(app: Express): void {
  app.post("/api/solana/rpc", async (req, res) => {
    const method = String((req.body && req.body.method) || "");
    const params = (req.body && req.body.params) || [];
    const allow = new Set([
      "getBalance",
      "getTokenAccountsByOwner",
      "getTokenAccountBalance",
      "getAccountInfo",
      "getMultipleAccounts",
      "getTokenSupply",
    ]);
    if (!allow.has(method)) return res.status(403).json({ error: "method not allowed" });
    const rpcs = [process.env.SOLANA_RPC_URL, "https://api.mainnet-beta.solana.com"].filter(Boolean);
    let last = "rpc failed";
    for (const rpc of [...new Set(rpcs)]) {
      try {
        const r = await fetch(rpc as string, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: req.body?.id || "gruda", method, params }),
        });
        const text = await r.text();
        try {
          JSON.parse(text);
        } catch {
          last = text.slice(0, 80);
          continue;
        }
        return res.status(200).type("application/json").send(text);
      } catch (e: any) {
        last = e.message || String(e);
      }
    }
    res.status(502).json({ error: last });
  });

  app.get("/api/gbux/circulating", async (_req, res) => {
    try {
      const s = await getGbuxSupply();
      res.setHeader("Cache-Control", "public, max-age=30");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.type("text/plain").send(s.circulatingString);
    } catch (e: any) {
      res.status(502).json({ error: e.message || "supply unavailable" });
    }
  });
  app.get("/api/gbux/supply", async (_req, res) => {
    try {
      const s = await getGbuxSupply();
      res.setHeader("Cache-Control", "public, max-age=30");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.json({ ok: true, ...s });
    } catch (e: any) {
      res.status(502).json({ error: e.message || "supply unavailable" });
    }
  });

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
      const funding = linked.filter((w) => w.provider !== "trader" && w.label !== "trader_vault");
      res.json({ linkedWallets: funding });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** Where this Grudge ID lives — Railway Postgres, not localStorage. */
  app.get("/api/account/location", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      res.json(accountLocationPayload(account));
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to load account location" });
    }
  });

  /** Account wallet book: Crossmint · linked Phantom · trader vault. Same Railway tables. */
  /** THC Labz play for this Grudge ID — join by linked Phantom, not a second bag DB. */
  app.get("/api/account/thc-play", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const book = await composeWalletBook(account.id);
      const wallets = [...new Set([book?.fundingWallet, book?.gameWallet].filter(Boolean))] as string[];
      if (!wallets.length) {
        return res.json({
          ok: true,
          linked: false,
          hint: "Connect Phantom (SIWS) on this Grudge ID. Growerz Hub matches that address.",
        });
      }
      const thcApi = (process.env.THC_LABZ_API || "https://dope-budz-production.up.railway.app").replace(/\/$/, "");
      let snap: any = null;
      let used: string | null = null;
      for (const w of wallets) {
        try {
          const r = await fetch(`${thcApi}/api/account/snapshot?wallet=${encodeURIComponent(w)}`, {
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(12_000),
          });
          const j = await r.json().catch(() => ({}));
          if (j && j.success) {
            snap = j;
            used = w;
            break;
          }
        } catch {
          /* try next address */
        }
      }
      if (!snap) {
        return res.json({
          ok: true,
          linked: false,
          tried: wallets,
          hint: "No THC Labz user on this Phantom yet. Open Growerz Hub and connect the same wallet.",
        });
      }
      const gh = snap.growerz?.growhouse || {};
      const houses = Array.isArray(gh.houses) ? gh.houses : [];
      const hubHouseIds = houses
        .map((h: any) => h.hub_house_id || h.hubHouseId || h.publicId)
        .filter((n: any) => n != null && Number(n) > 0);
      return res.json({
        ok: true,
        linked: true,
        matchWallet: used,
        grudgeIdThc: snap.identity?.grudgeId || null,
        grudgeIdFleet: account.grudgeId,
        idMatch: Boolean(snap.identity?.grudgeId && snap.identity.grudgeId === account.grudgeId),
        balances: snap.balances || {},
        growerz: {
          ownedCount: snap.growerz?.ownedCount ?? 0,
          hubHouseIds,
          plants: gh.plants ?? gh.activePlants ?? null,
          playable: snap.growerz?.playableSelected || null,
        },
        dopebudz: snap.dopebudz || null,
        battle: {
          totalBattles: snap.battle?.totalBattles ?? 0,
          wins: snap.battle?.wins ?? 0,
          cardCount: snap.battle?.cardCount ?? 0,
        },
        hosts: {
          hub: "https://growerz.thc-labz.xyz",
          battle: "https://battle.thc-labz.xyz",
          dope: "https://dopebudz.thc-labz.xyz",
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to load THC Labz play" });
    }
  });

  app.get("/api/account/wallets", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const book = await composeWalletBook(account.id);
      if (!book) return res.status(404).json({ error: "Account not found" });
      res.json(book);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to load wallets" });
    }
  });

  app.post("/api/account/wallets", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const body = req.body as { role?: string; address?: string; walletAddress?: string };
      const role = String(body.role || "");
      const address = String(body.address || body.walletAddress || "").trim();
      if (role !== "trader_vault") {
        return res.status(400).json({
          error: "Only trader_vault can be POSTed here. Link Phantom via /api/wallet/link/*",
        });
      }
      if (!address) return res.status(400).json({ error: "address required" });
      await persistTraderVault(account.id, address);
      const book = await composeWalletBook(account.id);
      res.json({ ok: true, saved: "trader_vault", ...book });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Could not save trader vault" });
    }
  });

  app.patch("/api/account/wallets/:id/primary", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const book = await setPrimaryLinkedWallet(account.id, String(req.params.id));
      res.json(book);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Could not set primary" });
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
      const challenge = createLinkChallenge(account.id, walletAddress, originFromRequest(req));
      res.json({
        message: challenge.message,
        nonce: challenge.nonce,
        walletAddress: challenge.walletAddress,
        siws: challenge.siws,
      });
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

  /**
   * Server-side: debit fleet bag GBUX → hand off to a game play ledger (poker, etc.).
   * No on-chain tx; ledgered as ai_agent_transfer with play_fund metadata.
   */
  app.post("/api/wallet/transfer-to-play", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const body = req.body as {
        amount?: number;
        game?: string;
        walletAddress?: string;
      };
      const amount = Math.floor(Number(body.amount) || 0);
      if (amount < 1) {
        return res.status(400).json({ error: "amount must be ≥ 1 GBUX" });
      }
      const game = (body.game || "poker").toLowerCase();
      if (!["poker", "blackjack", "slots", "budb"].includes(game)) {
        return res.status(400).json({
          error: "game must be poker (BUDB play ledger)",
        });
      }

      const overview = await getWalletOverview(account.id);
      if (!overview) {
        return res.status(404).json({ error: "Wallet overview not found" });
      }
      const linked0 =
        overview.linkedWallets?.[0] &&
        ((overview.linkedWallets[0] as { walletAddress?: string; address?: string })
          .walletAddress ||
          (overview.linkedWallets[0] as { address?: string }).address);
      const walletAddress = String(
        body.walletAddress || overview.primaryWallet || linked0 || "",
      ).trim();
      if (!walletAddress || walletAddress.length < 32) {
        return res.status(400).json({
          error:
            "No Solana wallet on account — link Phantom or open a custodial wallet first",
        });
      }

      const bal = Number(account.gbuxBalance ?? 0);
      if (bal < amount) {
        return res.status(400).json({
          error: `Insufficient fleet bag GBUX (have ${bal}, need ${amount})`,
          gbuxBalance: bal,
        });
      }

      const fleetSecret = process.env.FLEET_PLAY_CREDIT_SECRET || "";
      if (!fleetSecret) {
        return res.status(503).json({
          error:
            "Play ledger handshake not configured — set FLEET_PLAY_CREDIT_SECRET on Railway to match poker Worker",
          gbuxBalance: account.gbuxBalance,
        });
      }

      const receiptId = `play-fund-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await storage.debitGbux(account.id, amount, "ai_agent_transfer", {
        sourceRef: receiptId,
        metadata: {
          kind: "play_fund",
          game,
          walletAddress,
          host: "poker.grudge-studio.com",
        },
      });

      // Credit D1 play ledger on poker edge
      const pokerOrigin =
        process.env.POKER_ORIGIN || "https://poker.grudge-studio.com";
      let playCredit: Record<string, unknown> | null = null;
      let playError: string | null = null;
      try {
        const pr = await fetch(`${pokerOrigin}/api/play/credit-from-fleet`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fleet-Play-Secret": fleetSecret,
            Authorization: req.get("Authorization") || "",
          },
          body: JSON.stringify({
            wallet: walletAddress,
            amount,
            receiptId,
            accountId: account.id,
            game,
          }),
        });
        playCredit = (await pr.json()) as Record<string, unknown>;
        if (!pr.ok) {
          playError =
            (playCredit?.error as string) || `poker credit HTTP ${pr.status}`;
          // Refund fleet bag if play credit failed
          await storage.creditGbux(account.id, amount, "admin_grant", {
            sourceRef: `refund-${receiptId}`,
            metadata: { kind: "play_fund_refund", playError },
          });
          return res.status(502).json({
            error: "Play ledger credit failed — fleet bag refunded",
            playError,
            gbuxBalance: (await storage.getAccount(account.id))?.gbuxBalance,
          });
        }
      } catch (e: any) {
        await storage.creditGbux(account.id, amount, "admin_grant", {
          sourceRef: `refund-${receiptId}`,
          metadata: { kind: "play_fund_refund", error: String(e?.message || e) },
        });
        return res.status(502).json({
          error: "Play host unreachable — fleet bag refunded",
          detail: e?.message || String(e),
          gbuxBalance: (await storage.getAccount(account.id))?.gbuxBalance,
        });
      }

      const after = await storage.getAccount(account.id);
      res.json({
        success: true,
        amount,
        game,
        walletAddress,
        receiptId,
        gbuxBalance: after?.gbuxBalance ?? 0,
        play: playCredit,
      });
    } catch (e: any) {
      console.error("[Wallet/transfer-to-play]", e);
      res.status(400).json({ error: e.message || "Transfer failed" });
    }
  });

  /**
   * Sign+send on-chain GBUX from the account Crossmint Solana wallet.
   * Official Crossmint transfer-token (server API key). No Phantom.
   * @see https://docs.crossmint.com/wallets/guides/transfer-tokens
   */
  app.post("/api/wallet/send-gbux", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const body = req.body as {
        amount?: number | string;
        to?: string;
        fromWallet?: string;
      };
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: "amount must be > 0" });
      }
      const { crossmintWalletService } = await import(
        "../services/crossmintWallet"
      );
      const grudgeId = String(
        (account as { grudgeId?: string }).grudgeId || "",
      );
      const cm = grudgeId
        ? await crossmintWalletService.getOrCreateWalletForGrudgeId(grudgeId)
        : null;
      const overview = await getWalletOverview(account.id);
      const stored = String(
        (overview as { custodialWallet?: string; primaryWallet?: string } | null)?.custodialWallet ||
          overview?.primaryWallet ||
          account.walletAddress ||
          "",
      ).trim();
      // JWT identity owns the Crossmint wallet. Ignore client fromWallet so a
      // linked Phantom cannot be used as the custodial signer source.
      const fromWallet = String(cm?.address || stored).trim();
      if (fromWallet.length < 32) {
        return res.status(400).json({
          error: "No Crossmint play wallet on this Grudge ID",
        });
      }
      const to = String(
        body.to ||
          process.env.AI_AGENT_WALLET ||
          "6P7Pp5eHzPAVjnbNLkW8DzAuuc7gj9Sm5XiprwnjzvRs",
      ).trim();
      if (!isSolAddress(to)) {
        return res.status(400).json({ error: "recipient required" });
      }

      const GBUX_MINT =
        process.env.GBUX_MINT ||
        "55TpSoMNxbfsNJ9U1dQoo9H3dRtDmjBZVMcKqvU2nray";
      const email = grudgeId
        ? crossmintWalletService.stableEmailForGrudgeId(grudgeId)
        : "";
      const emailLocator = email ? `email:${email}:solana` : undefined;

      const sent = await crossmintWalletService.sendSplToken({
        fromWallet,
        toWallet: to,
        amount: String(amount),
        mint: GBUX_MINT,
        emailLocator,
        extraLocators: email
          ? [
              `email:${email}:solana-custodial-wallet`,
              `email:${email}:solana:solana-custodial-wallet`,
            ]
          : undefined,
        idempotencyKey: `gbux:${account.id}:${to.slice(0, 8)}:${amount}`,
      });
      if (!sent.success) {
        return res.status(502).json({
          error: sent.error || "Crossmint send failed",
          fromWallet,
          to,
        });
      }
      res.json({
        success: true,
        signature: sent.signature,
        explorerLink: sent.explorerLink,
        pending: sent.pending,
        status: sent.status,
        fromWallet,
        to,
        amount,
        mint: GBUX_MINT,
        via: "crossmint",
      });
    } catch (e: any) {
      console.error("[Wallet/send-gbux]", e);
      res.status(400).json({ error: e.message || "Send failed" });
    }
  });

  app.post("/api/wallet/primary", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const walletAddress = String((req.body as { walletAddress?: string })?.walletAddress || "").trim();
      if (!walletAddress) {
        return res.status(400).json({ error: "walletAddress required" });
      }
      const linked = await setPrimaryLinkedWallet(account.id, walletAddress);
      res.json({ success: true, linkedWallets: linked });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Could not set primary" });
    }
  });

  app.delete("/api/wallet/linked/:address", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const walletAddress = decodeURIComponent(String(req.params.address || "")).trim();
      if (!walletAddress) {
        return res.status(400).json({ error: "address required" });
      }
      const linked = await unlinkLinkedWallet(account.id, walletAddress);
      res.json({ success: true, linkedWallets: linked });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Could not unlink" });
    }
  });

  app.post("/api/wallet/swap/quote", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const parsed = parseSwap(req.body || {});
      if (!parsed.ok) return res.status(400).json({ error: parsed.error });
      const play = String((account as { walletAddress?: string }).walletAddress || "").trim();
      if (parsed.taker) {
        const linked = await listLinkedWallets(account.id);
        const mine = new Set(
          [play, ...linked.map((w) => String(w.walletAddress || ""))]
            .map((a) => a.trim())
            .filter(Boolean),
        );
        if (!mine.has(parsed.taker)) {
          return res.status(403).json({ error: "taker is not one of your wallets" });
        }
      }
      const order = await jupiterOrder(parsed);
      if (!order.ok) {
        return res.status(order.status || 400).json({
          error: order.body?.errorMessage || order.body?.error || "No route",
          order: order.body,
        });
      }
      res.json({
        ok: true,
        inAmount: order.body.inAmount,
        outAmount: order.body.outAmount,
        otherAmountThreshold: order.body.otherAmountThreshold,
        slippageBps: order.body.slippageBps,
        requestId: order.body.requestId,
        transaction: Boolean(order.body.transaction),
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "quote failed" });
    }
  });

  app.post("/api/wallet/swap", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const play = String((account as { walletAddress?: string }).walletAddress || "").trim();
      if (!play || !isSolAddress(play)) return res.status(400).json({ error: "No Play wallet on this Grudge ID" });
      const parsed = parseSwap({ ...(req.body || {}), taker: play });
      if (!parsed.ok) return res.status(400).json({ error: parsed.error });
      const result = await swapPlayWallet({
        playAddress: play,
        inputMint: parsed.inputMint,
        outputMint: parsed.outputMint,
        amount: parsed.amount,
        slippageBps: parsed.slippageBps,
      });
      if (!result.ok) return res.status(400).json(result);
      res.json({ success: true, ...result });
    } catch (e: any) {
      console.error("[Wallet/swap]", e);
      res.status(400).json({ error: e.message || "Swap failed" });
    }
  });

  registerWalletInventoryRoutes(app, requireAuth, requireAccount);

  console.log(
    "[Wallet] Routes: GET /api/wallet/overview, /linked, /api/account/wallets; POST /link/*, /purchase/*, /transfer-to-play, trader_vault",
    "[Wallet] Routes: GET /api/wallet/overview, /linked; POST /link/*, /primary, /purchase/*, /transfer-to-play, /send-gbux; DELETE /linked/:address",
  );
}