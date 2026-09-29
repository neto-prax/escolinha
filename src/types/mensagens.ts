export type TipoCorrespondenciaTrigger = 'exata' | 'contem' | 'inicio' | 'qualquer_primeira';

export interface WhatsAppTrigger {
  id: string;
  nome: string;
  ativo: boolean;
  tipoCorrespondencia: TipoCorrespondenciaTrigger;
  palavrasChave: string[]; // Ex: ["matricula", "vagas", "preço"]
  respostaTexto: string; // Suporta variáveis: {{nome}}, {{aluno}}, {{setor}}, {{escola}}
  setorDestinoId: string | null; // Se definido, transfere automaticamente para este setor
  alterarStatus: 'open' | 'pending' | 'resolved' | 'closed' | null;
  prioridade: number; // Menor número = maior prioridade
  criadoEm: string;
  totalAcionamentos?: number;
}

export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export type WhatsAppMessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'document'
  | 'video'
  | 'location'
  | 'sticker'
  | 'gif'
  | 'view_once';

export interface WhatsAppChatMessage {
  id: string;
  conversation_id: string;
  body: string | null;
  direction: 'incoming' | 'outgoing';
  message_type: WhatsAppMessageType;
  media_url?: string | null;
  media_caption?: string | null;
  media_filename?: string | null;
  media_duration?: number | null; // Duração em segundos (áudio)
  is_view_once?: boolean; // Imagem temporária / visualização única do WhatsApp
  view_once_opened?: boolean; // Se a foto de visualização única já foi aberta
  status: MessageDeliveryStatus;
  created_at: string;
  sender_name?: string;
  is_automated?: boolean;
  reply_to_id?: string | null;
  reaction?: string | null; // Reação emoji (ex: ❤️, 👍, 😂)
}

export interface WhatsAppChatConversation {
  id: string;
  phone: string;
  contact_name: string;
  contact_id?: string | null;
  sector_id?: string | null;
  sector_name?: string | null;
  ticket_status: 'open' | 'pending' | 'resolved' | 'closed';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count: number;
  avatar_url?: string | null;
  tags?: string[];
  assigned_to?: string | null;
  assigned_name?: string | null;
  student_info?: {
    id: string;
    name: string;
    turma: string;
    responsavel: string;
    status_financeiro: 'em_dia' | 'pendente' | 'atrasado';
    foto_url?: string | null;
  } | null;
}

export interface WhatsAppSectorItem {
  id: string;
  name: string;
  description: string | null;
  color?: string;
  is_active: boolean;
  total_conversations?: number;
  total_pending?: number;
}

export interface TriggerMatchResult {
  matched: boolean;
  trigger?: WhatsAppTrigger;
  matchedKeyword?: string;
  formattedResponse?: string;
  targetSectorId?: string | null;
  newStatus?: 'open' | 'pending' | 'resolved' | 'closed' | null;
}
