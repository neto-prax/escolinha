export type PlatformModuleId =
  | 'alunos'
  | 'pedagogico'
  | 'financeiro'
  | 'boletos'
  | 'estoque'
  | 'comercial'
  | 'whatsapp'
  | 'portal';

export interface PlatformModuleInfo {
  id: PlatformModuleId;
  name: string;
  description: string;
  category: 'core' | 'financeiro' | 'comunicacao' | 'operacional';
  isEssential?: boolean; // Módulos indispensáveis que vêm em todos os planos
}

export const PLATFORM_MODULES: PlatformModuleInfo[] = [
  {
    id: 'alunos',
    name: 'Secretaria & Alunos',
    description: 'Cadastros, matrículas, turmas, documentos, transferências e contratos',
    category: 'core',
    isEssential: true,
  },
  {
    id: 'pedagogico',
    name: 'Diário Pedagógico',
    description: 'Diário de classe, planejamento, chamadas, avaliações, notas e médias',
    category: 'core',
    isEssential: true,
  },
  {
    id: 'financeiro',
    name: 'Gestão Financeira & Caixa',
    description: 'Contas a pagar e receber, caixas, salários, DRE, plano de contas e conciliação',
    category: 'financeiro',
  },
  {
    id: 'boletos',
    name: 'Lançamento de Boletos & Carnês (Asaas)',
    description: 'Emissão e registro de boletos bancários com código de barras, carnês escolares e Pix Asaas',
    category: 'financeiro',
  },
  {
    id: 'estoque',
    name: 'Estoque & Fardamento',
    description: 'Controle de fardas, livros, almoxarifado, vendas no balcão e consumo interno',
    category: 'operacional',
  },
  {
    id: 'comercial',
    name: 'Comercial & Captação',
    description: 'Funil CRM de novos alunos, acompanhamento de leads e metas de rematrícula',
    category: 'comunicacao',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp & Automações CRM',
    description: 'Disparos em massa, avisos automáticos de cobrança, chatbot e central de atendimento',
    category: 'comunicacao',
  },
  {
    id: 'portal',
    name: 'Portal do Aluno & Família',
    description: 'Acesso web exclusivo para pais e alunos acompanharem notas, boletos e recados',
    category: 'core',
  },
];

export type PlanPricingModel = 'students_tier' | 'fixed_monthly' | 'students_block';

export interface PlatformPlanConfig {
  id: string;
  name: string;
  description: string;
  pricing_model?: PlanPricingModel; // 'students_tier', 'fixed_monthly' ou 'students_block'
  min_students: number;
  max_students: number | null; // null = ilimitado
  base_price: number; // Preço mensal base (R$)
  included_modules: PlatformModuleId[];
  is_active: boolean;
  is_popular?: boolean;

  // Configurações para cobrança por bloco de alunos ('students_block'):
  block_size?: number; // Tamanho de cada bloco (ex: 50 alunos)
  price_per_block?: number; // Preço adicional por bloco (R$)
  included_students?: number; // Alunos inclusos no valor base antes de contar blocos adicionais (ex: 50 alunos)
}

export interface PlanAddon {
  id: PlatformModuleId;
  name: string;
  description: string;
  monthly_price: number; // Preço mensal adicional (R$)
  is_active: boolean;
}

export const DEFAULT_PLAN_ADDONS: PlanAddon[] = [
  {
    id: 'whatsapp',
    name: 'Módulo WhatsApp & Automações CRM',
    description: 'Disparos automáticos, avisos de cobrança e chatbot integrado',
    monthly_price: 59.0,
    is_active: true,
  },
  {
    id: 'estoque',
    name: 'Módulo de Estoque & Fardamento',
    description: 'Gestão de almoxarifado, uniformes escolares e vendas em balcão',
    monthly_price: 39.0,
    is_active: true,
  },
  {
    id: 'comercial',
    name: 'Módulo Comercial & Captação de Alunos',
    description: 'Funil Kanban de matrículas e gestão de interessados',
    monthly_price: 49.0,
    is_active: true,
  },
  {
    id: 'financeiro',
    name: 'Módulo Gestão Financeira & Caixa',
    description: 'Controle de contas a pagar, receitas, caixas e fluxo financeiro',
    monthly_price: 49.0,
    is_active: true,
  },
  {
    id: 'boletos',
    name: 'Módulo Lançamento de Boletos (Asaas)',
    description: 'Emissão e registro de boletos bancários com código de barras e carnês',
    monthly_price: 39.0,
    is_active: true,
  },
];

export const DEFAULT_PLATFORM_PLANS: PlatformPlanConfig[] = [
  {
    id: 'plan-start',
    name: 'Plano Start',
    description: 'Ideal para escolinhas e creches de pequeno porte iniciando a digitalização',
    pricing_model: 'students_tier',
    min_students: 0,
    max_students: 100,
    base_price: 149.0,
    included_modules: ['alunos', 'pedagogico'],
    is_active: true,
  },
  {
    id: 'plan-growth',
    name: 'Plano Crescimento',
    description: 'Para escolas em expansão que precisam de controle financeiro e portal dos pais',
    pricing_model: 'students_tier',
    min_students: 101,
    max_students: 300,
    base_price: 249.0,
    included_modules: ['alunos', 'pedagogico', 'financeiro', 'portal'],
    is_active: true,
    is_popular: true,
  },
  {
    id: 'plan-pro',
    name: 'Plano Profissional',
    description: 'Gestão escolar robusta com financeiro, boletos, estoque e portal',
    pricing_model: 'students_tier',
    min_students: 301,
    max_students: 600,
    base_price: 399.0,
    included_modules: ['alunos', 'pedagogico', 'financeiro', 'boletos', 'estoque', 'portal'],
    is_active: true,
  },
  {
    id: 'plan-enterprise',
    name: 'Plano Enterprise / Rede',
    description: 'Acesso irrestrito a todos os módulos, emissão de boletos, WhatsApp CRM e alunos ilimitados',
    pricing_model: 'students_tier',
    min_students: 601,
    max_students: null,
    base_price: 599.0,
    included_modules: ['alunos', 'pedagogico', 'financeiro', 'boletos', 'estoque', 'comercial', 'whatsapp', 'portal'],
    is_active: true,
  },
  {
    id: 'plan-block-standard',
    name: 'Plano por Blocos de Alunos',
    description: 'Mensalidade calculada por blocos de 50 alunos conforme o crescimento da escola',
    pricing_model: 'students_block',
    min_students: 0,
    max_students: null,
    base_price: 99.0,
    included_students: 50,
    block_size: 50,
    price_per_block: 39.0,
    included_modules: ['alunos', 'pedagogico', 'financeiro', 'boletos'],
    is_active: true,
  },
  {
    id: 'plan-fixed-flat',
    name: 'Plano Fixo Ilimitado (Sem Vínculo de Alunos)',
    description: 'Mensalidade única e fixa sem dependência da quantidade de alunos cadastrados na escola',
    pricing_model: 'fixed_monthly',
    min_students: 0,
    max_students: null,
    base_price: 299.0,
    included_modules: ['alunos', 'pedagogico', 'financeiro', 'boletos', 'estoque', 'portal'],
    is_active: true,
  },
];

export interface PlatformCoupon {
  id: string;
  code: string; // Ex: PROMO10, BEMVINDO50, DIRETOR10
  description?: string;
  discount_type: 'percentage' | 'fixed'; // '%' de desconto ou 'R$' fixo
  discount_value: number; // ex: 10 (%) ou 50 (R$)
  max_uses?: number | null; // null = ilimitado
  times_used: number;
  min_monthly_amount?: number | null; // Valor mínimo da mensalidade para aplicar
  valid_until?: string | null; // Data de validade (ISO string)
  is_active: boolean;
  applies_to_first_month_only?: boolean; // Se aplica apenas à 1ª mensalidade ou recorrente
  created_at: string;
  affiliate_name?: string; // Nome do afiliado ou diretor que ganha comissão
}

export const DEFAULT_PLATFORM_COUPONS: PlatformCoupon[] = [
  {
    id: 'coupon-promo10',
    code: 'PROMO10',
    description: '10% de desconto especial na primeira mensalidade',
    discount_type: 'percentage',
    discount_value: 10,
    max_uses: null,
    times_used: 0,
    is_active: true,
    applies_to_first_month_only: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'coupon-purple50',
    code: 'PURPLE50',
    description: 'R$ 50 de desconto na adesão da plataforma',
    discount_type: 'fixed',
    discount_value: 50.0,
    max_uses: null,
    times_used: 0,
    is_active: true,
    applies_to_first_month_only: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'coupon-diretor10',
    code: 'DIRETOR10',
    description: 'Cupom de indicação de diretor parceiro (10% de desconto)',
    discount_type: 'percentage',
    discount_value: 10,
    max_uses: null,
    times_used: 0,
    is_active: true,
    applies_to_first_month_only: false,
    affiliate_name: 'Diretoria Parceira',
    created_at: new Date().toISOString(),
  },
];

export interface SchoolOnboardingSubscription {
  school_id: string;
  school_name: string;
  plan_id: string;
  plan_name: string;
  pricing_model?: PlanPricingModel;
  estimated_students: number;
  selected_modules: PlatformModuleId[];
  total_monthly_amount: number;
  original_amount?: number;
  coupon_code?: string;
  discount_amount?: number;
  status: 'pending' | 'paid' | 'manual_free' | 'cancelled';
  created_at: string;
  paid_at?: string;
  payment_method?: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'MANUAL';
  payment_id?: string;
  invoice_url?: string;
  pix_copy_paste?: string;
  pix_qr_code_url?: string;
  exempt_reason?: string;
}
