/**
 * MainPanelHost — embeds Warlords-era main panel from ui.grudge-studio.com.
 *
 * SSOT: https://ui.grudge-studio.com/main-panel.html?era=warlords
 * Equipment tab uses tactical-infinity paperdoll (portrait + gear slots).
 *
 * Usage:
 *   <MainPanelHost open={open} onClose={() => setOpen(false)} characterId={id} />
 *   Hotkey I or C-character menu can open this instead of InventoryModal.
 */
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

const UI_HOST = "https://ui.grudge-studio.com";

export type MainPanelTab =
  | "equipment"
  | "inventory"
  | "skills"
  | "craft"
  | "quests";

export interface MainPanelHostProps {
  open: boolean;
  onClose: () => void;
  /** Fleet character id for inspect / self loadout */
  characterId?: string | null;
  era?: "warlords";
  tab?: MainPanelTab;
  /** Inspect another unit (read-only paperdoll) */
  inspect?: {
    id?: string;
    name?: string;
    race?: string;
    meta?: string;
    portrait?: string;
    equipment?: Record<string, unknown>;
  } | null;
  /** Optional auth token for iframe GRUDGE_AUTH handshake */
  token?: string | null;
  className?: string;
}

export function buildMainPanelUrl(opts: {
  era?: string;
  tab?: string;
  embed?: boolean;
  characterId?: string | null;
}): string {
  const u = new URL(`${UI_HOST}/main-panel.html`);
  u.searchParams.set("era", opts.era || "warlords");
  if (opts.tab) u.searchParams.set("tab", opts.tab);
  if (opts.embed !== false) u.searchParams.set("embed", "1");
  if (opts.characterId) u.searchParams.set("characterId", opts.characterId);
  return u.toString();
}

export default function MainPanelHost({
  open,
  onClose,
  characterId,
  era = "warlords",
  tab = "equipment",
  inspect = null,
  token = null,
  className = "",
}: MainPanelHostProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const src = buildMainPanelUrl({
    era,
    tab,
    embed: true,
    characterId: inspect ? null : characterId,
  });

  // Handshake: auth + optional inspect entity
  useEffect(() => {
    if (!open) return;
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type !== "GRUDGE_MAIN_PANEL_READY" && e.data?.type !== "GRUDGE_READY") return;
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      if (token) {
        win.postMessage(
          {
            type: "GRUDGE_AUTH",
            token,
            characterId: characterId || undefined,
          },
          UI_HOST,
        );
      }
      if (inspect) {
        win.postMessage(
          {
            type: "GRUDGE_MAIN_PANEL",
            tab: "equipment",
            mode: "inspect",
            entity: {
              id: inspect.id || "inspect",
              name: inspect.name || "Unit",
              race: inspect.race || "human",
              meta: inspect.meta || "Inspect",
              portrait: inspect.portrait,
            },
            equipment: inspect.equipment || {},
          },
          UI_HOST,
        );
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [open, token, characterId, inspect]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm ${className}`}
      role="dialog"
      aria-label="Warlords main panel"
    >
      <div className="relative w-[min(1100px,96vw)] h-[min(720px,92vh)] rounded-xl overflow-hidden border border-amber-800/50 shadow-2xl bg-[#0a0705]">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 z-10 p-2 rounded-md bg-black/60 text-amber-100 hover:bg-black/80 border border-amber-900/40"
          aria-label="Close main panel"
        >
          <X className="w-4 h-4" />
        </button>
        <iframe
          ref={iframeRef}
          title="Warlords Main Panel"
          src={src}
          className="w-full h-full border-0"
          allow="clipboard-write"
        />
      </div>
    </div>
  );
}
