/**
 * Ollama AI routes — the Grudge IDE "single-button AI" backend.
 *
 * Proxies to the local Ollama instance (http://localhost:11434) running
 * the `grudge-dev` custom model.  Provides:
 *   GET  /api/ai/ollama/status   — health + loaded models
 *   POST /api/ai/ollama/chat     — streaming chat (SSE)
 *   POST /api/ai/ollama/generate — single-shot code generation
 */

import { Router, type Request, type Response } from "express";

const router = Router();

const OLLAMA_BASE = process.env.OLLAMA_HOST || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "grudge-dev";

// ---------------------------------------------------------------------------
// GET /status — is Ollama running and what models are loaded?
// ---------------------------------------------------------------------------

router.get("/status", async (_req: Request, res: Response) => {
  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) throw new Error(`Ollama returned ${resp.status}`);
    const data = (await resp.json()) as { models?: unknown[] };

    res.json({
      online: true,
      host: OLLAMA_BASE,
      defaultModel: DEFAULT_MODEL,
      models: data.models ?? [],
    });
  } catch (err: any) {
    res.json({
      online: false,
      host: OLLAMA_BASE,
      defaultModel: DEFAULT_MODEL,
      error: err.message || "Ollama unreachable",
    });
  }
});

// ---------------------------------------------------------------------------
// POST /chat — streaming Server-Sent Events (SSE)
// Body: { messages: [{role,content}], model?, context? }
// ---------------------------------------------------------------------------

router.post("/chat", async (req: Request, res: Response) => {
  try {
    const {
      messages,
      model = DEFAULT_MODEL,
      context,
      temperature,
      system,
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    // Build the Ollama /api/chat payload
    const payload: Record<string, unknown> = {
      model,
      messages,
      stream: true,
    };
    if (system) payload.system = system;
    if (context) payload.context = context;
    if (temperature !== undefined) {
      payload.options = { temperature };
    }

    const ollamaResp = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!ollamaResp.ok || !ollamaResp.body) {
      const text = await ollamaResp.text().catch(() => "");
      return res.status(502).json({
        error: `Ollama returned ${ollamaResp.status}`,
        detail: text,
      });
    }

    // Stream SSE back to client
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const reader = ollamaResp.body.getReader();
    const decoder = new TextDecoder();

    let done = false;
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      done = streamDone;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        // Ollama streams NDJSON — each line is a JSON object
        for (const line of chunk.split("\n").filter(Boolean)) {
          try {
            const parsed = JSON.parse(line);
            res.write(`data: ${JSON.stringify(parsed)}\n\n`);

            // If Ollama says done, close
            if (parsed.done) {
              done = true;
              break;
            }
          } catch {
            // Partial JSON line — skip
          }
        }
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    console.error("[ollama/chat]", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || "Ollama chat failed" });
    } else {
      res.end();
    }
  }
});

// ---------------------------------------------------------------------------
// POST /generate — single-shot completion (non-streaming)
// Body: { prompt, model?, system?, context? }
// ---------------------------------------------------------------------------

router.post("/generate", async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      model = DEFAULT_MODEL,
      system,
      context,
      temperature,
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const payload: Record<string, unknown> = {
      model,
      prompt,
      stream: false,
    };
    if (system) payload.system = system;
    if (context) payload.context = context;
    if (temperature !== undefined) {
      payload.options = { temperature };
    }

    const ollamaResp = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120_000), // 2 min timeout
    });

    if (!ollamaResp.ok) {
      const text = await ollamaResp.text().catch(() => "");
      return res.status(502).json({
        error: `Ollama returned ${ollamaResp.status}`,
        detail: text,
      });
    }

    const data = await ollamaResp.json();
    res.json(data);
  } catch (err: any) {
    console.error("[ollama/generate]", err);
    res.status(500).json({ error: err.message || "Ollama generate failed" });
  }
});

export default router;
