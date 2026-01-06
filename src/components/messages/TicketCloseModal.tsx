import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface TicketCloseModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    summary: string;
    category: string;
    resolved: boolean;
  }) => void;
  contactName: string;
}

const categories = [
  { value: 'enrollment', label: 'Matrícula' },
  { value: 'financial', label: 'Financeiro' },
  { value: 'academic', label: 'Acadêmico' },
  { value: 'support', label: 'Suporte' },
  { value: 'complaint', label: 'Reclamação' },
  { value: 'information', label: 'Informação' },
  { value: 'other', label: 'Outro' },
];

export function TicketCloseModal({
  open,
  onClose,
  onConfirm,
  contactName,
}: TicketCloseModalProps) {
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("");
  const [resolved, setResolved] = useState<string>("true");

  const handleConfirm = () => {
    if (!summary.trim() || !category) return;
    onConfirm({
      summary: summary.trim(),
      category,
      resolved: resolved === "true",
    });
    setSummary("");
    setCategory("");
    setResolved("true");
  };

  const isValid = summary.trim().length >= 10 && category;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Encerrar Atendimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Você está encerrando o atendimento com <strong>{contactName}</strong>.
            Preencha o resumo da conversa para finalizar.
          </p>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria do Atendimento *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Resultado</Label>
            <RadioGroup value={resolved} onValueChange={setResolved}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="resolved" />
                <Label htmlFor="resolved" className="font-normal cursor-pointer">
                  Resolvido
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="not-resolved" />
                <Label htmlFor="not-resolved" className="font-normal cursor-pointer">
                  Não resolvido
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">
              Resumo da Conversa * <span className="text-muted-foreground text-xs">(mín. 10 caracteres)</span>
            </Label>
            <Textarea
              id="summary"
              placeholder="Descreva o que foi tratado nesta conversa..."
              value={summary}
              onChange={e => setSummary(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground text-right">
              {summary.length} caracteres
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Encerrar Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
