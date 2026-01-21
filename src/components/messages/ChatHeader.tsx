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
  Contact,
  ArrowRightLeft,
  History,
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
  onAcceptTicket: () => void;
  onViewContact?: () => void;
  onTransferSector?: () => void;
  onViewHistory?: () => void;
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
  onAcceptTicket,
  onViewContact,
  onTransferSector,
  onViewHistory,
}: ChatHeaderProps) {
  const contactTypes = conversation.contact_types || [conversation.contact_type];
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
          <AvatarFallback className={cn("text-white", contactTypeConfig[contactTypes[0]]?.color || 'bg-gray-500')}>
            {initials}
          </AvatarFallback>
        </Avatar>

        <div>
          <div className="flex items-center gap-2">
            <h3 
              className={cn(
                "font-semibold",
                conversation.contact_id && onViewContact && "cursor-pointer hover:text-primary hover:underline"
              )}
              onClick={() => conversation.contact_id && onViewContact?.()}
            >
              {conversation.contact_name}
            </h3>
            {contactTypes.map((type) => {
              const config = contactTypeConfig[type] || contactTypeConfig.other;
              return (
                <Badge
                  key={type}
                  variant="secondary"
                  className={cn("text-[10px] px-1.5 py-0 text-white", config.color)}
                >
                  {config.label}
                </Badge>
              );
            })}
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
                <div className="flex gap-1 flex-wrap">
                  {conversation.linked_students.slice(0, 2).map(student => {
                    const billingColor = student.billing_status === 'inadimplente' 
                      ? 'border-red-400 text-red-600 bg-red-50' 
                      : student.billing_status === 'adimplente'
                        ? 'border-green-400 text-green-600 bg-green-50'
                        : '';
                    return (
                      <Badge
                        key={student.id}
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0 cursor-pointer hover:bg-accent", billingColor)}
                        title={`${student.name}${student.class_name ? ` - ${student.class_name}` : ''} (${student.billing_status === 'inadimplente' ? 'Inadimplente' : student.billing_status === 'adimplente' ? 'Adimplente' : 'Status desconhecido'})`}
                      >
                        {student.name.split(' ')[0]}
                        {student.class_name && (
                          <span className="ml-1 text-muted-foreground">({student.class_name})</span>
                        )}
                      </Badge>
                    );
                  })}
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
        {/* Show Accept button if ticket has no assigned_to (pending) */}
        {!conversation.assigned_to && conversation.ticket_status !== 'closed' && conversation.ticket_status !== 'resolved' && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-blue-600 border-blue-300 hover:bg-blue-50"
            onClick={onAcceptTicket}
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Aceitar
          </Button>
        )}

        {/* Show Close button if ticket is accepted (has assigned_to) */}
        {conversation.assigned_to && conversation.ticket_status !== 'closed' && conversation.ticket_status !== 'resolved' && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={onCloseTicket}
          >
            <XCircle className="h-3.5 w-3.5 mr-1.5" />
            Encerrar
          </Button>
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
              Encerrar
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
            {conversation.contact_id && onViewContact && (
              <DropdownMenuItem onClick={onViewContact}>
                <Contact className="h-4 w-4 mr-2" />
                Ver contato
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onLinkStudent}>
              <UserPlus className="h-4 w-4 mr-2" />
              Vincular aluno
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onChangeType}>
              <Tag className="h-4 w-4 mr-2" />
              Alterar tipo
            </DropdownMenuItem>
            {onTransferSector && conversation.ticket_status !== 'closed' && (
              <DropdownMenuItem onClick={onTransferSector}>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transferir para outro setor
              </DropdownMenuItem>
            )}
            {onViewHistory && (
              <DropdownMenuItem onClick={onViewHistory}>
                <History className="h-4 w-4 mr-2" />
                Ver histórico
              </DropdownMenuItem>
            )}

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
