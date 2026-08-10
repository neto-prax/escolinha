import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/stat-card';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { DashboardTab } from '@/components/financeiro/DashboardTab';
import { Lancamento, Orcamento, Salario, Caixa, Cartao } from '@/types/finance';
import { mockCaixas, mockCartoes } from '@/data/mockData';
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

  const [lancamentosStorage] = useLocalStorage<any[]>('escolinha_lancamentos', []);
  const [orcamentos] = useLocalStorage<Orcamento[]>('escolinha_orcamentos', []);
  const [salarios] = useLocalStorage<Salario[]>('escolinha_salarios', []);
  const [caixas] = useLocalStorage<Caixa[]>('escolinha_caixas', mockCaixas);
  const [cartoes] = useLocalStorage<Cartao[]>('escolinha_cartoes', mockCartoes);

  const lancamentos: Lancamento[] = lancamentosStorage.map(l => ({
    ...l,
    data: typeof l.data === 'string' ? new Date(l.data) : l.data
  }));

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



      {hasPermission('financeiro') && (
        <div className="pt-2">
          <DashboardTab
            lancamentos={lancamentos}
            orcamentos={orcamentos}
            salarios={salarios}
            caixas={caixas}
            cartoes={cartoes}
          />
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
