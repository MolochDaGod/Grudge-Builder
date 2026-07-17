# Claim Flag, Camp Units & F1–F5 Orders

**Updated:** 2026-07-17  
**SSOT:** `shared/definitions/campUnits.ts` · `shared/definitions/npcCamps.ts`  
**Runtime:** `client/src/island3d/camps/CampUnitSystem.ts` · `NpcCampSystem.ts`  
**UI:** `client/src/island3d/render/CampCommandBar.tsx` (via ModePlayHUD)

---

## Claim Flag

| | |
|--|--|
| Upgrade id | `camp_flag` |
| Effect | Claims camp ownership for the player account |
| Spawn | **3 unarmed variants of the player’s race** (Grudge6 kit, empty weapon slots) |
| Mesh | `RACE_GRUDGE6[raceId]` · armor A · no weapons until buildings train them |

Place via build mode near a player-owned camp, or:

```ts
engine.upgradeNearestCamp(x, z, 'camp_flag');
// or
engine.placePlayerCamp(x, z);
engine.upgradeNearestCamp(x, z, 'camp_flag');
```

---

## Benches (profession craft)

| Upgrade | Profession | Notes |
|---------|------------|--------|
| `camp_bench` | Camp / Engineering / Forestry / Mining | Craft T0; XP toward profession level (cap ~20–25 at camp) |
| `camp_fire` | Cooking | Cook station XP |

UI: **Craft @ Bench** on the camp command bar when near owned camp with a bench.

```ts
engine.craftAtOwnedCamp('camp'); // → { ok, xp }
```

---

## Buildings → unit buffs

| Building | Unit effects |
|----------|----------------|
| **Storage** | +harvest rate/yield, light armor |
| **Tower** | AI mult, **T0 weapons**, armor, **weapon skill usage**, HP |
| **Fire** | HP / morale |
| **Barricade** | Defense AI + armor |

Buffs stack and re-apply when upgrades are added (`refreshCampBuffs`).

---

## Unit orders (owned camp only)

| Key | Order | Behavior |
|-----|--------|----------|
| **F1** | Defend Camp | Guard garrison posts, aggro in camp range |
| **F2** | Follow Player | Join party, follow, fight with player |
| **F3** | Go Home | Return to camp posts and hold |
| **F4** | Attack | Aggressive pursue hostiles |
| **F5** | Group On Me | Rally tight formation on player |

- Only active when **near a camp you own** (~48 m).
- **Shift+F1–F3** still switches special weapon forms (unchanged).
- HUD: `CampCommandBar` above the mode dock.

---

## Flow

```
Place camp (owned)
  → Place Claim Flag
      → 3× unarmed race recruits (your race)
  → Place Bench
      → Craft + profession XP
  → Place Tower / Storage / Fire
      → Units gain T0 gear, harvest buffs, AI, weapon skills
  → Near camp: F1–F5 command garrison
```
