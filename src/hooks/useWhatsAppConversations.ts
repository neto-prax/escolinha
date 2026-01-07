import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WhatsAppConversation {
  id: string;
  phone: string;
  contact_name: string | null;
  contact_id: string | null;
  sector_id: string | null;
  school_id: string;
  ticket_status: string;
  priority: string;
  assigned_to: string | null;
  last_message_at: string | null;
  unread_count: number;
  resolution_summary: string | null;
  opened_at: string | null;
  closed_at: string | null;
  tags: string[];
  contact?: {
    id: string;
    full_name: string;
    contact_type: string;
    linked_student_ids: string[] | null;
  } | null;
  sector?: {
    id: string;
    name: string;
  } | null;
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  body: string | null;
  direction: string;
  message_type: string | null;
  media_url: string | null;
  media_caption: string | null;
  media_filename: string | null;
  status: string | null;
  reply_to_id: string | null;
  is_quick_reply: boolean | null;
  reaction: string | null;
  created_at: string;
  external_id: string | null;
}

export function useWhatsAppConversations(sectorId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['whatsapp-conversations', sectorId, profile?.school_id],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          contact:contacts(*),
          sector:sectors(id, name)
        `)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (sectorId && sectorId !== 'all') {
        query = query.eq('sector_id', sectorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WhatsAppConversation[];
    },
    enabled: !!profile?.school_id,
  });
}

export function useWhatsAppMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['whatsapp-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as WhatsAppMessage[];
    },
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      body,
      messageType = 'text',
      mediaUrl,
      mediaCaption,
      mediaFilename,
      replyToId,
    }: {
      conversationId: string;
      body: string;
      messageType?: string;
      mediaUrl?: string;
      mediaCaption?: string;
      mediaFilename?: string;
      replyToId?: string;
    }) => {
      // Insert message locally
      const { data: message, error: msgError } = await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversationId,
          body,
          direction: 'outgoing',
          message_type: messageType,
          media_url: mediaUrl,
          media_caption: mediaCaption,
          media_filename: mediaFilename,
          reply_to_id: replyToId,
          status: 'sending',
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Get conversation to send via Evolution
      const { data: conversation } = await supabase
        .from('whatsapp_conversations')
        .select('phone, sector_id')
        .eq('id', conversationId)
        .single();

      if (conversation) {
        // Find the instance linked to the sector or any connected instance
        let instanceName: string | null = null;

        if (conversation.sector_id) {
          // Find instance linked to this sector
          const { data: instanceSector } = await supabase
            .from('instance_sectors')
            .select('instance_id')
            .eq('sector_id', conversation.sector_id)
            .limit(1)
            .maybeSingle();

          if (instanceSector) {
            const { data: instance } = await supabase
              .from('evolution_instances')
              .select('instance_name')
              .eq('id', instanceSector.instance_id)
              .eq('status', 'connected')
              .maybeSingle();
            
            instanceName = instance?.instance_name || null;
          }
        }

        // Fallback: find any connected instance for this school
        if (!instanceName) {
          const { data: anyInstance } = await supabase
            .from('evolution_instances')
            .select('instance_name')
            .eq('status', 'connected')
            .limit(1)
            .maybeSingle();
          
          instanceName = anyInstance?.instance_name || null;
        }

        if (!instanceName) {
          console.error('No connected WhatsApp instance found');
          throw new Error('Nenhuma instância WhatsApp conectada');
        }

        // Send via Evolution API
        try {
          const { error: fnError } = await supabase.functions.invoke('evolution-api', {
            body: {
              action: messageType === 'text' ? 'send-text' : 'send-media',
              data: {
                instanceName,
                phone: conversation.phone,
                message: body,
                mediaType: messageType,
                mediaUrl,
                caption: mediaCaption,
                fileName: mediaFilename,
              },
            },
          });

          if (fnError) {
            console.error('Evolution API error:', fnError);
            throw fnError;
          }
        } catch (err) {
          console.error('Failed to send via Evolution:', err);
          throw err;
        }
      }

      // Update conversation
      await supabase
        .from('whatsapp_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      return message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
  });
}

export function useUpdateConversationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      status,
      resolutionSummary,
    }: {
      conversationId: string;
      status: 'open' | 'pending' | 'resolved' | 'closed';
      resolutionSummary?: string;
    }) => {
      const updates: Record<string, unknown> = {
        ticket_status: status,
      };

      if (status === 'closed' && resolutionSummary) {
        updates.resolution_summary = resolutionSummary;
        updates.closed_at = new Date().toISOString();
      }

      if (status === 'open') {
        updates.opened_at = new Date().toISOString();
        updates.closed_at = null;
        updates.resolution_summary = null;
      }

      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .update(updates)
        .eq('id', conversationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
  });
}
