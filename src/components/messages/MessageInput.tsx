import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Send,
  Paperclip,
  Image,
  Video,
  Mic,
  FileText,
  Smile,
  X,
  Zap,
} from "lucide-react";
import { Message } from "./MessageBubble";
import { cn } from "@/lib/utils";

interface QuickReply {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category?: string;
}

interface MessageInputProps {
  onSend: (content: string, type: 'text' | 'image' | 'video' | 'audio' | 'document', file?: File) => void;
  replyTo?: Message | null;
  onCancelReply?: () => void;
  quickReplies?: QuickReply[];
  disabled?: boolean;
}

export function MessageInput({
  onSend,
  replyTo,
  onCancelReply,
  quickReplies = [],
  disabled = false,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplySearch, setQuickReplySearch] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const filteredQuickReplies = quickReplies.filter(
    qr =>
      qr.shortcut.toLowerCase().includes(quickReplySearch.toLowerCase()) ||
      qr.title.toLowerCase().includes(quickReplySearch.toLowerCase())
  );

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim(), 'text');
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "/" && message === "") {
      setShowQuickReplies(true);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'document') => {
    const file = e.target.files?.[0];
    if (file) {
      onSend(file.name, type, file);
    }
    e.target.value = "";
  };

  const handleQuickReplySelect = (qr: QuickReply) => {
    setMessage(qr.content);
    setShowQuickReplies(false);
    setQuickReplySearch("");
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // TODO: Implementar gravação de áudio real
  };

  return (
    <div className="border-t bg-background p-3">
      {replyTo && (
        <div className="mb-2 p-2 bg-muted rounded-lg flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Respondendo a
            </p>
            <p className="text-sm truncate">{replyTo.body}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onCancelReply}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" disabled={disabled}>
                <Paperclip className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <Image className="h-5 w-5 text-green-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => videoInputRef.current?.click()}
                >
                  <Video className="h-5 w-5 text-purple-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileText className="h-5 w-5 text-blue-500" />
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Popover open={showQuickReplies} onOpenChange={setShowQuickReplies}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" disabled={disabled}>
                <Zap className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="start">
              <input
                type="text"
                placeholder="Buscar resposta rápida..."
                className="w-full px-3 py-2 text-sm border rounded-md mb-2"
                value={quickReplySearch}
                onChange={e => setQuickReplySearch(e.target.value)}
              />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredQuickReplies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhuma resposta encontrada
                  </p>
                ) : (
                  filteredQuickReplies.map(qr => (
                    <button
                      key={qr.id}
                      className="w-full text-left p-2 rounded hover:bg-accent"
                      onClick={() => handleQuickReplySelect(qr)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          {qr.shortcut}
                        </span>
                        <span className="text-sm font-medium">{qr.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {qr.content}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex-1 relative">
          <Textarea
            placeholder="Digite uma mensagem..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="min-h-[44px] max-h-32 resize-none pr-10"
            rows={1}
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-8 w-8"
            disabled={disabled}
          >
            <Smile className="h-5 w-5" />
          </Button>
        </div>

        {message.trim() ? (
          <Button
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={handleSend}
            disabled={disabled}
          >
            <Send className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            size="icon"
            variant={isRecording ? "destructive" : "default"}
            className={cn("h-10 w-10 rounded-full", isRecording && "animate-pulse")}
            onClick={toggleRecording}
            disabled={disabled}
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFileUpload(e, 'image')}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={e => handleFileUpload(e, 'video')}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx"
        className="hidden"
        onChange={e => handleFileUpload(e, 'document')}
      />
    </div>
  );
}
