import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Target,
  Users,
  GraduationCap,
  Sparkles,
  TrendingUp,
  Settings,
  Plus,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Flame,
  BarChart3,
  Calendar,
  DollarSign,
  Layers,
  Building,
  Check,
  Percent,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  MetaComercial, 
  MetaTurmaConfig, 
  ComercialLead, 
  INITIAL_METAS,
  getRealTurmasList,
  matchesTurma,
  getAlunoTurma
} from '@/types/comercial';
import { TurmaConfig } from '@/types/finance';
import { Aluno } from '@/types/aluno';
import { formatDate } from '@/lib/utils';

interface MetasTabProps {
  turmas: TurmaConfig[];
  alunos?: Aluno[];
}

export function MetasTab({ turmas, alunos: alunosProp }: MetasTabProps) {
  const { canViewKpis } = usePermissions();
  const [showTotals, setShowTotals] = useLocalStorage<boolean>('escolinha_show_kpis_comercial', true);

  const [alunosLocal] = useLocalStorage<Aluno[]>('escolinha_alunos', []);
  const alunos = alunosProp || alunosLocal;

  const [metas, setMetas] = useLocalStorage<MetaComercial[]>('escolinha_comercial_metas_v1', INITIAL_METAS);
  const [leads] = useLocalStorage<ComercialLead[]>('escolinha_comercial_leads_v1', []);

  // Período selecionado
  const [selectedMetaId, setSelectedMetaId] = useState<string>(
    metas[0]?.id || 'meta-2025'
  );

  // Modal de Configuração de Metas
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // Form de configuração
  const [formMeta, setFormMeta] = useState<Partial<MetaComercial>>({
    anoLetivo: '2025',
    titulo: 'Campanha de Matrículas & Rematrículas 2025',
    dataInicio: '01/10/2024',
    dataFim: '28/02/2025',
    metaMatriculasGlobal: 60,
    metaRematriculasGlobal: 140,
    metaFinanceiraGlobal: 150000,
    metasPorTurma: [],
    ativo: true,
  });

  // Lista unificada e real de todas as turmas
  const realTurmas = useMemo(() => {
    return getRealTurmasList(turmas, alunos);
  }, [turmas, alunos]);

  // Meta ativa atualmente visualizada
  const activeMeta = useMemo(() => {
    const found = metas.find((m) => m.id === selectedMetaId) || metas[0];
    if (!found) {
      return {
        id: 'meta-padrao',
        anoLetivo: '2025',
        titulo: 'Campanha de Matrículas 2025',
        metaMatriculasGlobal: 50,
        metaRematriculasGlobal: 100,
        ativo: true,
        metasPorTurma: [],
      } as MetaComercial;
    }
    return found;
  }, [metas, selectedMetaId]);

  // Alunos reais ativos
  const alunosAtivos = useMemo(() => {
    return alunos.filter((a) => a.status === 'Ativo');
  }, [alunos]);

  // Cálculos de Realizado vs. Meta PUXANDO DADOS REAIS
  const calculations = useMemo(() => {
    const anoAtual = activeMeta.anoLetivo || '2025';

    // Novas matrículas reais: alunos cuja matrícula começa com o ano atual ou leads convertidos
    const novosMatriculadosReais = alunosAtivos.filter((a) => {
      if (a.matricula && a.matricula.startsWith(anoAtual)) return true;
      return false;
    }).length;

    // Veteranos / Rematrículas reais: alunos cuja matrícula é anterior ao ano da campanha
    const rematriculadosReais = alunosAtivos.filter((a) => {
      if (!a.matricula || !a.matricula.startsWith(anoAtual)) return true;
      return false;
    }).length;

    // Total de alunos ativos reais na escola
    const totalAlunosAtivos = alunosAtivos.length;

    // Considera também leads confirmados se não forem alunos já computados
    const leadsMatriculadosSemAluno = leads.filter(
      (l) => l.tipo === 'matricula' && l.etapa === 'matriculado' && !l.alunoId
    ).length;

    const leadsRematriculadosSemAluno = leads.filter(
      (l) => l.tipo === 'rematricula' && l.etapa === 'rematriculado' && !l.alunoId
    ).length;

    const totalMatriculasRealizadas = novosMatriculadosReais + leadsMatriculadosSemAluno;
    const totalRematriculasRealizadas = rematriculadosReais + leadsRematriculadosSemAluno;

    const metaMatriculas = activeMeta.metaMatriculasGlobal || 1;
    const metaRematriculas = activeMeta.metaRematriculasGlobal || 1;

    // Percentuais de atingimento
    const pctMatriculas = Math.min(
      Math.round((totalMatriculasRealizadas / metaMatriculas) * 100),
      100
    );
    const pctRematriculas = Math.min(
      Math.round((totalRematriculasRealizadas / metaRematriculas) * 100),
      100
    );

    // Vagas totais e capacidade somando as turmas reais
    const capacidadeTotalEscola = realTurmas.reduce((acc, tName) => {
      const config = (activeMeta.metasPorTurma || []).find((c) => c.turmaNome === tName);
      return acc + (config?.capacidadeTotal || 25);
    }, 0);

    const totalAlunosGeral = totalAlunosAtivos + leadsMatriculadosSemAluno + leadsRematriculadosSemAluno;
    const pctOcupacaoGeral = capacidadeTotalEscola > 0 
      ? Math.min(Math.round((totalAlunosGeral / capacidadeTotalEscola) * 100), 100) 
      : 0;

    // Receita mensal REAL calculada a partir dos contratos dos alunos reais
    const receitaMensalReal = alunosAtivos.reduce((sum, a) => {
      const base = Number(a.valorBase) || 0;
      const desc = Number(a.descontoMensalidade) || 0;
      return sum + Math.max(0, base - desc);
    }, 0);

    return {
      matriculasRealizadas: totalMatriculasRealizadas,
      rematriculasRealizadas: totalRematriculasRealizadas,
      totalAlunosAtivos,
      metaMatriculas,
      metaRematriculas,
      pctMatriculas,
      pctRematriculas,
      capacidadeTotalEscola,
      totalAlunosGeral,
      pctOcupacaoGeral,
      receitaMensalReal,
    };
  }, [alunosAtivos, leads, activeMeta, realTurmas]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Abrir modal de criação
  const handleOpenCreate = () => {
    const defaultMetasTurmas: MetaTurmaConfig[] = realTurmas.map((turma) => {
      const alunosNaTurma = alunosAtivos.filter((a) => matchesTurma(a, turma)).length;
      return {
        turmaNome: turma,
        capacidadeTotal: Math.max(25, alunosNaTurma + 5),
        metaMatriculas: 10,
        metaRematriculas: Math.max(15, alunosNaTurma),
        valorMensalidade: 650,
      };
    });

    setFormMeta({
      anoLetivo: '2026',
      titulo: 'Campanha de Matrículas & Rematrículas 2026',
      dataInicio: '01/10/2025',
      dataFim: '28/02/2026',
      metaMatriculasGlobal: defaultMetasTurmas.reduce((acc, t) => acc + t.metaMatriculas, 0),
      metaRematriculasGlobal: defaultMetasTurmas.reduce((acc, t) => acc + t.metaRematriculas, 0),
      metaFinanceiraGlobal: 160000,
      metasPorTurma: defaultMetasTurmas,
      ativo: true,
      observacoes: '',
    });
    setModalMode('create');
    setIsModalOpen(true);
  };

  // Abrir modal de edição da meta ativa
  const handleOpenEdit = () => {
    const existingTurmaNames = (activeMeta.metasPorTurma || []).map((t) => t.turmaNome);
    const updatedMetasTurmas = [...(activeMeta.metasPorTurma || [])];

    realTurmas.forEach((t) => {
      if (!existingTurmaNames.includes(t)) {
        const alunosNaTurma = alunosAtivos.filter((a) => matchesTurma(a, t)).length;
        updatedMetasTurmas.push({
          turmaNome: t,
          capacidadeTotal: Math.max(25, alunosNaTurma + 5),
          metaMatriculas: 10,
          metaRematriculas: Math.max(15, alunosNaTurma),
          valorMensalidade: 650,
        });
      }
    });

    setFormMeta({
      ...activeMeta,
      metasPorTurma: updatedMetasTurmas,
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Salvar / Inserir Meta no Sistema
  const handleSaveMeta = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formMeta.anoLetivo?.trim()) {
      return toast.error('Informe o ano letivo da meta.');
    }
    if (!formMeta.titulo?.trim()) {
      return toast.error('Informe o título da campanha.');
    }

    if (modalMode === 'edit') {
      setMetas((prev) =>
        prev.map((m) => (m.id === activeMeta.id ? ({ ...m, ...formMeta } as MetaComercial) : m))
      );
      toast.success('Metas comerciais atualizadas com sucesso no sistema!');
    } else {
      const novaMeta: MetaComercial = {
        id: `meta-${Date.now()}`,
        anoLetivo: formMeta.anoLetivo || '2026',
        titulo: formMeta.titulo || 'Nova Campanha',
        dataInicio: formMeta.dataInicio || formatDate(new Date()),
        dataFim: formMeta.dataFim || '28/02/2026',
        metaMatriculasGlobal: Number(formMeta.metaMatriculasGlobal) || 50,
        metaRematriculasGlobal: Number(formMeta.metaRematriculasGlobal) || 100,
        metaFinanceiraGlobal: Number(formMeta.metaFinanceiraGlobal) || 120000,
        metasPorTurma: formMeta.metasPorTurma || [],
        ativo: true,
        observacoes: formMeta.observacoes || '',
      };

      setMetas((prev) => [novaMeta, ...prev]);
      setSelectedMetaId(novaMeta.id);
      toast.success('Novas metas comerciais inseridas e ativadas no sistema!');
    }

    setIsModalOpen(false);
  };

  // Atualizar turma individual dentro do form
  const handleUpdateTurmaInForm = (
    index: number,
    field: keyof MetaTurmaConfig,
    value: any
  ) => {
    const list = [...(formMeta.metasPorTurma || [])];
    list[index] = { ...list[index], [field]: value };

    const totalMat = list.reduce((acc, cur) => acc + (Number(cur.metaMatriculas) || 0), 0);
    const totalRemat = list.reduce((acc, cur) => acc + (Number(cur.metaRematriculas) || 0), 0);

    setFormMeta({
      ...formMeta,
      metasPorTurma: list,
      metaMatriculasGlobal: totalMat,
      metaRematriculasGlobal: totalRemat,
    });
  };

  return (
    <div className="space-y-6">
      {/* SELETOR DE CAMPANHA / ANO E BOTÃO DE CONFIGURAR */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              {activeMeta.titulo}
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400">
                Ano Letivo {activeMeta.anoLetivo}
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              Monitoramento com dados reais de {alunosAtivos.length} alunos cadastrados em {realTurmas.length} turmas.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          {metas.length > 1 && (
            <div className="w-44">
              <Select value={selectedMetaId} onValueChange={setSelectedMetaId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  {metas.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.anoLetivo} - {m.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenEdit}
            className="text-xs font-semibold h-9 gap-1.5"
          >
            <Settings className="h-3.5 w-3.5" /> Ajustar Metas Atuais
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold h-9 gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Configurar Nova Meta
          </Button>
        </div>
      </div>

      {/* TERMÔMETROS E CARDS DE METAS GLOBAIS */}
      {canViewKpis('comercial') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Termômetros e Metas Globais
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* TERMÔMETRO 1: NOVAS MATRÍCULAS */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4" />
                Meta de Novas Matrículas
              </span>
              <Badge className="bg-emerald-600 text-white font-bold text-xs">
                {calculations.pctMatriculas}% Atingido
              </Badge>
            </div>
            <CardTitle className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">
              {calculations.matriculasRealizadas} / {calculations.metaMatriculas}{' '}
              <span className="text-xs font-normal text-muted-foreground">novos alunos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress
              value={calculations.pctMatriculas}
              className="h-3 bg-emerald-100 dark:bg-emerald-950"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Faltam:{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {Math.max(0, calculations.metaMatriculas - calculations.matriculasRealizadas)} alunos
                </strong>
              </span>
              <span>Meta: {calculations.metaMatriculas} novos</span>
            </div>
          </CardContent>
        </Card>

        {/* TERMÔMETRO 2: REMATRÍCULAS / RETENÇÃO */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-teal-500" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                Meta de Rematrículas (Veteranos)
              </span>
              <Badge className="bg-teal-600 text-white font-bold text-xs">
                {calculations.pctRematriculas}% Renovado
              </Badge>
            </div>
            <CardTitle className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">
              {calculations.rematriculasRealizadas} / {calculations.metaRematriculas}{' '}
              <span className="text-xs font-normal text-muted-foreground">veteranos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress
              value={calculations.pctRematriculas}
              className="h-3 bg-teal-100 dark:bg-teal-950"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Faltam:{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {Math.max(0, calculations.metaRematriculas - calculations.rematriculasRealizadas)} alunos
                </strong>
              </span>
              <span>Meta: {calculations.metaRematriculas} renovações</span>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: OCUPAÇÃO GERAL & FATURAMENTO REAL */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Flame className="h-4 w-4" />
                Ocupação Real da Escola
              </span>
              <Badge variant="secondary" className="font-bold text-xs">
                {calculations.pctOcupacaoGeral}% Ocupado
              </Badge>
            </div>
            <CardTitle className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">
              {calculations.totalAlunosGeral} / {calculations.capacidadeTotalEscola}{' '}
              <span className="text-xs font-normal text-muted-foreground">vagas totais</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress
              value={calculations.pctOcupacaoGeral}
              className="h-3 bg-primary/20"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Vagas Livres:{' '}
                <strong className="text-emerald-600 font-bold">
                  {Math.max(0, calculations.capacidadeTotalEscola - calculations.totalAlunosGeral)}
                </strong>
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Receita Real: {formatCurrency(calculations.receitaMensalReal)}/mês
              </span>
            </div>
          </CardContent>
        </Card>
              </div>
            )}
          </div>
        )}

      {/* TABELA DE METAS DETALHADAS POR TODAS AS TURMAS REAIS */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Desdobramento das Metas e Ocupação Real por Turma ({activeMeta.anoLetivo})
              </CardTitle>
              <CardDescription className="text-xs">
                Contagem real de alunos matriculados e vagas livres em cada uma das {realTurmas.length} turmas do colégio.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs self-start sm:self-auto font-medium">
              {realTurmas.length} turmas reais mapeadas
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 dark:bg-slate-800/50">
                  <TableHead className="font-bold">Turma Real</TableHead>
                  <TableHead className="font-bold text-center">Capacidade (Vagas)</TableHead>
                  <TableHead className="font-bold text-center">Meta Matrículas (Novos)</TableHead>
                  <TableHead className="font-bold text-center">Meta Rematrículas (Veteranos)</TableHead>
                  <TableHead className="font-bold text-center">Alunos Reais na Sala</TableHead>
                  <TableHead className="font-bold text-center">Vagas Livres</TableHead>
                  <TableHead className="font-bold text-center">Taxa de Ocupação</TableHead>
                  <TableHead className="font-bold text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {realTurmas.map((turmaName) => {
                  const turmaConfig = (activeMeta.metasPorTurma || []).find(
                    (c) => c.turmaNome === turmaName
                  );

                  // Alunos reais ativos nesta turma
                  const alunosNestaTurma = alunosAtivos.filter((a) => matchesTurma(a, turmaName));
                  const totalAlunosTurma = alunosNestaTurma.length;

                  // Leads adicionais convertidos
                  const leadsMat = leads.filter(
                    (l) => l.turma === turmaName && l.tipo === 'matricula' && l.etapa === 'matriculado' && !l.alunoId
                  ).length;
                  const leadsRemat = leads.filter(
                    (l) => l.turma === turmaName && l.tipo === 'rematricula' && l.etapa === 'rematriculado' && !l.alunoId
                  ).length;

                  const anoCampanha = activeMeta.anoLetivo || '2025';
                  const matRealizada = alunosNestaTurma.filter((a) => a.matricula?.startsWith(anoCampanha)).length + leadsMat;
                  const rematRealizada = alunosNestaTurma.filter((a) => !a.matricula?.startsWith(anoCampanha)).length + leadsRemat;

                  const capacidade = turmaConfig?.capacidadeTotal || Math.max(25, totalAlunosTurma + 5);
                  const metaMat = turmaConfig?.metaMatriculas ?? 10;
                  const metaRemat = turmaConfig?.metaRematriculas ?? Math.max(15, totalAlunosTurma);

                  const totalRealizado = totalAlunosTurma + leadsMat + leadsRemat;
                  const vagasRestantes = Math.max(0, capacidade - totalRealizado);
                  const pctTurma = capacidade > 0
                    ? Math.min(Math.round((totalRealizado / capacidade) * 100), 100)
                    : 0;

                  const isLotada = totalRealizado >= capacidade;
                  const isMetaBatida = totalRealizado >= (metaMat + metaRemat);

                  return (
                    <TableRow key={turmaName} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      <TableCell className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        {turmaName}
                      </TableCell>

                      <TableCell className="text-center font-medium">
                        <Badge variant="outline" className="text-xs">
                          {capacidade} vagas
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            {matRealizada} / {metaMat}
                          </span>
                          <div className="w-20 mt-1">
                            <Progress
                              value={Math.min(100, Math.round((matRealizada / (metaMat || 1)) * 100))}
                              className="h-1.5 bg-emerald-100 dark:bg-emerald-950"
                            />
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                            {rematRealizada} / {metaRemat}
                          </span>
                          <div className="w-20 mt-1">
                            <Progress
                              value={Math.min(100, Math.round((rematRealizada / (metaRemat || 1)) * 100))}
                              className="h-1.5 bg-teal-100 dark:bg-teal-950"
                            />
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-center font-bold text-slate-800 dark:text-slate-100">
                        {totalRealizado} {totalRealizado === 1 ? 'aluno' : 'alunos'}
                      </TableCell>

                      <TableCell className="text-center">
                        <span className={`text-xs font-bold ${vagasRestantes > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {vagasRestantes} {vagasRestantes === 1 ? 'vaga' : 'vagas'}
                        </span>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs font-medium">{pctTurma}%</span>
                          <div className="w-16">
                            <Progress value={pctTurma} className="h-1.5" />
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        {isLotada ? (
                          <Badge className="bg-rose-600 text-white text-[11px]">
                            Lotada
                          </Badge>
                        ) : isMetaBatida ? (
                          <Badge className="bg-emerald-600 text-white text-[11px]">
                            Meta Atingida
                          </Badge>
                        ) : pctTurma >= 60 ? (
                          <Badge variant="secondary" className="text-amber-700 bg-amber-100 text-[11px]">
                            Em Andamento
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-600 text-[11px]">
                            Aberta
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL PARA CONFIGURAR E INSERIR METAS NO SISTEMA */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {modalMode === 'edit'
                ? `Ajustar Metas Comerciais (${formMeta.anoLetivo})`
                : 'Configurar Nova Meta de Matrícula e Rematrícula'}
            </DialogTitle>
            <DialogDescription>
              Defina as metas globais e por turma. O sistema carrega as {realTurmas.length} turmas reais da escola para monitoramento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMeta} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="metaAno">Ano Letivo / Período *</Label>
                <Input
                  id="metaAno"
                  required
                  placeholder="Ex: 2025 ou 2026"
                  value={formMeta.anoLetivo || ''}
                  onChange={(e) => setFormMeta({ ...formMeta, anoLetivo: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="metaTitulo">Título da Campanha *</Label>
                <Input
                  id="metaTitulo"
                  required
                  placeholder="Ex: Campanha de Matrículas 2025"
                  value={formMeta.titulo || ''}
                  onChange={(e) => setFormMeta({ ...formMeta, titulo: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="space-y-1.5">
                <Label className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  Meta Global Novas Matrículas *
                </Label>
                <Input
                  type="number"
                  required
                  min={1}
                  value={formMeta.metaMatriculasGlobal || ''}
                  onChange={(e) =>
                    setFormMeta({ ...formMeta, metaMatriculasGlobal: Number(e.target.value) })
                  }
                />
                <p className="text-[11px] text-muted-foreground">Total de novos alunos</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-teal-700 dark:text-teal-400 font-semibold">
                  Meta Global Rematrículas *
                </Label>
                <Input
                  type="number"
                  required
                  min={1}
                  value={formMeta.metaRematriculasGlobal || ''}
                  onChange={(e) =>
                    setFormMeta({ ...formMeta, metaRematriculasGlobal: Number(e.target.value) })
                  }
                />
                <p className="text-[11px] text-muted-foreground">Total de renovações</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="metaFin">Previsão Faturamento (R$)</Label>
                <Input
                  id="metaFin"
                  type="number"
                  placeholder="150000"
                  value={formMeta.metaFinanceiraGlobal || ''}
                  onChange={(e) =>
                    setFormMeta({ ...formMeta, metaFinanceiraGlobal: Number(e.target.value) })
                  }
                />
                <p className="text-[11px] text-muted-foreground">Receita mensal esperada</p>
              </div>
            </div>

            {/* TABELA DE METAS POR TODAS AS TURMAS REAIS */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="font-bold text-sm flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-primary" />
                  Metas Específicas para Cada Turma Real ({formMeta.metasPorTurma?.length || 0})
                </Label>
                <span className="text-xs text-muted-foreground">
                  Altere a capacidade e as metas de cada turma abaixo:
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100/70 dark:bg-slate-800">
                      <TableHead className="text-xs font-bold">Turma Real</TableHead>
                      <TableHead className="text-xs font-bold text-center w-28">Capacidade (Vagas)</TableHead>
                      <TableHead className="text-xs font-bold text-center w-32">Meta Matrículas</TableHead>
                      <TableHead className="text-xs font-bold text-center w-32">Meta Rematrículas</TableHead>
                      <TableHead className="text-xs font-bold text-right w-28">Mensalidade (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(formMeta.metasPorTurma || []).map((t, idx) => {
                      const alunosNaSala = alunosAtivos.filter((a) => matchesTurma(a, t.turmaNome)).length;
                      return (
                        <TableRow key={t.turmaNome}>
                          <TableCell className="font-semibold text-xs py-2">
                            <div>{t.turmaNome}</div>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              ({alunosNaSala} aluno(s) já na sala)
                            </span>
                          </TableCell>

                          <TableCell className="py-1">
                            <Input
                              type="number"
                              min={1}
                              className="h-8 text-xs text-center"
                              value={t.capacidadeTotal || ''}
                              onChange={(e) =>
                                handleUpdateTurmaInForm(idx, 'capacidadeTotal', Number(e.target.value))
                              }
                            />
                          </TableCell>

                          <TableCell className="py-1">
                            <Input
                              type="number"
                              min={0}
                              className="h-8 text-xs text-center text-emerald-700 font-semibold"
                              value={t.metaMatriculas ?? ''}
                              onChange={(e) =>
                                handleUpdateTurmaInForm(idx, 'metaMatriculas', Number(e.target.value))
                              }
                            />
                          </TableCell>

                          <TableCell className="py-1">
                            <Input
                              type="number"
                              min={0}
                              className="h-8 text-xs text-center text-teal-700 font-semibold"
                              value={t.metaRematriculas ?? ''}
                              onChange={(e) =>
                                handleUpdateTurmaInForm(idx, 'metaRematriculas', Number(e.target.value))
                              }
                            />
                          </TableCell>

                          <TableCell className="py-1">
                            <Input
                              type="number"
                              step="0.01"
                              className="h-8 text-xs text-right"
                              value={t.valorMensalidade ?? ''}
                              onChange={(e) =>
                                handleUpdateTurmaInForm(idx, 'valorMensalidade', Number(e.target.value))
                              }
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="metaObs">Observações Gerais da Campanha</Label>
              <Textarea
                id="metaObs"
                rows={2}
                placeholder="Ex: Campanha com desconto de 10% para rematrículas até 15/12..."
                value={formMeta.observacoes || ''}
                onChange={(e) => setFormMeta({ ...formMeta, observacoes: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary text-white font-bold gap-2">
                <Check className="h-4 w-4" /> Inserir e Salvar Metas no Sistema
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
