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
 * Calls WA-AKG directly from the client (or via Vite proxy) with automatic fallback
 * to Supabase Edge Function if applicable.
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
    headers['Authorization'] = `Bearer ${apiKey}`;
    headers['x-api-key'] = apiKey;
  }

  let endpoint = '';
  let method = 'GET';
  let body: Record<string, unknown> | null = null;

  switch (action) {
    case 'status':
      endpoint = `/api/sessions/status?sessionId=${encodeURIComponent(sessionId)}`;
      method = 'GET';
      break;

    case 'connect':
      endpoint = '/api/sessions/start';
      method = 'POST';
      body = { sessionId };
      break;

    case 'disconnect':
      endpoint = '/api/sessions/stop';
      method = 'POST';
      body = { sessionId };
      break;

    case 'send-text': {
      endpoint = '/api/message/send-text';
      method = 'POST';
      const rawPhone = String(data.phone ?? '').replace(/\D/g, '');
      const formattedPhone = rawPhone.includes('@') ? rawPhone : `${rawPhone}@s.whatsapp.net`;
      body = {
        sessionId,
        to: formattedPhone,
        text: data.message ?? '',
      };
      break;
    }

    case 'send-media': {
      endpoint = '/api/message/send-media';
      method = 'POST';
      const rawPhone = String(data.phone ?? '').replace(/\D/g, '');
      const formattedPhone = rawPhone.includes('@') ? rawPhone : `${rawPhone}@s.whatsapp.net`;
      body = {
        sessionId,
        to: formattedPhone,
        type: String(data.mediaType || 'image').toUpperCase(),
        fileUrl: data.mediaUrl,
        caption: data.caption ?? '',
        fileName: data.fileName ?? 'arquivo',
      };
      break;
    }

    case 'configure-webhook': {
      endpoint = '/api/webhook';
      method = 'POST';
      const webhookUrl =
        (data.url as string) ||
        `${import.meta.env.VITE_SUPABASE_URL || 'https://eafntyicpalnyzonnrgn.supabase.co'}/functions/v1/evolution-webhook`;
      body = {
        sessionId,
        url: webhookUrl,
        events: ['message.received', 'messages', 'connection.update', 'status'],
      };
      break;
    }
  }

  const targetUrl = resolveEndpointUrl(rawUrl, endpoint);

  try {
    let res = await fetch(targetUrl, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    // Fallback QR code retrieval for WA-AKG connect
    if (!res.ok && action === 'connect') {
      const qrUrl = resolveEndpointUrl(rawUrl, `/api/sessions/qr?sessionId=${encodeURIComponent(sessionId)}`);
      const qrRes = await fetch(qrUrl, { method: 'GET', headers }).catch(() => null);
      if (qrRes && qrRes.ok) {
        res = qrRes;
      }
    }

    const text = await res.text();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { rawResponse: text };
    }

    if (!res.ok) {
      const errMsg = parsed?.error || parsed?.message || `Erro ${res.status} no servidor WA-AKG`;
      throw new Error(errMsg);
    }

    const isConnected = Boolean(
      parsed?.isConnected === true ||
      parsed?.status === 'connected' ||
      parsed?.status === 'CONNECTED' ||
      parsed?.data?.status === 'CONNECTED'
    );

    const qrCode =
      parsed?.qrcode ||
      parsed?.qr ||
      parsed?.data?.qr ||
      parsed?.data?.qrcode ||
      parsed?.qrCodeUrl ||
      null;

    const pairCode = parsed?.paircode || parsed?.pairingCode || null;

    return {
      success: true,
      status: {
        connected: isConnected,
        jid: parsed?.phone || parsed?.jid || parsed?.data?.jid || null,
      },
      instance: {
        name: sessionId,
        status: isConnected ? 'connected' : 'disconnected',
        qrcode: qrCode,
        paircode: pairCode,
        profileName: parsed?.profileName || parsed?.data?.profileName || 'WhatsApp WA-AKG',
        owner: parsed?.phone || parsed?.owner || '',
      },
      details: parsed,
    };
  } catch (err: any) {
    // If status check fails because server is offline, return disconnected rather than crashing the page
    if (action === 'status') {
      return {
        status: { connected: false, jid: null },
        instance: {
          name: sessionId,
          status: 'disconnected',
          qrcode: null,
          paircode: null,
          profileName: 'WA-AKG (Offline)',
        },
      };
    }

    // For explicit user actions (connect, send, configure), provide clear, actionable feedback
    const baseMsg = err?.message || 'Falha de comunicação';
    throw new Error(
      `Não foi possível comunicar com o WA-AKG em ${rawUrl}. Verifique se o container está em execução ("sudo docker compose -f docker-compose.wa-akg.yml up -d"). Detalhes: ${baseMsg}`
    );
  }
}

