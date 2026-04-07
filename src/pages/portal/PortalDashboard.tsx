import { useOutletContext, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useGuardianStudents } from '@/hooks/useGuardianPortal';
import { Loader2, GraduationCap, ChevronRight } from 'lucide-react';

const PortalDashboard = () => {
  const { portalAccess } = useOutletContext<any>();
  const guardianId = portalAccess?.guardian_id;
  const { data: students, isLoading } = useGuardianStudents(guardianId);

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
        <h1 className="text-2xl font-bold">Meus Filhos</h1>
        <p className="text-muted-foreground">Acompanhe os dados acadêmicos e financeiros</p>
      </div>

      {!students?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum aluno vinculado encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((student: any) => {
            const activeClass = student.student_classes?.find((sc: any) => sc.status === 'active');
            const className = activeClass?.classes?.name;
            return (
              <Link to={`/portal/aluno/${student.id}`} key={student.id}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                          {student.full_name?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{student.full_name}</h3>
                        {className && (
                          <Badge variant="secondary" className="mt-1">{className}</Badge>
                        )}
                        {student.enrollment_number && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Matrícula: {student.enrollment_number}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PortalDashboard;
