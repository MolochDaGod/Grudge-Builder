import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { COMBAT_BACKGROUNDS } from "@/lib/artAssets";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Layers,
  Settings,
  Move,
  RotateCw,
  Maximize2,
  Droplet,
  Sparkles,
  GripVertical,
  ChevronRight,
  ChevronDown,
  Sword,
  Wand2,
  Shield,
  Crosshair,
  Zap,
  Users,
  Save,
  FolderOpen,
  RefreshCw,
  Bug,
  Monitor,
  Film,
  ImageIcon
} from "lucide-react";
import { CLASS_SKILL_TREES, type ClassSkillTree, type ClassSkillChoice } from "@shared/definitions/classSkillTrees";
import { SPELL_ANIMATIONS, type SpellAnimation } from "@shared/definitions/spellAnimations";
import {
  EFFECT_PRESETS, 
  WEAPON_CATEGORIES,
  type AdminAbility,
  type AnimationTrack,
  type TimelineKeyframe,
  type EffectPresetType,
  type EditorState,
  createDefaultTrack,
  createDefaultKeyframe,
  interpolateKeyframes
} from "@shared/definitions/animationEditor";
import { assetUrl } from "@/lib/assetConfig";

const CLASS_ICONS: Record<string, React.ReactNode> = {
  warrior: <Sword className="w-4 h-4" />,
  mage: <Wand2 className="w-4 h-4" />,
  ranger: <Crosshair className="w-4 h-4" />,
  cleric: <Shield className="w-4 h-4" />
};

type RenderMode = "canvas" | "gif" | "frames" | "debug";

const RENDER_MODES: { id: RenderMode; name: string; icon: React.ReactNode; description: string }[] = [
  { id: "canvas", name: "Canvas", icon: <Monitor className="w-4 h-4" />, description: "Real-time canvas animation" },
  { id: "gif", name: "GIF", icon: <Film className="w-4 h-4" />, description: "Animated GIF playback" },
  { id: "frames", name: "Frames", icon: <ImageIcon className="w-4 h-4" />, description: "Frame-by-frame scrubbing" },
  { id: "debug", name: "Debug", icon: <Bug className="w-4 h-4" />, description: "Debug mode with diagnostics" }
];

function AnimatedSpellPreview({ 
  spell, 
  size = 48,
  autoPlay = true
}: { 
  spell: SpellAnimation; 
  size?: number;
  autoPlay?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      setHasError(false);
    };
    img.onerror = () => {
      setHasError(true);
      setImageLoaded(false);
    };
    img.src = spell.basePath;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [spell.basePath]);
  
  useEffect(() => {
    if (!imageLoaded || !autoPlay || !imageRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const img = imageRef.current;
    const frameWidth = spell.frameWidth || img.width / spell.frameCount;
    const frameHeight = spell.frameHeight || img.height;
    const fps = spell.fps || 12;
    const interval = 1000 / fps;
    
    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, size, size);
      const sx = frame * frameWidth;
      const sy = 0;
      ctx.drawImage(img, sx, sy, frameWidth, frameHeight, 0, 0, size, size);
      frame = (frame + 1) % spell.frameCount;
      setCurrentFrame(frame);
    };
    
    animate();
    const timer = setInterval(animate, interval);
    
    return () => clearInterval(timer);
  }, [imageLoaded, autoPlay, spell, size]);
  
  if (hasError) {
    return (
      <div 
        className="bg-slate-700 rounded flex items-center justify-center text-slate-400"
        style={{ width: size, height: size }}
      >
        <Sparkles className="w-4 h-4" />
      </div>
    );
  }
  
  return (
    <canvas 
      ref={canvasRef} 
      width={size} 
      height={size}
      className="rounded bg-slate-900/50"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

interface SavedAnimation {
  id: string;
  name: string;
  abilityId: string | null;
  tracks: AnimationTrack[];
  duration: number;
  background: string;
  createdAt: number;
  updatedAt: number;
}

const ANIMATION_STORAGE_KEY = "grudge_combat_animations";

const UNIT_ATTACKS = [
  { unit: "Archer", folder: "Archer", attacks: ["Attack01", "Attack02"], type: "hero" },
  { unit: "Knight", folder: "Knight", attacks: ["Attack01", "Attack02", "Attack03"], type: "hero" },
  { unit: "Armored Axeman", folder: "Armored Axeman", attacks: ["Attack01", "Attack02", "Attack03"], type: "hero" },
  { unit: "Armored Skeleton", folder: "Armored Skeleton", attacks: ["Attack01", "Attack02"], type: "enemy" },
  { unit: "Greatsword Skeleton", folder: "Greatsword Skeleton", attacks: ["Attack01", "Attack02", "Attack03"], type: "enemy" },
  { unit: "Armored Orc", folder: "Armored Orc", attacks: ["Attack01", "Attack02", "Attack03"], type: "enemy" },
  { unit: "Elite Orc", folder: "Elite Orc", attacks: ["Attack01", "Attack02", "Attack03"], type: "enemy" },
  { unit: "Wizard", folder: "Wizard", attacks: ["Attack01", "Attack02"], type: "hero" },
  { unit: "Fire Wizard", folder: "Fire Wizard", attacks: ["Attack01", "Attack02"], type: "enemy" },
  { unit: "Necromancer", folder: "Necromancer", attacks: ["Attack01", "Attack02"], type: "enemy" },
  { unit: "Fire Knight", folder: "Fire Knight", attacks: ["Attack01", "Attack02", "Attack03"], type: "boss" },
  { unit: "Berserker", folder: "Berserker", attacks: ["Attack01", "Attack02", "Attack03"], type: "hero" },
  { unit: "Goblin", folder: "Goblin", attacks: ["Attack01"], type: "enemy" },
  { unit: "Orc", folder: "Orc", attacks: ["Attack01", "Attack02"], type: "enemy" },
  { unit: "Skeleton", folder: "Skeleton", attacks: ["Attack01"], type: "enemy" },
  { unit: "Swordsman", folder: "Swordsman", attacks: ["Attack01", "Attack02"], type: "hero" }
];

function SpellBookSidebar({
  selectedAbility,
  onSelectAbility,
  onAddSprite
}: {
  selectedAbility: AdminAbility | null;
  onSelectAbility: (ability: AdminAbility) => void;
  onAddSprite: (spritePath: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"classes" | "weapons" | "magic" | "units">("classes");
  const [expandedClass, setExpandedClass] = useState<string>("warrior");
  const [expandedTier, setExpandedTier] = useState<number>(0);
  const [expandedWeapon, setExpandedWeapon] = useState<string>("sword");
  const [expandedUnit, setExpandedUnit] = useState<string>("");
  const [unitFilter, setUnitFilter] = useState<"all" | "hero" | "enemy" | "boss">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSpells = Object.values(SPELL_ANIMATIONS).filter(spell =>
    spell.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    spell.element.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredUnits = UNIT_ATTACKS.filter(u => {
    const matchesSearch = u.unit.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = unitFilter === "all" || u.type === unitFilter;
    return matchesSearch && matchesFilter;
  });

  const handleDragStart = (e: React.DragEvent, spritePath: string) => {
    e.dataTransfer.setData("sprite", spritePath);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="w-64 min-w-[180px] max-w-80 bg-slate-900 border-r border-slate-700 flex flex-col h-full" data-testid="spellbook-sidebar">
      <div className="p-2 border-b border-slate-700">
        <h2 className="text-base font-bold text-amber-400 mb-2 truncate">Spell Book</h2>
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-800 border-slate-600 h-8 text-sm"
          data-testid="spellbook-search"
        />
      </div>
      
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
        <div className="flex gap-1 p-2 bg-slate-850">
          <button
            onClick={() => setActiveTab("classes")}
            className={`flex-1 relative overflow-hidden rounded transition-all ${activeTab === "classes" ? "ring-2 ring-amber-400 shadow-lg" : "opacity-80 hover:opacity-100"}`}
            data-testid="tab-classes"
          >
            <img src={assetUrl("/sprites/ui/wood_dark.png")} alt="" className="absolute inset-0 w-full h-full" style={{ objectFit: 'fill' }} />
            <div className="relative z-10 flex items-center justify-center gap-1.5 py-2.5 px-2">
              <Users className="w-4 h-4 text-amber-100 flex-shrink-0" />
              <span className="text-xs font-medium text-amber-100 truncate hidden sm:inline">Classes</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("weapons")}
            className={`flex-1 relative overflow-hidden rounded transition-all ${activeTab === "weapons" ? "ring-2 ring-amber-400 shadow-lg" : "opacity-80 hover:opacity-100"}`}
            data-testid="tab-weapons"
          >
            <img src={assetUrl("/sprites/ui/wood_light.png")} alt="" className="absolute inset-0 w-full h-full" style={{ objectFit: 'fill' }} />
            <div className="relative z-10 flex items-center justify-center gap-1.5 py-2.5 px-2">
              <Sword className="w-4 h-4 text-amber-900 flex-shrink-0" />
              <span className="text-xs font-medium text-amber-900 truncate hidden sm:inline">Weapons</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("magic")}
            className={`flex-1 relative overflow-hidden rounded transition-all ${activeTab === "magic" ? "ring-2 ring-amber-400 shadow-lg" : "opacity-80 hover:opacity-100"}`}
            data-testid="tab-magic"
          >
            <img src={assetUrl("/sprites/ui/wood_medium.png")} alt="" className="absolute inset-0 w-full h-full" style={{ objectFit: 'fill' }} />
            <div className="relative z-10 flex items-center justify-center gap-1.5 py-2.5 px-2">
              <Sparkles className="w-4 h-4 text-amber-100 flex-shrink-0" />
              <span className="text-xs font-medium text-amber-100 truncate hidden sm:inline">Magic</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("units")}
            className={`flex-1 relative overflow-hidden rounded transition-all ${activeTab === "units" ? "ring-2 ring-amber-400 shadow-lg" : "opacity-80 hover:opacity-100"}`}
            data-testid="tab-units"
          >
            <img src={assetUrl("/sprites/ui/wood_dark.png")} alt="" className="absolute inset-0 w-full h-full" style={{ objectFit: 'fill' }} />
            <div className="relative z-10 flex items-center justify-center gap-1.5 py-2.5 px-2">
              <Crosshair className="w-4 h-4 text-amber-100 flex-shrink-0" />
              <span className="text-xs font-medium text-amber-100 truncate hidden sm:inline">Units</span>
            </div>
          </button>
        </div>
        
        <ScrollArea className="flex-1">
          <TabsContent value="classes" className="m-0 p-2">
            {Object.entries(CLASS_SKILL_TREES).map(([classId, tree]) => (
              <div key={classId} className="mb-2">
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-2 ${expandedClass === classId ? "bg-slate-700" : ""}`}
                  onClick={() => setExpandedClass(expandedClass === classId ? "" : classId)}
                  data-testid={`class-${classId}`}
                >
                  {expandedClass === classId ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  {CLASS_ICONS[classId] || <Sword className="w-4 h-4" />}
                  <span className="capitalize">{tree.className}</span>
                </Button>
                
                {expandedClass === classId && (
                  <div className="ml-4 mt-1 space-y-1">
                    <div 
                      className="p-2 rounded bg-amber-900/30 border border-amber-600/50 cursor-pointer hover:bg-amber-900/50"
                      draggable
                      onDragStart={(e) => handleDragStart(e, tree.specialAbility.icon)}
                      data-testid={`ability-${tree.specialAbility.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-medium text-amber-300">{tree.specialAbility.name}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{tree.specialAbility.description}</p>
                    </div>
                    
                    {tree.tiers.map((tier, tierIdx) => (
                      <div key={tier.level} className="mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs"
                          onClick={() => setExpandedTier(expandedTier === tierIdx ? -1 : tierIdx)}
                        >
                          {expandedTier === tierIdx ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          Lvl {tier.level}: {tier.tierName}
                        </Button>
                        
                        {expandedTier === tierIdx && (
                          <div className="ml-4 space-y-1 mt-1">
                            {tier.choices.map((choice) => (
                              <div
                                key={choice.id}
                                className="p-2 rounded bg-slate-800 border border-slate-600 cursor-pointer hover:border-amber-500 transition-colors"
                                draggable
                                onDragStart={(e) => handleDragStart(e, choice.icon)}
                                onClick={() => onSelectAbility({
                                  id: choice.id,
                                  name: choice.name,
                                  description: choice.description,
                                  icon: choice.icon,
                                  sourceType: "class",
                                  sourceId: classId,
                                  classId,
                                  tracks: [],
                                  duration: 2000,
                                  version: 1,
                                  lastModified: Date.now()
                                })}
                                data-testid={`ability-${choice.id}`}
                              >
                                <div className="flex items-center gap-2">
                                  <Badge variant={choice.effectType === "active" ? "default" : "secondary"} className="text-xs">
                                    {choice.effectType}
                                  </Badge>
                                  <span className="text-sm">{choice.name}</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{choice.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="weapons" className="m-0 p-2">
            {WEAPON_CATEGORIES.map((weapon) => (
              <div key={weapon.id} className="mb-2">
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-2 ${expandedWeapon === weapon.id ? "bg-slate-700" : ""}`}
                  onClick={() => setExpandedWeapon(expandedWeapon === weapon.id ? "" : weapon.id)}
                  data-testid={`weapon-${weapon.id}`}
                >
                  {expandedWeapon === weapon.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <Sword className="w-4 h-4" />
                  <span>{weapon.name}</span>
                </Button>
                
                {expandedWeapon === weapon.id && (
                  <div className="ml-4 mt-1 space-y-1">
                    <div
                      className="p-2 rounded bg-slate-800 border border-slate-600 cursor-pointer hover:border-amber-500"
                      draggable
                      onDragStart={(e) => handleDragStart(e, weapon.icon)}
                      data-testid={`weapon-skill-${weapon.id}-basic`}
                    >
                      <span className="text-sm">Basic Attack</span>
                      <p className="text-xs text-slate-400">Standard {weapon.name.slice(0, -1)} swing</p>
                    </div>
                    <div
                      className="p-2 rounded bg-slate-800 border border-slate-600 cursor-pointer hover:border-amber-500"
                      draggable
                      onDragStart={(e) => handleDragStart(e, weapon.icon)}
                      data-testid={`weapon-skill-${weapon.id}-special`}
                    >
                      <span className="text-sm">Power Strike</span>
                      <p className="text-xs text-slate-400">Heavy damage attack</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="magic" className="m-0 p-2">
            <div className="space-y-1">
              {filteredSpells.slice(0, 30).map((spell) => (
                <div
                  key={spell.id}
                  className="p-2 rounded bg-slate-800 border border-slate-600 cursor-pointer hover:border-purple-500 transition-colors"
                  draggable
                  onDragStart={(e) => handleDragStart(e, spell.basePath)}
                  onClick={() => onAddSprite(spell.basePath)}
                  data-testid={`spell-${spell.id}`}
                >
                  <div className="flex items-center gap-2">
                    <AnimatedSpellPreview spell={spell} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge className={`text-xs ${
                          spell.element === "fire" ? "bg-orange-600" :
                          spell.element === "ice" ? "bg-cyan-600" :
                          spell.element === "lightning" ? "bg-yellow-600" :
                          spell.element === "arcane" ? "bg-purple-600" :
                          spell.element === "holy" ? "bg-amber-400 text-black" :
                          spell.element === "shadow" ? "bg-slate-700" :
                          spell.element === "nature" ? "bg-green-600" :
                          "bg-slate-600"
                        }`}>
                          {spell.element}
                        </Badge>
                        <span className="text-sm truncate">{spell.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs">{spell.type}</Badge>
                        <span className="text-xs text-slate-400">{spell.frameCount}f @ {spell.fps || 12}fps</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="units" className="m-0 p-2">
            <div className="flex gap-1 mb-2 flex-wrap">
              {(["all", "hero", "enemy", "boss"] as const).map(filter => (
                <Button
                  key={filter}
                  variant={unitFilter === filter ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={() => setUnitFilter(filter)}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Button>
              ))}
            </div>
            <div className="space-y-1">
              {filteredUnits.map((unitData) => (
                <div key={unitData.unit} className="mb-2">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start gap-2 text-sm ${expandedUnit === unitData.unit ? "bg-slate-700" : ""}`}
                    onClick={() => setExpandedUnit(expandedUnit === unitData.unit ? "" : unitData.unit)}
                    data-testid={`unit-${unitData.unit.toLowerCase().replace(/ /g, "-")}`}
                  >
                    {expandedUnit === unitData.unit ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <Badge className={`text-xs ${
                      unitData.type === "hero" ? "bg-green-600" :
                      unitData.type === "enemy" ? "bg-red-600" :
                      "bg-purple-600"
                    }`}>{unitData.type}</Badge>
                    <span className="truncate">{unitData.unit}</span>
                  </Button>
                  
                  {expandedUnit === unitData.unit && (
                    <div className="ml-4 mt-1 space-y-1">
                      {unitData.attacks.map(attack => {
                        const spritePath = assetUrl(`/sprites/GrudgeRPGAssets2d/Characters(100x100)/${encodeURIComponent(unitData.folder)}/${encodeURIComponent(unitData.folder)} with shadows/${encodeURIComponent(unitData.folder)}-${attack}.png`);
                        return (
                          <div
                            key={attack}
                            className="p-2 rounded bg-slate-800 border border-slate-600 cursor-pointer hover:border-amber-500 flex items-center gap-2"
                            draggable
                            onDragStart={(e) => handleDragStart(e, spritePath)}
                            onClick={() => onAddSprite(spritePath)}
                            data-testid={`attack-${unitData.unit.toLowerCase().replace(/ /g, "-")}-${attack.toLowerCase()}`}
                          >
                            <div className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center">
                              <Sword className="w-4 h-4 text-amber-400" />
                            </div>
                            <div>
                              <span className="text-sm">{attack}</span>
                              <p className="text-xs text-slate-400">Sprite sheet</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function TimelineEditor({
  tracks,
  duration,
  playheadTime,
  selectedTrackId,
  selectedKeyframeId,
  onPlayheadChange,
  onSelectTrack,
  onSelectKeyframe,
  onUpdateTrack,
  onDeleteTrack,
  onAddKeyframe,
  onUpdateKeyframe,
  onDeleteKeyframe
}: {
  tracks: AnimationTrack[];
  duration: number;
  playheadTime: number;
  selectedTrackId: string | null;
  selectedKeyframeId: string | null;
  onPlayheadChange: (time: number) => void;
  onSelectTrack: (id: string | null) => void;
  onSelectKeyframe: (id: string | null) => void;
  onUpdateTrack: (id: string, updates: Partial<AnimationTrack>) => void;
  onDeleteTrack: (id: string) => void;
  onAddKeyframe: (trackId: string, time: number) => void;
  onUpdateKeyframe: (trackId: string, keyframeId: string, updates: Partial<TimelineKeyframe>) => void;
  onDeleteKeyframe: (trackId: string, keyframeId: string) => void;
}) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [draggingKeyframe, setDraggingKeyframe] = useState<{trackId: string; keyframeId: string} | null>(null);

  const timeToX = (time: number) => (time / duration) * 100;
  const xToTime = (x: number, containerWidth: number) => Math.max(0, Math.min(duration, (x / containerWidth) * duration));

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = xToTime(x, rect.width);
    onPlayheadChange(Math.round(time));
  };

  const handleKeyframeDrag = (e: React.MouseEvent, trackId: string, keyframeId: string) => {
    e.stopPropagation();
    setDraggingKeyframe({ trackId, keyframeId });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = xToTime(x, rect.width);

    if (isDraggingPlayhead) {
      onPlayheadChange(Math.round(time));
    } else if (draggingKeyframe) {
      onUpdateKeyframe(draggingKeyframe.trackId, draggingKeyframe.keyframeId, { time: Math.round(time) });
    }
  }, [isDraggingPlayhead, draggingKeyframe, duration, onPlayheadChange, onUpdateKeyframe]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingPlayhead(false);
    setDraggingKeyframe(null);
  }, []);

  useEffect(() => {
    if (isDraggingPlayhead || draggingKeyframe) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDraggingPlayhead, draggingKeyframe, handleMouseMove, handleMouseUp]);

  const handleTrackDoubleClick = (trackId: string, e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = xToTime(x, rect.width);
    onAddKeyframe(trackId, Math.round(time));
  };

  return (
    <div className="h-48 bg-slate-900 border-t border-slate-700 flex flex-col" data-testid="timeline-editor">
      <div className="flex items-center justify-between p-2 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Time:</span>
          <span className="text-sm font-mono text-amber-400">{playheadTime}ms</span>
          <span className="text-xs text-slate-400">/ {duration}ms</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-6 px-2">
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="w-48 bg-slate-850 border-r border-slate-700 overflow-y-auto">
          {tracks.map((track) => (
            <div
              key={track.id}
              className={`flex items-center gap-1 p-2 border-b border-slate-700 cursor-pointer ${
                selectedTrackId === track.id ? "bg-slate-700" : "hover:bg-slate-800"
              }`}
              onClick={() => onSelectTrack(track.id)}
              data-testid={`track-${track.id}`}
            >
              <GripVertical className="w-3 h-3 text-slate-500 cursor-move" />
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateTrack(track.id, { visible: !track.visible });
                }}
              >
                {track.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateTrack(track.id, { locked: !track.locked });
                }}
              >
                {track.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
              </Button>
              <span className="text-xs truncate flex-1">{track.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-red-400 hover:text-red-300"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTrack(track.id);
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          {tracks.length === 0 && (
            <div className="p-4 text-center text-slate-500 text-sm">
              Drag sprites here to add tracks
            </div>
          )}
        </div>
        
        <div 
          ref={timelineRef}
          className="flex-1 relative overflow-x-auto cursor-crosshair"
          onClick={handleTimelineClick}
        >
          <div className="absolute top-0 left-0 right-0 h-5 bg-slate-800 border-b border-slate-600 flex">
            {Array.from({ length: Math.ceil(duration / 100) + 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute text-xs text-slate-500 transform -translate-x-1/2"
                style={{ left: `${(i * 100 / duration) * 100}%` }}
              >
                {i * 100}
              </div>
            ))}
          </div>
          
          <div className="absolute top-5 bottom-0 left-0 right-0">
            {tracks.map((track, idx) => (
              <div
                key={track.id}
                className={`absolute left-0 right-0 h-8 border-b border-slate-700 ${
                  selectedTrackId === track.id ? "bg-slate-700/30" : ""
                }`}
                style={{ top: idx * 32 }}
                onDoubleClick={(e) => handleTrackDoubleClick(track.id, e)}
              >
                <div
                  className="absolute h-6 top-1 rounded bg-slate-600/50"
                  style={{
                    left: `${timeToX(track.startTime)}%`,
                    width: `${timeToX(track.endTime - track.startTime)}%`
                  }}
                />
                
                {track.keyframes.map((kf) => (
                  <div
                    key={kf.id}
                    className={`absolute top-1 w-3 h-6 rounded cursor-ew-resize transform -translate-x-1/2 ${
                      selectedKeyframeId === kf.id 
                        ? "bg-amber-400 border-2 border-amber-600" 
                        : "bg-blue-500 hover:bg-blue-400"
                    }`}
                    style={{ left: `${timeToX(kf.time)}%` }}
                    onMouseDown={(e) => handleKeyframeDrag(e, track.id, kf.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectKeyframe(kf.id);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onDeleteKeyframe(track.id, kf.id);
                    }}
                    data-testid={`keyframe-${kf.id}`}
                  />
                ))}
              </div>
            ))}
          </div>
          
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 cursor-ew-resize"
            style={{ left: `${timeToX(playheadTime)}%` }}
            onMouseDown={() => setIsDraggingPlayhead(true)}
          >
            <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-500 rotate-45" />
          </div>
        </div>
      </div>
    </div>
  );
}

function InspectorPanel({
  selectedTrack,
  selectedKeyframe,
  onUpdateTrack,
  onUpdateKeyframe,
  onApplyEffect
}: {
  selectedTrack: AnimationTrack | null;
  selectedKeyframe: TimelineKeyframe | null;
  onUpdateTrack: (updates: Partial<AnimationTrack>) => void;
  onUpdateKeyframe: (updates: Partial<TimelineKeyframe>) => void;
  onApplyEffect: (effect: EffectPresetType) => void;
}) {
  if (!selectedTrack && !selectedKeyframe) {
    return (
      <div className="w-64 bg-slate-900 border-l border-slate-700 p-4">
        <p className="text-slate-500 text-sm text-center">Select a track or keyframe to edit</p>
      </div>
    );
  }

  return (
    <div className="w-64 bg-slate-900 border-l border-slate-700 overflow-y-auto" data-testid="inspector-panel">
      <div className="p-3 border-b border-slate-700">
        <h3 className="font-semibold text-amber-400 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Inspector
        </h3>
      </div>
      
      {selectedTrack && (
        <div className="p-3 space-y-3">
          <div>
            <Label className="text-xs text-slate-400">Track Name</Label>
            <Input
              value={selectedTrack.name}
              onChange={(e) => onUpdateTrack({ name: e.target.value })}
              className="h-8 bg-slate-800 border-slate-600"
              data-testid="inspector-track-name"
            />
          </div>
          
          <div>
            <Label className="text-xs text-slate-400">Layer</Label>
            <Input
              type="number"
              value={selectedTrack.layer}
              onChange={(e) => onUpdateTrack({ layer: parseInt(e.target.value) || 0 })}
              className="h-8 bg-slate-800 border-slate-600"
              data-testid="inspector-track-layer"
            />
          </div>
          
          <Separator />
          
          <div>
            <Label className="text-xs text-slate-400">Sprite Path</Label>
            <Input
              value={selectedTrack.spritePath}
              onChange={(e) => onUpdateTrack({ spritePath: e.target.value })}
              className="h-8 bg-slate-800 border-slate-600 text-xs"
              data-testid="inspector-sprite-path"
            />
          </div>
        </div>
      )}
      
      {selectedKeyframe && (
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium">Transform</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-slate-400">X</Label>
              <Input
                type="number"
                value={selectedKeyframe.x}
                onChange={(e) => onUpdateKeyframe({ x: parseFloat(e.target.value) || 0 })}
                className="h-7 bg-slate-800 border-slate-600"
                data-testid="inspector-kf-x"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Y</Label>
              <Input
                type="number"
                value={selectedKeyframe.y}
                onChange={(e) => onUpdateKeyframe({ y: parseFloat(e.target.value) || 0 })}
                className="h-7 bg-slate-800 border-slate-600"
                data-testid="inspector-kf-y"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-slate-400" />
            <span className="text-sm">Scale</span>
            <Input
              type="number"
              step="0.1"
              value={selectedKeyframe.scale}
              onChange={(e) => onUpdateKeyframe({ scale: parseFloat(e.target.value) || 1 })}
              className="h-7 w-20 bg-slate-800 border-slate-600 ml-auto"
              data-testid="inspector-kf-scale"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <RotateCw className="w-4 h-4 text-slate-400" />
            <span className="text-sm">Rotation</span>
            <Input
              type="number"
              value={selectedKeyframe.rotation}
              onChange={(e) => onUpdateKeyframe({ rotation: parseFloat(e.target.value) || 0 })}
              className="h-7 w-20 bg-slate-800 border-slate-600 ml-auto"
              data-testid="inspector-kf-rotation"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Droplet className="w-4 h-4 text-slate-400" />
            <span className="text-sm">Opacity</span>
            <Slider
              value={[selectedKeyframe.opacity * 100]}
              onValueChange={([v]) => onUpdateKeyframe({ opacity: v / 100 })}
              max={100}
              step={1}
              className="flex-1"
              data-testid="inspector-kf-opacity"
            />
            <span className="text-xs w-8">{Math.round(selectedKeyframe.opacity * 100)}%</span>
          </div>
          
          <div>
            <Label className="text-xs text-slate-400">Color Tint</Label>
            <Input
              type="color"
              value={selectedKeyframe.colorTint || "#ffffff"}
              onChange={(e) => onUpdateKeyframe({ colorTint: e.target.value })}
              className="h-8 bg-slate-800 border-slate-600 p-1"
              data-testid="inspector-kf-color"
            />
          </div>
          
          <Separator />
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium">Effects</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {Object.values(EFFECT_PRESETS).map((effect) => (
                <Button
                  key={effect.id}
                  variant={selectedKeyframe.effect === effect.id ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onApplyEffect(effect.id)}
                  data-testid={`effect-${effect.id}`}
                >
                  {effect.name}
                </Button>
              ))}
            </div>
            
            {selectedKeyframe.effect && (
              <div className="mt-3 space-y-2">
                <Label className="text-xs text-slate-400">Effect Duration (ms)</Label>
                <Input
                  type="number"
                  value={selectedKeyframe.effectDuration || EFFECT_PRESETS[selectedKeyframe.effect]?.defaultDuration || 500}
                  onChange={(e) => onUpdateKeyframe({ effectDuration: parseInt(e.target.value) || 500 })}
                  min={100}
                  step={50}
                  className="h-8 bg-slate-800 border-slate-600"
                  data-testid="inspector-effect-duration"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CombatStage({
  tracks,
  playheadTime,
  isPlaying,
  onDropSprite,
  selectedTrackId,
  onSelectTrack,
  background,
  onBackgroundChange,
  backgrounds
}: {
  tracks: AnimationTrack[];
  playheadTime: number;
  isPlaying: boolean;
  onDropSprite: (spritePath: string, x: number, y: number) => void;
  selectedTrackId: string | null;
  onSelectTrack: (id: string | null) => void;
  background: string;
  onBackgroundChange: (bg: string) => void;
  backgrounds: { path: string; name: string }[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadedImages, setLoadedImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setBackgroundImage(img);
    img.onerror = () => setBackgroundImage(null);
    img.src = background;
  }, [background]);

  useEffect(() => {
    const loadImages = async () => {
      const images = new Map<string, HTMLImageElement>(loadedImages);
      
      for (const track of tracks) {
        if (!images.has(track.spritePath)) {
          try {
            const img = new Image();
            await new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
              img.src = track.spritePath;
            });
            if (img.complete && img.naturalWidth > 0) {
              images.set(track.spritePath, img);
            }
          } catch (err) {
            console.error(`Failed to load ${track.spritePath}`);
          }
        }
      }
      
      setLoadedImages(images);
    };
    
    loadImages();
  }, [tracks]);

  const applyEffect = useCallback((
    effect: EffectPresetType | undefined,
    effectParams: Record<string, number | string | boolean> | undefined,
    time: number,
    duration: number
  ): { scaleModifier: number; rotationModifier: number; opacityModifier: number } => {
    if (!effect) return { scaleModifier: 1, rotationModifier: 0, opacityModifier: 1 };
    
    const progress = Math.min(1, time / duration);
    const preset = EFFECT_PRESETS[effect];
    
    switch (effect) {
      case "spin": {
        const rotations = (effectParams?.rotations as number) || (preset.params.rotations as number) || 1;
        return { scaleModifier: 1, rotationModifier: progress * 360 * rotations, opacityModifier: 1 };
      }
      case "blink": {
        const frequency = (effectParams?.frequency as number) || (preset.params.frequency as number) || 4;
        const minOpacity = (effectParams?.minOpacity as number) ?? (preset.params.minOpacity as number) ?? 0;
        const blinkPhase = Math.sin(progress * Math.PI * 2 * frequency);
        return { scaleModifier: 1, rotationModifier: 0, opacityModifier: blinkPhase > 0 ? 1 : minOpacity };
      }
      case "fadeIn": {
        return { scaleModifier: 1, rotationModifier: 0, opacityModifier: progress };
      }
      case "fadeOut": {
        return { scaleModifier: 1, rotationModifier: 0, opacityModifier: 1 - progress };
      }
      case "scaleUp": {
        const startScale = (effectParams?.startScale as number) || (preset.params.startScale as number) || 0.5;
        const endScale = (effectParams?.endScale as number) || (preset.params.endScale as number) || 1.5;
        return { scaleModifier: startScale + (endScale - startScale) * progress, rotationModifier: 0, opacityModifier: 1 };
      }
      case "scaleDown": {
        const startScale = (effectParams?.startScale as number) || (preset.params.startScale as number) || 1.5;
        const endScale = (effectParams?.endScale as number) || (preset.params.endScale as number) || 0.5;
        return { scaleModifier: startScale + (endScale - startScale) * progress, rotationModifier: 0, opacityModifier: 1 };
      }
      case "shake": {
        const intensity = (effectParams?.intensity as number) || (preset.params.intensity as number) || 5;
        const shakeOffset = Math.sin(progress * Math.PI * 30) * intensity * (1 - progress);
        return { scaleModifier: 1, rotationModifier: shakeOffset, opacityModifier: 1 };
      }
      case "pulse": {
        const minScale = (effectParams?.minScale as number) || (preset.params.minScale as number) || 0.9;
        const maxScale = (effectParams?.maxScale as number) || (preset.params.maxScale as number) || 1.1;
        const cycles = (effectParams?.cycles as number) || (preset.params.cycles as number) || 2;
        const pulsePhase = Math.sin(progress * Math.PI * 2 * cycles);
        const scale = minScale + (maxScale - minScale) * ((pulsePhase + 1) / 2);
        return { scaleModifier: scale, rotationModifier: 0, opacityModifier: 1 };
      }
      case "flash": {
        const flashOpacity = progress < 0.5 ? 1 : (1 - (progress - 0.5) * 2);
        return { scaleModifier: 1, rotationModifier: 0, opacityModifier: flashOpacity };
      }
      case "bounce": {
        const bounces = (effectParams?.bounces as number) || (preset.params.bounces as number) || 2;
        const bouncePhase = Math.abs(Math.sin(progress * Math.PI * bounces)) * (1 - progress);
        return { scaleModifier: 1 + bouncePhase * 0.2, rotationModifier: 0, opacityModifier: 1 };
      }
      case "pixelDissolve": {
        return { scaleModifier: 1, rotationModifier: 0, opacityModifier: 1 - progress };
      }
      case "colorShift": {
        return { scaleModifier: 1, rotationModifier: 0, opacityModifier: 1 };
      }
      default:
        return { scaleModifier: 1, rotationModifier: 0, opacityModifier: 1 };
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (backgroundImage) {
      ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    const sortedTracks = [...tracks]
      .filter(t => t.visible)
      .sort((a, b) => a.layer - b.layer);
    
    for (const track of sortedTracks) {
      const img = loadedImages.get(track.spritePath);
      const state = interpolateKeyframes(track.keyframes, playheadTime);
      
      const currentKeyframe = track.keyframes.find(kf => {
        if (!kf.effect) return false;
        const effectDur = kf.effectDuration || EFFECT_PRESETS[kf.effect]?.defaultDuration || 500;
        return playheadTime >= kf.time && playheadTime <= kf.time + effectDur;
      });
      
      let effectModifiers = { scaleModifier: 1, rotationModifier: 0, opacityModifier: 1 };
      if (currentKeyframe?.effect) {
        const effectDuration = currentKeyframe.effectDuration || EFFECT_PRESETS[currentKeyframe.effect].defaultDuration;
        const effectTime = playheadTime - currentKeyframe.time;
        effectModifiers = applyEffect(currentKeyframe.effect, currentKeyframe.effectParams, effectTime, effectDuration);
      }
      
      ctx.save();
      
      const centerX = canvas.width / 2 + state.x;
      const centerY = canvas.height / 2 + state.y;
      
      ctx.translate(centerX, centerY);
      ctx.rotate(((state.rotation + effectModifiers.rotationModifier) * Math.PI) / 180);
      ctx.scale(state.scale * effectModifiers.scaleModifier, state.scale * effectModifiers.scaleModifier);
      ctx.globalAlpha = state.opacity * effectModifiers.opacityModifier;
      
      if (img) {
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
      } else {
        ctx.fillStyle = "#ff6b6b";
        ctx.fillRect(-25, -25, 50, 50);
        ctx.fillStyle = "#fff";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("?", 0, 4);
      }
      
      if (selectedTrackId === track.id) {
        ctx.strokeStyle = "#fbbf24";
        const size = img ? { w: img.width, h: img.height } : { w: 50, h: 50 };
        ctx.lineWidth = 2 / (state.scale * effectModifiers.scaleModifier);
        ctx.strokeRect(-size.w / 2 - 2, -size.h / 2 - 2, size.w + 4, size.h + 4);
      }
      
      ctx.restore();
    }
  }, [tracks, playheadTime, loadedImages, selectedTrackId, applyEffect, backgroundImage]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const spritePath = e.dataTransfer.getData("sprite");
    if (spritePath && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = canvasRef.current.width / rect.width;
      const scaleY = canvasRef.current.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX - canvasRef.current.width / 2;
      const y = (e.clientY - rect.top) * scaleY - canvasRef.current.height / 2;
      onDropSprite(spritePath, x, y);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    let clicked = false;
    const sortedTracks = [...tracks].reverse();
    
    for (const track of sortedTracks) {
      const img = loadedImages.get(track.spritePath);
      if (!img || !track.visible) continue;
      
      const state = interpolateKeyframes(track.keyframes, playheadTime);
      const centerX = canvasRef.current.width / 2 + state.x;
      const centerY = canvasRef.current.height / 2 + state.y;
      
      const halfW = (img.width * state.scale) / 2;
      const halfH = (img.height * state.scale) / 2;
      
      if (x >= centerX - halfW && x <= centerX + halfW && y >= centerY - halfH && y <= centerY + halfH) {
        onSelectTrack(track.id);
        clicked = true;
        break;
      }
    }
    
    if (!clicked) {
      onSelectTrack(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex-1 bg-slate-800 flex flex-col" data-testid="combat-stage">
      <div className="flex items-center justify-between p-2 bg-slate-850 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <span className="text-sm">Combat Stage</span>
        </div>
        <Select value={background} onValueChange={onBackgroundChange}>
          <SelectTrigger className="w-40 h-8 bg-slate-700 border-slate-600">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {backgrounds.map((bg) => (
              <SelectItem key={bg.path} value={bg.path}>{bg.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-4 overflow-hidden"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="relative" style={{ backgroundImage: `url(${background})`, backgroundSize: "cover", backgroundPosition: "center" }}>
          <canvas
            ref={canvasRef}
            width={800}
            height={500}
            className="border border-slate-600 rounded cursor-pointer"
            onClick={handleCanvasClick}
            onContextMenu={handleContextMenu}
            data-testid="combat-canvas"
          />
          
          {tracks.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-slate-400">
                <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Drag sprites from the spell book</p>
                <p className="text-sm">or click Magic tab to add animations</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const BACKGROUNDS = COMBAT_BACKGROUNDS.map((bg) => ({ path: bg.path, name: bg.name }));

export default function AdminCombatPage() {
  const { toast } = useToast();
  const [tracks, setTracks] = useState<AnimationTrack[]>([]);
  const [duration, setDuration] = useState(2000);
  const [background, setBackground] = useState(BACKGROUNDS[0].path);
  const [renderMode, setRenderMode] = useState<RenderMode>("canvas");
  const [savedAnimations, setSavedAnimations] = useState<SavedAnimation[]>([]);
  const [currentAnimationId, setCurrentAnimationId] = useState<string | null>(null);
  const [animationName, setAnimationName] = useState("Untitled Animation");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [editorState, setEditorState] = useState<EditorState>({
    selectedAbilityId: null,
    selectedTrackId: null,
    selectedKeyframeId: null,
    playheadTime: 0,
    isPlaying: false,
    zoom: 1,
    showGrid: true,
    snapToGrid: true,
    gridSize: 10
  });
  
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const selectedTrack = tracks.find(t => t.id === editorState.selectedTrackId) || null;
  const selectedKeyframe = selectedTrack?.keyframes.find(k => k.id === editorState.selectedKeyframeId) || null;
  
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ANIMATION_STORAGE_KEY);
      if (saved) {
        setSavedAnimations(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load saved animations:", e);
    }
  }, []);
  
  const handleSaveAnimation = () => {
    const now = Date.now();
    const animId = currentAnimationId || `anim_${now}`;
    
    const animation: SavedAnimation = {
      id: animId,
      name: animationName,
      abilityId: editorState.selectedAbilityId,
      tracks,
      duration,
      background,
      createdAt: savedAnimations.find(a => a.id === animId)?.createdAt || now,
      updatedAt: now
    };
    
    const updated = currentAnimationId 
      ? savedAnimations.map(a => a.id === currentAnimationId ? animation : a)
      : [...savedAnimations, animation];
    
    setSavedAnimations(updated);
    setCurrentAnimationId(animId);
    
    try {
      localStorage.setItem(ANIMATION_STORAGE_KEY, JSON.stringify(updated));
      toast({
        title: "Animation Saved",
        description: `"${animationName}" saved successfully`
      });
    } catch (e) {
      toast({
        title: "Save Failed",
        description: "Could not save to local storage",
        variant: "destructive"
      });
    }
    
    setShowSaveDialog(false);
  };
  
  const handleLoadAnimation = (animation: SavedAnimation) => {
    setTracks(animation.tracks);
    setDuration(animation.duration);
    setBackground(animation.background);
    setAnimationName(animation.name);
    setCurrentAnimationId(animation.id);
    setEditorState(prev => ({
      ...prev,
      selectedAbilityId: animation.abilityId,
      selectedTrackId: null,
      selectedKeyframeId: null,
      playheadTime: 0,
      isPlaying: false
    }));
    setShowLoadDialog(false);
    
    toast({
      title: "Animation Loaded",
      description: `"${animation.name}" loaded`
    });
  };
  
  const handleDeleteAnimation = (animId: string) => {
    const updated = savedAnimations.filter(a => a.id !== animId);
    setSavedAnimations(updated);
    localStorage.setItem(ANIMATION_STORAGE_KEY, JSON.stringify(updated));
    
    if (currentAnimationId === animId) {
      setCurrentAnimationId(null);
      setAnimationName("Untitled Animation");
    }
    
    toast({
      title: "Animation Deleted",
      description: "Animation removed from saved list"
    });
  };
  
  const handleNewAnimation = () => {
    setTracks([]);
    setDuration(2000);
    setBackground(BACKGROUNDS[0].path);
    setAnimationName("Untitled Animation");
    setCurrentAnimationId(null);
    setEditorState(prev => ({
      ...prev,
      selectedAbilityId: null,
      selectedTrackId: null,
      selectedKeyframeId: null,
      playheadTime: 0,
      isPlaying: false
    }));
    
    toast({
      title: "New Animation",
      description: "Canvas cleared"
    });
  };

  useEffect(() => {
    if (editorState.isPlaying) {
      lastTimeRef.current = performance.now();
      
      const animate = (currentTime: number) => {
        const delta = currentTime - lastTimeRef.current;
        lastTimeRef.current = currentTime;
        
        setEditorState(prev => {
          let newTime = prev.playheadTime + delta;
          if (newTime >= duration) {
            newTime = 0;
          }
          return { ...prev, playheadTime: newTime };
        });
        
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animationRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [editorState.isPlaying, duration]);

  const handlePlayPause = () => {
    setEditorState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleReset = () => {
    setEditorState(prev => ({ ...prev, playheadTime: 0, isPlaying: false }));
  };

  const handleSelectAbility = (ability: AdminAbility) => {
    setEditorState(prev => ({ ...prev, selectedAbilityId: ability.id }));
    toast({
      title: "Ability Selected",
      description: `Editing: ${ability.name}`
    });
  };

  const handleAddSprite = (spritePath: string, x = 0, y = 0) => {
    const name = spritePath.split("/").pop()?.replace(/\.[^.]+$/, "") || "Sprite";
    const newTrack = createDefaultTrack(name, spritePath);
    newTrack.keyframes[0].x = x;
    newTrack.keyframes[0].y = y;
    newTrack.keyframes[1].x = x;
    newTrack.keyframes[1].y = y;
    newTrack.endTime = duration;
    newTrack.layer = tracks.length;
    
    setTracks(prev => [...prev, newTrack]);
    setEditorState(prev => ({ ...prev, selectedTrackId: newTrack.id }));
    
    toast({
      title: "Sprite Added",
      description: name
    });
  };

  const handleUpdateTrack = (id: string, updates: Partial<AnimationTrack>) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleDeleteTrack = (id: string) => {
    setTracks(prev => prev.filter(t => t.id !== id));
    if (editorState.selectedTrackId === id) {
      setEditorState(prev => ({ ...prev, selectedTrackId: null, selectedKeyframeId: null }));
    }
  };

  const handleAddKeyframe = (trackId: string, time: number) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;
    
    const interpolated = interpolateKeyframes(track.keyframes, time);
    const newKeyframe = createDefaultKeyframe(time);
    newKeyframe.x = interpolated.x;
    newKeyframe.y = interpolated.y;
    newKeyframe.scale = interpolated.scale;
    newKeyframe.rotation = interpolated.rotation;
    newKeyframe.opacity = interpolated.opacity;
    
    setTracks(prev => prev.map(t => 
      t.id === trackId 
        ? { ...t, keyframes: [...t.keyframes, newKeyframe].sort((a, b) => a.time - b.time) }
        : t
    ));
    
    setEditorState(prev => ({ ...prev, selectedKeyframeId: newKeyframe.id }));
  };

  const handleUpdateKeyframe = (trackId: string, keyframeId: string, updates: Partial<TimelineKeyframe>) => {
    setTracks(prev => prev.map(t => 
      t.id === trackId 
        ? { ...t, keyframes: t.keyframes.map(k => k.id === keyframeId ? { ...k, ...updates } : k) }
        : t
    ));
  };

  const handleDeleteKeyframe = (trackId: string, keyframeId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track || track.keyframes.length <= 2) {
      toast({
        title: "Cannot Delete",
        description: "Track must have at least 2 keyframes",
        variant: "destructive"
      });
      return;
    }
    
    setTracks(prev => prev.map(t => 
      t.id === trackId 
        ? { ...t, keyframes: t.keyframes.filter(k => k.id !== keyframeId) }
        : t
    ));
    
    if (editorState.selectedKeyframeId === keyframeId) {
      setEditorState(prev => ({ ...prev, selectedKeyframeId: null }));
    }
  };

  const handleApplyEffect = (effect: EffectPresetType) => {
    if (!editorState.selectedKeyframeId || !editorState.selectedTrackId) return;
    
    handleUpdateKeyframe(
      editorState.selectedTrackId,
      editorState.selectedKeyframeId,
      { effect, effectParams: { ...EFFECT_PRESETS[effect].params } }
    );
    
    toast({
      title: "Effect Applied",
      description: EFFECT_PRESETS[effect].name
    });
  };

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-slate-950 text-white" data-testid="admin-combat-page">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-amber-400">Combat Editor</h1>
            <Input
              value={animationName}
              onChange={(e) => setAnimationName(e.target.value)}
              className="w-48 h-7 bg-slate-800 border-slate-600 text-sm"
              placeholder="Animation name..."
              data-testid="input-animation-name"
            />
            {currentAnimationId && (
              <Badge variant="outline" className="text-xs text-green-400 border-green-600">
                Saved
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleNewAnimation} data-testid="btn-new">
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Animation</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setShowLoadDialog(true)} data-testid="btn-load">
                  <FolderOpen className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Load Animation ({savedAnimations.length} saved)</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="default" size="sm" onClick={handleSaveAnimation} className="bg-green-600 hover:bg-green-700" data-testid="btn-save">
                  <Save className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save Animation</TooltipContent>
            </Tooltip>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              data-testid="btn-reset"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              variant={editorState.isPlaying ? "destructive" : "default"}
              size="sm"
              onClick={handlePlayPause}
              data-testid="btn-play-pause"
            >
              {editorState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditorState(prev => ({ ...prev, playheadTime: duration }))}
              data-testid="btn-end"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <div className="flex items-center gap-2">
              <Label className="text-xs text-slate-400">Duration:</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 2000)}
                className="w-20 h-7 bg-slate-800 border-slate-600"
                step={100}
                data-testid="input-duration"
              />
              <span className="text-xs text-slate-400">ms</span>
            </div>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Select value={renderMode} onValueChange={(v) => setRenderMode(v as RenderMode)}>
              <SelectTrigger className="w-32 h-7 bg-slate-800 border-slate-600" data-testid="select-render-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RENDER_MODES.map(mode => (
                  <SelectItem key={mode.id} value={mode.id}>
                    <div className="flex items-center gap-2">
                      {mode.icon}
                      <span>{mode.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {showLoadDialog && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowLoadDialog(false)}>
            <Card className="bg-slate-900 border-slate-700 p-4 w-96 max-h-96 overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-amber-400 mb-3">Load Animation</h3>
              {savedAnimations.length === 0 ? (
                <p className="text-slate-400 text-sm">No saved animations yet</p>
              ) : (
                <div className="space-y-2">
                  {savedAnimations.map(anim => (
                    <div 
                      key={anim.id}
                      className="flex items-center justify-between p-2 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer"
                      onClick={() => handleLoadAnimation(anim)}
                    >
                      <div>
                        <p className="font-medium">{anim.name}</p>
                        <p className="text-xs text-slate-400">
                          {anim.tracks.length} tracks • {anim.duration}ms • {new Date(anim.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAnimation(anim.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" className="mt-3 w-full" onClick={() => setShowLoadDialog(false)}>
                Close
              </Button>
            </Card>
          </div>
        )}
        
        {renderMode === "debug" && (
          <div className="px-4 py-1 bg-yellow-900/50 border-b border-yellow-700 text-xs">
            <span className="text-yellow-400 font-bold">DEBUG MODE</span>
            <span className="text-yellow-200 ml-3">
              Tracks: {tracks.length} | Playhead: {Math.round(editorState.playheadTime)}ms | 
              Selected: {editorState.selectedTrackId || "none"} | 
              Animation: {animationName} | 
              Mode: {RENDER_MODES.find(m => m.id === renderMode)?.description || renderMode}
            </span>
          </div>
        )}
        
        {renderMode === "frames" && (
          <div className="px-4 py-1 bg-blue-900/50 border-b border-blue-700 text-xs flex items-center gap-4">
            <span className="text-blue-400 font-bold">FRAME MODE</span>
            <span className="text-blue-200">Use playhead to scrub through frames</span>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-5 text-xs"
              onClick={() => setEditorState(prev => ({ ...prev, playheadTime: Math.max(0, prev.playheadTime - 100) }))}
            >
              -100ms
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-5 text-xs"
              onClick={() => setEditorState(prev => ({ ...prev, playheadTime: Math.min(duration, prev.playheadTime + 100) }))}
            >
              +100ms
            </Button>
          </div>
        )}
        
        <div className="flex flex-1 overflow-hidden">
          <SpellBookSidebar
            selectedAbility={null}
            onSelectAbility={handleSelectAbility}
            onAddSprite={handleAddSprite}
          />
          
          <div className="flex-1 flex flex-col">
            <CombatStage
              tracks={tracks}
              playheadTime={editorState.playheadTime}
              isPlaying={editorState.isPlaying}
              onDropSprite={handleAddSprite}
              selectedTrackId={editorState.selectedTrackId}
              onSelectTrack={(id) => setEditorState(prev => ({ ...prev, selectedTrackId: id, selectedKeyframeId: null }))}
              background={background}
              onBackgroundChange={setBackground}
              backgrounds={BACKGROUNDS}
            />
            
            <TimelineEditor
              tracks={tracks}
              duration={duration}
              playheadTime={editorState.playheadTime}
              selectedTrackId={editorState.selectedTrackId}
              selectedKeyframeId={editorState.selectedKeyframeId}
              onPlayheadChange={(time) => setEditorState(prev => ({ ...prev, playheadTime: time }))}
              onSelectTrack={(id) => setEditorState(prev => ({ ...prev, selectedTrackId: id }))}
              onSelectKeyframe={(id) => setEditorState(prev => ({ ...prev, selectedKeyframeId: id }))}
              onUpdateTrack={handleUpdateTrack}
              onDeleteTrack={handleDeleteTrack}
              onAddKeyframe={handleAddKeyframe}
              onUpdateKeyframe={handleUpdateKeyframe}
              onDeleteKeyframe={handleDeleteKeyframe}
            />
          </div>
          
          <InspectorPanel
            selectedTrack={selectedTrack}
            selectedKeyframe={selectedKeyframe}
            onUpdateTrack={(updates) => editorState.selectedTrackId && handleUpdateTrack(editorState.selectedTrackId, updates)}
            onUpdateKeyframe={(updates) => editorState.selectedTrackId && editorState.selectedKeyframeId && handleUpdateKeyframe(editorState.selectedTrackId, editorState.selectedKeyframeId, updates)}
            onApplyEffect={handleApplyEffect}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
