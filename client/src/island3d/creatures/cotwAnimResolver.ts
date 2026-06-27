/**
 * cotwAnimResolver — map Call of the Wild GLB clip names to creature anim states.
 */
import type { CreatureAnimMap } from './CreatureManifest';

export type AnimPatternMap = Partial<Record<keyof CreatureAnimMap, RegExp>>;

const DEFAULT_PATTERNS: AnimPatternMap = {
  idle: /idle_pose(?!.*to_)|idle_static|idle_rest_pose|idle_eat_pose_01(?!.*to_)/i,
  walk: /walk_fwd_01(?!.*alerted|.*injured|.*to_)/i,
  run: /run_fwd_01(?!.*injured|.*to_)|canter_fwd_01(?!.*to_)|trot_fwd_01(?!.*alerted|.*injured|.*to_)/i,
  attack: /attack/i,
  eat: /idle_eat|eat_graz|drinking|grazing/i,
  death: /dead_reaction|dead_trot|dead_run|dead_gallop/i,
  hitReact: /hit_chest|hit_hip|hit_reaction/i,
};

export function resolveCotwAnimations(
  clipNames: string[],
  patterns: AnimPatternMap = {},
): CreatureAnimMap {
  const merged = { ...DEFAULT_PATTERNS, ...patterns };
  const result: CreatureAnimMap = {
    idle: clipNames[0] ?? 'idle',
    death: clipNames[0] ?? 'death',
  };

  for (const [state, pattern] of Object.entries(merged) as Array<[keyof CreatureAnimMap, RegExp]>) {
    const match = clipNames.find((name) => pattern.test(name));
    if (match) result[state] = match;
  }

  if (!result.walk) result.walk = result.idle;
  if (!result.run) result.run = result.walk;
  return result;
}