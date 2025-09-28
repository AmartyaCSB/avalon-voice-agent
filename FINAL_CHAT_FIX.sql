-- FINAL CHAT FIX - Run this in Supabase SQL Editor
-- This avoids the publication error and completes the setup

-- Step 1: Add missing columns
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES public.users(id);

ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Step 2: Fix message_type constraint
ALTER TABLE public.chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;

ALTER TABLE public.chat_messages 
ADD CONSTRAINT chat_messages_message_type_check 
CHECK (message_type IN ('general', 'team', 'system', 'whisper'));

-- Step 3: Create proper RLS policies
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

-- Step 4: Verify the setup works
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
    AND table_schema = 'public'
    AND column_name IN ('target_user_id', 'is_deleted')
ORDER BY column_name;

-- Success message
SELECT 'Chat functionality has been completely fixed!' as status;
