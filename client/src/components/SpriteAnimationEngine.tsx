import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { 
  Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight,
  Plus, Trash2, Copy, Download, Layers, Eye, EyeOff, RotateCcw,
  Maximize2, ZoomIn, ZoomOut, Film, Image as ImageIcon
} from "lucide-react";

// Animation motion types (inspired by godmodeanimation)
export const MOTION_TYPES = [
  { id: "idle", name: "Idle", frames: 4, description: "Standing still, breathing animation" },
  { id: "walk", name: "Walk", frames: 8, description: "Walking cycle animation" },
  { id: "run", name: "Run", frames: 6, description: "Running cycle animation" },
  { id: "jump", name: "Jump", frames: 6, description: "Jumping arc animation" },
  { id: "attack", name: "Attack", frames: 6, description: "Basic melee attack" },
  { id: "sword_wield", name: "Sword Wield", frames: 8, description: "Sword slash combo" },
  { id: "spin_kick", name: "Spin Kick", frames: 10, description: "Spinning kick attack" },
  { id: "cast", name: "Cast Spell", frames: 8, description: "Magic casting animation" },
  { id: "hurt", name: "Hurt", frames: 4, description: "Taking damage reaction" },
  { id: "death", name: "Death", frames: 8, description: "Death/defeat animation" },
  { id: "block", name: "Block", frames: 4, description: "Defensive blocking stance" },
] as const;

export type MotionType = typeof MOTION_TYPES[number]["id"];

export interface AnimationFrame {
  id: string;
  imageData: ImageData | null;
  duration: number; // ms per frame
  anchor: { x: number; y: number }; // pivot point for rotation
}

export interface AnimationLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  frames: AnimationFrame[];
}

export interface AnimationProject {
  name: string;
  width: number;
  height: number;
  fps: number;
  layers: AnimationLayer[];
  motions: Record<MotionType, AnimationFrame[]>;
  currentMotion: MotionType;
}

interface SpriteAnimationEngineProps {
  width?: number;
  height?: number;
  onFrameChange?: (frame: AnimationFrame | null, frameIndex: number) => void;
  onAnimationChange?: (motion: MotionType, frames: AnimationFrame[]) => void;
  onMotionsUpdate?: (motions: Record<MotionType, AnimationFrame[]>) => void;
  onExport?: (type: "spritesheet" | "gif" | "frames", data: string | string[]) => void;
  initialProject?: Partial<AnimationProject>;
}

export function SpriteAnimationEngine({
  width = 100,
  height = 100,
  onFrameChange,
  onAnimationChange,
  onMotionsUpdate,
  onExport,
  initialProject
}: SpriteAnimationEngineProps) {
  // Animation state
  const [currentMotion, setCurrentMotion] = useState<MotionType>(initialProject?.currentMotion || "idle");
  const [motions, setMotions] = useState<Record<MotionType, AnimationFrame[]>>(() => {
    const initial: Record<string, AnimationFrame[]> = {};
    MOTION_TYPES.forEach(motion => {
      initial[motion.id] = initialProject?.motions?.[motion.id as MotionType] || 
        Array.from({ length: motion.frames }, (_, i) => ({
          id: `${motion.id}-${i}`,
          imageData: null,
          duration: Math.round(1000 / 12), // 12 FPS default
          anchor: { x: width / 2, y: height / 2 }
        }));
    });
    return initial as Record<MotionType, AnimationFrame[]>;
  });
  
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(initialProject?.fps || 12);
  const [loop, setLoop] = useState(true);
  const [pingPong, setPingPong] = useState(false);
  const [playDirection, setPlayDirection] = useState<1 | -1>(1);
  
  // Display options
  const [zoom, setZoom] = useState(4);
  const [showOnionSkin, setShowOnionSkin] = useState(false);
  const [onionSkinFrames, setOnionSkinFrames] = useState(2);
  const [onionSkinOpacity, setOnionSkinOpacity] = useState(0.3);
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(8);
  
  // Refs
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const lastFrameTimeRef = useRef<number>(0);
  
  const currentFrames = motions[currentMotion];
  const currentFrame = currentFrames[currentFrameIndex];
  
  // Animation playback
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }
    
    const frameDuration = 1000 / fps;
    
    const animate = (timestamp: number) => {
      if (timestamp - lastFrameTimeRef.current >= frameDuration) {
        lastFrameTimeRef.current = timestamp;
        
        setCurrentFrameIndex(prev => {
          const nextIndex = prev + playDirection;
          
          if (pingPong) {
            if (nextIndex >= currentFrames.length) {
              setPlayDirection(-1);
              return prev - 1;
            } else if (nextIndex < 0) {
              setPlayDirection(1);
              return 1;
            }
            return nextIndex;
          }
          
          if (nextIndex >= currentFrames.length) {
            if (loop) return 0;
            setIsPlaying(false);
            return prev;
          }
          
          return nextIndex;
        });
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, fps, currentFrames.length, loop, pingPong, playDirection]);
  
  // Render preview with onion skinning
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    
    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = "rgba(100, 100, 100, 0.2)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
    
    // Draw onion skin (previous frames)
    if (showOnionSkin) {
      for (let i = onionSkinFrames; i > 0; i--) {
        const prevIndex = currentFrameIndex - i;
        if (prevIndex >= 0 && currentFrames[prevIndex]?.imageData) {
          ctx.globalAlpha = onionSkinOpacity * (1 - i / (onionSkinFrames + 1));
          ctx.putImageData(currentFrames[prevIndex].imageData!, 0, 0);
        }
      }
      
      // Draw onion skin (next frames) in different color
      for (let i = 1; i <= onionSkinFrames; i++) {
        const nextIndex = currentFrameIndex + i;
        if (nextIndex < currentFrames.length && currentFrames[nextIndex]?.imageData) {
          ctx.globalAlpha = onionSkinOpacity * (1 - i / (onionSkinFrames + 1));
          ctx.putImageData(currentFrames[nextIndex].imageData!, 0, 0);
        }
      }
      
      ctx.globalAlpha = 1;
    }
    
    // Draw current frame
    if (currentFrame?.imageData) {
      ctx.putImageData(currentFrame.imageData, 0, 0);
    }
  }, [currentFrame, currentFrameIndex, currentFrames, showOnionSkin, onionSkinFrames, onionSkinOpacity, showGrid, gridSize, width, height]);
  
  // Frame change callback
  useEffect(() => {
    onFrameChange?.(currentFrame, currentFrameIndex);
  }, [currentFrame, currentFrameIndex, onFrameChange]);
  
  // Motion change callback - only fire when motion type changes, not frame data
  const prevMotionRef = useRef(currentMotion);
  useEffect(() => {
    if (prevMotionRef.current !== currentMotion) {
      prevMotionRef.current = currentMotion;
      onAnimationChange?.(currentMotion, currentFrames);
    }
  }, [currentMotion, currentFrames, onAnimationChange]);
  
  // Motions update callback - fire whenever motions reference changes
  // Using debounced callback to batch rapid updates
  const motionsUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    // Skip initial render to avoid loop on mount
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    
    // Debounce to avoid rapid updates during animation playback
    if (motionsUpdateTimeoutRef.current) {
      clearTimeout(motionsUpdateTimeoutRef.current);
    }
    motionsUpdateTimeoutRef.current = setTimeout(() => {
      onMotionsUpdate?.(motions);
    }, 150);
    
    return () => {
      if (motionsUpdateTimeoutRef.current) {
        clearTimeout(motionsUpdateTimeoutRef.current);
      }
    };
  }, [motions, onMotionsUpdate]);
  
  // Timeline controls
  const goToStart = () => {
    setCurrentFrameIndex(0);
    setPlayDirection(1);
  };
  
  const goToEnd = () => {
    setCurrentFrameIndex(currentFrames.length - 1);
  };
  
  const prevFrame = () => {
    setCurrentFrameIndex(prev => Math.max(0, prev - 1));
  };
  
  const nextFrame = () => {
    setCurrentFrameIndex(prev => Math.min(currentFrames.length - 1, prev + 1));
  };
  
  const addFrame = useCallback(() => {
    setMotions(prev => {
      const updated = { ...prev };
      const frames = [...updated[currentMotion]];
      const newFrame: AnimationFrame = {
        id: `${currentMotion}-${Date.now()}`,
        imageData: null,
        duration: Math.round(1000 / fps),
        anchor: { x: width / 2, y: height / 2 }
      };
      frames.splice(currentFrameIndex + 1, 0, newFrame);
      updated[currentMotion] = frames;
      return updated;
    });
    setCurrentFrameIndex(prev => prev + 1);
  }, [currentMotion, currentFrameIndex, fps, width, height]);
  
  const duplicateFrame = useCallback(() => {
    if (!currentFrame?.imageData) return;
    
    const newImageData = new ImageData(
      new Uint8ClampedArray(currentFrame.imageData.data),
      currentFrame.imageData.width,
      currentFrame.imageData.height
    );
    
    setMotions(prev => {
      const updated = { ...prev };
      const frames = [...updated[currentMotion]];
      const newFrame: AnimationFrame = {
        id: `${currentMotion}-${Date.now()}`,
        imageData: newImageData,
        duration: currentFrame.duration,
        anchor: { ...currentFrame.anchor }
      };
      frames.splice(currentFrameIndex + 1, 0, newFrame);
      updated[currentMotion] = frames;
      return updated;
    });
    setCurrentFrameIndex(prev => prev + 1);
  }, [currentMotion, currentFrameIndex, currentFrame]);
  
  const deleteFrame = useCallback(() => {
    if (currentFrames.length <= 1) return;
    
    setMotions(prev => {
      const updated = { ...prev };
      const frames = [...updated[currentMotion]];
      frames.splice(currentFrameIndex, 1);
      updated[currentMotion] = frames;
      return updated;
    });
    setCurrentFrameIndex(prev => Math.min(prev, currentFrames.length - 2));
  }, [currentMotion, currentFrameIndex, currentFrames.length]);
  
  const clearAllFrames = useCallback(() => {
    const motionInfo = MOTION_TYPES.find(m => m.id === currentMotion);
    if (!motionInfo) return;
    
    setMotions(prev => {
      const updated = { ...prev };
      updated[currentMotion] = Array.from({ length: motionInfo.frames }, (_, i) => ({
        id: `${currentMotion}-${Date.now()}-${i}`,
        imageData: null,
        duration: Math.round(1000 / fps),
        anchor: { x: width / 2, y: height / 2 }
      }));
      return updated;
    });
    setCurrentFrameIndex(0);
  }, [currentMotion, fps, width, height]);
  
  // Update frame from external source
  const updateCurrentFrame = useCallback((imageData: ImageData) => {
    setMotions(prev => {
      const updated = { ...prev };
      const frames = [...updated[currentMotion]];
      frames[currentFrameIndex] = {
        ...frames[currentFrameIndex],
        imageData
      };
      updated[currentMotion] = frames;
      return updated;
    });
  }, [currentMotion, currentFrameIndex]);
  
  // Export functions
  const exportSpritesheet = useCallback(() => {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = width * currentFrames.length;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;
    
    ctx.imageSmoothingEnabled = false;
    
    currentFrames.forEach((frame, i) => {
      if (frame.imageData) {
        ctx.putImageData(frame.imageData, i * width, 0);
      }
    });
    
    const dataUrl = exportCanvas.toDataURL("image/png");
    onExport?.("spritesheet", dataUrl);
    
    // Also trigger download
    const link = document.createElement("a");
    link.download = `${currentMotion}-spritesheet.png`;
    link.href = dataUrl;
    link.click();
  }, [currentFrames, currentMotion, width, height, onExport]);
  
  const exportGif = useCallback(async () => {
    // Create animated GIF using canvas frames
    const frameDataUrls: string[] = [];
    
    currentFrames.forEach(frame => {
      if (frame.imageData) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = width;
        tempCanvas.height = height;
        const ctx = tempCanvas.getContext("2d");
        if (ctx) {
          ctx.putImageData(frame.imageData, 0, 0);
          frameDataUrls.push(tempCanvas.toDataURL("image/png"));
        }
      }
    });
    
    onExport?.("frames", frameDataUrls);
    alert(`Exported ${frameDataUrls.length} frames for GIF conversion`);
  }, [currentFrames, width, height, onExport]);
  
  const changeMotion = (motion: MotionType) => {
    setCurrentMotion(motion);
    setCurrentFrameIndex(0);
    setIsPlaying(false);
  };
  
  return (
    <div className="flex flex-col gap-3 bg-slate-900 rounded-lg border border-slate-700 p-3">
      {/* Motion Type Selector */}
      <div className="flex items-center gap-2">
        <Label className="text-xs text-slate-400 whitespace-nowrap">Motion:</Label>
        <Select value={currentMotion} onValueChange={(v) => changeMotion(v as MotionType)}>
          <SelectTrigger className="bg-slate-800 border-slate-600 h-8 text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MOTION_TYPES.map(motion => (
              <SelectItem key={motion.id} value={motion.id} className="text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{motion.name}</span>
                  <span className="text-slate-500">({motions[motion.id as MotionType]?.length || 0}f)</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Preview Canvas */}
      <div className="flex items-center justify-center bg-slate-950 rounded-lg p-2 relative">
        <div 
          className="border border-slate-700 relative"
          style={{ 
            backgroundImage: 'repeating-conic-gradient(#333 0% 25%, #222 0% 50%)',
            backgroundSize: `${8 * zoom}px ${8 * zoom}px`
          }}
        >
          <canvas
            ref={previewCanvasRef}
            width={width}
            height={height}
            style={{ 
              width: width * zoom, 
              height: height * zoom,
              imageRendering: "pixelated"
            }}
          />
        </div>
        
        {/* Zoom controls */}
        <div className="absolute top-1 right-1 flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(z => Math.max(1, z - 1))}>
            <ZoomOut className="w-3 h-3" />
          </Button>
          <span className="text-xs text-slate-400 self-center">{zoom}x</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(z => Math.min(8, z + 1))}>
            <ZoomIn className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToStart} data-testid="anim-go-start">
          <SkipBack className="w-3 h-3" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={prevFrame} data-testid="anim-prev-frame">
          <ChevronLeft className="w-3 h-3" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className={cn("h-8 w-8", isPlaying && "bg-amber-600 border-amber-500")} 
          onClick={() => setIsPlaying(!isPlaying)}
          data-testid="anim-play-pause"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={nextFrame} data-testid="anim-next-frame">
          <ChevronRight className="w-3 h-3" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToEnd} data-testid="anim-go-end">
          <SkipForward className="w-3 h-3" />
        </Button>
        
        <div className="w-px h-6 bg-slate-700 mx-2" />
        
        <div className="flex items-center gap-1">
          <Label className="text-xs text-slate-400">FPS:</Label>
          <Input
            type="number"
            value={fps}
            onChange={(e) => setFps(Math.max(1, Math.min(60, parseInt(e.target.value) || 12)))}
            className="w-12 h-7 text-xs bg-slate-800 border-slate-600 text-center"
            data-testid="anim-fps-input"
          />
        </div>
        
        <div className="flex items-center gap-1 ml-2">
          <Switch 
            id="loop" 
            checked={loop} 
            onCheckedChange={setLoop} 
            className="scale-75"
          />
          <Label htmlFor="loop" className="text-xs text-slate-400 cursor-pointer">Loop</Label>
        </div>
      </div>
      
      {/* Timeline */}
      <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400">
            Frame {currentFrameIndex + 1} / {currentFrames.length}
          </span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={addFrame} title="Add Frame" data-testid="anim-add-frame">
              <Plus className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={duplicateFrame} title="Duplicate Frame" data-testid="anim-dup-frame">
              <Copy className="w-3 h-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={deleteFrame} 
              disabled={currentFrames.length <= 1}
              title="Delete Frame"
              data-testid="anim-del-frame"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearAllFrames} title="Reset Animation" data-testid="anim-reset">
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Frame thumbnails */}
        <div 
          ref={timelineRef}
          className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-600"
          data-testid="anim-timeline"
        >
          {currentFrames.map((frame, i) => (
            <div
              key={frame.id}
              onClick={() => setCurrentFrameIndex(i)}
              className={cn(
                "flex-shrink-0 w-12 h-12 bg-slate-900 border-2 rounded cursor-pointer transition-all hover:scale-105",
                currentFrameIndex === i 
                  ? "border-amber-500 ring-1 ring-amber-500/50" 
                  : "border-slate-600 hover:border-slate-500"
              )}
              data-testid={`anim-frame-${i}`}
            >
              {frame.imageData ? (
                <FramePreview imageData={frame.imageData} width={width} height={height} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  <ImageIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Display Options */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <Switch 
            id="onionSkin" 
            checked={showOnionSkin} 
            onCheckedChange={setShowOnionSkin}
            className="scale-75"
          />
          <Label htmlFor="onionSkin" className="text-slate-400 cursor-pointer flex items-center gap-1">
            <Layers className="w-3 h-3" /> Onion Skin
          </Label>
        </div>
        
        {showOnionSkin && (
          <div className="flex items-center gap-1">
            <Label className="text-slate-500">Frames:</Label>
            <Input
              type="number"
              value={onionSkinFrames}
              onChange={(e) => setOnionSkinFrames(Math.max(1, Math.min(5, parseInt(e.target.value) || 2)))}
              className="w-10 h-6 text-xs bg-slate-800 border-slate-600 text-center"
            />
          </div>
        )}
        
        <div className="flex items-center gap-1">
          <Switch 
            id="grid" 
            checked={showGrid} 
            onCheckedChange={setShowGrid}
            className="scale-75"
          />
          <Label htmlFor="grid" className="text-slate-400 cursor-pointer">Grid</Label>
        </div>
      </div>
      
      {/* Export Buttons */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 h-8 text-xs"
          onClick={exportSpritesheet}
          data-testid="anim-export-sheet"
        >
          <ImageIcon className="w-3 h-3 mr-1" /> Export Spritesheet
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 h-8 text-xs"
          onClick={exportGif}
          data-testid="anim-export-gif"
        >
          <Film className="w-3 h-3 mr-1" /> Export Frames
        </Button>
      </div>
    </div>
  );
}

// Frame preview thumbnail component
function FramePreview({ imageData, width, height }: { imageData: ImageData; width: number; height: number }) {
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
      width={width}
      height={height}
      className="w-full h-full"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

export default SpriteAnimationEngine;
