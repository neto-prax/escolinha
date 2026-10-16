import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  GitBranch,
  Plus,
  Play,
  Copy,
  Trash2,
  Edit,
  Search,
  Sparkles,
  Bot,
  RotateCcw,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { WhatsAppChatFlow } from '@/types/mensagens';
import { WhatsAppFlowSimulatorModal } from './WhatsAppFlowSimulatorModal';

interface WhatsAppFlowsListProps {
  flows: WhatsAppChatFlow[];
  onSelectFlow: (flow: WhatsAppChatFlow) => void;
  onCreateFlow: () => void;
  onDuplicateFlow: (flowId: string) => void;
  onDeleteFlow: (flowId: string) => void;
  onToggleStatus: (flowId: string) => void;
  onResetPresets: () => void;
}

export function WhatsAppFlowsList({
  flows,
  onSelectFlow,
  onCreateFlow,
  onDuplicateFlow,
  onDeleteFlow,
  onToggleStatus,
  onResetPresets,
}: WhatsAppFlowsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [simulatingFlow, setSimulatingFlow] = useState<WhatsAppChatFlow | null>(null);

  const filteredFlows = flows.filter((f) => {
    const term = searchTerm.toLowerCase();
    return (
      f.name.toLowerCase().includes(term) ||
      (f.description && f.description.toLowerCase().includes(term)) ||
      f.trigger_keywords.some((k) => k.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-4">
      {/* ---------------- BARRA SUPERIOR DA LISTA ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Fluxos de Atendimento (Chat Flow)
              </h3>
              <Badge variant="outline" className="text-[10px] h-5 border-purple-500/30 text-purple-600 dark:text-purple-400">
                {flows.length} {flows.length === 1 ? 'Fluxo' : 'Fluxos'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Crie diagramas visuais com menus, mensagens, gatilhos e triagem automática para o WhatsApp.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onResetPresets();
              toast.info('Modelos padrão de fluxos restaurados.');
            }}
            className="h-9 text-xs text-muted-foreground gap-1.5"
            title="Restaurar fluxos escolares recomendados"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Restaurar Modelos</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onCreateFlow}
            className="h-9 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shadow-xs font-semibold px-4"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Fluxo</span>
          </Button>
        </div>
      </div>

      {/* Campo de Busca */}
      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar fluxos por nome, descrição ou palavra-chave de ativação..."
          className="pl-9 h-9 text-xs bg-card"
        />
      </div>

      {/* ---------------- GRID DE FLUXOS ---------------- */}
      {filteredFlows.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-2">
          <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto mb-3">
            <Bot className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Nenhum fluxo encontrado
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            {searchTerm
              ? 'Tente buscar com outros termos ou limpe o campo de busca.'
              : 'Você ainda não possui fluxos visuais criados. Comece criando um novo fluxo ou restaurando os modelos recomendados.'}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={onCreateFlow}
            className="text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="w-4 h-4" />
            Criar Primeiro Fluxo
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFlows.map((flow) => {
            const stepsCount = flow.nodes.length;
            const menuNodes = flow.nodes.filter((n) => n.type === 'menu');
            const totalBranches = menuNodes.reduce((acc, n) => acc + (n.data?.options?.length || 0), 0);

            return (
              <Card
                key={flow.id}
                className="border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 transition-all hover:shadow-xs group flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-purple-600 transition-colors">
                          {flow.name}
                        </CardTitle>
                        <Badge
                          variant={flow.is_active ? 'default' : 'secondary'}
                          className={`text-[10px] h-4 px-1.5 ${
                            flow.is_active
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-500'
                          }`}
                        >
                          {flow.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>

                      {flow.description && (
                        <CardDescription className="text-xs line-clamp-2 leading-relaxed">
                          {flow.description}
                        </CardDescription>
                      )}
                    </div>

                    <Switch
                      checked={flow.is_active}
                      onCheckedChange={() => onToggleStatus(flow.id)}
                      title={flow.is_active ? 'Desativar fluxo' : 'Ativar fluxo'}
                    />
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-0 space-y-3">
                  {/* Informações de etapas e ramificações */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t">
                    <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                      <Layers className="w-3.5 h-3.5 text-blue-500" />
                      {stepsCount} {stepsCount === 1 ? 'Etapa' : 'Etapas'}
                    </span>
                    {totalBranches > 0 && (
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3.5 h-3.5 text-purple-500" />
                        {totalBranches} Ramificações
                      </span>
                    )}
                  </div>

                  {/* Chips de Palavras-chave */}
                  {flow.trigger_keywords && flow.trigger_keywords.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Dispara com:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {flow.trigger_keywords.slice(0, 4).map((kw) => (
                          <Badge
                            key={kw}
                            variant="secondary"
                            className="text-[10px] h-4 px-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            "{kw}"
                          </Badge>
                        ))}
                        {flow.trigger_keywords.length > 4 && (
                          <span className="text-[10px] text-muted-foreground self-center">
                            +{flow.trigger_keywords.length - 4} mais
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Barra de Ações do Cartão */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSimulatingFlow(flow)}
                        className="h-8 px-2.5 text-xs gap-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        title="Simular e testar conversa ao vivo"
                      >
                        <Play className="w-3.5 h-3.5 fill-emerald-600" />
                        <span>Simular</span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onDuplicateFlow(flow.id)}
                        className="h-8 w-8 text-slate-500 hover:text-slate-800"
                        title="Duplicar fluxo"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteFlow(flow.id)}
                        className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Excluir fluxo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onSelectFlow(flow)}
                      className="h-8 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-medium"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Abrir no Editor</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Simulador Interativo */}
      <WhatsAppFlowSimulatorModal
        open={Boolean(simulatingFlow)}
        onOpenChange={(open) => !open && setSimulatingFlow(null)}
        flow={simulatingFlow}
      />
    </div>
  );
}

