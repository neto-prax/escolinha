import { createContext, createElement, ReactNode, useState, useEffect, useMemo, useCallback, useContext, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getSchoolStorageKey } from '@/lib/cloudState';
import {
  WhatsAppChatConversation,
  WhatsAppChatMessage,
  WhatsAppSectorItem,
  WhatsAppResolutionData,
} from '@/types/mensagens';
import { toast } from 'sonner';
import { callWaAkg, syncWaAkgChats, syncWaAkgMessages } from '@/services/waAkgClient';
import {
  buildGreetingMenuText,
  evaluateSectorMenuResponse,
  DEFAULT_GREETING_CONFIG,
} from '@/hooks/useWhatsAppTriggers';
import {
  useWhatsAppChatSettings,
  formatMessageWithSignature,
  isGroupConversation,
  canAttendantViewTicket,
} from '@/hooks/useWhatsAppChatSettings';

export interface UaizapStatusData {
  connected: boolean;
  instanceName?: string;
  profileName?: string;
  ownerPhone?: string;
  profilePicUrl?: string;
  statusText: string;
  lastChecked?: string;
  isChecking?: boolean;
}

export function resolveContactPhoto(
  phone?: string | null,
  contactName?: string | null,
  explicitPhoto?: string | null,
  studentPhoto?: string | null,
  cachedWhatsappPhoto?: string | null
): string | null {
  // 1. Foto oficial recebida em tempo real da API do WhatsApp (Uazapi ou WA-AKG)
  if (
    cachedWhatsappPhoto &&
    typeof cachedWhatsappPhoto === 'string' &&
    cachedWhatsappPhoto.trim() &&
    !cachedWhatsappPhoto.includes('api.dicebear.com/7.x/initials') &&
    !cachedWhatsappPhoto.includes('unsplash.com')
  ) {
    return cachedWhatsappPhoto.trim();
  }

  // 2. Foto gravada no registro do contato no banco de dados
  if (
    explicitPhoto &&
    typeof explicitPhoto === 'string' &&
    explicitPhoto.trim() &&
    !explicitPhoto.includes('api.dicebear.com/7.x/initials') &&
    !explicitPhoto.includes('unsplash.com')
  ) {
    return explicitPhoto.trim();
  }

  // 3. Foto cadastrada do aluno/responsável vinculado no sistema da escola
  if (
    studentPhoto &&
    typeof studentPhoto === 'string' &&
    studentPhoto.trim() &&
    !studentPhoto.includes('unsplash.com')
  ) {
    return studentPhoto.trim();
  }

  // NUNCA retornar fotos de estranhos aleatórios.
  // Retorna null para o AvatarFallback renderizar com elegância as iniciais reais do contato.
  return null;
}

function useWhatsAppInboxState() {
  const { profile, school, roles, sectors: userAssignedSectors, hasSectorAccess, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();

  const schoolId = profile?.school_id || school?.id || null;
  const { settings: chatSettings } = useWhatsAppChatSettings();

  // Filter messages starting from today (default: false, so historical conversations are always visible)
  const [onlyFromToday, setOnlyFromToday] = useState<boolean>(() => {
    const saved = localStorage.getItem('purple_whatsapp_only_today_v2');
    if (saved !== null) return saved === 'true';
    return false;
  });

  useEffect(() => {
    localStorage.setItem('purple_whatsapp_only_today_v2', String(onlyFromToday));
    localStorage.setItem('purple_whatsapp_only_today', String(onlyFromToday));
  }, [onlyFromToday]);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    return localStorage.getItem('purple_whatsapp_active_conv') || null;
  });

  useEffect(() => {
    if (activeConversationId) {
      localStorage.setItem('purple_whatsapp_active_conv', activeConversationId);
    } else {
      localStorage.removeItem('purple_whatsapp_active_conv');
    }
  }, [activeConversationId]);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [optimisticMessages, setOptimisticMessages] = useState<WhatsAppChatMessage[]>([]);

  // ----------------------------------------------------
  // 1. QUERY WHATSAPP GATEWAY STATUS (WA-AKG ou UAZAPI)
  // ----------------------------------------------------
  const [activeGatewayProvider, setActiveGatewayProvider] = useState<'wa-akg' | 'uazapi'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('whatsapp_gateway_active_provider');
      if (saved === 'wa-akg' || saved === 'uazapi') return saved;
    }
    return 'uazapi';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateProvider = () => {
      const saved = localStorage.getItem('whatsapp_gateway_active_provider');
      if (saved === 'wa-akg' || saved === 'uazapi') {
        setActiveGatewayProvider(saved);
      }
    };
    window.addEventListener('storage', updateProvider);
    return () => window.removeEventListener('storage', updateProvider);
  }, []);

  const {
    data: uazapiRawStatus,
    isLoading: isCheckingUazapi,
    refetch: refetchUazapiStatus,
  } = useQuery({
    queryKey: ['whatsapp-gateway-status', activeGatewayProvider],
    queryFn: async () => {
      try {
        if (activeGatewayProvider === 'wa-akg') {
          return await callWaAkg('status');
        }

        const { data: res, error } = await supabase.functions.invoke('uazapi', {
          body: { action: 'status', data: {} },
        });
        if (error) {
          console.warn('uazapi status error:', error);
          return null;
        }
        return res;
      } catch (err) {
        console.warn('WhatsApp gateway status exception:', err);
        return null;
      }
    },
    staleTime: 10000,
    refetchInterval: 15000,
  });

  const uaizapStatus: UaizapStatusData = useMemo(() => {
    const isConn = Boolean(
      uazapiRawStatus?.status?.connected ||
      uazapiRawStatus?.instance?.status === 'connected' ||
      uazapiRawStatus?.connected ||
      uazapiRawStatus?.isConnected
    );
    const instance = uazapiRawStatus?.instance;

    return {
      connected: isConn,
      instanceName: instance?.name || (activeGatewayProvider === 'wa-akg' ? 'WA-AKG' : 'Uazapi'),
      profileName: instance?.profileName || 'WhatsApp',
      ownerPhone: instance?.owner || '',
      profilePicUrl: instance?.profilePicUrl,
      statusText: isConn ? 'Conectado (Online)' : 'Desconectado',
      lastChecked: new Date().toISOString(),
      isChecking: isCheckingUazapi,
    };
  }, [uazapiRawStatus, isCheckingUazapi, activeGatewayProvider]);

  // ----------------------------------------------------
  // 2. FETCH SECTORS FROM SUPABASE
  // ----------------------------------------------------
  const { data: dbSectors = [] } = useQuery({
    queryKey: ['inbox-sectors', schoolId],
    queryFn: async () => {
      let query = supabase
        .from('sectors')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Error fetching sectors:', error);
        return [];
      }
      return data || [];
    },
  });

  const allAvailableSectors: WhatsAppSectorItem[] = useMemo(() => {
    const defaultSectors: WhatsAppSectorItem[] = [
      { id: 'comercial', name: 'Comercial & Matrículas', description: 'Atendimento a novos alunos e rematrículas', color: '#3b82f6', is_active: true },
      { id: 'financeiro', name: 'Financeiro', description: 'Boletos, cobranças, acordos e pagamentos', color: '#10b981', is_active: true },
      { id: 'secretaria', name: 'Secretaria', description: 'Declarações, histórico, atestados e transferências', color: '#f59e0b', is_active: true },
      { id: 'pedagogico', name: 'Coordenação Pedagógica', description: 'Coordenação, professores e rendimento escolar', color: '#8b5cf6', is_active: true },
      { id: 'suporte', name: 'Suporte & Recepção', description: 'Dúvidas gerais e recepção', color: '#64748b', is_active: true },
    ];

    if (!Array.isArray(dbSectors) || dbSectors.length === 0) return defaultSectors;

    const mappedDbSectors: WhatsAppSectorItem[] = dbSectors.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description || null,
      color: (s as any).color || '#6366f1',
      is_active: s.is_active ?? true,
    }));

    // Mesclar setores padrão essenciais que ainda não constem no banco da instituição
    const normalize = (str: string) =>
      str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const existingNames = new Set(mappedDbSectors.map((s) => normalize(s.name)));

    const missingDefaults = defaultSectors.filter(
      (def) =>
        !existingNames.has(normalize(def.name)) &&
        !mappedDbSectors.some((db) => db.id === def.id || normalize(db.name).includes(normalize(def.id)))
    );

    return [...mappedDbSectors, ...missingDefaults];
  }, [dbSectors]);

  // Helper to enrich student info from local registered students
  const getSchoolAlunos = useCallback((): any[] => {
    try {
      if (typeof window === 'undefined') return [];
      const scopedKey = schoolId ? getSchoolStorageKey('escolinha_alunos', schoolId) : null;
      const rawScoped = scopedKey ? localStorage.getItem(scopedKey) : null;
      if (rawScoped) {
        const list = JSON.parse(rawScoped);
        if (Array.isArray(list) && list.length > 0) return list;
      }
      return [];
    } catch {
      return [];
    }
  }, [schoolId]);

  const sanitizeAvatarMap = (map: Record<string, string>): Record<string, string> => {
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(map || {})) {
      if (typeof v === 'string' && v.trim() && !v.includes('unsplash.com') && !v.includes('dicebear.com')) {
        clean[k] = v.trim();
      }
    }
    return clean;
  };

  const [contactAvatarsMap, setContactAvatarsMap] = useState<Record<string, string>>(() => {
    try {
      if (typeof window === 'undefined') return {};
      const scopedKey = schoolId ? getSchoolStorageKey('wa_contact_avatars', schoolId) : null;
      const rawScoped = scopedKey ? localStorage.getItem(scopedKey) : null;
      const rawLegacy = localStorage.getItem('wa_contact_avatars');
      const scoped = rawScoped ? JSON.parse(rawScoped) : {};
      const legacy = rawLegacy ? JSON.parse(rawLegacy) : {};
      const sanitized = sanitizeAvatarMap({ ...legacy, ...scoped });

      // Limpa dados de cache corrompidos com fotos de modelos/fakes
      if (scopedKey && rawScoped && (rawScoped.includes('unsplash.com') || rawScoped.includes('dicebear.com'))) {
        try { localStorage.setItem(scopedKey, JSON.stringify(sanitized)); } catch {}
      }
      if (rawLegacy && (rawLegacy.includes('unsplash.com') || rawLegacy.includes('dicebear.com'))) {
        try { localStorage.setItem('wa_contact_avatars', JSON.stringify(sanitized)); } catch {}
      }

      return sanitized;
    } catch {
      return {};
    }
  });

  // Atualiza cache ao trocar de escola
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const scopedKey = schoolId ? getSchoolStorageKey('wa_contact_avatars', schoolId) : null;
      const rawScoped = scopedKey ? localStorage.getItem(scopedKey) : null;
      const rawLegacy = localStorage.getItem('wa_contact_avatars');
      const scoped = rawScoped ? JSON.parse(rawScoped) : {};
      const legacy = rawLegacy ? JSON.parse(rawLegacy) : {};
      const sanitized = sanitizeAvatarMap({ ...legacy, ...scoped });

      // Limpa do storage se contiver resquícios de imagens de teste
      if (scopedKey && rawScoped && (rawScoped.includes('unsplash.com') || rawScoped.includes('dicebear.com'))) {
        try { localStorage.setItem(scopedKey, JSON.stringify(sanitized)); } catch {}
      }
      if (rawLegacy && (rawLegacy.includes('unsplash.com') || rawLegacy.includes('dicebear.com'))) {
        try { localStorage.setItem('wa_contact_avatars', JSON.stringify(sanitized)); } catch {}
      }

      setContactAvatarsMap((prev) => ({ ...prev, ...sanitized }));
    } catch {}
  }, [schoolId]);

  // Carrega avatares de contatos previamente salvos no banco Supabase
  const { data: dbContactsAvatars = [] } = useQuery({
    queryKey: ['contacts-avatars-db', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      try {
        const { data } = await supabase
          .from('contacts')
          .select('phone, avatar_url')
          .not('avatar_url', 'is', null)
          .eq('school_id', schoolId);
        return data || [];
      } catch {
        return [];
      }
    },
    staleTime: 60000,
  });

  useEffect(() => {
    if (!Array.isArray(dbContactsAvatars) || dbContactsAvatars.length === 0) return;
    setContactAvatarsMap((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const item of dbContactsAvatars) {
        if (!item.phone || !item.avatar_url) continue;
        const clean = item.phone.replace(/\D/g, '');
        const with55 = clean.startsWith('55') ? clean : `55${clean}`;
        if (!next[clean] || !next[with55]) {
          next[clean] = item.avatar_url;
          next[with55] = item.avatar_url;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [dbContactsAvatars]);

  const findStudentInfo = useCallback(
    (phone: string, contactName: string) => {
      const alunos = getSchoolAlunos();
      if (alunos.length === 0) return null;

      const cleanPhone = phone.replace(/\D/g, '');
      const last8 = cleanPhone.slice(-8);

      const found = alunos.find((a: any) => {
        const aPhone = String(
          a.responsavel_telefone ||
          a.telefone_responsavel ||
          a.contatoResponsavel ||
          a.contatoWhatsapp ||
          a.telefone ||
          a.celular ||
          a.celularAluno ||
          ''
        ).replace(/\D/g, '');
        if (aPhone && last8 && aPhone.endsWith(last8)) return true;

        const parentName = a.responsavel || a.nomeResponsavel;
        if (contactName && parentName) {
          const cLower = contactName.toLowerCase().trim();
          const rLower = parentName.toLowerCase().trim();
          if (cLower === rLower || cLower.includes(rLower) || rLower.includes(cLower)) {
            return true;
          }
        }
        return false;
      });

      if (!found) return null;

      const studentPhoto = found.foto_url || found.photoUrl || found.foto || null;

      return {
        id: found.id || `alu-${found.nome}`,
        name: found.nome,
        turma: found.turma ? `${found.classe || ''} ${found.turma}`.trim() : (found.turma || 'Turma Regular'),
        responsavel: found.responsavel || found.nomeResponsavel || contactName,
        status_financeiro: (found.status_financeiro || 'em_dia') as 'em_dia' | 'pendente' | 'atrasado',
        foto_url: studentPhoto,
      };
    },
    [getSchoolAlunos]
  );

  // ----------------------------------------------------
  // 3. FETCH CONVERSATIONS FROM SUPABASE
  // ----------------------------------------------------
  const {
    data: dbConversations = [],
    refetch: refetchDbConversations,
    isLoading: isLoadingDbConversations,
  } = useQuery({
    queryKey: ['inbox-db-conversations', schoolId, onlyFromToday],
    queryFn: async () => {
      try {
        let query = supabase
          .from('whatsapp_conversations')
          .select(`
            id, school_id, sector_id, contact_id, phone, contact_name, ticket_status, priority,
            last_message, last_message_at, unread_count, tags, assigned_to, created_at, opened_at, closed_at, resolution_summary,
            sector:sectors(id, name),
            contact:contacts(id, avatar_url, full_name)
          `)
          .order('last_message_at', { ascending: false, nullsFirst: false });

        if (schoolId) {
          query = query.eq('school_id', schoolId);
        }

        const { data: convs, error } = await query;
        if (error) {
          console.warn('Error fetching whatsapp_conversations:', error);
          return [];
        }
        if (!convs || convs.length === 0) return [];

        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        const todayStartIso = todayStart.toISOString();

        if (onlyFromToday) {
          const todayFiltered = convs.filter((c: any) => c.last_message_at && c.last_message_at >= todayStartIso);
          if (todayFiltered.length > 0) {
            return todayFiltered.map((c: any) => ({ ...c, has_today_activity: true }));
          }
          // Fallback se não houver novas mensagens hoje: exibe todas com tag para não deixar o painel em branco
          return convs.map((c: any) => ({
            ...c,
            last_message_at: c.last_message_at || c.created_at,
            has_today_activity: false,
          }));
        }

        return convs.map((c: any) => ({
          ...c,
          last_message_at: c.last_message_at || c.created_at,
          has_today_activity: Boolean(c.last_message_at && c.last_message_at >= todayStartIso),
        }));
      } catch (err) {
        console.warn('Exception querying whatsapp_conversations:', err);
        return [];
      }
    },
    refetchInterval: 8000,
    refetchIntervalInBackground: false,
  });

  // ----------------------------------------------------
  // ENGINE AUTOMÁTICO DE SAUDAÇÃO & MENU DE SETORES
  // ----------------------------------------------------
  const inFlightGreetingsRef = useRef<Set<string>>(new Set());
  const sentGreetingsCacheRef = useRef<Set<string>>(new Set());

  const sendAutoGreetingMessage = useCallback(
    async (
      targetConvId: string,
      targetPhone: string,
      targetContactName?: string,
      force = false
    ): Promise<boolean> => {
      if (!targetConvId || !targetPhone) return false;
      if (inFlightGreetingsRef.current.has(targetConvId)) return false;

      const cleanPhone = targetPhone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

      // Se não for envio manual forçado, protege contra envios repetidos em cache de memória
      if (!force) {
        if (
          sentGreetingsCacheRef.current.has(targetConvId) ||
          sentGreetingsCacheRef.current.has(formattedPhone)
        ) {
          return false;
        }
      }

      // Lê a configuração salva ou fallback padrão
      let currentGreetingConfig = DEFAULT_GREETING_CONFIG;
      try {
        const stored = localStorage.getItem('purple_whatsapp_greeting_v1');
        if (stored) {
          currentGreetingConfig = { ...DEFAULT_GREETING_CONFIG, ...JSON.parse(stored) };
        }
      } catch {}

      if (currentGreetingConfig.enabled === false && !force) {
        return false;
      }

      inFlightGreetingsRef.current.add(targetConvId);

      let effectiveConvId = targetConvId;
      const isTargetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetConvId);

      const without55 = cleanPhone.replace(/^55/, '');
      const last8 = cleanPhone.slice(-8);

      try {
        // Se targetConvId for virtual (ex: conv-aluno-...), resolve ou cria a conversa no banco primeiro
        if (!isTargetUuid) {
          const { data: existing } = await supabase
            .from('whatsapp_conversations')
            .select('id')
            .or(`phone.eq.${cleanPhone},phone.eq.${formattedPhone},phone.eq.${without55},phone.ilike.%${last8}`)
            .maybeSingle();

          if (existing?.id) {
            effectiveConvId = existing.id;
          } else {
            let targetSchoolId = schoolId || school?.id;
            if (!targetSchoolId) {
              const { data: anySchool } = await supabase.from('schools').select('id').limit(1).maybeSingle();
              targetSchoolId = anySchool?.id || null;
            }

            if (targetSchoolId) {
              const { data: newRow } = await supabase
                .from('whatsapp_conversations')
                .insert({
                  school_id: targetSchoolId,
                  phone: formattedPhone,
                  contact_name: targetContactName || targetPhone,
                  ticket_status: 'open',
                  unread_count: 0,
                  last_message_at: new Date().toISOString(),
                })
                .select('id')
                .maybeSingle();

              if (newRow?.id) {
                effectiveConvId = newRow.id;
                if (activeConversationId === targetConvId) {
                  setActiveConversationId(newRow.id);
                }
              }
            }
          }
        }

        // Verifica estado atual da conversa no banco se não for envio manual forçado
        if (!force && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveConvId)) {
          const { data: convRow } = await supabase
            .from('whatsapp_conversations')
            .select('id, sector_id, ticket_status')
            .eq('id', effectiveConvId)
            .maybeSingle();

          // 1. Se a conversa já tem um setor atribuído, nunca envia o menu de saudação
          if (convRow?.sector_id) {
            return false;
          }

          // 2. Se já existe qualquer mensagem de saída (outgoing) não falhada nesta conversa,
          // significa que o menu de saudação ou um atendente já respondeu. Nunca reenvia a saudação!
          const { count: outgoingCount } = await supabase
            .from('whatsapp_messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', effectiveConvId)
            .eq('direction', 'outgoing')
            .neq('status', 'failed');

          if (typeof outgoingCount === 'number' && outgoingCount > 0) {
            sentGreetingsCacheRef.current.add(targetConvId);
            sentGreetingsCacheRef.current.add(effectiveConvId);
            sentGreetingsCacheRef.current.add(formattedPhone);
            return false;
          }
        }

        const contactName = targetContactName || 'Responsável';
        const greetingText = buildGreetingMenuText(
          currentGreetingConfig.message,
          allAvailableSectors,
          currentGreetingConfig.enabledSectors,
          { schoolName: school?.name, contactName }
        );

        const nowIso = new Date().toISOString();

        const activeProvider = typeof window !== 'undefined'
          ? (localStorage.getItem('whatsapp_gateway_active_provider') || 'wa-akg')
          : 'wa-akg';

        let dispatched = false;
        try {
          if (activeProvider === 'wa-akg') {
            const akgRes = await callWaAkg('send-text' as any, {
              phone: formattedPhone,
              message: greetingText,
            });
            dispatched = !akgRes.error && !(akgRes as any)?.details?.error;
          } else {
            const uazRes = await supabase.functions.invoke('uazapi', {
              body: {
                action: 'send-text',
                data: { phone: formattedPhone, message: greetingText },
              },
            });
            dispatched = !uazRes.error && !(uazRes.data as any)?.error;
          }
        } catch (e) {
          console.warn('Erro ao despachar saudação via gateway:', e);
        }

        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveConvId)) {
          try {
            await supabase.from('whatsapp_messages').insert({
              conversation_id: effectiveConvId,
              body: greetingText,
              direction: 'outgoing',
              message_type: 'text',
              status: dispatched ? 'sent' : 'failed',
              created_at: nowIso,
            });

            await supabase
              .from('whatsapp_conversations')
              .update({
                last_message: greetingText,
                last_message_at: nowIso,
                unread_count: 0,
                ticket_status: 'open',
              })
              .eq('id', effectiveConvId);

            queryClient.invalidateQueries({ queryKey: ['inbox-db-messages'] });
            queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations'] });
            sentGreetingsCacheRef.current.add(targetConvId);
            sentGreetingsCacheRef.current.add(effectiveConvId);
            sentGreetingsCacheRef.current.add(formattedPhone);
            console.log(`[AutoGreeting] Saudação inicial e menu enviados com sucesso para ${targetPhone}`);
            return true;
          } catch (err) {
            console.warn('Erro ao persistir saudação no banco:', err);
            return false;
          }
        }

        return false;
      } finally {
        inFlightGreetingsRef.current.delete(targetConvId);
        if (effectiveConvId) inFlightGreetingsRef.current.delete(effectiveConvId);
      }
    },
    [allAvailableSectors, school?.name, school?.id, schoolId, activeConversationId, queryClient]
  );

  const processIncomingMenuResponse = useCallback(
    async (
      targetConvId: string,
      targetPhone: string,
      targetContactName?: string,
      incomingText?: string
    ): Promise<boolean> => {
      if (!targetConvId || !incomingText || !incomingText.trim()) return false;

      let currentGreetingConfig = DEFAULT_GREETING_CONFIG;
      try {
        const stored = localStorage.getItem('purple_whatsapp_greeting_v1');
        if (stored) {
          currentGreetingConfig = { ...DEFAULT_GREETING_CONFIG, ...JSON.parse(stored) };
        }
      } catch {}

      const evalResult = evaluateSectorMenuResponse(
        incomingText,
        allAvailableSectors,
        currentGreetingConfig.enabledSectors
      );

      if (evalResult.matched && evalResult.matchedSector) {
        const matchedSector = evalResult.matchedSector;
        const rawMsg =
          currentGreetingConfig.sectorGreetings[matchedSector.id] ||
          currentGreetingConfig.sectorGreetings[matchedSector.name.toLowerCase()] ||
          `Perfeito! Transferindo seu atendimento para ${matchedSector.name}. Em instantes um responsável irá te atender!`;

        const firstName = targetContactName?.split(' ')[0] || 'Responsável';
        const transferMessage = rawMsg
          .replace(/\{\{nome\}\}/gi, firstName)
          .replace(/\{\{escola\}\}/gi, school?.name || 'Purple Edu')
          .replace(/\{\{setor\}\}/gi, matchedSector.name);

        const cleanPhone = targetPhone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const nowIso = new Date().toISOString();

        const activeProvider = typeof window !== 'undefined'
          ? (localStorage.getItem('whatsapp_gateway_active_provider') || 'wa-akg')
          : 'wa-akg';

        let dispatched = false;
        try {
          if (activeProvider === 'wa-akg') {
            const akgRes = await callWaAkg('send-text' as any, {
              phone: formattedPhone,
              message: transferMessage,
            });
            dispatched = !akgRes.error;
          } else {
            const uazRes = await supabase.functions.invoke('uazapi', {
              body: {
                action: 'send-text',
                data: { phone: formattedPhone, message: transferMessage },
              },
            });
            dispatched = !uazRes.error && !(uazRes.data as any)?.error;
          }
        } catch (e) {
          console.warn('Erro ao disparar mensagem de transferência de setor:', e);
        }

        try {
          await supabase.from('whatsapp_messages').insert({
            conversation_id: targetConvId,
            body: transferMessage,
            direction: 'outgoing',
            message_type: 'text',
            status: dispatched ? 'sent' : 'received',
            created_at: nowIso,
          });

          // Resolução segura de UUID do setor
          let targetSectorUuid: string | null = null;
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matchedSector.id)) {
            targetSectorUuid = matchedSector.id;
          } else {
            const currentSchoolId = schoolId || school?.id;
            if (currentSchoolId) {
              const { data: dbSectors } = await supabase
                .from('sectors')
                .select('id, name')
                .eq('school_id', currentSchoolId);

              const found = (dbSectors || []).find((s) => {
                const sName = s.name.toLowerCase();
                const mName = matchedSector.name.toLowerCase();
                return sName === mName || sName.includes(mName) || mName.includes(sName);
              });

              if (found?.id) {
                targetSectorUuid = found.id;
              } else {
                const { data: createdSector } = await supabase
                  .from('sectors')
                  .insert({
                    school_id: currentSchoolId,
                    name: matchedSector.name,
                    is_active: true,
                  })
                  .select('id')
                  .maybeSingle();

                if (createdSector?.id) {
                  targetSectorUuid = createdSector.id;
                }
              }
            }
          }

          const convUpdates: Record<string, unknown> = {
            ticket_status: 'open',
            last_message: transferMessage,
            last_message_at: nowIso,
            unread_count: 0,
          };
          if (targetSectorUuid) {
            convUpdates.sector_id = targetSectorUuid;
          }

          await supabase
            .from('whatsapp_conversations')
            .update(convUpdates)
            .eq('id', targetConvId);

          queryClient.invalidateQueries({ queryKey: ['inbox-db-messages'] });
          queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations'] });
          toast.success(`Atendimento transferido para ${matchedSector.name}`);
          return true;
        } catch (err) {
          console.warn('Erro ao atualizar setor na conversa:', err);
          return false;
        }
      }
      return false;
    },
    [allAvailableSectors, school?.name, queryClient]
  );

  // Realtime subscription for conversations and messages
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-inbox-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_conversations', filter: schoolId ? `school_id=eq.${schoolId}` : undefined },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations'] });

          const newConv = payload?.new as any;
          if (payload?.eventType === 'INSERT' && newConv?.id && newConv?.phone) {
            setTimeout(() => {
              sendAutoGreetingMessage(newConv.id, newConv.phone, newConv.contact_name);
            }, 800);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_messages' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['inbox-db-messages'] });
          queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations'] });

          const newMsg = payload?.new as any;
          if (payload?.eventType === 'INSERT' && newMsg && newMsg.direction === 'incoming' && newMsg.conversation_id) {
            setTimeout(async () => {
              try {
                const { data: conv } = await supabase
                  .from('whatsapp_conversations')
                  .select('id, phone, contact_name, sector_id, ticket_status')
                  .eq('id', newMsg.conversation_id)
                  .maybeSingle();

                if (conv) {
                  // Se a conversa ainda não tem setor atribuído:
                  // 1º: Verifica se a mensagem recebida é uma resposta de escolha do menu (ex: "1", "Secretaria", etc.)
                  let menuMatched = false;
                  if (!conv.sector_id && newMsg.body) {
                    menuMatched = await processIncomingMenuResponse(conv.id, conv.phone, conv.contact_name, newMsg.body);
                  }

                  // 2º: Se NÃO foi resposta do menu e a conversa ainda não tem setor, tenta enviar saudação automática
                  // (sendAutoGreetingMessage só enviará se for realmente a 1ª mensagem sem saídas anteriores)
                  if (!menuMatched && !conv.sector_id) {
                    await sendAutoGreetingMessage(conv.id, conv.phone, conv.contact_name);
                  }
                }
              } catch (err) {
                console.warn('Erro no processador realtime de mensagens:', err);
              }
            }, 200);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, schoolId, sendAutoGreetingMessage, processIncomingMenuResponse]);

  // Periodic background sync for WA-AKG chats to ensure new contacts & messages are loaded automatically
  const checkedAvatarsRef = useRef<Set<string>>(new Set());

  // Consulta e cacheia o avatar individual diretamente da Uazapi via /chat/avatar
  const fetchChatAvatarFromUazapi = useCallback(
    async (phone: string) => {
      const cleanPhone = phone.replace(/\D/g, '');
      if (!cleanPhone || checkedAvatarsRef.current.has(cleanPhone)) return;
      const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      checkedAvatarsRef.current.add(cleanPhone);
      checkedAvatarsRef.current.add(formattedPhone);

      try {
        const { data: res } = await supabase.functions.invoke('uazapi', {
          body: { action: 'get-chat-avatar', data: { number: formattedPhone, preview: true } },
        });

        let avatarUrl = typeof res?.url === 'string' && res.url.trim() ? res.url.trim() : null;

        // Se não retornou e for telefone brasileiro, tenta variação alternativa com/sem o 9º dígito
        if (!avatarUrl && formattedPhone.startsWith('55')) {
          let altNumber = '';
          if (formattedPhone.length === 13) {
            altNumber = formattedPhone.slice(0, 4) + formattedPhone.slice(5);
          } else if (formattedPhone.length === 12) {
            altNumber = formattedPhone.slice(0, 4) + '9' + formattedPhone.slice(4);
          }
          if (altNumber) {
            try {
              const { data: altRes } = await supabase.functions.invoke('uazapi', {
                body: { action: 'get-chat-avatar', data: { number: altNumber, preview: true } },
              });
              if (typeof altRes?.url === 'string' && altRes.url.trim()) {
                avatarUrl = altRes.url.trim();
              }
            } catch {}
          }
        }

        if (avatarUrl && !avatarUrl.includes('unsplash.com') && !avatarUrl.includes('dicebear.com')) {
          const scopedKey = schoolId ? getSchoolStorageKey('wa_contact_avatars', schoolId) : null;
          setContactAvatarsMap((prev) => {
            const next = {
              ...prev,
              [cleanPhone]: avatarUrl,
              [formattedPhone]: avatarUrl,
            };
            if (scopedKey && typeof window !== 'undefined') {
              try {
                localStorage.setItem(scopedKey, JSON.stringify(next));
              } catch {}
            }
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('wa_contact_avatars', JSON.stringify(next));
              } catch {}
            }
            return next;
          });

          // Atualiza também na tabela contacts caso exista no banco
          if (schoolId) {
            try {
              await supabase
                .from('contacts')
                .update({ avatar_url: avatarUrl })
                .eq('school_id', schoolId)
                .or(`phone.eq.${formattedPhone},phone.eq.${cleanPhone}`);
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Falha ao buscar avatar Uazapi para', formattedPhone, err);
      }
    },
    [schoolId]
  );

  // Sincronização periódica de chats e avatares (WA-AKG ou UAZAPI)
  const isSyncingChatsRef = useRef(false);
  useEffect(() => {
    const isAutoSyncDisabled = schoolId
      ? localStorage.getItem(getSchoolStorageKey('wa_auto_sync_disabled', schoolId)) === 'true'
      : false;

    if (!schoolId || !uaizapStatus.connected || isAutoSyncDisabled) {
      return;
    }

    const runSync = async () => {
      if (isSyncingChatsRef.current) return;
      isSyncingChatsRef.current = true;
      try {
        if (activeGatewayProvider === 'wa-akg') {
          const res = await syncWaAkgChats(schoolId);
          if (res.synced > 0) {
            queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations'] });
            queryClient.invalidateQueries({ queryKey: ['inbox-db-messages'] });
          }
        } else if (activeGatewayProvider === 'uazapi') {
          // Puxa lista de chats e fotos da Uazapi via /chat/find
          const { data: res, error } = await supabase.functions.invoke('uazapi', {
            body: { action: 'find-chats', data: { limit: 100, compact: true } },
          });

          if (!error && res) {
            const chatList = Array.isArray(res.chats)
              ? res.chats
              : Array.isArray(res.data)
                ? res.data
                : Array.isArray(res)
                  ? res
                  : [];

            if (chatList.length > 0) {
              const scopedKey = schoolId ? getSchoolStorageKey('wa_contact_avatars', schoolId) : null;
              const newMap: Record<string, string> = {};
              let hasNew = false;

              for (const chat of chatList) {
                const rawPhone = String(chat.phone || chat.wa_chatid || chat.id || '').replace(/@.*/, '').replace(/\D/g, '');
                if (!rawPhone) continue;
                const cleanPhone = rawPhone;
                const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
                const pic = chat.image || chat.imagePreview || chat.profilePicUrl || chat.profilePictureUrl || null;
                if (pic && typeof pic === 'string' && !pic.includes('unsplash.com') && !pic.includes('dicebear.com')) {
                  newMap[cleanPhone] = pic;
                  newMap[formattedPhone] = pic;
                  // Mapeia variação alternativa brasileira de 8 / 9 dígitos
                  if (formattedPhone.startsWith('55')) {
                    if (formattedPhone.length === 13) {
                      newMap[formattedPhone.slice(0, 4) + formattedPhone.slice(5)] = pic;
                    } else if (formattedPhone.length === 12) {
                      newMap[formattedPhone.slice(0, 4) + '9' + formattedPhone.slice(4)] = pic;
                    }
                  }
                  hasNew = true;
                }
              }

              if (hasNew) {
                setContactAvatarsMap((prev) => {
                  const next = { ...prev, ...newMap };
                  if (scopedKey && typeof window !== 'undefined') {
                    try { localStorage.setItem(scopedKey, JSON.stringify(next)); } catch {}
                  }
                  if (typeof window !== 'undefined') {
                    try { localStorage.setItem('wa_contact_avatars', JSON.stringify(next)); } catch {}
                  }
                  return next;
                });
              }
            }
          }
        }

        // Verifica conversas que ainda não possuem setor atribuído para disparar saudação automática
        try {
          const { data: pendingConvs } = await supabase
            .from('whatsapp_conversations')
            .select('id, phone, contact_name, sector_id, ticket_status')
            .eq('school_id', schoolId)
            .is('sector_id', null)
            .limit(10);

          if (Array.isArray(pendingConvs) && pendingConvs.length > 0) {
            for (const conv of pendingConvs) {
              await sendAutoGreetingMessage(conv.id, conv.phone, conv.contact_name);
            }
          }
        } catch {
          // ignore
        }
      } catch (err) {
        console.warn('Erro ao sincronizar chats em background:', err);
      } finally {
        isSyncingChatsRef.current = false;
      }
    };

    // Executa imediatamente
    runSync();

    // Sincroniza periodicamente a cada 10 segundos
    const interval = setInterval(runSync, 10000);
    return () => clearInterval(interval);
  }, [activeGatewayProvider, schoolId, uaizapStatus.connected, queryClient, sendAutoGreetingMessage]);

  // Map DB conversations into WhatsAppChatConversation format
  const mappedDbConversations: WhatsAppChatConversation[] = useMemo(() => {
    return dbConversations.map((row: any) => {
      const sectorObj = allAvailableSectors.find((s) => s.id === row.sector_id);
      const studentEnriched = findStudentInfo(row.phone, row.contact_name || row.phone);

      let parsedResolution: WhatsAppResolutionData | null = null;
      if (row.resolution_summary) {
        try {
          parsedResolution = JSON.parse(row.resolution_summary);
        } catch {
          parsedResolution = {
            title: 'Atendimento Concluído',
            description: row.resolution_summary,
            resolved_at: row.closed_at || row.updated_at || row.created_at,
            resolved_by: 'Atendente',
          };
        }
      }

      const cleanPhone = (row.phone || '').replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      const cachedAvatar = contactAvatarsMap[cleanPhone] || contactAvatarsMap[formattedPhone] || null;

      const avatarUrl = resolveContactPhoto(
        formattedPhone,
        row.contact_name || row.phone,
        row.avatar_url || row.contact?.avatar_url,
        studentEnriched?.foto_url || row.student?.photo_url,
        cachedAvatar
      );

      return {
        id: row.id,
        phone: row.phone,
        contact_name: row.contact_name || row.phone,
        contact_id: row.contact_id,
        sector_id: row.sector_id,
        sector_name: sectorObj ? sectorObj.name : row.sector?.name || (row.sector_id ? 'Setor Atribuído' : 'Sem Setor'),
        ticket_status: (row.ticket_status || 'open') as 'open' | 'pending' | 'resolved' | 'closed',
        priority: (row.priority || 'normal') as 'low' | 'normal' | 'high' | 'urgent',
        last_message: row.last_message || null,
        last_message_at: row.last_message_at || row.created_at,
        unread_count: row.unread_count || 0,
        avatar_url: avatarUrl,
        tags: row.tags || ['WhatsApp'],
        assigned_to: row.assigned_to,
        assigned_name: row.assigned_to ? (row.assigned_to === profile?.id ? profile?.full_name || 'Você' : 'Atendente') : null,
        opened_at: row.opened_at || null,
        closed_at: row.closed_at || null,
        resolution_summary: row.resolution_summary || null,
        resolution_data: parsedResolution,
        student_info: studentEnriched,
      };
    });
  }, [dbConversations, allAvailableSectors, findStudentInfo, profile?.id, profile?.full_name, contactAvatarsMap]);

  // School contacts who do not have an active chat yet (allows starting chat in 1 click)
  const schoolContactsConversations: WhatsAppChatConversation[] = useMemo(() => {
    const alunos = getSchoolAlunos();
    if (alunos.length === 0) return [];

    const list: WhatsAppChatConversation[] = [];
    const seenPhones = new Set<string>();

    for (const dbc of mappedDbConversations) {
      seenPhones.add(dbc.phone.replace(/\D/g, ''));
    }

    for (const aluno of alunos) {
      const rawPhone = String(
        aluno.responsavel_telefone ||
        aluno.telefone_responsavel ||
        aluno.contatoResponsavel ||
        aluno.contatoWhatsapp ||
        aluno.telefone ||
        aluno.celular ||
        aluno.celularAluno ||
        ''
      ).replace(/\D/g, '');

      if (!rawPhone || rawPhone.length < 8) continue;
      const cleanPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
      if (seenPhones.has(cleanPhone)) continue;
      seenPhones.add(cleanPhone);

      const contactName = aluno.responsavel || aluno.nomeResponsavel || aluno.nome || 'Responsável';
      const cachedAvatar = contactAvatarsMap[cleanPhone] || null;
      const studentPhoto = aluno.foto_url || aluno.photoUrl || aluno.foto || null;
      const avatarUrl = resolveContactPhoto(
        cleanPhone,
        contactName,
        studentPhoto,
        studentPhoto,
        cachedAvatar
      );

      list.push({
        id: `conv-aluno-${aluno.id || cleanPhone}`,
        phone: cleanPhone,
        contact_name: contactName,
        sector_id: 'secretaria',
        sector_name: 'Secretaria',
        ticket_status: 'open',
        priority: 'normal',
        last_message: null,
        last_message_at: null,
        unread_count: 0,
        avatar_url: avatarUrl,
        tags: [aluno.turma || 'Aluno Cadastrado'],
        student_info: {
          id: aluno.id || `alu-${aluno.nome}`,
          name: aluno.nome,
          turma: aluno.turma ? `${aluno.classe || ''} ${aluno.turma}`.trim() : (aluno.turma || 'Turma Regular'),
          responsavel: contactName,
          status_financeiro: aluno.status_financeiro || 'em_dia',
          foto_url: studentPhoto || avatarUrl,
        },
      });
    }

    return list;
  }, [mappedDbConversations, getSchoolAlunos, contactAvatarsMap]);

  // Combine database conversations with student directory
  const effectiveConversations = useMemo(() => {
    if (onlyFromToday) {
      // In "Hoje em diante" mode, show conversations with activity today + school contacts
      return [...mappedDbConversations, ...schoolContactsConversations];
    }
    return [...mappedDbConversations, ...schoolContactsConversations];
  }, [mappedDbConversations, schoolContactsConversations, onlyFromToday]);

  // Sector permissions
  const isDirector = useMemo(() => {
    return isSuperAdmin || roles.includes('director') || roles.includes('admin') || roles.length === 0;
  }, [isSuperAdmin, roles]);

  const userPermittedSectors = useMemo(() => {
    if (isDirector || isSuperAdmin) return allAvailableSectors;
    const assignedIds = new Set(userAssignedSectors.map((s) => s.id));
    return allAvailableSectors.filter((sector) => assignedIds.has(sector.id));
  }, [isDirector, isSuperAdmin, allAvailableSectors, userAssignedSectors]);

  const permittedConversations = useMemo(() => {
    let list = effectiveConversations;

    // Regra Global: se ignorarMensagensGrupo estiver ativado, filtra conversas de grupos (@g.us)
    if (chatSettings.ignorarMensagensGrupo) {
      list = list.filter((c) => !isGroupConversation(c.phone) && !isGroupConversation(c.id));
    }

    if (isDirector || isSuperAdmin) return list;

    return list.filter((c) => {
      // 1. Verificação de acesso ao setor
      if (c.sector_id && !hasSectorAccess(c.sector_id)) {
        return false;
      }

      // 2. Verificação de regras do Módulo Atendimento (tickets atribuídos a outros, chatbot)
      return canAttendantViewTicket(
        {
          assigned_to: c.assigned_to,
          tags: c.tags,
          ticket_status: c.ticket_status,
          phone: c.phone,
        },
        profile?.id || null,
        false,
        chatSettings
      );
    });
  }, [effectiveConversations, isDirector, isSuperAdmin, hasSectorAccess, chatSettings, profile?.id]);

  const activeConversation = useMemo(() => {
    if (!activeConversationId) return null;
    return (
      permittedConversations.find((c) => c.id === activeConversationId) ||
      effectiveConversations.find((c) => c.id === activeConversationId) ||
      null
    );
  }, [permittedConversations, effectiveConversations, activeConversationId]);

  // Quando uma conversa é aberta com Uazapi, consulta e atualiza a foto do contato diretamente da API
  useEffect(() => {
    if (!activeConversation?.phone || activeGatewayProvider !== 'uazapi' || !uaizapStatus.connected) return;
    const cleanPhone = activeConversation.phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    if (!contactAvatarsMap[cleanPhone] && !contactAvatarsMap[formattedPhone]) {
      fetchChatAvatarFromUazapi(activeConversation.phone);
    }
  }, [activeConversation?.id, activeConversation?.phone, activeGatewayProvider, uaizapStatus.connected, contactAvatarsMap, fetchChatAvatarFromUazapi]);

  // Consulta proativamente avatares da Uazapi para contatos visíveis na lista que ainda não possuem foto
  useEffect(() => {
    if (activeGatewayProvider !== 'uazapi' || !uaizapStatus.connected) return;
    const pendingPhones = dbConversations
      .map((c: any) => (c.phone || '').replace(/\D/g, ''))
      .filter((p: string) => p && !contactAvatarsMap[p] && !checkedAvatarsRef.current.has(p))
      .slice(0, 10);

    for (const phone of pendingPhones) {
      fetchChatAvatarFromUazapi(phone);
    }
  }, [dbConversations, activeGatewayProvider, uaizapStatus.connected, contactAvatarsMap, fetchChatAvatarFromUazapi]);

  // ----------------------------------------------------
  // 4. FETCH MESSAGES FOR ACTIVE CONVERSATION
  // ----------------------------------------------------
  const isDbUuid = Boolean(
    activeConversation?.id &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeConversation.id)
  );

  const { data: dbMessages = [], refetch: refetchDbMessages } = useQuery({
    queryKey: ['inbox-db-messages', activeConversation?.id, onlyFromToday],
    queryFn: async () => {
      if (!activeConversation) return [];

      let conversationDbId = activeConversation.id;

      // If active conversation is not a direct UUID, check DB by phone variations
      if (!isDbUuid) {
        const cleanPhone = activeConversation.phone.replace(/\D/g, '');
        const with55 = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const without55 = cleanPhone.replace(/^55/, '');
        const last8 = cleanPhone.slice(-8);

        const { data: existing } = await supabase
          .from('whatsapp_conversations')
          .select('id')
          .or(`phone.eq.${cleanPhone},phone.eq.${with55},phone.eq.${without55},phone.ilike.%${last8}`)
          .maybeSingle();

        if (existing?.id) {
          conversationDbId = existing.id;
        } else {
          return [];
        }
      }

      if (activeGatewayProvider === 'wa-akg') {
        await syncWaAkgMessages(conversationDbId, activeConversation.phone).catch(() => null);
      }

      let msgQuery = supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationDbId)
        .order('created_at', { ascending: true });

      if (onlyFromToday) {
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        msgQuery = msgQuery.gte('created_at', todayStart.toISOString());
      }

      const { data, error } = await msgQuery;
      if (error) {
        console.warn('Error fetching whatsapp_messages:', error);
        return [];
      }
      if (onlyFromToday && (!data || data.length === 0)) {
        // Fallback para exibir histórico de mensagens da conversa se não houver mensagens hoje
        const { data: allMessages } = await supabase
          .from('whatsapp_messages')
          .select('*')
          .eq('conversation_id', conversationDbId)
          .order('created_at', { ascending: true });
        return allMessages || [];
      }
      return data || [];
    },
    enabled: !!activeConversation?.id,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });

  // Active messages list combining DB messages and pending optimistic messages
  const activeMessages: WhatsAppChatMessage[] = useMemo(() => {
    if (!activeConversation) return [];

    const dbList: WhatsAppChatMessage[] = dbMessages.map((m: any) => ({
      id: m.id,
      conversation_id: m.conversation_id,
      body: m.body,
      direction: (m.direction === 'system' ? 'system' : m.direction === 'outgoing' ? 'outgoing' : 'incoming') as WhatsAppChatMessage['direction'],
      message_type: (() => {
        const rawType = String(m.message_type || 'text').toLowerCase().replace(/[._\s-]/g, '');
        const typeMap: Record<string, WhatsAppChatMessage['message_type']> = {
          imagemessage: 'image',
          videomessage: 'video',
          audiomessage: 'audio',
          pttmessage: 'audio',
          documentmessage: 'document',
          documentwithcaptionmessage: 'document',
          stickermessage: 'sticker',
          extendedtextmessage: 'text',
          conversation: 'text',
          system: 'system',
        };
        return typeMap[rawType] || (rawType as WhatsAppChatMessage['message_type']);
      })(),
      media_url: m.media_url,
      media_caption: m.media_caption,
      media_filename: m.media_filename,
      status: (m.status || 'sent') as any,
      created_at: m.created_at,
      sender_name: m.direction === 'system' ? 'Sistema' : m.direction === 'outgoing' ? profile?.full_name || 'Escola' : activeConversation.contact_name,
    }));

    // Filter optimistic messages for this conversation that haven't appeared in DB yet
    const pending = optimisticMessages.filter((opt) => {
      if (opt.conversation_id !== activeConversation.id) return false;
      return !dbList.some((dbMsg) => dbMsg.body === opt.body && Math.abs(new Date(dbMsg.created_at).getTime() - new Date(opt.created_at).getTime()) < 10000);
    });

    const combined = [...dbList, ...pending];
    return combined.sort((a, b) => {
      const tA = new Date(a.created_at).getTime() || 0;
      const tB = new Date(b.created_at).getTime() || 0;
      if (tA !== tB) return tA - tB;
      return (a.id || '').localeCompare(b.id || '');
    });
  }, [activeConversation, dbMessages, optimisticMessages, profile?.full_name]);

  // Watchdog de 1ª mensagem / saudação automática quando uma conversa é carregada na tela:
  useEffect(() => {
    if (!activeConversation) return;

    // 1. Se a conversa ainda não possui setor atribuído, garante o envio da saudação e menu
    // APENAS SE for o primeiro contato absoluto (nenhuma mensagem de saída enviada ainda)
    if (!activeConversation.sector_id) {
      const hasOutgoing = activeMessages.some((m) => m.direction === 'outgoing' && m.status !== 'failed');
      const hasIncoming = activeMessages.some((m) => m.direction === 'incoming');

      // Só dispara se houver mensagem recebida e nenhuma resposta de saída anterior
      if (!hasOutgoing && hasIncoming) {
        const timer = setTimeout(() => {
          sendAutoGreetingMessage(
            activeConversation.id,
            activeConversation.phone,
            activeConversation.contact_name
          );
        }, 400);
        return () => clearTimeout(timer);
      }
    }

    // 2. Se a conversa ainda está Sem Setor e o cliente respondeu ao menu (ex: "4" ou "Coordenação"):
    const hasIncoming = activeMessages.some((m) => m.direction === 'incoming');
    if (!activeConversation.sector_id && hasIncoming) {
      const incomingList = activeMessages.filter((m) => m.direction === 'incoming');
      const lastIncoming = incomingList[incomingList.length - 1];
      if (lastIncoming?.body) {
        const evalRes = evaluateSectorMenuResponse(
          lastIncoming.body,
          allAvailableSectors,
          DEFAULT_GREETING_CONFIG.enabledSectors
        );
        if (evalRes.matched && evalRes.matchedSector) {
          const timer = setTimeout(() => {
            processIncomingMenuResponse(
              activeConversation.id,
              activeConversation.phone,
              activeConversation.contact_name,
              lastIncoming.body || ''
            );
          }, 600);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [
    activeConversation,
    activeMessages,
    allAvailableSectors,
    sendAutoGreetingMessage,
    processIncomingMenuResponse,
  ]);

  // ----------------------------------------------------
  // 5. SEND MESSAGE (UAZAPI + SUPABASE)
  // ----------------------------------------------------
  const sendMessage = useCallback(
    async (
      text: string,
      mediaFile?: { url: string; filename: string; type: 'image' | 'document' | 'audio' }
    ) => {
      if (!activeConversation) return;
      if (!text.trim() && !mediaFile) return;

      const phoneDigits = activeConversation.phone.replace(/\D/g, '');
      const formattedPhone = phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`;
      const nowIso = new Date().toISOString();
      const tempId = `temp-${Date.now()}`;

      // Aplica assinatura do atendente caso habilitado
      const textToSend = text.trim()
        ? formatMessageWithSignature(
            text,
            profile?.full_name,
            chatSettings.habilitarAssinatura,
            chatSettings.formatoAssinatura
          )
        : text;

      // Optimistic message
      const optMsg: WhatsAppChatMessage = {
        id: tempId,
        conversation_id: activeConversation.id,
        body: textToSend,
        direction: 'outgoing',
        message_type: mediaFile ? mediaFile.type : 'text',
        media_url: mediaFile?.url,
        media_filename: mediaFile?.filename,
        status: 'sending',
        created_at: nowIso,
        sender_name: profile?.full_name || 'Escola',
      };

      setOptimisticMessages((prev) => [...prev, optMsg]);

      // 1. Dispatch via Uazapi Edge Function
      let dispatched = false;
      try {
        const uazAction = mediaFile ? 'send-media' : 'send-text';
        const uazData = mediaFile
          ? {
              phone: formattedPhone,
              mediaUrl: mediaFile.url,
              mediaType: mediaFile.type,
              caption: textToSend,
              fileName: mediaFile.filename,
            }
          : {
              phone: formattedPhone,
              message: textToSend,
            };

        const activeProvider = typeof window !== 'undefined'
          ? (localStorage.getItem('whatsapp_gateway_active_provider') || 'wa-akg')
          : 'wa-akg';

        if (activeProvider === 'wa-akg') {
          const akgRes = await callWaAkg(uazAction as any, uazData);
          if (akgRes.error) {
            console.warn('wa-akg dispatch error:', akgRes.error);
          } else {
            dispatched = true;
          }
        } else {
          const uazRes = await supabase.functions.invoke('uazapi', {
            body: { action: uazAction, data: uazData },
          });

          if (uazRes.error || (uazRes.data as any)?.error) {
            console.warn('uazapi dispatch error:', uazRes.error || (uazRes.data as any)?.error);
          } else {
            dispatched = true;
          }
        }
      } catch (err: any) {
        console.warn('Uazapi call caught error:', err);
      }

      // 2. Persist to Supabase whatsapp_conversations and whatsapp_messages
      try {
        let dbConvId = activeConversation.id;

        if (!isDbUuid) {
          const cleanPhone = phoneDigits;
          const with55 = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
          const without55 = cleanPhone.replace(/^55/, '');
          const last8 = cleanPhone.slice(-8);

          // Check if conversation exists by phone
          const { data: existing } = await supabase
            .from('whatsapp_conversations')
            .select('id')
            .or(`phone.eq.${cleanPhone},phone.eq.${with55},phone.eq.${without55},phone.ilike.%${last8}`)
            .maybeSingle();

          if (existing?.id) {
            dbConvId = existing.id;
          } else {
            let targetSchoolId = schoolId;
            if (!targetSchoolId) {
              const { data: anySchool } = await supabase.from('schools').select('id').limit(1).maybeSingle();
              targetSchoolId = anySchool?.id || null;
            }

            if (targetSchoolId) {
              const { data: newRow } = await supabase
                .from('whatsapp_conversations')
                .insert({
                  school_id: targetSchoolId,
                  phone: formattedPhone,
                  contact_name: activeConversation.contact_name,
                  sector_id: activeConversation.sector_id || null,
                  ticket_status: 'open',
                  unread_count: 0,
                  opened_at: nowIso,
                  assigned_to: profile?.id || null,
                  last_message_at: nowIso,
                })
                .select('id')
                .maybeSingle();

              if (newRow?.id) {
                dbConvId = newRow.id;
                setActiveConversationId(dbConvId);
              }
            }
          }
        }

        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dbConvId)) {
          await supabase.from('whatsapp_messages').insert({
            conversation_id: dbConvId,
            body: textToSend,
            direction: 'outgoing',
            message_type: mediaFile ? mediaFile.type : 'text',
            media_url: mediaFile?.url,
            media_filename: mediaFile?.filename,
            status: dispatched ? 'sent' : 'failed',
            created_at: nowIso,
          });

          const convUpdates: Record<string, unknown> = {
            last_message: textToSend,
            last_message_at: nowIso,
            unread_count: 0,
            opened_at: activeConversation.opened_at || nowIso,
          };
          if (activeConversation.ticket_status === 'resolved' || activeConversation.ticket_status === 'closed') {
            convUpdates.ticket_status = 'open';
          }
          if (!activeConversation.assigned_to && profile?.id) {
            convUpdates.assigned_to = profile.id;
          }

          await supabase
            .from('whatsapp_conversations')
            .update(convUpdates)
            .eq('id', dbConvId);

          queryClient.invalidateQueries({ queryKey: ['inbox-db-messages'] });
          queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations'] });
        }
      } catch (err) {
        console.warn('Error saving outgoing message to DB:', err);
      } finally {
        // Clear optimistic message once persisted
        setOptimisticMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    },
    [activeConversation, isDbUuid, profile?.id, profile?.full_name, schoolId, queryClient, chatSettings]
  );

  // ----------------------------------------------------
  // 6. TRANSFER SECTOR
  // ----------------------------------------------------
  const transferSector = useCallback(
    async (conversationId: string, targetSectorId: string) => {
      const destSector = allAvailableSectors.find((s) => s.id === targetSectorId);
      const sectorName = destSector?.name || targetSectorId;

      const isDb = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId);
      if (isDb) {
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetSectorId);
          let finalSectorUuid: string | null = isUuid ? targetSectorId : null;

          if (!finalSectorUuid && schoolId) {
            const { data: existingSectors } = await supabase
              .from('sectors')
              .select('id, name')
              .eq('school_id', schoolId);

            const match = existingSectors?.find(
              (s) =>
                s.name.toLowerCase() === sectorName.toLowerCase() ||
                s.name.toLowerCase().includes(targetSectorId.toLowerCase())
            );

            if (match?.id) {
              finalSectorUuid = match.id;
            } else {
              const { data: createdSector } = await supabase
                .from('sectors')
                .insert({
                  name: sectorName,
                  school_id: schoolId,
                  is_active: true,
                })
                .select('id')
                .maybeSingle();

              if (createdSector?.id) {
                finalSectorUuid = createdSector.id;
                queryClient.invalidateQueries({ queryKey: ['whatsapp-sectors-list'] });
              }
            }
          }

          if (finalSectorUuid) {
            await supabase
              .from('whatsapp_conversations')
              .update({ sector_id: finalSectorUuid })
              .eq('id', conversationId);

            queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations'] });
          }
        } catch (err) {
          console.warn('Could not update sector on database:', err);
        }
      }

      toast.success(`Conversa transferida para o setor "${sectorName}"!`);
    },
    [allAvailableSectors, schoolId, queryClient]
  );

  // ----------------------------------------------------
  // 7. CHANGE TICKET STATUS
  // ----------------------------------------------------
  const changeTicketStatus = useCallback(
    async (conversationId: string, newStatus: 'open' | 'pending' | 'resolved' | 'closed') => {
      const statusLabels = {
        open: 'Em Atendimento',
        pending: 'Pendente',
        resolved: 'Resolvido',
        closed: 'Encerrado',
      };
      const nowIso = new Date().toISOString();

      // Atualização otimista imediata no cache
      queryClient.setQueriesData({ queryKey: ['inbox-db-conversations'] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((c: any) => {
          if (c.id === conversationId) {
            return {
              ...c,
              ticket_status: newStatus,
              opened_at: c.opened_at || nowIso,
              assigned_to: c.assigned_to || profile?.id || null,
              unread_count: 0,
            };
          }
          return c;
        });
      });

      const isDb = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId);
      if (isDb) {
        const updates: Record<string, unknown> = {
          ticket_status: newStatus,
          unread_count: 0,
        };
        if (newStatus === 'open' || newStatus === 'pending') {
          updates.opened_at = nowIso;
          if (profile?.id) updates.assigned_to = profile.id;
        }
        await supabase
          .from('whatsapp_conversations')
          .update(updates)
          .eq('id', conversationId);

        queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations'] });
      }

      toast.info(`Atendimento marcado como "${statusLabels[newStatus]}".`);
    },
    [queryClient, profile?.id]
  );

  // ----------------------------------------------------
  // 8. ACCESS CONVERSATION (SELECT CHAT & CLEAR UNREAD)
  // ----------------------------------------------------
  const accessConversation = useCallback(
    async (conversationId: string) => {
      setActiveConversationId(conversationId);
      const nowIso = new Date().toISOString();

      queryClient.setQueriesData({ queryKey: ['inbox-db-conversations'] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((c: any) => {
          if (c.id === conversationId) {
            return {
              ...c,
              unread_count: 0,
              opened_at: c.opened_at || nowIso,
            };
          }
          return c;
        });
      });

      const isDb = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId);
      if (isDb) {
        await supabase
          .from('whatsapp_conversations')
          .update({
            unread_count: 0,
            opened_at: nowIso,
          })
          .eq('id', conversationId);

        queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations'] });
      }
    },
    [queryClient]
  );

  // ----------------------------------------------------
  // 8.1 START TICKET (ASSUMIR ATENDIMENTO COM AUDITORIA INTERNA)
  // ----------------------------------------------------
  const startTicket = useCallback(
    async (conversationId: string) => {
      const nowIso = new Date().toISOString();
      const currentUserId = profile?.id;
      const currentUserName = profile?.full_name || 'Atendente';

      const isDb = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId);
      let targetConvId = conversationId;

      if (isDb) {
        const updates: Record<string, unknown> = {
          opened_at: nowIso,
          ticket_status: 'open',
          unread_count: 0,
        };
        if (currentUserId) {
          updates.assigned_to = currentUserId;
        }

        await supabase
          .from('whatsapp_conversations')
          .update(updates)
          .eq('id', conversationId);
      } else {
        const conv = effectiveConversations.find((c) => c.id === conversationId) || activeConversation;
        if (conv) {
          const cleanPhone = conv.phone.replace(/\D/g, '');
          const with55 = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
          const without55 = cleanPhone.replace(/^55/, '');
          const last8 = cleanPhone.slice(-8);

          const { data: existing } = await supabase
            .from('whatsapp_conversations')
            .select('id')
            .or(`phone.eq.${cleanPhone},phone.eq.${with55},phone.eq.${without55},phone.ilike.%${last8}`)
            .maybeSingle();

          if (existing?.id) {
            targetConvId = existing.id;
            const updates: Record<string, unknown> = {
              opened_at: nowIso,
              ticket_status: 'open',
              unread_count: 0,
            };
            if (currentUserId) {
              updates.assigned_to = currentUserId;
            }
            await supabase.from('whatsapp_conversations').update(updates).eq('id', targetConvId);
          } else {
            let targetSchoolId = schoolId;
            if (!targetSchoolId) {
              const { data: anySchool } = await supabase.from('schools').select('id').limit(1).maybeSingle();
              targetSchoolId = anySchool?.id || null;
            }

            if (targetSchoolId) {
              const { data: newRow } = await supabase
                .from('whatsapp_conversations')
                .insert({
                  school_id: targetSchoolId,
                  phone: conv.phone,
                  contact_name: conv.contact_name,
                  sector_id: conv.sector_id || null,
                  ticket_status: 'open',
                  unread_count: 0,
                  assigned_to: currentUserId || null,
                  opened_at: nowIso,
                  created_at: nowIso,
                  updated_at: nowIso,
                })
                .select('id')
                .single();

              if (newRow?.id) {
                targetConvId = newRow.id;
                setActiveConversationId(newRow.id);
              }
            }
          }
        }
      }

      // Insere registro interno de auditoria na conversa (não transmitido ao WhatsApp)
      if (targetConvId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetConvId)) {
        const systemAuditMsg = `📌 Atendimento iniciado por ${currentUserName}`;
        const newMsgData: any = {
          conversation_id: targetConvId,
          body: systemAuditMsg,
          direction: 'system',
          message_type: 'system',
          status: 'sent',
          created_at: nowIso,
        };
        if (schoolId) {
          newMsgData.school_id = schoolId;
        }
        await supabase.from('whatsapp_messages').insert(newMsgData);
      }

      // Atualização otimista no cache do React Query para desbloqueio e movimentação instantâneos
      queryClient.setQueriesData({ queryKey: ['inbox-db-conversations'] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((c: any) => {
          if (c.id === targetConvId) {
            return {
              ...c,
              opened_at: nowIso,
              ticket_status: 'open',
              unread_count: 0,
              assigned_to: currentUserId || c.assigned_to,
            };
          }
          return c;
        });
      });

      await queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations'] });
      await queryClient.invalidateQueries({ queryKey: ['inbox-db-messages'] });
      await refetchDbConversations();
      await refetchDbMessages();

      toast.success(`Atendimento iniciado por ${currentUserName}!`);
    },
    [profile?.id, profile?.full_name, schoolId, effectiveConversations, activeConversation, queryClient, refetchDbConversations, refetchDbMessages]
  );

  // ----------------------------------------------------
  // 9. RESOLVE CONVERSATION (RECORD SUMMARY & CLOSE)
  // ----------------------------------------------------
  const resolveConversation = useCallback(
    async (
      conversationId: string,
      resolution: { title: string; description: string; closingMessage?: string }
    ) => {
      const nowIso = new Date().toISOString();
      const resolutionPayload: WhatsAppResolutionData = {
        title: resolution.title.trim(),
        description: resolution.description.trim(),
        closingMessage: resolution.closingMessage?.trim() || undefined,
        resolved_at: nowIso,
        resolved_by: profile?.full_name || 'Atendente Purple Edu',
      };

      // 1. Se houver mensagem de encerramento, envia via WhatsApp
      if (resolution.closingMessage?.trim()) {
        await sendMessage(resolution.closingMessage.trim());
      }

      // 2. Atualiza no banco Supabase
      const isDb = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId);
      if (isDb) {
        await supabase
          .from('whatsapp_conversations')
          .update({
            ticket_status: 'resolved',
            closed_at: nowIso,
            resolution_summary: JSON.stringify(resolutionPayload),
          })
          .eq('id', conversationId);

        queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations'] });
      }

      toast.success('Atendimento concluído e registrado como resolvido!');
    },
    [profile?.full_name, queryClient, sendMessage]
  );

  // ----------------------------------------------------
  // 8. CREATE NEW CONVERSATION
  // ----------------------------------------------------
  const createNewConversation = useCallback(
    async ({
      phone,
      contactName,
      studentId,
      studentName,
      sectorId,
      initialMessage,
    }: {
      phone: string;
      contactName: string;
      studentId?: string;
      studentName?: string;
      sectorId?: string;
      initialMessage?: string;
    }) => {
      const cleanPhone = phone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      const nowIso = new Date().toISOString();

      let targetSchoolId = schoolId;
      if (!targetSchoolId) {
        const { data: anySchool } = await supabase.from('schools').select('id').limit(1).maybeSingle();
        targetSchoolId = anySchool?.id || null;
      }

      let convId: string | null = null;

      if (targetSchoolId) {
        const { data: existing } = await supabase
          .from('whatsapp_conversations')
          .select('id')
          .eq('school_id', targetSchoolId)
          .eq('phone', formattedPhone)
          .maybeSingle();

        if (existing?.id) {
          convId = existing.id;
        } else {
          const { data: inserted, error } = await supabase
            .from('whatsapp_conversations')
            .insert({
              school_id: targetSchoolId,
              phone: formattedPhone,
              contact_name: contactName,
              sector_id: sectorId || null,
              student_id: studentId || null,
              ticket_status: 'open',
              unread_count: 0,
              last_message_at: nowIso,
              tags: ['Novo Contato', 'WhatsApp'],
            })
            .select('id')
            .single();

          if (!error && inserted?.id) {
            convId = inserted.id;
          }
        }
      }

      if (convId) {
        setActiveConversationId(convId);
        queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations'] });
      }

      if (initialMessage?.trim()) {
        try {
          const activeProvider = typeof window !== 'undefined'
            ? (localStorage.getItem('whatsapp_gateway_active_provider') || 'wa-akg')
            : 'wa-akg';

          if (activeProvider === 'wa-akg') {
            await callWaAkg('send-text', {
              phone: formattedPhone,
              message: initialMessage.trim(),
            });
          } else {
            await supabase.functions.invoke('uazapi', {
              body: {
                action: 'send-text',
                data: { phone: formattedPhone, message: initialMessage.trim() },
              },
            });
          }
          toast.success(`Mensagem enviada para ${contactName}!`);
        } catch {
          // ignore
        }
      } else if (convId) {
        // Quando uma nova conversa for carregada/criada sem mensagem digitada, dispara a saudação com o menu de setores
        await sendAutoGreetingMessage(convId, formattedPhone, contactName);
      }

      return convId;
    },
    [schoolId, queryClient, sendAutoGreetingMessage]
  );

  // ----------------------------------------------------
  // 9. MANUAL SYNC WITH UAZAPI / SUPABASE
  // ----------------------------------------------------
  const syncWithUaizap = useCallback(async () => {
    setIsSyncing(true);
    try {
      const statusResult = await refetchUazapiStatus();
      const isOnline = Boolean(statusResult.data?.status?.connected);
      const instanceName = statusResult.data?.instance?.profileName || statusResult.data?.instance?.name || 'Online';

      let waAkgSynced = 0;
      if (activeGatewayProvider === 'wa-akg' && schoolId) {
        const syncRes = await syncWaAkgChats(schoolId);
        waAkgSynced = syncRes.synced;
        if (syncRes.error) {
          toast.info(`WA-AKG: ${syncRes.error}`);
        }
      }

      if (schoolId) {
        localStorage.removeItem(getSchoolStorageKey('wa_auto_sync_disabled', schoolId));
      }

      await refetchDbConversations();
      await refetchDbMessages();
      await queryClient.invalidateQueries({ queryKey: ['inbox-db-messages'] });
      await queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations'] });

      const providerLabel = activeGatewayProvider === 'wa-akg' ? 'WA-AKG' : 'Uazapi';
      if (isOnline) {
        if (activeGatewayProvider === 'wa-akg' && waAkgSynced > 0) {
          toast.success(`${providerLabel} online! ${waAkgSynced} conversas sincronizadas.`);
        } else {
          toast.success(`${providerLabel} online (${instanceName})! Conversas atualizadas.`);
        }
      } else {
        toast.warning(`${providerLabel}: Instância aguardando conexão no WhatsApp.`);
      }
    } catch (err: any) {
      const providerLabel = activeGatewayProvider === 'wa-akg' ? 'WA-AKG' : 'Uazapi';
      toast.error(`Erro ao sincronizar com ${providerLabel}: ${err?.message || 'Falha de rede'}`);
    } finally {
      setIsSyncing(false);
    }
  }, [refetchUazapiStatus, refetchDbConversations, refetchDbMessages, queryClient, activeGatewayProvider, schoolId]);

  // ----------------------------------------------------
  // 10. RESET WHATSAPP CONVERSATIONS & MESSAGES
  // ----------------------------------------------------
  const resetWhatsAppConversations = useCallback(async () => {
    if (!schoolId) {
      toast.error('Escola não identificada para efetuar o reset.');
      return;
    }
    try {
      // 1. Busca todas as conversas desta escola
      const { data: convs, error: fetchErr } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('school_id', schoolId);

      if (fetchErr) {
        console.warn('Erro ao consultar conversas para exclusão:', fetchErr);
      }

      const convIds = (convs || []).map((c: any) => c.id);

      // 2. Apaga mensagens vinculadas a essas conversas
      if (convIds.length > 0) {
        const { error: msgErr } = await supabase
          .from('whatsapp_messages')
          .delete()
          .in('conversation_id', convIds);
        if (msgErr) console.warn('Erro ao apagar mensagens vinculadas:', msgErr);
      }

      // 3. Apaga qualquer mensagem diretamente atrelada ao school_id
      await (supabase.from('whatsapp_messages') as any)
        .delete()
        .eq('school_id', schoolId);

      // 4. Apaga as conversas da escola
      const { error: convErr } = await supabase
        .from('whatsapp_conversations')
        .delete()
        .eq('school_id', schoolId);

      if (convErr) {
        console.warn('Erro ao apagar conversas:', convErr);
      }

      // 5. Limpa caches locais e marca flag anti-autosync para não repuxar do celular imediatamente
      localStorage.removeItem('purple_whatsapp_active_conv');
      localStorage.setItem(getSchoolStorageKey('wa_auto_sync_disabled', schoolId), 'true');
      setActiveConversationId(null);
      setOptimisticMessages([]);

      // 6. Invalida queries do React Query
      await queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations'] });
      await queryClient.invalidateQueries({ queryKey: ['inbox-db-messages'] });
      await refetchDbConversations();
      await refetchDbMessages();

      toast.success('Todas as conversas do WhatsApp foram resetadas com sucesso!');
    } catch (err: any) {
      console.error('Erro ao resetar WhatsApp:', err);
      toast.error('Erro ao resetar conversas do WhatsApp: ' + (err?.message || 'Falha de comunicação'));
    }
  }, [schoolId, queryClient, refetchDbConversations, refetchDbMessages]);

  return {
    conversations: permittedConversations,
    allConversations: effectiveConversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    activeMessages,
    allAvailableSectors,
    userPermittedSectors,
    isDirector,
    sendMessage,
    transferSector,
    changeTicketStatus,
    syncWithUaizap,
    resetWhatsAppConversations,
    isSyncing,
    uaizapStatus,
    activeGatewayProvider,
    createNewConversation,
    isLoadingDbConversations,
    onlyFromToday,
    setOnlyFromToday,
    accessConversation,
    resolveConversation,
    startTicket,
    sendAutoGreetingMessage,
    chatSettings,
  };
}

type WhatsAppInboxContextValue = ReturnType<typeof useWhatsAppInboxState>;
const WhatsAppInboxContext = createContext<WhatsAppInboxContextValue | null>(null);

export function WhatsAppInboxProvider({ children }: { children: ReactNode }) {
  const value = useWhatsAppInboxState();
  return createElement(WhatsAppInboxContext.Provider, { value }, children);
}

export function useWhatsAppInboxSafe() {
  return useContext(WhatsAppInboxContext);
}

export function useWhatsAppInbox() {
  const value = useContext(WhatsAppInboxContext);
  if (!value) {
    console.warn('useWhatsAppInbox foi chamado fora de WhatsAppInboxProvider.');
    return {
      allAvailableSectors: [],
      conversations: [],
      activeConversation: null,
      messages: [],
      isLoading: false,
      unreadCount: 0,
    } as any;
  }
  return value;
}
