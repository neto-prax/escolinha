import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Phone,
  MoreVertical,
  UserPlus,
  Tag,
  XCircle,
  AlertTriangle,
  Clock,
  CheckCircle,
  Play,
  RotateCcw,
} from "lucide-react";
import { Conversation } from "./ConversationCard";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  conversation: Conversation;
  onLinkStudent: () => void;
  onChangeType: () => void;
  onCloseTicket: () => void;
  onChangePriority: (priority: 'low' | 'normal' | 'high' | 'urgent') => void;
  onChangeStatus: (status: 'open' | 'pending' | 'resolved' | 'closed') => void;
}

const contactTypeConfig = {
  lead: { label: 'Lead', color: 'bg-yellow-500' },
  guardian: { label: 'Responsável', color: 'bg-green-500' },
  student: { label: 'Aluno', color: 'bg-blue-500' },
  staff: { label: 'Equipe', color: 'bg-purple-500' },
  other: { label: 'Outro', color: 'bg-gray-500' },
};

const priorityConfig = {
  low: { label: 'Baixa', color: 'text-gray-500' },
  normal: { label: 'Normal', color: 'text-blue-500' },
  high: { label: 'Alta', color: 'text-orange-500' },
  urgent: { label: 'Urgente', color: 'text-red-500' },
};

const statusConfig = {
  open: { label: 'Aberto', icon: Clock, color: 'text-blue-500' },
  pending: { label: 'Pendente', icon: AlertTriangle, color: 'text-yellow-500' },
  resolved: { label: 'Resolvido', icon: CheckCircle, color: 'text-green-500' },
  closed: { label: 'Fechado', icon: XCircle, color: 'text-gray-500' },
};

export function ChatHeader({
  conversation,
  onLinkStudent,
  onChangeType,
  onCloseTicket,
  onChangePriority,
  onChangeStatus,
}: ChatHeaderProps) {
  const typeConfig = contactTypeConfig[conversation.contact_type];
  const priority = priorityConfig[conversation.priority];
  const status = statusConfig[conversation.ticket_status];
  const StatusIcon = status.icon;

  const initials = conversation.contact_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center justify-between p-3 border-b bg-background">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={conversation.avatar_url} />
          <AvatarFallback className={cn("text-white", typeConfig.color)}>
            {initials}
          </AvatarFallback>
        </Avatar>

        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{conversation.contact_name}</h3>
            <Badge
              variant="secondary"
              className={cn("text-[10px] px-1.5 py-0 text-white", typeConfig.color)}
            >
              {typeConfig.label}
            </Badge>
            <div className={cn("flex items-center gap-1", status.color)}>
              <StatusIcon className="h-3.5 w-3.5" />
              <span className="text-xs">{status.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">{conversation.phone}</span>
            {conversation.linked_students && conversation.linked_students.length > 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                <div className="flex gap-1">
                  {conversation.linked_students.slice(0, 2).map(student => (
                    <Badge
                      key={student.id}
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-accent"
                    >
                      {student.name.split(' ')[0]}
                    </Badge>
                  ))}
                  {conversation.linked_students.length > 2 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      +{conversation.linked_students.length - 2}
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Action buttons based on ticket status */}
        {conversation.ticket_status === 'open' && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-yellow-600 border-yellow-300 hover:bg-yellow-50"
            onClick={() => onChangeStatus('pending')}
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Aceitar
          </Button>
        )}

        {conversation.ticket_status === 'pending' && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-green-600 border-green-300 hover:bg-green-50"
              onClick={() => onChangeStatus('resolved')}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Resolver
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={onCloseTicket}
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Fechar
            </Button>
          </>
        )}

        {conversation.ticket_status === 'resolved' && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-blue-600 border-blue-300 hover:bg-blue-50"
              onClick={() => onChangeStatus('open')}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reabrir
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={onCloseTicket}
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Fechar
            </Button>
          </>
        )}

        {conversation.ticket_status === 'closed' && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-blue-600 border-blue-300 hover:bg-blue-50"
            onClick={() => onChangeStatus('open')}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reabrir
          </Button>
        )}

        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Phone className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onLinkStudent}>
              <UserPlus className="h-4 w-4 mr-2" />
              Vincular aluno
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onChangeType}>
              <Tag className="h-4 w-4 mr-2" />
              Alterar tipo
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              disabled={conversation.ticket_status === 'open'}
              onClick={() => onChangeStatus('open')}
            >
              <Clock className="h-4 w-4 mr-2 text-blue-500" />
              Marcar como aberto
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={conversation.ticket_status === 'pending'}
              onClick={() => onChangeStatus('pending')}
            >
              <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
              Marcar como pendente
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={conversation.ticket_status === 'resolved'}
              onClick={() => onChangeStatus('resolved')}
            >
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Marcar como resolvido
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="text-destructive"
              onClick={onCloseTicket}
              disabled={conversation.ticket_status === 'closed'}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Encerrar ticket
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
