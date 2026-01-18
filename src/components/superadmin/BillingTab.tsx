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
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Edit, Trash2, DollarSign, Receipt, Search, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PlatformPlan {
  id: string;
  name: string;
  description: string | null;
  price_per_student: number;
  min_students: number | null;
  max_students: number | null;
  features: unknown;
  is_active: boolean;
  created_at: string;
}

interface SchoolSubscription {
  id: string;
  school_id: string;
  plan_id: string | null;
  custom_price_per_student: number | null;
  billing_day: number;
  status: string;
  started_at: string;
  expires_at: string | null;
  notes: string | null;
  school?: {
    name: string;
    slug: string;
    student_count?: number;
  };
  plan?: {
    name: string;
    price_per_student: number;
  };
}

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
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<SchoolSubscription[]>([]);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Search
  const [searchInvoice, setSearchInvoice] = useState('');
  
  // Plan Dialog
  const [planDialog, setPlanDialog] = useState<{ open: boolean; plan?: PlatformPlan }>({ open: false });
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    price_per_student: '',
    min_students: '',
    max_students: '',
    is_active: true,
  });
  
  // Subscription Dialog
  const [subscriptionDialog, setSubscriptionDialog] = useState<{ open: boolean; subscription?: SchoolSubscription }>({ open: false });
  const [subscriptionForm, setSubscriptionForm] = useState({
    school_id: '',
    plan_id: '',
    custom_price_per_student: '',
    billing_day: '10',
    status: 'active',
    notes: '',
  });
  
  // Invoice Dialog
  const [invoiceDialog, setInvoiceDialog] = useState<{ open: boolean; invoice?: SubscriptionInvoice }>({ open: false });
  const [invoiceForm, setInvoiceForm] = useState({
    school_id: '',
    reference_month: '',
    student_count: '',
    price_per_student: '',
    due_date: '',
    status: 'pending',
    payment_method: '',
    payment_reference: '',
    notes: '',
  });
  
  // Generate Invoice Dialog
  const [generateDialog, setGenerateDialog] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [plansRes, subsRes, invoicesRes] = await Promise.all([
        supabase.from('platform_plans').select('*').order('price_per_student'),
        supabase.from('school_subscriptions').select(`
          *,
          school:schools(name, slug),
          plan:platform_plans(name, price_per_student)
        `).order('created_at', { ascending: false }),
        supabase.from('subscription_invoices').select(`
          *,
          school:schools(name)
        `).order('due_date', { ascending: false }).limit(100),
      ]);

      if (plansRes.error) throw plansRes.error;
      if (subsRes.error) throw subsRes.error;
      if (invoicesRes.error) throw invoicesRes.error;

      setPlans(plansRes.data || []);
      setSubscriptions((subsRes.data || []) as unknown as SchoolSubscription[]);
      setInvoices((invoicesRes.data || []) as unknown as SubscriptionInvoice[]);
    } catch (error: any) {
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Plan handlers
  const openPlanDialog = (plan?: PlatformPlan) => {
    if (plan) {
      setPlanForm({
        name: plan.name,
        description: plan.description || '',
        price_per_student: plan.price_per_student.toString(),
        min_students: plan.min_students?.toString() || '',
        max_students: plan.max_students?.toString() || '',
        is_active: plan.is_active,
      });
    } else {
      setPlanForm({
        name: '',
        description: '',
        price_per_student: '',
        min_students: '',
        max_students: '',
        is_active: true,
      });
    }
    setPlanDialog({ open: true, plan });
  };

  const savePlan = async () => {
    if (!planForm.name || !planForm.price_per_student) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        name: planForm.name,
        description: planForm.description || null,
        price_per_student: parseFloat(planForm.price_per_student),
        min_students: planForm.min_students ? parseInt(planForm.min_students) : null,
        max_students: planForm.max_students ? parseInt(planForm.max_students) : null,
        is_active: planForm.is_active,
      };

      if (planDialog.plan) {
        const { error } = await supabase
          .from('platform_plans')
          .update(data)
          .eq('id', planDialog.plan.id);
        if (error) throw error;
        toast.success('Plano atualizado com sucesso');
      } else {
        const { error } = await supabase.from('platform_plans').insert(data);
        if (error) throw error;
        toast.success('Plano criado com sucesso');
      }

      setPlanDialog({ open: false });
      loadData();
    } catch (error: any) {
      toast.error('Erro ao salvar plano: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deletePlan = async (planId: string) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;

    try {
      const { error } = await supabase.from('platform_plans').delete().eq('id', planId);
      if (error) throw error;
      toast.success('Plano excluído');
      loadData();
    } catch (error: any) {
      toast.error('Erro ao excluir plano: ' + error.message);
    }
  };

  // Subscription handlers
  const openSubscriptionDialog = (subscription?: SchoolSubscription) => {
    if (subscription) {
      setSubscriptionForm({
        school_id: subscription.school_id,
        plan_id: subscription.plan_id || '',
        custom_price_per_student: subscription.custom_price_per_student?.toString() || '',
        billing_day: subscription.billing_day.toString(),
        status: subscription.status,
        notes: subscription.notes || '',
      });
    } else {
      setSubscriptionForm({
        school_id: '',
        plan_id: '',
        custom_price_per_student: '',
        billing_day: '10',
        status: 'active',
        notes: '',
      });
    }
    setSubscriptionDialog({ open: true, subscription });
  };

  const saveSubscription = async () => {
    if (!subscriptionForm.school_id) {
      toast.error('Selecione uma escola');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        school_id: subscriptionForm.school_id,
        plan_id: subscriptionForm.plan_id || null,
        custom_price_per_student: subscriptionForm.custom_price_per_student 
          ? parseFloat(subscriptionForm.custom_price_per_student) 
          : null,
        billing_day: parseInt(subscriptionForm.billing_day),
        status: subscriptionForm.status,
        notes: subscriptionForm.notes || null,
      };

      if (subscriptionDialog.subscription) {
        const { error } = await supabase
          .from('school_subscriptions')
          .update(data)
          .eq('id', subscriptionDialog.subscription.id);
        if (error) throw error;
        toast.success('Assinatura atualizada');
      } else {
        const { error } = await supabase.from('school_subscriptions').insert(data);
        if (error) throw error;
        toast.success('Assinatura criada');
      }

      setSubscriptionDialog({ open: false });
      loadData();
    } catch (error: any) {
      toast.error('Erro ao salvar assinatura: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Invoice handlers
  const openInvoiceDialog = (invoice?: SubscriptionInvoice) => {
    if (invoice) {
      setInvoiceForm({
        school_id: invoice.school_id,
        reference_month: invoice.reference_month,
        student_count: invoice.student_count.toString(),
        price_per_student: invoice.price_per_student.toString(),
        due_date: invoice.due_date,
        status: invoice.status,
        payment_method: invoice.payment_method || '',
        payment_reference: invoice.payment_reference || '',
        notes: invoice.notes || '',
      });
    } else {
      setInvoiceForm({
        school_id: '',
        reference_month: format(new Date(), 'yyyy-MM-01'),
        student_count: '',
        price_per_student: '',
        due_date: '',
        status: 'pending',
        payment_method: '',
        payment_reference: '',
        notes: '',
      });
    }
    setInvoiceDialog({ open: true, invoice });
  };

  const saveInvoice = async () => {
    if (!invoiceForm.school_id || !invoiceForm.student_count || !invoiceForm.price_per_student) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const studentCount = parseInt(invoiceForm.student_count);
      const pricePerStudent = parseFloat(invoiceForm.price_per_student);
      
      const data = {
        school_id: invoiceForm.school_id,
        reference_month: invoiceForm.reference_month || format(new Date(), 'yyyy-MM-01'),
        student_count: studentCount,
        price_per_student: pricePerStudent,
        total_amount: studentCount * pricePerStudent,
        due_date: invoiceForm.due_date || format(new Date(), 'yyyy-MM-dd'),
        status: invoiceForm.status,
        payment_method: invoiceForm.payment_method || null,
        payment_reference: invoiceForm.payment_reference || null,
        notes: invoiceForm.notes || null,
        paid_at: invoiceForm.status === 'paid' ? new Date().toISOString() : null,
      };

      if (invoiceDialog.invoice) {
        const { error } = await supabase
          .from('subscription_invoices')
          .update(data)
          .eq('id', invoiceDialog.invoice.id);
        if (error) throw error;
        toast.success('Fatura atualizada');
      } else {
        const { error } = await supabase.from('subscription_invoices').insert(data);
        if (error) throw error;
        toast.success('Fatura criada');
      }

      setInvoiceDialog({ open: false });
      loadData();
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
          paid_at: new Date().toISOString() 
        })
        .eq('id', invoice.id);
      
      if (error) throw error;
      toast.success('Fatura marcada como paga');
      loadData();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    }
  };

  const generateInvoices = async () => {
    setIsSubmitting(true);
    try {
      const referenceDate = new Date(generateMonth + '-01');
      let created = 0;

      for (const sub of subscriptions.filter(s => s.status === 'active')) {
        const pricePerStudent = sub.custom_price_per_student || sub.plan?.price_per_student || 0;
        
        // Get current student count for this school
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', sub.school_id)
          .eq('is_active', true);

        const studentCount = count || 0;
        
        if (studentCount === 0 || pricePerStudent === 0) continue;

        // Check if invoice already exists
        const { data: existing } = await supabase
          .from('subscription_invoices')
          .select('id')
          .eq('school_id', sub.school_id)
          .eq('reference_month', format(referenceDate, 'yyyy-MM-01'))
          .single();

        if (existing) continue;

        const dueDate = new Date(referenceDate);
        dueDate.setDate(sub.billing_day);

        const { error } = await supabase.from('subscription_invoices').insert({
          school_id: sub.school_id,
          subscription_id: sub.id,
          reference_month: format(referenceDate, 'yyyy-MM-01'),
          student_count: studentCount,
          price_per_student: pricePerStudent,
          total_amount: studentCount * pricePerStudent,
          due_date: format(dueDate, 'yyyy-MM-dd'),
          status: 'pending',
        });

        if (!error) created++;
      }

      toast.success(`${created} faturas geradas`);
      setGenerateDialog(false);
      loadData();
    } catch (error: any) {
      toast.error('Erro ao gerar faturas: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500"><CheckCircle className="mr-1 h-3 w-3" /> Pago</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-amber-500 text-amber-500"><Clock className="mr-1 h-3 w-3" /> Pendente</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Vencido</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.school?.name?.toLowerCase().includes(searchInvoice.toLowerCase()) ||
    inv.payment_reference?.toLowerCase().includes(searchInvoice.toLowerCase())
  );

  // Calculate totals
  const totalPending = invoices
    .filter(i => i.status === 'pending' || i.status === 'overdue')
    .reduce((acc, i) => acc + i.total_amount, 0);
  
  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((acc, i) => acc + i.total_amount, 0);

  const schoolsWithoutSubscription = schools.filter(
    s => !subscriptions.some(sub => sub.school_id === s.id)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(totalPending)}</div>
            <p className="text-xs text-muted-foreground">
              {invoices.filter(i => i.status === 'pending').length} faturas pendentes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recebido</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-muted-foreground">
              {invoices.filter(i => i.status === 'paid').length} faturas pagas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptions.filter(s => s.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">de {schools.length} escolas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.filter(p => p.is_active).length}</div>
            <p className="text-xs text-muted-foreground">planos ativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Billing Tabs */}
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">
            <Receipt className="mr-2 h-4 w-4" />
            Faturas
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            <DollarSign className="mr-2 h-4 w-4" />
            Assinaturas
          </TabsTrigger>
          <TabsTrigger value="plans">
            <FileText className="mr-2 h-4 w-4" />
            Planos
          </TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Faturas</CardTitle>
                  <CardDescription>Gerencie as faturas das escolas</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar fatura..."
                      value={searchInvoice}
                      onChange={(e) => setSearchInvoice(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Button variant="outline" onClick={() => setGenerateDialog(true)}>
                    <Receipt className="mr-2 h-4 w-4" />
                    Gerar Faturas
                  </Button>
                  <Button onClick={() => openInvoiceDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Fatura
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Escola</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Alunos</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.school?.name}</TableCell>
                      <TableCell>
                        {format(new Date(invoice.reference_month), 'MMMM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>{invoice.student_count}</TableCell>
                      <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
                      <TableCell>
                        {format(new Date(invoice.due_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {invoice.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markAsPaid(invoice)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openInvoiceDialog(invoice)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Nenhuma fatura encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Assinaturas</CardTitle>
                  <CardDescription>Configure o valor por aluno para cada escola</CardDescription>
                </div>
                <Button onClick={() => openSubscriptionDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Assinatura
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Escola</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Valor/Aluno</TableHead>
                    <TableHead>Dia Cobrança</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sub.school?.name}</p>
                          <p className="text-sm text-muted-foreground">{sub.school?.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>{sub.plan?.name || '—'}</TableCell>
                      <TableCell>
                        {formatCurrency(sub.custom_price_per_student || sub.plan?.price_per_student || 0)}
                        {sub.custom_price_per_student && (
                          <Badge variant="outline" className="ml-2 text-xs">Personalizado</Badge>
                        )}
                      </TableCell>
                      <TableCell>Dia {sub.billing_day}</TableCell>
                      <TableCell>
                        <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                          {sub.status === 'active' ? 'Ativo' : sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openSubscriptionDialog(sub)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {subscriptions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhuma assinatura cadastrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {schoolsWithoutSubscription.length > 0 && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Escolas sem assinatura ({schoolsWithoutSubscription.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {schoolsWithoutSubscription.map(s => (
                      <Badge key={s.id} variant="outline">{s.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Planos de Cobrança</CardTitle>
                  <CardDescription>Configure os planos base para cobrança por aluno</CardDescription>
                </div>
                <Button onClick={() => openPlanDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Plano
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => (
                  <Card key={plan.id} className={!plan.is_active ? 'opacity-50' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          {plan.description && (
                            <CardDescription>{plan.description}</CardDescription>
                          )}
                        </div>
                        {!plan.is_active && (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-primary">
                        {formatCurrency(plan.price_per_student)}
                        <span className="text-sm font-normal text-muted-foreground">/aluno</span>
                      </div>
                      {(plan.min_students || plan.max_students) && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {plan.min_students && `Mín: ${plan.min_students} alunos`}
                          {plan.min_students && plan.max_students && ' • '}
                          {plan.max_students && `Máx: ${plan.max_students} alunos`}
                        </p>
                      )}
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => openPlanDialog(plan)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePlan(plan.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {plans.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    Nenhum plano cadastrado. Crie um plano para começar.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Plan Dialog */}
      <Dialog open={planDialog.open} onOpenChange={(open) => setPlanDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{planDialog.plan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
            <DialogDescription>Configure o plano de cobrança</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                placeholder="Ex: Plano Básico"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                placeholder="Descrição do plano"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor por Aluno (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={planForm.price_per_student}
                onChange={(e) => setPlanForm({ ...planForm, price_per_student: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mínimo de Alunos</Label>
                <Input
                  type="number"
                  value={planForm.min_students}
                  onChange={(e) => setPlanForm({ ...planForm, min_students: e.target.value })}
                  placeholder="Sem mínimo"
                />
              </div>
              <div className="space-y-2">
                <Label>Máximo de Alunos</Label>
                <Input
                  type="number"
                  value={planForm.max_students}
                  onChange={(e) => setPlanForm({ ...planForm, max_students: e.target.value })}
                  placeholder="Sem máximo"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialog({ open: false })}>
              Cancelar
            </Button>
            <Button onClick={savePlan} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Dialog */}
      <Dialog open={subscriptionDialog.open} onOpenChange={(open) => setSubscriptionDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{subscriptionDialog.subscription ? 'Editar Assinatura' : 'Nova Assinatura'}</DialogTitle>
            <DialogDescription>Configure a cobrança da escola</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Escola *</Label>
              <Select
                value={subscriptionForm.school_id}
                onValueChange={(v) => setSubscriptionForm({ ...subscriptionForm, school_id: v })}
                disabled={!!subscriptionDialog.subscription}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma escola" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plano Base</Label>
              <Select
                value={subscriptionForm.plan_id}
                onValueChange={(v) => setSubscriptionForm({ ...subscriptionForm, plan_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum (usar valor personalizado)</SelectItem>
                  {plans.filter(p => p.is_active).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} - {formatCurrency(p.price_per_student)}/aluno
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor Personalizado por Aluno (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={subscriptionForm.custom_price_per_student}
                onChange={(e) => setSubscriptionForm({ ...subscriptionForm, custom_price_per_student: e.target.value })}
                placeholder="Deixe vazio para usar valor do plano"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dia de Cobrança</Label>
                <Input
                  type="number"
                  min="1"
                  max="28"
                  value={subscriptionForm.billing_day}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, billing_day: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={subscriptionForm.status}
                  onValueChange={(v) => setSubscriptionForm({ ...subscriptionForm, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={subscriptionForm.notes}
                onChange={(e) => setSubscriptionForm({ ...subscriptionForm, notes: e.target.value })}
                placeholder="Notas sobre esta assinatura..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscriptionDialog({ open: false })}>
              Cancelar
            </Button>
            <Button onClick={saveSubscription} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={invoiceDialog.open} onOpenChange={(open) => setInvoiceDialog({ open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{invoiceDialog.invoice ? 'Editar Fatura' : 'Nova Fatura'}</DialogTitle>
            <DialogDescription>Configure os dados da fatura</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Escola *</Label>
              <Select
                value={invoiceForm.school_id}
                onValueChange={(v) => setInvoiceForm({ ...invoiceForm, school_id: v })}
                disabled={!!invoiceDialog.invoice}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma escola" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mês Referência</Label>
                <Input
                  type="month"
                  value={invoiceForm.reference_month.substring(0, 7)}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, reference_month: e.target.value + '-01' })}
                />
              </div>
              <div className="space-y-2">
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={invoiceForm.due_date}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Qtd Alunos *</Label>
                <Input
                  type="number"
                  value={invoiceForm.student_count}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, student_count: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor/Aluno *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={invoiceForm.price_per_student}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, price_per_student: e.target.value })}
                />
              </div>
            </div>
            {invoiceForm.student_count && invoiceForm.price_per_student && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total da fatura:</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(parseInt(invoiceForm.student_count) * parseFloat(invoiceForm.price_per_student))}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={invoiceForm.status}
                onValueChange={(v) => setInvoiceForm({ ...invoiceForm, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Vencido</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {invoiceForm.status === 'paid' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Input
                    value={invoiceForm.payment_method}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, payment_method: e.target.value })}
                    placeholder="PIX, Boleto, etc"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Referência</Label>
                  <Input
                    value={invoiceForm.payment_reference}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, payment_reference: e.target.value })}
                    placeholder="Nº comprovante"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                placeholder="Notas sobre esta fatura..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialog({ open: false })}>
              Cancelar
            </Button>
            <Button onClick={saveInvoice} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Invoices Dialog */}
      <Dialog open={generateDialog} onOpenChange={setGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Faturas em Lote</DialogTitle>
            <DialogDescription>
              Gera faturas automaticamente para todas as escolas com assinatura ativa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Mês de Referência</Label>
              <Input
                type="month"
                value={generateMonth}
                onChange={(e) => setGenerateMonth(e.target.value)}
              />
            </div>
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">Serão geradas faturas para:</p>
              <p className="text-muted-foreground">
                {subscriptions.filter(s => s.status === 'active').length} escolas com assinatura ativa
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                * Faturas já existentes para este mês serão ignoradas
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={generateInvoices} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gerar Faturas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
