/**
 * AI Gateway Routes — /api/ai/gateway/*
 *
 * Exposes the unified aiGateway service to the frontend.
 *   GET  /status        — provider status + routing table
 *   POST /chat          — non-streaming chat
 *   POST /chat/stream   — streaming SSE chat
 */

import { Router, type Request, type Response } from "express";
import {
  getFullStatus,
  gatewayChat,
  resolveProvider,
  type AITaskType,
  type AIProvider,
} from "../services/aiGateway";

const router = Router();

// GET /api/ai/gateway/status
router.get("/status", async (_req: Request, res: Response) => {
  try {
    const status = await getFullStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get AI status" });
  }
});

// POST /api/ai/gateway/chat — non-streaming
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { task, messages, provider, model, temperature, agent, preferLocal } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const result = await gatewayChat({
      task: task as AITaskType || "chat",
      messages,
      provider: provider as AIProvider | undefined,
      model,
      temperature,
      agent,
    });

    res.json(result);
  } catch (err: any) {
    console.error("[ai-gateway/chat]", err);
    res.status(502).json({ error: err.message || "AI chat failed" });
  }
});

// POST /api/ai/gateway/chat/stream — SSE streaming
router.post("/chat/stream", async (req: Request, res: Response) => {
  try {
    const { task, messages, provider, model, temperature, preferLocal } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    // Resolve which provider to use
    const resolved = provider
      ? { provider, model: model || "", baseUrl: "", available: true }
      : await resolveProvider(task as AITaskType || "chat", preferLocal !== false);

    if (!resolved.available) {
      return res.status(503).json({ error: "No AI provider available" });
    }

    const OLLAMA_BASE = process.env.OLLAMA_HOST || "http://localhost:11434";
    const CLOUD_BASE = "https://ai.grudge-studio.com";

    const targetModel = model || resolved.model;

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    if (resolved.provider === "ollama") {
      // Stream from Ollama
      const ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: targetModel,
          messages,
          stream: true,
          options: temperature !== undefined ? { temperature } : undefined,
        }),
      });

      if (!ollamaRes.ok || !ollamaRes.body) {
        res.write(`data: ${JSON.stringify({ error: "Ollama stream failed" })}\n\n`);
        res.end();
        return;
      }

      const reader = ollamaRes.body.getReader();
      const decoder = new TextDecoder();

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n").filter(Boolean)) {
            try {
              const parsed = JSON.parse(line);
              res.write(`data: ${JSON.stringify(parsed)}\n\n`);
              if (parsed.done) { done = true; break; }
            } catch { /* partial JSON */ }
          }
        }
      }
    } else {
      // Stream from cloud (ai.grudge-studio.com doesn't support streaming yet, so we fake it)
      try {
        const token = process.env.GRUDGE_AUTH_TOKEN || process.env.JWT_SECRET || "";
        const cloudRes = await fetch(`${CLOUD_BASE}/v1/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ model: targetModel, messages, temperature }),
        });

        if (!cloudRes.ok) {
          res.write(`data: ${JSON.stringify({ error: `Cloud AI ${cloudRes.status}` })}\n\n`);
          res.end();
          return;
        }

        const data = await cloudRes.json() as any;
        const content = data.data?.content || "";

        // Emit as a single chunk
        res.write(`data: ${JSON.stringify({ message: { content }, done: false })}\n\n`);
        res.write(`data: ${JSON.stringify({ message: { content: "" }, done: true })}\n\n`);
      } catch (err: any) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    console.error("[ai-gateway/stream]", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || "Stream failed" });
    } else {
      res.end();
    }
  }
});

export default router;
