import { useState, useRef, useEffect, MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Play,
  Copy,
  Trash2,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Plus,
  MessageSquare,
  ListOrdered,
  Building2,
  HelpCircle,
  GitBranch,
  Clock,
  CheckCircle2,
  Sparkles,
  Bot,
  Layers,
  X,
  CornerDownRight,
  Focus,
  Move,
  Hand
} from 'lucide-react';
import {
  WhatsAppChatFlow,
  FlowNode,
  FlowNodeType,
  FlowOption,
  FlowEdge
} from '@/types/mensagens';
import { syncEdgesFromNodes } from '@/hooks/useWhatsAppFlows';
import { WhatsAppFlowSimulatorModal } from './WhatsAppFlowSimulatorModal';

interface WhatsAppVisualFlowBuilderProps {
  flow: WhatsAppChatFlow;
  onSave: (flow: WhatsAppChatFlow) => void;
  onBack: () => void;
  onDelete?: (flowId: string) => void;
}

const NODE_TYPE_CONFIG: Record<
  FlowNodeType,
  { label: string; color: string; border: string; bg: string; icon: any }
> = {
  start: {
    label: 'Início',
    color: 'text-emerald-600',
    border: 'border-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    icon: Sparkles,
  },
  message: {
    label: 'Mensagem',
    color: 'text-blue-600',
    border: 'border-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    icon: MessageSquare,
  },
  menu: {
    label: 'Menu de Opções',
    color: 'text-purple-600',
    border: 'border-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    icon: ListOrdered,
  },
  input: {
    label: 'Coleta de Dados',
    color: 'text-cyan-600',
    border: 'border-cyan-500',
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    icon: HelpCircle,
  },
  condition: {
    label: 'Condição / Gatilho',
    color: 'text-amber-600',
    border: 'border-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    icon: GitBranch,
  },
  transfer_sector: {
    label: 'Transferir Setor',
    color: 'text-indigo-600',
    border: 'border-indigo-500',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    icon: Building2,
  },
  delay: {
    label: 'Aguardar / Delay',
    color: 'text-yellow-600',
    border: 'border-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-950/40',
    icon: Clock,
  },
  end: {
    label: 'Encerrar',
    color: 'text-rose-600',
    border: 'border-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    icon: CheckCircle2,
  },
};

export function WhatsAppVisualFlowBuilder({
  flow: initialFlow,
  onSave,
  onBack,
  onDelete,
}: WhatsAppVisualFlowBuilderProps) {
  const [currentFlow, setCurrentFlow] = useState<WhatsAppChatFlow>(initialFlow);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showMobileInspector, setShowMobileInspector] = useState(false);

  // 1. Estado de Pan do Canvas (arrastar o fundo da tela)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 80, y: 60 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ mouseX: number; mouseY: number; initialPanX: number; initialPanY: number }>({
    mouseX: 0,
    mouseY: 0,
    initialPanX: 80,
    initialPanY: 60,
  });

  // 2. Estado de Arrasto de Nós (drag & drop dos blocos)
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragNodeRef = useRef<{
    nodeId: string;
    mouseStartX: number;
    mouseStartY: number;
    nodeStartX: number;
    nodeStartY: number;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedNode = currentFlow.nodes.find((n) => n.id === selectedNodeId) || null;

  // Atualiza conexões sincronizadas
  const edges = syncEdgesFromNodes(currentFlow.nodes);

  // Centraliza o fluxo de forma harmoniosa no carregamento inicial
  useEffect(() => {
    if (currentFlow.nodes.length > 0 && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const xs = currentFlow.nodes.map((n) => n.position.x);
        const ys = currentFlow.nodes.map((n) => n.position.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs) + 220;
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys) + 160;

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        setPan({
          x: Math.max(40, Math.round(rect.width / 2 - centerX * zoom)),
          y: Math.max(40, Math.round(rect.height / 2 - centerY * zoom)),
        });
      }
    }
  }, []);

  // Ouvintes Globais no window para garantir arrasto ininterrupto e suave (Mouse e Touch)
  useEffect(() => {
    if (!isPanning && !draggingNodeId) return;

    const applyMove = (clientX: number, clientY: number) => {
      // Caso 1: Arrastando um bloco/etapa do fluxo
      if (dragNodeRef.current && draggingNodeId) {
        const { nodeStartX, nodeStartY, mouseStartX, mouseStartY } = dragNodeRef.current;
        const dx = (clientX - mouseStartX) / zoom;
        const dy = (clientY - mouseStartY) / zoom;

        const newX = Math.round(nodeStartX + dx);
        const newY = Math.round(nodeStartY + dy);

        setCurrentFlow((prev) => ({
          ...prev,
          nodes: prev.nodes.map((n) =>
            n.id === draggingNodeId ? { ...n, position: { x: newX, y: newY } } : n
          ),
        }));
        return;
      }

      // Caso 2: Arrastando a tela / fundo do fluxo (Pan)
      if (isPanning) {
        const { mouseX, mouseY, initialPanX, initialPanY } = panStartRef.current;
        const dx = clientX - mouseX;
        const dy = clientY - mouseY;

        setPan({
          x: Math.round(initialPanX + dx),
          y: Math.round(initialPanY + dy),
        });
      }
    };

    const handleGlobalMouseMove = (e: globalThis.MouseEvent) => {
      applyMove(e.clientX, e.clientY);
    };

    const handleGlobalTouchMove = (e: globalThis.TouchEvent) => {
      if (e.touches.length === 1) {
        applyMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleGlobalPointerUp = () => {
      if (isPanning) {
        setIsPanning(false);
      }
      if (draggingNodeId) {
        setDraggingNodeId(null);
        dragNodeRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalPointerUp);
    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: true });
    window.addEventListener('touchend', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalPointerUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalPointerUp);
    };
  }, [isPanning, draggingNodeId, zoom]);

  // Manipulador de início de Pan ao clicar no fundo
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    setIsPanning(true);
    panStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialPanX: pan.x,
      initialPanY: pan.y,
    };
  };

  const handleCanvasTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsPanning(true);
    panStartRef.current = {
      mouseX: e.touches[0].clientX,
      mouseY: e.touches[0].clientY,
      initialPanX: pan.x,
      initialPanY: pan.y,
    };
  };

  // Manipulador de início de arrasto do nó
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'SELECT' ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('.interactive-handle')
    ) {
      return;
    }

    e.stopPropagation();
    setSelectedNodeId(nodeId);

    const node = currentFlow.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    setDraggingNodeId(nodeId);
    dragNodeRef.current = {
      nodeId,
      mouseStartX: e.clientX,
      mouseStartY: e.clientY,
      nodeStartX: node.position.x,
      nodeStartY: node.position.y,
    };
  };

  const handleNodeTouchStart = (e: React.TouchEvent, nodeId: string) => {
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'SELECT' ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('.interactive-handle')
    ) {
      return;
    }

    e.stopPropagation();
    setSelectedNodeId(nodeId);

    const node = currentFlow.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    setDraggingNodeId(nodeId);
    dragNodeRef.current = {
      nodeId,
      mouseStartX: e.touches[0].clientX,
      mouseStartY: e.touches[0].clientY,
      nodeStartX: node.position.x,
      nodeStartY: node.position.y,
    };
  };

  // Scroll com a rodinha do mouse para pan suave ou zoom (com Ctrl/Cmd)
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom((z) => Math.min(2.0, Math.max(0.4, Number((z * zoomFactor).toFixed(2)))));
    } else {
      setPan((p) => ({
        x: Math.round(p.x - e.deltaX),
        y: Math.round(p.y - e.deltaY),
      }));
    }
  };

  // Centraliza o fluxo de volta no meio da tela
  const handleCenterFlow = () => {
    if (!canvasRef.current || currentFlow.nodes.length === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const xs = currentFlow.nodes.map((n) => n.position.x);
    const ys = currentFlow.nodes.map((n) => n.position.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs) + 220;
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys) + 160;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setPan({
      x: Math.round(rect.width / 2 - centerX * zoom),
      y: Math.round(rect.height / 2 - centerY * zoom),
    });
  };

  const handleAddNode = (type: FlowNodeType) => {
    const newId = `node-${Math.random().toString(36).substring(2, 9)}`;
    const config = NODE_TYPE_CONFIG[type];

    // Calcula posição no centro da visão atual
    const count = currentFlow.nodes.length;
    let position = {
      x: 100 + (count % 4) * 260,
      y: 120 + Math.floor(count / 4) * 180,
    };

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const viewCenterX = (rect.width / 2 - pan.x) / zoom;
      const viewCenterY = (rect.height / 2 - pan.y) / zoom;
      position = {
        x: Math.round(viewCenterX - 110 + (count % 3) * 30),
        y: Math.round(viewCenterY - 60 + (count % 3) * 30),
      };
    }

    const newNode: FlowNode = {
      id: newId,
      type,
      title: config.label,
      position,
      data: {
        message: type === 'message' ? 'Olá! Como posso ajudar você?' : undefined,
        options:
          type === 'menu'
            ? [
                { id: `opt-${Math.random().toString(36).substring(2, 7)}`, label: '1. Opção A', targetNodeId: null },
                { id: `opt-${Math.random().toString(36).substring(2, 7)}`, label: '2. Opção B', targetNodeId: null },
              ]
            : undefined,
        targetSectorId: type === 'transfer_sector' ? 'comercial' : undefined,
      },
    };

    setCurrentFlow((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));

    setSelectedNodeId(newId);
    toast.success(`Etapa "${config.label}" adicionada ao diagrama!`);
  };

  const handleDuplicateSelected = () => {
    if (!selectedNode) return;
    const newId = `node-${Math.random().toString(36).substring(2, 9)}`;
    const duplicated: FlowNode = {
      ...selectedNode,
      id: newId,
      title: `${selectedNode.title} (Cópia)`,
      position: {
        x: selectedNode.position.x + 40,
        y: selectedNode.position.y + 40,
      },
      data: {
        ...selectedNode.data,
        options: selectedNode.data.options?.map((opt) => ({
          ...opt,
          id: `opt-${Math.random().toString(36).substring(2, 7)}`,
        })),
      },
    };

    setCurrentFlow((prev) => ({
      ...prev,
      nodes: [...prev.nodes, duplicated],
    }));

    setSelectedNodeId(newId);
    toast.success('Etapa duplicada com sucesso!');
  };

  const handleDeleteSelected = () => {
    if (!selectedNode) return;
    if (selectedNode.type === 'start') {
      toast.error('Não é possível excluir o nó de Início do fluxo.');
      return;
    }

    setCurrentFlow((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== selectedNode.id),
    }));

    setSelectedNodeId(null);
    toast.info('Etapa removida do fluxo.');
  };

  const handleSave = () => {
    const updated = {
      ...currentFlow,
      edges: syncEdgesFromNodes(currentFlow.nodes),
      updated_at: new Date().toISOString(),
    };
    onSave(updated);
    toast.success('Fluxo visual salvo com sucesso!');
  };

  // Helper de cálculo de coordenadas para conectores Bézier
  const getNodeCenter = (nodeId: string, optionId?: string) => {
    const node = currentFlow.nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    const nodeWidth = 220;
    const nodeHeight = 110;

    if (optionId && node.type === 'menu' && node.data?.options) {
      const optIndex = node.data.options.findIndex((o) => o.id === optionId);
      const optY = node.position.y + 65 + Math.max(0, optIndex) * 28;
      return {
        x: node.position.x + nodeWidth,
        y: optY,
      };
    }

    return {
      outputX: node.position.x + nodeWidth,
      outputY: node.position.y + nodeHeight / 2,
      inputX: node.position.x,
      inputY: node.position.y + nodeHeight / 2,
    };
  };

  return (
    <div
      className={`flex flex-col bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'h-[calc(100dvh-9rem)] min-h-[540px] sm:h-[750px] relative'
      }`}
    >
      {/* ---------------- 1. BARRA SUPERIOR (HEADER) ---------------- */}
      <div className="bg-card border-b px-2.5 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 flex-shrink-0 z-10 shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 px-2 sm:px-3 gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar para Fluxos</span>
          </Button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 sm:flex-initial">
            <Input
              value={currentFlow.name}
              onChange={(e) => setCurrentFlow((p) => ({ ...p, name: e.target.value }))}
              placeholder="Nome do Fluxo"
              className="h-8 text-xs font-bold w-full sm:w-56 md:w-64 bg-background min-w-[110px]"
            />
            <div className="flex items-center gap-1.5 pl-0.5 shrink-0">
              <span className="text-[11px] text-muted-foreground hidden md:inline">Status:</span>
              <Badge
                variant={currentFlow.is_active ? 'default' : 'secondary'}
                className={`text-[10px] h-5 cursor-pointer ${
                  currentFlow.is_active
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'text-slate-500'
                }`}
                onClick={() => setCurrentFlow((p) => ({ ...p, is_active: !p.is_active }))}
              >
                {currentFlow.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Botões de Ações da Barra */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap w-full sm:w-auto justify-end">
          {/* Menu + NOVA ETAPA */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 px-2.5 sm:px-3 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-3.5 h-3.5" />
                <span>NOVA ETAPA</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs">
              <DropdownMenuLabel>Selecione o tipo de etapa</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleAddNode('message')} className="gap-2 cursor-pointer">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                <span>Mensagem de Texto</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddNode('menu')} className="gap-2 cursor-pointer">
                <ListOrdered className="w-3.5 h-3.5 text-purple-500" />
                <span>Menu com Opções</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddNode('input')} className="gap-2 cursor-pointer">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-500" />
                <span>Pergunta / Coleta de Dado</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddNode('condition')} className="gap-2 cursor-pointer">
                <GitBranch className="w-3.5 h-3.5 text-amber-500" />
                <span>Condição / Filtro</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddNode('transfer_sector')} className="gap-2 cursor-pointer">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Transferir para Setor</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddNode('delay')} className="gap-2 cursor-pointer">
                <Clock className="w-3.5 h-3.5 text-yellow-500" />
                <span>Aguardar / Delay</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddNode('end')} className="gap-2 cursor-pointer">
                <CheckCircle2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Encerrar Atendimento</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Duplicar Etapa */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!selectedNode}
            onClick={handleDuplicateSelected}
            className="h-8 text-xs gap-1.5 hidden md:flex"
            title="Duplicar etapa selecionada"
          >
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            <span>DUP. ETAPA</span>
          </Button>

          {/* Testar / Simular Fluxo */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowSimulator(true)}
            className="h-8 px-2.5 sm:px-3 text-xs gap-1.5 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
          >
            <Play className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
            <span className="hidden sm:inline">SIMULAR</span>
          </Button>

          {/* Botão Painel de Propriedades no Mobile/Tablet */}
          <Button
            type="button"
            variant={showMobileInspector || selectedNode ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowMobileInspector((prev) => !prev)}
            className="h-8 px-2.5 text-xs gap-1 lg:hidden"
            title="Abrir configurações do fluxo/etapa"
          >
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span className="hidden xs:inline">Editar</span>
          </Button>

          {/* Salvar Fluxo */}
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            className="h-8 px-2.5 sm:px-3 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            <Save className="w-3.5 h-3.5" />
            <span>SALVAR</span>
          </Button>

          {/* Tela cheia */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-8 w-8 text-muted-foreground"
            title={isFullscreen ? 'Sair da tela cheia' : 'Expandir tela cheia'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>

          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onDelete(currentFlow.id)}
              className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              title="Excluir fluxo"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ---------------- 2. ÁREA DE TRABALHO: CANVAS + INSPECTOR ---------------- */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Canvas Interativo */}
        <div
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onTouchStart={handleCanvasTouchStart}
          onWheel={handleWheel}
          onClick={(e) => {
            if (e.target === canvasRef.current || (e.target as HTMLElement).tagName === 'svg') {
              setSelectedNodeId(null);
            }
          }}
          className={`flex-1 relative overflow-hidden select-none touch-none bg-[#FAFAFA] dark:bg-[#0D1117] ${
            isPanning ? 'cursor-grabbing' : draggingNodeId ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{
            backgroundImage: `radial-gradient(circle, rgba(100, 116, 139, 0.22) 1.5px, transparent 1.5px)`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          {/* Dica de Navegação e Arrastar no Topo do Canvas */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-card/85 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800 rounded-full px-3 py-1 shadow-2xs pointer-events-none text-[10px] sm:text-[11px] text-muted-foreground flex items-center gap-1.5 z-10 max-w-[92%] truncate">
            <Move className="w-3.5 h-3.5 text-blue-500 animate-pulse shrink-0" />
            <span className="truncate">Arraste os blocos para organizar • Arraste o fundo para navegar</span>
          </div>

          {/* Contêiner de Coordenadas Globais (Pan + Zoom) */}
          <div
            className="absolute inset-0 pointer-events-none origin-top-left"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {/* Camada SVG para as Conexões Curvas de Bézier */}
            <svg
              className="absolute inset-0 overflow-visible pointer-events-none"
              style={{
                width: 6000,
                height: 4500,
              }}
            >
              <defs>
                <marker
                  id="arrowhead-blue"
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#3B82F6" />
                </marker>
                <marker
                  id="arrowhead-purple"
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#8B5CF6" />
                </marker>
              </defs>

              {edges.map((edge) => {
                const fromNode = currentFlow.nodes.find((n) => n.id === edge.fromNodeId);
                const toNode = currentFlow.nodes.find((n) => n.id === edge.toNodeId);
                if (!fromNode || !toNode) return null;

                const startCoords = getNodeCenter(edge.fromNodeId, edge.fromOptionId);
                const startX = edge.fromOptionId ? startCoords.x : startCoords.outputX;
                const startY = edge.fromOptionId ? startCoords.y : startCoords.outputY;

                const targetCoords = getNodeCenter(edge.toNodeId);
                const endX = targetCoords.inputX;
                const endY = targetCoords.inputY;

                const dx = Math.abs(endX - startX) * 0.5;
                const pathD = `M ${startX} ${startY} C ${startX + Math.max(40, dx)} ${startY}, ${endX - Math.max(40, dx)} ${endY}, ${endX} ${endY}`;
                const isOption = Boolean(edge.fromOptionId);

                return (
                  <path
                    key={edge.id}
                    d={pathD}
                    stroke={isOption ? '#8B5CF6' : '#3B82F6'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                    markerEnd={isOption ? 'url(#arrowhead-purple)' : 'url(#arrowhead-blue)'}
                    className="transition-all"
                  />
                );
              })}
            </svg>

            {/* Camada dos Nós HTML no Canvas */}
            <div className="absolute inset-0 overflow-visible pointer-events-auto">
              {currentFlow.nodes.map((node) => {
                const config = NODE_TYPE_CONFIG[node.type] || NODE_TYPE_CONFIG.message;
                const Icon = config.icon;
                const isSelected = node.id === selectedNodeId;

                return (
                  <div
                    key={node.id}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    onTouchStart={(e) => handleNodeTouchStart(e, node.id)}
                    style={{
                      left: `${node.position.x}px`,
                      top: `${node.position.y}px`,
                      width: '220px',
                    }}
                    className={`absolute rounded-xl bg-card border-2 shadow-sm transition-shadow cursor-grab active:cursor-grabbing select-none hover:shadow-md ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 shadow-md'
                        : 'border-border hover:border-slate-400 dark:hover:border-slate-600'
                    }`}
                  >
                    {/* Conector de Entrada (Esquerda) */}
                    {node.type !== 'start' && (
                      <div
                        title="Entrada da etapa"
                        className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 border-2 border-card flex items-center justify-center hover:scale-125 transition-transform"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600 dark:bg-slate-300" />
                      </div>
                    )}

                    {/* Conector de Saída (Direita - Geral) */}
                    {node.type !== 'end' && node.type !== 'menu' && (
                      <div
                        title="Saída da etapa"
                        className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-500 border-2 border-card flex items-center justify-center hover:scale-125 transition-transform"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                    )}

                    {/* Faixa Superior Colorida do Nó */}
                    <div className={`px-3 py-2 border-b flex items-center justify-between ${config.bg} rounded-t-[10px]`}>
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Icon className={`w-3.5 h-3.5 ${config.color} flex-shrink-0`} />
                        <span className="text-xs font-bold truncate text-slate-800 dark:text-slate-100">
                          {node.title}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[9px] h-4 px-1 border-slate-300 dark:border-slate-700 text-slate-500">
                        {config.label}
                      </Badge>
                    </div>

                    {/* Conteúdo / Pré-visualização do Nó */}
                    <div className="p-3 text-xs space-y-2">
                      {node.type === 'start' && (
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Início automático ao receber mensagens de WhatsApp.
                        </p>
                      )}

                      {(node.type === 'message' || node.type === 'end') && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 italic leading-relaxed">
                          "{node.data?.message || node.data?.closingMessage || 'Sem mensagem definida...'}"
                        </p>
                      )}

                      {node.type === 'transfer_sector' && (
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Setor: {node.data?.targetSectorId?.toUpperCase() || 'COMERCIAL'}</span>
                        </div>
                      )}

                      {node.type === 'condition' && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">
                          Contém: <strong>"{node.data?.conditionKeyword || 'palavra'}"</strong>
                        </p>
                      )}

                      {node.type === 'menu' && (
                        <div className="space-y-1 pt-0.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                            Opções de Saída:
                          </span>
                          {node.data?.options?.map((opt) => (
                            <div
                              key={opt.id}
                              className="relative flex items-center justify-between py-1 px-2 rounded-md bg-muted/60 text-[11px] font-medium border border-slate-200/50 dark:border-slate-800"
                            >
                              <span className="truncate pr-3">{opt.label}</span>
                              {/* Conector individual por opção */}
                              <div
                                title={`Conexão da opção: ${opt.label}`}
                                className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-purple-500 border-2 border-card flex items-center justify-center"
                              >
                                <span className="w-1 h-1 rounded-full bg-white" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controles Flutuantes de Zoom e Centralizar no Canto Inferior Esquerdo */}
          <div className="absolute left-2.5 sm:left-4 bottom-2.5 sm:bottom-4 flex items-center gap-1 bg-card/90 backdrop-blur-xs border rounded-xl p-1 shadow-sm z-10">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-xs"
              onClick={() => setZoom((z) => Math.min(2.0, Number((z + 0.1).toFixed(2))))}
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <span className="text-[11px] font-semibold px-1 text-muted-foreground min-w-[38px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-xs"
              onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
              title="Diminuir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-xs"
              onClick={() => setZoom(1)}
              title="Redefinir 100%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <div className="h-4 w-px bg-border my-auto mx-0.5" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 px-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={handleCenterFlow}
              title="Centralizar todos os blocos na visualização"
            >
              <Focus className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden xs:inline">Centralizar</span>
            </Button>
          </div>
        </div>

        {/* ---------------- 3. PAINEL LATERAL DIREITO (INSPECTOR) ---------------- */}
        <div
          className={`w-full sm:w-80 border-l bg-card flex-col flex-shrink-0 overflow-y-auto p-4 space-y-4 shadow-xl lg:shadow-sm z-20 ${
            selectedNode || showMobileInspector
              ? 'flex absolute inset-y-0 right-0 lg:static'
              : 'hidden lg:flex'
          }`}
        >
          {selectedNode ? (
            /* Edição da Etapa Selecionada */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold text-muted-foreground">
                    Configuração da Etapa
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground"
                  onClick={() => {
                    setSelectedNodeId(null);
                    setShowMobileInspector(false);
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Título da Etapa */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Título do Bloco</Label>
                <Input
                  value={selectedNode.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setCurrentFlow((p) => ({
                      ...p,
                      nodes: p.nodes.map((n) => (n.id === selectedNode.id ? { ...n, title } : n)),
                    }));
                  }}
                  className="h-8 text-xs"
                />
              </div>

              {/* Editor de Mensagem de Texto */}
              {(selectedNode.type === 'message' || selectedNode.type === 'menu') && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Mensagem no WhatsApp</Label>
                    <span className="text-[10px] text-muted-foreground">Suporta {'{{variáveis}}'}</span>
                  </div>
                  <Textarea
                    rows={4}
                    value={selectedNode.data?.message || ''}
                    onChange={(e) => {
                      const msg = e.target.value;
                      setCurrentFlow((p) => ({
                        ...p,
                        nodes: p.nodes.map((n) =>
                          n.id === selectedNode.id ? { ...n, data: { ...n.data, message: msg } } : n
                        ),
                      }));
                    }}
                    placeholder="Digite a mensagem que o bot enviará..."
                    className="text-xs resize-none"
                  />
                  {/* Chips de Inserção de Tags */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {['{{nome}}', '{{aluno}}', '{{escola}}'].map((tag) => (
                      <Button
                        key={tag}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const current = selectedNode.data?.message || '';
                          const updated = `${current} ${tag}`;
                          setCurrentFlow((p) => ({
                            ...p,
                            nodes: p.nodes.map((n) =>
                              n.id === selectedNode.id ? { ...n, data: { ...n.data, message: updated } } : n
                            ),
                          }));
                        }}
                        className="h-5 px-1.5 text-[10px] border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      >
                        + {tag}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Editor de Opções do Menu */}
              {selectedNode.type === 'menu' && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Opções de Resposta</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newOption: FlowOption = {
                          id: `opt-${Math.random().toString(36).substring(2, 7)}`,
                          label: `${(selectedNode.data?.options?.length || 0) + 1}. Nova Opção`,
                          targetNodeId: null,
                        };
                        setCurrentFlow((p) => ({
                          ...p,
                          nodes: p.nodes.map((n) =>
                            n.id === selectedNode.id
                              ? {
                                  ...n,
                                  data: {
                                    ...n.data,
                                    options: [...(n.data.options || []), newOption],
                                  },
                                }
                              : n
                          ),
                        }));
                      }}
                      className="h-6 px-1.5 text-[11px] text-purple-600 hover:bg-purple-50"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {selectedNode.data?.options?.map((opt, idx) => (
                      <div key={opt.id} className="p-2 border rounded-lg bg-muted/30 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={opt.label}
                            onChange={(e) => {
                              const label = e.target.value;
                              setCurrentFlow((p) => ({
                                ...p,
                                nodes: p.nodes.map((n) =>
                                  n.id === selectedNode.id
                                    ? {
                                        ...n,
                                        data: {
                                          ...n.data,
                                          options: n.data.options?.map((o) =>
                                            o.id === opt.id ? { ...o, label } : o
                                          ),
                                        },
                                      }
                                    : n
                                ),
                              }));
                            }}
                            className="h-7 text-xs flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setCurrentFlow((p) => ({
                                ...p,
                                nodes: p.nodes.map((n) =>
                                  n.id === selectedNode.id
                                    ? {
                                        ...n,
                                        data: {
                                          ...n.data,
                                          options: n.data.options?.filter((o) => o.id !== opt.id),
                                        },
                                      }
                                    : n
                                ),
                              }));
                            }}
                            className="h-7 w-7 text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {/* Conexão de Destino da Opção */}
                        <div className="flex items-center gap-1 text-[11px]">
                          <CornerDownRight className="w-3 h-3 text-purple-500 flex-shrink-0" />
                          <Select
                            value={opt.targetNodeId || 'none'}
                            onValueChange={(val) => {
                              const target = val === 'none' ? null : val;
                              setCurrentFlow((p) => ({
                                ...p,
                                nodes: p.nodes.map((n) =>
                                  n.id === selectedNode.id
                                    ? {
                                        ...n,
                                        data: {
                                          ...n.data,
                                          options: n.data.options?.map((o) =>
                                            o.id === opt.id ? { ...o, targetNodeId: target } : o
                                          ),
                                        },
                                      }
                                    : n
                                ),
                              }));
                            }}
                          >
                            <SelectTrigger className="h-6 text-[10px] w-full">
                              <SelectValue placeholder="Conectar à etapa..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-xs">
                                Sem destino (Finaliza)
                              </SelectItem>
                              {currentFlow.nodes
                                .filter((n) => n.id !== selectedNode.id)
                                .map((n) => (
                                  <SelectItem key={n.id} value={n.id} className="text-xs">
                                    {n.title} ({NODE_TYPE_CONFIG[n.type]?.label || n.type})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Editor de Transferência de Setor */}
              {selectedNode.type === 'transfer_sector' && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Setor de Destino</Label>
                    <Select
                      value={selectedNode.data?.targetSectorId || 'comercial'}
                      onValueChange={(val) => {
                        setCurrentFlow((p) => ({
                          ...p,
                          nodes: p.nodes.map((n) =>
                            n.id === selectedNode.id
                              ? { ...n, data: { ...n.data, targetSectorId: val } }
                              : n
                          ),
                        }));
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione o setor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comercial" className="text-xs">Comercial & Matrículas</SelectItem>
                        <SelectItem value="financeiro" className="text-xs">Financeiro & Cobrança</SelectItem>
                        <SelectItem value="secretaria" className="text-xs">Secretaria Escolar</SelectItem>
                        <SelectItem value="pedagogico" className="text-xs">Coordenação Pedagógica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Mensagem de Transferência</Label>
                    <Textarea
                      rows={3}
                      value={selectedNode.data?.message || ''}
                      onChange={(e) => {
                        const msg = e.target.value;
                        setCurrentFlow((p) => ({
                          ...p,
                          nodes: p.nodes.map((n) =>
                            n.id === selectedNode.id ? { ...n, data: { ...n.data, message: msg } } : n
                          ),
                        }));
                      }}
                      placeholder="Mensagem avisando a transferência..."
                      className="text-xs resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Conexão Direta Padrão (para nós que não são menu) */}
              {selectedNode.type !== 'menu' && selectedNode.type !== 'end' && (
                <div className="space-y-1.5 pt-2 border-t">
                  <Label className="text-xs font-semibold">Próxima Etapa (Destino)</Label>
                  <Select
                    value={selectedNode.targetNodeId || 'none'}
                    onValueChange={(val) => {
                      const target = val === 'none' ? null : val;
                      setCurrentFlow((p) => ({
                        ...p,
                        nodes: p.nodes.map((n) =>
                          n.id === selectedNode.id ? { ...n, targetNodeId: target } : n
                        ),
                      }));
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Conectar à próxima etapa..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">
                        Nenhum (Final do fluxo)
                      </SelectItem>
                      {currentFlow.nodes
                        .filter((n) => n.id !== selectedNode.id)
                        .map((n) => (
                          <SelectItem key={n.id} value={n.id} className="text-xs">
                            {n.title} ({NODE_TYPE_CONFIG[n.type]?.label || n.type})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Botão de Excluir Etapa */}
              {selectedNode.type !== 'start' && (
                <div className="pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteSelected}
                    className="w-full text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Excluir esta etapa
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Configurações Gerais do Fluxo */
            <div className="space-y-4">
              <div className="pb-2 border-b flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs uppercase font-bold text-muted-foreground">
                    Configuração do Fluxo
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Clique em qualquer bloco do diagrama para editar suas etapas e conexões.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground lg:hidden shrink-0"
                  onClick={() => setShowMobileInspector(false)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome do Fluxo</Label>
                <Input
                  value={currentFlow.name}
                  onChange={(e) => setCurrentFlow((p) => ({ ...p, name: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Descrição</Label>
                <Textarea
                  rows={3}
                  value={currentFlow.description || ''}
                  onChange={(e) => setCurrentFlow((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Objetivo deste fluxo..."
                  className="text-xs resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Palavras-chave de Ativação</Label>
                <Input
                  value={currentFlow.trigger_keywords.join(', ')}
                  onChange={(e) => {
                    const keys = e.target.value.split(',').map((k) => k.trim()).filter(Boolean);
                    setCurrentFlow((p) => ({ ...p, trigger_keywords: keys }));
                  }}
                  placeholder="ex: oi, ola, matricula"
                  className="h-8 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Separe as palavras por vírgula.
                </p>
              </div>

              <div className="pt-2 border-t flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold cursor-pointer">Fluxo Ativo</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Habilita acionamento automático pelo bot.
                  </p>
                </div>
                <Switch
                  checked={currentFlow.is_active}
                  onCheckedChange={(checked) => setCurrentFlow((p) => ({ ...p, is_active: checked }))}
                />
              </div>

              <div className="pt-4 border-t space-y-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowSimulator(true)}
                  className="w-full text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Simular Fluxo ao Vivo
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Simulador Interativo */}
      <WhatsAppFlowSimulatorModal
        open={showSimulator}
        onOpenChange={setShowSimulator}
        flow={currentFlow}
      />
    </div>
  );
}

