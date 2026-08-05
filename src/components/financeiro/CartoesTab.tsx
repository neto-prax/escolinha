import React, { useState } from 'react';
import { Cartao } from '../../types/finance';
import { CreditCard, Edit2, Save, X } from 'lucide-react';

interface CartoesTabProps {
  cartoes: Cartao[];
  onAddCartao: (cartao: Omit<Cartao, 'id'>) => void;
  onUpdateCartao: (id: string, updates: Partial<Cartao>) => void;
}

export function CartoesTab({ cartoes, onAddCartao, onUpdateCartao }: CartoesTabProps) {
  const [nome, setNome] = useState('');
  const [limite, setLimite] = useState<number | ''>('');
  const [diaFechamento, setDiaFechamento] = useState<number | ''>('');
  const [diaVencimento, setDiaVencimento] = useState<number | ''>('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Cartao>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !limite || !diaFechamento || !diaVencimento) return;

    onAddCartao({
      nome,
      limite: Number(limite),
      diaFechamento: Number(diaFechamento),
      diaVencimento: Number(diaVencimento),
    });

    setNome('');
    setLimite('');
    setDiaFechamento('');
    setDiaVencimento('');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const startEditing = (cartao: Cartao) => {
    setEditingId(cartao.id);
    setEditData(cartao);
  };

  const saveEdit = () => {
    if (editingId && editData) {
      onUpdateCartao(editingId, editData);
      setEditingId(null);
      setEditData({});
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <CreditCard className="text-indigo-600" /> Novo Cartão
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Nome do Cartão</label>
            <input 
              type="text" 
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Nubank, Itaú..."
              required
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Limite (R$)</label>
            <input 
              type="number" 
              step="0.01"
              value={limite}
              onChange={(e) => setLimite(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0,00"
              required
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Dia de Fechamento</label>
            <input 
              type="number" 
              min="1"
              max="31"
              value={diaFechamento}
              onChange={(e) => setDiaFechamento(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Ex: 5"
              required
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Dia de Vencimento</label>
            <input 
              type="number" 
              min="1"
              max="31"
              value={diaVencimento}
              onChange={(e) => setDiaVencimento(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Ex: 12"
              required
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="col-span-full mt-2">
            <button 
              type="submit" 
              className="px-4 py-2 bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700 shadow-sm transition-colors"
            >
              Adicionar Cartão
            </button>
          </div>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-3 text-gray-800">Meus Cartões</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cartoes.length === 0 ? (
            <p className="text-gray-500 col-span-full">Nenhum cartão cadastrado.</p>
          ) : (
            cartoes.map(cartao => {
              const isEditing = editingId === cartao.id;

              return (
                <div key={cartao.id} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.nome || ''}
                        onChange={e => setEditData({ ...editData, nome: e.target.value })}
                        className="font-bold text-gray-800 border-b border-indigo-500 focus:outline-none w-full mr-2"
                      />
                    ) : (
                      <h4 className="font-bold text-gray-800 flex items-center gap-2">
                        <CreditCard size={18} className="text-indigo-500" />
                        {cartao.nome}
                      </h4>
                    )}
                    <div>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <button onClick={saveEdit} className="text-green-600 hover:text-green-800" title="Salvar">
                            <Save size={16} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-red-600 hover:text-red-800" title="Cancelar">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEditing(cartao)} className="text-gray-400 hover:text-indigo-600 transition-colors" title="Editar">
                          <Edit2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Limite:</span>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editData.limite || ''}
                          onChange={e => setEditData({ ...editData, limite: Number(e.target.value) })}
                          className="w-24 text-right border-b border-indigo-500 focus:outline-none"
                        />
                      ) : (
                        <span className="font-bold text-indigo-700">{formatCurrency(cartao.limite)}</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Dia de Fechamento:</span>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editData.diaFechamento || ''}
                          onChange={e => setEditData({ ...editData, diaFechamento: Number(e.target.value) })}
                          className="w-16 text-right border-b border-indigo-500 focus:outline-none"
                        />
                      ) : (
                        <span className="font-medium px-2 py-0.5 bg-gray-100 rounded text-gray-700">Dia {cartao.diaFechamento}</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Dia de Vencimento:</span>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editData.diaVencimento || ''}
                          onChange={e => setEditData({ ...editData, diaVencimento: Number(e.target.value) })}
                          className="w-16 text-right border-b border-indigo-500 focus:outline-none"
                        />
                      ) : (
                        <span className="font-medium px-2 py-0.5 bg-red-50 text-red-700 rounded">Dia {cartao.diaVencimento}</span>
                      )}
                    </div>
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
