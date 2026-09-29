import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Lancamento, TipoLancamento, Categoria, Unidade, FormaPagamento, Orcamento, Caixa, Cartao, TurmaConfig } from '../../types/finance';
import { Calculator, X, DollarSign, CreditCard, Landmark, Banknote, QrCode, CheckCircle2, Download, Upload, FileDown, ChevronsUpDown, Check, PackageCheck, ShoppingBag, Plus, Trash2, Printer, Layers, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn, formatDate } from '@/lib/utils';
import { ProdutoEstoque, MovimentacaoEstoque, ItemVendaEstoque, filterRealProdutos } from '@/types/estoque';
import { ReciboVendaEstoqueModal } from '@/components/estoque/ReciboVendaEstoqueModal';
import { SearchableProdutoSelect } from '@/components/estoque/SearchableProdutoSelect';
import { useSedes } from '@/hooks/useSedes';
import { usePagination } from '@/hooks/usePagination';
import { DataTablePagination } from '@/components/common/DataTablePagination';
import { PixQrCodeModal } from '@/components/financeiro/PixQrCodeModal';
import { BoletoGeradoModal } from '@/components/financeiro/BoletoGeradoModal';
import { generatePixCopiaECola, openBoletoInNewTab, getBankDisplayName, detectBankFromCaixa } from '@/utils/paymentGenerators';
import { getActiveBankingGateway, BankingGatewayId, hasCoraCredentials } from '@/services/coraService';
import { BancoEmissorId } from '@/types/finance';

interface LancamentosTabProps {
  lancamentos: Lancamento[];
  orcamentos: Orcamento[];
  caixas: Caixa[];
  cartoes: Cartao[];
  categorias: string[];
  turmas: TurmaConfig[];
  onAddLancamento: (lancamento: Omit<Lancamento, 'id'>) => void;
  onUpdateLancamento: (id: string, updates: Partial<Lancamento>) => void;
  onAddCategoria: (novaCategoria: string) => void;
  onFecharCaixa: (caixaId: string) => void;
  onImportLancamentos?: (novosLancamentos: Omit<Lancamento, 'id'>[]) => void;
}

export function LancamentosTab({ lancamentos, orcamentos, caixas, cartoes, categorias, turmas, onAddLancamento, onUpdateLancamento, onAddCategoria, onFecharCaixa, onImportLancamentos }: LancamentosTabProps) {
  const { sedes, activeSede } = useSedes();
  const [tipo, setTipo] = useState<TipoLancamento>('Entrada');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState<number | ''>('');
  const [data, setData] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('Administrativo');
  const [unidade, setUnidade] = useState<Unidade>(activeSede?.nome || 'Todas');
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<TurmaConfig[]>([]);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX');
  const [status, setStatus] = useState<'Pago' | 'Em Aberto'>('Pago');
  
  const [orcamentoId, setOrcamentoId] = useState<string>('');
  const [caixaId, setCaixaId] = useState<string>(caixas[0]?.id || '');
  const [cartaoId, setCartaoId] = useState<string>(cartoes[0]?.id || '');
  const [alunoId, setAlunoId] = useState<string>('');
  const [openAluno, setOpenAluno] = useState(false);
  const [alunos] = useLocalStorage<any[]>('escolinha_alunos', []);

  // Integração com Estoque (Apenas dados reais alocados em banco)
  const [produtos, setProdutos] = useLocalStorage<ProdutoEstoque[]>('escolinha_estoque_produtos', []);
  const [movimentacoes, setMovimentacoes] = useLocalStorage<MovimentacaoEstoque[]>('escolinha_estoque_movimentacoes', []);

  useEffect(() => {
    if (produtos && produtos.length > 0) {
      const real = filterRealProdutos(produtos);
      if (real.length !== produtos.length) {
        setProdutos(real);
      }
    }
  }, [produtos]);
  const [venderItensEstoque, setVenderItensEstoque] = useState(false);
  const [itensEstoqueVenda, setItensEstoqueVenda] = useState<{
    idTemp: string;
    produtoId: string;
    variacaoId?: string;
    quantidade: number;
    precoUnitario: number;
  }[]>([]);

  // Recibo Modal
  const [reciboModalData, setReciboModalData] = useState<{
    isOpen: boolean;
    numeroRecibo: string;
    dataEmissao?: string;
    compradorNome: string;
    compradorDocumento?: string;
    alunoNome?: string;
    turmaAluno?: string;
    itens: ItemVendaEstoque[];
    valorTotal: number;
    formaPagamento: string;
  }>({
    isOpen: false,
    numeroRecibo: '',
    compradorNome: '',
    itens: [],
    valorTotal: 0,
    formaPagamento: 'PIX',
  });

  // Modal Pix QR Code
  const [pixModalData, setPixModalData] = useState<{
    isOpen: boolean;
    valor: number;
    descricao: string;
    copiaCola: string;
    alunoNome?: string;
    responsavelNome?: string;
    instituicaoNome?: string;
  }>({
    isOpen: false,
    valor: 0,
    descricao: '',
    copiaCola: '',
  });

  // Modal Boleto Bancário & Banco do Caixa
  const [bancoEmissor, setBancoEmissor] = useState<BancoEmissorId>(() => {
    return detectBankFromCaixa(caixas[0]?.id, caixas);
  });

  const handleCaixaChange = (novoCaixaId: string) => {
    setCaixaId(novoCaixaId);
    setBancoEmissor(detectBankFromCaixa(novoCaixaId, caixas));
  };

  useEffect(() => {
    if (caixaId) {
      setBancoEmissor(detectBankFromCaixa(caixaId, caixas));
    }
  }, [caixaId, caixas]);

  const [boletoModalData, setBoletoModalData] = useState<{
    isOpen: boolean;
    valor: number;
    descricao: string;
    linhaDigitavel: string;
    barcodeNumber?: string;
    boletoUrl: string;
    vencimento?: string;
    alunoNome?: string;
    bancoNome?: string;
  }>({
    isOpen: false,
    valor: 0,
    descricao: '',
    linhaDigitavel: '',
    barcodeNumber: '',
    boletoUrl: '',
  });

  const [isFecharCaixaOpen, setIsFecharCaixaOpen] = useState(false);
  const [caixaFechamentoId, setCaixaFechamentoId] = useState<string>(caixas[0]?.id || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const paginationLancamentos = usePagination({
    items: lancamentos,
    pageSize: 30,
  });

  const handleExport = () => {
    const dataToExport = lancamentos.map(l => ({
      Data: formatDate(l.data),
      Tipo: l.tipo,
      Descricao: l.descricao,
      Valor: l.valor,
      Categoria: l.categoria,
      Unidade: l.unidade,
      'Forma de Pagamento': l.formaPagamento,
      Status: l.status
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lançamentos");
    XLSX.writeFile(workbook, "lancamentos.xlsx");
    toast.success("Planilha exportada com sucesso!");
  };

  const handleDownloadTemplate = () => {
    const templateData = [{
      Data: '15/01/2024',
      Tipo: 'Entrada',
      Descricao: 'Descrição do lançamento',
      Valor: 150.00,
      Categoria: 'Mensalidades',
      Unidade: 'Todas',
      'Forma de Pagamento': 'PIX',
      Status: 'Pago'
    }];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo");
    XLSX.writeFile(workbook, "modelo_importacao.xlsx");
    toast.success("Modelo baixado com sucesso!");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        const novosLancamentos: Omit<Lancamento, 'id'>[] = data.map(row => {
          let parsedDate = new Date();
          if (row.Data) {
            const strData = String(row.Data).trim();
            if (strData.includes('/')) {
              const parts = strData.split('/');
              if (parts.length === 3) {
                parsedDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
              }
            } else if (strData.includes('-')) {
              const parts = strData.split('T')[0].split('-');
              if (parts.length === 3) {
                parsedDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
              }
            }
          }
          
          const matchedSede = sedes.find(
            (s) => s.nome.toLowerCase() === (row.Unidade || '').toString().trim().toLowerCase()
          );

          return {
            tipo: row.Tipo === 'Saída' ? 'Saída' : 'Entrada',
            descricao: row.Descricao || 'Importado',
            valor: Number(row.Valor) || 0,
            data: parsedDate,
            categoria: categorias.includes(row.Categoria) ? row.Categoria : categorias[0],
            unidade: matchedSede ? matchedSede.nome : (row.Unidade === 'Todas' ? 'Todas' : 'Todas'),
            formaPagamento: row['Forma de Pagamento'] || 'PIX',
            status: row.Status === 'Em Aberto' ? 'Em Aberto' : 'Pago',
            tipoCusto: 'Variável',
            caixaId: caixas[0]?.id,
          };
        });

        if (onImportLancamentos && novosLancamentos.length > 0) {
          onImportLancamentos(novosLancamentos);
          toast.success(`${novosLancamentos.length} lançamentos importados com sucesso!`);
        }
      } catch (error) {
        console.error(error);
        toast.error("Erro ao importar planilha. Verifique o formato.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const produtosVenda = useMemo(() => {
    return produtos.filter((p) => p.destino === 'venda' || p.destino === 'ambos');
  }, [produtos]);

  const recalculateFromItems = (items: typeof itensEstoqueVenda) => {
    const total = items.reduce((sum, i) => sum + i.quantidade * i.precoUnitario, 0);
    setValor(total);
    const descParts = items.map((i) => {
      const p = produtosVenda.find((x) => x.id === i.produtoId);
      const v = p?.variacoes?.find((x) => x.id === i.variacaoId);
      return `${i.quantidade}x ${p?.nome || 'Item'}${v ? ` (${v.nome})` : ''}`;
    });
    setDescricao(`Venda Estoque: ${descParts.join(', ')}`);
  };

  const [tabelaPrecoEstoque, setTabelaPrecoEstoque] = useState<'a_vista' | 'credito'>('a_vista');

  const getPrecoUnitarioEstoque = (
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

  const aplicarTabelaPrecoEstoque = (novaTabela: 'a_vista' | 'credito') => {
    setTabelaPrecoEstoque(novaTabela);
    const updated = itensEstoqueVenda.map((item) => ({
      ...item,
      precoUnitario: getPrecoUnitarioEstoque(item.produtoId, item.variacaoId, novaTabela),
    }));
    setItensEstoqueVenda(updated);
    recalculateFromItems(updated);
  };

  const handleFormaPagamentoChange = (novaForma: FormaPagamento) => {
    setFormaPagamento(novaForma);
    const novaTabela = novaForma === 'Cartão' ? 'credito' : 'a_vista';
    setTabelaPrecoEstoque(novaTabela);
    if (itensEstoqueVenda.length > 0) {
      const updated = itensEstoqueVenda.map((item) => ({
        ...item,
        precoUnitario: getPrecoUnitarioEstoque(item.produtoId, item.variacaoId, novaTabela),
      }));
      setItensEstoqueVenda(updated);
      recalculateFromItems(updated);
    }
  };

  const [showDescricaoSuggestions, setShowDescricaoSuggestions] = useState(false);
  const [matchingProdutosDescricao, setMatchingProdutosDescricao] = useState<ProdutoEstoque[]>([]);
  const descricaoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (descricaoContainerRef.current && !descricaoContainerRef.current.contains(event.target as Node)) {
        setShowDescricaoSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectProdutoFromSearch = (produto: ProdutoEstoque, variacaoId?: string) => {
    setVenderItensEstoque(true);
    setCategoria('Fardamento / Estoque');

    const vId = variacaoId || (produto.temVariacoes && produto.variacoes?.length ? produto.variacoes[0].id : undefined);
    const initialTabela = formaPagamento === 'Cartão' ? 'credito' : 'a_vista';
    const preco = getPrecoUnitarioEstoque(produto.id, vId, initialTabela);

    const newItem = {
      idTemp: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      produtoId: produto.id,
      variacaoId: vId,
      quantidade: 1,
      precoUnitario: preco,
    };

    setItensEstoqueVenda([newItem]);
    recalculateFromItems([newItem]);
    setShowDescricaoSuggestions(false);
  };

  const handleDescricaoChange = (val: string) => {
    setDescricao(val);
    if (tipo !== 'Entrada') return;

    const lower = val.toLowerCase().trim();
    if (lower.length >= 2) {
      const matches = produtosVenda.filter(
        (p) =>
          p.nome.toLowerCase().includes(lower) ||
          (p.codigo && p.codigo.toLowerCase().includes(lower))
      );
      setMatchingProdutosDescricao(matches);
      setShowDescricaoSuggestions(matches.length > 0);

      // Se bater exatamente com o nome de um produto, seleciona de forma automática!
      const exactMatch = produtosVenda.find((p) => p.nome.toLowerCase().trim() === lower);
      if (exactMatch) {
        handleSelectProdutoFromSearch(exactMatch);
      }
    } else {
      setMatchingProdutosDescricao([]);
      setShowDescricaoSuggestions(false);
    }
  };

  const handleToggleVenderEstoque = (ativo: boolean) => {
    setVenderItensEstoque(ativo);
    if (ativo) {
      if (itensEstoqueVenda.length === 0 && produtosVenda.length > 0) {
        const p = produtosVenda[0];
        const v = p.temVariacoes && p.variacoes?.length ? p.variacoes[0] : null;
        const initialTabela = formaPagamento === 'Cartão' ? 'credito' : 'a_vista';
        setTabelaPrecoEstoque(initialTabela);
        const initialItem = {
          idTemp: `item-${Date.now()}`,
          produtoId: p.id,
          variacaoId: v?.id,
          quantidade: 1,
          precoUnitario: getPrecoUnitarioEstoque(p.id, v?.id, initialTabela),
        };
        const updated = [initialItem];
        setItensEstoqueVenda(updated);
        recalculateFromItems(updated);
        setCategoria('Fardamento / Estoque');
      }
    } else {
      setItensEstoqueVenda([]);
    }
  };

  const handleAddItemEstoque = () => {
    if (produtosVenda.length === 0) return;
    const p = produtosVenda[0];
    const v = p.temVariacoes && p.variacoes?.length ? p.variacoes[0] : null;
    const newItem = {
      idTemp: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      produtoId: p.id,
      variacaoId: v?.id,
      quantidade: 1,
      precoUnitario: getPrecoUnitarioEstoque(p.id, v?.id, tabelaPrecoEstoque),
    };
    const updated = [...itensEstoqueVenda, newItem];
    setItensEstoqueVenda(updated);
    recalculateFromItems(updated);
  };

  const handleUpdateItemEstoque = (
    idTemp: string,
    updates: Partial<{ produtoId: string; variacaoId?: string; quantidade: number; precoUnitario: number }>
  ) => {
    const updated = itensEstoqueVenda.map((item) => {
      if (item.idTemp !== idTemp) return item;
      const up = { ...item, ...updates };
      if (updates.produtoId && updates.produtoId !== item.produtoId) {
        const p = produtosVenda.find((x) => x.id === updates.produtoId);
        if (p?.temVariacoes && p.variacoes?.length) {
          up.variacaoId = p.variacoes[0].id;
          up.precoUnitario = getPrecoUnitarioEstoque(p.id, p.variacoes[0].id, tabelaPrecoEstoque);
        } else {
          up.variacaoId = undefined;
          up.precoUnitario = getPrecoUnitarioEstoque(updates.produtoId, undefined, tabelaPrecoEstoque);
        }
      }
      if (updates.variacaoId && updates.variacaoId !== item.variacaoId) {
        up.precoUnitario = getPrecoUnitarioEstoque(up.produtoId, updates.variacaoId, tabelaPrecoEstoque);
      }
      return up;
    });
    setItensEstoqueVenda(updated);
    recalculateFromItems(updated);
  };

  const handleRemoveItemEstoque = (idTemp: string) => {
    const updated = itensEstoqueVenda.filter((i) => i.idTemp !== idTemp);
    setItensEstoqueVenda(updated);
    if (updated.length === 0) {
      setVenderItensEstoque(false);
    } else {
      recalculateFromItems(updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao || !valor || !data) return;

    let reciboNumeroGerado: string | undefined = undefined;
    let itensEstoqueSalvos: ItemVendaEstoque[] | undefined = undefined;

    // Abate de Estoque se houver itens vinculados
    if (tipo === 'Entrada' && venderItensEstoque && itensEstoqueVenda.length > 0) {
      const produtosCopia = JSON.parse(JSON.stringify(produtos)) as ProdutoEstoque[];
      const novasMovs: MovimentacaoEstoque[] = [];
      const itensFinais: ItemVendaEstoque[] = [];
      reciboNumeroGerado = `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      const alunoObj = alunoId ? alunos.find((a) => a.id === alunoId) : null;
      const compradorNome = alunoObj?.nomeResponsavel || alunoObj?.nome || 'Consumidor Balcão';

      for (const linha of itensEstoqueVenda) {
        const prod = produtosCopia.find((p) => p.id === linha.produtoId);
        if (!prod) continue;

        let qtdAnterior = 0;
        let qtdAtual = 0;
        let varNome: string | undefined = undefined;

        if (prod.temVariacoes && prod.variacoes) {
          const vIdx = prod.variacoes.findIndex((v) => v.id === linha.variacaoId);
          if (vIdx === -1) continue;
          const vObj = prod.variacoes[vIdx];
          qtdAnterior = vObj.quantidadeEstoque;
          qtdAtual = Math.max(0, qtdAnterior - linha.quantidade);
          varNome = vObj.nome;
          prod.variacoes[vIdx].quantidadeEstoque = qtdAtual;
        } else {
          qtdAnterior = prod.quantidadeEstoque || 0;
          qtdAtual = Math.max(0, qtdAnterior - linha.quantidade);
          prod.quantidadeEstoque = qtdAtual;
        }
        prod.atualizadoEm = new Date().toISOString();

        itensFinais.push({
          produtoId: prod.id,
          produtoNome: prod.nome,
          variacaoId: linha.variacaoId,
          variacaoNome: varNome,
          quantidade: linha.quantidade,
          precoUnitario: linha.precoUnitario,
          subtotal: linha.quantidade * linha.precoUnitario,
        });

        novasMovs.push({
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
          motivo: `Venda no Financeiro (${reciboNumeroGerado})`,
          destinatario: compradorNome,
          valorUnitario: linha.precoUnitario,
          valorTotal: linha.quantidade * linha.precoUnitario,
          reciboNumero: reciboNumeroGerado,
        });
      }

      setProdutos(produtosCopia);
      setMovimentacoes((prev) => [...novasMovs, ...prev]);
      itensEstoqueSalvos = itensFinais;

      // Abre recibo
      setReciboModalData({
        isOpen: true,
        numeroRecibo: reciboNumeroGerado,
        dataEmissao: new Date().toLocaleString('pt-BR'),
        compradorNome,
        compradorDocumento: alunoObj?.cpfResponsavel || alunoObj?.cpf,
        alunoNome: alunoObj?.nome,
        turmaAluno: alunoObj?.classe ? `${alunoObj.classe} ${alunoObj.turma || ''}` : undefined,
        itens: itensFinais,
        valorTotal: Number(valor),
        formaPagamento,
      });

      toast.success(`Estoque abatido com sucesso! Recibo ${reciboNumeroGerado} emitido.`);
      setVenderItensEstoque(false);
      setItensEstoqueVenda([]);
    }

    const alunoObj = alunoId ? alunos.find((a) => a.id === alunoId) : null;
    const turmasDoAluno: TurmaConfig[] | undefined =
      alunoObj && (alunoObj.classe || alunoObj.setor)
        ? [
            {
              setor: alunoObj.setor || '',
              nome: alunoObj.classe || '',
              letras: alunoObj.turma ? [alunoObj.turma] : [],
            },
          ]
        : undefined;

    onAddLancamento({
      tipo,
      descricao,
      valor: Number(valor),
      data: new Date(data + 'T12:00:00'),
      categoria,
      unidade,
      turmas: turmasDoAluno,
      formaPagamento,
      status,
      caixaId: formaPagamento !== 'Cartão' ? caixaId : undefined,
      cartaoId: formaPagamento === 'Cartão' ? cartaoId : undefined,
      tipoCusto: 'Variável',
      orcamentoId: tipo === 'Saída' && orcamentoId ? orcamentoId : undefined,
      alunoId: tipo === 'Entrada' && alunoId ? alunoId : undefined,
      itensEstoque: itensEstoqueSalvos,
      reciboNumero: reciboNumeroGerado,
      bancoEmissor: formaPagamento === 'Boleto' ? bancoEmissor : undefined,
    });

    // Se for Entrada com PIX ou Boleto, gera o QR Code / Boleto
    if (tipo === 'Entrada') {
      const valorNum = Number(valor);
      const instituicaoNome = activeSede?.nome || (unidade !== 'Todas' ? unidade : 'Escola Interagir');

      if (formaPagamento === 'PIX') {
        const copiaCola = generatePixCopiaECola({
          valor: valorNum,
          descricao,
          beneficiarioNome: instituicaoNome,
          pagadorNome: alunoObj?.nomeResponsavel || alunoObj?.nome,
          pagadorCpfCnpj: alunoObj?.cpfResponsavel || alunoObj?.cpf,
        });

        setPixModalData({
          isOpen: true,
          valor: valorNum,
          descricao,
          copiaCola,
          alunoNome: alunoObj?.nome,
          responsavelNome: alunoObj?.nomeResponsavel,
          instituicaoNome,
        });

        toast.success('Entrada registrada com sucesso! QR Code PIX gerado.');
      } else if (formaPagamento === 'Boleto') {
        const boletoResult = openBoletoInNewTab({
          valor: valorNum,
          descricao,
          vencimento: data,
          beneficiarioNome: instituicaoNome,
          beneficiarioEndereco: activeSede?.endereco,
          pagadorNome: alunoObj?.nomeResponsavel || alunoObj?.nome,
          pagadorCpfCnpj: alunoObj?.cpfResponsavel || alunoObj?.cpf,
          pagadorEndereco: alunoObj?.endereco,
          gatewayId: bancoEmissor,
        });

        setBoletoModalData({
          isOpen: true,
          valor: valorNum,
          descricao,
          linhaDigitavel: boletoResult.linhaDigitavel,
          barcodeNumber: boletoResult.barcodeNumber,
          boletoUrl: boletoResult.url,
          alunoNome: alunoObj?.nome,
          bancoNome: getBankDisplayName(bancoEmissor),
        });

        if (boletoResult.opened) {
          toast.success(`Entrada registrada! Boleto ${getBankDisplayName(bancoEmissor)} aberto em nova aba do Chrome.`);
        } else {
          toast.info(`Boleto ${getBankDisplayName(bancoEmissor)} gerado! Clique para visualizar.`);
        }
      }
    }

    setDescricao('');
    setValor('');
    setOrcamentoId('');
    setAlunoId('');
    setTurmasSelecionadas([]);
    setShowDescricaoSuggestions(false);
  };

  const handleQuitar = (id: string) => {
    onUpdateLancamento(id, { status: 'Pago', data: new Date() });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const resumoCaixa = useMemo(() => {
    // Lançamentos pagos, do caixa selecionado (ou todos), que NÃO são de cartão, e que AINDA NÃO FORAM FECHADOS
    const lancamentosNaoFechados = lancamentos.filter(
      l => l.status === 'Pago' && 
           l.formaPagamento !== 'Cartão' &&
           (caixaFechamentoId === 'todos' || l.caixaId === caixaFechamentoId) &&
           !l.fechado
    );

    let entradas = 0;
    let saidas = 0;
    const porFormaPagamento: Record<string, number> = {
      'PIX': 0, 'Dinheiro': 0, 'Boleto': 0, 'Transferência Bancária': 0
    };

    lancamentosNaoFechados.forEach(l => {
      if (l.tipo === 'Entrada') {
        entradas += l.valor;
        if (porFormaPagamento[l.formaPagamento] !== undefined) {
          porFormaPagamento[l.formaPagamento] += l.valor;
        }
      } else {
        saidas += l.valor;
        if (porFormaPagamento[l.formaPagamento] !== undefined) {
          porFormaPagamento[l.formaPagamento] -= l.valor;
        }
      }
    });

    return { entradas, saidas, saldo: entradas - saidas, porFormaPagamento };
  }, [lancamentos, caixaFechamentoId]);

  const getFormaPagamentoIcon = (forma: FormaPagamento) => {
    switch (forma) {
      case 'PIX': return <QrCode size={14} className="mr-1" />;
      case 'Dinheiro': return <Banknote size={14} className="mr-1" />;
      case 'Cartão': return <CreditCard size={14} className="mr-1" />;
      case 'Transferência Bancária': return <Landmark size={14} className="mr-1" />;
      case 'Boleto': return <DollarSign size={14} className="mr-1" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 relative">
      
      <div className="flex justify-end gap-2">
        <input 
          type="file" 
          accept=".xlsx, .xls" 
          ref={fileInputRef} 
          onChange={handleImport} 
          className="hidden" 
        />
        <button 
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-indigo-600 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
          title="Baixar planilha de exemplo para importação"
        >
          <FileDown size={18} />
          Baixar Modelo
        </button>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
        >
          <Upload size={18} />
          Importar
        </button>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
        >
          <Download size={18} />
          Exportar
        </button>
        <button 
          onClick={() => setIsFecharCaixaOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow transition-colors"
        >
          <Calculator size={18} />
          Fechar Caixa
        </button>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Novo Lançamento</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select 
              value={tipo} 
              onChange={(e) => setTipo(e.target.value as TipoLancamento)}
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="Entrada">Entrada</option>
              <option value="Saída">Saída</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Data</label>
            <input 
              type="date" 
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            />
          </div>

          <div className="flex flex-col lg:col-span-2 relative" ref={descricaoContainerRef}>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-gray-700">Descrição</label>
              {tipo === 'Entrada' && (
                <span className="text-[11px] text-indigo-600 font-medium flex items-center gap-1">
                  <Sparkles size={12} className="text-amber-500" />
                  Digite o produto para selecionar do estoque
                </span>
              )}
            </div>
            <input 
              type="text" 
              value={descricao}
              onChange={(e) => handleDescricaoChange(e.target.value)}
              onFocus={() => {
                if (tipo === 'Entrada' && descricao.trim().length >= 2) {
                  setShowDescricaoSuggestions(true);
                }
              }}
              placeholder={tipo === 'Entrada' ? "Ex: Camiseta Manga Curta, Mensalidade..." : "Ex: Compra de Material, Folha A4..."}
              required
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm"
            />

            {/* Sugestões de produtos do estoque ao digitar o nome */}
            {tipo === 'Entrada' && showDescricaoSuggestions && matchingProdutosDescricao.length > 0 && (
              <div className="absolute z-50 left-0 top-full mt-1 w-full bg-white border border-indigo-200 rounded-lg shadow-xl overflow-hidden divide-y divide-gray-100 max-h-60 overflow-y-auto">
                <div className="px-3 py-1.5 bg-indigo-50 text-[11px] font-semibold text-indigo-800 flex items-center justify-between">
                  <span>📦 Produtos encontrados no Estoque (clique para selecionar abaixo)</span>
                  <button
                    type="button"
                    onClick={() => setShowDescricaoSuggestions(false)}
                    className="text-gray-400 hover:text-gray-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
                {matchingProdutosDescricao.slice(0, 8).map((prod) => {
                  const estTotal = prod.temVariacoes && prod.variacoes
                    ? prod.variacoes.reduce((acc, v) => acc + v.quantidadeEstoque, 0)
                    : prod.quantidadeEstoque || 0;
                  const refVista = prod.temVariacoes && prod.variacoes?.[0]
                    ? prod.variacoes[0].precoVenda || 0
                    : prod.precoVenda || 0;
                  const refCredito = prod.temVariacoes && prod.variacoes?.[0]
                    ? prod.variacoes[0].precoVendaCredito || refVista
                    : prod.precoVendaCredito || refVista;

                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleSelectProdutoFromSearch(prod)}
                      className="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          <span>{prod.nome}</span>
                          {prod.codigo && (
                            <span className="text-[10px] font-mono text-gray-400">
                              ({prod.codigo})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {prod.temVariacoes && prod.variacoes
                            ? `Tamanhos: ${prod.variacoes.map((v) => v.nome).join(', ')}`
                            : prod.categoria}
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="font-bold text-emerald-700">
                          {formatCurrency(formaPagamento === 'Cartão' ? refCredito : refVista)}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          Estoque: {estTotal} un
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col lg:col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
            <input 
              type="number" 
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0,00"
              required
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            />
          </div>

          <div className="flex flex-col lg:col-span-2">
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-gray-700">Categoria</label>
              <button 
                type="button" 
                onClick={() => {
                  const nova = prompt('Digite o nome da nova categoria:');
                  if (nova && nova.trim()) {
                    onAddCategoria(nova.trim());
                    setCategoria(nova.trim());
                  }
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                + Nova Categoria
              </button>
            </div>
            <select 
              value={categoria} 
              onChange={(e) => setCategoria(e.target.value)}
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col lg:col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-1">Sede / Unidade</label>
            <select 
              value={unidade} 
              onChange={(e) => setUnidade(e.target.value as Unidade)}
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm"
            >
              <option value="Todas">Todas as Sedes</option>
              {sedes.filter((s) => s.is_ativa !== false).map((s) => (
                <option key={s.id} value={s.nome}>
                  {s.nome} ({s.tipo})
                </option>
              ))}
            </select>
          </div>

          {tipo === 'Entrada' && (
            <div className="flex flex-col lg:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1">Aluno (Opcional)</label>
              <Popover open={openAluno} onOpenChange={setOpenAluno}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white p-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <span className="truncate">
                      {alunoId 
                        ? alunos.find((a) => a.id === alunoId)?.nome 
                        : 'Pesquisar aluno...'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] lg:w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar aluno..." />
                    <CommandList>
                      <CommandEmpty>Nenhum aluno encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                           value="nenhum-limpar"
                           onSelect={() => {
                             setAlunoId('');
                             setOpenAluno(false);
                           }}
                        >
                           <Check className={cn("mr-2 h-4 w-4", !alunoId ? "opacity-100" : "opacity-0")} />
                           Nenhum (Limpar)
                        </CommandItem>
                        {alunos.map((aluno) => (
                          <CommandItem
                            key={aluno.id}
                            value={aluno.nome}
                            onSelect={() => {
                              setAlunoId(aluno.id);
                              setOpenAluno(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                alunoId === aluno.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {aluno.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {alunoId && (() => {
                const a = alunos.find((x) => x.id === alunoId);
                if (!a) return null;
                return (
                  <div className="mt-1.5 p-2 bg-indigo-50 border border-indigo-200 rounded text-xs text-indigo-900 flex items-center justify-between shadow-sm">
                    <span>
                      Turma vinculada: <strong>{a.classe || 'Sem classe'} {a.turma ? `(${a.turma})` : ''}</strong> {a.setor ? `• ${a.setor}` : ''}
                    </span>
                    {a.nomeResponsavel && (
                      <span className="text-gray-500 text-[11px]">
                        Resp: {a.nomeResponsavel}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Forma de Pgto.</label>
            <select 
              value={formaPagamento} 
              onChange={(e) => handleFormaPagamentoChange(e.target.value as FormaPagamento)}
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="PIX">PIX</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Cartão">Cartão</option>
              <option value="Boleto">Boleto</option>
              <option value="Transferência Bancária">Transferência Bancária</option>
            </select>
          </div>

          {formaPagamento === 'Cartão' ? (
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Qual Cartão?</label>
              <select 
                value={cartaoId} 
                onChange={(e) => setCartaoId(e.target.value)}
                className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          ) : (
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Qual Caixa?</label>
              <select 
                value={caixaId} 
                onChange={(e) => handleCaixaChange(e.target.value)}
                className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                {caixas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              {(() => {
                const selectedCaixa = caixas.find(c => c.id === caixaId);
                const caixaNome = (selectedCaixa?.nome || '').toLowerCase();
                const isCoraCaixa = caixaNome.includes('cora') || caixaNome.includes('403');
                if (isCoraCaixa && !hasCoraCredentials()) {
                  return (
                    <span className="text-[11px] text-amber-700 mt-1 font-medium bg-amber-50 border border-amber-200 p-1.5 rounded">
                      ⚠️ O Banco Cora só pode ser integrado com credenciais cadastradas. O boleto será emitido por {getBankDisplayName(bancoEmissor)}.
                    </span>
                  );
                }
                return null;
              })()}
            </div>
          )}

          {formaPagamento === 'Boleto' && (
            <div className="flex flex-col">
              <label className="text-sm font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Landmark className="h-4 w-4 text-indigo-600" />
                  Banco do Boleto (Do Caixa Selecionado)
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Automático pelo Caixa
                </span>
              </label>
              <select 
                value={bancoEmissor} 
                onChange={(e) => {
                  const val = e.target.value as BancoEmissorId;
                  if (val === 'cora' && !hasCoraCredentials()) {
                    toast.error('O Banco Cora só pode ser integrado quando a escola envia as credenciais de API!');
                    return;
                  }
                  setBancoEmissor(val);
                }}
                className="p-2 border-2 border-indigo-200 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-indigo-50/50 font-bold text-xs text-indigo-900 shadow-xs"
              >
                <option value="bb">Banco do Brasil (001-9)</option>
                <option value="sicoob">Banco Sicoob (756-0)</option>
                <option value="bradesco">Banco Bradesco (237-2)</option>
                <option value="itau">Banco Itaú (341-7)</option>
                <option value="santander">Banco Santander (033-7)</option>
                <option value="caixa_gov">Caixa Econômica (104-0)</option>
                <option value="asaas">Asaas Bank (461 / 001)</option>
                <option value="inter">Banco Inter (077-9)</option>
                <option value="nubank">Nubank (260)</option>
                {hasCoraCredentials() ? (
                  <option value="cora">Banco Cora (403-9) - Credenciado</option>
                ) : (
                  <option value="cora" disabled>
                    Banco Cora (403-9) - Requer Credenciais
                  </option>
                )}
              </select>
              <span className="text-[11px] text-slate-500 mt-1">
                Boleto emitido para a conta/caixa: <strong>{caixas.find(c => c.id === caixaId)?.nome || 'Caixa'}</strong>
              </span>
            </div>
          )}

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Status</label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value as 'Pago' | 'Em Aberto')}
              className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="Pago">Pago</option>
              <option value="Em Aberto">Em Aberto</option>
            </select>
          </div>

          {tipo === 'Saída' && (
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Orçamento (Opcional)</label>
              <select 
                value={orcamentoId} 
                onChange={(e) => setOrcamentoId(e.target.value)}
                className="p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="">Nenhum</option>
                {orcamentos.map(orc => (
                  <option key={orc.id} value={orc.id}>{orc.nome}</option>
                ))}
              </select>
            </div>
          )}

          {tipo === 'Entrada' && (
            <div className="col-span-full bg-white p-4 rounded-lg border border-indigo-200 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chkEstoque"
                    checked={venderItensEstoque}
                    onChange={(e) => handleToggleVenderEstoque(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="chkEstoque" className="text-sm font-bold text-gray-800 cursor-pointer flex items-center gap-1.5 select-none">
                    <ShoppingBag className="h-4 w-4 text-indigo-600" />
                    Vincular a Itens do Estoque (Abater Estoque automaticamente & Gerar Recibo)
                  </label>
                </div>
                {venderItensEstoque && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-md border bg-gray-100 p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => aplicarTabelaPrecoEstoque('a_vista')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                          tabelaPrecoEstoque === 'a_vista'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        ⚡ À Vista (Dinheiro/PIX)
                      </button>
                      <button
                        type="button"
                        onClick={() => aplicarTabelaPrecoEstoque('credito')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                          tabelaPrecoEstoque === 'credito'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        💳 No Crédito (Cartão)
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddItemEstoque}
                      className="inline-flex items-center gap-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded font-semibold border border-indigo-200 transition-colors"
                    >
                      <Plus size={14} /> Adicionar outro item/tamanho
                    </button>
                  </div>
                )}
              </div>

              {venderItensEstoque && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Selecione os produtos e suas respectivas variações de tamanho para venda. O valor total e a descrição serão calculados automaticamente conforme a tabela de preço selecionada (À Vista ou No Crédito).
                  </p>

                  {itensEstoqueVenda.map((linha) => {
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
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 bg-gray-50 rounded border border-gray-200 text-xs"
                      >
                        <div className={prod?.temVariacoes ? 'sm:col-span-5' : 'sm:col-span-7'}>
                          <label className="text-[10px] text-gray-500 block mb-0.5">Produto (digite para buscar)</label>
                          <SearchableProdutoSelect
                            produtos={produtosVenda}
                            value={linha.produtoId}
                            onChange={(novoId) => handleUpdateItemEstoque(linha.idTemp, { produtoId: novoId })}
                          />
                        </div>

                        {prod?.temVariacoes && prod.variacoes && (
                          <div className="sm:col-span-2">
                            <label className="text-[10px] text-gray-500 block mb-0.5">Tamanho / Variação</label>
                            <select
                              value={linha.variacaoId}
                              onChange={(e) => handleUpdateItemEstoque(linha.idTemp, { variacaoId: e.target.value })}
                              className="w-full p-1.5 border border-gray-300 rounded bg-white font-semibold text-indigo-700"
                            >
                              {prod.variacoes.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.nome} (Disp: {v.quantidadeEstoque})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-gray-500 block mb-0.5">Qtd (Disp: {estDisponivel})</label>
                          <input
                            type="number"
                            min="1"
                            max={estDisponivel || 1}
                            value={linha.quantidade}
                            onChange={(e) =>
                              handleUpdateItemEstoque(linha.idTemp, {
                                quantidade: Number(e.target.value) || 1,
                              })
                            }
                            className="w-full p-1.5 border border-gray-300 rounded bg-white font-bold"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="text-[10px] text-gray-500 block">Preço Unit. (R$)</label>
                            <span
                              className={`text-[9px] font-bold px-1 rounded ${
                                tabelaPrecoEstoque === 'credito'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {tabelaPrecoEstoque === 'credito' ? 'Crédito' : 'À vista'}
                            </span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            value={linha.precoUnitario}
                            onChange={(e) =>
                              handleUpdateItemEstoque(linha.idTemp, {
                                precoUnitario: Number(e.target.value) || 0,
                              })
                            }
                            className="w-full p-1.5 border border-gray-300 rounded bg-white font-semibold text-emerald-700"
                          />
                          <div className="text-[9px] text-gray-400 mt-0.5 truncate" title={`À vista: R$ ${refVista.toFixed(2)} | Crédito: R$ ${refCredito.toFixed(2)}`}>
                            V: R$ {refVista.toFixed(2)} | C: R$ {refCredito.toFixed(2)}
                          </div>
                        </div>

                        <div className="sm:col-span-1 flex justify-end pt-2 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemEstoque(linha.idTemp)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Remover item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="col-span-full mt-2">
            <button 
              type="submit" 
              className={`px-4 py-2 text-white font-medium rounded shadow-sm transition-colors ${
                tipo === 'Entrada' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              Registrar {tipo}
            </button>
          </div>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-3 text-gray-800">Histórico de Lançamentos</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
              <tr>
                <th className="py-3 px-4 text-left">Data</th>
                <th className="py-3 px-4 text-left">Descrição</th>
                <th className="py-3 px-4 text-left">Categoria</th>
                <th className="py-3 px-4 text-left">Caixa/Cartão</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700 divide-y divide-gray-200">
              {lancamentos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-gray-500">Nenhum lançamento registrado.</td>
                </tr>
              ) : (
                paginationLancamentos.paginatedItems.map((lanc) => (
                  <tr key={lanc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">{formatDate(lanc.data)}</td>
                    <td className="py-3 px-4">
                      {lanc.descricao}
                      {lanc.orcamentoId && (
                        <span className="ml-2 text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                          {orcamentos.find(o => o.id === lanc.orcamentoId)?.nome}
                        </span>
                      )}
                      {lanc.alunoId && (
                        <span className="ml-2 text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          {alunos.find((a: any) => a.id === lanc.alunoId)?.nome || 'Aluno Removido'}
                        </span>
                      )}
                      {lanc.turmas && lanc.turmas.map(t => (
                        <span key={`${t.setor}-${t.nome}`} className="ml-2 inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full mt-1">
                          {t.nome === '' ? (
                            <span className="font-bold">{t.setor}</span>
                          ) : (
                            <>
                              <span className="opacity-50">{t.setor ? `${t.setor} > ` : ''}</span>
                              <span className="font-bold">{t.nome}</span> {t.letras.length > 0 && `(${t.letras.join(', ')})`}
                            </>
                          )}
                        </span>
                      ))}
                      {lanc.unidade && lanc.unidade !== 'Todas' && (
                        <span className="ml-2 inline-flex items-center gap-0.5 text-xs bg-purple-50 text-[#6b26d9] border border-purple-200 px-2 py-0.5 rounded-full font-medium">
                          📍 {lanc.unidade}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs">{lanc.categoria}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="flex items-center text-xs text-gray-700 font-medium">
                          {getFormaPagamentoIcon(lanc.formaPagamento)}
                          {lanc.formaPagamento === 'Cartão' 
                            ? cartoes.find(c => c.id === lanc.cartaoId)?.nome || 'Cartão'
                            : caixas.find(c => c.id === lanc.caixaId)?.nome || 'Caixa'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        lanc.status === 'Pago' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {lanc.status}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${
                      lanc.tipo === 'Entrada' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {lanc.tipo === 'Entrada' ? '+' : '-'}{formatCurrency(lanc.valor)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {lanc.status === 'Em Aberto' && (
                          <button
                            onClick={() => handleQuitar(lanc.id)}
                            className="inline-flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium border border-green-200 transition-colors"
                            title="Marcar como pago (hoje)"
                          >
                            <CheckCircle2 size={14} /> Quitar
                          </button>
                        )}
                        {(lanc.reciboNumero || (lanc.itensEstoque && lanc.itensEstoque.length > 0)) && (
                          <button
                            onClick={() => {
                              const aluno = alunos.find((a) => a.id === lanc.alunoId);
                              setReciboModalData({
                                isOpen: true,
                                numeroRecibo: lanc.reciboNumero || `REC-${lanc.id.slice(0, 6)}`,
                                dataEmissao: formatDate(lanc.data),
                                compradorNome: aluno?.nomeResponsavel || aluno?.nome || 'Consumidor Balcão',
                                compradorDocumento: aluno?.cpfResponsavel || aluno?.cpf,
                                alunoNome: aluno?.nome,
                                turmaAluno: aluno?.classe ? `${aluno.classe} ${aluno.turma || ''}` : undefined,
                                itens: lanc.itensEstoque || [
                                  {
                                    produtoId: 'prod-geral',
                                    produtoNome: lanc.descricao,
                                    quantidade: 1,
                                    precoUnitario: lanc.valor,
                                    subtotal: lanc.valor,
                                  },
                                ],
                                valorTotal: lanc.valor,
                                formaPagamento: lanc.formaPagamento,
                              });
                            }}
                            className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-medium border border-indigo-200 transition-colors"
                            title="Imprimir Recibo da Venda"
                          >
                            <Printer size={13} /> Recibo
                          </button>
                        )}
                        {lanc.tipo === 'Entrada' && lanc.formaPagamento === 'PIX' && (
                          <button
                            onClick={() => {
                              const aluno = alunos.find((a: any) => a.id === lanc.alunoId);
                              const instituicao = lanc.unidade !== 'Todas' ? lanc.unidade : (activeSede?.nome || 'Escola Interagir');
                              const copiaCola = generatePixCopiaECola({
                                valor: lanc.valor,
                                descricao: lanc.descricao,
                                beneficiarioNome: instituicao,
                                pagadorNome: aluno?.nomeResponsavel || aluno?.nome,
                                pagadorCpfCnpj: aluno?.cpfResponsavel || aluno?.cpf,
                              });
                              setPixModalData({
                                isOpen: true,
                                valor: lanc.valor,
                                descricao: lanc.descricao,
                                copiaCola,
                                alunoNome: aluno?.nome,
                                responsavelNome: aluno?.nomeResponsavel,
                                instituicaoNome: instituicao,
                              });
                            }}
                            className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-medium border border-emerald-200 transition-colors"
                            title="Ver QR Code Pix"
                          >
                            <QrCode size={13} /> Pix
                          </button>
                        )}
                        {lanc.tipo === 'Entrada' && lanc.formaPagamento === 'Boleto' && (
                          <button
                            onClick={() => {
                              const aluno = alunos.find((a: any) => a.id === lanc.alunoId);
                              const instituicao = lanc.unidade !== 'Todas' ? lanc.unidade : (activeSede?.nome || 'Escola Interagir');
                              const bEmissor = lanc.bancoEmissor || detectBankFromCaixa(lanc.caixaId, caixas);
                              const boletoResult = openBoletoInNewTab({
                                valor: lanc.valor,
                                descricao: lanc.descricao,
                                vencimento: lanc.data,
                                beneficiarioNome: instituicao,
                                beneficiarioEndereco: activeSede?.endereco,
                                pagadorNome: aluno?.nomeResponsavel || aluno?.nome,
                                pagadorCpfCnpj: aluno?.cpfResponsavel || aluno?.cpf,
                                pagadorEndereco: aluno?.endereco,
                                gatewayId: bEmissor,
                              });
                              setBoletoModalData({
                                isOpen: true,
                                valor: lanc.valor,
                                descricao: lanc.descricao,
                                linhaDigitavel: boletoResult.linhaDigitavel,
                                barcodeNumber: boletoResult.barcodeNumber,
                                boletoUrl: boletoResult.url,
                                alunoNome: aluno?.nome,
                                bancoNome: getBankDisplayName(bEmissor),
                              });
                            }}
                            className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium border border-blue-200 transition-colors"
                            title="Abrir Boleto em nova aba"
                          >
                            <FileDown size={13} /> Boleto
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <DataTablePagination
          currentPage={paginationLancamentos.currentPage}
          totalPages={paginationLancamentos.totalPages}
          totalItems={paginationLancamentos.totalItems}
          startIndex={paginationLancamentos.startIndex}
          endIndex={paginationLancamentos.endIndex}
          itemsPerPage={paginationLancamentos.itemsPerPage}
          onPageChange={paginationLancamentos.goToPage}
          onItemsPerPageChange={paginationLancamentos.setItemsPerPage}
          itemName="lançamentos"
        />
      </div>

      {/* Modal Fechar Caixa */}
      {isFecharCaixaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calculator className="text-indigo-600" />
                Fechamento de Caixa
              </h2>
              <button 
                onClick={() => setIsFecharCaixaOpen(false)}
                className="text-gray-400 hover:bg-gray-100 hover:text-gray-600 p-1 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              
              <div className="flex flex-col">
                <label className="text-sm font-bold text-gray-700 mb-2">Selecione o Caixa para Conferência:</label>
                <select 
                  value={caixaFechamentoId} 
                  onChange={(e) => setCaixaFechamentoId(e.target.value)}
                  className="p-2 border border-gray-300 rounded font-medium text-indigo-700 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                >
                  <option value="todos">Todos os Caixas</option>
                  {caixas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <span className="text-sm font-medium text-green-800 mb-1 block">Entradas (Acumulado)</span>
                  <span className="text-2xl font-bold text-green-700">{formatCurrency(resumoCaixa.entradas)}</span>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                  <span className="text-sm font-medium text-red-800 mb-1 block">Saídas (Acumulado)</span>
                  <span className="text-2xl font-bold text-red-700">{formatCurrency(resumoCaixa.saidas)}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Saldo a Consolidar</span>
                  <span className={`text-xl font-bold ${resumoCaixa.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(resumoCaixa.saldo)}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">Valores Movimentados</h3>
                <ul className="space-y-2">
                  {Object.entries(resumoCaixa.porFormaPagamento).map(([forma, valor]) => (
                    <li key={forma} className="flex justify-between items-center text-sm">
                      <span className="flex items-center text-gray-600">
                        {getFormaPagamentoIcon(forma as FormaPagamento)} {forma}
                      </span>
                      <span className={`font-medium ${valor >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        {formatCurrency(valor)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="text-xs text-gray-500 text-center bg-blue-50 p-3 rounded text-blue-800">
                Despesas em <b>Cartão de Crédito</b> não aparecem aqui, pois não saem do saldo imediato do caixa.
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse border-t border-gray-100">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                onClick={() => {
                  onFecharCaixa(caixaFechamentoId);
                  setIsFecharCaixaOpen(false);
                }}
              >
                Concluir Conferência
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Recibo de Venda de Estoque */}
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
      />

      {/* Modal de QR Code Pix */}
      <PixQrCodeModal
        isOpen={pixModalData.isOpen}
        onClose={() => setPixModalData((prev) => ({ ...prev, isOpen: false }))}
        valor={pixModalData.valor}
        descricao={pixModalData.descricao}
        copiaCola={pixModalData.copiaCola}
        alunoNome={pixModalData.alunoNome}
        responsavelNome={pixModalData.responsavelNome}
        instituicaoNome={pixModalData.instituicaoNome}
      />

      {/* Modal de Confirmação do Boleto Aberto */}
      <BoletoGeradoModal
        isOpen={boletoModalData.isOpen}
        onClose={() => setBoletoModalData((prev) => ({ ...prev, isOpen: false }))}
        valor={boletoModalData.valor}
        descricao={boletoModalData.descricao}
        linhaDigitavel={boletoModalData.linhaDigitavel}
        barcodeNumber={boletoModalData.barcodeNumber}
        boletoUrl={boletoModalData.boletoUrl}
        alunoNome={boletoModalData.alunoNome}
        bancoNome={boletoModalData.bancoNome}
      />
    </div>
  );
}
