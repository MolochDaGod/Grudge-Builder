import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CharacterManager, type Character } from "../lib/characterManager";
import { RACES, CLASSES } from "@/lib/gameData";
import { SKILLS } from "@shared/definitions/skills";
import { SPELLS } from "@shared/definitions/spells";
import { type SkillDefinition, type SpellDefinition } from "@shared/definitions/types";
import { BATTLE_ARENAS, getRandomArena, type BattleArena } from "@shared/definitions/battleArenas";
import { calculateDerivedStats } from "@shared/statCalculator";
import { 
  WEAPON_ARSENAL, 
  type WeaponArsenal, 
  type WeaponAbility,
  getWeaponStatsAtTier,
  getAbilityDamageAtTier,
  getUnlockedPassives
} from "@shared/definitions/weaponArsenal";
import { 
  calculateDamage, 
  getClassComboEffect,
  type Combatant,
  type ElementalResistances,
  DEFAULT_RESISTANCES,
  type ClassType
} from "@shared/combatCalculations";
import { cn } from "@/lib/utils";
import {
  Sword, Shield, Zap, Sparkles, Heart, Droplet, Battery,
  Target, RotateCcw, Play, Pause, ChevronRight, Skull, 
  Trophy, Home, Star, Flame, Snowflake, Wind, User, Ghost
} from "lucide-react";
import { assetUrl } from "@/lib/assetConfig";
import { useAuthGuard } from '@/hooks/use-auth-guard';

type CombatAbility = SkillDefinition | SpellDefinition | WeaponAbility;

function isSpellAbility(ability: CombatAbility): boolean {
  if ('category' in ability) {
    return ability.category === 'spell';
  }
  if ('type' in ability) {
    return (ability as WeaponAbility).type.startsWith('spell');
  }
  return false;
}

function getAbilityIcon(ability: CombatAbility): string {
  if ('icon' in ability && ability.icon) {
    return ability.icon as string;
  }
  if ('type' in ability) {
    const wa = ability as WeaponAbility;
    if (wa.type === 'basic') return '⚔️';
    if (wa.type === 'signature') return '🔥';
    if (wa.type.startsWith('attack')) return '💥';
    if (wa.type.startsWith('spell')) return '✨';
  }
  return '⚔️';
}

interface BattleCharacter {
  id: string;
  name: string;
  raceId: string;
  classId: string;
  level: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  physDmg: number;
  magDmg: number;
  physDef: number;
  magDef: number;
  crit: number;
  speed: number;
  avatarUrl?: string | null;
  currentAction: "idle" | "attack" | "cast" | "hurt" | "death";
  statusEffects: StatusEffect[];
  cooldowns: Record<string, number>;
  equippedWeaponId?: string;
  weaponTier: number;
  resistances: ElementalResistances;
}

interface BattleEnemy {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  physDmg: number;
  magDmg: number;
  physDef: number;
  magDef: number;
  sprite: string;
  currentAction: "idle" | "attack" | "cast" | "hurt" | "death";
  abilities: EnemyAbility[];
  isBoss?: boolean;
  isMiniBoss?: boolean;
  resistances: ElementalResistances;
  spriteScale: number;
}

interface EnemyAbility {
  id: string;
  name: string;
  damage: number;
  damageType: "physical" | "magical";
  manaCost: number;
  cooldown: number;
}

interface StatusEffect {
  id: string;
  name: string;
  duration: number;
  type: "buff" | "debuff";
  icon: string;
}

interface BattleLog {
  id: string;
  message: string;
  type: "damage" | "heal" | "buff" | "debuff" | "info" | "critical";
  timestamp: number;
}

interface DamagePopup {
  id: string;
  value: number;
  isCrit: boolean;
  isHeal: boolean;
  x: number;
  y: number;
}

type BattleState = "selecting" | "preparing" | "fighting" | "victory" | "defeat";

interface EnemyTemplate {
  name: string;
  baseHp: number;
  baseDmg: number;
  sprite: string;
  abilities: string[];
  isBoss: boolean;
  resistances: ElementalResistances;
}

const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  skeleton: { 
    name: "Skeleton Warrior", baseHp: 80, baseDmg: 8, sprite: "skeleton", 
    abilities: ["bone_strike", "rattle"], isBoss: false,
    resistances: { ...DEFAULT_RESISTANCES, physical: 20, holy: -30 }
  },
  demon: { 
    name: "Lesser Demon", baseHp: 120, baseDmg: 15, sprite: "demon", 
    abilities: ["hellfire", "claw"], isBoss: false,
    resistances: { ...DEFAULT_RESISTANCES, fire: 30, lightning: 15, holy: -30 }
  },
  orc: { 
    name: "Orc Brute", baseHp: 150, baseDmg: 12, sprite: "orc", 
    abilities: ["smash", "roar"], isBoss: false,
    resistances: { ...DEFAULT_RESISTANCES, nature: 10, physical: 5 }
  },
  spider: { 
    name: "Giant Spider", baseHp: 60, baseDmg: 10, sprite: "spider", 
    abilities: ["poison_bite", "web"], isBoss: false,
    resistances: { ...DEFAULT_RESISTANCES, nature: 20, fire: -25 }
  },
  elemental: { 
    name: "Fire Elemental", baseHp: 100, baseDmg: 18, sprite: "elemental", 
    abilities: ["flame_burst", "inferno"], isBoss: false,
    resistances: { ...DEFAULT_RESISTANCES, fire: 50, ice: -25, nature: -15 }
  },
  wraith: { 
    name: "Spectral Wraith", baseHp: 70, baseDmg: 20, sprite: "wraith", 
    abilities: ["soul_drain", "haunt"], isBoss: false,
    resistances: { ...DEFAULT_RESISTANCES, arcane: 40, ice: 30, physical: -20, holy: -40 }
  },
};

const BOSS_TEMPLATES: Record<string, EnemyTemplate> = {
  lich_king: { 
    name: "Lich King", baseHp: 500, baseDmg: 35, sprite: "lich", 
    abilities: ["death_coil", "frost_nova", "raise_dead"], isBoss: true,
    resistances: { ...DEFAULT_RESISTANCES, ice: 50, arcane: 30, fire: -20, holy: -30 }
  },
  demon_lord: { 
    name: "Demon Lord", baseHp: 600, baseDmg: 40, sprite: "demon_lord", 
    abilities: ["hellfire_storm", "soul_rend", "dark_pact"], isBoss: true,
    resistances: { ...DEFAULT_RESISTANCES, fire: 60, lightning: 25, holy: -40, ice: -15 }
  },
  dragon: { 
    name: "Ancient Dragon", baseHp: 800, baseDmg: 50, sprite: "dragon", 
    abilities: ["fire_breath", "tail_swipe", "wing_gust"], isBoss: true,
    resistances: { ...DEFAULT_RESISTANCES, fire: 75, physical: 25, ice: -20 }
  },
  grudge_warlord: { 
    name: "Grudge Warlord", baseHp: 700, baseDmg: 45, sprite: "warlord", 
    abilities: ["crushing_blow", "war_cry", "execute"], isBoss: true,
    resistances: { ...DEFAULT_RESISTANCES, physical: 30, fire: 15, arcane: 15 }
  },
};

function generateEnemy(level: number, arena: BattleArena, forceBoss = false): BattleEnemy {
  const isMiniBossEncounter = !forceBoss && level >= 3 && Math.random() < 0.20;
  const isBossEncounter = forceBoss || (level >= 5 && Math.random() < 0.15);
  
  const templatePool = isBossEncounter ? Object.values(BOSS_TEMPLATES) : Object.values(ENEMY_TEMPLATES);
  const template = templatePool[Math.floor(Math.random() * templatePool.length)];
  const levelMod = 1 + (level * 0.15);
  const bossMod = template.isBoss ? 1.5 : (isMiniBossEncounter ? 1.25 : 1);
  
  const spriteScale = template.isBoss ? 1.5 : (isMiniBossEncounter ? 1.25 : 1.0);
  
  return {
    id: `enemy-${Date.now()}`,
    name: isMiniBossEncounter && !template.isBoss ? `Elite ${template.name}` : template.name,
    level,
    hp: Math.floor(template.baseHp * levelMod * bossMod),
    maxHp: Math.floor(template.baseHp * levelMod * bossMod),
    mana: 100,
    maxMana: 100,
    physDmg: Math.floor(template.baseDmg * levelMod),
    magDmg: Math.floor(template.baseDmg * levelMod * 0.8),
    physDef: Math.floor(5 * levelMod * bossMod),
    magDef: Math.floor(3 * levelMod * bossMod),
    sprite: template.sprite,
    currentAction: "idle",
    isBoss: template.isBoss,
    isMiniBoss: isMiniBossEncounter && !template.isBoss,
    resistances: template.resistances,
    spriteScale,
    abilities: [
      { id: "basic_attack", name: "Attack", damage: Math.floor(template.baseDmg * levelMod), damageType: "physical", manaCost: 0, cooldown: 0 },
      { id: "special", name: "Special", damage: Math.floor(template.baseDmg * levelMod * 1.5), damageType: "magical", manaCost: 20, cooldown: 2 },
    ]
  };
}

function characterToBattleChar(char: Character): BattleCharacter {
  const stats = calculateDerivedStats(char.attributes, char.classId);
  const weaponId = char.equippedWeaponId || getDefaultWeaponForClass(char.classId);
  const baseResists: ElementalResistances = { ...DEFAULT_RESISTANCES };
  if (char.classId === 'mage') {
    baseResists.arcane = 15;
    baseResists.fire = 10;
  } else if (char.classId === 'warrior') {
    baseResists.physical = 10;
  } else if (char.classId === 'ranger') {
    baseResists.nature = 15;
  } else if (char.classId === 'shapeshifter') {
    baseResists.nature = 20;
    baseResists.physical = 5;
  }
  
  const rawTier = 1 + Math.floor(char.level / 5);
  const clampedTier = Math.min(8, Math.max(1, rawTier));
  
  return {
    id: char.id,
    name: char.name,
    raceId: char.raceId,
    classId: char.classId,
    level: char.level,
    hp: stats.maxHealth,
    maxHp: stats.maxHealth,
    mana: stats.maxMana,
    maxMana: stats.maxMana,
    stamina: stats.maxStamina,
    maxStamina: stats.maxStamina,
    physDmg: stats.physDmg,
    magDmg: stats.magDmg,
    physDef: stats.physDef,
    magDef: stats.magDef,
    crit: stats.crit,
    speed: stats.speed,
    avatarUrl: char.avatarUrl,
    currentAction: "idle",
    statusEffects: [],
    cooldowns: {},
    equippedWeaponId: weaponId,
    weaponTier: clampedTier,
    resistances: baseResists
  };
}

function getClassSkills(classId: string, equippedWeaponId?: string): CombatAbility[] {
  if (equippedWeaponId && WEAPON_ARSENAL[equippedWeaponId]) {
    const weapon = WEAPON_ARSENAL[equippedWeaponId];
    const abilities: CombatAbility[] = [weapon.basicAttack, weapon.signature];
    abilities.push(...weapon.attacks);
    if (weapon.spells && weapon.spells.length > 0) {
      abilities.push(...weapon.spells);
    }
    return abilities.slice(0, 6);
  }
  
  const classSkillMap: Record<string, string[]> = {
    shapeshifter: ["skill_feral_strike", "skill_savage_pounce", "skill_slash"],
    warrior: ["skill_slash", "skill_power_strike", "skill_whirlwind"],
    mage: ["spell_fireball", "spell_frostbolt", "spell_lightning_bolt"],
    ranger: ["skill_aimed_shot", "skill_multi_shot", "skill_explosive_arrow"],
  };
  
  const skillIds = classSkillMap[classId] || classSkillMap.warrior;
  const allAbilities: Record<string, CombatAbility> = { ...SKILLS, ...SPELLS };
  return skillIds.map(id => allAbilities[id]).filter(Boolean);
}

function getDefaultWeaponForClass(classId: string): string | undefined {
  const classWeaponMap: Record<string, string> = {
    warrior: 'bloodfeud_blade',
    shapeshifter: 'bloodfeud_blade',
    ranger: 'bloodfeud_blade',
    mage: 'bloodfeud_blade',
  };
  return classWeaponMap[classId];
}

export default function RPGBattle() {
  const authReady = useAuthGuard();
  if (!authReady) return null;

  const [, setLocation] = useLocation();
  
  const [battleState, setBattleState] = useState<BattleState>("selecting");
  const [arena, setArena] = useState<BattleArena>(BATTLE_ARENAS.ruined_fortress);
  const [round, setRound] = useState(1);
  
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [selectedParty, setSelectedParty] = useState<Character[]>([]);
  const [partySlots, setPartySlots] = useState<(BattleCharacter | null)[]>([null, null, null]);
  
  const [enemy, setEnemy] = useState<BattleEnemy | null>(null);
  const [activeCharIndex, setActiveCharIndex] = useState(0);
  const [turnOrder, setTurnOrder] = useState<("party" | "enemy")[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  
  const [battleLog, setBattleLog] = useState<BattleLog[]>([]);
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    const loadCharacters = async () => {
      const chars = await CharacterManager.getAll();
      setAllCharacters(chars);
    };
    loadCharacters();
  }, []);

  const addLog = useCallback((message: string, type: BattleLog["type"] = "info") => {
    setBattleLog(prev => [...prev.slice(-20), {
      id: `log-${Date.now()}-${Math.random()}`,
      message,
      type,
      timestamp: Date.now()
    }]);
  }, []);

  const showDamage = useCallback((value: number, isCrit: boolean, isHeal: boolean, targetX: number, targetY: number) => {
    const popup: DamagePopup = {
      id: `dmg-${Date.now()}`,
      value,
      isCrit,
      isHeal,
      x: targetX + (Math.random() - 0.5) * 40,
      y: targetY
    };
    setDamagePopups(prev => [...prev, popup]);
    setTimeout(() => {
      setDamagePopups(prev => prev.filter(p => p.id !== popup.id));
    }, 1500);
  }, []);

  const togglePartyMember = (char: Character) => {
    if (selectedParty.find(c => c.id === char.id)) {
      setSelectedParty(prev => prev.filter(c => c.id !== char.id));
    } else if (selectedParty.length < 3) {
      setSelectedParty(prev => [...prev, char]);
    }
  };

  const startBattle = () => {
    if (selectedParty.length === 0) return;
    
    const battleChars = selectedParty.map(characterToBattleChar);
    const slots: (BattleCharacter | null)[] = [null, null, null];
    battleChars.forEach((bc, i) => { if (i < 3) slots[i] = bc; });
    setPartySlots(slots);
    
    const avgLevel = Math.round(selectedParty.reduce((sum, c) => sum + c.level, 0) / selectedParty.length);
    const newArena = getRandomArena(avgLevel);
    setArena(newArena);
    
    const newEnemy = generateEnemy(avgLevel, newArena);
    setEnemy(newEnemy);
    
    setRound(1);
    setActiveCharIndex(0);
    setCurrentTurnIndex(0);
    setBattleLog([]);
    setBattleState("fighting");
    
    addLog(`Battle begins in ${newArena.name}!`, "info");
    addLog(`A ${newEnemy.name} (Lv.${newEnemy.level}) appears!`, "info");
  };

  const calculateBattleDamage = (
    attacker: BattleCharacter, 
    defender: BattleEnemy, 
    skill: CombatAbility
  ): { damage: number; isCrit: boolean; elementApplied: string | null; comboTriggered: boolean } => {
    const isWeaponAbility = 'type' in skill;
    const isPhysical = isWeaponAbility 
      ? !(skill as WeaponAbility).type.startsWith('spell')
      : (skill as any).damageType === "physical";
    
    const tierMultiplier = 1 + ((attacker.weaponTier - 1) * 0.15);
    
    const damageMultiplier = isWeaponAbility ? (skill as WeaponAbility).damageMultiplier : 1;
    const baseDmg = isWeaponAbility 
      ? (attacker.physDmg + attacker.magDmg) * damageMultiplier * tierMultiplier
      : ((skill as any).baseDamage || (skill as any).damage || 10);
    
    const attackStat = isPhysical ? attacker.physDmg : attacker.magDmg;
    const defenseStat = isPhysical ? defender.physDef : defender.magDef;
    
    const scalingRatio = isWeaponAbility ? (skill as WeaponAbility).scaling.ratio : 1;
    const scaledDmg = baseDmg + (attackStat * scalingRatio);
    
    const element = isWeaponAbility ? (skill as WeaponAbility).element : null;
    let elementResist = 0;
    if (element && defender.resistances[element] !== undefined) {
      elementResist = Math.min(75, Math.max(-50, defender.resistances[element]));
    }
    const physResist = Math.min(75, Math.max(-50, defender.resistances.physical || 0));
    
    let physDmg = isPhysical ? scaledDmg * (1 - physResist / 100) : 0;
    let magDmg = !isPhysical ? scaledDmg * (1 - elementResist / 100) : 0;
    
    const defMitigation = Math.min(90, Math.sqrt(defenseStat));
    const mitigated = Math.max(1, (physDmg + magDmg) * (100 - defMitigation) / 100);
    
    const variance = 0.75 + Math.random() * 0.5;
    
    const critChance = (attacker.crit || 0) / 100;
    const isCrit = Math.random() < Math.min(0.75, critChance);
    const critMult = isCrit ? 1.5 : 1;
    
    let comboMultiplier = 1;
    let comboTriggered = false;
    const classType = attacker.classId as ClassType;
    if (classType === 'warrior' && isWeaponAbility && (skill as WeaponAbility).type !== 'basic') {
      comboMultiplier = 1.25;
      comboTriggered = true;
    } else if (classType === 'mage' && isWeaponAbility && (skill as WeaponAbility).type.startsWith('spell')) {
      comboMultiplier = 0.5;
      comboTriggered = true;
    }
    
    const totalDamage = Math.floor((mitigated * variance * critMult * comboMultiplier) / 2);
    
    return {
      damage: Math.max(1, totalDamage),
      isCrit,
      elementApplied: element || null,
      comboTriggered
    };
  };

  const handleSkillUse = (skillIndex: number) => {
    if (battleState !== "fighting" || isAnimating) return;
    
    const activeChar = partySlots[activeCharIndex];
    if (!activeChar || !enemy || activeChar.hp <= 0) return;
    
    const weaponId = activeChar.equippedWeaponId || getDefaultWeaponForClass(activeChar.classId);
    const skills = getClassSkills(activeChar.classId, weaponId);
    const skill = skills[skillIndex];
    if (!skill) return;
    
    const manaCost = skill.manaCost || 0;
    const staminaCost = skill.staminaCost || 0;
    
    if (activeChar.mana < manaCost) {
      addLog(`${activeChar.name} doesn't have enough mana!`, "info");
      return;
    }
    if (activeChar.stamina < staminaCost) {
      addLog(`${activeChar.name} doesn't have enough stamina!`, "info");
      return;
    }
    
    setIsAnimating(true);
    
    setPartySlots(prev => prev.map((c, i) => 
      i === activeCharIndex && c ? { 
        ...c, 
        mana: c.mana - manaCost,
        stamina: c.stamina - staminaCost,
        currentAction: isSpellAbility(skill) ? "cast" : "attack"
      } : c
    ));
    
    const { damage, isCrit, elementApplied, comboTriggered } = calculateBattleDamage(activeChar, enemy, skill);
    
    setTimeout(() => {
      setEnemy(prev => prev ? { ...prev, currentAction: "hurt" } : null);
      showDamage(damage, isCrit, false, 75, 35);
      
      const newEnemyHp = Math.max(0, enemy.hp - damage);
      setEnemy(prev => prev ? { ...prev, hp: newEnemyHp } : null);
      
      const elementText = elementApplied ? ` (${elementApplied})` : '';
      const comboText = comboTriggered ? ' COMBO!' : '';
      addLog(`${activeChar.name} uses ${skill.name}${elementText} for ${damage}${isCrit ? " CRITICAL" : ""}${comboText} damage!`, isCrit ? "critical" : "damage");
      
      setTimeout(() => {
        setPartySlots(prev => prev.map((c, i) => 
          i === activeCharIndex && c ? { ...c, currentAction: "idle" } : c
        ));
        setEnemy(prev => prev ? { ...prev, currentAction: "idle" } : null);
        
        if (newEnemyHp <= 0) {
          handleVictory();
        } else {
          enemyTurn();
        }
      }, 600);
    }, 400);
  };

  const enemyTurn = () => {
    if (!enemy) return;
    
    const ability = enemy.abilities[0];
    const aliveParty = partySlots.filter((c): c is BattleCharacter => c !== null && c.hp > 0);
    if (aliveParty.length === 0) {
      handleDefeat();
      return;
    }
    
    const target = aliveParty[Math.floor(Math.random() * aliveParty.length)];
    const targetIndex = partySlots.findIndex(c => c?.id === target.id);
    
    setEnemy(prev => prev ? { ...prev, currentAction: "attack" } : null);
    
    setTimeout(() => {
      const damage = Math.max(1, ability.damage - (target.physDef * 0.3));
      const finalDamage = Math.floor(damage * (0.9 + Math.random() * 0.2));
      
      setPartySlots(prev => prev.map((c, i) => 
        i === targetIndex && c ? { ...c, currentAction: "hurt", hp: Math.max(0, c.hp - finalDamage) } : c
      ));
      
      showDamage(finalDamage, false, false, 25 + targetIndex * 8, 70);
      addLog(`${enemy.name} attacks ${target.name} for ${finalDamage} damage!`, "damage");
      
      setTimeout(() => {
        setEnemy(prev => prev ? { ...prev, currentAction: "idle" } : null);
        setPartySlots(prev => prev.map(c => c ? { ...c, currentAction: c.hp <= 0 ? "death" : "idle" } : c));
        
        const stillAlive = partySlots.filter((c): c is BattleCharacter => c !== null && c.hp - (c.id === target.id ? finalDamage : 0) > 0);
        if (stillAlive.length === 0) {
          handleDefeat();
        } else {
          moveToNextAliveChar();
          setIsAnimating(false);
        }
      }, 500);
    }, 500);
  };

  const moveToNextAliveChar = () => {
    let nextIndex = activeCharIndex;
    for (let i = 0; i < 3; i++) {
      nextIndex = (nextIndex + 1) % 3;
      const char = partySlots[nextIndex];
      if (char && char.hp > 0) {
        setActiveCharIndex(nextIndex);
        return;
      }
    }
  };

  const handleVictory = () => {
    setBattleState("victory");
    addLog("Victory! The enemy has been defeated!", "info");
  };

  const handleDefeat = () => {
    setBattleState("defeat");
    addLog("Defeat... Your party has fallen.", "info");
  };

  const resetBattle = () => {
    setBattleState("selecting");
    setSelectedParty([]);
    setPartySlots([null, null, null]);
    setEnemy(null);
    setBattleLog([]);
    setRound(1);
  };

  const activeChar = partySlots[activeCharIndex];
  const equippedWeapon = activeChar ? (activeChar.equippedWeaponId || getDefaultWeaponForClass(activeChar.classId)) : undefined;
  const activeSkills = activeChar ? getClassSkills(activeChar.classId, equippedWeapon) : [];

  const getArenaBackground = () => {
    return {
      background: arena.backgroundGradient,
      boxShadow: `inset 0 0 100px ${arena.ambientColor}40`
    };
  };

  if (battleState === "selecting") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-amber-400 font-['Cinzel']">RPG Battle</h1>
            <Button variant="outline" onClick={() => setLocation("/")} data-testid="btn-back-home">
              <Home className="w-4 h-4 mr-2" /> Home
            </Button>
          </div>
          
          <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-900/30 mb-6">
            <h2 className="text-xl font-semibold text-amber-300 mb-4">Select Your Party (up to 3)</h2>
            
            {allCharacters.length === 0 ? (
              <p className="text-slate-400">No characters found. Create a character first!</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {allCharacters.map(char => {
                  const isSelected = selectedParty.find(c => c.id === char.id);
                  const race = RACES.find(r => r.id === char.raceId);
                  const cls = CLASSES.find(c => c.id === char.classId);
                  
                  return (
                    <button
                      key={char.id}
                      onClick={() => togglePartyMember(char)}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all text-left",
                        isSelected 
                          ? "border-amber-500 bg-amber-900/30" 
                          : "border-slate-700 bg-slate-800/50 hover:border-slate-500"
                      )}
                      data-testid={`select-char-${char.id}`}
                    >
                      <div className="flex items-center gap-3">
                        {char.avatarUrl ? (
                          <img src={char.avatarUrl} alt={char.name} className="w-12 h-12 rounded-full object-cover border-2 border-slate-600" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
                            <User className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-amber-200">{char.name}</p>
                          <p className="text-xs text-slate-400">Lv.{char.level} {cls?.name || "Unknown"}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="mt-2 text-center text-xs text-amber-400 font-medium">
                          SELECTED
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-slate-400">
              {selectedParty.length}/3 characters selected
            </p>
            <Button
              onClick={startBattle}
              disabled={selectedParty.length === 0}
              className="bg-red-600 hover:bg-red-700"
              data-testid="btn-start-battle"
            >
              <Sword className="w-4 h-4 mr-2" /> Start Battle
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div 
        className="flex-1 relative"
        style={getArenaBackground()}
        data-testid="battle-arena"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
        
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
          <div className="bg-black/70 rounded-lg px-4 py-2 border border-amber-900/50">
            <p className="text-amber-400 font-['Cinzel'] text-lg">{arena.name}</p>
            <p className="text-slate-400 text-sm">Round {round}</p>
          </div>
          
          {enemy && (
            <div className={cn(
              "bg-black/70 rounded-lg px-4 py-2 border text-right flex items-center gap-3",
              enemy.isBoss ? "border-purple-500/70 shadow-[0_0_15px_rgba(168,85,247,0.4)]" 
                : enemy.isMiniBoss ? "border-yellow-500/70 shadow-[0_0_12px_rgba(234,179,8,0.3)]"
                : "border-red-900/50"
            )}>
              {(enemy.isBoss || enemy.isMiniBoss) && (
                <img 
                  src={assetUrl("/sprites/ui/boss-indicator.png")} 
                  alt={enemy.isBoss ? "Boss" : "Elite"} 
                  className={cn(
                    "animate-pulse",
                    enemy.isBoss ? "w-10 h-10" : "w-8 h-8"
                  )}
                  style={{ 
                    filter: enemy.isBoss 
                      ? 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.6))' 
                      : 'drop-shadow(0 0 6px rgba(234, 179, 8, 0.5))'
                  }}
                />
              )}
              <div>
                <p className={cn(
                  "font-semibold font-['Cinzel']",
                  enemy.isBoss ? "text-purple-400" : enemy.isMiniBoss ? "text-yellow-400" : "text-red-400"
                )}>
                  {enemy.isBoss && <span className="text-yellow-400">★ </span>}
                  {enemy.isMiniBoss && <span className="text-amber-300">⬥ </span>}
                  {enemy.name}
                </p>
                <p className="text-slate-400 text-sm">
                  {enemy.isBoss && <span className="text-purple-300 mr-1">BOSS</span>}
                  {enemy.isMiniBoss && <span className="text-yellow-300 mr-1">ELITE</span>}
                  Level {enemy.level}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {enemy && (
          <div className="absolute top-1/4 right-[20%] transform -translate-y-1/2">
            <div 
              className="relative transition-transform duration-300"
              style={{ transform: `scale(${enemy.spriteScale})` }}
            >
              {(enemy.isBoss || enemy.isMiniBoss) && (
                <img 
                  src={assetUrl("/sprites/ui/boss-indicator.png")} 
                  alt={enemy.isBoss ? "Boss" : "Mini-Boss"} 
                  className={cn(
                    "absolute left-1/2 transform -translate-x-1/2 z-10",
                    enemy.isBoss ? "-top-8 w-14 h-14 animate-bounce" : "-top-6 w-10 h-10 animate-pulse"
                  )}
                  style={{ 
                    filter: enemy.isBoss 
                      ? 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.8))' 
                      : 'drop-shadow(0 0 8px rgba(234, 179, 8, 0.6))'
                  }}
                />
              )}
              <div className={cn(
                "w-32 h-32 rounded-full bg-gradient-to-br border-4 flex items-center justify-center transition-all",
                enemy.isBoss 
                  ? "from-purple-900/60 to-slate-900/80 border-purple-600 shadow-[0_0_25px_rgba(168,85,247,0.5)]" 
                  : enemy.isMiniBoss
                    ? "from-yellow-900/60 to-slate-900/80 border-yellow-600 shadow-[0_0_20px_rgba(234,179,8,0.4)]"
                    : "from-red-900/60 to-slate-900/80 border-red-800",
                enemy.currentAction === "hurt" && "animate-pulse",
                enemy.currentAction === "hurt" && (enemy.isBoss ? "border-purple-400" : enemy.isMiniBoss ? "border-yellow-400" : "border-red-500"),
                enemy.hp <= 0 && "opacity-50 grayscale"
              )}>
                <Skull className={cn(
                  "w-16 h-16", 
                  enemy.isBoss ? "text-purple-400" : enemy.isMiniBoss ? "text-yellow-400" : "text-red-400"
                )} />
              </div>
              
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-40">
                <div className="bg-black/80 rounded px-2 py-1">
                  <div className="flex items-center gap-1 mb-1">
                    <Heart className="w-3 h-3 text-red-500" />
                    <Progress value={(enemy.hp / enemy.maxHp) * 100} className="h-2 flex-1 bg-slate-700" />
                    <span className="text-xs text-red-400">{enemy.hp}/{enemy.maxHp}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="absolute bottom-28 left-4 right-4 flex justify-center gap-6">
          {partySlots.map((char, index) => {
            if (!char) return (
              <div key={index} className="w-24 h-24 rounded-full border-2 border-dashed border-slate-600 bg-slate-800/30" />
            );
            
            const isActive = index === activeCharIndex && battleState === "fighting";
            const isDead = char.hp <= 0;
            
            return (
              <div key={char.id} className="relative" data-testid={`party-slot-${index}`}>
                <div className={cn(
                  "w-24 h-24 rounded-full border-4 overflow-hidden transition-all",
                  isActive ? "border-amber-400 ring-4 ring-amber-400/30 scale-110" : "border-slate-600",
                  isDead && "opacity-50 grayscale border-red-900",
                  char.currentAction === "hurt" && "animate-pulse border-red-500"
                )}>
                  {char.avatarUrl ? (
                    <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                      <User className="w-10 h-10 text-slate-400" />
                    </div>
                  )}
                </div>
                
                <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 w-32 space-y-1 bg-black/70 rounded-lg p-2">
                  <p className="text-center text-xs font-semibold text-amber-300 truncate">{char.name}</p>
                  
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-red-500 flex-shrink-0" />
                    <Progress value={(char.hp / char.maxHp) * 100} className="h-1.5 flex-1 bg-slate-700" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Droplet className="w-3 h-3 text-blue-500 flex-shrink-0" />
                    <Progress value={(char.mana / char.maxMana) * 100} className="h-1.5 flex-1 bg-slate-700" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Battery className="w-3 h-3 text-green-500 flex-shrink-0" />
                    <Progress value={(char.stamina / char.maxStamina) * 100} className="h-1.5 flex-1 bg-slate-700" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {damagePopups.map(popup => (
          <div
            key={popup.id}
            className={cn(
              "absolute text-2xl font-bold pointer-events-none animate-bounce",
              popup.isCrit ? "text-yellow-400 text-3xl" : popup.isHeal ? "text-green-400" : "text-red-400"
            )}
            style={{ left: `${popup.x}%`, top: `${popup.y}%`, transform: "translate(-50%, -50%)" }}
          >
            {popup.isHeal ? "+" : "-"}{popup.value}
            {popup.isCrit && <span className="text-xs ml-1">CRIT!</span>}
          </div>
        ))}
        
        {(battleState === "victory" || battleState === "defeat") && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="text-center">
              {battleState === "victory" ? (
                <>
                  <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-4 animate-bounce" />
                  <h2 className="text-4xl font-bold text-yellow-400 font-['Cinzel'] mb-2">VICTORY!</h2>
                  <p className="text-slate-300 mb-6">You have defeated {enemy?.name}!</p>
                </>
              ) : (
                <>
                  <Skull className="w-24 h-24 text-red-500 mx-auto mb-4" />
                  <h2 className="text-4xl font-bold text-red-500 font-['Cinzel'] mb-2">DEFEAT</h2>
                  <p className="text-slate-300 mb-6">Your party has been defeated...</p>
                </>
              )}
              <div className="flex gap-4 justify-center">
                <Button onClick={resetBattle} className="bg-amber-600 hover:bg-amber-700" data-testid="btn-fight-again">
                  <RotateCcw className="w-4 h-4 mr-2" /> Fight Again
                </Button>
                <Button variant="outline" onClick={() => setLocation("/")} data-testid="btn-return-home">
                  <Home className="w-4 h-4 mr-2" /> Return Home
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-gradient-to-t from-slate-900 to-slate-800 border-t border-amber-900/30 p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 bg-black/40 rounded-lg p-3 h-24 overflow-y-auto border border-slate-700">
            {battleLog.slice(-5).map(log => (
              <p 
                key={log.id} 
                className={cn(
                  "text-sm",
                  log.type === "critical" && "text-yellow-400 font-bold",
                  log.type === "damage" && "text-red-400",
                  log.type === "heal" && "text-green-400",
                  log.type === "info" && "text-slate-300"
                )}
              >
                {log.message}
              </p>
            ))}
          </div>
          
          <div className="flex gap-2">
            {activeSkills.map((skill, index) => (
              <Button
                key={skill.id}
                onClick={() => handleSkillUse(index)}
                disabled={battleState !== "fighting" || isAnimating || !activeChar || activeChar.hp <= 0}
                className={cn(
                  "w-20 h-20 flex flex-col items-center justify-center gap-1 p-2",
                  isSpellAbility(skill) 
                    ? "bg-purple-900/80 hover:bg-purple-800 border-purple-600" 
                    : "bg-red-900/80 hover:bg-red-800 border-red-600",
                  "border-2"
                )}
                data-testid={`skill-btn-${index}`}
              >
                <span className="text-2xl">{getAbilityIcon(skill)}</span>
                <span className="text-[10px] leading-tight text-center truncate w-full">{skill.name}</span>
                {(skill.manaCost > 0 || skill.staminaCost > 0) && (
                  <span className="text-[8px] text-slate-300">
                    {skill.manaCost > 0 && <span className="text-blue-300">{skill.manaCost} MP</span>}
                    {skill.staminaCost > 0 && <span className="text-green-300 ml-1">{skill.staminaCost} ST</span>}
                  </span>
                )}
              </Button>
            ))}
            
            <Button
              onClick={resetBattle}
              variant="outline"
              className="w-16 h-20"
              data-testid="btn-flee"
            >
              <div className="flex flex-col items-center">
                <Home className="w-5 h-5 mb-1" />
                <span className="text-[10px]">Flee</span>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
