import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  Download, 
  Upload, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Wand2,
  Layers,
  Sparkles,
  Sword,
  Shield,
  Heart,
  Skull,
  Footprints,
  Zap,
  FlaskConical,
  Eye,
  Crown,
  Swords,
  Star
} from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AnimationState, 
  ANIMATION_CONFIGS, 
  loadImage, 
  generateAnimationFrames,
  generateSpriteSheet,
  generateAllAnimations,
  exportSpriteSheetAsImage
} from "@/lib/spriteAnimationEngine";

interface LoadedSprite {
  id: string;
  name: string;
  src: string;
  image?: HTMLImageElement;
}

const PRESET_SPRITES: LoadedSprite[] = [
  { id: "footman", name: "Footman", src: "/sprites/characters/footman_1766725464387.png" },
  { id: "necro", name: "Necromancer", src: "/sprites/characters/necro_1766725464388.png" },
  { id: "grunt", name: "Orc Grunt", src: "/sprites/characters/grunt_1766725464389.png" },
  { id: "knight", name: "Knight", src: "/sprites/characters/Knights_1766725464389.png" },
  { id: "tank", name: "Armored Tank", src: "/sprites/characters/armoredtank_1766725464389.png" },
  { id: "bowyer", name: "Bowyer", src: "/sprites/characters/bowyer_1766725464390.png" },
  { id: "blacksmith", name: "Blacksmith", src: "/sprites/characters/Blacksmith_1766725464390.png" },
];

const ANIMATION_ICONS: Record<AnimationState, React.ReactNode> = {
  idle: <Star className="w-4 h-4" />,
  attack1: <Sword className="w-4 h-4" />,
  attack2: <Swords className="w-4 h-4" />,
  cast: <Wand2 className="w-4 h-4" />,
  victory: <Crown className="w-4 h-4" />,
  death: <Skull className="w-4 h-4" />,
  walk: <Footprints className="w-4 h-4" />,
  hurt: <Heart className="w-4 h-4" />,
  buffed: <Sparkles className="w-4 h-4" />,
  poisoned: <FlaskConical className="w-4 h-4" />,
  stealth: <Eye className="w-4 h-4" />,
  shielded: <Shield className="w-4 h-4" />,
  combo: <Zap className="w-4 h-4" />
};

const ANIMATION_COLORS: Record<AnimationState, string> = {
  idle: "bg-slate-500",
  attack1: "bg-orange-500",
  attack2: "bg-red-500",
  cast: "bg-blue-500",
  victory: "bg-yellow-500",
  death: "bg-gray-700",
  walk: "bg-green-500",
  hurt: "bg-rose-500",
  buffed: "bg-amber-400",
  poisoned: "bg-emerald-600",
  stealth: "bg-purple-600",
  shielded: "bg-cyan-500",
  combo: "bg-orange-600"
};

export default function SpriteEnginePage() {
  const [sprites, setSprites] = useState<LoadedSprite[]>(PRESET_SPRITES);
  const [selectedSprite, setSelectedSprite] = useState<LoadedSprite | null>(null);
  const [selectedAnimation, setSelectedAnimation] = useState<AnimationState>("idle");
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [generatedFrames, setGeneratedFrames] = useState<string[]>([]);
  const [spriteSheet, setSpriteSheet] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [frameSize, setFrameSize] = useState(128);
  const [allAnimations, setAllAnimations] = useState<Record<AnimationState, { spriteSheet: string; frames: string[] }> | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number>(0);

  const config = ANIMATION_CONFIGS[selectedAnimation];

  const loadSelectedSprite = useCallback(async () => {
    if (!selectedSprite) return;
    
    try {
      const img = await loadImage(selectedSprite.src);
      setSelectedSprite(prev => prev ? { ...prev, image: img } : null);
    } catch (error) {
      console.error("Failed to load sprite:", error);
    }
  }, [selectedSprite?.src]);

  useEffect(() => {
    loadSelectedSprite();
  }, [selectedSprite?.id]);

  const generateFramesForAnimation = useCallback(async () => {
    if (!selectedSprite?.image) return;
    
    setIsGenerating(true);
    try {
      const frames = await generateAnimationFrames(
        selectedSprite.image,
        selectedAnimation,
        frameSize,
        frameSize
      );
      setGeneratedFrames(frames);
      
      const sheet = await generateSpriteSheet(
        selectedSprite.image,
        selectedAnimation,
        frameSize,
        frameSize
      );
      setSpriteSheet(sheet);
      setCurrentFrame(0);
    } catch (error) {
      console.error("Failed to generate frames:", error);
    }
    setIsGenerating(false);
  }, [selectedSprite?.image, selectedAnimation, frameSize]);

  useEffect(() => {
    if (selectedSprite?.image) {
      generateFramesForAnimation();
    }
  }, [selectedSprite?.image, selectedAnimation, frameSize]);

  useEffect(() => {
    if (!isPlaying || generatedFrames.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentFrame(prev => {
        const next = prev + 1;
        if (next >= generatedFrames.length) {
          if (!config.loop) {
            setIsPlaying(false);
            return prev;
          }
          return 0;
        }
        return next;
      });
    }, config.frameDuration / playbackSpeed);
    
    return () => clearInterval(interval);
  }, [isPlaying, generatedFrames.length, config.frameDuration, config.loop, playbackSpeed]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const newSprite: LoadedSprite = {
        id: `custom-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        src
      };
      setSprites(prev => [...prev, newSprite]);
      setSelectedSprite(newSprite);
    };
    reader.readAsDataURL(file);
  };

  const generateAllForSprite = async () => {
    if (!selectedSprite?.image) return;
    
    setIsGenerating(true);
    try {
      const all = await generateAllAnimations(selectedSprite.src, frameSize, frameSize);
      setAllAnimations(all);
    } catch (error) {
      console.error("Failed to generate all animations:", error);
    }
    setIsGenerating(false);
  };

  const exportCurrentSheet = () => {
    if (!spriteSheet) return;
    exportSpriteSheetAsImage(spriteSheet, `${selectedSprite?.name || 'sprite'}-${selectedAnimation}.png`);
  };

  const exportAllSheets = () => {
    if (!allAnimations) return;
    
    Object.entries(allAnimations).forEach(([animation, data]) => {
      exportSpriteSheetAsImage(data.spriteSheet, `${selectedSprite?.name || 'sprite'}-${animation}.png`);
    });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl md:text-4xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-2">
            Sprite Animation Engine
          </h1>
          <p className="text-slate-400">
            Create animated sprites with 13 animation states: idle, attack, cast, death, and more
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3">
            <Card className="bg-slate-800/50 border-slate-700" data-testid="sprite-library-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  Sprite Library
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full mb-4 border-dashed border-slate-600 hover:border-amber-500"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-sprite"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Sprite
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                
                <ScrollArea className="h-[400px]">
                  <div className="grid grid-cols-2 gap-2">
                    {sprites.map((sprite) => (
                      <motion.div
                        key={sprite.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedSprite(sprite)}
                        className={`cursor-pointer rounded-lg border-2 p-2 transition-colors ${
                          selectedSprite?.id === sprite.id
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-slate-700 hover:border-slate-500'
                        }`}
                        data-testid={`sprite-card-${sprite.id}`}
                      >
                        <div className="aspect-square bg-slate-900/50 rounded overflow-hidden mb-2 flex items-center justify-center">
                          <img
                            src={sprite.src}
                            alt={sprite.name}
                            className="max-w-full max-h-full object-contain"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        </div>
                        <p className="text-xs text-center text-slate-300 truncate">{sprite.name}</p>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-6">
            <Card className="bg-slate-800/50 border-slate-700" data-testid="preview-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    Animation Preview
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-slate-600">
                      {config.displayName}
                    </Badge>
                    <Badge variant="outline" className="border-slate-600">
                      Frame {currentFrame + 1}/{generatedFrames.length || config.frameCount}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center">
                  <div 
                    className="relative bg-slate-900 rounded-xl border border-slate-700 mb-6 overflow-hidden"
                    style={{ width: 256, height: 256 }}
                    data-testid="animation-preview"
                  >
                    {isGenerating ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                      </div>
                    ) : generatedFrames.length > 0 ? (
                      <motion.img
                        key={currentFrame}
                        src={generatedFrames[currentFrame]}
                        alt={`Frame ${currentFrame}`}
                        className="w-full h-full object-contain"
                        style={{ imageRendering: 'pixelated' }}
                        initial={{ opacity: 0.8 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.05 }}
                      />
                    ) : selectedSprite ? (
                      <img
                        src={selectedSprite.src}
                        alt={selectedSprite.name}
                        className="w-full h-full object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                        Select a sprite to begin
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mb-6">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentFrame(prev => Math.max(0, prev - 1))}
                      disabled={!generatedFrames.length}
                      data-testid="button-prev-frame"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant={isPlaying ? "destructive" : "default"}
                      size="lg"
                      onClick={() => {
                        if (!isPlaying && currentFrame >= generatedFrames.length - 1) {
                          setCurrentFrame(0);
                        }
                        setIsPlaying(!isPlaying);
                      }}
                      disabled={!generatedFrames.length}
                      className="px-8"
                      data-testid="button-play-pause"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Play
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentFrame(prev => Math.min(generatedFrames.length - 1, prev + 1))}
                      disabled={!generatedFrames.length}
                      data-testid="button-next-frame"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="w-full space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-slate-400 w-20">Speed:</span>
                      <Slider
                        value={[playbackSpeed]}
                        onValueChange={([v]) => setPlaybackSpeed(v)}
                        min={0.25}
                        max={3}
                        step={0.25}
                        className="flex-1"
                        data-testid="slider-speed"
                      />
                      <span className="text-sm text-slate-300 w-12">{playbackSpeed}x</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-slate-400 w-20">Frame Size:</span>
                      <Slider
                        value={[frameSize]}
                        onValueChange={([v]) => setFrameSize(v)}
                        min={64}
                        max={256}
                        step={16}
                        className="flex-1"
                        data-testid="slider-frame-size"
                      />
                      <span className="text-sm text-slate-300 w-12">{frameSize}px</span>
                    </div>
                  </div>

                  {spriteSheet && (
                    <div className="mt-6 w-full">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">Sprite Sheet Preview</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={exportCurrentSheet}
                          data-testid="button-export-sheet"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </div>
                      <div className="bg-slate-900 rounded-lg p-2 overflow-x-auto">
                        <img
                          src={spriteSheet}
                          alt="Sprite sheet"
                          className="h-24 object-contain"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {allAnimations && (
              <Card className="bg-slate-800/50 border-slate-700 mt-6" data-testid="all-animations-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">All Generated Animations</CardTitle>
                    <Button variant="outline" size="sm" onClick={exportAllSheets} data-testid="button-export-all">
                      <Download className="w-4 h-4 mr-2" />
                      Export All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(allAnimations).map(([anim, data]) => (
                      <div key={anim} className="bg-slate-900/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          {ANIMATION_ICONS[anim as AnimationState]}
                          <span className="text-sm font-medium capitalize">{anim}</span>
                        </div>
                        <div className="aspect-square bg-slate-950 rounded overflow-hidden">
                          <AnimatedPreview frames={data.frames} config={ANIMATION_CONFIGS[anim as AnimationState]} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-3">
            <Card className="bg-slate-800/50 border-slate-700" data-testid="animations-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-amber-400" />
                  Animation States
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[450px]">
                  <div className="space-y-2">
                    {(Object.keys(ANIMATION_CONFIGS) as AnimationState[]).map((anim) => {
                      const animConfig = ANIMATION_CONFIGS[anim];
                      return (
                        <motion.button
                          key={anim}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedAnimation(anim)}
                          className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                            selectedAnimation === anim
                              ? 'border-amber-500 bg-amber-500/10'
                              : 'border-slate-700 hover:border-slate-500 bg-slate-900/30'
                          }`}
                          data-testid={`button-animation-${anim}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded ${ANIMATION_COLORS[anim]}`}>
                              {ANIMATION_ICONS[anim]}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-slate-200">{animConfig.displayName}</p>
                              <p className="text-xs text-slate-500">
                                {animConfig.frameCount} frames · {animConfig.loop ? 'Looping' : 'Once'}
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </ScrollArea>

                <div className="mt-4 space-y-2">
                  <Button
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                    onClick={generateFramesForAnimation}
                    disabled={!selectedSprite || isGenerating}
                    data-testid="button-generate-current"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Animation
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={generateAllForSprite}
                    disabled={!selectedSprite || isGenerating}
                    data-testid="button-generate-all"
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    Generate All Animations
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 mt-4" data-testid="animation-info-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Animation Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Frame Count:</span>
                  <span className="text-slate-200">{config.frameCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Frame Duration:</span>
                  <span className="text-slate-200">{config.frameDuration}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Duration:</span>
                  <span className="text-slate-200">{config.frameCount * config.frameDuration}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Loop:</span>
                  <span className="text-slate-200">{config.loop ? 'Yes' : 'No'}</span>
                </div>
                {config.overlay && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Effect:</span>
                    <span className="text-slate-200 capitalize">{config.overlay.type}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function AnimatedPreview({ frames, config }: { frames: string[]; config: typeof ANIMATION_CONFIGS[AnimationState] }) {
  const [frame, setFrame] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(prev => {
        const next = prev + 1;
        if (next >= frames.length) {
          return config.loop ? 0 : prev;
        }
        return next;
      });
    }, config.frameDuration);
    
    return () => clearInterval(interval);
  }, [frames.length, config.frameDuration, config.loop]);
  
  if (frames.length === 0) return null;
  
  return (
    <img
      src={frames[frame]}
      alt="Animation preview"
      className="w-full h-full object-contain"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
