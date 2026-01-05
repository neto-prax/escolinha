-- Enum para roles de usuário
CREATE TYPE public.app_role AS ENUM ('teacher', 'secretary', 'admin', 'director');

-- Tabela de escolas (multi-tenant)
CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de roles (separada para segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, school_id)
);

-- Tabela de setores
CREATE TABLE public.sectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  evolution_instance TEXT,
  whatsapp_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Associação usuário-setor
CREATE TABLE public.user_sectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, sector_id)
);

-- Tabela de turmas
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  shift TEXT,
  grade TEXT,
  max_students INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Associação professor-turma
CREATE TABLE public.teacher_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, class_id, subject)
);

-- Tabela de alunos
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  birth_date DATE,
  gender TEXT,
  photo_url TEXT,
  enrollment_number TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de responsáveis
CREATE TABLE public.guardians (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  relationship TEXT,
  cpf TEXT,
  address TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Associação aluno-responsável
CREATE TABLE public.student_guardians (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (student_id, guardian_id)
);

-- Associação aluno-turma
CREATE TABLE public.student_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (student_id, class_id)
);

-- Tabela de registro diário
CREATE TABLE public.daily_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT,
  homework TEXT,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de frequência
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_entry_id UUID REFERENCES public.daily_entries(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de notas
CREATE TABLE public.grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT,
  grade_type TEXT,
  value DECIMAL(5,2),
  max_value DECIMAL(5,2) DEFAULT 10,
  period TEXT,
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Logs de envio em massa
CREATE TABLE public.broadcast_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  daily_entry_id UUID REFERENCES public.daily_entries(id) ON DELETE SET NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Conversas WhatsApp
CREATE TABLE public.whatsapp_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  guardian_id UUID REFERENCES public.guardians(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  contact_name TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mensagens WhatsApp
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  body TEXT,
  media_url TEXT,
  status TEXT DEFAULT 'sent',
  external_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Matrículas
CREATE TABLE public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  enrollment_date DATE,
  documents JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mensalidades
CREATE TABLE public.billing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES public.guardians(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_date DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Pagamentos
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  billing_id UUID NOT NULL REFERENCES public.billing(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Plano de contas
CREATE TABLE public.chart_of_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  parent_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Lançamentos financeiros
CREATE TABLE public.finance_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contratos
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES public.guardians(id) ON DELETE SET NULL,
  contract_number TEXT,
  start_date DATE,
  end_date DATE,
  monthly_value DECIMAL(10,2),
  status TEXT DEFAULT 'active',
  document_url TEXT,
  terms JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Leads (captação)
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  state TEXT,
  student_count TEXT,
  message TEXT,
  status TEXT DEFAULT 'new',
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Logs de auditoria
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Evolution API instances
CREATE TABLE public.evolution_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  api_url TEXT,
  api_key TEXT,
  status TEXT DEFAULT 'disconnected',
  qr_code TEXT,
  connected_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Planejamento de aulas
CREATE TABLE public.lesson_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  objectives TEXT,
  content TEXT,
  methodology TEXT,
  resources TEXT,
  evaluation TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

-- Function to check if user has a specific role in a school
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role, _school_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (_school_id IS NULL OR school_id = _school_id)
  )
$$;

-- Function to check if user is a director
CREATE OR REPLACE FUNCTION public.is_director(_user_id uuid, _school_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'director', _school_id)
$$;

-- Function to get user's school id
CREATE OR REPLACE FUNCTION public.get_user_school_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- Function to check sector access
CREATE OR REPLACE FUNCTION public.has_sector_access(_user_id uuid, _sector_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_sectors WHERE user_id = _user_id AND sector_id = _sector_id
  ) OR public.is_director(_user_id)
$$;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'full_name', new.email));
  RETURN new;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sectors_updated_at BEFORE UPDATE ON public.sectors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_guardians_updated_at BEFORE UPDATE ON public.guardians FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_entries_updated_at BEFORE UPDATE ON public.daily_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_conversations_updated_at BEFORE UPDATE ON public.whatsapp_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_billing_updated_at BEFORE UPDATE ON public.billing FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_evolution_instances_updated_at BEFORE UPDATE ON public.evolution_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lesson_plans_updated_at BEFORE UPDATE ON public.lesson_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Schools: Users can view their own school
CREATE POLICY "Users can view their own school" ON public.schools FOR SELECT USING (
  id = public.get_user_school_id(auth.uid()) OR public.is_director(auth.uid())
);

CREATE POLICY "Directors can manage their school" ON public.schools FOR ALL USING (
  public.is_director(auth.uid(), id)
);

-- Profiles: Users can view profiles from their school
CREATE POLICY "Users can view profiles from their school" ON public.profiles FOR SELECT USING (
  school_id = public.get_user_school_id(auth.uid()) OR id = auth.uid()
);

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Directors can manage all profiles" ON public.profiles FOR ALL USING (
  public.is_director(auth.uid(), school_id)
);

-- User roles: Only directors can manage
CREATE POLICY "Directors can manage user roles" ON public.user_roles FOR ALL USING (
  public.is_director(auth.uid(), school_id)
);

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());

-- Sectors: School-based access
CREATE POLICY "Users can view sectors from their school" ON public.sectors FOR SELECT USING (
  school_id = public.get_user_school_id(auth.uid())
);

CREATE POLICY "Directors can manage sectors" ON public.sectors FOR ALL USING (
  public.is_director(auth.uid(), school_id)
);

-- User sectors
CREATE POLICY "Directors can manage user sectors" ON public.user_sectors FOR ALL USING (
  EXISTS (SELECT 1 FROM public.sectors s WHERE s.id = sector_id AND public.is_director(auth.uid(), s.school_id))
);

CREATE POLICY "Users can view their own sector assignments" ON public.user_sectors FOR SELECT USING (user_id = auth.uid());

-- Classes: School-based access
CREATE POLICY "Users can view classes from their school" ON public.classes FOR SELECT USING (
  school_id = public.get_user_school_id(auth.uid())
);

CREATE POLICY "Directors and secretary can manage classes" ON public.classes FOR ALL USING (
  public.is_director(auth.uid(), school_id) OR public.has_role(auth.uid(), 'secretary', school_id)
);

-- Teacher classes
CREATE POLICY "Users can view teacher-class associations" ON public.teacher_classes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.school_id = public.get_user_school_id(auth.uid()))
);

CREATE POLICY "Directors can manage teacher classes" ON public.teacher_classes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND public.is_director(auth.uid(), c.school_id))
);

-- Students: School-based access
CREATE POLICY "Users can view students from their school" ON public.students FOR SELECT USING (
  school_id = public.get_user_school_id(auth.uid())
);

CREATE POLICY "Secretary and directors can manage students" ON public.students FOR ALL USING (
  public.is_director(auth.uid(), school_id) OR public.has_role(auth.uid(), 'secretary', school_id)
);

-- Guardians: School-based access
CREATE POLICY "Users can view guardians from their school" ON public.guardians FOR SELECT USING (
  school_id = public.get_user_school_id(auth.uid())
);

CREATE POLICY "Secretary and directors can manage guardians" ON public.guardians FOR ALL USING (
  public.is_director(auth.uid(), school_id) OR public.has_role(auth.uid(), 'secretary', school_id)
);

-- Student guardians
CREATE POLICY "Users can view student-guardian associations" ON public.student_guardians FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.school_id = public.get_user_school_id(auth.uid()))
);

CREATE POLICY "Secretary and directors can manage student guardians" ON public.student_guardians FOR ALL USING (
  EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND (public.is_director(auth.uid(), s.school_id) OR public.has_role(auth.uid(), 'secretary', s.school_id)))
);

-- Student classes
CREATE POLICY "Users can view student-class associations" ON public.student_classes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.school_id = public.get_user_school_id(auth.uid()))
);

CREATE POLICY "Secretary and directors can manage student classes" ON public.student_classes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND (public.is_director(auth.uid(), s.school_id) OR public.has_role(auth.uid(), 'secretary', s.school_id)))
);

-- Daily entries: Teachers can manage their own entries
CREATE POLICY "Teachers can view daily entries for their classes" ON public.daily_entries FOR SELECT USING (
  teacher_id = auth.uid() OR 
  school_id = public.get_user_school_id(auth.uid()) AND public.is_director(auth.uid(), school_id)
);

CREATE POLICY "Teachers can create their own daily entries" ON public.daily_entries FOR INSERT WITH CHECK (
  teacher_id = auth.uid() AND 
  EXISTS (SELECT 1 FROM public.teacher_classes tc WHERE tc.teacher_id = auth.uid() AND tc.class_id = class_id)
);

CREATE POLICY "Teachers can update their own daily entries" ON public.daily_entries FOR UPDATE USING (teacher_id = auth.uid());

-- Attendance
CREATE POLICY "Teachers can manage attendance for their classes" ON public.attendance FOR ALL USING (
  EXISTS (SELECT 1 FROM public.teacher_classes tc WHERE tc.teacher_id = auth.uid() AND tc.class_id = class_id) OR
  EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND public.is_director(auth.uid(), c.school_id))
);

-- Grades
CREATE POLICY "Teachers can manage grades for their classes" ON public.grades FOR ALL USING (
  teacher_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND public.is_director(auth.uid(), c.school_id))
);

-- Broadcast logs
CREATE POLICY "Teachers can view their broadcast logs" ON public.broadcast_logs FOR SELECT USING (
  teacher_id = auth.uid() OR public.is_director(auth.uid(), school_id)
);

CREATE POLICY "Teachers can create broadcast logs" ON public.broadcast_logs FOR INSERT WITH CHECK (teacher_id = auth.uid());

-- WhatsApp conversations: Sector-based access
CREATE POLICY "Users can view conversations for their sectors" ON public.whatsapp_conversations FOR SELECT USING (
  public.has_sector_access(auth.uid(), sector_id) OR public.is_director(auth.uid(), school_id)
);

CREATE POLICY "Users can manage conversations for their sectors" ON public.whatsapp_conversations FOR ALL USING (
  public.has_sector_access(auth.uid(), sector_id) OR public.is_director(auth.uid(), school_id)
);

-- WhatsApp messages
CREATE POLICY "Users can view messages from accessible conversations" ON public.whatsapp_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.whatsapp_conversations wc WHERE wc.id = conversation_id AND (public.has_sector_access(auth.uid(), wc.sector_id) OR public.is_director(auth.uid(), wc.school_id)))
);

CREATE POLICY "Users can create messages in accessible conversations" ON public.whatsapp_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.whatsapp_conversations wc WHERE wc.id = conversation_id AND (public.has_sector_access(auth.uid(), wc.sector_id) OR public.is_director(auth.uid(), wc.school_id)))
);

-- Enrollments
CREATE POLICY "Secretary and directors can manage enrollments" ON public.enrollments FOR ALL USING (
  public.is_director(auth.uid(), school_id) OR public.has_role(auth.uid(), 'secretary', school_id)
);

-- Billing: Admin and directors only
CREATE POLICY "Admin and directors can manage billing" ON public.billing FOR ALL USING (
  public.is_director(auth.uid(), school_id) OR public.has_role(auth.uid(), 'admin', school_id)
);

-- Payments
CREATE POLICY "Admin and directors can manage payments" ON public.payments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.billing b WHERE b.id = billing_id AND (public.is_director(auth.uid(), b.school_id) OR public.has_role(auth.uid(), 'admin', b.school_id)))
);

-- Chart of accounts
CREATE POLICY "Admin and directors can manage chart of accounts" ON public.chart_of_accounts FOR ALL USING (
  public.is_director(auth.uid(), school_id) OR public.has_role(auth.uid(), 'admin', school_id)
);

-- Finance ledger
CREATE POLICY "Admin and directors can manage finance ledger" ON public.finance_ledger FOR ALL USING (
  public.is_director(auth.uid(), school_id) OR public.has_role(auth.uid(), 'admin', school_id)
);

-- Contracts
CREATE POLICY "Admin and directors can manage contracts" ON public.contracts FOR ALL USING (
  public.is_director(auth.uid(), school_id) OR public.has_role(auth.uid(), 'admin', school_id)
);

-- Leads: Public insert, directors can view
CREATE POLICY "Anyone can create leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Directors can view and manage leads" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Directors can update leads" ON public.leads FOR UPDATE USING (true);

-- Audit logs: Directors only
CREATE POLICY "Directors can view audit logs" ON public.audit_logs FOR SELECT USING (
  public.is_director(auth.uid(), school_id)
);

CREATE POLICY "System can create audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Evolution instances
CREATE POLICY "Directors can manage evolution instances" ON public.evolution_instances FOR ALL USING (
  public.is_director(auth.uid(), school_id)
);

-- Lesson plans
CREATE POLICY "Teachers can manage their lesson plans" ON public.lesson_plans FOR ALL USING (
  teacher_id = auth.uid() OR public.is_director(auth.uid(), school_id)
);