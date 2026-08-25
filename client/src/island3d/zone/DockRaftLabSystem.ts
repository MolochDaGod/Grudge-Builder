/**
 * Dock-raft lab — load scene (9), production ocean, hatchet trees,
 * stack wood, place one log at a time on the Zattera.
 */
import * as THREE from 'three';
import {
  DOCK_RAFT_KIT,
  DOCK_RAFT_LOAD,
  DOCK_RAFT_ITEM,
} from '@shared/definitions/dockRaftTestMap';
import { loadAssetGltf } from '@/lib/three/SharedGltfPipeline';
import { createOceanMesh } from '../terrain/WaterMaterial';
import { prepareDockRaftPlay, type DockRaftPlaySurface } from './prepareDockRaftPlay';
import { createHarvestableTree, mountHarvestableTreeModel } from '../objects/HarvestableTree';
import { SmallCraftRowSystem } from '@/game/sailing/SmallCraftRowSystem';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { HarvestableTree } from '../objects/HarvestableTree';

export interface DockRaftLabSnapshot {
  wood: number;
  logsOnRaft: number;
  logsNeeded: number;
  prompt: string;
  boarded: boolean;
}

export class DockRaftLabSystem {
  root = new THREE.Group();
  play: DockRaftPlaySurface | null = null;
  trees: HarvestableTree[] = [];
  logsOnRaft = 0;
  prompt = 'Hatchet the palms · stack wood · E at dock to place one log';
  private scene: THREE.Scene;
  private ocean: THREE.Mesh | null = null;
  private craft: SmallCraftRowSystem | null = null;
  private raftLogs = new THREE.Group();
  private waterY = 0;

  constructor(
    private opts: {
      scene: THREE.Scene;
      physics?: PhysicsWorld | null;
      addTree: (t: HarvestableTree) => void;
    },
  ) {
    this.scene = opts.scene;
    this.root.name = 'DockRaftLab';
    this.raftLogs.name = 'DockRaftPlacedLogs';
  }

  async boot(): Promise<boolean> {
    let gltf = null;
    for (const url of DOCK_RAFT_LOAD) {
      gltf = await loadAssetGltf(url, 'high');
      if (gltf?.scene) break;
    }
    if (!gltf?.scene) {
      this.prompt = 'Dock map failed to load (CDN /api/assets).';
      return false;
    }
    const visual = gltf.scene;
    this.root.add(visual);
    this.scene.add(this.root);
    this.play = prepareDockRaftPlay({ visual, physics: this.opts.physics });
    this.waterY = this.play.waterLevel ?? 0.4;

    this.ocean = createOceanMesh({
      waterLevel: this.waterY,
      size: 420,
      segments: 72,
    });
    this.ocean.name = 'ocean';
    this.ocean.userData.grudgeKeepOcean = true;
    this.scene.add(this.ocean);

    for (const p of this.play.palmAnchors) {
      const tree = createHarvestableTree(p.clone(), 1);
      tree.nodeId = `dock_palm_${this.trees.length}`;
      this.scene.add(tree.group);
      this.opts.addTree(tree);
      this.trees.push(tree);
      void mountHarvestableTreeModel(tree, DOCK_RAFT_KIT.treeHeightM);
    }

    const raftAt =
      this.play.raftAnchor ??
      this.play.dockAnchor?.clone().add(new THREE.Vector3(0, 0, 6)) ??
      new THREE.Vector3(14, this.waterY, 2);
    raftAt.y = this.waterY + DOCK_RAFT_KIT.raftFreeboardM;
    this.raftLogs.position.copy(raftAt);
    this.scene.add(this.raftLogs);
    return true;
  }

  spawnPoint(): THREE.Vector3 {
    const dock = this.play?.dockAnchor;
    if (dock) return dock.clone().add(new THREE.Vector3(0, 1.2, 0));
    const palm = this.play?.palmAnchors[0];
    if (palm) return palm.clone().add(new THREE.Vector3(2, 0.2, 2));
    return new THREE.Vector3(14, 2, 0);
  }

  tryPlaceLog(playerPos: THREE.Vector3, woodCount: number): { wood: number; placed: boolean } {
    const dock = this.play?.dockAnchor;
    if (!dock) return { wood: woodCount, placed: false };
    if (playerPos.distanceTo(dock) > DOCK_RAFT_KIT.dockInteractRadiusM) {
      this.prompt = 'Walk to the wooden dock to place a log.';
      return { wood: woodCount, placed: false };
    }
    if (this.logsOnRaft >= DOCK_RAFT_KIT.logsToComplete) {
      this.prompt = 'Raft is ready — E to board.';
      return { wood: woodCount, placed: false };
    }
    if (woodCount < DOCK_RAFT_KIT.logsPerPlace) {
      this.prompt = 'Need a stacked log — chop a palm with the hatchet.';
      return { wood: woodCount, placed: false };
    }
    this.addLogMesh();
    this.logsOnRaft += DOCK_RAFT_KIT.logsPerPlace;
    const left = woodCount - DOCK_RAFT_KIT.logsPerPlace;
    if (this.logsOnRaft >= DOCK_RAFT_KIT.logsToComplete) {
      this.finishRaft();
      this.prompt = `Raft complete (${this.logsOnRaft}/${DOCK_RAFT_KIT.logsToComplete}) — E to board.`;
    } else {
      this.prompt = `Placed one log (${this.logsOnRaft}/${DOCK_RAFT_KIT.logsToComplete}).`;
    }
    return { wood: left, placed: true };
  }

  private addLogMesh(): void {
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.18, 1.7, 7),
      new THREE.MeshStandardMaterial({ color: 0x7a4a22, roughness: 0.92 }),
    );
    log.rotation.z = Math.PI / 2;
    log.position.set(
      ((this.logsOnRaft % 3) - 1) * 0.38,
      Math.floor(this.logsOnRaft / 3) * 0.22,
      0,
    );
    this.raftLogs.add(log);
  }

  private finishRaft(): void {
    if (this.craft) return;
    this.craft = new SmallCraftRowSystem({
      scene: this.scene,
      waterLevel: this.waterY,
      hull: this.raftLogs,
      tier: 'raft',
      autoAdvanceLesson: false,
      onPrompt: (msg) => {
        if (msg) this.prompt = msg;
      },
    });
  }

  snapshot(wood: number): DockRaftLabSnapshot {
    return {
      wood,
      logsOnRaft: this.logsOnRaft,
      logsNeeded: DOCK_RAFT_KIT.logsToComplete,
      prompt: this.prompt,
      boarded: false,
    };
  }

  dispose(): void {
    this.play?.dispose();
    if (this.ocean) this.scene.remove(this.ocean);
    this.scene.remove(this.root);
    this.scene.remove(this.raftLogs);
  }
}
