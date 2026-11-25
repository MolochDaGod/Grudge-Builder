import { crossmintWalletService } from "./crossmintWallet";
import { parseSwap, jupMint as toJupMint } from "./swapValidate";

const JUP = (process.env.JUPITER_SWAP_URL || "https://lite-api.jup.ag/swap/v2").replace(/\/$/, "");

function jupHeaders() {
  const h: Record<string, string> = { accept: "application/json" };
  const key = process.env.JUPITER_API_KEY || "";
  if (key) h["x-api-key"] = key;
  return h;
}

export function jupMint(mint: string) {
  return toJupMint(mint);
}

export async function jupiterOrder(opts: {
  inputMint: string;
  outputMint: string;
  amount: string;
  taker?: string;
  slippageBps?: number;
}) {
  const parsed = parseSwap(opts);
  if (!parsed.ok) return { ok: false, status: 400, body: { error: parsed.error } };
  const q = new URLSearchParams({
    inputMint: parsed.inputMint,
    outputMint: parsed.outputMint,
    amount: parsed.amount,
    slippageBps: String(parsed.slippageBps),
  });
  if (parsed.taker) q.set("taker", parsed.taker);
  const r = await fetch(`${JUP}/order?${q}`, { headers: jupHeaders() });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok && Boolean(body.outAmount), status: r.status, body };
}

export async function jupiterExecute(signedTransaction: string, requestId: string) {
  const r = await fetch(`${JUP}/execute`, {
    method: "POST",
    headers: { ...jupHeaders(), "content-type": "application/json" },
    body: JSON.stringify({ signedTransaction, requestId }),
  });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok && Boolean(body.signature), status: r.status, body };
}

export async function swapPlayWallet(opts: {
  playAddress: string;
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
}) {
  const parsed = parseSwap({ ...opts, taker: opts.playAddress });
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const order = await jupiterOrder(parsed);
  const tx = order.body?.transaction;
  if (!order.ok || !tx) {
    return {
      ok: false,
      error: order.body?.errorMessage || order.body?.error || "No Jupiter route",
      order: order.body,
    };
  }
  const sent = await crossmintWalletService.submitSerializedSolanaTx(opts.playAddress, tx);
  if (!sent.success) {
    return { ok: false, error: sent.error || "Crossmint sign failed", order: order.body };
  }
  return {
    ok: true,
    signature: sent.swapTx,
    pending: sent.pending || false,
    inAmount: order.body.inAmount,
    outAmount: order.body.outAmount,
    requestId: order.body.requestId,
  };
}
