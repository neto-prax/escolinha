import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';

interface CalendarEvent {
  id?: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  event_type: string;
  affects_school_days: boolean;
  year: number;
}

interface CalendarEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent | null;
  year: number;
  onSave: (event: Omit<CalendarEvent, 'id'>) => void;
  isLoading?: boolean;
}

const eventTypes = [
  { value: 'holiday', label: 'Feriado', color: 'text-red-600' },
  { value: 'recess', label: 'Recesso', color: 'text-orange-600' },
  { value: 'event', label: 'Evento', color: 'text-blue-600' },
  { value: 'meeting', label: 'Reunião Pedagógica', color: 'text-purple-600' },
  { value: 'special', label: 'Dia Letivo Especial', color: 'text-green-600' },
];

export const CalendarEventModal = ({
  open,
  onOpenChange,
  event,
  year,
  onSave,
  isLoading = false,
}: CalendarEventModalProps) => {
  const [formData, setFormData] = useState<Omit<CalendarEvent, 'id'>>({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    event_type: 'event',
    affects_school_days: false,
    year,
  });

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        start_date: event.start_date,
        end_date: event.end_date || '',
        event_type: event.event_type,
        affects_school_days: event.affects_school_days,
        year: event.year,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        event_type: 'event',
        affects_school_days: false,
        year,
      });
    }
  }, [event, year, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{event ? 'Editar Data' : 'Nova Data'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Feriado de Carnaval"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Data Início *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Data Fim</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_type">Tipo *</Label>
            <Select
              value={formData.event_type}
              onValueChange={(value) => setFormData({ ...formData, event_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className={type.color}>{type.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição opcional..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="affects_school_days"
              checked={formData.affects_school_days}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, affects_school_days: checked === true })
              }
            />
            <Label htmlFor="affects_school_days" className="text-sm font-normal">
              Afeta a contagem de dias letivos (subtrai do total)
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const eventTypeLabels: Record<string, string> = {
  holiday: 'Feriado',
  recess: 'Recesso',
  event: 'Evento',
  meeting: 'Reunião',
  special: 'Dia Especial',
};

export const eventTypeColors: Record<string, string> = {
  holiday: 'bg-red-100 text-red-800',
  recess: 'bg-orange-100 text-orange-800',
  event: 'bg-blue-100 text-blue-800',
  meeting: 'bg-purple-100 text-purple-800',
  special: 'bg-green-100 text-green-800',
};
