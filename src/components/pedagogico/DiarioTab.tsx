import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Aluno } from '@/types/aluno';
import { TurmaConfig } from '@/types/finance';
import { DEFAULT_TURMAS_CONFIG } from '@/constants/turmas';
import { PlanejamentoAulaItem } from '@/types/pedagogico';
import { TeacherActivity } from '@/components/dashboard/TeacherDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit3,
  FileCheck,
  FileText,
  GraduationCap,
  MessageCircle,
  Plus,
  Search,
  Send,
  Trash2,
  UserCheck,
  UserX,
  Users,
  AlertTriangle,
  School,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Check,
  X,
  Phone,
  HelpCircle,
  ExternalLink,
  CalendarX,
  PartyPopper,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  EventoCalendarioEscolar,
  DEFAULT_EVENTOS_CALENDARIO_2026,
  getEventosNaData,
  getDiaSemAula,
} from '@/types/calendarioEscolar';

// Estrutura do Registro de Presença
export interface PresencaRegistroItem {
  ausente: boolean;
  justificada?: boolean;
  justificativa?: string;
}

export type PresencaDiaMapa = Record<string, PresencaRegistroItem>; // alunoId -> registro

// Estrutura de Ocorrência Pedagógica
export interface OcorrenciaPedagogica {
  id: string;
  alunoId: string;
  alunoNome: string;
  turmaNome: string;
  responsavelNome: string;
  responsavelContato?: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:MM
  tipo:
    | 'comportamento'
    | 'tarefa'
    | 'atraso'
    | 'material'
    | 'saude'
    | 'elogio'
    | 'outro';
  gravidade: 'leve' | 'moderada' | 'grave' | 'elogio';
  titulo: string;
  descricao: string;
  statusNotificacao: 'aguardando_coordenacao' | 'enviado_whatsapp';
  notificadoEm?: string;
  criadoPor?: string;
}

const TIPO_OCORRENCIA_LABELS: Record<
  OcorrenciaPedagogica['tipo'],
  { label: string; badgeClass: string }
> = {
  comportamento: {
    label: 'Comportamento / Disciplina',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
  },
  tarefa: {
    label: 'Lição / Tarefa não entregue',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300',
  },
  atraso: {
    label: 'Atraso na Entrada',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300',
  },
  material: {
    label: 'Falta de Material Didático',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300',
  },
  saude: {
    label: 'Saúde / Mal-estar',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300',
  },
  elogio: {
    label: 'Elogio / Destaque',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
  },
  outro: {
    label: 'Outro Registro',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
  },
};

const GRAVIDADE_LABELS: Record<
  OcorrenciaPedagogica['gravidade'],
  { label: string; dotClass: string }
> = {
  leve: { label: 'Leve', dotClass: 'bg-yellow-400' },
  moderada: { label: 'Moderada', dotClass: 'bg-orange-500' },
  grave: { label: 'Grave', dotClass: 'bg-rose-600' },
  elogio: { label: 'Positiva', dotClass: 'bg-emerald-500' },
};

export const DiarioTab: React.FC = () => {
  const { school, profile } = useAuth();

  // Dados Reais da Escola via LocalStorage
  const [alunosLocal] = useLocalStorage<Aluno[]>('escolinha_alunos', []);
  const [turmas] = useLocalStorage<TurmaConfig[]>('escolinha_turmas_v3', DEFAULT_TURMAS_CONFIG);
  const [planosAula, setPlanosAula] = useLocalStorage<PlanejamentoAulaItem[]>('escolinha_planos_aula_v1', []);
  const [professorAtividades, setProfessorAtividades] = useLocalStorage<TeacherActivity[]>('escolinha_professor_atividades_v1', []);

  // Frequência do Diário (Chave: `${turma}_${data}`)
  const [frequenciaArmazenada, setFrequenciaArmazenada] = useLocalStorage<Record<string, PresencaDiaMapa>>(
    'escolinha_diario_presencas_v2',
    {}
  );

  // Ocorrências Pedagógicas Reais
  const [ocorrencias, setOcorrencias] = useLocalStorage<OcorrenciaPedagogica[]>(
    'escolinha_ocorrencias_pedagogicas_v2',
    []
  );

  // Turmas disponíveis configuradas
  const availableTurmas = useMemo(() => {
    const list: string[] = [];
    turmas.forEach((t) => {
      const letters = t.letras && t.letras.length > 0 ? t.letras : ['A'];
      letters.forEach((l) => {
        list.push(`${t.nome} ${l}`.trim());
      });
    });
    return Array.from(new Set(list));
  }, [turmas]);

  // Identifica turmas que já possuem alunos ativos cadastrados
  const turmasComAlunos = useMemo(() => {
    const set = new Set<string>();
    alunosLocal.forEach((a) => {
      if (a.status === 'Ativo') {
        const fullTurma = `${a.classe || ''} ${a.turma || ''}`.trim();
        if (fullTurma) set.add(fullTurma);
        else if (a.classe) set.add(a.classe);
      }
    });
    return Array.from(set);
  }, [alunosLocal]);

  // Estado dos Filtros do Diário: seleciona preferencialmente uma turma que tem alunos reais
  const initialTurma = useMemo(() => {
    if (turmasComAlunos.length > 0) return turmasComAlunos[0];
    if (availableTurmas.length > 0) return availableTurmas[0];
    return '1º Ano A';
  }, [turmasComAlunos, availableTurmas]);

  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTurma, setSelectedTurma] = useState<string>(initialTurma);

  // Integração com o Calendário Escolar Oficial (Feriados, Recessos, Eventos)
  const [calendarioEventos] = useLocalStorage<EventoCalendarioEscolar[]>(
    'escolinha_calendario_escolar_v1',
    DEFAULT_EVENTOS_CALENDARIO_2026
  );

  const diaSemAulaInfo = useMemo(() => {
    return getDiaSemAula(selectedDate, calendarioEventos);
  }, [selectedDate, calendarioEventos]);

  const eventosDoDiaCalendario = useMemo(() => {
    return getEventosNaData(selectedDate, calendarioEventos);
  }, [selectedDate, calendarioEventos]);

  // Estado de Edição de Atividade do Planejamento
  const [isEditAtividadeOpen, setIsEditAtividadeOpen] = useState(false);
  const [editingAtividade, setEditingAtividade] = useState<{
    id?: string;
    titulo: string;
    disciplina: string;
    conteudo: string;
    tarefaCasa: string;
    status: string;
    horario: string;
  }>({
    titulo: '',
    disciplina: 'Língua Portuguesa',
    conteudo: '',
    tarefaCasa: '',
    status: 'Executada',
    horario: '07:30 - 09:10',
  });

  // Estado de Cadastro de Ocorrência
  const [isOcorrenciaOpen, setIsOcorrenciaOpen] = useState(false);
  const [ocorrenciaForm, setOcorrenciaForm] = useState({
    alunoId: '',
    tipo: 'comportamento' as OcorrenciaPedagogica['tipo'],
    gravidade: 'leve' as OcorrenciaPedagogica['gravidade'],
    titulo: '',
    descricao: '',
    horario: format(new Date(), 'HH:mm'),
  });

  // Alunos Reais da Turma Selecionada (SEM FALLBACK FICTÍCIO)
  const turmaAlunos = useMemo(() => {
    return alunosLocal.filter((aluno) => {
      if (aluno.status !== 'Ativo') return false;

      const cleanTurma = selectedTurma.trim().toLowerCase();
      const cleanClasse = (aluno.classe || '').trim().toLowerCase();
      const cleanLetra = (aluno.turma || '').trim().toLowerCase();
      const cleanCombo = `${cleanClasse} ${cleanLetra}`.trim();

      if (cleanCombo === cleanTurma) return true;
      if (cleanClasse === cleanTurma) return true;
      if (cleanLetra === cleanTurma) return true;
      if (cleanTurma.includes(cleanClasse) && cleanTurma.includes(cleanLetra)) return true;

      return false;
    });
  }, [alunosLocal, selectedTurma]);

  // Chave única de frequência para a turma e data
  const frequenciaKey = `${selectedTurma}_${selectedDate}`;
  const presencaAtual: PresencaDiaMapa = frequenciaArmazenada[frequenciaKey] || {};

  // Estatísticas da Chamada (Calculadas estritamente com os alunos reais da turma)
  const statsPresenca = useMemo(() => {
    const total = turmaAlunos.length;
    let ausentes = 0;
    let justificadas = 0;

    turmaAlunos.forEach((aluno) => {
      const reg = presencaAtual[aluno.id];
      if (reg?.ausente) {
        ausentes++;
        if (reg.justificada) justificadas++;
      }
    });

    const presentes = Math.max(0, total - ausentes);
    const taxa = total > 0 ? Math.round((presentes / total) * 100) : 100;

    return { total, presentes, ausentes, justificadas, taxa };
  }, [turmaAlunos, presencaAtual]);

  // Atividades do dia vindas do Planejamento Real
  const atividadesDoDia = useMemo(() => {
    // 1. Procura em planosAula
    const planos = planosAula.filter((p) => {
      const turmaMatch =
        (p.turmaNome && p.turmaNome.toLowerCase() === selectedTurma.toLowerCase()) ||
        (p.turmaId && p.turmaId.toLowerCase() === selectedTurma.toLowerCase());
      const dataMatch = p.dataPrevista === selectedDate;
      return turmaMatch && dataMatch;
    });

    // 2. Procura em professorAtividades
    const profAtividades = professorAtividades.filter((a) => {
      const turmaMatch = a.turma && a.turma.toLowerCase() === selectedTurma.toLowerCase();
      const dataMatch = a.data === selectedDate;
      return turmaMatch && dataMatch;
    });

    return { planos, profAtividades };
  }, [planosAula, professorAtividades, selectedTurma, selectedDate]);

  // Ocorrências registradas para o dia e turma
  const ocorrenciasDoDia = useMemo(() => {
    return ocorrencias.filter(
      (o) => o.turmaNome.toLowerCase() === selectedTurma.toLowerCase() && o.data === selectedDate
    );
  }, [ocorrencias, selectedTurma, selectedDate]);

  // Alterna Falta de um aluno (Marca apenas quem NÃO esteve na aula)
  const handleToggleFalta = (alunoId: string) => {
    const atual = presencaAtual[alunoId];
    const novoStatus: PresencaRegistroItem = atual?.ausente
      ? { ausente: false }
      : { ausente: true, justificada: false };

    setFrequenciaArmazenada((prev) => ({
      ...prev,
      [frequenciaKey]: {
        ...(prev[frequenciaKey] || {}),
        [alunoId]: novoStatus,
      },
    }));

    if (!atual?.ausente) {
      toast.warning('Aluno marcado como ausente (falta).');
    } else {
      toast.success('Aluno marcado como presente.');
    }
  };

  // Alterna justificativa de falta
  const handleToggleJustificada = (alunoId: string) => {
    const atual = presencaAtual[alunoId];
    if (!atual?.ausente) return;

    const novaJust = !atual.justificada;
    setFrequenciaArmazenada((prev) => ({
      ...prev,
      [frequenciaKey]: {
        ...(prev[frequenciaKey] || {}),
        [alunoId]: {
          ...atual,
          justificada: novaJust,
          justificativa: novaJust ? 'Atestado / Motivo Informado' : undefined,
        },
      },
    }));

    toast.info(novaJust ? 'Falta marcada como justificada.' : 'Justificativa removida.');
  };

  // Marcar todos como presentes (limpar faltas)
  const handleMarcarTodosPresentes = () => {
    setFrequenciaArmazenada((prev) => ({
      ...prev,
      [frequenciaKey]: {},
    }));
    toast.success('Todos os alunos foram marcados como presentes!');
  };

  // Salvar registro de presença
  const handleSalvarFrequencia = () => {
    toast.success('Frequência da aula salva com sucesso!');
  };

  // Abrir modal de edição/criação de conteúdo de aula
  const handleAbrirEdicaoAtividade = (planoExistente?: PlanejamentoAulaItem) => {
    if (planoExistente) {
      setEditingAtividade({
        id: planoExistente.id,
        titulo: planoExistente.titulo,
        disciplina: planoExistente.disciplinaNome,
        conteudo: planoExistente.conteudoProgramatico,
        tarefaCasa: planoExistente.tarefaCasa || '',
        status: planoExistente.status || 'Executada',
        horario: planoExistente.horario || '07:30 - 09:10',
      });
    } else {
      setEditingAtividade({
        titulo: '',
        disciplina: 'Língua Portuguesa',
        conteudo: '',
        tarefaCasa: '',
        status: 'Executada',
        horario: '07:30 - 09:10',
      });
    }
    setIsEditAtividadeOpen(true);
  };

  // Salvar alteração no planejamento a partir do Diário de Classe
  const handleSalvarAtividade = () => {
    if (!editingAtividade.titulo.trim()) {
      toast.error('Informe o título do conteúdo ministrado.');
      return;
    }

    if (editingAtividade.id) {
      // Atualiza plano de aula existente
      setPlanosAula((prev) =>
        prev.map((p) =>
          p.id === editingAtividade.id
            ? {
                ...p,
                titulo: editingAtividade.titulo,
                disciplinaNome: editingAtividade.disciplina,
                conteudoProgramatico: editingAtividade.conteudo,
                tarefaCasa: editingAtividade.tarefaCasa,
                status: editingAtividade.status as any,
                horario: editingAtividade.horario,
              }
            : p
        )
      );

      // Também sincroniza em professorAtividades se existir com o mesmo id
      setProfessorAtividades((prev) =>
        prev.map((a) =>
          a.id === editingAtividade.id
            ? {
                ...a,
                title: editingAtividade.titulo,
                materia: editingAtividade.disciplina,
                descricao: editingAtividade.conteudo,
                status: editingAtividade.status === 'Executada' ? 'concluida' : 'em_andamento',
                horario: editingAtividade.horario,
              }
            : a
        )
      );

      toast.success('Conteúdo atualizado no Diário de Classe e no Planejamento!');
    } else {
      const generatedId = `plan-diario-${Date.now()}`;

      // Cria novo plano de aula a partir do Diário
      const novoPlano: PlanejamentoAulaItem = {
        id: generatedId,
        turmaId: selectedTurma,
        turmaNome: selectedTurma,
        disciplinaId: 'mat-diario',
        disciplinaNome: editingAtividade.disciplina,
        cicloId: 'b1',
        cicloNome: 'Ciclo Vigente',
        dataPrevista: selectedDate,
        horario: editingAtividade.horario,
        titulo: editingAtividade.titulo,
        conteudoProgramatico: editingAtividade.conteudo,
        tarefaCasa: editingAtividade.tarefaCasa,
        status: editingAtividade.status as any,
      };

      // Cria também a atividade de professor para visualização direta no dashboard
      const novaAtividade: TeacherActivity = {
        id: generatedId,
        title: editingAtividade.titulo,
        type: editingAtividade.tarefaCasa ? 'tarefa' : 'aula',
        turma: selectedTurma,
        materia: editingAtividade.disciplina,
        data: selectedDate,
        horario: editingAtividade.horario,
        descricao: editingAtividade.conteudo,
        status: editingAtividade.status === 'Executada' ? 'concluida' : 'pendente',
        createdAt: new Date().toISOString(),
      };

      setPlanosAula((prev) => [novoPlano, ...prev]);
      setProfessorAtividades((prev) => [novaAtividade, ...prev]);
      toast.success('Novo conteúdo registrado no Diário e integrado ao Planejamento!');
    }

    setIsEditAtividadeOpen(false);
  };

  // Salvar nova ocorrência
  const handleSalvarOcorrencia = () => {
    if (!ocorrenciaForm.alunoId) {
      toast.error('Selecione o aluno.');
      return;
    }
    if (!ocorrenciaForm.titulo.trim() || !ocorrenciaForm.descricao.trim()) {
      toast.error('Preencha o título e a descrição da ocorrência.');
      return;
    }

    const alunoObj = turmaAlunos.find((a) => a.id === ocorrenciaForm.alunoId);

    const novaOco: OcorrenciaPedagogica = {
      id: `oco-${Date.now()}`,
      alunoId: ocorrenciaForm.alunoId,
      alunoNome: alunoObj?.nome || 'Aluno',
      turmaNome: selectedTurma,
      responsavelNome: alunoObj?.nomeResponsavel || 'Responsável',
      responsavelContato: alunoObj?.contatoResponsavel || alunoObj?.contatoWhatsapp,
      data: selectedDate,
      horario: ocorrenciaForm.horario || format(new Date(), 'HH:mm'),
      tipo: ocorrenciaForm.tipo,
      gravidade: ocorrenciaForm.gravidade,
      titulo: ocorrenciaForm.titulo,
      descricao: ocorrenciaForm.descricao,
      statusNotificacao: 'aguardando_coordenacao', // Inicia aguardando a coordenação escolher enviar
      criadoPor: profile?.full_name || 'Professor(a)',
    };

    setOcorrencias((prev) => [novaOco, ...prev]);
    toast.success('Ocorrência anotada! Ela está aguardando liberação da coordenação para envio.');
    setIsOcorrenciaOpen(false);
    setOcorrenciaForm({
      alunoId: '',
      tipo: 'comportamento',
      gravidade: 'leve',
      titulo: '',
      descricao: '',
      horario: format(new Date(), 'HH:mm'),
    });
  };

  // Excluir ocorrência
  const handleExcluirOcorrencia = (id: string) => {
    if (confirm('Deseja excluir esta ocorrência?')) {
      setOcorrencias((prev) => prev.filter((o) => o.id !== id));
      toast.success('Ocorrência removida.');
    }
  };

  // Enviar Notificação via WhatsApp pela Coordenação
  const handleEnviarWhatsAppCoordenacao = (oco: OcorrenciaPedagogica) => {
    if (!oco.responsavelContato) {
      toast.error('Este aluno não possui número de contato cadastrado na ficha.');
      return;
    }

    const dataBr = format(parseISO(oco.data), 'dd/MM/yyyy', { locale: ptBR });
    const tipoLabel = TIPO_OCORRENCIA_LABELS[oco.tipo]?.label || oco.tipo;
    const escolaNome = school?.name || 'Escola';

    const mensagem =
      `Olá, ${oco.responsavelNome}!\n\n` +
      `Aqui é da Coordenação Pedagógica da *${escolaNome}*.\n` +
      `Gostaríamos de comunicar um registro de ocorrência referente ao(à) aluno(a) *${oco.alunoNome}* (${oco.turmaNome}) no dia ${dataBr}:\n\n` +
      `📌 *Tipo*: ${tipoLabel}\n` +
      `📝 *Título*: ${oco.titulo}\n` +
      `💬 *Descrição*: ${oco.descricao}\n\n` +
      `Estamos à disposição para qualquer esclarecimento pedagógico.\n` +
      `Atenciosamente,\n*Coordenação Pedagógica - ${escolaNome}*`;

    const cleanPhone = oco.responsavelContato.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(mensagem)}`;

    // Abre o WhatsApp
    window.open(url, '_blank');

    // Marca como enviada com registro de data/hora
    setOcorrencias((prev) =>
      prev.map((o) =>
        o.id === oco.id
          ? {
              ...o,
              statusNotificacao: 'enviado_whatsapp',
              notificadoEm: new Date().toISOString(),
            }
          : o
      )
    );

    toast.success('Notificação aberta no WhatsApp e marcada como enviada aos pais!');
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros e Seleção do Dia / Turma */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-slate-900/60 dark:to-slate-900/60">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Título e Subtítulo */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                  Diário de Classe Digital
                </h3>
                <Badge variant="outline" className="text-xs bg-white dark:bg-slate-900 font-medium">
                  {selectedTurma}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Conteúdos ministrados, chamada de frequência (marque quem faltou) e ocorrências com WhatsApp
              </p>
            </div>

            {/* Controles: Turma, Data e Navegação */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Seletor de Turma */}
              <div className="flex items-center gap-1.5">
                <School className="h-4 w-4 text-muted-foreground hidden sm:inline" />
                <Select value={selectedTurma} onValueChange={setSelectedTurma}>
                  <SelectTrigger className="h-8 text-xs w-48 bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Selecione a Turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTurmas.map((t) => {
                      const hasAlunos = turmasComAlunos.includes(t);
                      return (
                        <SelectItem key={t} value={t} className="text-xs">
                          {t} {hasAlunos ? '✓' : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Seletor de Data com Navegação Anterior/Próximo */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-950 border rounded-lg p-0.5 shadow-2xs">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    const prev = subDays(parseISO(selectedDate), 1);
                    setSelectedDate(format(prev, 'yyyy-MM-dd'));
                  }}
                  title="Dia anterior"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>

                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-7 text-xs border-0 w-32 focus-visible:ring-0 p-0 text-center font-medium"
                />

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    const next = addDays(parseISO(selectedDate), 1);
                    setSelectedDate(format(next, 'yyyy-MM-dd'));
                  }}
                  title="Próximo dia"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Botão Hoje */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                className="h-8 text-xs bg-white dark:bg-slate-950"
              >
                Hoje
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ALERTA DE CALENDÁRIO ESCOLAR: DIA SEM AULA OU EVENTO ESPECIAL */}
      {diaSemAulaInfo ? (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-800 dark:text-rose-200 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 shrink-0">
              <CalendarX size={20} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-rose-900 dark:text-rose-100">
                  Atenção: Dia Sem Aula no Calendário Escolar
                </span>
                <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900 dark:text-rose-200 text-[10px] font-semibold">
                  {diaSemAulaInfo.titulo}
                </Badge>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                {diaSemAulaInfo.descricao || 'Esta data está registrada como dia não letivo (feriado, recesso escolar ou parada pedagógica).'}
              </p>
            </div>
          </div>
          <Link
            to="/app/pedagogico?tab=calendario"
            className="text-xs font-semibold text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-rose-100 underline shrink-0 flex items-center gap-1"
          >
            Ver Calendário Escolar →
          </Link>
        </div>
      ) : eventosDoDiaCalendario.length > 0 ? (
        <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-purple-900 dark:text-purple-100 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 shrink-0">
              <PartyPopper size={18} />
            </div>
            <div>
              <p className="text-xs font-medium">
                <strong className="font-bold text-purple-800 dark:text-purple-200">Marco no Calendário Escolar: </strong>
                {eventosDoDiaCalendario.map((e) => `${e.titulo}${e.horario ? ` (${e.horario})` : ''}`).join(' • ')}
              </p>
            </div>
          </div>
          <Link
            to="/app/pedagogico?tab=calendario"
            className="text-xs font-semibold text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 underline shrink-0"
          >
            Ver Calendário →
          </Link>
        </div>
      ) : null}

      {/* SEÇÃO 1: ATIVIDADES DO DIA (VINDAS DO PLANEJAMENTO REAL) */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                1. Atividades e Conteúdos do Dia (Planejamento)
              </CardTitle>
              <Badge variant="secondary" className="text-xs font-normal">
                {atividadesDoDia.planos.length + atividadesDoDia.profAtividades.length} aula(s)
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Traz os conteúdos previstos no planejamento com opção de ajuste e registro em tempo real
            </CardDescription>
          </div>

          <Button
            size="sm"
            onClick={() => handleAbrirEdicaoAtividade()}
            className="text-xs h-8 gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar / Alterar Conteúdo
          </Button>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {atividadesDoDia.planos.length === 0 && atividadesDoDia.profAtividades.length === 0 ? (
            <div className="p-6 rounded-lg border border-dashed text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
              <BookOpen className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Nenhum conteúdo pré-planejado para {selectedTurma} nesta data
              </p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Você pode registrar o conteúdo ministrado diretamente aqui no Diário de Classe clicando no botão abaixo:
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAbrirEdicaoAtividade()}
                className="text-xs gap-1.5 mt-2"
              >
                <Plus className="h-3.5 w-3.5" />
                Registrar Conteúdo Ministrado Hoje
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Planos de Aula Sincronizados */}
              {atividadesDoDia.planos.map((plano) => (
                <div
                  key={plano.id}
                  className="p-3.5 rounded-lg border bg-white dark:bg-slate-950 space-y-2 shadow-2xs hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Badge className="text-[10px] h-4 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200">
                          {plano.disciplinaNome}
                        </Badge>
                        {plano.horario && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {plano.horario}
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {plano.titulo}
                      </h4>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAbrirEdicaoAtividade(plano)}
                      className="h-7 text-xs px-2 gap-1 text-purple-700 hover:bg-purple-50"
                      title="Editar conteúdo ministrado"
                    >
                      <Edit3 className="h-3 w-3" />
                      Alterar
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-md">
                    <p className="line-clamp-2">
                      <strong className="text-slate-700 dark:text-slate-300">Conteúdo:</strong>{' '}
                      {plano.conteudoProgramatico}
                    </p>
                    {plano.tarefaCasa && (
                      <p className="line-clamp-1">
                        <strong className="text-slate-700 dark:text-slate-300">Tarefa:</strong>{' '}
                        {plano.tarefaCasa}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Badge
                      variant={plano.status === 'Executada' ? 'default' : 'secondary'}
                      className={`text-[10px] h-4 ${plano.status === 'Executada' ? 'bg-emerald-600 text-white' : ''}`}
                    >
                      {plano.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground italic">
                      Planejamento integrado
                    </span>
                  </div>
                </div>
              ))}

              {/* Atividades Registradas pelo Professor */}
              {atividadesDoDia.profAtividades
                .filter((act) => !atividadesDoDia.planos.some((p) => p.id === act.id))
                .map((act) => (
                  <div
                    key={act.id}
                    className="p-3.5 rounded-lg border bg-white dark:bg-slate-950 space-y-2 shadow-2xs hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Badge className="text-[10px] h-4 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200">
                            {act.materia}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {act.horario}
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {act.title}
                        </h4>
                      </div>

                      <Badge
                        variant={act.status === 'concluida' ? 'default' : 'secondary'}
                        className={`text-[10px] h-4 ${act.status === 'concluida' ? 'bg-emerald-600 text-white' : ''}`}
                      >
                        {act.status === 'concluida' ? 'Executada' : 'Pendente'}
                      </Badge>
                    </div>

                    {act.descricao && (
                      <p className="text-xs text-muted-foreground line-clamp-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-md">
                        {act.descricao}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEÇÃO 2: CHAMADA & PRESENÇA (DADOS VERÍDICOS: APENAS ALUNOS REAIS MATRICULADOS) */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-600" />
                2. Chamada & Presença da Aula
              </CardTitle>
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                Padrão: Todos Presentes
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Todos os alunos estão presentes por padrão. <strong>Marque apenas os alunos que NÃO estiveram na aula.</strong>
            </CardDescription>
          </div>

          {turmaAlunos.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarcarTodosPresentes}
                className="text-xs h-8 text-slate-600"
              >
                Marcar Todos como Presentes
              </Button>
              <Button
                size="sm"
                onClick={handleSalvarFrequencia}
                className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="h-3.5 w-3.5" />
                Salvar Chamada
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {turmaAlunos.length === 0 ? (
            <div className="p-8 rounded-lg border border-dashed text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
              <Users className="h-8 w-8 text-muted-foreground mx-auto" />
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Nenhum aluno matriculado na turma "{selectedTurma}"
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Para realizar a chamada verídica, cadastre os alunos desta turma no módulo de Alunos.
                </p>
              </div>
              <Link to="/app/alunos">
                <Button size="sm" variant="outline" className="text-xs gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Ir para Gestão de Alunos & Matrículas
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Banner de Estatísticas da Chamada */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border text-xs">
                <div className="space-y-0.5">
                  <span className="text-muted-foreground text-[11px]">Total Matriculados</span>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{statsPresenca.total}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-muted-foreground text-[11px]">Presentes em Sala</span>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {statsPresenca.presentes}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-muted-foreground text-[11px]">Ausentes (Faltas)</span>
                  <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                    {statsPresenca.ausentes}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-muted-foreground text-[11px]">Taxa de Frequência</span>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {statsPresenca.taxa}%
                  </p>
                </div>
              </div>

              {/* Lista de Alunos Reais para Chamada */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-lg overflow-hidden">
                {turmaAlunos.map((aluno, index) => {
                  const reg = presencaAtual[aluno.id];
                  const estaAusente = !!reg?.ausente;
                  const faltaJustificada = !!reg?.justificada;

                  return (
                    <div
                      key={aluno.id}
                      className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        estaAusente
                          ? 'bg-rose-50/70 dark:bg-rose-950/20'
                          : 'bg-white dark:bg-slate-950 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground w-6 text-center">
                          {(index + 1).toString().padStart(2, '0')}
                        </span>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-semibold ${
                                estaAusente
                                  ? 'text-rose-700 dark:text-rose-300'
                                  : 'text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {aluno.nome}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Matr: {aluno.matricula || 'S/N'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>Resp: {aluno.nomeResponsavel || 'Não informado'}</span>
                            {(aluno.contatoResponsavel || aluno.contatoWhatsapp) && (
                              <span>• Tel: {aluno.contatoResponsavel || aluno.contatoWhatsapp}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ações de Presença: Botão para marcar Falta com 1 clique */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {estaAusente ? (
                          <>
                            <Badge
                              variant="destructive"
                              className="text-xs h-6 px-2 bg-rose-600 flex items-center gap-1 cursor-pointer"
                              onClick={() => handleToggleFalta(aluno.id)}
                              title="Clique para desmarcar e voltar para Presente"
                            >
                              <UserX className="h-3 w-3" />
                              Ausente (Falta)
                            </Badge>

                            <Button
                              variant={faltaJustificada ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleToggleJustificada(aluno.id)}
                              className={`h-6 text-[10px] px-2 ${
                                faltaJustificada
                                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                                  : 'text-slate-600 hover:bg-amber-50'
                              }`}
                            >
                              {faltaJustificada ? 'Justificada ✓' : 'Justificar Falta'}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Badge
                              variant="outline"
                              className="text-xs h-6 px-2.5 bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" />
                              Presente
                            </Badge>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleFalta(aluno.id)}
                              className="h-6 text-[11px] px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                            >
                              Marcar Falta
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* SEÇÃO 3: REGISTRO DE OCORRÊNCIAS (ENVIO WHATSAPP PELA COORDENAÇÃO) */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                3. Ocorrências Pedagógicas dos Alunos
              </CardTitle>
              <Badge variant="secondary" className="text-xs font-normal">
                {ocorrenciasDoDia.length} no dia
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Anote ocorrências disciplinares ou comunicados. <strong>A coordenadora escolhe quando vai enviar a notificação aos pais via WhatsApp.</strong>
            </CardDescription>
          </div>

          <Button
            size="sm"
            onClick={() => {
              if (turmaAlunos.length === 0) {
                toast.error('Não é possível anotar ocorrências pois não há alunos matriculados nesta turma.');
                return;
              }
              setIsOcorrenciaOpen(true);
            }}
            className="text-xs h-8 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Anotar Ocorrência
          </Button>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {ocorrenciasDoDia.length === 0 ? (
            <div className="p-6 rounded-lg border border-dashed text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Nenhuma ocorrência registrada para {selectedTurma} nesta data
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                A turma não possui registros disciplinares ou comunicados pendentes para esta aula.
              </p>
              {turmaAlunos.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOcorrenciaOpen(true)}
                  className="text-xs gap-1.5 mt-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Anotar Nova Ocorrência
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {ocorrenciasDoDia.map((oco) => {
                const tipoConfig = TIPO_OCORRENCIA_LABELS[oco.tipo] || TIPO_OCORRENCIA_LABELS.outro;
                const gravidadeConfig = GRAVIDADE_LABELS[oco.gravidade] || GRAVIDADE_LABELS.leve;
                const enviadaWhatsApp = oco.statusNotificacao === 'enviado_whatsapp';

                return (
                  <div
                    key={oco.id}
                    className="p-3.5 rounded-lg border bg-white dark:bg-slate-950 space-y-2.5 shadow-2xs hover:border-amber-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                            {oco.alunoNome}
                          </span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 border ${tipoConfig.badgeClass}`}>
                            {tipoConfig.label}
                          </Badge>
                          <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                            <span className={`w-2 h-2 rounded-full ${gravidadeConfig.dotClass}`} />
                            {gravidadeConfig.label}
                          </span>
                        </div>

                        <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {oco.titulo}
                        </h5>
                      </div>

                      {/* Status de Envio pela Coordenação */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {enviadaWhatsApp ? (
                          <Badge className="text-[10px] h-5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Notificado aos Pais via WhatsApp
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            Aguardando Envio da Coordenação
                          </Badge>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleExcluirOcorrencia(oco.id)}
                          className="h-6 w-6 text-slate-400 hover:text-rose-600"
                          title="Excluir ocorrência"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-md">
                      {oco.descricao}
                    </p>

                    {/* Rodapé: Contato do Responsável e Botão de Envio WhatsApp da Coordenação */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span>Resp: <strong className="text-slate-700 dark:text-slate-300">{oco.responsavelNome}</strong></span>
                        {oco.responsavelContato && (
                          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            <Phone className="h-3 w-3" />
                            {oco.responsavelContato}
                          </span>
                        )}
                      </div>

                      {/* Botão para a Coordenação Enviar a Notificação aos Pais */}
                      <div>
                        {enviadaWhatsApp ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEnviarWhatsAppCoordenacao(oco)}
                            className="h-6 text-[11px] px-2 text-emerald-700 hover:bg-emerald-50 gap-1"
                          >
                            <MessageCircle className="h-3 w-3" />
                            Reenviar no WhatsApp
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleEnviarWhatsAppCoordenacao(oco)}
                            className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs font-medium"
                          >
                            <Send className="h-3 w-3" />
                            Enviar Notificação aos Pais via WhatsApp
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL: EDITAR / REGISTRAR CONTEÚDO DO DIA NO PLANEJAMENTO */}
      <Dialog open={isEditAtividadeOpen} onOpenChange={setIsEditAtividadeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              {editingAtividade.id ? 'Alterar Conteúdo Ministrado' : 'Registrar Conteúdo de Aula'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Atualize as informações pedagógicas da aula para a turma {selectedTurma}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="cont_titulo" className="text-xs font-semibold">
                Título do Conteúdo / Aula *
              </Label>
              <Input
                id="cont_titulo"
                placeholder="Ex: Alfabetização e Separação Silábica"
                value={editingAtividade.titulo}
                onChange={(e) => setEditingAtividade({ ...editingAtividade, titulo: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="cont_disc" className="text-xs font-semibold">
                  Disciplina / Matéria
                </Label>
                <Input
                  id="cont_disc"
                  value={editingAtividade.disciplina}
                  onChange={(e) => setEditingAtividade({ ...editingAtividade, disciplina: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cont_hora" className="text-xs font-semibold">
                  Horário
                </Label>
                <Input
                  id="cont_hora"
                  placeholder="07:30 - 09:10"
                  value={editingAtividade.horario}
                  onChange={(e) => setEditingAtividade({ ...editingAtividade, horario: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="cont_desc" className="text-xs font-semibold">
                Conteúdo Ministrado em Sala
              </Label>
              <Textarea
                id="cont_desc"
                placeholder="Detalhes das explicações, dinâmicas realizadas, páginas de livros trabalhadas..."
                value={editingAtividade.conteudo}
                onChange={(e) => setEditingAtividade({ ...editingAtividade, conteudo: e.target.value })}
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="cont_tarefa" className="text-xs font-semibold">
                Tarefa de Casa (se houver)
              </Label>
              <Input
                id="cont_tarefa"
                placeholder="Ex: Exercícios 1 a 5 da página 38"
                value={editingAtividade.tarefaCasa}
                onChange={(e) => setEditingAtividade({ ...editingAtividade, tarefaCasa: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="cont_status" className="text-xs font-semibold">
                Status da Aula
              </Label>
              <Select
                value={editingAtividade.status}
                onValueChange={(val) => setEditingAtividade({ ...editingAtividade, status: val })}
              >
                <SelectTrigger id="cont_status" className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Executada" className="text-xs">Executada / Ministrada</SelectItem>
                  <SelectItem value="Em Andamento" className="text-xs">Em Andamento</SelectItem>
                  <SelectItem value="Planejada" className="text-xs">Planejada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditAtividadeOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSalvarAtividade}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
            >
              Salvar no Diário & Planejamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: ANOTAR NOVA OCORRÊNCIA */}
      <Dialog open={isOcorrenciaOpen} onOpenChange={setIsOcorrenciaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Anotar Ocorrência Pedagógica
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registre a ocorrência do aluno. Ela ficará salva e a coordenadora escolherá o momento de enviar a notificação aos pais via WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="oco_aluno" className="text-xs font-semibold">
                Aluno(a) da Turma *
              </Label>
              <Select
                value={ocorrenciaForm.alunoId}
                onValueChange={(val) => setOcorrenciaForm({ ...ocorrenciaForm, alunoId: val })}
              >
                <SelectTrigger id="oco_aluno" className="h-8 text-xs">
                  <SelectValue placeholder="Selecione o aluno..." />
                </SelectTrigger>
                <SelectContent>
                  {turmaAlunos.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.nome} (Resp: {a.nomeResponsavel || 'Não inf.'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="oco_tipo" className="text-xs font-semibold">
                  Tipo de Ocorrência
                </Label>
                <Select
                  value={ocorrenciaForm.tipo}
                  onValueChange={(val) =>
                    setOcorrenciaForm({ ...ocorrenciaForm, tipo: val as OcorrenciaPedagogica['tipo'] })
                  }
                >
                  <SelectTrigger id="oco_tipo" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIPO_OCORRENCIA_LABELS) as OcorrenciaPedagogica['tipo'][]).map(
                      (key) => (
                        <SelectItem key={key} value={key} className="text-xs">
                          {TIPO_OCORRENCIA_LABELS[key].label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="oco_gravidade" className="text-xs font-semibold">
                  Gravidade
                </Label>
                <Select
                  value={ocorrenciaForm.gravidade}
                  onValueChange={(val) =>
                    setOcorrenciaForm({
                      ...ocorrenciaForm,
                      gravidade: val as OcorrenciaPedagogica['gravidade'],
                    })
                  }
                >
                  <SelectTrigger id="oco_gravidade" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(GRAVIDADE_LABELS) as OcorrenciaPedagogica['gravidade'][]).map(
                      (key) => (
                        <SelectItem key={key} value={key} className="text-xs">
                          {GRAVIDADE_LABELS[key].label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="oco_titulo" className="text-xs font-semibold">
                Título / Resumo da Ocorrência *
              </Label>
              <Input
                id="oco_titulo"
                placeholder="Ex: Não apresentou a lição de casa de Matemática"
                value={ocorrenciaForm.titulo}
                onChange={(e) => setOcorrenciaForm({ ...ocorrenciaForm, titulo: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="oco_desc" className="text-xs font-semibold">
                Descrição Detalhada do Fato *
              </Label>
              <Textarea
                id="oco_desc"
                placeholder="Descreva o que ocorreu de forma clara para que a coordenação e os responsáveis compreendam..."
                value={ocorrenciaForm.descricao}
                onChange={(e) => setOcorrenciaForm({ ...ocorrenciaForm, descricao: e.target.value })}
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOcorrenciaOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSalvarOcorrencia}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
            >
              Anotar Ocorrência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
