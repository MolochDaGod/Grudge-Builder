/**
 * TutorialHarvestController — first-segment harvest:
 * unarmed E/RMB/1/2 gather, soft-lock multi-hit chunk rock with pickaxe,
 * harvest anim hooks, equip MainHand tool.
 */
import * as THREE from 'three';
import type { CharacterController3D } from '../player/CharacterController3D';
import {
  CHUNK_ROCK,
  TUTORIAL_FIRST_LAYOUT,
  type TutorialSegmentPhase,
} from '@shared/definitions/tutorialFirstSegment';
import { spawnResourceDrops, updateHarvestDrops, type HarvestDrop } from '../harvest/HarvestFeedback';

export interface TutorialHarvestCallbacks {
  onGather: (resource: 'stick' | 'stone', qty: number, sourceId: string) => void;
  onChunkHit: (hitsLeft: number, maxHits: number) => void;
  onChunkDestroyed: () => void;
  onPhaseHint?: (msg: string) => void;
}

export interface NearNode {
  id: string;
  kind: 'stick' | 'stone' | 'chunk_rock' | 'tree' | 'flower' | 'chest';
  object: THREE.Object3D;
  position: THREE.Vector3;
  health: number;
  maxHealth: number;
  depleted: boolean;
}

export class TutorialHarvestController {
  private character: CharacterController3D;
  private scene: THREE.Scene;
  private cb: TutorialHarvestCallbacks;
  private nodes = new Map<string, NearNode>();
  private softLockId: string | null = null;
  private softLockTimer = 0;
  private hitCooldown = 0;
  private drops: HarvestDrop[] = [];
  private autoMode = false;
  private equippedTool: string | null = null;
  private keys = new Set<string>();
  private rmb = false;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private group: THREE.Group;
  /** World origin offset (shipwreck_cove on pirate-islands). */
  private origin: THREE.Vector3;

  constructor(
    character: CharacterController3D,
    scene: THREE.Scene,
    cb: TutorialHarvestCallbacks,
    worldOrigin?: { x: number; y: number; z: number },
  ) {
    this.character = character;
    this.scene = scene;
    this.cb = cb;
    this.origin = new THREE.Vector3(
      worldOrigin?.x ?? 0,
      worldOrigin?.y ?? 0,
      worldOrigin?.z ?? 0,
    );
    this.group = new THREE.Group();
    this.group.name = 'TutorialHarvestNodes';
    this.group.position.copy(this.origin);
    scene.add(this.group);

    this.boundKeyDown = (e) => {
      this.keys.add(e.key.toLowerCase());
      if (e.key === '1') this.autoMode = true;
      if (e.key === '2') {
        this.autoMode = false;
        this.tryHarvestOnce();
      }
      if (e.key.toLowerCase() === 'e') this.tryHarvestOnce();
    };
    this.boundKeyUp = (e) => {
      this.keys.delete(e.key.toLowerCase());
      if (e.key === '1') this.autoMode = false;
    };
    this.boundMouseDown = (e) => {
      if (e.button === 2) {
        this.rmb = true;
        this.tryHarvestOnce();
      }
    };
    this.boundMouseUp = (e) => {
      if (e.button === 2) this.rmb = false;
    };

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mouseup', this.boundMouseUp);
    // Prevent context menu on RMB harvest
    window.addEventListener('contextmenu', this.preventCtx);
  }

  private preventCtx = (e: Event) => {
    if (this.character.mode === 'harvest') e.preventDefault();
  };

  /** Build near stick/stone + chunk rock + inland grove markers */
  buildFirstSegmentNodes(): void {
    const L = TUTORIAL_FIRST_LAYOUT;

    this.addProp('near_stick', 'stick', L.nearStick, 0.35, makeStickMesh());
    this.addProp('near_stone', 'stone', L.nearStone, 0.4, makeSmallStoneMesh());

    // Large multi-hit rock
    const big = makeChunkRockMesh();
    this.addProp('chunk_rock_wake', 'chunk_rock', L.chunkRock, 1.4, big, CHUNK_ROCK.maxHits);

    // Inland trees / flowers / chest
    L.trees.forEach((t, i) => {
      this.addProp(`tree_${i}`, 'tree', { x: t.x, y: 0, z: t.z }, 1.2, makeTreeMesh());
    });
    L.flowers.forEach((f, i) => {
      this.addProp(`flower_${i}`, 'flower', { x: f.x, y: 0.1, z: f.z }, 0.3, makeFlowerMesh());
    });
    this.addProp('chest_grove', 'chest', L.chest, 0.5, makeChestMesh());
  }

  private addProp(
    id: string,
    kind: NearNode['kind'],
    pos: { x: number; y: number; z: number },
    scale: number,
    mesh: THREE.Object3D,
    maxHealth = 1,
  ) {
    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.scale.setScalar(scale);
    mesh.name = id;
    this.group.add(mesh);
    // World position for soft-lock distance checks
    const world = new THREE.Vector3(
      this.origin.x + pos.x,
      this.origin.y + pos.y,
      this.origin.z + pos.z,
    );
    this.nodes.set(id, {
      id,
      kind,
      object: mesh,
      position: world,
      health: maxHealth,
      maxHealth,
      depleted: false,
    });
  }

  setEquippedTool(itemId: string | null) {
    this.equippedTool = itemId;
    // Equipment slot on character
    if (itemId) {
      this.character.setEquipment({
        ...this.character.equipment,
        MainHand: itemId,
      });
    } else {
      this.character.setEquipment({
        ...this.character.equipment,
        MainHand: null,
      });
    }
  }

  getEquippedTool() {
    return this.equippedTool;
  }

  hasPickaxe(): boolean {
    return !!this.equippedTool && /pick/i.test(this.equippedTool);
  }

  update(dt: number, phase: TutorialSegmentPhase) {
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.drops = updateHarvestDrops(this.drops, dt, this.scene);

    const harvestActive =
      phase === 'gather_basics'
      || phase === 'chunk_harvest_stone'
      || phase === 'walk_forward'
      || phase === 'segment_complete';

    if (!harvestActive || this.character.mode !== 'harvest') {
      this.clearSoftLock();
      return;
    }

    // Soft-lock hold: E or RMB or auto 1
    const holding =
      this.keys.has('e') || this.rmb || this.autoMode || this.keys.has('1');

    if (holding) {
      this.softLockTimer += dt;
      if (!this.softLockId) {
        const near = this.findNearestHarvestable(phase);
        if (near) this.beginSoftLock(near.id);
      }
      if (this.softLockId && this.hitCooldown <= 0) {
        this.applyHit(this.softLockId, phase);
      }
    } else {
      this.softLockTimer = 0;
      // Keep soft lock briefly so player can re-tap
      if (this.softLockTimer <= 0 && !holding) {
        // release after short grace only if not hitting
      }
    }

    // Face soft-lock target (soft lock camera feel)
    if (this.softLockId) {
      const n = this.nodes.get(this.softLockId);
      if (n && !n.depleted) {
        this.faceTarget(n.position);
        this.pulseTarget(n, dt);
      } else {
        this.clearSoftLock();
      }
    }
  }

  tryHarvestOnce() {
    if (this.character.mode !== 'harvest') return;
    if (this.hitCooldown > 0) return;
    // Prefer soft-lock target
    if (this.softLockId) {
      this.applyHit(this.softLockId, 'gather_basics');
      return;
    }
    const near = this.findNearestHarvestable('gather_basics');
    if (near) {
      this.beginSoftLock(near.id);
      this.applyHit(near.id, 'gather_basics');
    } else {
      this.cb.onPhaseHint?.('Move closer to a stick or stone');
    }
  }

  private findNearestHarvestable(phase: TutorialSegmentPhase): NearNode | null {
    const pos = this.character.getPosition();
    let best: NearNode | null = null;
    let bestD = phase === 'chunk_harvest_stone' ? 5.5 : 3.8;
    for (const n of this.nodes.values()) {
      if (n.depleted) continue;
      // Phase gates
      if (phase === 'gather_basics' && n.kind !== 'stick' && n.kind !== 'stone') continue;
      if (phase === 'chunk_harvest_stone' && n.kind !== 'chunk_rock' && n.kind !== 'stone') continue;
      if (phase === 'walk_forward' && (n.kind === 'stick')) continue;
      const d = pos.distanceTo(n.position);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  private beginSoftLock(id: string) {
    this.softLockId = id;
    this.softLockTimer = 0;
  }

  private clearSoftLock() {
    this.softLockId = null;
    this.softLockTimer = 0;
  }

  private applyHit(id: string, phase: TutorialSegmentPhase) {
    const n = this.nodes.get(id);
    if (!n || n.depleted) return;

    const pick = this.hasPickaxe();
    let dmg = 1;
    if (n.kind === 'chunk_rock') {
      dmg = pick ? CHUNK_ROCK.pickaxeDamage : CHUNK_ROCK.unarmedDamage;
      if (!pick && phase === 'chunk_harvest_stone') {
        this.cb.onPhaseHint?.('Equip the pickaxe to MainHand to break this rock efficiently');
      }
    }

    // Harvest swing + pickaxe (CharacterController3D API)
    try {
      const ch = this.character as {
        playHarvestSwing?: () => void;
        equipHarvestPickaxeTool?: () => Promise<void>;
        hasHarvestPickaxe?: boolean;
        mode?: string;
      };
      if (ch.mode === 'harvest' || ch.playHarvestSwing) {
        if (!ch.hasHarvestPickaxe) void ch.equipHarvestPickaxeTool?.();
        ch.playHarvestSwing?.();
      }
    } catch { /* optional */ }

    n.health = Math.max(0, n.health - dmg);
    this.hitCooldown = pick ? 0.38 : 0.55;

    // Chip visual
    n.object.scale.multiplyScalar(0.97);
    n.object.rotation.y += 0.15;
    n.object.position.y += 0.02;

    if (n.kind === 'stick') {
      this.finishNode(n, 'stick', 1);
      return;
    }
    if (n.kind === 'stone' && n.maxHealth <= 1) {
      this.finishNode(n, 'stone', 1);
      return;
    }
    if (n.kind === 'chunk_rock') {
      this.cb.onChunkHit(n.health, n.maxHealth);
      this.cb.onGather('stone', CHUNK_ROCK.resourcePerHit.stone, n.id);
      void spawnResourceDrops(this.scene, n.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 'debris', 2).then((d) => {
        this.drops.push(...d);
      });
      if (n.health <= 0) {
        this.cb.onGather('stone', CHUNK_ROCK.finalBonus.stone, n.id);
        this.finishNode(n, 'stone', 0); // already granted
        this.cb.onChunkDestroyed();
        // Shatter effect
        void spawnResourceDrops(this.scene, n.position.clone(), 'debris', 6).then((d) => {
          this.drops.push(...d);
        });
      }
      return;
    }
    if (n.kind === 'tree') {
      this.cb.onGather('stick', 1, n.id);
      this.finishNode(n, 'stick', 0);
      return;
    }
    if (n.kind === 'flower') {
      this.finishNode(n, 'stick', 0);
      this.cb.onPhaseHint?.('Picked wild flower');
      return;
    }
    if (n.kind === 'chest') {
      this.finishNode(n, 'stone', 0);
      this.cb.onPhaseHint?.('Chest opened — loot later in camp loop');
    }
  }

  private finishNode(n: NearNode, resource: 'stick' | 'stone', qty: number) {
    n.depleted = true;
    n.object.visible = false;
    this.clearSoftLock();
    if (qty > 0) this.cb.onGather(resource, qty, n.id);
  }

  private faceTarget(target: THREE.Vector3) {
    const pos = this.character.getPosition();
    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    if (dx * dx + dz * dz < 0.01) return;
    const yaw = Math.atan2(dx, dz);
    // Soft turn model
    const model = this.character.model;
    model.rotation.y = THREE.MathUtils.lerp(model.rotation.y, yaw, 0.15);
  }

  private pulseTarget(n: NearNode, dt: number) {
    const t = performance.now() * 0.008;
    const pulse = 1 + Math.sin(t) * 0.03;
    const base = n.kind === 'chunk_rock' ? 1.4 : 1;
    // Don't fight chip scale too hard
    if (n.health === n.maxHealth) {
      n.object.scale.setScalar(base * pulse);
    }
  }

  isNearGrove(playerPos: THREE.Vector3): boolean {
    const g = TUTORIAL_FIRST_LAYOUT.groveCenter;
    return Math.hypot(playerPos.x - g.x, playerPos.z - g.z) < 8;
  }

  dispose() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('mousedown', this.boundMouseDown);
    window.removeEventListener('mouseup', this.boundMouseUp);
    window.removeEventListener('contextmenu', this.preventCtx);
    this.scene.remove(this.group);
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => mat?.dispose?.());
      }
    });
  }
}

// ── Simple meshes ────────────────────────────────────────────────────────────

function wood(c = 0x8b6914) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
}
function rock(c = 0x8a8f98) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 });
}

function makeStickMesh() {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.85, 5), wood());
  m.rotation.z = Math.PI / 2 + 0.25;
  m.castShadow = true;
  return m;
}

function makeSmallStoneMesh() {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), rock(0x9ca3af));
  m.castShadow = true;
  return m;
}

function makeChunkRockMesh() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), rock(0x6b7280));
  core.scale.set(1.2, 0.9, 1.1);
  core.castShadow = true;
  core.receiveShadow = true;
  g.add(core);
  for (let i = 0; i < 3; i++) {
    const chip = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 0), rock(0x78716c));
    chip.position.set(Math.cos(i) * 0.7, 0.2, Math.sin(i) * 0.7);
    g.add(chip);
  }
  // Soft-lock ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.3, 1.45, 32),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  g.add(ring);
  return g;
}

function makeTreeMesh() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 2.2, 6), wood(0x5c4033));
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  g.add(trunk);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), new THREE.MeshStandardMaterial({ color: 0x228b22 }));
  canopy.position.y = 2.6;
  canopy.castShadow = true;
  g.add(canopy);
  return g;
}

function makeFlowerMesh() {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4), new THREE.MeshStandardMaterial({ color: 0x4ade80 }));
  stem.position.y = 0.2;
  g.add(stem);
  const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshStandardMaterial({ color: 0xf472b6 }));
  bloom.position.y = 0.45;
  g.add(bloom);
  return g;
}

function makeChestMesh() {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.65), wood(0x92400e));
  box.position.y = 0.28;
  box.castShadow = true;
  g.add(box);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.12, 0.68), wood(0xa16207));
  lid.position.y = 0.58;
  g.add(lid);
  return g;
}
