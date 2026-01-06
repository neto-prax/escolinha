import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Student {
  id: string;
  full_name: string;
  enrollment_number?: string;
  class_name?: string;
}

interface LinkStudentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (studentIds: string[]) => void;
  students: Student[];
  linkedStudentIds: string[];
  contactName: string;
}

export function LinkStudentModal({
  open,
  onClose,
  onConfirm,
  students,
  linkedStudentIds,
  contactName,
}: LinkStudentModalProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(linkedStudentIds);

  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(search.toLowerCase()) ||
    student.enrollment_number?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStudent = (studentId: string) => {
    setSelectedIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedIds);
    onClose();
  };

  const selectedStudents = students.filter(s => selectedIds.includes(s.id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular Alunos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Vincule alunos ao contato <strong>{contactName}</strong>.
            Os alunos vinculados aparecerão como tags na conversa.
          </p>

          {selectedStudents.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedStudents.map(student => (
                <Badge
                  key={student.id}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {student.full_name.split(' ')[0]}
                  <button
                    onClick={() => toggleStudent(student.id)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou matrícula..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[250px] border rounded-md">
            <div className="p-2 space-y-1">
              {filteredStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum aluno encontrado
                </p>
              ) : (
                filteredStudents.map(student => (
                  <label
                    key={student.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.includes(student.id)}
                      onCheckedChange={() => toggleStudent(student.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{student.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {student.enrollment_number && `Matrícula: ${student.enrollment_number}`}
                        {student.enrollment_number && student.class_name && ' • '}
                        {student.class_name && student.class_name}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Confirmar ({selectedIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
