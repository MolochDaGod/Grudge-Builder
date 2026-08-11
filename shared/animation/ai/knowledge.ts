/**
 * Animator AI — system of understanding
 *
 * Structured knowledge the chat worker injects into prompts and uses for
 * deterministic NL → animation plans. Covers human motion, rigid-body roots,
 * Three.js AnimationMixer, and Grudge runtime rules.
 */

export const ANIMATOR_KNOWLEDGE_VERSION = "1.0.0";

/** Semantic clip slots shared across TVS voxel + grudge6 packs */
export const SEMANTIC_SLOTS = [
  "idle",
  "locomotion",
  "walk",
  "run",
  "sprint",
  "attack",
  "defend",
  "block",
  "dodge",
  "cast",
  "jump",
  "sit",
  "emote",
  "death",
  "hit",
  "special",
] as const;

export type SemanticSlot = (typeof SEMANTIC_SLOTS)[number];

/** Natural-language aliases → semantic slot */
export const NL_SLOT_ALIASES: Record<string, SemanticSlot> = {
  idle: "idle",
  stand: "idle",
  standing: "idle",
  breathe: "idle",
  rest: "idle",
  walk: "walk",
  walking: "walk",
  stroll: "walk",
  run: "run",
  running: "run",
  jog: "run",
  sprint: "sprint",
  dash: "sprint",
  move: "locomotion",
  locomotion: "locomotion",
  go: "locomotion",
  attack: "attack",
  slash: "attack",
  strike: "attack",
  hit: "attack",
  punch: "attack",
  swing: "attack",
  melee: "attack",
  defend: "defend",
  block: "block",
  guard: "block",
  shield: "block",
  dodge: "dodge",
  roll: "dodge",
  evade: "dodge",
  cast: "cast",
  spell: "cast",
  magic: "cast",
  shoot: "cast",
  jump: "jump",
  leap: "jump",
  sit: "sit",
  sitting: "sit",
  emote: "emote",
  wave: "emote",
  dance: "emote",
  pray: "emote",
  death: "death",
  die: "death",
  fall: "death",
  hurt: "hit",
  flinch: "hit",
  special: "special",
  ultimate: "special",
  skill: "special",
};

export const HUMAN_MOTION_FACTS = [
  "Humanoid locomotion is root-driven on XZ; feet plant relative to the pelvis (hips), not the world origin.",
  "Idle is a small breathing loop (spine/chest/shoulders), not a frozen bind/T-pose.",
  "Walk/run differ by gait frequency, stride length, and arm swing amplitude — blend by speed, never hard-cut.",
  "Attacks are one-shots: windup → active (hit frames) → recovery, then return to locomotion.",
  "Upper-body overlays (aim, cast, block) can layer on locomotion; full-body one-shots should mute loco weight.",
  "Hip (Bip001 / Hips / mixamorigHips) is the animation root for skeletal clips; moving only the mesh root without feet re-plant causes sliding.",
  "Hand IK / weapon attach bones (RightHand, LeftHand, weapon_r) follow the skeleton — never reparent the skinned mesh itself.",
  "Look-at and aim are often additive (head/spine) on top of a base locomotion clip.",
] as const;

export const RIGID_BODY_FACTS = [
  "Rigid-body root motion: transform.position/quaternion on the scene Object3D is gameplay/physics; bone tracks are visual.",
  "Do not write bone position tracks onto differently scaled rigs — prefer rotation-only clips (Grudge baked Bip001 JSON).",
  "Physics character controllers own root translation each frame; AnimationMixer should not also apply root translation tracks unless root-motion is intentional.",
  "When moving a character in world space, set gait (walk/run) from velocity magnitude, then plant facing with yaw.",
  "Colliders (capsule/box) are authoring data separate from clips — TVS uses .collider.json sidecars.",
  "Voxel rigid units still use skeletal or rigid keyframe packs mapped by semantic slots (idle/attack/locomotion).",
] as const;

export const MIXER_BEST_PRACTICES = [
  "One AnimationMixer per character instance, bound to that instance's anim root — never share a mixer across clones.",
  "Clone skinned meshes with SkeletonUtils.clone (or equivalent); Object3D.clone leaves bones on the source → T-pose.",
  "Always call mixer.update(delta) every frame while the character is visible; pause when culled/off-screen.",
  "Use AnimationAction: play/stop/reset, fadeIn/fadeOut, crossFadeTo, setEffectiveWeight, loop modes (LoopRepeat/LoopOnce).",
  "Locomotion: keep idle/walk/run(/sprint) actions alive and blend weights by a damped gait scalar — avoid thrashing crossFade every frame.",
  "One-shots: LoopOnce + clampWhenFinished, fade loco down by overlay influence so weights never sum past 1 (or use exclusive overlay channel).",
  "Share AnimationClip objects across instances when skeletons match; never share the mixer.",
  "Call clip.optimize() after load; strip unused position tracks for retarget-safe packs.",
  "Dispose: stop actions, mixer.uncacheRoot / remove listeners, dispose geometries/materials on unmount.",
  "Property paths must match bone names (e.g. 'mixamorigHips.quaternion' or 'Bip001.quaternion').",
] as const;

export const GRUDGE_RUNTIME_RULES = [
  "Grudge-6 races: Bip001 rotation-only baked JSON under /anims/baked/{pack}/ — AnimationDirector owns gait + one-shot overlay.",
  "Gameplay keys first (ANIM_LIBRARY keys, semantic slots) — never bind AI/UI to raw FBX filenames.",
  "TVS voxel packs: semantic slots on animation-library.json; classHint drives default brain + anim set.",
  "Empty AnimationClip is forbidden — empty clips freeze bind pose forever.",
  "Director API: setGaitTarget(moving, sprinting), playOneShot/requestOneShot, playLoop/clearOverlay, update(dt), dispose().",
  "Move language (moveLanguage.ts) authors combat moves as phases + beats; body maps to a PlaybackSlot.",
] as const;

/** Compact system prompt block for the animator agent */
export function buildAnimatorSystemPrompt(): string {
  return `You are the Grudge Animator AI Worker for https://grudox.grudge-studio.com/animator/ and Grudge Three.js runtimes.

MISSION: Turn plain human language into animation plans the client can execute on THREE.AnimationMixer / AnimationDirector.

KNOWLEDGE VERSION: ${ANIMATOR_KNOWLEDGE_VERSION}

## Human motion
${HUMAN_MOTION_FACTS.map((f) => `- ${f}`).join("\n")}

## Rigid body / root
${RIGID_BODY_FACTS.map((f) => `- ${f}`).join("\n")}

## Three.js AnimationMixer best practices
${MIXER_BEST_PRACTICES.map((f) => `- ${f}`).join("\n")}

## Grudge runtime
${GRUDGE_RUNTIME_RULES.map((f) => `- ${f}`).join("\n")}

## Semantic slots
${SEMANTIC_SLOTS.join(", ")}

## Output format (STRICT)
Reply with ONLY valid JSON (no markdown fences):
{
  "reply": "short human summary",
  "confidence": 0.0-1.0,
  "ops": [ /* ordered operations */ ]
}

## Allowed ops
- { "op": "list_clips" }
- { "op": "play", "slot": "<semantic>", "fade": 0.25, "loop": true|false, "timeScale": 1 }
- { "op": "stop", "slot": "<semantic>"? , "fade": 0.2 }
- { "op": "crossfade", "from": "<semantic>", "to": "<semantic>", "duration": 0.35 }
- { "op": "set_gait", "moving": true|false, "sprinting": true|false }
- { "op": "oneshot", "slot": "<semantic>", "fade": 0.15, "timeScale": 1 }
- { "op": "move_root", "x": 0, "y": 0, "z": 0, "relative": true, "duration": 0.5 }
- { "op": "face", "yaw": 0, "degrees": true }
- { "op": "create_clip", "name": "wave", "kind": "procedural", "preset": "wave|nod|bounce|spin|breathe", "duration": 1.2 }
- { "op": "set_weight", "slot": "<semantic>", "weight": 0-1 }
- { "op": "set_timescale", "slot": "<semantic>", "timeScale": 1 }
- { "op": "pause", "paused": true|false }
- { "op": "reset_pose" }
- { "op": "explain", "topic": "mixer|human|rigid|grudge" }

Rules:
1. Prefer semantic slots over raw clip names.
2. Movement verbs (walk/run/go) → set_gait + play locomotion; attacks → oneshot.
3. Never invent bone paths the host did not advertise.
4. If ambiguous, emit explain + list_clips and ask one short question in reply.
5. Keep ops ≤ 8 per turn.`;
}

/** Embeddable knowledge blob for client-side offline help */
export function getKnowledgePack() {
  return {
    version: ANIMATOR_KNOWLEDGE_VERSION,
    semanticSlots: [...SEMANTIC_SLOTS],
    aliases: { ...NL_SLOT_ALIASES },
    humanMotion: [...HUMAN_MOTION_FACTS],
    rigidBody: [...RIGID_BODY_FACTS],
    mixerBestPractices: [...MIXER_BEST_PRACTICES],
    grudgeRuntime: [...GRUDGE_RUNTIME_RULES],
    systemPrompt: buildAnimatorSystemPrompt(),
  };
}
