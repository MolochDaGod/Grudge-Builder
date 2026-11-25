import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import Layout from "../components/Layout";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CharacterManager, type Character as LocalCharacter } from "../lib/characterManager";
import { 
  Pencil, Eraser, PaintBucket, Move, Pipette, Undo, Redo, 
  Save, Download, Play, Pause, Plus, Trash2, Copy, 
  Sparkles, Palette, Square, Circle, Wand2, FileUp, FolderOpen,
  Layers, Eye, EyeOff, RotateCcw, ZoomIn, ZoomOut, Film, Image as ImageIcon,
  Cog, Swords, Footprints, ArrowUpCircle, Shield, Flame, SkipBack, SkipForward,
  ChevronLeft, ChevronRight, Hammer, Brain, Pickaxe, Trees, Sparkle, ChefHat, Wrench
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { SpriteAnimationEngine, MOTION_TYPES, type MotionType, type AnimationFrame } from "@/components/SpriteAnimationEngine";
import { HeroSpriteGallery, HeroSpriteAnimator } from '@/components/HeroSpriteAnimator';
import { HERO_SPRITES, HERO_RACE_LIST, type HeroRace, type AnimationType as HeroAnimationType } from '@/lib/heroSprites';
import { puterAI } from '@/lib/puterIntegration';

const CANVAS_SIZE = 100;
const DISPLAY_SCALE = 4;

// Extended animation states matching godmodeanimation motion types
const ANIMATION_STATES = ["idle", "walk", "run", "jump", "attack", "sword_wield", "spin_kick", "cast", "hurt", "death", "block"] as const;
type AnimationState = typeof ANIMATION_STATES[number];

const RACES = ["human", "orc", "elf", "dwarf", "barbarian", "undead"] as const;
const CLASSES = ["warrior", "mage", "ranger", "shapeshifter"] as const;
const SPRITE_TYPES = ["character", "spell", "projectile", "effect", "animation"] as const;

// Motion type icons for godmode-style interface
const MOTION_ICONS: Record<string, React.ReactNode> = {
  idle: <Eye className="w-3 h-3" />,
  walk: <Footprints className="w-3 h-3" />,
  run: <Footprints className="w-3 h-3" />,
  jump: <ArrowUpCircle className="w-3 h-3" />,
  attack: <Swords className="w-3 h-3" />,
  sword_wield: <Swords className="w-3 h-3" />,
  spin_kick: <RotateCcw className="w-3 h-3" />,
  cast: <Flame className="w-3 h-3" />,
  hurt: <Shield className="w-3 h-3" />,
  death: <EyeOff className="w-3 h-3" />,
  block: <Shield className="w-3 h-3" />,
};

interface FrameData {
  id: string;
  imageData: ImageData | null;
  duration: number;
}

interface AnimationData {
  [key: string]: FrameData[];
}

const DEFAULT_PALETTE = [
  "#000000", "#1a1a2e", "#16213e", "#0f3460",
  "#e94560", "#ff6b6b", "#ffc93c", "#ffe66d",
  "#4ecdc4", "#44bd32", "#6ab04c", "#badc58",
  "#686de0", "#4834d4", "#be2edd", "#e056fd",
  "#f5f5f5", "#dfe6e9", "#b2bec3", "#636e72",
  "#2d3436", "#8b4513", "#d4a574", "#f5deb3",
];

// Godmode-style animation presets for AI generation
const ANIMATION_PRESETS = [
  { id: "sword_wield", name: "Sword Wield", prompt: "wielding a sword with a slashing motion", frames: 8 },
  { id: "spin_kick", name: "Spin Kick", prompt: "performing a spinning kick attack", frames: 10 },
  { id: "run_jump", name: "Run Jump", prompt: "running and then jumping", frames: 8 },
  { id: "cast_spell", name: "Cast Spell", prompt: "casting a magical spell with glowing hands", frames: 8 },
  { id: "idle_breathe", name: "Idle Breathing", prompt: "standing still with subtle breathing animation", frames: 4 },
  { id: "walk_cycle", name: "Walk Cycle", prompt: "walking forward in a smooth cycle", frames: 8 },
  { id: "attack_combo", name: "Attack Combo", prompt: "performing a 3-hit melee attack combo", frames: 12 },
  { id: "take_damage", name: "Take Damage", prompt: "reacting to being hit, flinching back", frames: 4 },
];

export default function SpriteEditorPage() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Editor mode tabs
  const [editorMode, setEditorMode] = useState<"draw" | "animate" | "generate" | "workbench">("draw");
  
  // Gallery state (hero sprites browser)
  const [galleryRace, setGalleryRace] = useState<HeroRace>('human');
  const [galleryAnimation, setGalleryAnimation] = useState<HeroAnimationType>('walk');
  const [galleryScale, setGalleryScale] = useState(2);
  
  const [tool, setTool] = useState<"pencil" | "eraser" | "fill" | "move" | "picker" | "rect" | "circle">("pencil");
  const [brushSize, setBrushSize] = useState(1);
  const [primaryColor, setPrimaryColor] = useState("#e94560");
  const [secondaryColor, setSecondaryColor] = useState("#000000");
  const [palette, setPalette] = useState<string[]>(DEFAULT_PALETTE);
  
  const [currentAnimation, setCurrentAnimation] = useState<AnimationState>("idle");
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [animations, setAnimations] = useState<AnimationData>(() => {
    const initial: AnimationData = {};
    ANIMATION_STATES.forEach(state => {
      const motionInfo = MOTION_TYPES.find(m => m.id === state);
      const frameCount = motionInfo?.frames || 4;
      initial[state] = Array.from({ length: frameCount }, (_, i) => ({ 
        id: `${state}-${i}`, 
        imageData: null, 
        duration: 100 
      }));
    });
    return initial;
  });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(12);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Display options
  const [zoom, setZoom] = useState(4);
  const [showOnionSkin, setShowOnionSkin] = useState(false);
  const [onionSkinFrames, setOnionSkinFrames] = useState(2);
  const [showGrid, setShowGrid] = useState(true);
  
  const [characters, setCharacters] = useState<LocalCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<LocalCharacter | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRace, setSelectedRace] = useState<typeof RACES[number]>("human");
  const [selectedClass, setSelectedClass] = useState<typeof CLASSES[number]>("warrior");
  const [spriteType, setSpriteType] = useState<typeof SPRITE_TYPES[number]>("character");
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  
  // AI generation settings (godmode-style)
  const [generationFrames, setGenerationFrames] = useState(8);
  const [samplingSteps, setSamplingSteps] = useState(30);
  const [cfgScale, setCfgScale] = useState(12);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [showAsepriteList, setShowAsepriteList] = useState(false);
  const [loadingAseprite, setLoadingAseprite] = useState<string | null>(null);
  
  // Sprite sheet import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importImage, setImportImage] = useState<HTMLImageElement | null>(null);
  const [importImageUrl, setImportImageUrl] = useState<string>("");
  const [importCols, setImportCols] = useState(2);
  const [importRows, setImportRows] = useState(2);
  const [importFrameSize, setImportFrameSize] = useState<"auto" | "custom">("auto");
  const [importFrameWidth, setImportFrameWidth] = useState(100);
  const [importFrameHeight, setImportFrameHeight] = useState(100);
  const [importMode, setImportMode] = useState<"replace" | "append">("replace");
  
  // Track engine initialization to prevent re-syncing loops
  const [engineKey, setEngineKey] = useState(0);
  const animationsRef = useRef(animations);
  animationsRef.current = animations; // Always keep ref current
  
  // Resync engine when switching to animate mode
  useEffect(() => {
    if (editorMode === "animate") {
      setEngineKey(prev => prev + 1);
    }
  }, [editorMode]);
  
  // Memoize the initial motions for the animation engine
  const engineMotions = useMemo(() => {
    const currentAnimations = animationsRef.current;
    return Object.fromEntries(
      Object.entries(currentAnimations).map(([motion, frames]) => [
        motion,
        frames.map((f) => ({
          id: f.id,
          imageData: f.imageData,
          duration: f.duration,
          anchor: { x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 }
        }))
      ])
    ) as Record<MotionType, AnimationFrame[]>;
  }, [engineKey]); // Only recreate when engine key changes (mode switches)
  
  const { data: asepriteFiles = [] } = useQuery<{ name: string; path: string }[]>({
    queryKey: ["aseprite-files"],
    queryFn: () => fetch("/api/aseprite/list").then(r => r.json()),
  });

  useEffect(() => {
    const loadChars = async () => {
      const chars = await CharacterManager.getAll();
      setCharacters(chars);
      if (chars.length > 0) {
        setSelectedCharacter(chars[0]);
      }
    };
    loadChars();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "transparent";
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Draw grid if enabled
    if (showGrid && editorMode === "draw") {
      ctx.strokeStyle = "rgba(100, 100, 100, 0.15)";
      ctx.lineWidth = 0.5;
      const gridSize = 8;
      for (let x = 0; x <= CANVAS_SIZE; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_SIZE);
        ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_SIZE; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_SIZE, y);
        ctx.stroke();
      }
    }
    
    // Draw onion skin frames
    if (showOnionSkin) {
      const currentFrames = animations[currentAnimation];
      for (let i = onionSkinFrames; i > 0; i--) {
        const prevIndex = currentFrameIndex - i;
        if (prevIndex >= 0 && currentFrames[prevIndex]?.imageData) {
          ctx.globalAlpha = 0.2 * (1 - i / (onionSkinFrames + 1));
          ctx.putImageData(currentFrames[prevIndex].imageData!, 0, 0);
        }
      }
      ctx.globalAlpha = 1;
    }
    
    const currentFrames = animations[currentAnimation];
    const currentFrame = currentFrames[currentFrameIndex];
    if (currentFrame?.imageData) {
      ctx.putImageData(currentFrame.imageData, 0, 0);
    }
  }, [currentAnimation, currentFrameIndex, animations, showGrid, showOnionSkin, onionSkinFrames, editorMode]);

  // Animation playback
  useEffect(() => {
    if (!isPlaying) return;
    
    const currentFrames = animations[currentAnimation];
    const frameDuration = 1000 / fps;
    
    const timer = setTimeout(() => {
      setCurrentFrameIndex(prev => (prev + 1) % currentFrames.length);
    }, frameDuration);
    
    return () => clearTimeout(timer);
  }, [isPlaying, currentAnimation, currentFrameIndex, animations, fps]);

  useEffect(() => {
    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) return;
    const ctx = previewCanvas.getContext("2d");
    if (!ctx) return;
    
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    const currentFrames = animations[currentAnimation];
    const currentFrame = currentFrames[currentFrameIndex];
    if (currentFrame?.imageData) {
      ctx.putImageData(currentFrame.imageData, 0, 0);
    }
  }, [currentAnimation, currentFrameIndex, animations]);

  const saveCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    setAnimations(prev => {
      const updated = { ...prev };
      const frames = [...updated[currentAnimation]];
      frames[currentFrameIndex] = {
        ...frames[currentFrameIndex],
        imageData
      };
      updated[currentAnimation] = frames;
      return updated;
    });
  }, [currentAnimation, currentFrameIndex]);

  const getCanvasPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    return {
      x: Math.floor((e.clientX - rect.left) * scaleX),
      y: Math.floor((e.clientY - rect.top) * scaleY)
    };
  }, []);

  const drawPixel = useCallback((x: number, y: number, color: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    if (tool === "eraser") {
      ctx.clearRect(x, y, brushSize, brushSize);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, brushSize, brushSize);
    }
  }, [tool, brushSize]);

  const drawLine = useCallback((x0: number, y0: number, x1: number, y1: number, color: string) => {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    while (true) {
      drawPixel(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }, [drawPixel]);

  const floodFill = useCallback((startX: number, startY: number, fillColor: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const data = imageData.data;
    
    const startIdx = (startY * CANVAS_SIZE + startX) * 4;
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];
    const startA = data[startIdx + 3];
    
    const fillRgb = hexToRgb(fillColor);
    if (!fillRgb) return;
    
    if (startR === fillRgb.r && startG === fillRgb.g && startB === fillRgb.b && startA === 255) return;
    
    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      
      if (visited.has(key)) continue;
      if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) continue;
      
      const idx = (y * CANVAS_SIZE + x) * 4;
      if (data[idx] !== startR || data[idx + 1] !== startG || 
          data[idx + 2] !== startB || data[idx + 3] !== startA) continue;
      
      visited.add(key);
      data[idx] = fillRgb.r;
      data[idx + 1] = fillRgb.g;
      data[idx + 2] = fillRgb.b;
      data[idx + 3] = 255;
      
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    ctx.putImageData(imageData, 0, 0);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (editorMode !== "draw") return;
    const pos = getCanvasPos(e);
    if (!pos) return;
    
    setIsDrawing(true);
    setLastPos(pos);
    
    if (tool === "pencil" || tool === "eraser") {
      drawPixel(pos.x, pos.y, e.button === 2 ? secondaryColor : primaryColor);
    } else if (tool === "fill") {
      floodFill(pos.x, pos.y, e.button === 2 ? secondaryColor : primaryColor);
      saveCurrentFrame();
    } else if (tool === "picker") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const pixel = ctx.getImageData(pos.x, pos.y, 1, 1).data;
      const color = rgbToHex(pixel[0], pixel[1], pixel[2]);
      if (e.button === 2) {
        setSecondaryColor(color);
      } else {
        setPrimaryColor(color);
      }
    }
  }, [editorMode, getCanvasPos, tool, primaryColor, secondaryColor, drawPixel, floodFill, saveCurrentFrame]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || editorMode !== "draw") return;
    const pos = getCanvasPos(e);
    if (!pos || !lastPos) return;
    
    if (tool === "pencil" || tool === "eraser") {
      drawLine(lastPos.x, lastPos.y, pos.x, pos.y, e.buttons === 2 ? secondaryColor : primaryColor);
      setLastPos(pos);
    }
  }, [isDrawing, editorMode, getCanvasPos, lastPos, tool, primaryColor, secondaryColor, drawLine]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing) {
      saveCurrentFrame();
    }
    setIsDrawing(false);
    setLastPos(null);
  }, [isDrawing, saveCurrentFrame]);

  const addFrame = useCallback(() => {
    setAnimations(prev => {
      const updated = { ...prev };
      const frames = [...updated[currentAnimation]];
      const newId = `${currentAnimation}-${Date.now()}`;
      frames.push({ id: newId, imageData: null, duration: Math.round(1000 / fps) });
      updated[currentAnimation] = frames;
      return updated;
    });
    setCurrentFrameIndex(animations[currentAnimation].length);
  }, [currentAnimation, animations, fps]);

  const deleteFrame = useCallback(() => {
    const currentFrames = animations[currentAnimation];
    if (currentFrames.length <= 1) return;
    
    setAnimations(prev => {
      const updated = { ...prev };
      const frames = [...updated[currentAnimation]];
      frames.splice(currentFrameIndex, 1);
      updated[currentAnimation] = frames;
      return updated;
    });
    setCurrentFrameIndex(prev => Math.min(prev, currentFrames.length - 2));
  }, [currentAnimation, currentFrameIndex, animations]);

  const duplicateFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    setAnimations(prev => {
      const updated = { ...prev };
      const frames = [...updated[currentAnimation]];
      const newId = `${currentAnimation}-${Date.now()}`;
      frames.splice(currentFrameIndex + 1, 0, { id: newId, imageData, duration: Math.round(1000 / fps) });
      updated[currentAnimation] = frames;
      return updated;
    });
    setCurrentFrameIndex(prev => prev + 1);
  }, [currentAnimation, currentFrameIndex, fps]);

  // Godmode-style AI animation generation
  const generateAnimationWithAI = useCallback(async () => {
    setIsGenerating(true);
    
    try {
      const preset = ANIMATION_PRESETS.find(p => p.id === selectedPreset);
      const motionPrompt = preset?.prompt || aiPrompt || "performing an action";
      const frameCount = preset?.frames || generationFrames;
      
      const raceDescriptions: Record<string, string> = {
        human: "fair-skinned human with determined features",
        orc: "green-skinned orc with tusks and fierce expression",
        elf: "elegant elf with pointed ears and slender build",
        dwarf: "stout dwarf with magnificent beard and sturdy frame",
        barbarian: "muscular barbarian with wild hair and tribal markings",
        undead: "pale undead with glowing eyes and skeletal features"
      };
      
      const classDescriptions: Record<string, string> = {
        warrior: "heavy plate armor, sword and shield",
        mage: "flowing mystical robes, glowing staff",
        ranger: "leather armor, hooded cloak, bow",
        shapeshifter: "druidic garb, nature motifs"
      };
      
      // Generate animation frame by frame
      const generatedFrames: FrameData[] = [];
      
      for (let i = 0; i < frameCount; i++) {
        const frameProgress = i / (frameCount - 1);
        
        const prompt = spriteType === "character" 
          ? `You are a 2D game animation sprite generator. Create frame ${i + 1} of ${frameCount} for a ${raceDescriptions[selectedRace]} ${selectedClass} character ${motionPrompt}.

Style: Dark fantasy RPG, chibi-style proportions, 100x100 pixel art, facing right.
Animation Progress: ${Math.round(frameProgress * 100)}% through the motion.
${i === 0 ? "This is the starting pose." : i === frameCount - 1 ? "This is the ending pose." : `This is the middle of the animation.`}

Output: JSON array of colored rectangles: [{"x": 0, "y": 0, "w": 10, "h": 10, "color": "#ff0000"}, ...]
Use 30-50 rectangles. Include body, armor, weapon details positioned for this frame of animation.`
          : `Create frame ${i + 1} of ${frameCount} for a ${aiPrompt || "magical effect"} animation.
Animation Progress: ${Math.round(frameProgress * 100)}%.
Output: JSON array of colored rectangles for a 100x100 pixel art effect.`;
        
        const text = await puterAI.chat(prompt, { page: 'warlords_sprite_editor', maxTokens: 800 });
        if (!text) continue;
        
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const rectangles = JSON.parse(jsonMatch[0]);
          
          // Create ImageData for this frame
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = CANVAS_SIZE;
          tempCanvas.height = CANVAS_SIZE;
          const ctx = tempCanvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            rectangles.forEach((rect: { x: number; y: number; w: number; h: number; color: string }) => {
              ctx.fillStyle = rect.color;
              ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
            });
            
            generatedFrames.push({
              id: `${currentAnimation}-gen-${i}`,
              imageData: ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE),
              duration: Math.round(1000 / fps)
            });
          }
        }
      }
      
      // Update animation with generated frames
      if (generatedFrames.length > 0) {
        setAnimations(prev => {
          const updated = { ...prev };
          updated[currentAnimation] = generatedFrames;
          return updated;
        });
        setCurrentFrameIndex(0);
      }
      
    } catch (error) {
      console.error("AI animation generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [aiPrompt, selectedPreset, generationFrames, selectedRace, selectedClass, spriteType, currentAnimation, fps]);

  const generateSingleFrame = useCallback(async () => {
    setIsGenerating(true);
    
    try {
      const raceDescriptions: Record<string, string> = {
        human: "fair-skinned human with determined features",
        orc: "green-skinned orc with tusks and fierce expression",
        elf: "elegant elf with pointed ears and slender build",
        dwarf: "stout dwarf with magnificent beard and sturdy frame",
        barbarian: "muscular barbarian with wild hair and tribal markings",
        undead: "pale undead with glowing eyes and skeletal features"
      };
      
      const classDescriptions: Record<string, string> = {
        warrior: "heavy plate armor, sword and shield, battle-ready stance",
        mage: "flowing mystical robes, glowing staff, arcane symbols",
        ranger: "leather armor, hooded cloak, bow and quiver",
        shapeshifter: "druidic garb, nature motifs, wolf-like features"
      };
      
      const spellDescriptions: Record<string, string> = {
        fire: "orange and red flames, glowing core, flickering edges",
        ice: "blue crystalline shards, frost particles, cold aura",
        lightning: "bright yellow bolts, electric arcs, white core",
        poison: "green bubbling liquid, toxic drips, sickly glow",
        arcane: "purple magical energy, swirling patterns, mystical runes",
        holy: "golden light rays, divine symbols, pure white glow",
        shadow: "dark tendrils, void energy, black core with purple edges"
      };
      
      let prompt = "";
      
      if (spriteType === "character") {
        const raceDesc = raceDescriptions[selectedRace];
        const classDesc = classDescriptions[selectedClass];
        const customDesc = aiPrompt.trim() ? ` with ${aiPrompt}` : "";
        
        prompt = `You are a pixel art generator. Create a 100x100 pixel art sprite for a ${raceDesc} ${selectedClass}. The character should have ${classDesc}${customDesc}.
        
Style: Dark fantasy RPG, chibi-style proportions (large head, small body), facing right, standing pose.
Output: JSON array of colored rectangles: [{"x": 0, "y": 0, "w": 10, "h": 10, "color": "#ff0000"}, ...]
Use 30-50 rectangles. Include body, armor, weapon details. Character should be centered in the 100x100 canvas.`;

      } else if (spriteType === "spell" || spriteType === "projectile") {
        const spellType = aiPrompt.trim() || "fire";
        const spellDesc = spellDescriptions[spellType.toLowerCase()] || spellDescriptions.fire;
        
        prompt = `You are a pixel art generator. Create a 100x100 pixel art ${spriteType} sprite for a ${spellType} magic effect. Style: ${spellDesc}.

This is for a side-scrolling game, so the projectile should face right.
Output: JSON array of colored rectangles: [{"x": 0, "y": 0, "w": 10, "h": 10, "color": "#ff0000"}, ...]
Use 20-40 rectangles. Include glowing effects, particle trails. Center the effect in the canvas.`;

      } else {
        const effectDesc = aiPrompt.trim() || "magical explosion";
        prompt = `You are a pixel art generator. Create a 100x100 pixel art visual effect sprite for: ${effectDesc}.

Style: Bright, eye-catching, suitable for a fantasy RPG game.
Output: JSON array of colored rectangles: [{"x": 0, "y": 0, "w": 10, "h": 10, "color": "#ff0000"}, ...]
Use 20-40 rectangles with semi-transparent colors where appropriate.`;
      }
      
      const text = await puterAI.chat(prompt, { page: 'warlords_sprite_editor', maxTokens: 800 });
      if (!text) throw new Error("AI router returned no text");
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const rectangles = JSON.parse(jsonMatch[0]);
        
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            rectangles.forEach((rect: { x: number; y: number; w: number; h: number; color: string }) => {
              ctx.fillStyle = rect.color;
              ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
            });
            saveCurrentFrame();
          }
        }
      }
    } catch (error) {
      console.error("AI generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [aiPrompt, saveCurrentFrame, selectedRace, selectedClass, spriteType]);

  const exportSpritesheet = useCallback(() => {
    const currentFrames = animations[currentAnimation];
    const totalWidth = CANVAS_SIZE * currentFrames.length;
    
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = totalWidth;
    exportCanvas.height = CANVAS_SIZE;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;
    
    ctx.imageSmoothingEnabled = false;
    
    currentFrames.forEach((frame, i) => {
      if (frame.imageData) {
        ctx.putImageData(frame.imageData, i * CANVAS_SIZE, 0);
      }
    });
    
    const link = document.createElement("a");
    link.download = `${selectedCharacter?.name || "sprite"}-${currentAnimation}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  }, [animations, currentAnimation, selectedCharacter]);

  const exportAllAnimations = useCallback(() => {
    // Export all animations as a single large spritesheet
    let maxFrames = 0;
    ANIMATION_STATES.forEach(state => {
      maxFrames = Math.max(maxFrames, animations[state].length);
    });
    
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = CANVAS_SIZE * maxFrames;
    exportCanvas.height = CANVAS_SIZE * ANIMATION_STATES.length;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;
    
    ctx.imageSmoothingEnabled = false;
    
    ANIMATION_STATES.forEach((state, row) => {
      animations[state].forEach((frame, col) => {
        if (frame.imageData) {
          ctx.putImageData(frame.imageData, col * CANVAS_SIZE, row * CANVAS_SIZE);
        }
      });
    });
    
    const link = document.createElement("a");
    link.download = `${selectedCharacter?.name || "sprite"}-all-animations.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  }, [animations, selectedCharacter]);

  const saveToCharacter = useCallback(async () => {
    if (!selectedCharacter) return;
    
    const puter = (window as any).puter;
    if (!puter?.kv) return;
    
    const spriteData: Record<string, string[]> = {};
    
    for (const [state, frames] of Object.entries(animations)) {
      spriteData[state] = frames.map(frame => {
        if (!frame.imageData) return "";
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = CANVAS_SIZE;
        tempCanvas.height = CANVAS_SIZE;
        const ctx = tempCanvas.getContext("2d");
        if (!ctx) return "";
        ctx.putImageData(frame.imageData, 0, 0);
        return tempCanvas.toDataURL("image/png");
      });
    }
    
    await puter.kv.set(`sprite_${selectedCharacter.id}`, JSON.stringify(spriteData));
    alert("Sprite saved to character!");
  }, [selectedCharacter, animations]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    saveCurrentFrame();
  }, [saveCurrentFrame]);

  const loadAsepriteFile = useCallback(async (filename: string) => {
    setLoadingAseprite(filename);
    try {
      const response = await fetch(`/api/aseprite/parse/${encodeURIComponent(filename)}`);
      const data = await response.json();
      
      if (data.error) {
        alert(`Error loading ${filename}: ${data.error}`);
        return;
      }
      
      const tagAnimMap: Record<string, string> = {
        "Idle": "idle",
        "Walk": "walk",
        "Run": "run",
        "Attack01": "attack",
        "Attack02": "sword_wield",
        "Attack03": "spin_kick",
        "Hurt": "hurt",
        "Death": "death",
        "Block": "block",
        "Cast": "cast",
        "Jump": "jump"
      };
      
      const newAnimations: AnimationData = {};
      ANIMATION_STATES.forEach(state => {
        const motionInfo = MOTION_TYPES.find(m => m.id === state);
        newAnimations[state] = [{ id: `${state}-0`, imageData: null, duration: 100 }];
      });
      
      if (data.tags && data.tags.length > 0) {
        for (const tag of data.tags) {
          const animState = tagAnimMap[tag.name];
          if (!animState) continue;
          
          const frames: FrameData[] = [];
          for (let i = tag.from; i <= tag.to; i++) {
            const frame = data.frames[i];
            frames.push({
              id: `${animState}-${i - tag.from}`,
              imageData: null,
              duration: frame?.duration || 100
            });
          }
          if (frames.length > 0) {
            newAnimations[animState] = frames;
          }
        }
      }
      
      setAnimations(newAnimations);
      setShowAsepriteList(false);
      setCurrentFrameIndex(0);
      alert(`Loaded ${filename}: ${data.numFrames} frames, ${data.tags?.length || 0} animation tags`);
    } catch (error) {
      console.error("Failed to load Aseprite file:", error);
      alert("Failed to load Aseprite file");
    } finally {
      setLoadingAseprite(null);
    }
  }, []);

  // Sprite sheet import functions
  const handleImageFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    setImportImageUrl(url);
    
    const img = new Image();
    img.onload = () => {
      setImportImage(img);
      // Auto-detect frame size based on grid
      if (importFrameSize === "auto") {
        setImportFrameWidth(Math.floor(img.width / importCols));
        setImportFrameHeight(Math.floor(img.height / importRows));
      }
    };
    img.src = url;
  }, [importCols, importRows, importFrameSize]);

  const importSpriteSheet = useCallback(() => {
    if (!importImage) return;
    
    const frameWidth = importFrameSize === "auto" 
      ? Math.floor(importImage.width / importCols)
      : importFrameWidth;
    const frameHeight = importFrameSize === "auto"
      ? Math.floor(importImage.height / importRows)
      : importFrameHeight;
    
    const newFrames: FrameData[] = [];
    
    // Extract frames from grid (left-to-right, top-to-bottom)
    for (let row = 0; row < importRows; row++) {
      for (let col = 0; col < importCols; col++) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = CANVAS_SIZE;
        tempCanvas.height = CANVAS_SIZE;
        const ctx = tempCanvas.getContext("2d");
        if (!ctx) continue;
        
        ctx.imageSmoothingEnabled = false;
        
        // Draw the extracted frame, scaled to fit canvas
        const srcX = col * frameWidth;
        const srcY = row * frameHeight;
        
        // Scale to fit CANVAS_SIZE while preserving aspect ratio
        const scale = Math.min(CANVAS_SIZE / frameWidth, CANVAS_SIZE / frameHeight);
        const destWidth = frameWidth * scale;
        const destHeight = frameHeight * scale;
        const destX = (CANVAS_SIZE - destWidth) / 2;
        const destY = (CANVAS_SIZE - destHeight) / 2;
        
        ctx.drawImage(
          importImage,
          srcX, srcY, frameWidth, frameHeight,
          destX, destY, destWidth, destHeight
        );
        
        const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        newFrames.push({
          id: `${currentAnimation}-import-${Date.now()}-${row * importCols + col}`,
          imageData,
          duration: Math.round(1000 / fps)
        });
      }
    }
    
    // Add frames to current animation (replace or append)
    setAnimations(prev => ({
      ...prev,
      [currentAnimation]: importMode === "append" 
        ? [...prev[currentAnimation].filter(f => f.imageData !== null), ...newFrames]
        : newFrames
    }));
    
    setCurrentFrameIndex(0);
    setShowImportModal(false);
    setImportImage(null);
    setImportImageUrl("");
    
    // Update canvas with first frame
    const canvas = canvasRef.current;
    if (canvas && newFrames[0]?.imageData) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.putImageData(newFrames[0].imageData, 0, 0);
      }
    }
  }, [importImage, importCols, importRows, importFrameSize, importFrameWidth, importFrameHeight, currentAnimation, fps]);

  // Timeline navigation
  const goToStart = () => setCurrentFrameIndex(0);
  const goToEnd = () => setCurrentFrameIndex(animations[currentAnimation].length - 1);
  const prevFrame = () => setCurrentFrameIndex(prev => Math.max(0, prev - 1));
  const nextFrame = () => setCurrentFrameIndex(prev => Math.min(animations[currentAnimation].length - 1, prev + 1));

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-amber-400">Sprite Animation Studio</h1>
              <div className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded">
                Godmode Animation Engine v2.0
              </div>
            </div>
            <div className="flex gap-2">
              <Select 
                value={selectedCharacter?.id || ""} 
                onValueChange={(id) => setSelectedCharacter(characters.find(c => c.id === id) || null)}
              >
                <SelectTrigger className="w-48 bg-slate-800 border-slate-600">
                  <SelectValue placeholder="Select character" />
                </SelectTrigger>
                <SelectContent>
                  {characters.map(char => (
                    <SelectItem key={char.id} value={char.id}>{char.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                className="border-purple-500/50 text-purple-300 hover:bg-purple-900/30"
                onClick={() => setLocation("/sprite-admin")}
                data-testid="button-ai-admin"
              >
                <Brain className="w-4 h-4 mr-2" />
                AI Admin
              </Button>
              <Button variant="outline" onClick={() => setLocation("/")}>
                Back to Menu
              </Button>
            </div>
          </div>

          {/* Editor Mode Tabs */}
          <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as typeof editorMode)} className="mb-4">
            <TabsList className="bg-slate-800">
              <TabsTrigger value="draw" className="data-[state=active]:bg-amber-600">
                <Pencil className="w-4 h-4 mr-2" /> Draw
              </TabsTrigger>
              <TabsTrigger value="animate" className="data-[state=active]:bg-amber-600">
                <Film className="w-4 h-4 mr-2" /> Animate
              </TabsTrigger>
              <TabsTrigger value="generate" className="data-[state=active]:bg-purple-600">
                <Sparkles className="w-4 h-4 mr-2" /> AI Generate
              </TabsTrigger>
              <TabsTrigger value="workbench" className="data-[state=active]:bg-amber-600">
                <Hammer className="w-4 h-4 mr-2" /> Workbench
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-12 gap-4">
            {/* Left Sidebar - Tools */}
            <div className="col-span-2 space-y-4">
              {editorMode === "draw" && (
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Tools</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "pencil", icon: Pencil, label: "Pencil" },
                      { id: "eraser", icon: Eraser, label: "Eraser" },
                      { id: "fill", icon: PaintBucket, label: "Fill" },
                      { id: "picker", icon: Pipette, label: "Pick Color" },
                      { id: "rect", icon: Square, label: "Rectangle" },
                      { id: "circle", icon: Circle, label: "Circle" },
                    ].map(({ id, icon: Icon, label }) => (
                      <Button
                        key={id}
                        variant={tool === id ? "default" : "outline"}
                        size="sm"
                        className={cn("p-2", tool === id && "bg-amber-600")}
                        onClick={() => setTool(id as typeof tool)}
                        title={label}
                        data-testid={`tool-${id}`}
                      >
                        <Icon className="w-4 h-4" />
                      </Button>
                    ))}
                  </div>
                  
                  <div className="mt-4">
                    <label className="text-xs text-slate-400">Brush Size: {brushSize}</label>
                    <Slider
                      value={[brushSize]}
                      onValueChange={([v]) => setBrushSize(v)}
                      min={1}
                      max={10}
                      step={1}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <div 
                      className="w-10 h-10 rounded border-2 border-white cursor-pointer"
                      style={{ backgroundColor: primaryColor }}
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "color";
                        input.value = primaryColor;
                        input.onchange = (e) => setPrimaryColor((e.target as HTMLInputElement).value);
                        input.click();
                      }}
                      title="Primary Color"
                    />
                    <div 
                      className="w-10 h-10 rounded border-2 border-slate-500 cursor-pointer"
                      style={{ backgroundColor: secondaryColor }}
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "color";
                        input.value = secondaryColor;
                        input.onchange = (e) => setSecondaryColor((e.target as HTMLInputElement).value);
                        input.click();
                      }}
                      title="Secondary Color (Right Click)"
                    />
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="text-xs text-slate-400 mb-2">Palette</h4>
                    <div className="grid grid-cols-4 gap-1">
                      {palette.map((color, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded cursor-pointer border border-slate-600 hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          onClick={() => setPrimaryColor(color)}
                          onContextMenu={(e) => { e.preventDefault(); setSecondaryColor(color); }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <Button variant="outline" size="sm" className="w-full" onClick={clearCanvas}>
                      <Trash2 className="w-3 h-3 mr-1" /> Clear
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Display Options */}
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Display</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-400">Grid</Label>
                    <Switch checked={showGrid} onCheckedChange={setShowGrid} className="scale-75" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-400">Onion Skin</Label>
                    <Switch checked={showOnionSkin} onCheckedChange={setShowOnionSkin} className="scale-75" />
                  </div>
                  {showOnionSkin && (
                    <div>
                      <Label className="text-xs text-slate-500">Frames: {onionSkinFrames}</Label>
                      <Slider
                        value={[onionSkinFrames]}
                        onValueChange={([v]) => setOnionSkinFrames(v)}
                        min={1}
                        max={5}
                        step={1}
                        className="mt-1"
                      />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-slate-400">Zoom: {zoom}x</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(z => Math.max(1, z - 1))}>
                        <ZoomOut className="w-3 h-3" />
                      </Button>
                      <Slider
                        value={[zoom]}
                        onValueChange={([v]) => setZoom(v)}
                        min={1}
                        max={8}
                        step={1}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(z => Math.min(8, z + 1))}>
                        <ZoomIn className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Motion Types */}
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Motions</h3>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {MOTION_TYPES.map(motion => (
                    <Button
                      key={motion.id}
                      variant={currentAnimation === motion.id ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "w-full justify-start text-xs h-7",
                        currentAnimation === motion.id && "bg-amber-600"
                      )}
                      onClick={() => { setCurrentAnimation(motion.id as AnimationState); setCurrentFrameIndex(0); }}
                      data-testid={`motion-${motion.id}`}
                    >
                      {MOTION_ICONS[motion.id]}
                      <span className="ml-2">{motion.name}</span>
                      <span className="ml-auto text-slate-500">
                        {animations[motion.id]?.length || 0}f
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Canvas Area - Hidden when Workbench mode */}
            {editorMode !== "workbench" ? (
            <div className="col-span-6 flex flex-col items-center">
              <div 
                className="bg-slate-950 p-4 rounded-lg border border-slate-700 mb-4 relative"
                style={{
                  backgroundImage: 'repeating-conic-gradient(#333 0% 25%, #222 0% 50%)',
                  backgroundSize: '16px 16px'
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  className="border border-slate-600"
                  style={{ 
                    width: CANVAS_SIZE * zoom, 
                    height: CANVAS_SIZE * zoom,
                    imageRendering: "pixelated",
                    cursor: editorMode === "draw" ? (tool === "pencil" ? "crosshair" : tool === "eraser" ? "cell" : "default") : "default"
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onContextMenu={(e) => e.preventDefault()}
                  data-testid="sprite-canvas"
                />
                {isGenerating && (
                  <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center rounded-lg">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
                    <span className="text-purple-400 text-sm font-medium">Generating...</span>
                  </div>
                )}
              </div>
              
              {/* Timeline */}
              <div className="w-full bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                {/* Playback Controls */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToStart}>
                      <SkipBack className="w-3 h-3" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={prevFrame}>
                      <ChevronLeft className="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className={cn("h-8 w-8", isPlaying && "bg-amber-600 border-amber-500")}
                      onClick={() => setIsPlaying(!isPlaying)}
                      data-testid="play-pause-btn"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={nextFrame}>
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToEnd}>
                      <SkipForward className="w-3 h-3" />
                    </Button>
                    
                    <div className="w-px h-6 bg-slate-700 mx-2" />
                    
                    <Label className="text-xs text-slate-400">FPS:</Label>
                    <Input
                      type="number"
                      value={fps}
                      onChange={(e) => setFps(Math.max(1, Math.min(60, parseInt(e.target.value) || 12)))}
                      className="w-12 h-7 text-xs bg-slate-800 border-slate-600 text-center"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {currentFrameIndex + 1} / {animations[currentAnimation].length}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={addFrame} title="Add Frame">
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={duplicateFrame} title="Duplicate">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={deleteFrame} 
                        disabled={animations[currentAnimation].length <= 1}
                        title="Delete Frame"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Frame thumbnails */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {animations[currentAnimation].map((frame, i) => (
                    <div
                      key={frame.id}
                      className={cn(
                        "flex-shrink-0 w-14 h-14 bg-slate-900 border-2 rounded cursor-pointer hover:scale-105 transition-transform",
                        currentFrameIndex === i ? "border-amber-500 ring-1 ring-amber-500/50" : "border-slate-600"
                      )}
                      onClick={() => setCurrentFrameIndex(i)}
                      data-testid={`frame-${i}`}
                    >
                      {frame.imageData ? (
                        <FrameThumbnail imageData={frame.imageData} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            ) : (
              /* Workbench Mode - Links to Profession Pages */
              <div className="col-span-10 flex flex-col">
                <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 mb-4">
                  <h2 className="text-2xl font-semibold mb-6 text-amber-300 flex items-center gap-3 font-['Cinzel']">
                    <Hammer className="w-6 h-6" />
                    Artisan Guild Workbenches
                  </h2>
                  
                  <p className="text-slate-400 mb-6">
                    Access your profession workbenches to craft gear, refine materials, and level up your artisan skills.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Miner Workbench */}
                    <button
                      onClick={() => setLocation("/profession/miner")}
                      className="group bg-gradient-to-br from-orange-900/40 to-slate-800/60 rounded-lg p-5 border border-orange-700/30 hover:border-orange-500/50 transition-all hover:scale-[1.02] text-left"
                      data-testid="workbench-miner"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-orange-600/30 p-3 rounded-lg group-hover:bg-orange-600/50 transition-colors">
                          <Pickaxe className="w-6 h-6 text-orange-300" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-orange-200">Miner</h3>
                          <p className="text-xs text-orange-300/60">Ore & Metal Crafting</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">
                        Smelt ores, forge metal bars, and craft powerful metal armor and weapons.
                      </p>
                    </button>
                    
                    {/* Forester Workbench */}
                    <button
                      onClick={() => setLocation("/profession/forester")}
                      className="group bg-gradient-to-br from-green-900/40 to-slate-800/60 rounded-lg p-5 border border-green-700/30 hover:border-green-500/50 transition-all hover:scale-[1.02] text-left"
                      data-testid="workbench-forester"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-green-600/30 p-3 rounded-lg group-hover:bg-green-600/50 transition-colors">
                          <Trees className="w-6 h-6 text-green-300" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-green-200">Forester</h3>
                          <p className="text-xs text-green-300/60">Wood & Leather Crafting</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">
                        Process lumber, tan leather, and craft bows, staves, and leather armor.
                      </p>
                    </button>
                    
                    {/* Mystic Workbench */}
                    <button
                      onClick={() => setLocation("/profession/mystic")}
                      className="group bg-gradient-to-br from-purple-900/40 to-slate-800/60 rounded-lg p-5 border border-purple-700/30 hover:border-purple-500/50 transition-all hover:scale-[1.02] text-left"
                      data-testid="workbench-mystic"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-purple-600/30 p-3 rounded-lg group-hover:bg-purple-600/50 transition-colors">
                          <Sparkle className="w-6 h-6 text-purple-300" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-purple-200">Mystic</h3>
                          <p className="text-xs text-purple-300/60">Enchanting & Cloth</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">
                        Weave magical cloth, enchant gear, and craft robes and arcane accessories.
                      </p>
                    </button>
                    
                    {/* Chef Workbench */}
                    <button
                      onClick={() => setLocation("/profession/chef")}
                      className="group bg-gradient-to-br from-red-900/40 to-slate-800/60 rounded-lg p-5 border border-red-700/30 hover:border-red-500/50 transition-all hover:scale-[1.02] text-left"
                      data-testid="workbench-chef"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-red-600/30 p-3 rounded-lg group-hover:bg-red-600/50 transition-colors">
                          <ChefHat className="w-6 h-6 text-red-300" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-red-200">Chef</h3>
                          <p className="text-xs text-red-300/60">Food & Consumables</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">
                        Prepare meals and consumables that provide combat buffs and stat bonuses.
                      </p>
                    </button>
                    
                    {/* Engineer Workbench */}
                    <button
                      onClick={() => setLocation("/profession/engineer")}
                      className="group bg-gradient-to-br from-blue-900/40 to-slate-800/60 rounded-lg p-5 border border-blue-700/30 hover:border-blue-500/50 transition-all hover:scale-[1.02] text-left"
                      data-testid="workbench-engineer"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-blue-600/30 p-3 rounded-lg group-hover:bg-blue-600/50 transition-colors">
                          <Wrench className="w-6 h-6 text-blue-300" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-blue-200">Engineer</h3>
                          <p className="text-xs text-blue-300/60">Gadgets & Machines</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">
                        Build mechanical devices, traps, explosives, and advanced equipment.
                      </p>
                    </button>
                  </div>
                  
                  {/* Crafting Info */}
                  <div className="mt-8 p-4 bg-slate-900/40 rounded-lg border border-slate-700">
                    <h3 className="font-medium text-amber-300 mb-3 flex items-center gap-2">
                      <Hammer className="w-4 h-4" />
                      Artisan Guild System
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-medium text-slate-400 mb-2">Tier Progression (T1-T8):</h4>
                        <ul className="list-disc list-inside text-slate-500 space-y-1">
                          <li>Higher tiers unlock better recipes</li>
                          <li>Each tier requires previous tier mastery</li>
                          <li>XP gained from crafting and gathering</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-400 mb-2">Workbench Features:</h4>
                        <ul className="list-disc list-inside text-slate-500 space-y-1">
                          <li>Skill Trees for specialization</li>
                          <li>Crafting recipes by tier</li>
                          <li>Upgrade stations</li>
                          <li>XP Activities tracking</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Right Sidebar - Hidden in Workbench mode */}
            {editorMode !== "workbench" && (
            <div className="col-span-4 space-y-4">
              {/* Animation Engine Panel - Animate Mode */}
              {editorMode === "animate" && (
                <div className="bg-gradient-to-b from-amber-900/20 to-slate-800/50 rounded-lg border border-amber-700/30">
                  <SpriteAnimationEngine
                    key={engineKey}
                    width={CANVAS_SIZE}
                    height={CANVAS_SIZE}
                    onFrameChange={(frame, frameIndex) => {
                      setCurrentFrameIndex(frameIndex);
                    }}
                    onAnimationChange={(motion) => {
                      setCurrentAnimation(motion as AnimationState);
                      setCurrentFrameIndex(0);
                    }}
                    onMotionsUpdate={(updatedMotions) => {
                      // Sync engine changes back to editor state
                      setAnimations(prev => {
                        const updated = { ...prev };
                        Object.entries(updatedMotions).forEach(([motion, frames]) => {
                          if (ANIMATION_STATES.includes(motion as AnimationState)) {
                            updated[motion as AnimationState] = frames.map((f, i) => ({
                              id: f.id || `${motion}-${i}`,
                              imageData: f.imageData,
                              duration: f.duration
                            }));
                          }
                        });
                        return updated;
                      });
                    }}
                    onExport={(type, data) => {
                      if (type === "spritesheet") {
                        const link = document.createElement("a");
                        link.download = `${selectedCharacter?.name || "sprite"}-${currentAnimation}.png`;
                        link.href = data as string;
                        link.click();
                      }
                    }}
                    initialProject={{
                      currentMotion: currentAnimation as MotionType,
                      fps: fps,
                      motions: engineMotions
                    }}
                  />
                </div>
              )}
              
              {/* AI Generation Panel - Godmode Style */}
              {editorMode === "generate" && (
                <div className="bg-gradient-to-b from-purple-900/30 to-slate-800/50 rounded-lg p-3 border border-purple-700/50">
                  <h3 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Godmode AI Animation Generator
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-slate-400">Sprite Type</Label>
                      <Select value={spriteType} onValueChange={(v) => setSpriteType(v as typeof spriteType)}>
                        <SelectTrigger className="bg-slate-900 text-xs h-8 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SPRITE_TYPES.map(type => (
                            <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {spriteType === "character" && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-slate-400">Race</Label>
                          <Select value={selectedRace} onValueChange={(v) => setSelectedRace(v as typeof selectedRace)}>
                            <SelectTrigger className="bg-slate-900 text-xs h-8 mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {RACES.map(race => (
                                <SelectItem key={race} value={race} className="capitalize">{race}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-400">Class</Label>
                          <Select value={selectedClass} onValueChange={(v) => setSelectedClass(v as typeof selectedClass)}>
                            <SelectTrigger className="bg-slate-900 text-xs h-8 mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CLASSES.map(cls => (
                                <SelectItem key={cls} value={cls} className="capitalize">{cls}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-xs text-slate-400">Animation Preset</Label>
                      <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                        <SelectTrigger className="bg-slate-900 text-xs h-8 mt-1">
                          <SelectValue placeholder="Select preset..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ANIMATION_PRESETS.map(preset => (
                            <SelectItem key={preset.id} value={preset.id}>
                              {preset.name} ({preset.frames}f)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-slate-400">Custom Motion Prompt</Label>
                      <Input
                        placeholder="e.g., swinging a sword, casting fire..."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="bg-slate-900 text-sm mt-1"
                        data-testid="ai-prompt-input"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-slate-400">Frames: {generationFrames}</Label>
                        <Slider
                          value={[generationFrames]}
                          onValueChange={([v]) => setGenerationFrames(v)}
                          min={2}
                          max={16}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-400">Steps: {samplingSteps}</Label>
                        <Slider
                          value={[samplingSteps]}
                          onValueChange={([v]) => setSamplingSteps(v)}
                          min={10}
                          max={60}
                          step={5}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                        onClick={generateAnimationWithAI}
                        disabled={isGenerating}
                        data-testid="generate-animation-btn"
                      >
                        {isGenerating ? "Generating..." : (
                          <><Film className="w-4 h-4 mr-2" /> Generate Animation</>
                        )}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={generateSingleFrame}
                        disabled={isGenerating}
                        data-testid="generate-frame-btn"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Preview */}
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Preview</h3>
                <div className="flex justify-center">
                  <div 
                    className="bg-slate-950 p-2 rounded relative"
                    style={{
                      backgroundImage: 'repeating-conic-gradient(#333 0% 25%, #222 0% 50%)',
                      backgroundSize: '8px 8px'
                    }}
                  >
                    <canvas
                      ref={previewCanvasRef}
                      width={CANVAS_SIZE}
                      height={CANVAS_SIZE}
                      className="border border-slate-700"
                      style={{ width: 120, height: 120, imageRendering: "pixelated" }}
                    />
                  </div>
                </div>
                <div className="text-center text-xs text-slate-500 mt-2">
                  {MOTION_TYPES.find(m => m.id === currentAnimation)?.description}
                </div>
              </div>
              
              {/* Import Section */}
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-amber-400" />
                  Import
                </h3>
                
                {/* Import Sprite Sheet Button */}
                <Button 
                  variant="outline" 
                  className="w-full mb-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/50 hover:border-blue-400"
                  onClick={() => setShowImportModal(true)}
                  data-testid="import-spritesheet-btn"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Import Sprite Sheet
                </Button>
                
                {/* Aseprite Files */}
                <Button 
                  variant="outline" 
                  className="w-full mb-2"
                  onClick={() => setShowAsepriteList(!showAsepriteList)}
                  data-testid="toggle-aseprite-list"
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  {showAsepriteList ? "Hide Files" : "Import Aseprite"}
                </Button>
                {showAsepriteList && (
                  <div className="max-h-32 overflow-y-auto space-y-1 bg-slate-900 rounded p-2">
                    {asepriteFiles.map(file => (
                      <Button
                        key={file.name}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs hover:bg-slate-700"
                        onClick={() => loadAsepriteFile(file.name)}
                        disabled={loadingAseprite === file.name}
                        data-testid={`aseprite-file-${file.name}`}
                      >
                        {loadingAseprite === file.name ? "Loading..." : file.name}
                      </Button>
                    ))}
                    {asepriteFiles.length === 0 && (
                      <p className="text-xs text-slate-500 text-center py-2">No Aseprite files found</p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Export Actions */}
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Export</h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full" onClick={saveToCharacter} disabled={!selectedCharacter}>
                    <Save className="w-4 h-4 mr-2" /> Save to Character
                  </Button>
                  <Button variant="outline" className="w-full" onClick={exportSpritesheet}>
                    <Download className="w-4 h-4 mr-2" /> Export Current Animation
                  </Button>
                  <Button variant="outline" className="w-full" onClick={exportAllAnimations}>
                    <Layers className="w-4 h-4 mr-2" /> Export All Animations
                  </Button>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Sprite Sheet Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Import Sprite Sheet
            </h2>
            
            <p className="text-sm text-slate-400 mb-4">
              Import a sprite sheet image and extract individual frames. Configure the grid layout to match your sprite sheet.
            </p>
            
            {/* File Input */}
            <div className="mb-4">
              <Label className="text-slate-300 mb-2 block">Select Image File</Label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileSelect}
                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-amber-600 file:text-white file:cursor-pointer"
                data-testid="import-file-input"
              />
            </div>
            
            {/* Preview */}
            {importImageUrl && (
              <div className="mb-4 p-3 bg-slate-950 rounded-lg border border-slate-700">
                <Label className="text-slate-300 mb-2 block">Preview</Label>
                <div className="flex justify-center">
                  <img 
                    src={importImageUrl} 
                    alt="Import preview" 
                    className="max-h-48 border border-slate-600"
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>
                {importImage && (
                  <p className="text-center text-xs text-slate-500 mt-2">
                    {importImage.width} x {importImage.height} pixels
                  </p>
                )}
              </div>
            )}
            
            {/* Import Mode */}
            <div className="mb-4">
              <Label className="text-slate-300 mb-2 block">Import Mode</Label>
              <div className="flex gap-2">
                <Button
                  variant={importMode === "replace" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setImportMode("replace")}
                  className={cn(importMode === "replace" && "bg-amber-600")}
                >
                  Replace Animation
                </Button>
                <Button
                  variant={importMode === "append" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setImportMode("append")}
                  className={cn(importMode === "append" && "bg-blue-600")}
                >
                  Append Frames
                </Button>
              </div>
            </div>
            
            {/* Grid Configuration */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label className="text-slate-300 mb-2 block">Columns</Label>
                <Input
                  type="number"
                  min={1}
                  max={16}
                  value={importCols}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(16, parseInt(e.target.value) || 1));
                    setImportCols(val);
                    if (importImage && importFrameSize === "auto") {
                      setImportFrameWidth(Math.floor(importImage.width / val));
                    }
                  }}
                  className="bg-slate-800 border-slate-600"
                  data-testid="import-cols-input"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">Rows</Label>
                <Input
                  type="number"
                  min={1}
                  max={16}
                  value={importRows}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(16, parseInt(e.target.value) || 1));
                    setImportRows(val);
                    if (importImage && importFrameSize === "auto") {
                      setImportFrameHeight(Math.floor(importImage.height / val));
                    }
                  }}
                  className="bg-slate-800 border-slate-600"
                  data-testid="import-rows-input"
                />
              </div>
            </div>
            
            {/* Frame Size Mode */}
            <div className="mb-4">
              <Label className="text-slate-300 mb-2 block">Frame Size</Label>
              <div className="flex gap-2 mb-2">
                <Button
                  variant={importFrameSize === "auto" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setImportFrameSize("auto")}
                  className={cn(importFrameSize === "auto" && "bg-green-600")}
                >
                  Auto (from grid)
                </Button>
                <Button
                  variant={importFrameSize === "custom" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setImportFrameSize("custom")}
                  className={cn(importFrameSize === "custom" && "bg-purple-600")}
                >
                  Custom Size
                </Button>
              </div>
              {importFrameSize === "custom" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-400">Width (px)</Label>
                    <Input
                      type="number"
                      min={8}
                      max={512}
                      value={importFrameWidth}
                      onChange={(e) => setImportFrameWidth(Math.max(8, Math.min(512, parseInt(e.target.value) || 100)))}
                      className="bg-slate-800 border-slate-600"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Height (px)</Label>
                    <Input
                      type="number"
                      min={8}
                      max={512}
                      value={importFrameHeight}
                      onChange={(e) => setImportFrameHeight(Math.max(8, Math.min(512, parseInt(e.target.value) || 100)))}
                      className="bg-slate-800 border-slate-600"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Frame Info */}
            {importImage && (
              <div className="mb-4 p-3 bg-slate-800/50 rounded border border-slate-700">
                <p className="text-sm text-slate-400">
                  Frame size: <span className="text-white font-mono">{Math.floor(importImage.width / importCols)} x {Math.floor(importImage.height / importRows)}</span> pixels
                </p>
                <p className="text-sm text-slate-400">
                  Total frames: <span className="text-white font-mono">{importCols * importRows}</span>
                </p>
                <p className="text-sm text-slate-400">
                  Target animation: <span className="text-amber-400 font-semibold">{currentAnimation}</span>
                </p>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowImportModal(false);
                  setImportImage(null);
                  setImportImageUrl("");
                }}
              >
                Cancel
              </Button>
              <Button 
                className="bg-amber-600 hover:bg-amber-500 text-white"
                onClick={importSpriteSheet}
                disabled={!importImage}
                data-testid="import-confirm-btn"
              >
                Import {importCols * importRows} Frames
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function FrameThumbnail({ imageData }: { imageData: ImageData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.putImageData(imageData, 0, 0);
  }, [imageData]);
  
  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="w-full h-full"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
}
