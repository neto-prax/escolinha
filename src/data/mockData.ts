import { Expense, Caixa, Cartao } from '../types/finance';

export const mockExpenses: Expense[] = [
  {
    id: '1',
    data: new Date(2026, 7, 1), // Aug 1
    unidade: 'Senador',
    descricao: 'Folha de Pagamento - Professores',
    categoria: 'Pessoal/RH',
    tipoCusto: 'Fixo',
    valor: 45000.00,
    formaPagamento: 'Transferência Bancária',
    tipo: 'Saída',
    status: 'Pago',
    caixaId: 'c2',
    observacoes: 'Referente ao mês anterior'
  },
  {
    id: '2',
    data: new Date(2026, 7, 2),
    unidade: 'Papagaio',
    descricao: 'Material Didático Moderna',
    categoria: 'Pedagógico & Material',
    tipoCusto: 'Variável',
    valor: 12500.50,
    formaPagamento: 'Boleto',
    tipo: 'Saída',
    status: 'Pago',
    caixaId: 'c1',
    observacoes: 'Apostilas do 3º Bimestre'
  },
  {
    id: '3',
    data: new Date(2026, 7, 5),
    unidade: 'Senador',
    descricao: 'Central da Construção - Tintas',
    categoria: 'Operacional & Infraestrutura',
    tipoCusto: 'Variável',
    valor: 2300.00,
    formaPagamento: 'PIX',
    tipo: 'Saída',
    status: 'Pago',
    observacoes: 'Manutenção do pátio principal'
  },
  {
    id: '4',
    data: new Date(2026, 7, 5),
    unidade: 'Todas',
    descricao: 'Medseg - Exames Admissionais',
    categoria: 'Administrativo',
    tipoCusto: 'Variável',
    valor: 1500.00,
    formaPagamento: 'Boleto',
    tipo: 'Saída',
    status: 'Pago',
    observacoes: 'Novos estagiários'
  },
  {
    id: '5',
    data: new Date(2026, 7, 8),
    unidade: 'Papagaio',
    descricao: 'Cantina - Hortifruti',
    categoria: 'Alimentação',
    tipoCusto: 'Variável',
    valor: 850.75,
    formaPagamento: 'PIX',
    tipo: 'Saída',
    status: 'Pago',
    observacoes: 'Semana 1'
  },
  {
    id: '6',
    data: new Date(2026, 7, 10),
    unidade: 'Senador',
    descricao: 'Vale Transporte - Funcionários',
    categoria: 'Pessoal/RH',
    tipoCusto: 'Fixo',
    valor: 3400.00,
    tipo: 'Saída',
    status: 'Pago',
    formaPagamento: 'Transferência Bancária',
  },
  {
    id: '7',
    data: new Date(2026, 7, 15),
    unidade: 'Papagaio',
    descricao: 'Limpeza - Produtos',
    categoria: 'Operacional & Infraestrutura',
    tipoCusto: 'Variável',
    valor: 980.20,
    tipo: 'Saída',
    status: 'Pago',
    formaPagamento: 'Cartão',
    cartaoId: 'cc1',
  }
];

export const mockEmployees = [
  { id: '1', name: 'Maria Silva', role: 'Professora', department: 'Pedagógico', phone: '(11) 99999-1111', status: 'active', hire_date: '2020-02-15' },
  { id: '2', name: 'João Santos', role: 'Professor', department: 'Pedagógico', phone: '(11) 99999-2222', status: 'active', hire_date: '2019-08-01' },
  { id: '3', name: 'Ana Costa', role: 'Secretária', department: 'Administrativo', phone: '(11) 99999-3333', status: 'active', hire_date: '2021-03-10' },
  { id: '4', name: 'Carlos Lima', role: 'Auxiliar', department: 'Serviços Gerais', phone: '(11) 99999-4444', status: 'vacation', hire_date: '2018-05-20' },
  { id: '5', name: 'Paula Oliveira', role: 'Coordenadora', department: 'Pedagógico', phone: '(11) 99999-5555', status: 'active', hire_date: '2017-01-05' },
];

export const mockCaixas: Caixa[] = [
  { id: 'c1', nome: 'Caixa Secretaria (Dinheiro)', saldoInicial: 500 },
  { id: 'c2', nome: 'Conta Banco do Brasil', saldoInicial: 15000 },
  { id: 'c3', nome: 'Conta Nubank (PIX)', saldoInicial: 8000 },
];

export const mockCartoes: Cartao[] = [
  { id: 'cc1', nome: 'Cartão Nubank (Escola)', limite: 10000, diaFechamento: 5, diaVencimento: 12 },
  { id: 'cc2', nome: 'Cartão Itaú (Diretoria)', limite: 25000, diaFechamento: 15, diaVencimento: 25 },
];
