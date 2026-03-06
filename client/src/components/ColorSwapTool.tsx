import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Pipette, 
  Palette, 
  RotateCcw, 
  Download, 
  Save,
  Layers,
  Eye,
  EyeOff,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ColorSwapToolProps {
  spriteSheets: string[];
  characterName: string;
  onSave?: (modifiedSheets: Map<string, ImageData>) => void;
}

interface ColorChange {
  id: string;
  sourceColor: string;
  targetColor: string;
  tolerance: number;
}

interface ExtractedColor {
  hex: string;
  count: number;
  r: number;
  g: number;
  b: number;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt(
    Math.pow(r1 - r2, 2) + 
    Math.pow(g1 - g2, 2) + 
    Math.pow(b1 - b2, 2)
  );
}

export function ColorSwapTool({ spriteSheets, characterName, onSave }: ColorSwapToolProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [loadedImages, setLoadedImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const [selectedSheet, setSelectedSheet] = useState<string>(spriteSheets[0] || "");
  const [extractedColors, setExtractedColors] = useState<ExtractedColor[]>([]);
  const [colorChanges, setColorChanges] = useState<ColorChange[]>([]);
  const [sourceColor, setSourceColor] = useState<string>("#000000");
  const [targetColor, setTargetColor] = useState<string>("#FF0000");
  const [tolerance, setTolerance] = useState<number>(10);
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [originalImageData, setOriginalImageData] = useState<Map<string, ImageData>>(new Map());

  useEffect(() => {
    if (spriteSheets.length > 0 && !spriteSheets.includes(selectedSheet)) {
      setSelectedSheet(spriteSheets[0]);
    } else if (spriteSheets.length === 0) {
      setSelectedSheet("");
    }
  }, [spriteSheets, selectedSheet]);

  useEffect(() => {
    const loadImages = async () => {
      const images = new Map<string, HTMLImageElement>();
      const originals = new Map<string, ImageData>();
      
      for (const sheet of spriteSheets) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = sheet;
          });
          images.set(sheet, img);
          
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            originals.set(sheet, ctx.getImageData(0, 0, img.width, img.height));
          }
        } catch (err) {
          console.error(`Failed to load ${sheet}:`, err);
        }
      }
      
      setLoadedImages(images);
      setOriginalImageData(originals);
    };
    
    if (spriteSheets.length > 0) {
      loadImages();
    }
  }, [spriteSheets]);

  useEffect(() => {
    if (!selectedSheet || !loadedImages.has(selectedSheet)) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const img = loadedImages.get(selectedSheet)!;
    canvas.width = img.width;
    canvas.height = img.height;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const colorCounts = new Map<string, { count: number; r: number; g: number; b: number }>();
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const a = imageData.data[i + 3];
      
      if (a < 128) continue;
      
      const hex = rgbToHex(r, g, b);
      const existing = colorCounts.get(hex);
      if (existing) {
        existing.count++;
      } else {
        colorCounts.set(hex, { count: 1, r, g, b });
      }
    }
    
    const sorted = Array.from(colorCounts.entries())
      .map(([hex, data]) => ({ hex, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 32);
    
    setExtractedColors(sorted);
  }, [selectedSheet, loadedImages]);

  const applyColorChanges = useCallback((): Map<string, ImageData> | undefined => {
    const modifiedData = new Map<string, ImageData>();
    
    for (const [sheetPath, original] of Array.from(originalImageData.entries())) {
      if (colorChanges.length === 0) {
        modifiedData.set(sheetPath, new ImageData(
          new Uint8ClampedArray(original.data),
          original.width,
          original.height
        ));
        continue;
      }
      
      const newData = new ImageData(
        new Uint8ClampedArray(original.data),
        original.width,
        original.height
      );
      
      for (let i = 0; i < newData.data.length; i += 4) {
        const r = newData.data[i];
        const g = newData.data[i + 1];
        const b = newData.data[i + 2];
        const a = newData.data[i + 3];
        
        if (a < 128) continue;
        
        for (const change of colorChanges) {
          const source = hexToRgb(change.sourceColor);
          const target = hexToRgb(change.targetColor);
          
          if (!source || !target) continue;
          
          const distance = colorDistance(r, g, b, source.r, source.g, source.b);
          
          if (distance <= change.tolerance) {
            newData.data[i] = Math.min(255, Math.max(0, target.r));
            newData.data[i + 1] = Math.min(255, Math.max(0, target.g));
            newData.data[i + 2] = Math.min(255, Math.max(0, target.b));
            break;
          }
        }
      }
      
      modifiedData.set(sheetPath, newData);
    }
    
    if (showPreview && previewCanvasRef.current && selectedSheet) {
      const previewCanvas = previewCanvasRef.current;
      const previewData = modifiedData.get(selectedSheet);
      
      if (previewData) {
        previewCanvas.width = previewData.width;
        previewCanvas.height = previewData.height;
        const ctx = previewCanvas.getContext("2d");
        if (ctx) {
          ctx.putImageData(previewData, 0, 0);
        }
      }
    }
    
    return modifiedData.size > 0 ? modifiedData : undefined;
  }, [colorChanges, originalImageData, selectedSheet, showPreview]);

  useEffect(() => {
    applyColorChanges();
  }, [applyColorChanges]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPickingColor) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    
    setSourceColor(hex);
    setIsPickingColor(false);
    
    toast({
      title: "Color Picked",
      description: `Selected color: ${hex}`,
    });
  };

  const addColorChange = () => {
    const newChange: ColorChange = {
      id: `change-${Date.now()}`,
      sourceColor,
      targetColor,
      tolerance,
    };
    
    setColorChanges(prev => [...prev, newChange]);
    
    toast({
      title: "Color Swap Added",
      description: `${sourceColor} → ${targetColor}`,
    });
  };

  const removeColorChange = (id: string) => {
    setColorChanges(prev => prev.filter(c => c.id !== id));
  };

  const resetAllChanges = () => {
    setColorChanges([]);
    toast({
      title: "Reset Complete",
      description: "All color changes have been cleared",
    });
  };

  const handleSave = () => {
    const modifiedData = applyColorChanges();
    if (modifiedData) {
      onSave?.(modifiedData);
      toast({
        title: "Changes Saved",
        description: `Applied ${colorChanges.length} color swaps to ${spriteSheets.length} sheets`,
      });
    }
  };

  const downloadModified = async () => {
    const modifiedData = applyColorChanges();
    if (!modifiedData || !selectedSheet) return;
    
    const data = modifiedData.get(selectedSheet);
    if (!data) return;
    
    const canvas = document.createElement("canvas");
    canvas.width = data.width;
    canvas.height = data.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.putImageData(data, 0, 0);
    
    const link = document.createElement("a");
    link.download = `${characterName}_recolored.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    
    toast({
      title: "Download Started",
      description: `Saving ${characterName}_recolored.png`,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Sprite Sheets ({spriteSheets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {spriteSheets.map((sheet) => (
                <Button
                  key={sheet}
                  variant={selectedSheet === sheet ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSheet(sheet)}
                  data-testid={`sheet-select-${sheet.split('/').pop()}`}
                >
                  {sheet.split('/').pop()?.substring(0, 20)}
                </Button>
              ))}
            </div>
            
            <div className="relative border border-gray-700 rounded-lg overflow-hidden bg-gray-950">
              <canvas
                ref={canvasRef}
                className={cn(
                  "max-w-full h-auto",
                  isPickingColor && "cursor-crosshair"
                )}
                onClick={handleCanvasClick}
                style={{ imageRendering: "pixelated" }}
                data-testid="color-swap-canvas"
              />
              
              {isPickingColor && (
                <div className="absolute top-2 left-2 bg-amber-600 text-white px-2 py-1 text-xs rounded">
                  Click to pick a color
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {showPreview && colorChanges.length > 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-950">
                <canvas
                  ref={previewCanvasRef}
                  className="max-w-full h-auto"
                  style={{ imageRendering: "pixelated" }}
                  data-testid="color-swap-preview"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Color Palette
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <div className="flex flex-wrap gap-1">
                {extractedColors.map((color) => (
                  <button
                    key={color.hex}
                    className="w-6 h-6 rounded border border-gray-600 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color.hex }}
                    onClick={() => setSourceColor(color.hex)}
                    title={`${color.hex} (${color.count}px)`}
                    data-testid={`palette-color-${color.hex.substring(1)}`}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Pipette className="w-5 h-5" />
              Color Swap
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Source Color</Label>
              <div className="flex gap-2">
                <div
                  className="w-10 h-10 rounded border border-gray-600"
                  style={{ backgroundColor: sourceColor }}
                />
                <Input
                  type="text"
                  value={sourceColor}
                  onChange={(e) => setSourceColor(e.target.value)}
                  className="flex-1 bg-gray-800"
                  data-testid="source-color-input"
                />
                <Button
                  variant={isPickingColor ? "default" : "outline"}
                  size="icon"
                  onClick={() => setIsPickingColor(!isPickingColor)}
                  data-testid="pick-color-btn"
                >
                  <Pipette className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Target Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={targetColor}
                  onChange={(e) => setTargetColor(e.target.value)}
                  className="w-10 h-10 p-0 border-0"
                  data-testid="target-color-picker"
                />
                <Input
                  type="text"
                  value={targetColor}
                  onChange={(e) => setTargetColor(e.target.value)}
                  className="flex-1 bg-gray-800"
                  data-testid="target-color-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tolerance: {tolerance}</Label>
              <Slider
                value={[tolerance]}
                onValueChange={([v]) => setTolerance(v)}
                min={0}
                max={100}
                step={1}
                data-testid="tolerance-slider"
              />
            </div>

            <Button
              onClick={addColorChange}
              className="w-full"
              data-testid="add-color-swap-btn"
            >
              Add Color Swap
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Active Swaps ({colorChanges.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-40">
              {colorChanges.length === 0 ? (
                <p className="text-sm text-gray-500">No color swaps added</p>
              ) : (
                <div className="space-y-2">
                  {colorChanges.map((change) => (
                    <div
                      key={change.id}
                      className="flex items-center gap-2 p-2 bg-gray-800 rounded"
                    >
                      <div
                        className="w-6 h-6 rounded border border-gray-600"
                        style={{ backgroundColor: change.sourceColor }}
                      />
                      <span className="text-gray-400">→</span>
                      <div
                        className="w-6 h-6 rounded border border-gray-600"
                        style={{ backgroundColor: change.targetColor }}
                      />
                      <Badge variant="outline" className="text-xs">
                        ±{change.tolerance}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeColorChange(change.id)}
                        className="ml-auto text-red-400 hover:text-red-300"
                        data-testid={`remove-swap-${change.id}`}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            className="w-full"
            data-testid="toggle-preview-btn"
          >
            {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showPreview ? "Hide Preview" : "Show Preview"}
          </Button>
          
          <Button
            variant="outline"
            onClick={resetAllChanges}
            className="w-full"
            data-testid="reset-changes-btn"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All
          </Button>
          
          <Button
            variant="outline"
            onClick={downloadModified}
            disabled={colorChanges.length === 0}
            className="w-full"
            data-testid="download-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={colorChanges.length === 0}
            className="w-full bg-amber-600 hover:bg-amber-700"
            data-testid="save-changes-btn"
          >
            <Save className="w-4 h-4 mr-2" />
            Save to All Sheets
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ColorSwapTool;
