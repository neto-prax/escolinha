import { useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay, 
  isWeekend,
  isSameMonth,
  addMonths,
  startOfYear,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  event_type: string;
  affects_school_days: boolean;
}

interface CalendarGridViewProps {
  year: number;
  events: CalendarEvent[];
  classStartDate?: string | null;
  classEndDate?: string | null;
}

const eventTypeColors: Record<string, string> = {
  holiday: 'bg-red-500',
  recess: 'bg-orange-500',
  event: 'bg-blue-500',
  meeting: 'bg-purple-500',
  special: 'bg-green-500',
};

export const CalendarGridView = ({ 
  year, 
  events, 
  classStartDate, 
  classEndDate 
}: CalendarGridViewProps) => {
  const months = useMemo(() => {
    const yearStart = startOfYear(new Date(year, 0, 1));
    return Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));
  }, [year]);

  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(event => {
      const startDate = event.start_date;
      const endDate = event.end_date || startDate;
      return dateStr >= startDate && dateStr <= endDate;
    });
  };

  const isInSchoolPeriod = (date: Date) => {
    if (!classStartDate && !classEndDate) return true;
    const dateStr = format(date, 'yyyy-MM-dd');
    const start = classStartDate || '1900-01-01';
    const end = classEndDate || '2100-12-31';
    return dateStr >= start && dateStr <= end;
  };

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {months.map((month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const startDayOfWeek = getDay(monthStart);

        return (
          <div key={month.toISOString()} className="border rounded-lg p-2 bg-card">
            <h4 className="text-center font-semibold text-sm mb-2 capitalize">
              {format(month, 'MMMM', { locale: ptBR })}
            </h4>
            
            {/* Week days header */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {weekDays.map((day, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "text-center text-[10px] font-medium",
                    i === 0 || i === 6 ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {/* Empty cells before first day */}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              
              {/* Actual days */}
              {days.map((day) => {
                const dayEvents = getEventsForDay(day);
                const isWeekendDay = isWeekend(day);
                const inSchoolPeriod = isInSchoolPeriod(day);
                const hasEvent = dayEvents.length > 0;
                const primaryEvent = dayEvents[0];

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "aspect-square flex items-center justify-center text-[10px] rounded-sm relative",
                      isWeekendDay && "text-muted-foreground bg-muted/30",
                      !inSchoolPeriod && !hasEvent && "opacity-40",
                      hasEvent && eventTypeColors[primaryEvent.event_type],
                      hasEvent && "text-white font-medium"
                    )}
                    title={hasEvent ? dayEvents.map(e => e.title).join(', ') : undefined}
                  >
                    {format(day, 'd')}
                    {dayEvents.length > 1 && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Legenda dos tipos de evento
export const CalendarLegend = () => (
  <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg">
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 rounded-sm bg-red-500" />
      <span className="text-xs">Feriado</span>
    </div>
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 rounded-sm bg-orange-500" />
      <span className="text-xs">Recesso</span>
    </div>
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 rounded-sm bg-blue-500" />
      <span className="text-xs">Evento</span>
    </div>
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 rounded-sm bg-purple-500" />
      <span className="text-xs">Reunião</span>
    </div>
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 rounded-sm bg-green-500" />
      <span className="text-xs">Dia Especial</span>
    </div>
  </div>
);
