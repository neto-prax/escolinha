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

export function WhatsAppChatView() {
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
    isSyncing,
    uaizapStatus,
    createNewConversation,
    isLoadingDbConversations,
    onlyFromToday,
    setOnlyFromToday,
    accessConversation,
    resolveConversation,
  } = useWhatsAppInbox();

  const { triggers } = useWhatsAppTriggers();
  const { school } = useAuth();

  // Filas de atendimento: 'unread' (Não lidas / Aguardando), 'in_progress' (Em Conversa), 'resolved' (Resolvidos), 'all' (Todas)
  const [activeQueue, setActiveQueue] = useState<'unread' | 'in_progress' | 'resolved' | 'all'>('unread');
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [triggerModalOpen, setTriggerModalOpen] = useState(false);

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

  // Auto scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  // Load registered students from localStorage for quick picking
  const registeredStudents = useMemo(() => {
    try {
      const raw = localStorage.getItem('escolinha_alunos');
      if (!raw) return [];
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      return list;
    } catch {
      return [];
    }
  }, []);

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

  // Contadores das filas de atendimento
  const queueCounts = useMemo(() => {
    let unread = 0;
    let inProgress = 0;
    let resolved = 0;

    for (const c of conversations) {
      const isResolved = c.ticket_status === 'resolved' || c.ticket_status === 'closed';
      if (isResolved) {
        resolved++;
      } else if (c.unread_count > 0 || !c.opened_at) {
        unread++;
      } else {
        inProgress++;
      }
    }

    return {
      unread,
      inProgress,
      resolved,
      all: conversations.length,
    };
  }, [conversations]);

  // Filter conversations por fila, setor, status e busca
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // 1. Fila de atendimento
      const isResolved = c.ticket_status === 'resolved' || c.ticket_status === 'closed';
      const isUnread = (c.unread_count > 0 || !c.opened_at) && !isResolved;
      const isInProgress = !isResolved && !isUnread;

      if (activeQueue === 'unread' && !isUnread) return false;
      if (activeQueue === 'in_progress' && !isInProgress) return false;
      if (activeQueue === 'resolved' && !isResolved) return false;

      // 2. Filtro de setor
      if (selectedSectorFilter !== 'all' && c.sector_id !== selectedSectorFilter) {
        return false;
      }
      // 3. Filtro de status
      if (selectedStatusFilter !== 'all' && c.ticket_status !== selectedStatusFilter) {
        return false;
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
  }, [conversations, activeQueue, selectedSectorFilter, selectedStatusFilter, searchQuery]);

  const handleAccessChat = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    accessConversation(conversationId);
    setActiveQueue('in_progress');
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
    setActiveQueue('resolved');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Aberto</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Pendente</Badge>;
      case 'resolved':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Resolvido</Badge>;
      case 'closed':
        return <Badge variant="secondary">Encerrado</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-2">
      {/* ---------------- BANNER SUPERIOR: WHATSAPP OFICIAL CONECTADO ---------------- */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-background to-primary/5 border border-emerald-500/25 rounded-xl px-3 py-1.5 shadow-2xs flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          {/* Dados do WhatsApp Conectado visível para todos os usuários */}
          <div className="flex items-center gap-2.5 min-w-0">
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

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-xs sm:text-sm text-foreground">
                  {uaizapStatus.profileName || 'Neto Oliver'}
                </span>
                <Badge
                  variant="outline"
                  className={
                    uaizapStatus.connected
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] h-4.5 font-medium'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] h-4.5 font-medium'
                  }
                >
                  {uaizapStatus.connected ? '🟢 Conectado' : 'Aguardando'}
                </Badge>
                <span className="text-[11px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded border font-semibold">
                  {formatPhoneNumber(uaizapStatus.ownerPhone || '557583690441')}
                </span>
                <Badge variant="secondary" className="text-[10px] h-4.5 hidden md:inline-flex">
                  Instância: {uaizapStatus.instanceName || 'Neto'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Filtro de Mensagens do Banco & Ações */}
          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
            <div className="flex items-center gap-1 bg-background/90 border rounded-lg px-2 py-0.5 text-xs shadow-2xs">
              <Calendar className="w-3 h-3 text-primary flex-shrink-0" />
              <Badge
                variant={onlyFromToday ? 'default' : 'outline'}
                className="text-[10px] h-4.5 px-1.5 cursor-pointer font-medium"
                onClick={() => setOnlyFromToday(!onlyFromToday)}
                title="Clique para alternar entre mensagens a partir de hoje ou todo o histórico"
              >
                {onlyFromToday ? 'Hoje em diante' : 'Todo o Histórico'}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 px-1 text-[10px] text-primary hover:bg-primary/10"
                onClick={() => setOnlyFromToday(!onlyFromToday)}
              >
                {onlyFromToday ? 'Histórico antigo' : 'Apenas hoje'}
              </Button>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-[11px] gap-1.5"
              onClick={syncWithUaizap}
              disabled={isSyncing}
              title="Verificar status e sincronizar com o WhatsApp"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ---------------- CONTAINER PRINCIPAL DO CHAT ---------------- */}
      <div className="flex-1 flex min-h-[460px] border rounded-xl overflow-hidden bg-background shadow-xs relative">
        {/* ---------------- 1. PAINEL ESQUERDO: LISTA DE CONVERSAS ---------------- */}
        <div
          className={`w-full md:w-80 lg:w-84 flex-col border-r bg-muted/20 flex-shrink-0 ${
            activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Cabeçalho do Painel com Filtros e Acesso */}
          <div className="p-2.5 border-b space-y-2 bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold leading-none">Conversas</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {isDirector
                      ? 'Todos os setores'
                      : `${userPermittedSectors.length} setores autorizados`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="default"
                  className="h-6 px-2 text-[11px] gap-1"
                  onClick={() => setNewChatOpen(true)}
                  title="Iniciar nova conversa no WhatsApp"
                >
                  <Plus className="w-3 h-3" />
                  <span>Nova</span>
                </Button>
              </div>
            </div>

            {/* Filas de Atendimento: Não Lidas | Em Conversa | Resolvidos | Todas */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-muted/60 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveQueue('unread')}
                className={`py-1.5 px-1 rounded-md text-[11px] font-medium transition-all flex flex-col items-center justify-center gap-0.5 ${
                  activeQueue === 'unread'
                    ? 'bg-card text-foreground font-bold shadow-xs ring-1 ring-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>Não Lidas</span>
                  {queueCounts.unread > 0 && (
                    <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                      {queueCounts.unread}
                    </span>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveQueue('in_progress')}
                className={`py-1.5 px-1 rounded-md text-[11px] font-medium transition-all flex flex-col items-center justify-center gap-0.5 ${
                  activeQueue === 'in_progress'
                    ? 'bg-card text-foreground font-bold shadow-xs ring-1 ring-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>Em Conversa</span>
                  {queueCounts.inProgress > 0 && (
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold flex items-center justify-center">
                      {queueCounts.inProgress}
                    </span>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveQueue('resolved')}
                className={`py-1.5 px-1 rounded-md text-[11px] font-medium transition-all flex flex-col items-center justify-center gap-0.5 ${
                  activeQueue === 'resolved'
                    ? 'bg-card text-foreground font-bold shadow-xs ring-1 ring-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>Resolvidos</span>
                  {queueCounts.resolved > 0 && (
                    <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[9px] font-bold flex items-center justify-center">
                      {queueCounts.resolved}
                    </span>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveQueue('all')}
                className={`py-1.5 px-1 rounded-md text-[11px] font-medium transition-all flex flex-col items-center justify-center gap-0.5 ${
                  activeQueue === 'all'
                    ? 'bg-card text-foreground font-bold shadow-xs ring-1 ring-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>Todas</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    ({queueCounts.all})
                  </span>
                </div>
              </button>
            </div>

          {/* Campo de Busca */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou aluno..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/40"
            />
          </div>

          {/* Seletor de Setor e Status */}
          <div className="flex gap-2">
            <Select value={selectedSectorFilter} onValueChange={setSelectedSectorFilter}>
              <SelectTrigger className="h-8 text-xs flex-1">
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

            <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-28">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status (Todos)</SelectItem>
                <SelectItem value="open">Abertos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="closed">Encerrados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lista de Conversas com Scroll */}
        <ScrollArea className="flex-1">
          <div className="divide-y divide-border/40">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-xs space-y-3">
                <Building2 className="w-8 h-8 mx-auto opacity-30 text-emerald-600" />
                <p className="font-semibold text-foreground">Aguardando mensagens de hoje</p>
                <p className="text-[11px] max-w-[220px] mx-auto text-muted-foreground">
                  O WhatsApp está conectado e pronto. Novas mensagens de pais e alunos aparecerão aqui automaticamente.
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5 w-full"
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
                  {onlyFromToday && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs gap-1.5 w-full font-medium"
                      onClick={() => setOnlyFromToday(false)}
                      title="Exibir todas as conversas e mensagens anteriores cadastradas"
                    >
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      Ver Histórico de Mensagens Anteriores
                    </Button>
                  )}
                </div>
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
                      if (isUnread) {
                        accessConversation(conv.id);
                      }
                    }}
                    className={`p-3 cursor-pointer transition-colors relative flex items-start gap-3 hover:bg-muted/50 ${
                      isActive ? 'bg-primary/5 border-l-4 border-primary' : ''
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="w-10 h-10 border border-border/50">
                        {conv.avatar_url && <AvatarImage src={conv.avatar_url} />}
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                          {conv.contact_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {conv.ticket_status === 'open' && (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background absolute -bottom-0.5 -right-0.5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-medium text-xs truncate max-w-[130px] text-foreground">
                          {conv.contact_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatConversationDate(conv.last_message_at)}
                        </span>
                      </div>

                      {conv.student_info && (
                        <p className="text-[10px] text-primary/80 flex items-center gap-1 truncate mb-0.5">
                          <GraduationCap className="w-3 h-3 flex-shrink-0" />
                          <span>{conv.student_info.name}</span>
                        </p>
                      )}

                      <p className="text-[11px] text-muted-foreground truncate mb-1.5">
                        {conv.last_message || 'Nenhuma mensagem recente'}
                      </p>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {conv.sector_name && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 h-4 bg-background font-normal border-primary/30 text-primary"
                          >
                            {conv.sector_name}
                          </Badge>
                        )}
                        {getStatusBadge(conv.ticket_status)}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {isUnread && (
                        <Button
                          size="sm"
                          className="h-6 px-2 text-[10px] gap-1 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          onClick={(e) => handleAccessChat(e, conv.id)}
                          title="Acessar conversa e mover para Em Conversa"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>Acessar</span>
                        </Button>
                      )}

                      {conv.unread_count > 0 && (
                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ---------------- 2. PAINEL CENTRAL: CONVERSA ATIVA ---------------- */}
      {activeConversation ? (
        <div className="flex-1 flex flex-col bg-background min-w-0 w-full">
          {/* Cabeçalho da Conversa Ativa */}
          <div className="h-14 sm:h-16 border-b px-2 sm:px-4 flex items-center justify-between bg-card flex-shrink-0 gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 md:hidden flex-shrink-0 text-muted-foreground hover:text-foreground -ml-1"
                onClick={() => setActiveConversationId(null)}
                title="Voltar para a lista de conversas"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>

              <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border flex-shrink-0">
                {activeConversation.avatar_url && <AvatarImage src={activeConversation.avatar_url} />}
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs sm:text-sm">
                  {activeConversation.contact_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h4 className="font-semibold text-xs sm:text-sm truncate">{activeConversation.contact_name}</h4>
                  {getStatusBadge(activeConversation.ticket_status)}
                </div>
                <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground truncate">
                  <span className="truncate">{activeConversation.phone}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:flex items-center gap-1 text-primary">
                    <Building2 className="w-3 h-3" />
                    {activeConversation.sector_name || 'Sem Setor'}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações do Atendimento */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
              {/* Botão Gatilho Rápido Ajustável */}
              <Button
                size="sm"
                variant="outline"
                className="h-7 sm:h-8 px-2 sm:px-2.5 gap-1 sm:gap-1.5 text-xs text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-medium"
                onClick={() => setTriggerModalOpen(true)}
                title="Disparar gatilho ajustável e transferir de setor"
              >
                <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span className="hidden sm:inline">Gatilho</span>
              </Button>

              {/* Botão Resolver Atendimento com Modal de Resumo */}
              {activeConversation.ticket_status !== 'resolved' ? (
                <Button
                  size="sm"
                  className="h-7 sm:h-8 px-2 sm:px-2.5 gap-1 sm:gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                  onClick={() => setResolveModalOpen(true)}
                  title="Concluir e registrar resolução do atendimento"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Resolver</span>
                </Button>
              ) : (
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1">
                  Resolvido
                </Badge>
              )}

              {/* WhatsApp Web Link Direto */}
              <a
                href={`https://wa.me/${activeConversation.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="hidden xl:inline-flex"
              >
                <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Web</span>
                </Button>
              </a>

              {/* Botão de Transferir Setor */}
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs hidden lg:inline-flex"
                onClick={() => {
                  setTargetSectorId(activeConversation.sector_id || 'secretaria');
                  setTransferModalOpen(true);
                }}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
                <span>Transferir</span>
              </Button>

              {/* Status do Ticket */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs hidden sm:inline-flex">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Status</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Status do Atendimento</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => changeTicketStatus(activeConversation.id, 'open')}>
                    🟢 Em Aberto / Atendimento
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeTicketStatus(activeConversation.id, 'pending')}>
                    🟡 Aguardando Resposta (Pendente)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setResolveModalOpen(true)}>
                    🔵 Marcar como Resolvido (com Resumo)
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
                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                onClick={() => setShowRightDrawer(!showRightDrawer)}
                title="Ver dados do Aluno"
              >
                <Info className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Feed de Mensagens */}
          <ScrollArea className="flex-1 p-4 bg-muted/10">
            <div className="max-w-3xl mx-auto space-y-3">
              {/* Informação de Início do Chat */}
              <div className="text-center my-4">
                <span className="text-[11px] bg-muted/60 text-muted-foreground px-3 py-1 rounded-full border">
                  Atendimento Purple Edu sincronizado via WhatsApp Uaizap
                </span>
              </div>

              {activeMessages.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs space-y-1">
                  <MessageSquare className="w-8 h-8 mx-auto opacity-30" />
                  <p className="font-medium text-foreground">Nenhuma mensagem nesta conversa ainda</p>
                  <p className="text-[11px]">Envie uma mensagem abaixo para falar com o responsável.</p>
                </div>
              ) : (
                activeMessages.map((msg) => {
                  const isMe = msg.direction === 'outgoing';
                  const isAuto = msg.is_automated;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-xs space-y-1 text-xs relative ${
                          isMe
                            ? isAuto
                              ? 'bg-amber-500/10 text-foreground border border-amber-500/30 rounded-br-xs'
                              : 'bg-primary text-primary-foreground rounded-br-xs'
                            : 'bg-card text-card-foreground border rounded-bl-xs'
                        }`}
                      >
                        {/* Remetente ou Badge de Gatilho / Trigger */}
                        <div className="flex items-center justify-between gap-2 text-[10px] font-medium opacity-80 mb-0.5">
                          {isAuto ? (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                              <Bot className="w-3 h-3" />
                              {msg.sender_name || 'Automação Purple Bot'}
                            </span>
                          ) : (
                            <span>{isMe ? msg.sender_name || 'Você' : activeConversation.contact_name}</span>
                          )}
                        </div>

                        <WhatsAppMediaRenderer message={msg} />

                        {/* Conteúdo de Texto */}
                        {msg.body && msg.body !== msg.media_caption && (
                          <p className="whitespace-pre-wrap leading-relaxed select-text text-[13px]">
                            {msg.body}
                          </p>
                        )}
                        {msg.media_caption && (
                          <p className="whitespace-pre-wrap leading-relaxed select-text text-[13px]">
                            {msg.media_caption}
                          </p>
                        )}

                        {/* Horário e Status de Entrega */}
                        <div
                          className={`flex items-center justify-end gap-1 text-[10px] pt-1 ${
                            isMe && !isAuto ? 'text-primary-foreground/75' : 'text-muted-foreground'
                          }`}
                        >
                          <span>{formatMessageTime(msg.created_at)}</span>
                          {isMe && (
                            <span>
                              {msg.status === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                              ) : msg.status === 'delivered' ? (
                                <CheckCheck className="w-3.5 h-3.5" />
                              ) : msg.status === 'sending' ? (
                                <Clock className="w-3.5 h-3.5 animate-pulse" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Barra de Digitação de Mensagem */}
          <div className="p-3 border-t bg-card">
            {/* Atalhos Rápidos */}
            <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 text-[11px] text-muted-foreground">
              <span className="font-medium text-xs flex items-center gap-1 text-primary">
                <Sparkles className="w-3 h-3" /> Respostas Rápidas:
              </span>
              <button
                type="button"
                onClick={() => setInputText('Olá! Como posso te ajudar hoje?')}
                className="px-2 py-0.5 bg-muted rounded-md hover:bg-muted/80 whitespace-nowrap"
              >
                Saudação
              </button>
              <button
                type="button"
                onClick={() => setInputText('Estou gerando seu boleto e já te envio o código de barras.')}
                className="px-2 py-0.5 bg-muted rounded-md hover:bg-muted/80 whitespace-nowrap"
              >
                Boleto / Pix
              </button>
              <button
                type="button"
                onClick={() => setInputText('Sua solicitação de documento foi enviada para a secretaria.')}
                className="px-2 py-0.5 bg-muted rounded-md hover:bg-muted/80 whitespace-nowrap"
              >
                Secretaria
              </button>
              <button
                type="button"
                onClick={() => setInputText('Agradecemos pelo contato! Tenha um excelente dia.')}
                className="px-2 py-0.5 bg-muted rounded-md hover:bg-muted/80 whitespace-nowrap"
              >
                Despedida
              </button>
            </div>

            <form onSubmit={handleSend} className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-10 w-10 p-0 text-muted-foreground hover:text-foreground"
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
                <Paperclip className="w-4 h-4" />
              </Button>

              <Input
                placeholder="Digite sua mensagem para o responsável... (Pressione Enter para enviar)"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="h-10 text-sm"
              />

              <Button type="submit" size="sm" className="h-10 px-4 gap-1.5">
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Enviar</span>
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground bg-muted/5">
          <MessageSquare className="w-12 h-12 opacity-30 mb-3" />
          <h4 className="font-semibold text-foreground text-base">Central de Mensagens WhatsApp</h4>
          <p className="text-xs max-w-sm mt-1 mb-4 text-muted-foreground">
            Selecione uma conversa na lista lateral ou inicie um atendimento com qualquer responsável da escola.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setNewChatOpen(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Nova Conversa
            </Button>
            <Button size="sm" variant="outline" onClick={syncWithUaizap} disabled={isSyncing} className="gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
          </div>
        </div>
      )}

      {/* ---------------- 3. PAINEL DIREITO RETRÁTIL: DADOS DO ALUNO E RESPONSÁVEL ---------------- */}
      {showRightDrawer && activeConversation && (
        <div className="absolute inset-0 z-30 md:static md:inset-auto w-full md:w-72 xl:w-80 border-l bg-card flex flex-col overflow-y-auto flex-shrink-0 animate-in slide-in-from-right duration-150">
          <div className="p-3 sm:p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 md:hidden text-muted-foreground hover:text-foreground"
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
              className="h-6 w-6 p-0 hidden md:flex"
              onClick={() => setShowRightDrawer(false)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-4 space-y-5">
            {/* Foto e Nome */}
            <div className="text-center space-y-2">
              <Avatar className="w-16 h-16 mx-auto border-2 border-primary/20 shadow-xs">
                {activeConversation.avatar_url && <AvatarImage src={activeConversation.avatar_url} />}
                <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
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
                  <Avatar className="w-10 h-10 border border-primary/30">
                    {activeConversation.student_info.foto_url && (
                      <AvatarImage src={activeConversation.student_info.foto_url} />
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

            <div className="grid grid-cols-2 gap-3">
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

            <div className="grid grid-cols-2 gap-3">
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

      {/* ---------------- MODAL DE GATILHOS AJUSTÁVEIS ---------------- */}
      <WhatsAppAdjustableTriggerModal
        open={triggerModalOpen}
        onOpenChange={setTriggerModalOpen}
        conversation={activeConversation}
        allSectors={allAvailableSectors}
        triggers={triggers}
        schoolName={school?.name || 'Escola'}
        onDispatchTrigger={handleDispatchTrigger}
      />
    </div>
  );
}
