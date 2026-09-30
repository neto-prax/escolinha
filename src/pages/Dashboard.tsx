import { useMemo, useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/stat-card';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { usePermissions } from '@/hooks/usePermissions';
import { DashboardTab } from '@/components/financeiro/DashboardTab';
import { DashboardTurmasTab } from '@/components/financeiro/DashboardTurmasTab';
import { TeacherDashboard } from '@/components/dashboard/TeacherDashboard';
import { SecretaryDashboard } from '@/components/dashboard/SecretaryDashboard';
import { Lancamento, Orcamento, Salario, Caixa, Cartao } from '@/types/finance';
import { Aluno, Mensalidade } from '@/types/aluno';
import { getIntegratedLancamentos } from '@/lib/financeUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS, AppRole } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  GraduationCap,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Shield,
  ArrowRight,
  Eye,
  EyeOff,
  BookOpen,
  Building2,
  UserCheck,
  MessageSquare,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export type DashboardViewType = 'general' | 'teacher' | 'secretary';

const Dashboard = () => {
  const { user, profile, roles, school, hasPermission } = useAuth();
  const { canViewKpis } = usePermissions();
  const [showTotals, setShowTotals] = useLocalStorage<boolean>('escolinha_show_kpis_dashboard', true);

  const [alunos] = useLocalStorage<Aluno[]>('escolinha_alunos', []);
  const [mensalidades] = useLocalStorage<Mensalidade[]>('escolinha_mensalidades', []);
  const [lancamentosStorage] = useLocalStorage<any[]>('escolinha_lancamentos', []);
  const [lancamentosV2Storage] = useLocalStorage<any[]>('escolinha_lancamentos_v2', []);
  const [orcamentos] = useLocalStorage<Orcamento[]>('escolinha_orcamentos', []);
  const [salarios] = useLocalStorage<Salario[]>('escolinha_salarios', []);
  const [caixas] = useLocalStorage<Caixa[]>('escolinha_caixas', []);
  const [cartoes] = useLocalStorage<Cartao[]>('escolinha_cartoes', []);

  // Determinação dos papéis e visão inicial adequada
  const primaryRole = roles[0];
  const isTeacher = roles.includes('teacher');
  const isSecretary = roles.includes('secretary');
  const isDirectorOrAdmin =
    roles.includes('director') || roles.includes('admin') || roles.length === 0;

  const defaultView: DashboardViewType = useMemo(() => {
    if (primaryRole === 'teacher' && !isDirectorOrAdmin) return 'teacher';
    if (primaryRole === 'secretary' && !isDirectorOrAdmin) return 'secretary';
    if (isTeacher && !isSecretary && !isDirectorOrAdmin) return 'teacher';
    if (isSecretary && !isTeacher && !isDirectorOrAdmin) return 'secretary';
    return 'general';
  }, [primaryRole, isTeacher, isSecretary, isDirectorOrAdmin]);

  const [activeDashboardView, setActiveDashboardView] = useState<DashboardViewType>(defaultView);

  // Sincroniza se o cargo mudar
  useEffect(() => {
    setActiveDashboardView(defaultView);
  }, [defaultView]);

  // Unifica e integra lançamentos com mensalidades escolares pagas
  const lancamentos: Lancamento[] = useMemo(() => {
    const combined = [...lancamentosStorage, ...lancamentosV2Storage];
    return getIntegratedLancamentos(combined, mensalidades, alunos);
  }, [lancamentosStorage, lancamentosV2Storage, mensalidades, alunos]);

  // Indicadores Reais da Escola
  const schoolMetrics = useMemo(() => {
    const totalAlunosAtivos = alunos.filter((a) => a.status === 'Ativo').length;

    // Previsão Contratual Líquida Mensal dos alunos ativos
    const previsaoMensal = alunos
      .filter((a) => a.status === 'Ativo')
      .reduce((sum, a) => {
        const base = Number(a.valorBase) || 650;
        const desc = Number(a.descontoMensalidade) || 0;
        return sum + Math.max(0, base - desc);
      }, 0);

    // Receita Total de Entradas Realizadas (incluindo mensalidades pagas)
    const totalEntradasRealizadas = lancamentos
      .filter((l) => l.tipo === 'Entrada' && l.status === 'Pago')
      .reduce((sum, l) => sum + (Number(l.valor) || 0), 0);

    // Inadimplência Real
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mensalidadesAtrasadas = mensalidades.filter((m) => {
      if (m.status === 'Pago') return false;
      if (m.status === 'Atrasado') return true;
      if (m.status === 'Pendente') {
        const venc = new Date(m.dataVencimento);
        return venc.getTime() < today.getTime();
      }
      return false;
    });

    const totalAtrasado = mensalidadesAtrasadas.reduce(
      (sum, m) => sum + (Number(m.valorFinal) || 0),
      0
    );

    return {
      totalAlunosAtivos,
      previsaoMensal,
      totalEntradasRealizadas,
      inadimplenciaQtd: mensalidadesAtrasadas.length,
      totalAtrasado,
    };
  }, [alunos, mensalidades, lancamentos]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const { data: isSuperAdmin } = useQuery({
    queryKey: ['is-super-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
  });

  const schoolId = profile?.school_id || school?.id;

  const { data: whatsappStats } = useQuery({
    queryKey: ['dashboard-whatsapp-stats', schoolId],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_conversations')
        .select('id, ticket_status, unread_count, opened_at, created_at, closed_at');

      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }

      const { data, error } = await query;
      if (error || !data) return { unread: 0, inProgress: 0, resolved: 0, total: 0 };

      let unread = 0;
      let inProgress = 0;
      let resolved = 0;

      for (const c of data) {
        const isResolved = c.ticket_status === 'resolved' || c.ticket_status === 'closed';
        if (isResolved) {
          resolved++;
        } else if (c.unread_count > 0 || !c.opened_at) {
          unread++;
        } else {
          inProgress++;
        }
      }

      return {
        unread,
        inProgress,
        resolved,
        total: data.length,
      };
    },
    staleTime: 15000,
  });

  const greeting = new Date().getHours() < 12
    ? 'Bom dia'
    : new Date().getHours() < 18
    ? 'Boa tarde'
    : 'Boa noite';

  const viewSubtitle = useMemo(() => {
    if (activeDashboardView === 'teacher') {
      return 'Painel do Professor • Calendário e Lista de Atividades';
    }
    if (activeDashboardView === 'secretary') {
      return 'Central da Secretaria • Gestão de Matrículas e Documentos';
    }
    return `${primaryRole ? ROLE_LABELS[primaryRole] : 'Diretoria'} ${school ? `• ${school.name}` : ''}`;
  }, [activeDashboardView, primaryRole, school]);

  return (
    <div className="space-y-6">
      {/* Header Executivo com Saudação, Data, Ações Rápidas e Seletor de Visão */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-card border shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {greeting}, {profile?.full_name?.split(' ')[0] || 'Usuário'}!
            </h1>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 font-medium capitalize">
              {primaryRole ? ROLE_LABELS[primaryRole] : 'Diretoria'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground capitalize">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })} • {viewSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Ações Rápidas Executivas */}
          <Link to="/mensagens">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 font-medium"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
              {(whatsappStats?.unread || 0) > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {whatsappStats?.unread}
                </span>
              )}
            </Button>
          </Link>

          <Link to="/alunos">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 text-foreground hover:bg-muted font-medium"
            >
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>Alunos</span>
            </Button>
          </Link>

          {hasPermission('financeiro') && (
            <Link to="/financeiro">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 text-foreground hover:bg-muted font-medium"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                <span>Financeiro</span>
              </Button>
            </Link>
          )}

          {/* Seletor de Visão para Diretores, Administradores ou Usuários com múltiplos perfis */}
          {(isDirectorOrAdmin || (isTeacher && isSecretary)) && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <Button
                variant={activeDashboardView === 'general' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveDashboardView('general')}
                className={`h-7 px-2.5 text-xs gap-1.5 rounded-md font-medium transition-all ${
                  activeDashboardView === 'general'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-slate-100'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Diretoria & Geral</span>
                <span className="sm:hidden">Geral</span>
              </Button>

              <Button
                variant={activeDashboardView === 'secretary' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveDashboardView('secretary')}
                className={`h-7 px-2.5 text-xs gap-1.5 rounded-md font-medium transition-all ${
                  activeDashboardView === 'secretary'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-slate-100'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Secretária</span>
              </Button>

              <Button
                variant={activeDashboardView === 'teacher' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveDashboardView('teacher')}
                className={`h-7 px-2.5 text-xs gap-1.5 rounded-md font-medium transition-all ${
                  activeDashboardView === 'teacher'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-slate-100'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Professor</span>
              </Button>
            </div>
          )}

          {activeDashboardView === 'general' && canViewKpis('dashboard') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTotals(!showTotals)}
              className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              {showTotals ? (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="hidden sm:inline">Ocultar Totais</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="hidden sm:inline">Exibir Totais</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* RENDERIZAÇÃO CONDICIONAL BASEADA NA VISÃO DO DASHBOARD */}
      {activeDashboardView === 'teacher' ? (
        /* DASHBOARD ESPECÍFICO DO PROFESSOR (Calendário + Lista de Atividades) */
        <TeacherDashboard />
      ) : activeDashboardView === 'secretary' ? (
        /* DASHBOARD ESPECÍFICO DA SECRETÁRIA (Matrículas, Documentos, Checklist Diário, Busca Rápida) */
        <SecretaryDashboard />
      ) : (
        /* DASHBOARD EXECUTIVO / DIRETORIA / FINANCEIRO */
        <div className="space-y-5">
          {/* Card / Widget de Atendimento WhatsApp em Tempo Real */}
          <div className="rounded-xl border bg-gradient-to-r from-emerald-500/10 via-card to-primary/5 p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-foreground">
                      Atendimento WhatsApp & Fila Purple Edu
                    </h3>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-medium">
                      ● WhatsApp Conectado
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Central de auto-atendimento e comunicação direta com responsáveis dos alunos.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Contador Não Lidas / Aguardando */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <div className="text-left">
                    <p className="text-[10px] text-muted-foreground leading-none">Aguardando / Não Lidas</p>
                    <p className="text-sm font-bold text-rose-600 dark:text-rose-400 leading-tight">
                      {whatsappStats?.unread || 0}
                    </p>
                  </div>
                </div>

                {/* Contador Em Conversa */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div className="text-left">
                    <p className="text-[10px] text-muted-foreground leading-none">Em Atendimento</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
                      {whatsappStats?.inProgress || 0}
                    </p>
                  </div>
                </div>

                {/* Contador Resolvidos */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <div className="text-left">
                    <p className="text-[10px] text-muted-foreground leading-none">Resolvidos</p>
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400 leading-tight">
                      {whatsappStats?.resolved || 0}
                    </p>
                  </div>
                </div>

                {/* Botão Acessar Mensagens */}
                <Link to="/mensagens">
                  <Button size="sm" className="h-9 px-3.5 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Abrir Chat</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Cards de Resumo Executivo (Dados Reais da Escola) */}
          {canViewKpis('dashboard') && showTotals && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
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
                    {schoolMetrics.totalAlunosAtivos}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Alunos matriculados no ano letivo
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Receita Realizada (Entradas)
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(schoolMetrics.totalEntradasRealizadas)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mensalidades pagas + demais entradas
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Previsão Mensal Contratual
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                    {formatCurrency(schoolMetrics.previsaoMensal)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Faturamento mensal projetado
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Inadimplência Real
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(schoolMetrics.totalAtrasado)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {schoolMetrics.inadimplenciaQtd} mensalidade(s) em atraso
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {hasPermission('financeiro') && (
            <div className="pt-2">
              <Tabs defaultValue="geral" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="geral">Visão Geral</TabsTrigger>
                  <TabsTrigger value="turmas">Por Turma</TabsTrigger>
                </TabsList>

                <TabsContent value="geral" className="space-y-4 m-0">
                  <DashboardTab
                    lancamentos={lancamentos}
                    orcamentos={orcamentos}
                    salarios={salarios}
                    caixas={caixas}
                    cartoes={cartoes}
                  />
                </TabsContent>

                <TabsContent value="turmas" className="space-y-4 m-0">
                  <DashboardTurmasTab lancamentos={lancamentos} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      )}

      {/* Super Admin Access */}
      {isSuperAdmin && (
        <Link to="/super-admin">
          <Button variant="outline" className="w-full justify-start border-primary/30 hover:bg-primary/5">
            <Shield className="mr-2 h-5 w-5 text-primary" />
            Painel Super Admin
            <ArrowRight className="ml-auto h-4 w-4" />
          </Button>
        </Link>
      )}
    </div>
  );
};

export default Dashboard;
