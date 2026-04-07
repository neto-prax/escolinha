import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface FormData {
  record_type: string;
  title: string;
  description: string;
  record_date: string;
  duration_minutes: string;
  participants: string;
  follow_up_date: string;
  follow_up_notes: string;
}

interface PsychologyRecordModalProps {
  open: boolean;
  onClose: () => void;
  studentId: string;
  schoolId: string;
  record?: {
    id: string;
    record_type: string;
    title: string;
    description: string | null;
    record_date: string;
    duration_minutes: number | null;
    participants: string | null;
    follow_up_date: string | null;
    follow_up_notes: string | null;
  } | null;
}

const recordTypes = [
  { value: 'atendimento', label: 'Atendimento Individual' },
  { value: 'ocorrencia', label: 'Ocorrência' },
  { value: 'documento', label: 'Construção de Documento' },
  { value: 'familia', label: 'Atendimento com Família' },
  { value: 'encaminhamento', label: 'Encaminhamento' },
  { value: 'avaliacao', label: 'Avaliação Psicológica' },
  { value: 'outro', label: 'Outro' },
];

export function PsychologyRecordModal({ open, onClose, studentId, schoolId, record }: PsychologyRecordModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!record;

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>({
    defaultValues: {
      record_type: 'atendimento',
      title: '',
      description: '',
      record_date: new Date().toISOString().split('T')[0],
      duration_minutes: '',
      participants: '',
      follow_up_date: '',
      follow_up_notes: '',
    },
  });

  useEffect(() => {
    if (record) {
      setValue('record_type', record.record_type);
      setValue('title', record.title);
      setValue('description', record.description || '');
      setValue('record_date', record.record_date);
      setValue('duration_minutes', record.duration_minutes?.toString() || '');
      setValue('participants', record.participants || '');
      setValue('follow_up_date', record.follow_up_date || '');
      setValue('follow_up_notes', record.follow_up_notes || '');
    } else {
      reset({
        record_type: 'atendimento',
        title: '',
        description: '',
        record_date: new Date().toISOString().split('T')[0],
        duration_minutes: '',
        participants: '',
        follow_up_date: '',
        follow_up_notes: '',
      });
    }
  }, [record, setValue, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        student_id: studentId,
        school_id: schoolId,
        professional_id: user!.id,
        record_type: data.record_type,
        title: data.title,
        description: data.description || null,
        record_date: data.record_date,
        duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : null,
        participants: data.participants || null,
        follow_up_date: data.follow_up_date || null,
        follow_up_notes: data.follow_up_notes || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('psychology_records')
          .update(payload)
          .eq('id', record!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('psychology_records')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['psychology-records'] });
      queryClient.invalidateQueries({ queryKey: ['psychology-counts'] });
      toast({ title: isEditing ? 'Registro atualizado' : 'Registro criado com sucesso' });
      onClose();
    },
    onError: () => {
      toast({ title: 'Erro ao salvar registro', variant: 'destructive' });
    },
  });

  const recordType = watch('record_type');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Registro' : 'Novo Registro de Psicologia'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <div>
            <Label>Tipo de Registro</Label>
            <Select value={recordType} onValueChange={(v) => setValue('record_type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {recordTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Título</Label>
            <Input {...register('title', { required: true })} placeholder="Título do registro" />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea {...register('description')} placeholder="Descrição detalhada..." rows={4} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <Input type="date" {...register('record_date', { required: true })} />
            </div>
            <div>
              <Label>Duração (min)</Label>
              <Input type="number" {...register('duration_minutes')} placeholder="30" />
            </div>
          </div>

          <div>
            <Label>Participantes</Label>
            <Input {...register('participants')} placeholder="Ex: Mãe, coordenadora" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data de Retorno</Label>
              <Input type="date" {...register('follow_up_date')} />
            </div>
            <div>
              <Label>Observações do Retorno</Label>
              <Input {...register('follow_up_notes')} placeholder="Notas..." />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
