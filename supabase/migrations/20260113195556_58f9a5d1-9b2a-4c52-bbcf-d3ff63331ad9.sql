-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Directors can manage sectors" ON public.sectors;

-- Create new policy allowing directors and admins to manage sectors
CREATE POLICY "Directors and admins can manage sectors" ON public.sectors FOR ALL USING (
  school_id = public.get_user_school_id(auth.uid())
  AND (
    public.is_director(auth.uid(), school_id)
    OR public.has_role(auth.uid(), 'admin'::app_role, school_id)
  )
);

-- Also update user_sectors to allow admins
DROP POLICY IF EXISTS "Directors can manage user sectors" ON public.user_sectors;

CREATE POLICY "Directors and admins can manage user sectors" ON public.user_sectors FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.sectors s 
    WHERE s.id = sector_id 
    AND (
      public.is_director(auth.uid(), s.school_id)
      OR public.has_role(auth.uid(), 'admin'::app_role, s.school_id)
    )
  )
);