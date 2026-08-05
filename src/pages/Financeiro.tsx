import React, { useState } from 'react';
import { Tabs } from '@/components/financeiro/Tabs';
import { LancamentosTab } from '@/components/financeiro/LancamentosTab';
import { OrcamentosTab } from '@/components/financeiro/OrcamentosTab';
import { SalariosTab } from '@/components/financeiro/SalariosTab';
import { DashboardTab } from '@/components/financeiro/DashboardTab';
import { Lancamento, Orcamento, Salario, Caixa, Cartao } from '@/types/finance';
import { mockExpenses, mockCaixas, mockCartoes } from '@/data/mockData';
import { Wallet, Calculator, Users, LayoutDashboard } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

const Financeiro = () => {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [salarios, setSalarios] = useState<Salario[]>([]);
  const [caixas, setCaixas] = useState<Caixa[]>(mockCaixas);
  const [cartoes, setCartoes] = useState<Cartao[]>(mockCartoes);
  
  const [categorias, setCategorias] = useState<string[]>([
    'Administrativo',
    'Alimentação',
    'Operacional & Infraestrutura',
    'Pedagógico & Material',
    'Pessoal/RH',
    'Eventos',
    'Reformas'
  ]);

  const handleAddCategoria = (novaCategoria: string) => {
    if (novaCategoria && !categorias.includes(novaCategoria)) {
      setCategorias([...categorias, novaCategoria].sort());
    }
  };

  const handleUpdateLancamento = (id: string, updates: Partial<Lancamento>) => {
    setLancamentos(lancamentos.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const handleAddLancamento = (lancamento: Omit<Lancamento, 'id'>) => {
    const newLancamento: Lancamento = {
      ...lancamento,
      id: crypto.randomUUID(),
      fechado: false,
    };
    setLancamentos([newLancamento, ...lancamentos]);
  };

  const handleFecharCaixa = (caixaId: string) => {
    setLancamentos(lancamentos.map(l => {
      // Se for pago, não for cartão, e for do caixa selecionado, mas não estava fechado, marca como fechado
      if (l.status === 'Pago' && l.formaPagamento !== 'Cartão' && l.caixaId === caixaId && !l.fechado) {
        return { ...l, fechado: true };
      }
      return l;
    }));
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
      id: 'dashboard',
      label: (
        <span className="flex items-center gap-2">
          <LayoutDashboard size={16} /> Visão Geral
        </span>
      ),
      content: (
        <DashboardTab
          lancamentos={lancamentos}
          orcamentos={orcamentos}
          salarios={salarios}
          caixas={caixas}
          cartoes={cartoes}
        />
      ),
    },
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
          caixas={caixas}
          cartoes={cartoes}
          categorias={categorias}
          onAddLancamento={handleAddLancamento}
          onUpdateLancamento={handleUpdateLancamento}
          onAddCategoria={handleAddCategoria}
          onFecharCaixa={handleFecharCaixa}
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
          categorias={categorias}
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
          caixas={caixas}
          cartoes={cartoes}
          onAddSalario={handleAddSalario} 
          onAddLancamento={handleAddLancamento}
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
