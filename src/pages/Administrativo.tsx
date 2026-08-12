import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { EmployeeHistoryDialog } from '@/components/administrativo/EmployeeHistoryDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, Users, FileText, Settings, Plus, Search, MoreHorizontal, Clock, Calendar, Loader2, Download, Upload, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { mockEmployees } from '@/data/mockData';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Mock data

// Mock data

const employeeSchema = z.object({
  name: z.string().min(3, 'Nome é obrigatório'),
  role: z.string().min(1, 'Cargo é obrigatório'),
  department: z.string().min(1, 'Departamento é obrigatório'),
  phone: z.string().min(10, 'Telefone é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  hire_date: z.string().min(1, 'Data de admissão é obrigatória'),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

const Administrativo = () => {
  const [employees, setEmployees] = useState(mockEmployees);
  const [activeTab, setActiveTab] = useState('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedEmployeeHistory, setSelectedEmployeeHistory] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataToExport = employees.map(e => ({
      Nome: e.name,
      Cargo: e.role,
      Departamento: e.department,
      Telefone: e.phone,
      Email: e.email || '',
      'Data de Admissão': e.hire_date,
      Status: e.status === 'active' ? 'Ativo' : e.status === 'vacation' ? 'Férias' : 'Afastado'
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Funcionarios");
    XLSX.writeFile(workbook, "funcionarios.xlsx");
    toast.success("Planilha exportada com sucesso!");
  };

  const handleDownloadTemplate = () => {
    const templateData = [{
      Nome: 'João da Silva',
      Cargo: 'Professor(a)',
      Departamento: 'Pedagógico',
      Telefone: '(11) 99999-9999',
      Email: 'joao@escola.com',
      'Data de Admissão': '2024-01-15'
    }];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo");
    XLSX.writeFile(workbook, "modelo_funcionarios.xlsx");
    toast.success("Modelo baixado com sucesso!");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        const novosFuncionarios = data.map(row => ({
          id: String(Date.now() + Math.random()),
          name: row.Nome,
          role: row.Cargo || 'Auxiliar',
          department: row.Departamento || 'Administrativo',
          phone: String(row.Telefone || ''),
          email: String(row.Email || ''),
          status: 'active',
          hire_date: String(row['Data de Admissão'] || new Date().toISOString().split('T')[0]),
        }));

        setEmployees(prev => [...prev, ...novosFuncionarios]);
        toast.success(`${novosFuncionarios.length} funcionários importados com sucesso!`);
      } catch (error) {
        console.error(error);
        toast.error("Erro ao importar planilha. Verifique o formato.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const [isDadosEscolaOpen, setIsDadosEscolaOpen] = useState(false);
  const [isCargosOpen, setIsCargosOpen] = useState(false);
  const [isRelatoriosOpen, setIsRelatoriosOpen] = useState(false);

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: '',
      role: '',
      department: '',
      phone: '',
      email: '',
      hire_date: '',
    },
  });

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateEmployee = async (data: EmployeeFormData) => {
    setIsLoading(true);
    try {
      const newEmployee = {
        id: String(Date.now()),
        name: data.name,
        role: data.role,
        department: data.department,
        phone: data.phone,
        status: 'active',
        hire_date: data.hire_date,
      };
      setEmployees([...employees, newEmployee]);
      form.reset();
      setIsEmployeeFormOpen(false);
      toast.success('Funcionário cadastrado com sucesso!');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="secondary" className="badge-success">Ativo</Badge>;
      case 'vacation':
        return <Badge variant="outline" className="border-primary text-primary"><Calendar className="mr-1 h-3 w-3" />Férias</Badge>;
      case 'leave':
        return <Badge variant="outline" className="border-warning text-warning"><Clock className="mr-1 h-3 w-3" />Afastado</Badge>;
      default:
        return null;
    }
  };

  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const onVacation = employees.filter(e => e.status === 'vacation').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Administrativo" description="Gestão administrativa da escola">
        <Button onClick={() => setIsEmployeeFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Funcionário
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Funcionários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">{activeEmployees} ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Em Férias</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{onVacation}</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Funcionários
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar funcionário..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    ref={fileInputRef} 
                    onChange={handleImport} 
                    className="hidden" 
                  />
                  <Button 
                    variant="outline"
                    onClick={handleDownloadTemplate}
                    title="Baixar planilha de exemplo para importação"
                    className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    Modelo
                  </Button>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar
                  </Button>
                  <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Admissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id} className="table-row-interactive">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {employee.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{employee.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{employee.role}</TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>{employee.phone}</TableCell>
                      <TableCell>{new Date(employee.hire_date).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{getStatusBadge(employee.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Ver ficha</DropdownMenuItem>
                            <DropdownMenuItem>Editar</DropdownMenuItem>
                            <DropdownMenuItem>Registrar férias</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedEmployeeHistory(employee);
                              setIsHistoryOpen(true);
                            }}>
                              Histórico
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Desligar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="card-interactive">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <Settings className="h-6 w-6" />
                </div>
                <CardTitle>Dados da Escola</CardTitle>
                <CardDescription>Nome, endereço, CNPJ</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" onClick={() => setIsDadosEscolaOpen(true)}>Configurar</Button>
              </CardContent>
            </Card>

            <Card className="card-interactive">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <Users className="h-6 w-6" />
                </div>
                <CardTitle>Cargos e Funções</CardTitle>
                <CardDescription>Gerenciar cargos</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" onClick={() => setIsCargosOpen(true)}>Configurar</Button>
              </CardContent>
            </Card>

            <Card className="card-interactive">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <FileText className="h-6 w-6" />
                </div>
                <CardTitle>Responsáveis por Relatórios</CardTitle>
                <CardDescription>Gerenciar quem recebe os relatórios</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" onClick={() => setIsRelatoriosOpen(true)}>Configurar</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      {/* Employee Form Dialog */}
      <Dialog open={isEmployeeFormOpen} onOpenChange={setIsEmployeeFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Funcionário</DialogTitle>
            <DialogDescription>Cadastre um novo colaborador</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateEmployee)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do funcionário" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Professor(a)">Professor(a)</SelectItem>
                          <SelectItem value="Coordenador(a)">Coordenador(a)</SelectItem>
                          <SelectItem value="Secretário(a)">Secretário(a)</SelectItem>
                          <SelectItem value="Auxiliar">Auxiliar</SelectItem>
                          <SelectItem value="Porteiro">Porteiro</SelectItem>
                          <SelectItem value="Serviços Gerais">Serviços Gerais</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Pedagógico">Pedagógico</SelectItem>
                          <SelectItem value="Administrativo">Administrativo</SelectItem>
                          <SelectItem value="Financeiro">Financeiro</SelectItem>
                          <SelectItem value="Serviços Gerais">Serviços Gerais</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone *</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hire_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Admissão *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsEmployeeFormOpen(false)} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cadastrar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <EmployeeHistoryDialog 
        employee={selectedEmployeeHistory} 
        isOpen={isHistoryOpen} 
        onOpenChange={setIsHistoryOpen} 
      />

      {/* Dialogs de Configurações */}
      <Dialog open={isDadosEscolaOpen} onOpenChange={setIsDadosEscolaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dados da Escola</DialogTitle>
            <DialogDescription>Atualize os dados cadastrais da escola</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Instituição</label>
              <Input placeholder="Colégio Interagir" defaultValue="Colégio Interagir - Unidade Papagaio" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">CNPJ</label>
              <Input placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Endereço</label>
              <Input placeholder="Rua, Número, Bairro" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDadosEscolaOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              toast.success("Dados da escola salvos com sucesso!");
              setIsDadosEscolaOpen(false);
            }}>Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCargosOpen} onOpenChange={setIsCargosOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cargos e Funções</DialogTitle>
            <DialogDescription>Gerencie os cargos disponíveis no sistema</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input placeholder="Novo cargo..." />
              <Button>Adicionar</Button>
            </div>
            <div className="border rounded-md p-4 space-y-2">
              <div className="flex justify-between items-center"><span className="text-sm">Professor(a)</span> <Badge variant="secondary">15 vinculados</Badge></div>
              <div className="flex justify-between items-center"><span className="text-sm">Coordenador(a)</span> <Badge variant="secondary">3 vinculados</Badge></div>
              <div className="flex justify-between items-center"><span className="text-sm">Secretário(a)</span> <Badge variant="secondary">2 vinculados</Badge></div>
              <div className="flex justify-between items-center"><span className="text-sm">Auxiliar</span> <Badge variant="secondary">5 vinculados</Badge></div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setIsCargosOpen(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRelatoriosOpen} onOpenChange={setIsRelatoriosOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Responsáveis por Relatórios</DialogTitle>
            <DialogDescription>Adicione as pessoas que irão receber os relatórios do sistema</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mensagem Padrão do Relatório</label>
              <Textarea 
                placeholder="Digite a mensagem que acompanhará o relatório..."
                defaultValue="Olá! Segue em anexo o relatório financeiro e administrativo atualizado da nossa unidade."
                className="min-h-[80px]"
              />
            </div>
            
            <div className="pt-2">
              <label className="text-sm font-medium">Adicionar Responsável</label>
              <div className="flex gap-2 mt-2">
                <Input placeholder="Nome" className="flex-1" />
                <Input placeholder="WhatsApp" className="flex-1" />
                <Button>Adicionar</Button>
              </div>
            </div>
            
            <div className="border rounded-md p-4 space-y-3 mt-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Direção Escolar</p>
                  <p className="text-xs text-muted-foreground">(11) 99999-9999</p>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive">Remover</Button>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Coordenação</p>
                  <p className="text-xs text-muted-foreground">(11) 98888-8888</p>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive">Remover</Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-2 gap-2">
            <Button variant="outline" onClick={() => setIsRelatoriosOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              toast.success("Configurações de relatórios salvas!");
              setIsRelatoriosOpen(false);
            }}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Administrativo;
