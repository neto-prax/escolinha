import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Zap, Building2, Send, ArrowRightLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { WhatsAppChatConversation, WhatsAppSectorItem, WhatsAppTrigger } from '@/types/mensagens';

interface WhatsAppAdjustableTriggerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: WhatsAppChatConversation | null;
  allSectors: WhatsAppSectorItem[];
  triggers: WhatsAppTrigger[];
  schoolName?: string;
  onDispatchTrigger: (payload: {
    message: string;
    targetSectorId?: string | null;
    targetStatus?: 'open' | 'pending' | 'resolved' | null;
  }) => Promise<void> | void;
}

export function WhatsAppAdjustableTriggerModal({
  open,
  onOpenChange,
  conversation,
  allSectors,
  triggers,
  schoolName = 'Escola',
  onDispatchTrigger,
}: WhatsAppAdjustableTriggerModalProps) {
  const [selectedTriggerId, setSelectedTriggerId] = useState<string>('');
  const [targetSectorId, setTargetSectorId] = useState<string>('keep');
  const [targetStatus, setTargetStatus] = useState<string>('keep');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Helper to interpolate template tags
  const interpolateTags = (template: string) => {
    if (!conversation) return template;
    const contactName = conversation.contact_name || 'Responsável';
    const studentName = conversation.student_info?.name || 'Aluno(a)';
    const sectorName = conversation.sector_name || 'Atendimento';

    return template
      .replace(/\{\{\s*nome\s*\}\}/gi, contactName)
      .replace(/\{\{\s*aluno\s*\}\}/gi, studentName)
      .replace(/\{\{\s*escola\s*\}\}/gi, schoolName)
      .replace(/\{\{\s*setor\s*\}\}/gi, sectorName);
  };

  // When a trigger is selected, populate fields
  const handleSelectTrigger = (trigger: WhatsAppTrigger) => {
    setSelectedTriggerId(trigger.id);
    setTargetSectorId(trigger.setorDestinoId || 'keep');
    setTargetStatus(trigger.alterarStatus || 'keep');
    setCustomMessage(interpolateTags(trigger.respostaTexto));
  };

  // Reset or select first trigger on modal open
  useEffect(() => {
    if (open && triggers.length > 0) {
      const initial = triggers.find((t) => t.ativo) || triggers[0];
      handleSelectTrigger(initial);
      setIsSubmitting(false);
    }
  }, [open, triggers, conversation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMessage.trim()) return;

    setIsSubmitting(true);
    try {
      await onDispatchTrigger({
        message: customMessage.trim(),
        targetSectorId: targetSectorId === 'keep' ? null : targetSectorId,
        targetStatus:
          targetStatus === 'keep'
            ? null
            : (targetStatus as 'open' | 'pending' | 'resolved'),
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!conversation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-amber-600 dark:text-amber-400">
            <Zap className="w-5 h-5 text-amber-500" />
            Disparar Gatilho Rápido & Ajustável
          </DialogTitle>
          <DialogDescription className="text-xs">
            Escolha uma automação, ajuste a mensagem e transfira para outro setor caso necessário antes de enviar para <strong>{conversation.contact_name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Seletor de Gatilhos Rápidos */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Selecione o Gatilho / Automação
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {triggers.map((trig) => {
                const isSelected = selectedTriggerId === trig.id;
                return (
                  <button
                    key={trig.id}
                    type="button"
                    onClick={() => handleSelectTrigger(trig)}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-100 font-semibold shadow-xs ring-1 ring-amber-500/30'
                        : 'border-border/60 hover:border-amber-500/40 bg-card hover:bg-muted/40 text-foreground'
                    }`}
                  >
                    <span className="truncate leading-tight block text-xs">{trig.nome}</span>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      {trig.setorDestinoId ? (
                        <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
                          <Building2 className="w-3 h-3" />
                          {allSectors.find((s) => s.id === trig.setorDestinoId)?.name || 'Setor'}
                        </span>
                      ) : (
                        <span>Informativo</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Setor de Destino */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
                <span>Encaminhar para Setor</span>
              </Label>
              <Select value={targetSectorId} onValueChange={setTargetSectorId}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Selecione o setor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">🏢 Manter no setor atual ({conversation.sector_name || 'Sem Setor'})</SelectItem>
                  {allSectors.map((sec) => (
                    <SelectItem key={sec.id} value={sec.id}>
                      {sec.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status do Atendimento */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Status do Atendimento</span>
              </Label>
              <Select value={targetStatus} onValueChange={setTargetStatus}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Status do Ticket..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">Manter status atual</SelectItem>
                  <SelectItem value="open">🟢 Em Aberto / Em Atendimento</SelectItem>
                  <SelectItem value="pending">🟡 Pendente (Aguardando Resposta)</SelectItem>
                  <SelectItem value="resolved">🔵 Marcar como Resolvido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mensagem Editável */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Mensagem Personalizada a ser Enviada *</span>
              </Label>
              <span className="text-[10px] text-muted-foreground">Variáveis já preenchidas</span>
            </div>
            <Textarea
              rows={4}
              required
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Digite ou personalize a resposta do gatilho..."
              className="text-xs resize-none leading-relaxed bg-background"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !customMessage.trim()}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Disparando...' : 'Disparar no WhatsApp'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
