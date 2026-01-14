import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, User, Users, Search, Check, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const guardianSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, 'Nome do responsável é obrigatório'),
  relationship: z.string().min(1, 'Parentesco é obrigatório'),
  phone: z.string().min(10, 'Telefone é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  cpf: z.string().optional(),
  address: z.string().optional(),
  is_primary: z.boolean().default(false),
});

const studentSchema = z.object({
  full_name: z.string().min(3, 'Nome completo é obrigatório'),
  birth_date: z.string().min(1, 'Data de nascimento é obrigatória'),
  gender: z.string().optional(),
  enrollment_number: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  guardians: z.array(guardianSchema).min(1, 'Adicione pelo menos um responsável'),
});

export type StudentFormData = z.infer<typeof studentSchema>;
export type GuardianData = z.infer<typeof guardianSchema>;

interface StudentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: StudentFormData) => Promise<void>;
  initialData?: Partial<StudentFormData>;
  mode?: 'create' | 'edit';
}

interface ExistingGuardian {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  relationship: string | null;
  address: string | null;
}

export const StudentForm = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode = 'create',
}: StudentFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showGuardianSearch, setShowGuardianSearch] = useState<number | null>(null);
  const [guardianSearchQuery, setGuardianSearchQuery] = useState('');
  const [existingGuardians, setExistingGuardians] = useState<ExistingGuardian[]>([]);
  const [searchingGuardians, setSearchingGuardians] = useState(false);
  const { school } = useAuth();

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      full_name: '',
      birth_date: '',
      gender: '',
      enrollment_number: '',
      address: '',
      notes: '',
      guardians: [
        {
          name: '',
          relationship: '',
          phone: '',
          email: '',
          cpf: '',
          address: '',
          is_primary: true,
        },
      ],
    },
  });

  // Reset form when initialData changes (for edit mode)
  useEffect(() => {
    if (open && initialData) {
      form.reset({
        full_name: initialData.full_name || '',
        birth_date: initialData.birth_date || '',
        gender: initialData.gender || '',
        enrollment_number: initialData.enrollment_number || '',
        address: initialData.address || '',
        notes: initialData.notes || '',
        guardians: initialData.guardians || [
          {
            name: '',
            relationship: '',
            phone: '',
            email: '',
            cpf: '',
            address: '',
            is_primary: true,
          },
        ],
      });
    } else if (open && !initialData) {
      form.reset({
        full_name: '',
        birth_date: '',
        gender: '',
        enrollment_number: '',
        address: '',
        notes: '',
        guardians: [
          {
            name: '',
            relationship: '',
            phone: '',
            email: '',
            cpf: '',
            address: '',
            is_primary: true,
          },
        ],
      });
    }
  }, [open, initialData, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'guardians',
  });

  // Search existing guardians
  useEffect(() => {
    const searchGuardians = async () => {
      if (!school?.id || guardianSearchQuery.length < 2) {
        setExistingGuardians([]);
        return;
      }

      setSearchingGuardians(true);
      try {
        const { data, error } = await supabase
          .from('guardians')
          .select('id, full_name, phone, email, cpf, relationship, address')
          .eq('school_id', school.id)
          .or(`full_name.ilike.%${guardianSearchQuery}%,phone.ilike.%${guardianSearchQuery}%,cpf.ilike.%${guardianSearchQuery}%`)
          .limit(10);

        if (error) throw error;
        setExistingGuardians(data || []);
      } catch (error) {
        console.error('Erro ao buscar responsáveis:', error);
      } finally {
        setSearchingGuardians(false);
      }
    };

    const debounce = setTimeout(searchGuardians, 300);
    return () => clearTimeout(debounce);
  }, [guardianSearchQuery, school?.id]);

  const selectExistingGuardian = (guardian: ExistingGuardian, index: number) => {
    form.setValue(`guardians.${index}.id`, guardian.id, { shouldDirty: true });
    form.setValue(`guardians.${index}.name`, guardian.full_name, { shouldDirty: true });
    form.setValue(`guardians.${index}.phone`, guardian.phone || '', { shouldDirty: true });
    form.setValue(`guardians.${index}.email`, guardian.email || '', { shouldDirty: true });
    form.setValue(`guardians.${index}.cpf`, guardian.cpf || '', { shouldDirty: true });
    form.setValue(`guardians.${index}.relationship`, guardian.relationship || '', { shouldDirty: true });
    form.setValue(`guardians.${index}.address`, guardian.address || '', { shouldDirty: true });
    setShowGuardianSearch(null);
    setGuardianSearchQuery('');
  };

  const addGuardian = () => {
    append({
      name: '',
      relationship: '',
      phone: '',
      email: '',
      cpf: '',
      address: '',
      is_primary: false,
    });
  };

  const handleSubmit = async (data: StudentFormData) => {
    setIsLoading(true);
    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Novo Aluno' : 'Editar Aluno'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Preencha os dados do aluno e dos responsáveis'
              : 'Atualize os dados do aluno'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs defaultValue="student" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="student" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Dados do Aluno
                </TabsTrigger>
                <TabsTrigger value="guardians" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Responsáveis ({fields.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="student" className="space-y-4 mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="full_name"
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
                    name="birth_date"
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
                    name="gender"
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
                    name="enrollment_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nº Matrícula</FormLabel>
                        <FormControl>
                          <Input placeholder="Gerado automaticamente" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
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
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Alergias, necessidades especiais, etc."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="guardians" className="space-y-4 mt-4">
                <ScrollArea className="max-h-[400px] pr-4">
                  <div className="space-y-6">
                    {fields.map((field, index) => (
                      <Card key={field.id} className="relative">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Responsável {index + 1}
                              {index === 0 && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                  Principal
                                </span>
                              )}
                            </CardTitle>
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Search existing guardian button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowGuardianSearch(showGuardianSearch === index ? null : index)}
                            className="w-full"
                          >
                            <Search className="mr-2 h-4 w-4" />
                            Buscar Responsável Existente
                          </Button>

                          {showGuardianSearch === index && (
                            <Card className="border-dashed">
                              <CardContent className="pt-4 space-y-3">
                                <Input
                                  placeholder="Buscar por nome, telefone ou CPF..."
                                  value={guardianSearchQuery}
                                  onChange={(e) => setGuardianSearchQuery(e.target.value)}
                                  autoFocus
                                />
                                {searchingGuardians && (
                                  <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  </div>
                                )}
                                {!searchingGuardians && existingGuardians.length > 0 && (
                                  <ScrollArea className="h-[150px]">
                                    <div className="space-y-2">
                                      {existingGuardians.map((guardian) => (
                                        <div
                                          key={guardian.id}
                                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                                          onClick={() => selectExistingGuardian(guardian, index)}
                                        >
                                          <div>
                                            <p className="font-medium">{guardian.full_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                              {guardian.phone} {guardian.cpf && `• ${guardian.cpf}`}
                                            </p>
                                          </div>
                                          <Check className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                )}
                                {!searchingGuardians && guardianSearchQuery.length >= 2 && existingGuardians.length === 0 && (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    Nenhum responsável encontrado
                                  </p>
                                )}
                                {guardianSearchQuery.length < 2 && (
                                  <p className="text-sm text-muted-foreground text-center py-2">
                                    Digite pelo menos 2 caracteres para buscar
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          )}

                          <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                              control={form.control}
                              name={`guardians.${index}.name`}
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
                              name={`guardians.${index}.relationship`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Parentesco *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
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
                              name={`guardians.${index}.phone`}
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
                              name={`guardians.${index}.email`}
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
                              name={`guardians.${index}.cpf`}
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

                            <FormField
                              control={form.control}
                              name={`guardians.${index}.address`}
                              render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                  <FormLabel>Endereço do Responsável</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Deixe em branco se for o mesmo do aluno" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>

                <Button
                  type="button"
                  variant="outline"
                  onClick={addGuardian}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Outro Responsável
                </Button>

                {form.formState.errors.guardians?.root && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.guardians.root.message}
                  </p>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? 'Cadastrar' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
