/**
 * Coins / cNFTs / Dapps endpoints for wallet.grudge-studio.com.
 */
import type { Express, Request, Response, NextFunction } from "express";
import {
  listTokensForAccount,
  listNftsForAccount,
  lookupMint,
  addWatchMint,
  removeWatchMint,
  dappsPayload,
  GBUX_MINT,
  searchTokens,
  type OwnerKind,
} from "../services/walletInventory";

type AccountRow = {
  id: string;
  walletAddress?: string | null;
  walletType?: string | null;
  grudgeId?: string | null;
  crossmintEmail?: string | null;
  gbuxBalance?: number | string | null;
};

export function registerWalletInventoryRoutes(
  app: Express,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  requireAccount: (req: Request, res: Response) => Promise<AccountRow | null>,
): void {
  app.get("/api/wallet/dapps", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(dappsPayload());
  });

  app.get("/api/wallet/token-meta", async (req, res) => {
    try {
      const q = String(req.query.q || req.query.mint || "").trim();
      if (!q) return res.status(400).json({ error: "q or mint required" });
      const items = await searchTokens(q);
      if (!items.length) {
        const token = await lookupMint(q);
        if (!token) return res.status(404).json({ error: "Token not found on Solana" });
        res.setHeader("Cache-Control", "no-store");
        return res.json({ ...token, items: [token] });
      }
      res.setHeader("Cache-Control", "no-store");
      res.json({ ...items[0], items });
    } catch (e: any) {
      res.status(502).json({ error: e.message || "lookup failed" });
    }
  });

  app.get("/api/wallet/tokens", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const owner = String(req.query.owner || "crossmint").toLowerCase() as OwnerKind;
      const kind: OwnerKind =
        owner === "linked" || owner === "vault" ? owner : "crossmint";
      const extra = String(req.query.watch || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const vaultPubkey = String(req.query.vault || "").trim() || null;
      const data = await listTokensForAccount({
        account,
        owner: kind,
        vaultPubkey,
        extraMints: extra,
      });
      res.setHeader("Cache-Control", "no-store");
      res.json(data);
    } catch (e: any) {
      console.error("[Wallet/tokens]", e);
      res.status(500).json({ error: e.message || "Failed to load tokens" });
    }
  });

  app.post("/api/wallet/tokens", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const body = req.body as { mint?: string; q?: string };
      const q = String(body.mint || body.q || "").trim();
      const meta = await lookupMint(q);
      if (!meta) return res.status(404).json({ error: "Token not found" });
      if (meta.mint === GBUX_MINT) {
        return res.status(400).json({ error: "GBUX is already on the bag — not a watch token" });
      }
      await addWatchMint(account.id, meta);
      res.json({ success: true, token: meta });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Could not add token" });
    }
  });

  app.delete("/api/wallet/tokens/:mint", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const mint = decodeURIComponent(String(req.params.mint || "")).trim();
      await removeWatchMint(account.id, mint);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Could not remove token" });
    }
  });

  app.get("/api/wallet/nfts", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const data = await listNftsForAccount({ account });
      res.setHeader("Cache-Control", "no-store");
      res.json(data);
    } catch (e: any) {
      console.error("[Wallet/nfts]", e);
      res.status(500).json({ error: e.message || "Failed to load cNFTs" });
    }
  });

  app.post("/api/wallet/nfts/sync", requireAuth, async (req, res) => {
    try {
      const account = await requireAccount(req, res);
      if (!account) return;
      const data = await listNftsForAccount({ account });
      res.setHeader("Cache-Control", "no-store");
      res.json({ success: true, ...data });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Sync failed" });
    }
  });

  console.log(
    "[Wallet] Inventory: GET /api/wallet/tokens, /nfts, /dapps, /token-meta; POST /tokens, /nfts/sync",
  );
}
