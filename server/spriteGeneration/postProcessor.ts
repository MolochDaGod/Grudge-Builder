import fs from "fs";
import path from "path";
import { PNG } from "pngjs";

export interface ProcessingOptions {
  targetWidth: number;
  targetHeight: number;
  frameCount: number;
  enforceTransparency?: boolean;
  backgroundColor?: { r: number; g: number; b: number };
  maxColors?: number;
}

export interface FrameDetectionResult {
  detected: boolean;
  frameCount: number;
  frameBounds: Array<{ x: number; y: number; width: number; height: number }>;
  layout: "horizontal" | "vertical" | "grid" | "unknown";
  confidence: number;
}

export interface ProcessedSprite {
  success: boolean;
  inputPath: string;
  outputPath: string;
  originalSize: { width: number; height: number };
  processedSize: { width: number; height: number };
  frameDetection?: FrameDetectionResult;
  qualityScore?: number;
  error?: string;
}

export function detectFrameLayout(png: PNG, expectedFrames: number): FrameDetectionResult {
  const result: FrameDetectionResult = {
    detected: false,
    frameCount: 0,
    frameBounds: [],
    layout: "unknown",
    confidence: 0,
  };

  const verticalGaps = findVerticalGaps(png);
  
  if (verticalGaps.length === expectedFrames - 1) {
    result.detected = true;
    result.frameCount = expectedFrames;
    result.layout = "horizontal";
    result.confidence = 0.9;

    let prevEnd = 0;
    for (let i = 0; i <= verticalGaps.length; i++) {
      const start = prevEnd;
      const end = i < verticalGaps.length ? verticalGaps[i] : png.width;
      result.frameBounds.push({
        x: start,
        y: 0,
        width: end - start,
        height: png.height,
      });
      prevEnd = end;
    }
    return result;
  }

  const frameWidth = Math.floor(png.width / expectedFrames);
  result.detected = true;
  result.frameCount = expectedFrames;
  result.layout = "horizontal";
  result.confidence = 0.5;

  for (let i = 0; i < expectedFrames; i++) {
    result.frameBounds.push({
      x: i * frameWidth,
      y: 0,
      width: frameWidth,
      height: png.height,
    });
  }

  return result;
}

function findVerticalGaps(png: PNG, threshold: number = 10): number[] {
  const gaps: number[] = [];
  const bgColor = detectBackgroundColor(png);

  for (let x = 1; x < png.width - 1; x++) {
    let isGap = true;
    for (let y = 0; y < png.height && isGap; y++) {
      const idx = (y * png.width + x) << 2;
      const dr = Math.abs(png.data[idx] - bgColor.r);
      const dg = Math.abs(png.data[idx + 1] - bgColor.g);
      const db = Math.abs(png.data[idx + 2] - bgColor.b);
      
      if (dr > threshold || dg > threshold || db > threshold) {
        if (png.data[idx + 3] > 128) {
          isGap = false;
        }
      }
    }
    if (isGap && (gaps.length === 0 || x - gaps[gaps.length - 1] > 5)) {
      gaps.push(x);
    }
  }

  return gaps;
}

function detectBackgroundColor(png: PNG): { r: number; g: number; b: number } {
  const cornerSamples = [
    0,
    (png.width - 1) << 2,
    ((png.height - 1) * png.width) << 2,
    ((png.height - 1) * png.width + png.width - 1) << 2,
  ];

  let r = 0, g = 0, b = 0;
  for (const idx of cornerSamples) {
    r += png.data[idx];
    g += png.data[idx + 1];
    b += png.data[idx + 2];
  }

  return {
    r: Math.round(r / cornerSamples.length),
    g: Math.round(g / cornerSamples.length),
    b: Math.round(b / cornerSamples.length),
  };
}

export function validateSpriteQuality(png: PNG): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 100;

  const uniqueColors = countUniqueColors(png);
  if (uniqueColors > 64) {
    issues.push(`Too many colors: ${uniqueColors} (expected <64 for pixel art)`);
    score -= 20;
  }

  const aspectRatio = png.width / png.height;
  if (aspectRatio < 0.3 || aspectRatio > 8) {
    issues.push(`Unusual aspect ratio: ${aspectRatio.toFixed(2)}`);
    score -= 15;
  }

  const edgePixels = countNonTransparentEdgePixels(png);
  if (edgePixels > (png.width * 2 + png.height * 2) * 0.8) {
    issues.push("Sprite may extend to image edges (no margins)");
    score -= 10;
  }

  return { score: Math.max(0, score), issues };
}

function countUniqueColors(png: PNG): number {
  const colors = new Set<string>();
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] > 0) {
      colors.add(`${png.data[i]},${png.data[i + 1]},${png.data[i + 2]}`);
    }
  }
  return colors.size;
}

function countNonTransparentEdgePixels(png: PNG): number {
  let count = 0;

  for (let x = 0; x < png.width; x++) {
    const topIdx = x << 2;
    const bottomIdx = ((png.height - 1) * png.width + x) << 2;
    if (png.data[topIdx + 3] > 128) count++;
    if (png.data[bottomIdx + 3] > 128) count++;
  }

  for (let y = 1; y < png.height - 1; y++) {
    const leftIdx = (y * png.width) << 2;
    const rightIdx = (y * png.width + png.width - 1) << 2;
    if (png.data[leftIdx + 3] > 128) count++;
    if (png.data[rightIdx + 3] > 128) count++;
  }

  return count;
}

export function extractFrame(
  source: PNG,
  bounds: { x: number; y: number; width: number; height: number }
): PNG {
  const frame = new PNG({ width: bounds.width, height: bounds.height });

  for (let y = 0; y < bounds.height; y++) {
    for (let x = 0; x < bounds.width; x++) {
      const srcX = bounds.x + x;
      const srcY = bounds.y + y;
      const srcIdx = (srcY * source.width + srcX) << 2;
      const dstIdx = (y * bounds.width + x) << 2;

      frame.data[dstIdx] = source.data[srcIdx];
      frame.data[dstIdx + 1] = source.data[srcIdx + 1];
      frame.data[dstIdx + 2] = source.data[srcIdx + 2];
      frame.data[dstIdx + 3] = source.data[srcIdx + 3];
    }
  }

  return frame;
}

export function processGeneratedSprite(
  inputPath: string,
  outputPath: string,
  options: ProcessingOptions
): ProcessedSprite {
  try {
    const data = fs.readFileSync(inputPath);
    const png = PNG.sync.read(data);

    const frameDetection = detectFrameLayout(png, options.frameCount);

    const targetTotalWidth = options.targetWidth * options.frameCount;
    const targetHeight = options.targetHeight;

    const output = new PNG({ width: targetTotalWidth, height: targetHeight });

    for (let i = 0; i < options.frameCount; i++) {
      const bounds = frameDetection.frameBounds[i] || {
        x: (png.width / options.frameCount) * i,
        y: 0,
        width: png.width / options.frameCount,
        height: png.height,
      };

      const frame = extractFrame(png, bounds);
      const resizedFrame = resizeImage(frame, options.targetWidth, targetHeight);

      for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < options.targetWidth; x++) {
          const srcIdx = (y * options.targetWidth + x) << 2;
          const dstIdx = (y * targetTotalWidth + i * options.targetWidth + x) << 2;
          output.data[dstIdx] = resizedFrame.data[srcIdx];
          output.data[dstIdx + 1] = resizedFrame.data[srcIdx + 1];
          output.data[dstIdx + 2] = resizedFrame.data[srcIdx + 2];
          output.data[dstIdx + 3] = resizedFrame.data[srcIdx + 3];
        }
      }
    }

    if (options.enforceTransparency && options.backgroundColor) {
      removeBackground(output, options.backgroundColor);
    }

    if (options.maxColors) {
      quantizeColors(output, options.maxColors);
    }

    const quality = validateSpriteQuality(output);

    const buffer = PNG.sync.write(output);
    fs.writeFileSync(outputPath, buffer);

    return {
      success: quality.score >= 40,
      inputPath,
      outputPath,
      originalSize: { width: png.width, height: png.height },
      processedSize: { width: output.width, height: output.height },
      frameDetection,
      qualityScore: quality.score,
      error: quality.issues.length > 0 ? quality.issues.join("; ") : undefined,
    };
  } catch (error) {
    return {
      success: false,
      inputPath,
      outputPath,
      originalSize: { width: 0, height: 0 },
      processedSize: { width: 0, height: 0 },
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function resizeImage(
  source: PNG,
  targetWidth: number,
  targetHeight: number
): PNG {
  const target = new PNG({ width: targetWidth, height: targetHeight });

  const xRatio = source.width / targetWidth;
  const yRatio = source.height / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.floor(x * xRatio);
      const srcY = Math.floor(y * yRatio);

      const srcIdx = (srcY * source.width + srcX) << 2;
      const dstIdx = (y * targetWidth + x) << 2;

      target.data[dstIdx] = source.data[srcIdx];
      target.data[dstIdx + 1] = source.data[srcIdx + 1];
      target.data[dstIdx + 2] = source.data[srcIdx + 2];
      target.data[dstIdx + 3] = source.data[srcIdx + 3];
    }
  }

  return target;
}

function removeBackground(
  png: PNG,
  bgColor: { r: number; g: number; b: number },
  threshold: number = 30
): void {
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];

    const dr = Math.abs(r - bgColor.r);
    const dg = Math.abs(g - bgColor.g);
    const db = Math.abs(b - bgColor.b);

    if (dr < threshold && dg < threshold && db < threshold) {
      png.data[i + 3] = 0;
    }
  }
}

function quantizeColors(png: PNG, maxColors: number): void {
  const colorMap = new Map<string, number>();
  const colors: { r: number; g: number; b: number; count: number }[] = [];

  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] === 0) continue;

    const key = `${png.data[i]},${png.data[i + 1]},${png.data[i + 2]}`;
    if (!colorMap.has(key)) {
      colorMap.set(key, colors.length);
      colors.push({
        r: png.data[i],
        g: png.data[i + 1],
        b: png.data[i + 2],
        count: 1,
      });
    } else {
      colors[colorMap.get(key)!].count++;
    }
  }

  if (colors.length <= maxColors) return;

  colors.sort((a, b) => b.count - a.count);
  const palette = colors.slice(0, maxColors);

  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] === 0) continue;

    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];

    let bestMatch = palette[0];
    let bestDistance = Infinity;

    for (const color of palette) {
      const distance =
        Math.pow(r - color.r, 2) +
        Math.pow(g - color.g, 2) +
        Math.pow(b - color.b, 2);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = color;
      }
    }

    png.data[i] = bestMatch.r;
    png.data[i + 1] = bestMatch.g;
    png.data[i + 2] = bestMatch.b;
  }
}

export function batchProcess(
  inputDir: string,
  outputDir: string,
  options: ProcessingOptions
): ProcessedSprite[] {
  const results: ProcessedSprite[] = [];

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const files = fs.readdirSync(inputDir).filter((f) => f.endsWith(".png") && !f.startsWith("processed_"));

  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, `processed_${file}`);
    const result = processGeneratedSprite(inputPath, outputPath, options);
    results.push(result);
  }

  return results;
}

export function createDefaultProcessingOptions(
  frameCount: number = 4
): ProcessingOptions {
  return {
    targetWidth: 16,
    targetHeight: 32,
    frameCount,
    enforceTransparency: true,
    backgroundColor: { r: 215, g: 215, b: 215 },
    maxColors: 24,
  };
}
