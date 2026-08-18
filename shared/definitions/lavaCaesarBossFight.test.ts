/**
 * Lava Caesar kit SSOT smoke.
 * Run: npx tsx shared/definitions/lavaCaesarBossFight.test.ts
 */
import {
  LAVA_CAESAR_BOSS_FIGHT,
  LAVA_CAESAR_KIT,
  clipNameIncludes,
  isLavaCaesarFight,
  lavaPlatformLocal,
  lavaStunLoopDurationSec,
} from './lavaCaesarBossFight.ts';
import { phaseForHpRatio, pickPipBossAttack } from './pipSkullBossFight.ts';

function assert(c: boolean, m: string) {
  if (!c) throw new Error(m);
}

assert(isLavaCaesarFight(LAVA_CAESAR_BOSS_FIGHT), 'id');
assert(LAVA_CAESAR_KIT.platformCount === 4, '4 platforms');
assert(LAVA_CAESAR_KIT.loadSlots === 4, '4 load slots');
assert(LAVA_CAESAR_KIT.stunDeadToSec === 2.5, 'collapse to 2.5s');
assert(LAVA_CAESAR_KIT.stunLoopMinSec === 2, 'loop back to 2s');
assert(LAVA_CAESAR_KIT.stunLoopMaxSec === 2.5, 'loop out to 2.5s');
assert(LAVA_CAESAR_KIT.stunLoopRepeats === 16, '16 one-way trips');
assert(lavaStunLoopDurationSec() === 8, '16 × 0.5s = 8s stun');
assert(LAVA_CAESAR_KIT.stunHandsLoopSec === 8, '8s hands stun');
assert(LAVA_CAESAR_KIT.gravityScale === 0.5, 'half gravity');
assert(LAVA_CAESAR_KIT.flameMaxStacks >= 3, 'dot stacks');
assert(LAVA_CAESAR_KIT.stunDamageTakenMult >= 2.5, 'extra dmg');
assert(LAVA_CAESAR_KIT.bossHeightM > 4 && LAVA_CAESAR_KIT.bossHeightM < 10, 'SI boss height');

const seen = new Set<number>();
for (let i = 0; i < 4; i++) {
  const p = lavaPlatformLocal(i);
  assert(Math.hypot(p.x, p.z) > 8, `ring ${i}`);
  const bucket = Math.round(p.ang * 10);
  assert(!seen.has(bucket), 'unique angles');
  seen.add(bucket);
}

const p1 = phaseForHpRatio(0.9, LAVA_CAESAR_BOSS_FIGHT);
assert(p1.attacks.includes('lava_dive'), 'phase has dive');
assert(p1.attacks.includes('fire_twister'), 'phase has twister');

const cds = new Map<string, number>();
const atk = pickPipBossAttack(p1, cds, LAVA_CAESAR_BOSS_FIGHT);
assert(!!atk, 'pick lava attack');

assert(clipNameIncludes('Armature|Dead|Base Layer.001', 'dead'), 'dead clip match');
assert(clipNameIncludes('Armature|Spell1|Base Layer.001', 'spell1'), 'spell match');
assert(!clipNameIncludes('Idle', 'dead'), 'no false dead');

const tw = LAVA_CAESAR_BOSS_FIGHT.attacks.fire_twister;
assert(tw.telegraphSec > 0.2 && (tw.knockbackMps ?? 0) > 0, 'twister telegraph+kb');

console.log('lavaCaesarBossFight.test.ts OK', {
  phase: p1.id,
  atk: atk?.id,
  platforms: LAVA_CAESAR_KIT.platformCount,
  stun: LAVA_CAESAR_KIT.stunHandsLoopSec,
});
