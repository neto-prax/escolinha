import { createContext, createElement, ReactNode, useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  WhatsAppChatConversation,
  WhatsAppChatMessage,
  WhatsAppSectorItem,
} from '@/types/mensagens';
import { toast } from 'sonner';

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

function useWhatsAppInboxState() {
  const { profile, school, roles, sectors: userAssignedSectors, hasSectorAccess } = useAuth();
  const queryClient = useQueryClient();

  const schoolId = profile?.school_id || school?.id || null;

  // Filter messages starting from today (default: true)
  const [onlyFromToday, setOnlyFromToday] = useState<boolean>(() => {
    const saved = localStorage.getItem('purple_whatsapp_only_today');
    return saved !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('purple_whatsapp_only_today', String(onlyFromToday));
  }, [onlyFromToday]);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    return localStorage.getItem('purple_whatsapp_active_conv') || null;
  });

  useEffect(() => {
    if (activeConversationId) {
      localStorage.setItem('purple_whatsapp_active_conv', activeConversationId);
    }
  }, [activeConversationId]);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [optimisticMessages, setOptimisticMessages] = useState<WhatsAppChatMessage[]>([]);

  // ----------------------------------------------------
  // 1. QUERY UAZAPI STATUS
  // ----------------------------------------------------
  const {
    data: uazapiRawStatus,
    isLoading: isCheckingUazapi,
    refetch: refetchUazapiStatus,
  } = useQuery({
    queryKey: ['uazapi-status'],
    queryFn: async () => {
      try {
        const { data: res, error } = await supabase.functions.invoke('uazapi', {
          body: { action: 'status' },
        });
        if (error) {
          console.warn('Uazapi status error:', error);
          return null;
        }
        return res;
      } catch (err) {
        console.warn('Uazapi status exception:', err);
        return null;
      }
    },
    staleTime: Infinity,
  });

  const uaizapStatus: UaizapStatusData = useMemo(() => {
    const isConn = Boolean(
      uazapiRawStatus?.status?.connected ||
      uazapiRawStatus?.instance?.status === 'connected' ||
      uazapiRawStatus?.connected
    );
    const instance = uazapiRawStatus?.instance;

    return {
      connected: isConn,
      instanceName: instance?.name || 'Neto',
      profileName: instance?.profileName || 'Neto Oliver',
      ownerPhone: instance?.owner || '557583690441',
      profilePicUrl: instance?.profilePicUrl,
      statusText: isConn ? 'Conectado (Online)' : 'Desconectado',
      lastChecked: new Date().toISOString(),
      isChecking: isCheckingUazapi,
    };
  }, [uazapiRawStatus, isCheckingUazapi]);

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
      { id: 'pedagogico', name: 'Pedagógico', description: 'Coordenação, professores e rendimento escolar', color: '#8b5cf6', is_active: true },
      { id: 'suporte', name: 'Suporte & Recepção', description: 'Dúvidas gerais e recepção', color: '#64748b', is_active: true },
    ];

    if (dbSectors.length === 0) return defaultSectors;

    return dbSectors.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description || null,
      color: '#6366f1',
      is_active: s.is_active,
    }));
  }, [dbSectors]);

  // Helper to enrich student info from local registered students
  const getSchoolAlunos = useCallback((): any[] => {
    try {
      const raw = localStorage.getItem('escolinha_alunos');
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }, []);

  const findStudentInfo = useCallback(
    (phone: string, contactName: string) => {
      const alunos = getSchoolAlunos();
      if (alunos.length === 0) return null;

      const cleanPhone = phone.replace(/\D/g, '');
      const last8 = cleanPhone.slice(-8);

      const found = alunos.find((a: any) => {
        const aPhone = String(a.responsavel_telefone || a.telefone_responsavel || a.telefone || a.celular || '').replace(/\D/g, '');
        if (aPhone && last8 && aPhone.endsWith(last8)) return true;

        if (contactName && a.responsavel) {
          const cLower = contactName.toLowerCase().trim();
          const rLower = a.responsavel.toLowerCase().trim();
          if (cLower === rLower || cLower.includes(rLower) || rLower.includes(cLower)) {
            return true;
          }
        }
        return false;
      });

      if (!found) return null;

      return {
        id: found.id || `alu-${found.nome}`,
        name: found.nome,
        turma: found.turma || 'Turma Regular',
        responsavel: found.responsavel || contactName,
        status_financeiro: (found.status_financeiro || 'em_dia') as 'em_dia' | 'pendente' | 'atrasado',
        foto_url: found.foto_url || null,
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
            last_message, last_message_at, unread_count, tags, assigned_to, created_at,
            sector:sectors(id, name)
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
          return convs
            .filter((c: any) => c.last_message_at && c.last_message_at >= todayStartIso)
            .map((c: any) => ({ ...c, has_today_activity: true }));
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
  });

  // Realtime subscription for conversations and messages
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-inbox-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_conversations', filter: schoolId ? `school_id=eq.${schoolId}` : undefined },
        () => {
          queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['inbox-db-messages'] });
          queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, schoolId]);

  // Map DB conversations into WhatsAppChatConversation format
  const mappedDbConversations: WhatsAppChatConversation[] = useMemo(() => {
    return dbConversations.map((row: any) => {
      const sectorObj = allAvailableSectors.find((s) => s.id === row.sector_id);
      const studentEnriched = findStudentInfo(row.phone, row.contact_name || row.phone);

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
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          row.contact_name || row.phone
        )}`,
        tags: row.tags || ['WhatsApp'],
        assigned_to: row.assigned_to,
        assigned_name: null,
        student_info: studentEnriched,
      };
    });
  }, [dbConversations, allAvailableSectors, findStudentInfo]);

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
        aluno.responsavel_telefone || aluno.telefone_responsavel || aluno.telefone || aluno.celular || ''
      ).replace(/\D/g, '');

      if (!rawPhone || rawPhone.length < 8) continue;
      const cleanPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
      if (seenPhones.has(cleanPhone)) continue;
      seenPhones.add(cleanPhone);

      const contactName = aluno.responsavel || aluno.nome_responsavel || aluno.nome || 'Responsável';

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
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(contactName)}`,
        tags: [aluno.turma || 'Aluno Cadastrado'],
        student_info: {
          id: aluno.id || `alu-${aluno.nome}`,
          name: aluno.nome,
          turma: aluno.turma || 'Turma Regular',
          responsavel: contactName,
          status_financeiro: aluno.status_financeiro || 'em_dia',
          foto_url: aluno.foto_url,
        },
      });
    }

    return list;
  }, [mappedDbConversations, getSchoolAlunos]);

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
    return roles.includes('director') || roles.includes('admin') || roles.length === 0;
  }, [roles]);

  const userPermittedSectors = useMemo(() => {
    if (isDirector) return allAvailableSectors;
    const assignedIds = new Set(userAssignedSectors.map((s) => s.id));
    return allAvailableSectors.filter((sector) => assignedIds.has(sector.id));
  }, [isDirector, allAvailableSectors, userAssignedSectors]);

  const permittedConversations = useMemo(() => {
    if (isDirector) return effectiveConversations;
    return effectiveConversations.filter((c) => {
      if (!c.sector_id) return true;
      return hasSectorAccess(c.sector_id);
    });
  }, [effectiveConversations, isDirector, hasSectorAccess]);

  // Ensure an active conversation is selected
  useEffect(() => {
    if (!activeConversationId && permittedConversations.length > 0) {
      setActiveConversationId(permittedConversations[0].id);
    }
  }, [activeConversationId, permittedConversations]);

  const activeConversation = useMemo(() => {
    return permittedConversations.find((c) => c.id === activeConversationId) || permittedConversations[0] || null;
  }, [permittedConversations, activeConversationId]);

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
      return data || [];
    },
    enabled: !!activeConversation?.id,
  });

  // Active messages list combining DB messages and pending optimistic messages
  const activeMessages: WhatsAppChatMessage[] = useMemo(() => {
    if (!activeConversation) return [];

    const dbList: WhatsAppChatMessage[] = dbMessages.map((m: any) => ({
      id: m.id,
      conversation_id: m.conversation_id,
      body: m.body,
      direction: m.direction as 'incoming' | 'outgoing',
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
        };
        return typeMap[rawType] || (rawType as WhatsAppChatMessage['message_type']);
      })(),
      media_url: m.media_url,
      media_caption: m.media_caption,
      media_filename: m.media_filename,
      status: (m.status || 'sent') as any,
      created_at: m.created_at,
      sender_name: m.direction === 'outgoing' ? profile?.full_name || 'Escola' : activeConversation.contact_name,
    }));

    // Filter optimistic messages for this conversation that haven't appeared in DB yet
    const pending = optimisticMessages.filter((opt) => {
      if (opt.conversation_id !== activeConversation.id) return false;
      return !dbList.some((dbMsg) => dbMsg.body === opt.body && Math.abs(new Date(dbMsg.created_at).getTime() - new Date(opt.created_at).getTime()) < 10000);
    });

    return [...dbList, ...pending];
  }, [activeConversation, dbMessages, optimisticMessages, profile?.full_name]);

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

      // Optimistic message
      const optMsg: WhatsAppChatMessage = {
        id: tempId,
        conversation_id: activeConversation.id,
        body: text,
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
              caption: text,
              fileName: mediaFile.filename,
            }
          : {
              phone: formattedPhone,
              message: text,
            };

        const uazRes = await supabase.functions.invoke('uazapi', {
          body: { action: uazAction, data: uazData },
        });

        if (uazRes.error || (uazRes.data as any)?.error) {
          console.warn('Uazapi dispatch error:', uazRes.error || (uazRes.data as any)?.error);
        } else {
          dispatched = true;
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
            body: text,
            direction: 'outgoing',
            message_type: mediaFile ? mediaFile.type : 'text',
            media_url: mediaFile?.url,
            media_filename: mediaFile?.filename,
            status: dispatched ? 'sent' : 'failed',
            created_at: nowIso,
          });

          await supabase
            .from('whatsapp_conversations')
            .update({
              last_message: text,
              last_message_at: nowIso,
              unread_count: 0,
            })
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
    [activeConversation, isDbUuid, profile?.full_name, schoolId, queryClient]
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
        await supabase
          .from('whatsapp_conversations')
          .update({ sector_id: targetSectorId })
          .eq('id', conversationId);

        queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations'] });
      }

      toast.success(`Conversa transferida para o setor "${sectorName}"!`);
    },
    [allAvailableSectors, queryClient]
  );

  // ----------------------------------------------------
  // 7. CHANGE TICKET STATUS
  // ----------------------------------------------------
  const changeTicketStatus = useCallback(
    async (conversationId: string, newStatus: 'open' | 'pending' | 'resolved' | 'closed') => {
      const statusLabels = {
        open: 'Aberto',
        pending: 'Pendente',
        resolved: 'Resolvido',
        closed: 'Encerrado',
      };

      const isDb = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId);
      if (isDb) {
        await supabase
          .from('whatsapp_conversations')
          .update({ ticket_status: newStatus })
          .eq('id', conversationId);

        queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations'] });
      }

      toast.info(`Atendimento marcado como "${statusLabels[newStatus]}".`);
    },
    [queryClient]
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
          await supabase.functions.invoke('uazapi', {
            body: {
              action: 'send-text',
              data: {
                phone: formattedPhone,
                message: initialMessage.trim(),
              },
            },
          });
          toast.success(`Mensagem enviada para ${contactName}!`);
        } catch {
          // ignore
        }
      }

      return convId;
    },
    [schoolId, queryClient]
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

      await refetchDbConversations();
      await refetchDbMessages();
      await queryClient.invalidateQueries({ queryKey: ['inbox-db-messages'] });
      await queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations'] });

      if (isOnline) {
        toast.success(`Uazapi online (${instanceName})! Conversas atualizadas.`);
      } else {
        toast.warning('Uazapi: Instância aguardando conexão no WhatsApp.');
      }
    } catch (err: any) {
      toast.error(`Erro ao sincronizar com Uazapi: ${err?.message || 'Falha de rede'}`);
    } finally {
      setIsSyncing(false);
    }
  }, [refetchUazapiStatus, refetchDbConversations, refetchDbMessages, queryClient]);

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
    isSyncing,
    uaizapStatus,
    createNewConversation,
    isLoadingDbConversations,
    onlyFromToday,
    setOnlyFromToday,
  };
}

type WhatsAppInboxContextValue = ReturnType<typeof useWhatsAppInboxState>;
const WhatsAppInboxContext = createContext<WhatsAppInboxContextValue | null>(null);

export function WhatsAppInboxProvider({ children }: { children: ReactNode }) {
  const value = useWhatsAppInboxState();
  return createElement(WhatsAppInboxContext.Provider, { value }, children);
}

export function useWhatsAppInbox() {
  const value = useContext(WhatsAppInboxContext);
  if (!value) throw new Error('useWhatsAppInbox deve ser usado dentro de WhatsAppInboxProvider');
  return value;
}
