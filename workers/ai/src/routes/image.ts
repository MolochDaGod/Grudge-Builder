/**
 * POST /v1/image — Text-to-image via Cloudflare AI Gateway.
 *
 * Supports:
 * - Transparent PNGs (gpt-image-1.5 — forced when transparent=true)
 * - Auto R2 upload (upload_to_r2=true returns CDN URL)
 * - Multiple models: gpt-image-1.5, gpt-image-2, recraftv3, wan-2.6-image, grok-imagine-image
 * - Inpainting/editing via reference_image
 */

import { Hono } from 'hono';
import type { Env, ImageRequest, ImageResponse, GeneratedImage, ApiResponse } from '../types';
import { resolveModel, getModel, DEFAULTS } from '../models';
import { getUser, getRequestId } from '../auth';
import { uploadToR2, generateAssetPath } from '../storage';

const imageRoute = new Hono<{ Bindings: Env }>();

imageRoute.post('/', async (c) => {
  const requestId = getRequestId(c);
  const user = getUser(c);

  let body: ImageRequest;
  try {
    body = await c.req.json<ImageRequest>();
  } catch {
    return c.json<ApiResponse>({ ok: false, error: 'Invalid JSON body', request_id: requestId }, 400);
  }

  if (!body.prompt?.trim()) {
    return c.json<ApiResponse>({ ok: false, error: 'prompt is required', request_id: requestId }, 400);
  }

  // Force gpt-image-1.5 for transparent PNGs (only model that supports it)
  let modelId: string;
  if (body.transparent) {
    modelId = 'gpt-image-1.5';
  } else {
    modelId = resolveModel(body.model, 'image');
  }
  const modelDef = getModel(modelId);

  try {
    const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${c.env.CF_ACCOUNT_ID}/grudge-ai-gateway/${modelDef?.provider ?? 'openai'}/images/generations`;

    const reqBody: Record<string, unknown> = {
      model: modelId,
      prompt: body.prompt,
      n: body.n ?? 1,
      size: body.size ?? '1024x1024',
      response_format: 'b64_json',
    };

    if (body.negative_prompt) reqBody.negative_prompt = body.negative_prompt;
    if (body.quality) reqBody.quality = body.quality;
    if (body.transparent) reqBody.background = 'transparent';

    const aiResponse = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cf-aig-authorization': `Bearer ${c.env.CF_AI_GATEWAY_TOKEN ?? ''}`,
      },
      body: JSON.stringify(reqBody),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`Image generation error (${modelId}):`, errorText);
      return c.json<ApiResponse>({
        ok: false,
        error: `Model ${modelId} returned ${aiResponse.status}`,
        request_id: requestId,
      }, 502);
    }

    const result = await aiResponse.json() as { data: Array<{ b64_json?: string; url?: string; revised_prompt?: string }> };

    // Process each generated image
    const images: GeneratedImage[] = [];
    for (let i = 0; i < (result.data?.length ?? 0); i++) {
      const item = result.data[i];
      const image: GeneratedImage = {
        b64_json: item.b64_json,
        revised_prompt: item.revised_prompt,
      };

      // Upload to R2 if requested
      if (body.upload_to_r2 && item.b64_json) {
        const ext = body.transparent ? 'png' : 'png';
        const r2Path = body.r2_path
          ? (result.data.length > 1 ? `${body.r2_path.replace(/\.\w+$/, '')}_${i}.${ext}` : body.r2_path)
          : generateAssetPath('images', ext);

        const upload = await uploadToR2(c.env, r2Path, item.b64_json);
        image.url = upload.cdn_url;
        image.r2_path = upload.r2_path;
        // Don't send b64 back when uploaded — save bandwidth
        delete image.b64_json;
      }

      images.push(image);
    }

    const response: ImageResponse = {
      id: requestId,
      model: modelId,
      images,
    };

    return c.json<ApiResponse<ImageResponse>>({
      ok: true,
      data: response,
      request_id: requestId,
    });
  } catch (error) {
    console.error('Image route error:', error);
    return c.json<ApiResponse>({
      ok: false,
      error: error instanceof Error ? error.message : 'Internal error',
      request_id: requestId,
    }, 500);
  }
});

export default imageRoute;
