# PIP Skull–style large boss fights

**Reference:** [PIP: Skull Demo](https://bandinopla.github.io/pip-skull-demo/) (Bandinopla)  
Stack notes from demo: Three.js + Cannon-es, giant skeleton boss, shockwave/bloom post, meteors, electric shock, intro roar, multi-phase agony.

**Also:** annihilate `RobotBoss` (weakness orbs, sweep beams, whirlwind, phases).

## What we ship

| Piece | Path |
|-------|------|
| Attack / phase SSOT | `shared/definitions/pipSkullBossFight.ts` |
| Cinema VFX | `client/src/island3d/combat/BossCinemaFx.ts` |
| Fight runtime | `client/src/island3d/combat/LargeBossFightSystem.ts` |
| Dungeon room host | `BossRoomInstanceSystem` (Hoth / event portals) |
| Open PvE arenas | `Island3DEngine` → `boss_arena` zone nodes (max 3) |
| Telegraphs | `AttackWarningSystem` (cone / AoE / incoming) |

## Gameplay loop (player)

1. Enter **boss room** (E portal) or approach **boss_arena** marker  
2. Intro roar + shockwave  
3. Read **ground telegraphs** (AoE disk / cone / incoming) → dodge  
4. **Physical hits:** knockback (m/s), knock-up, stun lockout on CharacterController  
5. After slam / electric → **CORE EXPOSED** (3 cyan orbs) — unload damage  
6. Phases at ~60% / 30% / 12% HP (Meteor Crown → Storm Skull → Agony)  
7. Death event → exit pad still works  

## AoE · Warning · Effects · Knock / Stun

| Layer | Implementation |
|-------|----------------|
| **Warning** | `AttackWarningSystem` — `aoe` / `cone` / `incoming` while `telegraph` state |
| **AoE shapes** | Instant disk (slam), expanding shockwave band, meteor radius, electric sphere, stomp cone, beam tick |
| **Effects** | `BossCinemaFx` rings/meteors/electric + `WorldFxBus` bursts |
| **Knockback** | `knockbackMps` radial from origin → `CharacterController3D.applyCombatHit` |
| **Knock-up** | `knockUpMps` → `verticalVelocity` |
| **Stun** | `stunSec` locks WASD (`stunTimer`); electric ≥ 1.2 s |
| **Resolve SSOT** | `resolveBossHitResponse()` in `HitResponseSystem.ts` |

Attack defs in `pipSkullBossFight.ts` set per-move `knockbackMps`, `knockUpMps`, `stunSec`, `knockdown`.

## Attacks (PIP-mapped)

| Attack | Feel |
|--------|------|
| Ground slam | Close AoE + knockdown |
| Shockwave ring | Expanding band (safe inside briefly if inner radius) |
| Meteor rain | Sky rocks with red ground markers |
| Rock throw | Aimed meteor at player |
| Electric shock | Stun + violet sphere |
| Sweep beam | Dual rotating beams |
| Whirlwind | Radial arms / ring |
| Charge stomp | Frontal cone |

## Events

```js
// Boss chamber
window.addEventListener('grudge:boss-room', (e) => {
  // { prompt } | { type:'death', bossId } | { type:'hit', damage, kind, knockdown, stunSec }
});

// Open arena
window.addEventListener('grudge:arena-boss', (e) => {
  // { type:'prompt'|'death', ... }
});
```

## Hosts

| Surface | How |
|---------|-----|
| **Home island evil mountain doorway** | `EvilMountainTriad` cave mouth E → `PveBossInstanceSystem` (`evil_mountain_door`) |
| **Lobby mountain** | Same triad path on lobby maps |
| **Hidden Mountain City door** | Thornwood: defeat outdoor Warden → E door → `PveBossInstanceSystem` (`hidden_mountain_city_door`) |
| **Warlords dungeon portals** | Zone `dungeon_entrance` nodes → `warlords_dungeon_portal` instance (non-ice) |
| **Hoth / frozen room** | Ice portals → `BossRoomInstanceSystem` + large boss |
| **PvE boss_arena** | Zone population nodes `category: 'boss_arena'` (open world) |
| **Orc Ghar'Thok** | Separate legacy path (`OrcBossController`) — keep for orc mesh pack |
| **Volcanic lava Caesar** | Ember instance (`VOLCANIC_BOSS_ARENA`) → `LAVA_CAESAR_BOSS_FIGHT` + `LavaCaesarFightKit` on `LargeBossFightSystem` |

### Lava Caesar (ember / volcanic)

Same LargeBoss + Rapier arena. Not a second combat stack.

| Beat | What happens |
|------|----------------|
| Dive / rise | Caesar Spell4 sinks under lava, Spell1 surfaces |
| Platform tornado | `fire_tornado (1)` rises from magma through one deck |
| Brood | 3 `lava_monster` adds (Mixamo clip windows + annihilate chase/attack), one per platform |
| Fail | Unkilled adds explode and crack that platform |
| Twister | Linear `fire_tornado` path toward the player |
| Stun | Kill add → `fireball (2)` orb. Walk through: Dead clip to **2.5 s**, then **2.5↔2.0** sixteen times (8 s extra damage), rewind Dead |
| Scale | ~6.5 m SI, fire-recolored Caesar albedo |

### Play paths

```
# Home island — find secret evil peak cave mouth, Press E
/home-island

# Warlords thornwood — defeat Warden, E under-mountain door
/play?sector=thornwood_wilds&mode=zone

# Any Warlords sector dungeon entrance (non-ice)
/play?sector=haven_shore&mode=zone
```

### Exit

Inside chamber: **E** near blue ring → return to entry stamp.

### Events

```js
window.addEventListener('grudge:pve-boss-instance', (e) => {
  // enter | exit | death | prompt
});
```

## Scale (SI)

`baseScale ≈ 4.5` × human yardstick → colossus ~**18 m** tall proxy. Real GLB can replace proxy via `LargeBossSpawnOpts.model`.

## Agent rules

1. Attack timing / HP thresholds only in `pipSkullBossFight.ts`  
2. New arena VFX → `BossCinemaFx` (not ad-hoc in engine)  
3. Telegraphs always via `AttackWarningSystem` before damage  
4. Do not mix OrcBoss FSM IDs with PIP attack ids without a mapper  

## Play

```
# Frozen / ethereal portals → Hoth boss room + large boss
/play?sector=frostbite_expanse&mode=zone
/play?sector=ethereal_falls&mode=zone

# Any sector with boss_arena nodes in population
/play?sector=ember_depths&mode=zone
```
