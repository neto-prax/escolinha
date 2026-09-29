import React, { useState } from 'react';
import { Smile, Sparkles, Image as ImageIcon, Film, Heart } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

interface WhatsAppEmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onSendSticker: (stickerUrl: string, caption?: string) => void;
  onSendGif: (gifUrl: string, caption?: string) => void;
}

const EMOJI_CATEGORIES = [
  {
    name: 'Frequentes',
    emojis: ['😀', '😂', '😍', '😎', '👍', '🙏', '❤️', '👏', '🎉', '📚', '🎒', '✅', '💬', '✨', '🔥'],
  },
  {
    name: 'Carinhas & Emoções',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌',
      '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩',
      '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤',
      '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫',
    ],
  },
  {
    name: 'Gestos & Pessoas',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
      '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️',
      '💪', '🦾', '👂', '👃', '👀', '👁️', '🧠', '🫀', '🫁', '🦷', '🦴', '👅', '👄', '👶', '👧', '🧒',
    ],
  },
  {
    name: 'Escola & Educação',
    emojis: [
      '🎓', '🎒', '📚', '📖', '📕', '📗', '📘', '📙', '📓', '📒', '📃', '📜', '📄', '📅', '📆', '🗓️',
      '📇', '📈', '📉', '📊', '📋', '📌', '📍', '📎', '📏', '📐', '✂️', '🖊️', '🖋️', '✒️', '📝', '✏️',
      '🔍', '🔎', '🔬', '🔭', '💡', '🔔', '📣', '📢', '🏫', '👩‍🏫', '👨‍🏫', '👩‍🎓', '👨‍🎓', '⚽', '🎨', '🧩',
    ],
  },
  {
    name: 'Financeiro & Serviços',
    emojis: [
      '💳', '💰', '💵', '🪙', '🧾', '🏧', '💸', '🏦', '💹', '💲', '🏷️', '📦', '✉️', '📧', '📨', '📩',
      '📞', '📱', '📲', '💻', '🖥️', '🖨️', '⏰', '⏱️', '⏳', '⌛', '🔒', '🔑', '🛡️', '✅', '❌', '⚠️',
    ],
  },
  {
    name: 'Corações & Símbolos',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
      '💘', '💝', '💟', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '⭐', '🌟', '✨', '⚡', '☀️',
    ],
  },
];

// Figurinhas oficiais prontas para atendimento escolar
const SCHOOL_STICKERS = [
  {
    name: 'Matrículas Abertas!',
    url: 'https://api.iconify.design/fluent-emoji:school.svg',
    caption: '🎒 Matrículas Abertas!',
    color: '#8b5cf6',
  },
  {
    name: 'Boleto / Pix Enviado',
    url: 'https://api.iconify.design/fluent-emoji:credit-card.svg',
    caption: '💳 Segue seu boleto/chave PIX!',
    color: '#10b981',
  },
  {
    name: 'Atendimento Confirmado',
    url: 'https://api.iconify.design/fluent-emoji:check-mark-button.svg',
    caption: '✅ Atendimento confirmado com sucesso!',
    color: '#3b82f6',
  },
  {
    name: 'Parabéns Aluno!',
    url: 'https://api.iconify.design/fluent-emoji:trophy.svg',
    caption: '🏆 Parabéns pelo excelente desempenho!',
    color: '#f59e0b',
  },
  {
    name: 'Aguardando Retorno',
    url: 'https://api.iconify.design/fluent-emoji:hourglass-done.svg',
    caption: '⏳ Aguardamos sua confirmação.',
    color: '#ec4899',
  },
  {
    name: 'Bom Dia Família!',
    url: 'https://api.iconify.design/fluent-emoji:sun.svg',
    caption: '☀️ Desejamos um dia abençoado!',
    color: '#f97316',
  },
  {
    name: 'Reunião de Pais',
    url: 'https://api.iconify.design/fluent-emoji:calendar.svg',
    caption: '📅 Lembrete: Reunião Pedagógica',
    color: '#06b6d4',
  },
  {
    name: 'Muito Obrigado!',
    url: 'https://api.iconify.design/fluent-emoji:folded-hands.svg',
    caption: '🙏 Agradecemos a confiança na escola!',
    color: '#14b8a6',
  },
];

// GIFs animados populares para celebração e escola
const POPULAR_GIFS = [
  {
    title: 'Parabéns!',
    url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
    caption: 'Parabéns! 🎉',
  },
  {
    title: 'Sucesso Escolar',
    url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif',
    caption: 'Muito bem! 👏',
  },
  {
    title: 'Estudos e Dedicação',
    url: 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif',
    caption: 'Bons estudos! 📚',
  },
  {
    title: 'Confirmado!',
    url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
    caption: 'Tudo certo! 👍',
  },
  {
    title: 'Bem-vindo(a)!',
    url: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif',
    caption: 'Seja muito bem-vindo(a)! 👋',
  },
  {
    title: 'Obrigado!',
    url: 'https://media.giphy.com/media/3oz8xIsloV7zOmt81G/giphy.gif',
    caption: 'Gratidão! 🙏',
  },
];

export function WhatsAppEmojiPicker({
  onSelectEmoji,
  onSendSticker,
  onSendGif,
}: WhatsAppEmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'emojis' | 'stickers' | 'gifs'>('emojis');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-10 w-10 p-0 text-muted-foreground hover:text-foreground shrink-0 rounded-full"
          title="Inserir Emojis, Figurinhas ou GIFs"
        >
          <Smile className="w-5 h-5 text-amber-500" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="top"
        className="w-[340px] sm:w-[380px] p-0 shadow-xl border rounded-2xl overflow-hidden bg-popover"
      >
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          {/* Navegação entre Emojis, Figurinhas e GIFs */}
          <div className="border-b bg-muted/30 px-3 py-2 flex items-center justify-between">
            <TabsList className="grid grid-cols-3 h-8 p-0.5 bg-muted/60">
              <TabsTrigger value="emojis" className="text-xs gap-1.5 h-7">
                <Smile className="w-3.5 h-3.5 text-amber-500" />
                <span>Emojis</span>
              </TabsTrigger>
              <TabsTrigger value="stickers" className="text-xs gap-1.5 h-7">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span>Figurinhas</span>
              </TabsTrigger>
              <TabsTrigger value="gifs" className="text-xs gap-1.5 h-7">
                <Film className="w-3.5 h-3.5 text-blue-500" />
                <span>GIFs</span>
              </TabsTrigger>
            </TabsList>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              WhatsApp
            </span>
          </div>

          {/* 1. ABA DE EMOJIS */}
          <TabsContent value="emojis" className="m-0 p-3 max-h-[290px] overflow-y-auto space-y-3">
            {EMOJI_CATEGORIES.map((cat) => (
              <div key={cat.name} className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  {cat.name}
                </span>
                <div className="grid grid-cols-8 gap-1">
                  {cat.emojis.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectEmoji(emoji)}
                      className="w-8 h-8 flex items-center justify-center text-lg rounded-md hover:bg-muted transition-transform active:scale-125 select-none"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          {/* 2. ABA DE FIGURINHAS (STICKERS) */}
          <TabsContent value="stickers" className="m-0 p-3 max-h-[290px] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2.5">
              {SCHOOL_STICKERS.map((stk, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onSendSticker(stk.url, stk.caption);
                    setOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-muted/80 bg-card hover:bg-primary/5 hover:border-primary/40 transition-all text-center group cursor-pointer shadow-2xs"
                >
                  <img
                    src={stk.url}
                    alt={stk.name}
                    className="w-14 h-14 object-contain transition-transform group-hover:scale-110 mb-1.5"
                    loading="lazy"
                  />
                  <span className="text-[11px] font-semibold text-foreground leading-tight">
                    {stk.name}
                  </span>
                  <span className="text-[9px] text-muted-foreground mt-0.5">Clique para enviar</span>
                </button>
              ))}
            </div>
          </TabsContent>

          {/* 3. ABA DE GIFS */}
          <TabsContent value="gifs" className="m-0 p-3 max-h-[290px] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {POPULAR_GIFS.map((gif, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onSendGif(gif.url, gif.caption);
                    setOpen(false);
                  }}
                  className="relative rounded-lg overflow-hidden border group cursor-pointer aspect-video bg-black/10"
                >
                  <img
                    src={gif.url}
                    alt={gif.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                    <span className="text-white text-[10px] font-semibold text-center">
                      Enviar GIF
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
