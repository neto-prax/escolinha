import { useState, useEffect, useRef } from 'react';
import { loadCloudState, saveCloudState } from '@/lib/cloudState';

/**
 * Estado persistente da escola.
 * Lê imediatamente do cache local (render instantâneo) e sincroniza com o
 * banco na nuvem, de forma que os dados não se perdem ao trocar de
 * navegador/dispositivo ou limpar o cache.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        return JSON.parse(item);
      }
      return initialValue;
    } catch (error) {
      console.warn(`Erro ao ler cache local "${key}":`, error);
      return initialValue;
    }
  });

  const latestValue = useRef(storedValue);
  latestValue.current = storedValue;
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(latestValue.current) : value;
      latestValue.current = valueToStore;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));

      window.dispatchEvent(new CustomEvent('local-storage-sync', { detail: { key, newValue: valueToStore } }));

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void saveCloudState(key, valueToStore);
      }, 400);
    } catch (error) {
      console.warn(`Erro ao salvar "${key}":`, error);
    }
  };

  // Hidratação a partir da nuvem (uma vez por chave)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await loadCloudState<T>(key);
      if (cancelled) return;
      hydrated.current = true;

      if (remote !== undefined && remote !== null) {
        latestValue.current = remote;
        setStoredValue(remote);
        try {
          window.localStorage.setItem(key, JSON.stringify(remote));
        } catch { /* ignore */ }
        window.dispatchEvent(new CustomEvent('local-storage-sync', { detail: { key, newValue: remote } }));
        return;
      }

      // Sem registro na nuvem: envia o que já existia neste navegador (migração)
      const local = window.localStorage.getItem(key);
      if (local !== null) {
        void saveCloudState(key, JSON.parse(local));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        setStoredValue(JSON.parse(e.newValue));
      }
    };

    const handleCustomSync = (e: CustomEvent) => {
      if (e.detail.key === key) {
        setStoredValue(e.detail.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-sync', handleCustomSync as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-sync', handleCustomSync as EventListener);
    };
  }, [key]);

  return [storedValue, setValue];
}
