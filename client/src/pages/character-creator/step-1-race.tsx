import { RACES, FACTION_COLORS } from "@/lib/gameData";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
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
const DEFAULT_BG_GRADIENT = 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 30%, #16213e 60%, #0f0f1a 100%)';

interface Step1RaceProps {
  state: CharacterCreatorState;
  updateState: (updates: Partial<CharacterCreatorState>) => void;
  onNext: () => void;
}

export default function Step1Race({ state, updateState, onNext }: Step1RaceProps) {
  const handleSelectRace = (raceId: string) => {
    const race = RACES.find(r => r.id === raceId);
    if (race) {
      updateState({ selectedRace: raceId });
    }
  };

  const handleConfirm = () => {
    if (state.selectedRace) {
      onNext();
    }
  };

  return (
    <motion.div
      key="step-1-race"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full"
    >
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-amber-400 mb-2">Choose Your Race</h3>
        <p className="text-slate-400">Every race brings unique strengths. Select one to begin your journey.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {RACES.map((race) => (
          <div
            key={race.id}
            onClick={() => handleSelectRace(race.id)}
            className={cn(
              "group relative cursor-pointer transition-all duration-300 transform hover:-translate-y-2",
              "border-4 bg-card overflow-hidden rounded-xl min-h-[400px]",
              state.selectedRace === race.id
                ? cn(FACTION_COLORS[race.faction].border, FACTION_COLORS[race.faction].glow, "scale-105 z-10 shadow-2xl")
                : "border-transparent hover:border-white/20 opacity-80 hover:opacity-100"
            )}
          >
            {/* Card Background */}
            <img
              src={race.cardBg}
              alt=""
              className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
            />

            {/* Faction Badge */}
            <div className={cn(
              "absolute top-0 right-0 px-3 py-2 rounded-bl-xl font-bold uppercase tracking-widest text-xs z-20",
              FACTION_COLORS[race.faction].bg,
              FACTION_COLORS[race.faction].text
            )}>
              {race.faction}
            </div>

            {/* Character Image Section */}
            <div className="aspect-[3/4] relative overflow-hidden z-[1] flex flex-col justify-end">
              {/* Gradient fallback */}
              <div className="absolute inset-0 z-0" style={{ background: FACTION_GRADIENTS[race.faction] || DEFAULT_BG_GRADIENT }} />

              {/* Sprite preview as fallback */}
              <div className="absolute inset-0 flex items-center justify-center z-[1] opacity-20">
                <div className="scale-[3] transform">
                  <SpriteAnimator spriteSet={getSpriteSetForCharacter(race.id, 'warrior')} action="Idle" isUndead={race.id === 'undead'} />
                </div>
              </div>

              {/* Race portrait image */}
              <img
                src={race.image}
                alt={race.name}
                className="w-full h-full object-cover relative z-[2] group-hover:scale-110 transition-transform duration-700"
              />

              {/* Darken overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90 pointer-events-none" />
            </div>

            {/* Content */}
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent z-10">
              <h3 className="text-2xl text-white mb-2 font-cinzel font-bold">{race.name}</h3>
              <p className="text-sm text-gray-300 mb-3 line-clamp-2 leading-relaxed">{race.description}</p>

              {/* Base Stats Preview */}
              <div className="grid grid-cols-4 gap-1 text-xs mb-3">
                {Object.entries(race.baseStats)
                  .filter(([_, v]) => v > 0)
                  .slice(0, 4)
                  .map(([k, v]) => (
                    <div key={k} className="bg-white/10 rounded px-1.5 py-1 text-center">
                      <span className="text-amber-400 font-bold">+{v}</span>
                      <div className="text-gray-400 text-[10px]">{k.slice(0, 3)}</div>
                    </div>
                  ))}
              </div>

              {/* Confirm Button */}
              {state.selectedRace === race.id && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-2"
                >
                  <Button
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirm();
                    }}
                  >
                    Confirm {race.name} <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
