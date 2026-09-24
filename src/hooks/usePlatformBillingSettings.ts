import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  PlatformPlanConfig,
  PlanAddon,
  SchoolOnboardingSubscription,
  PlatformCoupon,
  DEFAULT_PLATFORM_PLANS,
  DEFAULT_PLAN_ADDONS,
  DEFAULT_PLATFORM_COUPONS,
  PlatformModuleId,
} from '@/types/subscription';
import { toast } from 'sonner';

export interface GlobalBillingSettings {
  exigirPagamentoCadastro: boolean;
  diasVencimento: number;
  descricaoFaturaPadrao: string;
}

const DEFAULT_GLOBAL_SETTINGS: GlobalBillingSettings = {
  exigirPagamentoCadastro: true,
  diasVencimento: 1,
  descricaoFaturaPadrao: 'Adesão & 1ª Mensalidade da Escola - Purple Edu',
};

const PLANS_STORAGE_KEY = 'escolinha_platform_plans_v2';
const ADDONS_STORAGE_KEY = 'escolinha_platform_addons_v2';
const GLOBAL_SETTINGS_STORAGE_KEY = 'escolinha_platform_global_billing_v2';
const SUBSCRIPTIONS_STORAGE_KEY = 'escolinha_school_onboarding_subscriptions_v2';
const COUPONS_STORAGE_KEY = 'escolinha_platform_coupons_v1';
const SYNC_EVENT = 'escolinha-billing-settings-sync';

function getStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[BillingSettings] Erro ao ler ${key}:`, err);
  }
  return fallback;
}

function persistStoredValue<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[BillingSettings] Erro ao salvar ${key}:`, err);
  }
}

export function usePlatformBillingSettings() {
  const [plans, setPlans] = useState<PlatformPlanConfig[]>(() => {
    const stored = getStoredValue<PlatformPlanConfig[]>(PLANS_STORAGE_KEY, DEFAULT_PLATFORM_PLANS);
    const existingIds = new Set(stored.map((p) => p.id));
    const missing = DEFAULT_PLATFORM_PLANS.filter((p) => !existingIds.has(p.id));
    return missing.length > 0 ? [...stored, ...missing] : stored;
  });

  const [addons, setAddons] = useState<PlanAddon[]>(() => {
    const stored = getStoredValue<PlanAddon[]>(ADDONS_STORAGE_KEY, DEFAULT_PLAN_ADDONS);
    const existingIds = new Set(stored.map((a) => a.id));
    const missing = DEFAULT_PLAN_ADDONS.filter((a) => !existingIds.has(a.id));
    return missing.length > 0 ? [...stored, ...missing] : stored;
  });

  const [globalSettings, setGlobalSettings] = useState<GlobalBillingSettings>(() =>
    getStoredValue(GLOBAL_SETTINGS_STORAGE_KEY, DEFAULT_GLOBAL_SETTINGS)
  );

  const [schoolSubscriptions, setSchoolSubscriptions] = useState<
    Record<string, SchoolOnboardingSubscription>
  >(() => getStoredValue(SUBSCRIPTIONS_STORAGE_KEY, {}));

  const [coupons, setCoupons] = useState<PlatformCoupon[]>(() =>
    getStoredValue(COUPONS_STORAGE_KEY, DEFAULT_PLATFORM_COUPONS)
  );

  // Sincronização entre abas e instâncias locais
  useEffect(() => {
    const handleSync = () => {
      setPlans(getStoredValue(PLANS_STORAGE_KEY, DEFAULT_PLATFORM_PLANS));
      setAddons(getStoredValue(ADDONS_STORAGE_KEY, DEFAULT_PLAN_ADDONS));
      setGlobalSettings(getStoredValue(GLOBAL_SETTINGS_STORAGE_KEY, DEFAULT_GLOBAL_SETTINGS));
      setSchoolSubscriptions(getStoredValue(SUBSCRIPTIONS_STORAGE_KEY, {}));
      setCoupons(getStoredValue(COUPONS_STORAGE_KEY, DEFAULT_PLATFORM_COUPONS));
    };

    window.addEventListener(SYNC_EVENT, handleSync);
    window.addEventListener('storage', handleSync);

    // Tenta hidratar da nuvem (app_state)
    const hydrateFromCloud = async () => {
      try {
        const { data } = await supabase
          .from('app_state')
          .select('value')
          .eq('key', 'platform_billing_settings')
          .limit(1)
          .maybeSingle();

        if (data && data.value) {
          const cloudData = (data.value as any)?.data;
          if (cloudData) {
            if (cloudData.plans && Array.isArray(cloudData.plans)) {
              setPlans(cloudData.plans);
              persistStoredValue(PLANS_STORAGE_KEY, cloudData.plans);
            }
            if (cloudData.addons && Array.isArray(cloudData.addons)) {
              setAddons(cloudData.addons);
              persistStoredValue(ADDONS_STORAGE_KEY, cloudData.addons);
            }
            if (cloudData.globalSettings) {
              setGlobalSettings(cloudData.globalSettings);
              persistStoredValue(GLOBAL_SETTINGS_STORAGE_KEY, cloudData.globalSettings);
            }
            if (cloudData.schoolSubscriptions) {
              setSchoolSubscriptions(cloudData.schoolSubscriptions);
              persistStoredValue(SUBSCRIPTIONS_STORAGE_KEY, cloudData.schoolSubscriptions);
            }
            if (cloudData.coupons && Array.isArray(cloudData.coupons)) {
              setCoupons(cloudData.coupons);
              persistStoredValue(COUPONS_STORAGE_KEY, cloudData.coupons);
            }
          }
        }
      } catch (err) {
        // Silencioso
      }
    };

    void hydrateFromCloud();

    return () => {
      window.removeEventListener(SYNC_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const dispatchSync = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT));
    }
  };

  const syncToCloud = useCallback(
    async (
      updatedPlans?: PlatformPlanConfig[],
      updatedAddons?: PlanAddon[],
      updatedGlobal?: GlobalBillingSettings,
      updatedSubs?: Record<string, SchoolOnboardingSubscription>,
      updatedCoupons?: PlatformCoupon[]
    ) => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user?.id) return;

        const payload = {
          plans: updatedPlans || plans,
          addons: updatedAddons || addons,
          globalSettings: updatedGlobal || globalSettings,
          schoolSubscriptions: updatedSubs || schoolSubscriptions,
          coupons: updatedCoupons || coupons,
          updatedAt: new Date().toISOString(),
        };

        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', auth.user.id)
          .maybeSingle();

        let schoolId = profile?.school_id;
        if (!schoolId) {
          const { data: firstSchool } = await supabase
            .from('schools')
            .select('id')
            .limit(1)
            .maybeSingle();
          schoolId = firstSchool?.id;
        }

        if (schoolId) {
          await supabase.from('app_state').upsert(
            {
              school_id: schoolId,
              key: 'platform_billing_settings',
              value: { data: payload },
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'school_id,key' }
          );
        }
      } catch (e) {
        console.warn('[BillingSettings] Erro ao sincronizar com nuvem:', e);
      }
    },
    [plans, addons, globalSettings, schoolSubscriptions, coupons]
  );

  // Validação e Aplicação de Cupom
  const validateAndApplyCoupon = useCallback(
    (rawCode: string, subtotal: number) => {
      const cleanCode = rawCode.trim().toUpperCase();
      if (!cleanCode) {
        return { valid: false, message: 'Digite um código de cupom.', discountAmount: 0, finalTotal: subtotal };
      }

      const coupon = coupons.find((c) => c.code.toUpperCase() === cleanCode);
      if (!coupon) {
        return { valid: false, message: 'Cupom de desconto não encontrado.', discountAmount: 0, finalTotal: subtotal };
      }

      if (!coupon.is_active) {
        return { valid: false, message: 'Este cupom foi desativado.', discountAmount: 0, finalTotal: subtotal };
      }

      if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
        return { valid: false, message: 'Este cupom já expirou.', discountAmount: 0, finalTotal: subtotal };
      }

      if (coupon.max_uses !== null && coupon.max_uses !== undefined && coupon.times_used >= coupon.max_uses) {
        return { valid: false, message: 'Este cupom atingiu o limite máximo de usos.', discountAmount: 0, finalTotal: subtotal };
      }

      if (coupon.min_monthly_amount && subtotal < coupon.min_monthly_amount) {
        return {
          valid: false,
          message: `Válido apenas para mensalidades a partir de R$ ${coupon.min_monthly_amount.toFixed(2)}.`,
          discountAmount: 0,
          finalTotal: subtotal,
        };
      }

      let discount = 0;
      if (coupon.discount_type === 'percentage') {
        discount = (subtotal * coupon.discount_value) / 100;
      } else {
        discount = Math.min(coupon.discount_value, subtotal);
      }

      const finalTotal = Math.max(0, subtotal - discount);

      return {
        valid: true,
        coupon,
        discountAmount: discount,
        finalTotal,
        message:
          coupon.discount_type === 'percentage'
            ? `Cupom "${coupon.code}" aplicado: ${coupon.discount_value}% de desconto!`
            : `Cupom "${coupon.code}" aplicado: R$ ${coupon.discount_value.toFixed(2)} de desconto!`,
      };
    },
    [coupons]
  );

  const recordCouponUsage = useCallback(
    (rawCode: string) => {
      const cleanCode = rawCode.trim().toUpperCase();
      const updated = coupons.map((c) =>
        c.code.toUpperCase() === cleanCode ? { ...c, times_used: (c.times_used || 0) + 1 } : c
      );
      setCoupons(updated);
      persistStoredValue(COUPONS_STORAGE_KEY, updated);
      dispatchSync();
      void syncToCloud(undefined, undefined, undefined, undefined, updated);
    },
    [coupons, syncToCloud]
  );

  // Cálculos automáticos de preço
  const calculatePlanPrice = useCallback(
    (
      studentCount: number,
      selectedAddonIds: PlatformModuleId[] = [],
      preferredPlanId?: string,
      couponCode?: string
    ) => {
      const activePlans = plans.filter((p) => p.is_active);

      let matchingPlan: PlatformPlanConfig | undefined;

      // 1. Se foi especificado um plano preferido (ex: plano fixo selecionado manualmente)
      if (preferredPlanId) {
        matchingPlan = activePlans.find((p) => p.id === preferredPlanId);
      }

      // 2. Se não encontrou ou não especificou, procura por faixa de alunos entre planos 'students_tier'
      if (!matchingPlan) {
        const tierPlans = activePlans.filter((p) => p.pricing_model !== 'fixed_monthly');
        matchingPlan = tierPlans.find((p) => {
          if (p.max_students === null) {
            return studentCount >= p.min_students;
          }
          return studentCount >= p.min_students && studentCount <= p.max_students;
        });

        if (!matchingPlan && activePlans.length > 0) {
          matchingPlan = activePlans[0];
        }
      }

      const basePlanPrice = matchingPlan?.base_price || 149.0;
      const isFixedPlan = matchingPlan?.pricing_model === 'fixed_monthly';
      const isBlockPlan = matchingPlan?.pricing_model === 'students_block';

      let calculatedBasePrice = basePlanPrice;
      let blockCount = 0;
      let extraBlocks = 0;
      const blockSize = matchingPlan?.block_size || 50;
      const pricePerBlock = matchingPlan?.price_per_block || 39.0;
      const includedStudents = matchingPlan?.included_students ?? 50;

      if (isBlockPlan) {
        if (studentCount > includedStudents) {
          const excess = studentCount - includedStudents;
          extraBlocks = Math.ceil(excess / blockSize);
          calculatedBasePrice += extraBlocks * pricePerBlock;
        }
        blockCount = Math.ceil(studentCount / blockSize);
      }

      const basePrice = calculatedBasePrice;

      // Módulos inclusos no plano base
      const includedModules: PlatformModuleId[] = matchingPlan?.included_modules || ['alunos', 'pedagogico'];

      // Addons selecionados que NÃO estão inclusos na base
      const validAddons = addons.filter(
        (a) => a.is_active && selectedAddonIds.includes(a.id) && !includedModules.includes(a.id)
      );

      const addonsPrice = validAddons.reduce((sum, a) => sum + a.monthly_price, 0);
      const subtotal = basePrice + addonsPrice;

      // Aplicação de cupom de desconto se houver
      let discountAmount = 0;
      let appliedCoupon: PlatformCoupon | undefined;
      if (couponCode) {
        const couponResult = validateAndApplyCoupon(couponCode, subtotal);
        if (couponResult.valid) {
          discountAmount = couponResult.discountAmount;
          appliedCoupon = couponResult.coupon;
        }
      }

      const totalMonthly = Math.max(0, subtotal - discountAmount);

      // Todos os módulos ativos para a escola
      const allActiveModules: PlatformModuleId[] = Array.from(
        new Set([...includedModules, ...validAddons.map((a) => a.id)])
      );

      return {
        matchingPlan,
        isFixedPlan,
        isBlockPlan,
        blockCount,
        extraBlocks,
        blockSize,
        pricePerBlock,
        includedStudents,
        basePrice,
        validAddons,
        addonsPrice,
        subtotal,
        discountAmount,
        appliedCoupon,
        totalMonthly,
        allActiveModules,
      };
    },
    [plans, addons, validateAndApplyCoupon]
  );

  // Manipuladores de Planos
  const updatePlan = (id: string, updates: Partial<PlatformPlanConfig>) => {
    const updated = plans.map((p) => (p.id === id ? { ...p, ...updates } : p));
    setPlans(updated);
    persistStoredValue(PLANS_STORAGE_KEY, updated);
    dispatchSync();
    void syncToCloud(updated);
    toast.success('Plano atualizado com sucesso!');
  };

  const addPlan = (newPlan: Omit<PlatformPlanConfig, 'id'>) => {
    const planWithId: PlatformPlanConfig = {
      ...newPlan,
      id: `plan-${Date.now()}`,
    };
    const updated = [...plans, planWithId];
    setPlans(updated);
    persistStoredValue(PLANS_STORAGE_KEY, updated);
    dispatchSync();
    void syncToCloud(updated);
    toast.success(`Plano "${newPlan.name}" criado!`);
    return planWithId;
  };

  const deletePlan = (id: string) => {
    if (plans.length <= 1) {
      toast.error('É necessário manter pelo menos um plano ativo no sistema.');
      return;
    }
    const updated = plans.filter((p) => p.id !== id);
    setPlans(updated);
    persistStoredValue(PLANS_STORAGE_KEY, updated);
    dispatchSync();
    void syncToCloud(updated);
    toast.success('Plano removido.');
  };

  // Manipuladores de Addons
  const updateAddon = (id: PlatformModuleId, updates: Partial<PlanAddon>) => {
    const updated = addons.map((a) => (a.id === id ? { ...a, ...updates } : a));
    setAddons(updated);
    persistStoredValue(ADDONS_STORAGE_KEY, updated);
    dispatchSync();
    void syncToCloud(undefined, updated);
    toast.success('Valor do módulo adicional atualizado!');
  };

  // Manipuladores de Cupons
  const addCoupon = (newCoupon: Omit<PlatformCoupon, 'id' | 'times_used' | 'created_at'>) => {
    const cleanCode = newCoupon.code.trim().toUpperCase();
    if (coupons.some((c) => c.code.toUpperCase() === cleanCode)) {
      toast.error(`Já existe um cupom com o código "${cleanCode}".`);
      return null;
    }

    const couponWithId: PlatformCoupon = {
      ...newCoupon,
      code: cleanCode,
      id: `coupon-${Date.now()}`,
      times_used: 0,
      created_at: new Date().toISOString(),
    };

    const updated = [couponWithId, ...coupons];
    setCoupons(updated);
    persistStoredValue(COUPONS_STORAGE_KEY, updated);
    dispatchSync();
    void syncToCloud(undefined, undefined, undefined, undefined, updated);
    toast.success(`Cupom "${cleanCode}" criado com sucesso!`);
    return couponWithId;
  };

  const updateCoupon = (id: string, updates: Partial<PlatformCoupon>) => {
    const updated = coupons.map((c) => (c.id === id ? { ...c, ...updates } : c));
    setCoupons(updated);
    persistStoredValue(COUPONS_STORAGE_KEY, updated);
    dispatchSync();
    void syncToCloud(undefined, undefined, undefined, undefined, updated);
    toast.success('Cupom atualizado!');
  };

  const deleteCoupon = (id: string) => {
    const updated = coupons.filter((c) => c.id !== id);
    setCoupons(updated);
    persistStoredValue(COUPONS_STORAGE_KEY, updated);
    dispatchSync();
    void syncToCloud(undefined, undefined, undefined, undefined, updated);
    toast.success('Cupom removido.');
  };

  // Configurações Gerais
  const updateGlobalSettings = (updates: Partial<GlobalBillingSettings>) => {
    const updated = { ...globalSettings, ...updates };
    setGlobalSettings(updated);
    persistStoredValue(GLOBAL_SETTINGS_STORAGE_KEY, updated);
    dispatchSync();
    void syncToCloud(undefined, undefined, updated);
    toast.success('Configurações de cobrança atualizadas!');
  };

  // Assinaturas de Escolas
  const registerSchoolSubscription = (sub: SchoolOnboardingSubscription) => {
    const updated = {
      ...schoolSubscriptions,
      [sub.school_id]: sub,
    };
    setSchoolSubscriptions(updated);
    persistStoredValue(SUBSCRIPTIONS_STORAGE_KEY, updated);
    dispatchSync();
    void syncToCloud(undefined, undefined, undefined, updated);
  };

  const markSchoolAsPaid = (schoolId: string, paymentMethod: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'MANUAL' = 'PIX') => {
    const current = schoolSubscriptions[schoolId];
    if (!current) return;

    const updatedSub: SchoolOnboardingSubscription = {
      ...current,
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_method: paymentMethod,
    };

    const updated = {
      ...schoolSubscriptions,
      [schoolId]: updatedSub,
    };
    setSchoolSubscriptions(updated);
    persistStoredValue(SUBSCRIPTIONS_STORAGE_KEY, updated);
    dispatchSync();
    void syncToCloud(undefined, undefined, undefined, updated);
    toast.success(`Pagamento da 1ª mensalidade confirmado para "${current.school_name}"!`);
  };

  const markSchoolAsManualFree = (schoolId: string, reason = 'Liberado pelo SuperAdmin') => {
    const current = schoolSubscriptions[schoolId];
    const updatedSub: SchoolOnboardingSubscription = {
      school_id: schoolId,
      school_name: current?.school_name || 'Escola',
      plan_id: current?.plan_id || plans[0]?.id || 'plan-start',
      plan_name: current?.plan_name || plans[0]?.name || 'Start',
      pricing_model: current?.pricing_model || 'students_tier',
      estimated_students: current?.estimated_students || 100,
      selected_modules: current?.selected_modules || [
        'alunos',
        'pedagogico',
        'financeiro',
        'estoque',
        'comercial',
        'whatsapp',
        'portal',
      ],
      total_monthly_amount: current?.total_monthly_amount || 0,
      status: 'manual_free',
      exempt_reason: reason,
      paid_at: new Date().toISOString(),
      created_at: current?.created_at || new Date().toISOString(),
    };

    const updated = {
      ...schoolSubscriptions,
      [schoolId]: updatedSub,
    };
    setSchoolSubscriptions(updated);
    persistStoredValue(SUBSCRIPTIONS_STORAGE_KEY, updated);
    dispatchSync();
    void syncToCloud(undefined, undefined, undefined, updated);
    toast.success(`Acesso liberado manualmente com sucesso!`);
  };

  const getSchoolSubscription = (schoolId: string): SchoolOnboardingSubscription | null => {
    return schoolSubscriptions[schoolId] || null;
  };

  return {
    plans,
    addons,
    globalSettings,
    schoolSubscriptions,
    coupons,
    calculatePlanPrice,
    validateAndApplyCoupon,
    recordCouponUsage,
    updatePlan,
    addPlan,
    deletePlan,
    updateAddon,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    updateGlobalSettings,
    registerSchoolSubscription,
    markSchoolAsPaid,
    markSchoolAsManualFree,
    getSchoolSubscription,
  };
}
