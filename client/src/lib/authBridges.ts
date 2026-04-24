/**
 * authBridges — client-side helpers for the two Cloudflare Worker bridges
 * (Puter and Solana SIWS). The Workers mint Supabase sessions; this module
 * wraps the calls and hands the resulting tokens to `supabase.auth.setSession`.
 *
 * Everything here is browser-safe — no service role keys cross the wire.
 */
import { supabase } from './supabaseClient';

const API_BASE = (import.meta.env.VITE_GRUDGE_API_BASE as string) || 'https://grudge-studio.com';

export interface BridgeResult {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    grudge_id: string;
    puter_username?: string;
    wallet_address?: string;
  };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`${url} → ${res.status}: ${detail.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------- Puter bridge ---------------------------------------
export async function signInWithPuter(puterUsername: string, puterToken: string): Promise<BridgeResult> {
  const result = await postJson<BridgeResult>(`${API_BASE}/auth/puter-bridge`, {
    puterUsername,
    puterToken,
  });
  const { error } = await supabase.auth.setSession({
    access_token: result.access_token,
    refresh_token: result.refresh_token,
  });
  if (error) throw new Error(`supabase setSession failed: ${error.message}`);
  return result;
}

// ---------------------- Solana SIWS bridge --------------------------------
type SolanaSigner = {
  publicKey: { toBase58(): string };
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>;
};

function base58Encode(bytes: Uint8Array): string {
  // Minimal base58 encoder (no deps). Phantom/Solflare return a Uint8Array;
  // we turn it into the base58 string the Worker expects.
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  if (bytes.length === 0) return '';
  const digits: number[] = [0];
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let leading = 0;
  while (leading < bytes.length && bytes[leading] === 0) leading++;
  return '1'.repeat(leading) + digits.reverse().map((d) => ALPHABET[d]).join('');
}

export async function signInWithSolana(signer: SolanaSigner): Promise<BridgeResult> {
  const wallet = signer.publicKey.toBase58();

  // 1. Fetch nonce + message
  const nonceRes = await fetch(`${API_BASE}/auth/solana-nonce?wallet=${encodeURIComponent(wallet)}`, {
    method: 'GET',
    credentials: 'omit',
  });
  if (!nonceRes.ok) throw new Error(`nonce fetch failed: ${nonceRes.status}`);
  const { nonce, message } = (await nonceRes.json()) as { nonce: string; message: string };

  // 2. Sign with wallet
  const sigBytes = await signer.signMessage(new TextEncoder().encode(message));
  const signature = base58Encode(sigBytes);

  // 3. Hand to Worker, get Supabase session back
  const result = await postJson<BridgeResult>(`${API_BASE}/auth/solana-bridge`, {
    wallet,
    signature,
    nonce,
  });

  const { error } = await supabase.auth.setSession({
    access_token: result.access_token,
    refresh_token: result.refresh_token,
  });
  if (error) throw new Error(`supabase setSession failed: ${error.message}`);
  return result;
}
