import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  ShoppingCart,
  ArrowUpRight,
  History,
  AlertTriangle,
  Boxes,
  Plus,
  PackagePlus,
  DollarSign,
  Layers,
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  ProdutoEstoque,
  MovimentacaoEstoque,
  VendaEstoque,
  DEFAULT_ESTOQUE_PRODUTOS,
} from '@/types/estoque';
import { Lancamento } from '@/types/finance';
import { Aluno } from '@/types/aluno';
import { ProdutosVendaTab } from '@/components/estoque/ProdutosVendaTab';
import { RetiradasConsumoTab } from '@/components/estoque/RetiradasConsumoTab';
import { MovimentacoesTab } from '@/components/estoque/MovimentacoesTab';
import { NovoProdutoModal } from '@/components/estoque/NovoProdutoModal';
import { ReabastecerModal } from '@/components/estoque/ReabastecerModal';
import { RegistrarRetiradaModal } from '@/components/estoque/RegistrarRetiradaModal';
import { NovaVendaModal } from '@/components/estoque/NovaVendaModal';
import { ReciboVendaEstoqueModal } from '@/components/estoque/ReciboVendaEstoqueModal';

const INITIAL_MOVIMENTACOES: MovimentacaoEstoque[] = [
  {
    id: 'mov-init-1',
    data: '2026-09-10T14:30:00Z',
    tipo: 'saida_consumo',
    produtoId: 'prod-limp-detergente',
    produtoNome: 'Detergente Neutro Concentrado 5L',
    quantidade: 2,
    quantidadeAnterior: 16,
    quantidadeAtual: 14,
    motivo: 'Limpeza & Higiene',
    setor: 'Zeladoria / Limpeza',
    responsavelNome: 'Maria Zeladora',
    destinatario: 'Bloco A e B',
    observacoes: 'Limpeza geral dos banheiros e corredores',
  },
  {
    id: 'mov-init-2',
    data: '2026-09-11T09:15:00Z',
    tipo: 'saida_venda',
    produtoId: 'prod-farda-camiseta',
    produtoNome: 'Camiseta Manga Curta Uniforme',
    variacaoId: 'var-cam-8',
    variacaoNome: 'Tamanho 8',
    quantidade: 1,
    quantidadeAnterior: 26,
    quantidadeAtual: 25,
    motivo: 'Venda balcão (REC-2026-10492)',
    destinatario: 'Ana Clara Lima',
    valorUnitario: 45.0,
    valorTotal: 45.0,
    reciboNumero: 'REC-2026-10492',
  },
  {
    id: 'mov-init-3',
    data: '2026-09-12T16:00:00Z',
    tipo: 'reposicao',
    produtoId: 'prod-farda-camiseta',
    produtoNome: 'Camiseta Manga Curta Uniforme',
    variacaoId: 'var-cam-p',
    variacaoNome: 'Tamanho P',
    quantidade: 1,
    quantidadeAnterior: 15,
    quantidadeAtual: 14,
    motivo: 'Reposição / Troca de Avaria',
    setor: 'Secretaria / Administrativo',
    responsavelNome: 'Secretaria Escolar',
    destinatario: 'Aluno Gabriel Santos',
    observacoes: 'Troca de costura desfeita',
  },
];

export const Estoque = () => {
  const [activeTab, setActiveTab] = useState('vendas');

  const [produtos, setProdutos] = useLocalStorage<ProdutoEstoque[]>(
    'escolinha_estoque_produtos',
    DEFAULT_ESTOQUE_PRODUTOS
  );
  const [movimentacoes, setMovimentacoes] = useLocalStorage<MovimentacaoEstoque[]>(
    'escolinha_estoque_movimentacoes',
    INITIAL_MOVIMENTACOES
  );
  const [vendas, setVendas] = useLocalStorage<VendaEstoque[]>('escolinha_estoque_vendas', []);
  const [lancamentos, setLancamentos] = useLocalStorage<Lancamento[]>('escolinha_lancamentos_v2', []);
  const [alunos] = useLocalStorage<Aluno[]>('escolinha_alunos', []);
  const [employees] = useLocalStorage<any[]>('escolinha_employees', []);

  // Modais
  const [isNovoProdutoOpen, setIsNovoProdutoOpen] = useState(false);
  const [produtoEdicao, setProdutoEdicao] = useState<ProdutoEstoque | null>(null);

  const [isReabastecerOpen, setIsReabastecerOpen] = useState(false);
  const [produtoReabastecerId, setProdutoReabastecerId] = useState<string | undefined>(undefined);

  const [isRegistrarRetiradaOpen, setIsRegistrarRetiradaOpen] = useState(false);
  const [isNovaVendaOpen, setIsNovaVendaOpen] = useState(false);

  // Recibo Modal
  const [reciboModalData, setReciboModalData] = useState<{
    isOpen: boolean;
    numeroRecibo: string;
    dataEmissao?: string;
    compradorNome: string;
    compradorDocumento?: string;
    alunoNome?: string;
    turmaAluno?: string;
    itens: any[];
    valorTotal: number;
    formaPagamento: string;
    vendedorNome?: string;
    observacoes?: string;
  }>({
    isOpen: false,
    numeroRecibo: '',
    compradorNome: '',
    itens: [],
    valorTotal: 0,
    formaPagamento: 'PIX',
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // KPIs
  const kpis = useMemo(() => {
    let totalItensEstoque = 0;
    let valorTotalCusto = 0;
    let valorTotalVenda = 0;
    let itensBaixoEstoque = 0;

    produtos.forEach((p) => {
      if (p.temVariacoes && p.variacoes) {
        p.variacoes.forEach((v) => {
          totalItensEstoque += v.quantidadeEstoque;
          valorTotalCusto += v.quantidadeEstoque * (v.precoCusto || 0);
          valorTotalVenda += v.quantidadeEstoque * (v.precoVenda || 0);
          if (v.quantidadeEstoque <= v.estoqueMinimo) {
            itensBaixoEstoque++;
          }
        });
      } else {
        const q = p.quantidadeEstoque || 0;
        totalItensEstoque += q;
        valorTotalCusto += q * (p.precoCusto || 0);
        valorTotalVenda += q * (p.precoVenda || 0);
        if (q <= (p.estoqueMinimo || 5)) {
          itensBaixoEstoque++;
        }
      }
    });

    const totalRetiradasMes = movimentacoes
      .filter((m) => m.tipo === 'saida_consumo' || m.tipo === 'reposicao')
      .reduce((acc, cur) => acc + cur.quantidade, 0);

    return {
      totalItensEstoque,
      valorTotalCusto,
      valorTotalVenda,
      itensBaixoEstoque,
      totalRetiradasMes,
    };
  }, [produtos, movimentacoes]);

  // Handlers
  const handleSaveProduto = (produtoSalvo: ProdutoEstoque) => {
    setProdutos((prev) => {
      const idx = prev.findIndex((p) => p.id === produtoSalvo.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = produtoSalvo;
        return copy;
      }
      return [produtoSalvo, ...prev];
    });
    setProdutoEdicao(null);
  };

  const handleOpenEditProduto = (produto: ProdutoEstoque) => {
    setProdutoEdicao(produto);
    setIsNovoProdutoOpen(true);
  };

  const handleOpenReabastecer = (produtoId?: string) => {
    setProdutoReabastecerId(produtoId);
    setIsReabastecerOpen(true);
  };

  const handleConfirmReabastecimento = (
    produtoAtualizado: ProdutoEstoque,
    movimentacao: MovimentacaoEstoque,
    criarLancamentoFinanceiro?: {
      valor: number;
      descricao: string;
      fornecedor?: string;
    }
  ) => {
    setProdutos((prev) =>
      prev.map((p) => (p.id === produtoAtualizado.id ? produtoAtualizado : p))
    );
    setMovimentacoes((prev) => [movimentacao, ...prev]);

    if (criarLancamentoFinanceiro) {
      const novoLancamento: Lancamento = {
        id: `lanc-${Date.now()}`,
        data: new Date(),
        tipo: 'Saída',
        descricao: criarLancamentoFinanceiro.descricao,
        valor: criarLancamentoFinanceiro.valor,
        categoria: 'Operacional',
        unidade: 'Todas',
        tipoCusto: 'Variável',
        formaPagamento: 'PIX',
        status: 'Pago',
        observacoes: criarLancamentoFinanceiro.fornecedor
          ? `Fornecedor: ${criarLancamentoFinanceiro.fornecedor}`
          : undefined,
      };
      setLancamentos((prev) => [novoLancamento, ...prev]);
    }
  };

  const handleConfirmRetirada = (
    produtoAtualizado: ProdutoEstoque,
    movimentacao: MovimentacaoEstoque
  ) => {
    setProdutos((prev) =>
      prev.map((p) => (p.id === produtoAtualizado.id ? produtoAtualizado : p))
    );
    setMovimentacoes((prev) => [movimentacao, ...prev]);
  };

  const handleConfirmVenda = (
    produtosAtualizados: ProdutoEstoque[],
    novasMovimentacoes: MovimentacaoEstoque[],
    novaVenda: VendaEstoque,
    criarLancamentoFinanceiro?: {
      valor: number;
      descricao: string;
      formaPagamento: any;
      alunoId?: string;
    }
  ) => {
    setProdutos(produtosAtualizados);
    setMovimentacoes((prev) => [...novasMovimentacoes, ...prev]);
    setVendas((prev) => [novaVenda, ...prev]);

    if (criarLancamentoFinanceiro) {
      const novoLancamento: Lancamento = {
        id: `lanc-${Date.now()}`,
        data: new Date(),
        tipo: 'Entrada',
        descricao: criarLancamentoFinanceiro.descricao,
        valor: criarLancamentoFinanceiro.valor,
        categoria: 'Fardamento / Estoque',
        unidade: 'Todas',
        tipoCusto: 'Variável',
        formaPagamento: criarLancamentoFinanceiro.formaPagamento,
        status: 'Pago',
        alunoId: criarLancamentoFinanceiro.alunoId,
        reciboNumero: novaVenda.numeroRecibo,
        itensEstoque: novaVenda.itens,
      };
      setLancamentos((prev) => [novoLancamento, ...prev]);
    }

    // Abre imediatamente o recibo para impressão
    const aluno = alunos.find((a) => a.id === novaVenda.alunoId);

    setReciboModalData({
      isOpen: true,
      numeroRecibo: novaVenda.numeroRecibo,
      dataEmissao: new Date(novaVenda.data).toLocaleString('pt-BR'),
      compradorNome: novaVenda.compradorNome,
      compradorDocumento: novaVenda.compradorDocumento,
      alunoNome: aluno?.nome || novaVenda.compradorNome,
      turmaAluno: novaVenda.turmaAluno,
      itens: novaVenda.itens,
      valorTotal: novaVenda.valorTotal,
      formaPagamento: novaVenda.formaPagamento,
      vendedorNome: novaVenda.vendedorNome,
    });
  };

  const handleReimprimirRecibo = (mov: MovimentacaoEstoque) => {
    if (!mov.reciboNumero) return;
    const venda = vendas.find((v) => v.numeroRecibo === mov.reciboNumero);
    const aluno = venda?.alunoId ? alunos.find((a) => a.id === venda.alunoId) : null;

    if (venda) {
      setReciboModalData({
        isOpen: true,
        numeroRecibo: venda.numeroRecibo,
        dataEmissao: new Date(venda.data).toLocaleString('pt-BR'),
        compradorNome: venda.compradorNome,
        compradorDocumento: venda.compradorDocumento,
        alunoNome: aluno?.nome || venda.compradorNome,
        turmaAluno: venda.turmaAluno,
        itens: venda.itens,
        valorTotal: venda.valorTotal,
        formaPagamento: venda.formaPagamento,
        vendedorNome: venda.vendedorNome,
        observacoes: venda.observacoes,
      });
    } else {
      // Cria recibo avulso a partir da movimentação
      setReciboModalData({
        isOpen: true,
        numeroRecibo: mov.reciboNumero,
        dataEmissao: new Date(mov.data).toLocaleString('pt-BR'),
        compradorNome: mov.destinatario || 'Consumidor',
        alunoNome: mov.destinatario || 'Consumidor',
        itens: [
          {
            produtoId: mov.produtoId,
            produtoNome: mov.produtoNome,
            variacaoNome: mov.variacaoNome,
            quantidade: mov.quantidade,
            precoUnitario: mov.valorUnitario || 0,
            subtotal: mov.valorTotal || 0,
          },
        ],
        valorTotal: mov.valorTotal || 0,
        formaPagamento: 'PIX',
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Estoque"
        description="Controle de produtos para venda, retiradas para limpeza e consumo interno com emissão de recibos"
      >
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsNovaVendaOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold shadow-sm"
          >
            <ShoppingCart className="h-4 w-4" />
            Nova Venda
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsRegistrarRetiradaOpen(true)}
            className="gap-2 border-amber-300 text-amber-900 hover:bg-amber-50"
          >
            <ArrowUpRight className="h-4 w-4 text-amber-600" />
            Registrar Retirada
          </Button>
        </div>
      </PageHeader>

      {/* CARDS DE INDICADORES (KPIS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-slate-50 to-white">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase">
              Total de Itens em Estoque
            </CardTitle>
            <Boxes className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-slate-900">
              {kpis.totalItensEstoque} <span className="text-sm font-normal text-slate-500">unidades</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Distribuição em {produtos.length} produtos cadastrados
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-emerald-800 uppercase">
              Valor do Estoque (Custo)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-emerald-900">
              {formatCurrency(kpis.valorTotalCusto)}
            </div>
            <p className="text-[11px] text-emerald-700 mt-1">
              Previsão de venda: <strong>{formatCurrency(kpis.valorTotalVenda)}</strong>
            </p>
          </CardContent>
        </Card>

        <Card
          className={`border shadow-sm bg-gradient-to-br ${
            kpis.itensBaixoEstoque > 0
              ? 'from-amber-50/70 to-white border-amber-200'
              : 'from-slate-50 to-white border-slate-200'
          }`}
        >
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-amber-800 uppercase">
              Estoque Mínimo / Alerta
            </CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${
                kpis.itensBaixoEstoque > 0 ? 'text-amber-600' : 'text-slate-400'
              }`}
            />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div
              className={`text-2xl font-bold ${
                kpis.itensBaixoEstoque > 0 ? 'text-amber-900' : 'text-slate-900'
              }`}
            >
              {kpis.itensBaixoEstoque}{' '}
              <span className="text-sm font-normal text-slate-500">variações críticas</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {kpis.itensBaixoEstoque > 0
                ? 'Necessitam de reabastecimento'
                : 'Todos os itens com níveis seguros'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-blue-50/40 to-white">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-blue-800 uppercase">
              Retiradas de Consumo
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-blue-950">
              {kpis.totalRetiradasMes}{' '}
              <span className="text-sm font-normal text-slate-500">itens retirados</span>
            </div>
            <p className="text-[11px] text-blue-700 mt-1">Limpeza, escritório e reposições</p>
          </CardContent>
        </Card>
      </div>

      {/* ABAS DO MÓDULO */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="vendas" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Produtos para Venda
          </TabsTrigger>
          <TabsTrigger value="retiradas" className="gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Retiradas & Consumo Interno
          </TabsTrigger>
          <TabsTrigger value="movimentacoes" className="gap-2">
            <History className="h-4 w-4" />
            Histórico de Movimentações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="space-y-4">
          <ProdutosVendaTab
            produtos={produtos}
            onOpenNovaVenda={() => setIsNovaVendaOpen(true)}
            onOpenNovoProduto={() => {
              setProdutoEdicao(null);
              setIsNovoProdutoOpen(true);
            }}
            onOpenReabastecer={(prodId) => handleOpenReabastecer(prodId)}
            onEditProduto={handleOpenEditProduto}
          />
        </TabsContent>

        <TabsContent value="retiradas" className="space-y-4">
          <RetiradasConsumoTab
            movimentacoes={movimentacoes}
            produtos={produtos}
            onOpenRegistrarRetirada={() => setIsRegistrarRetiradaOpen(true)}
            onOpenNovoProduto={() => {
              setProdutoEdicao(null);
              setIsNovoProdutoOpen(true);
            }}
            onOpenReabastecer={() => handleOpenReabastecer()}
          />
        </TabsContent>

        <TabsContent value="movimentacoes" className="space-y-4">
          <MovimentacoesTab
            movimentacoes={movimentacoes}
            onReimprimirRecibo={handleReimprimirRecibo}
          />
        </TabsContent>
      </Tabs>

      {/* MODAIS */}
      <NovoProdutoModal
        isOpen={isNovoProdutoOpen}
        onClose={() => {
          setIsNovoProdutoOpen(false);
          setProdutoEdicao(null);
        }}
        onSaveProduto={handleSaveProduto}
        produtoEdicao={produtoEdicao}
      />

      <ReabastecerModal
        isOpen={isReabastecerOpen}
        onClose={() => {
          setIsReabastecerOpen(false);
          setProdutoReabastecerId(undefined);
        }}
        produtos={produtos}
        produtoIdInicial={produtoReabastecerId}
        onConfirmReabastecimento={handleConfirmReabastecimento}
      />

      <RegistrarRetiradaModal
        isOpen={isRegistrarRetiradaOpen}
        onClose={() => setIsRegistrarRetiradaOpen(false)}
        produtos={produtos}
        colaboradores={employees}
        onConfirmRetirada={handleConfirmRetirada}
      />

      <NovaVendaModal
        isOpen={isNovaVendaOpen}
        onClose={() => setIsNovaVendaOpen(false)}
        produtos={produtos}
        alunos={alunos}
        onConfirmVenda={handleConfirmVenda}
      />

      <ReciboVendaEstoqueModal
        isOpen={reciboModalData.isOpen}
        onClose={() => setReciboModalData((prev) => ({ ...prev, isOpen: false }))}
        numeroRecibo={reciboModalData.numeroRecibo}
        dataEmissao={reciboModalData.dataEmissao}
        compradorNome={reciboModalData.compradorNome}
        compradorDocumento={reciboModalData.compradorDocumento}
        alunoNome={reciboModalData.alunoNome}
        turmaAluno={reciboModalData.turmaAluno}
        itens={reciboModalData.itens}
        valorTotal={reciboModalData.valorTotal}
        formaPagamento={reciboModalData.formaPagamento}
        vendedorNome={reciboModalData.vendedorNome}
        observacoes={reciboModalData.observacoes}
      />
    </div>
  );
};

export default Estoque;
