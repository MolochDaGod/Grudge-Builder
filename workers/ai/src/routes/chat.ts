/**
 * POST /v1/chat — Text generation via Cloudflare AI Gateway.
 *
 * Supports:
 * - Direct model selection (any of 7 chat models)
 * - Legion agent personas (auto-injects system prompt + selects model)
 * - Tool calling (kimi-k2.6 native support)
 * - Streaming (optional)
 */

import { Hono } from 'hono';
import type { Env, ChatRequest, ChatResponse, ApiResponse } from '../types';
import { resolveModel, getModel, AGENT_MODELS } from '../models';
import { getUser, getRequestId } from '../auth';

// ── Agent System Prompts (mirror aiAgentService.js) ──────────────────────────

const AGENT_PROMPTS: Record<string, { systemPrompt: string; temperature: number; maxTokens: number }> = {
  code_architect: {
    systemPrompt: `You are a senior game developer for Grudge Studio, specializing in:
- Three.js game development (no Babylon)
- TypeScript/JavaScript best practices
- React frontend architecture
- Node.js/Express backend systems
- Database design with Drizzle ORM and PostgreSQL
- WebSocket multiplayer with Colyseus
- Performance optimization for web games
Always provide concise, modern, production-ready code. Follow existing project patterns.`,
    temperature: 0.3,
    maxTokens: 2000,
  },
  art_director: {
    systemPrompt: `You are the Art Director for Grudge Warlords, a dark fantasy RPG. You specialize in:
- Sprite design, pixel art, and voxel art direction
- Isometric game asset creation
- UI/UX design for fantasy games
- Color palette and visual consistency
- Animation principles for game sprites
When generating prompts for AI image generation, be extremely detailed and specific.`,
    temperature: 0.7,
    maxTokens: 1500,
  },
  loremaster: {
    systemPrompt: `You are the Loremaster for Grudge Warlords. You maintain the game's narrative:
- The Sundering event that shattered the Worldboard
- Three factions: Crusade, Legion, and Fabled
- Three gods: Odin, Madra, and The Omni
- Six playable races and four character classes
- Island-based world with sailing and conquest
Keep quest descriptions under 100 words. NPC dialogue should be atmospheric but brief.`,
    temperature: 0.8,
    maxTokens: 800,
  },
  balance_engineer: {
    systemPrompt: `You are the Game Balance Engineer for Grudge Warlords RPG. You understand:
- 8 core attributes: STR, VIT, END, INT, WIS, DEX, AGI, TAC
- 19 secondary stats derived from attributes
- Diminishing returns after 25 attribute points
- Turn-based combat with block/crit mechanics
- 5-tier enemy scaling (Acolytes to Primordials)
- Profession XP and crafting progression
Provide numerical recommendations with clear reasoning.`,
    temperature: 0.2,
    maxTokens: 1200,
  },
  qa_analyst: {
    systemPrompt: `You are the QA Lead for Grudge Warlords. You excel at:
- Identifying edge cases and potential bugs
- Writing test scenarios and reproduction steps
- Analyzing error logs and stack traces
- Performance profiling recommendations
Be thorough but practical. Prioritize issues by severity.`,
    temperature: 0.1,
    maxTokens: 1000,
  },
  mission_designer: {
    systemPrompt: `You are the Mission Designer for Grudge Warlords. You create:
- Dynamic quests with branching objectives
- Arena encounter designs with enemy compositions
- Dungeon layouts with procedural elements
- Boss fight mechanics and phases
Format mission data as JSON when requested. Include tier, faction, and lore context.`,
    temperature: 0.6,
    maxTokens: 1500,
  },
};

// ── Route ────────────────────────────────────────────────────────────────────

const chatRoute = new Hono<{ Bindings: Env }>();

chatRoute.post('/', async (c) => {
  const requestId = getRequestId(c);
  const user = getUser(c);

  let body: ChatRequest;
  try {
    body = await c.req.json<ChatRequest>();
  } catch {
    return c.json<ApiResponse>({ ok: false, error: 'Invalid JSON body', request_id: requestId }, 400);
  }

  if (!body.messages?.length) {
    return c.json<ApiResponse>({ ok: false, error: 'messages array required', request_id: requestId }, 400);
  }

  // Resolve model
  const modelId = resolveModel(body.model, 'chat', body.agent);
  const modelDef = getModel(modelId);

  // Build messages with agent system prompt
  const messages = [...body.messages];
  if (body.agent && AGENT_PROMPTS[body.agent]) {
    const agentConfig = AGENT_PROMPTS[body.agent];
    // Prepend system prompt if not already present
    if (!messages.some(m => m.role === 'system')) {
      messages.unshift({ role: 'system', content: agentConfig.systemPrompt });
    }
  }

  const temperature = body.temperature ?? AGENT_PROMPTS[body.agent ?? '']?.temperature ?? 0.5;
  const maxTokens = body.max_tokens ?? AGENT_PROMPTS[body.agent ?? '']?.maxTokens ?? 1500;

  try {
    // Route through Cloudflare AI Gateway
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
        temperature,
        max_tokens: maxTokens,
        ...(body.tools ? { tools: body.tools } : {}),
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`AI Gateway error (${modelId}):`, errorText);
      return c.json<ApiResponse>({
        ok: false,
        error: `Model ${modelId} returned ${aiResponse.status}`,
        request_id: requestId,
      }, 502);
    }

    const result = await aiResponse.json() as Record<string, unknown>;
    const choices = result.choices as Array<{ message: { content: string; tool_calls?: unknown[] } }>;
    const firstChoice = choices?.[0];

    const response: ChatResponse = {
      id: requestId,
      model: modelId,
      content: firstChoice?.message?.content ?? '',
      usage: result.usage as ChatResponse['usage'],
      tool_calls: firstChoice?.message?.tool_calls as ChatResponse['tool_calls'],
    };

    return c.json<ApiResponse<ChatResponse>>({
      ok: true,
      data: response,
      request_id: requestId,
    });
  } catch (error) {
    console.error('Chat route error:', error);
    return c.json<ApiResponse>({
      ok: false,
      error: error instanceof Error ? error.message : 'Internal error',
      request_id: requestId,
    }, 500);
  }
});

export default chatRoute;
