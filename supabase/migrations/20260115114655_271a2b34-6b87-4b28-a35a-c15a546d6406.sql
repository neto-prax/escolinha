-- Create a super_admins table to identify global system administrators
-- These users can manage all schools in the system

CREATE TABLE public.super_admins (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID
);

-- Enable Row Level Security
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Only super admins can view/manage this table (bootstrap first admin manually)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.super_admins
        WHERE user_id = _user_id
    )
$$;

-- Policies for super_admins table
CREATE POLICY "Super admins can view all super admins"
ON public.super_admins
FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage super admins"
ON public.super_admins
FOR ALL
USING (is_super_admin(auth.uid()));

-- Create a view for schools with counts
CREATE OR REPLACE VIEW public.schools_with_counts AS
SELECT 
    s.id,
    s.name,
    s.slug,
    s.logo_url,
    s.address,
    s.phone,
    s.email,
    s.settings,
    s.created_at,
    s.updated_at,
    (SELECT COUNT(*) FROM public.profiles p WHERE p.school_id = s.id) AS user_count,
    (SELECT COUNT(*) FROM public.students st WHERE st.school_id = s.id) AS student_count
FROM public.schools s;

-- Grant access to the view
GRANT SELECT ON public.schools_with_counts TO authenticated;

-- Add policy to allow super admins to view all schools
CREATE POLICY "Super admins can view all schools"
ON public.schools
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Add policy to allow super admins to delete schools
CREATE POLICY "Super admins can delete schools"
ON public.schools
FOR DELETE
USING (is_super_admin(auth.uid()));

-- Add policy to allow super admins to update schools (for feature toggles)
CREATE POLICY "Super admins can update schools"
ON public.schools
FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Allow super admins to view all profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Allow super admins to view all user roles
CREATE POLICY "Super admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (is_super_admin(auth.uid()));