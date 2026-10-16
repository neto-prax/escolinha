import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Send,
  RotateCcw,
  CheckCheck,
  Building2,
  Sparkles,
  ArrowRight,
  X
} from 'lucide-react';
import { WhatsAppChatFlow, FlowNode } from '@/types/mensagens';
import { resolveNextNodeInFlow } from '@/hooks/useWhatsAppFlows';

interface SimMessage {
  id: string;
  sender: 'bot' | 'user' | 'system';
  text: string;
  options?: { id: string; label: string; targetNodeId: string | null }[];
  time: string;
}

interface WhatsAppFlowSimulatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flow: WhatsAppChatFlow | null;
  schoolName?: string;
}

export function WhatsAppFlowSimulatorModal({
  open,
  onOpenChange,
  flow,
  schoolName = 'Colégio Interagir',
}: WhatsAppFlowSimulatorModalProps) {
  const [messages, setMessages] = useState<SimMessage[]>([]);
  const [currentNode, setCurrentNode] = useState<FlowNode | null>(null);
  const [inputText, setInputText] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const formatText = (template?: string) => {
    if (!template) return '';
    return template
      .replace(/{{nome}}/g, 'Visitante')
      .replace(/{{escola}}/g, schoolName)
      .replace(/{{aluno}}/g, 'Aluno Exemplo')
      .replace(/{{setor}}/g, 'Atendimento Geral');
  };

  const getTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const startSimulation = () => {
    if (!flow || !flow.nodes.length) return;
    setIsFinished(false);
    setInputText('');

    const startNode = flow.nodes.find((n) => n.type === 'start') || flow.nodes[0];
    const initialMessages: SimMessage[] = [];

    // Localiza o primeiro nó após o start
    let target = startNode;
    if (startNode.type === 'start' && startNode.targetNodeId) {
      const next = flow.nodes.find((n) => n.id === startNode.targetNodeId);
      if (next) target = next;
    }

    setCurrentNode(target);
    executeNode(target, initialMessages);
  };

  const executeNode = (node: FlowNode, currentMessages: SimMessage[]) => {
    const time = getTime();

    if (node.type === 'message') {
      const formatted = formatText(node.data?.message || 'Olá!');
      const newMsg: SimMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        sender: 'bot',
        text: formatted,
        time,
      };
      const updated = [...currentMessages, newMsg];
      setMessages(updated);

      // Avança se houver targetNodeId direto
      if (node.targetNodeId) {
        const next = flow?.nodes.find((n) => n.id === node.targetNodeId);
        if (next) {
          setTimeout(() => executeNode(next, updated), 600);
        }
      }
    } else if (node.type === 'menu') {
      const prompt = formatText(node.data?.message || 'Escolha uma das opções abaixo:');
      const newMsg: SimMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        sender: 'bot',
        text: prompt,
        options: node.data?.options || [],
        time,
      };
      setMessages([...currentMessages, newMsg]);
    } else if (node.type === 'transfer_sector') {
      const sectorId = node.data?.targetSectorId || 'atendimento';
      const transferMsg = formatText(node.data?.message || `Transferindo seu atendimento para o setor *${sectorId.toUpperCase()}*...`);
      const newMsg: SimMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        sender: 'bot',
        text: transferMsg,
        time,
      };
      const sysMsg: SimMessage = {
        id: `sys-${Date.now()}-${Math.random()}`,
        sender: 'system',
        text: `🔄 Atendimento direcionado para o setor: ${sectorId.toUpperCase()}`,
        time,
      };
      setMessages([...currentMessages, newMsg, sysMsg]);
      setIsFinished(true);
    } else if (node.type === 'end') {
      const endMsg = formatText(node.data?.closingMessage || 'Atendimento finalizado. Obrigado pelo contato!');
      const newMsg: SimMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        sender: 'bot',
        text: endMsg,
        time,
      };
      const sysMsg: SimMessage = {
        id: `sys-${Date.now()}-${Math.random()}`,
        sender: 'system',
        text: `🛑 Fluxo concluído com sucesso.`,
        time,
      };
      setMessages([...currentMessages, newMsg, sysMsg]);
      setIsFinished(true);
    } else if (node.type === 'input') {
      const prompt = formatText(node.data?.inputPrompt || 'Por favor, digite sua resposta:');
      const newMsg: SimMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        sender: 'bot',
        text: prompt,
        time,
      };
      setMessages([...currentMessages, newMsg]);
    } else {
      // Fallback
      if (node.targetNodeId) {
        const next = flow?.nodes.find((n) => n.id === node.targetNodeId);
        if (next) executeNode(next, currentMessages);
      }
    }
  };

  useEffect(() => {
    if (open) {
      startSimulation();
    }
  }, [open, flow]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendUserInput = (text: string) => {
    if (!text.trim() || !flow || !currentNode || isFinished) return;

    const time = getTime();
    const userMsg: SimMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      time,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputText('');

    const nextNode = resolveNextNodeInFlow(flow, currentNode.id, text.trim());
    if (nextNode) {
      setCurrentNode(nextNode);
      setTimeout(() => executeNode(nextNode, nextMessages), 500);
    } else {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-fallback-${Date.now()}`,
            sender: 'bot',
            text: 'Desculpe, não compreendi essa opção. Por favor, selecione uma das opções disponíveis ou digite o número correspondente.',
            time: getTime(),
          },
        ]);
      }, 500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95vw] h-[85vh] max-h-[640px] flex flex-col p-0 overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl">
        {/* Cabeçalho do Celular WhatsApp */}
        <div className="bg-[#075E54] dark:bg-[#128C7E] text-white p-3.5 flex items-center justify-between shadow-md flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm border border-white/30">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm leading-none truncate max-w-[180px]">
                  {flow?.name || 'Bot WhatsApp'}
                </span>
                <Badge variant="outline" className="text-[9px] h-4 px-1 border-white/40 text-emerald-100 bg-white/10">
                  Simulação
                </Badge>
              </div>
              <span className="text-[11px] text-emerald-100 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 inline-block animate-pulse" />
                online agora
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={startSimulation}
              title="Reiniciar Simulação"
              className="text-white hover:bg-white/20 h-8 w-8 rounded-full"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Fundo do Chat com Wallpaper característico */}
        <div
          ref={scrollRef}
          className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#EFEAE2] dark:bg-[#0b141a] text-slate-800 dark:text-slate-100"
          style={{
            backgroundImage: `radial-gradient(rgba(0,0,0,0.04) 1px, transparent 0)`,
            backgroundSize: '16px 16px',
          }}
        >
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-1.5">
              {msg.sender === 'system' ? (
                <div className="flex justify-center my-2">
                  <span className="bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-[11px] px-3 py-1 rounded-full shadow-2xs font-medium border border-slate-200/50 dark:border-slate-700/50">
                    {msg.text}
                  </span>
                </div>
              ) : (
                <div
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2 shadow-xs text-xs sm:text-[13px] leading-relaxed relative ${
                      msg.sender === 'user'
                        ? 'bg-[#DCF8C6] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-tr-none'
                        : 'bg-white dark:bg-[#202c33] text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200/60 dark:border-slate-700/50'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-muted-foreground/80">
                      <span>{msg.time}</span>
                      {msg.sender === 'user' && (
                        <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                      )}
                    </div>
                  </div>

                  {/* Opções de Menu Interativas (Botões clicáveis) */}
                  {msg.options && msg.options.length > 0 && (
                    <div className="mt-1.5 flex flex-col gap-1 w-full max-w-[85%]">
                      {msg.options.map((opt) => (
                        <Button
                          key={opt.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isFinished}
                          onClick={() => handleSendUserInput(opt.label)}
                          className="h-auto py-1.5 px-3 text-xs justify-start font-medium bg-white dark:bg-[#202c33] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-lg shadow-2xs transition-all active:scale-[0.98]"
                        >
                          <ArrowRight className="w-3.5 h-3.5 mr-1.5 text-emerald-500 flex-shrink-0" />
                          <span className="truncate">{opt.label}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Rodapé / Input de Envio do Usuário */}
        <div className="p-2.5 bg-slate-200/80 dark:bg-slate-900 border-t flex items-center gap-2 flex-shrink-0">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendUserInput(inputText);
              }
            }}
            disabled={isFinished}
            placeholder={
              isFinished
                ? 'Fluxo concluído.'
                : 'Digite uma mensagem ou número da opção...'
            }
            className="h-10 text-xs bg-white dark:bg-slate-800 rounded-full pl-4"
          />
          <Button
            type="button"
            size="icon"
            disabled={!inputText.trim() || isFinished}
            onClick={() => handleSendUserInput(inputText)}
            className="h-10 w-10 rounded-full bg-[#075E54] hover:bg-[#128C7E] text-white flex-shrink-0 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

