-- COMPLETE DATABASE SETUP FOR AVALON GAME
-- Run this in Supabase SQL Editor to set up all required features

-- ============================================================================
-- 1. ROOM CLEANUP SYSTEM
-- ============================================================================

-- Function to clean up inactive rooms
CREATE OR REPLACE FUNCTION public.cleanup_inactive_rooms()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    room_record RECORD;
BEGIN
    -- Delete rooms that are:
    -- 1. Empty (no players) and older than 30 minutes
    -- 2. Have status 'waiting' and no activity for 2 hours
    -- 3. Have status 'playing' but no activity for 24 hours
    
    FOR room_record IN
        SELECT gr.id, gr.room_name, gr.room_code, gr.status, gr.created_at,
               COALESCE(rp.player_count, 0) as player_count,
               COALESCE(cm.last_activity, gr.created_at) as last_activity
        FROM public.game_rooms gr
        LEFT JOIN (
            SELECT room_id, COUNT(*) as player_count
            FROM public.room_players
            GROUP BY room_id
        ) rp ON gr.id = rp.room_id
        LEFT JOIN (
            SELECT room_id, MAX(created_at) as last_activity
            FROM public.chat_messages
            GROUP BY room_id
        ) cm ON gr.id = cm.room_id
        WHERE (
            -- Empty rooms older than 30 minutes
            (COALESCE(rp.player_count, 0) = 0 AND gr.created_at < NOW() - INTERVAL '30 minutes')
            OR
            -- Waiting rooms with no activity for 2 hours
            (gr.status = 'waiting' AND COALESCE(cm.last_activity, gr.created_at) < NOW() - INTERVAL '2 hours')
            OR
            -- Playing rooms with no activity for 24 hours
            (gr.status = 'playing' AND COALESCE(cm.last_activity, gr.created_at) < NOW() - INTERVAL '24 hours')
        )
    LOOP
        -- Log the cleanup action
        RAISE NOTICE 'Cleaning up room: % (%) - Status: %, Players: %, Last Activity: %',
            room_record.room_name,
            room_record.room_code,
            room_record.status,
            room_record.player_count,
            room_record.last_activity;
        
        -- Delete the room (CASCADE will handle related data)
        DELETE FROM public.game_rooms WHERE id = room_record.id;
        deleted_count := deleted_count + 1;
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get room activity status (for debugging)
CREATE OR REPLACE FUNCTION public.get_room_activity_status()
RETURNS TABLE (
    room_id UUID,
    room_name TEXT,
    room_code TEXT,
    status TEXT,
    player_count BIGINT,
    created_at TIMESTAMPTZ,
    last_activity TIMESTAMPTZ,
    age_minutes INTEGER,
    activity_minutes INTEGER,
    cleanup_eligible BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gr.id,
        gr.room_name,
        gr.room_code,
        gr.status,
        COALESCE(rp.player_count, 0) as player_count,
        gr.created_at,
        COALESCE(cm.last_activity, gr.created_at) as last_activity,
        EXTRACT(EPOCH FROM (NOW() - gr.created_at))::INTEGER / 60 as age_minutes,
        EXTRACT(EPOCH FROM (NOW() - COALESCE(cm.last_activity, gr.created_at)))::INTEGER / 60 as activity_minutes,
        (
            -- Empty rooms older than 30 minutes
            (COALESCE(rp.player_count, 0) = 0 AND gr.created_at < NOW() - INTERVAL '30 minutes')
            OR
            -- Waiting rooms with no activity for 2 hours
            (gr.status = 'waiting' AND COALESCE(cm.last_activity, gr.created_at) < NOW() - INTERVAL '2 hours')
            OR
            -- Playing rooms with no activity for 24 hours
            (gr.status = 'playing' AND COALESCE(cm.last_activity, gr.created_at) < NOW() - INTERVAL '24 hours')
        ) as cleanup_eligible
    FROM public.game_rooms gr
    LEFT JOIN (
        SELECT room_id, COUNT(*) as player_count
        FROM public.room_players
        GROUP BY room_id
    ) rp ON gr.id = rp.room_id
    LEFT JOIN (
        SELECT room_id, MAX(created_at) as last_activity
        FROM public.chat_messages
        GROUP BY room_id
    ) cm ON gr.id = cm.room_id
    ORDER BY gr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. CHAT SYSTEM FIXES
-- ============================================================================

-- Ensure chat_messages table has all required columns
DO $$ 
BEGIN
    -- Add target_user_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'chat_messages' AND column_name = 'target_user_id') THEN
        ALTER TABLE public.chat_messages ADD COLUMN target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
    
    -- Add is_deleted if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'chat_messages' AND column_name = 'is_deleted') THEN
        ALTER TABLE public.chat_messages ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Update message type constraint to include whisper
ALTER TABLE public.chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;

ALTER TABLE public.chat_messages 
ADD CONSTRAINT chat_messages_message_type_check 
CHECK (message_type IN ('general', 'team', 'system', 'whisper'));

-- Fix foreign key constraints
ALTER TABLE public.chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_target_user_id_fkey;

ALTER TABLE public.chat_messages 
ADD CONSTRAINT chat_messages_target_user_id_fkey 
FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;

ALTER TABLE public.chat_messages 
ADD CONSTRAINT chat_messages_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- RLS Policies for chat_messages
DROP POLICY IF EXISTS "Users can view room chat messages" ON public.chat_messages;
CREATE POLICY "Users can view room chat messages" ON public.chat_messages
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.room_players rp 
        WHERE rp.room_id = chat_messages.room_id 
        AND rp.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can send chat messages" ON public.chat_messages;
CREATE POLICY "Users can send chat messages" ON public.chat_messages
FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM public.room_players rp 
        WHERE rp.room_id = chat_messages.room_id 
        AND rp.user_id = auth.uid()
    )
);

-- Enable realtime for chat_messages (if not already enabled)
DO $$
BEGIN
    -- Check if chat_messages is already in the publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    END IF;
END $$;

-- ============================================================================
-- 3. GAME STATE PERSISTENCE
-- ============================================================================

-- Ensure game_state table exists
CREATE TABLE IF NOT EXISTS public.game_state (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    current_quest INTEGER DEFAULT 0,
    game_phase TEXT DEFAULT 'team_selection',
    good_wins INTEGER DEFAULT 0,
    evil_wins INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id)
);

-- RLS for game_state
ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage game state in their rooms" ON public.game_state;
CREATE POLICY "Users can manage game state in their rooms" ON public.game_state
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.room_players rp 
        WHERE rp.room_id = game_state.room_id 
        AND rp.user_id = auth.uid()
    )
);

-- Ensure role_assignments table exists
CREATE TABLE IF NOT EXISTS public.role_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role_name TEXT NOT NULL,
    team TEXT NOT NULL CHECK (team IN ('Good', 'Evil')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- RLS for role_assignments
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view role assignments in their rooms" ON public.role_assignments;
CREATE POLICY "Users can view role assignments in their rooms" ON public.role_assignments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.room_players rp 
        WHERE rp.room_id = role_assignments.room_id 
        AND rp.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Hosts can manage role assignments" ON public.role_assignments;
CREATE POLICY "Hosts can manage role assignments" ON public.role_assignments
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.game_rooms gr 
        WHERE gr.id = role_assignments.room_id 
        AND gr.host_id = auth.uid()
    )
);

-- ============================================================================
-- 4. UPDATED TRIGGERS
-- ============================================================================

-- Update updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS update_game_rooms_updated_at ON public.game_rooms;
CREATE TRIGGER update_game_rooms_updated_at 
    BEFORE UPDATE ON public.game_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_game_state_updated_at ON public.game_state;
CREATE TRIGGER update_game_state_updated_at 
    BEFORE UPDATE ON public.game_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. UTILITY FUNCTIONS
-- ============================================================================

-- Function to get room statistics
CREATE OR REPLACE FUNCTION public.get_room_stats()
RETURNS TABLE (
    total_rooms BIGINT,
    active_rooms BIGINT,
    playing_rooms BIGINT,
    total_players BIGINT,
    rooms_needing_cleanup BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM public.game_rooms) as total_rooms,
        (SELECT COUNT(*) FROM public.game_rooms WHERE status = 'waiting') as active_rooms,
        (SELECT COUNT(*) FROM public.game_rooms WHERE status = 'playing') as playing_rooms,
        (SELECT COUNT(*) FROM public.room_players) as total_players,
        (SELECT COUNT(*) FROM public.get_room_activity_status() WHERE cleanup_eligible = true) as rooms_needing_cleanup;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. INITIAL DATA AND TESTING
-- ============================================================================

-- Test the cleanup function (this will actually clean up eligible rooms!)
SELECT public.cleanup_inactive_rooms() as rooms_cleaned;

-- Check current room activity status
SELECT * FROM public.get_room_activity_status();

-- Get room statistics
SELECT * FROM public.get_room_stats();

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================

SELECT 'Complete database setup finished successfully!' as status,
       'Room cleanup system installed' as cleanup_system,
       'Chat system fixed and enhanced' as chat_system,
       'Game state persistence enabled' as game_persistence,
       'All triggers and policies updated' as security;
