import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CRMLead {
  id: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string | null;
  guardian_cpf: string | null;
  student_name: string;
  student_grade: string | null;
  student_birth_date: string | null;
  status: string;
  source: string | null;
  interest_level: string | null;
  next_follow_up: string | null;
  notes: string | null;
  assigned_to: string | null;
  sector_id: string | null;
  expected_start: string | null;
  created_at: string;
  updated_at: string | null;
  contact_id?: string | null;
}

export interface CRMActivity {
  id: string;
  lead_id: string;
  activity_type: string;
  description: string | null;
  created_at: string;
  user_id: string;
  user_name?: string;
}

export function useCRMLeads() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['crm-leads', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return [];

      const { data, error } = await supabase
        .from('enrollment_leads')
        .select(`
          *,
          contact:contacts!contacts_lead_id_fkey(id, contact_types)
        `)
        .eq('school_id', profile.school_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((lead: any) => ({
        ...lead,
        contact_id: lead.contact?.id || null,
      })) as CRMLead[];
    },
    enabled: !!profile?.school_id,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['crm-activities', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return [];

      const { data, error } = await supabase
        .from('enrollment_lead_activities')
        .select(`
          *,
          user:profiles!enrollment_lead_activities_user_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((activity: any) => ({
        ...activity,
        user_name: activity.user?.full_name || 'Usuário',
      })) as CRMActivity[];
    },
    enabled: !!profile?.school_id,
  });

  const { data: sectors = [] } = useQuery({
    queryKey: ['sectors', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return [];

      const { data, error } = await supabase
        .from('sectors')
        .select('id, name')
        .eq('school_id', profile.school_id)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.school_id,
  });

  const createLeadMutation = useMutation({
    mutationFn: async (leadData: Partial<CRMLead>) => {
      if (!profile?.school_id || !profile?.id) throw new Error('No school or user');

      // Create lead
      const { data: lead, error: leadError } = await supabase
        .from('enrollment_leads')
        .insert({
          school_id: profile.school_id,
          guardian_name: leadData.guardian_name!,
          guardian_phone: leadData.guardian_phone!,
          guardian_email: leadData.guardian_email,
          guardian_cpf: leadData.guardian_cpf,
          student_name: leadData.student_name!,
          student_grade: leadData.student_grade,
          student_birth_date: leadData.student_birth_date,
          source: leadData.source,
          interest_level: leadData.interest_level || 'medium',
          notes: leadData.notes,
          sector_id: leadData.sector_id,
          expected_start: leadData.expected_start,
          status: 'new',
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // Create or update contact with 'lead' type
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id, contact_types')
        .eq('school_id', profile.school_id)
        .eq('phone', leadData.guardian_phone)
        .maybeSingle();

      if (existingContact) {
        // Add 'lead' to existing contact types
        const currentTypes = (existingContact.contact_types as string[]) || ['other'];
        const newTypes = currentTypes.includes('lead') ? currentTypes : [...currentTypes, 'lead'];
        
        await supabase
          .from('contacts')
          .update({
            lead_id: lead.id,
            contact_types: newTypes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingContact.id);
      } else {
        // Create new contact as lead
        await supabase
          .from('contacts')
          .insert({
            school_id: profile.school_id,
            phone: leadData.guardian_phone!,
            full_name: leadData.guardian_name!,
            email: leadData.guardian_email,
            contact_type: 'lead',
            contact_types: ['lead'],
            lead_id: lead.id,
          });
      }

      return lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Lead criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating lead:', error);
      toast.error('Erro ao criar lead');
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CRMLead> }) => {
      const { error } = await supabase
        .from('enrollment_leads')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
    },
  });

  const addActivityMutation = useMutation({
    mutationFn: async ({ leadId, type, description }: { leadId: string; type: string; description: string }) => {
      if (!profile?.id) throw new Error('No user');

      const { error } = await supabase
        .from('enrollment_lead_activities')
        .insert({
          lead_id: leadId,
          user_id: profile.id,
          activity_type: type,
          description,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-activities'] });
      toast.success('Atividade registrada');
    },
    onError: () => {
      toast.error('Erro ao registrar atividade');
    },
  });

  const convertToEnrollmentMutation = useMutation({
    mutationFn: async (leadId: string) => {
      // Mark lead as enrolled
      const { error } = await supabase
        .from('enrollment_leads')
        .update({
          status: 'enrolled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;

      // Update contact type to include 'guardian'
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('id, contact_types')
          .eq('lead_id', leadId)
          .maybeSingle();

        if (contact) {
          const currentTypes = (contact.contact_types as string[]) || ['lead'];
          const newTypes = currentTypes.includes('guardian') ? currentTypes : [...currentTypes, 'guardian'];
          
          await supabase
            .from('contacts')
            .update({
              contact_types: newTypes,
              updated_at: new Date().toISOString(),
            })
            .eq('id', contact.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Lead convertido em matrícula!');
    },
    onError: () => {
      toast.error('Erro ao converter lead');
    },
  });

  const getActivitiesForLead = (leadId: string) => {
    return activities.filter(a => a.lead_id === leadId);
  };

  return {
    leads,
    sectors,
    isLoading,
    createLead: createLeadMutation.mutate,
    updateLead: updateLeadMutation.mutate,
    addActivity: addActivityMutation.mutate,
    convertToEnrollment: convertToEnrollmentMutation.mutate,
    getActivitiesForLead,
    isCreating: createLeadMutation.isPending,
  };
}
