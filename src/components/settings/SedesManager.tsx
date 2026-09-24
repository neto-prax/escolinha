import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSedes } from '@/hooks/useSedes';
import { Sede } from '@/types/sede';
import { toast } from 'sonner';

export const SedesManager: React.FC = () => {
  const { sedes, addSede, updateSede, deleteSede } = useSedes();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSede, setEditingSede] = useState<Sede | null>(null);
  const [sedeToDelete, setSedeToDelete] = useState<Sede | null>(null);

  // Form State
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [tipo, setTipo] = useState<'Matriz' | 'Filial'>('Filial');
  const [endereco, setEndereco] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('BA');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [capacidade, setCapacidade] = useState('');
  const [isAtiva, setIsAtiva] = useState(true);

  const handleOpenNew = () => {
    setEditingSede(null);
    setNome('');
    setCodigo('');
    setTipo('Filial');
    setEndereco('');
    setCidade('Feira de Santana');
    setEstado('BA');
    setTelefone('');
    setEmail('');
    setResponsavel('');
    setCapacidade('300');
    setIsAtiva(true);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (s: Sede) => {
    setEditingSede(s);
    setNome(s.nome);
    setCodigo(s.codigo || '');
    setTipo(s.tipo);
    setEndereco(s.endereco || '');
    setCidade(s.cidade || '');
    setEstado(s.estado || 'BA');
    setTelefone(s.telefone || '');
    setEmail(s.email || '');
    setResponsavel(s.responsavel || '');
    setCapacidade(s.capacidadeAlunos ? String(s.capacidadeAlunos) : '');
    setIsAtiva(s.is_ativa);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error('Informe o nome da sede.');
      return;
    }

    const payload = {
      nome: nome.trim(),
      codigo: codigo.trim() || undefined,
      tipo,
      endereco: endereco.trim() || undefined,
      cidade: cidade.trim() || undefined,
      estado: estado.trim() || undefined,
      telefone: telefone.trim() || undefined,
      email: email.trim() || undefined,
      responsavel: responsavel.trim() || undefined,
      capacidadeAlunos: capacidade ? parseInt(capacidade, 10) : undefined,
      is_ativa: isAtiva,
    };

    if (editingSede) {
      updateSede(editingSede.id, payload);
    } else {
      addSede(payload);
    }

    setIsDialogOpen(false);
  };

  const confirmDelete = () => {
    if (sedeToDelete) {
      deleteSede(sedeToDelete.id);
      setSedeToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-[#6b26d9] text-white">Multi-Unidades</Badge>
              <span className="text-xs text-muted-foreground">{sedes.length} sedes cadastradas</span>
            </div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#6b26d9]" />
              Gestão de Sedes & Unidades Escolares
            </CardTitle>
            <CardDescription>
              Cadastre e gerencie as sedes matrizes, filiais e polos da sua instituição de ensino.
            </CardDescription>
          </div>
          <Button
            onClick={handleOpenNew}
            className="bg-[#6b26d9] hover:bg-[#5b21b6] text-white gap-2 font-bold shadow-sm"
          >
            <Plus className="h-4 w-4" /> Cadastrar Nova Sede
          </Button>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sedes.map((s) => {
              const isMatriz = s.tipo === 'Matriz';

              return (
                <div
                  key={s.id}
                  className={`flex flex-col justify-between p-5 rounded-xl border transition-all ${
                    isMatriz
                      ? 'border-[#6b26d9]/40 bg-gradient-to-br from-purple-50/60 to-white shadow-sm ring-1 ring-[#6b26d9]/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header do Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold ${
                            isMatriz
                              ? 'bg-[#6b26d9] text-white shadow-sm shadow-[#6b26d9]/30'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm leading-tight flex items-center gap-1.5">
                            {s.nome}
                          </h4>
                          {s.codigo && (
                            <span className="text-[11px] font-mono text-slate-500">Cód: {s.codigo}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          className={
                            isMatriz
                              ? 'bg-[#6b26d9] hover:bg-[#5b21b6] text-white text-[10px]'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 text-[10px]'
                          }
                        >
                          {s.tipo}
                        </Badge>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                            s.is_ativa ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          ● {s.is_ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                    </div>

                    {/* Detalhes da Sede */}
                    <div className="space-y-1.5 pt-2 text-xs text-slate-600 border-t border-slate-100">
                      {s.endereco && (
                        <div className="flex items-start gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="truncate">
                            {s.endereco}
                            {s.cidade && ` - ${s.cidade}/${s.estado}`}
                          </span>
                        </div>
                      )}
                      {s.telefone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{s.telefone}</span>
                        </div>
                      )}
                      {s.responsavel && (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">Resp: {s.responsavel}</span>
                        </div>
                      )}
                      {s.capacidadeAlunos && (
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>Capacidade: {s.capacidadeAlunos} alunos</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center justify-end gap-1.5 pt-4 mt-3 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(s)}
                      className="h-8 text-xs gap-1"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    {!isMatriz && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSedeToDelete(s)}
                        className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Cadastro / Edição de Sede */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#6b26d9]" />
              {editingSede ? 'Editar Sede / Unidade' : 'Cadastrar Nova Sede'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da unidade escolar para identificação em turmas, financeiro e estoque.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Nome da Sede *</Label>
                <Input
                  placeholder="Ex: Sede Norte (Parque)"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Código Sigla</Label>
                <Input
                  placeholder="Ex: NOR"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo de Unidade *</Label>
                <Select
                  value={tipo}
                  onValueChange={(val: 'Matriz' | 'Filial') => setTipo(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Matriz">Sede Matriz (Principal)</SelectItem>
                    <SelectItem value="Filial">Filial / Polo Educacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Capacidade Estimada (Alunos)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 350"
                  value={capacidade}
                  onChange={(e) => setCapacidade(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Endereço (Rua, Número, Bairro)</Label>
              <Input
                placeholder="Ex: Rua das Flores, 120, Centro"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Cidade</Label>
                <Input
                  placeholder="Ex: Feira de Santana"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Estado (UF)</Label>
                <Input
                  placeholder="BA"
                  maxLength={2}
                  value={estado}
                  onChange={(e) => setEstado(e.target.value.toUpperCase())}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Telefone / WhatsApp</Label>
                <Input
                  placeholder="(75) 90000-0000"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Responsável / Diretor</Label>
                <Input
                  placeholder="Nome do coordenador"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-slate-800">Sede Ativa</Label>
                <p className="text-[11px] text-muted-foreground">
                  Unidades ativas ficam visíveis para seleção em turmas e lançamentos.
                </p>
              </div>
              <Switch checked={isAtiva} onCheckedChange={setIsAtiva} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#6b26d9] hover:bg-[#5b21b6] text-white font-bold">
                {editingSede ? 'Salvar Alterações' : 'Cadastrar Sede'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alerta de Exclusão */}
      <AlertDialog open={!!sedeToDelete} onOpenChange={() => setSedeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              Excluir Sede
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a sede <strong>{sedeToDelete?.nome}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700 text-white">
              Excluir Sede
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SedesManager;

