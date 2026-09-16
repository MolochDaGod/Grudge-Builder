/**
 * Single Solana connect for wallet.grudge-studio.com
 * Wallet Standard first, then window.phantom / solflare / backpack.
 * SIWS → POST /api/wallet/link/challenge + /confirm
 * No MetaMask, WalletConnect EVM, seed paste, or Create Gruda here.
 */
export const SOL_PROVIDERS = ["phantom", "solflare", "backpack"];

function bytesToB58(bytes) {
  const ALPH = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  let n = BigInt("0x" + (hex || "00"));
  let out = "";
  while (n > 0n) {
    out = ALPH[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out || "1";
}

function legacyAdapter(id) {
  const w = typeof window === "undefined" ? {} : window;
  if (id === "phantom") return w.phantom?.solana || (w.solana?.isPhantom ? w.solana : null);
  if (id === "solflare") return w.solflare || w.solflareSolana;
  if (id === "backpack") return w.backpack || w.xnft?.solana;
  return null;
}

export function listSolanaProviders() {
  const w = typeof window === "undefined" ? {} : window;
  const std = w.navigator?.wallets?.get?.() || [];
  const found = [];
  for (const id of SOL_PROVIDERS) {
    const stdHit = std.find((x) => String(x?.name || "").toLowerCase().includes(id));
    const leg = legacyAdapter(id);
    found.push({
      id,
      name: id[0].toUpperCase() + id.slice(1),
      available: Boolean(stdHit || leg),
      standard: stdHit || null,
      legacy: leg,
    });
  }
  return found;
}

export async function connectSolana(id) {
  const row = listSolanaProviders().find((p) => p.id === id);
  if (!row) throw new Error("unknown provider");
  if (row.standard?.features?.["standard:connect"]) {
    const acc = await row.standard.features["standard:connect"].connect();
    const pk = acc?.accounts?.[0]?.address || acc?.accounts?.[0]?.publicKey;
    if (!pk) throw new Error("no account");
    return { provider: id, address: String(pk), handle: row.standard };
  }
  const a = row.legacy;
  if (!a) throw new Error(id + " not installed");
  const res = await a.connect();
  const pk = res?.publicKey || a.publicKey;
  const address = typeof pk?.toBase58 === "function" ? pk.toBase58() : String(pk);
  if (!address || address.length < 32) throw new Error("connect failed");
  return { provider: id, address, handle: a };
}

async function signBytes(handle, message) {
  const enc = new TextEncoder().encode(message);
  if (handle?.features?.["solana:signMessage"]) {
    const [out] = await handle.features["solana:signMessage"].signMessage({ message: enc });
    return bytesToB58(out.signature);
  }
  if (handle?.signMessage) {
    const out = await handle.signMessage(enc, "utf8");
    const sig = out?.signature || out;
    if (typeof sig === "string") return sig;
    return bytesToB58(sig);
  }
  throw new Error("wallet cannot signMessage");
}

export async function linkSolanaToAccount({ provider, apiBase = "", headers = {} }) {
  const { address, handle } = await connectSolana(provider);
  const origin = location.origin;
  const ch = await fetch(apiBase + "/api/wallet/link/challenge", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ walletAddress: address, origin }),
  }).then((r) => r.json());
  if (!ch?.message) throw new Error(ch.error || "challenge failed");
  const signature = await signBytes(handle, ch.message);
  const done = await fetch(apiBase + "/api/wallet/link/confirm", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      walletAddress: address,
      message: ch.message,
      signature,
      provider,
      label: provider,
    }),
  }).then((r) => r.json());
  if (!done?.success && !done?.linkedWallet) throw new Error(done.error || "link failed");
  return { address, provider, linked: done.linkedWallet || done };
}
