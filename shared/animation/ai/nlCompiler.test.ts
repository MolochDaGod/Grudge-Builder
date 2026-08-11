/**
 * Lightweight smoke tests — run with:
 *   npx tsx shared/animation/ai/nlCompiler.test.ts
 */
import { compileNaturalLanguage, explainTopic } from "./nlCompiler";
import { validatePlan, extractJsonPlan } from "./intentSchema";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function testCompile() {
  const walk = compileNaturalLanguage("walk");
  assert(walk.ops.some((o) => o.op === "set_gait" || o.op === "play"), "walk needs gait/play");
  assert(walk.confidence >= 0.5, "walk confidence");

  const attack = compileNaturalLanguage("attack");
  assert(attack.ops.some((o) => o.op === "oneshot"), "attack oneshot");

  const move = compileNaturalLanguage("move forward 2");
  assert(move.ops.some((o) => o.op === "move_root"), "move_root");

  const wave = compileNaturalLanguage("wave");
  assert(wave.ops.some((o) => o.op === "create_clip"), "wave procedural");

  const explain = compileNaturalLanguage("explain mixer");
  assert(explain.ops.some((o) => o.op === "explain"), "explain");
  assert(explainTopic("mixer").includes("AnimationMixer"), "explain text");

  const empty = compileNaturalLanguage("");
  assert(empty.ops.length === 0, "empty ops");

  console.log("nlCompiler tests OK");
}

function testSchema() {
  const plan = validatePlan({
    reply: "ok",
    confidence: 1.5,
    ops: [
      { op: "play", slot: "walk" },
      { op: "bogus" },
      { op: "oneshot", slot: "attack" },
    ],
  });
  assert(plan.confidence === 1, "clamp confidence");
  assert(plan.ops.length === 2, "filter bogus ops");

  const extracted = extractJsonPlan(
    'Here you go:\n```json\n{"reply":"hi","confidence":0.9,"ops":[{"op":"list_clips"}]}\n```',
  );
  assert(!!extracted && extracted.ops[0].op === "list_clips", "extract fenced json");

  console.log("intentSchema tests OK");
}

testCompile();
testSchema();
console.log("all animation ai smoke tests passed");
