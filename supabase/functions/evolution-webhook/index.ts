import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const payload = await req.json();
    console.log('Webhook received:', JSON.stringify(payload, null, 2));

    const event = payload.event;
    const instance = payload.instance;
    const data = payload.data;

    // Handle incoming messages
    if (event === 'messages.upsert') {
      const message = data;
      
      // Skip status messages and messages from self
      if (message.key?.fromMe || message.key?.remoteJid?.endsWith('@g.us')) {
        console.log('Skipping message from self or group');
        return new Response(JSON.stringify({ status: 'skipped' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const phone = message.key?.remoteJid?.replace('@s.whatsapp.net', '') || '';
      const messageId = message.key?.id;
      const pushName = message.pushName || 'Desconhecido';
      
      // Get message content
      let body = '';
      let messageType = 'text';
      let mediaUrl = null;
      let mediaFilename = null;
      let mediaCaption = null;

      if (message.message?.conversation) {
        body = message.message.conversation;
      } else if (message.message?.extendedTextMessage?.text) {
        body = message.message.extendedTextMessage.text;
      } else if (message.message?.imageMessage) {
        messageType = 'image';
        mediaCaption = message.message.imageMessage.caption || '';
        body = mediaCaption || '[Imagem]';
      } else if (message.message?.videoMessage) {
        messageType = 'video';
        mediaCaption = message.message.videoMessage.caption || '';
        body = mediaCaption || '[Vídeo]';
      } else if (message.message?.audioMessage) {
        messageType = 'audio';
        body = '[Áudio]';
      } else if (message.message?.documentMessage) {
        messageType = 'document';
        mediaFilename = message.message.documentMessage.fileName || 'documento';
        body = `[Documento: ${mediaFilename}]`;
      } else if (message.message?.stickerMessage) {
        messageType = 'sticker';
        body = '[Figurinha]';
      } else {
        body = '[Mensagem não suportada]';
      }

      console.log('Processing message:', { phone, pushName, body, messageType });

      // Find the instance in database to get school_id
      const { data: instanceData, error: instanceError } = await supabase
        .from('evolution_instances')
        .select('id, school_id')
        .eq('instance_name', instance)
        .maybeSingle();

      if (instanceError) {
        console.error('Error finding instance:', instanceError);
        throw instanceError;
      }

      if (!instanceData) {
        console.log('Instance not found in database:', instance);
        return new Response(JSON.stringify({ status: 'instance_not_found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const schoolId = instanceData.school_id;

      // Find sectors linked to this instance
      const { data: instanceSectors, error: sectorsError } = await supabase
        .from('instance_sectors')
        .select('sector_id')
        .eq('instance_id', instanceData.id);

      if (sectorsError) {
        console.error('Error finding sectors:', sectorsError);
      }

      // Use first linked sector, or null if none
      const sectorId = instanceSectors?.[0]?.sector_id || null;

      // Find or create conversation
      let { data: conversation, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('phone', phone)
        .eq('school_id', schoolId)
        .neq('ticket_status', 'closed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (convError) {
        console.error('Error finding conversation:', convError);
        throw convError;
      }

      if (!conversation) {
        // Create new conversation
        const { data: newConv, error: createError } = await supabase
          .from('whatsapp_conversations')
          .insert({
            phone,
            contact_name: pushName,
            school_id: schoolId,
            sector_id: sectorId,
            status: 'open',
            ticket_status: 'open',
            unread_count: 1,
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating conversation:', createError);
          throw createError;
        }

        conversation = newConv;
        console.log('Created new conversation:', conversation.id);
      } else {
        // Update existing conversation
        const { error: updateError } = await supabase
          .from('whatsapp_conversations')
          .update({
            unread_count: (conversation.unread_count || 0) + 1,
            last_message_at: new Date().toISOString(),
            contact_name: pushName,
          })
          .eq('id', conversation.id);

        if (updateError) {
          console.error('Error updating conversation:', updateError);
        }
        console.log('Updated existing conversation:', conversation.id);
      }

      // Insert message
      const { data: insertedMessage, error: msgError } = await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversation.id,
          external_id: messageId,
          direction: 'incoming',
          body,
          message_type: messageType,
          media_url: mediaUrl,
          media_filename: mediaFilename,
          media_caption: mediaCaption,
          status: 'received',
        })
        .select()
        .single();

      if (msgError) {
        console.error('Error inserting message:', msgError);
        throw msgError;
      }

      console.log('Message saved:', insertedMessage.id);

      return new Response(JSON.stringify({ 
        status: 'success', 
        conversationId: conversation.id,
        messageId: insertedMessage.id 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle message status updates
    if (event === 'messages.update') {
      console.log('Message status update:', data);
      // Could update message status here if needed
      return new Response(JSON.stringify({ status: 'acknowledged' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle connection status
    if (event === 'connection.update') {
      const state = data.state;
      console.log('Connection update for instance:', instance, 'state:', state);
      
      // Update instance status in database
      const { error } = await supabase
        .from('evolution_instances')
        .update({ 
          status: state === 'open' ? 'connected' : 'disconnected',
          connected_phone: data.phoneNumber || null,
        })
        .eq('instance_name', instance);

      if (error) {
        console.error('Error updating instance status:', error);
      }

      return new Response(JSON.stringify({ status: 'connection_updated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Unhandled event type:', event);
    return new Response(JSON.stringify({ status: 'unhandled_event', event }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
