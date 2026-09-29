import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.25.76';

const UAZAPI_URL = (Deno.env.get('UAZAPI_URL') ?? '').replace(/\/$/, '');
const UAZAPI_TOKEN = Deno.env.get('UAZAPI_TOKEN') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!UAZAPI_URL || !UAZAPI_TOKEN) throw new Error('Credenciais da Uazapi não configuradas');

    const parsed = z.object({
      action: z.enum([
        'status',
        'configure-webhook',
        'set-webhook',
        'get-webhook',
        'connect',
        'disconnect',
        'send-text',
        'send-media',
      ]),
      data: z.record(z.unknown()).optional().default({}),
    }).safeParse(await req.json());

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, data } = parsed.data;

    let endpoint = '';
    let method = 'POST';
    let body: Record<string, unknown> | null = null;

    switch (action) {
      case 'status':
        endpoint = '/instance/status';
        method = 'GET';
        break;

      case 'configure-webhook':
      case 'set-webhook':
        endpoint = '/webhook';
        method = 'POST';
        body = {
          enabled: true,
          url: (data.url as string) || 'https://eafntyicpalnyzonnrgn.supabase.co/functions/v1/evolution-webhook',
          events: (data.events as string[]) || ['messages', 'messages_update', 'connection'],
          excludeMessages: ['wasSentByApi'],
        };
        break;

      case 'get-webhook':
        endpoint = '/webhook';
        method = 'GET';
        break;

      case 'connect':
        endpoint = '/instance/connect';
        body = data.phone ? { phone: String(data.phone).replace(/\D/g, '') } : {};
        break;

      case 'disconnect':
        endpoint = '/instance/disconnect';
        body = {};
        break;

      case 'send-text':
        endpoint = '/send/text';
        body = {
          number: String(data.phone ?? '').replace(/\D/g, ''),
          text: data.message,
        };
        break;

      case 'send-media':
        endpoint = '/send/media';
        body = {
          number: String(data.phone ?? '').replace(/\D/g, ''),
          type: data.mediaType ?? 'image',
          file: data.mediaUrl,
          text: data.caption ?? '',
          docName: data.fileName ?? '',
        };
        break;

    }

    const res = await fetch(`${UAZAPI_URL}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json', token: UAZAPI_TOKEN },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const text = await res.text();
    let result: unknown;
    try {
      result = JSON.parse(text);
    } catch {
      result = { rawResponse: text };
    }

    if (!res.ok) {
      console.error(`Uazapi erro [${res.status}]:`, text);
      return new Response(
        JSON.stringify({ error: 'Falha na requisição à Uazapi', status: res.status, details: result }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Nunca expor o token da instância ao frontend
    if (result && typeof result === 'object') {
      const r = result as { instance?: Record<string, unknown> };
      if (r.instance?.token) delete r.instance.token;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('uazapi error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
