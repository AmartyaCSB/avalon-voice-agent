-- ROOM CLEANUP SYSTEM - Run this in Supabase SQL Editor
-- This creates automatic cleanup of inactive rooms

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

-- Add updated_at trigger to game_rooms if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate the trigger for game_rooms
DROP TRIGGER IF EXISTS update_game_rooms_updated_at ON public.game_rooms;
CREATE TRIGGER update_game_rooms_updated_at 
    BEFORE UPDATE ON public.game_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Test the cleanup function (this will actually clean up eligible rooms!)
SELECT public.cleanup_inactive_rooms() as rooms_cleaned;

-- Check current room activity status
SELECT * FROM public.get_room_activity_status();

SELECT 'Room cleanup system installed successfully!' as status;
