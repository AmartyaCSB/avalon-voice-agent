-- Enhanced Avalon Game Database Schema
-- Run this in Supabase SQL Editor to add game state persistence

-- Add role assignments table
CREATE TABLE IF NOT EXISTS public.role_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role_name TEXT NOT NULL,
    team TEXT NOT NULL CHECK (team IN ('Good', 'Evil')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- Add quest state table
CREATE TABLE IF NOT EXISTS public.quest_state (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE NOT NULL,
    quest_number INTEGER NOT NULL CHECK (quest_number >= 1 AND quest_number <= 5),
    players_required INTEGER NOT NULL,
    fails_required INTEGER NOT NULL DEFAULT 1,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'team_selection', 'team_voting', 'mission', 'completed')),
    result TEXT CHECK (result IN ('success', 'fail')),
    current_leader_id UUID REFERENCES public.users(id),
    selected_team JSONB DEFAULT '[]',
    team_votes JSONB DEFAULT '{}',
    mission_votes JSONB DEFAULT '{}',
    vote_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, quest_number)
);

-- Add game state table
CREATE TABLE IF NOT EXISTS public.game_state (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE NOT NULL UNIQUE,
    current_quest INTEGER DEFAULT 1 CHECK (current_quest >= 1 AND current_quest <= 5),
    game_phase TEXT DEFAULT 'setup' CHECK (game_phase IN ('setup', 'team_selection', 'team_voting', 'mission', 'completed')),
    good_wins INTEGER DEFAULT 0,
    evil_wins INTEGER DEFAULT 0,
    leader_rotation JSONB DEFAULT '[]',
    current_leader_index INTEGER DEFAULT 0,
    assignments_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for new tables
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies for role_assignments
CREATE POLICY "Players can view role assignments in their room" ON public.role_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_players 
            WHERE room_id = role_assignments.room_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "System can manage role assignments" ON public.role_assignments
    FOR ALL USING (true);

-- RLS Policies for quest_state
CREATE POLICY "Players can view quest state in their room" ON public.quest_state
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_players 
            WHERE room_id = quest_state.room_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Players can update quest state in their room" ON public.quest_state
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.room_players 
            WHERE room_id = quest_state.room_id 
            AND user_id = auth.uid()
        )
    );

-- RLS Policies for game_state
CREATE POLICY "Players can view game state in their room" ON public.game_state
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_players 
            WHERE room_id = game_state.room_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Players can update game state in their room" ON public.game_state
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.room_players 
            WHERE room_id = game_state.room_id 
            AND user_id = auth.uid()
        )
    );

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quest_state_updated_at BEFORE UPDATE ON public.quest_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_state_updated_at BEFORE UPDATE ON public.game_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.role_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quest_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_state;

-- Function to initialize game state when room starts
CREATE OR REPLACE FUNCTION public.initialize_game_state(room_id_param UUID, player_count INTEGER)
RETURNS VOID AS $$
DECLARE
    quest_configs JSONB;
    quest_config JSONB;
    i INTEGER;
BEGIN
    -- Define quest configurations based on player count
    CASE player_count
        WHEN 5 THEN
            quest_configs := '[
                {"players": 2, "fails": 1},
                {"players": 3, "fails": 1},
                {"players": 2, "fails": 1},
                {"players": 3, "fails": 1},
                {"players": 3, "fails": 1}
            ]'::JSONB;
        WHEN 6 THEN
            quest_configs := '[
                {"players": 2, "fails": 1},
                {"players": 3, "fails": 1},
                {"players": 4, "fails": 1},
                {"players": 3, "fails": 1},
                {"players": 4, "fails": 1}
            ]'::JSONB;
        WHEN 7 THEN
            quest_configs := '[
                {"players": 2, "fails": 1},
                {"players": 3, "fails": 1},
                {"players": 3, "fails": 1},
                {"players": 4, "fails": 2},
                {"players": 4, "fails": 1}
            ]'::JSONB;
        ELSE
            quest_configs := '[
                {"players": 3, "fails": 1},
                {"players": 4, "fails": 1},
                {"players": 4, "fails": 1},
                {"players": 5, "fails": 2},
                {"players": 5, "fails": 1}
            ]'::JSONB;
    END CASE;

    -- Create game state
    INSERT INTO public.game_state (room_id, current_quest, game_phase)
    VALUES (room_id_param, 1, 'team_selection')
    ON CONFLICT (room_id) DO UPDATE SET
        current_quest = 1,
        game_phase = 'team_selection',
        good_wins = 0,
        evil_wins = 0,
        updated_at = NOW();

    -- Create quest states
    FOR i IN 1..5 LOOP
        quest_config := quest_configs->(i-1);
        
        INSERT INTO public.quest_state (
            room_id, 
            quest_number, 
            players_required, 
            fails_required,
            status
        )
        VALUES (
            room_id_param,
            i,
            (quest_config->>'players')::INTEGER,
            (quest_config->>'fails')::INTEGER,
            CASE WHEN i = 1 THEN 'team_selection' ELSE 'pending' END
        )
        ON CONFLICT (room_id, quest_number) DO UPDATE SET
            status = CASE WHEN i = 1 THEN 'team_selection' ELSE 'pending' END,
            result = NULL,
            selected_team = '[]'::JSONB,
            team_votes = '{}'::JSONB,
            mission_votes = '{}'::JSONB,
            vote_count = 0,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
