/**
 * MediaPipe Pose (33 landmarks) → mixamorig local quaternions.
 * Image space: x right, y down, z toward camera (approx).
 * Character space: +Y up, +Z forward.
 */

export type Landmark = { x: number; y: number; z: number; visibility?: number };

/** MediaPipe Pose landmark indices */
export const MP = {
  NOSE: 0,
  L_SHOULDER: 11,
  R_SHOULDER: 12,
  L_ELBOW: 13,
  R_ELBOW: 14,
  L_WRIST: 15,
  R_WRIST: 16,
  L_HIP: 23,
  R_HIP: 24,
  L_KNEE: 25,
  R_KNEE: 26,
  L_ANKLE: 27,
  R_ANKLE: 28,
} as const;

const ID: [number, number, number, number] = [0, 0, 0, 1];

function v3(lm: Landmark | undefined): [number, number, number] | null {
  if (!lm) return null;
  // MediaPipe normalized → character-ish: flip Y, depth
  return [lm.x - 0.5, -(lm.y - 0.5), -(lm.z || 0)];
}

function sub(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function len(a: [number, number, number]): number {
  return Math.hypot(a[0], a[1], a[2]) || 1e-6;
}

function norm(a: [number, number, number]): [number, number, number] {
  const L = len(a);
  return [a[0] / L, a[1] / L, a[2] / L];
}

function cross(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Quaternion that rotates vector `from` toward `to` (unit vectors). */
function quatFromTo(
  from: [number, number, number],
  to: [number, number, number],
): [number, number, number, number] {
  const f = norm(from);
  const t = norm(to);
  const d = Math.max(-1, Math.min(1, dot(f, t)));
  if (d > 0.9999) return [...ID];
  if (d < -0.9999) {
    // 180° — pick orthogonal axis
    let axis: [number, number, number] = cross(f, [1, 0, 0]);
    if (len(axis) < 1e-4) axis = cross(f, [0, 1, 0]);
    axis = norm(axis);
    return [axis[0], axis[1], axis[2], 0];
  }
  const axis = norm(cross(f, t));
  const s = Math.sqrt((1 + d) * 2);
  const invs = 1 / s;
  return [axis[0] * invs, axis[1] * invs, axis[2] * invs, s * 0.5];
}

function nq(q: [number, number, number, number]): [number, number, number, number] {
  const L = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / L, q[1] / L, q[2] / L, q[3] / L];
}

/** Mirror landmarks L↔R for "mirror mode" (selfie vs character facing). */
export function mirrorLandmarks(lms: Landmark[]): Landmark[] {
  const swap: Record<number, number> = {
    11: 12, 12: 11, 13: 14, 14: 13, 15: 16, 16: 15,
    23: 24, 24: 23, 25: 26, 26: 25, 27: 28, 28: 27,
    1: 4, 4: 1, 2: 5, 5: 2, 3: 6, 6: 3,
    7: 8, 8: 7, 9: 10, 10: 9,
  };
  const out = lms.map((lm) => ({ ...lm, x: 1 - lm.x }));
  const result = out.map((lm) => ({ ...lm }));
  for (const [a, b] of Object.entries(swap)) {
    const ia = Number(a);
    const ib = Number(b);
    if (out[ia] && out[ib] && ia < ib) {
      result[ia] = { ...out[ib], x: 1 - out[ib].x };
      result[ib] = { ...out[ia], x: 1 - out[ia].x };
    }
  }
  // Fix: after x flip, swap pairs properly
  for (const [a, b] of Object.entries(swap)) {
    const ia = Number(a);
    const ib = Number(b);
    if (ia < ib && lms[ia] && lms[ib]) {
      result[ia] = { x: 1 - lms[ib].x, y: lms[ib].y, z: lms[ib].z, visibility: lms[ib].visibility };
      result[ib] = { x: 1 - lms[ia].x, y: lms[ia].y, z: lms[ia].z, visibility: lms[ia].visibility };
    }
  }
  return result;
}

/**
 * Convert one MediaPipe pose frame → mixamorig pose (local quats).
 * Rest directions approximate A/T hybrid used by Mixamo.
 */
export function landmarksToMixamoPose(
  landmarks: Landmark[],
  opts?: { mirror?: boolean },
): Record<string, [number, number, number, number]> {
  let lms = landmarks;
  if (opts?.mirror) lms = mirrorLandmarks(lms);

  const L = (i: number) => v3(lms[i]);
  const lSh = L(MP.L_SHOULDER);
  const rSh = L(MP.R_SHOULDER);
  const lEl = L(MP.L_ELBOW);
  const rEl = L(MP.R_ELBOW);
  const lWr = L(MP.L_WRIST);
  const rWr = L(MP.R_WRIST);
  const lHp = L(MP.L_HIP);
  const rHp = L(MP.R_HIP);
  const lKn = L(MP.L_KNEE);
  const rKn = L(MP.R_KNEE);
  const lAn = L(MP.L_ANKLE);
  const rAn = L(MP.R_ANKLE);
  const nose = L(MP.NOSE);

  const pose: Record<string, [number, number, number, number]> = {
    mixamorigHips: [...ID],
    mixamorigSpine: [...ID],
    mixamorigSpine1: [...ID],
    mixamorigSpine2: [...ID],
    mixamorigNeck: [...ID],
    mixamorigHead: [...ID],
    mixamorigLeftShoulder: [...ID],
    mixamorigRightShoulder: [...ID],
    mixamorigLeftArm: [...ID],
    mixamorigRightArm: [...ID],
    mixamorigLeftForeArm: [...ID],
    mixamorigRightForeArm: [...ID],
    mixamorigLeftHand: [...ID],
    mixamorigRightHand: [...ID],
    mixamorigLeftUpLeg: [...ID],
    mixamorigRightUpLeg: [...ID],
    mixamorigLeftLeg: [...ID],
    mixamorigRightLeg: [...ID],
    mixamorigLeftFoot: [...ID],
    mixamorigRightFoot: [...ID],
  };

  if (!lHp || !rHp || !lSh || !rSh) return pose;

  const hipMid: [number, number, number] = [
    (lHp[0] + rHp[0]) * 0.5,
    (lHp[1] + rHp[1]) * 0.5,
    (lHp[2] + rHp[2]) * 0.5,
  ];
  const shMid: [number, number, number] = [
    (lSh[0] + rSh[0]) * 0.5,
    (lSh[1] + rSh[1]) * 0.5,
    (lSh[2] + rSh[2]) * 0.5,
  ];

  // Hips yaw from shoulder line (right → left) vs character +X
  const shoulderAcross = norm(sub(lSh, rSh));
  const restAcross: [number, number, number] = [1, 0, 0];
  pose.mixamorigHips = nq(quatFromTo(restAcross, shoulderAcross));

  // Spine: hip → shoulder along +Y rest
  const spineDir = norm(sub(shMid, hipMid));
  pose.mixamorigSpine = nq(quatFromTo([0, 1, 0], spineDir));
  pose.mixamorigSpine1 = [...pose.mixamorigSpine];
  pose.mixamorigSpine2 = [...ID];

  // Head: shoulder mid → nose
  if (nose) {
    const headDir = norm(sub(nose, shMid));
    pose.mixamorigHead = nq(quatFromTo([0, 1, 0], headDir));
    pose.mixamorigNeck = nq(quatFromTo([0, 1, 0], headDir));
  }

  // Arms: rest +X (right) / -X (left) roughly down-side; Mixamo upper arm rest ~ along -Y from shoulder in bind
  // Use shoulder→elbow vs rest [0,-1,0]
  const restArm: [number, number, number] = [0, -1, 0];
  if (rEl) {
    pose.mixamorigRightArm = nq(quatFromTo(restArm, norm(sub(rEl, rSh))));
    if (rWr) {
      pose.mixamorigRightForeArm = nq(quatFromTo(restArm, norm(sub(rWr, rEl))));
    }
  }
  if (lEl) {
    pose.mixamorigLeftArm = nq(quatFromTo(restArm, norm(sub(lEl, lSh))));
    if (lWr) {
      pose.mixamorigLeftForeArm = nq(quatFromTo(restArm, norm(sub(lWr, lEl))));
    }
  }

  // Legs: rest [0,-1,0]
  const restLeg: [number, number, number] = [0, -1, 0];
  if (rKn) {
    pose.mixamorigRightUpLeg = nq(quatFromTo(restLeg, norm(sub(rKn, rHp))));
    if (rAn) {
      pose.mixamorigRightLeg = nq(quatFromTo(restLeg, norm(sub(rAn, rKn))));
    }
  }
  if (lKn) {
    pose.mixamorigLeftUpLeg = nq(quatFromTo(restLeg, norm(sub(lKn, lHp))));
    if (lAn) {
      pose.mixamorigLeftLeg = nq(quatFromTo(restLeg, norm(sub(lAn, lKn))));
    }
  }

  return pose;
}

/** Approximate root XZ from hip mid (normalized → meters-ish scale) */
export function landmarksToRoot(
  landmarks: Landmark[],
  scale = 2,
): [number, number, number] {
  const l = landmarks[MP.L_HIP];
  const r = landmarks[MP.R_HIP];
  if (!l || !r) return [0, 0, 0];
  const x = ((l.x + r.x) * 0.5 - 0.5) * scale;
  const z = -((l.z + r.z) * 0.5) * scale;
  return [x, 0, z];
}
