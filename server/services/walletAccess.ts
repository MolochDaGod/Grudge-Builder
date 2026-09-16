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

const SIWS_DOMAIN = "id.grudge-studio.com";
const SIWS_URI = "https://id.grudge-studio.com/account";

/** Phantom SIWS: domain must match the page origin that requested the signature. */
export function originFromRequest(req: { get?: (h: string) => string | undefined; body?: any; headers?: any }): string {
  const body = req.body?.origin || req.body?.domain;
  const get = typeof req.get === "function" ? req.get.bind(req) : (h: string) => req.headers?.[h] || req.headers?.[h.toLowerCase()];
  const hdr = get("origin") || get("referer");
  const xf = get("x-forwarded-host");
  return String(body || hdr || (xf ? `https://${String(xf).split(",")[0].trim()}` : "") || "");
}

export function resolveSiwsOrigin(input?: string | null): { domain: string; uri: string } {
  const raw = String(input || "").trim();
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const host = u.hostname.toLowerCase();
    const ok =
      host === "id.grudge-studio.com" ||
      host === "wallet.grudge-studio.com" ||
      host === "poker.grudge-studio.com" ||
      host === "trader.grudge-studio.com" ||
      host === "grudge-studio.com" ||
      host === "www.grudge-studio.com" ||
      host === "character.grudge-studio.com" ||
      host.endsWith(".grudge-studio.com");
    if (!ok) return { domain: SIWS_DOMAIN, uri: SIWS_URI };
    return { domain: host, uri: `${u.protocol}//${u.host}/` };
  } catch {
    return { domain: SIWS_DOMAIN, uri: SIWS_URI };
  }
}
const SIWS_VERSION = "1";
const SIWS_CHAIN = "mainnet";
const SIWS_TTL_MS = 5 * 60 * 1000;
const SIWS_STATEMENT_LINK =
  "Link this Solana wallet to your Grudge Studio account. This proves you own the wallet. Grudge never asks for your seed phrase or private key.";
const SIWS_STATEMENT_LOGIN =
  "Sign in to Grudge Studio. This proves you own the wallet. Grudge never asks for your seed phrase or private key.";

type SiwsPurpose = "link" | "login";

type StoredChallenge = {
  purpose: SiwsPurpose;
  accountId: string | null;
  walletAddress: string;
  expiresAt: number;
  messageHash: string;
};

export type SiwsFields = {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: string;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
  requestId?: string;
};

export type SiwsChallenge = {
  message: string;
  nonce: string;
  walletAddress: string;
  siws: SiwsFields;
};

const siwsChallenges = new Map<string, StoredChallenge>();

function decodeSignatureBytes(signature: string): Uint8Array {
  const raw = String(signature || "").trim();
  try {
    return bs58.decode(raw);
  } catch {
    /* continue */
  }
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0) {
    return Uint8Array.from(Buffer.from(raw, "hex"));
  }
  return Uint8Array.from(Buffer.from(raw, "base64"));
}

export function verifyWalletSignature(
  walletAddress: string,
  message: string,
  signature: string,
): boolean {
  try {
    const pubkey = new PublicKey(walletAddress);
    const sig = decodeSignatureBytes(signature);
    const msg = new TextEncoder().encode(message);
    return nacl.sign.detached.verify(msg, sig, pubkey.toBytes());
  } catch {
    return false;
  }
}

export function parseSiwsNonce(message: string): string | null {
  const line = String(message || "")
    .split("\n")
    .find((l) => /^Nonce:\s*/i.test(l));
  const nonce = line?.replace(/^Nonce:\s*/i, "").trim();
  return nonce || null;
}

export function parseSiwsAddress(message: string): string | null {
  const text = String(message || "");
  const walletLine = text.split("\n").find((l) => /^Wallet:\s*/i.test(l));
  if (walletLine) {
    return walletLine.replace(/^Wallet:\s*/i, "").trim() || null;
  }
  const lines = text.split("\n");
  if (/wants you to sign in with your Solana account/i.test(lines[0] || "")) {
    const addr = (lines[1] || "").trim().replace(/^solana:(?:mainnet:)?/i, "");
    return addr || null;
  }
  return null;
}

function buildSiwsMessage(fields: SiwsFields): string {
  const lines = [
    `${fields.domain} wants you to sign in with your Solana account:`,
    fields.address,
    "",
    fields.statement,
    "",
    `URI: ${fields.uri}`,
    `Version: ${fields.version}`,
    `Chain ID: ${fields.chainId}`,
    `Nonce: ${fields.nonce}`,
    `Issued At: ${fields.issuedAt}`,
    `Expiration Time: ${fields.expirationTime}`,
  ];
  if (fields.requestId) lines.push(`Request ID: ${fields.requestId}`);
  return lines.join("\n");
}

export function parseSiwsDomain(message: string): string | null {
  const text = String(message || "");
  const lines = text.split("\n");
  const firstLine = lines[0] || "";
  const domainMatch = firstLine.match(/^(.+?)\s+wants you to sign in with your Solana account/i);
  if (domainMatch) {
    return domainMatch[1].trim() || null;
  }
  return null;
}

export function parseSiwsUri(message: string): string | null {
  const text = String(message || "");
  const uriLine = text.split("\n").find((l) => /^URI:\s*/i.test(l));
  if (uriLine) {
    return uriLine.replace(/^URI:\s*/i, "").trim() || null;
  }
  return null;
}

export function parseSiwsChainId(message: string): string | null {
  const text = String(message || "");
  const chainLine = text.split("\n").find((l) => /^Chain ID:\s*/i.test(l));
  if (chainLine) {
    return chainLine.replace(/^Chain ID:\s*/i, "").trim() || null;
  }
  return null;
}

function buildSiwsMessage(fields: SiwsFields): string {
  const lines = [
    `${fields.domain} wants you to sign in with your Solana account:`,
    fields.address,
    "",
    fields.statement,
    "",
    `URI: ${fields.uri}`,
    `Version: ${fields.version}`,
    `Chain ID: ${fields.chainId}`,
    `Nonce: ${fields.nonce}`,
    `Issued At: ${fields.issuedAt}`,
    `Expiration Time: ${fields.expirationTime}`,
  ];
  if (fields.requestId) lines.push(`Request ID: ${fields.requestId}`);
  return lines.join("\n");
}

function createSiwsChallenge(opts: {
  purpose: SiwsPurpose;
  walletAddress: string;
  accountId?: string | null;
  origin?: string | null;
}): SiwsChallenge {
  if (!isValidSolanaAddress(opts.walletAddress)) {
    throw new Error("Invalid Solana wallet address");
  }
  const nonce = crypto.randomBytes(16).toString("hex");
  const issuedAtMs = Date.now();
  const expiresAt = issuedAtMs + SIWS_TTL_MS;
  const issuedAt = new Date(issuedAtMs).toISOString();
  const expirationTime = new Date(expiresAt).toISOString();
  const { domain, uri } = resolveSiwsOrigin(opts.origin);
  const siws: SiwsFields = {
    domain,
    address: opts.walletAddress,
    statement: opts.purpose === "link" ? SIWS_STATEMENT_LINK : SIWS_STATEMENT_LOGIN,
    uri,
  const siws: SiwsFields = {
    domain: SIWS_DOMAIN,
    address: opts.walletAddress,
    statement: opts.purpose === "link" ? SIWS_STATEMENT_LINK : SIWS_STATEMENT_LOGIN,
    uri: SIWS_URI,
    version: SIWS_VERSION,
    chainId: SIWS_CHAIN,
    nonce,
    issuedAt,
    expirationTime,
    requestId: opts.accountId || undefined,
  };

  const message = buildSiwsMessage(siws);
  const messageHash = crypto.createHash("sha256").update(message, "utf8").digest("hex");

  siwsChallenges.set(nonce, {
    purpose: opts.purpose,
    accountId: opts.accountId || null,
    walletAddress: opts.walletAddress,
    expiresAt,
  });
  return {
    message: buildSiwsMessage(siws),
    messageHash,
  });

  return {
    message,
    nonce,
    walletAddress: opts.walletAddress,
    siws,
  };
}

/** Logged-in account → SIWS challenge (Wallet Standard signIn or signMessage). */
export function createLinkChallenge(
  accountId: string,
  walletAddress: string,
  origin?: string | null,
): SiwsChallenge {
  return createSiwsChallenge({ purpose: "link", walletAddress, accountId, origin });
}

/** Sign-in (not yet linked) → SIWS challenge. */
export function createLoginChallenge(walletAddress: string, origin?: string | null): SiwsChallenge {
  return createSiwsChallenge({ purpose: "login", walletAddress, origin });
export function createLinkChallenge(accountId: string, walletAddress: string): SiwsChallenge {
  return createSiwsChallenge({ purpose: "link", walletAddress, accountId });
}

/** Sign-in (not yet linked) → SIWS challenge. */
export function createLoginChallenge(walletAddress: string): SiwsChallenge {
  return createSiwsChallenge({ purpose: "login", walletAddress });
}

export function consumeSiwsChallenge(opts: {
  purpose: SiwsPurpose;
  walletAddress: string;
  message: string;
  signature: string;
  accountId?: string | null;
}): StoredChallenge {
  const nonce = parseSiwsNonce(opts.message);
  if (!nonce) throw new Error("Invalid SIWS message — missing nonce");

  const challenge = siwsChallenges.get(nonce);
  if (!challenge || challenge.expiresAt < Date.now()) {
    throw new Error("Link challenge expired — request a new one");
  }
  if (challenge.purpose !== opts.purpose) {
    throw new Error("Challenge type mismatch");
  }
  if (challenge.walletAddress !== opts.walletAddress) {
    throw new Error("Link challenge mismatch");
  }
  if (opts.purpose === "link") {
    if (!opts.accountId || challenge.accountId !== opts.accountId) {
      throw new Error("Link challenge mismatch");
    }
  }
  const msgAddr = parseSiwsAddress(opts.message);
  if (msgAddr && msgAddr !== opts.walletAddress) {
    throw new Error("Signed address does not match wallet");
  }

  // CRITICAL: Verify the signed message hash matches the exact issued SIWS message.
  // This cryptographically binds verification to the complete issued statement.
  const providedMessageHash = crypto.createHash("sha256").update(opts.message, "utf8").digest("hex");
  if (providedMessageHash !== challenge.messageHash) {
    throw new Error("Message does not match issued SIWS challenge");
  }

  // CRITICAL: Verify the signed message contains the exact issued domain, URI, and chain ID.
  // This binds the signature to the specific context that was issued, not just nonce+signature.
  const msgDomain = parseSiwsDomain(opts.message);
  if (!msgDomain || msgDomain !== SIWS_DOMAIN) {
    throw new Error("Signed message domain does not match issued challenge");
  }
  const msgUri = parseSiwsUri(opts.message);
  if (!msgUri || msgUri !== SIWS_URI) {
    throw new Error("Signed message URI does not match issued challenge");
  }
  const msgChain = parseSiwsChainId(opts.message);
  if (!msgChain || msgChain !== SIWS_CHAIN) {
    throw new Error("Signed message chain ID does not match issued challenge");
  }

  if (!verifyWalletSignature(opts.walletAddress, opts.message, opts.signature)) {
    throw new Error("Invalid wallet signature");
  }
  siwsChallenges.delete(nonce);
  return challenge;
}

export async function findAccountIdByWalletAddress(walletAddress: string): Promise<string | null> {
  const [linked] = await db
    .select()
    .from(linkedWallets)
    .where(eq(linkedWallets.walletAddress, walletAddress))
    .limit(1);
  if (linked?.accountId) return linked.accountId;

  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.walletAddress, walletAddress))
    .limit(1);
  return account?.id || null;
}

async function assertWalletAvailable(accountId: string, walletAddress: string): Promise<void> {
  const [linkedOther] = await db
    .select()
    .from(linkedWallets)
    .where(eq(linkedWallets.walletAddress, walletAddress))
    .limit(1);
  if (linkedOther && linkedOther.accountId !== accountId) {
    throw new Error("This Solana wallet is already linked to another Grudge ID");
  }
  const [acctOther] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.walletAddress, walletAddress))
    .limit(1);
  if (acctOther && acctOther.id !== accountId) {
    throw new Error("This Solana wallet is already linked to another Grudge ID");
  }
}


  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.walletAddress, walletAddress))
    .limit(1);
  return account?.id || null;
}

async function assertWalletAvailable(accountId: string, walletAddress: string): Promise<void> {
  const [linkedOther] = await db
    .select()
    .from(linkedWallets)
    .where(eq(linkedWallets.walletAddress, walletAddress))
    .limit(1);
  if (linkedOther && linkedOther.accountId !== accountId) {
    throw new Error("This Solana wallet is already linked to another Grudge ID");
  }
  const [acctOther] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.walletAddress, walletAddress))
    .limit(1);
  if (acctOther && acctOther.id !== accountId) {
    throw new Error("This Solana wallet is already linked to another Grudge ID");
  }
}

export async function persistLinkedWallet(
  accountId: string,
  walletAddress: string,
  provider: LinkedWalletProvider = "other",
  label?: string,
): Promise<{ linked: typeof linkedWallets.$inferSelect; setPrimary: boolean }> {
  await assertWalletAvailable(accountId, walletAddress);

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
  const custodial =
    account?.walletType === "crossmint" && Boolean(account.walletAddress);
  // Never replace a Crossmint play wallet with a linked Phantom. Linked row is the user's Solana.
  if (account && !custodial && (!account.walletAddress || row.isPrimary)) {
    await storage.updateAccount(accountId, {
      walletAddress,
      walletType: "external",
    } as any);
    setPrimary = true;
  }

  return { linked: row!, setPrimary };
}

export async function confirmLinkedWallet(
  accountId: string,
  walletAddress: string,
  message: string,
  signature: string,
  provider: LinkedWalletProvider = "other",
  label?: string,
): Promise<{ linked: typeof linkedWallets.$inferSelect; setPrimary: boolean }> {
  consumeSiwsChallenge({
    purpose: "link",
    walletAddress,
    message,
    signature,
    accountId,
  });
  return persistLinkedWallet(accountId, walletAddress, provider, label);
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