import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, MoreHorizontal, Search, MessageSquare, Users, Wifi, WifiOff, Settings } from 'lucide-react';
import { SectorForm } from '@/components/forms/SectorForm';
import { toast } from 'sonner';

// Mock data
const mockSectors = [
  {
    id: '1',
    name: 'Secretaria',
    description: 'Atendimento geral e matrículas',
    whatsapp_number: '5511999991111',
    evolution_instance: 'secretaria-inst',
    is_active: true,
    connected: true,
    users_count: 3,
    messages_today: 45,
  },
  {
    id: '2',
    name: 'Financeiro',
    description: 'Cobranças e mensalidades',
    whatsapp_number: '5511999992222',
    evolution_instance: 'financeiro-inst',
    is_active: true,
    connected: true,
    users_count: 2,
    messages_today: 28,
  },
  {
    id: '3',
    name: 'Coordenação Pedagógica',
    description: 'Assuntos pedagógicos e reuniões',
    whatsapp_number: '5511999993333',
    evolution_instance: 'coord-inst',
    is_active: true,
    connected: false,
    users_count: 2,
    messages_today: 0,
  },
  {
    id: '4',
    name: 'Diretoria',
    description: 'Comunicação institucional',
    whatsapp_number: '',
    evolution_instance: '',
    is_active: false,
    connected: false,
    users_count: 1,
    messages_today: 0,
  },
];

const Setores = () => {
  const [sectors, setSectors] = useState(mockSectors);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<typeof mockSectors[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSectors = sectors.filter(sector =>
    sector.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateSector = async (data: any) => {
    // Simulate API call
    const newSector = {
      id: String(Date.now()),
      ...data,
      connected: false,
      users_count: 0,
      messages_today: 0,
    };
    setSectors([...sectors, newSector]);
    toast.success('Setor criado com sucesso!');
  };

  const handleEditSector = async (data: any) => {
    if (!editingSector) return;
    setSectors(sectors.map(s => 
      s.id === editingSector.id ? { ...s, ...data } : s
    ));
    setEditingSector(null);
    toast.success('Setor atualizado com sucesso!');
  };

  const handleDeleteSector = (id: string) => {
    setSectors(sectors.filter(s => s.id !== id));
    toast.success('Setor removido com sucesso!');
  };

  const activeSectors = sectors.filter(s => s.is_active).length;
  const connectedSectors = sectors.filter(s => s.connected).length;
  const totalMessages = sectors.reduce((acc, s) => acc + s.messages_today, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Setores" description="Gerencie os setores e instâncias WhatsApp">
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Setor
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">WhatsApp Conectados</CardTitle>
            <Wifi className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{connectedSectors}</div>
            <p className="text-xs text-muted-foreground">de {activeSectors} ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mensagens Hoje</CardTitle>
            <MessageSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalMessages}</div>
            <p className="text-xs text-muted-foreground">Em todos os setores</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usuários Vinculados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sectors.reduce((acc, s) => acc + s.users_count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total de acessos</p>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setor</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Usuários</TableHead>
                <TableHead className="text-center">Mensagens Hoje</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSectors.map((sector) => (
                <TableRow key={sector.id} className="table-row-interactive">
                  <TableCell>
                    <div>
                      <p className="font-medium">{sector.name}</p>
                      <p className="text-sm text-muted-foreground">{sector.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {sector.whatsapp_number ? (
                      <div className="flex items-center gap-2">
                        {sector.connected ? (
                          <Wifi className="h-4 w-4 text-success" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-destructive" />
                        )}
                        <span className="text-sm font-mono">
                          {sector.whatsapp_number.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Não configurado</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sector.is_active ? 'secondary' : 'outline'} className={sector.is_active ? 'badge-success' : ''}>
                      {sector.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{sector.users_count}</TableCell>
                  <TableCell className="text-center">{sector.messages_today}</TableCell>
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
                        <DropdownMenuItem>Gerenciar usuários</DropdownMenuItem>
                        <DropdownMenuItem>Configurar WhatsApp</DropdownMenuItem>
                        <DropdownMenuItem>Ver conversas</DropdownMenuItem>
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
