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
import { WhatsAppChatConversation, WhatsAppChatMessage } from '@/types/mensagens';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

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
    simulateIncomingMessage,
    syncWithUaizap,
    isSyncing,
    uaizapStatus,
    createNewConversation,
    isDemoMode,
    setIsDemoMode,
    isLoadingDbConversations,
  } = useWhatsAppInbox();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [inputText, setInputText] = useState('');
  const [showRightDrawer, setShowRightDrawer] = useState(true);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [targetSectorId, setTargetSectorId] = useState('');

  // Simulator modal state
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simName, setSimName] = useState('Mariana Silveira');
  const [simPhone, setSimPhone] = useState('5511988887766');
  const [simStudent, setSimStudent] = useState('Lucas Silveira');
  const [simMessage, setSimMessage] = useState('Gostaria de solicitar a segunda via do boleto por favor.');

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

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Sector filter
      if (selectedSectorFilter !== 'all' && c.sector_id !== selectedSectorFilter) {
        return false;
      }
      // Status filter
      if (selectedStatusFilter !== 'all' && c.ticket_status !== selectedStatusFilter) {
        return false;
      }
      // Search
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
  }, [conversations, selectedSectorFilter, selectedStatusFilter, searchQuery]);

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

  const handleRunSimulation = () => {
    if (!simMessage.trim()) return;
    simulateIncomingMessage({
      contactName: simName.trim() || 'Responsável',
      phone: simPhone.trim() || '5511999990000',
      message: simMessage.trim(),
      studentName: simStudent.trim() || undefined,
    });
    setSimulatorOpen(false);
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
    <div className="flex h-[calc(100vh-12rem)] min-h-[600px] border rounded-xl overflow-hidden bg-background shadow-sm">
      {/* ---------------- 1. PAINEL ESQUERDO: LISTA DE CONVERSAS ---------------- */}
      <div className="w-80 md:w-96 flex flex-col border-r bg-muted/20">
        {/* Cabeçalho do Painel com Filtros e Acesso */}
        <div className="p-3 border-b space-y-2.5 bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold leading-none">Inbox WhatsApp</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isDirector
                    ? 'Acesso a todos os setores'
                    : `Seus setores autorizados (${userPermittedSectors.length})`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs gap-1 text-primary border-primary/20 hover:bg-primary/5"
                onClick={() => setSimulatorOpen(true)}
                title="Testar gatilhos e simular mensagem de pai/aluno"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span className="hidden sm:inline">Simular</span>
              </Button>

              <Button
                size="sm"
                variant="default"
                className="h-7 px-2.5 text-xs gap-1"
                onClick={() => setNewChatOpen(true)}
                title="Iniciar nova conversa no WhatsApp"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova</span>
              </Button>
            </div>
          </div>

          {/* Barra de Status Uaizap & Sincronização */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-muted/40 border text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  uaizapStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="text-[11px] font-medium truncate text-foreground">
                {uaizapStatus.connected
                  ? `Uaizap: ${uaizapStatus.profileName || 'Online'}`
                  : 'Uaizap: Aguardando Conexão'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isDemoMode ? (
                <Badge
                  variant="outline"
                  className="text-[10px] h-5 px-1.5 cursor-pointer bg-amber-500/10 text-amber-600 border-amber-300"
                  onClick={() => setIsDemoMode(false)}
                  title="Clique para desativar o modo de demonstração"
                >
                  Modo Demo (Sair)
                </Badge>
              ) : null}

              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px] gap-1 hover:bg-muted text-primary"
                onClick={syncWithUaizap}
                disabled={isSyncing}
                title="Sincronizar com Uaizap e atualizar conversas"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
              </Button>
            </div>
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
                <Building2 className="w-8 h-8 mx-auto opacity-30" />
                <p className="font-semibold text-foreground">Nenhuma conversa encontrada</p>
                <p className="text-[11px] max-w-[220px] mx-auto text-muted-foreground">
                  A conexão com o Uaizap está pronta para receber mensagens de pais e alunos.
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
                    Sincronizar Uaizap
                  </Button>
                  {!isDemoMode && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] text-muted-foreground"
                      onClick={() => setIsDemoMode(true)}
                    >
                      Ver Conversas de Demonstração
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = activeConversation?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
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
                        <span className="font-medium text-xs truncate max-w-[140px] text-foreground">
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

                    {conv.unread_count > 0 && (
                      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ---------------- 2. PAINEL CENTRAL: CONVERSA ATIVA ---------------- */}
      {activeConversation ? (
        <div className="flex-1 flex flex-col bg-background min-w-0">
          {/* Cabeçalho da Conversa Ativa */}
          <div className="h-16 border-b px-4 flex items-center justify-between bg-card flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="w-10 h-10 border">
                {activeConversation.avatar_url && <AvatarImage src={activeConversation.avatar_url} />}
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {activeConversation.contact_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm truncate">{activeConversation.contact_name}</h4>
                  {getStatusBadge(activeConversation.ticket_status)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{activeConversation.phone}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-primary">
                    <Building2 className="w-3 h-3" />
                    {activeConversation.sector_name || 'Sem Setor'}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações do Atendimento */}
            <div className="flex items-center gap-2">
              {/* WhatsApp Web Link Direto */}
              <a
                href={`https://wa.me/${activeConversation.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex"
              >
                <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>WhatsApp Web</span>
                </Button>
              </a>

              {/* Botão de Transferir Setor */}
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                onClick={() => {
                  setTargetSectorId(activeConversation.sector_id || 'secretaria');
                  setTransferModalOpen(true);
                }}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden sm:inline">Transferir</span>
              </Button>

              {/* Status do Ticket */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="hidden sm:inline">Status</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Status do Atendimento</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => changeTicketStatus(activeConversation.id, 'open')}>
                    🟢 Em Aberto
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeTicketStatus(activeConversation.id, 'pending')}>
                    🟡 Aguardando Resposta (Pendente)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeTicketStatus(activeConversation.id, 'resolved')}>
                    🔵 Resolvido
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
                className="h-8 w-8 p-0"
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

                        {/* Conteúdo de Texto */}
                        <p className="whitespace-pre-wrap leading-relaxed select-text text-[13px]">
                          {msg.body}
                        </p>

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
                  const demoUrl = 'https://purpleedu.com.br/docs/comprovante.pdf';
                  sendMessage('Segue o documento solicitado em anexo:', {
                    url: demoUrl,
                    filename: 'Declaracao_Matricula.pdf',
                    type: 'document',
                  });
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
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-muted/5">
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
        <div className="w-72 lg:w-80 border-l bg-card flex flex-col overflow-y-auto">
          <div className="p-4 border-b flex items-center justify-between">
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              Detalhes do Contato
            </h4>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
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
          </div>
        </div>
      )}

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

      {/* ---------------- MODAL SIMULADOR DE MENSAGENS E GATILHOS ---------------- */}
      <Dialog open={simulatorOpen} onOpenChange={setSimulatorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Simular Mensagem de WhatsApp
            </DialogTitle>
            <DialogDescription>
              Envie uma mensagem simulando o WhatsApp de um pai/aluno para validar se os gatilhos (triggers)
              respondem e direcionam para o setor correto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Nome do Contato</label>
                <Input
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  placeholder="Ex: Carlos Santos"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Telefone</label>
                <Input
                  value={simPhone}
                  onChange={(e) => setSimPhone(e.target.value)}
                  placeholder="5511999990000"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Aluno Vinculado</label>
              <Input
                value={simStudent}
                onChange={(e) => setSimStudent(e.target.value)}
                placeholder="Ex: Sofia Santos"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Mensagem Enviada pelo Responsável</label>
              <Input
                value={simMessage}
                onChange={(e) => setSimMessage(e.target.value)}
                placeholder="Digite palavras como 'boleto', 'matricula', 'declaracao' ou 'horario'..."
                className="h-10 text-xs"
              />
            </div>

            {/* Sugestões de teste */}
            <div className="space-y-1.5 pt-2 border-t">
              <span className="text-[11px] text-muted-foreground font-medium">
                Testes sugeridos para acionar triggers cadastrados:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 text-[10px]"
                  onClick={() => setSimMessage('Boa tarde, qual o valor da mensalidade e matrícula para o 5º ano?')}
                >
                  🎒 Trigger: Matrículas
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 text-[10px]"
                  onClick={() => setSimMessage('Preciso da 2ª via do boleto vencido')}
                >
                  💳 Trigger: Boleto / Financeiro
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 text-[10px]"
                  onClick={() => setSimMessage('Gostaria de solicitar uma declaração de transferência')}
                >
                  📑 Trigger: Secretaria
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 text-[10px]"
                  onClick={() => setSimMessage('Qual o horário de funcionamento da secretaria?')}
                >
                  ⏰ Trigger: Horário
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSimulatorOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleRunSimulation} className="gap-1.5">
              <Send className="w-3.5 h-3.5" />
              Simular Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
