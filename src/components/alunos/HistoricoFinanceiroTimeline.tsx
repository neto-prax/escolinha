import { Aluno, CobrancaHistorico } from '@/types/aluno';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  PhoneCall,
  MessageCircle,
  ShieldAlert,
  Scale,
  Calendar,
  DollarSign,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';

interface HistoricoFinanceiroTimelineProps {
  aluno: Aluno;
  onOpenNovaCobranca?: () => void;
}

export function HistoricoFinanceiroTimeline({
  aluno,
  onOpenNovaCobranca,
}: HistoricoFinanceiroTimelineProps) {
  const historico = aluno.historicoFinanceiro || [];

  const formatDateBR = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} às ${hours}:${minutes}`;
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

  const getResultadoBadge = (status: CobrancaHistorico['statusResultado']) => {
    switch (status) {
      case 'promessa_pagamento':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-xs flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Promessa de Pagamento
          </Badge>
        );
      case 'ligacao_realizada':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 text-xs flex items-center gap-1">
            <PhoneCall className="h-3 w-3 text-blue-600" /> Ligação Realizada
          </Badge>
        );
      case 'mensagem_enviada':
        return (
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <MessageCircle className="h-3 w-3 text-muted-foreground" /> Mensagem Enviada
          </Badge>
        );
      case 'sem_contato':
        return (
          <Badge variant="secondary" className="text-amber-700 bg-amber-50 dark:bg-amber-950 text-xs flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-amber-600" /> Sem Contato / Caixa Postal
          </Badge>
        );
      case 'recusou':
        return (
          <Badge variant="destructive" className="text-xs flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Recusou Negociação
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            Contato Registrado
          </Badge>
        );
    }
  };

  if (historico.length === 0) {
    return (
      <div className="py-6 px-4 text-center rounded-lg border border-dashed bg-muted/10 space-y-2">
        <Clock className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
        <p className="text-xs font-semibold text-foreground">Nenhum registro de cobrança para este aluno.</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Todas as tentativas de contato, mensagens de WhatsApp, ligações e promessas de pagamento ficam arquivadas aqui.
        </p>
        {onOpenNovaCobranca && (
          <Button
            size="sm"
            onClick={onOpenNovaCobranca}
            className="mt-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Registrar Primeira Cobrança
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-1">
        <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <span>{historico.length} registro(s) de cobrança e contatos</span>
        </div>
        {onOpenNovaCobranca && (
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenNovaCobranca}
            className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1"
          >
            <Plus className="h-3 w-3" />
            Nova Cobrança
          </Button>
        )}
      </div>

      <div className="relative border-l-2 border-primary/30 pl-4 space-y-3 ml-2">
        {historico.map((item) => (
          <div
            key={item.id}
            className="relative rounded-lg border bg-card p-3 shadow-xs space-y-2 text-xs"
          >
            {/* Timeline pin */}
            <div className="absolute -left-[23px] top-3.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />

            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <User className="h-3 w-3 text-muted-foreground" />
                  {item.colaboradorNome}
                </span>
                <span className="text-muted-foreground text-[11px]">cobrou</span>
                <span className="font-semibold text-foreground">{item.responsavelNome}</span>
                {item.responsavelContato && (
                  <span className="text-muted-foreground text-[11px]">({item.responsavelContato})</span>
                )}
              </div>

              <span className="text-[11px] text-muted-foreground font-mono">
                {formatDateBR(item.data)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Canal Utilizado */}
              {item.canal === 'whatsapp' ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-[11px] flex items-center gap-1">
                  <MessageCircle className="h-3 w-3 text-emerald-600" /> WhatsApp
                </Badge>
              ) : (
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 text-[11px] flex items-center gap-1">
                  <PhoneCall className="h-3 w-3 text-blue-600" /> Ligação Telefônica
                </Badge>
              )}

              {/* Bloqueado WhatsApp Alert */}
              {item.bloqueadoWhatsapp && (
                <Badge variant="destructive" className="text-[11px] flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Bloqueado no WhatsApp
                </Badge>
              )}

              {/* Status/Resultado */}
              {getResultadoBadge(item.statusResultado)}

              {/* Parcela e Valor */}
              <div className="ml-auto flex items-center gap-2 text-[11px]">
                <span className="text-muted-foreground">Mês: <strong>{formatMonthRef(item.mesReferencia)}</strong></span>
                <span className="font-bold text-foreground bg-muted px-1.5 py-0.5 rounded">
                  {formatCurrency(item.valorCobrado)}
                </span>
              </div>
            </div>

            {/* Promessa de pagamento se houver */}
            {item.dataPromessa && (
              <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                <span>
                  <strong>Promessa de Pagamento:</strong> {formatDateBR(item.dataPromessa)}
                </span>
              </div>
            )}

            {/* Judicializada Alert */}
            {item.judicializada && (
              <div className="p-2 rounded bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 text-purple-900 dark:text-purple-200 text-xs flex items-center gap-1.5 font-medium">
                <Scale className="h-3.5 w-3.5 text-purple-600" />
                <span>Parcela encaminhada para cobrança judicial (Cobrança rotineira suspensa).</span>
              </div>
            )}

            {/* Observações */}
            {item.observacoes && (
              <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded italic">
                "{item.observacoes}"
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

