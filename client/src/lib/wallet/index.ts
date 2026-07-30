/**
 * Grudge wallet facade — opt-in connect only.
 *
 * Layers (SSOT):
 *   1. Grudge ID JWT  → identity (id.grudge-studio.com / Railway)
 *   2. Solana link    → /api/wallet/link/* (Phantom Embedded | Solflare)
 *   3. EVM session    → EIP-6963 discover + eth_requestAccounts (no window.ethereum race)
 *
 * Never import this from main.tsx or App boot — only from wallet UI click handlers.
 */

export {
  discoverEip6963Providers,
  requestEvmAccounts,
  personalSign,
  rdnsToProviderLabel,
  type DiscoveredEvmWallet,
  type Eip1193Provider,
} from "./eip6963";

export {
  saveEvmSession,
  loadEvmSession,
  clearEvmSession,
  type EvmWalletSession,
} from "./walletSession";

export async function connectEvmWallet(
  wallet: import("./eip6963").DiscoveredEvmWallet,
): Promise<{ address: string; providerName: string; rdns: string }> {
  const accounts = await requestEvmAccounts(wallet.provider);
  const address = accounts[0];
  if (!address) throw new Error("No accounts returned — approve the wallet prompt");

  const { saveEvmSession } = await import("./walletSession");
  saveEvmSession({
    address,
    providerName: wallet.name,
    rdns: wallet.rdns,
    uuid: wallet.uuid,
    connectedAt: Date.now(),
  });

  return { address, providerName: wallet.name, rdns: wallet.rdns };
}
