-- Create table for platform billing plans
CREATE TABLE public.platform_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_per_student numeric NOT NULL DEFAULT 0,
  min_students integer DEFAULT 0,
  max_students integer,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for school subscriptions
CREATE TABLE public.school_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.platform_plans(id),
  custom_price_per_student numeric,
  billing_day integer DEFAULT 10,
  status text DEFAULT 'active',
  started_at date DEFAULT CURRENT_DATE,
  expires_at date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(school_id)
);

-- Create table for subscription invoices/payments
CREATE TABLE public.subscription_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.school_subscriptions(id),
  reference_month date NOT NULL,
  student_count integer NOT NULL DEFAULT 0,
  price_per_student numeric NOT NULL,
  total_amount numeric NOT NULL,
  status text DEFAULT 'pending',
  due_date date NOT NULL,
  paid_at timestamp with time zone,
  payment_method text,
  payment_reference text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies for platform_plans (super admins only)
CREATE POLICY "Super admins can manage platform plans" 
ON public.platform_plans 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Anyone can view active plans" 
ON public.platform_plans 
FOR SELECT 
USING (is_active = true);

-- RLS policies for school_subscriptions (super admins only)
CREATE POLICY "Super admins can manage subscriptions" 
ON public.school_subscriptions 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Directors can view their subscription" 
ON public.school_subscriptions 
FOR SELECT 
USING (is_director(auth.uid(), school_id));

-- RLS policies for subscription_invoices (super admins only)
CREATE POLICY "Super admins can manage invoices" 
ON public.subscription_invoices 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Directors can view their invoices" 
ON public.subscription_invoices 
FOR SELECT 
USING (is_director(auth.uid(), school_id));

-- Create trigger for updated_at
CREATE TRIGGER update_platform_plans_updated_at
BEFORE UPDATE ON public.platform_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_school_subscriptions_updated_at
BEFORE UPDATE ON public.school_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_invoices_updated_at
BEFORE UPDATE ON public.subscription_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();