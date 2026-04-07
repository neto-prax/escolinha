
CREATE TABLE public.psychology_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.profiles(id),
  record_type TEXT NOT NULL DEFAULT 'atendimento',
  title TEXT NOT NULL,
  description TEXT,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER,
  participants TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  follow_up_date DATE,
  follow_up_notes TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.psychology_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view psychology records from their school"
  ON public.psychology_records FOR SELECT
  USING (school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Directors and professionals can manage psychology records"
  ON public.psychology_records FOR ALL
  USING (
    is_director(auth.uid(), school_id) 
    OR professional_id = auth.uid()
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.psychology_records;
