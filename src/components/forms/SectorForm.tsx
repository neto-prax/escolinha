import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, MessageSquare } from 'lucide-react';

const sectorSchema = z.object({
  name: z.string().min(2, 'Nome do setor é obrigatório'),
  description: z.string().optional(),
  whatsapp_number: z.string().optional(),
  evolution_instance: z.string().optional(),
  is_active: z.boolean().default(true),
});

type SectorFormData = z.infer<typeof sectorSchema>;

interface SectorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SectorFormData) => Promise<void>;
  initialData?: Partial<SectorFormData>;
  mode?: 'create' | 'edit';
}

export const SectorForm = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode = 'create',
}: SectorFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SectorFormData>({
    resolver: zodResolver(sectorSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      whatsapp_number: initialData?.whatsapp_number || '',
      evolution_instance: initialData?.evolution_instance || '',
      is_active: initialData?.is_active ?? true,
    },
  });

  const handleSubmit = async (data: SectorFormData) => {
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Novo Setor' : 'Editar Setor'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Crie um novo setor e vincule uma instância do WhatsApp'
              : 'Atualize os dados do setor'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Setor *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Secretaria, Financeiro, Coordenação" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva a função deste setor..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="h-4 w-4 text-primary" />
                Integração WhatsApp
              </div>

              <FormField
                control={form.control}
                name="whatsapp_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número WhatsApp</FormLabel>
                    <FormControl>
                      <Input placeholder="5511999999999" {...field} />
                    </FormControl>
                    <FormDescription>
                      Número no formato internacional (sem + ou espaços)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="evolution_instance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instância Evolution API</FormLabel>
                    <FormControl>
                      <Input placeholder="nome-da-instancia" {...field} />
                    </FormControl>
                    <FormDescription>
                      Nome da instância configurada na Evolution API
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Setor Ativo</FormLabel>
                    <FormDescription>
                      Desative para impedir acesso temporariamente
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

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
                {mode === 'create' ? 'Criar Setor' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
