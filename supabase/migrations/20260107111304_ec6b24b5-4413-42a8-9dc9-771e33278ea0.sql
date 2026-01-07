-- Create employee details table for salary and employment info
CREATE TABLE public.employee_details (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    position text,
    department text,
    hire_date date,
    salary numeric(10,2),
    salary_type text DEFAULT 'monthly', -- monthly, hourly, etc
    bank_name text,
    bank_agency text,
    bank_account text,
    pix_key text,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_details ENABLE ROW LEVEL SECURITY;

-- Directors can manage all employee details
CREATE POLICY "Directors can manage employee details"
ON public.employee_details
FOR ALL
USING (is_director(auth.uid(), school_id));

-- Users can view their own employee details
CREATE POLICY "Users can view their own employee details"
ON public.employee_details
FOR SELECT
USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_employee_details_updated_at
BEFORE UPDATE ON public.employee_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();