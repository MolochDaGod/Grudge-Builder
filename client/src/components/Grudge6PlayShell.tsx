/**
 * Grudge6PlayShell — docks the grudge6.grudge-studio.com game UI onto Warlords play surfaces.
 *
 * Opens HUD / Main Panel / Spellbook / Character / Inventory from the canonical
 * Grudge6 game lab (BASE_PATH=/game/). Prefers same-tab overlay iframe when the
 * lab allows frame-ancestors; falls back to popup / new tab if X-Frame blocks.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen, User, LayoutPanelLeft, Backpack, Crosshair, ExternalLink, X, Users,
} from 'lucide-react';
import { GRUDGE6_GAME_URL } from '@/lib/grudgeConfig';
import { FLEET_URLS } from '@shared/fleet';

export type Grudge6PanelId =
  | 'hud'
  | 'panel'
  | 'spellbook'
  | 'character'
  | 'inventory'
  | 'world';

const PANELS: {
  id: Grudge6PanelId;
  label: string;
  path: string;
  hotkey: string;
  Icon: typeof BookOpen;
  hint: string;
}[] = [
  {
    id: 'hud',
    label: 'HUD',
    path: '/hud',
    hotkey: 'H',
    Icon: Crosshair,
    hint: 'Grudge6 Game HUD — unit frames, hotbars, cast bar',
  },
  {
    id: 'panel',
    label: 'Main Panel',
    path: '/panel',
    hotkey: 'P',
    Icon: LayoutPanelLeft,
    hint: 'Main panel — stats, mastery, gear, quests',
  },
  {
    id: 'spellbook',
    label: 'Spellbook',
    path: '/spellbook',
    hotkey: 'B',
    Icon: BookOpen,
    hint: 'Spellbook — abilities, weapons, spellcraft',
  },
  {
    id: 'character',
    label: 'Character',
    path: '/character',
    hotkey: 'C',
    Icon: User,
    hint: 'Character window — race, class, loadout',
  },
  {
    id: 'inventory',
    label: 'Inventory',
    path: '/inventory',
    hotkey: 'I',
    Icon: Backpack,
    hint: 'Inventory & quest bag',
  },
];

function panelUrl(path: string, characterId?: string | null): string {
  const base = GRUDGE6_GAME_URL.replace(/\/$/, '');
  const u = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  u.searchParams.set('embed', '1');
  u.searchParams.set('from', 'warlords');
  if (characterId) u.searchParams.set('characterId', characterId);
  return u.toString();
}

interface Grudge6PlayShellProps {
  characterId?: string | null;
  characterName?: string;
  /** Compact dock only (default true on island-3d) */
  compact?: boolean;
  className?: string;
}

export function Grudge6PlayShell({
  characterId,
  characterName,
  compact = true,
  className = '',
}: Grudge6PlayShellProps) {
  const [openId, setOpenId] = useState<Grudge6PanelId | null>(null);
  const [iframeBlocked, setIframeBlocked] = useState(false);

  const openPanel = useCallback((id: Grudge6PanelId) => {
    setOpenId((prev) => (prev === id ? null : id));
    setIframeBlocked(false);
  }, []);

  const closePanel = useCallback(() => setOpenId(null), []);

  // Hotkeys H/P/B/C/I when not typing in an input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'Escape') {
        closePanel();
        return;
      }
      const key = e.key.toUpperCase();
      const hit = PANELS.find((p) => p.hotkey === key);
      if (hit) {
        e.preventDefault();
        openPanel(hit.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closePanel, openPanel]);

  const active = openId ? PANELS.find((p) => p.id === openId) : null;
  const activeUrl = active ? panelUrl(active.path, characterId) : null;

  const openExternal = (path: string) => {
    window.open(panelUrl(path, characterId), 'grudge6-panel', 'noopener,noreferrer');
  };

  const openPopup = (path: string) => {
    const w = 1100;
    const h = 720;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    window.open(
      panelUrl(path, characterId),
      `grudge6-${path.replace(/\//g, '')}`,
      `popup=yes,width=${w},height=${h},left=${left},top=${top}`,
    );
  };

  return (
    <div className={`pointer-events-none ${className}`}>
      {/* Dock — bottom-right above truth badge */}
      <div className="pointer-events-auto fixed bottom-20 right-3 z-[90] flex flex-col items-end gap-1.5">
        {!compact && characterName && (
          <div className="text-[10px] text-amber-200/80 bg-black/70 border border-amber-700/40 rounded-lg px-2 py-1 max-w-[12rem] truncate">
            {characterName}
          </div>
        )}
        <div className="flex flex-col gap-1 bg-black/80 backdrop-blur-md border border-amber-600/35 rounded-2xl p-1.5 shadow-xl">
          <div className="px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-amber-500/90 font-semibold">
            Grudge6
          </div>
          {PANELS.map(({ id, label, path, hotkey, Icon, hint }) => (
            <button
              key={id}
              type="button"
              title={`${hint} (${hotkey})`}
              onClick={() => openPanel(id)}
              className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs transition-colors ${
                openId === id
                  ? 'bg-amber-600 text-black font-semibold'
                  : 'text-amber-100/90 hover:bg-amber-900/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="min-w-[4.5rem]">{label}</span>
              <kbd className="ml-auto text-[9px] opacity-60 font-mono">{hotkey}</kbd>
              <span
                role="button"
                tabIndex={-1}
                title="Open in popup"
                onClick={(e) => {
                  e.stopPropagation();
                  openPopup(path);
                }}
                className="opacity-50 hover:opacity-100"
              >
                <ExternalLink className="w-3 h-3" />
              </span>
            </button>
          ))}
          <a
            href={`${FLEET_URLS.gcs || 'https://character.grudge-studio.com'}?era=warlords`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-sky-200/90 hover:bg-sky-900/40"
            title="Grudge Character Studio — create / edit heroes"
          >
            <Users className="w-3.5 h-3.5" />
            <span>GCS Heroes</span>
            <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
          </a>
        </div>
      </div>

      {/* Full overlay iframe */}
      {active && activeUrl && (
        <div className="pointer-events-auto fixed inset-0 z-[200] flex flex-col">
          <button
            type="button"
            aria-label="Close panel"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={closePanel}
          />
          <div className="relative z-10 m-3 sm:m-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-amber-600/40 bg-slate-950 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-amber-800/40 bg-black/80 px-3 py-2 text-xs text-amber-100 shrink-0">
              <active.Icon className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">{active.label}</span>
              <span className="text-amber-200/50 hidden sm:inline">· grudge6.grudge-studio.com</span>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => openPopup(active.path)}
                className="text-amber-200/80 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Popup
              </button>
              <a
                href={activeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-200/80 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/5"
              >
                Open tab
              </a>
              <button
                type="button"
                onClick={closePanel}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {iframeBlocked ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center text-slate-300">
                <p className="text-sm text-amber-200">Grudge6 blocked iframe embedding (X-Frame-Options).</p>
                <p className="text-xs text-slate-500 max-w-md">
                  Use Popup or Open tab. After grudge6 allows frame-ancestors for client.grudge-studio.com, overlays work inline.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openPopup(active.path)}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 text-black text-xs font-semibold"
                  >
                    Open popup
                  </button>
                  <button
                    type="button"
                    onClick={() => openExternal(active.path)}
                    className="px-3 py-1.5 rounded-lg border border-amber-700/50 text-amber-100 text-xs"
                  >
                    Open tab
                  </button>
                </div>
              </div>
            ) : (
              <iframe
                title={`Grudge6 ${active.label}`}
                src={activeUrl}
                className="flex-1 w-full min-h-0 border-0 bg-black"
                allow="fullscreen; clipboard-read; clipboard-write"
                referrerPolicy="strict-origin-when-cross-origin"
                onLoad={(e) => {
                  // Cross-origin: cannot read contentDocument. Detect DENY via short timeout blank.
                  try {
                    const win = e.currentTarget.contentWindow;
                    if (!win) return;
                    // If blocked, some browsers leave about:blank
                    setTimeout(() => {
                      try {
                        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                        win.location.href;
                      } catch {
                        /* cross-origin OK */
                      }
                    }, 800);
                  } catch {
                    /* ignore */
                  }
                }}
                onError={() => setIframeBlocked(true)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Grudge6PlayShell;
