import React, { useState, useRef, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, Users, FileDown, Upload, Download, MoreHorizontal, UserCog, FileText, UserPlus,
  ChevronDown, ChevronRight, ChevronUp, FolderTree, AlertCircle, CheckCircle2, DollarSign, AlertTriangle, GraduationCap, Trash2, ArrowRightLeft
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TurmaConfig, Lancamento } from '@/types/finance';
import { Aluno, Mensalidade, Responsavel } from '@/types/aluno';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { usePermissions } from '@/hooks/usePermissions';
import { DEFAULT_TURMAS_CONFIG, normalizeAllAlunos } from '@/constants/turmas';
import { TransferirTurmaModal } from '@/components/alunos/TransferirTurmaModal';
import { DocumentosImpressaoModal } from '@/components/alunos/DocumentosImpressaoModal';
import { DocumentoEscolarTemplate, DEFAULT_DOCUMENTOS_ESCOLARES } from '@/types/documentoEscolar';
import { useAuth } from '@/contexts/AuthContext';
import { Printer, Sun, Moon, Clock, CreditCard, Sparkles } from 'lucide-react';
import { MatriculaWizardModal } from '@/components/alunos/MatriculaWizardModal';
import { User, MapPin, ChevronLeft } from 'lucide-react';
import { TutorialTour, TutorialButton, MATRICULA_TUTORIAL_STEPS } from '@/components/common/TutorialTour';
import { usePagination } from '@/hooks/usePagination';
import { DataTablePagination } from '@/components/common/DataTablePagination';
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
import { PixQrCodeModal } from '@/components/financeiro/PixQrCodeModal';
import { BoletoGeradoModal } from '@/components/financeiro/BoletoGeradoModal';
import { generatePixCopiaECola, openBoletoInNewTab, getBankDisplayName, detectBankFromCaixa } from '@/utils/paymentGenerators';
import { getActiveBankingGateway, hasCoraCredentials } from '@/services/coraService';
import { Caixa } from '@/types/finance';
import { mockCaixas } from '@/data/mockData';

type PaymentDetail = {
  mensalidadeId: string;
  dataPagamento: string;
  formaPagamento: string;
  caixaId?: string;
  desconto: number;
  multa: number;
};

const Alunos = () => {
  const [turmas, setTurmas] = useLocalStorage<TurmaConfig[]>('escolinha_turmas_v3', DEFAULT_TURMAS_CONFIG);
  const [caixas] = useLocalStorage<Caixa[]>('escolinha_caixas', mockCaixas);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [alunos, setAlunos] = useLocalStorage<Aluno[]>('escolinha_alunos', []);
  const [mensalidades, setMensalidades] = useLocalStorage<Mensalidade[]>('escolinha_mensalidades', []);
  const [lancamentos, setLancamentos] = useLocalStorage<Lancamento[]>('escolinha_lancamentos_v2', []);
  const [activeTab, setActiveTab] = useState('gestao');
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

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
  const [matriculaFormStep, setMatriculaFormStep] = useState<1 | 2 | 3 | 4>(1);
  const [formResponsaveis, setFormResponsaveis] = useState<Responsavel[]>([
    {
      id: 'resp-1',
      nome: '',
      contato: '',
      parentesco: 'Mãe',
      cpf: '',
      rg: '',
      email: '',
      responsavelFinanceiro: true,
      responsavelDidatico: true,
    },
  ]);
  const [matriculaTurmaInfo, setMatriculaTurmaInfo] = useState('');
  const [matriculaValorBase, setMatriculaValorBase] = useState('');
  const [matriculaDesconto, setMatriculaDesconto] = useState('');
  const [matriculaVencimento, setMatriculaVencimento] = useState('5');
  const [isMatriculaWizardOpen, setIsMatriculaWizardOpen] = useState(false);
  const matriculaFormRef = useRef<HTMLFormElement>(null);
  const [isMatricularOpen, setIsMatricularOpen] = useState(false);
  const [selectedAlunosIds, setSelectedAlunosIds] = useState<string[]>([]);
  const [selectedMensalidadesIds, setSelectedMensalidadesIds] = useState<string[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [mensalidadesToDelete, setMensalidadesToDelete] = useState<string[]>([]);
  const [paymentDetails, setPaymentDetails] = useState<Record<string, PaymentDetail>>({});
  
  // Modais de Pix e Boleto para confirmação de pagamentos
  const [pixModalData, setPixModalData] = useState<{
    isOpen: boolean;
    valor: number;
    descricao: string;
    copiaCola: string;
    alunoNome?: string;
    responsavelNome?: string;
    instituicaoNome?: string;
  }>({
    isOpen: false,
    valor: 0,
    descricao: '',
    copiaCola: '',
  });

  const [boletoModalData, setBoletoModalData] = useState<{
    isOpen: boolean;
    valor: number;
    descricao: string;
    linhaDigitavel: string;
    barcodeNumber?: string;
    boletoUrl: string;
    vencimento?: string;
    alunoNome?: string;
    bancoNome?: string;
  }>({
    isOpen: false,
    valor: 0,
    descricao: '',
    linhaDigitavel: '',
    barcodeNumber: '',
    boletoUrl: '',
  });

  const { school } = useAuth();
  // Estados para Modal Multi-Step de Matrícula (3 Steps: Turma, Financeiro, Contrato)
  const [matricularStep, setMatricularStep] = useState<1 | 2 | 3>(1);
  const [matricularTurmaInfo, setMatricularTurmaInfo] = useState('');
  const [matricularTurno, setMatricularTurno] = useState('Matutino');
  const [matricularTemContraturno, setMatricularTemContraturno] = useState(false);
  const [matricularClasseContraturno, setMatricularClasseContraturno] = useState('Contraturno Regular');
  const [matricularTurnoContraturno, setMatricularTurnoContraturno] = useState('Vespertino');
  const [matricularValorContraturno, setMatricularValorContraturno] = useState('350.00');
  const [matricularMesInicio, setMatricularMesInicio] = useState(2); // Fevereiro
  const [matricularQtdParcelas, setMatricularQtdParcelas] = useState(11);
  const [matricularDiaVencimento, setMatricularDiaVencimento] = useState('10');
  const [matricularValorBase, setMatricularValorBase] = useState('');
  const [matricularDesconto, setMatricularDesconto] = useState('0');
  const [matricularAnoLetivo, setMatricularAnoLetivo] = useState('2026');
  const [isDocImpressaoOpen, setIsDocImpressaoOpen] = useState(false);

  const [documentosTemplates] = useLocalStorage<DocumentoEscolarTemplate[]>(
    'escolinha_documentos_escolares',
    DEFAULT_DOCUMENTOS_ESCOLARES
  );

  const [expandedTurmas, setExpandedTurmas] = useState<Record<string, boolean>>({});
  const [expandedAlunos, setExpandedAlunos] = useState<Record<string, boolean>>({});
  const [turmasFilterText, setTurmasFilterText] = useState('');
  const [apenasInadimplentes, setApenasInadimplentes] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputMensalidadesRef = useRef<HTMLInputElement>(null);

  // Estados para Transferência Facilitada de Turma
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferAlunosIds, setTransferAlunosIds] = useState<string[]>([]);

  // Normalização de alunos sem forçar classes excluídas
  useEffect(() => {
    if (alunos && alunos.length > 0) {
      const { alunos: normalized, changed } = normalizeAllAlunos(alunos, turmas);
      if (changed) {
        setAlunos(normalized);
      }
    }
  }, [alunos]);

  const handleOpenTransferSingle = (alunoId: string) => {
    setTransferAlunosIds([alunoId]);
    setIsTransferModalOpen(true);
  };

  const handleOpenTransferBatch = () => {
    if (selectedAlunosIds.length === 0) {
      toast.error('Selecione pelo menos um aluno para transferir.');
      return;
    }
    setTransferAlunosIds(selectedAlunosIds);
    setIsTransferModalOpen(true);
  };

  const handleConfirmTransfer = ({
    alunoIds,
    novoSetor,
    novaClasse,
    novaTurma,
    ajustarMensalidades,
  }: {
    alunoIds: string[];
    novoSetor: string;
    novaClasse: string;
    novaTurma: string;
    ajustarMensalidades: boolean;
  }) => {
    const turmaDestinoObj = turmas.find(t => t.setor === novoSetor && t.nome === novaClasse);
    const novoValorPadrao = turmaDestinoObj?.valorPadrao;

    setAlunos(prev => prev.map(aluno => {
      if (alunoIds.includes(aluno.id)) {
        return {
          ...aluno,
          setor: novoSetor,
          classe: novaClasse,
          turma: novaTurma,
          valorBase: (ajustarMensalidades && novoValorPadrao !== undefined) ? String(novoValorPadrao) : aluno.valorBase,
        };
      }
      return aluno;
    }));

    if (ajustarMensalidades && novoValorPadrao !== undefined) {
      setMensalidades(prev => prev.map(m => {
        if (alunoIds.includes(m.alunoId) && m.status === 'Pendente') {
          const aluno = alunos.find(a => a.id === m.alunoId);
          const desc = parseFloat(aluno?.descontoMensalidade || '0');
          const novoValorFinal = Math.max(0, novoValorPadrao - desc);
          return {
            ...m,
            valorFinal: novoValorFinal,
            valorOriginalBase: novoValorPadrao,
          };
        }
        return m;
      }));
    }

    toast.success(`${alunoIds.length} aluno(s) transferido(s) para ${novoSetor} - ${novaClasse} (Turma ${novaTurma}) com sucesso!`);
    setSelectedAlunosIds([]);
  };

  const handleNovaTurmaLetraCriada = (setor: string, classe: string, novaLetra: string) => {
    setTurmas(prev => {
      const copy = [...prev];
      const idx = copy.findIndex(t => t.setor === setor && t.nome === classe);
      if (idx !== -1) {
        if (!copy[idx].letras.includes(novaLetra)) {
          copy[idx] = {
            ...copy[idx],
            letras: [...copy[idx].letras, novaLetra].sort(),
          };
        }
      } else {
        copy.push({
          setor,
          nome: classe,
          letras: [novaLetra],
        });
      }
      return copy;
    });
  };

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
      } else if (sortConfig.key === 'matriculaTurma') {
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

  const paginationAlunos = usePagination({
    items: displayedAlunos,
    pageSize: 30,
  });

  const paginationMensalidades = usePagination({
    items: displayedAlunos,
    pageSize: 30,
  });

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

        const caixaDestino = detail.caixaId || caixas[0]?.id;
        const bancoEmissorBoleto = detail.formaPagamento === 'Boleto'
          ? detectBankFromCaixa(caixaDestino, caixas)
          : undefined;

        const novoLancamento: Lancamento = {
          id: crypto.randomUUID(),
          data: new Date(detail.dataPagamento),
          unidade: 'Todas',
          descricao: `Mensalidade ${m.mesReferencia} - ${aluno.nome}`,
          categoria: 'Mensalidades',
          tipoCusto: 'Fixo',
          valor: valorCobrado,
          formaPagamento: detail.formaPagamento as any,
          caixaId: detail.formaPagamento !== 'Cartão' ? caixaDestino : undefined,
          bancoEmissor: bancoEmissorBoleto,
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

      // Geração de Boleto ou Pix se selecionado
      const boletos = novosLancamentos.filter(l => l.formaPagamento === 'Boleto');
      const pixes = novosLancamentos.filter(l => l.formaPagamento === 'PIX');

      if (boletos.length > 0) {
        const prim = boletos[0];
        const aluno = alunos.find(a => prim.descricao.includes(a.nome));
        const total = boletos.reduce((acc, b) => acc + b.valor, 0);
        const desc = boletos.length === 1 ? prim.descricao : `Mensalidades (${boletos.length}x) - ${aluno?.nome || ''}`;
        const activeBank = prim.bancoEmissor || detectBankFromCaixa(prim.caixaId, caixas);
        const res = openBoletoInNewTab({
          valor: total,
          descricao: desc,
          vencimento: prim.data,
          beneficiarioNome: 'Escola Interagir',
          pagadorNome: aluno?.nomeResponsavel || aluno?.nome,
          pagadorCpfCnpj: aluno?.cpfResponsavel || aluno?.cpf,
          pagadorEndereco: aluno?.endereco,
          gatewayId: activeBank,
        });

        setBoletoModalData({
          isOpen: true,
          valor: total,
          descricao: desc,
          linhaDigitavel: res.linhaDigitavel,
          barcodeNumber: res.barcodeNumber,
          boletoUrl: res.url,
          alunoNome: aluno?.nome,
          bancoNome: getBankDisplayName(activeBank),
        });

        if (res.opened) {
          toast.success(`Boleto ${getBankDisplayName(activeBank)} aberto em nova aba do Chrome!`);
        }
      }

      if (pixes.length > 0) {
        const prim = pixes[0];
        const aluno = alunos.find(a => prim.descricao.includes(a.nome));
        const total = pixes.reduce((acc, p) => acc + p.valor, 0);
        const desc = pixes.length === 1 ? prim.descricao : `Mensalidades (${pixes.length}x) - ${aluno?.nome || ''}`;
        const copiaCola = generatePixCopiaECola({
          valor: total,
          descricao: desc,
          beneficiarioNome: 'Escola Interagir',
          pagadorNome: aluno?.nomeResponsavel || aluno?.nome,
          pagadorCpfCnpj: aluno?.cpfResponsavel || aluno?.cpf,
        });

        setPixModalData({
          isOpen: true,
          valor: total,
          descricao: desc,
          copiaCola,
          alunoNome: aluno?.nome,
          responsavelNome: aluno?.nomeResponsavel,
          instituicaoNome: 'Escola Interagir',
        });
      }
    }
    
    setIsPaymentModalOpen(false);
    setSelectedMensalidadesIds([]);
  };

  const openPaymentModal = () => {
    const details: Record<string, PaymentDetail> = {};
    const today = new Date().toISOString().split('T')[0];
    const defaultCaixa = caixas[0]?.id || '';
    selectedMensalidadesIds.forEach(id => {
      details[id] = {
        mensalidadeId: id,
        dataPagamento: today,
        formaPagamento: 'PIX',
        caixaId: defaultCaixa,
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
      const turmaLetra = aluno.turma || (aluno.classe ? 'A' : '');
      const groupKey = (aluno.setor && aluno.classe)
        ? `${aluno.setor} - ${aluno.classe} (Turma ${turmaLetra || 'A'})`
        : (aluno.classe)
          ? `${aluno.classe} (Turma ${turmaLetra || 'A'})`
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

  const globalTotalAlunosMatriculados = turmasTreeData.reduce((sum, t) => sum + t.totalAlunos, 0);
  const globalTotalBase = turmasTreeData.reduce((sum, t) => sum + t.totalBase, 0);
  const globalTotalDesconto = turmasTreeData.reduce((sum, t) => sum + t.totalDesconto, 0);
  const globalTotalLiquidoMensal = turmasTreeData.reduce((sum, t) => sum + t.totalLiquido, 0);
  const globalTotalAtrasado = turmasTreeData.reduce((sum, t) => sum + t.totalAtrasado, 0);
  const globalTotalInadimplentes = turmasTreeData.reduce((sum, t) => sum + t.inadimplentesCount, 0);
  const globalTaxaAdimplencia = globalTotalAlunosMatriculados > 0 
    ? (((globalTotalAlunosMatriculados - globalTotalInadimplentes) / globalTotalAlunosMatriculados) * 100).toFixed(1) 
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
      <PageHeader title="Alunos" description="Gestão de estudantes e matrículas">
        <div className="flex items-center gap-2 flex-wrap">
          <TutorialButton onClick={() => setIsTutorialOpen(true)} />
          <Button
            data-tour="btn-novo-aluno"
            onClick={() => {
              setEditingAlunoId(null);
              setMatriculaFormStep(1);
              setMatriculaTurmaInfo('');
              setMatriculaValorBase('');
              setMatriculaDesconto('');
              setMatriculaVencimento('5');
              setFormResponsaveis([
                {
                  id: crypto.randomUUID(),
                  nome: '',
                  contato: '',
                  parentesco: 'Mãe',
                  cpf: '',
                  rg: '',
                  email: '',
                  responsavelFinanceiro: true,
                  responsavelDidatico: true,
                },
              ]);
              setIsAlunoFormOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-white font-semibold gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Nova Matrícula
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
        <TabsList data-tour="abas-alunos" className="mb-4">
          {canAccessGestao && <TabsTrigger value="gestao">Gestão de Alunos</TabsTrigger>}
          {canAccessTurmas && <TabsTrigger value="turmas">Turmas e Contratos</TabsTrigger>}
          {canAccessMensalidades && <TabsTrigger value="mensalidades">Mensalidades</TabsTrigger>}
        </TabsList>

        <TabsContent value="gestao" className="space-y-4">
          <Card data-tour="tabela-alunos">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Listagem de Alunos</CardTitle>
            <CardDescription>Cadastre e gerencie as matrículas dos estudantes.</CardDescription>
          </div>
          <div data-tour="btn-importar-alunos" className="flex gap-2 overflow-x-auto pb-1 items-center">
            {selectedAlunosIds.length > 0 ? (
              <div data-tour="acoes-lote-alunos" className="flex gap-2 items-center">
                <Button 
                  variant="outline"
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-300 font-semibold gap-1.5 text-xs shadow-xs"
                  onClick={handleOpenTransferBatch}
                >
                  <ArrowRightLeft className="h-4 w-4 text-indigo-600" />
                  Transferência em Massa ({selectedAlunosIds.length})
                </Button>
                <Button 
                  variant="default"
                  className="bg-primary hover:bg-primary/90 text-xs font-semibold gap-1.5"
                  onClick={() => {
                    const alunoEdit = selectedAlunosIds.length === 1 ? alunos.find(a => a.id === selectedAlunosIds[0]) : null;
                    setMatricularStep(1);
                    setMatricularTurmaInfo(alunoEdit?.setor && alunoEdit?.classe ? `${alunoEdit.setor}|${alunoEdit.classe}|${alunoEdit.turma || 'A'}` : '');
                    setMatricularTurno(alunoEdit?.turno || 'Matutino');
                    setMatricularTemContraturno(Boolean(alunoEdit?.temContraturno));
                    setMatricularClasseContraturno(alunoEdit?.classeContraturno || 'Contraturno Regular');
                    setMatricularTurnoContraturno(alunoEdit?.turnoContraturno || 'Vespertino');
                    setMatricularValorContraturno(alunoEdit?.valorContraturno || '350.00');
                    setMatricularMesInicio(alunoEdit?.mesInicio || 2);
                    setMatricularQtdParcelas(alunoEdit?.parcelasContratadas || 11);
                    setMatricularDiaVencimento(alunoEdit?.diaVencimento || '10');
                    setMatricularValorBase(alunoEdit?.valorBase || '');
                    setMatricularDesconto(alunoEdit?.descontoMensalidade || '0');
                    setIsMatricularOpen(true);
                  }}
                >
                  <GraduationCap className="h-4 w-4" />
                  Matricular ({selectedAlunosIds.length})
                </Button>
              </div>
            ) : (
              displayedAlunos.length > 0 && (
                <Button
                  variant="outline"
                  className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 font-semibold gap-1.5 shadow-xs"
                  onClick={() => {
                    setTransferAlunosIds(displayedAlunos.map(a => a.id));
                    setIsTransferModalOpen(true);
                  }}
                  title="Transferir em massa todos os alunos filtrados na tabela"
                >
                  <ArrowRightLeft className="h-4 w-4 text-indigo-600" />
                  Transferência em Massa ({displayedAlunos.length})
                </Button>
              )
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
                        checked={displayedAlunos.length > 0 && displayedAlunos.every(a => selectedAlunosIds.includes(a.id))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const newIds = Array.from(new Set([...selectedAlunosIds, ...displayedAlunos.map(a => a.id)]));
                            setSelectedAlunosIds(newIds);
                          } else {
                            const currentFilteredSet = new Set(displayedAlunos.map(a => a.id));
                            setSelectedAlunosIds(prev => prev.filter(id => !currentFilteredSet.has(id)));
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
                      <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => handleSort('matriculaTurma')} title="Clique para ordenar">
                        Matrícula / Turma (Setor / Classe / Turma) {sortConfig?.key === 'matriculaTurma' ? (sortConfig.direction === 'asc' ? "↑" : "↓") : "↕"}
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
                    paginationAlunos.paginatedItems.map(aluno => (
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
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5 flex-wrap">
                          <span>{aluno.nomeResponsavel || '-'}</span>
                          {aluno.responsaveis && aluno.responsaveis.length > 1 && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-indigo-50/70 text-indigo-700 border-indigo-200">
                              +{aluno.responsaveis.length - 1} outro{aluno.responsaveis.length - 1 > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 block">
                          {aluno.parentescoResponsavel ? `${aluno.parentescoResponsavel} • ` : ''}{aluno.contatoResponsavel || 'Sem contato'}
                        </span>
                      </div>
                    </TableCell>
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
                          <span className="text-xs text-muted-foreground italic">Não matriculado</span>
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
                          <DropdownMenuItem onClick={() => handleOpenTransferSingle(aluno.id)}>
                            <ArrowRightLeft className="mr-2 h-4 w-4 text-primary" />
                            Transferir de Turma
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedAlunosIds([aluno.id]);
                            setMatricularStep(1);
                            setMatricularTurmaInfo(aluno.setor && aluno.classe ? `${aluno.setor}|${aluno.classe}|${aluno.turma || 'A'}` : '');
                            setMatricularTurno(aluno.turno || 'Matutino');
                            setMatricularTemContraturno(Boolean(aluno.temContraturno));
                            setMatricularClasseContraturno(aluno.classeContraturno || 'Contraturno Regular');
                            setMatricularTurnoContraturno(aluno.turnoContraturno || 'Vespertino');
                            setMatricularValorContraturno(aluno.valorContraturno || '350.00');
                            setMatricularMesInicio(aluno.mesInicio || 2);
                            setMatricularQtdParcelas(aluno.parcelasContratadas || 11);
                            setMatricularDiaVencimento(aluno.diaVencimento || '10');
                            setMatricularValorBase(aluno.valorBase || '');
                            setMatricularDesconto(aluno.descontoMensalidade || '0');
                            setIsMatricularOpen(true);
                          }}>
                            <GraduationCap className="mr-2 h-4 w-4 text-primary" />
                            Matricular
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            setEditingAlunoId(aluno.id);
                            setMatriculaFormStep(1);
                            setMatriculaTurmaInfo(aluno.setor && aluno.classe ? `${aluno.setor}|${aluno.classe}|${aluno.turma || 'A'}` : '');
                            setMatriculaValorBase(aluno.valorBase || '');
                            setMatriculaDesconto(aluno.descontoMensalidade || '');
                            setMatriculaVencimento(aluno.diaVencimento || '5');
                            if (aluno.responsaveis && aluno.responsaveis.length > 0) {
                              setFormResponsaveis(aluno.responsaveis);
                            } else {
                              setFormResponsaveis([
                                {
                                  id: crypto.randomUUID(),
                                  nome: aluno.nomeResponsavel || '',
                                  contato: aluno.contatoResponsavel || '',
                                  parentesco: aluno.parentescoResponsavel || 'Mãe',
                                  cpf: aluno.cpfResponsavel || '',
                                  rg: aluno.rgResponsavel || '',
                                  email: aluno.emailResponsavel || '',
                                  responsavelFinanceiro: aluno.responsavelFinanceiro ?? true,
                                  responsavelDidatico: aluno.responsavelDidatico ?? true,
                                },
                              ]);
                            }
                            setIsAlunoFormOpen(true);
                          }}>
                            <UserCog className="mr-2 h-4 w-4" />
                            Editar Matrícula / Aluno
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedAlunosIds([aluno.id]);
                            setMatricularStep(2); // Abre direto na aba financeira/contrato
                            setMatricularTurmaInfo(aluno.setor && aluno.classe ? `${aluno.setor}|${aluno.classe}|${aluno.turma || 'A'}` : '');
                            setMatricularTurno(aluno.turno || 'Matutino');
                            setMatricularTemContraturno(Boolean(aluno.temContraturno));
                            setMatricularClasseContraturno(aluno.classeContraturno || 'Contraturno Regular');
                            setMatricularTurnoContraturno(aluno.turnoContraturno || 'Vespertino');
                            setMatricularValorContraturno(aluno.valorContraturno || '350.00');
                            setMatricularMesInicio(aluno.mesInicio || 2);
                            setMatricularQtdParcelas(aluno.parcelasContratadas || 11);
                            setMatricularDiaVencimento(aluno.diaVencimento || '10');
                            setMatricularValorBase(aluno.valorBase || '');
                            setMatricularDesconto(aluno.descontoMensalidade || '0');
                            setIsMatricularOpen(true);
                          }}>
                            <FileText className="mr-2 h-4 w-4 text-indigo-600" />
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
          <DataTablePagination
            currentPage={paginationAlunos.currentPage}
            totalPages={paginationAlunos.totalPages}
            totalItems={paginationAlunos.totalItems}
            startIndex={paginationAlunos.startIndex}
            endIndex={paginationAlunos.endIndex}
            itemsPerPage={paginationAlunos.itemsPerPage}
            onPageChange={paginationAlunos.goToPage}
            onItemsPerPageChange={paginationAlunos.setItemsPerPage}
            itemName="alunos"
          />
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
                {globalTotalAlunosMatriculados} alunos matriculados ativos
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
                {globalTotalAlunosMatriculados - globalTotalInadimplentes} de {globalTotalAlunosMatriculados} em dia
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
                  <p>Nenhum aluno matriculado no sistema ainda.</p>
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
                          {turma.totalAlunos > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const ids = turma.groupAlunos.map(item => item.aluno.id);
                                setTransferAlunosIds(ids);
                                setIsTransferModalOpen(true);
                              }}
                              className="h-8 px-2.5 text-xs font-semibold gap-1.5 text-indigo-700 hover:bg-indigo-50 border-indigo-200 bg-white shadow-xs ml-auto"
                              title={`Transferir em massa todos os ${turma.totalAlunos} alunos desta turma`}
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-600" />
                              Transferir Turma ({turma.totalAlunos})
                            </Button>
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

                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenTransferSingle(aluno.id);
                                              }}
                                              className="h-6 px-2 text-xs font-semibold gap-1 text-primary hover:bg-primary/10 border-primary/30 ml-auto"
                                              title="Transferir aluno de turma"
                                            >
                                              <ArrowRightLeft className="h-3 w-3" />
                                              Transferir
                                            </Button>
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
              <>
                <Table>
                  <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">Aluno</TableHead>
                    <TableHead>Mensalidades</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginationMensalidades.paginatedItems.map(aluno => {
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
                            {aluno.setor ? `${aluno.setor} - ${aluno.classe} ${aluno.turma}` : 'Não matriculado'}
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
              <DataTablePagination
                currentPage={paginationMensalidades.currentPage}
                totalPages={paginationMensalidades.totalPages}
                totalItems={paginationMensalidades.totalItems}
                startIndex={paginationMensalidades.startIndex}
                endIndex={paginationMensalidades.endIndex}
                itemsPerPage={paginationMensalidades.itemsPerPage}
                onPageChange={paginationMensalidades.goToPage}
                onItemsPerPageChange={paginationMensalidades.setItemsPerPage}
                itemName="alunos"
              />
            </>
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
        if (!open) {
          setEditingAlunoId(null);
          setMatriculaFormStep(1);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0">
          <DialogHeader className="p-5 border-b bg-slate-50/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    {editingAlunoId ? 'Editar Matrícula / Aluno' : 'Nova Matrícula Escolar'}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    {editingAlunoId
                      ? 'Atualize os dados do estudante, responsáveis e informações contratuais.'
                      : 'Formulário guiado em 4 etapas para efetivar o cadastro e matrícula do estudante.'}
                  </DialogDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 bg-white border-slate-200">
                Passo {matriculaFormStep} de 4
              </Badge>
            </div>

            {/* Stepper Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-4 overflow-hidden">
              <div
                className="bg-primary h-1.5 transition-all duration-300 rounded-full"
                style={{
                  width:
                    matriculaFormStep === 1
                      ? '25%'
                      : matriculaFormStep === 2
                      ? '50%'
                      : matriculaFormStep === 3
                      ? '75%'
                      : '100%',
                }}
              />
            </div>

            {/* Stepper Steps / Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
              {[
                { step: 1, label: '1. Aluno & Docs', icon: User },
                { step: 2, label: '2. Endereço & Contato', icon: MapPin },
                { step: 3, label: '3. Responsáveis', icon: Users },
                { step: 4, label: '4. Turma & Contrato', icon: GraduationCap },
              ].map((s) => {
                const Icon = s.icon;
                const isActive = matriculaFormStep === s.step;
                const isCompleted = matriculaFormStep > s.step;
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setMatriculaFormStep(s.step as 1 | 2 | 3 | 4)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs font-semibold transition-all border text-left ${
                      isActive
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : isCompleted
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                        isActive
                          ? 'bg-white text-primary'
                          : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.step}
                    </div>
                    <span className="truncate">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </DialogHeader>

          <form
            ref={matriculaFormRef}
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              
              // Extract all fields
              const extractedData = {
                nome: (formData.get('nome') as string) || '',
                dataNascimento: (formData.get('dataNascimento') as string) || '',
                estadoCivil: (formData.get('estadoCivil') as string) || 'Solteiro',
                cidadeNatal: (formData.get('cidadeNatal') as string) || '',
                nacionalidade: (formData.get('nacionalidade') as string) || 'Brasileiro(a)',
                estrangeiro: formData.get('estrangeiro') === 'on',
                bloquearRematricula: formData.get('bloquearRematricula') === 'on',
                profissao: (formData.get('profissao') as string) || '',
                empresaTrabalho: (formData.get('empresaTrabalho') as string) || '',
                classificacao: (formData.get('classificacao') as string) || '',
                rg: (formData.get('rg') as string) || '',
                rgOrgao: (formData.get('rgOrgao') as string) || '',
                rgDataExpedicao: (formData.get('rgDataExpedicao') as string) || '',
                tituloEleitor: (formData.get('tituloEleitor') as string) || '',
                tituloZona: (formData.get('tituloZona') as string) || '',
                tituloSecao: (formData.get('tituloSecao') as string) || '',
                tituloDataEmissao: (formData.get('tituloDataEmissao') as string) || '',
                cpf: (formData.get('cpf') as string) || '',
                passaporte: (formData.get('passaporte') as string) || '',
                docMilitar: (formData.get('docMilitar') as string) || '',
                docMilitarNum: (formData.get('docMilitarNum') as string) || '',
                certidaoNascimento: (formData.get('certidaoNascimento') as string) || '',
                
                cep: (formData.get('cep') as string) || '',
                rua: (formData.get('rua') as string) || '',
                numero: (formData.get('numero') as string) || '',
                complemento: (formData.get('complemento') as string) || '',
                cidade: (formData.get('cidade') as string) || '',
                uf: (formData.get('uf') as string) || '',
                bairro: (formData.get('bairro') as string) || '',
                
                telefone: (formData.get('telefone') as string) || '',
                telefoneComercial: (formData.get('telefoneComercial') as string) || '',
                celularAluno: (formData.get('celularAluno') as string) || '',
                operadora: (formData.get('operadora') as string) || '',
                contatoWhatsapp: (formData.get('contatoWhatsapp') as string) || 'Celular (Aluno)',
                email: (formData.get('email') as string) || '',
                naoReceberEmail: formData.get('naoReceberEmail') === 'on',
                naoReceberSms: formData.get('naoReceberSms') === 'on',
                correspondencia: (formData.get('correspondencia') as string) || '',
                
                nomeResponsavel: (formResponsaveis.find((r) => r.responsavelFinanceiro) || formResponsaveis[0])?.nome || (formData.get('nomeResponsavel') as string) || '',
                contatoResponsavel: (formResponsaveis.find((r) => r.responsavelFinanceiro) || formResponsaveis[0])?.contato || (formData.get('contatoResponsavel') as string) || '',
                cpfResponsavel: (formResponsaveis.find((r) => r.responsavelFinanceiro) || formResponsaveis[0])?.cpf || (formData.get('cpfResponsavel') as string) || '',
                rgResponsavel: (formResponsaveis.find((r) => r.responsavelFinanceiro) || formResponsaveis[0])?.rg || (formData.get('rgResponsavel') as string) || '',
                emailResponsavel: (formResponsaveis.find((r) => r.responsavelFinanceiro) || formResponsaveis[0])?.email || (formData.get('emailResponsavel') as string) || '',
                parentescoResponsavel: (formResponsaveis.find((r) => r.responsavelFinanceiro) || formResponsaveis[0])?.parentesco || 'Mãe',
                responsavelFinanceiro: (formResponsaveis.find((r) => r.responsavelFinanceiro) || formResponsaveis[0])?.responsavelFinanceiro ?? true,
                responsavelOpcional: (formData.get('responsavelOpcional') as string) || '',
                responsavelDidatico: (formResponsaveis.find((r) => r.responsavelFinanceiro) || formResponsaveis[0])?.responsavelDidatico ?? true,
                responsaveis: formResponsaveis,
                condutorIda: (formData.get('condutorIda') as string) || '',
                condutorVolta: (formData.get('condutorVolta') as string) || '',

                // Turma e Parâmetros Financeiros
                setor: matriculaTurmaInfo ? matriculaTurmaInfo.split('|')[0] : ((formData.get('setor') as string) || ''),
                classe: matriculaTurmaInfo ? matriculaTurmaInfo.split('|')[1] : ((formData.get('classe') as string) || ''),
                turma: matriculaTurmaInfo ? matriculaTurmaInfo.split('|')[2] : ((formData.get('turma') as string) || 'A'),
                valorBase: matriculaValorBase || ((formData.get('valorBase') as string) || ''),
                descontoMensalidade: matriculaDesconto || ((formData.get('descontoMensalidade') as string) || ''),
                diaVencimento: matriculaVencimento || ((formData.get('diaVencimento') as string) || '5'),
              };

              let savedAlunoId = editingAlunoId;

              if (editingAlunoId) {
                setAlunos(alunos.map(a => {
                  if (a.id === editingAlunoId) {
                    return { ...a, ...extractedData };
                  }
                  return a;
                }));
                toast.success('Matrícula atualizada com sucesso!');
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
                savedAlunoId = crypto.randomUUID();
                
                const novoAluno: Aluno = {
                  id: savedAlunoId,
                  matricula: matriculaGerada,
                  status: 'Ativo',
                  ...extractedData
                };
                setAlunos([...alunos, novoAluno]);
                toast.success(`Matrícula concluída com sucesso! Matrícula nº ${matriculaGerada}`);
              }

              // Se turma configurada no Passo 4, gerar parcelas automáticas
              if (extractedData.classe && extractedData.valorBase && savedAlunoId) {
                const currentYear = new Date().getFullYear();
                const vBase = parseFloat(extractedData.valorBase) || 0;
                const desc = parseFloat(extractedData.descontoMensalidade || '0') || 0;
                const vFinal = Math.max(0, vBase - desc);
                const venc = parseInt(extractedData.diaVencimento || '5') || 5;

                const novasMensalidades = [...mensalidades];
                let parcelasAdicionadas = 0;

                for (let i = 1; i <= 11; i++) {
                  const mesRef = `${currentYear}-${String(i).padStart(2, '0')}`;
                  const dataVenc = new Date(currentYear, i - 1, venc).toISOString();

                  const mIndex = novasMensalidades.findIndex(m => m.alunoId === savedAlunoId && m.mesReferencia === mesRef);
                  if (mIndex === -1) {
                    novasMensalidades.push({
                      id: crypto.randomUUID(),
                      alunoId: savedAlunoId,
                      mesReferencia: mesRef,
                      valorFinal: vFinal,
                      dataVencimento: dataVenc,
                      status: 'Pendente',
                    });
                    parcelasAdicionadas++;
                  } else if (novasMensalidades[mIndex].status === 'Pendente') {
                    novasMensalidades[mIndex] = {
                      ...novasMensalidades[mIndex],
                      valorFinal: vFinal,
                      dataVencimento: dataVenc,
                    };
                  }
                }

                if (parcelasAdicionadas > 0) {
                  setMensalidades(novasMensalidades);
                  toast.info(`${parcelasAdicionadas} mensalidades do contrato geradas com sucesso.`);
                }
              }

              setIsAlunoFormOpen(false);
              setEditingAlunoId(null);
              setMatriculaFormStep(1);
            }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {(() => {
              const a = editingAlunoId ? alunos.find(al => al.id === editingAlunoId) : null;
              return (
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* ETAPA 1: DADOS DO ALUNO & DOCUMENTOS */}
                  <div className={matriculaFormStep === 1 ? 'space-y-4' : 'hidden'}>
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <User className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-bold text-slate-800">Dados Pessoais do Estudante</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-semibold text-slate-700">Nome Completo do Aluno *</label>
                        <Input name="nome" placeholder="Digite o nome completo do estudante" defaultValue={a?.nome} className="text-xs font-medium" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Data de Nascimento *</label>
                        <Input name="dataNascimento" type="date" defaultValue={a?.dataNascimento} className="text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Estado Civil</label>
                        <Select name="estadoCivil" defaultValue={a?.estadoCivil || "Solteiro"}>
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Solteiro">Solteiro(a)</SelectItem>
                            <SelectItem value="Casado">Casado(a)</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Naturalidade / Cidade Natal</label>
                        <Input name="cidadeNatal" placeholder="Ex: Feira de Santana - BA" defaultValue={a?.cidadeNatal} className="text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Nacionalidade</label>
                        <Input name="nacionalidade" defaultValue={a?.nacionalidade || 'Brasileiro(a)'} className="text-xs" />
                      </div>
                      <div className="flex items-center space-x-4 pt-2 md:col-span-2">
                        <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                          <input type="checkbox" name="estrangeiro" defaultChecked={a?.estrangeiro} className="rounded border-gray-300 text-primary" />
                          <span>Estrangeiro(a)</span>
                        </label>
                        <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                          <input type="checkbox" name="bloquearRematricula" defaultChecked={a?.bloquearRematricula} className="rounded border-gray-300 text-primary" />
                          <span>Bloquear Rematrícula Futura</span>
                        </label>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Profissão / Formação</label>
                        <Input name="profissao" placeholder="Opcional" defaultValue={a?.profissao} className="text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Empresa / Local de Trabalho</label>
                        <Input name="empresaTrabalho" placeholder="Opcional" defaultValue={a?.empresaTrabalho} className="text-xs" />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-4 pb-2 border-b">
                      <FileText className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-bold text-slate-800">Documentação do Estudante</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">CPF do Aluno *</label>
                        <Input name="cpf" placeholder="000.000.000-00" defaultValue={a?.cpf} className="text-xs font-mono" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">RG</label>
                        <Input name="rg" placeholder="Número do RG" defaultValue={a?.rg} className="text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Órgão Expedidor</label>
                        <Input name="rgOrgao" placeholder="Ex: SSP/BA" defaultValue={a?.rgOrgao} className="text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Data Expedição RG</label>
                        <Input name="rgDataExpedicao" type="date" defaultValue={a?.rgDataExpedicao} className="text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Passaporte</label>
                        <Input name="passaporte" placeholder="Opcional" defaultValue={a?.passaporte} className="text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Certidão Nascimento / Casamento</label>
                        <Input name="certidaoNascimento" placeholder="Termo / Livro / Folha" defaultValue={a?.certidaoNascimento} className="text-xs" />
                      </div>
                    </div>
                  </div>

                  {/* ETAPA 2: ENDEREÇO & CONTATO */}
                  <div className={matriculaFormStep === 2 ? 'space-y-4' : 'hidden'}>
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <MapPin className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-bold text-slate-800">Endereço Residencial do Aluno</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5 md:col-span-1">
                        <label className="text-xs font-semibold text-slate-700">CEP</label>
                        <Input name="cep" placeholder="00000-000" defaultValue={a?.cep} className="text-xs font-mono" />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-semibold text-slate-700">Rua / Logradouro</label>
                        <Input name="rua" placeholder="Av. / Rua / Travessa" defaultValue={a?.rua} className="text-xs" />
                      </div>
                      <div className="space-y-1.5 md:col-span-1">
                        <label className="text-xs font-semibold text-slate-700">Número</label>
                        <Input name="numero" placeholder="Nº ou S/N" defaultValue={a?.numero} className="text-xs" />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-semibold text-slate-700">Complemento / Apto</label>
                        <Input name="complemento" placeholder="Apto, Bloco, Casa" defaultValue={a?.complemento} className="text-xs" />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-semibold text-slate-700">Bairro</label>
                        <Input name="bairro" placeholder="Nome do bairro" defaultValue={a?.bairro} className="text-xs" />
                      </div>
                      <div className="space-y-1.5 md:col-span-3">
                        <label className="text-xs font-semibold text-slate-700">Cidade</label>
                        <Input name="cidade" placeholder="Cidade" defaultValue={a?.cidade || 'Feira de Santana'} className="text-xs" />
                      </div>
                      <div className="space-y-1.5 md:col-span-1">
                        <label className="text-xs font-semibold text-slate-700">UF</label>
                        <Input name="uf" maxLength={2} defaultValue={a?.uf || 'BA'} className="text-xs uppercase" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 pb-2 border-b">
                      <Users className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-bold text-slate-800">Canais de Comunicação & Notificações</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Telefone Residencial / Fixo</label>
                        <Input name="telefone" placeholder="(00) 0000-0000" defaultValue={a?.telefone} className="text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Celular do Estudante</label>
                        <Input name="celularAluno" placeholder="(00) 00000-0000" defaultValue={a?.celularAluno} className="text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Contato WhatsApp Principal</label>
                        <Select name="contatoWhatsapp" defaultValue={a?.contatoWhatsapp || 'Celular (Aluno)'}>
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Celular (Aluno)">Celular do Aluno</SelectItem>
                            <SelectItem value="Celular (Responsável)">Celular do Responsável</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 md:col-span-3">
                        <label className="text-xs font-semibold text-slate-700">E-mail Principal</label>
                        <Input name="email" type="email" placeholder="aluno@email.com" defaultValue={a?.email} className="text-xs" />
                      </div>
                      <div className="flex items-center space-x-4 md:col-span-3 pt-1">
                        <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                          <input type="checkbox" name="naoReceberEmail" defaultChecked={a?.naoReceberEmail} className="rounded border-gray-300 text-primary" />
                          <span>Não enviar informativos por e-mail</span>
                        </label>
                        <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                          <input type="checkbox" name="naoReceberSms" defaultChecked={a?.naoReceberSms} className="rounded border-gray-300 text-primary" />
                          <span>Não enviar SMS</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* ETAPA 3: RESPONSÁVEIS & LOGÍSTICA */}
                  <div className={matriculaFormStep === 3 ? 'space-y-5' : 'hidden'}>
                    <div className="flex items-center justify-between pb-2 border-b">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-bold text-slate-800">
                          Responsáveis pelo Estudante ({formResponsaveis.length})
                        </h4>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormResponsaveis([
                            ...formResponsaveis,
                            {
                              id: crypto.randomUUID(),
                              nome: '',
                              contato: '',
                              parentesco: formResponsaveis.length === 1 ? 'Pai' : 'Outro',
                              cpf: '',
                              rg: '',
                              email: '',
                              responsavelFinanceiro: false,
                              responsavelDidatico: true,
                            },
                          ]);
                        }}
                        className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5 font-semibold h-8"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Adicionar Responsável
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {formResponsaveis.map((resp, index) => (
                        <div
                          key={resp.id}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4 transition-all"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                                {index + 1}
                              </span>
                              <span className="font-bold text-xs text-slate-800">
                                {index === 0 ? 'Responsável 1 (Principal)' : `Responsável ${index + 1}`}
                              </span>
                              {resp.responsavelFinanceiro && (
                                <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] py-0">
                                  Financeiro
                                </Badge>
                              )}
                              {resp.responsavelDidatico && (
                                <Badge variant="outline" className="text-[10px] py-0 text-slate-600 bg-white">
                                  Pedagógico
                                </Badge>
                              )}
                            </div>

                            {formResponsaveis.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setFormResponsaveis(formResponsaveis.filter((r) => r.id !== resp.id));
                                }}
                                className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 px-2"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remover
                              </Button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5 md:col-span-2">
                              <label className="text-xs font-semibold text-slate-700">
                                Nome Completo do Responsável *
                              </label>
                              <Input
                                placeholder="Nome completo do pai, mãe ou tutor legal"
                                value={resp.nome}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setFormResponsaveis((prev) =>
                                    prev.map((r) => (r.id === resp.id ? { ...r, nome: val } : r))
                                  );
                                }}
                                className="text-xs font-medium bg-white"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-700">Telefone / WhatsApp *</label>
                              <Input
                                placeholder="(00) 00000-0000"
                                value={resp.contato}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setFormResponsaveis((prev) =>
                                    prev.map((r) => (r.id === resp.id ? { ...r, contato: val } : r))
                                  );
                                }}
                                className="text-xs bg-white"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-700">Grau de Parentesco</label>
                              <Select
                                value={resp.parentesco || 'Mãe'}
                                onValueChange={(val) => {
                                  setFormResponsaveis((prev) =>
                                    prev.map((r) => (r.id === resp.id ? { ...r, parentesco: val } : r))
                                  );
                                }}
                              >
                                <SelectTrigger className="text-xs bg-white"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Mãe">Mãe</SelectItem>
                                  <SelectItem value="Pai">Pai</SelectItem>
                                  <SelectItem value="Padrasto">Padrasto</SelectItem>
                                  <SelectItem value="Madrasta">Madrasta</SelectItem>
                                  <SelectItem value="Tutor">Tutor(a) Legal</SelectItem>
                                  <SelectItem value="Avô">Avô/Avó</SelectItem>
                                  <SelectItem value="Tio">Tio/Tia</SelectItem>
                                  <SelectItem value="Irmão">Irmão/Irmã</SelectItem>
                                  <SelectItem value="Outro">Outro Familiar</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-700">CPF do Responsável</label>
                              <Input
                                placeholder="000.000.000-00"
                                value={resp.cpf || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setFormResponsaveis((prev) =>
                                    prev.map((r) => (r.id === resp.id ? { ...r, cpf: val } : r))
                                  );
                                }}
                                className="text-xs font-mono bg-white"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-700">RG do Responsável</label>
                              <Input
                                placeholder="Número do RG"
                                value={resp.rg || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setFormResponsaveis((prev) =>
                                    prev.map((r) => (r.id === resp.id ? { ...r, rg: val } : r))
                                  );
                                }}
                                className="text-xs bg-white"
                              />
                            </div>

                            <div className="space-y-1.5 md:col-span-2">
                              <label className="text-xs font-semibold text-slate-700">E-mail do Responsável</label>
                              <Input
                                type="email"
                                placeholder="responsavel@email.com"
                                value={resp.email || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setFormResponsaveis((prev) =>
                                    prev.map((r) => (r.id === resp.id ? { ...r, email: val } : r))
                                  );
                                }}
                                className="text-xs bg-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                              <div className="space-y-0.5">
                                <label className="text-xs font-bold text-slate-800">Responsável Financeiro</label>
                                <p className="text-[10px] text-muted-foreground">Responsável pelo contrato e pagamentos.</p>
                              </div>
                              <Switch
                                checked={resp.responsavelFinanceiro ?? false}
                                onCheckedChange={(checked) => {
                                  setFormResponsaveis((prev) =>
                                    prev.map((r) => ({
                                      ...r,
                                      responsavelFinanceiro:
                                        r.id === resp.id ? checked : checked ? false : r.responsavelFinanceiro,
                                    }))
                                  );
                                }}
                              />
                            </div>

                            <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                              <div className="space-y-0.5">
                                <label className="text-xs font-bold text-slate-800">Responsável Didático</label>
                                <p className="text-[10px] text-muted-foreground">Acompanha notas, avisos e ocorrências.</p>
                              </div>
                              <Switch
                                checked={resp.responsavelDidatico ?? true}
                                onCheckedChange={(checked) => {
                                  setFormResponsaveis((prev) =>
                                    prev.map((r) => (r.id === resp.id ? { ...r, responsavelDidatico: checked } : r))
                                  );
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setFormResponsaveis([
                          ...formResponsaveis,
                          {
                            id: crypto.randomUUID(),
                            nome: '',
                            contato: '',
                            parentesco: formResponsaveis.length === 1 ? 'Pai' : 'Outro',
                            cpf: '',
                            rg: '',
                            email: '',
                            responsavelFinanceiro: false,
                            responsavelDidatico: true,
                          },
                        ]);
                      }}
                      className="w-full py-3 border-2 border-dashed border-primary/40 rounded-xl text-primary font-semibold text-xs flex items-center justify-center gap-2 hover:bg-primary/5 transition-all bg-white shadow-xs"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar Outro Responsável (Pai, Mãe, Tutor ou Familiar)
                    </button>

                    <div className="flex items-center gap-2 pt-4 pb-2 border-b">
                      <Users className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-bold text-slate-800">Logística & Condutores Autorizados</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Condutor Ida (Leva o Aluno)</label>
                        <Input name="condutorIda" placeholder="Nome da pessoa autorizada a trazer o aluno" defaultValue={a?.condutorIda} className="text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Condutor Volta (Busca o Aluno)</label>
                        <Input name="condutorVolta" placeholder="Nome da pessoa autorizada a buscar o aluno" defaultValue={a?.condutorVolta} className="text-xs" />
                      </div>
                    </div>
                  </div>

                  {/* ETAPA 4: TURMA, CONTRATO & RESUMO */}
                  <div className={matriculaFormStep === 4 ? 'space-y-5' : 'hidden'}>
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-bold text-slate-800">Turma e Condições da Matrícula</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-semibold text-slate-700">Selecione a Turma Escolar *</label>
                        <Select 
                          value={matriculaTurmaInfo || (a?.setor ? `${a.setor}|${a.classe}|${a.turma || 'A'}` : '')}
                          onValueChange={(val) => {
                            setMatriculaTurmaInfo(val);
                            const [setor, classe] = val.split('|');
                            const turmaObj = turmas.find(t => t.setor === setor && t.nome === classe);
                            if (turmaObj && turmaObj.valorPadrao !== undefined) {
                              setMatriculaValorBase(String(turmaObj.valorPadrao));
                            }
                          }}
                        >
                          <SelectTrigger className="text-xs bg-white font-medium">
                            <SelectValue placeholder="Escolha a turma do estudante..." />
                          </SelectTrigger>
                          <SelectContent>
                            {turmas.map(t => {
                              if (t.letras.length === 0) {
                                return (
                                  <SelectItem key={`${t.setor}|${t.nome}|Geral`} value={`${t.setor}|${t.nome}|Geral`}>
                                    {t.setor} - {t.nome} (Geral)
                                  </SelectItem>
                                );
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

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Valor Base da Mensalidade (R$) *</label>
                        <Input 
                          name="valorBase" 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          placeholder="Ex: 650.00" 
                          value={matriculaValorBase || (a?.valorBase || '')} 
                          onChange={(e) => setMatriculaValorBase(e.target.value)} 
                          className="text-xs font-bold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Desconto Pontualidade (R$)</label>
                        <Input 
                          name="descontoMensalidade" 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          placeholder="Ex: 50.00" 
                          value={matriculaDesconto || (a?.descontoMensalidade || '')} 
                          onChange={(e) => setMatriculaDesconto(e.target.value)} 
                          className="text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Dia de Vencimento da Mensalidade</label>
                        <Select 
                          value={matriculaVencimento || (a?.diaVencimento || '5')} 
                          onValueChange={setMatriculaVencimento}
                        >
                          <SelectTrigger className="text-xs bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">Dia 05 de cada mês</SelectItem>
                            <SelectItem value="10">Dia 10 de cada mês</SelectItem>
                            <SelectItem value="15">Dia 15 de cada mês</SelectItem>
                            <SelectItem value="20">Dia 20 de cada mês</SelectItem>
                            <SelectItem value="25">Dia 25 de cada mês</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Ano Letivo de Matrícula</label>
                        <Input disabled value="Ano Letivo 2026" className="text-xs bg-slate-100 font-semibold" />
                      </div>
                    </div>

                    {/* Resumo da Matrícula */}
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-2.5">
                      <div className="flex items-center gap-2 font-bold text-xs text-emerald-900">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Resumo da Efetivação da Matrícula
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                        <div>
                          <span className="text-emerald-700 font-medium block">Turma Contratada:</span>
                          <span className="font-bold text-slate-800">
                            {matriculaTurmaInfo ? matriculaTurmaInfo.replace(/\|/g, ' - ') : (a?.classe ? `${a.setor} - ${a.classe}` : 'Não selecionada')}
                          </span>
                        </div>
                        <div>
                          <span className="text-emerald-700 font-medium block">Mensalidade Líquida:</span>
                          <span className="font-bold text-emerald-900 text-sm">
                            {(() => {
                              const base = parseFloat(matriculaValorBase || a?.valorBase || '0') || 0;
                              const desc = parseFloat(matriculaDesconto || a?.descontoMensalidade || '0') || 0;
                              return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.max(0, base - desc));
                            })()}
                          </span>
                        </div>
                        <div>
                          <span className="text-emerald-700 font-medium block">Vencimento & Parcelas:</span>
                          <span className="font-bold text-slate-800">
                            Dia {matriculaVencimento || a?.diaVencimento || '5'} • 11 Mensalidades
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* BARRA DE NAVEGAÇÃO MULTI-STEP */}
            <div className="flex items-center justify-between p-4 border-t bg-slate-50/80">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAlunoFormOpen(false);
                  setEditingAlunoId(null);
                  setMatriculaFormStep(1);
                }}
                className="text-xs"
              >
                Cancelar
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={matriculaFormStep === 1}
                  onClick={() => setMatriculaFormStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : 1))}
                  className="text-xs gap-1.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </Button>

                {matriculaFormStep < 4 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (matriculaFormRef.current) {
                        const form = matriculaFormRef.current;
                        if (matriculaFormStep === 1) {
                          const nome = (form.elements.namedItem('nome') as HTMLInputElement)?.value?.trim();
                          if (!nome) {
                            toast.error('Por favor, informe o nome do aluno antes de avançar.');
                            return;
                          }
                        } else if (matriculaFormStep === 3) {
                          if (formResponsaveis.length === 0) {
                            toast.error('Por favor, adicione pelo menos um responsável.');
                            return;
                          }
                          const invalidIndex = formResponsaveis.findIndex((r) => !r.nome.trim() || !r.contato.trim());
                          if (invalidIndex !== -1) {
                            toast.error(`Por favor, preencha o Nome e Telefone do Responsável ${invalidIndex + 1}.`);
                            return;
                          }
                        }
                      }
                      setMatriculaFormStep((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : 4));
                    }}
                    className="text-xs gap-1.5 bg-primary hover:bg-primary/90 text-white font-semibold"
                  >
                    Próximo Passo
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {editingAlunoId ? 'Salvar Alterações' : 'Concluir Matrícula'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isMatricularOpen} onOpenChange={(open) => {
        setIsMatricularOpen(open);
        if (!open) setMatricularStep(1);
      }}>
        <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0">
          <DialogHeader className="p-5 border-b bg-slate-50/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    {selectedAlunosIds.length > 1
                      ? `Matrícula em Lote (${selectedAlunosIds.length} Alunos)`
                      : 'Matrícula do Aluno'}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    {matricularStep === 1
                      ? 'Passo 1: Selecione a turma, o turno das aulas e a participação no contraturno escolar.'
                      : matricularStep === 2
                      ? 'Passo 2: Defina quando iniciará a cobrança, quantidade de parcelas e descontos.'
                      : 'Passo 3: Confira o resumo do contrato e imprima os documentos escolares.'}
                  </DialogDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 bg-white border-slate-200">
                Passo {matricularStep} de 3
              </Badge>
            </div>

            {/* Stepper Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-4 overflow-hidden">
              <div
                className="bg-primary h-1.5 transition-all duration-300 rounded-full"
                style={{
                  width:
                    matricularStep === 1
                      ? '33.33%'
                      : matricularStep === 2
                      ? '66.66%'
                      : '100%',
                }}
              />
            </div>

            {/* Stepper Pills */}
            <div className="grid grid-cols-3 gap-2 pt-3">
              {[
                { step: 1, label: '1. Turma', icon: GraduationCap },
                { step: 2, label: '2. Financeiro', icon: CreditCard },
                { step: 3, label: '3. Contrato', icon: FileText },
              ].map((s) => {
                const Icon = s.icon;
                const isActive = matricularStep === s.step;
                const isCompleted = matricularStep > s.step;
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => {
                      if (s.step === 2 || s.step === 3) {
                        if (!matricularTurmaInfo) {
                          toast.error('Por favor, selecione uma turma antes de avançar.');
                          return;
                        }
                      }
                      setMatricularStep(s.step as 1 | 2 | 3);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs font-semibold transition-all border text-left ${
                      isActive
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : isCompleted
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                        isActive
                          ? 'bg-white text-primary'
                          : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.step}
                    </div>
                    <span className="truncate">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!matricularTurmaInfo) {
                toast.error('Por favor, selecione a turma do aluno.');
                setMatricularStep(1);
                return;
              }

              const [setor, classe, turmaStr] = matricularTurmaInfo.split('|');
              const vBase = parseFloat(matricularValorBase) || 0;
              const vContra = matricularTemContraturno ? (parseFloat(matricularValorContraturno) || 0) : 0;
              const vDesc = parseFloat(matricularDesconto) || 0;
              const vFinal = Math.max(0, vBase + vContra - vDesc);
              const diaVenc = parseInt(matricularDiaVencimento) || 10;
              const mesIni = matricularMesInicio || 2;
              const qtdParc = matricularQtdParcelas || 11;
              const anoLet = parseInt(matricularAnoLetivo) || new Date().getFullYear();

              // 1. Atualizar o cadastro dos alunos
              setAlunos(
                alunos.map((a) => {
                  if (selectedAlunosIds.includes(a.id)) {
                    return {
                      ...a,
                      setor,
                      classe,
                      turma: turmaStr || 'A',
                      turno: matricularTurno,
                      temContraturno: matricularTemContraturno,
                      classeContraturno: matricularTemContraturno ? matricularClasseContraturno : '',
                      turnoContraturno: matricularTemContraturno ? matricularTurnoContraturno : '',
                      valorContraturno: matricularTemContraturno ? matricularValorContraturno : '0',
                      valorBase: matricularValorBase,
                      descontoMensalidade: matricularDesconto,
                      diaVencimento: matricularDiaVencimento,
                      mesInicio: matricularMesInicio,
                      parcelasContratadas: matricularQtdParcelas,
                      dataMatricula: new Date().toISOString(),
                    };
                  }
                  return a;
                })
              );

              // 2. Gerar as mensalidades contratadas
              const novasMensalidades = [...mensalidades];
              let parcelasCriadasOuAtualizadas = 0;

              selectedAlunosIds.forEach((id) => {
                for (let i = 0; i < qtdParc; i++) {
                  const targetMonth = ((mesIni - 1 + i) % 12) + 1;
                  const yearOffset = Math.floor((mesIni - 1 + i) / 12);
                  const targetYear = anoLet + yearOffset;
                  const mesRef = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
                  const dataVenc = new Date(targetYear, targetMonth - 1, diaVenc).toISOString();

                  const mIndex = novasMensalidades.findIndex(
                    (m) => m.alunoId === id && m.mesReferencia === mesRef
                  );

                  if (mIndex === -1) {
                    novasMensalidades.push({
                      id: crypto.randomUUID(),
                      alunoId: id,
                      mesReferencia: mesRef,
                      valorFinal: vFinal,
                      dataVencimento: dataVenc,
                      status: 'Pendente',
                    });
                    parcelasCriadasOuAtualizadas++;
                  } else if (novasMensalidades[mIndex].status === 'Pendente') {
                    novasMensalidades[mIndex] = {
                      ...novasMensalidades[mIndex],
                      valorFinal: vFinal,
                      dataVencimento: dataVenc,
                    };
                    parcelasCriadasOuAtualizadas++;
                  }
                }
              });

              setMensalidades(novasMensalidades);
              toast.success(
                `Matrícula concluída com sucesso! ${selectedAlunosIds.length} estudante(s) matriculado(s) e ${qtdParc} parcelas contratuais geradas.`
              );
              setIsMatricularOpen(false);
              setMatricularStep(1);
            }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Informações do Aluno Selecionado */}
              {selectedAlunosIds.length === 1 && (() => {
                const al = alunos.find((a) => a.id === selectedAlunosIds[0]);
                if (!al) return null;
                return (
                  <div className="p-3 bg-slate-50 border rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {al.nome.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 text-sm block">{al.nome}</span>
                        <span className="text-slate-500">Matrícula: {al.matricula || 'Pendente'} • Resp: {al.nomeResponsavel || 'Não informado'}</span>
                      </div>
                    </div>
                    {al.classe && (
                      <Badge variant="secondary" className="text-[11px]">
                        Turma Atual: {al.classe} ({al.turma || 'A'})
                      </Badge>
                    )}
                  </div>
                );
              })()}

              {/* PASSO 1: TURMA, TURNO E CONTRATURNO */}
              <div className={matricularStep === 1 ? 'space-y-5' : 'hidden'}>
                {/* 1.1 Seleção da Turma Regular */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    Qual a Turma do Estudante? *
                  </label>
                  <Select
                    value={matricularTurmaInfo}
                    onValueChange={(val) => {
                      setMatricularTurmaInfo(val);
                      const [setor, classe] = val.split('|');
                      const turmaObj = turmas.find((t) => t.setor === setor && t.nome === classe);
                      if (turmaObj && turmaObj.valorPadrao !== undefined) {
                        setMatricularValorBase(String(turmaObj.valorPadrao));
                      }
                    }}
                  >
                    <SelectTrigger className="text-xs bg-white h-10 border-slate-300">
                      <SelectValue placeholder="Selecione a turma escolar desejada..." />
                    </SelectTrigger>
                    <SelectContent>
                      {turmas.map((t) => {
                        if (t.letras.length === 0) {
                          return (
                            <SelectItem key={`${t.setor}|${t.nome}|Geral`} value={`${t.setor}|${t.nome}|Geral`}>
                              {t.setor} - {t.nome} (Geral)
                            </SelectItem>
                          );
                        }
                        return t.letras.map((l) => (
                          <SelectItem key={`${t.setor}|${t.nome}|${l}`} value={`${t.setor}|${t.nome}|${l}`}>
                            {t.setor} - {t.nome} (Turma {l})
                          </SelectItem>
                        ));
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* 1.2 Qual o Turno da Aula */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-primary" />
                      Qual o Turno da Aula? *
                    </label>
                    <span className="text-[11px] text-slate-500">Selecione o turno caso a turma tenha mais de um</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'Matutino', label: 'Matutino', desc: 'Manhã (07h30 às 11h50)', icon: Sun },
                      { id: 'Vespertino', label: 'Vespertino', desc: 'Tarde (13h10 às 17h30)', icon: Sun },
                      { id: 'Integral', label: 'Integral', desc: 'Dia Todo (07h30 às 17h30)', icon: Clock },
                      { id: 'Noturno', label: 'Noturno', desc: 'Noite (18h30 às 22h00)', icon: Moon },
                    ].map((turn) => {
                      const TurnIcon = turn.icon;
                      const isSelected = matricularTurno === turn.id;
                      return (
                        <button
                          key={turn.id}
                          type="button"
                          onClick={() => setMatricularTurno(turn.id)}
                          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'border-primary bg-primary/5 text-primary shadow-xs ring-1 ring-primary'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs">{turn.label}</span>
                            <TurnIcon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-slate-400'}`} />
                          </div>
                          <span className="text-[10px] text-slate-500 leading-tight">{turn.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 1.3 Participará do Contraturno ou Não */}
                <div className="pt-2">
                  <div className={`p-4 rounded-xl border transition-all ${matricularTemContraturno ? 'bg-indigo-50/60 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Sparkles className={`h-4 w-4 ${matricularTemContraturno ? 'text-indigo-600' : 'text-slate-400'}`} />
                          <label htmlFor="switch-contraturno" className="text-xs font-bold text-slate-800 cursor-pointer">
                            Aluno Participará do Contraturno?
                          </label>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Atividades complementares, acompanhamento pedagógico, oficinas e reforço escolar.
                        </p>
                      </div>
                      <Switch
                        id="switch-contraturno"
                        checked={matricularTemContraturno}
                        onCheckedChange={setMatricularTemContraturno}
                      />
                    </div>

                    {matricularTemContraturno && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 mt-3 border-t border-indigo-100">
                        <div className="space-y-1.5 sm:col-span-1">
                          <label className="text-[11px] font-semibold text-slate-700">Modalidade / Turma Contraturno</label>
                          <Select value={matricularClasseContraturno} onValueChange={setMatricularClasseContraturno}>
                            <SelectTrigger className="text-xs bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Contraturno Regular">Contraturno Geral</SelectItem>
                              <SelectItem value="Contraturno Infantil">Contraturno Infantil</SelectItem>
                              <SelectItem value="Robótica Educativa Maker">Robótica Maker</SelectItem>
                              <SelectItem value="Oficina de Redação & Leitura">Redação & Leitura</SelectItem>
                              <SelectItem value="Esportes & Judô Escolar">Esportes & Judô</SelectItem>
                              <SelectItem value="Inglês Bilíngue">Inglês Bilíngue</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5 sm:col-span-1">
                          <label className="text-[11px] font-semibold text-slate-700">Turno do Contraturno</label>
                          <Select value={matricularTurnoContraturno} onValueChange={setMatricularTurnoContraturno}>
                            <SelectTrigger className="text-xs bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Vespertino">Vespertino (Tarde)</SelectItem>
                              <SelectItem value="Matutino">Matutino (Manhã)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5 sm:col-span-1">
                          <label className="text-[11px] font-semibold text-slate-700">Adicional Contraturno (R$)</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={matricularValorContraturno}
                            onChange={(e) => setMatricularValorContraturno(e.target.value)}
                            className="text-xs bg-white font-semibold"
                            placeholder="Ex: 350.00"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* PASSO 2: FINANCEIRO, PARCELAS E DESCONTOS */}
              <div className={matricularStep === 2 ? 'space-y-5' : 'hidden'}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Quando começará a ser cobrado */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      Início da Cobrança (Mês) *
                    </label>
                    <Select
                      value={String(matricularMesInicio)}
                      onValueChange={(val) => setMatricularMesInicio(parseInt(val, 10))}
                    >
                      <SelectTrigger className="text-xs bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Janeiro</SelectItem>
                        <SelectItem value="2">2 - Fevereiro (Início Letivo)</SelectItem>
                        <SelectItem value="3">3 - Março</SelectItem>
                        <SelectItem value="4">4 - Abril</SelectItem>
                        <SelectItem value="5">5 - Maio</SelectItem>
                        <SelectItem value="6">6 - Junho</SelectItem>
                        <SelectItem value="7">7 - Julho</SelectItem>
                        <SelectItem value="8">8 - Agosto</SelectItem>
                        <SelectItem value="9">9 - Setembro</SelectItem>
                        <SelectItem value="10">10 - Outubro</SelectItem>
                        <SelectItem value="11">11 - Novembro</SelectItem>
                        <SelectItem value="12">12 - Dezembro</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-[10px] text-slate-500">Mês de referência da 1ª mensalidade</span>
                  </div>

                  {/* Quantas parcelas */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-primary" />
                      Quantidade de Parcelas *
                    </label>
                    <Select
                      value={String(matricularQtdParcelas)}
                      onValueChange={(val) => setMatricularQtdParcelas(parseInt(val, 10))}
                    >
                      <SelectTrigger className="text-xs bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="11">11 Parcelas (Fev a Dez)</SelectItem>
                        <SelectItem value="12">12 Parcelas (Ano Completo)</SelectItem>
                        <SelectItem value="10">10 Parcelas</SelectItem>
                        <SelectItem value="6">6 Parcelas (Semestral)</SelectItem>
                        <SelectItem value="1">1 Parcela Única</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-[10px] text-slate-500">Total de boletos contratuais</span>
                  </div>

                  {/* Dia de vencimento */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      Dia de Vencimento *
                    </label>
                    <Select value={matricularDiaVencimento} onValueChange={setMatricularDiaVencimento}>
                      <SelectTrigger className="text-xs bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Dia 05 de cada mês</SelectItem>
                        <SelectItem value="10">Dia 10 de cada mês</SelectItem>
                        <SelectItem value="15">Dia 15 de cada mês</SelectItem>
                        <SelectItem value="20">Dia 20 de cada mês</SelectItem>
                        <SelectItem value="25">Dia 25 de cada mês</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-[10px] text-slate-500">Vencimento mensal recorrente</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800">Valor Base da Mensalidade (R$) *</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      placeholder="Ex: 650.00"
                      value={matricularValorBase}
                      onChange={(e) => setMatricularValorBase(e.target.value)}
                      className="text-xs font-bold bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800">Desconto Pontualidade / Bolsa (R$)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Ex: 50.00"
                      value={matricularDesconto}
                      onChange={(e) => setMatricularDesconto(e.target.value)}
                      className="text-xs bg-white"
                    />
                  </div>
                </div>

                {/* Card de Simulação Financeira em Tempo Real */}
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 space-y-3 mt-4">
                  <div className="flex items-center justify-between font-bold text-xs text-emerald-950">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-emerald-700" />
                      <span>Simulação das Condições Financeiras</span>
                    </div>
                    <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-white">
                      Ano Letivo {matricularAnoLetivo}
                    </Badge>
                  </div>

                  {(() => {
                    const base = parseFloat(matricularValorBase) || 0;
                    const contra = matricularTemContraturno ? (parseFloat(matricularValorContraturno) || 0) : 0;
                    const desc = parseFloat(matricularDesconto) || 0;
                    const vFinal = Math.max(0, base + contra - desc);
                    const totalContrato = vFinal * matricularQtdParcelas;

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                        <div>
                          <span className="text-emerald-700 font-medium block text-[11px]">Valor Base:</span>
                          <span className="font-bold text-slate-800">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(base)}
                          </span>
                        </div>
                        {matricularTemContraturno && (
                          <div>
                            <span className="text-emerald-700 font-medium block text-[11px]">Contraturno:</span>
                            <span className="font-bold text-indigo-700">
                              +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contra)}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-emerald-700 font-medium block text-[11px]">Desconto:</span>
                          <span className="font-bold text-rose-600">
                            -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(desc)}
                          </span>
                        </div>
                        <div>
                          <span className="text-emerald-800 font-bold block text-[11px]">Mensalidade Líquida:</span>
                          <span className="font-black text-emerald-950 text-base">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vFinal)}
                          </span>
                        </div>
                        <div className="col-span-2 sm:col-span-4 pt-2 border-t border-emerald-200/70 flex flex-wrap items-center justify-between text-[11px] text-emerald-900">
                          <span>
                            Plano: <strong>{matricularQtdParcelas} parcelas</strong> com vencimento todo <strong>dia {matricularDiaVencimento}</strong>
                          </span>
                          <span>
                            Total do Contrato: <strong className="text-emerald-950 text-xs">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalContrato)}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* PASSO 3: CONTRATO & DOCUMENTOS COM OPÇÃO DE IMPRESSÃO */}
              <div className={matricularStep === 3 ? 'space-y-5' : 'hidden'}>
                {/* Resumo do Contrato */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Resumo das Condições Contratuais
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block text-[11px]">Turma & Turno:</span>
                      <span className="font-bold text-slate-800">
                        {matricularTurmaInfo.replace(/\|/g, ' - ')} ({matricularTurno})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block text-[11px]">Contraturno:</span>
                      <span className="font-bold text-slate-800">
                        {matricularTemContraturno ? `${matricularClasseContraturno} (${matricularTurnoContraturno})` : 'Não participa'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block text-[11px]">Plano de Cobrança:</span>
                      <span className="font-bold text-slate-800">
                        {matricularQtdParcelas} parcelas a partir do Mês {matricularMesInicio}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card de Documentos e Impressão */}
                <div className="p-5 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/50 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-700" />
                        <h4 className="font-bold text-sm text-purple-950">Documentos Escolares Prontos para Impressão</h4>
                      </div>
                      <p className="text-xs text-purple-800/80">
                        O contrato oficial de prestação de serviços educacionais e adendos foram gerados com as informações desta matrícula.
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={() => setIsDocImpressaoOpen(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-2 shrink-0 shadow-sm"
                    >
                      <Printer className="h-4 w-4" />
                      Imprimir Documentos
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-purple-200">
                    <Badge variant="outline" className="bg-white text-purple-800 border-purple-200 text-xs">
                      ✓ Contrato de Prestação de Serviços Educacionais
                    </Badge>
                    {matricularTemContraturno && (
                      <Badge variant="outline" className="bg-white text-purple-800 border-purple-200 text-xs">
                        ✓ Adendo Contratual de Contraturno
                      </Badge>
                    )}
                    <Badge variant="outline" className="bg-white text-purple-800 border-purple-200 text-xs">
                      ✓ Ficha e Requerimento de Matrícula
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* BARRA DE NAVEGAÇÃO DOS PASSOS */}
            <div className="flex items-center justify-between p-4 border-t bg-slate-50/80">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsMatricularOpen(false);
                  setMatricularStep(1);
                }}
                className="text-xs"
              >
                Cancelar
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={matricularStep === 1}
                  onClick={() => setMatricularStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : 1))}
                  className="text-xs gap-1.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </Button>

                {matricularStep < 3 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (matricularStep === 1) {
                        if (!matricularTurmaInfo) {
                          toast.error('Por favor, selecione a turma do aluno para avançar.');
                          return;
                        }
                      }
                      setMatricularStep((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : 3));
                    }}
                    className="text-xs gap-1.5 bg-primary hover:bg-primary/90 text-white font-semibold"
                  >
                    Próximo Passo
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Concluir Matrícula
                  </Button>
                )}
              </div>
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
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
                      <label className="text-xs font-medium">Qual Caixa?</label>
                      <Select 
                        value={detail.caixaId || caixas[0]?.id || ''} 
                        onValueChange={(val) => updatePaymentDetail(m.id, 'caixaId', val)}
                      >
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {caixas.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {detail.formaPagamento === 'Boleto' && (
                        <span className="text-[10px] text-indigo-700 font-semibold block truncate">
                          {getBankDisplayName(detectBankFromCaixa(detail.caixaId || caixas[0]?.id, caixas))}
                        </span>
                      )}
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

      <DocumentosImpressaoModal
        isOpen={isDocImpressaoOpen}
        onClose={() => setIsDocImpressaoOpen(false)}
        documentos={documentosTemplates.filter(d => {
          if (!d.ativo) return false;
          if (d.tipoVinculo === 'todos') return true;
          if (d.tipoVinculo === 'contraturno') return matricularTemContraturno;
          return false;
        })}
        aluno={{
          ...(selectedAlunosIds.length === 1 ? alunos.find(a => a.id === selectedAlunosIds[0]) : (alunos[0] || {})),
          setor: matricularTurmaInfo ? matricularTurmaInfo.split('|')[0] : '',
          classe: matricularTurmaInfo ? matricularTurmaInfo.split('|')[1] : '',
          turma: matricularTurmaInfo ? matricularTurmaInfo.split('|')[2] : 'A',
          turno: matricularTurno,
          temContraturno: matricularTemContraturno,
          classeContraturno: matricularClasseContraturno,
          turmaContraturno: matricularTurnoContraturno,
          valorContraturno: matricularValorContraturno,
          valorBase: matricularValorBase,
          descontoMensalidade: matricularDesconto,
          diaVencimento: matricularDiaVencimento,
          parcelasContratadas: matricularQtdParcelas,
        }}
        dadosFinanceiros={{
          valorMensalidade: Math.max(0, (parseFloat(matricularValorBase) || 0) + (matricularTemContraturno ? (parseFloat(matricularValorContraturno) || 0) : 0) - (parseFloat(matricularDesconto) || 0)),
          qtdParcelas: matricularQtdParcelas,
          diaVencimento: matricularDiaVencimento,
          valorContraturno: matricularTemContraturno ? (parseFloat(matricularValorContraturno) || 0) : 0,
          anoLetivo: matricularAnoLetivo,
        }}
        escolaNome={school?.name || 'Colégio Interagir Papagaio'}
      />

      <TransferirTurmaModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setTransferAlunosIds([]);
        }}
        selectedAlunoIds={transferAlunosIds}
        alunos={alunos}
        turmas={turmas}
        onConfirmTransfer={handleConfirmTransfer}
        onNovaTurmaCriada={handleNovaTurmaLetraCriada}
      />

      {/* Tutorial Passo a Passo da Tela de Matrículas / Alunos */}
      <TutorialTour
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        steps={MATRICULA_TUTORIAL_STEPS}
      />

      {/* Modal de QR Code Pix */}
      <PixQrCodeModal
        isOpen={pixModalData.isOpen}
        onClose={() => setPixModalData(prev => ({ ...prev, isOpen: false }))}
        valor={pixModalData.valor}
        descricao={pixModalData.descricao}
        copiaCola={pixModalData.copiaCola}
        alunoNome={pixModalData.alunoNome}
        responsavelNome={pixModalData.responsavelNome}
        instituicaoNome={pixModalData.instituicaoNome}
      />

      {/* Modal de Confirmação do Boleto Aberto */}
      <BoletoGeradoModal
        isOpen={boletoModalData.isOpen}
        onClose={() => setBoletoModalData(prev => ({ ...prev, isOpen: false }))}
        valor={boletoModalData.valor}
        descricao={boletoModalData.descricao}
        linhaDigitavel={boletoModalData.linhaDigitavel}
        barcodeNumber={boletoModalData.barcodeNumber}
        boletoUrl={boletoModalData.boletoUrl}
        alunoNome={boletoModalData.alunoNome}
        bancoNome={boletoModalData.bancoNome}
      />
    </div>
  );
};

export default Alunos;
