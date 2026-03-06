import { useState, MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  WEAPON_TYPE_DEFINITIONS, 
  WeaponTypeDefinition, 
  WeaponSkillOption, 
  SlotType,
  SelectedSkills 
} from '@shared/definitions/weaponSkillsNew';

interface WeaponSkillTreeNewProps {
  weaponType: string;
  playerTier: number;
  selectedSkills: SelectedSkills;
  onSelectSkill: (slotType: SlotType, skillId: string) => void;
  onReset: () => void;
}

const SLOT_COLORS: Record<SlotType, { border: string; bg: string; text: string }> = {
  primary: { border: 'border-amber-500', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  secondary: { border: 'border-blue-500', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  ability: { border: 'border-purple-500', bg: 'bg-purple-500/20', text: 'text-purple-400' },
  ultimate: { border: 'border-red-500', bg: 'bg-red-500/20', text: 'text-red-400' },
};

const SLOT_LABELS: Record<SlotType, string> = {
  primary: 'PRIMARY',
  secondary: 'SECONDARY',
  ability: 'ABILITY',
  ultimate: 'ULTIMATE',
};

export function WeaponSkillTreeNew({ 
  weaponType, 
  playerTier, 
  selectedSkills, 
  onSelectSkill,
  onReset 
}: WeaponSkillTreeNewProps) {
  const [hoveredSkill, setHoveredSkill] = useState<WeaponSkillOption | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const weaponDef = WEAPON_TYPE_DEFINITIONS[weaponType.toUpperCase()];
  
  if (!weaponDef) {
    return (
      <div className="text-center py-8 text-slate-400">
        No skill data available for {weaponType}
      </div>
    );
  }

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    setTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 });
  };

  const isSlotUnlocked = (slotType: SlotType): boolean => {
    const slot = weaponDef.slots.find(s => s.type === slotType);
    return slot ? playerTier >= slot.unlockTier : false;
  };

  const isSkillUnlocked = (skill: WeaponSkillOption): boolean => {
    return playerTier >= skill.tier;
  };

  const isSkillSelected = (slotType: SlotType, skillId: string): boolean => {
    return selectedSkills[slotType] === skillId;
  };

  return (
    <div className="space-y-6" onMouseMove={handleMouseMove}>
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{weaponDef.icon}</span>
            <div>
              <h2 className="text-xl font-bold text-amber-400 font-serif">{weaponDef.name} Skills</h2>
              <p className="text-sm text-slate-400">Select one skill for each action bar slot (1-4)</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            data-testid="btn-reset-weapon-skills"
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3, 4, 5, 6].map(slot => {
            const slotTypes: SlotType[] = ['primary', 'secondary', 'ability', 'ultimate'];
            const slotType = slotTypes[slot - 1];
            const selectedSkillId = slotType ? selectedSkills[slotType] : null;
            const selectedSkill = selectedSkillId 
              ? weaponDef.slots.find(s => s.type === slotType)?.skills.find(sk => sk.id === selectedSkillId)
              : null;

            return (
              <div 
                key={slot}
                className={cn(
                  "w-12 h-12 rounded border-2 flex items-center justify-center text-lg font-bold",
                  slot <= 4 
                    ? slotType && isSlotUnlocked(slotType)
                      ? `${SLOT_COLORS[slotType].border} ${SLOT_COLORS[slotType].bg}`
                      : "border-slate-600 bg-slate-800/50 text-slate-600"
                    : "border-slate-700 bg-slate-800/30 text-slate-600"
                )}
                data-testid={`action-slot-${slot}`}
              >
                {selectedSkill ? (
                  <span className="text-xl">{selectedSkill.icon}</span>
                ) : (
                  <span className="text-slate-500">{slot}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">DMG</span>
            <span className="text-amber-400 font-bold">+0%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">DEF</span>
            <span className="text-amber-400 font-bold">+0%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">SPD</span>
            <span className="text-amber-400 font-bold">+0%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">HP</span>
            <span className="text-amber-400 font-bold">+0</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">MP</span>
            <span className="text-amber-400 font-bold">+0</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">CRIT</span>
            <span className="text-amber-400 font-bold">+0%</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-2">
        <span className="text-slate-400 text-sm">unlock</span>
        {weaponDef.slots.map(slot => (
          <div key={slot.type} className="flex-1 text-center">
            <span className={cn(
              "inline-block px-3 py-1 rounded text-sm font-bold",
              playerTier >= slot.unlockTier 
                ? `${SLOT_COLORS[slot.type].bg} ${SLOT_COLORS[slot.type].text}`
                : "bg-slate-800 text-slate-500"
            )}>
              t{slot.unlockTier}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <span className="text-slate-400 text-sm w-12"></span>
        {weaponDef.slots.map(slot => (
          <div key={slot.type} className="flex-1 text-center">
            <span className={cn(
              "text-xs font-semibold uppercase tracking-wider",
              isSlotUnlocked(slot.type) ? SLOT_COLORS[slot.type].text : "text-slate-600"
            )}>
              {SLOT_LABELS[slot.type]}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {weaponDef.slots.map(slot => {
          const slotUnlocked = isSlotUnlocked(slot.type);
          const colors = SLOT_COLORS[slot.type];

          return (
            <div key={slot.type} className="flex flex-col gap-3">
              {slot.skills.map(skill => {
                const skillUnlocked = slotUnlocked && isSkillUnlocked(skill);
                const selected = isSkillSelected(slot.type, skill.id);

                return (
                  <motion.div
                    key={skill.id}
                    className={cn(
                      "rounded-lg border-2 p-3 cursor-pointer transition-all relative",
                      selected
                        ? `${colors.border} ${colors.bg} ring-2 ring-offset-2 ring-offset-slate-900`
                        : skillUnlocked
                        ? `border-slate-600 hover:${colors.border} hover:${colors.bg}`
                        : "border-slate-700 opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => skillUnlocked && onSelectSkill(slot.type, skill.id)}
                    onMouseEnter={() => setHoveredSkill(skill)}
                    onMouseLeave={() => setHoveredSkill(null)}
                    whileHover={skillUnlocked ? { scale: 1.02 } : {}}
                    whileTap={skillUnlocked ? { scale: 0.98 } : {}}
                    data-testid={`skill-${skill.id}`}
                  >
                    {!skillUnlocked && skill.tier > 1 && (
                      <div className="absolute -top-2 -right-2 bg-slate-700 text-slate-300 text-xs px-1.5 py-0.5 rounded font-bold">
                        T{skill.tier}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        "text-2xl",
                        skillUnlocked ? "" : "grayscale opacity-50"
                      )}>
                        {skill.icon}
                      </span>
                      <span className={cn(
                        "font-semibold text-sm",
                        selected ? colors.text : skillUnlocked ? "text-slate-200" : "text-slate-500"
                      )}>
                        {skill.name}
                      </span>
                    </div>

                    <div className="bg-slate-800/80 rounded p-2 text-xs">
                      <p className="text-slate-400 mb-1 line-clamp-2">{skill.description}</p>
                      <div className="flex justify-between text-slate-500">
                        <span>Damage: {skill.damage < 0 ? `Heal ${Math.abs(skill.damage)}` : skill.damage}</span>
                        <span>CD: {skill.cooldown}s</span>
                      </div>
                    </div>

                    {selected && (
                      <div className="absolute -top-1 -left-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-xs text-black font-bold">
                        ✓
                      </div>
                    )}
                  </motion.div>
                );
              })}

              <div className="flex-1 min-h-[60px] border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center text-slate-600 text-xs">
                More at higher tiers
              </div>
            </div>
          );
        })}
      </div>

      {hoveredSkill && (
        <div
          className="fixed z-[100] bg-slate-900/98 border border-amber-500 rounded-lg p-4 w-80 pointer-events-none shadow-xl"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <h3 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
            <span className="text-xl">{hoveredSkill.icon}</span>
            {hoveredSkill.name}
          </h3>
          <p className="text-slate-300 text-sm mb-3">{hoveredSkill.description}</p>
          
          <div className="grid grid-cols-2 gap-2 text-sm mb-2">
            <div className="text-slate-400">
              Damage: <span className="text-red-400 font-bold">
                {hoveredSkill.damage < 0 ? `Heal ${Math.abs(hoveredSkill.damage)}` : hoveredSkill.damage}
              </span>
            </div>
            <div className="text-slate-400">
              Cooldown: <span className="text-blue-400 font-bold">{hoveredSkill.cooldown}s</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mb-2">
            {hoveredSkill.effects.map((effect, i) => (
              <span key={i} className="bg-slate-800 text-emerald-400 text-xs px-2 py-0.5 rounded">
                {effect}
              </span>
            ))}
          </div>

          <div className="text-slate-500 text-xs">
            Requires Tier {hoveredSkill.tier}
          </div>
        </div>
      )}
    </div>
  );
}
