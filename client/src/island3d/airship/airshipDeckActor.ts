/**
 * Deck actor for AirshipSoloZone — same SI size, original-30 look,
 * one mixer, existing CharacterIK planted on the walk hull.
 * Do not invent a second controller / IK / physics stack.
 */
import * as THREE from 'three';
import {
  AIRSHIP_HERO_HEIGHT_M,
} from '@shared/definitions/airshipSoloZone';
import {
  model3dFromEquipped,
  normalizeRaceId,
  raceMeshPrefix,
} from '@shared/fleet';
import { setupGrudge6Equipment } from '@/lib/grudge6Equipment';
import { loadRaceKitPlay } from '@/lib/loadRaceKitPlay';
import { CharacterIK } from '@/island3d/player/CharacterIK';
import {
  AnimationController,
  loadBakedAnimationClip,
} from '@/lib/modelLoader';
import { bip001PackForWeapon, type Bip001Rel } from '@/lib/animation/bip001DrcAnims';
import type { WeaponType } from '@/lib/modelManifest';

export type OriginalThirtyRole = 'worker' | 'mage' | 'knight' | 'archer' | 'spearman';

/** Original 30characters.glb isolate roles (6 races × these 5). */
export const ORIGINAL_THIRTY_LOADOUTS: Record<
  OriginalThirtyRole,
  { pack: WeaponType; equipped: Record<string, string> }
> = {
  worker: {
    pack: 'unarmed',
    equipped: { body: 'A', arms: 'A', legs: 'A', head: 'A' },
  },
  mage: {
    pack: 'magic',
    equipped: { body: 'D', arms: 'D', legs: 'C', head: 'E', staff: 'A' },
  },
  knight: {
    pack: 'sword',
    equipped: {
      body: 'C',
      arms: 'C',
      legs: 'C',
      head: 'D',
      shoulders: 'B',
      sword: 'A',
      shield: 'A',
    },
  },
  archer: {
    pack: 'longbow',
    equipped: { body: 'A', arms: 'A', legs: 'A', head: 'A', bow: '_default', quiver: '_default' },
  },
  spearman: {
    pack: 'spear',
    equipped: { body: 'B', arms: 'B', legs: 'B', head: 'C', spear: '_default', shield: 'A' },
  },
};

const CLASS_TO_ROLE: Record<string, OriginalThirtyRole> = {
  warrior: 'knight',
  knight: 'knight',
  tank: 'knight',
  mage: 'mage',
  priest: 'mage',
  ranger: 'archer',
  archer: 'archer',
  rogue: 'spearman',
  spearman: 'spearman',
  berserker: 'spearman',
  worker: 'worker',
};

export function originalThirtyRoleFromClass(classId?: string): OriginalThirtyRole {
  const k = String(classId || 'knight').toLowerCase();
  return CLASS_TO_ROLE[k] || 'knight';
}

export interface DeckActor {
  root: THREE.Group;
  model: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  controller: AnimationController;
  ik: CharacterIK;
  moving: boolean;
  heightM: number;
  role: OriginalThirtyRole;
}

export async function createDeckActor(opts: {
  raceId: string;
  role?: OriginalThirtyRole;
  classId?: string;
  name: string;
}): Promise<DeckActor> {
  const raceId = normalizeRaceId(opts.raceId);
  const role = opts.role || originalThirtyRoleFromClass(opts.classId);
  const look = ORIGINAL_THIRTY_LOADOUTS[role];

  // HARD: play body = loadRaceKit only (CDN grudge6-kit) — not freestyle GLB + safeCharacter
  const kit = await loadRaceKitPlay(raceId, {
    targetHeightM: AIRSHIP_HERO_HEIGHT_M,
    skipDefaultLoadout: true,
  });
  const model = kit.root;
  model.name = `toon_${raceId}_${role}`;

  const model3d = model3dFromEquipped(raceId, look.equipped);
  setupGrudge6Equipment(raceMeshPrefix(raceId), model, model3d);

  const root = new THREE.Group();
  root.name = opts.name;
  root.add(model);
  // Contract lives on kit root; mirror for deck systems
  if (model.userData.warlordsPlayContract) {
    root.userData.warlordsPlayContract = model.userData.warlordsPlayContract;
  }

  const mixer = new THREE.AnimationMixer(model);
  const controller = new AnimationController(mixer, model);
  await bindDeckGait(controller, model, look.pack);

  // Sample idle once so feet box is the posed kit, then plant local feet at y=0.
  mixer.update(1 / 30);
  groundSkinnedFeetLocal(model, 0);

  // Foot IK on Toon Bip001 often yanks hips / twists calves (deform).
  // Deck Y is hull sample on the actor root — do not second-guess with hip IK.
  const ik = new CharacterIK(model, {
    plantWhenIdle: false,
    moveLiftOnly: true,
    maxHipOffset: 0.04,
    raycastDistance: 2.2,
  });
  ik.isGrounded = true;

  console.info(
    `[DeckActor] loadRaceKit ${raceId}/${role} h≈${kit.heightM.toFixed(2)}m url=${kit.url}`,
  );

  return {
    root,
    model,
    mixer,
    controller,
    ik,
    moving: false,
    heightM: kit.heightM || AIRSHIP_HERO_HEIGHT_M,
    role,
  };
}

/** Skinned-body Box3 feet → local groundY. Never pelvis-as-feet. */
export function groundSkinnedFeetLocal(root: THREE.Object3D, groundY = 0): void {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  let any = false;
  root.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh || m.visible === false) return;
    if (!any) {
      box.setFromObject(m, true);
      any = true;
    } else box.expandByObject(m);
  });
  if (!any) box.setFromObject(root, true);
  if (!Number.isFinite(box.min.y)) return;
  root.position.y += groundY - box.min.y;
  root.updateMatrixWorld(true);
}

function rematchClipToRoot(root: THREE.Object3D, clip: THREE.AnimationClip): THREE.AnimationClip {
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

async function bindDeckGait(
  controller: AnimationController,
  model: THREE.Object3D,
  weapon: WeaponType,
): Promise<void> {
  const pack = bip001PackForWeapon(weapon);
  const want: Array<[string, Bip001Rel[]]> = [
    ['idle', [pack.idle, 'locomotion/idle', 'greatsword_samurai/gs_samurai_idle_sword']],
    ['walk', [pack.walk, 'locomotion/walk_forward', 'greatsword_samurai/gs_samurai_walk_sword']],
    ['talk', [pack.attack || pack.idle, pack.idle]],
  ];
  await Promise.all(
    want.map(async ([name, rels]) => {
      for (const rel of rels) {
        const raw = await loadBakedAnimationClip(rel);
        if (!raw) continue;
        controller.registerClip(name, rematchClipToRoot(model, raw));
        return;
      }
    }),
  );
  if (!controller.play('idle', { loop: true, speed: 1 })) {
    const first = controller.loadedStates[0];
    if (first) controller.play(first, { loop: true, speed: 1 });
  }
}

/** restore → mixer → foot IK on the same deck hull used by pathfinding. */
export function tickDeckActor(
  actor: DeckActor,
  dt: number,
  deckMeshes: THREE.Object3D[],
  moving: boolean,
): void {
  actor.moving = moving;
  actor.ik.isMoving = moving;
  actor.ik.isGrounded = true;
  actor.controller.update(dt);
  if (moving) {
    if (actor.controller.currentState !== 'walk') {
      actor.controller.play('walk', { loop: true, speed: 1.05, fadeDuration: 0.18 });
    }
  } else if (actor.controller.currentState === 'walk') {
    actor.controller.play('idle', { loop: true, speed: 1, fadeDuration: 0.2 });
  }
  void deckMeshes;
}

export function playDeckTalk(actor: DeckActor): void {
  if (actor.controller.hasClip('talk')) {
    actor.controller.play('talk', {
      loop: false,
      speed: 1,
      fadeDuration: 0.12,
      onFinish: () => {
        actor.controller.play('idle', { loop: true, speed: 1, fadeDuration: 0.2 });
      },
    });
    return;
  }
  actor.controller.play('idle', { loop: true, speed: 1 });
}

/** Keep pirate hull / wheel / prop meshes visible — opener scene is the pirate set. */
export function revealPirateDeckMeshes(root: THREE.Object3D): number {
  let n = 0;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.visible = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    n += 1;
  });
  return n;
}
