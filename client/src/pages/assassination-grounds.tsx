/**
 * /assassination-grounds — Ultimate Assassination Grounds playable map.
 *
 * Full navmesh (MeshSceneNavMesh + three-pathfinding), systems on targets /
 * entrances / exits, Danger Room yes/no portal UI.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Crosshair, DoorOpen, Map as MapIcon } from 'lucide-react';
import {
  AssassinationGroundsRuntime,
  type PortalPromptState,
} from '@/island3d/maps/AssassinationGroundsRuntime';
import {
  ASSASSINATION_GROUNDS_GLB,
  DANGER_ROOM_URL,
} from '@shared/definitions/assassinationGroundsMap';
import { Button } from '@/components/ui/button';

export default function AssassinationGroundsPage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<AssassinationGroundsRuntime | null>(null);
  const [, navigate] = useLocation();
  const [status, setStatus] = useState('Booting…');
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState<{ targets: number; portals: number; cells: number } | null>(
    null,
  );
  const [portal, setPortal] = useState<PortalPromptState>(null);
  const [hitLog, setHitLog] = useState<string[]>([]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const rt = new AssassinationGroundsRuntime(host, {
      onStatus: setStatus,
      onReady: (s) => {
        setReady(true);
        setStats({
          targets: s.targets,
          portals: s.portals,
          cells: s.nav?.walkableCells ?? 0,
        });
      },
      onPortalPrompt: setPortal,
      onTargetHit: (_id, label) => {
        setHitLog((prev) => [`Hit · ${label}`, ...prev].slice(0, 6));
      },
    });
    runtimeRef.current = rt;

    return () => {
      rt.dispose();
      runtimeRef.current = null;
    };
  }, []);

  const onYes = useCallback(() => {
    runtimeRef.current?.confirmReturnToDangerRoom();
  }, []);

  const onNo = useCallback(() => {
    runtimeRef.current?.dismissPortalPrompt();
    setPortal(null);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-slate-100">
      <div ref={hostRef} className="absolute inset-0" />

      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/70 px-3 py-2 backdrop-blur-md">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-slate-300 hover:text-white"
            onClick={() => navigate('/systems')}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div className="hidden h-5 w-px bg-white/15 sm:block" />
          <div className="flex items-center gap-2">
            <MapIcon className="h-4 w-4 text-amber-400" />
            <div>
              <div className="text-xs font-semibold tracking-wide text-amber-300">
                {ASSASSINATION_GROUNDS_GLB.label}
              </div>
              <div className="text-[10px] text-slate-400">{status}</div>
            </div>
          </div>
        </div>

        {ready && stats && (
          <div className="pointer-events-none rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-[11px] text-slate-300 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <Crosshair className="h-3.5 w-3.5 text-rose-400" />
                {stats.targets} targets
              </span>
              <span className="inline-flex items-center gap-1">
                <DoorOpen className="h-3.5 w-3.5 text-sky-400" />
                {stats.portals} portals
              </span>
              <span className="text-slate-500">{stats.cells} nav cells</span>
            </div>
          </div>
        )}
      </header>

      {/* Crosshair */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <div className="h-4 w-4 rounded-full border border-white/50 shadow-[0_0_8px_rgba(255,255,255,0.25)]" />
      </div>

      {/* Controls hint */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-lg border border-white/10 bg-black/65 px-3 py-2 text-[11px] leading-relaxed text-slate-300 backdrop-blur-md">
        <div className="font-medium text-slate-200">WASD move · Shift run · Click lock + shoot targets</div>
        <div className="text-slate-500">Walk entrance/exit gates → Return to Danger Room prompt</div>
      </div>

      {/* Hit log */}
      {hitLog.length > 0 && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-20 w-56 space-y-1 rounded-lg border border-rose-500/20 bg-black/65 p-2 text-[11px] backdrop-blur-md">
          {hitLog.map((line, i) => (
            <div key={`${line}-${i}`} className="text-rose-200/90">
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Danger Room portal modal */}
      {portal?.open && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="danger-portal-title"
            className="w-full max-w-md rounded-xl border border-amber-500/30 bg-gradient-to-b from-slate-900 to-black p-6 shadow-2xl shadow-amber-900/30"
          >
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/90">
              Portal · {portal.label}
            </div>
            <h2 id="danger-portal-title" className="text-xl font-bold text-white">
              Return to Danger Room?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              You reached an entrance/exit on the Assassination Grounds. Leave this map and open the
              Danger Room at{' '}
              <span className="font-mono text-amber-200/90">open.grudge-studio.com/danger</span>?
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                className="min-w-[7rem] bg-amber-500 font-semibold text-black hover:bg-amber-400"
                onClick={onYes}
              >
                Yes
              </Button>
              <Button
                variant="outline"
                className="min-w-[7rem] border-white/20 bg-transparent text-slate-200 hover:bg-white/10"
                onClick={onNo}
              >
                No
              </Button>
            </div>
            <p className="mt-3 text-[10px] text-slate-500">
              Yes → {DANGER_ROOM_URL} · No → dismiss and keep walking
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
