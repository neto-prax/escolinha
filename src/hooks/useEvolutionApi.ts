import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface SendTextParams {
  phone: string;
  message: string;
}

interface SendMediaParams {
  phone: string;
  mediaType: 'image' | 'video' | 'document';
  mediaUrl: string;
  caption?: string;
  fileName?: string;
}

interface SendAudioParams {
  phone: string;
  audioUrl: string;
}

export function useEvolutionApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callEvolutionApi = async <T extends object>(action: string, data: T) => {
    setLoading(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('evolution-api', {
        body: { action, data },
      });

      if (fnError) throw fnError;
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao conectar com WhatsApp';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendText = async (params: SendTextParams) => {
    return callEvolutionApi('send-text', params);
  };

  const sendMedia = async (params: SendMediaParams) => {
    return callEvolutionApi('send-media', params);
  };

  const sendAudio = async (params: SendAudioParams) => {
    return callEvolutionApi('send-audio', params);
  };

  const getInstanceStatus = async () => {
    return callEvolutionApi('get-instance-status', {});
  };

  const getQrCode = async () => {
    return callEvolutionApi('get-qrcode', {});
  };

  const fetchMessages = async (phone: string, limit = 50) => {
    return callEvolutionApi('fetch-messages', { phone, limit });
  };

  return {
    loading,
    error,
    sendText,
    sendMedia,
    sendAudio,
    getInstanceStatus,
    getQrCode,
    fetchMessages,
  };
}
