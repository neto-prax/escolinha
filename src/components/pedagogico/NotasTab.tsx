import React, { useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Award, GraduationCap, Plus, Search, TrendingUp, AlertTriangle, CheckCircle, Edit3, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export interface NotaAluno {
  id: string;
  alunoNome: string;
  turma: string;
  bimestre: string;
  disciplina: string;
  notaAvaliacao1: number;
  notaAvaliacao2: number;
  notaExame: number;
  parecerPedagogico?: string;
}

const mockNotas: NotaAluno[] = [
  {
    id: '1',
    alunoNome: 'Gabriel Santos',
    turma: 'Sub-11 A',
    bimestre: '1º Bimestre',
    disciplina: 'Futebol Tático',
    notaAvaliacao1: 8.5,
    notaAvaliacao2: 9.0,
    notaExame: 8.8,
    parecerPedagogico: 'Ótima evolução técnica e excelente liderança em campo.',
  },
  {
    id: '2',
    alunoNome: 'Lucas Oliveira',
    turma: 'Sub-11 A',
    bimestre: '1º Bimestre',
    disciplina: 'Futebol Tático',
    notaAvaliacao1: 6.0,
    notaAvaliacao2: 5.5,
    notaExame: 6.5,
    parecerPedagogico: 'Necessita reforço na parte de movimentação sem bola.',
  },
  {
    id: '3',
    alunoNome: 'Matheus Pereira',
    turma: 'Sub-13 A',
    bimestre: '1º Bimestre',
    disciplina: 'Preparação Física & Tática',
    notaAvaliacao1: 9.5,
    notaAvaliacao2: 9.8,
    notaExame: 9.5,
    parecerPedagogico: 'Excelente condicionamento físico e aproveitamento de passe.',
  },
];

export const NotasTab: React.FC = () => {
  const [notasList, setNotasList] = useLocalStorage<NotaAluno[]>('escolinha_notas_alunos', mockNotas);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('todas');
  const [selectedBimestre, setSelectedBimestre] = useState('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [alunoNome, setAlunoNome] = useState('');
  const [turma, setTurma] = useState('Sub-11 A');
  const [bimestre, setBimestre] = useState('1º Bimestre');
  const [disciplina, setDisciplina] = useState('Futebol Tático');
  const [notaAvaliacao1, setNotaAvaliacao1] = useState<number>(8.0);
  const [notaAvaliacao2, setNotaAvaliacao2] = useState<number>(8.0);
  const [notaExame, setNotaExame] = useState<number>(8.0);
  const [parecerPedagogico, setParecerPedagogico] = useState('');

  const calculateMedia = (n1: number, n2: number, nExame: number) => {
    const media = (Number(n1) + Number(n2) + Number(nExame)) / 3;
    return Number(media.toFixed(1));
  };

  const getStatusBadge = (media: number) => {
    if (media >= 7.0) {
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold">Excelente</Badge>;
    } else if (media >= 6.0) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-semibold">Satisfatório</Badge>;
    } else {
      return <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold">Em Acompanhamento</Badge>;
    }
  };

  const handleCreateNota = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alunoNome.trim()) {
      toast.error('Informe o nome do aluno.');
      return;
    }

    const newNota: NotaAluno = {
      id: crypto.randomUUID(),
      alunoNome,
      turma,
      bimestre,
      disciplina,
      notaAvaliacao1: Number(notaAvaliacao1),
      notaAvaliacao2: Number(notaAvaliacao2),
      notaExame: Number(notaExame),
      parecerPedagogico: parecerPedagogico.trim() || undefined,
    };

    setNotasList([newNota, ...notasList]);
    toast.success('Avaliação registrada com sucesso!');
    toast.success('Notas registradas com sucesso!');
    setIsModalOpen(false);

    // Reset Form
    setAlunoNome('');
    setParecerPedagogico('');
  };

  const handleDeleteNota = (id: string) => {
    setNotasList(notasList.filter((n) => n.id !== id));
    toast.success('Avaliação removida.');
    toast.success('Registro de notas removido.');
  };

  const filteredNotas = notasList.filter((item) => {
    const matchesSearch =
      item.alunoNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.disciplina.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTurma = selectedTurma === 'todas' || item.turma === selectedTurma;
    const matchesBimestre = selectedBimestre === 'todos' || item.bimestre === selectedBimestre;
    return matchesSearch && matchesTurma && matchesBimestre;
  });

  const totalAvaliados = filteredNotas.length;
  const mediaGeral = totalAvaliados
    ? (
        filteredNotas.reduce((acc, curr) => acc + calculateMedia(curr.notaAvaliacao1, curr.notaAvaliacao2, curr.notaExame), 0) /
        totalAvaliados
      ).toFixed(1)
    : '0.0';

  const aprovadosPercent = totalAvaliados
    ? Math.round(
        (filteredNotas.filter(
          (item) => calculateMedia(item.notaAvaliacao1, item.notaAvaliacao2, item.notaExame) >= 6.0
        ).length /
          totalAvaliados) *
          100
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/50 backdrop-blur-sm border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600">Alunos Avaliados</CardTitle>
            <CardTitle className="text-sm font-medium text-slate-600">Alunos com Notas Registradas</CardTitle>
            <GraduationCap className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{totalAvaliados}</div>
            <p className="text-xs text-slate-500 mt-1">Registros de avaliações lançadas</p>
            <p className="text-xs text-slate-500 mt-1">Boletins lançados no período</p>
          </CardContent>
        </Card>

        <Card className="bg-white/50 backdrop-blur-sm border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600">Média Geral de Notas</CardTitle>
            <CardTitle className="text-sm font-medium text-slate-600">Média Geral das Turmas</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{mediaGeral} <span className="text-xs text-slate-400 font-normal">/ 10</span></div>
            <p className="text-xs text-slate-500 mt-1">Média das pontuações dos alunos</p>
            <p className="text-xs text-slate-500 mt-1">Média ponderada das notas lançadas</p>
          </CardContent>
        </Card>

        <Card className="bg-white/50 backdrop-blur-sm border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600">Desempenho Satisfatório</CardTitle>
            <CardTitle className="text-sm font-medium text-slate-600">Rendimento Satisfatório</CardTitle>
            <Award className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-800">{aprovadosPercent}%</div>
                <p className="text-xs text-slate-500 mt-0.5">Nota maior ou igual a 6.0</p>
                <p className="text-xs text-slate-500 mt-0.5">Média final maior ou igual a 6.0</p>
              </div>
              <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs">
                <Plus className="h-4 w-4" /> Lançar Nota
                <Plus className="h-4 w-4" /> Lançar Notas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome do aluno ou disciplina..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Select value={selectedTurma} onValueChange={setSelectedTurma}>
            <SelectTrigger className="w-[160px] text-xs">
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
            <SelectTrigger className="w-[160px] text-xs">
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

      {/* Grades Table */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-700">Aluno</TableHead>
              <TableHead className="font-semibold text-slate-700">Turma / Período</TableHead>
              <TableHead className="font-semibold text-slate-700">Disciplina</TableHead>
              <TableHead className="text-center font-semibold text-slate-700">Nota 1 (N1)</TableHead>
              <TableHead className="text-center font-semibold text-slate-700">Nota 2 (N2)</TableHead>
              <TableHead className="text-center font-semibold text-slate-700">Exame</TableHead>
              <TableHead className="text-center font-semibold text-slate-700">Média Final</TableHead>
              <TableHead className="text-center font-semibold text-slate-700">Situação</TableHead>
              <TableHead className="text-right font-semibold text-slate-700">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredNotas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-slate-500 text-sm">
                  Nenhum registro de notas encontrado com os filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              filteredNotas.map((item) => {
                const media = calculateMedia(item.notaAvaliacao1, item.notaAvaliacao2, item.notaExame);
                return (
                  <TableRow key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="font-medium text-slate-800">
                      <div>{item.alunoNome}</div>
                      {item.parecerPedagogico && (
                        <div className="text-xs text-slate-500 truncate max-w-xs mt-0.5" title={item.parecerPedagogico}>
                          💬 {item.parecerPedagogico}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold text-slate-700">{item.turma}</div>
                      <div className="text-xs text-slate-500">{item.bimestre}</div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">{item.disciplina}</TableCell>
                    <TableCell className="text-center font-mono text-xs">{item.notaAvaliacao1.toFixed(1)}</TableCell>
                    <TableCell className="text-center font-mono text-xs">{item.notaAvaliacao2.toFixed(1)}</TableCell>
                    <TableCell className="text-center font-mono text-xs">{item.notaExame.toFixed(1)}</TableCell>
                    <TableCell className="text-center font-mono font-bold text-slate-900">{media.toFixed(1)}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(media)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteNota(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal - Lançar Nota */}
      {/* Modal - Lançar Notas */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Lançar Avaliação do Aluno</DialogTitle>
            <DialogDescription>Insira as notas referentes às atividades e exames do aluno.</DialogDescription>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <GraduationCap className="h-5 w-5 text-emerald-600" /> Lançar Notas do Aluno
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do aluno e as notas numéricas das atividades e exames do bimestre.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNota} className="space-y-4 py-2">
            {/* Seção 1: Identificação */}
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Nome do Aluno *</label>
              <Input
                value={alunoNome}
                onChange={(e) => setAlunoNome(e.target.value)}
                placeholder="Digite o nome completo do aluno"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Turma</label>
                <Select value={turma} onValueChange={setTurma}>
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
                <Select value={bimestre} onValueChange={setBimestre}>
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

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Disciplina / Módulo</label>
              <Input
                value={disciplina}
                onChange={(e) => setDisciplina(e.target.value)}
                placeholder="Ex: Futebol Tático, Preparação..."
                required
              />
            </div>

            {/* Seção 2: Notas das Atividades / Avaliações */}
            <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 space-y-3">
              <span className="text-xs font-semibold text-slate-700 block">
                Notas do Bimestre (Escala de 0 a 10)
              </span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Nota 1 (N1)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={notaAvaliacao1}
                    onChange={(e) => setNotaAvaliacao1(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Nota 2 (N2)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={notaAvaliacao2}
                    onChange={(e) => setNotaAvaliacao2(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Exame / Recup.</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={notaExame}
                    onChange={(e) => setNotaExame(Number(e.target.value))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Média Prevista */}
            <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200 text-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-800 block">Média Final Prevista:</span>
                <span className="text-[11px] text-emerald-600">Calculada automaticamente</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-emerald-900 font-mono">
                  {calculateMedia(notaAvaliacao1, notaAvaliacao2, notaExame).toFixed(1)}
                </span>
                {getStatusBadge(calculateMedia(notaAvaliacao1, notaAvaliacao2, notaExame))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Anotações / Observações da Nota</label>
              <Input
                value={parecerPedagogico}
                onChange={(e) => setParecerPedagogico(e.target.value)}
                placeholder="Observações complementares sobre a pontuação..."
              />
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Salvar Notas
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
