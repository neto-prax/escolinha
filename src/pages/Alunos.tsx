import React, { useState, useRef } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, Users, FileDown, Upload, Download, MoreHorizontal, UserCog, FileText, UserPlus,
  ChevronDown, ChevronRight, ChevronUp, FolderTree, AlertCircle, CheckCircle2, DollarSign, AlertTriangle, GraduationCap, Trash2
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TurmaConfig, Lancamento } from '@/types/finance';
import { Aluno, Mensalidade } from '@/types/aluno';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { usePermissions } from '@/hooks/usePermissions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [turmas, setTurmas] = useLocalStorage<TurmaConfig[]>('escolinha_turmas_v3', defaultTurmas);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [alunos, setAlunos] = useLocalStorage<Aluno[]>('escolinha_alunos', []);
  const [mensalidades, setMensalidades] = useLocalStorage<Mensalidade[]>('escolinha_mensalidades', []);
  const [lancamentos, setLancamentos] = useLocalStorage<Lancamento[]>('escolinha_lancamentos_v2', []);
  const [activeTab, setActiveTab] = useState('gestao');

  const { canAccessTab } = usePermissions();
  const canAccessGestao = canAccessTab('alunos', 'gestao');
  const canAccessTurmas = canAccessTab('alunos', 'turmas');
  const canAccessMensalidades = canAccessTab('alunos', 'mensalidades');

  const availableAlunosTabs = [
    canAccessGestao && 'gestao',
    canAccessTurmas && 'turmas',
    canAccessMensalidades && 'mensalidades',
  ].filter(Boolean) as string[];

  const effectiveActiveTab = availableAlunosTabs.includes(activeTab)
    ? activeTab
    : availableAlunosTabs[0] || 'gestao';
  
  const [isAlunoFormOpen, setIsAlunoFormOpen] = useState(false);
  const [editingAlunoId, setEditingAlunoId] = useState<string | null>(null);
  const [isEnturmarOpen, setIsEnturmarOpen] = useState(false);
  const [selectedAlunosIds, setSelectedAlunosIds] = useState<string[]>([]);
  const [selectedMensalidadesIds, setSelectedMensalidadesIds] = useState<string[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [mensalidadesToDelete, setMensalidadesToDelete] = useState<string[]>([]);
  const [paymentDetails, setPaymentDetails] = useState<Record<string, PaymentDetail>>({});
  
  const [enturmarValorBase, setEnturmarValorBase] = useState('');
  const [enturmarTurmaInfo, setEnturmarTurmaInfo] = useState('');

  const [expandedTurmas, setExpandedTurmas] = useState<Record<string, boolean>>({});
  const [expandedAlunos, setExpandedAlunos] = useState<Record<string, boolean>>({});
  const [turmasFilterText, setTurmasFilterText] = useState('');
  const [apenasInadimplentes, setApenasInadimplentes] = useState(false);

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
      Valor: a.valorBase ? parseFloat(a.valorBase) : '',
      Desconto: a.descontoMensalidade ? parseFloat(a.descontoMensalidade) : '',
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
      Valor: 450.00,
      Desconto: 50.00,
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
        const currentYear = new Date().getFullYear().toString();
        const currentYearNum = new Date().getFullYear();
        let proximoNumero = 1;
        
        const matriculasAnoAtual = alunos
          .map(a => a.matricula)
          .filter(m => m.startsWith(currentYear))
          .map(m => parseInt(m.substring(4)))
          .filter(n => !isNaN(n));
          
        if (matriculasAnoAtual.length > 0) {
          proximoNumero = Math.max(...matriculasAnoAtual) + 1;
        }

        const parseCurrencyNumber = (val: any): string => {
          if (val === undefined || val === null || val === '') return '';
          if (typeof val === 'number') return String(val);
          const str = String(val).replace('R$', '').replace(/\s/g, '').replace(',', '.');
          const num = parseFloat(str);
          return isNaN(num) ? '' : String(num);
        };

        const novosAlunos: Aluno[] = [];
        const novasMensalidadesGeradas: Mensalidade[] = [];

        data.forEach((row: any, index: number) => {
          const matriculaGerada = `${currentYear}${(proximoNumero + index).toString().padStart(3, '0')}`;
          
          // Fallbacks mais resilientes caso o usuário não use o modelo exato
          const rawSetor = row.Setor ?? row.Segmento ?? row.Categoria;
          const rawClasse = row.Classe ?? (row.Turma && !row.Classe ? row.Turma : null);
          const rawTurma = row.Classe ? row.Turma : (row.Letra ?? null);

          // Extração de valor e desconto com suporte a variações de cabeçalho
          const rawValor = row['Valor'] ?? row['valor'] ?? row['VALOR'] ?? row['Valor da Mensalidade'] ?? row['Valor Mensalidade'] ?? row['Valor Base'] ?? row['Mensalidade'];
          const rawDesconto = row['Desconto'] ?? row['desconto'] ?? row['DESCONTO'] ?? row['Desconto Mensalidade'] ?? row['Desconto (R$)'];
          const rawVencimento = row['Dia de Vencimento'] ?? row['Dia Vencimento'] ?? row['Vencimento'] ?? row['vencimento'];

          const valorBase = parseCurrencyNumber(rawValor);
          const descontoMensalidade = parseCurrencyNumber(rawDesconto);
          const diaVencimento = rawVencimento ? String(parseInt(String(rawVencimento))) : '10';

          const alunoId = crypto.randomUUID();

          const alunoObj: Aluno = {
            id: alunoId,
            matricula: matriculaGerada,
            nome: row.Nome || 'Aluno Sem Nome',
            nomeResponsavel: row.Responsável || '',
            contatoResponsavel: String(row['Contato Responsável'] || ''),
            setor: rawSetor ? String(rawSetor).trim() : 'Sem Setor',
            classe: rawClasse ? String(rawClasse).trim() : 'Geral',
            turma: rawTurma ? String(rawTurma).trim() : '',
            status: row.Status === 'Inativo' ? 'Inativo' : 'Ativo',
            valorBase: valorBase || undefined,
            descontoMensalidade: descontoMensalidade || undefined,
            diaVencimento: diaVencimento && !isNaN(Number(diaVencimento)) ? diaVencimento : '10',
          };

          novosAlunos.push(alunoObj);

          // Se tiver valor definido e status ativo, gerar as mensalidades do ano letivo
          if (valorBase && parseFloat(valorBase) > 0 && alunoObj.status === 'Ativo') {
            const vBase = parseFloat(valorBase);
            const desc = parseFloat(descontoMensalidade || '0');
            const vFinal = Math.max(0, vBase - desc);
            const venc = parseInt(diaVencimento) || 10;

            for (let i = 1; i <= 11; i++) {
              const mesRef = `${currentYearNum}-${String(i).padStart(2, '0')}`;
              const dataVenc = new Date(currentYearNum, i - 1, venc).toISOString();

              novasMensalidadesGeradas.push({
                id: crypto.randomUUID(),
                alunoId,
                mesReferencia: mesRef,
                valorFinal: vFinal,
                dataVencimento: dataVenc,
                status: 'Pendente'
              });
            }
          }
        });

        setAlunos(prev => [...prev, ...novosAlunos]);
        if (novasMensalidadesGeradas.length > 0) {
          setMensalidades(prev => [...prev, ...novasMensalidadesGeradas]);
        }

        // Atualizar as turmas com base nos dados da planilha
        const novasTurmas: TurmaConfig[] = JSON.parse(JSON.stringify(turmas));
        
        novosAlunos.forEach(aluno => {
          // Dividir por vírgula ou por hífen (com espaços ao redor no caso de classe/setor para não quebrar "Sub-15")
          const setores = aluno.setor ? aluno.setor.split(/\s*,\s*|\s+-\s+/).map(s => s.trim()).filter(Boolean) : ['Sem Setor'];
          const classes = aluno.classe ? aluno.classe.split(/\s*,\s*|\s+-\s+/).map(c => c.trim()).filter(Boolean) : ['Geral'];
          // Para a letra da turma, podemos ser mais diretos com hífen (ex: "A-B")
          const turmasLetras = aluno.turma ? aluno.turma.split(/\s*,\s*|\s*-\s*/).map(t => t.trim()).filter(Boolean) : [''];
          
          setores.forEach(setor => {
            classes.forEach(classe => {
              const index = novasTurmas.findIndex(t => t.nome === classe && t.setor === setor);
              if (index !== -1) {
                turmasLetras.forEach(turmaLetra => {
                  if (turmaLetra && !novasTurmas[index].letras.includes(turmaLetra)) {
                    novasTurmas[index].letras.push(turmaLetra);
                  }
                });
                novasTurmas[index].letras.sort();
              } else {
                novasTurmas.push({
                  setor,
                  nome: classe,
                  letras: turmasLetras.filter(t => t !== '')
                });
              }
            });
          });
        });
        
        setTurmas(novasTurmas);
        const mensalidadesMsg = novasMensalidadesGeradas.length > 0 
          ? ` e ${novasMensalidadesGeradas.length} mensalidades geradas` 
          : '';
        toast.success(`${novosAlunos.length} alunos importados com sucesso${mensalidadesMsg}!`);
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

  if (sortConfig) {
    displayedAlunos.sort((a, b) => {
      let valA = '';
      let valB = '';
      
      if (sortConfig.key === 'matricula') {
        valA = String(a.matricula || '').toLowerCase();
        valB = String(b.matricula || '').toLowerCase();
      } else if (sortConfig.key === 'nome') {
        valA = String(a.nome || '').toLowerCase();
        valB = String(b.nome || '').toLowerCase();
      } else if (sortConfig.key === 'responsavel') {
        valA = String(a.nomeResponsavel || '').toLowerCase();
        valB = String(b.nomeResponsavel || '').toLowerCase();
      } else if (sortConfig.key === 'enturmacao') {
        valA = `${a.setor} ${a.classe} ${a.turma}`.toLowerCase();
        valB = `${b.setor} ${b.classe} ${b.turma}`.toLowerCase();
      } else if (sortConfig.key === 'status') {
        valA = String(a.status || '').toLowerCase();
        valB = String(b.status || '').toLowerCase();
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

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

  const handleDeleteMensalidades = () => {
    if (mensalidadesToDelete.length === 0) return;

    const ids = new Set(mensalidadesToDelete);
    const linkedLancamentoIds = new Set(
      mensalidades
        .filter((mensalidade) => ids.has(mensalidade.id) && mensalidade.lancamentoId)
        .map((mensalidade) => mensalidade.lancamentoId as string),
    );

    setMensalidades(mensalidades.filter((mensalidade) => !ids.has(mensalidade.id)));
    if (linkedLancamentoIds.size > 0) {
      setLancamentos(lancamentos.filter((lancamento) => !linkedLancamentoIds.has(lancamento.id)));
    }
    setSelectedMensalidadesIds((selected) => selected.filter((id) => !ids.has(id)));
    toast.success(
      mensalidadesToDelete.length === 1
        ? 'Mensalidade excluída com sucesso!'
        : `${mensalidadesToDelete.length} mensalidades excluídas com sucesso!`,
    );
    setMensalidadesToDelete([]);
  };

  const handleDownloadTemplateMensalidades = () => {
    const dataToExport: any[] = [];
    
    displayedAlunos.forEach(aluno => {
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

      alunoMensalidades.forEach(m => {
        const isAtrasada = m.status === 'Pendente' && new Date(m.dataVencimento) < new Date(new Date().setHours(0,0,0,0));
        const statusText = m.status === 'Pago' ? 'Pago' : (isAtrasada ? 'Vencido' : 'Pendente');
        
        dataToExport.push({
          'Matrícula': aluno.matricula,
          'Nome': aluno.nome,
          'Mês': m.mesReferencia,
          'Valor Final': m.valorFinal,
          'Data Vencimento': new Date(m.dataVencimento).toLocaleDateString('pt-BR'),
          'Status': statusText
        });
      });
    });

    if (dataToExport.length === 0) {
      dataToExport.push({
        'Matrícula': '2024001',
        'Nome': 'Aluno Exemplo',
        'Mês': '2024-08',
        'Valor Final': 500.00,
        'Data Vencimento': '05/08/2024',
        'Status': 'Pendente'
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Mensalidades");
    XLSX.writeFile(workbook, "planilha_mensalidades.xlsx");
    toast.success("Planilha de mensalidades gerada com sucesso!");
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
          const statusPlanilha = String(row['Status'] || '').toLowerCase();
          
          const aluno = alunos.find(a => a.matricula === matricula);
          if (aluno) {
            const mensalidadeIndex = novasMensalidades.findIndex(m => m.alunoId === aluno.id && m.mesReferencia === mes);
            
            if (mensalidadeIndex >= 0) {
              const m = novasMensalidades[mensalidadeIndex];
              // Se o status da planilha for 'pago' ou se for a planilha antiga sem status, marca como pago
              if (m.status === 'Pendente' && (statusPlanilha === 'pago' || !row['Status'])) {
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

  const isMensalidadeAtrasada = (m: Mensalidade) => {
    if (m.status === 'Pago') return false;
    if (m.status === 'Atrasado') return true;
    if (m.status === 'Pendente') {
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const dueDate = new Date(m.dataVencimento);
      return dueDate.getTime() < todayMidnight.getTime();
    }
    return false;
  };

  const getAlunoFinanceiroInfo = (aluno: Aluno) => {
    const alunoMensalidades = mensalidades.filter(m => m.alunoId === aluno.id);
    const atrasadas = alunoMensalidades.filter(isMensalidadeAtrasada);
    const pagas = alunoMensalidades.filter(m => m.status === 'Pago');
    const pendentes = alunoMensalidades.filter(m => m.status === 'Pendente' && !isMensalidadeAtrasada(m));

    const valorBase = parseFloat(aluno.valorBase || '0') || 0;
    const desconto = parseFloat(aluno.descontoMensalidade || '0') || 0;
    const valorLiquido = Math.max(0, valorBase - desconto);

    const totalAtrasado = atrasadas.reduce((sum, m) => sum + (Number(m.valorFinal) || 0), 0);
    const totalPago = pagas.reduce((sum, m) => sum + (Number(m.valorFinal) || 0), 0);
    const totalPendente = pendentes.reduce((sum, m) => sum + (Number(m.valorFinal) || 0), 0);

    const isInadimplente = atrasadas.length > 0;

    return {
      mensalidades: alunoMensalidades.sort((a, b) => a.mesReferencia.localeCompare(b.mesReferencia)),
      atrasadas,
      pagas,
      pendentes,
      valorBase,
      desconto,
      valorLiquido,
      totalAtrasado,
      totalPago,
      totalPendente,
      isInadimplente
    };
  };

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDateBR = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const formatMonthRef = (mesRef?: string) => {
    if (!mesRef) return '-';
    const [ano, mes] = mesRef.split('-');
    if (ano && mes) {
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const mesIndex = parseInt(mes, 10) - 1;
      const nomeMes = meses[mesIndex] || mes;
      return `${nomeMes}/${ano}`;
    }
    return mesRef;
  };

  const groupedAlunos = alunos.reduce((acc, aluno) => {
    if (aluno.status === 'Ativo') {
      const groupKey = (aluno.setor && aluno.classe && aluno.turma)
        ? `${aluno.setor} - ${aluno.classe} (Turma ${aluno.turma})`
        : (aluno.setor || aluno.classe)
          ? `${aluno.setor || ''} ${aluno.classe || ''} (Sem Turma)`.trim()
          : 'Alunos Sem Turma Definida';
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(aluno);
    }
    return acc;
  }, {} as Record<string, Aluno[]>);

  const turmasTreeData = Object.entries(groupedAlunos).map(([groupName, groupAlunos]) => {
    const alunosWithFin = groupAlunos.map(aluno => ({
      aluno,
      fin: getAlunoFinanceiroInfo(aluno)
    }));

    const totalAlunos = alunosWithFin.length;
    const totalBase = alunosWithFin.reduce((sum, a) => sum + a.fin.valorBase, 0);
    const totalDesconto = alunosWithFin.reduce((sum, a) => sum + a.fin.desconto, 0);
    const totalLiquido = alunosWithFin.reduce((sum, a) => sum + a.fin.valorLiquido, 0);
    const totalAtrasado = alunosWithFin.reduce((sum, a) => sum + a.fin.totalAtrasado, 0);
    const totalPago = alunosWithFin.reduce((sum, a) => sum + a.fin.totalPago, 0);
    const inadimplentesCount = alunosWithFin.filter(a => a.fin.isInadimplente).length;

    return {
      groupName,
      groupAlunos: alunosWithFin,
      totalAlunos,
      totalBase,
      totalDesconto,
      totalLiquido,
      totalAtrasado,
      totalPago,
      inadimplentesCount
    };
  });

  const filteredTurmasTree = turmasTreeData.filter(turma => {
    const ft = turmasFilterText.trim().toLowerCase();
    const matchesFilterText = 
      !ft ||
      turma.groupName.toLowerCase().includes(ft) ||
      turma.groupAlunos.some(a => 
        a.aluno.nome.toLowerCase().includes(ft) ||
        a.aluno.matricula.toLowerCase().includes(ft)
      );

    if (!matchesFilterText) return false;

    if (apenasInadimplentes && turma.inadimplentesCount === 0) {
      return false;
    }

    return true;
  }).map(turma => {
    let visibleAlunos = turma.groupAlunos;
    if (apenasInadimplentes) {
      visibleAlunos = visibleAlunos.filter(a => a.fin.isInadimplente);
    }
    if (turmasFilterText.trim()) {
      const ft = turmasFilterText.trim().toLowerCase();
      if (!turma.groupName.toLowerCase().includes(ft)) {
        visibleAlunos = visibleAlunos.filter(a => 
          a.aluno.nome.toLowerCase().includes(ft) ||
          a.aluno.matricula.toLowerCase().includes(ft)
        );
      }
    }
    return {
      ...turma,
      visibleAlunos
    };
  });

  const globalTotalAlunosEnturmados = turmasTreeData.reduce((sum, t) => sum + t.totalAlunos, 0);
  const globalTotalBase = turmasTreeData.reduce((sum, t) => sum + t.totalBase, 0);
  const globalTotalDesconto = turmasTreeData.reduce((sum, t) => sum + t.totalDesconto, 0);
  const globalTotalLiquidoMensal = turmasTreeData.reduce((sum, t) => sum + t.totalLiquido, 0);
  const globalTotalAtrasado = turmasTreeData.reduce((sum, t) => sum + t.totalAtrasado, 0);
  const globalTotalInadimplentes = turmasTreeData.reduce((sum, t) => sum + t.inadimplentesCount, 0);
  const globalTaxaAdimplencia = globalTotalAlunosEnturmados > 0 
    ? (((globalTotalAlunosEnturmados - globalTotalInadimplentes) / globalTotalAlunosEnturmados) * 100).toFixed(1) 
    : '100';

  const isTurmaOpen = (groupName: string) => {
    return expandedTurmas[groupName] ?? true;
  };

  const toggleTurma = (groupName: string) => {
    setExpandedTurmas(prev => ({
      ...prev,
      [groupName]: !isTurmaOpen(groupName)
    }));
  };

  const toggleAluno = (alunoId: string) => {
    setExpandedAlunos(prev => ({
      ...prev,
      [alunoId]: !prev[alunoId]
    }));
  };

  const expandAllTurmas = (open: boolean) => {
    const newState: Record<string, boolean> = {};
    turmasTreeData.forEach(t => {
      newState[t.groupName] = open;
    });
    setExpandedTurmas(newState);
  };

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

      <Tabs value={effectiveActiveTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          {canAccessGestao && <TabsTrigger value="gestao">Gestão de Alunos</TabsTrigger>}
          {canAccessTurmas && <TabsTrigger value="turmas">Turmas e Contratos</TabsTrigger>}
          {canAccessMensalidades && <TabsTrigger value="mensalidades">Mensalidades</TabsTrigger>}
        </TabsList>

        <TabsContent value="gestao" className="space-y-4">
          <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Listagem de Alunos</CardTitle>
            <CardDescription>Cadastre e gerencie a enturmação dos estudantes.</CardDescription>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 items-center">
            {selectedAlunosIds.length > 0 && (
              <Button 
                variant="default"
                className="bg-primary hover:bg-primary/90"
                onClick={() => {
                  const alunoEdit = selectedAlunosIds.length === 1 ? alunos.find(a => a.id === selectedAlunosIds[0]) : null;
                  setEnturmarValorBase(alunoEdit?.valorBase || '');
                  setEnturmarTurmaInfo(alunoEdit?.setor ? `${alunoEdit.setor}|${alunoEdit.classe}|${alunoEdit.turma || 'Geral'}` : '');
                  setIsEnturmarOpen(true);
                }}
              >
                Enturmar ({selectedAlunosIds.length})
              </Button>
            )}
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
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={alunos.length > 0 && selectedAlunosIds.length === alunos.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAlunosIds(alunos.map(a => a.id));
                          } else {
                            setSelectedAlunosIds([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => handleSort('matricula')} title="Clique para ordenar">
                        Matrícula {sortConfig?.key === 'matricula' ? (sortConfig.direction === 'asc' ? "↑" : "↓") : "↕"}
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => handleSort('nome')} title="Clique para ordenar">
                        Nome {sortConfig?.key === 'nome' ? (sortConfig.direction === 'asc' ? "↑" : "↓") : "↕"}
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => handleSort('responsavel')} title="Clique para ordenar">
                        Responsável {sortConfig?.key === 'responsavel' ? (sortConfig.direction === 'asc' ? "↑" : "↓") : "↕"}
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => handleSort('enturmacao')} title="Clique para ordenar">
                        Enturmação (Setor / Classe / Turma) {sortConfig?.key === 'enturmacao' ? (sortConfig.direction === 'asc' ? "↑" : "↓") : "↕"}
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => handleSort('status')} title="Clique para ordenar">
                        Status {sortConfig?.key === 'status' ? (sortConfig.direction === 'asc' ? "↑" : "↓") : "↕"}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedAlunos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        Nenhum aluno encontrado ou cadastrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedAlunos.map(aluno => (
                      <TableRow key={aluno.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedAlunosIds.includes(aluno.id)}
                            onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAlunosIds([...selectedAlunosIds, aluno.id]);
                          } else {
                            setSelectedAlunosIds(selectedAlunosIds.filter(id => id !== aluno.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-muted-foreground">{aluno.matricula}</TableCell>
                    <TableCell className="font-bold">{aluno.nome}</TableCell>
                    <TableCell>{aluno.nomeResponsavel}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {aluno.setor && aluno.classe && aluno.turma ? (
                          <>
                            <span className="text-xs text-muted-foreground uppercase">{aluno.setor}</span>
                            <span className="inline-flex items-center gap-1 text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full w-fit">
                              {aluno.classe} - {aluno.turma}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Não enturmado</span>
                        )}
                        {aluno.valorBase && parseFloat(aluno.valorBase) > 0 && (
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded w-fit">
                            {parseFloat(aluno.valorBase).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            {aluno.descontoMensalidade && parseFloat(aluno.descontoMensalidade) > 0 && (
                              <span className="text-destructive font-normal ml-1">
                                (-{parseFloat(aluno.descontoMensalidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={aluno.status === 'Ativo' ? 'secondary' : 'destructive'} className={aluno.status === 'Ativo' ? 'badge-success' : ''}>
                        {aluno.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedAlunosIds([aluno.id]);
                            setEnturmarValorBase(aluno.valorBase || '');
                            setEnturmarTurmaInfo(aluno.setor ? `${aluno.setor}|${aluno.classe}|${aluno.turma || 'Geral'}` : '');
                            setIsEnturmarOpen(true);
                          }}>
                            <Users className="mr-2 h-4 w-4" />
                            Enturmar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            setEditingAlunoId(aluno.id);
                            setIsAlunoFormOpen(true);
                          }}>
                            <UserCog className="mr-2 h-4 w-4" />
                            Editar Aluno
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedAlunosIds([aluno.id]);
                            setEnturmarValorBase(aluno.valorBase || '');
                            setEnturmarTurmaInfo(aluno.setor ? `${aluno.setor}|${aluno.classe}|${aluno.turma || 'Geral'}` : '');
                            setIsEnturmarOpen(true);
                          }}>
                            <FileText className="mr-2 h-4 w-4" />
                            Editar Contrato
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="turmas" className="space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-900/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Previsão Líquida Mensal
                <DollarSign className="h-4 w-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(globalTotalLiquidoMensal)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Base: {formatCurrency(globalTotalBase)} | Bolsas: -{formatCurrency(globalTotalDesconto)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50/50 to-red-100/30 dark:from-red-950/20 dark:to-red-900/10 border-red-200 dark:border-red-900/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Total em Atraso (Inadimplência)
                <AlertCircle className="h-4 w-4 text-destructive" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(globalTotalAtrasado)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {globalTotalInadimplentes} aluno{globalTotalInadimplentes !== 1 ? 's' : ''} com mensalidade{globalTotalInadimplentes !== 1 ? 's' : ''} em atraso
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Turmas & Alunos
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{turmasTreeData.length} turmas</div>
              <p className="text-xs text-muted-foreground mt-1">
                {globalTotalAlunosEnturmados} alunos enturmados ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Taxa de Adimplência
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{globalTaxaAdimplencia}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {globalTotalAlunosEnturmados - globalTotalInadimplentes} de {globalTotalAlunosEnturmados} em dia
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tree View Main Card */}
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderTree className="h-5 w-5 text-primary" />
                  Mensalidades por Turma (Estrutura em Árvore)
                </CardTitle>
                <CardDescription>
                  Visão hierárquica das turmas e detalhamento dos contratos e faturas por aluno.
                </CardDescription>
              </div>

              {/* Controls Bar */}
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  placeholder="Filtrar por turma ou aluno..."
                  value={turmasFilterText}
                  onChange={e => setTurmasFilterText(e.target.value)}
                  className="w-full sm:w-64"
                />

                <div className="flex items-center space-x-2 bg-muted/40 px-3 py-1.5 rounded-lg border">
                  <Switch
                    id="apenasInadimplentes"
                    checked={apenasInadimplentes}
                    onCheckedChange={setApenasInadimplentes}
                  />
                  <label
                    htmlFor="apenasInadimplentes"
                    className="text-xs sm:text-sm font-medium cursor-pointer flex items-center gap-1.5 select-none"
                  >
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span>Apenas Inadimplentes</span>
                    {globalTotalInadimplentes > 0 && (
                      <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                        {globalTotalInadimplentes}
                      </Badge>
                    )}
                  </label>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => expandAllTurmas(true)}
                    className="text-xs"
                  >
                    Expandir Todas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => expandAllTurmas(false)}
                    className="text-xs"
                  >
                    Recolher Todas
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {filteredTurmasTree.length === 0 ? (
              <div className="text-center text-muted-foreground py-12 border border-dashed rounded-lg">
                {turmasFilterText || apenasInadimplentes ? (
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">Nenhuma turma ou aluno encontrado com os filtros atuais.</p>
                    <p className="text-sm">Tente limpar a busca ou desativar o filtro de inadimplentes.</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => { setTurmasFilterText(''); setApenasInadimplentes(false); }}
                      className="mt-2 text-xs"
                    >
                      Limpar Filtros
                    </Button>
                  </div>
                ) : (
                  <p>Nenhum aluno enturmado no sistema ainda.</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTurmasTree.map(turma => {
                  const isExpanded = isTurmaOpen(turma.groupName);

                  return (
                    <div
                      key={turma.groupName}
                      className="border rounded-xl overflow-hidden bg-card shadow-sm transition-all"
                    >
                      {/* Turma Root Tree Node Header */}
                      <div
                        className="p-4 bg-muted/25 hover:bg-muted/40 cursor-pointer border-b flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
                        onClick={() => toggleTurma(turma.groupName)}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                            aria-label={isExpanded ? "Recolher turma" : "Expandir turma"}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-primary" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>

                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <GraduationCap className="h-5 w-5" />
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-base sm:text-lg text-foreground">
                                {turma.groupName}
                              </h3>
                              <Badge variant="secondary" className="text-xs">
                                {turma.totalAlunos} aluno{turma.totalAlunos !== 1 ? 's' : ''}
                              </Badge>

                              {turma.inadimplentesCount > 0 ? (
                                <Badge variant="destructive" className="text-xs flex items-center gap-1 font-semibold">
                                  <AlertCircle className="h-3 w-3" />
                                  {turma.inadimplentesCount} inadimplente{turma.inadimplentesCount !== 1 ? 's' : ''}
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 text-xs flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                  100% Em Dia
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Financial Snapshot on Turma Node */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                          <div className="bg-background px-3 py-1.5 rounded-md border text-muted-foreground">
                            Base: <strong className="text-foreground">{formatCurrency(turma.totalBase)}</strong>
                          </div>
                          {turma.totalDesconto > 0 && (
                            <div className="bg-background px-3 py-1.5 rounded-md border text-muted-foreground">
                              Bolsas: <strong className="text-destructive">-{formatCurrency(turma.totalDesconto)}</strong>
                            </div>
                          )}
                          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-3 py-1.5 rounded-md text-emerald-700 dark:text-emerald-300">
                            A Receber/Mês: <strong className="font-bold">{formatCurrency(turma.totalLiquido)}</strong>
                          </div>
                          {turma.totalAtrasado > 0 && (
                            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 px-3 py-1.5 rounded-md text-red-700 dark:text-red-300">
                              Atrasado: <strong className="font-bold">{formatCurrency(turma.totalAtrasado)}</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Turma Subtree (When Expanded) */}
                      {isExpanded && (
                        <div className="p-4 sm:p-5 space-y-4 bg-background/50">
                          {/* Detailed Turma Financial Strip */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-lg bg-muted/30 border text-xs sm:text-sm">
                            <div>
                              <span className="text-muted-foreground block text-[11px] uppercase tracking-wider font-medium">Previsão Bruta (Base)</span>
                              <span className="font-bold text-foreground text-sm sm:text-base">{formatCurrency(turma.totalBase)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[11px] uppercase tracking-wider font-medium">Descontos / Bolsas</span>
                              <span className="font-bold text-destructive text-sm sm:text-base">
                                {turma.totalDesconto > 0 ? `-${formatCurrency(turma.totalDesconto)}` : 'R$ 0,00'}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[11px] uppercase tracking-wider font-medium">Previsão Líquida (A Receber)</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">{formatCurrency(turma.totalLiquido)}/mês</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[11px] uppercase tracking-wider font-medium">Inadimplência Acumulada</span>
                              <span className={`font-bold text-sm sm:text-base ${turma.totalAtrasado > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {turma.totalAtrasado > 0 ? formatCurrency(turma.totalAtrasado) : 'R$ 0,00'}
                              </span>
                            </div>
                          </div>

                          {/* Tree Children: Students of this Turma */}
                          <div className="space-y-3 pl-2 sm:pl-4 border-l-2 border-primary/20 ml-2 sm:ml-4">
                            {turma.visibleAlunos.length === 0 ? (
                              <div className="text-xs text-muted-foreground italic py-3">
                                Nenhum aluno desta turma corresponde aos filtros selecionados.
                              </div>
                            ) : (
                              turma.visibleAlunos.map(({ aluno, fin }) => {
                                const isAlunoExpanded = !!expandedAlunos[aluno.id];

                                return (
                                  <div
                                    key={aluno.id}
                                    className={`rounded-lg border transition-all ${
                                      fin.isInadimplente
                                        ? 'border-red-300 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 shadow-sm'
                                        : 'border-border bg-card hover:bg-muted/20'
                                    }`}
                                  >
                                    {/* Student Header */}
                                    <div className="p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                      <div className="flex items-start sm:items-center gap-3">
                                        <button
                                          type="button"
                                          onClick={() => toggleAluno(aluno.id)}
                                          className="p-1 hover:bg-muted rounded text-muted-foreground mt-0.5 sm:mt-0 transition-colors"
                                          title={isAlunoExpanded ? "Ocultar faturas" : "Ver faturas"}
                                        >
                                          {isAlunoExpanded ? (
                                            <ChevronDown className="h-4 w-4 text-primary" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                          )}
                                        </button>

                                        <div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            {/* IMPORTANT: If student is defaulting, display name in RED */}
                                            <span
                                              className={
                                                fin.isInadimplente
                                                  ? "text-red-600 dark:text-red-400 font-bold text-base flex items-center gap-1.5"
                                                  : "text-foreground font-semibold text-base flex items-center gap-1.5"
                                              }
                                            >
                                              {fin.isInadimplente ? (
                                                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                                              ) : (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                              )}
                                              {aluno.nome}
                                            </span>

                                            <Badge variant="outline" className="text-xs font-normal">
                                              Matrícula: {aluno.matricula}
                                            </Badge>

                                            {fin.isInadimplente ? (
                                              <Badge variant="destructive" className="text-xs font-semibold flex items-center gap-1">
                                                <AlertTriangle className="h-3 w-3" />
                                                Inadimplente ({fin.atrasadas.length} fatura{fin.atrasadas.length > 1 ? 's' : ''} vencida{fin.atrasadas.length > 1 ? 's' : ''}: {formatCurrency(fin.totalAtrasado)})
                                              </Badge>
                                            ) : (
                                              <Badge variant="outline" className="text-xs text-emerald-700 dark:text-emerald-400 border-emerald-300 flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                Em Dia
                                              </Badge>
                                            )}
                                          </div>

                                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                            <span>Responsável: <strong className="text-foreground">{aluno.nomeResponsavel || '-'}</strong> {aluno.contatoResponsavel ? `(${aluno.contatoResponsavel})` : ''}</span>
                                            <span>Vencimento do Contrato: <strong className="text-foreground">Todo dia {aluno.diaVencimento || '5'}</strong></span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Student Financial Breakdown Values */}
                                      <div className="flex flex-wrap items-center gap-3 sm:gap-6 bg-muted/40 dark:bg-muted/10 p-2.5 rounded-lg border border-border/60 text-xs sm:text-sm">
                                        <div>
                                          <span className="text-[11px] text-muted-foreground block">Valor Base</span>
                                          <span className="font-medium text-foreground">{formatCurrency(fin.valorBase)}</span>
                                        </div>

                                        <div>
                                          <span className="text-[11px] text-muted-foreground block">Desconto</span>
                                          <span className="font-medium text-destructive">
                                            {fin.desconto > 0 ? `-${formatCurrency(fin.desconto)}` : '-'}
                                          </span>
                                        </div>

                                        <div>
                                          <span className="text-[11px] text-muted-foreground block font-medium">A Receber/Mês</span>
                                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatCurrency(fin.valorLiquido)}</span>
                                        </div>

                                        {fin.isInadimplente && (
                                          <div className="border-l pl-3 sm:pl-4 border-red-300 dark:border-red-800">
                                            <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 block">Total em Atraso</span>
                                            <span className="font-bold text-red-600 dark:text-red-400 text-sm">{formatCurrency(fin.totalAtrasado)}</span>
                                          </div>
                                        )}

                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => toggleAluno(aluno.id)}
                                          className="text-xs ml-auto hover:bg-muted"
                                        >
                                          {isAlunoExpanded ? 'Ocultar faturas' : `Ver faturas (${fin.mensalidades.length})`}
                                          {isAlunoExpanded ? (
                                            <ChevronUp className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
                                          ) : (
                                            <ChevronDown className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
                                          )}
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Student Leaf: Monthly Installments Subtree */}
                                    {isAlunoExpanded && (
                                      <div className="border-t border-dashed p-3 sm:p-4 bg-muted/15 space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <span>Mensalidades e Faturas do Aluno</span>
                                            <span className="font-normal text-muted-foreground">({fin.mensalidades.length} geradas)</span>
                                          </h4>
                                          <div className="text-xs flex flex-wrap gap-3 text-muted-foreground">
                                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                              ● {fin.pagas.length} paga{fin.pagas.length !== 1 ? 's' : ''}
                                            </span>
                                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                                              ● {fin.pendentes.length} a vencer
                                            </span>
                                            {fin.atrasadas.length > 0 && (
                                              <span className="text-red-600 dark:text-red-400 font-bold">
                                                ● {fin.atrasadas.length} em atraso
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {fin.mensalidades.length === 0 ? (
                                          <div className="text-xs text-muted-foreground italic py-3 text-center bg-background/50 rounded-md border border-dashed">
                                            Nenhuma mensalidade gerada para este aluno ainda. Você pode gerá-las na aba <strong>Mensalidades</strong>.
                                          </div>
                                        ) : (
                                          <div className="rounded-md border bg-card overflow-x-auto">
                                            <Table>
                                              <TableHeader>
                                                <TableRow className="text-xs bg-muted/40">
                                                  <TableHead>Mês Referência</TableHead>
                                                  <TableHead>Data de Vencimento</TableHead>
                                                  <TableHead>Valor Líquido</TableHead>
                                                  <TableHead>Status</TableHead>
                                                  <TableHead>Data de Pagamento</TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {fin.mensalidades.map(m => {
                                                  const atrasada = isMensalidadeAtrasada(m);
                                                  return (
                                                    <TableRow
                                                      key={m.id}
                                                      className={
                                                        atrasada
                                                          ? "bg-red-50/60 dark:bg-red-950/30 hover:bg-red-50/80"
                                                          : m.status === 'Pago'
                                                          ? "hover:bg-muted/30"
                                                          : "hover:bg-muted/30"
                                                      }
                                                    >
                                                      <TableCell className="font-semibold text-xs">
                                                        {formatMonthRef(m.mesReferencia)}
                                                      </TableCell>
                                                      <TableCell className="text-xs">
                                                        {formatDateBR(m.dataVencimento)}
                                                      </TableCell>
                                                      <TableCell className="text-xs font-semibold text-foreground">
                                                        {formatCurrency(m.valorFinal)}
                                                      </TableCell>
                                                      <TableCell className="text-xs">
                                                        {m.status === 'Pago' ? (
                                                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] flex items-center gap-1 w-fit">
                                                            <CheckCircle2 className="h-3 w-3" /> Pago
                                                          </Badge>
                                                        ) : atrasada ? (
                                                          <Badge variant="destructive" className="text-[11px] flex items-center gap-1 w-fit">
                                                            <AlertCircle className="h-3 w-3" /> Vencido / Atrasado
                                                          </Badge>
                                                        ) : (
                                                          <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-300 text-[11px] flex items-center gap-1 w-fit">
                                                            A Vencer
                                                          </Badge>
                                                        )}
                                                      </TableCell>
                                                      <TableCell className="text-xs text-muted-foreground">
                                                        {m.dataPagamento ? formatDateBR(m.dataPagamento) : '-'}
                                                      </TableCell>
                                                    </TableRow>
                                                  );
                                                })}
                                              </TableBody>
                                            </Table>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
                <>
                  <Button 
                    variant="default" 
                    className="bg-green-600 hover:bg-green-700" 
                    onClick={openPaymentModal}
                  >
                    Dar Baixa em {selectedMensalidadesIds.length} Selecionada(s)
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setMensalidadesToDelete(selectedMensalidadesIds)}
                  >
                    Excluir {selectedMensalidadesIds.length} selecionada(s)
                  </Button>
                </>
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
                title="Baixar planilha com os dados atuais"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Exportar Planilha
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
                                const statusText = mensalidade.status === 'Pago' ? 'Pago' : (isAtrasada ? 'Vencido' : 'Pendente');
                                
                                const isSelected = selectedMensalidadesIds.includes(mensalidade.id);
                                
                                const [ano, mes] = mensalidade.mesReferencia.split('-');
                                const mesFormatado = `${mes}/${ano}`;
                                
                                return (
                                  <div key={mensalidade.id} className="flex items-center gap-1">
                                    <Badge 
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
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      title={`Excluir mensalidade de ${mesFormatado}`}
                                      onClick={() => setMensalidadesToDelete([mensalidade.id])}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
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

      <AlertDialog
        open={mensalidadesToDelete.length > 0}
        onOpenChange={(open) => {
          if (!open) setMensalidadesToDelete([]);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {mensalidadesToDelete.length === 1 ? 'mensalidade' : 'mensalidades'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Caso uma mensalidade esteja paga, o lançamento financeiro associado também será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteMensalidades}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isAlunoFormOpen} onOpenChange={(open) => {
        setIsAlunoFormOpen(open);
        if (!open) setEditingAlunoId(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAlunoId ? 'Editar Aluno' : 'Novo Aluno'}</DialogTitle>
            <DialogDescription>{editingAlunoId ? 'Atualize os dados do aluno no sistema.' : 'Cadastre um novo aluno no sistema.'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            
            // Extract all fields
            const extractedData = {
              nome: formData.get('nome') as string,
              dataNascimento: formData.get('dataNascimento') as string,
              estadoCivil: formData.get('estadoCivil') as string,
              cidadeNatal: formData.get('cidadeNatal') as string,
              nacionalidade: formData.get('nacionalidade') as string,
              estrangeiro: formData.get('estrangeiro') === 'on',
              bloquearRematricula: formData.get('bloquearRematricula') === 'on',
              profissao: formData.get('profissao') as string,
              empresaTrabalho: formData.get('empresaTrabalho') as string,
              classificacao: formData.get('classificacao') as string,
              rg: formData.get('rg') as string,
              rgOrgao: formData.get('rgOrgao') as string,
              rgDataExpedicao: formData.get('rgDataExpedicao') as string,
              tituloEleitor: formData.get('tituloEleitor') as string,
              tituloZona: formData.get('tituloZona') as string,
              tituloSecao: formData.get('tituloSecao') as string,
              tituloDataEmissao: formData.get('tituloDataEmissao') as string,
              cpf: formData.get('cpf') as string,
              passaporte: formData.get('passaporte') as string,
              docMilitar: formData.get('docMilitar') as string,
              docMilitarNum: formData.get('docMilitarNum') as string,
              certidaoNascimento: formData.get('certidaoNascimento') as string,
              
              cep: formData.get('cep') as string,
              rua: formData.get('rua') as string,
              numero: formData.get('numero') as string,
              complemento: formData.get('complemento') as string,
              cidade: formData.get('cidade') as string,
              uf: formData.get('uf') as string,
              bairro: formData.get('bairro') as string,
              
              telefone: formData.get('telefone') as string,
              telefoneComercial: formData.get('telefoneComercial') as string,
              celularAluno: formData.get('celularAluno') as string,
              operadora: formData.get('operadora') as string,
              contatoWhatsapp: formData.get('contatoWhatsapp') as string,
              email: formData.get('email') as string,
              naoReceberEmail: formData.get('naoReceberEmail') === 'on',
              naoReceberSms: formData.get('naoReceberSms') === 'on',
              correspondencia: formData.get('correspondencia') as string,
              
              nomeResponsavel: formData.get('nomeResponsavel') as string,
              contatoResponsavel: formData.get('contatoResponsavel') as string,
              cpfResponsavel: formData.get('cpfResponsavel') as string,
              rgResponsavel: formData.get('rgResponsavel') as string,
              emailResponsavel: formData.get('emailResponsavel') as string,
              parentescoResponsavel: formData.get('parentescoResponsavel') as string,
              responsavelFinanceiro: formData.get('responsavelFinanceiro') === 'on',
              responsavelOpcional: formData.get('responsavelOpcional') as string,
              responsavelDidatico: formData.get('responsavelDidatico') === 'on',
              condutorIda: formData.get('condutorIda') as string,
              condutorVolta: formData.get('condutorVolta') as string,
            };

            if (editingAlunoId) {
              setAlunos(alunos.map(a => {
                if (a.id === editingAlunoId) {
                  return { ...a, ...extractedData };
                }
                return a;
              }));
              toast.success('Aluno atualizado com sucesso!');
            } else {
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
                matricula: matriculaGerada,
                status: 'Ativo',
                ...extractedData
              };
              setAlunos([...alunos, novoAluno]);
              toast.success(`Aluno cadastrado! Matrícula: ${matriculaGerada}`);
            }
            setIsAlunoFormOpen(false);
            setEditingAlunoId(null);
          }} className="space-y-4">
            {(() => {
              const a = editingAlunoId ? alunos.find(al => al.id === editingAlunoId) : null;
              return (
                <Tabs defaultValue="dados" className="w-full mt-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="dados">Dados Pessoais & Docs</TabsTrigger>
                    <TabsTrigger value="endereco">Endereço & Contato</TabsTrigger>
                    <TabsTrigger value="responsaveis">Responsáveis</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="dados" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Nome do Aluno *</label>
                        <Input name="nome" required placeholder="Nome completo" defaultValue={a?.nome} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Data de Nasc. *</label>
                        <Input name="dataNascimento" type="date" required defaultValue={a?.dataNascimento} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Estado Civil</label>
                        <Select name="estadoCivil" defaultValue={a?.estadoCivil || "Solteiro"}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Solteiro">Solteiro(a)</SelectItem>
                            <SelectItem value="Casado">Casado(a)</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Cidade Natal</label>
                        <Input name="cidadeNatal" defaultValue={a?.cidadeNatal} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Nacionalidade</label>
                        <Input name="nacionalidade" defaultValue={a?.nacionalidade || 'Brasileiro(a)'} />
                      </div>
                      <div className="flex items-center space-x-4 pt-6">
                        <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                          <input type="checkbox" name="estrangeiro" defaultChecked={a?.estrangeiro} className="rounded border-gray-300" />
                          <span>Estrangeiro(a)</span>
                        </label>
                        <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                          <input type="checkbox" name="bloquearRematricula" defaultChecked={a?.bloquearRematricula} className="rounded border-gray-300" />
                          <span>Bloquear Rematrícula</span>
                        </label>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Profissão / Formação</label>
                        <Input name="profissao" defaultValue={a?.profissao} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Empresa / Local de Trabalho</label>
                        <Input name="empresaTrabalho" defaultValue={a?.empresaTrabalho} />
                      </div>
                    </div>
                    
                    <h4 className="text-sm font-bold border-b pb-1 mt-4">Documentos</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium">RG</label>
                        <Input name="rg" defaultValue={a?.rg} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Órgão Exp.</label>
                        <Input name="rgOrgao" defaultValue={a?.rgOrgao} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Data Exp. RG</label>
                        <Input name="rgDataExpedicao" type="date" defaultValue={a?.rgDataExpedicao} />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-medium">CPF *</label>
                        <Input name="cpf" required defaultValue={a?.cpf} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Passaporte</label>
                        <Input name="passaporte" defaultValue={a?.passaporte} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Certidão Nascimento/Casamento</label>
                        <Input name="certidaoNascimento" defaultValue={a?.certidaoNascimento} />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="endereco" className="space-y-4 mt-4">
                    <h4 className="text-sm font-bold border-b pb-1">Endereço</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2 md:col-span-1">
                        <label className="text-xs font-medium">CEP</label>
                        <Input name="cep" defaultValue={a?.cep} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-medium">Rua/Avenida</label>
                        <Input name="rua" defaultValue={a?.rua} />
                      </div>
                      <div className="space-y-2 md:col-span-1">
                        <label className="text-xs font-medium">Nº</label>
                        <Input name="numero" defaultValue={a?.numero} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-medium">Complemento</label>
                        <Input name="complemento" defaultValue={a?.complemento} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-medium">Bairro</label>
                        <Input name="bairro" defaultValue={a?.bairro} />
                      </div>
                      <div className="space-y-2 md:col-span-3">
                        <label className="text-xs font-medium">Cidade</label>
                        <Input name="cidade" defaultValue={a?.cidade} />
                      </div>
                      <div className="space-y-2 md:col-span-1">
                        <label className="text-xs font-medium">UF</label>
                        <Input name="uf" maxLength={2} defaultValue={a?.uf} />
                      </div>
                    </div>

                    <h4 className="text-sm font-bold border-b pb-1 mt-4">Comunicação</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Telefone Fixo</label>
                        <Input name="telefone" defaultValue={a?.telefone} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Celular (Aluno)</label>
                        <Input name="celularAluno" defaultValue={a?.celularAluno} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Contato WhatsApp</label>
                        <Select name="contatoWhatsapp" defaultValue={a?.contatoWhatsapp || 'Celular (Aluno)'}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Celular (Aluno)">Celular (Aluno)</SelectItem>
                            <SelectItem value="Celular (Responsável)">Celular (Responsável)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-3">
                        <label className="text-xs font-medium">E-mail</label>
                        <Input name="email" type="email" defaultValue={a?.email} />
                      </div>
                      <div className="flex items-center space-x-4 md:col-span-3 pt-2">
                        <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                          <input type="checkbox" name="naoReceberEmail" defaultChecked={a?.naoReceberEmail} className="rounded border-gray-300" />
                          <span>Não quero receber e-mail</span>
                        </label>
                        <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                          <input type="checkbox" name="naoReceberSms" defaultChecked={a?.naoReceberSms} className="rounded border-gray-300" />
                          <span>Não quero receber SMS</span>
                        </label>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="responsaveis" className="space-y-4 mt-4">
                    <h4 className="text-sm font-bold border-b pb-1">Dados do Responsável Principal</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Nome do Responsável *</label>
                        <Input name="nomeResponsavel" required placeholder="Nome completo do principal responsável" defaultValue={a?.nomeResponsavel} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Contato (Telefone/Celular) *</label>
                        <Input name="contatoResponsavel" required placeholder="(00) 00000-0000" defaultValue={a?.contatoResponsavel} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Parentesco</label>
                        <Select name="parentescoResponsavel" defaultValue={a?.parentescoResponsavel || "Mãe"}>
                          <SelectTrigger><SelectValue placeholder="Selecione o parentesco" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Mãe">Mãe</SelectItem>
                            <SelectItem value="Pai">Pai</SelectItem>
                            <SelectItem value="Tutor">Tutor(a)</SelectItem>
                            <SelectItem value="Avô">Avô/Avó</SelectItem>
                            <SelectItem value="Tio">Tio/Tia</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">CPF do Responsável</label>
                        <Input name="cpfResponsavel" placeholder="000.000.000-00" defaultValue={a?.cpfResponsavel} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">RG do Responsável</label>
                        <Input name="rgResponsavel" placeholder="Número do RG" defaultValue={a?.rgResponsavel} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">E-mail do Responsável</label>
                        <Input name="emailResponsavel" type="email" placeholder="email@exemplo.com" defaultValue={a?.emailResponsavel} />
                      </div>
                    </div>
                    <h4 className="text-sm font-bold border-b pb-1 mt-4">Atribuições do Responsável Principal</h4>
                    <div className="grid grid-cols-1 gap-4 mt-2">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-0.5">
                          <label className="text-sm font-medium">Responsável Financeiro</label>
                          <p className="text-xs text-muted-foreground">Este é o responsável pelos pagamentos e contratos.</p>
                        </div>
                        <Switch name="responsavelFinanceiro" defaultChecked={a?.responsavelFinanceiro} />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-0.5">
                          <label className="text-sm font-medium">Responsável Didático</label>
                          <p className="text-xs text-muted-foreground">Este é o responsável pelo acompanhamento escolar e notas.</p>
                        </div>
                        <Switch name="responsavelDidatico" defaultChecked={a?.responsavelDidatico} />
                      </div>
                    </div>
                    
                    <h4 className="text-sm font-bold border-b pb-1 mt-4">Logística / Transporte</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Condutor Ida</label>
                        <Input name="condutorIda" placeholder="Nome do responsável por trazer o aluno" defaultValue={a?.condutorIda} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Condutor Volta</label>
                        <Input name="condutorVolta" placeholder="Nome do responsável por buscar o aluno" defaultValue={a?.condutorVolta} />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              );
            })()}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => { setIsAlunoFormOpen(false); setEditingAlunoId(null); }}>Cancelar</Button>
              <Button type="submit">{editingAlunoId ? 'Salvar Alterações' : 'Cadastrar Aluno'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEnturmarOpen} onOpenChange={setIsEnturmarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedAlunosIds.length > 1 ? `Enturmar ${selectedAlunosIds.length} Alunos` : 'Enturmar Aluno'}</DialogTitle>
            <DialogDescription>Vincule {selectedAlunosIds.length > 1 ? 'os alunos' : 'o aluno'} a uma classe e configure os pagamentos.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const turmaInfo = enturmarTurmaInfo;
            if (!turmaInfo) {
              toast.error('Selecione uma turma válida.');
              return;
            }
            
            const [setor, classe, turmaStr] = turmaInfo.split('|');
            const valorBase = enturmarValorBase;
            
            const isGroup = selectedAlunosIds.length > 1;
            
            setAlunos(alunos.map(a => {
              if (selectedAlunosIds.includes(a.id)) {
                const descontoMensalidade = isGroup ? (formData.get(`desconto_${a.id}`) as string) : (formData.get('desconto') as string);
                const diaVencimento = isGroup ? (formData.get(`vencimento_${a.id}`) as string) : (formData.get('vencimento') as string);
                
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

            const novasMensalidades = [...mensalidades];
            
            selectedAlunosIds.forEach(id => {
              const descStr = isGroup ? (formData.get(`desconto_${id}`) as string) : (formData.get('desconto') as string);
              const vencStr = isGroup ? (formData.get(`vencimento_${id}`) as string) : (formData.get('vencimento') as string);
              
              const desc = parseFloat(descStr || '0');
              const vFinal = Math.max(0, vBase - desc);
              const venc = vencStr || '5';
              
              for (let i = 1; i <= 11; i++) {
                const mesRef = `${currentYear}-${String(i).padStart(2, '0')}`;
                const dataVenc = new Date(currentYear, i - 1, parseInt(venc)).toISOString();
                
                const mIndex = novasMensalidades.findIndex(m => m.alunoId === id && m.mesReferencia === mesRef);
                if (mIndex === -1) {
                  novasMensalidades.push({
                    id: crypto.randomUUID(),
                    alunoId: id,
                    mesReferencia: mesRef,
                    valorFinal: vFinal,
                    dataVencimento: dataVenc,
                    status: 'Pendente'
                  });
                } else if (novasMensalidades[mIndex].status === 'Pendente') {
                  novasMensalidades[mIndex] = {
                    ...novasMensalidades[mIndex],
                    valorFinal: vFinal,
                    dataVencimento: dataVenc
                  };
                }
              }
            });
            setMensalidades(novasMensalidades);
            
            toast.success(`${selectedAlunosIds.length} contrato(s) atualizado(s) e parcelas sincronizadas com sucesso!`);
            setIsEnturmarOpen(false);
            setSelectedAlunosIds([]);
          }} className="space-y-4 py-2">
            {(() => {
              const alunoEdit = selectedAlunosIds.length === 1 ? alunos.find(a => a.id === selectedAlunosIds[0]) : null;
              const isGroup = selectedAlunosIds.length > 1;
              const selectedAlunosObj = alunos.filter(a => selectedAlunosIds.includes(a.id));
              
              return (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Selecione a Turma *</label>
                    <Select 
                      name="turmaInfo" 
                      required 
                      value={enturmarTurmaInfo}
                      onValueChange={(val) => {
                        setEnturmarTurmaInfo(val);
                        const [setor, classe] = val.split('|');
                        const turmaObj = turmas.find(t => t.setor === setor && t.nome === classe);
                        if (turmaObj && turmaObj.valorPadrao !== undefined) {
                          setEnturmarValorBase(String(turmaObj.valorPadrao));
                        }
                      }}
                    >
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
                    <Input name="valorBase" type="number" min="0" step="0.01" required placeholder="Ex: 500.00" value={enturmarValorBase} onChange={(e) => setEnturmarValorBase(e.target.value)} />
                  </div>
                  
                  {!isGroup ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Desconto Mensalidade (R$)</label>
                        <Input name="desconto" type="number" min="0" step="0.01" placeholder="Ex: 50.00" defaultValue={alunoEdit?.descontoMensalidade} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Dia de Vencimento</label>
                        <Input name="vencimento" type="number" min="1" max="31" defaultValue={alunoEdit?.diaVencimento || "5"} />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <label className="text-sm font-medium border-b pb-2 block">Personalização Individualizada</label>
                      <div className="max-h-60 overflow-y-auto pr-2 space-y-4">
                        {selectedAlunosObj.map(aluno => (
                          <div key={aluno.id} className="p-3 border rounded-md bg-muted/30">
                            <div className="font-semibold text-sm mb-2 truncate" title={aluno.nome}>{aluno.nome}</div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Desconto (R$)</label>
                                <Input name={`desconto_${aluno.id}`} type="number" min="0" step="0.01" placeholder="Ex: 50.00" defaultValue={aluno.descontoMensalidade} className="h-8 text-sm" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Dia Vencimento</label>
                                <Input name={`vencimento_${aluno.id}`} type="number" min="1" max="31" defaultValue={aluno.diaVencimento || "5"} className="h-8 text-sm" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsEnturmarOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar Contrato</Button>
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
