
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { RACES, CLASSES, ATTRIBUTES, FACTION_COLORS, AttributeKey, RaceDef, ClassDef } from "@/lib/gameData";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronLeft, ChevronDown, Sword, Check, Sparkles, Trash2, User, Shield, Play, Pause, Zap, Settings, ImagePlus, Loader2, Backpack, BookOpen, Hammer, Sliders, TrendingUp, Package, Gem, Clock, Target, Award, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { characterAPI } from "@/lib/api";
import { puterAI } from "@/lib/puterIntegration";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import Layout from "@/components/Layout";
import { CharacterManager, Character, EquipmentSlots } from "@/lib/characterManager";
import { ITEMS, resolveItemImage, RESOURCE_NODES } from "@/lib/grudaDB";
import SpriteAnimator, { SpriteAction } from "@/components/SpriteAnimator";
import { getAttackAnimations, getAvailableAnimations, AnimationState } from "@/lib/spriteManifest";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CombatUnitStatus } from "@/components/CombatUnitStatus";
import { InventorySlot } from "@/components/SpriteIcon";
import { calculateDerivedStats, calculateCombatPower, getBuildRating } from "@shared/statCalculator";
import AdminContextMenu from "@/components/AdminContextMenu";
import { AttributeAllocation } from "@/components/AttributeAllocation";
import { 
  getGatheringBonuses, 
  GATHERING_LEVEL_MILESTONES, 
  GATHERING_PROFESSIONS_CONFIG,
  calculateLevelFromXp 
} from "@/lib/professionSystem";
import {
  CLASS_SKILL_TREES, 
  getClassSkillTree, 
  getUnlockedTiers, 
  getLockedTiers,
  SKILL_TIER_LEVELS,
  ClassSkillChoice,
  ClassSkillTier
} from "@shared/definitions/classSkillTrees";
import { assetUrl } from "@/lib/assetConfig";
import { playBGM } from "@/lib/audioManager";
const bgTexture = assetUrl("/backgrounds/character_create.png");

const ATTRIBUTE_ICONS: Record<string, string> = {
  Strength: "💪",
  Vitality: "❤️",
  Endurance: "🛡️",
  Intellect: "🔮",
  Wisdom: "📖",
  Dexterity: "🎯",
  Agility: "⚡",
  Tactics: "🧠"
};

const ATTRIBUTE_TOOLTIPS: Record<string, { icon: string; description: string; effects: string[] }> = {
  Strength: {
    icon: "💪",
    description: "Raw physical power for melee combat",
    effects: ["+26 HP, +3 DMG, +12 DEF per point", "+0.8% HP, +2% DMG, +1.5% DEF scaling", "Boosts Block Chance & Crit Chance"]
  },
  Vitality: {
    icon: "❤️",
    description: "Constitution and survivability",
    effects: ["+25 HP, +2 DMG, +12 DEF per point", "+0.5% HP, +17% Block Factor scaling", "Increases Resistance"]
  },
  Endurance: {
    icon: "🛡️",
    description: "Defensive mastery and blocking",
    effects: ["+10 HP, +12 DEF per point", "+12% DEF, +73.5% Block Chance scaling", "High Resistance bonuses"]
  },
  Intellect: {
    icon: "🔮",
    description: "Magical power and spell accuracy",
    effects: ["+5 Mana, +4 DMG, +2 DEF per point", "+5% Mana, +2.5% DMG, +33.8% Accuracy", "Boosts Magic Resistance"]
  },
  Wisdom: {
    icon: "📖",
    description: "Mana efficiency and spell support",
    effects: ["+10 HP, +20 Mana, +2 DMG per point", "+3% Mana, +1.5% DMG scaling", "Increases Crit Chance"]
  },
  Dexterity: {
    icon: "🎯",
    description: "Precision strikes and accuracy",
    effects: ["+3 DMG, +10 DEF per point", "+1.8% DMG, +1.2% Crit, +1.5% Accuracy", "High critical potential"]
  },
  Agility: {
    icon: "⚡",
    description: "Speed, mobility, and evasion",
    effects: ["+2 HP, +5 Stamina, +3 DMG per point", "+1.6% DMG, +1% Crit, +0.8% DEF", "Increases movement speed"]
  },
  Tactics: {
    icon: "🧠",
    description: "Strategic combat mastery",
    effects: ["+10 HP, +1 Stamina, +3 DMG per point", "+8.4% HP, +8.2% Mana scaling", "Boosts Block & Crit Chance"]
  }
};

const STAT_TOOLTIPS: Record<string, { description: string; formula: string }> = {
  maxHealth: { description: "Total hit points before death", formula: "Base HP + (STR×26 + VIT×25 + END×10 + WIS×10 + AGI×2 + TAC×10) + % bonuses" },
  maxMana: { description: "Resource for casting spells", formula: "Base Mana + (INT×5 + VIT×2 + WIS×20) + % bonuses" },
  maxStamina: { description: "Resource for physical abilities", formula: "Base Stamina + (VIT×5 + END×1 + AGI×5 + TAC×1) + % bonuses" },
  physDmg: { description: "Physical attack damage", formula: "20 + (STR×3 + VIT×2 + DEX×3 + AGI×3 + TAC×3) + % bonuses" },
  magDmg: { description: "Magical attack damage", formula: "20 + (INT×4 + WIS×2) + % bonuses" },
  physDef: { description: "Reduces physical damage taken", formula: "10 + (STR×12 + VIT×12 + END×12 + DEX×10 + AGI×5 + TAC×5) + % bonuses" },
};

const TIER_COLORS: Record<number, string> = {
  1: "text-gray-400 border-gray-600",
  2: "text-green-400 border-green-600",
  3: "text-blue-400 border-blue-600",
  4: "text-purple-400 border-purple-600",
  5: "text-orange-400 border-orange-600",
  6: "text-red-400 border-red-600",
  7: "text-pink-400 border-pink-600",
  8: "text-amber-400 border-amber-600",
};

const TIER_NAMES = ["", "Novice", "Apprentice", "Journeyman", "Expert", "Artisan", "Master", "Grandmaster", "Legendary"];

export default function CharacterBuilder() {
  const [, setLocation] = useLocation();
  // If we have characters, default to "roster" view unless creating new
  const [viewMode, setViewMode] = useState<"create" | "roster">("roster");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  
  // Animation State
  const [currentAction, setCurrentAction] = useState<SpriteAction>("Idle");
  
  // Character Sheet Tab
  const [activeTab, setActiveTab] = useState<"overview" | "allocate" | "equipment" | "profession" | "skills">("overview");
  
  // Admin Mode
  const [adminMode, setAdminMode] = useState(false);
  const [regeneratingAvatar, setRegeneratingAvatar] = useState<string | null>(null);
  
  // Character Creation Loading State
  const [isCreatingCharacter, setIsCreatingCharacter] = useState(false);
  const [creationStatus, setCreationStatus] = useState<string>("");
  
  // Expanded Profession State
  const [expandedProfession, setExpandedProfession] = useState<string | null>(null);

  // Creation State
  const [step, setStep] = useState<"race" | "class" | "attributes" | "summary">("race");
  const [charName, setCharName] = useState("");
  const [selectedRace, setSelectedRace] = useState<RaceDef | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassDef | null>(null);
  const [manualAttributes, setManualAttributes] = useState<Record<AttributeKey, number>>({
    Strength: 0, Intellect: 0, Vitality: 0, Dexterity: 0, 
    Endurance: 0, Wisdom: 0, Agility: 0, Tactics: 0
  });

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // === ADMIN PORTRAIT POSITIONING ===
  const [portraitPositions, setPortraitPositions] = useState<Record<string, { x: number; y: number; scale: number }>>(() => {
    try {
      const saved = localStorage.getItem('grudge-portrait-positions');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [draggingRace, setDraggingRace] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);

  const getPortraitPos = useCallback((raceId: string) => {
    return portraitPositions[raceId] || { x: 50, y: 20, scale: 1 };
  }, [portraitPositions]);

  const updatePortraitPos = useCallback((raceId: string, updates: Partial<{ x: number; y: number; scale: number }>) => {
    setPortraitPositions(prev => {
      const current = prev[raceId] || { x: 50, y: 20, scale: 1 };
      const updated = { ...prev, [raceId]: { ...current, ...updates } };
      localStorage.setItem('grudge-portrait-positions', JSON.stringify(updated));
      return updated;
    });
  }, []);

  useEffect(() => {
    if (!draggingRace) return;
    const handleMouseMove = (e: MouseEvent) => {
      const start = dragStartRef.current;
      if (!start || !draggingRace) return;
      const sensitivity = 0.2;
      const newX = Math.max(0, Math.min(100, start.posX - (e.clientX - start.x) * sensitivity));
      const newY = Math.max(0, Math.min(100, start.posY - (e.clientY - start.y) * sensitivity));
      updatePortraitPos(draggingRace, { x: newX, y: newY });
    };
    const handleMouseUp = () => { setDraggingRace(null); dragStartRef.current = null; };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
  }, [draggingRace, updatePortraitPos]);

  // Load characters on mount + start BGM
  useEffect(() => {
    playBGM("camp");
    const loadCharacters = async () => {
      const chars = await CharacterManager.getAll();
      setCharacters(chars);
      
      const active = await CharacterManager.getActiveCharacter();
      if (active) {
        setActiveCharacter(active);
      } else if (chars.length > 0) {
        setActiveCharacter(chars[0]);
        CharacterManager.setActive(chars[0].id);
      } else {
        setViewMode("create");
      }
    };
    
    loadCharacters();
  }, []);

  const handleDeleteCharacter = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this character?")) {
      await CharacterManager.deleteCharacter(id);
      const chars = await CharacterManager.getAll();
      setCharacters(chars);
      if (activeCharacter?.id === id) {
        setActiveCharacter(chars.length > 0 ? chars[0] : null);
        if (chars.length === 0) setViewMode("create");
      }
    }
  };

  const handleSelectCharacter = (char: Character) => {
    setActiveCharacter(char);
    CharacterManager.setActive(char.id);
    setCurrentAction("Idle"); // Reset animation
  };

  const handleRegenerateAvatar = async (charId: string) => {
    setRegeneratingAvatar(charId);
    try {
      const updatedChar = await characterAPI.regenerateAvatar(charId);
      setCharacters(prev => prev.map(c => c.id === charId ? updatedChar : c));
      if (activeCharacter?.id === charId) {
        setActiveCharacter(updatedChar);
      }
    } catch (e) {
      console.error("Failed to regenerate avatar:", e);
    }
    setRegeneratingAvatar(null);
  };

  const handleFinishCreation = async () => {
    if (!selectedRace || !selectedClass) return;

    setIsCreatingCharacter(true);
    setCreationStatus("Creating character...");

    const heroName = charName || "Unnamed Hero";
    const newChar = {
      name: heroName,
      raceId: selectedRace.id,
      classId: selectedClass.id,
      level: 0,
      xp: 0,
      attributes: manualAttributes,
      inventory: [],
      equipment: {
        MainHand: "GRUDA_WPN_SWORD_T1",
        Chest: "GRUDA_ARM_CHEST_T1",
        Legs: "GRUDA_ARM_LEGS_T1"
      },
      professionLevels: {},
    };

    try {
      setCreationStatus("Saving to database...");
      const createdChar = await CharacterManager.addCharacter(newChar);

      // Generate AI card avatar with character name baked in
      setCreationStatus("Generating card avatar...");
      const faction = selectedRace.faction || 'Crusade';
      const avatarUrl = await puterAI.generateHeroAvatar(
        heroName,
        selectedRace.name,
        selectedClass.name,
        faction
      );

      // Save avatar URL to character if generation succeeded
      let charWithAvatar = createdChar;
      if (avatarUrl) {
        charWithAvatar = await characterAPI.update(createdChar.id, {
          avatarUrl,
        } as any);
      }

      // Mint cNFT to user's server-side wallet (admin wallet fallback)
      setCreationStatus("Minting character cNFT...");
      const mintResult = await characterAPI.mintCNFT(
        createdChar.id,
        avatarUrl || '',
      );
      if (mintResult.success) {
        console.log('cNFT minted:', mintResult.mintAddress || mintResult.assetId);
      } else {
        console.warn('cNFT mint skipped or failed:', mintResult.error);
      }

      setCreationStatus("Finalizing hero...");
      const chars = await CharacterManager.getAll();
      setCharacters(chars);
      setActiveCharacter(charWithAvatar);

      // Reset form
      setStep("race");
      setCharName("");
      setSelectedRace(null);
      setSelectedClass(null);
      setManualAttributes({
        Strength: 0, Intellect: 0, Vitality: 0, Dexterity: 0, 
        Endurance: 0, Wisdom: 0, Agility: 0, Tactics: 0
      });

      setViewMode("roster");
    } catch (error) {
      console.error("Failed to create character:", error);
      setCreationStatus("Creation failed. Please try again.");
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setIsCreatingCharacter(false);
      setCreationStatus("");
    }
  };

  // Calculate Totals for Creation
  const totalStats = useMemo(() => {
    const totals: Record<string, number> = {};
    const keys = Object.keys(ATTRIBUTES) as AttributeKey[];
    
    keys.forEach(key => {
      totals[key] = (selectedRace?.baseStats[key] || 0) + 
                    (selectedClass?.baseStats[key] || 0) + 
                    (manualAttributes[key] || 0);
    });
    return totals;
  }, [selectedRace, selectedClass, manualAttributes]);

  const pointsSpent = Object.values(manualAttributes).reduce((a, b) => a + b, 0);
  const pointsAvailable = 7; 
  const remainingPoints = pointsAvailable - pointsSpent;

  // Equipment slot positions (percentage-based for scaling)
  // Based on race equipment images: left column = Head, Back, Shoulder, Chest, Hands, Ring
  // Right column = MainHand, OffHand, Legs, Feet, Relic
  const EQUIP_SLOT_POSITIONS: Record<string, { left: string; top: string; width: string; height: string }> = {
    // Left column (top to bottom) - slots start ~18% from top, ~5% from left
    Head:       { left: '4.5%',  top: '18%',   width: '12%', height: '10.5%' },
    Back:       { left: '4.5%',  top: '30%',   width: '12%', height: '10.5%' },
    Shoulder:   { left: '4.5%',  top: '42%',   width: '12%', height: '10.5%' },
    Chest:      { left: '4.5%',  top: '54%',   width: '12%', height: '10.5%' },
    Hands:      { left: '4.5%',  top: '66%',   width: '12%', height: '10.5%' },
    Accessory1: { left: '4.5%',  top: '78%',   width: '12%', height: '10.5%' },
    // Right column (top to bottom) - ~83.5% from left
    MainHand:   { left: '83.5%', top: '18%',   width: '12%', height: '10.5%' },
    OffHand:    { left: '83.5%', top: '30%',   width: '12%', height: '10.5%' },
    Legs:       { left: '83.5%', top: '42%',   width: '12%', height: '10.5%' },
    Feet:       { left: '83.5%', top: '54%',   width: '12%', height: '10.5%' },
    Accessory2: { left: '83.5%', top: '66%',   width: '12%', height: '10.5%' },
  };

  // Equipment Slot Helper - renders item icon at pre-defined position
  const renderEquipSlotOverlay = (slotName: keyof EquipmentSlots) => {
    const itemId = activeCharacter?.equipment?.[slotName];
    const item = itemId ? ITEMS.find(i => i.id === itemId) : null;
    const pos = EQUIP_SLOT_POSITIONS[slotName];
    if (!pos) return null;
    
    return (
      <div 
        key={slotName}
        className="absolute group cursor-pointer"
        style={{ left: pos.left, top: pos.top, width: pos.width, height: pos.height }}
      >
        {item && (
          <img 
            src={item.image} 
            alt={item.name} 
            className="w-full h-full object-contain p-0.5 drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]" 
          />
        )}
        {/* Tooltip on hover */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-5 text-[10px] text-amber-300 whitespace-nowrap bg-black/90 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none border border-amber-900/50">
          {item ? item.name : slotName}
        </div>
      </div>
    );
  };
  
  const getSpriteSet = (raceId?: string, classId?: string) => {
    const race = RACES.find(r => r.id === raceId);
    const cls = CLASSES.find(c => c.id === classId);
    
    if (cls?.spriteSetOverride) return cls.spriteSetOverride;
    if (race?.spriteSet) return race.spriteSet;
    return "Soldier"; // Fallback
  };

  const handleNext = () => {
    if (step === "race" && selectedRace) setStep("class");
    else if (step === "class" && selectedClass) setStep("attributes");
    else if (step === "attributes") setStep("summary");
  };

  const handleBack = () => {
    if (step === "class") setStep("race");
    else if (step === "attributes") setStep("class");
    else if (step === "summary") setStep("attributes");
  };

  const steps = [
    { id: "race", label: "Choose Race" },
    { id: "class", label: "Choose Class" },
    { id: "attributes", label: "Attributes" },
    { id: "summary", label: "Summary" }
  ];

  // RENDER ROSTER VIEW
  if (viewMode === "roster") {
    const raceDef = activeCharacter ? RACES.find(r => r.id === activeCharacter.raceId) : null;
    const classDef = activeCharacter ? CLASSES.find(c => c.id === activeCharacter.classId) : null;
    const activeSpriteSet = getSpriteSet(activeCharacter?.raceId, activeCharacter?.classId);

    return (
      <Layout>
        <div className="flex flex-col relative overflow-hidden bg-background text-foreground rounded-xl border border-slate-800 shadow-2xl min-h-[calc(100vh-100px)]">
           <div 
            className="absolute inset-0 pointer-events-none z-0 opacity-20 mix-blend-overlay"
            style={{ backgroundImage: `url(${bgTexture})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          ></div>

          <div className="relative z-10 flex flex-col md:flex-row h-full min-h-[800px]">
            
            {/* Sidebar: Character List */}
            <div className="w-full md:w-80 bg-black/40 border-r border-white/10 p-6 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-cinzel font-bold text-amber-400">Roster</h2>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant={adminMode ? "default" : "outline"}
                    onClick={() => setAdminMode(!adminMode)} 
                    className={cn(adminMode ? "bg-purple-600 hover:bg-purple-500" : "border-slate-600")}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={() => setViewMode("create")} className="bg-primary text-black hover:bg-amber-400">
                    New Hero
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                {characters.map(char => {
                  const r = RACES.find(r => r.id === char.raceId);
                  const c = CLASSES.find(cl => cl.id === char.classId);
                  const factionColors = FACTION_COLORS[r?.faction || 'Crusade'];
                  
                  return (
                    <div 
                      key={char.id}
                      onClick={() => handleSelectCharacter(char)}
                      className={cn(
                        "rounded-lg border cursor-pointer transition-all hover:bg-white/5 relative group overflow-hidden",
                        activeCharacter?.id === char.id 
                          ? "bg-white/10 border-primary shadow-[0_0_10px_rgba(234,179,8,0.3)]" 
                          : "bg-slate-900/50 border-slate-800"
                      )}
                    >
                      {/* Large Avatar Image */}
                      <div className="relative w-full h-48 bg-gradient-to-b from-slate-800 to-slate-900 overflow-hidden">
                        {/* Card Background */}
                        {r?.cardBg && (
                          <img src={r.cardBg} alt="" className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none" />
                        )}
                        {(() => {
                          const imgSrc = char.avatarUrl || r?.image;
                          const pos = r ? getPortraitPos(r.id) : { x: 50, y: 20, scale: 1 };
                          return imgSrc ? (
                            <img 
                              src={imgSrc} 
                              alt={char.name}
                              className="w-full h-full object-cover relative z-[1]"
                              style={{
                                objectPosition: `${pos.x}% ${pos.y}%`,
                                transform: `scale(${pos.scale})`,
                              }}
                              draggable={false}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center relative z-[1]">
                              <User className="w-12 h-12 text-slate-600" />
                            </div>
                          );
                        })()}
                        {/* Gradient overlay for text readability */}
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent z-[2]" />
                        
                        {/* Admin buttons */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {adminMode && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-slate-400 hover:text-cyan-400 bg-black/50"
                              onClick={(e) => { e.stopPropagation(); handleRegenerateAvatar(char.id); }}
                              disabled={regeneratingAvatar === char.id}
                            >
                              {regeneratingAvatar === char.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <ImagePlus className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-slate-400 hover:text-red-500 bg-black/50"
                            onClick={(e) => handleDeleteCharacter(char.id, e)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Hero Info */}
                      <div className="p-3">
                        <div className="font-bold text-lg text-slate-200">{char.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", factionColors.bg, factionColors.text)}>
                            Lv{char.level}
                          </span>
                          <span className="text-xs text-slate-400">{r?.name} {c?.name}</span>
                        </div>
                        
                        {/* Status bars inside selected card */}
                        {activeCharacter?.id === char.id && (() => {
                          const stats = calculateDerivedStats(char.attributes, char.classId);
                          return (
                            <div className="mt-3 pt-3 border-t border-white/10">
                              <CombatUnitStatus
                                name={char.name}
                                hp={stats.maxHealth}
                                maxHp={stats.maxHealth}
                                mp={stats.maxMana}
                                maxMp={stats.maxMana}
                                sp={stats.maxStamina}
                                maxSp={stats.maxStamina}
                                level={char.level}
                                avatarUrl={char.avatarUrl || undefined}
                                isActive
                                showAvatar={false}
                                compact
                              />
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
                
                {characters.length === 0 && (
                  <div className="text-center py-10 text-slate-500 text-sm">
                    No heroes found.<br/>Create one to begin!
                  </div>
                )}
              </div>
            </div>

            {/* Main Content: Character Sheet */}
            {activeCharacter ? (
              <div className="flex-1 p-8 overflow-y-auto relative">
                 <div 
                  className="absolute inset-0 pointer-events-none z-0 opacity-10"
                  style={{ backgroundImage: `url(/assets/ui/character-panel.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                ></div>
                <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center gap-6 mb-8 border-b border-white/10 pb-6">
                  <AdminContextMenu
                    isAdminMode={adminMode}
                    targetId={`avatar-${activeCharacter.id}`}
                    targetType="sprite"
                    onReplaceSprite={() => handleRegenerateAvatar(activeCharacter.id)}
                    onMove={() => console.log('Move avatar')}
                    onResize={() => console.log('Resize avatar')}
                    onEditCard={() => console.log('Edit avatar card')}
                  >
                    <div className={cn("w-24 h-24 rounded-full border-4 overflow-hidden shadow-xl shrink-0 bg-black/50", FACTION_COLORS[raceDef?.faction || 'Crusade'].border)}>
                      {activeCharacter.avatarUrl ? (
                        <img 
                          src={activeCharacter.avatarUrl} 
                          alt={activeCharacter.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="scale-150 transform translate-y-2">
                            <SpriteAnimator spriteSet={activeSpriteSet} action={currentAction} isUndead={activeCharacter?.raceId === 'undead'} />
                          </div>
                        </div>
                      )}
                    </div>
                  </AdminContextMenu>
                  <div className="flex-1">
                    <h1 className="text-4xl font-cinzel font-bold text-white mb-1">{activeCharacter.name}</h1>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={cn("px-3 py-0.5 rounded-full text-sm font-bold uppercase", FACTION_COLORS[raceDef?.faction || 'Crusade'].bg, FACTION_COLORS[raceDef?.faction || 'Crusade'].text)}>
                        {raceDef?.faction}
                      </span>
                      <span className="text-slate-400 text-sm font-bold tracking-wide">
                        Level {activeCharacter.level} {raceDef?.name} {classDef?.name}
                      </span>
                    </div>
                    
                    {/* Animation Controls */}
                    <div className="flex gap-2 flex-wrap items-center">
                       {(["Idle", "Walk"] as SpriteAction[]).map(act => (
                         <button 
                           key={act}
                           onClick={() => setCurrentAction(act)}
                           className={cn(
                             "text-[10px] px-2 py-1 rounded border transition-colors uppercase font-bold",
                             currentAction === act ? "bg-amber-500 text-black border-amber-500" : "bg-black/40 text-slate-400 border-slate-700 hover:border-amber-500/50"
                           )}
                           data-testid={`btn-action-${act.toLowerCase()}`}
                         >
                           {act}
                         </button>
                       ))}
                       
                       {/* Attack Dropdown */}
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <button 
                             className={cn(
                               "text-[10px] px-2 py-1 rounded border transition-colors uppercase font-bold flex items-center gap-1",
                               ["Attack", "Attack2", "Attack3", "Cast", "Heal"].includes(currentAction) 
                                 ? "bg-red-500 text-black border-red-500" 
                                 : "bg-black/40 text-slate-400 border-slate-700 hover:border-red-500/50"
                             )}
                             data-testid="btn-attack-dropdown"
                           >
                             {["Attack", "Attack2", "Attack3", "Cast", "Heal"].includes(currentAction) ? currentAction : "Attack"}
                             <ChevronDown className="w-3 h-3" />
                           </button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent className="bg-slate-900 border-slate-700">
                           {(() => {
                             const attackAnims = getAttackAnimations(activeSpriteSet);
                             const animLabels: Record<AnimationState, { label: string; icon: string }> = {
                               attack: { label: "Attack 1", icon: "⚔️" },
                               attack2: { label: "Attack 2", icon: "🗡️" },
                               attack3: { label: "Attack 3", icon: "💥" },
                               cast: { label: "Cast Spell", icon: "✨" },
                               heal: { label: "Heal", icon: "💚" },
                               idle: { label: "Idle", icon: "" },
                               walk: { label: "Walk", icon: "" },
                               walk2: { label: "Walk 2", icon: "" },
                               run: { label: "Run", icon: "" },
                               hurt: { label: "Hurt", icon: "" },
                               death: { label: "Death", icon: "" },
                               block: { label: "Block", icon: "" },
                             };
                             return attackAnims.map(anim => (
                               <DropdownMenuItem 
                                 key={anim}
                                 onClick={() => setCurrentAction(anim.charAt(0).toUpperCase() + anim.slice(1) as SpriteAction)}
                                 className="text-slate-300 hover:bg-slate-800 cursor-pointer"
                                 data-testid={`btn-attack-${anim}`}
                               >
                                 <span className="mr-2">{animLabels[anim]?.icon}</span>
                                 {animLabels[anim]?.label || anim}
                               </DropdownMenuItem>
                             ));
                           })()}
                         </DropdownMenuContent>
                       </DropdownMenu>
                       
                       {(["Hurt", "Block", "Death"] as SpriteAction[]).map(act => {
                         const allAnims = getAvailableAnimations(activeSpriteSet);
                         // Only show Block if sprite has it
                         if (act === "Block" && !allAnims.includes("block")) return null;
                         return (
                           <button 
                             key={act}
                             onClick={() => setCurrentAction(act)}
                             className={cn(
                               "text-[10px] px-2 py-1 rounded border transition-colors uppercase font-bold",
                               currentAction === act ? "bg-amber-500 text-black border-amber-500" : "bg-black/40 text-slate-400 border-slate-700 hover:border-amber-500/50"
                             )}
                             data-testid={`btn-action-${act.toLowerCase()}`}
                           >
                             {act}
                           </button>
                         );
                       })}
                       {adminMode && (
                         <Button
                           onClick={() => handleRegenerateAvatar(activeCharacter.id)}
                           disabled={regeneratingAvatar === activeCharacter.id}
                           className="ml-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
                           data-testid="btn-regen-avatar"
                         >
                           {regeneratingAvatar === activeCharacter.id ? (
                             <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                           ) : (
                             <ImagePlus className="w-3 h-3 mr-1" />
                           )}
                           New Portrait
                         </Button>
                       )}
                    </div>
                  </div>
                </div>

                {/* Character Sheet Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
                  <TabsList className="w-full justify-start bg-slate-900/50 border border-slate-800 p-1 rounded-lg mb-6">
                    <TabsTrigger 
                      value="overview" 
                      className="flex items-center gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-black"
                      data-testid="tab-overview"
                    >
                      <BookOpen className="w-4 h-4" /> Overview
                    </TabsTrigger>
                    <TabsTrigger 
                      value="allocate" 
                      className={cn(
                        "flex items-center gap-2 data-[state=active]:bg-cyan-500 data-[state=active]:text-black relative",
                        Math.max(0, 10 + (activeCharacter.level * 7) - Object.values(activeCharacter.attributes).reduce((a, b) => a + b, 0)) > 0 && "animate-pulse ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900"
                      )}
                      data-testid="tab-allocate"
                    >
                      <Sliders className="w-4 h-4" /> Allocate
                      {Math.max(0, 10 + (activeCharacter.level * 7) - Object.values(activeCharacter.attributes).reduce((a, b) => a + b, 0)) > 0 && (
                        <span className="ml-1 bg-cyan-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                          {Math.max(0, 10 + (activeCharacter.level * 7) - Object.values(activeCharacter.attributes).reduce((a, b) => a + b, 0))}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="equipment" 
                      className="flex items-center gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-black"
                      data-testid="tab-equipment"
                    >
                      <Shield className="w-4 h-4" /> Equipment
                    </TabsTrigger>
                    <TabsTrigger 
                      value="profession" 
                      className="flex items-center gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-black"
                      data-testid="tab-profession"
                    >
                      <Hammer className="w-4 h-4" /> Profession
                    </TabsTrigger>
                    <TabsTrigger 
                      value="skills" 
                      className="flex items-center gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-black"
                      data-testid="tab-skills"
                    >
                      <Zap className="w-4 h-4" /> Class Skills
                    </TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="mt-0">
                    {(() => {
                      const stats = calculateDerivedStats(activeCharacter.attributes, activeCharacter.classId);
                      const cp = calculateCombatPower(stats);
                      const rating = getBuildRating(cp);
                      const availablePoints = Math.max(0, 10 + (activeCharacter.level * 7) - Object.values(activeCharacter.attributes).reduce((a, b) => a + b, 0));
                      return (
                        <>
                        {/* Statistical Review Bar */}
                        <div className="bg-gradient-to-r from-slate-900/80 via-slate-800/60 to-slate-900/80 rounded-xl p-5 border border-slate-700 mb-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs text-slate-500 uppercase tracking-wider">Combat Power</div>
                              <div className="text-3xl font-bold text-amber-400 font-cinzel" data-testid="combat-power-value">{cp.toLocaleString()}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-500 uppercase tracking-wider">Build Rating</div>
                              <div className="text-3xl font-bold font-cinzel" style={{ color: rating.color }}>{rating.letter}</div>
                            </div>
                          </div>
                          {availablePoints > 0 && (
                            <div className="mt-3 flex items-center gap-2 text-cyan-400 text-sm font-bold animate-pulse cursor-pointer" onClick={() => setActiveTab('allocate')}>
                              <Sparkles className="w-4 h-4" />
                              {availablePoints} attribute points to allocate
                            </div>
                          )}
                        </div>

                        {/* 3-Column Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                          {/* Left: Equipment Paper Doll */}
                          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                            <h3 className="text-sm font-cinzel text-amber-400 mb-3">Equipment</h3>
                            <div className="relative mx-auto max-w-[280px]">
                              <img
                                src={assetUrl(`/sprites/ui/PNG/equipment/${activeCharacter.raceId}.png`)}
                                alt={`${raceDef?.name} Equipment`}
                                className="w-full h-auto"
                                draggable={false}
                              />
                              {renderEquipSlotOverlay("Head")}
                              {renderEquipSlotOverlay("Back")}
                              {renderEquipSlotOverlay("Shoulder")}
                              {renderEquipSlotOverlay("Chest")}
                              {renderEquipSlotOverlay("Hands")}
                              {renderEquipSlotOverlay("Accessory1")}
                              {renderEquipSlotOverlay("MainHand")}
                              {renderEquipSlotOverlay("OffHand")}
                              {renderEquipSlotOverlay("Legs")}
                              {renderEquipSlotOverlay("Feet")}
                              {renderEquipSlotOverlay("Accessory2")}
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="pointer-events-auto">
                                  <div className="scale-[2.5] transform drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                                    <SpriteAnimator spriteSet={activeSpriteSet} action={currentAction} isUndead={activeCharacter?.raceId === 'undead'} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Center: Radar Chart + Attributes */}
                          <div className="space-y-4">
                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                              <div className="w-full h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={Object.keys(ATTRIBUTES).map(k => ({
                                    subject: k.slice(0, 3).toUpperCase(),
                                    A: (activeCharacter?.attributes[k as AttributeKey] || 0) + (raceDef?.baseStats[k as AttributeKey] || 0) + (classDef?.baseStats[k as AttributeKey] || 0),
                                    fullMark: 30
                                  }))}>
                                    <PolarGrid stroke="rgba(255,255,255,0.15)" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 9 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 30]} tick={false} axisLine={false} />
                                    <Radar name="Stats" dataKey="A" stroke="#EAB308" strokeWidth={2} fill="#EAB308" fillOpacity={0.25} />
                                  </RadarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                              <h3 className="text-sm font-cinzel text-amber-400 mb-3">Attributes</h3>
                              <div className="grid grid-cols-2 gap-2">
                                <TooltipProvider delayDuration={200}>
                                  {Object.entries(activeCharacter.attributes).map(([attr, val]) => {
                                    const tooltip = ATTRIBUTE_TOOLTIPS[attr];
                                    return (
                                      <Tooltip key={attr}>
                                        <TooltipTrigger asChild>
                                          <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg cursor-help hover:bg-black/30 transition-colors">
                                            <span className="text-slate-400 text-xs flex items-center gap-1">
                                              <span className="text-sm">{tooltip?.icon}</span>
                                              {attr.slice(0, 3)}
                                            </span>
                                            <span className="text-white font-bold text-sm">
                                              {val + (raceDef?.baseStats[attr as AttributeKey] || 0) + (classDef?.baseStats[attr as AttributeKey] || 0)}
                                            </span>
                                          </div>
                                        </TooltipTrigger>
                                        {tooltip && (
                                          <TooltipContent side="top" className="max-w-xs bg-slate-900 border border-slate-700 p-3">
                                            <div className="space-y-2">
                                              <p className="font-bold text-amber-400 flex items-center gap-2">
                                                <span className="text-lg">{tooltip.icon}</span>
                                                {attr}
                                              </p>
                                              <p className="text-slate-300 text-xs">{tooltip.description}</p>
                                              <ul className="text-xs space-y-1">
                                                {tooltip.effects.map((effect, i) => (
                                                  <li key={i} className="text-emerald-400">• {effect}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          </TooltipContent>
                                        )}
                                      </Tooltip>
                                    );
                                  })}
                                </TooltipProvider>
                              </div>
                            </div>
                          </div>

                          {/* Right: Full Derived Stats */}
                          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                            <h3 className="text-sm font-cinzel text-amber-400 mb-3">Derived Stats</h3>
                            <div className="space-y-4">
                              {/* Resources */}
                              <div>
                                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Resources</div>
                                <div className="space-y-1.5">
                                  {[
                                    { label: 'Health', value: stats.maxHealth, color: 'text-red-400', bar: 'bg-red-500' },
                                    { label: 'Mana', value: stats.maxMana, color: 'text-blue-400', bar: 'bg-blue-500' },
                                    { label: 'Stamina', value: stats.maxStamina, color: 'text-green-400', bar: 'bg-green-500' },
                                  ].map(s => (
                                    <div key={s.label} className="flex items-center justify-between bg-black/20 px-3 py-1.5 rounded">
                                      <span className={cn('text-xs', s.color)}>{s.label}</span>
                                      <span className={cn('font-bold text-sm font-mono', s.color)}>{s.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {/* Offense */}
                              <div>
                                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Offense</div>
                                <div className="space-y-1.5">
                                  {[
                                    { label: 'Phys Damage', value: stats.physDmg, color: 'text-amber-400' },
                                    { label: 'Mag Damage', value: stats.magDmg, color: 'text-purple-400' },
                                    { label: 'Crit Chance', value: `${stats.crit.toFixed(1)}%`, color: 'text-yellow-400' },
                                    { label: 'Crit Damage', value: `${stats.critDmg.toFixed(0)}%`, color: 'text-orange-400' },
                                    { label: 'Atk Speed', value: `+${stats.attackSpeed.toFixed(1)}%`, color: 'text-cyan-400' },
                                    { label: 'Accuracy', value: `${stats.accuracy.toFixed(1)}%`, color: 'text-teal-400' },
                                  ].map(s => (
                                    <div key={s.label} className="flex items-center justify-between bg-black/20 px-3 py-1.5 rounded">
                                      <span className={cn('text-xs', s.color)}>{s.label}</span>
                                      <span className={cn('font-bold text-sm font-mono', s.color)}>{s.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {/* Defense */}
                              <div>
                                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Defense</div>
                                <div className="space-y-1.5">
                                  {[
                                    { label: 'Phys Defense', value: stats.physDef, color: 'text-slate-300' },
                                    { label: 'Mag Defense', value: stats.magDef.toFixed(1), color: 'text-indigo-400' },
                                    { label: 'Block', value: `${stats.blockChance.toFixed(1)}%`, color: 'text-stone-300' },
                                    { label: 'Evasion', value: `${stats.evasion.toFixed(1)}%`, color: 'text-sky-400' },
                                    { label: 'Move Speed', value: `${stats.moveSpeed.toFixed(0)}%`, color: 'text-emerald-400' },
                                  ].map(s => (
                                    <div key={s.label} className="flex items-center justify-between bg-black/20 px-3 py-1.5 rounded">
                                      <span className={cn('text-xs', s.color)}>{s.label}</span>
                                      <span className={cn('font-bold text-sm font-mono', s.color)}>{s.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        </>
                      );
                    })()}
                  </TabsContent>

                  {/* Allocate Tab */}
                  <TabsContent value="allocate" className="mt-0">
                    <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
                      <AttributeAllocation
                        currentAttributes={activeCharacter.attributes}
                        availablePoints={Math.max(0, 10 + (activeCharacter.level * 7) - Object.values(activeCharacter.attributes).reduce((a, b) => a + b, 0))}
                        onSave={async (newAttributes) => {
                          try {
                            const updated = await characterAPI.update(activeCharacter.id, { attributes: newAttributes });
                            setActiveCharacter(updated);
                            setCharacters(prev => prev.map(c => c.id === updated.id ? updated : c));
                          } catch (error) {
                            console.error("Failed to save attributes:", error);
                          }
                        }}
                        compact={false}
                      />
                    </div>
                  </TabsContent>

                  {/* Equipment Tab */}
                  <TabsContent value="equipment" className="mt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Left: Equipment Panel */}
                      <div>
                        <div className="relative mx-auto max-w-[420px] shadow-2xl">
                          <img 
                            src={assetUrl(`/sprites/ui/PNG/equipment/${activeCharacter.raceId}.png`)}
                            alt={`${raceDef?.name} Equipment`}
                            className="w-full h-auto"
                            draggable={false}
                          />
                          {renderEquipSlotOverlay("Head")}
                          {renderEquipSlotOverlay("Back")}
                          {renderEquipSlotOverlay("Shoulder")}
                          {renderEquipSlotOverlay("Chest")}
                          {renderEquipSlotOverlay("Hands")}
                          {renderEquipSlotOverlay("Accessory1")}
                          {renderEquipSlotOverlay("MainHand")}
                          {renderEquipSlotOverlay("OffHand")}
                          {renderEquipSlotOverlay("Legs")}
                          {renderEquipSlotOverlay("Feet")}
                          {renderEquipSlotOverlay("Accessory2")}
                          
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <AdminContextMenu
                              isAdminMode={adminMode}
                              targetId={`sprite-${activeCharacter.id}`}
                              targetType="sprite"
                              onReplaceSprite={() => console.log('Replace character sprite')}
                              onMove={() => console.log('Move sprite')}
                              onResize={() => console.log('Resize sprite')}
                            >
                              <div className="pointer-events-auto">
                                <div className="scale-[3] transform drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                                  <SpriteAnimator spriteSet={activeSpriteSet} action={currentAction} isUndead={activeCharacter?.raceId === 'undead'} />
                                </div>
                              </div>
                            </AdminContextMenu>
                          </div>
                        </div>
                      </div>

                      {/* Right: Inventory */}
                      <div className="relative bg-slate-900/50 rounded-xl p-6 border border-slate-800 flex flex-col overflow-hidden">
                        <div 
                          className="absolute inset-0 pointer-events-none z-0 opacity-10"
                          style={{ backgroundImage: `url(/assets/ui/inventory.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                        ></div>
                        <div className="relative z-10 flex flex-col">
                          <h3 className="text-lg font-cinzel text-amber-400 mb-1">Hero Inventory</h3>
                          <p className="text-slate-500 text-xs mb-4">Items carried by {activeCharacter.name}</p>
                          <div className="grid grid-cols-6 gap-2">
                            {Array.from({ length: 24 }).map((_, i) => {
                              const inventoryItem = activeCharacter.inventory?.[i];
                              const item = inventoryItem ? ITEMS.find(it => it.id === inventoryItem.itemId) : null;
                              return (
                                <InventorySlot
                                  key={i}
                                  itemName={item?.name}
                                  itemType={item?.type}
                                  quantity={inventoryItem?.quantity}
                                  imageUrl={item?.image}
                                  tier={inventoryItem?.tier}
                                  data-testid={`inventory-slot-${i}`}
                                />
                              );
                            })}
                          </div>
                          {(!activeCharacter.inventory || activeCharacter.inventory.length === 0) && (
                            <div className="text-center py-4 text-slate-500 text-sm">
                              No items in inventory
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Profession Tab */}
                  <TabsContent value="profession" className="mt-0">
                    <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-cinzel text-amber-400">Gathering Professions</h3>
                          <p className="text-slate-400 text-sm">Click a profession to view details</p>
                        </div>
                        {expandedProfession && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setExpandedProfession(null)}
                            className="text-slate-400 hover:text-white"
                          >
                            <X className="w-4 h-4 mr-1" /> Close Details
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        {[
                          { name: 'Mining', icon: '⛏️', color: 'amber' },
                          { name: 'Logging', icon: '🪓', color: 'green' },
                          { name: 'Skinning', icon: '🔪', color: 'red' },
                          { name: 'Fishing', icon: '🎣', color: 'blue' },
                          { name: 'Herbalism', icon: '🌿', color: 'emerald' },
                          { name: 'Scavenging', icon: '🔍', color: 'purple' },
                        ].map(prof => {
                          const profData = activeCharacter.professionLevels?.[prof.name];
                          const level = profData?.level || 1;
                          const totalXp = profData?.xp || 0;
                          const isExpanded = expandedProfession === prof.name;
                          const config = GATHERING_PROFESSIONS_CONFIG[prof.name as keyof typeof GATHERING_PROFESSIONS_CONFIG];
                          const bonuses = getGatheringBonuses(level);
                          const { xpInLevel, xpForNextLevel } = calculateLevelFromXp(totalXp);
                          const nextMilestone = GATHERING_LEVEL_MILESTONES.find(m => m.level > level);
                          
                          return (
                            <div key={prof.name} className="overflow-hidden rounded-lg border border-slate-700">
                              <button
                                onClick={() => setExpandedProfession(isExpanded ? null : prof.name)}
                                className={cn(
                                  "w-full bg-black/30 p-4 flex items-center justify-between transition-colors",
                                  isExpanded ? "border-b border-slate-700 bg-slate-800/50" : "hover:bg-slate-800/30"
                                )}
                                data-testid={`toggle-profession-${prof.name.toLowerCase()}`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{prof.icon}</span>
                                  <div className="text-left">
                                    <div className="font-bold text-white">{prof.name}</div>
                                    <div className={cn("text-xs", `text-${prof.color}-400`)}>Level {level}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="w-24">
                                    <Progress value={level} className="h-2" />
                                  </div>
                                  <ChevronDown className={cn(
                                    "w-5 h-5 text-slate-400 transition-transform",
                                    isExpanded && "rotate-180"
                                  )} />
                                </div>
                              </button>
                              
                              {isExpanded && config && (
                                <div className="bg-slate-950/50 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                    <div className="bg-black/30 rounded-lg p-3 border border-slate-800">
                                      <div className="flex items-center gap-1 text-slate-500 mb-1">
                                        <TrendingUp className="w-3 h-3" />
                                        Quality
                                      </div>
                                      <div className="text-lg font-bold text-green-400">+{bonuses.qualityBonus}%</div>
                                    </div>
                                    <div className="bg-black/30 rounded-lg p-3 border border-slate-800">
                                      <div className="flex items-center gap-1 text-slate-500 mb-1">
                                        <Package className="w-3 h-3" />
                                        Quantity
                                      </div>
                                      <div className="text-lg font-bold text-blue-400">+{bonuses.quantityBonus}</div>
                                    </div>
                                    <div className="bg-black/30 rounded-lg p-3 border border-slate-800">
                                      <div className="flex items-center gap-1 text-slate-500 mb-1">
                                        <Gem className="w-3 h-3" />
                                        Gear Drop
                                      </div>
                                      <div className="text-lg font-bold text-purple-400">{(bonuses.gearDropChance * 100).toFixed(1)}%</div>
                                    </div>
                                    <div className="bg-black/30 rounded-lg p-3 border border-slate-800">
                                      <div className="flex items-center gap-1 text-slate-500 mb-1">
                                        <Clock className="w-3 h-3" />
                                        Speed
                                      </div>
                                      <div className="text-lg font-bold text-amber-400">-{(bonuses.harvestSpeedReduction * 100).toFixed(0)}%</div>
                                    </div>
                                    <div className="bg-black/30 rounded-lg p-3 border border-slate-800">
                                      <div className="flex items-center gap-1 text-slate-500 mb-1">
                                        <Sparkles className="w-3 h-3" />
                                        Rare Find
                                      </div>
                                      <div className="text-lg font-bold text-pink-400">{(bonuses.rareResourceChance * 100).toFixed(1)}%</div>
                                    </div>
                                    <div className="bg-black/30 rounded-lg p-3 border border-slate-800">
                                      <div className="flex items-center gap-1 text-slate-500 mb-1">
                                        <Zap className="w-3 h-3" />
                                        Crit Gather
                                      </div>
                                      <div className="text-lg font-bold text-yellow-400">{(bonuses.criticalGatherChance * 100).toFixed(1)}%</div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <Target className="w-4 h-4 text-amber-400" />
                                    <span className="text-sm font-bold text-slate-300">Tier Unlocked</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {[1,2,3,4,5,6,7,8].map(t => (
                                      <Badge 
                                        key={t}
                                        variant="outline" 
                                        className={cn(
                                          "text-[10px]", 
                                          TIER_COLORS[t],
                                          t <= bonuses.tierUnlocked ? "opacity-100" : "opacity-30"
                                        )}
                                      >
                                        T{t} {TIER_NAMES[t]}
                                      </Badge>
                                    ))}
                                  </div>
                                  
                                  <div className="pt-2 border-t border-slate-700">
                                    <div className="flex justify-between text-sm mb-2">
                                      <span className="text-slate-400">XP Progress</span>
                                      <span className="text-green-400 font-bold">{xpInLevel.toLocaleString()} / {xpForNextLevel.toLocaleString()}</span>
                                    </div>
                                    <Progress value={(xpInLevel / xpForNextLevel) * 100} className="h-2" />
                                  </div>
                                  
                                  {nextMilestone && (
                                    <div className="bg-green-950/30 rounded-lg border border-green-800/50 p-3">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Award className="w-4 h-4 text-green-400" />
                                        <span className="text-sm font-bold text-green-400">Next: Level {nextMilestone.level}</span>
                                      </div>
                                      <p className="text-xs text-slate-400">{nextMilestone.unlock}</p>
                                      <p className="text-[10px] text-slate-500 mt-1">{nextMilestone.description}</p>
                                    </div>
                                  )}
                                  
                                  {config.feedsInto && (
                                    <div className="pt-2 border-t border-slate-700">
                                      <h4 className="text-xs text-slate-500 mb-2">Feeds Into Crafting:</h4>
                                      <div className="flex flex-wrap gap-1">
                                        {config.feedsInto.map(craft => (
                                          <Badge key={craft} variant="outline" className="border-amber-700/50 text-amber-400 text-xs">
                                            {craft}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-6 pt-6 border-t border-slate-700">
                        <h4 className="text-md font-cinzel text-amber-400 mb-4">Crafting Professions</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {[
                            { name: 'Miner', icon: '🔨', desc: 'Weapons & Metal Armor', color: 'amber' },
                            { name: 'Forester', icon: '🏹', desc: 'Bows & Nature Staves', color: 'green' },
                            { name: 'Mystic', icon: '✨', desc: 'Magic Staves & Cloth', color: 'purple' },
                            { name: 'Engineer', icon: '⚙️', desc: 'Crossbows & Guns', color: 'slate' },
                            { name: 'Chef', icon: '🍖', desc: 'Food & Potions', color: 'red' },
                          ].map(craft => (
                            <Button 
                              key={craft.name}
                              variant="outline" 
                              className="h-auto p-4 flex flex-col items-start gap-1 border-slate-700 hover:border-amber-500 hover:bg-amber-500/10"
                              onClick={() => setLocation(`/profession/${craft.name.toLowerCase()}`)}
                              data-testid={`btn-profession-${craft.name.toLowerCase()}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{craft.icon}</span>
                                <span className="font-bold">{craft.name}</span>
                              </div>
                              <span className="text-xs text-slate-400">{craft.desc}</span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Class Skills Tab */}
                  <TabsContent value="skills" className="mt-0">
                    {(() => {
                      const skillTree = getClassSkillTree(activeCharacter.classId);
                      if (!skillTree) return <div className="text-slate-500">No skill tree found for this class</div>;
                      
                      const selectedSkills = activeCharacter.selectedSkills || {};
                      const unlockedTiers = getUnlockedTiers(activeCharacter.classId, activeCharacter.level);
                      const lockedTiers = getLockedTiers(activeCharacter.classId, activeCharacter.level);
                      
                      return (
                        <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
                          {/* Header */}
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-lg bg-emerald-900/30 border border-emerald-700/50 flex items-center justify-center overflow-hidden">
                                <img src={skillTree.classIcon} alt={skillTree.className} className="w-12 h-12 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                              </div>
                              <div>
                                <h3 className="text-xl font-cinzel text-emerald-400">{skillTree.className} Skill Tree</h3>
                                <p className="text-slate-400 text-sm">Choose ONE skill per tier as you level up</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-slate-400 text-xs uppercase tracking-wider">Character Level</div>
                              <div className="text-2xl font-bold text-amber-400">{activeCharacter.level}</div>
                            </div>
                          </div>

                          {/* Special Ability - Always Granted */}
                          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-950/50 to-amber-900/30 border-2 border-amber-600/50">
                            <div className="flex items-center gap-2 mb-3">
                              <Sparkles className="w-5 h-5 text-amber-400" />
                              <span className="text-amber-400 font-bold uppercase tracking-wider text-sm">Class Special Ability</span>
                              <Badge className="bg-amber-500/20 text-amber-300 border-amber-600/50 text-xs ml-2">Granted at Creation</Badge>
                            </div>
                            <div className="flex items-start gap-4">
                              <div className="w-14 h-14 rounded-lg bg-amber-900/50 border border-amber-600/50 flex items-center justify-center shrink-0 overflow-hidden">
                                <img src={skillTree.specialAbility.icon} alt={skillTree.specialAbility.name} className="w-10 h-10 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                              </div>
                              <div className="flex-1">
                                <div className="font-bold text-white text-lg">{skillTree.specialAbility.name}</div>
                                <p className="text-slate-300 text-sm mb-2">{skillTree.specialAbility.description}</p>
                                <div className="flex flex-wrap gap-2">
                                  {skillTree.specialAbility.effects.map((effect, i) => (
                                    <Badge key={i} variant="outline" className="text-xs border-amber-700/50 text-amber-300">{effect}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Skill Tiers */}
                          <div className="space-y-4">
                            {skillTree.tiers.map((tier) => {
                              const isUnlocked = tier.level <= activeCharacter.level;
                              const isStartingTier = tier.level === 0;
                              const selectedSkillId = selectedSkills[tier.level];
                              const selectedSkill = tier.choices.find(c => c.id === selectedSkillId);
                              const hasOnlyOneChoice = tier.choices.length === 1;
                              
                              return (
                                <div 
                                  key={tier.level} 
                                  className={cn(
                                    "rounded-xl border-2 transition-all",
                                    isUnlocked 
                                      ? "bg-slate-800/50 border-emerald-700/50" 
                                      : "bg-slate-900/30 border-slate-700/30 opacity-60"
                                  )}
                                  data-testid={`skill-tier-${tier.level}`}
                                >
                                  {/* Tier Header */}
                                  <div className={cn(
                                    "flex items-center justify-between p-4 border-b",
                                    isUnlocked ? "border-emerald-900/50" : "border-slate-800/50"
                                  )}>
                                    <div className="flex items-center gap-3">
                                      <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                                        isUnlocked ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-400"
                                      )}>
                                        {tier.level}
                                      </div>
                                      <div>
                                        <div className={cn("font-bold", isUnlocked ? "text-white" : "text-slate-500")}>
                                          {tier.tierName}
                                        </div>
                                        <div className="text-xs text-slate-400">{tier.description}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isStartingTier && (
                                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-600/50 text-xs">Starting Skill</Badge>
                                      )}
                                      {!isUnlocked && (
                                        <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                                          🔒 Level {tier.level} Required
                                        </Badge>
                                      )}
                                      {isUnlocked && selectedSkill && (
                                        <Badge className="bg-emerald-500/30 text-emerald-300 border-emerald-500/50 text-xs flex items-center gap-1">
                                          <Check className="w-3 h-3" /> Selected
                                        </Badge>
                                      )}
                                      {isUnlocked && !selectedSkill && !hasOnlyOneChoice && (
                                        <Badge className="bg-amber-500/30 text-amber-300 border-amber-500/50 text-xs animate-pulse">
                                          Choose a Skill
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  {/* Skill Choices */}
                                  <div className="p-4">
                                    <div className={cn(
                                      "grid gap-3",
                                      tier.choices.length === 1 ? "grid-cols-1" : 
                                      tier.choices.length === 2 ? "grid-cols-1 md:grid-cols-2" : 
                                      "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                                    )}>
                                      {tier.choices.map((skill) => {
                                        const isSelected = selectedSkillId === skill.id || (hasOnlyOneChoice && isUnlocked);
                                        const canSelect = isUnlocked && !hasOnlyOneChoice;
                                        
                                        return (
                                          <div
                                            key={skill.id}
                                            onClick={() => {
                                              if (canSelect) {
                                                const newSelectedSkills = { ...selectedSkills, [tier.level]: skill.id };
                                                characterAPI.update(activeCharacter.id, { selectedSkills: newSelectedSkills })
                                                  .then(updated => {
                                                    setActiveCharacter(updated);
                                                    setCharacters(prev => prev.map(c => c.id === updated.id ? updated : c));
                                                  })
                                                  .catch(err => console.error("Failed to save skill selection:", err));
                                              }
                                            }}
                                            className={cn(
                                              "relative p-4 rounded-lg border-2 transition-all",
                                              isSelected 
                                                ? "bg-emerald-900/30 border-emerald-500 shadow-lg shadow-emerald-500/20" 
                                                : isUnlocked 
                                                  ? "bg-black/30 border-slate-700 hover:border-emerald-600/50 cursor-pointer hover:bg-emerald-950/20" 
                                                  : "bg-black/20 border-slate-800"
                                            )}
                                            data-testid={`skill-choice-${skill.id}`}
                                          >
                                            {isSelected && (
                                              <div className="absolute top-2 right-2">
                                                <Check className="w-5 h-5 text-emerald-400" />
                                              </div>
                                            )}
                                            
                                            <div className="flex items-start gap-3">
                                              <div className={cn(
                                                "w-12 h-12 rounded-lg border flex items-center justify-center shrink-0 overflow-hidden",
                                                isSelected ? "bg-emerald-900/50 border-emerald-600/50" : "bg-slate-800/50 border-slate-600/50"
                                              )}>
                                                <img 
                                                  src={skill.icon} 
                                                  alt={skill.name} 
                                                  className="w-8 h-8 object-contain" 
                                                  onError={(e) => { 
                                                    e.currentTarget.style.display = 'none'; 
                                                    e.currentTarget.parentElement!.innerHTML = '<span class="text-lg">⚔️</span>';
                                                  }} 
                                                />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className={cn(
                                                  "font-bold text-sm mb-1",
                                                  isSelected ? "text-emerald-300" : isUnlocked ? "text-white" : "text-slate-500"
                                                )}>
                                                  {skill.name}
                                                </div>
                                                <p className={cn(
                                                  "text-xs mb-2 line-clamp-2",
                                                  isUnlocked ? "text-slate-300" : "text-slate-500"
                                                )}>
                                                  {skill.description}
                                                </p>
                                                
                                                {/* Skill Effects */}
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                  {skill.effects.slice(0, 3).map((effect, i) => (
                                                    <span key={i} className={cn(
                                                      "text-[10px] px-1.5 py-0.5 rounded",
                                                      isUnlocked ? "bg-slate-700/50 text-emerald-300" : "bg-slate-800/50 text-slate-500"
                                                    )}>
                                                      {effect}
                                                    </span>
                                                  ))}
                                                </div>
                                                
                                                {/* Skill Costs */}
                                                <div className="flex gap-3 text-[10px]">
                                                  {skill.cooldown && skill.cooldown > 0 && (
                                                    <span className="text-slate-400">CD: {skill.cooldown}s</span>
                                                  )}
                                                  {skill.manaCost && skill.manaCost > 0 && (
                                                    <span className="text-blue-400">Mana: {skill.manaCost}</span>
                                                  )}
                                                  {skill.staminaCost && skill.staminaCost > 0 && (
                                                    <span className="text-green-400">Stamina: {skill.staminaCost}</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Summary */}
                          <div className="mt-6 pt-6 border-t border-slate-700">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-4">
                                <div className="text-slate-400">
                                  Skills Chosen: <span className="text-emerald-400 font-bold">{Object.keys(selectedSkills).length}</span> / {skillTree.tiers.filter(t => t.choices.length > 1).length}
                                </div>
                                <div className="text-slate-400">
                                  Next Unlock: <span className="text-amber-400 font-bold">
                                    {lockedTiers.length > 0 ? `Level ${lockedTiers[0].level}` : 'All Unlocked!'}
                                  </span>
                                </div>
                              </div>
                              <div className="text-slate-500 text-xs">
                                Class skills are permanent - choose wisely!
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </TabsContent>
                </Tabs>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                Select a hero to view details
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // RENDER CREATION VIEW
  return (
    <Layout>
      <div className="flex flex-col relative overflow-hidden bg-background text-foreground rounded-xl border border-slate-800 shadow-2xl min-h-[calc(100vh-100px)]">
        {/* Background Elements */}
        <div 
          className="absolute inset-0 pointer-events-none z-0 opacity-20 mix-blend-overlay"
          style={{ backgroundImage: `url(${bgTexture})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        ></div>
        
        {/* Builder Header */}
        <header className="relative z-10 border-b border-white/10 bg-black/40 backdrop-blur-md p-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl text-primary drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wider font-cinzel font-bold">
                CHARACTER CREATION
              </h1>
              <p className="text-slate-400 text-sm">Forge your legend in the world of Grudge</p>
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                size="sm" 
                variant={adminMode ? "default" : "outline"}
                onClick={() => setAdminMode(!adminMode)} 
                className={cn("text-xs", adminMode ? "bg-purple-600 hover:bg-purple-500" : "border-slate-600 text-slate-400")}
              >
                <Settings className="w-3 h-3 mr-1" /> {adminMode ? "Admin ON" : "Admin"}
              </Button>
              {steps.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                   <div className={cn(
                     "w-8 h-8 rounded-full flex items-center justify-center border-2 text-sm font-bold transition-colors",
                     step === s.id ? "border-primary bg-primary text-black" : 
                     (steps.findIndex(x => x.id === step) > i) ? "border-primary/50 bg-primary/20 text-primary" : "border-white/20 text-white/40"
                   )}>
                     {i + 1}
                   </div>
                   <span className={cn("hidden lg:inline uppercase text-xs font-bold tracking-widest", step === s.id ? "text-primary" : "text-white/40")}>{s.label}</span>
                   {i < steps.length - 1 && <div className="w-4 lg:w-8 h-[1px] bg-white/10" />}
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 relative z-10 p-4 md:p-8 flex flex-col overflow-y-auto max-h-[800px]">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: RACE SELECTION */}
            {step === "race" && (
              <motion.div 
                key="race"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
              >
                {RACES.map((race) => (
                  <div 
                    key={race.id}
                    onClick={() => setSelectedRace(race)}
                    className={cn(
                      "group relative cursor-pointer transition-all duration-300 transform hover:-translate-y-2",
                      "border-4 bg-card overflow-hidden rounded-xl",
                      selectedRace?.id === race.id 
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
                      "absolute top-0 right-0 px-4 py-2 rounded-bl-xl font-bold uppercase tracking-widest text-xs z-20",
                      FACTION_COLORS[race.faction].bg,
                      FACTION_COLORS[race.faction].text
                    )}>
                      {race.faction}
                    </div>

                    {/* Character Image */}
                    <div className="aspect-[3/4] relative overflow-hidden z-[1]">
                      {(() => {
                        const pos = getPortraitPos(race.id);
                        return (
                          <>
                            <img 
                              src={race.image} 
                              alt={race.name} 
                              className={cn(
                                "w-full h-full object-cover transition-transform",
                                !adminMode && "duration-700 group-hover:scale-110",
                                adminMode && draggingRace === race.id && "cursor-grabbing",
                                adminMode && draggingRace !== race.id && "cursor-grab"
                              )}
                              style={{
                                objectPosition: `${pos.x}% ${pos.y}%`,
                                transform: `scale(${pos.scale})`,
                              }}
                              draggable={false}
                              onMouseDown={(e) => {
                                if (!adminMode) return;
                                e.preventDefault();
                                e.stopPropagation();
                                setDraggingRace(race.id);
                                dragStartRef.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y };
                              }}
                            />
                            {/* Admin position controls */}
                            {adminMode && (
                              <div className="absolute top-2 left-2 z-30 flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                                <div className="bg-purple-900/90 rounded px-2 py-1 text-[10px] text-purple-200 border border-purple-500/50 font-bold">
                                  DRAG IMAGE TO MOVE
                                </div>
                                <div className="bg-black/90 rounded px-2 py-1 flex items-center gap-2 border border-purple-500/50">
                                  <span className="text-[10px] text-purple-300">Scale</span>
                                  <input 
                                    type="range" min="0.5" max="3" step="0.05"
                                    value={pos.scale}
                                    onChange={(e) => updatePortraitPos(race.id, { scale: parseFloat(e.target.value) })}
                                    className="w-20 h-1 accent-purple-500"
                                  />
                                  <span className="text-[10px] text-white font-mono w-8">{pos.scale.toFixed(1)}x</span>
                                </div>
                                <div className="bg-black/90 rounded px-1.5 py-0.5 text-[9px] text-slate-400 border border-purple-500/30 font-mono">
                                  x:{pos.x.toFixed(0)}% y:{pos.y.toFixed(0)}%
                                </div>
                                <Button
                                  size="sm"
                                  className="h-5 text-[10px] bg-red-900/80 hover:bg-red-800 text-red-200 border border-red-500/50"
                                  onClick={() => updatePortraitPos(race.id, { x: 50, y: 20, scale: 1 })}
                                >
                                  Reset
                                </Button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90 pointer-events-none" />
                    </div>

                    {/* Content */}
                    <div className="absolute bottom-0 inset-x-0 p-6">
                      <h3 className="text-3xl text-white mb-2 font-cinzel font-bold">{race.name}</h3>
                      <p className="text-sm text-gray-300 mb-4 line-clamp-3 leading-relaxed">{race.description}</p>
                      
                      {/* Race Stats Preview */}
                      <div className="grid grid-cols-4 gap-2 text-xs mb-4">
                         {Object.entries(race.baseStats).filter(([_, v]) => v > 0).slice(0, 4).map(([k, v]) => (
                           <div key={k} className="bg-white/10 rounded px-2 py-1 text-center">
                             <span className="text-primary font-bold">+{v}</span> <span className="text-gray-400">{k.slice(0,3)}</span>
                           </div>
                         ))}
                      </div>

                      {/* Continue Button on Selection */}
                      {selectedRace?.id === race.id && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="pt-2"
                        >
                          <Button 
                            className="w-full bg-primary text-black hover:bg-yellow-400 font-bold"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNext();
                            }}
                          >
                            Confirm {race.name} <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}


            {/* STEP 2: CLASS SELECTION */}
            {step === "class" && (
              <motion.div 
                key="class"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center max-w-5xl mx-auto"
              >
                {!selectedClassId ? (
                  <>
                    <h2 className="text-3xl mb-8 text-center text-primary font-cinzel">Select Your Path</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                      {CLASSES.map((cls) => (
                        <div 
                          key={cls.id}
                          onClick={() => setSelectedClassId(cls.id)}
                          className={cn(
                            "flex items-center gap-6 p-6 rounded-xl border-2 cursor-pointer transition-all hover:bg-white/5 border-white/10"
                          )}
                        >
                          <div className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center text-3xl shrink-0 bg-white/10 text-gray-400"
                          )}>
                            {cls.id === 'warrior' && <Sword />}
                            {cls.id === 'mage' && <Sparkles />}
                            {cls.id === 'ranger' && <div className="text-2xl">🏹</div>}
                            {cls.id === 'worg' && <div className="text-2xl">🐺</div>}
                          </div>
                          <div>
                            <h3 className="text-2xl text-white font-cinzel font-bold">{cls.name}</h3>
                            <div className="text-primary text-sm font-bold uppercase tracking-wider mb-2">{cls.role}</div>
                            <p className="text-gray-400 text-sm line-clamp-2">{cls.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="w-full max-w-4xl animate-in fade-in zoom-in-95 duration-300">
                    {(() => {
                      const cls = CLASSES.find(c => c.id === selectedClassId);
                      if (!cls) return null;
                      
                      return (
                        <div className="bg-card border-2 border-primary/50 rounded-xl p-8 shadow-2xl relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-8 opacity-10">
                              {cls.id === 'warrior' && <Sword size={200} />}
                              {cls.id === 'mage' && <Sparkles size={200} />}
                           </div>
                           
                           <div className="relative z-10">
                              <div className="flex items-center gap-4 mb-6">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setSelectedClassId(null)}
                                  className="rounded-full border border-white/20 hover:bg-white/10"
                                >
                                  <ChevronLeft />
                                </Button>
                                <div>
                                  <h2 className="text-4xl text-white font-cinzel font-bold">{cls.name}</h2>
                                  <div className="text-primary font-bold uppercase tracking-wider">{cls.role}</div>
                                </div>
                              </div>
                              
                              <div className="bg-black/30 rounded-lg p-6 mb-8 border border-white/10 whitespace-pre-wrap text-gray-300 leading-relaxed font-serif text-lg">
                                {cls.description}
                              </div>
                              
                              <div className="flex justify-end gap-4">
                                <Button 
                                  variant="outline"
                                  onClick={() => setSelectedClassId(null)}
                                  className="border-white/20 text-gray-300 hover:text-white"
                                >
                                  Back to Selection
                                </Button>
                                <Button 
                                  size="lg"
                                  className="bg-primary text-black hover:bg-yellow-400 font-bold px-8 text-lg"
                                  onClick={() => {
                                    setSelectedClass(cls);
                                    handleNext();
                                  }}
                                >
                                  Confirm Path <ChevronRight className="ml-2" />
                                </Button>
                              </div>
                           </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 3: ATTRIBUTES */}
            {step === "attributes" && (
              <motion.div 
                key="attributes"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto w-full"
              >
                {/* Left Column: Sliders */}
                <div className="lg:col-span-7 relative border border-amber-900/40 rounded-xl p-6 md:p-8 overflow-hidden">
                  <div 
                    className="absolute inset-0 opacity-30 pointer-events-none z-0"
                    style={{ backgroundImage: `url(/assets/ui/wood-texture.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-950/80 via-stone-900/90 to-stone-950/95 pointer-events-none z-0" />
                  <div className="relative z-10">
                    <div className="flex justify-between items-end mb-6">
                      <div>
                        <h2 className="text-2xl text-amber-200 font-cinzel">Attribute Allocation</h2>
                        <p className="text-stone-400 text-sm">Fine tune your warrior's potential</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-amber-400">{remainingPoints}</div>
                        <div className="text-xs uppercase tracking-widest text-stone-500">Points Remaining</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {(Object.keys(ATTRIBUTES) as AttributeKey[]).map(attr => (
                        <div key={attr} className="group bg-black/20 rounded-lg p-3 border border-amber-900/30 hover:border-amber-600/50 transition-colors">
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-stone-200 group-hover:text-amber-300 transition-colors flex items-center gap-3">
                              <span className="text-2xl drop-shadow-lg">{ATTRIBUTE_ICONS[attr]}</span>
                              <span>{attr}</span>
                              <span className="text-xs font-normal text-stone-500 bg-black/40 px-2 py-0.5 rounded">
                                 Base: {(selectedRace?.baseStats[attr] || 0) + (selectedClass?.baseStats[attr] || 0)}
                              </span>
                            </label>
                            <span className="text-xl font-mono font-bold text-amber-200">{totalStats[attr]}</span>
                          </div>
                          <div className="flex items-center gap-4 pl-11">
                            <Button 
                              size="icon" 
                              variant="outline" 
                              className="w-7 h-7 rounded-full border-amber-700/50 hover:border-amber-400 hover:text-amber-400 bg-black/30"
                              onClick={() => setManualAttributes(p => ({...p, [attr]: Math.max(0, p[attr] - 1)}))}
                              disabled={manualAttributes[attr] <= 0}
                            >
                              -
                            </Button>
                            <Progress 
                              value={(totalStats[attr] / 30) * 100} 
                              className="h-2 bg-black/50 flex-1" 
                              indicatorClassName={cn(
                                 attr === 'Strength' ? "bg-red-500" :
                                 attr === 'Intellect' ? "bg-blue-500" :
                                 attr === 'Dexterity' ? "bg-yellow-500" :
                                 attr === 'Vitality' ? "bg-green-500" :
                                 attr === 'Endurance' ? "bg-gray-400" :
                                 attr === 'Wisdom' ? "bg-purple-500" :
                                 attr === 'Agility' ? "bg-teal-400" :
                                 attr === 'Tactics' ? "bg-slate-400" : "bg-amber-500"
                              )}
                            />
                             <Button 
                              size="icon" 
                              variant="outline" 
                              className="w-7 h-7 rounded-full border-amber-700/50 hover:border-amber-400 hover:text-amber-400 bg-black/30"
                              onClick={() => setManualAttributes(p => ({...p, [attr]: p[attr] + 1}))}
                              disabled={remainingPoints <= 0}
                            >
                              +
                            </Button>
                          </div>
                          <p className="text-xs text-stone-500 mt-1 pl-11">{ATTRIBUTES[attr].description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Chart & Summary */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                   {/* Radar Chart */}
                   <div className="relative border border-amber-900/40 rounded-xl p-6 h-[400px] flex items-center justify-center overflow-hidden">
                      <div 
                        className="absolute inset-0 opacity-20 pointer-events-none z-0"
                        style={{ backgroundImage: `url(/assets/ui/wood-texture.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-950/80 via-stone-900/90 to-stone-950/95 pointer-events-none z-0" />
                      <div className="relative z-10 w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={Object.keys(ATTRIBUTES).map(k => ({ subject: k, A: totalStats[k as AttributeKey], fullMark: 30 }))}>
                            <PolarGrid stroke="rgba(217,163,77,0.2)" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(217,163,77,0.7)', fontSize: 10 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 30]} tick={false} axisLine={false} />
                            <Radar name="Stats" dataKey="A" stroke="#f59e0b" strokeWidth={3} fill="#f59e0b" fillOpacity={0.3} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="absolute top-4 right-4 text-xs text-amber-600/70 z-10">
                        Build Visualizer
                      </div>
                   </div>

                   {/* Derived Stats Preview */}
                   <div className="relative border border-amber-900/40 rounded-xl p-6 flex-1 overflow-hidden">
                      <div 
                        className="absolute inset-0 opacity-20 pointer-events-none z-0"
                        style={{ backgroundImage: `url(/assets/ui/wood-texture.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-950/80 via-stone-900/90 to-stone-950/95 pointer-events-none z-0" />
                      <div className="relative z-10">
                        <h3 className="text-lg text-amber-200 mb-4 border-b border-amber-900/40 pb-2 font-cinzel">Combat Estimates</h3>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-black/30 p-3 rounded-lg border border-amber-900/30">
                             <div className="text-xs text-stone-500 uppercase">Hit Points</div>
                             <div className="text-xl font-bold text-green-400">
                               {250 + (totalStats.Vitality * 25) + (totalStats.Strength * 5)}
                             </div>
                           </div>
                           <div className="bg-black/30 p-3 rounded-lg border border-amber-900/30">
                             <div className="text-xs text-stone-500 uppercase">Mana Pool</div>
                             <div className="text-xl font-bold text-blue-400">
                               {100 + (totalStats.Intellect * 9) + (totalStats.Wisdom * 6)}
                             </div>
                           </div>
                           <div className="bg-black/30 p-3 rounded-lg border border-amber-900/30">
                             <div className="text-xs text-stone-500 uppercase">Phys Defense</div>
                             <div className="text-xl font-bold text-stone-300">
                               {(totalStats.Endurance * 5) + (totalStats.Strength * 4)}
                             </div>
                           </div>
                           <div className="bg-black/30 p-3 rounded-lg border border-amber-900/30">
                             <div className="text-xs text-stone-500 uppercase">Crit Chance</div>
                             <div className="text-xl font-bold text-amber-400">
                               {(totalStats.Dexterity * 0.3).toFixed(1)}%
                             </div>
                           </div>
                        </div>
                      </div>
                   </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: SUMMARY */}
            {step === "summary" && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-4xl mx-auto bg-card border border-white/10 rounded-2xl p-8 md:p-12 relative overflow-hidden"
              >
                <div className={cn("absolute top-0 right-0 w-64 h-64 bg-gradient-to-br opacity-20 blur-3xl", FACTION_COLORS[selectedRace?.faction || 'Crusade'].bg)}></div>
                
                <div className="relative z-10 text-center">
                  <h2 className="text-sm uppercase tracking-[0.5em] text-gray-400 mb-2">Character Created</h2>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl text-primary mb-2 drop-shadow-lg font-cinzel font-bold">{selectedRace?.name} {selectedClass?.name}</h1>
                  <div className={cn("inline-block px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider mb-8", FACTION_COLORS[selectedRace?.faction || 'Crusade'].bg, FACTION_COLORS[selectedRace?.faction || 'Crusade'].text)}>
                    {selectedRace?.faction} Faction
                  </div>

                  <div className="max-w-md mx-auto mb-8">
                    <label className="block text-left text-sm text-gray-400 mb-1">Name Your Hero</label>
                    <input 
                      type="text" 
                      className="w-full bg-black/30 border border-white/20 rounded px-4 py-3 text-white focus:border-primary outline-none text-lg font-cinzel"
                      placeholder="Enter Name..."
                      value={charName}
                      onChange={(e) => setCharName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
                    <div>
                      <h3 className="text-xl text-white mb-6 border-b border-white/10 pb-2 font-cinzel">Attribute Profile</h3>
                      <div className="space-y-3">
                         {Object.entries(totalStats).map(([k, v]) => (
                           <div key={k} className="flex justify-between items-center">
                             <span className="text-gray-400">{k}</span>
                             <span className="text-white font-mono text-lg font-bold">{v}</span>
                           </div>
                         ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <div className={cn("w-48 h-48 rounded-full border-4 overflow-hidden mb-6 shadow-2xl bg-black/50 flex items-center justify-center", FACTION_COLORS[selectedRace?.faction || 'Crusade'].border)}>
                         <div className="scale-[2.5] transform translate-y-4">
                           <SpriteAnimator 
                              spriteSet={getSpriteSet(selectedRace?.id, selectedClass?.id)} 
                              action="Idle"
                              isUndead={selectedRace?.id === 'undead'}
                           />
                         </div>
                      </div>
                      <p className="text-center text-gray-400 italic">
                        "Welcome to the {selectedRace?.faction}, {selectedClass?.name}. Your journey begins now."
                      </p>
                      <Button size="lg" className="mt-8 w-full bg-primary text-black hover:bg-yellow-400 font-bold" onClick={handleFinishCreation}>
                        Save & Begin Adventure
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
          
          {/* Character Creation Loading Overlay */}
          <AnimatePresence>
            {isCreatingCharacter && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center"
              >
                <div className="text-center max-w-md p-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-24 h-24 mx-auto mb-6 border-4 border-amber-500/30 border-t-amber-500 rounded-full"
                  />
                  <h2 className="font-cinzel text-2xl text-amber-400 mb-4">Summoning Hero</h2>
                  <p className="text-slate-400 text-lg mb-2">{charName || "Your Champion"}</p>
                  <motion.p 
                    key={creationStatus}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-slate-500"
                  >
                    {creationStatus}
                  </motion.p>
                  <div className="mt-6 flex justify-center gap-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-3 h-3 bg-amber-500 rounded-full"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer Navigation (Only for creation) */}
        {viewMode === "create" && (
          <footer className="p-6 border-t border-white/10 bg-black/60 backdrop-blur-md sticky bottom-0 z-50">
             <div className="container mx-auto flex justify-between items-center">
                <Button 
                  variant="ghost" 
                  onClick={() => step === "race" ? setViewMode("roster") : handleBack} 
                  className="text-gray-400 hover:text-white"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> {step === "race" ? "Cancel" : "Back"}
                </Button>

                {step !== 'summary' && (
                  <Button 
                    onClick={handleNext}
                    disabled={(step === 'race' && !selectedRace) || (step === 'class' && !selectedClass)}
                    className="bg-primary text-black hover:bg-yellow-400 font-bold px-8"
                  >
                    {step === 'attributes' ? "Finalize" : "Next Step"} <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
             </div>
          </footer>
        )}
      </div>
    </Layout>
  );
}
