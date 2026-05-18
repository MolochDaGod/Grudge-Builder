import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CharacterCreatorState } from "./index";
import HomeIslandPreview from "@/components/HomeIslandPreview";
import { normalizeHomeIslandResponse } from "@/lib/homeIslandApi";

interface Step5IslandIntroProps {
  state: CharacterCreatorState;
  updateState: (updates: Partial<CharacterCreatorState>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function Step5IslandIntro({ state, updateState, onNext, onPrev }: Step5IslandIntroProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [islandGenerated, setIslandGenerated] = useState(false);

  useEffect(() => {
    if (!islandGenerated && state.character) {
      generateIsland();
    }
  }, [state.character, islandGenerated]);

  const generateIsland = async () => {
    if (!state.character?.id) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/characters/${state.character.id}/generate-island`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        throw new Error("Failed to generate island");
      }

      const islandState = normalizeHomeIslandResponse(await response.json());
      updateState({
        homeIsland: islandState,
        islandState: islandState.state
      });
      setIslandGenerated(true);

      toast({
        title: "Island Generated",
        description: "Your home island has been created!"
      });
    } catch (error) {
      console.error("Island generation failed:", error);
      toast({
        title: "Error",
        description: "Failed to generate island. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const islandState = state.islandState;
  const islandDto = state.homeIsland ? normalizeHomeIslandResponse(state.homeIsland) : null;

  return (
    <motion.div
      key="step-5-island-intro"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full"
    >
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-amber-400 mb-2">Your Home Island</h3>
        <p className="text-slate-400">Preview your character's home island where they'll gather resources and build their empire.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-900/40 border border-slate-700 rounded-xl">
          <Loader2 className="w-12 h-12 text-amber-400 animate-spin mb-4" />
          <p className="text-slate-300">Generating your island...</p>
        </div>
      ) : islandState ? (
        <div className="space-y-6 mb-8">
          {islandDto && (
            <HomeIslandPreview island={islandDto} className="min-h-[320px]" />
          )}

          {/* Island Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
              <div className="text-xs text-slate-400 uppercase tracking-widest mb-2">Resource Nodes</div>
              <div className="text-3xl font-bold text-amber-400">{islandDto?.state.nodes.length || islandState.nodes?.length || 0}</div>
              <p className="text-xs text-slate-500 mt-1">Ready to harvest</p>
            </div>

            <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
              <div className="text-xs text-slate-400 uppercase tracking-widest mb-2">Animals</div>
              <div className="text-3xl font-bold text-amber-400">{islandDto?.state.animals.length || 0}</div>
              <p className="text-xs text-slate-500 mt-1">Wildlife on the island</p>
            </div>

            <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
              <div className="text-xs text-slate-400 uppercase tracking-widest mb-2">Terrain Zones</div>
              <div className="text-3xl font-bold text-amber-400">{islandDto?.state.terrainZones.length || islandState.terrainZones?.length || 0}</div>
              <p className="text-xs text-slate-500 mt-1">Different biomes</p>
            </div>
          </div>

          {/* Resource Breakdown */}
          <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-6">
            <h4 className="text-lg font-cinzel text-amber-300 mb-4">Island Resources</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from(new Set((islandDto?.state.nodes || islandState.nodes || []).map((n: any) => n.type) || [])).map((nodeType: any) => {
                const count = (islandDto?.state.nodes || islandState.nodes || []).filter((n: any) => n.type === nodeType).length || 0;
                return (
                  <div key={nodeType} className="bg-black/30 border border-slate-600 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">
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
                    <div className="text-sm font-bold text-amber-300">{count}</div>
                    <div className="text-xs text-slate-400 capitalize">{nodeType}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-xl p-6">
            <p className="text-slate-400 text-sm mb-4">
              Explore the real generated island layout that will feed your 2D and 3D play modes. When you're ready, proceed to finalize your settlement.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={generateIsland}
              >
                🔄 Generate New Island
              </Button>
              <Button
                onClick={onNext}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold flex-1"
              >
                Looks Good <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={onPrev}
          disabled={isLoading}
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
    </motion.div>
  );
}
