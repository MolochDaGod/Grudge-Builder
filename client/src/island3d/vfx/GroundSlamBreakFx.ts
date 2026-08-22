/**
 * One-shot ground-break VFX from the juggernaut slam GLB.
 * Play CINEMA_4D_Main once on hard land / slam hits, then hide.
 * Hosted on WorldFxBus — not a second mixer on the player.
 */
import * as THREE from 'three';
import { loadGltfCached, cloneGltfScene } from '@/lib/three/SharedGltfPipeline';
import { assetUrl } from '@/lib/assetConfig';

export const GROUND_SLAM_URL = '/models/vfx/impacts/ground_slam_break.glb';
/** Longest XZ after play bake (~5 m). Runtime re-fits if a cinema-scale file is served. */
export const GROUND_SLAM_FOOTPRINT_M = 5;

type SlamShot = {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  duration: number;
  age: number;
};

const _box = new THREE.Box3();
const _size = new THREE.Vector3();

function fitSlamFootprint(root: THREE.Object3D, footprintM: number): void {
  root.updateMatrixWorld(true);
  _box.setFromObject(root);
  _box.getSize(_size);
  const span = Math.max(_size.x, _size.z, 1e-4);
  if (span > footprintM * 1.15 || span < footprintM * 0.5) {
    root.scale.multiplyScalar(footprintM / span);
    root.updateMatrixWorld(true);
    _box.setFromObject(root);
  }
  root.position.y -= _box.min.y;
}

export class GroundSlamBreakFx {
  private scene: THREE.Scene;
  private root = new THREE.Group();
  private active: SlamShot[] = [];
  private clips: THREE.AnimationClip[] = [];
  private preloadP: Promise<void> | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.root.name = 'ground_slam_break_fx';
    scene.add(this.root);
  }

  preload(): Promise<void> {
    if (this.preloadP) return this.preloadP;
    this.preloadP = (async () => {
      try {
        let gltf;
        try {
          gltf = await loadGltfCached(assetUrl(GROUND_SLAM_URL), 'low');
        } catch {
          gltf = await loadGltfCached(GROUND_SLAM_URL, 'low');
        }
        this.clips = gltf.animations?.slice() ?? [];
      } catch (err) {
        console.warn('[GroundSlam] preload failed', err);
        this.preloadP = null;
      }
    })();
    return this.preloadP;
  }

  /** Play once at world feet, then hide. */
  spawn(at: THREE.Vector3): void {
    void this.playAsync(at.clone());
  }

  update(dt: number): void {
    const still: SlamShot[] = [];
    for (const s of this.active) {
      s.age += dt;
      s.mixer.update(dt);
      if (s.age >= s.duration) {
        this.hide(s);
      } else {
        still.push(s);
      }
    }
    this.active = still;
  }

  dispose(): void {
    for (const s of this.active) this.hide(s);
    this.active = [];
    this.scene.remove(this.root);
  }

  private async playAsync(at: THREE.Vector3): Promise<void> {
    let gltf;
    try {
      try {
        gltf = await loadGltfCached(assetUrl(GROUND_SLAM_URL), 'medium');
      } catch {
        gltf = await loadGltfCached(GROUND_SLAM_URL, 'medium');
      }
    } catch (err) {
      console.warn('[GroundSlam] missing break GLB', err);
      return;
    }
    const mesh = cloneGltfScene(gltf);
    mesh.name = 'ground_slam_break';
    mesh.position.copy(at);
    fitSlamFootprint(mesh, GROUND_SLAM_FOOTPRINT_M);
    this.root.add(mesh);

    const clips = gltf.animations?.length ? gltf.animations : this.clips;
    const clip =
      clips.find((c) => /cinema_4d_main/i.test(c.name)) ?? clips[0] ?? null;
    if (!clip) {
      // Static mesh — flash then hide
      const dummyMixer = new THREE.AnimationMixer(mesh);
      this.active.push({ root: mesh, mixer: dummyMixer, duration: 0.9, age: 0 });
      return;
    }
    const mixer = new THREE.AnimationMixer(mesh);
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    const duration = Math.max(0.35, clip.duration || 1.2);
    this.active.push({ root: mesh, mixer, duration, age: 0 });
  }

  private hide(s: SlamShot): void {
    s.mixer.stopAllAction();
    try {
      s.mixer.uncacheRoot(s.root);
    } catch {
      /* already uncached */
    }
    s.root.visible = false;
    this.root.remove(s.root);
  }
}
