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

const DEFAULT_SECTOR_NAMES: Record<string, string> = {
  comercial: 'Comercial & Matrículas',
  financeiro: 'Financeiro',
  secretaria: 'Secretaria',
  pedagogico: 'Coordenação Pedagógica',
  suporte: 'Suporte & Recepção',
};

async function dispatchOutgoingText(
  supabase: any,
  schoolId: string,
  phone: string,
  text: string
): Promise<string | null> {
  const UAZAPI_URL = Deno.env.get('UAZAPI_URL')?.replace(/\/$/, '');
  const UAZAPI_TOKEN = Deno.env.get('UAZAPI_TOKEN');

  let targetUrl = UAZAPI_URL;
  let targetToken = UAZAPI_TOKEN;

  if (!targetUrl || !targetToken) {
    const { data: inst } = await supabase
      .from('evolution_instances')
      .select('api_url, api_key')
      .eq('school_id', schoolId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inst) {
      targetUrl = targetUrl || inst.api_url?.replace(/\/$/, '');
      targetToken = targetToken || inst.api_key;
    }
  }

  if (targetUrl && targetToken) {
    try {
      const response = await fetch(`${targetUrl}/send/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: targetToken },
        body: JSON.stringify({ number: phone, text }),
      });
      const resData = await response.json().catch(() => ({}));
      return resData?.id || null;
    } catch (e) {
      console.warn('dispatchOutgoingText error:', e);
    }
  }
  return null;
}

async function sendWelcomeMessage(
  supabase: any,
  instanceName: string,
  phone: string,
  schoolId: string,
  conversationId: string,
  contactName?: string
) {
  try {
    const { data: school } = await supabase
      .from('schools')
      .select('settings, name')
      .eq('id', schoolId)
      .maybeSingle();

    const automation = school?.settings?.automation || {};
    if (automation.sector_selection_enabled === false) {
      return false;
    }

    const rawEnabledSectors: string[] =
      Array.isArray(automation.enabled_sectors) && automation.enabled_sectors.length > 0
        ? automation.enabled_sectors
        : ['comercial', 'financeiro', 'secretaria', 'pedagogico'];

    // Consulta setores ativos do banco sem forçar filtro IN com IDs não-UUID
    const { data: dbSectors } = await supabase
      .from('sectors')
      .select('id, name')
      .eq('school_id', schoolId)
      .eq('is_active', true);

    const activeDbSectors = dbSectors || [];

    const sectors = rawEnabledSectors.map((idOrSlug: string) => {
      const foundDb = activeDbSectors.find(
        (s: any) =>
          s.id === idOrSlug ||
          s.name.toLowerCase() === idOrSlug.toLowerCase() ||
          idOrSlug.toLowerCase().includes(s.name.toLowerCase())
      );
      if (foundDb) return foundDb;
      const defName = DEFAULT_SECTOR_NAMES[idOrSlug.toLowerCase()] || idOrSlug;
      return { id: idOrSlug, name: defName };
    });

    const sectorsList = sectors.map((s: any, i: number) => `*${i + 1}* - ${s.name}`).join('\n');

    let welcomeMessage =
      automation.sector_selection_message ||
      'Olá! 👋 Bem-vindo(a) à {{escola}}!\n\nPara direcionar seu atendimento ao setor responsável, por favor digite o número da opção desejada:\n\n{SECTORS_LIST}\n\nComo podemos te ajudar hoje?';

    const firstName = contactName?.split(' ')[0] || 'Responsável';
    const schoolName = school?.name || 'Purple Edu';

    welcomeMessage = welcomeMessage
      .replace('{SECTORS_LIST}', sectorsList)
      .replace(/\{\{nome\}\}/gi, firstName)
      .replace(/\{\{responsavel\}\}/gi, contactName || 'Responsável')
      .replace(/\{\{aluno\}\}/gi, 'seu dependente')
      .replace(/\{\{escola\}\}/gi, schoolName);

    const resultKeyId = await dispatchOutgoingText(supabase, schoolId, phone, welcomeMessage);
    if (!resultKeyId) {
      console.warn(`[AutoGreeting] Gateway backend não configurado para envio direto para ${phone}, delegando disparo.`);
      return false;
    }

    const nowIso = new Date().toISOString();
    await supabase.from('whatsapp_messages').insert({
      conversation_id: conversationId,
      direction: 'outgoing',
      body: welcomeMessage,
      message_type: 'text',
      status: 'sent',
      external_id: resultKeyId,
      created_at: nowIso,
    });

    await supabase.from('whatsapp_conversations').update({
      last_message: welcomeMessage,
      last_message_at: nowIso,
    }).eq('id', conversationId);

    console.log(`[AutoGreeting] Mensagem de saudação enviada com sucesso para ${phone}`);
    return true;
  } catch (error) {
    console.error('Error sending welcome message:', error);
    return false;
  }
}

async function processAutomationTriggers(
  supabase: any,
  phone: string,
  incomingText: string,
  contactName: string,
  schoolId: string,
  conversationId: string
) {
  try {
    if (!incomingText || !incomingText.trim()) return;

    const { data: school } = await supabase
      .from('schools')
      .select('settings, name')
      .eq('id', schoolId)
      .maybeSingle();

    const automation = school?.settings?.automation;
    let triggers = automation?.triggers;

    // Gatilhos padrão inteligentes caso a instituição ainda não tenha personalizado
    if (!Array.isArray(triggers) || triggers.length === 0) {
      triggers = [
        {
          id: 'trig-matriculas',
          nome: 'Matrículas & Mensalidades',
          ativo: true,
          tipoCorrespondencia: 'contem',
          palavrasChave: ['matricula', 'matrícula', 'vagas', 'vaga', 'preço', 'valor', 'mensalidade'],
          respostaTexto: 'Olá {{nome}}! 🎒 Que alegria seu interesse na {{escola}}! Nossas matrículas para o período letivo estão com condições especiais. Estou transferindo seu atendimento para nossa equipe de Matrículas e Admissões agora mesmo! 📚',
          setorDestinoId: 'comercial',
          alterarStatus: 'open',
          prioridade: 1,
        },
        {
          id: 'trig-financeiro',
          nome: 'Segunda Via de Boleto / PIX',
          ativo: true,
          tipoCorrespondencia: 'contem',
          palavrasChave: ['boleto', 'pix', 'segunda via', '2 via', 'pagamento', 'pagar', 'carne', 'carnê', 'comprovante'],
          respostaTexto: 'Olá {{nome}}! 💳 Localizamos seu contato. Para emissão de 2ª via de boleto ou confirmação de pagamento para o aluno(a) {{aluno}}, estou transferindo você para o nosso setor Financeiro. Um momento!',
          setorDestinoId: 'financeiro',
          alterarStatus: 'open',
          prioridade: 2,
        },
        {
          id: 'trig-secretaria',
          nome: 'Secretaria & Declarações',
          ativo: true,
          tipoCorrespondencia: 'contem',
          palavrasChave: ['declaracao', 'declaração', 'historico', 'histórico', 'atestado', 'transferencia', 'transferência', 'secretaria'],
          respostaTexto: 'Olá {{nome}}! 📑 Para solicitação de declaração de matrícula, histórico escolar ou atestados acadêmicos, seu atendimento foi direcionado para a nossa Secretaria Escolar.',
          setorDestinoId: 'secretaria',
          alterarStatus: 'open',
          prioridade: 3,
        },
        {
          id: 'trig-pedagogico',
          nome: 'Coordenação Pedagógica & Notas',
          ativo: true,
          tipoCorrespondencia: 'contem',
          palavrasChave: ['nota', 'boletim', 'prova', 'tarefa', 'reuniao', 'reunião', 'professor', 'professora', 'rendimento'],
          respostaTexto: 'Olá {{nome}}! 👩‍🏫 Sobre a rotina pedagógica, desempenho e atividades de sala de aula do(a) {{aluno}}, estamos encaminhando sua conversa para a Coordenação Pedagógica.',
          setorDestinoId: 'pedagogico',
          alterarStatus: 'open',
          prioridade: 4,
        },
        {
          id: 'trig-horario',
          nome: 'Horário de Atendimento',
          ativo: true,
          tipoCorrespondencia: 'contem',
          palavrasChave: ['horario', 'horário', 'funcionamento', 'aberto', 'fecha', 'atendimento'],
          respostaTexto: 'Olá {{nome}}! ⏰ O atendimento da {{escola}} funciona de Segunda a Sexta-feira, das 07h00 às 18h00. Como podemos te ajudar hoje?',
          setorDestinoId: null,
          alterarStatus: null,
          prioridade: 5,
        },
      ];
    }

    const normalize = (t: string) =>
      t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const cleanInput = normalize(incomingText);

    // 1. Processar resposta ao Menu de Setores (caso a saudação inicial com menu esteja ativa)
    if (
      automation?.sector_selection_enabled &&
      Array.isArray(automation?.enabled_sectors) &&
      automation.enabled_sectors.length > 0
    ) {
      const { data: dbSectors } = await supabase
        .from('sectors')
        .select('id, name')
        .eq('school_id', schoolId)
        .eq('is_active', true);

      const activeDbSectors = dbSectors || [];
      const orderedSectors = automation.enabled_sectors.map((idOrSlug: string) => {
        const found = activeDbSectors.find(
          (s: any) =>
            s.id === idOrSlug ||
            s.name.toLowerCase() === idOrSlug.toLowerCase() ||
            idOrSlug.toLowerCase().includes(s.name.toLowerCase())
        );
        if (found) return found;
        const defName = DEFAULT_SECTOR_NAMES[idOrSlug.toLowerCase()] || idOrSlug;
        return { id: idOrSlug, name: defName };
      });

      let chosenSector: any = null;

      // Se digitou número (ex: "1", "1.", "#1", "opcao 1")
      const numMatch = cleanInput.match(/^(?:opcao\s*|opção\s*|#)?(\d+)\.?$/i);
      if (numMatch) {
        const optionIndex = parseInt(numMatch[1], 10) - 1;
        if (optionIndex >= 0 && optionIndex < orderedSectors.length) {
          chosenSector = orderedSectors[optionIndex];
        }
      } else {
        // Se digitou o nome do setor diretamente
        chosenSector = orderedSectors.find((s: any) => {
          const secName = normalize(s.name);
          return cleanInput === secName || cleanInput.includes(secName);
        });
      }

      if (chosenSector) {
        const rawTransferMessage =
          automation.sector_greetings?.[chosenSector.id] ||
          `Perfeito! Transferindo para o setor ${chosenSector.name}. Em instantes um atendente irá te responder.`;

        const firstName = contactName?.split(' ')[0] || 'Responsável';
        const schoolName = school?.name || 'Purple Edu';
        const finalTransferMessage = rawTransferMessage
          .replace(/\{\{nome\}\}/gi, firstName)
          .replace(/\{\{responsavel\}\}/gi, contactName || 'Responsável')
          .replace(/\{\{aluno\}\}/gi, 'seu dependente')
          .replace(/\{\{escola\}\}/gi, schoolName)
          .replace(/\{\{setor\}\}/gi, chosenSector.name);

        const resultKeyId = await dispatchOutgoingText(supabase, schoolId, phone, finalTransferMessage);
        if (!resultKeyId) {
          console.warn(`[AutoTrigger] Gateway backend não configurado para envio de transferência para ${phone}, delegando.`);
          return;
        }

        const nowIso = new Date().toISOString();
          await supabase.from('whatsapp_messages').insert({
            conversation_id: conversationId,
            direction: 'outgoing',
            body: finalTransferMessage,
            message_type: 'text',
            status: 'sent',
            external_id: resultKeyId,
            created_at: nowIso,
          });

          await supabase
            .from('whatsapp_conversations')
            .update({
              sector_id: chosenSector.id,
              ticket_status: 'open',
              last_message: finalTransferMessage,
              last_message_at: nowIso,
            })
            .eq('id', conversationId);

          console.log(`[AutoTrigger] Menu de saudação roteou conversa ${conversationId} para setor ${chosenSector.name}`);
          return;
        }
      }
    }

    const activeTriggers = triggers
      .filter((t: any) => t.ativo !== false)
      .sort((a: any, b: any) => (a.prioridade || 99) - (b.prioridade || 99));

    for (const trigger of activeTriggers) {
      let matched = false;
      const tipo = trigger.tipoCorrespondencia || 'contem';
      const keywords = Array.isArray(trigger.palavrasChave) ? trigger.palavrasChave : [];

      if (tipo === 'qualquer_primeira') {
        matched = true;
      } else {
        for (const kw of keywords) {
          const cleanKw = normalize(kw);
          if (!cleanKw) continue;
          if (tipo === 'exata' && cleanInput === cleanKw) {
            matched = true;
            break;
          }
          if (tipo === 'inicio' && cleanInput.startsWith(cleanKw)) {
            matched = true;
            break;
          }
          if ((tipo === 'contem' || !tipo) && cleanInput.includes(cleanKw)) {
            matched = true;
            break;
          }
        }
      }

      if (matched) {
        const rawResponse = trigger.respostaTexto || trigger.message_template || '';
        if (!rawResponse) continue;

        const firstName = contactName?.split(' ')[0] || 'Responsável';
        const schoolName = school?.name || 'Purple Edu';
        const finalMessage = rawResponse
          .replace(/\{\{nome\}\}/gi, firstName)
          .replace(/\{\{responsavel\}\}/gi, contactName || 'Responsável')
          .replace(/\{\{aluno\}\}/gi, 'seu dependente')
          .replace(/\{\{escola\}\}/gi, schoolName)
          .replace(/\{\{setor\}\}/gi, 'Atendimento');

        const UAZAPI_URL = Deno.env.get('UAZAPI_URL')?.replace(/\/$/, '');
        const UAZAPI_TOKEN = Deno.env.get('UAZAPI_TOKEN');

        let resultKeyId: string | null = null;
        if (UAZAPI_URL && UAZAPI_TOKEN) {
          const response = await fetch(`${UAZAPI_URL}/send/text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', token: UAZAPI_TOKEN },
            body: JSON.stringify({ number: phone, text: finalMessage }),
          });
          const resData = await response.json().catch(() => ({}));
          resultKeyId = resData?.id || null;
        }

        const nowIso = new Date().toISOString();
        await supabase.from('whatsapp_messages').insert({
          conversation_id: conversationId,
          direction: 'outgoing',
          body: finalMessage,
          message_type: 'text',
          status: 'sent',
          external_id: resultKeyId,
          created_at: nowIso,
        });

        const convUpdates: Record<string, unknown> = {
          last_message: finalMessage,
          last_message_at: nowIso,
        };

        if (trigger.alterarStatus) {
          convUpdates.ticket_status = trigger.alterarStatus;
        }

        // Resolução segura de setor
        let targetSectorUuid: string | null = null;
        const rawSector = trigger.setorDestinoId;
        if (rawSector) {
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawSector)) {
            targetSectorUuid = rawSector;
          } else {
            const { data: dbSectors } = await supabase
              .from('sectors')
              .select('id, name')
              .eq('school_id', schoolId);
            const found = dbSectors?.find(
              (s: any) =>
                s.name.toLowerCase().includes(rawSector.toLowerCase()) ||
                rawSector.toLowerCase().includes(s.name.toLowerCase())
            );
            if (found?.id) {
              targetSectorUuid = found.id;
            } else {
              const sectorLabels: Record<string, string> = {
                comercial: 'Comercial & Matrículas',
                financeiro: 'Financeiro',
                secretaria: 'Secretaria',
                pedagogico: 'Pedagógico',
              };
              const { data: createdSector } = await supabase
                .from('sectors')
                .insert({
                  school_id: schoolId,
                  name: sectorLabels[rawSector] || rawSector,
                  is_active: true,
                })
                .select('id')
                .maybeSingle();
              if (createdSector?.id) {
                targetSectorUuid = createdSector.id;
              }
            }
          }
        }

        if (targetSectorUuid) {
          convUpdates.sector_id = targetSectorUuid;
        }

        await supabase
          .from('whatsapp_conversations')
          .update(convUpdates)
          .eq('id', conversationId);

        console.log(`[AutoTrigger] Disparou gatilho "${trigger.nome}" para ${phone}`);
        break;
      }
    }
  } catch (err) {
    console.error('Erro processando gatilho automático:', err);
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

    // Support Uazapi format, Evolution format, and WA-AKG format
    const isUazapi =
      payload.EventType === 'messages' ||
      payload.event === 'messages' ||
      (payload.message && (payload.owner || payload.token || payload.chatid));
    const isEvolution = payload.event === 'messages.upsert';
    const isWaAkg = payload.event === 'message.received' || (Boolean(payload.sessionId) && Boolean(payload.data?.key));

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

    if (payload.event === 'connection.update' || payload.EventType === 'connection' || payload.event === 'connection') {
      return new Response(JSON.stringify({ status: 'connection_acknowledged' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isUazapi && !isEvolution && !isWaAkg) {
      // Check if it's a test ping
      return new Response(JSON.stringify({ status: 'acknowledged', raw: payload }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const eventType = String(payload.EventType || payload.event || '').toLowerCase();
    const messagePayload = payload.message && typeof payload.message === 'object' ? payload.message : {};
    const instanceCandidates = [
      payload.sessionId,
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
    let senderAvatar: string | null = null;

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

      senderAvatar =
        (typeof msg.image === 'string' && msg.image) ||
        (typeof msg.imagePreview === 'string' && msg.imagePreview) ||
        (typeof msg.profilePicUrl === 'string' && msg.profilePicUrl) ||
        (typeof msg.senderProfilePic === 'string' && msg.senderProfilePic) ||
        (typeof payload.chat?.image === 'string' && payload.chat.image) ||
        (typeof payload.chat?.imagePreview === 'string' && payload.chat.imagePreview) ||
        (typeof payload.chat?.profilePicUrl === 'string' && payload.chat.profilePicUrl) ||
        (typeof payload.contact?.profilePicUrl === 'string' && payload.contact.profilePicUrl) ||
        (typeof payload.profilePicUrl === 'string' && payload.profilePicUrl) ||
        null;

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

      senderAvatar =
        (typeof message.profilePicUrl === 'string' && message.profilePicUrl) ||
        (typeof payload.data?.profilePicUrl === 'string' && payload.data.profilePicUrl) ||
        (typeof payload.data?.senderPhoto === 'string' && payload.data.senderPhoto) ||
        null;

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
    } else if (isWaAkg) {
      const akgData = payload.data || {};
      isFromMe = Boolean(akgData.key?.fromMe);
      const remoteJid = String(akgData.key?.remoteJid || akgData.from || '');
      isGroup = Boolean(akgData.isGroup || remoteJid.endsWith('@g.us'));
      phone = remoteJid.replace(/@.*/, '').replace(/\D/g, '');
      messageId = String(akgData.key?.id || `akg-${Date.now()}`);
      pushName = akgData.pushName || akgData.senderName || 'Responsável';
      body = akgData.content || akgData.text || '';
      messageType = normalizeMessageType(akgData.type || 'text');

      senderAvatar =
        (typeof akgData.profilePictureUrl === 'string' && akgData.profilePictureUrl) ||
        (typeof akgData.profilePicUrl === 'string' && akgData.profilePicUrl) ||
        (typeof akgData.avatar === 'string' && akgData.avatar) ||
        (typeof akgData.picture === 'string' && akgData.picture) ||
        null;

      if (['image', 'video', 'audio', 'document', 'sticker'].includes(messageType)) {
        mediaUrl = akgData.fileUrl || akgData.mediaUrl || akgData.url || null;
        mediaCaption = akgData.caption || akgData.content || null;
        mediaFilename = akgData.fileName || akgData.docName || null;
        body = mediaCaption || mediaDefaults(messageType as MediaKind).label;
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

    // Resolve or upsert contact record to store profile picture
    let contactId = conversation?.contact_id || null;
    if (schoolId && formattedPhone) {
      try {
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id, avatar_url')
          .eq('school_id', schoolId)
          .or(`phone.eq.${formattedPhone},phone.eq.${cleanPhone},phone.eq.${without55}`)
          .maybeSingle();

        if (existingContact?.id) {
          contactId = existingContact.id;
          if (senderAvatar && existingContact.avatar_url !== senderAvatar) {
            await supabase
              .from('contacts')
              .update({ avatar_url: senderAvatar })
              .eq('id', existingContact.id);
          }
        } else if (senderAvatar || (pushName && pushName !== 'Responsável')) {
          const { data: createdContact } = await supabase
            .from('contacts')
            .insert({
              school_id: schoolId,
              phone: formattedPhone,
              full_name: pushName && pushName !== 'Responsável' ? pushName : formattedPhone,
              avatar_url: senderAvatar || null,
              contact_type: 'whatsapp',
              contact_types: ['whatsapp'],
            })
            .select('id')
            .maybeSingle();
          if (createdContact?.id) {
            contactId = createdContact.id;
          }
        }
      } catch (contactErr) {
        console.warn('Error resolving/updating contact profile pic:', contactErr);
      }
    }

    if (!conversation) {
      isNewConversation = true;
      const { data: newConv, error: createError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          school_id: schoolId,
          phone: formattedPhone,
          contact_name: pushName,
          contact_id: contactId,
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
      if (contactId && !conversation.contact_id) {
        updates.contact_id = contactId;
      }
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

    // Send welcome message if it's the contact's first message or new conversation
    let shouldSendGreeting = false;
    if (!isFromMe) {
      if (isNewConversation) {
        shouldSendGreeting = true;
      } else {
        const { count: outgoingCount } = await supabase
          .from('whatsapp_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id)
          .eq('direction', 'outgoing');

        if (!outgoingCount || outgoingCount === 0) {
          shouldSendGreeting = true;
        }
      }
    }

    let welcomeSent = false;
    if (shouldSendGreeting) {
      welcomeSent = await sendWelcomeMessage(
        supabase,
        instanceCandidates[0] || '',
        formattedPhone,
        schoolId,
        conversation.id,
        pushName || conversation.contact_name
      );
    }

    // Process automatic triggers for incoming messages (if welcome menu was not just dispatched)
    if (!isFromMe && body && !welcomeSent) {
      await processAutomationTriggers(
        supabase,
        formattedPhone,
        body,
        pushName || conversation.contact_name,
        schoolId,
        conversation.id
      );
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
