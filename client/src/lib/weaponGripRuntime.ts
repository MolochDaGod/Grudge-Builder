/**
 * weaponGripRuntime — apply canonical grip + wrist lock to equipped weapon meshes.
 *
 * Prevents weapon-through-body by:
 *  1. Parenting (or aligning) weapon to R/L_hand_container
 *  2. Applying grip offset/rotation from weaponCombatGeometry
 *  3. Clamping wrist-like Euler on the hand bone / weapon root each frame
 *
 * Call after equip; call updateWristLock each frame (or after animation mixer).
 */
import * as THREE from 'three';
import {
  getWeaponCombatProfile,
  type WeaponCombatProfile,
  type WristLock,
} from '@shared/definitions/weaponCombatGeometry';
import { SOCKET_BONE_CANDIDATES } from '@shared/definitions/weaponAttachSystem';

const _euler = new THREE.Euler();
const _q = new THREE.Quaternion();
const _qBias = new THREE.Quaternion();
const _qOut = new THREE.Quaternion();

function findSocket(root: THREE.Object3D, left: boolean): THREE.Object3D | null {
  const keys = left ? SOCKET_BONE_CANDIDATES.hand_l : SOCKET_BONE_CANDIDATES.hand_r;
  for (const name of keys) {
    const o = root.getObjectByName(name);
    if (o) return o;
  }
  return null;
}

/**
 * Apply grip pose to a weapon Object3D (should already be under the hand bone,
 * or will be reparented to it).
 */
export function applyWeaponGripPose(
  characterRoot: THREE.Object3D,
  weaponRoot: THREE.Object3D,
  weaponTypeId: string,
): WeaponCombatProfile {
  const profile = getWeaponCombatProfile(weaponTypeId);
  const hand = findSocket(characterRoot, !!profile.grip.leftHand);
  if (hand && weaponRoot.parent !== hand) {
    // Preserve world transform while reparenting
    hand.attach(weaponRoot);
  }
  const g = profile.grip;
  weaponRoot.position.set(g.offset[0], g.offset[1], g.offset[2]);
  weaponRoot.rotation.set(g.rotation[0], g.rotation[1], g.rotation[2]);
  weaponRoot.scale.setScalar(g.scale);
  weaponRoot.userData.weaponTypeId = profile.weaponTypeId;
  weaponRoot.userData.combatProfile = profile;
  weaponRoot.userData.wristLock = profile.wrist;
  return profile;
}

/**
 * Clamp local Euler of weapon (or hand bone) to wrist limits and blend bias.
 * Call after AnimationMixer.update.
 */
export function updateWristLock(
  weaponOrHand: THREE.Object3D,
  wrist?: WristLock,
  dt = 1 / 60,
): void {
  const lock: WristLock | undefined =
    wrist || (weaponOrHand.userData.wristLock as WristLock | undefined);
  if (!lock) return;

  _euler.setFromQuaternion(weaponOrHand.quaternion, 'XYZ');
  _euler.x = THREE.MathUtils.clamp(_euler.x, -lock.maxPitch, lock.maxPitch);
  _euler.y = THREE.MathUtils.clamp(_euler.y, -lock.maxYaw, lock.maxYaw);
  _euler.z = THREE.MathUtils.clamp(_euler.z, -lock.maxRoll, lock.maxRoll);

  // Bias toward outward grip (prevents blade rolling into torso)
  _qBias.setFromEuler(
    new THREE.Euler(lock.biasEuler[0], lock.biasEuler[1], lock.biasEuler[2], 'XYZ'),
  );
  _q.setFromEuler(_euler);
  const t = THREE.MathUtils.clamp(lock.spring * Math.min(1, dt * 12), 0, 1);
  _qOut.copy(_q).slerp(_qBias, t * 0.25);
  // Also keep clamped euler influence
  _qOut.slerp(_q, 1 - t * 0.5);
  weaponOrHand.quaternion.copy(_qOut);
}

/**
 * Build a debug helper mesh for the hit collider (editor preview).
 */
export function createColliderHelper(profile: WeaponCombatProfile): THREE.Object3D {
  const c = profile.collider;
  let mesh: THREE.Mesh;
  const mat = new THREE.MeshBasicMaterial({
    color: 0x44ff88,
    wireframe: true,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  if (c.shape === 'sphere') {
    mesh = new THREE.Mesh(new THREE.SphereGeometry(c.size[0], 12, 10), mat);
  } else if (c.shape === 'box') {
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(c.size[0] * 2, c.size[1] * 2, c.size[2] * 2),
      mat,
    );
  } else {
    // capsule ≈ cylinder + spheres
    mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(c.size[0], c.size[1] * 2, 4, 10),
      mat,
    );
  }
  mesh.position.set(c.center[0], c.center[1], c.center[2]);
  mesh.name = 'weapon_hit_collider_helper';
  mesh.userData.reachM = c.reachM;
  mesh.userData.arcHalfRad = c.arcHalfRad;
  return mesh;
}

/**
 * Optimal attack origin: character position + forward * (reach * 0.55) at heightBias.
 */
export function getOptimalAttackPoint(
  characterPos: THREE.Vector3,
  forwardXZ: THREE.Vector3,
  profile: WeaponCombatProfile,
): THREE.Vector3 {
  const c = profile.collider;
  const f = forwardXZ.clone().setY(0);
  if (f.lengthSq() < 1e-6) f.set(0, 0, 1);
  f.normalize();
  return new THREE.Vector3(
    characterPos.x + f.x * c.reachM * 0.55,
    characterPos.y + c.heightBiasM,
    characterPos.z + f.z * c.reachM * 0.55,
  );
}
