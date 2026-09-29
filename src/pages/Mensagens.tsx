import React, { useState } from 'react';
import {
  MessageSquare,
  Zap,
  Building2,
  Shield,
  Bot,
  Sparkles,
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

  const handleSelectSectorForChat = (sectorId: string) => {
    setActiveTab('chat');
  };

  return (
    <div className="space-y-6">
      {/* ---------------- CABEÇALHO DA PÁGINA ---------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            Central de Mensagens & WhatsApp
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão unificada de conversas com pais e alunos, gatilhos de auto-atendimento e permissões por setor.
          </p>
        </div>

        {/* Resumo Rápido de Indicadores */}
        <div className="flex items-center gap-3 text-xs">
          <div
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors select-none ${
              activeTab === 'chat' ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20' : 'bg-card hover:bg-muted/50'
            }`}
            title="Ir para Conversas WhatsApp"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-muted-foreground">Conversas Ativas:</span>
            <span className="font-bold text-foreground">{conversations.length}</span>
          </div>

          <div
            onClick={() => setActiveTab('triggers')}
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors select-none ${
              activeTab === 'triggers' ? 'bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20' : 'bg-card hover:bg-muted/50'
            }`}
            title="Ir para Triggers & Respostas"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-muted-foreground">Triggers:</span>
            <span className="font-bold text-foreground">{triggers.filter((t) => t.ativo).length} ativos</span>
          </div>

          <div
            onClick={() => setActiveTab('setores')}
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors select-none ${
              activeTab === 'setores' ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20' : 'bg-card hover:bg-muted/50'
            }`}
            title="Ir para Setores & Filas"
          >
            <Building2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-muted-foreground">Setores:</span>
            <span className="font-bold text-foreground">{allAvailableSectors.length}</span>
          </div>
        </div>
      </div>

      {/* ---------------- NAVEGAÇÃO POR ABAS ---------------- */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 max-w-2xl h-11 p-1 bg-muted/60">
          <TabsTrigger value="chat" className="gap-2 text-xs font-medium">
            <MessageSquare className="w-4 h-4" />
            Conversas WhatsApp
          </TabsTrigger>
          <TabsTrigger value="triggers" className="gap-2 text-xs font-medium">
            <Zap className="w-4 h-4 text-amber-500" />
            Triggers & Respostas
          </TabsTrigger>
          <TabsTrigger value="setores" className="gap-2 text-xs font-medium">
            <Building2 className="w-4 h-4 text-primary" />
            Setores & Filas
          </TabsTrigger>
          <TabsTrigger value="permissoes" className="gap-2 text-xs font-medium">
            <Shield className="w-4 h-4 text-blue-500" />
            Permissões por Setor
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo das Abas */}
        <TabsContent value="chat" className="focus-visible:outline-hidden mt-0">
          <WhatsAppChatView />
        </TabsContent>

        <TabsContent value="triggers" className="focus-visible:outline-hidden mt-0">
          <WhatsAppTriggersTab />
        </TabsContent>

        <TabsContent value="setores" className="focus-visible:outline-hidden mt-0">
          <WhatsAppSectorsTab onSelectSectorForChat={handleSelectSectorForChat} />
        </TabsContent>

        <TabsContent value="permissoes" className="focus-visible:outline-hidden mt-0">
          <WhatsAppSectorPermissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
