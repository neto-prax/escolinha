import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Play,
  ArrowRightLeft,
  User,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface HistoryEvent {
  id: string;
  type: 'created' | 'accepted' | 'transferred' | 'resolved' | 'closed' | 'reopened' | 'message';
  description: string;
  timestamp: string;
  user?: string;
  metadata?: Record<string, unknown>;
}

interface ConversationHistoryModalProps {
  open: boolean;
  onClose: () => void;
  contactName: string;
  history: HistoryEvent[];
  isLoading?: boolean;
}

const eventConfig = {
  created: { 
    icon: MessageSquare, 
    color: 'bg-blue-500',
    label: 'Conversa iniciada'
  },
  accepted: { 
    icon: Play, 
    color: 'bg-green-500',
    label: 'Ticket aceito'
  },
  transferred: { 
    icon: ArrowRightLeft, 
    color: 'bg-orange-500',
    label: 'Transferido'
  },
  resolved: { 
    icon: CheckCircle, 
    color: 'bg-emerald-500',
    label: 'Resolvido'
  },
  closed: { 
    icon: XCircle, 
    color: 'bg-gray-500',
    label: 'Encerrado'
  },
  reopened: { 
    icon: Clock, 
    color: 'bg-yellow-500',
    label: 'Reaberto'
  },
  message: { 
    icon: MessageSquare, 
    color: 'bg-primary',
    label: 'Mensagem'
  },
};

export function ConversationHistoryModal({
  open,
  onClose,
  contactName,
  history,
  isLoading,
}: ConversationHistoryModalProps) {
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd 'de' MMM 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico da Conversa
          </DialogTitle>
          <DialogDescription>
            Timeline de eventos da conversa com <strong>{contactName}</strong>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum evento registrado</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              
              <div className="space-y-4">
                {history.map((event, index) => {
                  const config = eventConfig[event.type] || eventConfig.message;
                  const Icon = config.icon;
                  
                  return (
                    <div key={event.id} className="relative flex gap-4 pl-2">
                      {/* Icon circle */}
                      <div className={cn(
                        "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white",
                        config.color
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(event.timestamp)}
                          </span>
                        </div>
                        
                        <p className="mt-1 text-sm">{event.description}</p>
                        
                        {event.user && (
                          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {event.user}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
