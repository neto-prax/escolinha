interface WhatsAppAudioPlayerProps {
  url: string;
}

export function WhatsAppAudioPlayer({ url }: WhatsAppAudioPlayerProps) {
  return (
    <audio controls preload="metadata" className="h-10 w-[260px] max-w-full" aria-label="Áudio recebido pelo WhatsApp">
      <source src={url} />
      Seu navegador não conseguiu reproduzir este áudio.
    </audio>
  );
}