/**
 * AnythingLLM RAG routes — /api/ai/rag/*
 *
 * Local knowledge layer over Grudge fleet docs + ObjectStore canonical data.
 */

import { Router, type Request, type Response } from "express";
import {
  attachDocumentsToWorkspace,
  checkAnythingLLMStatus,
  getAnythingLLMConfig,
  listWorkspaces,
  resolveRagWorkspace,
  uploadLink,
  uploadRawText,
  workspaceChat,
  workspaceVectorSearch,
  type AnythingLLMWorkspaceSlug,
} from "../services/anythingllm";

const router = Router();

router.get("/status", async (_req: Request, res: Response) => {
  try {
    const config = getAnythingLLMConfig();
    const status = await checkAnythingLLMStatus();
    res.json({ ...config, ...status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "status check failed";
    res.status(500).json({ error: message });
  }
});

router.get("/workspaces", async (_req: Request, res: Response) => {
  try {
    const workspaces = await listWorkspaces();
    res.json({ workspaces });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "workspace list failed";
    res.status(502).json({ error: message });
  }
});

router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { message, workspace, task, mode, sessionId } = req.body ?? {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    const slug = (workspace as AnythingLLMWorkspaceSlug | undefined) ?? resolveRagWorkspace(task);
    const result = await workspaceChat({ workspace: slug, message, mode, sessionId });
    res.json({ workspace: slug, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "RAG chat failed";
    res.status(502).json({ error: message });
  }
});

router.post("/search", async (req: Request, res: Response) => {
  try {
    const { query, workspace, task, topN } = req.body ?? {};
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "query is required" });
    }

    const slug = (workspace as AnythingLLMWorkspaceSlug | undefined) ?? resolveRagWorkspace(task);
    const results = await workspaceVectorSearch({ workspace: slug, query, topN });
    res.json({ workspace: slug, results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "vector search failed";
    res.status(502).json({ error: message });
  }
});

router.post("/ingest/link", async (req: Request, res: Response) => {
  try {
    const { url, title, workspace, docPaths } = req.body ?? {};
    if (!url || !title) {
      return res.status(400).json({ error: "url and title are required" });
    }

    const uploaded = await uploadLink(url, title);
    const paths: string[] = Array.isArray(docPaths) ? docPaths : [];

    if (workspace && paths.length > 0) {
      await attachDocumentsToWorkspace(workspace, paths);
    }

    res.json({ uploaded, attached: Boolean(workspace && paths.length) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "ingest failed";
    res.status(502).json({ error: message });
  }
});

router.post("/ingest/text", async (req: Request, res: Response) => {
  try {
    const { text, title, workspace, docPath } = req.body ?? {};
    if (!text || !title) {
      return res.status(400).json({ error: "text and title are required" });
    }

    const uploaded = await uploadRawText(text, title);
    if (workspace && docPath) {
      await attachDocumentsToWorkspace(workspace, [docPath]);
    }

    res.json({ uploaded, attached: Boolean(workspace && docPath) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "ingest failed";
    res.status(502).json({ error: message });
  }
});

export default router;