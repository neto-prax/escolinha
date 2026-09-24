import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Users,
  Layers,
  Sparkles,
  CheckCircle2,
  PackageCheck,
  Tag,
  Save,
  Copy,
  Infinity as InfinityIcon,
  Percent,
  Boxes,
} from 'lucide-react';
import { usePlatformBillingSettings } from '@/hooks/usePlatformBillingSettings';
import {
  PlatformPlanConfig,
  PlatformModuleId,
  PLATFORM_MODULES,
  PlanAddon,
  PlatformCoupon,
  PlanPricingModel,
} from '@/types/subscription';
import { toast } from 'sonner';

export const PlanManager: React.FC = () => {
  const {
    plans,
    addons,
    globalSettings,
    coupons,
    updatePlan,
    addPlan,
    deletePlan,
    updateAddon,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    updateGlobalSettings,
  } = usePlatformBillingSettings();

  // Plan Dialog
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlatformPlanConfig | null>(null);

  // Form states for Plan
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [pricingModel, setPricingModel] = useState<PlanPricingModel>('students_tier');
  const [minStudents, setMinStudents] = useState(0);
  const [maxStudents, setMaxStudents] = useState<string>('');
  const [basePrice, setBasePrice] = useState<number>(149);
  const [includedModules, setIncludedModules] = useState<PlatformModuleId[]>(['alunos', 'pedagogico']);
  const [isActive, setIsActive] = useState(true);

  // Configurações para cobrança por bloco de alunos
  const [blockSize, setBlockSize] = useState<number>(50);
  const [pricePerBlock, setPricePerBlock] = useState<number>(39);
  const [includedStudents, setIncludedStudents] = useState<number>(50);

  // Edit Addon Dialog
  const [editingAddon, setEditingAddon] = useState<PlanAddon | null>(null);
  const [addonPrice, setAddonPrice] = useState<number>(0);

  // Coupon Dialog
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<PlatformCoupon | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponDescription, setCouponDescription] = useState('');
  const [couponDiscountType, setCouponDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponDiscountValue, setCouponDiscountValue] = useState<number>(10);
  const [couponMaxUses, setCouponMaxUses] = useState<string>('');
  const [couponValidUntil, setCouponValidUntil] = useState<string>('');
  const [couponFirstMonthOnly, setCouponFirstMonthOnly] = useState(true);
  const [couponAffiliateName, setCouponAffiliateName] = useState('');

  const handleOpenNewPlan = () => {
    setEditingPlan(null);
    setPlanName('');
    setPlanDescription('');
    setPricingModel('students_tier');
    setMinStudents(0);
    setMaxStudents('100');
    setBasePrice(149);
    setBlockSize(50);
    setPricePerBlock(39);
    setIncludedStudents(50);
    setIncludedModules(['alunos', 'pedagogico']);
    setIsActive(true);
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlan = (p: PlatformPlanConfig) => {
    setEditingPlan(p);
    setPlanName(p.name);
    setPlanDescription(p.description);
    setPricingModel(p.pricing_model || 'students_tier');
    setMinStudents(p.min_students);
    setMaxStudents(p.max_students === null ? '' : String(p.max_students));
    setBasePrice(p.base_price);
    setBlockSize(p.block_size || 50);
    setPricePerBlock(p.price_per_block || 39);
    setIncludedStudents(p.included_students ?? 50);
    setIncludedModules([...p.included_modules]);
    setIsActive(p.is_active);
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim()) return;

    const parsedMax =
      pricingModel === 'fixed_monthly' || pricingModel === 'students_block'
        ? null
        : maxStudents.trim() === ''
        ? null
        : Number(maxStudents);

    const planPayload: Partial<PlatformPlanConfig> = {
      name: planName.trim(),
      description: planDescription.trim(),
      pricing_model: pricingModel,
      min_students: pricingModel === 'students_tier' ? Number(minStudents) || 0 : 0,
      max_students: parsedMax,
      base_price: Number(basePrice) || 0,
      included_modules: includedModules,
      is_active: isActive,
      block_size: pricingModel === 'students_block' ? Number(blockSize) || 50 : undefined,
      price_per_block: pricingModel === 'students_block' ? Number(pricePerBlock) || 0 : undefined,
      included_students: pricingModel === 'students_block' ? Number(includedStudents) || 0 : undefined,
    };

    if (editingPlan) {
      updatePlan(editingPlan.id, planPayload);
    } else {
      addPlan(planPayload as PlatformPlanConfig);
    }

    setIsPlanModalOpen(false);
  };

  const toggleModule = (modId: PlatformModuleId) => {
    if (modId === 'alunos' || modId === 'pedagogico') return;
    if (includedModules.includes(modId)) {
      setIncludedModules(includedModules.filter((m) => m !== modId));
    } else {
      setIncludedModules([...includedModules, modId]);
    }
  };

  // Coupon Handlers
  const handleOpenNewCoupon = () => {
    setEditingCoupon(null);
    setCouponCode('');
    setCouponDescription('');
    setCouponDiscountType('percentage');
    setCouponDiscountValue(10);
    setCouponMaxUses('');
    setCouponValidUntil('');
    setCouponFirstMonthOnly(true);
    setCouponAffiliateName('');
    setIsCouponModalOpen(true);
  };

  const handleOpenEditCoupon = (c: PlatformCoupon) => {
    setEditingCoupon(c);
    setCouponCode(c.code);
    setCouponDescription(c.description || '');
    setCouponDiscountType(c.discount_type);
    setCouponDiscountValue(c.discount_value);
    setCouponMaxUses(c.max_uses === null || c.max_uses === undefined ? '' : String(c.max_uses));
    setCouponValidUntil(c.valid_until ? c.valid_until.split('T')[0] : '');
    setCouponFirstMonthOnly(c.applies_to_first_month_only !== false);
    setCouponAffiliateName(c.affiliate_name || '');
    setIsCouponModalOpen(true);
  };

  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      toast.error('Digite o código do cupom.');
      return;
    }

    const cleanCode = couponCode.trim().toUpperCase();
    const parsedMax = couponMaxUses.trim() === '' ? null : Number(couponMaxUses);
    const parsedDate = couponValidUntil ? new Date(couponValidUntil).toISOString() : null;

    if (editingCoupon) {
      updateCoupon(editingCoupon.id, {
        code: cleanCode,
        description: couponDescription.trim() || undefined,
        discount_type: couponDiscountType,
        discount_value: Number(couponDiscountValue) || 0,
        max_uses: parsedMax,
        valid_until: parsedDate,
        applies_to_first_month_only: couponFirstMonthOnly,
        affiliate_name: couponAffiliateName.trim() || undefined,
      });
    } else {
      addCoupon({
        code: cleanCode,
        description: couponDescription.trim() || undefined,
        discount_type: couponDiscountType,
        discount_value: Number(couponDiscountValue) || 0,
        max_uses: parsedMax,
        valid_until: parsedDate,
        applies_to_first_month_only: couponFirstMonthOnly,
        affiliate_name: couponAffiliateName.trim() || undefined,
        is_active: true,
      });
    }

    setIsCouponModalOpen(false);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <Card className="border-purple-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-50 via-purple-50/50 to-white dark:from-purple-950/30 dark:to-transparent border-b border-purple-100 dark:border-purple-900/40 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#6b26d9]" /> Planos, Cupons & Cobrança de Novas Escolas
              </CardTitle>
              <Badge className="bg-[#6b26d9] text-white hover:bg-[#581c87] text-[10px] font-semibold">
                SuperAdmin
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Configure planos por faixa de alunos ou preço fixo, módulos adicionais e cupons de desconto promocionais.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleOpenNewCoupon}
              className="border-purple-300 text-[#6b26d9] hover:bg-purple-50 text-xs font-semibold"
            >
              <Tag className="h-3.5 w-3.5 mr-1" /> Novo Cupom
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleOpenNewPlan}
              className="bg-[#6b26d9] hover:bg-[#581c87] text-white text-xs font-semibold shadow-sm"
            >
              <Plus className="h-4 w-4 mr-1" /> Criar Plano
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        {/* PARTE 1: CONFIGURAÇÃO DE EXIGÊNCIA DA 1ª MENSALIDADE */}
        <div className="p-4 rounded-xl border border-purple-200/80 bg-purple-50/40 dark:bg-purple-950/20 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-purple-950 dark:text-purple-200">
                  Exigir Pagamento da 1ª Mensalidade no Cadastro de Novas Escolas
                </span>
                <Badge variant={globalSettings.exigirPagamentoCadastro ? 'default' : 'secondary'} className="text-[10px]">
                  {globalSettings.exigirPagamentoCadastro ? 'Ativo (Obrigatório)' : 'Opcional / Teste'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Ao ativar, qualquer escola recém-cadastrada deverá escolher o plano e realizar o pagamento via Pix Asaas para liberar o painel.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Label htmlFor="switch-onboarding" className="text-xs font-semibold text-slate-700">
                Cobrança Imediata
              </Label>
              <Switch
                id="switch-onboarding"
                checked={globalSettings.exigirPagamentoCadastro}
                onCheckedChange={(checked) => updateGlobalSettings({ exigirPagamentoCadastro: checked })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-purple-100 dark:border-purple-900/40">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Descrição Padrão na Fatura / Pix
              </Label>
              <Input
                value={globalSettings.descricaoFaturaPadrao}
                onChange={(e) => updateGlobalSettings({ descricaoFaturaPadrao: e.target.value })}
                className="text-xs bg-white"
                placeholder="Ex: Adesão & 1ª Mensalidade - Purple Edu"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Prazo de Vencimento Inicial (dias)
              </Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={globalSettings.diasVencimento}
                onChange={(e) => updateGlobalSettings({ diasVencimento: Number(e.target.value) || 1 })}
                className="text-xs bg-white"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* PARTE 2: PLANOS (POR FAIXA DE ALUNOS OU PREÇO FIXO) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-[#6b26d9]" /> Planos Cadastrados (Por Faixa de Alunos ou Preço Fixo)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Você pode criar planos vinculados à quantidade de alunos ou planos com mensalidade fixa ilimitada.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const isFixed = plan.pricing_model === 'fixed_monthly';

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all ${
                    plan.is_popular
                      ? 'border-[#6b26d9] bg-purple-50/30 dark:bg-purple-950/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  } ${!plan.is_active ? 'opacity-50' : ''}`}
                >
                  {plan.is_popular && (
                    <Badge className="absolute -top-2.5 right-3 bg-[#6b26d9] text-white text-[9px] uppercase tracking-wider">
                      Mais Popular
                    </Badge>
                  )}

                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{plan.name}</h4>
                      <span className="text-xs font-black text-[#6b26d9] bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded-full shrink-0">
                        {formatCurrency(plan.base_price)}/mês
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3 min-h-[32px]">
                      {plan.description}
                    </p>

                    {/* Badge do Modelo de Precificação */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold mb-3 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                      {plan.pricing_model === 'students_block' ? (
                        <>
                          <Boxes className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                          <span className="text-purple-700 font-bold">
                            Blocos de {plan.block_size || 50} alunos (+{formatCurrency(plan.price_per_block || 39)}/bloco)
                          </span>
                        </>
                      ) : isFixed ? (
                        <>
                          <InfinityIcon className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="text-emerald-700 font-bold">Preço Fixo (Alunos Ilimitados)</span>
                        </>
                      ) : (
                        <>
                          <Users className="h-3.5 w-3.5 text-[#6b26d9] shrink-0" />
                          <span>
                            {plan.max_students === null
                              ? `A partir de ${plan.min_students} alunos`
                              : `${plan.min_students} a ${plan.max_students} alunos`}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Módulos inclusos no plano */}
                    <div className="space-y-1.5 mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Módulos Inclusos:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {plan.included_modules.map((mId) => {
                          const info = PLATFORM_MODULES.find((m) => m.id === mId);
                          return (
                            <span
                              key={mId}
                              className="inline-flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-medium"
                            >
                              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                              {info?.name.split('&')[0].trim() || mId}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Ações do plano */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditPlan(plan)}
                      className="flex-1 h-8 text-xs font-semibold hover:border-purple-300"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    {plans.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Remover o plano "${plan.name}"?`)) {
                            deletePlan(plan.id);
                          }
                        }}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        title="Excluir plano"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* PARTE 3: SISTEMA DE CUPONS DE DESCONTO */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="h-4 w-4 text-[#6b26d9]" /> Sistema de Cupons de Desconto
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Crie cupons promocionais para abater percentual (%) ou valor fixo (R$) na mensalidade das escolas.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleOpenNewCoupon}
              className="bg-purple-50 text-[#6b26d9] hover:bg-purple-100 border border-purple-200 text-xs font-semibold h-8"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Cupom
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {coupons.map((coupon) => {
              const isExpired = coupon.valid_until && new Date(coupon.valid_until) < new Date();

              return (
                <div
                  key={coupon.id}
                  className={`p-4 rounded-xl border bg-white dark:bg-slate-900 flex flex-col justify-between transition-all ${
                    coupon.is_active && !isExpired
                      ? 'border-purple-200 shadow-sm'
                      : 'border-slate-200 opacity-60 bg-slate-50'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-sm px-2 py-0.5 bg-purple-100 dark:bg-purple-900/60 text-[#6b26d9] rounded border border-purple-300">
                          {coupon.code}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(coupon.code);
                            toast.success(`Código "${coupon.code}" copiado!`);
                          }}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-slate-900"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>

                      <Badge
                        className={
                          coupon.discount_type === 'percentage'
                            ? 'bg-emerald-600 text-white font-bold text-xs'
                            : 'bg-blue-600 text-white font-bold text-xs'
                        }
                      >
                        {coupon.discount_type === 'percentage'
                          ? `${coupon.discount_value}% OFF`
                          : `- ${formatCurrency(coupon.discount_value)}`}
                      </Badge>
                    </div>

                    {coupon.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{coupon.description}</p>
                    )}

                    <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 pt-1">
                      <div className="flex justify-between">
                        <span>Usos realizados:</span>
                        <span className="font-semibold">
                          {coupon.times_used} {coupon.max_uses ? `/ ${coupon.max_uses}` : '(Ilimitado)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Validade:</span>
                        <span className={isExpired ? 'text-destructive font-bold' : 'font-medium'}>
                          {coupon.valid_until
                            ? new Date(coupon.valid_until).toLocaleDateString('pt-BR')
                            : 'Indeterminada'}
                        </span>
                      </div>
                      {coupon.affiliate_name && (
                        <div className="flex justify-between text-purple-700">
                          <span>Parceiro:</span>
                          <span className="font-semibold">{coupon.affiliate_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 mt-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={coupon.is_active}
                        onCheckedChange={(checked) => updateCoupon(coupon.id, { is_active: checked })}
                        className="data-[state=checked]:bg-[#6b26d9] scale-90"
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {coupon.is_active ? 'Ativo' : 'Pausado'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditCoupon(coupon)}
                        className="h-7 px-2 text-xs"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Excluir o cupom "${coupon.code}"?`)) {
                            deleteCoupon(coupon.id);
                          }
                        }}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* PARTE 4: MÓDULOS ADICIONAIS (ADD-ONS) */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-[#6b26d9]" /> Módulos Específicos & Add-ons Opcionais
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Valores adicionais mensais caso a escola deseje adicionar módulos específicos além dos inclusos no plano base.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {addons.map((addon) => (
              <div
                key={addon.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between"
              >
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{addon.name}</span>
                    <Badge variant={addon.is_active ? 'default' : 'secondary'} className="text-[9px]">
                      {addon.is_active ? 'Ativo' : 'Pausado'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 min-h-[30px]">
                    {addon.description}
                  </p>
                  <div className="text-lg font-black text-[#6b26d9]">
                    + {formatCurrency(addon.monthly_price)}
                    <span className="text-xs font-normal text-muted-foreground">/mês</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingAddon(addon);
                      setAddonPrice(addon.monthly_price);
                    }}
                    className="flex-1 h-8 text-xs font-semibold"
                  >
                    Alterar Preço
                  </Button>
                  <Switch
                    checked={addon.is_active}
                    onCheckedChange={(checked) => updateAddon(addon.id, { is_active: checked })}
                    className="data-[state=checked]:bg-[#6b26d9]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      {/* MODAL PARA CRIAR / EDITAR PLANO (100% RESPONSIVO COM CABEÇALHO/RODAPÉ FIXOS E SCROLL INTERNO) */}
      <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-purple-200 shadow-2xl">
          <form onSubmit={handleSavePlan} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogHeader className="p-5 pb-4 border-b border-purple-100 dark:border-purple-900/40 shrink-0 bg-purple-50/30 dark:bg-purple-950/20">
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#6b26d9]" />
                {editingPlan ? 'Editar Plano da Plataforma' : 'Novo Plano da Plataforma'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure o modelo de cobrança (por bloco de alunos, faixa fixa ou valor mensal fixo), valores e módulos inclusos.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* MODELO DE PRECIFICAÇÃO */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-900 dark:text-slate-200">
                  Modelo de Cobrança da Mensalidade *
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div
                    onClick={() => setPricingModel('students_block')}
                    className={`p-3 rounded-lg border cursor-pointer text-xs transition-all flex flex-col justify-between ${
                      pricingModel === 'students_block'
                        ? 'border-[#6b26d9] bg-purple-50/80 dark:bg-purple-950/40 ring-1 ring-[#6b26d9]'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-[#6b26d9] mb-1">
                        <Boxes className="h-4 w-4" /> Por Bloco de Alunos
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        Preço base + acréscimo automático a cada novo bloco de alunos (ex: a cada 50 alunos).
                      </p>
                    </div>
                    {pricingModel === 'students_block' && (
                      <span className="text-[9px] font-bold text-purple-700 dark:text-purple-300 mt-2">
                        ✓ Selecionado
                      </span>
                    )}
                  </div>

                  <div
                    onClick={() => setPricingModel('students_tier')}
                    className={`p-3 rounded-lg border cursor-pointer text-xs transition-all flex flex-col justify-between ${
                      pricingModel === 'students_tier'
                        ? 'border-[#6b26d9] bg-purple-50/80 dark:bg-purple-950/40 ring-1 ring-[#6b26d9]'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-[#6b26d9] mb-1">
                        <Users className="h-4 w-4" /> Por Faixa Fixa
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        Valor único escalonado por intervalo fechado de alunos (ex: 0 a 100 alunos).
                      </p>
                    </div>
                    {pricingModel === 'students_tier' && (
                      <span className="text-[9px] font-bold text-purple-700 dark:text-purple-300 mt-2">
                        ✓ Selecionado
                      </span>
                    )}
                  </div>

                  <div
                    onClick={() => setPricingModel('fixed_monthly')}
                    className={`p-3 rounded-lg border cursor-pointer text-xs transition-all flex flex-col justify-between ${
                      pricingModel === 'fixed_monthly'
                        ? 'border-[#6b26d9] bg-purple-50/80 dark:bg-purple-950/40 ring-1 ring-[#6b26d9]'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-emerald-600 mb-1">
                        <InfinityIcon className="h-4 w-4" /> Preço Fixo Mensal
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        Mensalidade única sem limite de alunos e sem cobrança por matrícula.
                      </p>
                    </div>
                    {pricingModel === 'fixed_monthly' && (
                      <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 mt-2">
                        ✓ Selecionado
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* DADOS BÁSICOS DO PLANO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Nome do Plano *</Label>
                  <Input
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="Ex: Plano Escolar por Blocos ou Plano Ilimitado"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Descrição / Subtítulo</Label>
                  <Input
                    value={planDescription}
                    onChange={(e) => setPlanDescription(e.target.value)}
                    placeholder="Ex: R$ 99 até 50 alunos + R$ 39 por bloco de 50 alunos"
                  />
                </div>

                {/* CAMPOS ESPECÍFICOS PARA PLANO POR BLOCOS */}
                {pricingModel === 'students_block' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Preço Mensal Base (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={basePrice}
                        onChange={(e) => setBasePrice(Number(e.target.value))}
                        placeholder="99.00"
                        required
                      />
                      <span className="text-[10px] text-muted-foreground">Valor inicial contratado</span>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Alunos Inclusos no Preço Base</Label>
                      <Input
                        type="number"
                        min={1}
                        value={includedStudents}
                        onChange={(e) => setIncludedStudents(Number(e.target.value) || 0)}
                        placeholder="50"
                        required
                      />
                      <span className="text-[10px] text-muted-foreground">Até quantos alunos cobre o valor base</span>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Tamanho do Bloco Adicional (Alunos) *</Label>
                      <Input
                        type="number"
                        min={1}
                        value={blockSize}
                        onChange={(e) => setBlockSize(Number(e.target.value) || 1)}
                        placeholder="50"
                        required
                      />
                      <span className="text-[10px] text-muted-foreground">Ex: a cada 50 alunos a mais</span>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Preço por Bloco Adicional (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={pricePerBlock}
                        onChange={(e) => setPricePerBlock(Number(e.target.value) || 0)}
                        placeholder="39.00"
                        required
                      />
                      <span className="text-[10px] text-muted-foreground">Valor cobrado por cada novo bloco</span>
                    </div>

                    {/* SIMULAÇÃO AO VIVO DO PLANO POR BLOCO */}
                    <div className="sm:col-span-2 p-3 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-lg space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 dark:text-purple-200">
                        <Boxes className="h-4 w-4 text-[#6b26d9]" />
                        Simulação de Cobrança Conforme Quantidade de Alunos:
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                        <div className="bg-white dark:bg-slate-900 p-2 rounded border border-purple-100 dark:border-purple-900/60">
                          <div className="text-[11px] text-muted-foreground">Até {includedStudents} alunos</div>
                          <div className="font-black text-[#6b26d9] mt-0.5">{formatCurrency(basePrice)}/mês</div>
                          <div className="text-[9px] text-emerald-600 font-semibold mt-0.5">Base incluída</div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2 rounded border border-purple-100 dark:border-purple-900/60">
                          <div className="text-[11px] text-muted-foreground">
                            {Number(includedStudents) + Number(blockSize)} alunos
                          </div>
                          <div className="font-black text-slate-800 dark:text-slate-100 mt-0.5">
                            {formatCurrency(Number(basePrice) + Number(pricePerBlock))}/mês
                          </div>
                          <div className="text-[9px] text-purple-600 font-semibold mt-0.5">+1 bloco</div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2 rounded border border-purple-100 dark:border-purple-900/60">
                          <div className="text-[11px] text-muted-foreground">
                            {Number(includedStudents) + Number(blockSize) * 2} alunos
                          </div>
                          <div className="font-black text-slate-800 dark:text-slate-100 mt-0.5">
                            {formatCurrency(Number(basePrice) + Number(pricePerBlock) * 2)}/mês
                          </div>
                          <div className="text-[9px] text-purple-600 font-semibold mt-0.5">+2 blocos</div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2 rounded border border-purple-100 dark:border-purple-900/60">
                          <div className="text-[11px] text-muted-foreground">
                            {Number(includedStudents) + Number(blockSize) * 3} alunos
                          </div>
                          <div className="font-black text-slate-800 dark:text-slate-100 mt-0.5">
                            {formatCurrency(Number(basePrice) + Number(pricePerBlock) * 3)}/mês
                          </div>
                          <div className="text-[9px] text-purple-600 font-semibold mt-0.5">+3 blocos</div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* CAMPOS ESPECÍFICOS PARA FAIXA FIXA */}
                {pricingModel === 'students_tier' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Alunos Mínimos</Label>
                      <Input
                        type="number"
                        min={0}
                        value={minStudents}
                        onChange={(e) => setMinStudents(Number(e.target.value))}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Alunos Máximos (Vazio = Ilimitado)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={maxStudents}
                        onChange={(e) => setMaxStudents(e.target.value)}
                        placeholder="Deixe vazio para ilimitado"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-semibold">Preço Mensal Fixo desta Faixa (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={basePrice}
                        onChange={(e) => setBasePrice(Number(e.target.value))}
                        required
                      />
                    </div>
                  </>
                )}

                {/* CAMPOS ESPECÍFICOS PARA PREÇO FIXO ILIMITADO */}
                {pricingModel === 'fixed_monthly' && (
                  <>
                    <div className="sm:col-span-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                      <InfinityIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>
                        Neste modelo, a escola paga uma mensalidade fixa de valor único, sem qualquer limite ou cobrança por quantidade de alunos.
                      </span>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-semibold">Preço Mensal Fixo (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={basePrice}
                        onChange={(e) => setBasePrice(Number(e.target.value))}
                        required
                      />
                    </div>
                  </>
                )}
              </div>

              {/* SELEÇÃO DE MÓDULOS INCLUSOS */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Módulos Inclusos neste Plano:
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    {includedModules.length} selecionado(s)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PLATFORM_MODULES.map((mod) => {
                    const isChecked = includedModules.includes(mod.id);
                    const isLocked = mod.isEssential;

                    return (
                      <div
                        key={mod.id}
                        onClick={() => toggleModule(mod.id)}
                        className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked
                            ? 'border-purple-300 bg-purple-50/60 dark:bg-purple-950/30'
                            : 'border-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800/50'
                        } ${isLocked ? 'cursor-not-allowed opacity-90' : ''}`}
                      >
                        <div className="space-y-0.5 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-900 dark:text-white">{mod.name}</span>
                            {isLocked && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0">
                                Essencial
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-snug">{mod.description}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isLocked}
                          onChange={() => {}}
                          className="h-4 w-4 rounded text-[#6b26d9] accent-[#6b26d9] shrink-0"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsPlanModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#6b26d9] hover:bg-[#581c87] text-white">
                <Save className="h-4 w-4 mr-1.5" /> Salvar Plano
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL PARA CRIAR / EDITAR CUPOM (RESPONSIVO COM CABEÇALHO/RODAPÉ FIXOS) */}
      <Dialog open={isCouponModalOpen} onOpenChange={setIsCouponModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden border-purple-200 shadow-2xl">
          <form onSubmit={handleSaveCoupon} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogHeader className="p-5 pb-4 border-b border-purple-100 dark:border-purple-900/40 shrink-0 bg-purple-50/30 dark:bg-purple-950/20">
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Tag className="h-5 w-5 text-[#6b26d9]" />
                {editingCoupon ? 'Editar Cupom de Desconto' : 'Criar Novo Cupom'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure o código promocional e as regras de abatimento na mensalidade da escola.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Código do Cupom *</Label>
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Ex: PROMO20 ou DIRETOR10"
                  className="font-mono font-bold uppercase tracking-wider"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Descrição / Finalidade</Label>
                <Input
                  value={couponDescription}
                  onChange={(e) => setCouponDescription(e.target.value)}
                  placeholder="Ex: Desconto de inauguração para novas escolas"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Tipo de Desconto</Label>
                  <Select
                    value={couponDiscountType}
                    onValueChange={(val: any) => setCouponDiscountType(val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentual (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">
                    {couponDiscountType === 'percentage' ? 'Percentual (% OFF) *' : 'Valor do Desconto (R$) *'}
                  </Label>
                  <Input
                    type="number"
                    step={couponDiscountType === 'percentage' ? '1' : '0.01'}
                    min={1}
                    max={couponDiscountType === 'percentage' ? 100 : 10000}
                    value={couponDiscountValue}
                    onChange={(e) => setCouponDiscountValue(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Limite de Usos (Vazio = Ilimitado)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={couponMaxUses}
                    onChange={(e) => setCouponMaxUses(e.target.value)}
                    placeholder="Sem limite"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Data de Validade (Opcional)</Label>
                  <Input
                    type="date"
                    value={couponValidUntil}
                    onChange={(e) => setCouponValidUntil(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Afiliado / Diretor Vinculado (Opcional)</Label>
                <Input
                  value={couponAffiliateName}
                  onChange={(e) => setCouponAffiliateName(e.target.value)}
                  placeholder="Ex: Prof. Marcos / Escola Parceira"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs font-semibold block">Apenas na 1ª Mensalidade</span>
                  <span className="text-[10px] text-muted-foreground block">
                    Aplica o desconto na adesão inicial da escola
                  </span>
                </div>
                <Switch
                  checked={couponFirstMonthOnly}
                  onCheckedChange={setCouponFirstMonthOnly}
                  className="data-[state=checked]:bg-[#6b26d9]"
                />
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsCouponModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#6b26d9] hover:bg-[#581c87] text-white">
                <Save className="h-4 w-4 mr-1.5" /> Salvar Cupom
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL PARA ALTERAR PREÇO DO ADDON (RESPONSIVO) */}
      {editingAddon && (
        <Dialog open={!!editingAddon} onOpenChange={(open) => !open && setEditingAddon(null)}>
          <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Alterar Valor do Módulo</DialogTitle>
              <DialogDescription className="text-xs">
                Defina o valor adicional mensal para "{editingAddon.name}".
              </DialogDescription>
            </DialogHeader>

            <div className="py-3 space-y-2">
              <Label className="text-xs font-semibold">Preço Mensal Adicional (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={addonPrice}
                onChange={(e) => setAddonPrice(Number(e.target.value))}
                className="font-bold text-base"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingAddon(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  updateAddon(editingAddon.id, { monthly_price: Number(addonPrice) || 0 });
                  setEditingAddon(null);
                }}
                className="bg-[#6b26d9] hover:bg-[#581c87] text-white font-bold"
              >
                Salvar Valor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};
