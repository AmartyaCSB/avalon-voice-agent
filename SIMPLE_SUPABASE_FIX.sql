-- Simple Supabase Policy Fix
-- Copy and paste this in Supabase SQL Editor

-- 1. Drop conflicting policies
DROP POLICY IF EXISTS "Users can manage own profiles" ON public.player_profiles;
DROP POLICY IF EXISTS "Users can view own profiles" ON public.player_profiles;
DROP POLICY IF EXISTS "Users can create own profiles" ON public.player_profiles;
DROP POLICY IF EXISTS "Users can update own profiles" ON public.player_profiles;

-- 2. Create single policy for player profiles  
CREATE POLICY "player_profiles_policy" ON public.player_profiles
    FOR ALL USING (auth.uid() = user_id);

-- 3. Fix users table policy
DROP POLICY IF EXISTS "Users can create own profile" ON public.users;
DROP POLICY IF EXISTS "users_can_insert" ON public.users;
CREATE POLICY "users_can_insert" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);
