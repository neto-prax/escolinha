import React, { useState, useRef, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Clock,
  CheckCircle2,
  Trash2,
  Paperclip,
  CalendarDays,
  Plus,
  FileUp,
  FileText,
  Boxes,
  Check,
  BookOpen,
  Sparkles,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Eye,
  Edit3,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import {
  TurmaPedagogica,
  Materia,
  DEFAULT_TURMAS_PEDAGOGICO,
  DEFAULT_MATERIAS,
} from '@/types/pedagogico';

export interface AtividadeItem {
  id: string;
  nome: string;
  descricao?: string;
  arquivoNome?: string;
  arquivoTamanho?: string;
  arquivoUrl?: string;
  tipo?: 'classe' | 'casa';
  materialObrigatorio?: string;
  materialOpcional?: string;
}

export interface AulaPlanejamento {
  id: string;
  data: string;
  horario: string;
  turma: string;
  nomeAula: string;
  disciplina: string;
  conteudo: string;
  atividadesAnexadas: AtividadeItem[];
  observacoes?: string;
  campoExperiencia?: string;
  competenciaBncc?: string;
  tipoAtividade?: 'classe' | 'casa' | '';
  materialObrigatorio?: string;
  materialOpcional?: string;
}

const ALL_TIME_SLOTS = [
  '08:00 - 09:30',
  '09:30 - 11:00',
  '14:00 - 15:30',
  '15:30 - 17:00',
  '18:00 - 19:30',
];

const mockAtividadesBanco: AtividadeItem[] = [
  {
    id: 'atv1',
    nome: 'CircuitoMotor',
    descricao: 'Circuito de agilidade, saltos e condução entre cones.',
    arquivoNome: 'plano_circuito_motor.pdf',
    arquivoTamanho: '1.20 MB',
  },
  {
    id: 'atv2',
    nome: 'PasseEmDupla',
    descricao: 'Exercício de passe curto e recepção orientada.',
  },
  {
    id: 'atv3',
    nome: 'FinalizacaoNoGol',
    descricao: 'Treino de finalização de primeira após cruzamento.',
    arquivoNome: 'esquema_finalizacao.pdf',
    arquivoTamanho: '0.85 MB',
  },
];

const mockAulas: AulaPlanejamento[] = [
  {
    id: '1',
    data: new Date().toISOString().split('T')[0],
    horario: '08:00 - 09:30',
    turma: 'Sub-11 A',
    nomeAula: 'Aula 01 - Transição Defensiva e Posicionamento',
    disciplina: 'Futebol Tático',
    conteudo: 'Iniciamos com aquecimento e a atividade @CircuitoMotor. Na sequência, trabalhamos o exercício @PasseEmDupla com foco na transição rápida.',
    atividadesAnexadas: [mockAtividadesBanco[0], mockAtividadesBanco[1]],
    observacoes: 'Turma participativa.',
  },
];

export interface SlotFormData {
  nomeAula: string;
  disciplina: string;
  conteudo: string;
  atividadesAnexadas: AtividadeItem[];
  campoExperiencia: string;
  competenciaBncc: string;
  tipoAtividade: 'classe' | 'casa' | '';
  materialObrigatorio: string;
  materialOpcional: string;
}

function getWeekDays(referenceDateStr: string) {
  const refDate = new Date(referenceDateStr + 'T12:00:00');
  const dayOfWeek = refDate.getDay();
  const distanceToSeg = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(refDate);
  monday.setDate(refDate.getDate() + distanceToSeg);

  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    week.push(d.toISOString().split('T')[0]);
  }
  return week;
}

function getDaysInMonthGrid(year: number, monthZeroBased: number) {
  const firstDayOfMonth = new Date(year, monthZeroBased, 1);
  const lastDayOfMonth = new Date(year, monthZeroBased + 1, 0);

  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const daysGrid = [];

  for (let i = 0; i < startingDayOfWeek; i++) {
    daysGrid.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthZeroBased, day);
    daysGrid.push(d.toISOString().split('T')[0]);
  }

  return daysGrid;
}

interface TimeSlotRowProps {
  slotTime: string;
  selectedDate: string;
  selectedTurma: string;
  bancoAtividades: AtividadeItem[];
  aulaExistente?: AulaPlanejamento;
  formData: SlotFormData;
  isReadOnly: boolean;
  onChangeFormData: (updated: SlotFormData) => void;
  onDeleteAula: (slotTime: string) => void;
}

const TimeSlotRow: React.FC<TimeSlotRowProps> = ({
  slotTime,
  selectedDate,
  selectedTurma,
  bancoAtividades,
  aulaExistente,
  formData,
  isReadOnly,
  onChangeFormData,
  onDeleteAula,
}) => {
  const targetTurma = selectedTurma !== 'todas' ? selectedTurma : 'Sub-11 A';
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const conteudoRef = useRef<HTMLTextAreaElement>(null);

  const handleConteudoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChangeFormData({ ...formData, conteudo: val });

    const cursor = e.target.selectionStart;
    const lastChar = val.substring(cursor - 1, cursor);
    if (lastChar === '@' && bancoAtividades.length > 0) {
      setShowMentionSuggestions(true);
    } else if (!val.includes('@')) {
      setShowMentionSuggestions(false);
    }
  };

  const insertMention = (atvNome: string) => {
    const cursor = conteudoRef.current?.selectionStart || formData.conteudo.length;
    const before = formData.conteudo.substring(0, cursor);
    const after = formData.conteudo.substring(cursor);

    let updatedContent = '';
    if (before.endsWith('@')) {
      updatedContent = before + atvNome + ' ' + after;
    } else {
      updatedContent = before + ' @' + atvNome + ' ' + after;
    }

    const targetAtv = bancoAtividades.find((a) => a.nome === atvNome);
    let updatedAtividades = [...formData.atividadesAnexadas];
    if (targetAtv && !updatedAtividades.some((a) => a.id === targetAtv.id)) {
      updatedAtividades.push(targetAtv);
    }

    onChangeFormData({
      ...formData,
      conteudo: updatedContent,
      atividadesAnexadas: updatedAtividades,
    });
    setShowMentionSuggestions(false);
    toast.success(`Mencionou @${atvNome}!`);
  };

  const toggleAnexoAtividade = (atv: AtividadeItem) => {
    const exists = formData.atividadesAnexadas.some((a) => a.id === atv.id);
    if (exists) {
      onChangeFormData({
        ...formData,
        atividadesAnexadas: formData.atividadesAnexadas.filter((a) => a.id !== atv.id),
      });
    } else {
      onChangeFormData({
        ...formData,
        atividadesAnexadas: [...formData.atividadesAnexadas, atv],
      });
    }
  };

  // Se estiver no MODO LEITURA (FÁCIL LEITURA)
  if (isReadOnly) {
    const temConteudo = formData.nomeAula.trim() || formData.conteudo.trim();

    return (
      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-slate-50 p-4 border-b border-slate-200 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className="bg-slate-800 text-white font-bold px-3 py-1 text-sm flex items-center gap-1.5 shadow-sm">
              <Clock className="h-4 w-4 text-purple-400" /> {slotTime}
            </Badge>
            <Badge variant="outline" className="bg-white text-slate-700 border-slate-300 font-semibold text-xs">
              Turma: {targetTurma}
            </Badge>
          </div>

          {temConteudo ? (
            <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-xs">
              Planejamento Registrado
            </Badge>
          ) : (
            <Badge variant="outline" className="text-slate-400 border-slate-200 text-xs">
              Horário Livre
            </Badge>
          )}
        </CardHeader>

        <CardContent className="p-5 space-y-4 text-xs">
          {temConteudo ? (
            <>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  {formData.disciplina || 'Futebol Tático'}
                </span>
                <h3 className="text-base font-bold text-slate-900">{formData.nomeAula}</h3>
              </div>

              {formData.conteudo && (
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Conteúdo Ministrado:</span>
                  <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-line">
                    {formData.conteudo.split(/(@\w+)/g).map((part, idx) =>
                      part.startsWith('@') ? (
                        <span
                          key={idx}
                          className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded border border-purple-300 mx-0.5 text-xs inline-block"
                        >
                          {part}
                        </span>
                      ) : (
                        part
                      )
                    )}
                  </p>
                </div>
              )}

              {formData.atividadesAnexadas.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-700 block">Atividades e Anexos da Aula:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {formData.atividadesAnexadas.map((atv) => (
                      <div
                        key={atv.id}
                        className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-800 text-xs">@{atv.nome}</span>
                          {atv.arquivoNome && (
                            <Badge variant="outline" className="bg-slate-50 text-slate-600 gap-1 text-[10px]">
                              <Paperclip className="h-3 w-3 text-purple-600" /> PDF Anexo
                            </Badge>
                          )}
                        </div>
                        {atv.descricao && <p className="text-slate-600 text-xs">{atv.descricao}</p>}
                        {atv.arquivoNome && (
                          <div className="pt-1 text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                            <FileText className="h-3.5 w-3.5 text-slate-400" /> {atv.arquivoNome} ({atv.arquivoTamanho || 'PDF'})
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-slate-400 italic text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              Nenhum planejamento registrado para este horário.
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // MODO EDIÇÃO
  return (
    <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden transition-all hover:border-purple-300">
      <CardHeader className="bg-slate-50 p-4 border-b border-slate-200 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-purple-700 text-white font-bold px-3 py-1 text-sm flex items-center gap-1.5 shadow-sm">
            <Clock className="h-4 w-4" /> {slotTime}
          </Badge>
          <Badge variant="outline" className="bg-white text-slate-700 border-slate-300 font-semibold text-xs">
            Turma: {targetTurma}
          </Badge>
          {aulaExistente || formData.nomeAula.trim() ? (
            <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-xs">
              Status: Preenchido / Editando
            </Badge>
          ) : (
            <Badge variant="outline" className="text-slate-400 border-slate-200 text-xs">
              Status: Horário Livre (Preencha Abaixo)
            </Badge>
          )}
        </div>

        {(aulaExistente || formData.nomeAula.trim()) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteAula(slotTime)}
            className="text-slate-400 hover:text-red-600 hover:bg-red-50 text-xs gap-1"
          >
            <Trash2 className="h-4 w-4" /> Limpar Horário
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-5 space-y-4 text-xs">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-b pb-1">
          <BookOpen className="h-4 w-4 text-purple-600" />
          Dados do Planejamento ({slotTime})
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-semibold text-slate-700">Nome / Título da Aula</Label>
            <Input
              value={formData.nomeAula}
              onChange={(e) => onChangeFormData({ ...formData, nomeAula: e.target.value })}
              placeholder="Ex: Aula 01 - Transição Defensiva"
              className="h-9 text-xs mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Disciplina / Categoria</Label>
            <Input
              value={formData.disciplina}
              onChange={(e) => onChangeFormData({ ...formData, disciplina: e.target.value })}
              placeholder="Ex: Futebol Tático"
              className="h-9 text-xs mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-700">Campo de Experiência</Label>
            <Input
              value={formData.campoExperiencia}
              onChange={(e) => onChangeFormData({ ...formData, campoExperiencia: e.target.value })}
              placeholder="Ex: Escuta, fala, pensamento..."
              className="h-9 text-xs mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Competência da BNCC</Label>
            <Input
              value={formData.competenciaBncc}
              onChange={(e) => onChangeFormData({ ...formData, competenciaBncc: e.target.value })}
              placeholder="Ex: EI03EF01"
              className="h-9 text-xs mt-1"
            />
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2 space-y-3">
          <Label className="text-xs font-bold text-slate-800">Tipo de Atividade</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
              <input 
                type="radio" 
                name={`tipoAtv-${slotTime}`} 
                checked={formData.tipoAtividade === 'classe'}
                onChange={() => onChangeFormData({ ...formData, tipoAtividade: 'classe' })}
                className="text-purple-600 focus:ring-purple-500"
              /> 
              De Classe
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
              <input 
                type="radio" 
                name={`tipoAtv-${slotTime}`} 
                checked={formData.tipoAtividade === 'casa'}
                onChange={() => onChangeFormData({ ...formData, tipoAtividade: 'casa' })}
                className="text-purple-600 focus:ring-purple-500"
              /> 
              De Casa
            </label>
          </div>

          {formData.tipoAtividade === 'classe' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Material Obrigatório</Label>
                <Textarea
                  value={formData.materialObrigatorio}
                  onChange={(e) => onChangeFormData({ ...formData, materialObrigatorio: e.target.value })}
                  placeholder="Materiais essenciais..."
                  className="h-16 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Material Opcional</Label>
                <Textarea
                  value={formData.materialOpcional}
                  onChange={(e) => onChangeFormData({ ...formData, materialOpcional: e.target.value })}
                  placeholder="Materiais extras..."
                  className="h-16 text-xs mt-1"
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              Conteúdo da Aula <span className="text-slate-400 font-normal">(Digite @ para citar atividades do Banco)</span>
            </Label>
            {bancoAtividades.length > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500">Mencionar:</span>
                {bancoAtividades.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => insertMention(a.nome)}
                    className="bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold px-2 py-0.5 rounded text-[11px] transition-colors"
                  >
                    @{a.nome}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <Textarea
              ref={conteudoRef}
              value={formData.conteudo}
              onChange={handleConteudoChange}
              placeholder="Escreva o desenvolvimento da aula. Ex: Iniciamos com aquecimento e a atividade @CircuitoMotor..."
              className="h-24 text-xs"
            />

            {showMentionSuggestions && bancoAtividades.length > 0 && (
              <div className="absolute left-0 bottom-full mb-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg p-2 z-50">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Selecione para mencionar no texto:
                </span>
                <div className="space-y-1">
                  {bancoAtividades.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => insertMention(a.nome)}
                      className="w-full text-left px-2 py-1 hover:bg-purple-50 rounded text-xs text-purple-800 font-bold flex items-center justify-between"
                    >
                      <span>@{a.nome}</span>
                      {a.arquivoNome && <Paperclip className="h-3 w-3 text-slate-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Paperclip className="h-4 w-4 text-purple-600" />
              Anexar Atividades ao Final desta Aula (Selecione do Banco Acima)
            </Label>
            <span className="text-[11px] text-slate-500 font-medium">
              {formData.atividadesAnexadas.length} atividade(s) anexada(s)
            </span>
          </div>

          {bancoAtividades.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              Nenhuma atividade cadastrada no Banco acima. Cadastre atividades no topo da página para anexá-las aqui.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {bancoAtividades.map((atv) => {
                const isAnexada = formData.atividadesAnexadas.some((a) => a.id === atv.id);
                return (
                  <div
                    key={atv.id}
                    onClick={() => toggleAnexoAtividade(atv)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all select-none ${
                      isAnexada
                        ? 'bg-purple-100/60 border-purple-300 shadow-sm'
                        : 'bg-white border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-purple-800 text-xs">@{atv.nome}</span>
                        {atv.arquivoNome && (
                          <span className="flex items-center gap-1 text-slate-500 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                            <Paperclip className="h-3 w-3" /> {atv.arquivoNome}
                          </span>
                        )}
                      </div>
                      {atv.descricao && <p className="text-[11px] text-slate-500 truncate">{atv.descricao}</p>}
                    </div>

                    <div className="shrink-0">
                      {isAnexada ? (
                        <Badge className="bg-purple-600 text-white text-[10px] gap-1">
                          <Check className="h-3 w-3" /> Anexada
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 text-[10px]">
                          + Anexar
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const DiarioTab: React.FC = () => {
  const [turmasPedagogico] = useLocalStorage<TurmaPedagogica[]>(
    'escolinha_turmas_pedagogico_v1',
    DEFAULT_TURMAS_PEDAGOGICO
  );
  const [materias] = useLocalStorage<Materia[]>('escolinha_materias_v1', DEFAULT_MATERIAS);
  const [aulas, setAulas] = useLocalStorage<AulaPlanejamento[]>('escolinha_aulas_planejadas', mockAulas);
  const [bancoAtividades, setBancoAtividades] = useLocalStorage<AtividadeItem[]>(
    'escolinha_banco_atividades',
    mockAtividadesBanco
  );

  const [viewMode, setViewMode] = useState<'diario' | 'semanal' | 'mensal'>('diario');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState(
    () => turmasPedagogico[0]?.nome || '1º Ano A'
  );
  const [selectedDateFilter, setSelectedDateFilter] = useState(new Date().toISOString().split('T')[0]);

  // States de Banco de Atividades
  const [nomeNovaAtv, setNomeNovaAtv] = useState('');
  const [descNovaAtv, setDescNovaAtv] = useState('');
  const [tipoNovaAtv, setTipoNovaAtv] = useState<'classe' | 'casa'>('classe');
  const [matObrigNovaAtv, setMatObrigNovaAtv] = useState('');
  const [matOpcNovaAtv, setMatOpcNovaAtv] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ nome: string; tamanho: string; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States dos horários diários
  const [slotsState, setSlotsState] = useState<Record<string, SlotFormData>>({});

  useEffect(() => {
    const initialSlots: Record<string, SlotFormData> = {};
    ALL_TIME_SLOTS.forEach((slotTime) => {
      const existing = aulas.find(
        (a) =>
          a.horario === slotTime &&
          a.data === selectedDateFilter &&
          a.turma === (selectedTurmaFilter !== 'todas' ? selectedTurmaFilter : 'Sub-11 A')
      );
      initialSlots[slotTime] = {
        nomeAula: existing?.nomeAula || '',
        disciplina: existing?.disciplina || 'Futebol Tático',
        conteudo: existing?.conteudo || '',
        atividadesAnexadas: existing?.atividadesAnexadas || [],
        campoExperiencia: existing?.campoExperiencia || '',
        competenciaBncc: existing?.competenciaBncc || '',
        tipoAtividade: existing?.tipoAtividade || '',
        materialObrigatorio: existing?.materialObrigatorio || '',
        materialOpcional: existing?.materialOpcional || '',
      };
    });
    setSlotsState(initialSlots);
  }, [selectedDateFilter, selectedTurmaFilter, aulas]);

  const handleSlotChange = (slotTime: string, updated: SlotFormData) => {
    setSlotsState((prev) => ({
      ...prev,
      [slotTime]: updated,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const tamanhoFormatted = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
      const fakeUrl = URL.createObjectURL(file);
      setSelectedFile({
        nome: file.name,
        tamanho: tamanhoFormatted,
        url: fakeUrl,
      });
      toast.success(`Arquivo "${file.name}" anexado!`);
    }
  };

  const handleCreateAtividadeNoBanco = () => {
    if (!nomeNovaAtv.trim()) {
      toast.error('Informe o nome da atividade.');
      return;
    }

    const newAtv: AtividadeItem = {
      id: crypto.randomUUID(),
      nome: nomeNovaAtv.trim().replace(/\s+/g, ''),
      descricao: descNovaAtv.trim() || undefined,
      arquivoNome: selectedFile?.nome,
      arquivoTamanho: selectedFile?.tamanho,
      arquivoUrl: selectedFile?.url,
      tipo: tipoNovaAtv,
      materialObrigatorio: tipoNovaAtv === 'classe' ? matObrigNovaAtv.trim() : undefined,
      materialOpcional: tipoNovaAtv === 'classe' ? matOpcNovaAtv.trim() : undefined,
    };

    setBancoAtividades([...bancoAtividades, newAtv]);
    toast.success(`Atividade @${newAtv.nome} cadastrada no Banco de Atividades!`);

    setNomeNovaAtv('');
    setDescNovaAtv('');
    setTipoNovaAtv('classe');
    setMatObrigNovaAtv('');
    setMatOpcNovaAtv('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteAtividadeDoBanco = (id: string) => {
    setBancoAtividades(bancoAtividades.filter((a) => a.id !== id));
    toast.success('Atividade removida do banco.');
  };

  const handleDeleteAula = (slotTime: string) => {
    setAulas(
      aulas.filter(
        (a) =>
          !(
            a.horario === slotTime &&
            a.data === selectedDateFilter &&
            a.turma === (selectedTurmaFilter !== 'todas' ? selectedTurmaFilter : 'Sub-11 A')
          )
      )
    );
    setSlotsState((prev) => ({
      ...prev,
      [slotTime]: {
        nomeAula: '',
        disciplina: 'Futebol Tático',
        conteudo: '',
        atividadesAnexadas: [],
        campoExperiencia: '',
        competenciaBncc: '',
        tipoAtividade: '',
        materialObrigatorio: '',
        materialOpcional: '',
      },
    }));
    toast.success(`Horário ${slotTime} limpo.`);
  };

  const handleSaveAllSlots = () => {
    const targetTurma = selectedTurmaFilter !== 'todas' ? selectedTurmaFilter : 'Sub-11 A';
    let countSaved = 0;
    let updatedAulas = [...aulas];

    ALL_TIME_SLOTS.forEach((slotTime) => {
      const slotData = slotsState[slotTime];
      if (slotData && slotData.nomeAula.trim()) {
        const existingIndex = updatedAulas.findIndex(
          (a) => a.horario === slotTime && a.data === selectedDateFilter && a.turma === targetTurma
        );

        const newAula: AulaPlanejamento = {
          id: existingIndex >= 0 ? updatedAulas[existingIndex].id : crypto.randomUUID(),
          data: selectedDateFilter,
          horario: slotTime,
          turma: targetTurma,
          nomeAula: slotData.nomeAula,
          disciplina: slotData.disciplina || 'Futebol Tático',
          conteudo: slotData.conteudo,
          atividadesAnexadas: slotData.atividadesAnexadas,
          campoExperiencia: slotData.campoExperiencia,
          competenciaBncc: slotData.competenciaBncc,
          tipoAtividade: slotData.tipoAtividade,
          materialObrigatorio: slotData.materialObrigatorio,
          materialOpcional: slotData.materialOpcional,
        };

        if (existingIndex >= 0) {
          updatedAulas[existingIndex] = newAula;
        } else {
          updatedAulas.push(newAula);
        }
        countSaved++;
      }
    });

    setAulas(updatedAulas);

    if (countSaved > 0) {
      toast.success(
        `Sucesso! ${countSaved} horário(s) salvo(s) para o dia ${formatDate(selectedDateFilter)}!`
      );
    } else {
      toast.error('Preencha ao menos o nome de uma aula para salvar.');
    }
  };

  const weekDays = getWeekDays(selectedDateFilter);
  const refDateObj = new Date(selectedDateFilter + 'T12:00:00');
  const currentMonthDays = getDaysInMonthGrid(refDateObj.getFullYear(), refDateObj.getMonth());

  const daysOfWeekLabels = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  const handleSelectDateFromCalendar = (dateStr: string) => {
    setSelectedDateFilter(dateStr);
    setViewMode('diario');
    toast.info(`Visualizando dia ${formatDate(dateStr)}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* CONTROLE HÉROE & SELETOR DE MODO (EDIÇÃO VS FÁCIL LEITURA) */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden">
        {/* Toggle de Modos de Visão (Diário, Semanal, Mensal) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 w-full lg:w-auto">
          <Button
            variant={viewMode === 'diario' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('diario')}
            className={`text-xs font-semibold gap-1.5 flex-1 lg:flex-initial ${
              viewMode === 'diario' ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            <Clock className="h-3.5 w-3.5" /> Visão Diária
          </Button>

          <Button
            variant={viewMode === 'semanal' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('semanal')}
            className={`text-xs font-semibold gap-1.5 flex-1 lg:flex-initial ${
              viewMode === 'semanal' ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Visão Semanal
          </Button>

          <Button
            variant={viewMode === 'mensal' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('mensal')}
            className={`text-xs font-semibold gap-1.5 flex-1 lg:flex-initial ${
              viewMode === 'mensal' ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            <CalendarIcon className="h-3.5 w-3.5" /> Visão Mensal
          </Button>
        </div>

        {/* MODO FÁCIL LEITURA VS EDIÇÃO TOGGLE */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <Button
              variant={!isReadOnly ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setIsReadOnly(false)}
              className={`text-xs font-semibold gap-1.5 ${
                !isReadOnly ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" /> Edição
            </Button>
            <Button
              variant={isReadOnly ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setIsReadOnly(true)}
              className={`text-xs font-semibold gap-1.5 ${
                isReadOnly ? 'bg-purple-700 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              <Eye className="h-3.5 w-3.5" /> Fácil Leitura (Sem Edição)
            </Button>
          </div>

          <div data-tour="seletor-turma-diario" className="flex items-center gap-2">
            <Select value={selectedTurmaFilter} onValueChange={setSelectedTurmaFilter}>
              <SelectTrigger className="w-[180px] h-9 text-xs font-medium">
                <SelectValue placeholder="Turma" />
              </SelectTrigger>
              <SelectContent>
                {turmasPedagogico.map((t) => (
                  <SelectItem key={t.id} value={t.nome}>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="w-[140px] h-9 text-xs"
            />
          </div>
        </div>
      </div>

      {/* BANCO DE ATIVIDADES (EXIBIDO APENAS NA VISÃO DIÁRIA) */}
      {!isReadOnly && viewMode === 'diario' ? (
        <Card className="bg-purple-50/50 border-purple-200 shadow-sm rounded-xl">
          <CardHeader className="p-4 border-b border-purple-100 flex flex-row items-center justify-between bg-purple-100/40 rounded-t-xl">
            <div className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-purple-400" />
              <div>
                <CardTitle className="text-sm font-bold text-purple-950">
                  1. Banco de Atividades (Criadas no Começo)
                </CardTitle>
                <p className="text-xs text-purple-600/80">
                  Cadastre exercícios com anexos PDF. Depois, anexe ou mencione-as nos planejamentos.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3.5 rounded-lg border border-purple-100 shadow-sm">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Nome da Atividade *</Label>
                <Input
                  value={nomeNovaAtv}
                  onChange={(e) => setNomeNovaAtv(e.target.value)}
                  placeholder="Ex: CircuitoMotor, PasseEmDupla"
                  className="h-9 text-xs mt-1 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-purple-500"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Arquivo Anexo (PDF, Doc, Imagem)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 text-xs gap-1.5 w-full bg-white hover:bg-purple-50 text-purple-700 border-purple-200"
                  >
                    <FileUp className="h-3.5 w-3.5 text-purple-400" />
                    {selectedFile ? 'Trocar Arquivo PDF' : 'Upload de Arquivo (PDF)'}
                  </Button>
                </div>
              </div>

              <div className="md:col-span-2">
                <Label className="text-xs font-semibold text-slate-700">Descrição / Instruções da Atividade</Label>
                <Input
                  value={descNovaAtv}
                  onChange={(e) => setDescNovaAtv(e.target.value)}
                  placeholder="Detalhes ou regras da atividade..."
                  className="h-9 text-xs mt-1 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-purple-500"
                />
              </div>

              <div className="md:col-span-2 bg-purple-50/70 p-3 rounded-lg border border-purple-200 space-y-3">
                <Label className="text-xs font-bold text-purple-900 block">Tipo de Atividade (Banco)</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                    <input 
                      type="radio" 
                      name="tipoNovaAtv" 
                      checked={tipoNovaAtv === 'classe'}
                      onChange={() => setTipoNovaAtv('classe')}
                      className="text-purple-500 focus:ring-purple-500"
                    /> 
                    De Classe
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                    <input 
                      type="radio" 
                      name="tipoNovaAtv" 
                      checked={tipoNovaAtv === 'casa'}
                      onChange={() => setTipoNovaAtv('casa')}
                      className="text-purple-500 focus:ring-purple-500"
                    /> 
                    De Casa
                  </label>
                </div>

                {tipoNovaAtv === 'classe' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <div>
                      <Label className="text-xs font-medium text-slate-700">Material Obrigatório</Label>
                      <Textarea
                        value={matObrigNovaAtv}
                        onChange={(e) => setMatObrigNovaAtv(e.target.value)}
                        placeholder="Materiais essenciais..."
                        className="h-14 text-xs mt-1 bg-white border-slate-200 text-slate-800"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-700">Material Opcional</Label>
                      <Textarea
                        value={matOpcNovaAtv}
                        onChange={(e) => setMatOpcNovaAtv(e.target.value)}
                        placeholder="Materiais extras..."
                        className="h-14 text-xs mt-1 bg-white border-slate-200 text-slate-800"
                      />
                    </div>
                  </div>
                )}
              </div>

              {selectedFile && (
                <div className="md:col-span-2 flex items-center justify-between bg-purple-950/80 text-purple-200 px-3 py-1.5 rounded text-xs border border-purple-800">
                  <span className="flex items-center gap-2 font-medium truncate">
                    <FileText className="h-4 w-4 text-purple-400 shrink-0" />
                    {selectedFile.nome} ({selectedFile.tamanho})
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-purple-400 hover:text-red-400"
                    onClick={() => setSelectedFile(null)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              <div className="md:col-span-2 flex justify-end">
                <Button
                  type="button"
                  onClick={handleCreateAtividadeNoBanco}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 font-bold px-4"
                >
                  <Plus className="h-4 w-4" /> Cadastrar no Banco de Atividades
                </Button>
              </div>
            </div>

            {bancoAtividades.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-purple-950 block mt-2">
                  Atividades no Banco ({bancoAtividades.length}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {bancoAtividades.map((atv) => (
                    <div
                      key={atv.id}
                      className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-purple-200 text-xs shadow-sm hover:border-purple-300 transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
                            @{atv.nome}
                          </span>
                          {atv.arquivoNome && (
                            <span className="flex items-center gap-1 text-purple-800 text-[10px] bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded truncate">
                              <Paperclip className="h-3 w-3 text-purple-400" /> {atv.arquivoNome}
                            </span>
                          )}
                        </div>
                        {atv.descricao && <p className="text-slate-600 text-[11px] truncate">{atv.descricao}</p>}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteAtividadeDoBanco(atv.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* MODO FÁCIL LEITURA - BANCO DE REFERÊNCIA RESUMIDO */
        <div className="bg-purple-100/70 text-purple-950 border border-purple-200 p-4 rounded-xl flex items-center justify-between shadow-sm print:hidden">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-purple-700 shrink-0" />
            <div>
              <h4 className="text-sm font-bold">Modo de Fácil Leitura (Visualização Limpa)</h4>
              <p className="text-xs text-purple-800/80">
                Visualizando planejamentos da turma <strong>{selectedTurmaFilter}</strong> do dia{' '}
                <strong>{formatDate(selectedDateFilter)}</strong> sem campos de edição.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs bg-purple-800 border-purple-700 text-white hover:bg-purple-700 gap-1.5 hidden sm:flex"
          >
            <Printer className="h-4 w-4" /> Imprimir Planejamento
          </Button>
        </div>
      )}

      {/* CONDICIONAL: VISÃO DIÁRIA (FIXA DE TODOS OS HORÁRIOS DA TURMA) */}
      {viewMode === 'diario' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-purple-600" />
              Planejamento Diário ({selectedTurmaFilter}) —{' '}
              <span className="text-slate-500 font-normal">
                {formatDate(selectedDateFilter)}
              </span>
            </h3>
          </div>

          <div className="flex flex-col space-y-6">
            {ALL_TIME_SLOTS.map((slotTime) => {
              const aulaExistente = aulas.find(
                (a) =>
                  a.horario === slotTime &&
                  a.data === selectedDateFilter &&
                  a.turma === (selectedTurmaFilter !== 'todas' ? selectedTurmaFilter : 'Sub-11 A')
              );
              const slotFormData: SlotFormData = slotsState[slotTime] || {
                nomeAula: '',
                disciplina: 'Futebol Tático',
                conteudo: '',
                atividadesAnexadas: [],
                campoExperiencia: '',
                competenciaBncc: '',
                tipoAtividade: '',
                materialObrigatorio: '',
                materialOpcional: '',
              };

              return (
                <TimeSlotRow
                  key={slotTime}
                  slotTime={slotTime}
                  selectedDate={selectedDateFilter}
                  selectedTurma={selectedTurmaFilter}
                  bancoAtividades={bancoAtividades}
                  aulaExistente={aulaExistente}
                  formData={slotFormData}
                  isReadOnly={isReadOnly}
                  onChangeFormData={(updated) => handleSlotChange(slotTime, updated)}
                  onDeleteAula={handleDeleteAula}
                />
              );
            })}
          </div>

          {/* BOTÃO MESTRE NO FINAL DA PÁGINA (SOMENTE EM MODO EDIÇÃO) */}
          {!isReadOnly && (
            <div className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-xl border-2 border-purple-300 shadow-xl bg-gradient-to-r from-purple-50/50 to-white">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-800 font-bold text-sm">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    Concluir Planejamento Diário ({selectedTurmaFilter})
                  </div>
                  <p className="text-xs text-slate-500">
                    Clique no botão ao lado para salvar as alterações de <strong>todos os horários de uma só vez</strong>.
                  </p>
                </div>

                <Button
                  onClick={handleSaveAllSlots}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm gap-2.5 px-8 py-3.5 h-auto shadow-lg hover:scale-[1.02] transition-all w-full sm:w-auto"
                >
                  <CheckCircle2 className="h-5 w-5" /> Salvar Todos os Horários do Dia
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONDICIONAL: VISÃO SEMANAL */}
      {viewMode === 'semanal' && (
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-purple-600" />
                Calendário Semanal — {selectedTurmaFilter}
              </h3>
              <p className="text-xs text-slate-500">
                Semana de {formatDate(weekDays[0])} a{' '}
                {formatDate(weekDays[6])}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const prevWeekDate = new Date(selectedDateFilter + 'T12:00:00');
                prevWeekDate.setDate(prevWeekDate.getDate() - 7);
                setSelectedDateFilter(prevWeekDate.toISOString().split('T')[0]);
              }}
              className="text-xs gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Semana Anterior
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weekDays.map((dayStr, index) => {
              const dayDateObj = new Date(dayStr + 'T12:00:00');
              const isSelectedDay = dayStr === selectedDateFilter;
              const aulasDoDia = aulas.filter(
                (a) => a.data === dayStr && (selectedTurmaFilter === 'todas' || a.turma === selectedTurmaFilter)
              );

              return (
                <div
                  key={dayStr}
                  onClick={() => handleSelectDateFromCalendar(dayStr)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2 select-none ${
                    isSelectedDay
                      ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-500/20 shadow-md'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-purple-300 shadow-sm'
                  }`}
                >
                  <div className="border-b pb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 block">{daysOfWeekLabels[index]}</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isSelectedDay ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {dayDateObj.getDate()}
                    </span>
                  </div>

                  <div className="space-y-1.5 min-h-[140px]">
                    {ALL_TIME_SLOTS.map((slot) => {
                      const aulaSlot = aulasDoDia.find((a) => a.horario === slot);
                      return (
                        <div
                          key={slot}
                          className={`p-1.5 rounded text-[11px] border ${
                            aulaSlot
                              ? 'bg-purple-100/80 border-purple-300 text-purple-900 font-medium'
                              : 'bg-white/80 border-dashed border-slate-200 text-slate-400'
                          }`}
                        >
                          <span className="font-semibold block text-[10px]">{slot.split(' - ')[0]}</span>
                          {aulaSlot ? (
                            <span className="truncate block font-bold text-purple-950">{aulaSlot.nomeAula}</span>
                          ) : (
                            <span className="text-slate-700 italic text-[10px]">Livre</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-1 text-center">
                    <span className="text-[10px] font-bold text-purple-700 hover:underline">
                      {isSelectedDay ? 'Visualizando Hoje →' : 'Abrir Horários'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* CONDICIONAL: VISÃO MENSAL */}
      {viewMode === 'mensal' && (
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-purple-600" />
                Calendário Mensal — {monthNames[refDateObj.getMonth()]} de {refDateObj.getFullYear()}
              </h3>
              <p className="text-xs text-slate-500">
                Visualize os dias com planejamentos e clique em qualquer data para abrir o planejamento do dia.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const prevMonthDate = new Date(refDateObj.getFullYear(), refDateObj.getMonth() - 1, 1);
                  setSelectedDateFilter(prevMonthDate.toISOString().split('T')[0]);
                }}
                className="text-xs gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Mês Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const nextMonthDate = new Date(refDateObj.getFullYear(), refDateObj.getMonth() + 1, 1);
                  setSelectedDateFilter(nextMonthDate.toISOString().split('T')[0]);
                }}
                className="text-xs gap-1"
              >
                Próximo Mês <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center font-bold text-xs text-slate-600 bg-slate-100 p-2 rounded-lg">
            <span>Dom</span>
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {currentMonthDays.map((dayStr, idx) => {
              if (!dayStr) {
                return <div key={`empty-${idx}`} className="h-24 bg-slate-50/30 rounded-lg border border-dashed border-slate-100" />;
              }

              const dayDateObj = new Date(dayStr + 'T12:00:00');
              const isSelectedDay = dayStr === selectedDateFilter;
              const aulasDoDia = aulas.filter(
                (a) => a.data === dayStr && (selectedTurmaFilter === 'todas' || a.turma === selectedTurmaFilter)
              );

              return (
                <div
                  key={dayStr}
                  onClick={() => handleSelectDateFromCalendar(dayStr)}
                  className={`h-24 p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                    isSelectedDay
                      ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-500/20 shadow-md'
                      : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isSelectedDay ? 'bg-purple-600 text-white' : 'text-slate-700'
                      }`}
                    >
                      {dayDateObj.getDate()}
                    </span>

                    {aulasDoDia.length > 0 && (
                      <Badge className="bg-purple-600 text-white text-[10px] px-1.5 py-0">
                        {aulasDoDia.length} aula(s)
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    {aulasDoDia.slice(0, 2).map((a) => (
                      <div
                        key={a.id}
                        className="bg-purple-100 text-purple-900 text-[10px] px-1 py-0.5 rounded truncate font-semibold"
                      >
                        {a.horario.split(' - ')[0]} {a.nomeAula}
                      </div>
                    ))}
                    {aulasDoDia.length > 2 && (
                      <span className="text-[10px] text-slate-400 font-medium block text-center">
                        +{aulasDoDia.length - 2} mais
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
