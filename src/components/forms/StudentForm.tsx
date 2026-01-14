import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { Loader2, User, Users, FileText, Search, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const studentSchema = z.object({
  full_name: z.string().min(3, 'Nome completo é obrigatório'),
  birth_date: z.string().min(1, 'Data de nascimento é obrigatória'),
  gender: z.string().optional(),
  enrollment_number: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  // Guardian info
  guardian_name: z.string().min(3, 'Nome do responsável é obrigatório'),
  guardian_relationship: z.string().min(1, 'Parentesco é obrigatório'),
  guardian_phone: z.string().min(10, 'Telefone é obrigatório'),
  guardian_email: z.string().email('Email inválido').optional().or(z.literal('')),
  guardian_cpf: z.string().optional(),
  guardian_address: z.string().optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface StudentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: StudentFormData) => Promise<void>;
  initialData?: Partial<StudentFormData>;
  mode?: 'create' | 'edit';
}

interface Guardian {
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
  const [showGuardianSearch, setShowGuardianSearch] = useState(false);
  const [guardianSearchQuery, setGuardianSearchQuery] = useState('');
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [searchingGuardians, setSearchingGuardians] = useState(false);
  const { school } = useAuth();

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      full_name: initialData?.full_name || '',
      birth_date: initialData?.birth_date || '',
      gender: initialData?.gender || '',
      enrollment_number: initialData?.enrollment_number || '',
      address: initialData?.address || '',
      notes: initialData?.notes || '',
      guardian_name: initialData?.guardian_name || '',
      guardian_relationship: initialData?.guardian_relationship || '',
      guardian_phone: initialData?.guardian_phone || '',
      guardian_email: initialData?.guardian_email || '',
      guardian_cpf: initialData?.guardian_cpf || '',
      guardian_address: initialData?.guardian_address || '',
    },
  });

  // Search guardians
  useEffect(() => {
    const searchGuardians = async () => {
      if (!school?.id || guardianSearchQuery.length < 2) {
        setGuardians([]);
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
        setGuardians(data || []);
      } catch (error) {
        console.error('Erro ao buscar responsáveis:', error);
      } finally {
        setSearchingGuardians(false);
      }
    };

    const debounce = setTimeout(searchGuardians, 300);
    return () => clearTimeout(debounce);
  }, [guardianSearchQuery, school?.id]);

  const selectGuardian = (guardian: Guardian) => {
    form.setValue('guardian_name', guardian.full_name, { shouldDirty: true });
    form.setValue('guardian_phone', guardian.phone || '', { shouldDirty: true });
    form.setValue('guardian_email', guardian.email || '', { shouldDirty: true });
    form.setValue('guardian_cpf', guardian.cpf || '', { shouldDirty: true });
    form.setValue('guardian_relationship', guardian.relationship || '', { shouldDirty: true });
    form.setValue('guardian_address', guardian.address || '', { shouldDirty: true });
    setShowGuardianSearch(false);
    setGuardianSearchQuery('');
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Novo Aluno' : 'Editar Aluno'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Preencha os dados do aluno e do responsável'
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
                <TabsTrigger value="guardian" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Responsável
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

              <TabsContent value="guardian" className="space-y-4 mt-4">
                {/* Search existing guardian button */}
                <div className="flex flex-col gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowGuardianSearch(!showGuardianSearch)}
                    className="w-full"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Buscar Responsável Existente
                  </Button>

                  {showGuardianSearch && (
                    <Card>
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
                        {!searchingGuardians && guardians.length > 0 && (
                          <ScrollArea className="h-[200px]">
                            <div className="space-y-2">
                              {guardians.map((guardian) => (
                                <div
                                  key={guardian.id}
                                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                                  onClick={() => selectGuardian(guardian)}
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
                        {!searchingGuardians && guardianSearchQuery.length >= 2 && guardians.length === 0 && (
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
                </div>

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

                  <FormField
                    control={form.control}
                    name="guardian_address"
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
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? 'Cadastrar Aluno' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
