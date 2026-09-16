import { useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/stat-card';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { usePermissions } from '@/hooks/usePermissions';
import { DashboardTab } from '@/components/financeiro/DashboardTab';
import { DashboardTurmasTab } from '@/components/financeiro/DashboardTurmasTab';
import { Lancamento, Orcamento, Salario, Caixa, Cartao } from '@/types/finance';
import { Aluno, Mensalidade } from '@/types/aluno';
import { getIntegratedLancamentos } from '@/lib/financeUtils';
import { mockCaixas, mockCartoes } from '@/data/mockData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/types/auth';
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
} from 'lucide-react';
import { Link } from 'react-router-dom';

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
  const [caixas] = useLocalStorage<Caixa[]>('escolinha_caixas', mockCaixas);
  const [cartoes] = useLocalStorage<Cartao[]>('escolinha_cartoes', mockCartoes);

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

  const primaryRole = roles[0];
  const greeting = new Date().getHours() < 12
    ? 'Bom dia'
    : new Date().getHours() < 18
    ? 'Boa tarde'
    : 'Boa noite';

  return (
    <div className="space-y-6">
      {/* Header com Saudação e Botão de Ocultar/Exibir Totais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {greeting}, {profile?.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground text-sm">
            {primaryRole && ROLE_LABELS[primaryRole]} {school && `• ${school.name}`}
          </p>
        </div>

        {canViewKpis('dashboard') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTotals(!showTotals)}
            className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5 self-start sm:self-auto"
          >
            {showTotals ? (
              <>
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Ocultar Totais</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Exibir Totais</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Cards de Resumo Executivo (Dados Reais da Escola) */}
      {canViewKpis('dashboard') && showTotals && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                {schoolMetrics.totalAlunosAtivos}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Alunos matriculados no ano letivo
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
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

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
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

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
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
