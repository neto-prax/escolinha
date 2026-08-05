import React, { useState } from 'react';
import { Salario, SalarioItem, Lancamento, Caixa, Cartao, FormaPagamento } from '../../types/finance';
import { mockEmployees } from '@/data/mockData';
import { Plus, Trash2 } from 'lucide-react';

interface SalariosTabProps {
  salarios: Salario[];
  caixas: Caixa[];
  cartoes: Cartao[];
  onAddSalario: (salario: Omit<Salario, 'id'>) => void;
  onAddLancamento: (lancamento: Omit<Lancamento, 'id'>) => void;
}

export function SalariosTab({ salarios, caixas, cartoes, onAddSalario, onAddLancamento }: SalariosTabProps) {
  const [colaborador, setColaborador] = useState('');
  const [dataPagamento, setDataPagamento] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('Transferência Bancária');
  const [status, setStatus] = useState<'Pago' | 'Em Aberto'>('Pago');
  
  const [caixaId, setCaixaId] = useState<string>(caixas[0]?.id || '');
  const [cartaoId, setCartaoId] = useState<string>(cartoes[0]?.id || '');

  // Lista dinâmica de verbas do salário
  const [itens, setItens] = useState<SalarioItem[]>([
    { id: crypto.randomUUID(), descricao: 'Salário Base', tipo: 'Provento', valor: 0 }
  ]);

  const handleAddItem = () => {
    setItens([...itens, { id: crypto.randomUUID(), descricao: '', tipo: 'Provento', valor: 0 }]);
  };

  const handleRemoveItem = (id: string) => {
    setItens(itens.filter(i => i.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof SalarioItem, value: any) => {
    setItens(itens.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const calcularTotais = (listaItens: SalarioItem[]) => {
    let proventos = 0;
    let descontos = 0;
    listaItens.forEach(i => {
      if (i.tipo === 'Provento') proventos += Number(i.valor || 0);
      else descontos += Number(i.valor || 0);
    });
    return { proventos, descontos, liquido: proventos - descontos };
  };

  const totaisAtuais = calcularTotais(itens);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!colaborador || itens.length === 0 || !dataPagamento) return;

    // Remove itens vazios ou com valor 0
    const itensValidos = itens.filter(i => i.descricao.trim() !== '' && Number(i.valor) > 0);
    
    if (itensValidos.length === 0) {
      alert("Adicione pelo menos uma verba válida com valor maior que zero.");
      return;
    }

    const totais = calcularTotais(itensValidos);

    // 1. Salva o registro detalhado da Folha de Pagamento
    onAddSalario({
      colaborador,
      itens: itensValidos,
    });

    // 2. Gera o Lançamento de Saída no Caixa da Escola
    onAddLancamento({
      data: new Date(dataPagamento),
      unidade: 'Todas', // Você poderia adicionar um seletor de unidade se quiser
      descricao: `Folha de Pagamento - ${colaborador}`,
      categoria: 'Pessoal/RH',
      tipoCusto: 'Fixo',
      valor: totais.liquido,
      tipo: 'Saída',
      formaPagamento,
      status,
      caixaId: formaPagamento !== 'Cartão' ? caixaId : undefined,
      cartaoId: formaPagamento === 'Cartão' ? cartaoId : undefined,
    });

    // Limpa o formulário
    setColaborador('');
    setDataPagamento('');
    setItens([{ id: crypto.randomUUID(), descricao: 'Salário Base', tipo: 'Provento', valor: 0 }]);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Lançamento de Salário</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Colaborador</label>
              <select
                value={colaborador}
                onChange={(e) => setColaborador(e.target.value)}
                required
                className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="" disabled>Selecione um funcionário</option>
                {mockEmployees.map((emp) => (
                  <option key={emp.id} value={emp.name}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Data de Pagamento</label>
              <input 
                type="date" 
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                required
                className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value as 'Pago' | 'Em Aberto')}
                className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="Pago">Pago</option>
                <option value="Em Aberto">Em Aberto</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Forma de Pgto.</label>
              <select 
                value={formaPagamento} 
                onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
                className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="Transferência Bancária">Transferência Bancária</option>
                <option value="PIX">PIX</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão">Cartão</option>
                <option value="Boleto">Boleto</option>
              </select>
            </div>

            {formaPagamento === 'Cartão' ? (
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Qual Cartão?</label>
                <select 
                  value={cartaoId} 
                  onChange={(e) => setCartaoId(e.target.value)}
                  className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            ) : (
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Conta de Origem (Caixa)</label>
                <select 
                  value={caixaId} 
                  onChange={(e) => setCaixaId(e.target.value)}
                  className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  {caixas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2 mt-4">
              <h3 className="text-md font-bold text-gray-700">Verbas Salariais (Proventos e Descontos)</h3>
              <button 
                type="button" 
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded text-sm font-medium transition-colors"
              >
                <Plus size={16} /> Adicionar Verba
              </button>
            </div>
            
            <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200">
              {itens.map((item, index) => (
                <div key={item.id} className="flex flex-wrap md:flex-nowrap gap-3 items-end">
                  
                  <div className="flex flex-col flex-grow">
                    <label className="text-xs text-gray-500 mb-1">Descrição</label>
                    <input 
                      type="text" 
                      value={item.descricao}
                      onChange={(e) => handleUpdateItem(item.id, 'descricao', e.target.value)}
                      placeholder="Ex: Vale Transporte, Férias..."
                      required
                      className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 w-full"
                    />
                  </div>

                  <div className="flex flex-col w-32 shrink-0">
                    <label className="text-xs text-gray-500 mb-1">Tipo</label>
                    <select
                      value={item.tipo}
                      onChange={(e) => handleUpdateItem(item.id, 'tipo', e.target.value)}
                      className={`p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 ${
                        item.tipo === 'Provento' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
                      }`}
                    >
                      <option value="Provento">Provento (+)</option>
                      <option value="Desconto">Desconto (-)</option>
                    </select>
                  </div>

                  <div className="flex flex-col w-32 shrink-0">
                    <label className="text-xs text-gray-500 mb-1">Valor (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={item.valor || ''}
                      onChange={(e) => handleUpdateItem(item.id, 'valor', e.target.value === '' ? 0 : Number(e.target.value))}
                      placeholder="0,00"
                      required
                      min="0.01"
                      className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 w-full"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={itens.length === 1}
                    className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-0.5"
                    title="Remover"
                  >
                    <Trash2 size={20} />
                  </button>

                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center bg-indigo-50 p-4 rounded border border-indigo-100">
            <div className="flex gap-6">
              <div>
                <span className="text-xs text-indigo-800 font-semibold uppercase block mb-1">Total Proventos</span>
                <span className="text-lg font-medium text-green-700">+{formatCurrency(totaisAtuais.proventos)}</span>
              </div>
              <div>
                <span className="text-xs text-indigo-800 font-semibold uppercase block mb-1">Total Descontos</span>
                <span className="text-lg font-medium text-red-700">-{formatCurrency(totaisAtuais.descontos)}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-indigo-800 font-semibold uppercase block mb-1">Valor Final que sairá do caixa</span>
              <span className="text-2xl font-bold text-indigo-700">{formatCurrency(totaisAtuais.liquido)}</span>
            </div>
          </div>

          <div className="mt-4">
            <button 
              type="submit" 
              className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700 shadow-sm transition-colors"
            >
              Registrar Folha e Abater do Caixa
            </button>
          </div>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-3 text-gray-800">Folha de Pagamento Registrada</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
              <tr>
                <th className="py-3 px-4 text-left">Colaborador</th>
                <th className="py-3 px-4 text-left">Resumo de Verbas</th>
                <th className="py-3 px-4 text-right">T. Proventos</th>
                <th className="py-3 px-4 text-right">T. Descontos</th>
                <th className="py-3 px-4 text-right font-bold">Líquido</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700 divide-y divide-gray-200">
              {salarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">Nenhuma folha registrada.</td>
                </tr>
              ) : (
                salarios.map((sal) => {
                  const { proventos, descontos, liquido } = calcularTotais(sal.itens);
                  
                  return (
                    <tr key={sal.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium">{sal.colaborador}</td>
                      <td className="py-3 px-4 text-xs">
                        <div className="flex flex-wrap gap-1">
                          {sal.itens.map(item => (
                            <span 
                              key={item.id} 
                              className={`px-2 py-0.5 rounded-full ${item.tipo === 'Provento' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                            >
                              {item.descricao}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">+{formatCurrency(proventos)}</td>
                      <td className="py-3 px-4 text-right text-red-600 font-medium">-{formatCurrency(descontos)}</td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">{formatCurrency(liquido)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {salarios.length > 0 && (
              <tfoot className="bg-gray-50 font-bold text-gray-800 border-t-2 border-gray-200">
                <tr>
                  <td className="py-3 px-4 text-right" colSpan={4}>Custo Total da Folha:</td>
                  <td className="py-3 px-4 text-right">
                    {formatCurrency(salarios.reduce((acc, curr) => acc + calcularTotais(curr.itens).liquido, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
