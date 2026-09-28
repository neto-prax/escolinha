import React, { useState, useEffect } from 'react';
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
import { CalendarioEscolarTab } from '@/components/pedagogico/CalendarioEscolarTab';
import {
  BookOpen,
  FileText,
  CalendarDays,
  ClipboardCheck,
  Users,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useSearchParams } from 'react-router-dom';

const Pedagogico = () => {
  const { canAccessTab } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'diario');
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const allTabs = [
    {
      id: 'diario',
      label: (
        <span className="flex items-center gap-2">
          <BookOpen size={16} /> Diário de Classe
        </span>
      ),
      content: <DiarioTab />,
    },
    {
      id: 'planejamento',
      label: (
        <span className="flex items-center gap-2">
          <CalendarDays size={16} /> Planejamento
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
    {
      id: 'calendario',
      label: (
        <span className="flex items-center gap-2">
          <CalendarDays size={16} /> Calendário Escolar
        </span>
      ),
      content: <CalendarioEscolarTab />,
    },
  ];

  const visibleTabs = allTabs.filter((t) => canAccessTab('pedagogico', t.id));

  const effectiveActiveTab = visibleTabs.some((t) => t.id === activeTab)
    ? activeTab
    : (visibleTabs[0]?.id || 'diario');

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
        activeTabId={effectiveActiveTab}
        onTabChange={(id) => {
          setActiveTab(id);
          setSearchParams({ tab: id });
        }}
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

