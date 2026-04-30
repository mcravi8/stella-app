-- Ensures the swipes table has the unique constraint and RLS policies
-- needed for `/api/swipe` to upsert reliably and for `/my-repos` and the
-- feed dedupe to read swipes back. Idempotent — safe to run any time.

-- 1. Unique constraint on (user_id, repo_full_name) — required for the
-- on_conflict clause in the swipe upsert. Without this, the upsert errors.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'swipes_user_repo_unique'
      AND conrelid = 'public.swipes'::regclass
  ) THEN
    ALTER TABLE public.swipes
      ADD CONSTRAINT swipes_user_repo_unique UNIQUE (user_id, repo_full_name);
  END IF;
END $$;

-- 2. Make sure RLS is on.
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;

-- 3. Policies (drop-and-recreate so this stays idempotent across re-runs).
DROP POLICY IF EXISTS "users_read_own_swipes"   ON public.swipes;
DROP POLICY IF EXISTS "users_insert_own_swipes" ON public.swipes;
DROP POLICY IF EXISTS "users_update_own_swipes" ON public.swipes;
DROP POLICY IF EXISTS "users_delete_own_swipes" ON public.swipes;

CREATE POLICY "users_read_own_swipes" ON public.swipes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_swipes" ON public.swipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_swipes" ON public.swipes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_swipes" ON public.swipes
  FOR DELETE USING (auth.uid() = user_id);
