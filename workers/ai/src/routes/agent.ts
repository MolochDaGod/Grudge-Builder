/**
 * POST /v1/agent — Self-prompting multi-step pipeline.
 *
 * Receives a high-level task, uses an agentic model (kimi-k2.6 with tool calling)
 * to plan and execute steps autonomously. Each step can invoke internal tools
 * (image_gen, lore_lookup, balance_calc) via the gateway's own endpoints.
 *
 * Example: "Generate a new T5 Legion boss encounter"
 *   → Step 1: Loremaster generates name + backstory
 *   → Step 2: Balance Engineer generates stats
 *   → Step 3: Art Director generates sprite prompt
 *   → Step 4: Image gen creates boss sprite → R2
 *   → Step 5: Return full boss data JSON
 */

import { Hono } from 'hono';
import type { Env, AgentRequest, AgentResponse, AgentStep, ApiResponse, ChatMessage } from '../types';
import { resolveModel, getModel, AGENT_MODELS, AVATAR_VOICES } from '../models';
import { getUser, getRequestId } from '../auth';
import { uploadToR2, generateAssetPath } from '../storage';

const agentRoute = new Hono<{ Bindings: Env }>();

// ── Tool Definitions (sent to the model for function calling) ────────────────

const AVAILABLE_TOOLS = {
  image_gen: {
    type: 'function' as const,
    function: {
      name: 'image_gen',
      description: 'Generate an image from a text prompt. Returns a CDN URL. Use for sprites, portraits, scene art, UI assets.',
      parameters: {
        type: 'object',
        properties: {
          prompt:      { type: 'string', description: 'Detailed image generation prompt' },
          transparent: { type: 'boolean', description: 'True for sprite sheets / game assets with alpha (forces gpt-image-1.5)' },
          size:        { type: 'string', description: 'Image size: 1024x1024 (default), 512x512, etc.' },
          r2_path:     { type: 'string', description: 'Optional R2 storage path for the generated image' },
          model:       { type: 'string', description: 'Model override. Options: gpt-image-1.5 (default, transparency), gpt-image-2 (quality), recraftv3 (logos/text), wan-2.6-image (bulk/free), grok-imagine-image (inpaint/edit)' },
        },
        required: ['prompt'],
      },
    },
  },

  lore_lookup: {
    type: 'function' as const,
    function: {
      name: 'lore_lookup',
      description: 'Query Grudge Warlords lore. Returns faction details, race info, god descriptions, world events. Use to maintain narrative consistency.',
      parameters: {
        type: 'object',
        properties: {
          query:   { type: 'string', description: 'Lore query (e.g. "Legion faction history", "Orc race traits")' },
          context: { type: 'string', description: 'Additional context for the lore query' },
        },
        required: ['query'],
      },
    },
  },

  balance_calc: {
    type: 'function' as const,
    function: {
      name: 'balance_calc',
      description: 'Calculate game balance stats. Given a tier, class, and level, returns recommended attribute ranges, HP, damage, and encounter difficulty.',
      parameters: {
        type: 'object',
        properties: {
          tier:  { type: 'number', description: 'Content tier (1-5). T1=Acolytes, T5=Primordials.' },
          class: { type: 'string', description: 'Enemy class type (e.g. "boss", "elite", "minion")' },
          level: { type: 'number', description: 'Enemy level (1-100)' },
        },
        required: ['tier'],
      },
    },
  },

  chat: {
    type: 'function' as const,
    function: {
      name: 'chat',
      description: 'Send a follow-up chat message to a specific Legion agent persona for specialized input.',
      parameters: {
        type: 'object',
        properties: {
          agent:   { type: 'string', description: 'Agent persona: code_architect, art_director, loremaster, balance_engineer, qa_analyst, mission_designer' },
          message: { type: 'string', description: 'The message/question to send to the agent' },
          model:   { type: 'string', description: 'Model override (default: agent-specific). Options: claude-opus-4.7 (reasoning), gpt-5.5 (flagship), gpt-5.4-pro (fast), kimi-k2.6 (agentic/262k ctx), qwen3-max (budget)' },
        },
        required: ['agent', 'message'],
      },
    },
  },

  video_gen: {
    type: 'function' as const,
    function: {
      name: 'video_gen',
      description: 'Generate a video from a text prompt (async). Returns a job_id that can be polled with poll_job. Use for cinematics, trailers, splash animations.',
      parameters: {
        type: 'object',
        properties: {
          prompt:          { type: 'string', description: 'Detailed video generation prompt' },
          duration:        { type: 'number', description: 'Video duration in seconds (3-16)' },
          aspect_ratio:    { type: 'string', description: 'Aspect ratio: 16:9 (default), 9:16, 1:1' },
          audio:           { type: 'boolean', description: 'Include generated audio/SFX (default true)' },
          reference_image:  { type: 'string', description: 'URL of a reference image for image-to-video' },
          model:           { type: 'string', description: 'Model override. Options: seedance-2.0 (best, audio), seedance-2.0-fast (preview), grok-imagine-video (edit/extend+audio), gen-4.5 (image-to-video), hh1-t2v (budget), hh1-i2v (image-to-video budget), v6 (15s+audio), v5.6 (1080p), q3-turbo (fast 16s), q3-pro (quality 16s)' },
        },
        required: ['prompt'],
      },
    },
  },

  speech_gen: {
    type: 'function' as const,
    function: {
      name: 'speech_gen',
      description: 'Generate speech audio from text (synchronous). Returns a CDN URL to the audio file. Use for NPC dialogue, narrator voiceover, UI feedback.',
      parameters: {
        type: 'object',
        properties: {
          text:     { type: 'string', description: 'The text to speak' },
          avatar:   { type: 'string', description: 'Grudge avatar voice preset: crusade-ninja (energetic), legion-viking (commanding), fabled-mage (wise)' },
          voice:    { type: 'string', description: 'Raw voice ID override: alloy, echo, fable, onyx, nova, shimmer' },
          language: { type: 'string', description: 'Language code (e.g. en, es, ja). Default: en' },
          model:    { type: 'string', description: 'TTS model (default: tts-2). Currently only tts-2 (Inworld, expressive, 15 languages)' },
        },
        required: ['text'],
      },
    },
  },

  music_gen: {
    type: 'function' as const,
    function: {
      name: 'music_gen',
      description: 'Generate a music track from a text prompt (async). Returns a job_id that can be polled with poll_job. Use for faction themes, battle music, ambient tavern audio.',
      parameters: {
        type: 'object',
        properties: {
          prompt:       { type: 'string', description: 'Music style/mood description (e.g. "epic dark fantasy battle theme")' },
          lyrics:       { type: 'string', description: 'Optional lyrics for vocal tracks' },
          bpm:          { type: 'number', description: 'Beats per minute (60-200)' },
          key:          { type: 'string', description: 'Musical key (e.g. "C minor", "D major")' },
          instrumental: { type: 'boolean', description: 'Instrumental only, no vocals (default true)' },
          duration:     { type: 'number', description: 'Track duration in seconds' },
          model:        { type: 'string', description: 'Music model (default: music-2.6). Currently only music-2.6 (MiniMax, vocals/instrumental, BPM/key control)' },
        },
        required: ['prompt'],
      },
    },
  },

  poll_job: {
    type: 'function' as const,
    function: {
      name: 'poll_job',
      description: 'Check the status of an async generation job (video or music). When wait=true, blocks until the job completes or the timeout expires. Returns status and result URL when done.',
      parameters: {
        type: 'object',
        properties: {
          job_id:     { type: 'string',  description: 'The job ID returned by video_gen or music_gen' },
          wait:       { type: 'boolean', description: 'If true, poll repeatedly until the job finishes (default false)' },
          timeout_ms: { type: 'number',  description: 'Max wait time in ms when wait=true (default 25000, max 25000)' },
        },
        required: ['job_id'],
      },
    },
  },
};

// ── Async Job Polling ────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_TIMEOUT_MS = 25_000; // leave 5s margin for Workers 30s wall-clock

/**
 * Poll D1 for a job's status, optionally waiting with backoff.
 * Used by both the poll_job tool executor and the auto-await logic in the loop.
 */
async function pollJobWithWait(
  env: Env,
  jobId: string,
  wait: boolean,
  timeoutMs: number = MAX_POLL_TIMEOUT_MS,
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + Math.min(timeoutMs, MAX_POLL_TIMEOUT_MS);

  while (true) {
    const row = await env.JOBS_DB.prepare(
      'SELECT id, type, status, model, result, error, created_at, updated_at, completed_at FROM jobs WHERE id = ?'
    ).bind(jobId).first();

    if (!row) return { error: 'Job not found', job_id: jobId };

    const status = row.status as string;

    // Terminal states — return immediately
    if (status === 'completed' || status === 'failed') {
      return {
        job_id: row.id,
        type: row.type,
        status,
        model: row.model,
        result: row.result ? JSON.parse(row.result as string) : undefined,
        error: row.error || undefined,
        created_at: row.created_at,
        completed_at: row.completed_at || undefined,
      };
    }

    // Not waiting, or deadline passed — return current state
    if (!wait || Date.now() >= deadline) {
      return {
        job_id: row.id,
        type: row.type,
        status,
        model: row.model,
        created_at: row.created_at,
        ...(wait ? { timed_out: true, waited_ms: timeoutMs } : {}),
      };
    }

    // Sleep before next poll
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
}

// ── Agent System Prompt ──────────────────────────────────────────────────────

const AGENT_SYSTEM_PROMPT = `You are the Grudge Studio AI Orchestrator. You break complex game development tasks into discrete steps and execute them using available tools.

RULES:
- Plan your approach before executing. Think step-by-step.
- Use the most appropriate tool for each step.
- When generating game content, ensure consistency with Grudge Warlords lore (3 factions: Crusade, Legion, Fabled; 6 races; dark fantasy tone).
- Return structured JSON as your final output when the task requests data.
- Stay focused on the task. Do not deviate or add unnecessary steps.
- Maximum ${5} steps per task unless the user specifies otherwise.

AVAILABLE TOOLS:
- image_gen: Generate sprites, portraits, scene art, UI assets (sync)
- video_gen: Generate cinematics, trailers, splash animations (async — auto-awaited up to 25s)
- speech_gen: Generate NPC dialogue audio, narrator voiceover (sync)
- music_gen: Generate faction themes, battle/ambient music (async — auto-awaited up to 25s)
- poll_job: Check status of a previously created async job (only needed for jobs from earlier pipeline runs)
- lore_lookup: Query faction/race/god/world lore for consistency
- balance_calc: Calculate stats, HP, damage, encounter difficulty
- chat: Consult a specialist agent (code, art, lore, balance, QA, mission)

ASYNC BEHAVIOR:
When you call video_gen or music_gen, the system automatically waits up to 25 seconds for the job to finish.
If it finishes in time, you receive the CDN URL directly — no need to call poll_job.
If it does not finish in time, you receive a job_id with status "processing".
Do NOT manually call poll_job after video_gen or music_gen — it is handled for you.
Only use poll_job to check jobs from a previous, separate pipeline invocation.

MODEL SELECTION GUIDE:
Every generation tool accepts an optional "model" parameter. Omit it to use the smart default.

Image models (image_gen):
  gpt-image-1.5  — DEFAULT. Transparent PNGs. Use for sprites, game assets with alpha.
  gpt-image-2    — Highest quality. Scene art, backgrounds, loading screens. NO transparency.
  recraftv3      — Design-grade. Faction logos, UI elements, accurate text rendering.
  wan-2.6-image  — Free tier. Concept art, bulk generation, early iteration.
  grok-imagine-image — Inpainting and reference-image edits. Use with reference_image.

Video models (video_gen):
  seedance-2.0      — DEFAULT. Best quality + native audio. Up to 9 ref images.
  seedance-2.0-fast — Faster previews. Same provider, lower quality.
  grok-imagine-video — Edit/extend existing clips. Generates dialogue, SFX, music audio.
  gen-4.5           — Image-to-video. Best for splash screens from a still.
  hh1-t2v / hh1-i2v — Budget text/image-to-video. 3-15s, 720p/1080p.
  v6 / v5.6         — Budget with audio. Up to 15s, 1080p.
  q3-turbo / q3-pro — Fast/quality. Up to 16s with start/end frame control.

Chat models (chat tool):
  claude-opus-4.7   — Best reasoning. Code Architect, QA Analyst.
  gpt-5.5           — Flagship creative. Loremaster, Mission Designer, Art Director.
  gpt-5.4-pro       — Fast low-latency. Quick questions.
  kimi-k2.6         — 262k context + tool calling. Long documents, agentic loops.
  qwen3-max         — Budget. Balance Engineer, bulk analysis.

Speech: tts-2 (Inworld, expressive, 15 languages). Only model available.
Music: music-2.6 (MiniMax, vocals/instrumental, BPM/key). Only model available.`;

// ── Tool Executors ───────────────────────────────────────────────────────────

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  env: Env,
  cfAccountId: string,
  gatewayToken: string,
): Promise<string> {
  switch (toolName) {
    case 'image_gen': {
      // Resolve model: transparent forces gpt-image-1.5, otherwise respect arg or default
      const imgModel = args.transparent
        ? 'gpt-image-1.5'
        : resolveModel(args.model as string | undefined, 'image');
      const imgProvider = getModel(imgModel)?.provider ?? 'openai';
      const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${cfAccountId}/grudge-ai-gateway/${imgProvider}/images/generations`;
      const res = await fetch(gatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-aig-authorization': `Bearer ${gatewayToken}`,
        },
        body: JSON.stringify({
          model: imgModel,
          prompt: args.prompt as string,
          n: 1,
          size: (args.size as string) || '1024x1024',
          response_format: 'b64_json',
          ...(args.transparent ? { background: 'transparent' } : {}),
        }),
      });

      if (!res.ok) {
        return JSON.stringify({ error: `Image generation failed: ${res.status}` });
      }

      const json = await res.json() as { data: Array<{ b64_json?: string }> };
      const b64 = json.data?.[0]?.b64_json;
      if (!b64) return JSON.stringify({ error: 'No image data returned' });

      // Upload to R2
      const r2Path = (args.r2_path as string) || generateAssetPath('images', 'png');
      const upload = await uploadToR2(env, r2Path, b64);
      return JSON.stringify({ url: upload.cdn_url, r2_path: upload.r2_path });
    }

    case 'lore_lookup': {
      // Use loremaster agent for lore queries
      const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${cfAccountId}/grudge-ai-gateway/openai/chat/completions`;
      const res = await fetch(gatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-aig-authorization': `Bearer ${gatewayToken}`,
        },
        body: JSON.stringify({
          model: AGENT_MODELS.loremaster,
          messages: [
            { role: 'system', content: 'You are the Grudge Warlords Loremaster. Answer lore questions concisely with canonical details. Return JSON when possible.' },
            { role: 'user', content: `Lore query: ${args.query}${args.context ? `\nContext: ${args.context}` : ''}` },
          ],
          temperature: 0.6,
          max_tokens: 800,
        }),
      });

      if (!res.ok) return JSON.stringify({ error: `Lore lookup failed: ${res.status}` });
      const json = await res.json() as { choices: Array<{ message: { content: string } }> };
      return json.choices?.[0]?.message?.content ?? 'No lore found.';
    }

    case 'balance_calc': {
      const tier = (args.tier as number) || 1;
      const level = (args.level as number) || tier * 20;
      const enemyClass = (args.class as string) || 'minion';

      // Deterministic balance formulas matching the game's system
      const baseHP = { minion: 80, elite: 200, boss: 500 }[enemyClass] ?? 100;
      const scaledHP = Math.round(baseHP * (1 + (level - 1) * 0.12) * (1 + (tier - 1) * 0.4));
      const baseDmg = { minion: 8, elite: 15, boss: 25 }[enemyClass] ?? 10;
      const scaledDmg = Math.round(baseDmg * (1 + (level - 1) * 0.08) * (1 + (tier - 1) * 0.35));
      const attrs = Math.round(10 + level * 0.5 + tier * 3);

      return JSON.stringify({
        tier, level, class: enemyClass,
        hp: scaledHP,
        damage: scaledDmg,
        attribute_budget: attrs,
        xp_reward: Math.round(scaledHP * 0.4 + scaledDmg * 2),
        gold_reward: Math.round(scaledHP * 0.1 + tier * 15),
        difficulty_rating: `T${tier} ${enemyClass.toUpperCase()}`,
      });
    }

    case 'chat': {
      const agentId = args.agent as string;
      const model = resolveModel(args.model as string | undefined, 'chat', agentId);
      const chatProvider = getModel(model)?.provider ?? 'openai';
      const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${cfAccountId}/grudge-ai-gateway/${chatProvider}/chat/completions`;

      const res = await fetch(gatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-aig-authorization': `Bearer ${gatewayToken}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: args.message as string }],
          temperature: 0.5,
          max_tokens: 1200,
        }),
      });

      if (!res.ok) return JSON.stringify({ error: `Agent chat failed: ${res.status}` });
      const json = await res.json() as { choices: Array<{ message: { content: string } }> };
      return json.choices?.[0]?.message?.content ?? 'No response.';
    }

    case 'video_gen': {
      // Async — enqueue to job queue, return job_id for polling
      const videoModel = resolveModel(args.model as string | undefined, 'video');
      const jobId = crypto.randomUUID();

      const videoReq = {
        prompt: args.prompt as string,
        duration: args.duration as number | undefined,
        aspect_ratio: args.aspect_ratio as string | undefined,
        audio: (args.audio as boolean) ?? true,
        reference_image: args.reference_image as string | undefined,
        upload_to_r2: true,
      };

      await env.JOB_QUEUE.send({
        job_id: jobId,
        type: 'video',
        model: videoModel,
        request: videoReq,
        grudge_id: 'agent-pipeline',
      });

      await env.JOBS_DB.prepare(
        `INSERT INTO jobs (id, type, status, model, request, grudge_id, created_at, updated_at)
         VALUES (?, ?, 'queued', ?, ?, ?, datetime('now'), datetime('now'))`
      ).bind(jobId, 'video', videoModel, JSON.stringify(videoReq), 'agent-pipeline').run();

      return JSON.stringify({ job_id: jobId, status: 'queued', model: videoModel, note: 'Use poll_job to check when complete' });
    }

    case 'speech_gen': {
      // Synchronous — TTS is fast (<5s)
      const speechModel = resolveModel(args.model as string | undefined, 'speech');
      const speechProvider = getModel(speechModel)?.provider ?? 'inworld';
      const avatarVoice = args.avatar ? AVATAR_VOICES[args.avatar as string] : undefined;
      const voice = (args.voice as string) ?? avatarVoice?.voice ?? 'nova';

      const speechUrl = `https://gateway.ai.cloudflare.com/v1/${cfAccountId}/grudge-ai-gateway/${speechProvider}/audio/speech`;
      const res = await fetch(speechUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-aig-authorization': `Bearer ${gatewayToken}`,
        },
        body: JSON.stringify({
          model: speechModel,
          input: args.text as string,
          voice,
          ...(args.language ? { language: args.language as string } : {}),
        }),
      });

      if (!res.ok) {
        return JSON.stringify({ error: `Speech generation failed: ${res.status}` });
      }

      const audioBuffer = await res.arrayBuffer();
      const r2Path = generateAssetPath('audio', 'mp3');
      const upload = await uploadToR2(env, r2Path, audioBuffer, 'audio/mpeg');

      return JSON.stringify({ url: upload.cdn_url, r2_path: upload.r2_path, voice, model: speechModel, size: upload.size });
    }

    case 'music_gen': {
      // Async — enqueue to job queue
      const musicModel = resolveModel(args.model as string | undefined, 'music');
      const jobId = crypto.randomUUID();

      const musicReq = {
        prompt: args.prompt as string,
        lyrics: args.lyrics as string | undefined,
        bpm: args.bpm as number | undefined,
        key: args.key as string | undefined,
        instrumental: (args.instrumental as boolean) ?? true,
        duration: args.duration as number | undefined,
        upload_to_r2: true,
      };

      await env.JOB_QUEUE.send({
        job_id: jobId,
        type: 'music',
        model: musicModel,
        request: musicReq,
        grudge_id: 'agent-pipeline',
      });

      await env.JOBS_DB.prepare(
        `INSERT INTO jobs (id, type, status, model, request, grudge_id, created_at, updated_at)
         VALUES (?, ?, 'queued', ?, ?, ?, datetime('now'), datetime('now'))`
      ).bind(jobId, 'music', musicModel, JSON.stringify(musicReq), 'agent-pipeline').run();

      return JSON.stringify({ job_id: jobId, status: 'queued', model: musicModel, note: 'Use poll_job to check when complete' });
    }

    case 'poll_job': {
      const jobId = args.job_id as string;
      if (!jobId) return JSON.stringify({ error: 'job_id is required' });

      const shouldWait = (args.wait as boolean) ?? false;
      const timeout = Math.min((args.timeout_ms as number) || MAX_POLL_TIMEOUT_MS, MAX_POLL_TIMEOUT_MS);

      const result = await pollJobWithWait(env, jobId, shouldWait, timeout);
      return JSON.stringify(result);
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// ── Route ────────────────────────────────────────────────────────────────────

agentRoute.post('/', async (c) => {
  const requestId = getRequestId(c);
  const user = getUser(c);
  const startTime = Date.now();

  let body: AgentRequest;
  try {
    body = await c.req.json<AgentRequest>();
  } catch {
    return c.json<ApiResponse>({ ok: false, error: 'Invalid JSON body', request_id: requestId }, 400);
  }

  if (!body.task?.trim()) {
    return c.json<ApiResponse>({ ok: false, error: 'task is required', request_id: requestId }, 400);
  }

  const maxSteps = Math.min(body.max_steps ?? 5, 10); // Cap at 10
  const modelId = resolveModel(body.model, 'chat', 'code_architect');
  const modelDef = getModel(modelId);

  // Filter tools to only requested ones (or all if none specified)
  const requestedTools = body.tools?.length
    ? body.tools.filter(t => t in AVAILABLE_TOOLS)
    : Object.keys(AVAILABLE_TOOLS);

  const toolDefs = requestedTools.map(t => AVAILABLE_TOOLS[t as keyof typeof AVAILABLE_TOOLS]);

  // Build initial conversation
  const messages: ChatMessage[] = [
    { role: 'system', content: AGENT_SYSTEM_PROMPT.replace('${5}', String(maxSteps)) },
    { role: 'user', content: body.task },
  ];

  if (body.context) {
    messages.push({ role: 'user', content: `Context: ${JSON.stringify(body.context)}` });
  }

  const ASYNC_TOOLS = new Set(['video_gen', 'music_gen']);

  const steps: AgentStep[] = [];
  let totalTokens = 0;
  let finalResult: unknown = null;
  const pendingJobs: Array<{ job_id: string; type: string; model: string; status: string }> = [];

  try {
    for (let step = 0; step < maxSteps; step++) {
      const stepStart = Date.now();

      // Call the agentic model
      const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${c.env.CF_ACCOUNT_ID}/grudge-ai-gateway/${modelDef?.provider ?? 'openai'}/chat/completions`;

      const aiResponse = await fetch(gatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-aig-authorization': `Bearer ${c.env.CF_AI_GATEWAY_TOKEN ?? ''}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          tools: toolDefs,
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        throw new Error(`Agent model error (step ${step + 1}): ${aiResponse.status} — ${errorText.slice(0, 300)}`);
      }

      const result = await aiResponse.json() as {
        choices: Array<{
          message: {
            content?: string;
            tool_calls?: Array<{
              id: string;
              function: { name: string; arguments: string };
            }>;
          };
          finish_reason: string;
        }>;
        usage?: { total_tokens: number };
      };

      const choice = result.choices?.[0];
      const stepTokens = result.usage?.total_tokens ?? 0;
      totalTokens += stepTokens;

      // No tool calls → model is done, this is the final answer
      if (!choice?.message?.tool_calls?.length) {
        const content = choice?.message?.content ?? '';
        steps.push({
          step: step + 1,
          agent: body.agent || 'orchestrator',
          model: modelId,
          action: 'final_answer',
          input: body.task,
          output: content,
          tokens: stepTokens,
          duration_ms: Date.now() - stepStart,
        });

        // Try to parse as JSON for structured output
        try { finalResult = JSON.parse(content); } catch { finalResult = content; }
        break;
      }

      // Process tool calls — collect async job IDs for auto-await
      const asyncJobIds: Array<{ jobId: string; toolName: string }> = [];

      for (const toolCall of choice.message.tool_calls) {
        const toolName = toolCall.function.name;
        let toolArgs: Record<string, unknown>;
        try {
          toolArgs = JSON.parse(toolCall.function.arguments);
        } catch {
          toolArgs = {};
        }

        const toolOutput = await executeTool(
          toolName,
          toolArgs,
          c.env,
          c.env.CF_ACCOUNT_ID,
          c.env.CF_AI_GATEWAY_TOKEN ?? '',
        );

        steps.push({
          step: step + 1,
          agent: body.agent || 'orchestrator',
          model: modelId,
          action: `tool:${toolName}`,
          input: JSON.stringify(toolArgs),
          output: toolOutput.slice(0, 2000),
          tool_used: toolName,
          tokens: stepTokens,
          duration_ms: Date.now() - stepStart,
        });

        // Track async tools for auto-await
        if (ASYNC_TOOLS.has(toolName)) {
          try {
            const parsed = JSON.parse(toolOutput);
            if (parsed.job_id) asyncJobIds.push({ jobId: parsed.job_id, toolName });
          } catch { /* not JSON, skip */ }
        }

        // Feed tool result back into conversation
        messages.push({ role: 'assistant', content: `[Calling ${toolName}(${JSON.stringify(toolArgs)})]` });
        messages.push({ role: 'user', content: `Tool result (${toolName}): ${toolOutput}` });
      }

      // ── Auto-await async jobs ─────────────────────────────────────────────
      // After processing all tool calls in this step, wait for any async jobs
      // to reach a terminal state.  This replaces manual poll_job calls.
      if (asyncJobIds.length > 0) {
        const remaining = MAX_POLL_TIMEOUT_MS - (Date.now() - stepStart);
        const perJobTimeout = Math.max(5_000, Math.floor(Math.min(remaining, MAX_POLL_TIMEOUT_MS) / asyncJobIds.length));

        for (const { jobId, toolName } of asyncJobIds) {
          const pollResult = await pollJobWithWait(c.env, jobId, true, perJobTimeout);
          const status = pollResult.status as string;

          if (status === 'completed' || status === 'failed') {
            // Replace the "queued" message in conversation with the real result
            const resolved = JSON.stringify(pollResult);
            messages.push({
              role: 'user',
              content: `Async result (${toolName} job ${jobId}): ${resolved}`,
            });

            steps.push({
              step: step + 1,
              agent: 'system',
              model: '',
              action: `await:${toolName}`,
              input: jobId,
              output: resolved.slice(0, 2000),
              tool_used: 'poll_job',
              tokens: 0,
              duration_ms: Date.now() - stepStart,
            });
          } else {
            // Still running — track as pending
            pendingJobs.push({
              job_id: jobId,
              type: (pollResult.type as string) || toolName.replace('_gen', ''),
              model: (pollResult.model as string) || '',
              status,
            });
            messages.push({
              role: 'user',
              content: `Async job ${jobId} (${toolName}) is still ${status} after waiting. The client can poll /v1/jobs/${jobId} for the result.`,
            });
          }
        }
      }
    }

    // If we exhausted all steps without a final answer, use the last step output
    if (finalResult === null && steps.length > 0) {
      finalResult = steps[steps.length - 1].output;
    }

    const response: AgentResponse = {
      id: requestId,
      task: body.task,
      steps,
      result: finalResult,
      total_tokens: totalTokens,
      duration_ms: Date.now() - startTime,
    };

    // Attach pending jobs if any didn't resolve in time
    const responseData: Record<string, unknown> = { ...response };
    if (pendingJobs.length > 0) {
      responseData.pending_jobs = pendingJobs;
    }

    return c.json<ApiResponse>({
      ok: true,
      data: responseData,
      request_id: requestId,
    });
  } catch (error) {
    console.error('Agent route error:', error);
    return c.json<ApiResponse>({
      ok: false,
      error: error instanceof Error ? error.message : 'Internal error',
      request_id: requestId,
    }, 500);
  }
});

export default agentRoute;
