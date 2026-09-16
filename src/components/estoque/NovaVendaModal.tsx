import React, { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ShoppingCart, Plus, Trash2, CheckCircle2, User, UserCheck, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { ProdutoEstoque, ItemVendaEstoque, VendaEstoque, MovimentacaoEstoque } from '@/types/estoque';
import { Aluno } from '@/types/aluno';
import { SearchableProdutoSelect } from '@/components/estoque/SearchableProdutoSelect';

interface NovaVendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  produtos: ProdutoEstoque[];
  alunos: Aluno[];
  onConfirmVenda: (
    produtosAtualizados: ProdutoEstoque[],
    movimentacoes: MovimentacaoEstoque[],
    venda: VendaEstoque,
    criarLancamentoFinanceiro?: {
      valor: number;
      descricao: string;
      formaPagamento: any;
      alunoId?: string;
    }
  ) => void;
}

interface ItemLinhaVenda {
  idTemp: string;
  produtoId: string;
  variacaoId?: string;
  quantidade: number;
  precoUnitario: number;
}

export const NovaVendaModal: React.FC<NovaVendaModalProps> = ({
  isOpen,
  onClose,
  produtos,
  alunos,
  onConfirmVenda,
}) => {
  const produtosVenda = produtos.filter((p) => p.destino === 'venda' || p.destino === 'ambos');

  const [tipoComprador, setTipoComprador] = useState<'aluno' | 'externo'>('aluno');
  const [selectedAlunoId, setSelectedAlunoId] = useState('');
  const [nomeComprador, setNomeComprador] = useState('');
  const [cpfComprador, setCpfComprador] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<
    'PIX' | 'Dinheiro' | 'Cartão' | 'Boleto' | 'Transferência Bancária'
  >('PIX');
  const [tabelaPreco, setTabelaPreco] = useState<'a_vista' | 'credito'>('a_vista');
  const [lancarFinanceiro, setLancarFinanceiro] = useState(true);

  const getPrecoUnitarioParaItem = (
    prodId: string,
    variacaoId: string | undefined,
    tabela: 'a_vista' | 'credito'
  ) => {
    const prod = produtosVenda.find((p) => p.id === prodId);
    if (!prod) return 0;
    if (prod.temVariacoes && prod.variacoes) {
      const varObj = prod.variacoes.find((v) => v.id === variacaoId);
      if (tabela === 'credito') {
        return varObj?.precoVendaCredito || varObj?.precoVenda || 0;
      }
      return varObj?.precoVenda || 0;
    }
    if (tabela === 'credito') {
      return prod.precoVendaCredito || prod.precoVenda || 0;
    }
    return prod.precoVenda || 0;
  };

  const aplicarTabelaPreco = (novaTabela: 'a_vista' | 'credito') => {
    setTabelaPreco(novaTabela);
    setItensLinha((prev) =>
      prev.map((item) => ({
        ...item,
        precoUnitario: getPrecoUnitarioParaItem(item.produtoId, item.variacaoId, novaTabela),
      }))
    );
  };

  const handleFormaPagamentoChange = (
    val: 'PIX' | 'Dinheiro' | 'Cartão' | 'Boleto' | 'Transferência Bancária'
  ) => {
    setFormaPagamento(val);
    const novaTabela = val === 'Cartão' ? 'credito' : 'a_vista';
    aplicarTabelaPreco(novaTabela);
  };

  // Carrinho de itens
  const [itensLinha, setItensLinha] = useState<ItemLinhaVenda[]>(() => {
    if (produtosVenda.length > 0) {
      const p = produtosVenda[0];
      const v = p.temVariacoes && p.variacoes?.length ? p.variacoes[0] : null;
      return [
        {
          idTemp: `line-${Date.now()}`,
          produtoId: p.id,
          variacaoId: v?.id,
          quantidade: 1,
          precoUnitario: v ? v.precoVenda || 0 : p.precoVenda || 0,
        },
      ];
    }
    return [];
  });

  const selectedAluno = alunos.find((a) => a.id === selectedAlunoId);

  const handleAddItemLinha = () => {
    if (produtosVenda.length === 0) return;
    const p = produtosVenda[0];
    const v = p.temVariacoes && p.variacoes?.length ? p.variacoes[0] : null;
    const preco = getPrecoUnitarioParaItem(p.id, v?.id, tabelaPreco);
    setItensLinha((prev) => [
      ...prev,
      {
        idTemp: `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        produtoId: p.id,
        variacaoId: v?.id,
        quantidade: 1,
        precoUnitario: preco,
      },
    ]);
  };

  const handleUpdateItemLinha = (idTemp: string, updates: Partial<ItemLinhaVenda>) => {
    setItensLinha((prev) =>
      prev.map((item) => {
        if (item.idTemp !== idTemp) return item;

        const updated = { ...item, ...updates };

        // Se mudou o produto, reseta variação e preço
        if (updates.produtoId && updates.produtoId !== item.produtoId) {
          const novoProd = produtosVenda.find((p) => p.id === updates.produtoId);
          if (novoProd?.temVariacoes && novoProd.variacoes?.length) {
            updated.variacaoId = novoProd.variacoes[0].id;
            updated.precoUnitario = getPrecoUnitarioParaItem(novoProd.id, novoProd.variacoes[0].id, tabelaPreco);
          } else {
            updated.variacaoId = undefined;
            updated.precoUnitario = getPrecoUnitarioParaItem(updates.produtoId, undefined, tabelaPreco);
          }
        }

        // Se mudou a variação, ajusta o preço
        if (updates.variacaoId && updates.variacaoId !== item.variacaoId) {
          updated.precoUnitario = getPrecoUnitarioParaItem(updated.produtoId, updates.variacaoId, tabelaPreco);
        }

        return updated;
      })
    );
  };

  const handleRemoveItemLinha = (idTemp: string) => {
    if (itensLinha.length <= 1) {
      toast.info('A venda deve conter pelo menos 1 item.');
      return;
    }
    setItensLinha((prev) => prev.filter((i) => i.idTemp !== idTemp));
  };

  const valorTotalVenda = itensLinha.reduce(
    (acc, curr) => acc + curr.quantidade * curr.precoUnitario,
    0
  );

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (itensLinha.length === 0) {
      toast.error('Adicione pelo menos um item à venda.');
      return;
    }

    if (tipoComprador === 'aluno' && !selectedAlunoId) {
      toast.error('Selecione o aluno comprador.');
      return;
    }

    if (tipoComprador === 'externo' && !nomeComprador.trim()) {
      toast.error('Informe o nome do comprador.');
      return;
    }

    // Validar estoque suficiente para cada item
    const produtosCopia = JSON.parse(JSON.stringify(produtos)) as ProdutoEstoque[];
    const movimentacoes: MovimentacaoEstoque[] = [];
    const itensVendaFinais: ItemVendaEstoque[] = [];

    const buyerName =
      tipoComprador === 'aluno'
        ? selectedAluno?.nome || 'Aluno'
        : nomeComprador.trim();

    const buyerDoc =
      tipoComprador === 'aluno'
        ? selectedAluno?.cpfResponsavel || selectedAluno?.cpf || ''
        : cpfComprador.trim();

    const turmaStr =
      tipoComprador === 'aluno' && selectedAluno
        ? `${selectedAluno.classe || ''} ${selectedAluno.turma || ''} (${selectedAluno.setor || ''})`.trim()
        : undefined;

    const numeroRecibo = `REC-${new Date().getFullYear()}-${Math.floor(
      10000 + Math.random() * 90000
    )}`;

    for (const linha of itensLinha) {
      const prod = produtosCopia.find((p) => p.id === linha.produtoId);
      if (!prod) continue;

      let qtdAnterior = 0;
      let qtdAtual = 0;
      let varNome: string | undefined = undefined;

      if (prod.temVariacoes && prod.variacoes) {
        const vIdx = prod.variacoes.findIndex((v) => v.id === linha.variacaoId);
        if (vIdx === -1) {
          toast.error(`Selecione a variação para o produto ${prod.nome}.`);
          return;
        }
        const vObj = prod.variacoes[vIdx];
        if (vObj.quantidadeEstoque < linha.quantidade) {
          toast.error(
            `Estoque insuficiente para ${prod.nome} (${vObj.nome}). Disponível: ${vObj.quantidadeEstoque}, Solicitado: ${linha.quantidade}`
          );
          return;
        }
        qtdAnterior = vObj.quantidadeEstoque;
        qtdAtual = qtdAnterior - linha.quantidade;
        varNome = vObj.nome;
        prod.variacoes[vIdx].quantidadeEstoque = qtdAtual;
      } else {
        const estAtual = prod.quantidadeEstoque || 0;
        if (estAtual < linha.quantidade) {
          toast.error(
            `Estoque insuficiente para ${prod.nome}. Disponível: ${estAtual}, Solicitado: ${linha.quantidade}`
          );
          return;
        }
        qtdAnterior = estAtual;
        qtdAtual = qtdAnterior - linha.quantidade;
        prod.quantidadeEstoque = qtdAtual;
      }

      prod.atualizadoEm = new Date().toISOString();

      itensVendaFinais.push({
        produtoId: prod.id,
        produtoNome: prod.nome,
        variacaoId: linha.variacaoId,
        variacaoNome: varNome,
        quantidade: linha.quantidade,
        precoUnitario: linha.precoUnitario,
        subtotal: linha.quantidade * linha.precoUnitario,
      });

      movimentacoes.push({
        id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        data: new Date().toISOString(),
        tipo: 'saida_venda',
        produtoId: prod.id,
        produtoNome: prod.nome,
        variacaoId: linha.variacaoId,
        variacaoNome: varNome,
        quantidade: linha.quantidade,
        quantidadeAnterior: qtdAnterior,
        quantidadeAtual: qtdAtual,
        motivo: `Venda balcão (${numeroRecibo})`,
        destinatario: buyerName,
        valorUnitario: linha.precoUnitario,
        valorTotal: linha.quantidade * linha.precoUnitario,
        reciboNumero: numeroRecibo,
      });
    }

    const venda: VendaEstoque = {
      id: `venda-${Date.now()}`,
      numeroRecibo,
      data: new Date().toISOString(),
      compradorTipo: tipoComprador,
      alunoId: tipoComprador === 'aluno' ? selectedAlunoId : undefined,
      compradorNome: buyerName,
      compradorDocumento: buyerDoc,
      turmaAluno: turmaStr,
      itens: itensVendaFinais,
      valorTotal: valorTotalVenda,
      formaPagamento,
      statusPagamento: 'Pago',
      vendedorNome: 'Balcão / Secretaria',
    };

    const dadosFinanceiros = lancarFinanceiro
      ? {
          valor: valorTotalVenda,
          descricao: `Venda de Uniforme/Estoque (${numeroRecibo}) - ${buyerName}`,
          formaPagamento,
          alunoId: tipoComprador === 'aluno' ? selectedAlunoId : undefined,
        }
      : undefined;

    onConfirmVenda(produtosCopia, movimentacoes, venda, dadosFinanceiros);
    toast.success('Venda concluída com sucesso! Recibo gerado para impressão.');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b bg-slate-50">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-emerald-600" />
            <span>Nova Venda de Balcão (Uniformes & Materiais)</span>
          </DialogTitle>
          <DialogDescription>
            Lance a saída de produtos, selecione o comprador e gere o recibo oficial de pagamento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {/* Identificação do Comprador */}
          <div className="p-3.5 bg-slate-50 rounded-lg border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <User className="h-4 w-4 text-primary" /> Identificação do Comprador
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={tipoComprador === 'aluno' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setTipoComprador('aluno')}
                >
                  Aluno Matriculado
                </Button>
                <Button
                  type="button"
                  variant={tipoComprador === 'externo' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setTipoComprador('externo')}
                >
                  Cliente Avulso / Visitante
                </Button>
              </div>
            </div>

            {tipoComprador === 'aluno' ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Selecione o Aluno *</Label>
                <Select value={selectedAlunoId} onValueChange={setSelectedAlunoId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Busque ou selecione o aluno..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {alunos
                      .filter((a) => a.status === 'Ativo' || !a.status)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome} {a.classe ? `— ${a.classe} ${a.turma || ''}` : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {selectedAluno && (
                  <p className="text-[11px] text-slate-500">
                    Responsável: <strong>{selectedAluno.nomeResponsavel || 'Não cadastrado'}</strong> • CPF:{' '}
                    {selectedAluno.cpfResponsavel || selectedAluno.cpf || 'Não cadastrado'}
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Nome Completo *</Label>
                  <Input
                    placeholder="Nome do cliente/comprador"
                    value={nomeComprador}
                    onChange={(e) => setNomeComprador(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">CPF (opcional)</Label>
                  <Input
                    placeholder="000.000.000-00"
                    value={cpfComprador}
                    onChange={(e) => setCpfComprador(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Lista de Itens da Venda */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Itens a Vender ({itensLinha.length})
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-md border bg-slate-200/60 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => aplicarTabelaPreco('a_vista')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                      tabelaPreco === 'a_vista'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⚡ À Vista (Dinheiro/PIX)
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarTabelaPreco('credito')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                      tabelaPreco === 'credito'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    💳 No Crédito (Cartão)
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleAddItemLinha}
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar Outro Item
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {itensLinha.map((linha, idx) => {
                const prod = produtosVenda.find((p) => p.id === linha.produtoId);
                const varObj = prod?.variacoes?.find((v) => v.id === linha.variacaoId);
                const estDisponivel = prod?.temVariacoes
                  ? varObj?.quantidadeEstoque ?? 0
                  : prod?.quantidadeEstoque ?? 0;

                const refVista = prod?.temVariacoes ? varObj?.precoVenda || 0 : prod?.precoVenda || 0;
                const refCredito = prod?.temVariacoes
                  ? varObj?.precoVendaCredito || varObj?.precoVenda || 0
                  : prod?.precoVendaCredito || prod?.precoVenda || 0;

                return (
                  <div
                    key={linha.idTemp}
                    className="p-3 bg-white border rounded-lg shadow-sm grid grid-cols-12 gap-2 items-center text-xs"
                  >
                    {/* Produto */}
                    <div className={prod?.temVariacoes ? 'col-span-5' : 'col-span-7'}>
                      <Label className="text-[10px] text-slate-400">Produto (digite para buscar)</Label>
                      <SearchableProdutoSelect
                        produtos={produtosVenda}
                        value={linha.produtoId}
                        onChange={(val) => handleUpdateItemLinha(linha.idTemp, { produtoId: val })}
                      />
                    </div>

                    {/* Variação (se houver) */}
                    {prod?.temVariacoes && prod.variacoes && (
                      <div className="col-span-2">
                        <Label className="text-[10px] text-slate-400">Tamanho</Label>
                        <Select
                          value={linha.variacaoId}
                          onValueChange={(val) =>
                            handleUpdateItemLinha(linha.idTemp, { variacaoId: val })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs font-semibold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {prod.variacoes.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.nome} (Estoque: {v.quantidadeEstoque})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Quantidade */}
                    <div className="col-span-2">
                      <Label className="text-[10px] text-slate-400">
                        Qtd (Disp: {estDisponivel})
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        max={estDisponivel || 1}
                        className="h-8 text-xs font-bold"
                        value={linha.quantidade}
                        onChange={(e) =>
                          handleUpdateItemLinha(linha.idTemp, {
                            quantidade: Number(e.target.value) || 1,
                          })
                        }
                      />
                    </div>

                    {/* Preço Unitário */}
                    <div className="col-span-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] text-slate-400">Unitário</Label>
                        <span
                          className={`text-[9px] font-bold px-1 rounded ${
                            tabelaPreco === 'credito'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {tabelaPreco === 'credito' ? 'Crédito' : 'À vista'}
                        </span>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 text-xs font-semibold"
                        value={linha.precoUnitario}
                        onChange={(e) =>
                          handleUpdateItemLinha(linha.idTemp, {
                            precoUnitario: Number(e.target.value) || 0,
                          })
                        }
                      />
                      <div className="text-[9px] text-slate-400 mt-0.5 truncate" title={`À vista: ${formatCurrency(refVista)} | Crédito: ${formatCurrency(refCredito)}`}>
                        {formatCurrency(refVista)} (V) / {formatCurrency(refCredito)} (C)
                      </div>
                    </div>

                    {/* Remover */}
                    <div className="col-span-1 flex justify-end pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveItemLinha(linha.idTemp)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Subtotal da linha */}
                    <div className="col-span-12 flex justify-between text-[11px] text-slate-500 pt-1 border-t">
                      <span>
                        Subtotal do item:{' '}
                        <strong className="text-slate-900">
                          {formatCurrency(linha.quantidade * linha.precoUnitario)}
                        </strong>
                      </span>
                      {estDisponivel < linha.quantidade && (
                        <span className="text-red-600 font-semibold">
                          ⚠️ Quantidade maior que o estoque ({estDisponivel})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagamento e Total */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-lg border">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Forma de Pagamento *</Label>
              <Select
                value={formaPagamento}
                onValueChange={(val: any) => handleFormaPagamentoChange(val)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX (À Vista)</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro em Espécie (À Vista)</SelectItem>
                  <SelectItem value="Cartão">Cartão (Preço no Crédito)</SelectItem>
                  <SelectItem value="Boleto">Boleto Bancário (À Vista)</SelectItem>
                  <SelectItem value="Transferência Bancária">Transferência (À Vista)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col justify-center items-end bg-white p-3 rounded border">
              <span className="text-xs text-slate-500 font-medium">Valor Total da Venda</span>
              <span className="text-xl font-bold text-emerald-700">
                {formatCurrency(valorTotalVenda)}
              </span>
            </div>
          </div>

          {/* Checkbox Financeiro */}
          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="lancarFinVenda"
              checked={lancarFinanceiro}
              onCheckedChange={(checked) => setLancarFinanceiro(Boolean(checked))}
            />
            <label
              htmlFor="lancarFinVenda"
              className="text-xs font-medium cursor-pointer leading-none text-slate-800"
            >
              Lançar receita de venda automaticamente no Financeiro (Entrada em Caixa)
            </label>
          </div>

          <DialogFooter className="p-4 border-t bg-slate-50 flex items-center justify-end gap-2 -mx-5 -mb-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={itensLinha.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold"
            >
              <CheckCircle2 className="h-4 w-4" />
              Finalizar Venda & Gerar Recibo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
