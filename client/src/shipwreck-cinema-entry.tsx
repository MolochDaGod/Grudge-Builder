/**
 * Standalone cinema entry — does NOT load App.tsx / Sentry / portal universe.
 * Open: http://127.0.0.1:5173/shipwreck-cinema.html
 */
import * as THREE_NS from 'three';
import { createRoot } from 'react-dom/client';
import { LeviathanOceanCinema, LEVIATHAN_CINEMA_SKIPPABLE_AFTER_SEC, STAGE_ID } from '@/island3d/intro/LeviathanOceanCinema';

// Mutable THREE global (some loaders expect it)
const THREE_GLOBAL: Record<string, unknown> = Object.create(null);
for (const key of Object.keys(THREE_NS)) {
  THREE_GLOBAL[key] = (THREE_NS as Record<string, unknown>)[key];
}
(window as unknown as { THREE: unknown }).THREE = THREE_GLOBAL;

function showError(err: unknown) {
  const box = document.getElementById('boot-err');
  const msg = document.getElementById('boot-err-msg');
  if (box) box.style.display = 'block';
  if (msg) {
    msg.textContent = err instanceof Error ? `${err.message}\n\n${err.stack || ''}` : String(err);
  }
  console.error('[shipwreck-cinema]', err);
}

window.addEventListener('error', (e) => showError(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => showError(e.reason));

function App() {
  // Inline minimal UI without lucide / wouter / full CSS stack
  const hostRef = { current: null as HTMLDivElement | null };
  const statusRef = { current: null as HTMLDivElement | null };
  const barRef = { current: null as HTMLDivElement | null };
  const capRef = { current: null as HTMLDivElement | null };
  const subRef = { current: null as HTMLDivElement | null };

  // Use effect via createRoot tree
  return null;
}

// Mount imperative (simplest, least failure surface)
const rootEl = document.getElementById('root');
if (!rootEl) {
  showError(new Error('#root missing'));
} else {
  rootEl.innerHTML = `
    <div style="position:fixed;inset:0;background:#000">
      <div id="cin-host" style="position:absolute;inset:0"></div>
      <div id="cin-top" style="position:absolute;top:12px;left:12px;right:12px;z-index:10;display:flex;justify-content:space-between;pointer-events:none">
        <div style="pointer-events:auto;background:rgba(0,0,0,.8);border:1px solid #164e63;border-radius:12px;padding:10px 14px;max-width:420px">
          <div style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#22d3ee">Standalone cinema · full systems</div>
          <div style="font-size:14px;font-weight:600;margin-top:2px" id="cin-cap">LOADING…</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:4px" id="cin-sub">startingfalls · leviathan · stage UUIDs</div>
          <div style="font-size:10px;color:#64748b;margin-top:6px;font-family:ui-monospace,monospace" id="cin-meta">${STAGE_ID}</div>
        </div>
        <button id="cin-skip" type="button" disabled style="pointer-events:auto;opacity:.4;background:#065f46;color:#fff;border:1px solid #10b981;border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer">Skip</button>
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;height:4px;background:#111;z-index:10">
        <div id="cin-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#0891b2,#f59e0b)"></div>
      </div>
      <div id="cin-load" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:5;background:rgba(0,0,0,.75);flex-direction:column;gap:12px">
        <div style="width:36px;height:36px;border:2px solid #22d3ee;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite"></div>
        <div style="font-size:13px;color:#a5f3fc">Loading cinema assets…</div>
      </div>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  `;

  const host = document.getElementById('cin-host') as HTMLDivElement;
  const cap = document.getElementById('cin-cap') as HTMLDivElement;
  const sub = document.getElementById('cin-sub') as HTMLDivElement;
  const bar = document.getElementById('cin-bar') as HTMLDivElement;
  const load = document.getElementById('cin-load') as HTMLDivElement;
  const skip = document.getElementById('cin-skip') as HTMLButtonElement;
  const meta = document.getElementById('cin-meta') as HTMLDivElement;

  try {
    for (const k of [
      'grudge_shipwreck_intro_seen_v4',
      'grudge_shipwreck_intro_seen_v7',
      'grudge_shipwreck_intro_seen_v8',
      'grudge_shipwreck_intro_seen_v9',
      'grudge_shipwreck_intro_seen_v10',
      'grudge_storm_intro_seen_v1',
      'grudge_island3d_intro_options_v9',
    ]) {
      sessionStorage.removeItem(k);
    }
  } catch { /* */ }

  let skippable = false;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    cinema?.dispose();
    window.location.href = '/tutorial?from=shipwreck-intro';
  };

  let cinema: LeviathanOceanCinema | null = null;
  try {
    cinema = new LeviathanOceanCinema(host, {
      onCaption: (c, s) => {
        if (cap) cap.textContent = c || '…';
        if (sub) sub.textContent = s || '';
      },
      onProgress: (u, t) => {
        if (bar) bar.style.width = `${Math.round(u * 100)}%`;
        if (meta) meta.textContent = `${STAGE_ID} · ${t.toFixed(1)}s`;
        if (t >= LEVIATHAN_CINEMA_SKIPPABLE_AFTER_SEC && !skippable) {
          skippable = true;
          skip.disabled = false;
          skip.style.opacity = '1';
        }
      },
      onReady: () => {
        if (load) load.style.display = 'none';
        if (cap && cap.textContent === 'LOADING…') cap.textContent = 'READY';
      },
      onComplete: () => finish(),
    });
  } catch (e) {
    showError(e);
  }

  skip.onclick = () => {
    if (!skippable) return;
    cinema?.skip();
    finish();
  };

  window.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') && skippable) {
      e.preventDefault();
      cinema?.skip();
      finish();
    }
  });
}

// silence unused
void App;
void createRoot;
