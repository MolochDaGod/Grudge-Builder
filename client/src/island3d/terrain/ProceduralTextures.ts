/**
 * ProceduralTextures — generates terrain textures at runtime via Canvas2D.
 * These are decent-quality fallbacks that work without any external downloads.
 * Replace with real PBR textures from Poly Haven / ambientCG when available.
 */
import * as THREE from 'three';

function createCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

/** Seed-able noise helper for texture variation */
function noise2d(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function fillNoise(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  baseR: number, baseG: number, baseB: number,
  variance: number, seed: number,
) {
  const imageData = ctx.createImageData(w, h);
  const d = imageData.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const n = (noise2d(x, y, seed) - 0.5) * 2 * variance;
      d[i] = Math.max(0, Math.min(255, baseR + n));
      d[i + 1] = Math.max(0, Math.min(255, baseG + n));
      d[i + 2] = Math.max(0, Math.min(255, baseB + n));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function canvasToTexture(canvas: HTMLCanvasElement): THREE.Texture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.needsUpdate = true;
  return tex;
}

export function createSandTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas(256, 256);
  fillNoise(ctx, 256, 256, 210, 190, 140, 30, 1.0);
  return canvasToTexture(canvas);
}

export function createGrassShortTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas(256, 256);
  fillNoise(ctx, 256, 256, 60, 140, 40, 35, 2.0);
  // Add grass blade streaks
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = '#2a6e1e';
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 6, y + Math.random() * 8);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return canvasToTexture(canvas);
}

export function createGrassTallTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas(256, 256);
  fillNoise(ctx, 256, 256, 35, 100, 25, 30, 3.0);
  // Darker, denser forest floor
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#1a3a10';
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.beginPath();
    ctx.arc(x, y, 3 + Math.random() * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return canvasToTexture(canvas);
}

export function createRockTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas(256, 256);
  fillNoise(ctx, 256, 256, 120, 115, 105, 40, 4.0);
  // Add crack lines
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = '#4a4540';
  ctx.lineWidth = 1;
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.beginPath();
    ctx.moveTo(x, y);
    let cx = x, cy = y;
    for (let j = 0; j < 5; j++) {
      cx += (Math.random() - 0.5) * 20;
      cy += (Math.random() - 0.5) * 20;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return canvasToTexture(canvas);
}

export function createWaterTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas(256, 256);
  fillNoise(ctx, 256, 256, 20, 60, 120, 20, 5.0);
  // Caustic light patches
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#6090c0';
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.beginPath();
    ctx.ellipse(x, y, 4 + Math.random() * 10, 3 + Math.random() * 8, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return canvasToTexture(canvas);
}

export interface TerrainTextures {
  sand: THREE.Texture;
  grassShort: THREE.Texture;
  grassTall: THREE.Texture;
  rock: THREE.Texture;
  water: THREE.Texture;
}

/** Load real textures if available, fall back to procedural */
export function loadTerrainTextures(): TerrainTextures {
  // For now always use procedural — swap in real textures via TextureLoader when you have them:
  // const loader = new THREE.TextureLoader();
  // const sand = loader.load('/textures/terrain/sand_diffuse.jpg');
  return {
    sand: createSandTexture(),
    grassShort: createGrassShortTexture(),
    grassTall: createGrassTallTexture(),
    rock: createRockTexture(),
    water: createWaterTexture(),
  };
}
