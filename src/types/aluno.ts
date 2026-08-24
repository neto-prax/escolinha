export interface Aluno {
  id: string;
  nome: string;
  matricula: string;
  dataNascimento?: string;
  nomeResponsavel: string;
  contatoResponsavel: string;
  status: 'Ativo' | 'Inativo';
  
  // Dados Pessoais & Documentos
  estadoCivil?: string;
  cidadeNatal?: string;
  nacionalidade?: string;
  estrangeiro?: boolean;
  bloquearRematricula?: boolean;
  profissao?: string;
  empresaTrabalho?: string;
  classificacao?: string;
  rg?: string;
  rgOrgao?: string;
  rgDataExpedicao?: string;
  tituloEleitor?: string;
  tituloZona?: string;
  tituloSecao?: string;
  tituloDataEmissao?: string;
  cpf?: string;
  passaporte?: string;
  docMilitar?: string;
  docMilitarNum?: string;
  certidaoNascimento?: string;
  
  // Endereço
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  cidade?: string;
  uf?: string;
  bairro?: string;
  
  // Comunicação
  telefone?: string;
  telefoneComercial?: string;
  celularAluno?: string;
  operadora?: string;
  contatoWhatsapp?: string;
  email?: string;
  naoReceberEmail?: boolean;
  naoReceberSms?: boolean;
  correspondencia?: string;

  // Responsáveis Extras
  cpfResponsavel?: string;
  rgResponsavel?: string;
  emailResponsavel?: string;
  parentescoResponsavel?: string;
  responsavelFinanceiro?: boolean;
  responsavelOpcional?: string;
  responsavelDidatico?: boolean;
  condutorIda?: string;
  condutorVolta?: string;
  
  // Dados de Enturmação
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
