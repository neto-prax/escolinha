import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { Search, Filter, MoreHorizontal, UserPlus, Upload, Download, Contact, MessageSquare, History, Users, GraduationCap } from 'lucide-react';
import { ConvertToGuardianModal } from '@/components/contacts/ConvertToGuardianModal';
import { LinkStudentsModal } from '@/components/contacts/LinkStudentsModal';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';

interface ContactRecord {
  id: string;
  full_name: string;
  device_name: string | null;
  email: string | null;
  phone: string;
  contact_type: string;
  contact_types: string[];
  notes: string | null;
  tags: string[] | null;
  created_at: string | null;
  guardian_id: string | null;
  lead_id: string | null;
}

interface ContactFormData {
  full_name: string;
  device_name: string;
  email: string;
  phone: string;
  contact_types: string[];
  notes: string;
  guardian_id: string | null;
}

const contactTypeLabels: Record<string, string> = {
  lead: 'Lead',
  guardian: 'Responsável',
  student: 'Aluno',
  staff: 'Funcionário',
  other: 'Outro',
};

const Contatos = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isLinkStudentsOpen, setIsLinkStudentsOpen] = useState(false);
  const [selectedContactHistory, setSelectedContactHistory] = useState<ContactRecord | null>(null);
  const [selectedContactConvert, setSelectedContactConvert] = useState<ContactRecord | null>(null);
  const [selectedContactLink, setSelectedContactLink] = useState<ContactRecord | null>(null);
  const [editingContact, setEditingContact] = useState<ContactRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<ContactFormData>({
    full_name: '',
    device_name: '',
    email: '',
    phone: '',
    contact_types: ['other'],
    notes: '',
    guardian_id: null,
  });
  const [importData, setImportData] = useState<ContactFormData[]>([]);

  // Fetch contacts
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, full_name, device_name, email, phone, contact_type, contact_types, notes, tags, created_at, guardian_id, lead_id')
        .order('full_name');
      
      if (error) throw error;
      return (data || []).map(c => ({
        ...c,
        contact_types: c.contact_types || [c.contact_type || 'other'],
      })) as ContactRecord[];
    },
    enabled: !!profile?.school_id,
  });

  // Fetch guardians for linking
  const { data: guardians = [] } = useQuery({
    queryKey: ['guardians'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guardians')
        .select('id, full_name, phone, relationship')
        .order('full_name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.school_id,
  });


  // Create contact mutation
  const createContactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const { error } = await supabase
        .from('contacts')
        .insert({
          school_id: profile!.school_id!,
          full_name: data.full_name,
          device_name: data.device_name || null,
          email: data.email || null,
          phone: data.phone,
          contact_type: data.contact_types[0] || 'other',
          contact_types: data.contact_types,
          notes: data.notes || null,
          guardian_id: data.guardian_id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contato cadastrado com sucesso!');
      handleCloseForm();
    },
    onError: (error) => {
      console.error('Error creating contact:', error);
      toast.error('Erro ao cadastrar contato');
    },
  });

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ContactFormData }) => {
      const { error } = await supabase
        .from('contacts')
        .update({
          full_name: data.full_name,
          device_name: data.device_name || null,
          email: data.email || null,
          phone: data.phone,
          contact_type: data.contact_types[0] || 'other',
          contact_types: data.contact_types,
          notes: data.notes || null,
          guardian_id: data.guardian_id,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contato atualizado com sucesso!');
      handleCloseForm();
    },
    onError: (error) => {
      console.error('Error updating contact:', error);
      toast.error('Erro ao atualizar contato');
    },
  });

  // Bulk import mutation
  const bulkImportMutation = useMutation({
    mutationFn: async (dataList: ContactFormData[]) => {
      const records = dataList.map(data => ({
        school_id: profile!.school_id!,
        full_name: data.full_name,
        email: data.email || null,
        phone: data.phone,
        contact_type: data.contact_types[0] || 'other',
        contact_types: data.contact_types || ['other'],
        notes: data.notes || null,
      }));

      const { error } = await supabase
        .from('contacts')
        .insert(records);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success(`${importData.length} contatos importados com sucesso!`);
      setIsImportOpen(false);
      setImportData([]);
    },
    onError: (error) => {
      console.error('Error importing contacts:', error);
      toast.error('Erro ao importar contatos');
    },
  });

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingContact(null);
    setFormData({
      full_name: '',
      device_name: '',
      email: '',
      phone: '',
      contact_types: ['other'],
      notes: '',
      guardian_id: null,
    });
  };

  const handleOpenEdit = (contact: ContactRecord) => {
    setEditingContact(contact);
    setFormData({
      full_name: contact.full_name,
      device_name: contact.device_name || '',
      email: contact.email || '',
      phone: contact.phone,
      contact_types: contact.contact_types || [contact.contact_type || 'other'],
      notes: contact.notes || '',
      guardian_id: contact.guardian_id,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Telefone é obrigatório');
      return;
    }

    if (editingContact) {
      updateContactMutation.mutate({ id: editingContact.id, data: formData });
    } else {
      createContactMutation.mutate(formData);
    }
  };

  // Open contact from URL param
  useEffect(() => {
    const contactId = searchParams.get('contactId');
    if (contactId && contacts.length > 0) {
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        handleOpenEdit(contact);
        // Clear the search param after opening
        setSearchParams({});
      }
    }
  }, [contacts, searchParams]);

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

        const parsedData: ContactFormData[] = jsonData.map(row => {
          const typeValue = row['Tipo'] || row['tipo'] || row['contact_type'] || 'other';
          return {
            full_name: row['Nome'] || row['nome'] || row['full_name'] || '',
            device_name: row['Nome no Aparelho'] || row['device_name'] || '',
            email: row['Email'] || row['email'] || row['E-mail'] || '',
            phone: row['Telefone'] || row['telefone'] || row['phone'] || row['Celular'] || '',
            contact_types: [typeValue],
            notes: row['Observações'] || row['observacoes'] || row['notes'] || '',
            guardian_id: null,
          };
        }).filter(row => row.full_name && row.phone);

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
      { Nome: 'Maria Silva', Email: 'maria@email.com', Telefone: '5511999991111', Tipo: 'lead', Observações: 'Interessada em matrícula' },
      { Nome: 'José Santos', Email: 'jose@email.com', Telefone: '5511999992222', Tipo: 'supplier', Observações: 'Fornecedor de materiais' },
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contatos');
    XLSX.writeFile(workbook, 'modelo_contatos.xlsx');
    toast.success('Modelo baixado com sucesso!');
  };

  const handleConfirmImport = () => {
    if (importData.length === 0) {
      toast.error('Nenhum dado para importar');
      return;
    }
    bulkImportMutation.mutate(importData);
  };

  // Send message - navigate to messages with this contact
  const handleSendMessage = async (contact: ContactRecord) => {
    // Check if conversation already exists for this contact
    const { data: existingConversation } = await supabase
      .from('whatsapp_conversations')
      .select('id')
      .eq('contact_id', contact.id)
      .eq('school_id', profile!.school_id!)
      .maybeSingle();

    if (existingConversation) {
      // Navigate to existing conversation
      navigate(`/app/mensagens?conversation=${existingConversation.id}`);
    } else {
      // Create new conversation
      const { data: newConversation, error } = await supabase
        .from('whatsapp_conversations')
        .insert({
          school_id: profile!.school_id!,
          phone: contact.phone,
          contact_id: contact.id,
          contact_name: contact.full_name,
          status: 'active',
          ticket_status: 'open',
        })
        .select('id')
        .single();

      if (error) {
        toast.error('Erro ao iniciar conversa');
        console.error('Error creating conversation:', error);
        return;
      }

      navigate(`/app/mensagens?conversation=${newConversation.id}`);
    }
  };

  // View history
  const handleViewHistory = (contact: ContactRecord) => {
    setSelectedContactHistory(contact);
    setIsHistoryOpen(true);
  };

  // Convert to guardian
  const handleConvertToGuardian = (contact: ContactRecord) => {
    setSelectedContactConvert(contact);
    setIsConvertOpen(true);
  };

  // Link students to existing guardian
  const handleLinkStudents = (contact: ContactRecord) => {
    setSelectedContactLink(contact);
    setIsLinkStudentsOpen(true);
  };

  // Fetch conversation history for selected contact
  const { data: contactConversations = [] } = useQuery({
    queryKey: ['contact-conversations', selectedContactHistory?.id],
    queryFn: async () => {
      if (!selectedContactHistory) return [];
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*, whatsapp_messages(id, body, created_at, direction)')
        .eq('contact_id', selectedContactHistory.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedContactHistory,
  });

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      contact.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone?.includes(searchQuery);
    
    const matchesType = filterType === 'all' || contact.contact_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const contactsByType = contacts.reduce((acc, contact) => {
    acc[contact.contact_type] = (acc[contact.contact_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contatos"
        description="Gerencie todos os contatos da escola"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar Excel
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Contato
          </Button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium">Total de Contatos</span>
            <Contact className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contacts.length}</div>
            <p className="text-xs text-muted-foreground">Cadastrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium">Leads</span>
            <Contact className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {contactsByType['lead'] || 0}
            </div>
            <p className="text-xs text-muted-foreground">Potenciais clientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium">Responsáveis</span>
            <Contact className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {contactsByType['guardian'] || 0}
            </div>
            <p className="text-xs text-muted-foreground">Vinculados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium">Fornecedores</span>
            <Contact className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {contactsByType['supplier'] || 0}
            </div>
            <p className="text-xs text-muted-foreground">Parceiros</p>
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
                placeholder="Buscar contato..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filtrar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="guardian">Responsável</SelectItem>
                <SelectItem value="student">Aluno</SelectItem>
                <SelectItem value="staff">Funcionário</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum contato encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <MultiSelectTableHeader
                      selectedIds={selectedIds}
                      onSelectionChange={setSelectedIds}
                      allIds={filteredContacts.map(c => c.id)}
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Nome no Aparelho</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id} className={`table-row-interactive ${selectedIds.includes(contact.id) ? 'bg-muted/50' : ''}`}>
                    <TableCell>
                      <MultiSelectTableCell
                        id={contact.id}
                        selectedIds={selectedIds}
                        onSelectionChange={setSelectedIds}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {contact.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium">{contact.full_name}</span>
                          {contact.notes && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{contact.notes}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {contact.device_name || '-'}
                      </span>
                    </TableCell>
                    <TableCell>{contact.phone}</TableCell>
                    <TableCell>
                      {contact.guardian_id ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          {guardians.find(g => g.id === contact.guardian_id)?.full_name || 'Vinculado'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {contactTypeLabels[contact.contact_type] || contact.contact_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(contact)}>
                            Editar contato
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendMessage(contact)}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Enviar mensagem
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewHistory(contact)}>
                            <History className="mr-2 h-4 w-4" />
                            Ver histórico
                          </DropdownMenuItem>
                          {contact.contact_type !== 'guardian' && !contact.guardian_id && (
                            <DropdownMenuItem onClick={() => handleConvertToGuardian(contact)}>
                              <Users className="mr-2 h-4 w-4" />
                              Converter em Responsável
                            </DropdownMenuItem>
                          )}
                          {(contact.contact_type === 'guardian' || contact.guardian_id) && (
                            <DropdownMenuItem onClick={() => handleLinkStudents(contact)}>
                              <GraduationCap className="mr-2 h-4 w-4" />
                              Vincular Alunos
                            </DropdownMenuItem>
                          )}
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
              {editingContact ? 'Editar Contato' : 'Novo Contato'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do contato
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="device_name">Nome no Aparelho</Label>
                <Input
                  id="device_name"
                  value={formData.device_name}
                  onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                  placeholder="Nome salvo no celular"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="5511999999999"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_type">Tipo</Label>
                <Select
                  value={formData.contact_types[0] || 'other'}
                  onValueChange={(value) => setFormData({ ...formData, contact_types: [value] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="guardian">Responsável</SelectItem>
                    <SelectItem value="student">Aluno</SelectItem>
                    <SelectItem value="staff">Funcionário</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                <Label htmlFor="guardian_id">Vincular a Responsável</Label>
                <Select
                  value={formData.guardian_id || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, guardian_id: value === 'none' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {guardians.map((guardian) => (
                      <SelectItem key={guardian.id} value={guardian.id}>
                        {guardian.full_name} {guardian.relationship ? `(${guardian.relationship})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Anotações sobre o contato..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createContactMutation.isPending || updateContactMutation.isPending}
              >
                {editingContact ? 'Salvar' : 'Cadastrar'}
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
            <DialogTitle>Importar Contatos</DialogTitle>
            <DialogDescription>
              Faça upload de um arquivo Excel (.xlsx) com os dados dos contatos
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
                id="excel-upload-contacts"
              />
              <label
                htmlFor="excel-upload-contacts"
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
                        <TableHead>Telefone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Tipo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importData.slice(0, 10).map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>{row.full_name}</TableCell>
                          <TableCell>{row.phone}</TableCell>
                          <TableCell>{row.email || '-'}</TableCell>
                          <TableCell>{contactTypeLabels[row.contact_types[0]] || row.contact_types[0]}</TableCell>
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

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Conversas
            </DialogTitle>
            <DialogDescription>
              {selectedContactHistory?.full_name} - {selectedContactHistory?.phone}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {contactConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma conversa encontrada para este contato
              </div>
            ) : (
              contactConversations.map((conversation: any) => (
                <Card key={conversation.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => {
                  setIsHistoryOpen(false);
                  navigate(`/app/mensagens?conversation=${conversation.id}`);
                }}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <Badge variant={conversation.ticket_status === 'open' ? 'default' : conversation.ticket_status === 'pending' ? 'secondary' : 'outline'}>
                          {conversation.ticket_status === 'open' ? 'Aberto' : conversation.ticket_status === 'pending' ? 'Pendente' : 'Resolvido'}
                        </Badge>
                        {conversation.sector_id && (
                          <Badge variant="outline" className="ml-2">Setor vinculado</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(conversation.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {conversation.whatsapp_messages?.length || 0} mensagens
                    </div>
                    {conversation.resolution_summary && (
                      <p className="text-sm mt-2 text-muted-foreground line-clamp-2">
                        <span className="font-medium">Resumo:</span> {conversation.resolution_summary}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Multi-select Action Bar */}
      <MultiSelectActionBar
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onSendMessage={() => {
          toast.info(`Enviar mensagem para ${selectedIds.length} contato(s)`);
        }}
        onBulkDelete={async () => {
          const count = selectedIds.length;
          try {
            // First, unlink conversations referencing these contacts
            await supabase
              .from('whatsapp_conversations')
              .update({ contact_id: null })
              .in('contact_id', selectedIds);
            
            // Then delete the contacts
            const { error } = await supabase
              .from('contacts')
              .delete()
              .in('id', selectedIds);
            
            if (error) throw error;
            
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['whatsapp_conversations'] });
            setSelectedIds([]);
            toast.success(`${count} contato(s) removido(s) com sucesso!`);
          } catch (error) {
            console.error('Error deleting contacts:', error);
            toast.error('Erro ao excluir contatos');
          }
        }}
        itemLabel="contatos"
      />

      {/* Convert to Guardian Modal */}
      <ConvertToGuardianModal
        open={isConvertOpen}
        onOpenChange={setIsConvertOpen}
        contact={selectedContactConvert}
        onSuccess={() => setSelectedContactConvert(null)}
      />

      {/* Link Students Modal */}
      <LinkStudentsModal
        open={isLinkStudentsOpen}
        onOpenChange={setIsLinkStudentsOpen}
        contact={selectedContactLink}
        onSuccess={() => setSelectedContactLink(null)}
      />
    </div>
  );
};

export default Contatos;
