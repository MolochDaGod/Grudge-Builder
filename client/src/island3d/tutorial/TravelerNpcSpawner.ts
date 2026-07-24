/**
 * TravelerNpcSpawner — Unity Dock Quest Traveler on production Three.js.
 *
 * Unity (island1 / all 6 race starter boats):
 *   Prefab / NPC: Traveler (quest giver on starter boat)
 *   Mesh: same grudge6 **human** modular race kit for every race boat
 *   Entity: `{race}_quest_traveler_boat` · role `quest_traveler`
 *   Unarmed · idle loop · dialogue starter_quest_boat
 *
 * Web SSOT:
 *   travelerTutorialQuest.TRAVELER_NPC
 *   factionLobbyIslands → raceModelPath('human') → WK_Characters.glb
 *   CDN: assets.grudge-studio.com/models/grudge6/races/WK_Characters.glb
 *
 * There is no separate Traveler.glb on CDN — Unity Traveler **is** the human
 * grudge6 character with unarmed equipment (same as all 6 boat travelers).
 */

import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { TRAVELER_NPC } from '@shared/definitions/travelerTutorialQuest';
import { RACE_GRUDGE6, defaultModel3d } from '@shared/fleet';
import { loadCharacterModel, loadAnimationClip } from '@/lib/modelLoader';
import { setupGrudge6Equipment } from '@/lib/grudge6Equipment';
import { fitCharacterRootToHeightM, PLAYER_HEIGHT_M } from '../zoneWorldScale';
import { FLEET_URLS } from '@shared/fleet/manifest';

export interface TravelerSpawn {
  id: string;
  /** Matches Unity / faction SSOT entity id */
  entityId: string;
  role: 'wake' | 'dock';
  root: THREE.Group;
  position: THREE.Vector3;
  interactPoint: THREE.Vector3;
  mixer: THREE.AnimationMixer | null;
}

export interface TravelerSpawnerHandle {
  spawns: TravelerSpawn[];
  nearest(playerPos: THREE.Vector3, radius?: number): TravelerSpawn | null;
  update(dt: number): void;
  dispose(): void;
}

const CDN = (FLEET_URLS.assets || 'https://assets.grudge-studio.com').replace(/\/$/, '');

/** Canonical Unity Traveler mesh — human grudge6 race kit (all 6 boats). */
export function resolveUnityTravelerModelUrl(): string {
  if (TRAVELER_NPC.modelPath?.startsWith('http')) return TRAVELER_NPC.modelPath;
  const race = RACE_GRUDGE6.human;
  const path = race.cdnPath.startsWith('http') ? race.cdnPath : `${CDN}${race.cdnPath}`;
  return path;
}

/** Idle clip used for standing quest giver (CDN verified). */
const TRAVELER_IDLE_CLIP_PATH = `${CDN}/models/animations/idle.glb`;

/**
 * Spawn Unity-equivalent Dock Quest Traveler(s) at shipwreck_cove.
 * Primary: wake guide beside player · secondary: dock boat traveler.
 */
export async function spawnDockQuestTravelers(
  scene: THREE.Scene,
  worldOrigin: { x: number; y: number; z: number },
  opts?: { raceId?: string },
): Promise<TravelerSpawnerHandle> {
  const group = new THREE.Group();
  group.name = 'DockQuestTravelers';
  scene.add(group);

  const raceKey = (opts?.raceId || 'human').toLowerCase();
  // Unity: same Traveler character on every race boat (human kit, not race-locked mesh)
  const entityDock = `${raceKey}_quest_traveler_boat`;

  const localPlacements: Array<{
    id: string;
    entityId: string;
    role: 'wake' | 'dock';
    local: THREE.Vector3;
    rotY: number;
  }> = [
    {
      id: 'npc_ally_guide',
      entityId: 'npc_quest_traveler_wake',
      role: 'wake',
      // Beside wash-up — same NPC as boat traveler (Unity Traveler)
      local: new THREE.Vector3(-2.5, 0, 6.5),
      rotY: Math.PI * 0.35,
    },
    {
      id: 'npc_quest_traveler_boat',
      entityId: entityDock,
      role: 'dock',
      local: new THREE.Vector3(6, 0, 26),
      rotY: Math.PI,
    },
  ];

  // Load once — clone per instance (Unity prefab instance pattern)
  let templateScene: THREE.Object3D | null = null;
  let idleClip: THREE.AnimationClip | null = null;

  try {
    const url = resolveUnityTravelerModelUrl();
    const loaded = await loadCharacterModel(url);
    // Apply Unity traveler look: human modular kit · unarmed · base armor A
    const model3d = defaultModel3d('human', {
      weaponSlots: {},
      equippedMeshes: { body: 'A', arms: 'A', legs: 'A', head: 'A' },
    });
    setupGrudge6Equipment(RACE_GRUDGE6.human.prefix, loaded.scene, model3d);
    fitCharacterRootToHeightM(loaded.scene, RACE_GRUDGE6.human.scale, PLAYER_HEIGHT_M);
    hideWeaponMeshes(loaded.scene);
    templateScene = loaded.scene;
    console.log('[Traveler] Unity Traveler mesh ready:', url);
  } catch (e) {
    console.warn('[Traveler] WK_Characters load failed — capsule fallback', e);
  }

  try {
    idleClip = await loadAnimationClip(TRAVELER_IDLE_CLIP_PATH);
  } catch {
    idleClip = null;
  }

  const spawns: TravelerSpawn[] = [];

  for (const p of localPlacements) {
    const root = new THREE.Group();
    root.name = p.entityId;
    root.userData.questTraveler = true;
    root.userData.unityTraveler = true;
    root.userData.role = TRAVELER_NPC.role;
    root.userData.dialogueSetId = TRAVELER_NPC.dialogueSetId;
    root.userData.entityId = p.entityId;
    root.userData.placement = p.role;

    let mixer: THREE.AnimationMixer | null = null;

    if (templateScene) {
      const mesh = (SkeletonUtils as any).clone(templateScene) as THREE.Object3D;
      // Re-apply equipment on clone (skeleton clone keeps mesh visibility)
      try {
        setupGrudge6Equipment(
          RACE_GRUDGE6.human.prefix,
          mesh,
          defaultModel3d('human', {
            weaponSlots: {},
            equippedMeshes: { body: 'A', arms: 'A', legs: 'A', head: 'A' },
          }),
        );
        hideWeaponMeshes(mesh);
      } catch {
        /* clone already equipped */
      }
      mesh.rotation.y = p.rotY;
      root.add(mesh);

      if (idleClip) {
        mixer = new THREE.AnimationMixer(mesh);
        const action = mixer.clipAction(idleClip);
        action.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.2).play();
      }
    } else {
      root.add(makeCapsuleFallback());
    }

    // Gold quest pip (readable at distance — Unity quest marker language)
    const pip = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xf6c945 }),
    );
    pip.position.y = 2.15;
    pip.name = 'quest_pip';
    root.add(pip);

    // Soft cyan banner flag (matches FactionIslandGenerator quest_traveler)
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.45, 0.32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide }),
    );
    flag.position.set(0.4, 2.05, 0);
    root.add(flag);

    const world = new THREE.Vector3(
      worldOrigin.x + p.local.x,
      worldOrigin.y + p.local.y,
      worldOrigin.z + p.local.z,
    );
    // Ground snap if possible later via engine; start at origin height
    root.position.copy(world);
    group.add(root);

    spawns.push({
      id: p.id,
      entityId: p.entityId,
      role: p.role,
      root,
      position: world.clone(),
      interactPoint: world.clone().add(new THREE.Vector3(0, 1.2, 0)),
      mixer,
    });
  }

  return {
    spawns,
    nearest(playerPos, radius = 3.4) {
      let best: TravelerSpawn | null = null;
      let bestD = radius * radius;
      for (const s of spawns) {
        // Keep position in sync with root (if snapped later)
        s.position.copy(s.root.position);
        const dx = s.position.x - playerPos.x;
        const dz = s.position.z - playerPos.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < bestD) {
          bestD = d2;
          best = s;
        }
      }
      return best;
    },
    update(dt: number) {
      for (const s of spawns) {
        s.mixer?.update(dt);
        const pip = s.root.getObjectByName('quest_pip');
        if (pip) {
          pip.position.y = 2.15 + Math.sin(performance.now() * 0.003 + s.role.length) * 0.05;
        }
      }
    },
    dispose() {
      for (const s of spawns) {
        s.mixer?.stopAllAction();
        s.mixer = null;
      }
      scene.remove(group);
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose());
          else (m.material as THREE.Material).dispose();
        }
      });
    },
  };
}

function hideWeaponMeshes(root: THREE.Object3D) {
  root.traverse((child) => {
    const n = child.name || '';
    if (/weapon|shield|bow|axe|sword|spear|staff|crossbow|rifle/i.test(n) && child !== root) {
      child.visible = false;
    }
  });
}

/** Empty group if CDN mesh fails — no production capsules. */
function makeCapsuleFallback(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'traveler_proxy';
  return g;
}
