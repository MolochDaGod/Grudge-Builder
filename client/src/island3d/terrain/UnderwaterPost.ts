/**
 * UnderwaterPost — camera-below-water fog + color grade (Captain-of-the-Seas style).
 *
 * Lightweight: no extra full-screen RT required.
 * - Scene fog swap when submerged
 * - Optional CSS overlay tint on the canvas parent (cheap)
 * - Exposes state for HUD ("Taking water" / dive UI)
 */
import * as THREE from 'three';

export interface UnderwaterPostOptions {
  waterLevel?: number;
  /** How far below surface before full effect (m) */
  fullDepth?: number;
  fogColor?: THREE.ColorRepresentation;
  fogDensity?: number;
  tintColor?: string;
  /** Max overlay opacity when fully submerged */
  maxTintOpacity?: number;
}

export class UnderwaterPost {
  waterLevel: number;
  fullDepth: number;
  fogColor: THREE.Color;
  fogDensity: number;
  tintColor: string;
  maxTintOpacity: number;

  /** True when camera is under water surface */
  submerged = false;
  /** 0 surface · 1 deep */
  depthFactor = 0;

  private savedFog: THREE.FogBase | null = null;
  private underwaterFog: THREE.FogExp2;
  private overlay: HTMLDivElement | null = null;
  private host: HTMLElement | null = null;

  constructor(opts: UnderwaterPostOptions = {}) {
    this.waterLevel = opts.waterLevel ?? 0;
    this.fullDepth = opts.fullDepth ?? 8;
    this.fogColor = new THREE.Color(opts.fogColor ?? 0x04304a);
    this.fogDensity = opts.fogDensity ?? 0.045;
    this.tintColor = opts.tintColor ?? 'rgba(4, 48, 74, 0.55)';
    this.maxTintOpacity = opts.maxTintOpacity ?? 0.62;
    this.underwaterFog = new THREE.FogExp2(this.fogColor.getHex(), this.fogDensity);
  }

  setWaterLevel(y: number): void {
    this.waterLevel = y;
  }

  /** Attach a full-screen tint over the WebGL canvas parent. */
  attachOverlay(canvas: HTMLCanvasElement): void {
    this.detachOverlay();
    const parent = canvas.parentElement;
    if (!parent) return;
    this.host = parent;
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    const el = document.createElement('div');
    el.className = 'grudge-underwater-tint';
    el.setAttribute('aria-hidden', 'true');
    Object.assign(el.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '5',
      opacity: '0',
      transition: 'opacity 0.2s ease',
      background: `radial-gradient(ellipse at 50% 40%, transparent 0%, ${this.tintColor} 85%)`,
      mixBlendMode: 'multiply',
    } as CSSStyleDeclaration);
    parent.appendChild(el);
    this.overlay = el;
  }

  detachOverlay(): void {
    this.overlay?.remove();
    this.overlay = null;
    this.host = null;
  }

  /**
   * Call each frame after camera update, before or after render.
   */
  update(scene: THREE.Scene, camera: THREE.Camera): void {
    const y = camera.position.y;
    const depth = this.waterLevel - y;
    const was = this.submerged;
    this.submerged = depth > 0.08;
    this.depthFactor = this.submerged
      ? Math.min(1, Math.max(0, depth / this.fullDepth))
      : 0;

    if (this.submerged) {
      if (!was) {
        this.savedFog = scene.fog;
      }
      this.underwaterFog.color.copy(this.fogColor);
      this.underwaterFog.density = this.fogDensity * (0.55 + 0.45 * this.depthFactor);
      scene.fog = this.underwaterFog;
    } else if (was) {
      scene.fog = this.savedFog;
      this.savedFog = null;
    }

    if (this.overlay) {
      this.overlay.style.opacity = this.submerged
        ? String(this.maxTintOpacity * (0.35 + 0.65 * this.depthFactor))
        : '0';
    }
  }

  dispose(): void {
    this.detachOverlay();
  }
}
