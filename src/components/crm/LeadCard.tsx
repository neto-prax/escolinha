import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Phone,
  Mail,
  MoreVertical,
  MessageCircle,
  Calendar,
  User,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Lead {
  id: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email?: string;
  student_name: string;
  student_grade?: string;
  status: string;
  source?: string;
  interest_level?: 'low' | 'medium' | 'high';
  next_follow_up?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  created_at: string;
}

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  onCall: () => void;
  onMessage: () => void;
  onSchedule: () => void;
  isDragging?: boolean;
}

const interestConfig = {
  low: { label: 'Baixo', color: 'bg-gray-500' },
  medium: { label: 'Médio', color: 'bg-yellow-500' },
  high: { label: 'Alto', color: 'bg-green-500' },
};

export function LeadCard({
  lead,
  onClick,
  onCall,
  onMessage,
  onSchedule,
  isDragging,
}: LeadCardProps) {
  const interest = lead.interest_level ? interestConfig[lead.interest_level] : null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const isOverdue = lead.next_follow_up && new Date(lead.next_follow_up) < new Date();

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isDragging && "rotate-2 shadow-lg"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h4 className="font-medium text-sm leading-tight">{lead.guardian_name}</h4>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <GraduationCap className="h-3 w-3" />
              <span>{lead.student_name}</span>
              {lead.student_grade && (
                <>
                  <span>•</span>
                  <span>{lead.student_grade}</span>
                </>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={e => { e.stopPropagation(); onCall(); }}>
                <Phone className="h-4 w-4 mr-2" />
                Ligar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={e => { e.stopPropagation(); onMessage(); }}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Mensagem
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={e => { e.stopPropagation(); onSchedule(); }}>
                <Calendar className="h-4 w-4 mr-2" />
                Agendar follow-up
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Phone className="h-3 w-3" />
          <span>{lead.guardian_phone}</span>
        </div>

        <div className="flex flex-wrap gap-1">
          {interest && (
            <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 text-white", interest.color)}>
              {interest.label}
            </Badge>
          )}
          {lead.source && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {lead.source}
            </Badge>
          )}
        </div>

        {lead.next_follow_up && (
          <div className={cn(
            "flex items-center gap-1 text-xs",
            isOverdue ? "text-destructive" : "text-muted-foreground"
          )}>
            <Calendar className="h-3 w-3" />
            <span>Follow-up: {formatDate(lead.next_follow_up)}</span>
          </div>
        )}

        {lead.assigned_to_name && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{lead.assigned_to_name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
