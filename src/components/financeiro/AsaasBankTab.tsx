import React, { useState, useEffect } from 'react';
import {
  Landmark,
  QrCode,
  FileText,
  CreditCard,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  Receipt,
  Download,
  Loader2,
  Building,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  asaasService,
  AsaasAccount,
  AsaasPayment,
  AsaasPixKey,
  getAsaasApiKey,
  setAsaasApiKey,
  DEFAULT_ASAAS_API_KEY,
} from '@/services/asaasService';

export const AsaasBankTab: React.FC = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [account, setAccount] = useState<AsaasAccount | null>(null);
  const [pixKeys, setPixKeys] = useState<AsaasPixKey[]>([]);
  const [payments, setPayments] = useState<AsaasPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);

  // Configuração da chave de API
  const [currentKey, setCurrentKey] = useState(getAsaasApiKey());
  const [showKey, setShowKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  // Modal de Nova Cobrança
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [chargeName, setChargeName] = useState('');
  const [chargeCpf, setChargeCpf] = useState('');
  const [chargeEmail, setChargeEmail] = useState('');
  const [chargePhone, setChargePhone] = useState('');
  const [chargeValue, setChargeValue] = useState('');
  const [chargeDueDate, setChargeDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [chargeType, setChargeType] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD'>('PIX');
  const [chargeDesc, setChargeDesc] = useState('');

  // Modal de Exibição do Pix Gerado
  const [createdPixModal, setCreatedPixModal] = useState<{
    qrCodeImage: string;
    payload: string;
    invoiceUrl?: string;
    value: number;
    description: string;
  } | null>(null);

  const [copiedPix, setCopiedPix] = useState(false);

  // Carregar dados iniciais do Asaas
  const loadAsaasData = async () => {
    setIsLoading(true);
    try {
      const [balRes, accRes, pixRes, payRes] = await Promise.all([
        asaasService.getBalance(),
        asaasService.getAccount(),
        asaasService.getPixKeys(),
        asaasService.getPayments(undefined, 25),
      ]);

      setBalance(balRes.balance);
      setAccount(accRes);
      setPixKeys(pixRes);
      setPayments(payRes.data);
      setIsConnected(true);
    } catch (err: any) {
      console.error('Erro ao conectar ao Asaas:', err);
      setIsConnected(false);
      toast.error('Falha ao comunicar com o Asaas Bank: ' + (err.message || 'Verifique sua chave de API'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAsaasData();
  }, []);

  const handleRefreshBalance = async () => {
    setIsRefreshingBalance(true);
    try {
      const bal = await asaasService.getBalance();
      setBalance(bal.balance);
      toast.success('Saldo do Asaas Bank atualizado com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao atualizar saldo: ' + err.message);
    } finally {
      setIsRefreshingBalance(false);
    }
  };

  const handleSaveApiKey = async () => {
    setIsTestingKey(true);
    try {
      const test = await asaasService.testConnection(currentKey);
      if (test.success) {
        setAsaasApiKey(currentKey);
        setIsConnected(true);
        toast.success(`Conexão bem-sucedida com Asaas Bank (${test.accountName})!`);
        loadAsaasData();
      } else {
        setIsConnected(false);
        toast.error('Chave inválida: ' + test.error);
      }
    } catch (err: any) {
      setIsConnected(false);
      toast.error('Erro ao testar chave: ' + err.message);
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleRestoreDefaultKey = () => {
    setCurrentKey(DEFAULT_ASAAS_API_KEY);
    setAsaasApiKey(DEFAULT_ASAAS_API_KEY);
    toast.info('Chave oficial do Asaas restaurada.');
    loadAsaasData();
  };

  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chargeName.trim() || !chargeValue || !chargeDueDate) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    const numValue = parseFloat(chargeValue.replace(',', '.'));
    if (isNaN(numValue) || numValue <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }

    setIsCreatingPayment(true);
    try {
      const newPay = await asaasService.createPayment({
        customerName: chargeName.trim(),
        customerCpfCnpj: chargeCpf.trim() || undefined,
        customerEmail: chargeEmail.trim() || undefined,
        customerPhone: chargePhone.trim() || undefined,
        value: numValue,
        dueDate: chargeDueDate,
        billingType: chargeType,
        description: chargeDesc.trim() || 'Cobrança Escolar - Purple Edu',
      });

      toast.success('Cobrança gerada com sucesso no Asaas!');
      setIsCreateModalOpen(false);

      // Se for Pix, busca o QR Code na hora para exibir na tela
      if (chargeType === 'PIX') {
        try {
          const qrData = await asaasService.getPixQrCode(newPay.id);
          setCreatedPixModal({
            qrCodeImage: `data:image/png;base64,${qrData.encodedImage}`,
            payload: qrData.payload,
            invoiceUrl: newPay.invoiceUrl,
            value: numValue,
            description: chargeDesc || 'Cobrança Pix',
          });
        } catch (qrErr) {
          console.warn('Não foi possível obter imagem direta do QR code:', qrErr);
          if (newPay.invoiceUrl) {
            window.open(newPay.invoiceUrl, '_blank');
          }
        }
      } else if (newPay.bankSlipUrl) {
        window.open(newPay.bankSlipUrl, '_blank');
      } else if (newPay.invoiceUrl) {
        window.open(newPay.invoiceUrl, '_blank');
      }

      // Recarrega lista
      loadAsaasData();
    } catch (err: any) {
      toast.error('Erro ao gerar cobrança: ' + (err.message || 'Verifique os dados informados'));
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPix(true);
    toast.success('Chave Pix copiada para a área de transferência!');
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner de Integração Bancária */}
      <div className="rounded-xl bg-gradient-to-r from-[#6b26d9] via-[#5b21b6] to-[#4c1d95] p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 opacity-10 pointer-events-none">
          <Landmark className="h-64 w-64" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-white/20 hover:bg-white/25 text-white border-none font-semibold flex items-center gap-1.5 px-3 py-0.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                Asaas Bank Particular & Gateway Financeiro
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 text-xs">
                ● Produção Conectada
              </Badge>
            </div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              Conta Bancária Oficial Asaas
            </h2>
            <p className="text-sm text-white/85 max-w-xl mt-1">
              Gerencie suas entradas, emita Pix instantâneo, Boletos com baixa automática e receba pagamentos de mensalidades diretamente na sua conta.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-white text-[#6b26d9] hover:bg-slate-100 font-bold shadow-md gap-2"
            >
              <Plus className="h-4 w-4" /> Nova Cobrança Asaas
            </Button>
            <Button
              variant="outline"
              onClick={handleRefreshBalance}
              disabled={isRefreshingBalance}
              className="border-white/30 text-white bg-white/10 hover:bg-white/20 gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshingBalance ? 'animate-spin' : ''}`} />
              Atualizar Saldo
            </Button>
          </div>
        </div>
      </div>

      {/* Grid de Métricas Financeiras Asaas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Saldo em Conta */}
        <Card className="border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#6b26d9]" />
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>SALDO EM CONTA ASAAS</span>
              <Landmark className="h-4 w-4 text-[#6b26d9]" />
            </CardDescription>
            <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">
              {isLoading ? <Loader2 className="h-7 w-7 animate-spin text-[#6b26d9]" /> : formatCurrency(balance)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              Disponível para saque e transferências
            </p>
          </CardContent>
        </Card>

        {/* Card Titular da Conta */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>TITULAR DA CONTA</span>
              <Building className="h-4 w-4 text-emerald-600" />
            </CardDescription>
            <CardTitle className="text-lg font-bold text-slate-900 truncate">
              {account?.name || 'Nelson Oliveira Neto'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-slate-500">
              CPF: ***.925.655-** • {account?.city?.name || 'Feira de Santana'} - {account?.city?.state || 'BA'}
            </p>
          </CardContent>
        </Card>

        {/* Card Chave Pix Principal */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>CHAVE PIX ASAAS</span>
              <QrCode className="h-4 w-4 text-indigo-600" />
            </CardDescription>
            <CardTitle className="text-sm font-mono font-bold text-slate-900 truncate">
              {pixKeys[0]?.key || 'profissional@netooliver.com.br'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex items-center justify-between">
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <Check className="h-3 w-3" /> Chave Ativa
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs text-[#6b26d9] hover:bg-purple-50"
              onClick={() => copyToClipboard(pixKeys[0]?.key || 'profissional@netooliver.com.br')}
            >
              <Copy className="h-3 w-3 mr-1" /> Copiar
            </Button>
          </CardContent>
        </Card>

        {/* Card Total de Cobranças */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>COBRANÇAS REGISTRADAS</span>
              <Receipt className="h-4 w-4 text-amber-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900">
              {payments.length} transações
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-slate-500">
              Integrado com conciliação automática
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chaves Pix Cadastradas na Conta */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <QrCode className="h-5 w-5 text-[#6b26d9]" />
            Chaves Pix do Banco Asaas
          </CardTitle>
          <CardDescription>
            Chaves cadastradas para receber pagamentos diretos de mensalidades e uniformes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pixKeys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-[#6b26d9]/10 flex items-center justify-center text-[#6b26d9] font-bold">
                    Pix
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold text-slate-800 break-all">{k.key}</div>
                    <div className="text-[11px] text-slate-500 font-medium capitalize">
                      Tipo: {k.type} • Status: {k.status === 'ACTIVE' ? 'Ativa' : k.status}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(k.key)}
                  className="shrink-0 gap-1 text-xs border-[#6b26d9]/30 text-[#6b26d9] hover:bg-purple-50"
                >
                  <Copy className="h-3 w-3" /> Copiar
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Extrato em Tempo Real das Cobranças do Asaas */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#6b26d9]" />
              Extrato & Cobranças da Conta Asaas
            </CardTitle>
            <CardDescription>
              Histórico em tempo real das cobranças emitidas e recebidas na sua conta.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadAsaasData}
            disabled={isLoading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 text-xs">
                  <TableHead>Data Emissão</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Descrição / Referência</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                      {isLoading ? 'Carregando cobranças...' : 'Nenhuma cobrança registrada no Asaas.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p) => {
                    const isReceived = p.status === 'RECEIVED' || p.status === 'CONFIRMED';
                    const isOverdue = p.status === 'OVERDUE';
                    const isPending = p.status === 'PENDING';

                    return (
                      <TableRow key={p.id} className="text-xs hover:bg-slate-50/80">
                        <TableCell className="font-medium text-slate-600">
                          {p.dateCreated ? new Date(p.dateCreated).toLocaleDateString('pt-BR') : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {p.billingType === 'PIX' && '⚡ PIX'}
                            {p.billingType === 'BOLETO' && '📄 BOLETO'}
                            {p.billingType === 'CREDIT_CARD' && '💳 CARTÃO'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-slate-800">
                          {p.description || `Fatura #${p.invoiceNumber || p.id}`}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {p.dueDate ? new Date(p.dueDate).toLocaleDateString('pt-BR') : '-'}
                        </TableCell>
                        <TableCell className="font-bold text-slate-900">
                          {formatCurrency(p.value)}
                        </TableCell>
                        <TableCell>
                          {isReceived && (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
                              Recebido
                            </Badge>
                          )}
                          {isOverdue && (
                            <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
                              Vencido
                            </Badge>
                          )}
                          {isPending && (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                              Pendente
                            </Badge>
                          )}
                          {!isReceived && !isOverdue && !isPending && (
                            <Badge variant="secondary">{p.status}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {p.transactionReceiptUrl && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs px-2 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => window.open(p.transactionReceiptUrl!, '_blank')}
                                title="Ver Comprovante Oficial"
                              >
                                <Receipt className="h-3.5 w-3.5 mr-1" /> Comprovante
                              </Button>
                            )}
                            {p.bankSlipUrl && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs px-2 text-blue-700 hover:bg-blue-50"
                                onClick={() => window.open(p.bankSlipUrl!, '_blank')}
                                title="Visualizar Boleto"
                              >
                                <Download className="h-3.5 w-3.5 mr-1" /> Boleto
                              </Button>
                            )}
                            {p.invoiceUrl && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs px-2 text-[#6b26d9] hover:bg-purple-50"
                                onClick={() => window.open(p.invoiceUrl!, '_blank')}
                                title="Abrir Fatura"
                              >
                                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Fatura
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Configuração da Chave de API Asaas */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Key className="h-5 w-5 text-[#6b26d9]" />
            Configuração da Chave de API Asaas
          </CardTitle>
          <CardDescription>
            Chave oficial em produção para emissões financeiras da instituição.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Chave de API (Access Token Produção)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={currentKey}
                  onChange={(e) => setCurrentKey(e.target.value)}
                  className="font-mono text-xs pr-10"
                  placeholder="$aact_prod_..."
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                onClick={handleSaveApiKey}
                disabled={isTestingKey}
                className="bg-[#6b26d9] hover:bg-[#5b21b6] text-white gap-1.5"
              >
                {isTestingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Testar & Salvar
              </Button>
              <Button variant="outline" onClick={handleRestoreDefaultKey} className="text-xs">
                Restaurar Padrão
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-slate-600">
              Conexão ativa com a API Oficial do Asaas Bank. As cobranças geradas são conciliadas automaticamente.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Criação de Cobrança */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Landmark className="h-5 w-5 text-[#6b26d9]" />
              Emitir Nova Cobrança Asaas
            </DialogTitle>
            <DialogDescription>
              Gere cobrança Pix, Boleto ou Cartão conectada diretamente à conta Asaas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCharge} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome do Pagador / Aluno *</Label>
              <Input
                placeholder="Ex: João da Silva"
                value={chargeName}
                onChange={(e) => setChargeName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">CPF / CNPJ (Opcional)</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={chargeCpf}
                  onChange={(e) => setChargeCpf(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Telefone WhatsApp</Label>
                <Input
                  placeholder="(75) 90000-0000"
                  value={chargePhone}
                  onChange={(e) => setChargePhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Valor (R$) *</Label>
                <Input
                  placeholder="Ex: 350,00"
                  value={chargeValue}
                  onChange={(e) => setChargeValue(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Vencimento *</Label>
                <Input
                  type="date"
                  value={chargeDueDate}
                  onChange={(e) => setChargeDueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Método de Pagamento *</Label>
              <Select
                value={chargeType}
                onValueChange={(val: 'PIX' | 'BOLETO' | 'CREDIT_CARD') => setChargeType(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">⚡ Pix Instantâneo (QR Code)</SelectItem>
                  <SelectItem value="BOLETO">📄 Boleto Bancário Registrado</SelectItem>
                  <SelectItem value="CREDIT_CARD">💳 Cartão de Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descrição da Cobrança</Label>
              <Input
                placeholder="Ex: Mensalidade Setembro - 5º Ano"
                value={chargeDesc}
                onChange={(e) => setChargeDesc(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isCreatingPayment}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreatingPayment}
                className="bg-[#6b26d9] hover:bg-[#5b21b6] text-white font-bold"
              >
                {isCreatingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Emitindo no Asaas...
                  </>
                ) : (
                  'Gerar Cobrança'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Exibição do QR Code Pix Gerado */}
      <Dialog open={!!createdPixModal} onOpenChange={() => setCreatedPixModal(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center justify-center gap-2">
              <QrCode className="h-5 w-5 text-[#6b26d9]" />
              Cobrança Pix Gerada!
            </DialogTitle>
            <DialogDescription>
              Escaneie o QR Code abaixo ou utilize o código Copia e Cola para pagar.
            </DialogDescription>
          </DialogHeader>

          {createdPixModal && (
            <div className="space-y-4 py-2">
              <div className="text-2xl font-black text-[#6b26d9]">
                {formatCurrency(createdPixModal.value)}
              </div>
              <div className="text-xs text-slate-500">{createdPixModal.description}</div>

              {/* QR Code Imagem */}
              <div className="flex justify-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                <img
                  src={createdPixModal.qrCodeImage}
                  alt="QR Code Pix"
                  className="w-48 h-48 rounded-lg shadow-sm"
                />
              </div>

              {/* Copia e Cola */}
              <div className="space-y-1.5 text-left">
                <Label className="text-xs font-semibold">Código Pix Copia e Cola:</Label>
                <div className="flex gap-1.5">
                  <Input
                    readOnly
                    value={createdPixModal.payload}
                    className="text-[10px] font-mono select-all"
                  />
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(createdPixModal.payload)}
                    className="bg-[#6b26d9] hover:bg-[#5b21b6] text-white shrink-0"
                  >
                    {copiedPix ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {createdPixModal.invoiceUrl && (
                <Button
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => window.open(createdPixModal.invoiceUrl, '_blank')}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir Link da Fatura Asaas
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AsaasBankTab;

