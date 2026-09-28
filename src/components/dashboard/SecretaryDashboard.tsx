import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Aluno } from '@/types/aluno';
import { TurmaConfig } from '@/types/finance';
import { DEFAULT_TURMAS_CONFIG } from '@/constants/turmas';
import { Link } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  FileWarning,
  CheckSquare2,
  Search,
  Plus,
  Phone,
  MessageCircle,
  FileText,
  School,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Clock,
  Trash2,
  CheckCircle2,
  ExternalLink,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';

interface SecretaryTask {
  id: string;
  title: string;
  category: 'documentacao' | 'atendimento' | 'cadastros' | 'rotina';
  completed: boolean;
}

const DEFAULT_SECRETARY_TASKS: SecretaryTask[] = [
  {
    id: 'sec-1',
    title: 'Conferir preenchimento dos diários e presenças das turmas matutinas',
    category: 'rotina',
    completed: true,
  },
  {
    id: 'sec-2',
    title: 'Emitir declarações de frequência e matrícula solicitadas pelos responsáveis',
    category: 'documentacao',
    completed: false,
  },
  {
    id: 'sec-3',
    title: 'Cobrar certidões de nascimento e carteiras de vacinação pendentes',
    category: 'documentacao',
    completed: false,
  },
  {
    id: 'sec-4',
    title: 'Atualizar contatos de emergência e telefones de novos responsáveis',
    category: 'cadastros',
    completed: false,
  },
  {
    id: 'sec-5',
    title: 'Organizar prontuários e pastas físicas dos alunos recém-matriculados',
    category: 'rotina',
    completed: false,
  },
  {
    id: 'sec-6',
    title: 'Registrar atestados médicos entregues na secretaria hoje',
    category: 'atendimento',
    completed: false,
  },
];

export const SecretaryDashboard: React.FC = () => {
  const [alunos] = useLocalStorage<Aluno[]>('escolinha_alunos', []);
  const [turmas] = useLocalStorage<TurmaConfig[]>('escolinha_turmas_v3', DEFAULT_TURMAS_CONFIG);
  const [tasks, setTasks] = useLocalStorage<SecretaryTask[]>(
    'escolinha_secretaria_tarefas_v1',
    DEFAULT_SECRETARY_TASKS
  );

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. KPI Calculations
  const metrics = useMemo(() => {
    const totalAtivos = alunos.filter((a) => a.status === 'Ativo').length;

    // Matrículas no mês vigente (ou últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const now = new Date();

    const matriculasMes = alunos.filter((a) => {
      if (!a.dataMatricula) return false;
      const d = new Date(a.dataMatricula);
      if (isNaN(d.getTime())) return false;
      return (
        (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) ||
        d >= thirtyDaysAgo
      );
    }).length;

    // Alunos com pendências de documentos
    const alunosComPendencia = alunos.filter((a) => {
      const semCertidao = !a.certidaoNascimento || a.certidaoNascimento.trim() === '';
      const semCpf = !a.cpf || a.cpf.trim() === '';
      const semRg = !a.rg || a.rg.trim() === '';
      const semCpfResp = !a.cpfResponsavel || a.cpfResponsavel.trim() === '';
      return semCertidao || semCpf || semRg || semCpfResp;
    });

    return {
      totalAtivos,
      matriculasMes,
      pendenciasCount: alunosComPendencia.length,
      alunosComPendencia,
      turmasAtivas: turmas.length,
    };
  }, [alunos, turmas]);

  // Checklist statistics
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  // Toggle checklist item
  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const next = !t.completed;
          toast.success(next ? 'Tarefa concluída!' : 'Tarefa reaberta.');
          return { ...t, completed: next };
        }
        return t;
      })
    );
  };

  // Add task to checklist
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: SecretaryTask = {
      id: `sec-${Date.now()}`,
      title: newTaskTitle.trim(),
      category: 'rotina',
      completed: false,
    };

    setTasks((prev) => [newTask, ...prev]);
    setNewTaskTitle('');
    toast.success('Tarefa adicionada ao checklist!');
  };

  // Delete task from checklist
  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast.success('Tarefa removida.');
  };

  // Filtered search of students/guardians
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return alunos
      .filter((a) => {
        const matchName = a.nome?.toLowerCase().includes(q);
        const matchResp = a.nomeResponsavel?.toLowerCase().includes(q);
        const matchMatricula = a.matricula?.toLowerCase().includes(q);
        const matchTurma = a.turma?.toLowerCase().includes(q) || a.classe?.toLowerCase().includes(q);
        return matchName || matchResp || matchMatricula || matchTurma;
      })
      .slice(0, 5);
  }, [alunos, searchQuery]);

  // Alunos recentemente matriculados (últimos 5)
  const recentEnrollments = useMemo(() => {
    return [...alunos]
      .sort((a, b) => {
        const timeA = a.dataMatricula ? new Date(a.dataMatricula).getTime() : 0;
        const timeB = b.dataMatricula ? new Date(b.dataMatricula).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [alunos]);

  // Build WhatsApp URL
  const getWhatsAppLink = (phone: string | undefined, message: string) => {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-6">
      {/* Botões de Ações Rápidas da Secretaria */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 border border-blue-100 dark:border-blue-900/30">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <School className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Central da Secretaria Escolar
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acompanhe matrículas, conferência de documentos e rotinas de atendimento aos pais
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/app/alunos">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 h-8">
              <Plus className="h-3.5 w-3.5" />
              Nova Matrícula
            </Button>
          </Link>
          <Link to="/app/alunos">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
              <FileText className="h-3.5 w-3.5" />
              Emitir Documentos
            </Button>
          </Link>
          <Link to="/app/alunos">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
              <GraduationCap className="h-3.5 w-3.5" />
              Quadro de Turmas
            </Button>
          </Link>
        </div>
      </div>

      {/* Cards de KPIs da Secretaria */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Alunos Ativos
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {metrics.totalAtivos}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Alunos com matrícula ativa
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Novas Matrículas
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <GraduationCap className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.matriculasMes}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Registradas recentemente
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pendências de Docs
            </CardTitle>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <FileWarning className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {metrics.pendenciasCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Faltam certidão, vacina ou CPF
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Turmas Ativas
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <School className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
              {metrics.turmasAtivas}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Turmas abertas no ano letivo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid Principal: 2 Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: Matrículas Recentes e Alunos com Documentos Pendentes */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Últimas Matrículas Realizadas */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  Últimas Matrículas Realizadas
                </CardTitle>
                <CardDescription className="text-xs">
                  Alunos adicionados recentemente à rede de ensino
                </CardDescription>
              </div>
              <Link to="/app/alunos">
                <Button variant="ghost" size="sm" className="text-xs h-7 text-blue-600 hover:text-blue-700">
                  Ver Todos
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="p-0">
              {recentEnrollments.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Nenhum aluno cadastrado ainda.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentEnrollments.map((aluno) => {
                    const whatsMessage = `Olá ${aluno.nomeResponsavel || 'Responsável'}, aqui é da Secretaria da escola! Estamos entrando em contato referente à matrícula de ${aluno.nome}.`;
                    const whatsLink = getWhatsAppLink(aluno.contatoResponsavel || aluno.contatoWhatsapp, whatsMessage);

                    return (
                      <div
                        key={aluno.id}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">
                              {aluno.nome}
                            </span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              {aluno.turma || aluno.classe || 'Sem Turma'}
                            </Badge>
                            {aluno.turno && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-slate-500">
                                {aluno.turno}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground truncate">
                            <span>Resp: {aluno.nomeResponsavel || 'Não informado'}</span>
                            {aluno.contatoResponsavel && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {aluno.contatoResponsavel}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {aluno.contatoResponsavel ? (
                            <a
                              href={whatsLink}
                              target="_blank"
                              rel="noreferrer"
                              title="Conversar no WhatsApp"
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[11px] gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                WhatsApp
                              </Button>
                            </a>
                          ) : null}
                          <Badge
                            variant={aluno.status === 'Ativo' ? 'default' : 'secondary'}
                            className={`text-[10px] h-5 ${aluno.status === 'Ativo' ? 'bg-emerald-500' : ''}`}
                          >
                            {aluno.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card: Documentações Pendentes */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileWarning className="h-4 w-4 text-rose-500" />
                  Alunos com Documentação Pendente
                </CardTitle>
                <CardDescription className="text-xs">
                  Cobrança e regularização de documentos cadastrais dos alunos
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200">
                {metrics.alunosComPendencia.length} pendentes
              </Badge>
            </CardHeader>

            <CardContent className="p-0">
              {metrics.alunosComPendencia.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Tudo em dia!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Todos os alunos cadastrados estão com a documentação regularizada.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[360px] overflow-y-auto">
                  {metrics.alunosComPendencia.map((aluno) => {
                    const missingDocs: string[] = [];
                    if (!aluno.certidaoNascimento) missingDocs.push('Certidão de Nascimento');
                    if (!aluno.cpf) missingDocs.push('CPF Aluno');
                    if (!aluno.rg) missingDocs.push('RG Aluno');
                    if (!aluno.cpfResponsavel) missingDocs.push('CPF Responsável');

                    const cobrancaMsg = `Olá ${aluno.nomeResponsavel || 'Responsável'}, aqui é da Secretaria Escolar. Constatamos pendência no prontuário do aluno(a) ${aluno.nome}: ${missingDocs.join(', ')}. Por gentileza, nos envie para regularizar o cadastro. Obrigado!`;
                    const whatsLink = getWhatsAppLink(aluno.contatoResponsavel || aluno.contatoWhatsapp, cobrancaMsg);

                    return (
                      <div
                        key={aluno.id}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-800 dark:text-slate-100">
                              {aluno.nome}
                            </span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              {aluno.turma || aluno.classe || 'Sem Turma'}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {missingDocs.map((doc) => (
                              <Badge
                                key={doc}
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 h-4 bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                              >
                                {doc}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {aluno.contatoResponsavel ? (
                            <a
                              href={whatsLink}
                              target="_blank"
                              rel="noreferrer"
                              title="Enviar lembrete via WhatsApp"
                            >
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2.5 gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                Cobrar no WhatsApp
                              </Button>
                            </a>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">
                              Sem telefone
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* COLUNA DIREITA: Checklist Diário e Busca Rápida */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Checklist Diário da Secretaria */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <CheckSquare2 className="h-4 w-4 text-emerald-600" />
                    Rotinas & Checklist do Dia
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {completedTasksCount} de {tasks.length} tarefas finalizadas ({progressPercent}%)
                  </CardDescription>
                </div>
                <Badge
                  variant={progressPercent === 100 ? 'default' : 'secondary'}
                  className={progressPercent === 100 ? 'bg-emerald-600 text-white' : ''}
                >
                  {progressPercent}%
                </Badge>
              </div>

              <div className="pt-2">
                <Progress value={progressPercent} className="h-1.5" />
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {/* Formulário para adicionar nova tarefa */}
              <form onSubmit={handleAddTask} className="flex gap-2">
                <Input
                  placeholder="Nova tarefa da secretaria..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button type="submit" size="sm" className="h-8 px-2.5 text-xs shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </form>

              {/* Lista de Tarefas Interativas */}
              <div className="space-y-2 pt-1 max-h-[320px] overflow-y-auto">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all ${
                      task.completed
                        ? 'bg-slate-50/70 dark:bg-slate-900/30 border-slate-200 text-muted-foreground'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-xs'
                    }`}
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => handleToggleTask(task.id)}
                      className="mt-0.5"
                    />
                    <span
                      className={`text-xs flex-1 leading-relaxed ${
                        task.completed ? 'line-through text-muted-foreground' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {task.title}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTask(task.id)}
                      className="h-5 w-5 text-slate-400 hover:text-rose-500 opacity-60 hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Card: Busca Rápida de Aluno / Responsável */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Search className="h-4 w-4 text-blue-600" />
                Busca Rápida de Aluno / Responsável
              </CardTitle>
              <CardDescription className="text-xs">
                Localize telefone, turma e ficha cadastral instantaneamente
              </CardDescription>

              <div className="pt-2 relative">
                <Search className="absolute left-2.5 top-4.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Digite nome do aluno, responsável ou turma..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </CardHeader>

            <CardContent className="p-3">
              {searchQuery.trim() === '' ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  Comece a digitar acima para buscar fichas de alunos.
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  Nenhum registro encontrado para "{searchQuery}".
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((res) => {
                    const whatsLink = getWhatsAppLink(
                      res.contatoResponsavel || res.contatoWhatsapp,
                      `Olá ${res.nomeResponsavel || 'Responsável'}, falo da Secretaria Escolar referente ao aluno(a) ${res.nome}.`
                    );

                    return (
                      <div
                        key={res.id}
                        className="p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-900/50 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                            {res.nome}
                          </span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {res.turma || res.classe || 'Sem Turma'}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Resp: {res.nomeResponsavel || 'Não informado'}</span>
                          {res.contatoResponsavel && (
                            <a
                              href={whatsLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:underline flex items-center gap-1 font-medium"
                            >
                              <MessageCircle className="h-3 w-3" />
                              {res.contatoResponsavel}
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
