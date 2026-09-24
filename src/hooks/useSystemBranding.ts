import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SystemBranding {
  logoUrl: string;
  faviconUrl: string;
  brandName: string;
  updatedAt?: string;
}

export const DEFAULT_BRANDING: SystemBranding = {
  logoUrl: '/logo-icon.png',
  faviconUrl: '/favicon.ico',
  brandName: 'Purple Edu',
};

const STORAGE_KEY = 'escolinha_system_branding';
const SYNC_EVENT = 'system-branding-updated';

/** Aplica a URL do favicon nas tags <link> do <head> do documento */
export function applyFavicon(url: string) {
  if (typeof document === 'undefined') return;
  const selectors = [
    "link[rel='icon']",
    "link[rel='shortcut icon']",
    "link[rel='apple-touch-icon']",
  ];
  const links = document.querySelectorAll<HTMLLinkElement>(selectors.join(','));
  if (links.length > 0) {
    links.forEach((link) => {
      link.href = url;
    });
  } else {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = url;
    document.head.appendChild(link);
  }
}

/** Lê as configurações locais salvas de branding */
export function getStoredBranding(): SystemBranding {
  if (typeof window === 'undefined') return DEFAULT_BRANDING;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        logoUrl: parsed.logoUrl || DEFAULT_BRANDING.logoUrl,
        faviconUrl: parsed.faviconUrl || DEFAULT_BRANDING.faviconUrl,
        brandName: parsed.brandName || DEFAULT_BRANDING.brandName,
        updatedAt: parsed.updatedAt,
      };
    }
  } catch (err) {
    console.warn('[Branding] Erro ao carregar branding local:', err);
  }
  return DEFAULT_BRANDING;
}

export function useSystemBranding() {
  const [branding, setBranding] = useState<SystemBranding>(getStoredBranding);

  // Sincroniza estado e aplica favicon na montagem e em eventos
  useEffect(() => {
    const current = getStoredBranding();
    setBranding(current);
    if (current.faviconUrl) {
      applyFavicon(current.faviconUrl);
    }

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<SystemBranding>;
      if (customEvent.detail) {
        setBranding(customEvent.detail);
        applyFavicon(customEvent.detail.faviconUrl || DEFAULT_BRANDING.faviconUrl);
      } else {
        const fresh = getStoredBranding();
        setBranding(fresh);
        applyFavicon(fresh.faviconUrl || DEFAULT_BRANDING.faviconUrl);
      }
    };

    window.addEventListener(SYNC_EVENT, handleSync);
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        handleSync(e);
      }
    });

    // Também tenta hidratar da nuvem (Supabase app_state) em segundo plano
    const hydrateFromCloud = async () => {
      try {
        const { data } = await supabase
          .from('app_state')
          .select('value')
          .eq('key', 'system_branding')
          .limit(1)
          .maybeSingle();

        if (data && data.value) {
          const cloudData = (data.value as { data?: SystemBranding })?.data;
          if (cloudData && cloudData.updatedAt) {
            const local = getStoredBranding();
            if (!local.updatedAt || new Date(cloudData.updatedAt) > new Date(local.updatedAt)) {
              window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudData));
              setBranding(cloudData);
              applyFavicon(cloudData.faviconUrl || DEFAULT_BRANDING.faviconUrl);
            }
          }
        }
      } catch (err) {
        // Ignora silenciosamente se não autenticado ou sem permissão
      }
    };

    void hydrateFromCloud();

    return () => {
      window.removeEventListener(SYNC_EVENT, handleSync);
    };
  }, []);

  const updateBranding = useCallback(async (newSettings: Partial<SystemBranding>) => {
    const updated: SystemBranding = {
      ...branding,
      ...newSettings,
      updatedAt: new Date().toISOString(),
    };

    setBranding(updated);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      applyFavicon(updated.faviconUrl || DEFAULT_BRANDING.faviconUrl);
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: updated }));
    }

    // Persiste também no Supabase app_state
    try {
      const { data: userAuth } = await supabase.auth.getUser();
      if (userAuth?.user?.id) {
        // Encontra ou cria chave system_branding
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', userAuth.user.id)
          .maybeSingle();

        const schoolId = profile?.school_id;
        if (schoolId) {
          await supabase
            .from('app_state')
            .upsert({
              school_id: schoolId,
              key: 'system_branding',
              value: { data: updated },
              updated_at: new Date().toISOString(),
            }, { onConflict: 'school_id,key' });
        }
      }
    } catch (e) {
      console.warn('[Branding] Erro ao sincronizar com nuvem:', e);
    }

    return updated;
  }, [branding]);

  const resetBranding = useCallback(async () => {
    const resetted: SystemBranding = {
      ...DEFAULT_BRANDING,
      updatedAt: new Date().toISOString(),
    };

    setBranding(resetted);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resetted));
      applyFavicon(DEFAULT_BRANDING.faviconUrl);
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: resetted }));
    }

    try {
      const { data: userAuth } = await supabase.auth.getUser();
      if (userAuth?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', userAuth.user.id)
          .maybeSingle();

        const schoolId = profile?.school_id;
        if (schoolId) {
          await supabase
            .from('app_state')
            .upsert({
              school_id: schoolId,
              key: 'system_branding',
              value: { data: resetted },
              updated_at: new Date().toISOString(),
            }, { onConflict: 'school_id,key' });
        }
      }
    } catch (e) {
      console.warn('[Branding] Erro ao resetar na nuvem:', e);
    }

    return resetted;
  }, []);

  return {
    branding,
    updateBranding,
    resetBranding,
    applyFavicon,
  };
}

