import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarDays, Send, Clock, CheckCircle, Users } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

// Mock data
const teacherClasses = [
  { id: '1', name: '1º Ano A', students: 25 },
  { id: '2', name: '2º Ano A', students: 28 },
  { id: '3', name: '3º Ano A', students: 26 },
];

const students = [
  { id: '1', name: 'Ana Beatriz', present: true },
  { id: '2', name: 'Bruno Costa', present: true },
  { id: '3', name: 'Carolina Oliveira', present: false },
  { id: '4', name: 'Daniel Ferreira', present: true },
  { id: '5', name: 'Elena Rodrigues', present: true },
];

const recentEntries = [
  { id: '1', date: '2025-01-03', class: '1º Ano A', content: 'Matemática - Adição', status: 'sent' },
  { id: '2', date: '2025-01-02', class: '2º Ano A', content: 'Português - Leitura', status: 'sent' },
  { id: '3', date: '2025-01-02', class: '1º Ano A', content: 'Ciências - Natureza', status: 'pending' },
];

const Diario = () => {
  const [selectedClass, setSelectedClass] = useState('');
  const [content, setContent] = useState('');
  const [homework, setHomework] = useState('');
  const [observations, setObservations] = useState('');
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: 'Diário salvo!',
      description: 'O registro do diário foi salvo com sucesso.',
    });
  };

  const handleSendMessage = () => {
    toast({
      title: 'Mensagem enviada!',
      description: 'A mensagem foi enviada para todos os responsáveis da turma.',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diário de Classe"
        description="Registre o conteúdo diário e envie para os responsáveis"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Class selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Selecionar Turma</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha a turma" />
                </SelectTrigger>
                <SelectContent>
                  {teacherClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} ({cls.students} alunos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedClass && (
            <>
              {/* Content */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Registro do Dia</CardTitle>
                  <CardDescription>
                    {new Date().toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Conteúdo trabalhado</Label>
                    <Textarea
                      placeholder="Descreva o conteúdo trabalhado hoje..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tarefa de casa</Label>
                    <Textarea
                      placeholder="Descreva a tarefa de casa, se houver..."
                      value={homework}
                      onChange={(e) => setHomework(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      placeholder="Observações gerais sobre a turma..."
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Attendance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Chamada
                  </CardTitle>
                  <CardDescription>
                    Marque os alunos presentes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                      >
                        <Checkbox
                          id={`student-${student.id}`}
                          checked={attendance[student.id] ?? student.present}
                          onCheckedChange={(checked) =>
                            setAttendance({ ...attendance, [student.id]: !!checked })
                          }
                        />
                        <Label
                          htmlFor={`student-${student.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          {student.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleSave} variant="outline" className="flex-1">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Salvar Diário
                </Button>
                <Button onClick={handleSendMessage} className="flex-1">
                  <Send className="mr-2 h-4 w-4" />
                  Enviar para Responsáveis
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent entries */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Registros Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
                  >
                    <CalendarDays className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{entry.class}</p>
                      <p className="text-xs text-muted-foreground">{entry.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={entry.status === 'sent' ? 'badge-success' : 'badge-warning'}
                    >
                      {entry.status === 'sent' ? 'Enviado' : 'Pendente'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">💡 Dica</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ao clicar em "Enviar para Responsáveis", uma mensagem será enviada
                via WhatsApp para todos os responsáveis dos alunos da turma selecionada.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Diario;
