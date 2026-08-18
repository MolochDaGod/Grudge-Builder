/**
 * Third-party wallet linking + SOL/USDT → GBUX purchase verification.
 */
import crypto from "node:crypto";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  accounts,
  linkedWallets,
  walletPurchases,
  type LinkedWalletProvider,
  type WalletPurchaseCurrency,
} from "@shared/schema";
import { storage } from "../storage";
import { isValidSolanaAddress, getTreasuryPublicKey } from "./gbuxSolana";
import { getWalletOnChainBalances } from "./solanaBalances";
import { fetchSolPrice } from "../spriteGeneration/services/exchangeService";

const GBUX_RATE_USD = Number(process.env.GBUX_RATE_USD || 0.001);
const PURCHASE_FEE_PERCENT = Number(process.env.WALLET_PURCHASE_FEE_PERCENT || 0.01);
const PURCHASE_INTENT_TTL_MS = 15 * 60 * 1000;
const USDT_MINT = process.env.USDT_MINT_ADDRESS || "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const USDT_DECIMALS = Number(process.env.USDT_DECIMALS || 6);

const linkChallenges = new Map<string, { accountId: string; walletAddress: string; expiresAt: number }>();

export function verifyWalletSignature(
  walletAddress: string,
  message: string,
  signature: string,
): boolean {
  try {
    const pubkey = new PublicKey(walletAddress);
    const sig = bs58.decode(signature);
    const msg = new TextEncoder().encode(message);
    return nacl.sign.detached.verify(msg, sig, pubkey.toBytes());
  } catch {
    return false;
  }
}

export function createLinkChallenge(accountId: string, walletAddress: string): string {
  if (!isValidSolanaAddress(walletAddress)) {
    throw new Error("Invalid Solana wallet address");
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const expiresAt = Date.now() + 5 * 60 * 1000;
  linkChallenges.set(nonce, { accountId, walletAddress, expiresAt });

  return [
    "Link wallet to Grudge Studio account",
    `Account: ${accountId}`,
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
    `Expires: ${new Date(expiresAt).toISOString()}`,
  ].join("\n");
}

export async function confirmLinkedWallet(
  accountId: string,
  walletAddress: string,
  message: string,
  signature: string,
  provider: LinkedWalletProvider = "other",
  label?: string,
): Promise<{ linked: typeof linkedWallets.$inferSelect; setPrimary: boolean }> {
  const nonceLine = message.split("\n").find((l) => l.startsWith("Nonce: "));
  const nonce = nonceLine?.slice("Nonce: ".length).trim();
  if (!nonce) throw new Error("Invalid link message");

  const challenge = linkChallenges.get(nonce);
  if (!challenge || challenge.expiresAt < Date.now()) {
    throw new Error("Link challenge expired — request a new one");
  }
  if (challenge.accountId !== accountId || challenge.walletAddress !== walletAddress) {
    throw new Error("Link challenge mismatch");
  }
  if (!verifyWalletSignature(walletAddress, message, signature)) {
    throw new Error("Invalid wallet signature");
  }

  linkChallenges.delete(nonce);

  const [existing] = await db
    .select()
    .from(linkedWallets)
    .where(
      and(
        eq(linkedWallets.accountId, accountId),
        eq(linkedWallets.walletAddress, walletAddress),
      ),
    )
    .limit(1);

  const now = Date.now();
  let row = existing;

  if (!row) {
    const linkedCount = await db
      .select()
      .from(linkedWallets)
      .where(eq(linkedWallets.accountId, accountId));
    const isPrimary = linkedCount.length === 0;

    [row] = await db
      .insert(linkedWallets)
      .values({
        accountId,
        walletAddress,
        provider,
        label: label || provider,
        isPrimary,
        verifiedAt: now,
      })
      .returning();
  } else {
    [row] = await db
      .update(linkedWallets)
      .set({ provider, label: label || row.label, verifiedAt: now })
      .where(eq(linkedWallets.id, row.id))
      .returning();
  }

  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  let setPrimary = false;
  if (account && (!account.walletAddress || row.isPrimary)) {
    await storage.updateAccount(accountId, {
      walletAddress,
      walletType: "external",
    } as any);
    setPrimary = true;
  }

  return { linked: row!, setPrimary };
}

export async function listLinkedWallets(accountId: string) {
  return db.select().from(linkedWallets).where(eq(linkedWallets.accountId, accountId));
}

export async function getWalletOverview(accountId: string) {
  const account = await storage.getAccount(accountId);
  if (!account) return null;

  const linked = await listLinkedWallets(accountId);
  const addresses = new Set<string>();
  if (account.walletAddress) addresses.add(account.walletAddress);
  for (const w of linked) addresses.add(w.walletAddress);

  const balances = await Promise.all(
    [...addresses].map((addr) => getWalletOnChainBalances(addr)),
  );

  return {
    accountId,
    grudgeId: account.grudgeId,
    gbuxBalance: account.gbuxBalance ?? 0,
    primaryWallet: account.walletAddress,
    custodialWallet: account.walletAddress,
    walletType: account.walletType,
    crossmintEmail: account.crossmintEmail,
    linkedWallets: linked,
    onChain: balances,
    treasuryAddress: getTreasuryPublicKey(),
    rates: {
      gbuxUsd: GBUX_RATE_USD,
      purchaseFeePercent: PURCHASE_FEE_PERCENT,
    },
  };
}

export async function quoteWalletPurchase(
  currency: WalletPurchaseCurrency,
  amountIn: number,
): Promise<{
  currency: WalletPurchaseCurrency;
  amountIn: number;
  gbuxGross: number;
  feeAmount: number;
  gbuxOut: number;
  exchangeRate: number;
  solPriceUsd?: number;
}> {
  if (amountIn <= 0) throw new Error("Amount must be positive");

  let usdValue: number;
  let exchangeRate: number;
  let solPriceUsd: number | undefined;

  if (currency === "SOL") {
    solPriceUsd = await fetchSolPrice();
    usdValue = amountIn * solPriceUsd;
    exchangeRate = solPriceUsd / GBUX_RATE_USD;
  } else {
    usdValue = amountIn;
    exchangeRate = 1 / GBUX_RATE_USD;
  }

  const gbuxGross = Math.floor(usdValue / GBUX_RATE_USD);
  const feeAmount = Math.floor(gbuxGross * PURCHASE_FEE_PERCENT);
  const gbuxOut = Math.max(0, gbuxGross - feeAmount);

  if (gbuxOut < 1) throw new Error("Purchase amount too small");

  return {
    currency,
    amountIn,
    gbuxGross,
    feeAmount,
    gbuxOut,
    exchangeRate,
    solPriceUsd,
  };
}

export async function createPurchaseIntent(
  accountId: string,
  currency: WalletPurchaseCurrency,
  amountIn: number,
  linkedWalletAddress?: string,
) {
  const treasury = getTreasuryPublicKey();
  if (!treasury) throw new Error("Purchase treasury not configured");

  const quote = await quoteWalletPurchase(currency, amountIn);
  const expiresAt = Date.now() + PURCHASE_INTENT_TTL_MS;

  const [intent] = await db
    .insert(walletPurchases)
    .values({
      accountId,
      linkedWalletAddress: linkedWalletAddress || null,
      currency,
      amountIn,
      gbuxOut: quote.gbuxOut,
      status: "pending",
      treasuryAddress: treasury,
      expiresAt,
      metadata: {
        exchangeRate: quote.exchangeRate,
        feePercent: PURCHASE_FEE_PERCENT,
        feeAmount: quote.feeAmount,
        solPriceUsd: quote.solPriceUsd,
      },
    })
    .returning();

  return { intent, quote, treasury };
}

async function verifySolPayment(
  connection: Connection,
  signature: string,
  treasury: string,
  minLamports: number,
  sender?: string,
): Promise<boolean> {
  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx?.meta || tx.meta.err) return false;

  const accountKeys = tx.transaction.message.getAccountKeys().staticAccountKeys.map((k) =>
    k.toBase58(),
  );
  const treasuryIdx = accountKeys.indexOf(treasury);
  if (treasuryIdx < 0) return false;

  const pre = tx.meta.preBalances[treasuryIdx] ?? 0;
  const post = tx.meta.postBalances[treasuryIdx] ?? 0;
  const gained = post - pre;
  if (gained < minLamports) return false;

  if (sender) {
    const senderIdx = accountKeys.indexOf(sender);
    if (senderIdx < 0) return false;
    const senderPre = tx.meta.preBalances[senderIdx] ?? 0;
    const senderPost = tx.meta.postBalances[senderIdx] ?? 0;
    if (senderPost >= senderPre) return false;
  }

  return true;
}

async function verifyUsdtPayment(
  connection: Connection,
  signature: string,
  treasury: string,
  minRawAmount: bigint,
  sender?: string,
): Promise<boolean> {
  const tx = await connection.getParsedTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx?.meta || tx.meta.err) return false;

  const mint = new PublicKey(USDT_MINT);
  const treasuryAta = (await getAssociatedTokenAddress(mint, new PublicKey(treasury))).toBase58();

  for (const inner of tx.meta.innerInstructions ?? []) {
    for (const ix of inner.instructions) {
      if (!("parsed" in ix)) continue;
      const parsed = ix.parsed as {
        type?: string;
        info?: { destination?: string; amount?: string; authority?: string; source?: string };
      };
      if (parsed.type !== "transfer") continue;
      if (parsed.info?.destination !== treasuryAta) continue;
      const amount = BigInt(parsed.info?.amount || "0");
      if (amount < minRawAmount) continue;
      if (sender && parsed.info?.authority && parsed.info.authority !== sender) continue;
      return true;
    }
  }

  for (const ix of tx.transaction.message.instructions) {
    if (!("parsed" in ix)) continue;
    const parsed = ix.parsed as {
      type?: string;
      info?: { destination?: string; amount?: string; authority?: string };
    };
    if (parsed.type !== "transfer") continue;
    if (parsed.info?.destination !== treasuryAta) continue;
    const amount = BigInt(parsed.info?.amount || "0");
    if (amount >= minRawAmount) {
      if (!sender || parsed.info?.authority === sender) return true;
    }
  }

  return false;
}

export async function confirmPurchase(
  accountId: string,
  purchaseId: string,
  txSignature: string,
): Promise<{ purchase: typeof walletPurchases.$inferSelect; credited: number }> {
  const [purchase] = await db
    .select()
    .from(walletPurchases)
    .where(eq(walletPurchases.id, purchaseId))
    .limit(1);

  if (!purchase || purchase.accountId !== accountId) {
    throw new Error("Purchase not found");
  }
  if (purchase.status === "confirmed") {
    return { purchase, credited: purchase.gbuxOut };
  }
  if (purchase.status !== "pending") {
    throw new Error(`Purchase is ${purchase.status}`);
  }
  if (purchase.expiresAt < Date.now()) {
    await db
      .update(walletPurchases)
      .set({ status: "expired" })
      .where(eq(walletPurchases.id, purchaseId));
    throw new Error("Purchase intent expired");
  }

  const rpc = process.env.SOLANA_RPC_URL;
  if (!rpc) throw new Error("SOLANA_RPC_URL not configured");
  const connection = new Connection(rpc, "confirmed");

  const sender = purchase.linkedWalletAddress || undefined;
  let ok = false;

  if (purchase.currency === "SOL") {
    const minLamports = Math.floor(purchase.amountIn * LAMPORTS_PER_SOL * 0.99);
    ok = await verifySolPayment(
      connection,
      txSignature,
      purchase.treasuryAddress,
      minLamports,
      sender,
    );
  } else {
    const minRaw = BigInt(Math.floor(purchase.amountIn * 10 ** USDT_DECIMALS * 0.99));
    ok = await verifyUsdtPayment(
      connection,
      txSignature,
      purchase.treasuryAddress,
      minRaw,
      sender,
    );
  }

  if (!ok) throw new Error("On-chain payment not verified");

  const [dup] = await db
    .select()
    .from(walletPurchases)
    .where(eq(walletPurchases.txSignature, txSignature))
    .limit(1);
  if (dup && dup.id !== purchaseId) {
    throw new Error("Transaction already used");
  }

  await storage.creditGbux(accountId, purchase.gbuxOut, "wallet_purchase", {
    sourceRef: txSignature,
    metadata: {
      purchaseId,
      currency: purchase.currency,
      amountIn: purchase.amountIn,
      treasury: purchase.treasuryAddress,
      linkedWallet: purchase.linkedWalletAddress,
      explorerUrl: `https://solscan.io/tx/${txSignature}`,
    },
  });

  const now = Date.now();
  const [updated] = await db
    .update(walletPurchases)
    .set({
      status: "confirmed",
      txSignature,
      confirmedAt: now,
      metadata: {
        ...(purchase.metadata as object),
        explorerUrl: `https://solscan.io/tx/${txSignature}`,
      },
    })
    .where(eq(walletPurchases.id, purchaseId))
    .returning();

  return { purchase: updated!, credited: purchase.gbuxOut };
}