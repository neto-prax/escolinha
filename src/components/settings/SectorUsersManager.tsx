import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Plus, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface Sector {
  id: string;
  name: string;
  description: string | null;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface UserSector {
  id: string;
  user_id: string;
  sector_id: string;
  profile?: Profile;
  sector?: Sector;
}

export function SectorUsersManager() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Fetch sectors
  const { data: sectors = [] } = useQuery({
    queryKey: ['sectors', profile?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sectors')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Sector[];
    },
    enabled: !!profile?.school_id,
  });

  // Fetch user_sectors with profiles
  const { data: userSectors = [], isLoading } = useQuery({
    queryKey: ['user-sectors', profile?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_sectors')
        .select(`
          *,
          sector:sectors(id, name, description)
        `);

      if (error) throw error;

      // Fetch profiles separately
      const userIds = data.map((us: UserSector) => us.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      return data.map((us: UserSector) => ({
        ...us,
        profile: profiles?.find((p: Profile) => p.id === us.user_id),
      })) as UserSector[];
    },
    enabled: !!profile?.school_id,
  });

  // Fetch available users (profiles) - only from the same school
  const { data: availableUsers = [] } = useQuery({
    queryKey: ['available-users', profile?.school_id],
    queryFn: async () => {
      if (!profile?.school_id) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('school_id', profile.school_id)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!profile?.school_id && isAddOpen,
  });

  // Add user to sector
  const addUserToSector = useMutation({
    mutationFn: async ({ userId, sectorId }: { userId: string; sectorId: string }) => {
      const { data, error } = await supabase
        .from('user_sectors')
        .insert({ user_id: userId, sector_id: sectorId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sectors'] });
    },
  });

  // Remove user from sector
  const removeUserFromSector = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_sectors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sectors'] });
      toast.success('Usuário removido do setor');
    },
  });

  const handleAddUsers = async () => {
    if (!selectedSector || selectedUsers.length === 0) return;

    try {
      for (const userId of selectedUsers) {
        await addUserToSector.mutateAsync({ userId, sectorId: selectedSector });
      }
      toast.success('Usuários adicionados ao setor');
      setIsAddOpen(false);
      setSelectedSector('');
      setSelectedUsers([]);
    } catch (error) {
      toast.error('Erro ao adicionar usuários');
    }
  };

  // Group by sector
  const groupedBySector = sectors.map(sector => ({
    sector,
    users: userSectors.filter(us => us.sector_id === sector.id),
  }));

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Usuários por Setor
              </CardTitle>
              <CardDescription>Vincule usuários aos setores de atendimento</CardDescription>
            </div>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Vincular Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : groupedBySector.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum setor configurado
            </div>
          ) : (
            <div className="space-y-6">
              {groupedBySector.map(({ sector, users }) => (
                <div key={sector.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{sector.name}</h4>
                    <Badge variant="secondary">{users.length} usuários</Badge>
                  </div>
                  {users.length > 0 ? (
                    <Table>
                      <TableBody>
                        {users.map((us) => (
                          <TableRow key={us.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>{us.profile?.full_name || 'Usuário'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeUserFromSector.mutate(us.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground pl-4">Nenhum usuário vinculado</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Usuários ao Setor</DialogTitle>
            <DialogDescription>
              Selecione o setor e os usuários que terão acesso
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Setor</label>
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um setor" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((sector) => (
                    <SelectItem key={sector.id} value={sector.id}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSector && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Usuários</label>
                <div className="border rounded-md max-h-60 overflow-y-auto">
                  {availableUsers
                    .filter(u => !userSectors.some(us => us.user_id === u.id && us.sector_id === selectedSector))
                    .map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            }
                          }}
                        />
                        <span>{user.full_name}</span>
                      </label>
                    ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddUsers}
              disabled={!selectedSector || selectedUsers.length === 0 || addUserToSector.isPending}
            >
              Vincular {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
