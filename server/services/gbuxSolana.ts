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

function getTreasuryKeypair(): Keypair | null {
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