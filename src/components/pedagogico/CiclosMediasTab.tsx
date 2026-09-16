import React, { useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  ConfiguracaoAcademica,
  CicloLetivo,
  DEFAULT_CONFIG_ACADEMICA,
} from '@/types/pedagogico';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CalendarRange,
  Calculator,
  Award,
  Sparkles,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Trash2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

export const CiclosMediasTab: React.FC = () => {
  const [config, setConfig] = useLocalStorage<ConfiguracaoAcademica>(
    'escolinha_config_academica_v1',
    DEFAULT_CONFIG_ACADEMICA
  );

  // Estados locais para edição
  const [modalidade, setModalidade] = useState(config.modalidade);
  const [ciclos, setCiclos] = useState<CicloLetivo[]>(config.ciclos);

  // Média Parcial
  const [nomePublicoParcial, setNomePublicoParcial] = useState(config.mediaParcial.nomePublico);
  const [tipoCalculoParcial, setTipoCalculoParcial] = useState(config.mediaParcial.tipoCalculo);
  const [notaMetaParcial, setNotaMetaParcial] = useState(config.mediaParcial.notaMeta);
  const [pesosAvaliacoes, setPesosAvaliacoes] = useState(config.mediaParcial.pesosAvaliacoes);

  // Média Final
  const [nomePublicoFinal, setNomePublicoFinal] = useState(config.mediaFinal.nomePublico);
  const [tipoCalculoFinal, setTipoCalculoFinal] = useState(config.mediaFinal.tipoCalculo);
  const [notaAprovacaoDireta, setNotaAprovacaoDireta] = useState(config.mediaFinal.notaAprovacaoDireta);
  const [notaMinimaExame, setNotaMinimaExame] = useState(config.mediaFinal.notaMinimaExame);
  const [notaAprovacaoExame, setNotaAprovacaoExame] = useState(config.mediaFinal.notaAprovacaoExame);

  // Simulador de Médias
  const [simuladorCiclosNotas, setSimuladorCiclosNotas] = useState<Record<string, number>>({
    b1: 7.5,
    b2: 6.0,
    b3: 8.0,
    b4: 7.0,
  });
  const [simuladorNotaExame, setSimuladorNotaExame] = useState<number>(6.0);

  // Alteração de modalidade pré-configurada
  const handleModalidadeChange = (novaModalidade: ConfiguracaoAcademica['modalidade']) => {
    setModalidade(novaModalidade);

    if (novaModalidade === 'bimestral') {
      setCiclos([
        { id: 'b1', numero: 1, nomePublico: '1º Bimestre', peso: 1, dataInicio: '2026-02-01', dataFim: '2026-04-15' },
        { id: 'b2', numero: 2, nomePublico: '2º Bimestre', peso: 1, dataInicio: '2026-04-16', dataFim: '2026-06-30' },
        { id: 'b3', numero: 3, nomePublico: '3º Bimestre', peso: 1, dataInicio: '2026-08-01', dataFim: '2026-09-30' },
        { id: 'b4', numero: 4, nomePublico: '4º Bimestre', peso: 1, dataInicio: '2026-10-01', dataFim: '2026-12-15' },
      ]);
      setNomePublicoParcial('Média Bimestral');
    } else if (novaModalidade === 'trimestral') {
      setCiclos([
        { id: 't1', numero: 1, nomePublico: '1º Trimestre', peso: 1, dataInicio: '2026-02-01', dataFim: '2026-05-15' },
        { id: 't2', numero: 2, nomePublico: '2º Trimestre', peso: 1, dataInicio: '2026-05-16', dataFim: '2026-08-31' },
        { id: 't3', numero: 3, nomePublico: '3º Trimestre', peso: 1, dataInicio: '2026-09-01', dataFim: '2026-12-15' },
      ]);
      setNomePublicoParcial('Média Trimestral');
    } else if (novaModalidade === 'semestral') {
      setCiclos([
        { id: 's1', numero: 1, nomePublico: '1º Semestre', peso: 1, dataInicio: '2026-02-01', dataFim: '2026-06-30' },
        { id: 's2', numero: 2, nomePublico: '2º Semestre', peso: 1, dataInicio: '2026-08-01', dataFim: '2026-12-15' },
      ]);
      setNomePublicoParcial('Média Semestral');
    }
  };

  const handleNomeCicloChange = (id: string, novoNome: string) => {
    setCiclos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, nomePublico: novoNome } : c))
    );
  };

  const handlePesoCicloChange = (id: string, novoPeso: number) => {
    setCiclos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, peso: Math.max(1, novoPeso) } : c))
    );
  };

  const handleAddCicloCustom = () => {
    const nextNum = ciclos.length + 1;
    const novoCiclo: CicloLetivo = {
      id: `ciclo-${Date.now()}`,
      numero: nextNum,
      nomePublico: `${nextNum}º Ciclo Letivo`,
      peso: 1,
    };
    setCiclos((prev) => [...prev, novoCiclo]);
  };

  const handleRemoveCicloCustom = (id: string) => {
    if (ciclos.length <= 1) {
      toast.error('O ano deve conter pelo menos 1 ciclo letivo.');
      return;
    }
    setCiclos((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSaveAll = () => {
    const novaConfig: ConfiguracaoAcademica = {
      modalidade,
      quantidadeCiclos: ciclos.length,
      ciclos,
      mediaParcial: {
        nomePublico: nomePublicoParcial.trim() || 'Média Parcial',
        tipoCalculo: tipoCalculoParcial,
        notaMeta: Number(notaMetaParcial) || 7.0,
        pesosAvaliacoes,
      },
      mediaFinal: {
        nomePublico: nomePublicoFinal.trim() || 'Média Final Anual',
        tipoCalculo: tipoCalculoFinal,
        notaAprovacaoDireta: Number(notaAprovacaoDireta) || 7.0,
        notaMinimaExame: Number(notaMinimaExame) || 4.0,
        formulaExame: 'media_aritmetica_exame',
        notaAprovacaoExame: Number(notaAprovacaoExame) || 5.0,
      },
    };

    setConfig(novaConfig);
    toast.success('Parâmetros acadêmicos e fórmulas de médias salvos com sucesso!');
  };

  const handleResetDefaults = () => {
    if (window.confirm('Deseja restaurar as configurações padrão (Bimestral, aprovação 7.0)?')) {
      setConfig(DEFAULT_CONFIG_ACADEMICA);
      setModalidade(DEFAULT_CONFIG_ACADEMICA.modalidade);
      setCiclos(DEFAULT_CONFIG_ACADEMICA.ciclos);
      setNomePublicoParcial(DEFAULT_CONFIG_ACADEMICA.mediaParcial.nomePublico);
      setTipoCalculoParcial(DEFAULT_CONFIG_ACADEMICA.mediaParcial.tipoCalculo);
      setNotaMetaParcial(DEFAULT_CONFIG_ACADEMICA.mediaParcial.notaMeta);
      setPesosAvaliacoes(DEFAULT_CONFIG_ACADEMICA.mediaParcial.pesosAvaliacoes);
      setNomePublicoFinal(DEFAULT_CONFIG_ACADEMICA.mediaFinal.nomePublico);
      setTipoCalculoFinal(DEFAULT_CONFIG_ACADEMICA.mediaFinal.tipoCalculo);
      setNotaAprovacaoDireta(DEFAULT_CONFIG_ACADEMICA.mediaFinal.notaAprovacaoDireta);
      setNotaMinimaExame(DEFAULT_CONFIG_ACADEMICA.mediaFinal.notaMinimaExame);
      setNotaAprovacaoExame(DEFAULT_CONFIG_ACADEMICA.mediaFinal.notaAprovacaoExame);
      toast.info('Configurações acadêmicas restauradas para o padrão.');
    }
  };

  // Cálculo simulado da Média Anual
  const calcularMediaAnualSimulada = () => {
    if (ciclos.length === 0) return 0;
    let soma = 0;
    let somaPesos = 0;

    ciclos.forEach((c) => {
      const nota = simuladorCiclosNotas[c.id] ?? 7.0;
      const peso = tipoCalculoFinal === 'ponderada' ? c.peso : 1;
      soma += nota * peso;
      somaPesos += peso;
    });

    const media = somaPesos > 0 ? soma / somaPesos : 0;
    return Number(media.toFixed(2));
  };

  const mediaAnualSimulada = calcularMediaAnualSimulada();
  const precisaExame = mediaAnualSimulada >= notaMinimaExame && mediaAnualSimulada < notaAprovacaoDireta;
  const reprovadoDireto = mediaAnualSimulada < notaMinimaExame;
  const mediaPosExame = Number(((mediaAnualSimulada + simuladorNotaExame) / 2).toFixed(2));
  const aprovadoPosExame = precisaExame && mediaPosExame >= notaAprovacaoExame;

  return (
    <div className="space-y-6">
      {/* Cabeçalho de Ações e Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 border rounded-xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calculator className="text-purple-600" size={22} />
            Ciclos Letivos e Parâmetros de Médias
          </h2>
          <p className="text-xs text-slate-500">
            Configure a quantidade de ciclos letivos, nomes públicos oficiais e regras de cálculo de média parcial e anual.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleResetDefaults} className="text-xs text-slate-600">
            <RotateCcw size={14} className="mr-1.5" /> Restaurar Padrões
          </Button>
          <Button size="sm" onClick={handleSaveAll} className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
            <Save size={14} className="mr-1.5" /> Salvar Configurações
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel Esquerdo: Ciclos e Médias (2 Colunas) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Modalidade e Ciclos Letivos */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                    <CalendarRange className="text-purple-600" size={18} />
                    1. Ciclos Letivos do Ano
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Escolha a divisão do ano letivo e personalize o nome público de cada etapa.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-purple-700 border-purple-300">
                  {ciclos.length} Períodos
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                {[
                  { id: 'bimestral', label: 'Bimestral (4)', desc: '4 bimestres' },
                  { id: 'trimestral', label: 'Trimestral (3)', desc: '3 trimestres' },
                  { id: 'semestral', label: 'Semestral (2)', desc: '2 semestres' },
                  { id: 'personalizado', label: 'Personalizado', desc: 'Customizado' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleModalidadeChange(m.id as any)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      modalidade === m.id
                        ? 'border-purple-600 bg-purple-50/70 text-purple-900 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{m.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>

              {/* Lista dos Ciclos com Nome Público */}
              <div className="space-y-2.5 pt-2 border-t">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Etapa / Ciclo</span>
                  <span>Nome Público no Boletim</span>
                  {tipoCalculoFinal === 'ponderada' && <span>Peso Anual</span>}
                </div>

                {ciclos.map((c, idx) => (
                  <div key={c.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-800 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>

                    <div className="flex-1">
                      <Input
                        value={c.nomePublico}
                        onChange={(e) => handleNomeCicloChange(c.id, e.target.value)}
                        placeholder={`Nome público do ciclo ${idx + 1}`}
                        className="h-8 text-xs bg-white"
                      />
                    </div>

                    {tipoCalculoFinal === 'ponderada' && (
                      <div className="w-20">
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={c.peso}
                          onChange={(e) => handlePesoCicloChange(c.id, Number(e.target.value))}
                          className="h-8 text-xs bg-white text-center"
                          title="Peso no cálculo da média final"
                        />
                      </div>
                    )}

                    {modalidade === 'personalizado' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                        onClick={() => handleRemoveCicloCustom(c.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                ))}

                {modalidade === 'personalizado' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCicloCustom}
                    className="w-full text-xs text-purple-700 border-purple-200 hover:bg-purple-50 mt-2"
                  >
                    <Plus size={14} className="mr-1.5" /> Adicionar Mais um Ciclo
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 2. Regras de Cálculo da Média Parcial (Ciclo) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                <Calculator className="text-blue-600" size={18} />
                2. Cálculo da Média Parcial ({nomePublicoParcial})
              </CardTitle>
              <CardDescription className="text-xs">
                Como será calculada a nota final de cada ciclo (ex: avaliações, trabalhos e provas daquele período).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Nome Público da Média</Label>
                  <Input
                    value={nomePublicoParcial}
                    onChange={(e) => setNomePublicoParcial(e.target.value)}
                    placeholder="Ex: Média Bimestral"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tipo de Cálculo</Label>
                  <Select
                    value={tipoCalculoParcial}
                    onValueChange={(val: any) => setTipoCalculoParcial(val)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aritmetica">Média Aritmética Simples</SelectItem>
                      <SelectItem value="ponderada">Média Ponderada por Tipo</SelectItem>
                      <SelectItem value="somatoria">Soma Direta de Pontos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Meta de Aprovação no Ciclo</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={10}
                    value={notaMetaParcial}
                    onChange={(e) => setNotaMetaParcial(Number(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {tipoCalculoParcial === 'ponderada' && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-2">
                  <div className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                    <Info size={14} /> Pesos por Categoria de Avaliação:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-[11px] text-slate-600">Provas:</span>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={pesosAvaliacoes.prova}
                        onChange={(e) =>
                          setPesosAvaliacoes({ ...pesosAvaliacoes, prova: Number(e.target.value) })
                        }
                        className="h-7 text-xs mt-0.5 bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-600">Trabalhos:</span>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={pesosAvaliacoes.trabalho}
                        onChange={(e) =>
                          setPesosAvaliacoes({ ...pesosAvaliacoes, trabalho: Number(e.target.value) })
                        }
                        className="h-7 text-xs mt-0.5 bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-600">Participação:</span>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={pesosAvaliacoes.participacao}
                        onChange={(e) =>
                          setPesosAvaliacoes({ ...pesosAvaliacoes, participacao: Number(e.target.value) })
                        }
                        className="h-7 text-xs mt-0.5 bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-600">Prática/Diário:</span>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={pesosAvaliacoes.pratica}
                        onChange={(e) =>
                          setPesosAvaliacoes({ ...pesosAvaliacoes, pratica: Number(e.target.value) })
                        }
                        className="h-7 text-xs mt-0.5 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Regras de Cálculo da Média Final Anual */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                <Award className="text-emerald-600" size={18} />
                3. Cálculo da Média Final Anual e Regras de Aprovação
              </CardTitle>
              <CardDescription className="text-xs">
                Critérios de aprovação direta, exame final/recuperação e aprovação pós-exame.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Nome Público da Média Final</Label>
                  <Input
                    value={nomePublicoFinal}
                    onChange={(e) => setNomePublicoFinal(e.target.value)}
                    placeholder="Ex: Média Final Anual"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Forma de Composição dos Ciclos</Label>
                  <Select
                    value={tipoCalculoFinal}
                    onValueChange={(val: any) => setTipoCalculoFinal(val)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aritmetica">Média Aritmética Simples dos Ciclos</SelectItem>
                      <SelectItem value="ponderada">Média Ponderada (usando pesos dos ciclos)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                  <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 size={15} /> Aprovação Direta
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-1">Nota mínima sem exame:</p>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={10}
                    value={notaAprovacaoDireta}
                    onChange={(e) => setNotaAprovacaoDireta(Number(e.target.value))}
                    className="h-8 text-xs mt-1.5 bg-white font-bold text-emerald-800"
                  />
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle size={15} /> Direito a Exame Final
                  </div>
                  <p className="text-[11px] text-amber-700 mt-1">Média mínima para ir para exame:</p>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={10}
                    value={notaMinimaExame}
                    onChange={(e) => setNotaMinimaExame(Number(e.target.value))}
                    className="h-8 text-xs mt-1.5 bg-white font-bold text-amber-800"
                  />
                </div>

                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg">
                  <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Award size={15} /> Aprovação Pós-Exame
                  </div>
                  <p className="text-[11px] text-indigo-700 mt-1">(Média Anual + Exame) / 2 ≥</p>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={10}
                    value={notaAprovacaoExame}
                    onChange={(e) => setNotaAprovacaoExame(Number(e.target.value))}
                    className="h-8 text-xs mt-1.5 bg-white font-bold text-indigo-800"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Painel Direito: Simulador de Médias em Tempo Real */}
        <div className="space-y-6">
          <Card className="border-purple-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 pb-3 rounded-t-xl">
              <CardTitle className="text-sm flex items-center gap-2 text-purple-900">
                <Sparkles className="text-purple-600" size={16} />
                Simulador de Médias em Tempo Real
              </CardTitle>
              <CardDescription className="text-xs text-purple-700">
                Teste notas hipotéticas para validar como as regras configuradas se comportam.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Notas dos Ciclos:</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ciclos.map((c) => (
                    <div key={c.id} className="p-2 bg-slate-50 border rounded-md">
                      <span className="text-[10px] text-slate-500 font-semibold block truncate">
                        {c.nomePublico}
                      </span>
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
                        max={10}
                        value={simuladorCiclosNotas[c.id] ?? 7.0}
                        onChange={(e) =>
                          setSimuladorCiclosNotas({
                            ...simuladorCiclosNotas,
                            [c.id]: Number(e.target.value),
                          })
                        }
                        className="h-7 text-xs mt-1 bg-white font-semibold"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Resultado da Média Anual */}
              <div className="p-3 bg-slate-100 rounded-lg border flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-600 font-medium block">
                    {nomePublicoFinal}:
                  </span>
                  <div className="text-2xl font-black text-slate-800">
                    {mediaAnualSimulada.toFixed(1)}
                  </div>
                </div>

                <div>
                  {mediaAnualSimulada >= notaAprovacaoDireta ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1">
                      <CheckCircle2 size={13} className="mr-1" /> Aprovado Direto
                    </Badge>
                  ) : precisaExame ? (
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-1">
                      <AlertTriangle size={13} className="mr-1" /> Exame / Recup.
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-1">
                      <XCircle size={13} className="mr-1" /> Reprovado Direto
                    </Badge>
                  )}
                </div>
              </div>

              {/* Se foi para Exame Final */}
              {precisaExame && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">Nota do Exame Final:</span>
                    <Input
                      type="number"
                      step="0.1"
                      min={0}
                      max={10}
                      value={simuladorNotaExame}
                      onChange={(e) => setSimuladorNotaExame(Number(e.target.value))}
                      className="w-16 h-7 text-xs bg-white text-center font-bold"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200">
                    <span className="text-amber-800">Média pós-exame: <strong>{mediaPosExame.toFixed(1)}</strong></span>
                    {aprovadoPosExame ? (
                      <Badge className="bg-emerald-600 text-white text-[10px]">Aprovado</Badge>
                    ) : (
                      <Badge className="bg-rose-600 text-white text-[10px]">Reprovado</Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-dashed leading-relaxed">
                ℹ️ <strong>Critérios em vigor:</strong>
                <br />• Aprovação direta: nota ≥ {notaAprovacaoDireta}
                <br />• Exame final: entre {notaMinimaExame} e {(notaAprovacaoDireta - 0.1).toFixed(1)}
                <br />• Reprovação: nota &lt; {notaMinimaExame}
                <br />• Média mínima no exame: ≥ {notaAprovacaoExame}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

