-- Add monthly_fee column to classes table
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS monthly_fee numeric DEFAULT NULL;

-- Create payment_plans table for school-level payment plan configuration
CREATE TABLE public.payment_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  installments integer NOT NULL DEFAULT 1,
  discount_percentage numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create discount_types table for pre-configured discounts
CREATE TABLE public.discount_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  discount_percentage numeric DEFAULT NULL,
  discount_fixed numeric DEFAULT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_types ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_plans
CREATE POLICY "Directors can manage payment plans"
ON public.payment_plans
FOR ALL
USING (is_director(auth.uid(), school_id));

CREATE POLICY "Users can view payment plans from their school"
ON public.payment_plans
FOR SELECT
USING (school_id = get_user_school_id(auth.uid()));

-- RLS policies for discount_types
CREATE POLICY "Directors can manage discount types"
ON public.discount_types
FOR ALL
USING (is_director(auth.uid(), school_id));

CREATE POLICY "Users can view discount types from their school"
ON public.discount_types
FOR SELECT
USING (school_id = get_user_school_id(auth.uid()));

-- Add discount columns to enrollments table
ALTER TABLE public.enrollments
ADD COLUMN IF NOT EXISTS discount_type_id uuid REFERENCES public.discount_types(id),
ADD COLUMN IF NOT EXISTS discount_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_fixed numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_plan_id uuid REFERENCES public.payment_plans(id),
ADD COLUMN IF NOT EXISTS monthly_value numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_value numeric DEFAULT NULL;

-- Add triggers for updated_at
CREATE TRIGGER update_payment_plans_updated_at
BEFORE UPDATE ON public.payment_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();