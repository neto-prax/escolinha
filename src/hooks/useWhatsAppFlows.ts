import { useState, useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { WhatsAppChatFlow, FlowNode, FlowEdge, PRESET_FLOWS } from '@/types/mensagens';

export const WHATSAPP_FLOWS_STORAGE_KEY = 'whatsapp_chat_flows_v1';

/**
 * Reconstrói as conexões (edges) a partir dos apontamentos internos dos nós (targetNodeId e options.targetNodeId).
 */
export function syncEdgesFromNodes(nodes: FlowNode[]): FlowEdge[] {
  const edges: FlowEdge[] = [];
  const nodeMap = new Set(nodes.map((n) => n.id));

  nodes.forEach((node) => {
    // Conexão direta padrão
    if (node.targetNodeId && nodeMap.has(node.targetNodeId)) {
      edges.push({
        id: `edge-${node.id}-${node.targetNodeId}`,
        fromNodeId: node.id,
        toNodeId: node.targetNodeId,
      });
    }

    // Conexões específicas de opções de menu
    if (node.type === 'menu' && Array.isArray(node.data?.options)) {
      node.data.options.forEach((opt) => {
        if (opt.targetNodeId && nodeMap.has(opt.targetNodeId)) {
          edges.push({
            id: `edge-${node.id}-${opt.id}-${opt.targetNodeId}`,
            fromNodeId: node.id,
            fromOptionId: opt.id,
            toNodeId: opt.targetNodeId,
          });
        }
      });
    }

    // Conexões de nós de condição
    if (node.type === 'condition') {
      if (node.data?.trueTargetNodeId && nodeMap.has(node.data.trueTargetNodeId)) {
        edges.push({
          id: `edge-${node.id}-true-${node.data.trueTargetNodeId}`,
          fromNodeId: node.id,
          toNodeId: node.data.trueTargetNodeId,
        });
      }
      if (node.data?.falseTargetNodeId && nodeMap.has(node.data.falseTargetNodeId)) {
        edges.push({
          id: `edge-${node.id}-false-${node.data.falseTargetNodeId}`,
          fromNodeId: node.id,
          toNodeId: node.data.falseTargetNodeId,
        });
      }
    }
  });

  return edges;
}

/**
 * Avalia a próxima etapa do fluxo com base na etapa atual e na resposta digitada/selecionada pelo usuário.
 */
export function resolveNextNodeInFlow(
  flow: WhatsAppChatFlow,
  currentNodeId: string,
  userInput?: string
): FlowNode | null {
  const current = flow.nodes.find((n) => n.id === currentNodeId);
  if (!current) return null;

  // 1. Se for menu de opções
  if (current.type === 'menu' && Array.isArray(current.data?.options) && current.data.options.length > 0) {
    if (!userInput) return null;
    const cleanInput = userInput.trim().toLowerCase();

    // Tenta encontrar por índice numérico ("1", "2", etc.)
    const num = parseInt(cleanInput, 10);
    if (!isNaN(num) && num >= 1 && num <= current.data.options.length) {
      const selected = current.data.options[num - 1];
      if (selected.targetNodeId) {
        return flow.nodes.find((n) => n.id === selected.targetNodeId) || null;
      }
    }

    const normalize = (str: string) =>
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    const normalizedInput = normalize(cleanInput);

    // Tenta encontrar por texto da opção (removendo prefixo numérico como "1. ", "2) ", etc.)
    const found = current.data.options.find((opt) => {
      const optClean = normalize(opt.label.replace(/^[\d\s.\-#)]+/, ''));
      if (!optClean) return false;
      return normalizedInput.includes(optClean) || optClean.includes(normalizedInput);
    });

    if (found?.targetNodeId) {
      return flow.nodes.find((n) => n.id === found.targetNodeId) || null;
    }
  }

  // 2. Se for nó de condição
  if (current.type === 'condition') {
    const keyword = current.data?.conditionKeyword?.toLowerCase().trim() || '';
    const text = (userInput || '').toLowerCase();
    const matched = keyword ? text.includes(keyword) : true;
    const nextId = matched ? current.data?.trueTargetNodeId : current.data?.falseTargetNodeId;
    if (nextId) {
      return flow.nodes.find((n) => n.id === nextId) || null;
    }
  }

  // 3. Conexão padrão direta
  if (current.targetNodeId) {
    return flow.nodes.find((n) => n.id === current.targetNodeId) || null;
  }

  return null;
}

/**
 * Hook para gerenciamento e persistência dos fluxos visuais do WhatsApp.
 */
export function useWhatsAppFlows() {
  const [flows, setFlows] = useLocalStorage<WhatsAppChatFlow[]>(
    WHATSAPP_FLOWS_STORAGE_KEY,
    PRESET_FLOWS
  );

  const safeFlows = useMemo(() => {
    if (!Array.isArray(flows) || flows.length === 0) {
      return PRESET_FLOWS;
    }
    return flows;
  }, [flows]);

  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);

  const activeFlow = useMemo(() => {
    if (!activeFlowId) return null;
    return safeFlows.find((f) => f.id === activeFlowId) || null;
  }, [safeFlows, activeFlowId]);

  const saveFlow = useCallback(
    (flow: WhatsAppChatFlow) => {
      const nowIso = new Date().toISOString();
      const synchronizedEdges = syncEdgesFromNodes(flow.nodes);
      const cleanFlow: WhatsAppChatFlow = {
        ...flow,
        edges: synchronizedEdges,
        updated_at: nowIso,
      };

      setFlows((prev) => {
        const list = Array.isArray(prev) ? prev : PRESET_FLOWS;
        const exists = list.some((f) => f.id === cleanFlow.id);
        if (exists) {
          return list.map((f) => (f.id === cleanFlow.id ? cleanFlow : f));
        }
        return [...list, cleanFlow];
      });
    },
    [setFlows]
  );

  const deleteFlow = useCallback(
    (flowId: string) => {
      setFlows((prev) => {
        const list = Array.isArray(prev) ? prev : PRESET_FLOWS;
        return list.filter((f) => f.id !== flowId);
      });
      if (activeFlowId === flowId) {
        setActiveFlowId(null);
      }
    },
    [setFlows, activeFlowId]
  );

  const toggleFlowStatus = useCallback(
    (flowId: string) => {
      setFlows((prev) => {
        const list = Array.isArray(prev) ? prev : PRESET_FLOWS;
        return list.map((f) => (f.id === flowId ? { ...f, is_active: !f.is_active } : f));
      });
    },
    [setFlows]
  );

  const duplicateFlow = useCallback(
    (flowId: string): string => {
      const source = safeFlows.find((f) => f.id === flowId);
      if (!source) return '';

      const nowIso = new Date().toISOString();
      const newFlowId = `flow-${Date.now()}`;
      
      // Mapeamento para gerar novos IDs para todos os nós
      const idMap: Record<string, string> = {};
      source.nodes.forEach((n) => {
        idMap[n.id] = `node-${Math.random().toString(36).substring(2, 9)}`;
      });

      const clonedNodes: FlowNode[] = source.nodes.map((node) => ({
        ...node,
        id: idMap[node.id] || node.id,
        targetNodeId: node.targetNodeId ? (idMap[node.targetNodeId] || node.targetNodeId) : null,
        data: {
          ...node.data,
          options: node.data?.options?.map((opt) => ({
            ...opt,
            id: `opt-${Math.random().toString(36).substring(2, 9)}`,
            targetNodeId: opt.targetNodeId ? (idMap[opt.targetNodeId] || opt.targetNodeId) : null,
          })),
          trueTargetNodeId: node.data?.trueTargetNodeId ? (idMap[node.data.trueTargetNodeId] || node.data.trueTargetNodeId) : null,
          falseTargetNodeId: node.data?.falseTargetNodeId ? (idMap[node.data.falseTargetNodeId] || node.data.falseTargetNodeId) : null,
        },
      }));

      const newFlow: WhatsAppChatFlow = {
        ...source,
        id: newFlowId,
        name: `${source.name} (Cópia)`,
        nodes: clonedNodes,
        edges: syncEdgesFromNodes(clonedNodes),
        created_at: nowIso,
        updated_at: nowIso,
      };

      setFlows((prev) => [...(Array.isArray(prev) ? prev : PRESET_FLOWS), newFlow]);
      return newFlowId;
    },
    [safeFlows, setFlows]
  );

  const createEmptyFlow = useCallback((): WhatsAppChatFlow => {
    const nowIso = new Date().toISOString();
    const newId = `flow-${Date.now()}`;
    const startNode: FlowNode = {
      id: 'node-start',
      type: 'start',
      title: 'Início',
      position: { x: 80, y: 160 },
      data: {},
      targetNodeId: 'node-welcome',
    };
    const welcomeNode: FlowNode = {
      id: 'node-welcome',
      type: 'message',
      title: 'Boas-Vindas',
      position: { x: 340, y: 160 },
      data: {
        message: 'Olá {{nome}}! 🎒 Bem-vindo(a) à nossa escola. Como podemos te ajudar hoje?',
      },
    };

    const newFlow: WhatsAppChatFlow = {
      id: newId,
      name: 'Novo Fluxo de Atendimento',
      description: 'Fluxo visual configurável para WhatsApp.',
      is_active: true,
      trigger_keywords: ['atendimento'],
      nodes: [startNode, welcomeNode],
      edges: syncEdgesFromNodes([startNode, welcomeNode]),
      created_at: nowIso,
      updated_at: nowIso,
    };

    saveFlow(newFlow);
    setActiveFlowId(newId);
    return newFlow;
  }, [saveFlow]);

  const resetToPresets = useCallback(() => {
    setFlows(PRESET_FLOWS);
    setActiveFlowId(null);
  }, [setFlows]);

  return {
    flows: safeFlows,
    activeFlow,
    activeFlowId,
    setActiveFlowId,
    saveFlow,
    deleteFlow,
    toggleFlowStatus,
    duplicateFlow,
    createEmptyFlow,
    resetToPresets,
  };
}
