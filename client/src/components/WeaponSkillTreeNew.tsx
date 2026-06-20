import { useState, MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WEAPON_TYPE_DEFINITIONS,
  WeaponSkillOption,
  SlotType,
  SelectedSkills,
  SelectedSkillKey,
  getSlotSelectionKey,
  getSkillsForSlot,
} from '@shared/definitions/weaponSkillsNew';

interface WeaponSkillTreeNewProps {
  weaponType: string;
  playerTier: number;
  selectedSkills: SelectedSkills;
  onSelectSkill: (slotType: SlotType, skillId: string, selectionKey: SelectedSkillKey) => void;
  onReset: () => void;
}

const SLOT_COLORS: Record<SlotType, { border: string; bg: string; text: string }> = {
  primary: { border: 'border-amber-500', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  secondary: { border: 'border-blue-500', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  ability: { border: 'border-purple-500', bg: 'bg-purple-500/20', text: 'text-purple-400' },
  ultimate: { border: 'border-red-500', bg: 'bg-red-500/20', text: 'text-red-400' },
  recipe: { border: 'border-cyan-500', bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  utility: { border: 'border-emerald-500', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  shapeshift: { border: 'border-lime-500', bg: 'bg-lime-500/20', text: 'text-lime-400' },
};

const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

export function WeaponSkillTreeNew({
  weaponType,
  playerTier,
  selectedSkills,
  onSelectSkill,
  onReset,
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

  const hotbarCount = weaponDef.hotbarSlots ?? weaponDef.slots.length;
  const gridCols = GRID_COLS[Math.min(weaponDef.slots.length, 6)] ?? 'grid-cols-4';

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    setTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 });
  };

  const isSlotUnlocked = (unlockTier: number): boolean => playerTier >= unlockTier;
  const isSkillUnlocked = (skill: WeaponSkillOption): boolean => playerTier >= skill.tier;

  const getSelectedSkillId = (selectionKey: SelectedSkillKey | null): string | null => {
    if (!selectionKey) return null;
    return selectedSkills[selectionKey] ?? null;
  };

  const isSkillSelected = (selectionKey: SelectedSkillKey | null, skillId: string): boolean =>
    getSelectedSkillId(selectionKey) === skillId;

  const getHotbarSlot = (index: number) => {
    const slot = weaponDef.slots[index];
    if (!slot) return null;

    const selectionKey = getSlotSelectionKey(slot, weaponDef.slots);
    const selectedSkillId = getSelectedSkillId(selectionKey);
    const skills = getSkillsForSlot(slot, weaponDef.slots);
    const selectedSkill = selectedSkillId
      ? skills.find((sk) => sk.id === selectedSkillId)
      : null;

    return { slot, selectionKey, selectedSkill };
  };

  return (
    <div className="space-y-6" onMouseMove={handleMouseMove}>
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{weaponDef.icon}</span>
            <div>
              <h2 className="text-xl font-bold text-amber-400 font-serif">{weaponDef.name} Skills</h2>
              <p className="text-sm text-slate-400">
                Select one skill for each action bar slot (1-{hotbarCount})
              </p>
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

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {Array.from({ length: hotbarCount }, (_, i) => {
            const hotbarSlot = getHotbarSlot(i);
            const slot = hotbarSlot?.slot;
            const selectedSkill = hotbarSlot?.selectedSkill;
            const colors = slot ? SLOT_COLORS[slot.type] : null;
            const unlocked = slot ? isSlotUnlocked(slot.unlockTier) : false;

            return (
              <div
                key={i + 1}
                className={cn(
                  'w-12 h-12 rounded border-2 flex items-center justify-center text-lg font-bold',
                  slot && unlocked && colors
                    ? `${colors.border} ${colors.bg}`
                    : 'border-slate-700 bg-slate-800/30 text-slate-600',
                )}
                data-testid={`action-slot-${i + 1}`}
              >
                {selectedSkill ? (
                  <span className="text-xl">{selectedSkill.icon}</span>
                ) : (
                  <span className="text-slate-500">{i + 1}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className={cn('grid gap-4', gridCols)}>
        {weaponDef.slots.map((slot) => {
          const selectionKey = getSlotSelectionKey(slot, weaponDef.slots);
          const slotUnlocked = isSlotUnlocked(slot.unlockTier);
          const colors = SLOT_COLORS[slot.type];
          const skills = getSkillsForSlot(slot, weaponDef.slots);
          const takenElsewhere = new Set(
            weaponDef.slots
              .map((s) => getSlotSelectionKey(s, weaponDef.slots))
              .filter((key): key is SelectedSkillKey => key !== null && key !== selectionKey)
              .map((key) => selectedSkills[key])
              .filter((id): id is string => Boolean(id)),
          );

          return (
            <div key={`${slot.type}-${slot.label}`} className="flex flex-col gap-3 min-w-0">
              <div className="text-center">
                <span
                  className={cn(
                    'inline-block px-3 py-1 rounded text-sm font-bold mb-1',
                    slotUnlocked ? `${colors.bg} ${colors.text}` : 'bg-slate-800 text-slate-500',
                  )}
                >
                  t{slot.unlockTier}
                </span>
                <div
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wider',
                    slotUnlocked ? colors.text : 'text-slate-600',
                  )}
                >
                  {slot.label}
                </div>
                {slot.recipeSource && (
                  <div className="text-[10px] text-slate-500 mt-1">from {slot.recipeSource}</div>
                )}
              </div>

              {skills.map((skill) => {
                const skillUnlocked = slotUnlocked && isSkillUnlocked(skill);
                const selected = isSkillSelected(selectionKey, skill.id);
                const alreadyUsed = takenElsewhere.has(skill.id);

                return (
                  <motion.div
                    key={skill.id}
                    className={cn(
                      'rounded-lg border-2 p-3 transition-all relative',
                      selected
                        ? `${colors.border} ${colors.bg} ring-2 ring-offset-2 ring-offset-slate-900`
                        : skillUnlocked && !alreadyUsed
                          ? `border-slate-600 hover:${colors.border} hover:${colors.bg} cursor-pointer`
                          : 'border-slate-700 opacity-50 cursor-not-allowed',
                    )}
                    onClick={() => {
                      if (!skillUnlocked || alreadyUsed || !selectionKey) return;
                      onSelectSkill(slot.type, skill.id, selectionKey);
                    }}
                    onMouseEnter={() => setHoveredSkill(skill)}
                    onMouseLeave={() => setHoveredSkill(null)}
                    whileHover={skillUnlocked && !alreadyUsed ? { scale: 1.02 } : {}}
                    whileTap={skillUnlocked && !alreadyUsed ? { scale: 0.98 } : {}}
                    data-testid={`skill-${skill.id}`}
                  >
                    {!skillUnlocked && skill.tier > 1 && (
                      <div className="absolute -top-2 -right-2 bg-slate-700 text-slate-300 text-xs px-1.5 py-0.5 rounded font-bold">
                        T{skill.tier}
                      </div>
                    )}
                    {alreadyUsed && !selected && (
                      <div className="absolute -top-2 -right-2 bg-slate-900 text-slate-400 text-xs px-1.5 py-0.5 rounded font-bold">
                        USED
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn('text-2xl', skillUnlocked ? '' : 'grayscale opacity-50')}>
                        {skill.icon}
                      </span>
                      <span
                        className={cn(
                          'font-semibold text-sm',
                          selected ? colors.text : skillUnlocked ? 'text-slate-200' : 'text-slate-500',
                        )}
                      >
                        {skill.name}
                      </span>
                    </div>

                    <div className="bg-slate-800/80 rounded p-2 text-xs">
                      <p className="text-slate-400 mb-1 line-clamp-2">{skill.description}</p>
                      <div className="flex justify-between text-slate-500">
                        <span>
                          Damage: {skill.damage < 0 ? `Heal ${Math.abs(skill.damage)}` : skill.damage}
                        </span>
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

              {skills.length === 0 && (
                <div className="flex-1 min-h-[60px] border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center text-slate-600 text-xs text-center px-2">
                  Pick from the first recipe column
                </div>
              )}
            </div>
          );
        })}
      </div>

      {weaponDef.formSkills && weaponDef.formSkills.length > 0 && (
        <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-lime-400 mb-3">Form Hotbar Overrides</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {weaponDef.formSkills.map((form) => (
              <div key={form.formId} className="rounded-lg border border-slate-700 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{form.formIcon}</span>
                  <div>
                    <div className="font-semibold text-slate-200">{form.formName}</div>
                    <div className="text-xs text-slate-500 uppercase">{form.formType}</div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-2">{form.description}</p>
                <div className="flex flex-wrap gap-1">
                  {form.skills.map((skill) => (
                    <span
                      key={skill.id}
                      className="bg-slate-900 text-slate-300 text-xs px-2 py-1 rounded"
                      title={skill.name}
                    >
                      {skill.icon} {skill.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <div className="text-slate-500 text-xs">Requires Tier {hoveredSkill.tier}</div>
        </div>
      )}
    </div>
  );
}