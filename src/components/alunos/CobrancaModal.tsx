import { useState, useEffect } from 'react';
import { Aluno, Mensalidade, CobrancaHistorico } from '@/types/aluno';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAuth } from '@/contexts/AuthContext';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PhoneCall,
  MessageCircle,
  AlertTriangle,
  Scale,
  CheckCircle2,
  Calendar,
  DollarSign,
  ShieldAlert,
  Send,
  User,
  Clock,
  PhoneForwarded,
} from 'lucide-react';
import { toast } from 'sonner';

interface CobrancaModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  aluno: Aluno | null;
  mensalidades: Mensalidade[];
  initialMensalidadeId?: string | null;
  onSaveCobranca: (params: {
    alunoId: string;
    cobranca: CobrancaHistorico;
    mensalidadeAtualizada?: Partial<Mensalidade> & { id: string };
  }) => void;
}

export function CobrancaModal({
  isOpen,
  onOpenChange,
  aluno,
  mensalidades,
  initialMensalidadeId,
  onSaveCobranca,
}: CobrancaModalProps) {
  const { user, profile } = useAuth();
  const [employees] = useLocalStorage<any[]>('escolinha_employees_v2', []);

  const [selectedMensalidadeId, setSelectedMensalidadeId] = useState<string>('');
  const [colaboradoraNome, setColaboradoraNome] = useState<string>('');
  const [responsavelTipo, setResponsavelTipo] = useState<'principal' | 'opcional' | 'personalizado'>('principal');
  const [responsavelNome, setResponsavelNome] = useState<string>('');
  const [responsavelContato, setResponsavelContato] = useState<string>('');
  
  const [canal, setCanal] = useState<'whatsapp' | 'ligacao'>('whatsapp');
  const [bloqueadoWhatsapp, setBloqueadoWhatsapp] = useState<boolean>(false);
  const [statusResultado, setStatusResultado] = useState<CobrancaHistorico['statusResultado']>('mensagem_enviada');
  const [dataPromessa, setDataPromessa] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [marcarJudicializada, setMarcarJudicializada] = useState<boolean>(false);
  const [motivoJudicializacao, setMotivoJudicializacao] = useState<string>('');

  // Default collaborator to current logged-in user
  useEffect(() => {
    if (user || profile) {
      const nomePadrao = profile?.full_name || (user?.user_metadata?.full_name as string) || user?.email || 'Colaboradora do Financeiro';
      setColaboradoraNome(nomePadrao);
    }
  }, [user, profile]);

  // When opening or changing student, reset form
  useEffect(() => {
    if (aluno && isOpen) {
      // Pick initial mensalidade or first overdue/pending
      const overdueOrPending = mensalidades.filter(
        (m) => m.alunoId === aluno.id && m.status !== 'Pago'
      );
      if (initialMensalidadeId) {
        setSelectedMensalidadeId(initialMensalidadeId);
      } else if (overdueOrPending.length > 0) {
        setSelectedMensalidadeId(overdueOrPending[0].id);
      } else {
        setSelectedMensalidadeId('');
      }

      // Default responsible
      setResponsavelTipo('principal');
      setResponsavelNome(aluno.nomeResponsavel || '');
      setResponsavelContato(aluno.contatoResponsavel || aluno.contatoWhatsapp || aluno.telefone || '');
      
      setCanal('whatsapp');
      setBloqueadoWhatsapp(false);
      setStatusResultado('mensagem_enviada');
      setDataPromessa('');
      setObservacoes('');
      setMarcarJudicializada(false);
      setMotivoJudicializacao('');
    }
  }, [aluno, isOpen, initialMensalidadeId]);

  // Handle WhatsApp Block switch: automatically flip to phone call
  const handleToggleBloqueadoWhatsapp = (checked: boolean) => {
    setBloqueadoWhatsapp(checked);
    if (checked) {
      setCanal('ligacao');
      setStatusResultado('ligacao_realizada');
      toast.info('Canal alterado automaticamente para Ligação Telefônica.');
    } else {
      setCanal('whatsapp');
      setStatusResultado('mensagem_enviada');
    }
  };

  if (!aluno) return null;

  const selectedMensalidade = mensalidades.find((m) => m.id === selectedMensalidadeId);

  // Helper date & formatting
  const formatDateBR = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const formatMonthRef = (mesRef?: string) => {
    if (!mesRef) return '-';
    const [ano, mes] = mesRef.split('-');
    if (ano && mes) {
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const mesIndex = parseInt(mes, 10) - 1;
      const nomeMes = meses[mesIndex] || mes;
      return `${nomeMes}/${ano}`;
    }
    return mesRef;
  };

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Check if overdue
  const isOverdue = (m?: Mensalidade) => {
    if (!m || m.status === 'Pago' || m.judicializada || m.status === 'Judicializada') return false;
    if (m.status === 'Atrasado') return true;
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const dueDate = new Date(m.dataVencimento);
    return dueDate.getTime() < todayMidnight.getTime();
  };

  const atrasada = selectedMensalidade ? isOverdue(selectedMensalidade) : false;

  // Values calculation:
  // Rule: até o dia do vencimento é o valor líquido (valorBase - desconto).
  // A partir do vencimento (dia seguinte / vencida), perde o desconto de pontualidade e volta para o valor original (valorBase)!
  const valorBase = parseFloat(aluno.valorBase || '0') || 0;
  const desconto = parseFloat(aluno.descontoMensalidade || '0') || 0;
  const valorComDesconto = Math.max(0, valorBase - desconto);
  
  // Se estiver atrasada, volta para o valor original (valorBase)
  const valorEfetivo = atrasada ? valorBase : (selectedMensalidade?.valorFinal ?? valorComDesconto);

  // Clean phone number for WhatsApp / Tel
  const cleanPhone = responsavelContato.replace(/\D/g, '');
  const internationalPhone = cleanPhone.length <= 11 && !cleanPhone.startsWith('55')
    ? `55${cleanPhone}`
    : cleanPhone;

  // WhatsApp template
  const mesFormatado = selectedMensalidade ? formatMonthRef(selectedMensalidade.mesReferencia) : 'em aberto';
  const vencimentoFormatado = selectedMensalidade ? formatDateBR(selectedMensalidade.dataVencimento) : '';
  const valorFormatado = formatCurrency(valorEfetivo);

  const whatsappMessage = `Olá ${responsavelNome || 'Senhor(a)'}, tudo bem? Aqui é ${colaboradoraNome} do setor financeiro da Escola.\n\nConstatamos que a mensalidade do(a) aluno(a) *${aluno.nome}*, referente ao mês de *${mesFormatado}* (vencimento em ${vencimentoFormatado}), no valor de *${valorFormatado}*, encontra-se pendente.\n\n${atrasada ? '⚠️ Lembramos que após a data de vencimento, a mensalidade retorna ao valor original conforme as condições do contrato.\n\n' : ''}Poderia nos confirmar a previsão de pagamento ou se prefere que reenviemos a chave PIX ou boleto para regularização? Estamos à disposição!`;

  // Phone Call Script (Texto próprio para ligação)
  const phoneCallScript = `Roteiro de Atendimento Telefônico:
"Olá, ${responsavelNome || 'Senhor(a)'}, bom dia / boa tarde!
Meu nome é ${colaboradoraNome}, falo do setor financeiro da Escola.
Estou entrando em contato a respeito da mensalidade do(a) ${aluno.nome}, referente ao mês de ${mesFormatado}, com vencimento no dia ${vencimentoFormatado}, no valor de ${valorFormatado}.
${bloqueadoWhatsapp ? 'Como nosso contato via WhatsApp não pôde ser entregue, ligamos diretamente para verificar como podemos auxiliá-lo(a) na regularização via PIX ou transferência.\n' : 'Gostaria de verificar se houve algum imprevisto e qual seria a previsão para o acerto dessa pendência.\n'}O(A) senhor(a) teria uma data de previsão para registrarmos em nosso sistema?"`;

  const handleOpenWhatsApp = () => {
    if (!cleanPhone) {
      toast.error('Telefone do responsável não informado.');
      return;
    }
    const encoded = encodeURIComponent(whatsappMessage);
    const url = `https://wa.me/${internationalPhone}?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleOpenPhoneCall = () => {
    if (!cleanPhone) {
      toast.error('Telefone do responsável não informado.');
      return;
    }
    window.location.href = `tel:${cleanPhone}`;
  };

  const handleResponsibleChange = (type: 'principal' | 'opcional' | 'personalizado') => {
    setResponsavelTipo(type);
    if (type === 'principal') {
      setResponsavelNome(aluno.nomeResponsavel || '');
      setResponsavelContato(aluno.contatoResponsavel || aluno.contatoWhatsapp || aluno.telefone || '');
    } else if (type === 'opcional') {
      setResponsavelNome(aluno.responsavelOpcional || 'Segundo Responsável');
      setResponsavelContato(aluno.telefoneComercial || aluno.telefone || '');
    } else {
      setResponsavelNome('');
      setResponsavelContato('');
    }
  };

  const handleSubmit = () => {
    if (!responsavelNome.trim()) {
      toast.error('Informe o nome do responsável contatado.');
      return;
    }
    if (!colaboradoraNome.trim()) {
      toast.error('Informe o nome da colaboradora que realizou a cobrança.');
      return;
    }
    if (!selectedMensalidade) {
      toast.error('Selecione a mensalidade a ser cobrada.');
      return;
    }

    const novaCobranca: CobrancaHistorico = {
      id: crypto.randomUUID(),
      data: new Date().toISOString(),
      colaboradorNome: colaboradoraNome.trim(),
      responsavelNome: responsavelNome.trim(),
      responsavelContato: responsavelContato.trim(),
      parentesco: responsavelTipo === 'principal' ? (aluno.parentescoResponsavel || 'Responsável') : responsavelTipo,
      mesReferencia: selectedMensalidade.mesReferencia,
      valorCobrado: valorEfetivo,
      canal,
      bloqueadoWhatsapp,
      statusResultado,
      dataPromessa: statusResultado === 'promessa_pagamento' ? dataPromessa : undefined,
      observacoes: observacoes.trim() || undefined,
      judicializada: marcarJudicializada,
    };

    let mensalidadeAtualizada: (Partial<Mensalidade> & { id: string }) | undefined = undefined;

    if (marcarJudicializada) {
      mensalidadeAtualizada = {
        id: selectedMensalidade.id,
        status: 'Judicializada',
        judicializada: true,
        dataJudicializacao: new Date().toISOString(),
        motivoJudicializacao: motivoJudicializacao.trim() || observacoes.trim() || 'Encaminhado para cobrança judicial.',
      };
    } else if (atrasada && selectedMensalidade.valorFinal !== valorBase) {
      // Persist the lost discount so invoice reflects original base value
      mensalidadeAtualizada = {
        id: selectedMensalidade.id,
        valorFinal: valorBase,
        descontoPontualidade: desconto,
        valorOriginalBase: valorBase,
      };
    }

    onSaveCobranca({
      alunoId: aluno.id,
      cobranca: novaCobranca,
      mensalidadeAtualizada,
    });

    toast.success(
      marcarJudicializada
        ? `Cobrança registrada e parcela de ${mesFormatado} marcada como Judicializada!`
        : `Cobrança registrada no histórico financeiro de ${aluno.nome}!`
    );

    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <PhoneCall className="h-5 w-5 text-emerald-600" />
            Registrar Cobrança - {aluno.nome}
          </DialogTitle>
          <DialogDescription>
            Envie mensagem ou realize ligação para o responsável e registre o contato no histórico financeiro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Card Resumo do Aluno e Parcela */}
          <div className="p-3.5 bg-muted/40 border rounded-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
              <div>
                <span className="text-xs text-muted-foreground block">Aluno(a)</span>
                <span className="font-bold text-sm text-foreground">{aluno.nome}</span>
                <span className="text-xs text-muted-foreground ml-2">Matrícula: {aluno.matricula}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground block">Turma / Turno</span>
                <span className="text-xs font-semibold">
                  {aluno.classe || 'S/ Turma'} {aluno.turma ? `(${aluno.turma})` : ''} - {aluno.setor || 'Geral'}
                </span>
              </div>
            </div>

            {/* Seleção de Parcela / Mês da Mensalidade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cobranca_parcela" className="text-xs font-semibold">
                  Mês da Mensalidade a Cobrar
                </Label>
                <Select value={selectedMensalidadeId} onValueChange={setSelectedMensalidadeId}>
                  <SelectTrigger id="cobranca_parcela" className="text-xs">
                    <SelectValue placeholder="Selecione a parcela..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mensalidades
                      .filter((m) => m.alunoId === aluno.id)
                      .map((m) => {
                        const mOverdue = isOverdue(m);
                        const mVal = mOverdue ? valorBase : m.valorFinal;
                        return (
                          <SelectItem key={m.id} value={m.id} className="text-xs">
                            {formatMonthRef(m.mesReferencia)} - Venc: {formatDateBR(m.dataVencimento)} - {formatCurrency(mVal)}
                            {m.judicializada ? ' [⚖️ Judicializada]' : m.status === 'Pago' ? ' [✓ Pago]' : mOverdue ? ' [⚠️ Vencida]' : ' [A Vencer]'}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>

              {/* Informação do Valor e Regra de Pontualidade */}
              <div className="p-2 rounded border bg-background flex flex-col justify-center text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Valor a Cobrar:</span>
                  <span className="font-bold text-sm text-foreground">{formatCurrency(valorEfetivo)}</span>
                </div>
                {atrasada ? (
                  <div className="text-[11px] text-red-600 dark:text-red-400 font-medium flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>Perda do desc. pontualidade (R$ {desconto.toFixed(2)}): valor original integral.</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    <span>Desconto de pontualidade de R$ {desconto.toFixed(2)} aplicado até o vencimento.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dados da Colaboradora e Seleção do Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Colaboradora Responsável */}
            <div className="space-y-1.5">
              <Label htmlFor="colaboradora_nome" className="text-xs font-semibold flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                Colaboradora que realizou a cobrança
              </Label>
              <div className="flex gap-1.5">
                <Input
                  id="colaboradora_nome"
                  value={colaboradoraNome}
                  onChange={(e) => setColaboradoraNome(e.target.value)}
                  placeholder="Nome da colaboradora..."
                  className="text-xs"
                />
                {employees.length > 0 && (
                  <Select onValueChange={(val) => setColaboradoraNome(val)}>
                    <SelectTrigger className="w-10 px-2" title="Selecionar de funcionários">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.name} className="text-xs">
                          {emp.name} ({emp.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Escolha do Responsável do Aluno */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-indigo-600" />
                Escolher Responsável do Aluno
              </Label>
              <Select value={responsavelTipo} onValueChange={(val: any) => handleResponsibleChange(val)}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione o responsável..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="principal" className="text-xs">
                    Principal: {aluno.nomeResponsavel || 'Não cadastrado'} {aluno.contatoResponsavel ? `(${aluno.contatoResponsavel})` : ''}
                  </SelectItem>
                  {aluno.responsavelOpcional && (
                    <SelectItem value="opcional" className="text-xs">
                      Secundário: {aluno.responsavelOpcional}
                    </SelectItem>
                  )}
                  <SelectItem value="personalizado" className="text-xs italic text-muted-foreground">
                    Outro Responsável / Contato Personalizado...
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Campos de Nome e Telefone do Responsável Selecionado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="resp_nome_input" className="text-xs text-muted-foreground">
                Nome do Responsável
              </Label>
              <Input
                id="resp_nome_input"
                value={responsavelNome}
                onChange={(e) => setResponsavelNome(e.target.value)}
                placeholder="Nome do responsável contatado"
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="resp_contato_input" className="text-xs text-muted-foreground">
                Telefone / WhatsApp
              </Label>
              <Input
                id="resp_contato_input"
                value={responsavelContato}
                onChange={(e) => setResponsavelContato(e.target.value)}
                placeholder="(00) 00000-0000"
                className="text-xs"
              />
            </div>
          </div>

          {/* Tratamento de Bloqueio no WhatsApp -> Alternância para Ligação */}
          <div className="p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className={`h-4 w-4 ${bloqueadoWhatsapp ? 'text-destructive font-bold' : 'text-amber-600'}`} />
                <Label htmlFor="bloqueado_wa" className="text-xs font-semibold cursor-pointer select-none">
                  Contato foi bloqueado no WhatsApp
                </Label>
              </div>
              <Switch
                id="bloqueado_wa"
                checked={bloqueadoWhatsapp}
                onCheckedChange={handleToggleBloqueadoWhatsapp}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {bloqueadoWhatsapp
                ? '⚠️ WhatsApp indisponível / bloqueado. A cobrança foi alterada para Ligação Telefônica e um script exclusivo para ligação está disponível abaixo.'
                : 'Marque caso o responsável não receba mensagens ou tenha bloqueado o contato da escola no WhatsApp.'}
            </p>
          </div>

          {/* Canal Selecionado e Template / Script */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">Canal da Cobrança:</span>
                {canal === 'whatsapp' ? (
                  <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" /> WhatsApp
                  </Badge>
                ) : (
                  <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1">
                    <PhoneCall className="h-3 w-3" /> Ligação Telefônica
                  </Badge>
                )}
              </div>

              {/* Botões de Ação Imediata */}
              <div className="flex items-center gap-2">
                {canal === 'whatsapp' && !bloqueadoWhatsapp && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleOpenWhatsApp}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-7"
                    disabled={!cleanPhone}
                  >
                    <Send className="h-3 w-3" />
                    Abrir WhatsApp
                  </Button>
                )}
                {canal === 'ligacao' && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleOpenPhoneCall}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 h-7"
                    disabled={!cleanPhone}
                  >
                    <PhoneForwarded className="h-3 w-3" />
                    Ligar para Responsável
                  </Button>
                )}
              </div>
            </div>

            {/* Script / Roteiro de Ligação ou Texto do WhatsApp */}
            {canal === 'ligacao' ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>Texto Próprio para Ligação (Roteiro de Atendimento):</span>
                  <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200">
                    Script Telefônico
                  </Badge>
                </div>
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-md text-xs font-mono text-blue-950 dark:text-blue-200 whitespace-pre-line leading-relaxed">
                  {phoneCallScript}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>Mensagem Pronta para Envio no WhatsApp:</span>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">
                    Template WhatsApp
                  </Badge>
                </div>
                <Textarea
                  value={whatsappMessage}
                  readOnly
                  rows={4}
                  className="text-xs bg-muted/20 font-sans resize-none"
                />
              </div>
            )}
          </div>

          {/* Registro do Resultado do Contato */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="resultado_cobranca" className="text-xs font-semibold">
                Resultado do Contato
              </Label>
              <Select
                value={statusResultado}
                onValueChange={(val: any) => setStatusResultado(val)}
              >
                <SelectTrigger id="resultado_cobranca" className="text-xs">
                  <SelectValue placeholder="Selecione o resultado..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="promessa_pagamento" className="text-xs text-emerald-600 font-semibold">
                    ✓ Promessa de Pagamento
                  </SelectItem>
                  <SelectItem value="mensagem_enviada" className="text-xs">
                    💬 Mensagem Enviada / Aguardando Retorno
                  </SelectItem>
                  <SelectItem value="ligacao_realizada" className="text-xs">
                    📞 Ligação Realizada com Sucesso
                  </SelectItem>
                  <SelectItem value="sem_contato" className="text-xs text-amber-600">
                    ⚠️ Não Atendeu / Caixa Postal
                  </SelectItem>
                  <SelectItem value="recusou" className="text-xs text-destructive">
                    ⛔ Recusa de Negociação
                  </SelectItem>
                  <SelectItem value="outro" className="text-xs">
                    Outro Resultado
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data de Promessa de Pagamento */}
            {statusResultado === 'promessa_pagamento' && (
              <div className="space-y-1.5 bg-emerald-50/60 dark:bg-emerald-950/20 p-2 rounded border border-emerald-200 dark:border-emerald-900">
                <Label htmlFor="data_promessa" className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Data da Promessa de Pagamento
                </Label>
                <Input
                  id="data_promessa"
                  type="date"
                  value={dataPromessa}
                  onChange={(e) => setDataPromessa(e.target.value)}
                  className="text-xs bg-white dark:bg-background"
                />
              </div>
            )}
          </div>

          {/* Observações Livres da Colaboradora */}
          <div className="space-y-1.5">
            <Label htmlFor="cobranca_obs" className="text-xs font-semibold">
              Observações / Detalhes do Contato
            </Label>
            <Textarea
              id="cobranca_obs"
              placeholder="Ex: Responsável informou que pagará após o dia 20 pois está aguardando o salário..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          {/* Opção de Parcela Judicializada */}
          <div className="p-3 rounded-lg border bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-purple-700 dark:text-purple-400" />
                <Label htmlFor="judicializada_switch" className="text-xs font-semibold cursor-pointer select-none text-purple-900 dark:text-purple-300">
                  Marcar Parcela como Judicializada (Cobrança Suspensa)
                </Label>
              </div>
              <Switch
                id="judicializada_switch"
                checked={marcarJudicializada}
                onCheckedChange={setMarcarJudicializada}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {marcarJudicializada
                ? '⚖️ Atenção: Ao marcar como judicializada, a cobrança rotineira desta parcela será suspensa e não ficará mais ativa na régua comum.'
                : 'Caso a negociação tenha sido transferida para via jurídica, ative esta opção para suspender a cobrança ativa rotineira.'}
            </p>

            {marcarJudicializada && (
              <div className="pt-2 space-y-1">
                <Label htmlFor="motivo_jud" className="text-xs text-purple-900 dark:text-purple-300 font-medium">
                  Processo ou Motivo da Judicialização
                </Label>
                <Input
                  id="motivo_jud"
                  placeholder="Ex: Encaminhado para Dr. Silva (Advocacia) - Ação de Cobrança nº 12345"
                  value={motivoJudicializacao}
                  onChange={(e) => setMotivoJudicializacao(e.target.value)}
                  className="text-xs bg-white dark:bg-background"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            Salvar Cobrança no Histórico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

