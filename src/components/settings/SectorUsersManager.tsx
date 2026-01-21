import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Building2, Search, Eye, EyeOff } from 'lucide-react';
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
}

export function SectorUsersManager() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});

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

  // Fetch all users from the school
  const { data: allUsers = [] } = useQuery({
    queryKey: ['school-users', profile?.school_id],
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
    enabled: !!profile?.school_id,
  });

  // Fetch user_sectors
  const { data: userSectors = [], isLoading } = useQuery({
    queryKey: ['user-sectors', profile?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_sectors')
        .select('id, user_id, sector_id');

      if (error) throw error;
      return data as UserSector[];
    },
    enabled: !!profile?.school_id,
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
    onError: () => {
      toast.error('Erro ao adicionar acesso');
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
    },
    onError: () => {
      toast.error('Erro ao remover acesso');
    },
  });

  // Check if user has access to sector
  const hasAccess = (userId: string, sectorId: string) => {
    return userSectors.some(us => us.user_id === userId && us.sector_id === sectorId);
  };

  // Get user_sector id for removal
  const getUserSectorId = (userId: string, sectorId: string) => {
    return userSectors.find(us => us.user_id === userId && us.sector_id === sectorId)?.id;
  };

  // Handle toggle access
  const handleToggleAccess = async (userId: string, sectorId: string, currentlyHasAccess: boolean) => {
    const key = `${userId}-${sectorId}`;
    setPendingChanges(prev => ({ ...prev, [key]: true }));

    try {
      if (currentlyHasAccess) {
        const userSectorId = getUserSectorId(userId, sectorId);
        if (userSectorId) {
          await removeUserFromSector.mutateAsync(userSectorId);
        }
      } else {
        await addUserToSector.mutateAsync({ userId, sectorId });
      }
    } finally {
      setPendingChanges(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return allUsers;
    const query = searchQuery.toLowerCase();
    return allUsers.filter(user => 
      user.full_name.toLowerCase().includes(query)
    );
  }, [allUsers, searchQuery]);

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Count users with access per sector
  const getUserCountForSector = (sectorId: string) => {
    return userSectors.filter(us => us.sector_id === sectorId).length;
  };

  // Toggle all users for a sector
  const handleToggleAllForSector = async (sectorId: string, grantAccess: boolean) => {
    const usersToProcess = filteredUsers.filter(user => {
      const currentlyHasAccess = hasAccess(user.id, sectorId);
      return grantAccess ? !currentlyHasAccess : currentlyHasAccess;
    });

    for (const user of usersToProcess) {
      await handleToggleAccess(user.id, sectorId, !grantAccess);
    }

    toast.success(grantAccess ? 'Acesso concedido a todos' : 'Acesso removido de todos');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Visibilidade por Setor
            </CardTitle>
            <CardDescription>
              Configure quais usuários podem visualizar cada setor de atendimento
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuário..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : sectors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum setor configurado. Crie setores na página de Setores primeiro.
          </div>
        ) : (
          <Accordion type="multiple" className="w-full" defaultValue={sectors.map(s => s.id)}>
            {sectors.map((sector) => {
              const userCount = getUserCountForSector(sector.id);
              const allHaveAccess = filteredUsers.every(user => hasAccess(user.id, sector.id));
              const someHaveAccess = filteredUsers.some(user => hasAccess(user.id, sector.id));

              return (
                <AccordionItem key={sector.id} value={sector.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{sector.name}</span>
                      </div>
                      <Badge variant="secondary" className="ml-auto mr-4">
                        <Users className="h-3 w-3 mr-1" />
                        {userCount} usuário{userCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {/* Bulk actions */}
                      <div className="flex items-center justify-between pb-2 border-b">
                        <span className="text-sm text-muted-foreground">
                          {sector.description || 'Sem descrição'}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleAllForSector(sector.id, true)}
                            disabled={allHaveAccess}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Dar acesso a todos
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleAllForSector(sector.id, false)}
                            disabled={!someHaveAccess}
                          >
                            <EyeOff className="h-3 w-3 mr-1" />
                            Remover todos
                          </Button>
                        </div>
                      </div>

                      {/* User list */}
                      <div className="grid gap-1 max-h-80 overflow-y-auto">
                        {filteredUsers.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            Nenhum usuário encontrado
                          </p>
                        ) : (
                          filteredUsers.map((user) => {
                            const userHasAccess = hasAccess(user.id, sector.id);
                            const isPending = pendingChanges[`${user.id}-${sector.id}`];

                            return (
                              <label
                                key={user.id}
                                className={`flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer transition-colors ${
                                  userHasAccess ? 'bg-accent/50' : ''
                                }`}
                              >
                                <Checkbox
                                  checked={userHasAccess}
                                  disabled={isPending}
                                  onCheckedChange={() => handleToggleAccess(user.id, sector.id, userHasAccess)}
                                />
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={user.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(user.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm flex-1">{user.full_name}</span>
                                {userHasAccess && (
                                  <Badge variant="outline" className="text-xs">
                                    <Eye className="h-3 w-3 mr-1" />
                                    Acesso
                                  </Badge>
                                )}
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
