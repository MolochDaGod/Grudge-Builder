/**
 * Grudge AI Gateway — Queue Consumer
 *
 * Processes async generation jobs (video, music) received from the JOB_QUEUE.
 * Each message contains a job_id, type, model, request payload, and grudge_id.
 *
 * Flow per message:
 *   1. Mark job as "processing" in D1
 *   2. Call the appropriate Cloudflare AI Gateway endpoint
 *   3. Upload result to R2
 *   4. Update D1 with result or error
 */

import type { Env, VideoRequest, MusicRequest } from './types';
import { getModel } from './models';
import { uploadToR2, generateAssetPath } from './storage';

// ── Types ────────────────────────────────────────────────────────────────────

interface QueueMessage {
  job_id: string;
  type: 'video' | 'music';
  model: string;
  request: VideoRequest | MusicRequest;
  grudge_id: string;
}

// ── Queue Handler ────────────────────────────────────────────────────────────

export async function handleQueue(
  batch: MessageBatch<QueueMessage>,
  env: Env,
): Promise<void> {
  for (const msg of batch.messages) {
    try {
      await processJob(msg.body, env);
      msg.ack();
    } catch (error) {
      console.error(`[Queue] Job ${msg.body.job_id} failed:`, error);
      // Update D1 with error
      await setJobFailed(
        env,
        msg.body.job_id,
        error instanceof Error ? error.message : 'Unknown queue processing error',
      );
      msg.retry();
    }
  }
}

// ── Job Dispatcher ───────────────────────────────────────────────────────────

async function processJob(job: QueueMessage, env: Env): Promise<void> {
  // 1. Mark processing
  await updateJobStatus(env, job.job_id, 'processing');

  // 2. Dispatch by type
  let result: Record<string, unknown>;
  switch (job.type) {
    case 'video':
      result = await processVideo(job, env);
      break;
    case 'music':
      result = await processMusic(job, env);
      break;
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }

  // 3. Mark completed
  await setJobCompleted(env, job.job_id, result);
}

// ── Video Processing ─────────────────────────────────────────────────────────

async function processVideo(job: QueueMessage, env: Env): Promise<Record<string, unknown>> {
  const req = job.request as VideoRequest;
  const modelDef = getModel(job.model);
  const provider = modelDef?.provider ?? 'bytedance';

  // Build provider-specific payload
  const payload: Record<string, unknown> = {
    model: job.model,
    prompt: req.prompt,
  };

  if (req.duration) payload.duration = req.duration;
  if (req.aspect_ratio) payload.aspect_ratio = req.aspect_ratio;
  if (req.audio !== undefined) payload.audio = req.audio;
  if (req.reference_image) payload.image = req.reference_image;
  if (req.reference_video) payload.video = req.reference_video;

  // Call AI Gateway
  const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${env.CF_ACCOUNT_ID}/grudge-ai-gateway/${provider}/video/generations`;

  const aiResponse = await fetch(gatewayUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'cf-aig-authorization': `Bearer ${env.CF_AI_GATEWAY_TOKEN ?? ''}`,
    },
    body: JSON.stringify(payload),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    throw new Error(`Video generation failed (${job.model}): ${aiResponse.status} — ${errorText.slice(0, 500)}`);
  }

  const contentType = aiResponse.headers.get('Content-Type') || '';

  // Some providers return JSON with a URL, others return raw binary
  if (contentType.includes('application/json')) {
    const json = await aiResponse.json() as Record<string, unknown>;
    const videoUrl = (json.url as string) || (json.data as any)?.url;

    // If we got a URL, download and upload to R2
    if (videoUrl && (req.upload_to_r2 !== false)) {
      const videoData = await fetch(videoUrl).then(r => r.arrayBuffer());
      const r2Path = req.r2_path || generateAssetPath('video', 'mp4');
      const upload = await uploadToR2(env, r2Path, videoData, 'video/mp4');
      return { model: job.model, url: upload.cdn_url, r2_path: upload.r2_path, size: upload.size, provider_url: videoUrl };
    }

    return { model: job.model, provider_response: json };
  }

  // Raw binary response
  const videoBuffer = await aiResponse.arrayBuffer();
  const ext = contentType.includes('webm') ? 'webm' : 'mp4';
  const r2Path = req.r2_path || generateAssetPath('video', ext);
  const upload = await uploadToR2(env, r2Path, videoBuffer, contentType || `video/${ext}`);

  return { model: job.model, url: upload.cdn_url, r2_path: upload.r2_path, size: upload.size };
}

// ── Music Processing ─────────────────────────────────────────────────────────

async function processMusic(job: QueueMessage, env: Env): Promise<Record<string, unknown>> {
  const req = job.request as MusicRequest;
  const modelDef = getModel(job.model);
  const provider = modelDef?.provider ?? 'minimax';

  const payload: Record<string, unknown> = {
    model: job.model,
    prompt: req.prompt,
  };

  if (req.lyrics) payload.lyrics = req.lyrics;
  if (req.bpm) payload.bpm = req.bpm;
  if (req.key) payload.key = req.key;
  if (req.instrumental !== undefined) payload.instrumental = req.instrumental;
  if (req.duration) payload.duration = req.duration;

  const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${env.CF_ACCOUNT_ID}/grudge-ai-gateway/${provider}/audio/generations`;

  const aiResponse = await fetch(gatewayUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'cf-aig-authorization': `Bearer ${env.CF_AI_GATEWAY_TOKEN ?? ''}`,
    },
    body: JSON.stringify(payload),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    throw new Error(`Music generation failed (${job.model}): ${aiResponse.status} — ${errorText.slice(0, 500)}`);
  }

  const contentType = aiResponse.headers.get('Content-Type') || '';

  if (contentType.includes('application/json')) {
    const json = await aiResponse.json() as Record<string, unknown>;
    const audioUrl = (json.url as string) || (json.data as any)?.url || (json.data as any)?.audio_url;

    if (audioUrl && (req.upload_to_r2 !== false)) {
      const audioData = await fetch(audioUrl).then(r => r.arrayBuffer());
      const r2Path = req.r2_path || generateAssetPath('music', 'mp3');
      const upload = await uploadToR2(env, r2Path, audioData, 'audio/mpeg');
      return { model: job.model, url: upload.cdn_url, r2_path: upload.r2_path, size: upload.size, provider_url: audioUrl };
    }

    return { model: job.model, provider_response: json };
  }

  // Raw binary audio
  const audioBuffer = await aiResponse.arrayBuffer();
  const ext = contentType.includes('wav') ? 'wav' : contentType.includes('ogg') ? 'ogg' : 'mp3';
  const r2Path = req.r2_path || generateAssetPath('music', ext);
  const upload = await uploadToR2(env, r2Path, audioBuffer, contentType || `audio/${ext}`);

  return { model: job.model, url: upload.cdn_url, r2_path: upload.r2_path, size: upload.size };
}

// ── D1 Helpers ───────────────────────────────────────────────────────────────

async function updateJobStatus(env: Env, jobId: string, status: string): Promise<void> {
  await env.JOBS_DB.prepare(
    `UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(status, jobId).run();
}

async function setJobCompleted(env: Env, jobId: string, result: Record<string, unknown>): Promise<void> {
  await env.JOBS_DB.prepare(
    `UPDATE jobs SET status = 'completed', result = ?, updated_at = datetime('now'), completed_at = datetime('now') WHERE id = ?`
  ).bind(JSON.stringify(result), jobId).run();
}

async function setJobFailed(env: Env, jobId: string, error: string): Promise<void> {
  await env.JOBS_DB.prepare(
    `UPDATE jobs SET status = 'failed', error = ?, updated_at = datetime('now'), completed_at = datetime('now') WHERE id = ?`
  ).bind(error, jobId).run();
}
