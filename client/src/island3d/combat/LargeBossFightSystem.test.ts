/**
 * PIP boss phase / attack pick smoke tests.
 * Run: npx tsx client/src/island3d/combat/LargeBossFightSystem.test.ts
 */
import {
  PIP_SKULL_BOSS_FIGHT,
  phaseForHpRatio,
  pickPipBossAttack,
  pipBossHeightM,
  inShockwaveBand,
} from '../../../../shared/definitions/pipSkullBossFight.ts';
import {
  LAVA_CAESAR_BOSS_FIGHT,
  isLavaCaesarFight,
} from '../../../../shared/definitions/lavaCaesarBossFight.ts';

function assert(c: boolean, m: string) {
  if (!c) throw new Error(m);
}

const pFull = phaseForHpRatio(1);
assert(pFull.id === 'intro' || pFull.hpThreshold >= 0.99, 'full hp phase');

const p2 = phaseForHpRatio(0.55);
assert(p2.id === 'phase2' || p2.name.includes('Meteor'), `phase2 got ${p2.id}`);

const p3 = phaseForHpRatio(0.2);
assert(p3.cinemaIntensity >= 0.9, 'late phase intense');

const dead = phaseForHpRatio(0);
assert(dead.id === 'dead', 'dead');

const cds = new Map<string, number>();
const atk = pickPipBossAttack(p2, cds);
assert(!!atk && atk.telegraphSec > 0, 'pick attack');

// Cooldown blocks
if (atk) cds.set(atk.id, 99);
const atk2 = pickPipBossAttack(p2, cds);
assert(!atk2 || atk2.id !== atk!.id || p2.attacks.length === 1, 'cd respected or only one atk');

const h = pipBossHeightM();
assert(h > 10 && h < 40, `colossus height ${h}`);

assert(inShockwaveBand(8, 8, 1.5), 'in band');
assert(!inShockwaveBand(1, 8, 1.5, 2), 'inner safe');

assert(PIP_SKULL_BOSS_FIGHT.hostKinds.includes('boss_arena'), 'arena host');
assert(PIP_SKULL_BOSS_FIGHT.hostKinds.includes('boss_room'), 'room host');

// Every damaging attack must define physical feedback
for (const a of Object.values(PIP_SKULL_BOSS_FIGHT.attacks)) {
  if (a.damage <= 0) continue;
  assert(
    (a.knockbackMps ?? 0) > 0 || (a.stunSec ?? 0) > 0,
    `${a.id} needs knockback or stun`,
  );
  assert(a.telegraphSec > 0.2, `${a.id} needs telegraph warning`);
}
const slam = PIP_SKULL_BOSS_FIGHT.attacks.ground_slam;
assert(slam.knockdown && (slam.knockUpMps ?? 0) >= 4, 'slam launches');
const zap = PIP_SKULL_BOSS_FIGHT.attacks.electric_shock;
assert((zap.stunSec ?? 0) >= 1, 'electric stuns hard');

assert(isLavaCaesarFight(LAVA_CAESAR_BOSS_FIGHT), 'lava cfg id');
assert(LAVA_CAESAR_BOSS_FIGHT.attacks.fire_twister.vfx === 'fire_twister', 'twister vfx');
assert((LAVA_CAESAR_BOSS_FIGHT.attacks.lava_dive.weight ?? 0) > 0, 'dive pickable');

console.log('LargeBossFightSystem.test.ts OK', {
  p2: p2.id,
  atk: atk?.id,
  heightM: h.toFixed(1),
  slamKb: slam.knockbackMps,
  zapStun: zap.stunSec,
});
