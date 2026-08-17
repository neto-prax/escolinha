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
import { Briefcase, Users, FileText, Settings, Plus, Search, MoreHorizontal, Clock, Calendar, Loader2, Download, Upload, FileDown, LayoutGrid, List, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { supabase } from '@/integrations/supabase/client';
import { TurmaConfig } from '@/types/finance';
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
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<any[]>(mockEmployees.map(emp => ({
    ...emp,
    ocorrencias: [
      { id: '1', data: '2026-07-15', tipo: 'Atestado Médico', descricao: 'Afastamento de 2 dias (Gripe)', gravidade: 'info' },
      { id: '2', data: '2026-05-20', tipo: 'Falta Injustificada', descricao: 'Não compareceu ao plantão', gravidade: 'warning' }
    ]
  })));
  const [activeTab, setActiveTab] = useState('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);
  const [isOcorrenciaFormOpen, setIsOcorrenciaFormOpen] = useState(false);
  const [selectedEmpForOcorrencia, setSelectedEmpForOcorrencia] = useState('');
  
  const defaultTurmas: TurmaConfig[] = [
    { setor: 'Educação Infantil', nome: 'Maternal', letras: ['A', 'B'] },
    { setor: 'Ensino Fundamental 1', nome: '1º Ano', letras: ['A', 'B'] },
    { setor: 'Ensino Fundamental 2', nome: '6º Ano', letras: ['A'] },
    { setor: 'Ensino Médio', nome: '1º Ano EM', letras: [] }
  ];
  
  const [turmas, setTurmas] = useLocalStorage<TurmaConfig[]>('escolinha_turmas_v3', defaultTurmas);
  const [novaTurma, setNovaTurma] = useState('');
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [selectedSetor, setSelectedSetor] = useState<string>('Educação Infantil');
  const setoresOpcoes = ['Educação Infantil', 'Ensino Fundamental 1', 'Ensino Fundamental 2', 'Ensino Médio', 'Outros'];

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedEmployeeHistory, setSelectedEmployeeHistory] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(false);
  
  // Relatórios States
  const [mensagemRelatorio, setMensagemRelatorio] = useLocalStorage('escolinha_relatorio_msg', 'Olá! Segue em anexo o relatório financeiro e administrativo atualizado da nossa unidade.');
  const [responsaveisRelatorio, setResponsaveisRelatorio] = useLocalStorage<{id: string, nome: string, telefone: string}[]>('escolinha_relatorio_responsaveis', [
    { id: '1', nome: 'Direção Escolar', telefone: '(11) 99999-9999' },
    { id: '2', nome: 'Coordenação', telefone: '(11) 98888-8888' }
  ]);
  const [novoResponsavelNome, setNovoResponsavelNome] = useState('');
  const [novoResponsavelTelefone, setNovoResponsavelTelefone] = useState('');

  // Caixas para o relatório
  const [caixas] = useLocalStorage<any[]>('escolinha_caixas', []);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = (variable: string) => {
    const textarea = textAreaRef.current;
    if (!textarea) {
      setMensagemRelatorio(prev => prev + variable);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = mensagemRelatorio;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newText = before + variable + after;
    setMensagemRelatorio(newText);
    
    // Focus and move cursor after state update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const handleAddResponsavel = () => {
    if (!novoResponsavelNome.trim() || !novoResponsavelTelefone.trim()) {
      toast.error('Preencha o nome e o telefone do responsável');
      return;
    }
    setResponsaveisRelatorio([...responsaveisRelatorio, {
      id: crypto.randomUUID(),
      nome: novoResponsavelNome,
      telefone: novoResponsavelTelefone
    }]);
    setNovoResponsavelNome('');
    setNovoResponsavelTelefone('');
  };

  const handleSendRelatorio = async () => {
    if (responsaveisRelatorio.length === 0) {
      toast.error('Adicione pelo menos um responsável em Configurar antes de enviar.');
      return;
    }

    const activeEmployees = employees.filter(e => e.status === 'active').length;
    const totalEmployees = employees.length;
    const ocorrenciasHoje = employees.flatMap(e => e.ocorrencias || []).filter(o => o.data === new Date().toISOString().split('T')[0]).length;
    
    const dataFormatada = new Date().toLocaleDateString('pt-BR');
    const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    
    const formattedCaixa = realFinancialData ? `📊 Relatório Financeiro — ${dataFormatada}
${realFinancialData.schoolName} | ${realFinancialData.label}
✅ Recebido hoje: ${formatMoney(realFinancialData.receivedToday)}
📅 Vencendo hoje: ${formatMoney(realFinancialData.dueToday?.sum || 0)} (${realFinancialData.dueToday?.count || 0} cobranças)
⚠️ Em atraso: ${formatMoney(realFinancialData.overdue?.sum || 0)} (${realFinancialData.overdue?.count || 0} cobranças)
📈 Recebido no mês: ${formatMoney(realFinancialData.receivedMonth || 0)}
🕓 A receber ainda no mês: ${formatMoney(realFinancialData.openMonth || 0)}` : `📊 Relatório Financeiro — ${dataFormatada}
Colégio Interagir | Senador
✅ Recebido hoje: R$ 0,00
📅 Vencendo hoje: R$ 0,00 (0 cobranças)
⚠️ Em atraso: R$ 0,00 (0 cobranças)
📈 Recebido no mês: R$ 0,00
🕓 A receber ainda no mês: R$ 0,00`;

    const baseUrl = window.location.origin;
    const linkCaixa = `${baseUrl}/app/financeiro`;

    let finalMessage = mensagemRelatorio
      .replace(/{{data}}/g, new Date().toLocaleDateString('pt-BR'))
      .replace(/{{total_funcionarios}}/g, String(totalEmployees))
      .replace(/{{ativos}}/g, String(activeEmployees))
      .replace(/{{ocorrencias}}/g, String(ocorrenciasHoje))
      .replace(/{{caixa}}/g, formattedCaixa)
      .replace(/{{link_caixa}}/g, linkCaixa);

    // Se o usuário não incluiu variáveis, adiciona o bloco padrão de admin ao final da mensagem para não quebrar a lógica anterior
    if (!mensagemRelatorio.includes('{{')) {
      finalMessage = `*Relatório Administrativo Diário*
Data: ${new Date().toLocaleDateString('pt-BR')}

👥 *Quadro de Funcionários*
Total: ${totalEmployees}
Ativos: ${activeEmployees}

⚠️ *Ocorrências Hoje*: ${ocorrenciasHoje}

${mensagemRelatorio}`;
    }

    setIsLoading(true);
    let sentCount = 0;
    
    try {
      for (const resp of responsaveisRelatorio) {
        // Limpar o telefone para enviar apenas números
        const phone = resp.telefone.replace(/\D/g, '');
        if (!phone) continue;
        
        // Em um ambiente real, você pode precisar do código do país
        const fullPhone = phone.length <= 11 ? `55${phone}` : phone;

        const personalizedMessage = finalMessage.replace(/{{nome_responsavel}}/g, resp.nome);

        const { error } = await supabase.functions.invoke('uazapi', {
          body: {
            action: 'send-text',
            data: {
              phone: fullPhone,
              message: personalizedMessage,
            }
          }
        });

        if (error) {
          console.error(`Erro ao enviar para ${resp.nome}:`, error);
        } else {
          sentCount++;
        }
      }
      
      if (sentCount > 0) {
        toast.success(`Relatório enviado para ${sentCount} responsável(eis)!`);
      } else {
        toast.error('Não foi possível enviar o relatório para nenhum responsável.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Ocorreu um erro ao enviar os relatórios.');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleAddTurma = () => {
    if (!novaTurma.trim()) return;
    const baseName = novaTurma.trim();
    let novasTurmas = [...turmas];
    const index = novasTurmas.findIndex(t => t.nome === baseName && t.setor === selectedSetor);
    
    if (index !== -1) {
      // Turma já existe, apenas adicionamos as novas letras
      const existingLetters = [...novasTurmas[index].letras];
      selectedLetters.forEach(l => {
        if (!existingLetters.includes(l)) existingLetters.push(l);
      });
      novasTurmas[index].letras = existingLetters.sort();
    } else {
      // Nova turma
      novasTurmas.push({ setor: selectedSetor, nome: baseName, letras: [...selectedLetters].sort() });
    }
    
    setTurmas(novasTurmas);
    setNovaTurma('');
    setSelectedLetters([]);
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
                <CardHeader>
                  <CardTitle>Turmas e Classes</CardTitle>
                  <CardDescription>Gerencie as turmas disponíveis para marcação de lançamentos no sistema</CardDescription>
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
                        const turmasDoSetor = turmas.filter(t => t.setor === setor);
                        if (turmasDoSetor.length === 0) return null;
                        
                        return (
                          <div key={setor} className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{setor}</h4>
                            <div className="space-y-3">
                              {turmasDoSetor.map(turma => (
                                <div key={turma.nome} className="flex flex-col gap-2 bg-muted/30 p-3 rounded border border-muted">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-primary">{turma.nome}</span> 
                                    <Button variant="ghost" size="sm" className="text-destructive h-8 w-8 p-0 hover:bg-destructive/10" onClick={() => {
                                      setTurmas(turmas.filter(t => !(t.nome === turma.nome && t.setor === setor)));
                                    }}>
                                      X
                                    </Button>
                                  </div>
                                  {turma.letras.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-1 border-t border-muted/50 pt-2">
                                      {turma.letras.map(l => (
                                        <span key={l} className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-medium shadow-sm">
                                          {turma.nome} {l}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
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
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Responsáveis por Relatórios</DialogTitle>
            <DialogDescription>Configure as mensagens e visualize como elas aparecerão no WhatsApp</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-[1fr_350px] gap-8 py-4">
            {/* Left Column: Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Mensagem Padrão do Relatório</label>
                <Textarea 
                  ref={textAreaRef}
                  placeholder="Digite a mensagem que acompanhará o relatório..."
                  value={mensagemRelatorio}
                  onChange={(e) => setMensagemRelatorio(e.target.value)}
                  className="min-h-[120px]"
                />
                <div className="bg-muted p-3 rounded-md mt-2">
                  <p className="text-xs font-semibold mb-2">Clique para inserir variáveis:</p>
                  <div className="flex flex-wrap gap-2 text-xs font-mono">
                    {['{{nome_responsavel}}', '{{data}}', '{{total_funcionarios}}', '{{ativos}}', '{{ocorrencias}}', '{{caixa}}', '{{link_caixa}}'].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(v)}
                        className="bg-background px-2 py-1 rounded border hover:bg-primary/10 hover:border-primary transition-colors text-slate-700"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 leading-tight">
                    Dica: Se você não usar nenhuma variável, os dados administrativos serão enviados automaticamente no topo da mensagem.
                  </p>
                </div>
              </div>
              
              <div className="pt-2">
                <label className="text-sm font-medium">Adicionar Responsável</label>
                <div className="flex gap-2 mt-2">
                  <Input 
                    placeholder="Nome" 
                    value={novoResponsavelNome}
                    onChange={(e) => setNovoResponsavelNome(e.target.value)}
                    className="flex-1" 
                  />
                  <Input 
                    placeholder="WhatsApp" 
                    value={novoResponsavelTelefone}
                    onChange={(e) => setNovoResponsavelTelefone(e.target.value)}
                    className="flex-1" 
                  />
                  <Button onClick={handleAddResponsavel}>Adicionar</Button>
                </div>
              </div>
              
              <div className="border rounded-md p-4 space-y-3 mt-4 max-h-[200px] overflow-y-auto">
                {responsaveisRelatorio.map(resp => (
                  <div key={resp.id} className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{resp.nome}</p>
                      <p className="text-xs text-muted-foreground">{resp.telefone}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive"
                      onClick={() => setResponsaveisRelatorio(responsaveisRelatorio.filter(r => r.id !== resp.id))}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
                {responsaveisRelatorio.length === 0 && (
                  <p className="text-sm text-center text-muted-foreground py-2">Nenhum responsável cadastrado</p>
                )}
              </div>
            </div>

            {/* Right Column: WhatsApp Preview */}
            <div className="flex justify-center items-start pt-2">
              <div className="relative w-full max-w-[320px] border-[8px] border-gray-900 dark:border-gray-800 rounded-[2.5rem] overflow-hidden shadow-xl bg-[#E5DDD5] dark:bg-[#0b141a]">
                {/* Phone notch */}
                <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 dark:bg-gray-800 rounded-b-3xl mx-16 z-10"></div>
                
                {/* WhatsApp Header */}
                <div className="bg-[#075E54] dark:bg-[#202c33] text-white p-3 pt-8 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-semibold text-sm truncate">Relatório Gestão Já</p>
                    <p className="text-[11px] text-white/70">bot</p>
                  </div>
                </div>

                {/* Chat Area */}
                <div 
                  className="p-4 min-h-[400px] flex flex-col justify-end relative"
                  style={{ 
                    backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
                    backgroundSize: '300px',
                    backgroundRepeat: 'repeat'
                  }}
                >
                  <div className="absolute inset-0 bg-black/40 dark:bg-[#0b141a]/80 pointer-events-none"></div>

                  <div className="relative z-10 w-full flex flex-col">
                    <div className="bg-[#dcf8c6] dark:bg-[#005c4b] text-[#303030] dark:text-[#e9edef] rounded-lg p-3 text-[13px] shadow-sm ml-4 mb-2 relative self-end inline-block max-w-full">
                      <div className="absolute top-0 -right-2 w-0 h-0 border-t-[10px] border-t-[#dcf8c6] dark:border-t-[#005c4b] border-r-[10px] border-r-transparent"></div>
                      <div className="whitespace-pre-wrap leading-snug font-sans break-words">
                        {(() => {
                          const activeEmployees = employees.filter(e => e.status === 'active').length;
                          const totalEmployees = employees.length;
                          const ocorrenciasHoje = employees.flatMap(e => e.ocorrencias || []).filter(o => o.data === new Date().toISOString().split('T')[0]).length;
                          
                          const dataFormatada = new Date().toLocaleDateString('pt-BR');
                          const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
                          
                          const formattedCaixa = realFinancialData ? `📊 Relatório Financeiro — ${dataFormatada}
${realFinancialData.schoolName} | ${realFinancialData.label}
✅ Recebido hoje: ${formatMoney(realFinancialData.receivedToday)}
📅 Vencendo hoje: ${formatMoney(realFinancialData.dueToday?.sum || 0)} (${realFinancialData.dueToday?.count || 0} cobranças)
⚠️ Em atraso: ${formatMoney(realFinancialData.overdue?.sum || 0)} (${realFinancialData.overdue?.count || 0} cobranças)
📈 Recebido no mês: ${formatMoney(realFinancialData.receivedMonth || 0)}
🕓 A receber ainda no mês: ${formatMoney(realFinancialData.openMonth || 0)}` : `📊 Relatório Financeiro — ${dataFormatada}
Colégio Interagir | Senador
✅ Recebido hoje: Carregando dados...
📅 Vencendo hoje: ...
⚠️ Em atraso: ...
📈 Recebido no mês: ...
🕓 A receber ainda no mês: ...`;

                          const baseUrl = window.location.origin;
                          const linkCaixa = `${baseUrl}/app/financeiro`;

                          let finalMessage = mensagemRelatorio
                            .replace(/{{data}}/g, new Date().toLocaleDateString('pt-BR'))
                            .replace(/{{total_funcionarios}}/g, String(totalEmployees))
                            .replace(/{{ativos}}/g, String(activeEmployees))
                            .replace(/{{ocorrencias}}/g, String(ocorrenciasHoje))
                            .replace(/{{caixa}}/g, formattedCaixa)
                            .replace(/{{link_caixa}}/g, linkCaixa)
                            .replace(/{{nome_responsavel}}/g, responsaveisRelatorio[0]?.nome || 'Responsável Exemplo');

                          if (!mensagemRelatorio.includes('{{')) {
                            finalMessage = `*Relatório Administrativo Diário*\nData: ${new Date().toLocaleDateString('pt-BR')}\n\n👥 *Quadro de Funcionários*\nTotal: ${totalEmployees}\nAtivos: ${activeEmployees}\n\n⚠️ *Ocorrências Hoje*: ${ocorrenciasHoje}\n\n${mensagemRelatorio}`;
                          }
                          return finalMessage || "Escreva uma mensagem...";
                        })()}
                      </div>
                      <div className="text-[10px] text-right mt-1 opacity-60 flex justify-end items-center gap-1">
                        {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
          <div className="flex justify-end pt-2 gap-2 mt-2">
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
