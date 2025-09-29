-- COMPLETE DATABASE RESET FOR AVALON
-- This will erase everything and start fresh
-- Run this in Supabase SQL Editor

-- ============================================================================
-- 1. DROP ALL EXISTING TABLES AND FUNCTIONS
-- ============================================================================

-- Drop all tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS public.role_assignments CASCADE;
DROP TABLE IF EXISTS public.game_state CASCADE;
DROP TABLE IF EXISTS public.quest_state CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.room_players CASCADE;
DROP TABLE IF EXISTS public.player_profiles CASCADE;
DROP TABLE IF EXISTS public.game_rooms CASCADE;
DROP TABLE IF EXISTS public.game_sessions CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.update_room_player_count() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_inactive_rooms() CASCADE;
DROP FUNCTION IF EXISTS public.get_room_activity_status() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ============================================================================
-- 2. CREATE FRESH TABLES
-- ============================================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    google_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player profiles (game personas)
CREATE TABLE public.player_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    persona_name TEXT NOT NULL,
    persona_description TEXT,
    preferred_role TEXT CHECK (preferred_role IN ('good', 'evil')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game rooms
CREATE TABLE public.game_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT UNIQUE NOT NULL,
    room_name TEXT NOT NULL,
    host_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    max_players INTEGER NOT NULL DEFAULT 10 CHECK (max_players >= 5 AND max_players <= 10),
    current_players INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room players (who's in each room)
CREATE TABLE public.room_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    player_profile_id UUID REFERENCES public.player_profiles(id) ON DELETE SET NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- Chat messages
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'general' CHECK (message_type IN ('general', 'team', 'system', 'whisper')),
    target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game state (for persistence)
CREATE TABLE public.game_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    current_quest INTEGER DEFAULT 1,
    game_phase TEXT DEFAULT 'team_building',
    good_wins INTEGER DEFAULT 0,
    evil_wins INTEGER DEFAULT 0,
    game_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id)
);

-- Role assignments
CREATE TABLE public.role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_name TEXT NOT NULL,
    team TEXT NOT NULL CHECK (team IN ('good', 'evil')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- ============================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_game_rooms_status ON public.game_rooms(status);
CREATE INDEX idx_game_rooms_created_at ON public.game_rooms(created_at);
CREATE INDEX idx_room_players_room_id ON public.room_players(room_id);
CREATE INDEX idx_chat_messages_room_id ON public.chat_messages(room_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

-- ============================================================================
-- 4. CREATE FUNCTIONS
-- ============================================================================

-- Function to update room player count
CREATE OR REPLACE FUNCTION update_room_player_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.game_rooms 
        SET current_players = (
            SELECT COUNT(*) 
            FROM public.room_players 
            WHERE room_id = NEW.room_id
        )
        WHERE id = NEW.room_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.game_rooms 
        SET current_players = (
            SELECT COUNT(*) 
            FROM public.room_players 
            WHERE room_id = OLD.room_id
        )
        WHERE id = OLD.room_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name, avatar_url, google_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'provider_id'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. CREATE TRIGGERS
-- ============================================================================

-- Trigger for room player count updates
CREATE TRIGGER update_room_player_count_trigger
    AFTER INSERT OR DELETE ON public.room_players
    FOR EACH ROW EXECUTE FUNCTION update_room_player_count();

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 6. SET UP ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Player profiles policies
CREATE POLICY "Anyone can view profiles" ON public.player_profiles FOR SELECT USING (true);
CREATE POLICY "Users can manage own profiles" ON public.player_profiles FOR ALL USING (auth.uid() = user_id);

-- Game rooms policies
CREATE POLICY "Anyone can view rooms" ON public.game_rooms FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create rooms" ON public.game_rooms FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update their rooms" ON public.game_rooms FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Hosts can delete their rooms" ON public.game_rooms FOR DELETE USING (auth.uid() = host_id);

-- Room players policies
CREATE POLICY "Anyone can view room players" ON public.room_players FOR SELECT USING (true);
CREATE POLICY "Users can join rooms" ON public.room_players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave rooms" ON public.room_players FOR DELETE USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Room members can view messages" ON public.chat_messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.room_players 
        WHERE room_id = chat_messages.room_id 
        AND user_id = auth.uid()
    )
);
CREATE POLICY "Room members can send messages" ON public.chat_messages FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM public.room_players 
        WHERE room_id = chat_messages.room_id 
        AND user_id = auth.uid()
    )
);

-- Game state policies
CREATE POLICY "Room members can view game state" ON public.game_state FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.room_players 
        WHERE room_id = game_state.room_id 
        AND user_id = auth.uid()
    )
);
CREATE POLICY "Room hosts can manage game state" ON public.game_state FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.game_rooms 
        WHERE id = game_state.room_id 
        AND host_id = auth.uid()
    )
);

-- Role assignments policies
CREATE POLICY "Room members can view role assignments" ON public.role_assignments FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.room_players 
        WHERE room_id = role_assignments.room_id 
        AND user_id = auth.uid()
    )
);
CREATE POLICY "Room hosts can manage role assignments" ON public.role_assignments FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.game_rooms 
        WHERE id = role_assignments.room_id 
        AND host_id = auth.uid()
    )
);

-- ============================================================================
-- 7. ENABLE REALTIME
-- ============================================================================

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.role_assignments;

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.player_profiles TO authenticated;
GRANT ALL ON public.game_rooms TO authenticated;
GRANT ALL ON public.room_players TO authenticated;
GRANT ALL ON public.chat_messages TO authenticated;
GRANT ALL ON public.game_state TO authenticated;
GRANT ALL ON public.role_assignments TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

SELECT 'Database reset complete! All tables, functions, and policies created.' as status;
