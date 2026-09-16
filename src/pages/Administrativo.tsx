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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Briefcase, Users, FileText, Plus, Search, MoreHorizontal, Clock, Calendar, 
  Loader2, Download, Upload, FileDown, LayoutGrid, List, Wrench, Eye, EyeOff, Pencil, 
  Trash2, Mail, Phone, Camera, UserCheck, ShieldAlert, DollarSign, Shield, Link2 
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/utils';
import { useUsers } from '@/hooks/useUsers';

import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { OrdensServicoTab } from '@/components/administrativo/OrdensServicoTab';

const formatCurrency = (val: number) => {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const parseCurrencyInput = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const employeeSchema = z.object({
  name: z.string().min(3, 'Nome é obrigatório'),
  role: z.string().min(1, 'Cargo é obrigatório'),
  department: z.string().min(1, 'Departamento é obrigatório'),
  phone: z.string().min(10, 'Telefone é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  hire_date: z.string().min(1, 'Data de admissão é obrigatória'),
  contract_type: z.enum(['mensalista', 'horista']).default('mensalista'),
  salary: z.string().optional().or(z.literal('')),
  hourly_rate: z.string().optional().or(z.literal('')),
  user_id: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

const ROLE_LABELS: Record<string, string> = {
  director: 'Diretor(a)',
  admin: 'Administrativo',
  secretary: 'Secretaria',
  teacher: 'Professor(a)',
  seller: 'Vendedor(a)',
};

const ROLE_COLORS: Record<string, string> = {
  director: 'bg-purple-500',
  admin: 'bg-blue-500',
  secretary: 'bg-green-500',
  teacher: 'bg-orange-500',
  seller: 'bg-indigo-500',
};

const MOCK_IDS = ['1', '2', '3', '4', '5'];
const MOCK_NAMES = ['Maria Silva', 'João Santos', 'Ana Costa', 'Carlos Lima', 'Paula Oliveira'];

const Administrativo = () => {
  const { profile } = useAuth();
  const { canAccessTab, canViewKpis } = usePermissions();
  const [showTotals, setShowTotals] = useLocalStorage<boolean>('escolinha_show_kpis_administrativo', true);

  const [employees, setEmployees] = useLocalStorage<any[]>('escolinha_employees_v2', []);

  // Purge automático de colaboradores fictícios/mockup caso existam no armazenamento
  useEffect(() => {
    if (employees.some(emp => MOCK_IDS.includes(String(emp.id)) || MOCK_NAMES.includes(emp.name))) {
      setEmployees(prev => prev.filter(emp => !MOCK_IDS.includes(String(emp.id)) && !MOCK_NAMES.includes(emp.name)));
    }
  }, []);

  const availableTabs = [
    { id: 'employees', label: 'Funcionários', icon: Users },
    { id: 'os', label: 'Ordens de Serviço', icon: Wrench },
  ].filter(tab => canAccessTab('administrativo', tab.id));

  const [activeTab, setActiveTab] = useState<string>(availableTabs[0]?.id || 'employees');

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some(t => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  
  // Dialogs e estados
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const [editContractType, setEditContractType] = useState<'mensalista' | 'horista'>('mensalista');

  const [isViewFichaOpen, setIsViewFichaOpen] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState<any | null>(null);

  const [isOcorrenciaFormOpen, setIsOcorrenciaFormOpen] = useState(false);
  const [selectedEmpForOcorrencia, setSelectedEmpForOcorrencia] = useState('');

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedEmployeeHistory, setSelectedEmployeeHistory] = useState<any>(null);

  const { data: systemUsers = [] } = useUsers();

  // Estados para Conectar Colaborador a Usuário do Sistema
  const [isConnectUserOpen, setIsConnectUserOpen] = useState(false);
  const [employeeToConnect, setEmployeeToConnect] = useState<any | null>(null);
  const [selectedUserIdToConnect, setSelectedUserIdToConnect] = useState<string>('none');

  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toISODate = (val: any): string => {
    if (!val) return new Date().toISOString().split('T')[0];
    const str = String(val).trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
      const [d, m, y] = str.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.split('T')[0];
    }
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch {}
    return new Date().toISOString().split('T')[0];
  };

  const handleExport = () => {
    const dataToExport = employees.map(e => ({
      Nome: e.name,
      Cargo: e.role,
      Departamento: e.department,
      'Tipo de Contrato': e.contract_type === 'horista' || (!e.contract_type && e.hourly_rate > 0) ? 'Horista' : 'Mensalista',
      'Salário': e.salary ? Number(e.salary) : '',
      'Valor Hora Aula': e.hourly_rate ? Number(e.hourly_rate) : '',
      Telefone: e.phone,
      Email: e.email || '',
      'Data de Admissão': formatDate(e.hire_date),
      Status: e.status === 'active' ? 'Ativo' : e.status === 'vacation' ? 'Férias' : 'Afastado'
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Funcionarios");
    XLSX.writeFile(workbook, "funcionarios.xlsx");
    toast.success("Planilha exportada com sucesso!");
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Nome: 'João da Silva',
        Cargo: 'Professor(a)',
        Departamento: 'Pedagógico',
        'Tipo de Contrato': 'Horista',
        'Salário': '',
        'Valor Hora Aula': 50.00,
        Telefone: '(11) 99999-9999',
        Email: 'joao@escola.com',
        'Data de Admissão': '15/01/2024'
      },
      {
        Nome: 'Maria Santos',
        Cargo: 'Coordenador(a)',
        Departamento: 'Pedagógico',
        'Tipo de Contrato': 'Mensalista',
        'Salário': 4500.00,
        'Valor Hora Aula': '',
        Telefone: '(11) 98888-8888',
        Email: 'maria@escola.com',
        'Data de Admissão': '10/05/2023'
      }
    ];
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

        const parseNum = (val: any) => {
          if (val === undefined || val === null || val === '') return undefined;
          if (typeof val === 'number') return isNaN(val) ? undefined : val;
          const str = String(val).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
          const n = parseFloat(str);
          return isNaN(n) ? undefined : n;
        };

        const novosFuncionarios = data.map(row => {
          const tipoContratoRaw = String(row['Tipo de Contrato'] || row['Tipo'] || row['Regime'] || '').toLowerCase();
          const isHorista = tipoContratoRaw.includes('horista') || (!tipoContratoRaw && row['Valor Hora Aula'] !== undefined && row['Valor Hora Aula'] !== '');
          const contract_type = isHorista ? 'horista' : 'mensalista';

          const salaryVal = parseNum(row['Salário'] || row['Salario'] || row['Salário Base'] || row['Salario Base']);
          const hourlyRateVal = parseNum(row['Valor Hora Aula'] || row['Hora Aula'] || row['Valor Hora'] || row['Hora-Aula']);

          return {
            id: String(Date.now() + Math.random()),
            name: row.Nome,
            role: row.Cargo || 'Auxiliar',
            department: row.Departamento || 'Administrativo',
            phone: String(row.Telefone || ''),
            email: String(row.Email || ''),
            status: 'active',
            hire_date: toISODate(row['Data de Admissão']),
            contract_type,
            salary: salaryVal,
            hourly_rate: isHorista ? hourlyRateVal : undefined,
            ocorrencias: []
          };
        });

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

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: '',
      role: '',
      department: '',
      phone: '',
      email: '',
      hire_date: '',
      contract_type: 'mensalista',
      salary: '',
      hourly_rate: '',
      user_id: 'none',
    },
  });

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (emp.userName && emp.userName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedPhoto(reader.result as string);
      toast.success("Foto carregada!");
    };
    reader.readAsDataURL(file);
  };

  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditPhoto(reader.result as string);
      toast.success("Nova foto carregada!");
    };
    reader.readAsDataURL(file);
  };

  const handleOpenEdit = (emp: any) => {
    setEditingEmployee(emp);
    setEditPhoto(emp.photoUrl || null);
    setEditContractType(emp.contract_type === 'horista' || (!emp.contract_type && emp.hourly_rate > 0) ? 'horista' : 'mensalista');
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEmployee) return;
    const formData = new FormData(e.currentTarget);
    const contractType = (formData.get('contract_type') as string) || editContractType;
    const salary = parseCurrencyInput(formData.get('salary'));
    const hourlyRate = parseCurrencyInput(formData.get('hourly_rate'));
    const formUserId = formData.get('user_id') as string;
    const userObj = formUserId && formUserId !== 'none' ? systemUsers.find(u => u.id === formUserId) : null;

    const updated = {
      ...editingEmployee,
      name: formData.get('name') as string,
      role: formData.get('role') as string,
      department: formData.get('department') as string,
      phone: formData.get('phone') as string,
      email: (formData.get('email') as string) || '',
      hire_date: formData.get('hire_date') as string,
      contract_type: contractType,
      salary: salary,
      hourly_rate: contractType === 'horista' ? hourlyRate : undefined,
      photoUrl: editPhoto || '',
      userId: userObj ? userObj.id : (formUserId === 'none' ? undefined : editingEmployee.userId),
      userName: userObj ? userObj.full_name : (formUserId === 'none' ? undefined : editingEmployee.userName),
      userEmail: userObj ? userObj.email : (formUserId === 'none' ? undefined : editingEmployee.userEmail),
    };
    setEmployees(employees.map(emp => emp.id === updated.id ? updated : emp));
    setIsEditDialogOpen(false);
    setEditingEmployee(null);
    toast.success("Dados do colaborador atualizados com sucesso!");
  };

  // Funções de Conexão com Usuário do Sistema
  const handleOpenConnectUser = (emp: any) => {
    setEmployeeToConnect(emp);
    setSelectedUserIdToConnect(emp.userId || 'none');
    setIsConnectUserOpen(true);
  };

  const handleSaveConnectUser = () => {
    if (!employeeToConnect) return;

    if (selectedUserIdToConnect === 'none' || !selectedUserIdToConnect) {
      // Desconectar usuário
      setEmployees(prev => prev.map(emp => 
        emp.id === employeeToConnect.id 
          ? { ...emp, userId: undefined, userName: undefined, userEmail: undefined } 
          : emp
      ));
      toast.success(`Usuário desvinculado de ${employeeToConnect.name}.`);
    } else {
      const userObj = systemUsers.find(u => u.id === selectedUserIdToConnect);
      if (!userObj) return;

      setEmployees(prev => prev.map(emp => {
        if (emp.id === employeeToConnect.id) {
          return { 
            ...emp, 
            userId: userObj.id, 
            userName: userObj.full_name, 
            userEmail: userObj.email 
          };
        }
        // Se outro colaborador estiver com este mesmo usuário vinculado, limpa para evitar duplicatas
        if (emp.userId === userObj.id) {
          return {
            ...emp,
            userId: undefined,
            userName: undefined,
            userEmail: undefined,
          };
        }
        return emp;
      }));
      toast.success(`Colaborador ${employeeToConnect.name} conectado ao usuário ${userObj.full_name}!`);
    }

    setIsConnectUserOpen(false);
    setEmployeeToConnect(null);
  };

  const handleOpenViewFicha = (emp: any) => {
    setViewingEmployee(emp);
    setIsViewFichaOpen(true);
  };

  const handleCreateEmployee = async (data: EmployeeFormData) => {
    setIsLoading(true);
    try {
      const contractType = data.contract_type || 'mensalista';
      const salaryNum = parseCurrencyInput(data.salary);
      const hourlyRateNum = parseCurrencyInput(data.hourly_rate);
      const userObj = data.user_id && data.user_id !== 'none' ? systemUsers.find(u => u.id === data.user_id) : null;

      const newEmployee = {
        id: String(Date.now()),
        name: data.name,
        role: data.role,
        department: data.department,
        phone: data.phone,
        email: data.email || '',
        photoUrl: selectedPhoto || '',
        status: 'active',
        hire_date: data.hire_date,
        contract_type: contractType,
        salary: salaryNum,
        hourly_rate: contractType === 'horista' ? hourlyRateNum : undefined,
        userId: userObj?.id || undefined,
        userName: userObj?.full_name || undefined,
        userEmail: userObj?.email || undefined,
        ocorrencias: []
      };
      setEmployees([...employees, newEmployee]);
      form.reset();
      setSelectedPhoto(null);
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
  const totalHoristas = employees.filter(e => e.contract_type === 'horista' || (!e.contract_type && e.hourly_rate > 0)).length;
  const totalMensalistas = employees.length - totalHoristas;
  const totalFolhaSalarial = employees.reduce((acc, cur) => acc + (Number(cur.salary) || 0), 0);

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
      {canViewKpis('administrativo') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Indicadores do Quadro de Colaboradores
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTotals(!showTotals)}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              {showTotals ? (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Ocultar Totais</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Exibir Totais</span>
                </>
              )}
            </Button>
          </div>

          {showTotals && (
            <div className="grid gap-4 md:grid-cols-3">
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
                  <CardTitle className="text-sm font-medium">Folha Salarial Base</CardTitle>
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalFolhaSalarial)}</div>
                  <p className="text-xs text-muted-foreground">{totalHoristas} horista{totalHoristas !== 1 ? 's' : ''} • {totalMensalistas} mensalista{totalMensalistas !== 1 ? 's' : ''}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      {availableTabs.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <ShieldAlert className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
          <p className="font-medium">Você não possui permissão para visualizar as abas deste módulo.</p>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {availableTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {availableTabs.some(t => t.id === 'employees') && (
            <TabsContent value="employees" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome, cargo ou setor..."
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
                  {employees.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="rounded-full bg-primary/10 p-5 mb-4">
                        <Users className="h-10 w-10 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-1">Nenhum colaborador cadastrado</h3>
                      <p className="text-sm text-muted-foreground max-w-md mb-6">
                        Adicione os colaboradores reais da instituição ou importe uma planilha para iniciar a gestão do departamento administrativo.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <Button onClick={() => {
                          setSelectedPhoto(null);
                          form.reset();
                          setIsEmployeeFormOpen(true);
                        }}>
                          <Plus className="mr-2 h-4 w-4" />
                          Novo Colaborador
                        </Button>
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="mr-2 h-4 w-4" />
                          Importar Planilha
                        </Button>
                      </div>
                    </div>
                  ) : filteredEmployees.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      Nenhum colaborador encontrado para o termo pesquisado.
                    </div>
                  ) : viewMode === 'list' ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Funcionário</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Departamento</TableHead>
                          <TableHead>Remuneração</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Admissão</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Usuário do Sistema</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployees.map((employee) => (
                          <TableRow key={employee.id} className="table-row-interactive">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border border-border">
                                  {employee.photoUrl && <AvatarImage src={employee.photoUrl} alt={employee.name} className="object-cover" />}
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                    {employee.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <span className="font-medium block leading-tight">{employee.name}</span>
                                  {employee.email && (
                                    <span className="text-xs text-muted-foreground">{employee.email}</span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{employee.role}</TableCell>
                            <TableCell>{employee.department}</TableCell>
                            <TableCell>
                              {employee.contract_type === 'horista' || (!employee.contract_type && employee.hourly_rate > 0) ? (
                                <div className="space-y-0.5">
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 block text-sm">
                                    {formatCurrency(employee.hourly_rate || 0)}/h-aula
                                  </span>
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/30">
                                    Horista
                                  </Badge>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="font-semibold text-foreground block text-sm">
                                    {formatCurrency(employee.salary || 0)}
                                  </span>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    Mensalista
                                  </Badge>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{employee.phone}</TableCell>
                            <TableCell>{formatDate(employee.hire_date)}</TableCell>
                            <TableCell>{getStatusBadge(employee.status)}</TableCell>
                            <TableCell>
                              {employee.userId ? (
                                <Badge
                                  variant="outline"
                                  onClick={() => handleOpenConnectUser(employee)}
                                  className="text-[11px] bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 cursor-pointer flex items-center gap-1 w-fit"
                                  title="Clique para gerenciar vínculo de usuário"
                                >
                                  <UserCheck className="h-3 w-3 text-purple-600" />
                                  <span className="font-semibold truncate max-w-[120px]">{employee.userName || 'Conectado'}</span>
                                </Badge>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenConnectUser(employee)}
                                  className="text-[11px] h-6 px-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 border border-dashed border-slate-200"
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Conectar
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleOpenViewFicha(employee)}>
                                    <Eye className="mr-2 h-4 w-4" /> Ver ficha
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenEdit(employee)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenConnectUser(employee)} className="text-purple-700 font-medium">
                                    <UserCheck className="mr-2 h-4 w-4 text-purple-600" /> Conectar Usuário
                                  </DropdownMenuItem>
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
                                    Histórico & Ocorrências
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                    onClick={() => handleDemitir(employee.id, employee.name)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Desligar (Demitir)
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
                        <Card key={employee.id} className="card-interactive overflow-hidden flex flex-col justify-between">
                          <CardHeader className="p-4 pb-2 text-center">
                            <div className="flex justify-end mb-[-2rem] relative z-10">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleOpenViewFicha(employee)}>
                                    <Eye className="mr-2 h-4 w-4" /> Ver ficha
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenEdit(employee)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenConnectUser(employee)} className="text-purple-700 font-medium">
                                    <UserCheck className="mr-2 h-4 w-4 text-purple-600" /> Conectar Usuário
                                  </DropdownMenuItem>
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
                                    Histórico & Ocorrências
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                    onClick={() => handleDemitir(employee.id, employee.name)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Desligar (Demitir)
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <Avatar className="h-20 w-20 mx-auto mb-2 border-2 border-primary/20 shadow-sm">
                              {employee.photoUrl && <AvatarImage src={employee.photoUrl} alt={employee.name} className="object-cover" />}
                              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                                {employee.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
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
                              <span>Remuneração:</span>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400 ml-2">
                                {employee.contract_type === 'horista' || (!employee.contract_type && employee.hourly_rate > 0)
                                  ? `${formatCurrency(employee.hourly_rate || 0)}/h-aula (Horista)`
                                  : `${formatCurrency(employee.salary || 0)}/mês`}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-muted-foreground border-b pb-1 border-border/50">
                              <span>Telefone:</span>
                              <span className="font-medium text-foreground ml-2">{employee.phone}</span>
                            </div>
                            <div className="flex justify-between items-center text-muted-foreground pt-1">
                              <span>Status:</span>
                              <span>{getStatusBadge(employee.status)}</span>
                            </div>
                            <div className="flex justify-between items-center text-muted-foreground pt-1 border-t border-border/50">
                              <span className="text-xs">Usuário:</span>
                              {employee.userId ? (
                                <Badge
                                  variant="outline"
                                  onClick={() => handleOpenConnectUser(employee)}
                                  className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 cursor-pointer flex items-center gap-1 truncate max-w-[140px]"
                                  title="Clique para gerenciar o vínculo com usuário"
                                >
                                  <UserCheck className="h-3 w-3 text-purple-600 shrink-0" />
                                  <span className="truncate">{employee.userName || 'Conectado'}</span>
                                </Badge>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenConnectUser(employee)}
                                  className="text-[10px] text-purple-600 hover:underline flex items-center gap-0.5"
                                >
                                  <Plus className="h-3 w-3" /> Conectar Usuário
                                </button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {availableTabs.some(t => t.id === 'os') && (
            <TabsContent value="os" className="mt-6">
              <OrdensServicoTab />
            </TabsContent>
          )}
        </Tabs>
      )}
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
                  {selectedPhoto ? (
                    <>
                      <img src={selectedPhoto} alt="Foto 3x4" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                        Trocar foto
                      </div>
                    </>
                  ) : (
                    <>
                      <Camera className="h-10 w-10 text-primary/40 group-hover:scale-110 transition-transform mb-2" />
                      <span className="text-xs text-primary/60 font-medium uppercase tracking-wider">Foto 3x4</span>
                    </>
                  )}
                  
                  <input 
                    id="photo-upload" 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={handlePhotoChange} 
                  />
                </div>
                {selectedPhoto ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedPhoto(null)} className="text-xs text-destructive hover:text-destructive">
                    Remover Foto
                  </Button>
                ) : (
                  <label htmlFor="photo-upload" className="text-sm text-primary hover:underline font-medium cursor-pointer flex items-center gap-1">
                    <Upload className="h-3.5 w-3.5" /> Adicionar Foto
                  </label>
                )}
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

                {/* Remuneração: Regime, Salário e Hora-Aula */}
                <div className="p-3.5 bg-muted/30 rounded-lg border border-border/60 space-y-3">
                  <FormField
                    control={form.control}
                    name="contract_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Contratação / Remuneração</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o regime" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="mensalista">Mensalista (Salário Fixo Mensal)</SelectItem>
                            <SelectItem value="horista">Horista (Remuneração por Hora-Aula)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch('contract_type') === 'horista' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <FormField
                        control={form.control}
                        name="hourly_rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-primary font-semibold flex items-center gap-1.5">
                              <Clock className="h-4 w-4" /> Valor da Hora-Aula (R$) *
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: 50,00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="salary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Salário Base Mensal (R$) (Opcional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: 1500,00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : (
                    <FormField
                      control={form.control}
                      name="salary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold flex items-center gap-1.5">
                            <DollarSign className="h-4 w-4 text-emerald-600" /> Salário Mensal (R$)
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: 3500,00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Usuário do Sistema */}
                  <FormField
                    control={form.control}
                    name="user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold flex items-center gap-1.5 text-purple-900">
                          <UserCheck className="h-4 w-4 text-purple-600" /> Vincular a Usuário do Sistema (Opcional)
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || 'none'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um usuário para vincular..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhum usuário vinculado</SelectItem>
                            {systemUsers.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.full_name} {u.email ? `(${u.email})` : ''} — {u.roles.map(r => ROLE_LABELS[r] || r).join(', ') || 'Sem cargo'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground">
                          Conecte o colaborador à conta de usuário do sistema para acesso unificado e permissões.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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

      {/* Edit Employee Form Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar Colaborador</DialogTitle>
            <DialogDescription>Atualize os dados e foto do colaborador</DialogDescription>
          </DialogHeader>

          {editingEmployee && (
            <form onSubmit={handleSaveEdit} className="flex flex-col md:flex-row gap-6 mt-2">
              {/* Coluna da Foto (Esquerda) - 3x4 */}
              <div className="flex flex-col items-center gap-3 w-full md:w-1/3">
                <div className="w-40 h-56 bg-muted border-2 border-dashed border-primary/20 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/80 transition-all relative overflow-hidden group shadow-sm">
                  {editPhoto ? (
                    <>
                      <img src={editPhoto} alt="Foto 3x4" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                        Trocar foto
                      </div>
                    </>
                  ) : (
                    <>
                      <Camera className="h-10 w-10 text-primary/40 group-hover:scale-110 transition-transform mb-2" />
                      <span className="text-xs text-primary/60 font-medium uppercase tracking-wider">Foto 3x4</span>
                    </>
                  )}
                  
                  <input 
                    id="edit-photo-upload" 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={handleEditPhotoChange} 
                  />
                </div>
                {editPhoto ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditPhoto(null)} className="text-xs text-destructive hover:text-destructive">
                    Remover Foto
                  </Button>
                ) : (
                  <label htmlFor="edit-photo-upload" className="text-sm text-primary hover:underline font-medium cursor-pointer flex items-center gap-1">
                    <Upload className="h-3.5 w-3.5" /> Adicionar Foto
                  </label>
                )}
              </div>

              {/* Coluna do Formulário (Direita) */}
              <div className="flex-1 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Nome Completo *</label>
                  <Input name="name" required defaultValue={editingEmployee.name} placeholder="Nome do colaborador" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Cargo *</label>
                    <Select name="role" defaultValue={editingEmployee.role}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Professor(a)">Professor(a)</SelectItem>
                        <SelectItem value="Coordenador(a)">Coordenador(a)</SelectItem>
                        <SelectItem value="Secretário(a)">Secretário(a)</SelectItem>
                        <SelectItem value="Auxiliar">Auxiliar</SelectItem>
                        <SelectItem value="Porteiro">Porteiro</SelectItem>
                        <SelectItem value="Serviços Gerais">Serviços Gerais</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Departamento *</label>
                    <Select name="department" defaultValue={editingEmployee.department}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pedagógico">Pedagógico</SelectItem>
                        <SelectItem value="Administrativo">Administrativo</SelectItem>
                        <SelectItem value="Financeiro">Financeiro</SelectItem>
                        <SelectItem value="Serviços Gerais">Serviços Gerais</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Telefone *</label>
                    <Input name="phone" required defaultValue={editingEmployee.phone} placeholder="(00) 00000-0000" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Data de Admissão *</label>
                    <Input type="date" name="hire_date" required defaultValue={editingEmployee.hire_date} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" name="email" defaultValue={editingEmployee.email || ''} placeholder="email@exemplo.com" />
                </div>

                {/* Remuneração: Regime, Salário e Hora-Aula */}
                <div className="p-3.5 bg-muted/30 rounded-lg border border-border/60 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Tipo de Contratação / Remuneração</label>
                    <Select 
                      name="contract_type" 
                      value={editContractType} 
                      onValueChange={(val: any) => setEditContractType(val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o regime" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensalista">Mensalista (Salário Fixo Mensal)</SelectItem>
                        <SelectItem value="horista">Horista (Remuneração por Hora-Aula)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {editContractType === 'horista' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-primary flex items-center gap-1.5">
                          <Clock className="h-4 w-4" /> Valor da Hora-Aula (R$) *
                        </label>
                        <Input 
                          name="hourly_rate" 
                          defaultValue={editingEmployee.hourly_rate || ''} 
                          placeholder="Ex: 50,00" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Salário Base Mensal (R$) (Opcional)</label>
                        <Input 
                          name="salary" 
                          defaultValue={editingEmployee.salary || ''} 
                          placeholder="Ex: 1500,00" 
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 text-emerald-600" /> Salário Mensal (R$)
                      </label>
                      <Input 
                        name="salary" 
                        defaultValue={editingEmployee.salary || ''} 
                        placeholder="Ex: 3500,00" 
                      />
                    </div>
                  )}
                </div>

                {/* Usuário do Sistema Conectado */}
                <div className="space-y-1.5 pt-1 border-t">
                  <label className="text-sm font-semibold flex items-center gap-1.5 text-purple-900">
                    <UserCheck className="h-4 w-4 text-purple-600" /> Usuário do Sistema Conectado
                  </label>
                  <Select name="user_id" defaultValue={editingEmployee.userId || 'none'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário para vincular..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum usuário vinculado (Desconectado)</SelectItem>
                      {systemUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name} {u.email ? `(${u.email})` : ''} — {u.roles.map(r => ROLE_LABELS[r] || r).join(', ') || 'Sem cargo'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Altere ou desvincule a conta de usuário associada a este colaborador.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Ver Ficha Dialog */}
      <Dialog open={isViewFichaOpen} onOpenChange={setIsViewFichaOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ficha do Colaborador</DialogTitle>
            <DialogDescription>Detalhes cadastrais e administrativos</DialogDescription>
          </DialogHeader>

          {viewingEmployee && (
            <div className="space-y-6 pt-2">
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-muted/40 rounded-lg border">
                <Avatar className="h-24 w-24 border-2 border-primary/20 shadow-sm rounded-lg">
                  {viewingEmployee.photoUrl && (
                    <AvatarImage src={viewingEmployee.photoUrl} alt={viewingEmployee.name} className="object-cover" />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold rounded-lg">
                    {viewingEmployee.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left space-y-1 flex-1">
                  <h3 className="text-xl font-bold text-foreground">{viewingEmployee.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5">
                    <Briefcase className="h-4 w-4" /> {viewingEmployee.role} • {viewingEmployee.department}
                  </p>
                  <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
                    {getStatusBadge(viewingEmployee.status)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-md bg-background border space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Phone className="h-3.5 w-3.5" /> Telefone
                  </span>
                  <p className="font-semibold text-foreground">{viewingEmployee.phone || '-'}</p>
                </div>

                <div className="p-3 rounded-md bg-background border space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </span>
                  <p className="font-semibold text-foreground truncate">{viewingEmployee.email || 'Não informado'}</p>
                </div>

                <div className="p-3 rounded-md bg-background border space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Calendar className="h-3.5 w-3.5" /> Data de Admissão
                  </span>
                  <p className="font-semibold text-foreground">
                    {formatDate(viewingEmployee.hire_date)}
                  </p>
                </div>

                <div className="p-3 rounded-md bg-background border space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                    <FileText className="h-3.5 w-3.5" /> Ocorrências Registradas
                  </span>
                  <p className="font-semibold text-foreground">
                    {viewingEmployee.ocorrencias?.length || 0} registro(s)
                  </p>
                </div>
              </div>

              {/* Remuneração na Ficha */}
              <div className="p-3.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Regime de Contratação</span>
                  <Badge variant={viewingEmployee.contract_type === 'horista' || (!viewingEmployee.contract_type && viewingEmployee.hourly_rate > 0) ? 'outline' : 'secondary'} className="font-semibold mt-1">
                    {viewingEmployee.contract_type === 'horista' || (!viewingEmployee.contract_type && viewingEmployee.hourly_rate > 0) ? 'Horista' : 'Mensalista'}
                  </Badge>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-xs text-muted-foreground block font-medium">
                    {viewingEmployee.contract_type === 'horista' || (!viewingEmployee.contract_type && viewingEmployee.hourly_rate > 0) ? 'Valor da Hora-Aula' : 'Salário Mensal'}
                  </span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {viewingEmployee.contract_type === 'horista' || (!viewingEmployee.contract_type && viewingEmployee.hourly_rate > 0)
                      ? `${formatCurrency(viewingEmployee.hourly_rate || 0)} / hora-aula`
                      : formatCurrency(viewingEmployee.salary || 0)}
                  </span>
                  {(viewingEmployee.contract_type === 'horista' || (!viewingEmployee.contract_type && viewingEmployee.hourly_rate > 0)) && viewingEmployee.salary > 0 && (
                    <span className="text-xs text-muted-foreground block">
                      Salário base: {formatCurrency(viewingEmployee.salary)}
                    </span>
                  )}
                </div>
              </div>

              {/* Usuário Vinculado na Ficha */}
              <div className="p-3.5 rounded-lg bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-purple-900 dark:text-purple-300 block font-semibold flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-purple-600" /> Usuário do Sistema Conectado
                  </span>
                  {viewingEmployee.userId ? (
                    <div className="mt-1">
                      <strong className="text-sm text-foreground block">{viewingEmployee.userName || 'Usuário Vinculado'}</strong>
                      {viewingEmployee.userEmail && (
                        <span className="text-xs text-muted-foreground">{viewingEmployee.userEmail}</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Nenhum usuário do sistema conectado a este colaborador.
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-purple-700 border-purple-300 hover:bg-purple-100 shrink-0"
                  onClick={() => {
                    const emp = viewingEmployee;
                    setIsViewFichaOpen(false);
                    handleOpenConnectUser(emp);
                  }}
                >
                  <UserCheck className="h-3.5 w-3.5 mr-1" />
                  {viewingEmployee.userId ? 'Alterar Vínculo' : 'Conectar Usuário'}
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSelectedEmployeeHistory(viewingEmployee);
                    setIsHistoryOpen(true);
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" /> Histórico & Ocorrências
                </Button>
                <Button 
                  onClick={() => {
                    const emp = viewingEmployee;
                    setIsViewFichaOpen(false);
                    handleOpenEdit(emp);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" /> Editar Colaborador
                </Button>
              </div>
            </div>
          )}
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

      {/* Modal Conectar Colaborador a Usuário do Sistema */}
      <Dialog open={isConnectUserOpen} onOpenChange={setIsConnectUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <UserCheck className="text-purple-600 h-5 w-5" />
              Conectar Colaborador a Usuário
            </DialogTitle>
            <DialogDescription className="text-xs">
              Vincule este colaborador a uma conta de usuário do sistema para sincronizar permissões, diários e acessos.
            </DialogDescription>
          </DialogHeader>

          {employeeToConnect && (
            <div className="space-y-4 py-2">
              {/* Card Resumo do Colaborador */}
              <div className="p-3 bg-slate-50 border rounded-lg flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-purple-200">
                  {employeeToConnect.photoUrl && <AvatarImage src={employeeToConnect.photoUrl} />}
                  <AvatarFallback className="bg-purple-100 text-purple-700 font-bold">
                    {employeeToConnect.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-slate-800 truncate">{employeeToConnect.name}</h4>
                  <p className="text-xs text-slate-500 truncate">{employeeToConnect.role} • {employeeToConnect.department}</p>
                </div>
              </div>

              {/* Seletor de Usuário do Sistema */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Selecione o Usuário do Sistema</label>
                <Select value={selectedUserIdToConnect} onValueChange={setSelectedUserIdToConnect}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione um usuário cadastrado..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (Desconectar usuário)</SelectItem>
                    {systemUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name} {u.email ? `(${u.email})` : ''} — {u.roles.map((r) => ROLE_LABELS[r] || r).join(', ') || 'Sem cargo'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400">
                  Mostra os usuários com conta de acesso cadastrada na instituição.
                </p>
              </div>

              {/* Pré-visualização do Usuário Selecionado */}
              {selectedUserIdToConnect && selectedUserIdToConnect !== 'none' && (() => {
                const sel = systemUsers.find(u => u.id === selectedUserIdToConnect);
                if (!sel) return null;
                return (
                  <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-purple-900 uppercase">Conta Selecionada</span>
                      <Badge className={sel.is_active ? 'bg-emerald-600 text-white text-[10px]' : 'bg-slate-400 text-white text-[10px]'}>
                        {sel.is_active ? 'Conta Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 border border-purple-300">
                        <AvatarImage src={sel.avatar_url || undefined} />
                        <AvatarFallback className="bg-purple-200 text-purple-800 text-xs font-bold">
                          {sel.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-slate-800 truncate">{sel.full_name}</div>
                        <div className="text-[11px] text-slate-500 truncate">{sel.email || 'Sem e-mail'}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {sel.roles.map((role) => (
                        <Badge key={role} className={`${ROLE_COLORS[role] || 'bg-slate-600'} text-white text-[10px] px-1.5 py-0`}>
                          {ROLE_LABELS[role] || role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsConnectUserOpen(false)}>
              Cancelar
            </Button>
            {employeeToConnect?.userId && selectedUserIdToConnect === 'none' && (
              <Button variant="destructive" size="sm" onClick={handleSaveConnectUser}>
                Desconectar
              </Button>
            )}
            <Button size="sm" onClick={handleSaveConnectUser} className="bg-purple-600 hover:bg-purple-700 text-white">
              Salvar Vínculo
            </Button>
          </DialogFooter>
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
