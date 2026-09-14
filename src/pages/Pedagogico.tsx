import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs } from '@/components/financeiro/Tabs';
import { DiarioTab } from '@/components/pedagogico/DiarioTab';
import { AvaliacoesTab } from '@/components/pedagogico/AvaliacoesTab';
import { NotasTab } from '@/components/pedagogico/NotasTab';
import { BookOpen, ClipboardCheck, GraduationCap } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

const Pedagogico = () => {
  const { canAccessTab } = usePermissions();

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
      id: 'avaliacoes',
      label: (
        <span className="flex items-center gap-2">
          <ClipboardCheck size={16} /> Avaliações
        </span>
      ),
      content: <AvaliacoesTab />,
    },
    {
      id: 'notas',
      label: (
        <span className="flex items-center gap-2">
          <GraduationCap size={16} /> Notas
        </span>
      ),
      content: <NotasTab />,
    },
  ];

  const visibleTabs = allTabs.filter((t) => canAccessTab('pedagogico', t.id));

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="Pedagógico"
          description="Gestão de diários de classe, planejamento de avaliações e acompanhamento de notas"
        />
      </div>
      <Tabs tabs={visibleTabs} />
    </div>
  );
};

export default Pedagogico;
