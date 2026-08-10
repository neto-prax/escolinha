import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Lancamento, TipoLancamento, Categoria, Unidade, FormaPagamento, Orcamento, Caixa, Cartao } from '../../types/finance';
import { Calculator, X, DollarSign, CreditCard, Landmark, Banknote, QrCode, CheckCircle2, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface LancamentosTabProps {
  lancamentos: Lancamento[];
  orcamentos: Orcamento[];
  caixas: Caixa[];
  cartoes: Cartao[];
  categorias: string[];
  onAddLancamento: (lancamento: Omit<Lancamento, 'id'>) => void;
  onUpdateLancamento: (id: string, updates: Partial<Lancamento>) => void;
  onAddCategoria: (novaCategoria: string) => void;
  onFecharCaixa: (caixaId: string) => void;
  onImportLancamentos?: (novosLancamentos: Omit<Lancamento, 'id'>[]) => void;
}

export function LancamentosTab({ lancamentos, orcamentos, caixas, cartoes, categorias, onAddLancamento, onUpdateLancamento, onAddCategoria, onFecharCaixa, onImportLancamentos }: LancamentosTabProps) {
  const [tipo, setTipo] = useState<TipoLancamento>('Entrada');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState<number | ''>('');
  const [data, setData] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('Administrativo');
  const [unidade, setUnidade] = useState<Unidade>('Todas');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX');
  const [status, setStatus] = useState<'Pago' | 'Em Aberto'>('Pago');
  
  const [orcamentoId, setOrcamentoId] = useState<string>('');
  const [caixaId, setCaixaId] = useState<string>(caixas[0]?.id || '');
  const [cartaoId, setCartaoId] = useState<string>(cartoes[0]?.id || '');

  const [isFecharCaixaOpen, setIsFecharCaixaOpen] = useState(false);
  const [caixaFechamentoId, setCaixaFechamentoId] = useState<string>(caixas[0]?.id || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataToExport = lancamentos.map(l => ({
      Data: l.data.toLocaleDateString('pt-BR'),
      Tipo: l.tipo,
      Descricao: l.descricao,
      Valor: l.valor,
      Categoria: l.categoria,
      Unidade: l.unidade,
      'Forma de Pagamento': l.formaPagamento,
      Status: l.status
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lançamentos");
    XLSX.writeFile(workbook, "lancamentos.xlsx");
    toast.success("Planilha exportada com sucesso!");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        const novosLancamentos: Omit<Lancamento, 'id'>[] = data.map(row => {
          let parsedDate = new Date();
          if (row.Data) {
            const parts = String(row.Data).split('/');
            if (parts.length === 3) {
              parsedDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
            }
          }
          
          return {
            tipo: row.Tipo === 'Saída' ? 'Saída' : 'Entrada',
            descricao: row.Descricao || 'Importado',
            valor: Number(row.Valor) || 0,
            data: parsedDate,
            categoria: categorias.includes(row.Categoria) ? row.Categoria : categorias[0],
            unidade: row.Unidade === 'Senador' || row.Unidade === 'Papagaio' ? row.Unidade : 'Todas',
            formaPagamento: row['Forma de Pagamento'] || 'PIX',
            status: row.Status === 'Em Aberto' ? 'Em Aberto' : 'Pago',
            tipoCusto: 'Variável',
            caixaId: caixas[0]?.id,
          };
        });

        if (onImportLancamentos && novosLancamentos.length > 0) {
          onImportLancamentos(novosLancamentos);
          toast.success(`${novosLancamentos.length} lançamentos importados com sucesso!`);
        }
      } catch (error) {
        console.error(error);
        toast.error("Erro ao importar planilha. Verifique o formato.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

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
      status,
      caixaId: formaPagamento !== 'Cartão' ? caixaId : undefined,
      cartaoId: formaPagamento === 'Cartão' ? cartaoId : undefined,
      tipoCusto: 'Variável',
      orcamentoId: tipo === 'Saída' && orcamentoId ? orcamentoId : undefined,
    });

    setDescricao('');
    setValor('');
    setOrcamentoId('');
  };

  const handleQuitar = (id: string) => {
    onUpdateLancamento(id, { status: 'Pago', data: new Date() });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const resumoCaixa = useMemo(() => {
    // Lançamentos pagos, do caixa selecionado, que NÃO são de cartão, e que AINDA NÃO FORAM FECHADOS
    const lancamentosNaoFechados = lancamentos.filter(
      l => l.status === 'Pago' && 
           l.formaPagamento !== 'Cartão' &&
           l.caixaId === caixaFechamentoId &&
           !l.fechado
    );

    let entradas = 0;
    let saidas = 0;
    const porFormaPagamento: Record<string, number> = {
      'PIX': 0, 'Dinheiro': 0, 'Boleto': 0, 'Transferência Bancária': 0
    };

    lancamentosNaoFechados.forEach(l => {
      if (l.tipo === 'Entrada') {
        entradas += l.valor;
        if (porFormaPagamento[l.formaPagamento] !== undefined) {
          porFormaPagamento[l.formaPagamento] += l.valor;
        }
      } else {
        saidas += l.valor;
        if (porFormaPagamento[l.formaPagamento] !== undefined) {
          porFormaPagamento[l.formaPagamento] -= l.valor;
        }
      }
    });

    return { entradas, saidas, saldo: entradas - saidas, porFormaPagamento };
  }, [lancamentos, caixaFechamentoId]);

  const getFormaPagamentoIcon = (forma: FormaPagamento) => {
    switch (forma) {
      case 'PIX': return <QrCode size={14} className="mr-1" />;
      case 'Dinheiro': return <Banknote size={14} className="mr-1" />;
      case 'Cartão': return <CreditCard size={14} className="mr-1" />;
      case 'Transferência Bancária': return <Landmark size={14} className="mr-1" />;
      case 'Boleto': return <DollarSign size={14} className="mr-1" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 relative">
      
      <div className="flex justify-end gap-2">
        <input 
          type="file" 
          accept=".xlsx, .xls" 
          ref={fileInputRef} 
          onChange={handleImport} 
          className="hidden" 
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
        >
          <Upload size={18} />
          Importar
        </button>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
        >
          <Download size={18} />
          Exportar
        </button>
        <button 
          onClick={() => setIsFecharCaixaOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow transition-colors"
        >
          <Calculator size={18} />
          Fechar Caixa
        </button>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Novo Lançamento</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select 
              value={tipo} 
              onChange={(e) => setTipo(e.target.value as TipoLancamento)}
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
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
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            />
          </div>

          <div className="flex flex-col lg:col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <input 
              type="text" 
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Mensalidade, Folha A4..."
              required
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
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
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            />
          </div>

          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-gray-700">Categoria</label>
              <button 
                type="button" 
                onClick={() => {
                  const nova = prompt('Digite o nome da nova categoria:');
                  if (nova && nova.trim()) {
                    onAddCategoria(nova.trim());
                    setCategoria(nova.trim());
                  }
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                + Nova Categoria
              </button>
            </div>
            <select 
              value={categoria} 
              onChange={(e) => setCategoria(e.target.value)}
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Forma de Pgto.</label>
            <select 
              value={formaPagamento} 
              onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="PIX">PIX</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Cartão">Cartão</option>
              <option value="Boleto">Boleto</option>
              <option value="Transferência Bancária">Transferência Bancária</option>
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
              <label className="text-sm font-medium text-gray-700 mb-1">Qual Caixa?</label>
              <select 
                value={caixaId} 
                onChange={(e) => setCaixaId(e.target.value)}
                className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                {caixas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          )}

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

          {tipo === 'Saída' && (
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Orçamento (Opcional)</label>
              <select 
                value={orcamentoId} 
                onChange={(e) => setOrcamentoId(e.target.value)}
                className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
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
                <th className="py-3 px-4 text-left">Caixa/Cartão</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700 divide-y divide-gray-200">
              {lancamentos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-gray-500">Nenhum lançamento registrado.</td>
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
                    <td className="py-3 px-4 text-xs">{lanc.categoria}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="flex items-center text-xs text-gray-700 font-medium">
                          {getFormaPagamentoIcon(lanc.formaPagamento)}
                          {lanc.formaPagamento === 'Cartão' 
                            ? cartoes.find(c => c.id === lanc.cartaoId)?.nome || 'Cartão'
                            : caixas.find(c => c.id === lanc.caixaId)?.nome || 'Caixa'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        lanc.status === 'Pago' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {lanc.status}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${
                      lanc.tipo === 'Entrada' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {lanc.tipo === 'Entrada' ? '+' : '-'}{formatCurrency(lanc.valor)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {lanc.status === 'Em Aberto' && (
                        <button
                          onClick={() => handleQuitar(lanc.id)}
                          className="inline-flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium border border-green-200 transition-colors"
                          title="Marcar como pago (hoje)"
                        >
                          <CheckCircle2 size={14} /> Quitar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Fechar Caixa */}
      {isFecharCaixaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calculator className="text-indigo-600" />
                Fechamento de Caixa
              </h2>
              <button 
                onClick={() => setIsFecharCaixaOpen(false)}
                className="text-gray-400 hover:bg-gray-100 hover:text-gray-600 p-1 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              
              <div className="flex flex-col">
                <label className="text-sm font-bold text-gray-700 mb-2">Selecione o Caixa para Conferência:</label>
                <select 
                  value={caixaFechamentoId} 
                  onChange={(e) => setCaixaFechamentoId(e.target.value)}
                  className="p-2 border border-gray-300 rounded font-medium text-indigo-700 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                >
                  {caixas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <span className="text-sm font-medium text-green-800 mb-1 block">Entradas (Acumulado)</span>
                  <span className="text-2xl font-bold text-green-700">{formatCurrency(resumoCaixa.entradas)}</span>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                  <span className="text-sm font-medium text-red-800 mb-1 block">Saídas (Acumulado)</span>
                  <span className="text-2xl font-bold text-red-700">{formatCurrency(resumoCaixa.saidas)}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Saldo a Consolidar</span>
                  <span className={`text-xl font-bold ${resumoCaixa.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(resumoCaixa.saldo)}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">Valores Movimentados</h3>
                <ul className="space-y-2">
                  {Object.entries(resumoCaixa.porFormaPagamento).map(([forma, valor]) => (
                    <li key={forma} className="flex justify-between items-center text-sm">
                      <span className="flex items-center text-gray-600">
                        {getFormaPagamentoIcon(forma as FormaPagamento)} {forma}
                      </span>
                      <span className={`font-medium ${valor >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        {formatCurrency(valor)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="text-xs text-gray-500 text-center bg-blue-50 p-3 rounded text-blue-800">
                Despesas em <b>Cartão de Crédito</b> não aparecem aqui, pois não saem do saldo imediato do caixa.
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse border-t border-gray-100">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                onClick={() => {
                  onFecharCaixa(caixaFechamentoId);
                  setIsFecharCaixaOpen(false);
                }}
              >
                Concluir Conferência
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
