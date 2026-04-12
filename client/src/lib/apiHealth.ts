/**
 * API Health Check — detects backend unavailability and provides status.
 *
 * Checks api.grudge-studio.com (via Vercel proxy) on app load and periodically.
 * Exports a reactive status that UI components can subscribe to.
 *
 * Usage:
 *   import { apiHealth, checkApiHealth } from '@/lib/apiHealth';
 *   if (!apiHealth.isOnline) showBanner("Backend offline — read-only mode");
 */

export interface ApiHealthStatus {
  isOnline: boolean;
  lastCheck: number;
  latencyMs: number | null;
  error: string | null;
}

let _status: ApiHealthStatus = {
  isOnline: true, // optimistic default
  lastCheck: 0,
  latencyMs: null,
  error: null,
};

type HealthListener = (status: ApiHealthStatus) => void;
const listeners: HealthListener[] = [];

/** Subscribe to health status changes */
export function onHealthChange(cb: HealthListener): () => void {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function notify() {
  for (const cb of listeners) {
    try { cb(_status); } catch { /* swallow */ }
  }
}

/** Check API health right now */
export async function checkApiHealth(): Promise<ApiHealthStatus> {
  const start = Date.now();
  try {
    const res = await fetch("/api/game/health", {
      method: "GET",
      signal: AbortSignal.timeout(8000),
    });
    const latencyMs = Date.now() - start;
    _status = {
      isOnline: res.ok,
      lastCheck: Date.now(),
      latencyMs,
      error: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (err: any) {
    _status = {
      isOnline: false,
      lastCheck: Date.now(),
      latencyMs: null,
      error: err?.message || "Network error",
    };
  }
  notify();
  return _status;
}

/** Get current status (synchronous) */
export function getApiHealth(): ApiHealthStatus {
  return { ..._status };
}

// ── Auto-check on load + every 60s ──────────────────────────────────────────

let _intervalId: ReturnType<typeof setInterval> | null = null;
const CHECK_INTERVAL_MS = 60_000;

export function startHealthMonitor(): void {
  if (_intervalId) return;
  // Initial check after 2s (let the app hydrate first)
  setTimeout(() => checkApiHealth(), 2000);
  _intervalId = setInterval(() => checkApiHealth(), CHECK_INTERVAL_MS);
}

export function stopHealthMonitor(): void {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}

// Auto-start in browser
if (typeof window !== "undefined") {
  startHealthMonitor();
}
