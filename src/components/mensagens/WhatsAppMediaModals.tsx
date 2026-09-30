import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

interface WhatsAppMediaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  type: 'image' | 'video' | 'sticker';
  description?: string | null;
}

export function WhatsAppMediaModal({
  open,
  onOpenChange,
  url,
  type,
  description,
}: WhatsAppMediaModalProps) {
  const isVideo = type === 'video';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-0 bg-background/95 p-2 sm:p-3">
        <DialogTitle className="sr-only">Visualização da mídia</DialogTitle>
        <DialogDescription className="sr-only">
          {description || (isVideo ? 'Vídeo recebido pelo WhatsApp' : 'Imagem recebida pelo WhatsApp')}
        </DialogDescription>
        {isVideo ? (
          <video
            src={url}
            controls
            autoPlay
            playsInline
            className="max-h-[82vh] w-full rounded-md bg-muted object-contain"
          />
        ) : (
          <img
            src={url}
            alt={description || (type === 'sticker' ? 'Figurinha recebida' : 'Imagem recebida')}
            className="max-h-[82vh] w-full rounded-md object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}