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
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Tag, Layers, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  ProdutoEstoque,
  ProdutoVariacao,
  DestinoProduto,
  CATEGORIAS_PRODUTO,
} from '@/types/estoque';

interface NovoProdutoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProduto: (produto: ProdutoEstoque) => void;
  produtoEdicao?: ProdutoEstoque | null;
}

const PRESET_INFANTIL = ['Tam 2', 'Tam 4', 'Tam 6', 'Tam 8', 'Tam 10', 'Tam 12', 'Tam 14', 'Tam 16'];
const PRESET_ADULTO = ['Tam PP', 'Tam P', 'Tam M', 'Tam G', 'Tam GG', 'Tam XG'];

export const NovoProdutoModal: React.FC<NovoProdutoModalProps> = ({
  isOpen,
  onClose,
  onSaveProduto,
  produtoEdicao,
}) => {
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_PRODUTO[0]);
  const [destino, setDestino] = useState<DestinoProduto>('venda');
  const [unidadeMedida, setUnidadeMedida] = useState('un');
  const [unidadeEscolar, setUnidadeEscolar] = useState<'Senador' | 'Papagaio' | 'Todas'>('Todas');

  // Sem variações
  const [temVariacoes, setTemVariacoes] = useState(false);
  const [quantidadeEstoque, setQuantidadeEstoque] = useState<number | ''>(0);
  const [estoqueMinimo, setEstoqueMinimo] = useState<number | ''>(5);
  const [precoCusto, setPrecoCusto] = useState<number | ''>('');
  const [precoVenda, setPrecoVenda] = useState<number | ''>('');
  const [precoVendaCredito, setPrecoVendaCredito] = useState<number | ''>('');

  // Com variações
  const [variacoes, setVariacoes] = useState<ProdutoVariacao[]>([]);

  useEffect(() => {
    if (produtoEdicao) {
      setNome(produtoEdicao.nome || '');
      setCodigo(produtoEdicao.codigo || '');
      setDescricao(produtoEdicao.descricao || '');
      setCategoria(produtoEdicao.categoria || CATEGORIAS_PRODUTO[0]);
      setDestino(produtoEdicao.destino || 'venda');
      setUnidadeMedida(produtoEdicao.unidadeMedida || 'un');
      setUnidadeEscolar(produtoEdicao.unidadeEscolar || 'Todas');
      setTemVariacoes(Boolean(produtoEdicao.temVariacoes));
      setQuantidadeEstoque(produtoEdicao.quantidadeEstoque ?? 0);
      setEstoqueMinimo(produtoEdicao.estoqueMinimo ?? 5);
      setPrecoCusto(produtoEdicao.precoCusto ?? '');
      setPrecoVenda(produtoEdicao.precoVenda ?? '');
      setPrecoVendaCredito(produtoEdicao.precoVendaCredito ?? '');
      setVariacoes(produtoEdicao.variacoes ? [...produtoEdicao.variacoes] : []);
    } else {
      setNome('');
      setCodigo(`PROD-${Math.floor(1000 + Math.random() * 9000)}`);
      setDescricao('');
      setCategoria(CATEGORIAS_PRODUTO[0]);
      setDestino('venda');
      setUnidadeMedida('un');
      setUnidadeEscolar('Todas');
      setTemVariacoes(false);
      setQuantidadeEstoque(0);
      setEstoqueMinimo(5);
      setPrecoCusto('');
      setPrecoVenda('');
      setPrecoVendaCredito('');
      setVariacoes([]);
    }
  }, [produtoEdicao, isOpen]);

  const handleAddVariacao = (nomeVar = '') => {
    const vCusto = Number(precoCusto) || 0;
    const vVenda = Number(precoVenda) || 0;
    const vCredito = Number(precoVendaCredito) || (vVenda ? Math.round(vVenda * 1.1) : 0);

    const nova: ProdutoVariacao = {
      id: `var-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      nome: nomeVar || `Tam ${variacoes.length + 1}`,
      quantidadeEstoque: 0,
      estoqueMinimo: 5,
      precoCusto: vCusto,
      precoVenda: vVenda,
      precoVendaCredito: vCredito,
    };
    setVariacoes((prev) => [...prev, nova]);
  };

  const handleApplyPreset = (presets: string[]) => {
    const vCusto = Number(precoCusto) || 0;
    const vVenda = Number(precoVenda) || 0;
    const vCredito = Number(precoVendaCredito) || (vVenda ? Math.round(vVenda * 1.1) : 0);

    const novas = presets.map((p) => ({
      id: `var-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      nome: p,
      quantidadeEstoque: 0,
      estoqueMinimo: 5,
      precoCusto: vCusto,
      precoVenda: vVenda,
      precoVendaCredito: vCredito,
    }));
    setVariacoes((prev) => [...prev, ...novas]);
  };

  const handleUpdateVariacao = (id: string, field: keyof ProdutoVariacao, value: any) => {
    setVariacoes((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const handleRemoveVariacao = (id: string) => {
    setVariacoes((prev) => prev.filter((v) => v.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error('Informe o nome do produto.');
      return;
    }

    if (temVariacoes && variacoes.length === 0) {
      toast.error('Adicione pelo menos uma variação de tamanho para este produto.');
      return;
    }

    const novoProduto: ProdutoEstoque = {
      id: produtoEdicao?.id || `prod-${Date.now()}`,
      codigo: codigo.trim() || undefined,
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
      categoria,
      destino,
      unidadeMedida,
      unidadeEscolar,
      temVariacoes,
      variacoes: temVariacoes ? variacoes : undefined,
      quantidadeEstoque: !temVariacoes ? Number(quantidadeEstoque) || 0 : undefined,
      estoqueMinimo: !temVariacoes ? Number(estoqueMinimo) || 0 : undefined,
      precoCusto: !temVariacoes ? Number(precoCusto) || 0 : undefined,
      precoVenda: !temVariacoes && destino !== 'consumo_interno' ? Number(precoVenda) || 0 : undefined,
      precoVendaCredito: !temVariacoes && destino !== 'consumo_interno' ? Number(precoVendaCredito) || undefined : undefined,
      ativo: true,
      criadoEm: produtoEdicao?.criadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    onSaveProduto(novoProduto);
    toast.success(
      produtoEdicao ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!'
    );
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b bg-slate-50">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            {produtoEdicao ? 'Editar Produto' : 'Novo Produto de Estoque'}
          </DialogTitle>
          <DialogDescription>
            Configure as informações gerais, finalidade (venda ou consumo) e variações de tamanho.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold">Nome do Produto *</Label>
              <Input
                placeholder="Ex: Camiseta Manga Curta, Detergente 5L"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Código / SKU</Label>
              <Input
                placeholder="Ex: UNI-CAM-01"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Destino do Produto *</Label>
              <Select value={destino} onValueChange={(val: DestinoProduto) => setDestino(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="venda">Venda (Alunos / Clientes)</SelectItem>
                  <SelectItem value="consumo_interno">Consumo Interno (Limpeza / Uso)</SelectItem>
                  <SelectItem value="ambos">Ambos (Venda e Uso Interno)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Categoria *</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_PRODUTO.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Unidade de Medida</Label>
              <Select value={unidadeMedida} onValueChange={setUnidadeMedida}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="un">Unidade (un)</SelectItem>
                  <SelectItem value="pct">Pacote (pct)</SelectItem>
                  <SelectItem value="kit">Kit</SelectItem>
                  <SelectItem value="litro">Litro / Galão</SelectItem>
                  <SelectItem value="resma">Resma (500fls)</SelectItem>
                  <SelectItem value="fardo">Fardo</SelectItem>
                  <SelectItem value="cx">Caixa (cx)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Descrição / Observações</Label>
            <Textarea
              rows={2}
              placeholder="Detalhes sobre tecido, especificações ou instruções de uso..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          {/* Toggle de Variações de Tamanho */}
          <div className="p-3.5 bg-slate-50 border rounded-lg flex items-center justify-between">
            <div>
              <span className="font-semibold text-sm block text-slate-800">
                Possui Variações de Tamanho / Cor?
              </span>
              <p className="text-xs text-muted-foreground">
                Ative para controlar estoque separado por tamanho (ex: 4, 6, 8, P, M, G).
              </p>
            </div>
            <Switch checked={temVariacoes} onCheckedChange={setTemVariacoes} />
          </div>

          {/* Se SEM variações */}
          {!temVariacoes && (
            <div className="p-4 bg-white border rounded-lg space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Estoque e Valores Unitários
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Qtd em Estoque</Label>
                  <Input
                    type="number"
                    min="0"
                    value={quantidadeEstoque}
                    onChange={(e) => setQuantidadeEstoque(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Estoque Mínimo</Label>
                  <Input
                    type="number"
                    min="0"
                    value={estoqueMinimo}
                    onChange={(e) => setEstoqueMinimo(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Preço de Custo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={precoCusto}
                    onChange={(e) => setPrecoCusto(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                {destino !== 'consumo_interno' && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs text-emerald-800 font-semibold">À Vista (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={precoVenda}
                        onChange={(e) => setPrecoVenda(e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-blue-800 font-semibold">No Crédito (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={precoVendaCredito}
                        onChange={(e) => setPrecoVendaCredito(e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Se COM variações */}
          {temVariacoes && (
            <div className="p-4 bg-white border rounded-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-primary" /> Grade de Tamanhos & Variações
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Defina estoque, preço à vista e preço no crédito para cada variação.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1 text-slate-600"
                    onClick={() => handleApplyPreset(PRESET_INFANTIL)}
                  >
                    <Sparkles className="h-3 w-3 text-amber-500" /> + Infantil (2 ao 16)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1 text-slate-600"
                    onClick={() => handleApplyPreset(PRESET_ADULTO)}
                  >
                    <Sparkles className="h-3 w-3 text-blue-500" /> + Adulto (PP ao XG)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-[11px] gap-1"
                    onClick={() => handleAddVariacao()}
                  >
                    <Plus className="h-3 w-3" /> Adicionar
                  </Button>
                </div>
              </div>

              {variacoes.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground italic border-2 border-dashed rounded">
                  Nenhum tamanho adicionado. Clique em uma das opções acima para preencher rapidamente.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {variacoes.map((v, idx) => (
                    <div
                      key={v.id}
                      className="grid grid-cols-12 gap-1.5 items-center p-2 bg-slate-50 rounded border text-xs"
                    >
                      <div className="col-span-2">
                        <Label className="text-[10px] text-slate-500">Tamanho</Label>
                        <Input
                          className="h-7 text-xs font-medium"
                          value={v.nome}
                          onChange={(e) => handleUpdateVariacao(v.id, 'nome', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-[10px] text-slate-500">Estoque</Label>
                        <Input
                          type="number"
                          min="0"
                          className="h-7 text-xs"
                          value={v.quantidadeEstoque}
                          onChange={(e) =>
                            handleUpdateVariacao(v.id, 'quantidadeEstoque', Number(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="col-span-1">
                        <Label className="text-[10px] text-slate-500">Mín.</Label>
                        <Input
                          type="number"
                          min="0"
                          className="h-7 text-xs"
                          value={v.estoqueMinimo}
                          onChange={(e) =>
                            handleUpdateVariacao(v.id, 'estoqueMinimo', Number(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-[10px] text-slate-500">Custo</Label>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-7 text-xs"
                          value={v.precoCusto}
                          onChange={(e) =>
                            handleUpdateVariacao(v.id, 'precoCusto', Number(e.target.value) || 0)
                          }
                        />
                      </div>
                      {destino !== 'consumo_interno' && (
                        <>
                          <div className="col-span-2">
                            <Label className="text-[10px] text-emerald-700 font-semibold">À Vista</Label>
                            <Input
                              type="number"
                              step="0.01"
                              className="h-7 text-xs font-semibold text-emerald-700 bg-emerald-50/40"
                              value={v.precoVenda}
                              onChange={(e) =>
                                handleUpdateVariacao(v.id, 'precoVenda', Number(e.target.value) || 0)
                              }
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-[10px] text-blue-700 font-semibold">Crédito</Label>
                            <Input
                              type="number"
                              step="0.01"
                              className="h-7 text-xs font-semibold text-blue-700 bg-blue-50/40"
                              value={v.precoVendaCredito ?? ''}
                              placeholder="0.00"
                              onChange={(e) =>
                                handleUpdateVariacao(v.id, 'precoVendaCredito', Number(e.target.value) || 0)
                              }
                            />
                          </div>
                        </>
                      )}
                      <div className="col-span-1 flex justify-end pt-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveVariacao(v.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="p-4 border-t bg-slate-50 flex items-center justify-end gap-2 -mx-5 -mb-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {produtoEdicao ? 'Salvar Alterações' : 'Cadastrar Produto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
