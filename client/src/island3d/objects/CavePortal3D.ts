/**
 * CavePortal3D.ts
 * ─────────────────────────────────────────────────────────────
 * Three.js cave entrance object placed at dungeon portal locations.
 *
 * Loads the evil_rock_mountains_with_cave_stylized.glb model,
 * scales it for player-walkable cave entrances, and renders a
 * spinning particle swirl vortex at the cave mouth.
 *
 * Interaction: when player is within range, shows "Press E" prompt.
 * On interaction, plays a zoom/fade transition and fires the
 * enter_dungeon callback.
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// ── Config (from DUNGEON_SPAWN_CONFIG.portalSwirl in lore.ts) ──

const PORTAL_CONFIG = {
  // Prefer production dual-mouth / lethal-ape caves; fallback mountain mouth
  modelUrl: "/models/caves/2cave.glb",
  fallbackModelUrl: "/models/caves/old_cave_lethal_ape_redux.glb",
  legacyModelUrl: "/models/evil_rock_mountains_cave.glb",
  scale: new THREE.Vector3(1, 1, 1), // SI meters — art-authored scale
  legacyScale: new THREE.Vector3(0.08, 0.08, 0.08),
  // Swirl vortex
  swirlColor: 0x8844ff,
  swirlSecondary: 0x22ccff,
  swirlRadius: 3.0,
  swirlSpeed: 2.0,
  particleCount: 120,
  interactionRange: 5.0,
  // Prompt
  promptOffsetY: 6.0,
};

// ── Portal Data ─────────────────────────────────────────────

export interface PortalData {
  id: string;
  dungeonName: string;
  dungeonType: string;
  minLevel: number;
  x: number;
  z: number;
  active: boolean;
  entranceModel?: string;
}

// ── CavePortal3D ────────────────────────────────────────────

export class CavePortal3D {
  readonly group: THREE.Group;
  readonly portalData: PortalData;

  private swirl: THREE.Points | null = null;
  private swirlTime: number = 0;
  private swirlPositions: Float32Array | null = null;
  private swirlColors: Float32Array | null = null;
  private prompt: THREE.Sprite | null = null;
  private model: THREE.Object3D | null = null;
  private isPlayerNear: boolean = false;
  private isTransitioning: boolean = false;
  private transitionProgress: number = 0;

  // Callbacks
  onEnter: ((portalId: string) => void) | null = null;

  constructor(portalData: PortalData) {
    this.portalData = portalData;
    this.group = new THREE.Group();
    this.group.position.set(portalData.x, 0, portalData.z);
    this.group.name = `cave_portal_${portalData.id}`;
    this.group.userData = { portalId: portalData.id, isCavePortal: true };

    this.buildSwirl();
    this.buildPrompt();
    if (portalData.active) this.loadModel();
  }

  // ── Load GLB cave model ───────────────────────────────────

  private async loadModel() {
    const loader = new GLTFLoader();
    const urls = [
      this.portalData.entranceModel,
      PORTAL_CONFIG.modelUrl,
      PORTAL_CONFIG.fallbackModelUrl,
      PORTAL_CONFIG.legacyModelUrl,
    ].filter(Boolean) as string[];

    for (const url of urls) {
      try {
        const gltf = await loader.loadAsync(url);
        this.model = gltf.scene;
        const isLegacy = url.includes('evil_rock') || url.includes('mountains_cave');
        this.model.scale.copy(isLegacy ? PORTAL_CONFIG.legacyScale : PORTAL_CONFIG.scale);
        this.model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
            // Water never treats cave shell as ocean volume
            m.userData.suppressWater = true;
            m.userData.caveAccess = true;
          }
        });
        this.group.add(this.model);
        this.group.userData.caveAccessPoint = true;
        this.group.userData.accessRadius = PORTAL_CONFIG.interactionRange;
        return;
      } catch (err) {
        console.warn(`[CavePortal] Failed to load model ${url}:`, err);
      }
    }
    {
      // Fallback: dark rock placeholder
      const geo = new THREE.ConeGeometry(4, 8, 6);
      const mat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });
      const fallback = new THREE.Mesh(geo, mat);
      fallback.position.y = 4;
      this.group.add(fallback);
    }
  }

  // ── Particle swirl vortex ─────────────────────────────────

  private buildSwirl() {
    const count = PORTAL_CONFIG.particleCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const color1 = new THREE.Color(PORTAL_CONFIG.swirlColor);
    const color2 = new THREE.Color(PORTAL_CONFIG.swirlSecondary);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 4; // 2 full spirals
      const r = PORTAL_CONFIG.swirlRadius * (1 - i / count); // spiral inward
      const y = (i / count) * 5; // rise upward

      positions[i * 3]     = Math.cos(angle) * r;
      positions[i * 3 + 1] = y + 1; // offset above ground
      positions[i * 3 + 2] = Math.sin(angle) * r;

      const t = i / count;
      const c = new THREE.Color().lerpColors(color1, color2, t);
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    this.swirlPositions = positions;
    this.swirlColors = colors;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.swirl = new THREE.Points(geo, mat);
    this.swirl.renderOrder = 17; // LAYER_ORDER.EFFECTS
    this.group.add(this.swirl);
  }

  // ── Interaction prompt sprite ─────────────────────────────

  private buildPrompt() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, 256, 64);

    // "Press E" text
    ctx.font = "bold 28px 'Inter', sans-serif";
    ctx.fillStyle = "#ffd700";
    ctx.textAlign = "center";
    ctx.fillText("Press E", 128, 30);

    // Dungeon name
    ctx.font = "16px 'Inter', sans-serif";
    ctx.fillStyle = "#aaa";
    ctx.fillText(this.portalData.dungeonName, 128, 52);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0 });
    this.prompt = new THREE.Sprite(mat);
    this.prompt.position.set(0, PORTAL_CONFIG.promptOffsetY, 0);
    this.prompt.scale.set(6, 1.5, 1);
    this.prompt.renderOrder = 20; // LAYER_ORDER.HUD_WORLD
    this.group.add(this.prompt);
  }

  // ── Per-frame update ──────────────────────────────────────

  update(delta: number, playerPosition: THREE.Vector3) {
    this.swirlTime += delta;

    // Animate swirl rotation
    if (this.swirl && this.portalData.active) {
      this.swirl.rotation.y += PORTAL_CONFIG.swirlSpeed * delta;

      // Pulse opacity
      const pulse = 0.6 + Math.sin(this.swirlTime * 3) * 0.2;
      (this.swirl.material as THREE.PointsMaterial).opacity = pulse;

      // Animate individual particles along spiral
      if (this.swirlPositions) {
        const pos = this.swirl.geometry.attributes.position as THREE.BufferAttribute;
        const count = PORTAL_CONFIG.particleCount;
        for (let i = 0; i < count; i++) {
          const baseAngle = (i / count) * Math.PI * 4 + this.swirlTime * 2;
          const r = PORTAL_CONFIG.swirlRadius * (1 - i / count) * (0.8 + Math.sin(this.swirlTime + i) * 0.2);
          const y = (i / count) * 5 + Math.sin(this.swirlTime * 2 + i * 0.5) * 0.3;

          pos.setXYZ(i, Math.cos(baseAngle) * r, y + 1, Math.sin(baseAngle) * r);
        }
        pos.needsUpdate = true;
      }
    }

    // Proximity check
    const dx = playerPosition.x - this.group.position.x;
    const dz = playerPosition.z - this.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const wasNear = this.isPlayerNear;
    this.isPlayerNear = dist <= PORTAL_CONFIG.interactionRange && this.portalData.active;

    // Fade prompt in/out
    if (this.prompt) {
      const targetOpacity = this.isPlayerNear ? 1 : 0;
      const mat = this.prompt.material as THREE.SpriteMaterial;
      mat.opacity += (targetOpacity - mat.opacity) * Math.min(1, delta * 5);

      // Bob the prompt
      if (this.isPlayerNear) {
        this.prompt.position.y = PORTAL_CONFIG.promptOffsetY + Math.sin(this.swirlTime * 2) * 0.3;
      }
    }

    // Transition animation (zoom into portal)
    if (this.isTransitioning) {
      this.transitionProgress += delta * 2; // 0.5 second transition
      if (this.transitionProgress >= 1) {
        this.isTransitioning = false;
        this.transitionProgress = 0;
        this.onEnter?.(this.portalData.id);
      }
    }

    // Scale pulse when player is near
    if (this.swirl) {
      const targetScale = this.isPlayerNear ? 1.3 : 1.0;
      this.swirl.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 3);
    }
  }

  // ── Interaction ───────────────────────────────────────────

  /** Call this when player presses E near the portal */
  interact(): boolean {
    if (!this.isPlayerNear || !this.portalData.active || this.isTransitioning) return false;
    this.isTransitioning = true;
    this.transitionProgress = 0;
    return true;
  }

  /** Is the portal currently showing the interaction prompt? */
  get canInteract(): boolean {
    return this.isPlayerNear && this.portalData.active && !this.isTransitioning;
  }

  /** Current transition progress (0-1, for camera/fade effects) */
  get transition(): number {
    return this.transitionProgress;
  }

  // ── Cleanup ───────────────────────────────────────────────

  dispose() {
    this.group.traverse((child) => {
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
      if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else (mat as THREE.Material).dispose();
      }
    });
    this.group.parent?.remove(this.group);
  }

  // ── Deactivate (dungeon cleared, waiting for respawn) ─────

  setActive(active: boolean) {
    this.portalData.active = active;
    if (this.swirl) this.swirl.visible = active;
    if (!active && this.prompt) {
      (this.prompt.material as THREE.SpriteMaterial).opacity = 0;
    }
  }
}

// ── Portal Manager ──────────────────────────────────────────
// Manages all cave portals in a sector scene.

export class CavePortalManager {
  private portals: Map<string, CavePortal3D> = new Map();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Add portals from server portal_list message */
  loadPortals(portalList: PortalData[], onEnter: (portalId: string) => void) {
    for (const data of portalList) {
      if (this.portals.has(data.id)) continue;
      const portal = new CavePortal3D(data);
      portal.onEnter = onEnter;
      this.scene.add(portal.group);
      this.portals.set(data.id, portal);
    }
  }

  /** Per-frame update all portals */
  update(delta: number, playerPosition: THREE.Vector3) {
    for (const portal of this.portals.values()) {
      portal.update(delta, playerPosition);
    }
  }

  /** Handle E key press — returns true if a portal was activated */
  tryInteract(): boolean {
    for (const portal of this.portals.values()) {
      if (portal.interact()) return true;
    }
    return false;
  }

  /** Deactivate a specific portal (after dungeon clear) */
  deactivatePortal(portalId: string) {
    this.portals.get(portalId)?.setActive(false);
  }

  /** Reactivate a portal (respawn) */
  activatePortal(portalId: string, newData?: Partial<PortalData>) {
    const portal = this.portals.get(portalId);
    if (portal && newData) {
      Object.assign(portal.portalData, newData);
    }
    portal?.setActive(true);
  }

  /** Cleanup all portals */
  dispose() {
    for (const portal of this.portals.values()) portal.dispose();
    this.portals.clear();
  }

  /** Get the portal currently showing interaction prompt (if any) */
  get activeInteraction(): CavePortal3D | null {
    for (const portal of this.portals.values()) {
      if (portal.canInteract) return portal;
    }
    return null;
  }
}
