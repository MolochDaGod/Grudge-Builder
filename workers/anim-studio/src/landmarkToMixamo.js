/** MediaPipe Pose → mixamorig local quaternions */

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
};

const ID = [0, 0, 0, 1];

function v3(lm) {
  if (!lm) return null;
  return [lm.x - 0.5, -(lm.y - 0.5), -(lm.z || 0)];
}
function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function len(a) {
  return Math.hypot(a[0], a[1], a[2]) || 1e-6;
}
function norm(a) {
  const L = len(a);
  return [a[0] / L, a[1] / L, a[2] / L];
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function quatFromTo(from, to) {
  const f = norm(from);
  const t = norm(to);
  const d = Math.max(-1, Math.min(1, dot(f, t)));
  if (d > 0.9999) return [...ID];
  if (d < -0.9999) {
    let axis = cross(f, [1, 0, 0]);
    if (len(axis) < 1e-4) axis = cross(f, [0, 1, 0]);
    axis = norm(axis);
    return [axis[0], axis[1], axis[2], 0];
  }
  const axis = norm(cross(f, t));
  const s = Math.sqrt((1 + d) * 2);
  const invs = 1 / s;
  return [axis[0] * invs, axis[1] * invs, axis[2] * invs, s * 0.5];
}
function nq(q) {
  const L = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / L, q[1] / L, q[2] / L, q[3] / L];
}

export function mirrorLandmarks(lms) {
  const swap = {
    11: 12, 12: 11, 13: 14, 14: 13, 15: 16, 16: 15,
    23: 24, 24: 23, 25: 26, 26: 25, 27: 28, 28: 27,
  };
  const result = lms.map((lm) => ({ ...lm }));
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

export function landmarksToMixamoPose(landmarks, opts = {}) {
  let lms = landmarks;
  if (opts.mirror) lms = mirrorLandmarks(lms);
  const L = (i) => v3(lms[i]);
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

  const pose = {
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

  const shAcross = norm(sub(lSh, rSh));
  pose.mixamorigHips = nq(quatFromTo([1, 0, 0], shAcross));

  const hipMid = [(lHp[0] + rHp[0]) * 0.5, (lHp[1] + rHp[1]) * 0.5, (lHp[2] + rHp[2]) * 0.5];
  const shMid = [(lSh[0] + rSh[0]) * 0.5, (lSh[1] + rSh[1]) * 0.5, (lSh[2] + rSh[2]) * 0.5];
  pose.mixamorigSpine = nq(quatFromTo([0, 1, 0], norm(sub(shMid, hipMid))));
  pose.mixamorigSpine1 = [...pose.mixamorigSpine];

  if (nose) {
    const hd = nq(quatFromTo([0, 1, 0], norm(sub(nose, shMid))));
    pose.mixamorigHead = hd;
    pose.mixamorigNeck = hd;
  }

  const restArm = [0, -1, 0];
  if (rEl) {
    pose.mixamorigRightArm = nq(quatFromTo(restArm, norm(sub(rEl, rSh))));
    if (rWr) pose.mixamorigRightForeArm = nq(quatFromTo(restArm, norm(sub(rWr, rEl))));
  }
  if (lEl) {
    pose.mixamorigLeftArm = nq(quatFromTo(restArm, norm(sub(lEl, lSh))));
    if (lWr) pose.mixamorigLeftForeArm = nq(quatFromTo(restArm, norm(sub(lWr, lEl))));
  }
  const restLeg = [0, -1, 0];
  if (rKn) {
    pose.mixamorigRightUpLeg = nq(quatFromTo(restLeg, norm(sub(rKn, rHp))));
    if (rAn) pose.mixamorigRightLeg = nq(quatFromTo(restLeg, norm(sub(rAn, rKn))));
  }
  if (lKn) {
    pose.mixamorigLeftUpLeg = nq(quatFromTo(restLeg, norm(sub(lKn, lHp))));
    if (lAn) pose.mixamorigLeftLeg = nq(quatFromTo(restLeg, norm(sub(lAn, lKn))));
  }
  return pose;
}

export function landmarksToRoot(landmarks, scale = 2) {
  const l = landmarks[MP.L_HIP];
  const r = landmarks[MP.R_HIP];
  if (!l || !r) return [0, 0, 0];
  return [((l.x + r.x) * 0.5 - 0.5) * scale, 0, -((l.z + r.z) * 0.5) * scale];
}
