import React, { useMemo } from 'react';
import { Lancamento, Orcamento, Salario, Caixa, Cartao } from '../../types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDownRight, ArrowUpRight, DollarSign, Target, CreditCard } from 'lucide-react';
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
  
  const { receitas, despesas, folhaPagamento, totalOrcado, faturasCartao } = useMemo(() => {
    let r = 0;
    let d = 0;
    let f = 0;
    let o = 0;
    let cartao = 0;

    lancamentos.forEach(l => {
      // Ignora lançamentos em aberto
      if (l.status !== 'Pago') return;

      if (l.tipo === 'Entrada') {
        r += l.valor;
      } else {
        if (l.formaPagamento === 'Cartão') {
          // Valores pagos no cartão entram como fatura pendente
          cartao += l.valor;
        } else {
          // Outras formas de pagamento entram como despesa de caixa imediata
          d += l.valor;
        }
        
        // Se for salário, soma em folhaPagamento apenas para o KPI visual, mas já está dentro de 'd' ou 'cartao'
        if (l.categoria === 'Pessoal/RH') {
          f += l.valor;
        }
      }
    });

    orcamentos.forEach(orc => {
      o += orc.valorOrcado;
    });

    return {
      receitas: r,
      despesas: d, // 'f' já está contido em 'd' porque virou um lançamento de saída
      folhaPagamento: f,
      totalOrcado: o,
      faturasCartao: cartao,
    };
  }, [lancamentos, orcamentos]);

  const saldo = receitas - despesas;

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

  const overviewData = [
    { name: 'Receitas', valor: receitas, fill: '#10b981' },
    { name: 'Despesas', valor: despesas, fill: '#ef4444' }
  ];

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(receitas)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total de entradas</p>
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
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Gráfico de Barras: Receitas x Despesas */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Receitas vs Despesas</CardTitle>
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
                    <td className="py-3">{t.data.toLocaleDateString('pt-BR')}</td>
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
