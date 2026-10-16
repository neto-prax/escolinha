/**
 * Utilitários para Cálculos Acadêmicos e Médias
 * Suporta média aritmética simples, ponderada e somatória de avaliações,
 * com arredondamento preciso para 1 casa decimal e classificação de situação do aluno.
 */

export type TipoCalculoMedia = 'aritmetica' | 'ponderada' | 'somatoria';

export interface ConfiguracaoMediaOptions {
  tipoCalculo?: TipoCalculoMedia;
  pesosAvaliacoes?: {
    prova?: number;
    trabalho?: number;
  };
}

export interface ConfiguracaoStatusOptions {
  notaAprovacaoDireta?: number;
  notaMinimaExame?: number;
}

export type SituacaoAcademica = 'aprovado' | 'recuperacao' | 'reprovado';

function round1Dec(val: number): number {
  return Math.round((val + Number.EPSILON) * 10) / 10;
}

/**
 * Calcula a média de notas de acordo com a regra acadêmica configurada
 * @param n1 Nota da avaliação 1
 * @param n2 Nota da avaliação 2
 * @param config Configuração de cálculo (tipo e pesos)
 * @returns Média calculada arredondada em 1 casa decimal
 */
export function calculateMedia(
  n1: number,
  n2: number,
  config?: ConfiguracaoMediaOptions
): number {
  const num1 = Number(n1) || 0;
  const num2 = Number(n2) || 0;
  const tipo = config?.tipoCalculo || 'aritmetica';

  if (tipo === 'ponderada') {
    const pesoN1 = config?.pesosAvaliacoes?.prova ?? 6;
    const pesoN2 = config?.pesosAvaliacoes?.trabalho ?? 4;
    const pesoTotal = pesoN1 + pesoN2;
    if (pesoTotal === 0) return 0;
    const soma = num1 * pesoN1 + num2 * pesoN2;
    return round1Dec(soma / pesoTotal);
  }

  if (tipo === 'somatoria') {
    return round1Dec(num1 + num2);
  }

  // Aritmética padrão (n1 + n2) / 2
  return round1Dec((num1 + num2) / 2);
}

/**
 * Determina a situação acadêmica do aluno com base na nota/média obtida
 * @param media Nota ou média final do aluno
 * @param config Limites de aprovação e exame
 * @returns 'aprovado' | 'recuperacao' | 'reprovado'
 */
export function getAcademicStatus(
  media: number,
  config?: ConfiguracaoStatusOptions
): SituacaoAcademica {
  const notaAprovacao = config?.notaAprovacaoDireta ?? 7.0;
  const notaExameMin = config?.notaMinimaExame ?? 4.0;
  const val = Number(media) || 0;

  if (val >= notaAprovacao) {
    return 'aprovado';
  }
  if (val >= notaExameMin) {
    return 'recuperacao';
  }
  return 'reprovado';
}

/**
 * Retorna o rótulo amigável em português para a situação acadêmica
 */
export function getAcademicStatusLabel(status: SituacaoAcademica): string {
  switch (status) {
    case 'aprovado':
      return 'Aprovado Direto';
    case 'recuperacao':
      return 'Recuperação / Exame';
    case 'reprovado':
      return 'Reprovado';
  }
}
