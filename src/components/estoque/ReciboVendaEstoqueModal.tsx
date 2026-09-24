import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, CheckCircle2, PackageCheck } from 'lucide-react';
import { ItemVendaEstoque } from '@/types/estoque';

interface ReciboVendaEstoqueModalProps {
  isOpen: boolean;
  onClose: () => void;
  numeroRecibo: string;
  dataEmissao?: string;
  compradorNome: string;
  compradorDocumento?: string;
  alunoNome?: string;
  turmaAluno?: string;
  itens: ItemVendaEstoque[];
  valorTotal: number;
  formaPagamento: string;
  vendedorNome?: string;
  observacoes?: string;
  escolaNome?: string;
}

export const ReciboVendaEstoqueModal: React.FC<ReciboVendaEstoqueModalProps> = ({
  isOpen,
  onClose,
  numeroRecibo,
  dataEmissao = new Date().toLocaleString('pt-BR'),
  compradorNome,
  compradorDocumento,
  alunoNome,
  turmaAluno,
  itens,
  valorTotal,
  formaPagamento,
  vendedorNome = 'Secretaria / Tesouraria',
  observacoes,
  escolaNome = 'Purple Edu - Colégio Internacional',
}) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-slate-50 flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-emerald-600" />
            <span>Recibo de Venda de Uniforme & Materiais</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 print:p-0 print:bg-white">
          <div className="bg-white p-8 rounded-lg shadow-sm border print:border-none print:shadow-none max-w-xl mx-auto font-sans text-slate-800 text-sm">
            {/* Header Institucional */}
            <div className="border-b-2 border-slate-900 pb-4 mb-5 text-center flex flex-col items-center">
              <img src="/logo.png" alt="Purple Edu" className="h-8 mb-2 object-contain" />
              <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900">{escolaNome}</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Comprovante de Venda & Retirada de Estoque
              </p>
              <div className="mt-3 inline-block bg-slate-100 px-3 py-1 rounded text-xs font-semibold uppercase text-slate-700">
                Recibo Nº {numeroRecibo} • Emissão: {dataEmissao}
              </div>
            </div>

            {/* Informações do Comprador / Aluno */}
            <div className="grid grid-cols-2 gap-3 mb-5 text-xs bg-slate-50 p-3.5 rounded border border-slate-200">
              <div>
                <span className="text-slate-400 font-medium block">Comprador / Responsável:</span>
                <span className="font-bold text-slate-800 text-sm">{compradorNome || 'Consumidor Final'}</span>
                {compradorDocumento && (
                  <span className="block text-slate-500 mt-0.5">CPF: {compradorDocumento}</span>
                )}
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Aluno / Beneficiário:</span>
                <span className="font-bold text-slate-800 text-sm">{alunoNome || compradorNome || 'Uso Pessoal'}</span>
                {turmaAluno && (
                  <span className="block text-slate-500 mt-0.5">Turma: {turmaAluno}</span>
                )}
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-200 flex justify-between text-slate-600">
                <span>
                  <strong>Forma de Pagamento:</strong> {formaPagamento}
                </span>
                <span>
                  <strong>Atendido por:</strong> {vendedorNome}
                </span>
              </div>
            </div>

            {/* Itens Comprados */}
            <div className="mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Itens Adquiridos
              </h3>
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-2.5">Descrição do Produto</th>
                      <th className="p-2.5 text-center">Tamanho / Variação</th>
                      <th className="p-2.5 text-center">Qtd</th>
                      <th className="p-2.5 text-right">Unitário</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itens.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-medium text-slate-900">{item.produtoNome}</td>
                        <td className="p-2.5 text-center text-slate-600 font-medium">
                          {item.variacaoNome ? (
                            <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-[11px] font-semibold text-slate-800">
                              {item.variacaoNome}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-800">{item.quantidade}</td>
                        <td className="p-2.5 text-right text-slate-600">{formatCurrency(item.precoUnitario)}</td>
                        <td className="p-2.5 text-right font-semibold text-slate-900">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totalizador */}
            <div className="flex justify-end mb-6">
              <div className="w-64 bg-slate-50 p-3 rounded border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between font-bold text-base text-slate-900 pt-1 border-t border-slate-300">
                  <span>Valor Total Pago:</span>
                  <span className="text-emerald-700">{formatCurrency(valorTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Status:</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Quitado / Pago
                  </span>
                </div>
              </div>
            </div>

            {observacoes && (
              <div className="mb-6 p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                <strong>Observações:</strong> {observacoes}
              </div>
            )}

            {/* Termo de Retirada e Assinaturas */}
            <div className="mt-8 pt-4 border-t border-slate-200">
              <p className="text-[11px] text-slate-500 text-center mb-8">
                Declaro ter recebido os itens acima discriminados em perfeitas condições de uso e conferência.
              </p>
              <div className="grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 pt-1.5 font-medium text-slate-700">
                    {escolaNome}
                  </div>
                  <span className="text-[10px] text-slate-400">Responsável pela Entrega</span>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1.5 font-medium text-slate-700">
                    {compradorNome || 'Comprador'}
                  </div>
                  <span className="text-[10px] text-slate-400">Assinatura do Recebedor</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-slate-50 flex items-center justify-between">
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={handlePrint} className="gap-2 bg-primary hover:bg-primary/90">
            <Printer className="h-4 w-4" />
            Imprimir Recibo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
