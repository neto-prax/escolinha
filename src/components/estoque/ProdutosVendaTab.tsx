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
  Plus,
  ShoppingCart,
  PackagePlus,
  Pencil,
  AlertCircle,
  CheckCircle2,
  Tag,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ProdutoEstoque, CATEGORIAS_PRODUTO } from '@/types/estoque';

interface ProdutosVendaTabProps {
  produtos: ProdutoEstoque[];
  onOpenNovaVenda: () => void;
  onOpenNovoProduto: () => void;
  onOpenReabastecer: (produtoId?: string) => void;
  onEditProduto: (produto: ProdutoEstoque) => void;
}

export const ProdutosVendaTab: React.FC<ProdutosVendaTabProps> = ({
  produtos,
  onOpenNovaVenda,
  onOpenNovoProduto,
  onOpenReabastecer,
  onEditProduto,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Em Estoque' | 'Baixo Estoque' | 'Esgotado'>('Todos');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Filtra apenas produtos com destino venda ou ambos
  const produtosVenda = useMemo(() => {
    return produtos.filter((p) => p.destino === 'venda' || p.destino === 'ambos');
  }, [produtos]);

  const filteredProdutos = useMemo(() => {
    return produtosVenda.filter((p) => {
      if (categoriaFilter !== 'Todas' && p.categoria !== categoriaFilter) {
        return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = p.nome.toLowerCase().includes(term);
        const matchesCode = p.codigo?.toLowerCase().includes(term);
        const matchesVar = p.variacoes?.some((v) => v.nome.toLowerCase().includes(term));
        if (!matchesName && !matchesCode && !matchesVar) return false;
      }

      // Cálculo de estoque total do produto
      const totalEstoque = p.temVariacoes && p.variacoes
        ? p.variacoes.reduce((acc, v) => acc + v.quantidadeEstoque, 0)
        : p.quantidadeEstoque || 0;

      const estoqueMinimo = p.temVariacoes && p.variacoes
        ? Math.min(...p.variacoes.map((v) => v.estoqueMinimo || 5))
        : p.estoqueMinimo || 5;

      if (statusFilter === 'Esgotado' && totalEstoque > 0) return false;
      if (statusFilter === 'Em Estoque' && (totalEstoque <= estoqueMinimo || totalEstoque === 0)) return false;
      if (statusFilter === 'Baixo Estoque' && (totalEstoque === 0 || totalEstoque > estoqueMinimo)) return false;

      return true;
    });
  }, [produtosVenda, searchTerm, categoriaFilter, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Barra de Filtros e Ações */}
      <Card>
        <CardHeader className="p-4 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <span>Catálogo de Produtos para Venda</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Fardamento, uniformes, materiais didáticos e conveniência com controle por tamanho.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={onOpenNovaVenda}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9 text-xs font-semibold shadow-sm"
              >
                <ShoppingCart className="h-4 w-4" />
                Nova Venda (Balcão)
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenReabastecer()}
                className="gap-1.5 h-9 text-xs text-slate-700 hover:bg-slate-100"
              >
                <PackagePlus className="h-4 w-4 text-emerald-600" />
                Reabastecer
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
                placeholder="Buscar por nome, código ou tamanho..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
              <SelectTrigger className="w-48 h-9 text-xs">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas as Categorias</SelectItem>
                {CATEGORIAS_PRODUTO.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(val: any) => setStatusFilter(val)}
            >
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os Status</SelectItem>
                <SelectItem value="Em Estoque">Em Estoque</SelectItem>
                <SelectItem value="Baixo Estoque">Baixo Estoque</SelectItem>
                <SelectItem value="Esgotado">Esgotado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Produtos com Detalhamento de Variações */}
      {filteredProdutos.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <p className="text-sm font-medium">Nenhum produto encontrado com os filtros selecionados.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProdutos.map((produto) => {
            const totalEstoque = produto.temVariacoes && produto.variacoes
              ? produto.variacoes.reduce((acc, v) => acc + v.quantidadeEstoque, 0)
              : produto.quantidadeEstoque || 0;

            const isEsgotado = totalEstoque === 0;
            const isBaixoEstoque =
              !isEsgotado &&
              (produto.temVariacoes && produto.variacoes
                ? totalEstoque <= Math.min(...produto.variacoes.map((v) => v.estoqueMinimo || 5)) * 2
                : totalEstoque <= (produto.estoqueMinimo || 5));

            return (
              <Card key={produto.id} className="border shadow-sm flex flex-col justify-between">
                <CardHeader className="p-4 pb-2 border-b bg-slate-50/50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold text-slate-900">
                          {produto.nome}
                        </CardTitle>
                        {produto.codigo && (
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {produto.codigo}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{produto.categoria}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      {isEsgotado ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Esgotado
                        </Badge>
                      ) : isBaixoEstoque ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                          Estoque Baixo
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                          {totalEstoque} {produto.unidadeMedida || 'un'} em estoque
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 flex-1 space-y-3">
                  {produto.descricao && (
                    <p className="text-xs text-slate-600 line-clamp-2">{produto.descricao}</p>
                  )}

                  {/* Variações de Tamanho */}
                  {produto.temVariacoes && produto.variacoes ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase">
                        <span className="flex items-center gap-1">
                          <Layers className="h-3 w-3 text-primary" /> Grade de Tamanhos
                        </span>
                        <span>Preço de Venda</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {produto.variacoes.map((v) => {
                          const zerado = v.quantidadeEstoque <= 0;
                          const critico = !zerado && v.quantidadeEstoque <= v.estoqueMinimo;

                          return (
                            <div
                              key={v.id}
                              className={`p-2 rounded border text-xs flex flex-col justify-between ${
                                zerado
                                  ? 'bg-red-50/60 border-red-200 text-red-900'
                                  : critico
                                  ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex justify-between font-bold">
                                <span>{v.nome}</span>
                                <span className={zerado ? 'text-red-600 font-bold' : ''}>
                                  {v.quantidadeEstoque} un
                                </span>
                              </div>
                              <div className="flex flex-col gap-0.5 mt-1 text-[11px]">
                                <span className="text-emerald-700 font-semibold">
                                  À vista: {formatCurrency(v.precoVenda || 0)}
                                </span>
                                {v.precoVendaCredito ? (
                                  <span className="text-blue-700 font-medium text-[10px]">
                                    Crédito: {formatCurrency(v.precoVendaCredito)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-slate-50 rounded border text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Estoque Total:</span>
                        <strong className="text-slate-800 text-sm">{totalEstoque} un</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Preço Custo:</span>
                        <span className="text-slate-600">{formatCurrency(produto.precoCusto || 0)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">À Vista (PIX/Din):</span>
                        <strong className="text-emerald-700 text-sm">
                          {formatCurrency(produto.precoVenda || 0)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">No Crédito (Cartão):</span>
                        <strong className="text-blue-700 text-sm">
                          {formatCurrency(produto.precoVendaCredito || produto.precoVenda || 0)}
                        </strong>
                      </div>
                    </div>
                  )}
                </CardContent>

                {/* Rodapé do Card com Ações */}
                <div className="p-3 border-t bg-slate-50/40 flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-slate-600 gap-1"
                    onClick={() => onEditProduto(produto)}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      onClick={() => onOpenReabastecer(produto.id)}
                    >
                      <PackagePlus className="h-3.5 w-3.5" /> Reabastecer
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      onClick={onOpenNovaVenda}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" /> Vender
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
