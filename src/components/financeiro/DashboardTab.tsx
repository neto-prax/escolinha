import React, { useState, useMemo } from 'react';
import { Lancamento, Orcamento, Salario, Caixa, Cartao } from '../../types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowDownRight, ArrowUpRight, DollarSign, Target, CreditCard, Eye, EyeOff, AlertCircle, Info } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { formatDate } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface DashboardTabProps {
  lancamentos: Lancamento[];
  orcamentos: Orcamento[];
  salarios: Salario[];
  caixas: Caixa[];
  cartoes: Cartao[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658', '#d0ed57'];

export function DashboardTab({ lancamentos, orcamentos, salarios, caixas, cartoes }: DashboardTabProps) {
  const { canViewKpis } = usePermissions();
  const [showTotals, setShowTotals] = useLocalStorage<boolean>('escolinha_show_kpis_financeiro_tab', true);
  const [visionMode, setVisionMode] = useState<'realizado' | 'previsto'>('realizado');
  
  const {
    receitasPagas,
    receitasPendentes,
    receitasTotal,
    despesas,
    folhaPagamento,
    totalOrcado,
    faturasCartao,
    mensalidadesPagasCount,
    mensalidadesPendentesCount,
  } = useMemo(() => {
    let rPagas = 0;
    let rPendentes = 0;
    let d = 0;
    let f = 0;
    let o = 0;
    let cartao = 0;
    let mPagas = 0;
    let mPendentes = 0;

    lancamentos.forEach(l => {
      const isMensalidade = l.categoria === 'Mensalidades' || !!l.alunoId;

      if (l.tipo === 'Entrada') {
        if (l.status === 'Pago') {
          rPagas += l.valor;
          if (isMensalidade) mPagas++;
        } else {
          // Lançamento em aberto / a receber (mensalidades anexadas em aberto)
          rPendentes += l.valor;
          if (isMensalidade) mPendentes++;
        }
      } else {
        // Despesas (Saídas)
        if (l.status === 'Pago') {
          if (l.formaPagamento === 'Cartão') {
            cartao += l.valor;
          } else {
            d += l.valor;
          }
          
          if (l.categoria === 'Pessoal/RH') {
            f += l.valor;
          }
        }
      }
    });

    orcamentos.forEach(orc => {
      o += orc.valorOrcado;
    });

    return {
      receitasPagas: rPagas,
      receitasPendentes: rPendentes,
      receitasTotal: rPagas + rPendentes,
      despesas: d,
      folhaPagamento: f,
      totalOrcado: o,
      faturasCartao: cartao,
      mensalidadesPagasCount: mPagas,
      mensalidadesPendentesCount: mPendentes,
    };
  }, [lancamentos, orcamentos]);

  const receitasExibidas = visionMode === 'realizado' ? receitasPagas : receitasTotal;
  const saldo = receitasExibidas - despesas;

  const expensesByCategory = useMemo(() => {
    const data: Record<string, number> = {};
    
    // Despesas de lançamentos (já inclui 'Pessoal/RH')
    lancamentos.filter(l => l.tipo === 'Saída' && l.status === 'Pago').forEach(l => {
      data[l.categoria] = (data[l.categoria] || 0) + l.valor;
    });

    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [lancamentos]);

  const overviewData = useMemo(() => {
    if (visionMode === 'realizado') {
      return [
        { name: 'Receitas (Caixa)', valor: receitasPagas, fill: '#10b981' },
        { name: 'Despesas', valor: despesas, fill: '#ef4444' }
      ];
    }
    return [
      { name: 'Receitas Pagas', valor: receitasPagas, fill: '#10b981' },
      { name: 'A Receber (Anexadas)', valor: receitasPendentes, fill: '#3b82f6' },
      { name: 'Despesas', valor: despesas, fill: '#ef4444' }
    ];
  }, [visionMode, receitasPagas, receitasPendentes, despesas]);

  const recentTransactions = useMemo(() => {
    return [...lancamentos]
      .sort((a, b) => b.data.getTime() - a.data.getTime())
      .slice(0, 5);
  }, [lancamentos]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* KPIs Cards */}
      {canViewKpis('financeiro') && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Resumo Financeiro
              </span>
              {/* Toggle Visão Realizado x Previsto */}
              <div className="inline-flex items-center p-0.5 rounded-lg bg-muted border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setVisionMode('realizado')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    visionMode === 'realizado'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Realizado (Caixa)
                </button>
                <button
                  type="button"
                  onClick={() => setVisionMode('previsto')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                    visionMode === 'previsto'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>Previsto (Com Mensalidades)</span>
                  {receitasPendentes > 0 && (
                    <span className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                      +{formatCurrency(receitasPendentes)}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTotals(!showTotals)}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5 self-start sm:self-auto"
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
          </div>

          {/* Banner explicativo quando há mensalidades anexadas mas nada foi pago no caixa */}
          {receitasPagas === 0 && receitasPendentes > 0 && (
            <div className="flex items-start gap-3 p-3.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg text-sm text-blue-900 dark:text-blue-200">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold text-xs sm:text-sm">
                  {mensalidadesPendentesCount} mensalidade(s) anexada(s) totalizando {formatCurrency(receitasPendentes)} a receber.
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  A visão atual <strong>"Realizado (Caixa)"</strong> exibe apenas valores já quitados (R$ 0,00 recebidos). Para visualizar o total contratado com as mensalidades anexadas, selecione <strong>"Previsto (Com Mensalidades)"</strong> acima, ou registre os pagamentos recebidos na aba de Alunos.
                </p>
              </div>
            </div>
          )}

          {showTotals && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {visionMode === 'realizado' ? 'Receitas (Caixa)' : 'Receitas (Previsto)'}
                  </CardTitle>
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(receitasExibidas)}</div>
                  {visionMode === 'realizado' ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      {receitasPendentes > 0 ? (
                        <span className="text-blue-600 font-medium">
                          +{formatCurrency(receitasPendentes)} a receber ({mensalidadesPendentesCount} anexadas)
                        </span>
                      ) : (
                        'Total de entradas quitadas'
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(receitasPagas)} quitadas + {formatCurrency(receitasPendentes)} a receber
                    </p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Despesas</CardTitle>
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(despesas)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Inclui Folha ({formatCurrency(folhaPagamento)})</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {visionMode === 'realizado' ? 'Saldo Atual (Caixa)' : 'Saldo Projetado'}
                  </CardTitle>
                  <DollarSign className={`h-4 w-4 ${saldo >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(saldo)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Receitas - Despesas</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Faturas (Cartões)</CardTitle>
                  <CreditCard className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{formatCurrency(faturasCartao)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Ainda não saíram do caixa</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Gráfico de Barras: Receitas x Despesas */}
        <Card className="col-span-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">
              {visionMode === 'realizado' ? 'Receitas vs Despesas (Caixa)' : 'Receitas vs Despesas (Projeção)'}
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {visionMode === 'realizado' ? 'Somente quitados' : 'Inclui mensalidades anexadas'}
            </span>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overviewData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{fill: '#6b7280'}} tickLine={false} axisLine={false} />
                <YAxis 
                  tickFormatter={(value) => `R$ ${value / 1000}k`} 
                  tick={{fill: '#6b7280'}} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <RechartsTooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  cursor={{fill: '#f3f4f6'}}
                />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                  {overviewData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza: Despesas por Categoria */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Últimas Movimentações */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-3 font-medium">Data</th>
                  <th className="pb-3 font-medium">Descrição</th>
                  <th className="pb-3 font-medium">Categoria</th>
                  <th className="pb-3 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/50 transition-colors">
                    <td className="py-3">{formatDate(t.data)}</td>
                    <td className="py-3 font-medium">{t.descricao}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                        {t.categoria}
                      </span>
                    </td>
                    <td className={`py-3 text-right font-medium ${t.tipo === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.tipo === 'Entrada' ? '+' : '-'}{formatCurrency(t.valor)}
                    </td>
                  </tr>
                ))}
                {recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-muted-foreground">Nenhuma movimentação encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
