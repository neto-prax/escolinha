import React from 'react';
import {
  FileText,
  Download,
  Eye,
  Check,
  Maximize2,
  Lock,
  Sparkles,
} from 'lucide-react';
import { WhatsAppChatMessage } from '@/types/mensagens';
import { WhatsAppAudioPlayer } from './WhatsAppAudioPlayer';
import { Badge } from '@/components/ui/badge';

interface WhatsAppMediaRendererProps {
  message: WhatsAppChatMessage;
  isMe: boolean;
  onOpenImageModal: (url: string, caption?: string | null) => void;
  onOpenViewOnceModal: (message: WhatsAppChatMessage) => void;
}

export function WhatsAppMediaRenderer({
  message,
  isMe,
  onOpenImageModal,
  onOpenViewOnceModal,
}: WhatsAppMediaRendererProps) {
  const { message_type, media_url, media_caption, media_filename, is_view_once, view_once_opened, body } = message;

  // 1. IMAGEM DE VISUALIZAÇÃO ÚNICA (TEMPORÁRIA)
  if (is_view_once || message_type === 'view_once') {
    return (
      <div className="py-1">
        <button
          type="button"
          onClick={() => {
            if (!view_once_opened) {
              onOpenViewOnceModal(message);
            }
          }}
          disabled={view_once_opened}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all border text-left ${
            view_once_opened
              ? 'opacity-60 cursor-not-allowed bg-muted/40 border-muted text-muted-foreground'
              : isMe
              ? 'bg-white/15 hover:bg-white/25 border-white/20 text-white cursor-pointer shadow-xs'
              : 'bg-card hover:bg-muted/80 border-primary/20 text-foreground cursor-pointer shadow-xs'
          }`}
          title={view_once_opened ? 'Foto temporária já foi visualizada' : 'Clique para visualizar a foto única'}
        >
          {/* Círculo do número 1 estilizado como no WhatsApp */}
          <div
            className={`w-7 h-7 rounded-full border-2 border-dashed flex items-center justify-center font-bold text-xs shrink-0 ${
              view_once_opened
                ? 'border-muted-foreground text-muted-foreground'
                : 'border-primary text-primary'
            }`}
          >
            1
          </div>

          <div className="min-w-0">
            <p className="font-semibold text-xs leading-tight">
              {view_once_opened ? 'Foto aberta' : 'Foto de visualização única'}
            </p>
            <p className="text-[10px] opacity-75">
              {view_once_opened ? 'Esta imagem expirou' : 'Toque para abrir'}
            </p>
          </div>
        </button>

        {media_caption && (
          <p className="mt-1.5 text-xs whitespace-pre-wrap">{media_caption}</p>
        )}
      </div>
    );
  }

  // 2. FIGURINHA DO WHATSAPP (STICKER)
  if (message_type === 'sticker') {
    return (
      <div className="py-1">
        <div className="relative group max-w-[140px] sm:max-w-[160px]">
          <img
            src={media_url || 'https://api.iconify.design/fluent-emoji:smiling-face-with-halo.svg'}
            alt="Figurinha WhatsApp"
            className="w-full h-auto object-contain drop-shadow-md select-none pointer-events-auto transition-transform hover:scale-105"
            loading="lazy"
          />
        </div>
        {media_caption && (
          <p className="mt-1 text-xs whitespace-pre-wrap">{media_caption}</p>
        )}
      </div>
    );
  }

  // 3. GIF ANIMADO
  if (message_type === 'gif') {
    return (
      <div className="py-1 space-y-1">
        <div
          className="relative rounded-lg overflow-hidden group cursor-pointer border max-w-[280px]"
          onClick={() => onOpenImageModal(media_url || '', media_caption || 'GIF')}
        >
          <img
            src={media_url || 'https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif'}
            alt="GIF"
            className="w-full max-h-[220px] object-cover"
            loading="lazy"
          />
          <Badge className="absolute bottom-2 left-2 bg-black/70 hover:bg-black/70 text-[9px] font-bold tracking-wider uppercase text-white px-1.5 py-0">
            GIF
          </Badge>
        </div>
        {media_caption && (
          <p className="text-xs whitespace-pre-wrap">{media_caption}</p>
        )}
      </div>
    );
  }

  // 4. ÁUDIO / MENSAGEM DE VOZ
  if (message_type === 'audio') {
    return (
      <div className="py-0.5">
        <WhatsAppAudioPlayer
          src={media_url}
          duration={message.media_duration || 14}
          isMe={isMe}
        />
        {media_caption && (
          <p className="mt-1 text-xs whitespace-pre-wrap">{media_caption}</p>
        )}
      </div>
    );
  }

  // 5. IMAGEM NORMAL
  if (message_type === 'image' || (media_url && /\.(jpg|jpeg|png|webp)($|\?)/i.test(media_url))) {
    return (
      <div className="py-1 space-y-1.5">
        <div
          className="relative rounded-xl overflow-hidden group cursor-pointer border border-black/10 bg-black/5 max-w-[300px]"
          onClick={() => onOpenImageModal(media_url || '', media_caption || body)}
        >
          <img
            src={media_url || ''}
            alt={media_caption || 'Imagem'}
            className="w-full max-h-[260px] object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center shadow-md hover:bg-black/80"
              title="Expandir imagem"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <a
              href={media_url || '#'}
              download={media_filename || 'whatsapp-image.jpg'}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center shadow-md hover:bg-black/80"
              title="Baixar imagem"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>

        {media_caption && media_caption !== body && (
          <p className="text-xs whitespace-pre-wrap leading-relaxed">{media_caption}</p>
        )}
      </div>
    );
  }

  // 6. DOCUMENTO / PDF
  if (message_type === 'document' || media_filename) {
    return (
      <div className="py-1">
        <a
          href={media_url || '#'}
          target="_blank"
          rel="noreferrer"
          className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
            isMe
              ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
              : 'bg-card hover:bg-muted/80 border text-foreground'
          }`}
        >
          <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-xs truncate leading-tight">
              {media_filename || 'Documento em anexo'}
            </p>
            <p className="text-[10px] opacity-75 uppercase">Arquivo PDF</p>
          </div>
          <Download className="w-4 h-4 opacity-70 shrink-0" />
        </a>

        {media_caption && (
          <p className="mt-1 text-xs whitespace-pre-wrap">{media_caption}</p>
        )}
      </div>
    );
  }

  // Padrão: Mensagem de Texto
  return (
    <p className="whitespace-pre-wrap leading-relaxed select-text text-[13px]">
      {body}
    </p>
  );
}
