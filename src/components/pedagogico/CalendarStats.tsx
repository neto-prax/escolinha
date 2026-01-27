import { StatCard } from '@/components/ui/stat-card';
import { CalendarDays, CalendarCheck, CalendarX, Sun, PlayCircle, StopCircle } from 'lucide-react';
import { eachDayOfInterval, isWeekend, isBefore, startOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarEvent {
  id: string;
  start_date: string;
  end_date: string | null;
  event_type: string;
  affects_school_days: boolean;
}

interface CalendarStatsProps {
  year: number;
  events: CalendarEvent[];
  classStartDate?: string | null;
  classEndDate?: string | null;
}

export const CalendarStats = ({ year, events, classStartDate, classEndDate }: CalendarStatsProps) => {
  const calculateStats = () => {
    // Use configured dates or fallback to defaults (Feb 1 to Dec 20)
    const startDate = classStartDate 
      ? new Date(classStartDate) 
      : new Date(year, 1, 1);
    const endDate = classEndDate 
      ? new Date(classEndDate) 
      : new Date(year, 11, 20);
    const today = startOfDay(new Date());

    // All weekdays in the school year
    const allDays = eachDayOfInterval({ start: startDate, end: endDate })
      .filter(day => !isWeekend(day));

    // Days that reduce school days (holidays, recesses with affects_school_days = true)
    const nonSchoolDays = events
      .filter(e => e.affects_school_days && e.event_type !== 'special')
      .flatMap(e => {
        const eventStart = new Date(e.start_date);
        const eventEnd = e.end_date ? new Date(e.end_date) : eventStart;
        return eachDayOfInterval({ start: eventStart, end: eventEnd })
          .filter(day => !isWeekend(day));
      });

    // Special days that add school days (e.g., Saturday classes)
    const specialDays = events
      .filter(e => e.event_type === 'special')
      .flatMap(e => {
        const eventStart = new Date(e.start_date);
        const eventEnd = e.end_date ? new Date(e.end_date) : eventStart;
        return eachDayOfInterval({ start: eventStart, end: eventEnd });
      });

    const totalSchoolDays = allDays.length - nonSchoolDays.length + specialDays.length;

    // Calculate elapsed days
    const elapsedDays = allDays.filter(day => isBefore(day, today)).length;
    const elapsedNonSchoolDays = nonSchoolDays.filter(day => isBefore(day, today)).length;
    const elapsedSpecialDays = specialDays.filter(day => isBefore(day, today)).length;
    const elapsedSchoolDays = elapsedDays - elapsedNonSchoolDays + elapsedSpecialDays;

    // Count holidays/recesses
    const holidaysCount = events.filter(e => 
      e.event_type === 'holiday' || e.event_type === 'recess'
    ).length;

    return {
      totalSchoolDays,
      elapsedSchoolDays: Math.max(0, elapsedSchoolDays),
      remainingDays: Math.max(0, totalSchoolDays - elapsedSchoolDays),
      holidaysCount,
      startDate,
      endDate,
    };
  };

  const stats = calculateStats();

  const formatDateDisplay = (date: Date) => format(date, "dd/MM/yyyy", { locale: ptBR });

  return (
    <div className="space-y-4">
      {(classStartDate || classEndDate) && (
        <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
          {classStartDate && (
            <div className="flex items-center gap-2 text-sm">
              <PlayCircle className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Início:</span>
              <span className="font-medium">{formatDateDisplay(new Date(classStartDate))}</span>
            </div>
          )}
          {classEndDate && (
            <div className="flex items-center gap-2 text-sm">
              <StopCircle className="h-4 w-4 text-destructive" />
              <span className="text-muted-foreground">Fim:</span>
              <span className="font-medium">{formatDateDisplay(new Date(classEndDate))}</span>
            </div>
          )}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Dias Letivos"
          value={stats.totalSchoolDays}
          description={`Ano letivo ${year}`}
          icon={CalendarDays}
        />
        <StatCard
          title="Dias Transcorridos"
          value={stats.elapsedSchoolDays}
          description="Dias letivos já passados"
          icon={CalendarCheck}
        />
        <StatCard
          title="Dias Restantes"
          value={stats.remainingDays}
          description="Dias letivos restantes"
          icon={CalendarX}
        />
        <StatCard
          title="Feriados/Recessos"
          value={stats.holidaysCount}
          description="Total cadastrado"
          icon={Sun}
        />
      </div>
    </div>
  );
};
