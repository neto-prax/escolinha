import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, CreditCard, Percent, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PaymentPlan {
  id: string;
  name: string;
  description: string | null;
  installments: number;
  discount_percentage: number;
  is_active: boolean;
  sort_order: number;
}

interface DiscountType {
  id: string;
  name: string;
  description: string | null;
  discount_percentage: number | null;
  discount_fixed: number | null;
  is_active: boolean;
}

export const FinancialSettings = () => {
  const { school } = useAuth();
  const queryClient = useQueryClient();
  
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PaymentPlan | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<DiscountType | null>(null);
  const [planToDelete, setPlanToDelete] = useState<PaymentPlan | null>(null);
  
  // Plan form state
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planInstallments, setPlanInstallments] = useState(1);
  const [planDiscount, setPlanDiscount] = useState(0);
  
  // Discount form state
  const [discountName, setDiscountName] = useState('');
  const [discountDescription, setDiscountDescription] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState<number | null>(null);
  const [discountFixed, setDiscountFixed] = useState<number | null>(null);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');

  // Fetch payment plans
  const { data: paymentPlans = [], isLoading: isLoadingPlans } = useQuery({
    queryKey: ['payment-plans', school?.id],
    queryFn: async () => {
      if (!school?.id) return [];
      const { data, error } = await supabase
        .from('payment_plans')
        .select('*')
        .eq('school_id', school.id)
        .order('sort_order');
      if (error) throw error;
      return data as PaymentPlan[];
    },
    enabled: !!school?.id,
  });

  // Fetch discount types
  const { data: discountTypes = [], isLoading: isLoadingDiscounts } = useQuery({
    queryKey: ['discount-types', school?.id],
    queryFn: async () => {
      if (!school?.id) return [];
      const { data, error } = await supabase
        .from('discount_types')
        .select('*')
        .eq('school_id', school.id)
        .order('name');
      if (error) throw error;
      return data as DiscountType[];
    },
    enabled: !!school?.id,
  });

  // Mutations
  const savePlanMutation = useMutation({
    mutationFn: async (data: Partial<PaymentPlan>) => {
      if (!school?.id) throw new Error('Escola não identificada');
      if (editingPlan) {
        const { error } = await supabase
          .from('payment_plans')
          .update(data)
          .eq('id', editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payment_plans')
          .insert({
            name: data.name!,
            description: data.description,
            installments: data.installments || 1,
            discount_percentage: data.discount_percentage || 0,
            school_id: school.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      setIsPlanDialogOpen(false);
      resetPlanForm();
      toast.success(editingPlan ? 'Plano atualizado!' : 'Plano criado!');
    },
    onError: () => toast.error('Erro ao salvar plano'),
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payment_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      setPlanToDelete(null);
      toast.success('Plano removido!');
    },
    onError: () => toast.error('Erro ao remover plano'),
  });

  const togglePlanMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('payment_plans')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      toast.success('Plano atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar plano'),
  });

  const saveDiscountMutation = useMutation({
    mutationFn: async (data: Partial<DiscountType>) => {
      if (editingDiscount) {
        const { error } = await supabase
          .from('discount_types')
          .update(data)
          .eq('id', editingDiscount.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('discount_types')
          .insert({
            name: data.name!,
            description: data.description,
            discount_percentage: data.discount_percentage,
            discount_fixed: data.discount_fixed,
            school_id: school?.id!,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-types'] });
      setIsDiscountDialogOpen(false);
      resetDiscountForm();
      toast.success(editingDiscount ? 'Desconto atualizado!' : 'Desconto criado!');
    },
    onError: () => toast.error('Erro ao salvar desconto'),
  });

  const deleteDiscountMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('discount_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-types'] });
      toast.success('Desconto removido!');
    },
    onError: () => toast.error('Erro ao remover desconto'),
  });

  const resetPlanForm = () => {
    setEditingPlan(null);
    setPlanName('');
    setPlanDescription('');
    setPlanInstallments(1);
    setPlanDiscount(0);
  };

  const resetDiscountForm = () => {
    setEditingDiscount(null);
    setDiscountName('');
    setDiscountDescription('');
    setDiscountPercentage(null);
    setDiscountFixed(null);
    setDiscountType('percentage');
  };

  const openPlanDialog = (plan?: PaymentPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanName(plan.name);
      setPlanDescription(plan.description || '');
      setPlanInstallments(plan.installments);
      setPlanDiscount(plan.discount_percentage);
    } else {
      resetPlanForm();
    }
    setIsPlanDialogOpen(true);
  };

  const openDiscountDialog = (discount?: DiscountType) => {
    if (discount) {
      setEditingDiscount(discount);
      setDiscountName(discount.name);
      setDiscountDescription(discount.description || '');
      setDiscountPercentage(discount.discount_percentage);
      setDiscountFixed(discount.discount_fixed);
      setDiscountType(discount.discount_percentage ? 'percentage' : 'fixed');
    } else {
      resetDiscountForm();
    }
    setIsDiscountDialogOpen(true);
  };

  const handleSavePlan = () => {
    if (!planName.trim()) {
      toast.error('Nome do plano é obrigatório');
      return;
    }
    savePlanMutation.mutate({
      name: planName,
      description: planDescription,
      installments: planInstallments,
      discount_percentage: planDiscount,
    });
  };

  const handleSaveDiscount = () => {
    if (!discountName.trim()) {
      toast.error('Nome do desconto é obrigatório');
      return;
    }
    saveDiscountMutation.mutate({
      name: discountName,
      description: discountDescription,
      discount_percentage: discountType === 'percentage' ? discountPercentage : null,
      discount_fixed: discountType === 'fixed' ? discountFixed : null,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Planos de mensalidade
          </TabsTrigger>
          <TabsTrigger value="discounts" className="gap-2">
            <Percent className="h-4 w-4" />
            Tipos de Desconto
          </TabsTrigger>
        </TabsList>

        {/* Payment Plans Tab */}
        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Planos de mensalidade</CardTitle>
                <CardDescription>
                  Configure as opções de cobrança disponíveis nas matrículas
                </CardDescription>
              </div>
              <Button onClick={() => openPlanDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Plano
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingPlans ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : paymentPlans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum plano configurado.</p>
                  <p className="text-sm">Crie planos como "Anual à Vista", "Semestral" ou "Mensal".</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{plan.name}</span>
                            {!plan.is_active && (
                              <Badge variant="secondary">Inativo</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {plan.installments}x {plan.discount_percentage > 0 && `• ${plan.discount_percentage}% desconto`}
                          </p>
                          {plan.description && (
                            <p className="text-sm text-muted-foreground">{plan.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-2 pr-2">
                          <span className="text-xs text-muted-foreground">
                            {plan.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                          <Switch
                            checked={plan.is_active}
                            disabled={togglePlanMutation.isPending}
                            onCheckedChange={(checked) => togglePlanMutation.mutate({ id: plan.id, isActive: checked })}
                            aria-label={`${plan.is_active ? 'Desativar' : 'Ativar'} plano ${plan.name}`}
                          />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => openPlanDialog(plan)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPlanToDelete(plan)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discount Types Tab */}
        <TabsContent value="discounts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tipos de Desconto</CardTitle>
                <CardDescription>
                  Configure os descontos disponíveis para aplicar na matrícula
                </CardDescription>
              </div>
              <Button onClick={() => openDiscountDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Desconto
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingDiscounts ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : discountTypes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum tipo de desconto configurado.</p>
                  <p className="text-sm">Crie descontos como "Irmão matriculado", "Funcionário", "Bolsa".</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {discountTypes.map((discount) => (
                    <div
                      key={discount.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{discount.name}</span>
                          <Badge variant="outline">
                            {discount.discount_percentage
                              ? `${discount.discount_percentage}%`
                              : formatCurrency(discount.discount_fixed || 0)}
                          </Badge>
                          {!discount.is_active && (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </div>
                        {discount.description && (
                          <p className="text-sm text-muted-foreground">{discount.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openDiscountDialog(discount)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteDiscountMutation.mutate(discount.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Plan Dialog */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar plano de mensalidade' : 'Novo plano de mensalidade'}</DialogTitle>
            <DialogDescription>
              Configure um plano de mensalidade para as matrículas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Plano *</Label>
              <Input
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="Ex: Anual à Vista"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={planDescription}
                onChange={(e) => setPlanDescription(e.target.value)}
                placeholder="Ex: 12 meses com desconto"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número de Parcelas</Label>
                <Input
                  type="number"
                  min={1}
                  value={planInstallments}
                  onChange={(e) => setPlanInstallments(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label>Desconto (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={planDiscount}
                  onChange={(e) => setPlanDiscount(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPlanDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePlan} disabled={savePlanMutation.isPending}>
              {savePlanMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!planToDelete} onOpenChange={(open) => { if (!open) setPlanToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano de mensalidade?</AlertDialogTitle>
            <AlertDialogDescription>
              O plano “{planToDelete?.name}” será removido. Matrículas que já usam esse plano podem impedir a exclusão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePlanMutation.isPending}
              onClick={() => {
                if (planToDelete) deletePlanMutation.mutate(planToDelete.id);
              }}
            >
              Excluir plano
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discount Dialog */}
      <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDiscount ? 'Editar Desconto' : 'Novo Desconto'}</DialogTitle>
            <DialogDescription>
              Configure um tipo de desconto para aplicar nas matrículas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Desconto *</Label>
              <Input
                value={discountName}
                onChange={(e) => setDiscountName(e.target.value)}
                placeholder="Ex: Irmão matriculado"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={discountDescription}
                onChange={(e) => setDiscountDescription(e.target.value)}
                placeholder="Ex: Desconto para irmãos na mesma escola"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Desconto</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={discountType === 'percentage'}
                    onChange={() => setDiscountType('percentage')}
                  />
                  <span>Percentual (%)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={discountType === 'fixed'}
                    onChange={() => setDiscountType('fixed')}
                  />
                  <span>Valor Fixo (R$)</span>
                </label>
              </div>
            </div>
            {discountType === 'percentage' ? (
              <div className="space-y-2">
                <Label>Desconto (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercentage || ''}
                  onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || null)}
                  placeholder="Ex: 10"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Valor do Desconto (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  value={discountFixed || ''}
                  onChange={(e) => setDiscountFixed(parseFloat(e.target.value) || null)}
                  placeholder="Ex: 50"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDiscountDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveDiscount} disabled={saveDiscountMutation.isPending}>
              {saveDiscountMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
