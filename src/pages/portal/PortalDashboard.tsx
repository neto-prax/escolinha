import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useGuardianStudents, useSchoolCalendarPortal } from '@/hooks/useGuardianPortal';
import { Loader2, GraduationCap, CalendarDays } from 'lucide-react';
import { format, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const eventTypeLabels: Record<string, string> = {
  holiday: 'Feriado',
  recess: 'Recesso',
  meeting: 'Reunião',
  exam: 'Prova',
  event: 'Evento',
  special_day: 'Dia Especial',
};

const PortalDashboard = () => {
  const { portalAccess } = useOutletContext<any>();
  const guardianId = portalAccess?.guardian_id;
  const schoolId = portalAccess?.school_id;
  const { data: students, isLoading } = useGuardianStudents(guardianId);
  const { data: calendar, isLoading: loadingCal } = useSchoolCalendarPortal(schoolId);

  const today = startOfDay(new Date());
  const upcomingEvents = (calendar || [])
    .filter((e: any) => isAfter(new Date(e.start_date), today) || format(new Date(e.start_date), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'))
    .slice(0, 10);

  if (isLoading || loadingCal) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Students summary */}
      {students && students.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Meus Filhos</h2>
          <div className="flex flex-wrap gap-3">
            {students.map((student: any) => {
              const activeClass = student.student_classes?.find((sc: any) => sc.status === 'active');
              const className = activeClass?.classes?.name;
              return (
                <Card key={student.id} className="flex-1 min-w-[200px]">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {student.full_name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{student.full_name}</p>
                      {className && <Badge variant="secondary" className="text-xs">{className}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming events */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Próximos Eventos</h2>
        {!upcomingEvents.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum evento próximo encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event: any) => (
              <Card key={event.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center bg-primary/10 rounded-lg p-2 min-w-[60px]">
                      <span className="text-lg font-bold text-primary">
                        {format(new Date(event.start_date), 'dd')}
                      </span>
                      <span className="text-xs text-primary uppercase">
                        {format(new Date(event.start_date), 'MMM', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm">{event.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {eventTypeLabels[event.event_type] || event.event_type}
                        </Badge>
                      </div>
                      {event.description && (
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                      )}
                      {event.end_date && event.end_date !== event.start_date && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          até {format(new Date(event.end_date), "dd/MM/yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalDashboard;
