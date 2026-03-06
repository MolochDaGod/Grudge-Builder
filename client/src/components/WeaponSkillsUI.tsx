import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { 
  WEAPON_SKILL_TREES, 
  getSkillsForSlot, 
  getMaxUpgradesForSlot,
  calculateSkillDamage,
  calculateSkillCooldown,
  getUpgradeEffect,
  type WeaponSkill,
} from "@shared/definitions/weaponSkills";

interface SkillSlot {
  skillId: string | null;
  upgradeLevel: number;
}

interface SkillLoadout {
  slots: {
    1: SkillSlot;
    2: SkillSlot;
    3: SkillSlot;
    4: SkillSlot;
  };
}

interface WeaponSkillsUIProps {
  weaponType: string;
  characterLevel: number;
  skillPoints: number;
  currentLoadout: SkillLoadout | null;
  onUpdateLoadout: (loadout: SkillLoadout) => void;
  onSpendSkillPoint: () => void;
}

export function WeaponSkillsUI({
  weaponType,
  characterLevel,
  skillPoints,
  currentLoadout,
  onUpdateLoadout,
  onSpendSkillPoint
}: WeaponSkillsUIProps) {
  const [selectedSlot, setSelectedSlot] = useState<1 | 2 | 3 | 4>(1);
  
  const defaultLoadout: SkillLoadout = {
    slots: {
      1: { skillId: null, upgradeLevel: 0 },
      2: { skillId: null, upgradeLevel: 0 },
      3: { skillId: null, upgradeLevel: 0 },
      4: { skillId: null, upgradeLevel: 0 }
    }
  };
  
  const [loadout, setLoadout] = useState<SkillLoadout>(() => {
    return currentLoadout || defaultLoadout;
  });

  useEffect(() => {
    setLoadout(currentLoadout || defaultLoadout);
  }, [weaponType, currentLoadout]);

  const skillTree = WEAPON_SKILL_TREES[weaponType];
  if (!skillTree) {
    return <div className="text-muted-foreground">No skills available for this weapon type.</div>;
  }

  const slotSkills = getSkillsForSlot(weaponType, selectedSlot);
  const maxUpgrades = getMaxUpgradesForSlot(selectedSlot);
  const currentSlotData = loadout.slots[selectedSlot];
  const selectedSkill = slotSkills.find(s => s.id === currentSlotData.skillId);

  const selectSkill = (skill: WeaponSkill) => {
    const newLoadout = {
      ...loadout,
      slots: {
        ...loadout.slots,
        [selectedSlot]: { skillId: skill.id, upgradeLevel: currentSlotData.upgradeLevel }
      }
    };
    setLoadout(newLoadout);
    onUpdateLoadout(newLoadout);
  };

  const upgradeSkill = () => {
    if (!selectedSkill || skillPoints <= 0) return;
    if (currentSlotData.upgradeLevel >= maxUpgrades) return;

    const newLoadout = {
      ...loadout,
      slots: {
        ...loadout.slots,
        [selectedSlot]: { 
          skillId: currentSlotData.skillId, 
          upgradeLevel: currentSlotData.upgradeLevel + 1 
        }
      }
    };
    setLoadout(newLoadout);
    onUpdateLoadout(newLoadout);
    onSpendSkillPoint();
  };

  const getSlotLabel = (slot: number) => {
    if (slot === 4) return "Ultimate";
    return `Skill ${slot}`;
  };

  const getSlotColor = (slot: number) => {
    if (slot === 4) return "bg-purple-600";
    return "bg-amber-600";
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-amber-400 font-cinzel">
              {weaponType} Skills
            </h2>
            <p className="text-muted-foreground text-sm">
              Equip and upgrade abilities for your weapon
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-4 py-2 border-green-500 text-green-400">
              Skill Points: {skillPoints}
            </Badge>
            <Badge variant="outline" className="text-lg px-4 py-2 border-amber-500 text-amber-400">
              Level {characterLevel}
            </Badge>
          </div>
        </div>

        <div className="flex gap-4 justify-center" data-testid="skill-slots-bar">
          {([1, 2, 3, 4] as const).map((slot) => {
            const slotData = loadout.slots[slot];
            const skill = skillTree.skills.find(s => s.id === slotData.skillId);
            const maxUp = getMaxUpgradesForSlot(slot);
            
            return (
              <motion.button
                key={slot}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedSlot(slot)}
                className={`relative w-20 h-20 rounded-lg border-3 transition-all ${
                  selectedSlot === slot 
                    ? "border-amber-400 shadow-lg shadow-amber-400/30" 
                    : "border-gray-600 hover:border-gray-400"
                } ${getSlotColor(slot)} bg-opacity-20`}
                data-testid={`skill-slot-${slot}`}
              >
                <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-gray-900 border-2 border-amber-500 flex items-center justify-center font-bold text-amber-400">
                  {slot}
                </div>
                <div className="text-3xl">{skill?.icon || "?"}</div>
                {slotData.skillId && (
                  <div className="absolute -bottom-2 right-0 left-0 flex justify-center">
                    <Badge className="text-xs bg-gray-900 border border-amber-500">
                      {slotData.upgradeLevel}/{maxUp}
                    </Badge>
                  </div>
                )}
                <div className="absolute -bottom-6 text-xs text-muted-foreground">
                  {getSlotLabel(slot)}
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Card className="bg-gray-900/80 border-gray-700">
            <CardHeader>
              <CardTitle className="text-amber-400">
                Available Skills for Slot {selectedSlot}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AnimatePresence mode="popLayout">
                {slotSkills.map((skill) => (
                  <motion.div
                    key={skill.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={currentSlotData.skillId === skill.id ? "default" : "outline"}
                          className={`w-full justify-start gap-3 h-auto py-3 ${
                            currentSlotData.skillId === skill.id 
                              ? "bg-amber-600 hover:bg-amber-500" 
                              : "hover:bg-gray-800"
                          }`}
                          onClick={() => selectSkill(skill)}
                          data-testid={`skill-option-${skill.id}`}
                        >
                          <span className="text-2xl">{skill.icon}</span>
                          <div className="text-left">
                            <div className="font-semibold">{skill.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {skill.baseDamage > 0 ? `${skill.baseDamage} Damage` : "Utility"} | {skill.cooldown}s CD
                            </div>
                          </div>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <div className="space-y-2">
                          <p className="font-semibold text-amber-400">{skill.name}</p>
                          <p className="text-sm">{skill.description}</p>
                          <div className="text-xs text-muted-foreground">
                            <div>Mana Cost: {skill.manaCost}</div>
                            <div>Effects: {skill.effects.join(", ")}</div>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </motion.div>
                ))}
              </AnimatePresence>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/80 border-gray-700">
            <CardHeader>
              <CardTitle className="text-amber-400">
                {selectedSkill ? selectedSkill.name : "Select a Skill"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedSkill ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <span className="text-6xl">{selectedSkill.icon}</span>
                  </div>
                  
                  <p className="text-muted-foreground">{selectedSkill.description}</p>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-800 p-3 rounded">
                      <div className="text-muted-foreground">Damage</div>
                      <div className="text-xl font-bold text-red-400">
                        {calculateSkillDamage(selectedSkill, currentSlotData.upgradeLevel)}
                      </div>
                    </div>
                    <div className="bg-gray-800 p-3 rounded">
                      <div className="text-muted-foreground">Cooldown</div>
                      <div className="text-xl font-bold text-blue-400">
                        {calculateSkillCooldown(selectedSkill, currentSlotData.upgradeLevel).toFixed(1)}s
                      </div>
                    </div>
                    <div className="bg-gray-800 p-3 rounded">
                      <div className="text-muted-foreground">Mana Cost</div>
                      <div className="text-xl font-bold text-cyan-400">
                        {selectedSkill.manaCost}
                      </div>
                    </div>
                    <div className="bg-gray-800 p-3 rounded">
                      <div className="text-muted-foreground">Upgrade</div>
                      <div className="text-xl font-bold text-amber-400">
                        {currentSlotData.upgradeLevel}/{maxUpgrades}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 p-3 rounded">
                    <div className="text-muted-foreground mb-2">Base Effects</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedSkill.effects.map((effect, i) => (
                        <Badge key={i} variant="secondary">{effect}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-muted-foreground">Upgrade Path</div>
                    {selectedSkill.upgradeEffects.map((effect, i) => (
                      <div 
                        key={i} 
                        className={`flex items-center gap-2 p-2 rounded text-sm ${
                          i < currentSlotData.upgradeLevel 
                            ? "bg-green-900/30 text-green-400" 
                            : i === currentSlotData.upgradeLevel
                            ? "bg-amber-900/30 text-amber-400 border border-amber-500"
                            : "bg-gray-800 text-gray-500"
                        }`}
                      >
                        <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center">
                          {i + 1}
                        </Badge>
                        <span>{effect}</span>
                        {i < currentSlotData.upgradeLevel && <span className="ml-auto">✓</span>}
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full bg-green-600 hover:bg-green-500"
                    disabled={skillPoints <= 0 || currentSlotData.upgradeLevel >= maxUpgrades}
                    onClick={upgradeSkill}
                    data-testid="upgrade-skill-btn"
                  >
                    {currentSlotData.upgradeLevel >= maxUpgrades 
                      ? "Max Level Reached" 
                      : skillPoints <= 0 
                      ? "No Skill Points" 
                      : `Upgrade (1 Skill Point)`}
                  </Button>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  Select a skill from the left panel to view details and upgrades
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
