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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Loader2,
  MessageSquare,
  ShieldCheck,
  Zap,
  Send,
  ArrowRightLeft,
  Sparkles,
  Building2,
} from 'lucide-react';
import { WhatsAppChatConversation, WhatsAppTrigger } from '@/types/mensagens';
import { toast } from 'sonner';

/* =========================================================================
   1. MODAL DE RESOLUÇÃO DE ATENDIMENTO
   ========================================================================= */

interface WhatsAppResolveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: WhatsAppChatConversation | null;
  onConfirmResolve: (data: {
    title: string;
    description: string;
    closingMessage?: string;
  }) => Promise<void>;
}

export function WhatsAppResolveModal({
  open,
  onOpenChange,
  conversation,
  onConfirmResolve,
}: WhatsAppResolveModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sendClosingMessage, setSendClosingMessage] = useState(true);
  const [closingMessage, setClosingMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && conversation) {
      setTitle('Atendimento concluído');
      setDescription('');
      setSendClosingMessage(true);
      const contactFirst = conversation.contact_name?.split(' ')[0] || 'Responsável';
      setClosingMessage(
        `Olá, ${contactFirst}! Seu atendimento foi finalizado por nossa equipe. Caso precise de mais algum auxílio, estamos sempre à disposição! 😊`
      );
    }
  }, [open, conversation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Informe um título para o parecer da resolução.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirmResolve({
        title: title.trim(),
        description: description.trim(),
        closingMessage: sendClosingMessage && closingMessage.trim() ? closingMessage.trim() : undefined,
      });
      toast.success('Atendimento marcado como resolvido!');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Erro ao resolver atendimento: ${err?.message || 'Tente novamente'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <DialogTitle>Marcar como Resolvido</DialogTitle>
          </div>
          <DialogDescription>
            Registre o parecer final do atendimento com{' '}
            <strong className="text-foreground">{conversation?.contact_name || 'o contato'}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Título do Parecer */}
          <div className="space-y-1.5">
            <Label htmlFor="resolve-title" className="text-xs font-semibold">
              Título do Parecer *
            </Label>
            <Input
              id="resolve-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Dúvida de matrícula esclarecida / Acordo realizado"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Descrição / Notas Internas */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="resolve-desc" className="text-xs font-semibold">
                Descrição & Notas Internas
              </Label>
              <span className="text-[11px] text-muted-foreground">Fica registrado no histórico</span>
            </div>
            <Textarea
              id="resolve-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes sobre a tratativa realizada com o responsável..."
              rows={3}
              className="resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Enviar mensagem pelo WhatsApp */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <Label htmlFor="send-closing-msg" className="text-xs font-medium cursor-pointer">
                  Enviar mensagem de encerramento no WhatsApp
                </Label>
              </div>
              <Switch
                id="send-closing-msg"
                checked={sendClosingMessage}
                onCheckedChange={setSendClosingMessage}
                disabled={isSubmitting}
              />
            </div>

            {sendClosingMessage && (
              <div className="space-y-1.5 pt-1">
                <Textarea
                  value={closingMessage}
                  onChange={(e) => setClosingMessage(e.target.value)}
                  placeholder="Mensagem a ser enviada no WhatsApp..."
                  rows={3}
                  className="resize-none text-xs bg-background"
                  disabled={isSubmitting}
                />
                <p className="text-[10px] text-muted-foreground">
                  Esta mensagem será enviada instantaneamente pelo WhatsApp ao concluir.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resolvendo...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Concluir e Resolver
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   2. MODAL DE GATILHOS AJUSTÁVEIS & TRANSFERÊNCIA DE SETOR
   ========================================================================= */

interface SectorItem {
  id: string;
  name: string;
}

interface WhatsAppAdjustableTriggerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: WhatsAppChatConversation | null;
  allSectors: SectorItem[];
  triggers: (WhatsAppTrigger | any)[];
  schoolName?: string;
  onDispatchTrigger: (payload: {
    message: string;
    targetSectorId?: string | null;
    targetStatus?: 'open' | 'pending' | 'resolved' | null;
  }) => Promise<void>;
}

const getTriggerName = (t: any): string => t.nome || t.name || 'Gatilho sem nome';
const getTriggerText = (t: any): string => t.respostaTexto || t.message_template || t.text || '';
const getTriggerSector = (t: any): string | null => t.setorDestinoId || t.target_sector_id || null;
const getTriggerStatus = (t: any): 'open' | 'pending' | 'resolved' | null =>
  t.alterarStatus || t.target_status || null;

export function WhatsAppAdjustableTriggerModal({
  open,
  onOpenChange,
  conversation,
  allSectors = [],
  triggers = [],
  schoolName = 'Nossa Escola',
  onDispatchTrigger,
}: WhatsAppAdjustableTriggerModalProps) {
  const [selectedTriggerId, setSelectedTriggerId] = useState<string>('custom');
  const [message, setMessage] = useState<string>('');
  const [targetSectorId, setTargetSectorId] = useState<string>('keep');
  const [targetStatus, setTargetStatus] = useState<'open' | 'pending' | 'resolved' | 'keep'>('keep');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Interpolação dinâmica de variáveis
  const interpolateMessage = (template: string) => {
    if (!conversation) return template;
    const contactFirst = conversation.contact_name?.split(' ')[0] || conversation.contact_name || '';
    const student = conversation.student_info?.name || 'seu dependente';
    const sectorName =
      allSectors.find((s) => s.id === (targetSectorId !== 'keep' ? targetSectorId : conversation.sector_id))
        ?.name || 'Atendimento';

    return template
      .replace(/\{\{nome\}\}/gi, contactFirst)
      .replace(/\{\{responsavel\}\}/gi, conversation.contact_name || '')
      .replace(/\{\{aluno\}\}/gi, student)
      .replace(/\{\{escola\}\}/gi, schoolName)
      .replace(/\{\{setor\}\}/gi, sectorName);
  };

  useEffect(() => {
    if (open) {
      if (triggers.length > 0) {
        const first = triggers.find((t) => t.ativo !== false) || triggers[0];
        setSelectedTriggerId(first.id);
        setMessage(interpolateMessage(getTriggerText(first)));
        const sec = getTriggerSector(first);
        if (sec) {
          const matchedSector = allSectors.find(
            (s) => s.id === sec || (s.name && s.name.toLowerCase().includes(String(sec).toLowerCase()))
          );
          setTargetSectorId(matchedSector ? matchedSector.id : 'keep');
        } else {
          setTargetSectorId('keep');
        }
        const st = getTriggerStatus(first);
        setTargetStatus(st || 'keep');
      } else {
        setSelectedTriggerId('custom');
        setMessage(
          interpolateMessage(
            'Olá {{nome}}, tudo bem? Estamos entrando em contato sobre o(a) aluno(a) {{aluno}}.'
          )
        );
        setTargetSectorId('keep');
        setTargetStatus('keep');
      }
    }
  }, [open, conversation, triggers, allSectors]);

  const handleTriggerSelect = (triggerId: string) => {
    setSelectedTriggerId(triggerId);
    if (triggerId === 'custom') {
      setMessage('');
      return;
    }
    const trig = triggers.find((t) => t.id === triggerId);
    if (trig) {
      setMessage(interpolateMessage(getTriggerText(trig)));
      const sec = getTriggerSector(trig);
      if (sec) {
        const matchedSector = allSectors.find(
          (s) => s.id === sec || (s.name && s.name.toLowerCase().includes(String(sec).toLowerCase()))
        );
        if (matchedSector) {
          setTargetSectorId(matchedSector.id);
        }
      }
      const st = getTriggerStatus(trig);
      if (st) {
        setTargetStatus(st);
      }
    }
  };

  const insertVariable = (variable: string) => {
    setMessage((prev) => `${prev} ${variable}`.trimStart());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Escreva ou selecione uma mensagem para enviar.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onDispatchTrigger({
        message: message.trim(),
        targetSectorId: targetSectorId !== 'keep' ? targetSectorId : undefined,
        targetStatus: targetStatus !== 'keep' ? targetStatus : undefined,
      });
      toast.success('Gatilho disparado com sucesso!');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Erro ao disparar gatilho: ${err?.message || 'Tente novamente'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
            <DialogTitle>Gatilho Rápido & Ajustável</DialogTitle>
          </div>
          <DialogDescription>
            Personalize a mensagem antes de enviar para{' '}
            <strong className="text-foreground">{conversation?.contact_name || 'o contato'}</strong> e
            opcionalmente transfira o setor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Seleção de Gatilho / Template */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Modelo de Gatilho</Label>
            <Select value={selectedTriggerId} onValueChange={handleTriggerSelect} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um modelo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">✏️ Mensagem Personalizada (Em branco)</SelectItem>
                {triggers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    ⚡ {getTriggerName(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transferência de Setor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <Label className="text-xs font-semibold">Enviar para Setor</Label>
              </div>
              <Select value={targetSectorId} onValueChange={setTargetSectorId} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Manter setor atual" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">Manter no setor atual</SelectItem>
                  {allSectors.map((sec) => (
                    <SelectItem key={sec.id} value={sec.id}>
                      {sec.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mudança de Status */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />
                <Label className="text-xs font-semibold">Alterar Status</Label>
              </div>
              <Select
                value={targetStatus}
                onValueChange={(val) => setTargetStatus(val as any)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Manter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">Manter status atual</SelectItem>
                  <SelectItem value="open">Em Atendimento (Aberto)</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mensagem Editável */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <Label className="text-xs font-semibold">Mensagem no WhatsApp (Editável) *</Label>
              <span className="text-[11px] text-muted-foreground">Você pode editar livremente</span>
            </div>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite a mensagem que será enviada pelo WhatsApp..."
              rows={4}
              className="resize-none text-xs leading-relaxed"
              required
              disabled={isSubmitting}
            />

            {/* Chips de variáveis rápidas */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Inserir tag:
              </span>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 text-[10px] transition-colors"
                onClick={() => insertVariable('{{nome}}')}
              >
                + Nome
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 text-[10px] transition-colors"
                onClick={() => insertVariable('{{aluno}}')}
              >
                + Aluno
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 text-[10px] transition-colors"
                onClick={() => insertVariable('{{escola}}')}
              >
                + Escola
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 text-[10px] transition-colors"
                onClick={() => insertVariable('{{setor}}')}
              >
                + Setor
              </Badge>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-1.5"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Mensagem
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
