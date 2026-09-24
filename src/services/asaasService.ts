/**
 * Serviço de Integração Oficial Asaas Bank
 * Suporta emissão de Pix, Boletos, Cartão de Crédito e Extrato/Saldo bancário
 */

export const DEFAULT_ASAAS_API_KEY =
  import.meta.env.VITE_ASAAS_API_KEY || '';

export interface AsaasAccount {
  name: string;
  cpfCnpj: string;
  email: string;
  mobilePhone?: string;
  address?: string;
  province?: string;
  city?: { name: string; state: string };
  status: string;
}

export interface AsaasPixKey {
  id: string;
  key: string;
  type: string;
  status: string;
  qrCode?: {
    encodedImage: string;
    payload: string;
  };
}

export interface AsaasPayment {
  id: string;
  dateCreated: string;
  customer: string;
  value: number;
  netValue?: number;
  description?: string;
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED';
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH' | 'REFUND_REQUESTED' | 'CHARGEBACK_REQUESTED' | 'CHARGEBACK_DISPUTE' | 'AWAITING_CHARGEBACK_REVERSAL' | 'DUNNING_REQUESTED' | 'DUNNING_RECEIVED' | 'AWAITING_RISK_ANALYSIS';
  dueDate: string;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  invoiceUrl?: string;
  invoiceNumber?: string;
  bankSlipUrl?: string | null;
  transactionReceiptUrl?: string | null;
}

export interface CreatePaymentPayload {
  customerName: string;
  customerCpfCnpj?: string;
  customerEmail?: string;
  customerPhone?: string;
  value: number;
  dueDate: string; // YYYY-MM-DD
  description: string;
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  externalReference?: string;
}

export interface AsaasQrCodeResponse {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

export const getAsaasApiKey = (): string => {
  const saved = localStorage.getItem('escolinha_asaas_api_key');
  return saved && saved.trim() ? saved.trim() : DEFAULT_ASAAS_API_KEY;
};

export const setAsaasApiKey = (key: string) => {
  if (!key || key.trim() === '') {
    localStorage.removeItem('escolinha_asaas_api_key');
  } else {
    localStorage.setItem('escolinha_asaas_api_key', key.trim());
  }
};

const getBaseUrl = () => {
  // Em ambiente web local ou de desenvolvimento, usa o proxy do vite para evitar CORS
  return '/api/asaas';
};

const getHeaders = (apiKey?: string) => {
  const token = apiKey || getAsaasApiKey();
  return {
    'Content-Type': 'application/json',
    access_token: token,
  };
};

export const asaasService = {
  /**
   * Obtém o saldo atual da conta Asaas
   */
  async getBalance(apiKey?: string): Promise<{ balance: number }> {
    const res = await fetch(`${getBaseUrl()}/finance/balance`, {
      headers: getHeaders(apiKey),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.errors?.[0]?.description || `Erro ao buscar saldo: HTTP ${res.status}`);
    }
    return res.json();
  },

  /**
   * Obtém os dados cadastrais da conta Asaas
   */
  async getAccount(apiKey?: string): Promise<AsaasAccount> {
    const res = await fetch(`${getBaseUrl()}/myAccount`, {
      headers: getHeaders(apiKey),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.errors?.[0]?.description || `Erro ao buscar dados da conta: HTTP ${res.status}`);
    }
    return res.json();
  },

  /**
   * Obtém as chaves Pix ativas na conta com os seus QR Codes
   */
  async getPixKeys(apiKey?: string): Promise<AsaasPixKey[]> {
    const res = await fetch(`${getBaseUrl()}/pix/addressKeys`, {
      headers: getHeaders(apiKey),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.errors?.[0]?.description || `Erro ao buscar chaves Pix: HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.data || [];
  },

  /**
   * Lista as cobranças da conta Asaas
   */
  async getPayments(apiKey?: string, limit = 20): Promise<{ data: AsaasPayment[]; totalCount: number }> {
    const res = await fetch(`${getBaseUrl()}/payments?limit=${limit}&order=desc`, {
      headers: getHeaders(apiKey),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.errors?.[0]?.description || `Erro ao listar cobranças: HTTP ${res.status}`);
    }
    return res.json();
  },

  /**
   * Cria ou localiza um cliente no Asaas
   */
  async findOrCreateCustomer(
    payload: { name: string; cpfCnpj?: string; email?: string; phone?: string },
    apiKey?: string
  ): Promise<string> {
    const headers = getHeaders(apiKey);

    // Tentar localizar por CPF se fornecido
    if (payload.cpfCnpj) {
      const cleanCpf = payload.cpfCnpj.replace(/\D/g, '');
      const searchRes = await fetch(`${getBaseUrl()}/customers?cpfCnpj=${cleanCpf}`, { headers });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData?.data?.length > 0) {
          return searchData.data[0].id;
        }
      }
    }

    // Criar novo cliente
    const createRes = await fetch(`${getBaseUrl()}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: payload.name,
        cpfCnpj: payload.cpfCnpj ? payload.cpfCnpj.replace(/\D/g, '') : undefined,
        email: payload.email,
        mobilePhone: payload.phone ? payload.phone.replace(/\D/g, '') : undefined,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err?.errors?.[0]?.description || 'Erro ao cadastrar cliente no Asaas');
    }

    const newCustomer = await createRes.json();
    return newCustomer.id;
  },

  /**
   * Cria uma nova cobrança no Asaas (Pix, Boleto ou Cartão de Crédito)
   */
  async createPayment(payload: CreatePaymentPayload, apiKey?: string): Promise<AsaasPayment> {
    const customerId = await this.findOrCreateCustomer(
      {
        name: payload.customerName,
        cpfCnpj: payload.customerCpfCnpj,
        email: payload.customerEmail,
        phone: payload.customerPhone,
      },
      apiKey
    );

    const headers = getHeaders(apiKey);
    const body: Record<string, any> = {
      customer: customerId,
      billingType: payload.billingType,
      value: payload.value,
      dueDate: payload.dueDate,
      description: payload.description,
      externalReference: payload.externalReference,
    };

    const res = await fetch(`${getBaseUrl()}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.errors?.[0]?.description || 'Erro ao gerar cobrança no Asaas');
    }

    return res.json();
  },

  /**
   * Obtém o QR Code Pix e o Copia-e-Cola de uma cobrança Pix específica
   */
  async getPixQrCode(paymentId: string, apiKey?: string): Promise<AsaasQrCodeResponse> {
    const res = await fetch(`${getBaseUrl()}/payments/${paymentId}/pixQrCode`, {
      headers: getHeaders(apiKey),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.errors?.[0]?.description || 'Erro ao obter QR Code Pix');
    }
    return res.json();
  },

  /**
   * Testa a validade da chave de API
   */
  async testConnection(apiKey: string): Promise<{ success: boolean; accountName?: string; balance?: number; error?: string }> {
    try {
      const [balanceRes, accountRes] = await Promise.all([
        this.getBalance(apiKey),
        this.getAccount(apiKey),
      ]);
      return {
        success: true,
        accountName: accountRes.name,
        balance: balanceRes.balance,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Chave de API inválida ou sem permissão.',
      };
    }
  },
};

