-- Criar tabela de calendários (agrupadores)
CREATE TABLE public.calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  class_start_date date,
  class_end_date date,
  year integer NOT NULL,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar coluna calendar_id na tabela school_calendar existente
ALTER TABLE public.school_calendar ADD COLUMN calendar_id uuid REFERENCES public.calendars(id) ON DELETE CASCADE;

-- RLS para calendars
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Directors and secretary can manage calendars"
  ON public.calendars FOR ALL
  USING (is_director(auth.uid(), school_id) OR has_role(auth.uid(), 'secretary', school_id));

CREATE POLICY "Users can view school calendars"
  ON public.calendars FOR SELECT
  USING (school_id = get_user_school_id(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_calendars_updated_at
  BEFORE UPDATE ON public.calendars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();