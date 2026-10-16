import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Zap,
  GitBranch,
  Phone,
  Sparkles,
  Bot,
  Settings2
} from 'lucide-react';
import { WhatsAppChatSettingsCard } from './WhatsAppChatSettingsCard';
import { UazapiSettings } from './UazapiSettings';
import { WhatsAppTriggersTab } from '@/components/mensagens/WhatsAppTriggersTab';
import { WhatsAppFlowsList } from '@/components/flows/WhatsAppFlowsList';
import { WhatsAppVisualFlowBuilder } from '@/components/flows/WhatsAppVisualFlowBuilder';
import { useWhatsAppFlows } from '@/hooks/useWhatsAppFlows';
import { WhatsAppChatFlow } from '@/types/mensagens';
import { LocalErrorBoundary } from '@/components/ErrorBoundary';

interface WhatsAppConfigHubProps {
  initialSubTab?: 'atendimento' | 'gatilhos' | 'fluxos' | 'conexao';
}

export function WhatsAppConfigHub({ initialSubTab = 'atendimento' }: WhatsAppConfigHubProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const validSubTabs = ['atendimento', 'gatilhos', 'fluxos', 'conexao'] as const;
  const sectionParam = searchParams.get('section');
  
  const activeSubTab = (sectionParam && validSubTabs.includes(sectionParam as any)
    ? sectionParam
    : initialSubTab) as 'atendimento' | 'gatilhos' | 'fluxos' | 'conexao';

  const handleSubTabChange = (newSubTab: 'atendimento' | 'gatilhos' | 'fluxos' | 'conexao') => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', 'whatsapp');
        next.set('section', newSubTab);
        return next;
      },
      { replace: true }
    );
  };

  const {
    flows,
    activeFlow,
    activeFlowId,
    setActiveFlowId,
    saveFlow,
    deleteFlow,
    toggleFlowStatus,
    duplicateFlow,
    createEmptyFlow,
    resetToPresets,
  } = useWhatsAppFlows();

  const [editingFlow, setEditingFlow] = useState<WhatsAppChatFlow | null>(null);

  const handleSelectFlowToEdit = (flow: WhatsAppChatFlow) => {
    setEditingFlow(flow);
    setActiveFlowId(flow.id);
  };

  const handleCreateNewFlow = () => {
    const newFlow = createEmptyFlow();
    setEditingFlow(newFlow);
  };

  const handleBackFromBuilder = () => {
    setEditingFlow(null);
    setActiveFlowId(null);
  };

  const handleSaveFlowFromBuilder = (flow: WhatsAppChatFlow) => {
    saveFlow(flow);
    setEditingFlow(flow);
  };

  return (
    <div className="space-y-6">
      {/* Se estiver no modo de edição visual do fluxo, renderiza o Canvas Builder */}
      {editingFlow ? (
        <WhatsAppVisualFlowBuilder
          flow={editingFlow}
          onSave={handleSaveFlowFromBuilder}
          onBack={handleBackFromBuilder}
          onDelete={(id) => {
            deleteFlow(id);
            setEditingFlow(null);
          }}
        />
      ) : (
        <Tabs
          value={activeSubTab}
          onValueChange={(val) => handleSubTabChange(val as any)}
          className="space-y-6"
        >
          {/* Sub-Navegação Superior da Seção WhatsApp */}
          <div className="bg-card p-1.5 rounded-xl border shadow-2xs">
            <TabsList className="bg-transparent flex flex-wrap gap-1 w-full justify-start h-auto p-0">
              <TabsTrigger
                value="atendimento"
                className="cursor-pointer gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-2xs"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Atendimento & Avaliação</span>
              </TabsTrigger>

              <TabsTrigger
                value="fluxos"
                className="cursor-pointer gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-400 data-[state=active]:shadow-2xs"
              >
                <GitBranch className="w-4 h-4 text-purple-600" />
                <span>Fluxos Visuais (Typebot)</span>
                <Badge variant="outline" className="text-[10px] h-4 px-1 border-purple-500/30 text-purple-600 ml-1">
                  {flows.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="gatilhos"
                className="cursor-pointer gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-400 data-[state=active]:shadow-2xs"
              >
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Central de Gatilhos & Modelos</span>
              </TabsTrigger>

              <TabsTrigger
                value="conexao"
                className="cursor-pointer gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-2xs"
              >
                <Phone className="w-4 h-4 text-blue-600" />
                <span>Conexão Gateway (QR Code)</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 1. MÓDULO ATENDIMENTO & AVALIAÇÃO */}
          <TabsContent value="atendimento" className="space-y-6 m-0">
            <WhatsAppChatSettingsCard />
          </TabsContent>

          {/* 2. GERADOR DE FLUXOS VISUAIS (TYPEBOT) */}
          <TabsContent value="fluxos" className="space-y-6 m-0">
            <WhatsAppFlowsList
              flows={flows}
              onSelectFlow={handleSelectFlowToEdit}
              onCreateFlow={handleCreateNewFlow}
              onDuplicateFlow={duplicateFlow}
              onDeleteFlow={deleteFlow}
              onToggleStatus={toggleFlowStatus}
              onResetPresets={resetToPresets}
            />
          </TabsContent>

          {/* 3. CENTRAL DE GATILHOS & MODELOS */}
          <TabsContent value="gatilhos" className="space-y-6 m-0">
            <LocalErrorBoundary fallbackTitle="Central de Gatilhos & Modelos">
              <div className="bg-card rounded-xl border shadow-2xs p-4">
                <WhatsAppTriggersTab />
              </div>
            </LocalErrorBoundary>
          </TabsContent>

          {/* 4. CONEXÃO GATEWAY (UAZAPI / WA-AKG) */}
          <TabsContent value="conexao" className="space-y-6 m-0">
            <UazapiSettings />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
