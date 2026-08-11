/**
 * anim-ai-worker v2.1 — Grudox Animator chat → Mixamo pose clips
 *
 * SPA: https://grudox.grudge-studio.com/animator/
 * Expects POST /chat with { messages|message, duration, references, motion }
 * Returns { reply, clip: { bones, frames:[{ duration, pose, root? }] }, warnings }
 */

const VERSION = "2.1.0";

const BONES = [
  "mixamorigHips",
  "mixamorigSpine",
  "mixamorigSpine1",
  "mixamorigSpine2",
  "mixamorigNeck",
  "mixamorigHead",
  "mixamorigLeftShoulder",
  "mixamorigLeftArm",
  "mixamorigLeftForeArm",
  "mixamorigLeftHand",
  "mixamorigRightShoulder",
  "mixamorigRightArm",
  "mixamorigRightForeArm",
  "mixamorigRightHand",
  "mixamorigLeftUpLeg",
  "mixamorigLeftLeg",
  "mixamorigLeftFoot",
  "mixamorigRightUpLeg",
  "mixamorigRightLeg",
  "mixamorigRightFoot",
];

const ID = [0, 0, 0, 1]; // identity quat xyzw

const SYSTEM = `You are the Grudox Animator AI. Output ONLY JSON for Mixamo mixamorig* humanoid motion.

HUMAN MOTION: idle=breathing; walk/run=gait with contralateral arm swing; attacks=windup→contact→recovery one-shots.
RIGID BODY: hips.position is root translation; bone values are LOCAL quaternions xyzw.
MIXER: client builds THREE.AnimationClip + AnimationMixer; you only emit pose frames.

Schema:
{"reply":"short","clip":{"frames":[{"duration":0.15,"pose":{"mixamorigRightArm":[x,y,z,w]},"root":[0,0,0]}]}}

Rules:
- Only these bones: ${BONES.join(", ")}
- Quaternion xyzw, normalized; prefer small rotations from identity
- 4-12 frames for 1-2s motions; duration seconds per frame
- Omit bones that stay at identity
- No markdown fences`;

// ── Math ───────────────────────────────────────────────────────
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function eulerToQuat(x, y, z) {
  // XYZ intrinsic → xyzw
  const cx = Math.cos(x * 0.5);
  const sx = Math.sin(x * 0.5);
  const cy = Math.cos(y * 0.5);
  const sy = Math.sin(y * 0.5);
  const cz = Math.cos(z * 0.5);
  const sz = Math.sin(z * 0.5);
  return [
    sx * cy * cz + cx * sy * sz,
    cx * sy * cz - sx * cy * sz,
    cx * cy * sz + sx * sy * cz,
    cx * cy * cz - sx * sy * sz,
  ];
}

function deg(...d) {
  return d.map((v) => (v * Math.PI) / 180);
}

function frame(duration, pose = {}, root = null) {
  const f = { duration: clamp(duration, 0.05, 5), pose: { ...pose } };
  if (root) f.root = root;
  return f;
}

function fullPose(partial = {}) {
  const pose = {};
  for (const b of BONES) pose[b] = partial[b] ? [...partial[b]] : [...ID];
  return pose;
}

function packClip(frames, name = "clip") {
  // Ensure every used bone is listed; fill missing with identity on first pass
  const used = new Set();
  for (const f of frames) {
    for (const k of Object.keys(f.pose || {})) used.add(k);
  }
  if (used.size === 0) used.add("mixamorigHips");
  const bones = BONES.filter((b) => used.has(b));
  // Fill all listed bones on every frame for client stability
  const filled = frames.map((f) => {
    const pose = {};
    for (const b of bones) {
      pose[b] = f.pose && f.pose[b] ? normalizeQuat(f.pose[b]) : [...ID];
    }
    const out = { duration: clamp(Number(f.duration) || 0.15, 0.05, 5), pose };
    if (f.root) out.root = f.root;
    return out;
  });
  return { name, bones, frames: filled.slice(0, 64) };
}

function normalizeQuat(q) {
  if (!Array.isArray(q) || q.length !== 4) return [...ID];
  const [x, y, z, w] = q.map(Number);
  if (![x, y, z, w].every(Number.isFinite)) return [...ID];
  const len = Math.hypot(x, y, z, w);
  if (len < 1e-6) return [...ID];
  return [x / len, y / len, z / len, w / len];
}

// ── Deterministic motion library (basic language — always works) ─
function presetWave(duration = 1.2) {
  const n = 6;
  const dt = duration / n;
  const frames = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const swing = Math.sin(t * Math.PI * 2) * 35;
    frames.push(
      frame(dt, {
        mixamorigRightShoulder: eulerToQuat(...deg(0, 0, -10)),
        mixamorigRightArm: eulerToQuat(...deg(-20, 0, -110 + swing * 0.2)),
        mixamorigRightForeArm: eulerToQuat(...deg(0, 0, -20 + swing)),
        mixamorigRightHand: eulerToQuat(...deg(0, 0, swing * 0.3)),
        mixamorigSpine2: eulerToQuat(...deg(0, 5, 0)),
        mixamorigHead: eulerToQuat(...deg(0, 8, 0)),
      }),
    );
  }
  return packClip(frames, "wave");
}

function presetNod(duration = 1.0) {
  const frames = [
    frame(duration * 0.25, { mixamorigHead: eulerToQuat(...deg(0, 0, 0)) }),
    frame(duration * 0.25, { mixamorigHead: eulerToQuat(...deg(25, 0, 0)) }),
    frame(duration * 0.25, { mixamorigHead: eulerToQuat(...deg(-5, 0, 0)) }),
    frame(duration * 0.25, { mixamorigHead: eulerToQuat(...deg(0, 0, 0)) }),
  ];
  return packClip(frames, "nod");
}

function presetIdle(duration = 2.0) {
  const n = 4;
  const dt = duration / n;
  const frames = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const breath = Math.sin(t * Math.PI * 2) * 3;
    frames.push(
      frame(dt, {
        mixamorigSpine: eulerToQuat(...deg(breath * 0.3, 0, 0)),
        mixamorigSpine1: eulerToQuat(...deg(breath * 0.4, 0, 0)),
        mixamorigSpine2: eulerToQuat(...deg(breath * 0.5, 0, 0)),
        mixamorigLeftArm: eulerToQuat(...deg(2 + breath * 0.2, 0, 4)),
        mixamorigRightArm: eulerToQuat(...deg(2 + breath * 0.2, 0, -4)),
      }),
    );
  }
  return packClip(frames, "idle");
}

function presetWalk(duration = 1.2) {
  const n = 8;
  const dt = duration / n;
  const frames = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const leg = Math.sin(t) * 28;
    const arm = Math.sin(t + Math.PI) * 22;
    const bob = Math.abs(Math.sin(t)) * 0.02;
    frames.push(
      frame(
        dt,
        {
          mixamorigHips: eulerToQuat(...deg(0, Math.sin(t) * 4, 0)),
          mixamorigLeftUpLeg: eulerToQuat(...deg(leg, 0, 0)),
          mixamorigLeftLeg: eulerToQuat(...deg(-Math.abs(leg) * 0.6, 0, 0)),
          mixamorigRightUpLeg: eulerToQuat(...deg(-leg, 0, 0)),
          mixamorigRightLeg: eulerToQuat(...deg(-Math.abs(-leg) * 0.6, 0, 0)),
          mixamorigLeftArm: eulerToQuat(...deg(arm * 0.4, 0, 8)),
          mixamorigRightArm: eulerToQuat(...deg(-arm * 0.4, 0, -8)),
          mixamorigSpine: eulerToQuat(...deg(2, Math.sin(t) * 3, 0)),
        },
        [0, bob, (i / n) * 0.4],
      ),
    );
  }
  return packClip(frames, "walk");
}

function presetRun(duration = 0.9) {
  const n = 8;
  const dt = duration / n;
  const frames = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const leg = Math.sin(t) * 42;
    const arm = Math.sin(t + Math.PI) * 35;
    const bob = Math.abs(Math.sin(t)) * 0.04;
    frames.push(
      frame(
        dt,
        {
          mixamorigHips: eulerToQuat(...deg(8, Math.sin(t) * 6, 0)),
          mixamorigSpine: eulerToQuat(...deg(10, 0, 0)),
          mixamorigLeftUpLeg: eulerToQuat(...deg(leg, 0, 0)),
          mixamorigLeftLeg: eulerToQuat(...deg(-Math.abs(leg) * 0.8, 0, 0)),
          mixamorigRightUpLeg: eulerToQuat(...deg(-leg, 0, 0)),
          mixamorigRightLeg: eulerToQuat(...deg(-Math.abs(-leg) * 0.8, 0, 0)),
          mixamorigLeftArm: eulerToQuat(...deg(arm * 0.5, 0, 12)),
          mixamorigRightArm: eulerToQuat(...deg(-arm * 0.5, 0, -12)),
        },
        [0, bob, (i / n) * 0.7],
      ),
    );
  }
  return packClip(frames, "run");
}

function presetAttack(duration = 1.0) {
  // windup → contact → recovery
  const frames = [
    frame(duration * 0.25, {
      mixamorigHips: eulerToQuat(...deg(0, -15, 0)),
      mixamorigSpine2: eulerToQuat(...deg(0, -20, 0)),
      mixamorigRightArm: eulerToQuat(...deg(-40, 40, -50)),
      mixamorigRightForeArm: eulerToQuat(...deg(0, 0, -40)),
      mixamorigLeftArm: eulerToQuat(...deg(10, 0, 20)),
    }),
    frame(duration * 0.15, {
      mixamorigHips: eulerToQuat(...deg(0, 10, 0)),
      mixamorigSpine2: eulerToQuat(...deg(5, 25, 0)),
      mixamorigRightArm: eulerToQuat(...deg(-10, -30, -100)),
      mixamorigRightForeArm: eulerToQuat(...deg(0, 0, -10)),
      mixamorigRightHand: eulerToQuat(...deg(0, 0, -20)),
      mixamorigLeftArm: eulerToQuat(...deg(15, 0, 30)),
    }),
    frame(duration * 0.2, {
      mixamorigHips: eulerToQuat(...deg(0, 20, 0)),
      mixamorigSpine2: eulerToQuat(...deg(8, 35, 0)),
      mixamorigRightArm: eulerToQuat(...deg(20, -50, -90)),
      mixamorigRightForeArm: eulerToQuat(...deg(0, 0, 10)),
    }),
    frame(duration * 0.4, {
      mixamorigHips: eulerToQuat(...deg(0, 0, 0)),
      mixamorigSpine2: eulerToQuat(...deg(0, 0, 0)),
      mixamorigRightArm: eulerToQuat(...deg(5, 0, -15)),
      mixamorigRightForeArm: eulerToQuat(...deg(0, 0, 0)),
    }),
  ];
  return packClip(frames, "attack");
}

function presetBlock(duration = 0.8) {
  const hold = {
    mixamorigLeftArm: eulerToQuat(...deg(-30, 20, 70)),
    mixamorigLeftForeArm: eulerToQuat(...deg(0, 0, -50)),
    mixamorigRightArm: eulerToQuat(...deg(-25, -15, -60)),
    mixamorigRightForeArm: eulerToQuat(...deg(0, 0, 40)),
    mixamorigSpine2: eulerToQuat(...deg(5, 0, 0)),
  };
  return packClip(
    [
      frame(duration * 0.2, {}),
      frame(duration * 0.5, hold),
      frame(duration * 0.3, hold),
    ],
    "block",
  );
}

function presetDodge(duration = 0.6) {
  return packClip(
    [
      frame(duration * 0.2, {
        mixamorigHips: eulerToQuat(...deg(0, 0, -25)),
        mixamorigSpine: eulerToQuat(...deg(0, 0, -15)),
      }, [-0.2, 0, 0]),
      frame(duration * 0.3, {
        mixamorigHips: eulerToQuat(...deg(15, 0, -40)),
        mixamorigSpine: eulerToQuat(...deg(20, 0, -20)),
        mixamorigLeftUpLeg: eulerToQuat(...deg(40, 0, 0)),
        mixamorigRightUpLeg: eulerToQuat(...deg(-10, 0, 0)),
      }, [-0.6, 0.05, 0.2]),
      frame(duration * 0.5, {
        mixamorigHips: eulerToQuat(...deg(0, 0, 0)),
      }, [-0.8, 0, 0.3]),
    ],
    "dodge",
  );
}

function presetJump(duration = 0.9) {
  return packClip(
    [
      frame(duration * 0.2, {
        mixamorigHips: eulerToQuat(...deg(15, 0, 0)),
        mixamorigLeftUpLeg: eulerToQuat(...deg(50, 0, 0)),
        mixamorigRightUpLeg: eulerToQuat(...deg(50, 0, 0)),
        mixamorigLeftLeg: eulerToQuat(...deg(-70, 0, 0)),
        mixamorigRightLeg: eulerToQuat(...deg(-70, 0, 0)),
        mixamorigLeftArm: eulerToQuat(...deg(-20, 0, 30)),
        mixamorigRightArm: eulerToQuat(...deg(-20, 0, -30)),
      }, [0, 0, 0]),
      frame(duration * 0.35, {
        mixamorigHips: eulerToQuat(...deg(-5, 0, 0)),
        mixamorigLeftArm: eulerToQuat(...deg(-80, 0, 20)),
        mixamorigRightArm: eulerToQuat(...deg(-80, 0, -20)),
      }, [0, 0.5, 0.1]),
      frame(duration * 0.45, {
        mixamorigHips: eulerToQuat(...deg(10, 0, 0)),
        mixamorigLeftUpLeg: eulerToQuat(...deg(30, 0, 0)),
        mixamorigRightUpLeg: eulerToQuat(...deg(30, 0, 0)),
      }, [0, 0, 0.2]),
    ],
    "jump",
  );
}

function presetCast(duration = 1.2) {
  return packClip(
    [
      frame(duration * 0.3, {
        mixamorigLeftArm: eulerToQuat(...deg(-40, 20, 40)),
        mixamorigRightArm: eulerToQuat(...deg(-40, -20, -40)),
        mixamorigSpine2: eulerToQuat(...deg(-5, 0, 0)),
      }),
      frame(duration * 0.3, {
        mixamorigLeftArm: eulerToQuat(...deg(-90, 10, 20)),
        mixamorigRightArm: eulerToQuat(...deg(-90, -10, -20)),
        mixamorigLeftForeArm: eulerToQuat(...deg(0, 0, -30)),
        mixamorigRightForeArm: eulerToQuat(...deg(0, 0, 30)),
        mixamorigHead: eulerToQuat(...deg(-10, 0, 0)),
      }),
      frame(duration * 0.2, {
        mixamorigLeftArm: eulerToQuat(...deg(-70, 0, 10)),
        mixamorigRightArm: eulerToQuat(...deg(-70, 0, -10)),
      }),
      frame(duration * 0.2, {
        mixamorigLeftArm: eulerToQuat(...deg(0, 0, 10)),
        mixamorigRightArm: eulerToQuat(...deg(0, 0, -10)),
      }),
    ],
    "cast",
  );
}

function presetSpin(duration = 1.0) {
  const n = 6;
  const dt = duration / n;
  const frames = [];
  for (let i = 0; i < n; i++) {
    const yaw = (i / (n - 1)) * 360;
    frames.push(
      frame(dt, {
        mixamorigHips: eulerToQuat(...deg(0, yaw, 0)),
        mixamorigLeftArm: eulerToQuat(...deg(-30, 0, 80)),
        mixamorigRightArm: eulerToQuat(...deg(-30, 0, -80)),
      }),
    );
  }
  return packClip(frames, "spin");
}

function presetSit(duration = 1.0) {
  return packClip(
    [
      frame(duration * 0.4, {
        mixamorigHips: eulerToQuat(...deg(20, 0, 0)),
        mixamorigLeftUpLeg: eulerToQuat(...deg(70, 0, 5)),
        mixamorigRightUpLeg: eulerToQuat(...deg(70, 0, -5)),
        mixamorigLeftLeg: eulerToQuat(...deg(-80, 0, 0)),
        mixamorigRightLeg: eulerToQuat(...deg(-80, 0, 0)),
      }, [0, -0.4, 0]),
      frame(duration * 0.6, {
        mixamorigHips: eulerToQuat(...deg(25, 0, 0)),
        mixamorigLeftUpLeg: eulerToQuat(...deg(85, 0, 8)),
        mixamorigRightUpLeg: eulerToQuat(...deg(85, 0, -8)),
        mixamorigLeftLeg: eulerToQuat(...deg(-90, 0, 0)),
        mixamorigRightLeg: eulerToQuat(...deg(-90, 0, 0)),
        mixamorigSpine: eulerToQuat(...deg(-5, 0, 0)),
      }, [0, -0.45, 0]),
    ],
    "sit",
  );
}

function presetSwordSlash(duration = 0.8) {
  return packClip(
    [
      frame(duration * 0.35, {
        mixamorigHips: eulerToQuat(...deg(0, 0.13 * 57, 0)), // match sample vibe
        mixamorigSpine1: eulerToQuat(...deg(0, 25, 0)),
        mixamorigRightArm: eulerToQuat(...deg(-8, 60, 35)),
        mixamorigRightForeArm: eulerToQuat(...deg(0, 0, 30)),
      }),
      frame(duration * 0.65, {
        mixamorigHips: eulerToQuat(...deg(0, 15, 0)),
        mixamorigSpine1: eulerToQuat(...deg(0, -10, 0)),
        mixamorigRightArm: eulerToQuat(...deg(10, -50, -100)),
        mixamorigRightForeArm: eulerToQuat(...deg(0, 0, -15)),
      }),
    ],
    "sword_slash_r",
  );
}

/** Map NL → preset */
function matchPreset(text, duration) {
  const t = String(text || "").toLowerCase();
  const d = clamp(Number(duration) || 1.2, 0.4, 4);

  if (/\b(wave|hello|hi|greet)\b/.test(t)) return { name: "wave", clip: presetWave(d), reply: `Wave (${d.toFixed(1)}s)` };
  if (/\b(nod|yes|agree)\b/.test(t)) return { name: "nod", clip: presetNod(Math.min(d, 1.2)), reply: "Nod" };
  if (/\b(idle|stand|breathe|rest)\b/.test(t)) return { name: "idle", clip: presetIdle(Math.max(d, 1.5)), reply: "Idle breathe loop" };
  if (/\b(sprint|run|jog)\b/.test(t)) return { name: "run", clip: presetRun(Math.min(d, 1.2)), reply: "Run cycle" };
  if (/\b(walk|stroll|locomotion|go forward|move)\b/.test(t)) return { name: "walk", clip: presetWalk(d), reply: "Walk cycle" };
  if (/\b(slash|attack|strike|punch|hit|swing|melee)\b/.test(t)) return { name: "attack", clip: presetAttack(d), reply: "Attack one-shot" };
  if (/\b(block|defend|guard|shield)\b/.test(t)) return { name: "block", clip: presetBlock(d), reply: "Block guard" };
  if (/\b(dodge|roll|evade|sidestep)\b/.test(t)) return { name: "dodge", clip: presetDodge(Math.min(d, 0.8)), reply: "Dodge" };
  if (/\b(jump|leap|hop)\b/.test(t)) return { name: "jump", clip: presetJump(d), reply: "Jump" };
  if (/\b(cast|spell|magic|bolt|channel)\b/.test(t)) return { name: "cast", clip: presetCast(d), reply: "Cast" };
  if (/\b(spin|twirl|turn around)\b/.test(t)) return { name: "spin", clip: presetSpin(d), reply: "Spin" };
  if (/\b(sit|sit down|chair)\b/.test(t)) return { name: "sit", clip: presetSit(d), reply: "Sit" };
  if (/\b(sword|weapon)\b/.test(t)) return { name: "sword", clip: presetSwordSlash(d), reply: "Sword slash preset" };
  return null;
}

// ── AI path ────────────────────────────────────────────────────
const MODELS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.1-8b-instruct-fp8",
];

async function runAi(env, userText, duration, motion) {
  if (!env.AI) return null;
  const prompt = `Motion type: ${motion || "general"}. Duration target: ${duration}s.
User request: ${userText}

Return JSON only with reply + clip.frames of mixamorig quaternions.`;

  for (const model of MODELS) {
    try {
      const result = await env.AI.run(model, {
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
        max_tokens: 1800,
        temperature: 0.35,
      });
      const text = result?.response || result?.result || "";
      const parsed = extractJson(text);
      if (parsed?.clip?.frames?.length) {
        return {
          reply: parsed.reply || "Generated motion",
          clip: normalizeIncomingClip(parsed.clip),
          model,
        };
      }
      if (parsed?.frames?.length) {
        return {
          reply: parsed.reply || "Generated motion",
          clip: normalizeIncomingClip({ frames: parsed.frames }),
          model,
        };
      }
    } catch (err) {
      console.warn("AI model failed", model, err.message);
    }
  }
  return null;
}

function extractJson(text) {
  if (!text) return null;
  const t = String(text).trim();
  try {
    return JSON.parse(t);
  } catch {}
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {}
  }
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s >= 0 && e > s) {
    try {
      return JSON.parse(t.slice(s, e + 1));
    } catch {}
  }
  return null;
}

function normalizeIncomingClip(clip) {
  const frames = (clip.frames || [])
    .filter((f) => f && typeof f === "object")
    .slice(0, 64)
    .map((f) => {
      const pose = {};
      const src = f.pose || {};
      for (const [k, v] of Object.entries(src)) {
        if (!BONES.includes(k)) continue;
        pose[k] = normalizeQuat(v);
      }
      const out = {
        duration: clamp(Number(f.duration) || 0.15, 0.05, 5),
        pose,
      };
      if (Array.isArray(f.root) && f.root.length === 3) {
        out.root = f.root.map((n) => clamp(Number(n) || 0, -512, 512));
      }
      return out;
    });
  return packClip(frames, clip.name || "ai");
}

// ── Request helpers ────────────────────────────────────────────
function corsHeaders(origin) {
  const allow =
    !origin ||
    /grudge-studio\.com$|grudge\.workers\.dev$|localhost|127\.0\.0\.1/.test(
      origin.replace(/^https?:\/\//, "").split(":")[0],
    ) ||
    origin.includes("grudox") ||
    origin.includes("grudge");
  return {
    "Access-Control-Allow-Origin": allow ? origin || "*" : "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

function extractUserMessage(body) {
  if (!body || typeof body !== "object") return "";
  if (typeof body.message === "string" && body.message.trim()) {
    return body.message.trim();
  }
  if (typeof body.prompt === "string" && body.prompt.trim()) {
    return body.prompt.trim();
  }
  if (Array.isArray(body.messages)) {
    for (let i = body.messages.length - 1; i >= 0; i--) {
      const m = body.messages[i];
      if (m && m.role === "user" && m.content) {
        return String(m.content).trim();
      }
      if (typeof m === "string" && m.trim()) return m.trim();
    }
  }
  return "";
}

async function handleChat(body, env) {
  const text = extractUserMessage(body);
  if (!text) {
    return { error: "Missing message." };
  }
  const duration = clamp(Number(body.duration) || 1.5, 0.4, 4);
  const motion = body.motion || "general";

  // 1) Deterministic presets first (reliable for basic language)
  const preset = matchPreset(text, duration);
  if (preset) {
    return {
      reply: preset.reply,
      action: "preset",
      clip: preset.clip,
      warnings: [],
      kind: "chat",
      source: "deterministic",
    };
  }

  // 2) Weapon keyword path
  if (/\b(sword|axe|dagger|spear|bow)\b/i.test(text)) {
    const clip = presetSwordSlash(duration);
    return {
      reply: "Loaded weapon preset sword_slash_r.",
      action: "weapon",
      clip,
      warnings: [],
      kind: "chat",
      source: "weapon",
    };
  }

  // 3) LLM for free-form
  const ai = await runAi(env, text, duration, motion);
  if (ai) {
    return {
      reply: ai.reply,
      action: "generate",
      clip: ai.clip,
      warnings: [],
      kind: "chat",
      source: "llm",
      model: ai.model,
    };
  }

  // 4) Fallback: idle + explanation
  return {
    reply:
      "Could not reach Workers AI (model/quota). Try: walk, run, wave, attack, dodge, jump, cast, idle, block, sit, spin.",
    action: "fallback",
    clip: presetIdle(2),
    warnings: ["ai_unavailable"],
    kind: "chat",
    source: "fallback",
  };
}

// ── Worker entry ───────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Optional token gate
    if (env.ANIM_WORKER_TOKEN) {
      const auth = request.headers.get("Authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
      if (token !== env.ANIM_WORKER_TOKEN && path !== "/" && path !== "/health") {
        return json({ error: "Unauthorized" }, 401, origin);
      }
    }

    try {
      if (
        (path === "/" || path === "/health") &&
        request.method === "GET"
      ) {
        return json(
          {
            ok: true,
            service: "anim-ai-worker",
            version: VERSION,
            tools: [
              "generate",
              "edit",
              "pose",
              "pose-from-image",
              "ik",
              "weapon",
              "optimize",
              "chat",
              "clips",
            ],
            model: MODELS[0],
            bones: BONES.length,
          },
          200,
          origin,
        );
      }

      if (path === "/tools" && request.method === "GET") {
        return json(
          {
            tools: [
              {
                id: "generate",
                path: "POST /generate",
                desc: "Text → full motion clip",
              },
              {
                id: "chat",
                path: "POST /chat",
                desc: "Multi-turn / SPA Animation Chat (messages|message)",
              },
              { id: "pose", path: "POST /pose", desc: "Text → single pose" },
              {
                id: "weapon",
                path: "POST /weapon",
                desc: "Weapon style preset",
              },
              {
                id: "optimize",
                path: "POST /optimize",
                desc: "Smooth / clamp clip frames",
              },
              { id: "clips", path: "GET /clips", desc: "Clip library stub" },
            ],
          },
          200,
          origin,
        );
      }

      if (path === "/clips" && request.method === "GET") {
        return json(
          {
            clips: [
              "wave",
              "nod",
              "idle",
              "walk",
              "run",
              "attack",
              "block",
              "dodge",
              "jump",
              "cast",
              "spin",
              "sit",
              "sword_slash_r",
            ],
          },
          200,
          origin,
        );
      }

      if (request.method === "POST") {
        let body;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400, origin);
        }

        if (path === "/chat") {
          const result = await handleChat(body, env);
          if (result.error) return json(result, 400, origin);
          return json(result, 200, origin);
        }

        if (path === "/generate" || path === "/pose") {
          const text = extractUserMessage(body) || body.text || "";
          if (!text) return json({ error: "Missing message." }, 400, origin);
          const duration = clamp(Number(body.duration) || 1.5, 0.4, 4);
          const preset = matchPreset(text, duration);
          if (preset) {
            return json(
              {
                reply: preset.reply,
                clip: preset.clip,
                warnings: [],
                kind: path.slice(1),
              },
              200,
              origin,
            );
          }
          const ai = await runAi(env, text, duration, body.motion);
          if (ai) {
            return json(
              { reply: ai.reply, clip: ai.clip, warnings: [], kind: path.slice(1) },
              200,
              origin,
            );
          }
          return json(
            {
              reply: "Fallback idle",
              clip: presetIdle(2),
              warnings: ["ai_unavailable"],
              kind: path.slice(1),
            },
            200,
            origin,
          );
        }

        if (path === "/weapon") {
          const d = clamp(Number(body.duration) || 0.8, 0.4, 2);
          return json(
            {
              reply: "sword_slash_r",
              clip: presetSwordSlash(d),
              warnings: [],
              kind: "weapon",
            },
            200,
            origin,
          );
        }

        if (path === "/optimize") {
          const clip = body.clip || body;
          if (!clip?.frames) {
            return json({ error: "clip.frames required" }, 400, origin);
          }
          return json(
            {
              reply: "Optimized",
              clip: normalizeIncomingClip(clip),
              warnings: [],
              kind: "optimize",
            },
            200,
            origin,
          );
        }

        // Aliases some proxies use
        if (path === "/edit" || path === "/ik" || path === "/pose-from-image") {
          const text = extractUserMessage(body) || "idle";
          const result = await handleChat(
            { message: text, duration: body.duration || 1.2, motion: body.motion },
            env,
          );
          return json(result, result.error ? 400 : 200, origin);
        }
      }

      return json({ error: "Not found", path }, 404, origin);
    } catch (err) {
      console.error(err);
      return json(
        { error: err.message || "Internal error", service: "anim-ai-worker" },
        500,
        origin,
      );
    }
  },
};
