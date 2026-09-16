import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types/auth';

export interface UserWithRoles {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean | null;
  created_at: string;
  email?: string;
  roles: AppRole[];
}

export function useUsers() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['users', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return [];

      // Fetch profiles from the same school
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('school_id', profile.school_id)
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch roles for all users
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('school_id', profile.school_id);

      if (rolesError) throw rolesError;

      // Map roles to users
      const usersWithRoles: UserWithRoles[] = profiles.map((p) => ({
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        avatar_url: p.avatar_url,
        is_active: p.is_active,
        created_at: p.created_at,
        roles: rolesData
          ?.filter((r) => r.user_id === p.id)
          .map((r) => r.role as AppRole) || [],
      }));

      return usersWithRoles;
    },
    enabled: !!profile?.school_id,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      full_name,
      phone,
    }: {
      id: string;
      full_name: string;
      phone?: string;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name, phone })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUserRoles() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      userId,
      roles,
    }: {
      userId: string;
      roles: AppRole[];
    }) => {
      if (!profile?.school_id) {
        throw new Error('Escola não identificada no perfil do usuário logado.');
      }

      // Delete existing roles for this user in this school
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('school_id', profile.school_id);

      if (deleteError) {
        if (deleteError.code === '42501' || deleteError.message?.toLowerCase().includes('policy')) {
          throw new Error('Permissão negada pelo banco: seu usuário precisa de permissão de Diretor/Administrador no Supabase para alterar cargos.');
        }
        throw deleteError;
      }

      // Insert new roles
      if (roles.length > 0) {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert(
            roles.map((role) => ({
              user_id: userId,
              school_id: profile.school_id,
              role,
            }))
          );

        if (insertError) {
          if (insertError.code === '42501' || insertError.message?.toLowerCase().includes('policy')) {
            throw new Error('Permissão negada pelo banco: seu usuário precisa de permissão de Diretor/Administrador no Supabase para alterar cargos.');
          }
          throw insertError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useToggleUserActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      full_name,
      phone,
      roles,
    }: {
      email: string;
      password: string;
      full_name: string;
      phone?: string;
      roles: AppRole[];
    }) => {
      if (!profile?.school_id) throw new Error('No school ID');

      // Create user via edge function (needs admin API)
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password,
          full_name,
          phone,
          school_id: profile.school_id,
          roles,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
