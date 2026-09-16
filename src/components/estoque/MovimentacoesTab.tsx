import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Printer,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingCart,
  Wrench,
  RotateCcw,
} from 'lucide-react';
import { MovimentacaoEstoque, TipoMovimentacaoEstoque } from '@/types/estoque';

interface MovimentacoesTabProps {
  movimentacoes: MovimentacaoEstoque[];
  onReimprimirRecibo?: (movimentacao: MovimentacaoEstoque) => void;
}

export const MovimentacoesTab: React.FC<MovimentacoesTabProps> = ({
  movimentacoes,
  onReimprimirRecibo,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('Todos');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDateBR = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } catch {
      return iso;
    }
  };

  const filteredMovimentacoes = useMemo(() => {
    return [...movimentacoes]
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .filter((m) => {
        if (tipoFilter !== 'Todos' && m.tipo !== tipoFilter) return false;

        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchesProd = m.produtoNome.toLowerCase().includes(term);
          const matchesRecibo = m.reciboNumero?.toLowerCase().includes(term);
          const matchesDest = m.destinatario?.toLowerCase().includes(term);
          const matchesResp = m.responsavelNome?.toLowerCase().includes(term);
          const matchesVar = m.variacaoNome?.toLowerCase().includes(term);
          if (!matchesProd && !matchesRecibo && !matchesDest && !matchesResp && !matchesVar) {
            return false;
          }
        }

        return true;
      });
  }, [movimentacoes, searchTerm, tipoFilter]);

  const getTipoBadge = (tipo: TipoMovimentacaoEstoque) => {
    switch (tipo) {
      case 'entrada':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] gap-1">
            <ArrowDownLeft className="h-3 w-3" /> Entrada / Compra
          </Badge>
        );
      case 'saida_venda':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] gap-1">
            <ShoppingCart className="h-3 w-3" /> Venda Balcão
          </Badge>
        );
      case 'saida_consumo':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] gap-1">
            <ArrowUpRight className="h-3 w-3" /> Consumo Interno
          </Badge>
        );
      case 'reposicao':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px] gap-1">
            <RotateCcw className="h-3 w-3" /> Reposição / Defeito
          </Badge>
        );
      case 'ajuste':
        return (
          <Badge variant="outline" className="text-[10px] gap-1">
            <Wrench className="h-3 w-3" /> Ajuste de Inventário
          </Badge>
        );
      default:
        return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardHeader className="p-4 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <span>Histórico e Auditoria de Movimentações</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Rastreabilidade completa de todas as entradas, vendas, baixas de consumo e comprovantes emitidos.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por produto, nº de recibo, cliente ou responsável..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-52 h-9 text-xs">
                <SelectValue placeholder="Tipo de Movimentação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os Tipos</SelectItem>
                <SelectItem value="saida_venda">Vendas (Balcão / Alunos)</SelectItem>
                <SelectItem value="saida_consumo">Consumo Interno (Limpeza / Uso)</SelectItem>
                <SelectItem value="reposicao">Reposições / Trocas</SelectItem>
                <SelectItem value="entrada">Entradas / Reabastecimento</SelectItem>
                <SelectItem value="ajuste">Ajustes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Movimentações */}
      <Card>
        <CardContent className="p-0">
          {filteredMovimentacoes.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs">
              Nenhuma movimentação registrada encontrada.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs bg-slate-50">
                  <TableHead className="w-36">Data / Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Variação / Tam.</TableHead>
                  <TableHead className="text-center">Quantidade</TableHead>
                  <TableHead className="text-center">Saldo (Antes → Depois)</TableHead>
                  <TableHead>Destinatário / Solicitante</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {filteredMovimentacoes.map((mov) => {
                  const isEntrada = mov.tipo === 'entrada';

                  return (
                    <TableRow key={mov.id} className="hover:bg-slate-50/60">
                      <TableCell className="font-mono text-[11px] text-slate-500">
                        {formatDateBR(mov.data)}
                      </TableCell>
                      <TableCell>{getTipoBadge(mov.tipo)}</TableCell>
                      <TableCell className="font-medium text-slate-900">
                        {mov.produtoNome}
                        {mov.reciboNumero && (
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {mov.reciboNumero}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {mov.variacaoNome ? (
                          <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50">
                            {mov.variacaoNome}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        <span
                          className={
                            isEntrada
                              ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200'
                              : 'text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200'
                          }
                        >
                          {isEntrada ? `+${mov.quantidade}` : `-${mov.quantidade}`}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-[11px] text-slate-500 font-mono">
                        {mov.quantidadeAnterior} → {mov.quantidadeAtual}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-slate-800">
                          {mov.destinatario || mov.responsavelNome || '-'}
                        </span>
                        {mov.motivo && (
                          <span className="block text-[10px] text-muted-foreground truncate max-w-xs">
                            {mov.motivo}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-900">
                        {mov.valorTotal ? formatCurrency(mov.valorTotal) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {mov.reciboNumero && onReimprimirRecibo && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] gap-1 text-primary hover:bg-primary/10"
                            onClick={() => onReimprimirRecibo(mov)}
                            title="Reimprimir Recibo"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Recibo
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
