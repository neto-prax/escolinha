export interface Materia {
  id: string;
  nome: string;
  sigla: string;
  cor: string; // Ex: '#3b82f6' ou classe tailwind
  cargaHorariaSemanal?: number; // Qtd de aulas por semana
  professorPadraoId?: string;
  professorPadraoNome?: string;
  ementa?: string;
}

export interface HorarioSubSlot {
  id: string;
  rotulo?: string; // Ex: 'Parte 1 (25m)', 'Oficina'
  materiaId?: string;
  materiaNome?: string;
  materiaCor?: string;
  professorId?: string;
  professorNome?: string;
  sala?: string;
}

export interface HorarioSlot {
  isSubdivided?: boolean;
  materiaId?: string;
  materiaNome?: string;
  materiaCor?: string;
  professorId?: string;
  professorNome?: string;
  sala?: string;
  subSlots?: [HorarioSubSlot, HorarioSubSlot];
}

export interface GradeHoraria {
  dias: string[];
  intervalos: string[];
  slots: Record<string, HorarioSlot>; // chave: `${dia}_${intervalo}`
}

export interface TurmaPedagogica {
  id: string;
  nome: string; // Ex: '1º Ano A', 'Maternal B'
  setor: string; // Ex: 'Educação Infantil', 'Ensino Fundamental 1'
  anoLetivo: string; // Ex: '2026'
  turno: 'Matutino' | 'Vespertino' | 'Noturno' | 'Integral';
  valorMensalidade: number; // Valor específico dessa turma
  maxAlunos: number; // Limite máximo de vagas
  sala: string; // Ex: 'Sala 03 - Bloco B'
  professorRegenteId?: string;
  professorRegenteNome?: string;
  professorRegenteFoto?: string;
  status: 'Ativa' | 'Planejamento' | 'Concluída';
  observacoes?: string;
  gradeHoraria?: GradeHoraria;
}

export interface CicloLetivo {
  id: string;
  numero: number;
  nomePublico: string; // Ex: '1º Bimestre', '1º Trimestre'
  peso: number; // Peso na média final anual
  dataInicio?: string;
  dataFim?: string;
}

export interface RegraMediaParcial {
  nomePublico: string; // Ex: 'Média Bimestral'
  tipoCalculo: 'aritmetica' | 'ponderada' | 'somatoria';
  notaMeta: number; // Ex: 7.0
  pesosAvaliacoes: {
    prova: number;
    trabalho: number;
    participacao: number;
    pratica: number;
  };
}

export interface RegraMediaFinal {
  nomePublico: string; // Ex: 'Média Final Anual'
  tipoCalculo: 'aritmetica' | 'ponderada';
  notaAprovacaoDireta: number; // Ex: 7.0
  notaMinimaExame: number; // Ex: 4.0
  formulaExame: 'media_aritmetica_exame' | 'peso_anual_exame'; // (MediaAnual + Exame)/2 >= corte
  notaAprovacaoExame: number; // Ex: 5.0
}

export interface ConfiguracaoAcademica {
  modalidade: 'bimestral' | 'trimestral' | 'semestral' | 'personalizado';
  quantidadeCiclos: number;
  ciclos: CicloLetivo[];
  mediaParcial: RegraMediaParcial;
  mediaFinal: RegraMediaFinal;
}

export interface PlanejamentoAulaItem {
  id: string;
  turmaId: string;
  turmaNome: string;
  disciplinaId: string;
  disciplinaNome: string;
  cicloId: string;
  cicloNome: string;
  dataPrevista: string;
  horario: string;
  titulo: string;
  objetivosBncc?: string;
  conteudoProgramatico: string;
  metodologia?: string;
  materiaisNecessarios?: string;
  tarefaCasa?: string;
  status: 'Planejada' | 'Em Andamento' | 'Executada';
}

export const DIAS_SEMANA_PADRAO = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

export const INTERVALOS_PADRAO = [
  '07:30 - 08:20',
  '08:20 - 09:10',
  '09:10 - 09:30', // Intervalo/Recreio
  '09:30 - 10:20',
  '10:20 - 11:10',
  '11:10 - 12:00',
];

export const DEFAULT_MATERIAS: Materia[] = [
  {
    id: 'mat-1',
    nome: 'Língua Portuguesa',
    sigla: 'PORT',
    cor: '#3b82f6', // azul
    cargaHorariaSemanal: 5,
    ementa: 'Leitura, interpretação textual, gramática aplicada e produção escrita.',
  },
  {
    id: 'mat-2',
    nome: 'Matemática',
    sigla: 'MAT',
    cor: '#ef4444', // vermelho
    cargaHorariaSemanal: 5,
    ementa: 'Raciocínio lógico, aritmética, geometria básica e resolução de problemas.',
  },
  {
    id: 'mat-3',
    nome: 'Ciências Naturais',
    sigla: 'CIEN',
    cor: '#10b981', // verde
    cargaHorariaSemanal: 3,
    ementa: 'Ecossistemas, meio ambiente, corpo humano e método científico.',
  },
  {
    id: 'mat-4',
    nome: 'História & Geografia',
    sigla: 'HIST/GEO',
    cor: '#f59e0b', // âmbar
    cargaHorariaSemanal: 3,
    ementa: 'Sociedade, espaço geográfico, história local e formação cultural.',
  },
  {
    id: 'mat-5',
    nome: 'Arte & Cultura',
    sigla: 'ART',
    cor: '#8b5cf6', // roxo
    cargaHorariaSemanal: 2,
    ementa: 'Expressão artística, artes visuais, música e manifestações culturais.',
  },
  {
    id: 'mat-6',
    nome: 'Educação Física',
    sigla: 'EDF',
    cor: '#ec4899', // rosa
    cargaHorariaSemanal: 2,
    ementa: 'Coordenação motora, esportes coletivos, cooperação e saúde corporal.',
  },
  {
    id: 'mat-7',
    nome: 'Língua Inglesa',
    sigla: 'ING',
    cor: '#06b6d4', // ciano
    cargaHorariaSemanal: 2,
    ementa: 'Vocabulário introdutório, oralidade e compreensão básica em inglês.',
  },
];

export const DEFAULT_CONFIG_ACADEMICA: ConfiguracaoAcademica = {
  modalidade: 'bimestral',
  quantidadeCiclos: 4,
  ciclos: [
    { id: 'b1', numero: 1, nomePublico: '1º Bimestre', peso: 1, dataInicio: '2026-02-01', dataFim: '2026-04-15' },
    { id: 'b2', numero: 2, nomePublico: '2º Bimestre', peso: 1, dataInicio: '2026-04-16', dataFim: '2026-06-30' },
    { id: 'b3', numero: 3, nomePublico: '3º Bimestre', peso: 1, dataInicio: '2026-08-01', dataFim: '2026-09-30' },
    { id: 'b4', numero: 4, nomePublico: '4º Bimestre', peso: 1, dataInicio: '2026-10-01', dataFim: '2026-12-15' },
  ],
  mediaParcial: {
    nomePublico: 'Média Bimestral',
    tipoCalculo: 'aritmetica',
    notaMeta: 7.0,
    pesosAvaliacoes: {
      prova: 6,
      trabalho: 3,
      participacao: 1,
      pratica: 2,
    },
  },
  mediaFinal: {
    nomePublico: 'Média Final Anual',
    tipoCalculo: 'aritmetica',
    notaAprovacaoDireta: 7.0,
    notaMinimaExame: 4.0,
    formulaExame: 'media_aritmetica_exame',
    notaAprovacaoExame: 5.0,
  },
};

export const DEFAULT_TURMAS_PEDAGOGICO: TurmaPedagogica[] = [
  {
    id: 'turma-maternal-a',
    nome: 'Maternal A',
    setor: 'Educação Infantil',
    anoLetivo: '2026',
    turno: 'Matutino',
    valorMensalidade: 650,
    maxAlunos: 15,
    sala: 'Sala 01 - Infantil',
    professorRegenteNome: 'Maria Santos',
    status: 'Ativa',
    observacoes: 'Turma de desenvolvimento lúdico e psicomotor.',
  },
  {
    id: 'turma-1ano-a',
    nome: '1º Ano A',
    setor: 'Ensino Fundamental 1',
    anoLetivo: '2026',
    turno: 'Matutino',
    valorMensalidade: 850,
    maxAlunos: 25,
    sala: 'Sala 03 - Fundamental',
    professorRegenteNome: 'Carlos Eduardo',
    status: 'Ativa',
    observacoes: 'Início do ciclo de alfabetização e letramento.',
  },
  {
    id: 'turma-1ano-b',
    nome: '1º Ano B',
    setor: 'Ensino Fundamental 1',
    anoLetivo: '2026',
    turno: 'Vespertino',
    valorMensalidade: 850,
    maxAlunos: 25,
    sala: 'Sala 04 - Fundamental',
    professorRegenteNome: 'Ana Paula',
    status: 'Ativa',
    observacoes: 'Turma vespertina com projeto de leitura.',
  },
  {
    id: 'turma-6ano-a',
    nome: '6º Ano A',
    setor: 'Ensino Fundamental 2',
    anoLetivo: '2026',
    turno: 'Matutino',
    valorMensalidade: 980,
    maxAlunos: 30,
    sala: 'Sala 07 - Anexo',
    professorRegenteNome: 'Roberto Lima',
    status: 'Ativa',
    observacoes: 'Turma de transição para o Fundamental 2.',
  },
];

