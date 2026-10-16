import React, { useState } from 'react';
import {
  Zap,
  Building2,
  Shield,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WhatsAppChatView } from '@/components/mensagens/WhatsAppChatView';
import { WhatsAppTriggersTab } from '@/components/mensagens/WhatsAppTriggersTab';
import { WhatsAppSectorsTab } from '@/components/mensagens/WhatsAppSectorsTab';
import { WhatsAppSectorPermissionsTab } from '@/components/mensagens/WhatsAppSectorPermissionsTab';
import { useWhatsAppInbox, WhatsAppInboxProvider } from '@/hooks/useWhatsAppInbox';
import { useWhatsAppTriggers } from '@/hooks/useWhatsAppTriggers';

function MensagensContent() {
  const [activeTab, setActiveTab] = useState<string>('chat');
  const { allAvailableSectors = [] } = useWhatsAppInbox();
  const { triggers = [] } = useWhatsAppTriggers();

  const handleSelectSectorForChat = (_sectorId: string) => {
    setActiveTab('chat');
  };

  const activeTriggersCount = Array.isArray(triggers)
    ? triggers.filter((t: any) => t?.ativo !== false && t?.active !== false).length
    : 0;

  return (
    <div className="flex flex-col h-[calc(100dvh-4.5rem)] sm:h-[calc(100dvh-5.75rem)] lg:h-[calc(100dvh-6.75rem)] min-h-[420px] sm:min-h-[520px] w-full min-w-0 overflow-hidden">
      {/* Quando em visualizações de gerenciamento, exibe barra de navegação com botão de retorno às conversas */}
      {activeTab !== 'chat' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('chat')}
              className="gap-1.5 text-xs font-medium h-8"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para as Conversas</span>
            </Button>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <span className="text-sm font-semibold text-foreground truncate">
              {activeTab === 'triggers' && 'Gatilhos & Saudação Automática'}
              {activeTab === 'setores' && 'Setores de Atendimento'}
              {activeTab === 'permissoes' && 'Permissões de Atendentes'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant={activeTab === 'triggers' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('triggers')}
              className="h-8 text-xs gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Gatilhos ({activeTriggersCount})</span>
            </Button>
            <Button
              variant={activeTab === 'setores' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('setores')}
              className="h-8 text-xs gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span>Setores ({allAvailableSectors.length})</span>
            </Button>
            <Button
              variant={activeTab === 'permissoes' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('permissoes')}
              className="h-8 text-xs gap-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-blue-500" />
              <span>Permissões</span>
            </Button>
          </div>
        </div>
      )}

      {/* Conteúdo - O Chat ocupa 100% da área útil sem nenhum cabeçalho extra */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0">
            <WhatsAppChatView
              onOpenTriggers={() => setActiveTab('triggers')}
              onOpenSectors={() => setActiveTab('setores')}
              onOpenPermissions={() => setActiveTab('permissoes')}
              activeTriggersCount={activeTriggersCount}
              sectorsCount={allAvailableSectors.length}
            />
          </div>
        )}

        {activeTab === 'triggers' && (
          <div className="flex-1 overflow-y-auto pt-4">
            <WhatsAppTriggersTab />
          </div>
        )}

        {activeTab === 'setores' && (
          <div className="flex-1 overflow-y-auto pt-4">
            <WhatsAppSectorsTab onSelectSectorForChat={handleSelectSectorForChat} />
          </div>
        )}

        {activeTab === 'permissoes' && (
          <div className="flex-1 overflow-y-auto pt-4">
            <WhatsAppSectorPermissionsTab />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Mensagens() {
  return (
    <WhatsAppInboxProvider>
      <MensagensContent />
    </WhatsAppInboxProvider>
  );
}
