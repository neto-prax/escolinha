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
    // Get school settings
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('settings')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school?.settings?.automation) {
      console.log('No automation settings found for school');
      return;
    }

    const automation = school.settings.automation;
    
    if (!automation.sector_selection_enabled) {
      console.log('Sector selection automation is disabled');
      return;
    }

    const enabledSectorIds = automation.enabled_sectors || [];
    if (enabledSectorIds.length === 0) {
      console.log('No sectors enabled for automation');
      return;
    }

    // Get enabled sectors
    const { data: sectorsData, error: sectorsError } = await supabase
      .from('sectors')
      .select('id, name')
      .in('id', enabledSectorIds)
      .eq('is_active', true);

    if (sectorsError || !sectorsData || sectorsData.length === 0) {
      console.log('No active sectors found for automation');
      return;
    }

    // Sort sectors according to the order defined in enabled_sectors
    const sectors = enabledSectorIds
      .map((id: string) => sectorsData.find((s: any) => s.id === id))
      .filter(Boolean);

    // Build sectors list in the configured order
    const sectorsList = sectors.map((s: any, i: number) => `${i + 1}. ${s.name}`).join('\n');
    
    // Replace placeholder in message
    let welcomeMessage = automation.sector_selection_message || 
      'Olá! 👋 Bem-vindo(a)!\n\nPor favor escolha o setor:\n\n{SECTORS_LIST}\n\nDigite o número correspondente.';
    
    welcomeMessage = welcomeMessage.replace('{SECTORS_LIST}', sectorsList);

    console.log('Sending welcome message:', { phone, message: welcomeMessage });

    // Get Evolution API or Uazapi credentials
    const UAZAPI_URL = Deno.env.get('UAZAPI_URL')?.replace(/\/$/, '');
    const UAZAPI_TOKEN = Deno.env.get('UAZAPI_TOKEN');
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

    let resultKeyId: string | null = null;

    if (UAZAPI_URL && UAZAPI_TOKEN) {
      console.log('Sending welcome message via Uazapi...');
      const response = await fetch(`${UAZAPI_URL}/send/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: UAZAPI_TOKEN },
        body: JSON.stringify({ number: phone, text: welcomeMessage }),
      });
      const resData = await response.json().catch(() => ({}));
      resultKeyId = resData?.id || null;
    } else if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
      console.log('Sending welcome message via Evolution API...');
      const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY },
        body: JSON.stringify({ number: phone, text: welcomeMessage }),
      });
      const result = await response.json().catch(() => ({}));
      resultKeyId = result?.key?.id || null;
    }

    // Save outgoing message to database
    const { error: msgError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        direction: 'outgoing',
        body: welcomeMessage,
        message_type: 'text',
        status: 'sent',
        external_id: resultKeyId,
      });

    if (msgError) {
      console.error('Error saving welcome message:', msgError);
    } else {
      console.log('Welcome message saved to database');
    }

  } catch (error) {
    console.error('Error sending welcome message:', error);
  }
}

async function handleSectorSelection(
  supabase: any,
  conversation: any,
  messageBody: string,
  schoolId: string,
  instanceName: string,
  phone: string
) {
  try {
    // Only process if conversation doesn't have a sector yet
    // Once a sector is assigned, we don't change it based on numbers
    if (conversation.sector_id) {
      console.log('Conversation already has a sector, skipping sector selection');
      return;
    }

    // Only process if message is a single number (1-9)
    const trimmedBody = messageBody.trim();
    if (!/^[1-9]$/.test(trimmedBody)) {
      console.log('Message is not a single digit, skipping sector selection');
      return;
    }

    const selectedNumber = parseInt(trimmedBody, 10);

    // Get school settings to check if automation is enabled
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('settings')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school?.settings?.automation) {
      console.log('No automation settings found for school');
      return;
    }

    const automation = school.settings.automation;
    
    if (!automation.sector_selection_enabled) {
      console.log('Sector selection automation is disabled');
      return;
    }

    const enabledSectorIds = automation.enabled_sectors || [];
    if (enabledSectorIds.length === 0) {
      console.log('No sectors enabled for automation');
      return;
    }

    // Get enabled sectors
    const { data: sectorsData, error: sectorsError } = await supabase
      .from('sectors')
      .select('id, name')
      .in('id', enabledSectorIds)
      .eq('is_active', true);

    if (sectorsError || !sectorsData || sectorsData.length === 0) {
      console.log('No active sectors found');
      return;
    }

    // Sort sectors according to the order defined in enabled_sectors (same as welcome message)
    const sectors = enabledSectorIds
      .map((id: string) => sectorsData.find((s: any) => s.id === id))
      .filter(Boolean);

    // Check if selected number is valid
    if (selectedNumber < 1 || selectedNumber > sectors.length) {
      console.log('Selected number out of range:', selectedNumber, 'max:', sectors.length);
      return;
    }

    // Get the selected sector (1-indexed) - using the same order as the menu
    const selectedSector = sectors[selectedNumber - 1];
    console.log('User selected sector:', selectedSector.name, 'id:', selectedSector.id);

    // Update conversation with the selected sector
    const { error: updateError } = await supabase
      .from('whatsapp_conversations')
      .update({
        sector_id: selectedSector.id,
        ticket_status: 'pending', // Mark as pending for an attendant to accept
      })
      .eq('id', conversation.id);

    if (updateError) {
      console.error('Error updating conversation sector:', updateError);
      return;
    }

    console.log('Conversation sector updated successfully to:', selectedSector.name);

    // Send confirmation message
    const UAZAPI_URL = Deno.env.get('UAZAPI_URL')?.replace(/\/$/, '');
    const UAZAPI_TOKEN = Deno.env.get('UAZAPI_TOKEN');
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

    // Get sector-specific greeting if available
    let confirmationMessage = `Você foi direcionado para o setor *${selectedSector.name}*. Em breve um atendente entrará em contato!`;
    
    // Check if sector has a custom greeting
    const sectorGreeting = automation.sector_greetings?.[selectedSector.id];
    if (sectorGreeting) {
      confirmationMessage = sectorGreeting;
    }

    let confResultKeyId: string | null = null;

    if (UAZAPI_URL && UAZAPI_TOKEN) {
      const response = await fetch(`${UAZAPI_URL}/send/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: UAZAPI_TOKEN },
        body: JSON.stringify({ number: phone, text: confirmationMessage }),
      });
      const resData = await response.json().catch(() => ({}));
      confResultKeyId = resData?.id || null;
    } else if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
      const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY },
        body: JSON.stringify({ number: phone, text: confirmationMessage }),
      });
      const result = await response.json().catch(() => ({}));
      confResultKeyId = result?.key?.id || null;
    }

    // Save outgoing confirmation message to database
    const { error: msgError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversation.id,
        direction: 'outgoing',
        body: confirmationMessage,
        message_type: 'text',
        status: 'sent',
        external_id: confResultKeyId,
      });

    if (msgError) {
      console.error('Error saving confirmation message:', msgError);
    }

  } catch (error) {
    console.error('Error handling sector selection:', error);
  }
}

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

    const isUazapi = payload.EventType === 'messages' || (payload.message && (payload.owner || payload.token));
    const isEvolution = payload.event === 'messages.upsert';

    let instance = payload.instanceName || payload.instance || payload.owner || 'Neto';
    let phone = '';
    let messageId = '';
    let pushName = 'Desconhecido';
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
      pushName = msg.senderName || payload.chat?.name || 'Responsável';
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
      pushName = message.pushName || 'Desconhecido';

      if (message.message?.conversation) {
        body = message.message.conversation;
      } else if (message.message?.extendedTextMessage?.text) {
        body = message.message.extendedTextMessage.text;
      } else if (message.message?.imageMessage) {
        messageType = 'image';
        mediaCaption = message.message.imageMessage.caption || '';
        body = mediaCaption || '[Imagem]';
        if (message.message.imageMessage.url) {
          mediaUrl = message.message.imageMessage.url;
        } else if (message.message.base64) {
          mediaUrl = `data:image/jpeg;base64,${message.message.base64}`;
        }
        if (payload.data?.mediaUrl) {
          mediaUrl = payload.data.mediaUrl;
        }
      } else if (message.message?.videoMessage) {
        messageType = 'video';
        mediaCaption = message.message.videoMessage.caption || '';
        body = mediaCaption || '[Vídeo]';
        if (message.message.videoMessage.url) {
          mediaUrl = message.message.videoMessage.url;
        }
        if (payload.data?.mediaUrl) {
          mediaUrl = payload.data.mediaUrl;
        }
      } else if (message.message?.audioMessage) {
        messageType = 'audio';
        body = '[Áudio]';
        if (message.message.audioMessage.url) {
          mediaUrl = message.message.audioMessage.url;
        }
        if (payload.data?.mediaUrl) {
          mediaUrl = payload.data.mediaUrl;
        }
      } else if (message.message?.documentMessage) {
        messageType = 'document';
        mediaFilename = message.message.documentMessage.fileName || 'documento';
        body = `[Documento: ${mediaFilename}]`;
        if (message.message.documentMessage.url) {
          mediaUrl = message.message.documentMessage.url;
        }
        if (payload.data?.mediaUrl) {
          mediaUrl = payload.data.mediaUrl;
        }
      } else if (message.message?.stickerMessage) {
        messageType = 'sticker';
        body = '[Figurinha]';
        if (message.message.stickerMessage.url) {
          mediaUrl = message.message.stickerMessage.url;
        }
        if (payload.data?.mediaUrl) {
          mediaUrl = payload.data.mediaUrl;
        }
      } else {
        body = '[Mensagem não suportada]';
      }
    } else if (payload.event === 'messages.update' || payload.EventType === 'messages_update') {
      return new Response(JSON.stringify({ status: 'updated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.log('Skipping unhandled webhook event:', payload.EventType || payload.event);
      return new Response(JSON.stringify({ status: 'ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Skip status messages and messages from self
    if (isFromMe || isGroup) {
      console.log('Skipping message from self or group');
      return new Response(JSON.stringify({ status: 'skipped' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing message:', { phone, pushName, body, messageType, instance });

    // Find the instance in database to get school_id
    let { data: instanceData, error: instanceError } = await supabase
      .from('evolution_instances')
      .select('id, school_id')
      .eq('instance_name', instance)
      .maybeSingle();

    if (!instanceData) {
      const { data: anyInst } = await supabase
        .from('evolution_instances')
        .select('id, school_id')
        .limit(1)
        .maybeSingle();
      instanceData = anyInst;
    }

    if (!instanceData) {
      const { data: anySchool } = await supabase
        .from('schools')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (anySchool?.id) {
        console.log('Auto-registering instance in evolution_instances:', instance);
        const { data: created } = await supabase
          .from('evolution_instances')
          .insert({
            school_id: anySchool.id,
            instance_name: instance || 'Neto',
            display_name: payload.instanceName || instance || 'Neto Oliver',
            status: 'connected',
            connected_phone: payload.owner || '557583690441',
          })
          .select('id, school_id')
          .maybeSingle();

        instanceData = created || { id: null, school_id: anySchool.id };
      }
    }

    if (!instanceData?.school_id) {
      console.error('Error finding or creating instance:', instanceError);
      return new Response(JSON.stringify({ status: 'school_not_found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

      // Note: We no longer assign a sector automatically
      // The sector will be assigned when the user responds to the sector selection menu

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

      let isNewConversation = false;

      if (!conversation) {
        isNewConversation = true;
        // Create new conversation WITHOUT a sector - user will select via menu
        const { data: newConv, error: createError } = await supabase
          .from('whatsapp_conversations')
          .insert({
            phone,
            contact_name: pushName,
            school_id: schoolId,
            sector_id: null, // No sector initially - will be assigned when user selects
            status: 'open',
            ticket_status: 'pending', // Pending until sector is selected
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

      // Send welcome message if this is a new conversation
      if (isNewConversation) {
        console.log('New conversation - checking automation settings...');
        await sendWelcomeMessage(supabase, instance, phone, schoolId, conversation.id);
      } else {
        // Check if user is responding to sector selection menu
        await handleSectorSelection(supabase, conversation, body, schoolId, instance, phone);
      }

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
      const keyId = data.keyId;
      const status = data.status;
      
      console.log('Message status update:', { keyId, status });
      
      // Map Evolution status to our status
      let mappedStatus = 'sent';
      if (status === 'SERVER_ACK') {
        mappedStatus = 'sent';
      } else if (status === 'DELIVERY_ACK') {
        mappedStatus = 'delivered';
      } else if (status === 'READ' || status === 'PLAYED') {
        mappedStatus = 'read';
      }
      
      // Update message status by external_id
      const { data: updated, error } = await supabase
        .from('whatsapp_messages')
        .update({ status: mappedStatus })
        .eq('external_id', keyId)
        .select('id')
        .maybeSingle();
      
      if (error) {
        console.error('Error updating message status:', error);
      } else if (updated) {
        console.log('Message status updated:', updated.id, 'to', mappedStatus);
      } else {
        console.log('Message not found for keyId:', keyId);
      }
      
      return new Response(JSON.stringify({ status: 'acknowledged', updated: !!updated }), {
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
