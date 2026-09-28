import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExternalLink, Copy, Check, CheckCircle2, FileText, Calendar, Building2, User } from 'lucide-react';
import { toast } from 'sonner';

export interface BoletoGeradoModalProps {
  isOpen: boolean;
  onClose: () => void;
  valor: number;
  descricao: string;
  linhaDigitavel: string;
  barcodeNumber?: string;
  boletoUrl: string;
  vencimento?: string;
  alunoNome?: string;
  bancoNome?: string;
}

export function BoletoGeradoModal({
  isOpen,
  onClose,
  valor,
  descricao,
  linhaDigitavel,
  barcodeNumber,
  boletoUrl,
  vencimento = new Date(Date.now() + 86400000 * 5).toLocaleDateString('pt-BR'),
  alunoNome,
  bancoNome,
}: BoletoGeradoModalProps) {
  const [copiedLinha, setCopiedLinha] = useState(false);
  const [copiedBarras, setCopiedBarras] = useState(false);

  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor || 0);

  const handleCopyLinha = () => {
    if (!linhaDigitavel) return;
    navigator.clipboard.writeText(linhaDigitavel);
    setCopiedLinha(true);
    toast.success('Linha digitável (47 dígitos) copiada com sucesso!');
    setTimeout(() => setCopiedLinha(false), 2500);
  };

  const handleCopyBarras = () => {
    if (!barcodeNumber) return;
    navigator.clipboard.writeText(barcodeNumber);
    setCopiedBarras(true);
    toast.success('Código de barras numérico (44 dígitos) copiado com sucesso!');
    setTimeout(() => setCopiedBarras(false), 2500);
  };

  const handleOpenTab = () => {
    if (!boletoUrl) return;
    window.open(boletoUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-6 bg-white sm:rounded-2xl">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 mb-2">
            <FileText className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center justify-center gap-1.5">
            Boleto Bancário Febraban Gerado!
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            O boleto foi aberto em uma nova aba do Chrome para impressão, leitura por leitor de código de barras ou app bancário.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Valor Cobrado
              </span>
              <div className="text-2xl font-black text-slate-900">
                {valorFormatado}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Vencimento
              </span>
              <div className="text-sm font-semibold text-slate-800 flex items-center justify-end gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {vencimento}
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-700 space-y-1.5">
            <div className="font-semibold text-slate-900">{descricao}</div>
            {bancoNome && (
              <div className="flex items-center gap-1.5 text-xs text-blue-800 bg-blue-100/70 border border-blue-200/80 px-2.5 py-1 rounded-lg font-medium">
                <Building2 className="h-3.5 w-3.5 text-blue-600" />
                <span>Banco Emissor: <strong>{bancoNome}</strong></span>
              </div>
            )}
            {alunoNome && (
              <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>Aluno: <strong>{alunoNome}</strong></span>
              </div>
            )}
          </div>

          {/* Botão de Destaque para Abrir na Nova Aba */}
          <Button
            type="button"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-5 rounded-xl shadow-sm gap-2"
            onClick={handleOpenTab}
          >
            <ExternalLink className="h-4 w-4" />
            Abrir Boleto e Código de Barras em Nova Aba
          </Button>
        </div>

        {/* Linha Digitável e Código de Barras */}
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Linha Digitável (47 dígitos)</span>
              <span className="text-[10px] text-slate-500 font-normal">Para Internet Banking & Apps</span>
            </label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={linhaDigitavel}
                className="font-mono text-[11px] bg-slate-50 text-slate-800 select-all h-9"
              />
              <Button
                size="sm"
                variant={copiedLinha ? 'default' : 'outline'}
                className={`shrink-0 gap-1.5 h-9 font-semibold text-xs transition-colors ${
                  copiedLinha ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-slate-300'
                }`}
                onClick={handleCopyLinha}
              >
                {copiedLinha ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedLinha ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>
          </div>

          {barcodeNumber && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Código de Barras Numérico (44 dígitos)</span>
                <span className="text-[10px] text-slate-500 font-normal">Padrão Febraban</span>
              </label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={barcodeNumber}
                  className="font-mono text-[11px] bg-slate-50 text-slate-800 select-all h-9"
                />
                <Button
                  size="sm"
                  variant={copiedBarras ? 'default' : 'outline'}
                  className={`shrink-0 gap-1.5 h-9 font-semibold text-xs transition-colors ${
                    copiedBarras ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-slate-300'
                  }`}
                  onClick={handleCopyBarras}
                >
                  {copiedBarras ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedBarras ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            className="text-xs text-slate-700 w-full sm:w-auto"
            onClick={onClose}
          >
            Fechar
          </Button>
          <Button
            type="button"
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs w-full sm:w-auto"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4 mr-1 text-emerald-400" />
            Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
