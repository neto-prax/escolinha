import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { EmployeeHistoryDialog } from '@/components/administrativo/EmployeeHistoryDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
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
import { Briefcase, Users, FileText, Plus, Search, MoreHorizontal, Clock, Calendar, Loader2, Download, Upload, FileDown, LayoutGrid, List, Bot, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { supabase } from '@/integrations/supabase/client';

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

import { OrdensServicoTab } from '@/components/administrativo/OrdensServicoTab';

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
  const { profile } = useAuth();
  const [employees, setEmployees] = useLocalStorage<any[]>('escolinha_employees_v2', mockEmployees.map(emp => ({
    ...emp,
    ocorrencias: []
  })));
  const [activeTab, setActiveTab] = useState('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);
  const [isOcorrenciaFormOpen, setIsOcorrenciaFormOpen] = useState(false);
  const [selectedEmpForOcorrencia, setSelectedEmpForOcorrencia] = useState('');

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


  const [isCargosOpen, setIsCargosOpen] = useState(false);
  const [isRelatoriosOpen, setIsRelatoriosOpen] = useState(false);

  const [realFinancialData, setRealFinancialData] = useState<any>(null);

  useEffect(() => {
    if (isRelatoriosOpen && profile?.school_id && !realFinancialData) {
      const fetchData = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('daily-financial-report', {
            body: { action: 'public-data', schoolId: profile.school_id, date: new Date().toISOString().split('T')[0] }
          });
          // Verificar se a função atualizada já foi feito deploy (se ela retorna receivedToday)
          if (!error && data && !data.error && data.receivedToday !== undefined) {
            setRealFinancialData(data);
          } else {
            // Fallback temporário caso a edge function não esteja atualizada no servidor
            setRealFinancialData({
              schoolName: 'Colégio Interagir',
              label: new Date().toLocaleDateString('pt-BR'),
              receivedToday: 0,
              dueToday: { sum: 0, count: 0 },
              overdue: { sum: 0, count: 0 },
              receivedMonth: 0,
              openMonth: 0
            });
          }
        } catch (err) {
          console.error(err);
        }
      };
      fetchData();
    }
  }, [isRelatoriosOpen, profile?.school_id]);

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
        ocorrencias: []
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

  const handleToggleVacation = (id: string, currentStatus: string) => {
    setEmployees(employees.map(emp => {
      if (emp.id === id) {
        return {
          ...emp,
          status: currentStatus === 'vacation' ? 'active' : 'vacation'
        };
      }
      return emp;
    }));
    if (currentStatus === 'vacation') {
      toast.success('Férias retiradas com sucesso! Colaborador está ativo.');
    } else {
      toast.success('Férias registradas com sucesso!');
    }
  };

  const handleToggleLeave = (id: string, currentStatus: string) => {
    setEmployees(employees.map(emp => {
      if (emp.id === id) {
        const newStatus = currentStatus === 'leave' ? 'active' : 'leave';
        const novasOcorrencias = [...(emp.ocorrencias || [])];
        
        if (newStatus === 'leave') {
          novasOcorrencias.unshift({
            id: crypto.randomUUID(),
            data: new Date().toISOString().split('T')[0],
            tipo: 'Outros',
            descricao: 'Início de licença',
            gravidade: 'info'
          });
        }

        return {
          ...emp,
          status: newStatus,
          ocorrencias: novasOcorrencias
        };
      }
      return emp;
    }));
    if (currentStatus === 'leave') {
      toast.success('Licença encerrada! Colaborador está ativo.');
    } else {
      toast.success('Licença registrada com sucesso!');
    }
  };

  const handleDemitir = (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja desligar/demitir o colaborador ${name}?`)) {
      setEmployees(employees.filter(emp => emp.id !== id));
      toast.success('Colaborador desligado com sucesso.');
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsOcorrenciaFormOpen(true)}>
            <FileText className="mr-2 h-4 w-4" />
            Nova Ocorrência
          </Button>
          <Button onClick={() => setIsEmployeeFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Colaborador
          </Button>
        </div>
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

          <TabsTrigger value="os" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Ordens de Serviço
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
                <div className="flex gap-2 overflow-x-auto pb-1 items-center">
                  <div className="flex border rounded-md mr-2 bg-background">
                    <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className="h-9 w-9 rounded-r-none">
                      <List className="h-4 w-4" />
                    </Button>
                    <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className="h-9 w-9 rounded-l-none border-l">
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>
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
              {viewMode === 'list' ? (
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
                              <DropdownMenuItem onClick={() => handleToggleVacation(employee.id, employee.status)}>
                                {employee.status === 'vacation' ? 'Retirar férias' : 'Registrar férias'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleLeave(employee.id, employee.status)}>
                                {employee.status === 'leave' ? 'Retirar licença' : 'Registrar licença'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedEmployeeHistory(employee);
                                setIsHistoryOpen(true);
                              }}>
                                Histórico
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                onClick={() => handleDemitir(employee.id, employee.name)}
                              >
                                Desligar (Demitir)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredEmployees.map(employee => (
                    <Card key={employee.id} className="card-interactive overflow-hidden">
                      <CardHeader className="p-4 pb-2 text-center">
                        <div className="flex justify-end mb-[-2rem] relative z-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Ver ficha</DropdownMenuItem>
                              <DropdownMenuItem>Editar</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleVacation(employee.id, employee.status)}>
                                {employee.status === 'vacation' ? 'Retirar férias' : 'Registrar férias'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleLeave(employee.id, employee.status)}>
                                {employee.status === 'leave' ? 'Retirar licença' : 'Registrar licença'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedEmployeeHistory(employee);
                                setIsHistoryOpen(true);
                              }}>
                                Histórico
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                onClick={() => handleDemitir(employee.id, employee.name)}
                              >
                                Desligar (Demitir)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <Avatar className="h-16 w-16 mx-auto mb-2 border-2 border-primary/10">
                          <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
                            {employee.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-base truncate">{employee.name}</CardTitle>
                        <CardDescription className="text-xs truncate">{employee.role}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 text-sm space-y-2">
                        <div className="flex justify-between items-center text-muted-foreground border-b pb-1 border-border/50">
                          <span>Departamento:</span>
                          <span className="font-medium text-foreground truncate ml-2">{employee.department}</span>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground border-b pb-1 border-border/50">
                          <span>Telefone:</span>
                          <span className="font-medium text-foreground ml-2">{employee.phone}</span>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground pt-1">
                          <span>Status:</span>
                          <span>{getStatusBadge(employee.status)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      Nenhum colaborador encontrado.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Tabs defaultValue="geral">
            <TabsList className="mb-4">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="turmas">Turmas e Classes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="geral">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="card-interactive">
                  <CardHeader>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                      <FileText className="h-6 w-6" />
                    </div>
                    <CardTitle>Relatório Diário</CardTitle>
                    <CardDescription>Gerenciar configurações do relatório diário</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      <Button 
                        className="w-full" 
                        variant="default" 
                        onClick={handleSendRelatorio}
                        disabled={isLoading}
                      >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enviar Agora
                      </Button>
                      <Button className="w-full" variant="outline" onClick={() => setIsRelatoriosOpen(true)}>Configurar</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-interactive">
                  <CardHeader>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                      <Users className="h-6 w-6" />
                    </div>
                    <CardTitle>Setores</CardTitle>
                    <CardDescription>Gerenciar os setores da instituição</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="outline" onClick={() => setIsCargosOpen(true)}>Configurar</Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="turmas">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Turmas e Classes</CardTitle>
                    <CardDescription>Gerencie as turmas disponíveis para marcação de lançamentos no sistema</CardDescription>
                  </div>
                  <Button 
                    variant={sortAlphabetically ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortAlphabetically(!sortAlphabetically)}
                    title="Ordenar de A a Z"
                  >
                    A-Z
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6 max-w-lg">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <Select value={selectedSetor} onValueChange={setSelectedSetor}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o setor" />
                          </SelectTrigger>
                          <SelectContent>
                            {setoresOpcoes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Nova classe... Ex: Sub-20" 
                            value={novaTurma}
                            onChange={(e) => setNovaTurma(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddTurma();
                            }}
                            className="flex-1"
                          />
                          <Input
                            placeholder="Valor Padrão (R$)"
                            type="number"
                            min="0"
                            step="0.01"
                            value={novoValorPadrao}
                            onChange={(e) => setNovoValorPadrao(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddTurma();
                            }}
                            className="w-32"
                          />
                          <Button onClick={handleAddTurma}>Adicionar</Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <span className="text-sm font-medium text-muted-foreground">Turmas associadas a esta classe (letras):</span>
                        <div className="flex flex-wrap gap-2">
                          {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'].map(letter => (
                            <label 
                              key={letter} 
                              className={`flex items-center justify-center w-8 h-8 rounded border cursor-pointer select-none transition-colors ${
                                selectedLetters.includes(letter) 
                                  ? 'bg-primary text-primary-foreground border-primary' 
                                  : 'bg-background hover:bg-muted'
                              }`}
                            >
                              <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={selectedLetters.includes(letter)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedLetters([...selectedLetters, letter]);
                                  else setSelectedLetters(selectedLetters.filter(l => l !== letter));
                                }}
                              />
                              <span className="text-sm font-medium">{letter}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="border rounded-md p-4 space-y-4">
                      {setoresOpcoes.map(setor => {
                        let turmasDoSetor = turmas.filter(t => t.setor === setor);
                        if (sortAlphabetically) {
                          turmasDoSetor = [...turmasDoSetor].sort((a, b) => a.nome.localeCompare(b.nome));
                        }
                        if (turmasDoSetor.length === 0) return null;
                        
                        return (
                          <div key={setor} className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{setor}</h4>
                            <div className="space-y-3">
                              {turmasDoSetor.map((turma, i) => {
                                const isEditing = editingTurmaId === `${setor}-${turma.nome}`;
                                return (
                                <div key={`${setor}-${turma.nome}-${i}`} className="flex flex-col gap-2 bg-muted/30 p-3 rounded border border-muted">
                                  <div className="flex justify-between items-center gap-2">
                                    {isEditing ? (
                                      <div className="flex items-center gap-2 flex-1">
                                        <Input 
                                          defaultValue={turma.nome}
                                          id={`edit-nome-${setor}-${turma.nome}`}
                                          className="h-8 text-sm font-bold text-primary flex-1"
                                          placeholder="Nome da Classe"
                                        />
                                        <Button 
                                          size="sm" 
                                          className="h-8 px-2"
                                          onClick={() => {
                                            const nomeInput = document.getElementById(`edit-nome-${setor}-${turma.nome}`) as HTMLInputElement;
                                            const letrasInput = document.getElementById(`edit-letras-${setor}-${turma.nome}`) as HTMLInputElement;
                                            const valorPadraoInput = document.getElementById(`edit-valor-${setor}-${turma.nome}`) as HTMLInputElement;
                                            const newName = nomeInput?.value.trim() || turma.nome;
                                            const newLetras = letrasInput?.value.split(',').map(l => l.trim()).filter(Boolean).sort() || turma.letras;
                                            const newValorPadrao = valorPadraoInput?.value ? parseFloat(valorPadraoInput.value) : undefined;
                                            
                                            setTurmas(turmas.map(t => {
                                              if (t.nome === turma.nome && t.setor === setor) {
                                                return { ...t, nome: newName, letras: newLetras, valorPadrao: newValorPadrao };
                                              }
                                              return t;
                                            }));
                                            if (newName !== turma.nome) {
                                              setAlunos(alunos.map(a => {
                                                if (a.classe === turma.nome && a.setor === setor) {
                                                  return { ...a, classe: newName };
                                                }
                                                return a;
                                              }));
                                            }
                                            setEditingTurmaId(null);
                                          }}
                                        >
                                          Salvar
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" onClick={() => setEditingTurmaId(null)}>
                                          Cancelar
                                        </Button>
                                      </div>
                                    ) : (
                                      <>
                                        <span className="text-sm font-bold text-primary flex-1">{turma.nome}</span> 
                                        <div className="flex items-center gap-1">
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingTurmaId(`${setor}-${turma.nome}`)} title="Editar classe">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                          </Button>
                                          <Select value={turma.setor} onValueChange={(newSetor) => {
                                            setTurmas(turmas.map(t => {
                                              if (t.nome === turma.nome && t.setor === setor) {
                                                return { ...t, setor: newSetor };
                                              }
                                              return t;
                                            }));
                                            setAlunos(alunos.map(a => {
                                              if (a.classe === turma.nome && a.setor === setor) {
                                                return { ...a, setor: newSetor };
                                              }
                                              return a;
                                            }));
                                          }}>
                                            <SelectTrigger className="h-7 text-xs border-0 bg-transparent hover:bg-muted/50 w-32 px-1 shadow-none focus:ring-0" title="Mover para outro setor">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {setoresOpcoes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                            </SelectContent>
                                          </Select>
                                          <Button variant="ghost" size="sm" className="text-destructive h-7 w-7 p-0 hover:bg-destructive/10" onClick={() => {
                                            setTurmas(turmas.filter(t => !(t.nome === turma.nome && t.setor === setor)));
                                          }} title="Excluir classe">
                                            X
                                          </Button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  
                                  {isEditing ? (
                                    <div className="mt-1 border-t border-muted/50 pt-2 flex flex-col gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Turmas (letras):</span>
                                        <Input 
                                          defaultValue={turma.letras.join(', ')}
                                          id={`edit-letras-${setor}-${turma.nome}`}
                                          placeholder="Ex: A, B, C"
                                          className="h-7 text-xs bg-white dark:bg-slate-900 border-input px-2 flex-1"
                                        />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Valor Padrão (R$):</span>
                                        <Input 
                                          defaultValue={turma.valorPadrao || ''}
                                          id={`edit-valor-${setor}-${turma.nome}`}
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          placeholder="Ex: 500.00"
                                          className="h-7 text-xs bg-white dark:bg-slate-900 border-input px-2 w-32"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-1 mt-1 border-t border-muted/50 pt-2">
                                      {turma.valorPadrao !== undefined && (
                                        <span className="text-xs font-medium text-muted-foreground">Valor Padrão: {turma.valorPadrao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                      )}
                                      {turma.letras.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                          {turma.letras.map(l => (
                                            <span key={l} className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-medium shadow-sm">
                                              {turma.nome} {l}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      {turmas.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-4">Nenhuma classe cadastrada.</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
        
        <TabsContent value="os" className="mt-6">
          <OrdensServicoTab />
        </TabsContent>
      </Tabs>
      {/* Employee Form Dialog */}
      <Dialog open={isEmployeeFormOpen} onOpenChange={setIsEmployeeFormOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Novo Colaborador</DialogTitle>
            <DialogDescription>Cadastre um novo colaborador</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateEmployee)} className="flex flex-col md:flex-row gap-6 mt-2">
              
              {/* Coluna da Foto (Esquerda) - 3x4 */}
              <div className="flex flex-col items-center gap-3 w-full md:w-1/3">
                <div className="w-40 h-56 bg-muted border-2 border-dashed border-primary/20 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/80 transition-all relative overflow-hidden group shadow-sm">
                  <Users className="h-12 w-12 text-primary/40 group-hover:scale-110 transition-transform" />
                  <span className="text-xs text-primary/60 font-medium mt-3 uppercase tracking-wider">Foto 3x4</span>
                  
                  <input 
                    id="photo-upload" 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={() => toast.success("Foto selecionada!")} 
                  />
                </div>
                <label htmlFor="photo-upload" className="text-sm text-primary hover:underline font-medium cursor-pointer">
                  Adicionar Foto
                </label>
              </div>

              {/* Coluna do Formulário (Direita) */}
              <div className="flex-1 space-y-4">
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

                <div className="grid grid-cols-2 gap-4">
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
                </div>

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

                <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEmployeeFormOpen(false)} disabled={isLoading}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Cadastrar
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Ocorrencia Form Dialog */}
      <Dialog open={isOcorrenciaFormOpen} onOpenChange={setIsOcorrenciaFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Ocorrência</DialogTitle>
            <DialogDescription>Registre uma nova ocorrência para um colaborador</DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const tipo = formData.get('tipo') as string;
            const data = formData.get('data') as string;
            const descricao = formData.get('descricao') as string;

            if (!selectedEmpForOcorrencia) {
              toast.error('Selecione um colaborador.');
              return;
            }

            let gravidade = 'info';
            if (['Falta', 'Advertencia'].includes(tipo)) gravidade = 'warning';
            if (tipo === 'Elogio') gravidade = 'success';
            
            let displayTipo = tipo;
            if (tipo === 'Falta') displayTipo = 'Falta Injustificada';
            if (tipo === 'Advertencia') displayTipo = 'Advertência';

            setEmployees(employees.map(emp => {
              if (emp.id === selectedEmpForOcorrencia) {
                return {
                  ...emp,
                  ocorrencias: [{
                    id: crypto.randomUUID(),
                    data,
                    tipo: displayTipo,
                    descricao,
                    gravidade
                  }, ...(emp.ocorrencias || [])]
                };
              }
              return emp;
            }));

            setIsLoading(true);
            setTimeout(() => {
              toast.success('Ocorrência registrada com sucesso!');
              setIsLoading(false);
              setIsOcorrenciaFormOpen(false);
              setSelectedEmpForOcorrencia('');
            }, 500);
          }} className="space-y-4">
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Colaborador *</label>
              <Select required value={selectedEmpForOcorrencia} onValueChange={setSelectedEmpForOcorrencia}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Ocorrência *</label>
                <Select required name="tipo">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Atraso">Atraso</SelectItem>
                    <SelectItem value="Falta">Falta Injustificada</SelectItem>
                    <SelectItem value="Atestado">Atestado Médico</SelectItem>
                    <SelectItem value="Advertencia">Advertência</SelectItem>
                    <SelectItem value="Elogio">Elogio</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Data *</label>
                <Input type="date" name="data" required defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição da Ocorrência *</label>
              <Textarea 
                name="descricao"
                placeholder="Detalhes da ocorrência..." 
                className="min-h-[100px]" 
                required 
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsOcorrenciaFormOpen(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Ocorrência
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <EmployeeHistoryDialog 
        employee={selectedEmployeeHistory} 
        isOpen={isHistoryOpen} 
        onOpenChange={setIsHistoryOpen} 
        onAddOcorrencia={(empId, newOco) => {
          setEmployees(employees.map(emp => {
            if (emp.id === empId) {
              return { ...emp, ocorrencias: [newOco, ...(emp.ocorrencias || [])] };
            }
            return emp;
          }));
          if (selectedEmployeeHistory && selectedEmployeeHistory.id === empId) {
            setSelectedEmployeeHistory({
              ...selectedEmployeeHistory,
              ocorrencias: [newOco, ...(selectedEmployeeHistory.ocorrencias || [])]
            });
          }
        }}
      />


    </div>
  );
};

export default Administrativo;
