/**
 * Dock raft lab — scene (9) atoll + wooden dock.
 * Hatchet palms → stack wood → E at dock places one log on the raft.
 *
 * /dock-raft-lab
 */
import { useEffect, useState } from 'react';
import { Island3DRenderer } from '@/island3d/render/Island3DRenderer';

export default function DockRaftLabPage() {
  const [wood, setWood] = useState(0);
  const [logs, setLogs] = useState(0);
  const [need, setNeed] = useState(6);
  const [prompt, setPrompt] = useState('Loading dock + ocean…');

  useEffect(() => {
    const onLab = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      if (typeof d.wood === 'number') setWood(d.wood);
      if (typeof d.logsOnRaft === 'number') setLogs(d.logsOnRaft);
      if (typeof d.logsNeeded === 'number') setNeed(d.logsNeeded);
      if (d.prompt) setPrompt(String(d.prompt));
    };
    window.addEventListener('grudge:dock-raft-lab', onLab);
    return () => window.removeEventListener('grudge:dock-raft-lab', onLab);
  }, []);

  return (
    <div className="relative h-screen w-full bg-sky-950 text-amber-50">
      <Island3DRenderer
        seed="dock-raft-lab"
        mode="zone"
        sectorId="haven_shore"
        worldSeed="dock-raft-lab"
        enableCharacter
        playChrome={false}
        onEngineReady={(engine) => {
          void engine.startDockRaftLab();
        }}
      />
      <div className="pointer-events-none absolute left-4 top-4 z-20 space-y-1 rounded bg-black/55 px-3 py-2 text-sm">
        <div className="font-semibold tracking-wide">DOCK RAFT LAB</div>
        <div>R hatchet · LMB chop · walk over logs · E at dock = 1 log</div>
        <div>
          Wood {wood} · Raft {logs}/{need}
        </div>
        <div className="max-w-md text-amber-100/80">{prompt}</div>
      </div>
    </div>
  );
}
