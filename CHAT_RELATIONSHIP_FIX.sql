-- CHAT RELATIONSHIP FIX - Run this in Supabase SQL Editor
-- This fixes the PGRST201 relationship errors

-- Drop the problematic foreign key and recreate it properly
ALTER TABLE public.chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_target_user_id_fkey;

ALTER TABLE public.chat_messages 
ADD CONSTRAINT chat_messages_target_user_id_fkey 
FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Ensure the user_id foreign key is correct
ALTER TABLE public.chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;

ALTER TABLE public.chat_messages 
ADD CONSTRAINT chat_messages_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Fix the RLS policies to be simpler and more reliable
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;
CREATE POLICY "Users can view messages in their rooms" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_players rp
            WHERE rp.room_id = chat_messages.room_id 
            AND rp.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can send messages in their rooms" ON public.chat_messages;
CREATE POLICY "Users can send messages in their rooms" ON public.chat_messages
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.room_players rp
            WHERE rp.room_id = chat_messages.room_id 
            AND rp.user_id = auth.uid()
        )
    );

-- Test the fix by checking the table structure
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'chat_messages';

SELECT 'Chat relationships fixed successfully!' as status;
