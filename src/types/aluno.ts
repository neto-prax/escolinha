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

  // Contraturno
  temContraturno?: boolean;
  setorContraturno?: string;
  classeContraturno?: string;
  turmaContraturno?: string;
  valorContraturno?: string;

  // Matrícula & Parcelamento
  dataMatricula?: string;
  parcelasContratadas?: number;

  // Histórico Financeiro e Cobranças
  historicoFinanceiro?: CobrancaHistorico[];
}

export interface CobrancaHistorico {
  id: string;
  data: string; // ISO date/time
  colaboradorId?: string;
  colaboradorNome: string;
  responsavelNome: string;
  responsavelContato?: string;
  parentesco?: string;
  mesReferencia: string; // ex: '2026-09'
  valorCobrado: number;
  canal: 'whatsapp' | 'ligacao';
  bloqueadoWhatsapp?: boolean;
  statusResultado: 'promessa_pagamento' | 'recusou' | 'sem_contato' | 'mensagem_enviada' | 'ligacao_realizada' | 'outro';
  dataPromessa?: string;
  observacoes?: string;
  judicializada?: boolean;
}

export interface Mensalidade {
  id: string;
  alunoId: string;
  mesReferencia: string; // ex: '2024-03'
  valorFinal: number; // valor líquido ou base
  dataVencimento: string; // ISO date
  status: 'Pendente' | 'Pago' | 'Atrasado' | 'Judicializada';
  dataPagamento?: string; // ISO date se pago
  lancamentoId?: string; // ID do Lancamento gerado no Financeiro
  judicializada?: boolean;
  dataJudicializacao?: string;
  motivoJudicializacao?: string;
  descontoPontualidade?: number; // valor do desconto que valia até o vencimento
  valorOriginalBase?: number;
}

