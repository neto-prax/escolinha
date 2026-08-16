import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Users, TrendingUp, Link as LinkIcon, Copy, Plus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function PainelVendedor() {
  const { profile } = useAuth();
  
  // Dados mockados para demonstração
  const [indicacoes] = useState([
    { id: 1, escola: 'Escola Caminho Feliz', status: 'Ativo', data: '10/08/2026', valor: 450.00, comissao: 90.00 },
    { id: 2, escola: 'Colégio Futuro', status: 'Em negociação', data: '12/08/2026', valor: 0, comissao: 0 },
    { id: 3, escola: 'Instituto Educar', status: 'Ativo', data: '15/08/2026', valor: 850.00, comissao: 170.00 },
  ]);

  const totalComissoes = indicacoes.reduce((acc, curr) => acc + curr.comissao, 0);
  const indicacoesAtivas = indicacoes.filter(i => i.status === 'Ativo').length;

  const handleCopyLink = () => {
    // Simulando link de afiliado/vendedor
    const link = `${window.location.origin}/cadastro?ref=${profile?.id || 'vendedor123'}`;
    navigator.clipboard.writeText(link);
    toast.success('Link de indicação copiado!');
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Painel do Vendedor" 
        description="Acompanhe suas vendas e comissões" 
      >
        <Button onClick={handleCopyLink} variant="outline" className="flex items-center gap-2">
          <LinkIcon size={16} /> Copiar Link de Indicação
        </Button>
      </PageHeader>

      {/* Cards Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total em Comissões</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalComissoes)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Acumulado neste mês</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Escolas Ativas</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{indicacoesAtivas}</div>
            <p className="text-xs text-muted-foreground mt-1">Geração de receita recorrente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {indicacoes.length > 0 ? Math.round((indicacoesAtivas / indicacoes.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Das indicações feitas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Indicações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Minhas Indicações</CardTitle>
              <CardDescription>Acompanhe o status das escolas que você indicou</CardDescription>
            </div>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nova Indicação
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Escola</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valor Mensal</TableHead>
                <TableHead className="text-right">Sua Comissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {indicacoes.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.escola}</TableCell>
                  <TableCell>{item.data}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'Ativo' ? 'default' : 'secondary'} className={item.status === 'Ativo' ? 'bg-green-500 hover:bg-green-600' : ''}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.valor > 0 
                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor) 
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    {item.comissao > 0 
                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.comissao) 
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
