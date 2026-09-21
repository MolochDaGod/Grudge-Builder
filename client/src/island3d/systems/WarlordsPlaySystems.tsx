/**
 * WarlordsPlaySystems — production chrome on the MMO host play surfaces.
 *
 * Mount next to ModePlayHUD / CampCommandBar.
 *   I / C  → Main Panel (info.* icons, equipment, weapon skills)
 *   F1–F5  → existing CampCommandBar
 *   auto   → IslandDefenceDirector garrison + defend
 */
import { useEffect, useRef, useState } from "react";
import MainPanelHost from "@/components/MainPanelHost";
import type { Island3DEngine } from "../engine/Island3DEngine";
import { IslandDefenceDirector } from "./IslandDefenceDirector";
import {
  WARLORDS_MMO_CONTRACT,
  WARLORDS_MMO_KEYS,
  WARLORDS_MMO_ROUTES,
} from "@shared/fleet/warlordsMmoDeploy";

export interface WarlordsPlaySystemsProps {
  engine: Island3DEngine | null;
  characterId?: string | null;
  token?: string | null;
  /** When false, only the defence tick runs (page already owns I-key panel). */
  ownMainPanel?: boolean;
}

export function WarlordsPlaySystems({
  engine,
  characterId = null,
  token = null,
  ownMainPanel = true,
}: WarlordsPlaySystemsProps) {
  const directorRef = useRef<IslandDefenceDirector | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [eventLine, setEventLine] = useState<string | null>(null);

  useEffect(() => {
    if (!engine) return;
    const director = new IslandDefenceDirector({ engine });
    director.start();
    directorRef.current = director;
    let acc = 0;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      acc += dt;
      director.update(dt);
      if (acc >= 1) {
        acc = 0;
        const snap = director.snapshot();
        if (snap.lastEvent && snap.lastEvent !== eventLine) {
          setEventLine(snap.lastEvent);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      director.stop();
      directorRef.current = null;
    };
    // eventLine is display-only; do not restart the director when it changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  useEffect(() => {
    if (!ownMainPanel) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k !== WARLORDS_MMO_KEYS.mainPanel && k !== WARLORDS_MMO_KEYS.mainPanelAlt) {
        return;
      }
      e.preventDefault();
      setPanelOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ownMainPanel]);

  return (
    <>
      {eventLine && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <p className="text-[10px] tracking-wide text-emerald-300/80 bg-black/50 px-2 py-0.5 rounded">
            Defence {WARLORDS_MMO_CONTRACT} · {eventLine}
          </p>
        </div>
      )}
      {ownMainPanel && (
        <MainPanelHost
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          characterId={characterId}
          token={token}
          tab="equipment"
        />
      )}
      <a
        href={WARLORDS_MMO_ROUTES.ocean}
        className="absolute top-3 right-3 z-40 pointer-events-auto text-[10px] uppercase tracking-widest text-cyan-200/80 hover:text-cyan-100 bg-black/40 border border-cyan-800/40 rounded px-2 py-1"
      >
        Open water
      </a>
    </>
  );
}

export default WarlordsPlaySystems;
