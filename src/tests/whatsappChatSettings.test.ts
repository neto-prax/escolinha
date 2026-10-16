import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadWhatsAppChatSettings,
  saveWhatsAppChatSettings,
  isGroupConversation,
  formatMessageWithSignature,
  canAttendantViewTicket,
  WHATSAPP_CHAT_SETTINGS_KEY,
} from '../hooks/useWhatsAppChatSettings';
import { DEFAULT_WHATSAPP_CHAT_SETTINGS, WhatsAppChatSettings } from '../types/mensagens';

describe('Configurações de Atendimento & Avaliação do WhatsApp (Módulo Atendimento & Avaliação)', () => {
  beforeEach(() => {
    // Mock simples de window.localStorage em ambiente Node.js de teste
    const store: Record<string, string> = {};
    (globalThis as any).window = {
      localStorage: {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => {
          store[k] = String(v);
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        clear: () => {
          for (const k of Object.keys(store)) delete store[k];
        },
      },
      dispatchEvent: () => true,
    };
  });

  describe('isGroupConversation (Detecção de Grupos do WhatsApp)', () => {
    test('deve detectar jids com padrão @g.us como grupo', () => {
      assert.equal(isGroupConversation('1203630248291029@g.us'), true);
      assert.equal(isGroupConversation('5511999998888-1614728192@g.us'), true);
    });

    test('deve detectar sufixos e prefixos de grupo', () => {
      assert.equal(isGroupConversation('sala-dos-professores-group'), true);
      assert.equal(isGroupConversation('group:pais-turma-a'), true);
    });

    test('deve retornar false para números de telefone individuais legítimos', () => {
      assert.equal(isGroupConversation('5511999998888'), false);
      assert.equal(isGroupConversation('+55 11 98765-4321'), false);
      assert.equal(isGroupConversation('557599887766'), false);
      assert.equal(isGroupConversation(null), false);
      assert.equal(isGroupConversation(undefined), false);
    });
  });

  describe('formatMessageWithSignature (Assinatura do Atendente)', () => {
    test('não deve alterar a mensagem se a assinatura estiver desativada', () => {
      const msg = 'Olá, tudo bem?';
      const formatted = formatMessageWithSignature(msg, 'Carlos Silva', false);
      assert.equal(formatted, msg);
    });

    test('não deve alterar a mensagem se o nome do atendente for nulo ou vazio', () => {
      const msg = 'Olá, tudo bem?';
      assert.equal(formatMessageWithSignature(msg, null, true), msg);
      assert.equal(formatMessageWithSignature(msg, '   ', true), msg);
    });

    test('deve anexar a assinatura padrão quando habilitado e atendente informado', () => {
      const msg = 'Segue o comprovante de rematrícula.';
      const formatted = formatMessageWithSignature(msg, 'Mariana Costa', true);
      assert.equal(formatted, 'Segue o comprovante de rematrícula.\n\n*Atendente: Mariana Costa*');
    });

    test('deve suportar template customizado com interpolação de variáveis', () => {
      const msg = 'Seu boleto foi emitido com sucesso.';
      const template = '*{{atendente}} da Secretaria:* {{mensagem}}';
      const formatted = formatMessageWithSignature(msg, 'Ana Souza', true, template);
      assert.equal(formatted, '*Ana Souza da Secretaria:* Seu boleto foi emitido com sucesso.');
    });
  });

  describe('canAttendantViewTicket (Regras de Visibilidade de Tickets)', () => {
    const defaultSettings: WhatsAppChatSettings = {
      ...DEFAULT_WHATSAPP_CHAT_SETTINGS,
    };

    test('diretores e administradores sempre visualizam todos os tickets', () => {
      const settingsStrict: WhatsAppChatSettings = {
        ...defaultSettings,
        naoVisualizarTicketsOutrosUsuarios: true,
        naoVisualizarTicketsChatBot: true,
        ignorarMensagensGrupo: true,
      };

      // Ticket atribuído a outro atendente, em chatbot e em grupo
      const ticket = {
        assigned_to: 'outro-usuario-uuid',
        tags: ['bot', 'autoatendimento'],
        phone: '1203630248291029@g.us',
      };

      const canView = canAttendantViewTicket(ticket, 'meu-usuario-uuid', true, settingsStrict);
      assert.equal(canView, true);
    });

    test('deve ocultar mensagem de grupo se ignorarMensagensGrupo estiver ativo', () => {
      const settingsWithGroupIgnore: WhatsAppChatSettings = {
        ...defaultSettings,
        ignorarMensagensGrupo: true,
      };

      const groupTicket = {
        assigned_to: null,
        phone: '1203630248291029@g.us',
      };

      const normalTicket = {
        assigned_to: null,
        phone: '5511999998888',
      };

      assert.equal(canAttendantViewTicket(groupTicket, 'atendente-1', false, settingsWithGroupIgnore), false);
      assert.equal(canAttendantViewTicket(normalTicket, 'atendente-1', false, settingsWithGroupIgnore), true);
    });

    test('se naoVisualizarTicketsOutrosUsuarios estiver ativo, não exibe tickets de terceiros', () => {
      const settingsHideOthers: WhatsAppChatSettings = {
        ...defaultSettings,
        naoVisualizarTicketsOutrosUsuarios: true,
      };

      const myTicket = {
        assigned_to: 'atendente-1',
        phone: '5511999998888',
      };

      const unassignedTicket = {
        assigned_to: null,
        phone: '5511999997777',
      };

      const otherTicket = {
        assigned_to: 'atendente-2',
        phone: '5511999996666',
      };

      assert.equal(canAttendantViewTicket(myTicket, 'atendente-1', false, settingsHideOthers), true);
      assert.equal(canAttendantViewTicket(unassignedTicket, 'atendente-1', false, settingsHideOthers), true);
      assert.equal(canAttendantViewTicket(otherTicket, 'atendente-1', false, settingsHideOthers), false);
    });

    test('se naoVisualizarTicketsOutrosUsuarios estiver inativo, exibe tickets de outros atendentes', () => {
      const settingsShowAll: WhatsAppChatSettings = {
        ...defaultSettings,
        naoVisualizarTicketsOutrosUsuarios: false,
      };

      const otherTicket = {
        assigned_to: 'atendente-2',
        phone: '5511999996666',
      };

      assert.equal(canAttendantViewTicket(otherTicket, 'atendente-1', false, settingsShowAll), true);
    });

    test('se naoVisualizarTicketsChatBot estiver ativo, não exibe tickets em atendimento com o bot', () => {
      const settingsHideBot: WhatsAppChatSettings = {
        ...defaultSettings,
        naoVisualizarTicketsChatBot: true,
      };

      const botTicket = {
        assigned_to: null,
        tags: ['bot', 'WhatsApp'],
        phone: '5511999998888',
      };

      const humanTicket = {
        assigned_to: null,
        tags: ['WhatsApp'],
        phone: '5511999998888',
      };

      assert.equal(canAttendantViewTicket(botTicket, 'atendente-1', false, settingsHideBot), false);
      assert.equal(canAttendantViewTicket(humanTicket, 'atendente-1', false, settingsHideBot), true);
    });
  });

  describe('Isolamento Multi-Tenant das Configurações de Atendimento', () => {
    test('deve persistir e carregar configurações isoladas por escola (schoolId)', () => {
      const schoolA = 'escola-papagaio-uuid';
      const schoolB = 'escola-centro-uuid';

      const configA: WhatsAppChatSettings = {
        ...DEFAULT_WHATSAPP_CHAT_SETTINGS,
        habilitarAssinatura: true,
        tempoEsperaAvaliacaoMinutos: 45,
        ignorarMensagensGrupo: true,
      };

      const configB: WhatsAppChatSettings = {
        ...DEFAULT_WHATSAPP_CHAT_SETTINGS,
        habilitarAssinatura: false,
        tempoEsperaAvaliacaoMinutos: 90,
        ignorarMensagensGrupo: false,
      };

      saveWhatsAppChatSettings(configA, schoolA);
      saveWhatsAppChatSettings(configB, schoolB);

      const loadedA = loadWhatsAppChatSettings(schoolA);
      const loadedB = loadWhatsAppChatSettings(schoolB);

      assert.equal(loadedA.habilitarAssinatura, true);
      assert.equal(loadedA.tempoEsperaAvaliacaoMinutos, 45);
      assert.equal(loadedA.ignorarMensagensGrupo, true);

      assert.equal(loadedB.habilitarAssinatura, false);
      assert.equal(loadedB.tempoEsperaAvaliacaoMinutos, 90);
      assert.equal(loadedB.ignorarMensagensGrupo, false);
    });

    test('deve retornar DEFAULT_WHATSAPP_CHAT_SETTINGS quando não houver registro prévio salvo', () => {
      const freshSchool = 'escola-nova-sem-config-uuid';
      const loaded = loadWhatsAppChatSettings(freshSchool);

      assert.deepEqual(loaded, DEFAULT_WHATSAPP_CHAT_SETTINGS);
      assert.equal(loaded.tempoEsperaAvaliacaoMinutos, 60);
      assert.equal(loaded.naoVisualizarTicketsOutrosUsuarios, true);
    });
  });
});

