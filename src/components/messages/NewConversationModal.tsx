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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type ContactType = 'lead' | 'guardian' | 'student' | 'staff' | 'other';

interface ExistingContact {
  id: string;
  full_name: string;
  phone: string;
  contact_type: ContactType;
}

interface Sector {
  id: string;
  name: string;
}

interface NewConversationModalProps {
  open: boolean;
  onClose: () => void;
  onCreateNew: (data: {
    name: string;
    phone: string;
    type: ContactType;
    sectorId: string;
  }) => void;
  onSelectExisting: (contactId: string, sectorId: string) => void;
  existingContacts: ExistingContact[];
  sectors: Sector[];
}

const contactTypeConfig = {
  lead: { label: 'Lead', color: 'bg-yellow-500' },
  guardian: { label: 'Responsável', color: 'bg-green-500' },
  student: { label: 'Aluno', color: 'bg-blue-500' },
  staff: { label: 'Equipe', color: 'bg-purple-500' },
  other: { label: 'Outro', color: 'bg-gray-500' },
};

export function NewConversationModal({
  open,
  onClose,
  onCreateNew,
  onSelectExisting,
  existingContacts,
  sectors,
}: NewConversationModalProps) {
  const [tab, setTab] = useState<'existing' | 'new'>('existing');
  const [search, setSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [selectedSectorId, setSelectedSectorId] = useState<string>("");

  // New contact form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<ContactType>('other');

  const filteredContacts = existingContacts.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const handleConfirm = () => {
    if (!selectedSectorId) return;

    if (tab === 'existing' && selectedContactId) {
      onSelectExisting(selectedContactId, selectedSectorId);
    } else if (tab === 'new' && name && phone) {
      onCreateNew({ name, phone, type, sectorId: selectedSectorId });
    }

    // Reset form
    setSearch("");
    setSelectedContactId("");
    setSelectedSectorId("");
    setName("");
    setPhone("");
    setType('other');
    onClose();
  };

  const isValid =
    selectedSectorId &&
    ((tab === 'existing' && selectedContactId) ||
      (tab === 'new' && name.trim() && phone.trim()));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Conversa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Setor *</Label>
            <Select value={selectedSectorId} onValueChange={setSelectedSectorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o setor" />
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

          <Tabs value={tab} onValueChange={(v) => setTab(v as 'existing' | 'new')}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="existing">Contato Existente</TabsTrigger>
              <TabsTrigger value="new">Novo Contato</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-3 mt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar contato..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-[200px] border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredContacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum contato encontrado
                    </p>
                  ) : (
                    filteredContacts.map(contact => {
                      const typeConfig = contactTypeConfig[contact.contact_type];
                      return (
                        <button
                          key={contact.id}
                          className={cn(
                            "w-full flex items-center gap-3 p-2 rounded text-left transition-colors",
                            selectedContactId === contact.id
                              ? "bg-accent"
                              : "hover:bg-accent/50"
                          )}
                          onClick={() => setSelectedContactId(contact.id)}
                        >
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs", typeConfig.color)}>
                            {contact.full_name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{contact.full_name}</p>
                            <p className="text-xs text-muted-foreground">{contact.phone}</p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="new" className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Nome do contato"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (WhatsApp) *</Label>
                <Input
                  id="phone"
                  placeholder="5511999999999"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Contato</Label>
                <Select value={type} onValueChange={(v) => setType(v as ContactType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="guardian">Responsável</SelectItem>
                    <SelectItem value="student">Aluno</SelectItem>
                    <SelectItem value="staff">Equipe</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Iniciar Conversa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
