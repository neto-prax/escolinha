import React, { useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ClipboardCheck,
  Calendar,
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export interface AvaliacaoItem {
  id: string;
  titulo: string;
  turma: string;
  disciplina: string;
  bimestre: string;
  tipo: 'Prova Escrita' | 'Trabalho em Grupo' | 'Seminário' | 'Avaliação Prática' | 'Diagnóstica';
  dataAplicacao: string;
  pesoMaximo: number;
  descricao?: string;
  status: 'Agendada' | 'Em Andamento' | 'Concluída';
}

export interface ParecerAvaliativo {
  id: string;
  alunoNome: string;
  turma: string;
  disciplina: string;
  bimestre: string;
  nivelDesempenho: 'Abaixo do Esperado' | 'Em Desenvolvimento' | 'Adequado' | 'Excelente';
  parecerDescritivo: string;
  dataRegistro: string;
}

const mockAvaliacoes: AvaliacaoItem[] = [
  {
    id: '1',
    titulo: 'Avaliação Prática de Posicionamento Tático',
    turma: 'Sub-11 A',
    disciplina: 'Futebol Tático',
    bimestre: '1º Bimestre',
    tipo: 'Avaliação Prática',
    dataAplicacao: '2026-09-22',
    pesoMaximo: 10,
    descricao: 'Avaliação de compactação defensiva e transição rápida de contra-ataque.',
    status: 'Agendada',
  },
  {
    id: '2',
    titulo: 'Trabalho Teórico: Regras e Ética Desportiva',
    turma: 'Sub-13 A',
    disciplina: 'Preparação Física & Tática',
    bimestre: '1º Bimestre',
    tipo: 'Trabalho em Grupo',
    dataAplicacao: '2026-09-18',
    pesoMaximo: 10,
    descricao: 'Elaboração de cartaz e resumo sobre fair play e trabalho em equipe.',
    status: 'Em Andamento',
  },
  {
    id: '3',
    titulo: 'Simulado Diagnóstico de Coordenação Motora',
    turma: 'Sub-9 A',
    disciplina: 'Desenvolvimento Motor',
    bimestre: '1º Bimestre',
    tipo: 'Diagnóstica',
    dataAplicacao: '2026-09-10',
    pesoMaximo: 10,
    descricao: 'Circuito com obstáculos para aferição de agilidade e equilíbrio.',
    status: 'Concluída',
  },
];

const mockPareceres: ParecerAvaliativo[] = [
  {
    id: '1',
    alunoNome: 'Gabriel Santos',
    turma: 'Sub-11 A',
    disciplina: 'Futebol Tático',
    bimestre: '1º Bimestre',
    nivelDesempenho: 'Excelente',
    parecerDescritivo: 'Demonstrou altíssima compreensão das orientações táticas e postura de liderança positiva perante os colegas.',
    dataRegistro: '2026-09-12',
  },
  {
    id: '2',
    alunoNome: 'Lucas Oliveira',
    turma: 'Sub-11 A',
    disciplina: 'Futebol Tático',
    bimestre: '1º Bimestre',
    nivelDesempenho: 'Em Desenvolvimento',
    parecerDescritivo: 'Tem evoluído no domínio de bola, necessitando maior atenção na recomposição defensiva sem a posse da bola.',
    dataRegistro: '2026-09-11',
  },
  {
    id: '3',
    alunoNome: 'Matheus Pereira',
    turma: 'Sub-13 A',
    disciplina: 'Preparação Física & Tática',
    bimestre: '1º Bimestre',
    nivelDesempenho: 'Excelente',
    parecerDescritivo: 'Excelente vigor físico, pontualidade exemplar e alta capacidade de retenção dos conteúdos apresentados.',
    dataRegistro: '2026-09-08',
  },
];

export const AvaliacoesTab: React.FC = () => {
  const [avaliacoes, setAvaliacoes] = useLocalStorage<AvaliacaoItem[]>('escolinha_avaliacoes_v1', mockAvaliacoes);
  const [pareceres, setPareceres] = useLocalStorage<ParecerAvaliativo[]>('escolinha_pareceres_v1', mockPareceres);

  const [activeSubTab, setActiveSubTab] = useState<'planejamento' | 'pareceres'>('planejamento');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('todas');
  const [selectedBimestre, setSelectedBimestre] = useState('todos');

  // Modal State - Nova Avaliação
  const [isModalAvaliacaoOpen, setIsModalAvaliacaoOpen] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaTurma, setNovaTurma] = useState('Sub-11 A');
  const [novoBimestre, setNovoBimestre] = useState('1º Bimestre');
  const [novaDisciplina, setNovaDisciplina] = useState('Futebol Tático');
  const [novoTipo, setNovoTipo] = useState<AvaliacaoItem['tipo']>('Avaliação Prática');
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0]);
  const [novoPeso, setNovoPeso] = useState<number>(10);
  const [novaDescricao, setNovaDescricao] = useState('');

  // Modal State - Novo Parecer
  const [isModalParecerOpen, setIsModalParecerOpen] = useState(false);
  const [parecerAluno, setParecerAluno] = useState('');
  const [parecerTurma, setParecerTurma] = useState('Sub-11 A');
  const [parecerBimestre, setParecerBimestre] = useState('1º Bimestre');
  const [parecerDisciplina, setParecerDisciplina] = useState('Futebol Tático');
  const [parecerNivel, setParecerNivel] = useState<ParecerAvaliativo['nivelDesempenho']>('Adequado');
  const [parecerTexto, setParecerTexto] = useState('');

  // Filtragem Avaliações
  const filteredAvaliacoes = avaliacoes.filter((item) => {
    const matchesSearch =
      item.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.disciplina.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tipo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTurma = selectedTurma === 'todas' || item.turma === selectedTurma;
    const matchesBimestre = selectedBimestre === 'todos' || item.bimestre === selectedBimestre;
    return matchesSearch && matchesTurma && matchesBimestre;
  });

  // Filtragem Pareceres
  const filteredPareceres = pareceres.filter((item) => {
    const matchesSearch =
      item.alunoNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.disciplina.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.parecerDescritivo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTurma = selectedTurma === 'todas' || item.turma === selectedTurma;
    const matchesBimestre = selectedBimestre === 'todos' || item.bimestre === selectedBimestre;
    return matchesSearch && matchesTurma && matchesBimestre;
  });

  const handleCreateAvaliacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.trim()) {
      toast.error('Informe o título da avaliação.');
      return;
    }

    const item: AvaliacaoItem = {
      id: crypto.randomUUID(),
      titulo: novoTitulo.trim(),
      turma: novaTurma,
      disciplina: novaDisciplina.trim() || 'Geral',
      bimestre: novoBimestre,
      tipo: novoTipo,
      dataAplicacao: novaData,
      pesoMaximo: Number(novoPeso) || 10,
      descricao: novaDescricao.trim() || undefined,
      status: 'Agendada',
    };

    setAvaliacoes([item, ...avaliacoes]);
    toast.success('Avaliação agendada com sucesso!');
    setIsModalAvaliacaoOpen(false);
    setNovoTitulo('');
    setNovaDescricao('');
  };

  const handleCreateParecer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parecerAluno.trim()) {
      toast.error('Informe o nome do aluno.');
      return;
    }
    if (!parecerTexto.trim()) {
      toast.error('Escreva o parecer descritivo.');
      return;
    }

    const item: ParecerAvaliativo = {
      id: crypto.randomUUID(),
      alunoNome: parecerAluno.trim(),
      turma: parecerTurma,
      disciplina: parecerDisciplina.trim() || 'Geral',
      bimestre: parecerBimestre,
      nivelDesempenho: parecerNivel,
      parecerDescritivo: parecerTexto.trim(),
      dataRegistro: new Date().toISOString().split('T')[0],
    };

    setPareceres([item, ...pareceres]);
    toast.success('Parecer avaliativo registrado com sucesso!');
    setIsModalParecerOpen(false);
    setParecerAluno('');
    setParecerTexto('');
  };

  const handleDeleteAvaliacao = (id: string) => {
    setAvaliacoes(avaliacoes.filter((a) => a.id !== id));
    toast.success('Avaliação excluída com sucesso.');
  };

  const handleDeleteParecer = (id: string) => {
    setPareceres(pareceres.filter((p) => p.id !== id));
    toast.success('Parecer removido com sucesso.');
  };

  const toggleStatusAvaliacao = (id: string) => {
    setAvaliacoes(
      avaliacoes.map((a) => {
        if (a.id === id) {
          const nextStatus: AvaliacaoItem['status'] =
            a.status === 'Agendada'
              ? 'Em Andamento'
              : a.status === 'Em Andamento'
              ? 'Concluída'
              : 'Agendada';
          return { ...a, status: nextStatus };
        }
        return a;
      })
    );
  };

  const getStatusBadge = (status: AvaliacaoItem['status']) => {
    switch (status) {
      case 'Agendada':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
            <Clock className="h-3 w-3" /> Agendada
          </Badge>
        );
      case 'Em Andamento':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
            <Clock className="h-3 w-3" /> Em Andamento
          </Badge>
        );
      case 'Concluída':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Concluída
          </Badge>
        );
    }
  };

  const getNivelBadge = (nivel: ParecerAvaliativo['nivelDesempenho']) => {
    switch (nivel) {
      case 'Excelente':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Excelente</Badge>;
      case 'Adequado':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Adequado</Badge>;
      case 'Em Desenvolvimento':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Em Desenvolvimento</Badge>;
      case 'Abaixo do Esperado':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Abaixo do Esperado</Badge>;
    }
  };

  const totalAgendadas = avaliacoes.filter((a) => a.status === 'Agendada').length;
  const totalConcluidas = avaliacoes.filter((a) => a.status === 'Concluída').length;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/60 backdrop-blur-sm border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600">Total de Avaliações</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{avaliacoes.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              {totalAgendadas} agendada(s) • {totalConcluidas} concluída(s)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600">Pareceres Descritivos</CardTitle>
            <MessageSquare className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{pareceres.length}</div>
            <p className="text-xs text-slate-500 mt-1">Registros de avaliações qualitativas</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600">Ações Rápidas</CardTitle>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setIsModalAvaliacaoOpen(true)}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Nova Avaliação
              </Button>
              <Button
                onClick={() => setIsModalParecerOpen(true)}
                size="sm"
                variant="outline"
                className="text-xs gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <Plus className="h-3.5 w-3.5" /> Lançar Parecer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navegação entre Planejamento de Avaliações e Pareceres Descritivos */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('planejamento')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeSubTab === 'planejamento'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" /> Quadro de Avaliações ({filteredAvaliacoes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('pareceres')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeSubTab === 'pareceres'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-3.5 w-3.5" /> Pareceres dos Alunos ({filteredPareceres.length})
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder={activeSubTab === 'planejamento' ? 'Buscar avaliação...' : 'Buscar aluno ou parecer...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-xs h-9"
            />
          </div>

          <Select value={selectedTurma} onValueChange={setSelectedTurma}>
            <SelectTrigger className="w-[140px] text-xs h-9">
              <SelectValue placeholder="Turma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Turmas</SelectItem>
              <SelectItem value="Maternal A">Maternal A</SelectItem>
              <SelectItem value="Sub-9 A">Sub-9 A</SelectItem>
              <SelectItem value="Sub-11 A">Sub-11 A</SelectItem>
              <SelectItem value="Sub-13 A">Sub-13 A</SelectItem>
              <SelectItem value="Sub-15 A">Sub-15 A</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedBimestre} onValueChange={setSelectedBimestre}>
            <SelectTrigger className="w-[130px] text-xs h-9">
              <SelectValue placeholder="Bimestre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Bimestres</SelectItem>
              <SelectItem value="1º Bimestre">1º Bimestre</SelectItem>
              <SelectItem value="2º Bimestre">2º Bimestre</SelectItem>
              <SelectItem value="3º Bimestre">3º Bimestre</SelectItem>
              <SelectItem value="4º Bimestre">4º Bimestre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sub-tab 1: Quadro de Avaliações Planejadas */}
      {activeSubTab === 'planejamento' && (
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Título da Avaliação</TableHead>
                <TableHead className="font-semibold text-slate-700">Turma / Bimestre</TableHead>
                <TableHead className="font-semibold text-slate-700">Disciplina</TableHead>
                <TableHead className="font-semibold text-slate-700">Tipo</TableHead>
                <TableHead className="text-center font-semibold text-slate-700">Data Prevista</TableHead>
                <TableHead className="text-center font-semibold text-slate-700">Pontuação Máx.</TableHead>
                <TableHead className="text-center font-semibold text-slate-700">Status</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAvaliacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-slate-500 text-sm">
                    Nenhuma avaliação agendada com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAvaliacoes.map((av) => (
                  <TableRow key={av.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="font-medium text-slate-800">
                      <div>{av.titulo}</div>
                      {av.descricao && (
                        <div className="text-xs text-slate-500 truncate max-w-sm mt-0.5" title={av.descricao}>
                          {av.descricao}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold text-slate-700">{av.turma}</div>
                      <div className="text-xs text-slate-500">{av.bimestre}</div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">{av.disciplina}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {av.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono text-slate-700">
                      {av.dataAplicacao ? new Date(av.dataAplicacao + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono font-bold text-slate-800">
                      {av.pesoMaximo.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        type="button"
                        onClick={() => toggleStatusAvaliacao(av.id)}
                        title="Clique para alterar status"
                        className="cursor-pointer transition-transform hover:scale-105"
                      >
                        {getStatusBadge(av.status)}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteAvaliacao(av.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Sub-tab 2: Pareceres Descritivos dos Alunos */}
      {activeSubTab === 'pareceres' && (
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Aluno</TableHead>
                <TableHead className="font-semibold text-slate-700">Turma / Bimestre</TableHead>
                <TableHead className="font-semibold text-slate-700">Disciplina</TableHead>
                <TableHead className="font-semibold text-slate-700">Desempenho</TableHead>
                <TableHead className="font-semibold text-slate-700">Parecer Pedagógico</TableHead>
                <TableHead className="text-center font-semibold text-slate-700">Data</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPareceres.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-500 text-sm">
                    Nenhum parecer avaliativo registrado com os filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPareceres.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="font-medium text-slate-800">{p.alunoNome}</TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold text-slate-700">{p.turma}</div>
                      <div className="text-xs text-slate-500">{p.bimestre}</div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">{p.disciplina}</TableCell>
                    <TableCell>{getNivelBadge(p.nivelDesempenho)}</TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-md">
                      <p className="line-clamp-2" title={p.parecerDescritivo}>
                        {p.parecerDescritivo}
                      </p>
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono text-slate-600">
                      {p.dataRegistro ? new Date(p.dataRegistro + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteParecer(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modal - Cadastrar Nova Avaliação */}
      <Dialog open={isModalAvaliacaoOpen} onOpenChange={setIsModalAvaliacaoOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <ClipboardCheck className="h-5 w-5 text-purple-600" /> Cadastrar Nova Avaliação
            </DialogTitle>
            <DialogDescription>
              Planeje e agende uma atividade avaliativa, prova, trabalho ou teste para a turma.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAvaliacao} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Título da Avaliação *</label>
              <Input
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                placeholder="Ex: Prova Teórica 1, Trabalho Prático de Tática..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Turma</label>
                <Select value={novaTurma} onValueChange={setNovaTurma}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Maternal A">Maternal A</SelectItem>
                    <SelectItem value="Sub-9 A">Sub-9 A</SelectItem>
                    <SelectItem value="Sub-11 A">Sub-11 A</SelectItem>
                    <SelectItem value="Sub-13 A">Sub-13 A</SelectItem>
                    <SelectItem value="Sub-15 A">Sub-15 A</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Bimestre</label>
                <Select value={novoBimestre} onValueChange={setNovoBimestre}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1º Bimestre">1º Bimestre</SelectItem>
                    <SelectItem value="2º Bimestre">2º Bimestre</SelectItem>
                    <SelectItem value="3º Bimestre">3º Bimestre</SelectItem>
                    <SelectItem value="4º Bimestre">4º Bimestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Disciplina / Matéria</label>
                <Input
                  value={novaDisciplina}
                  onChange={(e) => setNovaDisciplina(e.target.value)}
                  placeholder="Ex: Futebol Tático, Fundamentos..."
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Tipo de Avaliação</label>
                <Select
                  value={novoTipo}
                  onValueChange={(val) => setNovoTipo(val as AvaliacaoItem['tipo'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Prova Escrita">Prova Escrita</SelectItem>
                    <SelectItem value="Trabalho em Grupo">Trabalho em Grupo</SelectItem>
                    <SelectItem value="Seminário">Seminário</SelectItem>
                    <SelectItem value="Avaliação Prática">Avaliação Prática</SelectItem>
                    <SelectItem value="Diagnóstica">Diagnóstica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Data da Aplicação</label>
                <Input
                  type="date"
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Pontuação Máxima</label>
                <Input
                  type="number"
                  step="0.5"
                  min="1"
                  max="100"
                  value={novoPeso}
                  onChange={(e) => setNovoPeso(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Critérios / Descrição da Avaliação</label>
              <Textarea
                value={novaDescricao}
                onChange={(e) => setNovaDescricao(e.target.value)}
                placeholder="Detalhes sobre o conteúdo cobrado, critérios de correção, etc."
                className="text-xs h-20"
              />
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalAvaliacaoOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                Agendar Avaliação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal - Registrar Parecer Avaliativo */}
      <Dialog open={isModalParecerOpen} onOpenChange={setIsModalParecerOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <FileText className="h-5 w-5 text-emerald-600" /> Registrar Parecer Avaliativo do Aluno
            </DialogTitle>
            <DialogDescription>
              Registre observações descritivas sobre o desenvolvimento e desempenho do aluno.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateParecer} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Nome do Aluno *</label>
              <Input
                value={parecerAluno}
                onChange={(e) => setParecerAluno(e.target.value)}
                placeholder="Digite o nome completo do aluno"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Turma</label>
                <Select value={parecerTurma} onValueChange={setParecerTurma}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Maternal A">Maternal A</SelectItem>
                    <SelectItem value="Sub-9 A">Sub-9 A</SelectItem>
                    <SelectItem value="Sub-11 A">Sub-11 A</SelectItem>
                    <SelectItem value="Sub-13 A">Sub-13 A</SelectItem>
                    <SelectItem value="Sub-15 A">Sub-15 A</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Bimestre</label>
                <Select value={parecerBimestre} onValueChange={setParecerBimestre}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1º Bimestre">1º Bimestre</SelectItem>
                    <SelectItem value="2º Bimestre">2º Bimestre</SelectItem>
                    <SelectItem value="3º Bimestre">3º Bimestre</SelectItem>
                    <SelectItem value="4º Bimestre">4º Bimestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Disciplina / Área</label>
                <Input
                  value={parecerDisciplina}
                  onChange={(e) => setParecerDisciplina(e.target.value)}
                  placeholder="Ex: Futebol Tático, Expressão Corporal..."
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Nível de Desempenho</label>
                <Select
                  value={parecerNivel}
                  onValueChange={(val) => setParecerNivel(val as ParecerAvaliativo['nivelDesempenho'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Excelente">Excelente</SelectItem>
                    <SelectItem value="Adequado">Adequado</SelectItem>
                    <SelectItem value="Em Desenvolvimento">Em Desenvolvimento</SelectItem>
                    <SelectItem value="Abaixo do Esperado">Abaixo do Esperado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Parecer Descritivo / Observações Pedagógicas *</label>
              <Textarea
                value={parecerTexto}
                onChange={(e) => setParecerTexto(e.target.value)}
                placeholder="Descreva a evolução do aluno, pontos fortes e habilidades em desenvolvimento..."
                className="text-xs h-28"
                required
              />
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalParecerOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Salvar Parecer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

