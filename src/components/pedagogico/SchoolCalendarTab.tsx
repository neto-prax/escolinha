import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarStats } from './CalendarStats';
import { CalendarEventModal, eventTypeLabels, eventTypeColors } from './CalendarEventModal';
import { CalendarManager } from './CalendarManager';
import { Plus, Download, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/components/ui/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

interface CalendarEvent {
  id: string;
  school_id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  event_type: string;
  affects_school_days: boolean;
  year: number;
  calendar_id: string | null;
  created_at: string;
  updated_at: string;
}

interface CalendarItem {
  id: string;
  name: string;
  class_start_date: string | null;
  class_end_date: string | null;
}

export const SchoolCalendarTab = () => {
  const { profile, school } = useAuth();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  // Fetch calendars to get dates
  const { data: calendars = [] } = useQuery({
    queryKey: ['calendars', profile?.school_id, selectedYear],
    queryFn: async () => {
      if (!profile?.school_id) return [];
      const { data, error } = await supabase
        .from('calendars')
        .select('id, name, class_start_date, class_end_date')
        .eq('school_id', profile.school_id)
        .eq('year', selectedYear);

      if (error) throw error;
      return data as CalendarItem[];
    },
    enabled: !!profile?.school_id,
  });

  const selectedCalendar = calendars.find(c => c.id === selectedCalendarId);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['school-calendar', profile?.school_id, selectedYear, selectedCalendarId],
    queryFn: async () => {
      if (!profile?.school_id) return [];
      let query = supabase
        .from('school_calendar')
        .select('*')
        .eq('school_id', profile.school_id)
        .eq('year', selectedYear)
        .order('start_date', { ascending: true });

      if (selectedCalendarId) {
        query = query.eq('calendar_id', selectedCalendarId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CalendarEvent[];
    },
    enabled: !!profile?.school_id,
  });

  const createMutation = useMutation({
    mutationFn: async (eventData: Omit<CalendarEvent, 'id' | 'school_id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('school_calendar')
        .insert({
          ...eventData,
          school_id: profile?.school_id,
          end_date: eventData.end_date || null,
          calendar_id: eventData.calendar_id || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-calendar'] });
      setIsModalOpen(false);
      toast({ title: 'Data criada com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar data', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...eventData }: Partial<CalendarEvent> & { id: string }) => {
      const { error } = await supabase
        .from('school_calendar')
        .update({
          ...eventData,
          end_date: eventData.end_date || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-calendar'] });
      setIsModalOpen(false);
      setEditingEvent(null);
      toast({ title: 'Data atualizada com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar data', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('school_calendar').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-calendar'] });
      setDeleteEventId(null);
      toast({ title: 'Data removida com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover data', variant: 'destructive' });
    },
  });

  const handleSave = (eventData: Omit<CalendarEvent, 'id' | 'school_id' | 'created_at' | 'updated_at'>) => {
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, ...eventData });
    } else {
      createMutation.mutate(eventData);
    }
  };

  const handleEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const { eachDayOfInterval, isWeekend } = require('date-fns');

    // Header
    doc.setFontSize(18);
    const title = selectedCalendar 
      ? `Calendário: ${selectedCalendar.name} - ${selectedYear}`
      : `Calendário Escolar ${selectedYear}`;
    doc.text(title, 14, 22);
    doc.setFontSize(10);
    doc.text(`Escola: ${school?.name || 'N/A'}`, 14, 30);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 38);

    // Calculate total school days for summary
    const startDate = selectedCalendar?.class_start_date 
      ? new Date(selectedCalendar.class_start_date) 
      : new Date(selectedYear, 1, 1);
    const endDate = selectedCalendar?.class_end_date 
      ? new Date(selectedCalendar.class_end_date) 
      : new Date(selectedYear, 11, 20);
    
    if (selectedCalendar?.class_start_date) {
      doc.text(`Início das aulas: ${format(new Date(selectedCalendar.class_start_date), 'dd/MM/yyyy')}`, 14, 46);
    }
    if (selectedCalendar?.class_end_date) {
      doc.text(`Fim das aulas: ${format(new Date(selectedCalendar.class_end_date), 'dd/MM/yyyy')}`, 14, 54);
    }

    const allDays = eachDayOfInterval({ start: startDate, end: endDate }).filter(
      (day: Date) => !isWeekend(day)
    );
    const nonSchoolDays = events
      .filter((e) => e.affects_school_days && e.event_type !== 'special')
      .flatMap((e) => {
        const eventStart = new Date(e.start_date);
        const eventEnd = e.end_date ? new Date(e.end_date) : eventStart;
        return eachDayOfInterval({ start: eventStart, end: eventEnd }).filter(
          (day: Date) => !isWeekend(day)
        );
      });
    const specialDays = events
      .filter((e) => e.event_type === 'special')
      .flatMap((e) => {
        const eventStart = new Date(e.start_date);
        const eventEnd = e.end_date ? new Date(e.end_date) : eventStart;
        return eachDayOfInterval({ start: eventStart, end: eventEnd });
      });
    const totalSchoolDays = allDays.length - nonSchoolDays.length + specialDays.length;

    // Summary
    doc.setFontSize(12);
    const summaryY = selectedCalendar?.class_start_date || selectedCalendar?.class_end_date ? 66 : 50;
    doc.text(`Total de Dias Letivos: ${totalSchoolDays}`, 14, summaryY);

    // Events table
    autoTable(doc, {
      startY: summaryY + 10,
      head: [['Data Início', 'Data Fim', 'Título', 'Tipo', 'Afeta Dias Letivos']],
      body: events.map((e) => [
        format(new Date(e.start_date), 'dd/MM/yyyy'),
        e.end_date ? format(new Date(e.end_date), 'dd/MM/yyyy') : '-',
        e.title,
        eventTypeLabels[e.event_type] || e.event_type,
        e.affects_school_days ? 'Sim' : 'Não',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Footer with total
    const finalY = (doc as any).lastAutoTable.finalY || 60;
    doc.setFontSize(10);
    doc.text(`Total de datas cadastradas: ${events.length}`, 14, finalY + 10);

    const filename = selectedCalendar 
      ? `calendario_${selectedCalendar.name.toLowerCase().replace(/\s+/g, '_')}_${selectedYear}.pdf`
      : `calendario_escolar_${selectedYear}.pdf`;
    doc.save(filename);
    toast({ title: 'Calendário exportado com sucesso!' });
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Sidebar with calendar manager */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Ano:</span>
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <CalendarManager 
          year={selectedYear} 
          selectedCalendarId={selectedCalendarId}
          onSelectCalendar={setSelectedCalendarId}
        />
      </div>

      {/* Main content */}
      <div className="space-y-6">
        <CalendarStats 
          year={selectedYear} 
          events={events} 
          classStartDate={selectedCalendar?.class_start_date}
          classEndDate={selectedCalendar?.class_end_date}
        />

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={handleExportPDF} disabled={events.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Data
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma data cadastrada{selectedCalendar ? ` para "${selectedCalendar.name}"` : ''} em {selectedYear}. Clique em "Nova Data" para adicionar.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Afeta Dias Letivos</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      {format(new Date(event.start_date), 'dd/MM/yyyy')}
                      {event.end_date && ` - ${format(new Date(event.end_date), 'dd/MM/yyyy')}`}
                    </TableCell>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>
                      <Badge className={eventTypeColors[event.event_type] || 'bg-gray-100 text-gray-800'}>
                        {eventTypeLabels[event.event_type] || event.event_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{event.affects_school_days ? 'Sim' : 'Não'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(event)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteEventId(event.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <CalendarEventModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditingEvent(null);
        }}
        event={editingEvent}
        year={selectedYear}
        calendarId={selectedCalendarId}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={!!deleteEventId} onOpenChange={() => setDeleteEventId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta data? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEventId && deleteMutation.mutate(deleteEventId)}
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
