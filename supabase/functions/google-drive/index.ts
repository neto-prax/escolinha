import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-drive`;
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(data: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(CLIENT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
}

async function signState(payload: Record<string, unknown>) {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${body}.${await hmac(body)}`;
}

async function verifyState(state: string) {
  const [body, sig] = state.split('.');
  if (!body || !sig || (await hmac(body)) !== sig) return null;
  const padded = body.replace(/-/g, '+').replace(/_/g, '/');
  const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))));
  if (Date.now() - payload.t > 15 * 60 * 1000) return null;
  return payload as { s: string; u: string; r: string; t: number };
}

async function getAccessToken(refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`google_token_failed: ${data.error_description || data.error}`);
  return data.access_token as string;
}

async function driveFolder(token: string, name: string, parent?: string) {
  const safe = name.replace(/'/g, "\\'");
  const q = `mimeType='${FOLDER_MIME}' and name='${safe}' and trashed=false${parent ? ` and '${parent}' in parents` : ''}`;
  const found = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  if (found.files?.[0]?.id) return found.files[0].id as string;
  const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, ...(parent ? { parents: [parent] } : {}) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`drive_folder_failed: ${JSON.stringify(data.error)}`);
  return data.id as string;
}

async function folderExists(token: string, id: string) {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,trashed`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return false;
  const d = await r.json();
  return !d.trashed;
}

async function handleCallback(url: URL) {
  const code = url.searchParams.get('code');
  const state = await verifyState(url.searchParams.get('state') ?? '');
  const fallback = 'https://purpleedu.app/app/configuracoes?tab=pedagogico';
  if (!state) return Response.redirect(`${fallback}&drive=error`, 302);
  const back = (status: string) => {
    const target = new URL(state.r);
    target.searchParams.set('drive', status);
    return Response.redirect(target.toString(), 302);
  };
  if (!code) return back('cancelled');

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: REDIRECT_URI, grant_type: 'authorization_code' }),
  });
  const tokens = await tokenRes.json();
  if (!tokenRes.ok || !tokens.refresh_token) {
    console.error('oauth exchange failed', tokens.error, tokens.error_description);
    return back('error');
  }
  const info = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } }).then((r) => r.json());
  const { data: school } = await admin.from('schools').select('name').eq('id', state.s).maybeSingle();
  const rootId = await driveFolder(tokens.access_token, `Registros Escolares - ${school?.name ?? 'Escola'}`);

  await admin.from('school_google_drive').upsert({
    school_id: state.s,
    connected_email: info.email ?? null,
    refresh_token: tokens.refresh_token,
    root_folder_id: rootId,
    class_folders: {},
    connected_by: state.u,
    updated_at: new Date().toISOString(),
  });
  return back('connected');
}

const ActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('status') }),
  z.object({ action: z.literal('auth-url'), return_url: z.string().url() }),
  z.object({ action: z.literal('disconnect') }),
  z.object({
    action: z.literal('upload-session'),
    turma_id: z.string().min(1).max(200),
    turma_nome: z.string().min(1).max(200),
    file_name: z.string().min(1).max(500),
    mime_type: z.string().min(1).max(200),
    size: z.number().int().nonnegative(),
    origin: z.string().url(),
  }),
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = new URL(req.url);

  try {
    if (req.method === 'GET' && (url.searchParams.has('code') || url.searchParams.has('state') || url.searchParams.has('error'))) {
      return await handleCallback(url);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const { data: userData, error: userErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401);
    const userId = userData.user.id;
    const { data: profile } = await admin.from('profiles').select('school_id').eq('id', userId).maybeSingle();
    const schoolId = profile?.school_id;
    if (!schoolId) return json({ error: 'school_not_found' }, 400);

    const parsed = ActionSchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const body = parsed.data;

    const { data: cfg } = await admin.from('school_google_drive').select('*').eq('school_id', schoolId).maybeSingle();

    if (body.action === 'status') {
      return json({
        connected: !!cfg?.refresh_token,
        email: cfg?.connected_email ?? null,
        folder_url: cfg?.root_folder_id ? `https://drive.google.com/drive/folders/${cfg.root_folder_id}` : null,
      });
    }

    const isManager = async () => {
      const [{ data: dir }, { data: sa }] = await Promise.all([
        admin.rpc('is_director', { _user_id: userId, _school_id: schoolId }),
        admin.rpc('is_super_admin', { _user_id: userId }),
      ]);
      return !!dir || !!sa;
    };

    if (body.action === 'auth-url') {
      if (!(await isManager())) return json({ error: 'Apenas a direção pode conectar o Google Drive.' }, 403);
      const state = await signState({ s: schoolId, u: userId, r: body.return_url, t: Date.now() });
      const params = new URLSearchParams({
        client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, response_type: 'code', scope: SCOPES,
        access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state,
      });
      return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
    }

    if (body.action === 'disconnect') {
      if (!(await isManager())) return json({ error: 'Apenas a direção pode desconectar.' }, 403);
      if (cfg?.refresh_token) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${cfg.refresh_token}`, { method: 'POST' }).catch(() => null);
      }
      await admin.from('school_google_drive').delete().eq('school_id', schoolId);
      return json({ ok: true });
    }

    // upload-session
    if (!cfg?.refresh_token) return json({ error: 'Google Drive não conectado pela escola.' }, 409);
    const token = await getAccessToken(cfg.refresh_token);
    let rootId = cfg.root_folder_id as string | null;
    if (!rootId || !(await folderExists(token, rootId))) {
      rootId = await driveFolder(token, 'Registros Escolares');
      cfg.class_folders = {};
    }
    const folders = (cfg.class_folders ?? {}) as Record<string, string>;
    let classFolder = folders[body.turma_id];
    if (!classFolder || !(await folderExists(token, classFolder))) {
      classFolder = await driveFolder(token, body.turma_nome, rootId);
      folders[body.turma_id] = classFolder;
      await admin.from('school_google_drive').update({ root_folder_id: rootId, class_folders: folders, updated_at: new Date().toISOString() }).eq('school_id', schoolId);
    }

    const init = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,webViewLink,thumbnailLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': body.mime_type,
        'X-Upload-Content-Length': String(body.size),
        Origin: body.origin,
      },
      body: JSON.stringify({ name: body.file_name, parents: [classFolder] }),
    });
    if (!init.ok) {
      const details = await init.text();
      console.error('resumable init failed', init.status, details);
      return json({ error: 'drive_upload_init_failed', details }, init.status);
    }
    return json({ upload_url: init.headers.get('Location'), folder_id: classFolder });
  } catch (e) {
    console.error('google-drive error', e);
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});
