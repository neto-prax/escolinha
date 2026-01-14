import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, GraduationCap, UserPlus, ClipboardCheck, MoreHorizontal, Loader2, Upload, Download, FileSpreadsheet } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StudentForm } from '@/components/forms/StudentForm';
import { EnrollmentForm } from '@/components/forms/EnrollmentForm';
import { toast } from 'sonner';
import { MultiSelectTableHeader, MultiSelectTableCell, MultiSelectActionBar } from '@/components/ui/multi-select-table';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';

interface StudentImportData {
  full_name: string;
  birth_date?: string;
  gender?: string;
  address?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
}

interface Student {
  id: string;
  full_name: string;
  is_active: boolean;
  phone?: string;
  guardian_name?: string;
  class_name?: string;
}

const Alunos = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEnrollmentFormOpen, setIsEnrollmentFormOpen] = useState(false);
  const [enrollingStudent, setEnrollingStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Import states
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<StudentImportData[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch students from Supabase
  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return [];
      
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          full_name,
          is_active,
          student_guardians (
            guardian:guardians (
              id,
              full_name,
              phone
            )
          ),
          student_classes (
            class:classes (
              id,
              name
            )
          )
        `)
        .eq('school_id', profile.school_id)
        .order('full_name');

      if (error) {
        console.error('Error fetching students:', error);
        toast.error('Erro ao carregar alunos');
        return [];
      }

      return data.map((student: any) => ({
        id: student.id,
        full_name: student.full_name,
        is_active: student.is_active ?? true,
        guardian_name: student.student_guardians?.[0]?.guardian?.full_name || '-',
        phone: student.student_guardians?.[0]?.guardian?.phone || '-',
        class_name: student.student_classes?.[0]?.class?.name || 'Sem turma',
      }));
    },
    enabled: !!profile?.school_id,
  });

  // Fetch classes from Supabase for enrollment
  const { data: classes = [] } = useQuery({
    queryKey: ['classes', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return [];
      
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          grade,
          shift,
          max_students,
          student_classes(count)
        `)
        .eq('school_id', profile.school_id)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching classes:', error);
        return [];
      }

      return data.map((cls: any) => {
        const currentStudents = cls.student_classes?.[0]?.count || 0;
        const maxStudents = cls.max_students || 30;
        return {
          id: cls.id,
          name: cls.name,
          grade: cls.grade || '',
          shift: cls.shift || '',
          available_spots: maxStudents - currentStudents,
          monthly_fee: 850, // Default fee, can be customized later
        };
      });
    },
    enabled: !!profile?.school_id,
  });

  const filteredStudents = students.filter((student: Student) =>
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.class_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (student.guardian_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const handleCreateStudent = async (data: any) => {
    if (!profile?.school_id) {
      toast.error('Escola não identificada');
      return;
    }

    try {
      // Create student
      const { data: newStudent, error: studentError } = await supabase
        .from('students')
        .insert({
          full_name: data.full_name,
          birth_date: data.birth_date,
          gender: data.gender,
          address: data.address,
          school_id: profile.school_id,
        })
        .select()
        .single();

      if (studentError) throw studentError;

      // Create guardian if data provided
      if (data.guardian_name) {
        const { data: guardian, error: guardianError } = await supabase
          .from('guardians')
          .insert({
            full_name: data.guardian_name,
            email: data.guardian_email,
            phone: data.guardian_phone,
            cpf: data.guardian_cpf,
            relationship: data.guardian_relationship,
            address: data.guardian_address,
            school_id: profile.school_id,
          })
          .select()
          .single();

        if (guardianError) throw guardianError;

        // Link student to guardian
        const { error: linkError } = await supabase
          .from('student_guardians')
          .insert({
            student_id: newStudent.id,
            guardian_id: guardian.id,
          });

        if (linkError) throw linkError;
      }

      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Aluno cadastrado com sucesso!');
    } catch (error) {
      console.error('Error creating student:', error);
      toast.error('Erro ao cadastrar aluno');
    }
  };

  const handleEditStudent = async (data: any) => {
    if (!editingStudent) return;
    
    try {
      const { error } = await supabase
        .from('students')
        .update({
          full_name: data.full_name,
          birth_date: data.birth_date,
          gender: data.gender,
          address: data.address,
        })
        .eq('id', editingStudent.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['students'] });
      setEditingStudent(null);
      toast.success('Aluno atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error('Erro ao atualizar aluno');
    }
  };

  const handleEnrollStudent = async (data: any) => {
    if (!enrollingStudent || !profile?.school_id) return;
    
    try {
      // Create enrollment
      const { error: enrollmentError } = await supabase
        .from('enrollments')
        .insert({
          student_id: enrollingStudent.id,
          class_id: data.class_id,
          school_id: profile.school_id,
          year: new Date().getFullYear(),
          status: 'active',
        });

      if (enrollmentError) throw enrollmentError;

      // Link student to class
      const { error: classError } = await supabase
        .from('student_classes')
        .insert({
          student_id: enrollingStudent.id,
          class_id: data.class_id,
          status: 'active',
        });

      if (classError) throw classError;

      queryClient.invalidateQueries({ queryKey: ['students'] });
      setEnrollingStudent(null);
      setIsEnrollmentFormOpen(false);
      toast.success('Matrícula realizada com sucesso!');
    } catch (error) {
      console.error('Error enrolling student:', error);
      toast.error('Erro ao realizar matrícula');
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Aluno removido com sucesso!');
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Erro ao remover aluno');
    }
  };

  const activeStudents = students.filter((s: Student) => s.is_active).length;
  const inactiveStudents = students.filter((s: Student) => !s.is_active).length;

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const mappedData: StudentImportData[] = jsonData.map((row: any) => ({
          full_name: row['Nome'] || row['Nome Completo'] || row['full_name'] || '',
          birth_date: row['Data de Nascimento'] || row['Nascimento'] || row['birth_date'] || '',
          gender: row['Gênero'] || row['Sexo'] || row['gender'] || '',
          address: row['Endereço'] || row['Endereco'] || row['address'] || '',
          guardian_name: row['Responsável'] || row['Responsavel'] || row['Nome do Responsável'] || row['guardian_name'] || '',
          guardian_phone: row['Telefone Responsável'] || row['Telefone'] || row['guardian_phone'] || '',
          guardian_email: row['Email Responsável'] || row['Email'] || row['guardian_email'] || '',
        })).filter((item: StudentImportData) => item.full_name);

        if (mappedData.length === 0) {
          toast.error('Nenhum dado válido encontrado na planilha');
          return;
        }

        setImportData(mappedData);
        setIsImportDialogOpen(true);
      } catch (error) {
        console.error('Error reading file:', error);
        toast.error('Erro ao ler arquivo. Verifique se é um arquivo Excel válido.');
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Download template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Nome': 'João da Silva',
        'Data de Nascimento': '2015-03-15',
        'Gênero': 'Masculino',
        'Endereço': 'Rua das Flores, 123',
        'Responsável': 'Maria da Silva',
        'Telefone Responsável': '11999999999',
        'Email Responsável': 'maria@email.com',
      },
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Alunos');
    XLSX.writeFile(workbook, 'modelo_importacao_alunos.xlsx');
    toast.success('Modelo baixado com sucesso!');
  };

  // Confirm import
  const handleConfirmImport = async () => {
    if (!profile?.school_id) {
      toast.error('Escola não identificada');
      return;
    }

    setIsImporting(true);
    
    try {
      for (const studentData of importData) {
        // Create student
        const { data: newStudent, error: studentError } = await supabase
          .from('students')
          .insert({
            full_name: studentData.full_name,
            birth_date: studentData.birth_date || null,
            gender: studentData.gender || null,
            address: studentData.address || null,
            school_id: profile.school_id,
          })
          .select()
          .single();

        if (studentError) {
          console.error('Error creating student:', studentError);
          continue;
        }

        // Create guardian if name provided
        if (studentData.guardian_name) {
          const { data: guardian, error: guardianError } = await supabase
            .from('guardians')
            .insert({
              full_name: studentData.guardian_name,
              phone: studentData.guardian_phone || null,
              email: studentData.guardian_email || null,
              school_id: profile.school_id,
            })
            .select()
            .single();

          if (!guardianError && guardian) {
            // Link student to guardian
            await supabase
              .from('student_guardians')
              .insert({
                student_id: newStudent.id,
                guardian_id: guardian.id,
              });
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
      toast.success(`${importData.length} aluno(s) importado(s) com sucesso!`);
      setIsImportDialogOpen(false);
      setImportData([]);
    } catch (error) {
      console.error('Error importing students:', error);
      toast.error('Erro ao importar alunos');
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alunos"
        description="Gerencie os alunos da escola"
      >
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls"
            className="hidden"
          />
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Modelo
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Importar Excel
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Aluno
          </Button>
        </div>
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
            <GraduationCap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{activeStudents}</div>
            <p className="text-xs text-muted-foreground">
              {students.length > 0 ? Math.round(activeStudents / students.length * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            <GraduationCap className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{inactiveStudents}</div>
            <p className="text-xs text-muted-foreground">Este ano</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Novas Matrículas</CardTitle>
            <UserPlus className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{students.length}</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar aluno..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <MultiSelectTableHeader
                allIds={filteredStudents.map((s: Student) => s.id)}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
              />
              <TableHead>Aluno</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {searchQuery ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado'}
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student: Student) => (
                <TableRow key={student.id}>
                  <MultiSelectTableCell
                    id={student.id}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                  />
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{student.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{student.class_name}</TableCell>
                  <TableCell>{student.guardian_name}</TableCell>
                  <TableCell>{student.phone}</TableCell>
                  <TableCell>
                    <Badge variant={student.is_active ? 'default' : 'secondary'}>
                      {student.is_active ? 'Ativo' : 'Inativo'}
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
                        <DropdownMenuItem onClick={() => {
                          setEditingStudent(student);
                          setIsFormOpen(true);
                        }}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setEnrollingStudent(student);
                          setIsEnrollmentFormOpen(true);
                        }}>
                          <ClipboardCheck className="mr-2 h-4 w-4" />
                          Matricular
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteStudent(student.id)}
                        >
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Student Form */}
      <StudentForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingStudent(null);
        }}
        onSubmit={editingStudent ? handleEditStudent : handleCreateStudent}
        initialData={editingStudent ? {
          full_name: editingStudent.full_name,
        } : undefined}
        mode={editingStudent ? 'edit' : 'create'}
      />

      {/* Enrollment Form */}
      <EnrollmentForm
        open={isEnrollmentFormOpen}
        onOpenChange={(open) => {
          setIsEnrollmentFormOpen(open);
          if (!open) setEnrollingStudent(null);
        }}
        onSubmit={handleEnrollStudent}
        classes={classes}
        studentData={enrollingStudent ? {
          id: enrollingStudent.id,
          name: enrollingStudent.full_name,
          guardian: enrollingStudent.guardian_name === '-' ? '' : (enrollingStudent.guardian_name || ''),
          guardian_phone: enrollingStudent.phone === '-' ? '' : (enrollingStudent.phone || ''),
        } : undefined}
      />

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Alunos
            </DialogTitle>
            <DialogDescription>
              Revise os dados antes de confirmar a importação
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {importData.length} aluno(s) encontrado(s) na planilha
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Nascimento</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Telefone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.slice(0, 10).map((student, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{student.full_name}</TableCell>
                      <TableCell>{student.birth_date || '-'}</TableCell>
                      <TableCell>{student.guardian_name || '-'}</TableCell>
                      <TableCell>{student.guardian_phone || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {importData.length > 10 && (
              <p className="text-sm text-muted-foreground text-center">
                ... e mais {importData.length - 10} aluno(s)
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Confirmar Importação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multi-select Action Bar */}
      <MultiSelectActionBar
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onSendMessage={() => {
          toast.info(`Enviar mensagem para ${selectedIds.length} aluno(s)`);
        }}
        onBulkDelete={async () => {
          const count = selectedIds.length;
          try {
            const { error } = await supabase
              .from('students')
              .delete()
              .in('id', selectedIds);
            
            if (error) throw error;
            
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setSelectedIds([]);
            toast.success(`${count} aluno(s) removido(s) com sucesso!`);
          } catch (error) {
            console.error('Error deleting students:', error);
            toast.error('Erro ao excluir alunos');
          }
        }}
        itemLabel="alunos"
      />
    </div>
  );
};

export default Alunos;
