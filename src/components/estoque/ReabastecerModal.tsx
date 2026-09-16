import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PackagePlus, Truck, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { ProdutoEstoque, MovimentacaoEstoque } from '@/types/estoque';

interface ReabastecerModalProps {
  isOpen: boolean;
  onClose: () => void;
  produtos: ProdutoEstoque[];
  produtoIdInicial?: string;
  onConfirmReabastecimento: (
    produtoAtualizado: ProdutoEstoque,
    movimentacao: MovimentacaoEstoque,
    criarLancamentoFinanceiro?: {
      valor: number;
      descricao: string;
      fornecedor?: string;
    }
  ) => void;
}

export const ReabastecerModal: React.FC<ReabastecerModalProps> = ({
  isOpen,
  onClose,
  produtos,
  produtoIdInicial,
  onConfirmReabastecimento,
}) => {
  const [selectedProdutoId, setSelectedProdutoId] = useState<string>('');
  const [selectedVariacaoId, setSelectedVariacaoId] = useState<string>('');
  const [quantidade, setQuantidade] = useState<number | ''>(1);
  const [custoUnitario, setCustoUnitario] = useState<number | ''>('');
  const [fornecedor, setFornecedor] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [lancarFinanceiro, setLancarFinanceiro] = useState(true);

  useEffect(() => {
    if (produtoIdInicial) {
      setSelectedProdutoId(produtoIdInicial);
    } else if (produtos.length > 0 && !selectedProdutoId) {
      setSelectedProdutoId(produtos[0].id);
    }
  }, [produtoIdInicial, produtos]);

  const currentProduto = produtos.find((p) => p.id === selectedProdutoId);

  useEffect(() => {
    if (currentProduto) {
      if (currentProduto.temVariacoes && currentProduto.variacoes?.length) {
        setSelectedVariacaoId(currentProduto.variacoes[0].id);
        setCustoUnitario(currentProduto.variacoes[0].precoCusto || '');
      } else {
        setSelectedVariacaoId('');
        setCustoUnitario(currentProduto.precoCusto || '');
      }
    }
  }, [selectedProdutoId, currentProduto]);

  const currentVariacao = currentProduto?.variacoes?.find((v) => v.id === selectedVariacaoId);

  const handleVariacaoChange = (varId: string) => {
    setSelectedVariacaoId(varId);
    const v = currentProduto?.variacoes?.find((item) => item.id === varId);
    if (v) {
      setCustoUnitario(v.precoCusto || '');
    }
  };

  const qtdNum = Number(quantidade) || 0;
  const custoNum = Number(custoUnitario) || 0;
  const totalCusto = qtdNum * custoNum;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduto) {
      toast.error('Selecione um produto.');
      return;
    }

    if (qtdNum <= 0) {
      toast.error('Informe uma quantidade válida para reabastecimento.');
      return;
    }

    let produtoAtualizado: ProdutoEstoque = { ...currentProduto };
    let qtdAnterior = 0;
    let qtdAtual = 0;
    let varNome: string | undefined = undefined;

    if (currentProduto.temVariacoes && currentProduto.variacoes) {
      const idx = currentProduto.variacoes.findIndex((v) => v.id === selectedVariacaoId);
      if (idx === -1) {
        toast.error('Selecione o tamanho/variação a ser reabastecido.');
        return;
      }
      qtdAnterior = currentProduto.variacoes[idx].quantidadeEstoque;
      qtdAtual = qtdAnterior + qtdNum;
      varNome = currentProduto.variacoes[idx].nome;

      const novasVariacoes = [...currentProduto.variacoes];
      novasVariacoes[idx] = {
        ...novasVariacoes[idx],
        quantidadeEstoque: qtdAtual,
        precoCusto: custoNum > 0 ? custoNum : novasVariacoes[idx].precoCusto,
      };

      produtoAtualizado.variacoes = novasVariacoes;
    } else {
      qtdAnterior = currentProduto.quantidadeEstoque || 0;
      qtdAtual = qtdAnterior + qtdNum;
      produtoAtualizado.quantidadeEstoque = qtdAtual;
      if (custoNum > 0) {
        produtoAtualizado.precoCusto = custoNum;
      }
    }

    produtoAtualizado.atualizadoEm = new Date().toISOString();

    const movimentacao: MovimentacaoEstoque = {
      id: `mov-${Date.now()}`,
      data: new Date().toISOString(),
      tipo: 'entrada',
      produtoId: currentProduto.id,
      produtoNome: currentProduto.nome,
      variacaoId: selectedVariacaoId || undefined,
      variacaoNome: varNome,
      quantidade: qtdNum,
      quantidadeAnterior: qtdAnterior,
      quantidadeAtual: qtdAtual,
      motivo: 'Entrada / Reabastecimento de Estoque',
      responsavelNome: 'Almoxarifado / Estoque',
      destinatario: fornecedor || 'Estoque Central',
      valorUnitario: custoNum > 0 ? custoNum : undefined,
      valorTotal: totalCusto > 0 ? totalCusto : undefined,
      observacoes: [
        fornecedor ? `Fornecedor: ${fornecedor}` : null,
        notaFiscal ? `NF: ${notaFiscal}` : null,
        observacoes,
      ]
        .filter(Boolean)
        .join(' • '),
    };

    const dadosFinanceiros =
      lancarFinanceiro && totalCusto > 0
        ? {
            valor: totalCusto,
            descricao: `Compra de Estoque - ${currentProduto.nome}${
              varNome ? ` (${varNome})` : ''
            } [Qtd: ${qtdNum}]`,
            fornecedor,
          }
        : undefined;

    onConfirmReabastecimento(produtoAtualizado, movimentacao, dadosFinanceiros);
    toast.success(
      `Reabastecimento realizado com sucesso! +${qtdNum} ${
        currentProduto.unidadeMedida || 'un'
      } adicionadas ao estoque.`
    );
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b bg-slate-50">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-emerald-600" />
            <span>Reabastecer Estoque / Entrada de Mercadoria</span>
          </DialogTitle>
          <DialogDescription>
            Incremente o saldo de um produto e opcionalmente lance a despesa de compra no financeiro.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {/* Selecionar Produto */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Produto *</Label>
            <Select value={selectedProdutoId} onValueChange={setSelectedProdutoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o produto..." />
              </SelectTrigger>
              <SelectContent>
                {produtos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome} ({p.categoria})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selecionar Variação se houver */}
          {currentProduto?.temVariacoes && currentProduto.variacoes && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tamanho / Variação *</Label>
              <Select value={selectedVariacaoId} onValueChange={handleVariacaoChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a variação..." />
                </SelectTrigger>
                <SelectContent>
                  {currentProduto.variacoes.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.nome} (Estoque atual: {v.quantidadeEstoque})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Informações de Estoque Atual */}
          {currentProduto && (
            <div className="p-3 bg-slate-50 rounded border text-xs flex items-center justify-between text-slate-700">
              <span>
                Estoque Atual:{' '}
                <strong>
                  {currentProduto.temVariacoes
                    ? currentVariacao?.quantidadeEstoque ?? 0
                    : currentProduto.quantidadeEstoque ?? 0}{' '}
                  {currentProduto.unidadeMedida || 'un'}
                </strong>
              </span>
              <span className="text-muted-foreground">
                Novo Estoque previsto:{' '}
                <strong className="text-emerald-700">
                  {(currentProduto.temVariacoes
                    ? currentVariacao?.quantidadeEstoque ?? 0
                    : currentProduto.quantidadeEstoque ?? 0) + qtdNum}{' '}
                  {currentProduto.unidadeMedida || 'un'}
                </strong>
              </span>
            </div>
          )}

          {/* Quantidade e Custo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Quantidade a Adicionar *</Label>
              <Input
                type="number"
                min="1"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value === '' ? '' : Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Custo Unitário (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={custoUnitario}
                onChange={(e) =>
                  setCustoUnitario(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </div>
          </div>

          {totalCusto > 0 && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs flex justify-between items-center text-emerald-900 font-semibold">
              <span>Valor Total da Entrada:</span>
              <span>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  totalCusto
                )}
              </span>
            </div>
          )}

          {/* Dados do Fornecedor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Fornecedor (opcional)</Label>
              <Input
                placeholder="Nome da confecção ou distribuidor"
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Número da NF (opcional)</Label>
              <Input
                placeholder="Ex: 001.234"
                value={notaFiscal}
                onChange={(e) => setNotaFiscal(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Observações</Label>
            <Textarea
              rows={2}
              placeholder="Ex: Lote de reposição para início do semestre letivo"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          {/* Integração Financeira */}
          {totalCusto > 0 && (
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox
                id="lancarFinanceiro"
                checked={lancarFinanceiro}
                onCheckedChange={(checked) => setLancarFinanceiro(Boolean(checked))}
              />
              <label
                htmlFor="lancarFinanceiro"
                className="text-xs font-medium cursor-pointer leading-none text-slate-800"
              >
                Lançar despesa de compra automaticamente no Financeiro (Saída)
              </label>
            </div>
          )}

          <DialogFooter className="p-4 border-t bg-slate-50 flex items-center justify-end gap-2 -mx-5 -mb-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Confirmar Entrada
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
