import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  CheckCircle2,
  Sparkles,
  QrCode,
  CreditCard,
  FileText,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Lock,
  ExternalLink,
  MessageCircle,
  Clock,
  Building2,
  Package,
  LogOut,
  Tag,
  Gift,
  Infinity as InfinityIcon,
  X,
  Boxes,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePlatformBillingSettings } from '@/hooks/usePlatformBillingSettings';
import { useAuth } from '@/contexts/AuthContext';
import { asaasService } from '@/services/asaasService';
import { PlatformModuleId, PLATFORM_MODULES, PlanPricingModel } from '@/types/subscription';
import { cn } from '@/lib/utils';

interface PlanSelectorModalProps {
  isOpen: boolean;
  onClose?: () => void;
  schoolId: string;
  schoolName: string;
  adminName?: string;
  adminEmail?: string;
  onPaymentSuccess: () => void;
  isPaywall?: boolean; // Se verdadeiro, não permite fechar sem pagar
}

export const PlanSelectorModal: React.FC<PlanSelectorModalProps> = ({
  isOpen,
  onClose,
  schoolId,
  schoolName,
  adminName = 'Diretoria',
  adminEmail = '',
  onPaymentSuccess,
  isPaywall = true,
}) => {
  const {
    plans,
    addons,
    coupons,
    calculatePlanPrice,
    validateAndApplyCoupon,
    recordCouponUsage,
    registerSchoolSubscription,
    markSchoolAsPaid,
  } = usePlatformBillingSettings();

  const { signOut } = useAuth();

  const [step, setStep] = useState<'select' | 'payment'>('select');

  // Modelos de precificação (Por bloco, Por faixa ou Preço Fixo)
  const blockPlans = plans.filter((p) => p.is_active && p.pricing_model === 'students_block');
  const tierPlans = plans.filter((p) => p.is_active && (p.pricing_model === 'students_tier' || !p.pricing_model));
  const fixedPlans = plans.filter((p) => p.is_active && p.pricing_model === 'fixed_monthly');

  const [pricingMode, setPricingMode] = useState<PlanPricingModel>(
    blockPlans.length > 0 ? 'students_block' : 'students_tier'
  );
  const [selectedBlockPlanId, setSelectedBlockPlanId] = useState<string>(
    blockPlans[0]?.id || 'plan-block-standard'
  );
  const [selectedFixedPlanId, setSelectedFixedPlanId] = useState<string>(
    fixedPlans[0]?.id || 'plan-fixed-flat'
  );

  const [studentCount, setStudentCount] = useState<number>(150);
  const [selectedAddonIds, setSelectedAddonIds] = useState<PlatformModuleId[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD'>('PIX');

  // Cupons de desconto
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Asaas payment state
  const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);
  const [pixPayload, setPixPayload] = useState<string>('');
  const [pixQrCodeImage, setPixQrCodeImage] = useState<string>('');
  const [invoiceUrl, setInvoiceUrl] = useState<string>('');
  const [bankSlipUrl, setBankSlipUrl] = useState<string>('');
  const [hasCopiedPix, setHasCopiedPix] = useState(false);

  // Sincroniza planos default se carregarem depois
  useEffect(() => {
    if (!selectedBlockPlanId && blockPlans.length > 0) {
      setSelectedBlockPlanId(blockPlans[0].id);
    }
  }, [blockPlans, selectedBlockPlanId]);

  useEffect(() => {
    if (!selectedFixedPlanId && fixedPlans.length > 0) {
      setSelectedFixedPlanId(fixedPlans[0].id);
    }
  }, [fixedPlans, selectedFixedPlanId]);

  // Cálculos do plano com suporte a blocos, faixa, preço fixo e cupons
  const preferredPlanId =
    pricingMode === 'students_block'
      ? selectedBlockPlanId || blockPlans[0]?.id
      : pricingMode === 'fixed_monthly'
      ? selectedFixedPlanId || fixedPlans[0]?.id
      : undefined;

  const calculation = calculatePlanPrice(
    studentCount,
    selectedAddonIds,
    preferredPlanId,
    appliedCouponCode || undefined
  );
  const {
    matchingPlan,
    isFixedPlan,
    isBlockPlan,
    basePrice,
    rawBasePrice,
    extraBlocks,
    blockCount,
    blockSize,
    pricePerBlock,
    includedStudents,
    validAddons,
    addonsPrice,
    subtotal,
    discountAmount,
    appliedCoupon,
    totalMonthly,
    allActiveModules,
  } = calculation;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const toggleAddon = (id: PlatformModuleId) => {
    if (selectedAddonIds.includes(id)) {
      setSelectedAddonIds(selectedAddonIds.filter((aId) => aId !== id));
    } else {
      setSelectedAddonIds([...selectedAddonIds, id]);
    }
  };

  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError('Por favor, informe o código do cupom.');
      return;
    }
    const result = validateAndApplyCoupon(code, subtotal);
    if (!result.valid) {
      setCouponError(result.message);
      toast.error(result.message);
      return;
    }
    setAppliedCouponCode(result.coupon!.code);
    setCouponError(null);
    toast.success(result.message);
  };

  const handleRemoveCoupon = () => {
    setAppliedCouponCode(null);
    setCouponInput('');
    setCouponError(null);
    toast.info('Cupom removido.');
  };

  const handleProceedToPayment = async () => {
    if (!matchingPlan) {
      toast.error('Nenhum plano selecionado.');
      return;
    }

    setStep('payment');
    setIsGeneratingPayment(true);

    try {
      // Tenta emitir a cobrança via Asaas
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      const payment = await asaasService.createPayment({
        customerName: schoolName || 'Escola Cliente',
        customerEmail: adminEmail || 'financeiro@escola.com.br',
        value: totalMonthly,
        dueDate: dueDateStr,
        description: `1ª Mensalidade (${matchingPlan.name}${appliedCouponCode ? ` - Cupom ${appliedCouponCode}` : ''}) - ${schoolName}`,
        billingType: paymentMethod,
      });

      if (payment && payment.id) {
        setInvoiceUrl(payment.invoiceUrl || '');
        setBankSlipUrl(payment.bankSlipUrl || '');

        // Busca o QR Code do Pix se for Pix
        try {
          const qrData = await asaasService.getPixQrCode(payment.id);
          if (qrData) {
            setPixPayload(qrData.payload);
            setPixQrCodeImage(
              qrData.encodedImage.startsWith('data:')
                ? qrData.encodedImage
                : `data:image/png;base64,${qrData.encodedImage}`
            );
          }
        } catch {
          // Fallback Pix
          setPixPayload('00020126580014BR.GOV.BCB.PIX0136profissional@netooliver.com.br520400005303986540' + totalMonthly.toFixed(2));
        }
      }

      // Registra a assinatura no estado da plataforma
      registerSchoolSubscription({
        school_id: schoolId,
        school_name: schoolName,
        plan_id: matchingPlan.id,
        plan_name: matchingPlan.name,
        pricing_model: matchingPlan.pricing_model || pricingMode,
        estimated_students: pricingMode === 'fixed_monthly' ? 9999 : studentCount,
        selected_modules: allActiveModules,
        original_amount: subtotal,
        discount_amount: discountAmount,
        coupon_code: appliedCouponCode || undefined,
        total_monthly_amount: totalMonthly,
        status: 'pending',
        created_at: new Date().toISOString(),
        payment_method: paymentMethod,
        invoice_url: payment?.invoiceUrl,
        pix_copy_paste: pixPayload,
      });

      toast.success('Cobrança gerada com sucesso via Asaas Bank!');
    } catch (err) {
      console.warn('Fallback de geração de pagamento local:', err);
      // Fallback local se a API Asaas externa estiver sem rede
      setPixPayload('00020126580014BR.GOV.BCB.PIX0136profissional@netooliver.com.br520400005303986540' + totalMonthly.toFixed(2));
    } finally {
      setIsGeneratingPayment(false);
    }
  };

  const handleCopyPix = () => {
    if (!pixPayload) return;
    navigator.clipboard.writeText(pixPayload);
    setHasCopiedPix(true);
    toast.success('Código Pix Copia e Cola copiado para a área de transferência!');
    setTimeout(() => setHasCopiedPix(false), 3000);
  };

  const handleConfirmPaid = () => {
    if (appliedCouponCode) {
      recordCouponUsage(appliedCouponCode);
    }
    markSchoolAsPaid(schoolId, paymentMethod);
    toast.success('🎉 Pagamento confirmado! Seja bem-vindo à plataforma.');
    onPaymentSuccess();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isPaywall && onClose && onClose()}>
      <DialogContent
        onPointerDownOutside={(e) => isPaywall && e.preventDefault()}
        onEscapeKeyDown={(e) => isPaywall && e.preventDefault()}
        className={cn(
          "max-w-2xl max-h-[92vh] overflow-y-auto p-0 border-purple-200",
          isPaywall && "[&>button.absolute]:hidden"
        )}
      >
        {/* CABEÇALHO DO ONBOARDING */}
        <div className="bg-gradient-to-r from-[#6b26d9] via-[#581c87] to-[#3b0764] text-white p-6 rounded-t-lg relative overflow-hidden">
          <div className="relative z-10 flex items-start justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-purple-200 text-[11px] font-semibold backdrop-blur-sm mb-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Ativação da Nova Escola
              </div>
              <DialogTitle className="text-2xl font-bold tracking-tight text-white">
                {step === 'select' ? 'Escolha o Plano da sua Escola' : 'Pagamento da 1ª Mensalidade'}
              </DialogTitle>
              <DialogDescription className="text-purple-200 text-xs">
                {step === 'select'
                  ? `Configure o pacote sob medida para ${schoolName} pela quantidade de alunos e módulos.`
                  : `Efetue o pagamento para liberar imediatamente o acesso de ${schoolName}.`}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="text-[11px] text-purple-300 font-medium block">1ª Mensalidade</span>
                {discountAmount > 0 && (
                  <span className="text-xs text-purple-300/80 line-through mr-1 font-semibold">
                    {formatCurrency(subtotal)}
                  </span>
                )}
                <span className="text-2xl font-black text-amber-300">{formatCurrency(totalMonthly)}</span>
              </div>
              {isPaywall && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void signOut()}
                  className="text-white/80 hover:text-white hover:bg-white/10 text-xs flex items-center gap-1.5 h-8 px-2.5 rounded-md"
                  title="Sair da conta"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ETAPA 1: SELEÇÃO DE PLANO POR ALUNOS & MÓDULOS */}
        {step === 'select' && (
          <div className="p-6 space-y-6">
            {/* 1. SELETOR DE MODELO DE COBRANÇA */}
            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Escolha o Modelo de Cobrança
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Opção Por Bloco de Alunos */}
                <div
                  onClick={() => setPricingMode('students_block')}
                  className={cn(
                    "p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3",
                    pricingMode === 'students_block'
                      ? "border-[#6b26d9] bg-purple-50/70 shadow-sm"
                      : "border-slate-200 bg-white hover:border-purple-200"
                  )}
                >
                  <div
                    className={cn(
                      "p-2 rounded-lg shrink-0",
                      pricingMode === 'students_block'
                        ? "bg-[#6b26d9] text-white"
                        : "bg-slate-100 text-slate-600"
                    )}
                  >
                    <Boxes className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">Por Bloco de Alunos</span>
                      {pricingMode === 'students_block' && (
                        <Badge className="bg-[#6b26d9] text-[9px] text-white font-bold">Ativo</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Base inicial acessível + valor adicional por bloco de alunos.
                    </p>
                  </div>
                </div>

                {/* Opção Por Faixa de Alunos */}
                <div
                  onClick={() => setPricingMode('students_tier')}
                  className={cn(
                    "p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3",
                    pricingMode === 'students_tier'
                      ? "border-[#6b26d9] bg-purple-50/70 shadow-sm"
                      : "border-slate-200 bg-white hover:border-purple-200"
                  )}
                >
                  <div
                    className={cn(
                      "p-2 rounded-lg shrink-0",
                      pricingMode === 'students_tier'
                        ? "bg-[#6b26d9] text-white"
                        : "bg-slate-100 text-slate-600"
                    )}
                  >
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">Por Faixa Fixa</span>
                      {pricingMode === 'students_tier' && (
                        <Badge className="bg-[#6b26d9] text-[9px] text-white font-bold">Ativo</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Valor escalonado por intervalo fechado de matrículas.
                    </p>
                  </div>
                </div>

                {/* Opção Plano Fixo Mensal */}
                <div
                  onClick={() => setPricingMode('fixed_monthly')}
                  className={cn(
                    "p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3",
                    pricingMode === 'fixed_monthly'
                      ? "border-[#6b26d9] bg-purple-50/70 shadow-sm"
                      : "border-slate-200 bg-white hover:border-purple-200"
                  )}
                >
                  <div
                    className={cn(
                      "p-2 rounded-lg shrink-0",
                      pricingMode === 'fixed_monthly'
                        ? "bg-[#6b26d9] text-white"
                        : "bg-slate-100 text-slate-600"
                    )}
                  >
                    <InfinityIcon className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">Plano Fixo Mensal</span>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-bold">
                        Sem Vínculo
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Mensalidade única com alunos ilimitados, sem taxas por matrícula.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SELEÇÃO DO PLANO CONFORME O MODELO */}
            {pricingMode === 'students_block' ? (
              /* SELETOR DE QUANTIDADE DE ALUNOS COM REGRA DE BLOCOS */
              <div className="space-y-3 p-4 rounded-xl bg-purple-50/40 border border-purple-200">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Boxes className="h-4 w-4 text-[#6b26d9]" /> 2. Quantidade de Alunos & Cálculo por Blocos
                  </Label>
                  <span className="text-xs font-bold text-[#6b26d9] bg-white px-2.5 py-0.5 rounded-full border border-purple-200 shadow-sm">
                    {studentCount} alunos
                  </span>
                </div>

                {/* Botões de faixas rápidas */}
                <div className="grid grid-cols-5 gap-2">
                  {[50, 100, 150, 250, 500].map((count) => (
                    <Button
                      key={count}
                      type="button"
                      variant={studentCount === count ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStudentCount(count)}
                      className={`text-xs font-semibold h-9 ${
                        studentCount === count
                          ? 'bg-[#6b26d9] hover:bg-[#581c87] text-white shadow-sm'
                          : 'hover:border-purple-300 bg-white'
                      }`}
                    >
                      {count} alunos
                    </Button>
                  ))}
                </div>

                {/* Input customizado de alunos */}
                <div className="flex items-center gap-3 pt-1">
                  <Input
                    type="number"
                    min={1}
                    max={5000}
                    value={studentCount}
                    onChange={(e) => setStudentCount(Math.max(1, Number(e.target.value) || 1))}
                    className="text-xs h-9 w-32 font-bold text-center bg-white"
                  />
                  <span className="text-xs text-muted-foreground">
                    Plano Selecionado:{' '}
                    <strong className="text-purple-950 font-bold">{matchingPlan?.name || 'Plano por Blocos'}</strong>
                  </span>
                </div>

                {/* Detalhamento dos blocos */}
                <div className="p-3 bg-white rounded-lg border border-purple-100 text-xs space-y-1.5">
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Valor Base (até {includedStudents || 50} alunos inclusos):</span>
                    <span className="font-bold text-slate-900">{formatCurrency(rawBasePrice || 99)}/mês</span>
                  </div>
                  {extraBlocks > 0 && (
                    <div className="flex justify-between items-center text-purple-700">
                      <span>
                        + {extraBlocks} bloco(s) extra(s) de {blockSize || 50} alunos (+{formatCurrency(pricePerBlock || 39)}/cada):
                      </span>
                      <span className="font-bold">+{formatCurrency(extraBlocks * (pricePerBlock || 39))}/mês</span>
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center font-bold text-sm text-[#6b26d9]">
                    <span>Subtotal do Plano Base ({studentCount} alunos):</span>
                    <span>{formatCurrency(basePrice)}/mês</span>
                  </div>
                </div>
              </div>
            ) : pricingMode === 'students_tier' ? (
              /* SELETOR DE QUANTIDADE DE ALUNOS */
              <div className="space-y-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    2. Quantidade Estimada de Alunos
                  </Label>
                  <span className="text-xs font-bold text-[#6b26d9] bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                    {studentCount} alunos
                  </span>
                </div>

                {/* Botões de faixas rápidas */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Até 100', value: 80 },
                    { label: '101 - 300', value: 200 },
                    { label: '301 - 600', value: 450 },
                    { label: 'Mais de 600', value: 750 },
                  ].map((tier) => (
                    <Button
                      key={tier.label}
                      type="button"
                      variant={studentCount === tier.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStudentCount(tier.value)}
                      className={`text-xs font-semibold h-9 ${
                        studentCount === tier.value
                          ? 'bg-[#6b26d9] hover:bg-[#581c87] text-white shadow-sm'
                          : 'hover:border-purple-300'
                      }`}
                    >
                      {tier.label}
                    </Button>
                  ))}
                </div>

                {/* Input customizado de alunos */}
                <div className="flex items-center gap-3 pt-1">
                  <Input
                    type="number"
                    min={1}
                    max={5000}
                    value={studentCount}
                    onChange={(e) => setStudentCount(Math.max(1, Number(e.target.value) || 1))}
                    className="text-xs h-9 w-32 font-bold text-center bg-white"
                  />
                  <span className="text-xs text-muted-foreground">
                    Plano Base Recomendado:{' '}
                    <strong className="text-purple-950 font-bold">{matchingPlan?.name || 'Start'}</strong>{' '}
                    ({formatCurrency(basePrice)}/mês)
                  </span>
                </div>
              </div>
            ) : (
              /* SELEÇÃO DO PLANO FIXO MENSAL */
              <div className="space-y-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    2. Selecione o Plano Fixo Desejado
                  </Label>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold flex items-center gap-1">
                    <InfinityIcon className="h-3 w-3" /> Alunos Ilimitados
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {fixedPlans.length > 0 ? (
                    fixedPlans.map((fp) => {
                      const isChosen = (selectedFixedPlanId || fixedPlans[0]?.id) === fp.id;
                      return (
                        <div
                          key={fp.id}
                          onClick={() => setSelectedFixedPlanId(fp.id)}
                          className={cn(
                            "p-3.5 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all bg-white",
                            isChosen
                              ? "border-[#6b26d9] bg-purple-50/70 shadow-sm"
                              : "border-slate-200 hover:border-purple-200"
                          )}
                        >
                          <div className="space-y-1 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">{fp.name}</span>
                              <Badge className="bg-purple-100 text-[#6b26d9] border-purple-200 text-[10px] font-bold">
                                Fixo Mensal
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {fp.description || 'Preço fixo com alunos ilimitados, sem acréscimo de valor.'}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xl font-black text-[#6b26d9]">{formatCurrency(fp.base_price)}</span>
                            <span className="text-[11px] text-muted-foreground block">/mês fixo</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 bg-white rounded-lg border text-center text-xs text-muted-foreground">
                      Nenhum plano de preço fixo cadastrado no momento. Alterne para &quot;Por Faixa de Alunos&quot;.
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* 3. MÓDULOS INCLUSOS NO PLANO BASE */}
            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                3. Módulos Inclusos no {matchingPlan?.name}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {matchingPlan?.included_modules.map((mId) => {
                  const info = PLATFORM_MODULES.find((m) => m.id === mId);
                  return (
                    <div
                      key={mId}
                      className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-semibold text-slate-900 block">{info?.name}</span>
                          <span className="text-[10px] text-muted-foreground">{info?.description.slice(0, 45)}...</span>
                        </div>
                      </div>
                      <Badge className="bg-emerald-600 text-white text-[9px] font-bold">Incluso</Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* 4. MÓDULOS ADICIONAIS (ADD-ONS OPCIONAIS) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  4. Adicionar Módulos Específicos (Opcional)
                </Label>
                <span className="text-[11px] text-muted-foreground">Turbine sua escola conforme a necessidade</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {addons
                  .filter((a) => a.is_active && !matchingPlan?.included_modules.includes(a.id))
                  .map((addon) => {
                    const isSelected = selectedAddonIds.includes(addon.id);
                    return (
                      <div
                        key={addon.id}
                        onClick={() => toggleAddon(addon.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#6b26d9] bg-purple-50/70 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-purple-200'
                        }`}
                      >
                        <div className="space-y-0.5 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">{addon.name}</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground line-clamp-1">
                            {addon.description}
                          </span>
                          <span className="text-[11px] font-bold text-[#6b26d9] block">
                            + {formatCurrency(addon.monthly_price)}/mês
                          </span>
                        </div>
                        <Switch
                          checked={isSelected}
                          onCheckedChange={() => toggleAddon(addon.id)}
                          className="shrink-0 data-[state=checked]:bg-[#6b26d9]"
                        />
                      </div>
                    );
                  })}
              </div>
            </div>

            <Separator />

            {/* 5. SISTEMA DE CUPONS DE DESCONTO */}
            <div className="space-y-2 p-3.5 rounded-xl border border-purple-100 bg-purple-50/30">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-[#6b26d9]" /> 5. Cupom de Desconto ou Convite
                </Label>
                {appliedCoupon && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                    Cupom Ativo
                  </Badge>
                )}
              </div>

              {appliedCoupon ? (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md">
                      <Tag className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-emerald-900">{appliedCoupon.code}</span>
                        <span className="text-xs text-emerald-700 font-semibold">
                          ({appliedCoupon.discount_type === 'percentage'
                            ? `${appliedCoupon.discount_value}% OFF`
                            : `${formatCurrency(appliedCoupon.discount_value)} OFF`})
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-600 block">
                        Desconto aplicado: -{formatCurrency(discountAmount)} na 1ª mensalidade
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveCoupon}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-7 px-2"
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Remover
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: PROMO10 ou PURPLE50"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        setCouponError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyCoupon();
                        }
                      }}
                      className="text-xs font-mono uppercase bg-white h-9"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleApplyCoupon}
                      className="border-purple-300 text-[#6b26d9] hover:bg-purple-50 font-bold text-xs h-9 shrink-0 px-4"
                    >
                      Aplicar Cupom
                    </Button>
                  </div>
                  {couponError && (
                    <p className="text-[11px] text-red-600 font-medium">{couponError}</p>
                  )}
                </div>
              )}
            </div>

            {/* RESUMO DO VALOR & BOTÃO AVANÇAR */}
            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-muted-foreground block">
                  Total da 1ª Mensalidade ({matchingPlan?.name}
                  {validAddons.length > 0 ? ` + ${validAddons.length} módulo(s)` : ''}):
                </span>
                <div className="flex items-baseline gap-2">
                  {discountAmount > 0 && (
                    <span className="text-sm text-slate-400 line-through font-semibold">
                      {formatCurrency(subtotal)}
                    </span>
                  )}
                  <span className="text-2xl font-black text-[#6b26d9]">{formatCurrency(totalMonthly)}</span>
                  <span className="text-xs text-muted-foreground">/mês (sem taxa de adesão)</span>
                </div>
                {discountAmount > 0 && (
                  <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
                    Economia de {formatCurrency(discountAmount)} com o cupom {appliedCouponCode}!
                  </span>
                )}
              </div>

              <Button
                type="button"
                onClick={handleProceedToPayment}
                className="bg-[#6b26d9] hover:bg-[#581c87] text-white font-bold text-sm px-6 h-11 shadow-md w-full sm:w-auto"
              >
                Avançar para Pagamento <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA 2: PAGAMENTO (CHECKOUT COM ASAAS) */}
        {step === 'payment' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep('select')}
                className="text-xs text-muted-foreground"
              >
                ← Alterar Plano e Módulos
              </Button>
              <Badge className="bg-amber-100 text-amber-900 border-amber-300">
                Aguardando Pagamento da 1ª Mensalidade
              </Badge>
            </div>

            {/* AVISO DO CUPOM ATIVO NO PAGAMENTO */}
            {appliedCoupon && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">Cupom {appliedCoupon.code} aplicado:</span> economizou {formatCurrency(discountAmount)}
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">Desconto Concedido</Badge>
              </div>
            )}

            {/* ABAS DE FORMAS DE PAGAMENTO */}
            <Tabs
              value={paymentMethod}
              onValueChange={(val) => setPaymentMethod(val as any)}
              className="space-y-4"
            >
              <TabsList className="grid grid-cols-3 bg-slate-100 p-1">
                <TabsTrigger value="PIX" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-[#6b26d9]">
                  <QrCode className="h-3.5 w-3.5" /> PIX Instantâneo
                </TabsTrigger>
                <TabsTrigger value="BOLETO" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-[#6b26d9]">
                  <FileText className="h-3.5 w-3.5" /> Boleto Bancário
                </TabsTrigger>
                <TabsTrigger value="CREDIT_CARD" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-[#6b26d9]">
                  <CreditCard className="h-3.5 w-3.5" /> Cartão de Crédito
                </TabsTrigger>
              </TabsList>

              {/* ABA PIX */}
              <TabsContent value="PIX" className="space-y-4 pt-2">
                <div className="p-6 rounded-2xl border border-purple-200 bg-purple-50/30 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Valor a pagar via Pix:</span>
                    <div className="text-3xl font-black text-[#6b26d9]">{formatCurrency(totalMonthly)}</div>
                    <p className="text-[11px] text-muted-foreground">Liberação instantânea após o pagamento</p>
                  </div>

                  {/* QR Code Container */}
                  <div className="p-4 bg-white rounded-2xl border-2 border-purple-200 shadow-sm flex flex-col items-center justify-center">
                    {pixQrCodeImage ? (
                      <img
                        src={pixQrCodeImage}
                        alt="QR Code Pix"
                        className="w-48 h-48 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-48 h-48 bg-slate-50 flex flex-col items-center justify-center p-4 border border-dashed rounded-lg text-center gap-2">
                        <QrCode className="h-16 w-16 text-[#6b26d9]/70 animate-pulse" />
                        <span className="text-[11px] text-muted-foreground font-medium">
                          Escaneie com o app do seu banco
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Código Pix Copia e Cola */}
                  <div className="w-full max-w-md space-y-2">
                    <Label className="text-xs font-semibold text-slate-700">Pix Copia e Cola:</Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={pixPayload || '00020126580014BR.GOV.BCB.PIX0136profissional@netooliver.com.br'}
                        className="text-xs font-mono bg-white"
                      />
                      <Button
                        type="button"
                        onClick={handleCopyPix}
                        className="bg-[#6b26d9] hover:bg-[#581c87] text-white shrink-0 text-xs font-semibold"
                      >
                        {hasCopiedPix ? <Check className="h-4 w-4 mr-1 text-emerald-300" /> : <Copy className="h-4 w-4 mr-1" />}
                        {hasCopiedPix ? 'Copiado!' : 'Copiar'}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ABA BOLETO */}
              <TabsContent value="BOLETO" className="space-y-4 pt-2">
                <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 text-center space-y-4">
                  <div className="h-12 w-12 rounded-full bg-purple-100 text-[#6b26d9] flex items-center justify-center mx-auto">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-base text-slate-900">Boleto Bancário Asaas</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      O boleto possui compensação de até 1 dia útil. Para liberação imediata, recomendamos pagar via PIX.
                    </p>
                    <div className="text-2xl font-black text-[#6b26d9] pt-2">{formatCurrency(totalMonthly)}</div>
                  </div>

                  {bankSlipUrl || invoiceUrl ? (
                    <Button
                      type="button"
                      onClick={() => window.open(bankSlipUrl || invoiceUrl, '_blank')}
                      className="bg-[#6b26d9] hover:bg-[#581c87] text-white text-xs font-semibold"
                    >
                      <ExternalLink className="h-4 w-4 mr-1.5" /> Abrir Boleto em Nova Guia
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => toast.info('Boleto disponível após o fechamento da fatura.')}
                      variant="outline"
                      className="text-xs"
                    >
                      Visualizar Boleto
                    </Button>
                  )}
                </div>
              </TabsContent>

              {/* ABA CARTÃO */}
              <TabsContent value="CREDIT_CARD" className="space-y-4 pt-2">
                <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 text-center space-y-4">
                  <div className="h-12 w-12 rounded-full bg-purple-100 text-[#6b26d9] flex items-center justify-center mx-auto">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-base text-slate-900">Pagamento com Cartão de Crédito</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Ambiente 100% seguro intermediado pelo Asaas Bank com aprovação em poucos minutos.
                    </p>
                    <div className="text-2xl font-black text-[#6b26d9] pt-2">{formatCurrency(totalMonthly)}</div>
                  </div>

                  {invoiceUrl ? (
                    <Button
                      type="button"
                      onClick={() => window.open(invoiceUrl, '_blank')}
                      className="bg-[#6b26d9] hover:bg-[#581c87] text-white text-xs font-semibold"
                    >
                      <ExternalLink className="h-4 w-4 mr-1.5" /> Pagar com Cartão no Checkout Asaas
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Use a opção PIX para liberação instantânea na tela.
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* BOTÕES DE CONFIRMAÇÃO */}
            <div className="pt-2 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Após a confirmação bancária, o acesso completo será liberado instantaneamente.</span>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  onClick={handleConfirmPaid}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-6 shadow-sm w-full sm:w-auto"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Já Paguei / Confirmar Acesso
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
