import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
    const EVOLUTION_INSTANCE_NAME = Deno.env.get('EVOLUTION_INSTANCE_NAME');

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      throw new Error('Evolution API credentials not configured');
    }

    const { action, data } = await req.json();

    let endpoint = '';
    let method = 'POST';
    let body: any = null;

    switch (action) {
      case 'create-instance':
        endpoint = `/instance/create`;
        body = {
          instanceName: data.instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        };
        break;

      case 'delete-instance':
        endpoint = `/instance/delete/${data.instanceName}`;
        method = 'DELETE';
        break;

      case 'get-qrcode':
        endpoint = `/instance/connect/${data.instanceName}`;
        method = 'GET';
        break;

      case 'get-instance-status':
        endpoint = `/instance/connectionState/${data.instanceName}`;
        method = 'GET';
        break;

      case 'send-text':
        endpoint = `/message/sendText/${data.instanceName || EVOLUTION_INSTANCE_NAME}`;
        body = {
          number: data.phone,
          text: data.message,
        };
        break;

      case 'send-media':
        endpoint = `/message/sendMedia/${data.instanceName || EVOLUTION_INSTANCE_NAME}`;
        body = {
          number: data.phone,
          mediatype: data.mediaType,
          media: data.mediaUrl,
          caption: data.caption || '',
          fileName: data.fileName || '',
        };
        break;

      case 'send-audio':
        endpoint = `/message/sendWhatsAppAudio/${data.instanceName || EVOLUTION_INSTANCE_NAME}`;
        body = {
          number: data.phone,
          audio: data.audioUrl,
        };
        break;

      case 'fetch-messages':
        endpoint = `/chat/findMessages/${data.instanceName || EVOLUTION_INSTANCE_NAME}`;
        body = {
          where: {
            key: {
              remoteJid: `${data.phone}@s.whatsapp.net`,
            },
          },
          limit: data.limit || 50,
        };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('Calling Evolution API:', { url: `${EVOLUTION_API_URL}${endpoint}`, method, body });

    const response = await fetch(`${EVOLUTION_API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    const responseText = await response.text();
    console.log('Evolution API response:', { status: response.status, body: responseText });

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { rawResponse: responseText };
    }

    if (!response.ok) {
      const errorDetail = result.message || result.error || result.rawResponse || 'Evolution API request failed';
      console.error('Evolution API error response:', result);
      throw new Error(errorDetail);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Evolution API error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
