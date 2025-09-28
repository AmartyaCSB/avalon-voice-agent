-- IMMEDIATE CHAT FIX - Run this in Supabase SQL Editor NOW
-- This will fix the chat functionality

-- First, check if the table has the right structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'chat_messages' AND table_schema = 'public';

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add target_user_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'target_user_id' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.chat_messages 
        ADD COLUMN target_user_id UUID REFERENCES public.users(id);
    END IF;

    -- Add is_deleted if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'is_deleted' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.chat_messages 
        ADD COLUMN is_deleted BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Update message_type to allow whisper
ALTER TABLE public.chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;

ALTER TABLE public.chat_messages 
ADD CONSTRAINT chat_messages_message_type_check 
CHECK (message_type IN ('general', 'team', 'system', 'whisper'));

-- Ensure RLS policies are correct
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;
CREATE POLICY "Users can view messages in their rooms" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_players 
            WHERE room_id = chat_messages.room_id 
            AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can send messages in their rooms" ON public.chat_messages;
CREATE POLICY "Users can send messages in their rooms" ON public.chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.room_players 
            WHERE room_id = chat_messages.room_id 
            AND user_id = auth.uid()
        )
    );

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Test insert to verify it works
INSERT INTO public.chat_messages (room_id, user_id, message, message_type)
SELECT 
    gr.id,
    auth.uid(),
    'Test message from system',
    'system'
FROM public.game_rooms gr 
LIMIT 1
WHERE EXISTS (
    SELECT 1 FROM public.room_players rp 
    WHERE rp.room_id = gr.id 
    AND rp.user_id = auth.uid()
);

SELECT 'Chat fix completed successfully!' as status;
