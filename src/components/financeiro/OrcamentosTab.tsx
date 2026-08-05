import React, { useState, useMemo } from 'react';
import { Orcamento, Categoria, Lancamento } from '../../types/finance';

interface OrcamentosTabProps {
  orcamentos: Orcamento[];
  lancamentos: Lancamento[];
  categorias: string[];
  onAddOrcamento: (orcamento: Omit<Orcamento, 'id'>) => void;
}

export function OrcamentosTab({ orcamentos, lancamentos, categorias, onAddOrcamento }: OrcamentosTabProps) {
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('Eventos');
  const [valorOrcado, setValorOrcado] = useState<number | ''>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !valorOrcado) return;

    onAddOrcamento({
      nome,
      categoria,
      valorOrcado: Number(valorOrcado)
    });

    setNome('');
    setValorOrcado('');
  };

  const orcamentosComSaldo = useMemo(() => {
    return orcamentos.map(orc => {
      // Filtrar lançamentos associados a este orçamento
      const gastos = lancamentos
        .filter(l => l.orcamentoId === orc.id && l.tipo === 'Saída')
        .reduce((acc, curr) => acc + curr.valor, 0);
      
      return {
        ...orc,
        gastos,
        saldo: orc.valorOrcado - gastos
      };
    });
  }, [orcamentos, lancamentos]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Novo Orçamento</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Nome (Setor, Evento, Reforma)</label>
            <input 
              type="text" 
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Dia dos Pais, Reforma Pátio..."
              required
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select 
              value={categoria} 
              onChange={(e) => setCategoria(e.target.value)}
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
            >
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Valor Orçado (R$)</label>
            <input 
              type="number" 
              step="0.01"
              value={valorOrcado}
              onChange={(e) => setValorOrcado(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0,00"
              required
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="col-span-full mt-2">
            <button 
              type="submit" 
              className="px-4 py-2 bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700 shadow-sm transition-colors"
            >
              Definir Orçamento
            </button>
          </div>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-3 text-gray-800">Acompanhamento de Orçamentos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orcamentosComSaldo.length === 0 ? (
            <p className="text-gray-500 col-span-full">Nenhum orçamento definido.</p>
          ) : (
            orcamentosComSaldo.map(orc => {
              const percGasto = Math.min((orc.gastos / orc.valorOrcado) * 100, 100);
              const isOverBudget = orc.saldo < 0;

              return (
                <div key={orc.id} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-800">{orc.nome}</h4>
                    <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {orc.categoria}
                    </span>
                  </div>
                  
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Orçado:</span>
                      <span className="font-medium">{formatCurrency(orc.valorOrcado)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Gasto:</span>
                      <span className="font-medium text-red-500">{formatCurrency(orc.gastos)}</span>
                    </div>
                    <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between font-bold">
                      <span className="text-gray-700">Saldo:</span>
                      <span className={isOverBudget ? 'text-red-600' : 'text-green-600'}>
                        {formatCurrency(orc.saldo)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-4 overflow-hidden">
                    <div 
                      className={`h-2 rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-indigo-500'}`}
                      style={{ width: `${percGasto}%` }}
                    ></div>
                  </div>
                  <div className="text-right text-xs mt-1 text-gray-500">
                    {percGasto.toFixed(1)}% utilizado
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
