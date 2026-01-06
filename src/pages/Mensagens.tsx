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
import { Search, Plus, User, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { ConversationCard, Conversation } from '@/components/messages/ConversationCard';
import { ChatHeader } from '@/components/messages/ChatHeader';
import { MessageBubble, Message } from '@/components/messages/MessageBubble';
import { MessageInput } from '@/components/messages/MessageInput';
import { TicketCloseModal } from '@/components/messages/TicketCloseModal';
import { LinkStudentModal } from '@/components/messages/LinkStudentModal';
import { ChangeContactTypeModal } from '@/components/messages/ChangeContactTypeModal';
import { NewConversationModal } from '@/components/messages/NewConversationModal';

// Mock data
const sectors = [
  { id: '1', name: 'Financeiro' },
  { id: '2', name: 'Secretaria' },
  { id: '3', name: 'Pedagógico' },
];

const mockStudents = [
  { id: '1', full_name: 'Lucas Silva', enrollment_number: '2025001', class_name: '3º Ano A' },
  { id: '2', full_name: 'Ana Silva', enrollment_number: '2025002', class_name: '1º Ano B' },
  { id: '3', full_name: 'Pedro Santos', enrollment_number: '2025003', class_name: '2º Ano A' },
];

const mockExistingContacts = [
  { id: '1', full_name: 'Maria Silva', phone: '(11) 99999-1111', contact_type: 'guardian' as const },
  { id: '2', full_name: 'João Santos', phone: '(11) 99999-2222', contact_type: 'guardian' as const },
  { id: '3', full_name: 'Ana Costa', phone: '(11) 99999-3333', contact_type: 'lead' as const },
];

const initialConversations: Conversation[] = [
  {
    id: '1',
    contact_name: 'Maria Silva',
    phone: '(11) 99999-1111',
    last_message: 'Olá, gostaria de saber sobre a mensalidade de janeiro.',
    last_message_at: new Date().toISOString(),
    unread_count: 2,
    sector_name: 'Financeiro',
    contact_type: 'guardian',
    ticket_status: 'open',
    priority: 'normal',
    linked_students: [
      { id: '1', name: 'Lucas Silva' },
      { id: '2', name: 'Ana Silva' },
    ],
  },
  {
    id: '2',
    contact_name: 'João Santos',
    phone: '(11) 99999-2222',
    last_message: 'Preciso do histórico escolar do meu filho.',
    last_message_at: new Date(Date.now() - 3600000).toISOString(),
    unread_count: 0,
    sector_name: 'Secretaria',
    contact_type: 'guardian',
    ticket_status: 'pending',
    priority: 'high',
    linked_students: [{ id: '3', name: 'Pedro Santos' }],
  },
  {
    id: '3',
    contact_name: 'Ana Costa',
    phone: '(11) 99999-3333',
    last_message: 'Qual horário da reunião de pais?',
    last_message_at: new Date(Date.now() - 86400000).toISOString(),
    unread_count: 0,
    sector_name: 'Pedagógico',
    contact_type: 'lead',
    ticket_status: 'open',
    priority: 'normal',
    linked_students: [],
  },
  {
    id: '4',
    contact_name: 'Roberto Oliveira',
    phone: '(11) 99999-4444',
    last_message: 'Obrigado pela informação!',
    last_message_at: new Date(Date.now() - 86400000).toISOString(),
    unread_count: 0,
    sector_name: 'Financeiro',
    contact_type: 'other',
    ticket_status: 'resolved',
    priority: 'low',
    linked_students: [],
  },
  {
    id: '5',
    contact_name: 'Prof. Carlos',
    phone: '(11) 99999-5555',
    last_message: 'Confirmado para amanhã.',
    last_message_at: new Date(Date.now() - 172800000).toISOString(),
    unread_count: 0,
    sector_name: 'Pedagógico',
    contact_type: 'staff',
    ticket_status: 'resolved',
    priority: 'normal',
    linked_students: [],
  },
];

const initialMessages: Message[] = [
  { 
    id: '1', 
    body: 'Olá, boa tarde!', 
    direction: 'incoming', 
    created_at: new Date(Date.now() - 300000).toISOString(),
    status: 'read',
    message_type: 'text',
  },
  { 
    id: '2', 
    body: 'Olá! Como posso ajudar?', 
    direction: 'outgoing', 
    created_at: new Date(Date.now() - 240000).toISOString(),
    status: 'read',
    message_type: 'text',
  },
  { 
    id: '3', 
    body: 'Gostaria de saber sobre a mensalidade de janeiro.', 
    direction: 'incoming',
    created_at: new Date(Date.now() - 120000).toISOString(),
    status: 'read',
    message_type: 'text',
    reply_to: {
      id: '2',
      body: 'Olá! Como posso ajudar?',
      sender_name: 'Você'
    }
  },
  { 
    id: '4', 
    body: 'O valor já foi pago ou ainda está pendente?', 
    direction: 'incoming',
    created_at: new Date().toISOString(),
    status: 'read',
    message_type: 'text',
  },
];

const Mensagens = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>('1');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedContactType, setSelectedContactType] = useState<string>('all');
  const [ticketFilter, setTicketFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [conversationsList, setConversationsList] = useState<Conversation[]>(initialConversations);
  
  // Modal states
  const [ticketCloseModalOpen, setTicketCloseModalOpen] = useState(false);
  const [linkStudentModalOpen, setLinkStudentModalOpen] = useState(false);
  const [changeTypeModalOpen, setChangeTypeModalOpen] = useState(false);
  const [newConversationModalOpen, setNewConversationModalOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const filteredConversations = conversationsList.filter((c) => {
    const matchesSector = selectedSector === 'all' || c.sector_name === selectedSector;
    const matchesType = selectedContactType === 'all' || c.contact_type === selectedContactType;
    const matchesTicket = ticketFilter === 'all' || c.ticket_status === ticketFilter;
    const matchesSearch = searchQuery === '' || 
      c.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.last_message?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesSector && matchesType && matchesTicket && matchesSearch;
  });

  const activeConversation = conversationsList.find((c) => c.id === selectedConversation);

  const handleCloseTicket = (data: { summary: string; category: string; resolved: boolean }) => {
    if (activeConversation) {
      setConversationsList(prev => 
        prev.map(c => 
          c.id === activeConversation.id 
            ? { ...c, ticket_status: 'closed' as const }
            : c
        )
      );
    }
    setTicketCloseModalOpen(false);
  };

  const handleLinkStudents = (studentIds: string[]) => {
    if (activeConversation) {
      const newLinkedStudents = mockStudents
        .filter(s => studentIds.includes(s.id))
        .map(s => ({ id: s.id, name: s.full_name }));
      setConversationsList(prev => 
        prev.map(c => 
          c.id === activeConversation.id 
            ? { ...c, linked_students: newLinkedStudents }
            : c
        )
      );
    }
    setLinkStudentModalOpen(false);
  };

  const handleChangeContactType = (newType: 'lead' | 'guardian' | 'student' | 'staff' | 'other') => {
    if (activeConversation) {
      setConversationsList(prev => 
        prev.map(c => 
          c.id === activeConversation.id 
            ? { ...c, contact_type: newType }
            : c
        )
      );
    }
    setChangeTypeModalOpen(false);
  };

  const handleChangeStatus = (newStatus: 'open' | 'pending' | 'resolved' | 'closed') => {
    if (activeConversation) {
      setConversationsList(prev => 
        prev.map(c => 
          c.id === activeConversation.id 
            ? { ...c, ticket_status: newStatus }
            : c
        )
      );
    }
  };

  const handleChangePriority = (newPriority: 'low' | 'normal' | 'high' | 'urgent') => {
    if (activeConversation) {
      setConversationsList(prev => 
        prev.map(c => 
          c.id === activeConversation.id 
            ? { ...c, priority: newPriority }
            : c
        )
      );
    }
  };

  const handleSendMessage = (content: string, type: 'text' | 'image' | 'video' | 'audio' | 'document', file?: File) => {
    // In production, this would send to Supabase
    console.log('Sending message:', { content, type, file, replyTo: replyingTo });
    setReplyingTo(null);
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const handleCreateNewConversation = (data: { name: string; phone: string; type: 'lead' | 'guardian' | 'student' | 'staff' | 'other'; sectorId: string }) => {
    const sector = sectors.find(s => s.id === data.sectorId);
    const newConversation: Conversation = {
      id: String(Date.now()),
      contact_name: data.name,
      phone: data.phone,
      contact_type: data.type,
      ticket_status: 'open',
      priority: 'normal',
      unread_count: 0,
      sector_name: sector?.name,
      linked_students: [],
    };
    setConversationsList(prev => [newConversation, ...prev]);
    setSelectedConversation(newConversation.id);
    setNewConversationModalOpen(false);
  };

  const handleSelectExistingContact = (contactId: string, sectorId: string) => {
    const contact = mockExistingContacts.find(c => c.id === contactId);
    const sector = sectors.find(s => s.id === sectorId);
    if (contact) {
      const newConversation: Conversation = {
        id: String(Date.now()),
        contact_name: contact.full_name,
        phone: contact.phone,
        contact_type: contact.contact_type,
        ticket_status: 'open',
        priority: 'normal',
        unread_count: 0,
        sector_name: sector?.name,
        linked_students: [],
      };
      setConversationsList(prev => [newConversation, ...prev]);
      setSelectedConversation(newConversation.id);
    }
    setNewConversationModalOpen(false);
  };

  const ticketCounts = {
    all: conversationsList.length,
    open: conversationsList.filter(c => c.ticket_status === 'open').length,
    pending: conversationsList.filter(c => c.ticket_status === 'pending').length,
    resolved: conversationsList.filter(c => c.ticket_status === 'resolved' || c.ticket_status === 'closed').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mensagens"
        description="Central de mensagens WhatsApp por setor"
      >
        <Button onClick={() => setNewConversationModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Conversa
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3 h-[calc(100vh-220px)]">
        {/* Conversations list */}
        <Card className="lg:col-span-1 flex flex-col">
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
                    <SelectItem key={sector.id} value={sector.name}>
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
              {filteredConversations.length > 0 ? (
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

        {/* Chat area */}
        <Card className="lg:col-span-2 flex flex-col">
          {activeConversation ? (
            <>
              <ChatHeader
                conversation={activeConversation}
                onCloseTicket={() => setTicketCloseModalOpen(true)}
                onLinkStudent={() => setLinkStudentModalOpen(true)}
                onChangeType={() => setChangeTypeModalOpen(true)}
                onChangePriority={handleChangePriority}
                onChangeStatus={handleChangeStatus}
              />

              {/* Messages */}
              <CardContent className="flex-1 overflow-auto p-4">
                <div className="space-y-4">
                  {initialMessages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      onReply={() => handleReply(message)}
                    />
                  ))}
                </div>
              </CardContent>

              {/* Input area */}
              <MessageInput 
                onSend={handleSendMessage}
                replyTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
              />
            </>
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
        students={mockStudents}
        linkedStudentIds={activeConversation?.linked_students?.map(s => s.id) || []}
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
        existingContacts={mockExistingContacts}
        sectors={sectors}
      />
    </div>
  );
};

export default Mensagens;
