/**
 * EIP-6963 Multi Injected Provider Discovery (EVM).
 *
 * Approved multi-wallet discovery — never fight over window.ethereum.
 * Call discoverEip6963Providers() only after the user opens "Connect wallet".
 *
 * Spec: https://eips.ethereum.org/EIPS/eip-6963
 * MetaMask guidance: prefer 6963; use window.ethereum only as fallback.
 */

export interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

export interface Eip6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface Eip6963ProviderDetail {
  info: Eip6963ProviderInfo;
  provider: Eip1193Provider;
}

export interface DiscoveredEvmWallet {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
  /** Never assign this onto window — use only via request() */
  provider: Eip1193Provider;
  source: "eip6963" | "legacy-ethereum";
}

const ANNOUNCE = "eip6963:announceProvider";
const REQUEST = "eip6963:requestProvider";

/**
 * Discover injected EVM wallets via EIP-6963 (opt-in).
 * Safe to call repeatedly; does not redefine window.ethereum.
 */
export function discoverEip6963Providers(timeoutMs = 120): Promise<DiscoveredEvmWallet[]> {
  if (typeof window === "undefined") return Promise.resolve([]);

  const byUuid = new Map<string, DiscoveredEvmWallet>();

  const onAnnounce = (event: Event) => {
    const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail;
    if (!detail?.info?.uuid || !detail.provider) return;
    byUuid.set(detail.info.uuid, {
      uuid: detail.info.uuid,
      name: detail.info.name || "Wallet",
      icon: detail.info.icon || "",
      rdns: detail.info.rdns || "",
      provider: detail.provider,
      source: "eip6963",
    });
  };

  window.addEventListener(ANNOUNCE, onAnnounce as EventListener);
  // Request announcements from wallets already injected
  window.dispatchEvent(new Event(REQUEST));

  return new Promise((resolve) => {
    window.setTimeout(() => {
      window.removeEventListener(ANNOUNCE, onAnnounce as EventListener);

      // Fallback only if nothing announced — single legacy provider, never overwrite
      if (byUuid.size === 0) {
        const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
        if (eth?.request) {
          byUuid.set("legacy-window-ethereum", {
            uuid: "legacy-window-ethereum",
            name: "Browser wallet",
            icon: "",
            rdns: "legacy.ethereum",
            provider: eth,
            source: "legacy-ethereum",
          });
        }
      }

      resolve(Array.from(byUuid.values()));
    }, timeoutMs);
  });
}

/** eth_requestAccounts — user must click; never auto-call on page load. */
export async function requestEvmAccounts(provider: Eip1193Provider): Promise<string[]> {
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  return Array.isArray(accounts) ? accounts.filter(Boolean) : [];
}

/** personal_sign link challenge (account must already be authorized). */
export async function personalSign(
  provider: Eip1193Provider,
  message: string,
  address: string,
): Promise<string> {
  const hex =
    "0x" +
    Array.from(new TextEncoder().encode(message))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  const sig = await provider.request({
    method: "personal_sign",
    params: [hex, address],
  });
  return String(sig);
}

/** Map EIP-6963 rdns → Grudge linked provider label. */
export function rdnsToProviderLabel(rdns: string): string {
  const r = (rdns || "").toLowerCase();
  if (r.includes("metamask")) return "metamask";
  if (r.includes("binance") || r.includes("bnb")) return "binance";
  if (r.includes("coinbase")) return "coinbase";
  if (r.includes("brave")) return "brave";
  if (r.includes("okx")) return "okx";
  if (r.includes("rabby")) return "rabby";
  return "injected_evm";
}
