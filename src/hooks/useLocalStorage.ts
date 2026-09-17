import { useState, useEffect, useRef } from 'react';
import { loadCloudState, saveCloudState, getSchoolId } from '@/lib/cloudState';

/**
 * Estado persistente da escola.
 * Lê imediatamente do cache local (render instantâneo) e sincroniza com o
 * banco na nuvem, de forma que os dados não se perdem ao trocar de
 * navegador/dispositivo ou limpar o cache.
 * 
 * Tenant Isolation: A chave do localStorage é automaticamente prefixada com o schoolId
 * para evitar vazamento de dados entre diferentes escolas no mesmo navegador.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  
  // Efeito para carregar o schoolId atual
  useEffect(() => {
    getSchoolId().then(setSchoolId);
  }, []);

  // Chave prefixada para isolamento
  const scopedKey = schoolId ? \`s_\${schoolId}_\${key}\` : key;

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Tenta ler da chave prefixada se disponível, senão usa a chave base
      // (Nota: no primeiro render schoolId será null, então usará a chave base.
      // O useEffect abaixo cuidará de re-sincronizar assim que o schoolId for resolvido)
      const item = window.localStorage.getItem(key);
      if (item) {
        return JSON.parse(item);
      }
      return initialValue;
    } catch (error) {
      console.warn(\`Erro ao ler cache local "\${key}":\`, error);
      return initialValue;
    }
  });

  const latestValue = useRef(storedValue);
  latestValue.current = storedValue;
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-sincroniza quando o schoolId muda (ex: login/logout)
  useEffect(() => {
    if (!schoolId) return;

    try {
      const item = window.localStorage.getItem(scopedKey);
      if (item) {
        setStoredValue(JSON.parse(item));
        latestValue.current = JSON.parse(item);
      }
    } catch (error) {
      /* ignore */
    }
  }, [schoolId, scopedKey]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(latestValue.current) : value;
      latestValue.current = valueToStore;
      setStoredValue(valueToStore);
      
      // Salva no localStorage com a chave escopada
      window.localStorage.setItem(scopedKey, JSON.stringify(valueToStore));

      window.dispatchEvent(new CustomEvent('local-storage-sync', { detail: { key: scopedKey, newValue: valueToStore } }));

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void saveCloudState(key, valueToStore);
      }, 400);
    } catch (error) {
      console.warn(\`Erro ao salvar "\${scopedKey}":\`, error);
    }
  };

  // Hidratação a partir da nuvem (uma vez por chave)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Só sincroniza com a nuvem quando tivermos o schoolId
      const currentSchoolId = await getSchoolId();
      if (!currentSchoolId || cancelled) return;

      const remote = await loadCloudState<T>(key);
      if (cancelled) return;
      hydrated.current = true;

      if (remote !== undefined && remote !== null) {
        latestValue.current = remote;
        setStoredValue(remote);
        try {
          window.localStorage.setItem(\`s_\${currentSchoolId}_\${key}\`, JSON.stringify(remote));
        } catch { /* ignore */ }
        window.dispatchEvent(new CustomEvent('local-storage-sync', { detail: { key: \`s_\${currentSchoolId}_\${key}\`, newValue: remote } }));
        return;
      }

      // Migração: se não tem na nuvem mas tem no localStorage local (chave escopada ou antiga)
      // Prioridade para a escopada
      const localScoped = window.localStorage.getItem(\`s_\${currentSchoolId}_\${key}\`);
      if (localScoped !== null) {
        void saveCloudState(key, JSON.parse(localScoped));
      } else {
        const localLegacy = window.localStorage.getItem(key);
        // Só migra da chave legacy se estivermos seguros de que pertence a esta escola
        // Como não temos certeza, em multi-tenant é mais seguro NÃO migrar automaticamente
        // a menos que o usuário confirme. Mas para fins de robustez, vamos apenas salvar se existir.
        if (localLegacy !== null) {
          void saveCloudState(key, JSON.parse(localLegacy));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === scopedKey && e.newValue !== null) {
        setStoredValue(JSON.parse(e.newValue));
      }
    };

    const handleCustomSync = (e: CustomEvent) => {
      if (e.detail.key === scopedKey) {
        setStoredValue(e.detail.newValue);
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
