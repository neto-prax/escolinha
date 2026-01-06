import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Filter } from "lucide-react";
import { ConversationCard, Conversation } from "./ConversationCard";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Sector {
  id: string;
  name: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  sectors: Sector[];
  selectedConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

type TicketFilter = 'all' | 'open' | 'pending' | 'resolved' | 'closed';
type ContactTypeFilter = 'all' | 'lead' | 'guardian' | 'student' | 'staff' | 'other';

export function ConversationList({
  conversations,
  sectors,
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>('all');
  const [contactTypeFilter, setContactTypeFilter] = useState<ContactTypeFilter>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');

  const filteredConversations = conversations.filter(conv => {
    // Search filter
    const matchesSearch =
      conv.contact_name.toLowerCase().includes(search.toLowerCase()) ||
      conv.phone.includes(search) ||
      conv.last_message?.toLowerCase().includes(search.toLowerCase());

    // Ticket status filter
    const matchesTicket =
      ticketFilter === 'all' || conv.ticket_status === ticketFilter;

    // Contact type filter
    const matchesContactType =
      contactTypeFilter === 'all' || conv.contact_type === contactTypeFilter;

    // Sector filter (would need sector_id in conversation)
    const matchesSector = sectorFilter === 'all'; // TODO: implement sector filter

    return matchesSearch && matchesTicket && matchesContactType && matchesSector;
  });

  const counts = {
    all: conversations.length,
    open: conversations.filter(c => c.ticket_status === 'open').length,
    pending: conversations.filter(c => c.ticket_status === 'pending').length,
    resolved: conversations.filter(c => c.ticket_status === 'resolved').length,
  };

  return (
    <div className="flex flex-col h-full border-r">
      <div className="p-3 border-b space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Tipo de Contato</label>
                  <Select
                    value={contactTypeFilter}
                    onValueChange={(v) => setContactTypeFilter(v as ContactTypeFilter)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="guardian">Responsável</SelectItem>
                      <SelectItem value="student">Aluno</SelectItem>
                      <SelectItem value="staff">Equipe</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Setor</label>
                  <Select
                    value={sectorFilter}
                    onValueChange={setSectorFilter}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {sectors.map(sector => (
                        <SelectItem key={sector.id} value={sector.id}>
                          {sector.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button size="icon" onClick={onNewConversation}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <Tabs value={ticketFilter} onValueChange={(v) => setTicketFilter(v as TicketFilter)}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="all" className="text-xs">
              Todos ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="open" className="text-xs">
              Abertos ({counts.open})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">
              Pendentes ({counts.pending})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs">
              Resolvidos ({counts.resolved})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <p>Nenhuma conversa encontrada</p>
          </div>
        ) : (
          filteredConversations.map(conv => (
            <ConversationCard
              key={conv.id}
              conversation={conv}
              isSelected={conv.id === selectedConversationId}
              onClick={() => onSelectConversation(conv.id)}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}
