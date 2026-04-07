import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { PsychologyRecordModal } from '@/components/psicologia/PsychologyRecordModal';
import { PsychologyTimeline } from '@/components/psicologia/PsychologyTimeline';
import {
  Search,
  Brain,
  Users,
  Plus,
  ArrowLeft,
} from 'lucide-react';

interface Student {
  id: string;
  full_name: string;
  birth_date: string | null;
  photo_url: string | null;
  school_id: string;
}

interface PsychologyRecord {
  id: string;
  student_id: string;
  professional_id: string;
  record_type: string;
  title: string;
  description: string | null;
  record_date: string;
  duration_minutes: number | null;
  participants: string | null;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  status: string | null;
  created_at: string;
  professional?: { full_name: string };
}

const Psicologia = () => {
  const { school } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PsychologyRecord | null>(null);

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['students-psychology', school?.id],
    queryFn: async () => {
      if (!school?.id) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, birth_date, photo_url, school_id')
        .eq('school_id', school.id)
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!school?.id,
  });

  const { data: records = [], isLoading: loadingRecords } = useQuery({
    queryKey: ['psychology-records', selectedStudent?.id],
    queryFn: async () => {
      if (!selectedStudent?.id) return [];
      const { data, error } = await supabase
        .from('psychology_records')
        .select('*, professional:profiles!psychology_records_professional_id_fkey(full_name)')
        .eq('student_id', selectedStudent.id)
        .order('record_date', { ascending: false });
      if (error) throw error;
      return data as PsychologyRecord[];
    },
    enabled: !!selectedStudent?.id,
  });

  // Count records per student
  const { data: recordCounts = {} } = useQuery({
    queryKey: ['psychology-counts', school?.id],
    queryFn: async () => {
      if (!school?.id) return {};
      const { data, error } = await supabase
        .from('psychology_records')
        .select('student_id')
        .eq('school_id', school.id);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((r: { student_id: string }) => {
        counts[r.student_id] = (counts[r.student_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!school?.id,
  });

  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('psychology_records').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['psychology-records'] });
      queryClient.invalidateQueries({ queryKey: ['psychology-counts'] });
      toast({ title: 'Registro excluído com sucesso' });
    },
  });

  const filteredStudents = students.filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) =>
    name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  if (selectedStudent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedStudent(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {getInitials(selectedStudent.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">{selectedStudent.full_name}</h2>
              <p className="text-sm text-muted-foreground">Timeline de Psicologia</p>
            </div>
          </div>
          <div className="ml-auto">
            <Button onClick={() => { setEditingRecord(null); setModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Registro
            </Button>
          </div>
        </div>

        <PsychologyTimeline
          records={records}
          isLoading={loadingRecords}
          onEdit={(record) => { setEditingRecord(record); setModalOpen(true); }}
          onDelete={(id) => deleteRecord.mutate(id)}
        />

        <PsychologyRecordModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditingRecord(null); }}
          studentId={selectedStudent.id}
          schoolId={selectedStudent.school_id}
          record={editingRecord}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Psicologia"
        description="Acompanhamento psicológico dos alunos"
        icon={Brain}
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar aluno..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="secondary" className="gap-1">
          <Users className="h-3 w-3" />
          {students.length} alunos
        </Badge>
      </div>

      {loadingStudents ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum aluno encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => {
            const count = recordCounts[student.id] || 0;
            return (
              <Card
                key={student.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedStudent(student)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {getInitials(student.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{student.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {count > 0 ? `${count} registro${count > 1 ? 's' : ''}` : 'Sem registros'}
                    </p>
                  </div>
                  {count > 0 && (
                    <Badge variant="secondary" className="shrink-0">{count}</Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Psicologia;
