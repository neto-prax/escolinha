import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EmployeeDetails {
  id: string;
  user_id: string;
  school_id: string;
  position: string | null;
  department: string | null;
  hire_date: string | null;
  salary: number | null;
  salary_type: string | null;
  bank_name: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  pix_key: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSector {
  id: string;
  user_id: string;
  sector_id: string;
  sector?: {
    id: string;
    name: string;
  };
}

export function useEmployeeDetails(userId: string | null) {
  return useQuery({
    queryKey: ['employee-details', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('employee_details')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as EmployeeDetails | null;
    },
    enabled: !!userId,
  });
}

export function useUserSectors(userId: string | null) {
  return useQuery({
    queryKey: ['user-sectors', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_sectors')
        .select(`
          id,
          user_id,
          sector_id,
          sector:sectors(id, name)
        `)
        .eq('user_id', userId);

      if (error) throw error;
      return data as unknown as UserSector[];
    },
    enabled: !!userId,
  });
}

export function useSectors() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['sectors', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return [];

      const { data, error } = await supabase
        .from('sectors')
        .select('id, name, is_active')
        .eq('school_id', profile.school_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.school_id,
  });
}

export function useUpdateEmployeeDetails() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      userId,
      details,
    }: {
      userId: string;
      details: Partial<Omit<EmployeeDetails, 'id' | 'user_id' | 'school_id' | 'created_at' | 'updated_at'>>;
    }) => {
      if (!profile?.school_id) throw new Error('No school ID');

      // Check if record exists
      const { data: existing } = await supabase
        .from('employee_details')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('employee_details')
          .update(details)
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('employee_details')
          .insert({
            user_id: userId,
            school_id: profile.school_id,
            ...details,
          });

        if (error) throw error;
      }
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['employee-details', userId] });
    },
  });
}

export function useUpdateUserSectors() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      sectorIds,
    }: {
      userId: string;
      sectorIds: string[];
    }) => {
      // Delete existing sectors
      const { error: deleteError } = await supabase
        .from('user_sectors')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Insert new sectors
      if (sectorIds.length > 0) {
        const { error: insertError } = await supabase
          .from('user_sectors')
          .insert(
            sectorIds.map((sectorId) => ({
              user_id: userId,
              sector_id: sectorId,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['user-sectors', userId] });
    },
  });
}
