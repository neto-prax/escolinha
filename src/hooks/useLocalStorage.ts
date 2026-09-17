import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSchoolStorageKey, loadCloudState, saveCloudState } from '@/lib/cloudState';

/** Estado persistente e isolado para a escola autenticada. */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const { profile, school } = useAuth();
  const schoolId = profile?.school_id ?? school?.id ?? null;
  const scopedKey = schoolId ? getSchoolStorageKey(key, schoolId) : null;
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const latestValue = useRef(storedValue);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeScope = useRef<string | null>(scopedKey);

  latestValue.current = storedValue;

  const setValue = (value: T | ((val: T) => T)) => {
    if (!scopedKey) return;

    try {
      const valueToStore = value instanceof Function ? value(latestValue.current) : value;
      latestValue.current = valueToStore;
      setStoredValue(valueToStore);
      window.localStorage.setItem(scopedKey, JSON.stringify(valueToStore));
      window.dispatchEvent(new CustomEvent('local-storage-sync', {
        detail: { key: scopedKey, newValue: valueToStore },
      }));

      if (saveTimer.current) clearTimeout(saveTimer.current);
      const targetSchoolId = schoolId;
      const targetScope = scopedKey;
      saveTimer.current = setTimeout(() => {
        if (activeScope.current === targetScope) {
          void saveCloudState(key, valueToStore, targetSchoolId);
        }
      }, 400);
    } catch (error) {
      console.warn(`Erro ao salvar "${scopedKey}":`, error);
    }
  };

  useEffect(() => {
    activeScope.current = scopedKey;

    if (!scopedKey) {
      latestValue.current = initialValue;
      setStoredValue(initialValue);
      return;
    }

    let cancelled = false;

    const hydrate = async () => {
      let localValue = initialValue;
      try {
        const cached = window.localStorage.getItem(scopedKey);
        if (cached !== null) localValue = JSON.parse(cached) as T;
      } catch (error) {
        console.warn(`Erro ao ler cache local "${scopedKey}":`, error);
      }

      if (cancelled) return;
      latestValue.current = localValue;
      setStoredValue(localValue);

      const remote = await loadCloudState<T>(key, schoolId ?? undefined);
      if (cancelled) return;

      if (remote !== undefined && remote !== null) {
        latestValue.current = remote;
        setStoredValue(remote);
        try {
          window.localStorage.setItem(scopedKey, JSON.stringify(remote));
        } catch { /* armazenamento indisponível */ }
        window.dispatchEvent(new CustomEvent('local-storage-sync', {
          detail: { key: scopedKey, newValue: remote },
        }));
        return;
      }

      const scopedLocal = window.localStorage.getItem(scopedKey);
      if (scopedLocal !== null) {
        void saveCloudState(key, JSON.parse(scopedLocal), schoolId ?? undefined);
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
    };
  }, [key, schoolId, scopedKey]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (scopedKey && event.key === scopedKey && event.newValue !== null) {
        setStoredValue(JSON.parse(event.newValue));
      }
    };

    const handleCustomSync = (event: CustomEvent) => {
      if (scopedKey && event.detail.key === scopedKey) {
        setStoredValue(event.detail.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-sync', handleCustomSync as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-sync', handleCustomSync as EventListener);
    };
  }, [scopedKey]);

  return [storedValue, setValue];
}
