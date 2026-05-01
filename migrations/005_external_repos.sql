-- External repo discovery sources (Hacker News Show HN, Reddit, etc.).
-- Populated by scraper routes (e.g. /api/scrape-hn-show) on a daily cron.
-- Read by /api/repos and interleaved into the swipe feed alongside
-- GitHub Search results and community-submitted repos.

CREATE TABLE IF NOT EXISTS external_repos (
  repo_full_name TEXT PRIMARY KEY,
  repo_data      JSONB NOT NULL,
  source         TEXT NOT NULL,                -- e.g. 'hn_show', 'reddit_programming'
  source_url     TEXT,                         -- link to the HN post / Reddit thread
  source_score   INTEGER,                      -- HN points / Reddit upvotes — for ranking
  posted_at      TIMESTAMPTZ,                  -- when the source mention happened
  fetched_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS idx_external_repos_source_score ON external_repos(source, source_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_external_repos_posted_at   ON external_repos(posted_at DESC);

ALTER TABLE external_repos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_read_external_repos"  ON external_repos;
DROP POLICY IF EXISTS "service_write_external_repos" ON external_repos;

-- Anyone (anon + auth) can read — these power the public feed.
CREATE POLICY "anyone_read_external_repos" ON external_repos
  FOR SELECT USING (true);

-- Only the service role (used by the scraper route) can write.
CREATE POLICY "service_write_external_repos" ON external_repos
  FOR ALL USING (auth.role() = 'service_role');
