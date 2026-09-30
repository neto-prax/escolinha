import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type MediaKind = 'image' | 'video' | 'audio' | 'document' | 'sticker';

const MEDIA_TYPES: Record<string, MediaKind> = {
  image: 'image',
  imagemessage: 'image',
  video: 'video',
  videomessage: 'video',
  audio: 'audio',
  audiomessage: 'audio',
  ptt: 'audio',
  pttmessage: 'audio',
  document: 'document',
  documentmessage: 'document',
  documentwithcaptionmessage: 'document',
  sticker: 'sticker',
  stickermessage: 'sticker',
};

function normalizeMessageType(value: unknown): string {
  const compact = String(value || 'text').toLowerCase().replace(/[._\s-]/g, '');
  if (compact === 'extendedtextmessage' || compact === 'conversation') return 'text';
  return MEDIA_TYPES[compact] || compact || 'text';
}

function mediaDefaults(type: MediaKind): { mime: string; extension: string; label: string } {
  switch (type) {
    case 'image': return { mime: 'image/jpeg', extension: 'jpg', label: '[Imagem]' };
    case 'video': return { mime: 'video/mp4', extension: 'mp4', label: '[Vídeo]' };
    case 'audio': return { mime: 'audio/ogg', extension: 'ogg', label: '[Áudio]' };
    case 'sticker': return { mime: 'image/webp', extension: 'webp', label: '[Figurinha]' };
    case 'document': return { mime: 'application/octet-stream', extension: 'bin', label: '[Documento]' };
  }
}

function decodeBase64(value: string): { bytes: Uint8Array; mime?: string } {
  const match = value.match(/^data:([^;]+);base64,(.+)$/s);
  const encoded = match?.[2] || value;
  const binary = atob(encoded.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return { bytes, mime: match?.[1] };
}

async function persistInboundMedia(
  supabase: any,
  schoolId: string,
  conversationId: string,
  messageId: string,
  mediaType: MediaKind,
  sourceUrl: string | null,
  hintedMime: string | null,
): Promise<string | null> {
  const UAZAPI_URL = Deno.env.get('UAZAPI_URL')?.replace(/\/$/, '');
  const UAZAPI_TOKEN = Deno.env.get('UAZAPI_TOKEN');
  let bytes: Uint8Array | null = null;
  let mime = hintedMime || mediaDefaults(mediaType).mime;

  if (UAZAPI_URL && UAZAPI_TOKEN) {
    try {
      const response = await fetch(`${UAZAPI_URL}/message/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: UAZAPI_TOKEN },
        body: JSON.stringify({ id: messageId, return_base64: true }),
      });
      if (response.ok) {
        const result = await response.json();
        if (typeof result?.base64 === 'string' && result.base64.length > 0) {
          const decoded = decodeBase64(result.base64);
          bytes = decoded.bytes;
          mime = decoded.mime || result.mimetype || result.mimeType || mime;
        } else {
          const downloadedUrl = result?.fileURL || result?.fileUrl || result?.url;
          if (typeof downloadedUrl === 'string' && downloadedUrl.length > 0) {
            sourceUrl = downloadedUrl;
          }
        }
      } else {
        console.warn('Media download request failed', { status: response.status, messageId });
      }
    } catch (error) {
      console.warn('Media download request error', { messageId, error: error instanceof Error ? error.message : 'unknown' });
    }
  }

  if (!bytes && sourceUrl) {
    try {
      const response = await fetch(sourceUrl);
      if (response.ok) {
        bytes = new Uint8Array(await response.arrayBuffer());
        mime = response.headers.get('content-type')?.split(';')[0] || mime;
      }
    } catch (error) {
      console.warn('Direct media download error', { messageId, error: error instanceof Error ? error.message : 'unknown' });
    }
  }

  if (!bytes) return sourceUrl;

  const mimeExtension = mime.split('/')[1]?.replace('jpeg', 'jpg').replace(/[^a-z0-9]/gi, '');
  const extension = mimeExtension || mediaDefaults(mediaType).extension;
  const safeMessageId = messageId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `${schoolId}/${conversationId}/${safeMessageId}.${extension}`;
  const { error } = await supabase.storage.from('message-media').upload(path, bytes, {
    contentType: mime,
    upsert: false,
  });

  if (error && !String(error.message).toLowerCase().includes('already exists')) {
    console.warn('Media storage upload failed', { messageId, error: error.message });
    return sourceUrl;
  }

  return supabase.storage.from('message-media').getPublicUrl(path).data.publicUrl;
}

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

    const eventType = String(payload.EventType || payload.event || '').toLowerCase();
    const messagePayload = payload.message && typeof payload.message === 'object' ? payload.message : {};
    const instanceCandidates = [
      payload.instanceName,
      typeof payload.instance === 'string' ? payload.instance : payload.instance?.name,
      payload.owner,
      payload.token,
      messagePayload.owner,
      messagePayload.instanceName,
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
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
      const msg = messagePayload;
      isFromMe = Boolean(msg.fromMe ?? msg.fromme ?? payload.fromMe);
      const chatId = String(msg.chatid || msg.chatId || msg.sender || payload.chatid || payload.sender || '');
      isGroup = Boolean(msg.isGroup || chatId.endsWith('@g.us'));
      phone = chatId.replace(/@.*/, '').replace(/\D/g, '');
      messageId = String(msg.messageid || msg.messageId || msg.id || payload.messageid || payload.id || '');
      pushName = msg.senderName || msg.pushName || payload.chat?.name || payload.contact?.name || 'Responsável';
      body = msg.text || msg.body || (typeof msg.content === 'string' ? msg.content : '') || '';
      messageType = normalizeMessageType(msg.messageType || msg.mediaType || msg.type || 'text');

      if (['image', 'video', 'audio', 'document', 'sticker'].includes(messageType)) {
        mediaUrl = msg.fileURL || msg.fileUrl || msg.mediaUrl || msg.url || msg.content?.fileURL || msg.content?.fileUrl || msg.content?.file || msg.content?.url || null;
        mediaFilename = msg.docName || msg.fileName || msg.filename || msg.content?.fileName || null;
        mediaCaption = msg.text || msg.caption || msg.content?.caption || null;
        body = mediaCaption || mediaDefaults(messageType as MediaKind).label;
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
      } else if (message.message?.stickerMessage) {
        messageType = 'sticker';
        body = '[Figurinha]';
        mediaUrl = message.message.stickerMessage.url || null;
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
      console.warn('Inbound message ignored: phone not found', { eventType });
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

    if (!messageId) {
      messageId = `uaz-${phone}-${payload.timestamp || messagePayload.timestamp || Date.now()}`;
    }

    const { data: duplicate } = await supabase
      .from('whatsapp_messages')
      .select('id, conversation_id, media_url, whatsapp_conversations!inner(school_id)')
      .eq('external_id', messageId)
      .maybeSingle();

    if (duplicate) {
      if (!duplicate.media_url && ['image', 'video', 'audio', 'document', 'sticker'].includes(messageType)) {
        const duplicateConversation = Array.isArray(duplicate.whatsapp_conversations)
          ? duplicate.whatsapp_conversations[0]
          : duplicate.whatsapp_conversations;
        const duplicateSchoolId = duplicateConversation?.school_id;
        if (duplicateSchoolId) {
          const mediaMime = messagePayload.mimetype || messagePayload.mimeType || messagePayload.content?.mimetype || null;
          const recoveredUrl = await persistInboundMedia(
            supabase,
            duplicateSchoolId,
            duplicate.conversation_id,
            messageId,
            messageType as MediaKind,
            mediaUrl,
            mediaMime,
          );
          if (recoveredUrl) {
            await supabase
              .from('whatsapp_messages')
              .update({
                media_url: recoveredUrl,
                message_type: messageType,
                media_caption: mediaCaption,
                media_filename: mediaFilename,
                body: body || mediaDefaults(messageType as MediaKind).label,
              })
              .eq('id', duplicate.id);
            return new Response(JSON.stringify({ status: 'duplicate_media_recovered', messageId: duplicate.id }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }
      return new Response(JSON.stringify({ status: 'duplicate', messageId: duplicate.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve school_id only through the configured instance. Never guess a tenant.
    let schoolId: string | null = null;

    for (const candidate of instanceCandidates) {
      const { data: namedRows } = await supabase
        .from('evolution_instances')
        .select('school_id')
        .eq('instance_name', candidate)
        .order('updated_at', { ascending: false })
        .limit(1);
      if (namedRows?.[0]?.school_id) {
        schoolId = namedRows[0].school_id;
        break;
      }

      const candidatePhone = candidate.replace(/\D/g, '');
      if (candidatePhone) {
        const { data: phoneRows } = await supabase
          .from('evolution_instances')
          .select('school_id')
          .eq('connected_phone', candidatePhone)
          .order('updated_at', { ascending: false })
          .limit(1);
        if (phoneRows?.[0]?.school_id) {
          schoolId = phoneRows[0].school_id;
          break;
        }
      }
    }

    if (!schoolId) {
      const { data: connectedInstances } = await supabase
        .from('evolution_instances')
        .select('school_id')
        .eq('status', 'connected')
        .order('updated_at', { ascending: false })
        .limit(2);

      const connectedSchoolIds = [...new Set((connectedInstances || []).map((row: { school_id: string }) => row.school_id))];
      if (connectedSchoolIds.length === 1) schoolId = connectedSchoolIds[0];
    }

    if (!schoolId) {
      console.warn('Inbound message rejected: configured school not found', { eventType, instanceCandidates });
      return new Response(JSON.stringify({ status: 'school_not_found' }), {
        status: 422,
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
          last_message: body,
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
        last_message: body,
        last_message_at: nowIso,
      };
      if (!isFromMe) {
        updates.unread_count = (conversation.unread_count || 0) + 1;
      }
      if (pushName && pushName !== 'Responsável' && (!conversation.contact_name || conversation.contact_name === conversation.phone)) {
        updates.contact_name = pushName;
      }

      const { error: updateError } = await supabase
        .from('whatsapp_conversations')
        .update(updates)
        .eq('id', conversation.id);
      if (updateError) throw updateError;
    }

    if (['image', 'video', 'audio', 'document', 'sticker'].includes(messageType)) {
      const mediaMime = messagePayload.mimetype || messagePayload.mimeType || messagePayload.content?.mimetype || null;
      mediaUrl = await persistInboundMedia(
        supabase,
        schoolId,
        conversation.id,
        messageId,
        messageType as MediaKind,
        mediaUrl,
        mediaMime,
      );
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
      if (msgError.code === '23505') {
        return new Response(JSON.stringify({ status: 'duplicate' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('Error inserting whatsapp_messages:', msgError);
      throw msgError;
    }

    // Send welcome message if it's a new incoming conversation
    if (isNewConversation && !isFromMe) {
      await sendWelcomeMessage(supabase, instanceCandidates[0] || '', formattedPhone, schoolId, conversation.id);
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
