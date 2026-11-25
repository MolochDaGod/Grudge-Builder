/**
 * MainPanelHost — embeds the production Warlords main panel.
 *
 * SSOT: same-origin /main-panel/ on Grudge-Builder (grudgewarlords.com).
 * Full React panel: paperdoll, equipment, camps, boats, crew, pit, skills.
 */
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

function panelOrigin() {
  if (typeof window === "undefined") return "https://grudgewarlords.com";
  const h = window.location.hostname;
  if (
    h === "grudgewarlords.com" ||
    h.endsWith(".grudgewarlords.com") ||
    h === "grudge-studio.com" ||
    h.endsWith(".grudge-studio.com") ||
    h.endsWith(".vercel.app")
  ) {
    return window.location.origin;
  }
  return "https://grudgewarlords.com";
}

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
  const u = new URL("/main-panel/", panelOrigin());
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
  const targetOrigin = panelOrigin();

  const src = buildMainPanelUrl({
    era,
    tab,
    embed: true,
    characterId: inspect ? null : characterId,
  });

  useEffect(() => {
    if (!open) return;
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "GRUDGE_EQUIP_CHANGE") {
        window.dispatchEvent(
          new CustomEvent("grudge:equip:change", {
            detail: {
              equipment: e.data.equipment,
              characterId: e.data.characterId || characterId,
            },
          }),
        );
        return;
      }
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
          targetOrigin,
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
          targetOrigin,
        );
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [open, token, characterId, inspect, targetOrigin]);

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
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
