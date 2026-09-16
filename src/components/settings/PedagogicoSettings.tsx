import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TurmasPedagogicoTab } from '@/components/pedagogico/TurmasPedagogicoTab';
import { DocsEscolaresSettings } from '@/components/settings/DocsEscolaresSettings';
import { MateriasTab } from '@/components/pedagogico/MateriasTab';
import { CiclosMediasTab } from '@/components/pedagogico/CiclosMediasTab';
import { NotasTab } from '@/components/pedagogico/NotasTab';
import { DailyReportSettings } from '@/components/settings/DailyReportSettings';
import { Layers, Calculator, GraduationCap, MessageCircle, Settings2, Users, FileText } from 'lucide-react';

interface PedagogicoSettingsProps {
  defaultTab?: 'turmas' | 'docs-escolar' | 'materias' | 'ciclos-medias' | 'notas' | 'relatorio';
}

export const PedagogicoSettings: React.FC<PedagogicoSettingsProps> = ({
  defaultTab = 'turmas',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<string>(defaultTab);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 border rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Settings2 className="text-purple-600" size={22} />
            Configurações Pedagógicas
          </h2>
          <p className="text-xs text-slate-500">
            Gerencie turmas, separação de setores, documentos escolares/contratos, currículo de disciplinas, ciclos, médias e boletins.
          </p>
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 rounded-xl flex flex-wrap gap-1 border border-slate-200">
          <TabsTrigger
            value="turmas"
            className="gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-700 data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm"
          >
            <Users className="h-3.5 w-3.5" />
            Turmas & Horários
          </TabsTrigger>

          <TabsTrigger
            value="docs-escolar"
            className="gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-700 data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm"
          >
            <FileText className="h-3.5 w-3.5" />
            Docs. Escolar
          </TabsTrigger>

          <TabsTrigger
            value="materias"
            className="gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-700 data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm"
          >
            <Layers className="h-3.5 w-3.5" />
            Disciplinas & Matérias
          </TabsTrigger>

          <TabsTrigger
            value="ciclos-medias"
            className="gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-700 data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm"
          >
            <Calculator className="h-3.5 w-3.5" />
            Ciclos & Médias
          </TabsTrigger>

          <TabsTrigger
            value="notas"
            className="gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-700 data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm"
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Notas & Boletins
          </TabsTrigger>

          <TabsTrigger
            value="relatorio"
            className="gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-700 data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Relatório Diário WhatsApp
          </TabsTrigger>
        </TabsList>

        {/* 1. Turmas & Horários */}
        <TabsContent value="turmas" className="pt-2">
          <TurmasPedagogicoTab />
        </TabsContent>

        {/* 2. Documentos Escolares (Editor estilo WordPress) */}
        <TabsContent value="docs-escolar" className="pt-2">
          <DocsEscolaresSettings />
        </TabsContent>

        {/* 3. Disciplinas & Matérias */}
        <TabsContent value="materias" className="pt-2">
          <MateriasTab />
        </TabsContent>

        {/* 4. Ciclos & Médias */}
        <TabsContent value="ciclos-medias" className="pt-2">
          <CiclosMediasTab />
        </TabsContent>

        {/* 5. Notas & Boletins */}
        <TabsContent value="notas" className="pt-2">
          <NotasTab />
        </TabsContent>

        {/* 6. Relatório Diário WhatsApp */}
        <TabsContent value="relatorio" className="pt-2">
          <DailyReportSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

