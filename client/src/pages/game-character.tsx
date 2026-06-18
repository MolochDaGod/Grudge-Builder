/**
 * /game/character — Character Hub
 *
 * The post-creation landing page. Shows the player's active character
 * loaded from the Grudge backend (DB-connected, cNFT minted).
 * Entry points: after create-character flow, or direct navigation.
 * Redirects to /create-character if no active character exists.
 */
import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sword, Shield, Gem, Play, User, Backpack, TrendingUp, MapPin,
  Hammer, BookOpen, ChevronRight, Loader2, Check, AlertTriangle,
  ImagePlus, Sparkles, RefreshCw,
} from "lucide-react";
import { characterAPI } from "@/lib/api";
import { RACES, CLASSES, FACTION_COLORS, type RaceDef, type ClassDef } from "@/lib/gameData";
import { calculateDerivedStats, calculateCombatPower, getBuildRating } from "@shared/statCalculator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ThreeScene, { type ThreeSceneHandle } from "@/components/ThreeScene";
import CharacterModel3D from "@/components/CharacterModel3D";
import { CLASS_WEAPON_MAP, type AnimState3D } from "@/lib/modelManifest";
import { RACE_PORTRAITS, CLASS_HERO_IMAGES } from "@/lib/artAssets";
import type { Character } from "@/lib/characterManager";

// ── Faction theme colors ────────────────────────────────────────────
const FACTION_THEMES: Record<string, { border: string; glow: string; bg: string; badge: string }> = {
  Crusade: { border: "border-blue-500/40", glow: "shadow-blue-500/20", bg: "from-blue-900/20", badge: "bg-blue-900/40 text-blue-300 border-blue-700" },
  Legion:  { border: "border-red-500/40",  glow: "shadow-red-500/20",  bg: "from-red-900/20",  badge: "bg-red-900/40 text-red-300 border-red-700" },
  Fabled:  { border: "border-green-500/40", glow: "shadow-green-500/20", bg: "from-green-900/20", badge: "bg-green-900/40 text-green-300 border-green-700" },
};

const CLASS_EMOJI: Record<string, string> = {
  warrior: "🗡️", mage: "🔮", ranger: "🏹", worg: "🐺",
};

// ── Quick nav items ─────────────────────────────────────────────────
interface NavItem { label: string; path: string; icon: React.ReactNode; desc: string; accent: string }

const NAV_ITEMS: NavItem[] = [
  { label: "Enter World", path: "/play", icon: <Play className="w-5 h-5" />, desc: "Join the 3D world", accent: "from-amber-500 to-amber-700" },
  { label: "Character Sheet", path: "/character", icon: <User className="w-5 h-5" />, desc: "Full stats & equipment", accent: "from-blue-500 to-blue-700" },
  { label: "Skill Tree", path: "/skill-tree", icon: <TrendingUp className="w-5 h-5" />, desc: "Class abilities", accent: "from-purple-500 to-purple-700" },
  { label: "Arsenal", path: "/arsenal", icon: <Sword className="w-5 h-5" />, desc: "Weapons & armor", accent: "from-red-500 to-red-700" },
  { label: "Crafting", path: "/crafting", icon: <Hammer className="w-5 h-5" />, desc: "Forge gear & items", accent: "from-orange-500 to-orange-700" },
  { label: "Professions", path: "/professions", icon: <Backpack className="w-5 h-5" />, desc: "Gathering & trade", accent: "from-green-500 to-green-700" },
  { label: "Hero Codex", path: "/hero-codex", icon: <BookOpen className="w-5 h-5" />, desc: "Lore & bestiary", accent: "from-cyan-500 to-cyan-700" },
  { label: "World Map", path: "/world-map", icon: <MapPin className="w-5 h-5" />, desc: "Explore Aethermoor", accent: "from-indigo-500 to-indigo-700" },
];

// ── Component ───────────────────────────────────────────────────────

export default function GameCharacterPage() {
  const [, setLocation] = useLocation();
  const threeSceneRef = useRef<ThreeSceneHandle | null>(null);
  const [anim3D, setAnim3D] = useState<AnimState3D>("idle");

  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nftStatus, setNftStatus] = useState<{ checked: boolean; hasMint: boolean; mintAddress?: string }>({ checked: false, hasMint: false });

  const race = useMemo(() => character ? RACES.find(r => r.id === character.raceId) : null, [character]);
  const cls = useMemo(() => character ? CLASSES.find(c => c.id === character.classId) : null, [character]);
  const faction = race?.faction || "Crusade";
  const theme = FACTION_THEMES[faction] || FACTION_THEMES.Crusade;

  // Derived stats
  const derived = useMemo(() => {
    if (!character) return null;
    try {
      return calculateDerivedStats(
        character.raceId,
        character.classId,
        character.attributes as Record<string, number>,
        character.level,
      );
    } catch { return null; }
  }, [character]);

  const combatPower = useMemo(() => {
    if (!derived) return 0;
    try { return calculateCombatPower(derived); }
    catch { return 0; }
  }, [derived]);

  // ── Load character ──────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const grudgeId = localStorage.getItem("grudge_account_id") || "guest";
        const activeId =
          localStorage.getItem(`gruda_active_character_${grudgeId}`) ||
          localStorage.getItem("grudge_active_character") ||
          localStorage.getItem("gruda_active_character_guest");

        if (!activeId) {
          setLocation("/create-character");
          return;
        }

        const char = await characterAPI.get(activeId);
        setCharacter(char);

        // Check cNFT status
        characterAPI.getNFTStatus(char.id).then(result => {
          setNftStatus({ checked: true, hasMint: result.hasMint, mintAddress: result.mintAddress });
        });
      } catch (err: any) {
        setError(err.message || "Failed to load character");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading / Error states ──────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-stone-500 text-sm tracking-wider font-cinzel">Loading character...</p>
        </div>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <p className="text-stone-300 mb-2">{error || "No character found"}</p>
          <Button onClick={() => setLocation("/create-character")} className="bg-amber-600 hover:bg-amber-500">
            Create Character
          </Button>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────
  const model3d = (character as any).model3d || {};
  const avatarUrl = (character as any).avatarUrl;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-[#05060c] to-stone-950 text-stone-100 overflow-x-hidden">
      {/* Background art */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage: `url('${CLASS_HERO_IMAGES[character.classId] || ""}')`,
            filter: "saturate(1.2) brightness(0.3)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05060c] via-[#05060c]/70 to-transparent" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-stone-500 text-xs tracking-widest uppercase mb-1">Character Hub</p>
            <h1 className="text-3xl font-bold tracking-wider font-cinzel bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              {character.name}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-stone-400" onClick={() => setLocation("/home")}>
              ← Home
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-b from-amber-500 to-amber-700 text-stone-900 font-cinzel font-bold"
              onClick={() => setLocation("/play")}
            >
              <Play className="w-4 h-4 mr-1" /> Enter World
            </Button>
          </div>
        </div>

        {/* Main grid: Character card + Quick nav */}
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
          {/* ── Left: Character Card ──────────────────────────────── */}
          <div className={cn("rounded-2xl border backdrop-blur-md overflow-hidden", theme.border)}>
            {/* 3D Model Preview */}
            <div className="relative" style={{ height: 320 }}>
              <ThreeScene
                ref={threeSceneRef}
                className="w-full h-full"
                cameraMode="orbit"
                cameraDistance={4}
                cameraHeight={2.2}
                orbitSpeed={12}
                bgColor="#08090f"
              />
              <CharacterModel3D
                sceneRef={threeSceneRef}
                raceId={character.raceId}
                classId={character.classId}
                animation={anim3D}
                onAnimationComplete={() => setAnim3D("idle")}
              />
              {/* Level badge */}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg border border-stone-700">
                <span className="font-cinzel text-amber-400 text-sm font-bold">Lv {character.level}</span>
              </div>
              {/* Faction badge */}
              <div className="absolute top-3 right-3">
                <Badge className={cn("border text-xs", theme.badge)}>{faction}</Badge>
              </div>
            </div>

            {/* Anim buttons */}
            <div className="flex gap-1 flex-wrap px-4 py-2 bg-stone-900/50 border-t border-stone-800 justify-center">
              {["idle", "run", "attack", "hit", "die"].map(state => (
                <button
                  key={state}
                  onClick={() => setAnim3D(state as AnimState3D)}
                  className={cn(
                    "text-[9px] px-2 py-0.5 rounded border font-bold uppercase transition-colors",
                    anim3D === state
                      ? "bg-amber-500 text-stone-900 border-amber-500"
                      : "bg-stone-900/60 text-stone-500 border-stone-700 hover:border-amber-600/50"
                  )}
                >
                  {state}
                </button>
              ))}
            </div>

            {/* Character info */}
            <div className="p-4 space-y-3">
              {/* Name + class */}
              <div className="flex items-center gap-3">
                {avatarUrl && (
                  <img src={avatarUrl} alt={character.name} className="w-14 h-14 rounded-xl border border-stone-700 object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="font-cinzel text-xl font-bold tracking-wider truncate">{character.name}</h2>
                  <p className="text-stone-400 text-sm">
                    <span>{CLASS_EMOJI[character.classId] || "⚔"}</span>{" "}
                    {race?.name} {cls?.name}
                  </p>
                </div>
              </div>

              {/* Combat power */}
              {combatPower > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-stone-800/50 border border-stone-700">
                  <Sword className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-stone-400">Combat Power</span>
                  <span className="ml-auto font-cinzel font-bold text-amber-400">{combatPower.toLocaleString()}</span>
                </div>
              )}

              {/* Key stats */}
              {derived && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "HP", value: derived.maxHealth, color: "text-red-400" },
                    { label: "Mana", value: derived.maxMana, color: "text-blue-400" },
                    { label: "Stamina", value: derived.maxStamina, color: "text-yellow-400" },
                    { label: "Phys DMG", value: derived.physDmg, color: "text-orange-400" },
                    { label: "Mag DMG", value: derived.magDmg, color: "text-purple-400" },
                    { label: "Defense", value: derived.physDef, color: "text-green-400" },
                  ].map(s => (
                    <div key={s.label} className="text-center p-1.5 rounded-lg bg-stone-800/40 border border-stone-800">
                      <div className={cn("text-sm font-bold", s.color)}>{Math.round(s.value)}</div>
                      <div className="text-[9px] text-stone-500 uppercase tracking-wider">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* cNFT status */}
              <div className={cn(
                "flex items-center gap-2 p-2 rounded-lg border",
                nftStatus.hasMint
                  ? "bg-green-900/20 border-green-800"
                  : nftStatus.checked
                    ? "bg-stone-800/50 border-stone-700"
                    : "bg-stone-800/30 border-stone-800"
              )}>
                <Gem className={cn("w-4 h-4", nftStatus.hasMint ? "text-green-400" : "text-stone-500")} />
                <span className="text-xs flex-1">
                  {!nftStatus.checked ? (
                    <span className="text-stone-500">Checking cNFT status...</span>
                  ) : nftStatus.hasMint ? (
                    <span className="text-green-400">
                      cNFT Minted {nftStatus.mintAddress && <span className="text-green-600">• {nftStatus.mintAddress.slice(0, 8)}...</span>}
                    </span>
                  ) : (
                    <span className="text-stone-400">No cNFT — mint from Character Sheet</span>
                  )}
                </span>
                {nftStatus.hasMint && <Check className="w-3.5 h-3.5 text-green-500" />}
              </div>

              {/* Wallet / Account link */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-stone-400 text-xs hover:text-white"
                onClick={() => setLocation("/account")}
              >
                <User className="w-3 h-3 mr-1.5" /> Account & Wallet
                <ChevronRight className="w-3 h-3 ml-auto" />
              </Button>
            </div>
          </div>

          {/* ── Right: Navigation Grid ────────────────────────────── */}
          <div className="space-y-4">
            {/* Enter World — hero action */}
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setLocation("/play")}
              className={cn(
                "w-full p-5 rounded-2xl border text-left overflow-hidden relative backdrop-blur-md transition-all",
                "border-amber-500/40 shadow-xl shadow-amber-500/10 hover:shadow-amber-500/20"
              )}
            >
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{
                  backgroundImage: `url('${RACE_PORTRAITS[character.raceId] || ""}')`,
                  filter: "brightness(0.5)",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-amber-900/40 to-transparent" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 flex items-center justify-center text-stone-900">
                  <Play className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <h3 className="font-cinzel text-xl font-bold tracking-wider text-amber-400">Enter the World</h3>
                  <p className="text-stone-400 text-sm">Join Aethermoor as {character.name} — {race?.name} {cls?.name}</p>
                </div>
                <ChevronRight className="w-6 h-6 text-amber-500" />
              </div>
            </motion.button>

            {/* Nav grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {NAV_ITEMS.slice(1).map((item, i) => (
                <motion.button
                  key={item.path}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setLocation(item.path)}
                  className="p-4 rounded-xl border border-stone-800 bg-stone-900/50 backdrop-blur-sm text-left hover:border-stone-600 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-b flex items-center justify-center text-white", item.accent)}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-stone-200 group-hover:text-white transition-colors">{item.label}</h3>
                      <p className="text-xs text-stone-500">{item.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-600 group-hover:text-stone-400 transition-colors" />
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Character switch / create new */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-stone-700 text-stone-400 hover:text-white"
                onClick={() => setLocation("/character-gallery")}
              >
                <RefreshCw className="w-3 h-3 mr-1.5" /> Switch Character
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-stone-700 text-stone-400 hover:text-white"
                onClick={() => setLocation("/create-character")}
              >
                <Sparkles className="w-3 h-3 mr-1.5" /> New Character
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
