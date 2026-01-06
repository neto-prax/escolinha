-- 1. Criar tabela de leads de matrícula (CRM)
CREATE TABLE public.enrollment_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  guardian_name TEXT NOT NULL,
  guardian_phone TEXT NOT NULL,
  guardian_email TEXT,
  guardian_cpf TEXT,
  student_name TEXT NOT NULL,
  student_birth_date DATE,
  student_grade TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'visit_scheduled', 'visited', 'proposal_sent', 'negotiating', 'enrolled', 'lost')),
  source TEXT,
  interest_level TEXT CHECK (interest_level IN ('low', 'medium', 'high')),
  expected_start DATE,
  assigned_to UUID REFERENCES public.profiles(id),
  sector_id UUID REFERENCES public.sectors(id),
  next_follow_up DATE,
  lost_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Criar tabela de atividades do CRM
CREATE TABLE public.enrollment_lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.enrollment_leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'message', 'email', 'visit', 'note', 'status_change')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Criar tabela de contatos unificados
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('lead', 'guardian', 'student', 'staff', 'other')),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  linked_student_ids UUID[] DEFAULT '{}',
  guardian_id UUID REFERENCES public.guardians(id),
  student_id UUID REFERENCES public.students(id),
  lead_id UUID REFERENCES public.enrollment_leads(id),
  profile_id UUID REFERENCES public.profiles(id),
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Criar tabela de respostas rápidas
CREATE TABLE public.quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  sector_id UUID REFERENCES public.sectors(id),
  shortcut TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Adicionar campos ao whatsapp_conversations para tickets
ALTER TABLE public.whatsapp_conversations 
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id),
  ADD COLUMN IF NOT EXISTS ticket_status TEXT DEFAULT 'open' CHECK (ticket_status IN ('open', 'pending', 'resolved', 'closed')),
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_summary TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 6. Adicionar campos ao whatsapp_messages para mídia e replies
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.whatsapp_messages(id),
  ADD COLUMN IF NOT EXISTS media_caption TEXT,
  ADD COLUMN IF NOT EXISTS media_filename TEXT,
  ADD COLUMN IF NOT EXISTS reaction TEXT,
  ADD COLUMN IF NOT EXISTS is_quick_reply BOOLEAN DEFAULT false;

-- 7. Criar bucket de storage para mídia de mensagens
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-media', 'message-media', true)
ON CONFLICT (id) DO NOTHING;

-- 8. RLS para enrollment_leads
ALTER TABLE public.enrollment_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view leads from their school"
ON public.enrollment_leads FOR SELECT
USING (school_id = get_user_school_id(auth.uid()) OR is_director(auth.uid(), school_id));

CREATE POLICY "Users can manage leads from their sectors"
ON public.enrollment_leads FOR ALL
USING (
  is_director(auth.uid(), school_id) OR 
  has_sector_access(auth.uid(), sector_id) OR 
  assigned_to = auth.uid()
);

-- 9. RLS para enrollment_lead_activities
ALTER TABLE public.enrollment_lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activities for accessible leads"
ON public.enrollment_lead_activities FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.enrollment_leads el 
  WHERE el.id = lead_id 
  AND (el.school_id = get_user_school_id(auth.uid()) OR is_director(auth.uid(), el.school_id))
));

CREATE POLICY "Users can create activities"
ON public.enrollment_lead_activities FOR INSERT
WITH CHECK (user_id = auth.uid());

-- 10. RLS para contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contacts from their school"
ON public.contacts FOR SELECT
USING (school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Users can manage contacts from their school"
ON public.contacts FOR ALL
USING (school_id = get_user_school_id(auth.uid()) OR is_director(auth.uid(), school_id));

-- 11. RLS para quick_replies
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quick replies from their school"
ON public.quick_replies FOR SELECT
USING (school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Directors can manage quick replies"
ON public.quick_replies FOR ALL
USING (is_director(auth.uid(), school_id));

-- 12. Storage policies para message-media
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'message-media' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view media"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-media');

-- 13. Triggers para updated_at
CREATE TRIGGER update_enrollment_leads_updated_at
BEFORE UPDATE ON public.enrollment_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Índices para performance
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_school_type ON public.contacts(school_id, contact_type);
CREATE INDEX IF NOT EXISTS idx_enrollment_leads_school_status ON public.enrollment_leads(school_id, status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_ticket ON public.whatsapp_conversations(school_id, ticket_status);