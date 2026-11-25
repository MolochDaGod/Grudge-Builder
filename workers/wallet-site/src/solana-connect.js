/**
 * Single Solana connect for wallet.grudge-studio.com
 *
 * Wallet Standard (`wallet-standard:register-wallet` / `app-ready`) first.
 * Then legacy window.phantom / solflare / backpack.
 * SIWS → POST /api/wallet/link/challenge + /confirm only.
 *
 * Not used here: MetaMask, WalletConnect EVM, seed paste, Create Gruda,
 * /api/auth/phantom/nonce (that's ID-gateway login), trader vault, aUp3.
 */
export const SOL_PROVIDERS = ["phantom", "solflare", "backpack"];
export const HOUSE = "aUp3XZqAt27phQNEM7k5KiP6cL3ihyG7uEJuEADbEks";
export const LINK_CAP = 8;

const ALPH = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function bytesToB58(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  let hex = Array.from(u8).map((b) => b.toString(16).padStart(2, "0")).join("");
  let n = BigInt("0x" + (hex || "00"));
  let out = "";
  while (n > 0n) {
    out = ALPH[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of u8) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out || "1";
}

function providerId(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("phantom")) return "phantom";
  if (n.includes("solflare")) return "solflare";
  if (n.includes("backpack")) return "backpack";
  return "other";
}

function feature(wallet, key) {
  const f = wallet && wallet.features && wallet.features[key];
  return f || null;
}

function isSolanaWallet(wallet) {
  const chains = wallet && wallet.chains;
  if (!chains || !chains.length) return true;
  return chains.some((c) => String(c).startsWith("solana:"));
}

const standardWallets = [];

function registerStandardWallet(wallet) {
  if (!wallet || !wallet.name || !isSolanaWallet(wallet)) return;
  if (standardWallets.some((w) => w.name === wallet.name)) return;
  if (!feature(wallet, "standard:connect") && !feature(wallet, "solana:signMessage")) return;
  standardWallets.push(wallet);
}

export function bootWalletStandard() {
  if (typeof window === "undefined" || window.__GRUDA_STD_BOOTED) return standardWallets;
  window.__GRUDA_STD_BOOTED = true;
  try {
    window.addEventListener("wallet-standard:register-wallet", (ev) => {
      try {
        ev.detail.register(registerStandardWallet);
      } catch (_) {}
    });
    window.dispatchEvent(
      new CustomEvent("wallet-standard:app-ready", {
        detail: { register: registerStandardWallet },
      }),
    );
  } catch (_) {}
  return standardWallets;
}

function legacyAdapter(id) {
  const w = typeof window === "undefined" ? {} : window;
  if (id === "phantom") return w.phantom?.solana || (w.solana?.isPhantom ? w.solana : null);
  if (id === "solflare") return w.solflare || w.solflareSolana;
  if (id === "backpack") return w.backpack || w.xnft?.solana;
  return null;
}

export function listSolanaProviders() {
  bootWalletStandard();
  const found = [];
  const seen = new Set();
  for (const w of standardWallets) {
    const id = providerId(w.name);
    seen.add(id);
    found.push({
      id,
      name: w.name,
      available: true,
      standard: w,
      legacy: null,
    });
  }
  for (const id of SOL_PROVIDERS) {
    if (seen.has(id)) continue;
    const leg = legacyAdapter(id);
    found.push({
      id,
      name: id[0].toUpperCase() + id.slice(1),
      available: Boolean(leg),
      standard: null,
      legacy: leg,
    });
  }
  return found;
}

export async function connectSolana(id) {
  const row = listSolanaProviders().find((p) => p.id === id) ||
    listSolanaProviders().find((p) => p.standard && providerId(p.standard.name) === id);
  if (!row) throw new Error("unknown provider");
  const std = row.standard;
  const connectFeat = std && feature(std, "standard:connect");
  if (connectFeat && typeof connectFeat.connect === "function") {
    const acc = await connectFeat.connect();
    const a = acc?.accounts?.[0];
    const pk = a?.address || a?.publicKey;
    if (!pk) throw new Error("no account");
    return { provider: row.id, address: String(pk), handle: std, account: a };
  }
  const a = row.legacy;
  if (!a) throw new Error(id + " not installed");
  const res = await a.connect();
  const pk = res?.publicKey || a.publicKey;
  const address = typeof pk?.toBase58 === "function" ? pk.toBase58() : String(pk);
  if (!address || address.length < 32) throw new Error("connect failed");
  return { provider: row.id, address, handle: a, account: null };
}

async function signBytes(handle, message, account) {
  const enc = new TextEncoder().encode(message);
  const signFeat = handle && feature(handle, "solana:signMessage");
  if (signFeat && typeof signFeat.signMessage === "function") {
    const out = await signFeat.signMessage({ account, message: enc });
    const row = Array.isArray(out) ? out[0] : out;
    const sig = row?.signature || row;
    if (typeof sig === "string") return sig;
    return bytesToB58(sig);
  }
  if (handle?.signMessage) {
    const out = await handle.signMessage(enc, "utf8");
    const sig = out?.signature || out;
    if (typeof sig === "string") return sig;
    return bytesToB58(sig);
  }
  throw new Error("wallet cannot signMessage");
}

export async function linkSolanaToAccount({
  provider,
  apiBase = "",
  headers = {},
  linkedCount = 0,
}) {
  if (linkedCount >= LINK_CAP) throw new Error("Maximum 8 linked wallets on this Grudge ID");
  const { address, handle, account } = await connectSolana(provider);
  if (address === HOUSE) throw new Error("House wallet cannot be linked");
  const origin = location.origin;
  const ch = await fetch(apiBase + "/api/wallet/link/challenge", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ walletAddress: address, origin, purpose: "link" }),
  }).then((r) => r.json());
  if (!ch?.message) throw new Error(ch.error || "challenge failed");
  const signature = await signBytes(handle, ch.message, account);
  const label = "Wallet " + (linkedCount + 1);
  const done = await fetch(apiBase + "/api/wallet/link/confirm", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      walletAddress: address,
      message: ch.message,
      signature,
      provider,
      label,
    }),
  }).then((r) => r.json());
  if (!done?.success && !done?.linkedWallet) throw new Error(done.error || "link failed");
  return { address, provider, linked: done.linkedWallet || done };
}
