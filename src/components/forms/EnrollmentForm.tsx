import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Loader2, User, Users, GraduationCap, FileText, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const enrollmentSchema = z.object({
  // Step 1: Student data
  student_name: z.string().min(3, 'Nome completo é obrigatório'),
  student_birth_date: z.string().min(1, 'Data de nascimento é obrigatória'),
  student_gender: z.string().optional(),
  student_address: z.string().optional(),
  student_notes: z.string().optional(),
  // Step 2: Guardian data
  guardian_name: z.string().min(3, 'Nome do responsável é obrigatório'),
  guardian_relationship: z.string().min(1, 'Parentesco é obrigatório'),
  guardian_phone: z.string().min(10, 'Telefone é obrigatório'),
  guardian_email: z.string().email('Email inválido').optional().or(z.literal('')),
  guardian_cpf: z.string().optional(),
  // Step 3: Class selection
  class_id: z.string().min(1, 'Selecione uma turma'),
  enrollment_date: z.string().min(1, 'Data de matrícula é obrigatória'),
  // Step 4: Documents
  documents_notes: z.string().optional(),
});

type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

interface EnrollmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EnrollmentFormData) => Promise<void>;
  classes?: Array<{ id: string; name: string; grade: string; shift: string; available_spots: number }>;
}

const steps = [
  { id: 1, title: 'Dados do Aluno', icon: User },
  { id: 2, title: 'Responsável', icon: Users },
  { id: 3, title: 'Turma', icon: GraduationCap },
  { id: 4, title: 'Documentos', icon: FileText },
];

// Mock classes for demo
const mockClasses = [
  { id: '1', name: '1º Ano A', grade: '1º Ano', shift: 'Manhã', available_spots: 5 },
  { id: '2', name: '1º Ano B', grade: '1º Ano', shift: 'Tarde', available_spots: 3 },
  { id: '3', name: '2º Ano A', grade: '2º Ano', shift: 'Manhã', available_spots: 8 },
  { id: '4', name: '3º Ano A', grade: '3º Ano', shift: 'Manhã', available_spots: 2 },
];

export const EnrollmentForm = ({
  open,
  onOpenChange,
  onSubmit,
  classes = mockClasses,
}: EnrollmentFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

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
      documents_notes: '',
    },
  });

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
      setCurrentStep(currentStep - 1);
    }
  };

  const getFieldsForStep = (step: number): (keyof EnrollmentFormData)[] => {
    switch (step) {
      case 1:
        return ['student_name', 'student_birth_date'];
      case 2:
        return ['guardian_name', 'guardian_relationship', 'guardian_phone'];
      case 3:
        return ['class_id', 'enrollment_date'];
      case 4:
        return [];
      default:
        return [];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Matrícula</DialogTitle>
          <DialogDescription>
            Preencha todas as etapas para realizar a matrícula do aluno
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
            {/* Step 1: Student Data */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Dados do Aluno</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="student_name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Nome Completo *</FormLabel>
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
                        <FormLabel>Data de Nascimento *</FormLabel>
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
                    name="student_address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input placeholder="Endereço completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="student_notes"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Alergias, necessidades especiais, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Guardian Data */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Dados do Responsável</h3>
                <div className="grid gap-4 md:grid-cols-2">
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
                    name="guardian_relationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parentesco *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="mae">Mãe</SelectItem>
                            <SelectItem value="pai">Pai</SelectItem>
                            <SelectItem value="avo">Avô/Avó</SelectItem>
                            <SelectItem value="tio">Tio/Tia</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
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
                    name="guardian_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@exemplo.com" {...field} />
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
                        <FormLabel>CPF</FormLabel>
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

            {/* Step 3: Class Selection */}
            {currentStep === 3 && (
              <div className="space-y-4">
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
                              <CardDescription>
                                {cls.grade} • {cls.shift}
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
                    <p><strong>Turma:</strong> {classes.find(c => c.id === form.watch('class_id'))?.name || '-'}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={currentStep === 1 ? () => onOpenChange(false) : prevStep}
                disabled={isLoading}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                {currentStep === 1 ? 'Cancelar' : 'Anterior'}
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
