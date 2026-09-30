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
import { CheckCircle2, Loader2, MessageSquare, ShieldCheck } from 'lucide-react';
import { WhatsAppChatConversation } from '@/types/mensagens';
import { toast } from 'sonner';

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
export default WhatsAppResolveModal;
