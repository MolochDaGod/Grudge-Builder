// client/ai-client.js
// Drop-in replacement for direct puter.ai.chat calls.
// Every page should use this instead of touching puter.ai directly.
//
// Same-origin on warlords / localhost (Vercel rewrite → Railway).
// Absolute Railway URL everywhere else (ObjectStore, puter.site, ai_root).

export const GRUDA_AI_RAILWAY = 'https://grudge-api-production-0d46.up.railway.app';

export function grudaAiOrigin() {
  if (typeof location === 'undefined') return GRUDA_AI_RAILWAY;
  const h = location.hostname;
  if (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === 'grudgewarlords.com' ||
    h === 'www.grudgewarlords.com' ||
    h === 'client.grudge-studio.com'
  ) {
    return '';
  }
  return GRUDA_AI_RAILWAY;
}

export function grudaChatUrl() {
  return `${grudaAiOrigin()}/api/ai/chat`;
}

export async function grudaChat(messages, opts = {}) {
  const {
    model = 'auto',
    page = 'unknown',
    tier = 'cheap',
    maxTokens = 512,
    stream = false,
    imageUrl = null,
  } = opts;

  const r = await fetch(grudaChatUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model, page, tier, maxTokens, stream, imageUrl }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.ok === false) {
    throw new Error(data.error || 'ai_router_failed');
  }
  return data; // { ok, text, modelUsed, costTier, usage }
}

export async function grudaChatText(messages, opts = {}) {
  const r = await grudaChat(messages, opts);
  return r.text;
}

if (typeof window !== 'undefined') {
  window.grudaChat = grudaChat;
  window.grudaChatText = grudaChatText;
}
