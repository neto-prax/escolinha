import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.25.76';

/**
 * Edge Function to integrate with the WA-AKG WhatsApp Gateway
 * WA-AKG API Reference: https://github.com/mrifqidaffaaditya/WA-AKG
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json().catch(() => ({}));

    const schema = z.object({
      action: z.enum([
        'status',
        'connect',
        'disconnect',
        'send-text',
        'send-media',
        'configure-webhook',
      ]),
      data: z.record(z.unknown()).optional().default({}),
    });

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, data } = parsed.data;

    // Configuration priority: passed from frontend/school settings OR environment variables
    const rawUrl = (
      (typeof data.waAkgUrl === 'string' && data.waAkgUrl.trim()) ||
      Deno.env.get('WA_AKG_URL') ||
      'http://localhost:3000'
    ).trim();

    const baseUrl = rawUrl.replace(/\/$/, '');
    const apiKey = (
      (typeof data.waAkgApiKey === 'string' && data.waAkgApiKey.trim()) ||
      Deno.env.get('WA_AKG_API_KEY') ||
      ''
    ).trim();

    const sessionId = (
      (typeof data.sessionId === 'string' && data.sessionId.trim()) ||
      Deno.env.get('WA_AKG_SESSION_ID') ||
      'default'
    ).trim();

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
      case 'status': {
        endpoint = `/api/sessions/status?sessionId=${encodeURIComponent(sessionId)}`;
        method = 'GET';
        break;
      }

      case 'connect': {
        // In WA-AKG, starting a session or fetching QR
        endpoint = '/api/sessions/start';
        method = 'POST';
        body = { sessionId };
        break;
      }

      case 'disconnect': {
        endpoint = '/api/sessions/stop';
        method = 'POST';
        body = { sessionId };
        break;
      }

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
        const mediaType = String(data.mediaType || 'image').toUpperCase();

        body = {
          sessionId,
          to: formattedPhone,
          type: mediaType, // IMAGE, VIDEO, AUDIO, DOCUMENT
          fileUrl: data.mediaUrl,
          caption: data.caption ?? '',
          fileName: data.fileName ?? 'arquivo',
        };
        break;
      }

      case 'configure-webhook': {
        endpoint = '/api/webhook';
        method = 'POST';
        const targetUrl =
          (data.url as string) ||
          `${Deno.env.get('SUPABASE_URL') || 'https://eafntyicpalnyzonnrgn.supabase.co'}/functions/v1/evolution-webhook`;

        body = {
          sessionId,
          url: targetUrl,
          events: ['message.received', 'messages', 'connection.update', 'status'],
        };
        break;
      }
    }

    let targetUrl = `${baseUrl}${endpoint}`;
    // If testing connect and endpoint returns 404 on start, fallback to GET qr
    let fetchRes: Response;
    try {
      fetchRes = await fetch(targetUrl, {
        method,
        headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      // Fallback for QR Code retrieval if POST /api/sessions/start returns 404/405
      if (!fetchRes.ok && action === 'connect') {
        const qrEndpoint = `/api/sessions/qr?sessionId=${encodeURIComponent(sessionId)}`;
        const qrRes = await fetch(`${baseUrl}${qrEndpoint}`, { method: 'GET', headers });
        if (qrRes.ok) {
          fetchRes = qrRes;
        }
      }
    } catch (networkError) {
      console.error('WA-AKG Network Error:', networkError);
      return new Response(
        JSON.stringify({
          error: `Não foi possível conectar ao servidor WA-AKG em ${baseUrl}. Verifique se a aplicação está em execução.`,
          details: networkError instanceof Error ? networkError.message : String(networkError),
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const text = await fetchRes.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      result = { rawResponse: text };
    }

    if (!fetchRes.ok) {
      console.warn(`WA-AKG retornou erro [${fetchRes.status}]:`, text);
      return new Response(
        JSON.stringify({
          error: result?.error || result?.message || `Erro ${fetchRes.status} no WA-AKG`,
          status: fetchRes.status,
          details: result,
        }),
        { status: fetchRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Standardize status format for frontend compatibility
    // WA-AKG may return { success: true, isConnected: true } or { status: 'CONNECTED' } or { qr: '...' }
    const isConnected =
      result?.isConnected === true ||
      result?.status === 'connected' ||
      result?.status === 'CONNECTED' ||
      result?.data?.status === 'CONNECTED';

    const qrCode =
      result?.qrcode ||
      result?.qr ||
      result?.data?.qr ||
      result?.data?.qrcode ||
      (result?.qrCodeUrl ?? null);

    const pairCode = result?.paircode || result?.pairingCode || null;

    const standardizedResponse = {
      ...result,
      status: {
        connected: isConnected,
        jid: result?.phone || result?.jid || result?.data?.jid || null,
      },
      instance: {
        name: sessionId,
        status: isConnected ? 'connected' : 'disconnected',
        qrcode: qrCode,
        paircode: pairCode,
      },
    };

    return new Response(JSON.stringify(standardizedResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    console.error('wa-akg handler error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

