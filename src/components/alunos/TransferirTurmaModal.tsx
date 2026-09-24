import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRightLeft, Plus, GraduationCap, Check, Sparkles, X } from 'lucide-react';
import { TurmaConfig } from '@/types/finance';
import { Aluno } from '@/types/aluno';
import { toast } from 'sonner';

interface TransferirTurmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAlunoIds: string[];
  alunos: Aluno[];
  turmas: TurmaConfig[];
  onConfirmTransfer: (params: {
    alunoIds: string[];
    novoSetor: string;
    novaClasse: string;
    novaTurma: string;
    ajustarMensalidades: boolean;
  }) => void;
  onNovaTurmaCriada?: (setor: string, classe: string, novaLetra: string) => void;
}

const SETORES_PADRAO = [
  'Educação Infantil',
  'Ensino Fundamental 1',
  'Ensino Fundamental 2',
  'Ensino Médio',
];

export const TransferirTurmaModal: React.FC<TransferirTurmaModalProps> = ({
  isOpen,
  onClose,
  selectedAlunoIds,
  alunos,
  turmas,
  onConfirmTransfer,
  onNovaTurmaCriada,
}) => {
  const [activeSelectedIds, setActiveSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setActiveSelectedIds(selectedAlunoIds);
    }
  }, [isOpen, selectedAlunoIds]);

  const selectedAlunos = alunos.filter(a => activeSelectedIds.includes(a.id));
  const primeiroAluno = selectedAlunos[0];

  const [setorDestino, setSetorDestino] = useState<string>('Ensino Fundamental 1');
  const [classeDestino, setClasseDestino] = useState<string>('');
  const [turmaLetraDestino, setTurmaLetraDestino] = useState<string>('A');
  const [ajustarMensalidades, setAjustarMensalidades] = useState<boolean>(false);

  // Estado para criação rápida de nova turma/letra inline
  const [isCriandoNovaLetra, setIsCriandoNovaLetra] = useState<boolean>(false);
  const [novaLetraInput, setNovaLetraInput] = useState<string>('');

  // Classes disponíveis para o setor selecionado
  const classesDoSetor = turmas.filter(t => t.setor.trim() === setorDestino.trim());

  // TurmaConfig selecionada
  const turmaSelecionadaConfig = turmas.find(
    t => t.setor.trim() === setorDestino.trim() && t.nome.trim() === classeDestino.trim()
  );

  const letrasDisponiveis = turmaSelecionadaConfig?.letras && turmaSelecionadaConfig.letras.length > 0
    ? turmaSelecionadaConfig.letras
    : ['A'];

  // Quando o modal abre, preencher com o setor e classe mais próximos
  useEffect(() => {
    if (isOpen && primeiroAluno) {
      const setorInit = primeiroAluno.setor || 'Ensino Fundamental 1';
      setSetorDestino(setorInit);

      const classesDoSetorInit = turmas.filter(t => t.setor.trim() === setorInit.trim());
      const classeInit = primeiroAluno.classe && classesDoSetorInit.some(c => c.nome === primeiroAluno.classe)
        ? primeiroAluno.classe
        : (classesDoSetorInit[0]?.nome || '1º Ano');

      setClasseDestino(classeInit);
      setTurmaLetraDestino(primeiroAluno.turma === 'A' ? 'B' : 'A');
      setIsCriandoNovaLetra(false);
      setNovaLetraInput('');
    }
  }, [isOpen, primeiroAluno, turmas]);

  // Atualizar classe padrão ao trocar o setor
  const handleSetorChange = (novoSetor: string) => {
    setSetorDestino(novoSetor);
    const novasClasses = turmas.filter(t => t.setor.trim() === novoSetor.trim());
    if (novasClasses.length > 0) {
      setClasseDestino(novasClasses[0].nome);
      const letras = novasClasses[0].letras?.length ? novasClasses[0].letras : ['A'];
      setTurmaLetraDestino(letras[0]);
    } else {
      setClasseDestino('');
      setTurmaLetraDestino('A');
    }
  };

  // Atualizar letra padrão ao trocar a classe
  const handleClasseChange = (novaClasse: string) => {
    setClasseDestino(novaClasse);
    const turmaConf = turmas.find(t => t.setor.trim() === setorDestino.trim() && t.nome.trim() === novaClasse.trim());
    const letras = turmaConf?.letras?.length ? turmaConf.letras : ['A'];
    setTurmaLetraDestino(letras[0]);
  };

  // Criação rápida de nova letra/turma (ex: Turma B, Turma C) diretamente no modal
  const handleCriarNovaLetra = () => {
    const letraFormatada = novaLetraInput.trim().toUpperCase();
    if (!letraFormatada) {
      toast.error('Informe a letra ou nome da nova turma (ex: B, C, Matutino)');
      return;
    }

    if (onNovaTurmaCriada) {
      onNovaTurmaCriada(setorDestino, classeDestino, letraFormatada);
    }

    setTurmaLetraDestino(letraFormatada);
    setIsCriandoNovaLetra(false);
    setNovaLetraInput('');
    toast.success(`Turma "${letraFormatada}" adicionada para ${classeDestino} com sucesso!`);
  };

  const handleConfirmar = () => {
    if (activeSelectedIds.length === 0) {
      toast.error('Nenhum aluno selecionado para transferência.');
      return;
    }
    if (!classeDestino) {
      toast.error('Selecione a classe de destino.');
      return;
    }
    if (!turmaLetraDestino) {
      toast.error('Selecione a turma/letra de destino.');
      return;
    }

    onConfirmTransfer({
      alunoIds: activeSelectedIds,
      novoSetor: setorDestino,
      novaClasse: classeDestino,
      novaTurma: turmaLetraDestino,
      ajustarMensalidades,
    });

    onClose();
  };

  if (!isOpen) return null;

  const valorPadraoDestino = turmaSelecionadaConfig?.valorPadrao;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <ArrowRightLeft className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Gestão Escolar</span>
          </div>
          <DialogTitle className="text-xl flex items-center gap-2">
            {activeSelectedIds.length > 1 ? (
              <>
                <span>Transferência de Alunos em Massa</span>
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 text-xs">
                  {activeSelectedIds.length} Alunos
                </Badge>
              </>
            ) : (
              <span>Transferência Facilitada de Turma</span>
            )}
          </DialogTitle>
          <DialogDescription>
            {activeSelectedIds.length > 1
              ? `Transfira ${activeSelectedIds.length} alunos de uma vez entre séries e turmas. Você pode remover alunos individuais da lista abaixo.`
              : 'Transfira rapidamente o aluno entre séries e turmas, com opção de criar novas turmas na hora.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Card com os alunos a serem transferidos */}
          <div className="p-3.5 rounded-lg border bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                {activeSelectedIds.length === 1 ? 'Aluno a Transferir' : `Alunos Selecionados (${activeSelectedIds.length})`}
              </span>
              {activeSelectedIds.length > 1 && (
                <span className="text-[11px] text-muted-foreground">
                  Clique no <X className="inline h-3 w-3" /> para remover da transferência
                </span>
              )}
            </div>

            {activeSelectedIds.length === 0 ? (
              <p className="text-xs text-destructive italic">
                Você removeu todos os alunos da seleção. Selecione ao menos um aluno para prosseguir.
              </p>
            ) : activeSelectedIds.length === 1 ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-base text-foreground">{primeiroAluno?.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    Matrícula: {primeiroAluno?.matricula}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Turma Atual:</span>
                  <Badge variant="outline" className="font-medium bg-background">
                    {primeiroAluno?.setor || 'Sem Setor'} • {primeiroAluno?.classe || 'Sem Classe'} (Turma {primeiroAluno?.turma || 'A'})
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="max-h-28 overflow-y-auto pr-1 flex flex-wrap gap-1.5 p-1 bg-background/50 rounded border">
                  {selectedAlunos.map(a => (
                    <Badge key={a.id} variant="secondary" className="text-xs flex items-center gap-1.5 py-1 px-2">
                      <span className="font-medium">{a.nome}</span>
                      <span className="text-[10px] text-muted-foreground">
                        ({a.classe || 'S/ classe'} {a.turma || ''})
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveSelectedIds(prev => prev.filter(id => id !== a.id))}
                        className="rounded-full hover:bg-muted-foreground/20 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                        title={`Remover ${a.nome} da transferência`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Seletores de Destino */}
          <div className="space-y-3.5 border rounded-lg p-4 bg-background shadow-xs">
            <div className="flex items-center gap-2 pb-2 border-b">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Destino da Transferência</span>
            </div>

            {/* Setor */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Segmento / Setor</Label>
              <Select value={setorDestino} onValueChange={handleSetorChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione o segmento" />
                </SelectTrigger>
                <SelectContent>
                  {SETORES_PADRAO.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Classe / Série */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Curso / Série</Label>
              <Select value={classeDestino} onValueChange={handleClasseChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione a série" />
                </SelectTrigger>
                <SelectContent>
                  {classesDoSetor.map(c => (
                    <SelectItem key={c.nome} value={c.nome}>
                      {c.nome} {c.valorPadrao ? `(R$ ${c.valorPadrao.toFixed(2)})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Turma / Letra com botão de criação rápida */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Turma (Letra)</Label>
                {!isCriandoNovaLetra && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-primary font-semibold hover:bg-primary/10 gap-1"
                    onClick={() => setIsCriandoNovaLetra(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    + Criar Nova Turma (ex: B, C)
                  </Button>
                )}
              </div>

              {/* Se estiver criando nova letra inline */}
              {isCriandoNovaLetra ? (
                <div className="p-2.5 border rounded-md bg-muted/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      placeholder="Ex: B, C, Tarde, Manhã..."
                      value={novaLetraInput}
                      onChange={(e) => setNovaLetraInput(e.target.value)}
                      className="h-8 text-sm uppercase bg-background"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCriarNovaLetra();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={handleCriarNovaLetra}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Adicionar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => { setIsCriandoNovaLetra(false); setNovaLetraInput(''); }}
                    >
                      Cancelar
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    A nova turma será cadastrada imediatamente para {classeDestino}.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {letrasDisponiveis.map(letra => {
                    const isSelected = turmaLetraDestino === letra;
                    return (
                      <Button
                        key={letra}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTurmaLetraDestino(letra)}
                        className={`h-9 px-4 font-semibold ${
                          isSelected
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'hover:bg-muted'
                        }`}
                      >
                        Turma {letra}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Opção financeira de ajuste */}
          {valorPadraoDestino !== undefined && (
            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/20">
              <Checkbox
                id="ajustar-mensalidades"
                checked={ajustarMensalidades}
                onCheckedChange={(checked) => setAjustarMensalidades(!!checked)}
                className="mt-0.5"
              />
              <div className="space-y-0.5 leading-none">
                <label
                  htmlFor="ajustar-mensalidades"
                  className="text-xs font-semibold cursor-pointer text-foreground"
                >
                  Atualizar valor base para a nova turma (R$ {valorPadraoDestino.toFixed(2)})
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Reajusta as parcelas pendentes com o valor padrão da nova turma (mantendo descontos individuais já aplicados).
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmar}
            disabled={activeSelectedIds.length === 0}
            className="gap-1.5 font-semibold bg-primary hover:bg-primary/90"
          >
            <ArrowRightLeft className="h-4 w-4" />
            {activeSelectedIds.length > 1
              ? `Confirmar Transferência em Massa (${activeSelectedIds.length} Alunos)`
              : 'Confirmar Transferência'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

