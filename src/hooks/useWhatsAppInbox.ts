import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  WhatsAppChatConversation,
  WhatsAppChatMessage,
  WhatsAppSectorItem,
  TriggerMatchResult,
} from '@/types/mensagens';
import { useWhatsAppTriggers } from '@/hooks/useWhatsAppTriggers';
import { toast } from 'sonner';

// Initial mock conversations for schools without active WhatsApp instance paired
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

export function useWhatsAppInbox() {
  const { profile, school, roles, sectors: userAssignedSectors, hasSectorAccess } = useAuth();
  const queryClient = useQueryClient();
  const { evaluateMessage } = useWhatsAppTriggers();

  // Local state cache for reactive responsiveness and fallback
  const [conversations, setConversations] = useState<WhatsAppChatConversation[]>(() => {
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

  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    INITIAL_DEMO_CONVERSATIONS[0].id
  );

  const [messagesMap, setMessagesMap] = useState<Record<string, WhatsAppChatMessage[]>>(() => {
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
    localStorage.setItem('purple_whatsapp_inbox_conversations', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('purple_whatsapp_inbox_messages', JSON.stringify(messagesMap));
  }, [messagesMap]);

  // Fetch real sectors from Supabase
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

  // Permissions Filter: Director or SuperAdmin sees ALL. Others only see authorized sectors.
  const isDirector = roles.includes('director') || roles.includes('admin');

  const userPermittedSectors = useMemo(() => {
    if (isDirector) {
      return allAvailableSectors;
    }
    // Filter sectors by user's assigned sectors
    return allAvailableSectors.filter(
      (sec) =>
        hasSectorAccess(sec.id) ||
        userAssignedSectors.some((s) => s.id === sec.id || s.name.toLowerCase() === sec.name.toLowerCase())
    );
  }, [isDirector, allAvailableSectors, hasSectorAccess, userAssignedSectors]);

  // Filter conversations according to sector permissions
  const permittedConversations = useMemo(() => {
    if (isDirector) {
      return conversations;
    }
    return conversations.filter((c) => {
      if (!c.sector_id) return true; // Unassigned is visible to all
      return (
        hasSectorAccess(c.sector_id) ||
        userPermittedSectors.some((s) => s.id === c.sector_id)
      );
    });
  }, [conversations, isDirector, hasSectorAccess, userPermittedSectors]);

  // Active conversation object
  const activeConversation = useMemo(() => {
    return permittedConversations.find((c) => c.id === activeConversationId) || permittedConversations[0] || null;
  }, [permittedConversations, activeConversationId]);

  // Active messages list
  const activeMessages = useMemo(() => {
    if (!activeConversation) return [];
    return messagesMap[activeConversation.id] || [];
  }, [messagesMap, activeConversation]);

  // Send message action
  const sendMessage = useCallback(
    async (text: string, mediaFile?: { url: string; filename: string; type: 'image' | 'document' }) => {
      if (!activeConversation) return;
      if (!text.trim() && !mediaFile) return;

      const newMsgId = `msg-${Date.now()}`;
      const newMsg: WhatsAppChatMessage = {
        id: newMsgId,
        conversation_id: activeConversation.id,
        body: text,
        direction: 'outgoing',
        message_type: mediaFile ? mediaFile.type : 'text',
        media_url: mediaFile?.url,
        media_filename: mediaFile?.filename,
        status: 'sent',
        created_at: new Date().toISOString(),
        sender_name: profile?.full_name || 'Atendente Purple Edu',
      };

      // Add to thread
      setMessagesMap((prev) => ({
        ...prev,
        [activeConversation.id]: [...(prev[activeConversation.id] || []), newMsg],
      }));

      // Update conversation in list
      setConversations((prev) =>
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

      // Attempt to dispatch via Supabase/Evolution if instance exists
      try {
        if (school?.id) {
          await supabase.from('whatsapp_messages').insert({
            conversation_id: activeConversation.id,
            body: text,
            direction: 'outgoing',
            message_type: mediaFile ? mediaFile.type : 'text',
            media_url: mediaFile?.url,
            media_filename: mediaFile?.filename,
            status: 'sent',
          });
        }
      } catch (err) {
        // Fallback silently if table not synced yet
      }
    },
    [activeConversation, profile?.full_name, school?.id]
  );

  // Transfer conversation to another sector
  const transferSector = useCallback(
    (conversationId: string, targetSectorId: string) => {
      const sectorObj = allAvailableSectors.find((s) => s.id === targetSectorId);
      const sectorName = sectorObj ? sectorObj.name : targetSectorId;

      setConversations((prev) =>
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

      // Add system message
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

      setMessagesMap((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), systemMsg],
      }));

      toast.success(`Conversa transferida para o setor "${sectorName}"!`);

      // Update Supabase if available
      supabase
        .from('whatsapp_conversations')
        .update({ sector_id: targetSectorId })
        .eq('id', conversationId)
        .then(() => {});
    },
    [allAvailableSectors]
  );

  // Change conversation status (ticket)
  const changeTicketStatus = useCallback(
    (conversationId: string, newStatus: 'open' | 'pending' | 'resolved' | 'closed') => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, ticket_status: newStatus } : c))
      );

      const statusLabels = {
        open: 'Aberto',
        pending: 'Pendente',
        resolved: 'Resolvido',
        closed: 'Encerrado',
      };

      toast.info(`Atendimento marcado como "${statusLabels[newStatus]}".`);

      supabase
        .from('whatsapp_conversations')
        .update({ ticket_status: newStatus })
        .eq('id', conversationId)
        .then(() => {});
    },
    []
  );

  // Simulate an incoming WhatsApp message with automatic Trigger evaluation
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
      // Find or create conversation
      let targetConv = conversations.find((c) => c.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
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
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversationId(convId);
      } else {
        setConversations((prev) =>
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

      setMessagesMap((prev) => ({
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
        // Trigger matched! Auto-respond with realistic delay
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

          setMessagesMap((prev) => ({
            ...prev,
            [convId!]: [...(prev[convId!] || []), autoReply],
          }));

          // If trigger specifies target sector, transfer automatically!
          if (matchResult.targetSectorId) {
            const destSector = allAvailableSectors.find((s) => s.id === matchResult.targetSectorId);
            const destName = destSector?.name || matchResult.targetSectorId;
            setConversations((prev) =>
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
    [conversations, evaluateMessage, school?.name, allAvailableSectors]
  );

  return {
    conversations: permittedConversations,
    allConversations: conversations,
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
  };
}
