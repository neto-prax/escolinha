import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSchoolCalendarPortal } from '@/hooks/useGuardianPortal';
import { Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const eventTypeLabels: Record<string, string> = {
  holiday: 'Feriado',
  event: 'Evento',
  recess: 'Recesso',
  meeting: 'Reunião',
  exam: 'Prova',
};

const eventTypeColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  holiday: 'destructive',
  event: 'default',
  recess: 'secondary',
  meeting: 'outline',
  exam: 'secondary',
};

const PortalCalendario = () => {
  const { portalAccess } = useOutletContext<any>();
  const schoolId = portalAccess?.school_id;
  const { data: events, isLoading } = useSchoolCalendarPortal(schoolId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Calendário Escolar</h1>
        <p className="text-muted-foreground">Eventos, feriados e datas importantes</p>
      </div>

      {!events?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum evento no calendário.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event: any) => (
            <Card key={event.id}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="bg-primary/10 rounded-lg p-2 text-center min-w-[60px]">
                  <p className="text-xs text-muted-foreground">{format(new Date(event.start_date), 'MMM').toUpperCase()}</p>
                  <p className="text-xl font-bold text-primary">{format(new Date(event.start_date), 'dd')}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{event.title}</h3>
                    <Badge variant={eventTypeColors[event.event_type] || 'outline'}>
                      {eventTypeLabels[event.event_type] || event.event_type}
                    </Badge>
                  </div>
                  {event.description && (
                    <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                  )}
                  {event.end_date && event.end_date !== event.start_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Até {format(new Date(event.end_date), 'dd/MM/yyyy')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortalCalendario;
