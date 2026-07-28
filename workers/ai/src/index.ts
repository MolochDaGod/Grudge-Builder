/**
 * Grudge AI Gateway Worker — Main Entry
 *
 * Unified AI model hub at ai.grudge-studio.com.
 * Routes all AI calls through Cloudflare AI Gateway to 137+ models.
 *
 * Endpoints:
 *   POST /v1/chat    — text generation (7 models, Legion agent personas)
 *   POST /v1/image   — text-to-image (5 models, transparent PNG, R2 upload)
 *   POST /v1/video   — text-to-video (async, 10 models)
 *   POST /v1/speech  — TTS (avatar voice mapping)
 *   POST /v1/music   — music generation (async)
 *   POST /v1/agent   — self-prompting pipeline (multi-step autonomous)
 *   GET  /v1/jobs/:id — poll async job status
 *   GET  /v1/models   — list available models
 *   GET  /health      — health check (public, no auth)
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, ApiResponse } from './types';
import { authMiddleware, getRequestId } from './auth';
import { MODEL_REGISTRY, DEFAULTS, getModelsByCapability } from './models';
import chatRoute from './routes/chat';
import imageRoute from './routes/image';
import mediaRoute from './routes/media';
import agentRoute from './routes/agent';
import rapierRoute from './routes/rapier';
import { handleQueue } from './queue';

const app = new Hono<{ Bindings: Env }>();

// ── CORS ─────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/grudgewarlords\.com$/,
  /^https:\/\/grudge-studio\.com$/,
  /^https:\/\/grudgestudio\.org$/,
  /^https:\/\/grudgeplatform\.io$/,
  /^https:\/\/[a-z0-9-]+\.grudge-studio\.com$/,
  /^https:\/\/[a-z0-9-]+\.grudgestudio\.com$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^https:\/\/[a-z0-9-]+\.puter\.site$/,
  /^https:\/\/[a-z0-9-]+\.puter\.work$/,
  /^http:\/\/localhost:\d+$/,
];

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return '';
    return ALLOWED_ORIGIN_PATTERNS.some(p => p.test(origin)) ? origin : '';
  },
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// ── Public routes (no auth) ──────────────────────────────────────────────────

app.get('/health', (c) => {
  return c.json({
    ok: true,
    service: 'grudge-ai-gateway',
    version: '1.1.0',
    environment: c.env.ENVIRONMENT,
    models: MODEL_REGISTRY.length,
    rapier: '/v1/rapier/checklist',
    timestamp: new Date().toISOString(),
  });
});

// Rapier fleet physics agent context (public checklist + system prompt)
app.route('/', rapierRoute);

app.get('/v1/models', (c) => {
  return c.json({
    ok: true,
    data: {
      models: MODEL_REGISTRY.map(m => ({
        id: m.id,
        provider: m.provider,
        capability: m.capability,
        cost_tier: m.costTier,
        supports_transparency: m.supportsTransparency ?? false,
        supports_tool_calling: m.supportsToolCalling ?? false,
        supports_audio: m.supportsAudio ?? false,
        max_context: m.maxContext,
        notes: m.notes,
      })),
      defaults: DEFAULTS,
      total: MODEL_REGISTRY.length,
    },
    request_id: crypto.randomUUID(),
  });
});

// ── Auth-protected routes ────────────────────────────────────────────────────

app.use('/v1/*', authMiddleware);

app.route('/v1/chat', chatRoute);
app.route('/v1/image', imageRoute);
app.route('/v1', mediaRoute); // mounts /video, /speech, /music under /v1/
app.route('/v1/agent', agentRoute);

// ── Direct asset upload to R2 (admin only) ────────────────────────────────
// POST /v1/upload-asset  { r2_path: string, content_type?: string }
// Body: raw binary (file), r2_path + content_type in query/headers
app.post('/v1/upload-asset', async (c) => {
  const requestId = getRequestId(c);
  const user = (c as any).grudgeUser;

  // Admin-only check
  if (user?.tier !== 'master_admin' && user?.tier !== 'admin') {
    return c.json<ApiResponse>({
      ok: false, error: 'Admin access required for asset uploads', request_id: requestId,
    }, 403);
  }

  const r2Path = c.req.query('path') || c.req.header('X-R2-Path');
  if (!r2Path) {
    return c.json<ApiResponse>({
      ok: false, error: 'Missing r2_path (query param "path" or header "X-R2-Path")', request_id: requestId,
    }, 400);
  }

  try {
    const body = await c.req.arrayBuffer();
    if (body.byteLength === 0) {
      return c.json<ApiResponse>({ ok: false, error: 'Empty body', request_id: requestId }, 400);
    }

    const ext = r2Path.split('.').pop()?.toLowerCase() ?? '';
    const ctMap: Record<string, string> = {
      glb: 'model/gltf-binary', gltf: 'model/gltf+json',
      png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp',
      json: 'application/json', mp3: 'audio/mpeg',
    };
    const contentType = c.req.query('content_type') || ctMap[ext] || 'application/octet-stream';

    const key = r2Path.replace(/^\/+/, '');
    const obj = await c.env.ASSETS.put(key, body, {
      httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' },
      customMetadata: { uploaded_by: user?.grudge_id || 'admin', uploaded_at: new Date().toISOString() },
    });

    return c.json<ApiResponse>({
      ok: true,
      data: {
        r2_path: key,
        cdn_url: `${c.env.ASSETS_CDN_URL}/${key}`,
        size: body.byteLength,
        etag: obj.etag,
        content_type: contentType,
      },
      request_id: requestId,
    });
  } catch (error) {
    return c.json<ApiResponse>({
      ok: false, error: error instanceof Error ? error.message : 'Upload failed', request_id: requestId,
    }, 500);
  }
});

// ── Job polling ──────────────────────────────────────────────────────────────

app.get('/v1/jobs/:id', async (c) => {
  const jobId = c.req.param('id');
  const requestId = getRequestId(c);

  try {
    const result = await c.env.JOBS_DB.prepare(
      'SELECT id, type, status, model, result, error, created_at, updated_at, completed_at FROM jobs WHERE id = ?'
    ).bind(jobId).first();

    if (!result) {
      return c.json<ApiResponse>({ ok: false, error: 'Job not found', request_id: requestId }, 404);
    }

    return c.json<ApiResponse>({
      ok: true,
      data: {
        job_id: result.id,
        type: result.type,
        status: result.status,
        model: result.model,
        result: result.result ? JSON.parse(result.result as string) : undefined,
        error: result.error,
        created_at: result.created_at,
        updated_at: result.updated_at,
        completed_at: result.completed_at,
      },
      request_id: requestId,
    });
  } catch (error) {
    return c.json<ApiResponse>({
      ok: false,
      error: error instanceof Error ? error.message : 'Internal error',
      request_id: requestId,
    }, 500);
  }
});

// ── 404 fallback ─────────────────────────────────────────────────────────────

app.notFound((c) => {
  return c.json<ApiResponse>({
    ok: false,
    error: `Route not found: ${c.req.method} ${c.req.path}`,
    request_id: crypto.randomUUID(),
  }, 404);
});

// ── Error handler ────────────────────────────────────────────────────────────

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json<ApiResponse>({
    ok: false,
    error: err.message || 'Internal Server Error',
    request_id: crypto.randomUUID(),
  }, 500);
});

// ── Worker Export ────────────────────────────────────────────────────────────
// Cloudflare Workers with Queues must export an object with both `fetch` and
// `queue` handlers.  The Hono app handles HTTP; the queue handler processes
// async video/music generation jobs.

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    await handleQueue(batch as any, env);
  },
};
