import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Search, MessageSquare, Users, Settings, Loader2 } from 'lucide-react';
import { SectorForm } from '@/components/forms/SectorForm';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const Setores = () => {
  const { school } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch sectors from database
  const { data: sectors = [], isLoading } = useQuery({
    queryKey: ['sectors', school?.id],
    queryFn: async () => {
      if (!school?.id) return [];
      const { data, error } = await supabase
        .from('sectors')
        .select('*')
        .eq('school_id', school.id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!school?.id,
  });

  // Fetch user counts per sector
  const { data: userCounts = {} } = useQuery({
    queryKey: ['sector-user-counts', school?.id],
    queryFn: async () => {
      if (!school?.id) return {};
      const { data, error } = await supabase
        .from('user_sectors')
        .select('sector_id');
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(item => {
        counts[item.sector_id] = (counts[item.sector_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!school?.id,
  });

  // Create sector mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('sectors')
        .insert({
          name: data.name,
          description: data.description,
          whatsapp_number: data.whatsapp_number,
          evolution_instance: data.evolution_instance,
          is_active: data.is_active,
          school_id: school?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      toast.success('Setor criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar setor: ' + error.message);
    },
  });

  // Update sector mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('sectors')
        .update({
          name: data.name,
          description: data.description,
          whatsapp_number: data.whatsapp_number,
          evolution_instance: data.evolution_instance,
          is_active: data.is_active,
        })
        .eq('id', editingSector.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      setEditingSector(null);
      toast.success('Setor atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar setor: ' + error.message);
    },
  });

  // Delete sector mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sectors')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      toast.success('Setor removido com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover setor: ' + error.message);
    },
  });

  const filteredSectors = sectors.filter((sector: any) =>
    sector.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateSector = async (data: any) => {
    createMutation.mutate(data);
  };

  const handleEditSector = async (data: any) => {
    if (!editingSector) return;
    updateMutation.mutate(data);
  };

  const handleDeleteSector = (id: string) => {
    deleteMutation.mutate(id);
  };

  const activeSectors = sectors.filter((s: any) => s.is_active).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Setores" description="Gerencie os setores da escola">
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Setor
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Setores</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sectors.length}</div>
            <p className="text-xs text-muted-foreground">{activeSectors} ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usuários Vinculados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(userCounts).reduce((a: number, b: number) => a + b, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total de acessos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mensagens Hoje</CardTitle>
            <MessageSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">0</div>
            <p className="text-xs text-muted-foreground">Em todos os setores</p>
          </CardContent>
        </Card>
      </div>

      {/* Sectors Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar setor..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSectors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'Nenhum setor encontrado' : 'Nenhum setor cadastrado. Clique em "Novo Setor" para criar.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Usuários</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSectors.map((sector: any) => (
                  <TableRow key={sector.id} className="table-row-interactive">
                    <TableCell>
                      <div>
                        <p className="font-medium">{sector.name}</p>
                        <p className="text-sm text-muted-foreground">{sector.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sector.is_active ? 'secondary' : 'outline'} className={sector.is_active ? 'badge-success' : ''}>
                        {sector.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{userCounts[sector.id] || 0}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditingSector(sector);
                            setIsFormOpen(true);
                          }}>
                            Editar setor
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeleteSector(sector.id)}
                          >
                            Excluir setor
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <SectorForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingSector(null);
        }}
        onSubmit={editingSector ? handleEditSector : handleCreateSector}
        initialData={editingSector || undefined}
        mode={editingSector ? 'edit' : 'create'}
      />
    </div>
  );
};

export default Setores;
