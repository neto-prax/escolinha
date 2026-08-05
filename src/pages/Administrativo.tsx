import { useState } from 'react';
import { EmployeeHistoryDialog } from '@/components/administrativo/EmployeeHistoryDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Briefcase, Users, FileText, Settings, Plus, Search, MoreHorizontal, Clock, Calendar, Loader2 } from 'lucide-react';
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

const mockContracts = [
  { id: '1', title: 'Contrato de Matrícula 2026', type: 'Educacional', total: 324, signed: 280, pending: 44, status: 'active' },
  { id: '2', title: 'Fornecimento de Alimentação', type: 'Serviço', vendor: 'Nutrilar LTDA', value: 'R$ 15.000/mês', expires: '2026-12-31', status: 'active' },
  { id: '3', title: 'Manutenção Predial', type: 'Serviço', vendor: 'ManutençãoJá', value: 'R$ 3.500/mês', expires: '2026-06-30', status: 'active' },
  { id: '4', title: 'Sistema de Gestão', type: 'Software', vendor: 'Interagir ERP', value: 'R$ 499/mês', expires: '2027-01-01', status: 'active' },
];

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
  const [contracts] = useState(mockContracts);
  const [activeTab, setActiveTab] = useState('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedEmployeeHistory, setSelectedEmployeeHistory] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(false);

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
      <div className="grid gap-4 md:grid-cols-4">
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Contratos Ativos</CardTitle>
            <FileText className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{contracts.length}</div>
            <p className="text-xs text-muted-foreground">Com fornecedores</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Matrículas Assinadas</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">280/324</div>
            <p className="text-xs text-muted-foreground">86% do total</p>
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
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Contratos
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar funcionário..."
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

        <TabsContent value="contracts" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {contracts.map((contract) => (
              <Card key={contract.id} className="card-interactive">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{contract.type}</Badge>
                    <Badge variant="secondary" className="badge-success">Ativo</Badge>
                  </div>
                  <CardTitle className="text-base mt-2">{contract.title}</CardTitle>
                  <CardDescription>
                    {contract.vendor && `Fornecedor: ${contract.vendor}`}
                    {contract.total && `Total: ${contract.total} contratos`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {contract.value && (
                      <p><span className="text-muted-foreground">Valor:</span> {contract.value}</p>
                    )}
                    {contract.expires && (
                      <p><span className="text-muted-foreground">Vencimento:</span> {new Date(contract.expires).toLocaleDateString('pt-BR')}</p>
                    )}
                    {contract.signed !== undefined && (
                      <div className="pt-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Assinados</span>
                          <span>{contract.signed}/{contract.total}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${(contract.signed / (contract.total || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <Button className="w-full mt-4" variant="outline">Ver Detalhes</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Settings, title: 'Dados da Escola', desc: 'Nome, endereço, CNPJ' },
              { icon: Users, title: 'Cargos e Funções', desc: 'Gerenciar cargos' },
              { icon: Calendar, title: 'Calendário Escolar', desc: 'Feriados e eventos' },
            ].map((item) => (
              <Card key={item.title} className="card-interactive">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">Configurar</Button>
                </CardContent>
              </Card>
            ))}
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
    </div>
  );
};

export default Administrativo;
