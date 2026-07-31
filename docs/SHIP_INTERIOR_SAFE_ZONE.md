# Ship interior safe zone

Enter a **cabin safe zone** from the ship deck with **E** at a door/hatch.

## Asset

| Local source | Runtime path |
|--------------|--------------|
| `D:\Games\Models\boatvoxelinside.glb` | `/models/ships/boatvoxelinside.glb` |

Copied into `client/public/models/ships/boatvoxelinside.glb`. Upload to R2 for production CDN:

```bash
# From a machine with wrangler + R2 access
npx wrangler r2 object put grudge-assets/models/ships/boatvoxelinside.glb \
  --file=client/public/models/ships/boatvoxelinside.glb --remote
```

## Flow

1. Board ship (existing dock / climb flow).
2. Walk on deck toward **gold hatch ring** (probed door mesh or synthetic hatch).
3. Prompt: `E — enter Cabin hatch (safe zone)`.
4. **E** loads `boatvoxelinside.glb` under the ship, teleports feet to cabin floor.
5. Inside: `userData.safeZone = 'ship_interior'` (use `isInShipInteriorSafeZone`).
6. Walk to exit · **E** or **Space** → return to deck.

## Code

| Module | Role |
|--------|------|
| `client/src/game/dock/ShipInteriorSafeZone.ts` | Load interior, doors, enter/exit |
| `ShipBoardingController` | Wires E, detaches deck rider, phase `interior` |
| `shipCatalog.SHIP_INTERIOR_GLB` | Path constant |

## Safe zone rule

Combat / AI should skip damage when:

```ts
import { isInShipInteriorSafeZone } from '@/game/dock/ShipInteriorSafeZone';
if (isInShipInteriorSafeZone(target.model)) return; // no PvE inside cabin
```

## Controls

| Context | Input |
|---------|--------|
| Deck near hatch | **E** enter cabin |
| Deck (not near hatch) | **E** still strafe (with A/D) |
| Cabin near exit | **E** or **Space** → deck |
| Cabin | WASD walk on interior floor |

## Notes

- Interior is parented to the **ship root** so it sails with the boat.
- If the GLB has no door-named meshes, a **synthetic hatch** is placed on the main deck.
- First enter may hitch once while GLB loads; subsequent visits are cached.
