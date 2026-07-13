-- RLS hardening — run this in the Supabase SQL editor before launch.
-- Safe to run multiple times (drops + recreates policies).

-- ── interviews: users can only touch their own rows ─────────────────────────
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interviews_select_own" ON interviews;
CREATE POLICY "interviews_select_own"
  ON interviews FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "interviews_insert_own" ON interviews;
CREATE POLICY "interviews_insert_own"
  ON interviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "interviews_delete_own" ON interviews;
CREATE POLICY "interviews_delete_own"
  ON interviews FOR DELETE
  USING (auth.uid() = user_id);

-- ── profiles: add missing DELETE policy (select/insert/update already exist) ─
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own"
  ON profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Verify afterwards:
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE tablename IN ('interviews', 'profiles') ORDER BY tablename, cmd;
