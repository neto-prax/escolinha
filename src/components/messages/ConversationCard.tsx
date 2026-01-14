import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MessageCircle, Clock, CheckCircle, XCircle } from "lucide-react";

export interface LinkedStudent {
  id: string;
  name: string;
  class_name?: string;
  billing_status?: 'adimplente' | 'inadimplente' | 'desconhecido';
}

export interface Conversation {
  id: string;
  contact_name: string;
  phone: string;
  avatar_url?: string;
  contact_type: 'lead' | 'guardian' | 'student' | 'staff' | 'other';
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  ticket_status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  linked_students?: LinkedStudent[];
  sector_name?: string;
  resolution_summary?: string;
  closed_at?: string;
  assigned_to?: string | null;
}

interface ConversationCardProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

const contactTypeConfig = {
  lead: { label: 'Lead', color: 'bg-yellow-500' },
  guardian: { label: 'Responsável', color: 'bg-green-500' },
  student: { label: 'Aluno', color: 'bg-blue-500' },
  staff: { label: 'Equipe', color: 'bg-purple-500' },
  other: { label: 'Outro', color: 'bg-gray-500' },
};

const ticketStatusIcons = {
  open: <MessageCircle className="h-3 w-3 text-blue-500" />,
  pending: <Clock className="h-3 w-3 text-yellow-500" />,
  resolved: <CheckCircle className="h-3 w-3 text-green-500" />,
  closed: <XCircle className="h-3 w-3 text-gray-500" />,
};

export function ConversationCard({ conversation, isSelected, onClick }: ConversationCardProps) {
  const typeConfig = contactTypeConfig[conversation.contact_type];
  const initials = conversation.contact_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ontem';
    } else if (days < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 p-3 cursor-pointer border-b transition-colors hover:bg-accent/50",
        isSelected && "bg-accent"
      )}
    >
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={conversation.avatar_url} />
          <AvatarFallback className={cn("text-white text-sm", typeConfig.color)}>
            {initials}
          </AvatarFallback>
        </Avatar>
        {conversation.unread_count > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
            {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium truncate">{conversation.contact_name}</span>
            <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 text-white", typeConfig.color)}>
              {typeConfig.label}
            </Badge>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {ticketStatusIcons[conversation.ticket_status]}
            <span className="text-xs text-muted-foreground">
              {formatTime(conversation.last_message_at)}
            </span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground truncate mt-0.5">
          {conversation.last_message || 'Nenhuma mensagem'}
        </p>

        {conversation.linked_students && conversation.linked_students.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {conversation.linked_students.slice(0, 3).map(student => (
              <Badge key={student.id} variant="outline" className="text-[10px] px-1.5 py-0">
                {student.name.split(' ')[0]}
              </Badge>
            ))}
            {conversation.linked_students.length > 3 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                +{conversation.linked_students.length - 3}
              </Badge>
            )}
          </div>
        )}

        {conversation.priority === 'urgent' && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 mt-1">
            Urgente
          </Badge>
        )}
      </div>
    </div>
  );
}
