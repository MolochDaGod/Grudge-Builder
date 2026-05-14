import { ATTRIBUTES, RACES, CLASSES, AttributeKey } from "@/lib/gameData";
import { motion } from "framer-motion";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CharacterCreatorState } from "./index";

const ATTRIBUTE_ICONS: Record<string, string> = {
  Strength: "💪",
  Vitality: "❤️",
  Endurance: "🛡️",
  Intellect: "🔮",
  Wisdom: "📖",
  Dexterity: "🎯",
  Agility: "⚡",
  Tactics: "🧠"
};

interface Step3StatsProps {
  state: CharacterCreatorState;
  updateState: (updates: Partial<CharacterCreatorState>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function Step3Stats({ state, updateState, onNext, onPrev }: Step3StatsProps) {
  const selectedRace = state.selectedRace ? RACES.find(r => r.id === state.selectedRace) : null;
  const selectedClass = state.selectedClass ? CLASSES.find(c => c.id === state.selectedClass) : null;

  const manualAttributes = state.attributes || {
    Strength: 0,
    Intellect: 0,
    Vitality: 0,
    Dexterity: 0,
    Endurance: 0,
    Wisdom: 0,
    Agility: 0,
    Tactics: 0
  };

  // Calculate total stats (base + manual)
  const totalStats: Record<AttributeKey, number> = {} as Record<AttributeKey, number>;
  (Object.keys(ATTRIBUTES) as AttributeKey[]).forEach(attr => {
    totalStats[attr] = (selectedRace?.baseStats[attr] || 0) + (selectedClass?.baseStats[attr] || 0) + (manualAttributes[attr] || 0);
  });

  const pointsSpent = Object.values(manualAttributes).reduce((sum, v) => sum + (v || 0), 0);
  const remainingPoints = 20 - pointsSpent;
  const canProceed = pointsSpent === 20;

  const handleAddPoint = (attr: AttributeKey) => {
    if (remainingPoints > 0) {
      updateState({
        attributes: {
          ...manualAttributes,
          [attr]: (manualAttributes[attr] || 0) + 1
        }
      });
    }
  };

  const handleRemovePoint = (attr: AttributeKey) => {
    if ((manualAttributes[attr] || 0) > 0) {
      updateState({
        attributes: {
          ...manualAttributes,
          [attr]: (manualAttributes[attr] || 0) - 1
        }
      });
    }
  };

  return (
    <motion.div
      key="step-3-stats"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="w-full"
    >
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-amber-400 mb-2">Allocate Attributes</h3>
        <p className="text-slate-400">You have 20 points to distribute. Every point matters in combat.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left: Stats Allocation */}
        <div className="lg:col-span-2 border border-amber-900/40 rounded-xl p-6 bg-slate-900/40">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h4 className="text-lg font-cinzel text-amber-200 mb-1">Attribute Allocation</h4>
              <p className="text-slate-500 text-sm">Fine tune your character's potential</p>
            </div>
            <div className="text-right">
              <div className={cn(
                "text-3xl font-bold",
                remainingPoints === 0 ? "text-green-400" : "text-amber-400"
              )}>
                {remainingPoints}
              </div>
              <div className="text-xs uppercase tracking-widest text-slate-500">Points Remaining</div>
            </div>
          </div>

          <div className="space-y-4">
            {(Object.keys(ATTRIBUTES) as AttributeKey[]).map(attr => (
              <div key={attr} className="group bg-black/20 rounded-lg p-3 border border-amber-900/30 hover:border-amber-600/50 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-slate-200 group-hover:text-amber-300 transition-colors flex items-center gap-2">
                    <span className="text-xl">{ATTRIBUTE_ICONS[attr]}</span>
                    <span>{attr}</span>
                    <span className="text-xs font-normal text-slate-500 bg-black/40 px-2 py-0.5 rounded">
                      Base: {(selectedRace?.baseStats[attr] || 0) + (selectedClass?.baseStats[attr] || 0)}
                    </span>
                  </label>
                  <span className="text-xl font-mono font-bold text-amber-200">{totalStats[attr]}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="icon"
                    variant="outline"
                    className="w-7 h-7 rounded-full border-amber-700/50 hover:border-amber-400 hover:text-amber-400 bg-black/30 text-xs"
                    onClick={() => handleRemovePoint(attr)}
                    disabled={(manualAttributes[attr] || 0) <= 0}
                  >
                    -
                  </Button>
                  <Progress
                    value={(totalStats[attr] / 30) * 100}
                    className="h-2 bg-black/50 flex-1"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="w-7 h-7 rounded-full border-amber-700/50 hover:border-amber-400 hover:text-amber-400 bg-black/30 text-xs"
                    onClick={() => handleAddPoint(attr)}
                    disabled={remainingPoints <= 0}
                  >
                    +
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Summary */}
        <div className="border border-slate-700 rounded-xl p-6 bg-slate-900/40 h-fit">
          <h4 className="text-lg font-cinzel text-amber-200 mb-4">Summary</h4>

          <div className="space-y-3 text-sm">
            <div>
              <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Race</div>
              <div className="text-amber-300 font-bold">{selectedRace?.name || "None"}</div>
            </div>

            <div>
              <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Class</div>
              <div className="text-amber-300 font-bold">{selectedClass?.name || "None"}</div>
            </div>

            <div className="border-t border-slate-700 pt-3">
              <div className="text-slate-400 text-xs uppercase tracking-widest mb-2">Point Distribution</div>
              <div className="space-y-1">
                {(Object.keys(ATTRIBUTES) as AttributeKey[])
                  .filter(attr => (manualAttributes[attr] || 0) > 0)
                  .map(attr => (
                    <div key={attr} className="flex justify-between text-xs">
                      <span className="text-slate-300">{attr}</span>
                      <span className="text-amber-400 font-bold">+{manualAttributes[attr]}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className={cn(
              "text-center py-2 rounded border-2",
              canProceed
                ? "border-green-600 bg-green-900/20 text-green-400 font-bold"
                : "border-amber-600/50 bg-amber-900/20 text-amber-300"
            )}>
              {canProceed ? "✓ Ready to proceed" : `${remainingPoints} points left`}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onPrev}
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}
