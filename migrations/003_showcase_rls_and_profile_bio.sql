-- Same kind of silent failure that hit `swipes` (see 002): the `showcased_repos`
-- table likely has missing INSERT RLS, so the delete+insert in /api/showcased
-- silently failed and the user's selections never persisted. Idempotent.

ALTER TABLE public.showcased_repos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_read_showcased"        ON public.showcased_repos;
DROP POLICY IF EXISTS "users_insert_own_showcased"   ON public.showcased_repos;
DROP POLICY IF EXISTS "users_update_own_showcased"   ON public.showcased_repos;
DROP POLICY IF EXISTS "users_delete_own_showcased"   ON public.showcased_repos;

-- Public profile pages must be readable by anyone (including anon visitors).
CREATE POLICY "anyone_read_showcased" ON public.showcased_repos
  FOR SELECT USING (true);

CREATE POLICY "users_insert_own_showcased" ON public.showcased_repos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_showcased" ON public.showcased_repos
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_showcased" ON public.showcased_repos
  FOR DELETE USING (auth.uid() = user_id);

-- Stella bio: a user-authored "about me" that overrides the GitHub bio on
-- their public Stella profile. NULL or empty string means "fall back to GitHub bio".
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- Make sure the profile is readable by anyone (so /profile/[username] works for
-- anon visitors) and writable only by the owning user.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_read_profiles"     ON public.profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;

CREATE POLICY "anyone_read_profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "users_insert_own_profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
