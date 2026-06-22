/**
 * IslandRevealPage — post-tutorial home island pipeline.
 *
 * Primary flow: Lore → reserve island seed → Studio Editor (high-quality 3D design)
 * Legacy flow:  2D overhead preview → quick commit (kept as fallback)
 */
import { useEffect, useState, useCallback } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Loader2, RotateCw, Check, MapPin, Ship, TreePine, Sparkles, ExternalLink } from 'lucide-react';
import HomeIslandPreview from '@/components/HomeIslandPreview';
import { CharacterManager } from '@/lib/characterManager';
import { characterAPI } from '@/lib/api';
import {
  generateCharacterIsland,
  rerollIsland,
  commitHomeIsland,
  type HomeIslandDto,
} from '@/lib/homeIslandApi';
import { renderIslandMapToDataUrl } from '@/lib/islandMapRenderer';
import { HOME_ISLAND_LORE } from '@/lib/islandLore';
import { captureIslandTopDown } from '@/island3d/render/IslandTopDownCapture';
import { openStudioEditorForHomeIsland } from '@/lib/studioEditorBridge';
import { STUDIO_EDITOR_URL } from '@/lib/grudgeConfig';

type Phase = 'lore' | 'generating' | 'studio' | 'preview' | 'committing' | 'launch';

const COMMIT_STEPS = [
  'Writing island UUID to home_islands…',
  'Placing harvest nodes & camp coordinates…',
  'Saving 2D overhead map image…',
  'Linking character → island…',
  'Minting island cNFT (optional)…',
];

export default function IslandRevealPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [phase, setPhase] = useState<Phase>('lore');
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState('Commander');
  const [island, setIsland] = useState<HomeIslandDto | null>(null);
  const [mapPreviewUrl, setMapPreviewUrl] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState(0);
  const [commitStep, setCommitStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRerolling, setIsRerolling] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get('phase') === 'studio-return') {
      setPhase('studio');
    }
  }, [search]);

  useEffect(() => {
    async function load() {
      const grudgeId = localStorage.getItem('grudge_account_id') || 'guest';
      const activeId = localStorage.getItem(`gruda_active_character_${grudgeId}`) ||
        localStorage.getItem('grudge_active_character') ||
        localStorage.getItem('gruda_active_character_guest');
      if (!activeId) {
        setLocation('/create-character');
        return;
      }
      setCharacterId(activeId);
      try {
        const char = await characterAPI.get(activeId);
        setCharacterName(char.name);
      } catch {
        setLocation('/create-character');
      }
    }
    load();
  }, [setLocation]);

  const buildMapPreview = useCallback(async (dto: HomeIslandDto) => {
    const svgMap = renderIslandMapToDataUrl(dto.state, 1024);
    setMapPreviewUrl(svgMap);
    try {
      const topDown = await captureIslandTopDown(dto.seed ?? dto.id, 512);
      if (topDown) setMapPreviewUrl(topDown);
    } catch { /* SVG fallback is fine */ }
  }, []);

  const runGeneration = useCallback(async () => {
    if (!characterId) return;
    setPhase('generating');
    setError(null);
    setGenProgress(10);
    try {
      setGenProgress(35);
      const dto = await generateCharacterIsland(characterId);
      setGenProgress(70);
      setIsland(dto);
      await buildMapPreview(dto);
      setGenProgress(100);
      await new Promise(r => setTimeout(r, 400));
      setPhase('studio');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
      setPhase('lore');
    }
  }, [characterId, buildMapPreview]);

  const launchStudioEditor = useCallback((newTab = false) => {
    if (!characterId || !island) return;
    openStudioEditorForHomeIsland(
      {
        characterId,
        islandId: island.id,
        seed: island.seed ?? island.id,
      },
      { newTab },
    );
  }, [characterId, island]);

  const handleReroll = async () => {
    if (!island?.id) return;
    setIsRerolling(true);
    setError(null);
    try {
      const dto = await rerollIsland(island.id);
      setIsland(dto);
      await buildMapPreview(dto);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reroll failed');
    } finally {
      setIsRerolling(false);
    }
  };

  const handleCommit = async () => {
    if (!characterId || !island) return;
    setPhase('committing');
    setCommitStep(0);
    setError(null);

    const stepTimer = setInterval(() => {
      setCommitStep(s => Math.min(s + 1, COMMIT_STEPS.length - 1));
    }, 900);

    try {
      const mapImageData = mapPreviewUrl ?? renderIslandMapToDataUrl(island.state, 1024);
      const result = await commitHomeIsland({
        characterId,
        islandId: island.id,
        islandState: island.state,
        mapImageData,
      });
      clearInterval(stepTimer);
      setCommitStep(COMMIT_STEPS.length - 1);
      setIsland(result.island);
      CharacterManager.setActive(characterId);
      await new Promise(r => setTimeout(r, 800));
      setPhase('launch');
    } catch (e) {
      clearInterval(stepTimer);
      setError(e instanceof Error ? e.message : 'Commit failed');
      setPhase('preview');
    }
  };

  const enter3D = () => setLocation(`/home-island?characterId=${encodeURIComponent(characterId!)}&islandId=${encodeURIComponent(island!.id)}`);
  const enter2D = () => setLocation(`/island?characterId=${encodeURIComponent(characterId!)}&islandId=${encodeURIComponent(island!.id)}`);

  return (
    <div className="fixed inset-0 bg-[#05060c] text-white overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── Lore intro ── */}
        {phase === 'lore' && (
          <div className="space-y-6">
            <h1 className="text-3xl font-cinzel font-black text-amber-400 tracking-wider">{HOME_ISLAND_LORE.title}</h1>
            <p className="text-slate-300 leading-relaxed">{HOME_ISLAND_LORE.subtitle}</p>
            <p className="text-sm text-slate-500 italic border-l-2 border-amber-600/40 pl-4">{HOME_ISLAND_LORE.waterfall}</p>
            <ul className="space-y-2 text-sm text-slate-400">
              {HOME_ISLAND_LORE.islandRules.map(rule => (
                <li key={rule} className="flex gap-2"><span className="text-amber-500">◆</span>{rule}</li>
              ))}
            </ul>
            <p className="text-amber-200/80 text-sm font-cinzel">
              {characterName}, the Ocean of Echoes has found a shard keyed to your account.
            </p>
            <button
              type="button"
              onClick={runGeneration}
              className="font-cinzel font-bold px-8 py-3 rounded-xl text-black"
              style={{ background: 'linear-gradient(180deg, #f6c945, #d8a819)' }}
            >
              Survey the Shard
            </button>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
        )}

        {/* ── Generation load screen ── */}
        {phase === 'generating' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <Loader2 className="w-14 h-14 text-amber-400 animate-spin mb-6" />
            <h2 className="text-2xl font-cinzel text-amber-300 mb-2">Charting Your Island</h2>
            <p className="text-slate-400 text-sm mb-6">Reserving your seed and preparing the Studio Editor…</p>
            <div className="w-72 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${genProgress}%` }} />
            </div>
          </div>
        )}

        {/* ── Studio Editor — primary home-island creation path ── */}
        {phase === 'studio' && island && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-amber-400" />
              <div>
                <h2 className="text-2xl font-cinzel text-amber-300">Design in Studio Editor</h2>
                <p className="text-sm text-slate-500 font-mono">seed: {island.seed?.slice(0, 12)}…</p>
              </div>
            </div>

            <p className="text-slate-300 leading-relaxed">
              Your island shard is reserved. Open the <strong className="text-amber-300 font-normal">Grudge Studio Map &amp; Model Editor</strong> to
              sculpt terrain, place high-quality GLB assets, scatter creatures, and publish directly to your home island.
            </p>

            <div className="rounded-xl border border-amber-700/40 bg-gradient-to-br from-slate-900/80 to-slate-950 p-6 space-y-4">
              <ul className="text-sm text-slate-400 space-y-2">
                <li className="flex gap-2"><span className="text-emerald-400">✓</span> Procedural island generation with biome presets</li>
                <li className="flex gap-2"><span className="text-emerald-400">✓</span> Kenney + creature GLB asset palette</li>
                <li className="flex gap-2"><span className="text-emerald-400">✓</span> Terrain sculpt, paint, and entity placement</li>
                <li className="flex gap-2"><span className="text-emerald-400">✓</span> One-click <em>Publish to Warlords</em> when done</li>
              </ul>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => launchStudioEditor(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-cinzel font-bold text-black"
                  style={{ background: 'linear-gradient(180deg, #f6c945, #d8a819)' }}
                >
                  <Sparkles className="w-5 h-5" />
                  Open Studio Editor
                </button>
                <button
                  type="button"
                  onClick={() => launchStudioEditor(true)}
                  className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  <ExternalLink className="w-4 h-4" />
                  New Tab
                </button>
              </div>
              <p className="text-xs text-slate-600 text-center">
                {STUDIO_EDITOR_URL.replace(/^https?:\/\//, '')}
              </p>
            </div>

            <div className="border-t border-slate-800 pt-6 space-y-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Or skip the editor</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleReroll}
                  disabled={isRerolling}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 disabled:opacity-50 text-sm"
                >
                  {isRerolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                  Reroll Seed
                </button>
                <button
                  type="button"
                  onClick={() => setPhase('preview')}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 text-sm"
                >
                  Quick Approve (2D preview)
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
        )}

        {/* ── Legacy 2D overhead preview + approval ── */}
        {phase === 'preview' && island && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-cinzel text-amber-300">Approve Your Home Island</h2>
              <button
                type="button"
                onClick={() => setPhase('studio')}
                className="text-xs text-amber-500 hover:text-amber-300 underline"
              >
                ← Back to Studio Editor
              </button>
            </div>
            <p className="text-sm text-slate-400">{HOME_ISLAND_LORE.commitWarning}</p>

            {mapPreviewUrl && (
              <div className="rounded-xl overflow-hidden border border-amber-700/30">
                <img src={mapPreviewUrl} alt="Island overhead map" className="w-full block" />
              </div>
            )}
            <HomeIslandPreview island={island} className="min-h-[280px]" />

            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700">
                <TreePine className="w-5 h-5 mx-auto text-green-400 mb-1" />
                <div className="font-bold text-amber-300">{island.state.nodes.length}</div>
                <div className="text-slate-500 text-xs">Harvest Nodes</div>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700">
                <MapPin className="w-5 h-5 mx-auto text-blue-400 mb-1" />
                <div className="font-bold text-amber-300">{island.state.terrainZones.length}</div>
                <div className="text-slate-500 text-xs">Biome Zones</div>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700">
                <Ship className="w-5 h-5 mx-auto text-amber-400 mb-1" />
                <div className="font-bold text-amber-300 font-mono text-xs">
                  {island.state.campPosition ? `${island.state.campPosition.x.toFixed(0)},${island.state.campPosition.y.toFixed(0)}` : '—'}
                </div>
                <div className="text-slate-500 text-xs">Camp</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleReroll}
                disabled={isRerolling}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                {isRerolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                Reroll Seed
              </button>
              <button
                type="button"
                onClick={handleCommit}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-cinzel font-bold text-black"
                style={{ background: 'linear-gradient(180deg, #f6c945, #d8a819)' }}
              >
                <Check className="w-4 h-4" />
                Commit & Build
              </button>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
        )}

        {/* ── Commit load screen ── */}
        {phase === 'committing' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <Loader2 className="w-14 h-14 text-amber-400 animate-spin mb-6" />
            <h2 className="text-2xl font-cinzel text-amber-300 mb-4">Building Your Settlement</h2>
            <ul className="text-left text-sm space-y-2 text-slate-400">
              {COMMIT_STEPS.map((step, i) => (
                <li key={step} className={i <= commitStep ? 'text-amber-300' : 'text-slate-600'}>
                  {i < commitStep ? '✓' : i === commitStep ? '…' : '○'} {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Launch ── */}
        {phase === 'launch' && island && (
          <div className="text-center space-y-6 py-12">
            <h2 className="text-3xl font-cinzel text-amber-300">Island Committed</h2>
            <p className="text-slate-400">{island.state.nodes.length} harvest nodes placed. Welcome, {characterName}.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
              <button type="button" onClick={enter3D} className="px-6 py-4 rounded-xl bg-blue-700 hover:bg-blue-600 font-bold">
                Enter 3D Home Island
              </button>
              <button type="button" onClick={enter2D} className="px-6 py-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 font-bold">
                Enter 2D Island
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}