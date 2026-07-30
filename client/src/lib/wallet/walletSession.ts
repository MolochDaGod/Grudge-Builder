/**
 * Opt-in wallet session — never auto-connect on app boot.
 * Solana links go through Railway /api/wallet/link/* (SSOT).
 * EVM sessions are browser-local until EVM personal_sign verify ships on Railway.
 */

const EVM_SESSION_KEY = "grudge_evm_wallet_session";

export interface EvmWalletSession {
  address: string;
  providerName: string;
  rdns: string;
  uuid: string;
  connectedAt: number;
}

export function saveEvmSession(session: EvmWalletSession): void {
  try {
    sessionStorage.setItem(EVM_SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export function loadEvmSession(): EvmWalletSession | null {
  try {
    const raw = sessionStorage.getItem(EVM_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EvmWalletSession;
  } catch {
    return null;
  }
}

export function clearEvmSession(): void {
  try {
    sessionStorage.removeItem(EVM_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
