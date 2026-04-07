import { useOutletContext } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStudentHomework } from '@/hooks/useGuardianPortal';
import { Loader2, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PortalAtividades = () => {
  const { portalAccess } = useOutletContext<any>();
  const guardianId = portalAccess?.guardian_id;
  const { data: homework, isLoading } = useStudentHomework(guardianId);

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
        <h1 className="text-2xl font-bold">Atividades</h1>
        <p className="text-muted-foreground">Lições de casa e atividades dos alunos</p>
      </div>

      {!homework?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma atividade encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {homework.map((entry: any) => (
            <Card key={entry.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">
                        {(entry.classes as any)?.name || 'Turma'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.entry_date), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm">{entry.homework}</p>
                    {entry.content && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Conteúdo: {entry.content}
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
  );
};

export default PortalAtividades;
