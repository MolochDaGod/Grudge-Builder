-- Grudge AI Gateway — D1 schema for async job tracking
-- Run: npx wrangler d1 execute grudge-ai-jobs --file=schema.sql

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('video', 'music', 'agent', 'batch_image')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'processing', 'completed', 'failed')),
  model TEXT NOT NULL,
  request TEXT NOT NULL,  -- JSON blob
  result TEXT,            -- JSON blob (set on completion)
  error TEXT,             -- error message (set on failure)
  grudge_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_grudge_id ON jobs(grudge_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
