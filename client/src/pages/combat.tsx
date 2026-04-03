import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import Layout from "@/components/Layout";
import { CharacterManager, Character } from "@/lib/characterManager";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import SpriteAnimator from "@/components/SpriteAnimator";
import { RACES, CLASSES } from "@/lib/gameData";
import { motion, AnimatePresence } from "framer-motion";
import { Skull, Sword, Shield, Heart, Zap, Sparkles, Target, Trophy, Flame, FlaskConical, Star, Crosshair, Wind, Moon, Scroll } from "lucide-react";
import { FF7CombatFooter } from "@/components/CombatUnitStatus";
import { SlashEffect, FireEffect, IceEffect, ElectricEffect, CritEffect, DamageNumber, VictoryEffect } from "@/components/CombatEffects";
import { CLASS_SKILL_TREES } from "@/lib/skillTreeData";
import { SKILLS } from "@shared/definitions/skills";
import { SPELLS } from "@shared/definitions/spells";
import { deriveCharacterStats } from "@shared/rulesEngine";
import { assetUrl } from "@/lib/assetConfig";
import { playBGM, playRandomHit, playSFX } from "@/lib/audioManager";

interface Enemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  damage: number;
  level: number;
  spriteSet: string;
  background: number;
}

const BATTLE_BACKGROUNDS = [
  { name: "Ruined Fortress", image: "/attached_assets/19b57f7ec8a98_1766707452256.png", position: "0% 0%" },
  { name: "Corrupted Forest", image: "/attached_assets/19b57f7ec8a98_1766707452256.png", position: "100% 0%" },
  { name: "Frozen Citadel", image: "/attached_assets/19b57f7ec8a98_1766707452256.png", position: "0% 50%" },
  { name: "Volcanic Arena", image: "/attached_assets/19b57f7ec8a98_1766707452256.png", position: "100% 50%" },
  { name: "Frozen Council", image: "/attached_assets/19b57f7ec8a98_1766707452256.png", position: "0% 100%" },
  { name: "Mystic Swamp", image: "/attached_assets/19b57f7ec8a98_1766707452256.png", position: "100% 100%" },
];

const ENEMY_TEMPLATES = [
  { name: "Goblin Scout", hp: 50, maxHp: 50, damage: 5, level: 1, spriteSet: "Orc", background: 0 },
  { name: "Orc Warrior", hp: 120, maxHp: 120, damage: 12, level: 3, spriteSet: "Orc", background: 1 },
  { name: "Dark Knight", hp: 300, maxHp: 300, damage: 25, level: 5, spriteSet: "Skeleton", background: 2 },
  { name: "Dragon Whelp", hp: 1000, maxHp: 1000, damage: 50, level: 10, spriteSet: "Soldier", background: 3 },
];

type ActionType = "Idle" | "Attack" | "Cast" | "Hurt" | "Death" | "Victory";
type CommandCategory = "attack" | "skill" | "spell" | "item" | "special" | null;

interface CombatBuff {
  id: string;
  name: string;
  icon: string;
  duration: number;
  stacks: number;
  maxStacks: number;
  effect: Record<string, number>;
}

interface CombatHero extends Character {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  currentAction: ActionType;
  buffs: CombatBuff[];
  isTransformed: boolean;
  transformedSprite?: string;
  rangerCritStacks: number;
  isInvincible: boolean;
}

interface CombatAbility {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  damage: number;
  manaCost: number;
  staminaCost: number;
  type: "attack" | "skill" | "spell" | "special";
  effectType?: "slash" | "fire" | "ice" | "electric" | "heal" | "buff";
}

interface ActiveEffect {
  id: string;
  type: "slash" | "fire" | "ice" | "electric" | "crit" | "transform" | "shield";
  position: { x: number; y: number };
}

interface DamagePopup {
  id: string;
  damage: number;
  isCrit: boolean;
  isHeal?: boolean;
  position: { x: number; y: number };
}

interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  quantity: number;
  effect: "heal_hp" | "heal_mp" | "heal_stamina" | "buff";
  value: number;
}

const FACTION_WORG_SPRITES: Record<string, string> = {
  Crusade: "BloodWorg",
  Legion: "ShadowWorg",
  Fabled: "FrostWorg",
};

const FACTION_WORG_COLORS: Record<string, string> = {
  Crusade: "from-red-600 to-red-900",
  Legion: "from-purple-600 to-purple-900",
  Fabled: "from-cyan-500 to-blue-800",
};

const DEFAULT_INVENTORY: InventoryItem[] = [
  { id: "potion", name: "Health Potion", icon: "🧪", quantity: 5, effect: "heal_hp", value: 50 },
  { id: "ether", name: "Mana Ether", icon: "💧", quantity: 3, effect: "heal_mp", value: 30 },
  { id: "stamina_drink", name: "Energy Drink", icon: "⚡", quantity: 3, effect: "heal_stamina", value: 25 },
];

const MAX_PARTY_SIZE = 3;

function getClassSpecial(classId: string, faction?: string): CombatAbility {
  const specials: Record<string, CombatAbility> = {
    warrior: {
      id: "special_invincibility",
      name: "Invincibility",
      icon: <Shield className="w-4 h-4" />,
      description: "Become immune to all damage for 1 turn",
      damage: 0,
      manaCost: 0,
      staminaCost: 20,
      type: "special",
      effectType: "buff",
    },
    mage: {
      id: "special_mana_shield",
      name: "Mana Shield",
      icon: <Sparkles className="w-4 h-4" />,
      description: "Gain stacking crit chance and crit damage (max 3 stacks)",
      damage: 0,
      manaCost: 25,
      staminaCost: 0,
      type: "special",
      effectType: "buff",
    },
    shapeshifter: {
      id: "special_primal_shift",
      name: "Primal Shift",
      icon: <Moon className="w-4 h-4" />,
      description: `Transform into ${faction ? FACTION_WORG_SPRITES[faction] || "Worg" : "Worg"} form. Gain attack/speed and taunt, but lose control`,
      damage: 0,
      manaCost: 0,
      staminaCost: 30,
      type: "special",
      effectType: "buff",
    },
    ranger: {
      id: "special_precision",
      name: "Hunter's Focus",
      icon: <Crosshair className="w-4 h-4" />,
      description: "Passive: Gain +10% crit chance each turn. Resets on critical hit.",
      damage: 0,
      manaCost: 0,
      staminaCost: 0,
      type: "special",
      effectType: "buff",
    },
  };
  return specials[classId] || specials.warrior;
}

function getClassSkills(classId: string): CombatAbility[] {
  const tree = CLASS_SKILL_TREES[classId === "shapeshifter" ? "worg" : classId];
  if (!tree) return [];
  
  const abilities: CombatAbility[] = [];
  
  tree.tiers.slice(1, 5).forEach((tier, tierIndex) => {
    const skill = tier.skills[0];
    if (skill) {
      abilities.push({
        id: `skill_${skill.id}`,
        name: skill.name,
        icon: <span>{skill.icon}</span>,
        description: skill.description,
        damage: 15 + tierIndex * 10,
        manaCost: 10 + tierIndex * 5,
        staminaCost: 5 + tierIndex * 3,
        type: "skill",
        effectType: "slash",
      });
    }
  });
  
  return abilities.slice(0, 4);
}

function getClassSpells(classId: string): CombatAbility[] {
  const spellMap: Record<string, CombatAbility[]> = {
    mage: [
      { id: "spell_fireball", name: "Fireball", icon: <Flame className="w-4 h-4" />, description: "Hurl a ball of fire", damage: 35, manaCost: 20, staminaCost: 0, type: "spell", effectType: "fire" },
      { id: "spell_frostbolt", name: "Frostbolt", icon: <Wind className="w-4 h-4" />, description: "Launch a bolt of frost", damage: 28, manaCost: 15, staminaCost: 0, type: "spell", effectType: "ice" },
      { id: "spell_lightning", name: "Lightning Bolt", icon: <Zap className="w-4 h-4" />, description: "Strike with lightning", damage: 45, manaCost: 30, staminaCost: 0, type: "spell", effectType: "electric" },
      { id: "spell_heal", name: "Heal", icon: <Heart className="w-4 h-4" />, description: "Restore health", damage: -40, manaCost: 25, staminaCost: 0, type: "spell", effectType: "heal" },
    ],
    warrior: [
      { id: "spell_battlecry", name: "Battle Cry", icon: <Zap className="w-4 h-4" />, description: "Boost attack power", damage: 0, manaCost: 15, staminaCost: 10, type: "spell", effectType: "buff" },
    ],
    shapeshifter: [
      { id: "spell_howl", name: "Primal Howl", icon: <Moon className="w-4 h-4" />, description: "Debuff enemy defense", damage: 10, manaCost: 20, staminaCost: 5, type: "spell", effectType: "electric" },
    ],
    ranger: [
      { id: "spell_poison_arrow", name: "Poison Arrow", icon: <FlaskConical className="w-4 h-4" />, description: "Poison the target", damage: 20, manaCost: 15, staminaCost: 5, type: "spell", effectType: "fire" },
    ],
  };
  return spellMap[classId] || [];
}

function getBasicAttack(classId: string): CombatAbility {
  const attacks: Record<string, CombatAbility> = {
    warrior: { id: "attack_slash", name: "Slash", icon: <Sword className="w-4 h-4" />, description: "Basic sword attack", damage: 12, manaCost: 0, staminaCost: 5, type: "attack", effectType: "slash" },
    mage: { id: "attack_staff", name: "Staff Strike", icon: <Sword className="w-4 h-4" />, description: "Hit with your staff", damage: 8, manaCost: 0, staminaCost: 3, type: "attack", effectType: "slash" },
    shapeshifter: { id: "attack_claw", name: "Claw Strike", icon: <Sword className="w-4 h-4" />, description: "Slash with claws", damage: 14, manaCost: 0, staminaCost: 6, type: "attack", effectType: "slash" },
    ranger: { id: "attack_shot", name: "Quick Shot", icon: <Target className="w-4 h-4" />, description: "Fire an arrow", damage: 11, manaCost: 0, staminaCost: 4, type: "attack", effectType: "slash" },
  };
  return attacks[classId] || attacks.warrior;
}

function getFactionFromRace(raceId: string): string {
  const race = RACES.find(r => r.id === raceId);
  return race?.faction || "Crusade";
}

interface MissionData {
  id: string;
  title: string;
  description: string;
  missionType: string;
  objectives: Array<{ id: string; description: string; type: string; data?: { targetCount?: number } }>;
  rewards: { xp: number; gold: number };
}

interface MissionProgress {
  id: string;
  missionId: string;
  status: string;
  objectivesCompleted: string[];
}

export default function CombatPage() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [selectedParty, setSelectedParty] = useState<Character[]>([]);
  const [battleState, setBattleState] = useState<"menu" | "fighting" | "victory" | "defeat">("menu");
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [roundNumber, setRoundNumber] = useState(1);
  const [currentBackground, setCurrentBackground] = useState(0);
  
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [enemyActions, setEnemyActions] = useState<Record<string, ActionType>>({});
  const [heroStates, setHeroStates] = useState<CombatHero[]>([]);
  const [currentTurn, setCurrentTurn] = useState<"player" | "enemy">("player");
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [selectedCommand, setSelectedCommand] = useState<CommandCategory>(null);
  
  const [inventory, setInventory] = useState<InventoryItem[]>(DEFAULT_INVENTORY);
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [slowMoActive, setSlowMoActive] = useState(false);
  const [lootReward, setLootReward] = useState<{ xp: number; gold: number } | null>(null);
  
  const [activeMission, setActiveMission] = useState<MissionData | null>(null);
  const [missionProgress, setMissionProgress] = useState<MissionProgress | null>(null);
  const [killCount, setKillCount] = useState(0);
  const [objectivesCompleted, setObjectivesCompleted] = useState<Set<string>>(new Set());
  
  const enemyTurnRef = useRef<() => void>(() => {});
  
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const missionId = params.get("mission");
    
    if (missionId) {
      Promise.all([
        fetch(`/api/game/missions`).then(r => r.ok ? r.json() : []),
        Promise.resolve([]) // Player mission progress is embedded in missions list
      ]).then(([missionsList, _progressList]) => {
        const mission = Array.isArray(missionsList) ? missionsList.find((m: any) => String(m.id) === missionId) : null;
        if (mission) {
          setActiveMission(mission);
        }
      }).catch(console.error);
    }
  }, [searchString]);
  
  const reportMissionProgress = useCallback(async (objectiveId: string) => {
    if (!activeMission || objectivesCompleted.has(objectiveId)) return;
    
    try {
      // Mission completion is handled via PATCH /missions/:id/complete on VPS
      await fetch(`/api/game/missions/${activeMission.id}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      setObjectivesCompleted(prev => {
        const newSet = new Set(Array.from(prev));
        newSet.add(objectiveId);
        return newSet;
      });
    } catch (err) {
      console.error("Failed to report mission progress:", err);
    }
  }, [activeMission, objectivesCompleted]);

  useEffect(() => {
    const loadCharacters = async () => {
      const allChars = await CharacterManager.getAll();
      const available = allChars.filter(c => !c.revivalTime || Date.now() > c.revivalTime);
      setAllCharacters(available);
    };
    loadCharacters();
  }, []);

  const toggleCharacterSelection = (char: Character) => {
    if (selectedParty.find(c => c.id === char.id)) {
      setSelectedParty(prev => prev.filter(c => c.id !== char.id));
    } else if (selectedParty.length < MAX_PARTY_SIZE) {
      setSelectedParty(prev => [...prev, char]);
    }
  };

  const isCharacterSelected = (char: Character) => selectedParty.some(c => c.id === char.id);

  const addLog = (msg: string) => {
    setCombatLog(prev => [msg, ...prev].slice(0, 12));
  };

  const startBattle = (enemyTemplate: typeof ENEMY_TEMPLATES[0]) => {
    if (selectedParty.length === 0) {
      alert("Select at least one hero for combat!");
      return;
    }

    const newEnemy: Enemy = { 
      ...enemyTemplate, 
      id: `enemy-${Date.now()}`,
      hp: enemyTemplate.hp,
      maxHp: enemyTemplate.maxHp,
    };
    setEnemies([newEnemy]);
    setEnemyActions({ [newEnemy.id]: "Idle" });
    setCurrentBackground(enemyTemplate.background);
    
    const initialHeroStates: CombatHero[] = selectedParty.map(c => {
      const characterData = {
        id: c.id,
        name: c.name,
        level: c.level,
        classId: c.classId,
        raceId: c.raceId,
        attributes: c.attributes as Record<string, number>
      };
      const stats = deriveCharacterStats(characterData);
      return {
        ...c,
        hp: stats.maxHealth,
        maxHp: stats.maxHealth,
        mana: stats.maxMana,
        maxMana: stats.maxMana,
        stamina: stats.maxStamina,
        maxStamina: stats.maxStamina,
        currentAction: "Idle" as ActionType,
        buffs: [],
        isTransformed: false,
        rangerCritStacks: 0,
        isInvincible: false,
      };
    });
    setHeroStates(initialHeroStates);
    setInventory([...DEFAULT_INVENTORY]);
    
    setBattleState("fighting");
    setCurrentTurn("player");
    setActiveHeroIndex(0);
    setSelectedCommand(null);
    setRoundNumber(1);
    setCombatLog([`Battle Started!`, `Engaged ${enemyTemplate.name} (Lvl ${enemyTemplate.level})`]);
  };

  const findNextAliveHero = useCallback((startIdx: number, states: CombatHero[]): number => {
    for (let i = 0; i < states.length; i++) {
      const idx = (startIdx + i) % states.length;
      if (states[idx].hp > 0) return idx;
    }
    return -1;
  }, []);

  const applyRangerPassive = useCallback((heroStates: CombatHero[]) => {
    return heroStates.map(h => {
      if (h.classId === "ranger" && h.hp > 0) {
        return { ...h, rangerCritStacks: h.rangerCritStacks + 1 };
      }
      return h;
    });
  }, []);

  const tickBuffs = useCallback((hero: CombatHero): CombatHero => {
    const updatedBuffs = hero.buffs
      .map(b => ({ ...b, duration: b.duration - 1 }))
      .filter(b => b.duration > 0);
    
    const isStillInvincible = updatedBuffs.some(b => b.id === "invincibility");
    
    return {
      ...hero,
      buffs: updatedBuffs,
      isInvincible: isStillInvincible,
    };
  }, []);

  const getHeroStats = useCallback((hero: CombatHero) => {
    const characterData = {
      id: hero.id,
      name: hero.name,
      level: hero.level,
      classId: hero.classId,
      raceId: hero.raceId,
      attributes: hero.attributes as Record<string, number>
    };
    return deriveCharacterStats(characterData);
  }, []);

  const calculateDamage = useCallback((base: number, attacker: CombatHero, isCrit: boolean) => {
    const stats = getHeroStats(attacker);
    let damage = base + stats.damage;
    
    const manaShieldStacks = attacker.buffs.find(b => b.id === "mana_shield")?.stacks || 0;
    if (manaShieldStacks > 0) {
      damage *= 1 + (manaShieldStacks * 0.15);
    }
    
    if (attacker.isTransformed) {
      damage *= 1.3;
    }
    
    const variance = 0.9 + Math.random() * 0.2;
    const critMultiplier = isCrit ? stats.criticalFactor : 1;
    damage = Math.floor(damage * variance * critMultiplier);
    
    return damage;
  }, [getHeroStats]);

  const calculateCritChance = useCallback((hero: CombatHero): number => {
    const stats = getHeroStats(hero);
    let critChance = stats.criticalChance;
    
    if (hero.classId === "ranger") {
      critChance += hero.rangerCritStacks * 0.1;
    }
    
    const manaShieldStacks = hero.buffs.find(b => b.id === "mana_shield")?.stacks || 0;
    critChance += manaShieldStacks * 0.1;
    
    return Math.min(critChance, 1);
  }, [getHeroStats]);

  const executeTransformedAttackRef = useRef<(heroIdx: number, states: CombatHero[]) => void>(() => {});
  
  const advanceToNextTurn = useCallback((currentStates: CombatHero[]) => {
    const aliveHeroes = currentStates.filter(h => h.hp > 0);
    if (aliveHeroes.length === 0) return;
    
    const nextHeroIdx = findNextAliveHero(activeHeroIndex + 1, currentStates);
    
    if (nextHeroIdx <= activeHeroIndex || nextHeroIdx === findNextAliveHero(0, currentStates)) {
      setCurrentTurn("enemy");
      setSelectedCommand(null);
      setTimeout(() => enemyTurnRef.current(), 800);
    } else {
      setActiveHeroIndex(nextHeroIdx);
      setSelectedCommand(null);
      
      const nextHero = currentStates[nextHeroIdx];
      if (nextHero?.isTransformed && nextHero.classId === "shapeshifter") {
        setTimeout(() => executeTransformedAttackRef.current(nextHeroIdx, currentStates), 500);
      }
    }
  }, [activeHeroIndex, findNextAliveHero]);

  const executeAttack = useCallback((ability: CombatAbility, targetEnemy: Enemy) => {
    const attacker = heroStates[activeHeroIndex];
    if (!attacker || attacker.hp <= 0) return;
    
    if (attacker.mana < ability.manaCost || attacker.stamina < ability.staminaCost) {
      addLog(`${attacker.name} doesn't have enough resources!`);
      return;
    }
    
    if (ability.effectType === "heal" || ability.damage < 0) {
      const healAmount = Math.abs(ability.damage) + Math.floor(attacker.level * 2);
      
      setHeroStates(prev => {
        const updated = prev.map((h, i) => {
          if (i === activeHeroIndex) {
            return { 
              ...h, 
              currentAction: "Cast" as ActionType,
              mana: h.mana - ability.manaCost,
              stamina: h.stamina - ability.staminaCost,
            };
          }
          return h;
        });
        return updated;
      });
      
      const effectId = `effect-${Date.now()}`;
      setActiveEffects(prev => [...prev, { id: effectId, type: "shield", position: { x: 30, y: 50 } }]);
      
      setTimeout(() => {
        setActiveEffects(prev => prev.filter(e => e.id !== effectId));
      }, 800);
      
      setTimeout(() => {
        const aliveHeroes = heroStates.filter(h => h.hp > 0);
        const lowestHpHero = aliveHeroes.reduce((lowest, h) => 
          (h.hp / h.maxHp) < (lowest.hp / lowest.maxHp) ? h : lowest
        );
        const targetIdx = heroStates.findIndex(h => h.id === lowestHpHero.id);
        
        setHeroStates(prev => {
          const updated = prev.map((h, i) => {
            if (i === targetIdx) {
              const newHp = Math.min(h.maxHp, h.hp + healAmount);
              return { ...h, hp: newHp };
            }
            if (i === activeHeroIndex) {
              return { ...h, currentAction: "Idle" as ActionType };
            }
            return h;
          });
          
          const firstAliveIdx = findNextAliveHero(activeHeroIndex + 1, updated);
          if (firstAliveIdx <= activeHeroIndex || firstAliveIdx === findNextAliveHero(0, updated)) {
            setCurrentTurn("enemy");
            setTimeout(() => enemyTurnRef.current(), 800);
          } else {
            setActiveHeroIndex(firstAliveIdx);
          }
          
          return updated;
        });
        
        setDamagePopups(prev => [...prev, { 
          id: `heal-${Date.now()}`, 
          damage: healAmount, 
          isCrit: false,
          isHeal: true, 
          position: { x: window.innerWidth * 0.25, y: window.innerHeight * 0.4 } 
        }]);
        
        setTimeout(() => setDamagePopups([]), 1200);
        
        addLog(`${attacker.name} heals ${lowestHpHero.name} for ${healAmount} HP!`);
      }, 600);
      
      setSelectedCommand(null);
      return;
    }
    
    const critChance = calculateCritChance(attacker);
    const isCrit = Math.random() < critChance;
    const damage = calculateDamage(Math.max(0, ability.damage), attacker, isCrit);
    
    setHeroStates(prev => prev.map((h, i) => 
      i === activeHeroIndex ? { 
        ...h, 
        currentAction: ability.type === "spell" ? "Cast" : "Attack",
        mana: h.mana - ability.manaCost,
        stamina: h.stamina - ability.staminaCost,
        rangerCritStacks: isCrit && h.classId === "ranger" ? 0 : h.rangerCritStacks,
      } : h
    ));
    
    const effectId = `effect-${Date.now()}`;
    const effectType = ability.effectType || "slash";
    setActiveEffects(prev => [...prev, { id: effectId, type: effectType as any, position: { x: 65, y: 35 } }]);
    
    if (isCrit) {
      setActiveEffects(prev => [...prev, { id: `crit-${Date.now()}`, type: "crit", position: { x: 50, y: 50 } }]);
      if (attacker.classId === "ranger") {
        addLog(`${attacker.name}'s crit streak resets!`);
      }
    }
    
    setTimeout(() => {
      setActiveEffects(prev => prev.filter(e => e.id !== effectId));
    }, 800);
    
    setTimeout(() => {
      setEnemyActions(prev => ({ ...prev, [targetEnemy.id]: "Hurt" }));
      const newEnemyHp = Math.max(0, targetEnemy.hp - damage);
      setEnemies(prev => prev.map(e => e.id === targetEnemy.id ? { ...e, hp: newEnemyHp } : e));
      
      setDamagePopups(prev => [...prev, { 
        id: `dmg-${Date.now()}`, 
        damage, 
        isCrit, 
        position: { x: window.innerWidth * 0.65, y: window.innerHeight * 0.35 } 
      }]);
      
      setTimeout(() => setDamagePopups([]), 1200);
      
      addLog(`${attacker.name} uses ${ability.name} for ${damage}${isCrit ? " CRITICAL!" : ""} damage!`);

      setTimeout(() => {
        setEnemyActions(prev => ({ ...prev, [targetEnemy.id]: "Idle" }));
        setHeroStates(prev => {
          let updated = prev.map((h, i) => 
            i === activeHeroIndex ? { ...h, currentAction: "Idle" as ActionType } : h
          );
          
          if (newEnemyHp <= 0) {
            setSlowMoActive(true);
            const totalLevel = enemies.reduce((sum, e) => sum + e.level, 0);
            setLootReward({ xp: totalLevel * 50, gold: totalLevel * 25 });
            
            const nextKillCount = killCount + 1;
            setKillCount(nextKillCount);
            
            if (activeMission) {
              const killObjectives = activeMission.objectives.filter(obj => 
                ["kill", "combat", "slay", "defeat"].includes(obj.type?.toLowerCase() || "")
              );
              
              killObjectives.forEach(obj => {
                const targetCount = obj.data?.targetCount || 5;
                if (nextKillCount >= targetCount && !objectivesCompleted.has(obj.id)) {
                  reportMissionProgress(obj.id);
                  addLog(`Mission objective completed: ${obj.description}`);
                }
              });
            }
            
            setTimeout(() => {
              setSlowMoActive(false);
              setBattleState("victory");
            }, 2000);
            
            return updated.map(h => ({ ...h, currentAction: "Victory" as ActionType }));
          }
          
          advanceToNextTurn(updated);
          return updated;
        });

        if (newEnemyHp <= 0) {
          addLog(`Victory! ${targetEnemy.name} defeated!`);
        }
      }, 500);
    }, 400);
    
    setSelectedCommand(null);
  }, [heroStates, activeHeroIndex, enemies, calculateCritChance, calculateDamage, findNextAliveHero, advanceToNextTurn]);

  const executeSpecial = useCallback(() => {
    const hero = heroStates[activeHeroIndex];
    if (!hero || hero.hp <= 0) return;
    
    const faction = getFactionFromRace(hero.raceId);
    const special = getClassSpecial(hero.classId, faction);
    
    if (hero.mana < special.manaCost || hero.stamina < special.staminaCost) {
      addLog(`${hero.name} doesn't have enough resources for ${special.name}!`);
      return;
    }
    
    setHeroStates(prev => {
      let updated = prev.map((h, i) => {
        if (i !== activeHeroIndex) return h;
        
        let newHero = {
          ...h,
          currentAction: "Cast" as ActionType,
          mana: h.mana - special.manaCost,
          stamina: h.stamina - special.staminaCost,
        };
        
        switch (hero.classId) {
          case "warrior":
            newHero.isInvincible = true;
            newHero.buffs = [...newHero.buffs, {
              id: "invincibility",
              name: "Invincible",
              icon: "🛡️",
              duration: 2,
              stacks: 1,
              maxStacks: 1,
              effect: { damageReduction: 100 },
            }];
            addLog(`${hero.name} becomes INVINCIBLE for 1 turn!`);
            break;
            
          case "mage":
            const existingShield = newHero.buffs.find(b => b.id === "mana_shield");
            if (existingShield && existingShield.stacks < 3) {
              newHero.buffs = newHero.buffs.map(b => 
                b.id === "mana_shield" 
                  ? { ...b, stacks: b.stacks + 1, duration: 999 }
                  : b
              );
              addLog(`${hero.name}'s Mana Shield grows stronger! (${existingShield.stacks + 1}/3 stacks)`);
            } else if (!existingShield) {
              newHero.buffs = [...newHero.buffs, {
                id: "mana_shield",
                name: "Mana Shield",
                icon: "✨",
                duration: 999,
                stacks: 1,
                maxStacks: 3,
                effect: { critChance: 10, critDamage: 15 },
              }];
              addLog(`${hero.name} activates Mana Shield! (+10% crit chance/damage)`);
            } else {
              addLog(`${hero.name}'s Mana Shield is at maximum power!`);
            }
            break;
            
          case "shapeshifter":
            const worgSprite = FACTION_WORG_SPRITES[faction] || "ShadowWorg";
            newHero.isTransformed = true;
            newHero.transformedSprite = worgSprite;
            newHero.buffs = [...newHero.buffs, {
              id: "primal_form",
              name: "Primal Form",
              icon: "🐺",
              duration: 999,
              stacks: 1,
              maxStacks: 1,
              effect: { attackBonus: 30, speedBonus: 20 },
            }];
            addLog(`${hero.name} transforms into ${worgSprite}! (+30% attack, loses control)`);
            break;
            
          case "ranger":
            addLog(`${hero.name}'s Hunter Focus is passive - crit stacks: ${hero.rangerCritStacks * 10}%`);
            break;
        }
        
        return newHero;
      });
      
      return updated;
    });
    
    const effectId = `effect-${Date.now()}`;
    setActiveEffects(prev => [...prev, { id: effectId, type: "shield", position: { x: 30, y: 50 } }]);
    setTimeout(() => setActiveEffects(prev => prev.filter(e => e.id !== effectId)), 1000);
    
    setTimeout(() => {
      setHeroStates(prev => {
        const updated = prev.map((h, i) => 
          i === activeHeroIndex ? { ...h, currentAction: "Idle" as ActionType } : h
        );
        advanceToNextTurn(updated);
        return updated;
      });
    }, 800);
    
    setSelectedCommand(null);
  }, [heroStates, activeHeroIndex]);

  const useItem = useCallback((item: InventoryItem) => {
    const hero = heroStates[activeHeroIndex];
    if (!hero || hero.hp <= 0 || item.quantity <= 0) return;
    
    setInventory(prev => prev.map(i => 
      i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i
    ));
    
    setHeroStates(prev => {
      const updated = prev.map((h, i) => {
        if (i !== activeHeroIndex) return h;
        
        switch (item.effect) {
          case "heal_hp":
            const newHp = Math.min(h.maxHp, h.hp + item.value);
            addLog(`${h.name} uses ${item.name} and recovers ${item.value} HP!`);
            return { ...h, hp: newHp };
          case "heal_mp":
            const newMp = Math.min(h.maxMana, h.mana + item.value);
            addLog(`${h.name} uses ${item.name} and recovers ${item.value} MP!`);
            return { ...h, mana: newMp };
          case "heal_stamina":
            const newStam = Math.min(h.maxStamina, h.stamina + item.value);
            addLog(`${h.name} uses ${item.name} and recovers ${item.value} Stamina!`);
            return { ...h, stamina: newStam };
          default:
            return h;
        }
      });
      
      advanceToNextTurn(updated);
      return updated;
    });
    
    setSelectedCommand(null);
  }, [heroStates, activeHeroIndex, advanceToNextTurn]);

  const executeTransformedAttack = useCallback((heroIdx: number, states: CombatHero[]) => {
    const hero = states[heroIdx];
    if (!hero || !hero.isTransformed || enemies.length === 0) return;
    
    const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
    const damage = Math.floor((20 + hero.level * 3) * 1.3);
    
    setHeroStates(prev => prev.map((h, i) => 
      i === heroIdx ? { ...h, currentAction: "Attack" as ActionType } : h
    ));
    
    addLog(`${hero.name} (Transformed) attacks ${randomEnemy.name} wildly!`);
    
    setTimeout(() => {
      setEnemyActions(prev => ({ ...prev, [randomEnemy.id]: "Hurt" }));
      const newEnemyHp = Math.max(0, randomEnemy.hp - damage);
      setEnemies(prev => prev.map(e => e.id === randomEnemy.id ? { ...e, hp: newEnemyHp } : e));
      
      setDamagePopups(prev => [...prev, { 
        id: `dmg-${Date.now()}`, 
        damage, 
        isCrit: false, 
        position: { x: window.innerWidth * 0.65, y: window.innerHeight * 0.35 } 
      }]);
      
      setTimeout(() => {
        setEnemyActions(prev => ({ ...prev, [randomEnemy.id]: "Idle" }));
        setHeroStates(prev => {
          const updated = prev.map((h, i) => 
            i === heroIdx ? { ...h, currentAction: "Idle" as ActionType } : h
          );
          
          if (newEnemyHp <= 0) {
            setSlowMoActive(true);
            setLootReward({ xp: randomEnemy.level * 50, gold: randomEnemy.level * 25 });
            setTimeout(() => {
              setSlowMoActive(false);
              setBattleState("victory");
            }, 2000);
            return updated.map(h => ({ ...h, currentAction: "Victory" as ActionType }));
          }
          
          advanceToNextTurn(updated);
          return updated;
        });
      }, 400);
    }, 400);
  }, [enemies, advanceToNextTurn]);

  executeTransformedAttackRef.current = executeTransformedAttack;

  const enemyTurn = useCallback(() => {
    if (enemies.length === 0 || heroStates.length === 0) return;

    const aliveHeroes = heroStates.filter(h => h.hp > 0);
    if (aliveHeroes.length === 0) return;
    
    const enemy = enemies[0];
    const randomTarget = aliveHeroes[Math.floor(Math.random() * aliveHeroes.length)];
    const targetIdx = heroStates.findIndex(h => h.id === randomTarget.id);
    const target = heroStates[targetIdx];
    
    if (!target || targetIdx === -1) return;

    setEnemyActions(prev => ({ ...prev, [enemy.id]: "Attack" }));
    let damage = Math.max(1, enemy.damage + Math.floor(Math.random() * 5));
    
    if (target.isInvincible) {
      damage = 0;
      addLog(`${enemy.name} attacks ${target.name} but INVINCIBILITY blocks all damage!`);
    } else {
      addLog(`${enemy.name} attacks ${target.name} for ${damage} damage!`);
    }

    setTimeout(() => {
      const newTargetHp = Math.max(0, target.hp - damage);
      
      setHeroStates(prev => prev.map((h, i) => 
        i === targetIdx ? { ...h, hp: newTargetHp, currentAction: damage > 0 ? "Hurt" : "Idle" } : h
      ));

      setTimeout(() => {
        setEnemyActions(prev => ({ ...prev, [enemy.id]: "Idle" }));
        
        setHeroStates(prev => {
          let updated = prev.map((h, i) => 
            i === targetIdx ? { ...h, currentAction: newTargetHp <= 0 ? "Death" as ActionType : "Idle" as ActionType } : h
          );
          
          updated = updated.map(h => tickBuffs(h));
          updated = applyRangerPassive(updated);
          
          const alive = updated.filter(h => h.hp > 0);
          if (alive.length === 0) {
            setBattleState("defeat");
            addLog("Party Defeated...");
            handleDefeat();
            return updated;
          }
          
          if (newTargetHp <= 0) {
            addLog(`${target.name} has fallen!`);
          }
          
          setRoundNumber(r => r + 1);
          setCurrentTurn("player");
          const firstAlive = findNextAliveHero(0, updated);
          setActiveHeroIndex(firstAlive >= 0 ? firstAlive : 0);
          setSelectedCommand(null);
          
          const nextHero = updated[firstAlive];
          if (nextHero?.isTransformed && nextHero.classId === "shapeshifter") {
            setTimeout(() => executeTransformedAttack(firstAlive, updated), 500);
          }
          
          return updated;
        });
      }, 500);
    }, 500);
  }, [enemies, heroStates, findNextAliveHero, tickBuffs, applyRangerPassive, executeTransformedAttack]);

  enemyTurnRef.current = enemyTurn;

  const handleDefeat = async () => {
    const fourHours = 4 * 60 * 60 * 1000;
    const now = Date.now();
    for (const char of selectedParty) {
      const updated = { ...char, revivalTime: now + fourHours };
      await CharacterManager.updateCharacter(updated);
    }
  };

  const exitBattle = () => {
    setBattleState("menu");
    setCombatLog([]);
    setRoundNumber(1);
    setSelectedCommand(null);
    setEnemies([]);
  };

  const bg = BATTLE_BACKGROUNDS[currentBackground];
  const activeHero = heroStates[activeHeroIndex];
  const faction = activeHero ? getFactionFromRace(activeHero.raceId) : "Crusade";

  const renderCommandMenu = () => {
    if (!activeHero || activeHero.hp <= 0 || currentTurn !== "player") return null;
    if (activeHero.isTransformed && activeHero.classId === "shapeshifter") {
      return (
        <div className="text-center text-amber-400 py-4">
          <Moon className="w-6 h-6 mx-auto mb-2 animate-pulse" />
          <div className="text-sm">Transformed - Acting on instinct...</div>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 flex-wrap justify-center">
          {(["attack", "skill", "spell", "item", "special"] as CommandCategory[]).map(cmd => (
            <Button
              key={cmd}
              size="sm"
              variant={selectedCommand === cmd ? "default" : "outline"}
              onClick={() => setSelectedCommand(selectedCommand === cmd ? null : cmd)}
              className={cn(
                "capitalize",
                selectedCommand === cmd && "ring-2 ring-amber-400"
              )}
              data-testid={`btn-command-${cmd}`}
            >
              {cmd === "attack" && <Sword className="w-4 h-4 mr-1" />}
              {cmd === "skill" && <Zap className="w-4 h-4 mr-1" />}
              {cmd === "spell" && <Flame className="w-4 h-4 mr-1" />}
              {cmd === "item" && <FlaskConical className="w-4 h-4 mr-1" />}
              {cmd === "special" && <Star className="w-4 h-4 mr-1" />}
              {cmd}
            </Button>
          ))}
        </div>
        
        {selectedCommand && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/90 border border-slate-700 rounded-lg p-3 mt-2"
          >
            {selectedCommand === "attack" && (
              <div className="space-y-2">
                <div className="text-xs text-slate-400 uppercase mb-2">Basic Attack</div>
                {(() => {
                  const attack = getBasicAttack(activeHero.classId);
                  return (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => enemies[0] && executeAttack(attack, enemies[0])}
                      className="w-full justify-start gap-2 hover:bg-slate-800"
                      data-testid="btn-basic-attack"
                    >
                      {attack.icon}
                      <span>{attack.name}</span>
                      <span className="ml-auto text-xs text-slate-500">
                        {attack.staminaCost > 0 && `${attack.staminaCost} ST`}
                      </span>
                    </Button>
                  );
                })()}
              </div>
            )}
            
            {selectedCommand === "skill" && (
              <div className="space-y-2">
                <div className="text-xs text-slate-400 uppercase mb-2">Class Skills</div>
                {getClassSkills(activeHero.classId).map(skill => (
                  <Button
                    key={skill.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => enemies[0] && executeAttack(skill, enemies[0])}
                    className="w-full justify-start gap-2 hover:bg-slate-800"
                    disabled={activeHero.mana < skill.manaCost || activeHero.stamina < skill.staminaCost}
                    data-testid={`btn-skill-${skill.id}`}
                  >
                    {skill.icon}
                    <span className="truncate">{skill.name}</span>
                    <span className="ml-auto text-xs text-slate-500">
                      {skill.manaCost > 0 && `${skill.manaCost} MP`}
                      {skill.staminaCost > 0 && ` ${skill.staminaCost} ST`}
                    </span>
                  </Button>
                ))}
              </div>
            )}
            
            {selectedCommand === "spell" && (
              <div className="space-y-2">
                <div className="text-xs text-slate-400 uppercase mb-2">Spells</div>
                {getClassSpells(activeHero.classId).length > 0 ? (
                  getClassSpells(activeHero.classId).map(spell => (
                    <Button
                      key={spell.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => enemies[0] && executeAttack(spell, enemies[0])}
                      className="w-full justify-start gap-2 hover:bg-slate-800"
                      disabled={activeHero.mana < spell.manaCost}
                      data-testid={`btn-spell-${spell.id}`}
                    >
                      {spell.icon}
                      <span className="truncate">{spell.name}</span>
                      <span className="ml-auto text-xs text-blue-400">
                        {spell.manaCost} MP
                      </span>
                    </Button>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">No spells available for this class</div>
                )}
              </div>
            )}
            
            {selectedCommand === "item" && (
              <div className="space-y-2">
                <div className="text-xs text-slate-400 uppercase mb-2">Items</div>
                {inventory.filter(i => i.quantity > 0).length > 0 ? (
                  inventory.filter(i => i.quantity > 0).map(item => (
                    <Button
                      key={item.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => useItem(item)}
                      className="w-full justify-start gap-2 hover:bg-slate-800"
                      data-testid={`btn-item-${item.id}`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                      <span className="ml-auto text-xs text-slate-400">x{item.quantity}</span>
                    </Button>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">No items remaining</div>
                )}
              </div>
            )}
            
            {selectedCommand === "special" && (
              <div className="space-y-2">
                <div className="text-xs text-slate-400 uppercase mb-2">Class Special (Level 0)</div>
                {(() => {
                  const special = getClassSpecial(activeHero.classId, faction);
                  const isRanger = activeHero.classId === "ranger";
                  
                  return (
                    <div className="space-y-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={executeSpecial}
                        className={cn(
                          "w-full justify-start gap-2 hover:bg-slate-800",
                          isRanger && "cursor-default hover:bg-transparent"
                        )}
                        disabled={
                          (!isRanger && (activeHero.mana < special.manaCost || activeHero.stamina < special.staminaCost)) ||
                          (activeHero.classId === "mage" && (activeHero.buffs.find(b => b.id === "mana_shield")?.stacks || 0) >= 3)
                        }
                        data-testid="btn-special"
                      >
                        {special.icon}
                        <div className="flex flex-col items-start">
                          <span>{special.name}</span>
                          <span className="text-xs text-slate-500">{special.description}</span>
                        </div>
                        {!isRanger && (
                          <span className="ml-auto text-xs text-amber-400">
                            {special.manaCost > 0 && `${special.manaCost} MP`}
                            {special.staminaCost > 0 && ` ${special.staminaCost} ST`}
                          </span>
                        )}
                      </Button>
                      
                      {activeHero.classId === "ranger" && (
                        <div className="text-xs text-green-400 bg-green-900/30 px-3 py-2 rounded">
                          Current crit bonus: +{activeHero.rangerCritStacks * 10}% (resets on crit)
                        </div>
                      )}
                      
                      {activeHero.classId === "mage" && (
                        <div className="text-xs text-purple-400 bg-purple-900/30 px-3 py-2 rounded">
                          Mana Shield stacks: {activeHero.buffs.find(b => b.id === "mana_shield")?.stacks || 0}/3
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none z-0"
        style={{ backgroundImage: `url(${assetUrl("/backgrounds/battle_arena_default.png")})` }}
      />
      <div className="relative z-10 flex flex-col h-[calc(100vh-60px)] max-w-7xl mx-auto">
        
        {battleState === "fighting" && enemies.length > 0 && (
          <div className="flex-1 relative overflow-hidden flex flex-col">
            <div 
              className="absolute inset-0 z-0"
              style={{ 
                backgroundImage: `url(${bg.image})`,
                backgroundSize: '200% 300%',
                backgroundPosition: bg.position,
              }}
            />
            <div className="absolute inset-0 z-0 bg-black/30" />

            <div className="relative z-10 px-4 py-2 flex justify-between items-center bg-black/60 border-b border-slate-700">
              <div className="text-white font-bold">{enemies[0].name} - Round {roundNumber}</div>
              <div className="text-slate-400 text-sm">{bg.name}</div>
            </div>

            <AnimatePresence>
              {activeEffects.map(effect => (
                effect.type === "slash" ? <SlashEffect key={effect.id} /> :
                effect.type === "fire" ? <FireEffect key={effect.id} /> :
                effect.type === "ice" ? <IceEffect key={effect.id} /> :
                effect.type === "electric" ? <ElectricEffect key={effect.id} /> :
                effect.type === "crit" ? <CritEffect key={effect.id} /> :
                effect.type === "shield" ? (
                  <motion.div 
                    key={effect.id}
                    className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.5 }}
                  >
                    <div className="w-32 h-32 rounded-full bg-gradient-to-r from-amber-500/30 to-yellow-300/30 animate-pulse border-2 border-amber-400" />
                  </motion.div>
                ) : effect.type === "transform" ? (
                  <motion.div 
                    key={effect.id}
                    className="absolute inset-0 z-30 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1 }}
                  >
                    <div className={cn("absolute inset-0 bg-gradient-to-r", FACTION_WORG_COLORS[faction])} />
                  </motion.div>
                ) : null
              ))}
            </AnimatePresence>

            {damagePopups.map(popup => (
              <DamageNumber 
                key={popup.id} 
                damage={popup.damage} 
                isCrit={popup.isCrit} 
                position={popup.position} 
              />
            ))}

            <motion.div 
              className="flex-1 relative z-10 flex items-center justify-between px-8"
              animate={slowMoActive ? { 
                filter: "grayscale(0.6) contrast(1.2)",
                scale: 1.05
              } : {}}
              transition={{ duration: 0.5 }}
            >
              <div className="flex flex-col gap-4">
                {heroStates.filter(h => h.hp > 0).map((hero, idx) => {
                  const race = RACES.find(r => r.id === hero.raceId);
                  const cls = CLASSES.find(c => c.id === hero.classId);
                  let sprite = cls?.spriteSetOverride || race?.spriteSet || "Soldier";
                  
                  if (hero.isTransformed && hero.transformedSprite) {
                    sprite = hero.transformedSprite;
                  }
                  
                  const realIdx = heroStates.findIndex(h => h.id === hero.id);
                  const isActing = currentTurn === "player" && activeHeroIndex === realIdx;
                  
                  return (
                    <motion.div 
                      key={hero.id} 
                      className={cn("relative transition-all", isActing && "z-20")}
                      animate={{ scale: isActing ? 1.05 : 1 }}
                    >
                      {hero.isInvincible && (
                        <motion.div 
                          className="absolute inset-0 rounded-full border-4 border-amber-400 z-10"
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      )}
                      
                      {hero.buffs.length > 0 && (
                        <div className="absolute -top-2 left-0 flex gap-1 z-20">
                          {hero.buffs.map(buff => (
                            <div 
                              key={buff.id}
                              className="w-5 h-5 bg-slate-900 rounded border border-slate-600 flex items-center justify-center text-xs"
                              title={`${buff.name} ${buff.stacks > 1 ? `x${buff.stacks}` : ""}`}
                            >
                              {buff.icon}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {hero.classId === "ranger" && hero.rangerCritStacks > 0 && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-green-400 whitespace-nowrap">
                          +{hero.rangerCritStacks * 10}% Crit
                        </div>
                      )}
                      
                      <div className={cn(
                        "w-48 h-48",
                        hero.isTransformed && "animate-pulse"
                      )}>
                        <SpriteAnimator 
                          spriteSet={sprite} 
                          action={hero.currentAction === "Victory" ? "Idle" : hero.currentAction} 
                          scale={3}
                        />
                      </div>
                      
                      <div className="absolute -bottom-8 left-0 right-0 text-center">
                        <div className="text-xs text-white font-bold">{hero.name}</div>
                        <div className="flex gap-1 justify-center mt-1">
                          <div className="w-16 h-1.5 bg-slate-800 rounded overflow-hidden">
                            <div 
                              className="h-full bg-red-500 transition-all"
                              style={{ width: `${(hero.hp / hero.maxHp) * 100}%` }}
                            />
                          </div>
                          <div className="w-12 h-1.5 bg-slate-800 rounded overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all"
                              style={{ width: `${(hero.mana / hero.maxMana) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="relative">
                <motion.div 
                  className="w-64 h-64"
                  animate={slowMoActive ? { filter: "brightness(0.5)" } : {}}
                  transition={{ duration: 1.5 }}
                >
                  <SpriteAnimator 
                    spriteSet={enemies[0].spriteSet} 
                    action={slowMoActive ? "Death" : ((enemyActions[enemies[0].id] || "Idle") as "Idle" | "Attack" | "Hurt" | "Cast" | "Death")} 
                    flip={true}
                    scale={3}
                  />
                </motion.div>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-56 bg-black/90 p-3 rounded-lg border border-red-900">
                  <div className="text-sm font-bold text-red-400 mb-2 text-center">{enemies[0].name}</div>
                  <Progress value={(enemies[0].hp / enemies[0].maxHp) * 100} className="h-3 bg-slate-800 [&>div]:bg-red-600" />
                  <div className="text-xs text-slate-400 mt-1 text-center">{enemies[0].hp}/{enemies[0].maxHp} HP</div>
                </div>
              </div>
            </motion.div>

            {slowMoActive && (
              <motion.div 
                className="absolute inset-0 z-30 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
                <motion.div 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  <div className="text-4xl font-black text-amber-400" style={{ textShadow: "0 0 20px #ff9500" }}>
                    FINISHING BLOW
                  </div>
                </motion.div>
              </motion.div>
            )}

            <div className="relative z-20 bg-slate-900/95 border-t border-slate-700 p-4">
              <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 uppercase mb-2">
                    {currentTurn === "player" ? `${activeHero?.name}'s Turn` : "Enemy Turn"}
                  </div>
                  {renderCommandMenu()}
                </div>
                
                <div className="bg-slate-800/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <div className="text-xs text-slate-500 uppercase mb-2">Combat Log</div>
                  <div className="space-y-1">
                    {combatLog.map((log, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "text-xs",
                          idx === 0 ? "text-white" : "text-slate-400"
                        )}
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {(battleState === "victory" || battleState === "defeat") && (
          <div className="flex-1 flex flex-col items-center justify-center bg-black/90 text-center gap-6 relative overflow-hidden">
            {battleState === "victory" && <VictoryEffect />}
            
            <motion.h1 
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              className={cn("text-6xl font-black", battleState === "victory" ? "text-amber-500" : "text-red-600")}
              style={{ textShadow: battleState === "victory" ? "0 0 30px #ff9500" : "0 0 30px #ff0000" }}
            >
              {battleState === "victory" ? "VICTORY" : "DEFEAT"}
            </motion.h1>
            
            <p className="text-xl text-slate-400">
              {battleState === "victory" ? "The enemy has been vanquished!" : "Your party has fallen..."}
            </p>
            
            {battleState === "victory" && lootReward && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-slate-900/80 border border-amber-600/50 rounded-xl p-6 min-w-[300px]"
              >
                <div className="text-lg font-bold text-amber-400 mb-4 flex items-center justify-center gap-2">
                  <Trophy className="w-5 h-5" /> Loot & Rewards
                </div>
                <div className="space-y-3">
                  <motion.div 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex justify-between items-center bg-blue-900/30 px-4 py-2 rounded"
                  >
                    <span className="text-slate-300">Experience</span>
                    <span className="text-blue-400 font-bold">+{lootReward.xp} XP</span>
                  </motion.div>
                  <motion.div 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="flex justify-between items-center bg-amber-900/30 px-4 py-2 rounded"
                  >
                    <span className="text-slate-300">Gold</span>
                    <span className="text-amber-400 font-bold">+{lootReward.gold} G</span>
                  </motion.div>
                </div>
              </motion.div>
            )}
            
            <Button size="lg" onClick={exitBattle} className="mt-4" data-testid="btn-exit-battle">
              Return to Camp
            </Button>
          </div>
        )}

        {battleState === "menu" && (
          <div className="flex-1 flex flex-col gap-6 p-6">
            {activeMission && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border border-purple-500/30 rounded-xl p-4"
                data-testid="mission-banner"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-600/30 flex items-center justify-center">
                      <Scroll className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-sm text-purple-300">Active Mission</div>
                      <div className="font-bold text-white" data-testid="text-mission-title">{activeMission.title}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Kills</div>
                      <div className="text-lg font-bold text-amber-400" data-testid="text-kill-count">{killCount}</div>
                    </div>
                    <Badge variant="secondary" className="bg-purple-600/30 text-purple-300" data-testid="badge-mission-type">
                      {activeMission.missionType}
                    </Badge>
                  </div>
                </div>
                {activeMission.objectives && activeMission.objectives.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-purple-500/20">
                    <div className="text-xs text-purple-300 mb-2">Objectives</div>
                    <div className="flex flex-wrap gap-2" data-testid="objectives-list">
                      {activeMission.objectives.map((obj, idx) => {
                        const isCompleted = objectivesCompleted.has(obj.id);
                        return (
                          <div 
                            key={obj.id || idx}
                            data-testid={`objective-${obj.id || idx}`}
                            className={`text-xs px-2 py-1 rounded ${
                              isCompleted 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                : 'bg-slate-800/50 text-slate-300 border border-slate-600/30'
                            }`}
                          >
                            {isCompleted && <span className="mr-1">✓</span>}
                            {obj.description}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-700">
              <h2 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
                <Skull className="w-5 h-5" /> Select Enemy
              </h2>
              <div className="space-y-3">
                {ENEMY_TEMPLATES.map(enemy => (
                  <div 
                    key={enemy.name}
                    onClick={() => startBattle(enemy)}
                    className="bg-black/40 p-3 rounded border border-slate-800 hover:border-red-500 cursor-pointer transition-all hover:bg-red-900/10 flex justify-between items-center group"
                    data-testid={`enemy-${enemy.name.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <div>
                      <div className="font-bold text-white group-hover:text-red-400">{enemy.name}</div>
                      <div className="text-xs text-slate-500">Level {enemy.level} • {BATTLE_BACKGROUNDS[enemy.background].name}</div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-slate-400 group-hover:text-white">
                      Fight
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-700">
              <h2 className="text-xl font-bold text-amber-500 mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5" /> Select Party
              </h2>
              <p className="text-xs text-slate-400 mb-3">
                Choose up to {MAX_PARTY_SIZE} heroes ({selectedParty.length}/{MAX_PARTY_SIZE})
              </p>
              
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {allCharacters.length > 0 ? allCharacters.map(hero => {
                  const isSelected = isCharacterSelected(hero);
                  const race = RACES.find(r => r.id === hero.raceId);
                  const cls = CLASSES.find(c => c.id === hero.classId);
                  
                  return (
                    <div 
                      key={hero.id} 
                      onClick={() => toggleCharacterSelection(hero)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded border cursor-pointer transition-all",
                        isSelected 
                          ? "bg-emerald-900/30 border-emerald-500" 
                          : "bg-black/40 border-slate-800 hover:border-slate-600"
                      )}
                      data-testid={`party-select-${hero.id}`}
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                        isSelected ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-400"
                      )}>
                        {isSelected ? "✓" : hero.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white text-sm truncate">{hero.name}</div>
                        <div className="text-xs text-slate-400">
                          Lvl {hero.level} {race?.name} {cls?.name}
                        </div>
                      </div>
                      <div className={cn(
                        "text-xs font-bold px-2 py-1 rounded",
                        isSelected ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-500"
                      )}>
                        {isSelected ? "Ready" : "Select"}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No heroes available. Create characters first.
                  </div>
                )}
              </div>

              {selectedParty.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <div className="text-xs text-slate-500 uppercase mb-2">Combat Party</div>
                  <div className="flex gap-2">
                    {selectedParty.map((hero, idx) => (
                      <div key={hero.id} className="flex items-center gap-1 bg-emerald-900/20 border border-emerald-600 px-2 py-1 rounded text-xs">
                        <span className="text-emerald-400 font-bold">{idx + 1}.</span>
                        <span className="text-white">{hero.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
