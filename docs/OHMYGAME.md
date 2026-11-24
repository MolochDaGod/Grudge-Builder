# Local AI game studio (WhiteTowerAI/ohmygame)

**Status:** third-party local tool. Not Warlords SSOT. Not a production host.  
**Upstream:** [WhiteTowerAI/ohmygame](https://github.com/WhiteTowerAI/ohmygame) (`main`, Apache-2.0, beta).  
**Pinned when this page was drafted:** `d6eac67856583820f2ff2795851fc3787fae02f5` (`0.0.0-beta.5.11`).  
**Related:** Legion attach lives in `grudge-ai-hub` `docs/WIRING.md`. This page is the Builder/human entry.

---

## What it is (and is not)

This is a **local-first AI game studio**: describe a game, and an agent (built-in Pi, or Claude Code / Codex / OpenCode) designs it, writes code, generates art / video / 3D / audio on one canvas, playtests it, and can publish a static web build.

Best starting stacks: **Phaser, Three.js, React Three Fiber**. Plugins exist for Godot, Unity, Unreal, Blender, Aseprite, Tiled, and several mini-game targets.

It is **not**:

- A replacement for this repo or for Spawn `@racalvin/grudge-warlords` main
- A Grudge production service (no `*.grudge-studio.com` host)
- A Legion cloud agent (`ai.grudge-studio.com` cannot reach your loopback daemon)
- A player-account or GrudgeID path
- A way to skip the CDN

Do not use the trademarked OhMyGame name or logo as Grudge branding. Refer to the upstream project by its repository (`WhiteTowerAI/ohmygame`) when a citation is needed.

---

## Run from source

Requires [Bun](https://bun.sh) 1.4.2+ and Node.js 22.19+.

```bash
git clone --branch main https://github.com/WhiteTowerAI/ohmygame.git
cd ohmygame
bun install --frozen-lockfile
export OHMYGAME_DAEMON_TOKEN  # required on studio machines; do not start tokenless
bun run dev            # web renderer + local daemon
# or
bun run dev:desktop    # Electron app
```

| Process | Default bind | Notes |
|---------|--------------|--------|
| Daemon | `127.0.0.1:43110` | `GET /health` → `{ "status": "ok" }`. **Studio policy: set `OHMYGAME_DAEMON_TOKEN` before `bun run dev`.** Upstream is tokenless by default; do not run it that way here. |
| Renderer | `127.0.0.1:43120` | Vite; `/api` is proxied to the daemon. |

Official desktop builds send the token on stdin and force loopback. **Never set `DAEMON_HOST=0.0.0.0`**, and do not tunnel or deploy the daemon.

Source builds send no telemetry. The app ships without a model: connect your own provider keys or a coding CLI on first run. Do not put Grudge production secrets in this tool.

MCP: enable the project's MCP server in its settings to let other local agents use canvas, media generation, and playtest (upstream skill name: `ohmygame-studio`).

---

## License

Apache-2.0 allows commercial use, modification, and redistribution with attribution and the license notice. Keep that attribution if you redistribute or fork the software. The **OhMyGame name and logo are trademarks** and are not covered — do not use them as Grudge branding. Prefer publishing studio games on Grudge hosts, not only on the upstream Community (that path uses WhiteTowerAI's cloud and account).

---

## Studio rules when you use it

- Do not rewrite Warlords from a project in this tool. Promote code through the usual Hitch / Verdict / ALE / Jonathan flow.
- Shipped images and meshes are CDN-only: Kiln (unpublished), then Rook, then `assets.grudge-studio.com`. If the CDN misses, show the missing marker.
- Player identity stays GrudgeID (`id.grudge-studio.com`) and Railway. Do not wire upstream Community accounts into the bag.
- Third-party plugins download on first `bun run dev` (signed official set). Review extras before enabling them.
