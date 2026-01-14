import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Filter, MoreHorizontal, GraduationCap, UserPlus, ClipboardCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StudentForm } from '@/components/forms/StudentForm';
import { EnrollmentForm } from '@/components/forms/EnrollmentForm';
import { toast } from 'sonner';

// Mock data
const initialStudents = [
  { id: '1', name: 'Ana Beatriz Silva', class: '5º Ano A', guardian: 'Maria Silva', phone: '(11) 99999-1111', status: 'active' },
  { id: '2', name: 'Bruno Costa Santos', class: '5º Ano A', guardian: 'José Santos', phone: '(11) 99999-2222', status: 'active' },
  { id: '3', name: 'Carolina Oliveira', class: '4º Ano A', guardian: 'Paula Oliveira', phone: '(11) 99999-3333', status: 'active' },
  { id: '4', name: 'Daniel Ferreira', class: '3º Ano A', guardian: 'Lucas Ferreira', phone: '(11) 99999-4444', status: 'inactive' },
  { id: '5', name: 'Elena Rodrigues', class: '2º Ano A', guardian: 'Fernanda Rodrigues', phone: '(11) 99999-5555', status: 'active' },
  { id: '6', name: 'Felipe Almeida', class: '1º Ano A', guardian: 'Roberto Almeida', phone: '(11) 99999-6666', status: 'active' },
];

const Alunos = () => {
  const [students, setStudents] = useState(initialStudents);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEnrollmentFormOpen, setIsEnrollmentFormOpen] = useState(false);
  const [enrollingStudent, setEnrollingStudent] = useState<typeof initialStudents[0] | null>(null);
  const [editingStudent, setEditingStudent] = useState<typeof initialStudents[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.class.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.guardian.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateStudent = async (data: any) => {
    const newStudent = {
      id: String(Date.now()),
      name: data.full_name,
      class: 'A definir',
      guardian: data.guardian_name,
      phone: data.guardian_phone,
      status: 'active',
    };
    setStudents([...students, newStudent]);
    toast.success('Aluno cadastrado com sucesso!');
  };

  const handleEditStudent = async (data: any) => {
    if (!editingStudent) return;
    setStudents(students.map(s => 
      s.id === editingStudent.id ? { ...s, name: data.full_name, guardian: data.guardian_name, phone: data.guardian_phone } : s
    ));
    setEditingStudent(null);
    toast.success('Aluno atualizado com sucesso!');
  };

  const handleEnrollStudent = async (data: any) => {
    if (!enrollingStudent) return;
    setStudents(students.map(s => 
      s.id === enrollingStudent.id ? { ...s, class: data.class_id || 'Turma selecionada' } : s
    ));
    setEnrollingStudent(null);
    setIsEnrollmentFormOpen(false);
    toast.success('Matrícula realizada com sucesso!');
  };

  const activeStudents = students.filter(s => s.status === 'active').length;
  const inactiveStudents = students.filter(s => s.status === 'inactive').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alunos"
        description="Gerencie os alunos da escola"
      >
        <Button onClick={() => setIsFormOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Aluno
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground">Matriculados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <GraduationCap className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{activeStudents}</div>
            <p className="text-xs text-muted-foreground">{Math.round(activeStudents / students.length * 100)}% do total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            <GraduationCap className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{inactiveStudents}</div>
            <p className="text-xs text-muted-foreground">Este ano</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Novas Matrículas</CardTitle>
            <UserPlus className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">12</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar aluno..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id} className="table-row-interactive">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {student.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{student.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{student.class}</TableCell>
                  <TableCell>{student.guardian}</TableCell>
                  <TableCell>{student.phone}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={student.status === 'active' ? 'badge-success' : 'badge-warning'}
                    >
                      {student.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuItem>Ver ficha completa</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setEditingStudent(student);
                          setIsFormOpen(true);
                        }}>
                          Editar cadastro
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setEnrollingStudent(student);
                          setIsEnrollmentFormOpen(true);
                        }}>
                          <ClipboardCheck className="mr-2 h-4 w-4" />
                          Matricular
                        </DropdownMenuItem>
                        <DropdownMenuItem>Ver responsáveis</DropdownMenuItem>
                        <DropdownMenuItem>Histórico financeiro</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Desativar aluno
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <StudentForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingStudent(null);
        }}
        onSubmit={editingStudent ? handleEditStudent : handleCreateStudent}
        initialData={editingStudent ? {
          full_name: editingStudent.name,
          guardian_name: editingStudent.guardian,
          guardian_phone: editingStudent.phone,
        } : undefined}
        mode={editingStudent ? 'edit' : 'create'}
      />

      {/* Enrollment Form Dialog */}
      <EnrollmentForm
        open={isEnrollmentFormOpen}
        onOpenChange={(open) => {
          setIsEnrollmentFormOpen(open);
          if (!open) setEnrollingStudent(null);
        }}
        onSubmit={handleEnrollStudent}
        studentData={enrollingStudent ? {
          id: enrollingStudent.id,
          name: enrollingStudent.name,
          guardian: enrollingStudent.guardian,
          guardian_phone: enrollingStudent.phone,
        } : undefined}
      />
    </div>
  );
};

export default Alunos;
