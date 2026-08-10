CREATE TABLE public.daily_report_settings (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade unique,
  recipients text[] not null default '{}',
  send_hour integer not null default 18,
  is_active boolean not null default false,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_report_settings TO authenticated;
GRANT ALL ON public.daily_report_settings TO service_role;

ALTER TABLE public.daily_report_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School users can view their report settings"
ON public.daily_report_settings FOR SELECT TO authenticated
USING (school_id = public.get_user_school_id(auth.uid()));

CREATE POLICY "School users can manage their report settings"
ON public.daily_report_settings FOR ALL TO authenticated
USING (school_id = public.get_user_school_id(auth.uid()))
WITH CHECK (school_id = public.get_user_school_id(auth.uid()));

CREATE TRIGGER update_daily_report_settings_updated_at
BEFORE UPDATE ON public.daily_report_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();