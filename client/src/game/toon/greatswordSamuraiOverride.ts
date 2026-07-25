/**
 * Greatsword samurai pack — load baked Bip001 rotation-only clips
 * and bind GREATSWORD / TWO_HAND_SWORD combat one-shots.
 *
 * Best practices (must match grudge-character-correctness):
 *   - naming: gs_samurai_* only
 *   - Y hip: baked clips have no .position tracks
 *   - XZ: caller centers on pelvis + grounds feet after sample
 *   - load: same-origin /anims/baked first, then assets CDN
 */

import * as THREE from 'three';
import {
  GREATSWORD_SAMURAI_BAKED_PATH,
  GREATSWORD_SAMURAI_CDN_PATH,
  GREATSWORD_SAMURAI_GROUNDING,
  GREATSWORD_SAMURAI_SKILLS,
  SAMURAI_RETARGET_KEYS,
  TWO_HAND_TO_SAMURAI_ANIM,
  greatswordSamuraiClipUrls,
  type GreatswordSkillBinding,
} from '@shared/definitions/greatswordSamuraiCombat';
import { loadBakedAnimationClip } from '@/lib/modelLoader';
import { BAKED_ANIM_LOCAL, BAKED_ANIM_ASSETS } from './toonAnimPacks';

export {
  GREATSWORD_SAMURAI_BAKED_PATH,
  GREATSWORD_SAMURAI_CDN_PATH,
  GREATSWORD_SAMURAI_GROUNDING,
  GREATSWORD_SAMURAI_SKILLS,
  SAMURAI_RETARGET_KEYS,
  TWO_HAND_TO_SAMURAI_ANIM,
};

/** Locomotion + combat states for the 2H samurai pack */
export type GreatswordSamuraiState =
  | 'idle'
  | 'idleSword'
  | 'walk'
  | 'walkSword'
  | 'run'
  | 'runSword'
  | 'jump'
  | 'jumpSword'
  | 'attack'
  | 'attack2'
  | 'dashOpener'
  | 'teleportStrike'
  | 'swordOn'
  | 'swordOff';

/** State → baked key (under greatsword_samurai/) */
export const GREATSWORD_SAMURAI_STATE_CLIPS: Record<GreatswordSamuraiState, string> = {
  idle: SAMURAI_RETARGET_KEYS['5Idle'],
  idleSword: SAMURAI_RETARGET_KEYS['6Idle_sword'],
  walk: SAMURAI_RETARGET_KEYS['12Walking'],
  walkSword: SAMURAI_RETARGET_KEYS['13Walking_Sword'],
  run: SAMURAI_RETARGET_KEYS['9Rurring'],
  runSword: SAMURAI_RETARGET_KEYS['10Rurring_sword'],
  jump: SAMURAI_RETARGET_KEYS['7Jump'],
  jumpSword: SAMURAI_RETARGET_KEYS['8Jump_sword'],
  attack: SAMURAI_RETARGET_KEYS['2Combo_1'],
  attack2: SAMURAI_RETARGET_KEYS['3Combo_2'],
  dashOpener: SAMURAI_RETARGET_KEYS['1Attack'],
  teleportStrike: SAMURAI_RETARGET_KEYS['4Combo_3'],
  swordOn: SAMURAI_RETARGET_KEYS['11Sword_On'],
  swordOff: SAMURAI_RETARGET_KEYS['11Sword_Off'],
};

const clipCache = new Map<string, THREE.AnimationClip>();

/**
 * Resolve first reachable baked URL for a gs_samurai_* key.
 * Prefer same-origin (Vercel public/), then assets CDN.
 */
export async function resolveGreatswordSamuraiClipUrl(
  key: string,
): Promise<string | null> {
  const candidates = [
    `${BAKED_ANIM_LOCAL}/greatsword_samurai/${key}.json`,
    `${BAKED_ANIM_ASSETS}/greatsword_samurai/${key}.json`,
    ...greatswordSamuraiClipUrls(key),
  ];
  // de-dupe
  const seen = new Set<string>();
  for (const url of candidates) {
    if (seen.has(url)) continue;
    seen.add(url);
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) return url;
    } catch {
      /* try next */
    }
  }
  // last resort: return same-origin path for loadBaked (it will fetch GET)
  return `${BAKED_ANIM_LOCAL}/greatsword_samurai/${key}.json`;
}

/**
 * Load one baked clip. Always rotation-only (position tracks stripped at bake
 * and again at parse in loadBakedAnimationClip).
 */
export async function loadGreatswordSamuraiClip(
  key: string,
): Promise<THREE.AnimationClip | null> {
  const cached = clipCache.get(key);
  if (cached) return cached;

  const urls = [
    `${BAKED_ANIM_LOCAL}/greatsword_samurai/${key}.json`,
    `${BAKED_ANIM_ASSETS}/greatsword_samurai/${key}.json`,
  ];
  for (const url of urls) {
    const clip = await loadBakedAnimationClip(url);
    if (clip) {
      clip.name = key;
      // Defense in depth: drop any residual position tracks
      if (GREATSWORD_SAMURAI_GROUNDING.stripPositionTracks) {
        clip.tracks = clip.tracks.filter((t) => !t.name.endsWith('.position'));
      }
      clipCache.set(key, clip);
      return clip;
    }
  }
  console.warn(`[greatswordSamurai] missing baked clip: ${key}`);
  return null;
}

/** Preload full combat + locomotion set for GREATSWORD equip. */
export async function preloadGreatswordSamuraiPack(): Promise<
  Map<string, THREE.AnimationClip>
> {
  const keys = new Set<string>([
    ...Object.values(GREATSWORD_SAMURAI_STATE_CLIPS),
    ...GREATSWORD_SAMURAI_SKILLS.map((s) => s.animKey).filter(
      (k) => k !== 'magic_cast',
    ),
  ]);
  const out = new Map<string, THREE.AnimationClip>();
  await Promise.all(
    [...keys].map(async (key) => {
      const clip = await loadGreatswordSamuraiClip(key);
      if (clip) out.set(key, clip);
    }),
  );
  return out;
}

/** Hotbar slot → skill binding (1–4 product map). */
export function greatswordSamuraiSkillForSlot(
  slot: 1 | 2 | 3 | 4,
): GreatswordSkillBinding | undefined {
  return GREATSWORD_SAMURAI_SKILLS.find((s) => s.hotbarSlot === slot);
}

/** Resolve anim key for a production skill id (2h_* or gs_samurai_*). */
export function resolveGreatswordAnimKey(skillId: string): string | null {
  return TWO_HAND_TO_SAMURAI_ANIM[skillId] ?? null;
}

/**
 * After playing a one-shot: re-ground feet + center XZ on pelvis.
 * Call with kit root after mixer.update(1/30).
 *
 * - XZ: shift root so pelvis world XZ matches the pre-call root XZ target
 * - Y: feet from skinned body bbox min.y — NEVER pelvis.y = 0 as feet
 */
export function reGroundGreatswordKit(
  root: THREE.Object3D,
  groundY = 0,
  targetXZ?: { x: number; z: number },
): void {
  const holdX = targetXZ?.x ?? root.position.x;
  const holdZ = targetXZ?.z ?? root.position.z;

  let pelvis: THREE.Object3D | null = null;
  root.traverse((o) => {
    if (pelvis) return;
    const n = o.name.replace(/\s+/g, '_');
    if (
      n === 'Bip001_Pelvis' ||
      n === 'Bip001Pelvis' ||
      n.endsWith('Pelvis') ||
      n === 'Hips'
    ) {
      pelvis = o;
    }
  });

  root.updateMatrixWorld(true);

  if (pelvis && GREATSWORD_SAMURAI_GROUNDING.centerXZOnPelvis) {
    const p = new THREE.Vector3();
    (pelvis as THREE.Object3D).getWorldPosition(p);
    root.position.x += holdX - p.x;
    root.position.z += holdZ - p.z;
    root.updateMatrixWorld(true);
  }

  // Ground feet from skinned body min.y — NEVER set pelvis.y = 0 as feet
  if (GREATSWORD_SAMURAI_GROUNDING.groundFromFeetBbox) {
    const box = new THREE.Box3().setFromObject(root);
    if (Number.isFinite(box.min.y)) {
      root.position.y += groundY - box.min.y;
    }
  }
}
