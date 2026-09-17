import { crossmintWalletService } from "./crossmintWallet";

const WSOL = "So11111111111111111111111111111111111111112";
const JUP = (process.env.JUPITER_SWAP_URL || "https://lite-api.jup.ag/swap/v2").replace(/\/$/, "");

function jupHeaders() {
  const h: Record<string, string> = { accept: "application/json" };
  const key = process.env.JUPITER_API_KEY || "";
  if (key) h["x-api-key"] = key;
  return h;
}

export function jupMint(mint: string) {
  const m = String(mint || "");
  if (!m || m === "SOL") return WSOL;
  return m;
}

export async function jupiterOrder(opts: {
  inputMint: string;
  outputMint: string;
  amount: string;
  taker?: string;
  slippageBps?: number;
}) {
  const q = new URLSearchParams({
    inputMint: jupMint(opts.inputMint),
    outputMint: jupMint(opts.outputMint),
    amount: String(opts.amount),
    slippageBps: String(opts.slippageBps || 100),
  });
  if (opts.taker) q.set("taker", opts.taker);
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
  const order = await jupiterOrder({
    inputMint: opts.inputMint,
    outputMint: opts.outputMint,
    amount: opts.amount,
    taker: opts.playAddress,
    slippageBps: opts.slippageBps,
  });
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
