export interface Aluno {
  id: string;
  nome: string;
  matricula: string;
  dataNascimento?: string;
  nomeResponsavel: string;
  contatoResponsavel: string;
  status: 'Ativo' | 'Inativo';
  
  // Dados de Inturmação
  setor?: string;
  classe?: string;
  turma?: string; // Letra da turma
  descontoMensalidade?: string;
  diaVencimento?: string;
  valorBase?: string;
}

export interface Mensalidade {
  id: string;
  alunoId: string;
  mesReferencia: string; // ex: '2024-03'
  valorFinal: number; // valorBase - desconto
  dataVencimento: string; // ISO date
  status: 'Pendente' | 'Pago' | 'Atrasado';
  dataPagamento?: string; // ISO date se pago
  lancamentoId?: string; // ID do Lancamento gerado no Financeiro
}
