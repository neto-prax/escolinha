import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, MessageSquare, Trash2 } from 'lucide-react';

interface MultiSelectTableProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  allIds: string[];
  onSendMessage?: () => void;
  onBulkDelete?: () => void;
  itemLabel?: string;
}

export const MultiSelectTableHeader = ({
  selectedIds,
  onSelectionChange,
  allIds,
}: Pick<MultiSelectTableProps, 'selectedIds' | 'onSelectionChange' | 'allIds'>) => {
  const isAllSelected = allIds.length > 0 && selectedIds.length === allIds.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < allIds.length;

  return (
    <Checkbox
      checked={isAllSelected}
      ref={(ref) => {
        if (ref) {
          (ref as any).indeterminate = isIndeterminate;
        }
      }}
      onCheckedChange={(checked) => {
        if (checked) {
          onSelectionChange(allIds);
        } else {
          onSelectionChange([]);
        }
      }}
      aria-label="Selecionar todos"
    />
  );
};

export const MultiSelectTableCell = ({
  id,
  selectedIds,
  onSelectionChange,
}: {
  id: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}) => {
  const isSelected = selectedIds.includes(id);

  return (
    <Checkbox
      checked={isSelected}
      onCheckedChange={(checked) => {
        if (checked) {
          onSelectionChange([...selectedIds, id]);
        } else {
          onSelectionChange(selectedIds.filter(i => i !== id));
        }
      }}
      aria-label="Selecionar item"
      onClick={(e) => e.stopPropagation()}
    />
  );
};

export const MultiSelectActionBar = ({
  selectedIds,
  onSelectionChange,
  onSendMessage,
  onBulkDelete,
  itemLabel = 'itens',
}: Omit<MultiSelectTableProps, 'allIds'>) => {
  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg p-3 flex items-center gap-3 animate-in slide-in-from-bottom-4">
      <Badge variant="secondary" className="text-sm">
        {selectedIds.length} {selectedIds.length === 1 ? itemLabel.replace(/s$/, '') : itemLabel} selecionado(s)
      </Badge>
      
      <div className="flex gap-2">
        {onSendMessage && (
          <Button size="sm" onClick={onSendMessage}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Enviar mensagem
          </Button>
        )}
        {onBulkDelete && (
          <Button size="sm" variant="destructive" onClick={onBulkDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
        )}
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => onSelectionChange([])}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
