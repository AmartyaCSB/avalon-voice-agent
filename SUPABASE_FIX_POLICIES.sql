-- Fix for Supabase Policy Errors
-- Run this in your Supabase SQL Editor

-- 1. First, let's drop the existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Users can manage own profiles" ON public.player_profiles;
DROP POLICY IF EXISTS "Users can view own profiles" ON public.player_profiles;
DROP POLICY IF EXISTS "Users can create own profiles" ON public.player_profiles;
DROP POLICY IF EXISTS "Users can update own profiles" ON public.player_profiles;

-- 2. Create a single comprehensive policy for player_profiles
CREATE POLICY "player_profiles_policy" ON public.player_profiles
    FOR ALL USING (auth.uid() = user_id);

-- 3. Make sure the users table has the right policies
DROP POLICY IF EXISTS "Users can create own profile" ON public.users;
CREATE POLICY IF NOT EXISTS "users_can_insert" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Ensure the trigger exists for new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name, avatar_url, google_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'provider_id'
    )
    ON CONFLICT (id) DO UPDATE SET
        display_name = COALESCE(NEW.raw_user_meta_data->>'full_name', EXCLUDED.display_name),
        avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', EXCLUDED.avatar_url),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create the trigger (will replace if exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Backfill any missing users (safe to run multiple times)
INSERT INTO public.users (id, email, display_name, avatar_url, google_id)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) as display_name,
    raw_user_meta_data->>'avatar_url' as avatar_url,
    raw_user_meta_data->>'provider_id' as google_id
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- 7. Add missing columns if they don't exist (safe to run)
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 8. Update message_type constraint (safe to run)
ALTER TABLE public.chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;

ALTER TABLE public.chat_messages 
ADD CONSTRAINT chat_messages_message_type_check 
CHECK (message_type IN ('general', 'team', 'system', 'whisper'));

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Supabase schema and policies updated successfully!';
END $$;
