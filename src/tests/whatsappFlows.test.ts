import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  syncEdgesFromNodes,
  resolveNextNodeInFlow,
} from '../hooks/useWhatsAppFlows';
import { WhatsAppChatFlow, FlowNode, PRESET_FLOWS } from '../types/mensagens';

describe('Gerador de Fluxos Visuais do WhatsApp (Chat Flow / Typebot)', () => {
  describe('syncEdgesFromNodes (Geração e Validação de Conexões do Diagrama)', () => {
    test('deve gerar arestas diretas a partir de targetNodeId', () => {
      const nodes: FlowNode[] = [
        {
          id: 'node-1',
          type: 'start',
          title: 'Início',
          position: { x: 0, y: 0 },
          data: {},
          targetNodeId: 'node-2',
        },
        {
          id: 'node-2',
          type: 'message',
          title: 'Mensagem',
          position: { x: 200, y: 0 },
          data: { message: 'Olá!' },
        },
      ];

      const edges = syncEdgesFromNodes(nodes);
      assert.equal(edges.length, 1);
      assert.equal(edges[0].fromNodeId, 'node-1');
      assert.equal(edges[0].toNodeId, 'node-2');
    });

    test('deve gerar arestas dedicadas para cada opção de menu', () => {
      const nodes: FlowNode[] = [
        {
          id: 'node-menu',
          type: 'menu',
          title: 'Menu de Opções',
          position: { x: 0, y: 0 },
          data: {
            options: [
              { id: 'opt-1', label: '1. Comercial', targetNodeId: 'node-comercial' },
              { id: 'opt-2', label: '2. Financeiro', targetNodeId: 'node-financeiro' },
            ],
          },
        },
        {
          id: 'node-comercial',
          type: 'transfer_sector',
          title: 'Comercial',
          position: { x: 300, y: 0 },
          data: { targetSectorId: 'comercial' },
        },
        {
          id: 'node-financeiro',
          type: 'transfer_sector',
          title: 'Financeiro',
          position: { x: 300, y: 150 },
          data: { targetSectorId: 'financeiro' },
        },
      ];

      const edges = syncEdgesFromNodes(nodes);
      assert.equal(edges.length, 2);
      
      const edge1 = edges.find((e) => e.fromOptionId === 'opt-1');
      assert.ok(edge1);
      assert.equal(edge1.toNodeId, 'node-comercial');

      const edge2 = edges.find((e) => e.fromOptionId === 'opt-2');
      assert.ok(edge2);
      assert.equal(edge2.toNodeId, 'node-financeiro');
    });

    test('deve ignorar conexões apontando para nós inexistentes (órfãos)', () => {
      const nodes: FlowNode[] = [
        {
          id: 'node-1',
          type: 'message',
          title: 'Mensagem',
          position: { x: 0, y: 0 },
          data: {},
          targetNodeId: 'node-inexistente',
        },
      ];

      const edges = syncEdgesFromNodes(nodes);
      assert.equal(edges.length, 0);
    });

    test('deve gerar arestas para ramificações condicionais (true/false)', () => {
      const nodes: FlowNode[] = [
        {
          id: 'node-cond',
          type: 'condition',
          title: 'Filtro',
          position: { x: 0, y: 0 },
          data: {
            conditionKeyword: 'matricula',
            trueTargetNodeId: 'node-true',
            falseTargetNodeId: 'node-false',
          },
        },
        {
          id: 'node-true',
          type: 'message',
          title: 'Sim',
          position: { x: 200, y: 0 },
          data: {},
        },
        {
          id: 'node-false',
          type: 'message',
          title: 'Não',
          position: { x: 200, y: 100 },
          data: {},
        },
      ];

      const edges = syncEdgesFromNodes(nodes);
      assert.equal(edges.length, 2);
      assert.ok(edges.some((e) => e.toNodeId === 'node-true'));
      assert.ok(edges.some((e) => e.toNodeId === 'node-false'));
    });
  });

  describe('resolveNextNodeInFlow (Navegação & Execução do Fluxo)', () => {
    const testFlow: WhatsAppChatFlow = {
      id: 'test-flow',
      name: 'Fluxo de Teste',
      is_active: true,
      trigger_keywords: ['oi'],
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      nodes: [
        {
          id: 'start',
          type: 'start',
          title: 'Início',
          position: { x: 0, y: 0 },
          data: {},
          targetNodeId: 'menu',
        },
        {
          id: 'menu',
          type: 'menu',
          title: 'Menu',
          position: { x: 100, y: 0 },
          data: {
            message: 'Escolha:',
            options: [
              { id: 'opt-1', label: '1. Matrículas', targetNodeId: 'dest-matriculas' },
              { id: 'opt-2', label: '2. Financeiro', targetNodeId: 'dest-financeiro' },
            ],
          },
        },
        {
          id: 'dest-matriculas',
          type: 'message',
          title: 'Matrículas Info',
          position: { x: 300, y: 0 },
          data: { message: 'Informações de Matrícula' },
          targetNodeId: 'end',
        },
        {
          id: 'dest-financeiro',
          type: 'message',
          title: 'Financeiro Info',
          position: { x: 300, y: 100 },
          data: { message: 'Informações Financeiras' },
        },
        {
          id: 'end',
          type: 'end',
          title: 'Fim',
          position: { x: 500, y: 0 },
          data: {},
        },
      ],
      edges: [],
    };

    test('deve avançar por conexão direta simples', () => {
      const next = resolveNextNodeInFlow(testFlow, 'start');
      assert.ok(next);
      assert.equal(next.id, 'menu');
    });

    test('deve resolver opção de menu digitada por número ("1")', () => {
      const next = resolveNextNodeInFlow(testFlow, 'menu', '1');
      assert.ok(next);
      assert.equal(next.id, 'dest-matriculas');
    });

    test('deve resolver opção de menu digitada por número ("2")', () => {
      const next = resolveNextNodeInFlow(testFlow, 'menu', '2');
      assert.ok(next);
      assert.equal(next.id, 'dest-financeiro');
    });

    test('deve resolver opção de menu digitada por palavra-chave ("financeiro")', () => {
      const next = resolveNextNodeInFlow(testFlow, 'menu', 'quero ver o financeiro');
      assert.ok(next);
      assert.equal(next.id, 'dest-financeiro');
    });

    test('deve retornar null quando a opção do menu não corresponder a nada', () => {
      const next = resolveNextNodeInFlow(testFlow, 'menu', '99');
      assert.equal(next, null);
    });
  });

  describe('Integridade dos Modelos Pré-Configurados (PRESET_FLOWS)', () => {
    test('todos os modelos recomendados devem ter nós válidos e conexões íntegras', () => {
      assert.ok(PRESET_FLOWS.length > 0);
      PRESET_FLOWS.forEach((flow) => {
        assert.ok(flow.id);
        assert.ok(flow.name);
        assert.ok(flow.nodes.length >= 2);

        // Deve possuir um nó do tipo start
        const hasStart = flow.nodes.some((n) => n.type === 'start');
        assert.equal(hasStart, true, `Fluxo ${flow.name} deve ter um nó inicial start`);

        // Todas as arestas geradas devem apontar para nós válidos
        const edges = syncEdgesFromNodes(flow.nodes);
        const nodeIds = new Set(flow.nodes.map((n) => n.id));

        edges.forEach((edge) => {
          assert.equal(nodeIds.has(edge.fromNodeId), true);
          assert.equal(nodeIds.has(edge.toNodeId), true);
        });
      });
    });
  });
});

