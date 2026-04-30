-- Cache of LLM-synthesized repo descriptions, keyed by GitHub full_name.
-- Refreshed when content_sha changes (we can hash the input README) or after expires_at.
CREATE TABLE IF NOT EXISTS repo_descriptions (
  repo_full_name TEXT PRIMARY KEY,
  description    TEXT NOT NULL,
  highlights     JSONB DEFAULT '[]'::jsonb,
  source         TEXT NOT NULL DEFAULT 'llm' CHECK (source IN ('llm', 'fallback')),
  content_sha    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS idx_repo_descriptions_expires ON repo_descriptions(expires_at);

ALTER TABLE repo_descriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_read_repo_descriptions" ON repo_descriptions
  FOR SELECT USING (true);

CREATE POLICY "service_write_repo_descriptions" ON repo_descriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Showcased repos display order. Lower position = displayed first.
ALTER TABLE showcased_repos
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_showcased_repos_user_position
  ON showcased_repos(user_id, position);
