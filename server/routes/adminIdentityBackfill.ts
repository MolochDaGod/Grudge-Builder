/**
 * Admin Identity Backfill Routes
 * 
 * Emergency backfill routes for linking existing Phantom wallets to Grudge IDs
 * without requiring a player session. For Keel/Kronic silent Dope-Budz identity sync.
 * 
 * Auth: Admin-only (same pattern as /api/admin/reset-account and /api/admin/mint-cnft)
 * No Puter, no puter-sso, no client UI in this scope.
 * 
 * IMPORTANT: These routes create accounts WITHOUT Puter linkage (puter_* / puterUuid = null).
 */

import type { Express, Request, Response } from "express";
import { db } from "../db";
import { accounts, linkedWallets } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import crypto from "node:crypto";
import { CrossmintWalletService } from "../services/crossmintWallet";

const crossmintService = new CrossmintWalletService();

// Base58 alphabet for Solana public key validation
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Validate if string is valid base58 (Solana pubkey format)
 * Returns true if valid, false otherwise
 */
function isValidBase58(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  if (str.length < 32 || str.length > 44) return false; // Typical Solana pubkey is 32-44 chars
  for (const char of str) {
    if (!BASE58_ALPHABET.includes(char)) return false;
  }
  return true;
}

/**
 * Generate a GRUDGE_* ID (same style as auth.ts generateGrudgeId)
 * Format: GRUDGE_<timestamp_base36><random_hex> (max 20 chars)
 */
function generateGrudgeId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `GRUDGE_${ts}${rand}`.slice(0, 20);
}

/**
 * Normalize Solana public key (base58 format)
 * Returns trimmed string
 */
function normalizeSolanaPubkey(pubkey: string): string {
  return pubkey.trim();
}

/**
 * Admin auth check with fail-closed security.
 * 
 * Production: requires non-empty ADMIN_API_KEY env + constant-time comparison.
 * Dev: NODE_ENV==='development' bypass (pre-existing pattern debt).
 */
function isAdminRequest(req: Request): boolean {
  // Dev mode bypass (pre-existing pattern)
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Production: fail CLOSED
  const envKey = process.env.ADMIN_API_KEY;
  if (!envKey || envKey.trim().length === 0) {
    // If ADMIN_API_KEY unset/empty in prod → deny always (fail closed)
    console.error('[Admin Backfill] ADMIN_API_KEY not configured in production');
    return false;
  }

  const headerKey = req.headers['x-admin-key'];
  if (!headerKey || typeof headerKey !== 'string' || headerKey.trim().length === 0) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  try {
    const headerBuf = Buffer.from(headerKey.trim(), 'utf8');
    const envBuf = Buffer.from(envKey.trim(), 'utf8');
    
    // Buffers must be same length for timingSafeEqual
    if (headerBuf.length !== envBuf.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(headerBuf, envBuf);
  } catch (error) {
    console.error('[Admin Backfill] Auth comparison error:', error);
    return false;
  }
}

export function registerAdminIdentityBackfillRoutes(app: Express): void {
  
  /**
   * POST /api/admin/backfill/grudge-wallet
   * 
   * Idempotent backfill: link Phantom wallet to Grudge ID.
   * Creates account WITHOUT Puter if wallet is orphaned.
   * 
   * Body: { phantomPubkey: string, displayName?: string }
   * 
   * Returns:
   *   200 { grudgeId, created: boolean, linked: boolean, walletStatus: { ... } }
   *   409 { error: "human_merge_required", grudgeIds: string[] } - multiple grudge_ids found
   *   403 { error: "Admin access required" }
   *   400 { error: "phantomPubkey required" }
   */
  app.post("/api/admin/backfill/grudge-wallet", async (req: Request, res: Response) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const { phantomPubkey, displayName } = req.body as {
        phantomPubkey?: string;
        displayName?: string;
      };

      if (!phantomPubkey) {
        return res.status(400).json({ error: "phantomPubkey required" });
      }

      const normalizedPubkey = normalizeSolanaPubkey(phantomPubkey);

      // Validate base58 format
      if (!isValidBase58(normalizedPubkey)) {
        return res.status(400).json({ error: "Invalid Solana public key format (base58 expected)" });
      }

      console.log(`[Admin Backfill] Processing wallet: ${normalizedPubkey}`);

      // 1) Lookup linked wallet by pubkey
      const linkedWalletRows = await db
        .select()
        .from(linkedWallets)
        .where(eq(linkedWallets.walletAddress, normalizedPubkey));

      // 2) If linked to 2+ distinct grudge_ids → 409 human merge required
      if (linkedWalletRows.length > 0) {
        const accountIds = [...new Set(linkedWalletRows.map(w => w.accountId))];
        
        // Fetch grudge_ids for all linked accounts
        const linkedAccounts = await db
          .select({ id: accounts.id, grudgeId: accounts.grudgeId })
          .from(accounts)
          .where(inArray(accounts.id, accountIds));

        const grudgeIds = linkedAccounts
          .map(a => a.grudgeId)
          .filter((id): id is string => !!id);

        const uniqueGrudgeIds = [...new Set(grudgeIds)];

        // BUG FIX: If wallet is linked but no non-null grudgeIds exist → error (don't create new account)
        if (grudgeIds.length === 0) {
          const orphanAccountIds = linkedAccounts.map(a => a.id);
          console.error(
            `[Admin Backfill] Wallet ${normalizedPubkey} linked to accounts without grudge_id: ${orphanAccountIds.join(", ")}`
          );
          return res.status(409).json({
            error: "linked_without_grudge_id",
            message: "Wallet is linked to account(s) with null grudge_id. Manual fix required.",
            accountIds: orphanAccountIds,
          });
        }

        if (uniqueGrudgeIds.length > 1) {
          console.warn(
            `[Admin Backfill] Multiple grudge_ids found for wallet ${normalizedPubkey}: ${uniqueGrudgeIds.join(", ")}`
          );
          return res.status(409).json({
            error: "human_merge_required",
            grudgeIds: uniqueGrudgeIds,
          });
        }

        // 3) If linked to exactly 1 → ensure Crossmint wallet exists
        if (uniqueGrudgeIds.length === 1) {
          const grudgeId = uniqueGrudgeIds[0];
          const account = linkedAccounts.find(a => a.grudgeId === grudgeId);

          if (!account) {
            return res.status(500).json({ error: "Account not found for linked wallet" });
          }

          console.log(`[Admin Backfill] Wallet already linked to grudgeId: ${grudgeId}`);

          // Ensure Crossmint wallet exists (idempotent - won't create duplicate)
          let walletStatus: any = { status: "not_created" };
          try {
            const wallet = await crossmintService.getOrCreateWalletForGrudgeId(grudgeId);
            if (wallet) {
              walletStatus = {
                status: "ok",
                address: wallet.address,
                walletId: wallet.id,
              };

              // Update account with wallet info if not already set
              const currentAccount = await db
                .select()
                .from(accounts)
                .where(eq(accounts.id, account.id))
                .limit(1);

              if (currentAccount.length > 0 && !currentAccount[0].walletAddress) {
                await db
                  .update(accounts)
                  .set({
                    walletAddress: wallet.address,
                    walletType: "crossmint",
                    crossmintWalletId: wallet.id,
                    crossmintEmail: crossmintService.stableEmailForGrudgeId(grudgeId),
                  })
                  .where(eq(accounts.id, account.id));
                console.log(`[Admin Backfill] Updated account ${account.id} with Crossmint wallet`);
              }
            }
          } catch (error) {
            console.error(`[Admin Backfill] Crossmint wallet creation failed:`, error);
            walletStatus = { status: "error", message: String(error) };
          }

          return res.status(200).json({
            grudgeId,
            created: false,
            linked: true,
            walletStatus,
          });
        }
      }

      // 4) If none → create new account WITHOUT Puter
      console.log(`[Admin Backfill] Creating new account for orphaned wallet: ${normalizedPubkey}`);

      const grudgeId = generateGrudgeId();
      console.log(`[Admin Backfill] Generated grudge_id: ${grudgeId}`);

      // Create Crossmint wallet first
      let walletData: {
        walletAddress?: string;
        walletId?: string;
        status?: string;
      } = { status: "not_created" };

      try {
        const wallet = await crossmintService.getOrCreateWalletForGrudgeId(grudgeId);
        if (wallet) {
          walletData = {
            walletAddress: wallet.address,
            walletId: wallet.id,
            status: "created",
          };
          console.log(`[Admin Backfill] Created Crossmint wallet ${wallet.address} for ${grudgeId}`);
        }
      } catch (error) {
        console.error(`[Admin Backfill] Crossmint wallet creation failed:`, error);
        walletData = { status: "error" };
      }

      // Create account WITHOUT Puter fields
      // Generate a synthetic userId that is NOT a Puter UUID
      const syntheticUserId = `backfill:${crypto.randomBytes(16).toString("hex")}`;

      const [newAccount] = await db
        .insert(accounts)
        .values({
          userId: syntheticUserId,
          grudgeId,
          displayName: displayName || null,
          walletAddress: walletData.walletAddress || null,
          walletType: walletData.walletAddress ? "crossmint" : null,
          crossmintWalletId: walletData.walletId || null,
          crossmintEmail: crossmintService.stableEmailForGrudgeId(grudgeId),
          // Explicitly NOT setting: puterUuid, puterEmail, puter_id, puter_sso_id
        })
        .returning();

      console.log(`[Admin Backfill] Created account ${newAccount.id} for ${grudgeId}`);

      // Link the Phantom wallet
      await db.insert(linkedWallets).values({
        accountId: newAccount.id,
        walletAddress: normalizedPubkey,
        provider: "phantom",
        isPrimary: true,
        verifiedAt: Date.now(),
      });

      console.log(`[Admin Backfill] Linked Phantom wallet ${normalizedPubkey} to account ${newAccount.id}`);

      return res.status(200).json({
        grudgeId,
        created: true,
        linked: true,
        walletStatus: walletData,
      });

    } catch (error) {
      console.error("[Admin Backfill] Error in grudge-wallet:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  /**
   * GET/POST /api/admin/backfill/lookup
   * 
   * Lookup mapping only (for THC remap dry-run). No writes.
   * 
   * Query or body: { pubkey: string }
   * 
   * Returns:
   *   200 { pubkey, grudgeIds: string[], primaryGrudgeId?: string }
   *   403 { error: "Admin access required" }
   *   400 { error: "pubkey required" }
   */
  const lookupHandler = async (req: Request, res: Response) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const pubkey = (req.query.pubkey || req.body?.pubkey) as string | undefined;

      if (!pubkey) {
        return res.status(400).json({ error: "pubkey required" });
      }

      const normalizedPubkey = normalizeSolanaPubkey(pubkey);

      // Validate base58 format
      if (!isValidBase58(normalizedPubkey)) {
        return res.status(400).json({ error: "Invalid Solana public key format (base58 expected)" });
      }

      // Lookup linked wallet
      const linkedWalletRows = await db
        .select()
        .from(linkedWallets)
        .where(eq(linkedWallets.walletAddress, normalizedPubkey));

      if (linkedWalletRows.length === 0) {
        return res.status(200).json({
          pubkey: normalizedPubkey,
          grudgeIds: [],
          primaryGrudgeId: null,
        });
      }

      const accountIds = [...new Set(linkedWalletRows.map(w => w.accountId))];

      // Fetch grudge_ids
      const linkedAccounts = await db
        .select({ id: accounts.id, grudgeId: accounts.grudgeId })
        .from(accounts)
        .where(inArray(accounts.id, accountIds));

      const grudgeIds = linkedAccounts
        .map(a => a.grudgeId)
        .filter((id): id is string => !!id);

      const uniqueGrudgeIds = [...new Set(grudgeIds)];

      // Determine primary (first linked wallet with isPrimary=true)
      const primaryLink = linkedWalletRows.find(w => w.isPrimary);
      const primaryAccount = primaryLink
        ? linkedAccounts.find(a => a.id === primaryLink.accountId)
        : linkedAccounts[0];

      return res.status(200).json({
        pubkey: normalizedPubkey,
        grudgeIds: uniqueGrudgeIds,
        primaryGrudgeId: primaryAccount?.grudgeId || null,
      });

    } catch (error) {
      console.error("[Admin Backfill] Error in lookup:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  };

  app.get("/api/admin/backfill/lookup", lookupHandler);
  app.post("/api/admin/backfill/lookup", lookupHandler);
}
