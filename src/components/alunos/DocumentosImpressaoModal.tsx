import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, FileText, Download } from 'lucide-react';
import { DocumentoEscolarTemplate } from '@/types/documentoEscolar';
import { Aluno } from '@/types/aluno';

interface DocumentosImpressaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentos: DocumentoEscolarTemplate[];
  aluno: Partial<Aluno>;
  dadosFinanceiros: {
    valorMensalidade: number;
    qtdParcelas: number;
    diaVencimento: string;
    valorContraturno?: number;
    anoLetivo?: string;
  };
  escolaNome?: string;
}

export const DocumentosImpressaoModal: React.FC<DocumentosImpressaoModalProps> = ({
  isOpen,
  onClose,
  documentos,
  aluno,
  dadosFinanceiros,
  escolaNome = 'Colégio Interagir Papagaio',
}) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dStr?: string) => {
    if (!dStr) return new Date().toLocaleDateString('pt-BR');
    try {
      const parts = dStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return new Date(dStr).toLocaleDateString('pt-BR');
    } catch {
      return dStr;
    }
  };

  // Interpolação das tags dinâmicas
  const interpolateContent = (htmlContent: string) => {
    const endereco = [
      aluno.rua ? `${aluno.rua}` : '',
      aluno.numero ? `nº ${aluno.numero}` : '',
      aluno.bairro ? `Bairro ${aluno.bairro}` : '',
      aluno.cidade ? `${aluno.cidade}` : '',
      aluno.uf ? `- ${aluno.uf}` : '',
      aluno.cep ? `CEP: ${aluno.cep}` : '',
    ]
      .filter(Boolean)
      .join(', ') || 'Endereço residencial cadastrado na ficha do aluno';

    const turmaRegular = `${aluno.classe || ''} ${aluno.turma || ''}`.trim() || 'Não enturmado';
    const turmaContraturno = aluno.temContraturno
      ? `${aluno.classeContraturno || 'Contraturno'} ${aluno.turmaContraturno || ''}`.trim()
      : 'Não matriculado em contraturno';

    const hoje = new Date();
    const meses = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    const cidadeData = `${aluno.cidade || 'Feira de Santana'}, ${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;

    const mapTags: Record<string, string> = {
      '{{nome_aluno}}': aluno.nome || 'Aluno Sem Nome',
      '{{matricula}}': aluno.matricula || 'Gerada no ato',
      '{{data_nascimento}}': formatDate(aluno.dataNascimento),
      '{{cpf_aluno}}': aluno.cpf || 'Não informado',
      '{{rg_aluno}}': aluno.rg || 'Não informado',
      '{{turma_regular}}': turmaRegular,
      '{{setor_regular}}': aluno.setor || 'Ensino Regular',
      '{{turma_contraturno}}': turmaContraturno,
      '{{nome_responsavel}}': aluno.nomeResponsavel || 'Responsável Legal',
      '{{cpf_responsavel}}': aluno.cpfResponsavel || 'Não informado',
      '{{rg_responsavel}}': aluno.rgResponsavel || 'Não informado',
      '{{contato_responsavel}}': aluno.contatoResponsavel || 'Não informado',
      '{{email_responsavel}}': aluno.emailResponsavel || 'Não informado',
      '{{endereco_completo}}': endereco,
      '{{valor_mensalidade}}': formatCurrency(dadosFinanceiros.valorMensalidade),
      '{{valor_extenso}}': `${formatCurrency(dadosFinanceiros.valorMensalidade)} mensais`,
      '{{qtd_parcelas}}': String(dadosFinanceiros.qtdParcelas || 11),
      '{{dia_vencimento}}': String(dadosFinanceiros.diaVencimento || 10),
      '{{valor_contraturno}}': formatCurrency(dadosFinanceiros.valorContraturno || 0),
      '{{data_matricula}}': formatDate(aluno.dataMatricula),
      '{{ano_letivo}}': dadosFinanceiros.anoLetivo || '2026',
      '{{escola_nome}}': escolaNome,
      '{{cidade_data}}': cidadeData,
    };

    let result = htmlContent;
    Object.entries(mapTags).forEach(([key, val]) => {
      // replace all occurrences of key
      result = result.split(key).join(val);
    });
    return result;
  };

  const handlePrintAll = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 print:m-0 print:p-0 print:max-w-none print:h-auto">
        <DialogHeader className="p-4 border-b bg-slate-50 flex flex-row items-center justify-between print:hidden">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            <span>Documentos Prontos para Impressão ({documentos.length} documento{documentos.length !== 1 ? 's' : ''})</span>
          </DialogTitle>
          <Button onClick={handlePrintAll} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
            <Printer className="h-4 w-4" />
            Imprimir Todos Juntos
          </Button>
        </DialogHeader>

        {/* ÁREA DE VISUALIZAÇÃO DOS DOCUMENTOS UNIFICADOS COM QUEBRA DE PÁGINA */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 print:p-0 print:bg-white print:overflow-visible">
          {documentos.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg border text-slate-400">
              Nenhum documento selecionado para impressão.
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-8 print:space-y-0 print:max-w-none">
              {documentos.map((doc, idx) => (
                <div
                  key={doc.id}
                  className={`bg-white p-10 rounded-lg shadow-sm border print:border-none print:shadow-none print:p-8 ${
                    idx < documentos.length - 1 ? 'print:break-after-page' : ''
                  }`}
                  style={{
                    pageBreakAfter: idx < documentos.length - 1 ? 'always' : 'auto',
                    breakAfter: idx < documentos.length - 1 ? 'page' : 'auto',
                  }}
                >
                  <div
                    className="font-serif leading-relaxed text-sm text-slate-900"
                    dangerouslySetInnerHTML={{ __html: interpolateContent(doc.conteudoHtml) }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-slate-50 flex justify-between items-center print:hidden">
          <Button variant="outline" onClick={onClose} size="sm">
            Fechar
          </Button>
          <Button onClick={handlePrintAll} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
            <Printer className="h-4 w-4" />
            Imprimir Todos Juntos em 1 Arquivo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
