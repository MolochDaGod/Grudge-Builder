/**
 * Mounts a production UI pack from ui.grudge-studio.com under the interactive HUD.
 * Decorative chrome — ModePlayHUD keeps controls.
 */
import { useEffect, useRef } from 'react';
import {
  loadUiPack,
  ensureCraftpixRpgCss,
  type GrudgeGameUIInstance,
} from '@/lib/uiKit/loadGrudgeGameUI';
import { PACK_FOR_SURFACE, type UiStudioPackId } from '@/lib/uiKit/uiStudioConfig';
import '@/styles/ui-kit-production.css';

export interface GrudgeGameUiLayerProps {
  packId?: UiStudioPackId | string;
  surface?: keyof typeof PACK_FOR_SURFACE;
  state?: string;
  bind?: Record<string, Record<string, unknown>>;
  className?: string;
  enabled?: boolean;
}

export function GrudgeGameUiLayer({
  packId,
  surface = 'homeIsland',
  state = 'island',
  bind,
  className = '',
  enabled = true,
}: GrudgeGameUiLayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const uiRef = useRef<GrudgeGameUIInstance | null>(null);
  const resolvedPack = packId || PACK_FOR_SURFACE[surface];

  useEffect(() => {
    ensureCraftpixRpgCss();
  }, []);

  useEffect(() => {
    if (!enabled || !hostRef.current) return;
    let cancelled = false;
    const el = hostRef.current;

    (async () => {
      try {
        const ui = await loadUiPack(resolvedPack);
        if (cancelled) {
          ui.unmount();
          return;
        }
        ui.mount(el, { scale: true });
        ui.setState(state);
        if (bind) ui.bindData(bind);
        uiRef.current = ui;
      } catch (e) {
        console.warn('[GrudgeGameUiLayer] pack load failed — ModePlayHUD still works', e);
      }
    })();

    return () => {
      cancelled = true;
      uiRef.current?.unmount();
      uiRef.current = null;
      if (el) el.innerHTML = '';
    };
    // bind intentionally omitted from deps — updated in separate effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedPack, enabled]);

  useEffect(() => {
    uiRef.current?.setState(state);
  }, [state]);

  useEffect(() => {
    if (bind && uiRef.current) uiRef.current.bindData(bind);
  }, [bind]);

  if (!enabled) return null;

  return (
    <div
      ref={hostRef}
      className={`uikit-pack-layer ${className}`}
      aria-hidden
      data-ui-pack={resolvedPack}
      data-ui-state={state}
    />
  );
}

export default GrudgeGameUiLayer;
