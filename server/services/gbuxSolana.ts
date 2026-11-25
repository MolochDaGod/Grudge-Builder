/**
 * On-chain GBUX (SPL) transfers on Solana mainnet.
 * Mint: 55TpSoMNxbfsNJ9U1dQoo9H3dRtDmjBZVMcKqvU2nray (6 decimals)
 */
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddress,
  TokenAccountNotFoundError,
} from "@solana/spl-token";
import bs58 from "bs58";

export const GBUX_MINT_ADDRESS =
  process.env.GBUX_MINT_ADDRESS || "55TpSoMNxbfsNJ9U1dQoo9H3dRtDmjBZVMcKqvU2nray";

const GBUX_DECIMALS = Number(process.env.GBUX_DECIMALS || 6);

export function getTreasuryKeypair(): Keypair | null {
  const raw = process.env.GBUX_TREASURY_SECRET_KEY?.trim();
  if (!raw) return null;
  try {
    if (raw.startsWith("[")) {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
    }
    return Keypair.fromSecretKey(bs58.decode(raw));
  } catch (e) {
    console.error("[GbuxSolana] Invalid GBUX_TREASURY_SECRET_KEY:", e);
    return null;
  }
}

export function gbuxToRawAmount(gbux: number): bigint {
  return BigInt(Math.round(gbux * 10 ** GBUX_DECIMALS));
}

export function isValidSolanaAddress(address: string): boolean {
  try {
    const pk = new PublicKey(address);
    return PublicKey.isOnCurve(pk.toBytes());
  } catch {
    return false;
  }
}

export async function transferGbuxSpl(
  toWalletAddress: string,
  gbuxAmount: number,
): Promise<{ signature: string; mint: string; rawAmount: string }> {
  const treasury = getTreasuryKeypair();
  if (!treasury) {
    throw new Error("GBUX_TREASURY_SECRET_KEY not configured");
  }

  const rpc = process.env.SOLANA_RPC_URL;
  if (!rpc) throw new Error("SOLANA_RPC_URL not configured");

  if (!isValidSolanaAddress(toWalletAddress)) {
    throw new Error("Invalid recipient Solana wallet");
  }

  const connection = new Connection(rpc, "confirmed");
  const mint = new PublicKey(GBUX_MINT_ADDRESS);
  const recipient = new PublicKey(toWalletAddress);
  const rawAmount = gbuxToRawAmount(gbuxAmount);

  const treasuryAta = await getAssociatedTokenAddress(mint, treasury.publicKey);
  const recipientAta = await getAssociatedTokenAddress(mint, recipient);

  const tx = new Transaction();

  try {
    await getAccount(connection, recipientAta);
  } catch (e) {
    if (e instanceof TokenAccountNotFoundError) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          treasury.publicKey,
          recipientAta,
          recipient,
          mint,
        ),
      );
    } else {
      throw e;
    }
  }

  tx.add(
    createTransferInstruction(treasuryAta, recipientAta, treasury.publicKey, rawAmount),
  );

  const signature = await sendAndConfirmTransaction(connection, tx, [treasury], {
    commitment: "confirmed",
  });

  console.log(
    `[GbuxSolana] Sent ${gbuxAmount} GBUX → ${toWalletAddress} sig=${signature}`,
  );

  return {
    signature,
    mint: GBUX_MINT_ADDRESS,
    rawAmount: rawAmount.toString(),
  };
}

export function getTreasuryPublicKey(): string | null {
  return getTreasuryKeypair()?.publicKey.toBase58() ?? null;
}

export async function getTreasuryGbuxBalance(): Promise<number | null> {
  const treasury = getTreasuryKeypair();
  const rpc = process.env.SOLANA_RPC_URL;
  if (!treasury || !rpc) return null;

  try {
    const connection = new Connection(rpc, "confirmed");
    const mint = new PublicKey(GBUX_MINT_ADDRESS);
    const ata = await getAssociatedTokenAddress(mint, treasury.publicKey);
    const account = await getAccount(connection, ata);
    return Number(account.amount) / 10 ** GBUX_DECIMALS;
  } catch {
    return null;
  }
}

let supplyCache: {
  at: number;
  data: {
    mint: string;
    decimals: number;
    amount: string;
    circulating: number;
    circulatingString: string;
    total: number;
    totalString: string;
    source: string;
    at: string;
  };
} | null = null;

/** On-chain SPL supply. Burns already excluded. Public for CMC / Dexscreener. */
export async function getGbuxSupply() {
  const now = Date.now();
  if (supplyCache && now - supplyCache.at < 30_000) return supplyCache.data;
  const rpcs = [process.env.SOLANA_RPC_URL, "https://api.mainnet-beta.solana.com"].filter(Boolean);
  let last = "getTokenSupply failed";
  for (const rpc of [...new Set(rpcs)]) {
    try {
      const r = await fetch(rpc, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "gbux-supply",
          method: "getTokenSupply",
          params: [GBUX_MINT_ADDRESS],
        }),
      });
      const text = await r.text();
      let j: any;
      try {
        j = JSON.parse(text);
      } catch {
        last = text.slice(0, 80);
        continue;
      }
      const v = j.result?.value;
      if (!v || v.amount == null) {
        last = j.error?.message || last;
        continue;
      }
      const ui = v.uiAmountString || String(v.uiAmount ?? "");
      const n = Number(ui);
      const data = {
        mint: GBUX_MINT_ADDRESS,
        decimals: Number(v.decimals ?? GBUX_DECIMALS),
        amount: String(v.amount),
        circulating: n,
        circulatingString: ui,
        total: n,
        totalString: ui,
        source: "solana-getTokenSupply",
        at: new Date().toISOString(),
      };
      supplyCache = { at: now, data };
      return data;
    } catch (e: any) {
      last = e.message || String(e);
    }
  }
  throw new Error(last);
}