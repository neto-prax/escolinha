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

    // Get Evolution API credentials
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error('Evolution API credentials not configured');
      return;
    }

    // Send message via Evolution API
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: phone,
        text: welcomeMessage,
      }),
    });

    const result = await response.json();
    console.log('Welcome message sent:', result);

    // Save outgoing message to database
    const { error: msgError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        direction: 'outgoing',
        body: welcomeMessage,
        message_type: 'text',
        status: 'sent',
        external_id: result.key?.id || null,
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
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error('Evolution API credentials not configured');
      return;
    }

    // Get sector-specific greeting if available
    let confirmationMessage = `Você foi direcionado para o setor *${selectedSector.name}*. Em breve um atendente entrará em contato!`;
    
    // Check if sector has a custom greeting
    const sectorGreeting = automation.sector_greetings?.[selectedSector.id];
    if (sectorGreeting) {
      confirmationMessage = sectorGreeting;
    }

    // Send confirmation via Evolution API
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: phone,
        text: confirmationMessage,
      }),
    });

    const result = await response.json();
    console.log('Confirmation message sent:', result);

    // Save outgoing confirmation message to database
    const { error: msgError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversation.id,
        direction: 'outgoing',
        body: confirmationMessage,
        message_type: 'text',
        status: 'sent',
        external_id: result.key?.id || null,
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
        // Get media URL from base64 or URL if available
        if (message.message.imageMessage.url) {
          mediaUrl = message.message.imageMessage.url;
        } else if (message.message.base64) {
          // If base64 is provided, we'll need to upload it to storage
          mediaUrl = `data:image/jpeg;base64,${message.message.base64}`;
        }
        // Check for mediaUrl in root data (some Evolution versions send it this way)
        if (data.mediaUrl) {
          mediaUrl = data.mediaUrl;
        }
      } else if (message.message?.videoMessage) {
        messageType = 'video';
        mediaCaption = message.message.videoMessage.caption || '';
        body = mediaCaption || '[Vídeo]';
        if (message.message.videoMessage.url) {
          mediaUrl = message.message.videoMessage.url;
        }
        if (data.mediaUrl) {
          mediaUrl = data.mediaUrl;
        }
      } else if (message.message?.audioMessage) {
        messageType = 'audio';
        body = '[Áudio]';
        if (message.message.audioMessage.url) {
          mediaUrl = message.message.audioMessage.url;
        }
        if (data.mediaUrl) {
          mediaUrl = data.mediaUrl;
        }
      } else if (message.message?.documentMessage) {
        messageType = 'document';
        mediaFilename = message.message.documentMessage.fileName || 'documento';
        body = `[Documento: ${mediaFilename}]`;
        if (message.message.documentMessage.url) {
          mediaUrl = message.message.documentMessage.url;
        }
        if (data.mediaUrl) {
          mediaUrl = data.mediaUrl;
        }
      } else if (message.message?.stickerMessage) {
        messageType = 'sticker';
        body = '[Figurinha]';
        if (message.message.stickerMessage.url) {
          mediaUrl = message.message.stickerMessage.url;
        }
        if (data.mediaUrl) {
          mediaUrl = data.mediaUrl;
        }
      } else {
        body = '[Mensagem não suportada]';
      }

      console.log('Processing message:', { phone, pushName, body, messageType, hasMediaUrl: !!mediaUrl });

      // For media messages, ALWAYS download and upload to storage (WhatsApp URLs expire quickly)
      if (['image', 'video', 'audio', 'document', 'sticker'].includes(messageType) && messageId) {
        try {
          const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
          const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
          
          if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
            console.log('Fetching media from Evolution API to upload to storage...');
            const mediaResponse = await fetch(`${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${instance}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': EVOLUTION_API_KEY,
              },
              body: JSON.stringify({
                message: {
                  key: message.key,
                  message: message.message
                }
              }),
            });
            
            if (mediaResponse.ok) {
              const mediaData = await mediaResponse.json();
              if (mediaData.base64) {
                // Determine mime type
                let mimeType = 'application/octet-stream';
                if (messageType === 'image') mimeType = mediaData.mimetype || 'image/jpeg';
                else if (messageType === 'video') mimeType = mediaData.mimetype || 'video/mp4';
                else if (messageType === 'audio') mimeType = mediaData.mimetype || 'audio/ogg';
                else if (messageType === 'document') mimeType = mediaData.mimetype || 'application/pdf';
                else if (messageType === 'sticker') mimeType = mediaData.mimetype || 'image/webp';
                
                // Upload to Supabase Storage
                const ext = mimeType.split('/')[1] || 'bin';
                const fileName = `${messageId}.${ext}`;
                const filePath = `${phone}/${fileName}`;
                
                // Decode base64 and upload
                const binaryData = Uint8Array.from(atob(mediaData.base64), c => c.charCodeAt(0));
                
                const { data: uploadData, error: uploadError } = await supabase.storage
                  .from('message-media')
                  .upload(filePath, binaryData, {
                    contentType: mimeType,
                    upsert: true
                  });
                
                if (uploadError) {
                  console.error('Error uploading media:', uploadError);
                  // Keep the WhatsApp URL as fallback (may work temporarily)
                } else {
                  // Get public URL - this URL will never expire
                  const { data: publicUrl } = supabase.storage
                    .from('message-media')
                    .getPublicUrl(filePath);
                  
                  mediaUrl = publicUrl.publicUrl;
                  console.log('Media uploaded successfully to storage:', mediaUrl);
                }
              } else {
                console.log('No base64 data in Evolution response, keeping original URL');
              }
            } else {
              console.log('Failed to fetch media from Evolution:', mediaResponse.status);
              // Keep the WhatsApp URL as fallback
            }
          }
        } catch (mediaError) {
          console.error('Error fetching/uploading media:', mediaError);
          // Keep the WhatsApp URL as fallback
        }
      }

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
