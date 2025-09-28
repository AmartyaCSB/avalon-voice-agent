-- Avalon Game Database Schema Updates
-- Run these commands in your Supabase SQL Editor

-- 1. Update chat_messages table with enhanced features
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Update message_type to include 'whisper'
ALTER TABLE public.chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;

ALTER TABLE public.chat_messages 
ADD CONSTRAINT chat_messages_message_type_check 
CHECK (message_type IN ('general', 'team', 'system', 'whisper'));

-- 2. Update users table to track online status
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;

-- 3. Fix RLS policies for player_profiles (too restrictive)
DROP POLICY IF EXISTS "Users can view own profiles" ON public.player_profiles;
DROP POLICY IF EXISTS "Users can create own profiles" ON public.player_profiles;
DROP POLICY IF EXISTS "Users can update own profiles" ON public.player_profiles;

-- Create more permissive policies for player_profiles
CREATE POLICY "Users can manage own profiles" ON public.player_profiles
    FOR ALL USING (auth.uid() = user_id);

-- 4. Fix users table RLS - allow INSERT for new users
CREATE POLICY "Users can create own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Create trigger to automatically create user profiles
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
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Backfill existing auth users into public.users (run once)
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

-- 7. Update chat message policies for enhanced features
DROP POLICY IF EXISTS "Room players can view chat" ON public.chat_messages;
DROP POLICY IF EXISTS "Room players can send messages" ON public.chat_messages;

CREATE POLICY "Room players can view chat" ON public.chat_messages
    FOR SELECT USING (
        NOT is_deleted AND (
            EXISTS (
                SELECT 1 FROM public.room_players 
                WHERE room_id = chat_messages.room_id 
                AND user_id = auth.uid()
            ) OR 
            (message_type = 'whisper' AND target_user_id = auth.uid())
        )
    );

CREATE POLICY "Room players can send messages" ON public.chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.room_players 
            WHERE room_id = chat_messages.room_id 
            AND user_id = auth.uid()
        )
    );

-- 8. Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
