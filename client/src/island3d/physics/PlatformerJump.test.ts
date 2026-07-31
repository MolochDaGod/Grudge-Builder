/**
 * Smoke test: random-boxes hold-to-jump integrates upward while Space held.
 * Run: npx tsx client/src/island3d/physics/PlatformerJump.test.ts
 */
import {
  AIRSHIP_DECK_JUMP,
  createJumpState,
  stepPlatformerJump,
} from './PlatformerJump.ts';

function assert(c: boolean, m: string) {
  if (!c) throw new Error(m);
}

// Short hop: press and release immediately
let st = createJumpState();
let y = 0;
// frame 1: press on ground
let r = stepPlatformerJump({
  dt: 1 / 60,
  y,
  groundY: 0,
  jumpHeld: true,
  jumpPressed: true,
  config: AIRSHIP_DECK_JUMP,
  state: st,
});
st = r.state;
y = r.y;
assert(r.movement === 'jumping' || st.velocityY > 0, 'takeoff vy');

// release quickly
for (let i = 0; i < 30; i++) {
  r = stepPlatformerJump({
    dt: 1 / 60,
    y,
    groundY: 0,
    jumpHeld: false,
    jumpPressed: false,
    config: AIRSHIP_DECK_JUMP,
    state: st,
  });
  st = r.state;
  y = r.y;
}
const shortPeak = y;

// Full hold hop
st = createJumpState();
y = 0;
r = stepPlatformerJump({
  dt: 1 / 60,
  y,
  groundY: 0,
  jumpHeld: true,
  jumpPressed: true,
  config: AIRSHIP_DECK_JUMP,
  state: st,
});
st = r.state;
y = r.y;
let fullPeak = y;
for (let i = 0; i < 90; i++) {
  r = stepPlatformerJump({
    dt: 1 / 60,
    y,
    groundY: 0,
    jumpHeld: true,
    jumpPressed: false,
    config: AIRSHIP_DECK_JUMP,
    state: st,
  });
  st = r.state;
  y = r.y;
  if (y > fullPeak) fullPeak = y;
}

assert(fullPeak > shortPeak + 0.3, `full hold higher: full=${fullPeak} short=${shortPeak}`);
console.log('PlatformerJump.test.ts OK', { shortPeak, fullPeak });
