import { Aluno, Mensalidade, HistoricoFinanceiroItem } from '@/types/aluno';
import { Lancamento } from '@/types/finance';

/**
 * Remove acentos, pontuações e converte para minúsculas para buscas fonéticas e flexíveis.
 */
export function normalizeText(text?: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Mapeamento de nomes de meses em português para dois dígitos (01 a 12).
 */
const MONTH_NAMES_MAP: Record<string, string> = {
  janeiro: '01',
  jan: '01',
  fevereiro: '02',
  fev: '02',
  marco: '03',
  mar: '03',
  abril: '04',
  abr: '04',
  maio: '05',
  mai: '05',
  junho: '06',
  jun: '06',
  julho: '07',
  jul: '07',
  agosto: '08',
  ago: '08',
  setembro: '09',
  set: '09',
  outubro: '10',
  out: '10',
  novembro: '11',
  nov: '11',
  dezembro: '12',
  dez: '12',
};

/**
 * Extrai o mês de referência (formato YYYY-MM) a partir da descrição ou data do lançamento.
 */
export function extractMesReferencia(descricao?: string, fallbackDate?: Date | string): string {
  const defaultYear = fallbackDate
    ? new Date(fallbackDate).getFullYear()
    : new Date().getFullYear();
  const defaultMonth = fallbackDate
    ? String(new Date(fallbackDate).getMonth() + 1).padStart(2, '0')
    : String(new Date().getMonth() + 1).padStart(2, '0');
  const defaultMesRef = `${defaultYear}-${defaultMonth}`;

  if (!descricao) return defaultMesRef;

  const rawClean = descricao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Procura formato YYYY-MM ou YYYY/MM (ex: 2024-03, 2026/10)
  const isoMatch = rawClean.match(/\b(20\d{2})\s*[-/.]\s*(0[1-9]|1[0-2])\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}`;
  }

  // 2. Procura formato MM/YYYY ou MM-YYYY (ex: 03/2024, 10/2026, 03-2024, 3/2024)
  const brMatch = rawClean.match(/\b(0?[1-9]|1[0-2])\s*[-/.]\s*(20\d{2})\b/);
  if (brMatch) {
    return `${brMatch[2]}-${brMatch[1].padStart(2, '0')}`;
  }

  // 3. Procura formato MM/YY ou MM-YY (ex: 03/24, 08/26)
  const shortBrMatch = rawClean.match(/\b(0?[1-9]|1[0-2])\s*[-/.]\s*(\d{2})\b/);
  if (shortBrMatch) {
    return `20${shortBrMatch[2]}-${shortBrMatch[1].padStart(2, '0')}`;
  }

  // 4. Procura nome do mês por extenso ou abreviação com ano opcional (ex: "março 2024", "novembro de 2025", "abril")
  const sortedMonthEntries = Object.entries(MONTH_NAMES_MAP).sort((a, b) => b[0].length - a[0].length);

  for (const [monthName, monthNum] of sortedMonthEntries) {
    const regex = new RegExp(`\\b${monthName}\\b(?:\\s+(?:de\\s+)?(20\\d{2}|\\d{2}))?`, 'i');
    const match = rawClean.match(regex);
    if (match) {
      if (match[1]) {
        const year = match[1].length === 2 ? `20${match[1]}` : match[1];
        return `${year}-${monthNum}`;
      }
      return `${defaultYear}-${monthNum}`;
    }
  }

  return defaultMesRef;
}

export function isMensalidadeLancamento(lancamento: { categoria?: string; descricao?: string }): boolean {
  const cat = normalizeText(lancamento.categoria);
  if (cat === 'mensalidades' || cat === 'mensalidade') return true;

  const desc = normalizeText(lancamento.descricao);
  if (!desc) return false;

  // Palavra explícita "mensalidade" ou "mensalidades"
  const regexMensalidade = /\b(mensalidade|mensalidades)\b/i;
  if (regexMensalidade.test(desc)) return true;

  // "mensal" seguido de número ou referência de data/mês (ex: "mensal 04 2024", "mensal 04/2024")
  const regexMensalRef = /\bmensal(\s+\d+|\s+de)?\s*(0?[1-9]|1[0-2]|20\d{2}|janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/i;
  if (regexMensalRef.test(desc)) return true;

  // "mensal" em contexto financeiro/geral sem palavras excludentes
  if (/\bmensal\b/i.test(desc) && !/\b(plano|uniforme|material|lanche|apostila|agenda)\b/i.test(desc)) {
    return true;
  }

  return false;
}

/**
 * Localiza o aluno correspondente ao lançamento com base no alunoId,
 * nome do aluno na descrição, matrícula ou dados complementares.
 */
export function findMatchingAluno(
  lancamento: { alunoId?: string; descricao?: string; observacoes?: string; alunoNome?: string },
  alunos: Aluno[]
): Aluno | null {
  if (!alunos || alunos.length === 0) return null;

  // 1. Busca direta por ID se já informado
  if (lancamento.alunoId) {
    const foundById = alunos.find((a) => a.id === lancamento.alunoId);
    if (foundById) return foundById;
  }

  const rawSearchText = `${lancamento.alunoNome || ''} ${lancamento.descricao || ''} ${lancamento.observacoes || ''}`;
  const fullText = normalizeText(rawSearchText);
  if (!fullText) return null;

  // 2. Busca por matrícula (quando contém pelo menos 3 caracteres numéricos ou letras)
  for (const aluno of alunos) {
    if (aluno.matricula && aluno.matricula.trim().length >= 3) {
      const normMat = normalizeText(aluno.matricula);
      const matRegex = new RegExp(`(^|\\s|mat(ricula)?[\\s:#-]*)` + normMat + `(\\s|$)`, 'i');
      if (matRegex.test(fullText)) {
        return aluno;
      }
    }
  }

  // 3. Busca por nome do aluno (ordena pelo nome mais longo para evitar que nomes curtos capturem partes de nomes longos)
  const sortedAlunos = [...alunos].sort((a, b) => (b.nome || '').length - (a.nome || '').length);

  // 3a. Match exato do nome completo na descrição
  for (const aluno of sortedAlunos) {
    if (!aluno.nome) continue;
    const normNome = normalizeText(aluno.nome);
    if (normNome.length < 3) continue;

    if (fullText.includes(normNome)) {
      return aluno;
    }
  }

  // 3b. Match de pares significativos de palavras do nome
  // Ex: "Julia Fernandes" bate com "Julia Fernandes Santos"
  // Ex: "Enzo Gabriel" bate com "Enzo Gabriel Pereira da Silva"
  const stopWords = new Set(['dos', 'das', 'de', 'da', 'do', 'e']);
  const matchedCandidates: Aluno[] = [];

  for (const aluno of sortedAlunos) {
    if (!aluno.nome) continue;
    const normNome = normalizeText(aluno.nome);
    const words = normNome.split(' ').filter((w) => w.length >= 3 && !stopWords.has(w));
    if (words.length < 2) continue;

    // Gera pares de palavras (primeiro + segundo, primeiro + último, etc.)
    const pairs: [string, string][] = [
      [words[0], words[1]],
      [words[0], words[words.length - 1]],
    ];
    if (words.length > 2) {
      pairs.push([words[1], words[words.length - 1]]);
    }

    const matchesAnyPair = pairs.some(([w1, w2]) => fullText.includes(w1) && fullText.includes(w2));
    if (matchesAnyPair) {
      matchedCandidates.push(aluno);
    }
  }

  if (matchedCandidates.length === 1) {
    return matchedCandidates[0];
  }
  if (matchedCandidates.length > 1) {
    // Escolhe o candidato que tem o maior número de palavras contidas no texto
    let bestCandidate = matchedCandidates[0];
    let maxMatchedWords = 0;
    for (const cand of matchedCandidates) {
      const words = normalizeText(cand.nome).split(' ').filter((w) => w.length >= 3 && !stopWords.has(w));
      const count = words.filter((w) => fullText.includes(w)).length;
      if (count > maxMatchedWords) {
        maxMatchedWords = count;
        bestCandidate = cand;
      }
    }
    return bestCandidate;
  }

  // 4. Se não achou pelo aluno, tenta pelo nome do responsável (se único na base)
  for (const aluno of sortedAlunos) {
    if (!aluno.nomeResponsavel) continue;
    const normResp = normalizeText(aluno.nomeResponsavel);
    if (normResp.length < 5) continue;

    if (fullText.includes(normResp)) {
      const matchesWithSameResp = alunos.filter(
        (a) => normalizeText(a.nomeResponsavel) === normResp
      );
      if (matchesWithSameResp.length === 1) {
        return aluno;
      }
    }
  }

  return null;
}

export type ReconcileAction = 'mensalidade_baixada' | 'historico_adicionado' | 'none';

export interface ReconcileResult {
  updatedLancamento: Lancamento;
  updatedAlunos: Aluno[];
  updatedMensalidades: Mensalidade[];
  matchedAluno?: Aluno;
  action: ReconcileAction;
  details?: string;
}

/**
 * Reconcilia um único lançamento com a lista de alunos e mensalidades:
 * - Se for entrada e tiver nome de aluno:
 *   - Se for mensalidade E o aluno tiver a fatura pendente cadastrada: dá baixa na mensalidade (marca como 'Pago').
 *   - Se for outra coisa OU se o aluno NÃO tiver a fatura pendente cadastrada: adiciona ao histórico financeiro do aluno.
 *   - NUNCA cria mensalidades novas para alunos que não possuem faturas geradas.
 */
export function reconcileSingleLancamento(
  lancamento: Lancamento,
  alunos: Aluno[],
  mensalidades: Mensalidade[]
): ReconcileResult {
  // Apenas lançamentos do tipo 'Entrada' são alocados aos alunos como pagamentos/receitas
  if (lancamento.tipo !== 'Entrada') {
    return {
      updatedLancamento: lancamento,
      updatedAlunos: alunos,
      updatedMensalidades: mensalidades,
      action: 'none',
      details: 'Lançamento não é do tipo Entrada',
    };
  }

  // Ignora lançamentos sintéticos gerados automaticamente a partir de mensalidades
  if (lancamento.id && String(lancamento.id).startsWith('mensalidade-')) {
    return {
      updatedLancamento: lancamento,
      updatedAlunos: alunos,
      updatedMensalidades: mensalidades,
      action: 'none',
      details: 'Lançamento sintético de mensalidade ignorado',
    };
  }

  const matchedAluno = findMatchingAluno(lancamento, alunos);
  if (!matchedAluno) {
    return {
      updatedLancamento: lancamento,
      updatedAlunos: alunos,
      updatedMensalidades: mensalidades,
      action: 'none',
      details: 'Nenhum aluno identificado na entrada',
    };
  }

  const lancDate = lancamento.data instanceof Date
    ? lancamento.data
    : new Date(lancamento.data || Date.now());
  const lancDateIso = isNaN(lancDate.getTime()) ? new Date().toISOString() : lancDate.toISOString();
  const mesRef = extractMesReferencia(lancamento.descricao, lancDate);

  // Garante que o lançamento tenha o alunoId e turmas atribuídos
  const updatedLancamento: Lancamento = {
    ...lancamento,
    alunoId: matchedAluno.id,
    turmas: lancamento.turmas || (matchedAluno.classe ? [{
      setor: matchedAluno.setor || 'Sem Setor',
      nome: matchedAluno.classe,
      letras: [matchedAluno.turma || 'A'],
    }] : undefined),
  };

  const isMensalidade = isMensalidadeLancamento(lancamento);

  // Busca faturas pendentes ou em atraso cadastradas para este aluno
  const alunoPendentes = mensalidades.filter(
    (m) => m.alunoId === matchedAluno.id && m.status !== 'Pago'
  );

  let targetIdx = -1;

  if (isMensalidade && alunoPendentes.length > 0) {
    // 1. Tenta encontrar a mensalidade pendente ou atrasada do mês exato de referência
    targetIdx = mensalidades.findIndex(
      (m) => m.alunoId === matchedAluno.id && m.status !== 'Pago' && m.mesReferencia === mesRef
    );

    // 2. Se não achou pelo mês exato, mas há uma fatura pendente com valor compatível
    if (targetIdx === -1) {
      const compat = alunoPendentes.find(
        (m) => Math.abs(Number(m.valorFinal) - Number(lancamento.valor)) < 2
      );
      if (compat) {
        targetIdx = mensalidades.findIndex((m) => m.id === compat.id);
      }
    }
  }

  if (targetIdx >= 0) {
    // =========================================================================
    // CASO 1: É MENSALIDADE E O ALUNO REALMENTE TEM A FATURA PENDENTE CADASTRADA
    // -> "DEEM BAIXA"
    // =========================================================================
    const novasMensalidades = [...mensalidades];
    novasMensalidades[targetIdx] = {
      ...novasMensalidades[targetIdx],
      status: 'Pago',
      dataPagamento: lancDateIso,
      lancamentoId: lancamento.id,
    };

    updatedLancamento.categoria = 'Mensalidades';
    updatedLancamento.status = 'Pago';

    return {
      updatedLancamento,
      updatedAlunos: alunos,
      updatedMensalidades: novasMensalidades,
      matchedAluno,
      action: 'mensalidade_baixada',
      details: `Mensalidade ${novasMensalidades[targetIdx].mesReferencia} do aluno ${matchedAluno.nome} baixada com sucesso!`,
    };
  } else {
    // =========================================================================
    // CASO 2: OUTRA COISA OU O ALUNO NÃO TEM MENSALIDADE PENDENTE CADASTRADA
    // -> "se for outra coisa, adicione ao histórico financeiro do aluno"
    // IMPORTANTE: NUNCA CRIA MENSALIDADE PARA ALUNOS QUE NÃO A POSSUEM!
    // =========================================================================
    const historyId = `lanc-${lancamento.id}`;
    const jaRegistradoNoHistorico = (matchedAluno.historicoFinanceiro || []).some(
      (h) => h.lancamentoId === lancamento.id || h.id === historyId
    );

    let updatedAlunos = [...alunos];

    if (!jaRegistradoNoHistorico) {
      const novoHistoricoItem: HistoricoFinanceiroItem = {
        id: historyId,
        data: lancDateIso,
        tipo: 'lancamento',
        categoria: lancamento.categoria || 'Geral',
        descricao: lancamento.descricao,
        valor: Number(lancamento.valor) || 0,
        formaPagamento: lancamento.formaPagamento || 'PIX',
        lancamentoId: lancamento.id,
        colaboradorNome: 'Financeiro',
        responsavelNome: matchedAluno.nomeResponsavel || matchedAluno.nome,
        responsavelContato: matchedAluno.contatoResponsavel,
        statusResultado: 'pago',
        mesReferencia: mesRef,
        observacoes: `Entrada alocada no Financeiro • Categoria: ${lancamento.categoria || 'Geral'}${
          lancamento.reciboNumero ? ` • Recibo: ${lancamento.reciboNumero}` : ''
        }`,
      };

      updatedAlunos = alunos.map((a) => {
        if (a.id === matchedAluno.id) {
          const prevHist = a.historicoFinanceiro || [];
          return {
            ...a,
            historicoFinanceiro: [novoHistoricoItem, ...prevHist],
          };
        }
        return a;
      });
    }

    return {
      updatedLancamento,
      updatedAlunos,
      updatedMensalidades: mensalidades,
      matchedAluno,
      action: 'historico_adicionado',
      details: `Lançamento "${lancamento.descricao}" alocado ao histórico financeiro de ${matchedAluno.nome}!`,
    };
  }
}

/**
 * Remove mensalidades órfãs (alunos que não existem mais) ou criadas indevidamente para alunos
 * que não possuem contrato de mensalidades escolares, garantindo que essas entradas fiquem
 * apenas no histórico financeiro do aluno.
 */
export function cleanSpuriousMensalidades(
  mensalidades: Mensalidade[],
  alunos: Aluno[],
  lancamentos?: Lancamento[]
): { cleanedMensalidades: Mensalidade[]; updatedAlunos: Aluno[]; removedCount: number } {
  const alunoMap = new Map<string, Aluno>();
  alunos.forEach((a) => alunoMap.set(a.id, a));

  const lancamentoMap = new Map<string, Lancamento>();
  if (lancamentos && lancamentos.length > 0) {
    lancamentos.forEach((l) => {
      if (l.id) lancamentoMap.set(String(l.id), l);
    });
  }

  let removedCount = 0;
  let updatedAlunos = [...alunos];
  const seenAlunoMes = new Set<string>();

  // Prioriza mensalidades sem lancamentoId (geradas no contrato da turma) sobre as geradas artificialmente
  const sortedMensalidades = [...mensalidades].sort((a, b) => {
    if (a.lancamentoId && !b.lancamentoId) return 1;
    if (!a.lancamentoId && b.lancamentoId) return -1;
    return (a.mesReferencia || '').localeCompare(b.mesReferencia || '');
  });

  const cleanedMensalidades: Mensalidade[] = [];

  for (const m of sortedMensalidades) {
    const aluno = alunoMap.get(m.alunoId);
    // 1. Remove mensalidades de alunos que não existem no cadastro da escola
    if (!aluno) {
      removedCount++;
      continue;
    }

    // 2. Aluno sem mensalidades escolares contratadas (ex: bolsista 100% ou sem valor de mensalidade)
    const temValorCadastrado = aluno.valorBase !== undefined && aluno.valorBase !== '';
    const valorBase = parseFloat(aluno.valorBase || '0');
    const semContrato = temValorCadastrado && valorBase <= 0 && (!aluno.parcelasContratadas || aluno.parcelasContratadas === 0);

    // 3. Verifica se a origem foi um lançamento não-mensalidade (ex: uniforme, material, lanche)
    const linkedLancamento = m.lancamentoId ? lancamentoMap.get(String(m.lancamentoId)) : undefined;
    const isOrigemNaoMensalidade = linkedLancamento ? !isMensalidadeLancamento(linkedLancamento) : false;

    // 4. Detecção de duplicata (segunda mensalidade para o mesmo mês do mesmo aluno gerada artificialmente)
    const alunoMesKey = `${m.alunoId}:${m.mesReferencia}`;
    const isDuplicateMonth = seenAlunoMes.has(alunoMesKey);

    // Se a mensalidade possui lancamentoId (gerada via conciliação) e é indevida
    if (m.lancamentoId && (semContrato || isOrigemNaoMensalidade || isDuplicateMonth)) {
      removedCount++;
      // Transfere o lançamento para o histórico financeiro do aluno se ainda não estiver lá
      updatedAlunos = updatedAlunos.map((a) => {
        if (a.id === aluno.id) {
          const hist = a.historicoFinanceiro || [];
          const jaExiste = hist.some((h) => h.lancamentoId === m.lancamentoId);
          if (!jaExiste) {
            const item: HistoricoFinanceiroItem = {
              id: `lanc-${m.lancamentoId}`,
              data: m.dataPagamento || (linkedLancamento?.data ? new Date(linkedLancamento.data).toISOString() : new Date().toISOString()),
              tipo: 'lancamento',
              categoria: linkedLancamento?.categoria || 'Geral',
              descricao: linkedLancamento?.descricao || `Entrada / Pagamento Ref ${m.mesReferencia}`,
              valor: linkedLancamento?.valor ? Number(linkedLancamento.valor) : m.valorFinal,
              formaPagamento: linkedLancamento?.formaPagamento || 'PIX',
              lancamentoId: m.lancamentoId,
              statusResultado: 'pago',
              responsavelNome: aluno.nomeResponsavel || aluno.nome,
              responsavelContato: aluno.contatoResponsavel,
              mesReferencia: m.mesReferencia,
            };
            return { ...a, historicoFinanceiro: [item, ...hist] };
          }
        }
        return a;
      });
      continue;
    }

    seenAlunoMes.add(alunoMesKey);
    cleanedMensalidades.push(m);
  }

  return { cleanedMensalidades, updatedAlunos, removedCount };
}

export interface BatchReconcileSummary {
  totalProcessed: number;
  matchedAlunosCount: number;
  mensalidadesBaixadasCount: number;
  historicoAdicionadoCount: number;
  spuriousRemovedCount: number;
}

export interface BatchReconcileResult {
  updatedLancamentos: Lancamento[];
  updatedAlunos: Aluno[];
  updatedMensalidades: Mensalidade[];
  summary: BatchReconcileSummary;
}

/**
 * Executa a reconciliação em lote sobre uma lista de lançamentos reais (ex: importação ou sincronização).
 */
export function reconcileAllLancamentosWithAlunos(
  lancamentos: Lancamento[],
  alunos: Aluno[],
  mensalidades: Mensalidade[]
): BatchReconcileResult {
  // Limpa mensalidades órfãs ou de alunos sem mensalidade
  const cleanup = cleanSpuriousMensalidades(mensalidades, alunos, lancamentos);
  let curAlunos = cleanup.updatedAlunos;
  let curMensalidades = cleanup.cleanedMensalidades;
  const updatedLancamentos: Lancamento[] = [];

  let matchedAlunosCount = 0;
  let mensalidadesBaixadasCount = 0;
  let historicoAdicionadoCount = 0;

  for (const lancamento of lancamentos) {
    // Ignora lançamentos sintéticos gerados automaticamente a partir de mensalidades
    if (lancamento.id && String(lancamento.id).startsWith('mensalidade-')) {
      continue;
    }

    if (lancamento.tipo === 'Entrada') {
      const result = reconcileSingleLancamento(lancamento, curAlunos, curMensalidades);
      updatedLancamentos.push(result.updatedLancamento);
      curAlunos = result.updatedAlunos;
      curMensalidades = result.updatedMensalidades;

      if (result.action === 'mensalidade_baixada') {
        matchedAlunosCount++;
        mensalidadesBaixadasCount++;
      } else if (result.action === 'historico_adicionado') {
        matchedAlunosCount++;
        historicoAdicionadoCount++;
      }
    } else {
      updatedLancamentos.push(lancamento);
    }
  }

  return {
    updatedLancamentos,
    updatedAlunos: curAlunos,
    updatedMensalidades: curMensalidades,
    summary: {
      totalProcessed: lancamentos.length,
      matchedAlunosCount,
      mensalidadesBaixadasCount,
      historicoAdicionadoCount,
      spuriousRemovedCount: cleanup.removedCount,
    },
  };
}
