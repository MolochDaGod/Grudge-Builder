/**
 * Smoke: npx tsx shared/animation/mocap/reconstruct.test.ts
 */
import { reconstructMotionLocal, buildDeployManifest, motionToTrackDump } from "./reconstruct";
import { sanitizeMotionFrames } from "./rigidBodyGuard";
import { comboById, resolveComboStep } from "./comboDefs";

function assert(c: boolean, m: string) {
  if (!c) throw new Error(m);
}

const motion = reconstructMotionLocal({
  brief: {
    kind: "screen_recording",
    description: "Two hit sword combo slash then heavy finisher",
    durationSec: 4,
    intent: "combo",
  },
  target: { skeleton: "mixamorig", slot: "attack", fleetClipKey: "test_combo" },
  allowTemplateFallback: true,
});

assert(motion.frames.length >= 8, "frames");
assert(motion.validation.ok, "validation ok");
assert(motion.workerClip.frames.length > 0, "worker clip");
assert(motion.durationSec <= 10.5, "duration cap");

const dump = motionToTrackDump(motion);
assert(dump.tracks.length > 0, "tracks");
assert(dump.tracks[0].name.includes("quaternion"), "quat tracks only");

const man = buildDeployManifest(motion, { pack: "mocap" });
assert(man.status === "validated", "manifest validated");
assert(man.bakedRel?.includes("test_combo"), "bake path");

const combo = comboById("melee_3hit_standard")!;
const r = resolveComboStep(combo, 0, 0.5, true);
assert(r.nextIndex === 1 || r.finished || r.step.id === "melee_a", "combo step");

// position track rejection
const bad = sanitizeMotionFrames(
  [
    {
      t: 0,
      pose: {
        mixamorigHips: [0, 0, 0, 1],
        // @ts-expect-error intentional bad
        mixamorigSpine: [0, 1, 0],
      } as any,
    },
  ],
  "mixamorig",
);
assert(bad.result.warnings.some((w) => w.includes("position") || w.includes("Invalid") || w.includes("Dropped")), "guard warns");

console.log("mocap reconstruct smoke OK", {
  frames: motion.frames.length,
  conf: motion.confidence,
  reply: motion.reply,
});
