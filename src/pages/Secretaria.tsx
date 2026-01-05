import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, UserPlus, FolderOpen, Mail, MoreHorizontal, Search, Plus, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { EnrollmentForm } from '@/components/forms/EnrollmentForm';
import { toast } from 'sonner';

// Mock enrollments data
const mockEnrollments = [
  { id: '1', student_name: 'João Pedro Martins', guardian: 'Ana Martins', phone: '(11) 99999-7777', class: '1º Ano A', status: 'pending', date: '2026-01-03' },
  { id: '2', student_name: 'Maria Clara Santos', guardian: 'Paulo Santos', phone: '(11) 99999-8888', class: '2º Ano A', status: 'approved', date: '2026-01-02' },
  { id: '3', student_name: 'Lucas Oliveira', guardian: 'Fernanda Oliveira', phone: '(11) 99999-9999', class: '3º Ano A', status: 'pending', date: '2026-01-04' },
  { id: '4', student_name: 'Sofia Lima', guardian: 'Roberto Lima', phone: '(11) 99999-0000', class: '1º Ano B', status: 'approved', date: '2026-01-01' },
  { id: '5', student_name: 'Pedro Almeida', guardian: 'Carla Almeida', phone: '(11) 99999-1234', class: '4º Ano A', status: 'rejected', date: '2025-12-28' },
];

const Secretaria = () => {
  const [enrollments, setEnrollments] = useState(mockEnrollments);
  const [isEnrollmentFormOpen, setIsEnrollmentFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('enrollments');

  const filteredEnrollments = enrollments.filter(e =>
    e.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.guardian.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateEnrollment = async (data: any) => {
    const newEnrollment = {
      id: String(Date.now()),
      student_name: data.student_name,
      guardian: data.guardian_name,
      phone: data.guardian_phone,
      class: mockEnrollments[0].class, // Would come from class_id lookup
      status: 'pending',
      date: data.enrollment_date,
    };
    setEnrollments([newEnrollment, ...enrollments]);
    toast.success('Matrícula registrada com sucesso!');
  };

  const updateEnrollmentStatus = (id: string, status: string) => {
    setEnrollments(enrollments.map(e => 
      e.id === id ? { ...e, status } : e
    ));
    toast.success(`Matrícula ${status === 'approved' ? 'aprovada' : 'rejeitada'}!`);
  };

  const pendingCount = enrollments.filter(e => e.status === 'pending').length;
  const approvedCount = enrollments.filter(e => e.status === 'approved').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-warning text-warning"><Clock className="mr-1 h-3 w-3" />Pendente</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="badge-success"><CheckCircle2 className="mr-1 h-3 w-3" />Aprovada</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Rejeitada</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Secretaria"
        description="Gestão de secretaria e documentos"
      >
        <Button onClick={() => setIsEnrollmentFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Matrícula
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Matrículas Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Matrículas Aprovadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Documentos Emitidos</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">45</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Comunicados</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Enviados esta semana</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="enrollments" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Matrículas
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Arquivos
          </TabsTrigger>
          <TabsTrigger value="communications" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Comunicados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enrollments" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar matrícula..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnrollments.map((enrollment) => (
                    <TableRow key={enrollment.id} className="table-row-interactive">
                      <TableCell className="font-medium">{enrollment.student_name}</TableCell>
                      <TableCell>{enrollment.guardian}</TableCell>
                      <TableCell>{enrollment.phone}</TableCell>
                      <TableCell>{enrollment.class}</TableCell>
                      <TableCell>{new Date(enrollment.date).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{getStatusBadge(enrollment.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                            <DropdownMenuItem>Editar matrícula</DropdownMenuItem>
                            {enrollment.status === 'pending' && (
                              <>
                                <DropdownMenuItem 
                                  className="text-success"
                                  onClick={() => updateEnrollmentStatus(enrollment.id, 'approved')}
                                >
                                  Aprovar matrícula
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => updateEnrollmentStatus(enrollment.id, 'rejected')}
                                >
                                  Rejeitar matrícula
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem>Imprimir ficha</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { title: 'Declaração de Matrícula', desc: 'Confirma vínculo do aluno com a escola' },
              { title: 'Histórico Escolar', desc: 'Registro de desempenho acadêmico' },
              { title: 'Atestado de Frequência', desc: 'Comprovante de presença regular' },
              { title: 'Declaração de Transferência', desc: 'Liberação para outra instituição' },
              { title: 'Boletim Escolar', desc: 'Notas e avaliações do período' },
              { title: 'Certidão de Conclusão', desc: 'Certificado de término de ciclo' },
            ].map((doc) => (
              <Card key={doc.title} className="card-interactive">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <FileText className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-base">{doc.title}</CardTitle>
                  <CardDescription>{doc.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">Emitir</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Gestão de arquivos em desenvolvimento</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications" className="mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Módulo de comunicados em desenvolvimento</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Enrollment Form Dialog */}
      <EnrollmentForm
        open={isEnrollmentFormOpen}
        onOpenChange={setIsEnrollmentFormOpen}
        onSubmit={handleCreateEnrollment}
      />
    </div>
  );
};

export default Secretaria;
