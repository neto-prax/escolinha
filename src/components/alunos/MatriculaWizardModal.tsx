import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Aluno, Mensalidade } from '@/types/aluno';
import { TurmaConfig, Lancamento } from '@/types/finance';
import { DocumentoEscolarTemplate, DEFAULT_DOCUMENTOS_ESCOLARES } from '@/types/documentoEscolar';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ReciboMatriculaModal, ItemPagamentoRecibo } from './ReciboMatriculaModal';
import { DocumentosImpressaoModal } from './DocumentosImpressaoModal';
import {
  GraduationCap,
  Users,
  CreditCard,
  ShoppingBag,
  FileText,
  Printer,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Receipt,
  Sparkles,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface MatriculaWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  turmas: TurmaConfig[];
  onMatriculaConcluida: (novoAluno: Aluno, novasMensalidades: Mensalidade[]) => void;
}

export const MatriculaWizardModal: React.FC<MatriculaWizardModalProps> = ({
  isOpen,
  onClose,
  turmas,
  onMatriculaConcluida,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  const [documentosTemplates] = useLocalStorage<DocumentoEscolarTemplate[]>(
    'escolinha_documentos_escolares',
    DEFAULT_DOCUMENTOS_ESCOLARES
  );

  // STEP 1: Dados do Aluno e Turmas (Regular + Contraturno)
  const [nomeAluno, setNomeAluno] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [cpfAluno, setCpfAluno] = useState('');
  const [rgAluno, setRgAluno] = useState('');
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [cpfResponsavel, setCpfResponsavel] = useState('');
  const [rgResponsavel, setRgResponsavel] = useState('');
  const [contatoResponsavel, setContatoResponsavel] = useState('');
  const [emailResponsavel, setEmailResponsavel] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('Feira de Santana');
  const [uf, setUf] = useState('BA');
  const [cep, setCep] = useState('');

  // Turma Regular
  const [setorRegular, setSetorRegular] = useState('Ensino Fundamental 1');
  const [classeRegular, setClasseRegular] = useState('');
  const [turmaLetraRegular, setTurmaLetraRegular] = useState('A');

  // Contraturno
  const [temContraturno, setTemContraturno] = useState(false);
  const [setorContraturno, setSetorContraturno] = useState('Contraturno');
  const [classeContraturno, setClasseContraturno] = useState('');
  const [turmaLetraContraturno, setTurmaLetraContraturno] = useState('A');
  const [valorContraturno, setValorContraturno] = useState<number>(350);

  // STEP 2: Forma de Pagamento e Parcelamento
  const [qtdParcelas, setQtdParcelas] = useState<number>(11); // Padrão 11 (fev a dez)
  const [mesInicio, setMesInicio] = useState<number>(2); // 2 = Fevereiro
  const [anoLetivo, setAnoLetivo] = useState<string>('2026');
  const [valorBase, setValorBase] = useState<number>(650);
  const [descontoPontualidade, setDescontoPontualidade] = useState<number>(50);
  const [diaVencimento, setDiaVencimento] = useState<string>('10');

  // STEP 3: Pagamentos Iniciais Realizados
  // 1. Matrícula (1ª parcela)
  const [matriculaPaga, setMatriculaPaga] = useState(true);
  const [valorMatricula, setValorMatricula] = useState<number>(600);
  const [formaPagtoMatricula, setFormaPagtoMatricula] = useState('PIX');

  // 2. Fardas Compradas
  const [fardasPagas, setFardasPagas] = useState(false);
  const [descricaoFardas, setDescricaoFardas] = useState('2 Camisas Polo + 1 Short');
  const [valorFardas, setValorFardas] = useState<number>(180);
  const [formaPagtoFardas, setFormaPagtoFardas] = useState('PIX');

  // 3. Material Escolar / Coletivo (Procon conformidade)
  const [tipoMaterialLabel, setTipoMaterialLabel] = useState<'Material Escolar' | 'Material Coletivo / Didático'>(
    'Material Escolar'
  );
  const [materialPago, setMaterialPago] = useState(false);
  const [descricaoMaterial, setDescricaoMaterial] = useState('Kit de Atividades e Material Pedagógico');
  const [valorMaterial, setValorMaterial] = useState<number>(250);
  const [formaPagtoMaterial, setFormaPagtoMaterial] = useState('PIX');

  // STEP 4: Documentos Selecionados
  const [documentosSelecionadosIds, setDocumentosSelecionadosIds] = useState<string[]>([]);

  // Modais de Visualização / Impressão
  const [isReciboModalOpen, setIsReciboModalOpen] = useState(false);
  const [isImpressaoDocsModalOpen, setIsImpressaoDocsModalOpen] = useState(false);

  // Opções de turmas regulares baseadas no setor
  const classesDisponiveis = useMemo(() => {
    return turmas.filter((t) => t.setor === setorRegular).map((t) => t.nome);
  }, [turmas, setorRegular]);

  // Cálculo da mensalidade líquida
  const valorMensalidadeLiquida = useMemo(() => {
    const base = Number(valorBase) || 0;
    const desc = Number(descontoPontualidade) || 0;
    const contra = temContraturno ? Number(valorContraturno) || 0 : 0;
    return Math.max(0, base + contra - desc);
  }, [valorBase, descontoPontualidade, temContraturno, valorContraturno]);

  // Inicializa documentos padrão selecionados ao abrir ou alterar contraturno
  React.useEffect(() => {
    const defaultIds = documentosTemplates
      .filter((doc) => {
        if (!doc.ativo) return false;
        if (doc.tipoVinculo === 'todos') return true;
        if (doc.tipoVinculo === 'contraturno') return temContraturno;
        return false;
      })
      .map((d) => d.id);
    setDocumentosSelecionadosIds(defaultIds);
  }, [documentosTemplates, temContraturno]);

  // Monta lista de itens para recibo
  const itensRecibo: ItemPagamentoRecibo[] = useMemo(() => {
    return [
      {
        descricao: '1ª Parcela / Taxa de Matrícula',
        detalhe: `Ano Letivo ${anoLetivo}`,
        valor: Number(valorMatricula) || 0,
        pago: matriculaPaga,
        formaPagamento: formaPagtoMatricula,
      },
      {
        descricao: 'Fardamento Escolar',
        detalhe: descricaoFardas,
        valor: Number(valorFardas) || 0,
        pago: fardasPagas,
        formaPagamento: formaPagtoFardas,
      },
      {
        descricao: tipoMaterialLabel,
        detalhe: descricaoMaterial,
        valor: Number(valorMaterial) || 0,
        pago: materialPago,
        formaPagamento: formaPagtoMaterial,
      },
    ];
  }, [
    anoLetivo,
    valorMatricula,
    matriculaPaga,
    formaPagtoMatricula,
    descricaoFardas,
    valorFardas,
    fardasPagas,
    formaPagtoFardas,
    tipoMaterialLabel,
    descricaoMaterial,
    valorMaterial,
    materialPago,
    formaPagtoMaterial,
  ]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Projeção das parcelas geradas
  const parcelasProjetadas = useMemo(() => {
    const list = [];
    const currentYear = parseInt(anoLetivo, 10) || new Date().getFullYear();

    for (let i = 0; i < qtdParcelas; i++) {
      const monthIndex = (mesInicio - 1 + i) % 12;
      const yearOffset = Math.floor((mesInicio - 1 + i) / 12);
      const targetYear = currentYear + yearOffset;
      const mesStr = String(monthIndex + 1).padStart(2, '0');
      const mesRef = `${targetYear}-${mesStr}`;
      const dataVenc = new Date(targetYear, monthIndex, parseInt(diaVencimento, 10) || 10).toISOString();

      list.push({
        numero: i + 1,
        mesReferencia: mesRef,
        dataVencimento: dataVenc,
        valor: valorMensalidadeLiquida,
      });
    }
    return list;
  }, [qtdParcelas, mesInicio, anoLetivo, diaVencimento, valorMensalidadeLiquida]);

  // Validações por Step
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!nomeAluno.trim()) {
        toast.error('Informe o nome do aluno.');
        return;
      }
      if (!classeRegular) {
        toast.error('Selecione a turma / ano regular do aluno.');
        return;
      }
      if (!nomeResponsavel.trim()) {
        toast.error('Informe o nome do responsável.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (qtdParcelas < 1 || qtdParcelas > 12) {
        toast.error('A quantidade de parcelas deve ser entre 1 e 12.');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  // Concluir Matrícula e Persistir Aluno, Mensalidades e Lançamentos
  const handleFinalizarMatricula = () => {
    const alunoId = crypto.randomUUID();
    const matriculaGerada = `MAT-${Date.now().toString().slice(-6)}`;
    const dataMatriculaIso = new Date().toISOString();

    const novoAluno: Aluno = {
      id: alunoId,
      matricula: matriculaGerada,
      nome: nomeAluno.trim(),
      dataNascimento: dataNascimento || undefined,
      cpf: cpfAluno.trim() || undefined,
      rg: rgAluno.trim() || undefined,
      nomeResponsavel: nomeResponsavel.trim(),
      cpfResponsavel: cpfResponsavel.trim() || undefined,
      rgResponsavel: rgResponsavel.trim() || undefined,
      contatoResponsavel: contatoResponsavel.trim(),
      emailResponsavel: emailResponsavel.trim() || undefined,
      rua: rua.trim() || undefined,
      numero: numero.trim() || undefined,
      bairro: bairro.trim() || undefined,
      cidade: cidade.trim() || undefined,
      uf: uf.trim() || undefined,
      cep: cep.trim() || undefined,
      status: 'Ativo',

      // Enturmação Regular
      setor: setorRegular,
      classe: classeRegular,
      turma: turmaLetraRegular,

      // Contraturno
      temContraturno,
      setorContraturno: temContraturno ? setorContraturno : undefined,
      classeContraturno: temContraturno ? classeContraturno || 'Contraturno' : undefined,
      turmaContraturno: temContraturno ? turmaLetraContraturno : undefined,
      valorContraturno: temContraturno ? String(valorContraturno) : undefined,

      // Parâmetros Financeiros
      valorBase: String(valorBase + (temContraturno ? valorContraturno : 0)),
      descontoMensalidade: String(descontoPontualidade),
      diaVencimento,
      dataMatricula: dataMatriculaIso,
      parcelasContratadas: qtdParcelas,
    };

    // Gerar as Mensalidades Contratadas
    const novasMensalidades: Mensalidade[] = parcelasProjetadas.map((p, idx) => {
      const isPrimeiraParcelaPaga = idx === 0 && matriculaPaga;
      const mensalidadeId = crypto.randomUUID();
      const lancamentoId = isPrimeiraParcelaPaga ? crypto.randomUUID() : undefined;

      return {
        id: mensalidadeId,
        alunoId,
        mesReferencia: p.mesReferencia,
        valorFinal: p.valor,
        dataVencimento: p.dataVencimento,
        status: isPrimeiraParcelaPaga ? ('Pago' as const) : ('Pendente' as const),
        dataPagamento: isPrimeiraParcelaPaga ? new Date().toISOString() : undefined,
        lancamentoId,
      };
    });

    // Registrar no Financeiro os lançamentos que foram quitados no ato
    const novosLancamentosFinanceiro: Lancamento[] = [];

    // 1ª parcela quitada
    if (matriculaPaga && Number(valorMatricula) > 0) {
      novosLancamentosFinanceiro.push({
        id: novasMensalidades[0]?.lancamentoId || crypto.randomUUID(),
        data: new Date(),
        unidade: 'Todas',
        descricao: `1ª Parcela (Matrícula) - ${novoAluno.nome}`,
        categoria: 'Mensalidades',
        tipoCusto: 'Fixo',
        valor: Number(valorMatricula) || valorMensalidadeLiquida,
        formaPagamento: (formaPagtoMatricula as any) || 'PIX',
        tipo: 'Entrada',
        status: 'Pago',
        alunoId,
        turmas: [{ setor: setorRegular, nome: classeRegular, letras: [turmaLetraRegular] }],
      });
    }

    // Fardas quitadas
    if (fardasPagas && Number(valorFardas) > 0) {
      novosLancamentosFinanceiro.push({
        id: crypto.randomUUID(),
        data: new Date(),
        unidade: 'Todas',
        descricao: `Fardamento Escolar (${descricaoFardas}) - ${novoAluno.nome}`,
        categoria: 'Uniformes',
        tipoCusto: 'Variável',
        valor: Number(valorFardas),
        formaPagamento: (formaPagtoFardas as any) || 'PIX',
        tipo: 'Entrada',
        status: 'Pago',
        alunoId,
      });
    }

    // Material escolar quitado
    if (materialPago && Number(valorMaterial) > 0) {
      novosLancamentosFinanceiro.push({
        id: crypto.randomUUID(),
        data: new Date(),
        unidade: 'Todas',
        descricao: `${tipoMaterialLabel} (${descricaoMaterial}) - ${novoAluno.nome}`,
        categoria: 'Pedagógico & Material',
        tipoCusto: 'Variável',
        valor: Number(valorMaterial),
        formaPagamento: (formaPagtoMaterial as any) || 'PIX',
        tipo: 'Entrada',
        status: 'Pago',
        alunoId,
      });
    }

    // Persistir lançamentos em localStorage de forma compatível
    if (novosLancamentosFinanceiro.length > 0) {
      try {
        const rawV2 = localStorage.getItem('escolinha_lancamentos_v2');
        const listV2 = rawV2 ? JSON.parse(rawV2) : [];
        const rawV1 = localStorage.getItem('escolinha_lancamentos');
        const listV1 = rawV1 ? JSON.parse(rawV1) : [];

        const updatedV2 = [...listV2, ...novosLancamentosFinanceiro];
        const updatedV1 = [...listV1, ...novosLancamentosFinanceiro];

        localStorage.setItem('escolinha_lancamentos_v2', JSON.stringify(updatedV2));
        localStorage.setItem('escolinha_lancamentos', JSON.stringify(updatedV1));
      } catch (err) {
        console.error('Erro ao registrar lançamentos de matrícula no Financeiro:', err);
      }
    }

    // Notificar e finalizar
    onMatriculaConcluida(novoAluno, novasMensalidades);
    toast.success(
      `Matrícula de ${novoAluno.nome} concluída com sucesso! ${novasMensalidades.length} mensalidades geradas.`
    );
    onClose();
  };

  const docsParaImpressao = useMemo(() => {
    return documentosTemplates.filter((d) => documentosSelecionadosIds.includes(d.id));
  }, [documentosTemplates, documentosSelecionadosIds]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0">
          {/* HEADER COM STEPPER */}
          <DialogHeader className="p-4 border-b bg-slate-50">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <GraduationCap className="text-emerald-600 h-5 w-5" />
                <span>Matricular Aluno</span>
              </DialogTitle>
              <Badge variant="outline" className="text-xs bg-white">
                Passo {currentStep} de 4
              </Badge>
            </div>

            {/* BARRA DE PROGRESSO EM ETAPAS */}
            <div className="grid grid-cols-4 gap-2 pt-3">
              <div
                className={`flex items-center gap-1.5 p-1.5 rounded text-xs font-semibold ${
                  currentStep === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] shrink-0">1</span>
                <span className="truncate">Dados & Turma</span>
              </div>

              <div
                className={`flex items-center gap-1.5 p-1.5 rounded text-xs font-semibold ${
                  currentStep === 2 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] shrink-0">2</span>
                <span className="truncate">Parcelamento</span>
              </div>

              <div
                className={`flex items-center gap-1.5 p-1.5 rounded text-xs font-semibold ${
                  currentStep === 3 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] shrink-0">3</span>
                <span className="truncate">Pagto. Inicial</span>
              </div>

              <div
                className={`flex items-center gap-1.5 p-1.5 rounded text-xs font-semibold ${
                  currentStep === 4 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] shrink-0">4</span>
                <span className="truncate">Documentos</span>
              </div>
            </div>
          </DialogHeader>

          {/* CORPO DO FORMULÁRIO */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* ETAPA 1: DADOS DO ALUNO E TURMAS */}
            {currentStep === 1 && (
              <div className="space-y-4">
                {/* Dados do Aluno */}
                <div className="bg-slate-50 p-3.5 rounded-lg border space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-emerald-600" />
                    Identificação do Aluno
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs font-semibold">Nome Completo do Aluno *</Label>
                      <Input
                        value={nomeAluno}
                        onChange={(e) => setNomeAluno(e.target.value)}
                        placeholder="Ex: Gabriel Silva Santos"
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Data de Nascimento</Label>
                      <Input
                        type="date"
                        value={dataNascimento}
                        onChange={(e) => setDataNascimento(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">CPF do Aluno</Label>
                      <Input
                        value={cpfAluno}
                        onChange={(e) => setCpfAluno(e.target.value)}
                        placeholder="000.000.000-00"
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">RG / Certidão de Nascimento</Label>
                      <Input
                        value={rgAluno}
                        onChange={(e) => setRgAluno(e.target.value)}
                        placeholder="Número do documento"
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Turma Regular */}
                <div className="bg-emerald-50/50 border border-emerald-200 p-3.5 rounded-lg space-y-3">
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-emerald-600" />
                    Turma Regular
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Setor / Segmento *</Label>
                      <Select
                        value={setorRegular}
                        onValueChange={(val) => {
                          setSetorRegular(val);
                          setClasseRegular('');
                        }}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Educação Infantil">Educação Infantil</SelectItem>
                          <SelectItem value="Ensino Fundamental 1">Ensino Fundamental 1</SelectItem>
                          <SelectItem value="Ensino Fundamental 2">Ensino Fundamental 2</SelectItem>
                          <SelectItem value="Ensino Médio">Ensino Médio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Classe / Ano *</Label>
                      {classesDisponiveis.length > 0 ? (
                        <Select value={classeRegular} onValueChange={setClasseRegular}>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Selecione a classe" />
                          </SelectTrigger>
                          <SelectContent>
                            {classesDisponiveis.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={classeRegular}
                          onChange={(e) => setClasseRegular(e.target.value)}
                          placeholder="Ex: 1º Ano"
                          className="bg-white"
                        />
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Turma / Letra</Label>
                      <Select value={turmaLetraRegular} onValueChange={setTurmaLetraRegular}>
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">Turma A</SelectItem>
                          <SelectItem value="B">Turma B</SelectItem>
                          <SelectItem value="C">Turma C</SelectItem>
                          <SelectItem value="Única">Turma Única</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* SESSÃO CONTRATURNO */}
                <div
                  className={`p-3.5 rounded-lg border transition-all space-y-3 ${
                    temContraturno ? 'bg-blue-50/60 border-blue-300' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="switch-contraturno" className="text-xs font-bold text-slate-800 cursor-pointer">
                          Matricular também no Contraturno
                        </Label>
                        {temContraturno && (
                          <Badge className="bg-blue-600 text-white hover:bg-blue-700 text-[10px]">Ativo</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        O aluno participará no turno oposto para atividades pedagógicas e oficinas.
                      </p>
                    </div>
                    <Switch
                      id="switch-contraturno"
                      checked={temContraturno}
                      onCheckedChange={setTemContraturno}
                    />
                  </div>

                  {temContraturno && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-blue-200/60">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-blue-900">Setor do Contraturno</Label>
                        <Input
                          value={setorContraturno}
                          onChange={(e) => setSetorContraturno(e.target.value)}
                          className="bg-white text-xs"
                          placeholder="Ex: Contraturno"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-blue-900">Turma / Modalidade Contraturno</Label>
                        <Input
                          value={classeContraturno}
                          onChange={(e) => setClasseContraturno(e.target.value)}
                          placeholder="Ex: Contraturno Infantil / Fundamental"
                          className="bg-white text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-blue-900">Valor Adicional Contraturno (R$)</Label>
                        <Input
                          type="number"
                          value={valorContraturno}
                          onChange={(e) => setValorContraturno(parseFloat(e.target.value) || 0)}
                          className="bg-white text-xs font-semibold text-blue-700"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Dados do Responsável */}
                <div className="bg-slate-50 p-3.5 rounded-lg border space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-emerald-600" />
                    Responsável Legal & Financeiro
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs font-semibold">Nome do Responsável *</Label>
                      <Input
                        value={nomeResponsavel}
                        onChange={(e) => setNomeResponsavel(e.target.value)}
                        placeholder="Ex: Maria Santos Silva"
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">CPF do Responsável</Label>
                      <Input
                        value={cpfResponsavel}
                        onChange={(e) => setCpfResponsavel(e.target.value)}
                        placeholder="000.000.000-00"
                        className="bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">WhatsApp / Telefone *</Label>
                      <Input
                        value={contatoResponsavel}
                        onChange={(e) => setContatoResponsavel(e.target.value)}
                        placeholder="(75) 99999-9999"
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">E-mail</Label>
                      <Input
                        type="email"
                        value={emailResponsavel}
                        onChange={(e) => setEmailResponsavel(e.target.value)}
                        placeholder="responsavel@email.com"
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 2: FORMA DE PAGAMENTO E PARCELAMENTO */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-emerald-900 uppercase">Mensalidade Contratada Calculada</span>
                    <div className="text-2xl font-extrabold text-emerald-700">{formatCurrency(valorMensalidadeLiquida)}</div>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Base: {formatCurrency(valorBase)}
                      {temContraturno && ` + Contraturno: ${formatCurrency(valorContraturno)}`}
                      {descontoPontualidade > 0 && ` - Desconto: ${formatCurrency(descontoPontualidade)}`}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Total do Contrato ({qtdParcelas} parcelas)</span>
                    <span className="text-lg font-bold text-slate-800">
                      {formatCurrency(valorMensalidadeLiquida * qtdParcelas)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-lg border">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Qtd. de Parcelas Contratadas</Label>
                    <Select
                      value={String(qtdParcelas)}
                      onValueChange={(val) => setQtdParcelas(parseInt(val, 10))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="11">11 parcelas (Fev a Dez - Padrão)</SelectItem>
                        <SelectItem value="12">12 parcelas (Ano Inteiro)</SelectItem>
                        <SelectItem value="10">10 parcelas</SelectItem>
                        <SelectItem value="9">9 parcelas</SelectItem>
                        <SelectItem value="8">8 parcelas</SelectItem>
                        <SelectItem value="7">7 parcelas</SelectItem>
                        <SelectItem value="6">6 parcelas</SelectItem>
                        <SelectItem value="5">5 parcelas</SelectItem>
                        <SelectItem value="4">4 parcelas</SelectItem>
                        <SelectItem value="3">3 parcelas</SelectItem>
                        <SelectItem value="2">2 parcelas</SelectItem>
                        <SelectItem value="1">1 parcela (À Vista)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Mês de Início das Parcelas</Label>
                    <Select
                      value={String(mesInicio)}
                      onValueChange={(val) => setMesInicio(parseInt(val, 10))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Janeiro</SelectItem>
                        <SelectItem value="2">Fevereiro (Padrão)</SelectItem>
                        <SelectItem value="3">Março</SelectItem>
                        <SelectItem value="4">Abril</SelectItem>
                        <SelectItem value="5">Maio</SelectItem>
                        <SelectItem value="6">Junho</SelectItem>
                        <SelectItem value="7">Julho</SelectItem>
                        <SelectItem value="8">Agosto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Dia de Vencimento</Label>
                    <Select value={diaVencimento} onValueChange={setDiaVencimento}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Dia 05</SelectItem>
                        <SelectItem value="10">Dia 10 (Padrão)</SelectItem>
                        <SelectItem value="15">Dia 15</SelectItem>
                        <SelectItem value="20">Dia 20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-lg border">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Valor Base Regular (R$)</Label>
                    <Input
                      type="number"
                      value={valorBase}
                      onChange={(e) => setValorBase(parseFloat(e.target.value) || 0)}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Desconto Pontualidade / Bolsa (R$)</Label>
                    <Input
                      type="number"
                      value={descontoPontualidade}
                      onChange={(e) => setDescontoPontualidade(parseFloat(e.target.value) || 0)}
                      className="bg-white"
                    />
                  </div>
                </div>

                {/* Grade de Projeção das Mensalidades */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-100 p-2 text-xs font-bold text-slate-700 flex justify-between">
                    <span>Cronograma de Mensalidades ({parcelasProjetadas.length} parcelas)</span>
                    <span>Vencimento todo dia {diaVencimento}</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y text-xs">
                    {parcelasProjetadas.map((p) => (
                      <div key={p.numero} className="p-2 flex justify-between items-center hover:bg-slate-50">
                        <span className="font-medium text-slate-700">
                          {p.numero}ª Parcela ({p.mesReferencia})
                        </span>
                        <span className="text-slate-500">
                          Vence em: {new Date(p.dataVencimento).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="font-bold text-emerald-700">{formatCurrency(p.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 3: DADOS DE PAGAMENTO INICIAL REALIZADO */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-purple-50 border border-purple-200 p-3.5 rounded-xl">
                  <div>
                    <h4 className="text-xs font-bold text-purple-900 uppercase">Pagamentos no Ato da Matrícula</h4>
                    <p className="text-xs text-purple-700 mt-0.5">
                      Marque os itens quitados pelo responsável para gerar o recibo e registrar automaticamente no Financeiro.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsReciboModalOpen(true)}
                    className="border-purple-300 text-purple-800 hover:bg-purple-100 gap-1.5 text-xs shrink-0"
                  >
                    <Receipt className="h-4 w-4 text-purple-600" />
                    Visualizar / Imprimir Recibo
                  </Button>
                </div>

                {/* ITEM 1: MATRÍCULA / 1ª PARCELA */}
                <Card className={`border ${matriculaPaga ? 'border-emerald-300 bg-emerald-50/30' : 'bg-slate-50'}`}>
                  <CardContent className="p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="check-matr"
                          checked={matriculaPaga}
                          onCheckedChange={(c) => setMatriculaPaga(!!c)}
                        />
                        <Label htmlFor="check-matr" className="text-xs font-bold cursor-pointer">
                          1ª Parcela / Taxa de Matrícula (Quitada no Ato)
                        </Label>
                      </div>
                      {matriculaPaga && <Badge className="bg-emerald-600 text-white text-[10px]">Pago</Badge>}
                    </div>

                    {matriculaPaga && (
                      <div className="grid grid-cols-2 gap-3 pt-1 border-t">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Valor da 1ª Parcela (R$)</Label>
                          <Input
                            type="number"
                            value={valorMatricula}
                            onChange={(e) => setValorMatricula(parseFloat(e.target.value) || 0)}
                            className="bg-white h-8 text-xs font-bold text-emerald-700"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Forma de Pagamento</Label>
                          <Select value={formaPagtoMatricula} onValueChange={setFormaPagtoMatricula}>
                            <SelectTrigger className="bg-white h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PIX">PIX</SelectItem>
                              <SelectItem value="Cartão">Cartão de Crédito/Débito</SelectItem>
                              <SelectItem value="Dinheiro">Dinheiro (Espécie)</SelectItem>
                              <SelectItem value="Boleto">Boleto Bancário</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ITEM 2: FARDAS COMPRADAS */}
                <Card className={`border ${fardasPagas ? 'border-emerald-300 bg-emerald-50/30' : 'bg-slate-50'}`}>
                  <CardContent className="p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="check-fardas"
                          checked={fardasPagas}
                          onCheckedChange={(c) => setFardasPagas(!!c)}
                        />
                        <Label htmlFor="check-fardas" className="text-xs font-bold cursor-pointer">
                          Fardamento Escolar / Uniformes
                        </Label>
                      </div>
                      {fardasPagas && <Badge className="bg-emerald-600 text-white text-[10px]">Pago</Badge>}
                    </div>

                    {fardasPagas && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t">
                        <div className="space-y-1 sm:col-span-1">
                          <Label className="text-xs font-semibold">Descrição / Peças</Label>
                          <Input
                            value={descricaoFardas}
                            onChange={(e) => setDescricaoFardas(e.target.value)}
                            placeholder="Ex: 2 Camisas + 1 Bermuda"
                            className="bg-white h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Valor Total Fardas (R$)</Label>
                          <Input
                            type="number"
                            value={valorFardas}
                            onChange={(e) => setValorFardas(parseFloat(e.target.value) || 0)}
                            className="bg-white h-8 text-xs font-bold text-emerald-700"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Forma de Pagamento</Label>
                          <Select value={formaPagtoFardas} onValueChange={setFormaPagtoFardas}>
                            <SelectTrigger className="bg-white h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PIX">PIX</SelectItem>
                              <SelectItem value="Cartão">Cartão de Crédito/Débito</SelectItem>
                              <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                              <SelectItem value="Boleto">Boleto</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ITEM 3: MATERIAL ESCOLAR OU MATERIAL COLETIVO */}
                <Card className={`border ${materialPago ? 'border-emerald-300 bg-emerald-50/30' : 'bg-slate-50'}`}>
                  <CardContent className="p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="check-material"
                          checked={materialPago}
                          onCheckedChange={(c) => setMaterialPago(!!c)}
                        />
                        <Label htmlFor="check-material" className="text-xs font-bold cursor-pointer">
                          Material Escolar / Coletivo (Conformidade Procon)
                        </Label>
                      </div>
                      {materialPago && <Badge className="bg-emerald-600 text-white text-[10px]">Pago</Badge>}
                    </div>

                    {materialPago && (
                      <div className="space-y-3 pt-1 border-t">
                        <div className="flex items-center gap-4 text-xs">
                          <span className="font-semibold text-slate-600">Classificação:</span>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="labelMat"
                              checked={tipoMaterialLabel === 'Material Escolar'}
                              onChange={() => setTipoMaterialLabel('Material Escolar')}
                            />
                            <span>Material Escolar</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="labelMat"
                              checked={tipoMaterialLabel === 'Material Coletivo / Didático'}
                              onChange={() => setTipoMaterialLabel('Material Coletivo / Didático')}
                            />
                            <span>Material Coletivo / Didático</span>
                          </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1 sm:col-span-1">
                            <Label className="text-xs font-semibold">Descrição</Label>
                            <Input
                              value={descricaoMaterial}
                              onChange={(e) => setDescricaoMaterial(e.target.value)}
                              className="bg-white h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold">Valor Total Material (R$)</Label>
                            <Input
                              type="number"
                              value={valorMaterial}
                              onChange={(e) => setValorMaterial(parseFloat(e.target.value) || 0)}
                              className="bg-white h-8 text-xs font-bold text-emerald-700"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold">Forma de Pagamento</Label>
                            <Select value={formaPagtoMaterial} onValueChange={setFormaPagtoMaterial}>
                              <SelectTrigger className="bg-white h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PIX">PIX</SelectItem>
                                <SelectItem value="Cartão">Cartão de Crédito/Débito</SelectItem>
                                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                <SelectItem value="Boleto">Boleto</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ETAPA 4: DOCUMENTOS A SEREM IMPRESSOS */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="bg-slate-50 border p-3.5 rounded-lg flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase">Documentos para Assinatura & Impressão</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Modelos carregados de <em>Configurações &gt; Pedagógico &gt; Docs. Escolar</em>.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setIsImpressaoDocsModalOpen(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white gap-2 text-xs"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir Todos Juntos em 1 Arquivo
                  </Button>
                </div>

                <div className="space-y-2">
                  {documentosTemplates.map((doc) => {
                    const isChecked = documentosSelecionadosIds.includes(doc.id);
                    const isContraturnoDoc = doc.tipoVinculo === 'contraturno';

                    return (
                      <div
                        key={doc.id}
                        className={`flex items-start justify-between p-3 rounded-lg border transition-all ${
                          isChecked ? 'bg-purple-50/40 border-purple-300' : 'bg-white border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={`doc-${doc.id}`}
                            checked={isChecked}
                            onCheckedChange={(c) => {
                              if (c) {
                                setDocumentosSelecionadosIds([...documentosSelecionadosIds, doc.id]);
                              } else {
                                setDocumentosSelecionadosIds(documentosSelecionadosIds.filter((id) => id !== doc.id));
                              }
                            }}
                            className="mt-1"
                          />
                          <div>
                            <Label
                              htmlFor={`doc-${doc.id}`}
                              className="text-xs font-bold text-slate-800 cursor-pointer flex items-center gap-2"
                            >
                              <span>{doc.titulo}</span>
                              {isContraturnoDoc && (
                                <Badge className="bg-blue-600 text-white text-[10px]">Adendo Contraturno</Badge>
                              )}
                            </Label>
                            <p className="text-xs text-slate-500 mt-0.5">{doc.descricao}</p>
                            {isContraturnoDoc && !temContraturno && (
                              <p className="text-[11px] text-amber-600 mt-0.5 font-medium flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Este aluno não está matriculado no contraturno.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* FOOTER COM NAVEGAÇÃO DE PASSOS */}
          <DialogFooter className="p-4 border-t bg-slate-50 flex flex-row items-center justify-between">
            {currentStep > 1 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                className="gap-1 text-xs"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
                Cancelar
              </Button>
            )}

            {currentStep < 4 ? (
              <Button size="sm" onClick={handleNextStep} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs">
                Próximo Passo
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleFinalizarMatricula}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-bold shadow-md"
              >
                <CheckCircle2 className="h-4 w-4" />
                Concluir e Salvar Matrícula
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DO RECIBO FINANCEIRO */}
      <ReciboMatriculaModal
        isOpen={isReciboModalOpen}
        onClose={() => setIsReciboModalOpen(false)}
        aluno={{
          nome: nomeAluno,
          matricula: 'Gerada no ato',
          nomeResponsavel,
          cpfResponsavel,
          setor: setorRegular,
          classe: classeRegular,
          turma: turmaLetraRegular,
          temContraturno,
          classeContraturno,
        }}
        itens={itensRecibo}
      />

      {/* MODAL DE IMPRESSÃO DE DOCUMENTOS UNIFICADOS */}
      <DocumentosImpressaoModal
        isOpen={isImpressaoDocsModalOpen}
        onClose={() => setIsImpressaoDocsModalOpen(false)}
        documentos={docsParaImpressao}
        aluno={{
          nome: nomeAluno,
          matricula: 'Gerada no ato',
          dataNascimento,
          cpf: cpfAluno,
          rg: rgAluno,
          nomeResponsavel,
          cpfResponsavel,
          rgResponsavel,
          contatoResponsavel,
          emailResponsavel,
          rua,
          numero,
          bairro,
          cidade,
          uf,
          cep,
          setor: setorRegular,
          classe: classeRegular,
          turma: turmaLetraRegular,
          temContraturno,
          classeContraturno,
          turmaContraturno: turmaLetraContraturno,
        }}
        dadosFinanceiros={{
          valorMensalidade: valorMensalidadeLiquida,
          qtdParcelas,
          diaVencimento,
          valorContraturno,
          anoLetivo,
        }}
      />
    </>
  );
};
