import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Paperclip,
  Check,
  CheckCheck,
  Phone,
  User,
  GraduationCap,
  Building2,
  ArrowRightLeft,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  Bot,
  Filter,
  MoreVertical,
  Plus,
  ShieldAlert,
  ChevronRight,
  Info,
  Calendar,
  DollarSign,
  AlertCircle,
  FileText,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  Zap,
  UserCheck,
  Trash2,
  Settings,
  Shield,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWhatsAppInbox } from '@/hooks/useWhatsAppInbox';
import { useWhatsAppTriggers } from '@/hooks/useWhatsAppTriggers';
import { useAuth } from '@/contexts/AuthContext';
import { getSchoolStorageKey } from '@/lib/cloudState';
import { WhatsAppChatConversation, WhatsAppChatMessage } from '@/types/mensagens';
import { WhatsAppResolveModal, WhatsAppAdjustableTriggerModal } from './WhatsAppChatModals';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { WhatsAppMediaRenderer } from '@/components/mensagens/WhatsAppMediaRenderer';

function formatPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 13 && clean.startsWith('55')) {
    return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  }
  if (clean.length === 12 && clean.startsWith('55')) {
    return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`;
  }
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return phone;
}

export interface WhatsAppChatViewProps {
  onOpenTriggers?: () => void;
  onOpenSectors?: () => void;
  onOpenPermissions?: () => void;
  activeTriggersCount?: number;
  sectorsCount?: number;
}

export function WhatsAppChatView({
  onOpenTriggers,
  onOpenSectors,
  onOpenPermissions,
  activeTriggersCount,
  sectorsCount,
}: WhatsAppChatViewProps = {}) {
  const {
    conversations,
    allConversations,
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
  } = useWhatsAppInbox();

  const isTicketStarted = Boolean(activeConversation?.opened_at);

  const { triggers, updateTrigger, addTrigger } = useWhatsAppTriggers();
  const { school } = useAuth();

  // Filas de atendimento estilo WhatsApp: 'all' (Todas), 'unread' (Não lidas), 'in_progress' (Em conversa / Meu status), 'pending' (Pendentes), 'resolved' (Resolvidas)
  const [activeQueue, setActiveQueue] = useState<'all' | 'unread' | 'in_progress' | 'pending' | 'resolved'>('all');
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [triggerModalOpen, setTriggerModalOpen] = useState(false);
  const [isResetWhatsAppOpen, setIsResetWhatsAppOpen] = useState(false);
  const [isResettingWhatsApp, setIsResettingWhatsApp] = useState(false);

  const handleConfirmResetWhatsApp = async () => {
    setIsResettingWhatsApp(true);
    try {
      await resetWhatsAppConversations();
      setIsResetWhatsAppOpen(false);
    } finally {
      setIsResettingWhatsApp(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [inputText, setInputText] = useState('');
  const [showRightDrawer, setShowRightDrawer] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [targetSectorId, setTargetSectorId] = useState('');

  // New Chat modal state
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatStudent, setNewChatStudent] = useState('');
  const [newChatSector, setNewChatSector] = useState('secretaria');
  const [newChatInitialMsg, setNewChatInitialMsg] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ordenação cronológica estrita das mensagens da conversa
  const sortedMessages = useMemo(() => {
    return [...activeMessages].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime() || 0;
      const timeB = new Date(b.created_at).getTime() || 0;
      if (timeA !== timeB) return timeA - timeB;
      return (a.id || '').localeCompare(b.id || '');
    });
  }, [activeMessages]);

  // Auto scroll messages to bottom strictly within the chat viewport
  useEffect(() => {
    if (messagesEndRef.current) {
      const viewport = messagesEndRef.current.closest('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      } else {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
      }
    }
  }, [sortedMessages]);

  // Load registered students from localStorage for quick picking
  const registeredStudents = useMemo(() => {
    try {
      if (typeof window === 'undefined') return [];
      const scopedKey = school?.id ? getSchoolStorageKey('escolinha_alunos', school.id) : null;
      const rawScoped = scopedKey ? localStorage.getItem(scopedKey) : null;
      if (rawScoped) {
        const list = JSON.parse(rawScoped);
        if (Array.isArray(list) && list.length > 0) return list;
      }
      const raw = localStorage.getItem('escolinha_alunos');
      if (!raw) return [];
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      return list;
    } catch {
      return [];
    }
  }, [school?.id]);

  const filteredRegisteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return registeredStudents.slice(0, 5);
    const q = studentSearch.toLowerCase();
    return registeredStudents
      .filter(
        (a: any) =>
          a.nome?.toLowerCase().includes(q) ||
          a.responsavel?.toLowerCase().includes(q) ||
          a.telefone?.includes(q) ||
          a.celular?.includes(q)
      )
      .slice(0, 6);
  }, [registeredStudents, studentSearch]);

  const handleSelectStudentForChat = (aluno: any) => {
    setNewChatStudent(aluno.nome || '');
    setNewChatName(aluno.responsavel || aluno.nome || 'Responsável');
    const tel = aluno.responsavel_telefone || aluno.telefone || aluno.celular || '';
    setNewChatPhone(tel);
  };

  const handleCreateNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatPhone.trim() || !newChatName.trim()) {
      toast.error('Informe ao menos o nome do contato e o número de WhatsApp.');
      return;
    }

    try {
      await createNewConversation({
        phone: newChatPhone.trim(),
        contactName: newChatName.trim(),
        studentName: newChatStudent.trim() || undefined,
        sectorId: newChatSector,
        initialMessage: newChatInitialMsg.trim() || undefined,
      });

      setNewChatOpen(false);
      setNewChatName('');
      setNewChatPhone('');
      setNewChatStudent('');
      setNewChatInitialMsg('');
      setStudentSearch('');
    } catch (err: any) {
      toast.error(`Erro ao criar conversa: ${err?.message || 'Verifique os dados'}`);
    }
  };

  // Contadores das filas de atendimento e status
  const queueCounts = useMemo(() => {
    let unread = 0;
    let inProgress = 0;
    let pending = 0;
    let resolved = 0;

    for (const c of conversations) {
      const isResolved = c.ticket_status === 'resolved' || c.ticket_status === 'closed';
      if (isResolved) {
        resolved++;
      } else {
        if (c.unread_count > 0 || !c.opened_at) {
          unread++;
        }
        if (c.ticket_status === 'pending') {
          pending++;
        } else {
          inProgress++;
        }
      }
    }

    return {
      unread,
      inProgress,
      pending,
      resolved,
      all: conversations.length,
    };
  }, [conversations]);

  // Filter conversations por fila/status, setor e busca com ordenação cronológica
  const filteredConversations = useMemo(() => {
    const list = conversations.filter((c) => {
      // 1. Fila de atendimento / Status selecionado nas abas rápidas
      const isResolved = c.ticket_status === 'resolved' || c.ticket_status === 'closed';
      const isUnread = (c.unread_count > 0 || !c.opened_at) && !isResolved;
      const isPending = c.ticket_status === 'pending';
      const isInProgress = c.ticket_status === 'open' && !isResolved;

      if (activeQueue === 'unread' && !isUnread) return false;
      if (activeQueue === 'in_progress' && !isInProgress) return false;
      if (activeQueue === 'pending' && !isPending) return false;
      if (activeQueue === 'resolved' && !isResolved) return false;

      // 2. Filtro de setor
      if (selectedSectorFilter !== 'all' && c.sector_id !== selectedSectorFilter) {
        return false;
      }
      // 3. Filtro de status específico (dropdown)
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'resolved') {
          if (!isResolved) return false;
        } else if (c.ticket_status !== selectedStatusFilter) {
          return false;
        }
      }
      // 4. Busca por texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = c.contact_name.toLowerCase().includes(query);
        const matchesPhone = c.phone.includes(query);
        const matchesStudent = c.student_info?.name.toLowerCase().includes(query);
        const matchesLastMsg = c.last_message?.toLowerCase().includes(query);
        return matchesName || matchesPhone || matchesStudent || matchesLastMsg;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const timeA = new Date(a.last_message_at || a.opened_at || 0).getTime() || 0;
      const timeB = new Date(b.last_message_at || b.opened_at || 0).getTime() || 0;
      return timeB - timeA;
    });
  }, [conversations, activeQueue, selectedSectorFilter, selectedStatusFilter, searchQuery]);

  const handleSelectQueueTab = (queue: 'all' | 'unread' | 'in_progress' | 'pending' | 'resolved') => {
    setActiveQueue(queue);
    setSelectedStatusFilter('all');
  };

  const handleBackToAllConversations = () => {
    setActiveConversationId(null);
    setActiveQueue('all');
    setSelectedStatusFilter('all');
    setShowRightDrawer(false);
  };

  const handleAccessChat = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    accessConversation(conversationId);
  };

  const handleStartTicket = async () => {
    if (!activeConversation) return;
    await startTicket(activeConversation.id);
  };

  const handleDispatchTrigger = async (payload: {
    message: string;
    targetSectorId?: string | null;
    targetStatus?: 'open' | 'pending' | 'resolved' | null;
  }) => {
    if (!activeConversation) return;

    await sendMessage(payload.message);

    if (payload.targetSectorId && payload.targetSectorId !== activeConversation.sector_id) {
      await transferSector(activeConversation.id, payload.targetSectorId);
    }

    if (payload.targetStatus) {
      await changeTicketStatus(activeConversation.id, payload.targetStatus);
    }
  };

  const handleConfirmResolve = async (data: {
    title: string;
    description: string;
    closingMessage?: string;
  }) => {
    if (!activeConversation) return;
    await resolveConversation(activeConversation.id, data);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText('');
  };

  const handleConfirmTransfer = () => {
    if (!activeConversation || !targetSectorId) return;
    transferSector(activeConversation.id, targetSectorId);
    setTransferModalOpen(false);
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, 'HH:mm');
    } catch {
      return '';
    }
  };

  const formatConversationDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isToday(date)) {
        return format(date, 'HH:mm');
      }
      if (isYesterday(date)) {
        return 'Ontem';
      }
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '';
    }
  };

  const getDateDividerLabel = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isToday(date)) return 'Hoje';
      if (isYesterday(date)) return 'Ontem';
      return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return '';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <Badge className="bg-[#d9fdd3] text-[#008069] dark:bg-[#0a332c] dark:text-[#00a884] border-[#00a884]/20 text-[10px] px-1.5 py-0 h-4 font-medium">
            Em Conversa
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25 text-[10px] px-1.5 py-0 h-4 font-medium">
            Pendente
          </Badge>
        );
      case 'resolved':
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/25 text-[10px] px-1.5 py-0 h-4 font-medium">
            Resolvido
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium">
            Encerrado
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-2 w-full min-w-0 overflow-hidden">
      {/* ---------------- BANNER SUPERIOR: WHATSAPP OFICIAL CONECTADO ---------------- */}
      <div
        className={`bg-gradient-to-r from-emerald-500/10 via-background to-primary/5 border border-emerald-500/25 rounded-xl px-2.5 sm:px-3 py-1.5 shadow-2xs flex-shrink-0 ${
          activeConversation ? 'hidden lg:block' : 'block'
        }`}
      >
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-2">
          {/* Dados do WhatsApp Conectado visível para todos os usuários */}
          <div className="flex items-center gap-2.5 min-w-0 w-full xl:w-auto">
            <div className="relative flex-shrink-0">
              <Avatar className="h-8 w-8 border-2 border-emerald-500/40 ring-1 ring-emerald-500/15">
                {uaizapStatus.profilePicUrl ? (
                  <AvatarImage src={uaizapStatus.profilePicUrl} alt={uaizapStatus.profileName || 'WhatsApp'} />
                ) : null}
                <AvatarFallback className="bg-emerald-600 text-white font-bold text-[11px]">
                  {uaizapStatus.profileName ? uaizapStatus.profileName.slice(0, 2).toUpperCase() : 'WA'}
                </AvatarFallback>
              </Avatar>
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${
                  uaizapStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
                title={uaizapStatus.connected ? 'WhatsApp Online e Conectado' : 'Aguardando verificação'}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                  {uaizapStatus.profileName || 'Neto Oliver'}
                </span>
                <Badge
                  variant="outline"
                  className={
                    uaizapStatus.connected
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] h-4.5 font-medium shrink-0'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] h-4.5 font-medium shrink-0'
                  }
                >
                  {uaizapStatus.connected ? '🟢 Conectado' : 'Aguardando'}
                </Badge>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded border font-semibold shrink-0">
                  {formatPhoneNumber(uaizapStatus.ownerPhone || '557583690441')}
                </span>
                <Badge variant="secondary" className="text-[10px] h-4.5 hidden lg:inline-flex">
                  Motor: {activeGatewayProvider === 'wa-akg' ? 'WA-AKG' : 'Uazapi'} | Instância: {uaizapStatus.instanceName || (activeGatewayProvider === 'wa-akg' ? 'WA-AKG' : 'Neto')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Filtro de Mensagens do Banco & Ações */}
          <div className="flex items-center gap-1.5 flex-wrap w-full xl:w-auto justify-start xl:justify-end">
            <div className="flex items-center gap-1 bg-background/90 border rounded-lg px-2 py-0.5 text-xs shadow-2xs">
              <Calendar className="w-3 h-3 text-primary flex-shrink-0" />
              <Badge
                variant={onlyFromToday ? 'default' : 'outline'}
                className="text-[10px] h-4.5 px-1.5 cursor-pointer font-medium"
                onClick={() => setOnlyFromToday(!onlyFromToday)}
                title="Clique para alternar entre mensagens a partir de hoje ou todo o histórico"
              >
                {onlyFromToday ? 'Apenas Hoje' : 'Todo o Histórico'}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 px-1 text-[10px] text-primary hover:bg-primary/10 hidden sm:inline-flex"
                onClick={() => setOnlyFromToday(!onlyFromToday)}
              >
                {onlyFromToday ? 'Ver Histórico Completo' : 'Apenas hoje'}
              </Button>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 sm:px-2.5 text-[11px] gap-1.5"
              onClick={syncWithUaizap}
              disabled={isSyncing}
              title={`Verificar status e sincronizar com o ${activeGatewayProvider === 'wa-akg' ? 'WA-AKG' : 'WhatsApp'}`}
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            </Button>

            {isDirector && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 sm:px-2.5 text-[11px] gap-1.5 border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/20 shadow-xs"
                onClick={() => setIsResetWhatsAppOpen(true)}
                title="Zerar e limpar todas as conversas do WhatsApp gravadas para esta escola"
              >
                <Trash2 className="w-3 h-3 text-rose-600" />
                <span className="hidden sm:inline">Zerar WhatsApp</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ---------------- CONTAINER PRINCIPAL DO CHAT (ESTILO WHATSAPP WEB) ---------------- */}
      <div className="flex-1 flex min-h-0 border border-border/70 rounded-xl overflow-hidden bg-background shadow-sm relative">
        {/* ---------------- 1. PAINEL ESQUERDO: LISTA DE CONVERSAS ---------------- */}
        <div
          className={`w-full lg:w-[320px] xl:w-[350px] 2xl:w-[380px] flex-col border-r border-border/60 bg-white dark:bg-[#111b21] flex-shrink-0 min-w-0 ${
            activeConversation ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Cabeçalho Estilo WhatsApp Web */}
          <div className="px-3 py-2.5 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-border/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#00a884] text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#111b21] dark:text-[#e9edef] leading-tight truncate">
                  Conversas
                </h3>
                <p className="text-[11px] text-[#54656f] dark:text-[#8696a0] truncate">
                  {queueCounts.all} conversas • {isDirector ? 'Todos os setores' : `${userPermittedSectors.length} setores`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="sm"
                className="h-8 px-2.5 text-xs gap-1 bg-[#00a884] hover:bg-[#008f6f] text-white font-semibold rounded-full shadow-2xs"
                onClick={() => setNewChatOpen(true)}
                title="Iniciar nova conversa no WhatsApp"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova</span>
              </Button>
            </div>
          </div>

          {/* Barra de Busca + Pílulas de Status Estilo WhatsApp */}
          <div className="p-2.5 border-b border-border/50 space-y-2 bg-white dark:bg-[#111b21]">
            {/* Campo de Busca */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#54656f] dark:text-[#8696a0]" />
              <Input
                placeholder="Pesquisar ou começar uma nova conversa"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-[#f0f2f5] dark:bg-[#202c33] border-none rounded-lg focus-visible:ring-1 focus-visible:ring-[#00a884]"
              />
            </div>

            {/* Pílulas de Filtro Rápido por Status (Estilo WhatsApp) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              <button
                type="button"
                onClick={() => handleSelectQueueTab('all')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
                  activeQueue === 'all' && selectedStatusFilter === 'all'
                    ? 'bg-[#d9fdd3] text-[#008069] dark:bg-[#0a332c] dark:text-[#00a884] font-semibold'
                    : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef] dark:bg-[#202c33] dark:text-[#8696a0]'
                }`}
              >
                <span>Todas</span>
                <span className="text-[10px] opacity-80">({queueCounts.all})</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectQueueTab('unread')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
                  activeQueue === 'unread'
                    ? 'bg-[#d9fdd3] text-[#008069] dark:bg-[#0a332c] dark:text-[#00a884] font-semibold'
                    : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef] dark:bg-[#202c33] dark:text-[#8696a0]'
                }`}
              >
                <span>Não lidas</span>
                {queueCounts.unread > 0 && (
                  <span className="min-w-4 h-4 px-1 rounded-full bg-[#25d366] text-white text-[9px] font-bold flex items-center justify-center">
                    {queueCounts.unread}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSelectQueueTab('in_progress')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
                  activeQueue === 'in_progress'
                    ? 'bg-[#d9fdd3] text-[#008069] dark:bg-[#0a332c] dark:text-[#00a884] font-semibold'
                    : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef] dark:bg-[#202c33] dark:text-[#8696a0]'
                }`}
              >
                <span>Em Conversa</span>
                {queueCounts.inProgress > 0 && (
                  <span className="text-[10px] opacity-85">({queueCounts.inProgress})</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSelectQueueTab('pending')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
                  activeQueue === 'pending'
                    ? 'bg-[#d9fdd3] text-[#008069] dark:bg-[#0a332c] dark:text-[#00a884] font-semibold'
                    : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef] dark:bg-[#202c33] dark:text-[#8696a0]'
                }`}
              >
                <span>Pendentes</span>
                {queueCounts.pending > 0 && (
                  <span className="text-[10px] opacity-85">({queueCounts.pending})</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSelectQueueTab('resolved')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
                  activeQueue === 'resolved'
                    ? 'bg-[#d9fdd3] text-[#008069] dark:bg-[#0a332c] dark:text-[#00a884] font-semibold'
                    : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef] dark:bg-[#202c33] dark:text-[#8696a0]'
                }`}
              >
                <span>Resolvidas</span>
                {queueCounts.resolved > 0 && (
                  <span className="text-[10px] opacity-85">({queueCounts.resolved})</span>
                )}
              </button>
            </div>

            {/* Seletor de Setor e Status */}
            <div className="flex gap-2 min-w-0">
              <Select value={selectedSectorFilter} onValueChange={setSelectedSectorFilter}>
                <SelectTrigger className="h-8 text-xs flex-1 min-w-0 bg-[#f0f2f5]/70 dark:bg-[#202c33]/70 border-border/50">
                  <SelectValue placeholder="Filtrar por Setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🏢 Todos os Setores</SelectItem>
                  {userPermittedSectors.map((sec) => (
                    <SelectItem key={sec.id} value={sec.id}>
                      {sec.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedStatusFilter}
                onValueChange={(val) => {
                  setSelectedStatusFilter(val);
                  if (val !== 'all') {
                    setActiveQueue('all');
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs w-32 shrink-0 bg-[#f0f2f5]/70 dark:bg-[#202c33]/70 border-border/50">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="open">🟢 Em Conversa</SelectItem>
                  <SelectItem value="pending">🟡 Pendentes</SelectItem>
                  <SelectItem value="resolved">🔵 Resolvidas</SelectItem>
                  <SelectItem value="closed">⚪ Encerradas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lista de Conversas com Scroll */}
          <ScrollArea className="flex-1 bg-white dark:bg-[#111b21]">
            <div className="divide-y divide-border/40">
              {filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-xs space-y-3">
                  <MessageCircle className="w-9 h-9 mx-auto opacity-30 text-[#00a884]" />
                  {conversations.length > 0 ? (
                    <>
                      <p className="font-semibold text-foreground">
                        {activeQueue === 'unread' && 'Nenhuma conversa não lida'}
                        {activeQueue === 'in_progress' && 'Nenhuma conversa em andamento'}
                        {activeQueue === 'pending' && 'Nenhuma conversa pendente'}
                        {activeQueue === 'resolved' && 'Nenhuma conversa resolvida'}
                        {activeQueue === 'all' && 'Nenhuma conversa encontrada com os filtros'}
                      </p>
                      <p className="text-[11px] max-w-[220px] mx-auto text-muted-foreground">
                        Existem {conversations.length} conversas carregadas no sistema.
                      </p>
                      <div className="flex flex-col gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 text-xs gap-1.5 w-full font-medium"
                          onClick={() => {
                            setActiveQueue('all');
                            setSelectedSectorFilter('all');
                            setSelectedStatusFilter('all');
                            setSearchQuery('');
                          }}
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#00a884]" />
                          Ver Todas as Conversas ({queueCounts.all})
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-foreground">
                        {onlyFromToday ? 'Nenhuma atividade hoje' : 'Nenhuma conversa encontrada'}
                      </p>
                      <p className="text-[11px] max-w-[220px] mx-auto text-muted-foreground">
                        {onlyFromToday
                          ? 'Alterne para exibir todo o histórico de conversas ou inicie uma nova conversa.'
                          : 'O WhatsApp está pronto para uso. Novas mensagens aparecerão aqui automaticamente.'}
                      </p>
                      <div className="flex flex-col gap-2 pt-2">
                        {onlyFromToday && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 text-xs gap-1.5 w-full font-medium"
                            onClick={() => setOnlyFromToday(false)}
                            title="Exibir todas as conversas e mensagens anteriores cadastradas"
                          >
                            <Calendar className="w-3.5 h-3.5 text-[#00a884]" />
                            Ver Histórico Completo de Conversas
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1.5 w-full bg-[#00a884] hover:bg-[#008f6f] text-white"
                          onClick={() => setNewChatOpen(true)}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Iniciar Conversa com Aluno
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5 w-full"
                          onClick={syncWithUaizap}
                          disabled={isSyncing}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                          Sincronizar Mensagens
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isActive = activeConversation?.id === conv.id;
                  const isResolved = conv.ticket_status === 'resolved' || conv.ticket_status === 'closed';
                  const isUnread = (conv.unread_count > 0 || !conv.opened_at) && !isResolved;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveConversationId(conv.id);
                        if (conv.unread_count > 0) {
                          accessConversation(conv.id);
                        }
                      }}
                      className={`px-3 py-2.5 cursor-pointer transition-colors relative flex items-center gap-3 hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]/70 w-full min-w-0 overflow-hidden ${
                        isActive ? 'bg-[#f0f2f5] dark:bg-[#2a3942]' : ''
                      }`}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="w-12 h-12 border border-border/40">
                          {conv.avatar_url && (
                            <AvatarImage src={conv.avatar_url} alt={conv.contact_name} className="object-cover" />
                          )}
                          <AvatarFallback className="text-sm bg-[#dfe5e7] dark:bg-[#6a7175] text-[#54656f] dark:text-white font-semibold">
                            {conv.contact_name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {conv.ticket_status === 'open' && (
                          <span className="w-3 h-3 rounded-full bg-[#25d366] ring-2 ring-white dark:ring-[#111b21] absolute bottom-0 right-0" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5 min-w-0">
                          <span
                            className={`text-[14px] truncate flex-1 min-w-0 ${
                              isUnread
                                ? 'font-bold text-[#111b21] dark:text-[#e9edef]'
                                : 'font-medium text-[#111b21] dark:text-[#e9edef]'
                            }`}
                          >
                            {conv.contact_name}
                          </span>
                          <span
                            className={`text-[11px] whitespace-nowrap shrink-0 ${
                              conv.unread_count > 0
                                ? 'text-[#00a884] font-semibold'
                                : 'text-[#667781] dark:text-[#8696a0]'
                            }`}
                          >
                            {formatConversationDate(conv.last_message_at)}
                          </span>
                        </div>

                        {conv.student_info && (
                          <p className="text-[11px] text-[#008069] dark:text-[#00a884] flex items-center gap-1 min-w-0 mb-0.5 font-medium">
                            <GraduationCap className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{conv.student_info.name}</span>
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <p className="text-[12px] text-[#667781] dark:text-[#8696a0] truncate flex-1 min-w-0 flex items-center gap-1">
                            {!isUnread && conv.last_message && (
                              <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] shrink-0 inline" />
                            )}
                            <span className="truncate">{conv.last_message || 'Toque para conversar'}</span>
                          </p>

                          <div className="flex items-center gap-1 shrink-0">
                            {conv.unread_count > 0 && (
                              <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#25d366] text-white text-[11px] font-bold flex items-center justify-center">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-1.5 mt-1.5">
                          <div className="flex items-center gap-1 flex-wrap min-w-0">
                            {conv.sector_name && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 h-4 bg-background/80 font-normal border-border text-muted-foreground truncate max-w-[120px]"
                              >
                                {conv.sector_name}
                              </Badge>
                            )}
                            {getStatusBadge(conv.ticket_status)}
                          </div>

                          {isUnread && (
                            <Button
                              size="sm"
                              className="h-5 px-2 text-[10px] gap-1 font-semibold bg-[#00a884] hover:bg-[#008f6f] text-white rounded-full shadow-2xs shrink-0"
                              onClick={(e) => handleAccessChat(e, conv.id)}
                              title="Marcar como lida e acessar conversa"
                            >
                              <UserCheck className="w-2.5 h-2.5" />
                              <span>Acessar</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ---------------- 2. PAINEL CENTRAL: CONVERSA ATIVA (ESTILO WHATSAPP WEB) ---------------- */}
        {activeConversation ? (
          <div className="flex-1 flex flex-col bg-[#efeae2] dark:bg-[#0b141a] min-w-0 w-full">
            {/* Cabeçalho da Conversa Ativa */}
            <div className="min-h-14 sm:min-h-16 py-1.5 sm:py-2 border-b border-border/60 px-2 sm:px-4 flex flex-wrap sm:flex-nowrap items-center justify-between bg-[#f0f2f5] dark:bg-[#202c33] flex-shrink-0 gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 gap-1 flex-shrink-0 text-[#54656f] dark:text-[#aebac1] hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 -ml-1"
                  onClick={handleBackToAllConversations}
                  title="Voltar e exibir todas as conversas"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-xs font-medium hidden sm:inline lg:hidden xl:inline">Voltar</span>
                </Button>

                <Avatar
                  className="w-9 h-9 sm:w-10 sm:h-10 border border-border/40 shrink-0 cursor-pointer"
                  onClick={() => setShowRightDrawer(!showRightDrawer)}
                >
                  {activeConversation.avatar_url && (
                    <AvatarImage
                      src={activeConversation.avatar_url}
                      alt={activeConversation.contact_name}
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="bg-[#dfe5e7] dark:bg-[#6a7175] text-[#54656f] dark:text-white font-bold text-xs sm:text-sm">
                    {activeConversation.contact_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() => setShowRightDrawer(!showRightDrawer)}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <h4 className="font-semibold text-xs sm:text-[15px] text-[#111b21] dark:text-[#e9edef] truncate">
                      {activeConversation.contact_name}
                    </h4>
                    <div className="shrink-0">{getStatusBadge(activeConversation.ticket_status)}</div>
                    {activeConversation.assigned_name && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4.5 px-1.5 font-normal bg-white/70 dark:bg-black/20 text-muted-foreground border-border gap-1 hidden md:inline-flex shrink-0"
                      >
                        <UserCheck className="w-2.5 h-2.5 text-[#00a884]" />
                        <span className="truncate max-w-[100px]">{activeConversation.assigned_name}</span>
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 text-[11px] text-[#667781] dark:text-[#8696a0] min-w-0">
                    <span className="truncate">{formatPhoneNumber(activeConversation.phone)}</span>
                    <span className="hidden sm:inline shrink-0">•</span>
                    <span className="hidden sm:flex items-center gap-1 text-[#008069] dark:text-[#00a884] truncate font-medium">
                      <Building2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">{activeConversation.sector_name || 'Sem Setor'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Ações do Atendimento */}
              <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ml-auto">
                {/* Botão Iniciar Atendimento se ainda não iniciado */}
                {!isTicketStarted && (
                  <Button
                    size="sm"
                    className="h-7 sm:h-8 px-2.5 sm:px-3 gap-1 sm:gap-1.5 text-xs bg-[#00a884] hover:bg-[#008f6f] text-white font-semibold shadow-2xs"
                    onClick={handleStartTicket}
                    title="Assumir e iniciar atendimento"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline">Assumir</span>
                  </Button>
                )}

                {/* Botão Resolver ou Reabrir Atendimento */}
                {activeConversation.ticket_status !== 'resolved' && activeConversation.ticket_status !== 'closed' ? (
                  <Button
                    size="sm"
                    className="h-7 sm:h-8 px-2 sm:px-2.5 gap-1 sm:gap-1.5 text-xs bg-[#00a884] hover:bg-[#008f6f] text-white font-medium shadow-2xs"
                    onClick={() => setResolveModalOpen(true)}
                    title="Concluir e registrar resolução do atendimento"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Resolver</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 sm:h-8 px-2 sm:px-2.5 gap-1 text-xs border-[#00a884]/40 text-[#008069] dark:text-[#00a884]"
                    onClick={() => changeTicketStatus(activeConversation.id, 'open')}
                    title="Reabrir este atendimento para o seu status"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span className="hidden sm:inline">Reabrir</span>
                  </Button>
                )}

                {/* Botão de Transferir Setor */}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 sm:h-8 px-2 sm:px-2.5 gap-1.5 text-xs inline-flex bg-white/80 dark:bg-[#2a3942]"
                  onClick={() => {
                    setTargetSectorId(activeConversation.sector_id || 'secretaria');
                    setTransferModalOpen(true);
                  }}
                  title="Transferir conversa para outro setor"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
                  <span className="hidden xl:inline">Transferir</span>
                </Button>

                {/* Status do Ticket (Permite alternar livremente entre o seu status e outros status) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 sm:h-8 px-2 sm:px-2.5 gap-1 text-xs inline-flex bg-white/80 dark:bg-[#2a3942]"
                      title="Alterar status da conversa"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00a884]" />
                      <span className="hidden md:inline">Status</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Alterar Status da Conversa</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => changeTicketStatus(activeConversation.id, 'open')}>
                      🟢 Em Conversa (Meu Status)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeTicketStatus(activeConversation.id, 'pending')}>
                      🟡 Pendente (Aguardando Resposta)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setResolveModalOpen(true)}>
                      🔵 Marcar como Resolvido (com Resumo)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeTicketStatus(activeConversation.id, 'resolved')}>
                      🔵 Marcar como Resolvido (Rápido)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeTicketStatus(activeConversation.id, 'closed')}>
                      ⚪ Encerrar Atendimento
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Toggle Painel Aluno/Responsável */}
                <Button
                  size="sm"
                  variant={showRightDrawer ? 'secondary' : 'ghost'}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-[#54656f] dark:text-[#aebac1]"
                  onClick={() => setShowRightDrawer(!showRightDrawer)}
                  title="Ver dados do Contato e Aluno"
                >
                  <Info className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Feed de Mensagens (Papel de Parede Estilo WhatsApp) */}
            <ScrollArea className="flex-1 bg-[#efeae2] dark:bg-[#0b141a] w-full overflow-x-hidden">
              <div className="w-full space-y-2 p-2.5 sm:p-5 min-w-0">
                {/* Informação de Criptografia / Sincronização Estilo WhatsApp */}
                <div className="text-center my-2 space-y-2">
                  <span className="text-[11px] bg-[#ffeecd] dark:bg-[#182229] text-[#54656f] dark:text-[#ffd279] px-3 py-1.5 rounded-lg shadow-2xs inline-block max-w-full truncate">
                    🔒 Mensagens sincronizadas com o WhatsApp Oficial da escola
                  </span>
                  {activeConversation && sortedMessages.length > 0 && !sortedMessages.some((m) => m.direction === 'outgoing') && (
                    <div className="flex flex-wrap items-center justify-center gap-2 p-2 rounded-lg bg-white/90 dark:bg-[#182229] border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs shadow-2xs max-w-md mx-auto">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-medium">1ª Mensagem recebida!</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[11px] font-semibold bg-[#00a884] text-white hover:bg-[#008f6f] border-none shadow-2xs gap-1"
                        onClick={() => {
                          sendAutoGreetingMessage(activeConversation.id, activeConversation.phone, activeConversation.contact_name, true);
                        }}
                      >
                        <Zap className="w-3 h-3 fill-white" />
                        Enviar Saudação & Menu
                      </Button>
                    </div>
                  )}
                </div>

                {sortedMessages.length === 0 ? (
                  <div className="text-center py-12 text-[#54656f] dark:text-[#8696a0] text-xs space-y-1">
                    <MessageCircle className="w-8 h-8 mx-auto opacity-30" />
                    <p className="font-medium text-[#111b21] dark:text-[#e9edef]">Nenhuma mensagem nesta conversa ainda</p>
                    <p className="text-[11px]">Envie uma mensagem abaixo para conversar no WhatsApp.</p>
                  </div>
                ) : (
                  sortedMessages.map((msg, index) => {
                    const isMe = msg.direction === 'outgoing';
                    const isAuto = msg.is_automated;

                    const currentDateKey = (() => {
                      try {
                        return format(new Date(msg.created_at), 'yyyy-MM-dd');
                      } catch {
                        return '';
                      }
                    })();

                    const prevDateKey = (() => {
                      if (index === 0) return null;
                      try {
                        return format(new Date(sortedMessages[index - 1].created_at), 'yyyy-MM-dd');
                      } catch {
                        return null;
                      }
                    })();

                    const showDateDivider = currentDateKey && currentDateKey !== prevDateKey;

                    if (msg.direction === 'system' || msg.message_type === 'system') {
                      return (
                        <React.Fragment key={msg.id}>
                          {showDateDivider && (
                            <div className="flex justify-center my-3 select-none">
                              <span className="px-3 py-1 bg-white/90 dark:bg-[#182229] text-[11px] font-medium text-[#54656f] dark:text-[#8696a0] rounded-lg shadow-2xs capitalize">
                                {getDateDividerLabel(msg.created_at)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-center my-2 px-4 select-none">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/85 dark:bg-[#182229] text-[#54656f] dark:text-[#8696a0] text-[11px] font-medium shadow-2xs max-w-full text-center">
                              <UserCheck className="w-3.5 h-3.5 text-[#00a884] shrink-0" />
                              <span className="truncate">{msg.body}</span>
                              <span className="text-[10px] opacity-70 ml-1 shrink-0">
                                {formatMessageTime(msg.created_at)}
                              </span>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    }

                    return (
                      <React.Fragment key={msg.id}>
                        {showDateDivider && (
                          <div className="flex justify-center my-3 select-none">
                            <span className="px-3 py-1 bg-white/90 dark:bg-[#182229] text-[11px] font-medium text-[#54656f] dark:text-[#8696a0] rounded-lg shadow-2xs capitalize">
                              {getDateDividerLabel(msg.created_at)}
                            </span>
                          </div>
                        )}

                        <div
                          className={`w-full flex ${isMe ? 'justify-end' : 'justify-start items-end gap-1.5'} my-1 min-w-0`}
                        >
                          <div
                            className={`w-fit max-w-[88%] sm:max-w-[76%] xl:max-w-[68%] min-w-0 rounded-lg px-3 py-1.5 shadow-2xs space-y-0.5 text-xs relative break-words [overflow-wrap:anywhere] overflow-hidden ${
                              isMe
                                ? isAuto
                                  ? 'bg-[#fff5c4] dark:bg-[#2a2f1d] text-[#111b21] dark:text-[#e9edef] rounded-tr-none'
                                  : 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none'
                                : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none'
                            }`}
                          >
                            {/* Nome do Remetente ou Automação */}
                            {(isAuto || !isMe) && (
                              <div className="flex items-center justify-between gap-2 text-[11px] font-semibold mb-0.5 min-w-0">
                                {isAuto ? (
                                  <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 truncate">
                                    <Bot className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{msg.sender_name || 'Automação'}</span>
                                  </span>
                                ) : (
                                  <span className="text-[#008069] dark:text-[#00a884] truncate">
                                    {activeConversation.contact_name}
                                  </span>
                                )}
                              </div>
                            )}

                            <WhatsAppMediaRenderer message={msg} />

                            {/* Conteúdo de Texto */}
                            {msg.body && msg.body !== msg.media_caption && (
                              <p className="whitespace-pre-wrap leading-relaxed select-text text-[13.5px] text-[#111b21] dark:text-[#e9edef] break-words [overflow-wrap:anywhere]">
                                {msg.body}
                              </p>
                            )}
                            {msg.media_caption && (
                              <p className="whitespace-pre-wrap leading-relaxed select-text text-[13.5px] text-[#111b21] dark:text-[#e9edef] break-words [overflow-wrap:anywhere]">
                                {msg.media_caption}
                              </p>
                            )}

                            {/* Horário e Duplo Check Estilo WhatsApp */}
                            <div className="flex items-center justify-end gap-1 text-[10px] text-[#667781] dark:text-[#8696a0] pt-0.5 select-none">
                              <span>{formatMessageTime(msg.created_at)}</span>
                              {isMe && (
                                <span>
                                  {msg.status === 'read' || msg.status === 'delivered' ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                                  ) : msg.status === 'sending' ? (
                                    <Clock className="w-3 h-3 animate-pulse" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Faixa Opcional de Assumir Atendimento + Barra de Digitação Estilo WhatsApp Sempre Liberada */}
            {!isTicketStarted && (
              <div className="px-3 py-1.5 bg-[#fff5c4]/90 dark:bg-[#182229] border-t border-amber-500/20 flex items-center justify-between gap-2 flex-shrink-0">
                <span className="text-[11px] text-[#54656f] dark:text-[#e9edef] truncate">
                  Você pode enviar uma mensagem abaixo para iniciar automaticamente ou clicar em assumir:
                </span>
                <Button
                  size="sm"
                  className="h-6 px-2.5 text-[11px] font-semibold bg-[#00a884] hover:bg-[#008f6f] text-white gap-1 shrink-0 rounded-full"
                  onClick={handleStartTicket}
                >
                  <UserCheck className="w-3 h-3" />
                  <span>Assumir Conversa</span>
                </Button>
              </div>
            )}

            <div className="px-2.5 sm:px-4 py-2 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-border/50 flex-shrink-0">
              <form onSubmit={handleSend} className="flex items-center gap-2 min-w-0">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 sm:h-10 sm:w-10 p-0 text-[#54656f] dark:text-[#8696a0] hover:text-foreground rounded-full shrink-0"
                  title="Anexar arquivo ou imagem"
                  onClick={() => {
                    const mediaUrl = window.prompt('Informe a URL da imagem ou documento que deseja enviar via WhatsApp:');
                    if (mediaUrl?.trim()) {
                      const isImg = /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(mediaUrl);
                      sendMessage(inputText.trim() || (isImg ? 'Segue imagem em anexo' : 'Segue documento em anexo'), {
                        url: mediaUrl.trim(),
                        filename: isImg ? 'imagem.jpg' : 'documento.pdf',
                        type: isImg ? 'image' : 'document',
                      });
                      setInputText('');
                    }
                  }}
                >
                  <Paperclip className="w-5 h-5" />
                </Button>

                <Input
                  placeholder="Digite uma mensagem"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="h-9 sm:h-10 text-xs sm:text-sm min-w-0 flex-1 bg-white dark:bg-[#2a3942] border-none rounded-lg focus-visible:ring-1 focus-visible:ring-[#00a884]"
                />

                <Button
                  type="submit"
                  size="sm"
                  className="h-9 w-9 sm:h-10 sm:w-10 p-0 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white shrink-0 flex items-center justify-center shadow-2xs"
                  title="Enviar mensagem"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-8 text-center text-[#54656f] dark:text-[#8696a0] bg-[#f0f2f5] dark:bg-[#222e35] border-b-[6px] border-b-[#25d366]">
            <div className="w-16 h-16 rounded-full bg-[#00a884]/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-9 h-9 text-[#00a884]" />
            </div>
            <h4 className="font-light text-[#41525d] dark:text-[#e9edef] text-xl">WhatsApp Web • Purple Edu</h4>
            <p className="text-xs max-w-sm mt-2 mb-5 text-[#667781] dark:text-[#8696a0]">
              Selecione uma conversa ao lado em qualquer status (Todas, Não lidas, Em Conversa, Pendentes ou Resolvidas) ou inicie um novo atendimento.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setNewChatOpen(true)}
                className="gap-1.5 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-full px-4"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Conversa
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={syncWithUaizap}
                disabled={isSyncing}
                className="gap-1.5 rounded-full px-4"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                Sincronizar
              </Button>
            </div>
          </div>
        )}

      {/* ---------------- 3. PAINEL DIREITO RETRÁTIL: DADOS DO ALUNO E RESPONSÁVEL ---------------- */}
      {showRightDrawer && activeConversation && (
        <>
          <div
            className="absolute inset-0 bg-black/25 z-20 2xl:hidden animate-in fade-in duration-150"
            onClick={() => setShowRightDrawer(false)}
          />
          <div className="absolute inset-y-0 right-0 z-30 2xl:static 2xl:inset-auto w-full sm:w-80 2xl:w-80 border-l bg-card shadow-xl 2xl:shadow-none flex flex-col overflow-y-auto flex-shrink-0 animate-in slide-in-from-right duration-150">
            <div className="p-3 sm:p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 2xl:hidden text-muted-foreground hover:text-foreground"
                  onClick={() => setShowRightDrawer(false)}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  Detalhes do Contato
                </h4>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hidden 2xl:flex"
                onClick={() => setShowRightDrawer(false)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

          <div className="p-4 space-y-5">
            {/* Foto e Nome */}
            <div className="text-center space-y-2">
              <Avatar className="w-20 h-20 mx-auto border-2 border-primary/20 shadow-sm shrink-0">
                {activeConversation.avatar_url && (
                  <AvatarImage
                    src={activeConversation.avatar_url}
                    alt={activeConversation.contact_name}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
                  {activeConversation.contact_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-bold text-sm text-foreground">{activeConversation.contact_name}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{activeConversation.phone}</p>
              </div>

              {/* Botão chamar WhatsApp */}
              <div className="pt-2">
                <a
                  href={`https://wa.me/${activeConversation.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-block"
                >
                  <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50">
                    <MessageCircle className="w-3.5 h-3.5" />
                    Abrir no WhatsApp
                  </Button>
                </a>
              </div>
            </div>

            {/* Ficha do Aluno Vinculado */}
            {activeConversation.student_info ? (
              <div className="space-y-3 p-3 rounded-xl bg-muted/40 border">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <GraduationCap className="w-4 h-4" />
                  <span>Aluno(a) Vinculado</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Avatar className="w-11 h-11 border border-primary/30 shadow-2xs shrink-0">
                    {activeConversation.student_info.foto_url && (
                      <AvatarImage
                        src={activeConversation.student_info.foto_url}
                        alt={activeConversation.student_info.name}
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                      {activeConversation.student_info.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <p className="font-semibold text-xs truncate text-foreground">
                      {activeConversation.student_info.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {activeConversation.student_info.turma}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border/50 text-[11px]">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Responsável:</span>
                    <span className="font-medium text-foreground truncate max-w-[130px]">
                      {activeConversation.student_info.responsavel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Situação Financeira:</span>
                    {activeConversation.student_info.status_financeiro === 'em_dia' ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px] px-1.5 py-0 h-4">
                        Em Dia
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[10px] px-1.5 py-0 h-4">
                        Pendente
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-dashed text-center text-xs text-muted-foreground space-y-1">
                <User className="w-5 h-5 mx-auto opacity-40 mb-1" />
                <p className="font-medium text-foreground">Contato não vinculado</p>
                <p className="text-[11px]">Este número ainda não foi associado a um aluno cadastrado.</p>
              </div>
            )}

            {/* Setor e Atendimento */}
            <div className="space-y-2 text-xs">
              <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                Dados do Atendimento
              </span>

              <div className="p-3 rounded-lg bg-card border space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Setor Atual:</span>
                  <Badge variant="outline" className="font-normal text-primary border-primary/30">
                    {activeConversation.sector_name || 'Sem Setor'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status do Ticket:</span>
                  {getStatusBadge(activeConversation.ticket_status)}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Prioridade:</span>
                  <span className="font-medium capitalize text-foreground">
                    {activeConversation.priority || 'Normal'}
                  </span>
                </div>
              </div>
            </div>

            {/* Parecer / Resumo da Resolução se o ticket foi resolvido */}
            {activeConversation.resolution_data && (
              <div className="space-y-2 text-xs">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Parecer da Resolução
                </span>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2 text-[11px]">
                  <div>
                    <p className="font-bold text-emerald-900 dark:text-emerald-200">
                      {activeConversation.resolution_data.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Resolvido por {activeConversation.resolution_data.resolved_by}
                    </p>
                  </div>

                  <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed border-t border-emerald-500/20 pt-2">
                    {activeConversation.resolution_data.description}
                  </p>
                </div>
              </div>
            )}
          </div>
          </div>
        </>
      )}
      </div>

      {/* ---------------- MODAL DE TRANSFERÊNCIA DE SETOR ---------------- */}
      <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-blue-500" />
              Transferir Conversa de Setor
            </DialogTitle>
            <DialogDescription>
              Selecione o setor de destino para transferir o atendimento de{' '}
              <strong className="text-foreground">{activeConversation?.contact_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Setor de Destino</label>
              <Select value={targetSectorId} onValueChange={setTargetSectorId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione um setor..." />
                </SelectTrigger>
                <SelectContent>
                  {allAvailableSectors.map((sec) => (
                    <SelectItem key={sec.id} value={sec.id}>
                      {sec.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTransferModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleConfirmTransfer}>
              Confirmar Transferência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- MODAL NOVA CONVERSA WHATSAPP ---------------- */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Plus className="w-5 h-5" />
              Iniciar Nova Conversa no WhatsApp
            </DialogTitle>
            <DialogDescription>
              Envie uma mensagem via Uaizap para um aluno ou responsável cadastrado na instituição.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNewChat} className="space-y-4 py-2">
            {/* Busca Rápida de Aluno */}
            {registeredStudents.length > 0 && (
              <div className="space-y-2 p-2.5 rounded-lg bg-muted/40 border">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-primary" />
                  Buscar Aluno / Responsável Cadastrado:
                </span>
                <Input
                  placeholder="Digite o nome do aluno ou responsável..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="h-8 text-xs bg-background"
                />

                {filteredRegisteredStudents.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {filteredRegisteredStudents.map((aluno: any) => (
                      <Badge
                        key={aluno.id}
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary/20 text-[10px] py-0.5"
                        onClick={() => handleSelectStudentForChat(aluno)}
                      >
                        {aluno.nome} ({aluno.responsavel || 'Resp.'})
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Nome do Contato *</label>
                <Input
                  required
                  placeholder="Ex: Carlos Silva"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Telefone WhatsApp *</label>
                <Input
                  required
                  placeholder="Ex: (75) 98369-0441"
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Aluno Vinculado</label>
                <Input
                  placeholder="Ex: Pedro Silva"
                  value={newChatStudent}
                  onChange={(e) => setNewChatStudent(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Setor Inicial</label>
                <Select value={newChatSector} onValueChange={setNewChatSector}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Setor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allAvailableSectors.map((sec) => (
                      <SelectItem key={sec.id} value={sec.id}>
                        {sec.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Primeira Mensagem (Opcional)</label>
              <Input
                placeholder="Ex: Olá! Entramos em contato referente à sua solicitação na escola..."
                value={newChatInitialMsg}
                onChange={(e) => setNewChatInitialMsg(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewChatOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="gap-1.5">
                <Send className="w-3.5 h-3.5" />
                Iniciar Atendimento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------------- MODAL DE RESOLUÇÃO DE ATENDIMENTO ---------------- */}
      <WhatsAppResolveModal
        open={resolveModalOpen}
        onOpenChange={setResolveModalOpen}
        conversation={activeConversation}
        onConfirmResolve={handleConfirmResolve}
      />

      {/* ---------------- CENTRAL DE GATILHOS AJUSTÁVEIS & EDIÇÃO ---------------- */}
      <WhatsAppAdjustableTriggerModal
        open={triggerModalOpen}
        onOpenChange={setTriggerModalOpen}
        conversation={activeConversation}
        allSectors={allAvailableSectors}
        triggers={triggers}
        schoolName={school?.name || 'Escola'}
        onDispatchTrigger={handleDispatchTrigger}
        onUpdateTrigger={updateTrigger}
        onAddTrigger={addTrigger}
      />

      {/* ---------------- MODAL DE CONFIRMAÇÃO: ZERAR WHATSAPP ---------------- */}
      <AlertDialog open={isResetWhatsAppOpen} onOpenChange={setIsResetWhatsAppOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-600" />
              Zerar Conversas do WhatsApp
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                Tem certeza que deseja apagar todas as conversas, mensagens e anexos do WhatsApp gravados para esta escola?
              </span>
              <br />
              <span className="block text-xs text-muted-foreground mt-2">
                O aparelho continuará conectado normalmente, mas todo o histórico do painel será zerado.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResettingWhatsApp}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleConfirmResetWhatsApp}
              disabled={isResettingWhatsApp}
            >
              {isResettingWhatsApp ? 'Zerando...' : 'Sim, Zerar WhatsApp'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
