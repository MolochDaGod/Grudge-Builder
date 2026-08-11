/**
 * Animator AI — structured ops the chat worker can execute.
 */

import { SEMANTIC_SLOTS, type SemanticSlot } from "./knowledge";

export type AnimOp =
  | { op: "list_clips" }
  | {
      op: "play";
      slot: string;
      fade?: number;
      loop?: boolean;
      timeScale?: number;
    }
  | { op: "stop"; slot?: string; fade?: number }
  | { op: "crossfade"; from: string; to: string; duration?: number }
  | { op: "set_gait"; moving: boolean; sprinting?: boolean }
  | {
      op: "oneshot";
      slot: string;
      fade?: number;
      timeScale?: number;
    }
  | {
      op: "move_root";
      x?: number;
      y?: number;
      z?: number;
      relative?: boolean;
      duration?: number;
    }
  | { op: "face"; yaw: number; degrees?: boolean }
  | {
      op: "create_clip";
      name: string;
      kind: "procedural";
      preset: ProceduralPreset;
      duration?: number;
      play?: boolean;
    }
  | { op: "set_weight"; slot: string; weight: number }
  | { op: "set_timescale"; slot: string; timeScale: number }
  | { op: "pause"; paused: boolean }
  | { op: "reset_pose" }
  | { op: "explain"; topic: "mixer" | "human" | "rigid" | "grudge" | string };

export type ProceduralPreset =
  | "wave"
  | "nod"
  | "bounce"
  | "spin"
  | "breathe"
  | "look_left"
  | "look_right";

export interface AnimPlan {
  reply: string;
  confidence: number;
  ops: AnimOp[];
  source?: "local" | "llm" | "hybrid";
}

const OP_NAMES = new Set([
  "list_clips",
  "play",
  "stop",
  "crossfade",
  "set_gait",
  "oneshot",
  "move_root",
  "face",
  "create_clip",
  "set_weight",
  "set_timescale",
  "pause",
  "reset_pose",
  "explain",
]);

export function isSemanticSlot(s: string): s is SemanticSlot {
  return (SEMANTIC_SLOTS as readonly string[]).includes(s);
}

/** Clamp + sanitize a plan from LLM or local compiler */
export function validatePlan(raw: unknown): AnimPlan {
  if (!raw || typeof raw !== "object") {
    return {
      reply: "Could not parse plan.",
      confidence: 0,
      ops: [],
      source: "local",
    };
  }
  const o = raw as Record<string, unknown>;
  const reply = String(o.reply ?? o.message ?? "OK");
  let confidence = Number(o.confidence);
  if (!Number.isFinite(confidence)) confidence = 0.5;
  confidence = Math.max(0, Math.min(1, confidence));

  const opsIn = Array.isArray(o.ops) ? o.ops : [];
  const ops: AnimOp[] = [];
  for (const item of opsIn.slice(0, 8)) {
    const op = normalizeOp(item);
    if (op) ops.push(op);
  }

  return { reply, confidence, ops, source: (o.source as AnimPlan["source"]) || "llm" };
}

function normalizeOp(item: unknown): AnimOp | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const op = String(o.op || o.type || "").toLowerCase();
  if (!OP_NAMES.has(op)) return null;

  switch (op) {
    case "list_clips":
      return { op: "list_clips" };
    case "play":
      return {
        op: "play",
        slot: String(o.slot || o.clip || "idle"),
        fade: num(o.fade, 0.25),
        loop: o.loop !== false,
        timeScale: num(o.timeScale, 1),
      };
    case "stop":
      return {
        op: "stop",
        slot: o.slot != null ? String(o.slot) : undefined,
        fade: num(o.fade, 0.2),
      };
    case "crossfade":
      return {
        op: "crossfade",
        from: String(o.from || "idle"),
        to: String(o.to || "walk"),
        duration: num(o.duration, 0.35),
      };
    case "set_gait":
      return {
        op: "set_gait",
        moving: Boolean(o.moving ?? o.move ?? true),
        sprinting: Boolean(o.sprinting ?? o.sprint ?? false),
      };
    case "oneshot":
      return {
        op: "oneshot",
        slot: String(o.slot || o.clip || "attack"),
        fade: num(o.fade, 0.15),
        timeScale: num(o.timeScale, 1),
      };
    case "move_root":
      return {
        op: "move_root",
        x: num(o.x, 0),
        y: num(o.y, 0),
        z: num(o.z, 0),
        relative: o.relative !== false,
        duration: num(o.duration, 0.4),
      };
    case "face":
      return {
        op: "face",
        yaw: num(o.yaw ?? o.y, 0),
        degrees: o.degrees !== false,
      };
    case "create_clip":
      return {
        op: "create_clip",
        name: String(o.name || "procedural"),
        kind: "procedural",
        preset: normalizePreset(String(o.preset || "breathe")),
        duration: num(o.duration, 1.2),
        play: o.play !== false,
      };
    case "set_weight":
      return {
        op: "set_weight",
        slot: String(o.slot || "idle"),
        weight: Math.max(0, Math.min(1, num(o.weight, 1))),
      };
    case "set_timescale":
      return {
        op: "set_timescale",
        slot: String(o.slot || "idle"),
        timeScale: num(o.timeScale, 1),
      };
    case "pause":
      return { op: "pause", paused: Boolean(o.paused ?? true) };
    case "reset_pose":
      return { op: "reset_pose" };
    case "explain":
      return { op: "explain", topic: String(o.topic || "mixer") };
    default:
      return null;
  }
}

function num(v: unknown, d: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function normalizePreset(p: string): ProceduralPreset {
  const allowed: ProceduralPreset[] = [
    "wave",
    "nod",
    "bounce",
    "spin",
    "breathe",
    "look_left",
    "look_right",
  ];
  const lower = p.toLowerCase().replace(/\s+/g, "_");
  return (allowed.find((a) => a === lower) || "breathe") as ProceduralPreset;
}

/** Extract JSON object from LLM text (tolerates markdown fences) */
export function extractJsonPlan(text: string): AnimPlan | null {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  try {
    return validatePlan(JSON.parse(trimmed));
  } catch {
    /* continue */
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return validatePlan(JSON.parse(fence[1].trim()));
    } catch {
      /* continue */
    }
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return validatePlan(JSON.parse(trimmed.slice(start, end + 1)));
    } catch {
      return null;
    }
  }
  return null;
}
