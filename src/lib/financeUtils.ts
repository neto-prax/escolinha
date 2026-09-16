import { Lancamento } from '@/types/finance';
import { Mensalidade, Aluno } from '@/types/aluno';

/**
 * Converte com segurança qualquer entrada monetária (número, texto com R$, vírgulas ou pontos)
 * em um número de ponto flutuante válido.
 * Exemplos: "R$ 650,00" -> 650; "1.250,50" -> 1250.50; "450" -> 450
 */
export function parseMonetaryValue(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  
  const str = String(val).trim();
  if (!str) return 0;

  // Remove caracteres não numéricos exceto vírgula, ponto e sinal de menos
  const cleaned = str.replace(/[^\d,.-]/g, '');
  
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Ex: 1.250,50 -> remove ponto e troca vírgula por ponto
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (cleaned.includes(',')) {
    // Ex: 650,00 -> troca vírgula por ponto
    return parseFloat(cleaned.replace(',', '.')) || 0;
  }
  return parseFloat(cleaned) || 0;
}

/**
 * Unifica os lançamentos manuais com todas as mensalidades escolares cadastradas/anexadas.
 * - Mensalidades com status 'Pago' entram como 'Entrada' com status 'Pago'.
 * - Mensalidades com status 'Pendente' ou 'Atrasado' entram como 'Entrada' com status 'Em Aberto' (Previsão a receber).
 * Garante que a categoria 'Mensalidades' e as turmas dos alunos constem em relatórios e dashboards.
 */
export function getIntegratedLancamentos(
  lancamentosRaw: any[] = [],
  mensalidades: Mensalidade[] = [],
  alunos: Aluno[] = []
): Lancamento[] {
  const baseLancamentos: Lancamento[] = (lancamentosRaw || []).map((l) => ({
    ...l,
    data: typeof l.data === 'string' ? new Date(l.data) : (l.data || new Date()),
  }));

  const existingIds = new Set<string>();
  baseLancamentos.forEach((l) => {
    if (l.id) existingIds.add(String(l.id));
  });

  const alunoMap = new Map<string, Aluno>();
  (alunos || []).forEach((a) => {
    if (a.id) alunoMap.set(String(a.id), a);
  });

  const integratedMensalidadesLancamentos: Lancamento[] = [];

  (mensalidades || []).forEach((m) => {
    const targetId = m.lancamentoId || `mensalidade-${m.id}`;
    if (!existingIds.has(String(targetId)) && !existingIds.has(String(m.id))) {
      const aluno = alunoMap.get(String(m.alunoId));
      let dataLancamento: Date;

      if (m.status === 'Pago' && m.dataPagamento) {
        dataLancamento = new Date(m.dataPagamento);
      } else if (m.dataVencimento) {
        dataLancamento = new Date(m.dataVencimento);
      } else {
        dataLancamento = new Date();
      }

      const valor = parseMonetaryValue(m.valorFinal);

      const turmasDoAluno = aluno?.classe ? [{
        setor: aluno.setor || 'Sem Setor',
        nome: aluno.classe,
        letras: [aluno.turma || 'A']
      }] : undefined;

      integratedMensalidadesLancamentos.push({
        id: targetId,
        data: dataLancamento,
        unidade: 'Senador',
        descricao: `Mensalidade ${m.mesReferencia || ''} - ${aluno?.nome || 'Aluno'}`,
        categoria: 'Mensalidades',
        tipoCusto: 'Fixo',
        valor: valor,
        formaPagamento: ((m as any).formaPagamento as any) || 'PIX',
        tipo: 'Entrada',
        status: m.status === 'Pago' ? 'Pago' : 'Em Aberto',
        alunoId: m.alunoId,
        turmas: turmasDoAluno,
        observacoes: `Aluno: ${aluno?.nome || ''} (Matrícula: ${aluno?.matricula || 'S/N'}) • Status Original: ${m.status}`,
      });

      existingIds.add(String(targetId));
    }
  });

  return [...baseLancamentos, ...integratedMensalidadesLancamentos];
}
