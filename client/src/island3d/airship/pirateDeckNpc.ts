/**
 * Deck pirate NPCs from D:\Games\Models\3pirates (John / Scourge / Racalvin).
 * R2: models/airship-zone/npcs/3pirates/{id}/character.glb + walk/idle/talk.
 * NPCs may be Meshy bipeds — play heroes stay loadRaceKit only.
 */
import * as THREE from 'three';
import { assetUrl } from '@/lib/assetConfig';
import { AIRSHIP_HERO_HEIGHT_M } from '@shared/definitions/airshipSoloZone';
import { fitCharacterRootToHeightM } from '@/island3d/zoneWorldScale';
import { CharacterIK } from '@/island3d/player/CharacterIK';
import { loadGltfCached, cloneGltfScene } from '@/lib/three/SharedGltfPipeline';
import type { DeckActor } from './airshipDeckActor';
import { groundSkinnedFeetLocal } from './airshipDeckActor';

export type PirateNpcKey = 'johnwayne' | 'scourge' | 'racalvin';

export const PIRATE_NPC_CDN: Record<
  PirateNpcKey,
  { character: string; walk: string; idle?: string; talk?: string }
> = {
  johnwayne: {
    character: '/models/airship-zone/npcs/3pirates/johnwayne/character.glb',
    walk: '/models/airship-zone/npcs/3pirates/johnwayne/walk.glb',
  },
  scourge: {
    character: '/models/airship-zone/npcs/3pirates/scourge/character.glb',
    walk: '/models/airship-zone/npcs/3pirates/scourge/walk.glb',
    talk: '/models/airship-zone/npcs/3pirates/scourge/talk.glb',
  },
  racalvin: {
    character: '/models/airship-zone/npcs/3pirates/racalvin/character.glb',
    walk: '/models/airship-zone/npcs/3pirates/racalvin/walk.glb',
    idle: '/models/airship-zone/npcs/3pirates/racalvin/idle.glb',
  },
};

/** Map AirshipNpcId → 3pirates folder key */
export function pirateKeyFromNpcId(id: string): PirateNpcKey {
  if (id.includes('john') || id.includes('wayne')) return 'johnwayne';
  if (id.includes('scourge')) return 'scourge';
  return 'racalvin';
}

function stripPositionTracks(clip: THREE.AnimationClip): THREE.AnimationClip {
  const out = clip.clone();
  out.tracks = out.tracks.filter((t) => !/\.position$/.test(t.name));
  return out;
}

function rematchClip(root: THREE.Object3D, clip: THREE.AnimationClip): THREE.AnimationClip {
  const names = new Map<string, string>();
  root.traverse((n) => {
    if (!n.name) return;
    names.set(n.name, n.name);
    names.set(n.name.replace(/\s+/g, '_'), n.name);
    names.set(n.name.replace(/_/g, ' '), n.name);
  });
  const out = clip.clone();
  for (const t of out.tracks) {
    const i = t.name.lastIndexOf('.');
    if (i < 0) continue;
    const bone = t.name.slice(0, i);
    const prop = t.name.slice(i);
    const hit =
      names.get(bone) ||
      names.get(bone.replace(/\s+/g, '_')) ||
      names.get(bone.replace(/_/g, ' '));
    if (hit && hit !== bone) t.name = hit + prop;
  }
  return out;
}

async function loadClipFromGlb(
  url: string,
  onto: THREE.Object3D,
): Promise<THREE.AnimationClip | null> {
  try {
    const gltf = await loadGltfCached(assetUrl(url), 'high');
    const raw = gltf.animations?.[0];
    if (!raw) return null;
    return stripPositionTracks(rematchClip(onto, raw));
  } catch (e) {
    console.warn('[pirateNpc] clip miss', url, e);
    return null;
  }
}

/**
 * Spawn a named pirate NPC for deck walk + talk.
 * One mixer; SI ~2.0 m; feet grounded — never play-hero loadRaceKit path.
 */
export async function createPirateDeckNpc(opts: {
  npcId: string;
  name: string;
  heightM?: number;
}): Promise<DeckActor> {
  const key = pirateKeyFromNpcId(opts.npcId);
  const paths = PIRATE_NPC_CDN[key];
  const gltf = await loadGltfCached(assetUrl(paths.character), 'critical');
  const model = cloneGltfScene(gltf);
  model.name = `pirate_${key}`;

  const targetH = opts.heightM ?? AIRSHIP_HERO_HEIGHT_M;
  fitCharacterRootToHeightM(model, 1, targetH);

  const root = new THREE.Group();
  root.name = opts.name;
  root.add(model);
  root.userData.pirateNpc = true;
  root.userData.pirateKey = key;
  root.userData.npcBody = '3pirates';

  const mixer = new THREE.AnimationMixer(model);
  const { AnimationController } = await import('@/lib/modelLoader');
  const controller = new AnimationController(mixer, model);

  const [walk, idle, talk] = await Promise.all([
    loadClipFromGlb(paths.walk, model),
    paths.idle ? loadClipFromGlb(paths.idle, model) : Promise.resolve(null),
    paths.talk ? loadClipFromGlb(paths.talk, model) : Promise.resolve(null),
  ]);

  if (walk) {
    walk.name = 'walk';
    controller.registerClip('walk', walk);
  }
  if (idle) {
    idle.name = 'idle';
    controller.registerClip('idle', idle);
  } else if (walk) {
    const idleClip = walk.clone();
    idleClip.name = 'idle';
    controller.registerClip('idle', idleClip);
  }
  if (talk) {
    talk.name = 'talk';
    controller.registerClip('talk', talk);
  } else if (idle || walk) {
    // Talk fallback = idle gesture
    const src = idle || walk!;
    const talkClip = src.clone();
    talkClip.name = 'talk';
    controller.registerClip('talk', talkClip);
  }

  if (!controller.play('idle', { loop: true, speed: 1 })) {
    const first = controller.loadedStates[0];
    if (first) controller.play(first, { loop: true, speed: 1 });
  }

  mixer.update(1 / 30);
  groundSkinnedFeetLocal(model, 0);

  const ik = new CharacterIK(model, {
    plantWhenIdle: false,
    moveLiftOnly: true,
    maxHipOffset: 0.04,
    raycastDistance: 2.2,
  });
  ik.isGrounded = true;

  console.info(`[pirateNpc] ${key} SI≈${targetH}m body=${paths.character}`);

  return {
    root,
    model,
    mixer,
    controller,
    ik,
    moving: false,
    heightM: targetH,
    role: key === 'johnwayne' ? 'knight' : key === 'scourge' ? 'spearman' : 'mage',
  };
}
