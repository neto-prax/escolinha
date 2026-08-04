import React, { useState } from 'react';
import { Salario } from '../../types/finance';
import { mockEmployees } from '@/data/mockData';

interface SalariosTabProps {
  salarios: Salario[];
  onAddSalario: (salario: Omit<Salario, 'id'>) => void;
}

export function SalariosTab({ salarios, onAddSalario }: SalariosTabProps) {
  const [colaborador, setColaborador] = useState('');
  const [salarioBase, setSalarioBase] = useState<number | ''>('');
  const [encargos, setEncargos] = useState<number | ''>('');
  const [descontos, setDescontos] = useState<number | ''>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!colaborador || !salarioBase) return;

    onAddSalario({
      colaborador,
      salarioBase: Number(salarioBase),
      encargos: Number(encargos || 0),
      descontos: Number(descontos || 0),
    });

    setColaborador('');
    setSalarioBase('');
    setEncargos('');
    setDescontos('');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Lançamento de Salário</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="flex flex-col md:col-span-2">
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
            <label className="text-sm font-medium text-gray-700 mb-1">Salário Base (R$)</label>
            <input 
              type="number" 
              step="0.01"
              value={salarioBase}
              onChange={(e) => setSalarioBase(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0,00"
              required
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Encargos / Bônus (R$)</label>
            <input 
              type="number" 
              step="0.01"
              value={encargos}
              onChange={(e) => setEncargos(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0,00"
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Descontos (R$)</label>
            <input 
              type="number" 
              step="0.01"
              value={descontos}
              onChange={(e) => setDescontos(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0,00"
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Resumo visual do cálculo */}
          <div className="flex flex-col justify-end">
            <div className="p-3 bg-indigo-50 rounded border border-indigo-100 flex flex-col justify-center h-full">
              <span className="text-xs text-indigo-800 font-semibold uppercase mb-1">Prévia Líquido</span>
              <span className="text-xl font-bold text-indigo-700">
                {formatCurrency(
                  Number(salarioBase || 0) + Number(encargos || 0) - Number(descontos || 0)
                )}
              </span>
            </div>
          </div>

          <div className="col-span-full mt-2">
            <button 
              type="submit" 
              className="px-4 py-2 bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700 shadow-sm transition-colors"
            >
              Registrar Salário
            </button>
          </div>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-3 text-gray-800">Folha de Pagamento</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
              <tr>
                <th className="py-3 px-4 text-left">Colaborador</th>
                <th className="py-3 px-4 text-right">Base</th>
                <th className="py-3 px-4 text-right">Encargos</th>
                <th className="py-3 px-4 text-right">Descontos</th>
                <th className="py-3 px-4 text-right font-bold">Líquido</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700 divide-y divide-gray-200">
              {salarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">Nenhum salário registrado.</td>
                </tr>
              ) : (
                salarios.map((sal) => {
                  const liquido = sal.salarioBase + sal.encargos - sal.descontos;
                  
                  return (
                    <tr key={sal.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium">{sal.colaborador}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(sal.salarioBase)}</td>
                      <td className="py-3 px-4 text-right text-green-600">+{formatCurrency(sal.encargos)}</td>
                      <td className="py-3 px-4 text-right text-red-600">-{formatCurrency(sal.descontos)}</td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">{formatCurrency(liquido)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {salarios.length > 0 && (
              <tfoot className="bg-gray-50 font-bold text-gray-800">
                <tr>
                  <td className="py-3 px-4 text-right" colSpan={4}>Total Folha de Pagamento:</td>
                  <td className="py-3 px-4 text-right">
                    {formatCurrency(salarios.reduce((acc, curr) => acc + (curr.salarioBase + curr.encargos - curr.descontos), 0))}
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
