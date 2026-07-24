/**
 * EtherealFloatingIslandSystem — Lyoko mountain sector as stacked floating islands.
 *
 * Best practices (Ethereal Falls):
 *  - Two uses of each island mesh: different scale, color, emissive texture treatment
 *  - Stacked vertically + orbiting/weaving motion (flying-mount style steer)
 *  - Colorful “upstream” flow toward open ethereal water / destruction tip
 *  - SE shelf preferred for dense stacks; NW half drifts harder (destruction system)
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { assetUrl } from '@/lib/assetConfig';
import {
  ETHEREAL_FLOAT_STEER,
  FLOATING_ISLAND_ASSET_PATHS,
  LYOKO_ISLAND_VARIANTS,
  type FloatingIslandVariant,
} from '@shared/definitions/floatingIslandBossAssets';
import {
  isInEtherealDestructionHalf,
  worldXZToEtherealUV,
  destructionTipWorld,
} from '@shared/definitions/etherealDestructionZone';
import { applyVariantMaterials, fitObjectExtent, stripSkyboxFromObject } from './gltfSceneUtils';

export interface EtherealFloatingIslandOpts {
  scene: THREE.Scene;
  zoneSizeM: number;
  waterLevel?: number;
  /** Optional tip world (defaults to ethereal destruction tip). */
  tip?: THREE.Vector3;
  onReady?: (count: number) => void;
}

interface IslandRuntime {
  root: THREE.Group;
  variant: FloatingIslandVariant;
  base: THREE.Vector3;
  angle: number;
  pairIndex: number;
  slot: number;
}

export class EtherealFloatingIslandSystem {
  readonly root = new THREE.Group();
  private scene: THREE.Scene;
  private zoneSize: number;
  private waterLevel: number;
  private tip: THREE.Vector3;
  private islands: IslandRuntime[] = [];
  private template: THREE.Object3D | null = null;
  private t = 0;
  private disposed = false;

  constructor(opts: EtherealFloatingIslandOpts) {
    this.scene = opts.scene;
    this.zoneSize = opts.zoneSizeM;
    this.waterLevel = opts.waterLevel ?? 10;
    this.tip =
      opts.tip?.clone() ??
      (() => {
        const p = destructionTipWorld(opts.zoneSizeM, 55);
        return new THREE.Vector3(p.x, p.y, p.z);
      })();
    this.root.name = 'EtherealFloatingIslands_Lyoko';
    this.scene.add(this.root);
    void this.loadAndSpawn(opts.onReady);
  }

  private async loadAndSpawn(onReady?: (n: number) => void) {
    const loader = new GLTFLoader();
    const path = assetUrl(FLOATING_ISLAND_ASSET_PATHS.lyoko);
    try {
      const gltf = await loader.loadAsync(path);
      this.template = gltf.scene;
      stripSkyboxFromObject(this.template);
      fitObjectExtent(this.template, 36);
    } catch (e) {
      console.warn('[EtherealFloat] Lyoko GLB failed — procedural shelves', e);
      this.template = this.proceduralShelf();
    }
    if (this.disposed) return;
    this.spawnStacks();
    onReady?.(this.islands.length);
  }

  private proceduralShelf(): THREE.Group {
    const g = new THREE.Group();
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(8, 0),
      new THREE.MeshStandardMaterial({ color: 0x7c8a9a, roughness: 0.85 }),
    );
    rock.scale.set(1.6, 0.55, 1.2);
    rock.position.y = 2;
    g.add(rock);
    return g;
  }

  private spawnStacks() {
    if (!this.template) return;
    const cfg = ETHEREAL_FLOAT_STEER;
    const half = this.zoneSize * 0.38;

    // SE playable shelf anchors + mid ethereal stream
    const anchors: THREE.Vector3[] = [];
    for (let i = 0; i < cfg.stackPairs; i++) {
      const a = (i / cfg.stackPairs) * Math.PI * 2;
      // Bias SE (playable) — positive X/Z in zone convention (east/south)
      const r = half * (0.35 + (i % 3) * 0.08);
      anchors.push(
        new THREE.Vector3(
          Math.cos(a) * r + half * 0.15,
          this.waterLevel + 35 + i * 6,
          Math.sin(a) * r + half * 0.12,
        ),
      );
    }
    // One pair closer to diagonal for visual “upstream” into destruction field
    anchors.push(new THREE.Vector3(-half * 0.15, this.waterLevel + 50, -half * 0.1));

    let slot = 0;
    for (let pair = 0; pair < anchors.length; pair++) {
      const anchor = anchors[pair]!;
      for (let v = 0; v < LYOKO_ISLAND_VARIANTS.length; v++) {
        const variant = LYOKO_ISLAND_VARIANTS[v]!;
        const mesh = this.template.clone(true);
        applyVariantMaterials(mesh, variant);
        mesh.scale.multiplyScalar(variant.scale);

        const g = new THREE.Group();
        g.name = `LyokoIsland_${variant.id}_p${pair}`;
        g.userData.floatingIsland = true;
        g.userData.variantId = variant.id;
        g.add(mesh);
        g.position.copy(anchor);
        g.position.y += variant.stackOffsetY;

        this.root.add(g);
        this.islands.push({
          root: g,
          variant,
          base: anchor.clone(),
          angle: variant.phase + pair * 0.7,
          pairIndex: pair,
          slot: slot++,
        });
      }
    }
    console.log(
      `[EtherealFloat] ${this.islands.length} Lyoko islands (${LYOKO_ISLAND_VARIANTS.length} variants × stacks)`,
    );
  }

  /**
   * Flying-mount style update: orbit + weave + bob + optional tip drift in destruction half.
   */
  update(dt: number) {
    this.t += dt;
    const cfg = ETHEREAL_FLOAT_STEER;

    for (const isl of this.islands) {
      isl.angle += cfg.orbitSpeed * dt * (1 + (isl.slot % 3) * 0.08);
      const v = isl.variant;
      const orbit = cfg.orbitRadius * (0.55 + v.scale * 0.45);
      const ox = Math.cos(isl.angle + v.phase) * orbit;
      const oz = Math.sin(isl.angle * 0.85 + v.phase) * orbit;
      const weave =
        Math.sin(this.t * 0.55 + v.phase) * cfg.weaveAmp * (0.6 + v.scale * 0.4);
      const bob =
        Math.sin(this.t * Math.PI * 2 * cfg.bobHz + v.phase) * cfg.bobAmp;

      let x = isl.base.x + ox * 0.35 + weave;
      let z = isl.base.z + oz * 0.35;
      let y = isl.base.y + v.stackOffsetY + bob;

      // Destruction half: colorful upstream drift toward tip
      const { u, vv } = (() => {
        const uv = worldXZToEtherealUV(x, z, this.zoneSize);
        return { u: uv.u, vv: uv.v };
      })();
      if (isInEtherealDestructionHalf(u, vv)) {
        const toTip = this.tip.clone().sub(new THREE.Vector3(x, y, z));
        toTip.y *= 0.4;
        if (toTip.lengthSq() > 1) {
          toTip.normalize();
          x += toTip.x * cfg.tipDrift * dt * 12;
          y += toTip.y * cfg.tipDrift * dt * 8;
          z += toTip.z * cfg.tipDrift * dt * 12;
        }
      }

      isl.root.position.set(x, y, z);
      // Bank like a flying mount
      isl.root.rotation.z = Math.sin(isl.angle) * 0.08 * v.scale;
      isl.root.rotation.y = isl.angle * 0.25;
      isl.root.rotation.x = Math.cos(this.t * 0.4 + v.phase) * 0.04;
    }
  }

  get islandCount() {
    return this.islands.length;
  }

  dispose() {
    this.disposed = true;
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry?.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else (m as THREE.Material)?.dispose?.();
      }
    });
    this.islands = [];
  }
}
