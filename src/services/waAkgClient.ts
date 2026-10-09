import { supabase } from '@/integrations/supabase/client';

export const WA_AKG_DEFAULT_API_KEY = 'wag_vJGLccAD1L4JciTdBeHTxqDMx5ywrkxr';
export const WA_AKG_DEFAULT_SESSION = 'cd4iyk';

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
  let apiKey =
    (typeof window !== 'undefined' ? localStorage.getItem('wa_akg_api_key') : null) ||
    '';
  if (!apiKey || apiKey === 'escola-secret-token') {
    apiKey = WA_AKG_DEFAULT_API_KEY;
  }

  let sessionId =
    (typeof window !== 'undefined' ? localStorage.getItem('wa_akg_session_id') : null) ||
    '';
  if (!sessionId) {
    sessionId = WA_AKG_DEFAULT_SESSION;
  }

  return { url: url.trim(), apiKey: apiKey.trim(), sessionId: sessionId.trim() };
}

export interface WaAkgResolvedSession {
  sessionId: string; // The Baileys sessionId string key (e.g. "cd4iyk")
  id: string;        // The internal DB CUID (e.g. "cmv08svgi0003og0g18iyejj8")
  name: string;      // The human friendly name (e.g. "interagir")
  status: string;
}

let cachedSession: WaAkgResolvedSession | null = null;

export async function resolveWaAkgSession(
  baseUrl: string,
  headers: Record<string, string>,
  preferredIdOrName?: string
): Promise<WaAkgResolvedSession> {
  const target = preferredIdOrName || getStoredWaAkgConfig().sessionId;

  if (
    cachedSession &&
    (cachedSession.sessionId === target ||
      cachedSession.id === target ||
      cachedSession.name?.toLowerCase() === target?.toLowerCase())
  ) {
    return cachedSession;
  }

  try {
    const listUrl = resolveEndpointUrl(baseUrl, '/api/sessions');
    const res = await fetch(listUrl, { method: 'GET', headers });
    if (res.ok) {
      const json = await res.json().catch(() => null);
      const list: any[] = Array.isArray(json) ? json : json?.data || json?.sessions || [];
      if (Array.isArray(list) && list.length > 0) {
        const found =
          list.find(
            (s) =>
              s.sessionId === target ||
              s.id === target ||
              s.name?.toLowerCase() === target?.toLowerCase()
          ) || list[0];

        if (found) {
          cachedSession = {
            sessionId: found.sessionId || found.id,
            id: found.id || found.sessionId,
            name: found.name || 'interagir',
            status: found.status || 'CONNECTED',
          };
          if (typeof window !== 'undefined' && found.sessionId) {
            localStorage.setItem('wa_akg_session_id', found.sessionId);
          }
          return cachedSession;
        }
      }
    }
  } catch (e) {
    console.warn('[WA-AKG] Error resolving session from /api/sessions:', e);
  }

  return {
    sessionId: target || WA_AKG_DEFAULT_SESSION,
    id: target || WA_AKG_DEFAULT_SESSION,
    name: target || 'interagir',
    status: 'UNKNOWN',
  };
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
        const resolved = await resolveWaAkgSession(rawUrl, headers, sessionId);
        const isConnected = Boolean(
          resolved.status === 'CONNECTED' ||
          resolved.status === 'connected' ||
          resolved.status === 'ONLINE'
        );

        return {
          success: true,
          status: {
            connected: isConnected,
            jid: null,
          },
          instance: {
            name: resolved.name || sessionId,
            status: isConnected ? 'connected' : 'disconnected',
            qrcode: null,
            paircode: null,
            profileName: resolved.name || 'WA-AKG',
          },
          details: resolved,
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
      const resolved = await resolveWaAkgSession(rawUrl, headers, sessionId);
      const targetSessionId = resolved.sessionId || sessionId;

      // 1. Ensure session is created if needed
      const createUrl = resolveEndpointUrl(rawUrl, '/api/sessions');
      await fetch(createUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: sessionId }),
      }).catch(() => null);

      // 2. Fetch QR Code from /api/sessions/{targetSessionId}/qr
      const qrUrl = resolveEndpointUrl(rawUrl, `/api/sessions/${encodeURIComponent(targetSessionId)}/qr`);
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
      const resolved = await resolveWaAkgSession(rawUrl, headers, sessionId);
      const targetSessionId = resolved.sessionId || sessionId;
      const deleteUrl = resolveEndpointUrl(rawUrl, `/api/sessions/${encodeURIComponent(targetSessionId)}`);
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
      const resolved = await resolveWaAkgSession(rawUrl, headers, sessionId);
      const targetSessionId = resolved.sessionId || sessionId;

      const rawPhone = String(data.phone ?? '').trim();
      const cleanPhone = rawPhone.replace(/\D/g, '');
      const formattedPhone = rawPhone.includes('@')
        ? rawPhone
        : (cleanPhone.startsWith('55') ? `${cleanPhone}@s.whatsapp.net` : `55${cleanPhone}@s.whatsapp.net`);

      const sendUrl = resolveEndpointUrl(
        rawUrl,
        `/api/messages/${encodeURIComponent(targetSessionId)}/${encodeURIComponent(formattedPhone)}/send`
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
      const resolved = await resolveWaAkgSession(rawUrl, headers, sessionId);
      const targetSessionId = resolved.sessionId || sessionId;

      const rawPhone = String(data.phone ?? '').trim();
      const cleanPhone = rawPhone.replace(/\D/g, '');
      const formattedPhone = rawPhone.includes('@')
        ? rawPhone
        : (cleanPhone.startsWith('55') ? `${cleanPhone}@s.whatsapp.net` : `55${cleanPhone}@s.whatsapp.net`);

      const sendUrl = resolveEndpointUrl(
        rawUrl,
        `/api/messages/${encodeURIComponent(targetSessionId)}/${encodeURIComponent(formattedPhone)}/send`
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

      const resolved = await resolveWaAkgSession(rawUrl, headers, sessionId);
      const candidateIds = [resolved.sessionId, resolved.id, sessionId].filter(Boolean) as string[];

      let res: Response | null = null;
      for (const targetId of candidateIds) {
        const targetUrl = resolveEndpointUrl(rawUrl, `/api/webhooks/${encodeURIComponent(targetId)}`);
        const attempt = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: 'Escolinha Webhook',
            url: webhookUrl,
            secret: 'escola-webhook-secret',
            events: ['message.received', 'message.sent', 'message.status'],
          }),
        }).catch(() => null);

        if (attempt && attempt.ok) {
          res = attempt;
          break;
        } else if (attempt && !res) {
          res = attempt;
        }
      }

      if (!res || !res.ok) {
        const fallbackUrl = resolveEndpointUrl(rawUrl, '/api/webhooks');
        const fallbackRes = await fetch(fallbackUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: 'Escolinha Webhook',
            url: webhookUrl,
            sessionId: resolved.sessionId || sessionId,
            secret: 'escola-webhook-secret',
            events: ['message.received', 'message.sent', 'message.status'],
          }),
        }).catch(() => null);

        if (fallbackRes && fallbackRes.ok) {
          res = fallbackRes;
        }
      }

      if (!res) {
        throw new Error('Não foi possível conectar ao servidor WA-AKG para cadastrar webhook.');
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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (stored.apiKey) {
    headers['X-API-Key'] = stored.apiKey;
    headers['Authorization'] = `Bearer ${stored.apiKey}`;
  }

  // 1. Resolve effective session string or id from /api/sessions
  const session = await resolveWaAkgSession(stored.url, headers, stored.sessionId);
  const targetUrl = resolveEndpointUrl(stored.url, `/api/chat/${encodeURIComponent(session.sessionId)}`);

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
        await syncWaAkgMessages(convId, rawJid || formattedPhone).catch(() => null);
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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (stored.apiKey) {
    headers['X-API-Key'] = stored.apiKey;
    headers['Authorization'] = `Bearer ${stored.apiKey}`;
  }

  const session = await resolveWaAkgSession(stored.url, headers, stored.sessionId);

  let jid = phone.trim();
  if (!jid.includes('@')) {
    const clean = jid.replace(/\D/g, '');
    const with55 = clean.startsWith('55') ? clean : `55${clean}`;
    jid = `${with55}@s.whatsapp.net`;
  }

  const targetUrl = resolveEndpointUrl(
    stored.url,
    `/api/chat/${encodeURIComponent(session.sessionId)}/${encodeURIComponent(jid)}`
  );

  try {
    const res = await fetch(targetUrl, { method: 'GET', headers });
    if (!res.ok) return 0;

    const json = await res.json().catch(() => null);
    const messages = Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json)
      ? json
      : json?.data?.messages || json?.messages || [];
    if (!Array.isArray(messages) || messages.length === 0) return 0;

    let saved = 0;
    for (const msg of messages) {
      const extId = String(msg.id || msg.keyId || msg.key?.id || '');
      if (!extId) continue;

      const isFromMe = Boolean(msg.fromMe ?? msg.key?.fromMe);
      const text =
        msg.content ||
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.text ||
        msg.body ||
        '';

      const time = msg.timestamp
        ? new Date(msg.timestamp).toISOString()
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
