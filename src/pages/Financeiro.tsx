import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Tabs } from '@/components/financeiro/Tabs';
import { LancamentosTab } from '@/components/financeiro/LancamentosTab';
import { OrcamentosTab } from '@/components/financeiro/OrcamentosTab';
import { SalariosTab } from '@/components/financeiro/SalariosTab';
import { CartoesTab } from '@/components/financeiro/CartoesTab';
import { Lancamento, Orcamento, Salario, Caixa, Cartao, TurmaConfig } from '@/types/finance';
import { mockExpenses, mockCaixas, mockCartoes } from '@/data/mockData';
import { Wallet, Calculator, Users, LayoutDashboard, CreditCard } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

const Financeiro = () => {
  const [lancamentosStorage, setLancamentosStorage] = useLocalStorage<any[]>('escolinha_lancamentos', []);
  const [orcamentos, setOrcamentos] = useLocalStorage<Orcamento[]>('escolinha_orcamentos', []);
  const [salarios, setSalarios] = useLocalStorage<Salario[]>('escolinha_salarios', []);
  const [caixas, setCaixas] = useLocalStorage<Caixa[]>('escolinha_caixas', mockCaixas);
  const [cartoes, setCartoes] = useLocalStorage<Cartao[]>('escolinha_cartoes', mockCartoes);
  const [turmas, setTurmas] = useLocalStorage<TurmaConfig[]>('escolinha_turmas_v3', [
    { setor: 'Educação Infantil', nome: 'Maternal', letras: ['A', 'B'] },
    { setor: 'Ensino Fundamental 1', nome: '1º Ano', letras: ['A', 'B'] },
    { setor: 'Ensino Fundamental 2', nome: '6º Ano', letras: ['A'] },
    { setor: 'Ensino Médio', nome: '1º Ano EM', letras: [] }
  ]);
  
  const [categorias, setCategorias] = useLocalStorage<string[]>('escolinha_categorias', [
    'Administrativo',
    'Alimentação',
    'Operacional & Infraestrutura',
    'Pedagógico & Material',
    'Pessoal/RH',
    'Eventos',
    'Reformas'
  ]);

  // Necessário porque o LocalStorage converte Date para string
  const lancamentos: Lancamento[] = lancamentosStorage.map(l => ({
    ...l,
    data: typeof l.data === 'string' ? new Date(l.data) : l.data
  }));

  const setLancamentos = (novosLancamentos: Lancamento[]) => {
    setLancamentosStorage(novosLancamentos);
  };

  useEffect(() => {
    const isFixed = window.localStorage.getItem('fix_lancamento_dates_v1');
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
      window.localStorage.setItem('fix_lancamento_dates_v1', 'true');
    }
  }, [lancamentosStorage, setLancamentosStorage]);

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
