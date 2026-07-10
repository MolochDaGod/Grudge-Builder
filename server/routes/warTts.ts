/**
 * War scene TTS — ElevenLabs proxy (WoW-style herald / warlord voices).
 *
 * POST /api/war/tts  { text, role }
 * → audio/mpeg
 *
 * API key: ELEVENLABS_API_KEY or ELEVEN_LABS_API (server only — never ship to client).
 */
import type { Express, Request, Response } from 'express';

export type WarVoiceRole = 'herald' | 'crimson_lord' | 'azure_lord' | 'narrator';

/** ElevenLabs voice IDs tuned for dark-fantasy / WoW cinematic feel */
const ROLE_VOICES: Record<
  WarVoiceRole,
  { voiceId: string; stability: number; similarity: number; style: number; speed: number }
> = {
  // Formal royal herald — clear British presence
  herald: {
    voiceId: process.env.ELEVEN_VOICE_HERALD || 'onwK4e9ZLuTAKqWW03F9', // Daniel
    stability: 0.45,
    similarity: 0.8,
    style: 0.55,
    speed: 0.95,
  },
  // Aggressive crimson warlord — deep, gravelly
  crimson_lord: {
    voiceId: process.env.ELEVEN_VOICE_CRIMSON || '2EiwWnXFnvU5JabPnv8n', // Clyde
    stability: 0.35,
    similarity: 0.75,
    style: 0.7,
    speed: 0.88,
  },
  // Noble azure defender — resonant, proud
  azure_lord: {
    voiceId: process.env.ELEVEN_VOICE_AZURE || 'VR6AewLTigWG4xSOukaG', // Arnold
    stability: 0.4,
    similarity: 0.78,
    style: 0.55,
    speed: 0.92,
  },
  // Cinematic narrator — epic WoW trailer energy
  narrator: {
    voiceId: process.env.ELEVEN_VOICE_NARRATOR || 'pNInz6obpgDQGcFmaJgB', // Adam
    stability: 0.5,
    similarity: 0.82,
    style: 0.45,
    speed: 0.94,
  },
};

function getApiKey(): string | null {
  return (
    process.env.ELEVENLABS_API_KEY ||
    process.env.ELEVEN_LABS_API ||
    process.env.ELEVEN_API_KEY ||
    null
  );
}

export function registerWarTtsRoutes(app: Express): void {
  app.get('/api/war/tts/status', (_req: Request, res: Response) => {
    const key = getApiKey();
    res.json({
      ok: true,
      provider: 'elevenlabs',
      configured: !!key,
      model: process.env.ELEVEN_MODEL_ID || 'eleven_multilingual_v2',
      roles: Object.keys(ROLE_VOICES),
      canonical: 'https://grudgewarlords.com/war-scene',
    });
  });

  app.post('/api/war/tts', async (req: Request, res: Response) => {
    const key = getApiKey();
    if (!key) {
      res.status(503).json({
        error: 'elevenlabs_not_configured',
        hint: 'Set ELEVENLABS_API_KEY or ELEVEN_LABS_API on the API server',
      });
      return;
    }

    const text = String(req.body?.text || '').trim().slice(0, 1200);
    const role = (String(req.body?.role || 'narrator') as WarVoiceRole) || 'narrator';
    if (!text) {
      res.status(400).json({ error: 'text_required' });
      return;
    }

    const cfg = ROLE_VOICES[role] ?? ROLE_VOICES.narrator;
    const modelId = process.env.ELEVEN_MODEL_ID || 'eleven_multilingual_v2';

    try {
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${cfg.voiceId}?output_format=mp3_44100_128`;
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': key,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability: cfg.stability,
            similarity_boost: cfg.similarity,
            style: cfg.style,
            use_speaker_boost: true,
          },
        }),
      });

      if (!r.ok) {
        const errText = await r.text().catch(() => '');
        console.warn('[war/tts] ElevenLabs error', r.status, errText.slice(0, 200));
        res.status(502).json({
          error: 'elevenlabs_failed',
          status: r.status,
          detail: errText.slice(0, 300),
        });
        return;
      }

      const buf = Buffer.from(await r.arrayBuffer());
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('X-Grudge-TTS', `elevenlabs:${role}`);
      res.send(buf);
    } catch (e) {
      console.error('[war/tts]', e);
      res.status(500).json({
        error: 'tts_exception',
        message: e instanceof Error ? e.message : String(e),
      });
    }
  });
}
