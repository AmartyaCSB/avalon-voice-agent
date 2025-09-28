-- Quick fix for chat functionality
-- Run this in Supabase SQL Editor

-- Add missing fields to chat_messages table
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES public.users(id);

ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Update message_type enum to include whisper
ALTER TABLE public.chat_messages 
ALTER COLUMN message_type TYPE TEXT;

-- Add check constraint for message types
ALTER TABLE public.chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;

ALTER TABLE public.chat_messages 
ADD CONSTRAINT chat_messages_message_type_check 
CHECK (message_type IN ('general', 'team', 'system', 'whisper'));

-- Make sure RLS policies allow reading/writing
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

-- Enable realtime for chat_messages if not already enabled
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
