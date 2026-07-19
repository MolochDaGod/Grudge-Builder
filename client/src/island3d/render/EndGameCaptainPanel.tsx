/**
 * End Game dialogue UI when talking to faction captain (level 20+).
 */
import { useEffect } from 'react';
import type { CaptainInteractState } from '../lobby/FactionCaptainEndGame';
import { END_GAME_MISSION, END_GAME_FLAGS } from '@shared/definitions/endGameMission';
import { Ship, X } from 'lucide-react';

export interface EndGameCaptainPanelProps {
  state: CaptainInteractState;
  onAdvance: () => void;
  onAccept: () => void;
  onClose: () => void;
}

export function EndGameCaptainPanel({
  state,
  onAdvance,
  onAccept,
  onClose,
}: EndGameCaptainPanelProps) {
  const line = state.lines[state.lineIndex];
  const last = state.lineIndex >= state.lines.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (last) onAccept();
        else onAdvance();
      }
      if (e.key === 'e' || e.key === 'E') {
        if (last) onAccept();
        else onAdvance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [last, onAdvance, onAccept, onClose]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-[120] flex justify-center p-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-xl rounded-2xl border border-amber-500/35 bg-[#0a0c14]/95 backdrop-blur-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-amber-500/10">
          <div className="flex items-center gap-2 text-amber-200 text-xs font-bold tracking-wide">
            <Ship className="w-4 h-4" />
            {END_GAME_MISSION.title} · Lv {state.level}
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-white/10 text-white/50">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-3">
          <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
            {line.speaker === 'captain' ? state.captainName : line.speaker === 'player' ? 'You' : 'Narrator'}
          </div>
          <p className="text-sm text-white/90 leading-relaxed min-h-[3rem]">{line.text}</p>
        </div>
        <div className="px-4 py-3 border-t border-white/10 flex flex-wrap gap-2 justify-end">
          {!last && (
            <button
              type="button"
              onClick={onAdvance}
              className="px-3 py-1.5 rounded-lg border border-white/15 text-xs text-white/80 hover:bg-white/5"
            >
              Continue · Enter
            </button>
          )}
          {last && state.canAccept && (
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem(END_GAME_FLAGS.missionAccepted, '1');
                } catch {
                  /* ignore */
                }
                onAccept();
              }}
              className="px-4 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400"
            >
              Accept End Game · Abandon Ship
            </button>
          )}
          {!state.canAccept && last && (
            <p className="text-[11px] text-amber-400/90 self-center">
              Reach level {END_GAME_MISSION.minLevel} to accept.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function EndGameCaptainPrompt({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[110] px-3 py-1.5 rounded-full bg-black/70 border border-amber-500/40 text-amber-100 text-xs font-semibold pointer-events-none">
      Press <kbd className="font-mono text-amber-300">E</kbd> — Faction Captain · End Game
    </div>
  );
}
