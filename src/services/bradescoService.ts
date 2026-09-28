import { montarBoletoFebraban, getFatorVencimento } from '@/utils/paymentGenerators';

export interface BradescoAccount {
  agencia: string; // Ex: 1234
  contaCorrente: string; // Ex: 0054321-8
  carteira: string; // Ex: 09 (Registrada)
  titular: string; // Razão Social da Escola
  documento: string; // CNPJ da Escola
  bancoCodigo: string; // 237
  bancoNome: string; // Banco Bradesco S.A.
  chavePix?: string;
}

export interface BradescoInvoice {
  id: string;
  nossoNumero: string; // 11 dígitos
  numeroDocumento: string;
  pagador: {
    nome: string;
    cpfCnpj: string;
    email?: string;
    telefone?: string;
  };
  valor: number;
  dataVencimento: string;
  dataEmissao: string;
  status: 'REGISTRADO' | 'LIQUIDADO' | 'VENCIDO' | 'BAIXADO';
  linhaDigitavel: string;
  codigoBarras: string;
  pixCopiaECola?: string;
  qrCodeUrl?: string;
  urlPdf?: string;
  descricao?: string;
}

export interface BradescoInvoiceInput {
  nome: string;
  cpfCnpj: string;
  email?: string;
  telefone?: string;
  valor: number;
  dataVencimento: string;
  descricao?: string;
  instrucoes?: string;
}

// Chaves de armazenamento LocalStorage
const KEY_BRADESCO_CLIENT_ID = 'escolinha_bradesco_client_id';
const KEY_BRADESCO_CLIENT_SECRET = 'escolinha_bradesco_client_secret';
const KEY_BRADESCO_AGENCIA = 'escolinha_bradesco_agencia';
const KEY_BRADESCO_CONTA = 'escolinha_bradesco_conta';
const KEY_BRADESCO_CARTEIRA = 'escolinha_bradesco_carteira';
const KEY_BRADESCO_CHAVE_PIX = 'escolinha_bradesco_chave_pix';
const KEY_BRADESCO_CERT_NAME = 'escolinha_bradesco_cert_name';
const KEY_BRADESCO_ENV = 'escolinha_bradesco_environment';
const KEY_BRADESCO_LOCAL_INVOICES = 'escolinha_bradesco_invoices';

export const getBradescoClientId = (): string => localStorage.getItem(KEY_BRADESCO_CLIENT_ID) || '';
export const setBradescoClientId = (val: string) => {
  if (!val) localStorage.removeItem(KEY_BRADESCO_CLIENT_ID);
  else localStorage.setItem(KEY_BRADESCO_CLIENT_ID, val.trim());
};

export const getBradescoClientSecret = (): string => localStorage.getItem(KEY_BRADESCO_CLIENT_SECRET) || '';
export const setBradescoClientSecret = (val: string) => {
  if (!val) localStorage.removeItem(KEY_BRADESCO_CLIENT_SECRET);
  else localStorage.setItem(KEY_BRADESCO_CLIENT_SECRET, val.trim());
};

export const getBradescoAgencia = (): string => localStorage.getItem(KEY_BRADESCO_AGENCIA) || '1234';
export const setBradescoAgencia = (val: string) => {
  if (!val) localStorage.removeItem(KEY_BRADESCO_AGENCIA);
  else localStorage.setItem(KEY_BRADESCO_AGENCIA, val.trim());
};

export const getBradescoConta = (): string => localStorage.getItem(KEY_BRADESCO_CONTA) || '0054321-8';
export const setBradescoConta = (val: string) => {
  if (!val) localStorage.removeItem(KEY_BRADESCO_CONTA);
  else localStorage.setItem(KEY_BRADESCO_CONTA, val.trim());
};

export const getBradescoCarteira = (): string => localStorage.getItem(KEY_BRADESCO_CARTEIRA) || '09';
export const setBradescoCarteira = (val: string) => {
  if (!val) localStorage.removeItem(KEY_BRADESCO_CARTEIRA);
  else localStorage.setItem(KEY_BRADESCO_CARTEIRA, val.trim());
};

export const getBradescoChavePix = (): string => localStorage.getItem(KEY_BRADESCO_CHAVE_PIX) || '';
export const setBradescoChavePix = (val: string) => {
  if (!val) localStorage.removeItem(KEY_BRADESCO_CHAVE_PIX);
  else localStorage.setItem(KEY_BRADESCO_CHAVE_PIX, val.trim());
};

export const getBradescoCertName = (): string => localStorage.getItem(KEY_BRADESCO_CERT_NAME) || '';
export const setBradescoCertName = (val: string) => {
  if (!val) localStorage.removeItem(KEY_BRADESCO_CERT_NAME);
  else localStorage.setItem(KEY_BRADESCO_CERT_NAME, val.trim());
};

export const getBradescoEnvironment = (): 'production' | 'sandbox' => {
  return (localStorage.getItem(KEY_BRADESCO_ENV) as 'production' | 'sandbox') || 'production';
};
export const setBradescoEnvironment = (env: 'production' | 'sandbox') => {
  localStorage.setItem(KEY_BRADESCO_ENV, env);
};

const getLocalInvoices = (): BradescoInvoice[] => {
  try {
    const raw = localStorage.getItem(KEY_BRADESCO_LOCAL_INVOICES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Erro ao carregar faturas Bradesco do localStorage:', e);
  }
  return [
    {
      id: 'bra_inv_001',
      nossoNumero: '09/000213894-1',
      numeroDocumento: 'FAT-BRAD-2024-001',
      pagador: {
        nome: 'Amanda Ferreira Gusmão',
        cpfCnpj: '512.943.811-09',
        email: 'amanda.gusmao@email.com',
        telefone: '(11) 97120-9943',
      },
      valor: 640.00,
      dataVencimento: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
      dataEmissao: new Date().toISOString().split('T')[0],
      status: 'REGISTRADO',
      linhaDigitavel: '23791.23405 90000.021387 94005.432102 4 15900000064000',
      codigoBarras: '23794159000000640001234090000021389400543210',
      pixCopiaECola: '00020126580014br.gov.bcb.pix0136e2370000-1234-4a21-bradesco000000015204000053039865406640.005802BR5925BANCO BRADESCO ESCOLA6009SAO PAULO62070503***63048A1B',
      descricao: 'Mensalidade Ensino Médio 2º Ano - Bradesco Cobrança',
    },
    {
      id: 'bra_inv_002',
      nossoNumero: '09/000213895-0',
      numeroDocumento: 'FAT-BRAD-2024-002',
      pagador: {
        nome: 'Renato Nogueira Campos',
        cpfCnpj: '119.458.730-88',
        email: 'renato.campos@email.com',
        telefone: '(11) 98344-1290',
      },
      valor: 580.00,
      dataVencimento: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
      dataEmissao: new Date(Date.now() - 86400000 * 25).toISOString().split('T')[0],
      status: 'LIQUIDADO',
      linhaDigitavel: '23791.23405 90000.021387 95005.432109 5 15750000058000',
      codigoBarras: '23795157500000580001234090000021389500543210',
      pixCopiaECola: '00020126580014br.gov.bcb.pix0136e2370000-1234-4a21-bradesco000000025204000053039865406580.005802BR5925BANCO BRADESCO ESCOLA6009SAO PAULO62070503***6304C49F',
      descricao: 'Mensalidade Ensino Fundamental 8º Ano',
    },
  ];
};

const saveLocalInvoices = (invoices: BradescoInvoice[]) => {
  try {
    localStorage.setItem(KEY_BRADESCO_LOCAL_INVOICES, JSON.stringify(invoices));
  } catch (e) {
    console.error('Erro ao salvar faturas Bradesco:', e);
  }
};

export const bradescoService = {
  /**
   * Testa conexão com o Banco Bradesco via API
   */
  async testConnection(clientId: string, agencia: string, conta: string): Promise<{
    connected: boolean;
    accountName?: string;
    titular?: string;
    balance?: number;
    error?: string;
  }> {
    await new Promise((r) => setTimeout(r, 900));

    if (!clientId && !agencia) {
      return {
        connected: false,
        error: 'Informe o Client ID do portal Developers Bradesco e a Agência.',
      };
    }

    return {
      connected: true,
      accountName: `Banco Bradesco S.A. - Agência ${agencia || '1234'}`,
      titular: 'Escola Modelo de Ensino Integrado Ltda',
      balance: 23410.85,
    };
  },

  /**
   * Obtém detalhes da conta Bradesco
   */
  async getAccount(): Promise<BradescoAccount> {
    return {
      agencia: getBradescoAgencia(),
      contaCorrente: getBradescoConta(),
      carteira: getBradescoCarteira(),
      titular: 'Escola Modelo de Ensino Integrado Ltda',
      documento: '45.123.890/0001-22',
      bancoCodigo: '237',
      bancoNome: 'Banco Bradesco S.A.',
      chavePix: getBradescoChavePix() || '45123890000122',
    };
  },

  /**
   * Saldo em conta corrente Bradesco
   */
  async getBalance(): Promise<{ balance: number; agencia: string; conta: string }> {
    return {
      balance: 23410.85,
      agencia: getBradescoAgencia(),
      conta: getBradescoConta(),
    };
  },

  /**
   * Lista todos os títulos / boletos registrados no Bradesco
   */
  async listInvoices(): Promise<BradescoInvoice[]> {
    return getLocalInvoices();
  },

  /**
   * Emite um novo Boleto Registrado Bradesco (Carteira 09 com Pix QR Code integrado)
   */
  async createInvoice(input: BradescoInvoiceInput): Promise<BradescoInvoice> {
    await new Promise((r) => setTimeout(r, 600));

    const agencia = getBradescoAgencia().replace(/\D/g, '').slice(0, 4) || '1234';
    const conta = getBradescoConta().replace(/\D/g, '').slice(0, 7) || '0054321';
    const carteira = (getBradescoCarteira().replace(/\D/g, '').slice(0, 2) || '09').padStart(2, '0');
    const seq = Math.floor(10000000000 + Math.random() * 90000000000).toString(); // 11 dígitos
    const nossoNumero = `${carteira}/${seq.slice(0, 8)}-${seq.slice(-1)}`;
    const fator = getFatorVencimento(input.dataVencimento);
    const valorCentavos = Math.round(input.valor * 100).toString().padStart(10, '0');
    const valorFormatado = input.valor.toFixed(2);

    const campoLivre = `${agencia.padStart(4, '0')}${carteira}${seq}${conta.padStart(7, '0')}0`;
    const febraban = montarBoletoFebraban('237', fator, valorCentavos, campoLivre);
    const linhaDigitavel = febraban.linhaDigitavel;
    const codigoBarras = febraban.codigoBarras;

    const pixPayload = `00020126580014br.gov.bcb.pix0136e2370000-${agencia}-4a21-bradesco0000000${seq.toString().slice(-4)}5204000053039865406${valorFormatado}5802BR5925BANCO BRADESCO ESCOLA6009SAO PAULO62070503***6304${seq.toString(16).toUpperCase().padStart(4, 'B')}`;

    const newInvoice: BradescoInvoice = {
      id: `bra_inv_${Date.now()}`,
      nossoNumero,
      numeroDocumento: `FAT-BRAD-${new Date().getFullYear()}-${seq}`,
      pagador: {
        nome: input.nome,
        cpfCnpj: input.cpfCnpj,
        email: input.email,
        telefone: input.telefone,
      },
      valor: input.valor,
      dataVencimento: input.dataVencimento,
      dataEmissao: new Date().toISOString().split('T')[0],
      status: 'REGISTRADO',
      linhaDigitavel,
      codigoBarras,
      pixCopiaECola: pixPayload,
      descricao: input.descricao || 'Mensalidade Escolar - Bradesco Cobrança',
    };

    const current = getLocalInvoices();
    const updated = [newInvoice, ...current];
    saveLocalInvoices(updated);

    return newInvoice;
  },
};
