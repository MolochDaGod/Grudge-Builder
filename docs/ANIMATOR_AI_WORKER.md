# Animator AI Worker — system of understanding + deploy

Chat bot that **understands human motion, rigid-body roots, and Three.js AnimationMixer best practices**, then **creates / moves animations from basic language**.

Live target: [grudox.grudge-studio.com/animator](https://grudox.grudge-studio.com/animator/)

## Production path (Grudox Animation Chat) — LIVE

The SPA already has **Animation Chat**. It calls:

| URL | Role |
|-----|------|
| `https://anim-ai-worker.grudge.workers.dev` | Primary (`VITE_ANIM_WORKER_URL`) |
| `https://grudox.grudge-studio.com/api/anim-ai/*` | Same-origin proxy |

```
User NL in Animation Chat
  → POST /chat { messages, duration, references, motion }
  → anim-ai-worker v2.1
  → { reply, clip: { bones, frames:[{ duration, pose, root? }] } }
  → SPA validates mixamorig* quats → THREE.AnimationClip → AnimationMixer
```

**Source:** `workers/anim-ai-worker/`  
**Deploy:** `cd workers/anim-ai-worker && npx wrangler deploy`  
**Status:** v2.1.0 — fixed deprecated model; SPA `messages[]` accepted; deterministic presets for basic language.

### Basic language presets (no LLM required)

wave, nod, idle, walk, run, attack/slash, block, dodge, jump, cast, spin, sit, sword

### Free-form

Falls through to Workers AI (`llama-3.3-70b-instruct-fp8-fast` → 8B fallback) with Mixamo pose JSON schema.

---

## Secondary path (ops planner + overlay chat)

```
User NL  ──►  local NL compiler (shared/animation/ai/nlCompiler)
                │ confidence ≥ 0.55
                ▼
             AnimPlan { reply, ops[] }
                │
                ▼
          planExecutor → AnimWorkerHost
                │
     ┌──────────┼──────────┐
     ▼          ▼          ▼
 AnimationMixer  Director  root Object3D
 (play/crossfade) (gait)   (move/face)

 low confidence ──► POST ai.grudge-studio.com/v1/agents/animator/chat
                         (JSON ops only)
```

| Layer | Path |
|-------|------|
| Knowledge pack | `shared/animation/ai/knowledge.ts` |
| Intent schema | `shared/animation/ai/intentSchema.ts` |
| NL compiler | `shared/animation/ai/nlCompiler.ts` |
| Plan executor | `shared/animation/ai/planExecutor.ts` |
| Browser chat UI | `public/js/tvs-anim-worker-chat.js` |
| AI hub role | `grudge-ai-hub/seed-animator-agent.sql` |

## Basic language examples

| Say | Ops |
|-----|-----|
| `walk` / `run` / `sprint` | `set_gait` + `play` loop |
| `attack` / `dodge` / `cast` | `oneshot` |
| `idle` / `stand still` | gait off + idle loop |
| `wave` / `bounce` / `spin` | procedural `create_clip` + play |
| `move forward 2` | `move_root` relative + walk |
| `turn left` | `face` yaw 90° |
| `list clips` | inventory |
| `explain mixer` | knowledge dump |

## Wire the host (required for execution)

From the Animator SPA (or any Three.js scene):

```js
window.AnimWorkerChat.setHost({
  THREE,
  getMixer: () => mixer,          // one mixer per instance
  getRoot: () => model,           // Object3D for move/face
  resolveClip: (slot) => map[slot], // semantic → AnimationClip
  listClips: () => Object.keys(map),
  // Prefer Grudge AnimationDirector when present:
  setGaitTarget: (m, s) => director.setGaitTarget(m, s),
  playOneShot: (clip, o) => director.playOneShot(
    typeof clip === 'string' ? map[clip] : clip, o
  ),
  playLoop: (slot, fade) => { /* optional */ },
  stopAll: (fade) => mixer.stopAllAction(),
});
```

**Rules (non-negotiable):**

1. One `AnimationMixer` per character instance  
2. `SkeletonUtils.clone` for skinned meshes  
3. `mixer.update(delta)` every frame while visible  
4. No empty clips  

## Deploy

### 1. Clip-generation worker (required for Grudox Animation Chat)

```bash
cd workers/anim-ai-worker
npx wrangler deploy
# → https://anim-ai-worker.grudge.workers.dev
```

Smoke:

```bash
curl -s -X POST https://anim-ai-worker.grudge.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"wave"}],"duration":1.5}'

curl -s https://grudox.grudge-studio.com/api/anim-ai/health
```

Open [animator](https://grudox.grudge-studio.com/animator/) → **Animation Chat** → try `walk`, `attack`, `wave`.

### 2. AI hub ops agent (optional planning)

```bash
cd path/to/grudge-ai-hub
npx wrangler d1 execute grudge-ai-hub --remote --file=./seed-animator-agent.sql
```

```bash
curl -s -X POST https://ai.grudge-studio.com/v1/agents/animator/chat \
  -H "Authorization: Bearer $AI_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message":"walk then attack"}'
```

### 3. Optional overlay chat UI

`public/js/tvs-anim-worker-chat.js` — local NL ops + host binding.  
Not required if using the SPA’s built-in Animation Chat.

### 4. Builder monorepo consumers

```ts
import {
  compileNaturalLanguage,
  executePlan,
  buildAnimatorSystemPrompt,
  getKnowledgePack,
} from "@shared/animation/ai";
```

## Knowledge topics

- **human** — gait, one-shots, hip root, no T-pose idle  
- **rigid** — physics root vs bone tracks, velocity→gait  
- **mixer** — clips/actions/mixer, blend, dispose  
- **grudge** — Bip001 bake, AnimationDirector, semantic slots  

## Events

| Event | When |
|-------|------|
| `anim-worker:plan` | After each user message (detail: plan + result) |
| `anim-worker:host` | After `setHost` |

## Security

- Local NL compiler needs **no API key**  
- LLM path uses `Authorization: Bearer` (`localStorage.grudge_ai_key` or `setApiKey`)  
- Ops only touch the registered host — no arbitrary code execution  
