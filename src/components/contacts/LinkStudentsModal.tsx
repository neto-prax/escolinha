import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Search, GraduationCap, X, UserPlus, Plus, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Contact {
  id: string;
  full_name: string;
  phone: string;
  guardian_id: string | null;
}

interface Student {
  id: string;
  full_name: string;
  enrollment_number: string | null;
  class_name?: string;
}

interface LinkStudentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  onSuccess?: () => void;
}

export function LinkStudentsModal({
  open,
  onOpenChange,
  contact,
  onSuccess,
}: LinkStudentsModalProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentBirthDate, setNewStudentBirthDate] = useState('');

  // Fetch students
  const { data: students = [], refetch: refetchStudents } = useQuery({
    queryKey: ['students-for-guardian', profile?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          full_name,
          enrollment_number,
          student_classes (
            classes (name)
          )
        `)
        .eq('school_id', profile!.school_id!)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;

      return data.map((student: any) => ({
        id: student.id,
        full_name: student.full_name,
        enrollment_number: student.enrollment_number,
        class_name: student.student_classes?.[0]?.classes?.name || null,
      })) as Student[];
    },
    enabled: open && !!profile?.school_id,
  });

  // Fetch existing linked students
  const { data: existingLinks = [] } = useQuery({
    queryKey: ['guardian-students', contact?.guardian_id],
    queryFn: async () => {
      if (!contact?.guardian_id) return [];
      
      const { data, error } = await supabase
        .from('student_guardians')
        .select('student_id')
        .eq('guardian_id', contact.guardian_id);

      if (error) throw error;
      return data.map((link) => link.student_id);
    },
    enabled: open && !!contact?.guardian_id,
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSelectedStudentIds([]);
      setIsCreateOpen(false);
      setNewStudentName('');
      setNewStudentBirthDate('');
    }
  }, [open]);

  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.school_id || !contact?.guardian_id) throw new Error('Dados inválidos');
      if (!newStudentName.trim()) throw new Error('Nome do aluno é obrigatório');

      // 1. Create student
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          school_id: profile.school_id,
          full_name: newStudentName.trim(),
          birth_date: newStudentBirthDate || null,
          is_active: true,
        })
        .select()
        .single();

      if (studentError) throw studentError;

      // 2. Link to guardian
      const { error: linkError } = await supabase
        .from('student_guardians')
        .insert({
          student_id: student.id,
          guardian_id: contact.guardian_id,
        });

      if (linkError) throw linkError;

      // 3. Update contact linked_student_ids
      const allLinkedIds = [...existingLinks, student.id];
      await supabase
        .from('contacts')
        .update({
          linked_student_ids: allLinkedIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contact.id);

      return student;
    },
    onSuccess: (student) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['students-for-guardian'] });
      queryClient.invalidateQueries({ queryKey: ['guardian-students'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success(`Aluno "${student.full_name}" criado e vinculado com sucesso!`);
      setNewStudentName('');
      setNewStudentBirthDate('');
      setIsCreateOpen(false);
      refetchStudents();
    },
    onError: (error: any) => {
      console.error('Error creating student:', error);
      toast.error(error.message || 'Erro ao criar aluno');
    },
  });

  // Link students mutation
  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!contact?.guardian_id || !profile?.school_id) throw new Error('Dados inválidos');

      // Filter out already linked students
      const newStudentIds = selectedStudentIds.filter(
        (id) => !existingLinks.includes(id)
      );

      if (newStudentIds.length === 0) {
        throw new Error('Nenhum aluno novo selecionado');
      }

      // Create student-guardian links
      const studentGuardianLinks = newStudentIds.map((studentId) => ({
        student_id: studentId,
        guardian_id: contact.guardian_id!,
      }));

      const { error: linkError } = await supabase
        .from('student_guardians')
        .insert(studentGuardianLinks);

      if (linkError) throw linkError;

      // Update contact linked_student_ids
      const allLinkedIds = [...existingLinks, ...newStudentIds];
      const { error: contactError } = await supabase
        .from('contacts')
        .update({
          linked_student_ids: allLinkedIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contact.id);

      if (contactError) throw contactError;

      return newStudentIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
      queryClient.invalidateQueries({ queryKey: ['guardian-students'] });
      toast.success(`${count} aluno(s) vinculado(s) com sucesso!`);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error('Error linking students:', error);
      toast.error(error.message || 'Erro ao vincular alunos');
    },
  });

  const filteredStudents = students.filter(
    (student) =>
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.enrollment_number?.includes(searchQuery)
  );

  const toggleStudent = (studentId: string) => {
    // Don't allow toggling already linked students
    if (existingLinks.includes(studentId)) return;
    
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectedStudents = students.filter((s) => selectedStudentIds.includes(s.id));
  const alreadyLinkedStudents = students.filter((s) => existingLinks.includes(s.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) {
      toast.error('Selecione pelo menos um aluno');
      return;
    }
    linkMutation.mutate();
  };

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    createStudentMutation.mutate();
  };

  if (!contact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Vincular Alunos
          </DialogTitle>
          <DialogDescription>
            Adicione alunos ao responsável <strong>{contact.full_name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="space-y-4 flex-1 overflow-auto pr-2">
            {/* Create new student section */}
            <Collapsible open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Criar novo aluno
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isCreateOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-student-name">Nome do aluno *</Label>
                      <Input
                        id="new-student-name"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        placeholder="Nome completo do aluno"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-student-birth">Data de nascimento</Label>
                      <Input
                        id="new-student-birth"
                        type="date"
                        value={newStudentBirthDate}
                        onChange={(e) => setNewStudentBirthDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleCreateStudent}
                    disabled={createStudentMutation.isPending || !newStudentName.trim()}
                    className="w-full"
                  >
                    {createStudentMutation.isPending ? 'Criando...' : 'Criar e Vincular Aluno'}
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Already linked students */}
            {alreadyLinkedStudents.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <GraduationCap className="h-4 w-4" />
                  Alunos já vinculados ({alreadyLinkedStudents.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {alreadyLinkedStudents.map((student) => (
                    <Badge key={student.id} variant="outline">
                      {student.full_name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Selected new students */}
            {selectedStudents.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Novos Alunos Selecionados ({selectedStudents.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedStudents.map((student) => (
                    <Badge
                      key={student.id}
                      variant="secondary"
                      className="flex items-center gap-1 pl-3"
                    >
                      {student.full_name}
                      <button
                        type="button"
                        onClick={() => toggleStudent(student.id)}
                        className="ml-1 hover:bg-muted rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Student Selection */}
            <div className="space-y-2">
              <Label>Selecionar Alunos Existentes</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar aluno por nome ou matrícula..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <ScrollArea className="h-48 border rounded-lg">
                {filteredStudents.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Nenhum aluno encontrado
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredStudents.map((student) => {
                      const isLinked = existingLinks.includes(student.id);
                      const isSelected = selectedStudentIds.includes(student.id);
                      
                      return (
                        <label
                          key={student.id}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                            isLinked 
                              ? 'bg-muted/50 opacity-60 cursor-not-allowed' 
                              : 'hover:bg-muted'
                          }`}
                        >
                          <Checkbox
                            checked={isLinked || isSelected}
                            disabled={isLinked}
                            onCheckedChange={() => toggleStudent(student.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate flex items-center gap-2">
                              {student.full_name}
                              {isLinked && (
                                <Badge variant="outline" className="text-xs">
                                  Vinculado
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground flex gap-2">
                              {student.enrollment_number && (
                                <span>Mat: {student.enrollment_number}</span>
                              )}
                              {student.class_name && (
                                <span>• {student.class_name}</span>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="mt-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={linkMutation.isPending || selectedStudentIds.length === 0}
            >
              {linkMutation.isPending ? 'Vinculando...' : `Vincular ${selectedStudentIds.length} Aluno(s)`}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
