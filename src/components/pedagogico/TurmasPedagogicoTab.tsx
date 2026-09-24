import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  TurmaPedagogica,
  GradeHoraria,
  HorarioSlot,
  Materia,
  DEFAULT_TURMAS_PEDAGOGICO,
  DEFAULT_MATERIAS,
  DIAS_SEMANA_PADRAO,
  INTERVALOS_PADRAO,
} from '@/types/pedagogico';
import { TurmaConfig } from '@/types/finance';
import { Aluno, Mensalidade } from '@/types/aluno';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TransferirTurmaModal } from '@/components/alunos/TransferirTurmaModal';
import {
  DEFAULT_TURMAS_CONFIG,
  ensureDefaultTurmas,
  addLetraToClasse,
  normalizeAllAlunos,
  syncTurmasPedagogicasComGlobais,
  matchesAlunoTurma,
  isTurmaExcluida,
  registerTurmaExcluida,
  unmarkTurmaExcluida,
} from '@/constants/turmas';
import {
  GraduationCap,
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  Split,
  Maximize2,
  DollarSign,
  MapPin,
  CheckCircle2,
  Sparkles,
  Layers,
  HelpCircle,
  X,
  Settings2,
  ArrowUp,
  ArrowDown,
  Wand2,
  Eye,
  ArrowRightLeft,
  MessageSquare,
  Phone,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { AnoLetivoSelector } from '@/components/pedagogico/AnoLetivoSelector';
import { TutorialTour, TutorialButton } from '@/components/common/TutorialTour';

function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const cleaned = timeStr.replace(/[^\d:]/g, '');
  const [hStr, mStr] = cleaned.split(':');
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;

  const totalMinutes = h * 60 + m + minutesToAdd;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;

  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export const TurmasPedagogicoTab: React.FC = () => {
  // Dados de turmas pedagógicas com enriquecimento
  const [turmasPedagogico, setTurmasPedagogico] = useLocalStorage<TurmaPedagogica[]>(
    'escolinha_turmas_pedagogico_v1',
    DEFAULT_TURMAS_PEDAGOGICO
  );

  // Turmas do financeiro/sistema global para sincronização
  const [turmasGlobais, setTurmasGlobais] = useLocalStorage<TurmaConfig[]>('escolinha_turmas_v3', DEFAULT_TURMAS_CONFIG);
  const [alunos, setAlunos] = useLocalStorage<Aluno[]>('escolinha_alunos', []);
  const [mensalidades, setMensalidades] = useLocalStorage<Mensalidade[]>('escolinha_mensalidades', []);
  const [employees] = useLocalStorage<any[]>('escolinha_employees_v2', []);
  const [materias] = useLocalStorage<Materia[]>('escolinha_materias_v1', DEFAULT_MATERIAS);

  // Estados para Modal de Ver Alunos da Turma
  const [selectedTurmaParaAlunos, setSelectedTurmaParaAlunos] = useState<TurmaPedagogica | null>(null);
  const [termoBuscaAlunosTurma, setTermoBuscaAlunosTurma] = useState('');
  const [selectedModalAlunoIds, setSelectedModalAlunoIds] = useState<string[]>([]);

  // Estados para Transferência Facilitada de Turma
  const [transferAlunoIds, setTransferAlunoIds] = useState<string[]>([]);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Filtro e Busca
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSetorFilter, setSelectedSetorFilter] = useState('todos');
  const [anoLetivoAtivo, setAnoLetivoAtivo] = useLocalStorage<string>(
    'escolinha_ano_letivo_ativo',
    String(new Date().getFullYear())
  );
  const [turmasExcluidas, setTurmasExcluidas] = useLocalStorage<string[]>(
    'escolinha_turmas_excluidas_v1',
    []
  );
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  // Estados de Modais
  const [isTurmaModalOpen, setIsTurmaModalOpen] = useState(false);
  const [editingTurma, setEditingTurma] = useState<TurmaPedagogica | null>(null);

  // Form State Turma
  const [formNome, setFormNome] = useState('');
  const [formSetor, setFormSetor] = useState('Ensino Fundamental 1');
  const [formAnoLetivo, setFormAnoLetivo] = useState('2026');
  const [formTurno, setFormTurno] = useState<TurmaPedagogica['turno']>('Matutino');
  const [formValorMensalidade, setFormValorMensalidade] = useState<number>(850);
  const [formMaxAlunos, setFormMaxAlunos] = useState<number>(25);
  const [formSala, setFormSala] = useState('');
  const [formProfessorId, setFormProfessorId] = useState<string>('');
  const [formStatus, setFormStatus] = useState<TurmaPedagogica['status']>('Ativa');
  const [formObservacoes, setFormObservacoes] = useState('');

  // Grade Horária Modal / Visualizador
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [turmaGradeSelecionada, setTurmaGradeSelecionada] = useState<TurmaPedagogica | null>(null);
  const [gradeAtual, setGradeAtual] = useState<GradeHoraria>({
    dias: DIAS_SEMANA_PADRAO,
    intervalos: INTERVALOS_PADRAO,
    slots: {},
  });

  // Modal para definir aula no slot da grade
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [currentSlotKey, setCurrentSlotKey] = useState<string>('');
  const [currentSubSlotIndex, setCurrentSubSlotIndex] = useState<0 | 1 | null>(null);
  const [slotMateriaId, setSlotMateriaId] = useState<string>('');
  const [slotProfessorId, setSlotProfessorId] = useState<string>('');
  const [slotSala, setSlotSala] = useState<string>('');

  // Estados para Configuração e Quantidade de Intervalos
  const [isConfigIntervalosModalOpen, setIsConfigIntervalosModalOpen] = useState(false);
  const [tempIntervalos, setTempIntervalos] = useState<string[]>([]);
  const [intervalosActiveTab, setIntervalosActiveTab] = useState<'lista' | 'gerador'>('lista');
  const [isEditSingleModalOpen, setIsEditSingleModalOpen] = useState(false);
  const [singleIntervaloOriginal, setSingleIntervaloOriginal] = useState('');
  const [singleIntervaloNovo, setSingleIntervaloNovo] = useState('');

  // Estados do Gerador Automático de Intervalos
  const [genInicio, setGenInicio] = useState('07:30');
  const [genDuracaoAula, setGenDuracaoAula] = useState<number>(50);
  const [genQtdAulas, setGenQtdAulas] = useState<number>(6);
  const [genTemRecreio, setGenTemRecreio] = useState(true);
  const [genRecreioAposAula, setGenRecreioAposAula] = useState<number>(2);
  const [genDuracaoRecreio, setGenDuracaoRecreio] = useState<number>(20);

  // Normalização segura sem recriar turmas excluídas
  useEffect(() => {
    if (alunos && alunos.length > 0) {
      const { alunos: alunosNormalizados, changed } = normalizeAllAlunos(alunos, turmasGlobais);
      if (changed) {
        setAlunos(alunosNormalizados);
      }
    }
  }, []);

  // Sincronização manual completa respeitando exclusões do usuário
  const handleSyncCompleto = () => {
    const globaisPadrao = ensureDefaultTurmas(turmasGlobais, turmasExcluidas, true);
    setTurmasGlobais(globaisPadrao);

    let countAlunosNormalizados = 0;
    if (alunos && alunos.length > 0) {
      const { alunos: alunosNormalizados, countChanged } = normalizeAllAlunos(alunos, globaisPadrao);
      if (countChanged > 0) {
        setAlunos(alunosNormalizados);
        countAlunosNormalizados = countChanged;
      }
    }

    const { updatedTurmasPedagogico, createdCount } = syncTurmasPedagogicasComGlobais(
      globaisPadrao,
      turmasPedagogico,
      turmasExcluidas
    );
    setTurmasPedagogico(updatedTurmasPedagogico);

    toast.success(
      `Sincronização concluída! ${createdCount} turma(s) atualizada(s) e turmas excluídas foram respeitadas.`
    );
  };

  // Criação rápida de turma adicional (ex: Turma B, Turma C)
  const handleAddTurmaAdicional = (baseClasse: string, setor: string, novaLetra: string) => {
    const letraUpper = novaLetra.trim().toUpperCase() || 'B';
    const nomeNovaTurma = `${baseClasse} ${letraUpper}`.trim();

    const exists = turmasPedagogico.some(
      (t) => t.nome.toLowerCase() === nomeNovaTurma.toLowerCase()
    );
    if (exists) {
      toast.info(`A turma "${nomeNovaTurma}" já existe!`);
      return;
    }

    const { updatedTurmas, changed } = addLetraToClasse(turmasGlobais, setor, baseClasse, letraUpper);
    if (changed) {
      setTurmasGlobais(updatedTurmas);
    }

    const novaTurmaPed: TurmaPedagogica = {
      id: `turma-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      nome: nomeNovaTurma,
      setor: setor,
      anoLetivo: '2026',
      turno: 'Matutino',
      valorMensalidade: 850,
      maxAlunos: 25,
      sala: `Sala ${baseClasse} ${letraUpper}`,
      status: 'Ativa',
      gradeHoraria: {
        dias: DIAS_SEMANA_PADRAO,
        intervalos: INTERVALOS_PADRAO,
        slots: {},
      },
    };

    setTurmasPedagogico((prev) => [...prev, novaTurmaPed]);
    toast.success(`Turma adicional "${nomeNovaTurma}" criada com sucesso!`);
  };

  // Confirmação de transferência facilitada de aluno(s)
  const handleConfirmTransfer = (params: {
    alunoIds: string[];
    novoSetor: string;
    novaClasse: string;
    novaTurma: string;
    ajustarMensalidades: boolean;
  }) => {
    const turmaDestinoObj = turmasGlobais.find(
      (t) => t.setor.trim() === params.novoSetor.trim() && t.nome.trim() === params.novaClasse.trim()
    );
    const novoValorPadrao = turmaDestinoObj?.valorPadrao;

    setAlunos((prevAlunos) =>
      prevAlunos.map((a) => {
        if (params.alunoIds.includes(a.id)) {
          return {
            ...a,
            setor: params.novoSetor,
            classe: params.novaClasse,
            turma: params.novaTurma,
            valorBase: (params.ajustarMensalidades && novoValorPadrao !== undefined) ? String(novoValorPadrao) : a.valorBase,
          };
        }
        return a;
      })
    );

    if (params.ajustarMensalidades && novoValorPadrao !== undefined) {
      setMensalidades((prev) =>
        prev.map((m) => {
          if (params.alunoIds.includes(m.alunoId) && m.status === 'Pendente') {
            const aluno = alunos.find((a) => a.id === m.alunoId);
            const desc = parseFloat(aluno?.descontoMensalidade || '0');
            const novoValorFinal = Math.max(0, novoValorPadrao - desc);
            return {
              ...m,
              valorFinal: novoValorFinal,
              valorOriginalBase: novoValorPadrao,
            };
          }
          return m;
        })
      );
    }

    const targetTurmaNome = `${params.novaClasse} ${params.novaTurma}`.trim();
    const existsInPedag = turmasPedagogico.some(
      (t) => t.nome.toLowerCase() === targetTurmaNome.toLowerCase()
    );

    if (!existsInPedag) {
      const novaTurmaPed: TurmaPedagogica = {
        id: `turma-${Date.now()}`,
        nome: targetTurmaNome,
        setor: params.novoSetor,
        anoLetivo: '2026',
        turno: 'Matutino',
        valorMensalidade: novoValorPadrao || 850,
        maxAlunos: 25,
        sala: `Sala ${targetTurmaNome}`,
        status: 'Ativa',
        gradeHoraria: {
          dias: DIAS_SEMANA_PADRAO,
          intervalos: INTERVALOS_PADRAO,
          slots: {},
        },
      };
      setTurmasPedagogico((prev) => [...prev, novaTurmaPed]);
    }

    const { updatedTurmas, changed } = addLetraToClasse(
      turmasGlobais,
      params.novoSetor,
      params.novaClasse,
      params.novaTurma
    );
    if (changed) {
      setTurmasGlobais(updatedTurmas);
    }

    setIsTransferModalOpen(false);
    setTransferAlunoIds([]);
    setSelectedModalAlunoIds([]);
    toast.success(
      params.alunoIds.length > 1
        ? `${params.alunoIds.length} alunos transferidos em massa para ${targetTurmaNome} com sucesso!`
        : `Aluno transferido para ${targetTurmaNome} com sucesso!`
    );
  };

  // Lista de Professores
  const professores = employees.filter((emp) => {
    const role = (emp.role || '').toLowerCase();
    const dept = (emp.department || '').toLowerCase();
    return role.includes('prof') || role.includes('educad') || dept.includes('pedag') || dept.includes('prof');
  });

  // Abrir Modal de Criação de Turma
  const handleOpenNewTurma = () => {
    setEditingTurma(null);
    setFormNome('');
    setFormSetor('Ensino Fundamental 1');
    setFormAnoLetivo(anoLetivoAtivo === 'todos' ? String(new Date().getFullYear()) : anoLetivoAtivo);
    setFormTurno('Matutino');
    setFormValorMensalidade(850);
    setFormMaxAlunos(25);
    setFormSala('');
    setFormProfessorId('');
    setFormStatus('Ativa');
    setFormObservacoes('');
    setIsTurmaModalOpen(true);
  };

  // Copiar/clonar turmas de um ano de origem para um novo ano letivo
  const handleClonarTurmasParaAno = (anoOrigem: string, anoDestino: string) => {
    const turmasOrigem = turmasPedagogico.filter((t) => (t.anoLetivo || '2026') === anoOrigem);
    if (turmasOrigem.length === 0) {
      toast.error(`Não foram encontradas turmas no ano de ${anoOrigem} para copiar.`);
      return;
    }

    const novasTurmas: TurmaPedagogica[] = turmasOrigem.map((t) => ({
      ...t,
      id: `turma-${anoDestino}-${t.nome.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      anoLetivo: anoDestino,
      status: 'Planejamento',
    }));

    setTurmasPedagogico((prev) => [...prev, ...novasTurmas]);
    toast.success(`${novasTurmas.length} turmas copiadas de ${anoOrigem} para ${anoDestino} com sucesso!`);
  };

  // Abrir Modal de Edição de Turma Existente
  const handleOpenEditTurma = (turma: TurmaPedagogica) => {
    setEditingTurma(turma);
    setFormNome(turma.nome);
    setFormSetor(turma.setor || 'Ensino Fundamental 1');
    setFormAnoLetivo(turma.anoLetivo || '2026');
    setFormTurno(turma.turno || 'Matutino');
    setFormValorMensalidade(turma.valorMensalidade || 850);
    setFormMaxAlunos(turma.maxAlunos || 25);
    setFormSala(turma.sala || '');
    setFormProfessorId(turma.professorRegenteId || '');
    setFormStatus(turma.status || 'Ativa');
    setFormObservacoes(turma.observacoes || '');
    setIsTurmaModalOpen(true);
  };

  // Salvar Turma (Criação ou Edição)
  const handleSaveTurma = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      toast.error('Informe o nome da turma.');
      return;
    }

    const profObj = employees.find((emp) => String(emp.id) === String(formProfessorId));

    if (editingTurma) {
      const oldNome = editingTurma.nome.toLowerCase().trim();
      const oldSetor = editingTurma.setor.toLowerCase().trim();

      // Atualizar turma existente
      setTurmasPedagogico((prev) =>
        prev.map((t) =>
          t.id === editingTurma.id
            ? {
                ...t,
                nome: formNome.trim(),
                setor: formSetor,
                anoLetivo: formAnoLetivo,
                turno: formTurno,
                valorMensalidade: Number(formValorMensalidade) || 0,
                maxAlunos: Number(formMaxAlunos) || 25,
                sala: formSala.trim() || 'Sala Principal',
                professorRegenteId: profObj ? String(profObj.id) : undefined,
                professorRegenteNome: profObj ? profObj.name : undefined,
                professorRegenteFoto: profObj?.photoUrl || undefined,
                status: formStatus,
                observacoes: formObservacoes.trim(),
              }
            : t
        )
      );

      // Atualizar alunos que pertencem a esta turma para sincronizar o setor e nome
      setAlunos((prevAlunos) =>
        prevAlunos.map((a) => {
          const aClasse = (a.classe || '').toLowerCase().trim();
          const aTurma = (a.turma || '').toLowerCase().trim();
          const aFullName = `${aClasse} ${aTurma}`.trim();
          const aSetor = (a.setor || '').toLowerCase().trim();

          const isMatch =
            aFullName === oldNome ||
            aClasse === oldNome ||
            (aSetor === oldSetor && (aFullName === oldNome || aClasse === oldNome));

          if (isMatch) {
            return {
              ...a,
              setor: formSetor,
            };
          }
          return a;
        })
      );

      // Atualiza turma no sistema global de turmas
      setTurmasGlobais((prevTg) =>
        prevTg.map((tg) => {
          const tgFullName = tg.nome.toLowerCase().trim();
          if (tgFullName === oldNome || tg.nome.toLowerCase().includes(oldNome)) {
            return {
              ...tg,
              setor: formSetor,
              nome: formNome.trim(),
            };
          }
          return tg;
        })
      );

      toast.success(`Turma "${formNome}" atualizada com sucesso! Alunos vinculados foram atualizados.`);
    } else {
      // Criar nova turma
      const nova: TurmaPedagogica = {
        id: `turma-${Date.now()}`,
        nome: formNome.trim(),
        setor: formSetor,
        anoLetivo: formAnoLetivo,
        turno: formTurno,
        valorMensalidade: Number(formValorMensalidade) || 0,
        maxAlunos: Number(formMaxAlunos) || 25,
        sala: formSala.trim() || 'Sala Principal',
        professorRegenteId: profObj ? String(profObj.id) : undefined,
        professorRegenteNome: profObj ? profObj.name : undefined,
        professorRegenteFoto: profObj?.photoUrl || undefined,
        status: formStatus,
        observacoes: formObservacoes.trim(),
        gradeHoraria: {
          dias: DIAS_SEMANA_PADRAO,
          intervalos: INTERVALOS_PADRAO,
          slots: {},
        },
      };

      setTurmasPedagogico((prev) => [...prev, nova]);
      toast.success(`Turma "${formNome}" cadastrada com sucesso!`);
    }

    setTurmasExcluidas((prev) => unmarkTurmaExcluida(formNome.trim(), prev));
    setIsTurmaModalOpen(false);
  };

  // Excluir Turma com persistência definitiva
  const handleDeleteTurma = (id: string, nomeTurma: string) => {
    if (window.confirm(`Deseja realmente remover a turma "${nomeTurma}"? Ela não voltará a aparecer.`)) {
      // 1. Remove de turmas pedagógicas
      setTurmasPedagogico((prev) => prev.filter((t) => t.id !== id));

      // 2. Extrai base e letra (ex: "Grupo 2 A" -> base: "Grupo 2", letra: "A")
      const match = nomeTurma.trim().match(/^(.*?)\s+([A-Za-z])$/);
      const baseNome = match ? match[1].trim() : nomeTurma.trim();
      const letra = match ? match[2].toUpperCase() : 'A';

      // 3. Atualiza ou remove de turmas globais
      setTurmasGlobais((prev) => {
        return prev
          .map((tg) => {
            const isMatch =
              tg.nome.trim().toLowerCase() === baseNome.toLowerCase() ||
              tg.nome.trim().toLowerCase() === nomeTurma.trim().toLowerCase();
            if (!isMatch) return tg;
            const remainingLetras = (tg.letras || ['A']).filter((l) => l.toUpperCase() !== letra);
            return { ...tg, letras: remainingLetras };
          })
          .filter(
            (tg) =>
              tg.letras.length > 0 &&
              tg.nome.trim().toLowerCase() !== nomeTurma.trim().toLowerCase()
          );
      });

      // 4. Registra no armazenamento persistente de turmas excluídas
      let nextExcluidas = registerTurmaExcluida(nomeTurma, id, turmasExcluidas);
      const hasOtherPedag = turmasPedagogico.some(
        (t) =>
          t.id !== id &&
          (t.nome.toLowerCase().startsWith(baseNome.toLowerCase()) ||
            t.nome.toLowerCase() === baseNome.toLowerCase())
      );
      if (!hasOtherPedag) {
        nextExcluidas = registerTurmaExcluida(baseNome, undefined, nextExcluidas);
      }
      setTurmasExcluidas(nextExcluidas);

      // 5. Desvincula alunos vinculados a essa turma
      setAlunos((prev) =>
        prev.map((a) => {
          if (matchesAlunoTurma(a, nomeTurma)) {
            return { ...a, turma: '' };
          }
          return a;
        })
      );

      toast.success(`Turma "${nomeTurma}" excluída com sucesso.`);
    }
  };

  // Separar automaticamente o Ensino Fundamental em Fundamental 1 (1º ao 5º) e Fundamental 2 (6º ao 9º)
  const handleSepararFundamental = () => {
    let alunosAlterados = 0;
    let turmasAlteradas = 0;

    const classifySetor = (nomeOuClasse: string, setorAtual: string) => {
      const text = `${nomeOuClasse} ${setorAtual}`.toLowerCase();

      if (text.includes('infantil') || text.includes('maternal') || text.includes('grupo') || text.includes('pré') || text.includes('pre')) {
        return 'Educação Infantil';
      }
      if (text.includes('contraturno') || text.includes('integral')) {
        return 'Contraturno';
      }
      if (
        text.includes('1º') || text.includes('1 ano') || text.includes('1º ano') || text.includes('1o ano') ||
        text.includes('2º') || text.includes('2 ano') || text.includes('2º ano') || text.includes('2o ano') ||
        text.includes('3º') || text.includes('3 ano') || text.includes('3º ano') || text.includes('3o ano') ||
        text.includes('4º') || text.includes('4 ano') || text.includes('4º ano') || text.includes('4o ano') ||
        text.includes('5º') || text.includes('5 ano') || text.includes('5º ano') || text.includes('5o ano')
      ) {
        return 'Ensino Fundamental 1';
      }
      if (
        text.includes('6º') || text.includes('6 ano') || text.includes('6º ano') || text.includes('6o ano') ||
        text.includes('7º') || text.includes('7 ano') || text.includes('7º ano') || text.includes('7o ano') ||
        text.includes('8º') || text.includes('8 ano') || text.includes('8º ano') || text.includes('8o ano') ||
        text.includes('9º') || text.includes('9 ano') || text.includes('9º ano') || text.includes('9o ano')
      ) {
        return 'Ensino Fundamental 2';
      }
      if (text.includes('médio') || text.includes('medio') || text.includes('em')) {
        return 'Ensino Médio';
      }
      return setorAtual;
    };

    setAlunos((prev) =>
      prev.map((a) => {
        const novoSetor = classifySetor(a.classe || a.turma || '', a.setor || '');
        if (novoSetor !== a.setor) {
          alunosAlterados++;
          return { ...a, setor: novoSetor };
        }
        return a;
      })
    );

    setTurmasPedagogico((prev) =>
      prev.map((t) => {
        const novoSetor = classifySetor(t.nome, t.setor);
        if (novoSetor !== t.setor) {
          turmasAlteradas++;
          return { ...t, setor: novoSetor };
        }
        return t;
      })
    );

    setTurmasGlobais((prev) =>
      prev.map((tg) => {
        const novoSetor = classifySetor(tg.nome, tg.setor);
        return { ...tg, setor: novoSetor };
      })
    );

    toast.success(
      `Organização concluída! ${alunosAlterados} aluno(s) e ${turmasAlteradas} turma(s) organizados entre Fundamental 1 e 2.`
    );
  };

  // Abrir Construtor de Grade Horária
  const handleOpenGrade = (turma: TurmaPedagogica) => {
    setTurmaGradeSelecionada(turma);
    setGradeAtual(
      turma.gradeHoraria || {
        dias: DIAS_SEMANA_PADRAO,
        intervalos: INTERVALOS_PADRAO,
        slots: {},
      }
    );
    setIsGradeModalOpen(true);
  };

  // Salvar Grade Horária na Turma
  const handleSaveGrade = () => {
    if (!turmaGradeSelecionada) return;

    setTurmasPedagogico((prev) =>
      prev.map((t) =>
        t.id === turmaGradeSelecionada.id ? { ...t, gradeHoraria: gradeAtual } : t
      )
    );
    toast.success(`Grade de horários da turma "${turmaGradeSelecionada.nome}" salva com sucesso!`);
    setIsGradeModalOpen(false);
  };

  // Abrir Modal de Configuração de Intervalos
  const handleOpenConfigIntervalos = () => {
    setTempIntervalos([...gradeAtual.intervalos]);
    setIntervalosActiveTab('lista');
    setIsConfigIntervalosModalOpen(true);
  };

  // Alterar valor de um intervalo na lista temporária
  const handleUpdateIntervaloItem = (idx: number, valor: string) => {
    setTempIntervalos((prev) => {
      const copy = [...prev];
      copy[idx] = valor;
      return copy;
    });
  };

  // Mover intervalo para cima ou para baixo
  const handleMoveIntervalo = (idx: number, direcao: 'up' | 'down') => {
    setTempIntervalos((prev) => {
      const copy = [...prev];
      const targetIdx = direcao === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= copy.length) return prev;
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  // Excluir intervalo da lista temporária
  const handleRemoveIntervaloItem = (idx: number) => {
    if (tempIntervalos.length <= 1) {
      toast.error('A grade deve conter no mínimo 1 intervalo de horário.');
      return;
    }
    setTempIntervalos((prev) => prev.filter((_, i) => i !== idx));
  };

  // Adicionar intervalo manualmente calculando o próximo horário
  const handleAddNewIntervaloManual = () => {
    let nextStart = '12:00';
    let nextEnd = '12:50';

    if (tempIntervalos.length > 0) {
      const last = tempIntervalos[tempIntervalos.length - 1];
      const parts = last.split('-');
      if (parts.length === 2) {
        const lastEnd = parts[1].trim();
        nextStart = lastEnd;
        nextEnd = addMinutesToTime(lastEnd, 50);
      }
    }

    setTempIntervalos((prev) => [...prev, `${nextStart} - ${nextEnd}`]);
    toast.success('Novo intervalo adicionado à lista!');
  };

  // Escolher quantidade de intervalos (corta ou expande sequencialmente)
  const handleChangeQtdIntervalos = (novaQtd: number) => {
    const qtd = Math.max(1, Math.min(15, novaQtd));
    if (qtd > tempIntervalos.length) {
      let current = [...tempIntervalos];
      while (current.length < qtd) {
        const last = current[current.length - 1];
        let nextStart = '12:00';
        let nextEnd = '12:50';
        if (last) {
          const parts = last.split('-');
          if (parts.length === 2) {
            nextStart = parts[1].trim();
            nextEnd = addMinutesToTime(nextStart, 50);
          }
        }
        current.push(`${nextStart} - ${nextEnd}`);
      }
      setTempIntervalos(current);
    } else if (qtd < tempIntervalos.length) {
      setTempIntervalos(tempIntervalos.slice(0, qtd));
    }
  };

  // Gerar intervalos automaticamente com base no início, duração e recreio
  const handleGerarAutomatico = () => {
    let currentStart = genInicio.trim() || '07:30';
    const novos: string[] = [];

    for (let i = 1; i <= genQtdAulas; i++) {
      const aulaEnd = addMinutesToTime(currentStart, Number(genDuracaoAula) || 50);
      novos.push(`${currentStart} - ${aulaEnd}`);
      currentStart = aulaEnd;

      if (genTemRecreio && i === Number(genRecreioAposAula) && i < genQtdAulas) {
        const recreioEnd = addMinutesToTime(currentStart, Number(genDuracaoRecreio) || 20);
        novos.push(`${currentStart} - ${recreioEnd} (Recreio)`);
        currentStart = recreioEnd;
      }
    }

    setTempIntervalos(novos);
    setIntervalosActiveTab('lista');
    toast.success(`${novos.length} intervalos de horários gerados automaticamente!`);
  };

  // Salvar a nova lista de intervalos e migrar slots existentes se horários mudaram
  const handleSaveConfigIntervalos = () => {
    const cleaned = tempIntervalos.map((i) => i.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      toast.error('Adicione pelo menos 1 intervalo de horário.');
      return;
    }

    const oldIntervalos = gradeAtual.intervalos;
    const newSlots = { ...gradeAtual.slots };

    // Migrar dados dos slots para novos nomes se foram editados
    oldIntervalos.forEach((oldInt, idx) => {
      const newInt = cleaned[idx];
      if (newInt && newInt !== oldInt) {
        gradeAtual.dias.forEach((dia) => {
          const oldKey = `${dia}_${oldInt}`;
          const newKey = `${dia}_${newInt}`;
          if (newSlots[oldKey]) {
            newSlots[newKey] = newSlots[oldKey];
            delete newSlots[oldKey];
          }
        });
      }
    });

    setGradeAtual((prev) => ({
      ...prev,
      intervalos: cleaned,
      slots: newSlots,
    }));

    setIsConfigIntervalosModalOpen(false);
    toast.success(`Grade atualizada com ${cleaned.length} intervalos de horário!`);
  };

  // Abrir edição rápida de um único intervalo
  const handleOpenEditSingle = (intervalo: string) => {
    setSingleIntervaloOriginal(intervalo);
    setSingleIntervaloNovo(intervalo);
    setIsEditSingleModalOpen(true);
  };

  // Salvar edição rápida de um único intervalo
  const handleSaveSingleIntervalo = () => {
    const novo = singleIntervaloNovo.trim();
    if (!novo) {
      toast.error('Informe o novo horário.');
      return;
    }

    if (novo === singleIntervaloOriginal) {
      setIsEditSingleModalOpen(false);
      return;
    }

    const newSlots = { ...gradeAtual.slots };
    gradeAtual.dias.forEach((dia) => {
      const oldKey = `${dia}_${singleIntervaloOriginal}`;
      const newKey = `${dia}_${novo}`;
      if (newSlots[oldKey]) {
        newSlots[newKey] = newSlots[oldKey];
        delete newSlots[oldKey];
      }
    });

    setGradeAtual((prev) => ({
      ...prev,
      intervalos: prev.intervalos.map((i) => (i === singleIntervaloOriginal ? novo : i)),
      slots: newSlots,
    }));

    setIsEditSingleModalOpen(false);
    toast.success('Horário atualizado na grade!');
  };

  // Ações nos Slots da Grade
  const handleOpenSlotModal = (slotKey: string, subIndex: 0 | 1 | null = null) => {
    setCurrentSlotKey(slotKey);
    setCurrentSubSlotIndex(subIndex);

    const slot = gradeAtual.slots[slotKey];
    if (slot) {
      if (subIndex !== null && slot.subSlots && slot.subSlots[subIndex]) {
        const sub = slot.subSlots[subIndex];
        setSlotMateriaId(sub.materiaId || '');
        setSlotProfessorId(sub.professorId || '');
        setSlotSala(sub.sala || '');
      } else {
        setSlotMateriaId(slot.materiaId || '');
        setSlotProfessorId(slot.professorId || '');
        setSlotSala(slot.sala || '');
      }
    } else {
      setSlotMateriaId('');
      setSlotProfessorId('');
      setSlotSala(turmaGradeSelecionada?.sala || '');
    }

    setIsSlotModalOpen(true);
  };

  const handleSaveSlot = () => {
    const matObj = materias.find((m) => m.id === slotMateriaId);
    const profObj = employees.find((emp) => String(emp.id) === String(slotProfessorId));

    setGradeAtual((prev) => {
      const current = prev.slots[currentSlotKey] || {};

      if (currentSubSlotIndex !== null) {
        // Editando um sub-slot de um horário dividido
        const existingSubSlots = current.subSlots || [
          { id: 'sub-1', rotulo: 'Parte 1' },
          { id: 'sub-2', rotulo: 'Parte 2' },
        ];

        existingSubSlots[currentSubSlotIndex] = {
          ...existingSubSlots[currentSubSlotIndex],
          materiaId: matObj?.id,
          materiaNome: matObj?.nome,
          materiaCor: matObj?.cor,
          professorId: profObj ? String(profObj.id) : undefined,
          professorNome: profObj?.name,
          sala: slotSala,
        };

        return {
          ...prev,
          slots: {
            ...prev.slots,
            [currentSlotKey]: {
              ...current,
              isSubdivided: true,
              subSlots: existingSubSlots as [any, any],
            },
          },
        };
      } else {
        // Horário único regular
        return {
          ...prev,
          slots: {
            ...prev.slots,
            [currentSlotKey]: {
              isSubdivided: false,
              materiaId: matObj?.id,
              materiaNome: matObj?.nome,
              materiaCor: matObj?.cor,
              professorId: profObj ? String(profObj.id) : undefined,
              professorNome: profObj?.name,
              sala: slotSala,
            },
          },
        };
      }
    });

    setIsSlotModalOpen(false);
    toast.success('Horário definido na grade!');
  };

  // Subdividir slot (hover action)
  const handleSplitSlot = (slotKey: string) => {
    setGradeAtual((prev) => {
      const current = prev.slots[slotKey] || {};
      return {
        ...prev,
        slots: {
          ...prev.slots,
          [slotKey]: {
            isSubdivided: true,
            subSlots: [
              {
                id: 'sub-1',
                rotulo: 'Parte 1 (1ª metade)',
                materiaId: current.materiaId,
                materiaNome: current.materiaNome,
                materiaCor: current.materiaCor,
                professorId: current.professorId,
                professorNome: current.professorNome,
                sala: current.sala,
              },
              {
                id: 'sub-2',
                rotulo: 'Parte 2 (2ª metade)',
              },
            ],
          },
        },
      };
    });
    toast.info('Horário subdividido em 2 partes! Você pode definir disciplinas diferentes para cada metade.');
  };

  // Unificar slot de volta para bloco único
  const handleUnifySlot = (slotKey: string) => {
    setGradeAtual((prev) => {
      const current = prev.slots[slotKey] || {};
      const firstSub = current.subSlots?.[0];

      return {
        ...prev,
        slots: {
          ...prev.slots,
          [slotKey]: {
            isSubdivided: false,
            materiaId: firstSub?.materiaId,
            materiaNome: firstSub?.materiaNome,
            materiaCor: firstSub?.materiaCor,
            professorId: firstSub?.professorId,
            professorNome: firstSub?.professorNome,
            sala: firstSub?.sala,
          },
        },
      };
    });
    toast.info('Horário unificado em bloco único.');
  };

  // Limpar slot
  const handleClearSlot = (slotKey: string) => {
    setGradeAtual((prev) => {
      const newSlots = { ...prev.slots };
      delete newSlots[slotKey];
      return { ...prev, slots: newSlots };
    });
    toast.success('Horário liberado.');
  };

  // Filtro de Turmas
  const turmasFiltradas = turmasPedagogico.filter((t) => {
    const matchSearch =
      t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.professorRegenteNome && t.professorRegenteNome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.sala && t.sala.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchSetor = selectedSetorFilter === 'todos' || t.setor === selectedSetorFilter;
    const matchAno =
      anoLetivoAtivo === 'todos' ||
      (t.anoLetivo || '2026') === anoLetivoAtivo;
    return matchSearch && matchSetor && matchAno;
  });

  const setoresDisponiveis = Array.from(new Set(turmasPedagogico.map((t) => t.setor)));

  // Alunos vinculados à turma selecionada para visualização no modal
  const alunosDestaTurma = selectedTurmaParaAlunos
    ? alunos.filter((a) => matchesAlunoTurma(a, selectedTurmaParaAlunos.nome))
    : [];

  const alunosFiltradosNoModal = alunosDestaTurma.filter((a) => {
    if (!termoBuscaAlunosTurma.trim()) return true;
    const term = termoBuscaAlunosTurma.toLowerCase();
    const nomeAluno = (a.nome || '').toLowerCase();
    const mat = (a.matricula || '').toLowerCase();
    const resp = (a.nomeResponsavel || '').toLowerCase();
    const doc = (a.cpf || '').toLowerCase();
    return nomeAluno.includes(term) || mat.includes(term) || resp.includes(term) || doc.includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Barra Superior com Métricas e Botão de Nova Turma */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 border rounded-xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap className="text-purple-600" size={22} />
            Gestão de Turmas e Grade de Horários
          </h2>
          <p className="text-xs text-slate-500">
            Crie, edite configurações gerais e individuais por turma, vincule professores e construa a grade horária semanal.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <TutorialButton onClick={() => setIsTutorialOpen(true)} />
          <Button
            data-tour="btn-sync"
            variant="outline"
            onClick={handleSyncCompleto}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 flex items-center gap-1.5 text-xs shadow-sm font-medium"
            title="Padroniza todas as classes do Berçário ao Ensino Médio com Turma A padrão e sincroniza todos os alunos"
          >
            <Sparkles size={15} className="text-emerald-600" />
            Sincronizar Alunos & Turmas
          </Button>
          <Button
            variant="outline"
            onClick={handleSepararFundamental}
            className="border-purple-300 text-purple-700 hover:bg-purple-50 flex items-center gap-1.5 text-xs shadow-sm"
            title="Corrige e separa automaticamente turmas e alunos entre Fundamental 1 (1º ao 5º ano) e Fundamental 2 (6º ao 9º ano)"
          >
            <Wand2 size={15} className="text-purple-600" />
            Separar Fundamental 1 e 2
          </Button>
          <Button
            data-tour="btn-nova-turma"
            onClick={handleOpenNewTurma}
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} /> Nova Turma
          </Button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div data-tour="filtros-busca" className="flex flex-col sm:flex-row items-center gap-3">
        {/* Seletor de Ano com setas para avançar ou retroagir */}
        <AnoLetivoSelector
          anoAtivo={anoLetivoAtivo}
          onAnoChange={setAnoLetivoAtivo}
          showTodosOption={true}
        />

        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input
            placeholder="Buscar por nome da turma, professor regente ou sala..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <Select value={selectedSetorFilter} onValueChange={setSelectedSetorFilter}>
          <SelectTrigger className="w-full sm:w-[220px] text-xs">
            <SelectValue placeholder="Filtrar por Setor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Setores</SelectItem>
            {setoresDisponiveis.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid de Cards de Turmas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {turmasFiltradas.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed text-slate-500 space-y-3">
            <GraduationCap size={44} className="mx-auto text-slate-300" />
            <div>
              <p className="font-bold text-slate-700 text-sm">
                Nenhuma turma encontrada
                {anoLetivoAtivo !== 'todos' ? ` no Ano Letivo ${anoLetivoAtivo}` : ''}
                {selectedSetorFilter !== 'todos' ? ` em ${selectedSetorFilter}` : ''}.
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                {anoLetivoAtivo !== 'todos'
                  ? `Você pode cadastrar novas turmas para ${anoLetivoAtivo} ou copiar as turmas existentes de 2026.`
                  : 'Crie uma nova turma clicando no botão acima ou altere os filtros de pesquisa.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
              <Button
                size="sm"
                onClick={handleOpenNewTurma}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={14} /> Nova Turma {anoLetivoAtivo !== 'todos' ? `em ${anoLetivoAtivo}` : ''}
              </Button>
              {anoLetivoAtivo !== 'todos' && anoLetivoAtivo !== '2026' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleClonarTurmasParaAno('2026', anoLetivoAtivo)}
                  className="border-purple-200 text-purple-700 hover:bg-purple-50 text-xs flex items-center gap-1.5 shadow-xs"
                >
                  <Copy size={13} className="text-purple-600" /> Copiar Turmas de 2026 para {anoLetivoAtivo}
                </Button>
              )}
            </div>
          </div>
        ) : (
          turmasFiltradas.map((turma, index) => {
            // Contagem de alunos matriculados nesta turma usando matchesAlunoTurma
            const alunosMatriculados = alunos.filter((a) => matchesAlunoTurma(a, turma.nome)).length;
            const percentualOcupacao = Math.min(
              100,
              Math.round((alunosMatriculados / (turma.maxAlunos || 25)) * 100)
            );

            // Detecção da classe base e próxima letra da turma
            const matchClasse = turma.nome.match(/^(.*?)(?:\s+([A-Za-z]))?$/);
            const baseClasse = matchClasse && matchClasse[2] ? matchClasse[1].trim() : turma.nome.trim();
            const nextLetra = ['B', 'C', 'D', 'E'].find(
              (l) => !turmasPedagogico.some((tp) => tp.nome.trim().toLowerCase() === `${baseClasse.toLowerCase()} ${l.toLowerCase()}`)
            );

            return (
              <Card
                key={turma.id}
                data-tour={index === 0 ? 'card-turma' : undefined}
                className="border-slate-200 hover:border-purple-300 transition-all shadow-sm flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="outline" className="text-[10px] text-purple-700 bg-purple-50 border-purple-200 mb-1">
                        {turma.setor} • {turma.anoLetivo}
                      </Badge>
                      <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                        {turma.nome}
                      </CardTitle>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {nextLetra && (
                        <Button
                          data-tour={index === 0 ? 'btn-turma-b' : undefined}
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddTurmaAdicional(baseClasse, turma.setor, nextLetra)}
                          className="h-6 text-[11px] px-2 text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 flex items-center gap-1 font-semibold shadow-xs"
                          title={`Criar turma adicional ${baseClasse} ${nextLetra}`}
                        >
                          <Plus size={11} className="text-indigo-600" />
                          + Turma {nextLetra}
                        </Button>
                      )}
                      <Badge
                        className={`text-[10px] font-semibold ${
                          turma.status === 'Ativa'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {turma.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pb-3">
                  {/* Dados Individuais: Mensalidade, Turno e Sala */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Mensalidade</span>
                      <strong className="text-xs text-emerald-700 font-bold">
                        R$ {Number(turma.valorMensalidade || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Turno</span>
                      <strong className="text-xs text-slate-700 font-semibold">{turma.turno}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Sala</span>
                      <strong className="text-xs text-slate-700 font-semibold truncate block" title={turma.sala}>
                        {turma.sala || 'N/D'}
                      </strong>
                    </div>
                  </div>

                  {/* Vagas / Ocupação */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-600 font-medium">
                      <span className="flex items-center gap-1">
                        <Users size={13} className="text-purple-600" />
                        Ocupação:
                      </span>
                      <span>
                        <strong>{alunosMatriculados}</strong> de {turma.maxAlunos} alunos ({percentualOcupacao}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          percentualOcupacao >= 90
                            ? 'bg-rose-500'
                            : percentualOcupacao >= 70
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percentualOcupacao}%` }}
                      />
                    </div>
                  </div>

                  {/* Botão de Ver Alunos da Turma e Transferência em Massa */}
                  <div className="flex items-center gap-2">
                    <Button
                      data-tour={index === 0 ? 'btn-ver-alunos' : undefined}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTurmaParaAlunos(turma);
                        setTermoBuscaAlunosTurma('');
                        setSelectedModalAlunoIds([]);
                      }}
                      className="flex-1 text-xs font-semibold text-purple-700 border-purple-200 bg-purple-50/70 hover:bg-purple-100 flex items-center justify-center gap-1.5 h-8 transition-colors shadow-xs"
                    >
                      <Users size={14} className="text-purple-600" />
                      Ver Alunos ({alunosMatriculados})
                    </Button>
                    {alunosMatriculados > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const ids = alunos.filter((a) => matchesAlunoTurma(a, turma.nome)).map(a => a.id);
                          setTransferAlunoIds(ids);
                          setIsTransferModalOpen(true);
                        }}
                        className="text-xs font-semibold text-indigo-700 border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 flex items-center justify-center gap-1.5 h-8 px-2.5 transition-colors shadow-xs"
                        title={`Transferir em massa todos os ${alunosMatriculados} alunos desta turma`}
                      >
                        <ArrowRightLeft size={13} className="text-indigo-600" />
                        Transferir Turma
                      </Button>
                    )}
                  </div>

                  {/* Professor Regente Vinculado */}
                  <div className="flex items-center gap-2.5 p-2 bg-purple-50/50 rounded-lg border border-purple-100">
                    <Avatar className="h-8 w-8 border border-purple-200">
                      <AvatarImage src={turma.professorRegenteFoto} />
                      <AvatarFallback className="bg-purple-200 text-purple-800 text-xs font-bold">
                        {turma.professorRegenteNome ? turma.professorRegenteNome.charAt(0) : 'P'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-purple-700 font-semibold block uppercase">
                        Professor(a) Regente
                      </span>
                      <div className="text-xs font-bold text-slate-800 truncate">
                        {turma.professorRegenteNome || (
                          <span className="text-slate-400 font-normal italic">Nenhum vinculado</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>

                {/* Rodapé com Ações: Editar Turma e Montar Horário */}
                <div className="p-3 bg-slate-50 border-t flex items-center justify-between gap-2 rounded-b-xl">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 flex-1"
                    onClick={() => handleOpenEditTurma(turma)}
                  >
                    <Pencil size={13} className="text-blue-600" /> Editar Turma
                  </Button>

                  <Button
                    data-tour={index === 0 ? 'btn-horarios' : undefined}
                    size="sm"
                    className="text-xs bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 flex-1"
                    onClick={() => handleOpenGrade(turma)}
                  >
                    <Calendar size={13} /> Horários
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-rose-600 hover:bg-rose-50 shrink-0"
                    onClick={() => handleDeleteTurma(turma.id, turma.nome)}
                    title="Excluir turma"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal de Criação / Edição de Turma */}
      <Dialog open={isTurmaModalOpen} onOpenChange={setIsTurmaModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="text-purple-600" size={20} />
              {editingTurma ? `Editar Turma: ${editingTurma.nome}` : 'Criar Nova Turma'}
            </DialogTitle>
            <DialogDescription>
              Configure os parâmetros gerais e individuais desta turma (mensalidade, limite de alunos e professor regente).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTurma} className="space-y-4 py-2">
            {/* Configurações Gerais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-semibold">Setor / Segmento</Label>
                <Select value={formSetor} onValueChange={setFormSetor}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Educação Infantil">Educação Infantil</SelectItem>
                    <SelectItem value="Ensino Fundamental 1">Ensino Fundamental 1</SelectItem>
                    <SelectItem value="Ensino Fundamental 2">Ensino Fundamental 2</SelectItem>
                    <SelectItem value="Ensino Fundamental">Ensino Fundamental (Geral)</SelectItem>
                    <SelectItem value="Ensino Médio">Ensino Médio</SelectItem>
                    <SelectItem value="Contraturno">Contraturno</SelectItem>
                    <SelectItem value="Cursos Livres">Cursos Livres / Esportes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Ano Letivo</Label>
                <Input
                  value={formAnoLetivo}
                  onChange={(e) => setFormAnoLetivo(e.target.value)}
                  placeholder="2026"
                  className="h-8 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={formStatus} onValueChange={(v: any) => setFormStatus(v)}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativa">Ativa</SelectItem>
                    <SelectItem value="Planejamento">Planejamento</SelectItem>
                    <SelectItem value="Concluída">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Configurações Individuais */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nome da Turma *</Label>
                  <Input
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Ex: 1º Ano A ou Maternal B"
                    required
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Turno de Aulas</Label>
                  <Select value={formTurno} onValueChange={(v: any) => setFormTurno(v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Matutino">Matutino</SelectItem>
                      <SelectItem value="Vespertino">Vespertino</SelectItem>
                      <SelectItem value="Noturno">Noturno</SelectItem>
                      <SelectItem value="Integral">Integral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Valor da Mensalidade (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={formValorMensalidade}
                    onChange={(e) => setFormValorMensalidade(Number(e.target.value))}
                    placeholder="850.00"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Máximo de Alunos (Vagas)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={formMaxAlunos}
                    onChange={(e) => setFormMaxAlunos(Number(e.target.value))}
                    placeholder="25"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Sala / Espaço Físico</Label>
                  <Input
                    value={formSala}
                    onChange={(e) => setFormSala(e.target.value)}
                    placeholder="Ex: Sala 03 - Bloco A"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Vínculo de Professor Regente */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-purple-900">
                  <Users size={14} className="text-purple-600" />
                  Professor(a) Regente Titular
                </Label>
                <Select value={formProfessorId} onValueChange={setFormProfessorId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione um professor cadastrado no administrativo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum professor vinculado</SelectItem>
                    {professores.map((emp) => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.name} — {emp.role || 'Professor'}
                      </SelectItem>
                    ))}
                    {professores.length === 0 && (
                      <SelectItem value="info" disabled>
                        Nenhum funcionário com cargo de professor encontrado.
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400">
                  Lista os colaboradores cadastrados no Administrativo com cargo ou função docente.
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Observações Pedagógicas</Label>
                <Textarea
                  value={formObservacoes}
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  placeholder="Informações adicionais sobre projetos pedagógicos, reforço escolar, etc."
                  className="h-16 text-xs resize-none"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setIsTurmaModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                {editingTurma ? 'Salvar Alterações' : 'Cadastrar Turma'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal / Construtor de Grade Horária da Turma */}
      <Dialog open={isGradeModalOpen} onOpenChange={setIsGradeModalOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle className="text-lg flex items-center gap-2 text-slate-800">
                  <Calendar className="text-purple-600" size={20} />
                  Grade de Horários: {turmaGradeSelecionada?.nome}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Construa a rotina semanal. Passe o mouse sobre qualquer horário para adicionar matéria ou subdividir em blocos.
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenConfigIntervalos}
                  className="text-xs text-purple-700 border-purple-200 hover:bg-purple-50 flex items-center gap-1.5"
                >
                  <Settings2 size={13} /> Configurar Intervalos ({gradeAtual.intervalos.length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveGrade}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                >
                  Salvar Grade
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Dica de Uso */}
          <div className="p-2.5 bg-purple-50/70 border border-purple-200 rounded-lg text-xs text-purple-900 flex items-center gap-2">
            <Sparkles size={15} className="text-purple-600 shrink-0" />
            <span>
              <strong>Dica interativa:</strong> Ao passar o mouse por cima de um horário, você pode{' '}
              <strong>"Definir Matéria"</strong> ou <strong>"Dividir Horário"</strong> em 2 blocos de 50%! Você também pode clicar em{' '}
              <strong>"Configurar Intervalos"</strong> para escolher a quantidade de horários ou editar os tempos.
            </span>
          </div>

          {/* Matriz da Grade Horária */}
          <div className="border rounded-xl overflow-x-auto bg-white shadow-sm">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b">
                  <th className="p-2.5 text-left font-bold text-slate-700 w-36 border-r">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-500" />
                      Horário
                    </div>
                  </th>
                  {gradeAtual.dias.map((dia) => (
                    <th key={dia} className="p-2.5 text-center font-bold text-slate-700 border-r last:border-r-0">
                      {dia}-feira
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gradeAtual.intervalos.map((intervalo, idx) => (
                  <tr key={intervalo} className="border-b hover:bg-slate-50/50">
                    <td className="p-2 font-bold text-slate-600 bg-slate-50 border-r text-center whitespace-nowrap group/interval">
                      <div className="flex items-center justify-between gap-1 px-1">
                        <span className="font-mono text-xs">{intervalo}</span>
                        <button
                          type="button"
                          onClick={() => handleOpenEditSingle(intervalo)}
                          title="Editar este intervalo"
                          className="opacity-0 group-hover/interval:opacity-100 p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-all"
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                    </td>

                    {gradeAtual.dias.map((dia) => {
                      const slotKey = `${dia}_${intervalo}`;
                      const slot = gradeAtual.slots[slotKey];
                      const isSubdivided = slot?.isSubdivided;

                      return (
                        <td
                          key={dia}
                          className="p-1.5 border-r last:border-r-0 align-top relative group min-w-[150px] h-20"
                        >
                          {/* Conteúdo do Slot */}
                          {isSubdivided && slot.subSlots ? (
                            // Horário Subdividido em 2 Blocos
                            <div className="grid grid-cols-2 gap-1 h-full">
                              {slot.subSlots.map((sub, sIdx) => (
                                <div
                                  key={sIdx}
                                  onClick={() => handleOpenSlotModal(slotKey, sIdx as 0 | 1)}
                                  className="border rounded p-1.5 flex flex-col justify-between cursor-pointer hover:shadow-sm transition-all"
                                  style={{
                                    backgroundColor: sub.materiaCor ? `${sub.materiaCor}15` : '#f8fafc',
                                    borderColor: sub.materiaCor || '#cbd5e1',
                                  }}
                                >
                                  <div>
                                    <div className="text-[10px] text-slate-400 font-semibold truncate">
                                      {sub.rotulo || `Parte ${sIdx + 1}`}
                                    </div>
                                    <div
                                      className="font-bold text-[11px] truncate"
                                      style={{ color: sub.materiaCor || '#334155' }}
                                    >
                                      {sub.materiaNome || <span className="text-slate-400 italic">Vazio</span>}
                                    </div>
                                  </div>
                                  <div className="text-[9px] text-slate-500 truncate">
                                    {sub.professorNome || ''}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : slot && slot.materiaNome ? (
                            // Horário com Matéria Única
                            <div
                              onClick={() => handleOpenSlotModal(slotKey)}
                              className="border rounded-lg p-2 h-full flex flex-col justify-between cursor-pointer hover:shadow-sm transition-all"
                              style={{
                                backgroundColor: slot.materiaCor ? `${slot.materiaCor}18` : '#f1f5f9',
                                borderColor: slot.materiaCor || '#cbd5e1',
                              }}
                            >
                              <div>
                                <div
                                  className="font-bold text-xs truncate"
                                  style={{ color: slot.materiaCor || '#1e293b' }}
                                >
                                  {slot.materiaNome}
                                </div>
                                {slot.professorNome && (
                                  <div className="text-[10px] text-slate-600 truncate mt-0.5">
                                    {slot.professorNome}
                                  </div>
                                )}
                              </div>
                              {slot.sala && (
                                <div className="text-[9px] text-slate-400 truncate">
                                  {slot.sala}
                                </div>
                              )}
                            </div>
                          ) : (
                            // Horário Vazio
                            <div
                              onClick={() => handleOpenSlotModal(slotKey)}
                              className="h-full border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-500 hover:border-slate-300 cursor-pointer transition-all"
                            >
                              <Plus size={16} />
                            </div>
                          )}

                          {/* Barra Flutuante de Ações no Hover */}
                          <div className="absolute inset-x-1 bottom-1 hidden group-hover:flex items-center justify-center gap-1 bg-white/95 backdrop-blur-sm border shadow-md p-1 rounded z-20 transition-all">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1.5 text-[10px] text-purple-700 hover:bg-purple-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenSlotModal(slotKey);
                              }}
                            >
                              Definir
                            </Button>

                            {!isSubdivided ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-6 px-1.5 text-[10px] text-indigo-700 hover:bg-indigo-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSplitSlot(slotKey);
                                }}
                                title="Dividir este horário em 2 sub-horários de 50%"
                              >
                                <Split size={12} className="mr-0.5" /> Dividir
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-6 px-1.5 text-[10px] text-amber-700 hover:bg-amber-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnifySlot(slotKey);
                                }}
                                title="Unificar de volta em bloco único"
                              >
                                Unificar
                              </Button>
                            )}

                            {(slot?.materiaNome || isSubdivided) && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-6 px-1 text-[10px] text-rose-600 hover:bg-rose-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClearSlot(slotKey);
                                }}
                                title="Limpar horário"
                              >
                                <Trash2 size={11} />
                              </Button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsGradeModalOpen(false)}>
              Fechar
            </Button>
            <Button onClick={handleSaveGrade} className="bg-purple-600 hover:bg-purple-700 text-white">
              Salvar Grade Horária
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Rápido para Escolher Matéria no Slot */}
      <Dialog open={isSlotModalOpen} onOpenChange={setIsSlotModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Clock className="text-purple-600" size={18} />
              Definir Aula no Horário
              {currentSubSlotIndex !== null && (
                <Badge variant="outline" className="text-purple-700 text-[10px]">
                  Parte {currentSubSlotIndex + 1}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Escolha a disciplina e o professor responsável por este intervalo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Disciplina / Matéria *</Label>
              <Select value={slotMateriaId} onValueChange={setSlotMateriaId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione a matéria..." />
                </SelectTrigger>
                <SelectContent>
                  {materias.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.cor }} />
                        <span>{m.nome}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Professor da Aula</Label>
              <Select value={slotProfessorId} onValueChange={setSlotProfessorId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione o professor (opcional)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Usar professor padrão</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.name} {emp.role ? `(${emp.role})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Sala / Local</Label>
              <Input
                value={slotSala}
                onChange={(e) => setSlotSala(e.target.value)}
                placeholder="Ex: Sala de Aula, Quadra, Laboratório..."
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsSlotModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveSlot} className="bg-purple-600 hover:bg-purple-700 text-white">
              Confirmar Aula
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Completo de Configuração e Quantidade de Intervalos */}
      <Dialog open={isConfigIntervalosModalOpen} onOpenChange={setIsConfigIntervalosModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-slate-800">
              <Settings2 className="text-purple-600" size={18} />
              Configurar Intervalos de Horário da Grade
            </DialogTitle>
            <DialogDescription className="text-xs">
              Escolha a quantidade de intervalos da rotina diária, edite os horários ou use o gerador automático.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={intervalosActiveTab} onValueChange={(v: any) => setIntervalosActiveTab(v)} className="w-full">
            <TabsList className="grid grid-cols-2 w-full h-8 text-xs">
              <TabsTrigger value="lista" className="text-xs">Editar Intervalos e Quantidade</TabsTrigger>
              <TabsTrigger value="gerador" className="text-xs flex items-center gap-1.5">
                <Wand2 size={13} /> Gerador Automático
              </TabsTrigger>
            </TabsList>

            {/* Aba 1: Lista e Quantidade */}
            <TabsContent value="lista" className="space-y-4 pt-3">
              {/* Seletor Rápido de Quantidade de Intervalos */}
              <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <Clock size={14} className="text-purple-600" />
                    Quantidade de Intervalos na Grade:
                  </span>
                  <Badge className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5">
                    {tempIntervalos.length} horários
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {[3, 4, 5, 6, 7, 8, 9, 10].map((qtd) => (
                    <Button
                      key={qtd}
                      type="button"
                      size="sm"
                      variant={tempIntervalos.length === qtd ? 'default' : 'outline'}
                      className={`h-7 px-2.5 text-xs font-bold ${
                        tempIntervalos.length === qtd
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'text-slate-700 bg-white hover:bg-purple-50'
                      }`}
                      onClick={() => handleChangeQtdIntervalos(qtd)}
                    >
                      {qtd}
                    </Button>
                  ))}

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-purple-700 border-purple-300 hover:bg-purple-50 ml-auto flex items-center gap-1"
                    onClick={handleAddNewIntervaloManual}
                  >
                    <Plus size={13} /> Adicionar Horário
                  </Button>
                </div>
              </div>

              {/* Lista dos Horários */}
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {tempIntervalos.map((intervalo, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 bg-slate-50 border rounded-lg hover:border-slate-300 transition-all"
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>

                    <Input
                      value={intervalo}
                      onChange={(e) => handleUpdateIntervaloItem(idx, e.target.value)}
                      placeholder="Ex: 07:30 - 08:20"
                      className="h-8 text-xs font-mono bg-white flex-1"
                    />

                    {/* Botões de Reordenação */}
                    <div className="flex items-center gap-0.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                        disabled={idx === 0}
                        onClick={() => handleMoveIntervalo(idx, 'up')}
                        title="Subir horário"
                      >
                        <ArrowUp size={13} />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                        disabled={idx === tempIntervalos.length - 1}
                        onClick={() => handleMoveIntervalo(idx, 'down')}
                        title="Descer horário"
                      >
                        <ArrowDown size={13} />
                      </Button>
                    </div>

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => handleRemoveIntervaloItem(idx)}
                      title="Excluir este intervalo"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Aba 2: Gerador Automático */}
            <TabsContent value="gerador" className="space-y-4 pt-3">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-blue-950">
                  <Wand2 size={14} /> Geração Automática e Sequencial
                </div>
                Defina o início do turno e a duração de cada aula para gerar a rotina completa de horários de forma contínua com cálculo de recreio.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Horário de Início (1ª Aula)</Label>
                  <Input
                    type="time"
                    value={genInicio}
                    onChange={(e) => setGenInicio(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Duração da Aula (minutos)</Label>
                  <Input
                    type="number"
                    min={15}
                    max={120}
                    value={genDuracaoAula}
                    onChange={(e) => setGenDuracaoAula(Number(e.target.value))}
                    className="h-8 text-xs bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Quantidade de Aulas</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={genQtdAulas}
                    onChange={(e) => setGenQtdAulas(Number(e.target.value))}
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>

              {/* Opções de Recreio */}
              <div className="p-3 bg-slate-50 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 cursor-pointer flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={genTemRecreio}
                      onChange={(e) => setGenTemRecreio(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    Inserir Intervalo de Recreio / Lanche
                  </Label>
                </div>

                {genTemRecreio && (
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">Inserir Recreio após qual aula?</Label>
                      <Select
                        value={String(genRecreioAposAula)}
                        onValueChange={(v) => setGenRecreioAposAula(Number(v))}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: Math.max(1, genQtdAulas - 1) }, (_, i) => i + 1).map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              Após a {n}ª Aula
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">Duração do Recreio (minutos)</Label>
                      <Input
                        type="number"
                        min={5}
                        max={60}
                        value={genDuracaoRecreio}
                        onChange={(e) => setGenDuracaoRecreio(Number(e.target.value))}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="button"
                onClick={handleGerarAutomatico}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs flex items-center justify-center gap-1.5"
              >
                <Wand2 size={14} /> Gerar Horários Agora
              </Button>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-2 border-t mt-2">
            <Button variant="outline" size="sm" onClick={() => setIsConfigIntervalosModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveConfigIntervalos} className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
              Aplicar Intervalos na Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Rápido de Edição de um Único Intervalo */}
      <Dialog open={isEditSingleModalOpen} onOpenChange={setIsEditSingleModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Pencil className="text-purple-600" size={16} />
              Editar Horário do Intervalo
            </DialogTitle>
            <DialogDescription className="text-xs">
              Altere o horário deste intervalo. As aulas já cadastradas serão migradas automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold">Horário (Início - Fim)</Label>
            <Input
              value={singleIntervaloNovo}
              onChange={(e) => setSingleIntervaloNovo(e.target.value)}
              placeholder="Ex: 07:30 - 08:20"
              className="h-9 text-xs font-mono"
            />
            <p className="text-[11px] text-slate-400">
              Horário anterior: <strong>{singleIntervaloOriginal}</strong>
            </p>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsEditSingleModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveSingleIntervalo} className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
              Salvar Horário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização de Alunos da Turma */}
      <Dialog
        open={!!selectedTurmaParaAlunos}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTurmaParaAlunos(null);
            setTermoBuscaAlunosTurma('');
            setSelectedModalAlunoIds([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 sm:p-6 pb-3 border-b bg-gradient-to-r from-purple-50 via-white to-purple-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Users className="text-purple-600" size={20} />
                  Alunos da Turma: {selectedTurmaParaAlunos?.nome}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  {selectedTurmaParaAlunos?.setor} • Turno {selectedTurmaParaAlunos?.turno} • Ano Letivo {selectedTurmaParaAlunos?.anoLetivo}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300 text-xs px-2.5 py-1 font-semibold">
                  {alunosDestaTurma.length} {alunosDestaTurma.length === 1 ? 'aluno matriculado' : 'alunos matriculados'}
                </Badge>
                {selectedTurmaParaAlunos?.maxAlunos && (
                  <Badge variant="outline" className="bg-slate-100 text-slate-700 text-xs font-normal">
                    Capacidade: {selectedTurmaParaAlunos.maxAlunos} vagas
                  </Badge>
                )}
              </div>
            </div>

            {/* Barra de busca de alunos */}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <Input
                placeholder="Buscar por nome do aluno, matrícula ou responsável..."
                value={termoBuscaAlunosTurma}
                onChange={(e) => setTermoBuscaAlunosTurma(e.target.value)}
                className="pl-9 h-8 text-xs bg-white"
              />
            </div>

            {/* Barra de Ações em Massa / Seleção */}
            {alunosDestaTurma.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-purple-100/60">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all-turma-modal"
                    checked={
                      alunosFiltradosNoModal.length > 0 &&
                      alunosFiltradosNoModal.every((a) => selectedModalAlunoIds.includes(a.id))
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const newIds = Array.from(new Set([...selectedModalAlunoIds, ...alunosFiltradosNoModal.map((a) => a.id)]));
                        setSelectedModalAlunoIds(newIds);
                      } else {
                        const currentFilteredSet = new Set(alunosFiltradosNoModal.map((a) => a.id));
                        setSelectedModalAlunoIds((prev) => prev.filter((id) => !currentFilteredSet.has(id)));
                      }
                    }}
                  />
                  <label
                    htmlFor="select-all-turma-modal"
                    className="text-xs text-slate-600 font-medium cursor-pointer select-none"
                  >
                    Selecionar todos ({alunosFiltradosNoModal.length})
                  </label>
                  {selectedModalAlunoIds.length > 0 && (
                    <Badge variant="secondary" className="text-[11px] font-semibold text-purple-700 bg-purple-100">
                      {selectedModalAlunoIds.length} selecionado{selectedModalAlunoIds.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {selectedModalAlunoIds.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setTransferAlunoIds(selectedModalAlunoIds);
                        setIsTransferModalOpen(true);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 h-8 shadow-xs"
                    >
                      <ArrowRightLeft size={13} />
                      Transferir Selecionados ({selectedModalAlunoIds.length})
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allIds = alunosDestaTurma.map((a) => a.id);
                      setTransferAlunoIds(allIds);
                      setIsTransferModalOpen(true);
                    }}
                    className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-xs font-semibold flex items-center gap-1.5 h-8 shadow-xs"
                    title="Transferir todos os alunos desta turma para outra turma ou série"
                  >
                    <Users size={13} className="text-indigo-600" />
                    Transferir Turma Inteira ({alunosDestaTurma.length})
                  </Button>
                </div>
              </div>
            )}
          </DialogHeader>

          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {alunosFiltradosNoModal.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-xl bg-slate-50 text-slate-500">
                <Users size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-sm">
                  {termoBuscaAlunosTurma
                    ? 'Nenhum aluno encontrado para os critérios de busca.'
                    : 'Nenhum aluno matriculado nesta turma até o momento.'}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  {termoBuscaAlunosTurma
                    ? 'Tente pesquisar por outro termo, nome ou matrícula.'
                    : 'Você pode enturmar ou transferir alunos para esta turma a qualquer momento no módulo Alunos ou usando o botão de transferência.'}
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-10 text-center">
                        <Checkbox
                          checked={
                            alunosFiltradosNoModal.length > 0 &&
                            alunosFiltradosNoModal.every((a) => selectedModalAlunoIds.includes(a.id))
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const newIds = Array.from(new Set([...selectedModalAlunoIds, ...alunosFiltradosNoModal.map((a) => a.id)]));
                              setSelectedModalAlunoIds(newIds);
                            } else {
                              const currentFilteredSet = new Set(alunosFiltradosNoModal.map((a) => a.id));
                              setSelectedModalAlunoIds((prev) => prev.filter((id) => !currentFilteredSet.has(id)));
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="text-xs font-semibold">Aluno</TableHead>
                      <TableHead className="text-xs font-semibold">Matrícula</TableHead>
                      <TableHead className="text-xs font-semibold">Responsável & Contato</TableHead>
                      <TableHead className="text-xs font-semibold">Mensalidade</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alunosFiltradosNoModal.map((aluno) => {
                      const rawPhone =
                        aluno.contatoWhatsapp ||
                        aluno.contatoResponsavel ||
                        aluno.celularAluno ||
                        aluno.telefone ||
                        '';
                      const cleanPhone = rawPhone.replace(/\D/g, '');
                      const waLink = cleanPhone
                        ? `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}`
                        : null;

                      return (
                        <TableRow key={aluno.id} className="hover:bg-slate-50/80">
                          <TableCell className="w-10 text-center py-2.5">
                            <Checkbox
                              checked={selectedModalAlunoIds.includes(aluno.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedModalAlunoIds((prev) => [...prev, aluno.id]);
                                } else {
                                  setSelectedModalAlunoIds((prev) => prev.filter((id) => id !== aluno.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8 border border-purple-200">
                                <AvatarFallback className="bg-purple-100 text-purple-800 text-xs font-bold">
                                  {aluno.nome.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="text-xs font-bold text-slate-800 block">
                                  {aluno.nome}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1 py-0 ${
                                    aluno.status === 'Ativo'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {aluno.status || 'Ativo'}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-slate-600 py-2.5">
                            {aluno.matricula || 'N/D'}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="space-y-0.5">
                              <div className="text-xs font-medium text-slate-700">
                                {aluno.nomeResponsavel || 'Não informado'}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {rawPhone && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {rawPhone}
                                  </span>
                                )}
                                {waLink && (
                                  <a
                                    href={waLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded font-medium transition-colors"
                                    title="Abrir conversa no WhatsApp"
                                  >
                                    <MessageSquare size={10} className="text-emerald-600" />
                                    WhatsApp
                                  </a>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-emerald-700 py-2.5">
                            {aluno.valorBase ? (
                              `R$ ${parseFloat(aluno.valorBase).toFixed(2).replace('.', ',')}`
                            ) : (
                              <span className="text-slate-400 font-normal">Padrão</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right py-2.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setTransferAlunoIds([aluno.id]);
                                setIsTransferModalOpen(true);
                              }}
                              className="text-xs h-7 text-purple-700 border-purple-200 hover:bg-purple-50 flex items-center gap-1 ml-auto"
                              title="Transferir aluno para outra turma"
                            >
                              <ArrowRightLeft size={12} className="text-purple-600" />
                              Transferir
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter className="p-3 sm:p-4 border-t bg-slate-50 flex flex-row items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {selectedModalAlunoIds.length > 0
                ? `${selectedModalAlunoIds.length} de ${alunosFiltradosNoModal.length} alunos selecionados`
                : `${alunosFiltradosNoModal.length} aluno${alunosFiltradosNoModal.length !== 1 ? 's' : ''}`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedTurmaParaAlunos(null);
                  setTermoBuscaAlunosTurma('');
                  setSelectedModalAlunoIds([]);
                }}
                className="text-xs"
              >
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Transferência Facilitada de Turma */}
      <TransferirTurmaModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setTransferAlunoIds([]);
        }}
        selectedAlunoIds={transferAlunoIds}
        alunos={alunos}
        turmas={turmasGlobais}
        onConfirmTransfer={handleConfirmTransfer}
        onNovaTurmaCriada={(setor, classe, novaLetra) => {
          const { updatedTurmas, changed } = addLetraToClasse(turmasGlobais, setor, classe, novaLetra);
          if (changed) {
            setTurmasGlobais(updatedTurmas);
          }
        }}
      />

      {/* Passo a Passo Interativo / Tutorial */}
      <TutorialTour isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
    </div>
  );
};

