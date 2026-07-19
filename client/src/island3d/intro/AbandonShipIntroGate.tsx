/**
 * AbandonShipIntroGate — End Game cinematic for home island.
 *
 * Cannon fire → ship takes water / sinks → ALL models jump off (abandon ship).
 * Does NOT throw a single character overboard (that was the old death-float).
 *
 * Embeds TI intro with variant=abandon_ship when available; local storyboard fallback.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ABANDON_SHIP_HOME_INTRO,
  HOME_ISLAND_PRODUCTION_URL,
} from '@shared/definitions/productionIntro';
import {
  END_GAME_MISSION,
  END_GAME_FLAGS,
} from '@shared/definitions/endGameMission';
import { Anchor, Play, SkipForward, Volume2, VolumeX, Waves, Ship } from 'lucide-react';

export interface AbandonShipIntroGateProps {
  characterId?: string | null;
  characterName?: string;
  raceId?: string;
  onComplete: (opts: { hasIslandHint?: boolean }) => void;
  onSkip?: () => void;
}

const BEATS = [
  { t: 0, title: 'Cannon fire', body: 'Enemy guns answer. The deck shudders under iron rain.' },
  { t: 0.18, title: 'Hull breached', body: 'Water climbs the hold. The ship will not make port.' },
  { t: 0.38, title: 'Abandon ship!', body: 'The order is given. No one is thrown — every soul jumps free.' },
  { t: 0.58, title: 'All hands jump', body: 'Captains, crew, heroes — models leave the deck as one.' },
  { t: 0.78, title: 'She goes under', body: 'The hull sinks. The sea closes over timber and sail.' },
  { t: 0.92, title: 'Swim for shore', body: 'Your home island waits beyond the wreck.' },
];

export function AbandonShipIntroGate({
  characterId,
  characterName = 'Hero',
  raceId,
  onComplete,
  onSkip,
}: AbandonShipIntroGateProps) {
  const [mute, setMute] = useState(false);
  const [progress, setProgress] = useState(0);
  const [embedFailed, setEmbedFailed] = useState(false);
  const [beatIdx, setBeatIdx] = useState(0);

  const tiSrc = useMemo(() => {
    const u = new URL(ABANDON_SHIP_HOME_INTRO.tiUrl);
    u.searchParams.set('embed', '1');
    u.searchParams.set('from', 'end-game');
    u.searchParams.set('variant', 'abandon_ship');
    u.searchParams.set('noThrow', '1');
    u.searchParams.set('sink', '1');
    u.searchParams.set('jumpAll', '1');
    u.searchParams.set('cutOverboard', '1');
    if (mute) u.searchParams.set('mute', '1');
    if (characterName) u.searchParams.set('hero', characterName);
    if (raceId) u.searchParams.set('race', raceId);
    if (characterId) u.searchParams.set('characterId', characterId);
    return u.toString();
  }, [mute, characterName, raceId, characterId]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(END_GAME_FLAGS.cinematicComplete, '1');
      localStorage.setItem(END_GAME_FLAGS.missionAccepted, '1');
    } catch {
      /* ignore */
    }
    onComplete({});
  }, [onComplete]);

  useEffect(() => {
    const start = performance.now();
    const dur = ABANDON_SHIP_HOME_INTRO.durationMs;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setProgress(p);
      const bi = BEATS.reduce((acc, b, i) => (p >= b.t ? i : acc), 0);
      setBeatIdx(bi);
      if (p < 1) raf = requestAnimationFrame(tick);
      else finish();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [finish]);

  const beat = BEATS[beatIdx] ?? BEATS[0];

  return (
    <div className="fixed inset-0 z-[200] bg-[#02060c] text-white flex flex-col">
      {/* Storyboard / embed */}
      <div className="relative flex-1 min-h-0">
        {!embedFailed ? (
          <iframe
            title="End Game · Abandon Ship"
            src={tiSrc}
            className="absolute inset-0 w-full h-full border-0"
            allow="autoplay; fullscreen"
            onError={() => setEmbedFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-sky-950/40 to-black px-6">
            <Ship className="w-16 h-16 text-amber-400/80 mb-4 animate-pulse" />
            <h1 className="text-3xl md:text-5xl font-black text-amber-100 text-center" style={{ fontFamily: 'Cinzel, serif' }}>
              End Game
            </h1>
            <p className="mt-3 text-lg text-sky-200/90 font-semibold">{beat.title}</p>
            <p className="mt-2 max-w-lg text-center text-white/60 leading-relaxed">{beat.body}</p>
            <div className="mt-8 flex gap-6 text-xs text-white/40">
              <span className="flex items-center gap-1"><Waves className="w-3.5 h-3.5" /> Sink</span>
              <span className="flex items-center gap-1">Jump all</span>
              <span className="flex items-center gap-1">No throw</span>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div
            className="h-full bg-amber-400 transition-[width] duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* HUD chrome */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between gap-3 pointer-events-none">
          <div className="pointer-events-auto rounded-xl border border-white/10 bg-black/60 backdrop-blur px-3 py-2 max-w-md">
            <div className="text-[10px] uppercase tracking-[0.3em] text-amber-400/80">
              Mission · {END_GAME_MISSION.title}
            </div>
            <div className="text-sm font-bold text-white mt-0.5">{characterName}</div>
            <div className="text-[11px] text-white/50 mt-1">{beat.title} — {beat.body}</div>
          </div>
          <div className="pointer-events-auto flex gap-2">
            <button
              type="button"
              onClick={() => setMute((m) => !m)}
              className="p-2 rounded-lg bg-black/50 border border-white/15 hover:bg-black/70"
              title={mute ? 'Unmute' : 'Mute'}
            >
              {mute ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setEmbedFailed(true)}
              className="px-2 py-1 rounded-lg bg-black/50 border border-white/15 text-[10px] hover:bg-black/70"
            >
              Storyboard
            </button>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 bg-black/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] text-white/45 flex items-center gap-2">
          <Anchor className="w-3.5 h-3.5 text-amber-400" />
          Cannon fire · abandon ship · {HOME_ISLAND_PRODUCTION_URL}
        </div>
        <div className="flex gap-2">
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="px-3 py-1.5 rounded-lg border border-white/15 text-xs text-white/70 hover:bg-white/5 flex items-center gap-1"
            >
              <SkipForward className="w-3.5 h-3.5" /> Skip
            </button>
          )}
          <button
            type="button"
            onClick={finish}
            className="px-4 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 flex items-center gap-1"
          >
            <Play className="w-3.5 h-3.5" /> Claim home island
          </button>
        </div>
      </div>
    </div>
  );
}
