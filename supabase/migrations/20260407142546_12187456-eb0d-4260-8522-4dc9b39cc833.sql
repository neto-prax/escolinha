
-- 1. Create guardian_portal_access table
CREATE TABLE public.guardian_portal_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(guardian_id)
);

ALTER TABLE public.guardian_portal_access ENABLE ROW LEVEL SECURITY;

-- 2. Function to check if user is a guardian portal user
CREATE OR REPLACE FUNCTION public.is_guardian_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.guardian_portal_access
    WHERE user_id = _user_id AND is_active = true
  )
$$;

-- 3. Function to get guardian_id from user_id
CREATE OR REPLACE FUNCTION public.get_guardian_id_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT guardian_id FROM public.guardian_portal_access
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1
$$;

-- 4. Function to get student IDs linked to a guardian
CREATE OR REPLACE FUNCTION public.get_guardian_student_ids(_guardian_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT student_id FROM public.student_guardians
  WHERE guardian_id = _guardian_id
$$;

-- 5. RLS for guardian_portal_access
CREATE POLICY "Guardians can view their own access" ON public.guardian_portal_access
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Directors and secretaries can manage guardian access" ON public.guardian_portal_access
FOR ALL USING (
  is_director(auth.uid(), school_id) OR has_role(auth.uid(), 'secretary'::app_role, school_id)
);

-- 6. RLS for guardians: guardian can view own record
CREATE POLICY "Guardian portal users can view their own guardian record" ON public.guardians
FOR SELECT USING (id = get_guardian_id_for_user(auth.uid()));

-- 7. RLS for students: guardian can view linked students
CREATE POLICY "Guardian portal users can view their students" ON public.students
FOR SELECT USING (
  id IN (SELECT get_guardian_student_ids(get_guardian_id_for_user(auth.uid())))
);

-- 8. RLS for attendance: guardian can view their students' attendance
CREATE POLICY "Guardian portal users can view student attendance" ON public.attendance
FOR SELECT USING (
  student_id IN (SELECT get_guardian_student_ids(get_guardian_id_for_user(auth.uid())))
);

-- 9. RLS for grades: guardian can view their students' grades
CREATE POLICY "Guardian portal users can view student grades" ON public.grades
FOR SELECT USING (
  student_id IN (SELECT get_guardian_student_ids(get_guardian_id_for_user(auth.uid())))
);

-- 10. RLS for billing: guardian can view their billing
CREATE POLICY "Guardian portal users can view their billing" ON public.billing
FOR SELECT USING (
  guardian_id = get_guardian_id_for_user(auth.uid())
  OR student_id IN (SELECT get_guardian_student_ids(get_guardian_id_for_user(auth.uid())))
);

-- 11. RLS for daily_entries: guardian can view entries for their students' classes
CREATE POLICY "Guardian portal users can view daily entries" ON public.daily_entries
FOR SELECT USING (
  class_id IN (
    SELECT sc.class_id FROM public.student_classes sc
    WHERE sc.student_id IN (SELECT get_guardian_student_ids(get_guardian_id_for_user(auth.uid())))
  )
);

-- 12. RLS for school_calendar: guardian can view school calendar
CREATE POLICY "Guardian portal users can view school calendar" ON public.school_calendar
FOR SELECT USING (
  school_id = (SELECT school_id FROM public.guardian_portal_access WHERE user_id = auth.uid() AND is_active = true LIMIT 1)
);

-- 13. RLS for student_guardians: guardian can view their links
CREATE POLICY "Guardian portal users can view their student links" ON public.student_guardians
FOR SELECT USING (
  guardian_id = get_guardian_id_for_user(auth.uid())
);

-- 14. RLS for classes: guardian can view classes of their students
CREATE POLICY "Guardian portal users can view student classes" ON public.classes
FOR SELECT USING (
  id IN (
    SELECT sc.class_id FROM public.student_classes sc
    WHERE sc.student_id IN (SELECT get_guardian_student_ids(get_guardian_id_for_user(auth.uid())))
  )
);

-- 15. RLS for student_classes: guardian can view their students' class assignments
CREATE POLICY "Guardian portal users can view student class assignments" ON public.student_classes
FOR SELECT USING (
  student_id IN (SELECT get_guardian_student_ids(get_guardian_id_for_user(auth.uid())))
);
