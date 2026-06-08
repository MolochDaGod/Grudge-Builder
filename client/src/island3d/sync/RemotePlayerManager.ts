/**
 * RemotePlayerManager — renders remote players in the 3D scene
 * using their synced model3d data from Colyseus SectorPlayer schema.
 *
 * Handles:
 *   - Spawning GLTF meshes when players join (based on baseModelId)
 *   - Removing meshes when players leave
 *   - Interpolating position/rotation each frame
 *   - Playing correct animations based on movement state
 *   - Rendering nameplates with character name + level
 *   - Applying skin/armor color tints from model3d data
 */
import * as THREE from 'three';
import { loadCharacterModel, type LoadedModel } from '@/lib/modelLoader';
import {
  MODEL_MANIFEST,
  WEAPON_ANIMATION_SETS,
  getAnimationSet,
  getKaykitAnimMap,
  isKaykitModel,
  resolveModelUrl,
  type WeaponType,
  type ModelUnit,
} from '@/lib/modelManifest';
import { AnimationManager, type AnimState } from '../player/AnimationManager';

// ── Types ────────────────────────────────────────────────────────

/** Synced player data from Colyseus SectorPlayer schema */
export interface RemotePlayerData {
  id: string;
  characterName: string;
  heroClass: string;
  heroRace: string;
  faction: string;
  level: number;
  x: number;
  y: number;
  z: number;
  facing: number;
  state: string; // idle | moving | attacking | harvesting | dead
  hp: number;
  maxHp: number;
  // Model data
  baseModelId: string;
  equippedMeshJson: string;
  weaponSlotsJson: string;
  skinColor: string;
  armorColor: string;
  equippedWeaponType: string;
}

interface RemotePlayerInstance {
  sessionId: string;
  group: THREE.Group;
  loadedModel: LoadedModel | null;
  animations: AnimationManager | null;
  nameplate: THREE.Sprite;
  healthBar: THREE.Group;
  // Interpolation targets
  targetPos: THREE.Vector3;
  targetFacing: number;
  currentState: string;
  // Data
  data: RemotePlayerData;
  modelLoading: boolean;
}

// ── Constants ────────────────────────────────────────────────────

const LERP_SPEED = 8;
const NAMEPLATE_HEIGHT = 4.5;
const HEALTH_BAR_HEIGHT = 4.0;
const HEALTH_BAR_WIDTH = 1.5;

// Map class to default weapon type
const CLASS_WEAPON_MAP: Record<string, WeaponType> = {
  warrior: 'sword-shield',
  mage: 'magic',
  ranger: 'longbow',
  worge: 'greatsword',
};

// Faction colors for nameplates
const FACTION_COLORS: Record<string, number> = {
  crusade: 0xf6c945,
  legion: 0xff6b57,
  fabled: 0x6aa9ff,
};

// ── Module ───────────────────────────────────────────────────────

export class RemotePlayerManager {
  private scene: THREE.Scene;
  private players = new Map<string, RemotePlayerInstance>();
  private localSessionId: string;

  constructor(scene: THREE.Scene, localSessionId: string) {
    this.scene = scene;
    this.localSessionId = localSessionId;
  }

  // ── Add a remote player ────────────────────────────────────────

  addPlayer(sessionId: string, data: RemotePlayerData): void {
    // Don't render self
    if (sessionId === this.localSessionId) return;
    // Don't duplicate
    if (this.players.has(sessionId)) return;

    const group = new THREE.Group();
    group.position.set(data.x, data.y, data.z);
    group.rotation.y = data.facing;

    // Placeholder capsule while model loads
    const capsule = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.6, 1.8, 8, 12),
      new THREE.MeshLambertMaterial({
        color: FACTION_COLORS[data.faction] || 0xcccccc,
      }),
    );
    capsule.position.y = 1.5;
    capsule.castShadow = true;
    capsule.name = '__placeholder';
    group.add(capsule);

    // Nameplate sprite
    const nameplate = this.createNameplate(data.characterName, data.level, data.faction);
    nameplate.position.y = NAMEPLATE_HEIGHT;
    group.add(nameplate);

    // Health bar
    const healthBar = this.createHealthBar(data.hp, data.maxHp);
    healthBar.position.y = HEALTH_BAR_HEIGHT;
    group.add(healthBar);

    this.scene.add(group);

    const instance: RemotePlayerInstance = {
      sessionId,
      group,
      loadedModel: null,
      animations: null,
      nameplate,
      healthBar,
      targetPos: new THREE.Vector3(data.x, data.y, data.z),
      targetFacing: data.facing,
      currentState: data.state,
      data,
      modelLoading: false,
    };

    this.players.set(sessionId, instance);

    // Load the actual GLTF model asynchronously
    this.loadPlayerModel(instance);
  }

  // ── Remove a remote player ─────────────────────────────────────

  removePlayer(sessionId: string): void {
    const instance = this.players.get(sessionId);
    if (!instance) return;

    this.scene.remove(instance.group);
    // Dispose geometry/materials
    instance.group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
    this.players.delete(sessionId);
  }

  // ── Update a remote player's synced data ────────────────────────

  updatePlayer(sessionId: string, data: Partial<RemotePlayerData>): void {
    const instance = this.players.get(sessionId);
    if (!instance) return;

    // Update position targets
    if (data.x !== undefined) instance.targetPos.x = data.x;
    if (data.y !== undefined) instance.targetPos.y = data.y;
    if (data.z !== undefined) instance.targetPos.z = data.z;
    if (data.facing !== undefined) instance.targetFacing = data.facing;

    // Update state → animation
    if (data.state !== undefined && data.state !== instance.currentState) {
      instance.currentState = data.state;
      this.updateAnimation(instance, data.state);
    }

    // Update health bar
    if (data.hp !== undefined || data.maxHp !== undefined) {
      const hp = data.hp ?? instance.data.hp;
      const maxHp = data.maxHp ?? instance.data.maxHp;
      this.updateHealthBar(instance.healthBar, hp, maxHp);
      instance.data.hp = hp;
      instance.data.maxHp = maxHp;
    }

    // Merge data
    Object.assign(instance.data, data);
  }

  // ── Frame update (call from game loop) ─────────────────────────

  update(dt: number): void {
    for (const [, instance] of this.players) {
      // Interpolate position
      instance.group.position.lerp(instance.targetPos, LERP_SPEED * dt);

      // Interpolate rotation (shortest path)
      const currentY = instance.group.rotation.y;
      let targetY = instance.targetFacing;
      let diff = targetY - currentY;
      // Wrap to [-PI, PI]
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      instance.group.rotation.y += diff * LERP_SPEED * dt;

      // Update animation mixer
      if (instance.animations) {
        instance.animations.update(dt);
      }

      // Nameplate always faces camera (billboarding handled by Sprite)
    }
  }

  // ── Load GLTF model for a player ───────────────────────────────

  private async loadPlayerModel(instance: RemotePlayerInstance): Promise<void> {
    if (instance.modelLoading) return;
    instance.modelLoading = true;

    const modelId = instance.data.baseModelId || instance.data.heroRace || 'human';
    const manifest = MODEL_MANIFEST[modelId];

    if (!manifest) {
      console.warn(`[RemotePlayerManager] No model manifest for: ${modelId}`);
      instance.modelLoading = false;
      return;
    }

    try {
      const loaded = await loadCharacterModel(manifest.modelPath);
      instance.loadedModel = loaded;

      // Scale
      loaded.scene.scale.setScalar(manifest.scale);

      // Apply skin/armor color tints
      this.applyColorTints(loaded.scene, instance.data.skinColor, instance.data.armorColor);

      // Enable shadows
      loaded.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Remove placeholder capsule
      const placeholder = instance.group.getObjectByName('__placeholder');
      if (placeholder) instance.group.remove(placeholder);

      // Add loaded model
      instance.group.add(loaded.scene);

      // Setup animations
      const weaponType = (instance.data.equippedWeaponType as WeaponType) ||
        CLASS_WEAPON_MAP[instance.data.heroClass] || 'sword-shield';

      instance.animations = new AnimationManager(loaded.scene);

      if (isKaykitModel(manifest.skeleton)) {
        // ── KayKit models: use 95 embedded clips with clip-name → state mapping ──
        const clipNameToState = getKaykitAnimMap(weaponType);
        for (const clip of loaded.clips) {
          const state = clipNameToState[clip.name];
          if (state) {
            instance.animations.addClipFromGLTF(state as AnimState, clip);
          }
        }
      } else {
        // ── Mixamo / other models: register embedded clips by name heuristic ──
        for (const clip of loaded.clips) {
          const name = clip.name.toLowerCase();
          let state: AnimState = 'idle';
          if (name.includes('walk') || name.includes('run')) state = 'walk';
          else if (name.includes('attack') || name.includes('slash')) state = 'attack';
          else if (name.includes('death')) state = 'death';
          instance.animations.addClipFromGLTF(state, clip);
        }

        // Load external weapon-specific Mixamo animations (only for mixamo-24)
        if (manifest.skeleton === 'mixamo-24') {
          const animSet = getAnimationSet(weaponType);
          const animPaths: Partial<Record<AnimState, string>> = {};
          if (animSet.idle) animPaths.idle = resolveModelUrl(animSet.idle.file);
          if (animSet.run) animPaths.walk = resolveModelUrl(animSet.run.file);
          if (animSet.attack1) animPaths.attack = resolveModelUrl(animSet.attack1.file);

          if (Object.keys(animPaths).length > 0) {
            await instance.animations.loadAnimations(animPaths).catch(() => {});
          }
        }
      }

      // Play initial animation
      this.updateAnimation(instance, instance.currentState);

      console.log(`[RemotePlayerManager] Loaded model for ${instance.data.characterName}: ${modelId}`);
    } catch (err) {
      console.warn(`[RemotePlayerManager] Failed to load model ${modelId}:`, err);
    }

    instance.modelLoading = false;
  }

  // ── Animation state mapping ────────────────────────────────────

  private updateAnimation(instance: RemotePlayerInstance, state: string): void {
    if (!instance.animations) return;

    switch (state) {
      case 'moving':
        instance.animations.play('walk');
        break;
      case 'attacking':
        instance.animations.play('attack');
        break;
      case 'dead':
        instance.animations.play('death');
        break;
      case 'harvesting':
        instance.animations.play('attack'); // reuse attack for harvesting
        break;
      case 'idle':
      default:
        instance.animations.play('idle');
        break;
    }
  }

  // ── Apply color tints to materials ─────────────────────────────

  private applyColorTints(root: THREE.Object3D, skinColor: string, armorColor: string): void {
    if (skinColor === '#ffffff' && armorColor === '#ffffff') return;

    const skinC = new THREE.Color(skinColor);
    const armorC = new THREE.Color(armorColor);

    root.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      for (const mat of mats) {
        if (!(mat as THREE.MeshStandardMaterial).color) continue;
        const stdMat = mat as THREE.MeshStandardMaterial;

        // Simple heuristic: lighter materials = skin, darker = armor
        const lum = stdMat.color.r * 0.3 + stdMat.color.g * 0.59 + stdMat.color.b * 0.11;
        if (lum > 0.6 && skinColor !== '#ffffff') {
          stdMat.color.multiply(skinC);
        } else if (lum <= 0.6 && armorColor !== '#ffffff') {
          stdMat.color.multiply(armorC);
        }
      }
    });
  }

  // ── Create nameplate sprite ────────────────────────────────────

  private createNameplate(name: string, level: number, faction: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.roundRect(8, 8, 240, 48, 8);
    ctx.fill();

    // Level badge
    const factionColor = faction === 'crusade' ? '#f6c945' :
      faction === 'legion' ? '#ff6b57' :
      faction === 'fabled' ? '#6aa9ff' : '#cccccc';
    ctx.fillStyle = factionColor;
    ctx.beginPath();
    ctx.arc(32, 32, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(level), 32, 37);

    // Name
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(name.slice(0, 16), 54, 38);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3, 0.75, 1);
    return sprite;
  }

  // ── Create health bar ──────────────────────────────────────────

  private createHealthBar(hp: number, maxHp: number): THREE.Group {
    const group = new THREE.Group();

    // Background
    const bgGeom = new THREE.PlaneGeometry(HEALTH_BAR_WIDTH, 0.12);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.7, depthTest: false });
    const bg = new THREE.Mesh(bgGeom, bgMat);
    bg.name = '__hpBg';
    group.add(bg);

    // Fill
    const pct = maxHp > 0 ? hp / maxHp : 1;
    const fillGeom = new THREE.PlaneGeometry(HEALTH_BAR_WIDTH * pct, 0.1);
    const fillColor = pct > 0.5 ? 0x44cc44 : pct > 0.25 ? 0xcccc44 : 0xcc4444;
    const fillMat = new THREE.MeshBasicMaterial({ color: fillColor, depthTest: false });
    const fill = new THREE.Mesh(fillGeom, fillMat);
    fill.name = '__hpFill';
    fill.position.x = -(HEALTH_BAR_WIDTH * (1 - pct)) / 2;
    group.add(fill);

    return group;
  }

  private updateHealthBar(group: THREE.Group, hp: number, maxHp: number): void {
    const fill = group.getObjectByName('__hpFill') as THREE.Mesh | undefined;
    if (!fill) return;

    const pct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 1;
    fill.scale.x = pct;
    fill.position.x = -(HEALTH_BAR_WIDTH * (1 - pct)) / 2;

    const mat = fill.material as THREE.MeshBasicMaterial;
    mat.color.setHex(pct > 0.5 ? 0x44cc44 : pct > 0.25 ? 0xcccc44 : 0xcc4444);
  }

  // ── Cleanup ────────────────────────────────────────────────────

  dispose(): void {
    for (const [sessionId] of this.players) {
      this.removePlayer(sessionId);
    }
    this.players.clear();
  }

  /** Get count of active remote players */
  get count(): number {
    return this.players.size;
  }
}
