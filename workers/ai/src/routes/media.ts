/**
 * Media generation routes — video, speech, music.
 *
 * Video and music are async (return job_id, polled via /v1/jobs/:id).
 * Speech is synchronous (small TTS payloads).
 */

import { Hono } from 'hono';
import type { Env, VideoRequest, SpeechRequest, MusicRequest, ApiResponse, JobResponse } from '../types';
import { resolveModel, getModel, DEFAULTS, AVATAR_VOICES } from '../models';
import { getUser, getRequestId } from '../auth';
import { uploadToR2, generateAssetPath } from '../storage';

const mediaRoute = new Hono<{ Bindings: Env }>();

// ── POST /v1/video ───────────────────────────────────────────────────────────

mediaRoute.post('/video', async (c) => {
  const requestId = getRequestId(c);
  const user = getUser(c);

  let body: VideoRequest;
  try {
    body = await c.req.json<VideoRequest>();
  } catch {
    return c.json<ApiResponse>({ ok: false, error: 'Invalid JSON body', request_id: requestId }, 400);
  }

  if (!body.prompt?.trim()) {
    return c.json<ApiResponse>({ ok: false, error: 'prompt is required', request_id: requestId }, 400);
  }

  const modelId = resolveModel(body.model, 'video');
  const jobId = crypto.randomUUID();

  try {
    // Enqueue async job
    await c.env.JOB_QUEUE.send({
      job_id: jobId,
      type: 'video',
      model: modelId,
      request: body,
      grudge_id: user.grudge_id,
    });

    // Track in D1
    await c.env.JOBS_DB.prepare(
      `INSERT INTO jobs (id, type, status, model, request, grudge_id, created_at, updated_at)
       VALUES (?, ?, 'queued', ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(jobId, 'video', modelId, JSON.stringify(body), user.grudge_id).run();

    const response: JobResponse = {
      job_id: jobId,
      status: 'queued',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return c.json<ApiResponse<JobResponse>>({ ok: true, data: response, request_id: requestId }, 202);
  } catch (error) {
    console.error('Video route error:', error);
    return c.json<ApiResponse>({
      ok: false,
      error: error instanceof Error ? error.message : 'Internal error',
      request_id: requestId,
    }, 500);
  }
});

// ── POST /v1/speech ──────────────────────────────────────────────────────────

mediaRoute.post('/speech', async (c) => {
  const requestId = getRequestId(c);
  const user = getUser(c);

  let body: SpeechRequest;
  try {
    body = await c.req.json<SpeechRequest>();
  } catch {
    return c.json<ApiResponse>({ ok: false, error: 'Invalid JSON body', request_id: requestId }, 400);
  }

  if (!body.text?.trim()) {
    return c.json<ApiResponse>({ ok: false, error: 'text is required', request_id: requestId }, 400);
  }

  const modelId = resolveModel(body.model, 'speech');
  const modelDef = getModel(modelId);

  // Map avatar to voice preset
  const avatarVoice = body.avatar ? AVATAR_VOICES[body.avatar] : undefined;
  const voice = body.voice ?? avatarVoice?.voice ?? 'nova';

  try {
    const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${c.env.CF_ACCOUNT_ID}/grudge-ai-gateway/${modelDef?.provider ?? 'inworld'}/audio/speech`;

    const aiResponse = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cf-aig-authorization': `Bearer ${c.env.CF_AI_GATEWAY_TOKEN ?? ''}`,
      },
      body: JSON.stringify({
        model: modelId,
        input: body.text,
        voice,
        ...(body.language ? { language: body.language } : {}),
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`Speech error (${modelId}):`, errorText);
      return c.json<ApiResponse>({
        ok: false,
        error: `Model ${modelId} returned ${aiResponse.status}`,
        request_id: requestId,
      }, 502);
    }

    const audioBuffer = await aiResponse.arrayBuffer();

    // Upload to R2 if requested
    if (body.upload_to_r2) {
      const r2Path = body.r2_path || generateAssetPath('audio', 'mp3');
      const upload = await uploadToR2(c.env, r2Path, audioBuffer, 'audio/mpeg');

      return c.json<ApiResponse>({
        ok: true,
        data: {
          model: modelId,
          voice,
          avatar: body.avatar,
          url: upload.cdn_url,
          r2_path: upload.r2_path,
          size: upload.size,
        },
        request_id: requestId,
      });
    }

    // Return raw audio
    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Request-ID': requestId,
        'X-Model': modelId,
      },
    });
  } catch (error) {
    console.error('Speech route error:', error);
    return c.json<ApiResponse>({
      ok: false,
      error: error instanceof Error ? error.message : 'Internal error',
      request_id: requestId,
    }, 500);
  }
});

// ── POST /v1/music ───────────────────────────────────────────────────────────

mediaRoute.post('/music', async (c) => {
  const requestId = getRequestId(c);
  const user = getUser(c);

  let body: MusicRequest;
  try {
    body = await c.req.json<MusicRequest>();
  } catch {
    return c.json<ApiResponse>({ ok: false, error: 'Invalid JSON body', request_id: requestId }, 400);
  }

  if (!body.prompt?.trim()) {
    return c.json<ApiResponse>({ ok: false, error: 'prompt is required', request_id: requestId }, 400);
  }

  const modelId = resolveModel(body.model, 'music');
  const jobId = crypto.randomUUID();

  try {
    // Enqueue async job
    await c.env.JOB_QUEUE.send({
      job_id: jobId,
      type: 'music',
      model: modelId,
      request: body,
      grudge_id: user.grudge_id,
    });

    // Track in D1
    await c.env.JOBS_DB.prepare(
      `INSERT INTO jobs (id, type, status, model, request, grudge_id, created_at, updated_at)
       VALUES (?, ?, 'queued', ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(jobId, 'music', modelId, JSON.stringify(body), user.grudge_id).run();

    const response: JobResponse = {
      job_id: jobId,
      status: 'queued',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return c.json<ApiResponse<JobResponse>>({ ok: true, data: response, request_id: requestId }, 202);
  } catch (error) {
    console.error('Music route error:', error);
    return c.json<ApiResponse>({
      ok: false,
      error: error instanceof Error ? error.message : 'Internal error',
      request_id: requestId,
    }, 500);
  }
});

export default mediaRoute;
