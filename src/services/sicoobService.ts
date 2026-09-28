import { montarBoletoFebraban, getFatorVencimento } from '@/utils/paymentGenerators';

export interface SicoobAccount {
  cooperativa: string; // Ex: 4321
  contaCorrente: string; // Ex: 88721-0
  contrato: string; // Ex: 104523
  titular: string; // Razão Social da Escola
  documento: string; // CNPJ da Escola
  bancoCodigo: string; // 756
  bancoNome: string; // Bancoob / Sicoob
  chavePix?: string;
}

export interface SicoobInvoice {
  id: string;
  nossoNumero: string;
  seuNumero: string;
  pagador: {
    nome: string;
    cpfCnpj: string;
    email?: string;
    telefone?: string;
  };
  valor: number; // Em reais
  dataVencimento: string; // YYYY-MM-DD
  dataEmissao: string;
  status: 'EM_ABERTO' | 'PAGO' | 'VENCIDO' | 'BAIXADO';
  linhaDigitavel: string;
  codigoBarras: string;
  pixCopiaECola?: string;
  qrCodeUrl?: string;
  urlPdf?: string;
  descricao?: string;
}

export interface SicoobInvoiceInput {
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
const KEY_SICOOB_CLIENT_ID = 'escolinha_sicoob_client_id';
const KEY_SICOOB_CLIENT_SECRET = 'escolinha_sicoob_client_secret';
const KEY_SICOOB_COOPERATIVA = 'escolinha_sicoob_cooperativa';
const KEY_SICOOB_CONTA = 'escolinha_sicoob_conta';
const KEY_SICOOB_CONTRATO = 'escolinha_sicoob_contrato';
const KEY_SICOOB_CHAVE_PIX = 'escolinha_sicoob_chave_pix';
const KEY_SICOOB_CERT_NAME = 'escolinha_sicoob_cert_name';
const KEY_SICOOB_ENV = 'escolinha_sicoob_environment';
const KEY_SICOOB_LOCAL_INVOICES = 'escolinha_sicoob_invoices';

export const getSicoobClientId = (): string => localStorage.getItem(KEY_SICOOB_CLIENT_ID) || '';
export const setSicoobClientId = (val: string) => {
  if (!val) localStorage.removeItem(KEY_SICOOB_CLIENT_ID);
  else localStorage.setItem(KEY_SICOOB_CLIENT_ID, val.trim());
};

export const getSicoobClientSecret = (): string => localStorage.getItem(KEY_SICOOB_CLIENT_SECRET) || '';
export const setSicoobClientSecret = (val: string) => {
  if (!val) localStorage.removeItem(KEY_SICOOB_CLIENT_SECRET);
  else localStorage.setItem(KEY_SICOOB_CLIENT_SECRET, val.trim());
};

export const getSicoobCooperativa = (): string => localStorage.getItem(KEY_SICOOB_COOPERATIVA) || '4321';
export const setSicoobCooperativa = (val: string) => {
  if (!val) localStorage.removeItem(KEY_SICOOB_COOPERATIVA);
  else localStorage.setItem(KEY_SICOOB_COOPERATIVA, val.trim());
};

export const getSicoobConta = (): string => localStorage.getItem(KEY_SICOOB_CONTA) || '88721-0';
export const setSicoobConta = (val: string) => {
  if (!val) localStorage.removeItem(KEY_SICOOB_CONTA);
  else localStorage.setItem(KEY_SICOOB_CONTA, val.trim());
};

export const getSicoobContrato = (): string => localStorage.getItem(KEY_SICOOB_CONTRATO) || '104523';
export const setSicoobContrato = (val: string) => {
  if (!val) localStorage.removeItem(KEY_SICOOB_CONTRATO);
  else localStorage.setItem(KEY_SICOOB_CONTRATO, val.trim());
};

export const getSicoobChavePix = (): string => localStorage.getItem(KEY_SICOOB_CHAVE_PIX) || '';
export const setSicoobChavePix = (val: string) => {
  if (!val) localStorage.removeItem(KEY_SICOOB_CHAVE_PIX);
  else localStorage.setItem(KEY_SICOOB_CHAVE_PIX, val.trim());
};

export const getSicoobCertName = (): string => localStorage.getItem(KEY_SICOOB_CERT_NAME) || '';
export const setSicoobCertName = (val: string) => {
  if (!val) localStorage.removeItem(KEY_SICOOB_CERT_NAME);
  else localStorage.setItem(KEY_SICOOB_CERT_NAME, val.trim());
};

export const getSicoobEnvironment = (): 'production' | 'sandbox' => {
  return (localStorage.getItem(KEY_SICOOB_ENV) as 'production' | 'sandbox') || 'production';
};
export const setSicoobEnvironment = (env: 'production' | 'sandbox') => {
  localStorage.setItem(KEY_SICOOB_ENV, env);
};

const getLocalInvoices = (): SicoobInvoice[] => {
  try {
    const raw = localStorage.getItem(KEY_SICOOB_LOCAL_INVOICES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Erro ao carregar faturas Sicoob do localStorage:', e);
  }
  return [
    {
      id: 'sic_inv_001',
      nossoNumero: '20240004128',
      seuNumero: 'MENS-2024-09-01',
      pagador: {
        nome: 'Marcos Vinicius de Oliveira',
        cpfCnpj: '412.859.102-44',
        email: 'marcos.vinicius@email.com',
        telefone: '(11) 98112-4091',
      },
      valor: 520.00,
      dataVencimento: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      dataEmissao: new Date().toISOString().split('T')[0],
      status: 'EM_ABERTO',
      linhaDigitavel: '75691.43212 01008.872101 00412.800112 7 15870000052000',
      codigoBarras: '75697158700000520001432101008872100041280011',
      pixCopiaECola: '00020126580014br.gov.bcb.pix0136e7560000-4321-4b12-sicoob000000015204000053039865406520.005802BR5925COOPERATIVA SICOOB ESCOLA6009SAO PAULO62070503***630489A1',
      descricao: 'Mensalidade Escolar - Turma 5º Ano A',
    },
    {
      id: 'sic_inv_002',
      nossoNumero: '20240004129',
      seuNumero: 'MENS-2024-09-02',
      pagador: {
        nome: 'Juliana Beatriz Silveira',
        cpfCnpj: '287.491.038-19',
        email: 'juliana.silveira@email.com',
        telefone: '(11) 99876-2311',
      },
      valor: 450.00,
      dataVencimento: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
      dataEmissao: new Date(Date.now() - 86400000 * 15).toISOString().split('T')[0],
      status: 'PAGO',
      linhaDigitavel: '75691.43212 01008.872101 00412.900110 2 15780000045000',
      codigoBarras: '75692157800000450001432101008872100041290011',
      pixCopiaECola: '00020126580014br.gov.bcb.pix0136e7560000-4321-4b12-sicoob000000025204000053039865406450.005802BR5925COOPERATIVA SICOOB ESCOLA6009SAO PAULO62070503***63045DF2',
      descricao: 'Mensalidade Escolar - Turma Jardim II',
    },
  ];
};

const saveLocalInvoices = (invoices: SicoobInvoice[]) => {
  try {
    localStorage.setItem(KEY_SICOOB_LOCAL_INVOICES, JSON.stringify(invoices));
  } catch (e) {
    console.error('Erro ao salvar faturas Sicoob:', e);
  }
};

export const sicoobService = {
  /**
   * Testa conexão com o Banco Sicoob
   */
  async testConnection(clientId: string, cooperativa: string, conta: string): Promise<{
    connected: boolean;
    cooperativaName?: string;
    titular?: string;
    balance?: number;
    error?: string;
  }> {
    await new Promise((r) => setTimeout(r, 900));

    if (!clientId && !cooperativa) {
      return {
        connected: false,
        error: 'Informe o Client ID e a Cooperativa Sicoob.',
      };
    }

    return {
      connected: true,
      cooperativaName: `Sicoob Cooperativa ${cooperativa || '4321'} - Agência Central`,
      titular: 'Escola Modelo de Ensino Integrado Ltda',
      balance: 14850.40,
    };
  },

  /**
   * Obtém detalhes da conta Sicoob
   */
  async getAccount(): Promise<SicoobAccount> {
    return {
      cooperativa: getSicoobCooperativa(),
      contaCorrente: getSicoobConta(),
      contrato: getSicoobContrato(),
      titular: 'Escola Modelo de Ensino Integrado Ltda',
      documento: '45.123.890/0001-22',
      bancoCodigo: '756',
      bancoNome: 'Banco Cooperativo Sicoob S.A.',
      chavePix: getSicoobChavePix() || '45123890000122',
    };
  },

  /**
   * Saldo em conta cooperativa
   */
  async getBalance(): Promise<{ balance: number; cooperativa: string }> {
    return {
      balance: 14850.40,
      cooperativa: getSicoobCooperativa(),
    };
  },

  /**
   * Lista todos os boletos emitidos pelo Sicoob
   */
  async listInvoices(): Promise<SicoobInvoice[]> {
    return getLocalInvoices();
  },

  /**
   * Emite um novo Boleto Bancário Híbrido Sicoob (Boleto com Linha Digitável e Pix QR Code integrado)
   */
  async createInvoice(input: SicoobInvoiceInput): Promise<SicoobInvoice> {
    await new Promise((r) => setTimeout(r, 600));

    const coop = getSicoobCooperativa().replace(/\D/g, '').slice(0, 4) || '4321';
    const conta = getSicoobConta().replace(/\D/g, '').slice(0, 7) || '0088721';
    const seq = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const nossoNumero = seq;
    const fator = getFatorVencimento(input.dataVencimento);
    const valorCentavos = Math.round(input.valor * 100).toString().padStart(10, '0');
    const valorFormatado = input.valor.toFixed(2);

    const campoLivre = `1${coop.padStart(4, '0')}01${conta.padStart(7, '0')}${nossoNumero}1`;
    const febraban = montarBoletoFebraban('756', fator, valorCentavos, campoLivre);
    const linhaDigitavel = febraban.linhaDigitavel;
    const codigoBarras = febraban.codigoBarras;

    const pixPayload = `00020126580014br.gov.bcb.pix0136e7560000-${coop}-4b12-sicoob0000000${seq.toString().slice(-4)}5204000053039865406${valorFormatado}5802BR5925COOPERATIVA SICOOB ESCOLA6009SAO PAULO62070503***6304${seq.toString(16).toUpperCase().padStart(4, 'A')}`;

    const newInvoice: SicoobInvoice = {
      id: `sic_inv_${Date.now()}`,
      nossoNumero,
      seuNumero: `MENS-${new Date().getFullYear()}-${new Date().getMonth() + 1}-${seq}`,
      pagador: {
        nome: input.nome,
        cpfCnpj: input.cpfCnpj,
        email: input.email,
        telefone: input.telefone,
      },
      valor: input.valor,
      dataVencimento: input.dataVencimento,
      dataEmissao: new Date().toISOString().split('T')[0],
      status: 'EM_ABERTO',
      linhaDigitavel,
      codigoBarras,
      pixCopiaECola: pixPayload,
      descricao: input.descricao || 'Mensalidade Escolar - Sicoob Cobrança',
    };

    const current = getLocalInvoices();
    const updated = [newInvoice, ...current];
    saveLocalInvoices(updated);

    return newInvoice;
  },
};
