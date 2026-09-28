import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TurmaConfig } from '@/types/finance';
import { DEFAULT_TURMAS_CONFIG } from '@/constants/turmas';
import { PlanejamentoAulaItem } from '@/types/pedagogico';
import { Aluno } from '@/types/aluno';
import {
  format,
  isSameDay,
  parseISO,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  isToday,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  Search,
  Trash2,
  Edit,
  GraduationCap,
  ClipboardList,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  School,
  FileCheck,
  CheckSquare2,
  Calendar as CalendarIcon,
  CalendarX,
  PartyPopper,
  ListOrdered,
  LayoutGrid,
  Info,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  EventoCalendarioEscolar,
  DEFAULT_EVENTOS_CALENDARIO_2026,
  getDiaSemAula,
  getEventosNaData,
  isDataNoEvento,
  TIPO_EVENTO_CONFIG,
} from '@/types/calendarioEscolar';

export interface TeacherActivity {
  id: string;
  title: string;
  type: 'aula' | 'tarefa' | 'prova' | 'trabalho' | 'reuniao';
  turma: string;
  materia: string;
  data: string; // YYYY-MM-DD
  horario: string; // e.g. "08:00 - 09:30"
  descricao: string;
  status: 'pendente' | 'em_andamento' | 'concluida';
  createdAt: string;
}

const TYPE_CONFIG: Record<
  TeacherActivity['type'],
  { label: string; badgeClass: string; icon: React.ElementType }
> = {
  aula: {
    label: 'Aula / Conteúdo',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200',
    icon: BookOpen,
  },
  tarefa: {
    label: 'Tarefa de Casa',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200',
    icon: ClipboardList,
  },
  prova: {
    label: 'Prova / Avaliação',
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200',
    icon: FileCheck,
  },
  trabalho: {
    label: 'Trabalho / Projeto',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200',
    icon: Sparkles,
  },
  reuniao: {
    label: 'Reunião / Coordenação',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200',
    icon: CalendarDays,
  },
};

const MATERIAS_LIST = [
  'Língua Portuguesa',
  'Matemática',
  'Ciências',
  'História',
  'Geografia',
  'Artes',
  'Educação Física',
  'Língua Inglesa',
  'Ensino Religioso',
  'Redação',
  'Geral / Todas',
];

const DEFAULT_INITIAL_PLANOS: PlanejamentoAulaItem[] = [
  {
    id: 'plan-demo-1',
    turmaId: 'turma-5ano-a',
    turmaNome: '5º Ano A',
    disciplinaId: 'mat-2',
    disciplinaNome: 'Matemática',
    cicloId: 'b3',
    cicloNome: '3º Bimestre',
    dataPrevista: '2026-09-24', // Data passada: planejamento atrasado!
    horario: '07:30 - 09:10',
    titulo: 'Frações Equivalentes e Reta Numérica',
    objetivosBncc: 'EF05MA03 - Identificar e representar frações equivalentes.',
    conteudoProgramatico: 'Conceito de frações equivalentes e resolução de problemas.',
    metodologia: 'Oficina prática com tiras de frações.',
    status: 'Planejada', // Pendente de data anterior = ATRASADA!
  },
  {
    id: 'plan-demo-2',
    turmaId: 'turma-5ano-a',
    turmaNome: '5º Ano A',
    disciplinaId: 'his-1',
    disciplinaNome: 'História',
    cicloId: 'b3',
    cicloNome: '3º Bimestre',
    dataPrevista: '2026-09-25',
    horario: '08:20 - 10:00',
    titulo: 'Os Povos Originários do Brasil',
    objetivosBncc: 'EF05HI01 - Identificar processos de formação cultural.',
    conteudoProgramatico: 'Cultura, línguas e tradições indígenas.',
    metodologia: 'Roda de conversa com mapas históricos.',
    status: 'Executada',
  },
  {
    id: 'plan-demo-3',
    turmaId: 'turma-1ano-a',
    turmaNome: '1º Ano A',
    disciplinaId: 'port-1',
    disciplinaNome: 'Língua Portuguesa',
    cicloId: 'b3',
    cicloNome: '3º Bimestre',
    dataPrevista: '2026-09-28', // Hoje
    horario: '07:30 - 09:10',
    titulo: 'Leitura Compartilhada e Alfabeto Lúdico',
    objetivosBncc: 'EF01LP01 - Reconhecer sistema de escrita alfabética.',
    conteudoProgramatico: 'Exploração de cantiga de roda e alfabeto móvel.',
    metodologia: 'Contação de histórias e brincadeiras de rimas.',
    status: 'Planejada',
  },
];

const DEFAULT_INITIAL_ACTIVITIES: TeacherActivity[] = [
  {
    id: 'act-demo-1',
    title: 'Frações Equivalentes e Reta Numérica',
    type: 'aula',
    turma: '5º Ano A',
    materia: 'Matemática',
    data: '2026-09-24', // Data passada = ATRASADA!
    horario: '07:30 - 09:10',
    descricao: 'Frações equivalentes e desafios com material concreto.',
    status: 'pendente',
    createdAt: '2026-09-24T07:30:00Z',
  },
  {
    id: 'act-demo-2',
    title: 'Os Povos Originários do Brasil',
    type: 'aula',
    turma: '5º Ano A',
    materia: 'História',
    data: '2026-09-25',
    horario: '08:20 - 10:00',
    descricao: 'Cultura e tradições indígenas.',
    status: 'concluida',
    createdAt: '2026-09-25T08:20:00Z',
  },
  {
    id: 'act-demo-3',
    title: 'Leitura Compartilhada e Alfabeto Lúdico',
    type: 'aula',
    turma: '1º Ano A',
    materia: 'Língua Portuguesa',
    data: '2026-09-28',
    horario: '07:30 - 09:10',
    descricao: 'Exploração de cantigas e montagem de palavras.',
    status: 'pendente',
    createdAt: '2026-09-28T07:30:00Z',
  },
  {
    id: 'act-demo-4',
    title: 'O Ciclo da Água na Natureza',
    type: 'aula',
    turma: '1º Ano A',
    materia: 'Ciências',
    data: '2026-09-28',
    horario: '09:30 - 11:10',
    descricao: 'Experimento prático sobre evaporação e chuva.',
    status: 'pendente',
    createdAt: '2026-09-28T09:30:00Z',
  },
  {
    id: 'act-demo-5',
    title: 'Resolução de Problemas e Contagem',
    type: 'aula',
    turma: '1º Ano A',
    materia: 'Matemática',
    data: '2026-09-29',
    horario: '07:30 - 09:10',
    descricao: 'Operações fundamentais com jogos de dados.',
    status: 'pendente',
    createdAt: '2026-09-29T07:30:00Z',
  },
];

export const TeacherDashboard: React.FC = () => {
  // Sincronização 100% com os dados reais do Planejamento e Diário de Classe
  const [planosAula, setPlanosAula] = useLocalStorage<PlanejamentoAulaItem[]>(
    'escolinha_planos_aula_v1',
    DEFAULT_INITIAL_PLANOS
  );

  const [professorAtividades, setProfessorAtividades] = useLocalStorage<TeacherActivity[]>(
    'escolinha_professor_atividades_v1',
    DEFAULT_INITIAL_ACTIVITIES
  );

  const [turmas] = useLocalStorage<TurmaConfig[]>(
    'escolinha_turmas_v3',
    DEFAULT_TURMAS_CONFIG
  );

  const [alunos] = useLocalStorage<Aluno[]>('escolinha_alunos', []);

  // Extrai turmas reais cadastradas na escola
  const availableTurmas = useMemo(() => {
    const list: string[] = [];
    turmas.forEach((t) => {
      const letters = t.letras && t.letras.length > 0 ? t.letras : ['A'];
      letters.forEach((l) => {
        list.push(`${t.nome} ${l}`.trim());
      });
    });
    if (!list.includes('Geral')) list.push('Geral');
    return Array.from(new Set(list));
  }, [turmas]);

  // Unifica dados verídicos: Planos de Aula do Planejamento + Atividades Registradas
  const activities = useMemo<TeacherActivity[]>(() => {
    const fromPlanos: TeacherActivity[] = planosAula.map((p) => {
      const isProva = p.titulo.toLowerCase().includes('prova') || p.titulo.toLowerCase().includes('avaliação');
      const isTrabalho = p.titulo.toLowerCase().includes('trabalho') || p.titulo.toLowerCase().includes('projeto');
      const isTarefa = !!p.tarefaCasa && !isProva && !isTrabalho;
      const type: TeacherActivity['type'] = isProva ? 'prova' : isTrabalho ? 'trabalho' : isTarefa ? 'tarefa' : 'aula';

      return {
        id: p.id,
        title: p.titulo,
        type,
        turma: p.turmaNome || p.turmaId || availableTurmas[0] || '1º Ano A',
        materia: p.disciplinaNome || 'Geral',
        data: p.dataPrevista,
        horario: p.horario || '07:30 - 09:10',
        descricao: p.conteudoProgramatico || p.metodologia || '',
        status:
          p.status === 'Executada'
            ? 'concluida'
            : p.status === 'Em Andamento'
            ? 'em_andamento'
            : 'pendente',
        createdAt: p.dataPrevista || new Date().toISOString(),
      };
    });

    const planoIds = new Set(fromPlanos.map((p) => p.id));
    const extraActivities = professorAtividades.filter((a) => !planoIds.has(a.id));

    return [...fromPlanos, ...extraActivities].sort((a, b) => {
      const dateA = a.data ? parseISO(a.data).getTime() : 0;
      const dateB = b.data ? parseISO(b.data).getTime() : 0;
      return dateB - dateA;
    });
  }, [planosAula, professorAtividades, availableTurmas]);

  // Calendar State
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [filterTurma, setFilterTurma] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Estado do Calendário em formato de Lista
  const [calendarViewMode, setCalendarViewMode] = useState<'list' | 'grid'>('list');
  const [calendarRangeMode, setCalendarRangeMode] = useState<'week' | 'biweekly' | 'month'>('biweekly');
  const [calendarBaseDate, setCalendarBaseDate] = useState<Date>(new Date());
  const [filterDiasStatus, setFilterDiasStatus] = useState<'all' | 'sem_aula' | 'com_aula' | 'atrasados'>('all');

  const hojeIso = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // Integração com o Calendário Escolar Oficial
  const [calendarioEventos] = useLocalStorage<EventoCalendarioEscolar[]>(
    'escolinha_calendario_escolar_v1',
    DEFAULT_EVENTOS_CALENDARIO_2026
  );

  // Intervalo de dias para a exibição em lista (mostrando dia após dia)
  const diasLista = useMemo(() => {
    let start: Date;
    let end: Date;

    if (calendarRangeMode === 'week') {
      start = startOfWeek(calendarBaseDate, { weekStartsOn: 1 }); // Segunda-feira
      end = endOfWeek(calendarBaseDate, { weekStartsOn: 1 });     // Domingo
    } else if (calendarRangeMode === 'month') {
      start = startOfMonth(calendarBaseDate);
      end = endOfMonth(calendarBaseDate);
    } else {
      // 'biweekly': 4 dias no passado e 9 dias no futuro para ampla visão
      start = subDays(calendarBaseDate, 4);
      end = addDays(calendarBaseDate, 9);
    }

    return eachDayOfInterval({ start, end });
  }, [calendarBaseDate, calendarRangeMode]);

  const handlePrevPeriod = () => {
    if (calendarRangeMode === 'week') {
      setCalendarBaseDate((prev) => subWeeks(prev, 1));
    } else if (calendarRangeMode === 'month') {
      setCalendarBaseDate((prev) => subMonths(prev, 1));
    } else {
      setCalendarBaseDate((prev) => subDays(prev, 14));
    }
  };

  const handleNextPeriod = () => {
    if (calendarRangeMode === 'week') {
      setCalendarBaseDate((prev) => addWeeks(prev, 1));
    } else if (calendarRangeMode === 'month') {
      setCalendarBaseDate((prev) => addMonths(prev, 1));
    } else {
      setCalendarBaseDate((prev) => addDays(prev, 14));
    }
  };

  const handleGoToday = () => {
    const today = new Date();
    setCalendarBaseDate(today);
    setSelectedDate(today);
  };

  const rangeLabel = useMemo(() => {
    if (calendarRangeMode === 'month') {
      return format(calendarBaseDate, "MMMM 'de' yyyy", { locale: ptBR });
    }
    if (diasLista.length > 0) {
      const first = diasLista[0];
      const last = diasLista[diasLista.length - 1];
      return `${format(first, "dd 'de' MMM", { locale: ptBR })} a ${format(last, "dd 'de' MMM", { locale: ptBR })}`;
    }
    return format(calendarBaseDate, "MMMM 'de' yyyy", { locale: ptBR });
  }, [calendarBaseDate, calendarRangeMode, diasLista]);

  // Contagem de dias com atraso ou sem aula no intervalo ativo
  const diasSummaryStats = useMemo(() => {
    let diasSemAulaCount = 0;
    let diasComAtrasoCount = 0;

    diasLista.forEach((dia) => {
      const diaIso = format(dia, 'yyyy-MM-dd');
      const diaSemAula = getDiaSemAula(diaIso, calendarioEventos);
      const eventosDoDia = getEventosNaData(diaIso, calendarioEventos);
      const isFimDeSemana = isWeekend(dia);
      const temSabadoLetivo = eventosDoDia.some((e) => e.temAula === true && e.tipo === 'letivo_especial');
      const naoTemAula = !!diaSemAula || eventosDoDia.some((e) => e.temAula === false) || (isFimDeSemana && !temSabadoLetivo);
      if (naoTemAula) diasSemAulaCount++;

      const isPast = diaIso < hojeIso;
      if (isPast) {
        const ativs = activities.filter((a) => a.data === diaIso);
        const plans = planosAula.filter((p) => p.dataPrevista === diaIso);
        const hasAtraso =
          ativs.some((a) => a.status === 'pendente' || a.status === 'em_andamento') ||
          plans.some((p) => p.status === 'Planejada' || p.status === 'Em Andamento');
        if (hasAtraso) diasComAtrasoCount++;
      }
    });

    return { diasSemAulaCount, diasComAtrasoCount };
  }, [diasLista, calendarioEventos, activities, planosAula, hojeIso]);

  const diaSemAulaSelected = useMemo(() => {
    if (!selectedDate) return null;
    const iso = format(selectedDate, 'yyyy-MM-dd');
    return getDiaSemAula(iso, calendarioEventos);
  }, [selectedDate, calendarioEventos]);

  const eventosSelected = useMemo(() => {
    if (!selectedDate) return [];
    const iso = format(selectedDate, 'yyyy-MM-dd');
    return getEventosNaData(iso, calendarioEventos);
  }, [selectedDate, calendarioEventos]);

  const proximosEventos = useMemo(() => {
    const hojeIso = format(new Date(), 'yyyy-MM-dd');
    return calendarioEventos
      .filter((ev) => (ev.dataFim || ev.dataInicio) >= hojeIso)
      .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio))
      .slice(0, 3);
  }, [calendarioEventos]);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editingActivity, setEditingActivity] = useState<TeacherActivity | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    type: 'aula' as TeacherActivity['type'],
    turma: availableTurmas[0] || '1º Ano A',
    materia: 'Língua Portuguesa',
    data: format(new Date(), 'yyyy-MM-dd'),
    horario: '07:30 - 09:10',
    descricao: '',
    status: 'pendente' as TeacherActivity['status'],
  });

  // Conjunto de datas que possuem atividades reais cadastradas
  const activityDatesSet = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((act) => {
      if (act.data) {
        set.add(act.data);
      }
    });
    return set;
  }, [activities]);

  // Atividades filtradas por data e controles
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      // Filtro de data
      if (selectedDate) {
        if (!act.data) return false;
        const actDate = parseISO(act.data);
        if (!isSameDay(actDate, selectedDate)) {
          return false;
        }
      }

      // Filtro de Turma
      if (filterTurma !== 'all' && act.turma !== filterTurma) {
        return false;
      }

      // Filtro de Tipo
      if (filterType !== 'all' && act.type !== filterType) {
        return false;
      }

      // Filtro de Status
      if (filterStatus !== 'all' && act.status !== filterStatus) {
        return false;
      }

      // Busca textual
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesTitle = act.title.toLowerCase().includes(q);
        const matchesDesc = act.descricao.toLowerCase().includes(q);
        const matchesMateria = act.materia.toLowerCase().includes(q);
        const matchesTurma = act.turma.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesMateria && !matchesTurma) {
          return false;
        }
      }

      return true;
    });
  }, [activities, selectedDate, filterTurma, filterType, filterStatus, searchQuery]);

  // Estatísticas Reais
  const stats = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayCount = activities.filter((a) => a.data === todayStr).length;
    const pendingCount = activities.filter((a) => a.status !== 'concluida').length;
    const completedCount = activities.filter((a) => a.status === 'concluida').length;

    // Turmas reais ativas que possuem alunos ou atividades
    const turmasComAlunos = new Set(
      alunos.filter((a) => a.status === 'Ativo').map((a) => `${a.classe || ''} ${a.turma || ''}`.trim()).filter(Boolean)
    );
    const turmasComAtividades = new Set(activities.map((a) => a.turma).filter(Boolean));
    const allUniqueTurmas = new Set([...Array.from(turmasComAlunos), ...Array.from(turmasComAtividades)]);
    const turmasCount = allUniqueTurmas.size > 0 ? allUniqueTurmas.size : availableTurmas.length;

    return {
      todayCount,
      pendingCount,
      completedCount,
      turmasCount,
    };
  }, [activities, alunos, availableTurmas]);

  // Alterna status da atividade (sincronizando no planejamento real)
  const handleToggleStatus = (id: string) => {
    const isPlano = planosAula.some((p) => p.id === id);

    if (isPlano) {
      setPlanosAula((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            const nextStatus = p.status === 'Executada' ? 'Planejada' : 'Executada';
            toast.success(
              nextStatus === 'Executada'
                ? 'Aula marcada como Executada!'
                : 'Aula marcada como Planejada.'
            );
            return { ...p, status: nextStatus };
          }
          return p;
        })
      );
    } else {
      setProfessorAtividades((prev) =>
        prev.map((act) => {
          if (act.id === id) {
            const nextStatus = act.status === 'concluida' ? 'pendente' : 'concluida';
            toast.success(
              nextStatus === 'concluida'
                ? 'Atividade marcada como concluída!'
                : 'Atividade reaberta como pendente.'
            );
            return { ...act, status: nextStatus };
          }
          return act;
        })
      );
    }
  };

  // Abrir modal de criação
  const handleOpenCreate = () => {
    setEditingActivity(null);
    setFormData({
      title: '',
      type: 'aula',
      turma: availableTurmas[0] || '1º Ano A',
      materia: 'Língua Portuguesa',
      data: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      horario: '07:30 - 09:10',
      descricao: '',
      status: 'pendente',
    });
    setIsDialogOpen(true);
  };

  // Abrir modal de edição
  const handleOpenEdit = (act: TeacherActivity) => {
    setEditingActivity(act);
    setFormData({
      title: act.title,
      type: act.type,
      turma: act.turma,
      materia: act.materia,
      data: act.data,
      horario: act.horario,
      descricao: act.descricao,
      status: act.status,
    });
    setIsDialogOpen(true);
  };

  // Excluir atividade (sincronizado)
  const handleDeleteActivity = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta atividade?')) {
      setPlanosAula((prev) => prev.filter((p) => p.id !== id));
      setProfessorAtividades((prev) => prev.filter((a) => a.id !== id));
      toast.success('Atividade removida com sucesso!');
    }
  };

  // Salvar atividade com sincronização mútua no Planejamento
  const handleSaveActivity = () => {
    if (!formData.title.trim()) {
      toast.error('Informe o título da atividade.');
      return;
    }

    if (editingActivity) {
      // Atualiza em planosAula se existir
      setPlanosAula((prev) =>
        prev.map((p) =>
          p.id === editingActivity.id
            ? {
                ...p,
                titulo: formData.title,
                turmaNome: formData.turma,
                disciplinaNome: formData.materia,
                dataPrevista: formData.data,
                horario: formData.horario,
                conteudoProgramatico: formData.descricao,
                status: formData.status === 'concluida' ? 'Executada' : formData.status === 'em_andamento' ? 'Em Andamento' : 'Planejada',
              }
            : p
        )
      );

      // Atualiza em professorAtividades
      setProfessorAtividades((prev) =>
        prev.map((a) =>
          a.id === editingActivity.id
            ? {
                ...a,
                ...formData,
              }
            : a
        )
      );

      toast.success('Atividade atualizada com sucesso no painel e planejamento!');
    } else {
      const generatedId = `act-${Date.now()}`;

      const newAct: TeacherActivity = {
        id: generatedId,
        ...formData,
        createdAt: new Date().toISOString(),
      };

      // Cria também o plano de aula para que o Diário de Classe tenha o mesmo registro verídico
      const newPlano: PlanejamentoAulaItem = {
        id: generatedId,
        turmaId: formData.turma,
        turmaNome: formData.turma,
        disciplinaId: 'mat-gen',
        disciplinaNome: formData.materia,
        cicloId: 'b1',
        cicloNome: 'Ciclo Vigente',
        dataPrevista: formData.data,
        horario: formData.horario,
        titulo: formData.title,
        conteudoProgramatico: formData.descricao,
        status: formData.status === 'concluida' ? 'Executada' : formData.status === 'em_andamento' ? 'Em Andamento' : 'Planejada',
      };

      setProfessorAtividades((prev) => [newAct, ...prev]);
      setPlanosAula((prev) => [newPlano, ...prev]);
      toast.success('Nova atividade registrada no painel e no planejamento!');
    }

    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header com Atalhos Pedagógicos Rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link to="/app/pedagogico?tab=diario" className="group">
          <Card className="hover:border-primary/50 hover:shadow-sm transition-all bg-card/60">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    Diário de Classe
                  </p>
                  <p className="text-[11px] text-muted-foreground">Chamada & Faltas</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/app/pedagogico?tab=planejamento" className="group">
          <Card className="hover:border-primary/50 hover:shadow-sm transition-all bg-card/60">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    Planejamento
                  </p>
                  <p className="text-[11px] text-muted-foreground">Planos de Aula</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/app/pedagogico?tab=avaliacoes" className="group">
          <Card className="hover:border-primary/50 hover:shadow-sm transition-all bg-card/60">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                  <FileCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    Avaliações & Notas
                  </p>
                  <p className="text-[11px] text-muted-foreground">Lançar Notas</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/app/pedagogico?tab=turmas" className="group">
          <Card className="hover:border-primary/50 hover:shadow-sm transition-all bg-card/60">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    Turmas & Horários
                  </p>
                  <p className="text-[11px] text-muted-foreground">Quadro de Horários</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Cards de Resumo da Rotina do Professor (Dados Verídicos) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Atividades Hoje
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <CalendarIcon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {stats.todayCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Agendadas no cronograma para hoje
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pendentes
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.pendingCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Aulas e tarefas a realizar
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Concluídas / Executadas
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.completedCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Aulas ministradas no período
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Minhas Turmas
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <School className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
              {stats.turmasCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Turmas com cronograma ativo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid Principal: Calendário do Professor (Esquerda) + Lista de Atividades (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: CALENDÁRIO EM FORMATO DE LISTA (DIA A DIA) */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    Calendário do Professor
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Cronograma dia a dia com eventos escolares e status das aulas
                  </CardDescription>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  {/* Alternador de Visualização: Lista Dia a Dia vs Grade Mensal */}
                  <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex items-center border border-slate-200 dark:border-slate-700">
                    <Button
                      variant={calendarViewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      className={`h-7 text-xs px-2 gap-1 ${
                        calendarViewMode === 'list'
                          ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-2xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                      onClick={() => setCalendarViewMode('list')}
                    >
                      <ListOrdered size={13} /> Lista Dia a Dia
                    </Button>
                    <Button
                      variant={calendarViewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      className={`h-7 text-xs px-2 gap-1 ${
                        calendarViewMode === 'grid'
                          ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-2xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                      onClick={() => setCalendarViewMode('grid')}
                    >
                      <LayoutGrid size={13} /> Grade
                    </Button>
                  </div>

                  {selectedDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDate(undefined)}
                      className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Ver Todas
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3.5">
              {/* Barra de Navegação do Cronograma */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 cursor-pointer"
                    onClick={handlePrevPeriod}
                    title="Período anterior"
                  >
                    <ChevronLeft size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5 font-medium cursor-pointer"
                    onClick={handleGoToday}
                  >
                    Hoje
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 cursor-pointer"
                    onClick={handleNextPeriod}
                    title="Próximo período"
                  >
                    <ChevronRight size={14} />
                  </Button>

                  <span className="font-bold text-xs capitalize text-slate-800 dark:text-slate-200 ml-1">
                    {rangeLabel}
                  </span>
                </div>

                {calendarViewMode === 'list' && (
                  <div className="flex items-center gap-1 self-start sm:self-auto">
                    <Button
                      variant={calendarRangeMode === 'week' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-6 text-[11px] px-2"
                      onClick={() => setCalendarRangeMode('week')}
                    >
                      7 Dias
                    </Button>
                    <Button
                      variant={calendarRangeMode === 'biweekly' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-6 text-[11px] px-2"
                      onClick={() => setCalendarRangeMode('biweekly')}
                    >
                      14 Dias
                    </Button>
                    <Button
                      variant={calendarRangeMode === 'month' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-6 text-[11px] px-2"
                      onClick={() => setCalendarRangeMode('month')}
                    >
                      Mês
                    </Button>
                  </div>
                )}
              </div>

              {/* Filtros rápidos dos dias da lista */}
              {calendarViewMode === 'list' && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <Button
                    variant={filterDiasStatus === 'all' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setFilterDiasStatus('all')}
                    className="h-6 text-[11px] px-2 rounded-full cursor-pointer"
                  >
                    Todos ({diasLista.length})
                  </Button>
                  <Button
                    variant={filterDiasStatus === 'com_aula' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setFilterDiasStatus('com_aula')}
                    className="h-6 text-[11px] px-2 rounded-full cursor-pointer text-emerald-700 dark:text-emerald-400"
                  >
                    Com Aula ({diasLista.length - diasSummaryStats.diasSemAulaCount})
                  </Button>
                  <Button
                    variant={filterDiasStatus === 'sem_aula' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setFilterDiasStatus('sem_aula')}
                    className="h-6 text-[11px] px-2 rounded-full cursor-pointer text-slate-600 dark:text-slate-400"
                  >
                    Sem Aula (Cinza) ({diasSummaryStats.diasSemAulaCount})
                  </Button>
                  <Button
                    variant={filterDiasStatus === 'atrasados' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setFilterDiasStatus('atrasados')}
                    className={`h-6 text-[11px] px-2 rounded-full cursor-pointer ${
                      diasSummaryStats.diasComAtrasoCount > 0
                        ? 'text-rose-700 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800'
                        : 'text-slate-500'
                    }`}
                  >
                    Atrasados (Borda Vermelha) ({diasSummaryStats.diasComAtrasoCount})
                  </Button>
                </div>
              )}

              {/* ================= MODO LISTA: DIA A DIA ================= */}
              {calendarViewMode === 'list' && (
                <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                  {diasLista
                    .filter((dia) => {
                      const diaIso = format(dia, 'yyyy-MM-dd');
                      const isPast = diaIso < hojeIso;
                      const diaSemAula = getDiaSemAula(diaIso, calendarioEventos);
                      const eventosDoDia = getEventosNaData(diaIso, calendarioEventos);
                      const isFimDeSemana = isWeekend(dia);
                      const temSabadoLetivo = eventosDoDia.some(
                        (e) => e.temAula === true && e.tipo === 'letivo_especial'
                      );
                      const naoTemAula =
                        !!diaSemAula ||
                        eventosDoDia.some((e) => e.temAula === false) ||
                        (isFimDeSemana && !temSabadoLetivo);

                      const ativs = activities.filter((a) => a.data === diaIso);
                      const plans = planosAula.filter((p) => p.dataPrevista === diaIso);
                      const temAtraso =
                        isPast &&
                        (ativs.some((a) => a.status === 'pendente' || a.status === 'em_andamento') ||
                          plans.some((p) => p.status === 'Planejada' || p.status === 'Em Andamento'));

                      if (filterDiasStatus === 'sem_aula') return naoTemAula;
                      if (filterDiasStatus === 'com_aula') return !naoTemAula;
                      if (filterDiasStatus === 'atrasados') return temAtraso;
                      return true;
                    })
                    .map((dia) => {
                      const diaIso = format(dia, 'yyyy-MM-dd');
                      const isCurrent = isToday(dia);
                      const isSelected = selectedDate ? isSameDay(dia, selectedDate) : false;
                      const isPast = diaIso < hojeIso;

                      // Eventos Escolares & Sem Aula
                      const diaSemAula = getDiaSemAula(diaIso, calendarioEventos);
                      const eventosDoDia = getEventosNaData(diaIso, calendarioEventos);
                      const isFimDeSemana = isWeekend(dia);
                      const temSabadoLetivo = eventosDoDia.some(
                        (e) => e.temAula === true && e.tipo === 'letivo_especial'
                      );
                      const temEventoSemAula =
                        !!diaSemAula || eventosDoDia.some((e) => e.temAula === false);

                      // REQUISITO: "se n tiver aula vai ser cinza"
                      const naoTemAula = temEventoSemAula || (isFimDeSemana && !temSabadoLetivo);

                      // Atividades & Planejamento do Dia
                      const atividadesDoDia = activities.filter((a) => a.data === diaIso);
                      const planosDoDia = planosAula.filter((p) => p.dataPrevista === diaIso);

                      // REQUISITO: "e caso tenha um planejamento atrasado ficara com a borda vermelha"
                      const atividadesAtrasadas = isPast
                        ? atividadesDoDia.filter(
                            (a) => a.status === 'pendente' || a.status === 'em_andamento'
                          )
                        : [];
                      const planosAtrasados = isPast
                        ? planosDoDia.filter(
                            (p) => p.status === 'Planejada' || p.status === 'Em Andamento'
                          )
                        : [];
                      const temPlanejamentoAtrasado =
                        atividadesAtrasadas.length > 0 || planosAtrasados.length > 0;
                      const qtdAtrasados = Math.max(
                        atividadesAtrasadas.length,
                        planosAtrasados.length
                      );

                      // Determinação das Classes de Estilo
                      let cardStyleClasses =
                        'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100';

                      if (naoTemAula) {
                        // Cinza quando não tem aula
                        cardStyleClasses =
                          'border-slate-300 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400';
                      }

                      if (isSelected && !temPlanejamentoAtrasado) {
                        cardStyleClasses =
                          'border-2 border-purple-600 dark:border-purple-500 bg-purple-50/30 dark:bg-purple-950/20 text-slate-900 dark:text-slate-100 shadow-xs';
                      }

                      if (temPlanejamentoAtrasado) {
                        // Borda vermelha marcante quando tem planejamento atrasado!
                        cardStyleClasses = `border-2 border-rose-500 dark:border-rose-500 ${
                          naoTemAula
                            ? 'bg-slate-100/90 dark:bg-slate-900/60'
                            : 'bg-rose-50/20 dark:bg-rose-950/10'
                        } shadow-sm shadow-rose-100 dark:shadow-rose-950/30 ${
                          isSelected ? 'ring-2 ring-rose-400' : ''
                        }`;
                      }

                      return (
                        <div
                          key={diaIso}
                          onClick={() => setSelectedDate(dia)}
                          className={`p-3.5 rounded-xl transition-all cursor-pointer border text-xs space-y-2.5 hover:shadow-xs ${cardStyleClasses}`}
                        >
                          {/* Cabeçalho do Dia */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Box / Avatar da Data */}
                              <div
                                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border transition-all ${
                                  isCurrent
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                    : temPlanejamentoAtrasado
                                    ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800 font-bold'
                                    : naoTemAula
                                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <span className="text-[10px] font-bold tracking-wider leading-none uppercase">
                                  {format(dia, 'EEE', { locale: ptBR }).replace('.', '')}
                                </span>
                                <span className="text-base font-extrabold leading-none mt-0.5">
                                  {format(dia, 'dd')}
                                </span>
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-bold text-xs sm:text-sm capitalize text-slate-900 dark:text-slate-100">
                                    {format(dia, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                                  </span>

                                  {isCurrent && (
                                    <Badge className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] px-1.5 py-0 h-4 font-semibold">
                                      Hoje
                                    </Badge>
                                  )}

                                  {naoTemAula && (
                                    <Badge
                                      variant="outline"
                                      className="bg-slate-200/90 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700 text-[10px] px-1.5 py-0 h-4 font-semibold"
                                    >
                                      Sem Aula
                                    </Badge>
                                  )}

                                  {temPlanejamentoAtrasado && (
                                    <Badge className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800 text-[10px] px-1.5 py-0 h-4 font-bold flex items-center gap-1 animate-pulse">
                                      <AlertTriangle size={10} className="stroke-[2.5]" />
                                      {qtdAtrasados > 1
                                        ? `${qtdAtrasados} Atrasados`
                                        : 'Planejamento Atrasado'}
                                    </Badge>
                                  )}
                                </div>

                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {diaSemAula
                                    ? `Motivo: ${diaSemAula.titulo}`
                                    : isFimDeSemana && !temSabadoLetivo
                                    ? 'Fim de semana letivo inativo'
                                    : atividadesDoDia.length > 0
                                    ? `${atividadesDoDia.length} aula(s)/atividade(s) no cronograma`
                                    : 'Dia letivo regular'}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              {isSelected && (
                                <span className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold bg-purple-100/80 dark:bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                                  Ativo
                                </span>
                              )}
                            </div>
                          </div>

                          {/* REQUISITO: "dentro dos dias vai ter eventos" */}
                          {eventosDoDia.length > 0 && (
                            <div className="space-y-1 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60">
                              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                                <PartyPopper size={11} className="text-purple-600" />
                                <span>Eventos Escolares ({eventosDoDia.length}):</span>
                              </div>

                              <div className="space-y-1">
                                {eventosDoDia.map((ev) => {
                                  const cfg = TIPO_EVENTO_CONFIG[ev.tipo];
                                  return (
                                    <div
                                      key={ev.id}
                                      className={`p-1.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                                        !ev.temAula
                                          ? 'bg-rose-50/80 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900'
                                          : 'bg-purple-50/80 text-purple-900 border-purple-200 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-900'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span
                                          className={`w-2 h-2 rounded-full shrink-0 ${
                                            !ev.temAula ? 'bg-rose-500' : 'bg-purple-500'
                                          }`}
                                        />
                                        <span className="font-semibold truncate">{ev.titulo}</span>
                                        {ev.horario && (
                                          <span className="text-[10px] opacity-75 shrink-0 hidden sm:inline">
                                            • {ev.horario}
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        <Badge
                                          variant="outline"
                                          className={`text-[9px] px-1.5 py-0 ${cfg?.badgeColor || ''}`}
                                        >
                                          {cfg?.label || ev.tipo}
                                        </Badge>
                                        {!ev.temAula && (
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] px-1 py-0 bg-rose-100 text-rose-800 border-rose-300"
                                          >
                                            Sem Aula
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Aulas & Atividades do Professor no Dia */}
                          {atividadesDoDia.length > 0 && (
                            <div className="space-y-1 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                  <BookOpen size={11} className="text-primary" />
                                  <span>Aulas & Conteúdos ({atividadesDoDia.length}):</span>
                                </span>
                                <span className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline">
                                  Ver detalhes ao lado →
                                </span>
                              </div>

                              <div className="space-y-1">
                                {atividadesDoDia.slice(0, 3).map((act) => {
                                  const cfg = TYPE_CONFIG[act.type] || TYPE_CONFIG.aula;
                                  const IconComponent = cfg.icon;
                                  const isActAtrasada = isPast && act.status !== 'concluida';

                                  return (
                                    <div
                                      key={act.id}
                                      className={`p-1.5 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all ${
                                        act.status === 'concluida'
                                          ? 'bg-emerald-50/60 text-emerald-900 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900'
                                          : isActAtrasada
                                          ? 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:border-rose-900 font-medium'
                                          : 'bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <IconComponent size={12} className="shrink-0 text-slate-500" />
                                        <span className="text-[10px] font-semibold text-slate-500 shrink-0">
                                          {act.horario ? act.horario.split(' - ')[0] : '07:30'}
                                        </span>
                                        <span className="font-semibold truncate">{act.title}</span>
                                        <Badge
                                          variant="secondary"
                                          className="text-[9px] px-1 py-0 shrink-0 hidden sm:inline"
                                        >
                                          {act.turma}
                                        </Badge>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        {act.status === 'concluida' ? (
                                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] px-1 py-0">
                                            Concluída
                                          </Badge>
                                        ) : isActAtrasada ? (
                                          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[9px] px-1 py-0 font-bold">
                                            Atrasada
                                          </Badge>
                                        ) : (
                                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] px-1 py-0">
                                            Pendente
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}

                                {atividadesDoDia.length > 3 && (
                                  <div className="text-[10px] text-center text-purple-600 dark:text-purple-400 font-medium pt-0.5">
                                    + {atividadesDoDia.length - 3} outra(s) atividade(s)... clique
                                    para ver
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {atividadesDoDia.length === 0 && !naoTemAula && eventosDoDia.length === 0 && (
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 italic pt-0.5">
                              Nenhuma aula agendada neste dia. Clique para adicionar uma atividade.
                            </div>
                          )}

                          {naoTemAula && eventosDoDia.length === 0 && (
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 italic pt-0.5">
                              Final de semana sem atividades letivas programadas.
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* ================= MODO GRADE: MENSAL (OPCIONAL) ================= */}
              {calendarViewMode === 'grid' && (
                <div className="flex flex-col items-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={ptBR}
                    className="rounded-md border shadow-sm w-full max-w-full flex justify-center bg-white dark:bg-slate-950"
                    modifiers={{
                      hasActivity: (date) => activityDatesSet.has(format(date, 'yyyy-MM-dd')),
                      hasSemAula: (date) =>
                        !!getDiaSemAula(format(date, 'yyyy-MM-dd'), calendarioEventos),
                    }}
                    modifiersClassNames={{
                      hasActivity:
                        'font-bold relative after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-primary after:rounded-full',
                      hasSemAula: 'text-rose-600 font-extrabold bg-rose-50/50',
                    }}
                  />
                </div>
              )}

              {/* Legenda Visual Clara das Regras Solicitadas */}
              <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/60 text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Info size={13} className="text-purple-600" />
                    Legenda Visual do Calendário:
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Clique em qualquer dia para carregar suas atividades ao lado
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] pt-0.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-300 dark:bg-slate-800 dark:border-slate-700 inline-block" />
                    <span className="font-medium text-slate-600 dark:text-slate-400">
                      Cinza: Dia Sem Aula (Feriado, Recesso ou FDS)
                    </span>
                  </span>

                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-rose-50 border-2 border-rose-500 inline-block" />
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      Borda Vermelha: Planejamento Atrasado
                    </span>
                  </span>

                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-purple-50 border-2 border-purple-600 inline-block" />
                    <span className="font-medium text-purple-700 dark:text-purple-300">
                      Borda Roxa: Dia Ativo Selecionado
                    </span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Próximos Marcos do Calendário Escolar */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2.5 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-purple-600" />
                Próximos Marcos & Feriados
              </CardTitle>
              <Link
                to="/app/pedagogico?tab=calendario"
                className="text-[11px] text-purple-600 hover:text-purple-800 font-medium"
              >
                Abrir Calendário →
              </Link>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {proximosEventos.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum evento futuro cadastrado.</p>
              ) : (
                proximosEventos.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{ev.titulo}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(parseISO(ev.dataInicio), "dd 'de' MMM", { locale: ptBR })}
                        {ev.dataFim ? ` até ${format(parseISO(ev.dataFim), "dd 'de' MMM", { locale: ptBR })}` : ''}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${
                        !ev.temAula
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-purple-100 text-purple-800 border-purple-300'
                      }`}
                    >
                      {!ev.temAula ? 'Sem Aula' : 'Com Aula'}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Card de Dica Pedagógica */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-purple-50/50 to-indigo-50/30 dark:from-purple-950/20 dark:to-indigo-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-purple-900 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                Integração Diário & Planejamento
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-purple-950/80 dark:text-purple-300/80 leading-relaxed">
              Toda atividade ou conteúdo criado aqui é sincronizado diretamente com o Diário de Classe e o Planejamento Pedagógico. O lançamento de faltas e presenças é feito no Diário.
            </CardContent>
          </Card>
        </div>

        {/* COLUNA DIREITA: LISTA DE ATIVIDADES DO PROFESSOR (SINCRONIZADA) */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-semibold">
                      Lista de Atividades
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs font-normal">
                      {filteredActivities.length} {filteredActivities.length === 1 ? 'item' : 'itens'}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    {selectedDate
                      ? `Exibindo atividades de ${format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}`
                      : 'Exibindo todas as atividades cadastradas'}
                  </CardDescription>
                </div>

                <Button
                  onClick={handleOpenCreate}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 h-8 text-xs shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nova Atividade
                </Button>
              </div>

              {/* Filtros e Busca de Atividades */}
              <div className="pt-3 space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por título, matéria, descrição..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>

                  <Select value={filterTurma} onValueChange={setFilterTurma}>
                    <SelectTrigger className="h-8 text-xs sm:w-44">
                      <SelectValue placeholder="Todas as Turmas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Turmas</SelectItem>
                      {availableTurmas.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-8 text-xs sm:w-36">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="pendente">Pendentes</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluida">Concluídas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro Rápido por Tipo */}
                <div className="flex flex-wrap gap-1 pt-1">
                  <Button
                    variant={filterType === 'all' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setFilterType('all')}
                    className="h-6 text-[11px] px-2 rounded-full"
                  >
                    Todas ({activities.length})
                  </Button>
                  {(Object.keys(TYPE_CONFIG) as TeacherActivity['type'][]).map((typeKey) => {
                    const cfg = TYPE_CONFIG[typeKey];
                    const count = activities.filter((a) => a.type === typeKey).length;
                    return (
                      <Button
                        key={typeKey}
                        variant={filterType === typeKey ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterType(typeKey)}
                        className="h-6 text-[11px] px-2 rounded-full"
                      >
                        {cfg.label} ({count})
                      </Button>
                    );
                  })}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {filteredActivities.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-muted-foreground">
                    <CheckSquare2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Nenhuma atividade encontrada
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      {selectedDate
                        ? `Não há atividades registradas para ${format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}.`
                        : 'Nenhuma atividade coincide com os filtros aplicados.'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenCreate}
                    className="text-xs gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar Atividade Agora
                  </Button>
                </div>
              ) : (
                filteredActivities.map((act) => {
                  const typeCfg = TYPE_CONFIG[act.type] || TYPE_CONFIG.aula;
                  const TypeIcon = typeCfg.icon;
                  const isDone = act.status === 'concluida';

                  return (
                    <div
                      key={act.id}
                      className={`group border rounded-lg p-3.5 transition-all flex items-start gap-3 ${
                        isDone
                          ? 'bg-slate-50/60 dark:bg-slate-900/30 border-slate-200 opacity-75'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/40'
                      }`}
                    >
                      {/* Checkbox de Conclusão */}
                      <div className="pt-0.5">
                        <Checkbox
                          checked={isDone}
                          onCheckedChange={() => handleToggleStatus(act.id)}
                          aria-label="Marcar atividade"
                          className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                      </div>

                      {/* Conteúdo Principal */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 h-4 border flex items-center gap-1 ${typeCfg.badgeClass}`}
                          >
                            <TypeIcon className="h-2.5 w-2.5" />
                            {typeCfg.label}
                          </Badge>

                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {act.turma}
                          </Badge>

                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-slate-600 dark:text-slate-400">
                            {act.materia}
                          </Badge>

                          {act.status === 'concluida' ? (
                            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              Executada
                            </Badge>
                          ) : act.status === 'em_andamento' ? (
                            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              Em Andamento
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                              Pendente
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-baseline justify-between gap-2">
                          <h4
                            className={`text-sm font-semibold text-slate-900 dark:text-slate-100 ${
                              isDone ? 'line-through text-muted-foreground' : ''
                            }`}
                          >
                            {act.title}
                          </h4>
                        </div>

                        {act.descricao && (
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {act.descricao}
                          </p>
                        )}

                        <div className="flex items-center gap-4 pt-1 text-[11px] text-muted-foreground">
                          {act.data && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3 text-slate-400" />
                              {format(parseISO(act.data), "dd/MM/yyyy (EEE)", { locale: ptBR })}
                            </span>
                          )}
                          {act.horario && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {act.horario}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ações de Edição e Exclusão */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(act)}
                          className="h-7 w-7 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          title="Editar atividade"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteActivity(act.id)}
                          className="h-7 w-7 text-slate-400 hover:text-rose-600"
                          title="Excluir atividade"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Criação / Edição de Atividade */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              {editingActivity ? 'Editar Atividade' : 'Nova Atividade Pedagógica'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Preencha os detalhes para agendar no cronograma do professor e no planejamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="act_title" className="text-xs font-semibold">
                Título da Atividade *
              </Label>
              <Input
                id="act_title"
                placeholder="Ex: Aula de Ciências: Sistema Solar"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="act_type" className="text-xs font-semibold">
                  Tipo
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(val) =>
                    setFormData({ ...formData, type: val as TeacherActivity['type'] })
                  }
                >
                  <SelectTrigger id="act_type" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_CONFIG) as TeacherActivity['type'][]).map((typeKey) => (
                      <SelectItem key={typeKey} value={typeKey} className="text-xs">
                        {TYPE_CONFIG[typeKey].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="act_turma" className="text-xs font-semibold">
                  Turma
                </Label>
                <Select
                  value={formData.turma}
                  onValueChange={(val) => setFormData({ ...formData, turma: val })}
                >
                  <SelectTrigger id="act_turma" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTurmas.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="act_materia" className="text-xs font-semibold">
                  Disciplina / Matéria
                </Label>
                <Select
                  value={formData.materia}
                  onValueChange={(val) => setFormData({ ...formData, materia: val })}
                >
                  <SelectTrigger id="act_materia" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAS_LIST.map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="act_status" className="text-xs font-semibold">
                  Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) =>
                    setFormData({ ...formData, status: val as TeacherActivity['status'] })
                  }
                >
                  <SelectTrigger id="act_status" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente" className="text-xs">Pendente</SelectItem>
                    <SelectItem value="em_andamento" className="text-xs">Em Andamento</SelectItem>
                    <SelectItem value="concluida" className="text-xs">Concluída / Executada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="act_data" className="text-xs font-semibold">
                  Data
                </Label>
                <Input
                  id="act_data"
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="act_horario" className="text-xs font-semibold">
                  Horário
                </Label>
                <Input
                  id="act_horario"
                  placeholder="Ex: 07:30 - 09:10"
                  value={formData.horario}
                  onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="act_desc" className="text-xs font-semibold">
                Descrição / Instruções Pedagógicas
              </Label>
              <Textarea
                id="act_desc"
                placeholder="Detalhes dos tópicos abordados, materiais necessários, páginas do livro..."
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveActivity}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
            >
              {editingActivity ? 'Salvar Alterações' : 'Criar Atividade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
