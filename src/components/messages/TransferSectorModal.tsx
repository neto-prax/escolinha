import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState } from 'react';
import { Building2 } from 'lucide-react';

interface Sector {
  id: string;
  name: string;
  description?: string | null;
}

interface TransferSectorModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (sectorId: string, reason: string) => void;
  sectors: Sector[];
  currentSectorId?: string;
  contactName: string;
}

export function TransferSectorModal({
  open,
  onClose,
  onConfirm,
  sectors,
  currentSectorId,
  contactName,
}: TransferSectorModalProps) {
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [reason, setReason] = useState('');

  const availableSectors = sectors.filter(s => s.id !== currentSectorId);

  const handleConfirm = () => {
    if (selectedSector) {
      onConfirm(selectedSector, reason);
      setSelectedSector('');
      setReason('');
    }
  };

  const handleClose = () => {
    setSelectedSector('');
    setReason('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Transferir para outro setor
          </DialogTitle>
          <DialogDescription>
            Transferir a conversa de <strong>{contactName}</strong> para outro setor de atendimento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Selecione o setor de destino</Label>
            {availableSectors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Não há outros setores disponíveis para transferência.
              </p>
            ) : (
              <RadioGroup value={selectedSector} onValueChange={setSelectedSector}>
                {availableSectors.map((sector) => (
                  <div
                    key={sector.id}
                    className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                    onClick={() => setSelectedSector(sector.id)}
                  >
                    <RadioGroupItem value={sector.id} id={sector.id} className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor={sector.id} className="cursor-pointer font-medium">
                        {sector.name}
                      </Label>
                      {sector.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {sector.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da transferência (opcional)</Label>
            <Textarea
              id="reason"
              placeholder="Ex: Assunto relacionado ao financeiro..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedSector}>
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
