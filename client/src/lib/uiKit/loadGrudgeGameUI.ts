/**
 * Load GrudgeGameUI runtime from ui.grudge-studio.com and mount a pack.
 */
import {
  UI_STUDIO_ORIGIN,
  UI_STUDIO_RUNTIME,
  CRAFTPIX_RPG_CSS,
  type UiStudioPackId,
} from './uiStudioConfig';

export interface GrudgeGameUIInstance {
  pack: { theme?: string; comps?: unknown[]; meta?: Record<string, unknown> };
  mount: (el: HTMLElement, opts?: { scale?: boolean }) => GrudgeGameUIInstance;
  setState: (state: string) => GrudgeGameUIInstance;
  applyState: (state: string) => GrudgeGameUIInstance;
  bindData: (map: Record<string, Record<string, unknown>>) => GrudgeGameUIInstance;
  unmount: () => void;
  getStates: () => string[];
}

export interface GrudgeGameUIApi {
  baseUrl: string;
  list: (base?: string) => Promise<{ packs: Array<{ id: string; name: string }> }>;
  load: (packId: string, base?: string) => Promise<GrudgeGameUIInstance>;
  loadFromUrl: (url: string) => Promise<GrudgeGameUIInstance>;
}

declare global {
  interface Window {
    GrudgeGameUI?: GrudgeGameUIApi;
  }
}

let runtimePromise: Promise<GrudgeGameUIApi> | null = null;
let craftpixCssInjected = false;

export function ensureCraftpixRpgCss(doc: Document = document): void {
  if (craftpixCssInjected || doc.getElementById('ggui-craftpix-rpg-css')) {
    craftpixCssInjected = true;
    return;
  }
  const link = doc.createElement('link');
  link.id = 'ggui-craftpix-rpg-css';
  link.rel = 'stylesheet';
  link.href = CRAFTPIX_RPG_CSS;
  link.onerror = () => {
    link.href = `${UI_STUDIO_ORIGIN}/assets/index-C7sTteZB.css`;
  };
  doc.head.appendChild(link);
  doc.documentElement.classList.add('cpx-theme');
  craftpixCssInjected = true;
}

export function loadGrudgeGameUIRuntime(): Promise<GrudgeGameUIApi> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('GrudgeGameUI requires browser'));
  }
  if (window.GrudgeGameUI) return Promise.resolve(window.GrudgeGameUI);
  if (runtimePromise) return runtimePromise;

  runtimePromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-grudge-game-ui-runtime]',
    );
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.GrudgeGameUI) resolve(window.GrudgeGameUI);
        else reject(new Error('GrudgeGameUI missing after script load'));
      });
      existing.addEventListener('error', () => reject(new Error('Failed to load game-ui-runtime')));
      return;
    }
    const s = document.createElement('script');
    s.src = UI_STUDIO_RUNTIME;
    s.async = true;
    s.dataset.grudgeGameUiRuntime = '1';
    s.onload = () => {
      if (window.GrudgeGameUI) resolve(window.GrudgeGameUI);
      else reject(new Error('GrudgeGameUI global not found'));
    };
    s.onerror = () => {
      runtimePromise = null;
      reject(new Error(`Failed to load ${UI_STUDIO_RUNTIME}`));
    };
    document.head.appendChild(s);
  });

  return runtimePromise;
}

export async function loadUiPack(
  packId: UiStudioPackId | string,
  base = UI_STUDIO_ORIGIN,
): Promise<GrudgeGameUIInstance> {
  ensureCraftpixRpgCss();
  const api = await loadGrudgeGameUIRuntime();
  return api.load(packId, base);
}
