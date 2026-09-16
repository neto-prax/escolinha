import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, CheckCircle2, DollarSign, X } from 'lucide-react';
import { Aluno } from '@/types/aluno';

export interface ItemPagamentoRecibo {
  descricao: string;
  detalhe?: string;
  valor: number;
  pago: boolean;
  formaPagamento: string;
}

interface ReciboMatriculaModalProps {
  isOpen: boolean;
  onClose: () => void;
  aluno: Partial<Aluno>;
  itens: ItemPagamentoRecibo[];
  escolaNome?: string;
  dataEmissao?: string;
}

export const ReciboMatriculaModal: React.FC<ReciboMatriculaModalProps> = ({
  isOpen,
  onClose,
  aluno,
  itens,
  escolaNome = 'Colégio Interagir',
  dataEmissao = new Date().toLocaleDateString('pt-BR'),
}) => {
  const itensPagos = itens.filter((i) => i.pago && i.valor > 0);
  const totalPago = itensPagos.reduce((acc, curr) => acc + curr.valor, 0);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b bg-slate-50 flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>Recibo de Matrícula & Pagamentos Iniciais</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 print:p-0 print:bg-white">
          <div className="bg-white p-8 rounded-lg shadow-sm border print:border-none print:shadow-none max-w-xl mx-auto font-sans text-slate-800 text-sm">
            {/* Header Recibo */}
            <div className="border-b-2 border-slate-800 pb-4 mb-4 text-center">
              <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900">{escolaNome}</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Comprovante de Pagamento & Quitação Inicial</p>
              <div className="mt-3 inline-block bg-slate-100 px-3 py-1 rounded text-xs font-semibold uppercase">
                Recibo Nº {Math.floor(100000 + Math.random() * 900000)} • Data: {dataEmissao}
              </div>
            </div>

            {/* Informações Principais */}
            <div className="grid grid-cols-2 gap-3 mb-5 text-xs bg-slate-50 p-3.5 rounded border border-slate-200">
              <div>
                <span className="text-slate-400 font-medium block">Aluno(a):</span>
                <span className="font-bold text-slate-800 text-sm">{aluno.nome || 'Não informado'}</span>
                <span className="block text-slate-500 mt-0.5">Matrícula: {aluno.matricula || 'Gerada no ato'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Responsável Financeiro:</span>
                <span className="font-bold text-slate-800 text-sm">{aluno.nomeResponsavel || 'Não informado'}</span>
                <span className="block text-slate-500 mt-0.5">CPF: {aluno.cpfResponsavel || 'Não informado'}</span>
              </div>
              <div className="col-span-2 pt-1 border-t border-slate-200 flex justify-between">
                <span>
                  <strong>Turma Regular:</strong> {aluno.classe || ''} {aluno.turma || ''} ({aluno.setor || 'Sem Setor'})
                </span>
                {aluno.temContraturno && (
                  <span className="text-blue-700 font-semibold">
                    <strong>Contraturno:</strong> {aluno.classeContraturno || 'Integral'}
                  </span>
                )}
              </div>
            </div>

            {/* Tabela de Itens */}
            <table className="w-full text-left text-xs mb-6 border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 text-slate-600">
                  <th className="py-2 font-bold">Item / Descrição</th>
                  <th className="py-2 font-bold text-center">Forma Pagto.</th>
                  <th className="py-2 font-bold text-right">Valor Quitado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itensPagos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-slate-400 italic">
                      Nenhum item marcado como pago no ato da matrícula.
                    </td>
                  </tr>
                ) : (
                  itensPagos.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5">
                        <span className="font-bold text-slate-800">{item.descricao}</span>
                        {item.detalhe && <span className="block text-slate-400 text-[11px]">{item.detalhe}</span>}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-600">
                          {item.formaPagamento}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-bold text-emerald-700">{formatCurrency(item.valor)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-800 font-bold text-sm bg-slate-50">
                  <td colSpan={2} className="py-2.5 pl-2 uppercase">
                    Total Quitado Recebido:
                  </td>
                  <td className="py-2.5 text-right pr-2 text-emerald-700 text-base">{formatCurrency(totalPago)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Declaração e Assinaturas */}
            <p className="text-[11px] text-slate-500 text-justify mb-8 leading-relaxed">
              Recebemos do(a) responsável acima nominado(a) o valor total discriminado neste recibo referente à matrícula
              e itens contratados para o ano letivo. A presente quitação é válida mediante a compensação dos pagamentos
              efetuados.
            </p>

            <div className="grid grid-cols-2 gap-8 pt-4">
              <div className="text-center border-t border-slate-400 pt-2">
                <p className="text-xs font-bold text-slate-800">{escolaNome}</p>
                <p className="text-[10px] text-slate-400">Secretaria Escolar / Tesouraria</p>
              </div>
              <div className="text-center border-t border-slate-400 pt-2">
                <p className="text-xs font-bold text-slate-800">{aluno.nomeResponsavel || 'Responsável'}</p>
                <p className="text-[10px] text-slate-400">Assinatura do Pagador</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-slate-50 flex justify-between items-center print:hidden">
          <Button variant="outline" onClick={onClose} size="sm">
            Fechar
          </Button>
          <Button onClick={handlePrint} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Printer className="h-4 w-4" />
            Imprimir Recibo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
