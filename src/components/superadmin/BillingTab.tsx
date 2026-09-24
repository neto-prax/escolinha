import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Receipt,
  Search,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Sparkles,
  ExternalLink,
  Unlock,
  CheckCircle2,
  QrCode,
  Users,
  CreditCard,
  Tag,
  Infinity as InfinityIcon,
  Boxes,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePlatformBillingSettings } from '@/hooks/usePlatformBillingSettings';
import { PLATFORM_MODULES, PlatformModuleId, PlatformPlanConfig, SchoolOnboardingSubscription, PlanPricingModel } from '@/types/subscription';
import { asaasService } from '@/services/asaasService';
import { PlanManager } from './PlanManager';

interface SubscriptionInvoice {
  id: string;
  school_id: string;
  subscription_id: string | null;
  reference_month: string;
  student_count: number;
  price_per_student: number;
  total_amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  school?: {
    name: string;
  };
}

interface SchoolBasic {
  id: string;
  name: string;
  slug: string;
}

interface BillingTabProps {
  schools: SchoolBasic[];
}

export function BillingTab({ schools }: BillingTabProps) {
  const {
    plans,
    addons,
    coupons,
    globalSettings,
    schoolSubscriptions,
    calculatePlanPrice,
    registerSchoolSubscription,
    markSchoolAsPaid: markOnboardingSchoolAsPaid,
    markSchoolAsManualFree: markOnboardingSchoolAsManualFree,
  } = usePlatformBillingSettings();

  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filters
  const [searchInvoice, setSearchInvoice] = useState('');
  const [onboardingFilter, setOnboardingFilter] = useState<'all' | 'pending' | 'paid' | 'manual_free'>('all');
  const [onboardingSearch, setOnboardingSearch] = useState('');

  // Assinatura Dialog (mesmos campos do Onboarding / Cobrança)
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subSchoolId, setSubSchoolId] = useState('');
  const [subStudentCount, setSubStudentCount] = useState<number>(150);
  const [subPlanId, setSubPlanId] = useState<string>('');
  const [subSelectedAddons, setSubSelectedAddons] = useState<PlatformModuleId[]>([]);
  const [subBillingDay, setSubBillingDay] = useState('10');
  const [subPaymentMethod, setSubPaymentMethod] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD'>('PIX');
  const [subStatus, setSubStatus] = useState<'active' | 'pending' | 'manual_free' | 'suspended'>('active');
  const [subNotes, setSubNotes] = useState('');
  const [subCouponCode, setSubCouponCode] = useState<string>('');

  // Invoice Dialog (mesmos campos do Onboarding / Cobrança)
  const [invoiceDialog, setInvoiceDialog] = useState<{ open: boolean; invoice?: SubscriptionInvoice }>({ open: false });
  const [invoiceForm, setInvoiceForm] = useState({
    school_id: '',
    reference_month: format(new Date(), 'yyyy-MM-01'),
    student_count: '150',
    total_amount: '149',
    due_date: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
    status: 'pending',
    payment_method: 'PIX',
    notes: '',
    emitAsaas: false,
  });

  // Generate Month Dialog
  const [generateDialog, setGenerateDialog] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscription_invoices')
        .select(`
          *,
          school:schools(name)
        `)
        .order('due_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setInvoices((data || []) as unknown as SubscriptionInvoice[]);
    } catch (error: any) {
      console.warn('Aviso ao carregar faturas:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Cálculo reativo para o formulário de assinatura
  const activePlanObj = plans.find((p) => p.id === subPlanId) || plans[0];
  const subCalculation = calculatePlanPrice(
    subStudentCount,
    subSelectedAddons,
    subPlanId || undefined,
    subCouponCode || undefined
  );

  const toggleSubAddon = (id: PlatformModuleId) => {
    if (subSelectedAddons.includes(id)) {
      setSubSelectedAddons(subSelectedAddons.filter((m) => m !== id));
    } else {
      setSubSelectedAddons([...subSelectedAddons, id]);
    }
  };

  const handleOpenNewSubscription = (schoolId?: string) => {
    const targetSchoolId = schoolId || (schools[0]?.id || '');
    const currentSub = targetSchoolId ? schoolSubscriptions[targetSchoolId] : null;

    setSubSchoolId(targetSchoolId);
    setSubStudentCount(currentSub?.estimated_students || 150);
    setSubPlanId(currentSub?.plan_id || plans[0]?.id || 'plan-start');
    setSubCouponCode(currentSub?.coupon_code || '');
    setSubSelectedAddons(
      currentSub?.selected_modules?.filter((m) => ['whatsapp', 'estoque', 'comercial', 'financeiro', 'boletos'].includes(m)) || []
    );
    setSubBillingDay('10');
    setSubPaymentMethod(currentSub?.payment_method && currentSub.payment_method !== 'MANUAL' ? currentSub.payment_method : 'PIX');
    setSubStatus(currentSub?.status === 'paid' ? 'active' : (currentSub?.status as any) || 'active');
    setSubNotes(currentSub?.exempt_reason || '');
    setSubModalOpen(true);
  };

  const handleSaveSubscription = async () => {
    if (!subSchoolId) {
      toast.error('Selecione uma escola.');
      return;
    }

    setIsSubmitting(true);
    try {
      const schoolObj = schools.find((s) => s.id === subSchoolId);
      const chosenPlan = plans.find((p) => p.id === subPlanId) || subCalculation.matchingPlan || plans[0];
      const allActiveModules = Array.from(
        new Set([...(chosenPlan.included_modules || []), ...subSelectedAddons])
      );

      const isFixed = chosenPlan.pricing_model === 'fixed_monthly';

      const updatedSub: SchoolOnboardingSubscription = {
        school_id: subSchoolId,
        school_name: schoolObj?.name || 'Escola',
        plan_id: chosenPlan.id,
        plan_name: chosenPlan.name,
        pricing_model: chosenPlan.pricing_model || 'students_tier',
        estimated_students: isFixed ? 9999 : subStudentCount,
        selected_modules: allActiveModules,
        original_amount: subCalculation.subtotal,
        discount_amount: subCalculation.discountAmount,
        coupon_code: subCouponCode || undefined,
        total_monthly_amount: subCalculation.totalMonthly,
        status: subStatus === 'active' ? 'paid' : (subStatus as any),
        payment_method: subPaymentMethod,
        created_at: new Date().toISOString(),
        exempt_reason: subNotes || undefined,
      };

      registerSchoolSubscription(updatedSub);

      // Também grava no banco relacional Supabase se disponível
      try {
        await supabase.from('school_subscriptions').upsert(
          {
            school_id: subSchoolId,
            plan_id: null,
            billing_day: parseInt(subBillingDay) || 10,
            status: subStatus,
            custom_price_per_student: subCalculation.totalMonthly / (subStudentCount || 1),
            notes: JSON.stringify({
              plan_name: chosenPlan.name,
              estimated_students: subStudentCount,
              selected_modules: allActiveModules,
              total_monthly_amount: subCalculation.totalMonthly,
              payment_method: subPaymentMethod,
            }),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'school_id' }
        );
      } catch (dbErr) {
        // Silencioso
      }

      toast.success(`Assinatura de "${schoolObj?.name || 'Escola'}" salva com sucesso!`);
      setSubModalOpen(false);
    } catch (e: any) {
      toast.error('Erro ao salvar assinatura: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manipuladores de Faturas
  const openInvoiceDialog = (invoice?: SubscriptionInvoice) => {
    if (invoice) {
      setInvoiceForm({
        school_id: invoice.school_id,
        reference_month: invoice.reference_month,
        student_count: invoice.student_count.toString(),
        total_amount: invoice.total_amount.toString(),
        due_date: invoice.due_date,
        status: invoice.status,
        payment_method: invoice.payment_method || 'PIX',
        notes: invoice.notes || '',
        emitAsaas: false,
      });
    } else {
      const firstSchool = schools[0]?.id || '';
      const sub = firstSchool ? schoolSubscriptions[firstSchool] : null;
      const defaultVal = sub ? sub.total_monthly_amount : 149;

      setInvoiceForm({
        school_id: firstSchool,
        reference_month: format(new Date(), 'yyyy-MM-01'),
        student_count: (sub?.estimated_students || 150).toString(),
        total_amount: defaultVal.toString(),
        due_date: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
        status: 'pending',
        payment_method: sub?.payment_method && sub.payment_method !== 'MANUAL' ? sub.payment_method : 'PIX',
        notes: `Mensalidade Escolar - ${sub?.plan_name || 'Plano Base'}`,
        emitAsaas: true,
      });
    }
    setInvoiceDialog({ open: true, invoice });
  };

  const handleInvoiceSchoolChange = (schoolId: string) => {
    const sub = schoolSubscriptions[schoolId];
    setInvoiceForm((prev) => ({
      ...prev,
      school_id: schoolId,
      student_count: sub ? sub.estimated_students.toString() : prev.student_count,
      total_amount: sub ? sub.total_monthly_amount.toString() : prev.total_amount,
      notes: sub ? `Mensalidade Escolar - ${sub.plan_name}` : prev.notes,
      payment_method: sub?.payment_method && sub.payment_method !== 'MANUAL' ? sub.payment_method : prev.payment_method,
    }));
  };

  const saveInvoice = async () => {
    if (!invoiceForm.school_id || !invoiceForm.total_amount) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const studentCount = parseInt(invoiceForm.student_count) || 1;
      const totalAmount = parseFloat(invoiceForm.total_amount) || 0;
      const schoolObj = schools.find((s) => s.id === invoiceForm.school_id);

      let asaasPaymentId: string | null = null;
      let paymentUrl: string | null = null;

      // Emissão via Asaas se selecionado
      if (invoiceForm.emitAsaas) {
        try {
          const asaasRes = await asaasService.createPayment({
            customerName: schoolObj?.name || 'Escola Cliente',
            customerEmail: 'financeiro@escola.com.br',
            value: totalAmount,
            dueDate: invoiceForm.due_date,
            description: invoiceForm.notes || `Mensalidade da Escola - ${schoolObj?.name}`,
            billingType: (invoiceForm.payment_method as any) || 'PIX',
          });
          if (asaasRes && asaasRes.id) {
            asaasPaymentId = asaasRes.id;
            paymentUrl = asaasRes.invoiceUrl || asaasRes.bankSlipUrl || null;
            toast.success('Cobrança emitida com sucesso no Asaas Bank!');
          }
        } catch (asaasErr) {
          console.warn('Erro ao emitir no Asaas:', asaasErr);
        }
      }

      const data = {
        school_id: invoiceForm.school_id,
        reference_month: invoiceForm.reference_month || format(new Date(), 'yyyy-MM-01'),
        student_count: studentCount,
        price_per_student: totalAmount / studentCount,
        total_amount: totalAmount,
        due_date: invoiceForm.due_date || format(new Date(), 'yyyy-MM-dd'),
        status: invoiceForm.status,
        payment_method: invoiceForm.payment_method,
        payment_reference: asaasPaymentId,
        notes: paymentUrl ? `${invoiceForm.notes || ''}\nFatura Asaas: ${paymentUrl}` : invoiceForm.notes,
        paid_at: invoiceForm.status === 'paid' ? new Date().toISOString() : null,
      };

      if (invoiceDialog.invoice) {
        const { error } = await supabase
          .from('subscription_invoices')
          .update(data)
          .eq('id', invoiceDialog.invoice.id);
        if (error) throw error;
        toast.success('Fatura atualizada!');
      } else {
        const { error } = await supabase.from('subscription_invoices').insert(data);
        if (error) throw error;
        toast.success('Fatura gerada com sucesso!');
      }

      setInvoiceDialog({ open: false });
      loadInvoices();
    } catch (error: any) {
      toast.error('Erro ao salvar fatura: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const markAsPaid = async (invoice: SubscriptionInvoice) => {
    try {
      const { error } = await supabase
        .from('subscription_invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);

      if (error) throw error;
      toast.success('Fatura marcada como paga!');
      loadInvoices();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-emerald-600 text-white">
            <CheckCircle className="mr-1 h-3 w-3" /> Pago
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50">
            <Clock className="mr-1 h-3 w-3" /> Pendente
          </Badge>
        );
      case 'overdue':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" /> Vencido
          </Badge>
        );
      case 'cancelled':
        return <Badge variant="secondary">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.school?.name?.toLowerCase().includes(searchInvoice.toLowerCase()) ||
      inv.payment_reference?.toLowerCase().includes(searchInvoice.toLowerCase())
  );

  const totalPending = invoices
    .filter((i) => i.status === 'pending' || i.status === 'overdue')
    .reduce((acc, i) => acc + i.total_amount, 0);

  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((acc, i) => acc + i.total_amount, 0);

  return (
    <div className="space-y-6">
      {/* SUMMARY CARDS */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-amber-900">A Receber</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-700">{formatCurrency(totalPending)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {invoices.filter((i) => i.status === 'pending').length} faturas pendentes
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-emerald-900">Recebido</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-700">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {invoices.filter((i) => i.status === 'paid').length} faturas pagas
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-purple-900">Escolas com Plano Ativo</CardTitle>
            <Receipt className="h-4 w-4 text-[#6b26d9]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#6b26d9]">
              {
                Object.values(schoolSubscriptions).filter((s) => s.status === 'paid' || s.status === 'manual_free').length
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">de {schools.length} escolas cadastradas</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-slate-800">Planos & Faixas</CardTitle>
            <FileText className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{plans.filter((p) => p.is_active).length}</div>
            <p className="text-xs text-muted-foreground mt-1">planos ativos no sistema</p>
          </CardContent>
        </Card>
      </div>

      {/* BILLING TABS */}
      <Tabs defaultValue="subscriptions">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 bg-slate-100 rounded-xl">
          <TabsTrigger value="subscriptions" className="py-2.5 font-bold data-[state=active]:bg-[#6b26d9] data-[state=active]:text-white rounded-lg">
            <Users className="mr-2 h-4 w-4" />
            Assinaturas das Escolas
          </TabsTrigger>
          <TabsTrigger value="plans" className="py-2.5 font-bold data-[state=active]:bg-[#6b26d9] data-[state=active]:text-white rounded-lg">
            <FileText className="mr-2 h-4 w-4" />
            Planos & Módulos
          </TabsTrigger>
          <TabsTrigger value="invoices" className="py-2.5 font-bold data-[state=active]:bg-[#6b26d9] data-[state=active]:text-white rounded-lg">
            <Receipt className="mr-2 h-4 w-4" />
            Faturas Mensais
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="py-2.5 font-bold data-[state=active]:bg-[#6b26d9] data-[state=active]:text-white rounded-lg relative">
            <Sparkles className="mr-2 h-4 w-4" />
            1ª Mensalidade / Adesão
            {Object.values(schoolSubscriptions).filter((s) => s.status === 'pending').length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold animate-pulse">
                {Object.values(schoolSubscriptions).filter((s) => s.status === 'pending').length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 1. ABA ASSINATURAS DAS ESCOLAS (COM OS MESMOS CAMPOS DE COBRANÇA) */}
        <TabsContent value="subscriptions">
          <Card className="border-purple-100">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-xl font-bold">Assinaturas e Pacotes por Escola</CardTitle>
                  <CardDescription>
                    Configure o plano pela quantidade de alunos e módulos adicionais contratados por cada escola.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => handleOpenNewSubscription()}
                  className="bg-[#6b26d9] hover:bg-[#581c87] text-white font-bold"
                >
                  <Plus className="mr-2 h-4 w-4" /> Nova Assinatura
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Escola</TableHead>
                    <TableHead>Plano & Alunos</TableHead>
                    <TableHead>Módulos Ativos (Inclusos + Extras)</TableHead>
                    <TableHead>Valor Mensal</TableHead>
                    <TableHead>Dia Vencimento</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools.map((school) => {
                    const sub = schoolSubscriptions[school.id];
                    const chosenPlan = sub ? plans.find((p) => p.id === sub.plan_id) || plans[0] : plans[0];
                    const activeModules = sub?.selected_modules || chosenPlan.included_modules || ['alunos', 'pedagogico'];
                    const monthlyAmount = sub?.total_monthly_amount || chosenPlan.base_price || 149;
                    const isBlock = chosenPlan.pricing_model === 'students_block' || sub?.pricing_model === 'students_block';
                    const isFixed = chosenPlan.pricing_model === 'fixed_monthly' || sub?.pricing_model === 'fixed_monthly';

                    return (
                      <TableRow key={school.id}>
                        <TableCell>
                          <div>
                            <p className="font-bold text-slate-900">{school.name}</p>
                            <p className="text-xs text-muted-foreground">{school.slug}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="outline" className="font-bold text-[#6b26d9] border-purple-200 bg-purple-50">
                              {sub?.plan_name || chosenPlan.name}
                            </Badge>
                            {isBlock ? (
                              <div className="flex items-center gap-1 text-[11px] text-purple-700 font-semibold">
                                <Boxes className="h-3 w-3" /> Blocos ({sub?.estimated_students || 150} alunos)
                              </div>
                            ) : isFixed ? (
                              <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                                <InfinityIcon className="h-3 w-3" /> Fixo (Alunos Ilimitados)
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground font-medium">
                                {sub?.estimated_students || 150} alunos
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-sm">
                            {activeModules.map((modId) => {
                              const info = PLATFORM_MODULES.find((m) => m.id === modId);
                              const isAddon = ['whatsapp', 'estoque', 'comercial', 'financeiro', 'boletos'].includes(modId);
                              return (
                                <Badge
                                  key={modId}
                                  variant="secondary"
                                  className={`text-[10px] px-1.5 py-0 ${
                                    isAddon ? 'border border-purple-300 bg-purple-50 text-purple-800 font-semibold' : ''
                                  }`}
                                >
                                  {info?.name || modId}
                                </Badge>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-baseline gap-1">
                            <span className="text-base font-black text-[#6b26d9]">{formatCurrency(monthlyAmount)}</span>
                            <span className="text-xs text-muted-foreground">/mês</span>
                          </div>
                          {sub?.coupon_code && (
                            <Badge variant="secondary" className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] px-1.5 py-0 mt-1 flex items-center gap-1 w-fit">
                              <Tag className="h-2.5 w-2.5 text-amber-600" /> Cupom: {sub.coupon_code}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">Dia 10</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-semibold">
                            {sub?.payment_method || 'PIX'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sub?.status === 'paid' && (
                            <Badge className="bg-emerald-600 text-white font-bold text-xs">Ativa / Paga</Badge>
                          )}
                          {sub?.status === 'manual_free' && (
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-bold text-xs">
                              Liberado Manual
                            </Badge>
                          )}
                          {sub?.status === 'pending' && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold text-xs animate-pulse">
                              Aguardando 1ª Mensalidade
                            </Badge>
                          )}
                          {!sub && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Padrão
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenNewSubscription(school.id)}
                              className="border-purple-200 text-[#6b26d9] hover:bg-purple-50 h-8 px-2 text-xs"
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" /> Editar Pacote
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. ABA PLANOS & MÓDULOS (GERENCIADOR COMPLETO COM OS MESMOS CAMPOS) */}
        <TabsContent value="plans">
          <PlanManager />
        </TabsContent>

        {/* 3. ABA FATURAS MENSAIS */}
        <TabsContent value="invoices">
          <Card className="border-purple-100">
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-xl font-bold">Faturas Emitidas</CardTitle>
                  <CardDescription>Gerencie e emita faturas mensais integradas ao Asaas Bank.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar fatura..."
                      value={searchInvoice}
                      onChange={(e) => setSearchInvoice(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Button onClick={() => openInvoiceDialog()} className="bg-[#6b26d9] hover:bg-[#581c87] text-white font-bold">
                    <Plus className="mr-2 h-4 w-4" /> Nova Fatura
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Escola</TableHead>
                    <TableHead>Mês Referência</TableHead>
                    <TableHead>Alunos</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-bold text-slate-900">{invoice.school?.name}</TableCell>
                      <TableCell>
                        {format(new Date(invoice.reference_month), 'MMMM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>{invoice.student_count}</TableCell>
                      <TableCell className="font-bold text-[#6b26d9]">{formatCurrency(invoice.total_amount)}</TableCell>
                      <TableCell>{format(new Date(invoice.due_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{invoice.payment_method || 'PIX'}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {invoice.status === 'pending' && (
                            <Button variant="outline" size="sm" onClick={() => markAsPaid(invoice)} className="h-8 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Marcar Pago
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => openInvoiceDialog(invoice)} className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhuma fatura encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. ABA ONBOARDING & 1ª MENSALIDADE */}
        <TabsContent value="onboarding">
          <Card className="border-purple-100">
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" /> Contratos de Adesão & 1ª Mensalidade
                  </CardTitle>
                  <CardDescription>
                    Acompanhe a escolha de planos e o pagamento da 1ª mensalidade das escolas recém-cadastradas via Asaas Bank.
                  </CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por escola ou plano..."
                      value={onboardingSearch}
                      onChange={(e) => setOnboardingSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={onboardingFilter} onValueChange={(val: any) => setOnboardingFilter(val)}>
                    <SelectTrigger className="w-[170px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="pending">Apenas Pendentes</SelectItem>
                      <SelectItem value="paid">Confirmados / Pagos</SelectItem>
                      <SelectItem value="manual_free">Liberados Manualmente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const list = Object.values(schoolSubscriptions).filter((sub) => {
                  const matchesSearch =
                    sub.school_name.toLowerCase().includes(onboardingSearch.toLowerCase()) ||
                    sub.plan_name.toLowerCase().includes(onboardingSearch.toLowerCase());
                  const matchesFilter = onboardingFilter === 'all' || sub.status === onboardingFilter;
                  return matchesSearch && matchesFilter;
                });

                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Escola</TableHead>
                        <TableHead>Plano Contratado</TableHead>
                        <TableHead>Alunos Estimados</TableHead>
                        <TableHead>Módulos Ativos</TableHead>
                        <TableHead>Valor Mensal</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.map((sub) => (
                        <TableRow key={sub.school_id}>
                          <TableCell className="font-semibold text-slate-900">
                            {sub.school_name}
                            <div className="text-[11px] text-muted-foreground">
                              ID: {sub.school_id ? sub.school_id.substring(0, 8) : '—'}...
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant="outline" className="font-bold border-purple-300 text-purple-700 bg-purple-50">
                                {sub.plan_name}
                              </Badge>
                              {sub.pricing_model === 'fixed_monthly' && (
                                <Badge className="bg-purple-100 text-[#6b26d9] border-purple-200 text-[9px] font-bold block w-fit">
                                  Fixo Mensal
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {sub.pricing_model === 'fixed_monthly' ? (
                              <span className="font-semibold text-emerald-700 text-xs flex items-center gap-1">
                                <InfinityIcon className="h-3 w-3" /> Ilimitados
                              </span>
                            ) : (
                              <span className="font-medium text-slate-700">{sub.estimated_students} alunos</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {sub.selected_modules?.map((modId) => {
                                const modInfo = PLATFORM_MODULES.find((m) => m.id === modId);
                                return (
                                  <Badge key={modId} variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {modInfo?.name || modId}
                                  </Badge>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-[#6b26d9]">{formatCurrency(sub.total_monthly_amount)}</div>
                            {sub.coupon_code && (
                              <Badge variant="secondary" className="bg-amber-50 text-amber-800 border border-amber-200 text-[9px] px-1.5 py-0 mt-0.5 flex items-center gap-1 w-fit">
                                <Tag className="h-2 w-2 text-amber-600" /> {sub.coupon_code} {sub.discount_amount ? `(-${formatCurrency(sub.discount_amount)})` : ''}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[11px] font-semibold">
                              {sub.payment_method || 'PIX'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {sub.status === 'paid' && (
                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 font-bold">
                                ✓ Pago
                              </Badge>
                            )}
                            {sub.status === 'manual_free' && (
                              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200 font-bold">
                                Liberado Manual
                              </Badge>
                            )}
                            {sub.status === 'pending' && (
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 animate-pulse font-bold">
                                Aguardando Pagamento
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5 items-center">
                              {sub.invoice_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(sub.invoice_url, '_blank')}
                                  title="Ver Cobrança no Asaas"
                                  className="h-8 px-2 text-xs text-purple-700 hover:text-purple-900"
                                >
                                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Fatura
                                </Button>
                              )}
                              {sub.status === 'pending' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => markOnboardingSchoolAsPaid(sub.school_id, sub.payment_method)}
                                    title="Confirmar pagamento recebido"
                                    className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-xs h-8 px-2 gap-1"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Pago
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => markOnboardingSchoolAsManualFree(sub.school_id)}
                                    title="Liberar acesso imediatamente"
                                    className="border-purple-500 text-purple-600 hover:bg-purple-50 text-xs h-8 px-2 gap-1"
                                  >
                                    <Unlock className="h-3.5 w-3.5" /> Liberar
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}

                      {list.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Nenhum registro de assinatura ou 1ª mensalidade encontrado.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL EDITAR / NOVA ASSINATURA (COM OS MESMOS CAMPOS DE COBRANÇA DO ONBOARDING) */}
      <Dialog open={subModalOpen} onOpenChange={setSubModalOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 border-purple-200">
          <div className="bg-gradient-to-r from-[#6b26d9] via-[#581c87] to-[#3b0764] text-white p-6 rounded-t-lg">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-300" />
              Configuração de Assinatura & Plano da Escola
            </DialogTitle>
            <DialogDescription className="text-purple-200 text-xs mt-1">
              Defina o plano pela faixa de alunos e selecione os módulos contratados com cálculo automático de mensalidade.
            </DialogDescription>
          </div>

          <div className="p-6 space-y-6">
            {/* 1. SELEÇÃO DA ESCOLA */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">1. Escola *</Label>
              <Select value={subSchoolId} onValueChange={setSubSchoolId}>
                <SelectTrigger className="font-semibold">
                  <SelectValue placeholder="Selecione a escola" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="font-medium">
                      {s.name} ({s.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. QUANTIDADE DE ALUNOS COM ATALHOS RÁPIDOS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  2. Quantidade Estimada de Alunos
                </Label>
                {activePlanObj.pricing_model === 'students_block' ? (
                  <Badge className="bg-purple-100 text-[#6b26d9] border-purple-200 text-xs font-bold flex items-center gap-1">
                    <Boxes className="h-3 w-3" /> Blocos de {activePlanObj.block_size || 50} alunos
                  </Badge>
                ) : activePlanObj.pricing_model === 'fixed_monthly' ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-bold flex items-center gap-1">
                    <InfinityIcon className="h-3 w-3" /> Alunos Ilimitados
                  </Badge>
                ) : (
                  <span className="text-xs font-bold text-[#6b26d9] bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                    {subStudentCount} alunos
                  </span>
                )}
              </div>

              {activePlanObj.pricing_model === 'students_block' && (
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-purple-900 font-semibold">
                  <div className="flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-[#6b26d9] shrink-0" />
                    <span>
                      Plano Base: {formatCurrency(activePlanObj.base_price)} (até {activePlanObj.included_students ?? 50} alunos) + {formatCurrency(activePlanObj.price_per_block || 39)} por bloco de {activePlanObj.block_size || 50} alunos extras.
                    </span>
                  </div>
                  {subCalculation.extraBlocks > 0 && (
                    <Badge className="bg-[#6b26d9] text-white text-[10px] font-bold shrink-0">
                      +{subCalculation.extraBlocks} bloco(s) extra(s)
                    </Badge>
                  )}
                </div>
              )}

              {activePlanObj.pricing_model === 'fixed_monthly' && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                  <InfinityIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                  Este plano é de Preço Fixo com Alunos Ilimitados. Não há alteração de mensalidade por quantidade de matrículas.
                </div>
              )}

              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="1"
                  value={subStudentCount}
                  onChange={(e) => setSubStudentCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="font-bold text-base h-11"
                  disabled={activePlanObj.pricing_model === 'fixed_monthly'}
                />
                <div className="flex gap-1.5">
                  {[50, 100, 150, 300, 500].map((count) => (
                    <Button
                      key={count}
                      type="button"
                      variant={subStudentCount === count ? 'default' : 'outline'}
                      size="sm"
                      disabled={activePlanObj.pricing_model === 'fixed_monthly'}
                      onClick={() => setSubStudentCount(count)}
                      className={
                        subStudentCount === count
                          ? 'bg-[#6b26d9] text-white font-bold h-11 px-3 text-xs'
                          : 'border-slate-300 font-semibold h-11 px-3 text-xs'
                      }
                    >
                      {count}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. PLANO BASE CORRESPONDENTE */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">3. Plano Base</Label>
                {activePlanObj.pricing_model === 'students_block' ? (
                  <Badge className="bg-purple-100 text-[#6b26d9] border-purple-200 text-[10px] font-bold flex items-center gap-1">
                    <Boxes className="h-3 w-3" /> Por Blocos
                  </Badge>
                ) : activePlanObj.pricing_model === 'fixed_monthly' ? (
                  <Badge className="bg-purple-100 text-[#6b26d9] border-purple-200 text-[10px] font-bold">
                    Preço Fixo Sem Vínculo
                  </Badge>
                ) : null}
              </div>
              <Select value={subPlanId || subCalculation.matchingPlan?.id} onValueChange={setSubPlanId}>
                <SelectTrigger className="font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="font-medium">
                      {p.name} — {formatCurrency(p.base_price)}/mês (
                      {p.pricing_model === 'students_block'
                        ? `Blocos de ${p.block_size || 50} (+${formatCurrency(p.price_per_block || 39)}/bloco)`
                        : p.pricing_model === 'fixed_monthly'
                        ? 'Fixo / Alunos Ilimitados'
                        : p.max_students
                        ? `Até ${p.max_students} alunos`
                        : 'Ilimitado'}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. MÓDULOS INCLUSOS NA BASE */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Módulos Inclusos no Plano Base</Label>
              <div className="p-3 bg-slate-50 border rounded-lg flex flex-wrap gap-2">
                {(activePlanObj.included_modules || []).map((modId) => {
                  const info = PLATFORM_MODULES.find((m) => m.id === modId);
                  return (
                    <Badge key={modId} className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-semibold">
                      ✓ {info?.name || modId}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* 5. MÓDULOS ADICIONAIS CONTRATADOS */}
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                4. Módulos Adicionais (Add-ons Opcionais)
              </Label>
              <div className="space-y-2">
                {addons
                  .filter((a) => a.is_active && !(activePlanObj.included_modules || []).includes(a.id))
                  .map((addon) => {
                    const isSelected = subSelectedAddons.includes(addon.id);
                    return (
                      <div
                        key={addon.id}
                        onClick={() => toggleSubAddon(addon.id)}
                        className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected ? 'border-[#6b26d9] bg-purple-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-xs text-slate-900 block">{addon.name}</span>
                          <span className="text-[11px] font-bold text-[#6b26d9] block">
                            + {formatCurrency(addon.monthly_price)}/mês
                          </span>
                        </div>
                        <Switch
                          checked={isSelected}
                          onCheckedChange={() => toggleSubAddon(addon.id)}
                          className="data-[state=checked]:bg-[#6b26d9]"
                        />
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* 5. SISTEMA DE CUPOM DE DESCONTO */}
            <div className="space-y-2 p-3.5 bg-purple-50/40 border border-purple-100 rounded-xl">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-[#6b26d9]" /> 5. Cupom de Desconto (Opcional)
                </Label>
                {subCalculation.appliedCoupon && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                    Desconto Ativo: -{formatCurrency(subCalculation.discountAmount)}
                  </Badge>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Select
                  value={subCouponCode || 'none'}
                  onValueChange={(val) => setSubCouponCode(val === 'none' ? '' : val)}
                >
                  <SelectTrigger className="bg-white text-xs font-semibold">
                    <SelectValue placeholder="Selecione um cupom cadastrado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum cupom aplicado</SelectItem>
                    {coupons.map((c) => (
                      <SelectItem key={c.id} value={c.code} className="font-mono text-xs">
                        {c.code} ({c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `R$ ${c.discount_value.toFixed(2)} OFF`})
                        {!c.is_active ? ' [Inativo]' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Ou código manual"
                  value={subCouponCode}
                  onChange={(e) => setSubCouponCode(e.target.value.toUpperCase())}
                  className="text-xs font-mono uppercase bg-white sm:max-w-[160px]"
                />
              </div>
            </div>

            {/* 6. RESUMO DE VALORES DA COBRANÇA */}
            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Total da Mensalidade Contratada:</span>
                <div className="flex items-baseline gap-2">
                  {subCalculation.discountAmount > 0 && (
                    <span className="text-sm text-slate-400 line-through font-semibold">
                      {formatCurrency(subCalculation.subtotal)}
                    </span>
                  )}
                  <span className="text-2xl font-black text-[#6b26d9]">{formatCurrency(subCalculation.totalMonthly)}</span>
                  <span className="text-xs text-muted-foreground font-medium">/mês</span>
                </div>
                {subCalculation.discountAmount > 0 && (
                  <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
                    Cupom aplicado: economia de {formatCurrency(subCalculation.discountAmount)}
                  </span>
                )}
              </div>
              <div className="text-left sm:text-right text-xs text-muted-foreground">
                <span className="block">Plano Base: {formatCurrency(subCalculation.basePrice)}</span>
                {subCalculation.addonsPrice > 0 && (
                  <span className="block text-purple-700 font-semibold">+ Adicionais: {formatCurrency(subCalculation.addonsPrice)}</span>
                )}
                {subCalculation.discountAmount > 0 && (
                  <span className="block text-emerald-600 font-semibold">- Cupom: {formatCurrency(subCalculation.discountAmount)}</span>
                )}
              </div>
            </div>

            {/* 7. DADOS DE COBRANÇA */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Dia de Vencimento</Label>
                <Input
                  type="number"
                  min="1"
                  max="28"
                  value={subBillingDay}
                  onChange={(e) => setSubBillingDay(e.target.value)}
                  className="font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Forma de Pagamento</Label>
                <Select value={subPaymentMethod} onValueChange={(val: any) => setSubPaymentMethod(val)}>
                  <SelectTrigger className="font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">PIX (Instantâneo)</SelectItem>
                    <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
                    <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Status do Acesso</Label>
                <Select value={subStatus} onValueChange={(val: any) => setSubStatus(val)}>
                  <SelectTrigger className="font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo / Pago</SelectItem>
                    <SelectItem value="manual_free">Liberado Manual (Isento)</SelectItem>
                    <SelectItem value="pending">Aguardando Pagamento</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">Observações / Motivo de Isenção</Label>
              <Textarea
                value={subNotes}
                onChange={(e) => setSubNotes(e.target.value)}
                placeholder="Ex: Liberado para período de demonstração comercial..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSubModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSubscription} disabled={isSubmitting} className="bg-[#6b26d9] hover:bg-[#581c87] text-white font-bold">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Assinatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL NOVA FATURA (INTEGRADA AO ASAAS BANK) */}
      <Dialog open={invoiceDialog.open} onOpenChange={(open) => setInvoiceDialog({ open })}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-[#6b26d9]" />
              {invoiceDialog.invoice ? 'Editar Fatura' : 'Nova Fatura de Mensalidade'}
            </DialogTitle>
            <DialogDescription>
              Emita e envie cobrança bancária oficial via Asaas Bank com Pix QR Code e Boleto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">Escola *</Label>
              <Select value={invoiceForm.school_id} onValueChange={handleInvoiceSchoolChange} disabled={!!invoiceDialog.invoice}>
                <SelectTrigger className="font-semibold">
                  <SelectValue placeholder="Selecione a escola" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="font-medium">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Mês de Referência</Label>
                <Input
                  type="month"
                  value={invoiceForm.reference_month.substring(0, 7)}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, reference_month: e.target.value + '-01' })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Data de Vencimento</Label>
                <Input
                  type="date"
                  value={invoiceForm.due_date}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Qtd Estimada de Alunos</Label>
                <Input
                  type="number"
                  value={invoiceForm.student_count}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, student_count: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Valor Total da Fatura (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={invoiceForm.total_amount}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, total_amount: e.target.value })}
                  className="font-bold text-[#6b26d9]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Método de Pagamento</Label>
                <Select
                  value={invoiceForm.payment_method}
                  onValueChange={(val) => setInvoiceForm({ ...invoiceForm, payment_method: val })}
                >
                  <SelectTrigger className="font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                    <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Status</Label>
                <Select
                  value={invoiceForm.status}
                  onValueChange={(val) => setInvoiceForm({ ...invoiceForm, status: val })}
                >
                  <SelectTrigger className="font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* EMISSÃO DIRETA NO ASAAS BANK */}
            {!invoiceDialog.invoice && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#6b26d9] block">Emitir Cobrança no Asaas Bank Agora</span>
                  <span className="text-[11px] text-muted-foreground block">
                    Gera QR Code Pix e link oficial de pagamento na API do Asaas.
                  </span>
                </div>
                <Switch
                  checked={invoiceForm.emitAsaas}
                  onCheckedChange={(val) => setInvoiceForm({ ...invoiceForm, emitAsaas: val })}
                  className="data-[state=checked]:bg-[#6b26d9]"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">Descrição / Observações</Label>
              <Textarea
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                placeholder="Ex: Mensalidade escolar referente a Setembro..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialog({ open: false })}>
              Cancelar
            </Button>
            <Button onClick={saveInvoice} disabled={isSubmitting} className="bg-[#6b26d9] hover:bg-[#581c87] text-white font-bold">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {invoiceDialog.invoice ? 'Salvar Fatura' : 'Gerar Fatura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
