/**
 * Cinema Grudge6 RTS-toon load path — SSOT for intro cast.
 *
 * PURGE: western-kingdoms_mage/warrior hero GLBs, ad-hoc plantFeet without equip.
 * USE: loadCharacterModel(WK_Characters) + setupGrudge6Equipment + fitCharacterRootToHeightM
 *      + race atlas textures (same as CampUnitSystem / WarUnit).
 *
 * SI: 1 unit = 1 m · human = 1.8 m · unit decade UNCLAMPED.
 */
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadCharacterModel, loadAnimationClip } from '@/lib/modelLoader';
import { setupGrudge6Equipment } from '@/lib/grudge6Equipment';
import { applyGrudge6RaceTextures } from '@/lib/grudge6Textures';
import {
  RACE_GRUDGE6,
  defaultModel3d,
  resolveRaceCdnUrl,
} from '@shared/fleet';
import {
  fitCharacterRootToHeightM,
  measureObjectWorldHeight,
  unitDecadeFactor,
  PLAYER_HEIGHT_M,
} from '@/island3d/zoneWorldScale';

export const CINEMA_HUMAN_M = PLAYER_HEIGHT_M;

/** SI fit non-character props (ship, levi, island) — never hero-height. */
export function fitPropSpanM(
  obj: THREE.Object3D,
  targetSpanM: number,
  axis: 'max' | 'x' | 'y' | 'z' = 'max',
): { measured: number; scale: number; decade: number } {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  let measured =
    axis === 'x' ? size.x : axis === 'y' ? size.y : axis === 'z' ? size.z : Math.max(size.x, size.y, size.z);
  if (!(measured > 1e-6)) measured = 1;

  // Fix classic 100× on raw props before aesthetic fit
  const decade = unitDecadeFactor(measured, targetSpanM);
  if (Math.abs(decade - 1) > 1e-6) {
    obj.scale.multiplyScalar(decade);
    obj.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(obj);
    const s2 = box2.getSize(new THREE.Vector3());
    measured =
      axis === 'x' ? s2.x : axis === 'y' ? s2.y : axis === 'z' ? s2.z : Math.max(s2.x, s2.y, s2.z);
  }

  const s = targetSpanM / Math.max(measured, 1e-6);
  obj.scale.multiplyScalar(s);
  obj.updateMatrixWorld(true);

  // Ground local y=0 at feet/keel of this object (caller may reparent)
  const box3 = new THREE.Box3().setFromObject(obj);
  obj.position.y -= box3.min.y;

  const finalBox = new THREE.Box3().setFromObject(obj);
  const finalSize = finalBox.getSize(new THREE.Vector3());
  const final =
    axis === 'x'
      ? finalSize.x
      : axis === 'y'
        ? finalSize.y
        : axis === 'z'
          ? finalSize.z
          : Math.max(finalSize.x, finalSize.y, finalSize.z);

  console.info(
    `[cinemaSi] prop span target=${targetSpanM}m measured≈${final.toFixed(2)}m decade=${decade} scale*=${s.toFixed(4)}`,
  );
  return { measured: final, scale: s, decade };
}

/** Yaw-only face toward world XZ target (no pitch flip / no carrier tumble). */
export function faceYawToward(obj: THREE.Object3D, target: THREE.Vector3, modelForward = 'z'): void {
  const dx = target.x - obj.position.x;
  const dz = target.z - obj.position.z;
  if (dx * dx + dz * dz < 1e-8) return;
  // Three.js default lookAt faces -Z; many grudge kits face +Z — use atan2
  const yaw = modelForward === 'z' ? Math.atan2(dx, dz) : Math.atan2(dx, dz) + Math.PI;
  obj.rotation.set(0, yaw, 0);
}

export type CinemaHumanRole = 'mage' | 'hero';

export interface CinemaHumanPack {
  root: THREE.Group;
  mesh: THREE.Object3D;
  clips: THREE.AnimationClip[];
}

let _wkTemplate: Awaited<ReturnType<typeof loadCharacterModel>> | null = null;
let _wkLoading: Promise<Awaited<ReturnType<typeof loadCharacterModel>>> | null = null;

async function getWkTemplate() {
  if (_wkTemplate) return _wkTemplate;
  // Dedup parallel spawnCinemaHuman (4 mages + hero load together)
  if (!_wkLoading) {
    _wkLoading = (async () => {
      const url = resolveRaceCdnUrl('human');
      const tpl = await loadCharacterModel(url);
      try {
        await applyGrudge6RaceTextures(tpl.scene, 'human');
      } catch (e) {
        console.warn('[cinemaGrudge6] texture apply soft-fail', e);
      }
      _wkTemplate = tpl;
      return tpl;
    })();
  }
  return _wkLoading;
}

/**
 * Clone a production WK RTS unit for cinema.
 * Mages: body kit only (unarmed cast + VFX shields) — clean modular mesh.
 * Hero: unarmed throw body.
 */
export async function spawnCinemaHuman(role: CinemaHumanRole): Promise<CinemaHumanPack> {
  const tpl = await getWkTemplate();
  const race = RACE_GRUDGE6.human;
  const mesh = (SkeletonUtils as { clone: (o: THREE.Object3D) => THREE.Object3D }).clone(
    tpl.scene,
  ) as THREE.Object3D;

  const model3d = defaultModel3d('human', {
    equippedMeshes: { body: 'A', arms: 'A', legs: 'A', head: 'A' },
    // Unarmed — staff/mesh clutter off; rings/force-fields are cinema VFX
    weaponSlots: {},
    scale: 1, // NEVER pass scale:100 poison
  });

  setupGrudge6Equipment(race.prefix, mesh, model3d);
  try {
    await applyGrudge6RaceTextures(mesh, 'human');
  } catch {
    /* already tried template */
  }

  const fit = fitCharacterRootToHeightM(mesh, 1.0, CINEMA_HUMAN_M);
  const fitScale =
    typeof fit === 'number'
      ? fit
      : (fit as { scale?: number; heightAfter?: number })?.scale ?? 1;
  console.info(
    `[cinemaGrudge6] ${role} fit scale≈${Number(fitScale).toFixed?.(3) ?? fitScale} target ${CINEMA_HUMAN_M}m`,
  );

  // Final audit — if still > 20m, force 0.01 decade (cm-as-m authoring)
  const measured = measureObjectWorldHeight(mesh);
  if (measured > 20) {
    console.warn(`[cinemaGrudge6] ${role} still huge h=${measured.toFixed(1)}m — force ×0.01`);
    mesh.scale.multiplyScalar(0.01);
    mesh.updateMatrixWorld(true);
    fitCharacterRootToHeightM(mesh, 1.0, CINEMA_HUMAN_M);
  } else if (measured > 0 && measured < 0.3) {
    // Inverse decade: too small
    console.warn(`[cinemaGrudge6] ${role} tiny h=${measured.toFixed(3)}m — force ×100`);
    mesh.scale.multiplyScalar(100);
    mesh.updateMatrixWorld(true);
    fitCharacterRootToHeightM(mesh, 1.0, CINEMA_HUMAN_M);
  }

  const root = new THREE.Group();
  root.name = `cinema_${role}`;
  root.add(mesh);

  // Plant feet at root y=0
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  mesh.position.y -= box.min.y;

  return {
    root,
    mesh,
    clips: tpl.clips.slice(),
  };
}

/** Load Mixamo attack clips remapped for Bip001 / bare bones via modelLoader. */
export async function loadCinema2hAttackClips(): Promise<THREE.AnimationClip[]> {
  const urls = [
    `${resolveRaceCdnUrl('human').split('/models/')[0]}/models/animations/attack.glb`,
    'https://assets.grudge-studio.com/models/animations/attack.glb',
    'https://assets.grudge-studio.com/models/animations/magic/Standing 2H Magic Attack 01.glb',
    'https://assets.grudge-studio.com/models/animations/magic/Standing 2H Magic Attack 02.glb',
  ];
  // Prefer loadAnimationClip which remaps bones
  const out: THREE.AnimationClip[] = [];
  const tryUrls = [
    'https://assets.grudge-studio.com/models/animations/attack.glb',
  ];
  for (let i = 0; i < tryUrls.length; i++) {
    try {
      const clip = await loadAnimationClip(tryUrls[i]);
      if (clip) {
        const c = clip.clone();
        c.name = i === 0 ? '2h_magic_attack_1' : `2h_magic_attack_${i + 1}`;
        out.push(c);
        // Second alias for cycle variety
        const c2 = clip.clone();
        c2.name = '2h_magic_attack_2';
        out.push(c2);
      }
    } catch {
      /* next */
    }
  }
  void urls;
  return out;
}

/**
 * Force-field bubble — danger-room ward shell around casters.
 * Double shell: soft fill + wire rim (readable at cinema distance).
 */
export function createForceField(radiusM = 1.15): THREE.Group {
  const g = new THREE.Group();
  g.name = 'cinema_force_field';

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(radiusM, 28, 20),
    new THREE.MeshBasicMaterial({
      color: 0x44ddff,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  shell.name = 'ff_shell';

  const rim = new THREE.Mesh(
    new THREE.SphereGeometry(radiusM * 1.02, 16, 12),
    new THREE.MeshBasicMaterial({
      color: 0xaaffff,
      transparent: true,
      opacity: 0.28,
      wireframe: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  rim.name = 'ff_rim';

  g.add(shell, rim);
  // Center on torso for 1.8 m human (feet at y=0)
  g.position.y = 0.95;
  g.userData.shell = shell;
  g.userData.rim = rim;
  return g;
}

/**
 * Yin-yang magic ring as CLOCK-FACE shield.
 *
 * Asset is a flat disk (thin on Z). We:
 *  1. Fit diameter to spanM
 *  2. Keep face vertical (NO pitch/roll tip — that made "coin on table")
 *  3. Spin only around face normal (local Z) = clock hands
 *  4. Parent holder yaw faces threat so the face is readable edge-on to camera
 */
export function mountClockRing(
  ringTemplate: THREE.Object3D,
  spanM = 1.5,
): THREE.Group {
  const holder = new THREE.Group();
  holder.name = 'clock_ring_holder';
  const ring = ringTemplate.clone(true);
  ring.name = 'clock_ring_mesh';
  ring.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(ring);
  const size = box.getSize(new THREE.Vector3());

  // Prefer face plane: two large axes; thin axis is thickness
  const dims = [size.x, size.y, size.z].sort((a, b) => b - a);
  const face = Math.max(dims[0], dims[1], 0.001);
  ring.scale.multiplyScalar(spanM / face);

  // Center mesh on holder origin
  ring.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(ring);
  const c = b2.getCenter(new THREE.Vector3());
  ring.position.sub(c);

  // Ensure face is in XY (normal = +Z). If asset is XZ-flat (normal +Y), tip -90° X once.
  const thinIsY = size.y < size.x * 0.35 && size.y < size.z * 0.35;
  if (thinIsY) {
    ring.rotation.set(-Math.PI / 2, 0, 0);
  } else {
    ring.rotation.set(0, 0, 0);
  }

  holder.add(ring);
  // Chest height, slightly forward of torso for 1.8 m human
  holder.position.set(0, 1.05, 0.55);
  holder.userData.ringMesh = ring;
  holder.visible = false;
  return holder;
}

/** Spin clock ring: rotate face around its normal (local Z) like clock hands — not Y like a coin. */
export function tickClockRing(holder: THREE.Object3D, dt: number, rpm = 22): void {
  if (!holder.visible) return;
  const ring = holder.userData.ringMesh as THREE.Object3D | undefined;
  if (!ring) return;
  // Clock-hand spin: local Z only
  ring.rotation.z += (rpm * Math.PI * 2 * dt) / 60;
}

/** Pulse force-field opacity / scale while wards are up. */
export function tickForceField(field: THREE.Object3D | null, t: number, active: boolean): void {
  if (!field) return;
  field.visible = active;
  if (!active) return;
  const pulse = 1 + Math.sin(t * 3.2) * 0.035;
  field.scale.setScalar(pulse);
  const shell = field.userData.shell as THREE.Mesh | undefined;
  const rim = field.userData.rim as THREE.Mesh | undefined;
  if (shell?.material) {
    (shell.material as THREE.MeshBasicMaterial).opacity = 0.10 + Math.sin(t * 4) * 0.05;
  }
  if (rim?.material) {
    (rim.material as THREE.MeshBasicMaterial).opacity = 0.22 + Math.sin(t * 5.5) * 0.08;
    rim.rotation.y += 0.4 * (1 / 60); // slow hex crawl
  }
}
