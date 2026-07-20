# Record 13 live flyby WebMs

For each surface, open the **Live flyby** URL with `trailer=1`, then **Game trailer → Record this surface**.

Upload results:

```bash
npx wrangler r2 object put grudge-assets/videos/trailers/sections/<id>-flyby.webm \
  --file=<id>-flyby.webm --content-type=video/webm --remote
```

Then redeploy hub:

```bash
cd wartrailer
npx wrangler pages deploy . --project-name=grudge-wartrailer --branch=main --commit-dirty=true
```

| # | id | play URL |
|---|-----|----------|
| 0 | tutorial_shipwreck | `/play?mode=tutorial&trailer=1` |
| 1 | world_map_overview | `/world-map` (optional flyby) |
| 2 | home_island | `/play?mode=procedural&trailer=1` |
| 3 | lobby_open_world | `/play?mode=lobby&trailer=1` |
| 4–12 | sectors | `/play?sector=<id>&mode=zone&worldSeed=grudge-world-1&trailer=1` |

**Interim:** 13 section **posters** are already on CDN at  
`videos/trailers/sections/<id>-poster.jpg`
