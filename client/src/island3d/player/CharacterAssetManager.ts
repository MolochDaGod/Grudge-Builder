/**
 * CharacterAssetManager — singleton cache for character models, animations, and textures.
 *
 * Features:
 *  - Shared GLTF model cache (avoids duplicate loads)
 *  - Animation clip cache (same skeleton = share clips)
 *  - Texture cache with configurable quality
 *  - Retry logic with exponential backoff
 *  - Progress tracking via callback
 *  - Clone support (cached model → cheap .clone())
 *
 * Based on threejs-skills loader patterns.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CachedModel {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  boundingBox: THREE.Box3;
}

export interface LoadProgress {
  url: string;
  loaded: number;
  total: number;
  percent: number;
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let _instance: CharacterAssetManager | null = null;

export class CharacterAssetManager {
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  private modelCache = new Map<string, CachedModel>();
  private textureCache = new Map<string, THREE.Texture>();
  private clipCache = new Map<string, THREE.AnimationClip[]>();
  private pendingLoads = new Map<string, Promise<CachedModel>>();

  // Stats
  public loadCount = 0;
  public cacheHits = 0;

  private constructor() {
    THREE.Cache.enabled = true;
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
  }

  static getInstance(): CharacterAssetManager {
    if (!_instance) _instance = new CharacterAssetManager();
    return _instance;
  }

  // ─── Model loading ─────────────────────────────────────────────────────────

  /**
   * Load a GLTF model, returning a clone. Cache the original.
   * Multiple calls with the same key return cheap clones.
   */
  async loadModel(
    key: string,
    url: string,
    onProgress?: (p: LoadProgress) => void,
  ): Promise<CachedModel> {
    // Cache hit — return clone
    if (this.modelCache.has(key)) {
      this.cacheHits++;
      return this.cloneModel(this.modelCache.get(key)!);
    }

    // Dedup in-flight requests
    if (this.pendingLoads.has(key)) {
      const result = await this.pendingLoads.get(key)!;
      return this.cloneModel(result);
    }

    const loadPromise = this.loadModelInternal(key, url, onProgress);
    this.pendingLoads.set(key, loadPromise);

    try {
      const result = await loadPromise;
      this.modelCache.set(key, result);
      return this.cloneModel(result);
    } finally {
      this.pendingLoads.delete(key);
    }
  }

  private async loadModelInternal(
    key: string,
    url: string,
    onProgress?: (p: LoadProgress) => void,
  ): Promise<CachedModel> {
    const gltf = await this.loadWithRetry(url, 3, onProgress);
    this.loadCount++;

    const scene = gltf.scene as THREE.Group;

    // Enable shadows on all meshes
    scene.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const boundingBox = new THREE.Box3().setFromObject(scene);

    // Cache animation clips separately
    if (gltf.animations.length > 0) {
      this.clipCache.set(key, gltf.animations);
    }

    return { scene, animations: gltf.animations, boundingBox };
  }

  private loadWithRetry(
    url: string,
    maxRetries: number,
    onProgress?: (p: LoadProgress) => void,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      let attempt = 0;

      const tryLoad = () => {
        this.gltfLoader.load(
          url,
          (gltf) => resolve(gltf),
          (event) => {
            if (onProgress && event.total > 0) {
              onProgress({
                url,
                loaded: event.loaded,
                total: event.total,
                percent: Math.round((event.loaded / event.total) * 100),
              });
            }
          },
          (error) => {
            attempt++;
            if (attempt < maxRetries) {
              console.warn(`[AssetManager] Retry ${attempt}/${maxRetries} for ${url}`);
              setTimeout(tryLoad, 1000 * attempt); // exponential backoff
            } else {
              reject(error);
            }
          },
        );
      };

      tryLoad();
    });
  }

  private cloneModel(cached: CachedModel): CachedModel {
    return {
      scene: cached.scene.clone(),
      animations: cached.animations, // clips are shared (lightweight)
      boundingBox: cached.boundingBox.clone(),
    };
  }

  // ─── Animation clip loading ────────────────────────────────────────────────

  /** Load standalone animation clips from a GLTF (e.g. Mixamo animations) */
  async loadAnimationClips(key: string, url: string): Promise<THREE.AnimationClip[]> {
    if (this.clipCache.has(key)) {
      this.cacheHits++;
      return this.clipCache.get(key)!;
    }

    const gltf = await this.loadWithRetry(url, 2);
    this.clipCache.set(key, gltf.animations);
    this.loadCount++;
    return gltf.animations;
  }

  /** Get cached clips by key */
  getClips(key: string): THREE.AnimationClip[] | undefined {
    return this.clipCache.get(key);
  }

  // ─── Texture loading ───────────────────────────────────────────────────────

  async loadTexture(key: string, url: string): Promise<THREE.Texture> {
    if (this.textureCache.has(key)) {
      this.cacheHits++;
      return this.textureCache.get(key)!;
    }

    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 4;
          this.textureCache.set(key, texture);
          this.loadCount++;
          resolve(texture);
        },
        undefined,
        reject,
      );
    });
  }

  // ─── Preloading ────────────────────────────────────────────────────────────

  /** Preload multiple models in parallel */
  async preloadModels(
    entries: Array<{ key: string; url: string }>,
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<void> {
    let loaded = 0;
    const total = entries.length;

    await Promise.all(
      entries.map(async ({ key, url }) => {
        await this.loadModel(key, url);
        loaded++;
        onProgress?.(loaded, total);
      }),
    );
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  /** Dispose a specific cached model */
  disposeModel(key: string): void {
    const cached = this.modelCache.get(key);
    if (!cached) return;

    cached.scene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });

    this.modelCache.delete(key);
    this.clipCache.delete(key);
  }

  /** Dispose all cached assets */
  disposeAll(): void {
    for (const [key] of this.modelCache) this.disposeModel(key);
    for (const [, tex] of this.textureCache) tex.dispose();
    this.textureCache.clear();
    THREE.Cache.clear();
  }

  /** Get cache statistics */
  get stats() {
    return {
      models: this.modelCache.size,
      textures: this.textureCache.size,
      clips: this.clipCache.size,
      loads: this.loadCount,
      cacheHits: this.cacheHits,
    };
  }
}
