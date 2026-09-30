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
import { CheckCircle2, MessageSquare, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { WhatsAppChatConversation } from '@/types/mensagens';

interface WhatsAppResolveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: WhatsAppChatConversation | null;
  onConfirmResolve: (data: {
    title: string;
    description: string;
    closingMessage?: string;
  }) => Promise<void> | void;
}

export function WhatsAppResolveModal({
  open,
  onOpenChange,
  conversation,
  onConfirmResolve,
}: WhatsAppResolveModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [closingMessage, setClosingMessage] = useState('');
  const [sendWhatsAppMessage, setSendWhatsAppMessage] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill default values when modal opens
  useEffect(() => {
    if (open && conversation) {
      setTitle(
        conversation.student_info
          ? `Atendimento - ${conversation.student_info.name}`
          : `Atendimento - ${conversation.contact_name}`
      );
      setDescription('');
      setClosingMessage(
        `Olá, ${conversation.contact_name}! 👋\n\nInformamos que seu atendimento com a equipe escolar foi concluído com sucesso. ✅\n\nCaso precise de algo mais ou tenha qualquer outra dúvida, estamos sempre à sua disposição. Tenha um excelente dia! 🎓`
      );
      setSendWhatsAppMessage(true);
      setIsSubmitting(false);
    }
  }, [open, conversation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      await onConfirmResolve({
        title: title.trim(),
        description: description.trim(),
        closingMessage: sendWhatsAppMessage ? closingMessage.trim() : undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!conversation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Marcar Atendimento como Resolvido
          </DialogTitle>
          <DialogDescription className="text-xs">
            Registre o parecer da conversa com <strong>{conversation.contact_name}</strong> e envie uma mensagem de encerramento via WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Título do Atendimento */}
          <div className="space-y-1.5">
            <Label htmlFor="res-title" className="text-xs font-semibold flex items-center gap-1.5">
              <span>Título / Assunto da Resolução *</span>
            </Label>
            <Input
              id="res-title"
              required
              placeholder="Ex: Acordo de débitos da mensalidade de Maio"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          {/* Breve Descrição / Parecer Interno */}
          <div className="space-y-1.5">
            <Label htmlFor="res-desc" className="text-xs font-semibold flex items-center justify-between">
              <span>Breve Descrição / Histórico Interno *</span>
              <span className="text-[10px] text-muted-foreground font-normal">Ficará gravado no prontuário</span>
            </Label>
            <Textarea
              id="res-desc"
              required
              rows={3}
              placeholder="Descreva o que foi solucionado, encaminhado ou acordado com o responsável..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs resize-none"
            />
          </div>

          {/* Checkbox / Toggle Enviar Mensagem de Encerramento no WhatsApp */}
          <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendWhatsAppMessage}
                  onChange={(e) => setSendWhatsAppMessage(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span className="flex items-center gap-1 text-foreground">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                  Enviar mensagem de encerramento no WhatsApp
                </span>
              </label>
              {sendWhatsAppMessage && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Ativo
                </span>
              )}
            </div>

            {sendWhatsAppMessage && (
              <div className="space-y-1 pt-1">
                <Textarea
                  rows={4}
                  value={closingMessage}
                  onChange={(e) => setClosingMessage(e.target.value)}
                  placeholder="Mensagem de encerramento..."
                  className="text-xs resize-none bg-background leading-relaxed"
                />
                <p className="text-[10px] text-muted-foreground">
                  Esta mensagem será enviada agora mesmo para o WhatsApp do contato.
                </p>
              </div>
            )}
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
              disabled={isSubmitting || !title.trim() || !description.trim()}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Finalizando...' : 'Confirmar e Resolver'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
