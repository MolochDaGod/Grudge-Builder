import { useState, useEffect } from "react";
import { RACES, CLASSES } from "@/lib/gameData";
import { motion } from "framer-motion";
import { ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { characterAPI } from "@/lib/api";
import SpriteAnimator from "@/components/SpriteAnimator";
import { getSpriteSetForCharacter } from "@/lib/gameData";
import { CharacterCreatorState } from "./index";

interface Step4AvatarProps {
  state: CharacterCreatorState;
  updateState: (updates: Partial<CharacterCreatorState>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function Step4Avatar({ state, updateState, onNext, onPrev }: Step4AvatarProps) {
  const { toast } = useToast();
  const [isMinting, setIsMinting] = useState(false);

  const selectedRace = state.selectedRace ? RACES.find(r => r.id === state.selectedRace) : null;
  const selectedClass = state.selectedClass ? CLASSES.find(c => c.id === state.selectedClass) : null;

  const spriteConfig = state.spriteConfig || {
    palette: {
      skinTone: 0,
      hairColor: 0,
      armorColor: 0,
      clothColor: 0
    }
  };

  const handleUpdatePalette = (key: string, value: number) => {
    updateState({
      spriteConfig: {
        palette: {
          ...spriteConfig.palette,
          [key]: value
        }
      }
    });
  };

  const handleMintCharacter = async () => {
    if (!selectedRace || !selectedClass || !state.attributes) {
      toast({
        title: "Error",
        description: "Missing required character data",
        variant: "destructive"
      });
      return;
    }

    setIsMinting(true);
    try {
      // Call the backend to create character, generate sprite, and mint cNFT
      const response = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          race: selectedRace.id,
          class: selectedClass.id,
          attributes: state.attributes,
          spriteConfig: spriteConfig
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create character");
      }

      const character = await response.json();
      updateState({
        character: character,
        spriteConfig: spriteConfig
      });

      toast({
        title: "Success",
        description: "Character created and minted as cNFT!"
      });

      // Proceed to next step
      onNext();
    } catch (error) {
      console.error("Character creation failed:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create character",
        variant: "destructive"
      });
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <motion.div
      key="step-4-avatar"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="w-full"
    >
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-amber-400 mb-2">Customize Avatar</h3>
        <p className="text-slate-400">Personalize your character's appearance with color customization.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Left: Color Sliders */}
        <div className="space-y-6">
          {/* Skin Tone */}
          <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-5">
            <label className="text-sm font-bold text-amber-300 mb-3 block">
              Skin Tone
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="360"
                step="10"
                value={spriteConfig.palette.skinTone}
                onChange={(e) => handleUpdatePalette("skinTone", parseInt(e.target.value))}
                className="w-full accent-orange-400"
              />
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Hue</span>
                <span className="font-mono">{spriteConfig.palette.skinTone}°</span>
              </div>
              <div
                className="w-full h-8 rounded border border-slate-600"
                style={{
                  backgroundColor: `hsl(${spriteConfig.palette.skinTone}, 50%, 55%)`
                }}
              />
            </div>
          </div>

          {/* Hair Color */}
          <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-5">
            <label className="text-sm font-bold text-amber-300 mb-3 block">
              Hair Color
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="360"
                step="10"
                value={spriteConfig.palette.hairColor}
                onChange={(e) => handleUpdatePalette("hairColor", parseInt(e.target.value))}
                className="w-full accent-yellow-400"
              />
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Hue</span>
                <span className="font-mono">{spriteConfig.palette.hairColor}°</span>
              </div>
              <div
                className="w-full h-8 rounded border border-slate-600"
                style={{
                  backgroundColor: `hsl(${spriteConfig.palette.hairColor}, 80%, 45%)`
                }}
              />
            </div>
          </div>

          {/* Armor Color */}
          <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-5">
            <label className="text-sm font-bold text-amber-300 mb-3 block">
              Armor Color
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="360"
                step="10"
                value={spriteConfig.palette.armorColor}
                onChange={(e) => handleUpdatePalette("armorColor", parseInt(e.target.value))}
                className="w-full accent-slate-400"
              />
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Hue</span>
                <span className="font-mono">{spriteConfig.palette.armorColor}°</span>
              </div>
              <div
                className="w-full h-8 rounded border border-slate-600"
                style={{
                  backgroundColor: `hsl(${spriteConfig.palette.armorColor}, 20%, 40%)`
                }}
              />
            </div>
          </div>

          {/* Cloth Color */}
          <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-5">
            <label className="text-sm font-bold text-amber-300 mb-3 block">
              Cloth Color
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="360"
                step="10"
                value={spriteConfig.palette.clothColor}
                onChange={(e) => handleUpdatePalette("clothColor", parseInt(e.target.value))}
                className="w-full accent-blue-400"
              />
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Hue</span>
                <span className="font-mono">{spriteConfig.palette.clothColor}°</span>
              </div>
              <div
                className="w-full h-8 rounded border border-slate-600"
                style={{
                  backgroundColor: `hsl(${spriteConfig.palette.clothColor}, 70%, 50%)`
                }}
              />
            </div>
          </div>
        </div>

        {/* Right: Sprite Preview + Summary */}
        <div className="space-y-6">
          {/* Sprite Preview */}
          <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px]">
            <div className="scale-[3] transform mb-4">
              <SpriteAnimator
                spriteSet={getSpriteSetForCharacter(selectedRace?.id || 'human', selectedClass?.id || 'warrior')}
                action="Idle"
                isUndead={selectedRace?.id === 'undead'}
              />
            </div>
            <p className="text-sm text-slate-400 text-center">Live preview of your character</p>
          </div>

          {/* Character Summary */}
          <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-6">
            <h4 className="text-lg font-cinzel text-amber-200 mb-4">Character Summary</h4>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Race</span>
                <span className="text-amber-300 font-bold">{selectedRace?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Class</span>
                <span className="text-amber-300 font-bold">{selectedClass?.name}</span>
              </div>

              <div className="border-t border-slate-600 pt-3">
                <div className="text-xs text-slate-500 uppercase tracking-widest mb-2">Attributes</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {state.attributes && Object.entries(state.attributes)
                    .filter(([_, v]) => v > 0)
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between text-slate-300">
                        <span>{k}</span>
                        <span className="text-amber-400 font-bold">+{v}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="border-t border-slate-600 pt-3">
                <div className="text-xs text-slate-500 uppercase tracking-widest mb-2">Palette</div>
                <div className="text-xs text-slate-400">
                  <div>Skin: {spriteConfig.palette.skinTone}°</div>
                  <div>Hair: {spriteConfig.palette.hairColor}°</div>
                  <div>Armor: {spriteConfig.palette.armorColor}°</div>
                  <div>Cloth: {spriteConfig.palette.clothColor}°</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mint Button */}
      <div className="bg-gradient-to-r from-amber-950/50 to-black/50 border border-amber-700/30 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-cinzel text-amber-300 mb-1">Ready to Mint?</h4>
            <p className="text-slate-400 text-sm">Create your character as a Solana cNFT on the blockchain</p>
          </div>
          <Button
            onClick={handleMintCharacter}
            disabled={isMinting}
            className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold px-8"
          >
            {isMinting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Minting...
              </>
            ) : (
              <>
                ✨ Mint Character
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onPrev}
          disabled={isMinting}
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="text-sm text-slate-500">
          Complete the mint to proceed →
        </div>
      </div>
    </motion.div>
  );
}
