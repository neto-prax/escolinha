import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Image as ImageIcon,
  Clock,
  Sparkles,
  Music,
  FileText,
  Eye,
  Lock,
  Send,
} from 'lucide-react';
import { WhatsAppChatMessage, WhatsAppMessageType } from '@/types/mensagens';

// 1. MODAL LIGHTBOX DE IMAGEM FULLSCREEN
interface ImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  caption?: string | null;
}

export function WhatsAppImageLightboxModal({
  open,
  onOpenChange,
  imageUrl,
  caption,
}: ImageLightboxProps) {
  if (!imageUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-3 bg-background/95 backdrop-blur-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Visualizador de Imagem</DialogTitle>
          <DialogDescription>Imagem enviada pelo WhatsApp</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="relative w-full max-h-[75vh] flex items-center justify-center overflow-hidden rounded-xl bg-black/10">
            <img
              src={imageUrl}
              alt={caption || 'Imagem ampliada'}
              className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg"
            />
          </div>

          {caption && (
            <p className="text-sm text-foreground text-center font-medium max-w-xl">
              {caption}
            </p>
          )}

          <div className="flex items-center justify-end w-full gap-2 pt-2 border-t">
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              download="whatsapp-midia.jpg"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-muted"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Arquivo</span>
            </a>
            <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 2. MODAL DE VISUALIZAÇÃO ÚNICA (FOTO TEMPORÁRIA DO WHATSAPP)
interface ViewOnceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: WhatsAppChatMessage | null;
  onCloseAndExpire: (messageId: string) => void;
}

export function WhatsAppViewOnceModal({
  open,
  onOpenChange,
  message,
  onCloseAndExpire,
}: ViewOnceModalProps) {
  if (!message || !message.media_url) return null;

  const handleClose = () => {
    onCloseAndExpire(message.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); else onOpenChange(val); }}>
      <DialogContent className="max-w-2xl p-4 bg-zinc-950 text-white border-zinc-800">
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full border border-dashed border-emerald-400 text-emerald-400 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <DialogTitle className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                Mensagem de visualização única
              </DialogTitle>
            </div>
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[10px]">
              Expira ao fechar
            </Badge>
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            Esta foto foi enviada como visualização única e não poderá ser aberta novamente após fechar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center my-3 relative">
          <img
            src={message.media_url}
            alt="Foto temporária"
            className="max-h-[60vh] w-auto max-w-full object-contain rounded-xl shadow-2xl border border-zinc-800 select-none pointer-events-none"
          />
          {message.media_caption && (
            <p className="mt-3 text-xs text-zinc-200 text-center">{message.media_caption}</p>
          )}
        </div>

        <DialogFooter className="border-t border-zinc-800 pt-3">
          <Button
            type="button"
            onClick={handleClose}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
          >
            Fechar e Concluir Visualização
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 3. MODAL DE ENVIO DE ANEXO (FOTO, VÍDEO, VISUALIZAÇÃO ÚNICA, ÁUDIO, DOCUMENTO)
interface AttachmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendMedia: (payload: {
    url: string;
    filename?: string;
    type: WhatsAppMessageType;
    caption?: string;
    duration?: number;
    isViewOnce?: boolean;
  }) => void;
}

export function WhatsAppAttachmentModal({
  open,
  onOpenChange,
  onSendMedia,
}: AttachmentModalProps) {
  const [mediaType, setMediaType] = useState<WhatsAppMessageType>('image');
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [filename, setFilename] = useState('');
  const [isViewOnce, setIsViewOnce] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    onSendMedia({
      url: url.trim(),
      filename: filename.trim() || undefined,
      type: isViewOnce ? 'view_once' : mediaType,
      caption: caption.trim() || undefined,
      isViewOnce,
    });

    // Reset & close
    setUrl('');
    setCaption('');
    setFilename('');
    setIsViewOnce(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <ImageIcon className="w-5 h-5" />
            Enviar Mídia no WhatsApp
          </DialogTitle>
          <DialogDescription>
            Selecione o tipo de arquivo para enviar pelo atendimento da escola.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Tipo de Mídia */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'image', label: 'Foto', icon: ImageIcon, color: 'text-purple-500' },
              { id: 'view_once', label: '1x Única', icon: Clock, color: 'text-emerald-500' },
              { id: 'audio', label: 'Áudio', icon: Music, color: 'text-amber-500' },
              { id: 'document', label: 'PDF', icon: FileText, color: 'text-blue-500' },
            ].map((t) => {
              const active = t.id === 'view_once' ? isViewOnce : mediaType === t.id && !isViewOnce;
              const Icon = t.icon;

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    if (t.id === 'view_once') {
                      setIsViewOnce(true);
                      setMediaType('image');
                    } else {
                      setIsViewOnce(false);
                      setMediaType(t.id as WhatsAppMessageType);
                    }
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs transition-all ${
                    active
                      ? 'border-primary bg-primary/10 font-bold text-primary shadow-xs'
                      : 'border-muted hover:border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1 ${t.color}`} />
                  <span className="text-[11px]">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* URL da Mídia */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              URL do Arquivo / Link Público *
            </Label>
            <Input
              required
              placeholder={
                isViewOnce || mediaType === 'image'
                  ? 'https://.../foto.jpg ou .png'
                  : mediaType === 'audio'
                  ? 'https://.../mensagem-voz.mp3'
                  : 'https://.../documento.pdf'
              }
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          {/* Legenda Opcional */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Legenda / Texto da Mensagem</Label>
            <Input
              placeholder="Digite uma mensagem acompanhando a mídia..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          {/* Nome do Documento (se for documento) */}
          {mediaType === 'document' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome do Documento</Label>
              <Input
                placeholder="Ex: Declaracao_Matricula.pdf"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          )}

          {isViewOnce && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
              <div className="w-5 h-5 rounded-full border border-dashed border-emerald-500 flex items-center justify-center font-bold text-[10px] shrink-0">
                1
              </div>
              <p className="leading-tight">
                <strong>Foto de visualização única ativada:</strong> O destinatário só poderá visualizar a foto 1 vez no WhatsApp.
              </p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="gap-1.5">
              <Send className="w-3.5 h-3.5" />
              Enviar pelo WhatsApp
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
