import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Data local (Brasil, UTC-3)
function brDateParts() {
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const iso = now.toISOString().slice(0, 10);
  return {
    today: iso,
    hour: now.getUTCHours(),
    monthStart: iso.slice(0, 8) + '01',
    label: `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`,
  };
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

async function getReportData(schoolId: string, requestedDate?: string) {
  const { today: defaultToday, label: defaultLabel } = brDateParts();
  
  const today = requestedDate || defaultToday;
  const monthStart = `${today.slice(0, 8)}01`;
  
  let label = defaultLabel;
  if (requestedDate) {
    label = `${requestedDate.slice(8, 10)}/${requestedDate.slice(5, 7)}/${requestedDate.slice(0, 4)}`;
  }

  const { data: school } = await admin
    .from('schools').select('name').eq('id', schoolId).maybeSingle();

  const { data: billings } = await admin
    .from('billing')
    .select('amount, due_date, status, payment_date')
    .eq('school_id', schoolId);

  const rows = billings ?? [];
  const isPaid = (s: string | null) => s === 'paid' || s === 'pago';

  const sum = (arr: typeof rows) => arr.reduce((s, r) => s + Number(r.amount || 0), 0);

  const receivedToday = rows
    .filter((r) => isPaid(r.status) && r.payment_date?.startsWith(today))
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const receivedMonth = rows
    .filter((r) => {
      if (!isPaid(r.status) || !r.payment_date) return false;
      const pd = r.payment_date.slice(0, 10);
      return pd >= monthStart && pd <= today;
    })
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const dueToday = rows.filter((r) => !isPaid(r.status) && r.due_date === today);
  const overdue = rows.filter((r) => !isPaid(r.status) && r.due_date < today);
  const openMonth = rows.filter((r) => !isPaid(r.status) && r.due_date >= today && r.due_date <= today.slice(0, 8) + '31');

  return {
    schoolName: school?.name ?? '',
    label,
    today,
    receivedToday,
    dueToday: { sum: sum(dueToday), count: dueToday.length },
    overdue: { sum: sum(overdue), count: overdue.length },
    receivedMonth,
    openMonth: sum(openMonth)
  };
}

function formatReportText(data: Awaited<ReturnType<typeof getReportData>>, schoolId: string) {
  const baseUrl = Deno.env.get('APP_URL') || 'https://escolinha.gestaoja.com.br';
  return [
    `*📊 Relatório Financeiro — ${data.label}*`,
    data.schoolName ? `_${data.schoolName}_` : '',
    '',
    `✅ *Recebido hoje:* ${brl(data.receivedToday)}`,
    `📅 *Vencendo hoje:* ${brl(data.dueToday.sum)} (${data.dueToday.count} cobrança${data.dueToday.count === 1 ? '' : 's'})`,
    `⚠️ *Em atraso:* ${brl(data.overdue.sum)} (${data.overdue.count} cobrança${data.overdue.count === 1 ? '' : 's'})`,
    `📈 *Recebido no mês:* ${brl(data.receivedMonth)}`,
    `🕓 *A receber ainda no mês:* ${brl(data.openMonth)}`,
    '',
    `🔗 *Ver painel do dia:* ${baseUrl}/report/${schoolId}/${data.today}`
  ].filter(Boolean).join('\n');
}

async function getInstance(schoolId: string) {
  const { data } = await admin
    .from('evolution_instances')
    .select('instance_name, api_url, api_key, status')
    .eq('school_id', schoolId)
    .eq('status', 'connected')
    .limit(1)
    .maybeSingle();
  return data;
}

async function sendFor(schoolId: string, recipients: string[]) {
  if (!recipients.length) throw new Error('Nenhum número configurado para receber o relatório');

  const uazUrl = (Deno.env.get('UAZAPI_URL') ?? '').replace(/\/$/, '');
  const uazToken = Deno.env.get('UAZAPI_TOKEN') ?? '';

  let sender: (phone: string, message: string) => Promise<void>;

  if (uazUrl && uazToken) {
    sender = async (phone, message) => {
      const res = await fetch(`${uazUrl}/send/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: uazToken },
        body: JSON.stringify({ number: phone, text: message }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`[${res.status}] ${text}`);
    };
  } else {
    const instance = await getInstance(schoolId);
    if (!instance?.instance_name) throw new Error('Nenhuma instância WhatsApp conectada');
    const baseUrl = instance.api_url || EVOLUTION_API_URL;
    const apiKey = instance.api_key || EVOLUTION_API_KEY;
    if (!baseUrl || !apiKey) throw new Error('Credenciais da API de WhatsApp não configuradas');
    sender = async (phone, message) => {
      const res = await fetch(`${baseUrl}/message/sendText/${instance.instance_name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify({ number: phone, text: message }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`[${res.status}] ${text}`);
    };
  }

  const data = await getReportData(schoolId);
  const message = formatReportText(data, schoolId);

  const results: Array<{ phone: string; ok: boolean; error?: string }> = [];
  for (const raw of recipients) {
    const phone = normalizePhone(raw);
    try {
      await sender(phone, message);
      results.push({ phone, ok: true });
    } catch (e) {
      console.error('Falha ao enviar para', phone, e);
      results.push({ phone, ok: false, error: e instanceof Error ? e.message : 'erro' });
    }
  }

  await admin
    .from('daily_report_settings')
    .update({ last_sent_at: new Date().toISOString() })
    .eq('school_id', schoolId);

  return { message, results };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const payload = await req.json().catch(() => ({}));

    if (payload?.action === 'public-data') {
      if (!payload.schoolId || !payload.date) {
        throw new Error('Parâmetros inválidos');
      }
      const data = await getReportData(payload.schoolId, payload.date);
      // Ensure we only return data for the requested date, though getReportData always returns for 'today' (UTC-3).
      // If the dashboard is accessed on a different day, the logic would need to compute for THAT day.
      // Wait, let's fix getReportData to accept a specific date!
      // But for now, we'll just return it. I'll modify getReportData above if needed later.
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (payload?.action === 'preview') {
      const authHeader = req.headers.get('Authorization') ?? '';
      const token = authHeader.replace('Bearer ', '');
      const { data: userData, error: userErr } = await admin.auth.getUser(token);
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: 'Não autenticado' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: profile } = await admin
        .from('profiles').select('school_id').eq('id', userData.user.id).maybeSingle();
      if (!profile?.school_id) throw new Error('Escola não identificada');

      const data = await getReportData(profile.school_id);
      const message = formatReportText(data, profile.school_id);

      return new Response(JSON.stringify({ message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Envio manual: exige usuário autenticado, usa a escola do perfil
    if (payload?.action === 'send-now') {
      const authHeader = req.headers.get('Authorization') ?? '';
      const token = authHeader.replace('Bearer ', '');
      const { data: userData, error: userErr } = await admin.auth.getUser(token);
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: 'Não autenticado' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: profile } = await admin
        .from('profiles').select('school_id').eq('id', userData.user.id).maybeSingle();
      if (!profile?.school_id) throw new Error('Escola não identificada');

      let recipients: string[] = Array.isArray(payload?.recipients)
        ? payload.recipients.map((r: unknown) => String(r)).filter(Boolean)
        : [];

      if (!recipients.length) {
        const { data: settings } = await admin
          .from('daily_report_settings')
          .select('recipients')
          .eq('school_id', profile.school_id)
          .maybeSingle();
        recipients = settings?.recipients ?? [];
      }

      const result = await sendFor(profile.school_id, recipients);
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execução agendada (cron): envia para escolas cujo horário é a hora atual
    const { hour } = brDateParts();
    const { data: all } = await admin
      .from('daily_report_settings')
      .select('school_id, recipients, send_hour')
      .eq('is_active', true)
      .eq('send_hour', hour);

    const summary: Array<Record<string, unknown>> = [];
    for (const s of all ?? []) {
      try {
        const r = await sendFor(s.school_id, s.recipients ?? []);
        summary.push({ school_id: s.school_id, sent: r.results.filter((x) => x.ok).length });
      } catch (e) {
        summary.push({ school_id: s.school_id, error: e instanceof Error ? e.message : 'erro' });
      }
    }

    return new Response(JSON.stringify({ hour, processed: summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('daily-financial-report error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
