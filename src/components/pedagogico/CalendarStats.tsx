import { StatCard } from '@/components/ui/stat-card';
import { CalendarDays, CalendarCheck, CalendarX, Sun } from 'lucide-react';
import { eachDayOfInterval, isWeekend, isBefore, startOfDay } from 'date-fns';

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
}

export const CalendarStats = ({ year, events }: CalendarStatsProps) => {
  const calculateStats = () => {
    // School year: Feb 1 to Dec 20
    const startDate = new Date(year, 1, 1);
    const endDate = new Date(year, 11, 20);
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
    };
  };

  const stats = calculateStats();

  return (
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
  );
};
