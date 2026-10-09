import { supabase } from '@/integrations/supabase/client';

export interface WaAkgStandardResponse {
  status?: {
    connected?: boolean;
    jid?: string | null;
  };
  instance?: {
    name?: string;
    status?: string;
    qrcode?: string | null;
    paircode?: string | null;
    profileName?: string;
    owner?: string;
  };
  success?: boolean;
  error?: string;
  details?: unknown;
}

export interface WaAkgConfig {
  url?: string;
  apiKey?: string;
  sessionId?: string;
}

export function getStoredWaAkgConfig(): Required<WaAkgConfig> {
  const url =
    (typeof window !== 'undefined' ? localStorage.getItem('wa_akg_url') : null) ||
    'http://localhost:3000';
  const apiKey =
    (typeof window !== 'undefined' ? localStorage.getItem('wa_akg_api_key') : null) ||
    '';
  const sessionId =
    (typeof window !== 'undefined' ? localStorage.getItem('wa_akg_session_id') : null) ||
    'interagir';

  return { url: url.trim(), apiKey: apiKey.trim(), sessionId: sessionId.trim() };
}

/**
 * Resolves the URL prefix to avoid browser CORS issues during local development.
 * If url points to localhost:3000 and we are in the browser, uses the Vite proxy `/api/wa-akg-local`.
 */
function resolveEndpointUrl(baseUrl: string, endpoint: string): string {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const isLocalhost =
    cleanBase.includes('localhost:3000') ||
    cleanBase.includes('127.0.0.1:3000');

  if (typeof window !== 'undefined' && isLocalhost) {
    return `/api/wa-akg-local${endpoint}`;
  }

  return `${cleanBase}${endpoint}`;
}

/**
 * Calls WA-AKG using the official API specification (Next.js 15 + Baileys):
 * Reference: WA-AKG/docs/API-QUICK-REFERENCE.md
 */
export async function callWaAkg(
  action: 'status' | 'connect' | 'disconnect' | 'send-text' | 'send-media' | 'configure-webhook',
  data: Record<string, unknown> = {}
): Promise<WaAkgStandardResponse> {
  const stored = getStoredWaAkgConfig();

  const rawUrl = (typeof data.waAkgUrl === 'string' && data.waAkgUrl.trim()) || stored.url;
  const apiKey = (typeof data.waAkgApiKey === 'string' && data.waAkgApiKey.trim()) || stored.apiKey;
  const sessionId = (typeof data.sessionId === 'string' && data.sessionId.trim()) || stored.sessionId;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    // ----------------------------------------------------
    // ACTION: STATUS
    // ----------------------------------------------------
    if (action === 'status') {
      try {
        const targetUrl = resolveEndpointUrl(rawUrl, '/api/sessions');
        const res = await fetch(targetUrl, { method: 'GET', headers });

        if (!res.ok) {
          return {
            status: { connected: false, jid: null },
            instance: { name: sessionId, status: 'disconnected', qrcode: null, paircode: null },
          };
        }

        const json = await res.json().catch(() => null);
        const sessionsList = Array.isArray(json) ? json : json?.data || json?.sessions || [];
        const currentSession = sessionsList.find(
          (s: any) => s.id === sessionId || s.name === sessionId || s.sessionId === sessionId
        );

        const isConnected = Boolean(
          currentSession?.status === 'CONNECTED' ||
          currentSession?.status === 'connected' ||
          currentSession?.isConnected === true
        );

        return {
          success: true,
          status: {
            connected: isConnected,
            jid: currentSession?.jid || currentSession?.phone || null,
          },
          instance: {
            name: sessionId,
            status: isConnected ? 'connected' : 'disconnected',
            qrcode: currentSession?.qr || currentSession?.qrcode || null,
            paircode: currentSession?.paircode || null,
            profileName: currentSession?.name || 'WA-AKG',
          },
          details: currentSession,
        };
      } catch {
        return {
          status: { connected: false, jid: null },
          instance: { name: sessionId, status: 'disconnected', qrcode: null, paircode: null },
        };
      }
    }

    // ----------------------------------------------------
    // ACTION: CONNECT (Create Session & Get QR Code)
    // ----------------------------------------------------
    if (action === 'connect') {
      // 1. Ensure session is created
      const createUrl = resolveEndpointUrl(rawUrl, '/api/sessions');
      await fetch(createUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: sessionId }),
      }).catch(() => null);

      // 2. Fetch QR Code from /api/sessions/{sessionId}/qr
      const qrUrl = resolveEndpointUrl(rawUrl, `/api/sessions/${encodeURIComponent(sessionId)}/qr`);
      const qrRes = await fetch(qrUrl, { method: 'GET', headers });

      const text = await qrRes.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }

      if (!qrRes.ok) {
        if (qrRes.status === 500 && (text.includes('ECONNREFUSED') || text.includes('proxy'))) {
          throw new Error(
            `O servidor WA-AKG não está acessível em ${rawUrl}. Verifique se o container está rodando via "sudo docker compose -f docker-compose.wa-akg.yml up -d".`
          );
        }
        if (qrRes.status === 401) {
          throw new Error('Chave de API do WA-AKG não informada ou inválida. Obtenha a API Key no painel do WA-AKG (Settings → API Keys).');
        }
        throw new Error(parsed?.message || parsed?.error || `Erro ${qrRes.status} ao obter QR Code do WA-AKG`);
      }

      const qrCode = parsed?.qr || parsed?.qrcode || parsed?.data?.qr || parsed?.data?.qrcode || (typeof parsed === 'string' ? parsed : null);

      return {
        success: true,
        status: { connected: false, jid: null },
        instance: {
          name: sessionId,
          status: 'connecting',
          qrcode: qrCode,
          paircode: parsed?.paircode || parsed?.pairingCode || null,
        },
        details: parsed,
      };
    }

    // ----------------------------------------------------
    // ACTION: DISCONNECT
    // ----------------------------------------------------
    if (action === 'disconnect') {
      const deleteUrl = resolveEndpointUrl(rawUrl, `/api/sessions/${encodeURIComponent(sessionId)}`);
      await fetch(deleteUrl, { method: 'DELETE', headers });
      return {
        success: true,
        status: { connected: false, jid: null },
        instance: { name: sessionId, status: 'disconnected', qrcode: null, paircode: null },
      };
    }

    // ----------------------------------------------------
    // ACTION: SEND TEXT
    // ----------------------------------------------------
    if (action === 'send-text') {
      const rawPhone = String(data.phone ?? '').replace(/\D/g, '');
      const formattedPhone = rawPhone.includes('@') ? rawPhone : `${rawPhone}@s.whatsapp.net`;
      const sendUrl = resolveEndpointUrl(
        rawUrl,
        `/api/messages/${encodeURIComponent(sessionId)}/${encodeURIComponent(formattedPhone)}/send`
      );

      const res = await fetch(sendUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: {
            text: String(data.message ?? ''),
          },
        }),
      });

      const text = await res.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }

      if (!res.ok) {
        throw new Error(parsed?.message || parsed?.error || `Erro ${res.status} ao enviar mensagem pelo WA-AKG`);
      }

      return { success: true, details: parsed };
    }

    // ----------------------------------------------------
    // ACTION: SEND MEDIA
    // ----------------------------------------------------
    if (action === 'send-media') {
      const rawPhone = String(data.phone ?? '').replace(/\D/g, '');
      const formattedPhone = rawPhone.includes('@') ? rawPhone : `${rawPhone}@s.whatsapp.net`;
      const sendUrl = resolveEndpointUrl(
        rawUrl,
        `/api/messages/${encodeURIComponent(sessionId)}/${encodeURIComponent(formattedPhone)}/send`
      );

      const mediaType = String(data.mediaType || 'image').toLowerCase();
      const mediaPayload: Record<string, unknown> = {};

      if (mediaType.includes('image')) {
        mediaPayload.image = { url: data.mediaUrl };
      } else if (mediaType.includes('video')) {
        mediaPayload.video = { url: data.mediaUrl };
      } else if (mediaType.includes('audio')) {
        mediaPayload.audio = { url: data.mediaUrl };
      } else {
        mediaPayload.document = { url: data.mediaUrl, fileName: data.fileName || 'arquivo' };
      }

      if (data.caption) {
        mediaPayload.caption = String(data.caption);
      }

      const res = await fetch(sendUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: mediaPayload }),
      });

      const text = await res.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }

      if (!res.ok) {
        throw new Error(parsed?.message || parsed?.error || `Erro ${res.status} ao enviar mídia pelo WA-AKG`);
      }

      return { success: true, details: parsed };
    }

    // ----------------------------------------------------
    // ACTION: CONFIGURE WEBHOOK
    // ----------------------------------------------------
    if (action === 'configure-webhook') {
      const webhookUrl =
        (data.url as string) ||
        `${import.meta.env.VITE_SUPABASE_URL || 'https://eafntyicpalnyzonnrgn.supabase.co'}/functions/v1/evolution-webhook`;

      const primaryUrl = resolveEndpointUrl(rawUrl, `/api/webhooks/${encodeURIComponent(sessionId)}`);
      let res = await fetch(primaryUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'Escolinha Webhook',
          url: webhookUrl,
          secret: 'escola-webhook-secret',
          events: ['message.received', 'message.sent'],
        }),
      });

      if (!res.ok && res.status === 404) {
        const fallbackUrl = resolveEndpointUrl(rawUrl, '/api/webhooks');
        const fallbackRes = await fetch(fallbackUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: 'Escolinha Webhook',
            url: webhookUrl,
            sessionId,
            secret: 'escola-webhook-secret',
            events: ['message.received', 'message.sent'],
          }),
        }).catch(() => null);

        if (fallbackRes && fallbackRes.ok) {
          res = fallbackRes;
        }
      }

      const text = await res.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }

      if (!res.ok) {
        throw new Error(parsed?.message || parsed?.error || `Erro ${res.status} ao configurar webhook no WA-AKG`);
      }

      return { success: true, details: parsed };
    }

    throw new Error(`Ação "${action}" não suportada`);
  } catch (err: any) {
    if (action === 'status') {
      return {
        status: { connected: false, jid: null },
        instance: { name: sessionId, status: 'disconnected', qrcode: null, paircode: null },
      };
    }
    throw err;
  }
}

/**
 * Fetches all chats from the local WA-AKG instance and syncs them to Supabase whatsapp_conversations.
 */
export async function syncWaAkgChats(schoolId: string): Promise<{ synced: number; error?: string }> {
  const stored = getStoredWaAkgConfig();

  const targetUrl = resolveEndpointUrl(stored.url, `/api/chat/${encodeURIComponent(stored.sessionId)}`);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (stored.apiKey) {
    headers['X-API-Key'] = stored.apiKey;
    headers['Authorization'] = `Bearer ${stored.apiKey}`;
  }

  try {
    const res = await fetch(targetUrl, { method: 'GET', headers });
    if (!res.ok) {
      if (res.status === 401) {
        return { synced: 0, error: 'Chave de API do WA-AKG necessária para sincronizar conversas.' };
      }
      return { synced: 0, error: `Erro ${res.status} ao consultar conversas no WA-AKG` };
    }

    const json = await res.json().catch(() => null);
    const chats = Array.isArray(json) ? json : json?.data || json?.chats || [];

    if (!Array.isArray(chats) || chats.length === 0) {
      return { synced: 0 };
    }

    let syncedCount = 0;
    const nowIso = new Date().toISOString();

    for (const chat of chats) {
      const rawJid = String(chat.jid || chat.id || '');
      if (!rawJid || rawJid.endsWith('@g.us')) continue; // Ignore groups

      const cleanPhone = rawJid.replace(/@.*/, '').replace(/\D/g, '');
      if (!cleanPhone) continue;

      const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      const contactName = chat.name || chat.pushName || formattedPhone;
      const lastMsgText = typeof chat.lastMessage === 'string'
        ? chat.lastMessage
        : chat.lastMessage?.text || chat.lastMessage?.message?.conversation || chat.lastMessage?.message?.extendedTextMessage?.text || '[Mensagem]';

      const lastMsgTime = chat.lastMessage?.timestamp
        ? new Date(Number(chat.lastMessage.timestamp) * 1000).toISOString()
        : nowIso;

      const { data: existing } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('school_id', schoolId)
        .or(`phone.eq.${cleanPhone},phone.eq.${formattedPhone}`)
        .maybeSingle();

      let convId = existing?.id;
      if (!convId) {
        const { data: created } = await supabase
          .from('whatsapp_conversations')
          .insert({
            school_id: schoolId,
            phone: formattedPhone,
            contact_name: contactName,
            ticket_status: 'open',
            unread_count: chat.unreadCount || 0,
            last_message: lastMsgText,
            last_message_at: lastMsgTime,
          })
          .select('id')
          .maybeSingle();
        convId = created?.id;
      } else {
        await supabase
          .from('whatsapp_conversations')
          .update({
            contact_name: contactName,
            last_message: lastMsgText,
            last_message_at: lastMsgTime,
          })
          .eq('id', convId);
      }

      if (convId) {
        syncedCount++;
        // Sync recent messages for this chat if available
        await syncWaAkgMessages(convId, formattedPhone).catch(() => null);
      }
    }

    return { synced: syncedCount };
  } catch (err: any) {
    return { synced: 0, error: err?.message || 'Falha de comunicação' };
  }
}

/**
 * Fetches recent messages for a specific chat from WA-AKG and inserts them into whatsapp_messages.
 */
export async function syncWaAkgMessages(conversationId: string, phone: string): Promise<number> {
  const stored = getStoredWaAkgConfig();

  const rawPhone = phone.replace(/\D/g, '');
  const jid = rawPhone.includes('@') ? rawPhone : `${rawPhone}@s.whatsapp.net`;
  const targetUrl = resolveEndpointUrl(
    stored.url,
    `/api/chat/${encodeURIComponent(stored.sessionId)}/${encodeURIComponent(jid)}`
  );

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (stored.apiKey) {
    headers['X-API-Key'] = stored.apiKey;
    headers['Authorization'] = `Bearer ${stored.apiKey}`;
  }

  try {
    const res = await fetch(targetUrl, { method: 'GET', headers });
    if (!res.ok) return 0;

    const json = await res.json().catch(() => null);
    const messages = Array.isArray(json) ? json : json?.data || json?.messages || [];
    if (!Array.isArray(messages) || messages.length === 0) return 0;

    let saved = 0;
    for (const msg of messages) {
      const extId = String(msg.id || msg.key?.id || '');
      if (!extId) continue;

      const isFromMe = Boolean(msg.fromMe ?? msg.key?.fromMe);
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.text ||
        msg.body ||
        '';

      const time = msg.timestamp
        ? new Date(Number(msg.timestamp) * 1000).toISOString()
        : msg.createdAt || new Date().toISOString();

      const { data: dup } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('external_id', extId)
        .maybeSingle();

      if (!dup) {
        await supabase.from('whatsapp_messages').insert({
          conversation_id: conversationId,
          body: text || '[Mensagem]',
          direction: isFromMe ? 'outgoing' : 'incoming',
          message_type: 'text',
          status: isFromMe ? 'delivered' : 'read',
          external_id: extId,
          created_at: time,
        });
        saved++;
      }
    }

    return saved;
  } catch {
    return 0;
  }
}
