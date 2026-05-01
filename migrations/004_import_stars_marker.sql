-- One-time GitHub-stars import marker. NULL = haven't imported yet (existing
-- users will get a backfill on their next feed load). Once set, /api/import-stars
-- is a no-op; the user can still swipe new repos in-app as normal.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS imported_stars_at TIMESTAMPTZ;
