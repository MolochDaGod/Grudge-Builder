---
name: gruda-ai-router
description: >
  Central REST API + model router for all Grudge Studio AI calls.
  Routes: Legion (ai.grudge-studio.com) first, Puter (grudachain / MolochDaDev backup JWT) second,
  cost-effective free tiers last. Usage logging to Puter KV + Railway. Single source for
  ai_root.html, grudgewarlords.com/craft, sprite tools, Game-Studio-Tool, and every page
  that currently calls puter.ai.chat directly.
---

# gruda-ai-router — single source of truth for model selection + cost control

**Problem solved:** Dozens of HTML pages call `puter.ai.chat` directly → uncontrolled token burn on grudachain Puter account. No visibility, no cost tiers, no fallback when quota exhausted.

**Solution:** One Express REST endpoint (`POST /api/ai/chat`) that every client calls. The router decides the cheapest viable model, logs usage, and falls back cleanly.

## 1. Model tiers (cost-effective order)

| Tier | Provider | Models (examples) | Cost | When to use | Fallback |
|------|----------|-------------------|------|-------------|----------|
| **Free / local** | Legion Workers AI / Ollama | `llama-3.1-8b`, `phi-3-mini` | $0 | Simple chat, summarization, non-critical | — |
| **Cheap** | Legion + Puter gpt-4o-mini | `gpt-4o-mini`, `gemini-1.5-flash` | Low | Most UI, recipe help, sprite prompts | Free |
| **Balanced** | Legion / Puter | `gpt-4o`, `claude-3-haiku` | Medium | Code, craft descriptions, VFX params | Cheap |
| **Premium** | Legion only (or Puter with explicit consent) | `gpt-4-turbo`, `claude-3-opus`, `o1-preview` | High | Complex reasoning, long context | Balanced |

**Rule:** Always start at cheapest viable tier. Only escalate when the task explicitly needs it (flag in request body).

## 2. REST API contract

### POST /api/ai/chat
Request:
```json
{
  "messages": [{ "role": "user", "content": "..." }],
  "model": "auto" | "cheap" | "balanced" | "premium" | "puter:gpt-4o-mini",
  "page": "ai_root" | "warlords_craft" | "sprite_analyzer" | "...",
  "maxTokens": 512,
  "stream": false
}
```

Response (success):
```json
{
  "ok": true,
  "text": "...",
  "modelUsed": "legion:llama-3.1-8b",
  "costTier": "free",
  "usage": { "prompt": 120, "completion": 45 }
}
```

Error (quota or all fallbacks exhausted):
```json
{ "ok": false, "error": "all_providers_exhausted", "tried": ["legion", "puter"] }
```

### GET /api/ai/models
Returns the current catalog + which ones are currently healthy.

### GET /api/ai/usage?since=7d
Returns aggregated usage by page + model (from KV log).

## 3. Router logic (priority)

1. If `model` starts with `puter:` → try Puter first (user-pays or backup JWT).
2. Else try Legion (`ai.grudge-studio.com`) with cheapest viable model for the tier.
3. If Legion fails or rate-limited → fall back to Puter using MolochDaDev JWT (the token you supplied).
4. If both exhausted → return error (never silently burn quota).

The backup JWT is stored server-side only (never sent to browser).

## 4. Usage logging (mandatory)

Every call writes to:
- `puter.kv` under key `gruda:ai-usage:{date}:{page}` (atomic counter + model list)
- Optional Railway table `ai_usage_log` for long-term analytics.

This is how you finally see “we went through a lot of tokens but I don’t know how.”

## 5. Files in this skill

- `server/ai-router.mjs` — the Express router (drop-in or standalone)
- `client/ai-client.js` — tiny browser helper that replaces direct `puter.ai.chat`
- `references/model-catalog.json` — static tier list (update quarterly)
- `scripts/seed-usage-log.mjs` — one-time migration of old direct calls into the log

## 6. Migration for existing pages

Replace every occurrence of:
```js
const resp = await puter.ai.chat(msgs, { model: "gpt-4o-mini" });
```
with:
```js
const r = await fetch("/api/ai/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ messages: msgs, model: "cheap", page: "ai_root" })
}).then(r => r.json());
const text = r.text;
```

For grudgewarlords.com/craft and sprite tools: point them at the same `/api/ai/chat` (CORS already allows `*.puter.site` and `grudgewarlords.com`).

## 7. Deploy (to grudge-api-production-0d46)

See `DEPLOY.md` for the exact steps.

Summary:
1. Set `PUTER_BACKUP_TOKEN` on the Railway project (one-time).
2. Mount the router in the Express app that serves `api.grudge-studio.com`:
   ```ts
   import aiRouter from '../../../.grok/skills/gruda-ai-router/server/ai-router.mjs';
   app.use('/api/ai', aiRouter);
   ```
3. `railway up --service api`
4. Verify: `curl https://api.grudge-studio.com/api/ai/models`

CORS already permits `*.puter.site`, `grudgewarlords.com`, `character.grudge-studio.com`.

Never put the JWT in any client bundle.

## 8. Anti-patterns fixed by this router

- Direct `puter.ai.chat` from static HTML → now goes through controlled endpoint.
- No visibility into which page burns tokens → now logged by `page` param.
- Quota exhaustion on grudachain → automatic fallback to MolochDaDev token or Legion.
- Expensive models chosen by default → cost-effective tier system.

## 9. Telegram agentic surface (free tier extension)

The `gruda-telegram-agent` skill (source: `C:\Users\nugye\Desktop\telegramai`) provides a genuine tool-calling Telegram bot that consumes the same Groq free tier (Llama 3.3 70B) already routed here. It adds GitHub CLI, restricted shell, Solana RPC, and Cloudflare Tunnel access for internal services — all at $0 during the Railway trial. Load after this router when you need a persistent agentic CLI surface instead of only browser pages.
