/**
 * Bake Meshy Scourge (Crimson Warbrute) Skill_01 → Bip001 rotation-only JSON.
 *
 * Source: clip only (never play mesh).
 *   D:\Games\Models\scourgefaithtoon.zip
 *   Meshy_AI_Crimson_Warbrute_biped_Animation_Skill_01_withSkin.glb
 *
 * Output:
 *   client/public/anims/baked/meshy_scourge/skill1.json
 *   public/anims/baked/meshy_scourge/skill1.json
 *
 * Usage: node scripts/bake-meshy-scourge-skill1.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "_staging/meshy_scourge/scourge_skill1.glb");
const OUTS = [
  path.join(ROOT, "client/public/anims/baked/meshy_scourge/skill1.json"),
  path.join(ROOT, "public/anims/baked/meshy_scourge/skill1.json"),
];

const BARE_TO_BIP001 = {
  Hips: "Bip001 Pelvis",
  Spine: "Bip001 Spine",
  Spine1: "Bip001 Spine1",
  Spine01: "Bip001 Spine1",
  Spine2: "Bip001 Spine2",
  Spine02: "Bip001 Spine2",
  Neck: "Bip001 Neck",
  neck: "Bip001 Neck",
  Head: "Bip001 Head",
  LeftShoulder: "Bip001 L Clavicle",
  LeftArm: "Bip001 L UpperArm",
  LeftForeArm: "Bip001 L Forearm",
  LeftHand: "Bip001 L Hand",
  RightShoulder: "Bip001 R Clavicle",
  RightArm: "Bip001 R UpperArm",
  RightForeArm: "Bip001 R Forearm",
  RightHand: "Bip001 R Hand",
  LeftUpLeg: "Bip001 L Thigh",
  LeftLeg: "Bip001 L Calf",
  LeftFoot: "Bip001 L Foot",
  LeftToeBase: "Bip001 L Toe0",
  RightUpLeg: "Bip001 R Thigh",
  RightLeg: "Bip001 R Calf",
  RightFoot: "Bip001 R Foot",
  RightToeBase: "Bip001 R Toe0",
};

function parseGlb(buf) {
  if (buf.toString("utf8", 0, 4) !== "glTF") throw new Error("Not a GLB");
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset + 8 <= buf.length) {
    const len = buf.readUInt32LE(offset);
    const type = buf.toString("utf8", offset + 4, offset + 8);
    offset += 8;
    const chunk = buf.subarray(offset, offset + len);
    offset += len;
    if (type.startsWith("JSON")) json = JSON.parse(chunk.toString("utf8"));
    else if (type.startsWith("BIN")) bin = chunk;
  }
  if (!json || !bin) throw new Error("GLB missing JSON/BIN");
  return { json, bin };
}

function readAccessor(json, bin, accIndex) {
  const acc = json.accessors[accIndex];
  const bv = json.bufferViews[acc.bufferView];
  const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type] || 1;
  const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  if (acc.componentType !== 5126) {
    throw new Error(`Unsupported componentType ${acc.componentType}`);
  }
  const arr = new Float32Array(bin.buffer, bin.byteOffset + byteOffset, acc.count * comps);
  return { count: acc.count, comps, values: arr };
}

function mapNodeToBip(nodeName) {
  if (!nodeName) return null;
  let n = String(nodeName).replace(/^mixamorig:/i, "").replace(/^mixamorig/i, "");
  n = n.replace(/_\d+$/, "");
  return BARE_TO_BIP001[n] || BARE_TO_BIP001[n.charAt(0).toUpperCase() + n.slice(1)] || null;
}

function bakeAnimation(json, bin, anim) {
  const tracks = [];
  let duration = 0;
  const nodes = json.nodes;
  for (const ch of anim.channels) {
    if (ch.target.path !== "rotation") continue;
    const bip = mapNodeToBip(nodes[ch.target.node]?.name);
    if (!bip) continue;
    const sampler = anim.samplers[ch.sampler];
    const timesAcc = readAccessor(json, bin, sampler.input);
    const valsAcc = readAccessor(json, bin, sampler.output);
    const times = Array.from(timesAcc.values);
    const values = Array.from(valsAcc.values);
    if (!times.length) continue;
    duration = Math.max(duration, times[times.length - 1] || 0);
    tracks.push({
      name: `${bip}.quaternion`,
      type: "quaternion",
      times,
      values,
    });
  }
  const byName = new Map();
  for (const t of tracks) byName.set(t.name, t);
  return {
    name: "skill1",
    duration: duration || 0.01,
    tracks: [...byName.values()],
  };
}

const buf = fs.readFileSync(SRC);
const { json, bin } = parseGlb(buf);
const anim = (json.animations || [])[0];
if (!anim) throw new Error("No animation in Skill_01 GLB");
const baked = bakeAnimation(json, bin, anim);
if (baked.tracks.length < 10) {
  throw new Error(`Too few Bip001 tracks: ${baked.tracks.length}`);
}
const payload = {
  name: baked.name,
  duration: baked.duration,
  tracks: baked.tracks,
  meta: {
    source: "meshy scourge Crimson_Warbrute Skill_01",
    role: "skill1",
    policy: "quaternion-only Bip001 — clip not play mesh",
  },
};
for (const out of OUTS) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(payload));
  console.log(
    `baked ${path.relative(ROOT, out)} · ${baked.tracks.length} tracks · ${baked.duration.toFixed(2)}s`,
  );
}
