import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CharacterCreatorState } from "./index";
import { CharacterManager } from "@/lib/characterManager";
import HomeIslandPreview from "@/components/HomeIslandPreview";
import { normalizeHomeIslandResponse } from "@/lib/homeIslandApi";

interface Step6IslandGenProps {
  state: CharacterCreatorState;
  updateState: (updates: Partial<CharacterCreatorState>) => void;
  onPrev: () => void;
}

export default function Step6IslandGen({ state, updateState, onPrev }: Step6IslandGenProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isRerolling, setIsRerolling] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchReady, setLaunchReady] = useState(false);

  const islandDto = state.homeIsland ? normalizeHomeIslandResponse(state.homeIsland) : null;
  const islandState = islandDto?.state ?? state.islandState;

  const handleRerollIsland = async () => {
    if (!state.homeIsland?.id) return;

    setIsRerolling(true);
    try {
      const response = await fetch(`/api/islands/${state.homeIsland.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      setLaunchReady(false);

      if (!response.ok) {
        throw new Error("Failed to regenerate island");
      }

      const newIsland = normalizeHomeIslandResponse(await response.json());
      updateState({
        homeIsland: newIsland,
        islandState: newIsland.state
      });

      toast({
        title: "Island Rerolled",
        description: "Your island has been regenerated with new resources and animals!"
      });
    } catch (error) {
      console.error("Island reroll failed:", error);
      toast({
        title: "Error",
        description: "Failed to reroll island. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRerolling(false);
    }
  };

  const handleFindLand = async () => {
    if (!state.character?.id || !state.islandState) {
      toast({
        title: "Error",
        description: "Missing character or island data",
        variant: "destructive"
      });
      return;
    }

    setIsLaunching(true);
    try {
      const response = await fetch("/api/island/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: state.character.id,
          islandState: state.islandState,
          islandSeed: state.homeIsland?.seed || state.character.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to initialize island");
      }

      const result = await response.json();
      const resolvedIsland = normalizeHomeIslandResponse(result?.island ?? state.homeIsland);
      updateState({
        homeIsland: resolvedIsland,
        islandState: resolvedIsland.state,
      });
      if (state.character?.id) {
        CharacterManager.setActive(state.character.id);
      }

      toast({
        title: "Welcome Commander!",
        description: "Your home island is committed. Choose how you want to enter the world."
      });
      setLaunchReady(true);
    } catch (error) {
      console.error("Land commitment failed:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to commit your land.",
        variant: "destructive"
      });
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <motion.div
      key="step-6-island-gen"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="w-full"
    >
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-amber-400 mb-2">Find Your Land</h3>
        <p className="text-slate-400">Settle your island and begin your conquest. Reroll as many times as you'd like before committing.</p>
      </div>

      {/* Island Preview */}
      {islandState ? (
        <div className="space-y-6 mb-8">
          {islandDto && (
            <HomeIslandPreview island={islandDto} className="min-h-[400px]" />
          )}

          {/* Island Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-amber-900/30 to-amber-950/20 border border-amber-700/30 rounded-lg p-4">
              <div className="text-xs text-amber-400 uppercase tracking-widest mb-2 font-bold">Resource Nodes</div>
              <div className="text-4xl font-bold text-amber-300">{islandDto?.state.nodes.length || islandState.nodes?.length || 0}</div>
              <div className="text-xs text-slate-400 mt-1">
                {Object.keys(islandDto?.state.stats?.resourceBreakdown || {}).length || 0} resource families
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-900/30 to-green-950/20 border border-green-700/30 rounded-lg p-4">
              <div className="text-xs text-green-400 uppercase tracking-widest mb-2 font-bold">Animals</div>
              <div className="text-4xl font-bold text-green-300">{islandDto?.state.animals.length || 0}</div>
              <div className="text-xs text-slate-400 mt-1">
                {Array.from(new Set(islandDto?.state.animals.map((a: any) => a.type) || [])).length} types
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/20 border border-blue-700/30 rounded-lg p-4">
              <div className="text-xs text-blue-400 uppercase tracking-widest mb-2 font-bold">Terrain Zones</div>
              <div className="text-4xl font-bold text-blue-300">{islandDto?.state.terrainZones.length || islandState.terrainZones?.length || 0}</div>
              <div className="text-xs text-slate-400 mt-1">
                live terrain layout
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/30 to-purple-950/20 border border-purple-700/30 rounded-lg p-4">
              <div className="text-xs text-purple-400 uppercase tracking-widest mb-2 font-bold">Camp Position</div>
              <div className="text-lg font-bold text-purple-300 font-mono">
                ({(islandDto?.state.campPosition?.x ?? islandState.campPosition?.x ?? 0).toFixed(0)}, {(islandDto?.state.campPosition?.y ?? islandState.campPosition?.y ?? 0).toFixed(0)})
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {islandDto?.state.clearings.length || islandState.clearings?.length || 0} clearing(s)
              </div>
            </div>
          </div>

          {/* Resource Breakdown */}
          <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-6">
            <h4 className="text-lg font-cinzel text-amber-300 mb-4">Resource Distribution</h4>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {Array.from(new Set((islandDto?.state.nodes || islandState.nodes || []).map((n: any) => n.type) || [])).map((nodeType: any) => {
                const nodes = (islandDto?.state.nodes || islandState.nodes || []).filter((n: any) => n.type === nodeType) || [];
                const rarityBreakdown: Record<string, number> = {};
                nodes.forEach((n: any) => {
                  rarityBreakdown[n.rarity] = (rarityBreakdown[n.rarity] || 0) + 1;
                });

                return (
                  <div key={nodeType} className="bg-black/40 border border-slate-600 rounded-lg p-3 text-center hover:border-amber-500/50 transition-colors">
                    <div className="text-3xl mb-1">
                      {nodeType === 'ore' && '⛏️'}
                      {nodeType === 'wood' && '🪵'}
                      {nodeType === 'hemp' && '🌾'}
                      {nodeType === 'herb' && '🌿'}
                      {nodeType === 'fish' && '🎣'}
                      {nodeType === 'oil' && '⛽'}
                      {nodeType === 'gem' && '💎'}
                      {nodeType === 'stone' && '🪨'}
                      {nodeType !== 'ore' && nodeType !== 'wood' && nodeType !== 'hemp' && nodeType !== 'herb' && nodeType !== 'fish' && nodeType !== 'oil' && nodeType !== 'gem' && nodeType !== 'stone' && '📦'}
                    </div>
                    <div className="text-lg font-bold text-amber-300">{nodes.length}</div>
                    <div className="text-xs text-slate-400 capitalize mt-1">{nodeType}</div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {Object.entries(rarityBreakdown)
                        .map(([rarity, count]) => `${count}${rarity.charAt(0)}`)
                        .join(' ')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Island Map Style */}
          <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-cinzel text-amber-300 mb-1">Map Style</h4>
                <p className="text-sm text-slate-400">
                  Terrain visualization: <span className="text-amber-300 font-bold capitalize">{islandDto?.mapStyle || islandState.mapStyle || 'fantasy'}</span>
                </p>
              </div>
              <div className="text-5xl">
                {(islandDto?.mapStyle || islandState.mapStyle) === 'fantasy' && '🌲'}
                {(islandDto?.mapStyle || islandState.mapStyle) === 'tactical' && '⚔️'}
                {(islandDto?.mapStyle || islandState.mapStyle) === 'iron' && '⚙️'}
                {(islandDto?.mapStyle || islandState.mapStyle) === 'night' && '🌙'}
                {!(islandDto?.mapStyle || islandState.mapStyle) && '🌍'}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-gradient-to-r from-amber-950/40 to-black/40 border border-amber-700/30 rounded-xl p-6">
            {!launchReady ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={handleRerollIsland}
                disabled={isRerolling || isLaunching}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:border-slate-500"
              >
                {isRerolling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rerolling...
                  </>
                ) : (
                  <>
                    <RotateCw className="w-4 h-4 mr-2" />
                    Find Another Island
                  </>
                )}
              </Button>

              <Button
                onClick={handleFindLand}
                disabled={isLaunching || isRerolling}
                className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold"
              >
                {isLaunching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Launching...
                  </>
                ) : (
                  <>
                    ⚔️ Commit Home Island
                  </>
                )}
              </Button>
            </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-slate-300">
                  Your island is committed to this character. Choose whether to enter the generated home island in 2D GrudaWars mode or 3D RTS GRUDGE mode.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={() => navigate(`/grudawars?characterId=${encodeURIComponent(state.character?.id || '')}&islandId=${encodeURIComponent(islandDto?.id || '')}`)}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold"
                  >
                    Enter 2D GrudaWars
                  </Button>
                  <Button
                    onClick={() => navigate(`/island-3d?mode=home-island&characterId=${encodeURIComponent(state.character?.id || '')}&islandId=${encodeURIComponent(islandDto?.id || '')}`)}
                    className="bg-blue-700 hover:bg-blue-600 text-white font-bold"
                  >
                    Enter 3D RTS GRUDGE
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={onPrev}
          disabled={isRerolling || isLaunching}
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
    </motion.div>
  );
}
