/**
 * /airship-zone — solo airship game zone
 * First visit: cabin (boatvoxelinside) + Racalvin → grudge6 create → deck
 * Crew: John Wayne (helm), Scourge (bow), Racalvin (wander)
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { AirshipSoloZone, type AirshipZonePhase } from '@/island3d/airship/AirshipSoloZone';
import {
  AIRSHIP_NPCS,
  type AirshipNpcDef,
  type AirshipNpcId,
  airshipHasSavedCharacter,
} from '@shared/definitions/airshipSoloZone';
import { buildGcsUrl } from '@/lib/gcsRedirect';
import { playBGM, stopBGM } from '@/lib/audioManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  markAirshipSeen,
  isTutorialComplete,
  getActiveCharacterId,
} from '@/lib/warlordsOnboarding';
import { AFTER_TUTORIAL_PATH } from '@shared/definitions/warlordsProductionFlow';
import {
  applyCharacterHandoffFromLocation,
  persistActiveCharacter,
} from '@/lib/characterHandoff';
import { useCharacters } from '@/hooks/use-characters';

const RACES = [
  { id: 'human', label: 'Human (WK)', prefix: 'WK_' },
  { id: 'barbarian', label: 'Barbarian', prefix: 'BRB_' },
  { id: 'elf', label: 'Elf', prefix: 'ELF_' },
  { id: 'dwarf', label: 'Dwarf', prefix: 'DWF_' },
  { id: 'orc', label: 'Orc', prefix: 'ORC_' },
  { id: 'undead', label: 'Undead', prefix: 'UD_' },
] as const;

const CLASSES = ['warrior', 'ranger', 'mage', 'rogue'] as const;

export default function AirshipZonePage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<AirshipSoloZone | null>(null);
  const [, setLocation] = useLocation();
  const { characters, loading: rosterLoading } = useCharacters('warlords');

  const [phase, setPhase] = useState<AirshipZonePhase>('loading');
  const [prompt, setPrompt] = useState<string | null>('Loading airship zone…');
  const [chat, setChat] = useState<{ name: string; line: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('Captain');
  const [raceId, setRaceId] = useState('human');
  const [classId, setClassId] = useState('warrior');
  const [creating, setCreating] = useState(false);

  const entry = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : '',
  ).get('entry');
  const isLobbyEntry = entry === 'warlords_play';

  /** Continue production path: airship lobby → pirate start / tutorial */
  const continueWarlordsPath = useCallback(() => {
    markAirshipSeen();
    const id = getActiveCharacterId();
    if (isLobbyEntry || isTutorialComplete()) {
      const q = new URLSearchParams({
        mode: 'lobby',
        map: 'pirate-islands',
        from: isLobbyEntry ? 'warlords_play' : 'tutorial',
        focus: 'faction',
      });
      if (id) q.set('characterId', id);
      q.set('era', 'warlords');
      setLocation(`/island-3d?${q.toString()}`);
      return;
    }
    const q = id ? `?characterId=${encodeURIComponent(id)}&from=airship` : '?from=airship';
    setLocation(`/tutorial${q}`);
  }, [setLocation, isLobbyEntry]);

  useEffect(() => {
    // Persist handoff + mark combat/airship tab visited
    try {
      const handoff = applyCharacterHandoffFromLocation();
      if (handoff.characterId) {
        persistActiveCharacter(handoff.characterId, handoff.from || 'airship');
      }
    } catch {
      /* ignore */
    }
    markAirshipSeen();

    // Scene-load BGM: soundssilents.mp3 (loop)
    playBGM('silents', { volume: 0.35, loop: true });

    const el = mountRef.current;
    if (!el) return;
    const zone = new AirshipSoloZone(el, {
      onPhase: setPhase,
      onPrompt: setPrompt,
      onChat: (npc: AirshipNpcDef, line: string) => {
        setChat({ name: npc.displayName, line });
      },
      onReady: () => {
        setReady(true);
        // GCS return: ?from=gcs&characterId=… — mark created + load race if possible
        try {
          const q = new URLSearchParams(window.location.search);
          if (q.get('from') === 'gcs') {
            const race = q.get('race') || q.get('raceId') || 'human';
            const nm = q.get('name') || 'Captain';
            const cls = q.get('class') || q.get('classId') || 'warrior';
            void zone.completeCharacterCreate({ name: nm, raceId: race, classId: cls });
          }
        } catch {
          /* ignore */
        }
      },
      onError: setError,
    });
    zoneRef.current = zone;
    void zone.start();
    return () => {
      zone.dispose();
      zoneRef.current = null;
      stopBGM();
    };
  }, []);

  const rosterKey = characters
    .slice(0, 4)
    .map((c) => c.id)
    .join(',');
  const rosterRef = useRef(characters);
  rosterRef.current = characters;
  useEffect(() => {
    if (!ready || rosterLoading) return;
    const zone = zoneRef.current;
    if (!zone) return;
    const roster = rosterRef.current.slice(0, 4);
    if (!roster.length) return;
    void zone.spawnAccountCrew(roster);
  }, [ready, rosterLoading, rosterKey]);

  const onAcceptCreate = useCallback(async () => {
    if (!zoneRef.current || creating) return;
    setCreating(true);
    try {
      await zoneRef.current.completeCharacterCreate({ name, raceId, classId });
      setChat({
        name: 'Racalvin',
        line: 'Good. Walk the deck. John holds the wheel. Scourge holds the bow. I hold the creed.',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }, [name, raceId, classId, creating]);

  const openGcs = () => {
    const url = buildGcsUrl({
      era: 'warlords',
      mode: 'create',
      returnTo:
        typeof window !== 'undefined'
          ? `${window.location.origin}/combat?era=warlords&entry=warlords_play&from=gcs`
          : 'https://grudgewarlords.com/combat?era=warlords&entry=warlords_play',
    });
    window.location.href = url;
  };

  const showCreate =
    phase === 'cabin_create' || (phase === 'deck' && !airshipHasSavedCharacter());

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden">
      <div ref={mountRef} className="absolute inset-0" />

      {/* Top crew bar — 4-character Warlords era scene (player + 3 NPCs) */}
      <div className="absolute top-0 left-0 right-0 z-20 flex flex-wrap items-center gap-2 p-3 bg-gradient-to-b from-black/80 to-transparent">
        <Badge variant="outline" className="text-amber-300 border-amber-600">
          Combat · Airship · 4 characters
        </Badge>
        {AIRSHIP_NPCS.map((npc) => (
          <Button
            key={npc.id}
            size="sm"
            variant="secondary"
            className="bg-stone-900/90 text-amber-100 border border-stone-700"
            onClick={() => zoneRef.current?.focusNpc(npc.id as AirshipNpcId)}
          >
            {npc.displayName}
            <span className="ml-1 text-stone-500 text-xs">· {npc.title}</span>
          </Button>
        ))}
        <Button
          size="sm"
          className="bg-amber-700 hover:bg-amber-600"
          onClick={() => zoneRef.current?.openCreateAtDoor()}
        >
          + New grudge6 (cabin)
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
          onClick={continueWarlordsPath}
        >
          {isLobbyEntry || isTutorialComplete()
            ? 'Start game → Pirate lobby'
            : 'Continue → Tutorial island'}
        </Button>
        <Button size="sm" variant="ghost" className="text-stone-300" onClick={() => setLocation('/warlords/heroes')}>
          Roster
        </Button>
        <Button size="sm" variant="ghost" className="text-stone-300" onClick={() => setLocation('/home')}>
          Hub
        </Button>
      </div>

      {/* Prompt */}
      {prompt && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 max-w-xl text-center px-4 py-2 rounded-lg bg-black/75 text-amber-100 text-sm border border-amber-900/50">
          {prompt}
        </div>
      )}

      {/* Chat bubble */}
      {chat && (
        <Card className="absolute bottom-36 left-4 z-20 w-80 bg-stone-900/95 border-stone-700">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm text-amber-300">{chat.name}</CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-3 text-sm text-stone-200">
            “{chat.line}”
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 w-full"
              onClick={() => setChat(null)}
            >
              Close
            </Button>
          </CardContent>
        </Card>
      )}

      {/* First-time / cabin create panel */}
      {showCreate && ready && (
        <Card className="absolute top-16 right-4 z-30 w-96 bg-stone-950/95 border-amber-800 shadow-xl">
          <CardHeader>
            <CardTitle className="text-amber-200">Forge your captain</CardTitle>
            <CardDescription>
              Racalvin guides you in the cabin. Baked grudge6 mesh + atlas · 2 m heroes on this
              airship. Accept to walk out onto the deck.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-stone-400">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-stone-900 border-stone-700"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400">Race (grudge6)</label>
              <div className="grid grid-cols-2 gap-1 mt-1">
                {RACES.map((r) => (
                  <Button
                    key={r.id}
                    size="sm"
                    variant={raceId === r.id ? 'default' : 'outline'}
                    onClick={() => setRaceId(r.id)}
                  >
                    {r.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-stone-400">Class</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {CLASSES.map((c) => (
                  <Button
                    key={c}
                    size="sm"
                    variant={classId === c ? 'default' : 'outline'}
                    onClick={() => setClassId(c)}
                  >
                    {c}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              className="w-full bg-amber-600 hover:bg-amber-500"
              disabled={creating || !name.trim()}
              onClick={() => void onAcceptCreate()}
            >
              {creating ? 'Forging…' : 'Accept — walk onto the deck'}
            </Button>
            <Button variant="outline" className="w-full" onClick={openGcs}>
              Open full Character Studio (GCS)
            </Button>
            <p className="text-[10px] text-stone-500">
              WASD move · Space hold-to-jump (random-boxes style) · E talk / hatch · Click crew up top
              · John at the wheel · Scourge on the bow · Racalvin mentors then wanders
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="absolute top-20 left-4 z-30 max-w-md p-3 bg-red-950/90 text-red-200 text-sm rounded border border-red-800">
          {error}
        </div>
      )}

      {phase === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 text-amber-100">
          Loading airship · cabin · captains…
        </div>
      )}
    </div>
  );
}
