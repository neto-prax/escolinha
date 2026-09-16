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
import { ArrowUpRight, AlertTriangle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  ProdutoEstoque,
  MovimentacaoEstoque,
  MOTIVOS_RETIRADA,
  SETORES_ESCOLA,
} from '@/types/estoque';

interface RegistrarRetiradaModalProps {
  isOpen: boolean;
  onClose: () => void;
  produtos: ProdutoEstoque[];
  colaboradores?: { id: string; name: string; role?: string }[];
  onConfirmRetirada: (
    produtoAtualizado: ProdutoEstoque,
    movimentacao: MovimentacaoEstoque
  ) => void;
}

export const RegistrarRetiradaModal: React.FC<RegistrarRetiradaModalProps> = ({
  isOpen,
  onClose,
  produtos,
  colaboradores = [],
  onConfirmRetirada,
}) => {
  const [selectedProdutoId, setSelectedProdutoId] = useState('');
  const [selectedVariacaoId, setSelectedVariacaoId] = useState('');
  const [quantidade, setQuantidade] = useState<number | ''>(1);
  const [motivo, setMotivo] = useState(MOTIVOS_RETIRADA[0]);
  const [setor, setSetor] = useState(SETORES_ESCOLA[0]);
  const [responsavelNome, setResponsavelNome] = useState('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (produtos.length > 0 && !selectedProdutoId) {
      setSelectedProdutoId(produtos[0].id);
    }
  }, [produtos]);

  const currentProduto = produtos.find((p) => p.id === selectedProdutoId);

  useEffect(() => {
    if (currentProduto) {
      if (currentProduto.temVariacoes && currentProduto.variacoes?.length) {
        setSelectedVariacaoId(currentProduto.variacoes[0].id);
      } else {
        setSelectedVariacaoId('');
      }
    }
  }, [selectedProdutoId, currentProduto]);

  const currentVariacao = currentProduto?.variacoes?.find((v) => v.id === selectedVariacaoId);

  const estoqueDisponivel = currentProduto
    ? currentProduto.temVariacoes
      ? currentVariacao?.quantidadeEstoque ?? 0
      : currentProduto.quantidadeEstoque ?? 0
    : 0;

  const qtdNum = Number(quantidade) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduto) {
      toast.error('Selecione um produto.');
      return;
    }

    if (qtdNum <= 0) {
      toast.error('Informe uma quantidade válida para retirada.');
      return;
    }

    if (qtdNum > estoqueDisponivel) {
      toast.error(
        `Quantidade solicitada (${qtdNum}) é superior ao estoque disponível (${estoqueDisponivel}).`
      );
      return;
    }

    let produtoAtualizado: ProdutoEstoque = { ...currentProduto };
    let qtdAnterior = estoqueDisponivel;
    let qtdAtual = qtdAnterior - qtdNum;
    let varNome: string | undefined = undefined;

    if (currentProduto.temVariacoes && currentProduto.variacoes) {
      const idx = currentProduto.variacoes.findIndex((v) => v.id === selectedVariacaoId);
      if (idx === -1) {
        toast.error('Selecione a variação/tamanho da retirada.');
        return;
      }
      varNome = currentProduto.variacoes[idx].nome;
      const novasVariacoes = [...currentProduto.variacoes];
      novasVariacoes[idx] = {
        ...novasVariacoes[idx],
        quantidadeEstoque: qtdAtual,
      };
      produtoAtualizado.variacoes = novasVariacoes;
    } else {
      produtoAtualizado.quantidadeEstoque = qtdAtual;
    }

    produtoAtualizado.atualizadoEm = new Date().toISOString();

    const isReposicao = motivo.toLowerCase().includes('reposição');

    const movimentacao: MovimentacaoEstoque = {
      id: `mov-${Date.now()}`,
      data: new Date().toISOString(),
      tipo: isReposicao ? 'reposicao' : 'saida_consumo',
      produtoId: currentProduto.id,
      produtoNome: currentProduto.nome,
      variacaoId: selectedVariacaoId || undefined,
      variacaoNome: varNome,
      quantidade: qtdNum,
      quantidadeAnterior: qtdAnterior,
      quantidadeAtual: qtdAtual,
      motivo,
      setor,
      responsavelNome: responsavelNome.trim() || 'Colaborador não identificado',
      destinatario: setor,
      observacoes: observacoes.trim() || undefined,
    };

    onConfirmRetirada(produtoAtualizado, movimentacao);
    toast.success(
      `Retirada registrada com sucesso! -${qtdNum} ${
        currentProduto.unidadeMedida || 'un'
      } baixadas do estoque.`
    );
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b bg-slate-50">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-amber-600" />
            <span>Registrar Retirada / Consumo Interno / Reposição</span>
          </DialogTitle>
          <DialogDescription>
            Registre saídas de produtos para limpeza, uso na secretaria, salas de aula ou troca por defeito.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {/* Seleção do Produto */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Produto a Retirar *</Label>
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

          {/* Seleção de Variação (se houver) */}
          {currentProduto?.temVariacoes && currentProduto.variacoes && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tamanho / Variação *</Label>
              <Select value={selectedVariacaoId} onValueChange={setSelectedVariacaoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tamanho..." />
                </SelectTrigger>
                <SelectContent>
                  {currentProduto.variacoes.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.nome} (Disponível: {v.quantidadeEstoque})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Saldo de Estoque */}
          {currentProduto && (
            <div
              className={`p-3 rounded border text-xs flex items-center justify-between ${
                estoqueDisponivel <= 0
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <span>
                Estoque Disponível:{' '}
                <strong>
                  {estoqueDisponivel} {currentProduto.unidadeMedida || 'un'}
                </strong>
              </span>
              <span>
                Após retirada:{' '}
                <strong
                  className={
                    estoqueDisponivel - qtdNum < 0 ? 'text-red-600' : 'text-slate-800'
                  }
                >
                  {Math.max(0, estoqueDisponivel - qtdNum)} {currentProduto.unidadeMedida || 'un'}
                </strong>
              </span>
            </div>
          )}

          {/* Quantidade a Retirar */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Quantidade a Retirar *</Label>
            <Input
              type="number"
              min="1"
              max={estoqueDisponivel}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value === '' ? '' : Number(e.target.value))}
              required
            />
          </div>

          {/* Motivo e Setor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Finalidade / Motivo *</Label>
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS_RETIRADA.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Setor Destino *</Label>
              <Select value={setor} onValueChange={setSetor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SETORES_ESCOLA.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Responsável / Solicitante */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Colaborador / Solicitante *</Label>
            {colaboradores.length > 0 ? (
              <div className="flex gap-2">
                <Select value={responsavelNome} onValueChange={setResponsavelNome}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione o colaborador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name} {c.role ? `(${c.role})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <Input
                placeholder="Nome de quem retirou o material"
                value={responsavelNome}
                onChange={(e) => setResponsavelNome(e.target.value)}
                required
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Observações / Detalhes</Label>
            <Textarea
              rows={2}
              placeholder="Ex: Utilizado na higienização das salas do piso superior ou troca de uniforme do aluno Lucas"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <DialogFooter className="p-4 border-t bg-slate-50 flex items-center justify-end gap-2 -mx-5 -mb-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={estoqueDisponivel <= 0}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Confirmar Retirada
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
