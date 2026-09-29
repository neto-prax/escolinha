import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WhatsAppAudioPlayerProps {
  src?: string | null;
  duration?: number | null;
  isMe: boolean;
}

export function WhatsAppAudioPlayer({ src, duration = 12, isMe }: WhatsAppAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 12);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!src) return;
    const audio = new Audio(src);
    audioRef.current = audio;

    const handleLoaded = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current && src) {
      audioRef.current = new Audio(src);
    }

    if (audioRef.current && src) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current.play().catch(() => {
          // If browser blocks audio without user interaction, simulate playback
          simulatePlay();
        });
        setIsPlaying(true);
      }
    } else {
      // Simulate playback if simulated audio without external URL
      simulatePlay();
    }
  };

  const simulatePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= totalDuration) {
          clearInterval(interval);
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 1000 / playbackSpeed);
  };

  const handleSpeedToggle = () => {
    const nextSpeed: 1 | 1.5 | 2 = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = Math.min(100, Math.max(0, (currentTime / (totalDuration || 1)) * 100));

  return (
    <div className="flex items-center gap-3 py-1 px-1 min-w-[220px] max-w-[310px]">
      {/* Botão Play / Pause */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-95 ${
          isMe
            ? 'bg-primary-foreground text-primary hover:bg-primary-foreground/90'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
        title={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      {/* Onda Sonora / Barra de Progresso estilo WhatsApp */}
      <div className="flex-1 space-y-1.5 min-w-0">
        <div
          className="relative h-4 flex items-center gap-0.5 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const newPct = Math.max(0, Math.min(1, clickX / rect.width));
            const newTime = newPct * totalDuration;
            setCurrentTime(newTime);
            if (audioRef.current) {
              audioRef.current.currentTime = newTime;
            }
          }}
        >
          {/* Waveform Bars */}
          {[40, 65, 30, 80, 50, 95, 70, 45, 85, 60, 90, 40, 75, 55, 85, 50, 90, 65, 45, 70, 35, 80, 60, 40].map(
            (barHeight, idx) => {
              const barPct = (idx / 24) * 100;
              const isPlayed = barPct <= progressPercent;

              return (
                <div
                  key={idx}
                  className="flex-1 rounded-full transition-colors"
                  style={{
                    height: `${barHeight}%`,
                    backgroundColor: isPlayed
                      ? isMe
                        ? 'currentColor'
                        : '#10b981'
                      : isMe
                      ? 'rgba(255, 255, 255, 0.35)'
                      : 'rgba(100, 116, 139, 0.25)',
                  }}
                />
              );
            }
          )}
        </div>

        {/* Duração & Velocidade */}
        <div className="flex items-center justify-between text-[10px] opacity-80 font-mono">
          <span>{isPlaying ? formatSeconds(currentTime) : formatSeconds(totalDuration)}</span>
          <button
            type="button"
            onClick={handleSpeedToggle}
            className={`px-1.5 py-0.2 rounded-full font-bold text-[9px] transition-colors ${
              isMe
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-muted hover:bg-muted/80 text-foreground'
            }`}
            title="Alternar velocidade"
          >
            {playbackSpeed}x
          </button>
        </div>
      </div>

      {/* Ícone de Microfone / Gravador */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
          isMe ? 'bg-white/15 text-primary-foreground' : 'bg-emerald-500/10 text-emerald-600'
        }`}
      >
        <Mic className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}
