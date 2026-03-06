import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Crosshair,
  Move,
  RotateCcw,
  Download,
  Save,
  Wand2,
  Bot,
  FileJson,
  Layers,
  Info,
  Send,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Settings,
  Loader2
} from "lucide-react";

interface SpriteAnimation {
  name: string;
  frames: string[];
  frameCount: number;
}

interface SpritePackage {
  name: string;
  path: string;
  animations: SpriteAnimation[];
  totalFrames: number;
  sheetFiles: string[];
}

interface SpriteMetadata {
  packagePath?: string;
  spriteType?: {
    id?: string;
    name?: string;
    description?: string;
    usageInstructions?: string;
    directional?: boolean;
    directions?: string[];
    frameWidth?: number;
    frameHeight?: number;
    animations?: string[];
  } | null;
  aiGenerated?: {
    description?: string;
    usageInstructions?: string;
    directional?: boolean;
    directions?: string[];
    frameWidth?: number;
    frameHeight?: number;
    animations?: string[];
  } | null;
  metadata?: {
    hasAiFile?: boolean;
    aiFiles?: string[];
    hasReadme?: boolean;
    readmeFiles?: string[];
    hasLicense?: boolean;
    licenseFiles?: string[];
    hasBboxJson?: boolean;
    bboxFiles?: string[];
    hasUnityPackage?: boolean;
    unityPackages?: string[];
    hasSpritesheets?: boolean;
    spritesheets?: string[];
    variants?: string[];
  };
}

interface SpriteInspectorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  spritePackage: SpritePackage | null;
  animation: SpriteAnimation | null;
  metadata?: SpriteMetadata | null;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export function SpriteInspectorPopup({
  isOpen,
  onClose,
  spritePackage,
  animation,
  metadata
}: SpriteInspectorPopupProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [fps, setFps] = useState(8);
  const [zoom, setZoom] = useState(3);
  const [showGrid, setShowGrid] = useState(false);
  const [showOrigin, setShowOrigin] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState("#1e293b");
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [loadedImages, setLoadedImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [editableMetadata, setEditableMetadata] = useState({
    description: "",
    usageInstructions: "",
    frameWidth: 64,
    frameHeight: 64,
    directional: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const data = metadata?.aiGenerated || metadata?.spriteType;
    if (data) {
      setEditableMetadata({
        description: data.description || "",
        usageInstructions: data.usageInstructions || "",
        frameWidth: data.frameWidth || 64,
        frameHeight: data.frameHeight || 64,
        directional: data.directional || false
      });
    }
  }, [metadata]);

  useEffect(() => {
    if (!animation || !spritePackage) return;
    const images = new Map<string, HTMLImageElement>();
    let loaded = 0;
    animation.frames.forEach(frame => {
      const img = new Image();
      img.onload = () => {
        loaded++;
        if (loaded === animation.frames.length) {
          setLoadedImages(new Map(images));
        }
      };
      img.onerror = () => {
        loaded++;
      };
      img.src = `${spritePackage.path}/${frame}`;
      images.set(frame, img);
    });
  }, [animation, spritePackage]);

  useEffect(() => {
    if (!isPlaying || !animation) return;
    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % animation.frames.length);
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [isPlaying, fps, animation]);

  useEffect(() => {
    if (!canvasRef.current || !animation || loadedImages.size === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentFrameName = animation.frames[currentFrame];
    const img = loadedImages.get(currentFrameName);
    if (!img) return;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2 + pan.x;
    const centerY = canvas.height / 2 + pan.y;
    const scaledW = img.width * zoom;
    const scaledH = img.height * zoom;
    const drawX = centerX - scaledW / 2;
    const drawY = centerY - scaledH / 2;

    if (showGrid) {
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      const gridSize = 16 * zoom;
      for (let x = drawX % gridSize; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = drawY % gridSize; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    ctx.drawImage(img, drawX, drawY, scaledW, scaledH);

    if (showOrigin) {
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX - 10, centerY);
      ctx.lineTo(centerX + 10, centerY);
      ctx.moveTo(centerX, centerY - 10);
      ctx.lineTo(centerX, centerY + 10);
      ctx.stroke();
    }
  }, [currentFrame, loadedImages, animation, zoom, pan, showGrid, showOrigin, backgroundColor]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    setLastMouse({ x: e.clientX, y: e.clientY });
  }, [isDragging, lastMouse]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.5 : 0.5;
    setZoom(prev => Math.max(0.5, Math.min(10, prev + delta)));
  }, []);

  const resetView = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(3);
  }, []);

  const copyPath = useCallback(() => {
    if (spritePackage && animation) {
      navigator.clipboard.writeText(`${spritePackage.path}/${animation.frames[0]}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [spritePackage, animation]);

  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim() || isChatLoading || !spritePackage || !animation) return;
    
    const userMessage: ChatMessage = {
      role: "user",
      content: chatInput.trim(),
      timestamp: Date.now()
    };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const context = `Sprite: ${spritePackage.name}, Animation: ${animation.name}, Frames: ${animation.frameCount}, Path: ${spritePackage.path}`;
      const response = await fetch("/api/ai/sprite-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: chatInput.trim(),
          context,
          metadata: metadata?.aiGenerated
        })
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.response || "I couldn't generate a response.",
          timestamp: Date.now()
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      } else {
        setChatMessages(prev => [...prev, {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: Date.now()
        }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: "Connection error. Please check your network.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, isChatLoading, spritePackage, animation, metadata]);

  const analyzeWithAI = useCallback(async () => {
    if (!spritePackage || !animation) return;
    setIsChatLoading(true);
    
    const systemMessage: ChatMessage = {
      role: "system",
      content: `Analyzing ${animation.name} from ${spritePackage.name}...`,
      timestamp: Date.now()
    };
    setChatMessages(prev => [...prev, systemMessage]);

    try {
      const response = await fetch("/api/ai/analyze-sprite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packagePath: spritePackage.path,
          animationName: animation.name,
          frameCount: animation.frameCount,
          frames: animation.frames.slice(0, 5)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setChatMessages(prev => [...prev, {
          role: "assistant",
          content: data.analysis || "Analysis complete. This sprite appears to be a standard animation sequence.",
          timestamp: Date.now()
        }]);
        if (data.suggestedMetadata) {
          setEditableMetadata(prev => ({
            ...prev,
            ...data.suggestedMetadata
          }));
        }
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: "Could not complete analysis. The sprite appears to have standard properties.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsChatLoading(false);
    }
  }, [spritePackage, animation]);

  const saveMetadata = useCallback(async () => {
    if (!spritePackage) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/sprites/metadata/${spritePackage.path.replace('/sprites/', '')}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editableMetadata)
      });
      if (response.ok) {
        setChatMessages(prev => [...prev, {
          role: "system",
          content: "Metadata saved successfully!",
          timestamp: Date.now()
        }]);
      }
    } catch (error) {
      console.error("Error saving metadata:", error);
    } finally {
      setIsSaving(false);
    }
  }, [spritePackage, editableMetadata]);

  if (!spritePackage || !animation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl h-[90vh] bg-slate-900 border-slate-700 p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-6 py-4 border-b border-slate-700 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl text-amber-400 font-cinzel flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  {spritePackage.name} / {animation.name}
                </DialogTitle>
                <p className="text-slate-400 text-sm mt-1">
                  {animation.frameCount} frames | {spritePackage.path}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyPath}
                  className="gap-1"
                  data-testid="copy-path-button"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy Path"}
                </Button>
                <Badge className="bg-purple-600">{animation.frameCount} frames</Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col border-r border-slate-700">
              <div className="flex-1 relative bg-slate-950 overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={400}
                  className="w-full h-full cursor-grab active:cursor-grabbing"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                  data-testid="sprite-canvas"
                />
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <div className="bg-slate-800/90 rounded-lg p-2 flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setZoom(prev => Math.min(10, prev + 0.5))}
                      data-testid="zoom-in-button"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setZoom(prev => Math.max(0.5, prev - 0.5))}
                      data-testid="zoom-out-button"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={resetView}
                      data-testid="reset-view-button"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="bg-slate-800/90 rounded-lg p-2 flex flex-col gap-1">
                    <Button
                      variant={showGrid ? "secondary" : "ghost"}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setShowGrid(!showGrid)}
                      data-testid="toggle-grid-button"
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={showOrigin ? "secondary" : "ghost"}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setShowOrigin(!showOrigin)}
                      data-testid="toggle-origin-button"
                    >
                      <Crosshair className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="absolute top-4 right-4 bg-slate-800/90 rounded-lg px-3 py-1 text-xs text-slate-300">
                  Zoom: {zoom.toFixed(1)}x | Frame: {currentFrame + 1}/{animation.frameCount}
                </div>
              </div>
              <div className="p-4 border-t border-slate-700 bg-slate-900">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentFrame(prev => (prev - 1 + animation.frameCount) % animation.frameCount)}
                      disabled={isPlaying}
                      data-testid="prev-frame-button"
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={isPlaying ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setIsPlaying(!isPlaying)}
                      data-testid="play-pause-button"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentFrame(prev => (prev + 1) % animation.frameCount)}
                      disabled={isPlaying}
                      data-testid="next-frame-button"
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <span className="text-xs text-slate-400">FPS:</span>
                    <Slider
                      value={[fps]}
                      onValueChange={([v]) => setFps(v)}
                      min={1}
                      max={30}
                      step={1}
                      className="w-32"
                      data-testid="fps-slider"
                    />
                    <span className="text-xs text-slate-300 w-8">{fps}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-400">BG:</Label>
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-8 h-6 rounded border border-slate-600 cursor-pointer"
                      data-testid="bg-color-picker"
                    />
                  </div>
                </div>
                <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
                  {animation.frames.map((frame, idx) => (
                    <button
                      key={frame}
                      onClick={() => {
                        setCurrentFrame(idx);
                        setIsPlaying(false);
                      }}
                      className={cn(
                        "w-10 h-10 shrink-0 rounded border-2 bg-slate-800 overflow-hidden transition-all",
                        currentFrame === idx
                          ? "border-amber-500 ring-2 ring-amber-500/30"
                          : "border-slate-600 hover:border-slate-500"
                      )}
                      data-testid={`frame-thumb-${idx}`}
                    >
                      {loadedImages.get(frame) && (
                        <img
                          src={loadedImages.get(frame)!.src}
                          alt={`Frame ${idx + 1}`}
                          className="w-full h-full object-contain"
                          style={{ imageRendering: "pixelated" }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="w-96 flex flex-col bg-slate-900">
              <Tabs defaultValue="ai" className="flex-1 flex flex-col">
                <TabsList className="mx-4 mt-4 bg-slate-800">
                  <TabsTrigger value="ai" className="gap-1">
                    <Bot className="w-3 h-3" />
                    AI Assistant
                  </TabsTrigger>
                  <TabsTrigger value="metadata" className="gap-1">
                    <FileJson className="w-3 h-3" />
                    Metadata
                  </TabsTrigger>
                  <TabsTrigger value="info" className="gap-1">
                    <Info className="w-3 h-3" />
                    Info
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="ai" className="flex-1 flex flex-col m-0 px-4 pb-4 overflow-hidden">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={analyzeWithAI}
                      disabled={isChatLoading}
                      className="gap-1 flex-1"
                      data-testid="analyze-sprite-button"
                    >
                      <Wand2 className="w-3 h-3" />
                      Analyze Sprite
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setChatMessages([])}
                      className="gap-1"
                      data-testid="clear-chat-button"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  </div>
                  <ScrollArea className="flex-1 border border-slate-700 rounded-lg mb-3">
                    <div className="p-3 space-y-3">
                      {chatMessages.length === 0 ? (
                        <div className="text-center text-slate-500 text-sm py-8">
                          <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>Ask me about this sprite!</p>
                          <p className="text-xs mt-1">I can analyze, suggest edits, and help organize.</p>
                        </div>
                      ) : (
                        chatMessages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "rounded-lg px-3 py-2 text-sm",
                              msg.role === "user"
                                ? "bg-purple-600 text-white ml-8"
                                : msg.role === "system"
                                ? "bg-slate-700 text-amber-300 text-center text-xs"
                                : "bg-slate-800 text-slate-200 mr-8"
                            )}
                          >
                            {msg.content}
                          </div>
                        ))
                      )}
                      {isChatLoading && (
                        <div className="flex justify-center py-2">
                          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                      placeholder="Ask about this sprite..."
                      className="flex-1"
                      data-testid="sprite-chat-input"
                    />
                    <Button
                      onClick={sendChatMessage}
                      disabled={isChatLoading || !chatInput.trim()}
                      data-testid="sprite-chat-send"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="metadata" className="flex-1 m-0 px-4 pb-4 overflow-auto">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-slate-400">Description</Label>
                      <Textarea
                        value={editableMetadata.description}
                        onChange={(e) => setEditableMetadata(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe this sprite..."
                        className="mt-1 h-20"
                        data-testid="metadata-description"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Usage Instructions</Label>
                      <Textarea
                        value={editableMetadata.usageInstructions}
                        onChange={(e) => setEditableMetadata(prev => ({ ...prev, usageInstructions: e.target.value }))}
                        placeholder="How to use this sprite..."
                        className="mt-1 h-20"
                        data-testid="metadata-usage"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-slate-400">Frame Width</Label>
                        <Input
                          type="number"
                          value={editableMetadata.frameWidth}
                          onChange={(e) => setEditableMetadata(prev => ({ ...prev, frameWidth: parseInt(e.target.value) || 64 }))}
                          className="mt-1"
                          data-testid="metadata-frame-width"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-400">Frame Height</Label>
                        <Input
                          type="number"
                          value={editableMetadata.frameHeight}
                          onChange={(e) => setEditableMetadata(prev => ({ ...prev, frameHeight: parseInt(e.target.value) || 64 }))}
                          className="mt-1"
                          data-testid="metadata-frame-height"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-slate-400">Directional Sprite</Label>
                      <Switch
                        checked={editableMetadata.directional}
                        onCheckedChange={(checked) => setEditableMetadata(prev => ({ ...prev, directional: checked }))}
                        data-testid="metadata-directional"
                      />
                    </div>
                    <Button
                      onClick={saveMetadata}
                      disabled={isSaving}
                      className="w-full gap-2"
                      data-testid="save-metadata-button"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Metadata
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="info" className="flex-1 m-0 px-4 pb-4 overflow-auto">
                  <div className="space-y-4">
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Package</span>
                          <span className="text-white">{spritePackage.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Animation</span>
                          <span className="text-white">{animation.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Frames</span>
                          <span className="text-white">{animation.frameCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Package Frames</span>
                          <span className="text-white">{spritePackage.totalFrames}</span>
                        </div>
                      </CardContent>
                    </Card>
                    {metadata && metadata.metadata && (
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader className="py-2 px-4">
                          <CardTitle className="text-sm text-white">Files Detected</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <Badge variant={metadata.metadata.hasAiFile ? "default" : "outline"} className="text-[10px]">
                              AI File
                            </Badge>
                            <Badge variant={metadata.metadata.hasReadme ? "default" : "outline"} className="text-[10px]">
                              README
                            </Badge>
                            <Badge variant={metadata.metadata.hasLicense ? "default" : "outline"} className="text-[10px]">
                              License
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={metadata.metadata.hasBboxJson ? "default" : "outline"} className="text-[10px]">
                              Bbox JSON
                            </Badge>
                            <Badge variant={metadata.metadata.hasSpritesheets ? "default" : "outline"} className="text-[10px]">
                              Spritesheets
                            </Badge>
                          </div>
                          {metadata.metadata.variants && metadata.metadata.variants.length > 0 && (
                            <div className="mt-2">
                              <span className="text-slate-400">Variants: </span>
                              <span className="text-white">{metadata.metadata.variants.join(", ")}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
