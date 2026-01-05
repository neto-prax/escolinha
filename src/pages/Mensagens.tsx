import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Send, Phone, Clock, User, Filter } from 'lucide-react';
import { useState } from 'react';

// Mock data
const sectors = [
  { id: '1', name: 'Financeiro' },
  { id: '2', name: 'Secretaria' },
  { id: '3', name: 'Pedagógico' },
];

const conversations = [
  {
    id: '1',
    contact: 'Maria Silva',
    phone: '(11) 99999-1111',
    lastMessage: 'Olá, gostaria de saber sobre a mensalidade de janeiro.',
    time: '10:30',
    unread: 2,
    sector: 'Financeiro',
  },
  {
    id: '2',
    contact: 'João Santos',
    phone: '(11) 99999-2222',
    lastMessage: 'Preciso do histórico escolar do meu filho.',
    time: '09:15',
    unread: 0,
    sector: 'Secretaria',
  },
  {
    id: '3',
    contact: 'Ana Costa',
    phone: '(11) 99999-3333',
    lastMessage: 'Qual horário da reunião de pais?',
    time: 'Ontem',
    unread: 0,
    sector: 'Pedagógico',
  },
  {
    id: '4',
    contact: 'Roberto Oliveira',
    phone: '(11) 99999-4444',
    lastMessage: 'Obrigado pela informação!',
    time: 'Ontem',
    unread: 0,
    sector: 'Financeiro',
  },
];

const messages = [
  { id: '1', text: 'Olá, boa tarde!', sender: 'contact', time: '10:25' },
  { id: '2', text: 'Olá! Como posso ajudar?', sender: 'me', time: '10:26' },
  { id: '3', text: 'Gostaria de saber sobre a mensalidade de janeiro.', sender: 'contact', time: '10:28' },
  { id: '4', text: 'O valor já foi pago ou ainda está pendente?', sender: 'contact', time: '10:30' },
];

const Mensagens = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>('1');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [newMessage, setNewMessage] = useState('');

  const filteredConversations = selectedSector === 'all'
    ? conversations
    : conversations.filter((c) => c.sector === selectedSector);

  const activeConversation = conversations.find((c) => c.id === selectedConversation);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mensagens"
        description="Central de mensagens WhatsApp por setor"
      />

      <div className="grid gap-6 lg:grid-cols-3 h-[calc(100vh-220px)]">
        {/* Conversations list */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar conversa..." className="pl-9" />
              </div>
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {sectors.map((sector) => (
                    <SelectItem key={sector.id} value={sector.name}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation.id)}
                  className={`flex items-start gap-3 p-4 cursor-pointer border-b transition-colors hover:bg-muted/50 ${
                    selectedConversation === conversation.id ? 'bg-muted' : ''
                  }`}
                >
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {conversation.contact.split(' ').map((n) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{conversation.contact}</span>
                      <span className="text-xs text-muted-foreground">{conversation.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.lastMessage}
                    </p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {conversation.sector}
                    </Badge>
                  </div>
                  {conversation.unread > 0 && (
                    <Badge className="h-5 w-5 flex items-center justify-center p-0 rounded-full">
                      {conversation.unread}
                    </Badge>
                  )}
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat area */}
        <Card className="lg:col-span-2 flex flex-col">
          {activeConversation ? (
            <>
              {/* Chat header */}
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {activeConversation.contact.split(' ').map((n) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{activeConversation.contact}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {activeConversation.phone}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {activeConversation.sector}
                  </Badge>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 overflow-auto p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender === 'me' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.sender === 'me'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p
                          className={`text-xs mt-1 ${
                            message.sender === 'me'
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {message.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>

              {/* Input area */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="min-h-[40px] max-h-[120px]"
                    rows={1}
                  />
                  <Button size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
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
    </div>
  );
};

export default Mensagens;
