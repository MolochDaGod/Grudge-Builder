/**
 * Deterministic natural-language → AnimPlan compiler.
 * Handles basic language without an LLM; confidence drops when ambiguous.
 */

import {
  HUMAN_MOTION_FACTS,
  MIXER_BEST_PRACTICES,
  NL_SLOT_ALIASES,
  RIGID_BODY_FACTS,
  GRUDGE_RUNTIME_RULES,
  type SemanticSlot,
} from "./knowledge";
import type { AnimOp, AnimPlan, ProceduralPreset } from "./intentSchema";

const ONESHOT_SLOTS = new Set<SemanticSlot>([
  "attack",
  "dodge",
  "jump",
  "cast",
  "special",
  "hit",
  "death",
  "emote",
]);

const GAIT_SLOTS = new Set<SemanticSlot>([
  "walk",
  "run",
  "sprint",
  "locomotion",
]);

export interface CompileOptions {
  /** Known clip names / semantic ids on the current host */
  availableSlots?: string[];
}

/**
 * Compile plain English (and simple multi-intent sentences) into ops.
 */
export function compileNaturalLanguage(
  input: string,
  opts: CompileOptions = {},
): AnimPlan {
  const text = (input || "").trim();
  if (!text) {
    return {
      reply: "Say something like: walk, attack, wave, move forward 2 meters, or explain mixer.",
      confidence: 1,
      ops: [],
      source: "local",
    };
  }

  const lower = text.toLowerCase();
  const ops: AnimOp[] = [];
  let confidence = 0.85;
  const notes: string[] = [];

  // Help / explain
  if (/\b(help|how|what|explain|teach|best practice)/i.test(lower)) {
    let topic: string = "mixer";
    if (/\b(human|motion|walk|gait|body)\b/.test(lower)) topic = "human";
    else if (/\b(rigid|physics|root|collider)\b/.test(lower)) topic = "rigid";
    else if (/\b(grudge|bip001|director|bake)\b/.test(lower)) topic = "grudge";
    else if (/\b(mixer|three|clip|action|blend)\b/.test(lower)) topic = "mixer";
    ops.push({ op: "explain", topic });
    notes.push(`Explaining ${topic}`);
  }

  if (/\b(list|show|available)\b.*\b(clip|anim|animation)/i.test(lower) || lower === "list" || lower === "clips") {
    ops.push({ op: "list_clips" });
    notes.push("Listing clips");
  }

  if (/\b(stop|halt|freeze|cancel)\b/.test(lower) && !/\b(stop and)\b/.test(lower)) {
    if (/\b(all|everything)\b/.test(lower)) {
      ops.push({ op: "stop", fade: 0.2 });
      ops.push({ op: "set_gait", moving: false, sprinting: false });
    } else {
      const slot = findSlot(lower);
      ops.push({ op: "stop", slot: slot || undefined, fade: 0.2 });
    }
    notes.push("Stopping");
  }

  if (/\b(pause)\b/.test(lower)) {
    ops.push({ op: "pause", paused: true });
    notes.push("Paused");
  }
  if (/\b(resume|unpause|continue)\b/.test(lower)) {
    ops.push({ op: "pause", paused: false });
    notes.push("Resumed");
  }

  if (/\b(reset|t-?pose|bind pose|default pose)\b/.test(lower)) {
    ops.push({ op: "reset_pose" });
    notes.push("Reset pose");
  }

  // Create procedural clip
  const createMatch = lower.match(
    /\b(create|make|generate)\b.*\b(wave|nod|bounce|spin|breathe|look left|look right)\b/,
  );
  if (createMatch || /\b(wave|nod|bounce|spin)\b/.test(lower) && /\b(create|make|procedural)\b/.test(lower)) {
    const preset = detectPreset(lower);
    const name = preset;
    ops.push({
      op: "create_clip",
      name,
      kind: "procedural",
      preset,
      duration: 1.2,
      play: true,
    });
    notes.push(`Create procedural ${preset}`);
  } else if (/^\s*(wave|nod|bounce|spin)\s*$/i.test(text)) {
    const preset = detectPreset(lower);
    ops.push({
      op: "create_clip",
      name: preset,
      kind: "procedural",
      preset,
      duration: 1.0,
      play: true,
    });
    notes.push(`Play procedural ${preset}`);
  }

  // Move root: "move forward 2", "go left 3m", "move to 1 0 2"
  const moveTo = lower.match(
    /\b(?:move|go|walk)\s+(?:to\s+)?(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/,
  );
  if (moveTo) {
    ops.push({
      op: "move_root",
      x: Number(moveTo[1]),
      y: Number(moveTo[2]),
      z: Number(moveTo[3]),
      relative: false,
      duration: 0.6,
    });
    ops.push({ op: "set_gait", moving: true, sprinting: false });
    notes.push("Move to world position");
  } else {
    const dirMove = parseDirectionalMove(lower);
    if (dirMove) {
      ops.push({
        op: "move_root",
        ...dirMove,
        relative: true,
        duration: 0.5,
      });
      const sprint = /\b(sprint|dash|run)\b/.test(lower);
      ops.push({ op: "set_gait", moving: true, sprinting: sprint });
      const slot: SemanticSlot = sprint ? "sprint" : /\brun\b/.test(lower) ? "run" : "walk";
      ops.push({ op: "play", slot, loop: true, fade: 0.2 });
      notes.push(`Move ${JSON.stringify(dirMove)}`);
    }
  }

  // Face / turn
  const faceDeg = lower.match(/\b(?:face|turn|look)\s+(-?\d+(?:\.\d+)?)\s*(deg|degrees?)?\b/);
  if (faceDeg) {
    ops.push({ op: "face", yaw: Number(faceDeg[1]), degrees: true });
    notes.push(`Face ${faceDeg[1]}°`);
  } else if (/\bturn left\b/.test(lower)) {
    ops.push({ op: "face", yaw: 90, degrees: true });
    notes.push("Turn left");
  } else if (/\bturn right\b/.test(lower)) {
    ops.push({ op: "face", yaw: -90, degrees: true });
    notes.push("Turn right");
  } else if (/\bturn around\b/.test(lower)) {
    ops.push({ op: "face", yaw: 180, degrees: true });
    notes.push("Turn around");
  }

  // Gait / play / oneshot from keywords
  if (/\b(stop moving|stand still|hold still)\b/.test(lower)) {
    ops.push({ op: "set_gait", moving: false, sprinting: false });
    ops.push({ op: "play", slot: "idle", loop: true, fade: 0.25 });
    notes.push("Stand still");
  }

  const slot = findSlot(lower);
  if (slot && !ops.some((o) => o.op === "play" || o.op === "oneshot" || o.op === "create_clip")) {
    if (GAIT_SLOTS.has(slot)) {
      const sprinting = slot === "sprint";
      ops.push({ op: "set_gait", moving: true, sprinting });
      ops.push({
        op: "play",
        slot: slot === "locomotion" ? "walk" : slot,
        loop: true,
        fade: 0.25,
      });
      notes.push(`Gait ${slot}`);
    } else if (ONESHOT_SLOTS.has(slot)) {
      ops.push({ op: "oneshot", slot, fade: 0.15 });
      notes.push(`One-shot ${slot}`);
    } else if (slot === "idle") {
      ops.push({ op: "set_gait", moving: false, sprinting: false });
      ops.push({ op: "play", slot: "idle", loop: true, fade: 0.3 });
      notes.push("Idle");
    } else {
      ops.push({
        op: "play",
        slot,
        loop: !ONESHOT_SLOTS.has(slot),
        fade: 0.25,
      });
      notes.push(`Play ${slot}`);
    }
  }

  // Crossfade explicit: "blend from idle to walk"
  const xf = lower.match(
    /\b(?:crossfade|blend|transition)\s+(?:from\s+)?(\w+)\s+(?:to\s+)?(\w+)/,
  );
  if (xf) {
    const from = resolveAlias(xf[1]) || xf[1];
    const to = resolveAlias(xf[2]) || xf[2];
    ops.push({ op: "crossfade", from, to, duration: 0.35 });
    notes.push(`Crossfade ${from}→${to}`);
  }

  // Speed: "play faster" / "slow motion"
  if (/\b(faster|speed up|2x)\b/.test(lower) && slot) {
    ops.push({ op: "set_timescale", slot, timeScale: 1.5 });
  }
  if (/\b(slower|slow motion|0\.5x)\b/.test(lower) && slot) {
    ops.push({ op: "set_timescale", slot, timeScale: 0.5 });
  }

  // Validate against available slots when provided
  if (opts.availableSlots?.length) {
    const avail = new Set(opts.availableSlots.map((s) => s.toLowerCase()));
    for (const op of ops) {
      if ("slot" in op && op.slot && !avail.has(String(op.slot).toLowerCase())) {
        // keep semantic — host maps aliases
        confidence = Math.min(confidence, 0.7);
      }
    }
  }

  if (ops.length === 0) {
    confidence = 0.25;
    return {
      reply:
        "I understood that as free-form text. Try: walk, run, attack, dodge, idle, wave, move forward 2, turn left, list clips, or explain mixer.",
      confidence,
      ops: [{ op: "list_clips" }],
      source: "local",
    };
  }

  // Deduplicate consecutive identical ops
  const deduped = dedupeOps(ops);

  return {
    reply: notes.length ? notes.join(" · ") : "Done.",
    confidence,
    ops: deduped,
    source: "local",
  };
}

function findSlot(lower: string): SemanticSlot | null {
  // Longer phrases first
  const keys = Object.keys(NL_SLOT_ALIASES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const re = new RegExp(`\\b${escapeRe(key)}\\b`, "i");
    if (re.test(lower)) return NL_SLOT_ALIASES[key];
  }
  return null;
}

function resolveAlias(word: string): string | null {
  return NL_SLOT_ALIASES[word.toLowerCase()] || null;
}

function detectPreset(lower: string): ProceduralPreset {
  if (/\blook left\b/.test(lower)) return "look_left";
  if (/\blook right\b/.test(lower)) return "look_right";
  if (/\bwave\b/.test(lower)) return "wave";
  if (/\bnod\b/.test(lower)) return "nod";
  if (/\bbounce\b/.test(lower)) return "bounce";
  if (/\bspin\b/.test(lower)) return "spin";
  return "breathe";
}

function parseDirectionalMove(
  lower: string,
): { x: number; y: number; z: number } | null {
  const amountMatch = lower.match(
    /(-?\d+(?:\.\d+)?)\s*(m|meters?|units?)?/,
  );
  const amount = amountMatch ? Number(amountMatch[1]) : 1;
  if (/\bforward\b|\bahead\b/.test(lower)) return { x: 0, y: 0, z: amount };
  if (/\bback(ward)?\b|\bbehind\b/.test(lower)) return { x: 0, y: 0, z: -amount };
  if (/\bleft\b/.test(lower) && !/\bturn left\b/.test(lower))
    return { x: -amount, y: 0, z: 0 };
  if (/\bright\b/.test(lower) && !/\bturn right\b/.test(lower))
    return { x: amount, y: 0, z: 0 };
  if (/\bup\b/.test(lower)) return { x: 0, y: amount, z: 0 };
  if (/\bdown\b/.test(lower)) return { x: 0, y: -amount, z: 0 };
  return null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dedupeOps(ops: AnimOp[]): AnimOp[] {
  const out: AnimOp[] = [];
  let prev = "";
  for (const op of ops) {
    const key = JSON.stringify(op);
    if (key === prev) continue;
    out.push(op);
    prev = key;
  }
  return out.slice(0, 8);
}

/** Expand explain ops into text (for offline worker) */
export function explainTopic(topic: string): string {
  const t = topic.toLowerCase();
  if (t === "human" || t === "motion") {
    return ["Human motion:", ...HUMAN_MOTION_FACTS.map((f) => `• ${f}`)].join("\n");
  }
  if (t === "rigid" || t === "physics") {
    return ["Rigid body / root:", ...RIGID_BODY_FACTS.map((f) => `• ${f}`)].join("\n");
  }
  if (t === "grudge") {
    return ["Grudge runtime:", ...GRUDGE_RUNTIME_RULES.map((f) => `• ${f}`)].join("\n");
  }
  return ["Three.js AnimationMixer:", ...MIXER_BEST_PRACTICES.map((f) => `• ${f}`)].join(
    "\n",
  );
}
