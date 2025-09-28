-- Avalon Game Database Schema for Supabase
-- This file contains the SQL schema for the Avalon voice agent game

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    google_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player profiles table
CREATE TABLE public.player_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    persona_name TEXT NOT NULL,
    persona_description TEXT,
    preferred_role TEXT, -- 'good' or 'evil' preference
    game_stats JSONB DEFAULT '{}', -- wins, losses, games_played, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, persona_name)
);

-- Game rooms table
CREATE TABLE public.game_rooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_code TEXT UNIQUE NOT NULL,
    room_name TEXT NOT NULL,
    host_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    max_players INTEGER DEFAULT 10 CHECK (max_players >= 5 AND max_players <= 10),
    current_players INTEGER DEFAULT 0,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
    game_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Room players junction table
CREATE TABLE public.room_players (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    player_profile_id UUID REFERENCES public.player_profiles(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- Game sessions table
CREATE TABLE public.game_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE NOT NULL,
    game_state TEXT DEFAULT 'setup' CHECK (game_state IN ('setup', 'playing', 'voting', 'mission', 'finished')),
    current_round INTEGER DEFAULT 1,
    current_leader_id UUID REFERENCES public.users(id),
    mission_history JSONB DEFAULT '[]',
    chat_messages JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE public.chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'general' CHECK (message_type IN ('general', 'team', 'system')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own data
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Player profiles policies
CREATE POLICY "Users can view own profiles" ON public.player_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own profiles" ON public.player_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profiles" ON public.player_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Game rooms policies
CREATE POLICY "Anyone can view public rooms" ON public.game_rooms
    FOR SELECT USING (true);

CREATE POLICY "Users can create rooms" ON public.game_rooms
    FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Room hosts can update their rooms" ON public.game_rooms
    FOR UPDATE USING (auth.uid() = host_id);

-- Room players policies
CREATE POLICY "Users can view room players" ON public.room_players
    FOR SELECT USING (true);

CREATE POLICY "Users can join rooms" ON public.room_players
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms" ON public.room_players
    FOR DELETE USING (auth.uid() = user_id);

-- Game sessions policies
CREATE POLICY "Room players can view game sessions" ON public.game_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_players 
            WHERE room_id = game_sessions.room_id 
            AND user_id = auth.uid()
        )
    );

-- Chat messages policies
CREATE POLICY "Room players can view chat" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_players 
            WHERE room_id = chat_messages.room_id 
            AND user_id = auth.uid()
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

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_profiles_updated_at BEFORE UPDATE ON public.player_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_rooms_updated_at BEFORE UPDATE ON public.game_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON public.game_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update room player count
CREATE OR REPLACE FUNCTION update_room_player_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.game_rooms 
        SET current_players = current_players + 1 
        WHERE id = NEW.room_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.game_rooms 
        SET current_players = current_players - 1 
        WHERE id = OLD.room_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_room_player_count_trigger
    AFTER INSERT OR DELETE ON public.room_players
    FOR EACH ROW EXECUTE FUNCTION update_room_player_count();

-- Sample data (optional - for testing)
-- INSERT INTO public.users (id, email, display_name, avatar_url) VALUES
-- (uuid_generate_v4(), 'test@example.com', 'Test User', 'https://example.com/avatar.jpg');

COMMENT ON TABLE public.users IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE public.player_profiles IS 'Player personas and game preferences';
COMMENT ON TABLE public.game_rooms IS 'Game room instances';
COMMENT ON TABLE public.room_players IS 'Many-to-many relationship between rooms and players';
COMMENT ON TABLE public.game_sessions IS 'Active game state and history';
COMMENT ON TABLE public.chat_messages IS 'In-game chat messages';
