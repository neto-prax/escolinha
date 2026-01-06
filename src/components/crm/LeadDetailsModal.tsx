import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  User,
  GraduationCap,
  Clock,
  FileText,
  CheckCircle,
  Plus,
} from "lucide-react";
import { Lead } from "./LeadCard";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  user_name: string;
}

interface LeadDetailsModalProps {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  activities: Activity[];
  onAddActivity: (type: string, description: string) => void;
  onUpdateLead: (data: Partial<Lead>) => void;
  onConvertToEnrollment: () => void;
  onMessage: () => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: 'Novo', color: 'bg-blue-500' },
  contacted: { label: 'Contatado', color: 'bg-cyan-500' },
  visit_scheduled: { label: 'Visita Agendada', color: 'bg-yellow-500' },
  visited: { label: 'Visitou', color: 'bg-orange-500' },
  proposal_sent: { label: 'Proposta Enviada', color: 'bg-purple-500' },
  negotiating: { label: 'Em Negociação', color: 'bg-pink-500' },
  enrolled: { label: 'Matriculado', color: 'bg-green-500' },
  lost: { label: 'Perdido', color: 'bg-gray-500' },
};

const activityIcons: Record<string, typeof Phone> = {
  call: Phone,
  message: MessageCircle,
  email: Mail,
  visit: User,
  note: FileText,
  status_change: CheckCircle,
};

export function LeadDetailsModal({
  open,
  onClose,
  lead,
  activities,
  onAddActivity,
  onUpdateLead,
  onConvertToEnrollment,
  onMessage,
}: LeadDetailsModalProps) {
  const [newActivityType, setNewActivityType] = useState("note");
  const [newActivityDescription, setNewActivityDescription] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState(lead?.next_follow_up || "");

  if (!lead) return null;

  const status = statusConfig[lead.status] || statusConfig.new;

  const handleAddActivity = () => {
    if (newActivityDescription.trim()) {
      onAddActivity(newActivityType, newActivityDescription.trim());
      setNewActivityDescription("");
    }
  };

  const handleUpdateFollowUp = () => {
    if (nextFollowUp) {
      onUpdateLead({ next_follow_up: nextFollowUp });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {lead.guardian_name}
              <Badge className={cn("text-white", status.color)}>
                {status.label}
              </Badge>
            </DialogTitle>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="activities">Histórico ({activities.length})</TabsTrigger>
            <TabsTrigger value="actions">Ações</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Responsável</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.guardian_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.guardian_phone}</span>
                  </div>
                  {lead.guardian_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.guardian_email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sm">Aluno</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.student_name}</span>
                  </div>
                  {lead.student_grade && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Série:</span>
                      <span>{lead.student_grade}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-sm">Próximo Follow-up</h4>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={nextFollowUp}
                  onChange={e => setNextFollowUp(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleUpdateFollowUp}>Atualizar</Button>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-sm">Status</h4>
              <Select
                value={lead.status}
                onValueChange={(v) => onUpdateLead({ status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", config.color)} />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="activities" className="mt-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Select value={newActivityType} onValueChange={setNewActivityType}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Nota</SelectItem>
                    <SelectItem value="call">Ligação</SelectItem>
                    <SelectItem value="message">Mensagem</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="visit">Visita</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Descreva a atividade..."
                  value={newActivityDescription}
                  onChange={e => setNewActivityDescription(e.target.value)}
                  className="flex-1 min-h-[60px]"
                />
                <Button onClick={handleAddActivity}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhuma atividade registrada
                    </p>
                  ) : (
                    activities.map(activity => {
                      const Icon = activityIcons[activity.activity_type] || FileText;
                      return (
                        <div
                          key={activity.id}
                          className="flex gap-3 p-3 bg-muted rounded-lg"
                        >
                          <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{activity.user_name}</span>
                              <span>•</span>
                              <span>
                                {new Date(activity.created_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-sm mt-1">{activity.description}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={onMessage}>
                <MessageCircle className="h-5 w-5" />
                <span>Enviar Mensagem</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <Phone className="h-5 w-5" />
                <span>Registrar Ligação</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <Calendar className="h-5 w-5" />
                <span>Agendar Visita</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <Mail className="h-5 w-5" />
                <span>Enviar Proposta</span>
              </Button>
              <Button
                className="h-auto py-4 flex-col gap-2 col-span-2"
                onClick={onConvertToEnrollment}
                disabled={lead.status === 'enrolled'}
              >
                <CheckCircle className="h-5 w-5" />
                <span>Converter para Matrícula</span>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
