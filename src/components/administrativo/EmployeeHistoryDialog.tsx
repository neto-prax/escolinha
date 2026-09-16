import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Wallet, FileWarning, Calendar, Mail, Phone, Briefcase, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { formatDate } from '@/lib/utils';

// Interfaces baseadas no que já existe na tela
interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  phone: string;
  email?: string;
  photoUrl?: string;
  hire_date: string;
  status: string;
  contract_type?: 'mensalista' | 'horista';
  salary?: number;
  hourly_rate?: number;
  ocorrencias?: any[];
}

interface EmployeeHistoryDialogProps {
  employee: Employee | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddOcorrencia?: (employeeId: string, ocorrencia: any) => void;
}

export function EmployeeHistoryDialog({ employee, isOpen, onOpenChange, onAddOcorrencia }: EmployeeHistoryDialogProps) {
  if (!employee) return null;

  const [salarios] = useLocalStorage<any[]>('escolinha_salarios', []);
  const [lancamentos] = useLocalStorage<any[]>('escolinha_lancamentos', []);

  // Filtra lançamentos e salários reais deste colaborador
  const empNameLower = employee.name.toLowerCase().trim();
  const lancamentosDoFuncionario = lancamentos.filter((l: any) => 
    l.descricao && l.descricao.toLowerCase().includes(empNameLower)
  );

  const salariosDoFuncionario = salarios.filter((s: any) => 
    s.colaborador && s.colaborador.toLowerCase().trim() === empNameLower
  );

  // Ocorrências agora vêm do funcionário
  const ocorrencias = employee.ocorrencias || [];

  const [novaOcorrencia, setNovaOcorrencia] = useState({
    data: '',
    tipo: 'Atestado Médico',
    descricao: '',
    gravidade: 'info'
  });

  const handleAddOcorrencia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaOcorrencia.data || !novaOcorrencia.descricao) return;

    const newOco = {
      id: crypto.randomUUID(),
      data: novaOcorrencia.data,
      tipo: novaOcorrencia.tipo,
      descricao: novaOcorrencia.descricao,
      gravidade: novaOcorrencia.gravidade
    };

    if (onAddOcorrencia) {
      onAddOcorrencia(employee.id, newOco);
    }
    setNovaOcorrencia({ data: '', tipo: 'Atestado Médico', descricao: '', gravidade: 'info' });
  };

  const getBadgeVariant = (gravidade: string) => {
    switch (gravidade) {
      case 'warning': return 'bg-amber-100 text-amber-800 hover:bg-amber-200';
      case 'success': return 'bg-green-100 text-green-800 hover:bg-green-200';
      default: return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              {employee.photoUrl && <AvatarImage src={employee.photoUrl} alt={employee.name} className="object-cover" />}
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {employee.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-2xl">{employee.name}</DialogTitle>
              <DialogDescription className="text-base mt-1 flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> {employee.role} • {employee.department}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="dados" className="h-full flex flex-col">
            
            <div className="px-6 border-b">
              <TabsList className="w-full justify-start h-auto p-0 bg-transparent gap-4">
                <TabsTrigger 
                  value="dados" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3"
                >
                  <User className="h-4 w-4 mr-2" /> Dados
                </TabsTrigger>
                <TabsTrigger 
                  value="financeiro" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3"
                >
                  <Wallet className="h-4 w-4 mr-2" /> Financeiro
                </TabsTrigger>
                <TabsTrigger 
                  value="ocorrencias" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3"
                >
                  <FileWarning className="h-4 w-4 mr-2" /> Ocorrências
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 p-6">
              
              <TabsContent value="dados" className="mt-0 space-y-4">
                <h3 className="font-semibold text-lg text-gray-800 border-b pb-2">Informações Cadastrais</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4"/> Telefone</p>
                    <p className="font-medium text-gray-900">{employee.phone || 'Não informado'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2"><Mail className="h-4 w-4"/> E-mail</p>
                    <p className="font-medium text-gray-900">{employee.email || 'Não informado'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4"/> Admissão</p>
                    <p className="font-medium text-gray-900">{formatDate(employee.hire_date)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2"><User className="h-4 w-4"/> Status</p>
                    <Badge variant={employee.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                      {employee.status === 'active' ? 'Ativo' : employee.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 col-span-1 sm:col-span-2 pt-2 border-t">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-600"/> Remuneração Cadastrada
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-emerald-700 text-base">
                        {employee.contract_type === 'horista' || (!employee.contract_type && (employee.hourly_rate || 0) > 0)
                          ? `${formatCurrency(employee.hourly_rate || 0)} / hora-aula`
                          : formatCurrency(employee.salary || 0)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {employee.contract_type === 'horista' || (!employee.contract_type && (employee.hourly_rate || 0) > 0) ? 'Horista' : 'Mensalista'}
                      </Badge>
                      {(employee.contract_type === 'horista' || (!employee.contract_type && (employee.hourly_rate || 0) > 0)) && (employee.salary || 0) > 0 && (
                        <span className="text-xs text-muted-foreground">
                          (Base fixa: {formatCurrency(employee.salary || 0)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="financeiro" className="mt-0">
                <div className="flex justify-between items-end border-b pb-2 mb-4">
                  <h3 className="font-semibold text-lg text-gray-800">Histórico de Pagamentos</h3>
                  <Badge variant="outline" className="text-xs">Registros Reais</Badge>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg mb-4 flex justify-between items-center text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Remuneração Base no Cadastro:</span>
                    <span className="font-bold text-emerald-800">
                      {employee.contract_type === 'horista' || (!employee.contract_type && (employee.hourly_rate || 0) > 0)
                        ? `${formatCurrency(employee.hourly_rate || 0)}/hora-aula (Horista)`
                        : `${formatCurrency(employee.salary || 0)}/mês (Mensalista)`}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs bg-white">
                    {employee.contract_type === 'horista' || (!employee.contract_type && (employee.hourly_rate || 0) > 0) ? 'Horista' : 'Mensalista'}
                  </Badge>
                </div>
                
                {lancamentosDoFuncionario.length === 0 && salariosDoFuncionario.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum lançamento financeiro ou pagamento registrado para este colaborador até o momento.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lancamentosDoFuncionario.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{item.descricao}</span>
                          <span className="text-xs text-gray-500">
                            {item.data ? formatDate(item.data) : 'Data não informada'} • {item.formaPagamento || 'Forma não especificada'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-green-700 block">{formatCurrency(item.valor || 0)}</span>
                          <Badge variant={item.status === 'Pago' ? 'secondary' : 'outline'} className="text-[10px] mt-0.5">
                            {item.status || 'Registrado'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {salariosDoFuncionario.filter((s: any) => !lancamentosDoFuncionario.some((l: any) => l.descricao?.includes(s.colaborador))).map((sal: any) => {
                      const total = (sal.itens || []).reduce((acc: number, cur: any) => cur.tipo === 'Provento' ? acc + Number(cur.valor || 0) : acc - Number(cur.valor || 0), 0);
                      return (
                        <div key={sal.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">Folha Salarial Registrada</span>
                            <span className="text-xs text-gray-500">{sal.itens?.length || 0} verbas cadastradas</span>
                          </div>
                          <span className="font-bold text-green-700">{formatCurrency(total)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="ocorrencias" className="mt-0">
                <div className="flex justify-between items-end border-b pb-2 mb-4">
                  <h3 className="font-semibold text-lg text-gray-800">Registro de Ocorrências</h3>
                </div>

                <form onSubmit={handleAddOcorrencia} className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">Nova Ocorrência</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="flex flex-col">
                      <label className="text-xs text-gray-600 mb-1">Data</label>
                      <input 
                        type="date" 
                        required
                        value={novaOcorrencia.data}
                        onChange={(e) => setNovaOcorrencia({ ...novaOcorrencia, data: e.target.value })}
                        className="p-1.5 text-sm border border-gray-300 rounded focus:ring-primary focus:border-primary"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs text-gray-600 mb-1">Tipo</label>
                      <select 
                        value={novaOcorrencia.tipo}
                        onChange={(e) => {
                          const tipo = e.target.value;
                          let gravidade = 'info';
                          if (['Falta Injustificada', 'Advertência'].includes(tipo)) gravidade = 'warning';
                          if (tipo === 'Elogio') gravidade = 'success';
                          setNovaOcorrencia({ ...novaOcorrencia, tipo, gravidade });
                        }}
                        className="p-1.5 text-sm border border-gray-300 rounded focus:ring-primary focus:border-primary"
                      >
                        <option value="Atestado Médico">Atestado Médico</option>
                        <option value="Falta Justificada">Falta Justificada</option>
                        <option value="Falta Injustificada">Falta Injustificada</option>
                        <option value="Advertência">Advertência</option>
                        <option value="Elogio">Elogio</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                    <div className="flex flex-col lg:col-span-2">
                      <label className="text-xs text-gray-600 mb-1">Descrição</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Detalhes da ocorrência..."
                        value={novaOcorrencia.descricao}
                        onChange={(e) => setNovaOcorrencia({ ...novaOcorrencia, descricao: e.target.value })}
                        className="p-1.5 text-sm border border-gray-300 rounded focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 text-sm font-medium rounded transition-colors">
                      Adicionar
                    </button>
                  </div>
                </form>
                
                <div className="relative border-l-2 border-gray-200 ml-3 space-y-6">
                  {ocorrencias.map(item => (
                    <div key={item.id} className="relative pl-6">
                      <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-white border-2 border-primary" />
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div>
                          <Badge className={getBadgeVariant(item.gravidade)}>{item.tipo}</Badge>
                          <p className="mt-2 text-gray-700">{item.descricao}</p>
                        </div>
                        <span className="text-sm font-medium text-gray-500 shrink-0">
                          {formatDate(item.data)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

            </ScrollArea>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
