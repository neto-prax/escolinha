import React, { useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Materia, DEFAULT_MATERIAS } from '@/types/pedagogico';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  Clock,
  User,
  Palette,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

const PRESET_COLORS = [
  '#3b82f6', // Azul
  '#ef4444', // Vermelho
  '#10b981', // Verde
  '#f59e0b', // Âmbar
  '#8b5cf6', // Roxo
  '#ec4899', // Rosa
  '#06b6d4', // Ciano
  '#14b8a6', // Teal
  '#6366f1', // Índigo
  '#84cc16', // Lima
];

export const MateriasTab: React.FC = () => {
  const [materias, setMaterias] = useLocalStorage<Materia[]>('escolinha_materias_v1', DEFAULT_MATERIAS);
  const [employees] = useLocalStorage<any[]>('escolinha_employees_v2', []);

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMateria, setEditingMateria] = useState<Materia | null>(null);

  // Form State
  const [nome, setNome] = useState('');
  const [sigla, setSigla] = useState('');
  const [cor, setCor] = useState('#3b82f6');
  const [cargaHorariaSemanal, setCargaHorariaSemanal] = useState<number>(4);
  const [professorPadraoId, setProfessorPadraoId] = useState<string>('');
  const [ementa, setEmenta] = useState('');

  // Filtrar apenas professores ou funcionários do pedagógico
  const professores = employees.filter((emp) => {
    const role = (emp.role || '').toLowerCase();
    const dept = (emp.department || '').toLowerCase();
    return role.includes('prof') || role.includes('educad') || dept.includes('pedag') || dept.includes('prof');
  });

  const openNewDialog = () => {
    setEditingMateria(null);
    setNome('');
    setSigla('');
    setCor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setCargaHorariaSemanal(4);
    setProfessorPadraoId('');
    setEmenta('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (materia: Materia) => {
    setEditingMateria(materia);
    setNome(materia.nome);
    setSigla(materia.sigla);
    setCor(materia.cor || '#3b82f6');
    setCargaHorariaSemanal(materia.cargaHorariaSemanal || 4);
    setProfessorPadraoId(materia.professorPadraoId || '');
    setEmenta(materia.ementa || '');
    setIsDialogOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error('Informe o nome da disciplina.');
      return;
    }

    const profObj = employees.find((emp) => String(emp.id) === String(professorPadraoId));
    const profNome = profObj ? profObj.name : undefined;

    if (editingMateria) {
      setMaterias((prev) =>
        prev.map((m) =>
          m.id === editingMateria.id
            ? {
                ...m,
                nome: nome.trim(),
                sigla: sigla.trim().toUpperCase() || nome.substring(0, 4).toUpperCase(),
                cor,
                cargaHorariaSemanal: Number(cargaHorariaSemanal) || 1,
                professorPadraoId: profObj ? String(profObj.id) : undefined,
                professorPadraoNome: profNome,
                ementa: ementa.trim(),
              }
            : m
        )
      );
      toast.success('Disciplina atualizada com sucesso!');
    } else {
      const nova: Materia = {
        id: `mat-${Date.now()}`,
        nome: nome.trim(),
        sigla: sigla.trim().toUpperCase() || nome.substring(0, 4).toUpperCase(),
        cor,
        cargaHorariaSemanal: Number(cargaHorariaSemanal) || 1,
        professorPadraoId: profObj ? String(profObj.id) : undefined,
        professorPadraoNome: profNome,
        ementa: ementa.trim(),
      };
      setMaterias((prev) => [...prev, nova]);
      toast.success('Disciplina criada com sucesso!');
    }

    setIsDialogOpen(false);
  };

  const handleDelete = (id: string, nomeMateria: string) => {
    if (window.confirm(`Deseja realmente excluir a disciplina "${nomeMateria}"?`)) {
      setMaterias((prev) => prev.filter((m) => m.id !== id));
      toast.success('Disciplina excluída com sucesso.');
    }
  };

  const filteredMaterias = materias.filter((m) =>
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.sigla.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.professorPadraoNome && m.professorPadraoNome.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalCargaHoraria = materias.reduce((acc, m) => acc + (m.cargaHorariaSemanal || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-blue-700 flex items-center gap-2">
              <BookOpen size={16} /> Total de Disciplinas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{materias.length}</div>
            <p className="text-xs text-blue-600 mt-1">Disciplinas cadastradas no currículo</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-purple-700 flex items-center gap-2">
              <Clock size={16} /> Carga Horária Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{totalCargaHoraria} aulas</div>
            <p className="text-xs text-purple-600 mt-1">Total de aulas semanais sugeridas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-700 flex items-center gap-2">
              <User size={16} /> Professores Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">
              {professores.length > 0 ? professores.length : employees.length}
            </div>
            <p className="text-xs text-emerald-600 mt-1">Colaboradores do setor pedagógico</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Ações */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="text-purple-600" size={20} />
                Disciplinas e Matérias Pedagógicas
              </CardTitle>
              <CardDescription>
                Cadastre e gerencie as matérias da escola. Elas alimentam a grade horária, o diário de classe, as avaliações e os boletins.
              </CardDescription>
            </div>
            <Button
              onClick={openNewDialog}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm flex items-center gap-2"
            >
              <Plus size={16} /> Nova Matéria
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                placeholder="Pesquisar por nome, sigla ou professor responsável..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[80px]">Cor</TableHead>
                  <TableHead>Disciplina</TableHead>
                  <TableHead className="w-[100px]">Sigla</TableHead>
                  <TableHead className="w-[160px]">Aulas / Semana</TableHead>
                  <TableHead>Professor Titular</TableHead>
                  <TableHead>Ementa / Observações</TableHead>
                  <TableHead className="text-right w-[110px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      Nenhuma disciplina encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMaterias.map((m) => (
                    <TableRow key={m.id} className="hover:bg-slate-50/70">
                      <TableCell>
                        <div
                          className="w-6 h-6 rounded-full border border-slate-300 shadow-sm"
                          style={{ backgroundColor: m.cor || '#3b82f6' }}
                          title={m.cor}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-800">{m.nome}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs font-bold">
                          {m.sigla}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-medium text-xs">
                          {m.cargaHorariaSemanal || 1} aulas/sem
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {m.professorPadraoNome ? (
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <User size={14} className="text-purple-600" />
                            <span>{m.professorPadraoNome}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Não vinculado</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-slate-600 line-clamp-1 max-w-xs" title={m.ementa}>
                          {m.ementa || <span className="text-slate-400 italic">Sem ementa</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            onClick={() => openEditDialog(m)}
                            title="Editar Matéria"
                          >
                            <Pencil size={15} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                            onClick={() => handleDelete(m.id, m.nome)}
                            title="Excluir Matéria"
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Criação / Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="text-purple-600" size={20} />
              {editingMateria ? 'Editar Disciplina' : 'Nova Disciplina Pedagógica'}
            </DialogTitle>
            <DialogDescription>
              Defina os dados da disciplina para uso na grade de horários, diário de classe e avaliações.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Nome da Disciplina *</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Robótica Educacional"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Sigla / Código</Label>
                <Input
                  value={sigla}
                  onChange={(e) => setSigla(e.target.value)}
                  placeholder="Ex: ROB"
                  maxLength={8}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Aulas por Semana</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={cargaHorariaSemanal}
                  onChange={(e) => setCargaHorariaSemanal(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cor de Identificação</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cor}
                    onChange={(e) => setCor(e.target.value)}
                    className="w-10 h-9 p-0.5 rounded border border-slate-300 cursor-pointer"
                  />
                  <div className="flex gap-1 overflow-x-auto py-1">
                    {PRESET_COLORS.slice(0, 5).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCor(c)}
                        className={`w-6 h-6 rounded-full border ${
                          cor === c ? 'ring-2 ring-purple-600 scale-110' : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Professor Responsável Padrão</Label>
              <Select
                value={professorPadraoId}
                onValueChange={setProfessorPadraoId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um professor (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum professor vinculado</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.name} {emp.role ? `(${emp.role})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Ementa / Objetivos Pedagógicos</Label>
              <Textarea
                value={ementa}
                onChange={(e) => setEmenta(e.target.value)}
                placeholder="Breve descrição dos objetivos pedagógicos da matéria..."
                className="h-20 text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                {editingMateria ? 'Salvar Alterações' : 'Cadastrar Disciplina'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

