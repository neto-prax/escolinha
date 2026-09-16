import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Mensalidade, Aluno } from '@/types/aluno';
import { parseMonetaryValue } from '@/lib/financeUtils';
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Scale,
  Eye,
  EyeOff,
  BarChart2,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface DashboardMensalidadesProps {
  mensalidades: Mensalidade[];
  alunos: Aluno[];
  selectedMonth: string; // ex: '2024-08' ou 'Todos'
}

const COLORS = ['#10b981', '#3b82f6', '#ef4444', '#8b5cf6'];

export const DashboardMensalidades: React.FC<DashboardMensalidadesProps> = ({
  mensalidades,
  alunos,
  selectedMonth,
}) => {
  const [showDashboard, setShowDashboard] = useLocalStorage<boolean>(
    'escolinha_show_dashboard_mensalidades',
    true
  );

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Filtra as mensalidades pelo mês selecionado (ou todas)
  const mensalidadesFiltradas = useMemo(() => {
    if (!selectedMonth || selectedMonth === 'Todos') return mensalidades;
    return mensalidades.filter((m) => m.mesReferencia === selectedMonth);
  }, [mensalidades, selectedMonth]);

  // Cálculos de KPIs
  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalPrevisto = 0;
    let totalPago = 0;
    let totalAberto = 0;
    let totalAtrasado = 0;
    let totalJudicializado = 0;

    let qtdTotal = mensalidadesFiltradas.length;
    let qtdPagas = 0;
    let qtdAbertas = 0;
    let qtdAtrasadas = 0;
    let qtdJudicializadas = 0;

    mensalidadesFiltradas.forEach((m) => {
      const valor = parseMonetaryValue(m.valorFinal);
      totalPrevisto += valor;

      if (m.status === 'Pago') {
        totalPago += valor;
        qtdPagas++;
      } else if (m.status === 'Judicializada' || m.judicializada) {
        totalJudicializado += valor;
        qtdJudicializadas++;
      } else if (m.status === 'Atrasado') {
        totalAtrasado += valor;
        qtdAtrasadas++;
      } else {
        // Pendente: verificar se já passou da data de vencimento
        const venc = new Date(m.dataVencimento);
        if (venc.getTime() < today.getTime()) {
          totalAtrasado += valor;
          qtdAtrasadas++;
        } else {
          totalAberto += valor;
          qtdAbertas++;
        }
      }
    });

    const taxaRecebimento = totalPrevisto > 0 ? Math.round((totalPago / totalPrevisto) * 100) : 0;
    const taxaInadimplencia = totalPrevisto > 0 ? Math.round((totalAtrasado / totalPrevisto) * 100) : 0;

    return {
      totalPrevisto,
      totalPago,
      totalAberto,
      totalAtrasado,
      totalJudicializado,
      qtdTotal,
      qtdPagas,
      qtdAbertas,
      qtdAtrasadas,
      qtdJudicializadas,
      taxaRecebimento,
      taxaInadimplencia,
    };
  }, [mensalidadesFiltradas]);

  // Dados para Gráfico de Distribuição por Status
  const statusPieData = useMemo(() => {
    return [
      { name: 'Pagas (Quitadas)', value: metrics.totalPago, count: metrics.qtdPagas, color: '#10b981' },
      { name: 'A Vencer (No Prazo)', value: metrics.totalAberto, count: metrics.qtdAbertas, color: '#3b82f6' },
      { name: 'Vencidas (Inadimplência)', value: metrics.totalAtrasado, count: metrics.qtdAtrasadas, color: '#ef4444' },
      ...(metrics.totalJudicializado > 0
        ? [{ name: 'Judicializadas', value: metrics.totalJudicializado, count: metrics.qtdJudicializadas, color: '#8b5cf6' }]
        : []),
    ].filter((item) => item.value > 0);
  }, [metrics]);

  // Arrecadação por Turma
  const barChartTurmas = useMemo(() => {
    const mapTurmas: Record<string, { turma: string; pago: number; atrasado: number; aberto: number }> = {};
    const alunoMap = new Map<string, Aluno>();
    alunos.forEach((a) => alunoMap.set(a.id, a));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    mensalidadesFiltradas.forEach((m) => {
      const aluno = alunoMap.get(m.alunoId);
      const nomeTurma = aluno?.classe ? `${aluno.classe} ${aluno.turma || ''}`.trim() : 'Sem Turma';

      if (!mapTurmas[nomeTurma]) {
        mapTurmas[nomeTurma] = { turma: nomeTurma, pago: 0, atrasado: 0, aberto: 0 };
      }

      const valor = parseMonetaryValue(m.valorFinal);
      if (m.status === 'Pago') {
        mapTurmas[nomeTurma].pago += valor;
      } else {
        const venc = new Date(m.dataVencimento);
        if (m.status === 'Atrasado' || venc.getTime() < today.getTime()) {
          mapTurmas[nomeTurma].atrasado += valor;
        } else {
          mapTurmas[nomeTurma].aberto += valor;
        }
      }
    });

    return Object.values(mapTurmas)
      .sort((a, b) => (b.pago + b.atrasado + b.aberto) - (a.pago + a.atrasado + a.aberto))
      .slice(0, 8);
  }, [mensalidadesFiltradas, alunos]);

  return (
    <div className="space-y-4 mb-6">
      {/* Barra de Título e Botão de Ocultar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Dashboard de Mensalidades
          </h3>
          <Badge variant="outline" className="text-xs bg-slate-50 font-medium">
            {selectedMonth === 'Todos' ? 'Visão Consolidada (Geral)' : `Mês Referência: ${selectedMonth}`}
          </Badge>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDashboard(!showDashboard)}
          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5 self-start sm:self-auto"
        >
          {showDashboard ? (
            <>
              <EyeOff className="h-3.5 w-3.5" />
              <span>Ocultar Dashboard</span>
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" />
              <span>Exibir Dashboard</span>
            </>
          )}
        </Button>
      </div>

      {showDashboard && (
        <div className="space-y-4">
          {/* CARDS DE INDICADORES (KPIS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Card 1: Previsto Total */}
            <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-slate-50 to-white">
              <CardHeader className="pb-1 pt-3 px-3.5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-slate-600 uppercase">Previsto Total</CardTitle>
                <DollarSign className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent className="px-3.5 pb-3">
                <div className="text-xl font-bold text-slate-900">{formatCurrency(metrics.totalPrevisto)}</div>
                <p className="text-[11px] text-slate-500 mt-0.5">{metrics.qtdTotal} faturas geradas</p>
              </CardContent>
            </Card>

            {/* Card 2: Quitado / Recebido */}
            <Card className="border-emerald-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
              <CardHeader className="pb-1 pt-3 px-3.5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-emerald-800 uppercase">Recebido (Pago)</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent className="px-3.5 pb-3">
                <div className="text-xl font-bold text-emerald-700">{formatCurrency(metrics.totalPago)}</div>
                <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                  {metrics.taxaRecebimento}% recebido ({metrics.qtdPagas} pagas)
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Em Aberto (A Vencer) */}
            <Card className="border-blue-200 shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
              <CardHeader className="pb-1 pt-3 px-3.5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-blue-800 uppercase">A Vencer (No Prazo)</CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent className="px-3.5 pb-3">
                <div className="text-xl font-bold text-blue-700">{formatCurrency(metrics.totalAberto)}</div>
                <p className="text-[11px] text-blue-600 mt-0.5">{metrics.qtdAbertas} faturas a vencer</p>
              </CardContent>
            </Card>

            {/* Card 4: Vencido (Inadimplência) */}
            <Card className="border-red-200 shadow-sm bg-gradient-to-br from-red-50/50 to-white">
              <CardHeader className="pb-1 pt-3 px-3.5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-red-800 uppercase">Em Atraso (Vencido)</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent className="px-3.5 pb-3">
                <div className="text-xl font-bold text-red-700">{formatCurrency(metrics.totalAtrasado)}</div>
                <p className="text-[11px] text-red-700 font-medium mt-0.5">
                  {metrics.taxaInadimplencia}% inadimplência ({metrics.qtdAtrasadas} faturas)
                </p>
              </CardContent>
            </Card>

            {/* Card 5: Judicializado */}
            <Card className="border-purple-200 shadow-sm bg-gradient-to-br from-purple-50/50 to-white">
              <CardHeader className="pb-1 pt-3 px-3.5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-purple-800 uppercase">Judicializado</CardTitle>
                <Scale className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent className="px-3.5 pb-3">
                <div className="text-xl font-bold text-purple-700">{formatCurrency(metrics.totalJudicializado)}</div>
                <p className="text-[11px] text-purple-600 mt-0.5">{metrics.qtdJudicializadas} faturas</p>
              </CardContent>
            </Card>
          </div>

          {/* GRÁFICOS VISUAIS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Gráfico 1: Arrecadação por Turma (Barras) */}
            <Card className="lg:col-span-2">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-emerald-600" />
                  <span>Distribuição de Faturamento por Turma (Top Turmas)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[220px] p-2">
                {barChartTurmas.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Nenhum dado financeiro para exibir no período selecionado.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartTurmas} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="turma" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
                      <YAxis
                        tickFormatter={(v) => `R$${v >= 1000 ? `${v / 1000}k` : v}`}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        tickLine={false}
                      />
                      <RechartsTooltip
                        formatter={(val: number) => formatCurrency(val)}
                        contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                      <Bar dataKey="pago" name="Recebido" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="aberto" name="A Vencer" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="atrasado" name="Em Atraso" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Gráfico 2: Proporção por Status (Pizza) */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-purple-600" />
                  <span>Composição de Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[220px] p-2 flex items-center justify-center">
                {statusPieData.length === 0 ? (
                  <div className="text-xs text-slate-400">Nenhuma fatura encontrada.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: number) => formatCurrency(val)}
                        contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
