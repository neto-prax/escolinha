import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAuth } from '@/contexts/AuthContext';
import {
  EventoCalendarioEscolar,
  TipoEventoCalendario,
  TIPO_EVENTO_CONFIG,
  DEFAULT_EVENTOS_CALENDARIO_2026,
  OPCOES_PUBLICO_ALVO,
  SEGMENTOS_ESCOLARES,
  normalizePublicoAlvo,
  getEventosNaData,
  getDiaSemAula,
  isDataNoEvento,
} from '@/types/calendarioEscolar';
import { TurmaConfig } from '@/types/finance';
import { DEFAULT_TURMAS_CONFIG } from '@/constants/turmas';
import {
  format,
  parseISO,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isWeekend,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarDays,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Users,
  Edit,
  Trash2,
  RotateCcw,
  Printer,
  Sparkles,
  Info,
  CalendarCheck,
  CalendarX,
  School,
  PartyPopper,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

function formatPeriodoEvento(dataInicio: string, dataFim?: string): string {
  try {
    const [yIni, mIni, dIni] = dataInicio.split('-').map(Number);
    if (!dataFim || dataFim === dataInicio) {
      return `${String(dIni).padStart(2, '0')}/${String(mIni).padStart(2, '0')}`;
    }
    const [yFim, mFim, dFim] = dataFim.split('-').map(Number);
    if (mIni === mFim) {
      return `${String(dIni).padStart(2, '0')} a ${String(dFim).padStart(2, '0')}/${String(mIni).padStart(2, '0')}`;
    }
    return `${String(dIni).padStart(2, '0')}/${String(mIni).padStart(2, '0')} a ${String(dFim).padStart(2, '0')}/${String(mFim).padStart(2, '0')}`;
  } catch {
    return dataInicio;
  }
}

interface CalendarioAnualImpressoProps {
  anoLetivo: string;
  eventos: EventoCalendarioEscolar[];
  escolaNome?: string;
  stats?: {
    total: number;
    semAulaCount: number;
    eventosCulturaisCount: number;
    reunioesCount: number;
    paradasCount: number;
    sabadosLetivosCount: number;
  };
}

export const CalendarioAnualImpresso: React.FC<CalendarioAnualImpressoProps> = ({
  anoLetivo,
  eventos,
  escolaNome = 'Colégio Interagir',
  stats,
}) => {
  const anoNum = anoLetivo !== 'todos' ? parseInt(anoLetivo, 10) || 2026 : 2026;

  const mesesDoAno = useMemo(() => {
    return Array.from({ length: 12 }, (_, mesIdx) => {
      const monthDate = new Date(anoNum, mesIdx, 1);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Domingo
      const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 }); // Sábado
      const dias = eachDayOfInterval({ start: startDate, end: endDate });
      return {
        mesIdx,
        nome: format(monthDate, 'MMMM', { locale: ptBR }),
        date: monthDate,
        dias,
      };
    });
  }, [anoNum]);

  const eventosOrdenados = useMemo(() => {
    return [...eventos].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
  }, [eventos]);

  return (
    <div className="w-full text-slate-900 bg-white font-sans text-xs">
      {/* ===================== CABEÇALHO DO DOCUMENTO ===================== */}
      <div className="border-b-2 border-slate-800 pb-2.5 mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-purple-700 text-white flex items-center justify-center font-bold text-base shrink-0">
            <School size={20} />
          </div>
          <div>
            <h1 className="text-base font-bold uppercase tracking-wider text-slate-900 leading-tight">
              {escolaNome}
            </h1>
            <p className="text-[10px] text-slate-600 font-semibold tracking-wide">
              CALENDÁRIO ESCOLAR OFICIAL — ANO LETIVO {anoLetivo}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="inline-block bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded text-[9.5px] font-bold">
            Ano Letivo {anoLetivo}
          </div>
          <p className="text-[8px] text-slate-500 mt-0.5">
            Documento Oficial • Homologado
          </p>
        </div>
      </div>

      {/* ===================== GRADE DOS 12 MESES (FORMATO ANUAL) ===================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-2 mb-3">
        {mesesDoAno.map((mes) => (
          <div
            key={mes.mesIdx}
            className="border border-slate-300 rounded overflow-hidden bg-white flex flex-col justify-between"
            style={{ pageBreakInside: 'avoid' }}
          >
            {/* Header do Mês */}
            <div className="bg-slate-100 text-slate-800 font-bold text-[10px] uppercase tracking-wider py-1 px-1 text-center border-b border-slate-300">
              {mes.nome}
            </div>

            {/* Cabeçalho dos Dias da Semana */}
            <div className="grid grid-cols-7 text-[7.5px] font-bold text-center text-slate-600 bg-slate-50 border-b border-slate-200 py-0.5">
              <span className="text-rose-600">D</span>
              <span>S</span>
              <span>T</span>
              <span>Q</span>
              <span>Q</span>
              <span>S</span>
              <span className="text-purple-700">S</span>
            </div>

            {/* Grade dos Dias */}
            <div className="grid grid-cols-7 gap-y-0.5 gap-x-0.5 p-1 text-center items-center justify-items-center">
              {mes.dias.map((dia, dIdx) => {
                const diaIso = format(dia, 'yyyy-MM-dd');
                const isDiaDoMes = isSameMonth(dia, mes.date);
                const diaNum = format(dia, 'd');
                const dayOfWeek = dia.getDay(); // 0 = Domingo, 6 = Sábado

                if (!isDiaDoMes) {
                  return (
                    <span
                      key={dIdx}
                      className="text-slate-200 text-[8px] w-[18px] h-[18px] flex items-center justify-center"
                    >
                      {diaNum}
                    </span>
                  );
                }

                const eventosNoDia = getEventosNaData(diaIso, eventos);
                const diaSemAula = getDiaSemAula(diaIso, eventos);

                if (diaSemAula) {
                  const isParada = diaSemAula.tipo === 'planejamento';
                  return (
                    <span
                      key={dIdx}
                      className={`w-[18px] h-[18px] rounded-full text-white font-bold text-[8px] flex items-center justify-center shrink-0 ${
                        isParada ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      title={`${diaSemAula.titulo} (${isParada ? 'Parada Pedagógica' : 'Sem Aula'})`}
                    >
                      {diaNum}
                    </span>
                  );
                }

                if (eventosNoDia.length > 0) {
                  const isLetivoEsp = eventosNoDia.some((e) => e.tipo === 'letivo_especial');
                  const isReuniao = eventosNoDia.some((e) => e.tipo === 'reuniao_pais');
                  const isAvaliacao = eventosNoDia.some((e) => e.tipo === 'avaliacao');

                  const bgClass = isLetivoEsp
                    ? 'bg-emerald-600'
                    : isReuniao
                    ? 'bg-blue-600'
                    : isAvaliacao
                    ? 'bg-indigo-600'
                    : 'bg-purple-600';

                  return (
                    <span
                      key={dIdx}
                      className={`w-[18px] h-[18px] rounded-full text-white font-bold text-[8px] flex items-center justify-center shrink-0 ${bgClass}`}
                      title={eventosNoDia.map((e) => e.titulo).join(', ')}
                    >
                      {diaNum}
                    </span>
                  );
                }

                return (
                  <span
                    key={dIdx}
                    className={`w-[18px] h-[18px] flex items-center justify-center text-[8px] ${
                      dayOfWeek === 0
                        ? 'text-rose-600 font-semibold'
                        : dayOfWeek === 6
                        ? 'text-slate-400 font-normal'
                        : 'text-slate-800 font-medium'
                    }`}
                  >
                    {diaNum}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ===================== LEGENDA DE CORES ===================== */}
      <div className="border border-slate-300 rounded p-2 bg-slate-50/80 mb-2.5">
        <div className="text-[9px] font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-600"></span>
          Legenda de Cores do Calendário Escolar
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[8.5px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-500 text-white font-bold text-[7.5px] flex items-center justify-center shrink-0">
              •
            </span>
            <span className="text-slate-800 font-medium">Feriado / Recesso (Sem Aula)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-white font-bold text-[7.5px] flex items-center justify-center shrink-0">
              •
            </span>
            <span className="text-slate-800 font-medium">Parada Pedagógica (Sem Aula)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white font-bold text-[7.5px] flex items-center justify-center shrink-0">
              •
            </span>
            <span className="text-slate-800 font-medium">Sábado Letivo (Com Aula)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-purple-600 text-white font-bold text-[7.5px] flex items-center justify-center shrink-0">
              •
            </span>
            <span className="text-slate-800 font-medium">Evento Escolar / Cultural</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white font-bold text-[7.5px] flex items-center justify-center shrink-0">
              •
            </span>
            <span className="text-slate-800 font-medium">Reunião de Pais e Mestres</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 text-white font-bold text-[7.5px] flex items-center justify-center shrink-0">
              •
            </span>
            <span className="text-slate-800 font-medium">Avaliações / Provas</span>
          </div>
        </div>
      </div>

      {/* ===================== RELAÇÃO DE DATAS E EVENTOS DO ANO LETIVO ===================== */}
      <div className="border border-slate-300 rounded p-2 bg-white">
        <div className="text-[9px] font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between border-b border-slate-200 pb-1">
          <div className="flex items-center gap-1.5">
            <CalendarCheck size={12} className="text-purple-600" />
            <span>Relação de Datas e Eventos do Ano Letivo {anoLetivo}</span>
          </div>
          <span className="text-slate-500 font-normal text-[8px]">
            {eventosOrdenados.length} datas registradas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-x-3 gap-y-1 text-[8px]">
          {eventosOrdenados.map((ev) => {
            const periodoStr = formatPeriodoEvento(ev.dataInicio, ev.dataFim);
            const isSemAula = ev.temAula === false;
            const isParada = ev.tipo === 'planejamento';
            const isLetivoEsp = ev.tipo === 'letivo_especial';
            const isReuniao = ev.tipo === 'reuniao_pais';
            const isAvaliacao = ev.tipo === 'avaliacao';

            const badgeColor = isSemAula
              ? isParada
                ? 'bg-amber-500 text-white'
                : 'bg-rose-500 text-white'
              : isLetivoEsp
              ? 'bg-emerald-600 text-white'
              : isReuniao
              ? 'bg-blue-600 text-white'
              : isAvaliacao
              ? 'bg-indigo-600 text-white'
              : 'bg-purple-600 text-white';

            const publicoStr = ev.publicoAlvo
              ? Array.isArray(ev.publicoAlvo)
                ? ev.publicoAlvo.join(', ')
                : ev.publicoAlvo
              : 'Toda a Escola';

            return (
              <div
                key={ev.id}
                className="flex items-start gap-1.5 py-0.5 border-b border-slate-100 min-w-0"
                style={{ pageBreakInside: 'avoid' }}
              >
                <span
                  className={`px-1.5 py-0.5 rounded text-[7.5px] font-bold shrink-0 leading-none ${badgeColor}`}
                >
                  {periodoStr}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <span className="font-semibold text-slate-800 block truncate" title={ev.titulo}>
                    {ev.titulo}
                  </span>
                  <div className="flex items-center gap-1.5 text-[7px] text-slate-500">
                    <span
                      className={
                        isSemAula ? 'text-rose-600 font-semibold' : 'text-emerald-700 font-semibold'
                      }
                    >
                      {isSemAula ? '❌ Sem Aula' : '✅ Com Aula'}
                    </span>
                    {publicoStr !== 'Toda a Escola' && (
                      <span className="text-purple-700 truncate max-w-[105px]" title={publicoStr}>
                        • {publicoStr}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===================== ASSINATURAS INSTITUCIONAIS ===================== */}
      <div className="mt-3 pt-2.5 border-t border-slate-300 grid grid-cols-3 text-center text-[8px] text-slate-600">
        <div>
          <div className="w-28 sm:w-36 border-b border-slate-400 mx-auto mb-1"></div>
          <p className="font-semibold">Coordenação Pedagógica</p>
        </div>
        <div>
          <div className="w-28 sm:w-36 border-b border-slate-400 mx-auto mb-1"></div>
          <p className="font-semibold">Direção Geral</p>
        </div>
        <div>
          <p className="text-slate-400">Homologado pelo Conselho Escolar</p>
          <p className="font-bold text-slate-700">Ano Letivo {anoLetivo}</p>
        </div>
      </div>
    </div>
  );
};

export const CalendarioEscolarTab: React.FC = () => {
  const currentYear = new Date().getFullYear(); // 2026
  const [storedAno] = useLocalStorage<string>('escolinha_ano_letivo_ativo', String(currentYear));
  const anoLetivo = storedAno || String(currentYear);

  const [eventos, setEventos] = useLocalStorage<EventoCalendarioEscolar[]>(
    'escolinha_calendario_escolar_v1',
    DEFAULT_EVENTOS_CALENDARIO_2026
  );

  // Mês em visualização na grade
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const today = new Date();
    // Se o ano letivo selecionado for diferente do ano do sistema, foca no início do ano letivo
    if (anoLetivo !== 'todos' && String(today.getFullYear()) !== anoLetivo) {
      const yearNum = parseInt(anoLetivo, 10) || currentYear;
      return new Date(yearNum, 1, 1); // Fevereiro (início das aulas)
    }
    return today;
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Contexto e Modais
  const { school } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState<EventoCalendarioEscolar | null>(null);
  const [selectedDiaDetail, setSelectedDiaDetail] = useState<{
    dataIso: string;
    eventos: EventoCalendarioEscolar[];
  } | null>(null);

  // Form State
  const [formTitulo, setFormTitulo] = useState('');
  const [formTipo, setFormTipo] = useState<TipoEventoCalendario>('feriado');
  const [formTemAula, setFormTemAula] = useState<boolean>(false);
  const [formDataInicio, setFormDataInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formIsPeriodo, setFormIsPeriodo] = useState(false);
  const [formDataFim, setFormDataFim] = useState('');
  const [formHorario, setFormHorario] = useState('');
  const [formLocal, setFormLocal] = useState('');
  const [formPublicoAlvo, setFormPublicoAlvo] = useState<string[]>(['Toda a Escola']);
  const [formDescricao, setFormDescricao] = useState('');

  const [turmasConfig] = useLocalStorage<TurmaConfig[]>(
    'escolinha_turmas_v3',
    DEFAULT_TURMAS_CONFIG
  );

  // Turmas agrupadas por setor (Infantil, Fundamental 1, Fundamental 2, Médio)
  const turmasPorSetor = useMemo(() => {
    const map: Record<string, string[]> = {
      'Educação Infantil': [],
      'Ensino Fundamental 1': [],
      'Ensino Fundamental 2': [],
      'Ensino Médio': [],
    };

    turmasConfig.forEach((t) => {
      const setor = t.setor || 'Ensino Fundamental 1';
      if (!map[setor]) map[setor] = [];
      if (!map[setor].includes(t.nome)) {
        map[setor].push(t.nome);
      }
    });

    return map;
  }, [turmasConfig]);

  // Lista com todas as turmas de alunos da escola (ex: 1º Ano, 2º Ano, ..., 5º Ano, etc.)
  const todasTurmasAlunos = useMemo(() => {
    const list: string[] = [];
    Object.values(turmasPorSetor).forEach((turmasDoSetor) => {
      turmasDoSetor.forEach((t) => {
        if (!list.includes(t)) list.push(t);
      });
    });
    return list;
  }, [turmasPorSetor]);

  // "Alunos em Geral" verifica se todas as turmas de alunos estão selecionadas
  const isAlunosEmGeralSelected = useMemo(() => {
    return (
      formPublicoAlvo.includes('Alunos em Geral') ||
      (todasTurmasAlunos.length > 0 &&
        todasTurmasAlunos.every((t) => formPublicoAlvo.includes(t)))
    );
  }, [formPublicoAlvo, todasTurmasAlunos]);

  // "Toda a Escola" verifica se Alunos em Geral, Professores e Pais estão selecionados
  const isTodaEscolaSelected = useMemo(() => {
    return (
      formPublicoAlvo.includes('Toda a Escola') ||
      (isAlunosEmGeralSelected &&
        formPublicoAlvo.includes('Professores e Equipe') &&
        formPublicoAlvo.includes('Pais e Responsáveis'))
    );
  }, [formPublicoAlvo, isAlunosEmGeralSelected]);

  // Toggle "Toda a Escola (Marcar Todos)"
  const handleToggleTodaEscola = () => {
    if (isTodaEscolaSelected) {
      setFormPublicoAlvo([]);
    } else {
      setFormPublicoAlvo([
        'Toda a Escola',
        'Alunos em Geral',
        'Professores e Equipe',
        'Pais e Responsáveis',
        ...todasTurmasAlunos,
      ]);
    }
  };

  // Toggle "Alunos em Geral" (marca ou desmarca todas as turmas de alunos)
  const handleToggleAlunosEmGeral = () => {
    if (isAlunosEmGeralSelected) {
      setFormPublicoAlvo((prev) =>
        prev.filter(
          (item) =>
            item !== 'Alunos em Geral' &&
            item !== 'Toda a Escola' &&
            !todasTurmasAlunos.includes(item)
        )
      );
    } else {
      setFormPublicoAlvo((prev) => {
        const base = prev.filter((item) => item !== 'Toda a Escola');
        const next = Array.from(new Set([...base, 'Alunos em Geral', ...todasTurmasAlunos]));
        const hasTodaEscola =
          next.includes('Professores e Equipe') && next.includes('Pais e Responsáveis');
        return hasTodaEscola ? ['Toda a Escola', ...next] : next;
      });
    }
  };

  // Toggle de uma turma específica (ex: 5º Ano, 1º Ano)
  const handleToggleTurma = (nomeTurma: string) => {
    setFormPublicoAlvo((prev) => {
      if (prev.includes(nomeTurma)) {
        return prev.filter(
          (item) => item !== nomeTurma && item !== 'Alunos em Geral' && item !== 'Toda a Escola'
        );
      } else {
        const next = [...prev.filter((item) => item !== 'Toda a Escola'), nomeTurma];
        const allStudentsSelected = todasTurmasAlunos.every((t) => next.includes(t));
        if (allStudentsSelected) {
          next.push('Alunos em Geral');
          if (next.includes('Professores e Equipe') && next.includes('Pais e Responsáveis')) {
            next.push('Toda a Escola');
          }
        }
        return Array.from(new Set(next));
      }
    });
  };

  // Toggle de um setor inteiro de turmas (ex: todas as turmas do Fundamental 1)
  const handleToggleSetor = (setorNome: string) => {
    const turmasDoSetor = turmasPorSetor[setorNome] || [];
    const allSetorSelected = turmasDoSetor.every((t) => formPublicoAlvo.includes(t));

    setFormPublicoAlvo((prev) => {
      let next: string[];
      if (allSetorSelected) {
        next = prev.filter(
          (item) =>
            !turmasDoSetor.includes(item) &&
            item !== 'Alunos em Geral' &&
            item !== 'Toda a Escola'
        );
      } else {
        next = Array.from(
          new Set([...prev.filter((item) => item !== 'Toda a Escola'), ...turmasDoSetor])
        );
        const allStudentsSelected = todasTurmasAlunos.every((t) => next.includes(t));
        if (allStudentsSelected) {
          next.push('Alunos em Geral');
          if (next.includes('Professores e Equipe') && next.includes('Pais e Responsáveis')) {
            next.push('Toda a Escola');
          }
        }
      }
      return next;
    });
  };

  // Toggle de outro público (Professores ou Pais)
  const handleToggleOutro = (opcao: 'Professores e Equipe' | 'Pais e Responsáveis') => {
    setFormPublicoAlvo((prev) => {
      if (prev.includes(opcao)) {
        return prev.filter((item) => item !== opcao && item !== 'Toda a Escola');
      } else {
        const next = Array.from(new Set([...prev, opcao]));
        const hasAllStudents = todasTurmasAlunos.every((t) => next.includes(t));
        if (
          hasAllStudents &&
          next.includes('Professores e Equipe') &&
          next.includes('Pais e Responsáveis')
        ) {
          next.push('Toda a Escola');
        }
        return next;
      }
    });
  };

  const handleLimparPublicoAlvo = () => {
    setFormPublicoAlvo([]);
  };

  // Eventos filtrados pelo ano letivo ativo
  const eventosDoAno = useMemo(() => {
    return eventos.filter((ev) => {
      if (anoLetivo === 'todos') return true;
      return ev.anoLetivo === anoLetivo || ev.dataInicio.startsWith(anoLetivo);
    });
  }, [eventos, anoLetivo]);

  // Eventos com busca e filtro de tipo
  const eventosFiltrados = useMemo(() => {
    return eventosDoAno.filter((ev) => {
      const matchSearch =
        ev.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ev.descricao && ev.descricao.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ev.local && ev.local.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      if (filterTipo === 'todos') return true;
      if (filterTipo === 'sem_aula') return ev.temAula === false;
      if (filterTipo === 'com_aula') return ev.temAula === true;
      if (filterTipo === 'feriados') return ev.tipo === 'feriado' || ev.tipo === 'recesso';
      if (filterTipo === 'eventos') return ev.tipo === 'evento_escolar' || ev.tipo === 'reuniao_pais';
      return ev.tipo === filterTipo;
    });
  }, [eventosDoAno, searchTerm, filterTipo]);

  // Contadores Estatísticos
  const stats = useMemo(() => {
    const semAulaCount = eventosDoAno.filter((e) => !e.temAula).length;
    const eventosCulturaisCount = eventosDoAno.filter((e) => e.tipo === 'evento_escolar').length;
    const reunioesCount = eventosDoAno.filter((e) => e.tipo === 'reuniao_pais').length;
    const paradasCount = eventosDoAno.filter((e) => e.tipo === 'planejamento').length;
    const sabadosLetivosCount = eventosDoAno.filter((e) => e.tipo === 'letivo_especial').length;

    return {
      total: eventosDoAno.length,
      semAulaCount,
      eventosCulturaisCount,
      reunioesCount,
      paradasCount,
      sabadosLetivosCount,
    };
  }, [eventosDoAno]);

  // Grid de dias para o mês atual
  const diasDoMes = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Domingo
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 }); // Sábado

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  // Handlers de Abertura do Modal
  const handleOpenNovoEvento = (dataPreset?: string) => {
    setEditingEvento(null);
    setFormTitulo('');
    setFormTipo('feriado');
    setFormTemAula(false);
    setFormDataInicio(dataPreset || format(new Date(), 'yyyy-MM-dd'));
    setFormIsPeriodo(false);
    setFormDataFim('');
    setFormHorario('');
    setFormLocal('');
    setFormPublicoAlvo([
      'Toda a Escola',
      'Alunos em Geral',
      'Professores e Equipe',
      'Pais e Responsáveis',
      ...todasTurmasAlunos,
    ]);
    setFormDescricao('');
    setIsModalOpen(true);
  };

  const handleOpenEditarEvento = (ev: EventoCalendarioEscolar) => {
    setEditingEvento(ev);
    setFormTitulo(ev.titulo);
    setFormTipo(ev.tipo);
    setFormTemAula(ev.temAula);
    setFormDataInicio(ev.dataInicio);
    setFormIsPeriodo(Boolean(ev.dataFim && ev.dataFim !== ev.dataInicio));
    setFormDataFim(ev.dataFim || '');
    setFormHorario(ev.horario || '');
    setFormLocal(ev.local || '');
    
    const rawTarget = Array.isArray(ev.publicoAlvo)
      ? ev.publicoAlvo
      : ev.publicoAlvo
      ? [ev.publicoAlvo]
      : ['Toda a Escola'];

    if (rawTarget.includes('Toda a Escola')) {
      setFormPublicoAlvo([
        'Toda a Escola',
        'Alunos em Geral',
        'Professores e Equipe',
        'Pais e Responsáveis',
        ...todasTurmasAlunos,
      ]);
    } else {
      let targets = [...rawTarget];
      if (targets.includes('Alunos em Geral')) {
        targets = Array.from(new Set([...targets, ...todasTurmasAlunos]));
      }
      setFormPublicoAlvo(targets);
    }

    setFormDescricao(ev.descricao || '');
    setIsModalOpen(true);
  };

  const handleSaveEvento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) {
      toast.error('Informe o título do evento ou motivo.');
      return;
    }
    if (!formDataInicio) {
      toast.error('Informe a data de início.');
      return;
    }
    if (formIsPeriodo && formDataFim && formDataFim < formDataInicio) {
      toast.error('A data de fim não pode ser anterior à data de início.');
      return;
    }

    const anoDoEvento = formDataInicio.split('-')[0] || anoLetivo;
    let finalPublicoAlvo: string[];
    if (isTodaEscolaSelected) {
      finalPublicoAlvo = ['Toda a Escola'];
    } else if (isAlunosEmGeralSelected) {
      const outros = formPublicoAlvo.filter(
        (item) => item === 'Professores e Equipe' || item === 'Pais e Responsáveis'
      );
      finalPublicoAlvo = ['Alunos em Geral', ...outros];
    } else {
      const turmasESegmentos = formPublicoAlvo.filter(
        (item) => item !== 'Toda a Escola' && item !== 'Alunos em Geral'
      );
      finalPublicoAlvo = turmasESegmentos.length > 0 ? turmasESegmentos : ['Toda a Escola'];
    }

    if (editingEvento) {
      setEventos((prev) =>
        prev.map((item) =>
          item.id === editingEvento.id
            ? {
                ...item,
                titulo: formTitulo.trim(),
                tipo: formTipo,
                temAula: formTemAula,
                dataInicio: formDataInicio,
                dataFim: formIsPeriodo && formDataFim ? formDataFim : undefined,
                anoLetivo: anoDoEvento,
                horario: formHorario.trim() || undefined,
                local: formLocal.trim() || undefined,
                publicoAlvo: finalPublicoAlvo,
                descricao: formDescricao.trim() || undefined,
              }
            : item
        )
      );
      toast.success('Evento escolar atualizado com sucesso!');
    } else {
      const novo: EventoCalendarioEscolar = {
        id: `cal-${Date.now()}`,
        titulo: formTitulo.trim(),
        tipo: formTipo,
        temAula: formTemAula,
        dataInicio: formDataInicio,
        dataFim: formIsPeriodo && formDataFim ? formDataFim : undefined,
        anoLetivo: anoDoEvento,
        horario: formHorario.trim() || undefined,
        local: formLocal.trim() || undefined,
        publicoAlvo: finalPublicoAlvo,
        descricao: formDescricao.trim() || undefined,
        criadoEm: new Date().toISOString(),
      };
      setEventos((prev) => [novo, ...prev]);
      toast.success('Evento escolar cadastrado com sucesso!');
    }

    setIsModalOpen(false);
  };

  const handleDeleteEvento = (id: string, titulo: string) => {
    if (window.confirm(`Deseja realmente remover o evento "${titulo}"?`)) {
      setEventos((prev) => prev.filter((ev) => ev.id !== id));
      toast.success('Evento removido do calendário.');
      if (selectedDiaDetail) {
        setSelectedDiaDetail((prev) =>
          prev ? { ...prev, eventos: prev.eventos.filter((e) => e.id !== id) } : null
        );
      }
    }
  };

  const handleRestaurarPadrao = () => {
    if (
      window.confirm(
        'Deseja restaurar os feriados e eventos oficiais do ano letivo de 2026? Seus eventos personalizados serão substituídos pelos dados oficiais.'
      )
    ) {
      setEventos(DEFAULT_EVENTOS_CALENDARIO_2026);
      toast.success('Calendário Escolar 2026 restaurado com sucesso!');
    }
  };

  // Ao alterar o tipo, pré-seleciona inteligentemente se tem aula ou não
  const handleTipoChange = (newTipo: TipoEventoCalendario) => {
    setFormTipo(newTipo);
    const config = TIPO_EVENTO_CONFIG[newTipo];
    if (config) {
      setFormTemAula(config.defaultTemAula);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs print:hidden">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CalendarDays className="text-purple-600" size={22} />
            Calendário Escolar & Dias Letivos
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Organize os eventos da escola, reuniões pedagógicas, feiras, recessos e todos os dias que
            não terão aula.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestaurarPadrao}
            className="text-xs text-slate-600 dark:text-slate-300"
            title="Recarregar Feriados e Recessos Oficiais 2026"
          >
            <RotateCcw size={14} className="mr-1.5" />
            Restaurar Feriados 2026
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrintModalOpen(true)}
            className="text-xs text-slate-600 dark:text-slate-300"
            title="Visualizar e Imprimir Calendário Escolar Anual"
          >
            <Printer size={14} className="mr-1.5" />
            Imprimir
          </Button>
          <Button
            onClick={() => handleOpenNovoEvento()}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={16} /> Novo Evento / Dia Sem Aula
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
              <CalendarCheck size={20} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Eventos & Marcos
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
              <CalendarX size={20} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Dias Sem Aula (Feriados/Recessos)
              </p>
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                {stats.semAulaCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
              <PartyPopper size={20} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Festas & Eventos Culturais
              </p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {stats.eventosCulturaisCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Reuniões & Paradas Pedagógicas
              </p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {stats.reunioesCount + stats.paradasCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles de Visualização, Mês e Filtros */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs print:hidden">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Navegador de Mês */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
                title="Mês anterior"
              >
                <ChevronLeft size={16} />
              </Button>

              <div className="text-center min-w-[170px]">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </h3>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                title="Próximo mês"
              >
                <ChevronRight size={16} />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-purple-600 h-8"
                onClick={() => setCurrentMonth(new Date())}
              >
                Hoje
              </Button>
            </div>

            {/* Alternador de Visualização (Grade vs Lista) */}
            <div className="flex items-center gap-2">
              <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex items-center border border-slate-200 dark:border-slate-700">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-7 text-xs px-2.5 ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                  onClick={() => setViewMode('grid')}
                >
                  <CalendarIcon size={13} className="mr-1.5" /> Grade Mensal
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-7 text-xs px-2.5 ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                  onClick={() => setViewMode('list')}
                >
                  <Filter size={13} className="mr-1.5" /> Lista & Cronograma
                </Button>
              </div>
            </div>
          </div>

          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <Input
                placeholder="Buscar por nome do evento, feriado ou local..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-full sm:w-[210px] h-8 text-xs">
                <SelectValue placeholder="Filtrar por Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Dias & Eventos</SelectItem>
                <SelectItem value="sem_aula">❌ Apenas Dias Sem Aula</SelectItem>
                <SelectItem value="com_aula">✅ Apenas Dias Com Aula</SelectItem>
                <SelectItem value="feriados">Feriados & Recessos</SelectItem>
                <SelectItem value="planejamento">Paradas Pedagógicas</SelectItem>
                <SelectItem value="eventos">Eventos & Festas</SelectItem>
                <SelectItem value="reuniao_pais">Reuniões de Pais</SelectItem>
                <SelectItem value="letivo_especial">Sábados Letivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Legenda Visual Rápida */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 px-1 print:hidden">
        <span className="font-semibold text-slate-700 dark:text-slate-300">Legenda:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
          Dia Sem Aula (Feriado/Recesso)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span>
          Parada Pedagógica
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-purple-500 inline-block"></span>
          Evento Escolar / Cultural
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
          Reunião de Pais
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
          Sábado Letivo (Com Aula)
        </span>
      </div>

      {/* ======================= MODO GRADE MENSAL ======================= */}
      {viewMode === 'grid' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:hidden">
          <CardContent className="p-0">
            {/* Cabeçalho dos Dias da Semana */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 py-2.5">
              <span className="text-rose-600 dark:text-rose-400">Dom</span>
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span className="text-purple-600 dark:text-purple-400">Sáb</span>
            </div>

            {/* Grid dos Dias */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800">
              {diasDoMes.map((dia) => {
                const diaIso = format(dia, 'yyyy-MM-dd');
                const isCurrent = isSameMonth(dia, currentMonth);
                const isCurrentDay = isToday(dia);
                const isFimDeSemana = isWeekend(dia);
                const eventosDoDia = getEventosNaData(diaIso, eventosDoAno);
                const diaSemAula = getDiaSemAula(diaIso, eventosDoAno);

                return (
                  <div
                    key={diaIso}
                    onClick={() => {
                      if (eventosDoDia.length > 0) {
                        setSelectedDiaDetail({ dataIso: diaIso, eventos: eventosDoDia });
                      } else {
                        handleOpenNovoEvento(diaIso);
                      }
                    }}
                    className={`min-h-[96px] sm:min-h-[110px] p-1.5 sm:p-2 transition-colors cursor-pointer group flex flex-col justify-between ${
                      !isCurrent
                        ? 'bg-slate-50/60 dark:bg-slate-950/40 text-slate-400 dark:text-slate-600'
                        : diaSemAula
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/80 dark:hover:bg-rose-950/40'
                        : isFimDeSemana
                        ? 'bg-slate-50/30 dark:bg-slate-900/20 hover:bg-purple-50/20 dark:hover:bg-slate-800/40'
                        : 'bg-white dark:bg-slate-900 hover:bg-purple-50/30 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Top row: Dia do Mês e Ação Rápida */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                          isCurrentDay
                            ? 'bg-purple-600 text-white shadow-xs'
                            : diaSemAula
                            ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                            : isCurrent
                            ? 'text-slate-700 dark:text-slate-200'
                            : 'text-slate-400 dark:text-slate-600'
                        }`}
                      >
                        {format(dia, 'd')}
                      </span>

                      {/* Botão rápido + ao passar mouse */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenNovoEvento(diaIso);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-950/60"
                        title="Adicionar evento neste dia"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    {/* Eventos do Dia */}
                    <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                      {eventosDoDia.slice(0, 2).map((ev) => {
                        const config = TIPO_EVENTO_CONFIG[ev.tipo];
                        return (
                          <div
                            key={ev.id}
                            title={`${ev.titulo} (${ev.temAula ? 'Com Aula' : 'Sem Aula'})`}
                            className={`text-[10px] leading-tight px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1 border ${
                              !ev.temAula
                                ? 'bg-rose-100/90 text-rose-800 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-900'
                                : ev.tipo === 'letivo_especial'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-900'
                                : 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-900'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                !ev.temAula ? 'bg-rose-500' : config?.dotColor || 'bg-purple-500'
                              }`}
                            />
                            <span className="truncate">{ev.titulo}</span>
                          </div>
                        );
                      })}

                      {eventosDoDia.length > 2 && (
                        <div className="text-[9px] text-purple-600 dark:text-purple-400 font-semibold px-1">
                          +{eventosDoDia.length - 2} evento(s)
                        </div>
                      )}
                    </div>

                    {/* Badge de status no rodapé do dia */}
                    {diaSemAula && (
                      <div className="pt-0.5 text-right">
                        <span className="text-[9px] text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wider">
                          Sem Aula
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ======================= MODO LISTA / CRONOGRAMA ======================= */}
      {viewMode === 'list' && (
        <div className="space-y-3 print:hidden">
          {eventosFiltrados.length === 0 ? (
            <Card className="text-center p-8 border-dashed border-slate-200 dark:border-slate-800">
              <CardContent className="pt-6">
                <CalendarX className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-600 dark:text-slate-400 font-medium">
                  Nenhum evento escolar encontrado para os filtros selecionados.
                </p>
                <Button
                  onClick={() => handleOpenNovoEvento()}
                  variant="outline"
                  className="mt-4 text-xs"
                >
                  <Plus size={14} className="mr-1.5" /> Criar Primeiro Evento
                </Button>
              </CardContent>
            </Card>
          ) : (
            eventosFiltrados.map((ev) => {
              const config = TIPO_EVENTO_CONFIG[ev.tipo];
              const isPeriodo = Boolean(ev.dataFim && ev.dataFim !== ev.dataInicio);

              return (
                <Card
                  key={ev.id}
                  className="border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 transition-all shadow-xs"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                      {/* Lado Esquerdo: Badges e Título */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Badge de Aula: Sem Aula vs Com Aula */}
                          {!ev.temAula ? (
                            <Badge
                              variant="outline"
                              className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 font-semibold text-[11px] flex items-center gap-1"
                            >
                              <XCircle size={12} /> Dia Sem Aula
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-[11px] flex items-center gap-1"
                            >
                              <CheckCircle2 size={12} /> Dia Letivo / Com Aula
                            </Badge>
                          )}

                          {/* Tipo do Evento */}
                          <Badge className={config?.badgeColor || 'bg-slate-100 text-slate-800'}>
                            {config?.label || ev.tipo}
                          </Badge>

                          {normalizePublicoAlvo(ev.publicoAlvo).map((pub) => (
                            <Badge key={pub} variant="secondary" className="text-[10px]">
                              {pub}
                            </Badge>
                          ))}
                        </div>

                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                          {ev.titulo}
                        </h3>

                        {ev.descricao && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                            {ev.descricao}
                          </p>
                        )}

                        {/* Metadados: Data, Horário, Local */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                          <span className="flex items-center gap-1 font-medium">
                            <CalendarDays size={13} className="text-purple-600" />
                            {isPeriodo
                              ? `${format(parseISO(ev.dataInicio), 'dd/MM/yyyy')} até ${format(
                                  parseISO(ev.dataFim!),
                                  'dd/MM/yyyy'
                                )}`
                              : format(parseISO(ev.dataInicio), "dd 'de' MMMM 'de' yyyy (EEEE)", {
                                  locale: ptBR,
                                })}
                          </span>

                          {ev.horario && (
                            <span className="flex items-center gap-1">
                              <Clock size={13} className="text-purple-600" />
                              {ev.horario}
                            </span>
                          )}

                          {ev.local && (
                            <span className="flex items-center gap-1">
                              <MapPin size={13} className="text-purple-600" />
                              {ev.local}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Lado Direito: Ações */}
                      <div className="flex items-center gap-1 self-end sm:self-start">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditarEvento(ev)}
                          title="Editar Evento"
                          className="h-8 w-8 p-0 text-slate-500 hover:text-purple-600"
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEvento(ev.id, ev.titulo)}
                          title="Excluir Evento"
                          className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ======================= MODAL DE CRIAÇÃO / EDIÇÃO ======================= */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto print:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="text-purple-600" size={20} />
              {editingEvento ? 'Editar Evento do Calendário' : 'Novo Evento / Dia Sem Aula'}
            </DialogTitle>
            <DialogDescription>
              Configure feriados, recessos, feiras escolares ou paradas pedagógicas no calendário da escola.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEvento} className="space-y-4 py-2">
            {/* Título do Evento */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Título do Evento ou Motivo *</Label>
              <Input
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                placeholder="Ex: Parada Pedagógica, Feriado Municipal, Festa Junina..."
                required
                className="h-9 text-xs"
              />
            </div>

            {/* Tipo de Evento e Haverá Aula? */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tipo de Evento *</Label>
                <Select value={formTipo} onValueChange={(val) => handleTipoChange(val as TipoEventoCalendario)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feriado">Feriado (Nacional/Municipal)</SelectItem>
                    <SelectItem value="recesso">Recesso Escolar / Férias</SelectItem>
                    <SelectItem value="planejamento">Parada Pedagógica / Reunião</SelectItem>
                    <SelectItem value="evento_escolar">Evento Escolar / Cultural</SelectItem>
                    <SelectItem value="reuniao_pais">Reunião de Pais e Mestres</SelectItem>
                    <SelectItem value="letivo_especial">Sábado Letivo (Com Aula)</SelectItem>
                    <SelectItem value="avaliacao">Semana de Provas / Avaliações</SelectItem>
                    <SelectItem value="conselho_classe">Conselho de Classe</SelectItem>
                    <SelectItem value="outros">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Toggle Haverá Aula? */}
              <div className="space-y-1.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold cursor-pointer" htmlFor="tem-aula-switch">
                    Haverá Aula Normal?
                  </Label>
                  <Switch
                    id="tem-aula-switch"
                    checked={formTemAula}
                    onCheckedChange={setFormTemAula}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  {formTemAula
                    ? '✅ Sim, é um dia letivo com atividades para os alunos.'
                    : '❌ Não, dia sem aula (bloqueia o diário de classe).'}
                </p>
              </div>
            </div>

            {/* Seletor de Datas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Data de Início *</Label>
                <Input
                  type="date"
                  value={formDataInicio}
                  onChange={(e) => setFormDataInicio(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Período de Vários Dias?</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-purple-600 px-1"
                    onClick={() => setFormIsPeriodo(!formIsPeriodo)}
                  >
                    {formIsPeriodo ? 'Remover Fim' : '+ Adicionar Fim'}
                  </Button>
                </div>
                {formIsPeriodo ? (
                  <Input
                    type="date"
                    value={formDataFim}
                    onChange={(e) => setFormDataFim(e.target.value)}
                    className="h-9 text-xs"
                  />
                ) : (
                  <div className="h-9 border border-dashed rounded-md flex items-center justify-center text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-900/30">
                    Evento de apenas 1 dia
                  </div>
                )}
              </div>
            </div>

            {/* Horário e Local */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Horário (Opcional)</Label>
                <Input
                  value={formHorario}
                  onChange={(e) => setFormHorario(e.target.value)}
                  placeholder="Ex: 08:00 às 11:30"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Local (Opcional)</Label>
                <Input
                  value={formLocal}
                  onChange={(e) => setFormLocal(e.target.value)}
                  placeholder="Ex: Pátio, Auditório"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Público-Alvo (Multi-Select com Toda a Escola, Alunos em Geral e Turmas Específicas) */}
            <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <Label className="text-xs font-semibold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                    <Users size={14} className="text-purple-600" />
                    Público-Alvo *
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Use "Toda a Escola" para marcar todos, "Alunos em Geral" para todas as turmas, ou selecione turmas específicas.
                  </p>
                </div>
                {formPublicoAlvo.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-slate-500 hover:text-rose-600 px-1.5 self-start sm:self-auto cursor-pointer"
                    onClick={handleLimparPublicoAlvo}
                  >
                    Desmarcar Tudo
                  </Button>
                )}
              </div>

              {/* Controles Principais (Toda a Escola & Alunos em Geral) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Toda a Escola (Marcar Todos) */}
                <button
                  type="button"
                  onClick={handleToggleTodaEscola}
                  className={`text-xs p-2.5 rounded-lg border transition-all flex items-center gap-2.5 font-semibold cursor-pointer ${
                    isTodaEscolaSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                      isTodaEscolaSelected
                        ? 'bg-white text-purple-600 border-white'
                        : 'border-purple-400 bg-transparent'
                    }`}
                  >
                    {isTodaEscolaSelected && <Check size={12} className="stroke-[3]" />}
                  </div>
                  <div className="text-left">
                    <div className="font-bold leading-tight">Toda a Escola</div>
                    <div className={`text-[10px] font-normal ${isTodaEscolaSelected ? 'text-purple-100' : 'text-slate-400'}`}>
                      Marcar todos (Alunos + Professores + Pais)
                    </div>
                  </div>
                </button>

                {/* Alunos em Geral (Todas as Turmas) */}
                <button
                  type="button"
                  onClick={handleToggleAlunosEmGeral}
                  className={`text-xs p-2.5 rounded-lg border transition-all flex items-center gap-2.5 font-semibold cursor-pointer ${
                    isAlunosEmGeralSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                      isAlunosEmGeralSelected
                        ? 'bg-white text-indigo-600 border-white'
                        : 'border-indigo-400 bg-transparent'
                    }`}
                  >
                    {isAlunosEmGeralSelected && <Check size={12} className="stroke-[3]" />}
                  </div>
                  <div className="text-left">
                    <div className="font-bold leading-tight">Alunos em Geral</div>
                    <div className={`text-[10px] font-normal ${isAlunosEmGeralSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                      Marcar todas as turmas de estudantes ({todasTurmasAlunos.length} turmas)
                    </div>
                  </div>
                </button>
              </div>

              {/* Outros Públicos (Equipe e Pais) */}
              <div className="space-y-1.5 pt-0.5">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Outros Grupos:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleOutro('Professores e Equipe')}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 font-medium cursor-pointer ${
                      formPublicoAlvo.includes('Professores e Equipe')
                        ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800 font-semibold'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-amber-300 hover:bg-amber-50/50'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                        formPublicoAlvo.includes('Professores e Equipe')
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'border-slate-400'
                      }`}
                    >
                      {formPublicoAlvo.includes('Professores e Equipe') && <Check size={10} className="stroke-[3]" />}
                    </div>
                    <span>Professores e Equipe</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleOutro('Pais e Responsáveis')}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 font-medium cursor-pointer ${
                      formPublicoAlvo.includes('Pais e Responsáveis')
                        ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-800 font-semibold'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                        formPublicoAlvo.includes('Pais e Responsáveis')
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-slate-400'
                      }`}
                    >
                      {formPublicoAlvo.includes('Pais e Responsáveis') && <Check size={10} className="stroke-[3]" />}
                    </div>
                    <span>Pais e Responsáveis</span>
                  </button>
                </div>
              </div>

              {/* Turmas Específicas Agrupadas por Ciclo */}
              <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <span>Turmas Específicas</span>
                    <span className="text-slate-400 font-normal">
                      (marque turmas específicas como 1º Ano, 5º Ano, etc.)
                    </span>
                  </span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {Object.entries(turmasPorSetor).map(([setor, turmas]) => {
                    if (turmas.length === 0) return null;
                    const setorTurmasSelectedCount = turmas.filter((t) => formPublicoAlvo.includes(t)).length;
                    const isAllSetor = turmas.length > 0 && setorTurmasSelectedCount === turmas.length;

                    return (
                      <div
                        key={setor}
                        className="p-2.5 rounded-lg bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            {setor}
                            <span className="text-[10px] font-normal text-slate-400">
                              ({setorTurmasSelectedCount}/{turmas.length} selecionadas)
                            </span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleSetor(setor)}
                            className="text-[10px] text-purple-600 hover:text-purple-800 dark:text-purple-400 font-medium hover:underline cursor-pointer"
                          >
                            {isAllSetor ? 'Desmarcar segmento' : 'Marcar segmento'}
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {turmas.map((turmaNome) => {
                            const isSelected = formPublicoAlvo.includes(turmaNome);
                            return (
                              <button
                                key={turmaNome}
                                type="button"
                                onClick={() => handleToggleTurma(turmaNome)}
                                className={`text-[11px] px-2.5 py-1 rounded-md border transition-all flex items-center gap-1.5 cursor-pointer ${
                                  isSelected
                                    ? 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/80 dark:text-purple-200 dark:border-purple-700 font-semibold shadow-2xs'
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-purple-50/50 hover:border-purple-200'
                                }`}
                              >
                                {isSelected ? (
                                  <Check size={11} className="stroke-[3] text-purple-700 dark:text-purple-300" />
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full border border-slate-400 inline-block" />
                                )}
                                <span>{turmaNome}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resumo da Seleção */}
              <div className="text-[11px] text-slate-500 pt-1.5 flex flex-wrap items-center gap-1 border-t border-slate-200/50 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Status da seleção:
                </span>
                <span className="text-purple-700 dark:text-purple-300 font-medium">
                  {isTodaEscolaSelected
                    ? 'Toda a Escola (Todas as turmas, professores e pais)'
                    : isAlunosEmGeralSelected
                    ? `Alunos em Geral (Todas as turmas)${
                        formPublicoAlvo.includes('Professores e Equipe') ? ' + Professores' : ''
                      }${formPublicoAlvo.includes('Pais e Responsáveis') ? ' + Pais' : ''}`
                    : formPublicoAlvo.length > 0
                    ? `${formPublicoAlvo.filter(i => i !== 'Toda a Escola' && i !== 'Alunos em Geral').join(', ')} (${formPublicoAlvo.filter(i => i !== 'Toda a Escola' && i !== 'Alunos em Geral').length} item(ns) selecionado(s))`
                    : 'Nenhum selecionado (selecione ao menos um)'}
                </span>
              </div>
            </div>

            {/* Descrição / Observações */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Descrição / Observações</Label>
              <Textarea
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                placeholder="Detalhes sobre a organização do evento, avisos para as famílias ou roteiro..."
                className="h-20 text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                {editingEvento ? 'Salvar Alterações' : 'Cadastrar no Calendário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================= MODAL DE DETALHES DO DIA SELECIONADO ======================= */}
      <Dialog
        open={Boolean(selectedDiaDetail)}
        onOpenChange={(open) => !open && setSelectedDiaDetail(null)}
      >
        <DialogContent className="sm:max-w-md print:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="text-purple-600" size={20} />
              {selectedDiaDetail &&
                format(parseISO(selectedDiaDetail.dataIso), "dd 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })}
            </DialogTitle>
            <DialogDescription>
              Eventos e status letivo cadastrados para esta data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {selectedDiaDetail?.eventos.map((ev) => {
              const config = TIPO_EVENTO_CONFIG[ev.tipo];
              return (
                <div
                  key={ev.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {ev.titulo}
                    </span>
                    <Badge className={config?.badgeColor}>{config?.label}</Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {!ev.temAula ? (
                      <span className="text-rose-600 font-semibold flex items-center gap-1">
                        <XCircle size={13} /> Dia Sem Aula
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={13} /> Dia Letivo (Com Aula)
                      </span>
                    )}
                    {ev.horario && <span className="text-slate-500">• {ev.horario}</span>}
                    {ev.local && <span className="text-slate-500">• {ev.local}</span>}
                  </div>

                  {ev.publicoAlvo && (
                    <div className="flex flex-wrap items-center gap-1 text-[11px] pt-0.5">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">Público:</span>
                      {normalizePublicoAlvo(ev.publicoAlvo).map((p) => (
                        <Badge key={p} variant="outline" className="text-[10px] bg-white dark:bg-slate-900 font-normal">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {ev.descricao && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">{ev.descricao}</p>
                  )}

                  <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-purple-600"
                      onClick={() => {
                        setSelectedDiaDetail(null);
                        handleOpenEditarEvento(ev);
                      }}
                    >
                      <Edit size={13} className="mr-1" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-rose-600"
                      onClick={() => handleDeleteEvento(ev.id, ev.titulo)}
                    >
                      <Trash2 size={13} className="mr-1" /> Excluir
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 border-t pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const dia = selectedDiaDetail?.dataIso;
                setSelectedDiaDetail(null);
                handleOpenNovoEvento(dia);
              }}
            >
              <Plus size={14} className="mr-1" /> Adicionar Outro Evento Neste Dia
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDiaDetail(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================= MODAL DE PRÉ-VISUALIZAÇÃO DE IMPRESSÃO (ANUAL) ======================= */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col p-0 print:m-0 print:p-0 print:max-w-none print:w-full print:h-auto print:border-none print:shadow-none bg-white">
          <DialogHeader className="p-4 border-b bg-slate-50 dark:bg-slate-900 flex flex-row items-center justify-between print:hidden">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <CalendarDays className="h-5 w-5 text-purple-600" />
                <span>Calendário Escolar Anual ({anoLetivo}) — Pronto para Impressão</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Formato anual oficial com os 12 meses, legenda de cores e cronograma completo de datas.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => window.print()}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 text-xs shadow-xs"
              >
                <Printer className="h-4 w-4" />
                Imprimir Agora (A4)
              </Button>
              <Button
                onClick={() => setIsPrintModalOpen(false)}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Fechar
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950 print:p-0 print:bg-white print:overflow-visible">
            <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0 print:max-w-none">
              <CalendarioAnualImpresso
                anoLetivo={anoLetivo}
                eventos={eventosDoAno}
                escolaNome={school?.name}
                stats={stats}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ======================= IMPRESSÃO DIRETA (FALLBACK PARA CTRL+P OU ATALHO) ======================= */}
      {!isPrintModalOpen && (
        <div className="hidden print:block print:w-full print:bg-white print:text-black print:p-0 print:m-0">
          <CalendarioAnualImpresso
            anoLetivo={anoLetivo}
            eventos={eventosDoAno}
            escolaNome={school?.name}
            stats={stats}
          />
        </div>
      )}
    </div>
  );
};
