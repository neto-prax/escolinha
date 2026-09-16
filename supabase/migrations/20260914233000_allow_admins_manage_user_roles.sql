-- Permite que Diretores, Administradores e Super Admins gerenciem os cargos na tabela user_roles
DROP POLICY IF EXISTS "Directors can manage user roles" ON public.user_roles;

CREATE POLICY "Directors, admins and super admins can manage user roles" 
ON public.user_roles 
FOR ALL 
TO authenticated
USING (
    public.is_director(auth.uid(), school_id) 
    OR public.has_role(auth.uid(), 'admin'::public.app_role, school_id)
    OR public.is_super_admin(auth.uid())
)
WITH CHECK (
    public.is_director(auth.uid(), school_id) 
    OR public.has_role(auth.uid(), 'admin'::public.app_role, school_id)
    OR public.is_super_admin(auth.uid())
);

