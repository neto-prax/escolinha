import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EvolutionInstance {
  id: string;
  school_id: string;
  instance_name: string;
  api_url: string | null;
  api_key: string | null;
  status: string | null;
  connected_phone: string | null;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
}

export function useEvolutionInstances() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['evolution-instances', profile?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evolution_instances')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EvolutionInstance[];
    },
    enabled: !!profile?.school_id,
  });
}

export function useCreateEvolutionInstance() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      instance_name: string;
      api_url: string;
      api_key: string;
    }) => {
      if (!profile?.school_id) throw new Error('No school ID');

      const { data: instance, error } = await supabase
        .from('evolution_instances')
        .insert({
          school_id: profile.school_id,
          instance_name: data.instance_name,
          api_url: data.api_url,
          api_key: data.api_key,
          status: 'disconnected',
        })
        .select()
        .single();

      if (error) throw error;
      return instance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolution-instances'] });
    },
  });
}

export function useUpdateEvolutionInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<EvolutionInstance> & { id: string }) => {
      const { data: instance, error } = await supabase
        .from('evolution_instances')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return instance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolution-instances'] });
    },
  });
}

export function useDeleteEvolutionInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('evolution_instances')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolution-instances'] });
    },
  });
}

export function useCheckInstanceStatus() {
  return useMutation({
    mutationFn: async (instance: EvolutionInstance) => {
      const response = await fetch(`${instance.api_url}/instance/connectionState/${instance.instance_name}`, {
        headers: {
          'apikey': instance.api_key || '',
        },
      });

      if (!response.ok) throw new Error('Failed to check status');

      const data = await response.json();
      return data;
    },
  });
}

export function useConnectInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instance: EvolutionInstance) => {
      const response = await fetch(`${instance.api_url}/instance/connect/${instance.instance_name}`, {
        headers: {
          'apikey': instance.api_key || '',
        },
      });

      if (!response.ok) throw new Error('Failed to connect');

      const data = await response.json();

      // Update instance with QR code if returned
      if (data.base64) {
        await supabase
          .from('evolution_instances')
          .update({ qr_code: data.base64 })
          .eq('id', instance.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolution-instances'] });
    },
  });
}
