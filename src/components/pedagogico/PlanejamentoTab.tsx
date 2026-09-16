import React, { useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  PlanejamentoAulaItem,
  TurmaPedagogica,
  Materia,
  ConfiguracaoAcademica,
  DEFAULT_CONFIG_ACADEMICA,
  DEFAULT_MATERIAS,
  DEFAULT_TURMAS_PEDAGOGICO,
} from '@/types/pedagogico';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  FileText,
  Plus,
  Search,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  ListOrdered,
  Sparkles,
  Trash2,
  Pencil,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_PLANOS: PlanejamentoAulaItem[] = [
  {
    id: 'plan-1',
    turmaId: 'turma-1ano-a',
    turmaNome: '1º Ano A',
    disciplinaId: 'mat-1',
    disciplinaNome: 'Língua Portuguesa',
    cicloId: 'b1',
    cicloNome: '1º Bimestre',
    dataPrevista: '2026-09-22',
    horario: '07:30 - 08:20',
    titulo: 'Leitura Compartilhada e Alfabeto Lúdico',
    objetivosBncc: 'EF01LP01 - Reconhecer que textos são lidos e escritos da esquerda para a direita e de cima para baixo.',
    conteudoProgramatico: 'Exploração do livro ilustrado, cantiga de roda e montagem de palavras no alfabeto móvel.',
    metodologia: 'Roda de conversa inicial, contação de história e atividade prática em duplas.',
    materiaisNecessarios: 'Livro infantil, fichas de letras móveis, cartolina e giz de cera.',
    tarefaCasa: 'Desenhar a cena favorita da história com auxílio da família.',
    status: 'Planejada',
  },
  {
    id: 'plan-2',
    turmaId: 'turma-1ano-a',
    turmaNome: '1º Ano A',
    disciplinaId: 'mat-2',
    disciplinaNome: 'Matemática',
    cicloId: 'b1',
    cicloNome: '1º Bimestre',
    dataPrevista: '2026-09-23',
    horario: '08:20 - 09:10',
    titulo: 'Contagem com Material Dourado e Agrupamentos',
    objetivosBncc: 'EF01MA01 - Utilizar números naturais como indicador de quantidade.',
    conteudoProgramatico: 'Conceito de dezena e unidade através do manuseio de blocos e jogos de contagem.',
    metodologia: 'Oficina prática com estações de aprendizagem.',
    materiaisNecessarios: 'Caixas de Material Dourado e dados coloridos.',
    tarefaCasa: 'Página 14 do livro didático.',
    status: 'Em Andamento',
  },
];

export const PlanejamentoTab: React.FC = () => {
  const [planos, setPlanos] = useLocalStorage<PlanejamentoAulaItem[]>('escolinha_planos_aula_v1', DEFAULT_PLANOS);
  const [turmas] = useLocalStorage<TurmaPedagogica[]>('escolinha_turmas_pedagogico_v1', DEFAULT_TURMAS_PEDAGOGICO);
  const [materias] = useLocalStorage<Materia[]>('escolinha_materias_v1', DEFAULT_MATERIAS);
  const [configAcademica] = useLocalStorage<ConfiguracaoAcademica>('escolinha_config_academica_v1', DEFAULT_CONFIG_ACADEMICA);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState('todas');
  const [selectedCicloFilter, setSelectedCicloFilter] = useState('todos');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanejamentoAulaItem | null>(null);

  // Form State
  const [formTurmaNome, setFormTurmaNome] = useState('');
  const [formDisciplinaNome, setFormDisciplinaNome] = useState('');
  const [formCicloId, setFormCicloId] = useState('');
  const [formDataPrevista, setFormDataPrevista] = useState(new Date().toISOString().split('T')[0]);
  const [formHorario, setFormHorario] = useState('07:30 - 08:20');
  const [formTitulo, setFormTitulo] = useState('');
  const [formObjetivosBncc, setFormObjetivosBncc] = useState('');
  const [formConteudo, setFormConteudo] = useState('');
  const [formMetodologia, setFormMetodologia] = useState('');
  const [formMateriais, setFormMateriais] = useState('');
  const [formTarefaCasa, setFormTarefaCasa] = useState('');
  const [formStatus, setFormStatus] = useState<PlanejamentoAulaItem['status']>('Planejada');

  const ciclosDisponiveis = configAcademica?.ciclos || DEFAULT_CONFIG_ACADEMICA.ciclos;

  const handleOpenNewPlan = () => {
    setEditingPlan(null);
    setFormTurmaNome(turmas[0]?.nome || '1º Ano A');
    setFormDisciplinaNome(materias[0]?.nome || 'Língua Portuguesa');
    setFormCicloId(ciclosDisponiveis[0]?.id || 'b1');
    setFormDataPrevista(new Date().toISOString().split('T')[0]);
    setFormHorario('07:30 - 08:20');
    setFormTitulo('');
    setFormObjetivosBncc('');
    setFormConteudo('');
    setFormMetodologia('');
    setFormMateriais('');
    setFormTarefaCasa('');
    setFormStatus('Planejada');
    setIsModalOpen(true);
  };

  const handleOpenEditPlan = (plan: PlanejamentoAulaItem) => {
    setEditingPlan(plan);
    setFormTurmaNome(plan.turmaNome);
    setFormDisciplinaNome(plan.disciplinaNome);
    setFormCicloId(plan.cicloId);
    setFormDataPrevista(plan.dataPrevista);
    setFormHorario(plan.horario);
    setFormTitulo(plan.titulo);
    setFormObjetivosBncc(plan.objetivosBncc || '');
    setFormConteudo(plan.conteudoProgramatico);
    setFormMetodologia(plan.metodologia || '');
    setFormMateriais(plan.materiaisNecessarios || '');
    setFormTarefaCasa(plan.tarefaCasa || '');
    setFormStatus(plan.status);
    setIsModalOpen(true);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) {
      toast.error('Informe o título do plano de aula.');
      return;
    }

    const cicloObj = ciclosDisponiveis.find((c) => c.id === formCicloId) || ciclosDisponiveis[0];
    const turmaObj = turmas.find((t) => t.nome === formTurmaNome);
    const matObj = materias.find((m) => m.nome === formDisciplinaNome);

    if (editingPlan) {
      setPlanos((prev) =>
        prev.map((p) =>
          p.id === editingPlan.id
            ? {
                ...p,
                turmaId: turmaObj?.id || p.turmaId,
                turmaNome: formTurmaNome,
                disciplinaId: matObj?.id || p.disciplinaId,
                disciplinaNome: formDisciplinaNome,
                cicloId: cicloObj?.id || p.cicloId,
                cicloNome: cicloObj?.nomePublico || p.cicloNome,
                dataPrevista: formDataPrevista,
                horario: formHorario,
                titulo: formTitulo.trim(),
                objetivosBncc: formObjetivosBncc.trim(),
                conteudoProgramatico: formConteudo.trim(),
                metodologia: formMetodologia.trim(),
                materiaisNecessarios: formMateriais.trim(),
                tarefaCasa: formTarefaCasa.trim(),
                status: formStatus,
              }
            : p
        )
      );
      toast.success('Plano de aula atualizado com sucesso!');
    } else {
      const novo: PlanejamentoAulaItem = {
        id: `plan-${Date.now()}`,
        turmaId: turmaObj?.id || 'turma-gen',
        turmaNome: formTurmaNome,
        disciplinaId: matObj?.id || 'mat-gen',
        disciplinaNome: formDisciplinaNome,
        cicloId: cicloObj?.id || 'b1',
        cicloNome: cicloObj?.nomePublico || '1º Bimestre',
        dataPrevista: formDataPrevista,
        horario: formHorario,
        titulo: formTitulo.trim(),
        objetivosBncc: formObjetivosBncc.trim(),
        conteudoProgramatico: formConteudo.trim(),
        metodologia: formMetodologia.trim(),
        materiaisNecessarios: formMateriais.trim(),
        tarefaCasa: formTarefaCasa.trim(),
        status: formStatus,
      };

      setPlanos((prev) => [novo, ...prev]);
      toast.success('Plano de aula cadastrado com sucesso!');
    }

    setIsModalOpen(false);
  };

  const handleDeletePlan = (id: string, titulo: string) => {
    if (window.confirm(`Deseja remover o plano "${titulo}"?`)) {
      setPlanos((prev) => prev.filter((p) => p.id !== id));
      toast.success('Plano de aula removido.');
    }
  };

  const planosFiltrados = planos.filter((p) => {
    const matchSearch =
      p.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.conteudoProgramatico.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.disciplinaNome.toLowerCase().includes(searchTerm.toLowerCase());

    const matchTurma = selectedTurmaFilter === 'todas' || p.turmaNome === selectedTurmaFilter;
    const matchCiclo = selectedCicloFilter === 'todos' || p.cicloId === selectedCicloFilter;

    return matchSearch && matchTurma && matchCiclo;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 border rounded-xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="text-purple-600" size={22} />
            Diário de Classe e Registro de Aulas
          </h2>
          <p className="text-xs text-slate-500">
            Registre e acompanhe as aulas ministradas, objetivos BNCC, metodologia e status por turma.
          </p>
        </div>
        <Button
          onClick={handleOpenNewPlan}
          className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} /> Novo Registro no Diário
        </Button>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input
            placeholder="Buscar por conteúdo, título ou disciplina..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <Select value={selectedTurmaFilter} onValueChange={setSelectedTurmaFilter}>
          <SelectTrigger className="w-full sm:w-[180px] text-xs">
            <SelectValue placeholder="Turma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as Turmas</SelectItem>
            {turmas.map((t) => (
              <SelectItem key={t.id} value={t.nome}>
                {t.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCicloFilter} onValueChange={setSelectedCicloFilter}>
          <SelectTrigger className="w-full sm:w-[180px] text-xs">
            <SelectValue placeholder="Ciclo Letivo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Ciclos</SelectItem>
            {ciclosDisponiveis.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nomePublico}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Registros do Diário */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {planosFiltrados.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed text-slate-500">
            <BookOpen size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="font-semibold">Nenhum registro encontrado para estes filtros.</p>
            <p className="text-xs text-slate-400 mt-1">Crie um novo registro no diário clicando no botão acima.</p>
          </div>
        ) : (
          planosFiltrados.map((p) => (
            <Card key={p.id} className="border-slate-200 hover:border-purple-300 transition-all shadow-sm">
              <CardHeader className="pb-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge variant="outline" className="text-[10px] text-purple-700 bg-purple-50 border-purple-200 font-semibold">
                        {p.turmaNome}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-blue-700 bg-blue-50 border-blue-200 font-semibold">
                        {p.disciplinaNome}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-slate-600 bg-slate-50 border-slate-200">
                        {p.cicloNome}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold text-slate-800">{p.titulo}</CardTitle>
                  </div>

                  <Badge
                    className={`text-[10px] font-semibold ${
                      p.status === 'Executada'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : p.status === 'Em Andamento'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    {p.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-2.5 text-xs text-slate-600 pb-3">
                <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Calendar size={13} className="text-purple-600" />
                    {new Date(p.dataPrevista + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={13} className="text-purple-600" />
                    {p.horario}
                  </span>
                </div>

                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1">
                  <span className="font-semibold text-slate-700 block text-[11px]">Conteúdo Programático:</span>
                  <p className="line-clamp-2 text-slate-600">{p.conteudoProgramatico}</p>
                </div>

                {p.objetivosBncc && (
                  <div className="text-[11px] text-slate-500 line-clamp-1" title={p.objetivosBncc}>
                    <strong>BNCC:</strong> {p.objetivosBncc}
                  </div>
                )}
              </CardContent>

              <div className="p-2.5 bg-slate-50 border-t flex items-center justify-end gap-2 rounded-b-xl">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-blue-600 hover:bg-blue-50"
                  onClick={() => handleOpenEditPlan(p)}
                >
                  <Pencil size={13} className="mr-1" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-rose-600 hover:bg-rose-50"
                  onClick={() => handleDeletePlan(p.id, p.titulo)}
                >
                  <Trash2 size={13} className="mr-1" /> Excluir
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Criação / Edição de Registro no Diário */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="text-purple-600" size={20} />
              {editingPlan ? 'Editar Registro no Diário' : 'Novo Registro no Diário'}
            </DialogTitle>
            <DialogDescription>
              Registre a aula com objetivos de aprendizagem, metodologia e recursos didáticos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePlan} className="space-y-3.5 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Turma *</Label>
                <Select value={formTurmaNome} onValueChange={setFormTurmaNome}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {turmas.map((t) => (
                      <SelectItem key={t.id} value={t.nome}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Disciplina *</Label>
                <Select value={formDisciplinaNome} onValueChange={setFormDisciplinaNome}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {materias.map((m) => (
                      <SelectItem key={m.id} value={m.nome}>
                        {m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Ciclo Letivo</Label>
                <Select value={formCicloId} onValueChange={setFormCicloId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ciclosDisponiveis.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nomePublico}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Data Prevista</Label>
                <Input
                  type="date"
                  value={formDataPrevista}
                  onChange={(e) => setFormDataPrevista(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Horário da Aula</Label>
                <Input
                  value={formHorario}
                  onChange={(e) => setFormHorario(e.target.value)}
                  placeholder="07:30 - 08:20"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Status do Plano</Label>
                <Select value={formStatus} onValueChange={(v: any) => setFormStatus(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planejada">Planejada</SelectItem>
                    <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                    <SelectItem value="Executada">Executada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Título do Plano / Tema da Aula *</Label>
              <Input
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                placeholder="Ex: Frações Equivalentes no Cotidiano"
                required
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Competências e Habilidades (BNCC)</Label>
              <Input
                value={formObjetivosBncc}
                onChange={(e) => setFormObjetivosBncc(e.target.value)}
                placeholder="Ex: EF05MA03 - Identificar e representar frações..."
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Conteúdo e Desenvolvimento da Aula *</Label>
              <Textarea
                value={formConteudo}
                onChange={(e) => setFormConteudo(e.target.value)}
                placeholder="Descreva o passo a passo da aula, conceitos a serem trabalhados e atividades..."
                required
                className="h-20 text-xs resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Recursos e Materiais Necessários</Label>
                <Input
                  value={formMateriais}
                  onChange={(e) => setFormMateriais(e.target.value)}
                  placeholder="Ex: Cartolinas, tesoura, apostilas..."
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tarefa de Casa / Fixação</Label>
                <Input
                  value={formTarefaCasa}
                  onChange={(e) => setFormTarefaCasa(e.target.value)}
                  placeholder="Ex: Exercícios 1 ao 5 da pág. 42"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                {editingPlan ? 'Salvar Alterações' : 'Criar Plano de Aula'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

