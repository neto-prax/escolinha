import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

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
  const queryClient = useQueryClient();

  // Subscribe to realtime updates for conversations
  useEffect(() => {
    if (!profile?.school_id) return;

    const channel = supabase
      .channel('whatsapp-conversations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.school_id, queryClient]);

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
    refetchInterval: 10000, // Fallback polling every 10s
  });
}

export function useWhatsAppMessages(conversationId: string | null) {
  const queryClient = useQueryClient();

  // Subscribe to realtime updates for messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`whatsapp-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

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
  const { profile, school } = useAuth();

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
      // Get school settings for signature
      let finalBody = body;
      
      if (school?.id) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('settings')
          .eq('id', school.id)
          .single();
        
        const settings = schoolData?.settings as Record<string, unknown> | null;
        const automation = settings?.automation as { signature_enabled?: boolean } | undefined;
        
        if (automation?.signature_enabled !== false && profile?.full_name && messageType === 'text') {
          // Add signature in bold before message
          finalBody = `*${profile.full_name}:*\n${body}`;
        }
      }
      // Get conversation data first (in parallel with instance lookup)
      const conversationPromise = supabase
        .from('whatsapp_conversations')
        .select('phone, sector_id')
        .eq('id', conversationId)
        .single();

      // Pre-fetch instance name in parallel
      const instancePromise = (async () => {
        // Try to find instance linked to sector first
        const { data: conversation } = await conversationPromise;
        if (!conversation) return null;

        let instanceName: string | null = null;

        if (conversation.sector_id) {
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

        // Fallback: any connected instance
        if (!instanceName) {
          const { data: anyInstance } = await supabase
            .from('evolution_instances')
            .select('instance_name')
            .eq('status', 'connected')
            .limit(1)
            .maybeSingle();
          
          instanceName = anyInstance?.instance_name || null;
        }

        return { instanceName, phone: conversation.phone };
      })();

      // Insert message with 'sending' status (optimistic)
      const { data: message, error: msgError } = await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversationId,
          body: finalBody,
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

      // Update conversation timestamp immediately
      supabase
        .from('whatsapp_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)
        .then(() => {});

      // Get instance data
      const instanceData = await instancePromise;

      if (!instanceData?.instanceName) {
        // Update message status to failed
        await supabase
          .from('whatsapp_messages')
          .update({ status: 'failed' })
          .eq('id', message.id);
        throw new Error('Nenhuma instância WhatsApp conectada');
      }

      // Send via Evolution API (don't wait for this in UI)
      supabase.functions.invoke('evolution-api', {
        body: {
          action: messageType === 'text' ? 'send-text' : 'send-media',
          data: {
            instanceName: instanceData.instanceName,
            phone: instanceData.phone,
            message: finalBody,
            mediaType: messageType,
            mediaUrl,
            caption: mediaCaption,
            fileName: mediaFilename,
          },
        },
      }).then(async ({ data: result, error: fnError }) => {
        if (fnError) {
          console.error('Evolution API error:', fnError);
          await supabase
            .from('whatsapp_messages')
            .update({ status: 'failed' })
            .eq('id', message.id);
        } else if (result?.key?.id) {
          // Save external_id for status tracking
          await supabase
            .from('whatsapp_messages')
            .update({ 
              external_id: result.key.id,
              status: 'sent' 
            })
            .eq('id', message.id);
        }
      });

      return message;
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['whatsapp-messages', variables.conversationId] });
      
      // Snapshot previous value
      const previousMessages = queryClient.getQueryData(['whatsapp-messages', variables.conversationId]);
      
      // Optimistically add the new message
      queryClient.setQueryData(['whatsapp-messages', variables.conversationId], (old: WhatsAppMessage[] | undefined) => {
        const optimisticMessage: WhatsAppMessage = {
          id: `temp-${Date.now()}`,
          conversation_id: variables.conversationId,
          body: variables.body,
          direction: 'outgoing',
          message_type: variables.messageType || 'text',
          media_url: variables.mediaUrl || null,
          media_caption: variables.mediaCaption || null,
          media_filename: variables.mediaFilename || null,
          status: 'sending',
          reply_to_id: variables.replyToId || null,
          is_quick_reply: null,
          reaction: null,
          created_at: new Date().toISOString(),
          external_id: null,
        };
        return [...(old || []), optimisticMessage];
      });
      
      return { previousMessages };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(['whatsapp-messages', variables.conversationId], context.previousMessages);
      }
    },
    onSettled: (_, __, variables) => {
      // Refetch to ensure consistency
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
