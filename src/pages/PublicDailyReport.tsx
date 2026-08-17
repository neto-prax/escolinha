import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, AlertCircle, CalendarDays, CheckCircle } from 'lucide-react';

interface ReportData {
  schoolName: string;
  label: string;
  today: string;
  receivedToday: number;
  dueToday: { sum: number; count: number };
  overdue: { sum: number; count: number };
  receivedMonth: number;
  openMonth: number;
}

export default function PublicDailyReport() {
  const { schoolId, date } = useParams<{ schoolId: string; date: string }>();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!schoolId || !date) return;
      try {
        const res = await supabase.functions.invoke('daily-financial-report', {
          body: { action: 'public-data', schoolId, date },
        });
        if (res.error) throw new Error(res.error.message || 'Erro ao carregar dados');
        if (res.data?.error) throw new Error(res.data.error);
        setData(res.data);
      } catch (err: any) {
        setError(err.message || 'Falha ao buscar relatório');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [schoolId, date]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Erro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error || 'Relatório não encontrado.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatMoney = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Resumo Financeiro
          </h1>
          <p className="text-lg text-muted-foreground">
            {data.schoolName} — {data.label}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-4">
          <StatCard
            title="Recebido Hoje"
            value={formatMoney(data.receivedToday)}
            icon={CheckCircle}
            description="Receitas pagas hoje"
          />
          <StatCard
            title="Vencendo Hoje"
            value={formatMoney(data.dueToday.sum)}
            icon={CalendarDays}
            description={`${data.dueToday.count} cobrança(s)`}
          />
          <StatCard
            title="Em Atraso"
            value={formatMoney(data.overdue.sum)}
            icon={AlertCircle}
            description={`${data.overdue.count} cobrança(s) no total`}
          />
          <StatCard
            title="Recebido no Mês"
            value={formatMoney(data.receivedMonth)}
            icon={TrendingUp}
            description="Total arrecadado este mês"
          />
          <StatCard
            title="A Receber no Mês"
            value={formatMoney(data.openMonth)}
            icon={CalendarDays}
            description="Total em aberto para o mês"
          />
        </div>

      </div>
    </div>
  );
}
