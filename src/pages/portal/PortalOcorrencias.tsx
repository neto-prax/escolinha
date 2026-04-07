import { useOutletContext } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStudentOccurrences } from '@/hooks/useGuardianPortal';
import { Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  completed: { label: 'Concluída', variant: 'secondary' },
  pending: { label: 'Pendente', variant: 'destructive' },
  in_progress: { label: 'Em andamento', variant: 'default' },
};

const PortalOcorrencias = () => {
  const { portalAccess } = useOutletContext<any>();
  const guardianId = portalAccess?.guardian_id;
  const { data: occurrences, isLoading } = useStudentOccurrences(guardianId);

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
        <h1 className="text-2xl font-bold">Ocorrências</h1>
        <p className="text-muted-foreground">Registros de ocorrências dos alunos</p>
      </div>

      {!occurrences?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma ocorrência registrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {occurrences.map((occ: any) => {
            const st = statusMap[occ.status] || { label: occ.status, variant: 'outline' as const };
            return (
              <Card key={occ.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{occ.title}</span>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {(occ.students as any)?.full_name} •{' '}
                        {format(new Date(occ.record_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                      {occ.description && (
                        <p className="text-sm text-muted-foreground">{occ.description}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PortalOcorrencias;
