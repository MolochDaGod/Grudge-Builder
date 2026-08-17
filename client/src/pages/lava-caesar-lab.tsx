/**
 * Playable lava Caesar lab — explorer + WASD/skills via Island3D zone,
 * 50% gravity, tank/healer/dps, combat timer.
 *
 * /lava-caesar-lab
 */
import { useEffect, useState } from 'react';
import { Island3DRenderer } from '@/island3d/render/Island3DRenderer';

export default function LavaCaesarLabPage() {
  const [timer, setTimer] = useState(0);
  const [hp, setHp] = useState(1);
  const [state, setState] = useState('boot');
  const [prompt, setPrompt] = useState('Loading ember arena…');

  useEffect(() => {
    const onLab = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      if (typeof d.timer === 'number') setTimer(d.timer);
      if (typeof d.hp === 'number') setHp(d.hp);
      if (d.state) setState(String(d.state));
    };
    const onRoom = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      if (d.prompt) setPrompt(String(d.prompt));
    };
    window.addEventListener('grudge:lava-caesar-lab', onLab);
    window.addEventListener('grudge:boss-room', onRoom);
    return () => {
      window.removeEventListener('grudge:lava-caesar-lab', onLab);
      window.removeEventListener('grudge:boss-room', onRoom);
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-black text-amber-100">
      <Island3DRenderer
        seed="lava-caesar-lab"
        mode="zone"
        sectorId="ember_depths"
        worldSeed="lava-caesar-lab"
        enableCharacter
        playChrome={false}
        onEngineReady={(engine) => {
          void engine.startLavaCaesarLab();
        }}
      />
      <div className="pointer-events-none absolute left-4 top-4 z-20 space-y-1 rounded bg-black/60 px-3 py-2 text-sm">
        <div className="font-semibold tracking-wide">LAVA CAESAR LAB</div>
        <div>WASD move · Space jump · 1–4 skills · LMB hit</div>
        <div>Gravity 50% · Explorer Adventurer</div>
        <div>
          Timer {timer.toFixed(1)}s · HP {(hp * 100).toFixed(0)}% · {state}
        </div>
        <div className="max-w-md text-amber-200/80">{prompt}</div>
        <div className="h-1.5 w-56 overflow-hidden rounded bg-zinc-800">
          <div className="h-full bg-orange-500" style={{ width: `${Math.max(2, hp * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}
