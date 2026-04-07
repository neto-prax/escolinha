import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Heart,
  AlertTriangle,
  FileText,
  Users,
  MessageSquare,
  ClipboardList,
  Calendar,
  Pencil,
  Trash2,
  Clock,
  User,
  Brain,
} from 'lucide-react';

interface PsychologyRecord {
  id: string;
  record_type: string;
  title: string;
  description: string | null;
  record_date: string;
  duration_minutes: number | null;
  participants: string | null;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  status: string | null;
  created_at: string;
  professional?: { full_name: string };
}

interface PsychologyTimelineProps {
  records: PsychologyRecord[];
  isLoading: boolean;
  onEdit: (record: PsychologyRecord) => void;
  onDelete: (id: string) => void;
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  atendimento: { icon: Heart, color: 'bg-rose-500', label: 'Atendimento' },
  ocorrencia: { icon: AlertTriangle, color: 'bg-amber-500', label: 'Ocorrência' },
  documento: { icon: FileText, color: 'bg-blue-500', label: 'Documento' },
  familia: { icon: Users, color: 'bg-emerald-500', label: 'Atendimento Familiar' },
  encaminhamento: { icon: MessageSquare, color: 'bg-purple-500', label: 'Encaminhamento' },
  avaliacao: { icon: ClipboardList, color: 'bg-cyan-500', label: 'Avaliação' },
  outro: { icon: Brain, color: 'bg-gray-500', label: 'Outro' },
};

export function PsychologyTimeline({ records, isLoading, onEdit, onDelete }: PsychologyTimelineProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum registro encontrado</p>
          <p className="text-sm mt-1">Clique em "Novo Registro" para adicionar o primeiro.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

      <div className="space-y-6">
        {records.map((record) => {
          const config = typeConfig[record.record_type] || typeConfig.outro;
          const Icon = config.icon;

          return (
            <div key={record.id} className="relative flex gap-4 pl-1">
              <div className={cn(
                "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm",
                config.color
              )}>
                <Icon className="h-5 w-5" />
              </div>

              <Card className="flex-1">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{config.label}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(record.record_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                        {record.duration_minutes && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {record.duration_minutes} min
                          </span>
                        )}
                      </div>

                      <h4 className="font-medium">{record.title}</h4>

                      {record.description && (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{record.description}</p>
                      )}

                      {record.participants && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                          <Users className="h-3 w-3" />
                          Participantes: {record.participants}
                        </p>
                      )}

                      {record.professional?.full_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {record.professional.full_name}
                        </p>
                      )}

                      {record.follow_up_date && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                          <p className="font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Retorno: {format(new Date(record.follow_up_date), "dd/MM/yyyy")}
                          </p>
                          {record.follow_up_notes && (
                            <p className="mt-1 text-muted-foreground">{record.follow_up_notes}</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(record)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(record.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
