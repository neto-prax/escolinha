CREATE TABLE public.app_state (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_state TO authenticated;
GRANT ALL ON public.app_state TO service_role;

ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School users can view app state"
ON public.app_state FOR SELECT TO authenticated
USING (school_id = public.get_user_school_id(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "School users can insert app state"
ON public.app_state FOR INSERT TO authenticated
WITH CHECK (school_id = public.get_user_school_id(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "School users can update app state"
ON public.app_state FOR UPDATE TO authenticated
USING (school_id = public.get_user_school_id(auth.uid()) OR public.is_super_admin(auth.uid()))
WITH CHECK (school_id = public.get_user_school_id(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "School users can delete app state"
ON public.app_state FOR DELETE TO authenticated
USING (school_id = public.get_user_school_id(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER update_app_state_updated_at
BEFORE UPDATE ON public.app_state
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();