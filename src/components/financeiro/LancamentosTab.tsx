import React, { useState } from 'react';
import { Lancamento, TipoLancamento, Categoria, Unidade, FormaPagamento, Orcamento } from '../../types/finance';

interface LancamentosTabProps {
  lancamentos: Lancamento[];
  orcamentos: Orcamento[];
  onAddLancamento: (lancamento: Omit<Lancamento, 'id'>) => void;
}

export function LancamentosTab({ lancamentos, orcamentos, onAddLancamento }: LancamentosTabProps) {
  const [tipo, setTipo] = useState<TipoLancamento>('Entrada');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState<number | ''>('');
  const [data, setData] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('Administrativo');
  const [unidade, setUnidade] = useState<Unidade>('Todas');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX');
  const [orcamentoId, setOrcamentoId] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao || !valor || !data) return;

    onAddLancamento({
      tipo,
      descricao,
      valor: Number(valor),
      data: new Date(data),
      categoria,
      unidade,
      formaPagamento,
      tipoCusto: 'Variável', // Simplificando para este exemplo
      orcamentoId: tipo === 'Saída' && orcamentoId ? orcamentoId : undefined,
    });

    // Limpar formulário
    setDescricao('');
    setValor('');
    setOrcamentoId('');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Novo Lançamento</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select 
              value={tipo} 
              onChange={(e) => setTipo(e.target.value as TipoLancamento)}
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="Entrada">Entrada</option>
              <option value="Saída">Saída</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Data</label>
            <input 
              type="date" 
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <input 
              type="text" 
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Mensalidade, Folha A4..."
              required
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
            <input 
              type="number" 
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0,00"
              required
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select 
              value={categoria} 
              onChange={(e) => setCategoria(e.target.value as Categoria)}
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="Administrativo">Administrativo</option>
              <option value="Alimentação">Alimentação</option>
              <option value="Operacional & Infraestrutura">Operacional & Infraestrutura</option>
              <option value="Pedagógico & Material">Pedagógico & Material</option>
              <option value="Pessoal/RH">Pessoal/RH</option>
              <option value="Eventos">Eventos</option>
              <option value="Reformas">Reformas</option>
            </select>
          </div>

          {tipo === 'Saída' && (
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Vincular a Orçamento</label>
              <select 
                value={orcamentoId} 
                onChange={(e) => setOrcamentoId(e.target.value)}
                className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Nenhum</option>
                {orcamentos.map(orc => (
                  <option key={orc.id} value={orc.id}>{orc.nome}</option>
                ))}
              </select>
            </div>
          )}

          <div className="col-span-full mt-2">
            <button 
              type="submit" 
              className={`px-4 py-2 text-white font-medium rounded shadow-sm transition-colors ${
                tipo === 'Entrada' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              Registrar {tipo}
            </button>
          </div>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-3 text-gray-800">Histórico de Lançamentos</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
              <tr>
                <th className="py-3 px-4 text-left">Data</th>
                <th className="py-3 px-4 text-left">Descrição</th>
                <th className="py-3 px-4 text-left">Categoria</th>
                <th className="py-3 px-4 text-left">Tipo</th>
                <th className="py-3 px-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700 divide-y divide-gray-200">
              {lancamentos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">Nenhum lançamento registrado.</td>
                </tr>
              ) : (
                lancamentos.map((lanc) => (
                  <tr key={lanc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">{lanc.data.toLocaleDateString('pt-BR')}</td>
                    <td className="py-3 px-4">
                      {lanc.descricao}
                      {lanc.orcamentoId && (
                        <span className="ml-2 text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                          {orcamentos.find(o => o.id === lanc.orcamentoId)?.nome}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">{lanc.categoria}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        lanc.tipo === 'Entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {lanc.tipo}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${
                      lanc.tipo === 'Entrada' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {lanc.tipo === 'Entrada' ? '+' : '-'}{formatCurrency(lanc.valor)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
