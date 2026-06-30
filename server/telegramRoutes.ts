/**
 * Telegram bot integration — account linking + Stars payment fulfillment.
 * Called by grudachain-ale (@grudachainbot) with TELEGRAM_BOT_ADMIN_KEY.
 */
import type { Express, Request, Response } from "express";
import { db } from "./db";
import { accounts, gbuxTransactions, telegramLinks, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "./storage";
import {
  GBUX_MINT_ADDRESS,
  isValidSolanaAddress,
  transferGbuxSpl,
} from "./services/gbuxSolana";
import { buildScopedProfileByTelegramId } from "./lib/scopedProfile";

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

async function findAccountByWalletOrGrudgeId(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.toUpperCase().startsWith("GRUDGE_")) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.grudgeId, trimmed.toUpperCase()))
      .limit(1);
    if (!user) return null;
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, user.id))
      .limit(1);
    return account || null;
  }

  if (!isValidSolanaAddress(trimmed)) return null;

  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.walletAddress, trimmed))
    .limit(1);
  return account || null;
}

async function findExistingCharge(sourceRef: string) {
  const [row] = await db
    .select()
    .from(gbuxTransactions)
    .where(eq(gbuxTransactions.sourceRef, sourceRef))
    .limit(1);
  return row || null;
}

export function registerTelegramRoutes(app: Express): void {
  app.post("/api/telegram/link", async (req: Request, res: Response) => {
    if (!assertBotAdmin(req, res)) return;

    const telegramUserId = String(req.body?.telegramUserId || "").trim();
    const identifier = String(req.body?.walletAddress || req.body?.grudgeId || req.body?.identifier || "").trim();
    const telegramUsername = req.body?.telegramUsername
      ? String(req.body.telegramUsername).replace(/^@/, "")
      : null;

    if (!telegramUserId || !identifier) {
      return res.status(400).json({
        success: false,
        error: "telegramUserId and walletAddress or grudgeId required",
      });
    }

    const account = await findAccountByWalletOrGrudgeId(identifier);
    if (!account?.walletAddress) {
      return res.status(404).json({
        success: false,
        error:
          "No Grudge account with that wallet or Grudge ID. Sign in at grudge-studio.com first.",
      });
    }

    await db
      .insert(telegramLinks)
      .values({
        telegramUserId,
        accountId: account.id,
        walletAddress: account.walletAddress,
        telegramUsername,
      })
      .onConflictDoUpdate({
        target: telegramLinks.telegramUserId,
        set: {
          accountId: account.id,
          walletAddress: account.walletAddress,
          telegramUsername,
          linkedAt: Date.now(),
        },
      });

    const profile = await buildScopedProfileByTelegramId(telegramUserId, { mask: false });

    return res.json({
      success: true,
      linked: true,
      walletAddress: account.walletAddress,
      gbuxMint: GBUX_MINT_ADDRESS,
      profile,
    });
  });

  app.get("/api/telegram/account/:telegramUserId", async (req: Request, res: Response) => {
    if (!assertBotAdmin(req, res)) return;

    const telegramUserId = String(req.params.telegramUserId || "").trim();
    const profile = await buildScopedProfileByTelegramId(telegramUserId);
    if (!profile) {
      return res.status(404).json({ success: false, linked: false });
    }
    const [link] = await db
      .select()
      .from(telegramLinks)
      .where(eq(telegramLinks.telegramUserId, telegramUserId))
      .limit(1);
    return res.json({
      success: true,
      linked: true,
      accountId: link?.accountId ?? null,
      profile,
      gbuxMint: GBUX_MINT_ADDRESS,
    });
  });

  app.post("/api/admin/telegram-gbux-credit", async (req: Request, res: Response) => {
    if (!assertBotAdmin(req, res)) return;

    const telegramUserId = String(req.body?.telegramUserId || "").trim();
    const amount = Number(req.body?.amount || 0);
    const sourceRef = String(req.body?.sourceRef || "").trim();
    const metadata = req.body?.metadata || {};

    if (!telegramUserId || amount <= 0 || !sourceRef) {
      return res.status(400).json({
        success: false,
        error: "telegramUserId, positive amount, and sourceRef required",
      });
    }

    const existing = await findExistingCharge(sourceRef);
    if (existing) {
      return res.json({
        success: true,
        credited: true,
        duplicate: true,
        gbuxAmount: existing.amount,
        sourceRef,
      });
    }

    const [link] = await db
      .select()
      .from(telegramLinks)
      .where(eq(telegramLinks.telegramUserId, telegramUserId))
      .limit(1);

    if (!link) {
      return res.status(400).json({
        success: false,
        error: "Telegram account not linked. Use /link <wallet> or /link GRUDGE_… first.",
      });
    }

    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, link.accountId))
      .limit(1);

    if (!account) {
      return res.status(404).json({ success: false, error: "Linked account not found" });
    }

    const wallet = link.walletAddress || account.walletAddress;
    if (!wallet) {
      return res.status(400).json({ success: false, error: "No Solana wallet on linked account" });
    }

    let onChain: { signature: string; mint: string; rawAmount: string } | null = null;
    try {
      onChain = await transferGbuxSpl(wallet, amount);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[Telegram] On-chain GBUX transfer failed:", message);
      return res.status(502).json({
        success: false,
        error: `On-chain transfer failed: ${message}`,
        gbuxMint: GBUX_MINT_ADDRESS,
        wallet,
      });
    }

    const tx = await storage.creditGbux(account.id, amount, "telegram_purchase", {
      sourceRef,
      metadata: {
        ...metadata,
        channel: "telegram_stars",
        telegramUserId,
        solanaSignature: onChain.signature,
        gbuxMint: onChain.mint,
        rawAmount: onChain.rawAmount,
        wallet,
      },
    });

    return res.json({
      success: true,
      credited: true,
      gbuxAmount: amount,
      wallet,
      gbuxMint: GBUX_MINT_ADDRESS,
      solanaSignature: onChain.signature,
      explorerUrl: `https://solscan.io/tx/${onChain.signature}`,
      ledgerTxId: tx.id,
      balanceAfter: tx.balanceAfter,
    });
  });

  console.log("[Telegram] Routes: POST /api/telegram/link, GET /api/telegram/account/:id, POST /api/admin/telegram-gbux-credit");
}