# Warlords Production Deployment Flow

**Entry:** https://grudgewarlords.com/warlords/start  
**SSOT:** `shared/definitions/warlordsProductionFlow.ts`

## Pipeline

```
/intro                 Opening scene (Warlords video)
    ↓
/create-character      GCS Warlords create (return → tutorial)
    ↓
/tutorial              Shipwreck solo tutorial
    ↓
/play?sector=haven…    Open world grind (also /island-3d lobby)
    ↓  (level ≥ 20)
/home-island           Personal 1024m island
    ↓
/world-map             9 sectors · race cities · sail
```

## Level gate

| Destination | Min level |
|-------------|-----------|
| Tutorial, open world, world map | 0 (after prerequisites) |
| **Home island (End Game)** | **20** |

### End Game mission (level 20)

1. Reach level **20**
2. Talk to **faction captain** (mounted) on your race island in the pirate lobby (`E`)
3. Accept mission **“End Game”**
4. Cinematic at `/homeisland?cinematic=abandon-ship`:
   - Cannon fire
   - Ship sinks
   - **All models jump off** (abandon ship)
   - **Not** a single-character throw overboard
5. Land on **home island** create/play  
   Production: `https://client.grudge-studio.com/homeisland`

Dev override: `/home-island?unlock=1` or `?dev=1`

## Local flags

| Key | Meaning |
|-----|---------|
| `warlords_opening_seen_v1` | Opening scene finished |
| `warlords_tutorial_complete_v1` | Tutorial finished |

## Related

- Character create redirect: `/create-character` → GCS → `/tutorial?from=character-create`
- After tutorial: `/play?sector=haven_shore&mode=zone&…&from=tutorial` (not island-reveal)
- First home island at 20: `/island-reveal?from=level-20` if no island yet, else `/home-island`
- Black Tome calendar: `/lore/tome-of-seasons-and-gods.html`
- Production map: `/island-3d?mode=lobby&map=pirate-islands`
