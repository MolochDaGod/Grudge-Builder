/**
 * /homeisland — production End Game entry → abandon-ship cinematic → home island.
 *
 * https://client.grudge-studio.com/homeisland
 */
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { AbandonShipIntroGate } from '@/island3d/intro/AbandonShipIntroGate';
import { characterAPI } from '@/lib/api';
import {
  getActiveCharacterId,
  markHomeIslandClaimed,
  isTutorialComplete,
} from '@/lib/warlordsOnboarding';
import {
  END_GAME_FLAGS,
  endGameAfterCinematicPath,
} from '@shared/definitions/endGameMission';
import { Loader2 } from 'lucide-react';

export default function HomeIslandEntryPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);

  const wantCinematic =
    params.get('cinematic') !== '0' &&
    params.get('skipCinematic') !== '1' &&
    (params.get('cinematic') === 'abandon-ship' ||
      params.get('from') === 'end-game' ||
      params.get('mission') === 'end-game' ||
      true); // default: always show cinematic on first visit

  const [phase, setPhase] = useState<'load' | 'cinematic' | 'redirect'>('load');
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState('Hero');
  const [raceId, setRaceId] = useState('human');
  const [hasIsland, setHasIsland] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = params.get('characterId') || getActiveCharacterId();
      if (!id) {
        setLocation('/create-character');
        return;
      }
      try {
        const char = await characterAPI.get(id);
        if (cancelled) return;
        setCharacterId(id);
        setCharacterName(char.name || 'Hero');
        setRaceId(char.raceId || 'human');

        let islandExists = false;
        try {
          const res = await fetch('/api/island/current', { credentials: 'include' });
          islandExists = res.ok;
          if (islandExists) {
            setHasIsland(true);
            markHomeIslandClaimed();
          }
        } catch {
          /* optional */
        }

        // Home island is granted after tutorial + raft — never by level 20.
        // Soft gate: if they skipped flags but have no island and no tutorial done,
        // still allow when ?from=tutorial or unlock=1 or force cinematic entry.
        const fromTutorial =
          params.get('from') === 'tutorial' ||
          params.get('unlock') === '1' ||
          isTutorialComplete();
        if (!islandExists && !fromTutorial && !params.get('force')) {
          // New heroes without tutorial should not land here empty
          setLocation('/tutorial?from=homeisland-gate');
          return;
        }

        const cinematicDone = localStorage.getItem(END_GAME_FLAGS.cinematicComplete) === '1';
        // Cinematic optional (skip with ?cinematic=0 or already completed).

        if (wantCinematic && !cinematicDone) {
          setPhase('cinematic');
        } else {
          setPhase('redirect');
          if (islandExists) markHomeIslandClaimed();
          setLocation(endGameAfterCinematicPath(islandExists, id));
        }
      } catch {
        if (!cancelled) setError('Could not load character');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setLocation]);

  const onComplete = useCallback(() => {
    if (!characterId) return;
    setLocation(endGameAfterCinematicPath(hasIsland, characterId));
  }, [characterId, hasIsland, setLocation]);

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-red-300 text-sm">
        {error}
      </div>
    );
  }

  if (phase === 'cinematic') {
    return (
      <AbandonShipIntroGate
        characterId={characterId}
        characterName={characterName}
        raceId={raceId}
        onComplete={onComplete}
        onSkip={onComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#02060c] flex items-center justify-center gap-2 text-white/60 text-sm">
      <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
      {phase === 'redirect' ? 'Launching home island…' : 'Preparing End Game…'}
    </div>
  );
}
