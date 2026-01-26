import { useState } from 'react';
import { Check, ChevronsUpDown, Plus, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Guardian {
  id: string;
  full_name: string;
  phone: string | null;
  relationship: string | null;
}

interface GuardianComboboxProps {
  guardians: Guardian[];
  value: string | null;
  onChange: (value: string | null) => void;
}

const relationships = [
  { value: 'pai', label: 'Pai' },
  { value: 'mae', label: 'Mãe' },
  { value: 'avo', label: 'Avô/Avó' },
  { value: 'tio', label: 'Tio/Tia' },
  { value: 'responsavel', label: 'Responsável Legal' },
  { value: 'outro', label: 'Outro' },
];

export function GuardianCombobox({ guardians, value, onChange }: GuardianComboboxProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newGuardian, setNewGuardian] = useState({
    full_name: '',
    phone: '',
    email: '',
    relationship: 'responsavel',
  });

  const selectedGuardian = guardians.find((g) => g.id === value);

  const filteredGuardians = guardians.filter((guardian) =>
    guardian.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guardian.phone?.includes(searchQuery)
  );

  const createGuardianMutation = useMutation({
    mutationFn: async (data: typeof newGuardian) => {
      const { data: guardian, error } = await supabase
        .from('guardians')
        .insert({
          school_id: profile!.school_id!,
          full_name: data.full_name,
          phone: data.phone || null,
          email: data.email || null,
          relationship: data.relationship,
        })
        .select()
        .single();

      if (error) throw error;
      return guardian;
    },
    onSuccess: (guardian) => {
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
      toast.success('Responsável criado com sucesso!');
      onChange(guardian.id);
      setCreateOpen(false);
      setNewGuardian({
        full_name: '',
        phone: '',
        email: '',
        relationship: 'responsavel',
      });
    },
    onError: (error) => {
      console.error('Error creating guardian:', error);
      toast.error('Erro ao criar responsável');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuardian.full_name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    createGuardianMutation.mutate(newGuardian);
  };

  const handleOpenCreate = () => {
    setOpen(false);
    setNewGuardian({
      ...newGuardian,
      full_name: searchQuery,
    });
    setCreateOpen(true);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selectedGuardian ? (
              <span className="flex items-center gap-2 truncate">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                {selectedGuardian.full_name}
                {selectedGuardian.relationship && (
                  <span className="text-muted-foreground">
                    ({selectedGuardian.relationship})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">Pesquisar responsável...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Buscar por nome ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <CommandList>
              <CommandEmpty className="py-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Nenhum responsável encontrado
                </p>
                <Button
                  size="sm"
                  onClick={handleOpenCreate}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Criar "{searchQuery || 'novo responsável'}"
                </Button>
              </CommandEmpty>
              
              {filteredGuardians.length > 0 && (
                <CommandGroup heading="Responsáveis">
                  <CommandItem
                    value="none"
                    onSelect={() => {
                      onChange(null);
                      setOpen(false);
                      setSearchQuery('');
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === null ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="text-muted-foreground">Nenhum</span>
                  </CommandItem>
                  {filteredGuardians.map((guardian) => (
                    <CommandItem
                      key={guardian.id}
                      value={guardian.id}
                      onSelect={() => {
                        onChange(guardian.id);
                        setOpen(false);
                        setSearchQuery('');
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === guardian.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{guardian.full_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {guardian.phone || 'Sem telefone'}
                          {guardian.relationship && ` • ${guardian.relationship}`}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {filteredGuardians.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={handleOpenCreate}
                      className="cursor-pointer text-primary"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Criar novo responsável
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Create Guardian Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Criar Novo Responsável
            </DialogTitle>
            <DialogDescription>
              Adicione um novo responsável para vincular ao contato
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guardian_name">Nome Completo *</Label>
              <Input
                id="guardian_name"
                value={newGuardian.full_name}
                onChange={(e) =>
                  setNewGuardian({ ...newGuardian, full_name: e.target.value })
                }
                placeholder="Nome do responsável"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guardian_phone">Telefone</Label>
                <Input
                  id="guardian_phone"
                  value={newGuardian.phone}
                  onChange={(e) =>
                    setNewGuardian({ ...newGuardian, phone: e.target.value })
                  }
                  placeholder="5511999999999"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guardian_relationship">Parentesco</Label>
                <Select
                  value={newGuardian.relationship}
                  onValueChange={(value) =>
                    setNewGuardian({ ...newGuardian, relationship: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {relationships.map((rel) => (
                      <SelectItem key={rel.value} value={rel.value}>
                        {rel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guardian_email">Email</Label>
              <Input
                id="guardian_email"
                type="email"
                value={newGuardian.email}
                onChange={(e) =>
                  setNewGuardian({ ...newGuardian, email: e.target.value })
                }
                placeholder="email@exemplo.com"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createGuardianMutation.isPending}>
                {createGuardianMutation.isPending ? 'Criando...' : 'Criar Responsável'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
