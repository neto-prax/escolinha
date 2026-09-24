export type DestinoProduto = 'venda' | 'consumo_interno' | 'ambos';

export interface ProdutoVariacao {
  id: string;
  nome: string; // Ex: 'Tam 2', 'Tam 4', 'Tam 8', 'Tam P', 'Tam M', etc.
  sku?: string;
  quantidadeEstoque: number;
  estoqueMinimo: number;
  precoCusto: number;
  precoVenda?: number; // Preço à vista (PIX / Dinheiro)
  precoVendaCredito?: number; // Preço no crédito / parcelado
}

export interface ProdutoEstoque {
  id: string;
  codigo?: string; // Código interno ou SKU
  nome: string;
  descricao?: string;
  categoria: string; // Ex: 'Fardamento / Uniforme', 'Material Escolar', 'Limpeza & Higiene', 'Escritório', 'Alimentos', 'Outros'
  destino: DestinoProduto;
  temVariacoes: boolean;
  variacoes?: ProdutoVariacao[];
  // Campos utilizados quando não há variações:
  quantidadeEstoque?: number;
  estoqueMinimo?: number;
  precoCusto?: number;
  precoVenda?: number; // Preço à vista
  precoVendaCredito?: number; // Preço no crédito
  unidadeMedida?: string; // un, pct, kit, litro, cx, resma
  unidadeEscolar?: 'Senador' | 'Papagaio' | 'Todas' | string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export type TipoMovimentacaoEstoque = 
  | 'entrada'          // Compra / Reabastecimento
  | 'saida_venda'      // Venda para aluno / responsável
  | 'saida_consumo'    // Retirada interna (limpeza, secretaria, etc.)
  | 'reposicao'        // Reposição por defeito / troca
  | 'ajuste';          // Ajuste de balanço / inventário

export interface MovimentacaoEstoque {
  id: string;
  data: string; // ISO date
  tipo: TipoMovimentacaoEstoque;
  produtoId: string;
  produtoNome: string;
  variacaoId?: string;
  variacaoNome?: string;
  quantidade: number;
  quantidadeAnterior: number;
  quantidadeAtual: number;
  motivo?: string; // Ex: 'Limpeza do prédio', 'Venda no balcão', 'Troca de tamanho avariado'
  responsavelNome?: string; // Quem autorizou / retirou
  destinatario?: string; // Aluno, setor ou colaborador
  setor?: string; // Zeladoria, Secretaria, Coordenação, etc.
  valorUnitario?: number;
  valorTotal?: number;
  lancamentoFinanceiroId?: string;
  reciboNumero?: string;
  observacoes?: string;
}

export interface ItemVendaEstoque {
  produtoId: string;
  produtoNome: string;
  variacaoId?: string;
  variacaoNome?: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface VendaEstoque {
  id: string;
  numeroRecibo: string;
  data: string; // ISO date
  compradorTipo: 'aluno' | 'colaborador' | 'externo';
  alunoId?: string;
  compradorNome: string;
  compradorDocumento?: string; // CPF
  turmaAluno?: string;
  itens: ItemVendaEstoque[];
  valorTotal: number;
  formaPagamento: 'PIX' | 'Boleto' | 'Transferência Bancária' | 'Cartão' | 'Dinheiro';
  statusPagamento: 'Pago' | 'Pendente';
  vendedorNome: string;
  lancamentoId?: string;
  observacoes?: string;
}

export const CATEGORIAS_PRODUTO = [
  'Fardamento / Uniformes',
  'Material Escolar / Didático',
  'Limpeza & Higiene',
  'Escritório & Secretaria',
  'Cantina & Lanches',
  'Manutenção & Zeladoria',
  'Outros',
];

export const MOTIVOS_RETIRADA = [
  'Limpeza & Higiene',
  'Material de Escritório / Secretaria',
  'Uso Pedagógico / Sala de Aula',
  'Manutenção Predial / Zeladoria',
  'Reposição / Troca de Avaria',
  'Descarte / Perda',
  'Doação / Cortesia',
  'Outro Motivo',
];

export const SETORES_ESCOLA = [
  'Zeladoria / Limpeza',
  'Secretaria / Administrativo',
  'Coordenação Pedagógica',
  'Sala dos Professores',
  'Cantina / Alimentação',
  'Portaria / Recepção',
  'Diretoria',
  'Outro Setor',
];

export function isDemoProduto(p: ProdutoEstoque): boolean {
  if (!p || !p.id) return false;
  return (
    p.id.startsWith('prod-farda-') ||
    p.id.startsWith('prod-limp-') ||
    p.id.startsWith('prod-escrit-') ||
    p.id.startsWith('prod-ped-')
  );
}

export function isDemoMovimentacao(m: MovimentacaoEstoque): boolean {
  if (!m || !m.id) return false;
  return m.id.startsWith('mov-init-');
}

export function filterRealProdutos(produtos: ProdutoEstoque[]): ProdutoEstoque[] {
  return (produtos || []).filter(p => !isDemoProduto(p));
}

export function filterRealMovimentacoes(movimentacoes: MovimentacaoEstoque[]): MovimentacaoEstoque[] {
  return (movimentacoes || []).filter(m => !isDemoMovimentacao(m));
}

// O estoque padrão agora inicia vazio para garantir apenas dados reais alocados em banco
export const DEFAULT_ESTOQUE_PRODUTOS: ProdutoEstoque[] = [];

export const SAMPLE_DEMO_PRODUTOS: ProdutoEstoque[] = [
  {
    id: 'prod-farda-camiseta',
    codigo: 'UNI-CAM-01',
    nome: 'Camiseta Manga Curta Uniforme',
    descricao: 'Camiseta padrão em malha PV com brasão bordado da escola',
    categoria: 'Fardamento / Uniformes',
    destino: 'venda',
    temVariacoes: true,
    unidadeMedida: 'un',
    unidadeEscolar: 'Todas',
    ativo: true,
    criadoEm: '2026-01-10T10:00:00Z',
    atualizadoEm: '2026-09-01T10:00:00Z',
    variacoes: [
      { id: 'var-cam-2', nome: 'Tamanho 2', sku: 'CAM-02', quantidadeEstoque: 10, estoqueMinimo: 5, precoCusto: 24.0, precoVenda: 45.0, precoVendaCredito: 50.0 },
      { id: 'var-cam-4', nome: 'Tamanho 4', sku: 'CAM-04', quantidadeEstoque: 18, estoqueMinimo: 5, precoCusto: 24.0, precoVenda: 45.0, precoVendaCredito: 50.0 },
      { id: 'var-cam-6', nome: 'Tamanho 6', sku: 'CAM-06', quantidadeEstoque: 22, estoqueMinimo: 5, precoCusto: 24.0, precoVenda: 45.0, precoVendaCredito: 50.0 },
      { id: 'var-cam-8', nome: 'Tamanho 8', sku: 'CAM-08', quantidadeEstoque: 25, estoqueMinimo: 8, precoCusto: 24.0, precoVenda: 45.0, precoVendaCredito: 50.0 },
      { id: 'var-cam-10', nome: 'Tamanho 10', sku: 'CAM-10', quantidadeEstoque: 20, estoqueMinimo: 8, precoCusto: 24.0, precoVenda: 45.0, precoVendaCredito: 50.0 },
      { id: 'var-cam-12', nome: 'Tamanho 12', sku: 'CAM-12', quantidadeEstoque: 15, estoqueMinimo: 5, precoCusto: 24.0, precoVenda: 45.0, precoVendaCredito: 50.0 },
      { id: 'var-cam-14', nome: 'Tamanho 14', sku: 'CAM-14', quantidadeEstoque: 12, estoqueMinimo: 5, precoCusto: 25.0, precoVenda: 48.0, precoVendaCredito: 53.0 },
      { id: 'var-cam-16', nome: 'Tamanho 16', sku: 'CAM-16', quantidadeEstoque: 8, estoqueMinimo: 5, precoCusto: 25.0, precoVenda: 48.0, precoVendaCredito: 53.0 },
      { id: 'var-cam-p', nome: 'Tamanho P', sku: 'CAM-P', quantidadeEstoque: 14, estoqueMinimo: 5, precoCusto: 26.0, precoVenda: 50.0, precoVendaCredito: 55.0 },
      { id: 'var-cam-m', nome: 'Tamanho M', sku: 'CAM-M', quantidadeEstoque: 16, estoqueMinimo: 5, precoCusto: 26.0, precoVenda: 50.0, precoVendaCredito: 55.0 },
      { id: 'var-cam-g', nome: 'Tamanho G', sku: 'CAM-G', quantidadeEstoque: 10, estoqueMinimo: 5, precoCusto: 26.0, precoVenda: 50.0, precoVendaCredito: 55.0 },
      { id: 'var-cam-gg', nome: 'Tamanho GG', sku: 'CAM-GG', quantidadeEstoque: 6, estoqueMinimo: 3, precoCusto: 28.0, precoVenda: 55.0, precoVendaCredito: 60.0 },
    ],
  },
  {
    id: 'prod-farda-bermuda',
    codigo: 'UNI-BER-01',
    nome: 'Bermuda Helanca Escolar',
    descricao: 'Bermuda unissex com elástico reforçado e frisos laterais',
    categoria: 'Fardamento / Uniformes',
    destino: 'venda',
    temVariacoes: true,
    unidadeMedida: 'un',
    unidadeEscolar: 'Todas',
    ativo: true,
    criadoEm: '2026-01-10T10:00:00Z',
    atualizadoEm: '2026-09-01T10:00:00Z',
    variacoes: [
      { id: 'var-ber-4', nome: 'Tamanho 4', sku: 'BER-04', quantidadeEstoque: 12, estoqueMinimo: 5, precoCusto: 22.0, precoVenda: 42.0, precoVendaCredito: 47.0 },
      { id: 'var-ber-6', nome: 'Tamanho 6', sku: 'BER-06', quantidadeEstoque: 15, estoqueMinimo: 5, precoCusto: 22.0, precoVenda: 42.0, precoVendaCredito: 47.0 },
      { id: 'var-ber-8', nome: 'Tamanho 8', sku: 'BER-08', quantidadeEstoque: 18, estoqueMinimo: 5, precoCusto: 22.0, precoVenda: 42.0, precoVendaCredito: 47.0 },
      { id: 'var-ber-10', nome: 'Tamanho 10', sku: 'BER-10', quantidadeEstoque: 14, estoqueMinimo: 5, precoCusto: 22.0, precoVenda: 42.0, precoVendaCredito: 47.0 },
      { id: 'var-ber-12', nome: 'Tamanho 12', sku: 'BER-12', quantidadeEstoque: 10, estoqueMinimo: 5, precoCusto: 22.0, precoVenda: 42.0, precoVendaCredito: 47.0 },
      { id: 'var-ber-p', nome: 'Tamanho P', sku: 'BER-P', quantidadeEstoque: 8, estoqueMinimo: 4, precoCusto: 24.0, precoVenda: 46.0, precoVendaCredito: 51.0 },
      { id: 'var-ber-m', nome: 'Tamanho M', sku: 'BER-M', quantidadeEstoque: 9, estoqueMinimo: 4, precoCusto: 24.0, precoVenda: 46.0, precoVendaCredito: 51.0 },
      { id: 'var-ber-g', nome: 'Tamanho G', sku: 'BER-G', quantidadeEstoque: 5, estoqueMinimo: 3, precoCusto: 24.0, precoVenda: 46.0, precoVendaCredito: 51.0 },
    ],
  },
  {
    id: 'prod-agenda-2026',
    codigo: 'MAT-AGE-26',
    nome: 'Agenda Escolar 2026 Personalizada',
    descricao: 'Agenda do estudante encadernada capa dura com regulamento',
    categoria: 'Material Escolar / Didático',
    destino: 'venda',
    temVariacoes: false,
    quantidadeEstoque: 48,
    estoqueMinimo: 10,
    precoCusto: 16.5,
    precoVenda: 35.0,
    precoVendaCredito: 39.0,
    unidadeMedida: 'un',
    unidadeEscolar: 'Todas',
    ativo: true,
    criadoEm: '2026-01-10T10:00:00Z',
    atualizadoEm: '2026-09-01T10:00:00Z',
  },
  {
    id: 'prod-limp-detergente',
    codigo: 'LIMP-DET-5L',
    nome: 'Detergente Neutro Concentrado 5L',
    descricao: 'Galão de 5 litros de detergente biodegradável institucional',
    categoria: 'Limpeza & Higiene',
    destino: 'consumo_interno',
    temVariacoes: false,
    quantidadeEstoque: 14,
    estoqueMinimo: 4,
    precoCusto: 21.9,
    unidadeMedida: 'galão 5L',
    unidadeEscolar: 'Todas',
    ativo: true,
    criadoEm: '2026-01-10T10:00:00Z',
    atualizadoEm: '2026-09-01T10:00:00Z',
  },
  {
    id: 'prod-limp-desinfetante',
    codigo: 'LIMP-DES-5L',
    nome: 'Desinfetante Lavanda 5L',
    descricao: 'Galão de desinfetante hospitalar e escolar concentrado',
    categoria: 'Limpeza & Higiene',
    destino: 'consumo_interno',
    temVariacoes: false,
    quantidadeEstoque: 11,
    estoqueMinimo: 3,
    precoCusto: 24.5,
    unidadeMedida: 'galão 5L',
    unidadeEscolar: 'Todas',
    ativo: true,
    criadoEm: '2026-01-10T10:00:00Z',
    atualizadoEm: '2026-09-01T10:00:00Z',
  },
  {
    id: 'prod-limp-papel-hig',
    codigo: 'LIMP-PH-ROL',
    nome: 'Papel Higiênico Rolão 8x300m',
    descricao: 'Fardo institucional com 8 rolos de 300 metros folha dupla',
    categoria: 'Limpeza & Higiene',
    destino: 'consumo_interno',
    temVariacoes: false,
    quantidadeEstoque: 18,
    estoqueMinimo: 5,
    precoCusto: 54.0,
    unidadeMedida: 'fardo',
    unidadeEscolar: 'Todas',
    ativo: true,
    criadoEm: '2026-01-10T10:00:00Z',
    atualizadoEm: '2026-09-01T10:00:00Z',
  },
  {
    id: 'prod-esc-resma-a4',
    codigo: 'ESC-A4-500',
    nome: 'Papel Sulfite Chamex A4 (Resma 500 fls)',
    descricao: 'Papel branco 75g para impressões da secretaria e provas',
    categoria: 'Escritório & Secretaria',
    destino: 'consumo_interno',
    temVariacoes: false,
    quantidadeEstoque: 28,
    estoqueMinimo: 8,
    precoCusto: 26.5,
    unidadeMedida: 'resma',
    unidadeEscolar: 'Todas',
    ativo: true,
    criadoEm: '2026-01-10T10:00:00Z',
    atualizadoEm: '2026-09-01T10:00:00Z',
  },
  {
    id: 'prod-ped-pincel-qb',
    codigo: 'PED-PIN-QB',
    nome: 'Kit Marcador de Quadro Branco (4 cores)',
    descricao: 'Estojo com 4 cores recarregáveis para professores',
    categoria: 'Material Escolar / Didático',
    destino: 'consumo_interno',
    temVariacoes: false,
    quantidadeEstoque: 20,
    estoqueMinimo: 6,
    precoCusto: 19.8,
    unidadeMedida: 'kit',
    unidadeEscolar: 'Todas',
    ativo: true,
    criadoEm: '2026-01-10T10:00:00Z',
    atualizadoEm: '2026-09-01T10:00:00Z',
  },
];
