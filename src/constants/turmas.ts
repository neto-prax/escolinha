import { TurmaConfig } from '@/types/finance';
import { Aluno } from '@/types/aluno';
import { TurmaPedagogica } from '@/types/pedagogico';

export const DEFAULT_TURMAS_CONFIG: TurmaConfig[] = [
  // Educação Infantil (Berçário ao Grupo 5 / Jardim 2)
  { setor: 'Educação Infantil', nome: 'Berçário', letras: ['A'], valorPadrao: 650 },
  { setor: 'Educação Infantil', nome: 'Maternal', letras: ['A'], valorPadrao: 650 },
  { setor: 'Educação Infantil', nome: 'Grupo 2', letras: ['A'], valorPadrao: 650 },
  { setor: 'Educação Infantil', nome: 'Grupo 3', letras: ['A'], valorPadrao: 650 },
  { setor: 'Educação Infantil', nome: 'Grupo 4', letras: ['A'], valorPadrao: 650 },
  { setor: 'Educação Infantil', nome: 'Grupo 5', letras: ['A'], valorPadrao: 650 },

  // Ensino Fundamental 1 (1º ao 5º Ano)
  { setor: 'Ensino Fundamental 1', nome: '1º Ano', letras: ['A'], valorPadrao: 750 },
  { setor: 'Ensino Fundamental 1', nome: '2º Ano', letras: ['A'], valorPadrao: 750 },
  { setor: 'Ensino Fundamental 1', nome: '3º Ano', letras: ['A'], valorPadrao: 750 },
  { setor: 'Ensino Fundamental 1', nome: '4º Ano', letras: ['A'], valorPadrao: 750 },
  { setor: 'Ensino Fundamental 1', nome: '5º Ano', letras: ['A'], valorPadrao: 750 },

  // Ensino Fundamental 2 (6º ao 9º Ano)
  { setor: 'Ensino Fundamental 2', nome: '6º Ano', letras: ['A'], valorPadrao: 850 },
  { setor: 'Ensino Fundamental 2', nome: '7º Ano', letras: ['A'], valorPadrao: 850 },
  { setor: 'Ensino Fundamental 2', nome: '8º Ano', letras: ['A'], valorPadrao: 850 },
  { setor: 'Ensino Fundamental 2', nome: '9º Ano', letras: ['A'], valorPadrao: 850 },

  // Ensino Médio (1º ao 3º Ano Médio)
  { setor: 'Ensino Médio', nome: '1º Ano Médio', letras: ['A'], valorPadrao: 950 },
  { setor: 'Ensino Médio', nome: '2º Ano Médio', letras: ['A'], valorPadrao: 950 },
  { setor: 'Ensino Médio', nome: '3º Ano Médio', letras: ['A'], valorPadrao: 950 },
];

/**
 * Verifica se um nome ou id de turma consta na lista de turmas excluídas persistente.
 */
export function isTurmaExcluida(
  identificador: string | undefined | null,
  turmasExcluidas: string[] | undefined | null
): boolean {
  if (!identificador || !turmasExcluidas || turmasExcluidas.length === 0) return false;
  const clean = identificador.trim().toLowerCase();
  return turmasExcluidas.some(exc => exc.trim().toLowerCase() === clean);
}

/**
 * Adiciona identificadores (nome completo, classe base, id) à lista de turmas excluídas.
 */
export function registerTurmaExcluida(
  nomeTurma: string,
  idTurma?: string,
  turmasExcluidas: string[] = []
): string[] {
  const set = new Set((turmasExcluidas || []).map(s => s.trim().toLowerCase()));
  if (nomeTurma) {
    set.add(nomeTurma.trim().toLowerCase());
  }
  if (idTurma) {
    set.add(idTurma.trim().toLowerCase());
  }
  return Array.from(set);
}

/**
 * Remove da lista de excluídas caso o usuário cadastre ou restaure intencionalmente a turma.
 */
export function unmarkTurmaExcluida(
  nomeTurma: string,
  turmasExcluidas: string[] = []
): string[] {
  if (!nomeTurma || !turmasExcluidas || turmasExcluidas.length === 0) return turmasExcluidas || [];
  const clean = nomeTurma.trim().toLowerCase();
  return turmasExcluidas.filter(item => item.trim().toLowerCase() !== clean);
}

/**
 * Garante que turmas existentes tenham letra 'A' caso não possuam letras definidas.
 * Se existingTurmas for vazio/nulo, inicializa com DEFAULT_TURMAS_CONFIG (filtrando excluídas).
 * NÃO reinjeta turmas padrão caso a lista já tenha sido configurada pelo usuário.
 */
export function ensureDefaultTurmas(
  existingTurmas: TurmaConfig[] | null | undefined,
  turmasExcluidas: string[] = [],
  forceAddDefaults = false
): TurmaConfig[] {
  if (!existingTurmas || existingTurmas.length === 0) {
    return DEFAULT_TURMAS_CONFIG.filter(
      def => !isTurmaExcluida(def.nome, turmasExcluidas)
    ).map(t => ({ ...t, letras: [...t.letras] }));
  }

  const result: TurmaConfig[] = JSON.parse(JSON.stringify(existingTurmas));

  // Apenas reinjeta turmas padrão faltantes se explicitamente forçado via botão manual
  if (forceAddDefaults) {
    DEFAULT_TURMAS_CONFIG.forEach(def => {
      if (isTurmaExcluida(def.nome, turmasExcluidas)) {
        return; // Nunca re-adicionar classe que o usuário excluiu
      }
      const existingIndex = result.findIndex(
        t => t.nome.trim().toLowerCase() === def.nome.trim().toLowerCase() && 
             t.setor.trim().toLowerCase() === def.setor.trim().toLowerCase()
      );

      if (existingIndex === -1) {
        result.push({ ...def, letras: [...def.letras] });
      } else {
        const currentLetters = result[existingIndex].letras || [];
        if (!currentLetters.includes('A')) {
          result[existingIndex].letras = ['A', ...currentLetters.filter(l => l !== 'A')].sort();
        }
        if (result[existingIndex].valorPadrao === undefined) {
          result[existingIndex].valorPadrao = def.valorPadrao;
        }
      }
    });
  }

  // Garante que classes existentes tenham pelo menos a letra 'A' caso estejam sem letras
  result.forEach(t => {
    if (!t.letras || t.letras.length === 0) {
      t.letras = ['A'];
    }
  });

  return result;
}

/**
 * Adiciona uma letra/turma adicional (ex: 'B', 'C') a uma classe existente em TurmaConfig[].
 */
export function addLetraToClasse(
  turmas: TurmaConfig[],
  setor: string,
  classeNome: string,
  novaLetra: string
): { updatedTurmas: TurmaConfig[]; changed: boolean } {
  const cleanLetra = novaLetra.trim().toUpperCase();
  if (!cleanLetra) return { updatedTurmas: turmas, changed: false };

  let changed = false;
  const updated = turmas.map(t => {
    const isTarget = t.nome.trim().toLowerCase() === classeNome.trim().toLowerCase() &&
      (!setor || t.setor.trim().toLowerCase() === setor.trim().toLowerCase());

    if (isTarget) {
      const currentLetters = t.letras || ['A'];
      if (!currentLetters.includes(cleanLetra)) {
        changed = true;
        return {
          ...t,
          letras: [...currentLetters, cleanLetra].sort()
        };
      }
    }
    return t;
  });

  return { updatedTurmas: updated, changed };
}

/**
 * Normaliza um aluno para garantir o modelo padronizado:
 * - Se a classe tiver a letra embutida (ex: "1º Ano A" ou "Maternal B"), separa a classe e a letra.
 * - Garante que todo aluno pertença a uma turma (padrão 'A' caso não especificado ou genérico).
 * - Preenche o setor automaticamente se estiver ausente.
 */
export function normalizeAlunoTurma(aluno: Aluno, turmas: TurmaConfig[]): { aluno: Aluno; changed: boolean } {
  let changed = false;
  let newTurma = aluno.turma ? aluno.turma.trim() : '';
  let newClasse = aluno.classe ? aluno.classe.trim() : '';
  let newSetor = aluno.setor ? aluno.setor.trim() : '';

  if (newClasse) {
    // 1. Se aluno.classe termina com espaço + letra única (ex: "1º Ano A", "Maternal B", "Grupo 3 C")
    const classEndingMatch = newClasse.match(/^(.*?)\s+([A-Za-z])$/);
    if (classEndingMatch) {
      newClasse = classEndingMatch[1].trim();
      const extractedLetter = classEndingMatch[2].toUpperCase();
      if (!newTurma || newTurma.toLowerCase() === 'geral' || newTurma.toLowerCase() === 'sem turma' || newTurma.toLowerCase() === newClasse.toLowerCase()) {
        newTurma = extractedLetter;
        changed = true;
      }
    }

    // 2. Se a turma possui "Turma X", extrai apenas a letra X
    const turmaPrefixMatch = newTurma.match(/turma\s+([A-Za-z])/i);
    if (turmaPrefixMatch) {
      newTurma = turmaPrefixMatch[1].toUpperCase();
      changed = true;
    } else if (newTurma.length === 1) {
      const upper = newTurma.toUpperCase();
      if (upper !== newTurma) {
        newTurma = upper;
        changed = true;
      }
    }

    // 3. Se ainda não tem turma ou tem valor genérico/igual à classe, aloca na turma 'A'
    const isTurmaIgualClasse = newTurma.toLowerCase() === newClasse.toLowerCase();
    const isTurmaGenerica = newTurma.toLowerCase() === 'geral' || newTurma.toLowerCase() === 'sem turma' || !newTurma;

    if (isTurmaIgualClasse || isTurmaGenerica) {
      newTurma = 'A';
      changed = true;
    }

    // 4. Se o setor não foi preenchido, deduz a partir da configuração de turmas ou das turmas padrão
    const matchingTurma = turmas.find(t => t.nome.trim().toLowerCase() === newClasse.toLowerCase()) ||
      DEFAULT_TURMAS_CONFIG.find(t => t.nome.trim().toLowerCase() === newClasse.toLowerCase());

    if (matchingTurma) {
      if (matchingTurma.nome !== newClasse) {
        newClasse = matchingTurma.nome; // Padroniza a caixa/grafia
        changed = true;
      }
      if (!newSetor || newSetor !== matchingTurma.setor) {
        newSetor = matchingTurma.setor;
        changed = true;
      }
    }
  }

  if (newTurma !== aluno.turma || newSetor !== aluno.setor || newClasse !== aluno.classe) {
    return {
      aluno: {
        ...aluno,
        turma: newTurma,
        classe: newClasse,
        setor: newSetor,
      },
      changed: true,
    };
  }

  return { aluno, changed: false };
}

/**
 * Normaliza uma coleção inteira de alunos.
 */
export function normalizeAllAlunos(alunos: Aluno[], turmas: TurmaConfig[]): { alunos: Aluno[]; changed: boolean; countChanged: number } {
  let anyChanged = false;
  let countChanged = 0;
  const updatedAlunos = (alunos || []).map(aluno => {
    const { aluno: normalized, changed } = normalizeAlunoTurma(aluno, turmas);
    if (changed) {
      anyChanged = true;
      countChanged++;
    }
    return normalized;
  });

  return { alunos: updatedAlunos, changed: anyChanged, countChanged };
}

/**
 * Sincroniza a lista de Turmas Pedagógicas a partir da configuração global (TurmaConfig[]).
 * Garante que cada classe e cada letra (ex: 1º Ano A, 1º Ano B) possuam uma turma pedagógica ativa correspondente,
 * ignorando rigorosamente turmas ou classes excluídas pelo usuário.
 */
export function syncTurmasPedagogicasComGlobais(
  turmasGlobais: TurmaConfig[],
  turmasPedagogico: TurmaPedagogica[],
  turmasExcluidas: string[] = []
): { updatedTurmasPedagogico: TurmaPedagogica[]; createdCount: number } {
  let createdCount = 0;
  const currentPedagogico = [...(turmasPedagogico || [])];

  (turmasGlobais || []).forEach(tg => {
    // Se a classe global foi marcada como excluída, ignora
    if (isTurmaExcluida(tg.nome, turmasExcluidas)) {
      return;
    }

    const letras = tg.letras && tg.letras.length > 0 ? tg.letras : ['A'];

    letras.forEach(letra => {
      const standardName = `${tg.nome} ${letra}`.trim();

      // Se a turma específica foi marcada como excluída, ignora
      if (isTurmaExcluida(standardName, turmasExcluidas)) {
        return;
      }

      // Verifica se já existe com esse nome exato
      const existingIdx = currentPedagogico.findIndex(
        tp => tp.nome.trim().toLowerCase() === standardName.toLowerCase()
      );

      if (existingIdx === -1) {
        // Se for letra 'A', verifica se existe turma cadastrada apenas com o nome da classe (ex: "1º Ano" em vez de "1º Ano A")
        const legacyIdx = letra === 'A'
          ? currentPedagogico.findIndex(tp => tp.nome.trim().toLowerCase() === tg.nome.trim().toLowerCase())
          : -1;

        if (legacyIdx !== -1) {
          currentPedagogico[legacyIdx] = {
            ...currentPedagogico[legacyIdx],
            nome: standardName,
            setor: tg.setor || currentPedagogico[legacyIdx].setor,
          };
          createdCount++;
        } else {
          currentPedagogico.push({
            id: `turma-sync-${tg.nome.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${letra.toLowerCase()}-${Date.now()}`,
            nome: standardName,
            setor: tg.setor,
            anoLetivo: '2026',
            turno: 'Matutino',
            valorMensalidade: tg.valorPadrao || 750,
            maxAlunos: 25,
            sala: `Sala ${tg.nome} ${letra}`,
            status: 'Ativa',
          });
          createdCount++;
        }
      }
    });
  });

  return { updatedTurmasPedagogico: currentPedagogico, createdCount };
}

/**
 * Verifica se um aluno pertence a uma turma específica, suportando:
 * - Nome composto da turma (ex: "1º Ano A", "Maternal B")
 * - Nome da classe simples (caso a turma seja A)
 * - Comparações insensíveis a maiúsculas/minúsculas
 */
export function matchesAlunoTurma(aluno: Aluno, turmaNome: string): boolean {
  if (!turmaNome || turmaNome.toLowerCase() === 'todas') return true;
  const tNome = turmaNome.trim().toLowerCase();

  const alunoClasse = (aluno.classe || '').trim().toLowerCase();
  const alunoTurma = (aluno.turma || 'A').trim().toUpperCase();
  const combo = `${alunoClasse} ${alunoTurma}`.trim().toLowerCase();

  if (combo === tNome) return true;
  if (alunoClasse === tNome && (alunoTurma === 'A' || !aluno.turma)) return true;
  if ((aluno.turma || '').trim().toLowerCase() === tNome) return true;

  return false;
}


