import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Filter, MoreHorizontal, Users, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClassForm } from '@/components/forms/ClassForm';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ClassData {
  id: string;
  name: string;
  grade: string;
  shift: string;
  students: number;
  teacher: string;
  status: string;
  max_students: number;
  year: number;
}

const Turmas = () => {
  const { school } = useAuth();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (school?.id) {
      fetchClasses();
    }
  }, [school?.id]);

  const fetchClasses = async () => {
    if (!school?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          grade,
          shift,
          max_students,
          year,
          is_active,
          student_classes(count),
          teacher_classes(
            profiles:teacher_id(full_name)
          )
        `)
        .eq('school_id', school.id)
        .order('name');

      if (error) throw error;

      const formattedClasses: ClassData[] = (data || []).map(cls => ({
        id: cls.id,
        name: cls.name,
        grade: cls.grade || '',
        shift: cls.shift || '',
        students: (cls.student_classes as any)?.[0]?.count || 0,
        teacher: (cls.teacher_classes as any)?.[0]?.profiles?.full_name || 'A definir',
        status: cls.is_active ? 'active' : 'inactive',
        max_students: cls.max_students || 30,
        year: cls.year,
      }));

      setClasses(formattedClasses);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Erro ao carregar turmas');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.grade.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.teacher.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateClass = async (data: any) => {
    if (!school?.id) return;
    try {
      const { error } = await supabase
        .from('classes')
        .insert({
          school_id: school.id,
          name: data.name,
          grade: data.grade,
          shift: data.shift,
          year: data.year,
          max_students: data.max_students || 30,
          is_active: true,
        });

      if (error) throw error;
      
      toast.success('Turma criada com sucesso!');
      fetchClasses();
    } catch (error) {
      console.error('Error creating class:', error);
      toast.error('Erro ao criar turma');
    }
  };

  const handleEditClass = async (data: any) => {
    if (!editingClass) return;
    try {
      const { error } = await supabase
        .from('classes')
        .update({
          name: data.name,
          grade: data.grade,
          shift: data.shift,
          year: data.year,
          max_students: data.max_students,
        })
        .eq('id', editingClass.id);

      if (error) throw error;
      
      setEditingClass(null);
      toast.success('Turma atualizada com sucesso!');
      fetchClasses();
    } catch (error) {
      console.error('Error updating class:', error);
      toast.error('Erro ao atualizar turma');
    }
  };

  const totalStudents = classes.reduce((acc, cls) => acc + cls.students, 0);
  const avgStudents = classes.length > 0 ? Math.round(totalStudents / classes.length) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Turmas"
        description="Gerencie as turmas da sua escola"
      >
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Turma
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Turmas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classes.length}</div>
            <p className="text-xs text-muted-foreground">Ativas no ano letivo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">Distribuídos nas turmas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Média por Turma</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgStudents}</div>
            <p className="text-xs text-muted-foreground">Alunos por turma</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar turma..."
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? 'Nenhuma turma encontrada' : 'Nenhuma turma cadastrada. Clique em "Nova Turma" para começar.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turma</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Professor(a)</TableHead>
                  <TableHead className="text-center">Alunos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.map((cls) => (
                  <TableRow key={cls.id} className="table-row-interactive">
                    <TableCell className="font-medium">{cls.name}</TableCell>
                    <TableCell>{cls.grade}</TableCell>
                    <TableCell>{cls.shift}</TableCell>
                    <TableCell>{cls.teacher}</TableCell>
                    <TableCell className="text-center">
                      <span className={cls.students >= (cls.max_students || 30) ? 'text-destructive font-medium' : ''}>
                        {cls.students}/{cls.max_students || 30}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="badge-success">
                        Ativa
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
                          <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setEditingClass(cls);
                            setIsFormOpen(true);
                          }}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>Ver alunos</DropdownMenuItem>
                          <DropdownMenuItem>Atribuir professor</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Encerrar turma
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <ClassForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingClass(null);
        }}
        onSubmit={editingClass ? handleEditClass : handleCreateClass}
        initialData={editingClass || undefined}
        mode={editingClass ? 'edit' : 'create'}
      />
    </div>
  );
};

export default Turmas;
