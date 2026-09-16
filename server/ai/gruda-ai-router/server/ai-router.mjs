// server/ai-router.mjs
// Central AI router for Grudge Studio — cost-effective, logged, fallback-aware.
// Deploy alongside grudge-api-production-0d46 or as standalone Express.

import express from 'express';
import { init as initPuter } from '@heyputer/puter.js/src/init.cjs';
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
const PUTER_BACKUP_TOKEN = process.env.PUTER_BACKUP_TOKEN; // MolochDaDev JWT
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

async function callPuter(model, messages, { maxTokens = 512, stream = false } = {}) {
  if (!PUTER_BACKUP_TOKEN) throw new Error('no_puter_backup_token');
  const puter = initPuter(PUTER_BACKUP_TOKEN);
  const clean = model.replace('puter:', '');
  const resp = await puter.ai.chat(messages, { model: clean, max_tokens: maxTokens, stream });
  return { text: resp?.message?.content || resp?.text || String(resp) };
}

async function logUsage(page, modelUsed, tier, usage = {}) {
  try {
    const puter = initPuter(PUTER_BACKUP_TOKEN);
    const key = `${USAGE_KV_PREFIX}${new Date().toISOString().slice(0,10)}:${page}`;
    const existing = (await puter.kv.get(key)) || { count: 0, models: {} };
    existing.count++;
    existing.models[modelUsed] = (existing.models[modelUsed] || 0) + 1;
    existing.last = Date.now();
    await puter.kv.set(key, existing, Math.floor(Date.now()/1000) + 86400*30);
  } catch (e) { console.warn('[ai-router] usage log failed', e.message); }
}

// --- Main endpoint ---
router.post('/chat', async (req, res) => {
  const { messages, model: requested, page = 'unknown', maxTokens = 512, stream = false, tier = 'cheap' } = req.body || {};
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ ok: false, error: 'messages_required' });

  // Optional Grudge ID JWT gate (future: require signed-in user for production pages)
  // const auth = req.headers.authorization;
  // if (!auth) return res.status(401).json({ ok:false, error:'grudge_id_required' });

  const target = resolveModel(requested, tier);
  const isPuter = target.startsWith('puter:');
  const isLegion = target.startsWith('legion:');

  let result, usedModel = target, costTier = tier;

  try {
    if (isLegion) {
      result = await callLegion(target, messages, { maxTokens, stream });
      usedModel = `legion:${result.model || target.replace('legion:','')}`;
    } else if (isPuter) {
      result = await callPuter(target, messages, { maxTokens, stream });
    } else {
      // Unknown prefix — try Legion first, then Puter backup
      try {
        result = await callLegion(`legion:${target}`, messages, { maxTokens, stream });
        usedModel = `legion:${target}`;
      } catch {
        result = await callPuter(`puter:gpt-4o-mini`, messages, { maxTokens, stream });
        usedModel = 'puter:gpt-4o-mini';
        costTier = 'cheap';
      }
    }

    await logUsage(page, usedModel, costTier, result.usage);

    res.json({
      ok: true,
      text: result.text || result.message?.content || result.reply,
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
