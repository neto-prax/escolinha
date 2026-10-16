interface WhatsAppAudioPlayerProps {
  url: string;
}

export function WhatsAppAudioPlayer({ url }: WhatsAppAudioPlayerProps) {
  return (
    <audio
      controls
      preload="metadata"
      className="h-10 w-full sm:w-[250px] max-w-full min-w-0"
      aria-label="Áudio recebido pelo WhatsApp"
    >
      <source src={url} />
      Seu navegador não conseguiu reproduzir este áudio.
    </audio>
  );
}