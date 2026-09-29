import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  WhatsAppChatConversation,
  WhatsAppChatMessage,
  WhatsAppSectorItem,
} from '@/types/mensagens';
import { useWhatsAppTriggers } from '@/hooks/useWhatsAppTriggers';
import { toast } from 'sonner';

// Initial mock conversations as fallback/demo mode when database is empty
const INITIAL_DEMO_CONVERSATIONS: WhatsAppChatConversation[] = [
  {
    id: 'conv-demo-1',
    phone: '5511988887766',
    contact_name: 'Mariana Silveira',
    sector_id: 'financeiro',
    sector_name: 'Financeiro',
    ticket_status: 'open',
    priority: 'high',
    last_message: 'Olá, gostaria de saber se o boleto com desconto vence hoje ou amanhã?',
    last_message_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    unread_count: 2,
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    tags: ['Responsável', '5º Ano A', 'Mensalidade'],
    assigned_name: 'Carla (Financeiro)',
    student_info: {
      id: 'alu-1',
      name: 'Lucas Silveira',
      turma: '5º Ano - Ensino Fundamental I',
      responsavel: 'Mariana Silveira (Mãe)',
      status_financeiro: 'em_dia',
      foto_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=120&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'conv-demo-2',
    phone: '5511977776655',
    contact_name: 'Carlos Eduardo Santos',
    sector_id: 'comercial',
    sector_name: 'Comercial & Matrículas',
    ticket_status: 'open',
    priority: 'normal',
    last_message: 'Boa tarde! Qual a documentação e valores para matrícula no 1º ano?',
    last_message_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    unread_count: 1,
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    tags: ['Novo Interessado', 'Matrícula 2026'],
    assigned_name: 'Roberto (Vendas)',
    student_info: {
      id: 'alu-2',
      name: 'Sofia Santos (Candidata)',
      turma: '1º Ano - Ensino Fundamental',
      responsavel: 'Carlos Santos (Pai)',
      status_financeiro: 'em_dia',
    },
  },
  {
    id: 'conv-demo-3',
    phone: '5511966665544',
    contact_name: 'Renata Vasconcelos',
    sector_id: 'pedagogico',
    sector_name: 'Pedagógico',
    ticket_status: 'pending',
    priority: 'normal',
    last_message: 'Oi professora, o Pedro esqueceu a agenda na escola ontem?',
    last_message_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    unread_count: 0,
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&auto=format&fit=crop&q=80',
    tags: ['Pré II', 'Recado de Sala'],
    assigned_name: 'Tia Juliana',
    student_info: {
      id: 'alu-3',
      name: 'Pedro Vasconcelos',
      turma: 'Educação Infantil - Pré II',
      responsavel: 'Renata Vasconcelos',
      status_financeiro: 'em_dia',
    },
  },
  {
    id: 'conv-demo-4',
    phone: '5511955554433',
    contact_name: 'Marcos Aurélio Mendes',
    sector_id: 'secretaria',
    sector_name: 'Secretaria',
    ticket_status: 'closed',
    priority: 'low',
    last_message: 'Muito obrigado! Já fiz o download da declaração assinada pelo portal.',
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    unread_count: 0,
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    tags: ['Secretaria', 'Documento Emitido'],
    assigned_name: 'Secretaria Geral',
    student_info: {
      id: 'alu-4',
      name: 'Gabriel Mendes',
      turma: '3º Ano - Ensino Fundamental',
      responsavel: 'Marcos Mendes (Pai)',
      status_financeiro: 'em_dia',
    },
  },
];

const INITIAL_DEMO_MESSAGES: Record<string, WhatsAppChatMessage[]> = {
  'conv-demo-1': [
    {
      id: 'msg-1-1',
      conversation_id: 'conv-demo-1',
      body: 'Bom dia! Gostaria de uma informação sobre o pagamento da mensalidade.',
      direction: 'incoming',
      message_type: 'text',
      status: 'read',
      created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
    {
      id: 'msg-1-2',
      conversation_id: 'conv-demo-1',
      body: 'Olá Mariana! 💳 Localizamos seu contato. Para emissão de 2ª via de boleto ou confirmação de pagamento para o aluno(a) Lucas Silveira, estou transferindo você para o nosso setor Financeiro. Um momento!',
      direction: 'outgoing',
      message_type: 'text',
      status: 'read',
      created_at: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
      is_automated: true,
      sender_name: 'Purple Bot 🤖',
    },
    {
      id: 'msg-1-3',
      conversation_id: 'conv-demo-1',
      body: 'Olá, gostaria de saber se o boleto com desconto vence hoje ou amanhã?',
      direction: 'incoming',
      message_type: 'text',
      status: 'delivered',
      created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    },
  ],
  'conv-demo-2': [
    {
      id: 'msg-2-1',
      conversation_id: 'conv-demo-2',
      body: 'Boa tarde! Qual a documentação e valores para matrícula no 1º ano?',
      direction: 'incoming',
      message_type: 'text',
      status: 'read',
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: 'msg-2-2',
      conversation_id: 'conv-demo-2',
      body: 'Olá Carlos Eduardo! 🎒 Que alegria seu interesse na nossa escola! Nossas matrículas para o período letivo estão com condições especiais. Estou transferindo seu atendimento para nossa equipe de Matrículas e Admissões agora mesmo! 📚',
      direction: 'outgoing',
      message_type: 'text',
      status: 'delivered',
      created_at: new Date(Date.now() - 1000 * 60 * 44).toISOString(),
      is_automated: true,
      sender_name: 'Purple Bot 🤖',
    },
  ],
  'conv-demo-3': [
    {
      id: 'msg-3-1',
      conversation_id: 'conv-demo-3',
      body: 'Oi professora, o Pedro esqueceu a agenda na escola ontem?',
      direction: 'incoming',
      message_type: 'text',
      status: 'read',
      created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    },
    {
      id: 'msg-3-2',
      conversation_id: 'conv-demo-3',
      body: 'Olá Renata! Guardamos a agenda dele com carinho aqui na recepção infantil. Pode passar para retirar a qualquer momento!',
      direction: 'outgoing',
      message_type: 'text',
      status: 'read',
      created_at: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
      sender_name: 'Tia Juliana (Pedagógico)',
    },
  ],
  'conv-demo-4': [
    {
      id: 'msg-4-1',
      conversation_id: 'conv-demo-4',
      body: 'Olá! Preciso da declaração de frequência do Gabriel.',
      direction: 'incoming',
      message_type: 'text',
      status: 'read',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    },
    {
      id: 'msg-4-2',
      conversation_id: 'conv-demo-4',
      body: 'Pronto, Sr. Marcos! Enviamos o documento com assinatura digital no seu e-mail e no portal.',
      direction: 'outgoing',
      message_type: 'text',
      status: 'read',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(),
      sender_name: 'Secretaria',
    },
    {
      id: 'msg-4-3',
      conversation_id: 'conv-demo-4',
      body: 'Muito obrigado! Já fiz o download da declaração assinada pelo portal.',
      direction: 'incoming',
      message_type: 'text',
      status: 'read',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
  ],
};

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

export function useWhatsAppInbox() {
  const { profile, school, roles, sectors: userAssignedSectors, hasSectorAccess } = useAuth();
  const queryClient = useQueryClient();
  const { evaluateMessage } = useWhatsAppTriggers();

  // Mode: real database vs demo
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('purple_whatsapp_demo_mode');
    return saved !== null ? saved === 'true' : false;
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Fallback / local cache storage
  const [localConversations, setLocalConversations] = useState<WhatsAppChatConversation[]>(() => {
    const saved = localStorage.getItem('purple_whatsapp_inbox_conversations');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_DEMO_CONVERSATIONS;
  });

  const [localMessagesMap, setLocalMessagesMap] = useState<Record<string, WhatsAppChatMessage[]>>(() => {
    const saved = localStorage.getItem('purple_whatsapp_inbox_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_DEMO_MESSAGES;
  });

  // Save changes to localStorage for continuity
  useEffect(() => {
    localStorage.setItem('purple_whatsapp_inbox_conversations', JSON.stringify(localConversations));
  }, [localConversations]);

  useEffect(() => {
    localStorage.setItem('purple_whatsapp_inbox_messages', JSON.stringify(localMessagesMap));
  }, [localMessagesMap]);

  useEffect(() => {
    localStorage.setItem('purple_whatsapp_demo_mode', String(isDemoMode));
  }, [isDemoMode]);

  // ----------------------------------------------------
  // 1. QUERY UAIZAP LIVE CONNECTION STATUS
  // ----------------------------------------------------
  const {
    data: uaizapRawStatus,
    isLoading: isCheckingUaizap,
    refetch: refetchUaizapStatus,
  } = useQuery({
    queryKey: ['uazapi-status'],
    queryFn: async () => {
      try {
        const { data: res, error } = await supabase.functions.invoke('uazapi', {
          body: { action: 'status' },
        });

        if (error) {
          console.warn('Uaizap status invocation error:', error);
          return null;
        }
        return res;
      } catch (err) {
        console.warn('Uaizap status check caught error:', err);
        return null;
      }
    },
    refetchInterval: 25000,
  });

  const uaizapStatus: UaizapStatusData = useMemo(() => {
    const isConn = Boolean(uaizapRawStatus?.status?.connected);
    const instance = uaizapRawStatus?.instance;

    return {
      connected: isConn,
      instanceName: instance?.name || 'Uaizap Principal',
      profileName: instance?.profileName || 'Neto Oliver',
      ownerPhone: instance?.owner || '557583690441',
      profilePicUrl: instance?.profilePicUrl,
      statusText: isConn ? 'Conectado (Online)' : 'Desconectado',
      lastChecked: new Date().toISOString(),
      isChecking: isCheckingUaizap,
    };
  }, [uaizapRawStatus, isCheckingUaizap]);

  // ----------------------------------------------------
  // 2. FETCH REAL SECTORS FROM SUPABASE
  // ----------------------------------------------------
  const { data: dbSectors = [] } = useQuery({
    queryKey: ['inbox-sectors', school?.id],
    queryFn: async () => {
      if (!school?.id) return [];
      const { data, error } = await supabase
        .from('sectors')
        .select('*')
        .eq('school_id', school.id)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.warn('Error fetching sectors:', error);
        return [];
      }
      return data;
    },
    enabled: !!school?.id,
  });

  // Standard institution sectors
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

  // ----------------------------------------------------
  // 3. FETCH REAL CONVERSATIONS FROM SUPABASE
  // ----------------------------------------------------
  const {
    data: dbConversations = [],
    refetch: refetchDbConversations,
    isLoading: isLoadingDbConversations,
  } = useQuery({
    queryKey: ['inbox-db-conversations', school?.id],
    queryFn: async () => {
      if (!school?.id) return [];

      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          sector:sectors(id, name)
        `)
        .eq('school_id', school.id)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.warn('Error fetching whatsapp_conversations:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!school?.id,
  });

  // Realtime subscription for whatsapp_conversations and whatsapp_messages
  useEffect(() => {
    if (!school?.id) return;

    const channel = supabase
      .channel('inbox-whatsapp-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
          filter: `school_id=eq.${school.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations', school.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['inbox-db-messages'] });
          queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations', school.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [school?.id, queryClient]);

  // ----------------------------------------------------
  // 4. STUDENT ENRICHMENT HELPER
  // ----------------------------------------------------
  const findStudentInfo = useCallback((phone: string, contactName: string) => {
    try {
      const raw = localStorage.getItem('escolinha_alunos');
      if (!raw) return null;
      const alunos = JSON.parse(raw);
      if (!Array.isArray(alunos)) return null;

      const cleanPhone = phone.replace(/\D/g, '');
      const match = alunos.find((a: any) => {
        const telAluno = String(a.telefone || a.celular || '').replace(/\D/g, '');
        const telResp = String(
          a.responsavel_telefone || a.telefone_responsavel || a.contato_responsavel || ''
        ).replace(/\D/g, '');

        if (cleanPhone && cleanPhone.length >= 8) {
          if (telAluno && (telAluno.includes(cleanPhone) || cleanPhone.includes(telAluno))) return true;
          if (telResp && (telResp.includes(cleanPhone) || cleanPhone.includes(telResp))) return true;
        }

        const nameLower = contactName.toLowerCase().trim();
        if (nameLower && a.responsavel && a.responsavel.toLowerCase().includes(nameLower)) return true;
        if (nameLower && a.nome && a.nome.toLowerCase().includes(nameLower)) return true;
        return false;
      });

      if (match) {
        return {
          id: match.id || `alu-${Date.now()}`,
          name: match.nome,
          turma: match.turma || 'Turma Regular',
          responsavel: match.responsavel || contactName,
          status_financeiro: (match.status_financeiro || 'em_dia') as 'em_dia' | 'pendente' | 'atrasado',
          foto_url: match.foto_url || match.foto || null,
        };
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  // Map Supabase rows to WhatsAppChatConversation format
  const mappedDbConversations: WhatsAppChatConversation[] = useMemo(() => {
    if (!dbConversations || dbConversations.length === 0) return [];

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

  // Combine real DB conversations or fallback to local/demo
  const effectiveConversations = useMemo(() => {
    // If not in demo mode and DB has conversations, prioritize DB
    if (!isDemoMode && mappedDbConversations.length > 0) {
      return mappedDbConversations;
    }
    // If user explicitly activated demo mode or DB has 0 rows, use local conversations
    return localConversations;
  }, [isDemoMode, mappedDbConversations, localConversations]);

  // Permissions Filter: Director or SuperAdmin sees ALL. Others only see authorized sectors.
  const isDirector = roles.includes('director') || roles.includes('admin');

  const userPermittedSectors = useMemo(() => {
    if (isDirector) {
      return allAvailableSectors;
    }
    return allAvailableSectors.filter(
      (sec) =>
        hasSectorAccess(sec.id) ||
        userAssignedSectors.some((s) => s.id === sec.id || s.name.toLowerCase() === sec.name.toLowerCase())
    );
  }, [isDirector, allAvailableSectors, hasSectorAccess, userAssignedSectors]);

  // Filter conversations according to sector permissions
  const permittedConversations = useMemo(() => {
    if (isDirector) {
      return effectiveConversations;
    }
    return effectiveConversations.filter((c) => {
      if (!c.sector_id) return true; // Unassigned is visible to all
      return (
        hasSectorAccess(c.sector_id) ||
        userPermittedSectors.some((s) => s.id === c.sector_id)
      );
    });
  }, [effectiveConversations, isDirector, hasSectorAccess, userPermittedSectors]);

  // Set default active conversation if none selected
  useEffect(() => {
    if (!activeConversationId && permittedConversations.length > 0) {
      setActiveConversationId(permittedConversations[0].id);
    }
  }, [activeConversationId, permittedConversations]);

  // Active conversation object
  const activeConversation = useMemo(() => {
    return permittedConversations.find((c) => c.id === activeConversationId) || permittedConversations[0] || null;
  }, [permittedConversations, activeConversationId]);

  // ----------------------------------------------------
  // 5. FETCH REAL MESSAGES FOR ACTIVE CONVERSATION
  // ----------------------------------------------------
  const isDbActiveConversation = Boolean(
    activeConversation?.id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeConversation.id)
  );

  const { data: dbMessages = [] } = useQuery({
    queryKey: ['inbox-db-messages', activeConversation?.id],
    queryFn: async () => {
      if (!activeConversation?.id || !isDbActiveConversation) return [];

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', activeConversation.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Error fetching whatsapp_messages:', error);
        return [];
      }
      return data || [];
    },
    enabled: isDbActiveConversation,
  });

  // Active messages list (combines DB messages or local messages)
  const activeMessages: WhatsAppChatMessage[] = useMemo(() => {
    if (!activeConversation) return [];

    if (isDbActiveConversation && dbMessages.length > 0) {
      return dbMessages.map((m: any) => ({
        id: m.id,
        conversation_id: m.conversation_id,
        body: m.body,
        direction: (m.direction || 'incoming') as 'incoming' | 'outgoing',
        message_type: (m.message_type || 'text') as any,
        media_url: m.media_url,
        media_caption: m.media_caption,
        media_filename: m.media_filename,
        status: (m.status || 'sent') as any,
        created_at: m.created_at,
        sender_name: m.direction === 'outgoing' ? profile?.full_name || 'Purple Edu' : activeConversation.contact_name,
        is_automated: Boolean(m.is_quick_reply),
        reply_to_id: m.reply_to_id,
      }));
    }

    return localMessagesMap[activeConversation.id] || [];
  }, [activeConversation, isDbActiveConversation, dbMessages, localMessagesMap, profile?.full_name]);

  // ----------------------------------------------------
  // 6. DISPATCH REAL MESSAGE VIA UAIZAP
  // ----------------------------------------------------
  const sendMessage = useCallback(
    async (text: string, mediaFile?: { url: string; filename: string; type: 'image' | 'document' }) => {
      if (!activeConversation) return;
      if (!text.trim() && !mediaFile) return;

      const tempMsgId = `msg-out-${Date.now()}`;
      const newMsg: WhatsAppChatMessage = {
        id: tempMsgId,
        conversation_id: activeConversation.id,
        body: text,
        direction: 'outgoing',
        message_type: mediaFile ? mediaFile.type : 'text',
        media_url: mediaFile?.url,
        media_filename: mediaFile?.filename,
        status: 'sending',
        created_at: new Date().toISOString(),
        sender_name: profile?.full_name || 'Purple Edu',
      };

      // 1. Optimistic update
      setLocalMessagesMap((prev) => ({
        ...prev,
        [activeConversation.id]: [...(prev[activeConversation.id] || []), newMsg],
      }));

      setLocalConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? {
                ...c,
                last_message: text || (mediaFile ? `[Arquivo: ${mediaFile.filename}]` : ''),
                last_message_at: new Date().toISOString(),
                unread_count: 0,
              }
            : c
        )
      );

      // 2. Dispatch real message via Uaizap (Edge Function)
      let dispatched = false;
      let dispatchError: string | null = null;
      const phoneDigits = activeConversation.phone.replace(/\D/g, '');
      const formattedPhone = phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`;

      try {
        const uazRes = await supabase.functions.invoke('uazapi', {
          body: {
            action: mediaFile ? 'send-media' : 'send-text',
            data: mediaFile
              ? {
                  phone: formattedPhone,
                  mediaType: mediaFile.type,
                  mediaUrl: mediaFile.url,
                  fileName: mediaFile.filename,
                  caption: text,
                }
              : {
                  phone: formattedPhone,
                  message: text,
                },
          },
        });

        if (uazRes.error || (uazRes.data as any)?.error) {
          console.warn('Uaizap dispatch warning:', uazRes.error || (uazRes.data as any)?.error);
          dispatchError = uazRes.error?.message || (uazRes.data as any)?.error;
        } else {
          dispatched = true;
        }
      } catch (err: any) {
        console.warn('Uaizap dispatch caught error:', err);
        dispatchError = err?.message || 'Erro ao conectar à API Uaizap';
      }

      // Update message status in local map
      setLocalMessagesMap((prev) => ({
        ...prev,
        [activeConversation.id]: (prev[activeConversation.id] || []).map((m) =>
          m.id === tempMsgId ? { ...m, status: dispatched ? 'sent' : 'failed' } : m
        ),
      }));

      // 3. Persist to Supabase if DB conversation
      const isDbUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        activeConversation.id
      );

      if (isDbUuid && school?.id) {
        try {
          await supabase.from('whatsapp_messages').insert({
            conversation_id: activeConversation.id,
            body: text,
            direction: 'outgoing',
            message_type: mediaFile ? mediaFile.type : 'text',
            media_url: mediaFile?.url,
            media_filename: mediaFile?.filename,
            status: dispatched ? 'sent' : 'failed',
          });

          await supabase
            .from('whatsapp_conversations')
            .update({
              last_message_at: new Date().toISOString(),
              unread_count: 0,
            })
            .eq('id', activeConversation.id);

          queryClient.invalidateQueries({ queryKey: ['inbox-db-messages', activeConversation.id] });
          queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations', school.id] });
        } catch (dbErr) {
          console.warn('Error persisting whatsapp_messages:', dbErr);
        }
      }

      if (dispatched) {
        toast.success('Mensagem enviada via WhatsApp (Uaizap)!');
      } else {
        toast.error(`Falha no envio WhatsApp: ${dispatchError || 'Verifique o status do Uaizap'}`);
      }
    },
    [activeConversation, profile?.full_name, school?.id, queryClient]
  );

  // ----------------------------------------------------
  // 7. TRANSFER SECTOR
  // ----------------------------------------------------
  const transferSector = useCallback(
    async (conversationId: string, targetSectorId: string) => {
      const sectorObj = allAvailableSectors.find((s) => s.id === targetSectorId);
      const sectorName = sectorObj ? sectorObj.name : targetSectorId;

      setLocalConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                sector_id: targetSectorId,
                sector_name: sectorName,
              }
            : c
        )
      );

      // System notification message
      const systemMsg: WhatsAppChatMessage = {
        id: `sys-${Date.now()}`,
        conversation_id: conversationId,
        body: `🔄 Conversa transferida para o setor *${sectorName}*`,
        direction: 'outgoing',
        message_type: 'text',
        status: 'sent',
        created_at: new Date().toISOString(),
        is_automated: true,
        sender_name: 'Sistema',
      };

      setLocalMessagesMap((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), systemMsg],
      }));

      toast.success(`Conversa transferida para o setor "${sectorName}"!`);

      // Update Supabase if DB conversation
      const isDbUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId);
      if (isDbUuid) {
        await supabase
          .from('whatsapp_conversations')
          .update({ sector_id: targetSectorId })
          .eq('id', conversationId);

        queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations'] });
      }
    },
    [allAvailableSectors, queryClient]
  );

  // ----------------------------------------------------
  // 8. CHANGE TICKET STATUS
  // ----------------------------------------------------
  const changeTicketStatus = useCallback(
    async (conversationId: string, newStatus: 'open' | 'pending' | 'resolved' | 'closed') => {
      setLocalConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, ticket_status: newStatus } : c))
      );

      const statusLabels = {
        open: 'Aberto',
        pending: 'Pendente',
        resolved: 'Resolvido',
        closed: 'Encerrado',
      };

      toast.info(`Atendimento marcado como "${statusLabels[newStatus]}".`);

      const isDbUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId);
      if (isDbUuid) {
        await supabase
          .from('whatsapp_conversations')
          .update({ ticket_status: newStatus })
          .eq('id', conversationId);

        queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations'] });
      }
    },
    [queryClient]
  );

  // ----------------------------------------------------
  // 9. CREATE NEW CONVERSATION (Start conversation with student/guardian)
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
      const sectorObj = allAvailableSectors.find((s) => s.id === sectorId);
      const sectorName = sectorObj ? sectorObj.name : 'Secretaria';

      let newConvId: string | null = null;

      // 1. Check if Supabase conversation already exists with this phone
      if (school?.id) {
        const { data: existing } = await supabase
          .from('whatsapp_conversations')
          .select('id')
          .eq('school_id', school.id)
          .eq('phone', cleanPhone)
          .maybeSingle();

        if (existing?.id) {
          newConvId = existing.id;
        } else {
          const { data: inserted, error: insErr } = await supabase
            .from('whatsapp_conversations')
            .insert({
              school_id: school.id,
              phone: cleanPhone,
              contact_name: contactName,
              sector_id: sectorId || null,
              student_id: studentId || null,
              ticket_status: 'open',
              unread_count: 0,
              last_message_at: new Date().toISOString(),
              tags: ['Novo Contato', 'WhatsApp'],
            })
            .select('id')
            .single();

          if (!insErr && inserted?.id) {
            newConvId = inserted.id;
            queryClient.invalidateQueries({ queryKey: ['inbox-db-conversations', school.id] });
          }
        }
      }

      // If not stored in DB, create in local conversations
      if (!newConvId) {
        newConvId = `conv-new-${Date.now()}`;
        const newConv: WhatsAppChatConversation = {
          id: newConvId,
          phone: cleanPhone,
          contact_name: contactName,
          sector_id: sectorId || 'secretaria',
          sector_name: sectorName,
          ticket_status: 'open',
          priority: 'normal',
          last_message: initialMessage || 'Conversa iniciada',
          last_message_at: new Date().toISOString(),
          unread_count: 0,
          avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(contactName)}`,
          tags: ['Novo Contato', 'WhatsApp'],
          student_info: studentName
            ? {
                id: studentId || `alu-${Date.now()}`,
                name: studentName,
                turma: 'Turma Regular',
                responsavel: contactName,
                status_financeiro: 'em_dia',
              }
            : null,
        };

        setLocalConversations((prev) => [newConv, ...prev]);
      }

      setActiveConversationId(newConvId);

      // If initial message provided, send it!
      if (initialMessage?.trim()) {
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
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
          toast.success(`Mensagem inicial enviada para ${contactName}!`);
        } catch {
          // ignore
        }
      }

      return newConvId;
    },
    [school?.id, allAvailableSectors, queryClient]
  );

  // ----------------------------------------------------
  // 10. MANUAL SYNC WITH UAIZAP / SUPABASE
  // ----------------------------------------------------
  const syncWithUaizap = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1. Refetch Uaizap connection status
      const statusResult = await refetchUaizapStatus();
      const isOnline = Boolean(statusResult.data?.status?.connected);
      const instanceName = statusResult.data?.instance?.profileName || statusResult.data?.instance?.name || 'Online';

      // 2. Refetch DB conversations and messages
      await refetchDbConversations();
      await queryClient.invalidateQueries({ queryKey: ['inbox-db-messages'] });

      // 3. Inform user
      if (isOnline) {
        toast.success(`Sincronização Uaizap ativa! Instância: ${instanceName} (Online)`);
      } else {
        toast.warning('Uaizap verificado: Instância aguardando conexão no WhatsApp.');
      }
    } catch (err: any) {
      toast.error(`Erro ao sincronizar com Uaizap: ${err?.message || 'Falha de rede'}`);
    } finally {
      setIsSyncing(false);
    }
  }, [refetchUaizapStatus, refetchDbConversations, queryClient]);

  // ----------------------------------------------------
  // 11. SIMULATE INCOMING MESSAGE WITH TRIGGER EVALUATION
  // ----------------------------------------------------
  const simulateIncomingMessage = useCallback(
    ({
      phone,
      contactName,
      message,
      studentName,
    }: {
      phone: string;
      contactName: string;
      message: string;
      studentName?: string;
    }) => {
      let targetConv = effectiveConversations.find(
        (c) => c.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')
      );
      let convId = targetConv?.id;

      if (!convId) {
        convId = `conv-sim-${Date.now()}`;
        const newConv: WhatsAppChatConversation = {
          id: convId,
          phone,
          contact_name: contactName,
          sector_id: 'secretaria',
          sector_name: 'Secretaria',
          ticket_status: 'open',
          priority: 'normal',
          last_message: message,
          last_message_at: new Date().toISOString(),
          unread_count: 1,
          avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(contactName)}`,
          tags: ['Simulação', 'WhatsApp'],
          student_info: studentName
            ? {
                id: `alu-sim-${Date.now()}`,
                name: studentName,
                turma: 'Turma Regular',
                responsavel: contactName,
                status_financeiro: 'em_dia',
              }
            : null,
        };
        setLocalConversations((prev) => [newConv, ...prev]);
        setActiveConversationId(convId);
      } else {
        setLocalConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  last_message: message,
                  last_message_at: new Date().toISOString(),
                  unread_count: c.unread_count + 1,
                  ticket_status: 'open',
                }
              : c
          )
        );
      }

      // Add incoming message
      const incomingMsg: WhatsAppChatMessage = {
        id: `msg-in-${Date.now()}`,
        conversation_id: convId,
        body: message,
        direction: 'incoming',
        message_type: 'text',
        status: 'delivered',
        created_at: new Date().toISOString(),
      };

      setLocalMessagesMap((prev) => ({
        ...prev,
        [convId]: [...(prev[convId] || []), incomingMsg],
      }));

      // Evaluate triggers!
      const matchResult = evaluateMessage(message, {
        contactName,
        studentName: studentName || targetConv?.student_info?.name || 'Aluno(a)',
        schoolName: school?.name || 'Purple Edu',
        currentSectorName: targetConv?.sector_name || 'Secretaria',
      });

      if (matchResult.matched && matchResult.formattedResponse) {
        setTimeout(() => {
          const autoReply: WhatsAppChatMessage = {
            id: `msg-auto-${Date.now()}`,
            conversation_id: convId!,
            body: matchResult.formattedResponse!,
            direction: 'outgoing',
            message_type: 'text',
            status: 'delivered',
            created_at: new Date().toISOString(),
            is_automated: true,
            sender_name: `Trigger: ${matchResult.trigger?.nome} ⚡`,
          };

          setLocalMessagesMap((prev) => ({
            ...prev,
            [convId!]: [...(prev[convId!] || []), autoReply],
          }));

          if (matchResult.targetSectorId) {
            const destSector = allAvailableSectors.find((s) => s.id === matchResult.targetSectorId);
            const destName = destSector?.name || matchResult.targetSectorId;
            setLocalConversations((prev) =>
              prev.map((c) =>
                c.id === convId
                  ? {
                      ...c,
                      sector_id: matchResult.targetSectorId!,
                      sector_name: destName,
                      last_message: matchResult.formattedResponse!,
                      last_message_at: new Date().toISOString(),
                    }
                  : c
              )
            );
            toast.info(`⚡ Trigger "${matchResult.trigger?.nome}" acionado! Mensagem transferida para ${destName}.`);
          } else {
            toast.info(`⚡ Trigger "${matchResult.trigger?.nome}" respondeu automaticamente.`);
          }
        }, 600);
      } else {
        toast.success(`Mensagem de ${contactName} recebida no chat!`);
      }
    },
    [effectiveConversations, evaluateMessage, school?.name, allAvailableSectors]
  );

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
    simulateIncomingMessage,
    syncWithUaizap,
    isSyncing,
    uaizapStatus,
    createNewConversation,
    isDemoMode,
    setIsDemoMode,
    isLoadingDbConversations,
  };
}
