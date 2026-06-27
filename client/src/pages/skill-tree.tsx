import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, RotateCcw, Swords } from 'lucide-react';
import Layout from '@/components/Layout';
import { CLASS_SKILL_TREES, WEAPON_SKILL_TREES, SPECIAL_ITEM_SKILL_TREES, Skill, SkillTier, CLASS_TO_ID } from '@/lib/skillTreeData';
import { CharacterManager, Character } from '@/lib/characterManager';
import { WeaponSelectionPanel } from '@/components/WeaponSelectionPanel';
import { WEAPON_TYPES } from '@shared/definitions/weaponDatabase';
import { cn } from '@/lib/utils';
import type { WeaponSkillSelection } from '@/lib/characterManager';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { CLASS_HERO_IMAGES } from '@/lib/artAssets';

type TreeMode = 'class' | 'weapons' | 'hotkeys';

const CLASS_COLORS: Record<string, string> = {
  warrior: '#ff6b57',
  mage: '#6aa9ff',
  worg: '#c792ff',
  ranger: '#6bdc8b'
};

const CLASS_ICONS: Record<string, string> = {
  warrior: '⚔️',
  mage: '🔮',
  worg: '🐺',
  ranger: '🏹'
};

const WEAPON_ICONS: Record<string, string> = {
  sword: '⚔️',
  bow: '🏹',
  staff: '🪄',
  dagger: '🗡️',
  axe: '🪓',
  hammer: '🔨',
  lance: '🔱',
  mace: '⚫',
  // 6 special skill sheet types
  tome: '📖',
  shield: '🛡️',
  wand: '🪄',
  grimoire: '📜',
  nimble_fingers: '🖐️',
  dual_wield: '⚔️'
};

// The 6 special weapon/skill sheet types for spellbook selection
const SPELLBOOK_WEAPON_TYPES = [
  { id: 'tome', name: 'Tomes', icon: '📖', desc: 'Arcane knowledge & spell storage' },
  { id: 'shield', name: 'Shields', icon: '🛡️', desc: 'Defense, blocks & counters' },
  { id: 'wand', name: 'Wands', icon: '🪄', desc: 'Quick elemental casting' },
  { id: 'grimoire', name: 'Grimoires', icon: '📜', desc: 'Forbidden rituals & summons' },
  { id: 'nimble_fingers', name: 'Nimble Fingers', icon: '🖐️', desc: 'Rogue tricks & evasion' },
  { id: 'dual_wield', name: 'Dual Wield', icon: '⚔️', desc: 'Two-weapon flurry mastery' },
];

export default function SkillTreePage() {
  const authReady = useAuthGuard();
  if (!authReady) return null;

  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<TreeMode>('class');
  const [activeClass, setActiveClass] = useState('warrior');
  const [activeWeapon, setActiveWeapon] = useState('sword');
  const [classSkills, setClassSkills] = useState<Record<string, number>>({});
  const [weaponSkills, setWeaponSkills] = useState<Record<string, number>>({});
  const [hoveredSkill, setHoveredSkill] = useState<Skill | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [character, setCharacter] = useState<Character | null>(null);
  const [selectedWeaponType, setSelectedWeaponType] = useState<string | null>('SWORD');
  const [selectedWeaponId, setSelectedWeaponId] = useState<string | null>(null);
  const [selectedWeaponTier, setSelectedWeaponTier] = useState<number>(1);
  const [weaponSkillLevel, setWeaponSkillLevel] = useState<number>(1);
  const [skillSelections, setSkillSelections] = useState<Record<string, WeaponSkillSelection>>({});
  // Special item skill tree (tomes/shields/wands etc for the class)
  const [showSpecialItem, setShowSpecialItem] = useState(false);
  const [specialItemKey, setSpecialItemKey] = useState<string | null>(null);
  const [selectedSpecialForm, setSelectedSpecialForm] = useState<string | null>(null);

  // Hotbar loadout for 5 slots - production game flow like uMMORPG
  const [actionBar, setActionBar] = useState<Record<number, string>>({1: null, 2: null, 3: null, 4: null, 5: null});
  const [selectedSkillForAssign, setSelectedSkillForAssign] = useState<Skill | null>(null);

  // Keyboard support for switching Grimoire forms with Shift+F1/F2/F3 (as specified)
  useEffect(() => {
    if (!showSpecialItem || specialItemKey !== 'grimoire') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.shiftKey) return;
      const subtrees = SPECIAL_ITEM_SKILL_TREES[activeClass]?.grimoire?.subtrees || {};
      const formKeys = Object.keys(subtrees);
      if (formKeys.length === 0) return;
      const key = e.key.toLowerCase();
      let newForm: string | null = null;
      if (key === 'f1' || e.key === 'F1') {
        newForm = formKeys[0];
      } else if (key === 'f2' || e.key === 'F2') {
        newForm = formKeys[1] || formKeys[0];
      } else if (key === 'f3' || e.key === 'F3') {
        newForm = formKeys[2] || formKeys[formKeys.length - 1];
      }
      if (newForm) {
        setSelectedSpecialForm(newForm);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSpecialItem, specialItemKey, activeClass]);

  useEffect(() => {
    const loadCharacter = async () => {
      const active = await CharacterManager.getActiveCharacter();
      if (active) {
        setCharacter(active);
        const classId = CLASS_TO_ID[active.classId] || 'warrior';
        setActiveClass(classId);
        const tier = Math.max(1, Math.min(8, Math.floor((active.level || 1) / 10) + 1));
        setSelectedWeaponTier(tier);
        if (active.weaponSkillSelections) {
          setSkillSelections(active.weaponSkillSelections);
        }
        if (active.weaponSkillLevel) {
          setWeaponSkillLevel(active.weaponSkillLevel);
        }
        if (active.actionBar) {
          setActionBar(active.actionBar);
        }
        if (active.equippedWeaponId) {
          setSelectedWeaponId(active.equippedWeaponId);
          const weaponType = getWeaponTypeFromWeaponId(active.equippedWeaponId);
          if (weaponType) {
            setSelectedWeaponType(weaponType);
          }
        } else {
          const equippedWeapon = active.equipment?.mainHand;
          if (equippedWeapon) {
            const weaponType = getWeaponTypeFromItem(equippedWeapon);
            if (weaponType && WEAPON_TYPES[weaponType]) {
              setSelectedWeaponType(weaponType);
            }
          }
        }
      }
    };
    loadCharacter();
  }, []);

  const getWeaponTypeFromItem = (itemId: string): string | null => {
    const upper = itemId.toUpperCase();
    if (upper.includes('SWORD') || upper.includes('BLADE')) return 'SWORD';
    if (upper.includes('AXE') || upper.includes('HATCHET')) return 'AXE';
    if (upper.includes('BOW') || upper.includes('CROSSBOW')) return 'BOW';
    if (upper.includes('STAFF') || upper.includes('WAND')) return 'STAFF';
    if (upper.includes('DAGGER') || upper.includes('KNIFE')) return 'DAGGER';
    if (upper.includes('MACE') || upper.includes('CLUB')) return 'MACE';
    if (upper.includes('HAMMER')) return 'HAMMER';
    if (upper.includes('SPEAR') || upper.includes('LANCE')) return 'SPEAR';
    if (upper.includes('SCYTHE')) return 'SCYTHE';
    return 'SWORD';
  };

  const getWeaponTypeFromWeaponId = (weaponId: string): string | null => {
    for (const [typeId, weaponType] of Object.entries(WEAPON_TYPES)) {
      if (weaponType.weapons.some(w => w.id === weaponId)) {
        return typeId;
      }
    }
    return null;
  };

  const unlockedSkills = mode === 'class' ? classSkills : weaponSkills;
  const setUnlockedSkills = mode === 'class' ? setClassSkills : setWeaponSkills;

  // When showing special item, we can still use classSkills for point tracking (ids are unique)
  
  const classPointsSpent = Object.values(classSkills).reduce((a, b) => a + b, 0);
  const weaponPointsSpent = Object.values(weaponSkills).reduce((a, b) => a + b, 0);
  const totalPointsSpent = classPointsSpent + weaponPointsSpent;
  
  const totalSkillPoints = (character?.level || 1) + 5;
  const remainingPoints = Math.max(0, totalSkillPoints - totalPointsSpent);
  
  const skillPoints = remainingPoints;

  let currentTree = mode === 'class' 
    ? (showSpecialItem && specialItemKey && SPECIAL_ITEM_SKILL_TREES[activeClass] && SPECIAL_ITEM_SKILL_TREES[activeClass][specialItemKey] 
        ? SPECIAL_ITEM_SKILL_TREES[activeClass][specialItemKey] 
        : CLASS_SKILL_TREES[activeClass]) 
    : WEAPON_SKILL_TREES[activeWeapon];

  // Support grimoire three forms (and other subtrees) - switch to selected form subtree
  if (showSpecialItem && specialItemKey === 'grimoire' && currentTree && currentTree.hasSubtrees && currentTree.subtrees) {
    const formKey = selectedSpecialForm || 'destruction';
    if (currentTree.subtrees[formKey]) {
      currentTree = {
        ...currentTree,
        className: `${currentTree.subtrees[formKey].name} (Grimoire Form)`,
        color: currentTree.subtrees[formKey].color || currentTree.color,
        tiers: currentTree.subtrees[formKey].tiers
      };
    }
  }

  const isSkillUnlocked = (skillId: string) => (unlockedSkills[skillId] || 0) > 0;
  
  const canUnlockSkill = (skill: Skill) => {
    if (skillPoints <= 0) return false;
    const currentPoints = unlockedSkills[skill.id] || 0;
    if (currentPoints >= skill.maxPoints) return false;
    if (skill.requires && !isSkillUnlocked(skill.requires)) return false;
    return true;
  };

  // Special item trees share point pool but have unique ids so no conflict with class skills.

  const handleSkillClick = (skill: Skill) => {
    if (!canUnlockSkill(skill)) return;
    
    setUnlockedSkills(prev => ({
      ...prev,
      [skill.id]: (prev[skill.id] || 0) + 1
    }));
  };

  const handleReset = () => {
    if (mode === 'class') {
      setClassSkills({});
    } else {
      setWeaponSkills({});
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 });
  };

  const calculateBonuses = () => {
    let damage = 0, defense = 0, speed = 0, health = 0, mana = 0, crit = 0;
    
    Object.entries(unlockedSkills).forEach(([skillId, points]) => {
      if (points > 0) {
        damage += points * 5;
        defense += points * 3;
        speed += points * 2;
        health += points * 25;
        mana += points * 15;
        crit += points * 1;
      }
    });
    
    return { damage, defense, speed, health, mana, crit };
  };

  const bonuses = calculateBonuses();

  const classBg = CLASS_HERO_IMAGES[activeClass as keyof typeof CLASS_HERO_IMAGES];
  const classColor = CLASS_COLORS[activeClass] || '#f6c945';

  return (
    <Layout>
      <div className="min-h-screen bg-[#05060c] text-white relative">
        {/* Class-themed background */}
        {classBg && (
          <div className="fixed inset-0 pointer-events-none z-0">
            <img src={classBg} alt="" className="w-full h-full object-cover opacity-[0.07] transition-opacity duration-700" />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(900px 500px at 50% 0%, rgba(5,6,12,.4), rgba(5,6,12,.95) 60%), linear-gradient(180deg, rgba(5,6,12,.3), rgba(5,6,12,.95))' }} />
          </div>
        )}
        <header className="sticky top-0 z-50 bg-[#05060c]/85 backdrop-blur-xl border-b border-white/[.06] px-4 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => setLocation('/character')}
              className="text-white/40 hover:text-white"
              data-testid="btn-back"
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> Back to Character
            </Button>
            
            <div className="text-center">
              <h1 className="text-xl font-bold text-emerald-400 font-serif">Skill Tree</h1>
              <p className="text-xs text-slate-500">
                {character?.name || 'Hero'} - {currentTree?.className} {showSpecialItem ? '(Special Item Tree)' : ''}
              </p>
            </div>
            
            <div className="w-32" />
          </div>
        </header>

        <div className="sticky top-14 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-2 py-1">
          <div className="flex items-center justify-center gap-1 max-w-7xl mx-auto flex-wrap">
            {mode === 'class' ? (
              <>
                {Object.keys(CLASS_SKILL_TREES).map(classId => {
                  const isOwnClass = character && CLASS_TO_ID[character.classId] === classId;
                  return (
                    <button
                      key={classId}
                      onClick={() => { setActiveClass(classId); setShowSpecialItem(false); setSpecialItemKey(null); setSelectedSpecialForm(null); }}
                      className={cn(
                        "px-2 py-1 rounded border font-semibold text-xs transition-all flex items-center gap-1",
                        activeClass === classId && !showSpecialItem
                          ? "border-current bg-current/15"
                          : "border-slate-700 text-slate-400 hover:border-slate-500"
                      )}
                      style={activeClass === classId && !showSpecialItem ? { color: CLASS_COLORS[classId], borderColor: CLASS_COLORS[classId] } : {}}
                      data-testid={`tab-class-${classId}`}
                    >
                      <span>{CLASS_ICONS[classId]}</span>
                      <span className="capitalize">{classId === 'worg' ? 'Worg' : classId === 'mage' ? 'Mage' : classId}</span>
                      {isOwnClass && <span className="text-[10px] opacity-60">(You)</span>}
                    </button>
                  );
                })}
                {/* Special Item Skill Tree selectors for Warrior / Mage Priest / Ranger */}
                {activeClass === 'warrior' && (
                  <>
                    <button onClick={() => { setShowSpecialItem(true); setSpecialItemKey('shield'); setActiveClass('warrior'); setSelectedSpecialForm(null); }} className={cn("px-2 py-1 rounded border text-xs", showSpecialItem && specialItemKey==='shield' ? "border-amber-500 bg-amber-500/15 text-amber-400" : "border-slate-700 text-slate-400")}>🛡️ Shield (Special Item)</button>
                    <button onClick={() => { setShowSpecialItem(true); setSpecialItemKey('dual_wield'); setActiveClass('warrior'); setSelectedSpecialForm(null); }} className={cn("px-2 py-1 rounded border text-xs", showSpecialItem && specialItemKey==='dual_wield' ? "border-amber-500 bg-amber-500/15 text-amber-400" : "border-slate-700 text-slate-400")}>⚔️ Dual Wield (Special Item)</button>
                  </>
                )}
                {activeClass === 'mage' && (
                  <>
                    <button onClick={() => { setShowSpecialItem(true); setSpecialItemKey('tome'); setActiveClass('mage'); setSelectedSpecialForm(null); }} className={cn("px-2 py-1 rounded border text-xs", showSpecialItem && specialItemKey==='tome' ? "border-amber-500 bg-amber-500/15 text-amber-400" : "border-slate-700 text-slate-400")}>📖 Tome (Special Item)</button>
                    <button onClick={() => { setShowSpecialItem(true); setSpecialItemKey('wand'); setActiveClass('mage'); setSelectedSpecialForm(null); }} className={cn("px-2 py-1 rounded border text-xs", showSpecialItem && specialItemKey==='wand' ? "border-amber-500 bg-amber-500/15 text-amber-400" : "border-slate-700 text-slate-400")}>🪄 Wand (Special Item)</button>
                    <button onClick={() => { 
                      setShowSpecialItem(true); 
                      setSpecialItemKey('grimoire'); 
                      setActiveClass('mage'); 
                      setSelectedSpecialForm('destruction'); // default to first of three forms
                    }} className={cn("px-2 py-1 rounded border text-xs", showSpecialItem && specialItemKey==='grimoire' ? "border-amber-500 bg-amber-500/15 text-amber-400" : "border-slate-700 text-slate-400")}>📜 Grimoire (3 Forms)</button>
                  </>
                )}
                {activeClass === 'ranger' && (
                  <button onClick={() => { setShowSpecialItem(true); setSpecialItemKey('nimble_fingers'); setActiveClass('ranger'); setSelectedSpecialForm(null); }} className={cn("px-2 py-1 rounded border text-xs", showSpecialItem && specialItemKey==='nimble_fingers' ? "border-amber-500 bg-amber-500/15 text-amber-400" : "border-slate-700 text-slate-400")}>🖐️ Nimble Fingers (Special Item)</button>
                )}
              </>
            ) : (
              Object.keys(WEAPON_SKILL_TREES).map(weaponId => (
                <button
                  key={weaponId}
                  onClick={() => { setActiveWeapon(weaponId); setShowSpecialItem(false); }}
                  className={cn(
                    "px-2 py-1 rounded border font-semibold text-xs transition-all flex items-center gap-1",
                    activeWeapon === weaponId
                      ? "border-amber-500 bg-amber-500/15 text-amber-400"
                      : "border-slate-700 text-slate-400 hover:border-slate-500"
                  )}
                  data-testid={`tab-weapon-${weaponId}`}
                >
                  <span>{WEAPON_ICONS[weaponId]}</span>
                  <span className="capitalize">{weaponId}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-4">
          {/* Grimoire Three Forms selector (and future special form UIs) - forms switched in-game with Shift+F1/F2/F3 */}
          {showSpecialItem && specialItemKey === 'grimoire' && SPECIAL_ITEM_SKILL_TREES[activeClass]?.grimoire?.hasSubtrees && (
            <div className="mb-4 flex gap-2 justify-center">
              <div className="text-xs text-slate-400 self-center mr-2">Forms (Shift+F1/F2/F3 in game):</div>
              {Object.keys(SPECIAL_ITEM_SKILL_TREES[activeClass].grimoire.subtrees).map((formKey, idx) => {
                const form = SPECIAL_ITEM_SKILL_TREES[activeClass].grimoire.subtrees[formKey];
                return (
                  <button
                    key={formKey}
                    onClick={() => setSelectedSpecialForm(formKey)}
                    className={cn(
                      "px-3 py-1 text-xs rounded border flex items-center gap-1",
                      selectedSpecialForm === formKey ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-slate-600 text-slate-400 hover:border-slate-500"
                    )}
                    title={`Shift+F${idx + 1} to activate in-game`}
                  >
                    <span>{form.icon}</span>
                    <span>{form.name} (Shift+F{idx + 1})</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-emerald-400 font-bold font-serif">Skill Bonuses</h2>
            
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-slate-500">DMG</span>
                <span className="text-amber-400 font-bold">+{bonuses.damage}%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500">DEF</span>
                <span className="text-amber-400 font-bold">+{bonuses.defense}%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500">SPD</span>
                <span className="text-amber-400 font-bold">+{bonuses.speed}%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500">HP</span>
                <span className="text-amber-400 font-bold">+{bonuses.health}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500">MP</span>
                <span className="text-amber-400 font-bold">+{bonuses.mana}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500">CRIT</span>
                <span className="text-amber-400 font-bold">+{bonuses.crit}%</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-emerald-500/10 border border-emerald-500 rounded-lg px-4 py-2 flex items-center gap-2">
                <span className="text-slate-400 text-sm">Shared Pool:</span>
                <span className="text-emerald-400 text-xl font-bold">{skillPoints}</span>
                <span className="text-slate-500 text-xs">/ {totalSkillPoints}</span>
              </div>
              <div className="bg-slate-800/50 rounded-lg px-3 py-1 text-xs text-slate-400">
                <span className="text-blue-400">{classPointsSpent}</span> class + <span className="text-amber-400">{weaponPointsSpent}</span> weapon
              </div>
              
              <Button
                variant="outline"
                onClick={handleReset}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                data-testid="btn-reset-skills"
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Reset
              </Button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('class')}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-semibold transition-all border-2",
                    mode === 'class'
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
                      : "border-slate-700 text-slate-400"
                  )}
                  data-testid="btn-mode-class"
                >
                  Class
                </button>
                <button
                  onClick={() => setMode('weapons')}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-semibold transition-all border-2",
                    mode === 'weapons'
                      ? "border-amber-500 bg-amber-500/15 text-amber-400"
                      : "border-slate-700 text-slate-400"
                  )}
                  data-testid="btn-mode-weapons"
                >
                  Weapons
                </button>
                <button
                  onClick={() => setMode('hotkeys')}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-semibold transition-all border-2 flex items-center gap-1",
                    mode === 'hotkeys'
                      ? "border-purple-500 bg-purple-500/15 text-purple-400"
                      : "border-slate-700 text-slate-400"
                  )}
                  data-testid="btn-mode-hotkeys"
                >
                  <Swords className="w-4 h-4" /> Hotkeys
                </button>
              </div>
            </div>
          </div>

          {mode === 'hotkeys' ? (
            <div className="py-4">
              {/* Explicit 6-way weapon/skill sheet type selector (the missing step) */}
              <div className="mb-6">
                <div className="text-sm text-amber-400 mb-2 tracking-wider">SELECT WEAPON / SKILL SHEET TYPE (6 options)</div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {SPELLBOOK_WEAPON_TYPES.map((style) => {
                    const isActive = (selectedWeaponType || '').toLowerCase() === style.id || selectedWeaponType === style.id.toUpperCase();
                    return (
                      <button
                        key={style.id}
                        onClick={() => {
                          const upper = style.id.toUpperCase();
                          setSelectedWeaponType(upper);
                          setSelectedWeaponId(null);
                          // Also set for weapon skill trees lookup
                        }}
                        className={cn(
                          "p-4 rounded-xl border text-left transition-all hover:border-amber-400/60",
                          isActive ? "border-amber-500 bg-amber-500/10" : "border-slate-700 bg-slate-900/60 hover:bg-slate-800"
                        )}
                        data-testid={`spellbook-style-${style.id}`}
                      >
                        <div className="text-3xl mb-1">{style.icon}</div>
                        <div className="font-semibold text-white">{style.name}</div>
                        <div className="text-xs text-slate-400 mt-1">{style.desc}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="text-[10px] text-slate-500 mt-2">Selecting a type loads its dedicated skill sheet. Weapon hotkeys & upgrades apply per type.</div>
              </div>

              {/* Production Hotbar Assignment - 5 slots like uMMORPG Grudge Warlords */}
              <div className="mb-6 p-4 bg-slate-800 rounded border border-amber-900/50">
                <h3 className="text-amber-400 font-bold mb-2">Action Bar (Slots 1-5 - Press 1-5 in game)</h3>
                <div className="flex gap-2 mb-4">
                  {[1,2,3,4,5].map(slot => (
                    <div 
                      key={slot} 
                      className="w-20 h-16 border-2 border-amber-600 bg-black/50 rounded flex flex-col items-center justify-center text-xs cursor-pointer hover:bg-amber-900/30"
                      onClick={() => {
                        if (selectedSkillForAssign) {
                          const newBar = {...actionBar, [slot]: selectedSkillForAssign.id};
                          setActionBar(newBar);
                          setSelectedSkillForAssign(null);
                          // Persist to character
                          if (character) {
                            const updated = {...character, actionBar: newBar} as any;
                            setCharacter(updated);
                            CharacterManager.updateCharacter(updated);
                          }
                        }
                      }}
                    >
                      <div>Slot {slot}</div>
                      <div className="text-amber-400 truncate w-full text-center">{actionBar[slot] || 'Empty'}</div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-slate-400 mb-2">Select a skill below then click a slot to assign. For Grimoire, switch forms with Shift+F1/F2/F3 to assign form-specific skills.</div>
                
                {/* Available skills for current special/class */}
                <div className="max-h-32 overflow-auto border border-slate-700 p-2 text-xs">
                  { (showSpecialItem && specialItemKey ? 
                    (SPECIAL_ITEM_SKILL_TREES[activeClass]?.[specialItemKey] ? 
                      (selectedSpecialForm && SPECIAL_ITEM_SKILL_TREES[activeClass][specialItemKey].subtrees?.[selectedSpecialForm] ? 
                        SPECIAL_ITEM_SKILL_TREES[activeClass][specialItemKey].subtrees[selectedSpecialForm].tiers.flatMap(t => t.skills) : 
                        SPECIAL_ITEM_SKILL_TREES[activeClass][specialItemKey].tiers.flatMap(t => t.skills)
                      ) : []) : 
                    (CLASS_SKILL_TREES[activeClass]?.tiers.flatMap(t => t.skills) || [])
                  ).map(skill => (
                    <button 
                      key={skill.id} 
                      className={`mr-1 mb-1 px-2 py-1 rounded border ${selectedSkillForAssign?.id === skill.id ? 'bg-amber-500 text-black border-amber-500' : 'border-slate-600 hover:bg-slate-700'}`}
                      onClick={() => setSelectedSkillForAssign(skill)}
                    >
                      {skill.icon} {skill.name}
                    </button>
                  ))}
                </div>
              </div>

              <WeaponSelectionPanel
                selectedWeaponType={selectedWeaponType}
                selectedWeaponId={selectedWeaponId}
                selectedTier={selectedWeaponTier}
                weaponSkillLevel={weaponSkillLevel}
                skillSelections={skillSelections}
                onSelectWeaponType={(typeId) => {
                  setSelectedWeaponType(typeId);
                  setSelectedWeaponId(null);
                }}
                onSelectWeapon={(weaponId) => {
                  setSelectedWeaponId(weaponId);
                  if (character) {
                    const updatedChar = { ...character, equippedWeaponId: weaponId };
                    setCharacter(updatedChar);
                    CharacterManager.updateCharacter(updatedChar);
                  }
                }}
                onSelectTier={(tier) => {
                  setSelectedWeaponTier(tier);
                }}
                onSelectSkill={(weaponId, hotkey, skillName) => {
                  const currentSelections = skillSelections[weaponId] || { hotkey2: null, hotkey3: null };
                  const newSelections = { ...currentSelections, [hotkey]: skillName };
                  const updatedSkillSelections = { ...skillSelections, [weaponId]: newSelections };
                  setSkillSelections(updatedSkillSelections);
                  if (character) {
                    const updatedChar = { ...character, weaponSkillSelections: updatedSkillSelections } as any;
                    setCharacter(updatedChar);
                    CharacterManager.updateCharacter(updatedChar);
                  }
                }}
                onChangeSkillLevel={(level) => {
                  setWeaponSkillLevel(level);
                  if (character) {
                    const updatedChar = { ...character, weaponSkillLevel: level } as any;
                    setCharacter(updatedChar);
                    CharacterManager.updateCharacter(updatedChar);
                  }
                }}
              />
            </div>
          ) : (
            <div className="relative" onMouseMove={handleMouseMove}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode === 'class' ? activeClass : activeWeapon}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col gap-12 items-center py-8"
                >
                  {currentTree?.tiers.map((tier: SkillTier, tierIndex: number) => (
                    <div key={tierIndex} className="flex items-center gap-8 w-full">
                      <div className="w-48 text-right pr-4 shrink-0">
                        <span className="text-amber-500 text-xs font-bold uppercase tracking-wider">
                          {tier.name}
                        </span>
                      </div>
                      
                      <div className="flex gap-16 justify-center flex-1">
                        {tier.skills.map((skill: Skill) => {
                          const points = unlockedSkills[skill.id] || 0;
                          const unlocked = points > 0;
                          const available = canUnlockSkill(skill);
                          const maxed = points >= skill.maxPoints;
                          
                          return (
                            <motion.div
                              key={skill.id}
                              className={cn(
                                "w-16 h-16 rounded-full border-3 flex items-center justify-center cursor-pointer relative transition-all",
                                unlocked
                                  ? "border-amber-500 shadow-lg shadow-amber-500/50"
                                  : available
                                  ? "border-emerald-500 animate-pulse"
                                  : "border-slate-600 opacity-50"
                              )}
                              style={{
                                background: unlocked
                                  ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(251, 191, 36, 0.05))'
                                  : 'rgba(30, 41, 59, 0.8)',
                                borderWidth: '3px'
                              }}
                              onClick={() => handleSkillClick(skill)}
                              onMouseEnter={() => setHoveredSkill(skill)}
                              onMouseLeave={() => setHoveredSkill(null)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              data-testid={`skill-${skill.id}`}
                            >
                              <span 
                                className={cn(
                                  "text-2xl transition-all",
                                  unlocked ? "" : "grayscale brightness-50"
                                )}
                              >
                                {skill.icon}
                              </span>
                              
                              {skill.maxPoints > 1 && (
                                <div className="absolute -bottom-2 -right-2 bg-slate-800 border-2 border-amber-500 rounded-lg px-2 py-0.5 text-xs font-bold text-amber-400">
                                  {points}/{skill.maxPoints}
                                </div>
                              )}
                              
                              {maxed && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-xs text-black font-bold">
                                  ✓
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>

              {hoveredSkill && (
                <div
                  className="fixed z-50 bg-slate-900/98 border border-amber-500 rounded-lg p-4 w-72 pointer-events-none shadow-xl"
                  style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                  <h3 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
                    <span className="text-xl">{hoveredSkill.icon}</span>
                    {hoveredSkill.name}
                  </h3>
                  <p className="text-slate-300 text-sm mb-3">{hoveredSkill.description}</p>
                  <div className="text-emerald-400 text-sm font-semibold mb-2">{hoveredSkill.effect}</div>
                  {hoveredSkill.requires && (
                    <div className="text-red-400 text-xs">
                      Requires: {currentTree?.tiers.flatMap(t => t.skills).find(s => s.id === hoveredSkill.requires)?.name}
                    </div>
                  )}
                  <div className="text-slate-500 text-xs mt-2">
                    Max Points: {hoveredSkill.maxPoints}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
