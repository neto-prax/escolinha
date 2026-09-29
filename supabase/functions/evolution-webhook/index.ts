import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendWelcomeMessage(
  supabase: any,
  instanceName: string,
  phone: string,
  schoolId: string,
  conversationId: string
) {
  try {
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('settings')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school?.settings?.automation) {
      return;
    }

    const automation = school.settings.automation;
    if (!automation.sector_selection_enabled) {
      return;
    }

    const enabledSectorIds = automation.enabled_sectors || [];
    if (enabledSectorIds.length === 0) {
      return;
    }

    const { data: sectorsData, error: sectorsError } = await supabase
      .from('sectors')
      .select('id, name')
      .in('id', enabledSectorIds)
      .eq('is_active', true);

    if (sectorsError || !sectorsData || sectorsData.length === 0) {
      return;
    }

    const sectors = enabledSectorIds
      .map((id: string) => sectorsData.find((s: any) => s.id === id))
      .filter(Boolean);

    const sectorsList = sectors.map((s: any, i: number) => `${i + 1}. ${s.name}`).join('\n');

    let welcomeMessage =
      automation.sector_selection_message ||
      'Olá! 👋 Bem-vindo(a)!\n\nPor favor escolha o setor:\n\n{SECTORS_LIST}\n\nDigite o número correspondente.';

    welcomeMessage = welcomeMessage.replace('{SECTORS_LIST}', sectorsList);

    const UAZAPI_URL = Deno.env.get('UAZAPI_URL')?.replace(/\/$/, '');
    const UAZAPI_TOKEN = Deno.env.get('UAZAPI_TOKEN');

    let resultKeyId: string | null = null;

    if (UAZAPI_URL && UAZAPI_TOKEN) {
      const response = await fetch(`${UAZAPI_URL}/send/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: UAZAPI_TOKEN },
        body: JSON.stringify({ number: phone, text: welcomeMessage }),
      });
      const resData = await response.json().catch(() => ({}));
      resultKeyId = resData?.id || null;
    }

    await supabase.from('whatsapp_messages').insert({
      conversation_id: conversationId,
      direction: 'outgoing',
      body: welcomeMessage,
      message_type: 'text',
      status: 'sent',
      external_id: resultKeyId,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sending welcome message:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const payload = await req.json();
    console.log('Webhook payload received:', JSON.stringify(payload, null, 2));

    // Support Uazapi format and Evolution format
    const isUazapi =
      payload.EventType === 'messages' ||
      payload.event === 'messages' ||
      (payload.message && (payload.owner || payload.token || payload.chatid));
    const isEvolution = payload.event === 'messages.upsert';

    // Handle updates and connection events
    if (
      payload.event === 'messages.update' ||
      payload.EventType === 'messages_update' ||
      payload.event === 'messages_update'
    ) {
      return new Response(JSON.stringify({ status: 'updated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (payload.event === 'connection.update' || payload.EventType === 'connection') {
      return new Response(JSON.stringify({ status: 'connection_acknowledged' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isUazapi && !isEvolution) {
      // Check if it's a test ping
      return new Response(JSON.stringify({ status: 'acknowledged', raw: payload }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let instance = payload.instanceName || payload.instance || payload.owner || 'Neto';
    let phone = '';
    let messageId = '';
    let pushName = 'Responsável';
    let body = '';
    let messageType = 'text';
    let mediaUrl: string | null = null;
    let mediaFilename: string | null = null;
    let mediaCaption: string | null = null;
    let isFromMe = false;
    let isGroup = false;

    if (isUazapi) {
      const msg = payload.message || {};
      isFromMe = Boolean(msg.fromMe);
      isGroup = Boolean(msg.isGroup || msg.chatid?.endsWith('@g.us'));
      phone = String(msg.chatid || msg.sender || '').replace(/@.*/, '').replace(/\D/g, '');
      messageId = String(msg.messageid || msg.id || `uaz-${Date.now()}`);
      pushName = msg.senderName || payload.chat?.name || payload.contact?.name || 'Responsável';
      body = msg.text || (typeof msg.content === 'string' ? msg.content : '') || '';
      messageType = (msg.messageType || 'text').toLowerCase();

      if (['image', 'video', 'audio', 'document', 'sticker'].includes(messageType)) {
        mediaUrl = msg.mediaUrl || msg.content?.file || msg.content?.url || null;
        mediaFilename = msg.docName || msg.fileName || null;
        mediaCaption = msg.text || msg.caption || null;
      }
    } else if (isEvolution) {
      const message = payload.data || {};
      isFromMe = Boolean(message.key?.fromMe);
      isGroup = Boolean(message.key?.remoteJid?.endsWith('@g.us'));
      phone = String(message.key?.remoteJid || '').replace(/@.*/, '').replace(/\D/g, '');
      messageId = String(message.key?.id || `evo-${Date.now()}`);
      pushName = message.pushName || 'Responsável';

      if (message.message?.conversation) {
        body = message.message.conversation;
      } else if (message.message?.extendedTextMessage?.text) {
        body = message.message.extendedTextMessage.text;
      } else if (message.message?.imageMessage) {
        messageType = 'image';
        mediaCaption = message.message.imageMessage.caption || '';
        body = mediaCaption || '[Imagem]';
        mediaUrl = message.message.imageMessage.url || null;
      } else if (message.message?.videoMessage) {
        messageType = 'video';
        mediaCaption = message.message.videoMessage.caption || '';
        body = mediaCaption || '[Vídeo]';
        mediaUrl = message.message.videoMessage.url || null;
      } else if (message.message?.audioMessage) {
        messageType = 'audio';
        body = '[Áudio]';
        mediaUrl = message.message.audioMessage.url || null;
      } else if (message.message?.documentMessage) {
        messageType = 'document';
        mediaFilename = message.message.documentMessage.fileName || 'documento';
        body = `[Documento: ${mediaFilename}]`;
        mediaUrl = message.message.documentMessage.url || null;
      } else {
        body = '[Mensagem]';
      }
    }

    // Skip groups
    if (isGroup) {
      return new Response(JSON.stringify({ status: 'skipped_group' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!phone) {
      return new Response(JSON.stringify({ status: 'ignored_no_phone' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format phone with country code (55)
    const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;
    const cleanPhone = phone;
    const with55 = formattedPhone;
    const without55 = phone.replace(/^55/, '');
    const last8 = phone.slice(-8);

    // Resolve school_id
    let schoolId: string | null = null;

    const { data: instanceData } = await supabase
      .from('evolution_instances')
      .select('school_id')
      .eq('instance_name', instance)
      .maybeSingle();

    if (instanceData?.school_id) {
      schoolId = instanceData.school_id;
    } else {
      const { data: anySchool } = await supabase
        .from('schools')
        .select('id')
        .limit(1)
        .maybeSingle();
      schoolId = anySchool?.id || null;
    }

    if (!schoolId) {
      console.warn('No school found to link WhatsApp message.');
      return new Response(JSON.stringify({ status: 'school_not_found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const nowIso = new Date().toISOString();

    // Find or create conversation in whatsapp_conversations
    let { data: conversation } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('school_id', schoolId)
      .or(`phone.eq.${cleanPhone},phone.eq.${with55},phone.eq.${without55},phone.ilike.%${last8}`)
      .neq('ticket_status', 'closed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let isNewConversation = false;

    if (!conversation) {
      isNewConversation = true;
      const { data: newConv, error: createError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          school_id: schoolId,
          phone: formattedPhone,
          contact_name: pushName,
          status: 'open',
          ticket_status: 'open',
          unread_count: isFromMe ? 0 : 1,
          last_message_at: nowIso,
          tags: ['WhatsApp'],
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating whatsapp_conversations:', createError);
        throw createError;
      }
      conversation = newConv;
    } else {
      // Update existing conversation
      const updates: Record<string, unknown> = {
        last_message_at: nowIso,
      };
      if (!isFromMe) {
        updates.unread_count = (conversation.unread_count || 0) + 1;
      }
      if (pushName && pushName !== 'Responsável' && (!conversation.contact_name || conversation.contact_name === conversation.phone)) {
        updates.contact_name = pushName;
      }

      await supabase
        .from('whatsapp_conversations')
        .update(updates)
        .eq('id', conversation.id);
    }

    // Insert message into whatsapp_messages
    const { data: insertedMessage, error: msgError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversation.id,
        external_id: messageId,
        direction: isFromMe ? 'outgoing' : 'incoming',
        body,
        message_type: messageType,
        media_url: mediaUrl,
        media_filename: mediaFilename,
        media_caption: mediaCaption,
        status: isFromMe ? 'sent' : 'received',
        created_at: nowIso,
      })
      .select()
      .single();

    if (msgError) {
      console.error('Error inserting whatsapp_messages:', msgError);
      throw msgError;
    }

    // Send welcome message if it's a new incoming conversation
    if (isNewConversation && !isFromMe) {
      await sendWelcomeMessage(supabase, instance, formattedPhone, schoolId, conversation.id);
    }

    return new Response(
      JSON.stringify({
        status: 'success',
        conversationId: conversation.id,
        messageId: insertedMessage?.id,
        direction: isFromMe ? 'outgoing' : 'incoming',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown webhook error';
    console.error('Webhook error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
