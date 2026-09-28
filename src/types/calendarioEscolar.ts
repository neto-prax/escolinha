export type TipoEventoCalendario =
  | 'feriado'             // Feriado Nacional, Estadual ou Municipal (Sem Aula)
  | 'recesso'             // Recesso Escolar / Férias (Sem Aula)
  | 'planejamento'        // Parada Pedagógica / Reunião Geral de Professores (Sem Aula para Alunos)
  | 'evento_escolar'      // Evento Escolar / Comemoração / Feira / Festa Cultural
  | 'reuniao_pais'        // Reunião de Pais e Mestres
  | 'letivo_especial'     // Sábado Letivo / Reposição de Aula
  | 'avaliacao'           // Período de Avaliações / Provas
  | 'conselho_classe'     // Conselho de Classe
  | 'outros';             // Outros tipos de dias

export interface EventoCalendarioEscolar {
  id: string;
  titulo: string;
  descricao?: string;
  tipo: TipoEventoCalendario;
  dataInicio: string; // YYYY-MM-DD
  dataFim?: string;   // YYYY-MM-DD (para recessos e períodos)
  temAula: boolean;   // false = Dia SEM aula; true = Dia COM aula
  anoLetivo: string;  // Ex: '2026'
  horario?: string;   // Ex: '08:00 às 11:30'
  local?: string;     // Ex: 'Auditório', 'Pátio Central'
  publicoAlvo?: string | string[]; // Suporte a múltiplos públicos-alvo (multi-select)
  cor?: string;
  criadoEm?: string;
}

export const SEGMENTOS_ESCOLARES = [
  'Educação Infantil',
  'Ensino Fundamental 1',
  'Ensino Fundamental 2',
  'Ensino Médio',
  'Professores e Equipe',
  'Pais e Responsáveis',
  'Alunos em Geral',
] as const;

export const OPCOES_PUBLICO_ALVO = [
  'Toda a Escola',
  ...SEGMENTOS_ESCOLARES,
] as const;

export function normalizePublicoAlvo(publicoAlvo?: string | string[]): string[] {
  if (!publicoAlvo) return ['Toda a Escola'];
  const arr = Array.isArray(publicoAlvo) ? publicoAlvo : [publicoAlvo];
  if (arr.includes('Toda a Escola')) {
    return ['Toda a Escola'];
  }
  // Se contiver 'Alunos em Geral', resume as turmas de alunos em 'Alunos em Geral'
  if (arr.includes('Alunos em Geral')) {
    const outros = arr.filter(
      (item) =>
        item === 'Professores e Equipe' ||
        item === 'Pais e Responsáveis' ||
        item === 'Alunos em Geral'
    );
    return outros.length > 0 ? outros : ['Alunos em Geral'];
  }
  return arr.length > 0 ? arr : ['Toda a Escola'];
}

export const TIPO_EVENTO_CONFIG: Record<
  TipoEventoCalendario,
  { label: string; defaultTemAula: boolean; badgeColor: string; dotColor: string }
> = {
  feriado: {
    label: 'Feriado',
    defaultTemAula: false,
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
    dotColor: 'bg-rose-500',
  },
  recesso: {
    label: 'Recesso / Férias',
    defaultTemAula: false,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    dotColor: 'bg-amber-500',
  },
  planejamento: {
    label: 'Parada Pedagógica',
    defaultTemAula: false,
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800',
    dotColor: 'bg-orange-500',
  },
  evento_escolar: {
    label: 'Evento Escolar / Cultural',
    defaultTemAula: true,
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
    dotColor: 'bg-purple-500',
  },
  reuniao_pais: {
    label: 'Reunião de Pais e Mestres',
    defaultTemAula: false,
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
    dotColor: 'bg-blue-500',
  },
  letivo_especial: {
    label: 'Sábado Letivo / Reposição',
    defaultTemAula: true,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
  },
  avaliacao: {
    label: 'Semana de Avaliações / Provas',
    defaultTemAula: true,
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
    dotColor: 'bg-indigo-500',
  },
  conselho_classe: {
    label: 'Conselho de Classe',
    defaultTemAula: false,
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
    dotColor: 'bg-teal-500',
  },
  outros: {
    label: 'Outro Evento',
    defaultTemAula: true,
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dotColor: 'bg-slate-500',
  },
};

export const DEFAULT_EVENTOS_CALENDARIO_2026: EventoCalendarioEscolar[] = [
  // JANEIRO
  {
    id: 'cal-2026-01',
    titulo: 'Confraternização Universal (Ano Novo)',
    tipo: 'feriado',
    dataInicio: '2026-01-01',
    temAula: false,
    anoLetivo: '2026',
    descricao: 'Feriado Nacional de Início de Ano.',
    publicoAlvo: 'Toda a Escola',
  },
  {
    id: 'cal-2026-02',
    titulo: 'Férias Escolares de Janeiro',
    tipo: 'recesso',
    dataInicio: '2026-01-02',
    dataFim: '2026-01-30',
    temAula: false,
    anoLetivo: '2026',
    descricao: 'Período de férias escolares e descanso docente/discente.',
    publicoAlvo: 'Toda a Escola',
  },

  // FEVEREIRO
  {
    id: 'cal-2026-03',
    titulo: 'Início do Ano Letivo 2026 & Acolhida dos Alunos',
    tipo: 'evento_escolar',
    dataInicio: '2026-02-02',
    temAula: true,
    anoLetivo: '2026',
    horario: '07:30',
    descricao: 'Primeiro dia de aula do 1º Semestre de 2026 e recepção calorosa das turmas.',
    publicoAlvo: 'Toda a Escola',
  },
  {
    id: 'cal-2026-04',
    titulo: 'Recesso de Carnaval & Quarta-feira de Cinzas',
    tipo: 'feriado',
    dataInicio: '2026-02-16',
    dataFim: '2026-02-18',
    temAula: false,
    anoLetivo: '2026',
    descricao: 'Feriado e recesso de Carnaval. Retorno na quinta-feira 19/02.',
    publicoAlvo: 'Toda a Escola',
  },

  // MARÇO
  {
    id: 'cal-2026-05',
    titulo: 'Parada Pedagógica & Planejamento Coletivo',
    tipo: 'planejamento',
    dataInicio: '2026-03-27',
    temAula: false,
    anoLetivo: '2026',
    horario: '08:00 às 17:00',
    descricao: 'Reunião de alinhamento pedagógico e formação continuada. Sem aula para os alunos.',
    publicoAlvo: 'Professores',
  },

  // ABRIL
  {
    id: 'cal-2026-06',
    titulo: 'Sexta-feira Santa (Paixão de Cristo)',
    tipo: 'feriado',
    dataInicio: '2026-04-03',
    temAula: false,
    anoLetivo: '2026',
    descricao: 'Feriado Nacional da Paixão de Cristo.',
    publicoAlvo: 'Toda a Escola',
  },
  {
    id: 'cal-2026-07',
    titulo: 'Reunião de Pais e Mestres - 1º Bimestre',
    tipo: 'reuniao_pais',
    dataInicio: '2026-04-18',
    temAula: false,
    anoLetivo: '2026',
    horario: '08:30 às 11:30',
    descricao: 'Entrega de notas, feedbacks individuais e alinhamento pedagógico com as famílias.',
    publicoAlvo: 'Toda a Escola',
  },
  {
    id: 'cal-2026-08',
    titulo: 'Tiradentes',
    tipo: 'feriado',
    dataInicio: '2026-04-21',
    temAula: false,
    anoLetivo: '2026',
    descricao: 'Feriado Nacional de Tiradentes.',
    publicoAlvo: 'Toda a Escola',
  },

  // MAIO
  {
    id: 'cal-2026-09',
    titulo: 'Dia Mundial do Trabalho',
    tipo: 'feriado',
    dataInicio: '2026-05-01',
    temAula: false,
    anoLetivo: '2026',
    descricao: 'Feriado Nacional.',
    publicoAlvo: 'Toda a Escola',
  },
  {
    id: 'cal-2026-10',
    titulo: 'Festa da Família & Comemoração do Dia das Mães',
    tipo: 'letivo_especial',
    dataInicio: '2026-05-09',
    temAula: true,
    anoLetivo: '2026',
    horario: '08:30 às 12:00',
    descricao: 'Sábado letivo festivo com apresentações culturais das turmas e integração familiar.',
    publicoAlvo: 'Toda a Escola',
  },

  // JUNHO
  {
    id: 'cal-2026-11',
    titulo: 'Corpus Christi',
    tipo: 'feriado',
    dataInicio: '2026-06-04',
    temAula: false,
    anoLetivo: '2026',
    descricao: 'Feriado Nacional.',
    publicoAlvo: 'Toda a Escola',
  },
  {
    id: 'cal-2026-12',
    titulo: 'Emenda de Corpus Christi (Ponto Facultativo)',
    tipo: 'recesso',
    dataInicio: '2026-06-05',
    temAula: false,
    anoLetivo: '2026',
    descricao: 'Ponto facultativo escolar. Sem aula.',
    publicoAlvo: 'Toda a Escola',
  },
  {
    id: 'cal-2026-13',
    titulo: 'Festa Junina Tradicional da Escola',
    tipo: 'letivo_especial',
    dataInicio: '2026-06-20',
    temAula: true,
    anoLetivo: '2026',
    horario: '10:00 às 17:00',
    descricao: 'Sábado letivo temático: quadrilha junina, barraquinhas de comidas típicas e brincadeiras.',
    publicoAlvo: 'Toda a Escola',
  },

  // JULHO
  {
    id: 'cal-2026-14',
    titulo: 'Recesso Escolar de Meio de Ano (Férias de Julho)',
    tipo: 'recesso',
    dataInicio: '2026-07-06',
    dataFim: '2026-07-24',
    temAula: false,
    anoLetivo: '2026',
    descricao: 'Férias de meio de ano dos alunos e recesso docente.',
    publicoAlvo: 'Toda a Escola',
  },
  {
    id: 'cal-2026-15',
    titulo: 'Início do 2º Semestre Letivo',
    tipo: 'evento_escolar',
    dataInicio: '2026-07-27',
    temAula: true,
    anoLetivo: '2026',
    descricao: 'Retorno das aulas no 2º semestre.',
    publicoAlvo: 'Toda a Escola',
  },

  // SETEMBRO
  {
    id: 'cal-2026-16',
    titulo: 'Independência do Brasil',
    tipo: 'feriado',
    dataInicio: '2026-09-07',
    temAula: false,
    anoLetivo: '2026',
    descricao: 'Feriado Nacional de 7 de Setembro.',
    publicoAlvo: 'Toda a Escola',
  },
  {
    id: 'cal-2026-17',
    titulo: 'Feira de Ciências e Mostra de Projetos',
    tipo: 'letivo_especial',
    dataInicio: '2026-09-26',
    temAula: true,
    anoLetivo: '2026',
    horario: '08:00 às 12:30',
    descricao: 'Sábado letivo: apresentação de trabalhos interdisciplinares pelos estudantes.',
    publicoAlvo: 'Toda a Escola',
  },

  // OUTUBRO
  {
    id: 'cal-2026-18',
    titulo: 'Nossa Senhora Aparecida / Dia das Crianças',
    tipo: 'feriado',
    dataInicio: '2026-10-12',
    temAula: false,
    anoLetivo: '2026',
    descricao: 'Feriado Nacional da Padroeira do Brasil e Dia das Crianças.',
    publicoAlvo: 'Toda a Escola',
  },
  {
    id: 'cal-2026-19',
    titulo: 'Dia do Professor e Profissionais da Educação',
    tipo: 'recesso',
    dataInicio: '2026-10-15',
    temAula: false,
    anoLetivo: '2026',
    descricao: 'Homenagem ao corpo docente e profissionais escolares. Dia sem aula.',
    publicoAlvo: 'Toda a Escola',
  },

  // NOVEMBRO
  {
    id: 'cal-2026-20',
    titulo: 'Finados',
    tipo: 'feriado',
    dataInicio: '2026-11-02',
    temAula: false,
    anoLetivo: '2026',
    descricao: 'Feriado Nacional de Finados.',
    publicoAlvo: 'Toda a Escola',
  },
  {
    id: 'cal-2026-21',
    titulo: 'Proclamação da República',
    tipo: 'feriado',
    dataInicio: '2026-11-15',
    temAula: false,
    anoLetivo: '2026',
    descricao: 'Feriado Nacional.',
    publicoAlvo: 'Toda a Escola',
  },
  {
    id: 'cal-2026-22',
    titulo: 'Dia Nacional de Zumbi e da Consciência Negra',
    tipo: 'feriado',
    dataInicio: '2026-11-20',
    temAula: false,
    anoLetivo: '2026',
    descricao: 'Feriado Nacional da Consciência Negra.',
    publicoAlvo: 'Toda a Escola',
  },

  // DEZEMBRO
  {
    id: 'cal-2026-23',
    titulo: 'Encerramento do Ano Letivo & Formatura',
    tipo: 'evento_escolar',
    dataInicio: '2026-12-15',
    temAula: true,
    anoLetivo: '2026',
    horario: '18:00',
    descricao: 'Último dia de atividades do ano letivo de 2026 e cerimônia de formatura.',
    publicoAlvo: 'Toda a Escola',
  },
  {
    id: 'cal-2026-24',
    titulo: 'Recesso Escolar de Fim de Ano & Natal',
    tipo: 'recesso',
    dataInicio: '2026-12-16',
    dataFim: '2026-12-31',
    temAula: false,
    anoLetivo: '2026',
    descricao: 'Férias de fim de ano e Natal. Boas Festas!',
    publicoAlvo: 'Toda a Escola',
  },
];

/**
 * Verifica se uma data específica (YYYY-MM-DD) é abrangida por um evento.
 */
export function isDataNoEvento(dataIso: string, evento: EventoCalendarioEscolar): boolean {
  if (!evento.dataFim) {
    return evento.dataInicio === dataIso;
  }
  return dataIso >= evento.dataInicio && dataIso <= evento.dataFim;
}

/**
 * Retorna todos os eventos que ocorrem em uma data específica.
 */
export function getEventosNaData(
  dataIso: string,
  eventos: EventoCalendarioEscolar[]
): EventoCalendarioEscolar[] {
  return eventos.filter((ev) => isDataNoEvento(dataIso, ev));
}

/**
 * Retorna o evento que determina que o dia NÃO tem aula, ou null caso haja aula normal.
 */
export function getDiaSemAula(
  dataIso: string,
  eventos: EventoCalendarioEscolar[]
): EventoCalendarioEscolar | null {
  const eventosDoDia = getEventosNaData(dataIso, eventos);
  const semAula = eventosDoDia.find((ev) => ev.temAula === false);
  return semAula || null;
}
