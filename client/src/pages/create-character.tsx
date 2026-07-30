/**
 * Create Character — Unified Race/Class/Skill Selection
 *
 * Ported from grudge-skill-tree/class-selector.html into React.
 * Uses existing game data from gameData.ts + classSkillTrees.ts.
 * Connected to backend via /api/characters for real character creation.
 */
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, RotateCcw, Lock, ChevronRight, ImagePlus, Gem, Check } from "lucide-react";
import { RACES, CLASSES, FACTION_COLORS, getSpriteSetForCharacter, type RaceDef, type ClassDef } from "@/lib/gameData";
import {
  CLASS_SKILL_TREES,
  getClassSkillTree,
  type ClassSkillTree,
  type ClassSkillTier,
  type ClassSkillChoice,
} from "@shared/definitions/classSkillTrees";
import { characterAPI } from "@/lib/api";
import { puterAI } from "@/lib/puterIntegration";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import SpriteAnimator from "@/components/SpriteAnimator";
import ThreeScene, { type ThreeSceneHandle } from "@/components/ThreeScene";
import CharacterModel3D from "@/components/CharacterModel3D";
import { getAvailableStates, CLASS_WEAPON_MAP, type AnimState3D } from "@/lib/modelManifest";
import { assetUrl } from "@/lib/assetConfig";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { isAuthenticated, getCurrentUser } from "@/lib/grudgeBackend";
import { RACE_PORTRAITS, CLASS_HERO_IMAGES } from "@/lib/artAssets";

// ── Class color map ──────────────────────────────────────────────────
const CLASS_COLORS: Record<string, { accent: string; glow: string; bg: string }> = {
  warrior: { accent: "text-red-400", glow: "shadow-red-500/50", bg: "from-red-900/30" },
  mage:    { accent: "text-blue-400", glow: "shadow-blue-500/50", bg: "from-blue-900/30" },
  ranger:  { accent: "text-green-400", glow: "shadow-green-500/50", bg: "from-green-900/30" },
  worg:    { accent: "text-purple-400", glow: "shadow-purple-500/50", bg: "from-purple-900/30" },
};

const CLASS_EMOJI: Record<string, string> = {
  warrior: "🗡️", mage: "🔮", ranger: "🏹", worg: "🐺",
};

// Race + class portraits now imported from @/lib/artAssets (local hero-codex images)

// ── Component ────────────────────────────────────────────────────────

export default function CreateCharacterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  // Production: heroes must attach to a real Grudge ID JWT (not guest pool)
  const authReady = useAuthGuard();
  const signedIn = isAuthenticated();

  // 3D preview refs + state
  const threeSceneRef = useRef<ThreeSceneHandle | null>(null);
  const [anim3D, setAnim3D] = useState<AnimState3D>("idle");

  // State
  const [selectedRace, setSelectedRace] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [picks, setPicks] = useState<Record<string, Record<number, string[]>>>({});
  const [characterName, setCharacterName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // Production flow state: avatar generation + cNFT minting
  const [creationStep, setCreationStep] = useState<'idle' | 'creating' | 'generating-avatar' | 'minting-nft' | 'complete'>('idle');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [mintStatus, setMintStatus] = useState<string | null>(null);
  const [createdCharId, setCreatedCharId] = useState<string | null>(null);

  const race = useMemo(() => RACES.find(r => r.id === selectedRace), [selectedRace]);
  const cls = useMemo(() => CLASSES.find(c => c.id === selectedClass), [selectedClass]);
  const skillTree = useMemo(() => selectedClass ? getClassSkillTree(selectedClass) : null, [selectedClass]);

  // ── Skill picking ────────────────────────────────────────────────
  const classPicks = useMemo(() => {
    if (!selectedClass) return {};
    return picks[selectedClass] || {};
  }, [selectedClass, picks]);

  function togglePick(tierLevel: number, choiceId: string, maxPicks = 1) {
    if (!selectedClass) return;
    setPicks(prev => {
      const cp = { ...prev };
      const cls = cp[selectedClass] || {};
      let arr = [...(cls[tierLevel] || [])];
      if (arr.includes(choiceId)) {
        arr = arr.filter(x => x !== choiceId);
      } else {
        arr.push(choiceId);
        while (arr.length > maxPicks) arr.shift();
      }
      cp[selectedClass] = { ...cls, [tierLevel]: arr };
      return cp;
    });
  }

  function isSelected(tierLevel: number, choiceId: string): boolean {
    return (classPicks[tierLevel] || []).includes(choiceId);
  }

  // ── Progress calculation ─────────────────────────────────────────
  const { totalNeeded, totalPicked, progressPct } = useMemo(() => {
    if (!skillTree) return { totalNeeded: 0, totalPicked: 0, progressPct: 0 };
    let needed = 0;
    let picked = 0;
    for (const tier of skillTree.tiers) {
      if (tier.level === 0 && tier.choices.length === 1) continue; // auto tier
      needed += 1; // 1 pick per tier (most tiers)
      picked += (classPicks[tier.level] || []).length;
    }
    return { totalNeeded: needed, totalPicked: picked, progressPct: needed ? Math.min(100, (picked / needed) * 100) : 0 };
  }, [skillTree, classPicks]);

  const canLock = selectedRace && selectedClass && characterName.trim().length >= 2 && totalPicked >= totalNeeded;

  // ── Randomize ────────────────────────────────────────────────────
  function randomize() {
    if (!selectedClass || !skillTree) return;
    const newPicks: Record<number, string[]> = {};
    for (const tier of skillTree.tiers) {
      if (tier.level === 0 && tier.choices.length === 1) {
        newPicks[tier.level] = [tier.choices[0].id];
        continue;
      }
      const shuffled = [...tier.choices].sort(() => Math.random() - 0.5);
      newPicks[tier.level] = [shuffled[0].id];
    }
    setPicks(prev => ({ ...prev, [selectedClass]: newPicks }));
  }

  // ── Reset ────────────────────────────────────────────────────────
  function resetAll() {
    setSelectedRace(null);
    setSelectedClass(null);
    setPicks({});
    setCharacterName("");
    setShowConfirm(false);
  }

  // ── Full production character creation flow ──────────────────────
  // 1. Create character in backend (gets server-side wallet auto-created)
  // 2. Generate AI avatar via Puter txt2img (race-specific prompt)
  // 3. Auto-mint as cNFT via Crossmint → player's server-side wallet
  // 4. If no server wallet, mint to agent escrow wallet for later claim
  async function handleCreate() {
    if (!canLock || !selectedRace || !selectedClass) return;
    if (!isAuthenticated()) {
      toast({
        title: "Sign in required",
        description: "Sign in with Grudge ID so this hero is saved to your account roster.",
        variant: "destructive",
      });
      setLocation(`/create-character?returnTo=${encodeURIComponent("/home")}`);
      // Bounce to home so LoginModal / SSO is obvious
      window.dispatchEvent(new CustomEvent("grudge:auth:need-login"));
      return;
    }
    setIsCreating(true);
    setCreationStep('creating');
    setAvatarUrl(null);
    setMintStatus(null);

    try {
      // Step 1: Create the character in the backend (requireAuth on Railway)
      const skillLoadouts = classPicks;
      const result = await characterAPI.create({
        name: characterName.trim(),
        raceId: selectedRace,
        classId: selectedClass,
        skillLoadouts,
        gameEra: "warlords",
      } as any);
      const charId = result.id;
      setCreatedCharId(charId);
      try {
        const { CharacterManager } = await import("@/lib/characterManager");
        CharacterManager.setActive(charId);
      } catch {
        /* ignore */
      }
      toast({ title: "Character Created!", description: `${characterName} is ready.` });

      // Step 2: Generate AI avatar via Puter txt2img
      setCreationStep('generating-avatar');
      const raceDef = RACES.find(r => r.id === selectedRace);
      const faction = raceDef?.faction;
      const generatedAvatar = await puterAI.generateHeroAvatar(
        characterName.trim(),
        selectedRace,
        selectedClass,
        faction,
      );

      if (generatedAvatar) {
        setAvatarUrl(generatedAvatar);
        // Save avatar URL to character
        await characterAPI.update(charId, { avatarUrl: generatedAvatar } as any).catch(() => {});
        toast({ title: "Avatar Generated!", description: "Your hero portrait is ready." });
      } else {
        toast({ title: "Avatar Skipped", description: "Puter AI unavailable — you can generate later.", variant: "default" });
      }

      // Step 3: Auto-mint as cNFT
      // Backend handles wallet logic: server-side wallet → agent escrow if none
      setCreationStep('minting-nft');
      try {
        const mintResult = await characterAPI.mintCNFT(charId, generatedAvatar || undefined);
        if (mintResult.success) {
          if (mintResult.alreadyMinted) {
            setMintStatus('already-minted');
          } else {
            setMintStatus('minted');
            toast({ title: "cNFT Minted!", description: mintResult.mintAddress 
              ? `On-chain: ${mintResult.mintAddress.slice(0, 8)}...`
              : "Minting in progress — check wallet." });
          }
        } else {
          // Mint failed — likely no wallet. Backend should escrow to agent wallet.
          setMintStatus('escrow');
          toast({ title: "cNFT Queued", description: "Held in escrow — claim it once your wallet is set up." });
        }
      } catch {
        setMintStatus('escrow');
        toast({ title: "cNFT Queued", description: "Minting queued — you can claim later from your wallet page." });
      }

      setCreationStep('complete');
      // Return to home roster so the new hero is visible immediately
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo") || "/home";
      window.setTimeout(() => setLocation(returnTo), 1200);
    } catch (e: any) {
      toast({ title: "Creation Failed", description: e.message || "Could not create character.", variant: "destructive" });
      setCreationStep('idle');
    } finally {
      setIsCreating(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────
  const classColors = selectedClass ? CLASS_COLORS[selectedClass] : null;

  if (authReady && !signedIn) {
    return (
      <div className="min-h-screen bg-[#05060c] text-stone-100 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-cinzel text-xl text-amber-300">Sign in to create a hero</p>
        <p className="text-sm text-white/40 max-w-md">
          Heroes are stored on your Grudge account (Railway). Creating while signed out
          used to orphan characters under a guest id — that is disabled in production.
        </p>
        <div className="flex gap-3">
          <Button
            className="bg-amber-700 hover:bg-amber-600"
            onClick={() => setLocation("/home")}
          >
            Back to Home · Sign in
          </Button>
          <Button
            variant="outline"
            className="border-amber-600/40 text-amber-200"
            onClick={() => {
              window.location.href = `https://id.grudge-studio.com/login?return=${encodeURIComponent(
                window.location.origin + "/create-character?returnTo=/home",
              )}`;
            }}
          >
            Grudge ID login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-[#05060c] to-stone-950 text-stone-100 overflow-x-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <AnimatePresence mode="wait">
          {selectedClass && (
            <motion.div
              key={selectedClass}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${CLASS_HERO_IMAGES[selectedClass] || ""}')`, filter: "saturate(1.1) brightness(0.45)" }}
            />
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-[#05060c] via-[#05060c]/60 to-transparent" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-wider font-cinzel bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              CREATE YOUR WARLORD
            </h1>
            <p className="text-stone-500 text-sm mt-1 tracking-wide">Race · Class · Skill Codex</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-stone-400" onClick={() => setLocation("/character")}>
              ← Back
            </Button>
          </div>
        </div>

        {/* Character Name Input */}
        <div className="mb-5">
          <input
            type="text"
            value={characterName}
            onChange={e => setCharacterName(e.target.value)}
            placeholder="Enter character name..."
            maxLength={24}
            className="w-full max-w-md h-12 px-4 rounded-xl bg-stone-900/80 border border-stone-700 text-lg font-cinzel tracking-wider text-amber-200 placeholder:text-stone-600 focus:outline-none focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/30 transition-all"
          />
        </div>

        {/* Race Picker */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
          {RACES.map(r => (
            <motion.button
              key={r.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedRace(selectedRace === r.id ? null : r.id)}
              className={cn(
                "relative aspect-square rounded-xl overflow-hidden border transition-all cursor-pointer",
                selectedRace === r.id
                  ? "border-amber-500 shadow-lg shadow-amber-500/30 ring-1 ring-amber-500/50"
                  : "border-stone-800 hover:border-stone-600"
              )}
            >
              <img
                src={RACE_PORTRAITS[r.id] || r.image}
                alt={r.name}
                className={cn(
                  "absolute inset-0 w-full h-full object-cover transition-all",
                  selectedRace === r.id ? "scale-105 saturate-125 brightness-105" : "saturate-75 brightness-75 hover:brightness-100"
                )}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <span className="absolute bottom-1.5 left-0 right-0 text-center text-xs font-cinzel tracking-wider text-white drop-shadow-lg">
                {r.name}
              </span>
              {selectedRace === r.id && (
                <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-transparent pointer-events-none" />
              )}
            </motion.button>
          ))}
        </div>

        {/* Class Picker */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {CLASSES.map(c => {
            const colors = CLASS_COLORS[c.id];
            const isActive = selectedClass === c.id;
            return (
              <motion.button
                key={c.id}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedClass(c.id);
                  // Auto-pick level 0 skill
                  const tree = getClassSkillTree(c.id);
                  if (tree) {
                    const autoTier = tree.tiers.find(t => t.level === 0 && t.choices.length === 1);
                    if (autoTier) {
                      setPicks(prev => ({
                        ...prev,
                        [c.id]: { ...prev[c.id], [autoTier.level]: [autoTier.choices[0].id] },
                      }));
                    }
                  }
                }}
                className={cn(
                  "relative rounded-2xl p-4 border text-left overflow-hidden backdrop-blur-md transition-all",
                  isActive
                    ? `border-amber-500/60 shadow-xl ${colors?.glow}`
                    : "border-stone-800 bg-stone-900/50 hover:border-stone-600"
                )}
              >
                {/* Background image */}
                <div
                  className="absolute inset-0 bg-cover bg-top opacity-40"
                  style={{ backgroundImage: `url('${CLASS_HERO_IMAGES[c.id] || ""}')`, maskImage: "linear-gradient(180deg, black, transparent 85%)" }}
                />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center text-2xl border",
                      isActive ? "bg-gradient-to-b from-amber-400 to-amber-600 text-stone-900 border-amber-300" : "bg-stone-800/80 border-stone-700"
                    )}>
                      {CLASS_EMOJI[c.id] || "⚔"}
                    </div>
                    <div>
                      <h3 className="font-cinzel font-bold text-base tracking-wide">{c.name}</h3>
                      <p className="text-stone-400 text-xs">{c.role}</p>
                    </div>
                  </div>
                  <p className="text-stone-300 text-xs leading-relaxed">{c.description}</p>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Main Grid: Skill Tree + Side Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
          {/* Skill Tree */}
          <section className="rounded-2xl border border-stone-800 bg-stone-900/60 backdrop-blur-md p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-cinzel text-xl tracking-wider">
                {cls ? cls.name : "Choose your Class"}
              </h2>
              {cls && <Badge variant="outline" className="text-stone-400 border-stone-700">{cls.role}</Badge>}
            </div>

            {/* Progress bar */}
            {skillTree && (
              <div className="relative h-2.5 rounded-full bg-stone-800 border border-stone-700 mb-6 overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full"
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            )}

            {!skillTree ? (
              <div className="py-16 text-center text-stone-500">
                <p className="font-cinzel text-lg text-stone-300 mb-2">⚔ Select a Class ⚔</p>
                Choose from the classes above to view the skill tree.
              </div>
            ) : (
              <div className="space-y-8">
                {skillTree.tiers.map((tier, ti) => {
                  const isAuto = tier.level === 0 && tier.choices.length === 1;
                  return (
                    <div key={tier.level} className="grid grid-cols-[140px_1fr] gap-4 items-start">
                      {/* Tier label */}
                      <div className="text-right border-r border-stone-700/50 pr-4">
                        <div className="font-cinzel text-xl text-white">Lv {tier.level}</div>
                        <div className="text-stone-500 text-xs tracking-wider uppercase">{tier.tierName}</div>
                        <Badge variant="outline" className={cn(
                          "mt-2 text-[10px]",
                          isAuto ? "border-amber-600/40 text-amber-400 bg-amber-900/20" : "border-stone-700 text-stone-400"
                        )}>
                          {isAuto ? "Auto" : `Pick 1 of ${tier.choices.length}`}
                        </Badge>
                      </div>
                      {/* Choices */}
                      <div className="flex flex-wrap gap-3">
                        {tier.choices.map(choice => {
                          const picked = isSelected(tier.level, choice.id);
                          return (
                            <motion.button
                              key={choice.id}
                              whileHover={{ y: -2 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => !isAuto && togglePick(tier.level, choice.id)}
                              className={cn(
                                "w-[220px] min-h-[110px] rounded-2xl p-3.5 text-left border transition-all relative overflow-hidden",
                                isAuto && "border-amber-600/40 bg-gradient-to-b from-amber-900/20 to-transparent shadow-lg shadow-amber-500/15",
                                picked && !isAuto && "border-amber-500/60 bg-gradient-to-b from-amber-900/15 to-transparent shadow-lg shadow-amber-500/30 ring-1 ring-amber-500/40",
                                !picked && !isAuto && "border-stone-700 bg-stone-800/40 hover:border-stone-500"
                              )}
                            >
                              {isAuto && <span className="absolute top-2 right-2 text-[9px] font-bold tracking-widest bg-gradient-to-b from-amber-400 to-amber-600 text-stone-900 px-2 py-0.5 rounded-full">AUTO</span>}
                              <div className="flex items-center gap-2.5 mb-2">
                                <div className={cn(
                                  "w-10 h-10 rounded-lg flex items-center justify-center text-lg border overflow-hidden",
                                  picked || isAuto ? "shadow-lg shadow-amber-500/40" : ""
                                )}>
                                  {choice.icon.startsWith("/") ? (
                                    <img src={choice.icon} alt={choice.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                  ) : (
                                    <span>{choice.icon}</span>
                                  )}
                                </div>
                                <span className="font-bold text-sm">{choice.name}</span>
                              </div>
                              <p className="text-stone-400 text-xs leading-relaxed">{choice.description}</p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {choice.effects.slice(0, 3).map((e, i) => (
                                  <span key={i} className="text-[10px] text-stone-300 bg-stone-800/60 px-1.5 py-0.5 rounded-full">{e}</span>
                                ))}
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Side Panel */}
          <aside className="rounded-2xl border border-stone-800 bg-stone-900/60 backdrop-blur-md p-4 lg:sticky lg:top-5 lg:self-start">
            {/* Hero preview */}
            <div className="relative h-52 rounded-xl overflow-hidden mb-4 bg-stone-950 border border-stone-800">
              {(selectedClass || selectedRace) && (
                <div
                  className="absolute inset-0 bg-cover bg-center transition-all duration-700"
                  style={{
                    backgroundImage: `url('${selectedRace ? RACE_PORTRAITS[selectedRace] : CLASS_HERO_IMAGES[selectedClass || ""] || ""}')`,
                    filter: "saturate(1.1) brightness(0.8)",
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 z-10">
                <h3 className="font-cinzel text-xl tracking-wider">
                  {characterName || (race ? race.name : "—")} {cls ? cls.name : ""}
                </h3>
                <span className="text-stone-400 text-xs tracking-wider">
                  {race ? `${race.faction} Faction` : "Select a race & class"}
                </span>
              </div>
            </div>

            {/* 3D / Sprite preview */}
            {selectedRace && selectedClass && (
              <div className="mb-4">
                {/* 3D Model Preview */}
                <div className="relative mx-auto rounded-xl overflow-hidden border border-stone-800" style={{ height: 260 }}>
                  <ThreeScene
                    ref={threeSceneRef}
                    className="w-full h-full"
                    cameraMode="orbit"
                    cameraDistance={4}
                    cameraHeight={2.2}
                    orbitSpeed={15}
                    bgColor="#0a0c14"
                  />
                  <CharacterModel3D
                    sceneRef={threeSceneRef}
                    raceId={selectedRace}
                    classId={selectedClass}
                    animation={anim3D}
                    onAnimationComplete={() => setAnim3D("idle")}
                  />
                </div>
                {/* Anim buttons */}
                <div className="flex gap-1 flex-wrap mt-2 justify-center">
                  {(getAvailableStates(CLASS_WEAPON_MAP[selectedClass] ?? "sword-shield")).slice(0, 6).map(state => (
                    <button
                      key={state}
                      onClick={() => setAnim3D(state)}
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase transition-colors",
                        anim3D === state
                          ? "bg-amber-500 text-stone-900 border-amber-500"
                          : "bg-stone-900/60 text-stone-500 border-stone-700 hover:border-amber-600/50"
                      )}
                    >
                      {state}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Build summary */}
            <div className="space-y-2 mb-4">
              {skillTree?.tiers.map(tier => {
                const arr = classPicks[tier.level] || [];
                const isAuto = tier.level === 0 && tier.choices.length === 1;
                const pickedNames = arr.map(id => tier.choices.find(c => c.id === id)?.name || "—").join(" + ");
                return (
                  <div
                    key={tier.level}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-xs border",
                      arr.length > 0
                        ? "border-amber-700/40 bg-amber-900/10"
                        : "border-stone-800 bg-stone-900/30"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full", arr.length > 0 ? "bg-amber-400 shadow-lg shadow-amber-400" : "bg-stone-600")} />
                    <span className="font-cinzel tracking-wider text-stone-400 w-12">Lv {tier.level}</span>
                    <span className="font-bold text-stone-200 flex-1 truncate">{arr.length > 0 ? pickedNames : "—"}</span>
                    <span className="text-stone-500">{isAuto ? "auto" : "pick 1"}</span>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={!canLock || isCreating}
                className="flex-1 h-11 font-cinzel font-bold tracking-wider bg-gradient-to-b from-amber-500 to-amber-700 text-stone-900 hover:from-amber-400 hover:to-amber-600 shadow-lg shadow-amber-900/40 disabled:opacity-40"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                CREATE
              </Button>
              <Button variant="ghost" size="icon" onClick={randomize} disabled={!selectedClass} className="text-stone-400 hover:text-white">
                <Sparkles className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={resetAll} className="text-red-400 hover:text-red-300">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </aside>
        </div>
      </div>

      {/* Confirm / Creation Flow Dialog */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => creationStep === 'idle' ? setShowConfirm(false) : undefined}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-stone-900 border border-stone-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
            >
              {creationStep === 'idle' ? (
                /* Pre-creation confirmation */
                <>
                  <h2 className="font-cinzel text-xl text-amber-400 tracking-wider mb-3">Confirm Creation</h2>
                  <div className="space-y-2 text-sm text-stone-300 mb-5">
                    <p><span className="text-stone-500">Name:</span> <strong>{characterName}</strong></p>
                    <p><span className="text-stone-500">Race:</span> <strong>{race?.name}</strong> ({race?.faction})</p>
                    <p><span className="text-stone-500">Class:</span> <strong>{cls?.name}</strong></p>
                    <p className="text-stone-500 text-xs mt-2">This will create your character, generate an AI portrait, and mint it as a cNFT.</p>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleCreate} disabled={isCreating}
                      className="flex-1 bg-gradient-to-b from-amber-500 to-amber-700 text-stone-900 font-cinzel font-bold">
                      Create Character
                    </Button>
                    <Button variant="ghost" onClick={() => setShowConfirm(false)} className="text-stone-400">Cancel</Button>
                  </div>
                </>
              ) : creationStep === 'complete' ? (
                /* Creation complete */
                <>
                  <div className="text-center">
                    {avatarUrl && (
                      <div className="w-48 h-48 mx-auto mb-4 rounded-xl overflow-hidden border-2 border-amber-500/50 shadow-xl shadow-amber-500/20">
                        <img src={avatarUrl} alt={characterName} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <h2 className="font-cinzel text-2xl text-amber-400 tracking-wider mb-1">{characterName}</h2>
                    <p className="text-stone-400 text-sm mb-4">{race?.name} {cls?.name} — {race?.faction} Faction</p>

                    <div className="space-y-2 mb-5">
                      <div className="flex items-center gap-2 text-sm text-green-400">
                        <Check className="w-4 h-4" /> Character created
                      </div>
                      <div className={cn("flex items-center gap-2 text-sm", avatarUrl ? "text-green-400" : "text-stone-500")}>
                        {avatarUrl ? <Check className="w-4 h-4" /> : <ImagePlus className="w-4 h-4" />}
                        {avatarUrl ? "AI portrait generated" : "Portrait skipped (generate later)"}
                      </div>
                      <div className={cn("flex items-center gap-2 text-sm",
                        mintStatus === 'minted' ? "text-green-400" :
                        mintStatus === 'already-minted' ? "text-blue-400" :
                        mintStatus === 'escrow' ? "text-yellow-400" : "text-stone-500"
                      )}>
                        {mintStatus === 'minted' ? <><Gem className="w-4 h-4" /> cNFT minted to your wallet</> :
                         mintStatus === 'already-minted' ? <><Gem className="w-4 h-4" /> cNFT already exists</> :
                         mintStatus === 'escrow' ? <><Gem className="w-4 h-4" /> cNFT held in escrow — claim from wallet page</> :
                         <><Gem className="w-4 h-4" /> cNFT mint skipped</>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={() => setLocation("/game/character")} className="flex-1 bg-gradient-to-b from-amber-500 to-amber-700 text-stone-900 font-cinzel font-bold">
                      VIEW CHARACTER
                    </Button>
                    <Button onClick={() => setLocation("/play")} variant="outline" className="flex-1 border-amber-700 text-amber-400 hover:bg-amber-900/20 font-cinzel font-bold">
                      ENTER WORLD
                    </Button>
                  </div>
                </>
              ) : (
                /* In-progress creation steps */
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-amber-500/30 border-t-amber-500 animate-spin" />
                  <h2 className="font-cinzel text-lg text-amber-400 tracking-wider mb-2">
                    {creationStep === 'creating' && 'Creating Character...'}
                    {creationStep === 'generating-avatar' && 'Generating AI Portrait...'}
                    {creationStep === 'minting-nft' && 'Minting cNFT...'}
                  </h2>
                  <p className="text-stone-500 text-sm">
                    {creationStep === 'creating' && 'Setting up your hero on the server...'}
                    {creationStep === 'generating-avatar' && `Creating a unique portrait for ${characterName} using Puter AI...`}
                    {creationStep === 'minting-nft' && 'Minting your character as a compressed NFT on Solana...'}
                  </p>
                  {/* Step indicators */}
                  <div className="flex justify-center gap-2 mt-6">
                    {['creating', 'generating-avatar', 'minting-nft'].map((step, i) => (
                      <div key={step} className={cn(
                        "w-2.5 h-2.5 rounded-full transition-all",
                        creationStep === step ? "bg-amber-400 scale-125 shadow-lg shadow-amber-400" :
                        ['creating', 'generating-avatar', 'minting-nft'].indexOf(creationStep) > i ? "bg-green-500" : "bg-stone-700"
                      )} />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
