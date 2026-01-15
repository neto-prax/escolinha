-- Fix the security definer view issue by setting appropriate permissions
-- Drop and recreate the view with security invoker (default behavior)
DROP VIEW IF EXISTS public.schools_with_counts;

CREATE VIEW public.schools_with_counts 
WITH (security_invoker = true)
AS
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