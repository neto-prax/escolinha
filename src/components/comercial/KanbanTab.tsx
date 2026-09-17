import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  Users,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Phone,
  MessageCircle,
  Mail,
  Calendar,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Sparkles,
  LayoutGrid,
  Kanban as KanbanIcon,
  Trash2,
  Edit2,
  ExternalLink,
  ChevronRight,
  Layers,
  RefreshCw,
  UserCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ComercialLead, 
  LeadEtapa, 
  LeadTipo, 
  KANBAN_STAGES, 
  getAlunoTurma,
  matchesTurma,
  getRealTurmasList,
  convertAlunosToLeads
} from '@/types/comercial';
import { TurmaConfig } from '@/types/finance';
import { Aluno } from '@/types/aluno';
import { formatDate } from '@/lib/utils';

interface KanbanTabProps {
  turmas: TurmaConfig[];
  alunos?: Aluno[];
}

export function KanbanTab({ turmas, alunos: alunosProp }: KanbanTabProps) {
  const { canViewKpis } = usePermissions();
  const { school } = useAuth();
  const [showTotals, setShowTotals] = useLocalStorage<boolean>('escolinha_show_kpis_comercial', true);

  const [alunosLocal] = useLocalStorage<Aluno[]>('escolinha_alunos', []);
  const alunos = alunosProp || alunosLocal;

  const [leads, setLeads] = useLocalStorage<ComercialLead[]>('escolinha_comercial_leads_v1', []);

  // Desaloca automaticamente quaisquer leads que tenham sido inseridos em massa pelo sistema anterior
  useEffect(() => {
    setLeads((prev) => {
      // Remove mockups e leads que foram inseridos automaticamente pelo sistema anterior
      const sanitized = prev.filter(
        (lead) =>
          !lead.id.startsWith('aluno-lead-') &&
          lead.origem !== 'Aluno da Escola' &&
          !['lead-1', 'lead-2', 'lead-3', 'lead-4', 'lead-5'].includes(lead.id)
      );
      if (sanitized.length !== prev.length) {
        return sanitized;
      }
      return prev;
    });
  }, []);

  // Estados para Alocação Manual de Aluno da Escola
  const [isAlocarAlunoOpen, setIsAlocarAlunoOpen] = useState(false);
  const [alunoParaAlocarId, setAlunoParaAlocarId] = useState('');
  const [etapaAlocacao, setEtapaAlocacao] = useState<LeadEtapa>('novo');
  const [tipoAlocacao, setTipoAlocacao] = useState<LeadTipo>('rematricula');

  // Alocar aluno específico manualmente
  const handleAlocarAlunoManual = () => {
    if (!alunoParaAlocarId) {
      toast.error('Selecione um aluno para alocar no Comercial.');
      return;
    }
    const aluno = alunos.find((a) => a.id === alunoParaAlocarId);
    if (!aluno) return;

    // Evita duplicar
    if (leads.some((l) => l.alunoId === aluno.id)) {
      toast.warning(`O aluno "${aluno.nome}" já está alocado no funil comercial.`);
      return;
    }

    const turmaReal = getAlunoTurma(aluno);
    const valor = Math.max(
      0,
      (Number(aluno.valorBase) || 650) - (Number(aluno.descontoMensalidade) || 0)
    );

    const novoLeadManual: ComercialLead = {
      id: `manual-aluno-${Date.now()}-${aluno.id.slice(0, 5)}`,
      nome: aluno.nome,
      nomeResponsavel: aluno.nomeResponsavel || 'Responsável',
      telefone: aluno.contatoResponsavel || aluno.telefone || '',
      email: aluno.email || '',
      turma: turmaReal !== 'Sem Turma' ? turmaReal : 'Geral',
      setor: aluno.setor || '',
      tipo: tipoAlocacao,
      etapa: etapaAlocacao,
      valorPrevisto: valor || 650,
      origem: 'Alocado Manualmente',
      observacoes: `Matrícula: ${aluno.matricula || 'S/N'}`,
      dataCriacao: formatDate(new Date()),
      alunoId: aluno.id,
    };

    setLeads([novoLeadManual, ...leads]);
    toast.success(`Aluno "${aluno.nome}" alocado com sucesso no funil comercial!`);
    setIsAlocarAlunoOpen(false);
    setAlunoParaAlocarId('');
  };

  // Desalocar todos os alunos da escola (mantém apenas leads 100% manuais)
  const handleDesalocarTodosAlunos = () => {
    if (window.confirm('Deseja desalocar todos os alunos da escola do painel Comercial? Serão mantidos apenas os leads cadastrados avulsos.')) {
      const manualOnly = leads.filter((l) => !l.alunoId && !l.id.startsWith('aluno-lead-'));
      setLeads(manualOnly);
      toast.success('Todos os alunos da escola foram desalocados do Comercial.');
    }
  };

  // Filtros e Visualização
  const [viewMode, setViewMode] = useState<'etapas' | 'turmas'>('etapas');
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState<string>('todas');
  const [selectedTipoFilter, setSelectedTipoFilter] = useState<string>('todos');
  const [origemFilter, setOrigemFilter] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modais
  const [isNewLeadOpen, setIsNewLeadOpen] = useState<boolean>(false);
  const [editingLead, setEditingLead] = useState<ComercialLead | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  // Form State para Novo Lead
  const [formData, setFormData] = useState<Partial<ComercialLead>>({
    nome: '',
    nomeResponsavel: '',
    telefone: '',
    email: '',
    turma: '',
    tipo: 'matricula',
    etapa: 'novo',
    valorPrevisto: 650,
    origem: 'Indicação',
    observacoes: '',
  });

  // Lista unificada e real de todas as turmas
  const realTurmas = useMemo(() => {
    return getRealTurmasList(turmas, alunos);
  }, [turmas, alunos]);

  // Função manual para sincronizar alunos reais
  const handleSyncRealAlunos = () => {
    if (alunos.length === 0) {
      return toast.info('Nenhum aluno cadastrado no sistema para sincronizar.');
    }

    const leadsMap = new Map(leads.map((l) => [l.alunoId || l.id, l]));
    const syncedLeads: ComercialLead[] = [...leads];

    let countAdded = 0;
    alunos.forEach((aluno) => {
      const existing = leadsMap.get(aluno.id) || leads.find((l) => l.nome.toLowerCase() === aluno.nome.toLowerCase());
      if (!existing) {
        const turmaReal = getAlunoTurma(aluno);
        const valor = Math.max(
          0,
          (Number(aluno.valorBase) || 650) - (Number(aluno.descontoMensalidade) || 0)
        );

        syncedLeads.push({
          id: `aluno-lead-${aluno.id}`,
          nome: aluno.nome,
          nomeResponsavel: aluno.nomeResponsavel || 'Responsável',
          telefone: aluno.contatoResponsavel || aluno.telefone || '',
          email: aluno.email || '',
          turma: turmaReal !== 'Sem Turma' ? turmaReal : 'Geral',
          setor: aluno.setor || '',
          tipo: 'rematricula',
          etapa: aluno.bloquearRematricula ? 'perdido' : 'rematriculado',
          valorPrevisto: valor || 650,
          origem: 'Aluno da Escola',
          observacoes: `Matrícula: ${aluno.matricula || 'S/N'}`,
          dataCriacao: formatDate(new Date()),
          alunoId: aluno.id,
        });
        countAdded++;
      }
    });

    setLeads(syncedLeads);
    toast.success(`${countAdded} aluno(s) real(is) sincronizado(s) com o funil comercial!`);
  };

  // Leads filtrados
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (selectedTurmaFilter !== 'todas' && lead.turma !== selectedTurmaFilter) return false;
      if (selectedTipoFilter !== 'todos' && lead.tipo !== selectedTipoFilter) return false;
      if (origemFilter === 'escola' && lead.origem !== 'Aluno da Escola') return false;
      if (origemFilter === 'externo' && lead.origem === 'Aluno da Escola') return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = lead.nome.toLowerCase().includes(query);
        const matchesResp = lead.nomeResponsavel.toLowerCase().includes(query);
        const matchesPhone = lead.telefone.toLowerCase().includes(query);
        const matchesTurma = lead.turma.toLowerCase().includes(query);
        if (!matchesName && !matchesResp && !matchesPhone && !matchesTurma) return false;
      }
      return true;
    });
  }, [leads, selectedTurmaFilter, selectedTipoFilter, origemFilter, searchQuery]);

  // Métricas do Funil com dados reais
  const metrics = useMemo(() => {
    const totalLeads = leads.length;
    const totalAlunosAtivos = alunos.filter((a) => a.status === 'Ativo').length;

    const matriculasRealizadas = leads.filter(
      (l) => l.tipo === 'matricula' && l.etapa === 'matriculado'
    ).length;

    const rematriculasRealizadas = leads.filter(
      (l) => l.tipo === 'rematricula' && l.etapa === 'rematriculado'
    ).length;

    const emNegociacao = leads.filter(
      (l) => l.etapa !== 'perdido' && l.etapa !== 'matriculado' && l.etapa !== 'rematriculado'
    );

    const valorEmNegociacao = emNegociacao.reduce(
      (sum, l) => sum + (Number(l.valorPrevisto) || 0),
      0
    );

    const valorTotalConfirmado = leads
      .filter((l) => l.etapa === 'matriculado' || l.etapa === 'rematriculado')
      .reduce((sum, l) => sum + (Number(l.valorPrevisto) || 0), 0);

    return {
      totalLeads,
      totalAlunosAtivos,
      matriculasRealizadas,
      rematriculasRealizadas,
      emNegociacaoCount: emNegociacao.length,
      valorEmNegociacao,
      valorTotalConfirmado,
    };
  }, [leads, alunos]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Mover lead de etapa
  const handleMoveEtapa = (leadId: string, novaEtapa: LeadEtapa) => {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id === leadId) {
          return { ...l, etapa: novaEtapa };
        }
        return l;
      })
    );
    const etapaObj = KANBAN_STAGES.find((s) => s.id === novaEtapa);
    toast.success(`Movido para "${etapaObj?.label || novaEtapa}"!`);
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedLeadId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnStage = (e: React.DragEvent, targetEtapa: LeadEtapa) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      handleMoveEtapa(leadId, targetEtapa);
    }
    setDraggedLeadId(null);
  };

  const handleDropOnTurma = (e: React.DragEvent, targetTurma: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, turma: targetTurma } : l))
      );
      toast.success(`Alocado na turma "${targetTurma}"!`);
    }
    setDraggedLeadId(null);
  };

  // Salvar Lead
  const handleSaveLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome?.trim()) {
      return toast.error('Preencha o nome do aluno/candidato.');
    }
    if (!formData.nomeResponsavel?.trim()) {
      return toast.error('Preencha o nome do responsável.');
    }
    if (!formData.turma?.trim()) {
      return toast.error('Selecione uma turma.');
    }

    if (editingLead) {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === editingLead.id ? ({ ...l, ...formData } as ComercialLead) : l
        )
      );
      toast.success('Oportunidade atualizada com sucesso!');
      setEditingLead(null);
    } else {
      const newLead: ComercialLead = {
        id: `lead-${Date.now()}`,
        nome: formData.nome.trim(),
        nomeResponsavel: formData.nomeResponsavel.trim(),
        telefone: formData.telefone || '',
        email: formData.email || '',
        turma: formData.turma,
        tipo: formData.tipo || 'matricula',
        etapa: formData.etapa || 'novo',
        valorPrevisto: Number(formData.valorPrevisto) || 650,
        origem: formData.origem || 'Indicação',
        observacoes: formData.observacoes || '',
        dataCriacao: formatDate(new Date()),
        alunoId: formData.alunoId,
      };
      setLeads((prev) => [newLead, ...prev]);
      toast.success('Novo lead registrado no funil comercial!');
      setIsNewLeadOpen(false);
    }

    setFormData({
      nome: '',
      nomeResponsavel: '',
      telefone: '',
      email: '',
      turma: realTurmas[0] || '',
      tipo: 'matricula',
      etapa: 'novo',
      valorPrevisto: 650,
      origem: 'Indicação',
      observacoes: '',
    });
  };

  // Deletar lead
  const handleDeleteLead = (leadId: string) => {
    if (confirm('Tem certeza que deseja remover este card do funil comercial?')) {
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      toast.success('Card removido com sucesso.');
    }
  };

  // Preencher dados ao selecionar aluno real existente
  const handleSelectAlunoExistente = (alunoId: string) => {
    const found = alunos.find((a) => a.id === alunoId);
    if (found) {
      const turmaAluno = getAlunoTurma(found);
      const valor = Math.max(
        0,
        (Number(found.valorBase) || 650) - (Number(found.descontoMensalidade) || 0)
      );

      setFormData((prev) => ({
        ...prev,
        nome: found.nome,
        nomeResponsavel: found.nomeResponsavel || 'Responsável',
        telefone: found.contatoResponsavel || found.telefone || '',
        email: found.email || '',
        turma: turmaAluno !== 'Sem Turma' ? turmaAluno : realTurmas[0],
        tipo: 'rematricula',
        etapa: 'proposta',
        valorPrevisto: valor || 650,
        origem: 'Aluno da Escola',
        alunoId: found.id,
        observacoes: `Matrícula do aluno: ${found.matricula}`,
      }));
      toast.info(`Dados do aluno "${found.nome}" carregados!`);
    }
  };

  // Efetivar Matrícula no Sistema Oficial de Alunos
  const handleEfetivarAluno = (lead: ComercialLead) => {
    const jaExiste = alunos.some(
      (a) => a.nome.toLowerCase() === lead.nome.toLowerCase()
    );

    if (jaExiste) {
      toast.info(`O aluno "${lead.nome}" já está registrado no cadastro oficial de alunos!`);
      return;
    }

    const partesTurma = lead.turma.split(' ');
    const letraTurma = partesTurma.length > 1 ? partesTurma[partesTurma.length - 1] : 'A';
    const classeTurma = partesTurma.length > 1 ? partesTurma.slice(0, -1).join(' ') : lead.turma;
    const matriculaGerada = `${new Date().getFullYear()}${String(alunos.length + 1).padStart(3, '0')}`;

    const novoAluno: Aluno = {
      id: `aluno-${Date.now()}`,
      nome: lead.nome,
      matricula: matriculaGerada,
      nomeResponsavel: lead.nomeResponsavel,
      contatoResponsavel: lead.telefone,
      email: lead.email,
      status: 'Ativo',
      classe: classeTurma,
      turma: letraTurma,
      valorBase: String(lead.valorPrevisto || 650),
      descontoMensalidade: '0',
      diaVencimento: '10',
    };

    // Atualiza o storage de alunos
    const alunosAtualizados = [...alunos, novoAluno];
    localStorage.setItem(`s_${school?.id}_escolinha_alunos`, JSON.stringify(alunosAtualizados));

    // Atualiza etapa do lead
    handleMoveEtapa(lead.id, lead.tipo === 'rematricula' ? 'rematriculado' : 'matriculado');

    toast.success(
      `Aluno "${lead.nome}" oficializado com matrícula ${matriculaGerada} no cadastro de alunos!`
    );
  };

  const handleOpenEdit = (lead: ComercialLead) => {
    setEditingLead(lead);
    setFormData({ ...lead });
  };

  return (
    <div className="space-y-6">
      {/* HEADER DE KPIS COM DADOS REAIS */}
      {canViewKpis('comercial') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Indicadores do Funil Comercial
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
                  <span>Exibir Totais ({metrics.totalLeads} oportunidades)</span>
                </>
              )}
            </Button>
          </div>

          {showTotals && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Alunos Reais Ativos</p>
                    <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      {metrics.totalAlunosAtivos}
                    </h4>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Novas Matrículas</p>
                    <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {metrics.matriculasRealizadas}
                    </h4>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Rematrículas Confirmadas</p>
                    <h4 className="text-xl font-bold text-teal-600 dark:text-teal-400">
                      {metrics.rematriculasRealizadas}
                    </h4>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Em Negociação ({metrics.emNegociacaoCount})</p>
                    <h4 className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      {formatCurrency(metrics.valorEmNegociacao)}
                    </h4>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Receita Confirmada</p>
                    <h4 className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {formatCurrency(metrics.valorTotalConfirmado)}
                    </h4>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* BARRA DE CONTROLES, FILTROS E SINCRONIZAÇÃO */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Seletor de Modo de Visualização do Kanban */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <Button
              variant={viewMode === 'etapas' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('etapas')}
              className="text-xs h-8 gap-1.5 font-medium"
            >
              <KanbanIcon className="h-3.5 w-3.5" />
              Por Etapas do Funil
            </Button>
            <Button
              variant={viewMode === 'turmas' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('turmas')}
              className="text-xs h-8 gap-1.5 font-medium"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Por Turmas ({realTurmas.length})
            </Button>
          </div>

          {/* Filtro de Turma Real */}
          <div className="w-48">
            <Select value={selectedTurmaFilter} onValueChange={setSelectedTurmaFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Filtrar Turma Real" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Turmas ({realTurmas.length})</SelectItem>
                {realTurmas.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro de Tipo */}
          <div className="w-40">
            <Select value={selectedTipoFilter} onValueChange={setSelectedTipoFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                <SelectItem value="matricula">Novas Matrículas</SelectItem>
                <SelectItem value="rematricula">Rematrículas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro de Origem */}
          <div className="w-44">
            <Select value={origemFilter} onValueChange={setOrigemFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as Origens</SelectItem>
                <SelectItem value="escola">Alunos da Escola</SelectItem>
                <SelectItem value="externo">Leads Externos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Busca por texto */}
          <div className="relative w-full sm:w-52">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar aluno ou responsável..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          {/* Botão para Desalocar Alunos da Escola */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDesalocarTodosAlunos}
            className="text-xs h-9 gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            title="Remove todos os alunos da escola mantendo apenas leads manuais"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Desalocar Alunos ({leads.filter(l => l.alunoId).length})
          </Button>

          {/* Botão de Alocar Aluno Manualmente */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAlocarAlunoOpen(true)}
            className="text-xs font-semibold h-9 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            title="Escolha um aluno específico da escola para trazer ao funil comercial"
          >
            <UserPlus className="h-3.5 w-3.5 text-emerald-600" />
            Alocar Aluno Manualmente
          </Button>

          <Button
            onClick={() => {
              setFormData({
                nome: '',
                nomeResponsavel: '',
                telefone: '',
                email: '',
                turma: realTurmas[0] || '',
                tipo: 'matricula',
                etapa: 'novo',
                valorPrevisto: 650,
                origem: 'Indicação',
                observacoes: '',
              });
              setIsNewLeadOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-white gap-2 text-xs font-semibold h-9 shrink-0 shadow-sm"
          >
            <UserPlus className="h-4 w-4" /> Novo Lead / Oportunidade
          </Button>
        </div>
      </div>

      {/* MODO 1: KANBAN POR ETAPAS DO FUNIL */}
      {viewMode === 'etapas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {KANBAN_STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => l.etapa === stage.id);
            const totalStageValue = stageLeads.reduce(
              (acc, cur) => acc + (Number(cur.valorPrevisto) || 0),
              0
            );

            return (
              <div
                key={stage.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnStage(e, stage.id)}
                className={`flex flex-col rounded-xl border ${stage.border} ${stage.bgLight} p-3 min-h-[550px] transition-all`}
              >
                {/* Cabeçalho da Coluna */}
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${stage.color}`}>
                      {stage.label}
                    </h4>
                  </div>
                  <Badge variant="secondary" className="text-[11px] font-bold px-2 py-0">
                    {stageLeads.length}
                  </Badge>
                </div>

                <div className="text-[11px] text-muted-foreground font-medium mb-3 flex items-center justify-between px-1">
                  <span>Previsão:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {formatCurrency(totalStageValue)}
                  </span>
                </div>

                {/* Lista de Cards da Etapa */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {stageLeads.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-xs text-muted-foreground text-center p-3">
                      Arraste ou crie leads nesta etapa
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onDragStart={handleDragStart}
                        onMoveEtapa={handleMoveEtapa}
                        onEfetivar={handleEfetivarAluno}
                        onEdit={handleOpenEdit}
                        onDelete={handleDeleteLead}
                        formatCurrency={formatCurrency}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODO 2: KANBAN POR TURMAS REAIS */}
      {viewMode === 'turmas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {realTurmas.map((turmaName) => {
            const turmaLeads = filteredLeads.filter((l) => matchesTurma({ classe: leadTurmaClasse(l.turma), turma: leadTurmaLetra(l.turma) } as Aluno, turmaName) || l.turma === turmaName);
            const alunosReaisNestaTurma = alunos.filter((a) => a.status === 'Ativo' && matchesTurma(a, turmaName)).length;

            const confirmadosTurma = turmaLeads.filter(
              (l) => l.etapa === 'matriculado' || l.etapa === 'rematriculado'
            ).length;
            const emNegociacaoTurma = turmaLeads.filter(
              (l) => l.etapa !== 'matriculado' && l.etapa !== 'rematriculado' && l.etapa !== 'perdido'
            ).length;

            return (
              <div
                key={turmaName}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnTurma(e, turmaName)}
                className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3 min-h-[550px]"
              >
                {/* Cabeçalho da Turma */}
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      {turmaName}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      {alunosReaisNestaTurma} alunos ativos na sala • {emNegociacaoTurma} em negociação
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs font-bold">
                    {turmaLeads.length} cards
                  </Badge>
                </div>

                {/* Lista de Cards da Turma */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {turmaLeads.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-xs text-muted-foreground text-center p-3">
                      Nenhum card nesta turma.
                    </div>
                  ) : (
                    turmaLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        showStageBadge
                        onDragStart={handleDragStart}
                        onMoveEtapa={handleMoveEtapa}
                        onEfetivar={handleEfetivarAluno}
                        onEdit={handleOpenEdit}
                        onDelete={handleDeleteLead}
                        formatCurrency={formatCurrency}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE ALOCAÇÃO MANUAL DE ALUNO DA ESCOLA */}
      <Dialog open={isAlocarAlunoOpen} onOpenChange={setIsAlocarAlunoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <UserPlus className="h-5 w-5 text-emerald-600" />
              Alocar Aluno Manualmente no Comercial
            </DialogTitle>
            <DialogDescription className="text-xs">
              Selecione o aluno da escola que deseja incluir no funil comercial e a etapa inicial desejada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Aluno da Escola *</Label>
              <Select value={alunoParaAlocarId} onValueChange={setAlunoParaAlocarId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione um aluno..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {alunos
                    .filter((a) => a.status === 'Ativo')
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nome} ({a.classe ? `${a.classe} ${a.turma || ''}`.trim() : 'Sem Turma'})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo de Oportunidade</Label>
                <Select value={tipoAlocacao} onValueChange={(val: any) => setTipoAlocacao(val)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rematricula">Rematrícula</SelectItem>
                    <SelectItem value="matricula">Nova Matrícula</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Etapa Inicial</Label>
                <Select value={etapaAlocacao} onValueChange={(val: any) => setEtapaAlocacao(val)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KANBAN_STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsAlocarAlunoOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleAlocarAlunoManual}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Alocar no Comercial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE NOVO / EDIÇÃO DE LEAD */}
      <Dialog
        open={isNewLeadOpen || !!editingLead}
        onOpenChange={(open) => {
          if (!open) {
            setIsNewLeadOpen(false);
            setEditingLead(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              {editingLead ? 'Editar Oportunidade Comercial' : 'Novo Lead / Oportunidade de Matrícula'}
            </DialogTitle>
            <DialogDescription>
              Cadastre ou edite uma oportunidade no funil comercial com dados reais de turmas e alunos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveLead} className="space-y-4 pt-2">
            {/* Opção para vincular aluno real existente no caso de rematrícula */}
            {!editingLead && alunos.length > 0 && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-primary">
                  <UserCheck className="h-3.5 w-3.5" /> Puxar dados de um Aluno Existente da Escola:
                </Label>
                <Select onValueChange={handleSelectAlunoExistente}>
                  <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                    <SelectValue placeholder="Selecione um aluno para preencher automaticamente..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {alunos.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nome} — {getAlunoTurma(a)} (Matrícula: {a.matricula})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="leadNome">Nome do Aluno / Candidato *</Label>
                <Input
                  id="leadNome"
                  required
                  placeholder="Ex: Gabriel Silva"
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="leadResp">Nome do Responsável *</Label>
                <Input
                  id="leadResp"
                  required
                  placeholder="Ex: Mariana Silva"
                  value={formData.nomeResponsavel || ''}
                  onChange={(e) => setFormData({ ...formData, nomeResponsavel: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="leadTel">Telefone / WhatsApp *</Label>
                <Input
                  id="leadTel"
                  placeholder="(11) 99999-9999"
                  value={formData.telefone || ''}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="leadEmail">E-mail</Label>
                <Input
                  id="leadEmail"
                  type="email"
                  placeholder="responsavel@email.com"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Turma Pretendida *</Label>
                <Select
                  value={formData.turma || realTurmas[0]}
                  onValueChange={(val) => setFormData({ ...formData, turma: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {realTurmas.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Tipo de Oportunidade</Label>
                <Select
                  value={formData.tipo || 'matricula'}
                  onValueChange={(val: LeadTipo) => setFormData({ ...formData, tipo: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="matricula">Nova Matrícula</SelectItem>
                    <SelectItem value="rematricula">Rematrícula</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Etapa Inicial</Label>
                <Select
                  value={formData.etapa || 'novo'}
                  onValueChange={(val: LeadEtapa) => setFormData({ ...formData, etapa: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KANBAN_STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="leadValor">Valor da Mensalidade (R$)</Label>
                <Input
                  id="leadValor"
                  type="number"
                  step="0.01"
                  placeholder="650.00"
                  value={formData.valorPrevisto || ''}
                  onChange={(e) => setFormData({ ...formData, valorPrevisto: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Canal de Origem</Label>
                <Select
                  value={formData.origem || 'Indicação'}
                  onValueChange={(val) => setFormData({ ...formData, origem: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aluno da Escola">Aluno da Escola (Veterano)</SelectItem>
                    <SelectItem value="Indicação">Indicação</SelectItem>
                    <SelectItem value="Instagram / Redes">Instagram / Redes Sociais</SelectItem>
                    <SelectItem value="Google">Google / Site</SelectItem>
                    <SelectItem value="Fachada / Presencial">Fachada / Presencial</SelectItem>
                    <SelectItem value="Evento Escolar">Evento Escolar</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="leadObs">Observações / Anotações do Contato</Label>
              <Textarea
                id="leadObs"
                rows={3}
                placeholder="Ex: Turno integral, dados adicionais..."
                value={formData.observacoes || ''}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsNewLeadOpen(false);
                  setEditingLead(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary text-white">
                {editingLead ? 'Salvar Alterações' : 'Cadastrar Lead'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helpers para extração de classe e letra
function leadTurmaClasse(turmaCompleta: string): string {
  const parts = turmaCompleta.trim().split(' ');
  return parts.length > 1 ? parts.slice(0, -1).join(' ') : turmaCompleta;
}

function leadTurmaLetra(turmaCompleta: string): string {
  const parts = turmaCompleta.trim().split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

// COMPONENTE DO CARD DE LEAD NO KANBAN
interface LeadCardProps {
  lead: ComercialLead;
  showStageBadge?: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onMoveEtapa: (leadId: string, novaEtapa: LeadEtapa) => void;
  onEfetivar: (lead: ComercialLead) => void;
  onEdit: (lead: ComercialLead) => void;
  onDelete: (leadId: string) => void;
  formatCurrency: (val: number) => string;
}

function LeadCard({
  lead,
  showStageBadge,
  onDragStart,
  onMoveEtapa,
  onEfetivar,
  onEdit,
  onDelete,
  formatCurrency,
}: LeadCardProps) {
  const cleanPhone = lead.telefone.replace(/\D/g, '');
  const stageObj = KANBAN_STAGES.find((s) => s.id === lead.etapa);
  const isAlunoCadastrado = Boolean(lead.alunoId);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group space-y-2.5"
    >
      {/* Topo do card: tipo de matrícula e ações */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant={lead.tipo === 'matricula' ? 'default' : 'secondary'}
            className="text-[10px] px-1.5 py-0"
          >
            {lead.tipo === 'matricula' ? 'Nova Matrícula' : 'Rematrícula'}
          </Badge>

          {isAlunoCadastrado && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-300 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40">
              Aluno da Escola
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(lead)}
            className="h-6 w-6 text-slate-500 hover:text-slate-800"
            title="Editar"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(lead.id)}
            className="h-6 w-6 text-slate-400 hover:text-red-600"
            title="Excluir"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Nome do aluno e turma */}
      <div>
        <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
          {lead.nome}
        </h5>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary/30">
            {lead.turma}
          </Badge>
          {showStageBadge && stageObj && (
            <Badge variant="secondary" className={`text-[10px] font-semibold ${stageObj.color}`}>
              {stageObj.label}
            </Badge>
          )}
        </div>
      </div>

      {/* Responsável e Contatos */}
      <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 border-t border-slate-100 dark:border-slate-800/80 pt-2">
        <p className="truncate">
          <span className="text-muted-foreground">Resp:</span> {lead.nomeResponsavel}
        </p>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400 text-xs">
            {formatCurrency(lead.valorPrevisto)}
          </span>

          {cleanPhone && (
            <a
              href={`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
                `Olá ${lead.nomeResponsavel}, tudo bem? Sou da equipe comercial do colégio a respeito do aluno(a) ${lead.nome}.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800"
              title="Abrir WhatsApp com o responsável"
            >
              <MessageCircle className="h-3 w-3 text-emerald-600" />
              WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Observação curta se houver */}
      {lead.observacoes && (
        <p className="text-[11px] text-muted-foreground line-clamp-1 italic bg-slate-50 dark:bg-slate-800/50 p-1 rounded">
          "{lead.observacoes}"
        </p>
      )}

      {/* BOTÃO DE EFETIVAR MATRÍCULA NO SISTEMA (SOMENTE SE NÃO FOR ALUNO OFICIALMENTE CADASTRADO) */}
      {!isAlunoCadastrado && (lead.etapa === 'matriculado' || lead.etapa === 'rematriculado') && (
        <Button
          size="sm"
          onClick={() => onEfetivar(lead)}
          className="w-full h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 mt-1"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Oficializar no Cadastro de Alunos
        </Button>
      )}

      {/* Seletor rápido de troca de etapa */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px]">
        <span className="text-muted-foreground">Mover etapa:</span>
        <select
          value={lead.etapa}
          onChange={(e) => onMoveEtapa(lead.id, e.target.value as LeadEtapa)}
          className="text-[11px] font-medium bg-transparent border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {KANBAN_STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
