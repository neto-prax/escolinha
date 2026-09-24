import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AnoLetivoSelector } from '@/components/pedagogico/AnoLetivoSelector';
import {
  TutorialTour,
  TutorialButton,
  TURMAS_TUTORIAL_STEPS,
  DIARIO_TUTORIAL_STEPS,
  AVALIACOES_TUTORIAL_STEPS,
} from '@/components/common/TutorialTour';
import { Tabs } from '@/components/financeiro/Tabs';
import { DiarioTab } from '@/components/pedagogico/DiarioTab';
import { PlanejamentoTab } from '@/components/pedagogico/PlanejamentoTab';
import { AvaliacoesTab } from '@/components/pedagogico/AvaliacoesTab';
import { TurmasPedagogicoTab } from '@/components/pedagogico/TurmasPedagogicoTab';
import { PedagogicoSettings } from '@/components/settings/PedagogicoSettings';
import {
  BookOpen,
  FileText,
  CalendarDays,
  ClipboardCheck,
  Users,
  Settings2,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

const Pedagogico = () => {
  const { canAccessTab } = usePermissions();
  const [activeTab, setActiveTab] = useState('turmas');
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const canAccessConfig =
    canAccessTab('pedagogico', 'configuracoes') ||
    canAccessTab('pedagogico', 'materias') ||
    canAccessTab('pedagogico', 'ciclos-medias') ||
    canAccessTab('pedagogico', 'notas') ||
    canAccessTab('configuracoes', 'pedagogico');

  const allTabs = [
    {
      id: 'planejamento',
      label: (
        <span className="flex items-center gap-2">
          <CalendarDays size={16} /> Planejamento
        </span>
      ),
      content: <DiarioTab />,
    },
    {
      id: 'diario',
      label: (
        <span className="flex items-center gap-2">
          <BookOpen size={16} /> Diário de Classe
        </span>
      ),
      content: <PlanejamentoTab />,
    },
    {
      id: 'avaliacoes',
      label: (
        <span className="flex items-center gap-2">
          <ClipboardCheck size={16} /> Avaliações
        </span>
      ),
      content: <AvaliacoesTab />,
    },
    {
      id: 'turmas',
      label: (
        <span className="flex items-center gap-2">
          <Users size={16} /> Turmas & Horários
        </span>
      ),
      content: <TurmasPedagogicoTab />,
    },
    ...(canAccessConfig
      ? [
          {
            id: 'configuracoes',
            label: (
              <span className="flex items-center gap-2">
                <Settings2 size={16} /> Configurações
              </span>
            ),
            content: <PedagogicoSettings />,
          },
        ]
      : []),
  ];

  const visibleTabs = allTabs.filter(
    (t) => t.id === 'configuracoes' || canAccessTab('pedagogico', t.id)
  );

  const contextualSteps =
    activeTab === 'turmas'
      ? TURMAS_TUTORIAL_STEPS
      : activeTab === 'diario'
      ? DIARIO_TUTORIAL_STEPS
      : activeTab === 'avaliacoes'
      ? AVALIACOES_TUTORIAL_STEPS
      : TURMAS_TUTORIAL_STEPS;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="Pedagógico"
          description="Gestão de diários de classe, planejamento de aulas, avaliações e turmas"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <AnoLetivoSelector />
            <TutorialButton onClick={() => setIsTutorialOpen(true)} />
          </div>
        </PageHeader>
      </div>
      <Tabs
        tabs={visibleTabs}
        activeTabId={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tutorial Passo a Passo com Seta e Caixa de Mensagem */}
      <TutorialTour
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        steps={contextualSteps}
      />
    </div>
  );
};

export default Pedagogico;

