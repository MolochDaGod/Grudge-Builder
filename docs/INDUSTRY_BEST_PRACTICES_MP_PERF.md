# Industry best practices — multiplayer reliability, lag, Three.js, Node deploy

Opinionated stack for **Grudge Warlords**:

**Vercel (client) · Railway (Postgres + Colyseus) · Cloudflare (R2/Workers)** — see [STACK_PATTERN.md](./STACK_PATTERN.md).  
**Not SSOT:** Supabase, MySQL VPS, D1 heroes.

Prefer packages we already ship; add only high-ROI tools.

---

## 1. Already in the monorepo (keep using)

| Area | Package / tool | Why industry-standard |
|------|----------------|------------------------|
| Realtime rooms | `@colyseus/*` 0.17 | Authoritative state, schema deltas, matchmake |
| Horizontal scale | `@colyseus/redis-driver` + `redis-presence` | Multi-process rooms |
| Client net | `colyseus.js` | Official reconnect APIs |
| 3D | `three` ^0.184 | Core renderer |
| React 3D (where used) | `@react-three/fiber` + `drei` | Lifecycle, helpers |
| Physics (compat) | `@dimforge/rapier3d-compat` | Deterministic-capable physics |
| Mesh raycast speed | `three-mesh-bvh` | Faster picks / ground probes |
| Pathfinding | `three-pathfinding` | Nav without full server sim |
| Audio | `howler` | WebAudio pooling, mobile unlock |
| Errors | `@sentry/react` + `@sentry/node` | Crash + release tracking |
| Dual path legacy | `socket.io` / `socket.io-client` | Keep only where Colyseus isn’t |
| Build | Vite + esbuild + `tsx` | Fast client/server builds |
| E2E | Playwright | Smoke multiplayer / truth |

**Protocol we own:** `shared/network/syncProtocol.ts` + `NetworkManager` + `AssetLoadQueue`.

---

## 2. Reconnection (deterministic / intuitive disconnect)

### Colyseus (primary)

| Practice | How |
|----------|-----|
| **Allow reconnection** | `room.allowReconnection(client, seconds)` on `onLeave` when `!consented` |
| **Client restore** | `client.reconnect(reconnectionToken)` after brief drop |
| **Consented leave** | User navigation / Quit → no reconnect; clear token |
| **Intuitive UI states** | `connecting` → `connected` → `reconnecting` → `disconnected` (never silent) |
| **Timeout policy** | 30–120s rejoin window for combat; 5–15s for lobby |
| **Seat reservation** | Keep player schema on short drop; mark `connection: "away"` |

```ts
// Server (SectorRoom / HomeIslandRoom pattern)
async onLeave(client, consented) {
  if (consented) {
    this.state.players.delete(client.sessionId);
    return;
  }
  try {
    await this.allowReconnection(client, 60); // seconds
  } catch {
    this.state.players.delete(client.sessionId);
  }
}
```

```ts
// Client NetworkManager
room.onLeave((code) => {
  if (code === 1000) show('Left room');      // intentional
  else attemptReconnect(reconnectionToken);  // 1001/1006 network
});
```

### What to show players (intuitive)

| Code / situation | Player-facing copy |
|------------------|--------------------|
| 1000 consented | “You left the zone.” |
| 1006 / timeout | “Connection lost — reconnecting…” + spinner |
| Rejoin success | “Back online.” toast |
| Rejoin fail | “Could not rejoin. Return to map?” button |
| Room full | “Island full (owner + 5).” (already `island_full`) |
| Matchmake 503 | “Servers restarting — try in 30s.” |

### Optional packages (only if needed)

| Package | Use |
|---------|-----|
| Built-in Colyseus reconnect | **Prefer this** over reinventing |
| `navigator.onLine` + `online`/`offline` events | UI gate before matchmake |
| `@sentry/browser` breadcrumbs | Tag disconnect codes |

Avoid: custom heartbeat UDP stacks; Colyseus already heartbeats WebSocket.

---

## 3. Lag reduction (industry defaults)

| Layer | Best practice | Our target |
|-------|---------------|------------|
| **Send rate** | 10–20 Hz position | **15 Hz** (`NETWORK_RATES.moveHz`) |
| **Anim** | Event + low heartbeat | Change + **2 Hz** |
| **VFX** | Reliable one-shot | `fx` message, not schema spam |
| **Remote motion** | Interpolation / snapshot buffer | Lerp (`remoteLerp` ~8–12) |
| **Interest** | Only nearby entities | Future AOI `interestRadiusM` |
| **Authority** | Server owns HP / loot / buildings | Already Colyseus schema |
| **Client prediction** | Local move immediate; correct if rejected | Local controller free; remotes lerp |
| **Tick** | Fixed server sim (20 Hz combat, 5 Hz home) | Sector 20 / home 5 |
| **Payload** | Binary schema, short strings | Colyseus schema + JSON only for rare maps |
| **Clock** | Server time for tides / cooldowns | `serverTime` / gameClock SSOT |

### Optional lag tools

| Package | When to add |
|---------|-------------|
| Snapshot interpolation buffer (custom 100–200 ms) | If remotes still jitter on 100+ ms RTT |
| `geckos.io` / WebRTC data | Only for pure P2P experiments — **not** for Warlords authority |
| Compression (msgpack) | Colyseus already efficient; skip until profiling says otherwise |

---

## 4. Three.js instance creation & render load

### Instance / mesh policy

| Pattern | Practice |
|---------|----------|
| **Players** | One skinned mesh **clone** per remote; **never** share scene graphs |
| **GLTF cache** | Load once (`modelLoader` Map), **clone** per instance |
| **Instancing** | `InstancedMesh` for trees/rocks/props (already nature scatter style) |
| **Skinned** | Not instanced easily — LOD: capsule far, full mesh near |
| **Shadows** | Cap shadow casters; cascade only on hero + nearby |
| **Lights** | Few realtime lights; bake / hemisphere for zones |
| **Materials** | Share materials where safe; clone when tinting |
| **Dispose** | geometry/material/texture on leave (`RemotePlayerManager.removePlayer`) |
| **Frustum** | `frustumCulled = true` default; particles opt-in |
| **DPR** | `Math.min(devicePixelRatio, 2)` |
| **Post** | Quality tiers already (`PostProcessing` low/medium/high) |
| **BVH** | `three-mesh-bvh` for terrain/interact raycasts |
| **Draco / meshopt** | Compress race/building GLBs on CDN (gltf-transform) |

### Packages worth adopting (perf)

| Package | Purpose |
|---------|---------|
| `meshoptimizer` / `@gltf-transform/cli` | Pipeline compress GLB (you have `optimize-glb`) |
| `three-stdlib` / drei helpers | Only if R3F paths need them |
| `stats.js` | FPS overlay (dev / `?debug=1`) |
| `lil-gui` | Runtime toggles (shadows, dpr, net graph) |

### CSS / UI “scripting” for speed feel

Prefer **CSS for chrome**, **game loop for world**:

| Concern | Prefer |
|---------|--------|
| HUD fade / chat open | CSS `transition` + `transform` (GPU) |
| Damage flash / kill feed | CSS keyframes; don’t thrash React state every frame |
| Cooldown radial | CSS `conic-gradient` or SVG, not canvas every tick |
| Crosshair / ammo | Pure CSS; update DOM ≤ 10–15 Hz |
| HP bars on remotes | Prefer **sprites in Three** (you do) over HTML follow (expensive layout) |
| React | Don’t put player positions in React state at 60 Hz — keep in Three, HUD polls 5–10 Hz |

“CSS scripting” = **declarative UI motion** (Tailwind/transitions), not CSS-in-JS for every particle.

### Speed systems (game feel)

| System | Practice |
|--------|----------|
| **Tick rate UI** | Already sim tick slider — keep separate from net Hz |
| **timeScale** | Debug / cinematic only (`ikdebug`); never desync multiplayer clocks |
| **Animation** | Mixer `timeScale` for local juice; remotes follow server `animState` |
| **Network rates** | Single SSOT `NETWORK_RATES` — don’t hardcode 15 in three places |

---

## 5. Shaking out problems (diagnostics)

| Tool | Use |
|------|-----|
| `@colyseus/monitor` | Room list, clients, memory (you have it) |
| `@colyseus/playground` | Manual join smoke tests |
| `@sentry/react` + `@sentry/node` | Errors + release + disconnect breadcrumbs |
| Playwright `e2e/truth` | Deployed endpoint smoke |
| `stats.js` / custom net HUD | FPS, RTT, send Hz, queue depth |
| Chrome Performance + WebGL inspector | Frame spikes, GPU |
| Railway metrics | CPU/memory on grudge-api |
| `probe:deployments` / `probe:truth` | Fleet health scripts you already run |

### Minimal net debug HUD (product)

```
FPS · RTT · players · sendHz · assetQueue · room · reconnectState
```

Wire from `NetworkManager` + `AssetLoadQueue.getStats()` + `renderer.info.render`.

---

## 6. Node server & deployment best practices

| Practice | Recommendation |
|----------|----------------|
| **Runtime** | Node **22 LTS** (match Vercel build) |
| **Process** | One Express + Colyseus process (you do) — don’t split WS unless scale requires |
| **Cluster** | Redis presence/driver when >1 replica |
| **Graceful shutdown** | Drain matchmake, `allowReconnection`, then exit (Railway drain seconds) |
| **Health** | `/api/health` + `/api/colyseus/health` + `/api/multiplayer/status` |
| **Config** | Env only: `DATABASE_URL`, Redis, `PRODUCTION_PUBLISH_TOKEN` |
| **Assets** | **Not** from Node disk in prod — **R2 CDN** (`assets.grudge-studio.com`) |
| **Server deploy** | Railway **grudge-api** (not failed openworld-server) |
| **Client deploy** | Vercel static + rewrites to game-data API |
| **Zero-downtime** | Rolling deploy + reconnect window ≥ deploy time |
| **Logging** | Structured JSON; sample move spam at debug only |
| **Rate limit** | Chat / place_building / matchmake (express-rate-limit or edge) |

### Scripts we want as standard

| Script | Purpose |
|--------|---------|
| `production:publish-sectors` | SSOT → static JSON |
| `production:publish-dossiers` | Lore/info package |
| `production:verify-cdn` / magic bytes | Bad GLB detection |
| `probe:truth` / `probe:all` | Fleet smoke |
| `production:optimize-glb` | Mesh budget |
| **Add** `mp:smoke` | Two fake clients join sector, send move, assert chat roundtrip |
| **Add** `mp:loadtest` | Optional k6/artillery on matchmake (later) |

### Server update channel (optional)

| Approach | Use |
|----------|-----|
| `room_snapshot` + `protocolVersion` | Client refuses join if major mismatch (you have handshake) |
| Force disconnect with code + “Update client” | Breaking schema changes |
| Feature flags via REST `/api/multiplayer/session` | Gradual rollout |

---

## 7. Client asset best practices

| Rule | Detail |
|------|--------|
| CDN first | `assets.grudge-studio.com` long cache (`immutable` hashes when possible) |
| Path SSOT | Fleet + `assetUrl` / `AssetLoadQueue` |
| Priority queue | Local player 0 → remotes 1 → landmarks 3–4 |
| Cap concurrency | 3–4 GLBs (mobile) |
| Texture | Resize to power-of-two budgets; KTX2 later if needed |
| Audio | howler sprites; unlock on first gesture |
| Fail soft | Capsule placeholder while remote loads (you do) |
| Preload sector | REST `sectorPreload` races before heavy play |

---

## 8. What to add next (priority order)

1. **`allowReconnection` + client reconnect loop** in SectorRoom / HomeIslandRoom + NetworkManager  
2. **Connection state HUD** (connecting / reconnecting / offline)  
3. **Net + FPS debug strip** (`?net=1`)  
4. **Dispose audit** on room leave (listeners, intervals, GLTF)  
5. **gltf-transform meshopt** on race/building CDN assets  
6. **Sentry** tags: `room`, `sectorId`, `sessionId`, disconnect code  
7. **mp:smoke** script against staging Colyseus  
8. Only then: kill feed / scoreboard polish  

---

## 9. Packages we do **not** need right now

| Skip | Why |
|------|-----|
| Photon / Mirror / Nakama | Already Colyseus |
| Full WebRTC mesh | Authority nightmare for RPG loot |
| bitECS / multiplayer physics on server | Overkill until hundreds of entities |
| Another Socket.IO game channel | Prefer single Colyseus path |
| CSS-driven character animation | Use Three mixers |

---

## 10. Speed systems summary (what “we want to use”)

| System | Choice |
|--------|--------|
| Net tick | **15 Hz move**, 2 Hz anim heartbeat |
| Server sim | **20 Hz** combat rooms, **5 Hz** home |
| Render | **rAF**, DPR ≤ 2, quality tiers |
| UI motion | **CSS transitions** for chrome |
| Game feel | Local prediction + remote lerp |
| Disconnect | **Explicit states** + Colyseus reconnect token |
| Deploy | Vercel client + Railway **grudge-api** + R2 assets |
| Observe | Sentry + Colyseus monitor + Playwright + probe scripts |

---

## One-line answer

**Use Colyseus reconnect + clear disconnect UX, 15 Hz move + lerp, AssetLoadQueue + CDN clones, CSS for HUD / Three for world, Sentry + monitor for shake-out, Railway grudge-api + Vercel + R2 for deploy** — most of the stack is already chosen; the highest ROI gaps are **reconnection**, **connection HUD**, and **server deploy** of the new multiplayer routes.
