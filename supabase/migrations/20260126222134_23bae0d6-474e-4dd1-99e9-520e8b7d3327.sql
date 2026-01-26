-- Create school_calendar table
CREATE TABLE public.school_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date,
  event_type text NOT NULL DEFAULT 'event',
  affects_school_days boolean DEFAULT false,
  year integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.school_calendar ENABLE ROW LEVEL SECURITY;

-- Directors and secretary can manage calendar
CREATE POLICY "Directors and secretary can manage calendar"
  ON public.school_calendar FOR ALL
  USING (is_director(auth.uid(), school_id) 
    OR has_role(auth.uid(), 'secretary', school_id));

-- All school users can view calendar
CREATE POLICY "Users can view school calendar"
  ON public.school_calendar FOR SELECT
  USING (school_id = get_user_school_id(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_school_calendar_updated_at
  BEFORE UPDATE ON public.school_calendar
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();