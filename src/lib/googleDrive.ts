import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export async function driveAction<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('google-drive', { body });
  if (error) {
    let message = error.message;
    if (error instanceof FunctionsHttpError) {
      const details = await error.context.json().catch(() => null);
      if (typeof details?.error === 'string') message = details.error;
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}