import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSchoolStorageKey, loadCloudState, saveCloudState } from '@/lib/cloudState';

/** Estado persistente e isolado para a escola autenticada. */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const { profile, school } = useAuth();
  const schoolId = profile?.school_id ?? school?.id ?? null;
  const scopedKey = schoolId ? getSchoolStorageKey(key, schoolId) : key;
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window !== 'undefined') {
        const cached = window.localStorage.getItem(scopedKey);
        if (cached !== null) {
          return JSON.parse(cached) as T;
        }
        if (schoolId && scopedKey !== key) {
          const unscopedCached = window.localStorage.getItem(key);
          if (unscopedCached !== null) {
            return JSON.parse(unscopedCached) as T;
          }
        }
      }
    } catch (e) {
      console.warn(`Erro ao ler cache inicial "${scopedKey}":`, e);
    }
    return initialValue;
  });
  const [valueScope, setValueScope] = useState<string | null>(() => scopedKey);
  const latestValue = useRef(storedValue);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeScope = useRef<string | null>(scopedKey);

  latestValue.current = storedValue;

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(latestValue.current) : value;
      latestValue.current = valueToStore;
      setStoredValue(valueToStore);
      setValueScope(scopedKey);
      
      // Salva tanto na chave isolada por escola quanto na chave padrão
      window.localStorage.setItem(scopedKey, JSON.stringify(valueToStore));
      if (scopedKey !== key) {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
      window.localStorage.setItem(`${scopedKey}_updated_at`, String(Date.now()));

      window.dispatchEvent(new CustomEvent('local-storage-sync', {
        detail: { key: scopedKey, newValue: valueToStore },
      }));

      if (schoolId) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        const targetSchoolId = schoolId;
        const targetScope = scopedKey;
        saveTimer.current = setTimeout(() => {
          saveTimer.current = null;
          if (activeScope.current === targetScope) {
            void saveCloudState(key, valueToStore, targetSchoolId);
          }
        }, 150);
      }
    } catch (error) {
      console.warn(`Erro ao salvar "${scopedKey}":`, error);
    }
  }, [key, scopedKey, schoolId]);

  useEffect(() => {
    activeScope.current = scopedKey;

    let cancelled = false;

    const hydrate = async () => {
      let localValue = initialValue;
      let hasLocal = false;
      try {
        const cached = window.localStorage.getItem(scopedKey);
        if (cached !== null) {
          localValue = JSON.parse(cached) as T;
          hasLocal = true;
        } else if (schoolId && scopedKey !== key) {
          // Fallback para chave sem prefixo de escola
          const unscopedCached = window.localStorage.getItem(key);
          if (unscopedCached !== null) {
            localValue = JSON.parse(unscopedCached) as T;
            hasLocal = true;
            window.localStorage.setItem(scopedKey, unscopedCached);
          }
        }
      } catch (error) {
        console.warn(`Erro ao ler cache local "${scopedKey}":`, error);
      }

      if (cancelled) return;
      latestValue.current = localValue;
      setStoredValue(localValue);
      setValueScope(scopedKey);

      // Consulta estado na nuvem
      const remote = await loadCloudState<T>(key, schoolId ?? undefined);
      if (cancelled) return;

      if (remote && remote.data !== undefined && remote.data !== null) {
        const remoteData = remote.data;
        const localUpdatedAtStr = window.localStorage.getItem(`${scopedKey}_updated_at`);
        const localUpdatedAt = localUpdatedAtStr ? parseInt(localUpdatedAtStr, 10) : 0;
        const remoteUpdatedAt = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;

        let finalValue = remoteData;

        // Proteção contra perda de dados em coleções (ex: alunos adicionados localmente)
        if (Array.isArray(localValue) && Array.isArray(remoteData)) {
          const remoteIds = new Set(remoteData.map((item: any) => item?.id).filter(Boolean));
          const localOnly = localValue.filter((item: any) => item?.id && !remoteIds.has(item.id));
          
          if (localOnly.length > 0) {
            // Preserva e mescla cadastros feitos localmente com os da nuvem
            finalValue = [...remoteData, ...localOnly] as unknown as T;
            void saveCloudState(key, finalValue, schoolId ?? undefined);
          } else if (hasLocal && localUpdatedAt > remoteUpdatedAt && localValue.length >= remoteData.length) {
            finalValue = localValue;
            void saveCloudState(key, finalValue, schoolId ?? undefined);
          }
        } else if (hasLocal && localUpdatedAt > remoteUpdatedAt) {
          finalValue = localValue;
          void saveCloudState(key, finalValue, schoolId ?? undefined);
        }

        latestValue.current = finalValue;
        setStoredValue(finalValue);
        setValueScope(scopedKey);
        try {
          window.localStorage.setItem(scopedKey, JSON.stringify(finalValue));
          if (scopedKey !== key) {
            window.localStorage.setItem(key, JSON.stringify(finalValue));
          }
        } catch { /* armazenamento indisponível */ }
        window.dispatchEvent(new CustomEvent('local-storage-sync', {
          detail: { key: scopedKey, newValue: finalValue },
        }));
        return;
      }

      const scopedLocal = window.localStorage.getItem(scopedKey);
      if (scopedLocal !== null && schoolId) {
        void saveCloudState(key, JSON.parse(scopedLocal), schoolId ?? undefined);
      }
    };

    void hydrate();

    const handleBeforeUnload = () => {
      if (saveTimer.current && schoolId && latestValue.current !== undefined) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        void saveCloudState(key, latestValue.current, schoolId);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      cancelled = true;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        if (schoolId && latestValue.current !== undefined) {
          void saveCloudState(key, latestValue.current, schoolId);
        }
      }
    };
  }, [key, schoolId, scopedKey]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (scopedKey && event.key === scopedKey && event.newValue !== null) {
        setStoredValue(JSON.parse(event.newValue));
        setValueScope(scopedKey);
      }
    };

    const handleCustomSync = (event: CustomEvent) => {
      if (scopedKey && event.detail.key === scopedKey) {
        setStoredValue(event.detail.newValue);
        setValueScope(scopedKey);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-sync', handleCustomSync as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-sync', handleCustomSync as EventListener);
    };
  }, [scopedKey]);

  return [valueScope === scopedKey ? storedValue : initialValue, setValue];
}
