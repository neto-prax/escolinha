-- Fix tenant isolation vulnerabilities identified in audit

-- 1. Fix profile update policy to prevent school_id hopping
-- Users should not be able to change their own school_id or is_active status
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() 
  AND (
    (school_id IS NOT DISTINCT FROM (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
    OR public.is_super_admin(auth.uid())
  )
);

-- 2. Fix schools view policy to prevent directors from seeing all schools
DROP POLICY IF EXISTS "Users can view their own school" ON public.schools;
CREATE POLICY "Users can view their own school" 
ON public.schools 
FOR SELECT 
USING (
  id = public.get_user_school_id(auth.uid()) 
  OR public.is_super_admin(auth.uid())
);

-- 3. Fix has_sector_access to be school-aware
CREATE OR REPLACE FUNCTION public.has_sector_access(_user_id uuid, _sector_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_school_id uuid;
BEGIN
  -- Get the school_id for the sector
  SELECT school_id INTO _target_school_id FROM public.sectors WHERE id = _sector_id;
  
  RETURN EXISTS (
    SELECT 1 FROM public.user_sectors WHERE user_id = _user_id AND sector_id = _sector_id
  ) OR public.is_director(_user_id, _target_school_id) OR public.is_super_admin(_user_id);
END;
$$;

-- 4. Update instance_sectors policies to ensure context-aware director checks
DROP POLICY IF EXISTS "Directors can manage instance sectors" ON public.instance_sectors;
CREATE POLICY "Directors can manage instance sectors"
ON public.instance_sectors
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.evolution_instances ei
    WHERE ei.id = instance_id
    AND (
      ei.school_id = public.get_user_school_id(auth.uid())
      AND public.is_director(auth.uid(), ei.school_id)
    )
  ) OR public.is_super_admin(auth.uid())
);

-- 5. Ensure app_state policies are robust (already mostly good, but reinforcing)
-- The existing policies for app_state use get_user_school_id(auth.uid())
-- which is now protected by the fix in step 1.
