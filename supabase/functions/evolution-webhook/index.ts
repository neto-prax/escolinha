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
      messageType = String(msg.messageType || msg.type || 'text').toLowerCase();

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
      .select('id, conversation_id')
      .eq('external_id', messageId)
      .maybeSingle();

    if (duplicate) {
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

    // Process automatic triggers for incoming messages
    if (!isFromMe && body) {
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
