import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Calendar, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/components/ui/use-toast';
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

interface CalendarItem {
  id: string;
  school_id: string;
  name: string;
  description: string | null;
  class_start_date: string | null;
  class_end_date: string | null;
  year: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CalendarManagerProps {
  year: number;
  selectedCalendarId: string | null;
  onSelectCalendar: (id: string | null) => void;
}

export const CalendarManager = ({ year, selectedCalendarId, onSelectCalendar }: CalendarManagerProps) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<CalendarItem | null>(null);
  const [deleteCalendarId, setDeleteCalendarId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    class_start_date: '',
    class_end_date: '',
    is_default: false,
  });

  const { data: calendars = [], isLoading } = useQuery({
    queryKey: ['calendars', profile?.school_id, year],
    queryFn: async () => {
      if (!profile?.school_id) return [];
      const { data, error } = await supabase
        .from('calendars')
        .select('*')
        .eq('school_id', profile.school_id)
        .eq('year', year)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as CalendarItem[];
    },
    enabled: !!profile?.school_id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('calendars').insert({
        school_id: profile?.school_id,
        name: data.name,
        description: data.description || null,
        class_start_date: data.class_start_date || null,
        class_end_date: data.class_end_date || null,
        year,
        is_default: data.is_default,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
      resetForm();
      toast({ title: 'Calendário criado com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar calendário', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & typeof formData) => {
      const { error } = await supabase
        .from('calendars')
        .update({
          name: data.name,
          description: data.description || null,
          class_start_date: data.class_start_date || null,
          class_end_date: data.class_end_date || null,
          is_default: data.is_default,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
      resetForm();
      toast({ title: 'Calendário atualizado!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar calendário', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('calendars').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
      if (deleteCalendarId === selectedCalendarId) {
        onSelectCalendar(null);
      }
      setDeleteCalendarId(null);
      toast({ title: 'Calendário removido!' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover calendário', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setIsModalOpen(false);
    setEditingCalendar(null);
    setFormData({
      name: '',
      description: '',
      class_start_date: '',
      class_end_date: '',
      is_default: false,
    });
  };

  const handleEdit = (calendar: CalendarItem) => {
    setEditingCalendar(calendar);
    setFormData({
      name: calendar.name,
      description: calendar.description || '',
      class_start_date: calendar.class_start_date || '',
      class_end_date: calendar.class_end_date || '',
      is_default: calendar.is_default,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCalendar) {
      updateMutation.mutate({ id: editingCalendar.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Calendários</h3>
        <Button size="sm" variant="outline" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[300px]">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : calendars.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum calendário criado.</p>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => onSelectCalendar(null)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                selectedCalendarId === null ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              Todos os eventos
            </button>
            {calendars.map((calendar) => (
              <div
                key={calendar.id}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${
                  selectedCalendarId === calendar.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
                onClick={() => onSelectCalendar(calendar.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span className="truncate">{calendar.name}</span>
                  {calendar.is_default && (
                    <Badge variant="secondary" className="text-xs shrink-0">Padrão</Badge>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(calendar);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteCalendarId(calendar.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingCalendar ? 'Editar Calendário' : 'Novo Calendário'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cal-name">Nome *</Label>
              <Input
                id="cal-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Ensino Fundamental 2026"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cal-description">Descrição</Label>
              <Textarea
                id="cal-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class_start_date">Início das Aulas</Label>
                <Input
                  id="class_start_date"
                  type="date"
                  value={formData.class_start_date}
                  onChange={(e) => setFormData({ ...formData, class_start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class_end_date">Fim das Aulas</Label>
                <Input
                  id="class_end_date"
                  type="date"
                  value={formData.class_end_date}
                  onChange={(e) => setFormData({ ...formData, class_end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="rounded border-input"
              />
              <Label htmlFor="is_default" className="text-sm font-normal">
                Definir como calendário padrão
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteCalendarId} onOpenChange={() => setDeleteCalendarId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este calendário? Todos os eventos vinculados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCalendarId && deleteMutation.mutate(deleteCalendarId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
