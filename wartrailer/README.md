# wartrailer.grudge-studio.com

Static trailer hub for Grudge Warlords — section flybys, biome stills, cave asset index, live play links.

## Deploy (Vercel)

```bash
cd wartrailer
npx vercel --prod
# Then add domain wartrailer.grudge-studio.com in Vercel + Cloudflare CNAME
```

Or from monorepo root:

```bash
npx vercel deploy wartrailer --prod --name grudge-wartrailer
```

### DNS (Cloudflare)

| Type | Name | Target |
|------|------|--------|
| CNAME | wartrailer | cname.vercel-dns.com |

## Record live section WebMs

1. Open `https://client.grudge-studio.com/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1&trailer=1`
2. Game trailer tab → **Record this surface**
3. Upload downloaded `*-flyby.webm` to `wartrailer/videos/` (or R2 `videos/trailers/`)
4. Redeploy hub

## Caves (production)

Upload local GLBs (gitignored if large):

```
public/models/caves/2cave.glb
public/models/caves/old_cave_lethal_ape_redux.glb
```

→ R2 `assets.grudge-studio.com/models/caves/`

Contract: access points + navmesh + **no water inside** (even Y &lt; 0).
