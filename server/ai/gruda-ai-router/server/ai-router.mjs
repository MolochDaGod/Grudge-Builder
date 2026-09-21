// server/ai-router.mjs
// Central AI router for Grudge Studio — cost-effective, logged, fallback-aware.
// Deploy alongside grudge-api-production-0d46 or as standalone Express.

import express from 'express';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// --- Rate limit (per IP, cheap protection) ---
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'rate_limited' }
});
router.use(limiter);

// --- Config (env) ---
const LEGION_BASE = process.env.LEGION_AI_URL || 'https://ai.grudge-studio.com';
const PUTER_BACKUP_TOKEN =
  process.env.PUTER_BACKUP_TOKEN ||
  process.env.PUTER_DEPLOYER_TOKEN ||
  ''; // MolochDaDev JWT from puter-cli — never commit
const USAGE_KV_PREFIX = 'gruda:ai-usage:';

// --- Model tiers (cost order) ---
const TIERS = {
  free:    ['legion:llama-3.1-8b', 'legion:phi-3-mini'],
  cheap:   ['legion:gpt-4o-mini', 'puter:gpt-4o-mini', 'legion:gemini-1.5-flash'],
  balanced:['legion:gpt-4o', 'puter:gpt-4o', 'legion:claude-3-haiku'],
  premium: ['legion:gpt-4-turbo', 'legion:claude-3-opus']
};

function resolveModel(requested, tier = 'cheap') {
  if (requested && requested.startsWith('puter:')) return requested;
  if (requested && requested.startsWith('legion:')) return requested;
  if (requested && TIERS[requested]) {
    return TIERS[requested][0];
  }
  if (requested === 'auto' || !requested) {
    return TIERS[tier]?.[0] || TIERS.cheap[0];
  }
  return requested;
}

async function callLegion(model, messages, { maxTokens = 512, stream = false } = {}) {
  const cleanModel = model.replace('legion:', '');
  const r = await fetch(`${LEGION_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: cleanModel, messages, maxTokens, stream })
  });
  if (!r.ok) throw new Error(`legion_${r.status}`);
  return r.json();
}

function messagesWithImage(messages, imageUrl) {
  if (!imageUrl) return messages;
  const last = messages[messages.length - 1] || { role: 'user', content: '' };
  const text = typeof last.content === 'string' ? last.content : '';
  return [
    ...messages.slice(0, -1),
    {
      role: last.role || 'user',
      content: [
        { type: 'text', text },
        { type: 'image_url', image_url: { url: imageUrl } },
      ],
    },
  ];
}

async function callPuter(model, messages, { maxTokens = 512, stream = false } = {}) {
  if (!PUTER_BACKUP_TOKEN) throw new Error('no_puter_backup_token');
  const clean = model.replace('puter:', '');
  const r = await fetch('https://api.puter.com/drivers/call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PUTER_BACKUP_TOKEN}`,
    },
    body: JSON.stringify({
      interface: 'puter-chat-completion',
      method: 'complete',
      args: { messages, model: clean, max_tokens: maxTokens, stream: !!stream },
    }),
  });
  if (!r.ok) throw new Error(`puter_${r.status}`);
  const data = await r.json();
  return { text: data?.message?.content || data?.text || JSON.stringify(data) };
}

async function logUsage(page, modelUsed, tier, usage = {}) {
  console.log('[ai-router] usage', {
    page,
    modelUsed,
    tier,
    tokens: usage?.total_tokens || usage?.tokens || null,
    at: new Date().toISOString(),
    kvHint: `${USAGE_KV_PREFIX}${new Date().toISOString().slice(0, 10)}:${page}`,
  });
}

// --- Main endpoint ---
router.post('/chat', async (req, res) => {
  const { messages, model: requested, page = 'unknown', maxTokens = 512, stream = false, tier = 'cheap', imageUrl = null } = req.body || {};
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ ok: false, error: 'messages_required' });

  // Optional Grudge ID JWT gate (future: require signed-in user for production pages)
  // const auth = req.headers.authorization;
  // if (!auth) return res.status(401).json({ ok:false, error:'grudge_id_required' });

  const msgs = messagesWithImage(messages, imageUrl);
  const requestTier = (requested && TIERS[requested]) ? requested : tier;
  // Vision needs a Puter multimodal model; do not send images to Legion llama.
  const target = imageUrl
    ? (requested && requested.startsWith('puter:') ? requested : 'puter:gpt-4o')
    : resolveModel(requested, requestTier);
  const isPuter = target.startsWith('puter:');
  const isLegion = target.startsWith('legion:');

  let result, usedModel = target, costTier = imageUrl ? 'balanced' : requestTier;

  try {
    if (isLegion) {
      result = await callLegion(target, msgs, { maxTokens, stream });
      usedModel = `legion:${result.model || target.replace('legion:','')}`;
    } else if (isPuter) {
      result = await callPuter(target, msgs, { maxTokens, stream });
    } else {
      try {
        result = await callLegion(`legion:${target}`, msgs, { maxTokens, stream });
        usedModel = `legion:${target}`;
      } catch {
        result = await callPuter(`puter:gpt-4o-mini`, msgs, { maxTokens, stream });
        usedModel = 'puter:gpt-4o-mini';
        costTier = 'cheap';
      }
    }

    await logUsage(page, usedModel, costTier, result.usage);

    const text =
      result.text ||
      result.reply ||
      result.content ||
      (typeof result.message?.content === 'string' ? result.message.content : null) ||
      result.message?.content?.[0]?.text ||
      '';
    res.json({
      ok: true,
      text,
      modelUsed: usedModel,
      costTier,
      usage: result.usage || {}
    });
  } catch (err) {
    console.error('[ai-router] error', err);
    res.status(502).json({ ok: false, error: 'all_providers_exhausted', tried: [target] });
  }
});

// Health + model list
router.get('/models', (_req, res) => {
  res.json({ ok: true, tiers: TIERS, legion: LEGION_BASE, puterBackup: !!PUTER_BACKUP_TOKEN });
});

router.get('/usage', async (req, res) => {
  const since = req.query.since || '7d';
  // In production you would aggregate from KV or Railway table here
  res.json({ ok: true, note: 'see puter.kv gruda:ai-usage:* keys', since });
});

export default router;
