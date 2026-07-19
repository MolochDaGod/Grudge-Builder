/**
 * /open-world — production open-world entry with scene UI.
 *
 * Fixes the bare lobby/zone experience (no entry, no character UX) by providing:
 *   1. Character select (Grudge6 / Warlords roster)
 *   2. Destination: Pirate Hub · 9-sector zone · Tutorial
 *   3. Editor mode flag (build deployables: units, siege, monsters)
 *   4. Storyboard / scene links for production Three.js client push
 *
 * After Enter → island-3d or play with full ModePlayHUD + Grudge6 character.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Island3DRenderer } from '@/island3d/render/Island3DRenderer';
import { OPEN_WORLD_LOBBY_MAP_ID } from '@/island3d/engine/openWorldLobby';
import { CharacterManager, type Character } from '@/lib/characterManager';
import { WORLD_SECTORS } from '@shared/definitions/worldMapSectors';
import { allUmmorpgDeployables } from '@shared/definitions/ummorpgDeployables';
import {
  Play, Users, Map, Hammer, BookOpen, Sword, Ship, ChevronRight,
  RefreshCw, Sparkles, Castle,
} from 'lucide-react';

type DestId = 'lobby' | 'tutorial' | 'zone' | 'play';

const DESTINATIONS: Array<{
  id: DestId;
  label: string;
  hint: string;
  badge: string;
}> = [
  { id: 'lobby', label: 'Pirate Hub', hint: 'Open-world lobby · boats · build · camps', badge: 'HUB' },
  { id: 'play', label: 'Warlords Play', hint: 'Colyseus sector + full HUD', badge: 'LIVE' },
  { id: 'zone', label: 'Tactical Zone', hint: 'Pick a sector on the 9-map', badge: 'ZONE' },
  { id: 'tutorial', label: 'Tutorial Shipwreck', hint: 'Solo starter · unarmed Grudge6', badge: 'START' },
];

export default function OpenWorldEntryPage() {
  const [, navigate] = useLocation();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [active, setActive] = useState<Character | null>(null);
  const [dest, setDest] = useState<DestId>('lobby');
  const [sectorId, setSectorId] = useState('haven_shore');
  const [editorMode, setEditorMode] = useState(true);
  const [storyboard, setStoryboard] = useState(false);
  const [entering, setEntering] = useState(false);
  const [loadingChars, setLoadingChars] = useState(true);

  const deployCount = allUmmorpgDeployables().length;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingChars(true);
      try {
        const list = await CharacterManager.getAll();
        if (cancelled) return;
        setCharacters(list);
        const a = await CharacterManager.getActiveCharacter();
        setActive(a || list[0] || null);
      } catch {
        if (!cancelled) setCharacters([]);
      } finally {
        if (!cancelled) setLoadingChars(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selectChar = (c: Character) => {
    setActive(c);
    CharacterManager.setActive(c.id);
  };

  const enterWorld = () => {
    if (!active && dest !== 'tutorial') {
      navigate('/create-character');
      return;
    }
    setEntering(true);
    const params = new URLSearchParams();
    if (active) params.set('characterId', active.id);

    if (editorMode) params.set('edit', '1');
    if (storyboard) params.set('storyboard', '1');

    let path = '/island-3d';
    switch (dest) {
      case 'lobby':
        params.set('mode', 'lobby');
        params.set('map', OPEN_WORLD_LOBBY_MAP_ID);
        params.set('island', 'grudge-open-world');
        break;
      case 'zone':
        params.set('mode', 'zone');
        params.set('sector', sectorId);
        params.set('worldSeed', 'grudge-world-1');
        break;
      case 'play':
        path = '/play';
        params.set('mode', 'zone');
        params.set('sector', sectorId);
        params.set('worldSeed', 'grudge-world-1');
        break;
      case 'tutorial':
        path = '/tutorial';
        break;
      default:
        break;
    }

    setTimeout(() => {
      navigate(`${path}?${params.toString()}`);
    }, 400);
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-slate-100">
      {/* Live 3D pirate lobby backdrop */}
      <div className="absolute inset-0">
        <Island3DRenderer
          seed="open-world-entry-v1"
          mode="lobby"
          lobbyMapId={OPEN_WORLD_LOBBY_MAP_ID}
          enableCharacter={false}
          characterId={active?.id}
          raceId={active?.raceId}
          classId={active?.classId}
          characterName={active?.name}
          className="w-full h-full"
        />
      </div>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 30% 40%, transparent 20%, rgba(0,0,0,0.75) 85%), linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 45%)',
        }}
      />

      {/* Scene UI shell */}
      <div className="absolute inset-0 z-20 flex flex-col pointer-events-none">
        <header className="pointer-events-auto flex items-center gap-3 px-4 py-3 border-b border-amber-800/40 bg-black/70 backdrop-blur-md">
          <Castle className="w-5 h-5 text-amber-400" />
          <div>
            <h1 className="font-cinzel text-amber-300 text-sm tracking-widest uppercase">
              Grudge Open World
            </h1>
            <p className="text-[10px] text-slate-400">
              Production entry · character · editor deployables · storyboard
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-[10px] text-slate-400">
            <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/40 text-emerald-300">
              {deployCount} deployables
            </span>
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="text-slate-500 hover:text-white underline"
            >
              Home
            </button>
          </div>
        </header>

        <div className="flex-1 flex items-end p-4 md:p-6 gap-4 pointer-events-none">
          {/* Character select */}
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="pointer-events-auto w-full max-w-sm rounded-2xl border border-amber-700/40 bg-black/85 backdrop-blur-xl p-4 shadow-2xl"
          >
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs uppercase tracking-widest text-amber-300/90 font-semibold">
                Character
              </h2>
              {loadingChars && <RefreshCw className="w-3 h-3 animate-spin text-slate-500 ml-auto" />}
            </div>

            {characters.length === 0 && !loadingChars ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-400">No Warlords heroes on this account.</p>
                <button
                  type="button"
                  onClick={() => navigate('/create-character')}
                  className="w-full py-2 rounded-xl bg-amber-600/90 text-black text-sm font-semibold"
                >
                  Create Character
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {characters.map((c) => {
                  const sel = active?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectChar(c)}
                      className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition-colors ${
                        sel
                          ? 'border-amber-500 bg-amber-950/50 text-amber-100'
                          : 'border-slate-700/60 bg-slate-900/40 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="font-medium truncate">{c.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {c.raceId} · {c.classId} · Lv {c.level ?? 1}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Destination + modes */}
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="pointer-events-auto flex-1 max-w-xl rounded-2xl border border-emerald-800/40 bg-black/85 backdrop-blur-xl p-4 shadow-2xl"
          >
            <div className="flex items-center gap-2 mb-3">
              <Map className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs uppercase tracking-widest text-emerald-300/90 font-semibold">
                Destination
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {DESTINATIONS.map((d) => {
                const sel = dest === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDest(d.id)}
                    className={`text-left p-2.5 rounded-xl border transition-colors ${
                      sel
                        ? 'border-emerald-500 bg-emerald-950/40'
                        : 'border-slate-700/50 bg-slate-900/30 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {d.badge}
                      </span>
                      <span className="text-sm font-medium">{d.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{d.hint}</p>
                  </button>
                );
              })}
            </div>

            {(dest === 'zone' || dest === 'play') && (
              <label className="block mb-3">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Sector</span>
                <select
                  value={sectorId}
                  onChange={(e) => setSectorId(e.target.value)}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm"
                >
                  {WORLD_SECTORS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="flex flex-wrap gap-3 mb-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editorMode}
                  onChange={(e) => setEditorMode(e.target.checked)}
                  className="accent-amber-500"
                />
                <Hammer className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Editor mode — deploy units / siege / monsters
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={storyboard}
                  onChange={(e) => setStoryboard(e.target.checked)}
                  className="accent-sky-500"
                />
                <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                <span>Storyboard flag (session)</span>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={entering}
                onClick={enterWorld}
                className="flex-1 min-w-[10rem] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-emerald-600 text-black font-bold text-sm shadow-lg disabled:opacity-50"
              >
                {entering ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Enter World
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/rts-grudge')}
                className="px-3 py-2 rounded-xl border border-slate-600 text-xs text-slate-300 hover:border-slate-400"
                title="Legacy RTS lobby"
              >
                <Sword className="w-3.5 h-3.5 inline mr-1" />
                RTS
              </button>
              <button
                type="button"
                onClick={() => navigate('/scene')}
                className="px-3 py-2 rounded-xl border border-slate-600 text-xs text-slate-300 hover:border-slate-400"
              >
                <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                Scene
              </button>
              <button
                type="button"
                onClick={() => navigate('/editor')}
                className="px-3 py-2 rounded-xl border border-slate-600 text-xs text-slate-300 hover:border-slate-400"
              >
                Node build
              </button>
              <button
                type="button"
                onClick={() => navigate('/ocean')}
                className="px-3 py-2 rounded-xl border border-slate-600 text-xs text-slate-300 hover:border-slate-400"
              >
                <Ship className="w-3.5 h-3.5 inline mr-1" />
                Ocean
              </button>
            </div>

            <p className="mt-3 text-[10px] text-slate-500 leading-relaxed">
              Deployables from 30grudge6 captains, toon travelers/bandits, uMMORPG catapults &amp;
              bolt-throwers, and creature monsters. In world: switch to <strong>Build</strong> →
              tabs Units / Siege / Monsters · LMB place.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
