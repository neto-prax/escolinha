import React, { useState, useEffect, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Tabs } from '@/components/financeiro/Tabs';
import { LancamentosTab } from '@/components/financeiro/LancamentosTab';
import { OrcamentosTab } from '@/components/financeiro/OrcamentosTab';
import { SalariosTab } from '@/components/financeiro/SalariosTab';
import { CartoesTab } from '@/components/financeiro/CartoesTab';
import { AsaasBankTab } from '@/components/financeiro/AsaasBankTab';
import { Lancamento, Orcamento, Salario, Caixa, Cartao, TurmaConfig } from '@/types/finance';
import { Aluno, Mensalidade } from '@/types/aluno';
import { getIntegratedLancamentos } from '@/lib/financeUtils';
import { mockExpenses, mockCaixas, mockCartoes } from '@/data/mockData';
import { Wallet, Calculator, Users, LayoutDashboard, CreditCard, Landmark } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';

import { DEFAULT_TURMAS_CONFIG } from '@/constants/turmas';

const Financeiro = () => {
  const { canAccessTab } = usePermissions();
  const { school } = useAuth();
  const [alunos] = useLocalStorage<Aluno[]>('escolinha_alunos', []);
  const [mensalidades] = useLocalStorage<Mensalidade[]>('escolinha_mensalidades', []);
  const [lancamentosStorage, setLancamentosStorage] = useLocalStorage<any[]>('escolinha_lancamentos', []);
  const [lancamentosV2Storage, setLancamentosV2Storage] = useLocalStorage<any[]>('escolinha_lancamentos_v2', []);
  const [orcamentos, setOrcamentos] = useLocalStorage<Orcamento[]>('escolinha_orcamentos', []);
  const [salarios, setSalarios] = useLocalStorage<Salario[]>('escolinha_salarios', []);
  const [caixas, setCaixas] = useLocalStorage<Caixa[]>('escolinha_caixas', mockCaixas);
  const [cartoes, setCartoes] = useLocalStorage<Cartao[]>('escolinha_cartoes', mockCartoes);
  const [turmas, setTurmas] = useLocalStorage<TurmaConfig[]>('escolinha_turmas_v3', DEFAULT_TURMAS_CONFIG);
  
  const [categorias, setCategorias] = useLocalStorage<string[]>('escolinha_categorias', [
    'Administrativo',
    'Alimentação',
    'Operacional & Infraestrutura',
    'Pedagógico & Material',
    'Pessoal/RH',
    'Eventos',
    'Reformas'
  ]);

  // Unifica e integra lançamentos manuais com todas as mensalidades escolares pagas
  const lancamentos: Lancamento[] = useMemo(() => {
    const combined = [...lancamentosStorage, ...lancamentosV2Storage];
    return getIntegratedLancamentos(combined, mensalidades, alunos);
  }, [lancamentosStorage, lancamentosV2Storage, mensalidades, alunos]);

  const setLancamentos = (novosLancamentos: Lancamento[]) => {
    // Salva apenas os lançamentos não-sintéticos no storage
    const customOnly = novosLancamentos.filter(l => !l.id.startsWith('mensalidade-'));
    setLancamentosStorage(customOnly);
  };

  useEffect(() => {
    const hasAsaas = caixas.some(c => c.id === 'c-asaas' || c.nome.toLowerCase().includes('asaas'));
    if (!hasAsaas) {
      setCaixas([
        { id: 'c-asaas', nome: 'Asaas Bank (Conta Principal)', saldoInicial: 0.13 },
        ...caixas,
      ]);
    }
  }, [caixas, setCaixas]);

  useEffect(() => {
    const isFixed = window.localStorage.getItem(`s_${school?.id}_fix_lancamento_dates_v1`);
    if (!isFixed && lancamentosStorage.length > 0) {
      let modified = false;
      const fixedLancamentos = lancamentosStorage.map((l: any) => {
        if (typeof l.data === 'string' && l.data.endsWith('T00:00:00.000Z')) {
          modified = true;
          return { ...l, data: l.data.replace('T00:00:00.000Z', 'T12:00:00.000Z') };
        }
        return l;
      });
      if (modified) {
        setLancamentosStorage(fixedLancamentos);
      }
      window.localStorage.setItem(`s_${school?.id}_fix_lancamento_dates_v1`, 'true');
    }
  }, [lancamentosStorage, school?.id, setLancamentosStorage]);

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

  const handleImportLancamentos = (novosLancamentos: Omit<Lancamento, 'id'>[]) => {
    const comIds = novosLancamentos.map(l => ({
      ...l,
      id: crypto.randomUUID(),
      fechado: false
    }));
    setLancamentos([...comIds, ...lancamentos]);
  };

  const handleFecharCaixa = (caixaId: string) => {
    setLancamentos(lancamentos.map(l => {
      // Se for pago, não for cartão, e for do caixa selecionado (ou todos), mas não estava fechado, marca como fechado
      if (l.status === 'Pago' && l.formaPagamento !== 'Cartão' && (caixaId === 'todos' || l.caixaId === caixaId) && !l.fechado) {
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

  const handleAddCartao = (cartao: Omit<Cartao, 'id'>) => {
    const newCartao: Cartao = {
      ...cartao,
      id: crypto.randomUUID(),
    };
    setCartoes([...cartoes, newCartao]);
  };

  const handleUpdateCartao = (id: string, updates: Partial<Cartao>) => {
    setCartoes(cartoes.map(c => c.id === id ? { ...c, ...updates } : c));
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
          caixas={caixas}
          cartoes={cartoes}
          categorias={categorias}
          turmas={turmas}
          onAddLancamento={handleAddLancamento}
          onImportLancamentos={handleImportLancamentos}
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
    },
    {
      id: 'cartoes',
      label: (
        <span className="flex items-center gap-2">
          <CreditCard size={16} /> Cartões
        </span>
      ),
      content: (
        <CartoesTab 
          cartoes={cartoes} 
          onAddCartao={handleAddCartao}
          onUpdateCartao={handleUpdateCartao}
        />
      ),
    },
    {
      id: 'asaas',
      label: (
        <span className="flex items-center gap-2 font-semibold text-[#6b26d9]">
          <Landmark size={16} /> Banco Asaas
        </span>
      ),
      content: <AsaasBankTab />,
    }
  ];

  const visibleTabs = tabs.filter((t) => canAccessTab('financeiro', t.id));

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" description="Gestão financeira da escola" />
      <Tabs tabs={visibleTabs} />
    </div>
  );
};

export default Financeiro;
