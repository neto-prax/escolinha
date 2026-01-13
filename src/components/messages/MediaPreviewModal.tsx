import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface MediaPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
}

export function MediaPreviewModal({
  open,
  onOpenChange,
  mediaUrl,
  mediaType,
  caption,
}: MediaPreviewModalProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = `media-${Date.now()}.${mediaType === 'image' ? 'jpg' : 'mp4'}`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <div className="relative">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
            <span className="text-white text-sm font-medium truncate max-w-[70%]">
              {caption || (mediaType === 'image' ? 'Imagem' : 'Vídeo')}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleDownload}
              >
                <Download className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Media content */}
          <div className="flex items-center justify-center bg-black min-h-[300px] max-h-[80vh]">
            {mediaType === 'image' ? (
              <img
                src={mediaUrl}
                alt={caption || 'Imagem'}
                className="max-w-full max-h-[80vh] object-contain"
              />
            ) : (
              <video
                src={mediaUrl}
                controls
                autoPlay
                className="max-w-full max-h-[80vh]"
              />
            )}
          </div>

          {/* Caption footer */}
          {caption && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
              <p className="text-white text-sm">{caption}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
