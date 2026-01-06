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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Sector {
  id: string;
  name: string;
}

interface NewLeadModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    guardian_name: string;
    guardian_phone: string;
    guardian_email?: string;
    student_name: string;
    student_grade?: string;
    source?: string;
    interest_level?: 'low' | 'medium' | 'high';
    sector_id?: string;
    notes?: string;
  }) => void;
  sectors: Sector[];
}

const sources = [
  { value: 'site', label: 'Site' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'redes_sociais', label: 'Redes Sociais' },
  { value: 'google', label: 'Google' },
  { value: 'outdoor', label: 'Outdoor/Panfleto' },
  { value: 'evento', label: 'Evento' },
  { value: 'outro', label: 'Outro' },
];

const grades = [
  'Berçário',
  'Maternal I',
  'Maternal II',
  'Pré I',
  'Pré II',
  '1º Ano',
  '2º Ano',
  '3º Ano',
  '4º Ano',
  '5º Ano',
  '6º Ano',
  '7º Ano',
  '8º Ano',
  '9º Ano',
  '1º EM',
  '2º EM',
  '3º EM',
];

export function NewLeadModal({
  open,
  onClose,
  onSubmit,
  sectors,
}: NewLeadModalProps) {
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentGrade, setStudentGrade] = useState("");
  const [source, setSource] = useState("");
  const [interestLevel, setInterestLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [sectorId, setSectorId] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!guardianName.trim() || !guardianPhone.trim() || !studentName.trim()) return;

    onSubmit({
      guardian_name: guardianName.trim(),
      guardian_phone: guardianPhone.trim(),
      guardian_email: guardianEmail.trim() || undefined,
      student_name: studentName.trim(),
      student_grade: studentGrade || undefined,
      source: source || undefined,
      interest_level: interestLevel,
      sector_id: sectorId || undefined,
      notes: notes.trim() || undefined,
    });

    // Reset form
    setGuardianName("");
    setGuardianPhone("");
    setGuardianEmail("");
    setStudentName("");
    setStudentGrade("");
    setSource("");
    setInterestLevel('medium');
    setSectorId("");
    setNotes("");
    onClose();
  };

  const isValid = guardianName.trim() && guardianPhone.trim() && studentName.trim();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="guardianName">Nome do Responsável *</Label>
              <Input
                id="guardianName"
                placeholder="Nome completo"
                value={guardianName}
                onChange={e => setGuardianName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guardianPhone">Telefone (WhatsApp) *</Label>
              <Input
                id="guardianPhone"
                placeholder="5511999999999"
                value={guardianPhone}
                onChange={e => setGuardianPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guardianEmail">E-mail</Label>
              <Input
                id="guardianEmail"
                type="email"
                placeholder="email@exemplo.com"
                value={guardianEmail}
                onChange={e => setGuardianEmail(e.target.value)}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="studentName">Nome do Aluno *</Label>
              <Input
                id="studentName"
                placeholder="Nome do aluno"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Série Pretendida</Label>
              <Select value={studentGrade} onValueChange={setStudentGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map(grade => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {sources.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nível de Interesse</Label>
              <Select value={interestLevel} onValueChange={(v) => setInterestLevel(v as 'low' | 'medium' | 'high')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixo</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Setor Responsável</Label>
              <Select value={sectorId} onValueChange={setSectorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map(sector => (
                    <SelectItem key={sector.id} value={sector.id}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Informações adicionais..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            Criar Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
