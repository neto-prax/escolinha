-- Grant Super Admin full access to whatsapp_conversations and whatsapp_messages

-- 1. whatsapp_conversations SELECT policy
DROP POLICY IF EXISTS "Users can view conversations for their school" ON public.whatsapp_conversations;
CREATE POLICY "Users can view conversations for their school" 
ON public.whatsapp_conversations FOR SELECT 
USING (
  (
    school_id = public.get_user_school_id(auth.uid())
    AND (
      sector_id IS NULL 
      OR has_sector_access(auth.uid(), sector_id) 
      OR is_director(auth.uid(), school_id)
    )
  )
  OR public.is_super_admin(auth.uid())
);

-- 2. whatsapp_conversations ALL policy
DROP POLICY IF EXISTS "Users can manage conversations for their school" ON public.whatsapp_conversations;
CREATE POLICY "Users can manage conversations for their school" 
ON public.whatsapp_conversations FOR ALL 
USING (
  (
    school_id = public.get_user_school_id(auth.uid())
    AND (
      sector_id IS NULL 
      OR has_sector_access(auth.uid(), sector_id) 
      OR is_director(auth.uid(), school_id)
    )
  )
  OR public.is_super_admin(auth.uid())
);

-- 3. whatsapp_messages SELECT policy
DROP POLICY IF EXISTS "Users can view messages from accessible conversations" ON public.whatsapp_messages;
CREATE POLICY "Users can view messages from accessible conversations" 
ON public.whatsapp_messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    WHERE wc.id = whatsapp_messages.conversation_id
    AND wc.school_id = public.get_user_school_id(auth.uid())
    AND (
      wc.sector_id IS NULL 
      OR has_sector_access(auth.uid(), wc.sector_id) 
      OR is_director(auth.uid(), wc.school_id)
    )
  )
  OR public.is_super_admin(auth.uid())
);

-- 4. whatsapp_messages ALL policy
DROP POLICY IF EXISTS "Users can manage messages in accessible conversations" ON public.whatsapp_messages;
CREATE POLICY "Users can manage messages in accessible conversations" 
ON public.whatsapp_messages FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    WHERE wc.id = whatsapp_messages.conversation_id
    AND wc.school_id = public.get_user_school_id(auth.uid())
    AND (
      wc.sector_id IS NULL 
      OR has_sector_access(auth.uid(), wc.sector_id) 
      OR is_director(auth.uid(), wc.school_id)
    )
  )
  OR public.is_super_admin(auth.uid())
);

-- 5. schools INSERT policy for Super Admin
DROP POLICY IF EXISTS "Super admins can insert schools" ON public.schools;
CREATE POLICY "Super admins can insert schools"
ON public.schools FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

-- 6. Enhance is_super_admin to recognize super@purpple.com and sport@gmail.com
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.super_admins
        WHERE user_id = _user_id
    )
    OR EXISTS (
        SELECT 1
        FROM auth.users
        WHERE id = _user_id
        AND email IN ('super@purpple.com', 'sport@gmail.com')
    );
$$;

-- 7. Automatically ensure super admins are present in public.super_admins
INSERT INTO public.super_admins (user_id)
SELECT id FROM auth.users WHERE email IN ('super@purpple.com', 'sport@gmail.com')
ON CONFLICT (user_id) DO NOTHING;


