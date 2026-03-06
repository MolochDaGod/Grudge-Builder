import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { WEAPON_TYPES, WeaponType, Weapon, calculateWeaponStats, getWeaponSkillBonus, WeaponSkill } from '@shared/definitions/weaponDatabase';
import { ChevronLeft, ChevronRight, Star, Zap, Shield, Heart, Sparkles, Check, Plus, Minus } from 'lucide-react';

export interface WeaponSkillSelection {
  hotkey2: string | null;
  hotkey3: string | null;
}

interface WeaponSelectionPanelProps {
  selectedWeaponType: string | null;
  selectedWeaponId: string | null;
  selectedTier: number;
  weaponSkillLevel: number;
  skillSelections: Record<string, WeaponSkillSelection>;
  onSelectWeaponType: (typeId: string) => void;
  onSelectWeapon: (weaponId: string) => void;
  onSelectTier: (tier: number) => void;
  onSelectSkill: (weaponId: string, hotkey: 'hotkey2' | 'hotkey3', skillName: string) => void;
  onChangeSkillLevel: (level: number) => void;
}

export function WeaponSelectionPanel({
  selectedWeaponType,
  selectedWeaponId,
  selectedTier,
  weaponSkillLevel,
  skillSelections,
  onSelectWeaponType,
  onSelectWeapon,
  onSelectTier,
  onSelectSkill,
  onChangeSkillLevel,
}: WeaponSelectionPanelProps) {
  const [viewMode, setViewMode] = useState<'types' | 'weapons' | 'skills'>('types');
  
  const weaponTypes = Object.values(WEAPON_TYPES);
  const currentType = selectedWeaponType ? WEAPON_TYPES[selectedWeaponType] : null;
  const currentWeapon = currentType?.weapons.find(w => w.id === selectedWeaponId) || null;
  const weaponStats = currentWeapon ? calculateWeaponStats(currentWeapon, selectedTier) : null;
  const skillBonus = getWeaponSkillBonus(weaponSkillLevel);
  
  const currentSkillSelection = selectedWeaponId ? skillSelections[selectedWeaponId] : null;

  const handleSelectType = (typeId: string) => {
    onSelectWeaponType(typeId);
    setViewMode('weapons');
  };

  const handleSelectWeapon = (weaponId: string) => {
    onSelectWeapon(weaponId);
    setViewMode('skills');
  };

  const handleBack = () => {
    if (viewMode === 'skills') {
      setViewMode('weapons');
    } else if (viewMode === 'weapons') {
      setViewMode('types');
    }
  };

  const handleSkillLevelChange = (delta: number) => {
    const newLevel = Math.max(1, Math.min(100, weaponSkillLevel + delta));
    onChangeSkillLevel(newLevel);
  };

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {viewMode !== 'types' && (
            <button
              onClick={handleBack}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
              data-testid="btn-weapon-back"
            >
              <ChevronLeft className="w-5 h-5 text-slate-300" />
            </button>
          )}
          <h2 className="text-xl font-cinzel text-amber-400">
            {viewMode === 'types' && 'Select Weapon Type'}
            {viewMode === 'weapons' && currentType && `${currentType.icon} ${currentType.name} Weapons`}
            {viewMode === 'skills' && currentWeapon && currentWeapon.name}
          </h2>
        </div>
        
        {viewMode === 'skills' && currentWeapon && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm bg-slate-800 rounded-lg px-3 py-2">
              <span className="text-slate-400">Skill:</span>
              <button
                onClick={() => handleSkillLevelChange(-10)}
                className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                data-testid="btn-skill-level-minus-10"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleSkillLevelChange(-1)}
                className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                data-testid="btn-skill-level-minus"
              >
                -1
              </button>
              <span className="text-amber-400 font-bold min-w-[50px] text-center">{weaponSkillLevel}/100</span>
              <button
                onClick={() => handleSkillLevelChange(1)}
                className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                data-testid="btn-skill-level-plus"
              >
                +1
              </button>
              <button
                onClick={() => handleSkillLevelChange(10)}
                className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                data-testid="btn-skill-level-plus-10"
              >
                <Plus className="w-3 h-3" />
              </button>
              <span className="text-emerald-400">(+{skillBonus.toFixed(1)}%)</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(tier => (
                <button
                  key={tier}
                  onClick={() => onSelectTier(tier)}
                  className={cn(
                    "w-8 h-8 rounded text-sm font-bold transition-all",
                    selectedTier === tier
                      ? "bg-amber-500 text-black"
                      : selectedTier >= tier
                        ? "bg-amber-500/30 text-amber-400 border border-amber-500/50"
                        : "bg-slate-800 text-slate-500 border border-slate-700"
                  )}
                  data-testid={`btn-weapon-tier-${tier}`}
                >
                  T{tier}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'types' && (
          <motion.div
            key="types"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-4 gap-4"
          >
            {weaponTypes.map(type => (
              <button
                key={type.id}
                onClick={() => handleSelectType(type.id)}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all hover:scale-105",
                  selectedWeaponType === type.id
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-slate-700 bg-slate-800/50 hover:border-slate-500"
                )}
                data-testid={`btn-weapon-type-${type.id.toLowerCase()}`}
              >
                <div className="text-4xl mb-2">{type.icon}</div>
                <div className="text-white font-semibold">{type.name}</div>
                <div className={cn(
                  "text-xs mt-1 uppercase tracking-wider",
                  type.category === 'melee' ? "text-red-400" : 
                  type.category === 'ranged' ? "text-green-400" : "text-purple-400"
                )}>
                  {type.category}
                </div>
              </button>
            ))}
          </motion.div>
        )}

        {viewMode === 'weapons' && currentType && (
          <motion.div
            key="weapons"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-3 gap-4"
          >
            {currentType.weapons.map(weapon => {
              const stats = calculateWeaponStats(weapon, selectedTier);
              return (
                <button
                  key={weapon.id}
                  onClick={() => handleSelectWeapon(weapon.id)}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all hover:scale-102 text-left",
                    selectedWeaponId === weapon.id
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-slate-700 bg-slate-800/50 hover:border-slate-500"
                  )}
                  data-testid={`btn-weapon-${weapon.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-amber-400 font-semibold text-sm">{weapon.name}</h3>
                    <span className="text-2xl">{currentType.icon}</span>
                  </div>
                  <p className="text-slate-400 text-xs italic mb-3 line-clamp-2">{weapon.lore}</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-red-400" />
                      <span className="text-slate-300">{stats.damage}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-green-400" />
                      <span className="text-slate-300">{stats.hp}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-blue-400" />
                      <span className="text-slate-300">{stats.mana}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-amber-400" />
                      <span className="text-slate-300">{stats.defense}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}

        {viewMode === 'skills' && currentWeapon && weaponStats && (
          <motion.div
            key="skills"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="text-amber-400 font-semibold mb-3 flex items-center gap-2">
                    <span className="text-2xl">{currentType?.icon}</span>
                    {currentWeapon.name} - T{selectedTier}
                  </h3>
                  <p className="text-slate-400 text-sm italic mb-4">{currentWeapon.lore}</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-red-400" />
                      <span className="text-slate-400 text-sm">Damage:</span>
                      <span className="text-white font-bold">{weaponStats.damage}</span>
                      <span className="text-emerald-400 text-xs">(+{(weaponStats.damage * skillBonus / 100).toFixed(1)})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-green-400" />
                      <span className="text-slate-400 text-sm">HP:</span>
                      <span className="text-white font-bold">{weaponStats.hp}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <span className="text-slate-400 text-sm">Mana:</span>
                      <span className="text-white font-bold">{weaponStats.mana}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-400" />
                      <span className="text-slate-400 text-sm">Defense:</span>
                      <span className="text-white font-bold">{weaponStats.defense}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="text-slate-400 text-sm">Crit:</span>
                      <span className="text-white font-bold">{weaponStats.crit}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-400 text-sm">Block:</span>
                      <span className="text-white font-bold">{weaponStats.block}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h4 className="text-emerald-400 font-semibold mb-3">Passive Bonuses</h4>
                  <div className="space-y-2">
                    {currentWeapon.skills.passive.map((passive, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-amber-400">{passive.name}:</span>
                        <span className="text-slate-300">{passive.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-red-900/50">
                  <div className="flex items-center gap-2 mb-2">
                    <kbd className="px-2 py-1 bg-red-900/50 rounded text-red-400 text-sm font-mono">1</kbd>
                    <span className="text-red-400 font-semibold">Primary Attack</span>
                    <Check className="w-4 h-4 text-green-500 ml-auto" />
                  </div>
                  <h4 className="text-white font-semibold">{currentWeapon.skills.hotkey1.name}</h4>
                  <p className="text-slate-400 text-sm">{currentWeapon.skills.hotkey1.description}</p>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4 border border-orange-900/50">
                  <div className="flex items-center gap-2 mb-2">
                    <kbd className="px-2 py-1 bg-orange-900/50 rounded text-orange-400 text-sm font-mono">2</kbd>
                    <span className="text-orange-400 font-semibold">Secondary Skill</span>
                    <span className="text-xs text-slate-500 ml-auto">Click to select</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {currentWeapon.skills.hotkey2.map((skill, i) => {
                      const isSelected = currentSkillSelection?.hotkey2 === skill.name;
                      return (
                        <button
                          key={i}
                          onClick={() => onSelectSkill(currentWeapon.id, 'hotkey2', skill.name)}
                          className={cn(
                            "flex items-start gap-2 text-sm rounded p-2 text-left transition-all",
                            isSelected
                              ? "bg-orange-500/20 border border-orange-500"
                              : "bg-slate-900/50 hover:bg-slate-800 border border-transparent"
                          )}
                          data-testid={`btn-skill-hotkey2-${i}`}
                        >
                          {isSelected && <Check className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />}
                          <div>
                            <span className="text-orange-400 font-semibold">{skill.name}</span>
                            <span className="text-slate-400 block">- {skill.description}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4 border border-yellow-900/50">
                  <div className="flex items-center gap-2 mb-2">
                    <kbd className="px-2 py-1 bg-yellow-900/50 rounded text-yellow-400 text-sm font-mono">3</kbd>
                    <span className="text-yellow-400 font-semibold">Ability Skill</span>
                    <span className="text-xs text-slate-500 ml-auto">Click to select</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {currentWeapon.skills.hotkey3.map((skill, i) => {
                      const isSelected = currentSkillSelection?.hotkey3 === skill.name;
                      return (
                        <button
                          key={i}
                          onClick={() => onSelectSkill(currentWeapon.id, 'hotkey3', skill.name)}
                          className={cn(
                            "flex items-start gap-2 text-sm rounded p-2 text-left transition-all",
                            isSelected
                              ? "bg-yellow-500/20 border border-yellow-500"
                              : "bg-slate-900/50 hover:bg-slate-800 border border-transparent"
                          )}
                          data-testid={`btn-skill-hotkey3-${i}`}
                        >
                          {isSelected && <Check className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />}
                          <div>
                            <span className="text-yellow-400 font-semibold">{skill.name}</span>
                            <span className="text-slate-400 block">- {skill.description}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4 border border-purple-900/50">
                  <div className="flex items-center gap-2 mb-2">
                    <kbd className="px-2 py-1 bg-purple-900/50 rounded text-purple-400 text-sm font-mono">4</kbd>
                    <span className="text-purple-400 font-semibold">Ultimate</span>
                    <Check className="w-4 h-4 text-green-500 ml-auto" />
                  </div>
                  <h4 className="text-white font-semibold">{currentWeapon.skills.hotkey4.name}</h4>
                  <p className="text-slate-400 text-sm">{currentWeapon.skills.hotkey4.description}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
