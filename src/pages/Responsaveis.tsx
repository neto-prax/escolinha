import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Filter, MoreHorizontal, UserPlus, Upload, Download, Users } from 'lucide-react';
import { MultiSelectTableHeader, MultiSelectTableCell, MultiSelectActionBar } from '@/components/ui/multi-select-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import { ensureGuardianContact } from '@/hooks/useGuardianContact';

interface Guardian {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  relationship: string | null;
  address: string | null;
  is_primary: boolean | null;
  created_at: string;
}

interface GuardianFormData {
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  relationship: string;
  address: string;
}

const Responsaveis = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<GuardianFormData>({
    full_name: '',
    email: '',
    phone: '',
    cpf: '',
    relationship: '',
    address: '',
  });
  const [importData, setImportData] = useState<GuardianFormData[]>([]);

  // Fetch guardians
  const { data: guardians = [], isLoading } = useQuery({
    queryKey: ['guardians'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guardians')
        .select('*')
        .order('full_name');
      
      if (error) throw error;
      return data as Guardian[];
    },
    enabled: !!profile?.school_id,
  });

  // Create guardian mutation
  const createGuardianMutation = useMutation({
    mutationFn: async (data: GuardianFormData) => {
      const { data: guardian, error } = await supabase
        .from('guardians')
        .insert({
          school_id: profile!.school_id!,
          full_name: data.full_name,
          email: data.email || null,
          phone: data.phone || null,
          cpf: data.cpf || null,
          relationship: data.relationship || null,
          address: data.address || null,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Create contact for this guardian
      if (guardian && data.phone) {
        await ensureGuardianContact(
          guardian.id,
          {
            full_name: data.full_name,
            phone: data.phone || null,
            email: data.email || null,
          },
          profile!.school_id!,
          []
        );
      }

      return guardian;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Responsável cadastrado com sucesso!');
      handleCloseForm();
    },
    onError: (error) => {
      console.error('Error creating guardian:', error);
      toast.error('Erro ao cadastrar responsável');
    },
  });

  // Update guardian mutation
  const updateGuardianMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: GuardianFormData }) => {
      const { error } = await supabase
        .from('guardians')
        .update({
          full_name: data.full_name,
          email: data.email || null,
          phone: data.phone || null,
          cpf: data.cpf || null,
          relationship: data.relationship || null,
          address: data.address || null,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
      toast.success('Responsável atualizado com sucesso!');
      handleCloseForm();
    },
    onError: (error) => {
      console.error('Error updating guardian:', error);
      toast.error('Erro ao atualizar responsável');
    },
  });

  // Bulk import mutation
  const bulkImportMutation = useMutation({
    mutationFn: async (dataList: GuardianFormData[]) => {
      const records = dataList.map(data => ({
        school_id: profile!.school_id!,
        full_name: data.full_name,
        email: data.email || null,
        phone: data.phone || null,
        cpf: data.cpf || null,
        relationship: data.relationship || null,
        address: data.address || null,
      }));

      const { data: guardians, error } = await supabase
        .from('guardians')
        .insert(records)
        .select();
      
      if (error) throw error;

      // Create contacts for guardians with phone
      if (guardians) {
        for (const guardian of guardians) {
          if (guardian.phone) {
            await ensureGuardianContact(
              guardian.id,
              {
                full_name: guardian.full_name,
                phone: guardian.phone,
                email: guardian.email,
              },
              profile!.school_id!,
              []
            );
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success(`${importData.length} responsáveis importados com sucesso!`);
      setIsImportOpen(false);
      setImportData([]);
    },
    onError: (error) => {
      console.error('Error importing guardians:', error);
      toast.error('Erro ao importar responsáveis');
    },
  });

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingGuardian(null);
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      cpf: '',
      relationship: '',
      address: '',
    });
  };

  const handleCreatePortalAccess = async (guardian: Guardian) => {
    if (!guardian.email) {
      toast.error('O responsável precisa ter um email cadastrado para criar acesso ao portal.');
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('create-guardian-access', {
        body: { guardian_id: guardian.id, school_id: profile?.school_id },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      toast.success(
        `Acesso criado! Email: ${data.email} | Senha temporária: ${data.temporary_password}`,
        { duration: 15000 }
      );
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar acesso ao portal');
    }
  };

  const handleOpenEdit = (guardian: Guardian) => {
    setEditingGuardian(guardian);
    setFormData({
      full_name: guardian.full_name,
      email: guardian.email || '',
      phone: guardian.phone || '',
      cpf: guardian.cpf || '',
      relationship: guardian.relationship || '',
      address: guardian.address || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (editingGuardian) {
      updateGuardianMutation.mutate({ id: editingGuardian.id, data: formData });
    } else {
      createGuardianMutation.mutate(formData);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, string>[];

        const parsedData: GuardianFormData[] = jsonData.map(row => ({
          full_name: row['Nome'] || row['nome'] || row['full_name'] || '',
          email: row['Email'] || row['email'] || row['E-mail'] || '',
          phone: row['Telefone'] || row['telefone'] || row['phone'] || row['Celular'] || '',
          cpf: row['CPF'] || row['cpf'] || '',
          relationship: row['Parentesco'] || row['parentesco'] || row['relationship'] || row['Relação'] || '',
          address: row['Endereço'] || row['endereco'] || row['address'] || '',
        })).filter(row => row.full_name);

        if (parsedData.length === 0) {
          toast.error('Nenhum registro válido encontrado no arquivo');
          return;
        }

        setImportData(parsedData);
        toast.success(`${parsedData.length} registros encontrados`);
      } catch (error) {
        console.error('Error parsing Excel:', error);
        toast.error('Erro ao ler o arquivo Excel');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadTemplate = () => {
    const template = [
      { Nome: 'Maria Silva', Email: 'maria@email.com', Telefone: '(11) 99999-1111', CPF: '123.456.789-00', Parentesco: 'Mãe', Endereço: 'Rua das Flores, 123' },
      { Nome: 'José Santos', Email: 'jose@email.com', Telefone: '(11) 99999-2222', CPF: '987.654.321-00', Parentesco: 'Pai', Endereço: 'Av. Brasil, 456' },
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Responsáveis');
    XLSX.writeFile(workbook, 'modelo_responsaveis.xlsx');
    toast.success('Modelo baixado com sucesso!');
  };

  const handleConfirmImport = () => {
    if (importData.length === 0) {
      toast.error('Nenhum dado para importar');
      return;
    }
    bulkImportMutation.mutate(importData);
  };

  const filteredGuardians = guardians.filter(guardian =>
    guardian.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guardian.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guardian.phone?.includes(searchQuery) ||
    guardian.cpf?.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Responsáveis"
        description="Gerencie os responsáveis dos alunos"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar Excel
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Responsável
          </Button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium">Total de Responsáveis</span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{guardians.length}</div>
            <p className="text-xs text-muted-foreground">Cadastrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium">Com Email</span>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {guardians.filter(g => g.email).length}
            </div>
            <p className="text-xs text-muted-foreground">Para comunicação</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium">Com Telefone</span>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {guardians.filter(g => g.phone).length}
            </div>
            <p className="text-xs text-muted-foreground">Para WhatsApp</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar responsável..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredGuardians.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum responsável encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <MultiSelectTableHeader
                      selectedIds={selectedIds}
                      onSelectionChange={setSelectedIds}
                      allIds={filteredGuardians.map(g => g.id)}
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Parentesco</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuardians.map((guardian) => (
                  <TableRow key={guardian.id} className={`table-row-interactive ${selectedIds.includes(guardian.id) ? 'bg-muted/50' : ''}`}>
                    <TableCell>
                      <MultiSelectTableCell
                        id={guardian.id}
                        selectedIds={selectedIds}
                        onSelectionChange={setSelectedIds}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {guardian.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{guardian.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{guardian.email || '-'}</TableCell>
                    <TableCell>{guardian.phone || '-'}</TableCell>
                    <TableCell>{guardian.cpf || '-'}</TableCell>
                    <TableCell>
                      {guardian.relationship ? (
                        <Badge variant="secondary">{guardian.relationship}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(guardian)}>
                            Editar cadastro
                          </DropdownMenuItem>
                          <DropdownMenuItem>Ver alunos vinculados</DropdownMenuItem>
                          <DropdownMenuItem>Enviar mensagem</DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleCreatePortalAccess(guardian)}
                            disabled={!guardian.email}
                          >
                            Criar acesso ao portal
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
      <Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingGuardian ? 'Editar Responsável' : 'Novo Responsável'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do responsável
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Nome completo"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="relationship">Parentesco</Label>
                <Select
                  value={formData.relationship}
                  onValueChange={(value) => setFormData({ ...formData, relationship: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pai">Pai</SelectItem>
                    <SelectItem value="Mãe">Mãe</SelectItem>
                    <SelectItem value="Avô">Avô</SelectItem>
                    <SelectItem value="Avó">Avó</SelectItem>
                    <SelectItem value="Tio">Tio</SelectItem>
                    <SelectItem value="Tia">Tia</SelectItem>
                    <SelectItem value="Irmão">Irmão</SelectItem>
                    <SelectItem value="Irmã">Irmã</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rua, número, bairro, cidade"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createGuardianMutation.isPending || updateGuardianMutation.isPending}
              >
                {editingGuardian ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={(open) => {
        setIsImportOpen(open);
        if (!open) {
          setImportData([]);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar Responsáveis</DialogTitle>
            <DialogDescription>
              Faça upload de um arquivo Excel (.xlsx) com os dados dos responsáveis
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Baixar Modelo
              </Button>
            </div>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-upload"
              />
              <label
                htmlFor="excel-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Clique para selecionar ou arraste um arquivo Excel
                </span>
              </label>
            </div>

            {importData.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Prévia dos dados ({importData.length} registros)</h4>
                <div className="max-h-60 overflow-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Parentesco</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importData.slice(0, 10).map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>{row.full_name}</TableCell>
                          <TableCell>{row.email || '-'}</TableCell>
                          <TableCell>{row.phone || '-'}</TableCell>
                          <TableCell>{row.relationship || '-'}</TableCell>
                        </TableRow>
                      ))}
                      {importData.length > 10 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            ... e mais {importData.length - 10} registros
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsImportOpen(false);
                  setImportData([]);
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmImport}
                disabled={importData.length === 0 || bulkImportMutation.isPending}
              >
                {bulkImportMutation.isPending ? 'Importando...' : `Importar ${importData.length} registros`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Multi-select Action Bar */}
      <MultiSelectActionBar
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onSendMessage={() => {
          toast.info(`Enviar mensagem para ${selectedIds.length} responsável(is)`);
        }}
        onBulkDelete={async () => {
          const count = selectedIds.length;
          try {
            const { error } = await supabase
              .from('guardians')
              .delete()
              .in('id', selectedIds);
            
            if (error) throw error;
            
            queryClient.invalidateQueries({ queryKey: ['guardians'] });
            setSelectedIds([]);
            toast.success(`${count} responsável(is) removido(s) com sucesso!`);
          } catch (error) {
            console.error('Error deleting guardians:', error);
            toast.error('Erro ao excluir responsáveis');
          }
        }}
        itemLabel="responsáveis"
      />
    </div>
  );
};

export default Responsaveis;
