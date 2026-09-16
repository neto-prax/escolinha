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
  ArrowUpRight,
  Plus,
  PackagePlus,
  Search,
  Sparkles,
  ClipboardList,
  Calendar,
  Building,
  User,
  Wrench,
  AlertTriangle,
} from 'lucide-react';
import {
  MovimentacaoEstoque,
  ProdutoEstoque,
  MOTIVOS_RETIRADA,
  SETORES_ESCOLA,
} from '@/types/estoque';

interface RetiradasConsumoTabProps {
  movimentacoes: MovimentacaoEstoque[];
  produtos: ProdutoEstoque[];
  onOpenRegistrarRetirada: () => void;
  onOpenNovoProduto: () => void;
  onOpenReabastecer: () => void;
}

export const RetiradasConsumoTab: React.FC<RetiradasConsumoTabProps> = ({
  movimentacoes,
  produtos,
  onOpenRegistrarRetirada,
  onOpenNovoProduto,
  onOpenReabastecer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [motivoFilter, setMotivoFilter] = useState('Todos');
  const [setorFilter, setSetorFilter] = useState('Todos');

  // Filtra apenas movimentações que sejam retiradas de consumo interno, reposição ou descarte
  const retiradas = useMemo(() => {
    return movimentacoes.filter(
      (m) => m.tipo === 'saida_consumo' || m.tipo === 'reposicao'
    );
  }, [movimentacoes]);

  // Cálculos de métricas rápidas
  const totalRetiradasQtd = retiradas.reduce((sum, r) => sum + r.quantidade, 0);
  const totalLimpezaQtd = retiradas
    .filter((r) => r.motivo?.toLowerCase().includes('limpeza') || r.setor?.toLowerCase().includes('zeladoria'))
    .reduce((sum, r) => sum + r.quantidade, 0);
  const totalReposicaoQtd = retiradas
    .filter((r) => r.tipo === 'reposicao' || r.motivo?.toLowerCase().includes('reposição') || r.motivo?.toLowerCase().includes('troca'))
    .reduce((sum, r) => sum + r.quantidade, 0);
  const totalSecretariaQtd = retiradas
    .filter((r) => r.setor?.toLowerCase().includes('secretaria') || r.motivo?.toLowerCase().includes('escritório'))
    .reduce((sum, r) => sum + r.quantidade, 0);

  const filteredRetiradas = useMemo(() => {
    return retiradas.filter((r) => {
      if (motivoFilter !== 'Todos' && r.motivo !== motivoFilter) return false;
      if (setorFilter !== 'Todos' && r.setor !== setorFilter) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesProd = r.produtoNome.toLowerCase().includes(term);
        const matchesResp = r.responsavelNome?.toLowerCase().includes(term);
        const matchesMotivo = r.motivo?.toLowerCase().includes(term);
        const matchesObs = r.observacoes?.toLowerCase().includes(term);
        if (!matchesProd && !matchesResp && !matchesMotivo && !matchesObs) return false;
      }

      return true;
    });
  }, [retiradas, searchTerm, motivoFilter, setorFilter]);

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

  return (
    <div className="space-y-4">
      {/* Cards de Métricas de Consumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-slate-50/50">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Total de Retiradas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-slate-900">{totalRetiradasQtd} un</div>
            <p className="text-[11px] text-muted-foreground">{retiradas.length} registros realizados</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/40 border-blue-100">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-semibold text-blue-800 uppercase">
              Limpeza & Higiene
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-blue-950">{totalLimpezaQtd} un</div>
            <p className="text-[11px] text-blue-700">Detergentes, álcool, papel</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/40 border-amber-100">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-semibold text-amber-800 uppercase">
              Reposições / Avarias
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-amber-950">{totalReposicaoQtd} un</div>
            <p className="text-[11px] text-amber-700">Trocas de peças defeituosas</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/40 border-emerald-100">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-semibold text-emerald-800 uppercase">
              Secretaria & Adm
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-emerald-950">{totalSecretariaQtd} un</div>
            <p className="text-[11px] text-emerald-700">Papelaria e expediente</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Botões Integrados */}
      <Card>
        <CardHeader className="p-4 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-amber-600" />
                <span>Outros Tipos de Retirada (Limpeza, Escritório, Reposição)</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Controle de saídas para consumo interno dos setores e troca de uniformes/materiais.
              </CardDescription>
            </div>

            {/* Ações integradas diretamente nesta tela como solicitado pelo usuário */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={onOpenRegistrarRetirada}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 h-9 text-xs font-semibold shadow-sm"
              >
                <ArrowUpRight className="h-4 w-4" />
                Registrar Retirada
              </Button>
              <Button
                variant="outline"
                onClick={onOpenReabastecer}
                className="gap-1.5 h-9 text-xs text-slate-700 hover:bg-slate-100"
              >
                <PackagePlus className="h-4 w-4 text-emerald-600" />
                Reabastecer Estoque
              </Button>
              <Button
                variant="default"
                onClick={onOpenNovoProduto}
                className="gap-1.5 h-9 text-xs"
              >
                <Plus className="h-4 w-4" />
                Novo Produto
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por produto, solicitante ou motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <Select value={motivoFilter} onValueChange={setMotivoFilter}>
              <SelectTrigger className="w-48 h-9 text-xs">
                <SelectValue placeholder="Motivo / Finalidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os Motivos</SelectItem>
                {MOTIVOS_RETIRADA.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={setorFilter} onValueChange={setSetorFilter}>
              <SelectTrigger className="w-44 h-9 text-xs">
                <SelectValue placeholder="Setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os Setores</SelectItem>
                {SETORES_ESCOLA.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Retiradas */}
      <Card>
        <CardContent className="p-0">
          {filteredRetiradas.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 text-slate-400" />
              Nenhuma retirada de consumo ou reposição registrada com os filtros selecionados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs bg-slate-50">
                  <TableHead className="w-36">Data / Hora</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Variação / Tam.</TableHead>
                  <TableHead className="text-center">Qtd Baixada</TableHead>
                  <TableHead>Finalidade / Motivo</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead className="w-48">Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {filteredRetiradas.map((retirada) => (
                  <TableRow key={retirada.id} className="hover:bg-slate-50/60">
                    <TableCell className="font-mono text-[11px] text-slate-500">
                      {formatDateBR(retirada.data)}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {retirada.produtoNome}
                    </TableCell>
                    <TableCell className="text-center">
                      {retirada.variacaoNome ? (
                        <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50">
                          {retirada.variacaoNome}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        -{retirada.quantidade}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          retirada.tipo === 'reposicao'
                            ? 'bg-purple-100 text-purple-800 border-purple-200 text-[10px]'
                            : 'bg-slate-100 text-slate-800 border-slate-200 text-[10px]'
                        }
                      >
                        {retirada.motivo || 'Consumo Geral'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 font-medium">
                      {retirada.setor || 'Geral'}
                    </TableCell>
                    <TableCell className="text-slate-800 font-medium">
                      {retirada.responsavelNome || 'Não informado'}
                    </TableCell>
                    <TableCell className="text-slate-500 text-[11px] truncate max-w-xs">
                      {retirada.observacoes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
