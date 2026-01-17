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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, UserPlus, Users, GraduationCap, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Contact {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  guardian_id: string | null;
}

interface Student {
  id: string;
  full_name: string;
  enrollment_number: string | null;
  class_name?: string;
}

interface ConvertToGuardianModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  onSuccess?: () => void;
}

const relationships = [
  { value: 'pai', label: 'Pai' },
  { value: 'mae', label: 'Mãe' },
  { value: 'avo', label: 'Avô/Avó' },
  { value: 'tio', label: 'Tio/Tia' },
  { value: 'responsavel', label: 'Responsável Legal' },
  { value: 'outro', label: 'Outro' },
];

export function ConvertToGuardianModal({
  open,
  onOpenChange,
  contact,
  onSuccess,
}: ConvertToGuardianModalProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [relationship, setRelationship] = useState('responsavel');
  const [cpf, setCpf] = useState('');
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setRelationship('responsavel');
      setCpf('');
      setAddress('');
      setSearchQuery('');
      setSelectedStudentIds([]);
    }
  }, [open]);

  // Fetch students
  const { data: students = [] } = useQuery({
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

  // Convert to guardian mutation
  const convertMutation = useMutation({
    mutationFn: async () => {
      if (!contact || !profile?.school_id) throw new Error('Dados inválidos');

      // 1. Create guardian record
      const { data: guardian, error: guardianError } = await supabase
        .from('guardians')
        .insert({
          school_id: profile.school_id,
          full_name: contact.full_name,
          phone: contact.phone,
          email: contact.email,
          relationship,
          cpf: cpf || null,
          address: address || null,
        })
        .select()
        .single();

      if (guardianError) throw guardianError;

      // 2. Update contact to link to guardian
      const { error: contactError } = await supabase
        .from('contacts')
        .update({
          guardian_id: guardian.id,
          contact_type: 'guardian',
          linked_student_ids: selectedStudentIds.length > 0 ? selectedStudentIds : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contact.id);

      if (contactError) throw contactError;

      // 3. Create student-guardian links
      if (selectedStudentIds.length > 0) {
        const studentGuardianLinks = selectedStudentIds.map((studentId) => ({
          student_id: studentId,
          guardian_id: guardian.id,
        }));

        const { error: linkError } = await supabase
          .from('student_guardians')
          .insert(studentGuardianLinks);

        if (linkError) throw linkError;
      }

      return guardian;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
      toast.success('Contato convertido em responsável com sucesso!');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Error converting to guardian:', error);
      toast.error('Erro ao converter contato em responsável');
    },
  });

  const filteredStudents = students.filter(
    (student) =>
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.enrollment_number?.includes(searchQuery)
  );

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectedStudents = students.filter((s) => selectedStudentIds.includes(s.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    convertMutation.mutate();
  };

  if (!contact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Converter em Responsável
          </DialogTitle>
          <DialogDescription>
            Transforme o contato <strong>{contact.full_name}</strong> em um responsável e vincule alunos a ele.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="space-y-4 flex-1 overflow-auto pr-2">
            {/* Contact Info Display */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-sm">Dados do Contato</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Nome:</span>{' '}
                  <span className="font-medium">{contact.full_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Telefone:</span>{' '}
                  <span className="font-medium">{contact.phone}</span>
                </div>
                {contact.email && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Email:</span>{' '}
                    <span className="font-medium">{contact.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Guardian Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="relationship">Parentesco</Label>
                <Select value={relationship} onValueChange={setRelationship}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {relationships.map((rel) => (
                      <SelectItem key={rel.value} value={rel.value}>
                        {rel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Endereço completo"
              />
            </div>

            {/* Selected Students */}
            {selectedStudents.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Alunos Vinculados ({selectedStudents.length})
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
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Vincular Alunos
              </Label>
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
                    {filteredStudents.map((student) => (
                      <label
                        key={student.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedStudentIds.includes(student.id)}
                          onCheckedChange={() => toggleStudent(student.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {student.full_name}
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
                    ))}
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
            <Button type="submit" disabled={convertMutation.isPending}>
              {convertMutation.isPending ? 'Convertendo...' : 'Converter em Responsável'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
