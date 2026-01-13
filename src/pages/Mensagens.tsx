import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, User, MessageSquare, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ConversationCard, Conversation } from '@/components/messages/ConversationCard';
import { ChatHeader } from '@/components/messages/ChatHeader';
import { MessageBubble, Message } from '@/components/messages/MessageBubble';
import { MessageInput } from '@/components/messages/MessageInput';
import { SystemMessage } from '@/components/messages/SystemMessage';
import { TicketCloseModal } from '@/components/messages/TicketCloseModal';
import { LinkStudentModal } from '@/components/messages/LinkStudentModal';
import { ChangeContactTypeModal } from '@/components/messages/ChangeContactTypeModal';
import { NewConversationModal } from '@/components/messages/NewConversationModal';
import {
  useWhatsAppConversations,
  useWhatsAppMessages,
  useSendMessage,
  useUpdateConversationStatus,
} from '@/hooks/useWhatsAppConversations';
import { toast } from 'sonner';

const Mensagens = () => {
  const { profile } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedContactType, setSelectedContactType] = useState<string>('all');
  const [ticketFilter, setTicketFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [ticketCloseModalOpen, setTicketCloseModalOpen] = useState(false);
  const [linkStudentModalOpen, setLinkStudentModalOpen] = useState(false);
  const [changeTypeModalOpen, setChangeTypeModalOpen] = useState(false);
  const [newConversationModalOpen, setNewConversationModalOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch sectors
  const { data: sectors = [] } = useQuery({
    queryKey: ['sectors', profile?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sectors')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.school_id,
  });

  // Fetch students for linking
  const { data: students = [] } = useQuery({
    queryKey: ['students', profile?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, enrollment_number')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data.map(s => ({
        id: s.id,
        full_name: s.full_name,
        enrollment_number: s.enrollment_number || '',
        class_name: '',
      }));
    },
    enabled: !!profile?.school_id,
  });

  // Fetch contacts for new conversation
  const { data: existingContacts = [] } = useQuery({
    queryKey: ['contacts', profile?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, full_name, phone, contact_type')
        .order('full_name');
      if (error) throw error;
      return data.map(c => ({
        id: c.id,
        full_name: c.full_name,
        phone: c.phone,
        contact_type: c.contact_type as 'lead' | 'guardian' | 'student' | 'staff' | 'other',
      }));
    },
    enabled: !!profile?.school_id,
  });

  // Fetch conversations
  const { data: rawConversations = [], isLoading: loadingConversations } = useWhatsAppConversations(
    selectedSector !== 'all' ? selectedSector : undefined
  );

  // Transform conversations to match component interface
  const conversationsList: Conversation[] = rawConversations.map(conv => ({
    id: conv.id,
    contact_name: conv.contact?.full_name || conv.contact_name || conv.phone,
    phone: conv.phone,
    last_message: '',
    last_message_at: conv.last_message_at || undefined,
    unread_count: conv.unread_count || 0,
    sector_name: conv.sector?.name,
    contact_type: (conv.contact?.contact_type as 'lead' | 'guardian' | 'student' | 'staff' | 'other') || 'other',
    ticket_status: (conv.ticket_status as 'open' | 'pending' | 'resolved' | 'closed') || 'open',
    priority: (conv.priority as 'low' | 'normal' | 'high' | 'urgent') || 'normal',
    linked_students: conv.contact?.linked_student_ids?.map(id => ({
      id,
      name: students.find(s => s.id === id)?.full_name || 'Aluno',
    })) || [],
    resolution_summary: conv.resolution_summary || undefined,
    closed_at: conv.closed_at || undefined,
  }));

  // Fetch messages for selected conversation
  const { data: rawMessages = [], isLoading: loadingMessages } = useWhatsAppMessages(selectedConversation);

  // Transform messages
  const messages: Message[] = rawMessages.map(msg => ({
    id: msg.id,
    body: msg.body || '',
    direction: msg.direction as 'incoming' | 'outgoing',
    created_at: msg.created_at,
    status: (msg.status === 'sending' ? 'pending' : msg.status) as 'pending' | 'sent' | 'delivered' | 'read' | 'failed',
    message_type: (msg.message_type as 'text' | 'image' | 'video' | 'audio' | 'sticker' | 'document') || 'text',
    media_url: msg.media_url || undefined,
    media_caption: msg.media_caption || undefined,
    media_filename: msg.media_filename || undefined,
  }));

  // Mutations
  const sendMessage = useSendMessage();
  const updateStatus = useUpdateConversationStatus();

  const filteredConversations = conversationsList.filter((c) => {
    const matchesType = selectedContactType === 'all' || c.contact_type === selectedContactType;
    const matchesTicket = ticketFilter === 'all' || c.ticket_status === ticketFilter;
    const matchesSearch =
      searchQuery === '' ||
      c.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery);
    return matchesType && matchesTicket && matchesSearch;
  });

  const activeConversation = conversationsList.find((c) => c.id === selectedConversation);

  // Auto-select first conversation
  useEffect(() => {
    if (!selectedConversation && filteredConversations.length > 0) {
      setSelectedConversation(filteredConversations[0].id);
    }
  }, [filteredConversations, selectedConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleCloseTicket = async (data: { summary: string; category: string; resolved: boolean }) => {
    if (!selectedConversation) return;
    try {
      await updateStatus.mutateAsync({
        conversationId: selectedConversation,
        status: 'closed',
        resolutionSummary: data.summary,
      });
      toast.success('Ticket encerrado');
    } catch (error) {
      toast.error('Erro ao encerrar ticket');
    }
    setTicketCloseModalOpen(false);
  };

  const handleChangeStatus = async (newStatus: 'open' | 'pending' | 'resolved' | 'closed') => {
    if (!selectedConversation) return;
    try {
      await updateStatus.mutateAsync({
        conversationId: selectedConversation,
        status: newStatus,
      });
      toast.success('Status atualizado');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleChangePriority = async (newPriority: 'low' | 'normal' | 'high' | 'urgent') => {
    if (!selectedConversation) return;
    try {
      await supabase
        .from('whatsapp_conversations')
        .update({ priority: newPriority })
        .eq('id', selectedConversation);
      toast.success('Prioridade atualizada');
    } catch (error) {
      toast.error('Erro ao atualizar prioridade');
    }
  };

  const handleLinkStudents = async (studentIds: string[]) => {
    if (!activeConversation) return;
    // TODO: Update contact's linked_student_ids
    setLinkStudentModalOpen(false);
    toast.success('Alunos vinculados');
  };

  const handleChangeContactType = async (newType: 'lead' | 'guardian' | 'student' | 'staff' | 'other') => {
    // TODO: Update contact type
    setChangeTypeModalOpen(false);
    toast.success('Tipo alterado');
  };

  const handleSendMessage = async (content: string, type: 'text' | 'image' | 'video' | 'audio' | 'document', file?: File) => {
    if (!selectedConversation) return;
    try {
      await sendMessage.mutateAsync({
        conversationId: selectedConversation,
        body: content,
        messageType: type,
        replyToId: replyingTo?.id,
      });
      setReplyingTo(null);
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const handleCreateNewConversation = async (data: {
    name: string;
    phone: string;
    type: 'lead' | 'guardian' | 'student' | 'staff' | 'other';
    sectorId: string;
  }) => {
    try {
      // Create contact
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          school_id: profile?.school_id,
          full_name: data.name,
          phone: data.phone,
          contact_type: data.type,
        })
        .select()
        .single();

      if (contactError) throw contactError;

      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          school_id: profile?.school_id,
          phone: data.phone,
          contact_name: data.name,
          contact_id: contact.id,
          sector_id: data.sectorId,
          ticket_status: 'open',
        })
        .select()
        .single();

      if (convError) throw convError;

      setSelectedConversation(conversation.id);
      toast.success('Conversa criada');
    } catch (error) {
      toast.error('Erro ao criar conversa');
    }
    setNewConversationModalOpen(false);
  };

  const handleSelectExistingContact = async (contactId: string, sectorId: string) => {
    const contact = existingContacts.find((c) => c.id === contactId);
    if (!contact) return;

    try {
      const { data: conversation, error } = await supabase
        .from('whatsapp_conversations')
        .insert({
          school_id: profile?.school_id,
          phone: contact.phone,
          contact_name: contact.full_name,
          contact_id: contactId,
          sector_id: sectorId,
          ticket_status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      setSelectedConversation(conversation.id);
      toast.success('Conversa criada');
    } catch (error) {
      toast.error('Erro ao criar conversa');
    }
    setNewConversationModalOpen(false);
  };

  const ticketCounts = {
    all: conversationsList.length,
    open: conversationsList.filter((c) => c.ticket_status === 'open').length,
    pending: conversationsList.filter((c) => c.ticket_status === 'pending').length,
    resolved: conversationsList.filter((c) => c.ticket_status === 'resolved' || c.ticket_status === 'closed').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Mensagens" description="Central de mensagens WhatsApp por setor">
        <Button onClick={() => setNewConversationModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Conversa
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3" style={{ height: 'calc(100vh - 180px)' }}>
        {/* Conversations list */}
        <Card className="lg:col-span-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversa..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Setores</SelectItem>
                  {sectors.map((sector) => (
                    <SelectItem key={sector.id} value={sector.id}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedContactType} onValueChange={setSelectedContactType}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Tipos</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="guardian">Responsável</SelectItem>
                  <SelectItem value="student">Aluno</SelectItem>
                  <SelectItem value="staff">Equipe</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ticket status tabs */}
            <Tabs value={ticketFilter} onValueChange={setTicketFilter}>
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="all" className="text-xs">
                  Todos ({ticketCounts.all})
                </TabsTrigger>
                <TabsTrigger value="open" className="text-xs">
                  Abertos ({ticketCounts.open})
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs">
                  Pendentes ({ticketCounts.pending})
                </TabsTrigger>
                <TabsTrigger value="resolved" className="text-xs">
                  Resolvidos ({ticketCounts.resolved})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              {loadingConversations ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => (
                  <ConversationCard
                    key={conversation.id}
                    conversation={conversation}
                    isSelected={selectedConversation === conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma conversa encontrada</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat area - fixed height container */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          {activeConversation ? (
            <div className="flex flex-col h-full">
              {/* Header - fixed */}
              <div className="flex-shrink-0">
                <ChatHeader
                  conversation={activeConversation}
                  onCloseTicket={() => setTicketCloseModalOpen(true)}
                  onLinkStudent={() => setLinkStudentModalOpen(true)}
                  onChangeType={() => setChangeTypeModalOpen(true)}
                  onChangePriority={handleChangePriority}
                  onChangeStatus={handleChangeStatus}
                />
              </div>

              {/* Messages - scrollable, takes remaining space */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length > 0 ? (
                  <div className="flex flex-col justify-end min-h-full">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} onReply={() => handleReply(message)} />
                      ))}
                      
                      {/* Show resolution summary as yellow system message when ticket is closed */}
                      {activeConversation?.resolution_summary && activeConversation?.ticket_status === 'closed' && (
                        <SystemMessage
                          message={`Ticket encerrado: ${activeConversation.resolution_summary}`}
                          type="closed"
                          timestamp={activeConversation.closed_at}
                        />
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Nenhuma mensagem ainda</p>
                  </div>
                )}
              </div>

              {/* Input area - fixed at bottom */}
              <div className="flex-shrink-0 border-t bg-background">
                <MessageInput
                  onSend={handleSendMessage}
                  replyTo={replyingTo}
                  onCancelReply={() => setReplyingTo(null)}
                  disabled={sendMessage.isPending}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione uma conversa para visualizar</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      <TicketCloseModal
        open={ticketCloseModalOpen}
        onClose={() => setTicketCloseModalOpen(false)}
        onConfirm={handleCloseTicket}
        contactName={activeConversation?.contact_name || ''}
      />

      <LinkStudentModal
        open={linkStudentModalOpen}
        onClose={() => setLinkStudentModalOpen(false)}
        onConfirm={handleLinkStudents}
        students={students}
        linkedStudentIds={activeConversation?.linked_students?.map((s) => s.id) || []}
        contactName={activeConversation?.contact_name || ''}
      />

      <ChangeContactTypeModal
        open={changeTypeModalOpen}
        onClose={() => setChangeTypeModalOpen(false)}
        onConfirm={handleChangeContactType}
        currentType={activeConversation?.contact_type || 'other'}
        contactName={activeConversation?.contact_name || ''}
      />

      <NewConversationModal
        open={newConversationModalOpen}
        onClose={() => setNewConversationModalOpen(false)}
        onCreateNew={handleCreateNewConversation}
        onSelectExisting={handleSelectExistingContact}
        existingContacts={existingContacts}
        sectors={sectors.map((s) => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
};

export default Mensagens;
