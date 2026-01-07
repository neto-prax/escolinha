-- Drop existing policies
DROP POLICY IF EXISTS "Users can view conversations for their sectors" ON whatsapp_conversations;
DROP POLICY IF EXISTS "Users can manage conversations for their sectors" ON whatsapp_conversations;
DROP POLICY IF EXISTS "Users can view messages from accessible conversations" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can create messages in accessible conversations" ON whatsapp_messages;

-- Create new policies that handle null sector_id properly
-- Conversations: Users can view if they have sector access OR director OR sector_id is null (unassigned)
CREATE POLICY "Users can view conversations for their school" 
ON whatsapp_conversations FOR SELECT 
USING (
  school_id = public.get_user_school_id(auth.uid())
  AND (
    sector_id IS NULL 
    OR has_sector_access(auth.uid(), sector_id) 
    OR is_director(auth.uid(), school_id)
  )
);

-- Conversations: Users can manage based on same rules
CREATE POLICY "Users can manage conversations for their school" 
ON whatsapp_conversations FOR ALL 
USING (
  school_id = public.get_user_school_id(auth.uid())
  AND (
    sector_id IS NULL 
    OR has_sector_access(auth.uid(), sector_id) 
    OR is_director(auth.uid(), school_id)
  )
);

-- Messages: Users can view if they can access the conversation
CREATE POLICY "Users can view messages from accessible conversations" 
ON whatsapp_messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM whatsapp_conversations wc
    WHERE wc.id = whatsapp_messages.conversation_id
    AND wc.school_id = public.get_user_school_id(auth.uid())
    AND (
      wc.sector_id IS NULL 
      OR has_sector_access(auth.uid(), wc.sector_id) 
      OR is_director(auth.uid(), wc.school_id)
    )
  )
);

-- Messages: Users can create/manage if they can access the conversation  
CREATE POLICY "Users can manage messages in accessible conversations" 
ON whatsapp_messages FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM whatsapp_conversations wc
    WHERE wc.id = whatsapp_messages.conversation_id
    AND wc.school_id = public.get_user_school_id(auth.uid())
    AND (
      wc.sector_id IS NULL 
      OR has_sector_access(auth.uid(), wc.sector_id) 
      OR is_director(auth.uid(), wc.school_id)
    )
  )
);