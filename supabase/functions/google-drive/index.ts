import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
const CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') ?? '';
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const domains = new Set(['https://purpleedu.app', 'https://www.purpleedu.app', 'https://purpleedu.lovable.app', 'https://id-preview--70b11e52-1389-486c-8cc4-406f6ee79634.lovable.app', 'http://localhost:8080']);
const safeOrigin = (value: string) => domains.has(new URL(value).origin);
async function encryptionKey() {
  const secret = Deno.env.get('GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY');
  if (!secret) throw new Error('Chave de proteção ausente.');
  return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret)), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
const b64 = (data: Uint8Array) => btoa(String.fromCharCode(...data));
const unb64 = (data: string) => Uint8Array.from(atob(data), c => c.charCodeAt(0));
async function encrypt(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey(), new TextEncoder().encode(value));
  return `${b64(iv)}.${b64(new Uint8Array(ciphertext))}`;
}
async function decrypt(value: string) {
  const [iv, ciphertext] = value.split('.');
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await encryptionKey(), unb64(ciphertext)));
}
async function checked(response: Response) {
  if (!response.ok) {
    const details = await response.text();
    // Provider token responses can contain credentials: never log them.
    let message = 'O Google recusou a solicitação.';
    try { const data = JSON.parse(details); message = data.error?.message || data.error_description || message; } catch { /* no unsafe raw response */ }
    throw new Error(`[${response.status}] ${message}`);
  }
  return response.json();
}
async function manager(userId: string, schoolId: string) {
  const [director, superAdmin] = await Promise.all([
    admin.rpc('is_director', { _user_id: userId, _school_id: schoolId }),
    admin.rpc('is_super_admin', { _user_id: userId }),
  ]);
  return !!director.data || !!superAdmin.data;
}
async function accessToken(cfg: any) {
  const refreshToken = cfg.encrypted_refresh_token ? await decrypt(cfg.encrypted_refresh_token) : cfg.refresh_token;
  if (!refreshToken) throw new Error('Google Drive não conectado.');
  const data = await checked(await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  }));
  if (!cfg.encrypted_refresh_token) {
    const { error } = await admin.from('school_google_drive').update({ encrypted_refresh_token: await encrypt(refreshToken), refresh_token: null }).eq('school_id', cfg.school_id);
    if (error) throw new Error('Não foi possível proteger a conexão.');
  }
  return data.access_token as string;
}
async function folder(token: string, name: string, parent?: string) {
  // A school-specific app property prevents schools using one Google account from sharing roots.
  const result = await checked(await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', ...(parent ? { parents: [parent] } : {}) }),
  }));
  return result.id as string;
}
async function availableFolder(token: string, id: string | null) {
  if (!id) return false;
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=id,trashed`, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 404) return false;
  return !(await checked(response)).trashed;
}
const Schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('callback'), state: z.string().uuid(), code: z.string().min(1).max(4096) }),
  z.object({ action: z.literal('status') }),
  z.object({ action: z.literal('auth-url'), return_url: z.string().url() }),
  z.object({ action: z.literal('disconnect') }),
  z.object({ action: z.literal('upload-session'), turma_id: z.string().min(1).max(200), turma_nome: z.string().min(1).max(200), file_name: z.string().min(1).max(500), mime_type: z.string().regex(/^(image|video)\/[\w.+-]+$/), size: z.number().int().positive().safe(), origin: z.string().url() }),
]);
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (req.method !== 'POST') return json({ error: 'Método inválido.' }, 405);
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Dados inválidos.' }, 400);
    const body = parsed.data;
    if (body.action === 'callback') {
      // One-use random state binds consent to school and manager; no app session required here.
      const { data: state, error } = await admin.from('school_drive_oauth_states').delete().eq('id', body.state).gt('created_at', new Date(Date.now() - 900000).toISOString()).select('*').maybeSingle();
      if (error || !state || !state.redirect_uri || !safeOrigin(state.return_url)) return json({ error: 'Autorização expirada. Conecte novamente.' }, 400);
      const { data: profile } = await admin.from('profiles').select('school_id').eq('id', state.user_id).maybeSingle();
      if (profile?.school_id !== state.school_id || !(await manager(state.user_id, state.school_id))) return json({ error: 'Sem autorização para esta escola.' }, 403);
      const tokens = await checked(await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code: body.code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: state.redirect_uri, grant_type: 'authorization_code' }),
      }));
      if (!tokens.refresh_token) throw new Error('Autorize o acesso ao Drive ao conectar novamente.');
      const info = await checked(await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } }));
      const { data: school } = await admin.from('schools').select('name').eq('id', state.school_id).maybeSingle();
      const root = await folder(tokens.access_token, `Registros Escolares - ${school?.name ?? 'Escola'} (${state.school_id.slice(0, 8)})`);
      const { error: saveError } = await admin.from('school_google_drive').upsert({ school_id: state.school_id, connected_email: info.email, encrypted_refresh_token: await encrypt(tokens.refresh_token), refresh_token: null, root_folder_id: root, class_folders: {}, connected_by: state.user_id, updated_at: new Date().toISOString() });
      if (saveError) throw new Error('Não foi possível salvar a conexão.');
      return json({ return_url: state.return_url });
    }
    const bearer = req.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
    const { data: { user }, error: authError } = await admin.auth.getUser(bearer);
    if (authError || !user) return json({ error: 'Faça login para continuar.' }, 401);
    const { data: profile } = await admin.from('profiles').select('school_id').eq('id', user.id).maybeSingle();
    const schoolId = profile?.school_id;
    if (!schoolId) return json({ error: 'Escola não identificada.' }, 403);
    const { data: cfg, error: configError } = await admin.from('school_google_drive').select('*').eq('school_id', schoolId).maybeSingle();
    if (configError) throw new Error('Não foi possível consultar o Drive.');
    const canManage = await manager(user.id, schoolId);
    if (body.action === 'status') return json({ connected: !!(cfg?.encrypted_refresh_token || cfg?.refresh_token), email: cfg?.connected_email ?? null, folder_url: cfg?.root_folder_id ? `https://drive.google.com/drive/folders/${cfg.root_folder_id}` : null, can_manage: canManage });
    if (body.action === 'auth-url') {
      if (!canManage) return json({ error: 'Apenas a direção pode conectar o Google Drive.' }, 403);
      if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('Credenciais Google ausentes.');
      if (!safeOrigin(body.return_url)) return json({ error: 'Endereço de retorno não autorizado.' }, 400);
      const redirect = `${new URL(body.return_url).origin}/google-drive/callback`;
      const { data: state, error: stateError } = await admin.from('school_drive_oauth_states').insert({ school_id: schoolId, user_id: user.id, return_url: body.return_url, redirect_uri: redirect }).select('id').single();
      if (stateError) throw new Error('Não foi possível iniciar a autorização.');
      const params = new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: redirect, response_type: 'code', scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email', access_type: 'offline', prompt: 'consent', state: state.id });
      return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
    }
    if (body.action === 'disconnect') {
      if (!canManage) return json({ error: 'Apenas a direção pode desconectar.' }, 403);
      // Do not revoke an account-wide grant: other schools might use that Google account.
      const { error } = await admin.from('school_google_drive').delete().eq('school_id', schoolId);
      if (error) throw new Error('Falha ao desconectar.');
      return json({ ok: true });
    }
    const { data: canUpload } = await admin.rpc('can_manage_pedagogical_records', { _user_id: user.id, _school_id: schoolId });
    if (!canUpload) return json({ error: 'Sem permissão para enviar registros.' }, 403);
    if (!safeOrigin(body.origin)) return json({ error: 'Origem não autorizada.' }, 400);
    // Resolve class identity from school-owned persisted state, never from a client-provided name.
    const { data: classState } = await admin.from('app_state').select('value').eq('school_id', schoolId).eq('key', 'escolinha_turmas_pedagogico_v1').maybeSingle();
    const classes = Array.isArray(classState?.value) ? classState.value : [];
    const turma = classes.find((t: any) => t?.id === body.turma_id) as any;
    if (!turma?.nome) return json({ error: 'Salve a turma em Turmas & Horários antes de enviar registros.' }, 400);
    if (!cfg) return json({ error: 'Google Drive não conectado.' }, 409);
    const token = await accessToken(cfg);
    let root = cfg.root_folder_id;
    let folders = (cfg.class_folders ?? {}) as Record<string, string>;
    if (!(await availableFolder(token, root))) { root = await folder(token, `Registros Escolares (${schoolId.slice(0, 8)})`); folders = {}; }
    if (!root) throw new Error('Pasta da escola indisponível.');
    let turmaFolder = folders[body.turma_id];
    if (!(await availableFolder(token, turmaFolder))) { turmaFolder = await folder(token, `${turma.nome} (${body.turma_id.slice(0, 8)})`, root); folders[body.turma_id] = turmaFolder; }
    const { error } = await admin.from('school_google_drive').update({ root_folder_id: root, class_folders: folders, updated_at: new Date().toISOString() }).eq('school_id', schoolId);
    if (error) throw new Error('Não foi possível salvar as pastas.');
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,webViewLink', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Upload-Content-Type': body.mime_type, 'X-Upload-Content-Length': String(body.size), Origin: new URL(body.origin).origin },
      body: JSON.stringify({ name: body.file_name, parents: [turmaFolder], appProperties: { school_id: schoolId, turma_id: body.turma_id } }),
    });
    if (!response.ok) { await checked(response); }
    const uploadUrl = response.headers.get('Location');
    if (!uploadUrl?.startsWith('https://www.googleapis.com/')) throw new Error('Google não devolveu um endereço de envio válido.');
    return json({ upload_url: uploadUrl });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Falha na conexão com o Google.' }, 400);
  }
});
