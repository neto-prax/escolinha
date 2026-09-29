import React, { useState } from 'react';
import {
  MessageSquare,
  Zap,
  Building2,
  Shield,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WhatsAppChatView } from '@/components/mensagens/WhatsAppChatView';
import { WhatsAppTriggersTab } from '@/components/mensagens/WhatsAppTriggersTab';
import { WhatsAppSectorsTab } from '@/components/mensagens/WhatsAppSectorsTab';
import { WhatsAppSectorPermissionsTab } from '@/components/mensagens/WhatsAppSectorPermissionsTab';
import { useWhatsAppInbox } from '@/hooks/useWhatsAppInbox';
import { useWhatsAppTriggers } from '@/hooks/useWhatsAppTriggers';

export default function Mensagens() {
  const [activeTab, setActiveTab] = useState<string>('chat');
  const { conversations, allAvailableSectors } = useWhatsAppInbox();
  const { triggers } = useWhatsAppTriggers();

  const handleSelectSectorForChat = (_sectorId: string) => {
    setActiveTab('chat');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.75rem)] lg:h-[calc(100vh-7.75rem)] min-h-[580px]">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        {/* ---------------- CABEÇALHO COMPACTO & NAVEGAÇÃO POR ABAS ---------------- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs flex-shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-foreground truncate leading-tight">
                Central de Mensagens & WhatsApp
              </h1>
              <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                Gestão unificada de conversas, gatilhos de auto-atendimento e setores
              </p>
            </div>
          </div>

          {/* Abas Integradas no Topo */}
          <TabsList className="grid grid-cols-2 sm:flex sm:flex-row h-9 p-1 bg-muted/60 flex-shrink-0 self-start sm:self-auto">
            <TabsTrigger value="chat" className="gap-1.5 text-xs font-medium px-3 h-7">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat ({conversations.length})</span>
            </TabsTrigger>
            <TabsTrigger value="triggers" className="gap-1.5 text-xs font-medium px-3 h-7">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Triggers ({triggers.filter((t) => t.ativo).length})</span>
            </TabsTrigger>
            <TabsTrigger value="setores" className="gap-1.5 text-xs font-medium px-3 h-7">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span>Setores ({allAvailableSectors.length})</span>
            </TabsTrigger>
            <TabsTrigger value="permissoes" className="gap-1.5 text-xs font-medium px-3 h-7">
              <Shield className="w-3.5 h-3.5 text-blue-500" />
              <span>Permissões</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Conteúdo das Abas */}
        <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 pt-2 focus-visible:outline-hidden mt-0">
          <WhatsAppChatView />
        </TabsContent>

        <TabsContent value="triggers" className="flex-1 overflow-y-auto pt-4 focus-visible:outline-hidden mt-0">
          <WhatsAppTriggersTab />
        </TabsContent>

        <TabsContent value="setores" className="flex-1 overflow-y-auto pt-4 focus-visible:outline-hidden mt-0">
          <WhatsAppSectorsTab onSelectSectorForChat={handleSelectSectorForChat} />
        </TabsContent>

        <TabsContent value="permissoes" className="flex-1 overflow-y-auto pt-4 focus-visible:outline-hidden mt-0">
          <WhatsAppSectorPermissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
