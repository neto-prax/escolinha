import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/stat-card';
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
  CalendarDays,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user, profile, roles, school, hasPermission } = useAuth();

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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">
          {greeting}, {profile?.full_name?.split(' ')[0]}!
        </h1>
        <p className="text-muted-foreground">
          {primaryRole && ROLE_LABELS[primaryRole]} {school && `• ${school.name}`}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {hasPermission('alunos') && (
          <StatCard
            title="Total de Alunos"
            value="324"
            icon={GraduationCap}
            trend={{ value: 5.2, label: 'vs mês passado' }}
          />
        )}
        {hasPermission('turmas') && (
          <StatCard
            title="Turmas Ativas"
            value="12"
            icon={Users}
            description="Ano letivo 2025"
          />
        )}
        {hasPermission('financeiro') && (
          <StatCard
            title="Receita do Mês"
            value="R$ 45.230"
            icon={DollarSign}
            trend={{ value: 8.1, label: 'vs mês passado' }}
          />
        )}
        {hasPermission('financeiro') && (
          <StatCard
            title="Taxa de Adimplência"
            value="94%"
            icon={TrendingUp}
            trend={{ value: 2.3, label: 'vs mês passado' }}
          />
        )}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesse as funcionalidades mais utilizadas</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {hasPermission('diario') && (
              <Link to="/app/diario">
                <Button variant="outline" className="w-full justify-start">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Registrar diário de classe
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Button>
              </Link>
            )}
            {hasPermission('alunos') && (
              <Link to="/app/alunos">
                <Button variant="outline" className="w-full justify-start">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Cadastrar novo aluno
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Button>
              </Link>
            )}
            {hasPermission('mensagens') && (
              <Link to="/app/mensagens">
                <Button variant="outline" className="w-full justify-start">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Ver mensagens
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Button>
              </Link>
            )}
            {hasPermission('financeiro') && (
              <Link to="/app/financeiro">
                <Button variant="outline" className="w-full justify-start">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Gerar cobrança
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>Últimas atualizações do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle className="h-4 w-4 text-success" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Nova matrícula realizada</p>
                  <p className="text-xs text-muted-foreground">
                    João Silva - 5º Ano A • Há 2 horas
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/10">
                  <AlertCircle className="h-4 w-4 text-warning" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">3 mensalidades vencidas</p>
                  <p className="text-xs text-muted-foreground">
                    Verificar inadimplência • Há 5 horas
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-info/10">
                  <MessageSquare className="h-4 w-4 text-info" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">5 novas mensagens</p>
                  <p className="text-xs text-muted-foreground">
                    Setor Financeiro • Há 6 horas
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Diário atualizado</p>
                  <p className="text-xs text-muted-foreground">
                    3º Ano B - Profª Maria • Há 1 dia
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts for specific roles */}
      {hasPermission('financeiro') && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              <CardTitle className="text-lg">Atenção: Inadimplência</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Existem 8 alunos com mensalidades em atraso. Considere enviar uma cobrança via WhatsApp.
            </p>
            <Link to="/app/financeiro">
              <Button size="sm">Ver inadimplentes</Button>
            </Link>
          </CardContent>
        </Card>
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
