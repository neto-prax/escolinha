import React, { useState } from 'react';
import { Tabs } from '@/components/financeiro/Tabs';
import { LancamentosTab } from '@/components/financeiro/LancamentosTab';
import { OrcamentosTab } from '@/components/financeiro/OrcamentosTab';
import { SalariosTab } from '@/components/financeiro/SalariosTab';
import { Lancamento, Orcamento, Salario } from '@/types/finance';
import { mockExpenses } from '@/data/mockData';
import { Wallet, Calculator, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

const Financeiro = () => {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>(mockExpenses);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([
    { id: 'orc-1', nome: 'Dia dos Pais', categoria: 'Eventos', valorOrcado: 1000 },
    { id: 'orc-2', nome: 'Reforma do Pátio', categoria: 'Reformas', valorOrcado: 5000 },
  ]);
  const [salarios, setSalarios] = useState<Salario[]>([
    { id: 'sal-1', colaborador: 'João Professor', salarioBase: 3500, encargos: 150, descontos: 350 }
  ]);

  const handleAddLancamento = (lancamento: Omit<Lancamento, 'id'>) => {
    const newLancamento: Lancamento = {
      ...lancamento,
      id: crypto.randomUUID(),
    };
    setLancamentos([newLancamento, ...lancamentos]);
  };

  const handleAddOrcamento = (orcamento: Omit<Orcamento, 'id'>) => {
    const newOrcamento: Orcamento = {
      ...orcamento,
      id: crypto.randomUUID(),
    };
    setOrcamentos([...orcamentos, newOrcamento]);
  };

  const handleAddSalario = (salario: Omit<Salario, 'id'>) => {
    const newSalario: Salario = {
      ...salario,
      id: crypto.randomUUID(),
    };
    setSalarios([...salarios, newSalario]);
  };

  const tabs = [
    {
      id: 'lancamentos',
      label: (
        <span className="flex items-center gap-2">
          <Wallet size={16} /> Lançamentos
        </span>
      ),
      content: (
        <LancamentosTab 
          lancamentos={lancamentos} 
          orcamentos={orcamentos} 
          onAddLancamento={handleAddLancamento} 
        />
      ),
    },
    {
      id: 'orcamentos',
      label: (
        <span className="flex items-center gap-2">
          <Calculator size={16} /> Orçamentos
        </span>
      ),
      content: (
        <OrcamentosTab 
          orcamentos={orcamentos} 
          lancamentos={lancamentos} 
          onAddOrcamento={handleAddOrcamento} 
        />
      ),
    },
    {
      id: 'salarios',
      label: (
        <span className="flex items-center gap-2">
          <Users size={16} /> Salário
        </span>
      ),
      content: (
        <SalariosTab 
          salarios={salarios} 
          onAddSalario={handleAddSalario} 
        />
      ),
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" description="Gestão financeira da escola" />
      <Tabs tabs={tabs} />
    </div>
  );
};

export default Financeiro;
