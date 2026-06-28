/**
 * Read on-chain SOL + SPL balances for linked third-party wallets.
 */
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { GBUX_MINT_ADDRESS } from "./gbuxSolana";

export const USDT_MINT_ADDRESS =
  process.env.USDT_MINT_ADDRESS || "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

const GBUX_DECIMALS = Number(process.env.GBUX_DECIMALS || 6);
const USDT_DECIMALS = Number(process.env.USDT_DECIMALS || 6);

function getConnection(): Connection | null {
  const rpc = process.env.SOLANA_RPC_URL;
  if (!rpc) return null;
  return new Connection(rpc, "confirmed");
}

async function splBalance(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey,
  decimals: number,
): Promise<number | null> {
  try {
    const ata = await getAssociatedTokenAddress(mint, owner);
    const account = await getAccount(connection, ata);
    return Number(account.amount) / 10 ** decimals;
  } catch {
    return 0;
  }
}

export interface WalletOnChainBalances {
  walletAddress: string;
  sol: number | null;
  gbux: number | null;
  usdt: number | null;
  rpcConfigured: boolean;
}

export async function getWalletOnChainBalances(
  walletAddress: string,
): Promise<WalletOnChainBalances> {
  const connection = getConnection();
  if (!connection) {
    return {
      walletAddress,
      sol: null,
      gbux: null,
      usdt: null,
      rpcConfigured: false,
    };
  }

  const owner = new PublicKey(walletAddress);
  const [lamports, gbux, usdt] = await Promise.all([
    connection.getBalance(owner).then((b) => b / LAMPORTS_PER_SOL),
    splBalance(connection, owner, new PublicKey(GBUX_MINT_ADDRESS), GBUX_DECIMALS),
    splBalance(connection, owner, new PublicKey(USDT_MINT_ADDRESS), USDT_DECIMALS),
  ]);

  return {
    walletAddress,
    sol: lamports,
    gbux,
    usdt,
    rpcConfigured: true,
  };
}