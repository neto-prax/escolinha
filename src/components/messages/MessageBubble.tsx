import { cn } from "@/lib/utils";
import { Check, CheckCheck, Clock, Play, Pause, Download, Reply } from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MediaPreviewModal } from "./MediaPreviewModal";

export interface Message {
  id: string;
  body: string;
  direction: 'incoming' | 'outgoing';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  created_at: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'sticker' | 'document';
  media_url?: string;
  media_caption?: string;
  media_filename?: string;
  reply_to?: {
    id: string;
    body: string;
    sender_name: string;
  };
}

interface MessageBubbleProps {
  message: Message;
  onReply?: (message: Message) => void;
}

const statusIcons: Record<string, React.ReactNode> = {
  sending: <Clock className="h-3 w-3" />,
  pending: <Clock className="h-3 w-3" />,
  sent: <Check className="h-3 w-3" />,
  delivered: <CheckCheck className="h-3 w-3" />,
  read: <CheckCheck className="h-3 w-3 text-blue-500" />,
  failed: <span className="text-destructive text-[10px]">!</span>,
};

export function MessageBubble({ message, onReply }: MessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [mediaPreviewOpen, setMediaPreviewOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isOutgoing = message.direction === 'outgoing';

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const renderMedia = () => {
    switch (message.message_type) {
      case 'image':
        return (
          <div className="relative">
            {!imageLoaded && (
              <div className="w-48 h-48 bg-muted animate-pulse rounded-lg" />
            )}
            <img
              src={message.media_url}
              alt="Imagem"
              className={cn("max-w-[280px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity", !imageLoaded && "hidden")}
              onLoad={() => setImageLoaded(true)}
              onClick={() => setMediaPreviewOpen(true)}
            />
            {message.media_caption && (
              <p className="mt-1 text-sm">{message.media_caption}</p>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="relative">
            <div 
              className="relative max-w-[280px] rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => setMediaPreviewOpen(true)}
            >
              <video
                src={message.media_url}
                className="max-w-full rounded-lg"
                preload="metadata"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="h-6 w-6 text-primary fill-primary" />
                </div>
              </div>
            </div>
            {message.media_caption && (
              <p className="mt-1 text-sm">{message.media_caption}</p>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-primary text-primary-foreground"
              onClick={toggleAudio}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <div className="flex-1">
              <div className="h-1 bg-muted rounded-full">
                <div className="h-1 bg-primary rounded-full w-0" />
              </div>
            </div>
            <audio
              ref={audioRef}
              src={message.media_url}
              onEnded={() => setIsPlaying(false)}
            />
          </div>
        );

      case 'sticker':
        return (
          <img
            src={message.media_url}
            alt="Sticker"
            className="w-32 h-32 object-contain"
          />
        );

      case 'document':
        return (
          <a
            href={message.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 bg-muted rounded-lg hover:bg-muted/80"
          >
            <Download className="h-5 w-5" />
            <span className="text-sm truncate max-w-[200px]">
              {message.media_filename || 'Documento'}
            </span>
          </a>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "group flex items-end gap-1 max-w-[80%]",
        isOutgoing ? "ml-auto flex-row-reverse" : "mr-auto"
      )}
    >
      <div
        className={cn(
          "relative px-3 py-2 rounded-2xl shadow-sm",
          isOutgoing
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card border rounded-bl-sm"
        )}
      >
        {message.reply_to && (
          <div
            className={cn(
              "mb-2 p-2 rounded border-l-2 text-xs",
              isOutgoing
                ? "bg-primary-foreground/10 border-primary-foreground/50"
                : "bg-muted border-muted-foreground/50"
            )}
          >
            <p className="font-medium">{message.reply_to.sender_name}</p>
            <p className="truncate opacity-75">{message.reply_to.body}</p>
          </div>
        )}

        {message.message_type !== 'text' && renderMedia()}

        {message.message_type === 'text' && (
          <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
        )}

        <div
          className={cn(
            "flex items-center justify-end gap-1 mt-1",
            isOutgoing ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          <span className="text-[10px]">{formatTime(message.created_at)}</span>
          {isOutgoing && statusIcons[message.status]}
        </div>
      </div>

      {/* Media Preview Modal */}
      {message.media_url && (message.message_type === 'image' || message.message_type === 'video') && (
        <MediaPreviewModal
          open={mediaPreviewOpen}
          onOpenChange={setMediaPreviewOpen}
          mediaUrl={message.media_url}
          mediaType={message.message_type}
          caption={message.media_caption}
        />
      )}

      {onReply && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onReply(message)}
        >
          <Reply className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
