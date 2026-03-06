import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCw,
  Grid3X3,
  Layers,
  Palette,
  Sparkles,
} from "lucide-react";

type TemplateSize = "16x16" | "16x32";
type AnimationType = "Idle" | "Walk" | "Run" | "Jump" | "Interact" | "Rotate";

interface TemplateConfig {
  size: TemplateSize;
  animation: AnimationType;
  frameCount: number;
  directions: number;
}

const TEMPLATE_CONFIGS: Record<TemplateSize, Record<AnimationType, TemplateConfig>> = {
  "16x16": {
    Idle: { size: "16x16", animation: "Idle", frameCount: 4, directions: 8 },
    Walk: { size: "16x16", animation: "Walk", frameCount: 6, directions: 8 },
    Run: { size: "16x16", animation: "Run", frameCount: 6, directions: 8 },
    Jump: { size: "16x16", animation: "Jump", frameCount: 6, directions: 8 },
    Interact: { size: "16x16", animation: "Interact", frameCount: 4, directions: 8 },
    Rotate: { size: "16x16", animation: "Rotate", frameCount: 8, directions: 1 },
  },
  "16x32": {
    Idle: { size: "16x32", animation: "Idle", frameCount: 4, directions: 8 },
    Walk: { size: "16x32", animation: "Walk", frameCount: 6, directions: 8 },
    Run: { size: "16x32", animation: "Run", frameCount: 6, directions: 8 },
    Jump: { size: "16x32", animation: "Jump", frameCount: 6, directions: 8 },
    Interact: { size: "16x32", animation: "Interact", frameCount: 4, directions: 8 },
    Rotate: { size: "16x32", animation: "Rotate", frameCount: 8, directions: 1 },
  },
};

const DIRECTION_LABELS = ["Down", "Down-Left", "Left", "Up-Left", "Up", "Up-Right", "Right", "Down-Right"];

export default function TemplateViewerPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [templateSize, setTemplateSize] = useState<TemplateSize>("16x32");
  const [animation, setAnimation] = useState<AnimationType>("Idle");
  const [direction, setDirection] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [fps, setFps] = useState(8);
  const [scale, setScale] = useState(8);
  const [spriteImage, setSpriteImage] = useState<HTMLImageElement | null>(null);
  const [showGrid, setShowGrid] = useState(true);

  const config = TEMPLATE_CONFIGS[templateSize][animation];
  const frameWidth = parseInt(templateSize.split("x")[0]);
  const frameHeight = parseInt(templateSize.split("x")[1]);

  useEffect(() => {
    const img = new Image();
    img.src = `/sprites/templates/eris/${templateSize}/${templateSize} ${animation}-Sheet.png`;
    img.onload = () => setSpriteImage(img);
    img.onerror = () => {
      const allImg = new Image();
      allImg.src = `/sprites/templates/eris/${templateSize}/${templateSize} All Animations.png`;
      allImg.onload = () => setSpriteImage(allImg);
    };
  }, [templateSize, animation]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % config.frameCount);
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [isPlaying, fps, config.frameCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !spriteImage) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const displayWidth = frameWidth * scale;
    const displayHeight = frameHeight * scale;
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    const srcX = currentFrame * frameWidth;
    const srcY = config.directions > 1 ? direction * frameHeight : 0;

    ctx.drawImage(
      spriteImage,
      srcX, srcY, frameWidth, frameHeight,
      0, 0, displayWidth, displayHeight
    );

    if (showGrid) {
      ctx.strokeStyle = "rgba(100, 200, 255, 0.3)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= displayWidth; x += scale) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, displayHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= displayHeight; y += scale) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(displayWidth, y);
        ctx.stroke();
      }
    }
  }, [spriteImage, currentFrame, direction, scale, showGrid, frameWidth, frameHeight, config.directions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-6">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/sprite-generator">
            <Button variant="ghost" size="sm" className="text-cyan-200 hover:text-cyan-100" data-testid="link-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-cyan-200 font-['Cinzel']">Eris Character Templates</h1>
            <p className="text-cyan-100/70 text-sm">8-direction character templates for AI sprite generation</p>
          </div>
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/50">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Ready
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-slate-800/50 border-cyan-900/30">
            <CardHeader>
              <CardTitle className="text-cyan-200 flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Template Settings
              </CardTitle>
              <CardDescription className="text-slate-400">Configure template display</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-cyan-100">Template Size</Label>
                <Select value={templateSize} onValueChange={(v) => setTemplateSize(v as TemplateSize)}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-700" data-testid="select-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16x16">16x16 (Compact)</SelectItem>
                    <SelectItem value="16x32">16x32 (Tall)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-cyan-100">Animation</Label>
                <Select value={animation} onValueChange={(v) => setAnimation(v as AnimationType)}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-700" data-testid="select-animation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Idle">Idle</SelectItem>
                    <SelectItem value="Walk">Walk</SelectItem>
                    <SelectItem value="Run">Run</SelectItem>
                    <SelectItem value="Jump">Jump</SelectItem>
                    <SelectItem value="Interact">Interact</SelectItem>
                    <SelectItem value="Rotate">Rotate (All Directions)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.directions > 1 && (
                <div className="space-y-2">
                  <Label className="text-cyan-100">Direction: {DIRECTION_LABELS[direction]}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[7, 4, 5, 2, -1, 6, 1, 0, 3].map((d, i) => (
                      d === -1 ? <div key={i} /> : (
                        <Button
                          key={d}
                          variant={direction === d ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDirection(d)}
                          className={direction === d ? "bg-cyan-600" : ""}
                          data-testid={`btn-direction-${d}`}
                        >
                          {["↓", "↙", "←", "↖", "↑", "↗", "→", "↘"][d]}
                        </Button>
                      )
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-cyan-100">Playback Speed: {fps} FPS</Label>
                <Slider
                  value={[fps]}
                  onValueChange={([v]) => setFps(v)}
                  min={1}
                  max={24}
                  step={1}
                  className="py-2"
                  data-testid="slider-fps"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-cyan-100">Display Scale: {scale}x</Label>
                <Slider
                  value={[scale]}
                  onValueChange={([v]) => setScale(v)}
                  min={2}
                  max={16}
                  step={1}
                  className="py-2"
                  data-testid="slider-scale"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex-1"
                  data-testid="btn-play-pause"
                >
                  {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGrid(!showGrid)}
                  className={showGrid ? "bg-cyan-600/20" : ""}
                  data-testid="btn-grid"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentFrame(0)}
                  data-testid="btn-reset"
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 bg-slate-800/50 border-cyan-900/30">
            <CardHeader>
              <CardTitle className="text-cyan-200 flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Template Preview
              </CardTitle>
              <CardDescription className="text-slate-400">
                Frame {currentFrame + 1} of {config.frameCount} | {templateSize} | {animation}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-6">
                <div className="bg-slate-900/80 rounded-lg p-8 border border-cyan-900/30">
                  <canvas
                    ref={canvasRef}
                    className="border border-cyan-500/30 rounded"
                    style={{ imageRendering: "pixelated" }}
                    data-testid="canvas-preview"
                  />
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-cyan-200 font-semibold">Color Coding Guide</h3>
                  <div className="flex flex-wrap justify-center gap-3 text-xs">
                    <Badge className="bg-blue-500/30 text-blue-200">Blue = Body Parts</Badge>
                    <Badge className="bg-cyan-500/30 text-cyan-200">Cyan = Outlines</Badge>
                    <Badge className="bg-purple-500/30 text-purple-200">Purple = Effects</Badge>
                    <Badge className="bg-amber-500/30 text-amber-200">Amber = Weapons</Badge>
                  </div>
                  <p className="text-slate-400 text-sm max-w-md">
                    Use these templates as AI reference images. The color-coded body parts help AI understand 
                    character structure for consistent sprite generation.
                  </p>
                </div>

                <div className="w-full">
                  <h4 className="text-cyan-200 text-sm font-semibold mb-2">Full Spritesheet</h4>
                  <div className="bg-slate-900/50 rounded p-4 overflow-x-auto">
                    {spriteImage && (
                      <img
                        src={spriteImage.src}
                        alt={`${templateSize} ${animation} spritesheet`}
                        className="max-w-full"
                        style={{ imageRendering: "pixelated", transform: `scale(${Math.min(scale / 4, 4)})`, transformOrigin: "top left" }}
                        data-testid="img-spritesheet"
                      />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 bg-slate-800/50 border-cyan-900/30">
          <CardHeader>
            <CardTitle className="text-cyan-200">AI Generation Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">1️⃣</div>
                <h4 className="text-cyan-200 font-semibold">Select Template</h4>
                <p className="text-slate-400 text-sm">Choose 16x16 or 16x32 based on game style</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">2️⃣</div>
                <h4 className="text-cyan-200 font-semibold">Upload to AI</h4>
                <p className="text-slate-400 text-sm">Use template as reference image with Puter AI</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">3️⃣</div>
                <h4 className="text-cyan-200 font-semibold">Generate Frames</h4>
                <p className="text-slate-400 text-sm">AI fills in textures matching body part colors</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">4️⃣</div>
                <h4 className="text-cyan-200 font-semibold">Export Spritesheet</h4>
                <p className="text-slate-400 text-sm">Combine frames into game-ready spritesheets</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
