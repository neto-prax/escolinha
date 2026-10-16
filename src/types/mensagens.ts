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

export interface WhatsAppChatMessage {
  id: string;
  conversation_id: string;
  body: string | null;
  direction: 'incoming' | 'outgoing' | 'system';
  message_type: 'text' | 'image' | 'audio' | 'document' | 'video' | 'sticker' | 'location' | 'system';
  media_url?: string | null;
  media_caption?: string | null;
  media_filename?: string | null;
  status: MessageDeliveryStatus;
  created_at: string;
  sender_name?: string;
  is_automated?: boolean;
  reply_to_id?: string | null;
}

export interface WhatsAppResolutionData {
  title: string;
  description: string;
  closingMessage?: string;
  resolved_at: string;
  resolved_by: string;
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
  opened_at?: string | null;
  closed_at?: string | null;
  resolution_summary?: string | null;
  resolution_data?: WhatsAppResolutionData | null;
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

export interface WhatsAppGreetingConfig {
  enabled: boolean;
  message: string;
  enabledSectors: string[]; // IDs ordenados dos setores exibidos no menu
  sectorGreetings: Record<string, string>; // Mensagem específica de cada setor ao ser selecionado
  defaultSectorId?: string | null; // Setor de fallback caso não escolha número válido
  onlyFirstMessage: boolean; // Dispara apenas na 1ª mensagem do contato
}

export interface WhatsAppChatSettings {
  // Módulo Atendimento
  naoVisualizarTicketsOutrosUsuarios: boolean;
  naoVisualizarTicketsChatBot: boolean;
  forcarAtendimentoViaResponsaveis: boolean;
  fluxoPadraoBotId: string | null;
  ignorarMensagensGrupo: boolean;
  habilitarAssinatura: boolean;
  formatoAssinatura?: string;

  // Módulo Avaliação
  tempoEsperaAvaliacaoMinutos: number;
}

export const DEFAULT_WHATSAPP_CHAT_SETTINGS: WhatsAppChatSettings = {
  naoVisualizarTicketsOutrosUsuarios: true,
  naoVisualizarTicketsChatBot: true,
  forcarAtendimentoViaResponsaveis: true,
  fluxoPadraoBotId: null,
  ignorarMensagensGrupo: true,
  habilitarAssinatura: true,
  formatoAssinatura: '{{mensagem}}\n\n*Atendente: {{atendente}}*',
  tempoEsperaAvaliacaoMinutos: 60,
};

// ==========================================
// 6. GERADOR DE FLUXOS VISUAIS (CHAT FLOW / TYPEBOT)
// ==========================================

export type FlowNodeType =
  | 'start'
  | 'message'
  | 'menu'
  | 'input'
  | 'condition'
  | 'transfer_sector'
  | 'delay'
  | 'end';

export interface FlowOption {
  id: string;
  label: string;
  targetNodeId: string | null;
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  title: string;
  position: { x: number; y: number };
  data: {
    message?: string;
    options?: FlowOption[];
    inputKey?: string;
    inputPrompt?: string;
    conditionKeyword?: string;
    trueTargetNodeId?: string | null;
    falseTargetNodeId?: string | null;
    targetSectorId?: string | null;
    delaySeconds?: number;
    closingMessage?: string;
  };
  targetNodeId?: string | null;
}

export interface FlowEdge {
  id: string;
  fromNodeId: string;
  fromOptionId?: string;
  toNodeId: string;
}

export interface WhatsAppChatFlow {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  trigger_keywords: string[];
  nodes: FlowNode[];
  edges: FlowEdge[];
  created_at: string;
  updated_at: string;
}

export const PRESET_FLOWS: WhatsAppChatFlow[] = [
  {
    id: 'flow-triagem-geral',
    name: 'Triagem & Menu Principal',
    description: 'Fluxo visual de boas-vindas com direcionamento de setores (Comercial, Financeiro, Secretaria, Pedagógico).',
    is_active: true,
    trigger_keywords: ['oi', 'ola', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'inicio', 'início', 'menu'],
    nodes: [
      {
        id: 'node-start',
        type: 'start',
        title: 'Início do Atendimento',
        position: { x: 50, y: 150 },
        data: {},
        targetNodeId: 'node-welcome',
      },
      {
        id: 'node-welcome',
        type: 'message',
        title: 'Boas-Vindas',
        position: { x: 300, y: 150 },
        data: {
          message: 'Olá {{nome}}! 🎒 Bem-vindo(a) à {{escola}}. É uma alegria atender você!\n\nPor favor, escolha uma das opções abaixo:',
        },
        targetNodeId: 'node-menu',
      },
      {
        id: 'node-menu',
        type: 'menu',
        title: 'Menu de Opções',
        position: { x: 580, y: 150 },
        data: {
          options: [
            { id: 'opt-comercial', label: '1. Matrículas & Vagas', targetNodeId: 'node-transfer-comercial' },
            { id: 'opt-financeiro', label: '2. Financeiro & 2ª Via', targetNodeId: 'node-transfer-financeiro' },
            { id: 'opt-secretaria', label: '3. Secretaria Escolar', targetNodeId: 'node-transfer-secretaria' },
            { id: 'opt-pedagogico', label: '4. Coordenação Pedagógica', targetNodeId: 'node-transfer-pedagogico' },
          ],
        },
      },
      {
        id: 'node-transfer-comercial',
        type: 'transfer_sector',
        title: 'Matrículas & Vagas',
        position: { x: 920, y: 40 },
        data: {
          targetSectorId: 'comercial',
          message: 'Perfeito! Transferindo para nossa equipe de Matrículas. Um consultor responderá em instantes! 📚',
        },
      },
      {
        id: 'node-transfer-financeiro',
        type: 'transfer_sector',
        title: 'Financeiro',
        position: { x: 920, y: 160 },
        data: {
          targetSectorId: 'financeiro',
          message: 'Certo! Transferindo para nosso setor Financeiro para emissão de boleto ou confirmação de pagamento. 💳',
        },
      },
      {
        id: 'node-transfer-secretaria',
        type: 'transfer_sector',
        title: 'Secretaria',
        position: { x: 920, y: 280 },
        data: {
          targetSectorId: 'secretaria',
          message: 'Transferindo para a Secretaria Escolar para declarações, históricos ou solicitações acadêmicas. 📑',
        },
      },
      {
        id: 'node-transfer-pedagogico',
        type: 'transfer_sector',
        title: 'Pedagógico',
        position: { x: 920, y: 400 },
        data: {
          targetSectorId: 'pedagogico',
          message: 'Direcionando você para a Coordenação Pedagógica. Um momento! 🎓',
        },
      },
    ],
    edges: [
      { id: 'edge-1', fromNodeId: 'node-start', toNodeId: 'node-welcome' },
      { id: 'edge-2', fromNodeId: 'node-welcome', toNodeId: 'node-menu' },
      { id: 'edge-3', fromNodeId: 'node-menu', fromOptionId: 'opt-comercial', toNodeId: 'node-transfer-comercial' },
      { id: 'edge-4', fromNodeId: 'node-menu', fromOptionId: 'opt-financeiro', toNodeId: 'node-transfer-financeiro' },
      { id: 'edge-5', fromNodeId: 'node-menu', fromOptionId: 'opt-secretaria', toNodeId: 'node-transfer-secretaria' },
      { id: 'edge-6', fromNodeId: 'node-menu', fromOptionId: 'opt-pedagogico', toNodeId: 'node-transfer-pedagogico' },
    ],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

