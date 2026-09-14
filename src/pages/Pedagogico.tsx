import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs } from '@/components/financeiro/Tabs';
import { DiarioTab } from '@/components/pedagogico/DiarioTab';
import { AvaliacoesTab } from '@/components/pedagogico/AvaliacoesTab';
import { NotasTab } from '@/components/pedagogico/NotasTab';
import { TrilhasEstudosTab } from '@/components/pedagogico/TrilhasEstudosTab';
import { BookOpen, GraduationCap } from 'lucide-react';
import { BookOpen, ClipboardCheck, GraduationCap } from 'lucide-react';

const Pedagogico = () => {
  const tabs = [
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
          <GraduationCap size={16} /> Notas & Avaliações
          <GraduationCap size={16} /> Notas
        </span>
      ),
      content: <NotasTab />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="Pedagógico"
          description="Gestão de diários de classe, planejamento de aulas e acompanhamento de notas"
          description="Gestão de diários de classe, planejamento de avaliações e acompanhamento de notas"
        />
      </div>
      <Tabs tabs={tabs} />
    </div>
  );
};

export default Pedagogico;
