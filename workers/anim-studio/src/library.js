const KEY = "grudge_anim_studio_mocap_v1";

function read() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}
function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 40)));
}

export function listClips() {
  return read().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function saveClip(entry) {
  const list = read();
  const i = list.findIndex((c) => c.id === entry.id);
  if (i >= 0) list[i] = entry;
  else list.unshift(entry);
  write(list);
  return entry;
}

export function deleteClip(id) {
  write(read().filter((c) => c.id !== id));
}

export function toBakeJson(motion) {
  const bones = new Set();
  for (const f of motion.frames) for (const k of Object.keys(f.pose || {})) bones.add(k);
  const boneList = [...bones];
  const times = motion.frames.map((f) => f.t);
  const tracks = boneList.map((bone) => {
    const values = [];
    for (const f of motion.frames) {
      const q = f.pose[bone] || [0, 0, 0, 1];
      values.push(q[0], q[1], q[2], q[3]);
    }
    return { type: "quaternion", name: `${bone}.quaternion`, times: [...times], values };
  });
  return {
    name: motion.id,
    duration: motion.durationSec,
    skeleton: "mixamorig",
    rootMotion: "baked_locked",
    tracks,
    meta: {
      source: "video-mocap",
      confidence: motion.confidence,
      pipeline: "anim-studio-v1",
      host: "anim.grudge-studio.com",
    },
  };
}

export function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
