import { useState } from 'react';
import { AlertCircle, Download, FileText, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WhatsAppAudioPlayer } from './WhatsAppAudioPlayer';
import { WhatsAppMediaModal } from './WhatsAppMediaModals';
import type { WhatsAppChatMessage } from '@/types/mensagens';

interface WhatsAppMediaRendererProps {
  message: WhatsAppChatMessage;
}

export function WhatsAppMediaRenderer({ message }: WhatsAppMediaRendererProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const url = message.media_url;
  const type = message.message_type;

  if (!url) {
    if (!['image', 'video', 'sticker', 'audio', 'document'].includes(type)) return null;
    return (
      <div className="flex min-h-16 items-center gap-2 rounded-md border border-border/70 bg-muted/50 px-3 py-2 text-muted-foreground">
        <ImageOff className="h-4 w-4 shrink-0" />
        <span className="text-xs">Mídia indisponível</span>
      </div>
    );
  }

  if (type === 'audio') return <WhatsAppAudioPlayer url={url} />;

  if (type === 'document') {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <Button type="button" variant="secondary" className="h-auto w-full justify-start gap-2 py-2">
          <FileText className="h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left text-xs">
            {message.media_filename || 'Abrir documento'}
          </span>
          <Download className="h-4 w-4 shrink-0" />
        </Button>
      </a>
    );
  }

  if (!['image', 'video', 'sticker'].includes(type)) return null;

  if (failed) {
    return (
      <div className="flex min-h-20 items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="text-xs">Não foi possível carregar esta mídia</span>
      </div>
    );
  }

  const description = message.media_caption || message.body;

  return (
    <>
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="block max-w-full overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={type === 'video' ? 'Ampliar vídeo' : type === 'sticker' ? 'Ampliar figurinha' : 'Ampliar imagem'}
      >
        {type === 'video' ? (
          <video
            src={url}
            controls
            playsInline
            preload="metadata"
            onError={() => setFailed(true)}
            className="max-h-80 w-full min-w-48 bg-muted object-contain"
          />
        ) : (
          <img
            src={url}
            alt={description || (type === 'sticker' ? 'Figurinha recebida' : 'Imagem recebida')}
            loading="lazy"
            onError={() => setFailed(true)}
            className={type === 'sticker' ? 'h-40 w-40 object-contain' : 'max-h-80 w-full min-w-48 object-cover'}
          />
        )}
      </button>
      <WhatsAppMediaModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        url={url}
        type={type}
        description={description}
      />
    </>
  );
}