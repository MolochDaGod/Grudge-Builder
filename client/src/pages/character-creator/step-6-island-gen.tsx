import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CharacterCreatorState } from "./index";

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

  const islandState = state.islandState;

  const handleRerollIsland = async () => {
    if (!state.homeIsland?.id) return;

    setIsRerolling(true);
    try {
      const response = await fetch(`/api/islands/${state.homeIsland.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate island");
      }

      const newIsland = await response.json();
      updateState({
        homeIsland: newIsland,
        islandState: newIsland
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

      toast({
        title: "Welcome Commander!",
        description: "Your empire awaits. Launching Grudge Wars..."
      });

      // Redirect to game or show success modal
      // For now, navigate to home or specific game route
      setTimeout(() => {
        navigate("/rts-grudge");
      }, 1500);
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
          {/* Island Display Placeholder */}
          {/* In a real implementation, this would be the IslandRenderer component */}
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-8 min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="w-full h-full" style={{
                backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />
            </div>

            <div className="relative z-10 text-center">
              <div className="text-8xl mb-4 animate-bounce">🏝️</div>
              <h4 className="text-3xl font-cinzel text-amber-300 mb-2">Island Preview</h4>
              <p className="text-slate-400 text-sm max-w-md">
                Island visualization will render here with terrain zones, resource nodes, and animals
              </p>
            </div>
          </div>

          {/* Island Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-amber-900/30 to-amber-950/20 border border-amber-700/30 rounded-lg p-4">
              <div className="text-xs text-amber-400 uppercase tracking-widest mb-2 font-bold">Resource Nodes</div>
              <div className="text-4xl font-bold text-amber-300">{islandState.nodes?.length || 0}</div>
              <div className="text-xs text-slate-400 mt-1">
                {islandState.nodes?.reduce((acc: any, n: any) => acc + (n.drops?.length || 0), 0) || 0} items total
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-900/30 to-green-950/20 border border-green-700/30 rounded-lg p-4">
              <div className="text-xs text-green-400 uppercase tracking-widest mb-2 font-bold">Animals</div>
              <div className="text-4xl font-bold text-green-300">{islandState.sheep?.length || 0}</div>
              <div className="text-xs text-slate-400 mt-1">
                {Array.from(new Set(islandState.sheep?.map((a: any) => a.type) || [])).length} types
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/20 border border-blue-700/30 rounded-lg p-4">
              <div className="text-xs text-blue-400 uppercase tracking-widest mb-2 font-bold">Terrain Zones</div>
              <div className="text-4xl font-bold text-blue-300">{islandState.terrainZones?.length || 0}</div>
              <div className="text-xs text-slate-400 mt-1">
                6 unique biomes
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/30 to-purple-950/20 border border-purple-700/30 rounded-lg p-4">
              <div className="text-xs text-purple-400 uppercase tracking-widest mb-2 font-bold">Camp Position</div>
              <div className="text-lg font-bold text-purple-300 font-mono">
                ({islandState.campPosition?.x.toFixed(0)}, {islandState.campPosition?.y.toFixed(0)})
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {islandState.clearings?.length || 0} clearing(s)
              </div>
            </div>
          </div>

          {/* Resource Breakdown */}
          <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-6">
            <h4 className="text-lg font-cinzel text-amber-300 mb-4">Resource Distribution</h4>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {Array.from(new Set(islandState.nodes?.map((n: any) => n.type) || [])).map((nodeType: any) => {
                const nodes = islandState.nodes?.filter((n: any) => n.type === nodeType) || [];
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
                  Terrain visualization: <span className="text-amber-300 font-bold capitalize">{islandState.mapStyle || 'fantasy'}</span>
                </p>
              </div>
              <div className="text-5xl">
                {islandState.mapStyle === 'fantasy' && '🌲'}
                {islandState.mapStyle === 'tactical' && '⚔️'}
                {islandState.mapStyle === 'iron' && '⚙️'}
                {islandState.mapStyle === 'night' && '🌙'}
                {!islandState.mapStyle && '🌍'}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-gradient-to-r from-amber-950/40 to-black/40 border border-amber-700/30 rounded-xl p-6">
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
                    ⚔️ Find Land & Launch
                  </>
                )}
              </Button>
            </div>
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
