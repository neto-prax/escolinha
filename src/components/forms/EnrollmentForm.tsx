import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Users, GraduationCap, FileText, Check, ChevronRight, ChevronLeft, CreditCard, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

const enrollmentSchema = z.object({
  // Step 1: Student data (read-only when pre-filled)
  student_name: z.string().min(3, 'Nome completo é obrigatório'),
  student_birth_date: z.string().optional(),
  student_gender: z.string().optional(),
  student_address: z.string().optional(),
  student_notes: z.string().optional(),
  // Step 1: Guardian data (optional when student already exists)
  guardian_name: z.string().optional(),
  guardian_relationship: z.string().optional(),
  guardian_phone: z.string().optional(),
  guardian_email: z.string().optional(),
  guardian_cpf: z.string().optional(),
  // Step 2: Class selection
  class_id: z.string().min(1, 'Selecione uma turma'),
  enrollment_date: z.string().min(1, 'Data de matrícula é obrigatória'),
  // Step 3: Payment plan
  payment_plan: z.string().min(1, 'Selecione um plano de pagamento'),
  payment_day: z.string().optional(),
  discount_type_id: z.string().optional(),
  custom_discount_percentage: z.number().optional(),
  custom_discount_fixed: z.number().optional(),
  // Step 4: Documents
  documents_notes: z.string().optional(),
});

type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

interface StudentData {
  id?: string;
  name: string;
  birth_date?: string;
  gender?: string;
  address?: string;
  notes?: string;
  guardian: string;
  guardian_phone: string;
  guardian_email?: string;
  guardian_cpf?: string;
  guardian_relationship?: string;
}

export interface EnrollmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EnrollmentFormData) => Promise<void>;
  classes?: Array<{ id: string; name: string; grade: string; shift: string; available_spots: number; monthly_fee?: number }>;
  studentData?: StudentData;
}

const steps = [
  { id: 1, title: 'Dados', icon: User },
  { id: 2, title: 'Turma', icon: GraduationCap },
  { id: 3, title: 'Pagamento', icon: CreditCard },
  { id: 4, title: 'Documentos', icon: FileText },
];

// Fallback payment plans when none configured
const getFallbackPlans = (monthlyFee: number = 850) => [
  { 
    id: 'annual', 
    name: 'Anual à Vista', 
    description: '12 meses com 10% de desconto',
    installments: 1,
    discount_percentage: 10
  },
  { 
    id: 'semestral', 
    name: 'Semestral', 
    description: '2x com 5% de desconto',
    installments: 2,
    discount_percentage: 5
  },
  { 
    id: 'monthly', 
    name: 'Mensal', 
    description: '12 parcelas mensais',
    installments: 12,
    discount_percentage: 0
  },
];

export const EnrollmentForm = ({
  open,
  onOpenChange,
  onSubmit,
  classes = [],
  studentData,
}: EnrollmentFormProps) => {
  const { school } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(studentData ? 2 : 1);
  const [showCustomDiscount, setShowCustomDiscount] = useState(false);

  // Fetch payment plans from database
  const { data: dbPaymentPlans = [] } = useQuery({
    queryKey: ['payment-plans', school?.id],
    queryFn: async () => {
      if (!school?.id) return [];
      const { data, error } = await supabase
        .from('payment_plans')
        .select('*')
        .eq('school_id', school.id)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!school?.id && open,
  });

  // Fetch discount types from database
  const { data: discountTypes = [] } = useQuery({
    queryKey: ['discount-types', school?.id],
    queryFn: async () => {
      if (!school?.id) return [];
      const { data, error } = await supabase
        .from('discount_types')
        .select('*')
        .eq('school_id', school.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!school?.id && open,
  });

  // Use database plans or fallback
  const paymentPlans = dbPaymentPlans.length > 0 ? dbPaymentPlans : getFallbackPlans();

  const form = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      student_name: '',
      student_birth_date: '',
      student_gender: '',
      student_address: '',
      student_notes: '',
      guardian_name: '',
      guardian_relationship: '',
      guardian_phone: '',
      guardian_email: '',
      guardian_cpf: '',
      class_id: '',
      enrollment_date: new Date().toISOString().split('T')[0],
      payment_plan: '',
      payment_day: '10',
      documents_notes: '',
    },
  });

  // Pre-fill form when studentData changes
  useEffect(() => {
    if (studentData && open) {
      form.setValue('student_name', studentData.name, { shouldDirty: true });
      form.setValue('student_birth_date', studentData.birth_date || '', { shouldDirty: true });
      form.setValue('student_gender', studentData.gender || '', { shouldDirty: true });
      form.setValue('student_address', studentData.address || '', { shouldDirty: true });
      form.setValue('student_notes', studentData.notes || '', { shouldDirty: true });
      form.setValue('guardian_name', studentData.guardian, { shouldDirty: true });
      form.setValue('guardian_phone', studentData.guardian_phone, { shouldDirty: true });
      form.setValue('guardian_email', studentData.guardian_email || '', { shouldDirty: true });
      form.setValue('guardian_cpf', studentData.guardian_cpf || '', { shouldDirty: true });
      form.setValue('guardian_relationship', studentData.guardian_relationship || '', { shouldDirty: true });
      setCurrentStep(2); // Go directly to class selection
    }
  }, [studentData, open, form]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setCurrentStep(studentData ? 2 : 1);
    }
  }, [open, form, studentData]);

  const selectedClassId = form.watch('class_id');
  const selectedClass = classes.find(c => c.id === selectedClassId);
  const selectedDiscountTypeId = form.watch('discount_type_id');
  const selectedDiscountType = discountTypes.find(d => d.id === selectedDiscountTypeId);

  const handleSubmit = async (data: EnrollmentFormData) => {
    setIsLoading(true);
    try {
      await onSubmit(data);
      form.reset();
      setCurrentStep(1);
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      // If we have studentData and we're at step 2, go back should close the modal
      if (studentData && currentStep === 2) {
        onOpenChange(false);
        return;
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const getFieldsForStep = (step: number): (keyof EnrollmentFormData)[] => {
    switch (step) {
      case 1:
        return ['student_name'];
      case 2:
        return ['class_id', 'enrollment_date'];
      case 3:
        return ['payment_plan'];
      case 4:
        return [];
      default:
        return [];
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {studentData ? `Matrícula - ${studentData.name}` : 'Nova Matrícula'}
          </DialogTitle>
          <DialogDescription>
            {studentData 
              ? 'Selecione a turma e o plano de pagamento para finalizar a matrícula'
              : 'Preencha todas as etapas para realizar a matrícula do aluno'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors',
                  currentStep === step.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : currentStep > step.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-muted bg-background text-muted-foreground'
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-12 h-0.5 mx-2',
                    currentStep > step.id ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Step 1: Student & Guardian Data (only if no studentData) */}
            {currentStep === 1 && !studentData && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Dados do Aluno e Responsável</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="student_name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Nome do Aluno *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo do aluno" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="student_birth_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="student_gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gênero</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="M">Masculino</SelectItem>
                            <SelectItem value="F">Feminino</SelectItem>
                            <SelectItem value="O">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="guardian_name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Nome do Responsável *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="guardian_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone/WhatsApp *</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="guardian_cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF do Responsável</FormLabel>
                        <FormControl>
                          <Input placeholder="000.000.000-00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Class Selection */}
            {currentStep === 2 && (
              <div className="space-y-4">
                {studentData && (
                  <Card className="bg-muted/50 mb-4">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Aluno:</span>
                          <p className="font-medium">{form.watch('student_name')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Responsável:</span>
                          <p className="font-medium">{form.watch('guardian_name')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Telefone:</span>
                          <p className="font-medium">{form.watch('guardian_phone')}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <h3 className="text-lg font-medium">Seleção de Turma</h3>
                
                <FormField
                  control={form.control}
                  name="enrollment_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data da Matrícula *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="class_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Turma *</FormLabel>
                      <div className="grid gap-3 md:grid-cols-2">
                        {classes.map((cls) => (
                          <Card
                            key={cls.id}
                            className={cn(
                              'cursor-pointer transition-all hover:border-primary',
                              field.value === cls.id && 'border-primary ring-1 ring-primary'
                            )}
                            onClick={() => field.onChange(cls.id)}
                          >
                            <CardHeader className="p-4">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base">{cls.name}</CardTitle>
                                <Badge variant={cls.available_spots > 3 ? 'secondary' : 'destructive'}>
                                  {cls.available_spots} vagas
                                </Badge>
                              </div>
                              <CardDescription className="flex justify-between">
                                <span>{cls.grade} • {cls.shift}</span>
                                {cls.monthly_fee && (
                                  <span className="font-medium text-foreground">
                                    {formatCurrency(cls.monthly_fee)}/mês
                                  </span>
                                )}
                              </CardDescription>
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 3: Payment Plan Selection */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Plano de Pagamento</h3>
                
                {selectedClass && (
                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    <span className="text-muted-foreground">Turma selecionada: </span>
                    <span className="font-medium">{selectedClass.name}</span>
                    <span className="text-muted-foreground"> - Mensalidade: </span>
                    <span className="font-medium">{formatCurrency(selectedClass.monthly_fee || 850)}</span>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="payment_plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Selecione o Plano *</FormLabel>
                      <div className="grid gap-3">
                        {paymentPlans.map((plan) => (
                          <Card
                            key={plan.id}
                            className={cn(
                              'cursor-pointer transition-all hover:border-primary',
                              field.value === plan.id && 'border-primary ring-1 ring-primary'
                            )}
                            onClick={() => field.onChange(plan.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                                    field.value === plan.id 
                                      ? "border-primary bg-primary" 
                                      : "border-muted-foreground"
                                  )}>
                                    {field.value === plan.id && (
                                      <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium">{plan.name}</p>
                                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-lg">
                                    {plan.installments}x
                                  </p>
                                  {plan.discount_percentage > 0 && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                                      {plan.discount_percentage}% OFF
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment_day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dia de Vencimento</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o dia" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="5">Dia 5</SelectItem>
                          <SelectItem value="10">Dia 10</SelectItem>
                          <SelectItem value="15">Dia 15</SelectItem>
                          <SelectItem value="20">Dia 20</SelectItem>
                          <SelectItem value="25">Dia 25</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 4: Documents */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Documentos e Confirmação</h3>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Checklist de Documentos</CardTitle>
                    <CardDescription>
                      Marque os documentos entregues pelo responsável
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      'Certidão de nascimento (cópia)',
                      'RG e CPF do responsável',
                      'Comprovante de residência',
                      'Declaração de transferência (se aplicável)',
                      'Carteira de vacinação',
                      'Foto 3x4 do aluno',
                    ].map((doc) => (
                      <div key={doc} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">{doc}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <FormField
                  control={form.control}
                  name="documents_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações sobre documentos</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Documentos pendentes, prazos acordados, etc."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Summary */}
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-base">Resumo da Matrícula</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p><strong>Aluno:</strong> {form.watch('student_name')}</p>
                    <p><strong>Responsável:</strong> {form.watch('guardian_name')}</p>
                    <p><strong>Telefone:</strong> {form.watch('guardian_phone')}</p>
                    <p><strong>Turma:</strong> {selectedClass?.name || '-'}</p>
                    <p><strong>Plano:</strong> {paymentPlans.find(p => p.id === form.watch('payment_plan'))?.name || '-'}</p>
                    <p><strong>Vencimento:</strong> Dia {form.watch('payment_day')}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={currentStep === 1 || (studentData && currentStep === 2) ? () => onOpenChange(false) : prevStep}
                disabled={isLoading}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                {currentStep === 1 || (studentData && currentStep === 2) ? 'Cancelar' : 'Anterior'}
              </Button>

              {currentStep < 4 ? (
                <Button type="button" onClick={nextStep}>
                  Próximo
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar Matrícula
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
