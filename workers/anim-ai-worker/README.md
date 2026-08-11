# anim-ai-worker

AI + deterministic motion worker for **https://grudox.grudge-studio.com/animator/**

## What it does

Accepts plain language (and multi-turn chat) and returns **Mixamo `mixamorig*` pose clips** the SPA converts into `THREE.AnimationClip` for `AnimationMixer`.

### Protocol (SPA contract)

```http
POST /chat
Content-Type: application/json

{
  "messages": [{ "role": "user", "content": "wave hello" }],
  "duration": 1.5,
  "references": [],
  "motion": "gesture"
}
```

Also accepts `{ "message": "walk" }` for simpler clients.

### Response

```json
{
  "reply": "Playing wave (1.2s)",
  "action": "generate",
  "clip": {
    "bones": ["mixamorigHips", "..."],
    "frames": [
      {
        "duration": 0.2,
        "pose": { "mixamorigRightArm": [qx, qy, qz, qw] },
        "root": [0, 0, 0]
      }
    ]
  },
  "warnings": [],
  "kind": "chat"
}
```

- Quaternions are **xyzw**, normalized  
- Unknown bones dropped client-side  
- Max 64 frames, duration 0.05–5s per frame  

## Deploy

```bash
cd workers/anim-ai-worker
npm i
npx wrangler deploy
```

URL: `https://anim-ai-worker.grudge.workers.dev`  
(SPA bakes this as `VITE_ANIM_WORKER_URL`.)

## Tools

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` `/health` | Health |
| GET | `/tools` | Tool catalog |
| POST | `/chat` | Multi-turn / SPA Animation Chat |
| POST | `/generate` | Text → full clip |
| POST | `/pose` | Text → single pose |
| POST | `/weapon` | Weapon slash presets |
| POST | `/optimize` | Smooth / downsample frames |
| GET | `/clips` | Stub library list |

## Models

Uses `@cf/meta/llama-3.3-70b-instruct-fp8-fast` when available, falls back to `@cf/meta/llama-3.1-8b-instruct`, then **deterministic presets** if Workers AI fails.

## Knowledge

Human motion (gait, one-shots), rigid root vs bone tracks, AnimationMixer practices — injected into system prompt for LLM path.
