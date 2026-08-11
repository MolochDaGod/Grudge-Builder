# Anim Studio — video mocap on Cloudflare

**Live (Pages):** https://anim-studio.pages.dev  
**Custom domain:** https://anim.grudge-studio.com (DNS CNAME required — see below)

## What it is

Polished SPA for **record/upload video → MediaPipe track → Mixamo mirror → save/export JSON**.

| Path | Role |
|------|------|
| `/` | Studio UI |
| `/api/*` | Pages Function → `anim-ai-worker` |
| localStorage | Saved mocap library |

## Deploy (Cloudflare Pages)

```bash
cd workers/anim-studio
npm install
npm run build
npx wrangler pages deploy dist --project-name anim-studio --branch main --commit-dirty=true
```

Or: `npm run deploy`

## DNS for anim.grudge-studio.com

Pages reports: **CNAME record not set**. Add in Cloudflare DNS (zone `grudge-studio.com`):

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `anim` | `anim-studio.pages.dev` | Proxied (orange) |

Then custom domain status becomes **active** (SSL automatic).

```bash
# With a zone-edit API token:
# POST /zones/{zone_id}/dns_records
# { "type":"CNAME", "name":"anim", "content":"anim-studio.pages.dev", "proxied":true }
```

Domain is already registered on the Pages project (`anim-studio`); only DNS is pending.

## Access optimizations

- Vite code-split: `three` + `mediapipe` chunks
- `_headers`: immutable hashed assets, short HTML cache
- Preconnect to jsDelivr + MediaPipe model storage
- On-device pose (video never leaves browser)
- Same-origin `/api` proxy (no CORS friction)
- Idle preload of PoseLandmarker
- Drag-drop upload, webcam record, keyboard `T`/`S`/`R`

## UX

1. Source — drop/upload/record  
2. Track — body pose capture  
3. Mirror — Mixamo skeleton preview  
4. Save — library + bake JSON download  

## Related

- Worker AI: https://anim-ai-worker.grudge.workers.dev  
- Warlords route: `/video-mocap`  
- Docs: `docs/MOTION_CAPTURE_DESIGN.md`
