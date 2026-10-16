import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { getSchoolStorageKey } from '@/lib/cloudState';
import { WhatsAppChatSettings, DEFAULT_WHATSAPP_CHAT_SETTINGS } from '@/types/mensagens';

export const WHATSAPP_CHAT_SETTINGS_KEY = 'whatsapp_chat_settings_v1';

/**
 * Lê diretamente as configurações de atendimento e avaliação do localStorage com isolamento por escola.
 */
export function loadWhatsAppChatSettings(schoolId?: string | null): WhatsAppChatSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_WHATSAPP_CHAT_SETTINGS;
  }
  try {
    const scopedKey = schoolId ? getSchoolStorageKey(WHATSAPP_CHAT_SETTINGS_KEY, schoolId) : WHATSAPP_CHAT_SETTINGS_KEY;
    const raw = window.localStorage.getItem(scopedKey);
    if (!raw) return DEFAULT_WHATSAPP_CHAT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_WHATSAPP_CHAT_SETTINGS,
      ...parsed,
    };
  } catch (err) {
    console.warn('[loadWhatsAppChatSettings] Erro ao ler configurações:', err);
    return DEFAULT_WHATSAPP_CHAT_SETTINGS;
  }
}

/**
 * Salva as configurações de atendimento no localStorage com isolamento por escola.
 */
export function saveWhatsAppChatSettings(settings: WhatsAppChatSettings, schoolId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const scopedKey = schoolId ? getSchoolStorageKey(WHATSAPP_CHAT_SETTINGS_KEY, schoolId) : WHATSAPP_CHAT_SETTINGS_KEY;
    window.localStorage.setItem(scopedKey, JSON.stringify(settings));
    window.dispatchEvent(
      new CustomEvent('local-storage-sync', {
        detail: { key: scopedKey, newValue: settings },
      })
    );
  } catch (err) {
    console.warn('[saveWhatsAppChatSettings] Erro ao salvar configurações:', err);
  }
}

/**
 * Verifica se um telefone ou identificador pertence a um grupo do WhatsApp (@g.us).
 */
export function isGroupConversation(phoneOrId: string | null | undefined): boolean {
  if (!phoneOrId) return false;
  const normalized = phoneOrId.toLowerCase().trim();
  return normalized.includes('@g.us') || normalized.includes('-group') || normalized.startsWith('group:');
}

/**
 * Aplica a assinatura do atendente no corpo da mensagem se habilitado.
 */
export function formatMessageWithSignature(
  text: string,
  attendantName?: string | null,
  enabled: boolean = false,
  template?: string
): string {
  if (!enabled || !attendantName?.trim()) {
    return text;
  }

  const name = attendantName.trim();
  const trimmedText = text.trim();

  if (template && template.includes('{{mensagem}}') && template.includes('{{atendente}}')) {
    return template.replace('{{mensagem}}', trimmedText).replace('{{atendente}}', name);
  }

  return `${trimmedText}\n\n*Atendente: ${name}*`;
}

/**
 * Avalia se o atendente logado tem permissão para visualizar o ticket, respeitando as regras do Módulo Atendimento.
 */
export function canAttendantViewTicket(
  ticket: {
    assigned_to?: string | null;
    tags?: string[];
    ticket_status?: string;
    phone?: string;
  },
  currentUserId: string | null | undefined,
  isDirectorOrAdmin: boolean,
  settings: WhatsAppChatSettings
): boolean {
  // Diretores e administradores sempre visualizam todos os tickets
  if (isDirectorOrAdmin) {
    return true;
  }

  // Regra 1: Ignorar mensagens de grupo
  if (settings.ignorarMensagensGrupo && isGroupConversation(ticket.phone)) {
    return false;
  }

  // Regra 2: Não visualizar tickets atribuídos a outros usuários
  if (settings.naoVisualizarTicketsOutrosUsuarios) {
    // Se o ticket estiver atribuído a outra pessoa, oculta do atendente
    if (ticket.assigned_to && ticket.assigned_to !== currentUserId) {
      return false;
    }
  }

  // Regra 3: Não visualizar tickets no ChatBot
  if (settings.naoVisualizarTicketsChatBot) {
    const isBotStatus = ticket.ticket_status === 'pending' || ticket.ticket_status === 'open';
    const hasBotTag = Array.isArray(ticket.tags) && (
      ticket.tags.includes('bot') ||
      ticket.tags.includes('chatbot') ||
      ticket.tags.includes('autoatendimento')
    );
    // Se o ticket estiver explicitamente em atendimento com o bot
    if (hasBotTag) {
      return false;
    }
  }

  return true;
}

/**
 * Hook para gerenciar as configurações do WhatsApp com isolamento tenant (escola) e sincronização.
 */
export function useWhatsAppChatSettings() {
  const [settings, setSettings] = useLocalStorage<WhatsAppChatSettings>(
    WHATSAPP_CHAT_SETTINGS_KEY,
    DEFAULT_WHATSAPP_CHAT_SETTINGS
  );

  const mergedSettings = useMemo<WhatsAppChatSettings>(() => {
    return {
      ...DEFAULT_WHATSAPP_CHAT_SETTINGS,
      ...(settings || {}),
    };
  }, [
    settings?.naoVisualizarTicketsOutrosUsuarios,
    settings?.naoVisualizarTicketsChatBot,
    settings?.forcarAtendimentoViaResponsaveis,
    settings?.fluxoPadraoBotId,
    settings?.ignorarMensagensGrupo,
    settings?.habilitarAssinatura,
    settings?.formatoAssinatura,
    settings?.tempoEsperaAvaliacaoMinutos,
  ]);

  const updateSettings = useCallback(
    (partial: Partial<WhatsAppChatSettings>) => {
      setSettings((prev) => ({
        ...DEFAULT_WHATSAPP_CHAT_SETTINGS,
        ...(prev || {}),
        ...partial,
      }));
    },
    [setSettings]
  );

  const setAllModules = useCallback(
    (enabled: boolean) => {
      setSettings((prev) => ({
        ...DEFAULT_WHATSAPP_CHAT_SETTINGS,
        ...(prev || {}),
        naoVisualizarTicketsOutrosUsuarios: enabled,
        naoVisualizarTicketsChatBot: enabled,
        forcarAtendimentoViaResponsaveis: enabled,
        ignorarMensagensGrupo: enabled,
        habilitarAssinatura: enabled,
      }));
    },
    [setSettings]
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_WHATSAPP_CHAT_SETTINGS);
  }, [setSettings]);

  return {
    settings: mergedSettings,
    updateSettings,
    setAllModules,
    resetSettings,
  };
}

