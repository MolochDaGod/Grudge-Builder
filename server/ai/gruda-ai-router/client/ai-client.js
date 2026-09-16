// client/ai-client.js
// Drop-in replacement for direct puter.ai.chat calls.
// Every page should use this instead of touching puter.ai directly.

export async function grudaChat(messages, opts = {}) {
  const {
    model = 'auto',
    page = 'unknown',
    tier = 'cheap',
    maxTokens = 512,
    stream = false
  } = opts;

  const r = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model, page, tier, maxTokens, stream })
  });

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || 'ai_router_failed');
  }
  return r.json(); // { ok, text, modelUsed, costTier, usage }
}

// Convenience wrapper that returns just the text (matches old puter.ai.chat shape)
export async function grudaChatText(messages, opts = {}) {
  const r = await grudaChat(messages, opts);
  return r.text;
}
