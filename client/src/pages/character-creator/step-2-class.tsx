import { CLASSES, RACES, FACTION_COLORS } from "@/lib/gameData";
import { motion } from "framer-motion";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import SpriteAnimator from "@/components/SpriteAnimator";
import { getSpriteSetForCharacter } from "@/lib/gameData";
import { CharacterCreatorState } from "./index";

const FACTION_GRADIENTS: Record<string, string> = {
  Crusade: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0c1929 100%)',
  Legion:  'linear-gradient(135deg, #1a0a0a 0%, #4a1111 40%, #1a0505 100%)',
  Fabled:  'linear-gradient(135deg, #0a1a0a 0%, #1a4a1a 40%, #051a05 100%)',
};

interface Step2ClassProps {
  state: CharacterCreatorState;
  updateState: (updates: Partial<CharacterCreatorState>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function Step2Class({ state, updateState, onNext, onPrev }: Step2ClassProps) {
  const selectedRace = state.selectedRace ? RACES.find(r => r.id === state.selectedRace) : null;
  const selectedClassId = state.selectedClass;

  const handleSelectClass = (classId: string) => {
    updateState({ selectedClass: classId });
  };

  const handleConfirm = () => {
    if (state.selectedClass) {
      onNext();
    }
  };

  return (
    <motion.div
      key="step-2-class"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full"
    >
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-amber-400 mb-2">Choose Your Class</h3>
        <p className="text-slate-400">
          {selectedRace?.name} — Select a class to define your combat style and abilities.
        </p>
      </div>

      {!selectedClassId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CLASSES.map((cls) => {
            const previewSprite = selectedRace ? getSpriteSetForCharacter(selectedRace.id, cls.id) : 'Soldier';
            return (
              <div
                key={cls.id}
                onClick={() => handleSelectClass(cls.id)}
                className={cn(
                  "group relative flex items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all overflow-hidden",
                  "hover:bg-white/5 hover:border-amber-600/50 hover:-translate-y-1",
                  "border-white/10 bg-black/20"
                )}
              >
                {/* Faction-tinted glow on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    background: FACTION_GRADIENTS[selectedRace?.faction || 'Crusade'],
                    opacity: 0.15
                  }}
                />

                {/* Sprite preview */}
                <div className="relative w-16 h-16 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                  <div className="scale-[1.4] transform">
                    <SpriteAnimator
                      spriteSet={previewSprite}
                      action="Idle"
                      isUndead={selectedRace?.id === 'undead'}
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="relative z-10 flex-1 min-w-0">
                  <h3 className="text-xl text-white font-cinzel font-bold group-hover:text-amber-300 transition-colors">
                    {cls.name}
                  </h3>
                  <div className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                    {cls.role}
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400 font-normal normal-case">{cls.startingWeapon}</span>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2">{cls.description}</p>

                  {/* Stat bonuses */}
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {Object.entries(cls.baseStats)
                      .filter(([_, v]) => v > 0)
                      .map(([k, v]) => (
                        <span
                          key={k}
                          className="text-[10px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5"
                        >
                          <span className="text-amber-400">+{v}</span>{' '}
                          <span className="text-slate-500">{k.slice(0, 3)}</span>
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-3xl mx-auto"
        >
          {(() => {
            const cls = CLASSES.find(c => c.id === selectedClassId);
            if (!cls) return null;

            return (
              <div className="bg-slate-900/40 border-2 border-amber-600/50 rounded-xl p-6 shadow-2xl">
                <div className="flex items-center gap-4 mb-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => updateState({ selectedClass: undefined })}
                    className="rounded-full border border-white/20 hover:bg-white/10"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div>
                    <h2 className="text-3xl text-white font-cinzel font-bold">{cls.name}</h2>
                    <div className="text-amber-400 font-bold uppercase tracking-wider text-sm">{cls.role}</div>
                  </div>
                </div>

                <div className="bg-black/30 rounded-lg p-4 mb-6 border border-white/10 text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">
                  {cls.description}
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => updateState({ selectedClass: undefined })}
                    className="border-white/20 text-gray-300 hover:text-white"
                  >
                    Back
                  </Button>
                  <Button
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
                    onClick={handleConfirm}
                  >
                    Confirm Path <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={onPrev}
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!selectedClassId}
          className="bg-amber-600 hover:bg-amber-500 text-white"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}
