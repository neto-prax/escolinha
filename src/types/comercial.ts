import { Aluno } from './aluno';
import { TurmaConfig } from './finance';

export type LeadEtapa = 
  | 'novo'           // Novo Contato / Interessado
  | 'visita'         // Visita / Aula Experimental
  | 'proposta'       // Proposta / Documentação
  | 'matriculado'    // Matrícula Realizada
  | 'rematriculado'  // Rematrícula Confirmada
  | 'perdido';       // Perdido / Desistência

export type LeadTipo = 'matricula' | 'rematricula';

export interface ComercialLead {
  id: string;
  nome: string;
  nomeResponsavel: string;
  telefone: string;
  email?: string;
  turma: string; // Ex: "Maternal A", "1º Ano A", "6º Ano A"
  setor?: string;
  tipo: LeadTipo;
  etapa: LeadEtapa;
  valorPrevisto: number;
  origem: string;
  observacoes?: string;
  motivoPerda?: string;
  dataCriacao: string;
  alunoId?: string;
}

export interface MetaTurmaConfig {
  turmaNome: string;
  capacidadeTotal: number;
  metaMatriculas: number;
  metaRematriculas: number;
  valorMensalidade?: number;
}

/**
 * Retorna o nome completo da turma do aluno (ex: "Maternal A", "1º Ano B")
 */
export function getAlunoTurma(aluno: Aluno): string {
  if (aluno.classe && aluno.turma) {
    return `${aluno.classe} ${aluno.turma}`.trim();
  }
  if (aluno.classe) {
    return aluno.classe.trim();
  }
  return 'Sem Turma';
}

/**
 * Verifica se um aluno pertence a uma turma específica
 */
export function matchesTurma(aluno: Aluno, turmaNome: string): boolean {
  if (!turmaNome || turmaNome === 'todas' || turmaNome === 'Todas') return true;
  const tName = turmaNome.trim().toLowerCase();
  const alunoTurma = getAlunoTurma(aluno).toLowerCase();
  if (alunoTurma === tName) return true;
  const combo = `${aluno.classe || ''} ${aluno.turma || ''}`.trim().toLowerCase();
  if (combo === tName) return true;
  if ((aluno.classe || '').trim().toLowerCase() === tName) return true;
  return false;
}

/**
 * Extrai a lista unificada de todas as turmas reais configuradas ou com alunos
 */
export function getRealTurmasList(turmasConfig: TurmaConfig[], alunos: Aluno[]): string[] {
  const set = new Set<string>();

  // 1. Das configurações de turmas
  (turmasConfig || []).forEach((t) => {
    if (t.letras && t.letras.length > 0) {
      t.letras.forEach((letra) => {
        if (letra && letra.trim()) {
          set.add(`${t.nome} ${letra.trim()}`);
        } else {
          set.add(t.nome.trim());
        }
      });
    } else if (t.nome) {
      set.add(t.nome.trim());
    }
  });

  // 2. Dos alunos cadastrados no sistema
  (alunos || []).forEach((a) => {
    const turmaAluno = getAlunoTurma(a);
    if (turmaAluno && turmaAluno !== 'Sem Turma') {
      set.add(turmaAluno);
    }
  });

  const list = Array.from(set).filter(Boolean);
  return list.length > 0
    ? list.sort()
    : ['Maternal A', 'Maternal B', '1º Ano A', '1º Ano B', '6º Ano A', '1º Ano EM'];
}

/**
 * Converte alunos reais do sistema em cards de rematrícula para o funil comercial
 */
export function convertAlunosToLeads(alunos: Aluno[]): ComercialLead[] {
  return (alunos || [])
    .filter((a) => a.status === 'Ativo')
    .map((a) => {
      const turma = getAlunoTurma(a);
      const valor = Number(a.valorBase) || 650;
      return {
        id: `aluno-lead-${a.id}`,
        nome: a.nome,
        nomeResponsavel: a.nomeResponsavel || 'Responsável',
        telefone: a.contatoResponsavel || a.telefone || '',
        email: a.email || '',
        turma: turma !== 'Sem Turma' ? turma : 'Geral',
        setor: a.setor || '',
        tipo: 'rematricula' as LeadTipo,
        etapa: (a.bloquearRematricula ? 'perdido' : 'rematriculado') as LeadEtapa,
        valorPrevisto: valor,
        origem: 'Aluno da Escola',
        observacoes: `Matrícula: ${a.matricula || 'S/N'}${a.descontoMensalidade && Number(a.descontoMensalidade) > 0 ? ` • Desconto: R$ ${a.descontoMensalidade}` : ''}`,
        dataCriacao: new Date().toLocaleDateString('pt-BR'),
        alunoId: a.id,
      };
    });
}


export interface MetaComercial {
  id: string;
  anoLetivo: string; // Ex: "2025", "2026"
  titulo: string;
  dataInicio?: string;
  dataFim?: string;
  metaMatriculasGlobal: number;
  metaRematriculasGlobal: number;
  metaFinanceiraGlobal?: number;
  metasPorTurma: MetaTurmaConfig[];
  ativo: boolean;
  observacoes?: string;
}

export const KANBAN_STAGES: { id: LeadEtapa; label: string; color: string; bgLight: string; border: string }[] = [
  { 
    id: 'novo', 
    label: 'Novos Contatos', 
    color: 'text-blue-700 dark:text-blue-400', 
    bgLight: 'bg-blue-50/70 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800'
  },
  { 
    id: 'visita', 
    label: 'Visita / Aula Exp.', 
    color: 'text-purple-700 dark:text-purple-400', 
    bgLight: 'bg-purple-50/70 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800'
  },
  { 
    id: 'proposta', 
    label: 'Proposta & Doc.', 
    color: 'text-amber-700 dark:text-amber-400', 
    bgLight: 'bg-amber-50/70 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800'
  },
  { 
    id: 'matriculado', 
    label: 'Matrícula Realizada', 
    color: 'text-emerald-700 dark:text-emerald-400', 
    bgLight: 'bg-emerald-50/70 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800'
  },
  { 
    id: 'rematriculado', 
    label: 'Rematrícula Confirmada', 
    color: 'text-teal-700 dark:text-teal-400', 
    bgLight: 'bg-teal-50/70 dark:bg-teal-950/30',
    border: 'border-teal-200 dark:border-teal-800'
  },
  { 
    id: 'perdido', 
    label: 'Perdido / Desistência', 
    color: 'text-rose-700 dark:text-rose-400', 
    bgLight: 'bg-rose-50/70 dark:bg-rose-950/30',
    border: 'border-rose-200 dark:border-rose-800'
  },
];

export const INITIAL_LEADS: ComercialLead[] = [
  {
    id: 'lead-1',
    nome: 'Gabriel Oliveira',
    nomeResponsavel: 'Mariana Oliveira',
    telefone: '(11) 98765-4321',
    email: 'mariana.oliveira@email.com',
    turma: 'Maternal A',
    setor: 'Educação Infantil',
    tipo: 'matricula',
    etapa: 'novo',
    valorPrevisto: 650,
    origem: 'Instagram',
    observacoes: 'Mãe pediu informações sobre horário integral.',
    dataCriacao: '10/01/2025',
  },
  {
    id: 'lead-2',
    nome: 'Beatriz Santos',
    nomeResponsavel: 'Carlos Santos',
    telefone: '(11) 97654-3210',
    email: 'carlos.santos@email.com',
    turma: '1º Ano A',
    setor: 'Ensino Fundamental 1',
    tipo: 'matricula',
    etapa: 'visita',
    valorPrevisto: 720,
    origem: 'Indicação',
    observacoes: 'Visita agendada para quinta-feira às 14h.',
    dataCriacao: '12/01/2025',
  },
  {
    id: 'lead-3',
    nome: 'Lucas Mendes',
    nomeResponsavel: 'Fernanda Mendes',
    telefone: '(11) 96543-2109',
    email: 'fernanda.mendes@email.com',
    turma: 'Maternal A',
    setor: 'Educação Infantil',
    tipo: 'rematricula',
    etapa: 'proposta',
    valorPrevisto: 620,
    origem: 'Aluno Veterano',
    observacoes: 'Renovação com desconto de irmão em análise.',
    dataCriacao: '14/01/2025',
  },
  {
    id: 'lead-4',
    nome: 'Sofia Alencar',
    nomeResponsavel: 'Roberto Alencar',
    telefone: '(11) 95432-1098',
    email: 'roberto.alencar@email.com',
    turma: '6º Ano A',
    setor: 'Ensino Fundamental 2',
    tipo: 'matricula',
    etapa: 'matriculado',
    valorPrevisto: 850,
    origem: 'Fachada / Presencial',
    observacoes: 'Documentação entregue e taxa de matrícula paga.',
    dataCriacao: '15/01/2025',
  },
  {
    id: 'lead-5',
    nome: 'Enzo Rodrigues',
    nomeResponsavel: 'Juliana Rodrigues',
    telefone: '(11) 94321-0987',
    email: 'juliana.rodrigues@email.com',
    turma: '1º Ano A',
    setor: 'Ensino Fundamental 1',
    tipo: 'rematricula',
    etapa: 'rematriculado',
    valorPrevisto: 700,
    origem: 'Aluno Veterano',
    observacoes: 'Contrato 2025 assinado digitalmente.',
    dataCriacao: '15/01/2025',
  },
];

export const INITIAL_METAS: MetaComercial[] = [
  {
    id: 'meta-2025',
    anoLetivo: '2025',
    titulo: 'Campanha de Matrículas & Rematrículas 2025',
    dataInicio: '01/10/2024',
    dataFim: '28/02/2025',
    metaMatriculasGlobal: 60,
    metaRematriculasGlobal: 140,
    metaFinanceiraGlobal: 150000,
    ativo: true,
    observacoes: 'Meta aprovada pela diretoria para o ano letivo de 2025.',
    metasPorTurma: [
      { turmaNome: 'Maternal A', capacidadeTotal: 25, metaMatriculas: 15, metaRematriculas: 10, valorMensalidade: 650 },
      { turmaNome: 'Maternal B', capacidadeTotal: 25, metaMatriculas: 15, metaRematriculas: 10, valorMensalidade: 650 },
      { turmaNome: '1º Ano A', capacidadeTotal: 30, metaMatriculas: 10, metaRematriculas: 20, valorMensalidade: 720 },
      { turmaNome: '1º Ano B', capacidadeTotal: 30, metaMatriculas: 10, metaRematriculas: 20, valorMensalidade: 720 },
      { turmaNome: '6º Ano A', capacidadeTotal: 35, metaMatriculas: 10, metaRematriculas: 25, valorMensalidade: 850 },
      { turmaNome: '1º Ano EM', capacidadeTotal: 35, metaMatriculas: 10, metaRematriculas: 25, valorMensalidade: 950 },
    ],
  },
];

