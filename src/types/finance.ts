export type Unidade = 'Senador' | 'Papagaio' | 'Todas';

export type Categoria = string;

export type TipoCusto = 'Fixo' | 'Variável';

export type FormaPagamento = 'PIX' | 'Boleto' | 'Transferência Bancária' | 'Cartão' | 'Dinheiro';

export type TipoLancamento = 'Entrada' | 'Saída';

export interface TurmaConfig {
  setor: string;
  nome: string;
  letras: string[];
  valorPadrao?: number;
}

export interface Lancamento {
  id: string;
  data: Date;
  unidade: Unidade;
  descricao: string;
  categoria: Categoria;
  tipoCusto: TipoCusto;
  valor: number;
  formaPagamento: FormaPagamento;
  tipo: TipoLancamento;
  status: 'Pago' | 'Em Aberto';
  caixaId?: string;
  cartaoId?: string;
  orcamentoId?: string; // Para vincular saídas a um orçamento
  alunoId?: string; // Para vincular entradas a um aluno
  observacoes?: string;
  turmas?: TurmaConfig[];
  fechado?: boolean;
  itensEstoque?: {
    produtoId: string;
    produtoNome: string;
    variacaoId?: string;
    variacaoNome?: string;
    quantidade: number;
    precoUnitario: number;
    subtotal: number;
  }[];
  reciboNumero?: string;
}

// Para retrocompatibilidade caso algo use Expense
export type Expense = Lancamento;

export interface Orcamento {
  id: string;
  nome: string; // Ex: Dia dos Pais, Reforma do Pátio
  categoria: Categoria;
  valorOrcado: number;
}

export interface SalarioItem {
  id: string;
  descricao: string;
  tipo: 'Provento' | 'Desconto';
  valor: number;
  isPercentual?: boolean;
}

export interface Salario {
  id: string;
  colaborador: string;
  itens: SalarioItem[];
}

export interface Caixa {
  id: string;
  nome: string;
  saldoInicial: number;
}

export interface Cartao {
  id: string;
  nome: string;
  limite: number;
  diaFechamento: number;
  diaVencimento: number;
}
