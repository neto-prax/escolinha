export type Unidade = 'Senador' | 'Papagaio' | 'Todas';

export type Categoria = 
  | 'Pessoal/RH'
  | 'Pedagógico & Material'
  | 'Operacional & Infraestrutura'
  | 'Alimentação'
  | 'Administrativo'
  | 'Eventos'
  | 'Reformas';

export type TipoCusto = 'Fixo' | 'Variável';

export type FormaPagamento = 'PIX' | 'Boleto' | 'Transferência Bancária' | 'Cartão' | 'Dinheiro';

export type TipoLancamento = 'Entrada' | 'Saída';

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
  orcamentoId?: string; // Para vincular saídas a um orçamento
  observacoes?: string;
}

// Para retrocompatibilidade caso algo use Expense
export type Expense = Lancamento;

export interface Orcamento {
  id: string;
  nome: string; // Ex: Dia dos Pais, Reforma do Pátio
  categoria: Categoria;
  valorOrcado: number;
}

export interface Salario {
  id: string;
  colaborador: string;
  salarioBase: number;
  encargos: number;
  descontos: number;
}
