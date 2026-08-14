import React, { useState, useRef } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Users, FileDown, Upload, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TurmaConfig, Lancamento } from '@/types/finance';
import { Aluno, Mensalidade } from '@/types/aluno';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type PaymentDetail = {
  mensalidadeId: string;
  dataPagamento: string;
  formaPagamento: string;
  desconto: number;
  multa: number;
};

const defaultTurmas: TurmaConfig[] = [
  { setor: 'Educação Infantil', nome: 'Maternal', letras: ['A', 'B'] },
  { setor: 'Ensino Fundamental 1', nome: '1º Ano', letras: ['A', 'B'] },
  { setor: 'Ensino Fundamental 2', nome: '6º Ano', letras: ['A'] },
  { setor: 'Ensino Médio', nome: '1º Ano EM', letras: [] }
];

const Alunos = () => {
  const [turmas] = useLocalStorage<TurmaConfig[]>('escolinha_turmas_v3', defaultTurmas);
  const [alunos, setAlunos] = useLocalStorage<Aluno[]>('escolinha_alunos', []);
  const [mensalidades, setMensalidades] = useLocalStorage<Mensalidade[]>('escolinha_mensalidades', []);
  const [lancamentos, setLancamentos] = useLocalStorage<Lancamento[]>('escolinha_lancamentos_v2', []);
  
  const [activeTab, setActiveTab] = useState('gestao');
  
  const [isAlunoFormOpen, setIsAlunoFormOpen] = useState(false);
  const [isEnturmarOpen, setIsEnturmarOpen] = useState(false);
  const [selectedAlunoId, setSelectedAlunoId] = useState<string>('');
  const [selectedMensalidadesIds, setSelectedMensalidadesIds] = useState<string[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<Record<string, PaymentDetail>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputMensalidadesRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataToExport = alunos.map(a => ({
      Matrícula: a.matricula,
      Nome: a.nome,
      Responsável: a.nomeResponsavel,
      'Contato Responsável': a.contatoResponsavel,
      Setor: a.setor || '',
      Classe: a.classe || '',
      Turma: a.turma || '',
      Status: a.status
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Alunos");
    XLSX.writeFile(workbook, "alunos.xlsx");
    toast.success("Planilha exportada com sucesso!");
  };

  const handleDownloadTemplate = () => {
    const templateData = [{
      Matrícula: '2024001',
      Nome: 'Joãozinho da Silva',
      Responsável: 'Maria da Silva',
      'Contato Responsável': '(11) 99999-9999',
      Setor: 'Educação Infantil',
      Classe: 'Maternal',
      Turma: 'A',
      Status: 'Ativo'
    }];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo");
    XLSX.writeFile(workbook, "modelo_alunos.xlsx");
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

        const novosAlunos: Aluno[] = data.map(row => ({
          id: crypto.randomUUID(),
          matricula: String(row.Matrícula || ''),
          nome: row.Nome || 'Aluno Sem Nome',
          nomeResponsavel: row.Responsável || '',
          contatoResponsavel: String(row['Contato Responsável'] || ''),
          setor: row.Setor,
          classe: row.Classe,
          turma: row.Turma,
          status: row.Status === 'Inativo' ? 'Inativo' : 'Ativo',
        }));

        setAlunos(prev => [...prev, ...novosAlunos]);
        toast.success(`${novosAlunos.length} alunos importados com sucesso!`);
      } catch (error) {
        console.error(error);
        toast.error("Erro ao importar planilha. Verifique o formato.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const activeAlunos = alunos.filter(a => a.status === 'Ativo').length;
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [searchAlunoMensalidade, setSearchAlunoMensalidade] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos'); // 'Todos', 'Pagas', 'Em Aberto', 'Atrasadas'
  const [turmaFilter, setTurmaFilter] = useState('Todas');

  const availableTurmas = React.useMemo(() => {
    const list = ['Todas'];
    turmas.forEach(t => {
      t.letras.forEach(letra => {
        list.push(`${t.nome} ${letra}`);
      });
    });
    return list;
  }, [turmas]);

  const displayedAlunos = alunos.filter(a => {
    if (a.status !== 'Ativo') return false;
    
    if (turmaFilter !== 'Todas') {
      const alunoTurmaCompleta = `${a.classe} ${a.turma}`;
      if (alunoTurmaCompleta !== turmaFilter) return false;
    }
    
    if (searchAlunoMensalidade.trim() !== '') {
      if (!a.nome.toLowerCase().includes(searchAlunoMensalidade.toLowerCase())) return false;
    }
    
    if (statusFilter !== 'Todos') {
      const temStatus = mensalidades.some(m => {
        if (m.alunoId !== a.id) return false;
        const isAtrasada = m.status === 'Pendente' && new Date(m.dataVencimento) < new Date(new Date().setHours(0,0,0,0));
        
        if (statusFilter === 'Pagas' && m.status === 'Pago') return true;
        if (statusFilter === 'Em Aberto' && m.status === 'Pendente' && !isAtrasada) return true;
        if (statusFilter === 'Atrasadas' && isAtrasada) return true;
        return false;
      });
      if (!temStatus) return false;
    }
    
    return true;
  });

  const handleGerarMensalidades = () => {
    const novasMensalidades: Mensalidade[] = [];
    
    alunos.forEach(aluno => {
      if (aluno.status !== 'Ativo' || !aluno.valorBase) return;
      
      if (turmaFilter !== 'Todas') {
        const alunoTurmaCompleta = `${aluno.classe} ${aluno.turma}`;
        if (alunoTurmaCompleta !== turmaFilter) return;
      }
      
      const jaExiste = mensalidades.some(m => m.alunoId === aluno.id && m.mesReferencia === selectedMonth);
      if (jaExiste) return;
      
      const valorBase = parseFloat(aluno.valorBase);
      const desconto = parseFloat(aluno.descontoMensalidade || '0');
      const valorFinal = Math.max(0, valorBase - desconto);
      
      const mesParts = selectedMonth.split('-');
      const dataVencimento = new Date(parseInt(mesParts[0]), parseInt(mesParts[1]) - 1, parseInt(aluno.diaVencimento || '5')).toISOString();
      
      novasMensalidades.push({
        id: crypto.randomUUID(),
        alunoId: aluno.id,
        mesReferencia: selectedMonth,
        valorFinal,
        dataVencimento,
        status: 'Pendente'
      });
    });
    
    if (novasMensalidades.length > 0) {
      setMensalidades([...mensalidades, ...novasMensalidades]);
      toast.success(`${novasMensalidades.length} mensalidades geradas para o mês ${selectedMonth}${turmaFilter !== 'Todas' ? ` (${turmaFilter})` : ''}.`);
    } else {
      toast.info('Todas as mensalidades já haviam sido geradas para este filtro.');
    }
  };

  const handlePagarMensalidade = () => {
    
    const novosLancamentos = [...lancamentos];
    let payCount = 0;
    
    const novasMensalidades = mensalidades.map(m => {
      if (selectedMensalidadesIds.includes(m.id) && m.status !== 'Pago') {
        const detail = paymentDetails[m.id];
        const aluno = alunos.find(a => a.id === m.alunoId);
        if (!aluno || !detail) return m;

        const valorCobrado = Math.max(0, m.valorFinal - (detail.desconto || 0) + (detail.multa || 0));

        const novoLancamento: Lancamento = {
          id: crypto.randomUUID(),
          data: new Date(detail.dataPagamento),
          unidade: 'Todas',
          descricao: `Mensalidade ${m.mesReferencia} - ${aluno.nome}`,
          categoria: 'Mensalidades',
          tipoCusto: 'Fixo',
          valor: valorCobrado,
          formaPagamento: detail.formaPagamento as any,
          tipo: 'Entrada',
          status: 'Pago',
          turmas: turmas.filter(t => t.setor === aluno.setor && t.nome === aluno.classe)
        };

        novosLancamentos.push(novoLancamento);
        payCount++;
        
        return { 
          ...m, 
          status: 'Pago' as const, 
          dataPagamento: new Date(detail.dataPagamento).toISOString(), 
          lancamentoId: novoLancamento.id 
        };
      }
      return m;
    });

    if (payCount > 0) {
      setLancamentos(novosLancamentos);
      setMensalidades(novasMensalidades);
      toast.success(`${payCount} mensalidade(s) paga(s) e registrada(s) no Financeiro!`);
    }
    
    setIsPaymentModalOpen(false);
    setSelectedMensalidadesIds([]);
  };

  const openPaymentModal = () => {
    const details: Record<string, PaymentDetail> = {};
    const today = new Date().toISOString().split('T')[0];
    selectedMensalidadesIds.forEach(id => {
      details[id] = {
        mensalidadeId: id,
        dataPagamento: today,
        formaPagamento: 'PIX',
        desconto: 0,
        multa: 0
      };
    });
    setPaymentDetails(details);
    setIsPaymentModalOpen(true);
  };

  const updatePaymentDetail = (id: string, field: keyof PaymentDetail, value: any) => {
    setPaymentDetails(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const toggleMensalidadeSelection = (id: string) => {
    setSelectedMensalidadesIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDownloadTemplateMensalidades = () => {
    const templateData = [{
      Matrícula: '2024001',
      'Mês': '2024-08'
    }];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo");
    XLSX.writeFile(workbook, "modelo_baixa_mensalidades.xlsx");
    toast.success("Modelo baixado com sucesso!");
  };

  const handleImportarMensalidades = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        
        let count = 0;
        
        const novasMensalidades = [...mensalidades];
        const novosLancamentos = [...lancamentos];

        data.forEach(row => {
          const matricula = String(row.Matrícula);
          const mes = String(row['Mês'] || selectedMonth);
          
          const aluno = alunos.find(a => a.matricula === matricula);
          if (aluno) {
            const mensalidadeIndex = novasMensalidades.findIndex(m => m.alunoId === aluno.id && m.mesReferencia === mes);
            
            if (mensalidadeIndex >= 0) {
              const m = novasMensalidades[mensalidadeIndex];
              if (m.status === 'Pendente') {
                const novoLancamento: Lancamento = {
                  id: crypto.randomUUID(),
                  data: new Date(),
                  unidade: 'Todas',
                  descricao: `Mensalidade ${m.mesReferencia} - ${aluno.nome}`,
                  categoria: 'Mensalidades',
                  tipoCusto: 'Fixo',
                  valor: m.valorFinal,
                  formaPagamento: 'PIX',
                  tipo: 'Entrada',
                  status: 'Pago',
                  turmas: turmas.filter(t => t.setor === aluno.setor && t.nome === aluno.classe)
                };
                novosLancamentos.push(novoLancamento);
                
                novasMensalidades[mensalidadeIndex] = {
                  ...m,
                  status: 'Pago',
                  dataPagamento: new Date().toISOString(),
                  lancamentoId: novoLancamento.id
                };
                count++;
              }
            }
          }
        });

        setMensalidades(novasMensalidades);
        setLancamentos(novosLancamentos);
        toast.success(`${count} mensalidades marcadas como pagas e registradas no Financeiro!`);
      } catch (error) {
        console.error(error);
        toast.error("Erro ao importar planilha. Verifique o formato.");
      }
      if (fileInputMensalidadesRef.current) fileInputMensalidadesRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const groupedAlunos = alunos.reduce((acc, aluno) => {
    if (aluno.setor && aluno.classe && aluno.turma && aluno.status === 'Ativo') {
      const groupKey = `${aluno.setor} - ${aluno.classe} (Turma ${aluno.turma})`;
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(aluno);
    }
    return acc;
  }, {} as Record<string, Aluno[]>);

  return (
    <div className="space-y-6">
      <PageHeader title="Alunos" description="Gestão de estudantes e enturmações">
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAlunoFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Aluno
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alunos.length}</div>
            <p className="text-xs text-muted-foreground">{activeAlunos} ativos</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="gestao">Gestão de Alunos</TabsTrigger>
          <TabsTrigger value="turmas">Turmas e Contratos</TabsTrigger>
          <TabsTrigger value="mensalidades">Mensalidades</TabsTrigger>
        </TabsList>

        <TabsContent value="gestao" className="space-y-4">
          <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Listagem de Alunos</CardTitle>
            <CardDescription>Cadastre e gerencie a enturmação dos estudantes.</CardDescription>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 items-center">
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matrícula</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Enturmação (Setor / Classe / Turma)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alunos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    Nenhum aluno cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                alunos.map(aluno => (
                  <TableRow key={aluno.id}>
                    <TableCell className="font-medium text-muted-foreground">{aluno.matricula}</TableCell>
                    <TableCell className="font-bold">{aluno.nome}</TableCell>
                    <TableCell>{aluno.nomeResponsavel}</TableCell>
                    <TableCell>
                      {aluno.setor && aluno.classe && aluno.turma ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground uppercase">{aluno.setor}</span>
                          <span className="inline-flex items-center gap-1 text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full w-fit">
                            {aluno.classe} - {aluno.turma}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Não enturmado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={aluno.status === 'Ativo' ? 'secondary' : 'destructive'} className={aluno.status === 'Ativo' ? 'badge-success' : ''}>
                        {aluno.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setSelectedAlunoId(aluno.id);
                          setIsEnturmarOpen(true);
                        }}
                      >
                        Enturmar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="turmas" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Turmas e Contratos</CardTitle>
            <CardDescription>Visão geral de alunos agrupados por turma e seus detalhes financeiros.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {Object.keys(groupedAlunos).length === 0 ? (
              <div className="text-center text-muted-foreground py-8">Nenhum aluno enturmado ainda.</div>
            ) : (
              Object.entries(groupedAlunos).map(([groupName, groupAlunos]) => (
                <div key={groupName} className="space-y-3">
                  <h3 className="font-semibold text-lg border-b pb-2">{groupName}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Matrícula</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Valor Base</TableHead>
                        <TableHead>Desconto</TableHead>
                        <TableHead>Valor Final</TableHead>
                        <TableHead>Vencimento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupAlunos.map(aluno => {
                        const valorBase = parseFloat(aluno.valorBase || '0');
                        const desconto = parseFloat(aluno.descontoMensalidade || '0');
                        const valorFinal = Math.max(0, valorBase - desconto);
                        
                        return (
                          <TableRow key={aluno.id}>
                            <TableCell className="font-medium text-muted-foreground">{aluno.matricula}</TableCell>
                            <TableCell className="font-bold">{aluno.nome}</TableCell>
                            <TableCell>
                              {valorBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </TableCell>
                            <TableCell className="text-destructive">
                              {desconto > 0 ? desconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                            </TableCell>
                            <TableCell className="font-medium text-primary">
                              {valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </TableCell>
                            <TableCell>
                              Dia {aluno.diaVencimento || '5'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="mensalidades" className="space-y-4">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Gestão de Mensalidades</CardTitle>
              <CardDescription>Busque alunos ou gerencie cobranças por mês.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {selectedMensalidadesIds.length > 0 && (
                <Button 
                  variant="default" 
                  className="bg-green-600 hover:bg-green-700" 
                  onClick={openPaymentModal}
                >
                  Dar Baixa em {selectedMensalidadesIds.length} Selecionada(s)
                </Button>
              )}
              
              <Input
                placeholder="Buscar aluno..."
                value={searchAlunoMensalidade}
                onChange={e => setSearchAlunoMensalidade(e.target.value)}
                className="w-48"
              />
              <div className="h-6 w-px bg-border mx-1"></div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Pagas">Pagas</SelectItem>
                  <SelectItem value="Em Aberto">Em Aberto</SelectItem>
                  <SelectItem value="Atrasadas">Atrasadas</SelectItem>
                </SelectContent>
              </Select>

              <div className="h-6 w-px bg-border mx-1"></div>
              
              <Select value={turmaFilter} onValueChange={setTurmaFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Turma" />
                </SelectTrigger>
                <SelectContent>
                  {availableTurmas.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="h-6 w-px bg-border mx-1"></div>
              
              <Input 
                type="month" 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(e.target.value)} 
                className="w-48"
              />
              <Button onClick={handleGerarMensalidades}>
                Gerar Mensalidades
              </Button>
              
              <div className="h-6 w-px bg-border mx-1"></div>
              
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                ref={fileInputMensalidadesRef} 
                onChange={handleImportarMensalidades} 
                className="hidden" 
              />
              <Button 
                variant="outline"
                onClick={handleDownloadTemplateMensalidades}
                title="Baixar modelo"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Modelo
              </Button>
              <Button 
                variant="outline"
                onClick={() => fileInputMensalidadesRef.current?.click()}
                title="Importar pagamentos em lote"
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar Pagamentos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {displayedAlunos.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {searchAlunoMensalidade ? 'Nenhum aluno encontrado.' : 'Nenhum aluno ativo no sistema.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">Aluno</TableHead>
                    <TableHead>Mensalidades</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedAlunos.map(aluno => {
                    const alunoMensalidades = mensalidades
                      .filter(m => {
                        if (m.alunoId !== aluno.id) return false;
                        if (statusFilter === 'Todos') return true;
                        
                        const isAtrasada = m.status === 'Pendente' && new Date(m.dataVencimento) < new Date(new Date().setHours(0,0,0,0));
                        if (statusFilter === 'Pagas' && m.status === 'Pago') return true;
                        if (statusFilter === 'Em Aberto' && m.status === 'Pendente' && !isAtrasada) return true;
                        if (statusFilter === 'Atrasadas' && isAtrasada) return true;
                        return false;
                      })
                      .sort((a, b) => a.mesReferencia.localeCompare(b.mesReferencia));
                      
                    return (
                      <TableRow key={aluno.id}>
                        <TableCell>
                          <div className="font-bold">{aluno.nome}</div>
                          <div className="text-xs text-muted-foreground">
                            {aluno.setor ? `${aluno.setor} - ${aluno.classe} ${aluno.turma}` : 'Não enturmado'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {alunoMensalidades.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">Nenhuma fatura gerada</span>
                            ) : (
                              alunoMensalidades.map(mensalidade => {
                                const isAtrasada = mensalidade.status === 'Pendente' && new Date(mensalidade.dataVencimento) < new Date(new Date().setHours(0,0,0,0));
                                const statusText = mensalidade.status === 'Pago' ? 'Pago' : (isAtrasada ? 'Atrasada' : 'Pendente');
                                
                                const isSelected = selectedMensalidadesIds.includes(mensalidade.id);
                                
                                const [ano, mes] = mensalidade.mesReferencia.split('-');
                                const mesFormatado = `${mes}/${ano}`;
                                
                                return (
                                  <Badge 
                                    key={mensalidade.id}
                                    variant={mensalidade.status === 'Pago' ? 'default' : (isAtrasada ? 'destructive' : 'outline')} 
                                    className={`cursor-pointer transition-all px-3 py-1 ${mensalidade.status === 'Pago' ? 'bg-green-500 hover:bg-green-600 text-white border-transparent' : 'hover:bg-primary/10'} ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                                    onClick={() => {
                                      if (mensalidade.status === 'Pendente') {
                                        toggleMensalidadeSelection(mensalidade.id);
                                      }
                                    }}
                                    title={mensalidade.status === 'Pago' ? 'Já está pago' : 'Clique para selecionar/deselecionar'}
                                  >
                                    <span className="font-medium mr-2">{mesFormatado}</span>
                                    <span className="opacity-80">({statusText})</span>
                                  </Badge>
                                );
                              })
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      </Tabs>

      <Dialog open={isAlunoFormOpen} onOpenChange={setIsAlunoFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Aluno</DialogTitle>
            <DialogDescription>Cadastre um novo aluno no sistema.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            
            // Gerar matrícula automática
            const currentYear = new Date().getFullYear().toString();
            let proximoNumero = 1;
            
            const matriculasAnoAtual = alunos
              .map(a => a.matricula)
              .filter(m => m.startsWith(currentYear))
              .map(m => parseInt(m.substring(4)))
              .filter(n => !isNaN(n));
              
            if (matriculasAnoAtual.length > 0) {
              proximoNumero = Math.max(...matriculasAnoAtual) + 1;
            }
            
            const matriculaGerada = `${currentYear}${proximoNumero.toString().padStart(3, '0')}`;
            
            const novoAluno: Aluno = {
              id: crypto.randomUUID(),
              nome: formData.get('nome') as string,
              matricula: matriculaGerada,
              nomeResponsavel: formData.get('responsavel') as string,
              contatoResponsavel: formData.get('contato') as string,
              status: 'Ativo'
            };
            setAlunos([...alunos, novoAluno]);
            toast.success(`Aluno cadastrado! Matrícula: ${matriculaGerada}`);
            setIsAlunoFormOpen(false);
          }} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Aluno *</label>
              <Input name="nome" required placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Responsável *</label>
              <Input name="responsavel" required placeholder="Nome do pai, mãe ou tutor" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contato do Responsável *</label>
              <Input name="contato" required placeholder="(00) 00000-0000" />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsAlunoFormOpen(false)}>Cancelar</Button>
              <Button type="submit">Cadastrar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEnturmarOpen} onOpenChange={setIsEnturmarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enturmar Aluno</DialogTitle>
            <DialogDescription>Vincule o aluno a uma classe e configure os pagamentos.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const turmaInfo = formData.get('turmaInfo') as string;
            if (!turmaInfo) {
              toast.error('Selecione uma turma válida.');
              return;
            }
            
            const [setor, classe, turmaStr] = turmaInfo.split('|');
            const valorBase = formData.get('valorBase') as string;
            const descontoMensalidade = formData.get('desconto') as string;
            const diaVencimento = formData.get('vencimento') as string;
            
            setAlunos(alunos.map(a => {
              if (a.id === selectedAlunoId) {
                return { 
                  ...a, 
                  setor, 
                  classe, 
                  turma: turmaStr,
                  valorBase,
                  descontoMensalidade,
                  diaVencimento
                };
              }
              return a;
            }));
            
            // Gerar 11 parcelas automaticamente (Janeiro a Novembro)
            const currentYear = new Date().getFullYear();
            const vBase = parseFloat(valorBase);
            const desc = parseFloat(descontoMensalidade || '0');
            const vFinal = Math.max(0, vBase - desc);
            const venc = diaVencimento || '5';

            const novasMensalidades = [...mensalidades];
            
            for (let i = 1; i <= 11; i++) {
              const mesRef = `${currentYear}-${String(i).padStart(2, '0')}`;
              const dataVenc = new Date(currentYear, i - 1, parseInt(venc)).toISOString();
              
              const jaExiste = novasMensalidades.some(m => m.alunoId === selectedAlunoId && m.mesReferencia === mesRef);
              if (!jaExiste) {
                novasMensalidades.push({
                  id: crypto.randomUUID(),
                  alunoId: selectedAlunoId,
                  mesReferencia: mesRef,
                  valorFinal: vFinal,
                  dataVencimento: dataVenc,
                  status: 'Pendente'
                });
              }
            }
            setMensalidades(novasMensalidades);
            
            toast.success('Aluno enturmado e 11 parcelas geradas com sucesso!');
            setIsEnturmarOpen(false);
          }} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Selecione a Turma *</label>
              <Select name="turmaInfo" required>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha a turma" />
                </SelectTrigger>
                <SelectContent>
                  {turmas.map(t => {
                    if (t.letras.length === 0) {
                      return <SelectItem key={`${t.setor}|${t.nome}|Geral`} value={`${t.setor}|${t.nome}|Geral`}>{t.setor} - {t.nome} (Geral)</SelectItem>;
                    }
                    return t.letras.map(l => (
                      <SelectItem key={`${t.setor}|${t.nome}|${l}`} value={`${t.setor}|${t.nome}|${l}`}>
                        {t.setor} - {t.nome} (Turma {l})
                      </SelectItem>
                    ));
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Base da Mensalidade (R$) *</label>
              <Input name="valorBase" type="number" min="0" step="0.01" required placeholder="Ex: 500.00" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Desconto Mensalidade (R$)</label>
                <Input name="desconto" type="number" min="0" step="0.01" placeholder="Ex: 50.00" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Dia de Vencimento</label>
                <Input name="vencimento" type="number" min="1" max="31" defaultValue="5" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsEnturmarOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar Enturmação</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={isPaymentModalOpen} onOpenChange={(open) => !open && setIsPaymentModalOpen(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Baixar {selectedMensalidadesIds.length} Mensalidade(s)</DialogTitle>
            <DialogDescription>
              Informe os detalhes de pagamento individualmente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {mensalidades.filter(m => selectedMensalidadesIds.includes(m.id)).map(m => {
              const aluno = alunos.find(a => a.id === m.alunoId);
              const detail = paymentDetails[m.id];
              if (!detail) return null;
              
              const valorCobrado = Math.max(0, m.valorFinal - (detail.desconto || 0) + (detail.multa || 0));

              return (
                <div key={m.id} className="border p-4 rounded-md space-y-3 bg-card shadow-sm">
                  <div className="flex justify-between items-center border-b pb-2">
                    <div className="font-semibold text-base">{aluno?.nome} <span className="text-muted-foreground font-normal text-sm ml-2">Ref: {m.mesReferencia}</span></div>
                    <div className="font-bold text-primary">Total: {valorCobrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Data do Pagamento</label>
                      <Input type="date" value={detail.dataPagamento} onChange={(e) => updatePaymentDetail(m.id, 'dataPagamento', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Forma Pag.</label>
                      <Select value={detail.formaPagamento} onValueChange={(val) => updatePaymentDetail(m.id, 'formaPagamento', val)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PIX">PIX</SelectItem>
                          <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="Cartão">Cartão</SelectItem>
                          <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                          <SelectItem value="Boleto">Boleto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-destructive">Desconto (R$)</label>
                      <Input type="number" min="0" step="0.01" value={detail.desconto || ''} onChange={(e) => updatePaymentDetail(m.id, 'desconto', parseFloat(e.target.value) || 0)} placeholder="0,00" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-amber-600">Multa (R$)</label>
                      <Input type="number" min="0" step="0.01" value={detail.multa || ''} onChange={(e) => updatePaymentDetail(m.id, 'multa', parseFloat(e.target.value) || 0)} placeholder="0,00" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancelar</Button>
            <Button onClick={handlePagarMensalidade}>Confirmar Pagamentos</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Alunos;
