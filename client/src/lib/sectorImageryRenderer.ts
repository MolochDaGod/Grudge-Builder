/**
 * SectorImageryRenderer — canvas overlay FX for world map sectors.
 *
 * Renders animated particle effects on top of the tile grid:
 *   - Ethereal Falls: waterfall streams, spectral mist, floating islands, phantom wisps
 *   - Frostbite Expanse: snowfall, aurora
 *   - Stormbreak Reef: rain, lightning
 *   - Ember Depths: ember rain
 *   - Convergence Nexus: energy vortex, aurora
 *   - General: gentle waves, fireflies, dust swirl, bioluminescence
 *
 * Also preloads sector background images and optional video backgrounds.
 * Renders sector boundary labels and entry transitions.
 */
import type { WorldSector, SectorOverlayFx } from '@shared/definitions/worldMapSectors';
import { WORLD_SECTORS, getSectorAt } from '@shared/definitions/worldMapSectors';

// ── Particle Types ───────────────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  /** FX-specific extra data */
  extra?: Record<string, number>;
}

// ── Image Cache ──────────────────────────────────────────────────────────────

const imageCache = new Map<string, HTMLImageElement>();
const videoCache = new Map<string, HTMLVideoElement>();

function preloadImage(url: string): HTMLImageElement | null {
  if (imageCache.has(url)) return imageCache.get(url)!;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  img.onload = () => imageCache.set(url, img);
  img.onerror = () => {}; // Silently fail — sector renders without background
  return null; // Not loaded yet
}

function preloadVideo(url: string): HTMLVideoElement | null {
  if (videoCache.has(url)) return videoCache.get(url)!;
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.src = url;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.oncanplay = () => {
    videoCache.set(url, video);
    video.play().catch(() => {});
  };
  video.onerror = () => {};
  return null;
}

// ── SectorImageryRenderer Class ──────────────────────────────────────────────

export class SectorImageryRenderer {
  private particles: Map<string, Particle[]> = new Map();
  private elapsed = 0;
  private lastSectorId: string | null = null;
  private sectorEntryTime = 0;
  private preloaded = false;

  constructor() {
    // Pre-initialize particle pools for each sector
    for (const sector of WORLD_SECTORS) {
      this.particles.set(sector.id, []);
    }
  }

  /** Preload all sector backgrounds + videos */
  preloadAll(): void {
    if (this.preloaded) return;
    this.preloaded = true;
    for (const sector of WORLD_SECTORS) {
      preloadImage(sector.imagery.backgroundUrl);
      if (sector.imagery.videoUrl) {
        preloadVideo(sector.imagery.videoUrl);
      }
    }
  }

  /**
   * Render sector imagery on the canvas.
   * Call this AFTER tiles are drawn but BEFORE UI overlays.
   */
  render(
    ctx: CanvasRenderingContext2D,
    shipX: number,
    shipY: number,
    cameraOffsetX: number,
    cameraOffsetY: number,
    scaledTileSize: number,
    canvasWidth: number,
    canvasHeight: number,
    dt: number,
  ): void {
    this.elapsed += dt;

    const currentSector = getSectorAt(shipX, shipY);
    if (!currentSector) return;

    // Track sector entry for transition effects
    if (currentSector.id !== this.lastSectorId) {
      this.lastSectorId = currentSector.id;
      this.sectorEntryTime = this.elapsed;
    }

    // Determine which sectors are visible on screen
    const startTileX = Math.floor(cameraOffsetX / scaledTileSize);
    const startTileY = Math.floor(cameraOffsetY / scaledTileSize);
    const endTileX = Math.ceil((cameraOffsetX + canvasWidth) / scaledTileSize);
    const endTileY = Math.ceil((cameraOffsetY + canvasHeight) / scaledTileSize);

    const visibleSectors = new Set<string>();
    for (const sector of WORLD_SECTORS) {
      const { x0, y0, x1, y1 } = sector.bounds;
      if (x1 >= startTileX && x0 <= endTileX && y1 >= startTileY && y0 <= endTileY) {
        visibleSectors.add(sector.id);
      }
    }

    // Render background imagery for visible sectors
    for (const sector of WORLD_SECTORS) {
      if (!visibleSectors.has(sector.id)) continue;
      this.renderSectorBackground(ctx, sector, cameraOffsetX, cameraOffsetY, scaledTileSize, canvasWidth, canvasHeight);
    }

    // Render overlay FX for visible sectors
    for (const sector of WORLD_SECTORS) {
      if (!visibleSectors.has(sector.id)) continue;
      if (!sector.imagery.overlayFx?.length) continue;
      this.updateAndRenderFx(ctx, sector, cameraOffsetX, cameraOffsetY, scaledTileSize, canvasWidth, canvasHeight, dt);
    }

    // Render sector boundary labels
    this.renderSectorLabels(ctx, cameraOffsetX, cameraOffsetY, scaledTileSize, canvasWidth, canvasHeight, visibleSectors);

    // Render entry transition
    this.renderEntryTransition(ctx, currentSector, canvasWidth, canvasHeight);
  }

  // ── Background Rendering ─────────────────────────────────────────────────

  private renderSectorBackground(
    ctx: CanvasRenderingContext2D,
    sector: WorldSector,
    camX: number, camY: number,
    tileSize: number,
    cw: number, ch: number,
  ): void {
    const { x0, y0, x1, y1 } = sector.bounds;
    const screenX = x0 * tileSize - camX;
    const screenY = y0 * tileSize - camY;
    const w = (x1 - x0 + 1) * tileSize;
    const h = (y1 - y0 + 1) * tileSize;

    // Clip to sector bounds
    const clipX = Math.max(0, screenX);
    const clipY = Math.max(0, screenY);
    const clipW = Math.min(screenX + w, cw) - clipX;
    const clipH = Math.min(screenY + h, ch) - clipY;
    if (clipW <= 0 || clipH <= 0) return;

    // Try video first, then image
    const videoEl = sector.imagery.videoUrl ? videoCache.get(sector.imagery.videoUrl) : null;
    const imgEl = imageCache.get(sector.imagery.backgroundUrl);

    // Pick the best available source (video if loaded + has a frame, else image)
    const videoReady = videoEl && videoEl.readyState >= 2; // HAVE_CURRENT_DATA
    const source: CanvasImageSource | null = videoReady ? videoEl : (imgEl ?? null);

    if (source) {
      ctx.save();
      ctx.globalAlpha = 0.15; // Subtle background tint behind tiles
      ctx.beginPath();
      ctx.rect(clipX, clipY, clipW, clipH);
      ctx.clip();

      try {
        ctx.drawImage(source, screenX, screenY, w, h);
      } catch {
        // Video frame not decodable yet — skip silently
      }
      ctx.restore();
    }

    // Sector border line
    ctx.save();
    ctx.strokeStyle = sector.colors.accent + '40'; // 25% alpha
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(screenX, screenY, w, h);
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ── Sector Labels ────────────────────────────────────────────────────────

  private renderSectorLabels(
    ctx: CanvasRenderingContext2D,
    camX: number, camY: number,
    tileSize: number,
    cw: number, ch: number,
    visibleSectors: Set<string>,
  ): void {
    ctx.save();
    for (const sector of WORLD_SECTORS) {
      if (!visibleSectors.has(sector.id)) continue;
      const { x0, y0, x1, y1 } = sector.bounds;
      const centerX = ((x0 + x1) / 2) * tileSize - camX;
      const centerY = y0 * tileSize - camY + 14;

      // Only render if on-screen
      if (centerX < -100 || centerX > cw + 100 || centerY < -20 || centerY > ch + 20) continue;

      // Background pill
      const label = sector.name;
      ctx.font = '11px "Cinzel", serif';
      const metrics = ctx.measureText(label);
      const pw = metrics.width + 16;
      const ph = 20;

      ctx.fillStyle = sector.colors.deep + 'cc';
      ctx.beginPath();
      // Rounded rect
      const rx = centerX - pw / 2, ry = centerY - ph / 2, r = 4;
      ctx.moveTo(rx + r, ry);
      ctx.lineTo(rx + pw - r, ry);
      ctx.quadraticCurveTo(rx + pw, ry, rx + pw, ry + r);
      ctx.lineTo(rx + pw, ry + ph - r);
      ctx.quadraticCurveTo(rx + pw, ry + ph, rx + pw - r, ry + ph);
      ctx.lineTo(rx + r, ry + ph);
      ctx.quadraticCurveTo(rx, ry + ph, rx, ry + ph - r);
      ctx.lineTo(rx, ry + r);
      ctx.quadraticCurveTo(rx, ry, rx + r, ry);
      ctx.fill();

      ctx.strokeStyle = sector.colors.accent + '80';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = sector.colors.accent;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, centerX, centerY);
    }
    ctx.restore();
  }

  // ── Entry Transition ─────────────────────────────────────────────────────

  private renderEntryTransition(
    ctx: CanvasRenderingContext2D,
    sector: WorldSector,
    cw: number, ch: number,
  ): void {
    const timeSinceEntry = this.elapsed - this.sectorEntryTime;
    if (timeSinceEntry > 4) return; // 4 second transition

    const alpha = Math.max(0, 1 - timeSinceEntry / 4);
    if (alpha <= 0) return;

    // Cinematic sector name overlay
    ctx.save();
    ctx.globalAlpha = alpha;

    // Name
    ctx.font = '28px "Cinzel", serif';
    ctx.fillStyle = sector.colors.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = sector.colors.glow ?? sector.colors.accent;
    ctx.shadowBlur = 20;
    ctx.fillText(sector.name, cw / 2, ch * 0.3);

    // Description
    ctx.font = '14px "Cinzel", serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.shadowBlur = 8;
    ctx.fillText(sector.description, cw / 2, ch * 0.3 + 36);

    // Difficulty badge
    ctx.font = '11px sans-serif';
    ctx.fillStyle = sector.colors.accent + 'cc';
    ctx.fillText(`Difficulty ${sector.difficultyMin}–${sector.difficultyMax}`, cw / 2, ch * 0.3 + 58);

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Overlay FX Engine ────────────────────────────────────────────────────

  private updateAndRenderFx(
    ctx: CanvasRenderingContext2D,
    sector: WorldSector,
    camX: number, camY: number,
    tileSize: number,
    cw: number, ch: number,
    dt: number,
  ): void {
    const { x0, y0, x1, y1 } = sector.bounds;
    const screenX = x0 * tileSize - camX;
    const screenY = y0 * tileSize - camY;
    const w = (x1 - x0 + 1) * tileSize;
    const h = (y1 - y0 + 1) * tileSize;

    const particles = this.particles.get(sector.id) ?? [];

    // Process each FX type
    for (const fx of sector.imagery.overlayFx ?? []) {
      switch (fx.type) {
        case 'waterfall_streams':
          this.fxWaterfallStreams(ctx, particles, fx, screenX, screenY, w, h, dt);
          break;
        case 'spectral_mist':
          this.fxSpectralMist(ctx, fx, screenX, screenY, w, h);
          break;
        case 'floating_islands':
          this.fxFloatingIslands(ctx, fx, screenX, screenY, w, h);
          break;
        case 'phantom_wisps':
          this.fxPhantomWisps(ctx, particles, fx, screenX, screenY, w, h, dt);
          break;
        case 'snowfall':
          this.fxSnowfall(ctx, particles, fx, screenX, screenY, w, h, dt);
          break;
        case 'rain_heavy':
          this.fxRain(ctx, particles, fx, screenX, screenY, w, h, dt);
          break;
        case 'ember_rain':
          this.fxEmberRain(ctx, particles, fx, screenX, screenY, w, h, dt);
          break;
        case 'lightning_flashes':
          this.fxLightning(ctx, fx, screenX, screenY, w, h);
          break;
        case 'energy_vortex':
          this.fxEnergyVortex(ctx, fx, screenX, screenY, w, h);
          break;
        case 'bioluminescence':
          this.fxBioluminescence(ctx, fx, screenX, screenY, w, h);
          break;
        case 'dust_swirl':
          this.fxDustSwirl(ctx, particles, fx, screenX, screenY, w, h, dt);
          break;
        case 'gentle_waves':
          this.fxGentleWaves(ctx, fx, screenX, screenY, w, h);
          break;
        case 'fireflies':
          this.fxFireflies(ctx, particles, fx, screenX, screenY, w, h, dt);
          break;
        case 'aurora':
          this.fxAurora(ctx, fx, screenX, screenY, w, h);
          break;
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    this.particles.set(sector.id, particles);
  }

  // ── Ethereal Falls FX ────────────────────────────────────────────────────

  /** Vertical cyan/purple waterfall streams cascading down */
  private fxWaterfallStreams(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    fx: SectorOverlayFx,
    sx: number, sy: number, w: number, h: number,
    dt: number,
  ): void {
    // Spawn waterfall droplets
    const spawnRate = 15 * fx.intensity;
    if (Math.random() < spawnRate * dt) {
      // 6 waterfall columns
      const col = Math.floor(Math.random() * 6);
      const colX = sx + (col + 0.5) * (w / 6) + (Math.random() - 0.5) * 8;
      const useSecondary = Math.random() > 0.5 && fx.color2;
      particles.push({
        x: colX,
        y: sy + Math.random() * h * 0.3,
        vx: (Math.random() - 0.5) * 3,
        vy: 30 + Math.random() * 40,
        life: 2 + Math.random() * 2,
        maxLife: 4,
        size: 1.5 + Math.random() * 2,
        color: useSecondary ? fx.color2! : fx.color,
        alpha: 0.4 + Math.random() * 0.4,
      });
    }

    // Draw waterfall glow columns
    ctx.save();
    for (let col = 0; col < 6; col++) {
      const colX = sx + (col + 0.5) * (w / 6);
      const colW = 4 + Math.sin(this.elapsed * 2 + col) * 2;
      const gradient = ctx.createLinearGradient(colX, sy, colX, sy + h);
      gradient.addColorStop(0, fx.color + '00');
      gradient.addColorStop(0.2, fx.color + '30');
      gradient.addColorStop(0.5, fx.color + '20');
      gradient.addColorStop(0.8, (fx.color2 ?? fx.color) + '15');
      gradient.addColorStop(1, fx.color + '00');
      ctx.fillStyle = gradient;
      ctx.fillRect(colX - colW / 2, sy, colW, h);
    }
    ctx.restore();

    // Draw particles
    this.drawParticles(ctx, particles, sx, sy, w, h);
  }

  /** Rising spectral mist from below */
  private fxSpectralMist(
    ctx: CanvasRenderingContext2D,
    fx: SectorOverlayFx,
    sx: number, sy: number, w: number, h: number,
  ): void {
    ctx.save();
    const mistHeight = h * 0.4;
    const gradient = ctx.createLinearGradient(sx, sy + h, sx, sy + h - mistHeight);
    const wave = Math.sin(this.elapsed * 0.5) * 0.1 + 0.2;
    gradient.addColorStop(0, fx.color + hexAlpha(wave * fx.intensity));
    gradient.addColorStop(0.5, (fx.color2 ?? fx.color) + hexAlpha(wave * 0.5 * fx.intensity));
    gradient.addColorStop(1, fx.color + '00');
    ctx.fillStyle = gradient;
    ctx.fillRect(sx, sy + h - mistHeight, w, mistHeight);
    ctx.restore();
  }

  /** Floating island silhouettes with gentle bob */
  private fxFloatingIslands(
    ctx: CanvasRenderingContext2D,
    fx: SectorOverlayFx,
    sx: number, sy: number, w: number, h: number,
  ): void {
    ctx.save();
    ctx.globalAlpha = 0.12 * fx.intensity;

    // 4 floating island shapes at different heights
    const islands = [
      { cx: 0.2, cy: 0.25, r: 18, phase: 0 },
      { cx: 0.6, cy: 0.15, r: 24, phase: 1.5 },
      { cx: 0.4, cy: 0.35, r: 15, phase: 3.0 },
      { cx: 0.8, cy: 0.28, r: 20, phase: 4.5 },
    ];

    for (const isl of islands) {
      const bob = Math.sin(this.elapsed * 0.6 + isl.phase) * 4;
      const cx = sx + w * isl.cx;
      const cy = sy + h * isl.cy + bob;

      // Island body (flat-bottomed oval)
      ctx.fillStyle = fx.color;
      ctx.beginPath();
      ctx.ellipse(cx, cy, isl.r, isl.r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Crystal spire
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy - isl.r * 0.3);
      ctx.lineTo(cx, cy - isl.r);
      ctx.lineTo(cx + 3, cy - isl.r * 0.3);
      ctx.closePath();
      ctx.fill();

      // Glow beneath
      const glowGrad = ctx.createRadialGradient(cx, cy + isl.r * 0.3, 0, cx, cy + isl.r * 0.3, isl.r * 1.5);
      glowGrad.addColorStop(0, fx.color + '40');
      glowGrad.addColorStop(1, fx.color + '00');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(cx - isl.r * 1.5, cy, isl.r * 3, isl.r * 2);
    }

    ctx.restore();
  }

  /** Drifting ghost lights */
  private fxPhantomWisps(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    fx: SectorOverlayFx,
    sx: number, sy: number, w: number, h: number,
    dt: number,
  ): void {
    // Spawn wisps
    const maxWisps = Math.floor(12 * fx.intensity);
    const wispCount = particles.filter(p => p.extra?.isWisp).length;
    if (wispCount < maxWisps && Math.random() < 0.3 * dt) {
      const useSecondary = Math.random() > 0.4 && fx.color2;
      particles.push({
        x: sx + Math.random() * w,
        y: sy + Math.random() * h,
        vx: (Math.random() - 0.5) * 8,
        vy: -5 - Math.random() * 10,
        life: 3 + Math.random() * 4,
        maxLife: 7,
        size: 3 + Math.random() * 4,
        color: useSecondary ? fx.color2! : fx.color,
        alpha: 0.3 + Math.random() * 0.4,
        extra: { isWisp: 1, wobblePhase: Math.random() * Math.PI * 2 },
      });
    }

    // Draw wisps with glow
    ctx.save();
    for (const p of particles) {
      if (!p.extra?.isWisp) continue;
      const lifeRatio = p.life / p.maxLife;
      const wobble = Math.sin(this.elapsed * 2 + (p.extra.wobblePhase ?? 0)) * 6;
      const px = p.x + wobble;
      const py = p.y;

      // Glow
      const grad = ctx.createRadialGradient(px, py, 0, px, py, p.size * 3);
      grad.addColorStop(0, p.color + hexAlpha(p.alpha * lifeRatio));
      grad.addColorStop(1, p.color + '00');
      ctx.fillStyle = grad;
      ctx.fillRect(px - p.size * 3, py - p.size * 3, p.size * 6, p.size * 6);

      // Core
      ctx.beginPath();
      ctx.arc(px, py, p.size * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff' + hexAlpha(p.alpha * lifeRatio * 0.8);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── General Weather FX ───────────────────────────────────────────────────

  private fxSnowfall(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    fx: SectorOverlayFx,
    sx: number, sy: number, w: number, h: number,
    dt: number,
  ): void {
    const max = Math.floor(80 * fx.intensity);
    const count = particles.filter(p => !p.extra?.isWisp).length;
    if (count < max && Math.random() < 20 * dt) {
      particles.push({
        x: sx + Math.random() * w,
        y: sy - 5,
        vx: (Math.random() - 0.5) * 10,
        vy: 15 + Math.random() * 20,
        life: 4 + Math.random() * 3,
        maxLife: 7,
        size: 1 + Math.random() * 2,
        color: fx.color,
        alpha: 0.3 + Math.random() * 0.4,
      });
    }
    this.drawParticles(ctx, particles, sx, sy, w, h);
  }

  private fxRain(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    fx: SectorOverlayFx,
    sx: number, sy: number, w: number, h: number,
    dt: number,
  ): void {
    const max = Math.floor(120 * fx.intensity);
    const count = particles.length;
    if (count < max && Math.random() < 30 * dt) {
      particles.push({
        x: sx + Math.random() * w,
        y: sy - 2,
        vx: -5,
        vy: 80 + Math.random() * 40,
        life: 1.5,
        maxLife: 1.5,
        size: 1,
        color: fx.color,
        alpha: 0.2 + Math.random() * 0.3,
      });
    }

    // Rain streaks
    ctx.save();
    ctx.strokeStyle = fx.color + '30';
    ctx.lineWidth = 1;
    for (const p of particles) {
      if (p.extra?.isWisp) continue;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx * 0.05, p.y + p.vy * 0.05);
      ctx.stroke();
    }
    ctx.restore();
  }

  private fxEmberRain(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    fx: SectorOverlayFx,
    sx: number, sy: number, w: number, h: number,
    dt: number,
  ): void {
    const max = Math.floor(40 * fx.intensity);
    const count = particles.length;
    if (count < max && Math.random() < 8 * dt) {
      const useSecondary = Math.random() > 0.5 && fx.color2;
      particles.push({
        x: sx + Math.random() * w,
        y: sy + h + 5,
        vx: (Math.random() - 0.5) * 15,
        vy: -20 - Math.random() * 25,
        life: 2 + Math.random() * 3,
        maxLife: 5,
        size: 1.5 + Math.random() * 2,
        color: useSecondary ? fx.color2! : fx.color,
        alpha: 0.5 + Math.random() * 0.4,
      });
    }
    this.drawGlowParticles(ctx, particles, sx, sy, w, h);
  }

  private fxLightning(
    ctx: CanvasRenderingContext2D,
    fx: SectorOverlayFx,
    sx: number, sy: number, w: number, h: number,
  ): void {
    // Random lightning flash
    if (Math.random() > 0.995) {
      ctx.save();
      ctx.globalAlpha = 0.15 * fx.intensity;
      ctx.fillStyle = fx.color;
      ctx.fillRect(sx, sy, w, h);
      ctx.restore();
    }
  }

  private fxEnergyVortex(
    ctx: CanvasRenderingContext2D,
    fx: SectorOverlayFx,
    sx: number, sy: number, w: number, h: number,
  ): void {
    const cx = sx + w / 2;
    const cy = sy + h / 2;
    const radius = Math.min(w, h) * 0.35;

    ctx.save();
    ctx.globalAlpha = 0.08 * fx.intensity;

    // Rotating energy rings
    for (let ring = 0; ring < 3; ring++) {
      const angle = this.elapsed * (0.3 + ring * 0.2);
      const r = radius * (0.5 + ring * 0.2);
      ctx.strokeStyle = ring % 2 === 0 ? fx.color : (fx.color2 ?? fx.color);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.4, angle, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Center glow
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.3);
    grad.addColorStop(0, (fx.color2 ?? fx.color) + '40');
    grad.addColorStop(1, fx.color + '00');
    ctx.globalAlpha = 0.15 * fx.intensity;
    ctx.fillStyle = grad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

    ctx.restore();
  }

  private fxBioluminescence(
    ctx: CanvasRenderingContext2D,
    fx: SectorOverlayFx,
    sx: number, sy: number, w: number, h: number,
  ): void {
    ctx.save();
    // Pulsing glow spots
    const spots = 8;
    for (let i = 0; i < spots; i++) {
      const phase = (i / spots) * Math.PI * 2;
      const px = sx + w * (0.15 + 0.7 * ((Math.sin(phase + this.elapsed * 0.3) + 1) / 2));
      const py = sy + h * (0.2 + 0.6 * ((Math.cos(phase * 1.3 + this.elapsed * 0.4) + 1) / 2));
      const pulse = (Math.sin(this.elapsed * 1.5 + phase) + 1) / 2;
      const r = 8 + pulse * 12;

      const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
      grad.addColorStop(0, fx.color + hexAlpha(0.2 * fx.intensity * pulse));
      grad.addColorStop(1, fx.color + '00');
      ctx.fillStyle = grad;
      ctx.fillRect(px - r, py - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  private fxDustSwirl(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    fx: SectorOverlayFx,
    sx: number, sy: number, w: number, h: number,
    dt: number,
  ): void {
    const max = Math.floor(30 * fx.intensity);
    if (particles.length < max && Math.random() < 5 * dt) {
      particles.push({
        x: sx + Math.random() * w,
        y: sy + h * 0.5 + Math.random() * h * 0.5,
        vx: 10 + Math.random() * 20,
        vy: (Math.random() - 0.5) * 5,
        life: 3 + Math.random() * 3,
        maxLife: 6,
        size: 1 + Math.random() * 1.5,
        color: fx.color,
        alpha: 0.15 + Math.random() * 0.2,
      });
    }
    this.drawParticles(ctx, particles, sx, sy, w, h);
  }

  private fxGentleWaves(
    ctx: CanvasRenderingContext2D,
    fx: SectorOverlayFx,
    sx: number, sy: number, w: number, h: number,
  ): void {
    ctx.save();
    ctx.globalAlpha = 0.06 * fx.intensity;
    ctx.strokeStyle = fx.color;
    ctx.lineWidth = 1;

    for (let wave = 0; wave < 4; wave++) {
      const y = sy + h * (0.3 + wave * 0.15);
      ctx.beginPath();
      for (let x = sx; x < sx + w; x += 4) {
        const wy = y + Math.sin((x - sx) * 0.02 + this.elapsed * 1.5 + wave) * 3;
        if (x === sx) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private fxFireflies(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    fx: SectorOverlayFx,
    sx: number, sy: number, w: number, h: number,
    dt: number,
  ): void {
    const max = Math.floor(15 * fx.intensity);
    const count = particles.filter(p => p.extra?.isWisp).length;
    if (count < max && Math.random() < 2 * dt) {
      particles.push({
        x: sx + Math.random() * w,
        y: sy + Math.random() * h,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 4 + Math.random() * 4,
        maxLife: 8,
        size: 2,
        color: fx.color,
        alpha: 0.5,
        extra: { isWisp: 1, wobblePhase: Math.random() * Math.PI * 2 },
      });
    }
    this.drawGlowParticles(ctx, particles.filter(p => p.extra?.isWisp), sx, sy, w, h);
  }

  private fxAurora(
    ctx: CanvasRenderingContext2D,
    fx: SectorOverlayFx,
    sx: number, sy: number, w: number, h: number,
  ): void {
    ctx.save();
    const auroraH = h * 0.25;

    for (let band = 0; band < 3; band++) {
      const y = sy + h * 0.05 + band * 12;
      const grad = ctx.createLinearGradient(sx, y, sx + w, y);
      const shift = Math.sin(this.elapsed * 0.3 + band) * 0.2;

      grad.addColorStop(0, fx.color + '00');
      grad.addColorStop(0.3 + shift, fx.color + hexAlpha(0.08 * fx.intensity));
      grad.addColorStop(0.5, (fx.color2 ?? fx.color) + hexAlpha(0.12 * fx.intensity));
      grad.addColorStop(0.7 - shift, fx.color + hexAlpha(0.06 * fx.intensity));
      grad.addColorStop(1, fx.color + '00');

      ctx.fillStyle = grad;
      const bandH = auroraH / 3;
      ctx.fillRect(sx, y, w, bandH);
    }
    ctx.restore();
  }

  // ── Particle Drawing Helpers ─────────────────────────────────────────────

  private drawParticles(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    sx: number, sy: number, w: number, h: number,
  ): void {
    ctx.save();
    for (const p of particles) {
      if (p.extra?.isWisp) continue;
      const lifeRatio = p.life / p.maxLife;
      ctx.globalAlpha = p.alpha * lifeRatio;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawGlowParticles(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    sx: number, sy: number, w: number, h: number,
  ): void {
    ctx.save();
    for (const p of particles) {
      const lifeRatio = p.life / p.maxLife;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      grad.addColorStop(0, p.color + hexAlpha(p.alpha * lifeRatio));
      grad.addColorStop(1, p.color + '00');
      ctx.fillStyle = grad;
      ctx.fillRect(p.x - p.size * 3, p.y - p.size * 3, p.size * 6, p.size * 6);
    }
    ctx.restore();
  }

  /** Dispose all resources */
  dispose(): void {
    for (const [, video] of videoCache) {
      video.pause();
      video.src = '';
    }
    videoCache.clear();
    imageCache.clear();
    this.particles.clear();
  }
}

// ── Utility ──────────────────────────────────────────────────────────────────

/** Convert a 0-1 alpha value to a 2-char hex string */
function hexAlpha(a: number): string {
  return Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
}
