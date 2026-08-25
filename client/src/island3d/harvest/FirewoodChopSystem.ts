/**
 * FirewoodChopSystem — screen.toys/firewood-style axe workflow on Grudge trees.
 *
 * Standing: notch the base at a consistent angle → tree falls away from face.
 * Downed: split log segments with axe plane → pinata fragments → collect.
 *
 * SSOT thresholds: @shared/definitions/firewoodChop
 * Fracture: PinataHarvestBreakSystem (optional)
 */
import * as THREE from 'three';
import {
  FIREWOOD_CHOP,
  evaluateBaseStrike,
  evaluateGroundSplit,
  fallYawFromNotchFace,
  groundSplitPlaneFromFacing,
  initialSegmentHits,
  type FirewoodChopConfig,
  type BaseStrikeEval,
} from '@shared/definitions/firewoodChop';
import type { HarvestableTree } from '../objects/HarvestableTree';
import type { PinataHarvestBreakSystem } from './PinataHarvestBreak';
import { beginTreeFall } from './HarvestFeedback';

export interface FirewoodChopCallbacks {
  onPrompt?: (msg: string | null) => void;
  onFell?: (tree: HarvestableTree, fallYaw: number) => void;
  onSegmentSplit?: (tree: HarvestableTree, segment: number) => void;
  onWoodCollected?: (qty: number, tree: HarvestableTree) => void;
  onNotch?: (tree: HarvestableTree, eval: BaseStrikeEval) => void;
}

export interface CollectibleWood {
  mesh: THREE.Object3D;
  qty: number;
  life: number;
  maxLife: number;
  treeId: string;
}

export class FirewoodChopSystem {
  private cfg: FirewoodChopConfig;
  private pinata: PinataHarvestBreakSystem | null;
  private cb: FirewoodChopCallbacks;
  private collectibles: CollectibleWood[] = [];
  private scene: THREE.Scene | null = null;

  constructor(opts?: {
    cfg?: FirewoodChopConfig;
    pinata?: PinataHarvestBreakSystem | null;
    cb?: FirewoodChopCallbacks;
    scene?: THREE.Scene;
  }) {
    this.cfg = opts?.cfg ?? FIREWOOD_CHOP;
    this.pinata = opts?.pinata ?? null;
    this.cb = opts?.cb ?? {};
    this.scene = opts?.scene ?? null;
  }

  setPinata(p: PinataHarvestBreakSystem | null): void {
    this.pinata = p;
  }

  setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  setConfig(cfg: Partial<FirewoodChopConfig>): void {
    this.cfg = { ...this.cfg, ...cfg };
  }

  /** Ensure firewood state fields exist on a tree. */
  ensureState(tree: HarvestableTree): void {
    if (tree.notchProgress == null) tree.notchProgress = 0;
    if (tree.notchFaceYaw === undefined) tree.notchFaceYaw = null;
    if (!tree.segmentHits) tree.segmentHits = initialSegmentHits(this.cfg);
    if (tree.woodCollected == null) tree.woodCollected = 0;
  }

  /**
   * Standing-tree axe strike. Returns true if handled (caller should stop other harvest).
   */
  strikeStanding(
    tree: HarvestableTree,
    impact: THREE.Vector3,
    _playerPos: THREE.Vector3,
  ): boolean {
    if (tree.fallPhase !== 'live' && tree.fallPhase !== 'notching') return false;
    this.ensureState(tree);

    const base = tree.group.position;
    const ev = evaluateBaseStrike({
      treeX: base.x,
      treeZ: base.z,
      treeBaseY: base.y,
      impactX: impact.x,
      impactY: impact.y,
      impactZ: impact.z,
      faceYaw: tree.notchFaceYaw ?? null,
      cfg: this.cfg,
    });

    if (ev.locksFace) {
      tree.notchFaceYaw = ev.strikeYaw;
    }

    tree.fallPhase = 'notching';
    tree.notchProgress = Math.min(1, (tree.notchProgress ?? 0) + ev.progressDelta);
    tree.shaking = true;
    tree.shakeTime = 0;

    // Visual: slight lean toward fall as notch deepens
    if (tree.notchFaceYaw != null) {
      const lean = tree.notchProgress * 0.08;
      const fallYaw = fallYawFromNotchFace(tree.notchFaceYaw);
      tree.group.rotation.x = Math.sin(fallYaw) * lean;
      tree.group.rotation.z = Math.cos(fallYaw) * lean;
    }

    // Chip flakes on good base hits
    if (ev.angleOk && this.pinata) {
      this.pinata.breakNode('tree', tree.group, {
        mode: 'chip',
        impactPoint: impact,
        impactDir: new THREE.Vector3(
          impact.x - base.x,
          0.1,
          impact.z - base.z,
        ).normalize(),
        scale: tree.baseScale * 0.35,
      });
    }

    this.cb.onNotch?.(tree, ev);
    this.cb.onPrompt?.(
      `${ev.message}  (${Math.round((tree.notchProgress ?? 0) * 100)}% notch)`,
    );

    if ((tree.notchProgress ?? 0) >= 1) {
      this.fellTree(tree);
    }
    return true;
  }

  private fellTree(tree: HarvestableTree): void {
    this.ensureState(tree);
    const face = tree.notchFaceYaw ?? 0;
    const fallYaw = fallYawFromNotchFace(face);
    tree.fallYaw = fallYaw;
    // Map to legacy fallAxis for HarvestFeedback (signed lean on X)
    tree.fallAxis = Math.sin(fallYaw) >= 0 ? 1 : -1;
    tree.fallAxisZ = Math.cos(fallYaw);
    beginTreeFall(tree);
    tree.segmentHits = initialSegmentHits(this.cfg);
    this.cb.onFell?.(tree, fallYaw);
    this.cb.onPrompt?.('Timber! Walk to the fallen trunk and split it with the axe.');
  }

  /**
   * Call when fall animation finishes — enter downed log phase (do not stump yet).
   */
  onFallComplete(tree: HarvestableTree): void {
    if (tree.fallPhase !== 'falling') return;
    tree.fallPhase = 'downed';
    tree.fallProgress = 1;
    // Lay log on ground along fall yaw
    const fy = tree.fallYaw ?? 0;
    tree.group.rotation.x = Math.sin(fy) * (Math.PI / 2);
    tree.group.rotation.z = Math.cos(fy) * (Math.PI / 2) * 0.15;
    tree.group.position.y += 0.15;
    this.ensureState(tree);
    this.cb.onPrompt?.('Fallen log — aim and chop to split (firewood style).');
  }

  /**
   * Axe strike on downed / splitting log.
   */
  strikeDowned(
    tree: HarvestableTree,
    impact: THREE.Vector3,
    playerFacingYaw: number,
  ): boolean {
    if (tree.fallPhase !== 'downed' && tree.fallPhase !== 'splitting') return false;
    this.ensureState(tree);
    tree.fallPhase = 'splitting';

    const segs = tree.segmentHits!;
    // Pick segment by impact position along trunk axis (simple index by hit order / random nearby)
    let hitSeg = segs.findIndex((h) => h < this.cfg.hitsPerSegment);
    if (hitSeg < 0) hitSeg = segs.length - 1;

    // Prefer segment near impact distance from base
    const base = tree.group.position;
    const dist = impact.distanceTo(base);
    const approx = Math.min(
      segs.length - 1,
      Math.max(0, Math.floor((dist / Math.max(1, tree.baseScale * 6)) * segs.length)),
    );
    if (segs[approx]! < this.cfg.hitsPerSegment) hitSeg = approx;

    const before = segs.slice();
    const ev = evaluateGroundSplit({
      segmentHits: before,
      hitSegmentIndex: hitSeg,
      cfg: this.cfg,
    });
    // Apply hit to actual array
    const i = ev.segmentIndex;
    tree.segmentHits![i] = (tree.segmentHits![i] ?? 0) + 1;

    const plane = groundSplitPlaneFromFacing(playerFacingYaw);
    const impactDir = new THREE.Vector3(plane.nx, 0.15, plane.nz);

    if (this.pinata) {
      this.pinata.breakNode('tree', tree.group, {
        mode: ev.completedSegment ? 'shatter' : 'chip',
        impactPoint: impact,
        impactDir,
        scale: tree.baseScale * (ev.completedSegment ? 0.55 : 0.3),
        nodeGroup: ev.allDone ? tree.group : undefined,
      });
    }

    // Spawn collectible wood proxies
    if (ev.completedSegment) {
      this.spawnCollectibleWood(tree, impact, this.cfg.woodPiecesPerSegment ?? 2);
      this.cb.onSegmentSplit?.(tree, i);
    }

    this.cb.onPrompt?.(ev.message);

    if (ev.allDone || tree.segmentHits!.every((h) => h >= this.cfg.hitsPerSegment)) {
      tree.fallPhase = 'stump';
      // Leave a stump marker at original base if we still have group
      this.cb.onPrompt?.('Log cleared — pick up remaining wood pieces.');
    }
    return true;
  }

  private spawnCollectibleWood(
    tree: HarvestableTree,
    at: THREE.Vector3,
    count: number,
  ): void {
    if (!this.scene) return;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.14, 0.55, 6),
        new THREE.MeshStandardMaterial({
          color: 0x8b5a2b,
          roughness: 0.9,
        }),
      );
      mesh.position.copy(at);
      mesh.position.x += (Math.random() - 0.5) * 1.2;
      mesh.position.y += 0.3 + Math.random() * 0.4;
      mesh.position.z += (Math.random() - 0.5) * 1.2;
      mesh.rotation.set(Math.random(), Math.random(), Math.random());
      mesh.userData.collectibleWood = true;
      mesh.userData.qty = 1;
      this.scene.add(mesh);
      this.collectibles.push({
        mesh,
        qty: 1,
        life: 0,
        maxLife: this.cfg.fragmentAutoLootSec,
        treeId: tree.nodeId ?? tree.group.uuid,
      });
    }
  }

  /**
   * Player walk-over / proximity collect (pinata pick-up).
   */
  tryCollectNear(playerPos: THREE.Vector3): number {
    let total = 0;
    const r = this.cfg.collectRadiusM;
    const r2 = r * r;
    const kept: CollectibleWood[] = [];
    for (const c of this.collectibles) {
      const dx = c.mesh.position.x - playerPos.x;
      const dz = c.mesh.position.z - playerPos.z;
      const dy = c.mesh.position.y - playerPos.y;
      if (dx * dx + dz * dz + dy * dy * 0.25 < r2) {
        total += c.qty;
        this.disposeCollectible(c);
      } else {
        kept.push(c);
      }
    }
    this.collectibles = kept;
    if (total > 0) {
      this.cb.onWoodCollected?.(total, null as unknown as HarvestableTree);
      this.cb.onPrompt?.(`Collected ${total} wood.`);
    }
    return total;
  }

  update(dt: number, playerPos?: THREE.Vector3): number {
    // Auto-loot aged pieces
    let auto = 0;
    const kept: CollectibleWood[] = [];
    for (const c of this.collectibles) {
      c.life += dt;
      c.mesh.position.y += Math.sin(c.life * 3) * 0.002;
      if (c.life >= c.maxLife) {
        auto += c.qty;
        this.disposeCollectible(c);
      } else {
        kept.push(c);
      }
    }
    this.collectibles = kept;
    if (playerPos) {
      auto += this.tryCollectNear(playerPos);
    }
    return auto;
  }

  private disposeCollectible(c: CollectibleWood): void {
    this.scene?.remove(c.mesh);
    if (c.mesh instanceof THREE.Mesh) {
      c.mesh.geometry?.dispose();
      const m = c.mesh.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else (m as THREE.Material)?.dispose?.();
    }
  }

  get collectibleCount(): number {
    return this.collectibles.length;
  }
}
