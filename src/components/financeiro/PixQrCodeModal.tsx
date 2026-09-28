import React, { useState, useEffect } from 'react';
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
import { QrCode, Copy, Check, Printer, Building2, User, CheckCircle2, Edit2, ShieldCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  generateQrCodeDataUrl,
  generatePixCopiaECola,
  getDefaultPixKey,
  setDefaultPixKey,
  formatChavePix,
} from '@/utils/paymentGenerators';

export interface PixModalProps {
  isOpen: boolean;
  onClose: () => void;
  valor: number;
  descricao: string;
  copiaCola: string;
  alunoNome?: string;
  responsavelNome?: string;
  instituicaoNome?: string;
  dataLancamento?: string;
}

export function PixQrCodeModal({
  isOpen,
  onClose,
  valor,
  descricao,
  copiaCola: initialCopiaCola,
  alunoNome,
  responsavelNome,
  instituicaoNome = 'Escola Interagir',
}: PixModalProps) {
  const [copied, setCopied] = useState(false);
  const [currentCopiaCola, setCurrentCopiaCola] = useState(initialCopiaCola);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loadingQr, setLoadingQr] = useState(false);

  // Edição da chave Pix utilizada
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [chavePixInput, setChavePixInput] = useState(getDefaultPixKey());

  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor || 0);

  // Recalcular o payload BR Code e o QR Code em Base64
  const updatePixCode = async (chave: string) => {
    setLoadingQr(true);
    try {
      const code = generatePixCopiaECola({
        valor,
        descricao,
        chavePix: chave,
        beneficiarioNome: instituicaoNome,
        pagadorNome: alunoNome || responsavelNome,
      });
      setCurrentCopiaCola(code);
      const dataUrl = await generateQrCodeDataUrl(code, 340);
      setQrDataUrl(dataUrl);
    } catch (e) {
      console.error('Erro ao gerar QR Code local:', e);
    } finally {
      setLoadingQr(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const activeKey = getDefaultPixKey();
      setChavePixInput(activeKey);
      updatePixCode(activeKey);
    }
  }, [isOpen, valor, descricao, instituicaoNome]);

  const handleSaveChavePix = () => {
    const formatted = formatChavePix(chavePixInput);
    setDefaultPixKey(formatted);
    setChavePixInput(formatted);
    setIsEditingKey(false);
    updatePixCode(formatted);
    toast.success('Chave Pix atualizada e novo QR Code gerado com sucesso!');
  };

  const handleCopy = () => {
    if (!currentCopiaCola) return;
    navigator.clipboard.writeText(currentCopiaCola);
    setCopied(true);
    toast.success('Código PIX Copia e Cola copiado com sucesso!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=750');
    if (!printWindow) {
      toast.error('Permita popups no navegador para imprimir.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PIX - ${instituicaoNome}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 30px; color: #1e293b; }
            .card { border: 2px dashed #059669; border-radius: 16px; padding: 24px; max-width: 440px; margin: 0 auto; }
            h2 { color: #059669; margin: 0 0 4px 0; font-size: 20px; }
            .inst { font-size: 13px; color: #64748b; margin-bottom: 12px; }
            .valor { font-size: 28px; font-weight: 800; color: #0f172a; margin-bottom: 14px; }
            .qr-wrap { background: #ffffff; padding: 12px; display: inline-block; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 14px; }
            .qr { width: 240px; height: 240px; display: block; }
            .desc { font-size: 13px; margin-bottom: 6px; }
            .chave { font-size: 11px; color: #475569; margin-top: 6px; font-family: monospace; background: #f1f5f9; padding: 4px 8px; border-radius: 6px; display: inline-block; }
            .info { font-size: 11px; color: #64748b; margin-top: 14px; line-height: 1.4; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>PAGAMENTO VIA PIX</h2>
            <div class="inst">${instituicaoNome}</div>
            <div class="valor">${valorFormatado}</div>
            <div class="qr-wrap">
              <img src="${qrDataUrl}" class="qr" alt="QR Code Pix" />
            </div>
            <div class="desc"><strong>Descrição:</strong> ${descricao}</div>
            ${alunoNome ? `<div class="desc"><strong>Aluno:</strong> ${alunoNome}</div>` : ''}
            <div><span class="chave">Chave: ${chavePixInput}</span></div>
            <div class="info">Abra o app do seu banco e aponte a câmera para o QR Code para pagar instantaneamente.</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 bg-white sm:rounded-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="text-center pb-1">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2 shadow-xs">
            <QrCode className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center justify-center gap-1.5">
            QR Code PIX Instantâneo
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Compatível com todos os bancos (Nubank, Itaú, BB, Inter, Caixa, Bradesco, Santander).
          </DialogDescription>
        </DialogHeader>

        {/* Card Principal com QR Code e Valor */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col items-center text-center shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100/90 px-3 py-1 rounded-full mb-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
            Padrão Banco Central (BR Code)
          </div>

          <div className="text-2xl font-black text-slate-900 tracking-tight my-1">
            {valorFormatado}
          </div>

          <div className="text-xs text-slate-600 font-medium mb-3">
            {descricao}
          </div>

          {/* Imagem do QR Code em Alta Resolução */}
          <div className="bg-white p-3 rounded-2xl border-2 border-slate-900 shadow-md mb-3 transition-transform hover:scale-[1.02]">
            {loadingQr ? (
              <div className="w-52 h-52 flex flex-col items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                <span className="text-xs">Gerando QR Code...</span>
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code Pix"
                className="w-52 h-52 object-contain rounded-md"
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center text-xs text-slate-400">
                Carregando...
              </div>
            )}
          </div>

          {(alunoNome || responsavelNome) && (
            <div className="w-full bg-white rounded-lg p-2.5 border border-slate-200/70 text-left text-xs space-y-1 mb-2">
              {alunoNome && (
                <div className="flex items-center gap-1.5 text-slate-700">
                  <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span><strong>Aluno:</strong> {alunoNome}</span>
                </div>
              )}
              {responsavelNome && (
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span><strong>Responsável:</strong> {responsavelNome}</span>
                </div>
              )}
            </div>
          )}

          {/* Informações da Chave Pix com Opção de Edição */}
          <div className="w-full bg-white rounded-lg p-2.5 border border-slate-200/80 text-left text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600">Chave Pix do Recebedor:</span>
              {!isEditingKey && (
                <button
                  type="button"
                  onClick={() => setIsEditingKey(true)}
                  className="text-[10px] text-emerald-700 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <Edit2 className="h-3 w-3" /> Alterar Chave
                </button>
              )}
            </div>

            {isEditingKey ? (
              <div className="space-y-1.5 pt-1">
                <Input
                  value={chavePixInput}
                  onChange={(e) => setChavePixInput(e.target.value)}
                  placeholder="E-mail, CPF, CNPJ ou Celular (+55...)"
                  className="text-xs h-8 bg-slate-50"
                />
                <div className="flex justify-end gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2"
                    onClick={() => {
                      setChavePixInput(getDefaultPixKey());
                      setIsEditingKey(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5"
                    onClick={handleSaveChavePix}
                  >
                    Aplicar Chave
                  </Button>
                </div>
              </div>
            ) : (
              <div className="font-mono text-[11px] text-slate-800 bg-slate-50 p-1.5 rounded border border-slate-100 break-all select-all">
                {chavePixInput}
              </div>
            )}
          </div>
        </div>

        {/* PIX Copia e Cola */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>Pix Copia e Cola</span>
            <span className="text-[10px] text-slate-500 font-normal">Para internet banking</span>
          </label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={currentCopiaCola}
              className="font-mono text-[11px] bg-slate-50 text-slate-700 truncate select-all h-9"
            />
            <Button
              size="sm"
              variant={copied ? 'default' : 'outline'}
              className={`shrink-0 gap-1.5 h-9 font-semibold text-xs transition-colors ${
                copied ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-slate-300'
              }`}
              onClick={handleCopy}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado!' : 'Copiar Pix'}
            </Button>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            className="gap-1.5 text-xs text-slate-700 w-full sm:w-auto"
            onClick={handlePrint}
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir Comprovante
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
