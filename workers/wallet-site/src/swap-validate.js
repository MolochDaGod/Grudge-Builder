/** Server-side swap / mint checks. Do not trust the browser. */

const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const WSOL = "So11111111111111111111111111111111111111112";
export const HOUSE = "aUp3XZqAt27phQNEM7k5KiP6cL3ihyG7uEJuEADbEks";
const PLAY_IDS = new Set(["BUDZ", "PLAY", "PLAY-GBUX", "PLAY_GBUX", "PLAYBAG", "PLAY-BAG"]);

export function isSolAddress(s) {
  return B58.test(String(s || "").trim());
}

export function jupMint(mint) {
  const m = String(mint || "").trim();
  if (!m || m === "SOL") return WSOL;
  return m;
}

export function isSolMint(s) {
  const m = String(s || "").trim();
  if (!m) return false;
  if (PLAY_IDS.has(m.toUpperCase())) return false;
  if (m === "SOL" || m === WSOL) return true;
  return B58.test(m);
}

export function rawAmount(v) {
  const s = String(v ?? "").trim();
  if (!/^[1-9]\d{0,19}$/.test(s)) return { ok: false, error: "amount must be a positive integer of base units" };
  try {
    const n = BigInt(s);
    if (n <= 0n || n > 2n ** 64n - 1n) return { ok: false, error: "amount out of range" };
  } catch {
    return { ok: false, error: "amount invalid" };
  }
  return { ok: true, amount: s };
}

export function slippageBps(v) {
  if (v == null || v === "") return { ok: true, slippageBps: 100 };
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1 || n > 1500) return { ok: false, error: "slippageBps must be 1–1500" };
  return { ok: true, slippageBps: Math.floor(n) };
}

export function parseSwap(input) {
  const inRaw = String((input && input.inputMint) || "").trim();
  const outRaw = String((input && input.outputMint) || "").trim();
  if (PLAY_IDS.has(inRaw.toUpperCase()) || PLAY_IDS.has(outRaw.toUpperCase())) {
    return { ok: false, error: "Budz play GBUX is not a mint. Swap on-chain GBUX." };
  }
  if (!isSolMint(inRaw) || !isSolMint(outRaw)) return { ok: false, error: "invalid mint" };
  const inputMint = jupMint(inRaw);
  const outputMint = jupMint(outRaw);
  if (inputMint === outputMint) return { ok: false, error: "input and output must differ" };
  const amt = rawAmount(input && input.amount);
  if (!amt.ok) return amt;
  const sl = slippageBps(input && input.slippageBps);
  if (!sl.ok) return sl;
  let taker;
  if (input && input.taker) {
    const t = String(input.taker).trim();
    if (!isSolAddress(t)) return { ok: false, error: "invalid taker" };
    if (t === HOUSE) return { ok: false, error: "house vault is not a taker" };
    taker = t;
  }
  return { ok: true, inputMint, outputMint, amount: amt.amount, taker, slippageBps: sl.slippageBps };
}

export function parseExecute(body) {
  const tx = String((body && body.signedTransaction) || "").trim();
  const id = String((body && body.requestId) || "").trim();
  if (tx.length < 32 || tx.length > 16000) return { ok: false, error: "signedTransaction required" };
  if (!/^[A-Za-z0-9+/]+=*$/.test(tx)) return { ok: false, error: "signedTransaction must be base64" };
  if (!id || id.length > 200) return { ok: false, error: "requestId required" };
  return { ok: true, signedTransaction: tx, requestId: id };
}

export function parseMint(v) {
  const m = String(v || "").trim();
  if (PLAY_IDS.has(m.toUpperCase())) return { ok: false, error: "Budz is not a mint" };
  if (m === "SOL" || m === WSOL) return { ok: true, mint: WSOL };
  if (!B58.test(m)) return { ok: false, error: "invalid mint" };
  return { ok: true, mint: m };
}

export function rpcParamsOk(method, params) {
  if (!Array.isArray(params) || params.length > 4) return false;
  if (method === "getBalance" || method === "getAccountInfo") return isSolAddress(params[0]);
  if (method === "getTokenAccountsByOwner") return isSolAddress(params[0]);
  if (method === "getTokenAccountBalance") return isSolAddress(params[0]);
  if (method === "getMultipleAccounts") {
    return Array.isArray(params[0]) && params[0].length <= 100 && params[0].every(isSolAddress);
  }
  return true;
}
