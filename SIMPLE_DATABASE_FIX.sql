-- SIMPLE DATABASE FIX FOR AVALON ROOMS
-- Run this in Supabase SQL Editor to fix room functionality

-- ============================================================================
-- 1. ENSURE PROPER FOREIGN KEY RELATIONSHIPS
-- ============================================================================

-- Fix game_rooms table
ALTER TABLE public.game_rooms 
ADD COLUMN IF NOT EXISTS current_players INTEGER DEFAULT 0;

-- Update current_players count function
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

-- Create trigger for player count updates
DROP TRIGGER IF EXISTS update_room_player_count_trigger ON public.room_players;
CREATE TRIGGER update_room_player_count_trigger
    AFTER INSERT OR DELETE ON public.room_players
    FOR EACH ROW EXECUTE FUNCTION update_room_player_count();

-- ============================================================================
-- 2. FIX RLS POLICIES FOR ROOM ACCESS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view waiting rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Room members can view room players" ON public.room_players;
DROP POLICY IF EXISTS "Users can join rooms" ON public.room_players;

-- Simple, permissive policies for testing
CREATE POLICY "Anyone can view rooms" ON public.game_rooms
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create rooms" ON public.game_rooms
    FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their rooms" ON public.game_rooms
    FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their rooms" ON public.game_rooms
    FOR DELETE USING (auth.uid() = host_id);

-- Room players policies
CREATE POLICY "Anyone can view room players" ON public.room_players
    FOR SELECT USING (true);

CREATE POLICY "Users can join rooms" ON public.room_players
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms" ON public.room_players
    FOR DELETE USING (auth.uid() = user_id);

-- Player profiles policies
CREATE POLICY "Anyone can view profiles" ON public.player_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own profiles" ON public.player_profiles
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 3. CREATE SIMPLE ROOM VIEW WITH PLAYER COUNTS
-- ============================================================================

CREATE OR REPLACE VIEW public.rooms_with_players AS
SELECT 
    gr.*,
    COALESCE(rp.player_count, 0) as current_players,
    u.display_name as host_name
FROM public.game_rooms gr
LEFT JOIN public.users u ON gr.host_id = u.id
LEFT JOIN (
    SELECT room_id, COUNT(*) as player_count
    FROM public.room_players
    GROUP BY room_id
) rp ON gr.id = rp.room_id;

-- Grant access to the view
GRANT SELECT ON public.rooms_with_players TO authenticated;

-- ============================================================================
-- 4. ENABLE REALTIME FOR ALL TABLES
-- ============================================================================

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- ============================================================================
-- 5. CREATE SIMPLE TEST DATA (OPTIONAL)
-- ============================================================================

-- You can run this to create test data if needed
-- INSERT INTO public.game_rooms (room_name, room_code, host_id, max_players, status)
-- VALUES ('Test Room', 'TEST01', auth.uid(), 10, 'waiting');
