import { useParams, useOutletContext, Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGuardianStudents, useStudentAttendance, useStudentGrades, useStudentBilling } from '@/hooks/useGuardianPortal';
import { Loader2, ArrowLeft, User, BookOpen, ClipboardList, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  present: { label: 'Presente', variant: 'default' },
  absent: { label: 'Ausente', variant: 'destructive' },
  late: { label: 'Atrasado', variant: 'secondary' },
  justified: { label: 'Justificado', variant: 'outline' },
};

const billingStatusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  paid: { label: 'Pago', variant: 'default' },
  overdue: { label: 'Atrasado', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'outline' },
};

const PortalStudentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { portalAccess } = useOutletContext<any>();
  const guardianId = portalAccess?.guardian_id;
  const { data: students, isLoading: loadingStudents } = useGuardianStudents(guardianId);
  const { data: attendance, isLoading: loadingAttendance } = useStudentAttendance(id);
  const { data: grades, isLoading: loadingGrades } = useStudentGrades(id);
  const { data: billing, isLoading: loadingBilling } = useStudentBilling(id, guardianId);

  const student = students?.find((s: any) => s.id === id);

  if (loadingStudents) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aluno não encontrado.</p>
        <Link to="/portal/dashboard"><Button variant="outline" className="mt-4">Voltar</Button></Link>
      </div>
    );
  }

  const activeClass = student.student_classes?.find((sc: any) => sc.status === 'active');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/portal/dashboard">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {student.full_name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold">{student.full_name}</h1>
            {activeClass?.classes?.name && (
              <Badge variant="secondary">{activeClass.classes.name}</Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info" className="flex items-center gap-1"><User className="h-3 w-3" /> Dados</TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-1"><ClipboardList className="h-3 w-3" /> Frequência</TabsTrigger>
          <TabsTrigger value="grades" className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> Notas</TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><span className="text-sm text-muted-foreground">Nome completo</span><p className="font-medium">{student.full_name}</p></div>
                {student.birth_date && <div><span className="text-sm text-muted-foreground">Data de nascimento</span><p className="font-medium">{format(new Date(student.birth_date), 'dd/MM/yyyy')}</p></div>}
                {student.enrollment_number && <div><span className="text-sm text-muted-foreground">Matrícula</span><p className="font-medium">{student.enrollment_number}</p></div>}
                {student.gender && <div><span className="text-sm text-muted-foreground">Gênero</span><p className="font-medium capitalize">{student.gender}</p></div>}
                {activeClass?.classes?.name && <div><span className="text-sm text-muted-foreground">Turma</span><p className="font-medium">{activeClass.classes.name}</p></div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader><CardTitle className="text-lg">Frequência</CardTitle></CardHeader>
            <CardContent>
              {loadingAttendance ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : !attendance?.length ? (
                <p className="text-muted-foreground text-center py-8">Nenhum registro de frequência.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Turma</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Observações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.map((a: any) => {
                        const s = statusMap[a.status] || { label: a.status, variant: 'outline' as const };
                        return (
                          <TableRow key={a.id}>
                            <TableCell>{format(new Date(a.date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{(a.classes as any)?.name || '-'}</TableCell>
                            <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                            <TableCell className="text-sm text-muted-foreground">{a.notes || '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades">
          <Card>
            <CardHeader><CardTitle className="text-lg">Notas</CardTitle></CardHeader>
            <CardContent>
              {loadingGrades ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : !grades?.length ? (
                <p className="text-muted-foreground text-center py-8">Nenhuma nota registrada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Disciplina</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Nota</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grades.map((g: any) => (
                        <TableRow key={g.id}>
                          <TableCell className="font-medium">{g.subject || '-'}</TableCell>
                          <TableCell>{g.grade_type || '-'}</TableCell>
                          <TableCell>
                            <span className="font-semibold">{g.value ?? '-'}</span>
                            {g.max_value && <span className="text-muted-foreground text-xs">/{g.max_value}</span>}
                          </TableCell>
                          <TableCell>{g.period || '-'}</TableCell>
                          <TableCell>{g.date ? format(new Date(g.date), 'dd/MM/yyyy') : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial">
          <Card>
            <CardHeader><CardTitle className="text-lg">Financeiro</CardTitle></CardHeader>
            <CardContent>
              {loadingBilling ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : !billing?.length ? (
                <p className="text-muted-foreground text-center py-8">Nenhuma cobrança encontrada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billing.map((b: any) => {
                        const s = billingStatusMap[b.status] || { label: b.status, variant: 'outline' as const };
                        return (
                          <TableRow key={b.id}>
                            <TableCell className="font-medium">{b.description}</TableCell>
                            <TableCell>{format(new Date(b.due_date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>R$ {Number(b.amount).toFixed(2)}</TableCell>
                            <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PortalStudentDetail;
