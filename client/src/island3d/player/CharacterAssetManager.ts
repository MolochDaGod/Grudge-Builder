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
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { resolveModelUrl } from '@/lib/modelManifest';
import { ensureCharacterTextureColorSpace } from '@/lib/characterAppearance';
import {
  loadGltfCached,
  prepareMeshPerformance,
  getGltfCacheStats,
} from '@/lib/three/SharedGltfPipeline';
import { optimizeAnimationClip, refreshSkinnedBounds } from '@/lib/three/WorldMath';

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
    // GLTF decode: SharedGltfPipeline (DRACO + Meshopt + concurrency)
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
    // Always resolve relative paths to R2 CDN (assets.grudge-studio.com)
    const resolved = resolveModelUrl(url);

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

    const loadPromise = this.loadModelInternal(key, resolved, onProgress);
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
    onProgress?.({ url, loaded: 0, total: 1, percent: 0 });
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const gltf = await loadGltfCached(url, attempt === 0 ? 'high' : 'medium');
        this.loadCount++;
        onProgress?.({ url, loaded: 1, total: 1, percent: 100 });

        const scene = gltf.scene as THREE.Group;
        prepareMeshPerformance(scene, {
          castShadow: true,
          receiveShadow: true,
          frustumCulled: true,
          refreshSkinnedBounds: true,
        });
        ensureCharacterTextureColorSpace(scene);

        const boundingBox = new THREE.Box3().setFromObject(scene);
        const anims = gltf.animations.map((c) => {
          const clone = c.clone();
          optimizeAnimationClip(clone);
          return clone;
        });
        if (anims.length > 0) this.clipCache.set(key, anims);

        return { scene, animations: anims, boundingBox };
      } catch (e) {
        lastErr = e;
        console.warn(`[AssetManager] Retry ${attempt + 1}/3 for ${url}`);
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  private cloneModel(cached: CachedModel): CachedModel {
    // SkeletonUtils keeps SkinnedMesh → skeleton bone bindings (plain clone breaks T-pose)
    const scene = (SkeletonUtils as { clone: (o: THREE.Object3D) => THREE.Object3D }).clone(
      cached.scene,
    ) as THREE.Group;
    prepareMeshPerformance(scene, {
      castShadow: true,
      receiveShadow: true,
      frustumCulled: true,
      cloneMaterials: true,
      refreshSkinnedBounds: true,
    });
    ensureCharacterTextureColorSpace(scene);
    refreshSkinnedBounds(scene);
    return {
      scene,
      animations: cached.animations,
      boundingBox: cached.boundingBox.clone(),
    };
  }

  /** Shared pipeline + local cache stats */
  getStats() {
    return {
      models: this.modelCache.size,
      textures: this.textureCache.size,
      clips: this.clipCache.size,
      loadCount: this.loadCount,
      cacheHits: this.cacheHits,
      gltf: getGltfCacheStats(),
    };
  }

  // ─── Animation clip loading ────────────────────────────────────────────────

  /** Load standalone animation clips from a GLTF (e.g. Mixamo animations) */
  async loadAnimationClips(key: string, url: string): Promise<THREE.AnimationClip[]> {
    if (this.clipCache.has(key)) {
      this.cacheHits++;
      return this.clipCache.get(key)!;
    }

    const resolved = resolveModelUrl(url);
    const gltf = await loadGltfCached(resolved, 'medium');
    const clips = gltf.animations.map((c) => {
      const clone = c.clone();
      optimizeAnimationClip(clone);
      return clone;
    });
    this.clipCache.set(key, clips);
    this.loadCount++;
    return clips;
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
