import { supabase } from '@/integrations/supabase/client';

let schoolIdPromise: Promise<string | null> | null = null;
let cachedUserId: string | null = null;

/** Resolve (and cache) the school of the logged user. */
export function getSchoolId(): Promise<string | null> {
  return (async () => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id ?? null;
    if (cachedUserId !== userId) {
      cachedUserId = userId;
      schoolIdPromise = null;
    }
    if (!userId) return null;
    if (!schoolIdPromise) {
      schoolIdPromise = (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', userId)
        .maybeSingle();
      return data?.school_id ?? null;
      })();
    }
    return schoolIdPromise;
  })();
}

export function resetSchoolIdCache() {
  schoolIdPromise = null;
  cachedUserId = null;
}

export function getSchoolStorageKey(key: string, schoolId: string): string {
  return `s_${schoolId}_${key}`;
}

/** Read a persisted value from the cloud. Returns undefined when there is no row. */
export async function loadCloudState<T>(key: string, requestedSchoolId?: string): Promise<T | undefined> {
  const schoolId = requestedSchoolId ?? await getSchoolId();
  if (!schoolId) return undefined;
  const { data, error } = await supabase
    .from('app_state')
    .select('value')
    .eq('school_id', schoolId)
    .eq('key', key)
    .maybeSingle();
  if (error) {
    console.warn(`[cloudState] erro ao ler "${key}":`, error.message);
    return undefined;
  }
  if (!data) return undefined;
  return (data.value as { data?: T })?.data as T | undefined;
}

/** Persist a value in the cloud (one row per school + key). */
export async function saveCloudState<T>(key: string, value: T, requestedSchoolId?: string): Promise<void> {
  const schoolId = requestedSchoolId ?? await getSchoolId();
  if (!schoolId) return;
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('app_state')
    .upsert(
      {
        school_id: schoolId,
        key,
        value: { data: value } as never,
        updated_by: auth?.user?.id ?? null,
      },
      { onConflict: 'school_id,key' },
    );
  if (error) console.warn(`[cloudState] erro ao salvar "${key}":`, error.message);
}

export async function removeCloudState(key: string): Promise<void> {
  const schoolId = await getSchoolId();
  if (!schoolId) return;
  await supabase.from('app_state').delete().eq('school_id', schoolId).eq('key', key);
}

export async function removeAllCloudState(keys: string[]): Promise<void> {
  const schoolId = await getSchoolId();
  if (!schoolId) return;
  await supabase.from('app_state').delete().eq('school_id', schoolId).in('key', keys);
}

export async function listCloudStateKeys(): Promise<string[]> {
  const schoolId = await getSchoolId();
  if (!schoolId) return [];
  const { data } = await supabase.from('app_state').select('key').eq('school_id', schoolId);
  return (data ?? []).map((r) => r.key);
}
