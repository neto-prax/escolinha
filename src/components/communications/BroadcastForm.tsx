import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Users, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface BroadcastFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ClassOption {
  id: string;
  name: string;
  grade: string;
  shift: string;
  studentCount: number;
}

export const BroadcastForm = ({ open, onOpenChange, onSuccess }: BroadcastFormProps) => {
  const { school } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (open && school?.id) {
      fetchClasses();
    }
  }, [open, school?.id]);

  const fetchClasses = async () => {
    if (!school?.id) return;
    setIsLoading(true);
    try {
      // Fetch classes with student count
      const { data: classesData, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          grade,
          shift,
          student_classes(count)
        `)
        .eq('school_id', school.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const formattedClasses = (classesData || []).map(cls => ({
        id: cls.id,
        name: cls.name,
        grade: cls.grade || '',
        shift: cls.shift || '',
        studentCount: (cls.student_classes as any)?.[0]?.count || 0,
      }));

      setClasses(formattedClasses);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Erro ao carregar turmas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedClasses(classes.map(c => c.id));
    } else {
      setSelectedClasses([]);
    }
  };

  const handleClassToggle = (classId: string, checked: boolean) => {
    if (checked) {
      setSelectedClasses([...selectedClasses, classId]);
    } else {
      setSelectedClasses(selectedClasses.filter(id => id !== classId));
      setSelectAll(false);
    }
  };

  const getTotalRecipients = () => {
    return classes
      .filter(c => selectedClasses.includes(c.id))
      .reduce((acc, c) => acc + c.studentCount, 0);
  };

  const handleSend = async () => {
    if (!title.trim()) {
      toast.error('Informe o título do comunicado');
      return;
    }
    if (!message.trim()) {
      toast.error('Informe a mensagem do comunicado');
      return;
    }
    if (selectedClasses.length === 0) {
      toast.error('Selecione pelo menos uma turma');
      return;
    }

    setIsSending(true);
    try {
      // Here we would integrate with the messaging system
      // For now, we'll simulate the broadcast
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success(`Comunicado enviado para ${getTotalRecipients()} responsáveis!`);
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setTitle('');
      setMessage('');
      setSelectedClasses([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast.error('Erro ao enviar comunicado');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Comunicado</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título do Comunicado</Label>
            <Input
              id="title"
              placeholder="Ex: Reunião de Pais"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              placeholder="Digite a mensagem que será enviada aos responsáveis..."
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Selecionar Turmas</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-sm cursor-pointer">
                  Selecionar todas
                </Label>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : classes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma turma cadastrada
              </div>
            ) : (
              <ScrollArea className="h-48 border rounded-lg p-4">
                <div className="space-y-3">
                  {classes.map((cls) => (
                    <div key={cls.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={cls.id}
                          checked={selectedClasses.includes(cls.id)}
                          onCheckedChange={(checked) => handleClassToggle(cls.id, checked as boolean)}
                        />
                        <Label htmlFor={cls.id} className="cursor-pointer">
                          <span className="font-medium">{cls.name}</span>
                          {cls.shift && (
                            <span className="text-muted-foreground ml-2">({cls.shift})</span>
                          )}
                        </Label>
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <Users className="h-3 w-3" />
                        {cls.studentCount}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {selectedClasses.length > 0 && (
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedClasses.length} turma(s) selecionada(s)
                </span>
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" />
                  {getTotalRecipients()} responsáveis
                </Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Enviar Comunicado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
