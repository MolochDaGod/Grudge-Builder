/**
 * Load Mixamo/Grudge6 injured pack into AnimationManager.
 * Tries multiple CDN paths per clip; skips failures.
 */
import type * as THREE from 'three';
import type { AnimationManager, AnimState } from '../player/AnimationManager';
import { loadAnimationClip } from '@/lib/modelLoader';
import {
  INJURED_ANIM_PACK,
  injuredAnimManagerPaths,
  type InjuredAnimKey,
} from '@shared/definitions/injuredAnimPack';

export interface InjuredLoadResult {
  loaded: InjuredAnimKey[];
  failed: InjuredAnimKey[];
  /** true if at least idle or ground loaded */
  usable: boolean;
}

async function loadFirstClip(paths: string[]): Promise<{ clip: THREE.AnimationClip; path: string } | null> {
  for (const path of paths) {
    try {
      const clip = await loadAnimationClip(path);
      if (clip) return { clip, path };
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * Load injured pack and register onto manager under both injured_* keys
 * and locomotion slots (idle/walk/run) so opener uses only injured motion.
 */
export async function loadInjuredAnimsOntoManager(
  anim: AnimationManager,
): Promise<InjuredLoadResult> {
  const loaded: InjuredAnimKey[] = [];
  const failed: InjuredAnimKey[] = [];

  for (const def of INJURED_ANIM_PACK) {
    const hit = await loadFirstClip(def.paths);
    if (!hit) {
      failed.push(def.key);
      continue;
    }
    // Register under pack key as custom state name via mapsTo primary slot
    anim.addClipFromGLTF(def.mapsTo as AnimState, hit.clip);
    // Duplicate for explicit injured states when mapsTo differs from key naming
    if (def.key === 'injured_idle') {
      anim.addClipFromGLTF('idle', hit.clip);
      anim.addClipFromGLTF('idle_alt', hit.clip.clone());
    }
    if (def.key === 'injured_walk') {
      anim.addClipFromGLTF('walk', hit.clip);
    }
    if (def.key === 'injured_run') {
      anim.addClipFromGLTF('run', hit.clip);
      anim.addClipFromGLTF('run_stop', hit.clip.clone());
    }
    if (def.key === 'injured_ground') {
      anim.addClipFromGLTF('death', hit.clip);
    }
    if (def.key === 'injured_getup') {
      anim.addClipFromGLTF('hard_landing', hit.clip);
    }
    if (def.key === 'injured_hit') {
      anim.addClipFromGLTF('impact', hit.clip);
    }
    loaded.push(def.key);
    console.info(`[InjuredAnims] loaded ${def.key} ← ${hit.path}`);
  }

  // If pack missing on CDN, try mapping any already-loaded clips whose names match
  const existing = anim.loadedClips.map((s) => s.toLowerCase());
  if (loaded.length === 0) {
    console.warn(
      '[InjuredAnims] No injured pack clips on CDN. Upload Mixamo package to',
      '/models/animations/injured/ (Injured Idle/Walk/Run/Idle On Ground/Getting Up).glb',
      'Existing clips:',
      existing,
    );
  }

  return {
    loaded,
    failed,
    usable: loaded.includes('injured_idle') || loaded.includes('injured_ground') || loaded.includes('injured_walk'),
  };
}

/** Convenience: path table for debugging HUD */
export function injuredPathTable() {
  return injuredAnimManagerPaths();
}
