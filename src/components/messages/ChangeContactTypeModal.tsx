import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export type ContactType = 'lead' | 'guardian' | 'student' | 'staff' | 'other';

interface ChangeContactTypeModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (types: ContactType[]) => void;
  currentTypes: ContactType[];
  contactName: string;
}

const contactTypes = [
  {
    value: 'lead' as ContactType,
    label: 'Lead',
    description: 'Interessado em matrícula, ainda não matriculou',
    color: 'bg-yellow-500',
  },
  {
    value: 'guardian' as ContactType,
    label: 'Responsável',
    description: 'Responsável por aluno matriculado',
    color: 'bg-green-500',
  },
  {
    value: 'student' as ContactType,
    label: 'Aluno',
    description: 'Contato direto do aluno',
    color: 'bg-blue-500',
  },
  {
    value: 'staff' as ContactType,
    label: 'Equipe',
    description: 'Funcionário ou professor da escola',
    color: 'bg-purple-500',
  },
  {
    value: 'other' as ContactType,
    label: 'Outro',
    description: 'Fornecedor, prestador de serviço, etc',
    color: 'bg-gray-500',
  },
];

export function ChangeContactTypeModal({
  open,
  onClose,
  onConfirm,
  currentTypes,
  contactName,
}: ChangeContactTypeModalProps) {
  const [selectedTypes, setSelectedTypes] = useState<ContactType[]>(currentTypes);

  // Reset when modal opens with new data
  useEffect(() => {
    if (open) {
      setSelectedTypes(currentTypes.length > 0 ? currentTypes : ['other']);
    }
  }, [open, currentTypes]);

  const toggleType = (type: ContactType) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        // Don't allow removing the last type
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const handleConfirm = () => {
    onConfirm(selectedTypes);
    onClose();
  };

  const hasChanges = JSON.stringify(selectedTypes.sort()) !== JSON.stringify(currentTypes.sort());

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar Tipos de Contato</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Selecione os tipos do contato <strong>{contactName}</strong>. Um contato pode ter múltiplos tipos.
          </p>

          <div className="space-y-2">
            {contactTypes.map(type => (
              <label
                key={type.value}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  selectedTypes.includes(type.value)
                    ? "border-primary bg-accent"
                    : "hover:bg-accent/50"
                )}
              >
                <Checkbox
                  checked={selectedTypes.includes(type.value)}
                  onCheckedChange={() => toggleType(type.value)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", type.color)} />
                    <span className="font-medium">{type.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {type.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!hasChanges || selectedTypes.length === 0}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
